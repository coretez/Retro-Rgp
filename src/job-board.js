import { definitionId, namedUuid } from "./identity.js";
import { key } from "./spatial.js";
import { depositFood } from "./village-food.js";

export const JOB_STATES = Object.freeze([
  "available",
  "reserved",
  "active",
  "blocked",
  "suspended",
  "completed",
  "cancelled",
]);

const TERMINAL_STATES = new Set(["completed", "cancelled"]);
const TRANSITIONS = Object.freeze({
  available: new Set(["reserved", "blocked", "suspended", "cancelled"]),
  reserved: new Set([
    "active",
    "blocked",
    "suspended",
    "available",
    "cancelled",
  ]),
  active: new Set(["blocked", "suspended", "completed", "cancelled"]),
  blocked: new Set(["available", "active", "cancelled"]),
  suspended: new Set(["active", "available", "blocked", "cancelled"]),
  completed: new Set(),
  cancelled: new Set(),
});

export function transitionJob(job, status, tick, reason = null) {
  if (!TRANSITIONS[job.status]?.has(status))
    throw new Error(`Illegal job transition: ${job.status} -> ${status}`);
  job.status = status;
  job.updatedAtTick = tick;
  job.statusReason = reason;
  job.blockingReason = status === "blocked" ? reason : null;
  if (TERMINAL_STATES.has(status)) job.completedAtTick = tick;
  return job;
}

function workStore(state, scope = "village") {
  if (scope === "village") return state.village;
  if (scope === "dungeon") return state.levels[state.depth - 1];
  throw new Error(`Unknown work scope: ${scope}`);
}

function defaultJobId(state, scope, store, input) {
  const target =
      input.targetId ??
      `${input.targetPosition?.x ?? "none"},${input.targetPosition?.y ?? "none"}`,
    owner = input.plan?.ownerActorId ?? "world";
  return namedUuid(
    state.id,
    `job:${scope}:${input.jobType}:${target}:${owner}:${state.tick}:${store.jobs.length}`,
  );
}

// function-length-exempt: template -- canonical job construction
export function createJob(state, input) {
  const scope = input.scope ?? "village",
    store = workStore(state, scope),
    duplicate = store.jobs.find(
      (job) =>
        !TERMINAL_STATES.has(job.status) &&
        job.jobType === input.jobType &&
        job.targetId === input.targetId &&
        job.plan?.ownerActorId === input.plan?.ownerActorId &&
        job.plan?.parallelSlot === input.plan?.parallelSlot,
    );
  if (duplicate) return { job: duplicate, created: false };
  const job = {
    id: input.id ?? defaultJobId(state, scope, store, input),
    definitionId: definitionId("job", input.jobType),
    entityType: "job",
    scope,
    jobType: input.jobType,
    name: input.name,
    status: "available",
    priority: input.priority ?? 50,
    targetId: input.targetId,
    groupId: input.groupId ?? null,
    targetPosition: { ...input.targetPosition },
    sourceId: input.sourceId ?? null,
    sourcePosition: input.sourcePosition ? { ...input.sourcePosition } : null,
    destination: null,
    assignedActorId: null,
    requiredCapabilities: [...(input.requiredCapabilities ?? [])],
    progress: {
      completed: 0,
      total: input.progressTotal ?? 1,
      unit: input.progressUnit ?? "task",
    },
    plan: input.plan ? structuredClone(input.plan) : null,
    transfer: input.transfer ? structuredClone(input.transfer) : null,
    production: input.production ? structuredClone(input.production) : null,
    reason: input.reason ?? "world_condition",
    blockingReason: null,
    retryCount: 0,
    nextRetryAtTick: null,
    createdAtTick: state.tick,
    updatedAtTick: state.tick,
    completedAtTick: null,
  };
  store.jobs.push(job);
  return { job, created: true };
}

function reservationKey(reservation) {
  if (reservation.kind === "position")
    return `position:${reservation.locationKey}:${key(reservation.position)}`;
  return `${reservation.kind}:${reservation.targetId}`;
}

function reservationId(job, claim, revision) {
  return namedUuid(job.id, `reservation:${reservationKey(claim)}:${revision}`);
}

export function reserveAll(state, job, claims) {
  const store = workStore(state, job.scope),
    active = store.reservations.filter(
      (reservation) => reservation.state === "held",
    ),
    occupied = new Set(active.map(reservationKey)),
    requested = claims.map((claim) => ({ ...claim, jobId: job.id }));
  if (requested.some((claim) => occupied.has(reservationKey(claim))))
    return { ok: false, reason: "resource_reserved" };
  job.reservationRevision = (job.reservationRevision ?? 0) + 1;
  const reservations = requested.map((claim) => ({
    id: reservationId(job, claim, job.reservationRevision),
    definitionId: definitionId("reservation", claim.kind),
    entityType: "reservation",
    state: "held",
    createdAtTick: state.tick,
    ...claim,
  }));
  store.reservations.push(...reservations);
  return { ok: true, reservations };
}

export function releaseJobReservations(
  state,
  jobId,
  reason,
  scope = "village",
) {
  const store = workStore(state, scope);
  const released = [];
  for (const reservation of store.reservations) {
    if (reservation.jobId !== jobId || reservation.state !== "held") continue;
    reservation.state = "released";
    reservation.releasedAtTick = state.tick;
    reservation.releaseReason = reason;
    released.push(reservation);
  }
  return released;
}

export function actorCanPerform(actor, job, options = {}) {
  const eligibleStates = options.allowWorking
    ? ["available", "working"]
    : ["available"];
  if (!eligibleStates.includes(actor.workState)) return false;
  if (job.plan?.commissionSuspended || job.plan?.budgetBlocked) return false;
  const assignedCrew = job.plan?.allowedActorIds;
  if (assignedCrew?.length && !assignedCrew.includes(actor.id)) return false;
  const allowed = actor.workPermissions?.allowedJobTypes ?? [];
  if (!allowed.includes(job.jobType)) return false;
  const capabilities = new Set(actor.capabilityTags ?? []);
  return job.requiredCapabilities.every((tag) => capabilities.has(tag));
}

function assignmentTuple(
  actor,
  job,
  route,
  actorKey = (candidate) => candidate.id,
) {
  const preferredSkills = job.plan?.skills ?? [],
    skillRank = preferredSkills.reduce(
      (total, skill) => total + (actor.skills?.[skill] ?? 0),
      0,
    );
  return [
    -job.priority,
    -skillRank,
    actor.lastJobType === job.jobType ? -1 : 0,
    -(actor.skills?.observation ?? 0),
    actor.risk ?? 0,
    route.cost,
    actorKey(actor),
  ];
}

function actorPreferenceTuple(actor, job) {
  const preferredSkills = job.plan?.skills ?? [],
    workPriority = preferredSkills.reduce(
      (best, skill) => Math.min(best, actor.skillPriorities?.[skill] ?? 5),
      5,
    ),
    skillRank = preferredSkills.reduce(
      (total, skill) => total + (actor.skills?.[skill] ?? 0),
      0,
    );
  return [
    workPriority,
    -skillRank,
    actor.lastJobType === job.jobType ? -1 : 0,
    -(actor.skills?.observation ?? 0),
    actor.risk ?? 0,
  ];
}

function compareTuple(left, right) {
  for (let index = 0; index < left.length; index++) {
    if (left[index] < right[index]) return -1;
    if (left[index] > right[index]) return 1;
  }
  return 0;
}

export function chooseAssignment(
  job,
  actors,
  routeForActor,
  actorKey = (actor) => actor.id,
) {
  const ranked = actors
    .filter((actor) => actorCanPerform(actor, job))
    .map((actor) => ({ actor, preference: actorPreferenceTuple(actor, job) }))
    .sort(
      (left, right) =>
        compareTuple(left.preference, right.preference) ||
        String(actorKey(left.actor)).localeCompare(
          String(actorKey(right.actor)),
        ),
    );
  for (let index = 0; index < ranked.length;) {
    let end = index + 1;
    while (
      end < ranked.length &&
      compareTuple(ranked[index].preference, ranked[end].preference) === 0
    )
      end += 1;
    const choice = ranked
      .slice(index, end)
      .map(({ actor }) => ({ actor, route: routeForActor(actor, job) }))
      .filter((candidate) => candidate.route.ok)
      .map((candidate) => ({
        ...candidate,
        tuple: assignmentTuple(candidate.actor, job, candidate.route, actorKey),
      }))
      .sort((left, right) => compareTuple(left.tuple, right.tuple))[0];
    if (choice) return choice;
    index = end;
  }
  return undefined;
}

export function jobView(job, reservations, actors) {
  const actor = actors.find(
      (candidate) => candidate.id === job.assignedActorId,
    ),
    claims = reservations.filter(
      (reservation) =>
        reservation.jobId === job.id && reservation.state === "held",
    );
  return {
    ...job,
    assignedActorName: actor?.name ?? null,
    reservations: claims.map((claim) => ({ ...claim })),
  };
}

export function cancelJob(state, job, reason = "cancelled") {
  if (TERMINAL_STATES.has(job.status)) return false;
  const actorId = job.assignedActorId;
  restoreJobTransfer(state, job);
  transitionJob(job, "cancelled", state.tick, reason);
  releaseJobReservations(state, job.id, reason, job.scope);
  job.assignedActorId = null;
  const actor = [
    ...(state.village?.npcStates ?? []),
    ...(state.village?.companionStates ?? []),
  ].find((candidate) => candidate.id === actorId);
  if (actor) actor.workState = "available";
  return true;
}

// function-length-exempt: template -- legacy transfer-state migration
export function restoreJobTransfer(state, job) {
  const carried = [
    ...(job.transfer?.carriedQuantity
      ? [{ ...job.transfer, stockpileId: job.transfer.sourceStockpileId }]
      : []),
    ...(job.production?.inputs ?? []).filter(
      (input) => input.carriedQuantity > 0,
    ),
  ];
  let restored = 0;
  for (const item of carried) {
    const source = state.village.stockpiles?.find(
        (stockpile) => stockpile.id === item.stockpileId,
      ),
      foodCargoIndex = job.transfer
        ? -1
        : (job.plan?.foodInputCargo ?? []).findIndex(
            (cargo) => cargo.stockpileId === item.stockpileId,
          ),
      foodCargoEntry =
        foodCargoIndex >= 0 ? job.plan.foodInputCargo[foodCargoIndex] : null;
    const foodCargo = job.transfer
      ? job.plan?.foodCargo
      : foodCargoEntry?.portions;
    if (source && foodCargo?.length)
      depositFood(state, source.id, source.itemKind, foodCargo, {
        type: "food_transfer_restored",
        jobId: job.id,
      });
    if (source) source.quantity += item.carriedQuantity;
    restored += item.carriedQuantity;
    item.carriedQuantity = 0;
    if (job.transfer) job.transfer.carriedQuantity = 0;
    if (job.transfer && job.plan) job.plan.foodCargo = [];
    if (!job.transfer && foodCargoIndex >= 0)
      job.plan.foodInputCargo.splice(foodCargoIndex, 1);
    const actor = [
      ...(state.village.npcStates ?? []),
      ...(state.village.companionStates ?? []),
    ].find((candidate) => candidate.id === job.assignedActorId);
    if (actor) actor.carriedItem = null;
  }
  return restored;
}
