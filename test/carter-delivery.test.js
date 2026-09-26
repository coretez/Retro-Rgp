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
import { cancelJob } from "../src/job-board.js";

const input = {
  requestId: "m5-carter-delivery",
  seed: "m5-carter-delivery",
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

function deliveryBeat(state) {
  const cart = villageWorldObjectAt(state, 38, 23);
  return {
    kind: "world_interact",
    objectId: cart.id,
    action: "use",
    ...cart.position,
  };
}

function deliveryJob(state) {
  return state.village.jobs.find((job) => job.jobType === "deliver_goods");
}

function supplies(state) {
  const source = state.village.stockpiles.find(
      (stockpile) => stockpile.containerKind === "cart",
    ),
    target = state.village.stockpiles.find(
      (stockpile) => stockpile.containerKind === "forge",
    );
  return { source, target };
}

function runUntil(state, predicate, maximum = 140) {
  const events = [],
    beat = deliveryBeat(state),
    bram = state.village.npcStates.find((npc) => npc.personKey === "carter");
  for (let turn = 0; turn < maximum && !predicate(); turn += 1) {
    const before = { ...bram.position },
      result = applyRogueTurn(state, beat),
      distance =
        Math.abs(bram.position.x - before.x) +
        Math.abs(bram.position.y - before.y);
    assert.ok(distance <= 1, `Bram moved ${distance} cells on turn ${turn}`);
    events.push(...result.events);
  }
  assert.ok(predicate(), `Condition was not reached within ${maximum} turns`);
  return events;
}

test("M-5 Bram completes one conserved cart-to-smithy delivery", () => {
  const state = villageState(),
    { source, target } = supplies(state),
    initialTotal = source.quantity + target.quantity;
  const events = runUntil(
      state,
      () => deliveryJob(state)?.status === "completed",
    ),
    job = deliveryJob(state),
    bram = state.village.npcStates.find((npc) => npc.personKey === "carter"),
    eventTypes = new Set(events.map((event) => event.type));
  assert.equal(job.assignedActorId, bram.id);
  assert.equal(source.quantity, 2);
  assert.equal(target.quantity, 1);
  assert.equal(source.quantity + target.quantity, initialTotal);
  assert.equal(job.transfer.carriedQuantity, 0);
  assert.equal(job.progress.completed, job.progress.total);
  assert.equal(
    state.village.doors.find((door) => door.buildingKey === "smithy").state,
    "open",
  );
  for (const type of [
    "job_started",
    "cargo_loaded",
    "door_opened",
    "cargo_delivered",
    "job_completed",
  ])
    assert.ok(eventTypes.has(type), `Missing ${type}`);
  assert.ok(
    state.village.reservations
      .filter((claim) => claim.jobId === job.id)
      .every((claim) => claim.state === "released"),
  );
});

test("M-5 locked access blocks, survives save, and resumes deterministically", () => {
  let state = villageState();
  const beat = deliveryBeat(state),
    door = state.village.doors.find((entry) => entry.buildingKey === "smithy");
  door.state = "locked";
  for (let turn = 0; turn < 3; turn += 1) applyRogueTurn(state, beat);
  let job = deliveryJob(state),
    bram = state.village.npcStates.find((npc) => npc.personKey === "carter");
  assert.equal(job.plan.step, "to_destination");
  assert.equal(job.transfer.carriedQuantity, 1);
  bram.position = { x: 8, y: 10 };
  applyRogueTurn(state, beat);
  assert.equal(job.status, "blocked");
  assert.equal(job.blockingReason, "access_locked");

  state = parseRogueState(serializeRogueState(state));
  job = deliveryJob(state);
  bram = state.village.npcStates.find((npc) => npc.personKey === "carter");
  const blockedView = rogueRunView(state).village.jobs.find(
    (entry) => entry.id === job.id,
  );
  assert.equal(blockedView.plan.step, "to_destination");
  assert.equal(blockedView.blockingReason, "access_locked");
  assert.equal(
    supplies(state).source.quantity +
      supplies(state).target.quantity +
      job.transfer.carriedQuantity,
    3,
  );

  state.village.doors.find((entry) => entry.buildingKey === "smithy").state =
    "closed";
  const resumed = applyRogueTurn(state, deliveryBeat(state)).events;
  assert.equal(job.status, "active");
  assert.ok(resumed.some((event) => event.type === "job_resumed"));
  applyRogueTurn(state, deliveryBeat(state));
  assert.equal(
    state.village.doors.find((entry) => entry.buildingKey === "smithy").state,
    "open",
  );
  bram.position = { x: 10, y: 3 };
  const finished = applyRogueTurn(state, deliveryBeat(state)).events;
  assert.equal(job.status, "completed");
  assert.ok(finished.some((event) => event.type === "cargo_delivered"));
  assert.equal(
    supplies(state).source.quantity + supplies(state).target.quantity,
    3,
  );
});

test("M-5 cancellation returns in-transit cargo and releases claims", () => {
  const state = villageState(),
    beat = deliveryBeat(state);
  for (let turn = 0; turn < 3; turn += 1) applyRogueTurn(state, beat);
  const job = deliveryJob(state),
    { source, target } = supplies(state);
  assert.equal(job.transfer.carriedQuantity, 1);
  assert.equal(cancelJob(state, job, "test_cancelled"), true);
  assert.equal(job.transfer.carriedQuantity, 0);
  assert.equal(source.quantity, 3);
  assert.equal(target.quantity, 0);
  assert.ok(
    state.village.reservations
      .filter((claim) => claim.jobId === job.id)
      .every((claim) => claim.state === "released"),
  );
});

test("M-5 delivery is condition-driven and schema 12 gains logistics", () => {
  const stocked = villageState(),
    stockedSupplies = supplies(stocked);
  stockedSupplies.target.quantity = stockedSupplies.target.threshold;
  applyRogueTurn(stocked, deliveryBeat(stocked));
  assert.equal(deliveryJob(stocked), undefined);

  const legacy = serializeRogueState(villageState()),
    carter = legacy.village.npcStates.find((npc) => npc.personKey === "carter");
  legacy.schemaVersion = 12;
  delete legacy.village.stockpiles;
  carter.capabilityTags = ["inspect"];
  carter.workPermissions.allowedJobTypes = ["inspect_object"];
  const migrated = parseRogueState(legacy),
    migratedCarter = migrated.village.npcStates.find(
      (npc) => npc.personKey === "carter",
    );
  assert.equal(migrated.schemaVersion, 13);
  assert.equal(migrated.village.stockpiles.length, 2);
  assert.ok(migratedCarter.capabilityTags.includes("haul"));
  assert.ok(
    migratedCarter.workPermissions.allowedJobTypes.includes("deliver_goods"),
  );
});
