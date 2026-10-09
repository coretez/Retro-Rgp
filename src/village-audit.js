import { foodProvenanceAudit } from "./village-food.js";
import { villageMeaningAudit } from "./village-richness.js";

const add = (ledger, key, quantity) => {
  if (!key || !quantity) return;
  ledger[key] = (ledger[key] ?? 0) + quantity;
};

const jobById = (state, id) => state.village.jobs.find((job) => job.id === id);

function sortedLedger(ledger) {
  return Object.fromEntries(
    Object.entries(ledger).sort(([left], [right]) => left.localeCompare(right)),
  );
}

function residentLedger(state) {
  const active = new Map(
    state.village.jobs
      .filter((job) => ["reserved", "active"].includes(job.status))
      .map((job) => [job.assignedActorId, job]),
  );
  return state.village.npcStates.map((resident) => {
    const job = active.get(resident.id);
    return {
      id: resident.id,
      name: resident.name,
      status: job ? "working" : resident.workState,
      jobId: job?.id ?? null,
      jobType: job?.jobType ?? null,
      reason: resident.actionReason,
      waitReason: resident.waitReason ?? null,
      position: { ...resident.position },
      health: resident.hp ?? resident.life?.health ?? null,
      fatigue: resident.life?.needs?.fatigue ?? null,
      needs: { ...(resident.life?.needs ?? {}) },
      criticalNeeds: Object.entries(resident.life?.needs ?? {})
        .filter(([, value]) => value <= 25)
        .map(([need]) => need),
      housingStatus: resident.housingStatus,
    };
  });
}

function minimumNeeds(residents) {
  const result = {};
  for (const resident of residents)
    for (const [need, value] of Object.entries(resident.needs))
      result[need] = Math.min(result[need] ?? 100, value);
  return result;
}

// function-length-exempt: template -- survival audit projection
function survivalLedger(state, residents) {
  const completeResidences = (state.village.residences ?? []).filter(
      (residence) => residence.status === "complete",
    ),
    sleepingFixtures = (state.village.fixtures ?? []).filter(
      (fixture) => fixture.role === "bed",
    ),
    completeResidenceBuildingIds = new Set(
      completeResidences.map((residence) => residence.buildingId),
    ),
    sleepingAssignment = (resident) => {
      const actor = state.village.npcStates.find(
          (candidate) => candidate.id === resident.id,
        ),
        fixture = sleepingFixtures.find(
          (candidate) => candidate.id === actor?.sleepingLocation?.fixtureId,
        );
      return { actor, fixture };
    },
    stock = (key) =>
      state.village.stockpiles.find((item) => item.key === key)?.quantity ?? 0,
    storedFood = [
      "farm_grain",
      "farm_vegetables",
      "dairy_milk",
      "pasture_meat",
    ].reduce((total, key) => total + stock(key), 0);
  return {
    homelessResidents: residents.filter(
      (resident) => resident.housingStatus === "homeless",
    ).length,
    criticallyHungryResidents: residents.filter(
      (resident) => resident.needs.hunger <= 25,
    ).length,
    exhaustedResidents: residents.filter(
      (resident) => resident.needs.fatigue <= 25,
    ).length,
    unsafeResidents: residents.filter((resident) => resident.needs.safety <= 25)
      .length,
    minimumNeeds: minimumNeeds(residents),
    meals: stock("inn_meals"),
    storedFood,
    housingCapacity: completeResidences.reduce(
      (total, residence) => total + (residence.residentCapacity ?? 0),
      0,
    ),
    bedCapacity: completeResidences.reduce(
      (total, residence) => total + (residence.bedCapacity ?? 0),
      0,
    ),
    temporarySleepingCapacity: sleepingFixtures
      .filter((fixture) => fixture.temporary)
      .reduce((total, fixture) => total + (fixture.sleepingCapacity ?? 0), 0),
    assignedSleepingLocations: residents.filter(
      (resident) => sleepingAssignment(resident).fixture,
    ).length,
    validSleepingLocations: residents.filter((resident) => {
      const { actor, fixture } = sleepingAssignment(resident);
      return (
        fixture &&
        actor.sleepingLocation.position.x === fixture.x &&
        actor.sleepingLocation.position.y === fixture.y &&
        (fixture.sleepingCapacity ?? 0) > 0
      );
    }).length,
    shelteredSleepingLocations: residents.filter((resident) => {
      const { fixture } = sleepingAssignment(resident);
      return (
        fixture?.providesShelter === true ||
        completeResidenceBuildingIds.has(fixture?.buildingId)
      );
    }).length,
    completeHomes: completeResidences.length,
    facilities: [...state.village.facilities].sort(),
    activePriority: state.village.development?.activePriority ?? null,
    strategyAssessment: structuredClone(
      state.village.development?.strategyAssessment ?? null,
    ),
  };
}

function materialLedger(state) {
  const stored = {},
    loose = {},
    carried = {},
    delivered = {},
    construction = {};
  for (const item of state.village.stockpiles)
    add(stored, item.itemKind, item.quantity);
  for (const item of state.village.looseMaterials ?? [])
    add(loose, item.kind, item.quantity ?? 1);
  for (const job of state.village.jobs.filter(
    (item) => !["completed", "cancelled"].includes(item.status),
  )) {
    for (const input of job.production?.inputs ?? [])
      add(carried, input.itemKind, input.carriedQuantity);
    add(carried, job.transfer?.itemKind, job.transfer?.carriedQuantity);
    if (job.plan?.constructionDelivery)
      add(carried, job.plan.itemKind, job.plan.carriedQuantity);
  }
  for (const material of state.village.constructionMaterials ?? []) {
    const ledger = material.state === "consumed" ? construction : delivered;
    add(ledger, material.itemKind, material.quantity);
  }
  return { stored, loose, carried, delivered, construction };
}

function materialTotals(materials) {
  const totals = {};
  for (const ledger of Object.values(materials))
    for (const [kind, quantity] of Object.entries(ledger))
      add(totals, kind, quantity);
  return totals;
}

// function-length-exempt: template -- architecture audit projection
function architectureLedger(state) {
  const physicalIds = new Set([
      ...(state.village.constructionPrimitives ?? []).map((item) => item.id),
      ...(state.village.doors ?? []).map((item) => item.id),
      ...(state.village.fixtures ?? []).map((item) => item.id),
    ]),
    rooms = state.village.rooms ?? [],
    failures = [];
  for (const building of state.village.buildings.filter(
    (candidate) => candidate.primitiveBacked,
  ))
    if (
      !building.evidenceIds?.length ||
      building.evidenceIds.some((id) => !physicalIds.has(id))
    )
      failures.push(`building_without_evidence:${building.id}`);
  for (const room of rooms) {
    if (
      !state.village.buildings.some(
        (building) => building.id === room.buildingId,
      )
    )
      failures.push(`room_without_building:${room.id}`);
    if (!physicalIds.has(room.floorId) || !physicalIds.has(room.roofId))
      failures.push(`room_without_surface:${room.id}`);
  }
  for (const residence of state.village.residences ?? [])
    if (
      !rooms.some(
        (room) =>
          room.id === residence.roomId &&
          room.sheltered &&
          room.buildingId === residence.buildingId,
      )
    )
      failures.push(`residence_without_sheltered_room:${residence.id}`);
  for (const pasture of state.village.pastures ?? [])
    if (
      pasture.evidenceIds?.length &&
      pasture.evidenceIds.some((id) => !physicalIds.has(id))
    )
      failures.push(`pasture_without_evidence:${pasture.id}`);
  return {
    rooms: rooms.length,
    shelteredRooms: rooms.filter((room) => room.sheltered).length,
    residences: state.village.residences?.length ?? 0,
    pastures: state.village.pastures?.length ?? 0,
    failures,
    passed: failures.length === 0,
  };
}

// function-length-exempt: template -- complete simulation audit projection
export function villageSimulationAudit(state) {
  const residents = residentLedger(state),
    jobStatuses = {},
    blockedReasons = {};
  for (const job of state.village.jobs) {
    add(jobStatuses, job.status, 1);
    if (job.status === "blocked") add(blockedReasons, job.blockingReason, 1);
  }
  const materials = materialLedger(state);
  return {
    fingerprint: `${state.id}:${state.village.scenario}:v${state.schemaVersion}`,
    tick: state.tick,
    clock: { ...state.village.clock },
    residents,
    residentCount: residents.length,
    accountedResidentCount: residents.filter((resident) => resident.status)
      .length,
    survival: survivalLedger(state, residents),
    jobs: { statuses: jobStatuses, blockedReasons },
    materials,
    food: foodProvenanceAudit(state),
    meaning: villageMeaningAudit(state),
    materialTotals: materialTotals(materials),
    construction: {
      primitives: state.village.constructionPrimitives?.length ?? 0,
      fixtures: state.village.fixtures.length,
      doors: state.village.doors.length,
      buildings: state.village.buildings.length,
      architecture: architectureLedger(state),
      sites: (state.village.development?.constructionSites ?? []).map(
        (site) => ({
          key: site.key,
          x: site.x,
          y: site.y,
          w: site.w,
          h: site.h,
        }),
      ),
      siteDecisions: structuredClone(
        state.village.development?.siteDecisions ?? [],
      ),
    },
  };
}

export function diffVillageMaterialLedgers(before, after) {
  const result = {};
  for (const location of [
    "stored",
    "loose",
    "carried",
    "delivered",
    "construction",
  ]) {
    result[location] = {};
    const keys = new Set([
      ...Object.keys(before.materials[location]),
      ...Object.keys(after.materials[location]),
    ]);
    for (const key of [...keys].sort())
      result[location][key] =
        (after.materials[location][key] ?? 0) -
        (before.materials[location][key] ?? 0);
  }
  return result;
}

// function-length-exempt: template -- telemetry-state construction
export function createVillageRunTelemetry(state) {
  return {
    ticks: 0,
    actorTime: {
      purposefulTicks: 0,
      blockedTicks: 0,
      idleTicks: 0,
      workingTicks: 0,
      scheduledTicks: 0,
      waitingTicks: 0,
      underemploymentTicks: 0,
      contentionTicks: 0,
      totalActorTicks: 0,
      waitReasons: {},
      byActor: {},
    },
    production: {},
    consumption: {},
    events: {},
    jobs: {
      assignments: [],
      blocking: {},
      cancellations: {},
    },
    congestion: {
      requests: 0,
      yielded: 0,
      refused: 0,
      waits: 0,
      blocked: 0,
      refusalReasons: {},
      blockingReasons: {},
    },
    constructionOrder: [],
    consumedMaterialIds: (state.village.constructionMaterials ?? [])
      .filter((material) => material.state === "consumed")
      .map((material) => material.id)
      .sort(),
  };
}

function detailedActorTime(job, resident) {
  if (job?.plan?.lifeJob || resident.waitReason === "useful_rest")
    return "scheduledTicks";
  if (job && job.status !== "blocked") return "workingTicks";
  if (resident.waitReason === "contention") return "contentionTicks";
  if (["truthful_idle", "founding_standby"].includes(resident.waitReason))
    return "underemploymentTicks";
  return "waitingTicks";
}

function broadActorTime(job, resident) {
  if (job) return job.status === "blocked" ? "blockedTicks" : "purposefulTicks";
  return resident.waitReason === "purposeful_routine"
    ? "purposefulTicks"
    : "idleTicks";
}

function actorTimeRecord(store, resident) {
  return (store.byActor[resident.id] ??= {
    name: resident.name,
    purposefulTicks: 0,
    blockedTicks: 0,
    idleTicks: 0,
    workingTicks: 0,
    scheduledTicks: 0,
    waitingTicks: 0,
    underemploymentTicks: 0,
    contentionTicks: 0,
    waitReasons: {},
  });
}

function recordActorTime(telemetry, state) {
  const assignedJobs = new Map(
    state.village.jobs
      .filter(
        (job) =>
          job.assignedActorId &&
          ["reserved", "active", "blocked"].includes(job.status),
      )
      .map((job) => [job.assignedActorId, job]),
  );
  for (const resident of state.village.npcStates) {
    const job = assignedJobs.get(resident.id),
      classification = broadActorTime(job, resident),
      actor = actorTimeRecord(telemetry.actorTime, resident),
      detail = detailedActorTime(job, resident);
    actor[classification] += 1;
    actor[detail] += 1;
    telemetry.actorTime[classification] += 1;
    telemetry.actorTime[detail] += 1;
    telemetry.actorTime.totalActorTicks += 1;
    if (classification === "idleTicks") {
      const reason = resident.waitReason ?? "unexplained";
      add(actor.waitReasons, reason, 1);
      add(telemetry.actorTime.waitReasons, reason, 1);
    }
  }
}

function recordProductionConsumption(telemetry, state, event) {
  if (event.type === "production_completed")
    add(telemetry.production, event.itemKind, event.quantity);
  if (event.type === "meal_consumed")
    add(telemetry.consumption, event.itemKind, event.quantity);
  if (event.type !== "production_started") return;
  const job = jobById(state, event.jobId);
  if (!job?.production || job.plan?.construction) return;
  for (const input of job.production.inputs)
    if (input.consume !== false)
      add(telemetry.consumption, input.itemKind, input.quantity);
}

function recordJobTelemetry(telemetry, event) {
  if (event.type === "job_reserved")
    telemetry.jobs.assignments.push({
      tick: event.tick,
      jobId: event.jobId,
      jobType: event.jobType,
      actorId: event.actorId,
    });
  if (event.type === "job_blocked")
    add(telemetry.jobs.blocking, event.reason ?? "unspecified", 1);
  if (event.type === "job_cancelled")
    add(telemetry.jobs.cancellations, event.reason ?? "unspecified", 1);
  if (event.type === "construction_element_completed")
    telemetry.constructionOrder.push({
      tick: event.tick,
      jobId: event.jobId,
      elementKey: event.elementKey,
      workerId: event.workerId,
    });
}

function recordCongestion(telemetry, event) {
  if (event.type === "passage_requested") telemetry.congestion.requests += 1;
  if (event.type === "passage_yielded") telemetry.congestion.yielded += 1;
  if (event.type === "passage_refused") {
    telemetry.congestion.refused += 1;
    add(telemetry.congestion.refusalReasons, event.reason ?? "unspecified", 1);
  }
  if (event.type === "job_wait" && event.reason === "yielded_passage")
    telemetry.congestion.waits += 1;
  if (event.type === "npc_blocked") {
    telemetry.congestion.blocked += 1;
    add(telemetry.congestion.blockingReasons, event.reason, 1);
  }
}

function recordConsumedConstructionMaterials(telemetry, state) {
  const known = new Set(telemetry.consumedMaterialIds);
  for (const material of state.village.constructionMaterials ?? []) {
    if (material.state !== "consumed" || known.has(material.id)) continue;
    telemetry.consumedMaterialIds.push(material.id);
    known.add(material.id);
    add(telemetry.consumption, material.itemKind, material.quantity);
  }
  telemetry.consumedMaterialIds.sort();
}

export function recordVillageRunTelemetry(telemetry, state, events) {
  telemetry.ticks += 1;
  recordActorTime(telemetry, state);
  for (const event of events) {
    add(telemetry.events, event.type, 1);
    recordProductionConsumption(telemetry, state, event);
    recordJobTelemetry(telemetry, event);
    recordCongestion(telemetry, event);
  }
  recordConsumedConstructionMaterials(telemetry, state);
  return telemetry;
}

export function villageRunTelemetryReport(telemetry) {
  const { actorTime } = telemetry,
    total = actorTime.totalActorTicks || 1;
  return {
    ticks: telemetry.ticks,
    actorTime: {
      ...structuredClone(actorTime),
      purposefulPercent: (actorTime.purposefulTicks / total) * 100,
      blockedPercent: (actorTime.blockedTicks / total) * 100,
      idlePercent: (actorTime.idleTicks / total) * 100,
    },
    production: sortedLedger(telemetry.production),
    consumption: sortedLedger(telemetry.consumption),
    events: sortedLedger(telemetry.events),
    jobs: {
      assignments: structuredClone(telemetry.jobs.assignments),
      blocking: sortedLedger(telemetry.jobs.blocking),
      cancellations: sortedLedger(telemetry.jobs.cancellations),
    },
    congestion: {
      ...structuredClone(telemetry.congestion),
      refusalReasons: sortedLedger(telemetry.congestion.refusalReasons),
      blockingReasons: sortedLedger(telemetry.congestion.blockingReasons),
    },
    constructionOrder: structuredClone(telemetry.constructionOrder),
  };
}

export function evaluateVillageAudit(
  audit,
  { dangerThreshold = 25, requiredFacilities = [] } = {},
) {
  const failures = [],
    sleepingCapacity =
      audit.survival.bedCapacity + audit.survival.temporarySleepingCapacity;
  if (audit.residentCount < 1)
    failures.push({ code: "residents_missing", actual: audit.residentCount });
  if (audit.accountedResidentCount !== audit.residentCount)
    failures.push({
      code: "residents_unaccounted",
      expected: audit.residentCount,
      actual: audit.accountedResidentCount,
    });
  for (const [need, value] of Object.entries(audit.survival.minimumNeeds))
    if (value <= dangerThreshold)
      failures.push({
        code: "survival_need_critical",
        need,
        threshold: dangerThreshold,
        actual: value,
      });
  if (sleepingCapacity < audit.residentCount)
    failures.push({
      code: "sleeping_capacity_missing",
      expected: audit.residentCount,
      actual: sleepingCapacity,
    });
  if (audit.survival.assignedSleepingLocations < audit.residentCount)
    failures.push({
      code: "sleeping_assignments_missing",
      expected: audit.residentCount,
      actual: audit.survival.assignedSleepingLocations,
    });
  if (audit.survival.validSleepingLocations < audit.residentCount)
    failures.push({
      code: "sleeping_locations_invalid",
      expected: audit.residentCount,
      actual: audit.survival.validSleepingLocations,
    });
  if (audit.survival.shelteredSleepingLocations < audit.residentCount)
    failures.push({
      code: "sleeping_locations_unsheltered",
      expected: audit.residentCount,
      actual: audit.survival.shelteredSleepingLocations,
    });
  for (const [location, ledger] of Object.entries(audit.materials))
    for (const [itemKind, quantity] of Object.entries(ledger))
      if (quantity < 0)
        failures.push({
          code: "negative_material_stock",
          location,
          itemKind,
          actual: quantity,
        });
  for (const facility of requiredFacilities)
    if (!audit.survival.facilities.includes(facility))
      failures.push({ code: "facility_missing", facility });
  return { passed: failures.length === 0, failures };
}
