import test from "node:test";
import assert from "node:assert/strict";
import {
  applyRogueTurn,
  newRogueRun,
  parseRogueState,
  rogueUnityView,
  serializeRogueState,
} from "../src/rogue-engine.js";
import { ensureVillageFoodSystem, produceFood } from "../src/village-food.js";
import {
  advanceVillageTrade,
  evaluateMerchantCadences,
  MERCHANT_TICKS_PER_DAY,
  recommendedMerchantIntervalDays,
} from "../src/village-trade.js";
import {
  createFarmsteadPasture,
  livingAnimals,
} from "../src/village-animals.js";

const input = {
  requestId: "r4-traveling-merchant",
  runId: "ed53d7e0-4157-58ad-a17c-df37bdcfb324",
  seed: "r4-traveling-merchant",
  heroName: "Mara",
  heroClass: "fighter",
  form: "hybrid",
  size: "small",
  levels: 3,
  scenario: "founding",
};

const stock = (state, key) =>
  state.village.stockpiles.find((candidate) => candidate.key === key);

test("R4 scarcity testing selects an eighteen-day merchant cadence", () => {
  const results = evaluateMerchantCadences(),
    byDays = Object.fromEntries(
      results.map((result) => [result.intervalDays, result]),
    );
  assert.equal(recommendedMerchantIntervalDays(), 18);
  assert.equal(byDays[18].annualStockoutDays, 0);
  assert.ok(byDays[14].visitsPerYear > byDays[18].visitsPerYear);
  assert.ok(byDays[21].annualStockoutDays > 0);
  assert.ok(byDays[90].score > byDays[21].score);
});

test("R4 a merchant conserves stock, coin, imports, and flour exports", () => {
  const state = newRogueRun(input),
    trade = state.village.trade,
    flour = stock(state, "mill_flour");
  produceFood(state, flour.id, 10, {
    originType: "milling_test",
    originId: "test-mill",
  });
  flour.quantity = 10;
  const villageCoinBefore = trade.treasuryCp;
  state.tick = trade.nextArrivalAtTick;
  const events = [];
  advanceVillageTrade(state, events);

  const visit = trade.activeVisit,
    bought = trade.transactions.filter(
      (entry) => entry.direction === "village_bought",
    ),
    sold = trade.transactions.find(
      (entry) => entry.direction === "village_sold",
    ),
    purchasedCp = bought.reduce((total, entry) => total + entry.totalCp, 0);
  assert.ok(visit);
  assert.equal(flour.quantity, 6);
  assert.equal(sold.quantity, 4);
  assert.equal(stock(state, "farm_seed").quantity, 8);
  for (const key of [
    "forge_iron",
    "forge_steel",
    "forge_copper",
    "forge_tin",
    "forge_brass",
  ])
    assert.ok(stock(state, key).quantity > 0, key);
  assert.equal(
    trade.treasuryCp,
    villageCoinBefore + sold.totalCp - purchasedCp,
  );
  assert.equal(visit.coinCp, 500 - sold.totalCp + purchasedCp);
  assert.ok(events.some((event) => event.type === "merchant_arrived"));
});

test("R8.3 a merchant buys renewable village wool above its reserve", () => {
  const state = newRogueRun(input),
    trade = state.village.trade,
    wool = stock(state, "sheep_wool");
  wool.quantity = 6;
  state.tick = trade.nextArrivalAtTick;
  advanceVillageTrade(state, []);
  const sale = trade.transactions.find(
    (entry) => entry.direction === "village_sold" && entry.itemKind === "wool",
  );
  assert.ok(sale);
  assert.equal(sale.quantity, 4);
  assert.equal(wool.quantity, 2);
  assert.equal(sale.totalCp, 40);
});

test("R8.3 a merchant can restore an extinct cattle pair on credit", () => {
  const state = newRogueRun(input),
    originalIds = new Set(livingAnimals(state, "cow").map(({ id }) => id));
  for (const animal of livingAnimals(state, "cow")) animal.status = "dead";
  state.village.pastures.push(createFarmsteadPasture(state.id));
  state.tick = state.village.trade.nextArrivalAtTick;
  const events = [];
  advanceVillageTrade(state, events);
  const replacements = livingAnimals(state, "cow");
  assert.equal(replacements.length, 2);
  assert.ok(replacements.every((animal) => !originalIds.has(animal.id)));
  assert.ok(replacements.every((animal) => animal.homePastureId));
  assert.deepEqual(
    new Set(replacements.map(({ sex }) => sex)),
    new Set(["female", "male"]),
  );
  assert.equal(state.village.trade.livestockCreditCp, 160);
  assert.ok(events.some(({ type }) => type === "merchant_livestock_arrived"));
  advanceVillageTrade(state, []);
  assert.equal(livingAnimals(state, "cow").length, 2);
});

test("R8.3 a missed livestock order is reconciled from the latest visit", () => {
  const state = newRogueRun(input);
  for (const animal of livingAnimals(state, "cow")) {
    animal.status = "dead";
    animal.deathDay = 2;
  }
  state.village.pastures.push(createFarmsteadPasture(state.id));
  state.tick = state.village.trade.nextArrivalAtTick;
  advanceVillageTrade(state, []);
  state.tick = state.village.trade.activeVisit.departsAtTick;
  advanceVillageTrade(state, []);
  state.village.animals = state.village.animals.filter(
    (animal) => animal.species !== "cow" || animal.status === "dead",
  );
  state.village.trade.livestockRecoveryVisitIds = [];
  advanceVillageTrade(state, []);
  assert.equal(livingAnimals(state, "cow").length, 2);
  assert.equal(
    state.village.trade.transactions.at(-1).visitId,
    state.village.trade.visits.at(-1).id,
  );
});

test("R4 merchant arrival, visibility, departure, and recurrence survive saves", () => {
  const state = newRogueRun(input),
    trade = state.village.trade;
  state.location = "village";
  state.tick = trade.nextArrivalAtTick;
  advanceVillageTrade(state, []);
  const visitId = trade.activeVisit.id,
    merchantId = trade.activeVisit.merchant.id,
    view = rogueUnityView(state);
  assert.equal(view.villageTrade.activeVisit.merchant.id, merchantId);
  assert.ok(
    view.map.cells.some(
      (cell) =>
        cell.x === 34 && cell.y === 12 && cell.entityName === "Ysabet Vale",
    ),
  );

  const restored = parseRogueState(serializeRogueState(state));
  assert.equal(restored.village.trade.activeVisit.id, visitId);
  restored.tick = restored.village.trade.activeVisit.departsAtTick;
  advanceVillageTrade(restored, []);
  assert.equal(restored.village.trade.activeVisit, null);
  assert.equal(restored.village.trade.visits.at(-1).id, visitId);
  assert.equal(
    restored.village.trade.nextArrivalAtTick,
    restored.tick + 18 * MERCHANT_TICKS_PER_DAY,
  );
});

test("R4 a completed mill converts conserved grain into traceable flour", () => {
  const state = newRogueRun(input),
    grain = stock(state, "farm_grain"),
    flour = stock(state, "mill_flour"),
    farmer = state.village.npcStates.find(
      (resident) => resident.personKey === "farmer",
    );
  state.location = "village";
  grain.quantity = 20;
  for (let index = 0; index < 5; index += 1)
    applyRogueTurn(state, { kind: "wait" });
  assert.ok(!state.village.jobs.some((job) => job.jobType === "mill_grain"));

  state.village.facilities.push("mill", "farmstead");
  ensureVillageFoodSystem(state);
  for (const plot of state.village.cropPlots) {
    plot.stage = "growing";
    plot.plantedAtTick = state.tick;
  }
  for (let index = 0; index < 500 && flour.quantity === 0; index += 1) {
    for (const resident of state.village.npcStates)
      if (resident.life)
        for (const need of Object.keys(resident.life.needs))
          resident.life.needs[need] = 100;
    for (const job of state.village.jobs)
      if (
        job.jobType === "mill_grain" &&
        ["active", "reserved"].includes(job.status)
      )
        job.progress.completed = Math.max(
          job.progress.completed,
          job.progress.total - 0.6,
        );
    applyRogueTurn(state, { kind: "wait" });
  }

  const flourBatch = state.village.foodLedger.batches.find(
    (batch) =>
      batch.stockpileId === flour.id && batch.originType === "production",
  );
  assert.equal(grain.quantity, 18);
  assert.equal(flour.quantity, 3);
  assert.ok(flourBatch.sourceBatchIds.length > 0);
  assert.equal(farmer.skillPractice.milling, 3);
});
