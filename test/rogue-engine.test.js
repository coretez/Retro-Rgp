import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Dice } from "../src/dice.js";
import {
  applyRogueTurn,
  DIRECTIONS,
  newRogueRun,
  parseRogueState,
  rogueRunView,
  serializeRogueState,
} from "../src/rogue-engine.js";
import { RogueStore } from "../src/rogue-store.js";
import { applyTypedDamage, resolveDeathSave } from "../src/rogue-rules.js";
import { route } from "../src/spatial.js";
import { createGroup } from "../src/group-logic.js";

const input = {
  requestId: "create-demo",
  seed: "demo-seed",
  heroName: "Mara",
  form: "hybrid",
  size: "small",
};

const direction = (from, to) =>
  Object.entries(DIRECTIONS).find(
    ([, [dx, dy]]) => from.x + dx === to.x && from.y + dy === to.y,
  )[0];

test("roguelike floors use expansive exploration dimensions", () => {
  const standard = newRogueRun(input);
  assert.deepEqual(
    { width: standard.map.width, height: standard.map.height },
    { width: 56, height: 40 },
  );
  const vast = newRogueRun({ ...input, size: "medium" });
  assert.deepEqual(
    { width: vast.map.width, height: vast.map.height },
    { width: 72, height: 52 },
  );
  assert.equal(standard.maxDepth, 5);
  assert.equal(newRogueRun({ ...input, levels: 3 }).maxDepth, 3);
  assert.equal(newRogueRun({ ...input, levels: 8 }).maxDepth, 8);
  const view = rogueRunView(standard);
  assert.ok(view.theme.history.length >= 2);
  assert.match(view.theme.construction, /./);
  assert.match(view.theme.state, /./);
});

test("typed damage applies immunity, resistance, vulnerability and temporary HP in SRD order", () => {
  const resistant = {
    hp: 10,
    tempHp: 3,
    resistances: ["fire"],
    vulnerabilities: [],
    immunities: [],
  };
  assert.deepEqual(applyTypedDamage(resistant, 9, "fire"), {
    raw: 9,
    adjusted: 4,
    absorbedByTemporaryHp: 3,
    hpDamage: 1,
    damageType: "fire",
    instantDeath: false,
  });
  assert.equal(resistant.hp, 9);
  assert.equal(resistant.tempHp, 0);

  const immune = {
    hp: 10,
    tempHp: 2,
    immunities: ["poison"],
  };
  assert.equal(applyTypedDamage(immune, 20, "poison").hpDamage, 0);
  assert.equal(immune.tempHp, 2);

  const vulnerable = { hp: 20, tempHp: 0, vulnerabilities: ["cold"] };
  assert.equal(applyTypedDamage(vulnerable, 4, "cold").hpDamage, 8);
  assert.equal(vulnerable.hp, 12);
});

test("death saves preserve natural 1, natural 20 and stabilization semantics", () => {
  const hero = {
    hp: 0,
    death: { successes: 0, failures: 0 },
    conditions: ["unconscious"],
  };
  assert.equal(resolveDeathSave(hero, new Dice(() => 1)).death.failures, 2);
  hero.death = { successes: 2, failures: 0 };
  assert.equal(resolveDeathSave(hero, new Dice(() => 10)).result, "stable");
  hero.death = { successes: 0, failures: 0 };
  assert.equal(resolveDeathSave(hero, new Dice(() => 20)).result, "revived");
  assert.equal(hero.hp, 1);
  assert.deepEqual(hero.conditions, []);
});

test("one accepted intent advances one tick and resolves an adjacent enemy response", () => {
  const state = newRogueRun(input);
  const open = new Set(state.map.blocked.map((cell) => `${cell.x},${cell.y}`));
  const adjacent = Object.values(DIRECTIONS)
    .map(([dx, dy]) => ({ x: state.hero.x + dx, y: state.hero.y + dy }))
    .find(
      (cell) =>
        !open.has(`${cell.x},${cell.y}`) &&
        cell.x >= 0 &&
        cell.y >= 0 &&
        cell.x < state.map.width &&
        cell.y < state.map.height,
    );
  state.enemies = [
    {
      id: "enemy-test",
      template: "cave_rat",
      name: "Test Rat",
      ...adjacent,
      hp: 7,
      maxHp: 7,
      ac: 15,
      attackBonus: 4,
      damage: "1d6+2",
      aware: true,
      lastKnown: { x: state.hero.x, y: state.hero.y },
    },
  ];
  const dice = new Dice((sides) => (sides === 20 ? 15 : 3));
  const before = state.hero.hp;
  const outcome = applyRogueTurn(state, { kind: "wait" }, dice);
  assert.equal(state.tick, 1);
  assert.equal(state.hero.hp, before - 5);
  assert.deepEqual(
    outcome.events.map((event) => event.type),
    ["hero_wait", "attack"],
  );
});

test("party orders are authoritative, revisioned roguelike turns", () => {
  const state = newRogueRun(input);
  state.enemies = [];
  const outcome = applyRogueTurn(state, {
    kind: "command",
    groupId: "party",
    issuerId: "hero",
    expectedCommandRevision: 0,
    objective: "hold",
    formation: "line",
    resourcePolicy: "conserve",
    retreatThreshold: 35,
  });
  assert.equal(state.partyGroup.commandRevision, 1);
  assert.equal(state.partyGroup.order.objective, "hold");
  assert.equal(state.partyGroup.order.formation, "line");
  assert.ok(
    outcome.events.some((event) => event.type === "group_order_issued"),
  );
  const view = rogueRunView(state);
  assert.equal(view.groups.party.order.resourcePolicy, "conserve");
  assert.ok(view.legalIntents.includes("command"));
});

test("v0.1 run snapshots acquire group state when loaded", () => {
  const legacy = serializeRogueState(newRogueRun(input));
  legacy.schemaVersion = 2;
  delete legacy.partyGroup;
  for (const level of legacy.levels) {
    delete level.enemyGroups;
    for (const enemy of level.enemies) delete enemy.groupId;
  }
  const migrated = parseRogueState(legacy);
  assert.equal(migrated.partyGroup.leaderId, "hero");
  assert.ok(migrated.enemyGroups.length > 0);
  assert.ok(migrated.enemies.every((enemy) => enemy.groupId));
});

test("enemy members execute their persisted group retreat policy", () => {
  const state = newRogueRun(input);
  const level = state.levels[0];
  level.map = {
    grid: "square",
    width: 10,
    height: 10,
    blocked: [],
    difficult: [],
  };
  state.map = level.map;
  state.hero.x = 5;
  state.hero.y = 5;
  const enemy = {
    id: "ordered-enemy",
    template: "goblin_skulk",
    name: "Ordered enemy",
    x: 7,
    y: 5,
    hp: 8,
    maxHp: 8,
    ac: 12,
    attackBonus: 3,
    damage: "1d4+1",
    damageType: "piercing",
    aware: true,
    lastKnown: { x: 5, y: 5 },
    homeRoomId: "none",
    conditions: [],
  };
  state.enemies = level.enemies = [enemy];
  const group = createGroup({
    id: "enemy-test-group",
    name: "Test group",
    side: "enemy",
    members: [{ actorId: enemy.id, role: "scout", commandScore: 20 }],
    leaderId: enemy.id,
    objective: "retreat",
  });
  state.enemyGroups = level.enemyGroups = [group];
  const outcome = applyRogueTurn(state, { kind: "wait" });
  assert.ok(
    outcome.events.some(
      (event) =>
        event.type === "enemy_move" && event.reason === "retreat_group_order",
    ),
  );
  assert.ok(Math.max(Math.abs(enemy.x - 5), Math.abs(enemy.y - 5)) > 2);
});

test("treasure is collected once by entering its cell and is hidden until visible", () => {
  const state = newRogueRun(input);
  state.enemies = [];
  state.doors.forEach((door) => (door.state = "open"));
  const treasure = state.treasures[0];
  const initial = rogueRunView(state);
  const initialCell = initial.map.cells.find(
    (cell) => cell.x === treasure.x && cell.y === treasure.y,
  );
  if (!initialCell || initialCell.visibility !== "visible")
    assert.equal(initialCell?.treasure, undefined);
  const travel = route(state.map, state.hero, treasure, new Set()).path;
  let collected = 0;
  for (let index = 1; index < travel.length; index++) {
    const result = applyRogueTurn(state, {
      kind: "move",
      direction: direction(travel[index - 1], travel[index]),
    });
    collected += result.events.filter(
      (event) => event.type === "treasure_collected",
    ).length;
  }
  assert.ok(collected >= 1);
  assert.equal(
    state.hero.treasures.filter((item) => item.id === treasure.id).length,
    1,
  );
  assert.ok(state.hero.goldCp >= treasure.valueCp);
  const total = state.hero.goldCp;
  applyRogueTurn(state, { kind: "wait" });
  assert.equal(state.hero.goldCp, total);
});

test("stairs connect every generated level and only the final exit completes the run", () => {
  const state = newRogueRun(input);
  let final;
  for (let depth = 1; depth <= state.maxDepth; depth++) {
    assert.equal(state.depth, depth);
    state.enemies = [];
    state.doors.forEach((door) => (door.state = "open"));
    const travel = route(state.map, state.hero, state.exit, new Set()).path;
    for (let index = 1; index < travel.length; index++)
      final = applyRogueTurn(state, {
        kind: "move",
        direction: direction(travel[index - 1], travel[index]),
      });
    if (depth < state.maxDepth) {
      assert.equal(state.status, "active");
      applyRogueTurn(state, { kind: "stairs" });
    }
  }
  assert.equal(state.status, "won");
  assert.ok(final.events.some((event) => event.type === "exit_reached"));
  assert.deepEqual(rogueRunView(state).legalIntents, []);
});

test("search reveals nearby hidden treasure and a potion restores health", () => {
  const state = newRogueRun(input);
  state.enemies = [];
  const hidden = state.treasures.find((item) => item.hidden);
  state.hero.x = hidden.x;
  state.hero.y = hidden.y;
  const search = applyRogueTurn(
    state,
    { kind: "search" },
    new Dice((sides) => (sides === 20 ? 20 : 4)),
  );
  assert.equal(hidden.hidden, false);
  assert.ok(search.events.some((event) => event.type === "search"));
  state.hero.hp = 10;
  applyRogueTurn(
    state,
    { kind: "use_item", itemKind: "healing_potion" },
    new Dice(() => 4),
  );
  assert.equal(state.hero.hp, 20);
  assert.equal(
    state.hero.inventory.find((item) => item.kind === "healing_potion")
      .quantity,
    0,
  );
});

test("movement passively notices hidden features without spending a search turn", () => {
  const state = newRogueRun(input);
  state.enemies = [];
  const hidden = state.treasures.find((item) => item.hidden);
  state.hero.x = hidden.x > 0 ? hidden.x - 1 : hidden.x + 1;
  state.hero.y = hidden.y;
  const outcome = applyRogueTurn(
    state,
    { kind: "move", direction: direction(state.hero, hidden) },
    new Dice((sides) => (sides === 20 ? 20 : 4)),
  );
  assert.equal(hidden.hidden, false);
  assert.ok(outcome.events.some((event) => event.type === "discovery"));
  assert.ok(
    outcome.events.some((event) => event.type === "treasure_collected"),
  );
});

test("found equipment can be equipped and updates the combat chassis", () => {
  const state = newRogueRun(input);
  state.enemies = [];
  const groundItem = state.features.find(
    (feature) => feature.itemKind === "iron_mace",
  );
  state.hero.x = groundItem.x - 1;
  state.hero.y = groundItem.y;
  const pickup = applyRogueTurn(state, {
    kind: "move",
    direction: direction(state.hero, groundItem),
  });
  assert.ok(pickup.events.some((event) => event.type === "item_collected"));
  const mace = state.hero.inventory.find((item) => item.kind === "iron_mace");
  const equipped = applyRogueTurn(state, { kind: "equip", itemId: mace.id });
  assert.equal(state.hero.weapon, "iron_mace");
  assert.equal(state.hero.damage, "1d6+3");
  assert.equal(mace.equipped, true);
  assert.ok(
    equipped.events.some((event) => event.type === "equipment_changed"),
  );
});

test("offhand equipment can be removed from the loadout", () => {
  const state = newRogueRun({ ...input, heroClass: "cleric" });
  const shield = state.hero.inventory.find(
    (item) => item.itemType === "equipment" && item.slot === "offhand",
  );
  assert.ok(shield?.equipped);
  const armoredAc = state.hero.ac;
  const outcome = applyRogueTurn(state, {
    kind: "unequip",
    slot: "offhand",
  });
  assert.equal(state.hero.equipment.offhand, null);
  assert.equal(shield.equipped, false);
  assert.equal(state.hero.ac, armoredAc - shield.acBonus);
  assert.ok(outcome.events.some((event) => event.type === "equipment_removed"));
});

test("a safe short rest spends a Hit Die and restores health", () => {
  const state = newRogueRun(input);
  state.enemies = [];
  state.hero.hp = 2;
  const outcome = applyRogueTurn(
    state,
    { kind: "short_rest" },
    new Dice(() => 6),
  );
  assert.equal(state.hero.hp, 9);
  assert.equal(state.hero.hitDice.remaining, 2);
  assert.ok(outcome.events.some((event) => event.type === "short_rest"));
});

test("a short rest is refused while an enemy is close", () => {
  const state = newRogueRun(input);
  state.hero.hp = 2;
  state.enemies = [
    {
      id: "rest-threat",
      template: "cave_rat",
      name: "Rest Threat",
      x: state.hero.x + 1,
      y: state.hero.y,
      hp: 5,
      maxHp: 5,
    },
  ];
  assert.throws(
    () => applyRogueTurn(state, { kind: "short_rest" }),
    /too close to rest safely/,
  );
});

test("class selection provides distinct powers and solo XP advancement", () => {
  const state = newRogueRun({ ...input, heroClass: "mage" });
  assert.equal(state.hero.class, "mage");
  assert.equal(state.hero.maxHp, 16);
  assert.equal(state.hero.classPower.id, "magic_missile");
  state.hero.xp = 390;
  state.enemies = [
    {
      id: "spell-target",
      template: "cave_rat",
      name: "Spell Target",
      x: state.hero.x,
      y: state.hero.y,
      hp: 5,
      maxHp: 5,
      ac: 12,
      attackBonus: 3,
      damage: "1d4+1",
      damageType: "piercing",
      aware: true,
      lastKnown: null,
    },
  ];
  const outcome = applyRogueTurn(
    state,
    { kind: "class_power" },
    new Dice(() => 4),
  );
  assert.ok(outcome.events.some((event) => event.type === "spell_cast"));
  assert.ok(outcome.events.some((event) => event.type === "xp_gained"));
  assert.ok(outcome.events.some((event) => event.type === "level_up"));
  assert.equal(state.hero.level, 4);
  assert.equal(state.hero.classPower.remaining, 3);
});

test("shrines and tomes permanently improve the hero", () => {
  const state = newRogueRun(input);
  state.enemies = [];
  const shrine = state.features.find((feature) => feature.kind === "shrine");
  state.hero.x = shrine.x - 1;
  state.hero.y = shrine.y;
  const beforeShrine = state.hero.maxHp;
  const blessing = applyRogueTurn(state, {
    kind: "move",
    direction: direction(state.hero, shrine),
  });
  assert.equal(state.hero.maxHp, beforeShrine + 2);
  assert.ok(
    blessing.events.some((event) => event.type === "blessing_received"),
  );
  state.hero.inventory.push({
    id: "test-tome",
    kind: "tome_vigor",
    name: "Tome of Vigor",
    itemType: "relic",
    effect: "+3 maximum HP permanently",
    quantity: 1,
  });
  const beforeTome = state.hero.maxHp;
  const reading = applyRogueTurn(state, {
    kind: "invoke_item",
    itemId: "test-tome",
  });
  assert.equal(state.hero.maxHp, beforeTome + 3);
  assert.ok(reading.events.some((event) => event.type === "permanent_gain"));
});

test("wands spend charges and damage a visible enemy", () => {
  const state = newRogueRun(input);
  state.hero.inventory.push({
    id: "test-wand",
    kind: "wand_arc",
    name: "Wand of Arcing Sparks",
    itemType: "wand",
    effect: "2d6 lightning damage to the nearest visible enemy",
    charges: 3,
    quantity: 1,
  });
  state.enemies = [
    {
      id: "wand-target",
      template: "cave_rat",
      name: "Wand Target",
      x: state.hero.x,
      y: state.hero.y,
      hp: 20,
      maxHp: 20,
      ac: 12,
      attackBonus: 0,
      damage: "1d1",
      damageType: "piercing",
      aware: false,
      lastKnown: null,
    },
  ];
  const outcome = applyRogueTurn(
    state,
    { kind: "invoke_item", itemId: "test-wand" },
    new Dice(() => 4),
  );
  assert.equal(state.hero.inventory.at(-1).charges, 2);
  assert.ok(outcome.events.some((event) => event.type === "spell_cast"));
});

test("store persists runs and retries complete turns without advancing twice", () => {
  const directory = mkdtempSync(join(tmpdir(), "rogue-store-"));
  const database = join(directory, "rogue.sqlite");
  let store = new RogueStore(database, {
    dice: new Dice((sides) => (sides === 20 ? 10 : 3)),
  });
  try {
    const created = store.create(input);
    const turnInput = {
      runId: created.runId,
      expectedRevision: 0,
      requestId: "turn-1",
      intent: { kind: "wait" },
    };
    const first = store.act(turnInput);
    const replay = store.act(turnInput);
    assert.deepEqual(replay, { ...first, replayed: true });
    assert.equal(store.get(created.runId).tick, 1);
    store.close();
    store = new RogueStore(database);
    assert.equal(store.view(created.runId).revision, 1);
    assert.equal(store.log(created.runId).length, 1);
  } finally {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
