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
  inside,
  key,
  lineOfSight,
  neighbors,
  paths,
  route,
} from "./spatial.js";
import {
  createGroup,
  groupView,
  issueGroupOrder,
  reconcileGroupLeadership,
} from "./group-logic.js";
import {
  definitionId,
  isUuid,
  migratedInstanceId,
  namedUuid,
  newInstanceId,
} from "./identity.js";
import { advanceVillageSimulation } from "./village-simulation.js";
import { createEntityIndex, describeAffordances } from "./world-objects.js";

export const ROGUE_RULESET = "party-roguelike-v9";
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
    priceCp: 120,
  },
  iron_mace: {
    name: "Iron mace",
    slot: "weapon",
    attackBonus: 5,
    damage: "1d6+3",
    damageType: "bludgeoning",
    priceCp: 80,
    toolTags: ["breach"],
  },
  battleaxe: {
    name: "Battleaxe",
    slot: "weapon",
    attackBonus: 5,
    damage: "1d8+3",
    damageType: "slashing",
    priceCp: 150,
    thrownRange: 4,
    toolTags: ["cut", "breach"],
  },
  ash_spear: {
    name: "Ash spear",
    slot: "weapon",
    attackBonus: 5,
    damage: "1d6+3",
    damageType: "piercing",
    priceCp: 60,
    thrownRange: 6,
  },
  warhammer: {
    name: "Warhammer",
    slot: "weapon",
    attackBonus: 5,
    damage: "1d8+3",
    damageType: "bludgeoning",
    priceCp: 140,
    thrownRange: 4,
    toolTags: ["breach"],
  },
  hand_axe: {
    name: "Hand axe",
    slot: "weapon",
    attackBonus: 4,
    damage: "1d6+2",
    damageType: "slashing",
    priceCp: 55,
    thrownRange: 4,
    toolTags: ["cut", "breach"],
  },
  field_shovel: {
    name: "Field shovel",
    slot: "weapon",
    attackBonus: 3,
    damage: "1d4+2",
    damageType: "bludgeoning",
    priceCp: 35,
    toolTags: ["dig"],
  },
  shortbow: {
    name: "Shortbow",
    slot: "weapon",
    attackBonus: 5,
    damage: "1d6+3",
    damageType: "piercing",
    priceCp: 125,
    rangeSquares: 10,
  },
  quarterstaff: {
    name: "Quarterstaff",
    slot: "weapon",
    attackBonus: 4,
    damage: "1d6+2",
    damageType: "bludgeoning",
    priceCp: 30,
  },
  chain_shirt: { name: "Chain shirt", slot: "armor", ac: 15, priceCp: 200 },
  mage_robes: { name: "Mage robes", slot: "armor", ac: 12, priceCp: 50 },
  scale_mail: { name: "Scale mail", slot: "armor", ac: 16, priceCp: 300 },
  reinforced_shield: {
    name: "Reinforced shield",
    slot: "offhand",
    acBonus: 2,
    priceCp: 100,
  },
};
for (const [key, value] of Object.entries(ROGUE_EQUIPMENT)) {
  value.definitionId = definitionId("item", key);
  value.key = key;
}

const HERO_ARCHETYPES = {
  fighter: {
    name: "Fighter",
    maxHp: 25,
    weapon: "longsword",
    armor: "chain_shirt",
    offhand: null,
    levelHp: 7,
    power: { key: "second_wind", name: "Second Wind", uses: 1 },
  },
  mage: {
    name: "Mage",
    maxHp: 16,
    weapon: "quarterstaff",
    armor: "mage_robes",
    offhand: null,
    levelHp: 5,
    power: { key: "magic_missile", name: "Magic Missile", uses: 3 },
  },
  cleric: {
    name: "Cleric",
    maxHp: 21,
    weapon: "iron_mace",
    armor: "chain_shirt",
    offhand: "reinforced_shield",
    levelHp: 6,
    power: { key: "healing_word", name: "Healing Word", uses: 2 },
  },
};
for (const [key, value] of Object.entries(HERO_ARCHETYPES)) {
  value.definitionId = definitionId("actor-archetype", key);
  value.key = key;
}

const HERO_HIT_DICE = { fighter: 10, mage: 6, cleric: 8 };

const VILLAGE = {
  name: "Stonebridge",
  description:
    "A road village beneath the old keep, sustained by delvers, charcoal burners and river traffic.",
  width: 56,
  height: 50,
  viewportOrigin: { x: -4, y: -2 },
  heroPosition: { x: 19, y: 12 },
  companionPositions: [
    { x: 18, y: 12 },
    { x: 17, y: 12 },
    { x: 16, y: 12 },
  ],
  shops: [
    {
      id: "smithy",
      name: "Red Hammer Smithy",
      keeper: "Hanne Voss",
      goods: [
        "ash_spear",
        "iron_mace",
        "longsword",
        "battleaxe",
        "warhammer",
        "hand_axe",
        "field_shovel",
        "shortbow",
      ],
    },
    {
      id: "armorer",
      name: "Gatehouse Armorer",
      keeper: "Otto Kern",
      goods: ["mage_robes", "chain_shirt", "reinforced_shield", "scale_mail"],
    },
    {
      id: "apothecary",
      name: "Juniper & Salt",
      keeper: "Mei Lin",
      goods: ["healing_potion"],
    },
  ],
};

const WORLD = {
  name: "The Stonebridge March",
  groupGlyph: "群",
  groupGlyphReading: "qún",
  viewport: { width: 46, height: 28 },
  nodes: [
    {
      id: "dungeon_entrance",
      name: "Rooted Keep",
      kind: "dungeon",
      x: 8,
      y: 20,
    },
    {
      id: "stonebridge",
      name: "Stonebridge",
      kind: "town",
      x: 36,
      y: 7,
    },
  ],
  routes: [
    {
      from: "dungeon_entrance",
      to: "stonebridge",
      material: "stone",
    },
  ],
};

const EXTERIOR = {
  name: "Rooted Keep approach",
  description:
    "Ruined masonry, meadow and old roads surround the dungeon stair.",
  width: 46,
  height: 28,
  heroPosition: { x: 18, y: 15 },
  companionPositions: [
    { x: 17, y: 16 },
    { x: 16, y: 16 },
    { x: 15, y: 17 },
  ],
};

const COMPANION_TEMPLATES = [
  {
    key: "niklas-ried",
    name: "Niklas Ried",
    class: "rogue",
    role: "scout",
    glyph: "盗",
    glyphReading: "tō",
    hp: 20,
    ac: 14,
    attackBonus: 5,
    damage: "1d6+3",
    damageType: "piercing",
    attackRange: 1,
  },
  {
    key: "adelheid-bauer",
    name: "Adelheid Bauer",
    class: "cleric",
    role: "support",
    glyph: "癒",
    glyphReading: "iyasu",
    hp: 24,
    ac: 16,
    attackBonus: 5,
    damage: "1d6+3",
    damageType: "bludgeoning",
    attackRange: 1,
    supportUses: 2,
  },
  {
    key: "konrad-falk",
    name: "Konrad Falk",
    class: "mage",
    role: "rear_guard",
    glyph: "魔",
    glyphReading: "ma",
    hp: 17,
    ac: 12,
    attackBonus: 5,
    damage: "1d10",
    damageType: "fire",
    attackRange: 6,
  },
];

const FORMATION_SLOTS = {
  column: {
    scout: { forward: -1, right: 0 },
    support: { forward: -2, right: 0 },
    rear_guard: { forward: -3, right: 0 },
  },
  line: {
    scout: { forward: 0, right: -1 },
    support: { forward: 0, right: 1 },
    rear_guard: { forward: -1, right: 0 },
  },
  wedge: {
    scout: { forward: -1, right: -1 },
    support: { forward: -1, right: 1 },
    rear_guard: { forward: -2, right: 0 },
  },
  scatter: {
    scout: { forward: 1, right: -1 },
    support: { forward: -1, right: 1 },
    rear_guard: { forward: -2, right: -1 },
  },
};

function companionActor(template, id) {
  return {
    id,
    definitionId: definitionId("actor-archetype", template.key),
    entityType: "actor",
    kind: "character",
    name: template.name,
    class: template.class,
    role: template.role,
    glyph: template.glyph,
    glyphReading: template.glyphReading,
    level: 3,
    speedFeet: 30,
    x: 0,
    y: 0,
    hp: template.hp,
    maxHp: template.hp,
    ac: template.ac,
    baseAc: template.ac,
    attackBonus: template.attackBonus,
    baseAttackBonus: template.attackBonus,
    damage: template.damage,
    baseDamage: template.damage,
    damageType: template.damageType,
    baseDamageType: template.damageType,
    attackRange: template.attackRange,
    supportUses: template.supportUses ?? 0,
    tempHp: 0,
    resistances: [],
    vulnerabilities: [],
    immunities: [],
    conditions: [],
    death: { successes: 0, failures: 0 },
    dead: false,
    inventory: [],
    equipment: { weapon: null, armor: null, offhand: null },
  };
}

const createCompanions = (idFor = () => newInstanceId()) =>
  COMPANION_TEMPLATES.map((template) =>
    companionActor(template, idFor(template.key)),
  );

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
for (const [key, value] of Object.entries(ROGUE_RELICS)) {
  value.definitionId = definitionId("item", key);
  value.key = key;
}

const relicForDepth = ["tome_vigor", "wand_arc", "tome_might", "scroll_flame"];

const equipmentItem = (id, kind, equipped = false) => ({
  id,
  definitionId: definitionId("item", kind),
  entityType: "item",
  kind,
  ...ROGUE_EQUIPMENT[kind],
  itemType: "equipment",
  quantity: 1,
  equipped,
});

const center = (room) => ({
  x: room.x + Math.floor(room.width / 2),
  y: room.y + Math.floor(room.height / 2),
});
const same = (a, b) => a.x === b.x && a.y === b.y;
const active = (state) => state.levels[state.depth - 1];
const aliveEnemies = (state) => state.enemies.filter((enemy) => enemy.hp > 0);
const partyActors = (state) => [state.hero, ...(state.companions ?? [])];
const commandScore = (role) =>
  ({ boss: 100, sentinel: 70, guardian: 60, support: 50, brute: 40 })[role] ??
  20;

function buildEnemyGroups(enemies, depth) {
  const packs = Map.groupBy(
    enemies,
    (enemy) =>
      enemy.packId ?? `faction:${ROGUE_BESTIARY[enemy.template].faction}`,
  );
  return [...packs.values()].map((actors, packIndex) => {
    const faction = ROGUE_BESTIARY[actors[0].template].faction;
    const assignments = actors
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
      id: newInstanceId(),
      definitionId: definitionId("group", `enemy-faction:${faction}`),
      name: `${faction.replaceAll("_", " ")} pack ${packIndex + 1}`,
      side: "enemy",
      memberIds: assignments.map((assignment) => assignment.actorId),
      assignments,
      leaderId: assignments[0].actorId,
      formation: faction === "wildclaw" ? "wedge" : "scatter",
      objective: assignments.some((assignment) =>
        ["guardian", "sentinel", "boss"].includes(assignment.role),
      )
        ? "hold"
        : "advance",
      retreatThreshold: assignments.some(
        (assignment) => assignment.role === "coward",
      )
        ? 50
        : 20,
      movementMode: "individual",
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
  if (defender.hp === 0) {
    const defenderKind = defender.template
      ? "enemy"
      : defender.role
        ? "companion"
        : "hero";
    if (
      defenderKind !== "enemy" &&
      !defender.conditions.includes("unconscious")
    )
      defender.conditions.push("unconscious");
    events.push({
      type: defeatEventType(defenderKind, defender.dead),
      actorId: defender.id,
      actorName: defender.name,
      actorTemplate: defender.template ?? null,
      position: { x: defender.x, y: defender.y },
    });
  }
}

function defeatEventType(defenderKind, dead) {
  if (defenderKind === "enemy") return "enemy_defeated";
  if (defenderKind === "companion")
    return dead ? "companion_defeated" : "companion_unconscious";
  return dead ? "hero_defeated" : "hero_unconscious";
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
      definitionId: treasure.definitionId,
      entityType: treasure.entityType,
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
        definitionId: item.definitionId,
        entityType: item.entityType,
        kind: item.itemKind,
        ...ROGUE_RELICS[item.itemKind],
        quantity: 1,
      });
    else
      state.hero.inventory.push({
        id: item.id,
        definitionId: item.definitionId,
        entityType: item.entityType,
        kind: item.itemKind,
        name: item.name,
        quantity: 1,
      });
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

const conscious = (actor) => actor.hp > 0 && !actor.dead;
const livingParty = (state) => partyActors(state).filter(conscious);

function canAttack(state, actor, target) {
  return (
    gridDistance("square", actor, target) <= (actor.attackRange ?? 1) &&
    lineOfSight(effectiveMap(state), actor, target).clear
  );
}

function nearestActor(origin, actors) {
  return [...actors].sort(
    (a, b) =>
      gridDistance("square", origin, a) - gridDistance("square", origin, b) ||
      a.id.localeCompare(b.id),
  )[0];
}

function orderedTarget(group, actors) {
  if (group?.order.objective !== "focus") return null;
  return actors.find((actor) => actor.id === group.order.targetId) ?? null;
}

function partyTarget(state, companion, targets) {
  const ordered = orderedTarget(state.partyGroup, targets);
  if (ordered) return ordered;
  const party = livingParty(state),
    protectedActors = party.filter(
      (actor) => actor.role === "support" || (actor.attackRange ?? 1) > 1,
    ),
    threatensBackline = (enemy) =>
      protectedActors.some(
        (actor) => gridDistance("square", actor, enemy) <= 2,
      ),
    engaged = (enemy) =>
      party.some((actor) => gridDistance("square", actor, enemy) <= 1);
  return [...targets].sort(
    (a, b) =>
      Number(threatensBackline(b)) - Number(threatensBackline(a)) ||
      Number(engaged(b)) - Number(engaged(a)) ||
      a.hp / a.maxHp - b.hp / b.maxHp ||
      gridDistance("square", companion, a) -
        gridDistance("square", companion, b) ||
      a.id.localeCompare(b.id),
  )[0];
}

function threatensBackline(state, enemy) {
  return livingParty(state).some(
    (actor) =>
      (actor.role === "support" || (actor.attackRange ?? 1) > 1) &&
      gridDistance("square", actor, enemy) <= 2,
  );
}

function formationPosition(state, companion) {
  const [dx, dy] = DIRECTIONS[state.partyTactics.facing] ?? DIRECTIONS.north,
    right = { x: -dy, y: dx },
    slots = FORMATION_SLOTS[state.partyGroup.order.formation],
    offset = slots?.[companion.role] ?? { forward: -1, right: 0 };
  return {
    x: state.hero.x + dx * offset.forward + right.x * offset.right,
    y: state.hero.y + dy * offset.forward + right.y * offset.right,
  };
}

function stepTowardPosition(state, actor, desired) {
  const map = effectiveMap(state);
  if (blocked(map, actor)) return null;
  const occupied = new Set([
      ...livingParty(state)
        .filter((candidate) => candidate.id !== actor.id)
        .map(key),
      ...aliveEnemies(state).map(key),
    ]),
    { costs, previous } = paths(map, actor, occupied),
    goals = [desired, ...neighbors(map, desired)]
      .filter(
        (position) => !occupied.has(key(position)) && costs.has(key(position)),
      )
      .sort(
        (a, b) =>
          gridDistance("square", a, desired) -
            gridDistance("square", b, desired) ||
          costs.get(key(a)) - costs.get(key(b)),
      );
  if (!goals.length || same(goals[0], actor)) return null;
  const path = [goals[0]];
  while (!same(path[0], actor)) path.unshift(previous.get(key(path[0])));
  return path[1] ?? null;
}

function moveCompanion(state, companion, destination, reason, events) {
  if (!destination) return false;
  const from = { x: companion.x, y: companion.y };
  Object.assign(companion, destination);
  events.push({
    type: "companion_move",
    actorKind: "companion",
    actorId: companion.id,
    actorName: companion.name,
    groupId: state.partyGroup.id,
    from,
    to: { ...destination },
    position: { ...destination },
    reason,
  });
  return true;
}

function adoptFormation(state, phase, reason, events) {
  if (state.partyTactics.phase === phase) return;
  state.partyTactics.phase = phase;
  state.partyTactics.anchor = { x: state.hero.x, y: state.hero.y };
  state.partyTactics.deployedAtTick = state.tick;
  const event = {
    type: "formation_adopted",
    groupId: state.partyGroup.id,
    formation: state.partyGroup.order.formation,
    objective: state.partyGroup.order.objective,
    phase,
    reason,
    facing: state.partyTactics.facing,
    position: { ...state.partyTactics.anchor },
  };
  const current = events.find(
    (candidate) => candidate.type === "formation_adopted",
  );
  if (current) Object.assign(current, event);
  else events.push(event);
}

function combatStep(state, actor, target, retreat = false) {
  const map = effectiveMap(state),
    occupied = new Set(
      aliveEnemies(state)
        .filter((candidate) => candidate.id !== actor.id)
        .map(key),
    );
  for (const candidate of livingParty(state))
    if (candidate.id !== actor.id) occupied.add(key(candidate));
  occupied.delete(key(target));
  if (retreat)
    return (
      neighbors(map, actor)
        .filter((p) => !occupied.has(key(p)))
        .sort(
          (a, b) =>
            gridDistance("square", b, target) -
            gridDistance("square", a, target),
        )[0] ?? null
    );
  const { costs, previous } = paths(map, actor, occupied);
  const goals = neighbors(map, target)
    .filter((p) => !occupied.has(key(p)) && costs.has(key(p)))
    .sort(
      (a, b) => costs.get(key(a)) - costs.get(key(b)) || a.y - b.y || a.x - b.x,
    );
  if (!goals.length) return null;
  const path = [goals[0]];
  while (key(path[0]) !== key(actor)) path.unshift(previous.get(key(path[0])));
  return path[1] ?? null;
}

function rangedRetreatStep(state, actor, targets, slot) {
  const map = effectiveMap(state),
    occupied = new Set([
      ...livingParty(state)
        .filter((candidate) => candidate.id !== actor.id)
        .map(key),
      ...aliveEnemies(state).map(key),
    ]),
    distanceFromThreats = (position) =>
      Math.min(
        ...targets.map((enemy) => gridDistance("square", position, enemy)),
      ),
    currentSpace = distanceFromThreats(actor);
  return (
    neighbors(map, actor)
      .filter((position) => !occupied.has(key(position)))
      .filter((position) => distanceFromThreats(position) > currentSpace)
      .sort(
        (a, b) =>
          distanceFromThreats(b) - distanceFromThreats(a) ||
          gridDistance("square", a, slot) - gridDistance("square", b, slot) ||
          gridDistance("square", a, state.hero) -
            gridDistance("square", b, state.hero),
      )[0] ?? null
  );
}

function visibleEnemiesFor(state, actor) {
  const visible = visibility(state),
    map = active(state).map;
  if (!inside(map, actor)) return [];
  return aliveEnemies(state).filter(
    (enemy) =>
      inside(map, enemy) &&
      visible.has(key(enemy)) &&
      lineOfSight(effectiveMap(state), actor, enemy).clear,
  );
}

function healTarget(state, companion, dice, events) {
  if (companion.role !== "support" || companion.supportUses <= 0) return false;
  const wounded = partyActors(state)
    .filter(
      (actor) =>
        !actor.dead &&
        actor.hp < actor.maxHp &&
        actor.hp <= Math.ceil(actor.maxHp / 2) &&
        gridDistance("square", companion, actor) <= 6,
    )
    .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
  if (!wounded) return false;
  const roll = dice.roll("1d4+3"),
    before = wounded.hp;
  wounded.hp = Math.min(wounded.maxHp, wounded.hp + roll.total);
  wounded.death = { successes: 0, failures: 0 };
  wounded.conditions = wounded.conditions.filter(
    (value) => value !== "unconscious",
  );
  companion.supportUses -= 1;
  if (wounded.id === state.hero.id) state.status = "active";
  events.push({
    type: "companion_heal",
    actorKind: "companion",
    actorId: companion.id,
    actorName: companion.name,
    targetId: wounded.id,
    targetName: wounded.name,
    healing: wounded.hp - before,
    position: { x: wounded.x, y: wounded.y },
  });
  return true;
}

function moveCompanionToCombat(
  state,
  companion,
  target,
  events,
  reason = "engage_group_target",
) {
  if (state.partyGroup.order.objective === "hold") return;
  const destination = combatStep(state, companion, target);
  moveCompanion(state, companion, destination, reason, events);
}

function resolveCompanion(state, companion, dice, events) {
  const targets = visibleEnemiesFor(state, companion),
    slot = formationPosition(state, companion),
    atSlot = same(companion, slot);
  if (
    (targets.length || state.status === "dying") &&
    healTarget(state, companion, dice, events)
  )
    return;
  if (state.partyGroup.order.objective === "retreat") return;
  const target = targets.length ? partyTarget(state, companion, targets) : null,
    pressured = targets.some(
      (enemy) => gridDistance("square", companion, enemy) <= 2,
    );
  if (
    companion.role === "rear_guard" &&
    pressured &&
    moveCompanion(
      state,
      companion,
      rangedRetreatStep(state, companion, targets, slot),
      "withdraw_to_ranged_position",
      events,
    )
  )
    return;
  if (target && canAttack(state, companion, target)) {
    attack(companion, target, dice, events, "companion");
    addNoise(state, events, 6, companion, "companion_combat");
    return;
  }
  if (target && companion.role === "scout" && threatensBackline(state, target))
    return moveCompanionToCombat(
      state,
      companion,
      target,
      events,
      "protect_ranged_ally",
    );
  if (
    state.partyTactics.phase !== "travel" &&
    !atSlot &&
    moveCompanion(
      state,
      companion,
      stepTowardPosition(state, companion, slot),
      "take_formation_slot",
      events,
    )
  )
    return;
  if (!target || companion.role !== "scout") return;
  moveCompanionToCombat(state, companion, target, events);
}

function resolveCompanions(state, dice, events) {
  if (visibleEnemiesFor(state, state.hero).length)
    adoptFormation(state, "engaged", "enemy_engaged", events);
  const byId = new Map(state.companions.map((actor) => [actor.id, actor]));
  for (const actorId of state.partyGroup.memberIds) {
    const companion = byId.get(actorId);
    if (companion && conscious(companion))
      resolveCompanion(state, companion, dice, events);
  }
}

function enemyGroupPolicy(state, enemy) {
  const group = (state.enemyGroups ?? []).find((candidate) =>
    candidate.memberIds.includes(enemy.id),
  );
  if (!group) return { group: null, hold: false, retreat: false, reason: null };
  const actors = group.memberIds
      .map((actorId) => state.enemies.find((actor) => actor.id === actorId))
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

function reconcileEnemyLeaders(state, events) {
  for (const group of state.enemyGroups ?? []) {
    const change = reconcileGroupLeadership(group, state.enemies);
    if (!change) continue;
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

function enemyLeavesTerritory(state, enemy, target, template, policy) {
  const home = active(state).rooms.find((room) => room.id === enemy.homeRoomId),
    territorial =
      policy.hold ||
      ["guardian", "sentinel", "brute", "boss"].includes(template.role);
  return (
    territorial &&
    home &&
    roomAt(active(state), target)?.id !== home.id &&
    gridDistance("square", center(home), enemy) >= 4
  );
}

function moveEnemy(state, enemy, target, template, seesTarget, events) {
  const policy = enemyGroupPolicy(state, enemy);
  if (enemyLeavesTerritory(state, enemy, target, template, policy)) {
    enemy.aware = false;
    return;
  }
  const retreat =
      policy.retreat ||
      (["coward", "skirmisher"].includes(template.role) &&
        enemy.hp <= Math.ceil(enemy.maxHp / 2)),
    step = combatStep(state, enemy, target, retreat);
  if (!step) return;
  const from = { x: enemy.x, y: enemy.y };
  Object.assign(enemy, step);
  events.push({
    type: "enemy_move",
    actorId: enemy.id,
    actorName: enemy.name,
    from,
    to: { x: enemy.x, y: enemy.y },
    position: { x: enemy.x, y: enemy.y },
    reason: retreat
      ? (policy.reason ?? "retreat_wounded")
      : seesTarget
        ? "approach_visible_party"
        : "investigate_noise",
  });
}

function enemyCanSee(state, enemy, target) {
  const template = ROGUE_BESTIARY[enemy.template],
    radius = template.role === "ambusher" && !enemy.aware ? 2 : 7,
    map = active(state).map;
  return (
    inside(map, enemy) &&
    inside(map, target) &&
    gridDistance("square", enemy, target) <= radius &&
    lineOfSight(effectiveMap(state), enemy, target).clear
  );
}

function enemyTarget(state, enemy, group) {
  const visible = livingParty(state).filter((target) =>
    enemyCanSee(state, enemy, target),
  );
  return orderedTarget(group, visible) ?? nearestActor(enemy, visible);
}

function resolveEnemy(state, enemy, dice, events) {
  const template = ROGUE_BESTIARY[enemy.template],
    policy = enemyGroupPolicy(state, enemy),
    target = enemyTarget(state, enemy, policy.group),
    seesTarget = Boolean(target);
  if ((template.cadence ?? 1) > 1 && state.tick % template.cadence !== 0)
    return;
  if (seesTarget) {
    enemy.aware = true;
    enemy.lastKnown = { x: target.x, y: target.y };
  }
  if (target && gridDistance("square", enemy, target) === 1)
    return attack(enemy, target, dice, events, "enemy");
  const destination = target ?? enemy.lastKnown;
  if (enemy.aware && destination)
    moveEnemy(state, enemy, destination, template, seesTarget, events);
}

function reconcilePartyLeader(state, events) {
  const change = reconcileGroupLeadership(state.partyGroup, partyActors(state));
  if (!change) return;
  const actor = partyActors(state).find(
    (candidate) =>
      candidate.id === change.leaderId ||
      candidate.id === change.previousLeaderId,
  );
  events.push({
    type: "group_leader_changed",
    ...change,
    position: actor ? { x: actor.x, y: actor.y } : null,
  });
}

function resolveEnemies(state, dice, events) {
  reconcileEnemyLeaders(state, events);
  const enemies = aliveEnemies(state).sort((a, b) => a.id.localeCompare(b.id));
  for (const enemy of enemies) {
    if (!livingParty(state).length) break;
    resolveEnemy(state, enemy, dice, events);
  }
  reconcilePartyLeader(state, events);
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

function doorForConnection(connection, rooms) {
  const outside = connection.cells.find(
      (p) => !rooms.some((r) => roomAt({ rooms: [r] }, p)),
    ),
    p = outside ?? connection.cells[Math.floor(connection.cells.length / 2)];
  return {
    id: newInstanceId(),
    definitionId: definitionId(
      "door",
      connection.kind === "alternate_route" ? "secret" : "ordinary",
    ),
    entityType: "door",
    ...p,
    state: "closed",
    secret: connection.kind === "alternate_route",
    revealed: connection.kind !== "alternate_route",
    connectionId: connection.id,
  };
}

function treasureForRoom(room, index, hidden = false) {
  const choices = [
      ["A leather purse of old copper", 38],
      ["A silver votive plate", 125],
      ["A cloudy river-stone gem", 220],
      ["A bronze reliquary clasp", 85],
    ],
    [name, valueCp] = choices[index % choices.length];
  return {
    id: newInstanceId(),
    definitionId: definitionId("treasure", name.toLowerCase()),
    entityType: "treasure",
    ...positionInRoom(room, 1),
    name,
    valueCp,
    collected: false,
    hidden,
  };
}

function instantiateDungeonGeometry(dungeon) {
  const roomIds = new Map(
    dungeon.rooms.map((room) => [room.id, newInstanceId()]),
  );
  dungeon.rooms = dungeon.rooms.map((room) => ({
    ...room,
    id: roomIds.get(room.id),
    definitionId: definitionId("room", room.purpose ?? "room"),
    entityType: "room",
    contents: [],
  }));
  dungeon.connections = dungeon.connections.map((connection) => ({
    ...connection,
    id: newInstanceId(),
    definitionId: definitionId("connection", connection.kind),
    entityType: "connection",
    from: roomIds.get(connection.from),
    to: roomIds.get(connection.to),
  }));
  dungeon.entranceId = roomIds.get(dungeon.entranceId);
  dungeon.exitId = roomIds.get(dungeon.exitId);
  return dungeon;
}

function enemyActor(template, room, memberIndex, packId, ordinal) {
  const creature = ROGUE_BESTIARY[template];
  return {
    id: newInstanceId(),
    definitionId: creature.definitionId,
    entityType: "actor",
    template,
    name: `${creature.name} ${ordinal}`,
    ...positionInRoom(room, memberIndex),
    hp: creature.hp,
    maxHp: creature.hp,
    ac: creature.ac,
    attackBonus: creature.attackBonus,
    damage: creature.damage,
    damageType: creature.damageType,
    tempHp: 0,
    resistances: [...(creature.resistances ?? [])],
    vulnerabilities: [...(creature.vulnerabilities ?? [])],
    immunities: [...(creature.immunities ?? [])],
    aware: false,
    lastKnown: null,
    homeRoomId: room.id,
    packId,
  };
}

function spawnEnemyPacks(rooms, roster, depth) {
  const encounterRooms = rooms.slice(
    0,
    Math.min(rooms.length, 2 + Math.min(3, depth - 1)),
  );
  let ordinal = 1;
  return encounterRooms.flatMap((room, packIndex) => {
    const template = roster[packIndex % roster.length],
      packId = newInstanceId(),
      packSize = Math.min(3, 1 + ((depth + packIndex) % 2));
    return Array.from({ length: packSize }, (_, memberIndex) =>
      enemyActor(template, room, memberIndex, packId, ordinal++),
    );
  });
}

function buildLevel(input, depth, maxDepth) {
  const dungeon = instantiateDungeonGeometry(
    generateDungeon(
      { id: "00000000-0000-4000-8000-000000000002", revision: depth - 1 },
      {
        seed: `${input.seed}:level:${depth}`,
        form: input.form,
        size: input.size === "medium" ? "rogue_vast" : "rogue_expansive",
        partyLevel: depth,
        partySize: 4,
        dungeonLevel: depth,
        density: depth === 1 ? "normal" : "dense",
        difficulty: depth === 1 ? "easy" : "standard",
      },
    ),
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
  const enemies = spawnEnemyPacks(candidates, roster, depth);
  if (depth === maxDepth) {
    const room = dungeon.rooms.at(-1),
      m = ROGUE_BESTIARY.reliquary_warden;
    enemies.push({
      id: newInstanceId(),
      definitionId: m.definitionId,
      entityType: "actor",
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
      packId: newInstanceId(),
    });
  }
  const enemyGroups = buildEnemyGroups(enemies, depth);
  for (const group of enemyGroups)
    for (const actorId of group.memberIds) {
      const enemy = enemies.find((candidate) => candidate.id === actorId);
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
    doors = doorConnections.map((connection) =>
      doorForConnection(connection, dungeon.rooms),
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
      id: newInstanceId(),
      definitionId: definitionId("feature", "trap:flagstone-snare"),
      entityType: "feature",
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
            id: newInstanceId(),
            definitionId: definitionId("item", "healing_potion"),
            entityType: "item",
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
            id: newInstanceId(),
            definitionId: definitionId("item", equipmentKind),
            entityType: "item",
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
            id: newInstanceId(),
            definitionId: definitionId("item", relicKind),
            entityType: "item",
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
            id: newInstanceId(),
            definitionId: definitionId("feature", "wayfarer-shrine"),
            entityType: "feature",
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
    id: newInstanceId(),
    definitionId: definitionId("dungeon-level", dungeon.theme.archetype),
    entityType: "dungeon-level",
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
      .map((room, index) => treasureForRoom(room, index, index === 2)),
    remembered: new Set(),
    searched: new Set(),
  };
}

function placePartyAt(state, position) {
  Object.assign(state.hero, position);
  const occupied = new Set([key(position)]),
    enemyPositions = new Set(aliveEnemies(state).map(key)),
    { costs } = paths(effectiveMap(state), position),
    candidates = [...costs.entries()]
      .filter(
        ([value]) => value !== key(position) && !enemyPositions.has(value),
      )
      .sort(([, a], [, b]) => a - b)
      .map(([value]) => {
        const [x, y] = value.split(",").map(Number);
        return { x, y };
      });
  for (const companion of state.companions) {
    const target = candidates.find(
      (candidate) => !occupied.has(key(candidate)),
    );
    check(
      target,
      "PARTY_PLACEMENT_BLOCKED",
      "The party cannot enter this level.",
    );
    Object.assign(companion, target);
    occupied.add(key(target));
  }
}

export function newRogueRun(input) {
  const maxDepth = [3, 5, 8].includes(input.levels) ? input.levels : 5,
    archetype = HERO_ARCHETYPES[input.heroClass] ?? HERO_ARCHETYPES.fighter,
    startingWeapon = equipmentItem(newInstanceId(), archetype.weapon, true),
    startingArmor = equipmentItem(newInstanceId(), archetype.armor, true),
    startingOffhand = archetype.offhand
      ? equipmentItem(newInstanceId(), archetype.offhand, true)
      : null,
    startingAxe = equipmentItem(newInstanceId(), "hand_axe"),
    startingShovel = equipmentItem(newInstanceId(), "field_shovel"),
    startingAc = startingArmor.ac + (startingOffhand?.acBonus ?? 0),
    runId = newInstanceId(),
    heroId = newInstanceId(),
    companions = createCompanions();
  const state = {
    schemaVersion: 11,
    ruleset: ROGUE_RULESET,
    id: runId,
    revision: 0,
    tick: 0,
    status: "active",
    location: "dungeon",
    villageVisits: 0,
    world: {
      position: "dungeon_entrance",
      coordinates: { x: WORLD.nodes[0].x, y: WORLD.nodes[0].y },
    },
    exterior: {
      danger: false,
      dangerReason: null,
      heroPosition: { ...EXTERIOR.heroPosition },
      companionPositions: structuredClone(EXTERIOR.companionPositions),
    },
    village: {
      heroPosition: { ...VILLAGE.heroPosition },
      companionPositions: structuredClone(VILLAGE.companionPositions),
      viewportOrigin: { ...VILLAGE.viewportOrigin },
      partyMovement: "follow",
      modifications: [],
      looseMaterials: [],
      wantedLevel: 0,
      npcStates: createVillageNpcStates(runId),
      doors: VILLAGE_BUILDINGS.map((building) => ({
        id: newInstanceId(),
        entityType: "door",
        buildingKey: building.key,
        ...building.door,
        state: "closed",
      })),
    },
    seed: input.seed,
    depth: 1,
    maxDepth,
    levels: Array.from({ length: maxDepth }, (_, i) =>
      buildLevel(input, i + 1, maxDepth),
    ),
    hero: {
      id: heroId,
      definitionId: archetype.definitionId,
      entityType: "actor",
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
      classPower: {
        ...archetype.power,
        definitionId: definitionId("feature", archetype.power.key),
        remaining: archetype.power.uses,
      },
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
        startingAxe,
        startingShovel,
        ...(startingOffhand ? [startingOffhand] : []),
        {
          id: newInstanceId(),
          definitionId: definitionId("item", "healing_potion"),
          entityType: "item",
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
    companions,
    partyGroup: null,
    partyTactics: {
      facing: "north",
      phase: "travel",
      anchor: null,
      deployedAtTick: null,
    },
    visionRadius: 6,
  };
  state.partyGroup = createGroup({
    id: newInstanceId(),
    definitionId: definitionId("group", "adventuring-party"),
    name: `${state.hero.name}'s company`,
    side: "party",
    memberIds: partyActors(state).map((actor) => actor.id),
    assignments: [
      { actorId: state.hero.id, role: "leader", commandScore: 100 },
      ...companions.map((companion, index) => ({
        actorId: companion.id,
        role: companion.role,
        commandScore: 60 - index * 10,
      })),
    ],
    leaderId: state.hero.id,
    formation: "column",
    objective: "explore",
    resourcePolicy: "balanced",
    retreatThreshold: 25,
    movementMode: "follow_leader",
  });
  attachActive(state);
  placePartyAt(state, state.entrance);
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
    (entry) => entry.id === intent.itemId && entry.quantity > 0,
  );
  check(item, "ITEM_NOT_FOUND", "That item is not in the inventory.");
  check(
    item.kind === "healing_potion",
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
    itemId: item.id,
    itemKind: item.kind,
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

function recalculateCompanion(actor) {
  const weapon = actor.inventory.find(
      (entry) => entry.id === actor.equipment.weapon,
    ),
    armor = actor.inventory.find((entry) => entry.id === actor.equipment.armor),
    offhand = actor.inventory.find(
      (entry) => entry.id === actor.equipment.offhand,
    );
  actor.attackBonus = weapon?.attackBonus ?? actor.baseAttackBonus;
  actor.damage = weapon?.damage ?? actor.baseDamage;
  actor.damageType = weapon?.damageType ?? actor.baseDamageType;
  actor.ac = (armor?.ac ?? actor.baseAc) + (offhand?.acBonus ?? 0);
}

function partyActorById(state, actorId) {
  return partyActors(state).find((actor) => actor.id === actorId);
}

function recalculatePartyActor(state, actor) {
  if (actor.id === state.hero.id) recalculateHero(state);
  else recalculateCompanion(actor);
}

function nearestVisibleEnemy(state) {
  const currentVisible = visibility(state);
  return aliveEnemies(state)
    .filter((enemy) => currentVisible.has(key(enemy)))
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
    const enemy = visibleEnemyTarget(state, intent.targetId);
    check(enemy, "NO_VISIBLE_TARGET", "No enemy is visible for the scroll.");
    magicalDamage(state, enemy, dice, events, {
      name: "Flame",
      formula: "3d6",
      damageType: "fire",
      source: "scroll",
    });
  } else if (item.kind === "wand_arc") {
    const enemy = visibleEnemyTarget(state, intent.targetId);
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

function visibleEnemyTarget(state, targetId) {
  if (!targetId) return nearestVisibleEnemy(state);
  const visible = visibility(state);
  return aliveEnemies(state).find(
    (enemy) => enemy.id === targetId && visible.has(key(enemy)),
  );
}

function rangedAttack(state, intent, dice, events) {
  const weapon = ROGUE_EQUIPMENT[state.hero.weapon];
  check(weapon?.rangeSquares, "RANGED_WEAPON_REQUIRED", "Equip a bow first.");
  const enemy = visibleEnemyTarget(state, intent.targetId);
  check(enemy, "NO_VISIBLE_TARGET", "That target is not visible.");
  check(
    gridDistance("square", state.hero, enemy) <= weapon.rangeSquares,
    "TARGET_OUT_OF_RANGE",
    `${enemy.name} is beyond the ${weapon.name}'s range.`,
  );
  attack(state.hero, enemy, dice, events, "hero");
  addNoise(state, events, 4, state.hero, "ranged_combat");
}

function throwItem(state, intent, dice, events) {
  const item = state.hero.inventory.find((entry) => entry.id === intent.itemId);
  check(item?.thrownRange, "ITEM_NOT_THROWABLE", "That item cannot be thrown.");
  const enemy = visibleEnemyTarget(state, intent.targetId);
  check(enemy, "NO_VISIBLE_TARGET", "That target is not visible.");
  check(
    gridDistance("square", state.hero, enemy) <= item.thrownRange,
    "TARGET_OUT_OF_RANGE",
    `${enemy.name} is too far away to throw at.`,
  );
  attack(
    {
      ...state.hero,
      attackBonus: item.attackBonus,
      damage: item.damage,
      damageType: item.damageType,
    },
    enemy,
    dice,
    events,
    "hero",
  );
  events.push({
    type: "item_thrown",
    actorId: state.hero.id,
    targetId: enemy.id,
    itemId: item.id,
    itemName: item.name,
    targetName: enemy.name,
    position: { x: enemy.x, y: enemy.y },
  });
  addNoise(state, events, 5, state.hero, "thrown_weapon");
}

function examineDungeon(state, intent, events) {
  const cell = cellView(state, intent, visibility(state));
  check(cell?.visibility === "visible", "NOT_VISIBLE", "You cannot see that.");
  const subject = cell.enemy ?? cell.feature ?? cell.treasure;
  const name = subject?.name ?? cell.tile.replaceAll("_", " ");
  const detail = cell.enemy
    ? `${cell.enemy.name} is a ${cell.enemy.role.replaceAll("_", " ")} of the ${cell.enemy.faction.replaceAll("_", " ")} faction, with ${cell.enemy.hp} of ${cell.enemy.maxHp} HP.`
    : cell.treasure
      ? `${cell.treasure.name} appears to be worth ${cell.treasure.valueCp} copper pieces.`
      : cell.feature
        ? `${cell.feature.name} is ${cell.feature.spent ? "spent or inactive" : "ready to be approached and used"}.`
        : `You study the ${name}.`;
  events.push({ type: "dungeon_examined", name, detail, position: intent });
}

function useClassPower(state, dice, events) {
  const power = state.hero.classPower;
  check(
    power.remaining > 0,
    "NO_POWER_USES",
    `${power.name} has no uses left.`,
  );
  if (power.key === "magic_missile") {
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
    const formula = power.key === "second_wind" ? "1d10+3" : "1d4+3",
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
    threatened = aliveEnemies(state).some((enemy) =>
      livingParty(state).some(
        (actor) =>
          gridDistance("square", enemy, actor) <= 2 ||
          enemyCanSee(state, enemy, actor),
      ),
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
  if (state.hero.classPower.key === "second_wind")
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
  const actor = partyActorById(state, intent.actorId ?? state.hero.id);
  check(actor, "ACTOR_NOT_FOUND", "That party member does not exist.");
  const item = actor.inventory.find(
    (entry) => entry.id === intent.itemId && entry.itemType === "equipment",
  );
  check(item, "EQUIPMENT_NOT_FOUND", "That equipment is not in the inventory.");
  const previousId = actor.equipment[item.slot],
    previous = actor.inventory.find((entry) => entry.id === previousId);
  if (previous) previous.equipped = false;
  item.equipped = true;
  actor.equipment[item.slot] = item.id;
  recalculatePartyActor(state, actor);
  events.push({
    type: "equipment_changed",
    actorId: actor.id,
    actorName: actor.name,
    itemId: item.id,
    itemName: item.name,
    slot: item.slot,
    previousItemName: previous?.name ?? null,
    position: { x: actor.x, y: actor.y },
  });
}

function unequipItem(state, intent, events) {
  check(
    intent.slot === "offhand",
    "SLOT_REQUIRED",
    "Only the offhand may be left empty.",
  );
  const actor = partyActorById(state, intent.actorId ?? state.hero.id);
  check(actor, "ACTOR_NOT_FOUND", "That party member does not exist.");
  const previousId = actor.equipment.offhand,
    previous = actor.inventory.find((entry) => entry.id === previousId);
  check(previous, "EQUIPMENT_NOT_FOUND", "The offhand slot is already empty.");
  previous.equipped = false;
  actor.equipment.offhand = null;
  recalculatePartyActor(state, actor);
  events.push({
    type: "equipment_removed",
    actorId: actor.id,
    actorName: actor.name,
    itemId: previous.id,
    itemName: previous.name,
    slot: "offhand",
    position: { x: actor.x, y: actor.y },
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
  placePartyAt(state, state.entrance);
  visibility(state);
  events.push({
    type: "level_changed",
    direction: "down",
    depth: state.depth,
    position: { x: state.hero.x, y: state.hero.y },
  });
}

function ascend(state, events) {
  check(
    same(state.hero, state.entrance),
    "NO_STAIRS_UP",
    "Stand at this level's entrance before ascending.",
  );
  if (state.depth === 1) return enterExterior(state, events);
  state.depth -= 1;
  attachActive(state);
  placePartyAt(state, state.exit);
  visibility(state);
  events.push({
    type: "level_changed",
    direction: "up",
    depth: state.depth,
    position: { x: state.hero.x, y: state.hero.y },
  });
}

function enterExterior(state, events) {
  state.location = "exterior";
  state.world.position = "dungeon_entrance";
  state.world.coordinates = {
    x: WORLD.nodes[0].x,
    y: WORLD.nodes[0].y,
  };
  events.push({
    type: "exterior_entered",
    areaName: "Rooted Keep approach",
    position: null,
  });
}

function openWorld(state, events) {
  check(
    ["exterior", "village"].includes(state.location),
    "WORLD_MAP_UNAVAILABLE",
    "Reach an outdoor local area before opening the world map.",
  );
  check(
    state.location !== "exterior" || !state.exterior.danger,
    "EXTERIOR_DANGER",
    state.exterior.dangerReason ??
      "The party cannot open the world map while the local area is dangerous.",
  );
  state.location = "world";
  events.push({
    type: "world_map_opened",
    nodeId: state.world.position,
    position: null,
  });
}

function worldTravel(state, intent, events) {
  const destination = WORLD.nodes.find(
      (node) => node.id === intent.destination,
    ),
    connected = WORLD.routes.some(
      (route) =>
        [route.from, route.to].includes(state.world.position) &&
        [route.from, route.to].includes(intent.destination),
    );
  check(
    destination && connected,
    "WORLD_ROUTE_MISSING",
    "No road leads there.",
  );
  check(
    destination.id !== state.world.position,
    "WORLD_ALREADY_THERE",
    "The party is already there.",
  );
  const from = state.world.position;
  state.world.position = destination.id;
  state.world.coordinates = { x: destination.x, y: destination.y };
  events.push({
    type: "world_travel",
    groupId: state.partyGroup.id,
    from,
    destination: destination.id,
    destinationName: destination.name,
    position: null,
  });
}

function worldMove(state, intent, events) {
  const visible = worldMapView(state).cells.some(
      (cell) => cell.worldX === intent.x && cell.worldY === intent.y,
    ),
    from = { ...state.world.coordinates },
    destination = WORLD.nodes.find(
      (node) => node.x === intent.x && node.y === intent.y,
    );
  check(
    visible,
    "WORLD_TARGET_NOT_VISIBLE",
    "Choose a square in the visible regional map.",
  );
  state.world.coordinates = { x: intent.x, y: intent.y };
  state.world.position = destination?.id ?? null;
  events.push({
    type: "world_move",
    groupId: state.partyGroup.id,
    from,
    to: { ...state.world.coordinates },
    destinationName: destination?.name ?? null,
    position: null,
  });
}

function enterWorldLocation(state, events) {
  if (state.world.position === "stonebridge")
    return enterVillage(state, events);
  if (state.world.position === "dungeon_entrance")
    return enterExterior(state, events);
  throw new RuleError(
    "WORLD_LOCATION_UNKNOWN",
    "That location cannot be entered.",
  );
}

function enterVillage(state, events) {
  state.location = "village";
  state.world.position = "stonebridge";
  state.world.coordinates = {
    x: WORLD.nodes[1].x,
    y: WORLD.nodes[1].y,
  };
  state.villageVisits += 1;
  events.push({
    type: "village_entered",
    villageName: VILLAGE.name,
    visits: state.villageVisits,
    position: null,
  });
}

function localAreaDefinition(location) {
  return location === "village"
    ? { definition: VILLAGE, tileAt: villageTile }
    : {
        definition: EXTERIOR,
        tileAt: (_state, x, y) => exteriorTile(x, y),
      };
}

function localMapBounds(state, target) {
  if (state.location !== "village")
    return { origin: { x: 0, y: 0 }, ...EXTERIOR };
  const from = state.village.heroPosition,
    margin = 16,
    left = Math.min(from.x, target.x) - margin,
    top = Math.min(from.y, target.y) - margin;
  return {
    origin: { x: left, y: top },
    width: Math.max(from.x, target.x) - left + margin + 1,
    height: Math.max(from.y, target.y) - top + margin + 1,
  };
}

function localSpatialMap(state, target) {
  const { tileAt } = localAreaDefinition(state.location),
    bounds = localMapBounds(state, target),
    blockedTiles = new Set([
      "outdoor_tree",
      "outdoor_ruin",
      "outdoor_water",
      "village_sign",
      "village_building",
      "village_furniture",
      "village_person",
      "village_door_closed",
      "village_door_locked",
      "village_pit",
    ]),
    blockedCells = [];
  for (let y = 0; y < bounds.height; y++)
    for (let x = 0; x < bounds.width; x++) {
      const world = { x: x + bounds.origin.x, y: y + bounds.origin.y },
        terrain = tileAt(state, world.x, world.y),
        tile = typeof terrain === "string" ? terrain : terrain.tile;
      if (blockedTiles.has(tile)) blockedCells.push({ x, y });
    }
  return {
    grid: "square",
    width: bounds.width,
    height: bounds.height,
    blocked: blockedCells,
    difficult: [],
    origin: bounds.origin,
  };
}

function openLocalDoor(state, target, events) {
  if (state.location !== "village") return false;
  const object = villageWorldObjectAt(state, target.x, target.y);
  if (object.objectKind !== "door" || object.state === "open") return false;
  executeVillageInteraction(
    state,
    {
      actorId: state.hero.id,
      objectId: object.id,
      action: "open",
      ...target,
    },
    events,
  );
  return true;
}

function visibleVillageTarget(state, target, errorCode, message) {
  const origin = villageViewportOrigin(state),
    visible =
      target.x >= origin.x &&
      target.y >= origin.y &&
      target.x < origin.x + VILLAGE.width &&
      target.y < origin.y + VILLAGE.height;
  check(visible, errorCode, message);
}

function executeHeroObjectAction(state, object, action, events) {
  return executeVillageInteraction(
    state,
    {
      actorId: state.hero.id,
      objectId: object.id,
      action,
      ...object.position,
    },
    events,
  );
}

function moveLocalParty(state, intent, events) {
  const area = state[state.location],
    target = { x: intent.x, y: intent.y };
  if (openLocalDoor(state, target, events)) return;
  const spatial = localSpatialMap(state, target),
    localize = (position) => ({
      x: position.x - spatial.origin.x,
      y: position.y - spatial.origin.y,
    }),
    path = route(
      spatial,
      localize(area.heroPosition),
      localize(target),
      new Set(),
    ).path.map((position) => ({
      x: position.x + spatial.origin.x,
      y: position.y + spatial.origin.y,
    })),
    trail = [area.heroPosition, ...area.companionPositions].map((position) => ({
      ...position,
    }));
  if (state.location === "village" && area.partyMovement === "dispersed")
    area.heroPosition = path.at(-1);
  else {
    for (const step of path.slice(1)) {
      trail.unshift({ ...step });
      trail.pop();
    }
    area.heroPosition = trail[0];
    area.companionPositions = trail.slice(1);
  }
  events.push({
    type: "local_travel",
    area: state.location,
    partyMovement: area.partyMovement ?? "follow",
    path,
    position: { ...area.heroPosition },
  });
}

function setVillagePartyMovement(state, intent, events) {
  check(
    ["follow", "dispersed"].includes(intent.mode),
    "PARTY_MOVEMENT_INVALID",
    "Choose follow or dispersed movement.",
  );
  state.village.partyMovement = intent.mode;
  events.push({
    type: "party_movement_changed",
    mode: intent.mode,
    position: { ...state.village.heroPosition },
  });
}

function villageExamination(state, target) {
  const terrain = villageTile(state, target.x, target.y);
  if (terrain.material)
    return {
      name: terrain.material.name,
      detail: `${terrain.material.quantity} ${MATERIAL_DEFINITIONS[terrain.material.kind].unit}${terrain.material.quantity === 1 ? "" : "s"} can be collected here.`,
    };
  if (terrain.modification)
    return {
      name: terrain.tile.replaceAll("_", " "),
      detail: `This place was changed from ${terrain.modification.originalTile.replaceAll("_", " ")} on turn ${terrain.modification.createdAtTick}.`,
    };
  if (terrain.sign)
    return {
      name: "Roadside sign",
      detail: `The sign reads: “${terrain.sign.text}.”`,
    };
  if (terrain.furniture)
    return {
      name: terrain.furniture.name,
      detail: terrain.furniture.description,
    };
  if (terrain.person)
    return {
      name: terrain.person.name,
      detail: `${terrain.person.name} is a ${terrain.person.role} of Stonebridge. Objective: ${terrain.person.objective.replaceAll("_", " ")}. Currently: ${terrain.person.currentAction}.`,
    };
  if (terrain.building)
    return {
      name: terrain.building.name,
      detail: `This part of ${terrain.building.name} is ${terrain.tile === "village_floor" ? "a usable interior room" : "solid timber-and-stone construction"}.`,
    };
  if (terrain.tile === "outdoor_tree")
    return {
      name: "Old tree",
      detail: "An old shade tree marks the settled edge of Stonebridge.",
    };
  if (terrain.tile.startsWith("road_"))
    return {
      name: "Town road",
      detail: "Cart wheels and many boots have worn this route through town.",
    };
  return {
    name: "Village ground",
    detail: "Grass and low weeds grow between the traveled places.",
  };
}

function examineVillage(state, intent, events) {
  const target = { x: intent.x, y: intent.y };
  visibleVillageTarget(
    state,
    target,
    "EXAMINE_NOT_VISIBLE",
    "That place is outside the visible town map.",
  );
  const object = villageWorldObjectAt(state, target.x, target.y),
    action = object.affordanceKeys.includes("read") ? "read" : "examine";
  executeHeroObjectAction(state, object, action, events);
}

function talkVillage(state, intent, events) {
  const target = { x: intent.x, y: intent.y };
  visibleVillageTarget(
    state,
    target,
    "TALK_NOT_VISIBLE",
    "That person is outside the visible town map.",
  );
  const object = villageWorldObjectAt(state, target.x, target.y);
  check(
    object.objectKind === "resident",
    "TALK_TARGET_MISSING",
    "There is nobody there to speak with.",
  );
  executeHeroObjectAction(state, object, "talk", events);
}

const MATERIAL_DEFINITIONS = {
  timber: { name: "Cut timber", unit: "bundle" },
  stone: { name: "Building stone", unit: "piece" },
  earth: { name: "Excavated earth", unit: "load" },
};

function interactionTool(actor, tag) {
  return actor.inventory?.find(
    (item) => item.quantity > 0 && item.toolTags?.includes(tag),
  );
}

function createLooseMaterial(state, kind, position, quantity) {
  const definition = MATERIAL_DEFINITIONS[kind],
    material = {
      id: newInstanceId(),
      definitionId: definitionId("material", kind),
      entityType: "material",
      kind,
      name: definition.name,
      quantity,
      ...position,
    };
  state.village.looseMaterials.push(material);
  return material;
}

function addVillageModification(state, actorId, kind, target, originalTile) {
  const modification = {
    id: newInstanceId(),
    definitionId: definitionId("terrain-change", kind),
    entityType: "terrain-change",
    kind,
    x: target.x,
    y: target.y,
    originalTile,
    actorId,
    createdAtTick: state.tick,
  };
  state.village.modifications.push(modification);
  return modification;
}

function collectMaterial(state, actor, material, events) {
  const carried = actor.inventory.find(
    (item) => item.itemType === "material" && item.kind === material.kind,
  );
  if (carried) carried.quantity += material.quantity;
  else
    actor.inventory.push({
      id: newInstanceId(),
      definitionId: material.definitionId,
      entityType: "item",
      itemType: "material",
      kind: material.kind,
      name: material.name,
      quantity: material.quantity,
    });
  state.village.looseMaterials = state.village.looseMaterials.filter(
    (candidate) => candidate.id !== material.id,
  );
  events.push({
    type: "material_collected",
    itemName: material.name,
    quantity: material.quantity,
    position: { x: material.x, y: material.y },
  });
}

function alertTownGuard(state, target, events) {
  state.village.wantedLevel += 1;
  const guard = state.village.npcStates.find(
    (npc) => npc.personKey === "watchman",
  );
  guard.objective = "protect_town";
  guard.currentAction = "Investigating damage to town property";
  guard.actionReason = "player_crime";
  guard.actionTarget = { ...target };
  events.push({
    type: "guard_reacted",
    personId: guard.id,
    personName: "Friedel Koch",
    wantedLevel: state.village.wantedLevel,
    position: { ...guard.position },
  });
}

function manipulateVillage(state, intent, events) {
  const object = villageWorldObjectAt(state, intent.x, intent.y);
  executeHeroObjectAction(state, object, intent.action, events);
}

function enterDungeon(state, events) {
  state.location = "dungeon";
  state.depth = 1;
  attachActive(state);
  placePartyAt(state, state.entrance);
  visibility(state);
  events.push({
    type: "dungeon_entered",
    depth: state.depth,
    position: { x: state.hero.x, y: state.hero.y },
  });
}

function villageGood(itemKind) {
  if (!VILLAGE.shops.some((shop) => shop.goods.includes(itemKind))) return null;
  if (itemKind === "healing_potion")
    return {
      itemKind,
      name: "Healing potion",
      itemType: "consumable",
      priceCp: 50,
    };
  const equipment = ROGUE_EQUIPMENT[itemKind];
  return equipment ? { itemKind, itemType: "equipment", ...equipment } : null;
}

function buyConsumable(state, good) {
  const existing = state.hero.inventory.find(
    (item) => item.kind === good.itemKind,
  );
  if (existing) existing.quantity += 1;
  else
    state.hero.inventory.push({
      id: newInstanceId(),
      definitionId: definitionId("item", good.itemKind),
      entityType: "item",
      kind: good.itemKind,
      name: good.name,
      quantity: 1,
    });
  return state.hero;
}

function buyEquipment(state, actor, good) {
  const item = equipmentItem(newInstanceId(), good.itemKind);
  actor.inventory.push(item);
  equipItem(state, { itemId: item.id, actorId: actor.id }, []);
  return actor;
}

function shopBuy(state, intent, events) {
  const good = villageGood(intent.itemKind),
    actor = partyActorById(state, intent.actorId),
    shop = VILLAGE.shops.find((candidate) =>
      candidate.goods.includes(intent.itemKind),
    ),
    currentShop = villageShopAt(state.village.heroPosition);
  check(good, "SHOP_ITEM_NOT_FOUND", "That item is not sold in Stonebridge.");
  check(
    shop?.id === currentShop?.shopKey,
    "SHOP_NOT_PRESENT",
    `Enter ${shop?.name ?? "the shop"} before buying this item.`,
  );
  check(actor, "ACTOR_NOT_FOUND", "That buyer is not a member of the party.");
  check(
    state.hero.goldCp >= good.priceCp,
    "INSUFFICIENT_FUNDS",
    `The party needs ${good.priceCp} cp for ${good.name}.`,
  );
  state.hero.goldCp -= good.priceCp;
  const recipient =
    good.itemType === "equipment"
      ? buyEquipment(state, actor, good)
      : buyConsumable(state, good);
  events.push({
    type: "item_purchased",
    actorId: recipient.id,
    actorName: recipient.name,
    itemKind: good.itemKind,
    itemName: good.name,
    priceCp: good.priceCp,
    remainingCp: state.hero.goldCp,
    villageName: VILLAGE.name,
    position: null,
  });
}

function resolveVillageAction(state, intent, events) {
  if (intent.kind === "open_world") return openWorld(state, events);
  if (intent.kind === "local_move")
    return moveLocalParty(state, intent, events);
  if (intent.kind === "local_examine")
    return examineVillage(state, intent, events);
  if (intent.kind === "local_talk") return talkVillage(state, intent, events);
  if (intent.kind === "local_manipulate")
    return manipulateVillage(state, intent, events);
  if (intent.kind === "world_interact") {
    const object = villageWorldObjectAt(state, intent.x, intent.y);
    check(
      object.id === intent.objectId,
      "OBJECT_STALE",
      "That object has changed.",
    );
    return executeHeroObjectAction(state, object, intent.action, events);
  }
  if (intent.kind === "set_party_movement")
    return setVillagePartyMovement(state, intent, events);
  if (intent.kind === "shop_buy") return shopBuy(state, intent, events);
  if (intent.kind === "equip") return equipItem(state, intent, events);
  if (intent.kind === "unequip") return unequipItem(state, intent, events);
  throw new RuleError("VILLAGE_INTENT_REQUIRED", "Choose a village action.");
}

function resolveVillageTurn(state, intent, events) {
  const result = resolveVillageAction(state, intent, events);
  advanceVillageSimulation(state, intent, events, {
    terrainAt: ({ x, y }) => villageTile(state, x, y, false).tile,
  });
  return result;
}

function resolveExteriorTurn(state, intent, events) {
  if (intent.kind === "enter_dungeon") return enterDungeon(state, events);
  if (intent.kind === "open_world") return openWorld(state, events);
  if (intent.kind === "local_move")
    return moveLocalParty(state, intent, events);
  throw new RuleError(
    "EXTERIOR_INTENT_REQUIRED",
    "Choose a local-area action.",
  );
}

function resolveWorldTurn(state, intent, events) {
  if (intent.kind === "world_travel") return worldTravel(state, intent, events);
  if (intent.kind === "world_move") return worldMove(state, intent, events);
  if (intent.kind === "enter_location")
    return enterWorldLocation(state, events);
  throw new RuleError("WORLD_INTENT_REQUIRED", "Choose a world-map action.");
}

function resolveDyingTurn(state, intent, dice, events) {
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
  const statuses = { revived: "active", dead: "dead", stable: "stable" };
  state.status = statuses[outcome.result] ?? state.status;
}

function commandGroup(state, intent, events) {
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
  adoptFormation(state, "deployed", "leader_order", events);
}

function openDoor(state, intent, events) {
  const delta = DIRECTIONS[intent.direction];
  check(delta, "INVALID_DIRECTION", "Unknown direction.");
  const target = { x: state.hero.x + delta[0], y: state.hero.y + delta[1] },
    door = active(state).doors.find(
      (entry) => same(entry, target) && entry.revealed,
    );
  check(door, "NO_DOOR", "There is no known door there.");
  check(door.state === "closed", "DOOR_OPEN", "That door is already open.");
  door.state = "open";
  events.push({ type: "door_opened", doorId: door.id, position: target });
  addNoise(state, events, 5, target, "door");
}

function completeDungeon(state, events) {
  if (!same(state.hero, active(state).exit) || state.depth !== state.maxDepth)
    return;
  const bossAlive = aliveEnemies(state).some(
    (enemy) => ROGUE_BESTIARY[enemy.template].role === "boss",
  );
  if (bossAlive) return;
  state.status = "won";
  events.push({
    type: "exit_reached",
    actorId: state.hero.id,
    actorName: state.hero.name,
    position: { x: state.hero.x, y: state.hero.y },
    treasureCp: state.hero.goldCp,
  });
}

function enterCell(state, to, dice, events) {
  const previousPartyPositions = partyActors(state).map(({ x, y }) => ({
      x,
      y,
    })),
    from = previousPartyPositions[0];
  Object.assign(state.hero, to);
  events.push({
    type: "hero_move",
    actorId: state.hero.id,
    actorName: state.hero.name,
    from,
    to,
    position: to,
  });
  moveFollowers(state, previousPartyPositions, events);
  search(state, dice, events, { passive: true });
  collectGround(state, events);
  triggerShrine(state, events);
  triggerTrap(state, dice, events);
  completeDungeon(state, events);
}

function followerDestination(
  map,
  enemyPositions,
  companion,
  desired,
  reserved,
  occupied,
) {
  const available = (position) =>
    !blocked(map, position) &&
    !reserved.has(key(position)) &&
    !occupied.has(key(position)) &&
    !enemyPositions.has(key(position));
  if (available(desired)) return desired;
  if (available(companion)) return { x: companion.x, y: companion.y };
  return neighbors(map, companion).find(available) ?? null;
}

function moveFollowers(state, previousPositions, events) {
  if (state.partyGroup.order.movementMode !== "follow_leader") return;
  const reserved = new Set([key(state.hero)]),
    occupied = new Set(state.companions.map(key)),
    map = effectiveMap(state),
    enemyPositions = new Set(aliveEnemies(state).map(key));
  state.companions.forEach((companion, index) => {
    const from = { x: companion.x, y: companion.y };
    occupied.delete(key(companion));
    const destination = followerDestination(
      map,
      enemyPositions,
      companion,
      previousPositions[index],
      reserved,
      occupied,
    );
    if (!destination) return;
    Object.assign(companion, destination);
    reserved.add(key(destination));
    if (same(from, destination)) return;
    events.push({
      type: "companion_move",
      actorKind: "companion",
      actorId: companion.id,
      actorName: companion.name,
      groupId: state.partyGroup.id,
      from,
      to: { ...destination },
      position: { ...destination },
      reason: "follow_leader",
    });
  });
}

function moveHero(state, intent, dice, events) {
  const delta = DIRECTIONS[intent.direction];
  check(delta, "INVALID_DIRECTION", "Unknown movement direction.");
  state.partyTactics.facing = intent.direction;
  state.partyTactics.phase = "travel";
  state.partyTactics.anchor = null;
  const to = { x: state.hero.x + delta[0], y: state.hero.y + delta[1] };
  check(
    neighbors(effectiveMap(state), state.hero).some((position) =>
      same(position, to),
    ),
    "MOVE_BLOCKED",
    "That adjacent step is blocked.",
    { to },
  );
  const enemy = aliveEnemies(state).find((candidate) => same(candidate, to));
  if (!enemy) return enterCell(state, to, dice, events);
  attack(state.hero, enemy, dice, events, "hero");
  addNoise(state, events, 6, state.hero, "combat");
}

function waitTurn(state, events) {
  events.push({
    type: "hero_wait",
    actorId: state.hero.id,
    actorName: state.hero.name,
    position: { x: state.hero.x, y: state.hero.y },
  });
  adoptFormation(state, "deployed", "leader_stopped", events);
}

function resolveActiveTurn(state, intent, dice, events) {
  if (state.location === "village")
    return resolveVillageTurn(state, intent, events);
  if (state.location === "exterior")
    return resolveExteriorTurn(state, intent, events);
  if (state.location === "world")
    return resolveWorldTurn(state, intent, events);
  switch (intent.kind) {
    case "command":
      return commandGroup(state, intent, events);
    case "wait":
      return waitTurn(state, events);
    case "search":
      return search(state, dice, events);
    case "use_item":
      return useItem(state, intent, dice, events);
    case "invoke_item":
      return invokeItem(state, intent, dice, events);
    case "ranged_attack":
      return rangedAttack(state, intent, dice, events);
    case "throw_item":
      return throwItem(state, intent, dice, events);
    case "examine":
      return examineDungeon(state, intent, events);
    case "class_power":
      return useClassPower(state, dice, events);
    case "short_rest":
      return shortRest(state, dice, events);
    case "equip":
      return equipItem(state, intent, events);
    case "unequip":
      return unequipItem(state, intent, events);
    case "stairs":
      return descend(state, events);
    case "stairs_up":
      return ascend(state, events);
    case "open":
      return openDoor(state, intent, events);
    case "move":
      return moveHero(state, intent, dice, events);
    default:
      throw new RuleError("INVALID_INTENT", "Unsupported player intent.");
  }
}

export function applyRogueTurn(state, intent, dice = new Dice()) {
  check(
    ["active", "dying"].includes(state.status),
    "RUN_FINISHED",
    "This run has ended.",
    { status: state.status },
  );
  const events = [];
  if (state.status === "dying") resolveDyingTurn(state, intent, dice, events);
  else resolveActiveTurn(state, intent, dice, events);
  if (
    state.location === "dungeon" &&
    ["active", "dying"].includes(state.status)
  )
    resolveCompanions(state, dice, events);
  grantExperience(state, events);
  if (
    state.location === "dungeon" &&
    ["active", "dying"].includes(state.status)
  )
    resolveEnemies(state, dice, events);
  state.tick += 1;
  if (state.location === "dungeon") visibility(state);
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
          : same(position, level.entrance)
            ? "stairs_up"
            : same(position, level.exit)
              ? state.depth < state.maxDepth
                ? "stairs_down"
                : "exit"
              : difficult
                ? "difficult"
                : "floor",
  };
  if (!isVisible) return cell;
  const companion = state.companions.find((actor) => same(actor, position));
  if (companion)
    cell.partyMember = {
      id: companion.id,
      definitionId: companion.definitionId,
      entityType: companion.entityType,
      name: companion.name,
      class: companion.class,
      role: companion.role,
      glyph: companion.glyph,
      glyphReading: companion.glyphReading,
      hp: companion.hp,
      maxHp: companion.maxHp,
    };
  const enemy = aliveEnemies(state).find((e) => same(e, position));
  if (enemy) {
    const m = ROGUE_BESTIARY[enemy.template];
    cell.enemy = {
      id: enemy.id,
      definitionId: enemy.definitionId,
      entityType: enemy.entityType,
      name: enemy.name,
      template: enemy.template,
      glyph: m.glyph,
      glyphLanguage: m.glyphLanguage,
      glyphReading: m.glyphReading,
      role: m.role,
      faction: m.faction,
      adversaryKind: m.adversaryKind ?? "monster",
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
      definitionId: treasure.definitionId,
      entityType: treasure.entityType,
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
      definitionId: feature.definitionId,
      entityType: feature.entityType,
      kind: feature.kind,
      name: feature.name,
      spent: feature.spent,
    };
  return cell;
}

const VILLAGE_BUILDINGS = [
  {
    key: "smithy",
    x: 1,
    y: 1,
    w: 14,
    h: 9,
    name: "Red Hammer Smithy",
    glyph: "S",
    shopKey: "smithy",
    door: { x: 8, y: 9 },
  },
  {
    key: "apothecary",
    x: 25,
    y: 0,
    w: 15,
    h: 10,
    name: "Juniper & Salt",
    glyph: "A",
    shopKey: "apothecary",
    door: { x: 32, y: 9 },
  },
  {
    key: "armorer",
    x: 22,
    y: 13,
    w: 16,
    h: 11,
    name: "Gatehouse Armorer",
    glyph: "R",
    shopKey: "armorer",
    door: { x: 28, y: 13 },
  },
  {
    key: "inn",
    x: -15,
    y: 2,
    w: 13,
    h: 9,
    name: "The Lantern Inn",
    glyph: "I",
    door: { x: -8, y: 10 },
  },
  {
    key: "chapel",
    x: 42,
    y: 0,
    w: 12,
    h: 10,
    name: "Chapel of the Road",
    glyph: "P",
    door: { x: 47, y: 9 },
  },
  {
    key: "guildhall",
    x: 2,
    y: 27,
    w: 16,
    h: 10,
    name: "Delvers' Guildhall",
    glyph: "G",
    door: { x: 10, y: 27 },
  },
  {
    key: "stable",
    x: 39,
    y: 16,
    w: 13,
    h: 9,
    name: "South Road Stable",
    glyph: "H",
    door: { x: 39, y: 20 },
  },
];

const VILLAGE_SIGNS = [
  { x: 7, y: 10, text: "Red Hammer Smithy · weapons and repairs" },
  { x: 33, y: 10, text: "Juniper & Salt · remedies and provisions" },
  { x: 30, y: 10, text: "Gatehouse Armorer · armor and shields" },
  { x: 21, y: 10, text: "Stonebridge · Keep west · river road east" },
  { x: -7, y: 13, text: "The Lantern Inn · meals, beds and stories" },
  { x: 46, y: 10, text: "Chapel of the Road · travelers welcome" },
  { x: 11, y: 26, text: "Delvers' Guildhall · contracts and company" },
  { x: 38, y: 20, text: "South Road Stable · mounts and tack" },
];

export const villagePrincipalRoadAt = (x, y) =>
  y === 11 || y === 12 || x === 19 || x === 20;

export function villageRoadBuildingConflicts() {
  const conflicts = [];
  for (const building of VILLAGE_BUILDINGS)
    for (let y = building.y; y < building.y + building.h; y += 1)
      for (let x = building.x; x < building.x + building.w; x += 1)
        if (villagePrincipalRoadAt(x, y))
          conflicts.push({ buildingKey: building.key, x, y });
  return conflicts;
}

const VILLAGE_PARTITIONS = [
  { buildingKey: "smithy", axis: "x", at: 9, from: 2, to: 8, gaps: [5] },
  { buildingKey: "apothecary", axis: "y", at: 5, from: 26, to: 38, gaps: [32] },
  { buildingKey: "armorer", axis: "x", at: 30, from: 14, to: 22, gaps: [18] },
  { buildingKey: "inn", axis: "y", at: 6, from: -14, to: -3, gaps: [-8] },
  { buildingKey: "chapel", axis: "y", at: 7, from: 43, to: 52, gaps: [47] },
];

const VILLAGE_FURNITURE = [
  {
    x: 3,
    y: 3,
    glyph: "C",
    name: "Smith's counter",
    description:
      "A scarred oak counter holds chalked orders and iron fittings.",
  },
  {
    x: 11,
    y: 3,
    glyph: "F",
    name: "Stone forge",
    description:
      "Coal glows beneath a broad hood; half-worked steel waits beside it.",
  },
  {
    x: 5,
    y: 6,
    glyph: "T",
    name: "Worktable",
    description: "Hammers, tongs and punches lie in careful working order.",
  },
  {
    x: 7,
    y: 6,
    glyph: "c",
    name: "Heavy chair",
    description: "A low chair made to survive armored customers.",
  },
  {
    x: 27,
    y: 3,
    glyph: "C",
    name: "Apothecary counter",
    description:
      "A clean counter carries scales, folded papers and a brass mortar.",
  },
  {
    x: 36,
    y: 3,
    glyph: "S",
    name: "Herb shelves",
    description:
      "Bundles of feverfew, juniper and river mint fill the shelves.",
  },
  {
    x: 29,
    y: 7,
    glyph: "T",
    name: "Mixing table",
    description: "Stained glassware surrounds a slate mixing surface.",
  },
  {
    x: 34,
    y: 7,
    glyph: "c",
    name: "Patient's chair",
    description: "A straight-backed chair stands beside a wash basin.",
  },
  {
    x: 24,
    y: 16,
    glyph: "C",
    name: "Armorer's counter",
    description:
      "A reinforced counter is covered with buckles, rivets and leather straps.",
  },
  {
    x: 34,
    y: 16,
    glyph: "R",
    name: "Armor rack",
    description: "Mail, shields and fitted plates hang from a timber rack.",
  },
  {
    x: 26,
    y: 20,
    glyph: "T",
    name: "Fitting table",
    description: "Measuring cords and padded forms cover the fitting table.",
  },
  {
    x: 33,
    y: 20,
    glyph: "c",
    name: "Fitting stool",
    description: "A broad stool faces a polished copper mirror.",
  },
  {
    x: -12,
    y: 4,
    glyph: "C",
    name: "Inn bar",
    description: "A long bar smells of beeswax, cider and wood smoke.",
  },
  {
    x: -6,
    y: 4,
    glyph: "T",
    name: "Common table",
    description:
      "Initials and old dice scores are carved into the common table.",
  },
  {
    x: -4,
    y: 4,
    glyph: "c",
    name: "Common-room chair",
    description: "A mismatched chair has been repaired more than once.",
  },
  {
    x: 47,
    y: 4,
    glyph: "A",
    name: "Road altar",
    description: "Small stones and copper pins mark journeys safely completed.",
  },
  {
    x: 45,
    y: 8,
    glyph: "B",
    name: "Chapel bench",
    description: "A plain bench faces the road altar.",
  },
  {
    x: 8,
    y: 31,
    glyph: "T",
    name: "Guild map table",
    description:
      "Wax markers cover a map of ruins, roads and missing expeditions.",
  },
  {
    x: 43,
    y: 19,
    glyph: "H",
    name: "Horse stall",
    description: "Fresh straw and a leather halter fill the timber stall.",
  },
  {
    x: 36,
    y: 20,
    glyph: "W",
    name: "Stable supply cart",
    description:
      "A broad two-wheeled cart carries feed sacks, lamp oil and repair timber.",
  },
];

const VILLAGE_PEOPLE = [
  ["miller", "Greta Voll", "miller", 14, 11],
  ["baker", "Oskar Mertens", "baker", 22, 11],
  ["porter", "Lina Roth", "porter", 19, 14],
  ["watchman", "Friedel Koch", "watchman", 20, 9],
  ["child", "Anja", "errand runner", 15, 15],
  ["carter", "Bram Eder", "carter", 37, 11],
  ["pilgrim", "Sister Elske", "pilgrim", 41, 12],
  ["fisher", "Tomas Venn", "river fisher", -1, 11],
  ["hostler", "Pavel Dorn", "hostler", 38, 22],
  ["delver", "Ivo Brandt", "retired delver", 12, 25],
  ["smith", "Hanne Voss", "smith", 4, 7],
  ["herbalist", "Mei Lin", "apothecary", 37, 7],
  ["armorer", "Otto Kern", "armorer", 35, 21],
  ["innkeeper", "Marta Pell", "innkeeper", -11, 8],
].map(([key, name, role, x, y]) => ({
  key,
  name,
  role,
  x,
  y,
  glyph: "人",
  definitionId: definitionId("townsperson", key),
}));

const VILLAGE_DIALOGUE = {
  miller: "The river is high. Good for the wheel, bad for the east ford.",
  baker:
    "If you are bound for the keep, take bread now. It keeps better than courage.",
  porter:
    "The guild pays for sealed maps and reliable accounts of what lies below.",
  watchman: "Keep weapons lowered in town. Trouble belongs outside the gate.",
  child:
    "I know a path behind the chapel, but Sister Elske says not to show delvers.",
  carter: "The north road is firm. The river road is mud past the willow bend.",
  pilgrim: "The chapel keeps a lamp for travelers who have not yet returned.",
  fisher: "Something large has been turning beneath the old bridge after dusk.",
  hostler:
    "The stable has room, though the gray mare dislikes the smell of goblins.",
  delver:
    "Never let a narrow doorway break your formation. That lesson cost me a knee.",
  smith:
    "Bring me sound metal and honest coin; I can improve one of those weapons.",
  herbalist:
    "Juniper for the lungs, salt for the restless dead, and redleaf for wounds.",
  armorer: "A shield saves more lives than pride, especially underground.",
  innkeeper:
    "The Lantern has beds, stew, and rumors. Only the first two are dependable.",
};

const VILLAGE_OBJECTIVES = {
  watchman: ["protect_town", "Patrolling the market road"],
  child: ["deliver_messages", "Carrying a message to the mill"],
  porter: ["haul_goods", "Moving supplies between shops"],
  carter: ["tend_wagons", "Checking carts on the east road"],
  smith: ["work_trade", "Tending the forge"],
  herbalist: ["work_trade", "Preparing remedies"],
  armorer: ["work_trade", "Repairing armor"],
  innkeeper: ["work_trade", "Serving the common room"],
};

function createVillageNpcStates(runId) {
  return VILLAGE_PEOPLE.map((person) => {
    const [objective, currentAction] = VILLAGE_OBJECTIVES[person.key] ?? [
      "daily_life",
      `Working as ${person.role}`,
    ];
    return {
      id: namedUuid(runId, `townsperson:${person.key}`),
      personKey: person.key,
      position: { x: person.x, y: person.y },
      objective,
      currentAction,
      actionReason: "personal_routine",
      routeIndex: 0,
    };
  });
}

function villageBuildingAt(x, y) {
  return VILLAGE_BUILDINGS.find(
    (site) =>
      x >= site.x && x < site.x + site.w && y >= site.y && y < site.y + site.h,
  );
}

function villageShopAt(position) {
  const building = villageBuildingAt(position.x, position.y);
  return building &&
    position.x > building.x &&
    position.x < building.x + building.w - 1 &&
    position.y > building.y &&
    position.y < building.y + building.h - 1
    ? building
    : null;
}

function villageSignAt(x, y) {
  return VILLAGE_SIGNS.find((sign) => sign.x === x && sign.y === y);
}

function villageFurnitureAt(x, y) {
  return VILLAGE_FURNITURE.find((item) => item.x === x && item.y === y);
}

function villagePersonAt(state, x, y) {
  const activity = state.village.npcStates.find((entry) =>
    same(entry.position, { x, y }),
  );
  if (!activity) return null;
  const person = VILLAGE_PEOPLE.find(
    (candidate) => candidate.key === activity.personKey,
  );
  return { ...person, ...activity, x, y };
}

function villagePartitionAt(building, x, y) {
  return VILLAGE_PARTITIONS.some((partition) => {
    if (partition.buildingKey !== building.key) return false;
    const along = partition.axis === "x" ? y : x,
      across = partition.axis === "x" ? x : y;
    return (
      across === partition.at &&
      along >= partition.from &&
      along <= partition.to &&
      !partition.gaps.includes(along)
    );
  });
}

function villageTree(state, x, y) {
  const seed = [...state.seed].reduce(
      (sum, character) => sum + character.charCodeAt(0),
      0,
    ),
    noise = Math.abs((x * 73856093) ^ (y * 19349663) ^ seed) % 101,
    nearBuilding = VILLAGE_BUILDINGS.some(
      (site) =>
        x >= site.x - 2 &&
        x <= site.x + site.w + 1 &&
        y >= site.y - 2 &&
        y <= site.y + site.h + 1,
    );
  return !nearBuilding && noise < 14;
}

function villagePathAt(x, y) {
  if (villagePrincipalRoadAt(x, y)) return "road_stone";
  const onApproach = VILLAGE_BUILDINGS.some(({ door }) => {
    const verticalDistance = Math.abs(door.y - 11),
      horizontalDistance = Math.abs(door.x - 19);
    if (verticalDistance <= horizontalDistance)
      return (
        x === door.x && y >= Math.min(door.y, 11) && y <= Math.max(door.y, 11)
      );
    return (
      y === door.y && x >= Math.min(door.x, 19) && x <= Math.max(door.x, 19)
    );
  });
  return onApproach ? "road_dirt" : null;
}

function villageTile(state, x, y, includePeople = true) {
  const modification = state.village.modifications.find(
      (entry) => entry.x === x && entry.y === y,
    ),
    material = state.village.looseMaterials.find(
      (entry) => entry.x === x && entry.y === y,
    );
  if (modification) {
    const changed = {
      dug_ground: { tile: "village_pit", glyph: "○" },
      tree_stump: { tile: "outdoor_stump", glyph: "♧" },
      breached_wall: { tile: "village_rubble", glyph: ":" },
    }[modification.kind];
    return { ...changed, modification, material, featureName: changed.tile };
  }
  if (material)
    return {
      tile: "village_material",
      glyph: "*",
      material,
      featureName: material.name,
    };
  const building = villageBuildingAt(x, y),
    furniture = villageFurnitureAt(x, y),
    occupiedByParty = [
      state.village.heroPosition,
      ...state.village.companionPositions,
    ].some((position) => same(position, { x, y })),
    person = occupiedByParty ? null : villagePersonAt(state, x, y);
  if (includePeople && person)
    return {
      tile: "village_person",
      glyph: person.glyph,
      person: {
        ...person,
        category: [
          "smith",
          "herbalist",
          "armorer",
          "innkeeper",
          "hostler",
        ].includes(person.key)
          ? "shopkeeper"
          : ["watchman", "delver"].includes(person.key)
            ? "guard"
            : "civilian",
        id: namedUuid(state.id, `townsperson:${person.key}`),
        objective: person.objective,
        currentAction: person.currentAction,
        actionReason: person.actionReason,
      },
    };
  if (furniture)
    return { tile: "village_furniture", glyph: furniture.glyph, furniture };
  if (building) {
    const door = state.village.doors.find((candidate) =>
        same(candidate, { x, y }),
      ),
      boundary =
        x === building.x ||
        x === building.x + building.w - 1 ||
        y === building.y ||
        y === building.y + building.h - 1;
    if (door)
      return {
        tile: `village_door_${door.state}`,
        building,
        doorId: door.id,
        glyph: door.state === "open" ? "'" : "+",
      };
    if (!boundary && !villagePartitionAt(building, x, y))
      return {
        tile: "village_floor",
        building,
        glyph:
          x === building.x + 1 && y === building.y + 1 ? building.glyph : "·",
      };
    return {
      tile: "village_building",
      building,
      glyph: "#",
    };
  }
  const sign = villageSignAt(x, y),
    path = villagePathAt(x, y);
  if (sign) return { tile: "village_sign", glyph: "!", sign };
  if (path) return { tile: path, glyph: path === "road_stone" ? "=" : ":" };
  if (villageTree(state, x, y))
    return { tile: "outdoor_tree", glyph: "♣", featureName: "Tree" };
  return { tile: "outdoor_grass", glyph: "," };
}

function villageObjectId(state, kind, keyValue) {
  return namedUuid(state.id, `village-object:${kind}:${keyValue}`);
}

function villageObject(state, kind, keyValue, position, values) {
  return {
    id: villageObjectId(state, kind, keyValue),
    definitionId: definitionId("world-object", kind),
    entityType: "world-object",
    objectKind: kind,
    position,
    ...values,
  };
}

function fixtureObject(state, terrain, position) {
  const fixture = terrain.furniture,
    lowerName = fixture.name.toLowerCase(),
    fixtureKind = lowerName.includes("forge")
      ? "forge"
      : lowerName.includes("counter")
        ? "counter"
        : lowerName.includes("cart")
          ? "cart"
          : "fixture",
    useLabels = {
      forge: "Work forge",
      counter: "Review counter",
      cart: "Inspect cargo",
      fixture: `Use ${fixture.name}`,
    };
  return villageObject(
    state,
    fixtureKind,
    `${position.x},${position.y}`,
    position,
    {
      name: fixture.name,
      description: fixture.description,
      affordanceKeys: ["examine", "use"],
      actionLabels: { use: useLabels[fixtureKind] },
    },
  );
}

function personObject(state, terrain, position) {
  const person = terrain.person;
  return {
    id: person.id,
    definitionId: person.definitionId,
    entityType: "actor",
    objectKind: "resident",
    position,
    name: person.name,
    description: `${person.name} is a ${person.role} of Stonebridge. Objective: ${person.objective.replaceAll("_", " ")}. Currently: ${person.currentAction}.`,
    personKey: person.key,
    affordanceKeys: ["examine", "talk"],
  };
}

function materialObject(terrain, position) {
  const material = terrain.material;
  return {
    ...material,
    objectKind: "material",
    position,
    description: `${material.quantity} ${MATERIAL_DEFINITIONS[material.kind].unit}${material.quantity === 1 ? "" : "s"} can be collected here.`,
    affordanceKeys: ["examine", "collect"],
  };
}

function buildingObject(state, terrain, position) {
  const door = state.village.doors.find((candidate) =>
    same(candidate, position),
  );
  if (door)
    return {
      ...door,
      definitionId: definitionId("world-object", "door"),
      objectKind: "door",
      position,
      name: `${terrain.building.name} door`,
      description: `The ${terrain.building.name} door is ${door.state}.`,
      affordanceKeys: ["examine", "open"],
    };
  const isWall = terrain.tile === "village_building";
  return villageObject(
    state,
    isWall ? "wall" : "room",
    `${terrain.building.key}:${position.x},${position.y}`,
    position,
    {
      name: isWall ? `${terrain.building.name} wall` : terrain.building.name,
      description: isWall
        ? `Solid timber-and-stone construction protects ${terrain.building.name}.`
        : `A usable interior room inside ${terrain.building.name}.`,
      affordanceKeys: isWall ? ["examine", "breach"] : ["examine"],
    },
  );
}

export function villageWorldObjectAt(state, x, y) {
  const position = { x, y },
    terrain = villageTile(state, x, y);
  if (terrain.person) return personObject(state, terrain, position);
  if (terrain.material) return materialObject(terrain, position);
  if (terrain.furniture) return fixtureObject(state, terrain, position);
  if (terrain.building) return buildingObject(state, terrain, position);
  if (terrain.sign)
    return villageObject(state, "sign", `${x},${y}`, position, {
      name: "Posted sign",
      description: `The sign reads: “${terrain.sign.text}.”`,
      text: terrain.sign.text,
      affordanceKeys: ["read"],
    });
  if (terrain.tile === "outdoor_tree")
    return villageObject(state, "tree", `${x},${y}`, position, {
      name: "Old tree",
      description: "An old shade tree marks the settled edge of Stonebridge.",
      affordanceKeys: ["examine", "harvest"],
    });
  const diggable = ["outdoor_grass", "road_dirt"].includes(terrain.tile);
  return villageObject(state, "terrain", `${x},${y}`, position, {
    name: terrain.featureName ?? terrain.tile.replaceAll("_", " "),
    description: villageExamination(state, position).detail,
    affordanceKeys: diggable ? ["examine", "dig"] : ["examine"],
  });
}

function villageActorForInteraction(state, actorId) {
  if (state.hero.id === actorId)
    return {
      record: state.hero,
      view: { ...state.hero, position: state.village.heroPosition },
    };
  const companionIndex = state.companions.findIndex(
    (actor) => actor.id === actorId,
  );
  if (companionIndex >= 0)
    return {
      record: state.companions[companionIndex],
      view: {
        ...state.companions[companionIndex],
        position: state.village.companionPositions[companionIndex],
      },
    };
  const npc = state.village.npcStates.find((actor) => actor.id === actorId);
  if (npc) return { record: npc, view: { ...npc, inventory: [] } };
  throw new RuleError("ACTOR_NOT_FOUND", "That village actor does not exist.");
}

export function villageObjectAffordances(state, actorId, object) {
  const actor = villageActorForInteraction(state, actorId);
  return describeAffordances(actor.view, object, {
    position: actor.view.position,
    visible: true,
  });
}

function describeVillageObject(object, events, action) {
  events.push({
    type: "local_examined",
    objectId: object.id,
    action,
    name: object.name,
    detail: object.description,
    position: { ...object.position },
  });
}

function talkToVillageResident(object, events) {
  events.push({
    type: "local_talked",
    personId: object.id,
    personName: object.name,
    role: VILLAGE_PEOPLE.find((person) => person.key === object.personKey).role,
    dialogue: VILLAGE_DIALOGUE[object.personKey],
    position: { ...object.position },
  });
}

function openVillageObject(state, object, events) {
  const door = state.village.doors.find(
    (candidate) => candidate.id === object.id,
  );
  check(door, "DOOR_MISSING", "That door no longer exists.");
  door.state = "open";
  events.push({
    type: "door_opened",
    doorId: door.id,
    position: { ...object.position },
  });
}

function manipulateVillageObject(state, actor, object, action, events) {
  const result = {
      dig: ["dug_ground", "earth", 1],
      harvest: ["tree_stump", "timber", 2],
      breach: ["breached_wall", "stone", 2],
    }[action],
    toolTags = { dig: "dig", harvest: "cut", breach: "breach" },
    tool = interactionTool(actor, toolTags[action]),
    terrain = villageTile(state, object.position.x, object.position.y);
  addVillageModification(
    state,
    actor.id,
    result[0],
    object.position,
    terrain.tile,
  );
  const material = createLooseMaterial(
    state,
    result[1],
    object.position,
    result[2],
  );
  events.push({
    type: "world_manipulated",
    action,
    actorId: actor.id,
    objectId: object.id,
    toolId: tool.id,
    toolName: tool.name,
    materialId: material.id,
    materialName: material.name,
    quantity: material.quantity,
    position: { ...object.position },
  });
  if (action === "breach") alertTownGuard(state, object.position, events);
}

function applyVillageAffordance(state, actor, object, affordance, events) {
  if (["examine", "read"].includes(affordance.key))
    return describeVillageObject(object, events, affordance.key);
  if (affordance.key === "talk") return talkToVillageResident(object, events);
  if (affordance.key === "open")
    return openVillageObject(state, object, events);
  if (affordance.key === "collect") {
    const material = state.village.looseMaterials.find(
      (candidate) => candidate.id === object.id,
    );
    check(material, "MATERIAL_MISSING", "There is nothing to collect.");
    return collectMaterial(state, actor, material, events);
  }
  if (["dig", "harvest", "breach"].includes(affordance.key))
    return manipulateVillageObject(
      state,
      actor,
      object,
      affordance.key,
      events,
    );
  events.push({
    type: "object_used",
    actorId: actor.id,
    objectId: object.id,
    objectName: object.name,
    action: affordance.key,
    position: { ...object.position },
  });
}

export function executeVillageInteraction(state, input, events = []) {
  const actor = villageActorForInteraction(state, input.actorId),
    object = villageWorldObjectAt(state, input.x, input.y);
  check(
    object.id === input.objectId,
    "OBJECT_STALE",
    "That object has changed.",
  );
  const affordance = villageObjectAffordances(
    state,
    input.actorId,
    object,
  ).find((candidate) => candidate.key === input.action);
  check(affordance, "AFFORDANCE_MISSING", "That object has no such action.");
  check(affordance.available, "AFFORDANCE_UNAVAILABLE", affordance.reason, {
    objectId: object.id,
    action: input.action,
  });
  applyVillageAffordance(state, actor.record, object, affordance, events);
  return { object, affordance };
}

function localPartyCells(
  state,
  definition,
  area,
  tileAt,
  origin = { x: 0, y: 0 },
) {
  const companions = new Map(
      area.companionPositions.map((position, index) => [
        key(position),
        state.companions[index],
      ]),
    ),
    cells = [];
  for (let y = 0; y < definition.height; y++)
    for (let x = 0; x < definition.width; x++) {
      const world = { x: x + origin.x, y: y + origin.y },
        terrain = tileAt(state, world.x, world.y),
        cell = {
          ...world,
          visibility: "visible",
          ...(typeof terrain === "string" ? { tile: terrain } : terrain),
        },
        companion = companions.get(key(cell));
      if (companion) cell.partyMember = localPartyMember(companion);
      cells.push(cell);
    }
  return cells;
}

function localPartyMember(companion) {
  return {
    id: companion.id,
    name: companion.name,
    class: companion.class,
    glyph: companion.glyph,
    hp: companion.hp,
    maxHp: companion.maxHp,
  };
}

function villageViewportOrigin(state) {
  return {
    x: state.village.heroPosition.x - Math.floor(VILLAGE.width / 2),
    y: state.village.heroPosition.y - Math.floor(VILLAGE.height / 2),
  };
}

function villageObjectCell(state, cell) {
  const object = villageWorldObjectAt(state, cell.x, cell.y);
  return {
    ...cell,
    object: {
      ...object,
      affordances: villageObjectAffordances(state, state.hero.id, object),
    },
  };
}

function villageView(state) {
  const origin = villageViewportOrigin(state),
    cells = localPartyCells(
      state,
      VILLAGE,
      state.village,
      villageTile,
      origin,
    ).map((cell) => villageObjectCell(state, cell)),
    entityIndex = createEntityIndex(cells.map((cell) => cell.object)),
    currentShopKey = villageShopAt(state.village.heroPosition)?.shopKey ?? null;
  return {
    name: VILLAGE.name,
    description: VILLAGE.description,
    visits: state.villageVisits,
    partyMovement: state.village.partyMovement,
    heroPosition: { ...state.village.heroPosition },
    entityCount: entityIndex.size,
    map: {
      width: VILLAGE.width,
      height: VILLAGE.height,
      origin: { ...origin },
      rolling: true,
      cells,
    },
    currentShopKey,
    shops: VILLAGE.shops.map((shop) => ({
      ...shop,
      accessible: shop.id === currentShopKey,
      goods: shop.goods.map(villageGood),
    })),
    buyers: partyActors(state).map((actor) => ({
      id: actor.id,
      name: actor.name,
      class: actor.class,
    })),
  };
}

function exteriorTile(x, y) {
  const boundary =
      x === 0 ||
      y === 0 ||
      x === EXTERIOR.width - 1 ||
      y === EXTERIOR.height - 1,
    ruinWall =
      x >= 6 &&
      x <= 14 &&
      y >= 7 &&
      y <= 13 &&
      (x === 6 || x === 14 || y === 7 || y === 13);
  if (x === 10 && y === 13) return "stairs_down";
  if (ruinWall) return "outdoor_ruin";
  if (x >= 27 && y >= 22 && (x + y) % 3 !== 0) return "outdoor_water";
  if (x >= 33 && x <= 35) return "road_dirt";
  if (y >= 14 && y <= 16) return "road_stone";
  if (boundary || ((x * 7 + y * 11) % 43 === 0 && y !== 15))
    return "outdoor_tree";
  return "outdoor_grass";
}

function exteriorView(state) {
  const cells = localPartyCells(
    state,
    EXTERIOR,
    state.exterior,
    (_state, x, y) => exteriorTile(x, y),
  );
  return {
    name: EXTERIOR.name,
    description: EXTERIOR.description,
    safe: !state.exterior.danger,
    dangerReason: state.exterior.dangerReason,
    heroPosition: { ...state.exterior.heroPosition },
    map: { width: EXTERIOR.width, height: EXTERIOR.height, cells },
  };
}

function worldRoutePath(from, to) {
  const steps = Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y));
  return Array.from({ length: steps + 1 }, (_, index) => ({
    x: Math.round(from.x + ((to.x - from.x) * index) / steps),
    y: Math.round(from.y + ((to.y - from.y) * index) / steps),
  }));
}

function worldViewportOrigin(state) {
  const current = state.world.coordinates,
    currentNode = WORLD.nodes.find((node) => node.id === state.world.position),
    connected = WORLD.routes
      .filter(
        (route) =>
          currentNode && [route.from, route.to].includes(currentNode.id),
      )
      .map((route) =>
        WORLD.nodes.find(
          (node) =>
            node.id === (route.from === currentNode.id ? route.to : route.from),
        ),
      ),
    points = [current, ...connected],
    center = (axis) =>
      (Math.min(...points.map((point) => point[axis])) +
        Math.max(...points.map((point) => point[axis]))) /
      2;
  return {
    x: Math.floor(center("x") - WORLD.viewport.width / 2),
    y: Math.floor(center("y") - WORLD.viewport.height / 2),
  };
}

function worldTerrain(seed, x, y) {
  const seedValue = [...seed].reduce(
      (total, character) => total + character.charCodeAt(0),
      0,
    ),
    noise = Math.abs((x * 73856093) ^ (y * 19349663) ^ seedValue) % 101,
    riverCenter = 21 + Math.round(Math.sin((y + (seedValue % 17)) / 5) * 3),
    elevation =
      Math.sin((x + (seedValue % 23)) / 7) +
      Math.cos((y - (seedValue % 19)) / 6) +
      noise / 150;
  if (Math.abs(x - riverCenter) <= 1) return "world_water";
  if (elevation > 1.45) return "world_mountain";
  return noise < 12 ? "world_tree" : "world_grass";
}

function worldFeatures() {
  const nodes = new Map(WORLD.nodes.map((node) => [node.id, node])),
    routes = WORLD.routes.map((route) => ({
      ...route,
      path: worldRoutePath(nodes.get(route.from), nodes.get(route.to)),
    })),
    roads = new Map(
      routes.flatMap((route) =>
        route.path.map((position) => [key(position), route.material]),
      ),
    ),
    destinations = new Map(WORLD.nodes.map((node) => [key(node), node]));
  return { routes, roads, destinations };
}

function worldCellView(state, origin, features, x, y) {
  const worldPosition = { x: origin.x + x, y: origin.y + y },
    destination = features.destinations.get(key(worldPosition)),
    material = features.roads.get(key(worldPosition));
  return {
    x,
    y,
    worldX: worldPosition.x,
    worldY: worldPosition.y,
    tile: destination
      ? `world_${destination.kind}`
      : material
        ? `road_${material}`
        : worldTerrain(state.seed, worldPosition.x, worldPosition.y),
    destination: destination ? structuredClone(destination) : null,
  };
}

function worldViewportCells(state, origin, features) {
  const cells = [];
  for (let y = 0; y < WORLD.viewport.height; y++)
    for (let x = 0; x < WORLD.viewport.width; x++)
      cells.push(worldCellView(state, origin, features, x, y));
  return cells;
}

function worldMapView(state) {
  const features = worldFeatures(),
    origin = worldViewportOrigin(state),
    cells = worldViewportCells(state, origin, features),
    localize = (position) => ({
      x: position.x - origin.x,
      y: position.y - origin.y,
    }),
    routes = features.routes.map((route) => ({
      ...route,
      path: route.path.map(localize),
    }));
  return { ...WORLD.viewport, origin, cells, routes, localize };
}

function worldView(state) {
  const map = worldMapView(state);
  return {
    ...structuredClone(WORLD),
    open: true,
    tileSystem: "rolling",
    cameraMode: "static",
    nodes: WORLD.nodes.map((node) => ({ ...node, ...map.localize(node) })),
    routes: map.routes,
    map: {
      width: map.width,
      height: map.height,
      cells: map.cells,
      rolling: true,
    },
    position: state.world.position,
    party: {
      groupId: state.partyGroup.id,
      name: state.partyGroup.name,
      glyph: WORLD.groupGlyph,
      glyphReading: WORLD.groupGlyphReading,
      memberCount: livingParty(state).length,
      position: map.localize(state.world.coordinates),
    },
  };
}

export function rogueRunView(state, recentEvents = []) {
  const level = active(state),
    currentVisible = visibility(state),
    cells = [],
    outside = exteriorView(state),
    village = villageView(state);
  for (let y = 0; y < level.map.height; y++)
    for (let x = 0; x < level.map.width; x++) {
      const cell = cellView(state, { x, y }, currentVisible);
      if (cell) cells.push(cell);
    }
  const visibleEvent = (event) =>
    state.location !== "dungeon" ||
    event.actorKind === "hero" ||
    event.actorId === state.hero.id ||
    event.targetId === state.hero.id ||
    (event.position && currentVisible.has(key(event.position))) ||
    (event.from && currentVisible.has(key(event.from))) ||
    (event.to && currentVisible.has(key(event.to)));
  const here = roomAt(level, state.hero);
  const hero = structuredClone(state.hero);
  if (state.location === "exterior") Object.assign(hero, outside.heroPosition);
  if (state.location === "village") Object.assign(hero, village.heroPosition);
  return {
    runId: state.id,
    revision: state.revision,
    tick: state.tick,
    status: state.status,
    location: state.location,
    village,
    world: worldView(state),
    exterior: outside,
    ruleset: state.ruleset,
    combatProfile: ROGUE_DND_PROFILE,
    depth: state.depth,
    maxDepth: state.maxDepth,
    title:
      state.location === "village"
        ? VILLAGE.name
        : state.location === "world"
          ? WORLD.name
          : state.location === "exterior"
            ? "Rooted Keep approach"
            : level.theme.title,
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
    currentRoom:
      state.location === "dungeon" && here
        ? {
            id: here.id,
            definitionId: here.definitionId,
            entityType: here.entityType,
            name: here.name,
            purpose: here.purpose,
            description: here.description,
          }
        : null,
    map:
      state.location === "exterior"
        ? outside.map
        : state.location === "village"
          ? village.map
          : { width: level.map.width, height: level.map.height, cells },
    hero,
    companions: structuredClone(state.companions),
    groups: rogueGroupsView(state, currentVisible),
    enemyCount:
      state.location === "dungeon"
        ? aliveEnemies(state).length
        : state.location === "exterior" && state.exterior.danger
          ? 1
          : 0,
    treasureRemaining: level.treasures.filter((item) => !item.collected).length,
    factions: [
      ...new Set(
        aliveEnemies(state).map((e) => ROGUE_BESTIARY[e.template].faction),
      ),
    ],
    rest:
      state.location === "dungeon"
        ? restStatus(state)
        : {
            available: false,
            reason: "Rest at the village inn.",
            die: 0,
            remaining: 0,
          },
    legalIntents:
      state.status === "dying"
        ? ["death_save"]
        : state.status === "active"
          ? state.location === "village"
            ? [
                "local_move",
                "local_examine",
                "local_talk",
                "local_manipulate",
                "world_interact",
                "set_party_movement",
                "open_world",
                ...(village.currentShopKey ? ["shop_buy"] : []),
                "equip",
                "unequip",
              ]
            : state.location === "exterior"
              ? [
                  "local_move",
                  "enter_dungeon",
                  ...(!state.exterior.danger ? ["open_world"] : []),
                ]
              : state.location === "world"
                ? [
                    "world_move",
                    "world_travel",
                    ...(state.world.position ? ["enter_location"] : []),
                  ]
                : [
                    "move",
                    "command",
                    "open",
                    "wait",
                    "search",
                    "use_item",
                    "invoke_item",
                    "ranged_attack",
                    "throw_item",
                    "examine",
                    "class_power",
                    "short_rest",
                    "equip",
                    "unequip",
                    ...(same(state.hero, level.entrance) ? ["stairs_up"] : []),
                    ...(same(state.hero, level.exit) &&
                    state.depth < state.maxDepth
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

function migrateGroup(group, value, actorIds, side, fallbackName) {
  const legacyId = group?.id ?? `${side}-group`,
    id = isUuid(legacyId)
      ? legacyId
      : migratedInstanceId(value.id, "group", legacyId),
    legacyAssignments = group?.assignments ?? group?.members ?? [],
    legacyMemberIds =
      group?.memberIds ?? legacyAssignments.map((member) => member.actorId),
    memberIds = legacyMemberIds.map(
      (actorId) => actorIds.get(actorId) ?? actorId,
    ),
    assignments = legacyAssignments.map((assignment) => ({
      ...assignment,
      actorId: actorIds.get(assignment.actorId) ?? assignment.actorId,
    })),
    hasStoredLeader = Object.hasOwn(group ?? {}, "leaderId"),
    leaderId = hasStoredLeader
      ? group.leaderId === null
        ? null
        : (actorIds.get(group.leaderId) ?? group.leaderId)
      : memberIds[0];
  const migrated = createGroup({
    id,
    definitionId:
      group?.definitionId ??
      definitionId(
        "group",
        side === "party" ? "adventuring-party" : `enemy:${fallbackName}`,
      ),
    name: group?.name ?? fallbackName,
    side,
    memberIds,
    assignments,
    leaderId,
    formation: group?.order?.formation ?? "column",
    objective: group?.order?.objective ?? "explore",
    resourcePolicy: group?.order?.resourcePolicy ?? "balanced",
    retreatThreshold: group?.order?.retreatThreshold ?? 25,
    movementMode:
      group?.order?.movementMode ??
      (side === "party" ? "follow_leader" : "individual"),
  });
  migrated.leadershipRevision = group?.leadershipRevision ?? 0;
  migrated.commandRevision = group?.commandRevision ?? 0;
  migrated.order = {
    ...migrated.order,
    ...(group?.order ?? {}),
    targetId:
      actorIds.get(group?.order?.targetId) ?? group?.order?.targetId ?? null,
    issuedBy:
      group?.order?.issuedBy === null
        ? null
        : (actorIds.get(group?.order?.issuedBy) ?? leaderId),
  };
  return migrated;
}

function identityMigration(value) {
  const actorIds = new Map(),
    objectIds = new Map(),
    actorId = (legacyId) => {
      const id = isUuid(legacyId)
        ? legacyId
        : migratedInstanceId(value.id, "actor", legacyId);
      actorIds.set(legacyId, id);
      return id;
    },
    objectId = (kind, legacyId) => {
      const id = isUuid(legacyId)
        ? legacyId
        : migratedInstanceId(value.id, kind, legacyId);
      objectIds.set(legacyId, id);
      return id;
    };
  return { actorIds, objectIds, actorId, objectId };
}

function migrateHeroIdentity(value, actorId) {
  const legacyHeroId = value.hero.id;
  value.hero.id = actorId(legacyHeroId);
  value.hero.definitionId ??= definitionId("actor-archetype", value.hero.class);
  value.hero.entityType = "actor";
  if (value.hero.classPower.id && !value.hero.classPower.key) {
    value.hero.classPower.key = value.hero.classPower.id;
    delete value.hero.classPower.id;
  }
  value.hero.classPower.definitionId ??= definitionId(
    "feature",
    value.hero.classPower.key,
  );
}

function migrateCompanionIdentities(value, actorId) {
  value.companions ??= createCompanions((key) => actorId(`companion:${key}`));
  for (const companion of value.companions) {
    const template =
      COMPANION_TEMPLATES.find(({ name }) => name === companion.name) ??
      COMPANION_TEMPLATES[0];
    companion.id = actorId(companion.id);
    companion.definitionId ??= definitionId(
      "actor-archetype",
      companion.name.toLowerCase().replaceAll(" ", "-"),
    );
    companion.entityType = "actor";
    for (const field of [
      "attackBonus",
      "damage",
      "damageType",
      "attackRange",
      "supportUses",
    ])
      companion[field] ??= template[field] ?? 0;
    companion.baseAc ??= template.ac;
    companion.baseAttackBonus ??= template.attackBonus;
    companion.baseDamage ??= template.damage;
    companion.baseDamageType ??= template.damageType;
    companion.conditions ??= [];
    companion.death ??= { successes: 0, failures: 0 };
    companion.dead ??= false;
    companion.inventory ??= [];
    companion.equipment ??= { weapon: null, armor: null, offhand: null };
  }
}

function migrateRooms(level, objectId) {
  const roomIds = new Map();
  for (const room of level.rooms) {
    const legacyId = room.id;
    room.id = objectId("room", legacyId);
    roomIds.set(legacyId, room.id);
    room.definitionId ??= definitionId("room", room.purpose ?? "room");
    room.entityType = "room";
  }
  return roomIds;
}

function migrateConnections(level, roomIds, objectId) {
  for (const connection of level.connections ?? []) {
    connection.id = objectId("connection", connection.id);
    connection.definitionId ??= definitionId("connection", connection.kind);
    connection.entityType = "connection";
    connection.from = roomIds.get(connection.from) ?? connection.from;
    connection.to = roomIds.get(connection.to) ?? connection.to;
  }
}

function migrateEnemies(level, roomIds, actorId, objectId) {
  for (const enemy of level.enemies) {
    const legacyId = enemy.id;
    enemy.id = actorId(legacyId);
    enemy.definitionId ??= definitionId("actor", `creature:${enemy.template}`);
    enemy.entityType = "actor";
    enemy.homeRoomId = roomIds.get(enemy.homeRoomId) ?? enemy.homeRoomId;
    if (enemy.packId && !isUuid(enemy.packId))
      enemy.packId = objectId("enemy-pack", enemy.packId);
  }
}

function migrateLevelObjects(level, objectIds, objectId) {
  for (const treasure of level.treasures) {
    treasure.id = objectId("treasure", treasure.id);
    treasure.definitionId ??= definitionId(
      "treasure",
      treasure.name.toLowerCase(),
    );
    treasure.entityType = "treasure";
  }
  for (const door of level.doors) {
    door.id = objectId("door", door.id);
    door.definitionId ??= definitionId(
      "door",
      door.secret ? "secret" : "ordinary",
    );
    door.entityType = "door";
    door.connectionId = objectIds.get(door.connectionId) ?? door.connectionId;
  }
  for (const feature of level.features) {
    const kind = feature.kind === "item" ? "item" : "feature";
    feature.id = objectId(kind, feature.id);
    feature.definitionId ??= definitionId(
      kind,
      feature.itemKind ?? feature.kind,
    );
    feature.entityType = kind;
  }
}

function migrateLevelIdentity(level, migration) {
  level.id = migration.objectId(
    "dungeon-level",
    level.id ?? `level-${level.depth}`,
  );
  level.definitionId ??= definitionId(
    "dungeon-level",
    level.theme?.archetype ?? "dungeon",
  );
  level.entityType = "dungeon-level";
  const roomIds = migrateRooms(level, migration.objectId);
  migrateConnections(level, roomIds, migration.objectId);
  migrateEnemies(level, roomIds, migration.actorId, migration.objectId);
  migrateLevelObjects(level, migration.objectIds, migration.objectId);
}

function migrateActorItems(actor, objectIds, objectId) {
  for (const item of actor.inventory ?? []) {
    item.id = objectIds.get(item.id) ?? objectId("item", item.id);
    item.definitionId ??= definitionId("item", item.kind);
    item.entityType = "item";
  }
  for (const slot of ["weapon", "armor", "offhand"])
    if (actor.equipment?.[slot])
      actor.equipment[slot] =
        objectIds.get(actor.equipment[slot]) ?? actor.equipment[slot];
}

function migratePartyItems(value, objectIds, objectId) {
  for (const actor of partyActors(value))
    migrateActorItems(actor, objectIds, objectId);
  for (const treasure of value.hero.treasures ?? []) {
    treasure.id =
      objectIds.get(treasure.id) ?? objectId("treasure", treasure.id);
    treasure.definitionId ??= definitionId(
      "treasure",
      treasure.name.toLowerCase(),
    );
    treasure.entityType = "treasure";
  }
}

function migratePartyGroup(value, actorIds) {
  const actors = partyActors(value);
  value.partyGroup ??= {
    id: "party",
    name: `${value.hero.name}'s company`,
    side: "party",
    members: [{ actorId: value.hero.id, role: "leader", commandScore: 100 }],
    leaderId: value.hero.id,
  };
  value.partyGroup.memberIds ??= (value.partyGroup.members ?? []).map(
    (member) => member.actorId,
  );
  value.partyGroup.assignments ??= value.partyGroup.members ?? [];
  value.partyGroup.memberIds = value.partyGroup.memberIds.map(
    (actorId) => actorIds.get(actorId) ?? actorId,
  );
  value.partyGroup.assignments = value.partyGroup.assignments.map(
    (assignment) => ({
      ...assignment,
      actorId: actorIds.get(assignment.actorId) ?? assignment.actorId,
    }),
  );
  for (const actor of actors) {
    if (!value.partyGroup.memberIds.includes(actor.id))
      value.partyGroup.memberIds.push(actor.id);
    if (
      !value.partyGroup.assignments.some(
        (assignment) => assignment.actorId === actor.id,
      )
    )
      value.partyGroup.assignments.push({
        actorId: actor.id,
        role: actor.role ?? "member",
        commandScore: actor.id === value.hero.id ? 100 : 40,
      });
  }
  value.partyGroup = migrateGroup(
    value.partyGroup,
    value,
    actorIds,
    "party",
    `${value.hero.name}'s company`,
  );
}

function assignEnemyGroups(level, value, actorIds) {
  level.enemyGroups ??= buildEnemyGroups(level.enemies, level.depth);
  level.enemyGroups = level.enemyGroups.map((group) =>
    migrateGroup(group, value, actorIds, "enemy", group.name),
  );
  const groupIds = new Map(
    level.enemyGroups.map((group) => [group.name, group.id]),
  );
  for (const group of level.enemyGroups)
    for (const actorId of group.memberIds) {
      const enemy = level.enemies.find((candidate) => candidate.id === actorId);
      if (enemy) enemy.groupId = group.id;
    }
  for (const enemy of level.enemies)
    if (!isUuid(enemy.groupId))
      enemy.groupId = groupIds.get(
        ROGUE_BESTIARY[enemy.template].faction.replaceAll("_", " "),
      );
}

function migrateIdentity(value) {
  const migration = identityMigration(value);
  migrateHeroIdentity(value, migration.actorId);
  migrateCompanionIdentities(value, migration.actorId);
  for (const level of value.levels) migrateLevelIdentity(level, migration);
  migratePartyItems(value, migration.objectIds, migration.objectId);
  migratePartyGroup(value, migration.actorIds);
  for (const level of value.levels) {
    assignEnemyGroups(level, value, migration.actorIds);
  }
  value.schemaVersion = 11;
  value.location ??= "dungeon";
  value.villageVisits ??= 0;
  value.world ??= {
    position: value.location === "village" ? "stonebridge" : "dungeon_entrance",
  };
  const worldNode =
    WORLD.nodes.find((node) => node.id === value.world.position) ??
    WORLD.nodes[0];
  value.world.coordinates ??= { x: worldNode.x, y: worldNode.y };
  value.exterior ??= { danger: false, dangerReason: null };
  value.exterior.heroPosition ??= { ...EXTERIOR.heroPosition };
  value.exterior.companionPositions ??= structuredClone(
    EXTERIOR.companionPositions,
  );
  value.village ??= {};
  value.village.heroPosition ??= { ...VILLAGE.heroPosition };
  value.village.companionPositions ??= structuredClone(
    VILLAGE.companionPositions,
  );
  value.village.viewportOrigin ??= { ...VILLAGE.viewportOrigin };
  value.village.partyMovement ??= "follow";
  value.village.modifications ??= [];
  value.village.looseMaterials ??= [];
  value.village.wantedLevel ??= 0;
  value.village.npcStates ??= createVillageNpcStates(value.id);
  for (const npc of value.village.npcStates) {
    npc.id ??= namedUuid(value.id, `townsperson:${npc.personKey}`);
    npc.actionReason ??= "personal_routine";
    npc.routeIndex ??= 0;
  }
  for (const toolKind of ["hand_axe", "field_shovel"])
    if (!value.hero.inventory.some((item) => item.kind === toolKind))
      value.hero.inventory.push(equipmentItem(newInstanceId(), toolKind));
  value.village.doors ??= VILLAGE_BUILDINGS.map((building) => ({
    id: migratedInstanceId(value.id, "village-door", building.key),
    entityType: "door",
    buildingKey: building.key,
    ...building.door,
    state: "closed",
  }));
  for (const door of value.village.doors) {
    if (door.shopKey == null && door.shopId != null) door.shopKey = door.shopId;
    delete door.shopId;
  }
  value.village.doors = VILLAGE_BUILDINGS.map((building) => {
    const door = value.village.doors.find(
      (candidate) =>
        candidate.buildingKey === building.key ||
        (building.shopKey && candidate.shopKey === building.shopKey),
    ) ?? {
      id: migratedInstanceId(value.id, "village-door", building.key),
      entityType: "door",
      state: "closed",
    };
    return { ...door, buildingKey: building.key, ...building.door };
  });
  value.partyTactics ??= {
    facing: "north",
    phase: "travel",
    anchor: null,
    deployedAtTick: null,
  };
  return value;
}

export function parseRogueState(value) {
  migrateIdentity(value);
  value.levels = value.levels.map((level) => ({
    ...level,
    remembered: new Set(level.remembered),
    searched: new Set(level.searched),
  }));
  attachActive(value);
  const actors = partyActors(value),
    positions = new Set(actors.map(key)),
    invalidPosition = actors.some((actor) => blocked(value.map, actor));
  if (positions.size !== actors.length || invalidPosition)
    placePartyAt(value, value.hero);
  return value;
}

export function rogueGroupsView(state, currentVisible = visibility(state)) {
  const party = groupView(state.partyGroup, partyActors(state));
  party.tactics = structuredClone(state.partyTactics);
  const visibleEnemyIds = new Set(
    aliveEnemies(state)
      .filter((enemy) => currentVisible.has(key(enemy)))
      .map((enemy) => enemy.id),
  );
  const enemies = (state.enemyGroups ?? [])
    .filter((group) =>
      group.memberIds.some((actorId) => visibleEnemyIds.has(actorId)),
    )
    .map((group) => {
      const view = groupView(group, state.enemies);
      view.memberIds = view.memberIds.filter((actorId) =>
        visibleEnemyIds.has(actorId),
      );
      view.memberStatus = view.memberStatus.filter((member) =>
        visibleEnemyIds.has(member.actorId),
      );
      view.knownMemberCount = view.memberIds.length;
      view.totalMemberCount = null;
      if (!view.memberIds.includes(view.leaderId)) view.leaderId = null;
      return view;
    });
  return { party, enemies };
}
