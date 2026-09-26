import test from "node:test";
import assert from "node:assert/strict";
import {
  applyRogueTurn,
  newRogueRun,
  parseRogueState,
  rogueRunView,
  serializeRogueState,
} from "../src/rogue-engine.js";
import { isUuid } from "../src/identity.js";
import { villageIntentAdvancesSimulation } from "../src/village-simulation.js";

const input = {
  requestId: "smart-world-contracts",
  seed: "smart-world-contracts",
  heroName: "Mara",
  form: "hybrid",
  size: "small",
};

function stonebridgeState() {
  const state = newRogueRun(input);
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
  return events
    .filter((event) => event.scope === "village")
    .map(({ actorId: _actorId, ...event }) => event);
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
    movements = result.events.filter((event) => event.type === "npc_move");
  assert.equal(movements.length, 3);
  for (const event of movements) {
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
      { kind: "local_move", x: 19, y: 12 },
      { kind: "local_move", x: 19, y: 13 },
      { kind: "local_move", x: 19, y: 12 },
    ],
    firstEvents = [],
    secondEvents = [];
  for (const intent of intents) {
    firstEvents.push(...applyRogueTurn(first, intent).events);
    secondEvents.push(...applyRogueTurn(second, intent).events);
  }
  assert.deepEqual(simulationSnapshot(first), simulationSnapshot(second));
  assert.deepEqual(
    publicSimulationEvents(firstEvents),
    publicSimulationEvents(secondEvents),
  );
});

test("M-1 each accepted village intent advances exactly one game tick", () => {
  const state = stonebridgeState();
  for (const intent of [
    { kind: "local_move", x: 19, y: 13 },
    { kind: "local_examine", x: 19, y: 13 },
    { kind: "set_party_movement", mode: "dispersed" },
  ]) {
    const before = state.tick;
    applyRogueTurn(state, intent);
    assert.equal(state.tick, before + 1);
  }
});

test("M-1 Stonebridge runtime entities use UUID instance identities", () => {
  const state = stonebridgeState(),
    grass = rogueRunView(state).village.map.cells.find(
      (cell) => cell.tile === "outdoor_grass",
    );
  state.village.heroPosition = { x: grass.x - 1, y: grass.y };
  applyRogueTurn(state, {
    kind: "local_manipulate",
    action: "dig",
    x: grass.x,
    y: grass.y,
  });
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
  applyRogueTurn(state, { kind: "local_move", x: 19, y: 13 });
  applyRogueTurn(state, { kind: "local_move", x: 19, y: 12 });
  const before = simulationSnapshot(state),
    restored = parseRogueState(structuredClone(serializeRogueState(state)));
  assert.equal(restored.location, "village");
  assert.equal(restored.tick, state.tick);
  assert.deepEqual(simulationSnapshot(restored), before);
});
