import test from "node:test";
import assert from "node:assert/strict";
import {
  newRogueRun,
  parseRogueState,
  rogueUnityView,
  serializeRogueState,
} from "../src/rogue-engine.js";
import { isUuid, namedUuid } from "../src/identity.js";
import {
  ensureVillageHouseholds,
  syncResidentHousing,
} from "../src/village-households.js";

const input = {
  requestId: "m11-households",
  seed: "m11-households",
  heroName: "Mara",
  form: "hybrid",
  size: "small",
};

test("M-11.1 every resident belongs to exactly one UUID-backed household", () => {
  const state = newRogueRun(input),
    memberships = state.village.households.flatMap((household) =>
      household.memberIds.map((residentId) => [residentId, household.id]),
    );
  assert.equal(memberships.length, state.village.npcStates.length);
  assert.equal(new Set(memberships.map(([residentId]) => residentId)).size, 18);
  for (const household of state.village.households) {
    assert.ok(isUuid(household.id));
    assert.ok(isUuid(household.definitionId));
    assert.equal(household.entityType, "village-household");
    assert.deepEqual(household.memberIds, [...household.memberIds].sort());
  }
  for (const resident of state.village.npcStates) {
    assert.ok(isUuid(resident.householdId));
    assert.deepEqual(
      memberships.filter(([residentId]) => residentId === resident.id),
      [[resident.id, resident.householdId]],
    );
  }
});

test("R8 ten founders arrive as three complete families", () => {
  const state = newRogueRun({ ...input, scenario: "founding" });
  assert.equal(state.village.npcStates.length, 10);
  assert.equal(state.village.households.length, 3);
  assert.deepEqual(
    state.village.households.map((household) => household.memberIds.length),
    [3, 3, 4],
  );
});

test("M-11.1 household membership does not grant a residence", () => {
  const state = newRogueRun(input);
  for (const resident of state.village.npcStates) {
    assert.equal(resident.residenceId, null);
    assert.equal(resident.housingStatus, "homeless");
    assert.ok(resident.life.statusTags.includes("homeless"));
  }
  state.location = "village";
  const visibleResident = rogueUnityView(state).map.cells.find(
    (cell) => cell.entityName === state.village.npcStates[0].name,
  );
  assert.match(visibleResident.entityNeeds, /homeless/);
});

test("M-11.1 destroyed housing makes its resident homeless", () => {
  const state = newRogueRun(input),
    resident = state.village.npcStates[0],
    residence = {
      id: namedUuid(state.id, "test-residence"),
      status: "complete",
      habitable: true,
    };
  state.village.residences = [residence];
  resident.residenceId = residence.id;
  syncResidentHousing(state);
  assert.equal(resident.housingStatus, "housed");
  assert.ok(!resident.life.statusTags.includes("homeless"));

  residence.status = "destroyed";
  syncResidentHousing(state);
  assert.equal(resident.housingStatus, "homeless");
  assert.ok(resident.life.statusTags.includes("homeless"));
});

test("M-11.1 household identities and assignments are deterministic", () => {
  const first = newRogueRun(input),
    restored = parseRogueState(serializeRogueState(first));
  assert.equal(restored.schemaVersion, 22);
  assert.deepEqual(restored.village.households, first.village.households);
  assert.deepEqual(
    restored.village.npcStates.map(({ id, householdId }) => ({
      id,
      householdId,
    })),
    first.village.npcStates.map(({ id, householdId }) => ({ id, householdId })),
  );
});

test("M-11.1 migration repairs missing and stale household membership", () => {
  const state = newRogueRun(input);
  const duplicate = state.village.npcStates[0];
  state.village.households[1].memberIds.push(duplicate.id);
  state.village.households[2].memberIds = [];
  for (const resident of state.village.npcStates) resident.householdId = null;
  const restored = parseRogueState(serializeRogueState(state)),
    memberIds = restored.village.households.flatMap(
      (household) => household.memberIds,
    );
  assert.equal(memberIds.length, restored.village.npcStates.length);
  assert.equal(new Set(memberIds).size, restored.village.npcStates.length);
  assert.ok(
    restored.village.npcStates.every((resident) =>
      restored.village.households.some(
        (household) =>
          household.id === resident.householdId &&
          household.memberIds.includes(resident.id),
      ),
    ),
  );
});

test("M-11.1 save migration preserves authoritative household membership", () => {
  const state = newRogueRun(input),
    resident = state.village.npcStates.find(
      (candidate) => candidate.personKey === "miller",
    ),
    source = state.village.households.find(
      (household) => household.id === resident.householdId,
    ),
    destination = state.village.households.find(
      (household) => household.key === "voss",
    );
  source.memberIds = source.memberIds.filter(
    (memberId) => memberId !== resident.id,
  );
  destination.memberIds.push(resident.id);
  const restored = parseRogueState(serializeRogueState(state)),
    restoredResident = restored.village.npcStates.find(
      (candidate) => candidate.id === resident.id,
    );
  assert.equal(restoredResident.householdId, destination.id);
  assert.ok(
    restored.village.households
      .find((household) => household.id === destination.id)
      .memberIds.includes(resident.id),
  );
});

test("M-11.1 save migration retains a newly formed household and its identity", () => {
  const state = newRogueRun(input),
    resident = state.village.npcStates[0],
    source = state.village.households.find(
      (entry) => entry.id === resident.householdId,
    ),
    custom = {
      id: namedUuid(state.id, "household:new-neighbors"),
      definitionId: namedUuid(state.id, "household-definition:new-neighbors"),
      entityType: "village-household",
      key: "new-neighbors",
      name: "New neighbors",
      memberIds: [resident.id],
    };
  source.memberIds = source.memberIds.filter((id) => id !== resident.id);
  state.village.households.push(custom);
  const restored = parseRogueState(serializeRogueState(state));
  assert.deepEqual(
    restored.village.households.find((entry) => entry.id === custom.id),
    custom,
  );
  assert.equal(restored.village.npcStates[0].householdId, custom.id);
  assert.deepEqual(
    parseRogueState(serializeRogueState(restored)).village.households,
    restored.village.households,
  );
});

test("M-11.1 membership repair sorts survivors without producing physical assets", () => {
  const state = newRogueRun(input),
    residents = state.village.npcStates,
    target = state.village.households[0];
  for (const entry of state.village.households) entry.memberIds = [];
  target.memberIds = [
    ...residents
      .map((resident) => resident.id)
      .sort()
      .reverse(),
    residents[0].id,
    namedUuid(state.id, "departed-resident"),
  ];
  const before = structuredClone(state.village);
  ensureVillageHouseholds(state);
  assert.deepEqual(
    state.village.households.find((entry) => entry.id === target.id).memberIds,
    residents.map((resident) => resident.id).sort(),
  );
  const {
      households: ignoredBefore,
      npcStates: actorsBefore,
      ...physicalBefore
    } = before,
    {
      households: ignoredAfter,
      npcStates: actorsAfter,
      ...physicalAfter
    } = state.village;
  assert.deepEqual(physicalAfter, physicalBefore);
  assert.deepEqual(
    actorsAfter.map(({ householdId, ...actor }) => actor),
    actorsBefore.map(({ householdId, ...actor }) => actor),
  );
});

test("M-11.1 legacy household migration is deterministic and idempotent", () => {
  const state = newRogueRun(input);
  delete state.village.households;
  for (const resident of state.village.npcStates) delete resident.householdId;
  const replay = structuredClone(state);
  ensureVillageHouseholds(state);
  ensureVillageHouseholds(replay);
  assert.deepEqual(state, replay);
  const first = structuredClone(state);
  ensureVillageHouseholds(state);
  assert.deepEqual(state, first);
});
