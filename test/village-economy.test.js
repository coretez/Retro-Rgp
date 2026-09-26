import test from "node:test";
import assert from "node:assert/strict";
import {
  applyRogueTurn,
  newRogueRun,
  parseRogueState,
  rogueRunView,
  serializeRogueState,
} from "../src/rogue-engine.js";
import { createJob, reserveAll } from "../src/job-board.js";

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

function completeSmithyChain(state) {
  suppressUnrelatedProduction(state);
  stock(state, "stable_smithy_supplies").quantity = 1;
  actor(state, "carter").position = { x: 38, y: 24 };
  actor(state, "smith").position = { x: 10, y: 3 };
  for (let turn = 0; turn < 4; turn += 1) advance(state);
  actor(state, "carter").position = { x: 8, y: 10 };
  advance(state);
  actor(state, "carter").position = { x: 10, y: 3 };
  for (let turn = 0; turn < 8; turn += 1) advance(state);
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
  actor(state, "fisher").position = { x: -1, y: 15 };
  actor(state, "hostler").position = { x: 38, y: 22 };
  actor(state, "child").position = { x: 7, y: 11 };
  for (let turn = 0; turn < 6; turn += 1) advance(state);
  for (const key of [
    "apothecary_remedies",
    "armorer_shields",
    "river_catch",
    "stable_care",
    "message_log",
  ])
    assert.ok(stock(state, key).quantity > 0, key);
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
  assert.equal(restored.schemaVersion, 16);
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
