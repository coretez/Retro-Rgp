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
import { villageMovementCost } from "../src/village-simulation.js";
import {
  advanceAnimalHusbandry,
  advanceAnimalDisease,
  advanceAnimalLifecycle,
  advanceVillageAnimals,
  advanceWildlifeEcology,
  animalFootprint,
  animalProductionCandidates,
  beginAnimalBreeding,
  createFarmsteadPasture,
  ensureVillageAnimals,
  grazingSeason,
  installAnimalHousingSites,
  infectAnimal,
  livingAnimals,
  markAnimalDead,
  recordAnimalProduction,
  refreshPastureForage,
  wildlifeCarryingCapacity,
  treatAnimalDisease,
} from "../src/village-animals.js";
import {
  constructionElements,
  specialistFacilityPlan,
} from "../src/village-architecture.js";
import { namedUuid } from "../src/identity.js";
import { treeWoodYield } from "../src/village-materials.js";
import { createJob, releaseJobReservations } from "../src/job-board.js";
import {
  ensureFoundingSleepingPlaces,
  syncResidentHousing,
} from "../src/village-households.js";
import { ensureVillageFoodSystem } from "../src/village-food.js";
import { animalSpecies } from "../src/village-animal-species.js";
import {
  foundingFacilityPlan,
  updateVillageDevelopment,
} from "../src/village-development.js";
import {
  advanceVillageCivic,
  assessCemeterySite,
  markResidentDead,
  residentCorpse,
  selectVillageCemeterySite,
  villageGrave,
} from "../src/village-civic.js";

const input = {
  requestId: "m11-founding-lab",
  runId: "6f462743-9594-5486-84e7-af4d9fe3212d",
  seed: "founding-lab-1",
  heroName: "Mara",
  heroClass: "fighter",
  form: "hybrid",
  size: "small",
  levels: 3,
  scenario: "founding",
};

function provideAnimalHousing(state, species, housing = "pasture") {
  const enclosure = {
    key: `${species}_test_housing`,
    name: `${species} test housing`,
    housing,
    allowedSpecies: [species],
    x: 60,
    y: 60,
    w: 12,
    h: 10,
    gate: { x: 60, y: 64 },
    capacity: 20,
    capacityUnits: 20,
    fenceMaterial: "timber",
  };
  const site = createFarmsteadPasture(state.id, enclosure);
  state.village.pastures.push(site);
  for (const animal of livingAnimals(state, species))
    animal.homePastureId = site.id;
  return site;
}

const stock = (state, key) =>
  state.village.stockpiles.find((item) => item.key === key);

function emptyFoodReserve(state) {
  const keys = [
    "inn_meals",
    "inn_fish",
    "wild_forage",
    "farm_grain",
    "farm_vegetables",
    "dairy_milk",
    "pasture_meat",
    "farm_eggs",
  ];
  for (const key of keys) stock(state, key).quantity = 0;
}

test("R1 the barn shares a livestock doorway with its fenced pasture", () => {
  const plan = foundingFacilityPlan("farmstead"),
    pasture = plan.enclosures[0],
    access = pasture.barnAccess,
    elements = constructionElements(plan);
  assert.equal(pasture.x, plan.x + plan.w - 1);
  assert.deepEqual(plan.secondaryDoors[0], { ...access, material: "wood" });
  assert.equal(
    elements.some(
      (element) =>
        element.kind === "fence" &&
        element.position.x === access.x &&
        element.position.y === access.y,
    ),
    false,
  );
  assert.ok(
    elements.some(
      (element) =>
        element.kind === "door" &&
        element.position.x === access.x &&
        element.position.y === access.y,
    ),
  );
  assert.equal(pasture.gate.x, pasture.x + pasture.w - 1);
});

function satisfyFounders(state) {
  for (const resident of state.village.npcStates)
    for (const need of Object.keys(resident.life.needs))
      resident.life.needs[need] = 100;
}

test("R1 founding common builders may own ready home and farm projects", () => {
  const state = newRogueRun(input);
  const commonBuilders = state.village.npcStates.filter(
    (resident) =>
      !["farmer", "herder", "reeve", "watchman"].includes(resident.personKey),
  );
  assert.ok(commonBuilders.length >= 4);
  for (const resident of commonBuilders) {
    assert.ok(resident.capabilityTags.includes("build"));
    assert.ok(resident.workPermissions.allowedJobTypes.includes("build_house"));
    assert.ok(
      resident.workPermissions.allowedJobTypes.includes("build_farmstead"),
    );
    assert.ok(resident.skillPriorities.construction >= 1);
  }
});

test("R1 founding adults can reinforce both crop queues during scarcity", () => {
  const state = newRogueRun(input),
    farmer = state.village.npcStates.find(
      (resident) => resident.personKey === "farmer",
    ),
    farmhands = state.village.npcStates.filter(
      (resident) => resident.personKey !== "farmer",
    );
  assert.equal(farmer.skillPriorities.farming, 1);
  assert.ok(
    farmhands.every(
      (resident) =>
        resident.capabilityTags.includes("farm") &&
        resident.workPermissions.allowedJobTypes.includes("grow_grain") &&
        resident.workPermissions.allowedJobTypes.includes("grow_vegetables") &&
        resident.skillPriorities.farming > farmer.skillPriorities.farming,
    ),
  );
});

test("R1 every founder may haul ready survival output", () => {
  const state = newRogueRun(input);
  assert.ok(
    state.village.npcStates.every(
      (resident) =>
        resident.capabilityTags.includes("haul") &&
        resident.workPermissions.allowedJobTypes.includes("haul_stock"),
    ),
  );
});

test("R1 the reeve governs first and joins founding labor between reviews", () => {
  const state = newRogueRun(input),
    reeve = state.village.npcStates.find(
      (resident) => resident.personKey === "reeve",
    );
  assert.ok(reeve.capabilityTags.includes("assign_work"));
  assert.ok(reeve.capabilityTags.includes("build"));
  assert.ok(reeve.capabilityTags.includes("haul"));
  assert.ok(reeve.workPermissions.allowedJobTypes.includes("govern_village"));
  assert.ok(reeve.workPermissions.allowedJobTypes.includes("assist_project"));
  assert.ok(reeve.workPermissions.allowedJobTypes.includes("deliver_goods"));
  assert.ok(
    reeve.skillPriorities.governance < reeve.skillPriorities.construction,
  );
});

test("R1 delivered construction cells accept helpers before bulk input closes", () => {
  const state = newRogueRun(input);
  state.village.facilities.push("lumber_yard");
  stock(state, "lumber_yard_lumber").quantity = 1000;
  satisfyFounders(state);
  applyRogueTurn(state, { kind: "wait" });
  const parent = state.village.jobs.find(
    (job) => job.jobType === "build_farmstead",
  );
  assert.ok(parent);
  parent.production.inputConsumed = false;
  for (const element of parent.plan.constructionWork.elements.slice(0, 8)) {
    element.surveyedById = "test-surveyor";
    element.materialDelivered = true;
    element.materialDeliveredQuantity = element.materialRequired;
  }
  satisfyFounders(state);
  applyRogueTurn(state, { kind: "wait" });
  assert.ok(
    state.village.jobs.some(
      (job) => job.plan?.parentJobId === parent.id && job.plan?.projectAssist,
    ),
  );
});

function clearApprovedFieldTrees(state) {
  const surveys = state.village.development.masterPlan.fieldClearingSurveys;
  for (const survey of surveys) {
    for (const tree of survey.treeCells)
      if (
        !state.village.modifications.some(
          (change) => change.x === tree.x && change.y === tree.y,
        )
      )
        state.village.modifications.push({
          id: `test-clear-${tree.x}-${tree.y}`,
          entityType: "terrain-change",
          kind: "cleared_ground",
          x: tree.x,
          y: tree.y,
          originalTile: "outdoor_tree",
          createdAtTick: state.tick,
        });
    survey.status = "cleared";
  }
}

function establishSeasonalPlanting(state) {
  ensureVillageFoodSystem(state);
  const plot = state.village.cropPlots[0];
  plot.stage = "growing";
  plot.plantedAtTick = state.tick;
}

function placeAssignedWorkers(state, jobTypes) {
  for (const job of state.village.jobs.filter(
    (candidate) =>
      jobTypes.includes(candidate.jobType) &&
      ["reserved", "active", "blocked"].includes(candidate.status) &&
      candidate.assignedActorId &&
      candidate.destination,
  )) {
    const actor = state.village.npcStates.find(
      (resident) => resident.id === job.assignedActorId,
    );
    if (actor) actor.position = { ...job.destination };
  }
}

function releaseActorWork(state, actor) {
  const assigned = state.village.jobs.filter(
    (job) =>
      job.assignedActorId === actor.id &&
      ["reserved", "active"].includes(job.status),
  );
  for (const job of assigned) {
    releaseJobReservations(state, job.id, "test_setup");
    job.status = "available";
    job.assignedActorId = null;
  }
}

function createProjectAssist(state, parent, actor, element) {
  return createJob(state, {
    jobType: "assist_project",
    name: "Raise timber wall section",
    priority: 89,
    targetId: `assist-${element.id}`,
    targetPosition: { ...element.position },
    requiredCapabilities: ["build"],
    progressTotal: element.laborRequired,
    progressUnit: "work_minute",
    plan: {
      template: "assist_project",
      step: "assist",
      projectAssist: true,
      parentJobId: parent.id,
      ownerActorId: actor.id,
      constructionElementKey: element.key,
    },
  }).job;
}

function selfPreemptionFixture() {
  const state = newRogueRun(input);
  applyRogueTurn(state, { kind: "wait" });
  const parent = state.village.jobs.find(
      (job) => job.jobType === "build_lumber_yard",
    ),
    actor = state.village.npcStates.find((resident) =>
      resident.capabilityTags.includes("build"),
    ),
    element = parent.plan.constructionWork.elements[0];
  releaseActorWork(state, actor);
  releaseJobReservations(state, parent.id, "test_setup");
  Object.assign(parent, { status: "available", assignedActorId: null });
  parent.priority = 90;
  parent.production.inputConsumed = true;
  element.materialDelivered = true;
  element.materialDeliveredQuantity = element.materialRequired;
  const assist = createProjectAssist(state, parent, actor, element);
  Object.assign(assist, { status: "active", assignedActorId: actor.id });
  actor.workState = "working";
  element.claimedByAssistJobId = assist.id;
  return { state, parent, assist };
}

test("M-11.1 founding scenario starts ten homeless residents without buildings", () => {
  const state = newRogueRun(input),
    view = rogueUnityView(state);
  assert.equal(state.location, "village");
  assert.equal(state.village.npcStates.length, 10);
  assert.equal(state.village.buildings.length, 0);
  assert.equal(state.village.doors.length, 0);
  assert.equal(state.village.residences.length, 0);
  assert.equal(view.map.landmarks.length, 0);
  assert.ok(
    state.village.npcStates.every(
      (resident) =>
        resident.housingStatus === "homeless" &&
        resident.life.statusTags.includes("homeless"),
    ),
  );
  const bedrolls = state.village.fixtures.filter(
    (fixture) => fixture.temporary && fixture.role === "bed",
  );
  assert.equal(bedrolls.length, 10);
  assert.equal(new Set(bedrolls.map((fixture) => fixture.id)).size, 10);
  assert.ok(
    bedrolls.every(
      (fixture) =>
        fixture.width === 2 &&
        fixture.height === 1 &&
        fixture.width * fixture.height === 2 &&
        fixture.sleepingCapacity === 1 &&
        fixture.shelterClass === "temporary_outdoor" &&
        fixture.buildingId === null,
    ),
  );
  const occupiedCells = bedrolls.flatMap((fixture) =>
    Array.from(
      { length: fixture.width },
      (_, offset) => `${fixture.x + offset},${fixture.y}`,
    ),
  );
  assert.equal(new Set(occupiedCells).size, 20);
  assert.ok(
    state.village.npcStates.every((resident) =>
      bedrolls.some(
        (fixture) => fixture.id === resident.sleepingLocation?.fixtureId,
      ),
    ),
  );
});

test("R1 founders establish fire and fish but cannot hunt without a bow", () => {
  const state = newRogueRun(input);
  applyRogueTurn(state, { kind: "wait" });
  const open = (jobType) =>
    state.village.jobs.find(
      (job) =>
        job.jobType === jobType &&
        !["completed", "cancelled"].includes(job.status),
    );
  assert.ok(open("build_campfire"));
  assert.ok(open("catch_fish"));
  assert.equal(open("hunt_game"), undefined);
  assert.equal(open("build_house"), undefined);
  assert.equal(open("build_farmstead"), undefined);
  assert.equal(open("prepare_meal"), undefined);
});

test("R4 a reusable hunting bow makes the deer hunt ready", () => {
  const state = newRogueRun(input);
  stock(state, "hunting_bows").quantity = 1;
  applyRogueTurn(state, { kind: "wait" });
  const hunt = state.village.jobs.find(
    (job) => job.jobType === "hunt_game" && job.status !== "cancelled",
  );
  assert.ok(hunt);
  assert.equal(hunt.production.inputs[0].stockpileKey, "hunting_bows");
  assert.equal(hunt.production.inputs[0].consume, false);
});

test("R4 loading an unequipped legacy hunt cancels it as not ready", () => {
  const state = newRogueRun(input),
    deer = livingAnimals(state, "deer")[0],
    legacy = createJob(state, {
      jobType: "hunt_game",
      name: "Legacy unequipped hunt",
      targetId: deer.id,
      targetPosition: deer.position,
      plan: { template: "hunt_game" },
    }).job;
  applyRogueTurn(state, { kind: "wait" });
  assert.equal(legacy.status, "cancelled");
  assert.equal(legacy.statusReason, "equipment_requirement_changed");
  assert.equal(
    state.village.jobs.some(
      (job) => job.jobType === "hunt_game" && job.status !== "cancelled",
    ),
    false,
  );
});

test("R1 seasonal farming outranks private housing after the lumber yard", () => {
  const state = newRogueRun(input);
  state.village.facilities.push("lumber_yard");
  stock(state, "lumber_yard_lumber").quantity = 500;
  applyRogueTurn(state, { kind: "wait" });
  assert.equal(state.village.development.activePriority, "food_security");
  assert.ok(
    state.village.jobs.some((job) => job.jobType === "build_farmstead"),
  );
  assert.equal(
    state.village.jobs.some((job) => job.jobType === "build_house"),
    false,
  );
  const housing = state.village.development.priorities.find(
    (priority) => priority.key === "housing",
  );
  assert.deepEqual(housing.blockedBy, ["seasonal_planting"]);
});

test("R1 ready crop work releases a parallel first-home crew", () => {
  const state = newRogueRun(input);
  state.village.facilities.push("lumber_yard");
  stock(state, "lumber_yard_lumber").quantity = 500;
  applyRogueTurn(state, { kind: "wait" });
  ensureVillageFoodSystem(state);
  applyRogueTurn(state, { kind: "wait" });
  applyRogueTurn(state, { kind: "wait" });
  const commission = state.village.development.strategyBoard.commissions.find(
      (candidate) => candidate.projectKey === "housing",
    ),
    house = state.village.jobs.find(
      (job) =>
        job.jobType === "build_house" &&
        !["completed", "cancelled"].includes(job.status),
    ),
    farmer = state.village.npcStates.find(
      (actor) => actor.personKey === "farmer",
    ),
    herder = state.village.npcStates.find(
      (actor) => actor.personKey === "herder",
    );
  assert.equal(state.village.development.activePriority, "food_security");
  assert.equal(commission.status, "active");
  assert.equal(house.plan.parallelFoundingWork, true);
  assert.equal(house.plan.allowedActorIds.includes(farmer.id), true);
  assert.equal(house.plan.allowedActorIds.includes(herder.id), true);
  assert.notEqual(house.assignedActorId, farmer.id);
  stock(state, "lumber_yard_lumber").quantity = 0;
  stock(state, "lumber_camp_logs").quantity = 40;
  applyRogueTurn(state, { kind: "wait" });
  assert.ok(
    state.village.jobs.some(
      (job) =>
        job.jobType === "saw_lumber" &&
        !["completed", "cancelled"].includes(job.status),
    ),
  );
});

test("R1 incremental housing cannot take the farmer from an unfinished farm", () => {
  const state = newRogueRun(input),
    farmer = state.village.npcStates.find(
      (resident) => resident.personKey === "farmer",
    );
  state.village.facilities.push("lumber_yard");
  stock(state, "lumber_yard_lumber").quantity = 500;
  applyRogueTurn(state, { kind: "wait" });
  ensureVillageFoodSystem(state);
  state.village.cropPlots[0].stage = "growing";
  state.village.cropPlots[0].plantedAtTick = state.tick;
  state.village.development.nextResidentNeedsReviewAtTick = state.tick;
  applyRogueTurn(state, { kind: "wait" });
  assert.equal(state.village.development.activePriority, "housing");
  assert.ok(state.village.jobs.some((job) => job.jobType === "build_house"));
  const farmJob = state.village.jobs.find(
      (job) => job.jobType === "build_farmstead",
    ),
    houseJob = state.village.jobs.find((job) => job.jobType === "build_house");
  assert.ok(farmJob);
  assert.ok(houseJob);
  assert.equal(
    state.village.jobs.some(
      (job) =>
        job.plan?.constructionDelivery &&
        job.plan.parentJobId === houseJob.id &&
        !["completed", "cancelled"].includes(job.status),
    ),
    false,
  );
  assert.equal(
    state.village.jobs.some(
      (job) =>
        job.jobType === "build_house" && job.assignedActorId === farmer.id,
    ),
    false,
  );
});

test("R1 planted fields release incremental housing without stopping farm work", () => {
  const state = newRogueRun(input);
  state.village.facilities.push("lumber_yard", "farmstead");
  stock(state, "lumber_yard_lumber").quantity = 500;
  ensureVillageFoodSystem(state);
  state.village.cropPlots[0].stage = "growing";
  state.village.cropPlots[0].plantedAtTick = state.tick;
  applyRogueTurn(state, { kind: "wait" });
  assert.equal(state.village.development.activePriority, "housing");
  assert.ok(state.village.jobs.some((job) => job.jobType === "build_house"));
  assert.ok(
    state.village.jobs.some((job) => job.jobType === "grow_vegetables"),
  );
});

test("R1 a harvested crop cycle keeps housing released between sowings", () => {
  const state = newRogueRun(input);
  state.village.facilities.push("lumber_yard", "farmstead");
  stock(state, "lumber_yard_lumber").quantity = 500;
  ensureVillageFoodSystem(state);
  for (const plot of state.village.cropPlots) {
    plot.stage = "fallow";
    plot.cycle = 1;
  }
  stock(state, "farm_grain").quantity = 20;
  stock(state, "farm_vegetables").quantity = 20;

  applyRogueTurn(state, { kind: "wait" });

  assert.equal(state.village.development.activePriority, "housing");
  assert.ok(state.village.jobs.some((job) => job.jobType === "build_house"));
  assert.ok(
    state.village.jobs.some((job) =>
      ["grow_grain", "grow_vegetables"].includes(job.jobType),
    ),
  );
});

test("R1 stale construction interruption releases suspended farm work", () => {
  const state = newRogueRun(input);
  state.village.facilities.push("lumber_yard", "farmstead");
  stock(state, "lumber_yard_lumber").quantity = 500;
  ensureVillageFoodSystem(state);
  for (const plot of state.village.cropPlots) plot.cycle = 1;
  stock(state, "farm_grain").quantity = 20;
  stock(state, "farm_vegetables").quantity = 20;
  const farmer = state.village.npcStates.find(
    (resident) => resident.personKey === "farmer",
  );
  applyRogueTurn(state, { kind: "wait" });
  const farmJob = state.village.jobs.find((job) =>
    ["grow_grain", "grow_vegetables"].includes(job.jobType),
  );
  const interrupter = createJob(state, {
    jobType: "inspect_object",
    name: "Dormant construction order",
    priority: 1,
    targetId: farmJob.targetId,
    targetPosition: { ...farmJob.targetPosition },
    requiredCapabilities: ["unavailable_test_capability"],
    progressTotal: 1,
    progressUnit: "work_minute",
    plan: { ownerActorId: "missing-test-actor" },
  }).job;
  releaseJobReservations(state, farmJob.id, "test_setup");
  Object.assign(farmJob, {
    status: "suspended",
    assignedActorId: farmer.id,
    suspendedByJobId: interrupter.id,
  });
  Object.assign(interrupter, { status: "available", assignedActorId: null });
  farmer.workState = "available";

  applyRogueTurn(state, { kind: "wait" });

  assert.notEqual(farmJob.status, "suspended");
  assert.equal(farmJob.suspendedByJobId, null);
});

test("R1 suspended work waits while its valid interrupter remains open", () => {
  const state = newRogueRun(input);
  state.village.facilities.push("lumber_yard", "farmstead");
  stock(state, "lumber_yard_lumber").quantity = 500;
  ensureVillageFoodSystem(state);
  for (const plot of state.village.cropPlots) plot.cycle = 1;
  stock(state, "farm_grain").quantity = 20;
  stock(state, "farm_vegetables").quantity = 20;
  applyRogueTurn(state, { kind: "wait" });
  const farmer = state.village.npcStates.find(
      (resident) => resident.personKey === "farmer",
    ),
    current = state.village.jobs.find((job) =>
      ["grow_grain", "grow_vegetables"].includes(job.jobType),
    ),
    interrupter = createJob(state, {
      jobType: "inspect_object",
      name: "Urgent valid interruption",
      priority: 200,
      targetId: current.targetId,
      targetPosition: { ...current.targetPosition },
      requiredCapabilities: ["inspect"],
      progressTotal: 1,
      progressUnit: "work_minute",
      plan: { ownerActorId: farmer.id },
    }).job;
  releaseJobReservations(state, current.id, "test_setup");
  Object.assign(current, {
    status: "suspended",
    assignedActorId: farmer.id,
    suspendedByJobId: interrupter.id,
  });
  farmer.workState = "available";
  const { events } = applyRogueTurn(state, { kind: "wait" });
  assert.equal(current.status, "suspended");
  assert.equal(current.suspendedByJobId, interrupter.id);
  assert.equal(
    events.some(
      (event) => event.type === "job_resumed" && event.jobId === current.id,
    ),
    false,
  );
});

test("R5 unclaimed shared work cannot strand a suspended specialist", () => {
  const state = newRogueRun(input);
  state.location = "village";
  state.village.facilities.push("lumber_yard", "farmstead");
  ensureVillageFoodSystem(state);
  for (const resident of state.village.npcStates)
    for (const need of Object.keys(resident.life.needs))
      resident.life.needs[need] = 100;
  Object.assign(state.village.clock, { hour: 9, block: "work" });
  applyRogueTurn(state, { kind: "wait" });
  const fisher = state.village.npcStates.find(
      (resident) => resident.personKey === "fisher",
    ),
    current = state.village.jobs.find((job) => job.jobType === "catch_fish"),
    interrupter = createJob(state, {
      jobType: "haul_stock",
      name: "Open shared haul",
      targetId: "store",
      targetPosition: { x: 2, y: 2 },
      requiredCapabilities: ["haul"],
    }).job;
  releaseJobReservations(state, current.id, "test_setup");
  Object.assign(current, {
    status: "suspended",
    assignedActorId: fisher.id,
    suspendedByJobId: interrupter.id,
  });
  interrupter.nextAssignmentAtTick = state.tick + 100;
  fisher.workState = "available";

  const { events } = applyRogueTurn(state, { kind: "wait" });

  assert.ok(["reserved", "active"].includes(current.status));
  assert.equal(current.suspendedByJobId, null);
  assert.ok(
    events.some(
      (event) => event.type === "job_resumed" && event.jobId === current.id,
    ),
  );
});

test("R5 a personal survival need returns shared work to its queue", () => {
  const state = newRogueRun(input),
    starving = state.village.npcStates.at(-1);
  satisfyFounders(state);
  const meals = stock(state, "inn_meals");
  meals.quantity = 1;
  starving.life.needs.hunger = 0;
  const target = villageWorldObjectAt(state, -14, 18, false);
  const shared = createJob(state, {
    jobType: "inspect_object",
    name: "Shared inspection",
    priority: 10,
    targetId: target.id,
    targetPosition: { x: -14, y: 18 },
    requiredCapabilities: ["inspect"],
  }).job;
  Object.assign(shared, { status: "active", assignedActorId: starving.id });
  starving.workState = "working";

  applyRogueTurn(state, { kind: "wait" });

  const meal = state.village.jobs.find(
    (job) =>
      job.jobType === "eat_meal" && job.plan.ownerActorId === starving.id,
  );
  assert.equal(shared.status, "available");
  assert.equal(shared.assignedActorId, null);
  assert.ok(["reserved", "active"].includes(meal.status));
});

test("R4 zero food keeps a three-person founding survival crew awake", () => {
  const state = newRogueRun(input);
  state.village.facilities.push("survival_camp", "farmstead");
  ensureVillageFoodSystem(state);
  emptyFoodReserve(state);
  stock(state, "river_catch").quantity = 1;
  for (const resident of state.village.npcStates)
    Object.assign(resident.life.needs, {
      hunger: 50,
      fatigue: 35,
      safety: 100,
      social: 100,
      morale: 100,
    });
  for (let turn = 0; turn < 12; turn += 1)
    applyRogueTurn(state, { kind: "wait" });
  const crew = new Set(
    state.village.jobs
      .filter(
        (job) =>
          job.plan?.emergencyFoodDuty &&
          ["reserved", "active"].includes(job.status),
      )
      .map((job) => job.assignedActorId),
  );
  assert.ok(
    crew.size >= 3,
    `expected 3 emergency workers, received ${crew.size}`,
  );
});

test("R4 recoverable fatigue cannot thrash active emergency food work", () => {
  const state = newRogueRun(input),
    worker = state.village.npcStates.find(
      (actor) => actor.personKey === "porter",
    ),
    target = villageWorldObjectAt(state, -14, 18, false);
  satisfyFounders(state);
  emptyFoodReserve(state);
  worker.life.needs.fatigue = 35;
  const duty = createJob(state, {
    jobType: "inspect_object",
    name: "Protect emergency food throughput",
    priority: 150,
    targetId: target.id,
    targetPosition: { x: -14, y: 18 },
    requiredCapabilities: ["inspect"],
    plan: { emergencyFoodDuty: true },
  }).job;
  Object.assign(duty, { status: "active", assignedActorId: worker.id });
  worker.workState = "working";

  applyRogueTurn(state, { kind: "wait" });

  assert.ok(["reserved", "active", "completed"].includes(duty.status));
  assert.notEqual(duty.statusReason, "personal_survival_need");
});

test("R4 sole emergency cook wakes after the minimum crew is staffed", () => {
  const state = newRogueRun(input),
    cook = state.village.npcStates.find(
      (actor) => actor.personKey === "innkeeper",
    ),
    target = villageWorldObjectAt(state, -14, 18, false);
  satisfyFounders(state);
  emptyFoodReserve(state);
  cook.life.needs.fatigue = 35;
  const cooking = createJob(state, {
    jobType: "prepare_meal",
    name: "Cook the landed emergency food",
    priority: 150,
    targetId: target.id,
    targetPosition: { x: -14, y: 18 },
    requiredCapabilities: ["cook"],
    plan: { emergencyFoodDuty: true, skills: ["cooking"] },
  }).job;
  for (const worker of state.village.npcStates.slice(0, 3)) {
    const duty = createJob(state, {
      jobType: `test_food_duty_${worker.personKey}`,
      name: "Maintain emergency food throughput",
      priority: 150,
      targetId: target.id,
      targetPosition: { x: -14, y: 18 },
      plan: { emergencyFoodDuty: true },
    }).job;
    Object.assign(duty, { status: "active", assignedActorId: worker.id });
    worker.workState = "working";
  }
  applyRogueTurn(state, { kind: "wait" });
  assert.ok(["reserved", "active", "completed"].includes(cooking.status));
  assert.equal(cooking.assignedActorId, cook.id);
});

test("R4 personal survival work cannot block another resident's skill queue", () => {
  const state = newRogueRun(input),
    porter = state.village.npcStates.find(
      (resident) => resident.personKey === "porter",
    ),
    watchman = state.village.npcStates.find(
      (resident) => resident.personKey === "watchman",
    );
  satisfyFounders(state);
  state.village.clock.hour = 8;
  state.village.clock.block = "work";
  watchman.workState = "working";
  createJob(state, {
    jobType: "seek_safety",
    name: "Personal safety test",
    priority: 2000,
    targetId: watchman.id,
    targetPosition: { ...watchman.position },
    requiredCapabilities: ["seek_safety"],
    plan: { lifeJob: true, need: "safety", ownerActorId: watchman.id },
  });
  const ready = createJob(state, {
    jobType: "haul_stock",
    name: "Ready porter work",
    priority: 1900,
    targetId: porter.id,
    targetPosition: { ...porter.position },
    requiredCapabilities: ["haul"],
    plan: { skills: ["logistics"], ownerActorId: porter.id },
  }).job;

  applyRogueTurn(state, { kind: "wait" });

  assert.ok(["reserved", "active", "completed"].includes(ready.status));
  assert.equal(ready.assignedActorId, porter.id);
});

test("R4 a ready construction cell passes to an idle common builder", () => {
  const state = newRogueRun(input);
  satisfyFounders(state);
  state.village.clock.hour = 8;
  state.village.clock.block = "work";
  applyRogueTurn(state, { kind: "wait" });
  const parent = state.village.jobs.find(
      (job) => job.jobType === "build_lumber_yard",
    ),
    preferred = state.village.npcStates.find(
      (resident) => resident.personKey === "farmer",
    ),
    element = parent.plan.constructionWork.elements[0];
  state.village.jobs = [parent];
  state.village.reservations = [];
  for (const resident of state.village.npcStates)
    resident.workState = "available";
  Object.assign(parent, { status: "available", assignedActorId: null });
  parent.plan.budgetBlocked = true;
  element.materialDelivered = true;
  element.materialDeliveredQuantity = element.materialRequired;
  const assist = createProjectAssist(state, parent, preferred, element);
  assist.priority = 2000;
  preferred.workState = "working";

  applyRogueTurn(state, { kind: "wait" });

  assert.ok(["reserved", "active", "completed"].includes(assist.status));
  assert.notEqual(assist.assignedActorId, preferred.id);
  assert.equal(assist.plan.ownerActorId, undefined);
});

test("R1 a legacy shifted farm fence blueprint realigns to surveyed fields", () => {
  const state = newRogueRun(input);
  state.village.facilities.push("lumber_yard");
  stock(state, "lumber_yard_lumber").quantity = 500;
  applyRogueTurn(state, { kind: "wait" });
  const farmJob = state.village.jobs.find(
      (job) => job.jobType === "build_farmstead",
    ),
    fields = farmJob.plan.construction.enclosures.filter(
      (enclosure) => enclosure.purpose === "field",
    ),
    fieldKeys = new Set(fields.map((field) => field.key));
  for (const field of fields) {
    field.x -= 7;
    field.y += 1;
    field.gate.x -= 7;
    field.gate.y += 1;
  }
  for (const element of farmJob.plan.constructionWork.elements)
    if (fieldKeys.has(element.pastureKey)) {
      element.position.x -= 7;
      element.position.y += 1;
    }

  applyRogueTurn(state, { kind: "wait" });

  const boundaries = state.village.development.masterPlan.fieldBoundaries,
    repairedFields = farmJob.plan.construction.enclosures.filter(
      (enclosure) => enclosure.purpose === "field",
    );
  for (const field of repairedFields)
    assert.deepEqual(
      field,
      boundaries.find((boundary) => boundary.key === field.key),
    );
});

test("R1 founding crop plots fill the protected fence interior", () => {
  const state = newRogueRun(input);
  state.village.facilities.push("farmstead");
  ensureVillageFoodSystem(state);
  for (const plot of state.village.cropPlots) {
    const boundary = state.village.development.masterPlan.fieldBoundaries.find(
      (candidate) => candidate.cropKind === plot.cropKind,
    );
    assert.deepEqual(plot.area, {
      x: boundary.x + 1,
      y: boundary.y + 1,
      width: boundary.w - 2,
      height: boundary.h - 2,
    });
  }
});

test("R4 every open job appears under its skill with resource readiness", () => {
  const state = newRogueRun(input),
    fish = stock(state, "inn_fish"),
    hearth = villageWorldObjectAt(state, -14, 18, false);
  fish.quantity = 0;
  const dependent = createJob(state, {
      jobType: "test_cook",
      name: "Test dependent meal",
      targetId: hearth.id,
      targetPosition: { x: -14, y: 18 },
      plan: { skills: ["cooking"] },
      production: {
        inputs: [
          {
            stockpileId: fish.id,
            quantity: 1,
            carriedQuantity: 0,
            requiresPickup: true,
            consume: true,
          },
        ],
        output: null,
      },
    }).job,
    supplier = createJob(state, {
      jobType: "test_fish_supply",
      name: "Test fish supply",
      targetId: "test-river",
      targetPosition: { x: 0, y: 18 },
      plan: { skills: ["fishing"] },
      production: { inputs: [], output: { stockpileId: fish.id, quantity: 1 } },
    }).job;
  applyRogueTurn(state, { kind: "wait" });
  const queued = state.village.skillWorkQueues.cooking.jobs.find(
      (entry) => entry.jobId === dependent.id,
    ),
    survey = Object.values(state.village.skillWorkQueues)
      .flatMap((queue) => queue.jobs)
      .find((entry) => entry.jobType === "survey_construction");
  assert.equal(queued.readiness, "blocked");
  assert.equal(queued.blocker, "production_input_missing");
  assert.ok(queued.dependencyJobIds.includes(supplier.id));
  assert.deepEqual(queued.resourceNeeds, [
    {
      itemKind: "raw_fish",
      required: 1,
      delivered: 0,
      available: 0,
      missing: 1,
      dependencyJobIds: [supplier.id],
    },
  ]);
  assert.notEqual(survey?.blocker, "production_input_missing");
});

test("R1 an unbuilt pasture moves away from a house circulation apron", () => {
  const state = newRogueRun(input);
  state.village.facilities.push("lumber_yard");
  stock(state, "lumber_yard_lumber").quantity = 500;
  applyRogueTurn(state, { kind: "wait" });
  const farmJob = state.village.jobs.find(
      (job) => job.jobType === "build_farmstead",
    ),
    pasture = farmJob.plan.construction.enclosures.find(
      (enclosure) => !enclosure.purpose,
    ),
    oldPasture = { ...pasture, gate: { ...pasture.gate } },
    house = {
      key: "founder_house_brand",
      x: -22,
      y: 35,
      w: 10,
      h: 8,
      door: { x: -17, y: 35 },
    };
  Object.assign(pasture, { x: -28, y: 25 });
  Object.assign(pasture.gate, { x: -28, y: 29 });
  for (const element of farmJob.plan.constructionWork.elements)
    if (element.pastureKey === pasture.key) {
      element.position.x += pasture.x - oldPasture.x;
      element.position.y += pasture.y - oldPasture.y;
    }
  state.village.development.constructionSites.push(house);

  const outcome = applyRogueTurn(state, { kind: "wait" }),
    repairedPasture = farmJob.plan.construction.enclosures.find(
      (enclosure) => !enclosure.purpose,
    );

  assert.equal(
    repairedPasture.y + repairedPasture.h - 1 === house.y - 1 &&
      house.door.x >= repairedPasture.x &&
      house.door.x < repairedPasture.x + repairedPasture.w,
    false,
  );
  assert.ok(
    outcome.events.some(
      (event) => event.type === "farm_circulation_plan_repaired",
    ),
  );
  assert.notEqual(farmJob.status, "blocked");
  assert.equal(farmJob.blockingReason, null);
});

test("R1 founders cook caught fish at the campfire instead of eating it raw", () => {
  const state = newRogueRun(input),
    hungry = state.village.npcStates[0];
  state.village.facilities.push("survival_camp");
  stock(state, "inn_fish").quantity = 1;
  stock(state, "inn_meals").quantity = 0;
  satisfyFounders(state);
  hungry.life.needs.hunger = 1;
  applyRogueTurn(state, { kind: "wait" });
  const cooking = state.village.jobs.find(
      (job) =>
        job.jobType === "prepare_meal" &&
        !["completed", "cancelled"].includes(job.status),
    ),
    eating = state.village.jobs.find(
      (job) =>
        job.jobType === "eat_meal" && job.plan.ownerActorId === hungry.id,
    );
  assert.ok(cooking);
  assert.deepEqual(cooking.targetPosition, { x: -14, y: 18 });
  assert.equal(eating, undefined);
  assert.equal(stock(state, "inn_fish").quantity, 1);
});

test("R1 critical hunger interrupts lumber work for emergency cooking", () => {
  const state = newRogueRun(input),
    hungry = state.village.npcStates.find(
      (resident) => resident.personKey === "farmer",
    ),
    cook = state.village.npcStates.find(
      (resident) => resident.personKey === "innkeeper",
    );
  state.village.facilities.push("survival_camp", "lumber_yard", "farmstead");
  establishSeasonalPlanting(state);
  satisfyFounders(state);
  const hearth = villageWorldObjectAt(state, -14, 18, false),
    saw = createJob(state, {
      jobType: "saw_lumber",
      name: "Saw logs into building lumber",
      priority: 60,
      targetId: hearth.id,
      targetPosition: { x: -14, y: 18 },
      requiredCapabilities: ["craft"],
      plan: { skills: ["crafting"] },
    }).job;
  Object.assign(saw, { status: "active", assignedActorId: cook.id });
  cook.workState = "working";
  stock(state, "inn_fish").quantity = 6;
  stock(state, "inn_meals").quantity = 0;
  hungry.life.needs.hunger = 0;
  Object.assign(state.village.clock, { hour: 21, minute: 59, second: 24 });
  applyRogueTurn(state, { kind: "wait" });
  const cooking = state.village.jobs.find(
    (job) =>
      job.jobType === "prepare_meal" &&
      !["completed", "cancelled"].includes(job.status),
  );
  assert.ok(cooking.plan.emergencyFoodDuty);
  assert.equal(cooking.assignedActorId, cook.id);
  assert.ok(["reserved", "active"].includes(cooking.status));
  assert.equal(state.village.clock.block, "rest");
  assert.ok(["available", "suspended", "cancelled"].includes(saw.status));
  assert.equal(cook.carriedItem?.itemKind === "crosscut_saw", false);
});

test("R1 communal provisions feed multiple hungry founders concurrently", () => {
  const state = newRogueRun(input),
    hungry = state.village.npcStates.slice(0, 2);
  satisfyFounders(state);
  stock(state, "inn_meals").quantity = 10;
  for (const resident of hungry) resident.life.needs.hunger = 1;
  for (let turn = 0; turn < 6; turn += 1)
    applyRogueTurn(state, { kind: "wait" });
  const meals = state.village.jobs.filter(
    (job) =>
      job.jobType === "eat_meal" &&
      hungry.some((resident) => resident.id === job.plan.ownerActorId),
  );
  assert.equal(meals.length, 2);
  assert.ok(
    meals.every((job) =>
      ["reserved", "active", "completed"].includes(job.status),
    ),
    JSON.stringify(
      meals.map(({ status, blockingReason }) => ({ status, blockingReason })),
    ),
  );
  assert.equal(new Set(meals.map((job) => job.assignedActorId)).size, 2);
});

test("R1 the scarcest meal goes to the founder in greatest danger", () => {
  const state = newRogueRun(input),
    earlier = state.village.npcStates[0],
    starving = state.village.npcStates.at(-1);
  satisfyFounders(state);
  stock(state, "inn_meals").quantity = 1;
  earlier.life.needs.hunger = 20;
  starving.life.needs.hunger = 0;
  applyRogueTurn(state, { kind: "wait" });
  const meal = state.village.jobs.find(
    (job) => job.jobType === "eat_meal" && job.status !== "cancelled",
  );
  assert.equal(meal.plan.ownerActorId, starving.id);
  assert.ok(["reserved", "active"].includes(meal.status));
  assert.equal(meal.assignedActorId, starving.id);
});

test("R1 urgent eating outranks collecting more emergency food", () => {
  const state = newRogueRun(input),
    starving = state.village.npcStates.at(-1);
  satisfyFounders(state);
  emptyFoodReserve(state);
  stock(state, "inn_meals").quantity = 1;
  stock(state, "river_catch").quantity = 1;
  starving.life.needs.hunger = 0;
  applyRogueTurn(state, { kind: "wait" });
  const meal = state.village.jobs.find(
    (job) =>
      job.jobType === "eat_meal" && job.plan.ownerActorId === starving.id,
  );
  assert.ok(meal);
  assert.ok(["reserved", "active"].includes(meal.status));
  assert.equal(meal.assignedActorId, starving.id);
});

test("R1 fresh milk is emergency food when meals and forage are gone", () => {
  const state = newRogueRun(input),
    starving = state.village.npcStates.at(-1);
  satisfyFounders(state);
  stock(state, "inn_meals").quantity = 0;
  stock(state, "wild_forage").quantity = 0;
  stock(state, "dairy_milk").quantity = 1;
  starving.life.needs.hunger = 0;
  applyRogueTurn(state, { kind: "wait" });
  const meal = state.village.jobs.find(
    (job) =>
      job.jobType === "eat_meal" && job.plan.ownerActorId === starving.id,
  );
  assert.ok(meal);
  assert.equal(meal.plan.foodStockpileKey, "dairy_milk");
  assert.equal(meal.name, "Drink emergency fresh milk");
  assert.equal(meal.plan.needGainMultiplier, 0.5);
});

test("R2 a homeless founder can sleep in an assigned physical bedroll", () => {
  const state = newRogueRun(input),
    resident = state.village.npcStates[0];
  satisfyFounders(state);
  resident.life.needs.fatigue = 0;
  applyRogueTurn(state, { kind: "wait" });
  const job = state.village.jobs.find(
      (candidate) =>
        candidate.jobType === "sleep" &&
        candidate.plan.ownerActorId === resident.id &&
        candidate.status !== "cancelled",
    ),
    fixture = state.village.fixtures.find(
      (candidate) => candidate.id === resident.sleepingLocation.fixtureId,
    );
  assert.ok(job);
  assert.ok(fixture);
  assert.equal(fixture.temporary, true);
  assert.equal(fixture.providesShelter, true);
  assert.deepEqual(
    { width: fixture.width, height: fixture.height },
    { width: 2, height: 1 },
  );
  assert.equal(job.targetId, fixture.id);
  assert.deepEqual(job.targetPosition, { x: fixture.x + 1, y: fixture.y });
  assert.equal(
    villageWorldObjectAt(state, fixture.x, fixture.y).objectKind,
    "bed",
  );
  assert.equal(
    villageWorldObjectAt(state, fixture.x + 1, fixture.y).id,
    fixture.id,
  );
  assert.equal(resident.housingStatus, "homeless");
});

test("R2 the mayor retires only bedrolls replaced by permanent beds", () => {
  const state = newRogueRun(input),
    household = state.village.households.find(
      (entry) => entry.key === "farmer",
    ),
    buildingId = "completed-family-home",
    events = [];
  household.memberIds.forEach((residentId, index) =>
    state.village.fixtures.push({
      id: `permanent-bed-${index}`,
      role: "bed",
      name: `Permanent bed ${index + 1}`,
      temporary: false,
      buildingId,
      x: index * 2,
      y: 30,
      width: 1,
      height: 2,
      sleepingCapacity: 1,
    }),
  );
  state.village.residences.push({
    id: "family-residence",
    buildingId,
    plannedHouseholdId: household.id,
    status: "complete",
    habitable: true,
    residentCapacity: 3,
    occupantIds: [],
    householdIds: [],
  });
  syncResidentHousing(state);
  ensureFoundingSleepingPlaces(state, events);
  const bedrolls = state.village.fixtures.filter(
      (fixture) => fixture.bedType === "bedroll",
    ),
    retired = events.filter((event) => event.type === "bedroll_retired"),
    reeve = state.village.npcStates.find(
      (resident) => resident.personKey === "reeve",
    );
  assert.equal(bedrolls.length, 7);
  assert.equal(retired.length, 3);
  assert.ok(retired.every((event) => event.decidedByActorId === reeve.id));
  assert.ok(
    household.memberIds.every(
      (residentId) =>
        !bedrolls.some((bedroll) => bedroll.assignedActorId === residentId),
    ),
  );
  assert.deepEqual(state.village.sleepingPlaceInventory, {
    updatedAtTick: state.tick,
    permanentBeds: 3,
    assignedPermanentBeds: 3,
    bedrolls: 7,
    assignedBedrolls: 7,
    homelessResidents: 7,
    retiredBedrolls: 3,
  });
  ensureFoundingSleepingPlaces(state, events);
  assert.equal(
    events.filter((event) => event.type === "bedroll_retired").length,
    3,
  );
});

test("R1 homeless founders move their bedrolls into a completed workshop", () => {
  const state = newRogueRun(input),
    workshop = {
      id: "61f9b0a7-acde-5e2a-8a25-66764ca17565",
      key: "lumber_yard",
      name: "Founders' lumber workshop",
      x: -34,
      y: 13,
      w: 10,
      h: 9,
      status: "complete",
      roofed: true,
      door: { x: -29, y: 13, material: "wood" },
    };
  state.village.buildings.push(workshop);
  ensureFoundingSleepingPlaces(state);
  const bedrolls = state.village.fixtures.filter(
    (fixture) => fixture.bedType === "bedroll",
  );
  assert.equal(bedrolls.length, 10);
  assert.ok(
    bedrolls.every(
      (fixture) =>
        fixture.buildingId === workshop.id &&
        fixture.shelterClass === "emergency_workshop" &&
        fixture.x > workshop.x &&
        fixture.x + fixture.width <= workshop.x + workshop.w - 1 &&
        fixture.y > workshop.y &&
        fixture.y < workshop.y + workshop.h - 1,
    ),
  );
});

test("R1 moving a bedroll retargets an existing sleep order", () => {
  const state = newRogueRun(input),
    resident = state.village.npcStates[0],
    fixture = state.village.fixtures.find(
      (candidate) => candidate.id === resident.sleepingLocation.fixtureId,
    ),
    job = state.village.jobs.find(
      (candidate) => candidate.targetId === fixture.id,
    ) ?? {
      id: "sleep-order",
      jobType: "sleep",
      name: "Sleep in the founding bedroll",
      scope: "village",
      priority: 100,
      targetId: fixture.id,
      targetPosition: { x: fixture.x + 1, y: fixture.y },
      requiredCapabilities: ["sleep"],
      progress: { completed: 0, total: 480, unit: "life_minute" },
      reason: "fatigue_need",
      status: "blocked",
      blockingReason: "target_missing",
      assignedActorId: null,
      nextRetryAtTick: null,
      updatedAtTick: state.tick,
      plan: {
        lifeJob: true,
        need: "fatigue",
        ownerActorId: resident.id,
        cachedPath: [{ x: fixture.x, y: fixture.y }],
      },
    };
  if (!state.village.jobs.includes(job)) state.village.jobs.push(job);
  state.village.buildings.push({
    id: "workshop",
    key: "lumber_yard",
    x: -34,
    y: 13,
    w: 10,
    h: 9,
    status: "complete",
    roofed: true,
    door: { x: -29, y: 13, material: "wood" },
    secondaryDoors: [],
  });
  ensureFoundingSleepingPlaces(state);
  assert.deepEqual(job.targetPosition, { x: -32, y: 18 });
  assert.equal(job.plan.targetRefreshRequired, true);
  assert.equal(job.plan.cachedPath, undefined);
  applyRogueTurn(state, { kind: "wait" });
  assert.equal(
    job.targetId,
    villageWorldObjectAt(
      state,
      job.targetPosition.x,
      job.targetPosition.y,
      false,
    ).id,
  );
  assert.notEqual(job.blockingReason, "target_missing");
  assert.equal(job.plan.targetRefreshRequired, undefined);
});

test("R6 completed structure parts identify their building in the inspector", () => {
  const state = newRogueRun(input),
    building = {
      id: "ab877dea-2668-55fc-8d5a-c98973987043",
      key: "lumber_yard",
      name: "Founders' lumber workshop",
      x: -34,
      y: 13,
      w: 10,
      h: 9,
      status: "complete",
      roofed: true,
      wallMaterial: "timber",
      door: { x: -29, y: 13, material: "wood" },
      primitiveBacked: true,
    };
  state.village.buildings.push(building);
  state.village.constructionPrimitives.push({
    id: "8434844d-8018-56f4-885b-faf3d8ac0cba",
    projectId: "776318ae-ae21-5dd1-80d7-65344549dc6e",
    projectKey: building.key,
    kind: "wall",
    material: "timber",
    position: { x: building.x, y: building.y },
    width: 1,
    height: 1,
  });
  const object = villageWorldObjectAt(state, building.x, building.y, false);
  assert.equal(object.name, "Founders' lumber workshop — wall");
  assert.match(object.description, /belongs to Founders' lumber workshop/);
});

test("R6 Unity lies residents down only after they reach their bed", () => {
  const state = newRogueRun(input),
    resident = state.village.npcStates[0];
  resident.currentAction = "Sleep in the founding bedroll";
  resident.workState = "working";
  let cell = rogueUnityView(state).map.cells.find(
    (candidate) => candidate.entityId === resident.id,
  );
  assert.notEqual(cell.entityPose, "sleeping");
  const fixture = state.village.fixtures.find(
    (candidate) => candidate.id === resident.sleepingLocation.fixtureId,
  );
  resident.position = {
    x: fixture.x + fixture.width - 1,
    y: fixture.y + fixture.height - 1,
  };
  cell = rogueUnityView(state).map.cells.find(
    (candidate) => candidate.entityId === resident.id,
  );
  assert.equal(cell.entityPose, "sleeping");
  assert.equal(cell.entitySleepWidth, 2);
  assert.equal(cell.entitySleepHeight, 1);
  const bedCell = rogueUnityView(state).map.cells.find(
    (candidate) => candidate.objectId === fixture.id,
  );
  assert.equal(bedCell.variant, "bedroll");
});

test("R1 founding architect records and avoids a blocked preferred site", () => {
  const state = newRogueRun(input);
  state.village.constructionPrimitives.push({
    id: "9d406b0e-e722-5f63-82e7-77b12208c001",
    definitionId: "4cb8bb89-54c9-5362-b58b-f311c37c2014",
    entityType: "wall",
    projectId: "9d406b0e-e722-5f63-82e7-77b12208c002",
    projectKey: "old_ruin",
    kind: "wall",
    material: "stone",
    state: "complete",
    position: { x: -34, y: 13 },
    width: 1,
    height: 1,
  });
  const { events } = applyRogueTurn(state, { kind: "wait" }),
    site = state.village.development.constructionSites.find(
      (candidate) => candidate.key === "lumber_yard",
    ),
    decision = state.village.development.siteDecisions.find(
      (candidate) => candidate.siteKey === "lumber_yard",
    );
  assert.ok(site);
  assert.notDeepEqual({ x: site.x, y: site.y }, { x: -34, y: 13 });
  assert.ok(decision.rejectedCandidates > 0);
  assert.ok(decision.rejectedConflicts.village_building > 0);
  assert.ok(
    events.some(
      (event) =>
        event.type === "construction_site_selected" &&
        event.siteKey === "lumber_yard",
    ),
  );
  const restored = parseRogueState(serializeRogueState(state));
  assert.deepEqual(
    restored.village.development.constructionSites,
    state.village.development.constructionSites,
  );
  assert.deepEqual(
    restored.village.development.siteDecisions,
    state.village.development.siteDecisions,
  );
});

test("R8 loaded town replans a field that blocks its active farmstead", () => {
  let state = newRogueRun(input);
  const boundary = state.village.development.masterPlan.fieldBoundaries[0],
    original = { x: boundary.x, y: boundary.y },
    order = {
      id: "field-replan-order",
      status: "active",
      priorityKey: "food_security",
      jobTypes: ["build_farmstead"],
      assignments: {
        crewActorIds: state.village.npcStates.map(({ id }) => id),
      },
    };
  state.village.facilities.push("lumber_yard");
  state.village.development.constructionSites.push({
    key: "lumber_yard",
    x: boundary.x + boundary.w,
    y: boundary.y - 6,
    w: 10,
    h: 9,
    door: { x: boundary.x + boundary.w + 5, y: boundary.y - 6 },
  });
  state.village.development.workOrders.push(order);
  state.village.development.activeOrderId = order.id;
  state.village.development.activePriority = "food_security";
  state.village.development.nextResidentNeedsReviewAtTick = 10_000;
  state = parseRogueState(serializeRogueState(state));
  const { events } = applyRogueTurn(state, { kind: "wait" }),
    moved = state.village.development.masterPlan.fieldBoundaries[0],
    survey = state.village.development.masterPlan.fieldClearingSurveys[0];
  assert.notDeepEqual({ x: moved.x, y: moved.y }, original);
  assert.equal(survey.revisions.length, 1);
  assert.ok(events.some((event) => event.type === "founding_field_replanned"));
  assert.ok(
    state.village.jobs.some((job) => job.jobType === "build_farmstead"),
  );
  const farmJob = state.village.jobs.find(
      (job) => job.jobType === "build_farmstead",
    ),
    farmSite = state.village.development.constructionSites.find(
      (site) => site.key === "farmstead",
    ),
    accepted = structuredClone(moved),
    corrupt = { ...structuredClone(moved), y: -500 };
  corrupt.gate.y = -497;
  survey.revisions = Array.from({ length: 9 }, (_, index) => ({
    boundary: structuredClone(accepted),
    supersededAtTick: farmJob.createdAtTick + index + 1,
  }));
  state.village.development.masterPlan.fieldBoundaries[0] = corrupt;
  farmJob.plan.construction.enclosures[1] = structuredClone(corrupt);
  farmSite.enclosures[1] = structuredClone(corrupt);
  for (const element of farmJob.plan.constructionWork.elements.filter(
    (candidate) => candidate.pastureKey === corrupt.key,
  ))
    element.position.y -= 522;
  applyRogueTurn(state, { kind: "wait" });
  assert.deepEqual(
    state.village.development.masterPlan.fieldBoundaries[0],
    accepted,
  );
  assert.equal(survey.revisions.length, 1);
  assert.equal(survey.driftRecovery.discardedRevisions, 8);
  assert.ok(
    farmJob.plan.constructionWork.elements.every(
      (element) => element.position.y > -128,
    ),
  );
});

test("M-11.1 founders receive explicit reusable tools and finite provisions", () => {
  const state = newRogueRun(input),
    cells = rogueUnityView(state).map.cells;
  assert.equal(stock(state, "founding_axes").quantity, 3);
  assert.equal(stock(state, "founding_saws").quantity, 2);
  assert.equal(stock(state, "founding_hammers").quantity, 2);
  assert.equal(stock(state, "inn_meals").quantity, 30);
  assert.deepEqual(stock(state, "inn_fish").position, { x: -15, y: 19 });
  assert.equal(
    villageWorldObjectAt(state, -15, 19, false).name,
    "Founding food cache",
  );
  assert.ok(
    [
      [-16, 19],
      [-15, 18],
      [-15, 20],
    ].every(
      ([x, y]) =>
        villageMovementCost(
          cells.find((cell) => cell.x === x && cell.y === y).tile,
        ) != null,
    ),
  );
  assert.equal(stock(state, "farm_seed").quantity, 6);
  assert.equal(stock(state, "pasture_cattle"), undefined);
  assert.equal(livingAnimals(state, "cow").length, 2);
});

test("R8 founding adults can join the architect's common building crew", () => {
  const state = newRogueRun(input),
    commonBuilders = state.village.npcStates.filter(
      (resident) => !["reeve", "watchman"].includes(resident.personKey),
    );
  assert.equal(commonBuilders.length, 8);
  assert.ok(
    commonBuilders.every((resident) =>
      resident.capabilityTags.includes("build"),
    ),
  );
  assert.ok(
    commonBuilders.every((resident) =>
      resident.workPermissions.allowedJobTypes.includes("assist_project"),
    ),
  );
});

test("R8 the reeve reviews the village without becoming a permanent clerk", () => {
  const state = newRogueRun(input),
    reeve = state.village.npcStates.find(
      (resident) => resident.personKey === "reeve",
    );
  satisfyFounders(state);
  state.village.clock.hour = 8;
  state.village.clock.block = "work";
  for (let turn = 0; turn < 4; turn += 1)
    applyRogueTurn(state, { kind: "wait" });
  const duty = state.village.jobs.find(
    (job) => job.jobType === "govern_village",
  );
  assert.equal(duty.assignedActorId, reeve.id);
  assert.equal(duty.status, "completed");
  assert.equal(state.village.development.lastResidentNeedsReviewAtTick, 0);
  assert.equal(state.village.development.nextResidentNeedsReviewAtTick, 100);
  assert.equal(
    state.village.jobs.some(
      (job) =>
        job.jobType === "govern_village" &&
        ["active", "reserved"].includes(job.status),
    ),
    false,
  );
});

test("R8 legacy continuous governance work migrates to scheduled review", () => {
  const state = newRogueRun(input),
    reeve = state.village.npcStates.find(
      (resident) => resident.personKey === "reeve",
    ),
    legacy = createJob(state, {
      jobType: "govern_village",
      name: "Legacy continuous governance",
      targetId: "legacy-governance-table",
      targetPosition: { ...reeve.position },
      requiredCapabilities: ["govern"],
      progressTotal: 60,
      progressUnit: "review_minute",
      plan: { governanceDuty: true, ownerActorId: reeve.id },
    }).job;
  Object.assign(legacy, { status: "active", assignedActorId: reeve.id });
  reeve.workState = "working";
  applyRogueTurn(state, { kind: "wait" });
  assert.equal(legacy.status, "cancelled");
  assert.equal(legacy.blockingReason, "replaced_by_scheduled_review");
  assert.equal(legacy.assignedActorId, null);
});

test("M-11.1 cattle are UUID-backed two-by-one creatures, not a herd marker", () => {
  const state = newRogueRun(input),
    cattle = livingAnimals(state, "cow"),
    deer = livingAnimals(state, "deer"),
    view = rogueUnityView(state),
    animalCells = view.map.cells.filter(
      (cell) =>
        cell.entityKind === "animal" && cell.variant?.startsWith("cow_"),
    ),
    wildlifeCells = view.map.cells.filter(
      (cell) =>
        cell.entityKind === "animal" && cell.variant?.startsWith("deer_"),
    );
  assert.equal(cattle.length, 2);
  assert.equal(new Set(cattle.map((animal) => animal.id)).size, 2);
  assert.ok(cattle.every((animal) => animal.entityType === "animal"));
  assert.ok(cattle.every((animal) => animalFootprint(animal).length === 2));
  assert.ok(cattle.every((animal) => animal.homeRange));
  assert.ok(cattle.every((animal) => animal.tetherPosition));
  assert.ok(cattle.every((animal) => animal.homeRange.width <= 4));
  assert.ok(
    cattle.every((animal) => animal.width === 2 && animal.height === 1),
  );
  assert.equal(animalCells.length, 2);
  assert.deepEqual(
    new Set(animalCells.map((cell) => cell.visualAssetKey)),
    new Set(["actor_cow_female_v3", "actor_cow_male_v3"]),
  );
  assert.ok(animalCells.every((cell) => cell.entityPose === "grazing"));
  assert.ok(animalCells.every((cell) => cell.entityAction.includes("tether")));
  assert.ok(
    animalCells.every(
      (cell) =>
        Number.isInteger(cell.animalTetherX) &&
        Number.isInteger(cell.animalTetherY),
    ),
  );
  assert.ok(
    animalCells.every(
      (cell) => cell.objectWidth === 2 && cell.objectHeight === 1,
    ),
  );
  assert.equal(deer.length, 4);
  assert.equal(wildlifeCells.length, 4);
  assert.ok(deer.every((animal) => animal.status === "wild"));
  assert.equal(
    view.map.cells.some((cell) => cell.objectName === "Pasture herd"),
    false,
  );
});

test("R5 gathered forage does not put a resident in an animal grazing pose", () => {
  const state = newRogueRun(input),
    resident = state.village.npcStates.find(
      (candidate) => candidate.personKey === "herder",
    );
  resident.currentAction = "Mix gathered forage into emergency fodder";
  resident.workState = "working";
  const cell = rogueUnityView(state).map.cells.find(
    (candidate) => candidate.entityId === resident.id,
  );
  assert.equal(cell.entityPose, "working");
});

test("R8 livestock rest visibly at night instead of wandering", () => {
  const state = newRogueRun(input);
  state.tick = 12;
  state.village.clock.hour = 21;
  advanceVillageAnimals(state, () => "outdoor_grass");
  const cattle = rogueUnityView(state).map.cells.filter(
    (cell) => cell.entityReason === "animal_cow",
  );
  assert.equal(cattle.length, 2);
  assert.ok(cattle.every((cell) => cell.entityAction === "Sleeping"));
  assert.ok(cattle.every((cell) => cell.entityPose === "sleeping"));
});

test("R8 livestock and wildlife cannot enter mountains or mine chambers", () => {
  for (const blockedTile of [
    "outdoor_rock",
    "village_mine_floor",
    "village_building",
    "village_fence",
    "village_door_closed",
    "village_gate_closed",
  ]) {
    const state = newRogueRun(input);
    state.tick = 12;
    state.village.clock.hour = 10;
    const before = new Map(
      livingAnimals(state).map((animal) => [animal.id, { ...animal.position }]),
    );
    advanceVillageAnimals(state, () => blockedTile);
    for (const animal of livingAnimals(state))
      assert.deepEqual(animal.position, before.get(animal.id));
  }
});

test("R8 livestock already overlapping a wall move to valid ground", () => {
  const state = newRogueRun(input),
    sheep = livingAnimals(state, "sheep")[0],
    blocked = { ...sheep.position },
    terrainAt = (position) =>
      position.x === blocked.x && position.y === blocked.y
        ? "village_building"
        : "outdoor_grass";
  state.tick = 12;
  state.village.clock.hour = 10;
  advanceVillageAnimals(state, terrainAt);
  assert.notDeepEqual(sheep.position, blocked);
  assert.equal(terrainAt(sheep.position), "outdoor_grass");
});

test("R8.3 livestock and woodland species begin with both sexes", () => {
  const state = newRogueRun(input);
  for (const species of [
    "cow",
    "pig",
    "sheep",
    "dog",
    "chicken",
    "deer",
    "wolf",
    "wild_boar",
    "bear",
  ]) {
    const sexes = new Set(
      livingAnimals(state, species).map((animal) => animal.sex),
    );
    assert.deepEqual(sexes, new Set(["female", "male"]), species);
  }
});

test("R8.3 breeding records pregnancy and delivers parented offspring", () => {
  const state = newRogueRun(input);
  provideAnimalHousing(state, "cow");
  const conception = beginAnimalBreeding(state, "cow");
  assert.ok(conception);
  assert.equal(conception.dueDay - conception.conceivedDay, 283);
  assert.equal(livingAnimals(state, "cow").length, 2);
  state.village.clock.day = conception.dueDay;
  const newborns = advanceAnimalLifecycle(state);
  assert.equal(newborns.length, 1);
  assert.equal(newborns[0].motherId, conception.mother.id);
  assert.equal(newborns[0].fatherId, conception.father.id);
  assert.equal(newborns[0].generation, 1);
  assert.equal(newborns[0].ageStage, "calf");
  const newbornCell = rogueUnityView(state, [], {
    villageCenter: newborns[0].position,
  }).map.cells.find((cell) => cell.entityId === newborns[0].id);
  assert.equal(newbornCell.visualAssetKey, "actor_cow_juvenile_v3");
  assert.equal(newbornCell.entityAgeStage, "calf");
  assert.equal(newbornCell.entitySex, newborns[0].sex);
  assert.equal(newbornCell.entityGeneration, 1);
});

test("R8.3 a calf visibly weans, matures, and survives save-load", () => {
  const state = newRogueRun(input);
  provideAnimalHousing(state, "cow").capacityUnits = 40;
  const conception = beginAnimalBreeding(state, "cow");
  state.village.clock.day = conception.dueDay;
  const calf = advanceAnimalLifecycle(state)[0];

  state.village.clock.day = calf.birthDay + animalSpecies("cow").weaningDays;
  advanceAnimalLifecycle(state);
  assert.equal(calf.ageStage, "juvenile");
  assert.deepEqual(animalFootprint(calf).length, 1);

  const restored = parseRogueState(serializeRogueState(state)),
    restoredCalf = restored.village.animals.find(
      (animal) => animal.id === calf.id,
    );
  restored.village.clock.day =
    calf.birthDay + animalSpecies("cow").maturityDays;
  advanceAnimalLifecycle(restored);
  assert.equal(restoredCalf.ageStage, "adult");
  assert.deepEqual([restoredCalf.width, restoredCalf.height], [2, 1]);
  assert.ok(
    restored.village.animalLifeEvents.some(
      (event) =>
        event.animalId === calf.id &&
        event.type === "life_stage" &&
        event.ageStage === "adult",
    ),
  );
});

test("R8.3 livestock reaches a healthy second generation across seasons", () => {
  const state = newRogueRun(input),
    site = provideAnimalHousing(state, "pig", "pig_pen"),
    feed = stock(state, "stable_feed"),
    water = stock(state, "stable_water"),
    seasons = new Set();
  site.capacityUnits = 100;
  feed.quantity = feed.capacity = 1000000;
  water.quantity = water.capacity = 1000000;
  const first = beginAnimalBreeding(state, "pig");
  for (let day = 2; day <= first.dueDay; day += 1) {
    state.village.clock.day = day;
    seasons.add(grazingSeason(day).key);
    advanceAnimalLifecycle(state);
    advanceAnimalHusbandry(state);
  }
  const daughter = livingAnimals(state, "pig").find(
    (animal) => animal.generation === 1 && animal.sex === "female",
  );
  const adultDay = daughter.birthDay + animalSpecies("pig").maturityDays;
  for (let day = first.dueDay + 1; day <= adultDay; day += 1) {
    state.village.clock.day = day;
    seasons.add(grazingSeason(day).key);
    advanceAnimalLifecycle(state);
    advanceAnimalHusbandry(state);
  }
  first.mother.status = "dead";
  const second = beginAnimalBreeding(state, "pig");
  assert.equal(second.mother.id, daughter.id);
  for (let day = adultDay + 1; day <= second.dueDay; day += 1) {
    state.village.clock.day = day;
    seasons.add(grazingSeason(day).key);
    advanceAnimalLifecycle(state);
    advanceAnimalHusbandry(state);
  }
  const secondGeneration = livingAnimals(state, "pig").filter(
    (animal) => animal.generation === 2,
  );
  assert.ok(secondGeneration.length >= 1);
  assert.ok(
    secondGeneration.every((animal) => animal.motherId === daughter.id),
  );
  assert.equal(
    new Set(
      livingAnimals(state, "pig").map(
        (animal) => `${animal.position.x},${animal.position.y}`,
      ),
    ).size,
    livingAnimals(state, "pig").length,
  );
  assert.ok(seasons.size >= 4);
  assert.ok(
    livingAnimals(state, "pig").every(
      (animal) =>
        animal.health > 40 && animal.hunger < 70 && animal.thirst < 65,
    ),
  );
  const restored = parseRogueState(serializeRogueState(state));
  assert.equal(
    livingAnimals(restored, "pig").filter((animal) => animal.generation === 2)
      .length,
    secondGeneration.length,
  );
});

test("R8.3 chicken reproduction uses incubation rather than instant chicks", () => {
  const state = newRogueRun(input);
  provideAnimalHousing(state, "chicken", "coop");
  const conception = beginAnimalBreeding(state, "chicken");
  assert.ok(conception);
  assert.equal(conception.process, "incubation");
  assert.equal(conception.dueDay - conception.conceivedDay, 21);
  assert.equal(livingAnimals(state, "chicken").length, 4);
});

test("R8.3 pregnancy and lineage survive an exact save round trip", () => {
  const state = newRogueRun(input);
  provideAnimalHousing(state, "sheep", "sheepfold");
  const conception = beginAnimalBreeding(state, "sheep"),
    restored = parseRogueState(serializeRogueState(state)),
    mother = restored.village.animals.find(
      (animal) => animal.id === conception.mother.id,
    );
  assert.deepEqual(mother.pregnancy, conception.mother.pregnancy);
  restored.village.clock.day = conception.dueDay;
  const newborns = advanceAnimalLifecycle(restored);
  assert.ok(newborns.length >= 1);
  assert.ok(newborns.every((animal) => animal.width === 1));
  assert.ok(newborns.every((animal) => animal.generation === 1));
});

test("R8.3 breeding stops when the only mature male is unavailable", () => {
  const state = newRogueRun(input),
    bull = livingAnimals(state, "cow").find((animal) => animal.sex === "male");
  bull.status = "dead";
  assert.equal(beginAnimalBreeding(state, "cow"), null);
});

test("R8.3 finite feed is consumed once per day and recorded", () => {
  const state = newRogueRun(input),
    feed = state.village.stockpiles.find((item) => item.key === "stable_feed"),
    water = state.village.stockpiles.find(
      (item) => item.key === "stable_water",
    ),
    before = feed.quantity,
    waterBefore = water.quantity,
    first = advanceAnimalHusbandry(state),
    duplicate = advanceAnimalHusbandry(state);
  assert.ok(first.totalNeed > 0);
  assert.equal(first.coverage, 1);
  assert.equal(feed.quantity, before - first.consumed);
  assert.ok(first.water.totalNeed > 0);
  assert.equal(first.water.coverage, 1);
  assert.equal(water.quantity, waterBefore - first.water.consumed);
  assert.equal(duplicate, null);
  assert.equal(state.village.animalHusbandryLedger.length, 1);
});

function retainOnlyAnimal(state, retained) {
  const domesticSpecies = new Set(["cow", "pig", "sheep", "dog", "chicken"]);
  for (const animal of state.village.animals)
    if (animal.id !== retained.id && domesticSpecies.has(animal.species))
      animal.status = "dead";
}

test("R8.3 spring pasture offsets conserved stored feed", () => {
  const state = newRogueRun(input),
    cow = livingAnimals(state, "cow")[0],
    site = provideAnimalHousing(state, "cow"),
    feed = stock(state, "stable_feed"),
    beforeFeed = feed.quantity,
    beforeForage = site.forageUnits;
  retainOnlyAnimal(state, cow);
  state.village.clock.day = 30;
  site.lastForageDay = 30;
  const entry = advanceAnimalHusbandry(state);
  assert.equal(entry.season, "spring");
  assert.ok(entry.grazed > 0);
  assert.ok(entry.consumed < entry.totalNeed);
  assert.equal(feed.quantity, beforeFeed - entry.consumed);
  assert.equal(site.forageUnits, beforeForage - entry.grazed);
  assert.equal(entry.coverage, 1);
});

test("R8.3 pasture regrowth slows by season and stops in winter", () => {
  const state = newRogueRun(input),
    site = provideAnimalHousing(state, "cow");
  site.forageUnits = 0;
  site.lastForageDay = 89;
  const springGrowth = refreshPastureForage(site, 90);
  site.forageUnits = 0;
  site.lastForageDay = 90;
  const summerGrowth = refreshPastureForage(site, 91);
  site.forageUnits = 0;
  site.lastForageDay = 270;
  const winterGrowth = refreshPastureForage(site, 271);
  assert.equal(grazingSeason(361).key, "spring");
  assert.ok(springGrowth > summerGrowth);
  assert.ok(summerGrowth > winterGrowth);
  assert.equal(winterGrowth, 0);
});

test("R8.3 pasture forage is inspectable in the native projection", () => {
  const state = newRogueRun(input),
    site = provideAnimalHousing(state, "cow"),
    position = { x: site.x, y: site.y + 1 },
    object = villageWorldObjectAt(state, position.x, position.y),
    view = rogueUnityView(state, [], { villageCenter: position }),
    cell = view.map.cells.find(
      (candidate) => candidate.x === position.x && candidate.y === position.y,
    );
  assert.equal(object.pastureId, site.id);
  assert.match(object.description, /forage units in spring/);
  assert.equal(cell.pastureForageUnits, site.forageUnits);
  assert.equal(cell.pastureForageCapacity, site.forageCapacity);
  assert.equal(cell.pastureForageSeason, "spring");
  assert.match(cell.objectDescription, /forage units in spring/);
});

test("R8.3 winter livestock consume stored feed when pasture is bare", () => {
  const state = newRogueRun(input),
    cow = livingAnimals(state, "cow")[0],
    site = provideAnimalHousing(state, "cow"),
    feed = stock(state, "stable_feed"),
    before = feed.quantity;
  retainOnlyAnimal(state, cow);
  state.village.clock.day = 271;
  site.forageUnits = 0;
  site.lastForageDay = 270;
  const entry = advanceAnimalHusbandry(state);
  assert.equal(entry.season, "winter");
  assert.equal(entry.grazed, 0);
  assert.equal(entry.consumed, entry.totalNeed);
  assert.equal(feed.quantity, before - entry.totalNeed);
  assert.equal(entry.coverage, 1);
});

test("R8.3 predators preserve a two-animal wildlife refuge floor", () => {
  const state = newRogueRun(input),
    entry = advanceWildlifeEcology(state),
    targetIds = livingAnimals(state)
      .map((animal) => animal.huntingTargetId)
      .filter(Boolean),
    deerIds = new Set(livingAnimals(state, "deer").map((animal) => animal.id));
  assert.equal(entry.counts.deer, 4);
  assert.equal(targetIds.filter((id) => deerIds.has(id)).length, 2);
  assert.equal(entry.capacities.deer, wildlifeCarryingCapacity("deer", 1));
});

test("R8.3 a predator visibly pursues prey and leaves a carcass", () => {
  const state = newRogueRun(input),
    wolf = livingAnimals(state, "wolf")[0],
    deer = livingAnimals(state, "deer")[0];
  wolf.position = { x: deer.position.x - 1, y: deer.position.y };
  wolf.huntingTargetId = deer.id;
  deer.homeRange = {
    x: deer.position.x,
    y: deer.position.y,
    width: 1,
    height: 1,
  };
  state.tick = 12;
  state.village.clock.hour = 12;
  advanceVillageAnimals(state, () => "outdoor_grass");
  const object = villageWorldObjectAt(state, deer.position.x, deer.position.y),
    view = rogueUnityView(state, [], { villageCenter: deer.position }),
    cell = view.map.cells.find(
      (candidate) =>
        candidate.x === deer.position.x && candidate.y === deer.position.y,
    );
  assert.equal(deer.status, "dead");
  assert.equal(deer.deathCause, "predation");
  assert.equal(deer.killedById, wolf.id);
  assert.equal(object.objectKind, "animal_carcass");
  assert.equal(cell.objectKind, "animal_carcass");
  assert.equal(cell.entityPose, "dead");
  assert.ok(
    state.village.wildlifeEvents.some((event) => event.preyId === deer.id),
  );
});

test("R8.3 wildlife migration restores scarcity without exceeding capacity", () => {
  const state = newRogueRun(input),
    deer = livingAnimals(state, "deer");
  deer.slice(1).forEach((animal) => {
    animal.status = "dead";
  });
  state.village.clock.day = 15;
  state.village.lastWildlifeEcologyDay = 14;
  state.village.nextWildlifeMigrationDay = { deer: 15, wild_boar: 99 };
  const entry = advanceWildlifeEcology(state);
  assert.equal(entry.migrantIds.length, 1);
  assert.equal(livingAnimals(state, "deer").length, 2);
  assert.ok(entry.counts.deer <= entry.capacities.deer);
});

test("R8.3 carcasses persist, spoil, become bones, and decay", () => {
  const state = newRogueRun(input),
    deer = livingAnimals(state, "deer")[0];
  markAnimalDead(state, deer, "predation", livingAnimals(state, "wolf")[0].id);
  const restored = parseRogueState(serializeRogueState(state)),
    carcass = restored.village.animals.find((animal) => animal.id === deer.id);
  assert.equal(carcass.carcassState, "fresh");
  restored.village.clock.day = carcass.deathDay + 3;
  advanceAnimalLifecycle(restored);
  assert.equal(carcass.carcassState, "spoiled");
  restored.village.clock.day = carcass.deathDay + 10;
  advanceAnimalLifecycle(restored);
  assert.equal(carcass.carcassState, "bones");
  restored.village.clock.day = carcass.deathDay + 30;
  advanceAnimalLifecycle(restored);
  assert.equal(carcass.carcassState, "gone");
});

test("R8.4 a fresh predator kill becomes conserved stored meat", () => {
  const state = newRogueRun(input),
    herder = state.village.npcStates.find(
      (resident) => resident.personKey === "herder",
    ),
    deer = livingAnimals(state, "deer")[0],
    meat = stock(state, "pasture_meat"),
    before = meat.quantity;
  deer.position = { x: herder.position.x + 1, y: herder.position.y };
  markAnimalDead(state, deer, "predation", livingAnimals(state, "wolf")[0].id);
  let observed = false;
  for (let step = 0; step < 300 && !deer.disposition; step += 1) {
    satisfyFounders(state);
    const outcome = applyRogueTurn(state, { kind: "wait" });
    observed ||= outcome.events.some(
      (event) => event.type === "animal_carcass_processed",
    );
  }
  assert.equal(deer.disposition, "processed_for_food");
  assert.equal(deer.carcassState, "gone");
  state.village.clock.day += 1;
  advanceAnimalLifecycle(state);
  assert.equal(deer.carcassState, "gone");
  assert.equal(meat.quantity, before + 4);
  assert.equal(observed, true);
  assert.ok(
    state.village.foodLedger.batches.some(
      (batch) =>
        batch.originType === "carcass_recovery" && batch.originId === deer.id,
    ),
  );
});

test("R8.4 unsafe animal remains are hauled to a separate visible pit", () => {
  const state = newRogueRun(input),
    laborer = state.village.npcStates.find(
      (resident) => resident.personKey === "woodcutter",
    ),
    cow = livingAnimals(state, "cow")[0];
  cow.position = { x: laborer.position.x + 1, y: laborer.position.y };
  markAnimalDead(state, cow, "natural_death");
  let carried = false;
  for (let step = 0; step < 400 && !cow.disposition; step += 1) {
    satisfyFounders(state);
    const outcome = applyRogueTurn(state, { kind: "wait" });
    carried ||= outcome.events.some(
      (event) => event.type === "animal_carcass_collected",
    );
  }
  const pit = state.village.civic.animalDisposal,
    marker = villageWorldObjectAt(state, pit.position.x, pit.position.y),
    restored = parseRogueState(serializeRogueState(state));
  assert.equal(carried, true);
  assert.equal(cow.disposition, "disposed");
  assert.equal(cow.carcassState, "gone");
  state.village.clock.day += 1;
  advanceAnimalLifecycle(state);
  assert.equal(cow.carcassState, "gone");
  assert.ok(pit.disposedCarcassIds.includes(cow.id));
  assert.equal(marker.objectKind, "animal_disposal");
  assert.ok(
    restored.village.civic.animalDisposal.disposedCarcassIds.includes(cow.id),
  );
});

test("R8.4 cemetery controls persist site and disposition policy", () => {
  const state = newRogueRun(input),
    site = selectVillageCemeterySite(state);
  state.location = "village";
  const designation = applyRogueTurn(state, {
    kind: "set_cemetery_policy",
    action: "designate",
    site,
  });
  applyRogueTurn(state, {
    kind: "set_cemetery_policy",
    action: "set_default",
    disposition: "cremation",
  });
  const resident = state.village.npcStates.find(
      (candidate) => candidate.personKey === "woodcutter",
    ),
    corpse = markResidentDead(state, resident.id, "work_accident");
  assert.equal(designation.events[0].type, "cemetery_policy_changed");
  assert.equal(state.village.civic.cemetery.x, site.x);
  assert.equal(state.village.civic.cemetery.y, site.y);
  assert.equal(corpse.requestedDisposition, "cremation");
  assert.equal(state.village.civic.cemeteryPolicy.revision, 2);
  const restored = parseRogueState(serializeRogueState(state));
  assert.equal(
    restored.village.civic.cemeteryPolicy.defaultDisposition,
    "cremation",
  );
  assert.equal(
    residentCorpse(restored, corpse.id).requestedDisposition,
    "cremation",
  );
});

test("R8.4 a resident death becomes a marked physical burial", () => {
  const state = newRogueRun(input),
    resident = state.village.npcStates.find(
      (candidate) => candidate.personKey === "woodcutter",
    ),
    corpse = markResidentDead(state, resident.id, "work_accident"),
    exposed = villageWorldObjectAt(state, corpse.position.x, corpse.position.y);
  const foodStore = state.village.stockpiles.find((item) =>
    ["grain", "vegetables", "prepared_meal"].includes(item.itemKind),
  );
  assert.equal(
    assessCemeterySite(state, { ...foodStore.position, w: 4, h: 4 }).valid,
    false,
  );
  assert.equal(exposed.id, corpse.id);
  assert.equal(exposed.objectKind, "resident_corpse");
  const corpseCell = rogueUnityView(state).map.cells.find(
    (cell) => cell.entityId === corpse.id,
  );
  assert.equal(corpseCell.objectKind, "resident_corpse");
  assert.equal(corpseCell.entityPose, "dead");
  state.village.clock.day = corpse.deathDay + 4;
  const exposure = advanceVillageCivic(state)[0];
  assert.equal(corpse.condition, "decomposing");
  assert.ok(exposure.affectedResidentIds.length > 0);
  let burialObserved = false;
  for (let step = 0; step < 300 && corpse.status !== "buried"; step += 1) {
    satisfyFounders(state);
    const outcome = applyRogueTurn(state, { kind: "wait" });
    burialObserved ||= outcome.events.some(
      (event) => event.type === "resident_buried",
    );
  }
  assert.equal(corpse.status, "buried");
  const grave = villageGrave(state, corpse.graveId),
    marker = villageWorldObjectAt(state, grave.position.x, grave.position.y),
    burialJob = state.village.jobs.find(
      (job) => job.plan?.corpseId === corpse.id,
    );
  assert.equal(grave.status, "occupied");
  assert.equal(grave.occupantId, corpse.id);
  assert.equal(marker.objectKind, "grave");
  assert.equal(burialJob.status, "completed");
  assert.equal(burialObserved, true);
  const household = state.village.households.find(
      (entry) => entry.id === resident.householdId,
    ),
    expectedMourners = household.memberIds.length - 1;
  for (
    let step = 0;
    step < 1000 && (corpse.mournedByIds?.length ?? 0) < expectedMourners;
    step += 1
  ) {
    satisfyFounders(state);
    applyRogueTurn(state, { kind: "wait" });
  }
  assert.equal(corpse.mournedByIds.length, expectedMourners);
  assert.equal(resident.currentAction, "Dead");
  assert.equal(
    state.village.jobs.some(
      (job) =>
        job.assignedActorId === resident.id &&
        !["completed", "cancelled"].includes(job.status),
    ),
    false,
  );
  assert.ok(
    rogueUnityView(state).map.cells.some(
      (cell) => cell.objectId === grave.id && cell.objectKind === "grave",
    ),
  );
  const restored = parseRogueState(serializeRogueState(state));
  assert.equal(residentCorpse(restored, corpse.id).status, "buried");
  assert.equal(villageGrave(restored, grave.id).occupantId, corpse.id);
});

test("R8.4 a player order physically exhumates and cremates remains", () => {
  const state = newRogueRun(input),
    resident = state.village.npcStates.find(
      (candidate) => candidate.personKey === "woodcutter",
    ),
    corpse = markResidentDead(state, resident.id, "work_accident"),
    lumber = stock(state, "lumber_yard_lumber");
  state.location = "village";
  lumber.quantity = 40;
  for (let step = 0; step < 400 && corpse.status !== "buried"; step += 1) {
    satisfyFounders(state);
    applyRogueTurn(state, { kind: "wait" });
  }
  const grave = villageGrave(state, corpse.graveId);
  applyRogueTurn(state, {
    kind: "set_cemetery_policy",
    action: "order_cremation",
    corpseId: corpse.id,
  });
  let exhumed = false,
    cremated = false;
  for (let step = 0; step < 500 && corpse.status !== "cremated"; step += 1) {
    satisfyFounders(state);
    const outcome = applyRogueTurn(state, { kind: "wait" });
    exhumed ||= outcome.events.some(
      (event) => event.type === "resident_exhumed",
    );
    cremated ||= outcome.events.some(
      (event) => event.type === "resident_cremated",
    );
  }
  const pyre = state.village.civic.cremationPyre;
  assert.ok(
    pyre,
    JSON.stringify({
      corpse,
      grave,
      jobs: state.village.jobs
        .filter((job) => job.plan?.corpseId === corpse.id)
        .map((job) => ({
          type: job.jobType,
          status: job.status,
          reason: job.blockingReason,
        })),
    }),
  );
  const marker = villageWorldObjectAt(state, pyre.position.x, pyre.position.y);
  assert.equal(corpse.status, "cremated");
  assert.equal(grave.status, "designated");
  assert.equal(grave.occupantId, null);
  assert.equal(exhumed, true);
  assert.equal(cremated, true);
  assert.equal(pyre.consumedFuelUnits, 10);
  assert.ok(lumber.quantity >= 0);
  assert.ok(pyre.crematedCorpseIds.includes(corpse.id));
  assert.equal(marker.objectKind, "cremation_pyre");
  const restored = parseRogueState(serializeRogueState(state));
  assert.equal(residentCorpse(restored, corpse.id).status, "cremated");
  assert.ok(
    restored.village.civic.cremationPyre.crematedCorpseIds.includes(corpse.id),
  );
});

test("R8.3 animal disease progresses and responds to treatment", () => {
  const state = newRogueRun(input),
    cow = livingAnimals(state, "cow")[0],
    health = cow.health;
  infectAnimal(state, cow, "hoof_rot");
  advanceAnimalDisease(state);
  assert.ok(cow.health < health);
  state.village.clock.day += 1;
  treatAnimalDisease(state, cow);
  assert.equal(cow.disease.treatedDay, state.village.clock.day);
  state.village.clock.day += 1;
  advanceAnimalDisease(state);
  assert.equal(cow.disease, null);
  assert.ok(
    state.village.animalDiseaseLedger.some(
      (entry) => entry.type === "recovery",
    ),
  );
});

test("R8.3 empty troughs make domestic animals thirsty and unhealthy", () => {
  const state = newRogueRun(input),
    water = state.village.stockpiles.find(
      (item) => item.key === "stable_water",
    ),
    cow = livingAnimals(state, "cow")[0];
  water.quantity = 0;
  cow.thirst = 64;
  const entry = advanceAnimalHusbandry(state);
  assert.equal(entry.water.coverage, 0);
  assert.ok(cow.thirst > 64);
  assert.equal(cow.health, 92);
});

test("R8.3 unfed domestic animals become hungry and lose health", () => {
  const state = newRogueRun(input),
    feed = state.village.stockpiles.find((item) => item.key === "stable_feed"),
    cow = livingAnimals(state, "cow")[0];
  feed.quantity = 0;
  cow.hunger = 69;
  const entry = advanceAnimalHusbandry(state);
  assert.equal(entry.coverage, 0);
  assert.ok(cow.hunger > 69);
  assert.equal(cow.health, 95);
});

test("R8.3 milk and culling respect sex and family welfare", () => {
  const state = newRogueRun({ ...input, scenario: "established" });
  provideAnimalHousing(state, "cow");
  const conception = beginAnimalBreeding(state, "cow"),
    milkable = animalProductionCandidates(state, "cow", "milk"),
    cullable = animalProductionCandidates(state, "cow", "slaughter");
  assert.ok(milkable.length >= 1);
  assert.ok(milkable.every((animal) => animal.sex === "female"));
  assert.equal(
    cullable.some((animal) => animal.id === conception.mother.id),
    false,
  );
});

test("R8.3 eggs, wool, and manure obey physical housing and harvest cadence", () => {
  const state = newRogueRun(input),
    day = state.village.clock.day;
  provideAnimalHousing(state, "chicken", "coop");
  provideAnimalHousing(state, "sheep", "sheepfold");
  provideAnimalHousing(state, "cow");
  const hen = animalProductionCandidates(state, "chicken", "eggs")[0],
    sheep = animalProductionCandidates(state, "sheep", "wool")[0],
    cow = animalProductionCandidates(state, "cow", "manure")[0];
  assert.ok(hen && sheep && cow);
  assert.equal(recordAnimalProduction(hen, "eggs", day), true);
  assert.equal(recordAnimalProduction(sheep, "wool", day), true);
  assert.equal(recordAnimalProduction(cow, "manure", day), true);
  assert.ok(
    !animalProductionCandidates(state, "chicken", "eggs").includes(hen),
  );
  assert.ok(
    !animalProductionCandidates(state, "sheep", "wool").includes(sheep),
  );
  assert.ok(!animalProductionCandidates(state, "cow", "manure").includes(cow));
  state.village.clock.day += 1;
  assert.ok(animalProductionCandidates(state, "chicken", "eggs").includes(hen));
  assert.ok(animalProductionCandidates(state, "cow", "manure").includes(cow));
  assert.ok(
    !animalProductionCandidates(state, "sheep", "wool").includes(sheep),
  );
  state.village.clock.day += 179;
  assert.ok(animalProductionCandidates(state, "sheep", "wool").includes(sheep));
});

test("R8.3 housing capacity prevents an overcrowded conception", () => {
  const state = newRogueRun(input),
    site = provideAnimalHousing(state, "cow");
  site.capacityUnits = 4;
  assert.equal(beginAnimalBreeding(state, "cow"), null);
});

test("R8.3 a completed stable queues physical animal transfers", () => {
  const state = newRogueRun(input),
    stable = specialistFacilityPlan("specialist_stable"),
    elements = constructionElements(stable).map((element, index) => ({
      ...element,
      id: namedUuid(state.id, `stable-proof:${index}`),
    }));
  assert.equal(installAnimalHousingSites(state, stable, elements), 4);
  for (const species of ["pig", "sheep", "dog", "chicken"]) {
    const animals = livingAnimals(state, species),
      site = state.village.pastures.find(
        (candidate) => candidate.id === animals[0].pendingPastureId,
      );
    assert.ok(site.allowedSpecies.includes(species));
    assert.ok(animals.every((animal) => animal.pendingPastureId === site.id));
    assert.ok(animals.every((animal) => animal.homePastureId !== site.id));
    assert.ok(animals.every((animal) => animal.status === "awaiting_transfer"));
    assert.ok(site.evidenceIds.length > 0);
  }
});

test("R8.3 a completed cattle pasture queues cattle outside its fence", () => {
  const state = newRogueRun(input),
    site = createFarmsteadPasture(state.id);
  site.status = "complete";
  state.village.pastures.push(site);
  livingAnimals(state, "cow").forEach((animal, index) =>
    Object.assign(animal, {
      position: { x: -30 + index * 2, y: 26 + index },
      homePastureId: site.id,
      pendingPastureId: null,
      status: "grazing",
    }),
  );

  ensureVillageAnimals(state);

  const cattle = livingAnimals(state, "cow"),
    outside = cattle.filter(
      (animal) =>
        animal.position.x <= site.x ||
        animal.position.x + animal.width - 1 >= site.x + site.w - 1 ||
        animal.position.y <= site.y ||
        animal.position.y >= site.y + site.h - 1,
    );
  assert.ok(cattle.length >= 2);
  assert.ok(outside.length > 0);
  assert.ok(outside.every((animal) => animal.homePastureId !== site.id));
  assert.ok(outside.every((animal) => animal.pendingPastureId === site.id));
  assert.ok(outside.every((animal) => animal.status === "awaiting_transfer"));
});

test("M-11.1 farmstead construction raises every fence segment before pasture completion", () => {
  const state = newRogueRun(input);
  state.village.facilities.push("lumber_yard");
  stock(state, "lumber_yard_lumber").quantity = 500;
  stock(state, "inn_meals").quantity = 0;
  satisfyFounders(state);
  let farmJob,
    plannedFenceSeen = false,
    deliveredFenceSeen = false,
    framingFenceSeen = false,
    completedFenceSeen = false,
    plannedGateSeen = false;
  for (let turn = 0; turn < 1600 && !state.village.pastures.length; turn += 1) {
    satisfyFounders(state);
    placeAssignedWorkers(state, [
      "build_farmstead",
      "assist_project",
      "deliver_goods",
    ]);
    applyRogueTurn(state, { kind: "wait" });
    farmJob ??= state.village.jobs.find(
      (job) => job.jobType === "build_farmstead",
    );
    const elements = farmJob?.plan.constructionWork?.elements ?? [],
      fenceCells = elements.filter((element) => element.kind === "fence"),
      gateCells = elements.filter((element) => element.kind === "gate");
    plannedFenceSeen ||= fenceCells.some(
      (element) => element.status === "planned",
    );
    deliveredFenceSeen ||= fenceCells.some(
      (element) => element.materialDelivered,
    );
    framingFenceSeen ||= fenceCells.some(
      (element) => element.status === "in_progress",
    );
    completedFenceSeen ||= fenceCells.some(
      (element) => element.status === "complete",
    );
    plannedGateSeen ||= gateCells.some(
      (element) => element.status === "planned",
    );
    const incompletePastureFence =
      farmJob?.plan.constructionWork?.elements.some(
        (element) =>
          element.kind === "fence" &&
          element.enclosurePurpose === "pasture" &&
          element.status !== "complete",
      );
    if (incompletePastureFence) assert.equal(state.village.pastures.length, 0);
  }
  // The enclosure now becomes a derived pasture as soon as its own gate and
  // fences exist, independently of the barn shell. Keep the full crew on the
  // remaining physical elements before asserting whole-project evidence.
  clearApprovedFieldTrees(state);
  for (let turn = 0; turn < 1500 && farmJob.status !== "completed"; turn += 1) {
    satisfyFounders(state);
    Object.assign(state.village.clock, {
      hour: 10,
      minute: 0,
      second: 0,
      block: "work",
      phase: "day",
    });
    placeAssignedWorkers(state, [
      "build_farmstead",
      "assist_project",
      "deliver_goods",
      "clear_field_tree",
      "saw_lumber",
    ]);
    for (const job of state.village.jobs.filter(
      (candidate) =>
        candidate.jobType === "clear_field_tree" &&
        !["completed", "cancelled"].includes(candidate.status),
    ))
      job.progress.completed = Math.max(
        job.progress.completed,
        job.progress.total - 0.6,
      );
    applyRogueTurn(state, { kind: "wait" });
  }
  const fences = farmJob.plan.constructionWork.elements.filter(
    (element) => element.kind === "fence",
  );
  assert.ok(fences.length >= 30);
  assert.ok(fences.every((element) => element.status === "complete"));
  assert.deepEqual(farmJob.plan.derivedFacts, {
    expected: farmJob.plan.constructionWork.elements.length,
    permanent: farmJob.plan.constructionWork.elements.length,
    roofRequired: true,
    roofed: true,
    complete: true,
  });
  assert.equal(plannedFenceSeen, true);
  assert.equal(deliveredFenceSeen, true);
  assert.equal(framingFenceSeen, true);
  assert.equal(completedFenceSeen, true);
  assert.equal(plannedGateSeen, true);
  assert.equal(state.village.pastures.length, 1);
  const farmBuilding = state.village.buildings.find(
      (building) => building.key === "farmstead",
    ),
    pastureEvidence = farmJob.plan.constructionWork.elements
      .filter((element) => element.pastureKey === state.village.pastures[0].key)
      .map((element) => element.id);
  assert.equal(farmBuilding.status, "complete");
  assert.equal(
    farmBuilding.evidenceIds.length,
    farmJob.plan.constructionWork.elements.length,
  );
  assert.deepEqual(state.village.pastures[0].evidenceIds, pastureEvidence);
  assert.ok(
    livingAnimals(state, "cow").every((animal) => animal.status === "grazing"),
  );
  assert.ok(
    rogueUnityView(state).map.cells.some(
      (cell) => cell.tile === "village_fence" && cell.objectKind === "fence",
    ),
  );
  assert.ok(
    rogueUnityView(state).map.cells.some(
      (cell) => cell.tile === "village_gate_open" && cell.objectKind === "gate",
    ),
  );
});

test("M-11.1 first founding trial fells timber without consuming tools", () => {
  const state = newRogueRun(input);
  for (let turn = 0; turn < 180; turn += 1)
    applyRogueTurn(state, { kind: "wait" });
  assert.ok(stock(state, "lumber_camp_logs").quantity >= 27);
  const carriedAxes = state.village.npcStates.reduce(
    (total, resident) =>
      total +
      (resident.carriedItem?.itemKind === "hand_axe"
        ? resident.carriedItem.quantity
        : 0),
    0,
  );
  assert.equal(stock(state, "founding_axes").quantity + carriedAxes, 3);
  assert.ok(
    state.village.jobs.some(
      (job) => job.jobType === "fell_tree" && job.production.outputCreated,
    ),
  );
});

test("M-11.1 forestry output follows the designated tree species", () => {
  const state = newRogueRun(input);
  applyRogueTurn(state, { kind: "wait" });
  const jobs = state.village.jobs.filter((job) => job.jobType === "fell_tree");
  assert.equal(jobs.length, 3);
  for (const job of jobs) {
    const tree = villageWorldObjectAt(
      state,
      job.targetPosition.x,
      job.targetPosition.y,
      false,
    );
    assert.equal(job.production.output.quantity, treeWoodYield(tree.species));
  }
});

test("R8 architect stages family holdings after the founding commons", () => {
  const state = newRogueRun(input),
    plan = state.village.development.masterPlan,
    holdings = new Map(
      plan.householdHoldings.map((holding) => [holding.householdKey, holding]),
    );
  assert.deepEqual([...holdings.keys()], ["farmer", "brand", "woodcutter"]);
  assert.deepEqual(holdings.get("brand").animalSpecies, [
    "cow",
    "sheep",
    "dog",
  ]);
  assert.deepEqual(holdings.get("woodcutter").animalSpecies, [
    "pig",
    "chicken",
  ]);
  assert.ok(
    plan.householdHoldings.every(
      (holding) =>
        holding.status === "deferred_until_all_founder_homes_habitable" &&
        holding.detachedKitchen.wallMaterial === "stone" &&
        holding.detachedKitchen.attachedToTimberHome === false,
    ),
  );
  assert.equal(plan.settlementEvolution.currentStage, "founding_village");
  assert.equal(
    plan.settlementEvolution.commonsTransition,
    "retain_until_replacement_housing_is_operational",
  );
  assert.equal(plan.settlementEvolution.stages.at(-1).status, "out_of_scope");
});

test("R8 completed founder homes release household boundary surveys", () => {
  const state = newRogueRun(input),
    plan = state.village.development.masterPlan;
  for (const [index, holding] of plan.householdHoldings.entries()) {
    const buildingId = `holding-home-${index}`;
    state.village.buildings.push({
      id: buildingId,
      key: holding.dwellingSiteKey,
      status: "complete",
    });
    state.village.residences.push({
      id: `holding-residence-${index}`,
      buildingId,
      habitable: true,
      residentCapacity: 4,
    });
  }
  state.village.development.nextResidentNeedsReviewAtTick = state.tick;
  const events = [];
  updateVillageDevelopment(state, events);
  assert.ok(
    plan.householdHoldings.every(
      (holding) => holding.status === "ready_for_boundary_survey",
    ),
  );
  assert.equal(plan.settlementEvolution.currentStage, "family_hamlet");
  assert.ok(
    events.some((event) => event.type === "household_holdings_released"),
  );
});

test("R1 food work posts the communal kitchen after housing completes", () => {
  const state = newRogueRun(input),
    development = state.village.development,
    order = {
      id: "post-housing-food-order",
      status: "active",
      priorityKey: "food_security",
      jobTypes: ["grow_grain", "grow_vegetables", "hunt_game"],
      assignments: {
        crewActorIds: state.village.npcStates.map(({ id }) => id),
      },
    };
  state.village.facilities.push("lumber_yard", "farmstead", "housing");
  stock(state, "hunting_bows").quantity = 1;
  development.workOrders.push(order);
  development.activeOrderId = order.id;
  development.activePriority = "food_security";
  development.nextResidentNeedsReviewAtTick = state.tick + 100;
  applyRogueTurn(state, { kind: "wait" });
  const kitchen = state.village.jobs.find(
    (job) => job.jobType === "build_communal_kitchen",
  );
  assert.ok(kitchen);
  assert.equal(kitchen.plan.parallelFoundingWork, true);
  assert.equal(kitchen.plan.reason, "post_housing_food_stabilization");
  assert.ok(
    state.village.jobs.some((job) =>
      ["grow_grain", "grow_vegetables", "hunt_game"].includes(job.jobType),
    ),
  );
});

test("R1 surveyed fields become the first post-housing forestry source", () => {
  const state = newRogueRun(input);
  const residenceId = "709ec6cb-2987-58db-9a34-0b10739d6e25";
  state.village.facilities.push("lumber_yard", "housing");
  state.village.residences.push({
    id: residenceId,
    status: "complete",
    habitable: true,
    residentCapacity: state.village.npcStates.length,
  });
  for (const resident of state.village.npcStates)
    resident.residenceId = residenceId;
  applyRogueTurn(state, { kind: "wait" });
  const plan = state.village.development.masterPlan,
    surveys = plan.fieldClearingSurveys,
    jobs = state.village.jobs.filter((job) => job.jobType === "fell_tree");
  assert.equal(surveys.length, 2);
  assert.ok(surveys.every((survey) => survey.surveyedAtTick === 0));
  assert.ok(surveys.every((survey) => survey.initialTreeCount > 0));
  assert.ok(
    surveys.every(
      (survey) =>
        survey.estimatedLogYield ===
        survey.treeCells.reduce((total, tree) => total + tree.logYield, 0),
    ),
  );
  assert.equal(jobs.length, 3);
  assert.ok(jobs.every((job) => job.reason === "approved_field_clearing"));
  assert.ok(jobs.every((job) => job.plan.fieldBoundaryKey));
  assert.ok(
    jobs.every((job) =>
      job.plan.intendedWoodUses.includes("village_construction_surplus"),
    ),
  );
  assert.ok(
    jobs.every((job) =>
      surveys
        .find((survey) => survey.boundaryKey === job.plan.fieldBoundaryKey)
        .treeCells.some(
          (tree) =>
            tree.x === job.targetPosition.x && tree.y === job.targetPosition.y,
        ),
    ),
  );
  let completed;
  for (let turn = 0; turn < 160 && !completed; turn += 1) {
    satisfyFounders(state);
    placeAssignedWorkers(state, ["fell_tree"]);
    applyRogueTurn(state, { kind: "wait" });
    completed = jobs.find((job) => job.production.outputCreated);
  }
  assert.ok(completed);
  const completedJobs = jobs.filter((job) => job.production.outputCreated),
    completedSurvey = surveys.find(
      (survey) => survey.boundaryKey === completed.plan.fieldBoundaryKey,
    );
  assert.equal(completedSurvey.clearedTreeCount, completedJobs.length);
  assert.equal(
    completedSurvey.clearedLogYield,
    completedJobs.reduce(
      (total, job) => total + job.production.output.quantity,
      0,
    ),
  );
});

test("R1 field surveys clear a two-cell access and defensive sightline apron", () => {
  const state = newRogueRun(input);
  applyRogueTurn(state, { kind: "wait" });
  const plan = state.village.development.masterPlan,
    view = rogueUnityView(state),
    trees = view.map.cells.filter((cell) => cell.tile === "outdoor_tree");
  for (const survey of plan.fieldClearingSurveys) {
    const boundary = plan.fieldBoundaries.find(
        (field) => field.key === survey.boundaryKey,
      ),
      inApron = ({ x, y }) =>
        x >= boundary.x - 2 &&
        x < boundary.x + boundary.w + 2 &&
        y >= boundary.y - 2 &&
        y < boundary.y + boundary.h + 2,
      surveyed = new Set(survey.treeCells.map((tree) => `${tree.x},${tree.y}`));
    assert.equal(boundary.clearance, 2);
    assert.equal(survey.clearanceRadius, 2);
    assert.ok(survey.treeCells.some((tree) => tree.clearanceTree));
    assert.ok(
      trees
        .filter(inApron)
        .every((tree) => surveyed.has(`${tree.x},${tree.y}`)),
    );
  }
});

test("R4 a core-ready farm clears its apron before the first field fence", () => {
  const state = newRogueRun(input);
  state.village.facilities.push("lumber_yard");
  stock(state, "lumber_yard_lumber").quantity = 500;
  applyRogueTurn(state, { kind: "wait" });
  const farm = state.village.jobs.find(
    (job) => job.jobType === "build_farmstead",
  );
  for (const element of farm.plan.constructionWork.elements)
    if (element.enclosurePurpose !== "field") element.status = "complete";
  applyRogueTurn(state, { kind: "wait" });
  const fences = farm.plan.constructionWork.elements.filter(
      (element) =>
        element.kind === "fence" && element.enclosurePurpose === "field",
    ),
    clearing = state.village.jobs.filter(
      (job) => job.jobType === "clear_field_tree" && job.status !== "cancelled",
    );
  assert.ok(farm);
  assert.ok(fences.every((element) => element.status !== "complete"));
  assert.ok(clearing.length > 0);
  assert.ok(clearing.every((job) => job.plan.fieldBoundaryKey));
});

test("R1 Unity shows surveyed field boundaries without hiding their trees", () => {
  const state = newRogueRun(input);
  applyRogueTurn(state, { kind: "wait" });
  const plan = state.village.development.masterPlan,
    view = rogueUnityView(state),
    designated = view.map.cells.filter((cell) => cell.fieldDesignationId);
  assert.equal(
    designated.length,
    plan.fieldBoundaries.reduce((total, field) => total + field.w * field.h, 0),
  );
  assert.ok(designated.some((cell) => cell.fieldDesignationEdgeMask > 0));
  assert.ok(
    designated.some(
      (cell) => cell.fieldDesignationTree && cell.tile === "outdoor_tree",
    ),
  );
});

test("R1 survival specialists work food and fire before every axe is staffed", () => {
  const state = newRogueRun(input);
  let timberJobs = [];
  for (let turn = 0; turn < 80; turn += 1) {
    applyRogueTurn(state, { kind: "wait" });
    timberJobs = state.village.jobs.filter(
      (job) =>
        job.jobType === "fell_tree" &&
        job.assignedActorId &&
        !["completed", "cancelled"].includes(job.status),
    );
    if (timberJobs.length >= 3) break;
  }
  assert.ok(timberJobs.length >= 1 && timberJobs.length < 3);
  assert.equal(
    new Set(timberJobs.map((job) => job.assignedActorId)).size,
    timberJobs.length,
  );
  assert.equal(
    new Set(
      timberJobs.map(
        (job) => `${job.targetPosition.x},${job.targetPosition.y}`,
      ),
    ).size,
    timberJobs.length,
  );
  assert.ok(
    state.village.jobs.some(
      (job) =>
        ["build_campfire", "catch_fish", "hunt_game"].includes(job.jobType) &&
        job.assignedActorId,
    ),
  );
});

test("M-11.1 founding crews sustain an overlapping skill pipeline", () => {
  const state = newRogueRun(input);
  stock(state, "lumber_camp_logs").quantity = 100;
  const recent = new Map();
  let proof;
  for (let turn = 0; turn < 500 && !proof; turn += 1) {
    satisfyFounders(state);
    applyRogueTurn(state, { kind: "wait" });
    const active = state.village.jobs.filter((job) => job.status === "active"),
      cutting = active.find(
        (job) =>
          job.jobType === "fell_tree" &&
          state.village.npcStates.find(
            (actor) => actor.id === job.assignedActorId,
          )?.personKey === "woodcutter",
      ),
      hauling = active.find((job) => job.plan?.constructionDelivery),
      building = active.find(
        (job) => job.plan?.projectAssist || job.jobType === "build_lumber_yard",
      );
    if (cutting) recent.set("cutting", { job: cutting, turn });
    if (hauling) recent.set("hauling", { job: hauling, turn });
    if (building) recent.set("building", { job: building, turn });
    const observations = [...recent.values()],
      span =
        Math.max(...observations.map((item) => item.turn)) -
        Math.min(...observations.map((item) => item.turn));
    if (observations.length === 3 && span <= 30)
      proof = Object.fromEntries(
        [...recent].map(([key, value]) => [key, value.job]),
      );
  }
  assert.ok(proof);
  const actorFor = (job) =>
    state.village.npcStates.find((actor) => actor.id === job.assignedActorId);
  assert.equal(actorFor(proof.cutting).personKey, "woodcutter");
  assert.ok(["porter", "carter"].includes(actorFor(proof.hauling).personKey));
  assert.ok(actorFor(proof.building).capabilityTags.includes("build"));
  assert.notEqual(actorFor(proof.building).personKey, "woodcutter");
  assert.equal(proof.hauling.requiredCapabilities.includes("haul"), true);
  assert.equal(proof.building.requiredCapabilities.includes("build"), true);
  assert.equal(
    new Set([
      proof.cutting.assignedActorId,
      proof.hauling.assignedActorId,
      proof.building.assignedActorId,
    ]).size,
    3,
  );
});

test("M-11.1 production visibly collects, carries, uses, and returns tools", () => {
  const state = newRogueRun(input),
    woodcutter = state.village.npcStates.find(
      (resident) => resident.personKey === "woodcutter",
    );
  let collectedJob,
    visibleCarry = false;
  for (let turn = 0; turn < 400; turn += 1) {
    applyRogueTurn(state, { kind: "wait" });
    collectedJob ??= state.village.jobs.find(
      (job) =>
        job.jobType === "fell_tree" &&
        job.production.inputs.some((entry) => entry.carriedQuantity > 0),
    );
    if (woodcutter.carriedItem)
      visibleCarry ||= rogueUnityView(state).map.cells.some(
        (cell) =>
          cell.entityId === woodcutter.id &&
          cell.entityCarryingKind === "hand_axe",
      );
    if (collectedJob?.status === "completed") break;
  }
  assert.ok(collectedJob);
  assert.equal(collectedJob.status, "completed");
  assert.equal(collectedJob.production.inputs[0].carriedQuantity, 0);
  assert.equal(woodcutter.carriedItem, null);
  assert.equal(visibleCarry, true);
  assert.ok(
    state.village.jobs.some(
      (job) => job.jobType === "fell_tree" && job.production.outputCreated,
    ),
  );
});

test("R1 full forestry output releases its worker and reusable axe", () => {
  const state = newRogueRun(input),
    woodcutter = state.village.npcStates.find(
      (resident) => resident.personKey === "woodcutter",
    );
  let job;
  for (let turn = 0; turn < 200 && !job; turn += 1) {
    satisfyFounders(state);
    placeAssignedWorkers(state, ["fell_tree"]);
    applyRogueTurn(state, { kind: "wait" });
    job = state.village.jobs.find(
      (candidate) =>
        candidate.jobType === "fell_tree" &&
        candidate.status === "active" &&
        woodcutter.carriedItem,
    );
  }
  assert.ok(job);
  const logs = stock(state, "lumber_camp_logs");
  logs.quantity = logs.capacity;
  job.progress.completed = job.progress.total - 0.6;
  for (let turn = 0; turn < 5 && !job.blockingReason; turn += 1) {
    placeAssignedWorkers(state, ["fell_tree"]);
    applyRogueTurn(state, { kind: "wait" });
  }
  assert.equal(job.blockingReason, "production_output_full");
  assert.equal(job.assignedActorId, null);
  assert.ok(
    job.production.inputs
      .filter((entry) => !entry.consume)
      .every((entry) => entry.carriedQuantity === 0),
  );
  assert.equal(
    state.village.reservations.some(
      (reservation) =>
        reservation.jobId === job.id && reservation.state === "active",
    ),
    false,
  );
});

test("M-11.1 sawyers collect both a log and a shared saw before production", () => {
  const state = newRogueRun(input);
  state.village.facilities.push("lumber_yard");
  stock(state, "lumber_camp_logs").quantity = 5;
  satisfyFounders(state);
  for (let turn = 0; turn < 180; turn += 1) {
    satisfyFounders(state);
    placeAssignedWorkers(state, ["saw_lumber"]);
    applyRogueTurn(state, { kind: "wait" });
    if (stock(state, "lumber_yard_lumber").quantity >= 5) break;
  }
  const job = state.village.jobs.find(
    (candidate) => candidate.jobType === "saw_lumber",
  );
  for (let turn = 0; turn < 20 && job.status !== "completed"; turn += 1) {
    placeAssignedWorkers(state, ["saw_lumber"]);
    applyRogueTurn(state, { kind: "wait" });
  }
  assert.equal(stock(state, "lumber_yard_lumber").quantity, 5);
  assert.ok(
    job.production.inputs.every((input) => input.carriedQuantity === 0),
  );
  assert.equal(stock(state, "founding_saws").quantity, 2);
});

test("M-11.1 both founding saws keep construction lumber flowing", () => {
  const state = newRogueRun(input);
  state.village.facilities.push("lumber_yard");
  stock(state, "lumber_camp_logs").quantity = 20;
  satisfyFounders(state);
  applyRogueTurn(state, { kind: "wait" });
  const sawJobs = state.village.jobs.filter(
    (job) =>
      job.jobType === "saw_lumber" &&
      !["completed", "cancelled"].includes(job.status),
  );
  assert.equal(
    sawJobs.length,
    2,
    JSON.stringify(
      state.village.jobs.filter((job) => job.jobType === "saw_lumber"),
    ),
  );
  assert.deepEqual(sawJobs.map((job) => job.plan.parallelSlot).sort(), [0, 1]);
  assert.equal(new Set(sawJobs.map((job) => job.targetPosition.x)).size, 2);
  assert.equal(new Set(sawJobs.map((job) => job.assignedActorId)).size, 2);
});

test("R1 portable saws bootstrap the lumber workshop from raw logs", () => {
  const state = newRogueRun(input);
  stock(state, "lumber_camp_logs").quantity = 20;
  stock(state, "lumber_yard_lumber").quantity = 0;
  satisfyFounders(state);

  applyRogueTurn(state, { kind: "wait" });

  const sawJobs = state.village.jobs.filter(
    (job) =>
      job.jobType === "saw_lumber" &&
      !["completed", "cancelled"].includes(job.status),
  );
  assert.equal(state.village.facilities.includes("lumber_yard"), false);
  assert.equal(sawJobs.length, 2);
  assert.deepEqual(sawJobs.map((job) => job.plan.parallelSlot).sort(), [0, 1]);
});

test("M-11.1 loaded founders retire obsolete saw assignments", () => {
  const state = newRogueRun(input);
  state.village.facilities.push("lumber_yard");
  stock(state, "lumber_camp_logs").quantity = 20;
  satisfyFounders(state);
  applyRogueTurn(state, { kind: "wait" });
  const job = state.village.jobs.find((item) => item.jobType === "saw_lumber"),
    prior = state.village.npcStates.find(
      (actor) => actor.id === job.assignedActorId,
    ),
    outsider = state.village.npcStates.find(
      (actor) => actor.personKey === "fisher",
    );
  prior.workState = "available";
  outsider.capabilityTags.push("saw");
  outsider.workPermissions.allowedJobTypes.push("saw_lumber");
  outsider.workState = "available";
  job.assignedActorId = outsider.id;
  job.status = "suspended";
  const restored = parseRogueState(serializeRogueState(state)),
    restoredOutsider = restored.village.npcStates.find(
      (actor) => actor.personKey === "fisher",
    ),
    restoredJob = restored.village.jobs.find((item) => item.id === job.id);
  assert.equal(restoredOutsider.capabilityTags.includes("saw"), false);
  applyRogueTurn(restored, { kind: "wait" });
  assert.equal(restoredJob.status, "cancelled");
  assert.equal(restoredOutsider.workState, "available");
});

test("M-11.1 the fishing jetty borders a visible impassable river", () => {
  const state = newRogueRun(input),
    view = rogueUnityView(state),
    jetty = view.map.cells.find((cell) => cell.x === -1 && cell.y === 15),
    water = view.map.cells.find((cell) => cell.x === 0 && cell.y === 16);
  assert.equal(jetty.variant, "jetty");
  assert.deepEqual(
    { width: jetty.objectWidth, height: jetty.objectHeight },
    { width: 1, height: 3 },
  );
  assert.equal(water.tile, "outdoor_water");
  assert.equal(water.variant, "river_pool");
  assert.equal(villageMovementCost(water.tile), null);
});

test("R1 fishing requires a pier position beside an actual water cell", () => {
  const state = newRogueRun(input);
  satisfyFounders(state);
  for (let turn = 0; turn < 80; turn += 1) {
    applyRogueTurn(state, { kind: "wait" });
    const job = state.village.jobs.find(
      (candidate) =>
        candidate.jobType === "catch_fish" &&
        !["completed", "cancelled"].includes(candidate.status),
    );
    if (job?.progress.completed > 0) break;
  }
  const job = state.village.jobs.find(
      (candidate) =>
        candidate.jobType === "catch_fish" &&
        !["completed", "cancelled"].includes(candidate.status),
    ),
    fisher = state.village.npcStates.find(
      (actor) => actor.personKey === "fisher",
    ),
    view = rogueUnityView(state),
    water = view.map.cells.find(
      (cell) =>
        cell.x === job.targetPosition.x && cell.y === job.targetPosition.y,
    );
  assert.equal(water.tile, "outdoor_water");
  assert.deepEqual(job.plan.fishingPosition, { x: -1, y: 16 });
  assert.deepEqual(fisher.position, job.plan.fishingPosition);
  assert.ok(job.progress.completed > 0);
});

test("R1 landed fish can be hauled while the fisher keeps working", () => {
  const state = newRogueRun(input);
  satisfyFounders(state);
  for (let turn = 0; turn < 80; turn += 1) {
    applyRogueTurn(state, { kind: "wait" });
    const fishing = state.village.jobs.find(
      (job) => job.jobType === "catch_fish" && job.status === "active",
    );
    if (fishing) break;
  }
  const fishing = state.village.jobs.find(
    (job) => job.jobType === "catch_fish" && job.status === "active",
  );
  stock(state, "river_catch").quantity = 1;
  for (let turn = 0; turn < 8; turn += 1)
    applyRogueTurn(state, { kind: "wait" });
  const hauling = state.village.jobs.find(
    (job) =>
      job.transfer?.sourceStockpileId === stock(state, "river_catch").id &&
      ["reserved", "active", "completed"].includes(job.status),
  );
  assert.ok(fishing);
  assert.ok(hauling);
});

test("R1 landed food delivery outranks future crop work in a shortage", () => {
  const state = newRogueRun(input);
  satisfyFounders(state);
  state.village.facilities.push("farmstead");
  establishSeasonalPlanting(state);
  emptyFoodReserve(state);
  stock(state, "river_catch").quantity = 1;
  applyRogueTurn(state, { kind: "wait" });
  const hauling = state.village.jobs.find(
    (job) =>
      job.transfer?.sourceStockpileId === stock(state, "river_catch").id &&
      !["cancelled", "completed"].includes(job.status),
  );
  assert.equal(hauling.plan.emergencyFoodDuty, true);
  assert.ok(["reserved", "active"].includes(hauling.status));
  assert.ok(hauling.assignedActorId);
});

test("R1 a loaded grass-fishing job retargets to water and pier", () => {
  const state = newRogueRun(input);
  applyRogueTurn(state, { kind: "wait" });
  const job = state.village.jobs.find(
    (candidate) => candidate.jobType === "catch_fish",
  );
  job.targetPosition = { x: -1, y: 16 };
  delete job.plan.waterHarvest;
  delete job.plan.fishingPosition;
  applyRogueTurn(state, { kind: "wait" });
  assert.deepEqual(job.targetPosition, { x: 0, y: 16 });
  assert.deepEqual(job.plan.fishingPosition, { x: -1, y: 16 });
  assert.equal(job.plan.waterHarvest, true);
});

test("R1 fishing selects a free river bank when the primary pier is occupied", () => {
  const state = newRogueRun(input),
    blocker = state.village.npcStates.find(
      (actor) => actor.personKey === "woodcutter",
    );
  blocker.position = { x: -1, y: 16 };

  applyRogueTurn(state, { kind: "wait" });

  const job = state.village.jobs.find(
    (candidate) => candidate.jobType === "catch_fish",
  );
  assert.deepEqual(job.targetPosition, { x: 0, y: 16 });
  assert.deepEqual(job.plan.fishingPosition, { x: 0, y: 15 });
});

test("R8.5 fishing follows the generated regional river instead of the legacy pond", () => {
  const state = newRogueRun({
    ...input,
    runId: "28208d84-fd1a-4b10-b2cc-db1357c95670",
    seed: "stonebridge-work-queue-proof-reeve-20261005",
    worldGeneration: "regional_v3",
  });

  applyRogueTurn(state, { kind: "wait" });

  const job = state.village.jobs.find(
      (candidate) => candidate.jobType === "catch_fish",
    ),
    origin = state.village.development.masterPlan.regionalContext.site.origin,
    waterPosition = {
      x: job.targetPosition.x + origin.x,
      y: job.targetPosition.y + origin.y,
    },
    bankPosition = {
      x: job.plan.fishingPosition.x + origin.x,
      y: job.plan.fishingPosition.y + origin.y,
    },
    view = rogueUnityView(state, [], { villageCenter: waterPosition }),
    water = view.map.cells.find(
      (cell) => cell.x === waterPosition.x && cell.y === waterPosition.y,
    ),
    bank = view.map.cells.find(
      (cell) => cell.x === bankPosition.x && cell.y === bankPosition.y,
    ),
    jetty = state.village.fixtures.find(
      (fixture) => fixture.role === "fishing_jetty",
    ),
    legacyPosition = { x: origin.x - 1, y: origin.y + 15 },
    legacyView = rogueUnityView(state, [], {
      villageCenter: legacyPosition,
    }),
    legacy = legacyView.map.cells.find(
      (cell) => cell.x === legacyPosition.x && cell.y === legacyPosition.y,
    );
  assert.equal(water.tile, "village_furniture");
  assert.equal(water.groundTile, "outdoor_water");
  assert.equal(water.variant, "jetty");
  assert.notEqual(bank.tile, "outdoor_water");
  assert.deepEqual({ x: jetty.x, y: jetty.y }, job.targetPosition);
  assert.deepEqual(jetty.bankPosition, job.plan.fishingPosition);
  assert.notEqual(legacy?.variant, "jetty");
  assert.notDeepEqual(job.targetPosition, { x: 0, y: 16 });
});

test("M-11.1 every founder has purposeful work or a civic duty", () => {
  const state = newRogueRun(input),
    startingPositions = new Map(
      state.village.npcStates.map((resident) => [
        resident.id,
        { ...resident.position },
      ]),
    ),
    worked = new Set();
  for (let turn = 0; turn < 12; turn += 1) {
    applyRogueTurn(state, { kind: "wait" });
    for (const job of state.village.jobs)
      if (["reserved", "active", "completed"].includes(job.status))
        worked.add(job.assignedActorId);
  }
  const openSurveys = state.village.jobs.filter(
    (job) =>
      job.plan?.constructionSurvey &&
      !["completed", "cancelled"].includes(job.status),
  );
  assert.equal(
    new Set(openSurveys.map((job) => job.targetId)).size,
    openSurveys.length,
  );
  const cells = rogueUnityView(state).map.cells;
  for (const resident of state.village.npcStates) {
    const civicDuty = ["reeve", "watchman"].includes(resident.personKey),
      activeJob = state.village.jobs.find(
        (job) =>
          job.assignedActorId === resident.id &&
          ["reserved", "active"].includes(job.status),
      );
    assert.ok(
      civicDuty || worked.has(resident.id),
      `${resident.name} has no purpose`,
    );
    if (worked.has(resident.id))
      assert.ok(
        resident.position.x !== startingPositions.get(resident.id).x ||
          resident.position.y !== startingPositions.get(resident.id).y ||
          state.village.jobs.some(
            (job) =>
              job.assignedActorId === resident.id &&
              job.targetPosition?.x === resident.position.x &&
              job.targetPosition?.y === resident.position.y,
          ),
        `${resident.name} neither travelled nor worked at their station`,
      );
    const cell = cells.find((candidate) => candidate.entityId === resident.id);
    assert.equal(cell?.entityWorking, resident.workState === "working");
  }
});

test("R8 unassigned founders report truthful survival standby", () => {
  const state = newRogueRun(input),
    resident = state.village.npcStates.find(
      (candidate) => candidate.personKey === "herbalist",
    );
  resident.capabilityTags = [];
  resident.workPermissions.allowedJobTypes = [];
  satisfyFounders(state);
  applyRogueTurn(state, { kind: "wait" });
  assert.equal(resident.workState, "available");
  assert.equal(
    resident.currentAction,
    "Awaiting the next survival assignment at camp",
  );
  assert.equal(resident.actionReason, "founding_standby");
});

test("S0 construction assistance always targets a persistent element", () => {
  const state = newRogueRun(input);
  for (let turn = 0; turn < 300; turn += 1) {
    placeAssignedWorkers(state, [
      "build_lumber_yard",
      "assist_project",
      "deliver_goods",
    ]);
    applyRogueTurn(state, { kind: "wait" });
  }
  assert.equal(stock(state, "settlement_labor"), undefined);
  assert.equal(
    state.village.jobs.some((job) => job.plan?.communityLabor),
    false,
  );
  for (const assist of state.village.jobs.filter(
    (job) => job.plan?.projectAssist,
  )) {
    const parent = state.village.jobs.find(
      (job) => job.id === assist.plan.parentJobId,
    );
    assert.ok(assist.plan.constructionElementKey);
    assert.ok(
      parent?.plan?.constructionWork?.elements.some(
        (element) => element.key === assist.plan.constructionElementKey,
      ),
    );
  }
});

test("S5 a construction parent never preempts its own helper", () => {
  const { state, parent, assist } = selfPreemptionFixture();
  satisfyFounders(state);
  applyRogueTurn(state, { kind: "wait" });
  assert.notEqual(assist.suspendedByJobId, parent.id);
  assert.notEqual(assist.status, "suspended");
});

test("R8.5 survival preemption releases a helper's construction cell", () => {
  const { state, parent, assist } = selfPreemptionFixture(),
    actor = state.village.npcStates.find(
      (resident) => resident.id === assist.assignedActorId,
    ),
    element = parent.plan.constructionWork.elements.find(
      (item) => item.key === assist.plan.constructionElementKey,
    );
  satisfyFounders(state);
  actor.life.needs.hunger = 10;

  applyRogueTurn(state, { kind: "wait" });

  assert.equal(assist.status, "suspended");
  assert.equal(element.claimedByAssistJobId, undefined);
});

test("M-11.1 founding identity and empty architecture survive save migration", () => {
  const state = newRogueRun(input),
    restored = parseRogueState(serializeRogueState(state));
  assert.equal(restored.village.scenario, "founding");
  assert.equal(restored.village.npcStates.length, 10);
  assert.deepEqual(restored.village.buildings, []);
  assert.deepEqual(restored.village.doors, []);
  assert.deepEqual(restored.village.households, state.village.households);
});

test("M-11.1 completed facility flags migrate into visible buildings", () => {
  const state = newRogueRun(input);
  state.village.facilities.push("lumber_yard", "farmstead");
  const restored = parseRogueState(serializeRogueState(state));

  assert.deepEqual(
    restored.village.buildings.map((building) => building.key),
    ["lumber_yard", "farmstead"],
  );
  assert.deepEqual(
    restored.village.doors.map((door) => door.buildingKey),
    ["lumber_yard", "farmstead"],
  );
  assert.equal(villageWorldObjectAt(restored, -34, 13).material, "timber");
});

test("M-11.1 construction raises visible sections one cell at a time", () => {
  const state = newRogueRun(input),
    workers = new Set();
  state.village.facilities.push("lumber_yard", "farmstead");
  establishSeasonalPlanting(state);
  stock(state, "lumber_yard_lumber").quantity = 500;
  satisfyFounders(state);
  let firstCount = 0,
    laterCount = 0;
  for (let turn = 0; turn < 160 && laterCount < 2; turn += 1) {
    placeAssignedWorkers(state, [
      "build_house",
      "assist_project",
      "deliver_goods",
    ]);
    const result = applyRogueTurn(state, { kind: "wait" });
    for (const event of result.events)
      if (
        [
          "construction_element_started",
          "construction_element_completed",
        ].includes(event.type) &&
        event.workerId
      )
        workers.add(event.workerId);
    const count = state.village.constructionPrimitives.length;
    if (count && !firstCount) firstCount = count;
    laterCount = Math.max(laterCount, count);
  }
  assert.ok(firstCount >= 1);
  assert.ok(laterCount > firstCount);
  assert.ok(workers.size >= 1);
  assert.equal(
    state.village.buildings.some(
      (building) => building.key === "founder_house_1",
    ),
    false,
  );
});

test("M-11.1 construction plans are visible before materials exist", () => {
  const state = newRogueRun(input);
  stock(state, "lumber_camp_logs").quantity = 0;
  stock(state, "lumber_yard_lumber").quantity = 0;
  applyRogueTurn(state, { kind: "wait" });
  const job = state.village.jobs.find(
      (candidate) => candidate.jobType === "build_lumber_yard",
    ),
    planned = rogueUnityView(state).map.cells.filter(
      (cell) =>
        cell.objectKind?.startsWith("construction_") &&
        cell.constructionStage === "planned",
    );
  assert.ok(job);
  assert.ok(!["completed", "cancelled"].includes(job.status));
  assert.ok(job.plan.constructionWork.elements.length > 20);
  assert.equal(
    planned.length,
    new Set(
      job.plan.constructionWork.elements.map(
        (element) => `${element.position.x},${element.position.y}`,
      ),
    ).size,
  );
  const wallMasks = new Set(
    planned
      .filter((cell) => cell.objectKind === "construction_wall")
      .map((cell) => cell.visualConnectionMask),
  );
  assert.ok(wallMasks.has(10));
  assert.ok(wallMasks.has(5));
  assert.ok([...wallMasks].some((mask) => ![0, 5, 10].includes(mask)));
  assert.equal(
    job.plan.constructionWork.elements.every(
      (element) => element.materialDeliveredQuantity === 0,
    ),
    true,
  );
});

test("S1 completed elements become persistent objects immediately", () => {
  const state = newRogueRun(input);
  state.village.facilities.push("lumber_yard", "farmstead");
  establishSeasonalPlanting(state);
  stock(state, "lumber_yard_lumber").quantity = 500;
  satisfyFounders(state);
  let primitive;
  for (let turn = 0; turn < 180 && !primitive; turn += 1) {
    placeAssignedWorkers(state, [
      "build_house",
      "assist_project",
      "deliver_goods",
    ]);
    applyRogueTurn(state, { kind: "wait" });
    const planned = state.village.jobs.find(
      (item) => item.jobType === "build_house",
    );
    if (
      planned &&
      !state.village.modifications.some((item) => item.testConstructionStump)
    )
      for (const item of planned.plan.constructionWork.elements)
        state.village.modifications.push({
          kind: "tree_stump",
          x: item.position.x,
          y: item.position.y,
          originalTile: "outdoor_tree",
          testConstructionStump: true,
        });
    primitive = state.village.constructionPrimitives[0];
  }
  const job = state.village.jobs.find((item) => item.jobType === "build_house"),
    element = job.plan.constructionWork.elements.find(
      (item) => item.id === primitive?.id,
    ),
    materials = state.village.constructionMaterials.filter(
      (item) => item.elementId === element?.id,
    ),
    object = villageWorldObjectAt(
      state,
      primitive?.position.x,
      primitive?.position.y,
      false,
    );
  assert.match(primitive.id, /^[0-9a-f]{8}-[0-9a-f-]{27}$/);
  assert.equal(element.status, "complete");
  assert.equal(object.objectKind, primitive.kind);
  assert.equal(object.id, primitive.id);
  assert.equal(
    state.village.modifications.some(
      (item) =>
        item.kind === "tree_stump" &&
        item.x === primitive.position.x &&
        item.y === primitive.position.y,
    ),
    false,
  );
  assert.ok(materials.length > 0);
  assert.ok(materials.every((item) => item.state === "consumed"));
  assert.equal(
    materials.reduce((total, item) => total + item.quantity, 0),
    element.materialRequired,
  );
  const restored = parseRogueState(serializeRogueState(state));
  assert.equal(restored.village.constructionPrimitives[0].id, primitive.id);
  assert.deepEqual(
    restored.village.constructionMaterials.map((item) => item.id),
    state.village.constructionMaterials.map((item) => item.id),
  );
});

test("S1 one finished fixture is usable before its house is commissioned", () => {
  const state = newRogueRun(input);
  state.village.facilities.push("lumber_yard", "farmstead");
  establishSeasonalPlanting(state);
  stock(state, "lumber_yard_lumber").quantity = 500;
  let fixture, job;
  for (let turn = 0; turn < 2200 && !fixture; turn += 1) {
    satisfyFounders(state);
    placeAssignedWorkers(state, ["build_house", "deliver_goods"]);
    applyRogueTurn(state, { kind: "wait" });
    job = state.village.jobs.find(
      (candidate) =>
        candidate.jobType === "build_house" && candidate.status !== "completed",
    );
    const fixtureElement = job?.plan.constructionWork.elements.find(
      (element) => element.kind === "fixture" && element.status === "complete",
    );
    fixture = state.village.fixtures.find(
      (candidate) => candidate.id === fixtureElement?.id,
    );
  }
  const element = job.plan.constructionWork.elements.find(
      (item) => item.id === fixture?.id,
    ),
    object = villageWorldObjectAt(state, fixture?.x, fixture?.y, false);
  assert.ok(fixture);
  assert.equal(element.status, "complete");
  assert.equal(
    object.id,
    fixture.id,
    JSON.stringify({ fixture, object, element }),
  );
  assert.ok(
    ["bed", "meal", "storage", "seat", "fixture"].includes(object.objectKind),
  );
  assert.equal(job.status === "completed", false);
  assert.equal(state.village.residences.length, 0);
  const building = state.village.buildings.find(
    (candidate) => candidate.id === fixture.buildingId,
  );
  assert.ok(
    building,
    JSON.stringify(
      job.plan.constructionWork.elements
        .filter((candidate) =>
          ["door", "wall", "roof"].includes(candidate.kind),
        )
        .map((candidate) => ({ key: candidate.key, status: candidate.status })),
    ),
  );
  assert.equal(building.status, "enclosed");
  assert.deepEqual(
    building.evidenceIds,
    job.plan.constructionWork.elements
      .filter((candidate) => ["wall", "door"].includes(candidate.kind))
      .map((candidate) => candidate.id),
  );
  assert.ok(
    job.plan.constructionWork.elements.some(
      (candidate) => candidate.status !== "complete",
    ),
  );
});

test("M-11.1 haulers supply builders before they raise one real element", () => {
  const state = newRogueRun(input),
    deliveries = [];
  state.village.facilities.push("lumber_yard", "farmstead");
  establishSeasonalPlanting(state);
  stock(state, "lumber_yard_lumber").quantity = 200;
  satisfyFounders(state);
  let started = null;
  for (let turn = 0; turn < 120 && !started; turn += 1) {
    placeAssignedWorkers(state, [
      "build_house",
      "assist_project",
      "deliver_goods",
    ]);
    const result = applyRogueTurn(state, { kind: "wait" });
    deliveries.push(
      ...result.events.filter(
        (event) => event.type === "construction_material_delivered",
      ),
    );
    started = result.events.find(
      (event) => event.type === "construction_element_started",
    );
    if (!started) {
      const construction = rogueUnityView(state).map.cells.filter(
        (cell) => cell.tile === "village_construction",
      );
      assert.ok(construction.length > 0);
      assert.ok(
        construction.every((cell) =>
          ["planned", "material_delivered"].includes(cell.constructionStage),
        ),
      );
    }
  }
  const job = state.village.jobs.find(
    (candidate) => candidate.jobType === "build_house",
  );
  const startedElement = job.plan.constructionWork.elements.find(
      (element) => element.key === started.elementKey,
    ),
    startedObject = villageWorldObjectAt(
      state,
      started.position.x,
      started.position.y,
      false,
    );
  assert.equal(startedObject.id, startedElement.id);
  const startedCell = rogueUnityView(state).map.cells.find(
    (cell) =>
      cell.x === started.position.x &&
      cell.y === started.position.y &&
      cell.tile === "village_construction",
  );
  assert.ok(startedCell);
  assert.equal(startedCell.constructionStage, "in_progress");
  assert.equal(
    startedCell.constructionLaborRequired,
    startedElement.laborRequired,
  );
  assert.equal(
    startedCell.constructionLaborCompleted,
    startedElement.laborCompleted,
  );
  assert.ok(deliveries.length >= 1);
  assert.ok(
    deliveries.every((event) => {
      const worker = state.village.npcStates.find(
        (resident) => resident.id === event.workerId,
      );
      return worker?.capabilityTags.includes("haul");
    }),
  );
  assert.equal(
    deliveries.every(
      (event) =>
        event.elementDelivered > 0 &&
        event.elementDelivered <= event.elementRequired,
    ),
    true,
  );
  const deliveredKeys = new Set(deliveries.map((event) => event.elementKey));
  const inTransit = state.village.jobs
    .filter((candidate) => candidate.plan?.constructionDelivery)
    .reduce((total, candidate) => total + candidate.plan.carriedQuantity, 0);
  assert.equal(
    stock(state, "lumber_yard_lumber").quantity + inTransit,
    200 - (job.production.inputs[0].deliveredQuantity ?? 0),
  );
  assert.equal(job.production.inputConsumed, true);
  assert.equal(
    job.plan.constructionWork.elements.filter(
      (element) => element.materialDelivered,
    ).length,
    [...deliveredKeys].filter((key) =>
      job.plan.constructionWork.elements.find(
        (element) => element.key === key && element.materialDelivered,
      ),
    ).length,
  );
  assert.equal(
    job.plan.constructionWork.elements.filter(
      (element) => element.status !== "planned",
    ).length,
    1,
  );
  assert.equal(
    state.village.buildings.some(
      (building) => building.key === "founder_house_1",
    ),
    false,
  );
});

test("M-11.1 each worker supplies or completes at most one cell per action", () => {
  const state = newRogueRun(input),
    deliveredElements = [],
    deliveryWorkers = new Set();
  state.village.facilities.push("lumber_yard", "farmstead");
  establishSeasonalPlanting(state);
  stock(state, "lumber_yard_lumber").quantity = 500;
  satisfyFounders(state);
  let haulingWhileBuilding = false;
  for (
    let turn = 0;
    turn < 300 && !(deliveredElements.length >= 4 && haulingWhileBuilding);
    turn += 1
  ) {
    placeAssignedWorkers(state, [
      "build_house",
      "assist_project",
      "deliver_goods",
    ]);
    const { events } = applyRogueTurn(state, { kind: "wait" }),
      deliveries = events.filter(
        (event) => event.type === "construction_material_delivered",
      ),
      completions = events.filter(
        (event) => event.type === "construction_element_completed",
      ),
      hauling = events.filter((event) =>
        [
          "construction_material_collected",
          "construction_material_delivered",
        ].includes(event.type),
      ),
      building = events.some((event) =>
        ["construction_element_started", "construction_progress"].includes(
          event.type,
        ),
      );
    assert.equal(
      new Set(deliveries.map((event) => event.workerId)).size,
      deliveries.length,
    );
    assert.equal(
      new Set(completions.map((event) => event.workerId)).size,
      completions.length,
    );
    for (const event of hauling) deliveryWorkers.add(event.workerId);
    haulingWhileBuilding ||= hauling.length > 0 && building;
    if (!deliveries.length) continue;
    deliveredElements.push(...deliveries.map((event) => event.elementKey));
    const job = state.village.jobs.find(
      (candidate) => candidate.jobType === "build_house",
    );
    assert.equal(
      job.plan.constructionWork.elements.filter(
        (element) => element.materialDelivered,
      ).length <= new Set(deliveredElements).size,
      true,
    );
  }
  assert.ok(deliveredElements.length >= 4);
  assert.ok(new Set(deliveredElements).size >= 4);
  assert.ok(deliveryWorkers.size >= 2);
  assert.equal(haulingWhileBuilding, true);
});

test("M-11.1 founders construct a growth-capable home with real beds", () => {
  const state = newRogueRun(input);
  state.village.facilities.push("lumber_yard", "farmstead");
  establishSeasonalPlanting(state);
  stock(state, "lumber_yard_lumber").quantity = 500;
  satisfyFounders(state);
  const completedFounderHome = () =>
    state.village.jobs.some(
      (candidate) =>
        candidate.jobType === "build_house" && candidate.status === "completed",
    );
  for (let turn = 0; turn < 2200 && !completedFounderHome(); turn += 1) {
    satisfyFounders(state);
    placeAssignedWorkers(state, [
      "build_house",
      "assist_project",
      "deliver_goods",
    ]);
    applyRogueTurn(state, { kind: "wait" });
  }
  for (let turn = 0; turn < 20; turn += 1) {
    const job = state.village.jobs.find(
      (candidate) =>
        candidate.jobType === "build_house" && candidate.status !== "completed",
    );
    if (!job) break;
    placeAssignedWorkers(state, ["build_house"]);
    applyRogueTurn(state, { kind: "wait" });
  }
  assert.equal(state.village.residences.length, 1);
  const buildJob = state.village.jobs.find(
    (candidate) =>
      candidate.jobType === "build_house" && candidate.status === "completed",
  );
  const constructionInput = buildJob.production.inputs.find(
    (entry) => entry.consume && entry.requiresPickup,
  );
  assert.equal(constructionInput.deliveredQuantity, constructionInput.quantity);
  assert.ok(stock(state, "lumber_yard_lumber").quantity >= 0);
  const carriedHammers = state.village.npcStates.reduce(
    (total, resident) =>
      total +
      (resident.carriedItem?.itemKind === "claw_hammer"
        ? resident.carriedItem.quantity
        : 0),
    0,
  );
  assert.equal(stock(state, "founding_hammers").quantity + carriedHammers, 2);
  assert.ok(
    buildJob,
    JSON.stringify(
      state.village.jobs
        .filter((candidate) => candidate.jobType === "build_house")
        .map((candidate) => ({
          status: candidate.status,
          step: candidate.plan?.step,
          blockingReason: candidate.blockingReason,
          actor: candidate.assignedActorId,
          destination: candidate.destination,
        })),
    ),
  );
  assert.deepEqual(buildJob.plan.derivedFacts, {
    expected: buildJob.plan.constructionWork.elements.length,
    permanent: buildJob.plan.constructionWork.elements.length,
    roofRequired: true,
    roofed: true,
    complete: true,
  });
  const builtFixtures = buildJob.plan.constructionWork.elements.filter(
      (element) => element.kind === "fixture",
    ),
    residence = state.village.residences.find((candidate) =>
      state.village.buildings
        .find((item) => item.id === candidate.buildingId)
        ?.key.startsWith("founder_house_"),
    ),
    building = state.village.buildings.find(
      (candidate) => candidate.id === residence.buildingId,
    ),
    beds = state.village.fixtures.filter(
      (fixture) => fixture.buildingId === building.id && fixture.role === "bed",
    ),
    table = state.village.fixtures.find(
      (fixture) =>
        fixture.buildingId === building.id && fixture.role === "table",
    ),
    kitchen = state.village.fixtures.find(
      (fixture) =>
        fixture.buildingId === building.id && fixture.role === "kitchen",
    ),
    chairs = state.village.fixtures.filter(
      (fixture) =>
        fixture.buildingId === building.id && fixture.role === "chair",
    ),
    floor = state.village.constructionPrimitives.find(
      (primitive) =>
        primitive.projectId === buildJob.id && primitive.kind === "floor",
    ),
    roof = state.village.constructionPrimitives.find(
      (primitive) =>
        primitive.projectId === buildJob.id && primitive.kind === "roof",
    ),
    roofElement = buildJob.plan.constructionWork.elements.find(
      (element) => element.key === "roof_supported",
    );
  assert.deepEqual(
    { width: building.w, height: building.h },
    { width: 14, height: 10 },
  );
  assert.equal(residence.residentCapacity, 3);
  assert.equal(residence.occupantIds.length, 3);
  assert.equal(residence.householdIds.length, 1);
  assert.equal(residence.householdIds[0], residence.plannedHouseholdId);
  assert.equal(
    builtFixtures.length,
    buildJob.plan.construction.fixtures.length,
  );
  assert.ok(builtFixtures.every((element) => element.status === "complete"));
  assert.equal(beds.length, 3);
  assert.deepEqual(
    new Set(beds.map((bed) => bed.assignedActorId)),
    new Set(residence.occupantIds),
  );
  assert.ok(
    beds.every(
      (bed) =>
        bed.assignmentStatus === "assigned" &&
        bed.assignedHouseholdId === residence.plannedHouseholdId &&
        bed.residenceId === residence.id &&
        bed.walkable === false,
    ),
  );
  assert.ok(
    state.village.npcStates
      .filter((resident) => !residence.occupantIds.includes(resident.id))
      .every(
        (resident) => !beds.some((bed) => bed.assignedActorId === resident.id),
      ),
  );
  assert.equal(chairs.length, 3);
  assert.ok(beds.every((bed) => bed.width === 1 && bed.height === 2));
  assert.ok(floor);
  assert.ok(roof);
  assert.ok(roofElement.deliveryRecords.length > 0);
  assert.ok(
    roofElement.deliveryRecords.every(
      (delivery) =>
        delivery.targetPosition.x === buildJob.plan.construction.door.x &&
        delivery.targetPosition.y === buildJob.plan.construction.door.y,
    ),
  );
  assert.ok(roof.supportIds.length > 0);
  assert.ok(
    roof.supportIds.every((id) =>
      buildJob.plan.constructionWork.elements.some(
        (element) => element.id === id && element.status === "complete",
      ),
    ),
  );
  assert.equal(
    villageWorldObjectAt(state, table.x, table.y, false).objectKind,
    "meal",
  );
  assert.equal(
    villageWorldObjectAt(state, kitchen.x, kitchen.y, false).objectKind,
    "meal",
  );
  assert.ok(
    residence.occupantIds.every(
      (id) =>
        state.village.npcStates.find((resident) => resident.id === id)
          .sleepingLocation,
    ),
  );
  ensureFoundingSleepingPlaces(state);
  assert.ok(
    residence.occupantIds.every((id) => {
      const resident = state.village.npcStates.find((entry) => entry.id === id),
        bed = beds.find((entry) => entry.assignedActorId === id);
      return (
        resident.sleepingLocation.fixtureId === bed.id &&
        resident.sleepingLocation.temporary === false
      );
    }),
  );
  stock(state, "inn_fish").quantity = 1;
  stock(state, "inn_meals").quantity = 0;
  satisfyFounders(state);
  applyRogueTurn(state, { kind: "wait" });
  const cook = state.village.jobs.find(
    (job) => job.jobType === "prepare_meal" && job.status !== "completed",
  );
  assert.ok(
    cook,
    JSON.stringify(
      state.village.jobs
        .filter((job) => job.jobType === "prepare_meal")
        .map((job) => ({ status: job.status, reason: job.blockingReason })),
    ),
  );
  assert.deepEqual(cook.targetPosition, {
    x: kitchen.x + kitchen.width - 1,
    y: kitchen.y + kitchen.height - 1,
  });
  assert.deepEqual(cook.plan.accessPosition, building.door);
  assert.equal(
    cook.targetId,
    villageWorldObjectAt(
      state,
      kitchen.x + kitchen.width - 1,
      kitchen.y + kitchen.height - 1,
      false,
    ).id,
  );
  assert.notEqual(cook.blockingReason, "target_missing");
});

test("R1 housing already underway queues the next household despite low lumber", () => {
  const state = newRogueRun(input);
  state.village.facilities.push("lumber_yard", "farmstead");
  establishSeasonalPlanting(state);
  stock(state, "lumber_yard_lumber").quantity = 500;
  applyRogueTurn(state, { kind: "wait" });
  const first = state.village.jobs.find((job) => job.jobType === "build_house"),
    order = state.village.development.workOrders.find(
      (candidate) => candidate.id === state.village.development.activeOrderId,
    );
  assert.ok(first);
  first.status = "cancelled";
  state.village.residences.push({
    id: "completed-founder-home",
    householdIds: [first.plan.targetHouseholdId],
  });
  state.village.development.activePriority = "food_security";
  order.priorityKey = "food_security";
  state.village.development.nextResidentNeedsReviewAtTick = state.tick + 100;
  stock(state, "lumber_yard_lumber").quantity = 0;
  for (const plot of state.village.cropPlots) {
    plot.stage = "fallow";
    plot.cycle = 0;
  }
  applyRogueTurn(state, { kind: "wait" });
  const next = state.village.jobs.find(
    (job) => job.jobType === "build_house" && job.status !== "cancelled",
  );
  assert.ok(next);
  assert.notEqual(next.plan.targetHouseholdId, first.plan.targetHouseholdId);
  applyRogueTurn(state, { kind: "wait" });
  assert.ok(
    state.village.jobs.some(
      (job) =>
        ["fell_tree", "saw_lumber"].includes(job.jobType) &&
        !["completed", "cancelled"].includes(job.status),
    ),
  );
});

test("M-11.1 work targets the site beneath a passing resident", () => {
  const state = newRogueRun(input),
    passerby = state.village.npcStates.find(
      (resident) => resident.personKey === "porter",
    );
  state.village.facilities.push("lumber_yard", "farmstead");
  establishSeasonalPlanting(state);
  stock(state, "lumber_yard_lumber").quantity = 20;
  satisfyFounders(state);
  const probe = parseRogueState(serializeRogueState(state));
  applyRogueTurn(probe, { kind: "wait" });
  const target = probe.village.jobs.find(
    (candidate) => candidate.jobType === "build_house",
  ).targetPosition;
  passerby.position = { ...target };
  applyRogueTurn(state, { kind: "wait" });
  const job = state.village.jobs.find(
    (candidate) => candidate.jobType === "build_house",
  );
  assert.ok(job);
  assert.notEqual(job.targetId, passerby.id);
  assert.equal(
    job.targetId,
    villageWorldObjectAt(state, target.x, target.y, false).id,
  );
});

test("M-11.1 founders can restore social connection and morale at camp", () => {
  const state = newRogueRun(input),
    socialActor = state.village.npcStates[0],
    moraleActor = state.village.npcStates.at(-1),
    satisfied = new Set();
  satisfyFounders(state);
  socialActor.life.needs.social = 0;
  moraleActor.life.needs.morale = 0;
  for (let turn = 0; turn < 600; turn += 1) {
    Object.assign(socialActor.life.needs, {
      hunger: 100,
      fatigue: 100,
      safety: 100,
      morale: 100,
    });
    Object.assign(moraleActor.life.needs, {
      hunger: 100,
      fatigue: 100,
      safety: 100,
      social: 100,
    });
    const { events } = applyRogueTurn(state, { kind: "wait" });
    for (const event of events)
      if (event.type === "need_satisfied") satisfied.add(event.need);
    if (satisfied.has("social") && satisfied.has("morale")) break;
  }
  assert.ok(satisfied.has("social"));
  assert.ok(satisfied.has("morale"));
  assert.ok(socialActor.life.needs.social > 0);
  assert.ok(moraleActor.life.needs.morale > 0);
});
