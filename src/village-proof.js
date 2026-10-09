import { createHash } from "node:crypto";
import {
  advanceRogueSimulation,
  applyRogueTurn,
  newRogueRun,
  parseRogueState,
  rogueUnityView,
  serializeRogueState,
} from "./rogue-engine.js";
import { namedUuid } from "./identity.js";
import {
  createVillageRunTelemetry,
  evaluateVillageAudit,
  recordVillageRunTelemetry,
  villageRunTelemetryReport,
  villageSimulationAudit,
} from "./village-audit.js";
import {
  discardInitialFood,
  foodProvenanceAudit,
  retireFoodAbove,
} from "./village-food.js";
import {
  STRATEGIC_BUILDING_OBJECTIVES,
  auditVillageStrategy,
} from "./village-development.js";
import { villageStorageAudit } from "./village-storage.js";
import { VILLAGE_POPULATION_GROWTH_ENABLED } from "./village-simulation.js";

export const CANONICAL_FOUNDING_PROOF_INPUT = Object.freeze({
  requestId: "r0-canonical-proof",
  runId: "ec02b607-150c-5276-9c46-24e7df1d0870",
  seed: "r0-canonical-proof",
  heroName: "Mara",
  heroClass: "fighter",
  form: "hybrid",
  size: "small",
  levels: 3,
  scenario: "founding",
});

export const RELEASE_PROOF_SEEDS = Object.freeze(
  Array.from({ length: 10 }, (_, index) => `stonebridge-release-${index + 1}`),
);

export const FULL_TOWN_PROOF_SEEDS = Object.freeze(
  RELEASE_PROOF_SEEDS.slice(0, 5),
);

const hash = (value) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

function activeAssignments(audit) {
  return audit.residents
    .filter((resident) => resident.jobId)
    .map((resident) => ({
      residentId: resident.id,
      jobId: resident.jobId,
      jobType: resident.jobType,
    }))
    .sort((left, right) => left.residentId.localeCompare(right.residentId));
}

function finalOutcome(audit) {
  return {
    residentCount: audit.residentCount,
    accountedResidentCount: audit.accountedResidentCount,
    survival: audit.survival,
    jobStatuses: audit.jobs.statuses,
    facilities: audit.survival.facilities,
    constructionSites: audit.construction.sites,
  };
}

export function villageProofCheckpoint(state, telemetry) {
  const audit = villageSimulationAudit(state),
    run = villageRunTelemetryReport(telemetry),
    projections = {
      materials: audit.materials,
      assignments: {
        active: activeAssignments(audit),
        history: run.jobs.assignments,
      },
      constructionOrder: run.constructionOrder,
      needs: Object.fromEntries(
        audit.residents.map((resident) => [resident.id, resident.needs]),
      ),
      outcome: finalOutcome(audit),
    };
  return {
    tick: audit.tick,
    auditHash: hash(audit),
    materialLedgerHash: hash(projections.materials),
    assignmentsHash: hash(projections.assignments),
    constructionOrderHash: hash(projections.constructionOrder),
    needsHash: hash(projections.needs),
    outcomeHash: hash(projections.outcome),
    checkpointHash: hash({ audit, run }),
  };
}

function compareRun(baseline, candidate, runIndex) {
  const mismatches = [];
  for (let index = 0; index < baseline.length; index += 1) {
    const expected = baseline[index],
      actual = candidate[index];
    for (const key of [
      "auditHash",
      "materialLedgerHash",
      "assignmentsHash",
      "constructionOrderHash",
      "needsHash",
      "outcomeHash",
      "checkpointHash",
    ])
      if (actual[key] !== expected[key])
        mismatches.push({
          run: runIndex + 1,
          tick: expected.tick,
          field: key,
          expected: expected[key],
          actual: actual[key],
        });
  }
  return mismatches;
}

export function runCanonicalVillageProof({
  runs = 10,
  ticks = 500,
  checkpoints = [0, 100, 250, 500],
  input = CANONICAL_FOUNDING_PROOF_INPUT,
  gate = {},
} = {}) {
  const checkpointSet = new Set(checkpoints),
    orderedCheckpoints = [...checkpointSet].sort((left, right) => left - right);
  if (runs < 2) throw new Error("Canonical proof requires at least two runs");
  if (
    orderedCheckpoints[0] !== 0 ||
    orderedCheckpoints.at(-1) !== ticks ||
    orderedCheckpoints.some((tick) => tick < 0 || tick > ticks)
  )
    throw new Error("Checkpoints must start at zero and end at the tick limit");

  let baseline = null,
    baselineTelemetry = null,
    baselineAudit = null;
  const runSignatures = [],
    mismatches = [],
    gateResults = [];
  for (let runIndex = 0; runIndex < runs; runIndex += 1) {
    const state = newRogueRun(input),
      telemetry = createVillageRunTelemetry(state),
      signatures = [villageProofCheckpoint(state, telemetry)];
    for (let tick = 1; tick <= ticks; tick += 1) {
      const result = applyRogueTurn(state, { kind: "wait" });
      recordVillageRunTelemetry(telemetry, state, result.events);
      if (checkpointSet.has(tick))
        signatures.push(villageProofCheckpoint(state, telemetry));
    }
    const audit = villageSimulationAudit(state),
      gateResult = evaluateVillageAudit(audit, gate);
    gateResults.push(gateResult);
    runSignatures.push(signatures);
    if (!baseline) {
      baseline = signatures;
      baselineTelemetry = villageRunTelemetryReport(telemetry);
      baselineAudit = audit;
    } else mismatches.push(...compareRun(baseline, signatures, runIndex));
  }
  return {
    passed:
      mismatches.length === 0 && gateResults.every((result) => result.passed),
    runs,
    ticks,
    checkpoints: orderedCheckpoints,
    mismatches,
    gateResults,
    runSignatures,
    baselineAudit,
    baselineTelemetry,
  };
}

const R2_SURVIVAL_NEEDS = Object.freeze(["hunger", "fatigue", "safety"]);

// function-length-exempt: template -- release evidence projection
function firstHomeEvidence(state) {
  const residence = state.village.residences.find(
      (candidate) => candidate.status === "complete",
    ),
    building = state.village.buildings.find(
      (candidate) => candidate.id === residence?.buildingId,
    ),
    job = state.village.jobs.find(
      (candidate) =>
        candidate.jobType === "build_house" &&
        candidate.plan?.construction?.key === building?.key,
    ),
    fixtures = state.village.fixtures.filter(
      (fixture) => fixture.buildingId === building?.id,
    ),
    primitives = state.village.constructionPrimitives.filter(
      (primitive) => primitive.projectId === job?.id,
    ),
    floor = primitives.find((primitive) => primitive.kind === "floor"),
    roof = primitives.find((primitive) => primitive.kind === "roof"),
    physicalIds = new Set([
      ...state.village.constructionPrimitives.map((primitive) => primitive.id),
      ...state.village.doors.map((door) => door.id),
      ...state.village.fixtures.map((fixture) => fixture.id),
    ]),
    fixtureRoles = fixtures.reduce((summary, fixture) => {
      summary[fixture.role] = (summary[fixture.role] ?? 0) + 1;
      return summary;
    }, {}),
    domesticCapacity = Math.max(1, residence?.residentCapacity ?? 2),
    failures = [];
  if (!residence) failures.push("complete_residence_missing");
  if (!building || building.status !== "complete")
    failures.push("complete_building_missing");
  if (!job?.plan?.derivedFacts?.complete)
    failures.push("construction_facts_incomplete");
  if (
    job?.plan?.constructionWork?.elements.some(
      (element) => element.status !== "complete",
    )
  )
    failures.push("construction_elements_incomplete");
  if (!residence?.plan?.assessment?.valid) failures.push("house_plan_invalid");
  if (!floor) failures.push("floor_missing");
  if (!roof) failures.push("roof_missing");
  if (
    roof &&
    (!roof.supportIds?.length ||
      roof.supportIds.some((supportId) => !physicalIds.has(supportId)))
  )
    failures.push("roof_support_missing");
  for (const [role, minimum] of Object.entries({
    bed: domesticCapacity,
    chair: domesticCapacity,
    kitchen: 1,
    storage: 1,
    table: 1,
  }))
    if ((fixtureRoles[role] ?? 0) < minimum)
      failures.push(`fixture_${role}_missing`);
  return {
    passed: failures.length === 0,
    failures,
    residenceId: residence?.id ?? null,
    buildingId: building?.id ?? null,
    projectId: job?.id ?? null,
    residentCapacity: residence?.residentCapacity ?? 0,
    occupantCount: residence?.occupantIds?.length ?? 0,
    fixtureRoles,
    constructionElements: job?.plan?.constructionWork?.elements.length ?? 0,
    floorId: floor?.id ?? null,
    roofId: roof?.id ?? null,
    roofSupportCount: roof?.supportIds?.length ?? 0,
  };
}

function survivalWindowReady(state, threshold) {
  const audit = villageSimulationAudit(state);
  return (
    audit.survival.completeHomes > 0 &&
    audit.survival.validSleepingLocations === audit.residentCount &&
    audit.survival.shelteredSleepingLocations === audit.residentCount &&
    state.village.npcStates.every((resident) =>
      R2_SURVIVAL_NEEDS.every((need) => resident.life.needs[need] >= threshold),
    )
  );
}

function recordSurvivalMinimum(minimumByResident, state) {
  for (const resident of state.village.npcStates) {
    const needs = (minimumByResident[resident.id] ??= {
      name: resident.name,
    });
    for (const need of R2_SURVIVAL_NEEDS)
      needs[need] = Math.min(needs[need] ?? 100, resident.life.needs[need]);
  }
}

// function-length-exempt: template -- release failure projection
function sleepingFailures(state) {
  const fixtures = new Map(
      state.village.fixtures.map((fixture) => [fixture.id, fixture]),
    ),
    residenceBuildingIds = new Set(
      state.village.residences
        .filter((residence) => residence.status === "complete")
        .map((residence) => residence.buildingId),
    );
  let invalid = 0,
    unsheltered = 0;
  for (const resident of state.village.npcStates) {
    const fixture = fixtures.get(resident.sleepingLocation?.fixtureId),
      valid =
        fixture &&
        resident.sleepingLocation.position.x === fixture.x &&
        resident.sleepingLocation.position.y === fixture.y &&
        (fixture.sleepingCapacity ?? 0) > 0;
    if (!valid) invalid += 1;
    if (
      !valid ||
      (!fixture.providesShelter &&
        !residenceBuildingIds.has(fixture.buildingId))
    )
      unsheltered += 1;
  }
  return {
    invalid,
    unsheltered,
  };
}

function visibleStockById(view) {
  const result = new Map();
  for (const cell of view.map.cells)
    for (let index = 0; index < (cell.stockpileIds?.length ?? 0); index += 1) {
      const id = cell.stockpileIds[index],
        current = result.get(id) ?? {
          itemKind: cell.stockItemKinds[index],
          quantity: 0,
          visualFallback: false,
        };
      current.quantity += cell.stockQuantities[index];
      current.visualFallback ||= cell.visualFallback;
      result.set(id, current);
    }
  return result;
}

// function-length-exempt: template -- release evidence projection
export function villageResourceVisibilityAudit(state) {
  const view = rogueUnityView(state),
    visibleStock = visibleStockById(view),
    hiddenStockpiles = state.village.stockpiles
      .filter((stockpile) => stockpile.quantity > 0)
      .filter((stockpile) => {
        const cell = visibleStock.get(stockpile.id);
        return (
          !cell ||
          cell.itemKind !== stockpile.itemKind ||
          cell.quantity !== stockpile.quantity ||
          cell.visualFallback
        );
      })
      .map((stockpile) => stockpile.id),
    visibleLoose = new Set(
      view.map.cells
        .filter((cell) => cell.objectKind === "material" && !cell.stockpileId)
        .map((cell) => `${cell.x},${cell.y}:${cell.variant}`),
    ),
    hiddenLooseMaterials = state.village.looseMaterials
      .filter((material) => material.quantity > 0)
      .filter(
        (material) =>
          !visibleLoose.has(`${material.x},${material.y}:${material.kind}`),
      )
      .map((material) => material.id),
    visibleCarriedItems = new Map(
      view.map.cells
        .filter((cell) => cell.entityId && cell.entityCarryingKind)
        .map((cell) => [cell.entityId, cell.entityCarryingKind]),
    ),
    hiddenCarriedItems = state.village.npcStates
      .filter((resident) => resident.carriedItem)
      .filter((resident) => {
        if (
          visibleCarriedItems.get(resident.id) === resident.carriedItem.itemKind
        )
          return false;
        const centeredView = rogueUnityView(state, [], {
          villageCenter: resident.position,
        });
        return !centeredView.map.cells.some(
          (cell) =>
            cell.entityId === resident.id &&
            cell.entityCarryingKind === resident.carriedItem.itemKind,
        );
      })
      .map((resident) => resident.id);
  return {
    passed:
      hiddenStockpiles.length === 0 &&
      hiddenLooseMaterials.length === 0 &&
      hiddenCarriedItems.length === 0,
    positiveStockpiles: state.village.stockpiles.filter(
      (stockpile) => stockpile.quantity > 0,
    ).length,
    positiveLooseMaterials: state.village.looseMaterials.filter(
      (material) => material.quantity > 0,
    ).length,
    hiddenStockpiles,
    hiddenLooseMaterials,
    hiddenCarriedItems,
  };
}

export function runFoundingSurvivalProof({
  input = CANONICAL_FOUNDING_PROOF_INPUT,
  maxHomeTicks = 40000,
  maxRecoveryTicks = 5000,
  dayTicks = 2400,
  dangerThreshold = 25,
  recoveryThreshold = 30,
} = {}) {
  const state = newRogueRun(input),
    milestones = [];
  let homeTick = null;
  for (let index = 0; index < maxHomeTicks && homeTick === null; index += 1) {
    const { events } = applyRogueTurn(state, { kind: "wait" });
    for (const event of events) {
      if (event.type === "facility_completed")
        milestones.push({
          tick: state.tick,
          type: event.type,
          facilityKey: event.facilityKey,
        });
      if (event.type === "residence_completed") {
        homeTick = state.tick;
        milestones.push({
          tick: state.tick,
          type: event.type,
          residentCapacity: event.residentCapacity,
          bedCapacity: event.bedCapacity,
        });
      }
    }
  }

  const home = firstHomeEvidence(state);
  let recoveryTick = null;
  if (homeTick !== null) {
    if (survivalWindowReady(state, recoveryThreshold))
      recoveryTick = state.tick;
    for (
      let index = 0;
      index < maxRecoveryTicks && recoveryTick === null;
      index += 1
    ) {
      applyRogueTurn(state, { kind: "wait" });
      if (survivalWindowReady(state, recoveryThreshold))
        recoveryTick = state.tick;
    }
  }

  const startAudit = villageSimulationAudit(state),
    startingMeals = startAudit.survival.meals,
    telemetry = createVillageRunTelemetry(state),
    minimumByResident = {},
    mealEvents = [];
  let invalidSleepingActorTicks = 0,
    unshelteredSleepingActorTicks = 0,
    completedDayTicks = 0;
  if (recoveryTick !== null) {
    recordSurvivalMinimum(minimumByResident, state);
    for (let index = 0; index < dayTicks; index += 1) {
      const result = applyRogueTurn(state, { kind: "wait" });
      completedDayTicks += 1;
      recordVillageRunTelemetry(telemetry, state, result.events);
      recordSurvivalMinimum(minimumByResident, state);
      for (const event of result.events)
        if (event.type === "meal_consumed")
          mealEvents.push({
            tick: event.tick,
            actorId: event.actorId,
            itemKind: event.itemKind,
            quantity: event.quantity,
            sourceStockpileId: event.sourceStockpileId,
          });
      const sleeping = sleepingFailures(state);
      invalidSleepingActorTicks += sleeping.invalid;
      unshelteredSleepingActorTicks += sleeping.unsheltered;
    }
  }

  const finalAudit = villageSimulationAudit(state),
    dayTelemetry = villageRunTelemetryReport(telemetry),
    minimumNeeds = Object.fromEntries(
      R2_SURVIVAL_NEEDS.map((need) => {
        const values = Object.values(minimumByResident).map(
          (resident) => resident[need] ?? 100,
        );
        return [need, values.length ? Math.min(...values) : 0];
      }),
    ),
    mealsProduced = dayTelemetry.production.hearty_meal ?? 0,
    mealsConsumed = mealEvents.reduce(
      (total, event) => total + event.quantity,
      0,
    ),
    mealBalance =
      startingMeals + mealsProduced - finalAudit.survival.meals - mealsConsumed,
    failures = [...home.failures];
  if (homeTick === null) failures.push("home_completion_timeout");
  if (recoveryTick === null) failures.push("survival_recovery_timeout");
  if (completedDayTicks !== dayTicks) failures.push("survival_day_incomplete");
  for (const [need, value] of Object.entries(minimumNeeds))
    if (value <= dangerThreshold)
      failures.push(`${need}_reached_danger_threshold`);
  if (invalidSleepingActorTicks)
    failures.push("invalid_sleeping_location_during_day");
  if (unshelteredSleepingActorTicks)
    failures.push("unsheltered_sleeping_location_during_day");
  if (!mealEvents.length) failures.push("no_traceable_meal_consumption");
  if (
    mealEvents.some(
      (event) =>
        !event.actorId ||
        !event.sourceStockpileId ||
        event.itemKind !== "hearty_meal" ||
        event.quantity !== 1,
    )
  )
    failures.push("meal_provenance_invalid");
  if (mealBalance !== 0) failures.push("meal_ledger_unbalanced");

  return {
    passed: failures.length === 0,
    failures,
    ticks: state.tick,
    homeTick,
    recoveryTick,
    dayTicks: completedDayTicks,
    dangerThreshold,
    recoveryThreshold,
    milestones,
    home,
    minimumNeeds,
    minimumByResident,
    sleeping: {
      invalidActorTicks: invalidSleepingActorTicks,
      unshelteredActorTicks: unshelteredSleepingActorTicks,
    },
    meals: {
      starting: startingMeals,
      produced: mealsProduced,
      consumed: mealsConsumed,
      ending: finalAudit.survival.meals,
      balance: mealBalance,
      events: mealEvents,
    },
    stateHash: hash(serializeRogueState(state)),
    resourceVisibility: villageResourceVisibilityAudit(state),
    finalAudit,
    dayTelemetry,
  };
}

export function runDomesticFoodProof({
  input = CANONICAL_FOUNDING_PROOF_INPUT,
  maxInfrastructureTicks = 70000,
  maxRecoveryTicks = 5000,
  dayTicks = 2400,
  days = 3,
  dangerThreshold = 25,
  recoveryThreshold = 40,
} = {}) {
  const state = newRogueRun(input);
  let infrastructureTick = null;
  for (
    let index = 0;
    index < maxInfrastructureTicks && infrastructureTick === null;
    index += 1
  ) {
    applyRogueTurn(state, { kind: "wait" });
    if (
      state.village.facilities.includes("communal_kitchen") &&
      state.village.residences.length > 0
    )
      infrastructureTick = state.tick;
  }
  const retiredInitialFood = discardInitialFood(state);
  let recoveryTick = null;
  for (let index = 0; index < maxRecoveryTicks; index += 1) {
    const audit = villageSimulationAudit(state);
    if (
      audit.survival.meals >= state.village.npcStates.length &&
      state.village.npcStates.every((resident) =>
        R2_SURVIVAL_NEEDS.every(
          (need) => resident.life.needs[need] >= recoveryThreshold,
        ),
      )
    ) {
      recoveryTick = state.tick;
      break;
    }
    applyRogueTurn(state, { kind: "wait" });
  }

  const retiredSurplusMeals = retireFoodAbove(state, "inn_meals", 10),
    transactionStart = state.village.foodLedger.transactions.length,
    startingMeals = state.village.stockpiles.find(
      (stockpile) => stockpile.key === "inn_meals",
    ).quantity,
    minimumByResident = {},
    telemetry = createVillageRunTelemetry(state),
    measuredTicks = dayTicks * days;
  let completedTicks = 0;
  if (recoveryTick !== null) {
    recordSurvivalMinimum(minimumByResident, state);
    for (let index = 0; index < measuredTicks; index += 1) {
      const result = applyRogueTurn(state, { kind: "wait" });
      completedTicks += 1;
      recordVillageRunTelemetry(telemetry, state, result.events);
      recordSurvivalMinimum(minimumByResident, state);
    }
  }
  const transactions =
      state.village.foodLedger.transactions.slice(transactionStart),
    producedMeals = transactions
      .filter(
        (entry) =>
          entry.type === "food_produced" && entry.itemKind === "hearty_meal",
      )
      .reduce((total, entry) => total + entry.quantity, 0),
    consumedMeals = transactions
      .filter((entry) => entry.type === "meal_consumed")
      .reduce((total, entry) => total + entry.quantity, 0),
    endingMeals = state.village.stockpiles.find(
      (stockpile) => stockpile.key === "inn_meals",
    ).quantity,
    batchById = new Map(
      state.village.foodLedger.batches.map((batch) => [batch.id, batch]),
    ),
    consumedBatchIds = transactions
      .filter((entry) => entry.type === "meal_consumed")
      .flatMap((entry) => entry.portions.map((portion) => portion.batchId)),
    initialConsumption = consumedBatchIds.filter(
      (id) => batchById.get(id)?.originType === "initial_stock",
    ),
    cropActions = transactions.filter((entry) =>
      ["crop_prepare", "crop_sow", "crop_matured", "crop_harvest"].includes(
        entry.type,
      ),
    ),
    cropCoverage = Object.fromEntries(
      ["grain", "vegetables"].map((cropKind) => [
        cropKind,
        ["crop_prepare", "crop_sow", "crop_matured", "crop_harvest"].filter(
          (type) =>
            cropActions.some(
              (entry) => entry.cropKind === cropKind && entry.type === type,
            ),
        ),
      ]),
    ),
    minimumNeeds = Object.fromEntries(
      R2_SURVIVAL_NEEDS.map((need) => {
        const values = Object.values(minimumByResident).map(
          (resident) => resident[need] ?? 100,
        );
        return [need, values.length ? Math.min(...values) : 0];
      }),
    ),
    inn = state.village.buildings.find(
      (building) => building.key === "communal_kitchen",
    ),
    innRoom = state.village.rooms?.find((room) => room.buildingId === inn?.id),
    innFixtures = state.village.fixtures.filter(
      (fixture) => fixture.buildingId === inn?.id,
    ),
    provenance = foodProvenanceAudit(state),
    failures = [];
  if (infrastructureTick === null)
    failures.push("domestic_infrastructure_timeout");
  if (recoveryTick === null) failures.push("domestic_recovery_timeout");
  if (completedTicks !== measuredTicks)
    failures.push("multi_day_window_incomplete");
  if (!inn || inn.status !== "complete") failures.push("physical_inn_missing");
  if (!innRoom?.sheltered) failures.push("sheltered_inn_room_missing");
  for (const role of ["kitchen", "storage"])
    if (!innFixtures.some((fixture) => fixture.role === role))
      failures.push(`inn_${role}_missing`);
  if (!provenance.passed) failures.push("food_provenance_invalid");
  if (initialConsumption.length)
    failures.push("initial_food_consumed_during_window");
  if (producedMeals <= consumedMeals)
    failures.push("meal_production_did_not_exceed_consumption");
  if (startingMeals + producedMeals - consumedMeals !== endingMeals)
    failures.push("multi_day_meal_ledger_unbalanced");
  for (const [cropKind, coverage] of Object.entries(cropCoverage))
    if (coverage.length !== 4) failures.push(`${cropKind}_cycle_incomplete`);
  return {
    passed: failures.length === 0,
    failures,
    ticks: state.tick,
    infrastructureTick,
    recoveryTick,
    dayTicks,
    days,
    measuredTicks: completedTicks,
    dangerThreshold,
    recoveryThreshold,
    retiredInitialFood,
    retiredSurplusMeals,
    minimumNeeds,
    survivalWarning: Object.fromEntries(
      Object.entries(minimumNeeds).filter(
        ([, value]) => value <= dangerThreshold,
      ),
    ),
    cropCoverage,
    cropState: {
      plots: structuredClone(state.village.cropPlots ?? []),
      stock: Object.fromEntries(
        ["farm_seed", "farm_grain", "farm_vegetables"].map((key) => [
          key,
          state.village.stockpiles.find((stockpile) => stockpile.key === key)
            ?.quantity ?? 0,
        ]),
      ),
      jobs: state.village.jobs
        .filter((job) =>
          ["grow_grain", "grow_vegetables", "save_seed"].includes(job.jobType),
        )
        .map((job) => ({
          jobType: job.jobType,
          status: job.status,
          cropAction: job.plan?.cropAction ?? null,
          blockingReason: job.blockingReason ?? null,
        })),
    },
    meals: {
      starting: startingMeals,
      produced: producedMeals,
      consumed: consumedMeals,
      ending: endingMeals,
    },
    inn: {
      buildingId: inn?.id ?? null,
      roomId: innRoom?.id ?? null,
      sheltered: innRoom?.sheltered ?? false,
      fixtureRoles: innFixtures.map((fixture) => fixture.role).sort(),
    },
    provenance,
    stateHash: hash(serializeRogueState(state)),
    resourceVisibility: villageResourceVisibilityAudit(state),
    telemetry: villageRunTelemetryReport(telemetry),
    finalAudit: villageSimulationAudit(state),
  };
}

export function runSchedulerTimingProof({
  input = CANONICAL_FOUNDING_PROOF_INPUT,
  dayTicks = 2400,
  maximumBlockedStreak = 32,
  minimumTicksPerSecond = 250,
} = {}) {
  const source = newRogueRun(input),
    snapshot = serializeRogueState(source),
    headless = parseRogueState(structuredClone(snapshot)),
    normal = parseRogueState(structuredClone(snapshot)),
    fast = parseRogueState(structuredClone(snapshot)),
    telemetry = createVillageRunTelemetry(headless),
    blockedStreaks = new Map(),
    maximumStreaks = new Map(),
    startedAt = performance.now();
  for (let index = 0; index < dayTicks; index += 1) {
    const result = applyRogueTurn(headless, { kind: "wait" });
    recordVillageRunTelemetry(telemetry, headless, result.events);
    const blockedIds = new Set(
      headless.village.jobs
        .filter((job) => job.status === "blocked")
        .map((job) => job.id),
    );
    for (const id of new Set([...blockedStreaks.keys(), ...blockedIds])) {
      const streak = blockedIds.has(id) ? (blockedStreaks.get(id) ?? 0) + 1 : 0;
      blockedStreaks.set(id, streak);
      maximumStreaks.set(id, Math.max(maximumStreaks.get(id) ?? 0, streak));
    }
  }
  const durationMs = performance.now() - startedAt,
    ticksPerSecond = dayTicks / (durationMs / 1000);
  for (let advanced = 0; advanced < dayTicks; advanced += 100) {
    const ticks = Math.min(100, dayTicks - advanced);
    advanceRogueSimulation(normal, { mode: "normal", ticks });
    advanceRogueSimulation(fast, { mode: "fast", ticks });
  }
  const headlessHash = hash(serializeRogueState(headless)),
    normalHash = hash(serializeRogueState(normal)),
    fastHash = hash(serializeRogueState(fast)),
    report = villageRunTelemetryReport(telemetry),
    unexplainedTicks = report.actorTime.waitReasons.unexplained ?? 0,
    permanentBlocks = [...maximumStreaks.entries()]
      .filter(([, streak]) => streak > maximumBlockedStreak)
      .map(([jobId, streak]) => ({ jobId, streak })),
    failures = [];
  if (headlessHash !== normalHash || headlessHash !== fastHash)
    failures.push("simulation_modes_diverged");
  if (unexplainedTicks) failures.push("unexplained_resident_time");
  if (permanentBlocks.length) failures.push("permanent_blocked_job");
  if (ticksPerSecond < minimumTicksPerSecond)
    failures.push("simulation_throughput_below_budget");
  return {
    passed: failures.length === 0,
    failures,
    dayTicks,
    hashes: { headless: headlessHash, normal: normalHash, fast: fastHash },
    identicalActions: headlessHash === normalHash && headlessHash === fastHash,
    maximumBlockedStreak,
    minimumTicksPerSecond,
    permanentBlocks,
    unexplainedTicks,
    performance: {
      durationMs,
      ticksPerSecond,
    },
    telemetry: report,
  };
}

const FULL_TOWN_NEEDS = Object.freeze(["hunger", "fatigue", "safety"]);

function proofActors(state) {
  return [...state.village.npcStates, ...(state.village.companionStates ?? [])];
}

function prepareQualificationNeeds(state) {
  for (const resident of state.village.npcStates)
    for (const need of Object.keys(resident.life.needs))
      resident.life.needs[need] = 100;
}

function accelerateMinuteWork(job) {
  if (!job.progress?.unit?.endsWith("_minute")) return;
  if (!["reserved", "active"].includes(job.status)) return;
  job.progress.completed = Math.max(
    job.progress.completed,
    job.progress.total - 0.6,
  );
}

function accelerateConstructionWork(job) {
  if (!job.plan?.constructionWork || !job.production?.inputConsumed) return;
  const element = job.plan.constructionWork.elements.find(
    (candidate) =>
      candidate.materialDelivered && candidate.status !== "complete",
  );
  if (element)
    element.laborCompleted = Math.max(0, element.laborRequired - 0.5);
}

function accelerateQualificationWork(state) {
  for (const job of state.village.jobs) {
    accelerateConstructionWork(job);
    accelerateMinuteWork(job);
  }
}

function qualificationJobOrder(left, right) {
  return right.priority - left.priority || left.id.localeCompare(right.id);
}

function qualificationJobs(state) {
  return state.village.jobs
    .filter(
      (job) =>
        job.assignedActorId &&
        job.destination &&
        ["reserved", "active"].includes(job.status),
    )
    .sort(qualificationJobOrder);
}

function moveQualificationWorkers(state) {
  const actors = proofActors(state),
    occupied = new Set(
      actors.map((actor) => `${actor.position.x},${actor.position.y}`),
    ),
    moved = [];
  for (const job of qualificationJobs(state)) {
    const actor = actors.find(
        (candidate) => candidate.id === job.assignedActorId,
      ),
      destination = `${job.destination.x},${job.destination.y}`,
      origin = actor && `${actor.position.x},${actor.position.y}`;
    if (!actor || destination === origin || occupied.has(destination)) continue;
    if (moved.some((entry) => entry.actor.id === actor.id)) continue;
    occupied.delete(origin);
    moved.push({ actor, origin: { ...actor.position } });
    actor.position = { ...job.destination };
    occupied.add(destination);
  }
  return moved;
}

function restoreQualificationWorkers(state, moved) {
  const actors = proofActors(state),
    occupied = new Set(
      actors.map((actor) => `${actor.position.x},${actor.position.y}`),
    );
  for (const entry of moved.reverse()) {
    const current = `${entry.actor.position.x},${entry.actor.position.y}`,
      origin = `${entry.origin.x},${entry.origin.y}`;
    occupied.delete(current);
    if (occupied.has(origin)) {
      occupied.add(current);
      continue;
    }
    entry.actor.position = entry.origin;
    occupied.add(origin);
  }
}

function advanceQualificationTick(state) {
  prepareQualificationNeeds(state);
  accelerateQualificationWork(state);
  const moved = moveQualificationWorkers(state),
    result = applyRogueTurn(state, { kind: "wait" });
  restoreQualificationWorkers(state, moved);
  return result;
}

function roofEvidence(state, building, job) {
  if (building?.roofed) return true;
  return state.village.constructionPrimitives.some(
    (primitive) =>
      primitive.projectId === job?.id &&
      primitive.kind === "roof" &&
      primitive.status === "complete",
  );
}

function objectiveBuildingEvidence(state, objective) {
  const building = state.village.buildings.find(
      (candidate) =>
        candidate.key === objective && candidate.status === "complete",
    ),
    job = state.village.jobs.find(
      (candidate) =>
        candidate.plan?.specialistFacility &&
        candidate.plan?.facilityKey === objective,
    ),
    specialist = !["lumber_yard", "farmstead", "communal_kitchen"].includes(
      objective,
    );
  return {
    objective,
    buildingId: building?.id ?? null,
    complete: Boolean(building),
    roofed: roofEvidence(state, building, job),
    commissioningApproved:
      !specialist || job?.plan?.commissioning?.status === "approved",
  };
}

function housingObjectiveEvidence(state) {
  const residences = state.village.residences.filter(
      (residence) => residence.status === "complete",
    ),
    capacity = residences.reduce(
      (total, residence) => total + residence.residentCapacity,
      0,
    ),
    buildings = residences.map((residence) =>
      state.village.buildings.find((item) => item.id === residence.buildingId),
    );
  return {
    objective: "housing",
    complete: capacity >= state.village.npcStates.length,
    roofed:
      buildings.length > 0 && buildings.every((building) => building?.roofed),
    commissioningApproved: true,
    residenceCount: residences.length,
    capacity,
  };
}

function fullTownObjectiveEvidence(state) {
  return STRATEGIC_BUILDING_OBJECTIVES.map((objective) =>
    objective === "housing"
      ? housingObjectiveEvidence(state)
      : objectiveBuildingEvidence(state, objective),
  );
}

function fullTownObjectivesComplete(state) {
  return fullTownObjectiveEvidence(state).every(
    (item) => item.complete && item.roofed && item.commissioningApproved,
  );
}

function updateBlockedStreaks(state, current, maximum) {
  const blocked = new Set(
    state.village.jobs
      .filter((job) => job.status === "blocked")
      .map((job) => job.id),
  );
  for (const id of new Set([...current.keys(), ...blocked])) {
    const streak = blocked.has(id) ? (current.get(id) ?? 0) + 1 : 0;
    current.set(id, streak);
    maximum.set(id, Math.max(maximum.get(id) ?? 0, streak));
  }
}

function minimumNeedSummary(minimumByResident) {
  return Object.fromEntries(
    FULL_TOWN_NEEDS.map((need) => [
      need,
      Math.min(
        ...Object.values(minimumByResident).map((resident) => resident[need]),
      ),
    ]),
  );
}

function permanentBlockedJobs(state, streaks, maximumStreak) {
  return [...streaks.entries()]
    .filter(([, streak]) => streak > maximumStreak)
    .map(([jobId, streak]) => ({
      jobId,
      jobType: state.village.jobs.find((job) => job.id === jobId)?.jobType,
      streak,
    }));
}

function runNaturalTownDay(state, dayTicks, maximumBlockedStreak) {
  const minimumByResident = {},
    current = new Map(),
    maximum = new Map();
  let invalidSleepingActorTicks = 0,
    unshelteredSleepingActorTicks = 0;
  recordSurvivalMinimum(minimumByResident, state);
  for (let tick = 0; tick < dayTicks; tick += 1) {
    applyRogueTurn(state, { kind: "wait" });
    recordSurvivalMinimum(minimumByResident, state);
    updateBlockedStreaks(state, current, maximum);
    const sleeping = sleepingFailures(state);
    invalidSleepingActorTicks += sleeping.invalid;
    unshelteredSleepingActorTicks += sleeping.unsheltered;
  }
  return {
    minimumByResident,
    minimumNeeds: minimumNeedSummary(minimumByResident),
    invalidSleepingActorTicks,
    unshelteredSleepingActorTicks,
    permanentBlocks: permanentBlockedJobs(state, maximum, maximumBlockedStreak),
  };
}

function fullTownFailures(report, dangerThreshold) {
  const failures = [];
  if (!report.objectives.every((item) => item.complete))
    failures.push("building_missing");
  if (!report.objectives.every((item) => item.roofed))
    failures.push("roof_missing");
  if (!report.objectives.every((item) => item.commissioningApproved))
    failures.push("commissioning_incomplete");
  if (
    Object.values(report.survival.minimumNeeds).some(
      (value) => value <= dangerThreshold,
    )
  )
    failures.push("survival_need_reached_danger");
  if (report.survival.invalidSleepingActorTicks)
    failures.push("sleep_location_invalid");
  if (report.survival.unshelteredSleepingActorTicks)
    failures.push("sleep_unsheltered");
  if (report.survival.permanentBlocks.length)
    failures.push("permanent_job_block");
  if (!report.storage.passed) failures.push("storage_audit_failed");
  if (!report.strategy.passed) failures.push("strategy_audit_failed");
  if (!report.resources.passed) failures.push("resource_visibility_failed");
  if (!report.saveLoad.passed) failures.push("save_load_failed");
  if (report.residentCount !== 10) failures.push("founder_count_changed");
  return failures;
}

function saveLoadProof(state) {
  const before = serializeRogueState(state),
    restored = parseRogueState(structuredClone(before)),
    after = serializeRogueState(restored);
  return { passed: hash(before) === hash(after), hash: hash(after) };
}

function strategyProof(state) {
  const audit = auditVillageStrategy(state);
  return {
    passed: audit.violations.length === 0 && audit.pendingGates.length === 0,
    ...audit,
  };
}

// function-length-exempt: template -- failure diagnostics projection
function qualificationDiagnostics(state) {
  const board = state.village.development.strategyBoard;
  return {
    commissions: board.commissions
      .filter((item) => item.projectKey.startsWith("specialist_"))
      .map((item) => ({
        projectKey: item.projectKey,
        status: item.status,
        planningStatus: item.planning?.status,
        budgetStatus: item.budgetUsage?.status,
      })),
    plans: state.village.development.architectPlans.map((item) => ({
      projectKey: item.projectKey,
      status: item.status,
      selectedAlternativeId: item.selectedAlternativeId,
    })),
    constructionSites: state.village.development.constructionSites.map(
      (item) => ({ key: item.key, architectPlanId: item.architectPlanId }),
    ),
    workOrders: state.village.development.workOrders
      .filter((item) => item.architectPlanId)
      .map((item) => ({
        priorityKey: item.priorityKey,
        status: item.status,
        architectPlanId: item.architectPlanId,
      })),
    lumber: state.village.stockpiles
      .filter((item) =>
        ["lumber_camp_logs", "lumber_yard_lumber"].includes(item.key),
      )
      .map((item) => ({
        key: item.key,
        quantity: item.quantity,
        capacity: item.capacity,
      })),
    specialistJobs: state.village.jobs
      .filter((item) => item.jobType === "build_specialist_facility")
      .map((item) => ({
        status: item.status,
        facilityKey: item.plan?.facilityKey,
      })),
    openJobs: state.village.jobs
      .filter((item) => !["completed", "cancelled"].includes(item.status))
      .map((item) => ({
        jobType: item.jobType,
        status: item.status,
        blockingReason: item.blockingReason,
        projectKey: item.plan?.projectKey,
        assignedActorId: item.assignedActorId,
        targetPosition: item.targetPosition,
        destination: item.destination,
        progress: item.progress,
      })),
  };
}

export function runFullTownProof({
  input = releaseInput(FULL_TOWN_PROOF_SEEDS[0], 0),
  maxQualificationTicks = 25000,
  dayTicks = 2400,
  dangerThreshold = 25,
  maximumBlockedStreak = 64,
  onProgress = null,
} = {}) {
  const startedAt = performance.now(),
    state = newRogueRun(input);
  let qualificationTicks = 0;
  while (
    qualificationTicks < maxQualificationTicks &&
    !fullTownObjectivesComplete(state)
  ) {
    advanceQualificationTick(state);
    qualificationTicks += 1;
    if (onProgress && qualificationTicks % 500 === 0)
      onProgress({
        stage: "qualification",
        tick: qualificationTicks,
        objectives: fullTownObjectiveEvidence(state),
        state,
      });
  }
  if (onProgress)
    onProgress({ stage: "survival_day", tick: state.tick, state });
  const survival = runNaturalTownDay(state, dayTicks, maximumBlockedStreak),
    report = {
      seed: input.seed,
      qualification: {
        passed: fullTownObjectivesComplete(state),
        ticks: qualificationTicks,
        mode: "accelerated_work_and_round_trip_travel",
        resourceInjection: false,
      },
      dayTicks,
      dangerThreshold,
      residentCount: state.village.npcStates.length,
      objectives: fullTownObjectiveEvidence(state),
      qualificationDiagnostics: qualificationDiagnostics(state),
      survival,
      storage: villageStorageAudit(state),
      strategy: strategyProof(state),
      resources: villageResourceVisibilityAudit(state),
      food: foodProvenanceAudit(state),
      saveLoad: saveLoadProof(state),
      finalAudit: villageSimulationAudit(state),
      stateHash: hash(serializeRogueState(state)),
      durationMs: performance.now() - startedAt,
    };
  report.failures = fullTownFailures(report, dangerThreshold);
  report.passed = report.qualification.passed && report.failures.length === 0;
  return report;
}

function fullTownRunSummary(proof) {
  return {
    seed: proof.seed,
    passed: proof.passed,
    failures: proof.failures,
    qualification: proof.qualification,
    residentCount: proof.residentCount,
    objectives: proof.objectives,
    minimumNeeds: proof.survival.minimumNeeds,
    sleeping: {
      invalidActorTicks: proof.survival.invalidSleepingActorTicks,
      unshelteredActorTicks: proof.survival.unshelteredSleepingActorTicks,
    },
    permanentBlocks: proof.survival.permanentBlocks,
    storage: proof.storage,
    strategy: proof.strategy,
    resourceVisibility: proof.resources,
    foodProvenancePassed: proof.food.passed,
    saveLoad: proof.saveLoad,
    stateHash: proof.stateHash,
    durationMs: proof.durationMs,
  };
}

export function runFiveTownProof({
  seeds = FULL_TOWN_PROOF_SEEDS,
  ...options
} = {}) {
  const startedAt = performance.now(),
    runs = seeds.map((seed, index) =>
      fullTownRunSummary(
        runFullTownProof({ ...options, input: releaseInput(seed, index) }),
      ),
    ),
    failures = [];
  if (runs.length !== 5 || new Set(seeds).size !== 5)
    failures.push("five_unique_runs_required");
  if (runs.some((run) => !run.passed)) failures.push("full_town_run_failed");
  return {
    passed: failures.length === 0,
    failures,
    seeds,
    runs,
    durationMs: performance.now() - startedAt,
  };
}

function releaseInput(seed, index) {
  return {
    ...CANONICAL_FOUNDING_PROOF_INPUT,
    requestId: `r7-${seed}`,
    runId: namedUuid(
      CANONICAL_FOUNDING_PROOF_INPUT.runId,
      `r7-release-run:${index}:${seed}`,
    ),
    seed,
  };
}

function saveLoadCaptureReasons(state, events) {
  const elements = state.village.jobs.flatMap(
      (job) => job.plan?.constructionWork?.elements ?? [],
    ),
    activeJobs = state.village.jobs.filter((job) =>
      ["reserved", "active"].includes(job.status),
    ),
    eventTypes = new Set(events.map((event) => event.type)),
    foodTransactionTypes = new Set(
      state.village.foodLedger?.transactions.map((entry) => entry.type) ?? [],
    );
  return {
    blueprint: elements.some((element) => element.status === "planned"),
    delivery: eventTypes.has("construction_material_delivered"),
    frame: elements.some((element) => element.status === "in_progress"),
    sleep: activeJobs.some((job) => job.jobType === "sleep"),
    harvest: foodTransactionTypes.has("crop_harvest"),
    meal: eventTypes.has("meal_consumed"),
  };
}

export function runSaveLoadMatrixProof({
  input = CANONICAL_FOUNDING_PROOF_INPUT,
  maxCaptureTicks = 50000,
  replayTicks = 120,
} = {}) {
  const state = newRogueRun(input),
    required = ["blueprint", "delivery", "frame", "sleep", "harvest", "meal"],
    captures = new Map(),
    capture = (label) => {
      if (!captures.has(label))
        captures.set(label, {
          tick: state.tick,
          state: structuredClone(state),
        });
    };
  const initialReasons = saveLoadCaptureReasons(state, []);
  for (const [label, present] of Object.entries(initialReasons))
    if (present) capture(label);
  for (
    let index = 0;
    index < maxCaptureTicks && captures.size < required.length;
    index += 1
  ) {
    const { events } = applyRogueTurn(state, { kind: "wait" }),
      reasons = saveLoadCaptureReasons(state, events);
    for (const [label, present] of Object.entries(reasons))
      if (present) capture(label);
  }
  const missing = required.filter((label) => !captures.has(label)),
    results = [];
  for (const label of required) {
    const captured = captures.get(label);
    if (!captured) continue;
    const direct = structuredClone(captured.state),
      restored = parseRogueState(
        structuredClone(serializeRogueState(captured.state)),
      );
    for (let tick = 0; tick < replayTicks; tick += 1) {
      applyRogueTurn(direct, { kind: "wait" });
      applyRogueTurn(restored, { kind: "wait" });
    }
    const directHash = hash(serializeRogueState(direct)),
      restoredHash = hash(serializeRogueState(restored)),
      directAudit = villageSimulationAudit(direct),
      restoredAudit = villageSimulationAudit(restored),
      provenance = foodProvenanceAudit(restored);
    results.push({
      state: label,
      tick: captured.tick,
      replayTicks,
      passed:
        directHash === restoredHash &&
        hash(directAudit) === hash(restoredAudit) &&
        provenance.passed,
      directHash,
      restoredHash,
      materialLedgerHash: hash(restoredAudit.materials),
      identityCount:
        restored.village.constructionPrimitives.length +
        restored.village.fixtures.length +
        restored.village.jobs.length,
      provenancePassed: provenance.passed,
    });
  }
  const failures = [
    ...missing.map((label) => `save_state_not_reached:${label}`),
    ...results
      .filter((result) => !result.passed)
      .map((result) => `save_replay_diverged:${result.state}`),
  ];
  return {
    passed: failures.length === 0,
    failures,
    maxCaptureTicks,
    replayTicks,
    results,
  };
}

export function runReleaseGateProof({
  seeds = RELEASE_PROOF_SEEDS,
  oneDayTicks = 2400,
  longRunDays = [3, 3, 5],
  dangerThreshold = 25,
  maximumHeapGrowthBytes = 512 * 1024 * 1024,
} = {}) {
  const startedAt = performance.now(),
    startingHeap = process.memoryUsage().heapUsed,
    oneDayRuns = [];
  for (const [index, seed] of seeds.entries()) {
    const runStartedAt = performance.now(),
      proof = runFoundingSurvivalProof({
        input: releaseInput(seed, index),
        dayTicks: oneDayTicks,
        dangerThreshold,
      });
    oneDayRuns.push({
      seed,
      passed: proof.passed && proof.resourceVisibility.passed,
      failures: proof.failures,
      ticks: proof.ticks,
      homeTick: proof.homeTick,
      minimumNeeds: proof.minimumNeeds,
      sleeping: proof.sleeping,
      meals: {
        starting: proof.meals.starting,
        produced: proof.meals.produced,
        consumed: proof.meals.consumed,
        ending: proof.meals.ending,
        balance: proof.meals.balance,
      },
      stateHash: proof.stateHash,
      resourceVisibility: proof.resourceVisibility,
      durationMs: performance.now() - runStartedAt,
    });
  }

  const longRuns = [];
  for (const [index, days] of longRunDays.entries()) {
    const seed = seeds[index % seeds.length],
      runStartedAt = performance.now(),
      proof = runDomesticFoodProof({
        input: releaseInput(seed, index),
        days,
        dayTicks: oneDayTicks,
        dangerThreshold,
      });
    longRuns.push({
      seed,
      days,
      passed:
        proof.passed &&
        proof.resourceVisibility.passed &&
        Object.keys(proof.survivalWarning).length === 0,
      failures: proof.failures,
      ticks: proof.ticks,
      measuredTicks: proof.measuredTicks,
      minimumNeeds: proof.minimumNeeds,
      meals: proof.meals,
      cropCoverage: proof.cropCoverage,
      provenancePassed: proof.provenance.passed,
      unexplainedTicks: proof.telemetry.actorTime.waitReasons.unexplained ?? 0,
      stateHash: proof.stateHash,
      resourceVisibility: proof.resourceVisibility,
      durationMs: performance.now() - runStartedAt,
    });
  }

  const saveLoad = runSaveLoadMatrixProof(),
    scheduler = runSchedulerTimingProof({ dayTicks: oneDayTicks }),
    endingHeap = process.memoryUsage().heapUsed,
    heapGrowthBytes = Math.max(0, endingHeap - startingHeap),
    failures = [];
  if (oneDayRuns.length !== 10 || new Set(seeds).size !== 10)
    failures.push("ten_unique_one_day_runs_required");
  if (oneDayRuns.some((run) => !run.passed))
    failures.push("one_day_seed_matrix_failed");
  if (longRuns.length < 3 || !longRuns.some((run) => run.days > 3))
    failures.push("repeated_long_runs_required");
  if (longRuns.some((run) => !run.passed || run.unexplainedTicks))
    failures.push("multi_day_survival_failed");
  if (!saveLoad.passed) failures.push("save_load_matrix_failed");
  if (!scheduler.passed) failures.push("scheduler_release_gate_failed");
  if (VILLAGE_POPULATION_GROWTH_ENABLED)
    failures.push("population_growth_must_remain_disabled");
  if (heapGrowthBytes > maximumHeapGrowthBytes)
    failures.push("allocation_budget_exceeded");
  return {
    passed: failures.length === 0,
    failures,
    configuration: {
      seeds,
      oneDayTicks,
      longRunDays,
      dangerThreshold,
      maximumHeapGrowthBytes,
    },
    oneDayRuns,
    longRuns,
    saveLoad,
    scheduler: {
      passed: scheduler.passed,
      failures: scheduler.failures,
      hashes: scheduler.hashes,
      permanentBlocks: scheduler.permanentBlocks,
      unexplainedTicks: scheduler.unexplainedTicks,
      performance: scheduler.performance,
    },
    populationGrowthEnabled: VILLAGE_POPULATION_GROWTH_ENABLED,
    liveTickDatabaseWork: 0,
    liveTickPersistence: {
      mode: "in_memory_engine",
      databaseWrites: 0,
    },
    performance: {
      durationMs: performance.now() - startedAt,
      heapGrowthBytes,
      endingHeapBytes: endingHeap,
    },
  };
}
