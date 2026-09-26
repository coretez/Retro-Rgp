import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  applyRogueTurn,
  newRogueRun,
  parseRogueState,
  rogueRunView,
  serializeRogueState,
  villageRoadBuildingConflicts,
} from "../src/rogue-engine.js";
import { isUuid } from "../src/identity.js";
import { RogueStore } from "../src/rogue-store.js";
import {
  planVillageRoute,
  villageIntentAdvancesSimulation,
  villageMovementCost,
} from "../src/village-simulation.js";
import { key, weightedRoute } from "../src/spatial.js";

const input = {
  requestId: "smart-world-contracts",
  seed: "smart-world-contracts",
  heroName: "Mara",
  form: "hybrid",
  size: "small",
};

function stonebridgeState(overrides = {}) {
  const state = newRogueRun({ ...input, ...overrides });
  state.location = "village";
  return state;
}

function simulationSnapshot(state) {
  return state.village.npcStates.map((npc) => ({
    personKey: npc.personKey,
    position: { ...npc.position },
    objective: npc.objective,
    currentAction: npc.currentAction,
    actionReason: npc.actionReason,
    routeIndex: npc.routeIndex,
  }));
}

function publicSimulationEvents(events) {
  return events.map(
    ({ actorId: _actorId, personId: _personId, doorId: _doorId, ...event }) =>
      event,
  );
}

function semanticItem(item) {
  return {
    kind: item.kind,
    itemType: item.itemType,
    quantity: item.quantity,
    equipped: item.equipped,
  };
}

function semanticVillageSnapshot(state) {
  return {
    location: state.location,
    tick: state.tick,
    heroPosition: { ...state.village.heroPosition },
    companionPositions: structuredClone(state.village.companionPositions),
    partyMovement: state.village.partyMovement,
    viewportOrigin: { ...state.village.viewportOrigin },
    wantedLevel: state.village.wantedLevel,
    npcStates: simulationSnapshot(state),
    doors: state.village.doors.map(({ id: _id, ...door }) => door),
    modifications: state.village.modifications.map(
      ({ id: _id, actorId: _actorId, ...modification }) => modification,
    ),
    looseMaterials: state.village.looseMaterials.map(
      ({ id: _id, ...material }) => material,
    ),
    heroGoldCp: state.hero.goldCp,
    heroInventory: state.hero.inventory.map(semanticItem),
  };
}

function digVisibleGrass(state) {
  const grass = rogueRunView(state).village.map.cells.find(
    (cell) => cell.tile === "outdoor_grass",
  );
  state.village.heroPosition = { x: grass.x - 1, y: grass.y };
  return {
    kind: "local_manipulate",
    action: "dig",
    x: grass.x,
    y: grass.y,
  };
}

test("M-1 defines which accepted intents advance the village simulation", () => {
  for (const kind of ["local_move", "local_manipulate", "shop_buy", "equip"])
    assert.equal(villageIntentAdvancesSimulation(kind), true);
  for (const kind of [
    "local_examine",
    "local_talk",
    "set_party_movement",
    "open_world",
  ])
    assert.equal(villageIntentAdvancesSimulation(kind), false);
});

test("M-1 village advancement emits structured simulation events", () => {
  const state = stonebridgeState(),
    result = applyRogueTurn(state, { kind: "local_move", x: 19, y: 13 }),
    simulationEvents = result.events.filter((event) =>
      ["npc_move", "npc_blocked"].includes(event.type),
    );
  assert.equal(simulationEvents.length, 3);
  for (const event of simulationEvents) {
    assert.equal(event.scope, "village");
    assert.equal(event.tick, 0);
    assert.ok(isUuid(event.actorId));
    assert.match(event.objective, /./);
    assert.match(event.currentAction, /./);
    assert.deepEqual(Object.keys(event.position).sort(), ["x", "y"]);
  }
});

test("M-1 identical village inputs produce identical simulation outcomes", () => {
  const first = stonebridgeState(),
    second = stonebridgeState(),
    intents = [
      { kind: "local_move", x: 19, y: 13 },
      { kind: "local_examine", x: 19, y: 13 },
      { kind: "local_move", x: 19, y: 12 },
      { kind: "set_party_movement", mode: "dispersed" },
    ],
    firstEvents = [],
    secondEvents = [];
  for (const intent of intents) {
    firstEvents.push(...applyRogueTurn(first, intent).events);
    secondEvents.push(...applyRogueTurn(second, intent).events);
  }
  assert.deepEqual(
    semanticVillageSnapshot(first),
    semanticVillageSnapshot(second),
  );
  assert.deepEqual(
    publicSimulationEvents(firstEvents),
    publicSimulationEvents(secondEvents),
  );
});

test("M-1 each accepted village intent advances exactly one game tick", () => {
  const cases = [
    [() => stonebridgeState(), { kind: "local_move", x: 19, y: 13 }],
    [() => stonebridgeState(), { kind: "local_examine", x: 19, y: 13 }],
    [() => stonebridgeState(), { kind: "local_talk", x: 20, y: 9 }],
    [
      () => stonebridgeState(),
      { kind: "set_party_movement", mode: "dispersed" },
    ],
    [() => stonebridgeState(), { kind: "open_world" }],
    [
      () => {
        const state = stonebridgeState();
        return [state, digVisibleGrass(state)];
      },
    ],
    [
      () => {
        const state = stonebridgeState(),
          axe = state.hero.inventory.find((item) => item.kind === "hand_axe");
        return [state, { kind: "equip", itemId: axe.id }];
      },
    ],
    [
      () => {
        const state = stonebridgeState({ heroClass: "cleric" });
        return [state, { kind: "unequip", slot: "offhand" }];
      },
    ],
    [
      () => {
        const state = stonebridgeState();
        state.village.heroPosition = { x: 27, y: 3 };
        state.hero.goldCp = 100;
        return [
          state,
          {
            kind: "shop_buy",
            actorId: state.hero.id,
            itemKind: "healing_potion",
          },
        ];
      },
    ],
  ];
  for (const [create, suppliedIntent] of cases) {
    const created = create(),
      [state, intent] = Array.isArray(created)
        ? created
        : [created, suppliedIntent];
    const before = state.tick;
    applyRogueTurn(state, intent);
    assert.equal(state.tick, before + 1);
  }
});

test("M-1 rejected village intents do not consume a tick", () => {
  const state = stonebridgeState(),
    before = serializeRogueState(state);
  assert.throws(
    () => applyRogueTurn(state, { kind: "local_talk", x: 19, y: 13 }),
    (error) => error.code === "TALK_TARGET_MISSING",
  );
  assert.equal(state.tick, 0);
  assert.deepEqual(serializeRogueState(state), before);
});

test("M-1 Stonebridge runtime entities use UUID instance identities", () => {
  const state = stonebridgeState();
  applyRogueTurn(state, digVisibleGrass(state));
  const instances = [
    state.hero,
    ...state.companions,
    ...state.village.npcStates,
    ...state.village.doors,
    ...state.hero.inventory,
    ...state.village.modifications,
    ...state.village.looseMaterials,
  ];
  assert.ok(instances.length > 20);
  assert.ok(instances.every((instance) => isUuid(instance.id)));
});

test("M-1 save round-trips preserve village actors and objectives", () => {
  const state = stonebridgeState();
  state.village.heroPosition = { x: 0, y: 1 };
  applyRogueTurn(state, {
    kind: "local_manipulate",
    action: "breach",
    x: 1,
    y: 1,
  });
  const before = structuredClone(state.village),
    restored = parseRogueState(structuredClone(serializeRogueState(state)));
  assert.equal(restored.location, "village");
  assert.equal(restored.tick, state.tick);
  assert.deepEqual(restored.village, before);
});

test("M-1 SQLite persistence preserves complete village state", () => {
  const directory = mkdtempSync(join(tmpdir(), "retro-rpg-m1-")),
    database = join(directory, "rogue.sqlite"),
    store = new RogueStore(database);
  try {
    const created = store.create({ ...input, requestId: "m1-store" }),
      state = store.get(created.runId);
    state.location = "village";
    applyRogueTurn(state, digVisibleGrass(state));
    const before = structuredClone(state.village);
    store.db
      .prepare("UPDATE rogue_runs SET state=? WHERE id=?")
      .run(JSON.stringify(serializeRogueState(state)), state.id);
    const restored = store.get(state.id);
    assert.equal(restored.tick, state.tick);
    assert.deepEqual(restored.village, before);
  } finally {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("M-2 weighted navigation prefers a cheaper road over direct grass", () => {
  const result = weightedRoute({
    from: { x: 0, y: 1 },
    to: { x: 4, y: 1 },
    bounds: { minX: 0, maxX: 4, minY: 0, maxY: 1 },
    isBlocked: () => false,
    terrainCost: ({ y }) => (y === 0 ? 1 : 4),
  });
  assert.equal(result.ok, true);
  assert.ok(result.path.some(({ y }) => y === 0));
  assert.ok(result.cost < 16);
});

test("M-2 blocked destinations return a reason instead of a route", () => {
  const result = weightedRoute({
    from: { x: 0, y: 0 },
    to: { x: 2, y: 0 },
    bounds: { minX: 0, maxX: 2, minY: 0, maxY: 1 },
    isBlocked: ({ x, y }) => x === 2 && y === 0,
    terrainCost: () => 1,
  });
  assert.deepEqual(result, {
    ok: false,
    reason: "destination_blocked",
    destination: { x: 2, y: 0 },
  });
});

test("M-2 village routing can detour beyond the former fixed margin", () => {
  const npc = { id: "moving-npc", position: { x: 0, y: 0 } },
    state = {
      village: {
        heroPosition: { x: 100, y: 100 },
        companionPositions: [],
        npcStates: [npc],
      },
    },
    terrainAt = ({ x, y }) =>
      x === 1 && y >= -20 && y <= 20 ? "village_building" : "road_stone",
    result = planVillageRoute(state, npc, { x: 2, y: 0 }, terrainAt, false);
  assert.equal(result.ok, true);
  assert.ok(result.path.some(({ y }) => Math.abs(y) === 21));
});

test("M-2 village terrain declares costs and impassable objects", () => {
  for (const tile of [
    "outdoor_tree",
    "village_sign",
    "village_building",
    "village_furniture",
    "village_door_closed",
    "village_pit",
  ])
    assert.equal(villageMovementCost(tile), null);
  assert.equal(villageMovementCost("road_stone"), 1);
  assert.equal(villageMovementCost("road_dirt"), 2);
  assert.equal(villageMovementCost("outdoor_grass"), 4);
});

test("M-2 Stonebridge principal roads are two cells wide and unobstructed", () => {
  const state = stonebridgeState();
  state.village.npcStates.forEach((npc, index) => {
    npc.position = { x: 70 + index, y: 70 };
  });
  const cells = rogueRunView(state).village.map.cells,
    principalRoad = cells.filter(
      ({ x, y }) => y === 11 || y === 12 || x === 19 || x === 20,
    );
  assert.ok(principalRoad.length > 150);
  assert.ok(principalRoad.every((cell) => cell.tile === "road_stone"));
  assert.deepEqual(villageRoadBuildingConflicts(), []);
});

test("M-2 moving residents use both road lanes without stacking", () => {
  const state = stonebridgeState(),
    guard = state.village.npcStates.find((npc) => npc.personKey === "watchman"),
    porter = state.village.npcStates.find((npc) => npc.personKey === "porter"),
    axe = state.hero.inventory.find((item) => item.kind === "hand_axe");
  let usedPassingLane = false;
  state.village.heroPosition = { x: 0, y: 30 };
  state.village.companionPositions = [
    { x: 1, y: 30 },
    { x: 2, y: 30 },
    { x: 3, y: 30 },
  ];
  state.village.npcStates.forEach((npc, index) => {
    npc.position = { x: 70 + index, y: 70 };
  });
  Object.assign(guard, {
    position: { x: 19, y: 11 },
    actionReason: "player_crime",
    actionTarget: { x: 24, y: 11 },
  });
  Object.assign(porter, {
    position: { x: 20, y: 11 },
    actionReason: "player_crime",
    actionTarget: { x: 14, y: 11 },
  });
  for (let turn = 0; turn < 3; turn += 1) {
    applyRogueTurn(state, { kind: "equip", itemId: axe.id });
    const positions = state.village.npcStates.map((npc) => key(npc.position));
    assert.equal(new Set(positions).size, positions.length);
    usedPassingLane ||= [guard.position.y, porter.position.y].includes(12);
  }
  assert.ok(guard.position.x > porter.position.x);
  assert.equal(usedPassingLane, true);
});

test("M-2 unreachable NPC work emits a stable blocking reason", () => {
  const state = stonebridgeState(),
    guard = state.village.npcStates.find((npc) => npc.personKey === "watchman");
  Object.assign(guard, {
    actionReason: "player_crime",
    actionTarget: { x: 11, y: 3 },
  });
  const outcome = applyRogueTurn(state, {
      kind: "local_move",
      x: 19,
      y: 13,
    }),
    blocked = outcome.events.find(
      (event) => event.type === "npc_blocked" && event.actorId === guard.id,
    );
  assert.equal(blocked.reason, "search_limit");
  assert.deepEqual(blocked.destination, { x: 11, y: 3 });
  assert.deepEqual(guard.position, { x: 20, y: 9 });
});

test("M-2 an NPC already in position waits instead of claiming movement", () => {
  const state = stonebridgeState(),
    guard = state.village.npcStates.find((npc) => npc.personKey === "watchman"),
    axe = state.hero.inventory.find((item) => item.kind === "hand_axe"),
    before = { ...guard.position };
  Object.assign(guard, {
    actionReason: "player_crime",
    actionTarget: { x: 20, y: 10 },
  });
  const outcome = applyRogueTurn(state, { kind: "equip", itemId: axe.id }),
    event = outcome.events.find((candidate) => candidate.actorId === guard.id);
  assert.equal(event.type, "npc_wait");
  assert.equal(event.reason, "destination_reached");
  assert.deepEqual(guard.position, before);
});

test("M-2 the guard completes an entire continuous patrol circuit", () => {
  const state = stonebridgeState(),
    guard = state.village.npcStates.find((npc) => npc.personKey === "watchman"),
    axe = state.hero.inventory.find((item) => item.kind === "hand_axe"),
    positions = [{ ...guard.position }];
  for (let turn = 0; turn < 16; turn += 1) {
    const before = { ...guard.position };
    applyRogueTurn(state, { kind: "equip", itemId: axe.id });
    const distance =
      Math.abs(guard.position.x - before.x) +
      Math.abs(guard.position.y - before.y);
    assert.equal(distance, 1);
    positions.push({ ...guard.position });
  }
  assert.deepEqual(guard.position, positions[0]);
  assert.equal(guard.routeIndex, 0);
  assert.ok(positions.some(({ y }) => y === 12));
});
