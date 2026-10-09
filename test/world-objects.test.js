import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  applyRogueTurn,
  executeVillageInteraction,
  newRogueRun,
  rogueRunView,
  serializeRogueState,
  villageObjectAffordances,
  villageWorldObjectAt,
} from "../src/rogue-engine.js";
import { isUuid } from "../src/identity.js";
import { RogueStore } from "../src/rogue-store.js";
import {
  createEntityIndex,
  describeAffordances,
  queryAffordances,
  WORLD_AFFORDANCES,
} from "../src/world-objects.js";
import {
  regionalHydrology,
  regionalPlacerMineral,
} from "../src/village-region.js";

const input = {
  requestId: "smart-objects",
  seed: "smart-objects",
  heroName: "Mara",
  form: "hybrid",
  size: "small",
};

function villageState() {
  const state = newRogueRun(input);
  state.location = "village";
  return state;
}

function normalizedDoorEvent(event) {
  return { type: event.type, position: event.position };
}

test("M-3 affordance definitions declare requirements, effects and duration", () => {
  for (const definition of Object.values(WORLD_AFFORDANCES)) {
    assert.match(definition.key, /./);
    assert.match(definition.label, /./);
    assert.equal(typeof definition.requirements, "object");
    assert.match(definition.effect, /./);
    assert.ok(Number.isInteger(definition.duration));
  }
});

test("M-3 entity indexes resolve identities and spatial occupants", () => {
  const entities = [
      { id: "first", position: { x: 2, y: 3 } },
      { id: "second", position: { x: 2, y: 3 } },
    ],
    index = createEntityIndex(entities);
  assert.equal(index.size, 2);
  assert.equal(index.get("first"), entities[0]);
  assert.deepEqual(index.at({ x: 2, y: 3 }), entities);
  assert.throws(
    () => createEntityIndex([entities[0], entities[0]]),
    /Duplicate entity/,
  );
});

test("M-3 village cells expose UUID objects and distinct smart-object types", () => {
  const view = rogueRunView(villageState()).village,
    objects = view.map.cells.map((cell) => cell.object),
    kinds = new Set(objects.map((object) => object.objectKind));
  assert.ok(view.entityCount < view.map.cells.length);
  assert.equal(
    view.entityCount,
    new Set(objects.map((object) => object.id)).size,
  );
  assert.ok(objects.every((object) => isUuid(object.id)));
  for (const kind of [
    "sign",
    "door",
    "tree",
    "wall",
    "forge",
    "counter",
    "cart",
    "resident",
  ])
    assert.ok(kinds.has(kind), `missing ${kind}`);
});

test("M-3 converted object types advertise distinct contextual actions", () => {
  const cells = rogueRunView(villageState()).village.map.cells,
    actionsFor = (kind) =>
      cells
        .find((cell) => cell.object.objectKind === kind)
        .object.affordances.map((action) => action.key);
  assert.deepEqual(actionsFor("sign"), ["read"]);
  assert.deepEqual(actionsFor("door"), ["examine", "open"]);
  assert.deepEqual(actionsFor("tree"), ["examine", "harvest"]);
  assert.deepEqual(actionsFor("forge"), ["examine", "use"]);
  assert.deepEqual(actionsFor("counter"), ["examine", "use"]);
  assert.deepEqual(actionsFor("cart"), ["examine", "use", "request_stocktake"]);
  assert.deepEqual(actionsFor("resident"), ["examine", "talk"]);
});

test("M-3 available queries filter actions while descriptions explain failures", () => {
  const state = villageState(),
    door = state.village.doors.find(
      (candidate) => candidate.buildingKey === "smithy",
    );
  state.village.heroPosition = { x: door.x, y: door.y + 5 };
  let object = villageWorldObjectAt(state, door.x, door.y),
    actions = villageObjectAffordances(state, state.hero.id, object),
    open = actions.find((action) => action.key === "open");
  assert.equal(open.available, false);
  assert.match(open.reason, /Move within 1 cell/);
  assert.deepEqual(
    queryAffordances(
      { inventory: [], position: state.village.heroPosition },
      object,
      { visible: true, position: state.village.heroPosition },
    ).map((action) => action.key),
    ["examine"],
  );
  door.state = "locked";
  state.village.heroPosition = { x: door.x, y: door.y + 1 };
  object = villageWorldObjectAt(state, door.x, door.y);
  actions = villageObjectAffordances(state, state.hero.id, object);
  open = actions.find((action) => action.key === "open");
  assert.equal(open.available, false);
  assert.equal(open.reason, "The door is locked.");
});

test("M-3 unavailable tool actions remain visible with a reason", () => {
  const state = villageState();
  state.hero.inventory = state.hero.inventory.filter(
    (item) => !item.toolTags?.includes("cut"),
  );
  const treeCell = rogueRunView(state).village.map.cells.find(
      (cell) => cell.object.objectKind === "tree",
    ),
    tree = villageWorldObjectAt(state, treeCell.x, treeCell.y);
  state.village.heroPosition = { x: treeCell.x - 1, y: treeCell.y };
  const actions = describeAffordances(
      { ...state.hero, position: state.village.heroPosition },
      tree,
      { visible: true, position: state.village.heroPosition },
    ),
    harvest = actions.find((action) => action.key === "harvest");
  assert.equal(harvest.available, false);
  assert.match(harvest.reason, /Requires a tool/);
});

test("R5 a resident remains visible while standing on loose material", () => {
  const state = villageState(),
    resident = state.village.npcStates[0];
  state.village.looseMaterials.push({
    id: "material-under-resident",
    entityType: "material",
    kind: "timber",
    name: "Cut timber",
    quantity: 1,
    ...resident.position,
  });
  const object = villageWorldObjectAt(
    state,
    resident.position.x,
    resident.position.y,
  );
  assert.equal(object.objectKind, "resident");
  assert.equal(object.id, resident.id);
});

test("R8 a finite quarry face produces physical stone and remains depleted", () => {
  const state = villageState(),
    position = { x: -135, y: 45 },
    object = villageWorldObjectAt(state, position.x, position.y),
    events = [];
  assert.equal(object.objectKind, "stone_deposit");
  assert.deepEqual(object.affordanceKeys, ["examine", "quarry"]);
  state.village.heroPosition = { x: position.x + 1, y: position.y };
  executeVillageInteraction(
    state,
    {
      actorId: state.hero.id,
      objectId: object.id,
      action: "quarry",
      ...position,
    },
    events,
  );
  assert.equal(state.village.looseMaterials.at(-1).kind, "stone");
  assert.equal(state.village.looseMaterials.at(-1).quantity, 3);
  assert.equal(
    villageWorldObjectAt(state, position.x, position.y).objectKind,
    "material",
  );
  assert.equal(state.village.modifications.at(-1).kind, "quarried_rock");
  assert.equal(events.at(-1).action, "quarry");
});

test("R8 river panning yields one conserved finite mineral concentrate", () => {
  const state = newRogueRun({
    ...input,
    seed: "the-river-below",
    scenario: "founding",
    worldGeneration: "regional_v3",
  });
  state.location = "village";
  const regional = state.village.development.masterPlan.regionalContext,
    directions = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  let target;
  for (let y = regional.site.hub.y - 96; y <= regional.site.hub.y + 96; y += 1)
    for (let x = regional.site.hub.x - 96; x <= regional.site.hub.x + 96; x += 1) {
      const mineralKind = regionalPlacerMineral(state.seed, x, y, "regional_v3");
      if (!mineralKind) continue;
      const access = directions
        .map(([dx, dy]) => ({ x: x + dx, y: y + dy }))
        .find(
          (cell) =>
            !regionalHydrology(state.seed, cell.x, cell.y, "regional_v3").water,
        );
      if (access) target = { global: { x, y }, access, mineralKind };
      if (target) break;
    }
  assert.ok(target);
  const local = {
      x: target.global.x - regional.site.origin.x,
      y: target.global.y - regional.site.origin.y,
    },
    access = {
      x: target.access.x - regional.site.origin.x,
      y: target.access.y - regional.site.origin.y,
    },
    object = villageWorldObjectAt(state, local.x, local.y),
    events = [];
  state.village.heroPosition = access;
  executeVillageInteraction(
    state,
    { actorId: state.hero.id, objectId: object.id, action: "pan", ...local },
    events,
  );
  const material = state.village.looseMaterials.at(-1),
    revisited = villageWorldObjectAt(state, local.x, local.y);
  assert.equal(material.kind, target.mineralKind);
  assert.equal(material.quantity, 1);
  assert.deepEqual({ x: material.x, y: material.y }, access);
  assert.equal(events.at(-1).type, "placer_mineral_recovered");
  assert.equal(revisited.placerExhausted, true);
  assert.equal(revisited.affordanceKeys.includes("pan"), false);
  assert.deepEqual(
    serializeRogueState(state).village.development.masterPlan.regionalContext
      .geologyKnowledge.placerSites,
    regional.geologyKnowledge.placerSites,
  );
});

test("M-3 player and NPC door interactions apply the same effect", () => {
  const playerState = villageState(),
    npcState = villageState(),
    playerDoor = playerState.village.doors.find(
      (door) => door.buildingKey === "smithy",
    ),
    npcDoor = npcState.village.doors.find(
      (door) => door.buildingKey === "smithy",
    ),
    npc = npcState.village.npcStates.find(
      (actor) => actor.personKey === "watchman",
    ),
    playerEvents = [],
    npcEvents = [];
  playerState.village.heroPosition = { x: playerDoor.x, y: playerDoor.y + 1 };
  npc.position = { x: npcDoor.x, y: npcDoor.y + 1 };
  const playerObject = villageWorldObjectAt(
      playerState,
      playerDoor.x,
      playerDoor.y,
    ),
    npcObject = villageWorldObjectAt(npcState, npcDoor.x, npcDoor.y);
  executeVillageInteraction(
    playerState,
    {
      actorId: playerState.hero.id,
      objectId: playerObject.id,
      action: "open",
      ...playerObject.position,
    },
    playerEvents,
  );
  executeVillageInteraction(
    npcState,
    {
      actorId: npc.id,
      objectId: npcObject.id,
      action: "open",
      ...npcObject.position,
    },
    npcEvents,
  );
  assert.equal(playerDoor.state, "open");
  assert.equal(npcDoor.state, "open");
  assert.deepEqual(
    normalizedDoorEvent(playerEvents[0]),
    normalizedDoorEvent(npcEvents[0]),
  );
});

test("M-3 mutating object effects cannot be applied twice", () => {
  const state = villageState(),
    door = state.village.doors.find(
      (candidate) => candidate.buildingKey === "smithy",
    );
  state.village.heroPosition = { x: door.x, y: door.y + 1 };
  const object = villageWorldObjectAt(state, door.x, door.y),
    intent = {
      kind: "world_interact",
      objectId: object.id,
      action: "open",
      ...object.position,
    },
    opened = applyRogueTurn(state, intent);
  assert.equal(
    opened.events.filter((event) => event.type === "door_opened").length,
    1,
  );
  assert.throws(
    () => applyRogueTurn(state, intent),
    (error) => error.code === "AFFORDANCE_UNAVAILABLE",
  );
  assert.equal(door.state, "open");
});

test("M-3 persisted request replay does not apply an object effect twice", () => {
  const directory = mkdtempSync(join(tmpdir(), "world-object-store-")),
    database = join(directory, "rogue.sqlite"),
    store = new RogueStore(database);
  try {
    const created = store.create({ ...input, requestId: "object-run" }),
      state = store.get(created.runId),
      door = state.village.doors.find(
        (candidate) => candidate.buildingKey === "smithy",
      );
    state.location = "village";
    state.village.heroPosition = { x: door.x, y: door.y + 1 };
    store.db
      .prepare("UPDATE rogue_runs SET state=? WHERE id=?")
      .run(JSON.stringify(serializeRogueState(state)), state.id);
    const object = villageWorldObjectAt(state, door.x, door.y),
      turn = {
        runId: state.id,
        expectedRevision: 0,
        requestId: "open-smithy-once",
        intent: {
          kind: "world_interact",
          objectId: object.id,
          action: "open",
          ...object.position,
        },
      },
      first = store.act(turn),
      replay = store.act(turn),
      saved = store.get(state.id);
    assert.deepEqual(replay, { ...first, replayed: true });
    assert.equal(saved.revision, 1);
    assert.equal(
      saved.village.doors.find((candidate) => candidate.id === door.id).state,
      "open",
    );
    assert.equal(store.log(state.id).length, 1);
  } finally {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
