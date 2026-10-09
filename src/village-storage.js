import { definitionId, namedUuid } from "./identity.js";

export const STORAGE_SCHEMA_VERSION = 6;
export const DEFAULT_CELL_ALLOWANCE = 10;

const ALL_STORAGE_TIERS = [
  "ground",
  "covered_floor",
  "rack",
  "shelves",
  "bin",
  "granary",
  "container",
];

const ITEM_STORAGE_PROFILES = Object.freeze({
  timber_log: {
    stackSize: 10,
    volume: 1,
    deteriorationPerDay: 0.01,
    compatibleTiers: ["ground", "rack", "container"],
  },
  building_lumber: {
    stackSize: 20,
    volume: 1,
    deteriorationPerDay: 0.005,
    compatibleTiers: ["rack", "covered_floor", "container"],
  },
  grain: {
    stackSize: 20,
    volume: 0.5,
    deteriorationPerDay: 0.01,
    compatibleTiers: ["granary", "bin", "container"],
  },
  seed_grain: {
    stackSize: 20,
    volume: 0.5,
    deteriorationPerDay: 0.005,
    compatibleTiers: ["granary", "bin", "container"],
  },
  flour: {
    stackSize: 12,
    volume: 0.5,
    deteriorationPerDay: 0.03,
    compatibleTiers: ["granary", "shelves", "container"],
  },
  raw_fish: {
    stackSize: 6,
    volume: 1,
    deteriorationPerDay: 0.2,
    compatibleTiers: ["covered_floor", "container"],
  },
  meat: {
    stackSize: 6,
    volume: 1,
    deteriorationPerDay: 0.16,
    compatibleTiers: ["covered_floor", "granary", "container"],
  },
  vegetables: {
    stackSize: 12,
    volume: 0.5,
    deteriorationPerDay: 0.06,
    compatibleTiers: ["granary", "covered_floor", "container"],
  },
  milk: {
    stackSize: 8,
    volume: 1,
    deteriorationPerDay: 0.25,
    compatibleTiers: ["granary", "covered_floor", "container"],
  },
  egg: {
    stackSize: 12,
    volume: 0.5,
    deteriorationPerDay: 0.08,
    compatibleTiers: ["granary", "covered_floor", "container"],
  },
  wild_forage: {
    stackSize: 8,
    volume: 0.5,
    deteriorationPerDay: 0.12,
    compatibleTiers: ["granary", "covered_floor", "container"],
  },
  hearty_meal: {
    stackSize: 8,
    volume: 1,
    deteriorationPerDay: 0.08,
    compatibleTiers: ["covered_floor", "shelves", "container"],
  },
  animal_feed: {
    stackSize: 20,
    volume: 0.5,
    deteriorationPerDay: 0.02,
    compatibleTiers: ["granary", "bin", "container"],
  },
  stone: {
    stackSize: 12,
    volume: 2,
    deteriorationPerDay: 0,
    compatibleTiers: ["ground", "bin", "container"],
  },
  iron_ore: {
    stackSize: 6,
    volume: 2,
    deteriorationPerDay: 0,
    compatibleTiers: ["bin", "container"],
  },
  copper_ore: {
    stackSize: 6,
    volume: 2,
    deteriorationPerDay: 0,
    compatibleTiers: ["bin", "container"],
  },
  tin_ore: {
    stackSize: 6,
    volume: 2,
    deteriorationPerDay: 0,
    compatibleTiers: ["bin", "container"],
  },
});

export function storageItemProfile(itemKind) {
  return structuredClone(
    ITEM_STORAGE_PROFILES[itemKind] ?? {
      stackSize: 10,
      volume: 1,
      deteriorationPerDay: 0,
      compatibleTiers: ALL_STORAGE_TIERS,
    },
  );
}

function zoneAcceptsStockpile(zone, stockpile) {
  return Boolean(
    zone &&
    stockpile &&
    zone.allowedItemKinds.includes(stockpile.itemKind) &&
    storageItemProfile(stockpile.itemKind).compatibleTiers.includes(zone.tier),
  );
}

const STORAGE_AREA_PLANS = [
  {
    key: "finished-lumber-yard",
    designation: "finished lumber rack yard",
    stockpileKeys: ["lumber_yard_lumber"],
    area: { x: -56, y: 11, width: 22, height: 2 },
    cellAllowance: 100,
    tier: "rack",
    protection: "covered",
    stackSlots: 4,
  },
  {
    key: "bulk-yard",
    designation: "outdoor bulk yard",
    stockpileKeys: ["lumber_camp_logs", "lumber_yard_project"],
    area: { x: -56, y: 1, width: 22, height: 8 },
    tier: "ground",
    protection: "outdoor",
    stackSlots: 1,
  },
  {
    key: "camp-store",
    designation: "founding camp store",
    stockpileKeys: [
      "inn_meals",
      "inn_fish",
      "wild_forage",
      "founding_axes",
      "founding_saws",
      "founding_pickaxes",
      "founding_hammers",
      "housing_project",
    ],
    area: { x: -9, y: 14, width: 7, height: 7 },
    tier: "covered_floor",
    protection: "covered",
    stackSlots: 1,
  },
  {
    key: "farm-store",
    designation: "farm stores",
    stockpileKeys: [
      "farmstead_project",
      "farm_seed",
      "farm_grain",
      "mill_flour",
      "farm_vegetables",
      "dairy_milk",
      "pasture_meat",
      "stable_feed",
      "farm_eggs",
      "sheep_wool",
      "farm_manure",
    ],
    area: { x: -57, y: 30, width: 13, height: 2 },
    tier: "granary",
    protection: "dry",
    stackSlots: 1,
  },
  {
    key: "trade-store",
    designation: "trade and metal yard",
    stockpileKeys: [
      "forge_iron",
      "forge_steel",
      "forge_copper",
      "forge_tin",
      "forge_brass",
      "merchant_goods",
    ],
    area: { x: 6, y: 2, width: 8, height: 4 },
    tier: "shelves",
    protection: "covered",
    stackSlots: 4,
  },
  {
    key: "quarry-yard",
    designation: "quarry stone yard",
    stockpileKeys: [
      "quarry_stone",
      "mine_iron_ore",
      "mine_copper_ore",
      "mine_tin_ore",
    ],
    area: { x: 24, y: 30, width: 6, height: 4 },
    tier: "bin",
    protection: "outdoor",
    stackSlots: 1,
  },
];

const STORAGE_BLOCKING_KINDS = new Set([
  "wall",
  "door",
  "gate",
  "fence",
  "fixture",
]);

function positionKey(position) {
  return `${position.x},${position.y}`;
}

function blockFootprint(blocked, item) {
  const origin = item.position ?? item;
  for (let y = origin.y; y < origin.y + (item.height ?? 1); y += 1)
    for (let x = origin.x; x < origin.x + (item.width ?? 1); x += 1)
      blocked.add(`${x},${y}`);
}

function plannedConstructionWork(state) {
  return (state.village.jobs ?? [])
    .filter((job) =>
      ["available", "reserved", "active", "blocked", "suspended"].includes(
        job.status,
      ),
    )
    .map((job) => job.plan?.constructionWork)
    .filter(Boolean);
}

function blockConstructionWork(blocked, work) {
  if (work.site) blockFootprint(blocked, work.site);
  for (const enclosure of work.enclosures ?? [])
    blockFootprint(blocked, enclosure);
  for (const element of work.elements ?? [])
    if (STORAGE_BLOCKING_KINDS.has(element.kind))
      blockFootprint(blocked, element);
}

function storageBlockedPositions(state) {
  const blocked = new Set();
  for (const building of state.village.buildings ?? [])
    blockFootprint(blocked, {
      position: { x: building.x, y: building.y },
      width: building.w,
      height: building.h,
    });
  for (const pasture of state.village.pastures ?? [])
    blockFootprint(blocked, {
      position: { x: pasture.x, y: pasture.y },
      width: pasture.w,
      height: pasture.h,
    });
  for (const fixture of state.village.fixtures ?? [])
    blockFootprint(blocked, fixture);
  for (const primitive of state.village.constructionPrimitives ?? [])
    if (STORAGE_BLOCKING_KINDS.has(primitive.kind))
      blockFootprint(blocked, primitive);
  for (const work of plannedConstructionWork(state))
    blockConstructionWork(blocked, work);
  return blocked;
}

function groupsByContainer(stockpiles) {
  const groups = new Map();
  for (const stockpile of stockpiles) {
    const entries = groups.get(stockpile.containerId) ?? [];
    entries.push(stockpile);
    groups.set(stockpile.containerId, entries);
  }
  return [...groups.entries()].sort(([, left], [, right]) =>
    left[0].key.localeCompare(right[0].key),
  );
}

function areasOverlap(left, right) {
  return !(
    left.x + left.width <= right.x ||
    right.x + right.width <= left.x ||
    left.y + left.height <= right.y ||
    right.y + right.height <= left.y
  );
}

function expandedFieldArea(field) {
  const gap = field.clearance ?? 2;
  return {
    x: field.x - gap,
    y: field.y - gap,
    width: field.w + gap * 2,
    height: field.h + gap * 2,
  };
}

function plannedFarmAreas(state, barn, fields) {
  const sites = state.village.development?.constructionSites ?? [];
  return [
    ...fields,
    { x: barn.x, y: barn.y, width: barn.w, height: barn.h },
    ...(barn.enclosures ?? []).map((area) => ({
      x: area.x,
      y: area.y,
      width: area.w,
      height: area.h,
    })),
    ...sites
      .filter((site) => site.key !== barn.key)
      .map((site) => ({ x: site.x, y: site.y, width: site.w, height: site.h })),
  ];
}

function temporaryFarmStoreArea(state, fallback) {
  const plan = state.village.development?.masterPlan,
    barn = state.village.development?.constructionSites?.find(
      (site) => site.key === "farmstead",
    ) ?? { x: -34, y: 25, w: 12, h: 8 },
    fields = (plan?.fieldBoundaries ?? []).map(expandedFieldArea),
    reserved = plannedFarmAreas(state, barn, fields),
    candidates = [
      { x: barn.x, y: barn.y - 4, width: 13, height: 2 },
      { x: barn.x - 14, y: barn.y, width: 13, height: 2 },
      { x: barn.x + barn.w + 2, y: barn.y, width: 13, height: 2 },
      { x: barn.x, y: barn.y + barn.h + 2, width: 13, height: 2 },
    ];
  return (
    candidates.find((area) =>
      reserved.every((blocked) => !areasOverlap(area, blocked)),
    ) ?? fallback
  );
}

function storagePlan(state, stockpiles) {
  const keys = new Set(stockpiles.map((stockpile) => stockpile.key));
  if (stockpiles[0].containerKind === "field_pile")
    return {
      key: `field-pile-${stockpiles[0].id}`,
      designation: "field harvest pile",
      area: { ...stockpiles[0].position, width: 1, height: 1 },
      allowContainerCell: true,
      tier: "container",
      protection: "outdoor",
      stackSlots: 1,
    };
  const plan = (state.village.scenario === "founding"
    ? STORAGE_AREA_PLANS.find((plan) =>
        plan.stockpileKeys.some((key) => keys.has(key)),
      )
    : null) ?? {
    key: `container-${stockpiles[0].containerKind}`,
    designation: stockpiles[0].containerKind,
    area: {
      ...stockpiles[0].position,
      width: 1,
      height: 1,
    },
    allowContainerCell: true,
    stackSlots: storageStackCount(stockpiles, "capacity"),
  };
  if (plan.key !== "farm-store") return plan;
  return farmBarnStoragePlan(state, {
    ...plan,
    area: temporaryFarmStoreArea(state, plan.area),
  });
}

function farmBarnStoragePlan(state, fallback) {
  const building = state.village.buildings?.find(
    (candidate) => candidate.key === "farmstead",
  );
  if (!state.village.facilities.includes("farmstead") || !building?.storageArea)
    return fallback;
  return {
    ...fallback,
    designation: "farmstead food and fodder barn",
    area: { ...building.storageArea },
    cellAllowance: 40,
    stackSlots: 4,
    allowOwnStructureCells: true,
    structureKey: "farmstead",
  };
}

function plannedPositions(plan) {
  const positions = [];
  for (let y = plan.area.y; y < plan.area.y + plan.area.height; y += 1)
    for (let x = plan.area.x; x < plan.area.x + plan.area.width; x += 1)
      positions.push({ x, y });
  return positions;
}

function positionInside(item, position) {
  const origin = item.position ?? item;
  return (
    position.x >= origin.x &&
    position.y >= origin.y &&
    position.x < origin.x + (item.width ?? 1) &&
    position.y < origin.y + (item.height ?? 1)
  );
}

function hasForeignStructure(state, position) {
  if (
    (state.village.constructionPrimitives ?? []).some(
      (item) =>
        STORAGE_BLOCKING_KINDS.has(item.kind) && positionInside(item, position),
    )
  )
    return true;
  return plannedConstructionWork(state).some((work) =>
    (work.elements ?? []).some(
      (item) =>
        STORAGE_BLOCKING_KINDS.has(item.kind) && positionInside(item, position),
    ),
  );
}

function storageAllowance(plan, stockpiles) {
  if (plan.cellAllowance) return plan.cellAllowance;
  if (!plan.allowContainerCell) return DEFAULT_CELL_ALLOWANCE;
  return Math.max(
    DEFAULT_CELL_ALLOWANCE,
    storageVolume(stockpiles, "capacity"),
  );
}

function storageVolume(stockpiles, field = "quantity") {
  return stockpiles.reduce(
    (total, item) =>
      total + item[field] * storageItemProfile(item.itemKind).volume,
    0,
  );
}

function storageStackCount(stockpiles, field = "quantity") {
  return stockpiles.reduce(
    (total, item) =>
      total +
      Math.ceil(item[field] / storageItemProfile(item.itemKind).stackSize),
    0,
  );
}

function zoneCells(runId, containerId, plan, count, allowance, occupied) {
  const cells = [];
  for (const position of plannedPositions(plan)) {
    if (cells.length >= count) break;
    const key = positionKey(position);
    if (occupied.has(key)) continue;
    occupied.add(key);
    cells.push({
      id: namedUuid(runId, `storage-cell:${containerId}:${cells.length}`),
      ...position,
      allowance,
      stackSlots: plan.stackSlots ?? 1,
    });
  }
  return cells;
}

function defaultZone(state, containerId, stockpiles, occupied) {
  const plan = storagePlan(state, stockpiles),
    anchor = { x: plan.area.x, y: plan.area.y },
    allowance = storageAllowance(plan, stockpiles),
    planned = storageVolume(stockpiles, "capacity"),
    volumeCells = Math.ceil(planned / allowance),
    stackCells = Math.ceil(
      storageStackCount(stockpiles, "capacity") / (plan.stackSlots ?? 1),
    ),
    count = Math.max(1, volumeCells, stackCells);
  if (plan.allowOwnStructureCells)
    for (const position of plannedPositions(plan))
      occupied.delete(positionKey(position));
  if (plan.allowContainerCell && !hasForeignStructure(state, anchor))
    occupied.delete(positionKey(stockpiles[0].position));
  return {
    id: namedUuid(state.id, `storage-zone:${containerId}`),
    definitionId: definitionId("storage-zone", stockpiles[0].containerKind),
    entityType: "storage-zone",
    containerId,
    containerKind: stockpiles[0].containerKind,
    planKey: plan.key,
    designation: plan.designation,
    structureKey: plan.structureKey ?? null,
    tier: plan.tier ?? (plan.allowContainerCell ? "container" : "ground"),
    protection:
      plan.protection ?? (plan.allowContainerCell ? "fixture" : "outdoor"),
    anchor,
    priority: 50,
    allowedItemKinds: [...new Set(stockpiles.map((item) => item.itemKind))],
    cells: zoneCells(state.id, containerId, plan, count, allowance, occupied),
  };
}

function reusableCells(current, fallback, occupied) {
  const minimumCount = fallback.cells.length,
    currentCapacity = current?.cells?.reduce(
      (total, cell) => total + cell.allowance,
      0,
    ),
    requiredCapacity = fallback.cells.reduce(
      (total, cell) => total + cell.allowance,
      0,
    );
  if (!current?.cells?.length || current.cells.length < minimumCount)
    return false;
  if (currentCapacity < requiredCapacity) return false;
  if (current.planKey !== fallback.planKey) return false;
  const fallbackPositions = new Set(
    fallback.cells.map((cell) => `${cell.x},${cell.y}`),
  );
  if (
    !current.cells.every((cell) => fallbackPositions.has(`${cell.x},${cell.y}`))
  )
    return false;
  return current.cells.every((cell) => !occupied.has(`${cell.x},${cell.y}`));
}

function claimCells(cells, occupied) {
  for (const cell of cells) occupied.add(`${cell.x},${cell.y}`);
  return cells;
}

function migrateCellPolicies(cells, fallback) {
  return cells.map((cell, index) => ({
    ...cell,
    stackSlots: cell.stackSlots ?? fallback.cells[index]?.stackSlots ?? 1,
  }));
}

function mergedAllowedKinds(current, fallback, upgradeFilters) {
  if (!current?.allowedItemKinds) return fallback.allowedItemKinds;
  if (!upgradeFilters) return current.allowedItemKinds;
  return [
    ...new Set([...current.allowedItemKinds, ...fallback.allowedItemKinds]),
  ];
}

function mergeZone(
  state,
  current,
  containerId,
  stockpiles,
  occupied,
  upgradeFilters,
) {
  const fallback = defaultZone(
    state,
    containerId,
    stockpiles,
    new Set(occupied),
  );
  if (!current) {
    claimCells(fallback.cells, occupied);
    return fallback;
  }
  const selected = reusableCells(current, fallback, occupied)
      ? claimCells(current.cells, occupied)
      : defaultZone(state, containerId, stockpiles, occupied).cells,
    cells = migrateCellPolicies(selected, fallback);
  return {
    ...fallback,
    priority: current.priority ?? fallback.priority,
    allowedItemKinds: mergedAllowedKinds(current, fallback, upgradeFilters),
    cells,
  };
}

function outputReservation(job) {
  if (!["available", "reserved", "active", "suspended"].includes(job.status))
    return null;
  if (job.production?.outputCreated) return null;
  if (job.production?.output)
    return {
      jobId: job.id,
      stockpileId: job.production.output.stockpileId,
      quantity: job.production.output.quantity,
    };
  if (job.transfer?.targetStockpileId && job.transfer.carriedQuantity > 0)
    return {
      jobId: job.id,
      stockpileId: job.transfer.targetStockpileId,
      quantity: job.transfer.carriedQuantity,
    };
  return null;
}

function incomingReservations(state) {
  return (state.village.jobs ?? []).map(outputReservation).filter(Boolean);
}

function cellStackCapacity(cell, stockpile, stacks) {
  const quantities = stacks.get(cell.id) ?? new Map(),
    stackSize = storageItemProfile(stockpile.itemKind).stackSize,
    usedSlots = [...quantities.entries()].reduce(
      (total, [kind, quantity]) =>
        total + Math.ceil(quantity / storageItemProfile(kind).stackSize),
      0,
    ),
    existing = quantities.get(stockpile.itemKind) ?? 0,
    existingSlots = Math.ceil(existing / stackSize),
    openExisting = existingSlots * stackSize - existing,
    openSlots = Math.max(0, (cell.stackSlots ?? 1) - usedSlots);
  return openExisting + openSlots * stackSize;
}

function claimCellStack(cell, stockpile, quantity, stacks) {
  const quantities = stacks.get(cell.id) ?? new Map();
  quantities.set(
    stockpile.itemKind,
    (quantities.get(stockpile.itemKind) ?? 0) + quantity,
  );
  stacks.set(cell.id, quantities);
}

function allocateToCells(zone, stockpile, quantity, used, stacks, kind) {
  const allocations = [];
  let remaining = quantity;
  const volume = storageItemProfile(stockpile.itemKind).volume;
  for (const cell of zone.cells) {
    const availableVolume = Math.max(
        0,
        cell.allowance - (used.get(cell.id) ?? 0),
      ),
      volumeCapacity = Math.floor((availableVolume + Number.EPSILON) / volume),
      stackCapacity = cellStackCapacity(cell, stockpile, stacks),
      stored = Math.min(remaining, volumeCapacity, stackCapacity);
    if (stored > 0) {
      allocations.push({
        cellId: cell.id,
        stockpileId: stockpile.id,
        itemKind: stockpile.itemKind,
        quantity: stored,
        kind,
      });
      used.set(cell.id, (used.get(cell.id) ?? 0) + stored * volume);
      claimCellStack(cell, stockpile, stored, stacks);
      remaining -= stored;
    }
    if (remaining <= 0) break;
  }
  return { allocations, remaining };
}

// function-length-exempt: template -- physical stock-zone construction
function allocateZone(state, zone, stockpiles, reservations) {
  const used = new Map(),
    stacks = new Map(),
    allocations = [],
    overflow = [];
  for (const stockpile of stockpiles.sort((a, b) =>
    a.key.localeCompare(b.key),
  )) {
    const storedQuantity = physicalStoredQuantity(stockpile, zone),
      allowed = zone.allowedItemKinds.includes(stockpile.itemKind),
      compatible = zoneAcceptsStockpile(zone, stockpile),
      result =
        allowed && compatible
          ? allocateToCells(
              zone,
              stockpile,
              storedQuantity,
              used,
              stacks,
              "stored",
            )
          : { allocations: [], remaining: storedQuantity };
    allocations.push(...result.allocations);
    if (result.remaining > 0)
      overflow.push({
        stockpileId: stockpile.id,
        itemKind: stockpile.itemKind,
        quantity: result.remaining,
        reason: !allowed
          ? "item_disallowed"
          : compatible
            ? "zone_full"
            : "tier_incompatible",
      });
  }
  for (const reservation of reservations) {
    const stockpile = stockpiles.find(
      (item) => item.id === reservation.stockpileId,
    );
    if (!zoneAcceptsStockpile(zone, stockpile)) continue;
    allocations.push(
      ...allocateToCells(
        zone,
        stockpile,
        reservation.quantity,
        used,
        stacks,
        "reserved",
      ).allocations.map((entry) => ({ ...entry, jobId: reservation.jobId })),
    );
  }
  return { allocations, overflow };
}

function physicalStoredQuantity(stockpile, zone) {
  if (zone.planKey.startsWith("field-pile-")) return stockpile.quantity;
  const atCell = zone.cells.some(
    (cell) =>
      cell.x === stockpile.position.x && cell.y === stockpile.position.y,
  );
  if (!Number.isFinite(stockpile.storedQuantity))
    stockpile.storedQuantity = atCell ? stockpile.quantity : 0;
  const previous = stockpile.storageQuantitySnapshot ?? stockpile.quantity;
  if (stockpile.quantity < previous)
    stockpile.storedQuantity -= previous - stockpile.quantity;
  stockpile.storedQuantity = Math.max(
    0,
    Math.min(stockpile.quantity, stockpile.storedQuantity),
  );
  stockpile.storageQuantitySnapshot = stockpile.quantity;
  return stockpile.storedQuantity;
}

function loosePilePosition(zone, index, occupied) {
  for (let radius = 1; radius <= 8; radius += 1)
    for (let offset = -radius; offset <= radius; offset += 1) {
      const candidates = [
        { x: zone.anchor.x + offset, y: zone.anchor.y - radius },
        { x: zone.anchor.x + radius, y: zone.anchor.y + offset },
        { x: zone.anchor.x - offset, y: zone.anchor.y + radius },
        { x: zone.anchor.x - radius, y: zone.anchor.y - offset },
      ];
      for (const position of candidates) {
        const key = positionKey(position);
        if (occupied.has(key) || index-- > 0) continue;
        occupied.add(key);
        return position;
      }
    }
  return { x: zone.anchor.x, y: zone.anchor.y };
}

function buildLoosePiles(state, zones, overflow, occupied, current = []) {
  return overflow.map((entry, index) => {
    const zone = zones.find((item) => {
        const stockpile = state.village.stockpiles.find(
          (candidate) => candidate.id === entry.stockpileId,
        );
        return item.containerId === stockpile?.containerId;
      }),
      existing = current.find((pile) => pile.stockpileId === entry.stockpileId),
      reusable = existing && !occupied.has(positionKey(existing)),
      position = reusable ? existing : loosePilePosition(zone, index, occupied);
    if (reusable) occupied.add(positionKey(existing));
    return {
      id: namedUuid(state.id, `storage-loose-pile:${entry.stockpileId}`),
      entityType: "storage-loose-pile",
      zoneId: zone.id,
      ...position,
      ...entry,
    };
  });
}

function reconcileStorageZones(state, groups, occupied, upgradeFilters) {
  return groups.map(([containerId, stockpiles]) =>
    mergeZone(
      state,
      state.village.storage.zones.find(
        (zone) => zone.containerId === containerId,
      ),
      containerId,
      stockpiles,
      occupied,
      upgradeFilters,
    ),
  );
}

function allocateStorageZones(state, zones, reservations) {
  return zones.map((zone) =>
    allocateZone(
      state,
      zone,
      state.village.stockpiles.filter(
        (stockpile) => stockpile.containerId === zone.containerId,
      ),
      reservations,
    ),
  );
}

export function reconcileVillageStorage(state) {
  state.village.storage ??= { version: STORAGE_SCHEMA_VERSION, zones: [] };
  const upgradeFilters =
      (state.village.storage.version ?? 0) < STORAGE_SCHEMA_VERSION,
    groups = groupsByContainer(state.village.stockpiles ?? []),
    reservations = incomingReservations(state),
    occupied = storageBlockedPositions(state),
    zones = reconcileStorageZones(state, groups, occupied, upgradeFilters),
    allocated = allocateStorageZones(state, zones, reservations);
  const overflow = allocated.flatMap((entry) => entry.overflow),
    loosePiles = buildLoosePiles(
      state,
      zones,
      overflow,
      occupied,
      state.village.storage.loosePiles,
    );
  state.village.storage = {
    version: STORAGE_SCHEMA_VERSION,
    zones,
    allocations: allocated.flatMap((entry) => entry.allocations),
    overflow,
    loosePiles,
  };
  return state.village.storage;
}

function zoneAllocationUsage(storage, zone, excludeJobId) {
  const ids = new Set(zone.cells.map((cell) => cell.id)),
    allocations = storage.allocations.filter(
      (entry) => ids.has(entry.cellId) && entry.jobId !== excludeJobId,
    ),
    used = new Map(),
    stacks = new Map();
  for (const entry of allocations) {
    const profile = storageItemProfile(entry.itemKind);
    used.set(
      entry.cellId,
      (used.get(entry.cellId) ?? 0) + entry.quantity * profile.volume,
    );
    claimCellStack(
      zone.cells.find((cell) => cell.id === entry.cellId),
      entry,
      entry.quantity,
      stacks,
    );
  }
  return { used, stacks };
}

function cellAvailableFor(cell, stockpile, used, stacks) {
  const volume = storageItemProfile(stockpile.itemKind).volume,
    freeVolume = Math.max(0, cell.allowance - (used.get(cell.id) ?? 0)),
    volumeCapacity = Math.floor((freeVolume + Number.EPSILON) / volume),
    stackCapacity = cellStackCapacity(cell, stockpile, stacks);
  return Math.min(volumeCapacity, stackCapacity);
}

function physicalAvailableFor(storage, zone, stockpile, excludeJobId) {
  const { used, stacks } = zoneAllocationUsage(storage, zone, excludeJobId);
  return zone.cells.reduce(
    (total, cell) => total + cellAvailableFor(cell, stockpile, used, stacks),
    0,
  );
}

function protectionScore(protection, deterioration) {
  if (deterioration <= 0) return 0;
  return { dry: 3, covered: 2, fixture: 2, outdoor: 0 }[protection] ?? 1;
}

function destinationCandidates(storage, zone, stockpile, source, excludeJobId) {
  const { used, stacks } = zoneAllocationUsage(storage, zone, excludeJobId),
    profile = storageItemProfile(stockpile.itemKind);
  return zone.cells
    .map((cell) => ({
      zoneId: zone.id,
      cellId: cell.id,
      position: { x: cell.x, y: cell.y },
      priority: zone.priority,
      tier: zone.tier,
      protection: zone.protection,
      remainingCapacity: cellAvailableFor(cell, stockpile, used, stacks),
      protectionScore: protectionScore(
        zone.protection,
        profile.deteriorationPerDay,
      ),
      travelCost: Math.abs(cell.x - source.x) + Math.abs(cell.y - source.y),
    }))
    .filter((candidate) => candidate.remainingCapacity > 0);
}

function destinationStockpiles(state, requested, excludedStockpileId) {
  if (!requested) return [];
  return state.village.stockpiles.filter(
    (item) =>
      item.itemKind === requested.itemKind && item.id !== excludedStockpileId,
  );
}

function logicalDestinationSpace(state, stockpile, excludeJobId) {
  const reserved = incomingReservations(state)
    .filter(
      (item) =>
        item.stockpileId === stockpile.id && item.jobId !== excludeJobId,
    )
    .reduce((total, item) => total + item.quantity, 0);
  return Math.max(0, stockpile.capacity - stockpile.quantity - reserved);
}

function stockpileDestinations(
  state,
  storage,
  stockpile,
  source,
  excludeJobId,
) {
  const zone = storage.zones.find(
      (item) => item.containerId === stockpile.containerId,
    ),
    logical = logicalDestinationSpace(state, stockpile, excludeJobId);
  if (!zoneAcceptsStockpile(zone, stockpile) || logical <= 0) return [];
  return destinationCandidates(
    storage,
    zone,
    stockpile,
    source,
    excludeJobId,
  ).map((candidate) => ({
    ...candidate,
    stockpileId: stockpile.id,
    remainingCapacity: Math.min(candidate.remainingCapacity, logical),
  }));
}

function compareDestinations(left, right) {
  return (
    right.priority - left.priority ||
    right.remainingCapacity - left.remainingCapacity ||
    right.protectionScore - left.protectionScore ||
    left.travelCost - right.travelCost ||
    left.cellId.localeCompare(right.cellId)
  );
}

export function storageDestinationFor(
  state,
  stockpileId,
  source,
  excludeJobId = null,
  excludeStockpileId = null,
) {
  const storage = state.village.storage ?? reconcileVillageStorage(state),
    requested = state.village.stockpiles.find(
      (item) => item.id === stockpileId,
    ),
    targets = destinationStockpiles(state, requested, excludeStockpileId),
    candidates = targets.flatMap((stockpile) =>
      stockpileDestinations(state, storage, stockpile, source, excludeJobId),
    );
  return candidates.sort(compareDestinations)[0] ?? null;
}

export function storageDestinationAt(
  state,
  stockpileId,
  cellId,
  source,
  excludeJobId = null,
  excludeStockpileId = null,
) {
  const storage = state.village.storage ?? reconcileVillageStorage(state),
    requested = state.village.stockpiles.find(
      (item) => item.id === stockpileId,
    ),
    targets = destinationStockpiles(state, requested, excludeStockpileId),
    candidates = targets.flatMap((stockpile) =>
      stockpileDestinations(state, storage, stockpile, source, excludeJobId),
    );
  return candidates.find((candidate) => candidate.cellId === cellId) ?? null;
}

export function stockpileStorageProtection(state, stockpileId) {
  const storage = state.village.storage ?? reconcileVillageStorage(state),
    loose = storage.loosePiles?.some(
      (pile) => pile.stockpileId === stockpileId && pile.quantity > 0,
    ),
    stockpile = state.village.stockpiles.find(
      (item) => item.id === stockpileId,
    ),
    zone = storage.zones.find(
      (item) => item.containerId === stockpile?.containerId,
    );
  if (loose) return "loose_pile";
  return zone?.protection ?? "outdoor";
}

export function storageAvailableFor(state, stockpileId, excludeJobId = null) {
  let storage = state.village.storage ?? reconcileVillageStorage(state);
  const stockpile = state.village.stockpiles.find(
    (item) => item.id === stockpileId,
  );
  let zone = storage.zones.find(
    (item) => item.containerId === stockpile?.containerId,
  );
  if (!zoneAcceptsStockpile(zone, stockpile)) return 0;
  const containerStock = state.village.stockpiles.filter(
      (item) => item.containerId === stockpile.containerId,
    ),
    planned = storageVolume(containerStock, "capacity");
  if (zone.cells.reduce((total, cell) => total + cell.allowance, 0) < planned) {
    storage = reconcileVillageStorage(state);
    zone = storage.zones.find(
      (item) => item.containerId === stockpile.containerId,
    );
  }
  const reservations = incomingReservations(state).filter(
      (item) => item.jobId !== excludeJobId,
    ),
    reserved = reservations
      .filter((item) => item.stockpileId === stockpile.id)
      .reduce((total, item) => total + item.quantity, 0),
    logical = Math.max(0, stockpile.capacity - stockpile.quantity - reserved),
    physical = physicalAvailableFor(storage, zone, stockpile, excludeJobId);
  return Math.max(0, Math.min(logical, physical));
}

function allocationVolume(allocations, kind) {
  return allocations
    .filter((item) => item.kind === kind)
    .reduce(
      (total, item) =>
        total + item.quantity * storageItemProfile(item.itemKind).volume,
      0,
    );
}

function allocationStackCount(allocations) {
  const quantities = new Map();
  for (const item of allocations)
    quantities.set(
      item.itemKind,
      (quantities.get(item.itemKind) ?? 0) + item.quantity,
    );
  return [...quantities.entries()].reduce(
    (total, [kind, quantity]) =>
      total + Math.ceil(quantity / storageItemProfile(kind).stackSize),
    0,
  );
}

// function-length-exempt: template -- storage-cell projection
export function storageCellAt(state, x, y) {
  const storage = state.village.storage ?? reconcileVillageStorage(state),
    zone = storage.zones.find((item) =>
      item.cells.some((cell) => cell.x === x && cell.y === y),
    ),
    cell = zone?.cells.find((item) => item.x === x && item.y === y),
    loosePile = storage.loosePiles?.find(
      (item) => item.x === x && item.y === y,
    );
  if (!zone || !cell) return loosePileStorageCell(storage, loosePile);
  const allocations = storage.allocations.filter(
    (item) => item.cellId === cell.id,
  );
  const overflow =
    !storage.loosePiles?.length && zone.anchor.x === x && zone.anchor.y === y
      ? storage.overflow.filter((entry) => {
          const stockpile = state.village.stockpiles.find(
            (item) => item.id === entry.stockpileId,
          );
          return stockpile?.containerId === zone.containerId;
        })
      : [];
  return {
    zoneId: zone.id,
    cellId: cell.id,
    priority: zone.priority,
    tier: zone.tier,
    protection: zone.protection,
    allowance: cell.allowance,
    stackSlots: cell.stackSlots ?? 1,
    stacksUsed: allocationStackCount(allocations),
    used: allocationVolume(allocations, "stored"),
    reserved: allocationVolume(allocations, "reserved"),
    allocations,
    overflow,
  };
}

function loosePileStorageCell(storage, pile) {
  if (!pile) return null;
  const zone = storage.zones.find((item) => item.id === pile.zoneId);
  return {
    zoneId: zone?.id,
    cellId: pile.id,
    priority: zone?.priority ?? 0,
    tier: "loose_pile",
    protection: "outdoor",
    allowance: 0,
    stackSlots: 1,
    stacksUsed: 1,
    used: 0,
    reserved: 0,
    allocations: [],
    overflow: [pile],
    loosePile: true,
  };
}

function overloadedStorageCells(storage) {
  return storage.zones.flatMap((zone) =>
    zone.cells.filter((cell) => {
      const used = storage.allocations
        .filter((item) => item.cellId === cell.id)
        .reduce(
          (total, item) =>
            total + item.quantity * storageItemProfile(item.itemKind).volume,
          0,
        );
      return used > cell.allowance;
    }),
  );
}

function disallowedStorageAllocations(state, storage) {
  return storage.allocations.filter((allocation) => {
    const stockpile = state.village.stockpiles.find(
        (item) => item.id === allocation.stockpileId,
      ),
      zone = storage.zones.find((item) =>
        item.cells.some((cell) => cell.id === allocation.cellId),
      );
    return !zone?.allowedItemKinds.includes(stockpile?.itemKind);
  });
}

export function villageStorageAudit(state) {
  const storage = reconcileVillageStorage(state),
    blocked = storageBlockedPositions(state),
    structuralConflicts = storage.zones.flatMap((zone) =>
      zone.cells.filter(
        (cell) =>
          blocked.has(positionKey(cell)) &&
          !zoneOwnsStructureCell(state, zone, cell) &&
          (zone.tier !== "container" || hasForeignStructure(state, cell)),
      ),
    ),
    overloadedCells = overloadedStorageCells(storage),
    disallowed = disallowedStorageAllocations(state, storage);
  return {
    passed:
      structuralConflicts.length === 0 &&
      overloadedCells.length === 0 &&
      disallowed.length === 0,
    structuralConflictCellIds: structuralConflicts.map((cell) => cell.id),
    overloadedCellIds: overloadedCells.map((cell) => cell.id),
    disallowedAllocations: disallowed,
    overflow: structuredClone(storage.overflow),
  };
}

function zoneOwnsStructureCell(state, zone, cell) {
  if (!zone.structureKey) return false;
  const building = state.village.buildings?.find(
    (candidate) => candidate.key === zone.structureKey,
  );
  return Boolean(
    building?.storageArea && positionInside(building.storageArea, cell),
  );
}
