import { definitionId, newInstanceId } from "./identity.js";
import { key } from "./spatial.js";

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
  available: new Set(["reserved", "blocked", "cancelled"]),
  reserved: new Set([
    "active",
    "blocked",
    "suspended",
    "available",
    "cancelled",
  ]),
  active: new Set(["blocked", "suspended", "completed", "cancelled"]),
  blocked: new Set(["available", "active", "cancelled"]),
  suspended: new Set(["active", "available", "cancelled"]),
  completed: new Set(),
  cancelled: new Set(),
});

export function transitionJob(job, status, tick, reason = null) {
  if (!TRANSITIONS[job.status]?.has(status))
    throw new Error(`Illegal job transition: ${job.status} -> ${status}`);
  job.status = status;
  job.updatedAtTick = tick;
  job.blockingReason = status === "blocked" ? reason : null;
  if (TERMINAL_STATES.has(status)) job.completedAtTick = tick;
  return job;
}

function workStore(state, scope = "village") {
  if (scope === "village") return state.village;
  if (scope === "dungeon") return state.levels[state.depth - 1];
  throw new Error(`Unknown work scope: ${scope}`);
}

export function createJob(state, input) {
  const scope = input.scope ?? "village",
    store = workStore(state, scope),
    duplicate = store.jobs.find(
      (job) =>
        !TERMINAL_STATES.has(job.status) &&
        job.jobType === input.jobType &&
        job.targetId === input.targetId,
    );
  if (duplicate) return { job: duplicate, created: false };
  const job = {
    id: input.id ?? newInstanceId(),
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
    reason: input.reason ?? "world_condition",
    blockingReason: null,
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

export function reserveAll(state, job, claims) {
  const store = workStore(state, job.scope),
    active = store.reservations.filter(
      (reservation) => reservation.state === "held",
    ),
    occupied = new Set(active.map(reservationKey)),
    requested = claims.map((claim) => ({ ...claim, jobId: job.id }));
  if (requested.some((claim) => occupied.has(reservationKey(claim))))
    return { ok: false, reason: "resource_reserved" };
  const reservations = requested.map((claim) => ({
    id: newInstanceId(),
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

export function actorCanPerform(actor, job) {
  if (!["available", "working"].includes(actor.workState)) return false;
  const allowed = actor.workPermissions?.allowedJobTypes ?? [];
  if (!allowed.includes(job.jobType)) return false;
  const capabilities = new Set(actor.capabilityTags ?? []);
  return job.requiredCapabilities.every((tag) => capabilities.has(tag));
}

function assignmentTuple(actor, job, route) {
  return [
    -job.priority,
    actor.lastJobType === job.jobType ? -1 : 0,
    -(actor.skills?.observation ?? 0),
    actor.risk ?? 0,
    route.cost,
    actor.id,
  ];
}

function compareTuple(left, right) {
  for (let index = 0; index < left.length; index++) {
    if (left[index] < right[index]) return -1;
    if (left[index] > right[index]) return 1;
  }
  return 0;
}

export function chooseAssignment(job, actors, routeForActor) {
  return actors
    .filter((actor) => actorCanPerform(actor, job))
    .map((actor) => ({ actor, route: routeForActor(actor, job) }))
    .filter((candidate) => candidate.route.ok)
    .map((candidate) => ({
      ...candidate,
      tuple: assignmentTuple(candidate.actor, job, candidate.route),
    }))
    .sort((left, right) => compareTuple(left.tuple, right.tuple))[0];
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
  restoreJobTransfer(state, job);
  transitionJob(job, "cancelled", state.tick, reason);
  releaseJobReservations(state, job.id, reason, job.scope);
  job.assignedActorId = null;
  return true;
}

export function restoreJobTransfer(state, job) {
  const transfer = job.transfer;
  if (!transfer?.carriedQuantity) return 0;
  const source = state.village.stockpiles?.find(
    (stockpile) => stockpile.id === transfer.sourceStockpileId,
  );
  if (!source) return 0;
  source.quantity += transfer.carriedQuantity;
  const restored = transfer.carriedQuantity;
  transfer.carriedQuantity = 0;
  return restored;
}
