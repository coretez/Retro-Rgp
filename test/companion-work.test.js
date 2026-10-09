import test from "node:test";
import assert from "node:assert/strict";
import {
  applyRogueTurn,
  newRogueRun,
  parseRogueState,
  rogueUnityView,
  serializeRogueState,
  villageWorldObjectAt,
} from "../src/rogue-engine.js";
import { isUuid } from "../src/identity.js";
import { reportVillageIncident } from "../src/village-simulation.js";

const input = {
  requestId: "m8-companion-work",
  seed: "m8-companion-work",
  heroName: "Mara",
  form: "hybrid",
  size: "small",
};

function villageState() {
  const state = newRogueRun(input);
  state.location = "village";
  state.village.adventurersPresent = true;
  return state;
}

function advance(state) {
  const axe = state.hero.inventory.find((item) => item.kind === "hand_axe");
  return applyRogueTurn(state, { kind: "equip", itemId: axe.id });
}

function autonomousJobs(state) {
  return state.village.jobs.filter((job) => job.plan?.autonomous);
}

function distance(left, right) {
  return Math.abs(left.x - right.x) + Math.abs(left.y - right.y);
}

test("village simulation temporarily excludes the adventuring party", () => {
  const state = newRogueRun(input),
    lifeBefore = structuredClone(state.village.playerCharacterStates),
    positionsBefore = structuredClone(state.village.companionPositions);
  state.location = "village";
  applyRogueTurn(state, { kind: "wait" });
  const view = rogueUnityView(state);
  assert.equal(state.village.adventurersPresent, false);
  assert.deepEqual(state.village.playerCharacterStates, lifeBefore);
  assert.deepEqual(state.village.companionPositions, positionsBefore);
  assert.equal(autonomousJobs(state).length, 0);
  assert.equal(view.partyMembers.length, 0);
  assert.ok(view.map.cells.every((cell) => cell.entityKind !== "party"));
  assert.ok(!view.legalIntents.includes("local_move"));
  assert.ok(!view.legalIntents.includes("set_party_movement"));
});

test("M-8 companions have UUID-keyed permissions and distinct priorities", () => {
  const state = villageState();
  assert.equal(state.village.companionStates.length, 3);
  for (const worker of state.village.companionStates) {
    assert.equal(worker.id, worker.actorId);
    assert.ok(isUuid(worker.id));
    assert.ok(worker.capabilityTags.length > 0);
    assert.ok(worker.workPermissions.allowedJobTypes.length > 0);
    assert.ok(Object.keys(worker.workPriorities).length > 0);
  }
  assert.equal(
    new Set(
      state.village.companionStates.map((worker) =>
        Object.keys(worker.workPriorities).sort().join(","),
      ),
    ).size,
    3,
  );
});

test("M-8 dispersed companions choose different legal work and walk one cell", () => {
  const state = villageState(),
    before = state.village.companionStates.map((worker) => ({
      ...worker.position,
    }));
  applyRogueTurn(state, { kind: "set_party_movement", mode: "dispersed" });
  const jobs = autonomousJobs(state);
  assert.equal(jobs.length, 3);
  assert.equal(new Set(jobs.map((job) => job.jobType)).size, 3);
  for (const [index, worker] of state.village.companionStates.entries()) {
    const job = jobs.find(
      (candidate) => candidate.plan.ownerActorId === worker.id,
    );
    assert.ok(job);
    assert.ok(worker.workPermissions.allowedJobTypes.includes(job.jobType));
    assert.ok(
      job.requiredCapabilities.every((tag) =>
        worker.capabilityTags.includes(tag),
      ),
    );
    assert.ok(distance(before[index], worker.position) <= 1);
  }
});

test("M-8 a dispersed support companion performs actual healing", () => {
  const state = villageState(),
    support = state.companions.find((actor) => actor.role === "support"),
    worker = state.village.companionStates.find(
      (candidate) => candidate.actorId === support.id,
    );
  state.hero.hp -= 8;
  worker.position = {
    x: state.village.heroPosition.x - 1,
    y: state.village.heroPosition.y,
  };
  state.village.companionPositions[state.companions.indexOf(support)] = {
    ...worker.position,
  };
  const hp = state.hero.hp,
    uses = support.supportUses;
  applyRogueTurn(state, { kind: "set_party_movement", mode: "dispersed" });
  for (let turn = 0; turn < 4 && state.hero.hp === hp; turn += 1)
    advance(state);
  const job = autonomousJobs(state).find(
    (candidate) => candidate.jobType === "heal_party",
  );
  assert.equal(job.status, "completed");
  assert.equal(state.hero.hp, hp + 6);
  assert.equal(support.supportUses, uses - 1);
});

test("M-8 regroup suspends work, releases claims, and never teleports", () => {
  const state = villageState();
  applyRogueTurn(state, { kind: "set_party_movement", mode: "dispersed" });
  advance(state);
  state.village.heroPosition = { x: 8, y: 4 };
  const before = state.village.companionStates.map((worker) => ({
      ...worker.position,
    })),
    outcome = applyRogueTurn(state, {
      kind: "set_party_movement",
      mode: "follow",
    });
  assert.ok(outcome.events.some((event) => event.type === "job_suspended"));
  for (const [index, worker] of state.village.companionStates.entries())
    assert.ok(distance(before[index], worker.position) <= 1);
  for (const job of autonomousJobs(state)) {
    if (job.assignedActorId) assert.equal(job.status, "suspended");
    assert.ok(
      state.village.reservations
        .filter((claim) => claim.jobId === job.id)
        .every((claim) => claim.state === "released"),
    );
  }
  for (let turn = 0; turn < 100 && state.village.regrouping; turn += 1) {
    advance(state);
    assert.equal(
      new Set([
        `${state.village.heroPosition.x},${state.village.heroPosition.y}`,
        ...state.village.companionPositions.map(({ x, y }) => `${x},${y}`),
      ]).size,
      4,
    );
  }
  assert.equal(state.village.regrouping, false);
  assert.equal(
    state.village.doors.find((door) => door.buildingKey === "smithy").state,
    "open",
  );
  assert.equal(
    new Set([
      `${state.village.heroPosition.x},${state.village.heroPosition.y}`,
      ...state.village.companionPositions.map(({ x, y }) => `${x},${y}`),
    ]).size,
    4,
  );
  applyRogueTurn(state, { kind: "set_party_movement", mode: "dispersed" });
  for (
    let turn = 0;
    turn < 12 &&
    autonomousJobs(state).every((job) => job.status === "suspended");
    turn += 1
  )
    advance(state);
  assert.ok(autonomousJobs(state).some((job) => job.status !== "suspended"));
});

test("M-8 a regrouping leader cannot step onto a companion", () => {
  const state = villageState(),
    companionPosition = { x: 20, y: 12 };
  state.village.partyMovement = "follow";
  state.village.regrouping = true;
  state.village.companionPositions[0] = companionPosition;
  state.village.companionStates[0].position = { ...companionPosition };
  assert.throws(
    () =>
      applyRogueTurn(state, {
        kind: "local_move",
        ...companionPosition,
      }),
    (error) => error.code === "LOCAL_DESTINATION_OCCUPIED",
  );
});

test("M-8 immediate danger recalls independently working companions", () => {
  const state = villageState();
  applyRogueTurn(state, { kind: "set_party_movement", mode: "dispersed" });
  advance(state);
  const evidence = villageWorldObjectAt(
      state,
      state.village.heroPosition.x,
      state.village.heroPosition.y,
    ),
    events = [];
  reportVillageIncident(
    state,
    {
      kind: "danger",
      evidenceId: evidence.id,
      position: { ...state.village.heroPosition },
      offenderId: null,
    },
    events,
  );
  const outcome = advance(state);
  assert.equal(state.village.partyMovement, "follow");
  assert.equal(state.village.regrouping, true);
  assert.ok(outcome.events.some((event) => event.type === "party_recalled"));
  assert.ok(
    autonomousJobs(state).every((job) =>
      ["available", "blocked", "suspended", "completed"].includes(job.status),
    ),
  );
});

test("M-8 autonomous purchases obey category and copper limits", () => {
  const state = villageState(),
    companion = state.companions[0];
  state.hero.goldCp = 200;
  state.village.stockpiles.find(
    (stockpile) => stockpile.key === "smithy_weapons",
  ).quantity = 1;
  state.village.stockpiles.find(
    (stockpile) => stockpile.key === "apothecary_remedies",
  ).quantity = 1;
  state.village.heroPosition = { x: 2, y: 2 };
  assert.throws(
    () =>
      applyRogueTurn(state, {
        kind: "shop_buy",
        actorId: companion.id,
        itemKind: "ash_spear",
        autonomous: true,
      }),
    (error) => error.code === "PURCHASE_APPROVAL_REQUIRED",
  );
  applyRogueTurn(state, {
    kind: "set_spending_policy",
    mode: "routine_supplies",
    limitCp: 100,
  });
  assert.throws(
    () =>
      applyRogueTurn(state, {
        kind: "shop_buy",
        actorId: companion.id,
        itemKind: "ash_spear",
        autonomous: true,
      }),
    (error) => error.code === "PURCHASE_APPROVAL_REQUIRED",
  );
  applyRogueTurn(state, {
    kind: "set_spending_policy",
    mode: "autonomous",
    limitCp: 49,
  });
  state.village.heroPosition = { x: 27, y: 3 };
  state.village.npcStates.find(
    (npc) => npc.personKey === "herbalist",
  ).position = { x: 37, y: 7 };
  assert.throws(
    () =>
      applyRogueTurn(state, {
        kind: "shop_buy",
        actorId: companion.id,
        itemKind: "healing_potion",
        autonomous: true,
      }),
    (error) => error.code === "SPENDING_LIMIT_EXCEEDED",
  );
  applyRogueTurn(state, {
    kind: "set_spending_policy",
    mode: "autonomous",
    limitCp: 50,
  });
  state.village.npcStates.find(
    (npc) => npc.personKey === "herbalist",
  ).position = { x: 37, y: 7 };
  applyRogueTurn(state, {
    kind: "shop_buy",
    actorId: companion.id,
    itemKind: "healing_potion",
    autonomous: true,
  });
  assert.equal(state.village.spendingPolicy.spentCp, 50);
});

test("M-8 save/load preserves autonomous jobs and companion UUID references", () => {
  const state = villageState();
  applyRogueTurn(state, { kind: "set_party_movement", mode: "dispersed" });
  advance(state);
  const restored = parseRogueState(structuredClone(serializeRogueState(state))),
    actorIds = new Set(restored.companions.map((actor) => actor.id));
  assert.deepEqual(
    restored.village.companionStates,
    state.village.companionStates,
  );
  for (const job of autonomousJobs(restored)) {
    assert.ok(actorIds.has(job.plan.ownerActorId));
    assert.ok(!job.assignedActorId || actorIds.has(job.assignedActorId));
  }
});

test("M-8 Unity exposes party orders, policy, and companion objectives", () => {
  const state = villageState();
  applyRogueTurn(state, { kind: "set_party_movement", mode: "dispersed" });
  const view = rogueUnityView(state);
  assert.equal(view.partyMovement, "dispersed");
  assert.equal(view.spendingPolicy.mode, "approval_required");
  assert.ok(view.legalIntents.includes("set_party_movement"));
  assert.ok(view.legalIntents.includes("set_spending_policy"));
  assert.ok(view.legalIntents.includes("wait"));
  const companions = view.map.cells.filter(
    (cell) => cell.entityKind === "party" && cell.entityId !== state.hero.id,
  );
  assert.equal(companions.length, 3);
  assert.ok(companions.every((cell) => cell.entityObjective));
  assert.ok(companions.every((cell) => cell.entityPermissions));
  assert.ok(companions.every((cell) => cell.entityCapabilities));
});
