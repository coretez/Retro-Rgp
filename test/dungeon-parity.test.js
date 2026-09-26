import test from "node:test";
import assert from "node:assert/strict";
import {
  applyRogueTurn,
  dungeonWorldObjectAt,
  newRogueRun,
  parseRogueState,
  rogueRunView,
  serializeRogueState,
} from "../src/rogue-engine.js";

const input = {
  requestId: "dungeon-parity",
  seed: "dungeon-parity",
  heroName: "Mara",
  form: "hybrid",
  size: "small",
  levels: 3,
};

function corridorState(doorState = "closed") {
  const state = newRogueRun(input),
    level = state.levels[0],
    enemy = level.enemies[0],
    group = level.enemyGroups.find((entry) =>
      entry.memberIds.includes(enemy.id),
    );
  const blocked = [];
  for (let x = 0; x < 6; x++) blocked.push({ x, y: 0 }, { x, y: 4 });
  for (let y = 1; y < 4; y++) blocked.push({ x: 0, y }, { x: 5, y });
  blocked.push({ x: 3, y: 1 }, { x: 3, y: 3 });
  level.map = { grid: "square", width: 6, height: 5, blocked, difficult: [] };
  level.entrance = { x: 4, y: 2 };
  level.exit = { x: 1, y: 2 };
  level.enemies = [enemy];
  level.enemyGroups = [group];
  Object.assign(enemy, { x: 2, y: 2, aware: false, lastKnown: null });
  Object.assign(level.doors[0], {
    x: 3,
    y: 2,
    state: doorState,
    revealed: true,
  });
  level.doors = [level.doors[0]];
  level.features = [];
  level.treasures = [];
  level.remembered = new Set();
  level.searched = new Set();
  Object.assign(state.hero, { x: 4, y: 2 });
  const companionPositions = [
    { x: 4, y: 1 },
    { x: 4, y: 3 },
    { x: 2, y: 1 },
  ];
  state.companions.forEach((companion, index) => {
    Object.assign(companion, companionPositions[index]);
    companion.hp = 0;
    companion.dead = true;
  });
  for (const field of [
    "map",
    "entrance",
    "exit",
    "enemies",
    "enemyGroups",
    "doors",
    "features",
    "treasures",
    "remembered",
  ])
    state[field] = level[field];
  return state;
}

const investigation = (state) =>
  state.levels[0].jobs.find((job) => job.jobType === "investigate_noise");

function investigationOutcome(state) {
  const job = investigation(state),
    enemy = state.enemies[0];
  return {
    tick: state.tick,
    enemy: { x: enemy.x, y: enemy.y, action: enemy.currentAction },
    door: state.doors[0].state,
    job: job && {
      status: job.status,
      reason: job.blockingReason,
      step: job.plan.step,
    },
  };
}

test("D-M1 dungeon simulation is deterministic for identical intents", () => {
  const first = corridorState("locked"),
    second = corridorState("locked"),
    intents = ["search", "wait", "wait", "wait"].map((kind) => ({ kind }));
  for (const intent of intents) {
    applyRogueTurn(first, intent);
    applyRogueTurn(second, intent);
  }
  assert.deepEqual(investigationOutcome(second), investigationOutcome(first));
});

test("D-M1 through D-M4 expose scoped dungeon contracts and smart objects", () => {
  const state = corridorState(),
    door = dungeonWorldObjectAt(state, 3, 2),
    before = state.tick;
  assert.equal(state.schemaVersion, 15);
  assert.equal(door.kind, "door");
  assert.deepEqual(door.affordanceKeys, ["examine", "open"]);
  const opened = applyRogueTurn(state, { kind: "open", direction: "west" });
  assert.equal(state.tick, before + 1);
  assert.equal(state.doors[0].state, "open");
  assert.ok(
    opened.events.some(
      (event) =>
        event.type === "door_opened" && event.actorId === state.hero.id,
    ),
  );
  const view = rogueRunView(state, opened.events);
  assert.ok(view.dungeon.entityCount > 0);
  assert.ok(Array.isArray(view.dungeon.jobs));
});

test("D-M5 noise investigation blocks, saves, resumes, opens and completes", () => {
  let state = corridorState("locked"),
    events = [];
  events.push(...applyRogueTurn(state, { kind: "search" }).events);
  assert.equal(investigation(state).status, "reserved");
  applyRogueTurn(state, { kind: "wait" });
  let previous = { ...state.enemies[0] };
  for (
    let turn = 0;
    turn < 8 && investigation(state).status !== "blocked";
    turn++
  ) {
    const result = applyRogueTurn(state, { kind: "wait" });
    events.push(...result.events);
    const current = state.enemies[0];
    assert.ok(
      Math.abs(current.x - previous.x) + Math.abs(current.y - previous.y) <= 1,
    );
    previous = { ...current };
  }
  assert.equal(investigation(state).blockingReason, "access_locked");
  state = parseRogueState(
    JSON.parse(JSON.stringify(serializeRogueState(state))),
  );
  state.doors[0].state = "closed";
  for (
    let turn = 0;
    turn < 12 && investigation(state).status !== "completed";
    turn++
  )
    events.push(...applyRogueTurn(state, { kind: "wait" }).events);
  assert.equal(investigation(state).status, "completed");
  assert.equal(state.doors[0].state, "open");
  assert.ok(events.some((event) => event.type === "job_blocked"));
  assert.ok(events.some((event) => event.type === "job_resumed"));
  assert.ok(
    events.some(
      (event) =>
        event.type === "door_opened" && event.actorId === state.enemies[0].id,
    ),
  );
  assert.ok(events.some((event) => event.type === "job_completed"));
  assert.equal(
    state.levels[0].reservations.filter(
      (claim) =>
        claim.jobId === investigation(state).id && claim.state === "held",
    ).length,
    0,
  );
});

test("schema 13 saves acquire dungeon work state and monster capabilities", () => {
  const state = newRogueRun(input),
    snapshot = serializeRogueState(state);
  snapshot.schemaVersion = 13;
  for (const level of snapshot.levels) {
    delete level.jobs;
    delete level.reservations;
    for (const enemy of level.enemies) {
      delete enemy.capabilityTags;
      delete enemy.workPermissions;
      delete enemy.workState;
    }
  }
  const migrated = parseRogueState(snapshot);
  assert.equal(migrated.schemaVersion, 15);
  assert.ok(migrated.levels.every((level) => Array.isArray(level.jobs)));
  assert.ok(
    migrated.levels.every((level) =>
      level.enemies.every((enemy) =>
        enemy.capabilityTags.includes("investigate"),
      ),
    ),
  );
});
