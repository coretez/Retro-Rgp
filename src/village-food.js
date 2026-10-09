import { definitionId, namedUuid } from "./identity.js";
import {
  stockpileStorageProtection,
  storageItemProfile,
} from "./village-storage.js";
import { grazingSeason } from "./village-animals.js";

const TICKS_PER_DAY = 2400;
const FARM_WORK_BATCH_SIZE = 12;

export const FOOD_ITEM_KINDS = new Set([
  "seed_grain",
  "grain",
  "flour",
  "vegetables",
  "milk",
  "egg",
  "meat",
  "raw_fish",
  "wild_forage",
  "hearty_meal",
  "animal_feed",
]);

const FORAGE_DEFINITIONS = Object.freeze([
  {
    key: "blackberry",
    name: "Blackberry bramble",
    x: -9,
    y: 13,
    yield: 2,
    regrowthTicks: 1800,
  },
  {
    key: "rosehip",
    name: "Wild rose hips",
    x: -20,
    y: 30,
    yield: 1,
    regrowthTicks: 1500,
  },
  {
    key: "wood_sorrel",
    name: "Wood sorrel",
    x: -13,
    y: 17,
    yield: 1,
    regrowthTicks: 1200,
  },
  {
    key: "dandelion",
    name: "Dandelion greens",
    x: 25,
    y: 32,
    yield: 1,
    regrowthTicks: 1200,
  },
  {
    key: "wild_onion",
    name: "Wild onion patch",
    x: 38,
    y: 14,
    yield: 1,
    regrowthTicks: 1500,
  },
  {
    key: "cattail",
    name: "Cattail shoots",
    x: -1,
    y: 17,
    yield: 1,
    regrowthTicks: 1800,
  },
]);

const CROP_DEFINITIONS = Object.freeze({
  grain: {
    jobType: "grow_grain",
    itemKind: "grain",
    seedKind: "seed_grain",
    position: { x: -48, y: 25 },
    area: { x: -50, y: 23, width: 4, height: 4 },
    growthTicks: 4800,
    seedRequirement: 1,
    baseYield: 3,
  },
  vegetables: {
    jobType: "grow_vegetables",
    itemKind: "vegetables",
    seedKind: "seed_grain",
    position: { x: -47, y: 35 },
    area: { x: -49, y: 33, width: 4, height: 4 },
    growthTicks: 3600,
    seedRequirement: 1,
    baseYield: 2,
  },
});

export const FIELD_EXPANSION_DEFINITIONS = Object.freeze([
  {
    key: "grain_west",
    name: "West grain field",
    cropKind: "grain",
    area: { x: -58, y: 30, width: 7, height: 7 },
    workPosition: { x: -54, y: 34 },
  },
]);

function transaction(state, type, details) {
  const ledger = state.village.foodLedger;
  ledger.transactionSerial += 1;
  const entry = {
    id: namedUuid(
      state.id,
      `food-transaction:${ledger.transactionSerial}:${type}`,
    ),
    type,
    tick: state.tick,
    ...structuredClone(details),
  };
  ledger.transactions.push(entry);
  return entry;
}

function addBatch(state, input) {
  const ledger = state.village.foodLedger;
  ledger.batchSerial += 1;
  const batch = {
    id: namedUuid(
      state.id,
      `food-batch:${ledger.batchSerial}:${input.itemKind}:${input.stockpileId}`,
    ),
    definitionId: definitionId("food-batch", input.itemKind),
    entityType: "food-batch",
    itemKind: input.itemKind,
    quantityProduced: input.quantity,
    quantityRemaining: input.quantity,
    stockpileId: input.stockpileId,
    originType: input.originType,
    originId: input.originId ?? null,
    sourceBatchIds: [...(input.sourceBatchIds ?? [])],
    producedAtTick: state.tick,
  };
  ledger.batches.push(batch);
  transaction(state, "food_produced", {
    batchId: batch.id,
    itemKind: batch.itemKind,
    quantity: input.quantity,
    stockpileId: input.stockpileId,
    originType: input.originType,
    originId: input.originId ?? null,
    sourceBatchIds: batch.sourceBatchIds,
  });
  return batch;
}

// function-length-exempt: template -- persisted food-state construction/migration
export function ensureVillageFoodSystem(state) {
  state.village.foodLedger ??= {
    batchSerial: 0,
    transactionSerial: 0,
    batches: [],
    transactions: [],
  };
  state.village.foodLedger.batchSerial ??= 0;
  state.village.foodLedger.transactionSerial ??= 0;
  state.village.foodLedger.batches ??= [];
  state.village.foodLedger.transactions ??= [];
  if (!state.village.foodLedger.initialized) {
    for (const stockpile of state.village.stockpiles ?? []) {
      if (!FOOD_ITEM_KINDS.has(stockpile.itemKind) || stockpile.quantity <= 0)
        continue;
      const accounted = state.village.foodLedger.batches
        .filter((batch) => batch.stockpileId === stockpile.id)
        .reduce((total, batch) => total + batch.quantityRemaining, 0);
      if (accounted < stockpile.quantity)
        addBatch(state, {
          itemKind: stockpile.itemKind,
          quantity: stockpile.quantity - accounted,
          stockpileId: stockpile.id,
          originType: "initial_stock",
          originId: stockpile.id,
        });
    }
    state.village.foodLedger.initialized = true;
  }
  state.village.cropPlots ??= [];
  state.village.skillWorkQueues ??= {};
  state.village.skillWorkQueues.farming ??= {
    skill: "farming",
    queueIds: [],
  };
  state.village.fieldExpansions ??= [];
  for (const definition of FIELD_EXPANSION_DEFINITIONS) {
    const existing = state.village.fieldExpansions.find(
      (expansion) => expansion.key === definition.key,
    );
    if (!existing)
      state.village.fieldExpansions.push({
        id: namedUuid(state.id, `field-expansion:${definition.key}`),
        definitionId: definitionId("field-expansion", definition.key),
        entityType: "field-expansion",
        ...structuredClone(definition),
        status: "planned",
        clearedTreeCount: 0,
        activatedAtTick: null,
        cropPlotId: null,
      });
  }
  state.village.foragePatches ??= [];
  for (const definition of FORAGE_DEFINITIONS) {
    const existing = state.village.foragePatches.find(
      (patch) => patch.key === definition.key,
    );
    if (!existing)
      state.village.foragePatches.push({
        id: namedUuid(state.id, `forage-patch:${definition.key}`),
        definitionId: definitionId("forage-patch", definition.key),
        entityType: "forage-patch",
        key: definition.key,
        name: definition.name,
        position: { x: definition.x, y: definition.y },
        yield: definition.yield,
        regrowthTicks: definition.regrowthTicks,
        stage: "ripe",
        regrowAtTick: null,
        harvestCount: 0,
      });
    else {
      existing.name ??= definition.name;
      existing.position ??= { x: definition.x, y: definition.y };
      existing.yield ??= definition.yield;
      existing.regrowthTicks ??= definition.regrowthTicks;
      existing.stage ??= "ripe";
      existing.regrowAtTick ??= null;
      existing.harvestCount ??= 0;
    }
  }
  const starterSurveys = new Map(
    (state.village.development?.masterPlan?.fieldClearingSurveys ?? [])
      .filter((survey) => survey.starterStatus === "cleared")
      .map((survey) => [survey.cropKind, survey]),
  );
  if (state.village.facilities.includes("farmstead") || starterSurveys.size)
    for (const [key, definition] of Object.entries(CROP_DEFINITIONS)) {
      if (
        !state.village.facilities.includes("farmstead") &&
        !starterSurveys.has(definition.itemKind)
      )
        continue;
      const existing = state.village.cropPlots.find((plot) => plot.key === key);
      if (!existing) {
        const starter = starterSurveys.get(definition.itemKind),
          boundary = state.village.development?.masterPlan?.fieldBoundaries?.find(
            (candidate) => candidate.cropKind === definition.itemKind,
          ),
          plannedArea = boundary
            ? {
                x: boundary.x + 1,
                y: boundary.y + 1,
                width: boundary.w - 2,
                height: boundary.h - 2,
              }
            : null,
          area = starter?.starterArea ?? plannedArea ?? definition.area;
        state.village.cropPlots.push({
          id: namedUuid(state.id, `crop-plot:${key}`),
          definitionId: definitionId("crop-plot", key),
          entityType: "crop-plot",
          key,
          cropKind: definition.itemKind,
          position: {
            x: area.x + Math.floor(area.width / 2),
            y: area.y + Math.floor(area.height / 2),
          },
          workPosition: {
            x: area.x + Math.floor(area.width / 2),
            y: area.y + Math.floor(area.height / 2),
          },
          area: { ...area },
          stage: "fallow",
          plantedAtTick: null,
          harvestableAtTick: null,
          seedBatchIds: [],
          cycle: 0,
          fertility: 60,
          moisture: 70,
          cropDamage: 0,
          growthProgress: 0,
          growthRate: 0,
          growthPhase: "fallow",
          lastGrowthTick: state.tick,
          lastMoistureDay: state.village.clock?.day ?? 1,
          sowingAllowed: true,
          cutOrdered: false,
          manureApplications: 0,
        });
      } else {
        existing.workPosition ??= { ...definition.position };
        existing.area ??= { ...definition.area };
        existing.fertility ??= 60;
        existing.moisture ??= 70;
        existing.cropDamage ??= 0;
        existing.growthProgress ??= existing.stage === "harvestable" ? 1 : 0;
        existing.growthRate ??= 0;
        existing.growthPhase ??= existing.stage;
        existing.lastGrowthTick ??= state.tick;
        existing.lastMoistureDay ??= state.village.clock?.day ?? 1;
        existing.sowingAllowed ??= true;
        existing.cutOrdered ??= false;
        existing.manureApplications ??= 0;
      }
    }
  syncFarmingSkillQueue(state);
  return state.village.foodLedger;
}

function cropWorkCells(plot) {
  const cells = [];
  for (let row = 0; row < plot.area.height; row += 1) {
    const xs = Array.from({ length: plot.area.width }, (_, index) =>
      row % 2 ? plot.area.width - index - 1 : index,
    );
    for (const column of xs)
      cells.push({
        key: `${plot.area.x + column},${plot.area.y + row}`,
        position: { x: plot.area.x + column, y: plot.area.y + row },
        status: "queued",
        claimedByJobId: null,
      });
  }
  return cells;
}

function cropQueueId(plot, action) {
  return namedUuid(plot.id, `farming-queue:${plot.cycle}:${action}`);
}

function ensureCropWorkQueue(plot, action) {
  const id = cropQueueId(plot, action);
  if (plot.workQueue?.id === id) return plot.workQueue;
  plot.workQueue = {
    id,
    skill: "farming",
    action,
    batchSize: FARM_WORK_BATCH_SIZE,
    cells: cropWorkCells(plot),
    completedCount: 0,
  };
  return plot.workQueue;
}

function farmingQueueSnapshot(work) {
  return {
    queueIds: work.map((item) => item.id),
    queues: work.map((item) => ({
    id: item.id,
    action: item.action,
    readyCellKeys: item.cells
      .filter((cell) => cell.status === "queued")
      .slice(0, item.batchSize)
      .map((cell) => cell.key),
    claimedCellKeys: item.cells
      .filter((cell) => cell.status === "claimed")
      .map((cell) => cell.key),
    completedCount: item.completedCount,
    totalCount: item.cells.length,
    })),
  };
}

function syncFarmingSkillQueue(state) {
  const queue = state.village.skillWorkQueues.farming,
    work = state.village.cropPlots
      .map((plot) => plot.workQueue)
      .filter(Boolean),
    snapshot = farmingQueueSnapshot(work);
  if (
    JSON.stringify([queue.queueIds, queue.queues]) ===
    JSON.stringify([snapshot.queueIds, snapshot.queues])
  )
    return;
  queue.queueIds = snapshot.queueIds;
  queue.queues = snapshot.queues;
  queue.updatedAtTick = state.tick;
}

function nextCropWorkCell(queue) {
  const active = queue.cells.filter((cell) => cell.status !== "complete");
  return active.slice(0, queue.batchSize).find((cell) => !cell.claimedByJobId);
}

function releaseStaleCropClaims(state, queue) {
  const open = new Set(
    state.village.jobs
      .filter((job) => !["completed", "cancelled"].includes(job.status))
      .map((job) => job.id),
  );
  for (const cell of queue.cells)
    if (cell.status === "claimed" && !open.has(cell.claimedByJobId)) {
      cell.status = "queued";
      cell.claimedByJobId = null;
    }
}

export function claimCropWorkCell(plot, cellKey, jobId) {
  const cell = plot.workQueue?.cells.find((item) => item.key === cellKey);
  if (!cell || cell.status === "complete") return false;
  cell.status = "claimed";
  cell.claimedByJobId = jobId;
  return true;
}

export function releaseCropWorkCell(state, job) {
  const plot = state.village.cropPlots?.find(
      (candidate) => candidate.id === job.plan?.cropPlotId,
    ),
    cell = plot?.workQueue?.cells.find(
      (candidate) => candidate.key === job.plan?.cropCellKey,
    );
  if (!cell || cell.claimedByJobId !== job.id) return false;
  cell.status = "queued";
  cell.claimedByJobId = null;
  syncFarmingSkillQueue(state);
  return true;
}

const FORAGE_POSITION_CACHE = new WeakMap();
const CROP_POSITION_CACHE = new WeakMap();

export function foragePatchAt(state, x, y) {
  const patches = state.village.foragePatches ?? [],
    cached = FORAGE_POSITION_CACHE.get(state);
  if (cached?.source === patches && cached.length === patches.length)
    return cached.positions.get(`${x},${y}`);
  const positions = new Map(
    patches.map((patch) => [`${patch.position.x},${patch.position.y}`, patch]),
  );
  FORAGE_POSITION_CACHE.set(state, {
    source: patches,
    length: patches.length,
    positions,
  });
  return positions.get(`${x},${y}`);
}

export function ripeForagePatches(state) {
  ensureVillageFoodSystem(state);
  return state.village.foragePatches
    .filter((patch) => patch.stage === "ripe")
    .sort(
      (left, right) =>
        left.position.y - right.position.y ||
        left.position.x - right.position.x ||
        left.key.localeCompare(right.key),
    );
}

export function harvestForagePatch(state, patchId, jobId = null) {
  const patch = state.village.foragePatches?.find(
    (candidate) => candidate.id === patchId,
  );
  if (!patch || patch.stage !== "ripe") return null;
  patch.stage = "depleted";
  patch.regrowAtTick = state.tick + patch.regrowthTicks;
  patch.harvestCount += 1;
  transaction(state, "forage_gathered", {
    patchId: patch.id,
    forageKind: patch.key,
    quantity: patch.yield,
    jobId,
    regrowAtTick: patch.regrowAtTick,
  });
  return patch;
}

export function advanceForageRegrowth(state) {
  ensureVillageFoodSystem(state);
  for (const patch of state.village.foragePatches)
    if (
      patch.stage === "depleted" &&
      state.tick >= (patch.regrowAtTick ?? Infinity)
    ) {
      patch.stage = "ripe";
      patch.regrowAtTick = null;
      transaction(state, "forage_regrown", {
        patchId: patch.id,
        forageKind: patch.key,
      });
    }
}

export function cropPlotAt(state, x, y) {
  const plots = state.village.cropPlots ?? [],
    cached = CROP_POSITION_CACHE.get(state);
  if (cached?.source === plots && cached.length === plots.length)
    return cached.positions.get(`${x},${y}`);
  const positions = new Map();
  for (const plot of plots) indexCropPlot(positions, plot);
  CROP_POSITION_CACHE.set(state, {
    source: plots,
    length: plots.length,
    positions,
  });
  return positions.get(`${x},${y}`);
}

function indexCropPlot(positions, plot) {
  const area = plot.area ?? {
    x: plot.position.x,
    y: plot.position.y,
    width: 1,
    height: 1,
  };
  for (let y = area.y; y < area.y + area.height; y += 1)
    for (let x = area.x; x < area.x + area.width; x += 1)
      positions.set(`${x},${y}`, plot);
}

function reconcileBatch(state, stockpile, missing) {
  return addBatch(state, {
    itemKind: stockpile.itemKind,
    quantity: missing,
    stockpileId: stockpile.id,
    originType: "legacy_reconciliation",
    originId: stockpile.id,
  });
}

export function withdrawFood(state, stockpileId, quantity, details = {}) {
  ensureVillageFoodSystem(state);
  const stockpile = state.village.stockpiles.find(
      (candidate) => candidate.id === stockpileId,
    ),
    batches = state.village.foodLedger.batches
      .filter(
        (batch) =>
          batch.stockpileId === stockpileId && batch.quantityRemaining > 0,
      )
      .sort(
        (left, right) =>
          left.producedAtTick - right.producedAtTick ||
          left.id.localeCompare(right.id),
      );
  if (!stockpile || !FOOD_ITEM_KINDS.has(stockpile.itemKind)) return [];
  const available = batches.reduce(
    (total, batch) => total + batch.quantityRemaining,
    0,
  );
  if (available < quantity)
    batches.push(reconcileBatch(state, stockpile, quantity - available));
  let remaining = quantity;
  const portions = [];
  for (const batch of batches) {
    const taken = Math.min(remaining, batch.quantityRemaining);
    if (!taken) continue;
    batch.quantityRemaining -= taken;
    portions.push({ batchId: batch.id, quantity: taken });
    remaining -= taken;
    if (!remaining) break;
  }
  transaction(state, details.type ?? "food_withdrawn", {
    itemKind: stockpile.itemKind,
    quantity: quantity - remaining,
    stockpileId,
    portions,
    ...details,
  });
  return portions;
}

function deteriorationMultiplier(protection) {
  return (
    {
      dry: 0.2,
      covered: 0.45,
      fixture: 0.35,
      outdoor: 1,
      loose_pile: 1.25,
    }[protection] ?? 0.75
  );
}

function spoilStockpile(state, stockpile, day, events) {
  const profile = storageItemProfile(stockpile.itemKind),
    protection = stockpileStorageProtection(state, stockpile.id),
    decay = profile.deteriorationPerDay * deteriorationMultiplier(protection);
  if (decay <= 0 || stockpile.quantity <= 0) return;
  stockpile.deteriorationProgress =
    (stockpile.deteriorationProgress ?? 0) + stockpile.quantity * decay;
  const quantity = Math.min(
    stockpile.quantity,
    Math.floor(stockpile.deteriorationProgress + Number.EPSILON),
  );
  if (quantity <= 0) return;
  stockpile.deteriorationProgress -= quantity;
  const portions = withdrawFood(state, stockpile.id, quantity, {
    type: "food_spoiled",
    day,
    protection,
  });
  stockpile.quantity -= quantity;
  events.push({
    type: "food_spoiled",
    stockpileId: stockpile.id,
    itemKind: stockpile.itemKind,
    quantity,
    portions,
    protection,
    day,
  });
}

export function advanceFoodDeterioration(state, events = []) {
  ensureVillageFoodSystem(state);
  const day = state.village.clock?.day ?? 1,
    previous = state.village.lastFoodDeteriorationDay ?? day;
  for (let current = previous + 1; current <= day; current += 1)
    for (const stockpile of state.village.stockpiles)
      if (FOOD_ITEM_KINDS.has(stockpile.itemKind))
        spoilStockpile(state, stockpile, current, events);
  state.village.lastFoodDeteriorationDay = Math.max(previous, day);
  return events;
}

export function depositFood(
  state,
  stockpileId,
  itemKind,
  portions,
  details = {},
) {
  ensureVillageFoodSystem(state);
  for (const portion of portions) {
    const batch = state.village.foodLedger.batches.find(
      (candidate) => candidate.id === portion.batchId,
    );
    if (!batch) continue;
    batch.stockpileId = stockpileId;
    batch.quantityRemaining += portion.quantity;
  }
  transaction(state, details.type ?? "food_deposited", {
    itemKind,
    quantity: portions.reduce((total, portion) => total + portion.quantity, 0),
    stockpileId,
    portions,
    ...details,
  });
}

export function produceFood(state, stockpileId, quantity, details = {}) {
  ensureVillageFoodSystem(state);
  const stockpile = state.village.stockpiles.find(
    (candidate) => candidate.id === stockpileId,
  );
  if (!stockpile || !FOOD_ITEM_KINDS.has(stockpile.itemKind)) return null;
  return addBatch(state, {
    itemKind: stockpile.itemKind,
    quantity,
    stockpileId,
    originType: details.originType ?? "production",
    originId: details.originId ?? null,
    sourceBatchIds: details.sourceBatchIds ?? [],
  });
}

const CROP_ACTION_PRIORITY = Object.freeze({
  mature: 0,
  harvestable: 0,
  failed: 1,
  prepared: 2,
  fallow: 3,
});

function cropActionPriority(plot) {
  return plot.cutOrdered ? -1 : CROP_ACTION_PRIORITY[plot.stage];
}

function cropJobPlot(state, definition) {
  if (!definition) return null;
  return state.village.cropPlots
    .filter(
      (plot) =>
        plot.cropKind === definition.itemKind &&
        (plot.cutOrdered ||
          (CROP_ACTION_PRIORITY[plot.stage] != null &&
            (plot.stage !== "prepared" || plot.sowingAllowed !== false))),
    )
    .sort(
      (left, right) =>
        cropActionPriority(left) - cropActionPriority(right) ||
        left.id.localeCompare(right.id),
    )[0];
}

export function cropActionForJob(state, jobType) {
  ensureVillageFoodSystem(state);
  const definition = Object.values(CROP_DEFINITIONS).find(
      (candidate) => candidate.jobType === jobType,
    ),
    plot = cropJobPlot(state, definition);
  if (!plot) return null;
  const action = plot.cutOrdered
    ? "cut"
    : plot.stage === "fallow"
      ? "prepare"
      : plot.stage === "prepared"
        ? "sow"
        : ["mature", "harvestable"].includes(plot.stage)
          ? "harvest"
          : plot.stage === "failed"
            ? "recover"
            : null;
  if (!action) return null;
  const queue = ensureCropWorkQueue(plot, action);
  releaseStaleCropClaims(state, queue);
  const cell = nextCropWorkCell(queue);
  syncFarmingSkillQueue(state);
  return cell ? { action, plot, definition, queue, cell } : null;
}

export function cropCellGrowthAt(plot, x, y) {
  const cell =
    plot.workQueue?.action === "sow"
      ? plot.workQueue.cells.find(
          (item) => item.position.x === x && item.position.y === y,
        )
      : null;
  if (cell?.plantedAtTick == null) return null;
  const progress = cell.growthProgress ?? 0;
  return {
    progress,
    stage:
      progress >= 1 ? "mature" : progress >= 0.15 ? "growing" : "germinating",
  };
}

export function fieldExpansionTreeCells(expansion, terrainAt) {
  const cells = [];
  for (
    let y = expansion.area.y;
    y < expansion.area.y + expansion.area.height;
    y += 1
  )
    for (
      let x = expansion.area.x;
      x < expansion.area.x + expansion.area.width;
      x += 1
    )
      if (terrainAt({ x, y }) === "outdoor_tree") cells.push({ x, y });
  return cells;
}

// function-length-exempt: template -- crop-plot state construction
function expansionPlot(state, expansion) {
  return {
    id: namedUuid(state.id, `crop-plot:${expansion.key}`),
    definitionId: definitionId("crop-plot", expansion.cropKind),
    entityType: "crop-plot",
    key: expansion.key,
    cropKind: expansion.cropKind,
    position: { ...expansion.workPosition },
    workPosition: { ...expansion.workPosition },
    area: { ...expansion.area },
    stage: "fallow",
    plantedAtTick: null,
    harvestableAtTick: null,
    seedBatchIds: [],
    cycle: 0,
    fertility: 60,
    moisture: 70,
    cropDamage: 0,
    growthProgress: 0,
    growthRate: 0,
    growthPhase: "fallow",
    lastGrowthTick: state.tick,
    lastMoistureDay: state.village.clock?.day ?? 1,
    sowingAllowed: true,
    cutOrdered: false,
  };
}

export function activateFieldExpansion(state, expansionKey) {
  ensureVillageFoodSystem(state);
  const expansion = state.village.fieldExpansions.find(
    (candidate) => candidate.key === expansionKey,
  );
  if (!expansion || expansion.status === "active") return null;
  const plot = expansionPlot(state, expansion);
  state.village.cropPlots.push(plot);
  state.village.modifications = (state.village.modifications ?? []).filter(
    (entry) =>
      entry.x < expansion.area.x ||
      entry.x >= expansion.area.x + expansion.area.width ||
      entry.y < expansion.area.y ||
      entry.y >= expansion.area.y + expansion.area.height,
  );
  expansion.status = "active";
  expansion.activatedAtTick = state.tick;
  expansion.cropPlotId = plot.id;
  transaction(state, "field_opened", {
    expansionId: expansion.id,
    cropPlotId: plot.id,
    cropKind: plot.cropKind,
    clearedTreeCount: expansion.clearedTreeCount,
  });
  return plot;
}

function recoverCrop(plot) {
  plot.stage = "prepared";
  plot.cropDamage = Math.max(0, (plot.cropDamage ?? 0) - 50);
  plot.growthProgress = 0;
  plot.growthPhase = "prepared";
}

function sowCrop(state, job, plot) {
  plot.stage = "germinating";
  plot.cycle += 1;
  plot.plantedAtTick = state.tick;
  const fertilityFactor = 1 + (60 - plot.fertility) / 200;
  plot.harvestableAtTick =
    state.tick + Math.ceil(job.plan.cropGrowthTicks * fertilityFactor);
  plot.seedBatchIds = [
    ...new Set([
      ...(plot.pendingSeedBatchIds ?? []),
      ...(job.plan.foodInputBatchIds ?? []),
    ]),
  ];
  plot.pendingSeedBatchIds = [];
  plot.growthProgress = 0;
  plot.growthPhase = "germinating";
  plot.lastGrowthTick = state.tick;
  plot.lastMoistureDay = state.village.clock?.day ?? 1;
  plot.expectedMaturityDay =
    (state.village.clock?.day ?? 1) +
    Math.ceil(job.plan.cropGrowthTicks / TICKS_PER_DAY);
}

function harvestCrop(plot) {
  plot.stage = "fallow";
  plot.plantedAtTick = null;
  plot.harvestableAtTick = null;
  plot.fertility = Math.max(0, plot.fertility - 10);
  plot.growthProgress = 0;
  plot.growthRate = 0;
  plot.growthPhase = "fallow";
  plot.cutOrdered = false;
}

function cutCrop(plot) {
  harvestCrop(plot);
  plot.seedBatchIds = [];
}

export function applyCropAction(state, job) {
  const action = job.plan?.cropAction,
    plot = state.village.cropPlots?.find(
      (candidate) => candidate.id === job.plan?.cropPlotId,
  );
  if (!plot || !action) return;
  if (action === "sow" && job.plan.foodInputBatchIds?.length)
    plot.pendingSeedBatchIds = [
      ...new Set([
        ...(plot.pendingSeedBatchIds ?? []),
        ...job.plan.foodInputBatchIds,
      ]),
    ];
  if (job.plan?.cropCellKey && !completeCropWorkCell(state, plot, job)) return;
  if (action === "prepare") plot.stage = "prepared";
  if (action === "recover") recoverCrop(plot);
  if (action === "sow") sowCrop(state, job, plot);
  if (action === "harvest") harvestCrop(plot);
  if (action === "cut") cutCrop(plot);
  transaction(state, `crop_${action}`, {
    plotId: plot.id,
    cropKind: plot.cropKind,
    cycle: plot.cycle,
    jobId: job.id,
  });
}

function completeCropWorkCell(state, plot, job) {
  const queue = plot.workQueue,
    cell = queue?.cells.find((item) => item.key === job.plan.cropCellKey);
  if (!cell || queue.action !== job.plan.cropAction) return false;
  cell.status = "complete";
  cell.claimedByJobId = job.id;
  if (queue.action === "sow") {
    cell.plantedAtTick ??= state.tick;
    cell.growthProgress ??= 0;
  }
  queue.completedCount = queue.cells.filter(
    (item) => item.status === "complete",
  ).length;
  queue.lastCompletedCellKey = cell.key;
  return queue.completedCount === queue.cells.length;
}

function seasonalCropFactor(day) {
  return { spring: 1, summer: 1.1, autumn: 0.75, winter: 0 }[
    grazingSeason(day).key
  ];
}

function cropGrowthRate(state, plot) {
  const season = grazingSeason(state.village.clock?.day ?? 1).key,
    fertility = Math.max(0, Math.min(1, (plot.fertility ?? 60) / 60)),
    moisture = Math.max(0, Math.min(1, (plot.moisture ?? 70) / 60)),
    damage = Math.max(0, 1 - (plot.cropDamage ?? 0) / 100);
  plot.growthConditions = {
    season,
    fertility: plot.fertility ?? 60,
    moisture: plot.moisture ?? 70,
    damage: plot.cropDamage ?? 0,
    light: state.village.clock?.phase === "night" ? 0 : 1,
  };
  return (
    seasonalCropFactor(state.village.clock?.day ?? 1) *
    fertility *
    moisture *
    damage
  );
}

function dailyMoistureLoss(day) {
  return { spring: 6, summer: 12, autumn: 5, winter: 1 }[
    grazingSeason(day).key
  ];
}

function advanceCropMoisture(state, plot) {
  const day = state.village.clock?.day ?? 1,
    lastDay = plot.lastMoistureDay ?? day,
    elapsedDays = Math.max(0, day - lastDay);
  if (elapsedDays === 0) return 0;
  plot.moisture = Math.max(
    0,
    (plot.moisture ?? 70) - elapsedDays * dailyMoistureLoss(day),
  );
  plot.lastMoistureDay = day;
  return elapsedDays;
}

function advanceCropDamage(plot, elapsedDays) {
  if (elapsedDays <= 0) return;
  if (plot.moisture <= 15) {
    plot.cropDisease = "drought_wilt";
    plot.cropDamage = Math.min(100, plot.cropDamage + elapsedDays * 10);
  } else if (plot.moisture >= 90) {
    plot.cropDisease = "fungal_blight";
    plot.cropDamage = Math.min(100, plot.cropDamage + elapsedDays * 10);
  }
}

function updateCropStage(plot) {
  if (plot.growthProgress >= 1) {
    plot.stage = "mature";
    plot.growthPhase = "mature";
  } else if (plot.growthProgress >= 0.15) {
    plot.stage = "growing";
    plot.growthPhase = "growing";
  } else {
    plot.stage = "germinating";
    plot.growthPhase = "germinating";
  }
}

function cropGrowthDuration(plot) {
  const definition = Object.values(CROP_DEFINITIONS).find(
    (candidate) => candidate.itemKind === plot.cropKind,
  );
  if (plot.harvestableAtTick != null && plot.plantedAtTick != null)
    return Math.max(1, plot.harvestableAtTick - plot.plantedAtTick);
  return definition?.growthTicks ?? TICKS_PER_DAY;
}

function advanceGrowingPlot(state, plot) {
  const elapsed = Math.max(0, state.tick - (plot.lastGrowthTick ?? state.tick)),
    duration = cropGrowthDuration(plot);
  const elapsedDays = advanceCropMoisture(state, plot);
  advanceCropDamage(plot, elapsedDays);
  const rate = cropGrowthRate(state, plot);
  advanceSownCells(state, plot, duration, rate);
  plot.growthRate = rate;
  plot.growthProgress = Math.min(
    1,
    (plot.growthProgress ?? 0) + (elapsed / duration) * rate,
  );
  plot.lastGrowthTick = state.tick;
  updateCropStage(plot);
  if (rate <= 0) plot.stressTicks = (plot.stressTicks ?? 0) + elapsed;
  else plot.stressTicks = Math.max(0, (plot.stressTicks ?? 0) - elapsed);
  if (plot.stressTicks >= duration) {
    plot.stage = "failed";
    plot.growthPhase = "failed";
  }
}

function advanceSownCells(state, plot, duration, rate) {
  if (plot.workQueue?.action !== "sow") return;
  for (const cell of plot.workQueue.cells)
    if (cell.plantedAtTick != null)
      cell.growthProgress = Math.min(
        1,
        ((state.tick - cell.plantedAtTick) / duration) * rate,
      );
}

function advancePartialSowing(state, plot) {
  const duration = cropGrowthDuration(plot),
    rate = cropGrowthRate(state, plot),
    cells = plot.workQueue.cells;
  advanceSownCells(state, plot, duration, rate);
  plot.growthRate = rate;
  plot.growthProgress =
    cells.reduce((sum, cell) => sum + (cell.growthProgress ?? 0), 0) /
    cells.length;
  plot.growthPhase = "sowing";
}

export function applyFieldFertilizer(state, job) {
  const plot = state.village.cropPlots?.find(
    (candidate) => candidate.id === job.plan?.fertilityPlotId,
  );
  if (!plot) return null;
  plot.fertility = Math.min(100, (plot.fertility ?? 60) + 20);
  plot.manureApplications = (plot.manureApplications ?? 0) + 1;
  transaction(state, "field_fertilized", {
    plotId: plot.id,
    cropKind: plot.cropKind,
    fertility: plot.fertility,
    jobId: job.id,
  });
  return plot;
}

export function applyFieldWater(state, job) {
  const plot = state.village.cropPlots?.find(
    (candidate) => candidate.id === job.plan?.waterPlotId,
  );
  if (!plot) return null;
  plot.moisture = Math.min(100, (plot.moisture ?? 0) + 40);
  if (plot.cropDisease === "drought_wilt" && plot.moisture >= 40)
    plot.cropDisease = null;
  plot.lastWateredAtTick = state.tick;
  transaction(state, "field_watered", {
    plotId: plot.id,
    cropKind: plot.cropKind,
    moisture: plot.moisture,
    jobId: job.id,
  });
  return plot;
}

export function applyCropTreatment(state, job) {
  const plot = state.village.cropPlots?.find(
    (candidate) => candidate.id === job.plan?.cropTreatmentPlotId,
  );
  if (!plot) return null;
  plot.cropDamage = Math.max(0, (plot.cropDamage ?? 0) - 40);
  if (plot.cropDamage < 20) plot.cropDisease = null;
  plot.lastTreatedAtTick = state.tick;
  transaction(state, "crop_treated", {
    plotId: plot.id,
    cropKind: plot.cropKind,
    damage: plot.cropDamage,
    jobId: job.id,
  });
  return plot;
}

export function advanceCropGrowth(state) {
  ensureVillageFoodSystem(state);
  for (const plot of state.village.cropPlots) {
    if (
      plot.stage === "prepared" &&
      plot.workQueue?.action === "sow" &&
      plot.workQueue.completedCount > 0
    )
      advancePartialSowing(state, plot);
    if (["germinating", "growing"].includes(plot.stage)) {
      const before = plot.stage;
      advanceGrowingPlot(state, plot);
      if (plot.stage === "mature" && before !== "mature")
        transaction(state, "crop_matured", {
          plotId: plot.id,
          cropKind: plot.cropKind,
          cycle: plot.cycle,
        });
    }
  }
}

// function-length-exempt: template -- provenance audit projection
export function foodProvenanceAudit(state) {
  ensureVillageFoodSystem(state);
  const batchIds = new Set(
      state.village.foodLedger.batches.map((batch) => batch.id),
    ),
    missingSources = state.village.foodLedger.batches.flatMap((batch) =>
      batch.sourceBatchIds
        .filter((id) => !batchIds.has(id))
        .map((id) => ({ batchId: batch.id, sourceBatchId: id })),
    ),
    negativeBatches = state.village.foodLedger.batches
      .filter((batch) => batch.quantityRemaining < 0)
      .map((batch) => batch.id),
    consumed = state.village.foodLedger.transactions.filter(
      (entry) => entry.type === "meal_consumed",
    ),
    invalidConsumption = consumed.filter(
      (entry) =>
        !entry.actorId ||
        !entry.stockpileId ||
        !entry.portions?.length ||
        entry.portions.some((portion) => !batchIds.has(portion.batchId)),
    );
  return {
    passed:
      missingSources.length === 0 &&
      negativeBatches.length === 0 &&
      invalidConsumption.length === 0,
    batches: state.village.foodLedger.batches.length,
    transactions: state.village.foodLedger.transactions.length,
    missingSources,
    negativeBatches,
    consumedMeals: consumed.length,
    invalidConsumption: invalidConsumption.map((entry) => entry.id),
  };
}

export function discardInitialFood(state) {
  ensureVillageFoodSystem(state);
  const removed = {};
  for (const batch of state.village.foodLedger.batches) {
    if (
      batch.originType !== "initial_stock" ||
      batch.quantityRemaining <= 0 ||
      ["seed_grain", "animal_feed"].includes(batch.itemKind)
    )
      continue;
    const stockpile = state.village.stockpiles.find(
      (candidate) => candidate.id === batch.stockpileId,
    );
    if (!stockpile) continue;
    const quantity = Math.min(batch.quantityRemaining, stockpile.quantity);
    if (!quantity) continue;
    batch.quantityRemaining -= quantity;
    stockpile.quantity -= quantity;
    removed[batch.itemKind] = (removed[batch.itemKind] ?? 0) + quantity;
    transaction(state, "initial_food_retired", {
      batchId: batch.id,
      itemKind: batch.itemKind,
      quantity,
      stockpileId: stockpile.id,
    });
  }
  return removed;
}

export function retireFoodAbove(state, stockpileKey, targetQuantity) {
  const stockpile = state.village.stockpiles.find(
    (candidate) => candidate.key === stockpileKey,
  );
  if (!stockpile || stockpile.quantity <= targetQuantity) return 0;
  const quantity = stockpile.quantity - targetQuantity;
  withdrawFood(state, stockpile.id, quantity, {
    type: "food_retired",
    reason: "proof_starting_stock_cap",
  });
  stockpile.quantity -= quantity;
  return quantity;
}

export { CROP_DEFINITIONS };
