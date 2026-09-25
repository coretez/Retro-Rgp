import { createHash, randomUUID } from "node:crypto";
import { Dice, RuleError, requireRule as check } from "./dice.js";
import { generateDungeon } from "./dungeon-generator.js";
import { ROGUE_BESTIARY } from "./rogue-bestiary.js";
import {
  applyTypedDamage,
  resolveDeathSave,
  ROGUE_DND_PROFILE,
} from "./rogue-rules.js";
import {
  blocked,
  gridDistance,
  key,
  lineOfSight,
  neighbors,
  paths,
} from "./spatial.js";
import {
  createGroup,
  groupView,
  issueGroupOrder,
  reconcileGroupLeadership,
} from "./group-logic.js";

export const ROGUE_RULESET = "solo-roguelike-v2";
export const DIRECTIONS = {
  north: [0, -1],
  northeast: [1, -1],
  east: [1, 0],
  southeast: [1, 1],
  south: [0, 1],
  southwest: [-1, 1],
  west: [-1, 0],
  northwest: [-1, -1],
};

const ROGUE_EQUIPMENT = {
  longsword: {
    name: "Longsword",
    slot: "weapon",
    attackBonus: 5,
    damage: "1d8+3",
    damageType: "slashing",
  },
  iron_mace: {
    name: "Iron mace",
    slot: "weapon",
    attackBonus: 5,
    damage: "1d6+3",
    damageType: "bludgeoning",
  },
  battleaxe: {
    name: "Battleaxe",
    slot: "weapon",
    attackBonus: 5,
    damage: "1d8+3",
    damageType: "slashing",
  },
  ash_spear: {
    name: "Ash spear",
    slot: "weapon",
    attackBonus: 5,
    damage: "1d6+3",
    damageType: "piercing",
  },
  quarterstaff: {
    name: "Quarterstaff",
    slot: "weapon",
    attackBonus: 4,
    damage: "1d6+2",
    damageType: "bludgeoning",
  },
  chain_shirt: { name: "Chain shirt", slot: "armor", ac: 15 },
  mage_robes: { name: "Mage robes", slot: "armor", ac: 12 },
  scale_mail: { name: "Scale mail", slot: "armor", ac: 16 },
  reinforced_shield: {
    name: "Reinforced shield",
    slot: "offhand",
    acBonus: 2,
  },
};

const HERO_ARCHETYPES = {
  fighter: {
    name: "Fighter",
    maxHp: 25,
    weapon: "longsword",
    armor: "chain_shirt",
    offhand: null,
    levelHp: 7,
    power: { id: "second_wind", name: "Second Wind", uses: 1 },
  },
  mage: {
    name: "Mage",
    maxHp: 16,
    weapon: "quarterstaff",
    armor: "mage_robes",
    offhand: null,
    levelHp: 5,
    power: { id: "magic_missile", name: "Magic Missile", uses: 3 },
  },
  cleric: {
    name: "Cleric",
    maxHp: 21,
    weapon: "iron_mace",
    armor: "chain_shirt",
    offhand: "reinforced_shield",
    levelHp: 6,
    power: { id: "healing_word", name: "Healing Word", uses: 2 },
  },
};

const HERO_HIT_DICE = { fighter: 10, mage: 6, cleric: 8 };

const ROGUE_LORE = {
  fortress_keep: [
    "The keep was raised when the old march road still carried soldiers and tribute. Its gates were designed to divide visitors into small, controllable groups.",
    "The final garrison did not fall in a siege. Pay stopped, discipline fractured, and rival officers sealed stores and corridors against one another.",
    "Later occupants inherited the defenses without understanding the command system, turning old signals, murder holes and barricades into a patchwork of private territories.",
  ],
  human_temple: [
    "Pilgrims once descended in formal procession, moving from public offerings to increasingly private rites below the road.",
    "The sanctuary was stripped after its priesthood vanished, but thieves left the sealed reliquary and service passages largely untouched.",
    "New inhabitants treat sacred boundaries as useful walls, while surviving ritual mechanisms still respond to movement, sound and misplaced offerings.",
  ],
  burial_crypt: [
    "The crypt records a household across generations: honored founders lie deepest, while poorer descendants crowd the later outer chambers.",
    "Grave robbers broke the funerary route and moved names, bones and goods away from their intended places.",
    "Whatever now stirs below reacts less to simple trespass than to the ruined order of kinship, rank and remembrance.",
  ],
  constructed_rooms: [
    "These chambers began as one household whose work rooms, stores and sleeping quarters were arranged around shared routines.",
    "Successive occupants divided the residence with crude partitions, blocked doors and private caches, each rewriting how the place was meant to function.",
    "The result is a layered ruin where a hearth, a barricade and a burial may belong to three different eras of occupation.",
  ],
  natural_cavern: [
    "Water opened these caves long before anyone named the hill above them. Air shafts and seasonal streams still govern every viable route.",
    "Animals established the first paths between drinking pools, warm shelves and hidden nesting chambers.",
    "Intelligent inhabitants followed those trails later, marking and widening only the passages they could hold against the things already living here.",
  ],
  abandoned_mine: [
    "Prospectors followed a narrow mineral seam downward, expanding only where the stone promised enough value to justify timber and labor.",
    "A failure in the main shaft stranded tools, ore and workers' belongings on both sides of the collapse.",
    "Recent digging comes from scavengers with different priorities: they seek abandoned stores and buried access routes rather than the exhausted seam.",
  ],
  underground_river: [
    "Stone landings and gauge marks show that the underground river was once a managed route, not merely an obstacle.",
    "A change in water level drowned the lowest passages and left silt packed against doors that had stood open for generations.",
    "Those who live here now measure safety by current, echo and flood stain; control of a dry crossing is worth more than any formal boundary.",
  ],
  ruin_cavern_hybrid: [
    "The keep was built to command a border road, but its masons anchored the foundations into a hill already hollowed by water and older habitation.",
    "A breached foundation exposed the natural caves. The garrison turned the opening into a sally route, then sealed it when people began disappearing below.",
    "After the keep failed, surface scavengers reclaimed the masonry while creatures from the caves occupied shrines, fissures and forgotten exits. Each side reads the same ruin as a different kind of home.",
  ],
};

const equipmentForDepth = [
  "iron_mace",
  "reinforced_shield",
  "ash_spear",
  "scale_mail",
  "battleaxe",
];

const ROGUE_RELICS = {
  tome_vigor: {
    name: "Tome of Vigor",
    itemType: "relic",
    effect: "+3 maximum HP permanently",
  },
  scroll_flame: {
    name: "Scroll of Flame",
    itemType: "scroll",
    effect: "3d6 fire damage to the nearest visible enemy",
  },
  wand_arc: {
    name: "Wand of Arcing Sparks",
    itemType: "wand",
    effect: "2d6 lightning damage to the nearest visible enemy",
    charges: 3,
  },
  tome_might: {
    name: "Manual of the Bold Hand",
    itemType: "relic",
    effect: "+1 to weapon attacks permanently",
  },
};

const relicForDepth = ["tome_vigor", "wand_arc", "tome_might", "scroll_flame"];

const equipmentItem = (id, kind, equipped = false) => ({
  id,
  kind,
  ...ROGUE_EQUIPMENT[kind],
  itemType: "equipment",
  quantity: 1,
  equipped,
});

const stableId = (value) =>
  createHash("sha256").update(value).digest("hex").slice(0, 16);
const center = (room) => ({
  x: room.x + Math.floor(room.width / 2),
  y: room.y + Math.floor(room.height / 2),
});
const same = (a, b) => a.x === b.x && a.y === b.y;
const active = (state) => state.levels[state.depth - 1];
const aliveEnemies = (state) => state.enemies.filter((enemy) => enemy.hp > 0);
const commandScore = (role) =>
  ({ boss: 100, sentinel: 70, guardian: 60, support: 50, brute: 40 })[role] ??
  20;

function buildEnemyGroups(enemies, depth) {
  const factions = Map.groupBy(
    enemies,
    (enemy) => ROGUE_BESTIARY[enemy.template].faction,
  );
  return [...factions.entries()].map(([faction, actors]) => {
    const members = actors
      .map((enemy) => ({
        actorId: enemy.id,
        role: ROGUE_BESTIARY[enemy.template].role,
        commandScore: commandScore(ROGUE_BESTIARY[enemy.template].role),
      }))
      .sort(
        (a, b) =>
          b.commandScore - a.commandScore || a.actorId.localeCompare(b.actorId),
      );
    return createGroup({
      id: `enemy-group-${depth}-${faction}`,
      name: faction.replaceAll("_", " "),
      side: "enemy",
      members,
      leaderId: members[0].actorId,
      formation: faction === "wildclaw" ? "wedge" : "scatter",
      objective: members.some((member) =>
        ["guardian", "sentinel", "boss"].includes(member.role),
      )
        ? "hold"
        : "advance",
      retreatThreshold: members.some((member) => member.role === "coward")
        ? 50
        : 20,
    });
  });
}
const roomAt = (level, p) =>
  level.rooms.find(
    (r) =>
      p.x >= r.x && p.x < r.x + r.width && p.y >= r.y && p.y < r.y + r.height,
  );

function attachActive(state) {
  const level = active(state);
  for (const field of [
    "map",
    "rooms",
    "entrance",
    "exit",
    "enemies",
    "treasures",
    "doors",
    "features",
    "remembered",
    "enemyGroups",
  ])
    state[field] = level[field];
  state.theme = level.theme;
  return state;
}

function effectiveMap(state) {
  const level = active(state);
  const closed = level.doors
    .filter((door) => door.state === "closed")
    .map(({ x, y }) => ({ x, y }));
  return { ...level.map, blocked: [...level.map.blocked, ...closed] };
}

function attack(attacker, defender, dice, events, actorKind) {
  const attackRoll = dice.d20(attacker.attackBonus);
  const hit =
    attackRoll.natural !== 1 &&
    (attackRoll.natural === 20 || attackRoll.total >= defender.ac);
  let damage = null;
  if (hit) {
    damage = dice.roll(attacker.damage, {
      critical: attackRoll.natural === 20,
    });
    damage.applied = applyTypedDamage(
      defender,
      Math.max(0, damage.total),
      attacker.damageType ??
        ROGUE_BESTIARY[attacker.template]?.damageType ??
        "slashing",
      { critical: attackRoll.natural === 20 },
    );
  }
  events.push({
    type: "attack",
    actorKind,
    actorId: attacker.id,
    actorName: attacker.name,
    actorTemplate: attacker.template ?? null,
    targetId: defender.id,
    targetName: defender.name,
    targetTemplate: defender.template ?? null,
    position: { x: defender.x, y: defender.y },
    attack: attackRoll,
    hit,
    damage,
    appliedDamage: damage?.applied ?? null,
    targetHp: defender.hp,
  });
  if (defender.hp === 0)
    events.push({
      type:
        actorKind === "hero"
          ? "enemy_defeated"
          : defender.dead
            ? "hero_defeated"
            : "hero_unconscious",
      actorId: defender.id,
      actorName: defender.name,
      actorTemplate: defender.template ?? null,
      position: { x: defender.x, y: defender.y },
    });
}

function visibleFloorKeys(state) {
  const visible = new Set(),
    map = effectiveMap(state),
    level = active(state),
    radius = state.visionRadius,
    sightMap = {
      ...map,
      blocked: map.blocked.filter(
        (cell) => gridDistance("square", state.hero, cell) <= radius + 1,
      ),
    };
  for (
    let x = Math.max(0, state.hero.x - radius);
    x <= Math.min(map.width - 1, state.hero.x + radius);
    x++
  )
    for (
      let y = Math.max(0, state.hero.y - radius);
      y <= Math.min(map.height - 1, state.hero.y + radius);
      y++
    ) {
      const cell = { x, y };
      if (
        !blocked(level.map, cell) &&
        gridDistance("square", state.hero, cell) <= radius &&
        lineOfSight(sightMap, state.hero, cell).clear
      )
        visible.add(key(cell));
    }
  return visible;
}

function visibility(state) {
  const floor = visibleFloorKeys(state),
    visible = new Set(floor),
    level = active(state);
  for (const value of floor) {
    const [x, y] = value.split(",").map(Number);
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++) {
        const cell = { x: x + dx, y: y + dy };
        if (
          cell.x >= 0 &&
          cell.y >= 0 &&
          cell.x < level.map.width &&
          cell.y < level.map.height
        )
          visible.add(key(cell));
      }
  }
  for (const value of visible) level.remembered.add(value);
  return visible;
}

function addNoise(state, events, volume, source, cause) {
  const heardBy = [];
  for (const enemy of aliveEnemies(state)) {
    const hearing = ROGUE_BESTIARY[enemy.template].hearing ?? 6;
    if (gridDistance("square", enemy, source) <= Math.min(volume, hearing)) {
      enemy.aware = true;
      enemy.lastKnown = { ...source };
      heardBy.push(enemy.id);
    }
  }
  events.push({
    type: "noise",
    cause,
    volume,
    position: { ...source },
    heardBy,
  });
}

function collectGround(state, events) {
  const level = active(state);
  const treasure = level.treasures.find(
    (item) => !item.collected && !item.hidden && same(item, state.hero),
  );
  if (treasure) {
    treasure.collected = true;
    state.hero.goldCp += treasure.valueCp;
    state.hero.treasures.push({
      id: treasure.id,
      name: treasure.name,
      valueCp: treasure.valueCp,
    });
    events.push({
      type: "treasure_collected",
      actorId: state.hero.id,
      itemId: treasure.id,
      itemName: treasure.name,
      valueCp: treasure.valueCp,
      totalCp: state.hero.goldCp,
      position: { x: treasure.x, y: treasure.y },
    });
  }
  const item = level.features.find(
    (f) =>
      f.kind === "item" && !f.collected && !f.hidden && same(f, state.hero),
  );
  if (item) {
    item.collected = true;
    if (ROGUE_EQUIPMENT[item.itemKind])
      state.hero.inventory.push(equipmentItem(item.id, item.itemKind));
    else if (ROGUE_RELICS[item.itemKind])
      state.hero.inventory.push({
        id: item.id,
        kind: item.itemKind,
        ...ROGUE_RELICS[item.itemKind],
        quantity: 1,
      });
    else {
      const existing = state.hero.inventory.find(
        (entry) => entry.kind === item.itemKind,
      );
      if (existing) existing.quantity += 1;
      else
        state.hero.inventory.push({
          id: item.id,
          kind: item.itemKind,
          name: item.name,
          quantity: 1,
        });
    }
    events.push({
      type: "item_collected",
      itemId: item.id,
      itemName: item.name,
      position: { x: item.x, y: item.y },
    });
  }
}

function triggerTrap(state, dice, events) {
  const trap = active(state).features.find(
    (f) => f.kind === "trap" && !f.spent && same(f, state.hero),
  );
  if (!trap) return;
  trap.revealed = true;
  trap.spent = true;
  const saveAbility = trap.saveAbility ?? "dex",
    save = dice.d20(state.hero.saves[saveAbility]),
    damage = save.total >= trap.dc ? null : dice.roll(trap.damage);
  if (damage)
    damage.applied = applyTypedDamage(
      state.hero,
      damage.total,
      trap.damageType ?? "piercing",
    );
  events.push({
    type: "trap_triggered",
    trapName: trap.name,
    saveAbility,
    save,
    damage,
    position: { x: trap.x, y: trap.y },
  });
  addNoise(state, events, 7, state.hero, "trap");
  if (state.hero.hp === 0) {
    state.status = state.hero.dead ? "dead" : "dying";
    if (!state.hero.conditions.includes("unconscious"))
      state.hero.conditions.push("unconscious");
  }
}

function enemyCanSeeHero(state, enemy) {
  const template = ROGUE_BESTIARY[enemy.template],
    radius = template.role === "ambusher" && !enemy.aware ? 2 : 7;
  return (
    gridDistance("square", enemy, state.hero) <= radius &&
    lineOfSight(effectiveMap(state), enemy, state.hero).clear
  );
}

function enemyStep(state, enemy, retreat = false) {
  const map = effectiveMap(state),
    occupied = new Set(
      aliveEnemies(state)
        .filter((e) => e.id !== enemy.id)
        .map(key),
    );
  occupied.add(key(state.hero));
  if (retreat)
    return (
      neighbors(map, enemy)
        .filter((p) => !occupied.has(key(p)))
        .sort(
          (a, b) =>
            gridDistance("square", b, state.hero) -
            gridDistance("square", a, state.hero),
        )[0] ?? null
    );
  const { costs, previous } = paths(map, enemy, occupied);
  const goals = neighbors(map, state.hero)
    .filter((p) => !occupied.has(key(p)) && costs.has(key(p)))
    .sort(
      (a, b) => costs.get(key(a)) - costs.get(key(b)) || a.y - b.y || a.x - b.x,
    );
  if (!goals.length) return null;
  const path = [goals[0]];
  while (key(path[0]) !== key(enemy)) path.unshift(previous.get(key(path[0])));
  return path[1] ?? null;
}

function enemyGroupPolicy(state, enemy) {
  const group = (state.enemyGroups ?? []).find((candidate) =>
    candidate.members.some((member) => member.actorId === enemy.id),
  );
  if (!group) return { group: null, hold: false, retreat: false, reason: null };
  const actors = group.members
      .map((member) =>
        state.enemies.find((actor) => actor.id === member.actorId),
      )
      .filter(Boolean),
    maximum = actors.reduce((total, actor) => total + actor.maxHp, 0),
    current = actors.reduce((total, actor) => total + Math.max(0, actor.hp), 0),
    healthPercent = maximum ? Math.floor((current / maximum) * 100) : 0,
    orderedRetreat = group.order.objective === "retreat",
    thresholdRetreat = healthPercent <= group.order.retreatThreshold;
  return {
    group,
    hold: group.order.objective === "hold",
    retreat: orderedRetreat || thresholdRetreat,
    reason: orderedRetreat
      ? "retreat_group_order"
      : thresholdRetreat
        ? "retreat_group_threshold"
        : null,
  };
}

function resolveEnemies(state, dice, events) {
  const level = active(state);
  for (const group of state.enemyGroups ?? []) {
    const change = reconcileGroupLeadership(group, state.enemies);
    if (change) {
      const actor = state.enemies.find(
        (enemy) =>
          enemy.id === change.leaderId || enemy.id === change.previousLeaderId,
      );
      events.push({
        type: "group_leader_changed",
        ...change,
        position: actor ? { x: actor.x, y: actor.y } : null,
      });
    }
  }
  for (const enemy of aliveEnemies(state).sort((a, b) =>
    a.id.localeCompare(b.id),
  )) {
    if (state.hero.hp <= 0 || state.status !== "active") break;
    const template = ROGUE_BESTIARY[enemy.template];
    if ((template.cadence ?? 1) > 1 && state.tick % template.cadence !== 0)
      continue;
    const seesHero = enemyCanSeeHero(state, enemy);
    if (seesHero) {
      enemy.aware = true;
      enemy.lastKnown = { x: state.hero.x, y: state.hero.y };
    }
    if (gridDistance("square", enemy, state.hero) === 1) {
      attack(enemy, state.hero, dice, events, "enemy");
      continue;
    }
    if (!enemy.aware) continue;
    const policy = enemyGroupPolicy(state, enemy),
      home = level.rooms.find((r) => r.id === enemy.homeRoomId),
      territorial =
        policy.hold ||
        ["guardian", "sentinel", "brute", "boss"].includes(template.role);
    if (
      territorial &&
      home &&
      roomAt(level, state.hero)?.id !== home.id &&
      gridDistance("square", center(home), enemy) >= 4
    ) {
      enemy.aware = false;
      continue;
    }
    const retreat =
        policy.retreat ||
        (["coward", "skirmisher"].includes(template.role) &&
          enemy.hp <= Math.ceil(enemy.maxHp / 2)),
      step = enemyStep(state, enemy, retreat);
    if (!step) continue;
    const from = { x: enemy.x, y: enemy.y };
    enemy.x = step.x;
    enemy.y = step.y;
    events.push({
      type: "enemy_move",
      actorId: enemy.id,
      actorName: enemy.name,
      from,
      to: { x: enemy.x, y: enemy.y },
      position: { x: enemy.x, y: enemy.y },
      reason: retreat
        ? (policy.reason ?? "retreat_wounded")
        : seesHero
          ? "approach_visible_hero"
          : "investigate_noise",
    });
  }
  if (state.hero.hp <= 0) {
    state.status = state.hero.dead ? "dead" : "dying";
    if (!state.hero.conditions.includes("unconscious"))
      state.hero.conditions.push("unconscious");
  }
}

function positionInRoom(room, offset = 0) {
  const p = center(room);
  return {
    x: Math.min(room.x + room.width - 1, p.x + (offset % 2)),
    y: Math.min(room.y + room.height - 1, p.y + Math.floor(offset / 2)),
  };
}

function doorForConnection(connection, rooms, index) {
  const outside = connection.cells.find(
      (p) => !rooms.some((r) => roomAt({ rooms: [r] }, p)),
    ),
    p = outside ?? connection.cells[Math.floor(connection.cells.length / 2)];
  return {
    id: `door-${index + 1}`,
    ...p,
    state: "closed",
    secret: connection.kind === "alternate_route",
    revealed: connection.kind !== "alternate_route",
    connectionId: connection.id,
  };
}

function treasureForRoom(seed, room, index, hidden = false) {
  const choices = [
      ["A leather purse of old copper", 38],
      ["A silver votive plate", 125],
      ["A cloudy river-stone gem", 220],
      ["A bronze reliquary clasp", 85],
    ],
    [name, valueCp] = choices[index % choices.length];
  return {
    id: `treasure-${stableId(`${seed}:${room.id}`)}`,
    ...positionInRoom(room, 1),
    name,
    valueCp,
    collected: false,
    hidden,
  };
}

function buildLevel(input, depth, maxDepth) {
  const dungeon = generateDungeon(
    { id: "00000000-0000-4000-8000-000000000002", revision: depth - 1 },
    {
      seed: `${input.seed}:level:${depth}`,
      form: input.form,
      size: input.size === "medium" ? "rogue_vast" : "rogue_expansive",
      partyLevel: depth,
      partySize: 1,
      dungeonLevel: depth,
      density: depth === 1 ? "normal" : "dense",
      difficulty: depth === 1 ? "easy" : "standard",
    },
  );
  const entrance = center(
      dungeon.rooms.find((r) => r.id === dungeon.entranceId),
    ),
    exit = center(dungeon.rooms.find((r) => r.id === dungeon.exitId)),
    candidates = dungeon.rooms.slice(1, -1);
  const depthBand = Math.ceil((depth / maxDepth) * 4),
    roster =
      depthBand === 1
        ? [
            "cave_rat",
            "ruin_cat",
            "giant_bat",
            "goblin_skulk",
            "kobold_trapper",
            "gray_wolf",
            "lantern_beetle",
          ]
        : depthBand === 2
          ? [
              "ash_moth",
              "cult_adept",
              "giant_spider",
              "tomb_scavenger",
              "bugbear_enforcer",
              "harpy_lure",
            ]
          : depthBand === 3
            ? [
                "bone_sentry",
                "zombie_laborer",
                "orc_raider",
                "hobgoblin_sentinel",
                "dire_wolf",
                "ochre_jelly",
              ]
            : [
                "animated_armor",
                "ghoul_stalker",
                "mimic_lurker",
                "stone_mauler",
                "wight_keeper",
                "ochre_jelly",
              ];
  const enemies = candidates
    .slice(0, Math.min(candidates.length, 2 + Math.min(3, depth - 1)))
    .map((room, index) => {
      const template = roster[index % roster.length],
        m = ROGUE_BESTIARY[template];
      return {
        id: `enemy-${depth}-${index + 1}-${stableId(`${input.seed}:${room.id}:${template}`)}`,
        template,
        name: `${m.name} ${index + 1}`,
        ...positionInRoom(room),
        hp: m.hp,
        maxHp: m.hp,
        ac: m.ac,
        attackBonus: m.attackBonus,
        damage: m.damage,
        damageType: m.damageType,
        tempHp: 0,
        resistances: [...(m.resistances ?? [])],
        vulnerabilities: [...(m.vulnerabilities ?? [])],
        immunities: [...(m.immunities ?? [])],
        aware: false,
        lastKnown: null,
        homeRoomId: room.id,
      };
    });
  if (depth === maxDepth) {
    const room = dungeon.rooms.at(-1),
      m = ROGUE_BESTIARY.reliquary_warden;
    enemies.push({
      id: `boss-${stableId(`${input.seed}:${depth}`)}`,
      template: "reliquary_warden",
      name: m.name,
      ...positionInRoom(room, 1),
      hp: m.hp,
      maxHp: m.hp,
      ac: m.ac,
      attackBonus: m.attackBonus,
      damage: m.damage,
      damageType: m.damageType,
      tempHp: 0,
      resistances: [...(m.resistances ?? [])],
      vulnerabilities: [...(m.vulnerabilities ?? [])],
      immunities: [...(m.immunities ?? [])],
      aware: false,
      lastKnown: null,
      homeRoomId: room.id,
    });
  }
  const enemyGroups = buildEnemyGroups(enemies, depth);
  for (const group of enemyGroups)
    for (const member of group.members) {
      const enemy = enemies.find(
        (candidate) => candidate.id === member.actorId,
      );
      if (enemy) enemy.groupId = group.id;
    }
  const ordinaryConnections = dungeon.connections.filter(
      (connection) => connection.kind !== "alternate_route",
    ),
    alternateConnection = dungeon.connections.find(
      (connection) => connection.kind === "alternate_route",
    ),
    doorConnections = [
      ...ordinaryConnections.slice(0, 3 + Math.min(depth, 3)),
      ...(alternateConnection ? [alternateConnection] : []),
    ],
    doors = doorConnections.map((connection, index) =>
      doorForConnection(connection, dungeon.rooms, index),
    );
  const trapRoom = candidates.at(-1) ?? dungeon.rooms.at(-1),
    potionRoom = candidates[1] ?? candidates[0],
    equipmentRoom = candidates[2] ?? candidates[0],
    relicRoom = candidates[3] ?? candidates[0],
    shrineRoom = candidates[4] ?? candidates[0],
    equipmentKind = equipmentForDepth[(depth - 1) % equipmentForDepth.length],
    equipment = ROGUE_EQUIPMENT[equipmentKind],
    relicKind = relicForDepth[(depth - 1) % relicForDepth.length],
    relic = ROGUE_RELICS[relicKind];
  const features = [
    {
      id: `trap-${depth}`,
      kind: "trap",
      ...positionInRoom(trapRoom, 2),
      name: depth === 1 ? "Loose flagstone snare" : "Reliquary needle plate",
      dc: 12 + depth,
      damage: `${depth}d6`,
      damageType: "piercing",
      saveAbility: "dex",
      revealed: false,
      spent: false,
    },
    ...(potionRoom
      ? [
          {
            id: `potion-${depth}`,
            kind: "item",
            ...positionInRoom(potionRoom, 2),
            itemKind: "healing_potion",
            name: "Healing potion",
            hidden: depth > 1,
            collected: false,
          },
        ]
      : []),
    ...(equipmentRoom
      ? [
          {
            id: `equipment-${depth}`,
            kind: "item",
            ...positionInRoom(equipmentRoom, 1),
            itemKind: equipmentKind,
            name: equipment.name,
            hidden: depth > 2,
            collected: false,
          },
        ]
      : []),
    ...(relicRoom
      ? [
          {
            id: `relic-${depth}`,
            kind: "item",
            ...positionInRoom(relicRoom, 1),
            itemKind: relicKind,
            name: relic.name,
            hidden: depth > 1,
            collected: false,
          },
        ]
      : []),
    ...(shrineRoom
      ? [
          {
            id: `shrine-${depth}`,
            kind: "shrine",
            ...positionInRoom(shrineRoom, 1),
            name: "Wayfarer's shrine",
            blessingKind: ["vitality", "prowess", "ward"][(depth - 1) % 3],
            revealed: true,
            spent: false,
          },
        ]
      : []),
  ];
  return {
    depth,
    theme: {
      ...dungeon.theme,
      title: `${dungeon.theme.title} · Depth ${depth}`,
    },
    map: dungeon.map,
    rooms: dungeon.rooms,
    connections: dungeon.connections,
    entrance,
    exit,
    stairs: depth < maxDepth ? "down" : "surface_exit",
    enemies,
    enemyGroups,
    doors,
    features,
    treasures: candidates
      .slice(0, 3)
      .map((r, i) => treasureForRoom(`${input.seed}:${depth}`, r, i, i === 2)),
    remembered: new Set(),
    searched: new Set(),
  };
}

export function newRogueRun(input) {
  const maxDepth = [3, 5, 8].includes(input.levels) ? input.levels : 5,
    archetype = HERO_ARCHETYPES[input.heroClass] ?? HERO_ARCHETYPES.fighter,
    startingWeapon = equipmentItem("starting-weapon", archetype.weapon, true),
    startingArmor = equipmentItem("starting-armor", archetype.armor, true),
    startingOffhand = archetype.offhand
      ? equipmentItem("starting-offhand", archetype.offhand, true)
      : null,
    startingAc = startingArmor.ac + (startingOffhand?.acBonus ?? 0);
  const state = {
    schemaVersion: 3,
    ruleset: ROGUE_RULESET,
    id: randomUUID(),
    revision: 0,
    tick: 0,
    status: "active",
    seed: input.seed,
    depth: 1,
    maxDepth,
    levels: Array.from({ length: maxDepth }, (_, i) =>
      buildLevel(input, i + 1, maxDepth),
    ),
    hero: {
      id: "hero",
      name: input.heroName,
      kind: "character",
      class: archetype.name.toLowerCase(),
      level: 3,
      abilities: { str: 16, dex: 14, con: 12, int: 10, wis: 12, cha: 8 },
      proficiencyBonus: 2,
      saveProficiencies: ["str", "con"],
      saves: { str: 5, dex: 2, con: 3, int: 0, wis: 1, cha: -1 },
      weapon: archetype.weapon,
      armor: archetype.armor,
      speedFeet: 30,
      x: 0,
      y: 0,
      hp: archetype.maxHp,
      maxHp: archetype.maxHp,
      ac: startingAc,
      attackBonus: startingWeapon.attackBonus,
      damage: startingWeapon.damage,
      damageType: startingWeapon.damageType,
      combatBonus: 0,
      xp: 0,
      xpToNext: 400,
      levelHp: archetype.levelHp,
      hitDice: {
        die: HERO_HIT_DICE[archetype.name.toLowerCase()],
        remaining: 3,
      },
      classPower: { ...archetype.power, remaining: archetype.power.uses },
      leadership: { role: "leader", commandBonus: 2 },
      tempHp: 0,
      resistances: [],
      vulnerabilities: [],
      immunities: [],
      conditions: [],
      death: { successes: 0, failures: 0 },
      dead: false,
      searchBonus: 1,
      goldCp: 0,
      treasures: [],
      inventory: [
        startingWeapon,
        startingArmor,
        ...(startingOffhand ? [startingOffhand] : []),
        {
          id: "starting-potion",
          kind: "healing_potion",
          name: "Healing potion",
          quantity: 1,
        },
      ],
      equipment: {
        weapon: startingWeapon.id,
        armor: startingArmor.id,
        offhand: startingOffhand?.id ?? null,
      },
      inventoryCapacity: 10,
    },
    partyGroup: null,
    visionRadius: 6,
  };
  state.partyGroup = createGroup({
    id: "party",
    name: `${state.hero.name}'s company`,
    side: "party",
    members: [{ actorId: state.hero.id, role: "leader", commandScore: 100 }],
    leaderId: state.hero.id,
    formation: "column",
    objective: "explore",
    resourcePolicy: "balanced",
    retreatThreshold: 25,
  });
  attachActive(state);
  Object.assign(state.hero, state.entrance);
  visibility(state);
  return state;
}

function search(state, dice, events, { passive = false } = {}) {
  const level = active(state),
    searchKey = key(state.hero);
  if (passive && level.searched.has(searchKey)) return;
  check(
    !level.searched.has(searchKey),
    "ALREADY_SEARCHED",
    "This position has already been searched.",
  );
  level.searched.add(searchKey);
  const roll = dice.d20(state.hero.searchBonus),
    found = [],
    near = (p) => gridDistance("square", p, state.hero) <= 1;
  for (const door of level.doors.filter(
    (d) => d.secret && !d.revealed && near(d),
  ))
    if (roll.total >= 13) {
      door.revealed = true;
      found.push({ kind: "secret_door", id: door.id });
    }
  for (const item of [...level.treasures, ...level.features].filter(
    (f) => f.hidden && near(f),
  ))
    if (roll.total >= 11) {
      item.hidden = false;
      item.revealed = true;
      found.push({ kind: item.kind ?? "treasure", id: item.id });
    }
  for (const trap of level.features.filter(
    (f) => f.kind === "trap" && !f.revealed && near(f),
  ))
    if (roll.total >= trap.dc) {
      trap.revealed = true;
      found.push({ kind: "trap", id: trap.id });
    }
  if (!passive || found.length)
    events.push({
      type: passive ? "discovery" : "search",
      actorId: state.hero.id,
      roll,
      found,
      position: { x: state.hero.x, y: state.hero.y },
    });
  if (!passive) addNoise(state, events, 2, state.hero, "search");
}

function useItem(state, intent, dice, events) {
  const item = state.hero.inventory.find(
    (entry) => entry.kind === intent.itemKind && entry.quantity > 0,
  );
  check(item, "ITEM_NOT_FOUND", "That item is not in the inventory.");
  check(
    intent.itemKind === "healing_potion",
    "ITEM_NOT_USABLE",
    "That item cannot be used now.",
  );
  check(
    state.hero.hp < state.hero.maxHp,
    "FULL_HEALTH",
    "Health is already full.",
  );
  const healing = dice.roll("2d4+2"),
    before = state.hero.hp;
  state.hero.hp = Math.min(state.hero.maxHp, state.hero.hp + healing.total);
  item.quantity -= 1;
  events.push({
    type: "item_used",
    itemKind: intent.itemKind,
    itemName: item.name,
    healing: state.hero.hp - before,
    position: { x: state.hero.x, y: state.hero.y },
  });
}

function recalculateHero(state) {
  const weapon = state.hero.inventory.find(
      (entry) => entry.id === state.hero.equipment.weapon,
    ),
    armor = state.hero.inventory.find(
      (entry) => entry.id === state.hero.equipment.armor,
    ),
    offhand = state.hero.inventory.find(
      (entry) => entry.id === state.hero.equipment.offhand,
    );
  if (weapon) {
    state.hero.weapon = weapon.kind;
    state.hero.attackBonus = weapon.attackBonus + state.hero.combatBonus;
    state.hero.damage = weapon.damage;
    state.hero.damageType = weapon.damageType;
  }
  if (armor) state.hero.armor = armor.kind;
  state.hero.ac =
    (armor?.ac ?? 10) + (offhand?.acBonus ?? 0) + (state.hero.blessingAc ?? 0);
}

function nearestVisibleEnemy(state) {
  return aliveEnemies(state)
    .filter(
      (enemy) =>
        gridDistance("square", enemy, state.hero) <= state.visionRadius &&
        lineOfSight(effectiveMap(state), state.hero, enemy).clear,
    )
    .sort(
      (a, b) =>
        gridDistance("square", a, state.hero) -
        gridDistance("square", b, state.hero),
    )[0];
}

function magicalDamage(
  state,
  enemy,
  dice,
  events,
  { name, formula, damageType, source },
) {
  const damage = dice.roll(formula);
  damage.applied = applyTypedDamage(enemy, damage.total, damageType);
  events.push({
    type: "spell_cast",
    actorId: state.hero.id,
    actorName: state.hero.name,
    spellName: name,
    source,
    targetId: enemy.id,
    targetName: enemy.name,
    targetTemplate: enemy.template,
    damage,
    appliedDamage: damage.applied,
    position: { x: enemy.x, y: enemy.y },
  });
  if (enemy.hp === 0)
    events.push({
      type: "enemy_defeated",
      actorId: enemy.id,
      actorName: enemy.name,
      actorTemplate: enemy.template,
      position: { x: enemy.x, y: enemy.y },
    });
}

function invokeItem(state, intent, dice, events) {
  const item = state.hero.inventory.find(
    (entry) =>
      entry.id === intent.itemId &&
      ((entry.quantity ?? 0) > 0 || (entry.charges ?? 0) > 0),
  );
  check(item, "ITEM_NOT_FOUND", "That item is not in the inventory.");
  if (item.kind === "tome_vigor") {
    state.hero.maxHp += 3;
    state.hero.hp += 3;
    events.push({
      type: "permanent_gain",
      actorId: state.hero.id,
      itemName: item.name,
      gain: "+3 maximum HP",
      position: { x: state.hero.x, y: state.hero.y },
    });
  } else if (item.kind === "tome_might") {
    state.hero.combatBonus += 1;
    recalculateHero(state);
    events.push({
      type: "permanent_gain",
      actorId: state.hero.id,
      itemName: item.name,
      gain: "+1 weapon attack",
      position: { x: state.hero.x, y: state.hero.y },
    });
  } else if (item.kind === "scroll_flame") {
    const enemy = nearestVisibleEnemy(state);
    check(enemy, "NO_VISIBLE_TARGET", "No enemy is visible for the scroll.");
    magicalDamage(state, enemy, dice, events, {
      name: "Flame",
      formula: "3d6",
      damageType: "fire",
      source: "scroll",
    });
  } else if (item.kind === "wand_arc") {
    const enemy = nearestVisibleEnemy(state);
    check(enemy, "NO_VISIBLE_TARGET", "No enemy is visible for the wand.");
    magicalDamage(state, enemy, dice, events, {
      name: "Arcing Sparks",
      formula: "2d6",
      damageType: "lightning",
      source: "wand",
    });
  } else throw new RuleError("ITEM_NOT_USABLE", "That item cannot be invoked.");
  if (item.itemType === "wand") item.charges -= 1;
  else item.quantity -= 1;
}

function useClassPower(state, dice, events) {
  const power = state.hero.classPower;
  check(
    power.remaining > 0,
    "NO_POWER_USES",
    `${power.name} has no uses left.`,
  );
  if (power.id === "magic_missile") {
    const enemy = nearestVisibleEnemy(state);
    check(enemy, "NO_VISIBLE_TARGET", "No enemy is visible for Magic Missile.");
    magicalDamage(state, enemy, dice, events, {
      name: "Magic Missile",
      formula: "3d4+3",
      damageType: "force",
      source: "class_power",
    });
  } else {
    check(
      state.hero.hp < state.hero.maxHp,
      "FULL_HEALTH",
      "Health is already full.",
    );
    const formula = power.id === "second_wind" ? "1d10+3" : "1d4+3",
      healing = dice.roll(formula),
      before = state.hero.hp;
    state.hero.hp = Math.min(state.hero.maxHp, state.hero.hp + healing.total);
    events.push({
      type: "class_power",
      actorId: state.hero.id,
      actorName: state.hero.name,
      powerName: power.name,
      healing: state.hero.hp - before,
      position: { x: state.hero.x, y: state.hero.y },
    });
  }
  power.remaining -= 1;
}

function restStatus(state) {
  const die = HERO_HIT_DICE[state.hero.class] ?? 8,
    remaining = state.hero.hitDice?.remaining ?? state.hero.level,
    threatened = aliveEnemies(state).some(
      (enemy) =>
        gridDistance("square", enemy, state.hero) <= 2 ||
        enemyCanSeeHero(state, enemy),
    );
  if (state.hero.hp >= state.hero.maxHp)
    return {
      available: false,
      reason: "Health is already full.",
      die,
      remaining,
    };
  if (remaining <= 0)
    return { available: false, reason: "No Hit Dice remain.", die, remaining };
  if (threatened)
    return {
      available: false,
      reason: "Enemies are too close to rest safely.",
      die,
      remaining,
    };
  return { available: true, reason: null, die, remaining };
}

function shortRest(state, dice, events) {
  const status = restStatus(state);
  check(status.available, "REST_UNSAFE", status.reason);
  state.hero.hitDice ??= { die: status.die, remaining: status.remaining };
  state.hero.hitDice.die = status.die;
  const constitutionModifier = Math.floor(
      ((state.hero.abilities?.con ?? 10) - 10) / 2,
    ),
    formula = `1d${status.die}${constitutionModifier >= 0 ? "+" : ""}${constitutionModifier}`,
    roll = dice.roll(formula),
    before = state.hero.hp;
  state.hero.hp = Math.min(state.hero.maxHp, state.hero.hp + roll.total);
  state.hero.hitDice.remaining -= 1;
  if (state.hero.classPower.id === "second_wind")
    state.hero.classPower.remaining = state.hero.classPower.uses;
  events.push({
    type: "short_rest",
    actorId: state.hero.id,
    actorName: state.hero.name,
    formula,
    roll,
    healing: state.hero.hp - before,
    hitDiceRemaining: state.hero.hitDice.remaining,
    position: { x: state.hero.x, y: state.hero.y },
  });
}

function triggerShrine(state, events) {
  const shrine = active(state).features.find(
    (feature) =>
      feature.kind === "shrine" && !feature.spent && same(feature, state.hero),
  );
  if (!shrine) return;
  shrine.spent = true;
  let gain;
  if (shrine.blessingKind === "vitality") {
    state.hero.maxHp += 2;
    state.hero.hp = Math.min(state.hero.maxHp, state.hero.hp + 2);
    gain = "+2 maximum HP";
  } else if (shrine.blessingKind === "prowess") {
    state.hero.combatBonus += 1;
    gain = "+1 weapon attack";
  } else {
    state.hero.blessingAc = (state.hero.blessingAc ?? 0) + 1;
    gain = "+1 Armor Class";
  }
  state.hero.classPower.remaining = state.hero.classPower.uses;
  recalculateHero(state);
  events.push({
    type: "blessing_received",
    actorId: state.hero.id,
    shrineName: shrine.name,
    gain,
    position: { x: shrine.x, y: shrine.y },
  });
}

function grantExperience(state, events) {
  for (const defeated of events.filter(
    (event) => event.type === "enemy_defeated",
  )) {
    const monster = ROGUE_BESTIARY[defeated.actorTemplate],
      gained = Math.max(
        40,
        Math.round(
          (monster.hp + monster.ac * 2 + monster.attackBonus * 4) / 10,
        ) * 10,
      );
    state.hero.xp += gained;
    events.push({
      type: "xp_gained",
      actorId: state.hero.id,
      amount: gained,
      defeatedName: defeated.actorName,
      position: { ...defeated.position },
    });
  }
  while (state.hero.xp >= state.hero.xpToNext) {
    state.hero.xp -= state.hero.xpToNext;
    state.hero.level += 1;
    state.hero.xpToNext += 200;
    state.hero.maxHp += state.hero.levelHp;
    state.hero.hp = state.hero.maxHp;
    if (state.hero.level === 4) state.hero.combatBonus += 1;
    state.hero.classPower.remaining = state.hero.classPower.uses;
    recalculateHero(state);
    events.push({
      type: "level_up",
      actorId: state.hero.id,
      level: state.hero.level,
      hpGain: state.hero.levelHp,
      attackGain: state.hero.level === 4 ? 1 : 0,
      position: { x: state.hero.x, y: state.hero.y },
    });
  }
}

function equipItem(state, intent, events) {
  const item = state.hero.inventory.find(
    (entry) => entry.id === intent.itemId && entry.itemType === "equipment",
  );
  check(item, "EQUIPMENT_NOT_FOUND", "That equipment is not in the inventory.");
  const previousId = state.hero.equipment[item.slot],
    previous = state.hero.inventory.find((entry) => entry.id === previousId);
  if (previous) previous.equipped = false;
  item.equipped = true;
  state.hero.equipment[item.slot] = item.id;
  recalculateHero(state);
  events.push({
    type: "equipment_changed",
    actorId: state.hero.id,
    itemId: item.id,
    itemName: item.name,
    slot: item.slot,
    previousItemName: previous?.name ?? null,
    position: { x: state.hero.x, y: state.hero.y },
  });
}

function unequipItem(state, intent, events) {
  check(
    intent.slot === "offhand",
    "SLOT_REQUIRED",
    "Only the offhand may be left empty.",
  );
  const previousId = state.hero.equipment.offhand,
    previous = state.hero.inventory.find((entry) => entry.id === previousId);
  check(previous, "EQUIPMENT_NOT_FOUND", "The offhand slot is already empty.");
  previous.equipped = false;
  state.hero.equipment.offhand = null;
  recalculateHero(state);
  events.push({
    type: "equipment_removed",
    actorId: state.hero.id,
    itemId: previous.id,
    itemName: previous.name,
    slot: "offhand",
    position: { x: state.hero.x, y: state.hero.y },
  });
}

function descend(state, events) {
  check(
    same(state.hero, state.exit),
    "NO_STAIRS",
    "Stand on the stairs before descending.",
  );
  check(
    state.depth < state.maxDepth,
    "NO_STAIRS",
    "There is no deeper level here.",
  );
  state.depth += 1;
  attachActive(state);
  Object.assign(state.hero, state.entrance);
  visibility(state);
  events.push({
    type: "level_changed",
    direction: "down",
    depth: state.depth,
    position: { x: state.hero.x, y: state.hero.y },
  });
}

export function applyRogueTurn(state, intent, dice = new Dice()) {
  check(
    ["active", "dying"].includes(state.status),
    "RUN_FINISHED",
    "This run has ended.",
    { status: state.status },
  );
  const events = [],
    level = active(state);
  if (state.status === "dying") {
    check(
      intent.kind === "death_save",
      "DEATH_SAVE_REQUIRED",
      "Resolve the hero's death saving throw.",
    );
    const outcome = resolveDeathSave(state.hero, dice);
    events.push({
      type: "death_save",
      actorId: state.hero.id,
      actorName: state.hero.name,
      ...outcome,
      position: { x: state.hero.x, y: state.hero.y },
    });
    if (outcome.result === "revived") state.status = "active";
    else if (outcome.result === "dead") state.status = "dead";
    else if (outcome.result === "stable") state.status = "stable";
  } else if (intent.kind === "command") {
    check(
      intent.groupId === state.partyGroup.id,
      "GROUP_NOT_COMMANDABLE",
      "Only the player's party may receive player commands.",
    );
    const order = issueGroupOrder(state.partyGroup, intent, state.tick);
    events.push({
      type: "group_order_issued",
      groupId: state.partyGroup.id,
      actorId: intent.issuerId,
      actorName: state.hero.name,
      order,
      position: { x: state.hero.x, y: state.hero.y },
    });
  } else if (intent.kind === "wait")
    events.push({
      type: "hero_wait",
      actorId: state.hero.id,
      actorName: state.hero.name,
      position: { x: state.hero.x, y: state.hero.y },
    });
  else if (intent.kind === "search") search(state, dice, events);
  else if (intent.kind === "use_item") useItem(state, intent, dice, events);
  else if (intent.kind === "invoke_item")
    invokeItem(state, intent, dice, events);
  else if (intent.kind === "class_power") useClassPower(state, dice, events);
  else if (intent.kind === "short_rest") shortRest(state, dice, events);
  else if (intent.kind === "equip") equipItem(state, intent, events);
  else if (intent.kind === "unequip") unequipItem(state, intent, events);
  else if (intent.kind === "stairs") descend(state, events);
  else if (intent.kind === "open") {
    const delta = DIRECTIONS[intent.direction];
    check(delta, "INVALID_DIRECTION", "Unknown direction.");
    const target = { x: state.hero.x + delta[0], y: state.hero.y + delta[1] },
      door = level.doors.find((d) => same(d, target) && d.revealed);
    check(door, "NO_DOOR", "There is no known door there.");
    check(door.state === "closed", "DOOR_OPEN", "That door is already open.");
    door.state = "open";
    events.push({ type: "door_opened", doorId: door.id, position: target });
    addNoise(state, events, 5, target, "door");
  } else if (intent.kind === "move") {
    const delta = DIRECTIONS[intent.direction];
    check(delta, "INVALID_DIRECTION", "Unknown movement direction.");
    const to = { x: state.hero.x + delta[0], y: state.hero.y + delta[1] };
    check(
      neighbors(effectiveMap(state), state.hero).some((p) => same(p, to)),
      "MOVE_BLOCKED",
      "That adjacent step is blocked.",
      { to },
    );
    const enemy = aliveEnemies(state).find((e) => same(e, to));
    if (enemy) {
      attack(state.hero, enemy, dice, events, "hero");
      addNoise(state, events, 6, state.hero, "combat");
    } else {
      const from = { x: state.hero.x, y: state.hero.y };
      state.hero.x = to.x;
      state.hero.y = to.y;
      events.push({
        type: "hero_move",
        actorId: state.hero.id,
        actorName: state.hero.name,
        from,
        to,
        position: to,
      });
      search(state, dice, events, { passive: true });
      collectGround(state, events);
      triggerShrine(state, events);
      triggerTrap(state, dice, events);
      if (
        same(state.hero, active(state).exit) &&
        state.depth === state.maxDepth
      ) {
        const bossAlive = aliveEnemies(state).some(
          (e) => ROGUE_BESTIARY[e.template].role === "boss",
        );
        if (!bossAlive) {
          state.status = "won";
          events.push({
            type: "exit_reached",
            actorId: state.hero.id,
            actorName: state.hero.name,
            position: { x: state.hero.x, y: state.hero.y },
            treasureCp: state.hero.goldCp,
          });
        }
      }
    }
  } else throw new RuleError("INVALID_INTENT", "Unsupported player intent.");
  grantExperience(state, events);
  if (state.status === "active") resolveEnemies(state, dice, events);
  state.tick += 1;
  visibility(state);
  return { events };
}

function cellView(state, position, currentVisible) {
  const level = active(state),
    value = key(position),
    isVisible = currentVisible.has(value);
  if (!isVisible && !level.remembered.has(value)) return null;
  const door = level.doors.find((d) => same(d, position) && d.revealed),
    hiddenDoor = level.doors.find(
      (d) => same(d, position) && d.secret && !d.revealed,
    ),
    difficult = level.map.difficult.some((cell) => same(cell, position));
  const cell = {
    ...position,
    visibility: isVisible ? "visible" : "remembered",
    tile: hiddenDoor
      ? "wall"
      : door
        ? door.secret
          ? `secret_door_${door.state}`
          : `door_${door.state}`
        : blocked(level.map, position)
          ? "wall"
          : same(position, level.exit)
            ? state.depth < state.maxDepth
              ? "stairs_down"
              : "exit"
            : difficult
              ? "difficult"
              : "floor",
  };
  if (!isVisible) return cell;
  const enemy = aliveEnemies(state).find((e) => same(e, position));
  if (enemy) {
    const m = ROGUE_BESTIARY[enemy.template];
    cell.enemy = {
      id: enemy.id,
      name: enemy.name,
      template: enemy.template,
      glyph: m.glyph,
      glyphLanguage: m.glyphLanguage,
      glyphReading: m.glyphReading,
      role: m.role,
      faction: m.faction,
      hp: enemy.hp,
      maxHp: enemy.maxHp,
    };
  }
  const treasure = level.treasures.find(
    (item) => !item.collected && !item.hidden && same(item, position),
  );
  if (treasure)
    cell.treasure = {
      id: treasure.id,
      name: treasure.name,
      valueCp: treasure.valueCp,
    };
  const feature = level.features.find(
    (f) =>
      !f.collected &&
      !f.hidden &&
      (f.revealed || f.kind === "item") &&
      same(f, position),
  );
  if (feature)
    cell.feature = {
      id: feature.id,
      kind: feature.kind,
      name: feature.name,
      spent: feature.spent,
    };
  return cell;
}

export function rogueRunView(state, recentEvents = []) {
  const level = active(state),
    currentVisible = visibility(state),
    cells = [];
  for (let y = 0; y < level.map.height; y++)
    for (let x = 0; x < level.map.width; x++) {
      const cell = cellView(state, { x, y }, currentVisible);
      if (cell) cells.push(cell);
    }
  const visibleEvent = (event) =>
    event.actorKind === "hero" ||
    event.actorId === state.hero.id ||
    event.targetId === state.hero.id ||
    (event.position && currentVisible.has(key(event.position))) ||
    (event.from && currentVisible.has(key(event.from))) ||
    (event.to && currentVisible.has(key(event.to)));
  const here = roomAt(level, state.hero);
  return {
    runId: state.id,
    revision: state.revision,
    tick: state.tick,
    status: state.status,
    ruleset: state.ruleset,
    combatProfile: ROGUE_DND_PROFILE,
    depth: state.depth,
    maxDepth: state.maxDepth,
    title: level.theme.title,
    theme: {
      archetype: level.theme.archetype,
      form: level.theme.form,
      state: level.theme.state,
      construction: level.theme.construction,
      atmosphere: level.theme.atmosphere,
      dominantFeature: level.theme.dominantFeature,
      history: [
        ...(ROGUE_LORE[level.theme.archetype] ?? level.theme.history ?? []),
        `On this depth, the site is ${level.theme.state}.`,
      ],
    },
    currentRoom: here
      ? {
          id: here.id,
          name: here.name,
          purpose: here.purpose,
          description: here.description,
        }
      : null,
    map: { width: level.map.width, height: level.map.height, cells },
    hero: structuredClone(state.hero),
    groups: rogueGroupsView(state, currentVisible),
    enemyCount: aliveEnemies(state).length,
    treasureRemaining: level.treasures.filter((item) => !item.collected).length,
    factions: [
      ...new Set(
        aliveEnemies(state).map((e) => ROGUE_BESTIARY[e.template].faction),
      ),
    ],
    rest: restStatus(state),
    legalIntents:
      state.status === "dying"
        ? ["death_save"]
        : state.status === "active"
          ? [
              "move",
              "command",
              "open",
              "wait",
              "search",
              "use_item",
              "invoke_item",
              "class_power",
              "short_rest",
              "equip",
              "unequip",
              ...(same(state.hero, level.exit) && state.depth < state.maxDepth
                ? ["stairs"]
                : []),
            ]
          : [],
    recentEvents: recentEvents.filter(visibleEvent),
  };
}

export function serializeRogueState(state) {
  const {
    map,
    rooms,
    entrance,
    exit,
    enemies,
    treasures,
    doors,
    features,
    remembered,
    enemyGroups,
    theme,
    ...core
  } = state;
  return {
    ...core,
    levels: state.levels.map((level) => ({
      ...level,
      remembered: [...level.remembered],
      searched: [...level.searched],
    })),
  };
}

export function parseRogueState(value) {
  value.schemaVersion = Math.max(value.schemaVersion ?? 1, 3);
  value.levels = value.levels.map((level) => ({
    ...level,
    remembered: new Set(level.remembered),
    searched: new Set(level.searched),
  }));
  value.partyGroup ??= createGroup({
    id: "party",
    name: `${value.hero.name}'s company`,
    side: "party",
    members: [{ actorId: value.hero.id, role: "leader", commandScore: 100 }],
    leaderId: value.hero.id,
  });
  for (const level of value.levels) {
    level.enemyGroups ??= buildEnemyGroups(level.enemies, level.depth);
    for (const group of level.enemyGroups)
      for (const member of group.members) {
        const enemy = level.enemies.find(
          (candidate) => candidate.id === member.actorId,
        );
        if (enemy) enemy.groupId = group.id;
      }
  }
  return attachActive(value);
}

export function rogueGroupsView(state, currentVisible = visibility(state)) {
  const party = groupView(state.partyGroup, [state.hero]);
  const visibleEnemyIds = new Set(
    aliveEnemies(state)
      .filter((enemy) => currentVisible.has(key(enemy)))
      .map((enemy) => enemy.id),
  );
  const enemies = (state.enemyGroups ?? [])
    .filter((group) =>
      group.members.some((member) => visibleEnemyIds.has(member.actorId)),
    )
    .map((group) => {
      const view = groupView(group, state.enemies);
      view.members = view.members.filter((member) =>
        visibleEnemyIds.has(member.actorId),
      );
      view.knownMemberCount = view.members.length;
      view.totalMemberCount = null;
      if (!view.members.some((member) => member.actorId === view.leaderId))
        view.leaderId = null;
      return view;
    });
  return { party, enemies };
}
