import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createHash } from "node:crypto";
import { Dice, RuleError, requireRule as check } from "./dice.js";
import {
  applyRogueTurn,
  newRogueRun,
  parseRogueState,
  rogueRunView,
  serializeRogueState,
} from "./rogue-engine.js";

const canonical = (value) => {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical(value[key])]),
    );
  return value;
};
const stringify = (value) => JSON.stringify(canonical(value));
const hash = (value) =>
  createHash("sha256").update(stringify(value)).digest("hex");

export class RogueStore {
  constructor(path, { dice = new Dice() } = {}) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.dice = dice;
    this.db
      .exec(`PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;
      CREATE TABLE IF NOT EXISTS rogue_runs(id TEXT PRIMARY KEY, state TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS rogue_turns(run_id TEXT NOT NULL, revision INTEGER NOT NULL, request_id TEXT NOT NULL, input TEXT NOT NULL, result TEXT NOT NULL, state_hash TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY(run_id,revision), UNIQUE(run_id,request_id));
      CREATE TABLE IF NOT EXISTS rogue_creations(request_id TEXT PRIMARY KEY, input TEXT NOT NULL, result TEXT NOT NULL);
    `);
  }

  close() {
    this.db.close();
  }

  get(runId) {
    const row = this.db
      .prepare("SELECT state FROM rogue_runs WHERE id=?")
      .get(runId);
    check(row, "NOT_FOUND", "Roguelike run not found.", { runId });
    return parseRogueState(JSON.parse(row.state));
  }

  create(input) {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const prior = this.db
        .prepare("SELECT input,result FROM rogue_creations WHERE request_id=?")
        .get(input.requestId);
      if (prior) {
        check(
          prior.input === stringify(input),
          "REQUEST_ID_REUSED",
          "requestId was used for a different run creation.",
        );
        this.db.exec("COMMIT");
        return { ...JSON.parse(prior.result), replayed: true };
      }
      const state = newRogueRun(input);
      const result = {
        runId: state.id,
        revision: 0,
        view: rogueRunView(state),
      };
      this.db
        .prepare("INSERT INTO rogue_runs VALUES(?,?)")
        .run(state.id, JSON.stringify(serializeRogueState(state)));
      this.db
        .prepare("INSERT INTO rogue_creations VALUES(?,?,?)")
        .run(input.requestId, stringify(input), JSON.stringify(result));
      this.db.exec("COMMIT");
      return result;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  act(input) {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const prior = this.db
        .prepare(
          "SELECT input,result FROM rogue_turns WHERE run_id=? AND request_id=?",
        )
        .get(input.runId, input.requestId);
      const action = { intent: input.intent };
      if (prior) {
        check(
          prior.input === stringify(action),
          "REQUEST_ID_REUSED",
          "requestId was used for a different turn.",
        );
        this.db.exec("COMMIT");
        return { ...JSON.parse(prior.result), replayed: true };
      }
      const state = this.get(input.runId);
      check(
        state.revision === input.expectedRevision,
        "REVISION_CONFLICT",
        "Read the latest run before acting.",
        {
          expectedRevision: input.expectedRevision,
          actualRevision: state.revision,
        },
      );
      const { events } = applyRogueTurn(state, input.intent, this.dice);
      state.revision += 1;
      const result = {
        runId: state.id,
        revision: state.revision,
        events,
        view: rogueRunView(state, events),
      };
      const serialized = serializeRogueState(state);
      this.db
        .prepare("UPDATE rogue_runs SET state=? WHERE id=?")
        .run(JSON.stringify(serialized), state.id);
      this.db
        .prepare("INSERT INTO rogue_turns VALUES(?,?,?,?,?,?,?)")
        .run(
          state.id,
          state.revision,
          input.requestId,
          stringify(action),
          JSON.stringify(result),
          hash(serialized),
          new Date().toISOString(),
        );
      this.db.exec("COMMIT");
      return result;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  view(runId) {
    const state = this.get(runId);
    const latest = this.db
      .prepare(
        "SELECT result FROM rogue_turns WHERE run_id=? ORDER BY revision DESC LIMIT 1",
      )
      .get(runId);
    return rogueRunView(state, latest ? JSON.parse(latest.result).events : []);
  }

  log(runId, afterRevision = 0, limit = 50) {
    this.get(runId);
    return this.db
      .prepare(
        "SELECT revision,request_id,input,result,state_hash,created_at FROM rogue_turns WHERE run_id=? AND revision>? ORDER BY revision LIMIT ?",
      )
      .all(runId, afterRevision, limit)
      .map((row) => ({
        ...row,
        input: JSON.parse(row.input),
        result: JSON.parse(row.result),
      }));
  }

  export(runId) {
    const state = this.get(runId);
    return {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      state: serializeRogueState(state),
      turns: this.log(runId, 0, 10000),
      stateHash: hash(serializeRogueState(state)),
    };
  }
}

export function rogueError(error) {
  if (error?.name === "ZodError")
    return {
      code: "INVALID_INPUT",
      message: "Input failed validation.",
      details: error.issues,
    };
  if (error instanceof RuleError)
    return { code: error.code, message: error.message, details: error.details };
  console.error(error);
  return {
    code: "INTERNAL_ERROR",
    message: "Internal server error. The turn was not committed.",
    details: {},
  };
}
