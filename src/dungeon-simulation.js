import { namedUuid } from "./identity.js";
import {
  chooseAssignment,
  createJob,
  releaseJobReservations,
  reserveAll,
  transitionJob,
} from "./job-board.js";

const TERMINAL = new Set(["completed", "cancelled"]);

const jobEvent = (state, type, job, actor, details = {}) => ({
  type,
  scope: "dungeon",
  tick: state.tick,
  jobId: job.id,
  jobType: job.jobType,
  jobName: job.name,
  status: job.status,
  actorId: actor?.id ?? job.assignedActorId,
  actorName: actor?.name ?? null,
  ...details,
});

function eligibleInvestigators(level, groupId) {
  return level.enemies.filter(
    (enemy) =>
      enemy.hp > 0 &&
      enemy.groupId === groupId &&
      enemy.workState !== "working",
  );
}

function soundGroups(level, event) {
  return [
    ...new Set(
      event.heardBy
        .map((id) => level.enemies.find((enemy) => enemy.id === id)?.groupId)
        .filter(Boolean),
    ),
  ].sort();
}

function postInvestigation(state, level, event, groupId, events) {
  if (
    level.jobs.some(
      (job) =>
        job.jobType === "investigate_noise" &&
        job.groupId === groupId &&
        !TERMINAL.has(job.status),
    )
  )
    return;
  const jobId = namedUuid(
      state.id,
      `dungeon:${level.id}:investigate:${groupId}:${event.position.x},${event.position.y}:${state.tick}`,
    ),
    { job, created } = createJob(state, {
      id: jobId,
      scope: "dungeon",
      jobType: "investigate_noise",
      name: "Investigate dungeon noise",
      priority: 60,
      groupId,
      targetId: namedUuid(jobId, "sound-source"),
      targetPosition: event.position,
      requiredCapabilities: ["investigate"],
      reason: event.cause,
      progressUnit: "investigation",
      plan: { template: "investigate_noise", step: "approach" },
    });
  if (created)
    events.push(jobEvent(state, "job_posted", job, null, { groupId }));
}

function postNoiseJobs(state, level, sourceEvents, events) {
  for (const event of sourceEvents.filter(
    (entry) => entry.type === "noise" && entry.heardBy?.length,
  ))
    for (const groupId of soundGroups(level, event))
      postInvestigation(state, level, event, groupId, events);
}

function assignInvestigation(state, level, job, context, events) {
  const candidates = eligibleInvestigators(level, job.groupId);
  const choice = chooseAssignment(job, candidates, (actor) =>
    context.route(actor, job.targetPosition, true),
  );
  if (!choice) {
    transitionJob(job, "blocked", state.tick, "no_eligible_actor");
    events.push(jobEvent(state, "job_blocked", job, null));
    return;
  }
  const claims = [
      { kind: "job", targetId: job.id },
      {
        kind: "position",
        locationKey: level.id,
        position: choice.route.destination,
      },
    ],
    reserved = reserveAll(state, job, claims);
  if (!reserved.ok) {
    transitionJob(job, "blocked", state.tick, reserved.reason);
    return;
  }
  job.assignedActorId = choice.actor.id;
  job.destination = { ...choice.route.destination };
  choice.actor.workState = "working";
  choice.actor.currentAction = "Preparing to investigate noise";
  transitionJob(job, "reserved", state.tick);
  events.push(jobEvent(state, "job_reserved", job, choice.actor));
}

function finishInvestigation(state, job, actor, events) {
  job.progress.completed = 1;
  transitionJob(job, "completed", state.tick);
  releaseJobReservations(state, job.id, "job_completed", "dungeon");
  actor.workState = "available";
  actor.currentAction = "Listening for danger";
  actor.lastJobType = job.jobType;
  events.push(jobEvent(state, "job_completed", job, actor));
}

function blockInvestigation(state, job, actor, reason, events) {
  transitionJob(job, "blocked", state.tick, reason);
  actor.currentAction = `Blocked: ${reason.replaceAll("_", " ")}`;
  events.push(jobEvent(state, "job_blocked", job, actor, { reason }));
}

function advanceInvestigation(state, job, actor, context, events) {
  if (!actor) {
    transitionJob(job, "blocked", state.tick, "actor_missing");
    releaseJobReservations(state, job.id, "actor_missing", "dungeon");
    return;
  }
  const route = context.route(actor, job.targetPosition, true);
  if (!route.ok)
    return blockInvestigation(state, job, actor, route.reason, events);
  if (route.path.length === 1)
    return finishInvestigation(state, job, actor, events);
  const next = route.path[1],
    door = context.objectAt(next);
  if (door?.kind === "door" && door.state !== "open") {
    if (door.state === "locked")
      return blockInvestigation(state, job, actor, "access_locked", events);
    context.executeInteraction(actor.id, door.id, "open", events);
    actor.currentAction = "Opening a door toward the noise";
    return;
  }
  const from = { x: actor.x, y: actor.y };
  Object.assign(actor, next);
  actor.currentAction = "Investigating noise";
  events.push(
    jobEvent(state, "job_progress", job, actor, {
      from,
      to: { ...next },
      destination: { ...route.destination },
    }),
  );
}

function resumeInvestigation(state, job, actor, context, events) {
  const route = context.route(actor, job.targetPosition, true);
  if (!route.ok) return;
  const next = route.path[1],
    door = next && context.objectAt(next);
  if (door?.kind === "door" && door.state === "locked") return;
  transitionJob(job, "active", state.tick);
  actor.currentAction = "Resuming noise investigation";
  events.push(jobEvent(state, "job_resumed", job, actor));
}

function processJobs(state, level, context, events) {
  const starting = new Map(level.jobs.map((job) => [job.id, job.status]));
  for (const job of [...level.jobs].sort((a, b) => a.id.localeCompare(b.id))) {
    if (TERMINAL.has(job.status)) continue;
    const actor = level.enemies.find(
        (enemy) => enemy.id === job.assignedActorId,
      ),
      status = starting.get(job.id);
    if (job.assignedActorId && (!actor || actor.hp <= 0)) {
      releaseJobReservations(state, job.id, "actor_unavailable", "dungeon");
      job.assignedActorId = null;
      if (job.status === "blocked") job.blockingReason = "actor_unavailable";
      else transitionJob(job, "blocked", state.tick, "actor_unavailable");
      events.push(
        jobEvent(state, "job_blocked", job, null, {
          reason: "actor_unavailable",
        }),
      );
      continue;
    }
    if (status === "available")
      assignInvestigation(state, level, job, context, events);
    if (status === "reserved") {
      transitionJob(job, "active", state.tick);
      actor.currentAction = "Investigating dungeon noise";
      events.push(jobEvent(state, "job_started", job, actor));
    }
    if (status === "active")
      advanceInvestigation(state, job, actor, context, events);
    if (status === "blocked" && actor)
      resumeInvestigation(state, job, actor, context, events);
    if (status === "blocked" && !actor) {
      transitionJob(job, "available", state.tick);
      events.push(jobEvent(state, "job_reopened", job, null));
    }
  }
  return new Set(
    level.jobs
      .filter((job) => job.assignedActorId && !TERMINAL.has(job.status))
      .map((job) => job.assignedActorId),
  );
}

export function advanceDungeonSimulation(state, intent, events, context) {
  const level = context.level;
  postNoiseJobs(state, level, [...events], events);
  return processJobs(state, level, context, events);
}
