import test from "node:test";
import assert from "node:assert/strict";
import { newRogueRun, rogueUnityView } from "../src/rogue-engine.js";

const input = {
  requestId: "unity-protocol",
  seed: "unity-protocol",
  heroName: "Mara",
  form: "hybrid",
  size: "small",
};

test("Unity protocol projects one compact retained-mode village snapshot", () => {
  const state = newRogueRun(input);
  state.location = "village";
  const view = rogueUnityView(state),
    json = JSON.stringify(view);
  assert.equal(view.protocolVersion, 1);
  assert.deepEqual(
    { width: view.map.width, height: view.map.height },
    { width: 76, height: 46 },
  );
  assert.equal(view.map.cells.length, view.map.width * view.map.height);
  assert.ok(Buffer.byteLength(json) < 500_000, Buffer.byteLength(json));
  assert.ok(
    view.map.cells.every(
      (cell) => !("object" in cell) && !("affordances" in cell),
    ),
  );
  assert.ok(view.map.cells.some((cell) => cell.entityKind === "party"));
  assert.ok(
    view.map.cells
      .filter(
        (cell) =>
          ["outdoor_grass", "road_stone", "road_dirt"].includes(cell.tile) &&
          !cell.entityKind,
      )
      .every((cell) => cell.glyph === " "),
  );
});

test("Unity protocol preserves stable coordinates and lightweight identity", () => {
  const state = newRogueRun(input);
  state.location = "village";
  const first = rogueUnityView(state),
    second = rogueUnityView(state);
  assert.deepEqual(second, first);
  assert.ok(
    first.map.cells.every(
      (cell) =>
        Number.isInteger(cell.x) &&
        Number.isInteger(cell.y) &&
        typeof cell.tile === "string" &&
        typeof cell.glyph === "string",
    ),
  );
});

test("Unity activity selects the newest meaningful delivery message", () => {
  const state = newRogueRun(input);
  state.location = "village";
  const view = rogueUnityView(state, [
    { type: "job_posted", jobName: "Deliver smithy supplies" },
    {
      type: "job_reserved",
      jobName: "Deliver smithy supplies",
      actorName: "Bram Eder",
    },
    { type: "npc_move" },
  ]);
  assert.equal(view.activity, "Bram Eder accepted Deliver smithy supplies.");
});
