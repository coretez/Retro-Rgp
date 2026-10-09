import test from "node:test";
import assert from "node:assert/strict";
import {
  advanceRogueSimulation,
  applyRogueTurn,
  newRogueRun,
  parseRogueState,
  rogueSimulationStatus,
  rogueUnityView,
  serializeRogueState,
} from "../src/rogue-engine.js";

const input = {
  requestId: "m10-simulation",
  seed: "m10-simulation",
  heroName: "Mara",
  heroClass: "fighter",
  form: "hybrid",
  size: "small",
  levels: 3,
};

function runningVillage() {
  const state = newRogueRun(input);
  state.location = "village";
  applyRogueTurn(state, { kind: "set_party_movement", mode: "dispersed" });
  return state;
}

function cloneState(state) {
  return parseRogueState(structuredClone(serializeRogueState(state)));
}

test("M-10 ten manual steps equal ten continuous simulation ticks", () => {
  const source = runningVillage(),
    manual = cloneState(source),
    continuous = cloneState(source);
  for (let tick = 0; tick < 10; tick += 1)
    applyRogueTurn(manual, { kind: "wait" });
  const result = advanceRogueSimulation(continuous, {
    mode: "normal",
    ticks: 10,
  });
  assert.equal(result.ticksAdvanced, 10);
  assert.deepEqual(
    serializeRogueState(continuous),
    serializeRogueState(manual),
  );
});

test("M-10 paused simulation performs no mutation", () => {
  const state = runningVillage(),
    before = serializeRogueState(state),
    result = advanceRogueSimulation(state, { mode: "paused", ticks: 10 });
  assert.equal(result.ticksAdvanced, 0);
  assert.deepEqual(serializeRogueState(state), before);
});

test("M-10 speed changes scheduling frequency, not tick outcomes", () => {
  const source = runningVillage(),
    normal = cloneState(source),
    fast = cloneState(source);
  advanceRogueSimulation(normal, { mode: "normal", ticks: 12 });
  advanceRogueSimulation(fast, { mode: "fast", ticks: 12 });
  assert.deepEqual(serializeRogueState(fast), serializeRogueState(normal));
});

test("M-10 dungeon entry requires a tactical pause before another tick", () => {
  const state = newRogueRun(input),
    before = state.tick,
    status = rogueSimulationStatus(state),
    result = advanceRogueSimulation(state, { mode: "fast", ticks: 4 }),
    view = rogueUnityView(state);
  assert.equal(status.tacticalPauseRequired, true);
  assert.equal(status.reason, "dungeon_tactics");
  assert.equal(result.ticksAdvanced, 0);
  assert.equal(state.tick, before);
  assert.deepEqual(view.simulation, status);
});

test("M-10 unresolved village danger forces the same tactical pause", () => {
  const state = runningVillage();
  state.village.incidents.push({
    id: "f4759294-e9c8-4cbc-ab28-a18ed62827c6",
    kind: "danger",
    status: "reported",
  });
  const before = serializeRogueState(state),
    status = rogueSimulationStatus(state),
    result = advanceRogueSimulation(state, { mode: "normal", ticks: 1 });
  assert.equal(status.tacticalPauseRequired, true);
  assert.equal(status.reason, "village_danger");
  assert.equal(result.ticksAdvanced, 0);
  assert.deepEqual(serializeRogueState(state), before);
});

test("M-10 continuous mode is safe-town simulation, not automatic travel", () => {
  const state = runningVillage();
  state.location = "world";
  const status = rogueSimulationStatus(state);
  assert.equal(status.canRun, false);
  assert.equal(status.tacticalPauseRequired, false);
  assert.equal(status.reason, "travel_decision");
});
