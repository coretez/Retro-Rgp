import test from "node:test";
import assert from "node:assert/strict";
import {
  applyRogueTurn,
  newRogueRun,
  rogueUnityView,
  villageWorldObjectAt,
} from "../src/rogue-engine.js";
import { reportVillageIncident } from "../src/village-simulation.js";

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
  const evidence = villageWorldObjectAt(state, 20, 11);
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
  assert.equal(response.status, "reserved");
  assert.equal(patrol.status, "suspended");
  assert.ok(outcome.events.some((event) => event.type === "job_suspended"));
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
