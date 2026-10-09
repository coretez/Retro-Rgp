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
  createJob,
  transitionJob,
} from "../src/job-board.js";
import { namedUuid } from "../src/identity.js";
import {
  RELEASE_PROOF_SEEDS,
  runSchedulerTimingProof,
  villageResourceVisibilityAudit,
} from "../src/village-proof.js";
import { VILLAGE_POPULATION_GROWTH_ENABLED } from "../src/village-simulation.js";

const input = {
  requestId: "r7-release-regression",
  runId: "9fd7aeca-560c-5fdc-a430-cfddfdc54211",
  seed: "r7-release-regression",
  heroName: "Mara",
  heroClass: "fighter",
  form: "hybrid",
  size: "small",
  levels: 3,
  scenario: "founding",
};

test("R7 release inputs are ten unique seeds with population growth disabled", () => {
  assert.equal(RELEASE_PROOF_SEEDS.length, 10);
  assert.equal(new Set(RELEASE_PROOF_SEEDS).size, 10);
  assert.equal(VILLAGE_POPULATION_GROWTH_ENABLED, false);
});

test("R7 scheduler proof enforces its throughput budget", () => {
  const proof = runSchedulerTimingProof({
    input,
    dayTicks: 1,
    minimumTicksPerSecond: Number.MAX_VALUE,
  });
  assert.equal(proof.passed, false);
  assert.ok(proof.failures.includes("simulation_throughput_below_budget"));
});

test("R7 a live founding tick and its save/load round-trip are exact", () => {
  const state = newRogueRun(input);
  applyRogueTurn(state, { kind: "wait" });
  for (const resident of state.village.npcStates)
    assert.equal(
      resident.workPermissions.allowedJobTypes.length,
      new Set(resident.workPermissions.allowedJobTypes).size,
    );
  const before = serializeRogueState(state),
    restored = parseRogueState(structuredClone(before));
  assert.deepEqual(serializeRogueState(restored), before);
});

test("R7 save/load retains gates and doors not yet owned by derived buildings", () => {
  const state = newRogueRun(input),
    gateId = namedUuid(state.id, "release-test-gate"),
    futureDoorId = namedUuid(state.id, "release-test-future-door");
  state.village.doors.push(
    {
      id: gateId,
      entityType: "gate",
      objectKind: "gate",
      pastureKey: "release_test_pasture",
      x: -24,
      y: 26,
      material: "timber",
      state: "open",
    },
    {
      id: futureDoorId,
      entityType: "door",
      objectKind: "door",
      buildingKey: "future_release_house",
      x: -20,
      y: 8,
      material: "wood",
      state: "open",
    },
  );
  const restored = parseRogueState(serializeRogueState(state)),
    ids = new Set(restored.village.doors.map((door) => door.id));
  assert.ok(ids.has(gateId));
  assert.ok(ids.has(futureDoorId));
});

test("R7 every co-located stockpile remains inspectable in the Unity projection", () => {
  const state = newRogueRun(input);
  state.location = "village";
  const projectedIds = new Set(
      rogueUnityView(state).map.cells.flatMap(
        (cell) => cell.stockpileIds ?? [],
      ),
    ),
    stockedIds = state.village.stockpiles
      .filter((stockpile) => stockpile.quantity > 0)
      .map((stockpile) => stockpile.id);
  assert.ok(stockedIds.length > 1);
  assert.ok(stockedIds.every((id) => projectedIds.has(id)));
});

test("R7 carried resources remain visible on their owning founder", () => {
  const state = newRogueRun(input),
    founder = state.village.npcStates[0];
  founder.position = { x: 120, y: -80 };
  founder.carriedItem = {
    id: namedUuid(state.id, "release-test-carried-timber"),
    itemKind: "timber",
    name: "Timber",
    quantity: 1,
  };
  const visibility = villageResourceVisibilityAudit(state);
  assert.equal(visibility.passed, true);
  assert.deepEqual(visibility.hiddenCarriedItems, []);
});

test("R7 a carrier remains the visible actor during temporary co-location", () => {
  const state = newRogueRun(input),
    resident = state.village.npcStates[0],
    carrier = state.village.npcStates[1];
  carrier.position = { ...resident.position };
  carrier.carriedItem = {
    id: namedUuid(state.id, "release-test-co-located-timber"),
    itemKind: "timber",
    name: "Timber",
    quantity: 1,
  };
  const cell = rogueUnityView(state).map.cells.find(
    (candidate) =>
      candidate.x === carrier.position.x && candidate.y === carrier.position.y,
  );
  assert.equal(cell.entityId, carrier.id);
  assert.equal(cell.entityCarryingKind, "timber");
  assert.equal(villageResourceVisibilityAudit(state).passed, true);
});

test("R7 survival housing does not release its builder back to a hungry farm", () => {
  const state = newRogueRun(input),
    farmer = state.village.npcStates.find(
      (resident) => resident.personKey === "farmer",
    ),
    { job } = createJob(state, {
      jobType: "build_house",
      name: "Release-test house",
      priority: 100,
      targetId: namedUuid(state.id, "release-test-house-target"),
      targetPosition: { ...farmer.position },
      requiredCapabilities: ["build"],
      progressTotal: 10,
      progressUnit: "work_minute",
      plan: {
        construction: { key: "release_test_house" },
        constructionWork: {
          elements: [
            {
              id: namedUuid(state.id, "release-test-house-wall"),
              key: "wall_1",
              kind: "wall",
              status: "planned",
              materialDelivered: false,
              materialDeliveredQuantity: 0,
              materialRequired: 1,
              laborCompleted: 0,
              laborRequired: 10,
              position: { ...farmer.position },
            },
          ],
        },
      },
    });
  state.village.facilities.push("farmstead");
  for (const stockpile of state.village.stockpiles)
    if (
      [
        "inn_meals",
        "farm_grain",
        "farm_vegetables",
        "dairy_milk",
        "pasture_meat",
      ].includes(stockpile.key)
    )
      stockpile.quantity = 0;
  transitionJob(job, "reserved", state.tick);
  transitionJob(job, "active", state.tick);
  job.assignedActorId = farmer.id;
  farmer.workState = "working";
  farmer.currentAction = "Building release-test house";
  const { events } = applyRogueTurn(state, { kind: "wait" });
  assert.equal(
    events.some((event) => event.reason === "farm_specialist_protected"),
    false,
  );
  assert.notEqual(job.blockingReason, "farm_specialist_protected");
  assert.notEqual(farmer.actionReason, "farm_specialist_protected");
});

test("R7 a food-secure farm with both harvest cycles can lend its specialist", () => {
  const state = newRogueRun(input),
    farmer = state.village.npcStates.find(
      (resident) => resident.personKey === "farmer",
    ),
    mealStock = state.village.stockpiles.find(
      (stockpile) => stockpile.key === "inn_meals",
    ),
    { job } = createJob(state, {
      jobType: "build_communal_kitchen",
      name: "Release-test inn",
      priority: 100,
      targetId: namedUuid(state.id, "release-test-inn-target"),
      targetPosition: { ...farmer.position },
      requiredCapabilities: ["build"],
      progressTotal: 10,
      progressUnit: "work_minute",
      plan: {
        construction: { key: "release_test_inn" },
        constructionWork: { elements: [] },
      },
    });
  state.village.facilities.push("farmstead");
  mealStock.quantity = state.village.npcStates.length * 2;
  state.village.foodLedger.transactions.push(
    { type: "crop_harvest", cropKind: "grain" },
    { type: "crop_harvest", cropKind: "vegetables" },
  );
  transitionJob(job, "reserved", state.tick);
  transitionJob(job, "active", state.tick);
  job.assignedActorId = farmer.id;
  farmer.workState = "working";
  farmer.currentAction = "Building release-test inn";
  const { events } = applyRogueTurn(state, { kind: "wait" });
  assert.equal(
    events.some((event) => event.reason === "farm_specialist_protected"),
    false,
  );
  assert.notEqual(job.blockingReason, "farm_specialist_protected");
});

test("R7 farm specialist protection lets the farmstead job commission itself", () => {
  const state = newRogueRun(input),
    farmer = state.village.npcStates.find(
      (resident) => resident.personKey === "farmer",
    ),
    { job } = createJob(state, {
      jobType: "build_farmstead",
      name: "Release-test farmstead",
      priority: 100,
      targetId: namedUuid(state.id, "release-test-farmstead-target"),
      targetPosition: { ...farmer.position },
      requiredCapabilities: ["build"],
      progressTotal: 10,
      progressUnit: "work_minute",
      plan: {
        construction: { key: "farmstead" },
        constructionWork: { elements: [] },
      },
    });
  state.village.facilities.push("farmstead");
  transitionJob(job, "reserved", state.tick);
  transitionJob(job, "active", state.tick);
  job.assignedActorId = farmer.id;
  farmer.workState = "working";
  farmer.currentAction = "Commissioning farmstead";
  const { events } = applyRogueTurn(state, { kind: "wait" });
  assert.equal(
    events.some((event) => event.reason === "farm_specialist_protected"),
    false,
  );
  assert.notEqual(job.blockingReason, "farm_specialist_protected");
  assert.notEqual(farmer.actionReason, "farm_specialist_protected");
});

test("R4 a ready crop cell releases its farmer from foreman work", () => {
  const state = newRogueRun(input),
    farmer = state.village.npcStates.find(
      (resident) => resident.personKey === "farmer",
    ),
    target = villageWorldObjectAt(state, 20, 10),
    { job: crop } = createJob(state, {
      jobType: "grow_grain",
      name: "Prepare a ready grain cell",
      priority: 190,
      targetId: target.id,
      targetPosition: { x: 20, y: 10 },
      requiredCapabilities: ["farm"],
      plan: {
        skills: ["farming"],
        cropAction: "prepare",
        cropCellKey: "release-proof-cell",
      },
    }),
    { job: parent } = createJob(state, {
      jobType: "inspect_object",
      name: "Track the crop-test construction",
      priority: 100,
      targetId: target.id,
      targetPosition: { x: 20, y: 10 },
      requiredCapabilities: ["inspect"],
      plan: {
        constructionWork: { elements: [] },
      },
    });
  const { job: review } = createJob(state, {
    jobType: "supervise_project",
    name: "Inspect work while crops wait",
    priority: 200,
    targetId: crop.targetId,
    targetPosition: { ...crop.targetPosition },
    requiredCapabilities: ["build"],
    plan: {
      foremanDuty: true,
      parentJobId: parent.id,
      ownerActorId: farmer.id,
      allowedActorIds: [farmer.id],
      skills: ["construction"],
    },
  });
  transitionJob(review, "reserved", state.tick);
  transitionJob(review, "active", state.tick);
  farmer.workPermissions.allowedJobTypes.push("supervise_project");
  review.assignedActorId = farmer.id;
  farmer.workState = "working";

  const { events } = applyRogueTurn(state, { kind: "wait" });

  assert.ok(
    events.some(
      (event) =>
        event.jobId === review.id &&
        event.reason === "farm_specialist_protected",
    ),
  );
  assert.notEqual(review.assignedActorId, farmer.id);
  assert.ok(["reserved", "active", "completed"].includes(crop.status));
});

test("R4 foreman work cannot interrupt an assigned crop cell", () => {
  const state = newRogueRun(input),
    farmer = state.village.npcStates.find(
      (resident) => resident.personKey === "farmer",
    ),
    target = villageWorldObjectAt(state, 20, 10),
    { job: crop } = createJob(state, {
      jobType: "grow_grain",
      name: "Continue the assigned grain cell",
      priority: 190,
      targetId: target.id,
      targetPosition: { x: 20, y: 10 },
      requiredCapabilities: ["farm"],
      plan: {
        skills: ["farming"],
        cropAction: "prepare",
        cropCellKey: "assigned-release-proof-cell",
      },
    }),
    { job: parent } = createJob(state, {
      jobType: "inspect_object",
      name: "Track assigned-crop construction",
      priority: 100,
      targetId: target.id,
      targetPosition: { x: 20, y: 10 },
      requiredCapabilities: ["inspect"],
      plan: { constructionWork: { elements: [] } },
    }),
    { job: review } = createJob(state, {
      jobType: "supervise_project",
      name: "Inspect while an assigned crop waits",
      priority: 200,
      targetId: target.id,
      targetPosition: { x: 20, y: 10 },
      requiredCapabilities: ["build"],
      plan: {
        foremanDuty: true,
        parentJobId: parent.id,
        ownerActorId: farmer.id,
        allowedActorIds: [farmer.id],
        skills: ["construction"],
      },
    });
  farmer.workPermissions.allowedJobTypes.push("supervise_project");
  transitionJob(crop, "reserved", state.tick);
  crop.assignedActorId = farmer.id;
  farmer.workState = "working";

  applyRogueTurn(state, { kind: "wait" });

  assert.ok(["active", "completed"].includes(crop.status));
  assert.notEqual(review.assignedActorId, farmer.id);
});
