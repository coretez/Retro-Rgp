import test from "node:test";
import assert from "node:assert/strict";
import {
  newRogueRun,
  parseRogueState,
  rogueUnityView,
  serializeRogueState,
} from "../src/rogue-engine.js";
import { createJob } from "../src/job-board.js";
import {
  reconcileVillageStorage,
  storageAvailableFor,
  storageDestinationAt,
  storageDestinationFor,
  storageItemProfile,
  villageStorageAudit,
} from "../src/village-storage.js";

const input = {
  requestId: "storage-test",
  runId: "377a9a7c-19d0-59eb-8724-2116a485cf57",
  seed: "storage-test",
  heroName: "Mara",
  heroClass: "fighter",
  form: "hybrid",
  size: "small",
  levels: 3,
  scenario: "founding",
};

function state() {
  return newRogueRun(input);
}

test("R4 storage shares a hard allowance across every item on one cell", () => {
  const run = state(),
    storage = reconcileVillageStorage(run);
  assert.equal(villageStorageAudit(run).passed, true);
  for (const zone of storage.zones)
    for (const cell of zone.cells) {
      const used = storage.allocations
        .filter((entry) => entry.cellId === cell.id)
        .reduce(
          (total, entry) =>
            total + entry.quantity * storageItemProfile(entry.itemKind).volume,
          0,
        );
      assert.ok(used <= cell.allowance);
    }
});

test("R4 storage filters reject disallowed goods into visible overflow", () => {
  const run = state(),
    meals = run.village.stockpiles.find((item) => item.key === "inn_meals"),
    storage = reconcileVillageStorage(run),
    zone = storage.zones.find((item) => item.containerId === meals.containerId);
  zone.allowedItemKinds = [];
  const updated = reconcileVillageStorage(run),
    overflow = updated.overflow.find((item) => item.stockpileId === meals.id),
    loosePile = updated.loosePiles.find(
      (item) => item.stockpileId === meals.id,
    );
  assert.equal(overflow.quantity, meals.quantity);
  assert.equal(overflow.reason, "item_disallowed");
  assert.ok(loosePile);
  assert.ok(
    !zone.cells.some(
      (cell) => cell.x === loosePile.x && cell.y === loosePile.y,
    ),
  );
  const projected = rogueUnityView(run).map.cells.find(
    (cell) => cell.x === loosePile.x && cell.y === loosePile.y,
  );
  assert.equal(projected.storageLoosePile, true);
  assert.equal(projected.storageAllowance, 0);
  assert.equal(projected.storageOverflow, meals.quantity);
});

test("R8.1 schema migration admits goods added after a zone was created", () => {
  const run = state(),
    water = run.village.stockpiles.find((item) => item.key === "stable_water"),
    storage = reconcileVillageStorage(run),
    zone = storage.zones.find((item) => item.containerId === water.containerId);
  storage.version = 3;
  zone.allowedItemKinds = zone.allowedItemKinds.filter(
    (kind) => kind !== water.itemKind,
  );

  const migrated = reconcileVillageStorage(run),
    repaired = migrated.zones.find(
      (item) => item.containerId === water.containerId,
    );

  assert.ok(repaired.allowedItemKinds.includes(water.itemKind));
  assert.equal(
    migrated.overflow.some((entry) => entry.stockpileId === water.id),
    false,
  );
});

test("R4 open production reserves physical output space", () => {
  const run = state(),
    grain = run.village.stockpiles.find((item) => item.key === "farm_grain"),
    before = storageAvailableFor(run, grain.id);
  createJob(run, {
    jobType: "storage_reservation_test",
    name: "Reserve grain storage",
    priority: 1,
    targetId: grain.id,
    targetPosition: { ...grain.position },
    requiredCapabilities: [],
    progressTotal: 1,
    production: {
      inputs: [],
      output: { stockpileId: grain.id, quantity: 2 },
      inputConsumed: false,
      outputCreated: false,
    },
  });
  assert.equal(storageAvailableFor(run, grain.id), before - 2);
});

test("R4 Unity exposes every physical storage cell and its allowance", () => {
  const run = state(),
    storage = reconcileVillageStorage(run),
    projected = rogueUnityView(run).map.cells.filter(
      (cell) => cell.storageCell,
    ),
    designated = projected.filter((cell) => !cell.storageLoosePile);
  assert.ok(projected.length > 0);
  assert.ok(designated.every((cell) => cell.storageAllowance > 0));
  assert.ok(
    projected
      .filter((cell) => cell.storageLoosePile)
      .every((cell) => cell.storageAllowance === 0 && cell.storageOverflow > 0),
  );
  assert.ok(projected.every((cell) => (cell.storageTier ?? "ground").length));
  assert.ok(
    projected.every(
      (cell) =>
        (
          cell.storageProtection ??
          (cell.storageTier === "container" ? "fixture" : "outdoor")
        ).length,
    ),
  );
  assert.ok(projected.every((cell) => (cell.storageStackSlots ?? 1) > 0));
  assert.ok(
    projected.every(
      (cell) =>
        (cell.storageUsed ?? 0) + (cell.storageReserved ?? 0) <=
        cell.storageAllowance,
    ),
  );
  assert.ok(
    designated.length <= storage.zones.flatMap((zone) => zone.cells).length,
  );
});

test("R8 storage cells relocate away from completed structural footprints", () => {
  const run = state(),
    before = reconcileVillageStorage(run),
    occupied = { ...before.zones[0].cells[0] };
  run.village.constructionPrimitives.push({
    id: "f100f87a-e8c9-51d9-a88f-325a0e05e2db",
    kind: "wall",
    material: "timber",
    position: { x: occupied.x, y: occupied.y },
    width: 1,
    height: 1,
    condition: 100,
  });
  const repaired = reconcileVillageStorage(run),
    positions = repaired.zones.flatMap((zone) =>
      zone.cells.map((cell) => `${cell.x},${cell.y}`),
    );
  assert.ok(!positions.includes(`${occupied.x},${occupied.y}`));
  assert.deepEqual(villageStorageAudit(run).structuralConflictCellIds, []);
});

test("R8 founding stores occupy named bounded districts", () => {
  const run = state(),
    storage = reconcileVillageStorage(run),
    logs = run.village.stockpiles.find(
      (stockpile) => stockpile.key === "lumber_camp_logs",
    ),
    bulk = storage.zones.find((zone) => zone.containerId === logs.containerId);
  assert.equal(bulk.planKey, "bulk-yard");
  assert.equal(bulk.designation, "outdoor bulk yard");
  assert.equal(bulk.tier, "ground");
  assert.ok(
    bulk.cells.every(
      (cell) => cell.x >= -56 && cell.x < -34 && cell.y >= 1 && cell.y < 9,
    ),
  );
});

test("R8.1 ground, covered floor, racks, and bins keep distinct policies", () => {
  const run = state(),
    storage = reconcileVillageStorage(run),
    byPlan = (key) => storage.zones.find((zone) => zone.planKey === key);
  assert.deepEqual(
    ["bulk-yard", "camp-store", "finished-lumber-yard", "quarry-yard"].map(
      (key) => [byPlan(key).tier, byPlan(key).cells[0].stackSlots],
    ),
    [
      ["ground", 1],
      ["covered_floor", 1],
      ["rack", 4],
      ["bin", 1],
    ],
  );
  assert.ok(
    byPlan("finished-lumber-yard").cells[0].allowance >
      byPlan("bulk-yard").cells[0].allowance,
  );
});

test("R8.1 ground separates item stacks while a rack can share one cell", () => {
  const run = state(),
    storage = reconcileVillageStorage(run),
    logs = run.village.stockpiles.find(
      (item) => item.key === "lumber_camp_logs",
    ),
    lumber = run.village.stockpiles.find(
      (item) => item.key === "lumber_yard_lumber",
    ),
    addKind = (source, id, key) =>
      run.village.stockpiles.push({
        ...source,
        id,
        key,
        itemKind: "stone",
        name: "Test stone",
        quantity: 1,
        capacity: 2,
      });
  logs.quantity = 1;
  lumber.quantity = 1;
  storage.zones
    .find((zone) => zone.containerId === logs.containerId)
    .allowedItemKinds.push("stone");
  storage.zones
    .find((zone) => zone.containerId === lumber.containerId)
    .allowedItemKinds.push("stone");
  addKind(logs, "5ec03ae4-c8c1-55bf-987b-67d300f4d5e1", "ground_test_stone");
  addKind(lumber, "77e88979-7afd-5ce8-96fa-453b9314fa7a", "rack_test_stone");
  const updated = reconcileVillageStorage(run),
    cellsFor = (containerId) =>
      updated.allocations
        .filter((entry) =>
          run.village.stockpiles.some(
            (item) =>
              item.id === entry.stockpileId && item.containerId === containerId,
          ),
        )
        .map((entry) => entry.cellId);
  assert.equal(new Set(cellsFor(logs.containerId)).size, 2);
  assert.equal(new Set(cellsFor(lumber.containerId)).size, 1);
});

test("R8.1 item profiles expose volume, stack size, decay, and compatibility", () => {
  const run = state(),
    storage = reconcileVillageStorage(run),
    logs = run.village.stockpiles.find(
      (item) => item.key === "lumber_camp_logs",
    ),
    zone = storage.zones.find((item) => item.containerId === logs.containerId),
    profile = storageItemProfile(logs.itemKind);
  assert.deepEqual(Object.keys(profile).sort(), [
    "compatibleTiers",
    "deteriorationPerDay",
    "stackSize",
    "volume",
  ]);
  assert.ok(profile.compatibleTiers.includes("ground"));
  zone.allowedItemKinds.push("iron_ore");
  run.village.stockpiles.push({
    ...logs,
    id: "f3e08965-67cf-51c2-b53a-8e44b28108e9",
    key: "ground_test_ore",
    itemKind: "iron_ore",
    quantity: 1,
  });
  const overflow = reconcileVillageStorage(run).overflow.find(
    (entry) => entry.stockpileId === "f3e08965-67cf-51c2-b53a-8e44b28108e9",
  );
  assert.equal(overflow.reason, "tier_incompatible");
});

test("R8.1 physical capacity is bounded by item volume and stack size", () => {
  const run = state(),
    stone = run.village.stockpiles.find((item) => item.key === "quarry_stone");
  stone.quantity = 12;
  const storage = reconcileVillageStorage(run),
    zone = storage.zones.find((item) => item.containerId === stone.containerId),
    first = storage.allocations.find(
      (entry) =>
        entry.stockpileId === stone.id && entry.cellId === zone.cells[0].id,
    ),
    profile = storageItemProfile(stone.itemKind);
  assert.equal(profile.volume, 2);
  assert.equal(profile.stackSize, 12);
  assert.equal(first.quantity, 5);
  assert.equal(first.quantity * profile.volume, zone.cells[0].allowance);
});

test("R8.1 hauling chooses space before travel and travel breaks ties", () => {
  const run = state(),
    grain = run.village.stockpiles.find((item) => item.key === "farm_grain");
  grain.quantity = 19;
  let storage = reconcileVillageStorage(run),
    zone = storage.zones.find((item) => item.containerId === grain.containerId),
    first = zone.cells[0],
    destination = storageDestinationFor(run, grain.id, first);
  assert.notEqual(destination.cellId, first.id);
  assert.equal(destination.remainingCapacity, 5);
  grain.quantity = 0;
  storage = reconcileVillageStorage(run);
  zone = storage.zones.find((item) => item.containerId === grain.containerId);
  const last = zone.cells.at(-1);
  destination = storageDestinationFor(run, grain.id, last);
  assert.equal(destination.cellId, last.id);
  assert.equal(destination.travelCost, 0);
});

test("R8.2 a player-selected compatible storage cell is exact", () => {
  const run = state(),
    grain = run.village.stockpiles.find((item) => item.key === "farm_grain"),
    storage = reconcileVillageStorage(run),
    zone = storage.zones.find((item) => item.containerId === grain.containerId),
    chosen = zone.cells.at(-1),
    destination = storageDestinationAt(run, grain.id, chosen.id, grain.position);
  assert.equal(destination.cellId, chosen.id);
  assert.equal(destination.stockpileId, grain.id);
  assert.deepEqual(destination.position, { x: chosen.x, y: chosen.y });
});

test("R8.2 a player cannot route grain into an incompatible storage cell", () => {
  const run = state(),
    grain = run.village.stockpiles.find((item) => item.key === "farm_grain"),
    logs = run.village.stockpiles.find(
      (item) => item.key === "lumber_camp_logs",
    ),
    storage = reconcileVillageStorage(run),
    logZone = storage.zones.find((item) => item.containerId === logs.containerId),
    destination = storageDestinationAt(
      run,
      grain.id,
      logZone.cells[0].id,
      grain.position,
    );
  assert.equal(destination, null);
});

test("R8.1 hauling can choose a higher-priority compatible second zone", () => {
  const run = state(),
    grain = run.village.stockpiles.find((item) => item.key === "farm_grain"),
    alternate = {
      ...structuredClone(grain),
      id: "dbb7e5bb-7ea2-56dd-9ff4-c4d154d91c27",
      key: "alternate_grain_store",
      name: "Alternate grain store",
      quantity: 0,
      position: { x: 60, y: 60 },
      containerId: "4c440479-6c89-5cc5-80ad-6fe6c0643113",
    };
  run.village.stockpiles.push(alternate);
  const storage = reconcileVillageStorage(run),
    alternateZone = storage.zones.find(
      (zone) => zone.containerId === alternate.containerId,
    );
  alternateZone.priority = 90;

  const destination = storageDestinationFor(run, grain.id, grain.position);

  assert.equal(destination.stockpileId, alternate.id);
  assert.equal(destination.zoneId, alternateZone.id);
});

test("R8 designated storage never crosses a reserved building footprint", () => {
  const run = state();
  createJob(run, {
    jobType: "storage_site_test",
    name: "Reserve part of the bulk yard",
    priority: 1,
    targetId: run.village.stockpiles[0].id,
    targetPosition: { x: -56, y: 1 },
    requiredCapabilities: [],
    progressTotal: 1,
    plan: {
      constructionWork: {
        site: { position: { x: -56, y: 1 }, width: 5, height: 2 },
        elements: [],
      },
    },
  });
  const storage = reconcileVillageStorage(run),
    conflicts = storage.zones.flatMap((zone) =>
      zone.cells.filter(
        (cell) => cell.x >= -56 && cell.x < -51 && cell.y >= 1 && cell.y < 3,
      ),
    );
  assert.deepEqual(conflicts, []);
  assert.equal(villageStorageAudit(run).passed, true);
});

test("R8 storage cells never share completed fixture footprints", () => {
  const run = state(),
    storage = reconcileVillageStorage(run),
    fixtureCells = new Set(
      run.village.fixtures.flatMap((fixture) => {
        const cells = [];
        for (let y = fixture.y; y < fixture.y + fixture.height; y += 1)
          for (let x = fixture.x; x < fixture.x + fixture.width; x += 1)
            cells.push(`${x},${y}`);
        return cells;
      }),
    );
  assert.ok(
    storage.zones.every((zone) =>
      zone.cells.every((cell) => !fixtureCells.has(`${cell.x},${cell.y}`)),
    ),
  );
});

test("R4 storage policy and allocations survive save migration", () => {
  const run = state(),
    storage = reconcileVillageStorage(run);
  storage.zones[0].priority = 90;
  const restored = parseRogueState(serializeRogueState(run));
  assert.equal(restored.village.storage.zones[0].priority, 90);
  assert.deepEqual(villageStorageAudit(restored).overloadedCellIds, []);
});
