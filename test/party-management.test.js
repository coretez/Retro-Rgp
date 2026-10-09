import test from "node:test";
import assert from "node:assert/strict";
import {
  applyRogueTurn,
  newRogueRun,
  parseRogueState,
  rogueUnityView,
  serializeRogueState,
} from "../src/rogue-engine.js";
import { awardPartyPractice } from "../src/party-development.js";
import { newInstanceId } from "../src/identity.js";

const input = {
  requestId: "party-management",
  seed: "party-management",
  heroName: "Mara",
  heroClass: "fighter",
  form: "hybrid",
  size: "small",
  levels: 3,
};

test("every party member has a character sheet and development plan", () => {
  const state = newRogueRun(input);
  for (const actor of [state.hero, ...state.companions]) {
    assert.equal(Object.keys(actor.abilities).length, 6);
    assert.equal(Object.keys(actor.development.skills).length, 12);
    assert.ok(actor.management.jobFocus);
    assert.ok(actor.management.combatRole);
  }
  const view = rogueUnityView(state);
  assert.equal(view.partyMembers.length, 4);
  assert.equal(view.partyMembers[0].skills.length, 12);
  assert.ok(view.legalIntents.includes("configure_party_member"));
});

test("party configuration is authoritative and does not consume a turn", () => {
  const state = newRogueRun(input),
    companion = state.companions[0],
    worker = state.village.companionStates.find(
      (candidate) => candidate.actorId === companion.id,
    ),
    jobFocus = worker.workPermissions.allowedJobTypes[0],
    tick = state.tick;
  applyRogueTurn(state, {
    kind: "configure_party_member",
    actorId: companion.id,
    combatRole: "frontline",
    jobFocus,
    workPriority: 90,
  });
  assert.equal(state.tick, tick);
  assert.equal(companion.role, "frontline");
  assert.equal(companion.management.jobFocus, jobFocus);
  assert.equal(worker.workPriorities[jobFocus], 90);
  assert.equal(
    state.partyGroup.assignments.find((entry) => entry.actorId === companion.id)
      .role,
    "frontline",
  );
});

test("completed activities exercise their declared skills and can increase rank", () => {
  const state = newRogueRun(input),
    actor = state.companions[0],
    skill = actor.development.skills.athletics;
  skill.practice = 5 * (skill.rank + 1) - 1;
  const events = [
    {
      type: "companion_objective_completed",
      actorId: actor.id,
      skills: ["athletics", "crafting"],
    },
  ];
  const rank = skill.rank;
  awardPartyPractice(state, events);
  assert.equal(skill.rank, rank + 1);
  assert.equal(skill.practice, 0);
  assert.equal(events.at(-1).type, "skill_improved");
});

test("facility activities remain locked until their world facility exists", () => {
  const state = newRogueRun(input),
    actorId = state.companions[0].id;
  let member = rogueUnityView(state).partyMembers.find(
    (candidate) => candidate.id === actorId,
  );
  assert.equal(
    member.activities.find(
      (activity) => activity.jobType === "archery_practice",
    ).available,
    false,
  );
  assert.equal(
    member.activities.find(
      (activity) => activity.jobType === "tournament_drill",
    ).available,
    false,
  );
  state.village.facilities.push("archery_range");
  member = rogueUnityView(state).partyMembers.find(
    (candidate) => candidate.id === actorId,
  );
  assert.equal(
    member.activities.find(
      (activity) => activity.jobType === "archery_practice",
    ).available,
    true,
  );
  assert.equal(
    member.activities.find(
      (activity) => activity.jobType === "tournament_drill",
    ).available,
    false,
  );
});

test("a completed work activity advances the skills it actually exercises", () => {
  const state = newRogueRun(input),
    actor = state.companions[0],
    index = state.companions.indexOf(actor),
    worker = state.village.companionStates.find(
      (candidate) => candidate.actorId === actor.id,
    ),
    before = actor.development.skills.athletics.practice;
  state.location = "village";
  state.village.adventurersPresent = true;
  Object.keys(worker.workPriorities).forEach(
    (jobType) => (worker.workPriorities[jobType] = 0),
  );
  worker.workPriorities.cut_timber = 100;
  worker.position = { x: 14, y: 18 };
  state.village.companionPositions[index] = { ...worker.position };
  applyRogueTurn(state, { kind: "set_party_movement", mode: "dispersed" });
  for (
    let turn = 0;
    turn < 8 && actor.development.skills.athletics.practice === before;
    turn += 1
  ) {
    const job = state.village.jobs.find(
      (candidate) =>
        candidate.assignedActorId === actor.id &&
        candidate.progress?.unit === "work_minute" &&
        ["reserved", "active"].includes(candidate.status),
    );
    if (job)
      job.progress.completed = Math.max(
        job.progress.completed,
        job.progress.total - 0.6,
      );
    applyRogueTurn(state, { kind: "wait" });
  }
  assert.equal(actor.development.skills.athletics.practice, before + 1);
  assert.equal(actor.development.skills.crafting.practice, 1);
});

test("Unity party projection has no four-member cap", () => {
  const state = newRogueRun(input),
    recruit = structuredClone(state.companions[0]);
  recruit.id = newInstanceId();
  recruit.name = "Fifth Recruit";
  state.companions.push(recruit);
  const view = rogueUnityView(state);
  assert.equal(view.partyMembers.length, 5);
  assert.equal(view.partyMembers.at(-1).name, "Fifth Recruit");
});

test("schema migration adds sheets and management to legacy party members", () => {
  const state = newRogueRun(input),
    saved = serializeRogueState(state);
  saved.schemaVersion = 18;
  for (const actor of [saved.hero, ...saved.companions]) {
    delete actor.abilities;
    delete actor.development;
    delete actor.management;
  }
  const migrated = parseRogueState(saved);
  assert.equal(migrated.schemaVersion, 22);
  assert.equal(migrated.hero.development.skills.leadership.rank, 1);
  assert.equal(migrated.companions[0].development.skills.stealth.rank, 2);
  assert.ok(migrated.companions[1].management.jobFocus);
});
