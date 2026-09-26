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

test("Unity activity describes a player-opened dungeon door", () => {
  const state = newRogueRun(input);
  const view = rogueUnityView(state, [
    { type: "door_opened", actorName: "Mara" },
  ]);
  assert.equal(view.activity, "Mara opened a door.");
});

test("Unity protocol projects the active dungeon instead of Stonebridge", () => {
  const state = newRogueRun(input),
    view = rogueUnityView(state);
  assert.equal(view.location, "dungeon");
  assert.deepEqual(
    { width: view.map.width, height: view.map.height },
    { width: 30, height: 20 },
  );
  assert.equal(view.hero.x, state.hero.x);
  assert.equal(view.hero.y, state.hero.y);
  assert.equal(view.map.cells.length, view.map.width * view.map.height);
  assert.ok(view.map.cells.some((cell) => cell.entityId === state.hero.id));
  assert.ok(view.map.cells.some((cell) => cell.tile === "wall"));
  assert.notEqual(view.title, "Stonebridge");
  assert.ok(view.legalIntents.includes("search"));
  assert.ok(view.legalIntents.includes("command"));
  assert.ok(view.legalIntents.includes("ranged_attack"));
  assert.ok(view.legalIntents.includes("equip"));
  assert.ok(view.inventory.some((item) => item.itemType === "equipment"));
  assert.ok(view.inventory.some((item) => item.kind === "healing_potion"));
  assert.equal(view.partyOrder.id, state.partyGroup.id);
  assert.equal(view.partyOrder.commandRevision, 0);
  assert.equal(view.classPower.name, state.hero.classPower.name);
  assert.ok(Array.isArray(view.targets));
});
