import { key, weightedRoute } from "./spatial.js";
import { namedUuid } from "./identity.js";
import { WORLD_AFFORDANCES } from "./world-objects.js";
import {
  actorCanPerform,
  chooseAssignment,
  createJob,
  releaseJobReservations,
  reserveAll,
  restoreJobTransfer,
  transitionJob,
} from "./job-board.js";

const SMITHY_DELIVERY = Object.freeze({
  sourcePosition: { x: 38, y: 23 },
  targetPosition: { x: 11, y: 3 },
  accessPosition: { x: 8, y: 9 },
  itemKind: "smithy_supplies",
});

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

const GUARD_JOB_TYPES = new Set([
  "patrol_route",
  "investigate_crime",
  "respond_danger",
]);

const PERSON_NAMES = {
  watchman: "Friedel Koch",
  carter: "Bram Eder",
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

function guardPerceives(guard, position) {
  const distance =
      Math.abs(guard.position.x - position.x) +
      Math.abs(guard.position.y - position.y),
    radius = 30 + (guard.skills?.observation ?? 0);
  return distance <= radius;
}

export function reportVillageIncident(state, input, events) {
  const incident = {
      id: namedUuid(
        state.id,
        `incident:${input.kind}:${input.position.x},${input.position.y}:${state.tick}`,
      ),
      kind: input.kind,
      status: "reported",
      evidenceId: input.evidenceId,
      position: { ...input.position },
      offenderId: input.offenderId ?? null,
      createdAtTick: state.tick,
      jobId: null,
    },
    guard = state.village.npcStates.find((npc) => npc.personKey === "watchman");
  incident.perceivedBy = guardPerceives(guard, incident.position)
    ? guard.id
    : null;
  state.village.incidents.push(incident);
  events.push({ type: "incident_reported", incidentId: incident.id, ...input });
  if (!incident.perceivedBy) return incident;
  guard.objective = "protect_town";
  guard.currentAction = "Noticed damage to town property";
  guard.actionReason = "player_crime";
  guard.actionTarget = { ...incident.position };
  events.push({
    type: "guard_reacted",
    incidentId: incident.id,
    personId: guard.id,
    personName: PERSON_NAMES.watchman,
    wantedLevel: state.village.wantedLevel,
    position: { ...guard.position },
  });
  return incident;
}

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
  const actor = state.village.npcStates.find(
    (candidate) => candidate.id === job.assignedActorId,
  );
  return {
    type,
    scope: "village",
    tick: state.tick,
    jobId: job.id,
    jobType: job.jobType,
    jobName: job.name,
    status: job.status,
    actorId: job.assignedActorId,
    actorName: PERSON_NAMES[actor?.personKey] ?? null,
    ...details,
  };
}

function jobTargetPosition(job) {
  if (job.jobType === "deliver_goods" && job.plan?.step === "to_source")
    return job.sourcePosition;
  return job.targetPosition;
}

function routeForJob(state, actor, job, terrainAt) {
  if (job.jobType === "patrol_route") {
    const objective = patrolDestination(actor, VILLAGE_ROUTES.watchman);
    job.targetPosition = { ...objective.target };
    job.plan.nextRouteIndex = objective.nextIndex;
    return planVillageRoute(state, actor, objective.target, terrainAt, false);
  }
  if (
    ["investigate_crime", "respond_danger"].includes(job.jobType) &&
    ["warn_offender", "escort_offender"].includes(job.plan?.step)
  )
    return planVillageRoute(
      state,
      actor,
      state.village.heroPosition,
      terrainAt,
      true,
    );
  if (["investigate_crime", "respond_danger"].includes(job.jobType))
    return planVillageRoute(state, actor, job.targetPosition, terrainAt, false);
  return planVillageRoute(
    state,
    actor,
    jobTargetPosition(job),
    terrainAt,
    true,
  );
}

function jobClaims(job, destination) {
  const claims = [
    { kind: "job", targetId: job.id },
    {
      kind: "position",
      locationKey: "stonebridge",
      position: { ...destination },
    },
  ];
  if (job.jobType !== "patrol_route")
    claims.push({ kind: "object", targetId: job.targetId });
  if (job.sourceId) claims.push({ kind: "object", targetId: job.sourceId });
  if (job.transfer)
    claims.push({ kind: "item", targetId: job.transfer.sourceStockpileId });
  return claims;
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
  const action = {
    deliver_goods: "Walking to the stable supply cart",
    patrol_route: "Patrolling the market road",
    investigate_crime: "Walking to reported property damage",
    respond_danger: "Responding to immediate danger",
  }[job.jobType];
  actor.currentAction = action ?? job.name;
  actor.actionReason = job.reason;
  if (GUARD_JOB_TYPES.has(job.jobType)) actor.objective = "protect_town";
  events.push(jobEvent(state, "job_started", job));
}

function blockActiveJob(state, job, reason, events) {
  transitionJob(job, "blocked", state.tick, reason);
  const actor = state.village.npcStates.find(
    (candidate) => candidate.id === job.assignedActorId,
  );
  if (actor) {
    actor.currentAction = `Blocked: ${reason.replaceAll("_", " ")}`;
    actor.actionReason = "job_blocked";
  }
  events.push(jobEvent(state, "job_blocked", job, { reason }));
}

function completeJob(state, job, actor, events) {
  job.progress.completed = job.progress.total;
  transitionJob(job, "completed", state.tick);
  releaseJobReservations(state, job.id, "job_completed");
  actor.workState = "available";
  actor.lastJobType = job.jobType;
  actor.currentAction = "Available for work";
  actor.actionReason = "job_completed";
  events.push(jobEvent(state, "job_completed", job));
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
  completeJob(state, job, actor, events);
}

function stockpile(state, id) {
  return state.village.stockpiles.find((candidate) => candidate.id === id);
}

function loadDelivery(state, job, actor, events) {
  const source = stockpile(state, job.transfer.sourceStockpileId),
    quantity = job.transfer.quantity;
  if (!source || source.quantity < quantity)
    return blockActiveJob(state, job, "cargo_unavailable", events);
  if (job.transfer.carriedQuantity > 0) return;
  source.quantity -= quantity;
  job.transfer.carriedQuantity = quantity;
  job.plan.step = "to_destination";
  job.progress.completed = 1;
  job.destination = { ...job.targetPosition };
  actor.currentAction = "Carrying smithy supplies to the forge";
  actor.actionReason = "delivery_loaded";
  events.push(
    jobEvent(state, "cargo_loaded", job, {
      quantity,
      cargoName: job.transfer.cargoName,
      sourceRemaining: source.quantity,
    }),
  );
}

function unloadDelivery(state, job, actor, events) {
  const target = stockpile(state, job.transfer.targetStockpileId),
    quantity = job.transfer.carriedQuantity;
  if (!target) return blockActiveJob(state, job, "stockpile_missing", events);
  if (quantity < 1) return blockActiveJob(state, job, "cargo_missing", events);
  if (target.quantity + quantity > target.capacity)
    return blockActiveJob(state, job, "destination_full", events);
  target.quantity += quantity;
  job.transfer.carriedQuantity = 0;
  events.push(
    jobEvent(state, "cargo_delivered", job, {
      quantity,
      cargoName: job.transfer.cargoName,
      destinationQuantity: target.quantity,
    }),
  );
  completeJob(state, job, actor, events);
}

function deliveryDoor(state, job) {
  if (job.jobType !== "deliver_goods" || job.plan.step !== "to_destination")
    return null;
  return state.village.doors.find(
    (door) =>
      door.x === job.plan.accessPosition.x &&
      door.y === job.plan.accessPosition.y,
  );
}

function approachDeliveryDoor(state, job, actor, terrainAt, context, events) {
  const door = deliveryDoor(state, job);
  if (!door || door.state === "open") return false;
  const route = planVillageRoute(
    state,
    actor,
    job.plan.accessPosition,
    terrainAt,
    true,
  );
  if (!route.ok) return false;
  if (route.path.length > 1) {
    actor.position = { ...route.path[1] };
    job.destination = { ...route.destination };
    return true;
  }
  if (door.state === "locked") {
    blockActiveJob(state, job, "access_locked", events);
    return true;
  }
  context.executeInteraction(
    {
      actorId: actor.id,
      objectId: door.id,
      action: "open",
      ...job.plan.accessPosition,
    },
    events,
  );
  actor.currentAction = "Opened the smithy for delivery";
  return true;
}

function advancePatrol(state, job, actor, route, events) {
  const moved = route.path.length > 1;
  if (moved) actor.position = { ...route.path[1] };
  if (key(actor.position) === key(job.targetPosition)) {
    actor.routeIndex = job.plan.nextRouteIndex;
    job.progress.completed += 1;
  }
  job.destination = { ...route.destination };
  actor.objective = "protect_town";
  actor.currentAction = `Patrolling toward ${job.targetPosition.x}, ${job.targetPosition.y}`;
  actor.actionReason = job.reason;
  events.push(
    villageActorEvent(state, moved ? "npc_move" : "npc_wait", actor, {
      destination: { ...route.destination },
      routeCost: route.cost,
      ...(moved ? {} : { reason: "patrol_waypoint_reached" }),
    }),
  );
  events.push(
    jobEvent(state, moved ? "job_progress" : "job_wait", job, {
      destination: { ...route.destination },
      position: { ...actor.position },
      ...(moved ? {} : { reason: "patrol_waypoint_reached" }),
    }),
  );
}

function incidentForJob(state, job) {
  return state.village.incidents.find(
    (incident) => incident.id === job.plan?.incidentId,
  );
}

function inspectIncident(state, job, actor, incident, context, events) {
  context.executeInteraction(
    {
      actorId: actor.id,
      objectId: job.targetId,
      action: "examine",
      ...job.targetPosition,
    },
    events,
  );
  incident.status = "investigated";
  job.progress.completed = 1;
  job.plan.step =
    state.village.wantedLevel > 1 ? "escort_offender" : "warn_offender";
  actor.currentAction =
    job.plan.step === "escort_offender"
      ? "Moving to escort the repeat offender"
      : "Moving to warn the offender";
  actor.actionReason = "evidence_confirmed";
  events.push(
    jobEvent(state, "guard_investigated", job, { incidentId: incident.id }),
  );
}

function resolveIncident(state, job, actor, incident, events) {
  const escort = job.plan.step === "escort_offender";
  incident.status = "resolved";
  incident.resolvedAtTick = state.tick;
  state.village.wantedLevel = Math.max(0, state.village.wantedLevel - 1);
  events.push(
    jobEvent(state, escort ? "guard_escorted" : "guard_warned", job, {
      incidentId: incident.id,
      offenderId: incident.offenderId,
    }),
  );
  completeJob(state, job, actor, events);
}

function advanceGuardIncident(state, job, actor, route, context, events) {
  const incident = incidentForJob(state, job);
  if (!incident) return blockActiveJob(state, job, "incident_missing", events);
  if (route.path.length > 1) {
    actor.position = { ...route.path[1] };
    job.destination = { ...route.destination };
    events.push(
      jobEvent(state, "job_progress", job, {
        destination: { ...route.destination },
        position: { ...actor.position },
      }),
    );
    return;
  }
  if (job.plan.step === "inspect_evidence")
    return inspectIncident(state, job, actor, incident, context, events);
  resolveIncident(state, job, actor, incident, events);
}

function advanceActiveJob(state, job, terrainAt, context, events) {
  const actor = state.village.npcStates.find(
    (candidate) => candidate.id === job.assignedActorId,
  );
  if (!actor) return blockActiveJob(state, job, "actor_missing", events);
  const route = routeForJob(state, actor, job, terrainAt);
  if (!route.ok) {
    if (approachDeliveryDoor(state, job, actor, terrainAt, context, events))
      return;
    return blockActiveJob(state, job, route.reason, events);
  }
  if (job.jobType === "patrol_route")
    return advancePatrol(state, job, actor, route, events);
  if (["investigate_crime", "respond_danger"].includes(job.jobType))
    return advanceGuardIncident(state, job, actor, route, context, events);
  if (route.path.length === 1) {
    if (job.jobType !== "deliver_goods")
      return completeInspection(state, job, actor, context, events);
    if (job.plan.step === "to_source")
      return loadDelivery(state, job, actor, events);
    return unloadDelivery(state, job, actor, events);
  }
  actor.position = { ...route.path[1] };
  job.destination = { ...route.destination };
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
  const door = deliveryDoor(state, job),
    doorRoute =
      door && door.state !== "locked"
        ? planVillageRoute(
            state,
            actor,
            job.plan.accessPosition,
            terrainAt,
            true,
          )
        : null;
  if (!route.ok && !doorRoute?.ok) return;
  transitionJob(job, "active", state.tick);
  actor.currentAction =
    job.jobType === "deliver_goods" ? "Resuming the smithy delivery" : job.name;
  actor.actionReason = "job_resumed";
  events.push(jobEvent(state, "job_resumed", job));
}

function validateJobTarget(state, job, context, events) {
  if (["completed", "cancelled"].includes(job.status)) return true;
  if (job.jobType === "patrol_route") return true;
  const target = context.objectAt(job.targetPosition),
    source = job.sourcePosition ? context.objectAt(job.sourcePosition) : null,
    validTarget = target?.id === job.targetId,
    validSource = !job.sourceId || source?.id === job.sourceId;
  if (validTarget && validSource) return true;
  const missingReason = validSource ? "target_missing" : "source_missing",
    actor = state.village.npcStates.find(
      (candidate) => candidate.id === job.assignedActorId,
    );
  restoreJobTransfer(state, job);
  releaseJobReservations(state, job.id, missingReason);
  if (actor) actor.workState = "available";
  const incident = incidentForJob(state, job);
  if (incident) {
    incident.status = "invalidated";
    incident.resolvedAtTick = state.tick;
    job.assignedActorId = null;
    transitionJob(job, "cancelled", state.tick, missingReason);
    events.push(
      jobEvent(state, "job_cancelled", job, { reason: missingReason }),
    );
    return false;
  }
  job.assignedActorId = null;
  if (job.status !== "blocked")
    transitionJob(job, "blocked", state.tick, missingReason);
  else job.blockingReason = missingReason;
  events.push(jobEvent(state, "job_blocked", job, { reason: missingReason }));
  return false;
}

function jobOrder(left, right) {
  if (left.priority !== right.priority) return right.priority - left.priority;
  return left.id.localeCompare(right.id);
}

function deliveryStockpiles(state) {
  const source = state.village.stockpiles.find(
      (stockpile) =>
        stockpile.itemKind === SMITHY_DELIVERY.itemKind &&
        stockpile.containerKind === "cart",
    ),
    target = state.village.stockpiles.find(
      (stockpile) =>
        stockpile.itemKind === SMITHY_DELIVERY.itemKind &&
        stockpile.containerKind === "forge",
    );
  return { source, target };
}

function postSmithyDelivery(state, context, events) {
  const { source, target } = deliveryStockpiles(state);
  if (!source || !target || source.quantity < 1) return null;
  if (target.quantity >= target.threshold) return null;
  const sourceObject = context.objectAt(SMITHY_DELIVERY.sourcePosition),
    targetObject = context.objectAt(SMITHY_DELIVERY.targetPosition),
    quantity = Math.min(1, target.capacity - target.quantity);
  if (!sourceObject || !targetObject || quantity < 1) return null;
  const { job, created } = createJob(state, {
    id: namedUuid(
      state.id,
      `job:smithy-delivery:${state.village.jobs.filter((job) => job.jobType === "deliver_goods").length + 1}`,
    ),
    jobType: "deliver_goods",
    name: "Deliver smithy supplies",
    priority: 40,
    sourceId: sourceObject.id,
    sourcePosition: SMITHY_DELIVERY.sourcePosition,
    targetId: targetObject.id,
    targetPosition: SMITHY_DELIVERY.targetPosition,
    requiredCapabilities: ["haul"],
    reason: "smithy_stock_below_threshold",
    progressTotal: 2,
    progressUnit: "stage",
    plan: {
      template: "deliver_goods",
      step: "to_source",
      accessPosition: SMITHY_DELIVERY.accessPosition,
    },
    transfer: {
      itemKind: SMITHY_DELIVERY.itemKind,
      cargoName: source.name,
      quantity,
      carriedQuantity: 0,
      sourceStockpileId: source.id,
      targetStockpileId: target.id,
    },
  });
  if (created) events.push(jobEvent(state, "job_posted", job));
  return job;
}

function guardActor(state) {
  return state.village.npcStates.find((npc) => npc.personKey === "watchman");
}

function postGuardIncidentJobs(state, events) {
  const incidents = state.village.incidents.filter(
    (incident) =>
      incident.perceivedBy && incident.status === "reported" && !incident.jobId,
  );
  for (const incident of incidents) {
    const danger = incident.kind === "danger",
      { job, created } = createJob(state, {
        jobType: danger ? "respond_danger" : "investigate_crime",
        name: danger ? "Respond to danger" : "Investigate property damage",
        priority: danger ? 100 : 90,
        targetId: incident.evidenceId,
        targetPosition: incident.position,
        requiredCapabilities: [danger ? "respond" : "investigate"],
        reason: danger ? "danger_reported" : "property_damage_reported",
        progressTotal: 2,
        progressUnit: "stage",
        plan: {
          template: danger ? "respond_danger" : "investigate_crime",
          step: "inspect_evidence",
          incidentId: incident.id,
          offenderId: incident.offenderId,
        },
      });
    incident.jobId = job.id;
    if (created)
      events.push(
        jobEvent(state, "job_posted", job, { incidentId: incident.id }),
      );
  }
}

function activeGuardIncident(state) {
  return state.village.jobs.some(
    (job) =>
      ["investigate_crime", "respond_danger"].includes(job.jobType) &&
      !["completed", "cancelled"].includes(job.status),
  );
}

function postGuardPatrol(state, events) {
  if (activeGuardIncident(state)) return null;
  const guard = guardActor(state);
  if (
    guard.actionReason === "player_crime" &&
    guard.actionTarget &&
    state.village.incidents.length === 0
  )
    return null;
  const targetId = namedUuid(state.id, "guard-patrol:stonebridge"),
    { job, created } = createJob(state, {
      jobType: "patrol_route",
      name: "Patrol Stonebridge",
      priority: 20,
      targetId,
      targetPosition: guard.position,
      requiredCapabilities: ["patrol"],
      reason: "routine_town_watch",
      progressTotal: VILLAGE_ROUTES.watchman.length,
      progressUnit: "waypoint",
      plan: { template: "patrol_route", step: "patrol", nextRouteIndex: 1 },
    });
  if (created) events.push(jobEvent(state, "job_posted", job));
  return job;
}

function currentGuardJob(state, guardId) {
  return state.village.jobs.find(
    (job) =>
      job.assignedActorId === guardId &&
      ["reserved", "active"].includes(job.status),
  );
}

function suspendJob(state, job, actor, incoming, events) {
  transitionJob(job, "suspended", state.tick, "higher_priority_work");
  releaseJobReservations(state, job.id, "higher_priority_work");
  actor.workState = "available";
  actor.currentAction = `Interrupting ${job.name.toLowerCase()}`;
  actor.actionReason = incoming.reason;
  events.push(
    jobEvent(state, "job_suspended", job, {
      reason: "higher_priority_work",
      interruptedByJobId: incoming.id,
    }),
  );
}

function preemptGuardWork(state, events) {
  const guard = guardActor(state),
    current = currentGuardJob(state, guard.id),
    incoming = [...state.village.jobs]
      .filter(
        (job) =>
          job.status === "available" &&
          GUARD_JOB_TYPES.has(job.jobType) &&
          actorCanPerform(guard, job),
      )
      .sort(jobOrder)[0];
  if (!current || !incoming || incoming.priority <= current.priority) return;
  suspendJob(state, current, guard, incoming, events);
}

function resumeSuspendedJob(state, job, terrainAt, events) {
  const actor = state.village.npcStates.find(
    (candidate) => candidate.id === job.assignedActorId,
  );
  if (!actor || actor.workState !== "available") return;
  const route = routeForJob(state, actor, job, terrainAt);
  if (!route.ok) return;
  const reserved = reserveAll(state, job, jobClaims(job, route.destination));
  if (!reserved.ok) return;
  transitionJob(job, "active", state.tick);
  actor.workState = "working";
  actor.currentAction = `Resuming ${job.name.toLowerCase()}`;
  actor.actionReason = "job_resumed";
  events.push(jobEvent(state, "job_resumed", job));
}

function advanceVillageJobs(state, terrainAt, context, events) {
  preemptGuardWork(state, events);
  const startingStates = new Map(
    state.village.jobs.map((job) => [job.id, job.status]),
  );
  for (const job of [...state.village.jobs].sort(jobOrder)) {
    if (!validateJobTarget(state, job, context, events)) continue;
    const status = startingStates.get(job.id);
    if (status === "available") assignJob(state, job, terrainAt, events);
    if (status === "reserved") activateJob(state, job, events);
    if (status === "suspended")
      resumeSuspendedJob(state, job, terrainAt, events);
    if (
      status === "available" &&
      job.jobType === "patrol_route" &&
      job.status === "reserved"
    ) {
      activateJob(state, job, events);
      advanceActiveJob(state, job, terrainAt, context, events);
    }
    if (status === "active")
      advanceActiveJob(state, job, terrainAt, context, events);
    if (status === "blocked") retryBlockedJob(state, job, terrainAt, events);
  }
  return new Set(
    state.village.jobs
      .filter(
        (job) =>
          job.assignedActorId && ["reserved", "active"].includes(job.status),
      )
      .map((job) => job.assignedActorId),
  );
}

export function advanceVillageSimulation(state, intent, events, context = {}) {
  if (!villageIntentAdvancesSimulation(intent)) return false;
  const terrainAt = context.terrainAt;
  if (!terrainAt) throw new Error("Village navigation requires terrainAt.");
  if (!context.objectAt || !context.executeInteraction)
    throw new Error("Village simulation requires object interaction context.");
  postSmithyDelivery(state, context, events);
  postGuardIncidentJobs(state, events);
  postGuardPatrol(state, events);
  const workingActors = state.village.jobs.length
    ? advanceVillageJobs(state, terrainAt, context, events)
    : new Set();
  for (const npc of state.village.npcStates) {
    if (workingActors.has(npc.id)) continue;
    advanceVillageNpc(state, npc, terrainAt, events);
  }
  return true;
}
