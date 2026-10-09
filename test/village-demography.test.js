import test from "node:test";
import assert from "node:assert/strict";
import { newRogueRun, parseRogueState, serializeRogueState } from "../src/rogue-engine.js";
import { advanceVillageDemography, VILLAGE_DAYS_PER_YEAR } from "../src/village-demography.js";

const input = {
  requestId: "r8-demography-foundation",
  runId: "67f2d01a-3612-52ae-8a09-8c074c749203",
  seed: "r8-demography-foundation",
  heroName: "Mara",
  heroClass: "fighter",
  form: "hybrid",
  size: "small",
  scenario: "founding",
};

test("R8.6 founders have persisted life-course and family state", () => {
  const state = newRogueRun(input);
  assert.equal(state.village.npcStates.length, 10);
  for (const resident of state.village.npcStates) {
    assert.equal(resident.lifeStage, "adult");
    assert.ok(Number.isInteger(resident.birthDay));
    assert.ok(Number.isInteger(resident.ageYears));
    assert.equal(resident.healthState.status, "healthy");
    assert.ok(Array.isArray(resident.partnerIds));
    assert.deepEqual(resident.history[0], {
      type: "arrival",
      day: 1,
      reason: "settlement_founding",
    });
  }
  assert.equal(state.village.relationships.length, 5);
  assert.equal(
    state.village.relationships.filter((bond) => bond.kind === "partner").length,
    3,
  );
});

test("R8.6 birthday changes age and life stage exactly once", () => {
  const state = newRogueRun(input), resident = state.village.npcStates[0];
  resident.birthDay = 2 - 60 * VILLAGE_DAYS_PER_YEAR;
  resident.ageYears = 59;
  state.village.clock.day = 2;
  const events = advanceVillageDemography(state);
  assert.equal(resident.ageYears, 60);
  assert.equal(resident.lifeStage, "elder");
  assert.equal(events.length, 1);
  assert.deepEqual(advanceVillageDemography(state), []);
});

test("R8.6 demography and relationship evidence survive save-load", () => {
  const state = newRogueRun(input), restored = parseRogueState(serializeRogueState(state));
  assert.deepEqual(restored.village.relationships, state.village.relationships);
  assert.deepEqual(restored.village.demographyLedger, state.village.demographyLedger);
  assert.deepEqual(
    restored.village.npcStates.map((resident) => resident.partnerIds),
    state.village.npcStates.map((resident) => resident.partnerIds),
  );
});
