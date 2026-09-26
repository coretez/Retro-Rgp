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
} from "../src/rogue-engine.js";
import { isUuid } from "../src/identity.js";
import { RogueStore } from "../src/rogue-store.js";
import { villageIntentAdvancesSimulation } from "../src/village-simulation.js";

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
