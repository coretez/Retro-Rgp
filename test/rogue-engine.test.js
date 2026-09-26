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
import { gridDistance, route } from "../src/spatial.js";
import { createGroup } from "../src/group-logic.js";
import { definitionId, isUuid, newInstanceId } from "../src/identity.js";

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

test("new runs create the established four-character party in larger rooms", () => {
  const state = newRogueRun(input),
    actors = [state.hero, ...state.companions],
    positions = new Set(actors.map((actor) => `${actor.x},${actor.y}`));
  assert.deepEqual(
    state.companions.map((companion) => companion.name),
    ["Niklas Ried", "Adelheid Bauer", "Konrad Falk"],
  );
  assert.equal(state.partyGroup.memberIds.length, 4);
  assert.equal(state.partyGroup.order.movementMode, "follow_leader");
  assert.equal(positions.size, 4);
  assert.ok(state.rooms.every((room) => room.width >= 6 && room.height >= 5));
  const view = rogueRunView(state);
  assert.equal(view.companions.length, 3);
  assert.equal(view.map.cells.filter((cell) => cell.partyMember).length, 3);
});

test("companions follow the leader trail without stacking on a reversal", () => {
  const state = newRogueRun(input);
  state.enemies = state.levels[0].enemies = [];
  const before = [state.hero, ...state.companions].map(({ x, y }) => ({
    x,
    y,
  }));
  const occupied = new Set(
    state.companions.map((actor) => `${actor.x},${actor.y}`),
  );
  const blockedCells = new Set(
    state.map.blocked.map((cell) => `${cell.x},${cell.y}`),
  );
  const step = Object.entries(DIRECTIONS).find(([, [dx, dy]]) => {
    const x = state.hero.x + dx,
      y = state.hero.y + dy;
    return !occupied.has(`${x},${y}`) && !blockedCells.has(`${x},${y}`);
  });
  const outcome = applyRogueTurn(state, { kind: "move", direction: step[0] });
  assert.deepEqual(
    state.companions.map(({ x, y }) => ({ x, y })),
    before.slice(0, 3),
  );
  assert.equal(
    outcome.events.filter((event) => event.type === "companion_move").length,
    3,
  );
  const reverse = direction(state.hero, before[0]);
  applyRogueTurn(state, { kind: "move", direction: reverse });
  const positions = new Set(
    [state.hero, ...state.companions].map((actor) => `${actor.x},${actor.y}`),
  );
  assert.equal(positions.size, 4);
});

test("dungeon inhabitants can be generated as spatial creature packs", () => {
  const state = newRogueRun(input),
    pack = state.enemyGroups.find((group) => group.memberIds.length > 1);
  assert.ok(pack);
  const members = pack.memberIds.map((actorId) =>
    state.enemies.find((enemy) => enemy.id === actorId),
  );
  assert.ok(members.every((member) => member.groupId === pack.id));
  assert.equal(new Set(members.map((member) => member.homeRoomId)).size, 1);
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
  state.companions.forEach((companion) => {
    companion.hp = 0;
    companion.dead = true;
  });
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
    ["hero_wait", "formation_adopted", "attack"],
  );
});

test("a stopped leader deploys companions into distinct formation slots", () => {
  const state = newRogueRun(input),
    level = state.levels[0];
  level.map = state.map = {
    grid: "square",
    width: 15,
    height: 15,
    blocked: [],
    difficult: [],
  };
  state.enemies = level.enemies = [];
  Object.assign(state.hero, { x: 7, y: 7 });
  state.companions.forEach((companion, index) =>
    Object.assign(companion, { x: 7, y: 8 + index }),
  );
  const ordered = applyRogueTurn(state, {
    kind: "command",
    groupId: state.partyGroup.id,
    issuerId: state.hero.id,
    expectedCommandRevision: 0,
    objective: "hold",
    formation: "line",
    resourcePolicy: "balanced",
    retreatThreshold: 25,
    movementMode: "follow_leader",
  });
  applyRogueTurn(state, { kind: "wait" });
  applyRogueTurn(state, { kind: "wait" });
  assert.ok(
    ordered.events.some(
      (event) =>
        event.type === "formation_adopted" && event.reason === "leader_order",
    ),
  );
  assert.deepEqual(
    state.companions.map(({ x, y }) => ({ x, y })),
    [
      { x: 6, y: 7 },
      { x: 8, y: 7 },
      { x: 7, y: 8 },
    ],
  );
  assert.equal(state.partyTactics.phase, "deployed");
});

test("engagement keeps support in formation while frontline closes and rear guard fires", () => {
  const state = newRogueRun(input),
    level = state.levels[0],
    [niklas, adelheid, konrad] = state.companions;
  level.map = state.map = {
    grid: "square",
    width: 15,
    height: 15,
    blocked: [],
    difficult: [],
  };
  Object.assign(state.hero, { x: 7, y: 7 });
  Object.assign(niklas, { x: 6, y: 7 });
  Object.assign(adelheid, { x: 8, y: 7 });
  Object.assign(konrad, { x: 7, y: 8 });
  state.partyGroup.order.formation = "line";
  state.partyTactics.phase = "deployed";
  const enemy = {
    id: newInstanceId(),
    definitionId: definitionId("actor", "creature:goblin_skulk"),
    entityType: "actor",
    template: "goblin_skulk",
    name: "Formation target",
    x: 10,
    y: 7,
    hp: 40,
    maxHp: 40,
    ac: 12,
    attackBonus: 3,
    damage: "1d4+1",
    damageType: "piercing",
    aware: true,
    lastKnown: null,
    homeRoomId: "none",
    conditions: [],
  };
  state.enemies = level.enemies = [enemy];
  const outcome = applyRogueTurn(
    state,
    { kind: "wait" },
    new Dice((sides) => (sides === 20 ? 15 : 3)),
  );
  assert.equal(state.partyTactics.phase, "engaged");
  assert.ok(
    outcome.events.some(
      (event) =>
        event.type === "companion_move" &&
        event.actorId === niklas.id &&
        event.reason === "protect_ranged_ally",
    ),
  );
  assert.ok(
    outcome.events.some(
      (event) => event.type === "attack" && event.actorId === konrad.id,
    ),
  );
  assert.equal(adelheid.x, 8);
  assert.equal(adelheid.y, 7);
});

test("rear guards create space while melee companions intercept backline threats", () => {
  const state = newRogueRun(input),
    level = state.levels[0],
    [niklas, adelheid, konrad] = state.companions;
  level.map = state.map = {
    grid: "square",
    width: 15,
    height: 15,
    blocked: [],
    difficult: [],
  };
  Object.assign(state.hero, { x: 5, y: 5 });
  Object.assign(niklas, { x: 4, y: 5 });
  Object.assign(adelheid, { x: 5, y: 6 });
  Object.assign(konrad, { x: 5, y: 7 });
  state.partyGroup.order.formation = "line";
  state.partyTactics.phase = "engaged";
  const makeEnemy = (name, x, y) => ({
      id: newInstanceId(),
      definitionId: definitionId("actor", "creature:goblin_skulk"),
      entityType: "actor",
      template: "goblin_skulk",
      name,
      x,
      y,
      hp: 40,
      maxHp: 40,
      ac: 12,
      attackBonus: 3,
      damage: "1d4+1",
      damageType: "piercing",
      aware: true,
      lastKnown: null,
      homeRoomId: "none",
      conditions: [],
    }),
    distantDecoy = makeEnemy("Distant decoy", 2, 5),
    backlineThreat = makeEnemy("Backline threat", 6, 7);
  state.enemies = level.enemies = [distantDecoy, backlineThreat];
  const beforeSpace = gridDistance("square", konrad, backlineThreat),
    outcome = applyRogueTurn(
      state,
      { kind: "wait" },
      new Dice((sides) => (sides === 20 ? 15 : 3)),
    );
  assert.ok(
    outcome.events.some(
      (event) =>
        event.type === "companion_move" &&
        event.actorId === niklas.id &&
        event.reason === "protect_ranged_ally",
    ),
  );
  assert.ok(
    outcome.events.some(
      (event) =>
        event.type === "companion_move" &&
        event.actorId === konrad.id &&
        event.reason === "withdraw_to_ranged_position",
    ),
  );
  assert.ok(gridDistance("square", konrad, backlineThreat) > beforeSpace);
});

test("party orders are authoritative, revisioned roguelike turns", () => {
  const state = newRogueRun(input);
  state.enemies = [];
  const outcome = applyRogueTurn(state, {
    kind: "command",
    groupId: state.partyGroup.id,
    issuerId: state.hero.id,
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
  legacy.hero.id = "hero";
  delete legacy.hero.definitionId;
  delete legacy.hero.entityType;
  delete legacy.companions;
  legacy.hero.inventory[0].id = "starting-weapon";
  delete legacy.hero.inventory[0].definitionId;
  legacy.hero.equipment.weapon = "starting-weapon";
  legacy.levels[0].enemies[0].id = "enemy-one";
  delete legacy.levels[0].enemies[0].definitionId;
  delete legacy.partyGroup;
  for (const level of legacy.levels) {
    delete level.enemyGroups;
    for (const enemy of level.enemies) delete enemy.groupId;
  }
  const copy = structuredClone(legacy),
    migrated = parseRogueState(legacy),
    migratedAgain = parseRogueState(copy);
  assert.ok(isUuid(migrated.hero.id));
  assert.equal(migrated.hero.id, migratedAgain.hero.id);
  assert.equal(
    migrated.hero.inventory[0].id,
    migratedAgain.hero.inventory[0].id,
  );
  assert.equal(migrated.hero.equipment.weapon, migrated.hero.inventory[0].id);
  assert.equal(migrated.partyGroup.leaderId, migrated.hero.id);
  assert.equal(migrated.partyGroup.memberIds.length, 4);
  assert.equal(
    new Set(
      [migrated.hero, ...migrated.companions].map(
        (actor) => `${actor.x},${actor.y}`,
      ),
    ).size,
    4,
  );
  assert.ok(migrated.enemyGroups.length > 0);
  assert.ok(migrated.enemies.every((enemy) => enemy.groupId));
});

test("saved enemy groups preserve the absence of a living leader", () => {
  const state = newRogueRun(input),
    group = state.enemyGroups[0];
  group.leaderId = null;
  group.order.issuedBy = null;
  const restored = parseRogueState(serializeRogueState(state)),
    restoredGroup = restored.enemyGroups.find(({ id }) => id === group.id);
  assert.equal(restoredGroup.leaderId, null);
  assert.equal(restoredGroup.order.issuedBy, null);
});

test("a monster shown as visible is a valid magical target", () => {
  const state = newRogueRun({ ...input, heroClass: "mage" }),
    level = state.levels[0],
    enemy = state.enemies[0];
  state.hero.x = 2;
  state.hero.y = 2;
  level.map = {
    grid: "square",
    width: 8,
    height: 8,
    blocked: [{ x: 3, y: 2 }],
    difficult: [],
  };
  enemy.x = 4;
  enemy.y = 1;
  enemy.hp = enemy.maxHp = 30;
  state.enemies = level.enemies = [enemy];
  const cell = rogueRunView(state).map.cells.find(
    ({ x, y }) => x === enemy.x && y === enemy.y,
  );
  assert.equal(cell.visibility, "visible");
  assert.equal(cell.enemy.id, enemy.id);
  assert.equal(cell.enemy.adversaryKind, "monster");
  enemy.template = "tomb_scavenger";
  const humanAdversary = rogueRunView(state).map.cells.find(
    ({ x, y }) => x === enemy.x && y === enemy.y,
  );
  assert.equal(humanAdversary.enemy.adversaryKind, "hostile_human");
  const outcome = applyRogueTurn(
    state,
    { kind: "class_power" },
    new Dice(() => 2),
  );
  assert.ok(outcome.events.some((event) => event.type === "spell_cast"));
});

test("bows and thrown weapons attack the explicitly selected visible target", () => {
  const state = newRogueRun(input),
    level = state.levels[0],
    enemy = state.enemies[0];
  level.map = state.map = {
    grid: "square",
    width: 12,
    height: 8,
    blocked: [],
    difficult: [],
  };
  state.hero.x = 2;
  state.hero.y = 2;
  enemy.x = 7;
  enemy.y = 2;
  enemy.hp = enemy.maxHp = 100;
  state.enemies = level.enemies = [enemy];
  const bow = {
    id: newInstanceId(),
    definitionId: definitionId("item", "shortbow"),
    entityType: "item",
    kind: "shortbow",
    name: "Shortbow",
    itemType: "equipment",
    slot: "weapon",
    attackBonus: 5,
    damage: "1d6+3",
    damageType: "piercing",
    rangeSquares: 10,
    quantity: 1,
    equipped: true,
  };
  state.hero.inventory.push(bow);
  state.hero.equipment.weapon = bow.id;
  state.hero.weapon = bow.kind;
  state.hero.attackBonus = bow.attackBonus;
  state.hero.damage = bow.damage;
  state.hero.damageType = bow.damageType;
  const shot = applyRogueTurn(
    state,
    { kind: "ranged_attack", targetId: enemy.id },
    new Dice((sides) => (sides === 20 ? 20 : 4)),
  );
  assert.ok(
    shot.events.some(
      (event) => event.type === "attack" && event.targetId === enemy.id,
    ),
  );
  const axe = {
    id: newInstanceId(),
    definitionId: definitionId("item", "battleaxe"),
    entityType: "item",
    kind: "battleaxe",
    name: "Battleaxe",
    itemType: "equipment",
    slot: "weapon",
    attackBonus: 5,
    damage: "1d8+3",
    damageType: "slashing",
    thrownRange: 4,
    quantity: 1,
  };
  state.hero.inventory.push(axe);
  enemy.x = 5;
  const thrown = applyRogueTurn(
    state,
    { kind: "throw_item", itemId: axe.id, targetId: enemy.id },
    new Dice((sides) => (sides === 20 ? 20 : 4)),
  );
  assert.ok(
    thrown.events.some(
      (event) => event.type === "item_thrown" && event.targetId === enemy.id,
    ),
  );
});

test("scrolls can be aimed at a selected enemy instead of the nearest one", () => {
  const state = newRogueRun(input),
    level = state.levels[0],
    near = state.enemies[0],
    far = state.enemies[1];
  level.map = state.map = {
    grid: "square",
    width: 12,
    height: 8,
    blocked: [],
    difficult: [],
  };
  state.hero.x = 2;
  state.hero.y = 2;
  Object.assign(near, { x: 4, y: 2, hp: 100, maxHp: 100 });
  Object.assign(far, { x: 7, y: 2, hp: 100, maxHp: 100 });
  state.enemies = level.enemies = [near, far];
  const scroll = {
    id: newInstanceId(),
    definitionId: definitionId("item", "scroll_flame"),
    entityType: "item",
    kind: "scroll_flame",
    name: "Scroll of Flame",
    itemType: "scroll",
    effect: "3d6 fire damage",
    quantity: 1,
  };
  state.hero.inventory.push(scroll);
  const outcome = applyRogueTurn(
    state,
    { kind: "invoke_item", itemId: scroll.id, targetId: far.id },
    new Dice(() => 4),
  );
  assert.ok(
    outcome.events.some(
      (event) => event.type === "spell_cast" && event.targetId === far.id,
    ),
  );
  assert.equal(near.hp, 100);
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
    id: newInstanceId(),
    definitionId: definitionId("actor", "creature:goblin_skulk"),
    entityType: "actor",
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
    id: newInstanceId(),
    definitionId: definitionId("group", "enemy:test"),
    name: "Test group",
    side: "enemy",
    memberIds: [enemy.id],
    assignments: [{ actorId: enemy.id, role: "scout", commandScore: 20 }],
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

test("party members and monster groups exchange attacks against spatial targets", () => {
  const state = newRogueRun(input),
    level = state.levels[0],
    [niklas, adelheid, konrad] = state.companions;
  level.map = state.map = {
    grid: "square",
    width: 12,
    height: 12,
    blocked: [],
    difficult: [],
  };
  Object.assign(state.hero, { x: 1, y: 1 });
  Object.assign(niklas, { x: 2, y: 1 });
  Object.assign(adelheid, { x: 1, y: 2 });
  Object.assign(konrad, { x: 1, y: 3 });
  const enemy = {
    id: newInstanceId(),
    definitionId: definitionId("actor", "creature:goblin_skulk"),
    entityType: "actor",
    template: "goblin_skulk",
    name: "Pack Guard",
    x: 3,
    y: 1,
    hp: 40,
    maxHp: 40,
    ac: 12,
    attackBonus: 4,
    damage: "1d6+2",
    damageType: "piercing",
    aware: true,
    lastKnown: null,
    homeRoomId: "none",
    conditions: [],
  };
  state.enemies = level.enemies = [enemy];
  state.enemyGroups = level.enemyGroups = [
    createGroup({
      id: newInstanceId(),
      definitionId: definitionId("group", "enemy:test-pack"),
      name: "Test pack",
      side: "enemy",
      memberIds: [enemy.id],
      assignments: [{ actorId: enemy.id, role: "guard", commandScore: 20 }],
      leaderId: enemy.id,
      objective: "advance",
    }),
  ];
  const outcome = applyRogueTurn(
    state,
    { kind: "wait" },
    new Dice((sides) => (sides === 20 ? 15 : 3)),
  );
  const attacks = outcome.events.filter((event) => event.type === "attack");
  assert.ok(attacks.some((event) => event.actorKind === "companion"));
  const enemyAttack = attacks.find((event) => event.actorKind === "enemy");
  assert.notEqual(enemyAttack.targetId, state.hero.id);
  assert.equal(state.hero.hp, state.hero.maxHp);
  const target = state.companions.find(({ id }) => id === enemyAttack.targetId);
  assert.ok(target.hp < target.maxHp);
});

test("the support companion spends limited healing on a wounded party member", () => {
  const state = newRogueRun(input),
    level = state.levels[0],
    enemy = state.enemies[0];
  level.map = state.map = {
    grid: "square",
    width: 20,
    height: 20,
    blocked: [],
    difficult: [],
  };
  Object.assign(state.hero, { x: 5, y: 5 });
  state.companions.forEach((companion, index) =>
    Object.assign(companion, { x: 4, y: 5 + index }),
  );
  state.hero.hp = 5;
  enemy.x = 9;
  enemy.y = 5;
  enemy.aware = true;
  state.enemies = level.enemies = [enemy];
  const support = state.companions.find(({ role }) => role === "support"),
    before = support.supportUses,
    outcome = applyRogueTurn(
      state,
      { kind: "wait" },
      new Dice((sides) => (sides === 20 ? 10 : 2)),
    ),
    healing = outcome.events.find((event) => event.type === "companion_heal");
  assert.equal(healing.targetId, state.hero.id);
  assert.ok(state.hero.hp > 5);
  assert.equal(support.supportUses, before - 1);
});

test("a focus order makes companions prioritize the selected enemy instance", () => {
  const state = newRogueRun(input),
    level = state.levels[0];
  level.map = state.map = {
    grid: "square",
    width: 15,
    height: 15,
    blocked: [],
    difficult: [],
  };
  Object.assign(state.hero, { x: 5, y: 5 });
  state.companions.forEach((companion, index) =>
    Object.assign(companion, { x: 4, y: 5 + index }),
  );
  const makeEnemy = (name, x, y) => ({
    id: newInstanceId(),
    definitionId: definitionId("actor", "creature:goblin_skulk"),
    entityType: "actor",
    template: "goblin_skulk",
    name,
    x,
    y,
    hp: 40,
    maxHp: 40,
    ac: 12,
    attackBonus: 3,
    damage: "1d4+1",
    damageType: "piercing",
    aware: true,
    lastKnown: null,
    homeRoomId: "none",
    conditions: [],
  });
  const decoy = makeEnemy("Decoy", 8, 5),
    priority = makeEnemy("Priority", 8, 7);
  state.enemies = level.enemies = [decoy, priority];
  const outcome = applyRogueTurn(
    state,
    {
      kind: "command",
      groupId: state.partyGroup.id,
      issuerId: state.hero.id,
      expectedCommandRevision: 0,
      objective: "focus",
      formation: "column",
      targetId: priority.id,
      resourcePolicy: "balanced",
      retreatThreshold: 25,
      movementMode: "follow_leader",
    },
    new Dice((sides) => (sides === 20 ? 15 : 3)),
  );
  const companionAttacks = outcome.events.filter(
    (event) => event.type === "attack" && event.actorKind === "companion",
  );
  assert.ok(companionAttacks.length > 0);
  assert.ok(companionAttacks.every((event) => event.targetId === priority.id));
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

test("the party can zoom from a local exterior to world travel and back", () => {
  const state = newRogueRun(input),
    firstExit = { ...state.exit },
    niklas = state.companions[0];
  state.hero.goldCp = 500;
  const exterior = applyRogueTurn(state, { kind: "stairs_up" });
  assert.equal(state.location, "exterior");
  assert.ok(exterior.events.some((event) => event.type === "exterior_entered"));
  let exteriorView = rogueRunView(state);
  assert.deepEqual(exteriorView.legalIntents, [
    "local_move",
    "enter_dungeon",
    "open_world",
  ]);
  assert.equal(exteriorView.map.width, 46);
  assert.equal(
    exteriorView.map.cells.filter((cell) => cell.partyMember).length,
    3,
  );
  assert.ok(exteriorView.map.cells.some((cell) => cell.tile === "road_stone"));
  assert.ok(exteriorView.map.cells.some((cell) => cell.tile === "road_dirt"));
  applyRogueTurn(state, { kind: "local_move", x: 20, y: 15 });
  exteriorView = rogueRunView(state);
  assert.deepEqual(
    { x: exteriorView.hero.x, y: exteriorView.hero.y },
    { x: 20, y: 15 },
  );
  assert.equal(
    new Set(
      exteriorView.map.cells
        .filter((cell) => cell.partyMember)
        .map((cell) => `${cell.x},${cell.y}`),
    ).size,
    3,
  );
  state.exterior.danger = true;
  state.exterior.dangerReason = "Wolves are circling the gatehouse.";
  exteriorView = rogueRunView(state);
  assert.ok(!exteriorView.legalIntents.includes("open_world"));
  assert.throws(
    () => applyRogueTurn(state, { kind: "open_world" }),
    (error) => error.code === "EXTERIOR_DANGER",
  );
  state.exterior.danger = false;
  state.exterior.dangerReason = null;
  applyRogueTurn(state, { kind: "open_world" });
  assert.equal(state.location, "world");
  let world = rogueRunView(state);
  assert.equal(world.world.position, "dungeon_entrance");
  assert.equal(world.world.party.glyph, "群");
  assert.equal(world.world.party.memberCount, 4);
  assert.equal(world.world.open, true);
  assert.equal(world.world.tileSystem, "rolling");
  assert.equal(world.world.cameraMode, "static");
  assert.equal(world.world.map.rolling, true);
  assert.equal(world.world.map.width, 46);
  assert.ok(
    world.world.map.cells.some((cell) => cell.worldX < 0 || cell.worldY < 0),
  );
  assert.ok(world.world.map.cells.some((cell) => cell.tile === "world_water"));
  assert.ok(
    world.world.map.cells.some((cell) => cell.tile === "world_mountain"),
  );
  assert.ok(world.world.routes[0].path.length > 2);
  assert.equal(
    world.world.map.cells.filter((cell) => cell.destination).length,
    2,
  );
  applyRogueTurn(state, { kind: "world_move", x: 9, y: 20 });
  assert.equal(state.world.position, null);
  assert.deepEqual(state.world.coordinates, { x: 9, y: 20 });
  applyRogueTurn(state, { kind: "world_move", x: 8, y: 20 });
  assert.equal(state.world.position, "dungeon_entrance");
  applyRogueTurn(state, {
    kind: "world_travel",
    destination: "stonebridge",
  });
  applyRogueTurn(state, { kind: "enter_location" });
  assert.equal(state.location, "village");
  const village = rogueRunView(state);
  assert.equal(village.village.map.rolling, true);
  assert.ok(
    village.village.map.cells.some((cell) => cell.tile === "village_sign"),
  );
  assert.ok(
    village.village.map.cells.some((cell) => cell.tile === "outdoor_tree"),
  );
  assert.ok(
    village.village.map.cells.some((cell) => cell.tile === "village_furniture"),
  );
  assert.ok(
    village.village.map.cells.some((cell) => cell.tile === "village_person"),
  );
  assert.deepEqual(
    new Set(
      village.village.map.cells
        .map((cell) => cell.person?.category)
        .filter(Boolean),
    ),
    new Set(["civilian", "shopkeeper", "guard"]),
  );
  assert.ok(
    village.village.map.cells.every(
      (cell) => !cell.building || (cell.x !== 19 && cell.y !== 11),
    ),
  );
  assert.ok(
    new Set(
      village.village.map.cells
        .map((cell) => cell.building?.key)
        .filter(Boolean),
    ).size >= 5,
  );
  assert.ok(
    village.village.map.cells.filter((cell) => cell.tile === "village_floor")
      .length > 150,
  );
  assert.ok(!village.legalIntents.includes("shop_buy"));
  assert.ok(village.legalIntents.includes("local_talk"));
  const examined = applyRogueTurn(state, {
    kind: "local_examine",
    x: 21,
    y: 10,
  });
  assert.match(
    examined.events.find((event) => event.type === "local_examined").detail,
    /Stonebridge/,
  );
  const conversation = applyRogueTurn(state, {
    kind: "local_talk",
    x: 20,
    y: 9,
  });
  assert.match(
    conversation.events.find((event) => event.type === "local_talked").dialogue,
    /weapons lowered/,
  );
  const companionsBeforeDispersing = structuredClone(
    state.village.companionPositions,
  );
  applyRogueTurn(state, {
    kind: "set_party_movement",
    mode: "dispersed",
  });
  applyRogueTurn(state, { kind: "local_move", x: 20, y: 12 });
  assert.deepEqual(
    state.village.companionPositions,
    companionsBeforeDispersing,
  );
  assert.deepEqual(rogueRunView(state).village.map.origin, { x: -8, y: -13 });
  applyRogueTurn(state, { kind: "set_party_movement", mode: "follow" });
  assert.throws(
    () =>
      applyRogueTurn(state, {
        kind: "shop_buy",
        actorId: niklas.id,
        itemKind: "scale_mail",
      }),
    (error) => error.code === "SHOP_NOT_PRESENT",
  );
  applyRogueTurn(state, { kind: "local_move", x: 28, y: 12 });
  const opened = applyRogueTurn(state, {
    kind: "local_move",
    x: 28,
    y: 13,
  });
  assert.ok(opened.events.some((event) => event.type === "door_opened"));
  assert.deepEqual(state.village.heroPosition, { x: 28, y: 12 });
  applyRogueTurn(state, { kind: "local_move", x: 28, y: 14 });
  assert.ok(rogueRunView(state).legalIntents.includes("shop_buy"));
  const purchase = applyRogueTurn(state, {
    kind: "shop_buy",
    actorId: niklas.id,
    itemKind: "scale_mail",
  });
  assert.equal(state.hero.goldCp, 200);
  assert.equal(niklas.ac, 16);
  assert.ok(niklas.inventory.some((item) => item.kind === "scale_mail"));
  assert.ok(purchase.events.some((event) => event.type === "item_purchased"));
  applyRogueTurn(state, { kind: "local_move", x: -5, y: 11 });
  const rolled = rogueRunView(state).village;
  assert.ok(rolled.map.origin.x < -4);
  assert.ok(rolled.map.cells.some((cell) => cell.x === -5 && cell.y === 11));
  applyRogueTurn(state, { kind: "open_world" });
  applyRogueTurn(state, {
    kind: "world_travel",
    destination: "dungeon_entrance",
  });
  applyRogueTurn(state, { kind: "enter_location" });
  assert.equal(state.location, "exterior");
  applyRogueTurn(state, { kind: "enter_dungeon" });
  assert.equal(state.location, "dungeon");
  assert.deepEqual(
    { x: state.hero.x, y: state.hero.y },
    { x: state.entrance.x, y: state.entrance.y },
  );
  Object.assign(state.hero, firstExit);
  applyRogueTurn(state, { kind: "stairs" });
  assert.equal(state.depth, 2);
  applyRogueTurn(state, { kind: "stairs_up" });
  assert.equal(state.depth, 1);
  assert.deepEqual(
    { x: state.hero.x, y: state.hero.y },
    { x: state.exit.x, y: state.exit.y },
  );
});

test("town interaction changes terrain, creates materials, and alerts the guard", () => {
  const state = newRogueRun(input);
  state.location = "village";
  const grass = rogueRunView(state).village.map.cells.find(
    (cell) => cell.tile === "outdoor_grass",
  );
  state.village.heroPosition = { x: grass.x - 1, y: grass.y };
  const dug = applyRogueTurn(state, {
    kind: "local_manipulate",
    action: "dig",
    x: grass.x,
    y: grass.y,
  });
  assert.ok(dug.events.some((event) => event.type === "world_manipulated"));
  assert.equal(state.village.modifications.at(-1).kind, "dug_ground");
  assert.equal(state.village.looseMaterials.at(-1).kind, "earth");
  applyRogueTurn(state, {
    kind: "local_manipulate",
    action: "collect",
    x: grass.x,
    y: grass.y,
  });
  assert.equal(state.village.looseMaterials.length, 0);
  assert.ok(
    state.hero.inventory.some(
      (item) => item.itemType === "material" && item.kind === "earth",
    ),
  );
  state.village.heroPosition = { x: 0, y: 1 };
  const breached = applyRogueTurn(state, {
    kind: "local_manipulate",
    action: "breach",
    x: 1,
    y: 1,
  });
  assert.ok(breached.events.some((event) => event.type === "guard_reacted"));
  assert.equal(state.village.wantedLevel, 1);
  const guard = state.village.npcStates.find(
    (npc) => npc.personKey === "watchman",
  );
  assert.equal(guard.actionReason, "property_damage_reported");
  assert.equal(guard.objective, "protect_town");
});

test("town guards walk between patrol waypoints without teleporting", () => {
  const state = newRogueRun(input);
  state.location = "village";
  const guard = state.village.npcStates.find(
    (npc) => npc.personKey === "watchman",
  );
  const positions = [{ ...guard.position }];
  for (const destination of [
    { x: 19, y: 13 },
    { x: 19, y: 12 },
    { x: 19, y: 13 },
    { x: 19, y: 12 },
  ]) {
    applyRogueTurn(state, { kind: "local_move", ...destination });
    positions.push({ ...guard.position });
  }
  for (let index = 1; index < positions.length; index += 1) {
    const dx = Math.abs(positions[index].x - positions[index - 1].x),
      dy = Math.abs(positions[index].y - positions[index - 1].y);
    assert.equal(dx + dy, 1);
  }
  assert.deepEqual(positions, [
    { x: 20, y: 9 },
    { x: 20, y: 10 },
    { x: 20, y: 11 },
    { x: 21, y: 11 },
    { x: 21, y: 12 },
  ]);
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
  const potion = state.hero.inventory.find(
    (item) => item.kind === "healing_potion",
  );
  applyRogueTurn(
    state,
    { kind: "use_item", itemId: potion.id },
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

test("a failed passive search does not consume a deliberate search", () => {
  const state = newRogueRun(input);
  state.enemies = [];
  const hidden = state.treasures.find((item) => item.hidden);
  state.hero.x = hidden.x > 0 ? hidden.x - 1 : hidden.x + 1;
  state.hero.y = hidden.y;
  applyRogueTurn(
    state,
    { kind: "move", direction: direction(state.hero, hidden) },
    new Dice((sides) => (sides === 20 ? 1 : 4)),
  );
  assert.equal(hidden.hidden, true);
  const outcome = applyRogueTurn(
    state,
    { kind: "search" },
    new Dice((sides) => (sides === 20 ? 20 : 4)),
  );
  assert.equal(hidden.hidden, false);
  assert.ok(outcome.events.some((event) => event.type === "search"));
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
  assert.equal(state.hero.classPower.key, "magic_missile");
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
