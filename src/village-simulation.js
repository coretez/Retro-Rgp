import { key, weightedRoute } from "./spatial.js";
import { WORLD_AFFORDANCES } from "./world-objects.js";
import {
  chooseAssignment,
  releaseJobReservations,
  reserveAll,
  transitionJob,
} from "./job-board.js";

const ADVANCING_INTENTS = new Set([
  "local_move",
  "local_manipulate",
  "shop_buy",
  "equip",
]);

const VILLAGE_ROUTES = {
  watchman: [
    [20, 9],
    [20, 10],
    [20, 11],
    [24, 11],
    [20, 11],
    [20, 10],
  ],
  child: [
    [15, 15],
    [16, 15],
    [17, 15],
    [18, 15],
    [19, 15],
    [19, 14],
  ],
  porter: [
    [19, 14],
    [19, 13],
    [19, 12],
    [19, 11],
    [20, 11],
    [21, 11],
  ],
};

const BLOCKED_TILES = new Set([
  "outdoor_tree",
  "village_sign",
  "village_building",
  "village_furniture",
  "village_door_closed",
  "village_door_locked",
  "village_pit",
]);

const TERRAIN_COSTS = {
  road_stone: 1,
  road_dirt: 2,
  village_door_open: 2,
  village_floor: 2,
  village_rubble: 3,
  outdoor_stump: 3,
  outdoor_grass: 4,
};

export function villageIntentAdvancesSimulation(intent) {
  const kind = typeof intent === "string" ? intent : intent.kind;
  if (kind === "world_interact")
    return (WORLD_AFFORDANCES[intent.action]?.duration ?? 0) > 0;
  return ADVANCING_INTENTS.has(kind);
}

export const villageMovementCost = (tile) =>
  BLOCKED_TILES.has(tile) ? null : (TERRAIN_COSTS[tile] ?? 3);

function villageActorEvent(state, type, npc, details = {}) {
  return {
    type,
    scope: "village",
    tick: state.tick,
    actorId: npc.id,
    objective: npc.objective,
    currentAction: npc.currentAction,
    position: { ...npc.position },
    ...details,
  };
}

function occupiedVillageCells(state, actorId) {
  return new Set(
    [
      state.village.heroPosition,
      ...state.village.companionPositions,
      ...state.village.npcStates
        .filter((npc) => npc.id !== actorId)
        .map((npc) => npc.position),
    ].map(key),
  );
}

export function planVillageRoute(state, npc, target, terrainAt, adjacent) {
  return weightedRoute({
    from: npc.position,
    to: target,
    maxVisited: 8192,
    occupied: occupiedVillageCells(state, npc.id),
    adjacent,
    isBlocked: (position) => villageMovementCost(terrainAt(position)) == null,
    terrainCost: (position) => villageMovementCost(terrainAt(position)),
  });
}

function patrolDestination(npc, route) {
  const nextIndex = (npc.routeIndex + 1) % route.length,
    [x, y] = route[nextIndex];
  return { nextIndex, target: { x, y } };
}

function npcObjective(npc) {
  if (npc.actionReason === "player_crime" && npc.actionTarget)
    return { target: npc.actionTarget, adjacent: true };
  const route = VILLAGE_ROUTES[npc.personKey];
  if (!route) return null;
  return { ...patrolDestination(npc, route), adjacent: false };
}

function applyNpcNavigation(state, npc, objective, terrainAt, events) {
  const result = planVillageRoute(
    state,
    npc,
    objective.target,
    terrainAt,
    objective.adjacent,
  );
  if (!result.ok) {
    events.push(
      villageActorEvent(state, "npc_blocked", npc, {
        reason: result.reason,
        destination: { ...objective.target },
      }),
    );
    return;
  }
  const moved = result.path.length > 1;
  if (moved) npc.position = { ...result.path[1] };
  if (
    objective.nextIndex != null &&
    key(npc.position) === key(objective.target)
  )
    npc.routeIndex = objective.nextIndex;
  events.push(
    villageActorEvent(state, moved ? "npc_move" : "npc_wait", npc, {
      destination: { ...result.destination },
      routeCost: result.cost,
      ...(moved ? {} : { reason: "destination_reached" }),
    }),
  );
}

function advanceVillageNpc(state, npc, terrainAt, events) {
  const objective = npcObjective(npc);
  if (objective) applyNpcNavigation(state, npc, objective, terrainAt, events);
}

function jobEvent(state, type, job, details = {}) {
  return {
    type,
    scope: "village",
    tick: state.tick,
    jobId: job.id,
    jobType: job.jobType,
    status: job.status,
    actorId: job.assignedActorId,
    ...details,
  };
}

function routeForJob(state, actor, job, terrainAt) {
  return planVillageRoute(state, actor, job.targetPosition, terrainAt, true);
}

function jobClaims(job, destination) {
  return [
    { kind: "job", targetId: job.id },
    { kind: "object", targetId: job.targetId },
    {
      kind: "position",
      locationKey: "stonebridge",
      position: { ...destination },
    },
  ];
}

function assignJob(state, job, terrainAt, events) {
  const choice = chooseAssignment(job, state.village.npcStates, (actor) =>
    routeForJob(state, actor, job, terrainAt),
  );
  if (!choice) {
    transitionJob(job, "blocked", state.tick, "no_eligible_actor");
    events.push(jobEvent(state, "job_blocked", job));
    return;
  }
  const reserved = reserveAll(
    state,
    job,
    jobClaims(job, choice.route.destination),
  );
  if (!reserved.ok) {
    transitionJob(job, "blocked", state.tick, reserved.reason);
    events.push(jobEvent(state, "job_blocked", job));
    return;
  }
  job.assignedActorId = choice.actor.id;
  job.destination = { ...choice.route.destination };
  choice.actor.workState = "working";
  transitionJob(job, "reserved", state.tick);
  events.push(jobEvent(state, "job_reserved", job));
}

function activateJob(state, job, events) {
  transitionJob(job, "active", state.tick);
  const actor = state.village.npcStates.find(
    (candidate) => candidate.id === job.assignedActorId,
  );
  actor.currentAction = job.name;
  actor.actionReason = "assigned_job";
  events.push(jobEvent(state, "job_started", job));
}

function blockActiveJob(state, job, reason, events) {
  transitionJob(job, "blocked", state.tick, reason);
  events.push(jobEvent(state, "job_blocked", job, { reason }));
}

function completeInspection(state, job, actor, context, events) {
  context.executeInteraction(
    {
      actorId: actor.id,
      objectId: job.targetId,
      action: "examine",
      ...job.targetPosition,
    },
    events,
  );
  job.progress.completed = job.progress.total;
  transitionJob(job, "completed", state.tick);
  releaseJobReservations(state, job.id, "job_completed");
  actor.workState = "available";
  actor.lastJobType = job.jobType;
  actor.currentAction = "Available for work";
  actor.actionReason = "job_completed";
  events.push(jobEvent(state, "job_completed", job));
}

function advanceActiveJob(state, job, terrainAt, context, events) {
  const actor = state.village.npcStates.find(
      (candidate) => candidate.id === job.assignedActorId,
    ),
    route = actor && routeForJob(state, actor, job, terrainAt);
  if (!actor || !route?.ok)
    return blockActiveJob(state, job, route?.reason ?? "actor_missing", events);
  if (route.path.length === 1)
    return completeInspection(state, job, actor, context, events);
  actor.position = { ...route.path[1] };
  events.push(
    jobEvent(state, "job_progress", job, {
      destination: { ...route.destination },
      position: { ...actor.position },
    }),
  );
}

function retryBlockedJob(state, job, terrainAt, events) {
  const actor = state.village.npcStates.find(
    (candidate) => candidate.id === job.assignedActorId,
  );
  if (!actor) {
    transitionJob(job, "available", state.tick);
    events.push(jobEvent(state, "job_reopened", job));
    return;
  }
  const route = routeForJob(state, actor, job, terrainAt);
  if (!route.ok) return;
  transitionJob(job, "active", state.tick);
  events.push(jobEvent(state, "job_resumed", job));
}

function validateJobTarget(state, job, context, events) {
  if (["completed", "cancelled"].includes(job.status)) return true;
  const object = context.objectAt(job.targetPosition);
  if (object?.id === job.targetId) return true;
  const actor = state.village.npcStates.find(
    (candidate) => candidate.id === job.assignedActorId,
  );
  releaseJobReservations(state, job.id, "target_missing");
  if (actor) actor.workState = "available";
  job.assignedActorId = null;
  if (job.status !== "blocked")
    transitionJob(job, "blocked", state.tick, "target_missing");
  else job.blockingReason = "target_missing";
  events.push(
    jobEvent(state, "job_blocked", job, { reason: "target_missing" }),
  );
  return false;
}

function jobOrder(left, right) {
  if (left.priority !== right.priority) return right.priority - left.priority;
  return left.id.localeCompare(right.id);
}

function advanceVillageJobs(state, terrainAt, context, events) {
  const startingStates = new Map(
    state.village.jobs.map((job) => [job.id, job.status]),
  );
  for (const job of [...state.village.jobs].sort(jobOrder)) {
    if (!validateJobTarget(state, job, context, events)) continue;
    const status = startingStates.get(job.id);
    if (status === "available") assignJob(state, job, terrainAt, events);
    if (status === "reserved") activateJob(state, job, events);
    if (status === "active")
      advanceActiveJob(state, job, terrainAt, context, events);
    if (status === "blocked") retryBlockedJob(state, job, terrainAt, events);
  }
  return new Set(
    state.village.jobs
      .filter(
        (job) =>
          job.assignedActorId &&
          !["completed", "cancelled"].includes(job.status),
      )
      .map((job) => job.assignedActorId),
  );
}

export function advanceVillageSimulation(state, intent, events, context = {}) {
  if (!villageIntentAdvancesSimulation(intent)) return false;
  const terrainAt = context.terrainAt;
  if (!terrainAt) throw new Error("Village navigation requires terrainAt.");
  if (
    state.village.jobs.length > 0 &&
    (!context.objectAt || !context.executeInteraction)
  )
    throw new Error("Village jobs require object interaction context.");
  const workingActors = state.village.jobs.length
    ? advanceVillageJobs(state, terrainAt, context, events)
    : new Set();
  for (const npc of state.village.npcStates) {
    if (workingActors.has(npc.id)) continue;
    advanceVillageNpc(state, npc, terrainAt, events);
  }
  return true;
}
