import test from "node:test";
import assert from "node:assert/strict";
import {
  applyRogueTurn,
  newRogueRun,
  parseRogueState,
  rogueRunView,
  serializeRogueState,
  villageWorldObjectAt,
} from "../src/rogue-engine.js";
import {
  actorCanPerform,
  cancelJob,
  chooseAssignment,
  createJob,
  releaseJobReservations,
  reserveAll,
  transitionJob,
} from "../src/job-board.js";
import { isUuid } from "../src/identity.js";

const input = {
  requestId: "job-board",
  seed: "job-board",
  heroName: "Mara",
  form: "hybrid",
  size: "small",
};

function villageState() {
  const state = newRogueRun(input);
  state.location = "village";
  state.village.heroPosition = { x: 37, y: 23 };
  return state;
}

function stocktakeJob(state) {
  const cart = villageWorldObjectAt(state, 38, 23);
  return createJob(state, {
    jobType: "inspect_object",
    name: "Stocktake stable supply cart",
    targetId: cart.id,
    targetPosition: cart.position,
    requiredCapabilities: ["inspect"],
    reason: "test",
    progressUnit: "inspection",
  }).job;
}

test("M-4 lifecycle permits suspension but rejects illegal transitions", () => {
  const state = villageState(),
    job = stocktakeJob(state);
  transitionJob(job, "reserved", 1);
  transitionJob(job, "active", 2);
  transitionJob(job, "suspended", 3, "higher_priority_work");
  transitionJob(job, "active", 4);
  transitionJob(job, "completed", 5);
  assert.equal(job.completedAtTick, 5);
  assert.throws(() => transitionJob(job, "available", 6), /Illegal/);
});

test("M-4 suspended work can block when its world target disappears", () => {
  const state = villageState(),
    job = stocktakeJob(state);
  transitionJob(job, "reserved", 1);
  transitionJob(job, "suspended", 2, "higher_priority_work");
  transitionJob(job, "blocked", 3, "target_missing");
  assert.equal(job.status, "blocked");
  assert.equal(job.blockingReason, "target_missing");
});

test("M-4 reservations are atomic, exclusive, and released together", () => {
  const state = villageState(),
    first = stocktakeJob(state),
    second = createJob(state, {
      jobType: "inspect_object",
      name: "Competing inspection",
      targetId: "4b563e06-b963-4d9c-b899-797ab5572aef",
      targetPosition: { x: 38, y: 23 },
      requiredCapabilities: ["inspect"],
    }).job,
    claims = [
      { kind: "object", targetId: first.targetId },
      {
        kind: "position",
        locationKey: "stonebridge",
        position: { x: 37, y: 23 },
      },
    ];
  assert.equal(reserveAll(state, first, claims).ok, true);
  assert.equal(reserveAll(state, second, claims).ok, false);
  assert.equal(
    state.village.reservations.filter((claim) => claim.jobId === second.id)
      .length,
    0,
  );
  assert.equal(releaseJobReservations(state, first.id, "test").length, 2);
  assert.equal(reserveAll(state, second, claims).ok, true);
});

test("M-4 capability and permission checks reject incompatible actors", () => {
  const state = villageState(),
    job = stocktakeJob(state),
    actor = state.village.npcStates[0];
  assert.equal(actorCanPerform(actor, job), true);
  actor.capabilityTags = [];
  assert.equal(actorCanPerform(actor, job), false);
  actor.capabilityTags = ["inspect"];
  actor.workPermissions.allowedJobTypes = [];
  assert.equal(actorCanPerform(actor, job), false);
});

test("V1 assignments enforce commission crews and council holds", () => {
  const state = villageState(),
    job = stocktakeJob(state),
    actor = state.village.npcStates[0];
  job.plan = {};
  job.plan.allowedActorIds = [actor.id];
  assert.equal(actorCanPerform(actor, job), true);
  job.plan.allowedActorIds = ["bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"];
  assert.equal(actorCanPerform(actor, job), false);
  job.plan.allowedActorIds = [actor.id];
  job.plan.commissionSuspended = true;
  assert.equal(actorCanPerform(actor, job), false);
  delete job.plan.commissionSuspended;
  job.plan.budgetBlocked = true;
  assert.equal(actorCanPerform(actor, job), false);
});

test("M-4 assignment ties resolve by actor UUID", () => {
  const job = {
      priority: 50,
      jobType: "inspect_object",
      requiredCapabilities: ["inspect"],
    },
    actor = (id) => ({
      id,
      workState: "available",
      capabilityTags: ["inspect"],
      workPermissions: { allowedJobTypes: ["inspect_object"] },
      skills: { observation: 1 },
      risk: 0,
    }),
    actors = [
      actor("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"),
      actor("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"),
    ],
    selected = chooseAssignment(job, actors, () => ({ ok: true, cost: 4 }));
  assert.equal(selected.actor.id, actors[1].id);
});

test("M-7.1 a working actor cannot accept a second job without preemption", () => {
  const job = {
      priority: 90,
      jobType: "inspect_object",
      requiredCapabilities: ["inspect"],
    },
    actor = {
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      workState: "working",
      capabilityTags: ["inspect"],
      workPermissions: { allowedJobTypes: ["inspect_object"] },
    };
  assert.equal(actorCanPerform(actor, job), false);
  assert.equal(actorCanPerform(actor, job, { allowWorking: true }), true);
});

test("M-4 stocktake runs through real navigation and object interaction", () => {
  const state = villageState(),
    cart = villageWorldObjectAt(state, 38, 23),
    request = {
      kind: "world_interact",
      objectId: cart.id,
      action: "request_stocktake",
      ...cart.position,
    },
    workBeat = {
      kind: "world_interact",
      objectId: cart.id,
      action: "use",
      ...cart.position,
    };
  applyRogueTurn(state, request);
  const job = state.village.jobs[0];
  assert.equal(job.status, "available");
  for (let beat = 0; beat < 40 && job.status !== "completed"; beat++)
    applyRogueTurn(state, workBeat);
  assert.equal(job.status, "completed");
  assert.equal(job.progress.completed, 1);
  assert.ok(isUuid(job.id));
  assert.ok(
    state.village.reservations
      .filter((claim) => claim.jobId === job.id)
      .every((claim) => claim.state === "released"),
  );
  assert.equal(
    state.village.npcStates.find((actor) => actor.id === job.assignedActorId)
      .lastJobType,
    "inspect_object",
  );
});

test("M-4 invalid job targets release every claim deterministically", () => {
  const state = villageState(),
    cart = villageWorldObjectAt(state, 38, 23),
    request = {
      kind: "world_interact",
      objectId: cart.id,
      action: "request_stocktake",
      ...cart.position,
    },
    beat = {
      kind: "world_interact",
      objectId: cart.id,
      action: "use",
      ...cart.position,
    };
  applyRogueTurn(state, request);
  applyRogueTurn(state, beat);
  const job = state.village.jobs[0],
    actor = state.village.npcStates.find(
      (candidate) => candidate.id === job.assignedActorId,
    );
  assert.equal(job.status, "reserved");
  job.targetId = "9710f715-14a2-4557-963f-e67ac3ae4f17";
  applyRogueTurn(state, beat);
  assert.equal(job.status, "blocked");
  assert.equal(job.blockingReason, "target_missing");
  assert.equal(job.assignedActorId, null);
  assert.ok(
    actor.workState === "available" ||
      state.village.jobs.some(
        (candidate) =>
          candidate.id !== job.id &&
          candidate.assignedActorId === actor.id &&
          ["reserved", "active"].includes(candidate.status),
      ),
  );
  assert.ok(
    state.village.reservations
      .filter((claim) => claim.jobId === job.id)
      .every((claim) => claim.state === "released"),
  );
});

test("M-4 posting the same open job is idempotent", () => {
  const state = villageState(),
    cart = villageWorldObjectAt(state, 38, 23),
    request = {
      kind: "world_interact",
      objectId: cart.id,
      action: "request_stocktake",
      ...cart.position,
    };
  applyRogueTurn(state, request);
  applyRogueTurn(state, request);
  assert.equal(state.village.jobs.length, 1);
});

test("M-4 save migration preserves jobs, claims, and actor work data", () => {
  const state = villageState(),
    job = stocktakeJob(state),
    actor = state.village.npcStates[0];
  job.assignedActorId = actor.id;
  transitionJob(job, "reserved", state.tick);
  reserveAll(state, job, [{ kind: "job", targetId: job.id }]);
  const restored = parseRogueState(serializeRogueState(state)),
    view = rogueRunView(restored).village.jobs[0];
  assert.equal(restored.schemaVersion, 22);
  assert.equal(restored.village.jobs[0].assignedActorId, actor.id);
  assert.equal(restored.village.reservations[0].jobId, job.id);
  assert.ok(restored.village.npcStates[0].capabilityTags.includes("inspect"));
  assert.ok(restored.village.npcStates[0].capabilityTags.includes("eat"));
  assert.equal(view.assignedActorName, "Greta Voll");
});

test("M-4 schema-11 saves acquire empty work state and actor profiles", () => {
  const legacy = serializeRogueState(villageState());
  legacy.schemaVersion = 11;
  delete legacy.village.jobs;
  delete legacy.village.reservations;
  for (const actor of legacy.village.npcStates) {
    delete actor.capabilityTags;
    delete actor.workPermissions;
    delete actor.skills;
    delete actor.workState;
    delete actor.lastJobType;
    delete actor.risk;
  }
  const migrated = parseRogueState(legacy);
  assert.equal(migrated.schemaVersion, 22);
  assert.deepEqual(migrated.village.jobs, []);
  assert.deepEqual(migrated.village.reservations, []);
  assert.ok(
    migrated.village.npcStates.every(
      (actor) =>
        actor.capabilityTags.includes("inspect") &&
        actor.workPermissions.allowedJobTypes.includes("inspect_object") &&
        actor.workState === "available",
    ),
  );
});

test("M-4 cancelling work releases claims exactly once", () => {
  const state = villageState(),
    job = stocktakeJob(state),
    actor = state.village.npcStates[0];
  transitionJob(job, "reserved", state.tick);
  job.assignedActorId = actor.id;
  actor.workState = "working";
  reserveAll(state, job, [{ kind: "job", targetId: job.id }]);
  assert.equal(cancelJob(state, job, "player_cancelled"), true);
  assert.equal(cancelJob(state, job, "player_cancelled"), false);
  assert.equal(state.village.reservations[0].state, "released");
  assert.equal(actor.workState, "available");
});
