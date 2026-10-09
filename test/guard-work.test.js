import test from "node:test";
import assert from "node:assert/strict";
import {
  applyRogueTurn,
  newRogueRun,
  parseRogueState,
  rogueUnityView,
  serializeRogueState,
  villageWorldObjectAt,
} from "../src/rogue-engine.js";
import {
  guardPatrolRoute,
  reportVillageIncident,
} from "../src/village-simulation.js";
import { namedUuid } from "../src/identity.js";

const input = {
  requestId: "m6-reactive-guard",
  seed: "m6-reactive-guard",
  heroName: "Mara",
  form: "hybrid",
  size: "small",
};

function villageState() {
  const state = newRogueRun(input);
  state.location = "village";
  return state;
}

function handAxe(state) {
  return state.hero.inventory.find((item) => item.kind === "hand_axe");
}

function advance(state) {
  return applyRogueTurn(state, {
    kind: "equip",
    itemId: handAxe(state).id,
  });
}

function breachNearGuard(state) {
  state.village.heroPosition = { x: 21, y: 13 };
  return applyRogueTurn(state, {
    kind: "local_manipulate",
    action: "breach",
    x: 22,
    y: 13,
  });
}

function job(state, type) {
  return state.village.jobs.find((entry) => entry.jobType === type);
}

function installSecurityFacility(state, key, role, x, y) {
  const buildingId = namedUuid(state.id, `test-building:${key}`),
    fixtureId = namedUuid(state.id, `test-fixture:${key}:${role}`);
  state.village.facilities.push(key);
  state.village.buildings.push({
    id: buildingId,
    key,
    status: "complete",
    door: { x, y },
  });
  state.village.fixtures.push({
    id: fixtureId,
    buildingId,
    role,
    x: x + 1,
    y: y + 1,
  });
  return fixtureId;
}

test("R8.4 legacy towns gain an inspectable muster and response policy", () => {
  const state = villageState(),
    defense = state.village.development.masterPlan.defenseStrategy;
  delete defense.musterPoint;
  delete defense.dutyPolicy;
  delete defense.facilities;
  delete defense.responseLedger;
  const restored = parseRogueState(serializeRogueState(state)),
    migrated = restored.village.development.masterPlan.defenseStrategy,
    marker = villageWorldObjectAt(
      restored,
      migrated.musterPoint.position.x,
      migrated.musterPoint.position.y,
    );
  assert.equal(marker.objectKind, "muster_point");
  assert.equal(migrated.dutyPolicy.threat, "guard_musters_then_responds");
  assert.equal(migrated.facilities[0].key, "watch_house");
  assert.deepEqual(migrated.responseLedger, []);
});

test("R1 the watch route follows homes, residents, and active work", () => {
  const state = villageState(),
    guard = state.village.npcStates.find((npc) => npc.personKey === "watchman"),
    resident = state.village.npcStates.find(
      (npc) => npc.personKey === "farmer",
    );
  state.village.buildings.push({
    key: "founder_house_test",
    householdId: "test-household",
    door: { x: 44, y: 40 },
  });
  resident.position = { x: 50, y: 42 };

  const route = guardPatrolRoute(state).map(([x, y]) => `${x},${y}`);

  assert.equal(route[0], `${guard.position.x},${guard.position.y}`);
  assert.ok(route.includes("44,40"));
  assert.ok(route.includes("50,42"));
  assert.notDeepEqual(route.slice(1, 5), [
    "-20,14",
    "-8,14",
    "-8,22",
    "-20,22",
  ]);
});

test("R8.4 an operating watch house anchors the adaptive patrol", () => {
  const state = villageState(),
    door = { x: 36, y: 18 };
  state.village.buildings.push({
    key: "watch_house",
    name: "Stonebridge watch house",
    status: "complete",
    door,
  });
  const route = guardPatrolRoute(state).map(([x, y]) => `${x},${y}`);
  assert.ok(route.includes(`${door.x},${door.y}`));
});

test("R8.4 the armory issues finite gear and the yard trains one resident", () => {
  const state = newRogueRun({ ...input, scenario: "founding" }),
    guard = state.village.npcStates.find((npc) => npc.personKey === "watchman"),
    trainee = state.village.npcStates.find((npc) => npc.personKey === "porter"),
    issueFixtureId = installSecurityFacility(state, "armory", "issue_desk", 24, 8);
  installSecurityFacility(state, "training_yard", "practice_dummy", 28, 8);
  state.location = "village";
  state.village.lastGuardPatrolAtTick = state.tick;
  for (const actor of state.village.npcStates) {
    actor.workPermissions.allowedJobTypes =
      actor.id === guard.id
        ? ["issue_defense_equipment"]
        : actor.id === trainee.id
          ? ["militia_training", "return_defense_equipment"]
          : [];
    if (actor.id === trainee.id && !actor.capabilityTags.includes("general_labor"))
      actor.capabilityTags.push("general_labor");
  }
  state.village.stockpiles.push({
    id: namedUuid(state.id, "test-stock:smithy-weapons"),
    entityType: "stockpile",
    key: "smithy_weapons",
    name: "Finished ash spears",
    itemKind: "ash_spear",
    quantity: 2,
    position: { x: 25, y: 9 },
    containerKind: "fixture",
    containerId: issueFixtureId,
    threshold: 1,
    capacity: 4,
  });
  for (let turn = 0; turn < 100; turn += 1) {
    advance(state);
    const security = state.village.development.masterPlan.defenseStrategy
      .securityOperations;
    if (security.issuedEquipment.length && security.trainingLedger.length) break;
  }
  const security = state.village.development.masterPlan.defenseStrategy
      .securityOperations,
    weapons = state.village.stockpiles.find((stock) => stock.key === "smithy_weapons");
  assert.equal(weapons.quantity, 1);
  assert.equal(security.issuedEquipment[0].actorId, guard.id);
  assert.equal(security.trainingLedger[0].actorId, trainee.id);
  assert.ok((trainee.skillPractice.combat_readiness ?? 0) > 0);
  assert.ok(security.nextTrainingAtTick > state.tick);
  const guardCell = rogueUnityView(state).map.cells.find(
    (cell) => cell.entityId === guard.id,
  );
  assert.match(guardCell.entityCapabilities, /equipped ash_spear/);
  guard.life.status = "dead";
  for (let turn = 0; turn < 100; turn += 1) {
    advance(state);
    if (security.issuedEquipment[0].status === "returned") break;
  }
  assert.equal(security.issuedEquipment[0].status, "returned");
  assert.equal(weapons.quantity, 2);
  assert.ok(
    security.equipmentLedger.some((entry) => entry.action === "returned"),
  );
  const missingIssue = {
    id: namedUuid(state.id, "test-security-issue:missing-actor"),
    actorId: namedUuid(state.id, "test-security-actor:missing"),
    itemKind: "ash_spear",
    status: "issued",
    issuedAtTick: state.tick,
    returnedAtTick: null,
    lostAtTick: null,
  };
  security.issuedEquipment.push(missingIssue);
  advance(state);
  assert.equal(missingIssue.status, "lost");
  assert.equal(missingIssue.lossReason, "actor_missing");
  const restored = parseRogueState(serializeRogueState(state));
  assert.equal(
    restored.village.development.masterPlan.defenseStrategy.securityOperations
      .trainingLedger.length,
    1,
  );
});

test("R1 a calm watchman is released for common village work", () => {
  const state = newRogueRun({ ...input, scenario: "founding" }),
    guard = state.village.npcStates.find((npc) => npc.personKey === "watchman");
  state.village.lastGuardPatrolAtTick = state.tick;
  for (const need of Object.keys(guard.life.needs))
    guard.life.needs[need] = 100;

  advance(state);

  const usefulWork = state.village.jobs.find(
    (candidate) =>
      candidate.assignedActorId === guard.id &&
      [
        "survey_construction",
        "assist_project",
        "haul_stock",
        "deliver_goods",
      ].includes(candidate.jobType),
  );
  assert.equal(job(state, "patrol_route"), undefined);
  assert.ok(usefulWork);
  assert.ok(guard.capabilityTags.includes("build"));
  assert.ok(guard.capabilityTags.includes("haul"));
  assert.ok(guard.workPermissions.allowedJobTypes.includes("assist_project"));
  assert.ok(guard.workPermissions.allowedJobTypes.includes("haul_stock"));
  assert.ok(guard.workPermissions.allowedJobTypes.includes("deliver_goods"));
});

test("M-6 crime posts one higher-priority evidence investigation", () => {
  const state = villageState();
  advance(state);
  const patrol = job(state, "patrol_route"),
    outcome = breachNearGuard(state),
    investigation = job(state, "investigate_crime"),
    evidence = villageWorldObjectAt(state, 22, 13),
    guard = state.village.npcStates.find((npc) => npc.personKey === "watchman");
  assert.equal(patrol.status, "suspended");
  assert.equal(investigation.status, "reserved");
  assert.ok(investigation.priority > patrol.priority);
  assert.equal(investigation.targetId, evidence.id);
  assert.equal(state.village.incidents.length, 1);
  assert.ok(outcome.events.some((event) => event.type === "job_suspended"));
  const guardCell = rogueUnityView(state).map.cells.find(
    (cell) => cell.entityId === guard.id,
  );
  assert.equal(guardCell.entityReason, "property_damage_reported");
  for (let turn = 0; turn < 4; turn += 1) advance(state);
  assert.equal(
    state.village.jobs.filter((entry) => entry.jobType === "investigate_crime")
      .length,
    1,
  );
});

test("M-6 guard investigates evidence, warns, and resumes patrol", () => {
  const state = villageState(),
    events = [];
  advance(state);
  events.push(...breachNearGuard(state).events);
  const investigation = job(state, "investigate_crime"),
    patrol = job(state, "patrol_route");
  for (let turn = 0; turn < 100 && investigation.status !== "completed"; turn++)
    events.push(...advance(state).events);
  assert.equal(investigation.status, "completed");
  assert.equal(state.village.incidents[0].status, "resolved");
  assert.equal(patrol.status, "active");
  assert.ok(events.some((event) => event.type === "guard_investigated"));
  assert.ok(events.some((event) => event.type === "guard_warned"));
  assert.ok(events.some((event) => event.type === "job_resumed"));
  assert.ok(
    state.village.reservations
      .filter((claim) => claim.jobId === investigation.id)
      .every((claim) => claim.state === "released"),
  );
});

test("M-6 invalid evidence releases the guard and resumes routine work", () => {
  const state = villageState();
  advance(state);
  breachNearGuard(state);
  const investigation = job(state, "investigate_crime"),
    patrol = job(state, "patrol_route");
  state.village.modifications = state.village.modifications.filter(
    (change) => change.x !== 22 || change.y !== 13,
  );
  state.village.looseMaterials = state.village.looseMaterials.filter(
    (material) => material.x !== 22 || material.y !== 13,
  );
  const outcome = advance(state);
  assert.equal(investigation.status, "cancelled");
  assert.equal(state.village.incidents[0].status, "invalidated");
  assert.equal(patrol.status, "active");
  assert.ok(outcome.events.some((event) => event.type === "job_resumed"));
  assert.ok(
    state.village.reservations
      .filter((claim) => claim.jobId === investigation.id)
      .every((claim) => claim.state === "released"),
  );
});

test("M-6 immediate danger outranks routine guard work", () => {
  const state = villageState(),
    events = [];
  advance(state);
  const guard = state.village.npcStates.find(
      (resident) => resident.personKey === "watchman",
    ),
    evidenceCell = rogueUnityView(state)
      .map.cells.filter(
        (cell) =>
          cell.tile === "outdoor_grass" &&
          !cell.entityId &&
          Math.abs(cell.x - guard.position.x) +
            Math.abs(cell.y - guard.position.y) >
            8,
      )
      .sort(
        (left, right) =>
          Math.abs(left.x - guard.position.x) +
          Math.abs(left.y - guard.position.y) -
          Math.abs(right.x - guard.position.x) -
          Math.abs(right.y - guard.position.y),
      )[0],
    evidence = villageWorldObjectAt(state, evidenceCell.x, evidenceCell.y);
  reportVillageIncident(
    state,
    {
      kind: "danger",
      evidenceId: evidence.id,
      position: evidence.position,
    },
    events,
  );
  const outcome = advance(state),
    response = job(state, "respond_danger"),
    patrol = job(state, "patrol_route");
  assert.equal(response.priority, 100);
  const responseEvents = [...outcome.events];
  if (response.status === "available")
    responseEvents.push(...advance(state).events);
  assert.ok(["reserved", "active"].includes(response.status));
  assert.equal(patrol.status, "suspended");
  assert.ok(responseEvents.some((event) => event.type === "job_suspended"));
  for (let turn = 0; turn < 360 && response.status !== "completed"; turn += 1) {
    for (const resident of state.village.npcStates)
      resident.life.needs.safety = 100;
    responseEvents.push(...advance(state).events);
  }
  const ledger =
    state.village.development.masterPlan.defenseStrategy.responseLedger;
  assert.equal(response.status, "completed");
  assert.ok(responseEvents.some((event) => event.type === "guard_mustered"));
  assert.equal(ledger.at(-1).incidentId, state.village.incidents[0].id);
  assert.ok(ledger.at(-1).responseTicks > 0);
});

test("M-6 repeat property damage escalates the warning to escort", () => {
  const state = villageState(),
    events = [];
  advance(state);
  state.village.wantedLevel = 1;
  events.push(...breachNearGuard(state).events);
  const investigation = job(state, "investigate_crime");
  for (let turn = 0; turn < 100 && investigation.status !== "completed"; turn++)
    events.push(...advance(state).events);
  assert.equal(investigation.status, "completed");
  assert.ok(events.some((event) => event.type === "guard_escorted"));
});
