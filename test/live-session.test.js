import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  RogueLiveSession,
  resumeRememberedRun,
} from "../src/rogue-live-session.js";
import { RogueStore } from "../src/rogue-store.js";

const input = {
  requestId: "live-session",
  seed: "live-session",
  heroName: "Mara",
  form: "hybrid",
  size: "small",
  scenario: "founding",
};

test("live simulation keeps one state object until an explicit save", () => {
  const directory = mkdtempSync(join(tmpdir(), "rogue-live-")),
    database = join(directory, "rogue.sqlite"),
    store = new RogueStore(database);
  try {
    const created = store.create(input),
      loaded = store.get(created.runId),
      session = new RogueLiveSession(loaded),
      stateReference = session.state;
    session.act({ kind: "wait" });
    session.act({ kind: "wait" });
    assert.equal(session.state, stateReference);
    assert.equal(session.state.tick, 2);
    assert.equal(session.dirty, true);
    assert.equal(store.get(created.runId).tick, 0);
    store.saveSnapshot(session.state);
    session.markSaved();
    assert.equal(store.get(created.runId).tick, 2);
    assert.equal(session.dirty, false);
  } finally {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("live projections read memory without replacing the active state", () => {
  const directory = mkdtempSync(join(tmpdir(), "rogue-live-view-")),
    database = join(directory, "rogue.sqlite"),
    store = new RogueStore(database);
  try {
    const created = store.create({ ...input, requestId: "live-view" }),
      session = new RogueLiveSession(store.get(created.runId)),
      stateReference = session.state;
    const first = session.unityView(),
      second = session.unityView({ villageCenter: { x: 20, y: 20 } });
    assert.equal(session.state, stateReference);
    assert.equal(first.revision, 0);
    assert.equal(second.revision, 0);
    assert.equal(session.dirty, false);
  } finally {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("remembered runs resume from persisted state without projecting the full view", () => {
  let loaded = 0;
  const remembered = resumeRememberedRun(
    {
      get(runId) {
        loaded += 1;
        return { id: runId, oversizedHistory: new Array(10_000).fill("event") };
      },
      view() {
        throw new Error("resume must not project the run view");
      },
    },
    "ec02b607-150c-5276-9c46-24e7df1d0870",
  );
  assert.equal(remembered.runId, "ec02b607-150c-5276-9c46-24e7df1d0870");
  assert.equal(remembered.state.id, remembered.runId);
  assert.equal(remembered.state.oversizedHistory.length, 10_000);
  assert.equal(loaded, 1);
});
