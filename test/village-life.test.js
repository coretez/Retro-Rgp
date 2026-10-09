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
import { createJob } from "../src/job-board.js";
import { reportVillageIncident } from "../src/village-simulation.js";
import {
  advanceTownClock,
  createLifeState,
  createTownClock,
  daylightLevel,
  daylightPhase,
  lifeMisery,
  LIFE_JOB_TYPES,
  NEED_KEYS,
  recommendedNeed,
  scheduleBlock,
  scheduleJobModifier,
  updateLifeState,
} from "../src/village-life.js";

const input = {
  requestId: "m9-village-life",
  seed: "m9-village-life",
  heroName: "Mara",
  form: "hybrid",
  size: "small",
};

function villageState() {
  const state = newRogueRun(input);
  state.location = "village";
  return state;
}

function wait(state) {
  return applyRogueTurn(state, { kind: "wait" });
}

test("M-9 gives NPCs and player characters the same bounded needs contract", () => {
  const state = villageState(),
    heroLife = state.village.playerCharacterStates.find(
      (life) => life.actorId === state.hero.id,
    );
  assert.equal(heroLife.authority, "player_directed");
  assert.deepEqual(Object.keys(heroLife.needs), [...NEED_KEYS]);
  for (const worker of state.village.companionStates) {
    assert.equal(worker.life.actorId, worker.actorId);
    assert.equal(worker.life.authority, "player_directed");
  }
  for (const resident of state.village.npcStates) {
    assert.equal(resident.life.actorId, resident.id);
    assert.equal(resident.life.authority, "autonomous");
  }
});

test("M-9 clock and need changes are deterministic, bounded, and scheduled", () => {
  assert.equal(scheduleBlock(2), "rest");
  assert.equal(scheduleBlock(12), "work");
  assert.equal(scheduleBlock(19), "free_time");
  assert.ok(
    scheduleJobModifier("work", "prepare_meal") >
      scheduleJobModifier("rest", "prepare_meal"),
  );
  const first = createLifeState("actor"),
    second = createLifeState("actor"),
    clock = createTownClock();
  for (let turn = 0; turn < 150; turn += 1) {
    updateLifeState(first, clock, turn < 12);
    updateLifeState(second, clock, turn < 12);
  }
  assert.deepEqual(first, second);
  for (const value of Object.values(first.needs))
    assert.ok(value >= 0 && value <= 100);
});

test("R8.5 a sub-day food reserve keeps specialists working until rest", () => {
  const state = newRogueRun({
      ...input,
      requestId: "r8-food-reserve-duty",
      scenario: "founding",
    }),
    fisher = state.village.npcStates.find(
      (resident) => resident.personKey === "fisher",
    ),
    innkeeper = state.village.npcStates.find(
      (resident) => resident.personKey === "innkeeper",
    );
  state.location = "village";
  for (const key of [
    "inn_meals",
    "inn_fish",
    "wild_forage",
    "farm_grain",
    "farm_vegetables",
    "dairy_milk",
    "pasture_meat",
  ])
    state.village.stockpiles.find((pile) => pile.key === key).quantity = 0;
  for (const resident of state.village.npcStates)
    for (const need of NEED_KEYS) resident.life.needs[need] = 100;
  Object.assign(state.village.clock, { hour: 19, block: "free_time" });

  for (let turn = 0; turn < 12; turn += 1) {
    wait(state);
    const job = state.village.jobs.find(
      (candidate) => candidate.jobType === "catch_fish",
    );
    if (["reserved", "active"].includes(job?.status)) break;
  }

  const fishing = state.village.jobs.find(
    (job) => job.jobType === "catch_fish" && job.status !== "cancelled",
  );
  assert.equal(fisher.skillPriorities.fishing, 1);
  assert.equal(innkeeper.skillPriorities.cooking, 1);
  assert.deepEqual(fishing.plan.skills, ["fishing"]);
  assert.equal(fishing.plan.foodReserveDuty, true);
  assert.equal(fishing.basePriority, 138);
  assert.ok(
    ["reserved", "active"].includes(fishing.status),
    JSON.stringify({
      fishing,
      fisher: {
        workState: fisher.workState,
        currentAction: fisher.currentAction,
        scheduleBlock: fisher.life.scheduleBlock,
      },
    }),
  );

  Object.assign(state.village.clock, { hour: 22, block: "rest" });
  wait(state);
  assert.ok(!["reserved", "active"].includes(fishing.status));
});

test("R8.5 one food day does not cancel the three-day reserve duty", () => {
  const state = newRogueRun({
      ...input,
      requestId: "r8-three-day-food-reserve",
      scenario: "founding",
    }),
    meals = state.village.stockpiles.find((pile) => pile.key === "inn_meals");
  state.location = "village";
  for (const key of [
    "river_catch",
    "inn_meals",
    "inn_fish",
    "wild_forage",
    "farm_grain",
    "farm_vegetables",
    "dairy_milk",
    "pasture_meat",
    "farm_eggs",
  ])
    state.village.stockpiles.find((pile) => pile.key === key).quantity = 0;
  meals.quantity = state.village.npcStates.length;
  for (const resident of state.village.npcStates)
    for (const need of NEED_KEYS) resident.life.needs[need] = 100;
  Object.assign(state.village.clock, { hour: 9, block: "work" });

  wait(state);

  const fishing = state.village.jobs.find(
    (job) => job.jobType === "catch_fish" && job.status !== "cancelled",
  );
  assert.equal(fishing.plan.foodReserveDuty, true);
  assert.equal(fishing.basePriority, 138);
});

test("M-11.1 homeless residents prioritize food before shelter", () => {
  const life = createLifeState("resident");
  life.statusTags.push("homeless");
  life.needs.hunger = 55;
  life.needs.safety = 50;
  assert.equal(recommendedNeed(life).need, "hunger");
  life.needs.hunger = 100;
  assert.equal(recommendedNeed(life).need, "safety");
  life.statusTags = [];
  life.needs.safety = 100;
  assert.equal(recommendedNeed(life), null);
});

test("R2 rough bedroll sleeping creates severe visible misery", () => {
  const life = createLifeState("resident");
  life.statusTags.push("homeless", "rough_sleeping");
  const misery = lifeMisery(life);
  assert.equal(misery.level, "severe");
  assert.ok(misery.score >= 55);
  assert.deepEqual(misery.reasons, ["homeless", "rough_sleeping"]);
});

test("R2 residents choose a full night's sleep before workday exhaustion", () => {
  const life = createLifeState("resident");
  life.scheduleBlock = "rest";
  Object.assign(life.needs, {
    hunger: 82,
    fatigue: 94,
    safety: 80,
    social: 54,
    morale: 62,
  });
  assert.equal(recommendedNeed(life).need, "fatigue");
  life.scheduleBlock = "work";
  assert.equal(recommendedNeed(life), null);
});

test("R2 rest preparation chooses sleep before optional morale work", () => {
  const state = newRogueRun({
      ...input,
      requestId: "r2-rest-before-morale",
      scenario: "founding",
    }),
    resident = state.village.npcStates[0];
  Object.assign(state.village.clock, { hour: 22, block: "rest" });
  for (const actor of state.village.npcStates)
    Object.assign(actor.life.needs, {
      hunger: 100,
      fatigue: 100,
      safety: 100,
      social: 100,
      morale: 100,
    });
  Object.assign(resident.life.needs, { fatigue: 55, morale: 0 });

  wait(state);

  const job = state.village.jobs.find(
    (candidate) =>
      candidate.plan?.lifeJob && candidate.plan.ownerActorId === resident.id,
  );
  assert.equal(job?.plan.need, "fatigue");
});

test("R2 founding leisure cannot reserve the whole settlement", () => {
  const state = newRogueRun({
    ...input,
    requestId: "r2-bounded-founding-leisure",
    scenario: "founding",
  });
  Object.assign(state.village.clock, { hour: 19, block: "free_time" });
  for (const actor of state.village.npcStates)
    Object.assign(actor.life.needs, {
      hunger: 100,
      fatigue: 100,
      safety: 100,
      social: 100,
      morale: 0,
    });

  wait(state);

  const leisure = state.village.jobs.filter(
    (job) =>
      job.plan?.lifeJob &&
      ["social", "morale"].includes(job.plan.need) &&
      !["completed", "cancelled"].includes(job.status),
  );
  assert.ok(leisure.length > 0);
  assert.ok(leisure.length <= 2);
});

test("R2 sheltered sleep replaces standing shelter during the rest block", () => {
  const state = newRogueRun({
      ...input,
      requestId: "r2-sheltered-sleep",
      runId: "56c2588f-2e7d-47ca-a7df-7b856590deae",
      scenario: "founding",
    }),
    resident = state.village.npcStates.find(
      (candidate) => candidate.personKey === "woodcutter",
    );
  Object.assign(state.village.clock, {
    hour: 22,
    minute: 0,
    second: 0,
    block: "rest",
    phase: "night",
  });
  Object.assign(resident.life.needs, {
    hunger: 100,
    fatigue: 60,
    safety: 20,
    social: 100,
    morale: 100,
  });

  wait(state);

  const lifeJob = state.village.jobs.find(
    (job) =>
      job.plan?.ownerActorId === resident.id &&
      job.plan?.lifeJob &&
      !["completed", "cancelled"].includes(job.status),
  );
  assert.equal(lifeJob?.plan.need, "fatigue");
  assert.match(lifeJob.name, /sleep/i);
});

test("R2 ordinary work suspends at rest while the watch remains on duty", () => {
  const state = villageState(),
    worker = state.village.npcStates.find((npc) => npc.personKey === "farmer"),
    target = villageWorldObjectAt(state, -14, 18),
    { job } = createJob(state, {
      jobType: "inspect_object",
      name: "Inspect the founding camp",
      targetId: target.id,
      targetPosition: { x: -14, y: 18 },
      requiredCapabilities: ["inspect"],
      progressTotal: 60,
      progressUnit: "work_minute",
      plan: { step: "inspect" },
    });
  Object.assign(state.village.clock, { hour: 21, minute: 59, second: 24 });
  Object.assign(job, { status: "active", assignedActorId: worker.id });
  worker.workState = "working";
  const outcome = wait(state),
    patrol = state.village.jobs.find((candidate) =>
      candidate.jobType === "patrol_route");
  assert.equal(state.village.clock.block, "rest");
  assert.equal(job.status, "suspended");
  assert.notEqual(patrol?.status, "suspended");
  assert.ok(outcome.events.some((event) =>
    event.type === "job_suspended" && event.reason === "scheduled_rest"));
});

test("M-11 one normal-speed day is 2,400 deterministic simulation beats", () => {
  const clock = createTownClock();
  for (let tick = 0; tick < 2400; tick += 1) advanceTownClock(clock);
  assert.deepEqual(clock, {
    day: 2,
    hour: 6,
    minute: 0,
    second: 0,
    block: "free_time",
    phase: "dawn",
  });
  assert.equal(daylightPhase(12), "day");
  assert.equal(daylightPhase(19), "dusk");
  assert.equal(daylightPhase(23), "night");
  assert.ok(daylightLevel({ hour: 6, minute: 0, phase: "dawn" }) > 0.25);
});

test("M-11 save migration repairs stale schedule and daylight labels", () => {
  const state = villageState();
  Object.assign(state.village.clock, {
    hour: 4,
    minute: 30,
    block: "work",
    phase: "day",
  });
  const restored = parseRogueState(serializeRogueState(state));
  assert.equal(restored.village.clock.block, "rest");
  assert.equal(restored.village.clock.phase, "night");
});

test("M-9 recommends actions to the hero without autonomously moving them", () => {
  const state = villageState(),
    heroLife = state.village.playerCharacterStates[0],
    before = { ...state.village.heroPosition };
  state.village.adventurersPresent = true;
  heroLife.needs.hunger = 0;
  wait(state);
  assert.equal(heroLife.recommendation.need, "hunger");
  assert.deepEqual(state.village.heroPosition, before);
  assert.equal(
    state.village.jobs.some((job) => job.plan?.ownerActorId === state.hero.id),
    false,
  );
});

test("M-9 companions expose needs but self-direct only while dispersed", () => {
  const state = villageState(),
    companionIds = new Set(state.companions.map((actor) => actor.id));
  state.village.adventurersPresent = true;
  for (const worker of state.village.companionStates)
    worker.life.needs.hunger = 0;
  wait(state);
  assert.equal(
    state.village.jobs.some(
      (job) => job.plan?.lifeJob && companionIds.has(job.plan.ownerActorId),
    ),
    false,
  );
  applyRogueTurn(state, { kind: "set_party_movement", mode: "dispersed" });
  assert.ok(
    state.village.jobs.some(
      (job) => job.plan?.lifeJob && companionIds.has(job.plan.ownerActorId),
    ),
  );
});

test("R2 survival warning needs interrupt ordinary work before danger", () => {
  const state = villageState(),
    guard = state.village.npcStates.find((npc) => npc.personKey === "watchman");
  for (const need of NEED_KEYS) guard.life.needs[need] = 100;
  wait(state);
  const ordinary = state.village.jobs.find(
    (job) =>
      job.assignedActorId === guard.id &&
      ["reserved", "active"].includes(job.status),
  );
  assert.ok(ordinary);
  ordinary.priority = 115;
  ordinary.basePriority = 115;
  guard.life.needs.hunger = 40;
  const outcome = wait(state),
    hungerJob = state.village.jobs.find(
      (job) =>
        job.plan?.ownerActorId === guard.id && job.plan?.need === "hunger",
    );
  assert.ok(hungerJob);
  assert.ok(
    outcome.events.some(
      (event) => event.type === "job_suspended" && event.jobId === ordinary.id,
    ),
  );
});

test("R2 warning hunger interrupts an active sleep job", () => {
  const state = villageState(),
    guard = state.village.npcStates.find((npc) => npc.personKey === "watchman"),
    bed = villageWorldObjectAt(state, -13, 8),
    { job: sleep } = createJob(state, {
      jobType: "sleep",
      name: "Sleep at the Lantern",
      targetId: bed.id,
      targetPosition: { x: -13, y: 8 },
      requiredCapabilities: ["sleep"],
      progressTotal: 480,
      progressUnit: "life_minute",
      plan: {
        template: "sleep",
        step: "satisfy_need",
        need: "fatigue",
        lifeJob: true,
        ownerActorId: guard.id,
      },
    });
  sleep.status = "active";
  sleep.assignedActorId = guard.id;
  guard.workState = "working";
  for (const need of NEED_KEYS) guard.life.needs[need] = 100;
  guard.life.needs.hunger = 40;

  const outcome = wait(state),
    hungerJob = state.village.jobs.find(
      (job) =>
        job.plan?.ownerActorId === guard.id && job.plan?.need === "hunger",
    );

  assert.equal(sleep.status, "cancelled");
  assert.ok(hungerJob);
  assert.ok(
    outcome.events.some(
      (event) =>
        event.type === "job_cancelled" &&
        event.jobId === sleep.id &&
        event.reason === "critical_need_changed",
    ),
  );
});

test("R4 unavailable food does not reset critical sleep every tick", () => {
  const state = villageState(),
    guard = state.village.npcStates.find((npc) => npc.personKey === "watchman"),
    bed = villageWorldObjectAt(state, -13, 8),
    { job: sleep } = createJob(state, {
      jobType: "sleep",
      name: "Sleep at the Lantern",
      targetId: bed.id,
      targetPosition: { x: -13, y: 8 },
      requiredCapabilities: ["sleep"],
      progressTotal: 480,
      progressUnit: "life_minute",
      plan: {
        template: "sleep",
        step: "satisfy_need",
        need: "fatigue",
        lifeJob: true,
        ownerActorId: guard.id,
      },
    });
  for (const need of NEED_KEYS) guard.life.needs[need] = 100;
  for (const key of ["inn_meals", "wild_forage", "dairy_milk"])
    state.village.stockpiles.find((stockpile) => stockpile.key === key).quantity = 0;
  Object.assign(guard, {
    position: { x: -13, y: 8 },
    workState: "working",
  });
  Object.assign(guard.life.needs, { hunger: 0, fatigue: 0 });
  Object.assign(sleep, { status: "active", assignedActorId: guard.id });

  const events = [];
  for (let turn = 0; turn < 12; turn += 1) events.push(...wait(state).events);

  assert.equal(sleep.status, "active");
  assert.ok(sleep.progress.completed > 0, JSON.stringify(events));
  assert.ok(guard.life.needs.fatigue > 0);
  assert.equal(
    events.some(
      (event) =>
        event.jobId === sleep.id && event.reason === "critical_need_changed",
    ),
    false,
  );
});

test("M-11.1 fatigue cannot divert an active unconsumed meal job", () => {
  const state = villageState(),
    guard = state.village.npcStates.find((npc) => npc.personKey === "watchman"),
    meal = villageWorldObjectAt(state, -10, 4),
    { job } = createJob(state, {
      jobType: "eat_meal",
      name: "Eat a meal at the Lantern",
      targetId: meal.id,
      targetPosition: { x: -10, y: 4 },
      requiredCapabilities: ["eat"],
      progressTotal: 30,
      progressUnit: "life_minute",
      plan: {
        template: "eat_meal",
        step: "satisfy_need",
        need: "hunger",
        lifeJob: true,
        ownerActorId: guard.id,
      },
    });
  job.status = "active";
  job.assignedActorId = guard.id;
  guard.workState = "working";
  for (const need of NEED_KEYS) guard.life.needs[need] = 100;
  guard.life.needs.hunger = 40;
  guard.life.needs.fatigue = 0;

  wait(state);

  assert.notEqual(job.status, "cancelled");
  assert.equal(
    state.village.jobs.some(
      (candidate) =>
        candidate.plan?.ownerActorId === guard.id &&
        candidate.plan?.need === "fatigue",
    ),
    false,
  );
});

test("M-11.1 an existing meal job escalates as hunger becomes critical", () => {
  const state = villageState(),
    guard = state.village.npcStates.find((npc) => npc.personKey === "watchman");
  for (const need of NEED_KEYS) guard.life.needs[need] = 100;
  wait(state);
  const patrol = state.village.jobs.find(
    (job) =>
      job.assignedActorId === guard.id &&
      ["reserved", "active"].includes(job.status),
  );
  assert.ok(patrol);
  guard.life.needs.hunger = 50;
  wait(state);
  const meal = state.village.jobs.find(
    (job) => job.plan?.ownerActorId === guard.id && job.plan?.need === "hunger",
  );
  assert.ok(meal);
  meal.priority = 30;
  meal.basePriority = 30;
  guard.life.needs.hunger = 0;

  wait(state);

  assert.equal(meal.priority, 200);
  assert.equal(patrol.status, "suspended");
  assert.ok(["reserved", "active"].includes(meal.status));
});

test("M-9 immediate danger response outranks a critical personal need", () => {
  const state = villageState(),
    guard = state.village.npcStates.find((npc) => npc.personKey === "watchman"),
    incidentPosition = { x: 20, y: 10 },
    evidence = villageWorldObjectAt(state, 20, 10);
  reportVillageIncident(
    state,
    {
      kind: "danger",
      evidenceId: evidence.id,
      position: incidentPosition,
      offenderId: null,
    },
    [],
  );
  wait(state);
  const response = state.village.jobs.find(
    (job) => job.jobType === "respond_danger",
  );
  assert.equal(response.assignedActorId, guard.id);
  guard.life.needs.hunger = 0;
  const outcome = wait(state);
  assert.ok(["active", "reserved"].includes(response.status));
  assert.equal(
    outcome.events.some(
      (event) => event.type === "job_suspended" && event.jobId === response.id,
    ),
    false,
  );
});

test("R1 a threatened resident flees instead of sleeping or continuing work", () => {
  const state = villageState();
  for (const resident of state.village.npcStates)
    for (const need of NEED_KEYS) resident.life.needs[need] = 100;
  wait(state);
  const ordinary = state.village.jobs.find(
      (job) => {
        const actor = state.village.npcStates.find(
          (npc) => npc.id === job.assignedActorId,
        );
        return (
          actor?.personKey !== "watchman" &&
          ["reserved", "active"].includes(job.status)
        );
      },
  ),
    resident = state.village.npcStates.find(
      (npc) => npc.id === ordinary?.assignedActorId && npc.personKey !== "watchman",
    );
  assert.ok(ordinary);
  assert.ok(resident);
  const incident = reportVillageIncident(
    state,
    {
      kind: "danger",
      evidenceId: villageWorldObjectAt(state, 20, 10).id,
      position: { ...resident.position },
      targetActorId: resident.id,
    },
    [],
  );
  const outcome = wait(state),
    escape = state.village.jobs.find(
      (job) =>
        job.plan?.ownerActorId === resident.id &&
        job.plan?.threatIncidentId === incident.id,
    );
  assert.ok(escape);
  assert.equal(escape.jobType, "seek_safety");
  assert.equal(escape.priority, 200);
  assert.ok(["reserved", "active"].includes(escape.status));
  assert.notEqual(escape.jobType, "sleep");
  assert.ok(
    outcome.events.some(
      (event) => event.type === "job_suspended" && event.jobId === ordinary.id,
    ),
  );
});

test("M-9 smart life objects and conversation partners are uniquely reserved", () => {
  const state = villageState();
  for (const resident of state.village.npcStates) {
    for (const need of NEED_KEYS) resident.life.needs[need] = 100;
    resident.life.needs.social = 0;
  }
  wait(state);
  const lifeJobs = state.village.jobs.filter(
      (job) => job.plan?.lifeJob && ["reserved", "active"].includes(job.status),
    ),
    held = state.village.reservations.filter(
      (claim) =>
        claim.state === "held" &&
        lifeJobs.some((job) => job.id === claim.jobId),
    ),
    objectIds = held
      .filter((claim) => claim.kind === "object")
      .map((claim) => claim.targetId),
    actorIds = held
      .filter((claim) => claim.kind === "actor")
      .map((claim) => claim.targetId);
  assert.ok(lifeJobs.length > 0);
  assert.equal(new Set(objectIds).size, objectIds.length);
  assert.equal(new Set(actorIds).size, actorIds.length);
});

test("R4 noncritical social work yields to a resident's ready skill queue", () => {
  const state = villageState();
  state.village.clock.hour = 12;
  state.village.clock.block = "work";
  for (const resident of state.village.npcStates)
    for (const need of NEED_KEYS) resident.life.needs[need] = 100;
  const resident = state.village.npcStates.find(
    (candidate) => candidate.personKey === "porter",
    ),
    partner = state.village.npcStates.find(
      (candidate) => candidate.id !== resident.id,
    ),
    permissions = [...resident.workPermissions.allowedJobTypes];
  for (const candidate of state.village.npcStates)
    if (![resident.id, partner.id].includes(candidate.id))
      candidate.workState = "working";
  resident.workPermissions.allowedJobTypes = ["socialize"];
  resident.life.needs.social = 0;
  wait(state);
  const social = state.village.jobs.find(
    (job) => job.jobType === "socialize" && job.assignedActorId === resident.id,
  );
  assert.ok(social);
  resident.workPermissions.allowedJobTypes = permissions;
  const inspectionTarget = villageWorldObjectAt(state, 20, 10);
  const skilled = createJob(state, {
    jobType: "inspect_object",
    name: "Inspect ready work",
    priority: 2000,
    targetId: inspectionTarget.id,
    targetPosition: { x: 20, y: 10 },
    requiredCapabilities: ["inspect"],
    plan: { skills: ["logistics"], ownerActorId: resident.id },
  }).job;

  wait(state);

  assert.ok(["suspended", "cancelled"].includes(social.status));
  assert.ok(["reserved", "active", "completed"].includes(skilled.status));
  assert.equal(
    state.village.reservations.some(
      (claim) => claim.jobId === social.id && claim.state === "held",
    ),
    false,
  );
});

test("R2 the work block ends noncritical leisure once the need is safe", () => {
  const state = villageState(),
    resident = state.village.npcStates[0];
  for (const actor of state.village.npcStates)
    for (const need of NEED_KEYS) actor.life.needs[need] = 100;
  resident.life.needs.social = 0;
  state.village.clock.hour = 19;
  state.village.clock.block = "free_time";
  wait(state);
  const social = state.village.jobs.find(
    (job) =>
      job.plan?.ownerActorId === resident.id && job.jobType === "socialize",
  );
  assert.ok(social);
  resident.life.needs.social = 54;
  state.village.clock.hour = 12;
  state.village.clock.block = "work";
  const outcome = wait(state);
  assert.equal(social.status, "cancelled");
  assert.ok(
    outcome.events.some(
      (event) =>
        event.jobId === social.id && event.reason === "scheduled_work_resumed",
    ),
  );
});

test("R2 ready productive work ends even critical optional leisure", () => {
  const state = newRogueRun({
      ...input,
      requestId: "r2-work-before-optional-leisure",
      scenario: "founding",
    }),
    resident = state.village.npcStates.find(
      (candidate) => candidate.personKey === "porter",
    ),
    permissions = [...resident.workPermissions.allowedJobTypes];
  for (const actor of state.village.npcStates)
    Object.assign(actor.life.needs, {
      hunger: 100,
      fatigue: 100,
      safety: 100,
      social: 100,
      morale: 100,
    });
  Object.assign(state.village.clock, { hour: 19, block: "free_time" });
  resident.life.needs.morale = 0;
  resident.workPermissions.allowedJobTypes = ["worship"];
  wait(state);
  const leisure = state.village.jobs.find(
    (job) => job.plan?.ownerActorId === resident.id && job.plan.need === "morale",
  );
  assert.ok(leisure);

  resident.workPermissions.allowedJobTypes = permissions;
  const target = villageWorldObjectAt(state, 20, 10),
    productive = createJob(state, {
      jobType: "inspect_object",
      name: "Inspect ready settlement work",
      priority: 2000,
      targetId: target.id,
      targetPosition: { x: 20, y: 10 },
      requiredCapabilities: ["inspect"],
      plan: { skills: ["logistics"], ownerActorId: resident.id },
    }).job;
  Object.assign(state.village.clock, { hour: 12, block: "work" });

  wait(state);

  assert.equal(leisure.status, "cancelled");
  assert.ok(["reserved", "active", "completed"].includes(productive.status));
});

test("R2 suspended productive work still outranks optional leisure", () => {
  const state = newRogueRun({
      ...input,
      requestId: "r2-suspended-work-before-leisure",
      scenario: "founding",
    }),
    resident = state.village.npcStates.find(
      (candidate) => candidate.personKey === "porter",
    ),
    target = villageWorldObjectAt(state, 20, 10);
  for (const actor of state.village.npcStates)
    for (const need of NEED_KEYS) actor.life.needs[need] = 100;
  Object.assign(state.village.clock, { hour: 19, block: "free_time" });
  resident.life.needs.morale = 0;
  wait(state);
  const leisure = state.village.jobs.find(
    (job) => job.plan?.ownerActorId === resident.id && job.plan.need === "morale",
  );
  assert.ok(leisure);
  const productive = createJob(state, {
    jobType: "inspect_object",
    name: "Resume settlement inspection",
    priority: 2000,
    targetId: target.id,
    targetPosition: { x: 20, y: 10 },
    requiredCapabilities: ["inspect"],
    plan: { skills: ["logistics"] },
  }).job;
  Object.assign(productive, {
    status: "suspended",
    assignedActorId: resident.id,
  });
  Object.assign(state.village.clock, { hour: 12, block: "work" });

  wait(state);

  assert.equal(leisure.status, "cancelled");
  assert.ok(["active", "completed"].includes(productive.status));
});

test("R2 critical survival releases a resident from a social partner claim", () => {
  const state = villageState();
  for (const resident of state.village.npcStates) {
    for (const need of NEED_KEYS) resident.life.needs[need] = 100;
  }
  for (const companion of state.village.companionStates)
    companion.workState = "working";
  state.village.npcStates[0].life.needs.social = 0;
  wait(state);
  const social = state.village.jobs.find(
      (job) =>
        job.jobType === "socialize" &&
        !["completed", "cancelled"].includes(job.status) &&
        job.plan.partnerId,
    ),
    partner = state.village.npcStates.find(
      (resident) => resident.id === social?.plan.partnerId,
    );
  assert.ok(social);
  assert.ok(partner);
  partner.life.needs.hunger = 0;

  const outcome = wait(state),
    hunger = state.village.jobs.find(
      (job) =>
        job.plan?.ownerActorId === partner.id && job.plan.need === "hunger",
    );

  assert.equal(social.status, "cancelled");
  assert.ok(hunger);
  assert.ok(
    outcome.events.some(
      (event) =>
        event.type === "job_cancelled" &&
        event.jobId === social.id &&
        event.releasedPartnerId === partner.id,
    ),
  );
});

test("M-9 daily routines use minute-based work rather than calendar jumps", () => {
  const state = villageState();
  wait(state);
  wait(state);
  wait(state);
  wait(state);
  const timed = state.village.jobs.find(
    (job) =>
      job.progress?.unit === "work_minute" &&
      job.status === "active" &&
      job.progress.completed > 0,
  );
  assert.ok(timed);
  assert.ok(timed.progress.completed <= 1.2);
  assert.equal(timed.progress.completed % 0.6, 0);
  assert.ok(timed.progress.total >= 30);
  assert.equal(state.village.clock.hour, 6);
  assert.equal(state.village.clock.minute, 2);
  assert.equal(state.village.clock.second, 24);
});

test("M-9 Unity inspector exposes clock, needs, schedule, and memories", () => {
  const state = villageState();
  state.village.npcStates[0].life.memories.push({
    need: "social",
    description: "Shared breakfast with a neighbor",
    tick: 0,
  });
  const view = rogueUnityView(state),
    resident = view.map.cells.find(
      (cell) => cell.entityId === state.village.npcStates[0].id,
    );
  assert.match(view.townClock, /DAY 1/);
  assert.match(resident.entityNeeds, /hunger/);
  assert.equal(resident.entitySchedule, "free_time");
  assert.equal(resident.entityMemory, "Shared breakfast with a neighbor");
});
