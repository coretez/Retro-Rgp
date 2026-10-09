import { definitionId, namedUuid } from "./identity.js";
import { stockpileByKey } from "./village-economy.js";
import { produceFood, withdrawFood } from "./village-food.js";
import { restoreExtinctCattleFromMerchant } from "./village-animals.js";

export const MERCHANT_TICKS_PER_DAY = 2400;
export const MERCHANT_POSITION = Object.freeze({ x: 34, y: 12 });

const CADENCE_CANDIDATES = Object.freeze([14, 18, 21, 90]);
const GOODS = Object.freeze([
  {
    itemKind: "seed_grain",
    stockpileKey: "farm_seed",
    buyPriceCp: 8,
    target: 8,
    stock: 24,
  },
  {
    itemKind: "iron_ingot",
    stockpileKey: "forge_iron",
    buyPriceCp: 18,
    target: 4,
    stock: 12,
  },
  {
    itemKind: "steel_ingot",
    stockpileKey: "forge_steel",
    buyPriceCp: 30,
    target: 3,
    stock: 8,
  },
  {
    itemKind: "copper_ingot",
    stockpileKey: "forge_copper",
    buyPriceCp: 20,
    target: 2,
    stock: 8,
  },
  {
    itemKind: "tin_ingot",
    stockpileKey: "forge_tin",
    buyPriceCp: 16,
    target: 2,
    stock: 6,
  },
  {
    itemKind: "brass_ingot",
    stockpileKey: "forge_brass",
    buyPriceCp: 26,
    target: 2,
    stock: 6,
  },
  {
    itemKind: "flour",
    stockpileKey: "mill_flour",
    sellPriceCp: 6,
    reserve: 6,
    stock: 0,
  },
  {
    itemKind: "wool",
    stockpileKey: "sheep_wool",
    sellPriceCp: 10,
    reserve: 2,
    stock: 0,
  },
]);

export function evaluateMerchantCadences() {
  return CADENCE_CANDIDATES.map((intervalDays) => {
    const visitsPerYear = Math.ceil(360 / intervalDays);
    const stockoutDaysPerCycle = Math.max(0, intervalDays - 18);
    const annualStockoutDays = stockoutDaysPerCycle * visitsPerYear;
    return {
      intervalDays,
      visitsPerYear,
      annualStockoutDays,
      score: visitsPerYear + annualStockoutDays * 10,
      assumption: "critical imports carry eighteen days of coverage",
    };
  }).sort(
    (left, right) =>
      left.score - right.score || left.intervalDays - right.intervalDays,
  );
}

export function recommendedMerchantIntervalDays() {
  return evaluateMerchantCadences()[0].intervalDays;
}

function inventoryForVisit(state, serial) {
  return GOODS.map((good) => ({
    id: namedUuid(state.id, `merchant-stock:${serial}:${good.itemKind}`),
    definitionId: definitionId("trade-good", good.itemKind),
    entityType: "merchant-stock",
    ...structuredClone(good),
    quantity: good.stock,
  }));
}

// function-length-exempt: template -- persisted trade-state construction/migration
export function ensureVillageTradeSystem(state) {
  const intervalDays = recommendedMerchantIntervalDays();
  state.village.trade ??= {
    treasuryCp: 400,
    visitSerial: 0,
    transactionSerial: 0,
    policy: {
      intervalDays,
      stayDays: 2,
      reserveCp: 60,
      autoBuy: true,
      autoSell: true,
    },
    nextArrivalAtTick: state.tick + 3 * MERCHANT_TICKS_PER_DAY,
    activeVisit: null,
    visits: [],
    transactions: [],
  };
  const trade = state.village.trade;
  trade.treasuryCp ??= 400;
  trade.visitSerial ??= 0;
  trade.transactionSerial ??= 0;
  trade.policy ??= {};
  trade.policy.intervalDays ??= intervalDays;
  trade.policy.stayDays ??= 2;
  trade.policy.reserveCp ??= 60;
  trade.policy.autoBuy ??= true;
  trade.policy.autoSell ??= true;
  trade.nextArrivalAtTick ??= state.tick + 3 * MERCHANT_TICKS_PER_DAY;
  trade.activeVisit ??= null;
  trade.visits ??= [];
  trade.transactions ??= [];
  return trade;
}

function recordTrade(state, visit, direction, good, quantity, unitPriceCp) {
  const trade = state.village.trade;
  trade.transactionSerial += 1;
  const entry = {
    id: namedUuid(state.id, `merchant-transaction:${trade.transactionSerial}`),
    definitionId: definitionId("trade-transaction", direction),
    entityType: "trade-transaction",
    tick: state.tick,
    visitId: visit.id,
    direction,
    itemKind: good.itemKind,
    quantity,
    unitPriceCp,
    totalCp: quantity * unitPriceCp,
  };
  trade.transactions.push(entry);
  visit.transactionIds.push(entry.id);
  return entry;
}

function sellGood(state, visit, good, events) {
  const trade = state.village.trade;
  if (!trade.policy.autoSell) return;
  const source = stockpileByKey(state, good.stockpileKey),
    available = Math.max(0, (source?.quantity ?? 0) - good.reserve),
    quantity = Math.min(available, Math.floor(visit.coinCp / good.sellPriceCp));
  if (quantity < 1) return;
  if (good.itemKind === "flour")
    withdrawFood(state, source.id, quantity, {
      type: "food_exported",
      visitId: visit.id,
    });
  source.quantity -= quantity;
  good.quantity += quantity;
  visit.coinCp -= quantity * good.sellPriceCp;
  trade.treasuryCp += quantity * good.sellPriceCp;
  const transaction = recordTrade(
    state,
    visit,
    "village_sold",
    good,
    quantity,
    good.sellPriceCp,
  );
  events.push({ type: "merchant_trade", scope: "village", ...transaction });
}

function buyGood(state, visit, good, events) {
  const trade = state.village.trade,
    target = stockpileByKey(state, good.stockpileKey);
  if (!target) return;
  const wanted = Math.max(
      0,
      Math.min(good.target, target.capacity) - target.quantity,
    ),
    funds = Math.max(0, trade.treasuryCp - trade.policy.reserveCp),
    quantity = Math.min(
      wanted,
      good.quantity,
      Math.floor(funds / good.buyPriceCp),
    );
  if (quantity < 1) return;
  const total = quantity * good.buyPriceCp;
  good.quantity -= quantity;
  target.quantity += quantity;
  if (good.itemKind === "seed_grain")
    produceFood(state, target.id, quantity, {
      originType: "merchant_import",
      originId: visit.id,
    });
  trade.treasuryCp -= total;
  visit.coinCp += total;
  const transaction = recordTrade(
    state,
    visit,
    "village_bought",
    good,
    quantity,
    good.buyPriceCp,
  );
  events.push({ type: "merchant_trade", scope: "village", ...transaction });
}

function executeVisitPolicy(state, visit, events) {
  for (const good of visit.inventory.filter((entry) => entry.sellPriceCp))
    sellGood(state, visit, good, events);
  if (!state.village.trade.policy.autoBuy) return;
  for (const good of visit.inventory.filter((entry) => entry.buyPriceCp)) {
    buyGood(state, visit, good, events);
  }
}

function recoverExtinctCattle(state, visit, events) {
  const trade = state.village.trade;
  trade.livestockRecoveryVisitIds ??= [];
  if (trade.livestockRecoveryVisitIds.includes(visit.id)) return;
  const animals = restoreExtinctCattleFromMerchant(state, visit.id);
  if (!animals.length) return;
  const good = { itemKind: "cattle_pair" },
    transaction = recordTrade(
      state,
      visit,
      "merchant_livestock_credit",
      good,
      1,
      160,
    );
  trade.livestockCreditCp = (trade.livestockCreditCp ?? 0) + 160;
  trade.livestockRecoveryVisitIds.push(visit.id);
  events.push({
    type: "merchant_livestock_arrived",
    scope: "village",
    animalIds: animals.map((animal) => animal.id),
    ...transaction,
  });
}

function livestockRecoveryVisit(state) {
  const trade = state.village.trade;
  if (trade.activeVisit) return trade.activeVisit;
  const latest = trade.visits.at(-1),
    lastCattleDeath = Math.max(
      0,
      ...(state.village.animals ?? [])
        .filter((animal) => animal.species === "cow")
        .map((animal) => animal.deathDay ?? 0),
    );
  const departedDay = latest
    ? Math.floor((latest.departedAtTick ?? 0) / MERCHANT_TICKS_PER_DAY) + 1
    : 0;
  return latest && lastCattleDeath && lastCattleDeath <= departedDay
    ? latest
    : null;
}

// function-length-exempt: template -- merchant visit-state construction
function arrive(state, events) {
  const trade = state.village.trade;
  trade.visitSerial += 1;
  const serial = trade.visitSerial,
    visit = {
      id: namedUuid(state.id, `merchant-visit:${serial}`),
      definitionId: definitionId("merchant-visit", "traveling_merchant"),
      entityType: "merchant-visit",
      serial,
      merchant: {
        id: namedUuid(state.id, `merchant:${serial}`),
        personKey: "merchant",
        name: "Ysabet Vale",
        position: { ...MERCHANT_POSITION },
        objective: "trade_with_village",
        currentAction: "Opening the traveling market",
        actionReason: "scheduled_visit",
        housingStatus: "visitor",
      },
      arrivedAtTick: state.tick,
      departsAtTick:
        state.tick + trade.policy.stayDays * MERCHANT_TICKS_PER_DAY,
      coinCp: 500,
      inventory: inventoryForVisit(state, serial),
      transactionIds: [],
      status: "active",
    };
  trade.activeVisit = visit;
  trade.nextArrivalAtTick = null;
  events.push({
    type: "merchant_arrived",
    scope: "village",
    tick: state.tick,
    visitId: visit.id,
    merchantId: visit.merchant.id,
  });
  executeVisitPolicy(state, visit, events);
}

function depart(state, events) {
  const trade = state.village.trade,
    visit = trade.activeVisit;
  visit.status = "departed";
  visit.departedAtTick = state.tick;
  trade.visits.push(structuredClone(visit));
  trade.activeVisit = null;
  trade.nextArrivalAtTick =
    state.tick + trade.policy.intervalDays * MERCHANT_TICKS_PER_DAY;
  events.push({
    type: "merchant_departed",
    scope: "village",
    tick: state.tick,
    visitId: visit.id,
    nextArrivalAtTick: trade.nextArrivalAtTick,
  });
}

export function advanceVillageTrade(state, events = []) {
  const trade = ensureVillageTradeSystem(state);
  if (trade.activeVisit && state.tick >= trade.activeVisit.departsAtTick)
    depart(state, events);
  if (!trade.activeVisit && state.tick >= (trade.nextArrivalAtTick ?? Infinity))
    arrive(state, events);
  const recoveryVisit = livestockRecoveryVisit(state);
  if (recoveryVisit) recoverExtinctCattle(state, recoveryVisit, events);
  return trade;
}

export function villageTradeView(state, compact = false) {
  const trade = ensureVillageTradeSystem(state);
  const view = {
    treasuryCp: trade.treasuryCp,
    policy: { ...trade.policy },
    nextArrivalAtTick: trade.nextArrivalAtTick,
    activeVisit: trade.activeVisit ? structuredClone(trade.activeVisit) : null,
  };
  if (compact && view.activeVisit) {
    view.activeVisit = {
      id: view.activeVisit.id,
      merchant: view.activeVisit.merchant,
      arrivedAtTick: view.activeVisit.arrivedAtTick,
      departsAtTick: view.activeVisit.departsAtTick,
      inventory: view.activeVisit.inventory.map(({ itemKind, quantity }) => ({
        itemKind,
        quantity,
      })),
    };
  }
  if (compact) return view;
  return {
    ...view,
    recentTransactions: trade.transactions
      .slice(-12)
      .map((entry) => ({ ...entry })),
    cadenceEvaluation: evaluateMerchantCadences(),
  };
}
