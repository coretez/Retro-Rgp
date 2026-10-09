import test from "node:test";
import assert from "node:assert/strict";
import {
  applyRogueTurn,
  newRogueRun,
  parseRogueState,
  rogueRunView,
  serializeRogueState,
  villageWorldObjectAt,
} from "../src/rogue-engine.js";
import { createJob, reserveAll } from "../src/job-board.js";
import { specialistFacilityPlan } from "../src/village-architecture.js";
import { namedUuid } from "../src/identity.js";

const input = {
  requestId: "m7-village-economy",
  seed: "m7-village-economy",
  heroName: "Mara",
  form: "hybrid",
  size: "small",
};

function villageState() {
  const state = newRogueRun(input);
  state.location = "village";
  return state;
}

function stock(state, key) {
  return state.village.stockpiles.find((item) => item.key === key);
}

function actor(state, personKey) {
  return state.village.npcStates.find((npc) => npc.personKey === personKey);
}

function advance(state) {
  for (const job of state.village.jobs)
    if (
      job.progress?.unit?.endsWith("_minute") &&
      ["reserved", "active"].includes(job.status)
    )
      job.progress.completed = Math.max(
        job.progress.completed,
        job.progress.total - 0.6,
      );
  const axe = state.hero.inventory.find((item) => item.kind === "hand_axe");
  return applyRogueTurn(state, { kind: "equip", itemId: axe.id });
}

function suppressUnrelatedProduction(state) {
  for (const key of [
    "apothecary_remedies",
    "armorer_shields",
    "river_catch",
    "inn_fish",
    "inn_meals",
    "stable_care",
    "message_log",
  ]) {
    const item = stock(state, key);
    item.quantity = item.threshold;
  }
}

function installSpecialistFacility(state, projectKey) {
  const plan = specialistFacilityPlan(projectKey),
    buildingId = namedUuid(state.id, `test-building:${plan.key}`);
  state.village.facilities.push(plan.key);
  state.village.buildings.push({
    id: buildingId,
    key: plan.key,
    name: plan.name,
    status: "complete",
    door: { ...plan.door },
  });
  state.village.fixtures.push(
    ...plan.fixtures.map((fixture) => ({
      ...fixture,
      id: namedUuid(state.id, `test-fixture:${fixture.key}`),
      entityType: "fixture",
      name: fixture.role.replaceAll("_", " "),
      buildingId,
      status: "complete",
    })),
  );
  return plan;
}

function advanceWorkerJob(state, personKey, jobType, turns = 12) {
  const worker = actor(state, personKey);
  for (let turn = 0; turn < turns; turn += 1) {
    const job = state.village.jobs.find(
      (candidate) => candidate.jobType === jobType && candidate.status !== "completed",
    );
    if (job?.destination) worker.position = { ...job.destination };
    else if (job?.targetPosition) worker.position = { ...job.targetPosition };
    advance(state);
  }
}

function completeSmithyChain(state) {
  suppressUnrelatedProduction(state);
  stock(state, "stable_smithy_supplies").quantity = 1;
  actor(state, "carter").position = { x: 38, y: 24 };
  actor(state, "smith").position = { x: 10, y: 3 };
  for (let turn = 0; turn < 4; turn += 1) advance(state);
  actor(state, "carter").position = { x: 8, y: 10 };
  advance(state);
  actor(state, "carter").position = { x: 10, y: 3 };
  for (let turn = 0; turn < 4; turn += 1) advance(state);
}

test("M-7 declares bounded work for eight resident roles", () => {
  const state = villageState();
  advance(state);
  const expected = {
    smith: "craft_weapon",
    herbalist: "brew_remedy",
    armorer: "craft_armor",
    innkeeper: "prepare_meal",
    fisher: "catch_fish",
    porter: "haul_stock",
    hostler: "tend_stable",
    child: "deliver_message",
  };
  for (const [personKey, jobType] of Object.entries(expected)) {
    const resident = actor(state, personKey);
    assert.ok(resident.capabilityTags.length > 1, personKey);
    assert.ok(resident.workPermissions.allowedJobTypes.includes(jobType));
    assert.ok(resident.workPriorities[jobType] > 0);
  }
  assert.ok(
    state.village.jobs.find((job) => job.jobType === "brew_remedy").priority >
      state.village.jobs.find((job) => job.jobType === "deliver_message")
        .priority,
  );
});

test("M-7 residents create remedies, armor, fish, stable care, and notices", () => {
  const state = villageState();
  stock(state, "stable_smithy_supplies").quantity = 0;
  stock(state, "smithy_supplies").quantity = 2;
  actor(state, "herbalist").position = { x: 29, y: 6 };
  actor(state, "armorer").position = { x: 26, y: 19 };
  actor(state, "fisher").position = { x: -1, y: 16 };
  actor(state, "hostler").position = { x: 38, y: 22 };
  actor(state, "child").position = { x: 7, y: 11 };
  const targetApproaches = {
    brew_remedy: { x: 29, y: 6 },
    craft_armor: { x: 26, y: 19 },
    catch_fish: { x: -1, y: 16 },
    tend_stable: { x: 38, y: 22 },
    deliver_message: { x: 7, y: 11 },
  };
  for (let turn = 0; turn < 14; turn += 1) {
    for (const job of state.village.jobs) {
      const resident = state.village.npcStates.find(
        (candidate) => candidate.id === job.assignedActorId,
      );
      if (!resident || !["reserved", "active"].includes(job.status)) continue;
      if (job.plan?.step === "to_input" && job.destination)
        resident.position = { ...job.destination };
      else if (targetApproaches[job.jobType])
        resident.position = { ...targetApproaches[job.jobType] };
    }
    advance(state);
  }
  for (const key of [
    "apothecary_remedies",
    "armorer_shields",
    "river_catch",
    "stable_care",
    "message_log",
  ])
    assert.ok(
      stock(state, key).quantity > 0,
      JSON.stringify({
        key,
        job: state.village.jobs.find(
          (candidate) => candidate.production?.output?.stockpileId === stock(state, key).id,
        ),
        actor: key === "river_catch" ? actor(state, "fisher") : undefined,
      }),
    );
});

test("R4 fishing hut makes a reusable net that quadruples river harvest", () => {
  const state = villageState();
  installSpecialistFacility(state, "specialist_fishing_hut");
  suppressUnrelatedProduction(state);
  stock(state, "netting_fiber").quantity = 2;
  stock(state, "fishing_nets").quantity = 0;
  advanceWorkerJob(state, "fisher", "craft_fishing_net", 16);
  assert.equal(stock(state, "fishing_nets").quantity, 1);
  stock(state, "river_catch").quantity = 0;
  advanceWorkerJob(state, "fisher", "catch_fish", 20);
  assert.ok(stock(state, "river_catch").quantity >= 4);
  assert.equal(stock(state, "river_catch").quantity % 4, 0);
  assert.equal(stock(state, "fishing_nets").quantity, 1);
});

test("R4 the physical forge turns metal and lumber into a hunting bow", () => {
  const state = villageState();
  installSpecialistFacility(state, "specialist_forge");
  suppressUnrelatedProduction(state);
  stock(state, "smithy_supplies").quantity = 1;
  stock(state, "lumber_yard_lumber").quantity = 1;
  stock(state, "hunting_bows").quantity = 0;
  advanceWorkerJob(state, "smith", "craft_hunting_bow", 20);
  const job = state.village.jobs.find(
    (candidate) => candidate.jobType === "craft_hunting_bow",
  );
  assert.equal(job.status, "completed");
  assert.equal(stock(state, "hunting_bows").quantity, 1);
  assert.equal(stock(state, "smithy_supplies").quantity, 0);
  assert.equal(stock(state, "lumber_yard_lumber").quantity, 0);
});

test("M-7 delivery feeds production and opens a stocked staffed shop", () => {
  const state = villageState();
  completeSmithyChain(state);
  const delivery = state.village.jobs.find(
      (job) => job.jobType === "deliver_goods" && job.status === "completed",
    ),
    production = state.village.jobs.find(
      (job) => job.jobType === "craft_weapon" && job.status === "completed",
    );
  assert.ok(delivery);
  assert.ok(production);
  assert.equal(stock(state, "stable_smithy_supplies").quantity, 0);
  assert.equal(stock(state, "smithy_supplies").quantity, 0);
  assert.equal(stock(state, "smithy_weapons").quantity, 1);
  assert.equal(production.production.inputConsumed, true);
  assert.equal(production.production.outputCreated, true);
  state.village.heroPosition = { x: 2, y: 2 };
  const smithy = rogueRunView(state).village.shops.find(
    (shop) => shop.id === "smithy",
  );
  assert.equal(smithy.staffed, true);
  assert.equal(smithy.open, true);
  assert.equal(smithy.accessible, true);
  assert.equal(
    smithy.goods.find((good) => good.itemKind === "ash_spear").quantity,
    1,
  );
});

test("M-7 shops refuse unavailable stock and decrement a real sale", () => {
  const state = villageState();
  completeSmithyChain(state);
  state.village.heroPosition = { x: 2, y: 2 };
  state.hero.goldCp = 100;
  const beforeGold = state.hero.goldCp;
  applyRogueTurn(state, {
    kind: "shop_buy",
    actorId: state.hero.id,
    itemKind: "ash_spear",
  });
  assert.equal(stock(state, "smithy_weapons").quantity, 0);
  assert.ok(state.hero.goldCp < beforeGold);
  assert.throws(
    () =>
      applyRogueTurn(state, {
        kind: "shop_buy",
        actorId: state.hero.id,
        itemKind: "ash_spear",
      }),
    (error) => error.code === "SHOP_OUT_OF_STOCK",
  );
});

test("M-7 production claims its exclusive workstation and survives save-load", () => {
  const state = villageState();
  suppressUnrelatedProduction(state);
  stock(state, "smithy_supplies").quantity = 1;
  actor(state, "smith").position = { x: 10, y: 3 };
  advance(state);
  advance(state);
  const job = state.village.jobs.find(
      (entry) => entry.jobType === "craft_weapon",
    ),
    heldObjectClaims = state.village.reservations.filter(
      (claim) =>
        claim.jobId === job.id &&
        claim.kind === "object" &&
        claim.state === "held",
    );
  assert.equal(job.status, "active");
  assert.equal(heldObjectClaims.length, 1);
  const rival = createJob(state, {
    jobType: "test_competing_work",
    name: "Compete for forge",
    targetId: job.targetId,
    targetPosition: job.targetPosition,
  }).job;
  assert.deepEqual(
    reserveAll(state, rival, [{ kind: "object", targetId: job.targetId }]),
    { ok: false, reason: "resource_reserved" },
  );
  const checkpoint = serializeRogueState(state),
    restored = parseRogueState(checkpoint),
    replay = parseRogueState(checkpoint);
  assert.equal(restored.schemaVersion, 22);
  for (let turn = 0; turn < 3; turn += 1) {
    advance(restored);
    advance(replay);
  }
  const restoredJob = restored.village.jobs.find(
    (entry) => entry.id === job.id,
  );
  assert.equal(restoredJob.status, "completed");
  assert.equal(stock(restored, "smithy_supplies").quantity, 0);
  assert.equal(stock(restored, "smithy_weapons").quantity, 1);
  assert.deepEqual(
    restored.village.stockpiles.map(({ key, quantity }) => ({ key, quantity })),
    replay.village.stockpiles.map(({ key, quantity }) => ({ key, quantity })),
  );
  assert.deepEqual(
    restoredJob.progress,
    replay.village.jobs.find((entry) => entry.id === job.id).progress,
  );
});

test("M-7 a proprietor outside the building closes the shop", () => {
  const state = villageState();
  actor(state, "smith").position = { x: 20, y: 12 };
  state.village.heroPosition = { x: 2, y: 2 };
  const smithy = rogueRunView(state).village.shops.find(
    (shop) => shop.id === "smithy",
  );
  assert.equal(smithy.staffed, false);
  assert.equal(smithy.open, false);
  assert.equal(smithy.accessible, false);
  assert.ok(!rogueRunView(state).legalIntents.includes("shop_buy"));
});

test("M-7.1 stockpile container UUIDs resolve to their world objects", () => {
  const state = villageState();
  for (const stockpile of state.village.stockpiles) {
    const container = villageWorldObjectAt(
      state,
      stockpile.position.x,
      stockpile.position.y,
    );
    assert.equal(stockpile.containerId, container.id, stockpile.key);
  }
});

test("M-7.1 higher-priority work wins real contention for one actor", () => {
  const state = villageState(),
    carter = actor(state, "carter"),
    cart = villageWorldObjectAt(state, 38, 23),
    forge = villageWorldObjectAt(state, 11, 3);
  suppressUnrelatedProduction(state);
  stock(state, "stable_smithy_supplies").quantity = 0;
  for (const resident of state.village.npcStates)
    if (resident.id !== carter.id)
      resident.workPermissions.allowedJobTypes = [];
  const low = createJob(state, {
      jobType: "inspect_object",
      name: "Low-priority forge inspection",
      priority: 10,
      targetId: forge.id,
      targetPosition: forge.position,
      requiredCapabilities: ["inspect"],
    }).job,
    high = createJob(state, {
      jobType: "inspect_object",
      name: "Urgent cart inspection",
      priority: 90,
      targetId: cart.id,
      targetPosition: cart.position,
      requiredCapabilities: ["inspect"],
    }).job;
  advance(state);
  assert.equal(high.assignedActorId, carter.id);
  assert.equal(high.status, "reserved");
  assert.equal(low.assignedActorId, null);
  assert.equal(low.status, "available");
});

test("M-7.1 the herbalist performs actual healing with real remedy stock", () => {
  const state = villageState(),
    herbalist = actor(state, "herbalist"),
    remedies = stock(state, "apothecary_remedies");
  state.village.adventurersPresent = true;
  suppressUnrelatedProduction(state);
  state.hero.hp = state.hero.maxHp - 7;
  herbalist.position = { x: 20, y: 12 };
  remedies.quantity = 1;
  const before = state.hero.hp;
  for (let turn = 0; turn < 4; turn += 1) advance(state);
  const healing = state.village.jobs.find(
    (job) => job.jobType === "tend_wounded",
  );
  assert.equal(healing.status, "completed");
  assert.equal(state.hero.hp, before + 6);
  assert.equal(remedies.quantity, 0);
});

test("M-7.1 consumables are delivered to the selected party member", () => {
  const state = villageState(),
    companion = state.companions[0],
    remedies = stock(state, "apothecary_remedies"),
    heroQuantity = state.hero.inventory.find(
      (item) => item.kind === "healing_potion",
    )?.quantity;
  state.village.heroPosition = { x: 27, y: 3 };
  state.hero.goldCp = 100;
  remedies.quantity = 1;
  applyRogueTurn(state, {
    kind: "shop_buy",
    actorId: companion.id,
    itemKind: "healing_potion",
  });
  assert.equal(
    companion.inventory.find((item) => item.kind === "healing_potion").quantity,
    1,
  );
  assert.equal(
    state.hero.inventory.find((item) => item.kind === "healing_potion")
      ?.quantity,
    heroQuantity,
  );
});

test("M-7.1 resident inspection exposes permissions, skills, and priorities", () => {
  const state = villageState(),
    herbalist = actor(state, "herbalist"),
    inspected = villageWorldObjectAt(
      state,
      herbalist.position.x,
      herbalist.position.y,
    );
  assert.match(inspected.description, /Permitted work:/);
  assert.match(inspected.description, /Capabilities:/);
  assert.match(inspected.description, /Work priorities:/);
  assert.match(inspected.description, /tend wounded/);
});

test("M-7.1 hauling describes its actual cargo and destination", () => {
  const state = villageState(),
    porter = actor(state, "porter"),
    riverCatch = stock(state, "river_catch");
  suppressUnrelatedProduction(state);
  riverCatch.quantity = 1;
  stock(state, "inn_fish").quantity = 0;
  porter.position = { x: riverCatch.position.x - 1, y: riverCatch.position.y };
  for (let turn = 0; turn < 8; turn += 1) advance(state);
  assert.match(porter.currentAction, /fresh river fish/i);
  assert.match(porter.currentAction, /inn fish pantry/i);
  assert.doesNotMatch(porter.currentAction, /smithy|forge/i);
  const hauling = state.village.jobs.find(
    (job) =>
      job.jobType === "haul_stock" &&
      job.assignedActorId === porter.id &&
      ["reserved", "active"].includes(job.status),
  );
  assert.equal(
    hauling.plan.storageDestination.stockpileId,
    stock(state, "inn_fish").id,
  );
  assert.ok(hauling.plan.storageDestination.remainingCapacity > 0);
});

test("M-7.1 save migration repairs derived container references", () => {
  const saved = serializeRogueState(villageState()),
    pantry = saved.village.stockpiles.find((item) => item.key === "inn_fish");
  pantry.containerId = "00000000-0000-4000-8000-000000000000";
  const restored = parseRogueState(saved),
    repaired = stock(restored, "inn_fish"),
    object = villageWorldObjectAt(
      restored,
      repaired.position.x,
      repaired.position.y,
    );
  assert.equal(repaired.containerId, object.id);
});
