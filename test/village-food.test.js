import test from "node:test";
import assert from "node:assert/strict";
import {
  applyRogueTurn,
  newRogueRun,
  parseRogueState,
  rogueUnityView,
  serializeRogueState,
} from "../src/rogue-engine.js";
import {
  advanceFoodDeterioration,
  advanceForageRegrowth,
  activateFieldExpansion,
  advanceCropGrowth,
  applyCropAction,
  applyCropTreatment,
  claimCropWorkCell,
  cropActionForJob,
  cropCellGrowthAt,
  depositFood,
  discardInitialFood,
  ensureVillageFoodSystem,
  applyFieldWater,
  fieldExpansionTreeCells,
  foodProvenanceAudit,
  harvestForagePatch,
  produceFood,
  ripeForagePatches,
  withdrawFood,
} from "../src/village-food.js";
import { cancelJob, createJob } from "../src/job-board.js";
import { namedUuid } from "../src/identity.js";
import { forageAccessTree } from "../src/village-simulation.js";
import { reconcileVillageStorage } from "../src/village-storage.js";

const input = {
  requestId: "r4-food-ledger",
  runId: "150553d3-d790-5925-8c0d-cbd7437ed555",
  seed: "r4-food-ledger",
  heroName: "Mara",
  heroClass: "fighter",
  form: "hybrid",
  size: "small",
  levels: 3,
  scenario: "founding",
};

const stock = (state, key) =>
  state.village.stockpiles.find((stockpile) => stockpile.key === key);

function stockedFishState() {
  const state = newRogueRun(input),
    fish = stock(state, "inn_fish");
  discardInitialFood(state);
  produceFood(state, fish.id, 10, {
    originType: "fishing",
    originId: "deterioration-test",
  });
  fish.quantity = 10;
  reconcileVillageStorage(state);
  state.village.lastFoodDeteriorationDay = 1;
  return state;
}

function advanceFoodDays(state, finalDay) {
  const events = [];
  for (let day = 2; day <= finalDay; day += 1) {
    state.village.clock.day = day;
    advanceFoodDeterioration(state, events);
  }
  return events;
}

test("R4 food batches preserve origin, transformation, location, and consumer", () => {
  const state = newRogueRun(input),
    fish = stock(state, "inn_fish"),
    meals = stock(state, "inn_meals"),
    catchStock = stock(state, "river_catch");
  discardInitialFood(state);
  const caught = produceFood(state, catchStock.id, 1, {
    originType: "fishing",
    originId: "river",
  });
  catchStock.quantity += 1;
  const cargo = withdrawFood(state, catchStock.id, 1, {
    type: "food_loaded",
    jobId: "haul-fish",
  });
  catchStock.quantity -= 1;
  depositFood(state, fish.id, fish.itemKind, cargo, {
    type: "food_stored",
    jobId: "haul-fish",
  });
  fish.quantity += 1;
  const ingredients = withdrawFood(state, fish.id, 1, {
    type: "food_transformed",
    jobId: "cook-fish",
  });
  fish.quantity -= 1;
  const meal = produceFood(state, meals.id, 1, {
    originType: "production",
    originId: "cook-fish",
    sourceBatchIds: ingredients.map((portion) => portion.batchId),
  });
  meals.quantity += 1;
  const consumed = withdrawFood(state, meals.id, 1, {
    type: "meal_consumed",
    actorId: state.village.npcStates[0].id,
    jobId: "eat-meal",
  });
  meals.quantity -= 1;

  assert.equal(cargo[0].batchId, caught.id);
  assert.deepEqual(meal.sourceBatchIds, [caught.id]);
  assert.deepEqual(consumed, [{ batchId: meal.id, quantity: 1 }]);
  assert.equal(foodProvenanceAudit(state).passed, true);

  const restored = parseRogueState(serializeRogueState(state));
  assert.deepEqual(restored.village.foodLedger, state.village.foodLedger);
  assert.equal(foodProvenanceAudit(restored).passed, true);
});

test("R8 protected food lasts longer than food left in loose overflow", () => {
  const covered = stockedFishState(),
    loose = stockedFishState(),
    looseFish = stock(loose, "inn_fish");
  loose.village.storage.loosePiles = [
    {
      id: "loose-fish-test",
      stockpileId: looseFish.id,
      itemKind: looseFish.itemKind,
      quantity: looseFish.quantity,
      x: looseFish.position.x + 1,
      y: looseFish.position.y,
    },
  ];

  const coveredEvents = advanceFoodDays(covered, 6),
    looseEvents = advanceFoodDays(loose, 6),
    coveredFishEvents = coveredEvents.filter(
      (event) => event.stockpileId === stock(covered, "inn_fish").id,
    ),
    looseFishEvents = looseEvents.filter(
      (event) => event.stockpileId === looseFish.id,
    );

  assert.ok(
    stock(loose, "inn_fish").quantity < stock(covered, "inn_fish").quantity,
  );
  assert.ok(
    looseFishEvents.every((event) => event.protection === "loose_pile"),
  );
  assert.ok(coveredFishEvents.every((event) => event.protection === "covered"));
  assert.equal(foodProvenanceAudit(covered).passed, true);
  assert.equal(foodProvenanceAudit(loose).passed, true);
});

test("R4 crop plots advance through prepare, sow, growth, and harvest", () => {
  const state = newRogueRun(input);
  state.village.facilities.push("farmstead");
  ensureVillageFoodSystem(state);
  let action = cropActionForJob(state, "grow_grain");
  assert.equal(action.action, "prepare");
  applyCropAction(state, {
    id: "prepare-grain",
    plan: { cropAction: "prepare", cropPlotId: action.plot.id },
  });
  action = cropActionForJob(state, "grow_grain");
  assert.equal(action.action, "sow");
  applyCropAction(state, {
    id: "sow-grain",
    plan: {
      cropAction: "sow",
      cropPlotId: action.plot.id,
      cropGrowthTicks: 5,
      foodInputBatchIds: ["seed-batch"],
    },
  });
  assert.equal(action.plot.stage, "germinating");
  state.tick += 5;
  advanceCropGrowth(state);
  assert.equal(action.plot.stage, "mature");
  action = cropActionForJob(state, "grow_grain");
  assert.equal(action.action, "harvest");
  applyCropAction(state, {
    id: "harvest-grain",
    plan: { cropAction: "harvest", cropPlotId: action.plot.id },
  });
  assert.equal(action.plot.stage, "fallow");
  assert.deepEqual(action.plot.seedBatchIds, ["seed-batch"]);
});

test("R8.5 a mature founding crop becomes reserve-critical harvest work", () => {
  const state = newRogueRun(input);
  state.location = "village";
  state.village.facilities.push("farmstead");
  ensureVillageFoodSystem(state);
  for (const pile of state.village.stockpiles)
    if (["raw_fish", "hearty_meal", "grain", "vegetables", "milk", "meat", "egg", "wild_forage"].includes(pile.itemKind))
      pile.quantity = 0;
  const plot = state.village.cropPlots.find((item) => item.cropKind === "grain");
  Object.assign(plot, { stage: "mature", growthProgress: 1, workQueue: null });
  Object.assign(state.village.clock, { hour: 9, block: "work" });

  applyRogueTurn(state, { kind: "wait" });

  const harvest = state.village.jobs.find(
    (job) => job.jobType === "grow_grain" && job.plan?.cropAction === "harvest",
  );
  assert.equal(harvest.plan.foodReserveDuty, true);
  assert.equal(harvest.basePriority, 136);
});

test("R8.5 every colocated harvest pile exposes ready fractional hauling", () => {
  const state = newRogueRun(input);
  state.location = "village";
  state.village.facilities.push("farmstead");
  ensureVillageFoodSystem(state);
  const plot = state.village.cropPlots.find((item) => item.cropKind === "grain"),
    grain = stock(state, "farm_grain"),
    quantities = [0.375, 5.625];
  for (const [index, quantity] of quantities.entries())
    state.village.stockpiles.push({
      id: namedUuid(state.id, `fractional-harvest:${index}`),
      key: `fractional_harvest_${index}`,
      name: "grain field harvest",
      itemKind: "grain",
      quantity,
      capacity: 24,
      position: { ...plot.workPosition },
      containerKind: "field_pile",
      harvestDestinationStockpileId: grain.id,
      cropPlotId: plot.id,
    });
  Object.assign(state.village.clock, { hour: 9, block: "work" });

  applyRogueTurn(state, { kind: "wait" });

  const pileIds = new Set(
      state.village.stockpiles
        .filter((item) => item.key.startsWith("fractional_harvest_"))
        .map((item) => item.id),
    ),
    hauls = state.village.jobs.filter(
      (job) =>
        job.jobType === "haul_stock" &&
        pileIds.has(job.transfer?.sourceStockpileId),
    );
  assert.equal(hauls.length, 2);
  assert.deepEqual(
    hauls.map((job) => job.transfer.quantity).sort(),
    [0.375, 1],
  );
  assert.equal(new Set(hauls.map((job) => job.plan.parallelSlot)).size, 2);
  assert.ok(
    state.village.skillWorkQueues.logistics.jobs
      .filter((job) => hauls.some((haul) => haul.id === job.jobId))
      .every((job) => job.blocker !== "cargo_unavailable"),
  );
  state.village.reservations.push({
    id: "storage-building-inspection",
    state: "held",
    kind: "object",
    targetId: hauls[0].targetId,
    jobId: "unrelated-building-inspection",
  });

  applyRogueTurn(state, { kind: "wait" });

  assert.ok(
    hauls.some(
      (job) =>
        job.assignedActorId && ["reserved", "active"].includes(job.status),
    ),
  );
});

test("R8.5 a critical harvest exposes an all-hands field crew", () => {
  const state = newRogueRun(input);
  state.location = "village";
  state.village.facilities.push("farmstead");
  ensureVillageFoodSystem(state);
  for (const pile of state.village.stockpiles) pile.quantity = 0;
  const plot = state.village.cropPlots.find((item) => item.cropKind === "grain");
  Object.assign(plot, { stage: "mature", growthProgress: 1, workQueue: null });
  Object.assign(state.village.clock, { hour: 9, block: "work" });

  applyRogueTurn(state, { kind: "wait" });

  const harvests = state.village.jobs.filter(
    (job) =>
      job.jobType === "grow_grain" &&
      job.plan?.cropAction === "harvest" &&
      !["completed", "cancelled"].includes(job.status),
  );
  assert.equal(harvests.length, 6);
  assert.equal(new Set(harvests.map((job) => job.plan.cropCellKey)).size, 6);
  assert.deepEqual(
    harvests.map((job) => job.plan.parallelSlot).sort(),
    [0, 1, 2, 3, 4, 5],
  );
});

test("R8.5 emergency field preparation outranks secondary founding work", () => {
  const state = newRogueRun(input);
  state.location = "village";
  state.village.facilities.push("farmstead");
  ensureVillageFoodSystem(state);
  for (const pile of state.village.stockpiles) pile.quantity = 0;
  Object.assign(state.village.clock, { hour: 9, block: "work" });

  applyRogueTurn(state, { kind: "wait" });

  const preparation = state.village.jobs.filter(
    (job) =>
      job.plan?.cropAction === "prepare" &&
      !["completed", "cancelled"].includes(job.status),
  );
  const byType = Map.groupBy(preparation, (job) => job.jobType);
  assert.equal(byType.get("grow_grain").length, 6);
  assert.equal(byType.get("grow_vegetables").length, 6);
  assert.ok(preparation.every((job) => job.plan.foodReserveDuty));
  assert.ok(preparation.every((job) => job.basePriority >= 136));
  assert.ok(
    preparation.every((job) => job.reason === "food_reserve_emergency"),
  );
});

test("R8.5 survival preemption returns a shared crop cell to the crew", () => {
  const state = newRogueRun(input);
  state.location = "village";
  state.village.facilities.push("farmstead");
  ensureVillageFoodSystem(state);
  const plot = state.village.cropPlots.find((item) => item.cropKind === "grain");
  Object.assign(plot, { stage: "mature", growthProgress: 1, workQueue: null });
  Object.assign(state.village.clock, { hour: 9, block: "work" });
  for (const resident of state.village.npcStates)
    for (const need of Object.keys(resident.life.needs)) resident.life.needs[need] = 100;
  for (let turn = 0; turn < 3; turn += 1)
    applyRogueTurn(state, { kind: "wait" });
  const harvest = state.village.jobs.find(
      (job) => job.jobType === "grow_grain" && job.status === "active",
    ),
    worker = state.village.npcStates.find(
      (resident) => resident.id === harvest.assignedActorId,
    ),
    cell = plot.workQueue.cells.find(
      (candidate) => candidate.key === harvest.plan.cropCellKey,
    );
  worker.life.needs.fatigue = 0;

  applyRogueTurn(state, { kind: "wait" });

  assert.equal(harvest.status, "cancelled");
  assert.equal(cell.status, "queued");
  assert.equal(cell.claimedByJobId, null);
});

test("R8.5 sowing expands to a crew only after the plot seed is secured", () => {
  const state = newRogueRun(input);
  state.location = "village";
  state.village.facilities.push("farmstead");
  ensureVillageFoodSystem(state);
  const first = cropActionForJob(state, "grow_grain");
  applyCropAction(state, {
    id: "seed-first-cell",
    plan: {
      cropAction: "prepare",
      cropPlotId: first.plot.id,
    },
  });
  const sow = cropActionForJob(state, "grow_grain");
  claimCropWorkCell(sow.plot, sow.cell.key, "seed-first-cell");
  applyCropAction(state, {
    id: "seed-first-cell",
    plan: {
      cropAction: "sow",
      cropPlotId: sow.plot.id,
      cropCellKey: sow.cell.key,
      foodInputBatchIds: ["seed-batch"],
    },
  });
  Object.assign(state.village.clock, { hour: 9, block: "work" });

  applyRogueTurn(state, { kind: "wait" });

  const sowers = state.village.jobs.filter(
    (job) =>
      job.jobType === "grow_grain" &&
      job.plan?.cropAction === "sow" &&
      !["completed", "cancelled"].includes(job.status),
  );
  assert.equal(sow.plot.pendingSeedBatchIds.length, 1);
  assert.equal(sowers.length, 3);
  assert.ok(sowers.every((job) => job.production.inputs.length === 0));
});

test("R4 farming skill queue advances one ordered field cell at a time", () => {
  const state = newRogueRun(input);
  state.village.facilities.push("farmstead");
  ensureVillageFoodSystem(state);
  const first = cropActionForJob(state, "grow_grain"),
    queue = first.queue;
  claimCropWorkCell(first.plot, first.cell.key, "farm-cell-1");
  applyCropAction(state, {
    id: "farm-cell-1",
    plan: {
      cropAction: first.action,
      cropPlotId: first.plot.id,
      cropCellKey: first.cell.key,
    },
  });
  assert.equal(first.plot.stage, "fallow");
  assert.equal(queue.completedCount, 1);
  const second = cropActionForJob(state, "grow_grain");
  assert.notEqual(second.cell.key, first.cell.key);
  assert.deepEqual(
    [first.cell.position, second.cell.position],
    [
      { x: first.plot.area.x, y: first.plot.area.y },
      { x: first.plot.area.x + 1, y: first.plot.area.y },
    ],
  );
  assert.ok(state.village.skillWorkQueues.farming.queueIds.includes(queue.id));
});

test("R4 one conserved seed batch supports every sowing cell in a plot", () => {
  const state = newRogueRun(input);
  state.village.facilities.push("farmstead");
  ensureVillageFoodSystem(state);
  const plot = cropActionForJob(state, "grow_grain").plot;
  plot.stage = "prepared";
  const cellCount = plot.area.width * plot.area.height;
  for (let index = 0; index < cellCount; index += 1) {
    const action = cropActionForJob(state, "grow_grain"),
      jobId = `sow-cell-${index}`;
    claimCropWorkCell(plot, action.cell.key, jobId);
    applyCropAction(state, {
      id: jobId,
      plan: {
        cropAction: "sow",
        cropPlotId: plot.id,
        cropCellKey: action.cell.key,
        cropGrowthTicks: 10,
        ...(index === 0 ? { foodInputBatchIds: ["seed-batch"] } : {}),
      },
    });
  }
  assert.equal(plot.stage, "germinating");
  assert.deepEqual(plot.seedBatchIds, ["seed-batch"]);
  assert.deepEqual(plot.pendingSeedBatchIds, []);
});

test("R4 each planted field cell grows before the whole plot is sown", () => {
  const state = newRogueRun(input);
  state.village.facilities.push("farmstead");
  ensureVillageFoodSystem(state);
  const plot = cropActionForJob(state, "grow_grain").plot;
  plot.stage = "prepared";
  const action = cropActionForJob(state, "grow_grain");
  claimCropWorkCell(plot, action.cell.key, "first-sown-cell");
  applyCropAction(state, {
    id: "first-sown-cell",
    plan: {
      cropAction: "sow",
      cropPlotId: plot.id,
      cropCellKey: action.cell.key,
      cropGrowthTicks: 4800,
      foodInputBatchIds: ["seed-batch"],
    },
  });
  state.tick += 1200;
  advanceCropGrowth(state);
  const growth = cropCellGrowthAt(
    plot,
    action.cell.position.x,
    action.cell.position.y,
  );
  assert.equal(plot.stage, "prepared");
  assert.ok(growth.progress > 0);
  assert.equal(growth.stage, "growing");
});

test("R8.2 a winter crop fails and returns through visible recovery work", () => {
  const state = newRogueRun(input);
  state.village.facilities.push("farmstead");
  ensureVillageFoodSystem(state);
  const plot = state.village.cropPlots[0];
  applyCropAction(state, {
    id: "prepare-winter-grain",
    plan: { cropAction: "prepare", cropPlotId: plot.id },
  });
  applyCropAction(state, {
    id: "sow-winter-grain",
    plan: { cropAction: "sow", cropPlotId: plot.id, cropGrowthTicks: 10 },
  });
  state.village.clock.day = 271;
  state.tick += 10;

  advanceCropGrowth(state);

  assert.equal(plot.stage, "failed");
  assert.equal(plot.growthConditions.season, "winter");
  const recovery = cropActionForJob(state, "grow_grain");
  assert.equal(recovery.action, "recover");
  applyCropAction(state, {
    id: "recover-winter-grain",
    plan: { cropAction: "recover", cropPlotId: plot.id },
  });
  assert.equal(plot.stage, "prepared");
  assert.equal(plot.growthProgress, 0);
});

test("R8.2 a growing field dries across days and records physical watering", () => {
  const state = newRogueRun(input);
  state.village.facilities.push("farmstead");
  ensureVillageFoodSystem(state);
  const plot = state.village.cropPlots[0];
  plot.stage = "growing";
  plot.plantedAtTick = state.tick;
  plot.harvestableAtTick = state.tick + 4800;
  plot.growthProgress = 0.2;
  state.village.clock.day = 3;
  state.tick += 2400;

  advanceCropGrowth(state);

  assert.equal(plot.moisture, 58);
  applyFieldWater(state, {
    id: "water-dry-field",
    plan: { waterPlotId: plot.id },
  });
  assert.equal(plot.moisture, 98);
  assert.equal(plot.lastWateredAtTick, state.tick);
  assert.ok(
    state.village.foodLedger.transactions.some(
      (entry) => entry.type === "field_watered" && entry.plotId === plot.id,
    ),
  );
});

test("R8.2 extreme field moisture generates damage that treatment clears", () => {
  const state = newRogueRun(input);
  state.village.facilities.push("farmstead");
  ensureVillageFoodSystem(state);
  const plot = state.village.cropPlots[0];
  plot.stage = "growing";
  plot.plantedAtTick = state.tick;
  plot.harvestableAtTick = state.tick + 4800;
  plot.moisture = 15;
  state.village.clock.day += 2;
  state.tick += 2400;

  advanceCropGrowth(state);

  assert.equal(plot.cropDisease, "drought_wilt");
  assert.equal(plot.cropDamage, 20);
  applyCropTreatment(state, {
    id: "treat-wilted-field",
    plan: { cropTreatmentPlotId: plot.id },
  });
  assert.equal(plot.cropDamage, 0);
  assert.equal(plot.cropDisease, null);
  assert.equal(plot.lastTreatedAtTick, state.tick);
});

test("R8.2 town controls select, suspend, and cut a physical crop plot", () => {
  const state = newRogueRun(input);
  state.location = "village";
  state.village.facilities.push("farmstead");
  ensureVillageFoodSystem(state);
  const plot = state.village.cropPlots[0];

  applyRogueTurn(state, {
    kind: "set_crop_plan",
    targetId: plot.id,
    action: "select_crop",
    itemKind: "vegetables",
  });
  applyRogueTurn(state, {
    kind: "set_crop_plan",
    targetId: plot.id,
    action: "forbid_sowing",
  });
  assert.equal(plot.cropKind, "vegetables");
  assert.equal(plot.sowingAllowed, false);

  plot.stage = "growing";
  applyRogueTurn(state, {
    kind: "set_crop_plan",
    targetId: plot.id,
    action: "cut",
  });
  assert.equal(plot.cutOrdered, true);
  assert.equal(cropActionForJob(state, "grow_vegetables").action, "cut");
});

test("R8.2 town controls persist an exact compatible harvest destination", () => {
  const state = newRogueRun(input);
  state.location = "village";
  state.village.facilities.push("farmstead");
  ensureVillageFoodSystem(state);
  const plot = state.village.cropPlots[0],
    output = stock(state, `farm_${plot.cropKind}`),
    storage = reconcileVillageStorage(state),
    zone = storage.zones.find(
      (candidate) => candidate.containerId === output.containerId,
    ),
    chosen = zone.cells.at(-1);

  applyRogueTurn(state, {
    kind: "set_crop_plan",
    targetId: plot.id,
    action: "set_destination",
    objectId: chosen.id,
  });

  assert.equal(plot.harvestDestinationStockpileId, output.id);
  assert.equal(plot.harvestDestinationCellId, chosen.id);
  assert.deepEqual(plot.harvestDestinationPosition, {
    x: chosen.x,
    y: chosen.y,
  });
  const projected = rogueUnityView(state).map.cells.find(
    (cell) => cell.cropPlotId === plot.id,
  );
  assert.equal(projected.cropDestinationCellId, chosen.id);
  assert.equal(projected.cropDestinationX, chosen.x);
  assert.equal(projected.cropDestinationY, chosen.y);
});

test("R4 crop plots occupy visible field-scale areas", () => {
  const state = newRogueRun(input);
  state.location = "village";
  state.village.facilities.push("farmstead");
  ensureVillageFoodSystem(state);
  state.village.cropPlots[0].lastYield = 17;
  state.village.cropPlots[0].lastFarmerSkill = 4;
  const view = rogueUnityView(state);
  for (const plot of state.village.cropPlots) {
    assert.ok(plot.area.width >= 8);
    assert.ok(plot.area.height >= 8);
    const cells = view.map.cells.filter((cell) => cell.cropPlotId === plot.id);
    assert.equal(cells.length, plot.area.width * plot.area.height);
    assert.ok(cells.every((cell) => cell.cropStage === plot.stage));
    assert.ok(cells.every((cell) => cell.cropFertility === plot.fertility));
    assert.ok(cells.every((cell) => cell.cropMoisture === plot.moisture));
    assert.ok(cells.every((cell) => cell.cropDamage === plot.cropDamage));
    assert.ok(
      cells.every(
        (cell) => (cell.cropLastYield ?? 0) === (plot.lastYield ?? 0),
      ),
    );
    assert.ok(cells.every(
      (cell) =>
        (cell.cropLastFarmerSkill ?? 0) === (plot.lastFarmerSkill ?? 0),
    ));
  }
});

test("R4 cleared woodland becomes a persistent farm plot", () => {
  const state = newRogueRun(input);
  state.village.facilities.push("farmstead");
  ensureVillageFoodSystem(state);
  const expansion = state.village.fieldExpansions[0],
    tree = { x: expansion.area.x, y: expansion.area.y },
    terrainAt = (position) =>
      position.x === tree.x && position.y === tree.y
        ? "outdoor_tree"
        : "outdoor_grass";
  assert.deepEqual(fieldExpansionTreeCells(expansion, terrainAt), [tree]);
  state.village.modifications.push({ kind: "tree_stump", ...tree });
  expansion.clearedTreeCount = 1;
  const plot = activateFieldExpansion(state, expansion.key);
  assert.equal(expansion.status, "active");
  assert.equal(plot.cropKind, "grain");
  assert.equal(state.village.modifications.length, 0);
  assert.equal(cropActionForJob(state, "grow_grain").action, "prepare");
});

test("R4 edible wild plants deplete, regrow, and remain visibly distinct", () => {
  const state = newRogueRun(input);
  ensureVillageFoodSystem(state);
  const patches = ripeForagePatches(state),
    patch = patches[0],
    harvested = harvestForagePatch(state, patch.id, "gather-test");
  assert.equal(patches.length, 6);
  assert.equal(harvested.stage, "depleted");
  assert.equal(harvested.harvestCount, 1);
  assert.ok(harvested.regrowAtTick > state.tick);

  let cell = rogueUnityView(state).map.cells.find(
    (candidate) => candidate.foragePatchId === patch.id,
  );
  assert.equal(cell.forageKind, patch.key);
  assert.equal(cell.forageStage, "depleted");
  assert.equal(cell.groundTile ?? cell.tile, "outdoor_grass");

  state.tick = harvested.regrowAtTick;
  advanceForageRegrowth(state);
  cell = rogueUnityView(state).map.cells.find(
    (candidate) => candidate.foragePatchId === patch.id,
  );
  assert.equal(harvested.stage, "ripe");
  assert.equal(cell.forageStage, "ripe");
});

test("R4 starvation foraging identifies a tree blocking the only access", () => {
  const state = newRogueRun(input),
    worker = state.village.npcStates[0],
    target = { x: worker.position.x + 4, y: worker.position.y },
    blocked = new Set([
      `${target.x - 1},${target.y}`,
      `${target.x + 1},${target.y}`,
      `${target.x},${target.y - 1}`,
      `${target.x},${target.y + 1}`,
    ]),
    terrainAt = (position) =>
      blocked.has(`${position.x},${position.y}`)
        ? "outdoor_tree"
        : "outdoor_grass";

  const tree = forageAccessTree(
    state,
    [worker],
    [{ position: target }],
    { terrainAt },
  );

  assert.ok(blocked.has(`${tree.x},${tree.y}`));
});

test("R4 retiring starting provisions preserves the seed reserve", () => {
  const state = newRogueRun(input),
    seed = stock(state, "farm_seed");
  ensureVillageFoodSystem(state);
  const seedBefore = seed.quantity;

  discardInitialFood(state);

  assert.equal(seed.quantity, seedBefore);
  assert.equal(foodProvenanceAudit(state).passed, true);
});

test("R4 cancelling loaded food restores its exact provenance batch", () => {
  const state = newRogueRun(input),
    source = stock(state, "river_catch"),
    target = stock(state, "inn_fish"),
    batch = produceFood(state, source.id, 2, {
      originType: "fishing",
      originId: "river",
    });
  source.quantity += 2;
  const { job } = createJob(state, {
    jobType: "haul_fish",
    name: "Haul fish",
    targetId: target.id,
    targetPosition: target.position,
    plan: { template: "haul_fish" },
    transfer: {
      sourceStockpileId: source.id,
      targetStockpileId: target.id,
      itemKind: source.itemKind,
      cargoName: "Fish",
      quantity: 1,
      carriedQuantity: 1,
    },
  });
  job.plan.foodCargo = withdrawFood(state, source.id, 1, {
    type: "food_loaded",
    jobId: job.id,
  });
  source.quantity -= 1;

  cancelJob(state, job, "test_cancel");

  assert.equal(source.quantity, 2);
  assert.equal(
    state.village.foodLedger.batches.find((item) => item.id === batch.id)
      .quantityRemaining,
    2,
  );
  assert.equal(foodProvenanceAudit(state).passed, true);
});

test("R4 cancelling multiple inputs from one stockpile restores every batch", () => {
  const state = newRogueRun(input),
    source = stock(state, "river_catch"),
    first = produceFood(state, source.id, 1, {
      originType: "fishing",
      originId: "river-a",
    }),
    second = produceFood(state, source.id, 1, {
      originType: "fishing",
      originId: "river-b",
    });
  source.quantity += 2;
  const firstCargo = withdrawFood(state, source.id, 1),
    secondCargo = withdrawFood(state, source.id, 1);
  source.quantity -= 2;
  const { job } = createJob(state, {
    jobType: "prepare_meal",
    name: "Prepare two fish",
    targetId: "kitchen",
    targetPosition: { x: 0, y: 0 },
    plan: {
      template: "prepare_meal",
      foodInputCargo: [
        { stockpileId: source.id, portions: firstCargo },
        { stockpileId: source.id, portions: secondCargo },
      ],
    },
    production: {
      inputs: [
        { stockpileId: source.id, carriedQuantity: 1 },
        { stockpileId: source.id, carriedQuantity: 1 },
      ],
    },
  });

  cancelJob(state, job, "test_cancel");

  assert.equal(source.quantity, 2);
  for (const batchId of [first.id, second.id])
    assert.equal(
      state.village.foodLedger.batches.find((batch) => batch.id === batchId)
        .quantityRemaining,
      1,
    );
  assert.deepEqual(job.plan.foodInputCargo, []);
  assert.equal(foodProvenanceAudit(state).passed, true);
});
