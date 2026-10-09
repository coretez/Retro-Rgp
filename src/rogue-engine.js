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
  weightedRoute,
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
import {
  advanceVillageSimulation,
  reportVillageIncident,
} from "./village-simulation.js";
import { advanceDungeonSimulation } from "./dungeon-simulation.js";
import { createEntityIndex, describeAffordances } from "./world-objects.js";
import { createJob, jobView } from "./job-board.js";
import {
  clampVillageViewportCenter,
  regionalGeology,
  regionalGround,
  regionalHydrology,
  regionalPlacerMineral,
  regionalRiverAt,
  regionalSourceCatalog,
  regionalSurveyGeometry,
  regionalTrailAt,
  VILLAGE_REGION,
  villageHighlandAt,
  villageQuarryFaceAt,
} from "./village-region.js";
import {
  ensureRegionalSimulation,
  regionalChunkState,
  syncRegionalSimulation,
} from "./village-region-simulation.js";
import {
  createFoundingStockpiles,
  createVillageStockpiles,
  RESIDENT_JOB_TEMPLATES,
  SHOP_PROPRIETORS,
  shopStock,
} from "./village-economy.js";
import {
  createVillageDevelopment,
  decideVillageArchitectPlan,
  decideVillageProposal,
  DEVELOPMENT_JOB_TEMPLATES,
  ensureVillageDevelopment,
  FOUNDER_FACILITY_PLANS,
  reviseVillageProposal,
  setVillageCommissionStatus,
  syncFoundingFacilityStructures,
} from "./village-development.js";
import {
  createVillageHouseholds,
  ensureFoundingSleepingPlaces,
  ensureVillageHouseholds,
  syncResidentHousing,
} from "./village-households.js";
import {
  constructionElements,
  deriveVillageArchitecture,
  FOUNDER_HOUSE_PLOTS,
  HOUSE_ARCHETYPES,
  upgradeMissingHouseExits,
  upgradeMissingConstructionRoofs,
} from "./village-architecture.js";
import {
  createVillageAnimals,
  createFarmsteadPasture,
  ensureVillageAnimals,
  FARMSTEAD_PASTURE,
  livingAnimals,
} from "./village-animals.js";
import {
  cropCellGrowthAt,
  cropPlotAt,
  ensureVillageFoodSystem,
  foragePatchAt,
} from "./village-food.js";
import { setVillageCemeteryPolicy } from "./village-civic.js";
import { ensureVillageTradeSystem, villageTradeView } from "./village-trade.js";
import {
  reconcileVillageStorage,
  storageCellAt,
  storageDestinationAt,
} from "./village-storage.js";
import { villageMeaningView } from "./village-richness.js";
import { ensureVillageDemography } from "./village-demography.js";
import {
  companionActivityAvailable,
  companionTemplate,
  companionWorkProfile,
  createCompanionWorkState,
} from "./companion-work.js";
import {
  createLifeState,
  createTownClock,
  daylightLevel,
  daylightPhase,
  lifeCapabilities,
  lifeJobTypes,
  NEED_JOB_TYPES,
  scheduleBlock,
} from "./village-life.js";
import {
  awardPartyPractice,
  CHARACTER_SKILLS,
  characterSkillView,
  COMBAT_ROLES,
  createCharacterDevelopment,
  createPartyManagement,
  defaultAbilities,
} from "./party-development.js";
import {
  VILLAGE_VISUAL_REGISTRY_VERSION,
  villageVisualDescriptor,
} from "./village-visual-registry.js";

export const ROGUE_RULESET = "party-roguelike-v11";
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

const UNITY_VILLAGE_VIEWPORT = { width: 280, height: 168 };
const UNITY_DUNGEON_VIEWPORT = { width: 30, height: 20 };

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
    frontline: { forward: -1, right: 0 },
    support: { forward: -2, right: 0 },
    rear_guard: { forward: -3, right: 0 },
  },
  line: {
    scout: { forward: 0, right: -1 },
    frontline: { forward: 0, right: -1 },
    support: { forward: 0, right: 1 },
    rear_guard: { forward: -1, right: 0 },
  },
  wedge: {
    scout: { forward: -1, right: -1 },
    frontline: { forward: -1, right: -1 },
    support: { forward: -1, right: 1 },
    rear_guard: { forward: -2, right: 0 },
  },
  scatter: {
    scout: { forward: 1, right: -1 },
    frontline: { forward: 1, right: -1 },
    support: { forward: -1, right: 1 },
    rear_guard: { forward: -2, right: -1 },
  },
};

// function-length-exempt: template -- actor projection
function companionActor(template, id) {
  const actor = {
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
    abilities: defaultAbilities(template.class),
    proficiencyBonus: 2,
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
  actor.development = createCharacterDevelopment(actor);
  actor.management = createPartyManagement(actor);
  return actor;
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

// function-length-exempt: template -- group projection
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

// function-length-exempt: template -- combat event projection
function attackEvent(attacker, defender, actorKind, attackRoll, hit, damage) {
  return {
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
  };
}

function recordDefeat(defender, events) {
  if (defender.hp !== 0) return;
  const kind = defender.template
    ? "enemy"
    : defender.role
      ? "companion"
      : "hero";
  if (kind !== "enemy" && !defender.conditions.includes("unconscious"))
    defender.conditions.push("unconscious");
  events.push({
    type: defeatEventType(kind, defender.dead),
    actorId: defender.id,
    actorName: defender.name,
    actorTemplate: defender.template ?? null,
    position: { x: defender.x, y: defender.y },
  });
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
  events.push(
    attackEvent(attacker, defender, actorKind, attackRoll, hit, damage),
  );
  recordDefeat(defender, events);
}

function defeatEventType(defenderKind, dead) {
  if (defenderKind === "enemy") return "enemy_defeated";
  if (defenderKind === "companion")
    return dead ? "companion_defeated" : "companion_unconscious";
  return dead ? "hero_defeated" : "hero_unconscious";
}

// function-length-exempt: template -- visibility projection
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

function collectTreasure(state, level, events) {
  const treasure = level.treasures.find(
    (item) => !item.collected && !item.hidden && same(item, state.hero),
  );
  if (!treasure) return;
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

function collectedItem(item) {
  if (ROGUE_EQUIPMENT[item.itemKind])
    return equipmentItem(item.id, item.itemKind);
  const definition = ROGUE_RELICS[item.itemKind];
  return definition
    ? {
        id: item.id,
        definitionId: item.definitionId,
        entityType: item.entityType,
        kind: item.itemKind,
        ...definition,
        quantity: 1,
      }
    : {
        id: item.id,
        definitionId: item.definitionId,
        entityType: item.entityType,
        kind: item.itemKind,
        name: item.name,
        quantity: 1,
      };
}

function collectFloorItem(state, level, events) {
  const item = level.features.find(
    (feature) =>
      feature.kind === "item" &&
      !feature.collected &&
      !feature.hidden &&
      same(feature, state.hero),
  );
  if (!item) return;
  item.collected = true;
  state.hero.inventory.push(collectedItem(item));
  events.push({
    type: "item_collected",
    itemId: item.id,
    itemName: item.name,
    position: { x: item.x, y: item.y },
  });
}

function collectGround(state, events) {
  const level = active(state);
  collectTreasure(state, level, events);
  collectFloorItem(state, level, events);
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

function withdrawRearGuard(state, companion, targets, slot, events) {
  const pressured = targets.some(
    (enemy) => gridDistance("square", companion, enemy) <= 2,
  );
  return (
    companion.role === "rear_guard" &&
    pressured &&
    moveCompanion(
      state,
      companion,
      rangedRetreatStep(state, companion, targets, slot),
      "withdraw_to_ranged_position",
      events,
    )
  );
}

function takeFormationSlot(state, companion, slot, events) {
  return (
    state.partyTactics.phase !== "travel" &&
    !same(companion, slot) &&
    moveCompanion(
      state,
      companion,
      stepTowardPosition(state, companion, slot),
      "take_formation_slot",
      events,
    )
  );
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
  const target = targets.length ? partyTarget(state, companion, targets) : null;
  if (withdrawRearGuard(state, companion, targets, slot, events)) return;
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
  if (!atSlot && takeFormationSlot(state, companion, slot, events)) return;
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

function resolveEnemies(state, dice, events, workingActors = new Set()) {
  reconcileEnemyLeaders(state, events);
  const enemies = aliveEnemies(state).sort((a, b) => a.id.localeCompare(b.id));
  for (const enemy of enemies) {
    if (!livingParty(state).length) break;
    if (workingActors.has(enemy.id)) continue;
    resolveEnemy(state, enemy, dice, events);
  }
  reconcilePartyLeader(state, events);
  if (state.hero.hp <= 0) {
    state.status = state.hero.dead ? "dead" : "dying";
    if (!state.hero.conditions.includes("unconscious"))
      state.hero.conditions.push("unconscious");
  }
}

function dungeonWorkRoute(state, actor, target, adjacent) {
  const level = active(state),
    occupied = new Set(
      [...aliveEnemies(state), ...livingParty(state)]
        .filter((candidate) => candidate.id !== actor.id)
        .map(key),
    );
  return weightedRoute({
    from: actor,
    to: target,
    bounds: {
      minX: 0,
      minY: 0,
      maxX: level.map.width - 1,
      maxY: level.map.height - 1,
    },
    isBlocked: (position) => blocked(level.map, position),
    terrainCost: (position) =>
      level.map.difficult.some((cell) => same(cell, position)) ? 2 : 1,
    occupied,
    adjacent,
  });
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
    capabilityTags: ["investigate"],
    workPermissions: { allowedJobTypes: ["investigate_noise"] },
    workState: "available",
    lastJobType: null,
    currentAction: "Guarding its territory",
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

// function-length-exempt: template -- authored level-state construction
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
      capabilityTags: ["investigate"],
      workPermissions: { allowedJobTypes: ["investigate_noise"] },
      workState: "available",
      lastJobType: null,
      currentAction: "Guarding the reliquary",
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
    jobs: [],
    reservations: [],
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

// function-length-exempt: template -- complete persisted run-state construction
export function newRogueRun(input) {
  const scenario = input.scenario ?? "established",
    founding = scenario === "founding",
    maxDepth = [3, 5, 8].includes(input.levels) ? input.levels : 5,
    archetype = HERO_ARCHETYPES[input.heroClass] ?? HERO_ARCHETYPES.fighter,
    runId = input.runId ?? newInstanceId(),
    runInstanceId = input.runId
      ? (name) => namedUuid(runId, `run-instance:${name}`)
      : () => newInstanceId(),
    startingWeapon = equipmentItem(
      runInstanceId("hero:starting-weapon"),
      archetype.weapon,
      true,
    ),
    startingArmor = equipmentItem(
      runInstanceId("hero:starting-armor"),
      archetype.armor,
      true,
    ),
    startingOffhand = archetype.offhand
      ? equipmentItem(
          runInstanceId("hero:starting-offhand"),
          archetype.offhand,
          true,
        )
      : null,
    startingAxe = equipmentItem(runInstanceId("hero:starting-axe"), "hand_axe"),
    startingShovel = equipmentItem(
      runInstanceId("hero:starting-shovel"),
      "field_shovel",
    ),
    startingAc = startingArmor.ac + (startingOffhand?.acBonus ?? 0),
    heroId = runInstanceId("hero"),
    companions = createCompanions((key) => runInstanceId(`companion:${key}`)),
    villageResidents = createVillageNpcStates(runId, scenario),
    villageBuildings = founding ? [] : structuredClone(VILLAGE_BUILDINGS),
    heroPosition = founding ? { x: -10, y: 18 } : VILLAGE.heroPosition,
    companionPositions = founding
      ? [
          { x: -9, y: 18 },
          { x: -8, y: 18 },
          { x: -7, y: 18 },
        ]
      : VILLAGE.companionPositions;
  const state = {
    schemaVersion: 22,
    ruleset: ROGUE_RULESET,
    id: runId,
    revision: 0,
    tick: 0,
    status: "active",
    location: founding ? "village" : "dungeon",
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
      scenario,
      adventurersPresent: false,
      buildings: villageBuildings,
      clock: createTownClock(),
      facilities: [],
      development: createVillageDevelopment(
        runId,
        input.seed,
        input.worldGeneration,
      ),
      heroPosition: { ...heroPosition },
      companionPositions: structuredClone(companionPositions),
      viewportOrigin: { ...VILLAGE.viewportOrigin },
      partyMovement: "follow",
      regrouping: false,
      spendingPolicy: {
        mode: "approval_required",
        autonomousLimitCp: 0,
        spentCp: 0,
      },
      companionStates: companions.map((actor, index) =>
        createCompanionWorkState(actor, companionPositions[index]),
      ),
      playerCharacterStates: [createLifeState(heroId, "player_directed")],
      modifications: [],
      looseMaterials: [],
      constructionPrimitives: [],
      constructionMaterials: [],
      constructionHistory: [],
      rooms: [],
      architectureDirty: true,
      wantedLevel: 0,
      incidents: [],
      jobs: [],
      reservations: [],
      stockpiles: founding
        ? createFoundingStockpiles(runId)
        : createVillageStockpiles(runId),
      npcStates: villageResidents,
      households: createVillageHouseholds(runId, villageResidents),
      residences: [],
      fixtures: [],
      animals: createVillageAnimals(runId, scenario),
      animalSerial: founding ? 2 : 3,
      pastures: founding ? [] : [createFarmsteadPasture(runId)],
      doors: villageBuildings.map((building) => ({
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
      development: createCharacterDevelopment({
        class: archetype.name.toLowerCase(),
      }),
      management: createPartyManagement({
        class: archetype.name.toLowerCase(),
        role: "leader",
      }),
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
          id: runInstanceId("hero:healing-potion"),
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
  ensureVillageAnimals(state);
  ensureVillageFoodSystem(state);
  ensureVillageTradeSystem(state);
  ensureVillageDemography(state);
  reconcileVillageStorage(state, (position) =>
    villageNpcTerrain(state, position),
  );
  syncResidentHousing(state);
  ensureFoundingSleepingPlaces(state);
  ensureRegionalSimulation(state);
  return state;
}

function search(state, dice, events, { passive = false } = {}) {
  const level = active(state),
    searchKey = key(state.hero);
  if (passive && level.searched.has(searchKey)) return;
  if (!passive) {
    check(
      !level.searched.has(searchKey),
      "ALREADY_SEARCHED",
      "This position has already been searched.",
    );
    level.searched.add(searchKey);
  }
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

function invokeTome(state, item, events) {
  if (!["tome_vigor", "tome_might"].includes(item.kind)) return false;
  const vigor = item.kind === "tome_vigor";
  if (vigor) {
    state.hero.maxHp += 3;
    state.hero.hp += 3;
  } else {
    state.hero.combatBonus += 1;
    recalculateHero(state);
  }
  events.push({
    type: "permanent_gain",
    actorId: state.hero.id,
    itemName: item.name,
    gain: vigor ? "+3 maximum HP" : "+1 weapon attack",
    position: { x: state.hero.x, y: state.hero.y },
  });
  return true;
}

function invokeMagicItem(state, item, intent, dice, events) {
  const magic = {
    scroll_flame: {
      name: "Flame",
      formula: "3d6",
      damageType: "fire",
      source: "scroll",
    },
    wand_arc: {
      name: "Arcing Sparks",
      formula: "2d6",
      damageType: "lightning",
      source: "wand",
    },
  }[item.kind];
  if (!magic) return false;
  const enemy = visibleEnemyTarget(state, intent.targetId);
  check(
    enemy,
    "NO_VISIBLE_TARGET",
    `No enemy is visible for the ${magic.source}.`,
  );
  magicalDamage(state, enemy, dice, events, magic);
  return true;
}

function invokeItem(state, intent, dice, events) {
  const item = state.hero.inventory.find(
    (entry) =>
      entry.id === intent.itemId &&
      ((entry.quantity ?? 0) > 0 || (entry.charges ?? 0) > 0),
  );
  check(item, "ITEM_NOT_FOUND", "That item is not in the inventory.");
  if (
    !invokeTome(state, item, events) &&
    !invokeMagicItem(state, item, intent, dice, events)
  )
    throw new RuleError("ITEM_NOT_USABLE", "That item cannot be invoked.");
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
  const object = dungeonWorldObjectAt(state, intent.x, intent.y);
  if (object)
    return executeDungeonInteraction(
      state,
      { actorId: state.hero.id, objectId: object.id, action: "examine" },
      events,
    );
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

function dungeonObject(entity, kind, name, description, affordanceKeys) {
  return {
    id: entity.id,
    definitionId: entity.definitionId,
    entityType: entity.entityType,
    kind,
    name,
    description,
    position: { x: entity.x, y: entity.y },
    state: entity.state ?? null,
    affordanceKeys,
  };
}

// function-length-exempt: template -- inspectable world-object projection
export function dungeonWorldObjectAt(state, x, y) {
  const level = active(state),
    position = { x, y },
    door = level.doors.find((entry) => entry.revealed && same(entry, position));
  if (door)
    return dungeonObject(
      door,
      "door",
      door.secret ? "Secret door" : "Dungeon door",
      `A ${door.state} ${door.secret ? "concealed" : "stone-bound"} door.`,
      ["examine", "open"],
    );
  const feature = level.features.find(
    (entry) => !entry.collected && !entry.hidden && same(entry, position),
  );
  if (feature)
    return dungeonObject(
      feature,
      feature.kind,
      feature.name,
      `${feature.name} is ${feature.spent ? "spent" : "ready"}.`,
      ["examine"],
    );
  const treasure = level.treasures.find(
    (entry) => !entry.collected && !entry.hidden && same(entry, position),
  );
  if (treasure)
    return dungeonObject(
      treasure,
      "treasure",
      treasure.name,
      `${treasure.name} is worth ${treasure.valueCp} copper pieces.`,
      ["examine"],
    );
  if (same(position, level.entrance))
    return dungeonObject(
      {
        id: namedUuid(level.id, "stairs:up"),
        definitionId: definitionId("feature", "stairs-up"),
        entityType: "feature",
        ...position,
      },
      "stairs",
      "Stairs upward",
      "Stone steps lead toward the previous level.",
      ["examine"],
    );
  if (same(position, level.exit))
    return dungeonObject(
      {
        id: namedUuid(level.id, "stairs:down"),
        definitionId: definitionId("feature", "stairs-down"),
        entityType: "feature",
        ...position,
      },
      "stairs",
      state.depth < state.maxDepth ? "Stairs downward" : "Dungeon exit",
      state.depth < state.maxDepth
        ? "Stone steps descend into deeper darkness."
        : "The final passage leads beyond the dungeon.",
      ["examine"],
    );
  return null;
}

function dungeonEntityIndex(state) {
  const level = active(state),
    objects = new Map(),
    add = (object) => {
      if (object) objects.set(object.id, object);
    };
  for (const door of level.doors)
    if (door.revealed) add(dungeonWorldObjectAt(state, door.x, door.y));
  for (const item of [...level.features, ...level.treasures]) {
    const object = dungeonWorldObjectAt(state, item.x, item.y);
    add(object);
  }
  for (const position of [level.entrance, level.exit])
    add(dungeonWorldObjectAt(state, position.x, position.y));
  return createEntityIndex([
    ...objects.values(),
    ...level.enemies,
    ...partyActors(state),
  ]);
}

function applyDungeonInteraction(state, actor, object, action, events) {
  if (action === "examine")
    return events.push({
      type: "dungeon_examined",
      actorId: actor.id,
      objectId: object.id,
      name: object.name,
      detail: object.description,
      position: { ...object.position },
    });
  if (action !== "open") return;
  const door = active(state).doors.find((entry) => entry.id === object.id);
  door.state = "open";
  events.push({
    type: "door_opened",
    actorId: actor.id,
    doorId: door.id,
    position: { ...object.position },
  });
  addNoise(state, events, 5, object.position, "door");
}

function executeDungeonInteraction(state, input, events) {
  const actor = partyActors(state)
      .concat(active(state).enemies)
      .find((candidate) => candidate.id === input.actorId),
    object = dungeonEntityIndex(state).get(input.objectId);
  check(actor, "ACTOR_NOT_FOUND", "That dungeon actor does not exist.");
  check(object, "OBJECT_NOT_FOUND", "That dungeon object does not exist.");
  const affordance = describeAffordances(actor, object, {
    visible: true,
    position: { x: actor.x, y: actor.y },
  }).find((candidate) => candidate.key === input.action);
  check(
    affordance,
    "ACTION_UNSUPPORTED",
    "That object does not support this action.",
  );
  check(affordance.available, "ACTION_UNAVAILABLE", affordance.reason);
  return applyDungeonInteraction(state, actor, object, input.action, events);
}

function useHealingPower(state, power, dice, events) {
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

function useClassPower(state, intent, dice, events) {
  const power = state.hero.classPower;
  check(
    power.remaining > 0,
    "NO_POWER_USES",
    `${power.name} has no uses left.`,
  );
  if (power.key === "magic_missile") {
    const enemy = visibleEnemyTarget(state, intent.targetId);
    check(enemy, "NO_VISIBLE_TARGET", "No enemy is visible for Magic Missile.");
    magicalDamage(state, enemy, dice, events, {
      name: "Magic Missile",
      formula: "3d4+3",
      damageType: "force",
      source: "class_power",
    });
  } else useHealingPower(state, power, dice, events);
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

function awardDefeatExperience(state, defeated, events) {
  const monster = ROGUE_BESTIARY[defeated.actorTemplate],
    gained = Math.max(
      40,
      Math.round((monster.hp + monster.ac * 2 + monster.attackBonus * 4) / 10) *
        10,
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

function levelUpHero(state, events) {
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

function grantExperience(state, events) {
  for (const defeated of events.filter(
    (event) => event.type === "enemy_defeated",
  ))
    awardDefeatExperience(state, defeated, events);
  while (state.hero.xp >= state.hero.xpToNext) levelUpHero(state, events);
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

// function-length-exempt: template -- spatial projection
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

function localPartyPath(state, area, target) {
  const spatial = localSpatialMap(state, target),
    localize = (position) => ({
      x: position.x - spatial.origin.x,
      y: position.y - spatial.origin.y,
    });
  return route(
    spatial,
    localize(area.heroPosition),
    localize(target),
    new Set(),
  ).path.map((position) => ({
    x: position.x + spatial.origin.x,
    y: position.y + spatial.origin.y,
  }));
}

function applyLocalPartyPath(area, path) {
  const trail = [area.heroPosition, ...area.companionPositions].map(
    (position) => ({ ...position }),
  );
  for (const step of path.slice(1)) {
    trail.unshift({ ...step });
    trail.pop();
  }
  area.heroPosition = trail[0];
  area.companionPositions = trail.slice(1);
}

function syncVillageCompanionWorkers(state, area) {
  if (
    state.location !== "village" ||
    area.partyMovement !== "follow" ||
    area.regrouping
  )
    return;
  for (const [index, actor] of state.companions.entries()) {
    const worker = area.companionStates.find(
      (candidate) => candidate.actorId === actor.id,
    );
    worker.position = { ...area.companionPositions[index] };
  }
}

function moveLocalParty(state, intent, events) {
  const area = state[state.location],
    target = { x: intent.x, y: intent.y };
  if (openLocalDoor(state, target, events)) return;
  if (
    state.location === "village" &&
    (area.partyMovement === "dispersed" || area.regrouping)
  )
    check(
      !area.companionPositions.some((position) => same(position, target)),
      "LOCAL_DESTINATION_OCCUPIED",
      "A companion already occupies that destination.",
    );
  const path = localPartyPath(state, area, target);
  if (
    state.location === "village" &&
    (area.partyMovement === "dispersed" || area.regrouping)
  )
    area.heroPosition = path.at(-1);
  else applyLocalPartyPath(area, path);
  syncVillageCompanionWorkers(state, area);
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
  state.village.regrouping = intent.mode === "follow";
  if (intent.mode === "dispersed")
    for (const worker of state.village.companionStates) {
      worker.objective = "choose_personal_work";
      worker.currentAction = "Choosing an independent objective";
      worker.actionReason = "party_dispersed";
    }
  events.push({
    type: "party_movement_changed",
    mode: intent.mode,
    position: { ...state.village.heroPosition },
  });
}

function setVillageSpendingPolicy(state, intent, events) {
  check(
    ["approval_required", "routine_supplies", "autonomous"].includes(
      intent.mode,
    ),
    "SPENDING_POLICY_INVALID",
    "Choose approval required, routine supplies, or autonomous spending.",
  );
  const limit = intent.mode === "approval_required" ? 0 : intent.limitCp;
  check(
    Number.isInteger(limit) && limit >= 0,
    "SPENDING_LIMIT_INVALID",
    "The autonomous spending limit must be a non-negative copper amount.",
  );
  state.village.spendingPolicy = {
    mode: intent.mode,
    autonomousLimitCp: limit,
    spentCp: 0,
  };
  events.push({
    type: "spending_policy_changed",
    mode: intent.mode,
    limitCp: limit,
  });
}

// function-length-exempt: template -- inspector projection
function villageExamination(state, target) {
  const terrain = villageTile(state, target.x, target.y);
  if (terrain.material)
    return {
      name: terrain.material.name,
      detail: `${terrain.material.quantity} ${MATERIAL_DEFINITIONS[terrain.material.kind].unit}${terrain.material.quantity === 1 ? "" : "s"} can be collected here.`,
    };
  if (terrain.modification)
    return {
      name:
        terrain.modification.kind === "quarried_rock"
          ? "Excavated mountain chamber"
          : terrain.tile.replaceAll("_", " "),
      detail:
        terrain.modification.kind === "quarried_rock"
          ? `Solid rock was removed here on turn ${terrain.modification.createdAtTick}. The chamber remains beneath a natural mountain roof and can expose another mineable face.`
          : `This place was changed from ${terrain.modification.originalTile.replaceAll("_", " ")} on turn ${terrain.modification.createdAtTick}.`,
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
  iron_ore: { name: "Iron ore", unit: "chunk" },
  copper_ore: { name: "Copper ore", unit: "chunk" },
  tin_ore: { name: "Tin ore", unit: "chunk" },
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
  const evidence = villageWorldObjectAt(state, target.x, target.y);
  reportVillageIncident(
    state,
    {
      kind: "property_damage",
      evidenceId: evidence.id,
      position: target,
      offenderId: state.hero.id,
    },
    events,
  );
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

function buyConsumable(actor, good) {
  const existing = actor.inventory.find((item) => item.kind === good.itemKind);
  if (existing) existing.quantity += 1;
  else
    actor.inventory.push({
      id: newInstanceId(),
      definitionId: definitionId("item", good.itemKind),
      entityType: "item",
      kind: good.itemKind,
      name: good.name,
      quantity: 1,
    });
  return actor;
}

function buyEquipment(state, actor, good) {
  const item = equipmentItem(newInstanceId(), good.itemKind);
  actor.inventory.push(item);
  equipItem(state, { itemId: item.id, actorId: actor.id }, []);
  return actor;
}

function authorizeAutonomousPurchase(state, intent, good) {
  if (!intent.autonomous) return;
  const policy = state.village.spendingPolicy,
    remaining = policy.autonomousLimitCp - policy.spentCp;
  check(
    policy.mode !== "approval_required",
    "PURCHASE_APPROVAL_REQUIRED",
    "The party must approve this purchase.",
  );
  check(
    policy.mode !== "routine_supplies" || good.itemType === "consumable",
    "PURCHASE_APPROVAL_REQUIRED",
    "Equipment purchases require party approval.",
  );
  check(
    good.priceCp <= remaining,
    "SPENDING_LIMIT_EXCEEDED",
    `Only ${remaining} cp remains in the autonomous spending limit.`,
  );
}

function validateShopPurchase(state, intent, good, actor, shop, stock) {
  const currentShop = villageShopAt(state, state.village.heroPosition),
    status = shop ? villageShopStatus(state, shop) : null;
  check(good, "SHOP_ITEM_NOT_FOUND", "That item is not sold in Stonebridge.");
  check(
    shop?.id === currentShop?.shopKey,
    "SHOP_NOT_PRESENT",
    `Enter ${shop?.name ?? "the shop"} before buying this item.`,
  );
  check(status?.open, "SHOP_CLOSED", `${shop.name} is not currently staffed.`);
  check(
    stock?.quantity > 0,
    "SHOP_OUT_OF_STOCK",
    `${good.name} is currently out of stock.`,
  );
  check(actor, "ACTOR_NOT_FOUND", "That buyer is not a member of the party.");
  authorizeAutonomousPurchase(state, intent, good);
  check(
    state.hero.goldCp >= good.priceCp,
    "INSUFFICIENT_FUNDS",
    `The party needs ${good.priceCp} cp for ${good.name}.`,
  );
}

// function-length-exempt: template -- purchase event projection
function purchaseEvent(state, intent, good, recipient) {
  return {
    type: "item_purchased",
    actorId: recipient.id,
    actorName: recipient.name,
    itemKind: good.itemKind,
    itemName: good.name,
    priceCp: good.priceCp,
    remainingCp: state.hero.goldCp,
    autonomous: Boolean(intent.autonomous),
    villageName: VILLAGE.name,
    position: null,
  };
}

function shopBuy(state, intent, events) {
  const good = villageGood(intent.itemKind),
    actor = partyActorById(state, intent.actorId),
    shop = VILLAGE.shops.find((candidate) =>
      candidate.goods.includes(intent.itemKind),
    ),
    stock = shop ? shopStock(state, shop.id, intent.itemKind) : null;
  validateShopPurchase(state, intent, good, actor, shop, stock);
  stock.quantity -= 1;
  state.hero.goldCp -= good.priceCp;
  if (intent.autonomous) state.village.spendingPolicy.spentCp += good.priceCp;
  const recipient =
    good.itemType === "equipment"
      ? buyEquipment(state, actor, good)
      : buyConsumable(actor, good);
  events.push(purchaseEvent(state, intent, good, recipient));
}

const VILLAGE_MANAGEMENT_INTENTS = new Set([
  "set_party_movement",
  "set_spending_policy",
  "decide_village_proposal",
  "revise_village_proposal",
  "decide_architect_plan",
  "set_village_commission_status",
  "set_crop_plan",
  "set_cemetery_policy",
  "shop_buy",
  "equip",
  "unequip",
]);

function setCropDestination(state, plot, cellId) {
  const stockpile = state.village.stockpiles.find(
      (item) =>
        item.itemKind === plot.cropKind && item.containerKind !== "field_pile",
    ),
    destination = stockpile
      ? storageDestinationAt(state, stockpile.id, cellId, plot.workPosition)
      : null;
  check(
    destination,
    "CROP_DESTINATION_INVALID",
    "Choose an available compatible storage cell for this crop.",
  );
  plot.harvestDestinationStockpileId = destination.stockpileId;
  plot.harvestDestinationCellId = destination.cellId;
  plot.harvestDestinationPosition = { ...destination.position };
}

const CROP_PLAN_ACTIONS = new Set([
  "select_crop",
  "allow_sowing",
  "forbid_sowing",
  "cut",
  "set_destination",
]);

function selectCropKind(plot, itemKind) {
  check(
    ["fallow", "prepared"].includes(plot.stage),
    "CROP_ALREADY_GROWING",
    "Harvest or cut the current crop before changing this field.",
  );
  check(
    ["grain", "vegetables"].includes(itemKind),
    "CROP_KIND_UNKNOWN",
    "Choose grain or vegetables for this field.",
  );
  plot.cropKind = itemKind;
  delete plot.harvestDestinationStockpileId;
  delete plot.harvestDestinationCellId;
  delete plot.harvestDestinationPosition;
}

function setVillageCropPlan(state, intent, events) {
  const plot = state.village.cropPlots?.find(
    (candidate) => candidate.id === intent.targetId,
  );
  check(plot, "CROP_PLOT_NOT_FOUND", "That crop field no longer exists.");
  check(
    CROP_PLAN_ACTIONS.has(intent.action),
    "CROP_PLAN_ACTION_UNKNOWN",
    "Choose a supported field order.",
  );
  if (intent.action === "select_crop") selectCropKind(plot, intent.itemKind);
  if (intent.action === "allow_sowing") plot.sowingAllowed = true;
  if (intent.action === "forbid_sowing") plot.sowingAllowed = false;
  if (intent.action === "cut") plot.cutOrdered = true;
  if (intent.action === "set_destination")
    setCropDestination(state, plot, intent.objectId);
  events.push({
    type: "crop_plan_changed",
    plotId: plot.id,
    action: intent.action,
    destinationCellId: plot.harvestDestinationCellId,
  });
}

function resolveVillageManagement(state, intent, events) {
  if (intent.kind === "set_party_movement")
    return setVillagePartyMovement(state, intent, events);
  if (intent.kind === "set_spending_policy")
    return setVillageSpendingPolicy(state, intent, events);
  if (intent.kind === "decide_village_proposal")
    return decideVillageProposal(state, intent, events);
  if (intent.kind === "revise_village_proposal")
    return reviseVillageProposal(state, intent, events);
  if (intent.kind === "decide_architect_plan")
    return decideVillageArchitectPlan(state, intent, events);
  if (intent.kind === "set_village_commission_status")
    return setVillageCommissionStatus(state, intent, events);
  if (intent.kind === "set_crop_plan")
    return setVillageCropPlan(state, intent, events);
  if (intent.kind === "set_cemetery_policy") {
    const result = setVillageCemeteryPolicy(state, intent);
    events.push({
      type: "cemetery_policy_changed",
      action: intent.action,
      revision: result.policy.revision,
      corpseId: result.corpseId,
    });
    return result;
  }
  if (intent.kind === "shop_buy") return shopBuy(state, intent, events);
  if (intent.kind === "equip") return equipItem(state, intent, events);
  return unequipItem(state, intent, events);
}

function resolveVillageAction(state, intent, events) {
  if (intent.kind === "open_world") return openWorld(state, events);
  if (intent.kind === "wait") {
    events.push({
      type: "village_wait",
      position: { ...state.village.heroPosition },
    });
    return;
  }
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
  if (VILLAGE_MANAGEMENT_INTENTS.has(intent.kind))
    return resolveVillageManagement(state, intent, events);
  throw new RuleError("VILLAGE_INTENT_REQUIRED", "Choose a village action.");
}

function resolveVillageTurn(state, intent, events) {
  const result = resolveVillageAction(state, intent, events),
    terrainCache = new Map(),
    objectCache = new Map(),
    workObjectCache = new Map(),
    cached = (cache, position, read) => {
      const positionKey = `${position.x},${position.y}`;
      if (!cache.has(positionKey)) cache.set(positionKey, read());
      return cache.get(positionKey);
    };
  advanceVillageSimulation(state, intent, events, {
    terrainAt: (position) =>
      cached(terrainCache, position, () => villageNpcTerrain(state, position)),
    objectAt: (position) =>
      cached(objectCache, position, () =>
        villageWorldObjectAt(state, position.x, position.y),
      ),
    workObjectAt: (position) =>
      cached(workObjectCache, position, () =>
        villageWorldObjectAt(state, position.x, position.y, false),
      ),
    executeInteraction: (input, interactionEvents) =>
      executeVillageInteraction(state, input, interactionEvents),
  });
  return result;
}

export function villageNpcTerrain(state, position) {
  const terrain = villageTile(state, position.x, position.y, false, false);
  return terrain.furniture?.walkable ? "village_floor" : terrain.tile;
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

function companionWorker(state, actorId) {
  return state.village.companionStates.find(
    (worker) => worker.actorId === actorId,
  );
}

function configurePartyRole(state, actor, role) {
  check(
    COMBAT_ROLES.includes(role),
    "INVALID_COMBAT_ROLE",
    "Unknown combat role.",
  );
  check(
    actor.id !== state.hero.id || role === "leader",
    "LEADER_ROLE_REQUIRED",
    "The active party leader retains the leader role.",
  );
  actor.role = role;
  actor.management.combatRole = role;
  const assignment = state.partyGroup.assignments.find(
    (entry) => entry.actorId === actor.id,
  );
  if (assignment) assignment.role = role;
}

function configurePartyJob(state, actor, jobFocus, priority) {
  check(
    Number.isInteger(priority) && priority >= 0 && priority <= 100,
    "INVALID_WORK_PRIORITY",
    "Work priority must be between 0 and 100.",
  );
  if (actor.id === state.hero.id) {
    check(
      jobFocus === "lead_party",
      "INVALID_PARTY_JOB",
      "The leader directs the party.",
    );
    actor.management.jobFocus = jobFocus;
    actor.management.workPriority = priority;
    return;
  }
  const worker = companionWorker(state, actor.id),
    allowed = worker.workPermissions.allowedJobTypes;
  check(
    allowed.includes(jobFocus),
    "INVALID_PARTY_JOB",
    "That member cannot perform this job.",
  );
  actor.management.jobFocus = jobFocus;
  actor.management.workPriority = priority;
  worker.workPriorities[jobFocus] = priority;
}

function configurePartyMember(state, intent, events) {
  const actor = partyActorById(state, intent.actorId);
  check(actor, "ACTOR_NOT_FOUND", "That character is not in the party.");
  check(
    intent.combatRole != null ||
      intent.jobFocus != null ||
      intent.workPriority != null,
    "PARTY_SETTING_REQUIRED",
    "Choose a party setting to change.",
  );
  if (intent.combatRole) configurePartyRole(state, actor, intent.combatRole);
  if (intent.jobFocus)
    configurePartyJob(
      state,
      actor,
      intent.jobFocus,
      intent.workPriority ?? actor.management.workPriority,
    );
  else if (intent.workPriority != null)
    configurePartyJob(
      state,
      actor,
      actor.management.jobFocus,
      intent.workPriority,
    );
  events.push({
    type: "party_member_configured",
    actorId: actor.id,
    actorName: actor.name,
    combatRole: actor.management.combatRole,
    jobFocus: actor.management.jobFocus,
    workPriority: actor.management.workPriority,
  });
}

function openDoor(state, intent, events) {
  const delta = DIRECTIONS[intent.direction];
  check(delta, "INVALID_DIRECTION", "Unknown direction.");
  const target = { x: state.hero.x + delta[0], y: state.hero.y + delta[1] },
    door = active(state).doors.find(
      (entry) => same(entry, target) && entry.revealed,
    );
  check(door, "NO_DOOR", "There is no known door there.");
  executeDungeonInteraction(
    state,
    { actorId: state.hero.id, objectId: door.id, action: "open" },
    events,
  );
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

const DUNGEON_TURN_HANDLERS = Object.freeze({
  command: (state, intent, dice, events) => commandGroup(state, intent, events),
  wait: (state, intent, dice, events) => waitTurn(state, events),
  search: (state, intent, dice, events) => search(state, dice, events),
  use_item: (state, intent, dice, events) =>
    useItem(state, intent, dice, events),
  invoke_item: (state, intent, dice, events) =>
    invokeItem(state, intent, dice, events),
  ranged_attack: (state, intent, dice, events) =>
    rangedAttack(state, intent, dice, events),
  throw_item: (state, intent, dice, events) =>
    throwItem(state, intent, dice, events),
  examine: (state, intent, dice, events) =>
    examineDungeon(state, intent, events),
  class_power: (state, intent, dice, events) =>
    useClassPower(state, intent, dice, events),
  short_rest: (state, intent, dice, events) => shortRest(state, dice, events),
  equip: (state, intent, dice, events) => equipItem(state, intent, events),
  unequip: (state, intent, dice, events) => unequipItem(state, intent, events),
  stairs: (state, intent, dice, events) => descend(state, events),
  stairs_up: (state, intent, dice, events) => ascend(state, events),
  open: (state, intent, dice, events) => openDoor(state, intent, events),
  move: (state, intent, dice, events) => moveHero(state, intent, dice, events),
});

function resolveActiveTurn(state, intent, dice, events) {
  if (intent.kind === "configure_party_member")
    return configurePartyMember(state, intent, events);
  if (state.location === "village")
    return resolveVillageTurn(state, intent, events);
  if (state.location === "exterior")
    return resolveExteriorTurn(state, intent, events);
  if (state.location === "world")
    return resolveWorldTurn(state, intent, events);
  const handler = DUNGEON_TURN_HANDLERS[intent.kind];
  if (!handler)
    throw new RuleError("INVALID_INTENT", "Unsupported player intent.");
  return handler(state, intent, dice, events);
}

export function applyRogueTurn(state, intent, dice = new Dice()) {
  check(
    ["active", "dying"].includes(state.status),
    "RUN_FINISHED",
    "This run has ended.",
    { status: state.status },
  );
  const events = [],
    managementOnly = [
      "configure_party_member",
      "decide_village_proposal",
      "revise_village_proposal",
      "decide_architect_plan",
      "set_village_commission_status",
      "set_cemetery_policy",
    ].includes(intent.kind);
  if (state.status === "dying") resolveDyingTurn(state, intent, dice, events);
  else resolveActiveTurn(state, intent, dice, events);
  const workingActors =
    !managementOnly && state.location === "dungeon" && state.status === "active"
      ? advanceDungeonSimulation(state, intent, events, {
          level: active(state),
          route: (actor, target, adjacent) =>
            dungeonWorkRoute(state, actor, target, adjacent),
          objectAt: (position) =>
            dungeonWorldObjectAt(state, position.x, position.y),
          executeInteraction: (actorId, objectId, action, interactionEvents) =>
            executeDungeonInteraction(
              state,
              { actorId, objectId, action },
              interactionEvents,
            ),
        })
      : new Set();
  if (
    !managementOnly &&
    state.location === "dungeon" &&
    ["active", "dying"].includes(state.status)
  )
    resolveCompanions(state, dice, events);
  if (!managementOnly) grantExperience(state, events);
  awardPartyPractice(state, events);
  if (
    !managementOnly &&
    state.location === "dungeon" &&
    ["active", "dying"].includes(state.status)
  )
    resolveEnemies(state, dice, events, workingActors);
  if (!managementOnly) {
    state.tick += 1;
    if (state.location === "village") syncRegionalSimulation(state);
  }
  if (state.location === "dungeon") visibility(state);
  return { events };
}

export const SIMULATION_MODES = Object.freeze(["paused", "normal", "fast"]);

// function-length-exempt: template -- simulation status projection
export function rogueSimulationStatus(state) {
  if (state.status !== "active")
    return {
      canRun: false,
      tacticalPauseRequired: true,
      reason: `run_${state.status}`,
    };
  if (state.location === "dungeon")
    return {
      canRun: false,
      tacticalPauseRequired: true,
      reason: "dungeon_tactics",
    };
  if (state.location !== "village")
    return {
      canRun: false,
      tacticalPauseRequired: false,
      reason: "travel_decision",
    };
  if (
    state.village.incidents.some(
      (incident) =>
        incident.kind === "danger" && incident.status !== "resolved",
    )
  )
    return {
      canRun: false,
      tacticalPauseRequired: true,
      reason: "village_danger",
    };
  return { canRun: true, tacticalPauseRequired: false, reason: null };
}

export function advanceRogueSimulation(
  state,
  { mode = "paused", ticks = 1, dice = new Dice() } = {},
) {
  check(
    SIMULATION_MODES.includes(mode),
    "SIMULATION_MODE_INVALID",
    "Choose paused, normal, or fast simulation.",
  );
  check(
    Number.isInteger(ticks) && ticks >= 0 && ticks <= 100,
    "SIMULATION_TICKS_INVALID",
    "Simulation ticks must be between 0 and 100.",
  );
  const events = [];
  if (mode === "paused") return { ticksAdvanced: 0, events };
  for (let index = 0; index < ticks; index += 1) {
    const status = rogueSimulationStatus(state);
    if (!status.canRun) return { ticksAdvanced: index, events, pause: status };
    events.push(...applyRogueTurn(state, { kind: "wait" }, dice).events);
  }
  return { ticksAdvanced: ticks, events, pause: null };
}

// function-length-exempt: template -- client cell projection
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
  const object = dungeonWorldObjectAt(state, position.x, position.y);
  if (object) {
    cell.object = object;
    cell.affordances = describeAffordances(state.hero, object, {
      visible: true,
      position: { x: state.hero.x, y: state.hero.y },
    });
  }
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
].map((building) => ({
  ...building,
  wallMaterial: building.wallMaterial ?? "timber",
  door: { material: "wood", ...building.door },
}));

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
  ((y === 11 || y === 12) && x >= -180 && x <= 180) ||
  ((x === 19 || x === 20) && y >= -140 && y <= 160);

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
  ...[
    [17, 14],
    [23, 10],
    [40, 14],
    [12, 24],
    [41, 13],
    [0, 13],
  ].map(([x, y]) => ({
    x,
    y,
    glyph: "b",
    name: "Town bench",
    description: "A public bench offers a place to sit and share local news.",
  })),
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
    x: -10,
    y: 4,
    glyph: "%",
    name: "Stew pot",
    description:
      "The inn keeps a plain hot meal ready for residents and travelers.",
  },
  {
    x: -13,
    y: 8,
    glyph: "b",
    name: "Guest bed",
    description: "A narrow but clean bed offers a safe night's sleep.",
  },
  ...[-11, -9, -7, -5].map((x) => ({
    x,
    y: 8,
    glyph: "b",
    name: "Guest bed",
    description: "A narrow but clean bed offers a safe night's sleep.",
  })),
  ...[-9, -8, -7].map((x) => ({
    x,
    y: 4,
    glyph: "%",
    name: "Meal place",
    description: "A bowl, cup and portion of bread wait beside the stew pot.",
  })),
  ...[
    [-12, 5],
    [-10, 5],
  ].map(([x, y]) => ({
    x,
    y,
    glyph: "c",
    name: "Common-room chair",
    description: "A chair drawn close enough for easy conversation.",
  })),
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
  ...[49, 51].map((x) => ({
    x,
    y: 8,
    glyph: "B",
    name: "Chapel bench",
    description: "A plain bench faces the road altar.",
  })),
  ...[45, 49, 51].map((x) => ({
    x,
    y: 4,
    glyph: "o",
    name: "Prayer stone",
    description: "A smooth stone marks a quiet place for private devotion.",
  })),
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
    x: 38,
    y: 23,
    glyph: "W",
    name: "Stable supply cart",
    description:
      "A broad two-wheeled cart carries feed sacks, lamp oil and repair timber.",
  },
  {
    x: -1,
    y: 15,
    width: 1,
    height: 3,
    glyph: "J",
    name: "River fishing jetty",
    walkable: true,
    description:
      "A weathered timber jetty reaches the slow water below Stonebridge.",
  },
  {
    x: 38,
    y: 21,
    glyph: "H",
    name: "Stable yard hitching rail",
    description:
      "Feed buckets and grooming brushes hang from a rail beside the stable yard.",
  },
  {
    x: -22,
    y: 18,
    glyph: "L",
    name: "Lumber yard site",
    description:
      "Survey stakes and raised log skids mark the village lumber yard project.",
  },
  {
    x: -23,
    y: 18,
    glyph: "W",
    name: "Sawing trestles",
    description:
      "Heavy trestles hold logs above the wet ground for measuring and sawing.",
  },
  {
    x: -26,
    y: 24,
    glyph: "S",
    name: "Farm seed shed",
    description:
      "A dry timber shed protects seed grain and the farmstead's working tools.",
  },
  {
    x: -27,
    y: 24,
    glyph: "=",
    name: "Grain field marker",
    description: "A marked strip of earth is reserved for village grain.",
  },
  {
    x: -25,
    y: 24,
    glyph: ":",
    name: "Kitchen garden marker",
    description: "Raised rows are laid out for roots, beans and hardy greens.",
  },
  {
    x: -19,
    y: 24,
    glyph: "U",
    name: "Milking rail",
    description: "A low rail and clean pails make morning milking possible.",
  },
  {
    x: -21,
    y: 24,
    glyph: "T",
    name: "Butcher table",
    description:
      "A scrubbed outdoor table is used when the herd can spare an animal.",
  },
  {
    x: -14,
    y: 18,
    glyph: "%",
    name: "Camp stew pot",
    description: "Founding provisions simmer over a guarded campfire.",
  },
  ...[
    [-13, 18],
    [-14, 19],
    [-13, 19],
  ].map(([x, y]) => ({
    x,
    y,
    glyph: "%",
    name: "Camp meal place",
    description: "A simple place beside the campfire for eating communal food.",
  })),
  {
    x: -16,
    y: 18,
    glyph: "T",
    name: "Founders' tool cache",
    description: "Axes, saws, and hammers are kept dry beneath a canvas cover.",
  },
  {
    x: -15,
    y: 19,
    glyph: "C",
    name: "Founding food cache",
    description:
      "A covered timber chest keeps the settlement's fish pantry dry.",
  },
  {
    x: 24,
    y: 30,
    glyph: "S",
    name: "Quarry stone staging pallet",
    description:
      "A bounded timber pallet marks where finite quarried stone is counted and stored.",
  },
  ...[
    [25, "Iron ore bin", "iron"],
    [26, "Copper ore bin", "copper"],
    [27, "Tin ore bin", "tin"],
  ].map(([x, name, ore]) => ({
    x,
    y: 30,
    glyph: "S",
    name,
    description: `A bounded timber bin keeps finite ${ore} ore separate for the forge.`,
  })),
];

const FOUNDING_FIXTURES = new Set([
  "River fishing jetty",
  "Lumber yard site",
  "Sawing trestles",
  "Grain field marker",
  "Kitchen garden marker",
  "Camp stew pot",
  "Camp meal place",
  "Founders' tool cache",
  "Founding food cache",
  "Quarry stone staging pallet",
]);

const VILLAGE_PEOPLE = [
  ["merchant", "Ysabet Vale", "traveling merchant", 34, 12],
  ["miller", "Greta Voll", "miller", 14, 11],
  ["baker", "Oskar Mertens", "baker", 22, 11],
  ["porter", "Lina Roth", "porter", 19, 14],
  ["watchman", "Friedel Koch", "watchman", 20, 9],
  ["child", "Anja", "errand runner", 15, 15],
  ["carter", "Bram Eder", "carter", 38, 24],
  ["pilgrim", "Sister Elske", "pilgrim", 41, 12],
  ["fisher", "Tomas Venn", "river fisher", -1, 11],
  ["hostler", "Pavel Dorn", "hostler", 38, 22],
  ["delver", "Ivo Brandt", "retired delver", 12, 25],
  ["smith", "Hanne Voss", "smith", 4, 7],
  ["herbalist", "Mei Lin", "apothecary", 37, 7],
  ["armorer", "Otto Kern", "armorer", 35, 21],
  ["innkeeper", "Marta Pell", "innkeeper", -11, 8],
  ["woodcutter", "Klara Holt", "woodcutter", -25, 17],
  ["reeve", "Edda Voss", "village reeve", 12, 31],
  ["farmer", "Ada Weiss", "farmer", -28, 23],
  ["herder", "Niko Brand", "herder", -18, 23],
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
  merchant:
    "Seeds, sound ingots, and honest measures. I buy flour when your own pantry is secure.",
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
  woodcutter:
    "A village grows from its timber pile outward. First a yard, then farms and roofs.",
  reeve:
    "Stonebridge cannot eat promises. I set the need; our people decide who can answer it.",
  farmer:
    "Seed is food we choose not to eat. Guard the reserve and the next harvest follows.",
  herder:
    "Milk keeps us today. A healthy breeding pair keeps the village next year.",
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
  woodcutter: ["secure_lumber", "Surveying timber for the village"],
  reeve: ["govern_village", "Reviewing Stonebridge's needs"],
  farmer: ["secure_food", "Inspecting the farm plots"],
  herder: ["secure_food", "Watching the pasture herd"],
};

function defaultSkillPriority(rank) {
  if (rank >= 4) return 1;
  if (rank >= 3) return 2;
  if (rank >= 2) return 3;
  return 4;
}

function villageSkillPriorities(personKey, skills) {
  const priorities = Object.fromEntries(
    Object.entries(skills).map(([skill, rank]) => [
      skill,
      defaultSkillPriority(rank),
    ]),
  );
  const primary = {
    farmer: ["farming", "architecture"],
    herder: ["animal_husbandry", "hunting"],
    woodcutter: ["forestry"],
    innkeeper: ["cooking"],
    carter: ["logistics"],
    porter: ["logistics"],
    fisher: ["fishing"],
  }[personKey];
  for (const skill of primary ?? []) priorities[skill] = 1;
  return priorities;
}

// function-length-exempt: template -- worker projection
function villageWorkerProfile(personKey, founding = false) {
  const observation =
    {
      carter: 4,
      porter: 3,
      hostler: 3,
      watchman: 2,
      delver: 2,
    }[personKey] ?? 1;
  const guard = personKey === "watchman",
    residentWork = [
      ...RESIDENT_JOB_TEMPLATES,
      ...DEVELOPMENT_JOB_TEMPLATES,
    ].filter((template) => template.personKey === personKey),
    residentJobs = residentWork.map((template) => template.jobType),
    residentCapabilities = [
      ...new Set(residentWork.map((template) => template.capability)),
    ],
    healer = personKey === "herbalist",
    administrator = personKey === "reeve",
    architect = personKey === "farmer",
    generalLabor = founding,
    foundingFarmhand = founding,
    sawHelper =
      founding &&
      ["carter", "porter", "innkeeper", "herbalist"].includes(personKey),
    leadBuilder = founding && ["farmer", "herder"].includes(personKey),
    projectBuilder = generalLabor,
    forester =
      founding && ["woodcutter", "herder", "innkeeper"].includes(personKey),
    hunter = founding && personKey === "herder",
    foundingSmith = founding && personKey === "woodcutter",
    hauler = personKey === "carter" || residentCapabilities.includes("haul"),
    tradeSkills =
      personKey === "woodcutter"
        ? {
            forestry: 4,
            construction: 2,
            carpentry: 3,
            ...(foundingSmith ? { metalworking: 2 } : {}),
          }
        : personKey === "fisher"
          ? { fishing: 4, hunting: 3 }
          : personKey === "innkeeper"
            ? { cooking: 4 }
            : personKey === "reeve"
              ? { governance: 4, stewardship: 3, negotiation: 3 }
              : personKey === "farmer"
                ? { farming: 4, construction: 2, architecture: 4 }
                : personKey === "herder"
                  ? {
                      animal_husbandry: 4,
                      butchery: 2,
                      hunting: 3,
                      construction: 3,
                    }
                  : {};
  const profile = {
    capabilityTags:
      personKey === "carter"
        ? [
            "inspect",
            "haul",
            ...residentCapabilities,
            ...(generalLabor ? ["general_labor", "build", "burial"] : []),
            ...(foundingFarmhand ? ["farm"] : []),
            ...(sawHelper ? ["saw"] : []),
            ...lifeCapabilities(),
          ]
        : guard
          ? [
              "inspect",
              "patrol",
              "investigate",
              "warn",
              "escort",
              "respond",
              "general_labor",
              "build",
              "haul",
              ...(foundingFarmhand ? ["farm"] : []),
              "burial",
              ...lifeCapabilities(),
            ]
          : [
              "inspect",
              ...residentCapabilities,
              ...(generalLabor ? ["general_labor", "build"] : []),
              ...(foundingFarmhand ? ["farm"] : []),
              ...(generalLabor ? ["haul"] : []),
              ...(generalLabor ? ["forage"] : []),
              ...(sawHelper ? ["saw"] : []),
              ...(generalLabor ? ["burial"] : []),
              ...(projectBuilder && !residentCapabilities.includes("build")
                ? ["build"]
                : []),
              ...(founding && personKey === "herder" ? ["build_farm"] : []),
              ...(forester && !residentCapabilities.includes("forestry")
                ? ["forestry"]
                : []),
              ...(hunter ? ["hunt"] : []),
              ...(foundingSmith ? ["forge"] : []),
              ...(hauler && !residentCapabilities.includes("haul")
                ? ["haul"]
                : []),
              ...(administrator ? ["govern", "prioritize", "assign_work"] : []),
              ...(architect ? ["architect"] : []),
              ...(healer ? ["heal"] : []),
              ...lifeCapabilities(),
            ],
    workPermissions: {
      allowedJobTypes:
        personKey === "carter"
          ? [
              "inspect_object",
              "deliver_goods",
              ...residentJobs,
              ...(generalLabor
                ? [
                    "survey_construction",
                    "assist_project",
                    "haul_stock",
                    "build_specialist_facility",
                    "build_lumber_yard",
                    "build_farmstead",
                    "build_house",
                    "build_communal_kitchen",
                    "build_field_camp",
                    "gather_wild_food",
                    "grow_grain",
                    "grow_vegetables",
                    "bury_resident",
                    "exhume_resident",
                    "cremate_resident",
                  ]
                : []),
              ...(sawHelper ? ["saw_lumber"] : []),
              ...lifeJobTypes(),
            ]
          : guard
            ? [
                "inspect_object",
                "patrol_route",
                "investigate_crime",
                "respond_danger",
                "survey_construction",
                "assist_project",
                "haul_stock",
                "deliver_goods",
                ...(foundingFarmhand ? ["grow_grain", "grow_vegetables"] : []),
                "bury_resident",
                "exhume_resident",
                "cremate_resident",
                "issue_defense_equipment",
                "militia_training",
                ...lifeJobTypes(),
              ]
            : [
                "inspect_object",
                ...residentJobs,
                ...(residentCapabilities.includes("build")
                  ? ["assist_project", "supervise_project"]
                  : []),
                ...(generalLabor
                  ? [
                      "survey_construction",
                      "assist_project",
                      "haul_stock",
                      "deliver_goods",
                      "gather_wild_food",
                      "grow_grain",
                      "grow_vegetables",
                      "bury_resident",
                      "exhume_resident",
                      "cremate_resident",
                    ]
                  : []),
                ...(sawHelper ? ["saw_lumber"] : []),
                ...(projectBuilder
                  ? [
                      "assist_project",
                      "supervise_project",
                      "build_specialist_facility",
                      "build_lumber_yard",
                      "build_farmstead",
                      "build_house",
                      "build_communal_kitchen",
                      "build_field_camp",
                    ]
                  : []),
                ...(architect ? ["survey_architecture"] : []),
                ...(administrator ? ["govern_village"] : []),
                ...(forester
                  ? [
                      "fell_tree",
                      "remote_fell_tree",
                      "clear_building_site",
                      "clear_field_tree",
                    ]
                  : []),
                ...(hunter ? ["hunt_game", "remote_hunt_game"] : []),
                ...(foundingSmith ? ["craft_weapon", "craft_hunting_bow"] : []),
                ...(hauler ? ["deliver_goods"] : []),
                ...(healer ? ["tend_wounded"] : []),
                ...lifeJobTypes(),
              ],
    },
    workPriorities: Object.fromEntries([
      ...residentWork.map((template) => [template.jobType, template.priority]),
      ...(hunter
        ? [
            ["hunt_game", 112],
            ["remote_hunt_game", 108],
          ]
        : []),
      ...(foundingSmith ? [["craft_hunting_bow", 122]] : []),
      ...(healer ? [["tend_wounded", 80]] : []),
    ]),
    skills: {
      observation,
      ...(generalLabor ? { construction: 1 } : {}),
      ...(generalLabor ? { foraging: 1 } : {}),
      ...(foundingFarmhand ? { farming: 1 } : {}),
      ...tradeSkills,
      ...(personKey === "herder" ? { construction: 3, forestry: 2 } : {}),
      ...(personKey === "innkeeper" && founding ? { forestry: 1 } : {}),
      ...(sawHelper ? { carpentry: 1 } : {}),
      ...(hauler ? { logistics: personKey === "carter" ? 4 : 3 } : {}),
      ...(generalLabor && !hauler ? { logistics: 1 } : {}),
    },
    skillPractice: {},
    workState: "available",
    lastJobType: null,
    risk: 0,
  };
  profile.skillPriorities = villageSkillPriorities(personKey, profile.skills);
  if (leadBuilder) profile.skillPriorities.construction = 1;
  profile.workPermissions.allowedJobTypes = [
    ...new Set([
      ...profile.workPermissions.allowedJobTypes,
      "mourn_resident",
      ...(profile.capabilityTags.includes("build")
        ? ["build_dirt_access_road"]
        : []),
      ...(profile.capabilityTags.includes("general_labor")
        ? [
            "dispose_animal_carcass",
            "militia_training",
            "return_defense_equipment",
          ]
        : []),
      ...(profile.capabilityTags.includes("butcher")
        ? ["dress_animal_carcass"]
        : []),
    ]),
  ];
  profile.capabilityTags = [...new Set(profile.capabilityTags)];
  return profile;
}

const FOUNDER_KEYS = new Set([
  "reeve",
  "woodcutter",
  "farmer",
  "herder",
  "fisher",
  "porter",
  "carter",
  "herbalist",
  "watchman",
  "innkeeper",
]);

const FOUNDER_POSITIONS = [
  [-18, 16],
  [-16, 16],
  [-14, 16],
  [-12, 16],
  [-10, 16],
  [-18, 20],
  [-16, 20],
  [-14, 20],
  [-12, 20],
  [-10, 20],
];

// function-length-exempt: template -- persisted NPC-state construction
function createVillageNpcStates(runId, scenario = "established") {
  const people = VILLAGE_PEOPLE.filter(
    (person) =>
      person.key !== "merchant" &&
      (scenario !== "founding" || FOUNDER_KEYS.has(person.key)),
  );
  return people.map((person, index) => {
    const [objective, currentAction] = VILLAGE_OBJECTIVES[person.key] ?? [
        "daily_life",
        `Working as ${person.role}`,
      ],
      [x, y] =
        scenario === "founding"
          ? FOUNDER_POSITIONS[index]
          : [person.x, person.y];
    return {
      id: namedUuid(runId, `townsperson:${person.key}`),
      name: person.name,
      personKey: person.key,
      position: { x, y },
      objective,
      currentAction,
      actionReason: "personal_routine",
      routeIndex: 0,
      carriedItem: null,
      defenseEquipment: null,
      ...villageWorkerProfile(person.key, scenario === "founding"),
      life: createLifeState(
        namedUuid(runId, `townsperson:${person.key}`),
        "autonomous",
      ),
    };
  });
}

function retireRemovedFoundingPermissions(npc, profile, scenario) {
  if (scenario !== "founding" || profile.capabilityTags.includes("saw")) return;
  npc.capabilityTags = npc.capabilityTags.filter((tag) => tag !== "saw");
  npc.workPermissions.allowedJobTypes =
    npc.workPermissions.allowedJobTypes.filter((type) => type !== "saw_lumber");
}

function villageBuildings(state) {
  return state.village.buildings ?? VILLAGE_BUILDINGS;
}

const VILLAGE_BUILDING_POSITION_CACHE = new WeakMap();

function villageBuildingAt(state, x, y) {
  const buildings = villageBuildings(state),
    cached = VILLAGE_BUILDING_POSITION_CACHE.get(state);
  if (cached?.source === buildings && cached.length === buildings.length)
    return cached.positions.get(`${x},${y}`);
  const positions = new Map();
  for (const building of buildings)
    for (let py = building.y; py < building.y + building.h; py += 1)
      for (let px = building.x; px < building.x + building.w; px += 1)
        positions.set(`${px},${py}`, building);
  VILLAGE_BUILDING_POSITION_CACHE.set(state, {
    source: buildings,
    length: buildings.length,
    positions,
  });
  return positions.get(`${x},${y}`);
}

function villageShopAt(state, position) {
  const building = villageBuildingAt(state, position.x, position.y);
  return building &&
    position.x > building.x &&
    position.x < building.x + building.w - 1 &&
    position.y > building.y &&
    position.y < building.y + building.h - 1
    ? building
    : null;
}

function proprietorInsideShop(state, shop) {
  const proprietorKey = SHOP_PROPRIETORS[shop.id],
    proprietor = state.village.npcStates.find(
      (npc) => npc.personKey === proprietorKey,
    ),
    building = villageBuildings(state).find(
      (candidate) => candidate.shopKey === shop.id,
    );
  return Boolean(
    proprietor &&
    building &&
    proprietor.position.x > building.x &&
    proprietor.position.x < building.x + building.w - 1 &&
    proprietor.position.y > building.y &&
    proprietor.position.y < building.y + building.h - 1,
  );
}

function villageShopStatus(state, shop) {
  const staffed = proprietorInsideShop(state, shop),
    stocked = shop.goods.some(
      (itemKind) => (shopStock(state, shop.id, itemKind)?.quantity ?? 0) > 0,
    );
  return { staffed, stocked, open: staffed && stocked };
}

function villageSignAt(state, x, y) {
  if (state.village.scenario === "founding") return null;
  return VILLAGE_SIGNS.find((sign) => sign.x === x && sign.y === y);
}

function furnitureFootprint(furniture) {
  if (Number.isInteger(furniture.width) && Number.isInteger(furniture.height))
    return { width: furniture.width, height: furniture.height };
  const variant = furnitureVisualVariant(furniture);
  if (variant === "bed")
    return furniture.name.toLowerCase().includes("double")
      ? { width: 2, height: 2 }
      : { width: 1, height: 2 };
  if (
    ["table", "shelves"].includes(variant) &&
    !["Common table", "Butcher table"].includes(furniture.name)
  )
    return { width: 2, height: 1 };
  return { width: 1, height: 1 };
}

const STATIC_FURNITURE_INDEXES = new Map();
const VILLAGE_FURNITURE_POSITION_CACHE = new WeakMap();

function staticFurnitureIndex(founding) {
  const cacheKey = founding ? "founding" : "established";
  if (STATIC_FURNITURE_INDEXES.has(cacheKey))
    return STATIC_FURNITURE_INDEXES.get(cacheKey);
  const index = new Map(),
    furniture = founding
      ? VILLAGE_FURNITURE.filter((item) => FOUNDING_FIXTURES.has(item.name))
      : VILLAGE_FURNITURE;
  for (const item of furniture) {
    const footprint = furnitureFootprint(item),
      normalized = { ...item, ...footprint };
    for (let y = item.y; y < item.y + footprint.height; y += 1)
      for (let x = item.x; x < item.x + footprint.width; x += 1)
        index.set(`${x},${y}`, normalized);
  }
  STATIC_FURNITURE_INDEXES.set(cacheKey, index);
  return index;
}

function villageFurnitureAt(state, x, y) {
  const fixture = villageFixturePositions(state).get(`${x},${y}`);
  if (fixture) return { ...fixture, ...furnitureFootprint(fixture) };
  const staticFixture = staticFurnitureIndex(
    state.village.scenario === "founding",
  ).get(`${x},${y}`);
  if (
    villageRegionalSite(state).mode === "regional_v3" &&
    staticFixture?.name === "River fishing jetty"
  )
    return null;
  return staticFixture ?? null;
}

function villageFixturePositions(state) {
  const fixtures = state.village.fixtures ?? [],
    cached = VILLAGE_FURNITURE_POSITION_CACHE.get(state);
  if (cached?.source === fixtures && cached.length === fixtures.length)
    return cached.positions;
  const positions = new Map();
  for (const fixture of fixtures)
    for (let y = fixture.y; y < fixture.y + fixture.height; y += 1)
      for (let x = fixture.x; x < fixture.x + fixture.width; x += 1)
        positions.set(`${x},${y}`, fixture);
  VILLAGE_FURNITURE_POSITION_CACHE.set(state, {
    source: fixtures,
    length: fixtures.length,
    positions,
  });
  return positions;
}

function villagePersonAt(state, x, y) {
  const visitor = state.village.trade?.activeVisit?.merchant,
    activity = [...state.village.npcStates, ...(visitor ? [visitor] : [])]
      .filter((entry) => {
        if (entry.life?.status !== "dead") return true;
        return state.village.civic?.residentCorpses?.some(
          (corpse) =>
            corpse.residentId === entry.id &&
            corpse.status === "exposed" &&
            same(corpse.position, { x, y }),
        );
      })
      .filter((entry) => same(entry.position, { x, y }))
      .sort(
        (left, right) =>
          Number(Boolean(right.carriedItem)) -
            Number(Boolean(left.carriedItem)) ||
          left.id.localeCompare(right.id),
      )[0];
  if (!activity) return null;
  const person = VILLAGE_PEOPLE.find(
      (candidate) => candidate.key === activity.personKey,
    ),
    corpse = state.village.civic?.residentCorpses?.find(
      (candidate) => candidate.residentId === activity.id,
    );
  return { ...person, ...activity, ...(corpse ? { corpse } : {}), x, y };
}

function villageGraveAt(state, x, y) {
  return state.village.civic?.cemetery?.graves?.find((grave) =>
    same(grave.position, { x, y }),
  );
}

function villageMusterPointAt(state, x, y) {
  const point =
    state.village.development?.masterPlan?.defenseStrategy?.musterPoint;
  return point && same(point.position, { x, y }) ? point : null;
}

function villageAnimalDisposalAt(state, x, y) {
  const site = state.village.civic?.animalDisposal;
  return site && same(site.position, { x, y }) ? site : null;
}

function villageCremationPyreAt(state, x, y) {
  const pyre = state.village.civic?.cremationPyre;
  return pyre && same(pyre.position, { x, y }) ? pyre : null;
}

function villageAnimalAt(state, x, y) {
  return state.village.animals
    .filter((animal) => !["gone", "carried"].includes(animal.carcassState))
    .sort(
      (left, right) =>
        Number(left.status === "dead") - Number(right.status === "dead"),
    )
    .find((animal) => animal.position.x === x && animal.position.y === y);
}

function villageFenceAt(state, x, y) {
  for (const pasture of state.village.pastures ?? []) {
    const horizontal =
        x >= pasture.x &&
        x < pasture.x + pasture.w &&
        (y === pasture.y || y === pasture.y + pasture.h - 1),
      vertical =
        y >= pasture.y &&
        y < pasture.y + pasture.h &&
        (x === pasture.x || x === pasture.x + pasture.w - 1),
      gate = pasture.gate.x === x && pasture.gate.y === y;
    if ((horizontal || vertical) && !gate)
      return {
        pasture,
        orientation: vertical ? "vertical" : "horizontal",
      };
  }
  return null;
}

function villagePastureGateAt(state, x, y) {
  const pasture = (state.village.pastures ?? []).find(
    (candidate) => candidate.gate.x === x && candidate.gate.y === y,
  );
  return pasture ? { pasture, gate: pasture.gate } : null;
}

function pastureObject(state, terrain, position) {
  const pasture = terrain.pasture,
    kind = terrain.pastureGate ? "pasture_gate" : "pasture_fence",
    forage = Math.round((pasture.forageUnits ?? 0) * 100) / 100,
    capacity = pasture.forageCapacity ?? 0;
  return villageObject(state, kind, pasture.id, position, {
    name: terrain.featureName,
    description: `${pasture.name} holds ${forage} of ${capacity} forage units in ${pasture.forageSeason ?? "unknown"}.`,
    pastureId: pasture.id,
    forageUnits: forage,
    forageCapacity: capacity,
    forageSeason: pasture.forageSeason ?? null,
    allowedSpecies: [...(pasture.allowedSpecies ?? [])],
    affordanceKeys: ["examine"],
  });
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

// function-length-exempt: template -- tree projection
function villageTree(state, x, y) {
  const seed = [...state.seed].reduce(
      (sum, character) => sum + character.charCodeAt(0),
      0,
    ),
    noise = Math.abs((x * 73856093) ^ (y * 19349663) ^ seed) % 101,
    regional = regionalTerrainPosition(state, x, y),
    generationMode = villageRegionalSite(state).mode,
    regionalCover = regionalGround(
      state.seed,
      regional.x,
      regional.y,
      generationMode,
    ),
    treeThreshold =
      generationMode === "regional_v3"
        ? regionalCover === "woodland"
          ? 38
          : regionalCover === "grass"
            ? 11
            : 0
        : 14,
    plannedHousing =
      state.village.scenario === "founding" &&
      FOUNDER_HOUSE_PLOTS.some(
        (plot) =>
          x >= plot.x - 1 &&
          x <= plot.x + HOUSE_ARCHETYPES.family_house.width &&
          y >= plot.y - 1 &&
          y <= plot.y + HOUSE_ARCHETYPES.family_house.height,
      ),
    plannedPasture =
      state.village.scenario === "founding" &&
      x >= FARMSTEAD_PASTURE.x - 1 &&
      x <= FARMSTEAD_PASTURE.x + FARMSTEAD_PASTURE.w &&
      y >= FARMSTEAD_PASTURE.y - 1 &&
      y <= FARMSTEAD_PASTURE.y + FARMSTEAD_PASTURE.h,
    plannedFacility =
      state.village.scenario === "founding" &&
      Object.values(FOUNDER_FACILITY_PLANS).some(
        (site) =>
          x >= site.x - 1 &&
          x <= site.x + site.w &&
          y >= site.y - 1 &&
          y <= site.y + site.h,
      ),
    foundingClearing =
      state.village.scenario === "founding" &&
      x >= -24 &&
      x <= -6 &&
      y >= 13 &&
      y <= 22,
    nearBuilding = villageBuildings(state).some(
      (site) =>
        x >= site.x - 2 &&
        x <= site.x + site.w + 1 &&
        y >= site.y - 2 &&
        y <= site.y + site.h + 1,
    );
  return (
    !plannedHousing &&
    !plannedPasture &&
    !plannedFacility &&
    !foundingClearing &&
    !nearBuilding &&
    noise < treeThreshold
  );
}

const VILLAGE_TREE_VARIANTS = Object.freeze([
  { key: "pine", name: "Pine", glyph: "▲", wood: "softwood" },
  { key: "elm", name: "Elm", glyph: "♣", wood: "hardwood" },
  { key: "maple", name: "Maple", glyph: "♦", wood: "hardwood" },
  { key: "oak", name: "Oak", glyph: "♠", wood: "hardwood" },
  { key: "birch", name: "Birch", glyph: "ψ", wood: "hardwood" },
]);

function villageTreeVariant(state, x, y) {
  const seed = [...state.seed].reduce(
      (sum, character) => sum + character.charCodeAt(0),
      0,
    ),
    index = Math.abs((x * 83492791) ^ (y * 297657976) ^ seed) % 5;
  return VILLAGE_TREE_VARIANTS[index];
}

function villagePathAt(state, x, y) {
  if (villageFoundingRoadAt(state, x, y)) {
    const establishedCore =
      state.village.scenario !== "founding" &&
      x >= -20 &&
      x <= 60 &&
      y >= -5 &&
      y <= 40;
    return establishedCore ? "road_stone" : "road_dirt";
  }
  const onApproach = villageBuildings(state).some(({ door }) => {
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

function villageFoundingRoadAt(state, x, y) {
  const mode = villageRegionalSite(state).mode;
  if (mode !== "regional_v3") return villagePrincipalRoadAt(x, y);
  const global = regionalTerrainPosition(state, x, y);
  return regionalTrailAt(state.seed, global.x, global.y, mode);
}

function villageRiverAt(x, y) {
  const east = (x - 4) / 5,
    south = (y - 18) / 4;
  return east * east + south * south <= 1;
}

function villageRegionalSite(state) {
  return (
    state.village.development?.masterPlan?.regionalContext?.site ?? {
      origin: { x: 0, y: 0 },
      hub: { x: 19, y: 11 },
    }
  );
}

function globalVillagePosition(state, position) {
  const origin = villageRegionalSite(state).origin;
  return { x: position.x + origin.x, y: position.y + origin.y };
}

function localVillagePosition(state, position) {
  const origin = villageRegionalSite(state).origin;
  return { x: position.x - origin.x, y: position.y - origin.y };
}

function regionalTerrainPosition(state, x, y) {
  return globalVillagePosition(state, { x, y });
}

function regionalRockEdgeMask(state, x, y) {
  const site = villageRegionalSite(state);
  if (site.mode !== "regional_v3") return 0;
  const global = regionalTerrainPosition(state, x, y),
    exposed = (dx, dy) => {
      const neighbor = { x: x + dx, y: y + dy };
      return (
        state.village.modifications.some(
          (item) =>
            item.kind === "quarried_rock" &&
            item.x === neighbor.x &&
            item.y === neighbor.y,
        ) ||
        regionalGround(state.seed, global.x + dx, global.y + dy, site.mode) !==
          "rock"
      );
    };
  return (
    (exposed(0, -1) ? 1 : 0) |
    (exposed(1, 0) ? 2 : 0) |
    (exposed(0, 1) ? 4 : 0) |
    (exposed(-1, 0) ? 8 : 0)
  );
}

function regionalBridgeAt(state, x, y) {
  const global = regionalTerrainPosition(state, x, y);
  const mode = villageRegionalSite(state).mode;
  if (mode === "regional_v3")
    return (
      regionalHydrology(state.seed, global.x, global.y, mode).water &&
      regionalTrailAt(state.seed, global.x, global.y, mode)
    );
  return regionalRiverAt(global.x, global.y) && (y === 11 || y === 12);
}

const FURNITURE_VISUAL_VARIANTS = [
  ["meal_place", /meal place/],
  ["prayer_stone", /prayer stone/],
  ["cooking_pot", /stew pot/],
  ["hitching_rail", /hitching rail/],
  ["milking_rail", /milking rail/],
  ["construction_site", /yard site/],
  ["grain_plot", /grain field marker/],
  ["kitchen_garden", /kitchen garden marker/],
  [
    "storage_shed",
    /seed shed|tool cache|food cache|staging pallet|ore bin|net rack|fish storage/,
  ],
  ["table", /sawbench|netting bench|fish cleaning table/],
  ["chair", /chair|stool|bench/],
  ["counter", /counter|inn bar/],
  ["table", /worktable|\btable\b/],
  ["forge", /forge/],
  ["shelves", /shelves/],
  ["rack", /rack/],
  ["bedroll", /bedroll/],
  ["bed", /bed/],
  ["altar", /altar/],
  ["stall", /stall/],
  ["cart", /cart/],
  ["jetty", /jetty/],
  ["trestles", /trestles/],
];

function furnitureVisualVariant(furniture) {
  const name = furniture.name.toLowerCase();
  return FURNITURE_VISUAL_VARIANTS.find(([, pattern]) =>
    pattern.test(name),
  )?.[0];
}

const ACTIVE_CONSTRUCTION_CACHE = new WeakMap();
const VILLAGE_CONSTRUCTION_POSITION_CACHE = new WeakMap();
const VILLAGE_PRIMITIVE_CACHE = new WeakMap();
const UNITY_STORAGE_POSITION_CACHE = new WeakMap();

function activeConstructionJobs(state) {
  const cached = ACTIVE_CONSTRUCTION_CACHE.get(state);
  if (
    cached?.tick === state.tick &&
    cached.jobCount === state.village.jobs.length
  )
    return cached.jobs;
  const jobs = state.village.jobs.filter(
    (job) =>
      job.plan?.construction &&
      ["available", "reserved", "active", "blocked", "suspended"].includes(
        job.status,
      ),
  );
  ACTIVE_CONSTRUCTION_CACHE.set(state, {
    tick: state.tick,
    jobCount: state.village.jobs.length,
    jobs,
  });
  return jobs;
}

function addScoutedPlanPositions(state, plannedPositions, jobSiteKeys) {
  const sites = state.village.development?.constructionSites ?? [],
    completedKeys = new Set(
      state.village.buildings
        .filter((building) => building.status === "complete")
        .map((building) => building.key),
    );
  for (const site of sites.filter(
    (candidate) =>
      (candidate.housingSurveyStatus === "scouted" ||
        candidate.masterPlanDesignation) &&
      !jobSiteKeys.has(candidate.key) &&
      !completedKeys.has(candidate.key),
  )) {
    const elements = constructionElements(site).map((element) => ({
        ...element,
        status: "planned",
        materialDelivered: false,
        materialDeliveredQuantity: 0,
        laborCompleted: 0,
      })),
      work = { elements },
      job = { id: namedUuid(state.id, `housing-survey:${site.key}`) };
    for (const element of elements) {
      const positionKey = `${element.position.x},${element.position.y}`;
      if (!plannedPositions.has(positionKey))
        plannedPositions.set(positionKey, { job, site, work, element });
    }
  }
}

// function-length-exempt: template -- construction projection
function villageConstructionAt(state, x, y, includePlanned = false) {
  let cached = VILLAGE_CONSTRUCTION_POSITION_CACHE.get(state);
  if (cached?.tick !== state.tick) {
    const plannedPositions = new Map(),
      activePositions = new Map(),
      jobs = activeConstructionJobs(state),
      jobSiteKeys = new Set(
        state.village.jobs
          .filter((job) => job.plan?.construction)
          .map((job) => job.plan.construction.key),
      );
    for (const job of jobs) {
      const site = job.plan?.construction,
        work = job.plan?.constructionWork;
      if (!site || !work) continue;
      for (const element of work.elements) {
        if (element.status === "complete") continue;
        const positionKey = `${element.position.x},${element.position.y}`,
          entry = { job, site, work, element };
        if (!plannedPositions.has(positionKey))
          plannedPositions.set(positionKey, entry);
        if (element.status !== "planned" && !activePositions.has(positionKey))
          activePositions.set(positionKey, entry);
      }
    }
    addScoutedPlanPositions(state, plannedPositions, jobSiteKeys);
    cached = { tick: state.tick, plannedPositions, activePositions };
    VILLAGE_CONSTRUCTION_POSITION_CACHE.set(state, cached);
  }
  const entry = (
    includePlanned ? cached.plannedPositions : cached.activePositions
  ).get(`${x},${y}`);
  if (entry) {
    const { job, site, work, element } = entry,
      enclosure = site.enclosures?.find(
        (candidate) => candidate.key === element.pastureKey,
      );
    return {
      ...site,
      jobId: job.id,
      elementId: element.id,
      elementKey: element.key,
      elementKind: element.kind,
      material: element.material,
      materialEntityIds: [...(element.deliveredMaterialIds ?? [])],
      materialDeliveredQuantity: element.materialDeliveredQuantity,
      materialRequired: element.materialRequired,
      laborCompleted: element.laborCompleted,
      laborRequired: element.laborRequired,
      boundaryProfile: element.boundaryProfile,
      heightFeet: element.heightFeet,
      fenceOrientation:
        enclosure &&
        (element.position.x === enclosure.x ||
          element.position.x === enclosure.x + enclosure.w - 1)
          ? "vertical"
          : "horizontal",
      stage:
        element.status === "planned" && element.materialDelivered
          ? "material_delivered"
          : element.status,
      connectionMask: connectionMaskAt(
        work.elements,
        element,
        (candidate) => candidate.kind === element.kind,
      ),
      builtSegments: work.elements.filter(
        (candidate) => candidate.status === "complete",
      ).length,
      totalSegments: work.elements.length,
    };
  }
  return null;
}

function connectionMaskAt(items, item, matches) {
  const x = item.position.x,
    y = item.position.y,
    occupied = (targetX, targetY) =>
      items.some(
        (candidate) =>
          candidate !== item &&
          matches(candidate) &&
          candidate.position.x === targetX &&
          candidate.position.y === targetY,
      );
  return (
    (occupied(x, y - 1) ? 1 : 0) |
    (occupied(x + 1, y) ? 2 : 0) |
    (occupied(x, y + 1) ? 4 : 0) |
    (occupied(x - 1, y) ? 8 : 0)
  );
}

function villagePrimitiveIndex(state) {
  const primitives = state.village.constructionPrimitives ?? [],
    cached = VILLAGE_PRIMITIVE_CACHE.get(state);
  if (cached?.source === primitives && cached.length === primitives.length)
    return cached;
  const positions = new Map(),
    surfaces = new Map();
  for (const primitive of primitives)
    for (
      let py = primitive.position.y;
      py < primitive.position.y + (primitive.height ?? 1);
      py += 1
    )
      for (
        let px = primitive.position.x;
        px < primitive.position.x + (primitive.width ?? 1);
        px += 1
      ) {
        positions.set(`${px},${py}`, primitive);
        indexVillageSurface(surfaces, primitive, px, py);
      }
  const index = {
    source: primitives,
    length: primitives.length,
    positions,
    surfaces,
  };
  VILLAGE_PRIMITIVE_CACHE.set(state, index);
  return index;
}

function indexVillageSurface(surfaces, primitive, x, y) {
  if (!["floor", "roof"].includes(primitive.kind)) return;
  if ((primitive.condition ?? 1) <= 0) return;
  const position = `${x},${y}`,
    entry = surfaces.get(position) ?? { floor: null, roof: null };
  entry[primitive.kind] ??= primitive;
  surfaces.set(position, entry);
}

function villagePrimitiveAt(state, x, y) {
  return villagePrimitiveIndex(state).positions.get(`${x},${y}`);
}

function villageSurfaceAt(state, x, y) {
  return (
    villagePrimitiveIndex(state).surfaces.get(`${x},${y}`) ?? {
      floor: null,
      roof: null,
    }
  );
}

// function-length-exempt: template -- terrain projection
function primitiveVillageTile(state, primitive) {
  const connectionMask = connectionMaskAt(
    state.village.constructionPrimitives ?? [],
    primitive,
    (candidate) =>
      candidate.kind === primitive.kind &&
      candidate.material === primitive.material &&
      candidate.projectId === primitive.projectId,
  );
  if (primitive.kind === "wall")
    return {
      tile: "village_building",
      glyph: "#",
      primitive,
      connectionMask,
      visualVariant: primitive.material,
      featureName: `Finished ${primitive.material} wall`,
    };
  if (primitive.kind === "fence")
    return {
      tile: "village_fence",
      glyph: " ",
      primitive,
      connectionMask,
      visualVariant: primitive.material,
      featureName:
        primitive.boundaryProfile === "low_stone_wall"
          ? "Finished low stone boundary wall"
          : `Finished ${primitive.material} fence`,
    };
  if (primitive.kind === "gate")
    return {
      tile: "village_gate_closed",
      glyph: " ",
      primitive,
      visualVariant: primitive.material,
      featureName: `Finished ${primitive.material} gate`,
    };
  return null;
}

const VILLAGE_LOOSE_POSITION_CACHE = new WeakMap();

function villagePersonProjection(state, person) {
  const specialist = [
    "smith",
    "herbalist",
    "armorer",
    "innkeeper",
    "hostler",
  ].includes(person.key);
  return {
    ...person,
    category: person.corpse
      ? "deceased"
      : specialist
        ? "shopkeeper"
        : person.key === "reeve"
          ? "official"
          : ["watchman", "delver"].includes(person.key)
            ? "guard"
            : "civilian",
    id: namedUuid(state.id, `townsperson:${person.key}`),
    objective: person.objective,
    currentAction: person.currentAction,
    actionReason: person.actionReason,
  };
}

function villageLoosePositionIndex(state) {
  const modificationsSource = state.village.modifications,
    materialsSource = state.village.looseMaterials,
    cached = VILLAGE_LOOSE_POSITION_CACHE.get(state);
  if (
    cached?.modificationsSource === modificationsSource &&
    cached.modificationCount === modificationsSource.length &&
    cached.materialsSource === materialsSource &&
    cached.materialCount === materialsSource.length
  )
    return cached;
  const modifications = new Map(
      modificationsSource.map((entry) => [`${entry.x},${entry.y}`, entry]),
    ),
    materials = new Map(
      materialsSource.map((entry) => [`${entry.x},${entry.y}`, entry]),
    ),
    index = {
      modificationsSource,
      modificationCount: modificationsSource.length,
      materialsSource,
      materialCount: materialsSource.length,
      modifications,
      materials,
    };
  VILLAGE_LOOSE_POSITION_CACHE.set(state, index);
  return index;
}

// function-length-exempt: template -- layered tile projection
function villageTile(
  state,
  x,
  y,
  includePeople = true,
  includeConstruction = true,
  includePlannedConstruction = false,
) {
  const position = `${x},${y}`,
    modification = villageLoosePositionIndex(state).modifications.get(position),
    material = villageLoosePositionIndex(state).materials.get(position),
    occupiedByParty = [
      state.village.heroPosition,
      ...state.village.companionPositions,
    ].some((entry) => same(entry, { x, y })),
    person = occupiedByParty ? null : villagePersonAt(state, x, y);
  if (modification) {
    const changed = {
      dug_ground: { tile: "village_pit", glyph: "○", visualVariant: "pit" },
      tree_stump: {
        tile: "outdoor_stump",
        glyph: "♧",
        visualVariant: "stump",
      },
      cleared_ground: {
        tile: "outdoor_grass",
        glyph: ",",
        visualVariant: "cleared",
      },
      built_dirt_road: {
        tile: "road_dirt",
        glyph: "·",
        visualVariant: "packed_dirt",
      },
      breached_wall: { tile: "village_rubble", glyph: ":" },
      quarried_rock: {
        tile: "village_mine_floor",
        glyph: ".",
        visualVariant: "excavated_mountain",
      },
    }[modification.kind];
    return {
      ...changed,
      modification,
      material,
      featureName: changed.tile,
      ...(includePeople && person
        ? {
            glyph: person.glyph,
            person: villagePersonProjection(state, person),
          }
        : {}),
    };
  }
  if (material)
    return {
      tile: "village_material",
      glyph: includePeople && person ? person.glyph : "*",
      material,
      ...(includePeople && person
        ? { person: villagePersonProjection(state, person) }
        : {}),
      visualVariant: material.kind,
      featureName: material.name,
    };
  const construction = includeConstruction
      ? villageConstructionAt(state, x, y, includePlannedConstruction)
      : null,
    primitive = villagePrimitiveAt(state, x, y),
    completedDoor = state.village.doors.find((door) => same(door, { x, y })),
    building = villageBuildingAt(state, x, y),
    furniture = villageFurnitureAt(state, x, y),
    animal = occupiedByParty ? null : villageAnimalAt(state, x, y),
    grave = villageGraveAt(state, x, y),
    animalDisposal = villageAnimalDisposalAt(state, x, y),
    cremationPyre = villageCremationPyreAt(state, x, y),
    musterPoint = villageMusterPointAt(state, x, y);
  if (includePeople && person)
    return {
      tile: person.corpse ? "village_corpse" : "village_person",
      glyph: person.corpse ? "†" : person.glyph,
      person: villagePersonProjection(state, person),
    };
  if (includePeople && animal)
    return {
      tile: "village_animal",
      glyph: " ",
      animal,
      visualVariant: `${animal.species}_${animal.facing}`,
      featureName: animal.name,
    };
  if (grave)
    return {
      tile: "village_grave",
      glyph:
        grave.status === "occupied" ? "†" : grave.status === "dug" ? "□" : "·",
      grave,
      visualVariant: `grave_${grave.status}`,
      featureName: grave.name,
    };
  if (animalDisposal)
    return {
      tile: "village_pit",
      glyph: "○",
      animalDisposal,
      visualVariant: "animal_disposal_pit",
      featureName: animalDisposal.name,
    };
  if (cremationPyre)
    return {
      tile: "village_pit",
      glyph: "♨",
      cremationPyre,
      visualVariant: "cremation_pyre",
      featureName: cremationPyre.name,
    };
  if (musterPoint)
    return {
      tile: "village_muster_point",
      glyph: "⚑",
      musterPoint,
      visualVariant: "muster_point",
      featureName: musterPoint.name,
    };
  if (furniture)
    return {
      tile: "village_furniture",
      glyph: x === furniture.x && y === furniture.y ? furniture.glyph : " ",
      furniture,
      visualVariant:
        x === furniture.x && y === furniture.y
          ? furnitureVisualVariant(furniture)
          : null,
    };
  if (construction)
    return {
      tile: "village_construction",
      glyph: ["door", "gate"].includes(construction.elementKind)
        ? " "
        : construction.elementKind === "fixture"
          ? "F"
          : "▥",
      visualVariant:
        construction.elementKind === "door"
          ? construction.door.material
          : ["fence", "gate"].includes(construction.elementKind)
            ? `${construction.material}_${construction.fenceOrientation}`
            : construction.elementKind === "fixture"
              ? construction.stage === "complete"
                ? construction.fixtureVariant
                : "construction_site"
              : construction.wallMaterial,
      construction,
      featureName: `${construction.name} ${construction.elementKind} under construction`,
    };
  const primitiveTile = primitive
    ? primitiveVillageTile(state, primitive)
    : null;
  if (primitiveTile) return primitiveTile;
  if (completedDoor)
    return {
      tile: `village_${completedDoor.entityType === "gate" ? "gate" : "door"}_${completedDoor.state}`,
      building,
      door: completedDoor,
      doorId: completedDoor.id,
      visualVariant: completedDoor.material,
      glyph: completedDoor.state === "open" ? "'" : "+",
    };
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
        visualVariant: door.material,
        glyph: door.state === "open" ? "'" : "+",
      };
    if (!boundary && !villagePartitionAt(building, x, y))
      return {
        tile: building.primitiveBacked ? "outdoor_grass" : "village_floor",
        building,
        glyph: building.primitiveBacked
          ? ","
          : x === building.x + 1 && y === building.y + 1
            ? building.glyph
            : "·",
      };
    if (building.primitiveBacked)
      return { tile: "outdoor_grass", glyph: ",", building };
    return {
      tile: "village_building",
      building,
      visualVariant: building.wallMaterial,
      glyph: "#",
    };
  }
  const pastureGate = villagePastureGateAt(state, x, y);
  if (pastureGate)
    return {
      tile: `village_gate_${pastureGate.gate.state}`,
      glyph: " ",
      pasture: pastureGate.pasture,
      pastureGate: pastureGate.gate,
      gateId: pastureGate.gate.id,
      visualVariant: pastureGate.gate.material,
      featureName: `${pastureGate.pasture.name} gate`,
    };
  const fence = villageFenceAt(state, x, y);
  if (fence)
    return {
      tile: "village_fence",
      glyph: " ",
      pasture: fence.pasture,
      visualVariant: `${fence.pasture.fenceMaterial}_${fence.orientation}`,
      featureName: `${fence.pasture.name} fence`,
    };
  const sign = villageSignAt(state, x, y),
    path = villagePathAt(state, x, y);
  if (sign)
    return {
      tile: "village_sign",
      glyph: "!",
      sign,
      visualVariant: "posted",
    };
  if (regionalBridgeAt(state, x, y))
    return {
      tile: "road_bridge_wood",
      glyph: "=",
      visualVariant: "timber",
      featureName: "Timber bridge over the Stonebridge River",
    };
  const regional = regionalTerrainPosition(state, x, y),
    generationMode = villageRegionalSite(state).mode,
    hydrology = regionalHydrology(
      state.seed,
      regional.x,
      regional.y,
      generationMode,
    );
  if (hydrology.water)
    return {
      tile: "outdoor_water",
      glyph: " ",
      visualVariant: "river",
      featureName: "Stonebridge River",
    };
  if (path) return { tile: path, glyph: path === "road_stone" ? "=" : ":" };
  if (generationMode !== "regional_v3" && villageRiverAt(x, y))
    return {
      tile: "outdoor_water",
      glyph: " ",
      visualVariant: "river_pool",
      featureName: "Stonebridge oxbow pool",
    };
  const generatedGround = regionalGround(
    state.seed,
    regional.x,
    regional.y,
    generationMode,
  );
  if (
    generatedGround === "rock" ||
    (generationMode !== "regional_v3" &&
      villageHighlandAt(regional.x, regional.y))
  )
    return {
      tile: "outdoor_rock",
      glyph: " ",
      visualVariant: villageQuarryFaceAt(regional.x, regional.y)
        ? "limestone_outcrop"
        : "ridge",
      featureName: villageQuarryFaceAt(regional.x, regional.y)
        ? "Surveyable limestone quarry face"
        : "Rocky western ridge",
    };
  if (
    state.village.scenario === "founding" &&
    x >= -18 &&
    x <= -10 &&
    y >= 15 &&
    y <= 21
  )
    return { tile: "outdoor_grass", glyph: "," };
  const cropPlot = cropPlotAt(state, x, y);
  if (cropPlot)
    return {
      tile: "outdoor_grass",
      glyph: ",",
      cropPlot,
      featureName: `${cropPlot.cropKind} field`,
    };
  const foragePatch = foragePatchAt(state, x, y);
  if (foragePatch)
    return {
      tile: "outdoor_grass",
      glyph: ";",
      foragePatch,
      featureName: foragePatch.name,
    };
  if (villageTree(state, x, y)) {
    const tree = villageTreeVariant(state, x, y);
    return {
      tile: "outdoor_tree",
      glyph: tree.glyph,
      visualVariant: tree.key,
      featureName: `${tree.name} tree`,
    };
  }
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

// function-length-exempt: template -- fixture projection
function fixtureObject(state, terrain, position) {
  const fixture = terrain.furniture,
    building = state.village.buildings.find(
      (candidate) => candidate.id === fixture.buildingId,
    ),
    anchor = { x: fixture.x, y: fixture.y },
    lowerName = fixture.name.toLowerCase(),
    fixtureKind = ["table", "kitchen"].includes(fixture.role)
      ? "meal"
      : lowerName.includes("bed")
        ? "bed"
        : lowerName.includes("stew") || lowerName.includes("meal")
          ? "meal"
          : lowerName.includes("chair") || lowerName.includes("bench")
            ? "seat"
            : lowerName.includes("altar") || lowerName.includes("prayer")
              ? "worship"
              : lowerName.includes("forge")
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
      bed: "Rest",
      meal: "Eat meal",
      seat: "Sit",
      worship: "Worship",
      fixture: `Use ${fixture.name}`,
    },
    stockpiles = state.village.stockpiles.filter(
      (stockpile) =>
        stockpile.position.x === anchor.x && stockpile.position.y === anchor.y,
    ),
    stockDetail = stockpiles.length
      ? ` Stock: ${stockpiles.map((stockpile) => `${stockpile.quantity} ${stockpile.name.toLowerCase()}`).join(", ")}.`
      : "";
  return {
    ...villageObject(state, fixtureKind, `${anchor.x},${anchor.y}`, anchor, {
      name: fixture.name,
      description:
        fixture.description +
        (building ? ` Structure: ${building.name}.` : "") +
        stockDetail,
      footprint: { width: fixture.width, height: fixture.height },
      stockpiles: stockpiles.map((stockpile) => ({ ...stockpile })),
      affordanceKeys:
        fixtureKind === "cart"
          ? ["examine", "use", "request_stocktake"]
          : ["examine", "use"],
      actionLabels: { use: useLabels[fixtureKind] },
    }),
    ...(fixture.id ? { id: fixture.id } : {}),
    ...(fixture.definitionId ? { definitionId: fixture.definitionId } : {}),
  };
}

function residentCorpseObject(person, position) {
  return {
    ...person.corpse,
    objectKind: "resident_corpse",
    position,
    description: `${person.name} died from ${person.corpse.cause.replaceAll("_", " ")}. The body is ${person.corpse.condition} and awaits burial.`,
    affordanceKeys: ["examine"],
  };
}

function personObject(state, terrain, position) {
  const person = terrain.person;
  if (person.corpse) return residentCorpseObject(person, position);
  const priorities = Object.entries(person.workPriorities ?? {})
      .map(
        ([jobType, priority]) => `${jobType.replaceAll("_", " ")} ${priority}`,
      )
      .join(", "),
    permissions = (person.workPermissions?.allowedJobTypes ?? [])
      .map((jobType) => jobType.replaceAll("_", " "))
      .join(", "),
    capabilities = (person.capabilityTags ?? []).join(", "),
    needs = person.life
      ? Object.entries(person.life.needs)
          .map(([need, value]) => `${need} ${Math.round(value)}`)
          .join(", ")
      : "";
  return {
    id: person.id,
    definitionId: person.definitionId,
    entityType: "actor",
    objectKind: "resident",
    position,
    name: person.name,
    description: `${person.name} is a ${person.role} of Stonebridge. Objective: ${person.objective.replaceAll("_", " ")}. Currently: ${person.currentAction}. Housing: ${person.housingStatus}.${person.life ? ` Schedule: ${person.life.scheduleBlock.replaceAll("_", " ")}.` : ""}${needs ? ` Needs: ${needs}.` : ""}${permissions ? ` Permitted work: ${permissions}.` : ""}${capabilities ? ` Capabilities: ${capabilities}.` : ""}${priorities ? ` Work priorities: ${priorities}.` : ""}`,
    personKey: person.key,
    affordanceKeys: ["examine", "talk"],
  };
}

function graveObject(terrain) {
  const grave = terrain.grave;
  return {
    ...grave,
    objectKind: "grave",
    position: { ...grave.position },
    description:
      grave.status === "occupied"
        ? `A marked grave containing resident corpse ${grave.occupantId}.`
        : `A ${grave.status} grave in the founders' cemetery.`,
    affordanceKeys: ["examine"],
  };
}

function musterPointObject(terrain) {
  return {
    ...terrain.musterPoint,
    objectKind: "muster_point",
    position: { ...terrain.musterPoint.position },
    description:
      "The town watch assembles here before responding to an immediate threat.",
    affordanceKeys: ["examine"],
  };
}

function animalDisposalObject(terrain) {
  const site = terrain.animalDisposal;
  return {
    ...site,
    objectKind: "animal_disposal",
    position: { ...site.position },
    description: `${site.disposedCarcassIds.length} unsafe animal carcasses have been disposed here, away from food and homes.`,
    affordanceKeys: ["examine"],
  };
}

function cremationPyreObject(terrain) {
  const pyre = terrain.cremationPyre;
  return {
    ...pyre,
    objectKind: "cremation_pyre",
    position: { ...pyre.position },
    description: `${pyre.crematedCorpseIds.length} residents have been cremated here using ${pyre.consumedFuelUnits} lumber units.`,
    affordanceKeys: ["examine"],
  };
}

function animalObject(terrain) {
  const animal = terrain.animal;
  if (animal.status === "dead")
    return {
      ...animal,
      objectKind: "animal_carcass",
      position: { ...animal.position },
      footprint: { width: animal.width, height: animal.height },
      description: `${animal.name} is a ${animal.carcassState} ${animal.species.replaceAll("_", " ")} carcass, dead from ${animal.deathCause?.replaceAll("_", " ") ?? "unknown causes"}.`,
      affordanceKeys: ["examine"],
    };
  const lineage =
    animal.generation > 0
      ? ` Generation ${animal.generation}; parents ${animal.motherId} and ${animal.fatherId}.`
      : " Founding generation.";
  return {
    ...animal,
    objectKind: "animal",
    position: { ...animal.position },
    footprint: { width: animal.width, height: animal.height },
    description: `${animal.name} is a ${animal.sex} ${animal.ageStage} ${animal.species}, ${animal.status}, with ${animal.health} health.${lineage}`,
    affordanceKeys: ["examine"],
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

// function-length-exempt: template -- inspectable building projection
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
      material: door.material,
      description: `The ${terrain.building.name} ${door.material} door is ${door.state}.`,
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
      material: terrain.building.wallMaterial,
      description: isWall
        ? `A solid ${terrain.building.wallMaterial} wall protects ${terrain.building.name}.`
        : `A usable interior room inside ${terrain.building.name}.`,
      affordanceKeys: isWall ? ["examine", "breach"] : ["examine"],
    },
  );
}

function constructionObject(state, terrain, position) {
  const site = terrain.construction;
  return {
    ...villageObject(
      state,
      "construction",
      `${site.jobId}:${position.x},${position.y}`,
      position,
      {
        name: `${site.name} wall frame`,
        material: site.wallMaterial,
        description: `${site.materialDeliveredQuantity}/${site.materialRequired} material delivered; ${site.builtSegments} of ${site.totalSegments} project elements complete.`,
        affordanceKeys: ["examine"],
      },
    ),
    id: site.elementId,
    definitionId: definitionId("construction-element", site.elementKind),
    materialEntityIds: [...site.materialEntityIds],
  };
}

function primitiveObject(state, terrain) {
  const primitive = terrain.primitive,
    building = state.village.buildings.find(
      (candidate) => candidate.key === primitive.projectKey,
    ),
    structureName = building?.name ?? null;
  return {
    ...primitive,
    objectKind: primitive.kind,
    position: { ...primitive.position },
    name: structureName
      ? `${structureName} — ${primitive.kind}`
      : `${primitive.material} ${primitive.kind}`,
    description: structureName
      ? `This completed ${primitive.material} ${primitive.kind} belongs to ${structureName}.`
      : `A completed ${primitive.material} ${primitive.kind} built as one persistent construction element.`,
    affordanceKeys: ["examine"],
  };
}

function completedDoorObject(state, terrain, position) {
  const door = terrain.door,
    kind = door.entityType === "gate" ? "gate" : "door",
    building = state.village.buildings.find(
      (candidate) => candidate.key === door.buildingKey,
    );
  return {
    ...door,
    objectKind: kind,
    position,
    name: building ? `${building.name} — ${kind}` : `${door.material} ${kind}`,
    description: building
      ? `The ${door.material} ${kind} of ${building.name} is ${door.state}.`
      : `The ${door.material} ${kind} is ${door.state}.`,
    affordanceKeys: ["examine", "open"],
  };
}

function riverObject(state, terrain, position) {
  const global = globalVillagePosition(state, position),
    sites =
      state.village.development.masterPlan.regionalContext.geologyKnowledge
        .placerSites ?? [],
    exhausted = sites.some((site) => same(site, global));
  return villageObject(
    state,
    "river",
    `${position.x},${position.y}`,
    position,
    {
      name: terrain.featureName ?? "River water",
      description: exhausted
        ? "This small gravel bar has already been panned and is depleted."
        : "Flowing water carries gravel that can be panned once for a small, uncertain mineral concentrate.",
      placerExhausted: exhausted,
      affordanceKeys: exhausted ? ["examine"] : ["examine", "pan"],
    },
  );
}

// function-length-exempt: template -- inspectable world-object projection
export function villageWorldObjectAt(state, x, y, includePeople = true) {
  const position = { x, y },
    terrain = villageTile(state, x, y, includePeople);
  if (terrain.person) return personObject(state, terrain, position);
  if (terrain.animal) return animalObject(terrain);
  if (terrain.grave) return graveObject(terrain);
  if (terrain.animalDisposal) return animalDisposalObject(terrain);
  if (terrain.cremationPyre) return cremationPyreObject(terrain);
  if (terrain.musterPoint) return musterPointObject(terrain);
  if (terrain.material) return materialObject(terrain, position);
  if (terrain.furniture) return fixtureObject(state, terrain, position);
  if (terrain.construction) return constructionObject(state, terrain, position);
  if (terrain.primitive) return primitiveObject(state, terrain);
  if (terrain.door) return completedDoorObject(state, terrain, position);
  if (terrain.building) return buildingObject(state, terrain, position);
  if (terrain.pasture) return pastureObject(state, terrain, position);
  if (terrain.sign)
    return villageObject(state, "sign", `${x},${y}`, position, {
      name: "Posted sign",
      description: `The sign reads: “${terrain.sign.text}.”`,
      text: terrain.sign.text,
      affordanceKeys: ["read"],
    });
  if (terrain.foragePatch)
    return {
      ...terrain.foragePatch,
      objectKind: "forage",
      position,
      description:
        terrain.foragePatch.stage === "ripe"
          ? `${terrain.foragePatch.name} offers a small amount of emergency food.`
          : `${terrain.foragePatch.name} has been picked and is slowly regrowing.`,
      affordanceKeys: ["examine"],
    };
  if (terrain.tile === "outdoor_tree") {
    const tree = villageTreeVariant(state, x, y);
    return villageObject(state, "tree", `${x},${y}`, position, {
      name: `${tree.name} tree`,
      description: `A mature ${tree.name.toLowerCase()} grows at Stonebridge's settled edge.`,
      species: tree.key,
      woodClass: tree.wood,
      materialKind: `${tree.key}_timber`,
      affordanceKeys: ["examine", "harvest"],
    });
  }
  if (terrain.tile === "outdoor_rock")
    return villageRockObject(state, terrain, position);
  if (terrain.tile === "village_mine_floor")
    return villageObject(state, "mine_chamber", `${x},${y}`, position, {
      name: "Excavated mountain chamber",
      description:
        "A walkable chamber cut from solid rock remains beneath the natural mountain roof.",
      mountainRoof: true,
      affordanceKeys: ["examine"],
    });
  if (terrain.tile === "outdoor_water")
    return riverObject(state, terrain, position);
  const diggable = ["outdoor_grass", "road_dirt"].includes(terrain.tile);
  return villageObject(state, "terrain", `${x},${y}`, position, {
    name: terrain.featureName ?? terrain.tile.replaceAll("_", " "),
    description: villageExamination(state, position).detail,
    affordanceKeys: diggable ? ["examine", "dig"] : ["examine"],
  });
}

function geologyRecord(state, position) {
  const global = globalVillagePosition(state, position);
  return (
    state.village.development.masterPlan.regionalContext.geologyKnowledge.revealedDeposits.find(
      (record) => record.x === global.x && record.y === global.y,
    ) ?? null
  );
}

function geologyLabel(kind) {
  return (
    {
      building_stone: "Building-stone outcrop",
      iron_ore: "Iron-bearing vein",
      copper_ore: "Copper-bearing vein",
      tin_ore: "Tin-bearing vein",
    }[kind] ?? "Rock deposit"
  );
}

function hiddenMountainObject(state, position) {
  return villageObject(
    state,
    "mountain_mass",
    `${position.x},${position.y}`,
    position,
    {
      name: "Solid mountain",
      description:
        "Unbroken mountain rock. Its interior is hidden and cannot be worked until an adjacent face is excavated.",
      geologyKnown: false,
      affordanceKeys: ["examine"],
    },
  );
}

function unknownRockFace(state, position) {
  return villageObject(
    state,
    "rock_face",
    `${position.x},${position.y}`,
    position,
    {
      name: "Unprospected rock face",
      description:
        "Only the ridge surface is known. Its internal material has not been surveyed.",
      geologyKnown: false,
      affordanceKeys: ["examine", "prospect"],
    },
  );
}

function villageRockObject(state, terrain, position) {
  const record = geologyRecord(state, position),
    legacy = villageRegionalSite(state).mode !== "regional_v3",
    exposed = legacy || regionalRockEdgeMask(state, position.x, position.y) > 0;
  if (!exposed) return hiddenMountainObject(state, position);
  if (!record && !legacy) return unknownRockFace(state, position);
  const kind = record?.depositKind ?? "building_stone";
  return villageObject(
    state,
    "stone_deposit",
    `${position.x},${position.y}`,
    position,
    {
      name: legacy ? terrain.featureName : geologyLabel(kind),
      description: legacy
        ? "An exposed quarry face can yield finite building stone."
        : `${geologyLabel(kind)} was revealed by a persisted prospecting survey.`,
      depositKind: kind,
      estimatedYield: record?.remainingUnits ?? 3,
      geologyKnown: true,
      affordanceKeys: ["examine", "quarry"],
    },
  );
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

// function-length-exempt: template -- manipulation event projection
function manipulationEvent(actor, object, action, tool, material) {
  return {
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
  };
}

function prospectVillageRock(state, actor, object, events) {
  const global = globalVillagePosition(state, object.position),
    mode = villageRegionalSite(state).mode,
    depositKind = regionalGeology(state.seed, global.x, global.y, mode);
  check(depositKind, "GEOLOGY_MISSING", "This cell has no prospectable rock.");
  const knowledge =
    state.village.development.masterPlan.regionalContext.geologyKnowledge;
  knowledge.revealedDeposits.push({
    id: namedUuid(state.id, `geology:${global.x},${global.y}`),
    x: global.x,
    y: global.y,
    depositKind,
    remainingUnits: 3,
    revealedAtTick: state.tick,
    revealedByActorId: actor.id,
  });
  knowledge.status = "partially_surveyed";
  events.push({
    type: "geology_prospected",
    actorId: actor.id,
    position: { ...object.position },
    depositKind,
    estimatedYield: 3,
  });
}

function actorVillagePosition(state, actor) {
  if (actor.id === state.hero.id) return state.village.heroPosition;
  const companion = state.companions.findIndex((item) => item.id === actor.id);
  if (companion >= 0) return state.village.companionPositions[companion];
  return state.village.npcStates.find((item) => item.id === actor.id)?.position;
}

function panVillageRiver(state, actor, object, events) {
  const knowledge =
      state.village.development.masterPlan.regionalContext.geologyKnowledge,
    global = globalVillagePosition(state, object.position);
  knowledge.placerSites ??= [];
  check(
    !knowledge.placerSites.some((site) => same(site, global)),
    "PLACER_DEPLETED",
    "This small gravel bar has already been worked.",
  );
  const mineralKind = regionalPlacerMineral(
    state.seed,
    global.x,
    global.y,
    villageRegionalSite(state).mode,
  );
  knowledge.placerSites.push({
    ...global,
    mineralKind,
    pannedAtTick: state.tick,
  });
  const position = actorVillagePosition(state, actor),
    material = mineralKind
      ? createLooseMaterial(state, mineralKind, position, 1)
      : null;
  events.push({
    type: mineralKind ? "placer_mineral_recovered" : "placer_pan_empty",
    actorId: actor.id,
    position: { ...object.position },
    mineralKind,
    materialId: material?.id ?? null,
    quantity: material?.quantity ?? 0,
  });
}

function quarryMaterial(object) {
  return (
    {
      building_stone: "stone",
      iron_ore: "iron_ore",
      copper_ore: "copper_ore",
      tin_ore: "tin_ore",
    }[object.depositKind] ?? "stone"
  );
}

function manipulateVillageObject(state, actor, object, action, events) {
  const result = {
      dig: ["dug_ground", "earth", 1],
      harvest: ["tree_stump", "timber", 2],
      breach: ["breached_wall", "stone", 2],
      quarry: ["quarried_rock", quarryMaterial(object), 3],
    }[action],
    toolTags = {
      dig: "dig",
      harvest: "cut",
      breach: "breach",
      quarry: "breach",
    },
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
  const geology =
    action === "quarry" ? geologyRecord(state, object.position) : null;
  if (geology) geology.remainingUnits = 0;
  events.push(manipulationEvent(actor, object, action, tool, material));
  if (action === "breach") alertTownGuard(state, object.position, events);
}

function requestVillageStocktake(state, object, events) {
  const { job, created } = createJob(state, {
    jobType: "inspect_object",
    name: `Stocktake ${object.name}`,
    targetId: object.id,
    targetPosition: object.position,
    requiredCapabilities: ["inspect"],
    reason: "player_request",
    progressUnit: "inspection",
  });
  events.push({
    type: created ? "job_posted" : "job_already_posted",
    jobId: job.id,
    objectId: object.id,
    jobName: job.name,
    position: { ...object.position },
  });
}

function collectVillageMaterial(state, actor, object, events) {
  const material = state.village.looseMaterials.find(
    (candidate) => candidate.id === object.id,
  );
  check(material, "MATERIAL_MISSING", "There is nothing to collect.");
  return collectMaterial(state, actor, material, events);
}

function applyVillageAffordance(state, actor, object, affordance, events) {
  if (["examine", "read"].includes(affordance.key))
    return describeVillageObject(object, events, affordance.key);
  if (affordance.key === "talk") return talkToVillageResident(object, events);
  if (affordance.key === "open")
    return openVillageObject(state, object, events);
  if (affordance.key === "prospect")
    return prospectVillageRock(state, actor, object, events);
  if (affordance.key === "pan")
    return panVillageRiver(state, actor, object, events);
  if (affordance.key === "collect")
    return collectVillageMaterial(state, actor, object, events);
  if (["dig", "harvest", "breach", "quarry"].includes(affordance.key))
    return manipulateVillageObject(
      state,
      actor,
      object,
      affordance.key,
      events,
    );
  if (affordance.key === "request_stocktake")
    return requestVillageStocktake(state, object, events);
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
  includeParty = true,
) {
  const companions = new Map(
      (includeParty ? area.companionPositions : []).map((position, index) => [
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
      if (companion) {
        const work = state.village?.companionStates?.find(
          (candidate) => candidate.actorId === companion.id,
        );
        cell.partyMember = localPartyMember(companion, work);
      }
      cells.push(cell);
    }
  return cells;
}

function localPartyMember(companion, work = null) {
  return {
    id: companion.id,
    name: companion.name,
    class: companion.class,
    glyph: companion.glyph,
    hp: companion.hp,
    maxHp: companion.maxHp,
    ...(work
      ? {
          objective: work.objective,
          currentAction: work.currentAction,
          actionReason: work.actionReason,
          workPriorities: work.workPriorities,
          workPermissions: work.workPermissions,
          capabilityTags: work.capabilityTags,
        }
      : {}),
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

// function-length-exempt: template -- client village projection
function villageView(state) {
  const origin = villageViewportOrigin(state),
    cells = localPartyCells(
      state,
      VILLAGE,
      state.village,
      villageTile,
      origin,
      state.village.adventurersPresent !== false,
    ).map((cell) => villageObjectCell(state, cell)),
    objects = [
      ...new Map(cells.map((cell) => [cell.object.id, cell.object])).values(),
    ],
    entityIndex = createEntityIndex(objects),
    buildingShopKey =
      villageShopAt(state, state.village.heroPosition)?.shopKey ?? null,
    currentShop = VILLAGE.shops.find((shop) => shop.id === buildingShopKey),
    currentShopKey =
      currentShop && villageShopStatus(state, currentShop).open
        ? currentShop.id
        : null,
    jobActors = [
      ...state.village.npcStates.map((npc) => ({
        ...npc,
        name: VILLAGE_PEOPLE.find((person) => person.key === npc.personKey)
          .name,
      })),
      ...state.village.companionStates,
    ];
  return {
    name: VILLAGE.name,
    description: VILLAGE.description,
    scenario: state.village.scenario,
    buildings: structuredClone(villageBuildings(state)),
    residences: structuredClone(state.village.residences ?? []),
    pastures: structuredClone(state.village.pastures ?? []),
    visits: state.villageVisits,
    clock: { ...state.village.clock },
    development: structuredClone(state.village.development),
    skillWorkQueues: structuredClone(state.village.skillWorkQueues ?? {}),
    residents: state.village.npcStates.map((resident) => ({
      id: resident.id,
      name: resident.name,
      personKey: resident.personKey,
      workState: resident.workState,
      currentAction: resident.currentAction,
      actionReason: resident.actionReason,
      skills: { ...(resident.skills ?? {}) },
      skillPriorities: { ...(resident.skillPriorities ?? {}) },
    })),
    trade: villageTradeView(state),
    playerCharacterStates: structuredClone(state.village.playerCharacterStates),
    partyMovement: state.village.partyMovement,
    regrouping: state.village.regrouping,
    spendingPolicy: { ...state.village.spendingPolicy },
    companionStates: state.village.companionStates.map((worker) => ({
      ...worker,
      position: { ...worker.position },
    })),
    heroPosition: { ...state.village.heroPosition },
    entityCount: entityIndex.size,
    stockpiles: state.village.stockpiles.map((stockpile) => ({
      ...stockpile,
    })),
    jobs: state.village.jobs.map((job) =>
      jobView(job, state.village.reservations, jobActors),
    ),
    map: {
      width: VILLAGE.width,
      height: VILLAGE.height,
      origin: { ...origin },
      rolling: true,
      cells,
    },
    currentShopKey,
    shops: VILLAGE.shops.map((shop) => {
      const status = villageShopStatus(state, shop);
      return {
        ...shop,
        ...status,
        accessible: shop.id === currentShopKey && status.open,
        goods: shop.goods.map((itemKind) => ({
          ...villageGood(itemKind),
          quantity: shopStock(state, shop.id, itemKind)?.quantity ?? 0,
        })),
      };
    }),
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

// function-length-exempt: template -- Unity actor protocol projection
function unityCellActor(state, cell) {
  if (
    state.village.adventurersPresent !== false &&
    same(state.village.heroPosition, cell)
  ) {
    const life = state.village.playerCharacterStates.find(
      (candidate) => candidate.actorId === state.hero.id,
    );
    return {
      glyph: "侠",
      entityId: state.hero.id,
      entityKind: "party",
      entityName: state.hero.name,
      entityObjective: life?.recommendation
        ? `Suggested: ${NEED_JOB_TYPES[life.recommendation.need]}`
        : "Player directed",
      entityReason: "player_control",
      ...unityLifeFields(life),
    };
  }
  if (cell.partyMember)
    return {
      glyph: cell.partyMember.glyph,
      entityId: cell.partyMember.id,
      entityKind: "party",
      entityName: cell.partyMember.name,
      entityObjective: cell.partyMember.objective,
      entityAction: cell.partyMember.currentAction,
      entityReason: cell.partyMember.actionReason,
      entityWork: Object.entries(cell.partyMember.workPriorities ?? {})
        .map(
          ([jobType, priority]) =>
            `${jobType.replaceAll("_", " ")} ${priority}`,
        )
        .join(", "),
      entityPermissions: (
        cell.partyMember.workPermissions?.allowedJobTypes ?? []
      )
        .map((jobType) => jobType.replaceAll("_", " "))
        .join(", "),
      entityCapabilities: (cell.partyMember.capabilityTags ?? []).join(", "),
      ...unityLifeFields(cell.partyMember.life),
    };
  if (cell.person)
    return {
      glyph: cell.glyph,
      entityId: cell.person.corpse?.id ?? cell.person.id,
      entityKind: cell.person.category,
      entityName: cell.person.corpse?.name ?? cell.person.name,
      entityObjective: cell.person.corpse
        ? "awaiting burial"
        : cell.person.objective,
      entityAction: cell.person.corpse
        ? "Lying where death occurred"
        : cell.person.currentAction,
      entityReason: cell.person.corpse
        ? "resident_death"
        : cell.person.actionReason,
      entityWorking: cell.person.workState === "working",
      ...(cell.person.carriedItem
        ? {
            entityCarrying: cell.person.carriedItem.name,
            entityCarryingKind: cell.person.carriedItem.itemKind,
          }
        : {}),
      entityWork: Object.entries(cell.person.workPriorities ?? {})
        .map(
          ([jobType, priority]) =>
            `${jobType.replaceAll("_", " ")} ${priority}`,
        )
        .join(", "),
      entityPermissions: (cell.person.workPermissions?.allowedJobTypes ?? [])
        .map((jobType) => jobType.replaceAll("_", " "))
        .join(", "),
      entityCapabilities: [
        ...(cell.person.capabilityTags ?? []),
        ...Object.entries(cell.person.skills ?? {}).map(
          ([skill, rank]) => `${skill} ${rank}`,
        ),
        ...(cell.person.defenseEquipment
          ? [`equipped ${cell.person.defenseEquipment.itemKind}`]
          : []),
      ].join(", "),
      ...unityLifeFields(cell.person.life),
    };
  if (cell.animal)
    return {
      glyph: " ",
      entityId: cell.animal.id,
      entityKind: "animal",
      entityName: cell.animal.name,
      entityObjective: cell.animal.status,
      entityAction: cell.animal.activity,
      entityReason: `animal_${cell.animal.species}`,
      entityAgeStage: cell.animal.ageStage,
      entitySex: cell.animal.sex,
      entityGeneration: cell.animal.generation ?? 0,
    };
  return null;
}

function unityLifeFields(life) {
  if (!life) return {};
  const latest = life.memories.at(-1);
  return {
    entityNeeds: [
      ...(life.statusTags ?? []),
      ...Object.entries(life.needs).map(
        ([need, value]) => `${need} ${Math.round(value)}`,
      ),
    ].join(", "),
    entitySchedule: life.scheduleBlock,
    entityMemory: latest?.description ?? null,
  };
}

function unityObjectKind(cell) {
  if (cell.person) return cell.person.corpse ? "resident_corpse" : "resident";
  if (cell.animal)
    return cell.animal.status === "dead" ? "animal_carcass" : "animal";
  if (cell.material) return "material";
  if (cell.grave) return "grave";
  if (cell.animalDisposal) return "animal_disposal";
  if (cell.cremationPyre) return "cremation_pyre";
  if (cell.musterPoint) return "muster_point";
  if (cell.furniture) return "fixture";
  if (cell.primitive) return cell.primitive.kind;
  if (cell.door) return cell.door.entityType;
  if (cell.gateId) return "gate";
  if (cell.doorId) return "door";
  if (cell.construction) return `construction_${cell.construction.elementKind}`;
  if (cell.building) return cell.tile === "village_building" ? "wall" : "room";
  if (cell.sign) return "sign";
  if (cell.foragePatch) return "forage";
  if (cell.tile === "outdoor_tree") return "tree";
  if (cell.tile === "outdoor_rock") return "stone_deposit";
  if (cell.tile === "village_mine_floor") return "mine_chamber";
  if (cell.tile === "village_fence") return "fence";
  return "terrain";
}

function unityVillageInteraction(state, cell) {
  if (state.village.adventurersPresent === false) return {};
  if (gridDistance("square", state.village.heroPosition, cell) > 1) return {};
  const object = villageWorldObjectAt(state, cell.x, cell.y),
    actions = villageObjectAffordances(state, state.hero.id, object)
      .filter((affordance) => affordance.available)
      .map((affordance) => affordance.key);
  return actions.length ? { objectId: object.id, actions } : {};
}

function unityVillageInspection(state, cell) {
  if (
    !cell.sign &&
    !cell.building &&
    !cell.furniture &&
    !cell.material &&
    !cell.person &&
    !cell.animal &&
    !cell.grave &&
    !cell.animalDisposal &&
    !cell.cremationPyre &&
    !cell.musterPoint &&
    !cell.construction &&
    !cell.primitive &&
    !cell.door &&
    !cell.pasture &&
    !cell.modification &&
    cell.tile !== "outdoor_rock" &&
    !cell.tile.startsWith("road_bridge_")
  )
    return {};
  if (cell.building) return {};
  if (cell.construction)
    return {
      objectName: `${cell.construction.name} ${cell.construction.elementKind}`,
      objectDescription: `Construction stage: ${cell.construction.stage.replaceAll("_", " ")}. ${cell.construction.materialDeliveredQuantity}/${cell.construction.materialRequired} material delivered; ${cell.construction.builtSegments}/${cell.construction.totalSegments} elements complete.`,
    };
  const object = villageWorldObjectAt(state, cell.x, cell.y);
  return {
    objectId: object.id,
    objectName: object.name,
    objectDescription: object.description,
  };
}

const UNITY_BODY_BUILDS = ["slim", "average", "broad", "heavy"],
  UNITY_SKIN_TONES = ["light", "warm", "tan", "deep"],
  UNITY_HAIR_STYLES = ["short", "crop", "waves", "braid", "bald"],
  UNITY_HAIR_COLORS = ["black", "brown", "auburn", "blond", "gray"],
  UNITY_PARTY_OUTFITS = ["blue", "green", "rust", "ochre"];

function unityAppearance(state, id, kind) {
  const pick = (values, salt) => {
    const score = [...`${id}:${salt}`].reduce(
      (total, character) => (total * 33 + character.charCodeAt(0)) >>> 0,
      5381,
    );
    return values[score % values.length];
  };
  return {
    entityBodyBuild: pick(UNITY_BODY_BUILDS, "body"),
    entitySkinTone: pick(UNITY_SKIN_TONES, "skin"),
    entityHairStyle: pick(UNITY_HAIR_STYLES, "hair-style"),
    entityHairColor: pick(UNITY_HAIR_COLORS, "hair-color"),
    entityOutfit:
      kind === "party"
        ? UNITY_PARTY_OUTFITS[
            [
              state.hero.id,
              ...state.companions.map((actor) => actor.id),
            ].indexOf(id) % UNITY_PARTY_OUTFITS.length
          ]
        : kind,
  };
}

function unityGroundTile(state, cell) {
  if (cell.furniture?.role === "fishing_jetty" && cell.furniture.waterCell)
    return "outdoor_water";
  const occupied =
      cell.tile === "village_person" ||
      cell.tile === "village_animal" ||
      cell.person ||
      cell.animal,
    underlying = occupied
      ? villageTile(state, cell.x, cell.y, false, true, true)
      : cell,
    tile = underlying?.tile ?? "outdoor_grass";
  return tile === "outdoor_tree" ||
    tile === "village_person" ||
    tile === "village_animal"
    ? "outdoor_grass"
    : tile;
}

function unityActorAssetKey(actor, appearance) {
  if (actor.entityKind === "animal") return unityAnimalAssetKey(actor);
  if (actor.entityKind === "party")
    return `actor_party_${appearance.entityOutfit}`;
  if (
    ["civilian", "guard", "official", "shopkeeper"].includes(actor.entityKind)
  )
    return `actor_${actor.entityKind}`;
  return "pawn_base_overhead_v2";
}

function unityAnimalAssetKey(actor) {
  const species = actor.entityReason?.replace("animal_", "");
  if (["cow", "pig", "sheep", "dog", "chicken"].includes(species)) {
    const stage =
      actor.entityAgeStage === "adult"
        ? (actor.entitySex ?? "female")
        : "juvenile";
    return `actor_${species}_${stage}_v3`;
  }
  if (species === "deer") return "actor_deer_v2";
  return `actor_${species}_v1`;
}

function residentAtSleepingPlace(state, actor) {
  const resident = state.village.npcStates.find(
    (candidate) => candidate.id === actor.entityId,
  );
  if (!resident) return true;
  const fixture = state.village.fixtures.find(
    (candidate) => candidate.id === resident.sleepingLocation?.fixtureId,
  );
  if (!fixture) return false;
  return same(resident.position, {
    x: fixture.x + (fixture.width ?? 1) - 1,
    y: fixture.y + (fixture.height ?? 1) - 1,
  });
}

function unityEntityPose(state, actor) {
  const action = actor.entityAction?.toLowerCase() ?? "";
  if (actor.entityObjective === "dead" || actor.entityKind === "deceased")
    return "dead";
  if (action.includes("sleep") && residentAtSleepingPlace(state, actor))
    return "sleeping";
  if (
    actor.entityKind === "animal" &&
    (action.includes("graz") || action.includes("forage"))
  )
    return "grazing";
  if (action.includes("waiting") || action.includes("reporting"))
    return "waiting";
  if (actor.entityCarryingKind) return "carrying";
  if (actor.entityWorking) return "working";
  return "idle";
}

function unitySleepingFootprint(state, actor) {
  if (unityEntityPose(state, actor) !== "sleeping") return null;
  const resident = state.village.npcStates.find(
      (candidate) => candidate.id === actor.entityId,
    ),
    fixture = state.village.fixtures.find(
      (candidate) => candidate.id === resident?.sleepingLocation?.fixtureId,
    );
  return fixture
    ? { width: fixture.width ?? 1, height: fixture.height ?? 1 }
    : null;
}

function unityFieldDesignation(state, cell) {
  const plan = state.village.development?.masterPlan,
    boundary = plan?.fieldBoundaries?.find(
      (item) =>
        cell.x >= item.x &&
        cell.x < item.x + item.w &&
        cell.y >= item.y &&
        cell.y < item.y + item.h,
    );
  if (!boundary) return null;
  const survey = plan.fieldClearingSurveys?.find(
    (item) => item.boundaryKey === boundary.key,
  );
  let edgeMask = 0;
  if (cell.y === boundary.y) edgeMask |= 1;
  if (cell.x === boundary.x + boundary.w - 1) edgeMask |= 2;
  if (cell.y === boundary.y + boundary.h - 1) edgeMask |= 4;
  if (cell.x === boundary.x) edgeMask |= 8;
  return { boundary, survey, edgeMask };
}

function unityStorageCell(state, cell) {
  const position = `${cell.x},${cell.y}`,
    storage = unityStoragePositions(state).has(position)
      ? storageCellAt(state, cell.x, cell.y)
      : null;
  if (!storage) return { storage: null, stockpiles: [], quantities: [] };
  const visible = [
      ...storage.allocations.filter((entry) => entry.kind === "stored"),
      ...storage.overflow,
    ],
    stockpileIds = [...new Set(visible.map((entry) => entry.stockpileId))],
    stockpiles = stockpileIds
      .map((id) =>
        state.village.stockpiles.find((candidate) => candidate.id === id),
      )
      .filter(Boolean);
  return {
    storage,
    stockpiles,
    quantities: stockpileIds.map((id) =>
      visible
        .filter((entry) => entry.stockpileId === id)
        .reduce((total, entry) => total + entry.quantity, 0),
    ),
  };
}

function unityStoragePositions(state) {
  const storage = state.village.storage ?? reconcileVillageStorage(state),
    cached = UNITY_STORAGE_POSITION_CACHE.get(state);
  if (cached?.tick === state.tick && cached.storage === storage)
    return cached.positions;
  const positions = new Set();
  for (const zone of storage.zones)
    for (const cell of zone.cells) positions.add(`${cell.x},${cell.y}`);
  for (const pile of storage.loosePiles ?? [])
    positions.add(`${pile.x},${pile.y}`);
  UNITY_STORAGE_POSITION_CACHE.set(state, {
    tick: state.tick,
    storage,
    positions,
  });
  return positions;
}

// function-length-exempt: template -- Unity cell protocol projection
function unityCell(state, cell) {
  const actor = unityCellActor(state, cell),
    appearance = actor
      ? unityAppearance(state, actor.entityId, actor.entityKind)
      : null,
    sleepingFootprint = actor ? unitySleepingFootprint(state, actor) : null,
    fieldDesignation = unityFieldDesignation(state, cell),
    interaction = unityVillageInteraction(state, cell),
    inspection = unityVillageInspection(state, cell),
    objectKind = unityObjectKind(cell),
    storageProjection = unityStorageCell(state, cell),
    storageCell = storageProjection.storage,
    storageZone = storageCell
      ? state.village.storage?.zones.find(
          (candidate) => candidate.id === storageCell.zoneId,
        )
      : null,
    stockpiles = storageProjection.stockpiles,
    stockpile = stockpiles[0],
    groundTile = unityGroundTile(state, cell),
    rockEdgeMask =
      groundTile === "outdoor_rock"
        ? regionalRockEdgeMask(state, cell.x, cell.y)
        : null,
    visibleObjectKind =
      objectKind === "stone_deposit" && rockEdgeMask === 0
        ? "mountain_mass"
        : objectKind,
    cropPlot = cropPlotAt(state, cell.x, cell.y),
    cropCellGrowth = cropPlot
      ? cropCellGrowthAt(cropPlot, cell.x, cell.y)
      : null,
    foragePatch = foragePatchAt(state, cell.x, cell.y),
    surface = villageSurfaceAt(state, cell.x, cell.y),
    animalTether = cell.animal?.tetherPosition
      ? globalVillagePosition(state, cell.animal.tetherPosition)
      : null,
    visual = villageVisualDescriptor({
      ...cell,
      ...(!cell.person && !cell.partyMember && actor
        ? {
            partyMember: {
              workState: actor.entityWorking ? "working" : "available",
              currentAction: actor.entityAction,
              carriedItem: actor.entityCarryingKind
                ? { itemKind: actor.entityCarryingKind }
                : null,
            },
          }
        : {}),
      stockpile,
      cropPlot,
      foragePatch,
    }),
    visualFields =
      cell.construction ||
      cell.primitive ||
      cell.door ||
      cell.material ||
      cell.animal ||
      cell.furniture ||
      cell.sign ||
      actor ||
      stockpile ||
      cropPlot ||
      foragePatch ||
      [
        "outdoor_tree",
        "outdoor_stump",
        "village_pit",
        "village_rubble",
      ].includes(cell.tile)
        ? visual
        : {},
    variant =
      (cell.tile === "village_building" && cell.visualVariant === "timber") ||
      (cell.doorId && cell.visualVariant === "wood")
        ? null
        : cell.visualVariant;
  return {
    x: cell.x,
    y: cell.y,
    tile: cell.tile,
    ...(groundTile !== cell.tile ? { groundTile } : {}),
    glyph: unityGlyph(cell, actor),
    ...(variant ? { variant } : {}),
    ...(rockEdgeMask != null ? { terrainEdgeMask: rockEdgeMask } : {}),
    ...(cell.modification?.kind === "quarried_rock"
      ? { mountainRoof: true }
      : {}),
    ...(visibleObjectKind && visibleObjectKind !== "terrain"
      ? { objectKind: visibleObjectKind }
      : {}),
    ...visualFields,
    ...(cell.construction
      ? {
          constructionStage: cell.construction.stage,
          constructionMaterialDelivered:
            cell.construction.materialDeliveredQuantity,
          constructionMaterialRequired: cell.construction.materialRequired,
          constructionLaborCompleted: cell.construction.laborCompleted,
          constructionLaborRequired: cell.construction.laborRequired,
        }
      : {}),
    ...((cell.furniture || cell.construction?.elementKind === "fixture") &&
    cell.visualVariant
      ? {
          objectWidth: cell.furniture?.width ?? cell.construction.width,
          objectHeight: cell.furniture?.height ?? cell.construction.height,
        }
      : {}),
    ...(cell.animal
      ? {
          objectWidth: cell.animal.width,
          objectHeight: cell.animal.height,
          ...(animalTether
            ? {
                animalTetherX: animalTether.x,
                animalTetherY: animalTether.y,
              }
            : {}),
        }
      : {}),
    ...(storageCell
      ? {
          storageCell: true,
          storageZoneId: storageCell.zoneId,
          storageCellId: storageCell.cellId,
          storageAllowedItemKinds: storageZone?.allowedItemKinds ?? [],
          ...(storageCell.loosePile ? { storageLoosePile: true } : {}),
          storageAllowance: storageCell.allowance,
          ...(storageCell.tier !== "ground"
            ? { storageTier: storageCell.tier }
            : {}),
          ...(!["outdoor", "fixture"].includes(storageCell.protection)
            ? { storageProtection: storageCell.protection }
            : {}),
          ...(storageCell.stackSlots > 1
            ? { storageStackSlots: storageCell.stackSlots }
            : {}),
          ...(storageCell.stacksUsed > 0
            ? { storageStacksUsed: storageCell.stacksUsed }
            : {}),
          ...(storageCell.used > 0 ? { storageUsed: storageCell.used } : {}),
          ...(storageCell.reserved > 0
            ? { storageReserved: storageCell.reserved }
            : {}),
          ...(storageCell.overflow.length > 0
            ? {
                storageOverflow: storageCell.overflow.reduce(
                  (total, entry) => total + entry.quantity,
                  0,
                ),
              }
            : {}),
          ...(stockpile
            ? {
                stockpileId: stockpile.id,
                stockItemKind: stockpile.itemKind,
                stockQuantity: storageProjection.quantities[0] ?? 0,
                stockCapacity: storageCell.allowance,
                stockpileIds: stockpiles.map((entry) => entry.id),
                stockItemKinds: stockpiles.map((entry) => entry.itemKind),
                stockQuantities: storageProjection.quantities,
                stockCapacities: stockpiles.map(() => storageCell.allowance),
              }
            : {}),
        }
      : {}),
    ...(cropPlot
      ? {
          cropPlotId: cropPlot.id,
          cropKind: cropPlot.cropKind,
          cropStage: cropCellGrowth?.stage ?? cropPlot.stage,
          ...(cropPlot.cycle > 0 ? { cropCycle: cropPlot.cycle } : {}),
          ...((cropCellGrowth?.progress ?? cropPlot.growthProgress) > 0
            ? {
                cropGrowthProgress:
                  cropCellGrowth?.progress ?? cropPlot.growthProgress,
              }
            : {}),
          ...(cropPlot.growthRate > 0
            ? { cropGrowthRate: cropPlot.growthRate }
            : {}),
          ...(cropPlot.plantedAtTick != null
            ? { cropExpectedMaturityDay: cropPlot.expectedMaturityDay }
            : {}),
          cropFertility: cropPlot.fertility,
          cropMoisture: cropPlot.moisture,
          cropDamage: cropPlot.cropDamage,
          ...(cropPlot.cropDisease
            ? { cropDisease: cropPlot.cropDisease }
            : {}),
          ...(cropPlot.lastYield > 0
            ? {
                cropLastYield: cropPlot.lastYield,
                cropLastFarmerSkill: cropPlot.lastFarmerSkill ?? 0,
              }
            : {}),
          ...(cropPlot.sowingAllowed === false
            ? { cropSowingPaused: true }
            : {}),
          ...(cropPlot.cutOrdered === true ? { cropCutOrdered: true } : {}),
          ...(cropPlot.harvestDestinationCellId
            ? {
                cropDestinationCellId: cropPlot.harvestDestinationCellId,
                cropDestinationX: cropPlot.harvestDestinationPosition?.x,
                cropDestinationY: cropPlot.harvestDestinationPosition?.y,
              }
            : {}),
        }
      : {}),
    ...(fieldDesignation
      ? {
          fieldDesignationId: fieldDesignation.survey?.id,
          fieldDesignationKey: fieldDesignation.boundary.key,
          fieldDesignationCropKind: fieldDesignation.boundary.cropKind,
          fieldDesignationStatus: fieldDesignation.survey?.status ?? "planned",
          fieldDesignationEdgeMask: fieldDesignation.edgeMask,
          fieldDesignationTree:
            fieldDesignation.survey?.treeCells?.some(
              (tree) => tree.x === cell.x && tree.y === cell.y,
            ) ?? false,
        }
      : {}),
    ...(foragePatch
      ? {
          foragePatchId: foragePatch.id,
          forageKind: foragePatch.key,
          forageName: foragePatch.name,
          forageStage: foragePatch.stage,
          forageYield: foragePatch.yield,
          forageRegrowAtTick: foragePatch.regrowAtTick,
        }
      : {}),
    ...(cell.pasture
      ? {
          pastureId: cell.pasture.id,
          pastureForageUnits: cell.pasture.forageUnits,
          pastureForageCapacity: cell.pasture.forageCapacity,
          pastureForageSeason: cell.pasture.forageSeason,
        }
      : {}),
    ...(surface.floor
      ? {
          floorPrimitiveId: surface.floor.id,
          floorMaterial: surface.floor.material,
          floorCondition: surface.floor.condition,
          floorMaxCondition: surface.floor.maxCondition,
        }
      : {}),
    ...(surface.roof
      ? {
          roofPrimitiveId: surface.roof.id,
          roofMaterial: surface.roof.material,
          roofCondition: surface.roof.condition,
          roofMaxCondition: surface.roof.maxCondition,
        }
      : {}),
    ...inspection,
    ...interaction,
    ...(actor
      ? {
          entityId: actor.entityId,
          entityKind: actor.entityKind,
          entityName: actor.entityName,
          ...appearance,
          visualAssetKey: unityActorAssetKey(actor, appearance),
          visualMaterial:
            actor.entityKind === "party"
              ? `party_${appearance.entityOutfit}`
              : actor.entityKind,
          ...(actor.entityObjective
            ? { entityObjective: actor.entityObjective }
            : {}),
          ...(actor.entityAction ? { entityAction: actor.entityAction } : {}),
          ...(actor.entityReason ? { entityReason: actor.entityReason } : {}),
          ...(actor.entityKind === "animal"
            ? {
                entityAgeStage: actor.entityAgeStage,
                entitySex: actor.entitySex,
                entityGeneration: actor.entityGeneration,
              }
            : {}),
          entityPose: unityEntityPose(state, actor),
          ...(sleepingFootprint
            ? {
                entitySleepWidth: sleepingFootprint.width,
                entitySleepHeight: sleepingFootprint.height,
              }
            : {}),
          entityWorking: actor.entityWorking === true,
          ...(actor.entityCarrying
            ? { entityCarrying: actor.entityCarrying }
            : {}),
          ...(actor.entityCarryingKind
            ? { entityCarryingKind: actor.entityCarryingKind }
            : {}),
          ...(actor.entityWork ? { entityWork: actor.entityWork } : {}),
          ...(actor.entityPermissions
            ? { entityPermissions: actor.entityPermissions }
            : {}),
          ...(actor.entityCapabilities
            ? { entityCapabilities: actor.entityCapabilities }
            : {}),
          ...(actor.entityNeeds ? { entityNeeds: actor.entityNeeds } : {}),
          ...(actor.entitySchedule
            ? { entitySchedule: actor.entitySchedule }
            : {}),
          ...(actor.entityMemory ? { entityMemory: actor.entityMemory } : {}),
        }
      : {}),
  };
}

// function-length-exempt: template -- declarative wall glyph table
function villageWallGlyph(cell, cellsByPosition) {
  const joins = (x, y) => {
      const neighbor = cellsByPosition.get(`${x},${y}`);
      return (
        neighbor?.tile === "village_building" || neighbor?.objectKind === "door"
      );
    },
    mask =
      (joins(cell.x, cell.y - 1) ? 8 : 0) |
      (joins(cell.x + 1, cell.y) ? 4 : 0) |
      (joins(cell.x, cell.y + 1) ? 2 : 0) |
      (joins(cell.x - 1, cell.y) ? 1 : 0);
  return (
    {
      1: "─",
      2: "│",
      3: "┐",
      4: "─",
      5: "─",
      6: "┌",
      7: "┬",
      8: "│",
      9: "┘",
      10: "│",
      11: "┤",
      12: "└",
      13: "┴",
      14: "├",
      15: "┼",
    }[mask] ?? "▪"
  );
}

function polishVillageGlyphs(cells) {
  const byPosition = new Map(
    cells.map((cell) => [`${cell.x},${cell.y}`, cell]),
  );
  return cells.map((cell) => {
    if (cell.tile === "village_building")
      return { ...cell, glyph: villageWallGlyph(cell, byPosition) };
    if (cell.tile === "village_door_open") return { ...cell, glyph: "╱" };
    if (cell.tile === "village_door_locked") return { ...cell, glyph: "◆" };
    if (cell.tile === "village_door_closed") return { ...cell, glyph: "▣" };
    if (cell.objectKind === "sign") return { ...cell, glyph: "⚑" };
    return cell;
  });
}

function unityGlyph(cell, actor) {
  if (actor) return actor.glyph;
  if (
    [
      "outdoor_grass",
      "road_stone",
      "road_dirt",
      "road_bridge_wood",
      "road_bridge_stone",
      "outdoor_rock",
    ].includes(cell.tile)
  )
    return " ";
  if (cell.tile === "village_floor" && cell.glyph === "·") return " ";
  return cell.glyph ?? " ";
}

function unityVillageLandmarks(state) {
  const origin = villageRegionalSite(state).origin;
  const buildings = villageBuildings(state).map((building) => ({
    x: building.x + origin.x,
    y: building.y + origin.y,
    width: building.w,
    height: building.h,
    name: building.name,
    status: building.status,
    complete: building.status === "complete",
    description:
      building.status === "complete"
        ? `${building.name}, a working part of Stonebridge.`
        : `${building.name}, an unfinished ${building.status} structure.`,
  }));
  return [...buildings, ...unityQuarryLandmarks(state)];
}

function unityQuarryLandmarks(state) {
  const regional = state.village.development.masterPlan.regionalContext,
    source = regional.surveyedSources.find(
      (candidate) => candidate.kind === "geology_survey",
    );
  if (!source) return [];
  const operating = state.village.modifications.some(
    (item) => item.kind === "quarried_rock",
  );
  return [
    {
      x: source.position.x - 2,
      y: source.position.y - 2,
      width: 5,
      height: 5,
      name: operating ? "Stonebridge quarry face" : "Planned quarry works",
      status: operating ? "operating" : "planned",
      complete: operating,
      description: operating
        ? "Miners cut designated cells into the ridge and stage finite stone here."
        : "The architect reserved this exposed ridge for quarry access and stone staging.",
    },
  ];
}

function villageChunkDeltaProjection(simulated) {
  const delta = simulated?.checkpoint?.delta,
    tier = simulated?.tier ?? "cold";
  if (!delta) return { detailLevel: "overview", deltaRevision: null };
  const projection = {
    detailLevel: { active: "full", warm: "summary", cold: "overview" }[tier],
    deltaRevision: delta.revision,
    deltaCounts: {
      terrain: delta.terrainChangeIds.length,
      structures: delta.structureIds.length,
      resources: delta.resourceIds.length,
      ownership: delta.ownershipIds.length,
    },
  };
  if (tier === "active") projection.delta = delta;
  return projection;
}

function villageChunkIdentity(state, chunkX, chunkY) {
  const simulated = regionalChunkState(state, chunkX, chunkY);
  return {
    id:
      simulated?.id ?? namedUuid(state.id, `village-chunk:${chunkX},${chunkY}`),
    chunkX,
    chunkY,
    tier: simulated?.tier ?? "cold",
    lastCheckpointTick: simulated?.lastCheckpointTick ?? null,
    nextCheckpointTick: simulated?.nextCheckpointTick ?? null,
    entityCount: simulated?.checkpoint?.entityIds.length ?? 0,
    stockUnits: simulated?.checkpoint?.stockUnits ?? 0,
    scheduledJobCount: simulated?.checkpoint?.scheduledJobIds.length ?? 0,
    ...villageChunkDeltaProjection(simulated),
  };
}

function transportVillageChunk(chunk, knownRevisions) {
  if (!chunk.delta || knownRevisions?.[chunk.id] !== chunk.deltaRevision)
    return chunk;
  const transported = { ...chunk, unchanged: true };
  delete transported.delta;
  return transported;
}

function villageProjectionCells(state, viewport, origin) {
  const viewTile = (current, x, y) =>
    villageTile(current, x, y, true, true, true);
  return polishVillageGlyphs(
    localPartyCells(
      state,
      viewport,
      state.village,
      viewTile,
      origin,
      state.village.adventurersPresent !== false,
    ).map((cell) => unityCell(state, cell)),
  ).map((cell) => translateUnityVillageCell(state, cell));
}

function villageChunkBounds(chunk) {
  const size = VILLAGE_REGION.chunkSize;
  return {
    left: chunk.chunkX * size,
    top: chunk.chunkY * size,
    right: (chunk.chunkX + 1) * size,
    bottom: (chunk.chunkY + 1) * size,
  };
}

function localRecordBounds(state, record) {
  const area = record.area ?? record,
    position = record.position ?? { x: area.x, y: area.y };
  if (position.x == null || position.y == null) return null;
  const global = globalVillagePosition(state, position);
  return {
    left: global.x,
    top: global.y,
    right: global.x + (area.width ?? area.w ?? 1),
    bottom: global.y + (area.height ?? area.h ?? 1),
  };
}

function boundsIntersect(left, right) {
  return (
    left.left < right.right &&
    left.right > right.left &&
    left.top < right.bottom &&
    left.bottom > right.top
  );
}

function localRecordTouchesChunk(state, record, chunkBounds) {
  const bounds = localRecordBounds(state, record);
  return bounds ? boundsIntersect(bounds, chunkBounds) : false;
}

function cellChunkSpatialRecords(state, chunkBounds) {
  const plan = state.village.development.masterPlan,
    groups = [
      state.village.modifications,
      state.village.constructionPrimitives,
      state.village.fixtures,
      state.village.buildings,
      state.village.stockpiles,
      state.village.cropPlots ?? [],
      state.village.pastures ?? [],
      state.village.foragePatches ?? [],
      state.village.development.constructionSites ?? [],
      plan.districts,
      plan.fieldBoundaries,
    ];
  return groups
    .flat()
    .filter((record) => localRecordTouchesChunk(state, record, chunkBounds));
}

function cellChunkEntities(state, chunkBounds) {
  return [...state.village.npcStates, ...(state.village.animals ?? [])].filter(
    (entity) => {
      const point = globalVillagePosition(state, entity.position);
      return boundsIntersect(
        {
          left: point.x,
          top: point.y,
          right: point.x + 1,
          bottom: point.y + 1,
        },
        chunkBounds,
      );
    },
  );
}

function cellChunkStorage(state, chunkBounds) {
  return (state.village.storage?.zones ?? []).filter((zone) =>
    zone.cells.some((cell) =>
      localRecordTouchesChunk(state, cell, chunkBounds),
    ),
  );
}

function villageCellChunkRevision(state, chunk) {
  const bounds = villageChunkBounds(chunk),
    records = cellChunkSpatialRecords(state, bounds),
    entities = cellChunkEntities(state, bounds),
    growing = records.some(
      (record) => record.cropKind && record.stage === "growing",
    ),
    contents = {
      deltaRevision: chunk.deltaRevision,
      records,
      entities,
      storage: cellChunkStorage(state, bounds),
      surveys: state.village.development.masterPlan.fieldClearingSurveys,
      growthTick: growing ? state.tick : null,
    };
  return namedUuid(
    state.id,
    `village-cell-chunk:${chunk.chunkX},${chunk.chunkY}:${JSON.stringify(contents)}`,
  );
}

function villageChunkCellProjection(state, chunk, cellRevision) {
  const size = VILLAGE_REGION.chunkSize,
    globalOrigin = { x: chunk.chunkX * size, y: chunk.chunkY * size },
    origin = localVillagePosition(state, globalOrigin),
    cells = villageProjectionCells(
      state,
      { width: size, height: size },
      origin,
    );
  return { cells, cellRevision };
}

function transportVillageCells(state, chunk, knownRevisions) {
  const cellRevision = villageCellChunkRevision(state, chunk),
    unchanged = knownRevisions?.[chunk.id] === cellRevision;
  return unchanged
    ? { ...chunk, cellRevision, cellsUnchanged: true }
    : {
        ...chunk,
        ...villageChunkCellProjection(state, chunk, cellRevision),
        cellsUnchanged: false,
      };
}

function visibleVillageChunks(state, origin, options = {}) {
  const size = VILLAGE_REGION.chunkSize,
    minX = Math.floor(origin.x / size),
    minY = Math.floor(origin.y / size),
    maxX = Math.floor((origin.x + UNITY_VILLAGE_VIEWPORT.width - 1) / size),
    maxY = Math.floor((origin.y + UNITY_VILLAGE_VIEWPORT.height - 1) / size),
    chunks = [];
  for (let y = minY; y <= maxY; y += 1)
    for (let x = minX; x <= maxX; x += 1)
      chunks.push(
        transportVillageChunk(
          villageChunkIdentity(state, x, y),
          options.knownChunkRevisions,
        ),
      );
  if (!options.cellChunkProtocol) return chunks;
  return chunks.map((chunk) =>
    transportVillageCells(state, chunk, options.knownCellChunkRevisions),
  );
}

function translateUnityVillageCell(state, cell) {
  const position = globalVillagePosition(state, cell);
  return { ...cell, x: position.x, y: position.y };
}

function unityVillageRegion(state) {
  const site = villageRegionalSite(state);
  return {
    ...VILLAGE_REGION,
    generationMode: site.mode,
    sites: state.village.development.masterPlan.regionalContext.surveyedSources,
    ...regionalSurveyGeometry(state.seed, site.mode),
  };
}

function unityVillageMap(state, center, options = {}) {
  const defaultCenter = globalVillagePosition(
    state,
    state.village.heroPosition,
  );
  center = clampVillageViewportCenter(
    center ?? defaultCenter,
    UNITY_VILLAGE_VIEWPORT,
  );
  const globalOrigin = {
      x: center.x - Math.floor(UNITY_VILLAGE_VIEWPORT.width / 2),
      y: center.y - Math.floor(UNITY_VILLAGE_VIEWPORT.height / 2),
    },
    origin = localVillagePosition(state, globalOrigin),
    cells = options.cellChunkProtocol
      ? []
      : villageProjectionCells(state, UNITY_VILLAGE_VIEWPORT, origin);
  return {
    ...UNITY_VILLAGE_VIEWPORT,
    origin: globalOrigin,
    cells,
    landmarks: unityVillageLandmarks(state),
    region: unityVillageRegion(state),
    chunks: visibleVillageChunks(state, globalOrigin, options),
  };
}

function dungeonGlyph(state, cell) {
  if (same(cell, state.hero)) return "勇";
  if (cell.partyMember) return cell.partyMember.glyph;
  if (cell.enemy) return cell.enemy.glyph;
  if (cell.treasure) return "$";
  if (cell.feature?.kind === "trap") return "^";
  if (cell.feature?.kind === "shrine") return "Ω";
  if (cell.feature?.kind === "item") return "!";
  if (cell.tile === "stairs_up") return "<";
  if (["stairs_down", "exit"].includes(cell.tile)) return ">";
  if (cell.tile.includes("door_closed")) return "+";
  if (cell.tile.includes("door_open")) return "/";
  if (cell.tile === "wall") return "#";
  return " ";
}

// function-length-exempt: template -- Unity dungeon protocol projection
function unityDungeonCell(state, position, currentVisible) {
  const cell = cellView(state, position, currentVisible) ?? {
      ...position,
      tile: "unexplored",
    },
    actor = cell.partyMember
      ? {
          entityId: cell.partyMember.id,
          entityKind: "party",
          entityName: cell.partyMember.name,
          entityHp: cell.partyMember.hp,
          entityMaxHp: cell.partyMember.maxHp,
        }
      : cell.enemy
        ? {
            entityId: cell.enemy.id,
            entityKind: "monster",
            entityName: cell.enemy.name,
            entityHp: cell.enemy.hp,
            entityMaxHp: cell.enemy.maxHp,
            entityObjective: "investigate_and_defend",
            entityAction: active(state).enemies.find(
              (enemy) => enemy.id === cell.enemy.id,
            )?.currentAction,
          }
        : same(position, state.hero)
          ? {
              entityId: state.hero.id,
              entityKind: "party",
              entityName: state.hero.name,
              entityHp: state.hero.hp,
              entityMaxHp: state.hero.maxHp,
            }
          : null;
  return {
    x: position.x,
    y: position.y,
    tile: cell.tile,
    glyph: dungeonGlyph(state, cell),
    objectKind: cell.object?.kind ?? null,
    ...(actor
      ? {
          entityId: actor.entityId,
          entityKind: actor.entityKind,
          entityName: actor.entityName,
          entityHp: actor.entityHp,
          entityMaxHp: actor.entityMaxHp,
          ...(actor.entityObjective
            ? { entityObjective: actor.entityObjective }
            : {}),
          ...(actor.entityAction ? { entityAction: actor.entityAction } : {}),
        }
      : {}),
  };
}

function unityDungeonMap(state) {
  const level = active(state),
    width = Math.min(UNITY_DUNGEON_VIEWPORT.width, level.map.width),
    height = Math.min(UNITY_DUNGEON_VIEWPORT.height, level.map.height),
    origin = {
      x: state.hero.x - Math.floor(width / 2),
      y: state.hero.y - Math.floor(height / 2),
    },
    visible = visibility(state),
    cells = [];
  for (let y = origin.y; y < origin.y + height; y++)
    for (let x = origin.x; x < origin.x + width; x++)
      cells.push(unityDungeonCell(state, { x, y }, visible));
  return { width, height, origin, cells };
}

function unityCombatActivity(event) {
  if (event.type === "attack")
    return event.hit
      ? {
          text: `${event.actorName} hits ${event.targetName} for ${event.appliedDamage?.hpDamage ?? 0}.`,
          tone: event.actorKind === "enemy" ? "danger" : "combat",
        }
      : {
          text: `${event.actorName} misses ${event.targetName}.`,
          tone: "subtle",
        };
  if (event.type === "spell_cast")
    return {
      text: `${event.spellName} strikes ${event.targetName} for ${event.appliedDamage?.hpDamage ?? 0}.`,
      tone: "combat",
    };
  if (event.type === "item_used" || event.type === "short_rest")
    return { text: `Recovered ${event.healing} HP.`, tone: "healing" };
  if (event.type === "enemy_defeated")
    return { text: `${event.actorName} is defeated.`, tone: "combat" };
  if (event.type === "death_save")
    return { text: `Death save: ${event.result}.`, tone: "danger" };
  return null;
}

// function-length-exempt: template -- Unity activity protocol projection
function unityExplorationActivity(event) {
  if (event.type === "treasure_collected")
    return { text: `Collected ${event.valueCp} CP.`, tone: "treasure" };
  if (event.type === "item_collected")
    return { text: `Found ${event.itemName}.`, tone: "treasure" };
  if (event.type === "trap_triggered")
    return {
      text: `${event.trapName} triggered${event.damage ? ` for ${event.damage.applied?.hpDamage ?? event.damage.total} damage` : ", but the save succeeds"}.`,
      tone: "danger",
    };
  if (event.type === "discovery")
    return event.found?.length
      ? { text: `A hidden feature is noticed.`, tone: "discovery" }
      : null;
  if (event.type === "level_changed")
    return {
      text: `${event.direction === "down" ? "Descended" : "Ascended"} to depth ${event.depth}.`,
      tone: "discovery",
    };
  if (event.type === "equipment_changed")
    return {
      text: `${event.actorName} equips ${event.itemName}.`,
      tone: "subtle",
    };
  if (event.type === "equipment_removed")
    return {
      text: `${event.actorName} removes ${event.itemName}.`,
      tone: "subtle",
    };
  if (event.type === "permanent_gain")
    return { text: `${event.itemName}: ${event.gain}.`, tone: "treasure" };
  if (event.type === "door_opened")
    return {
      text: event.jobName
        ? `${event.actorName} opened the way for ${event.jobName}.`
        : `${event.actorName ?? "The party"} opened a door.`,
      tone: "discovery",
    };
  return null;
}

// function-length-exempt: template -- Unity activity protocol projection
function unityWorkActivity(event) {
  if (event.type === "remote_travel_incident")
    return {
      text: `${event.actorName} encounters ${event.kind.replaceAll("_", " ")} and stops to recover.`,
      tone: "danger",
    };
  if (event.type === "remote_travel_recovered")
    return {
      text: `${event.actorName} recovers and resumes ${event.jobName.toLowerCase()}.`,
      tone: "discovery",
    };
  if (event.type === "regional_field_camp_visited")
    return {
      text: `${event.actorName} reaches the regional field camp.`,
      tone: "discovery",
    };
  if (event.type === "job_suspended")
    return {
      text: `${event.actorName}'s ${event.jobName.toLowerCase()} is interrupted.`,
      tone: "danger",
    };
  if (event.type === "guard_investigated")
    return {
      text: `${event.actorName} examines the reported damage.`,
      tone: "discovery",
    };
  if (event.type === "guard_warned")
    return { text: `${event.actorName} warns the offender.`, tone: "danger" };
  if (event.type === "guard_escorted")
    return {
      text: `${event.actorName} escorts the repeat offender.`,
      tone: "danger",
    };
  if (event.type === "production_started")
    return { text: `Work started: ${event.jobName}.`, tone: "subtle" };
  if (event.type === "production_completed")
    return {
      text: `${event.actorName} produced ${event.quantity} ${event.itemKind.replaceAll("_", " ")}.`,
      tone: "discovery",
    };
  if (event.type === "job_started")
    return { text: `Work started: ${event.jobName}.`, tone: "subtle" };
  if (event.type === "job_reserved")
    return {
      text: `${event.actorName} accepted ${event.jobName}.`,
      tone: "subtle",
    };
  if (event.type === "cargo_loaded")
    return {
      text: `${event.actorName} loaded ${event.quantity} ${event.cargoName}.`,
      tone: "subtle",
    };
  if (event.type === "cargo_delivered")
    return {
      text: `${event.actorName} delivered ${event.quantity} ${event.cargoName}.`,
      tone: "subtle",
    };
  if (event.type === "job_blocked")
    return {
      text: `${event.jobName ?? "Work"} waits: ${event.reason?.replaceAll("_", " ") ?? "unknown reason"}.`,
      tone: "danger",
    };
  if (event.type === "job_completed")
    return { text: `Work completed: ${event.jobName}.`, tone: "subtle" };
  if (event.type === "job_posted")
    return { text: `New work: ${event.jobName}.`, tone: "subtle" };
  if (event.type === "job_resumed")
    return { text: `Work resumed: ${event.jobName}.`, tone: "subtle" };
  if (event.type === "job_cancelled")
    return { text: `Work cancelled: ${event.jobName}.`, tone: "subtle" };
  return null;
}

function unityActivityEntry(event) {
  return (
    unityCombatActivity(event) ??
    unityExplorationActivity(event) ??
    unityWorkActivity(event)
  );
}

function unityActivity(recentEvents) {
  return [...recentEvents].reverse().map(unityActivityEntry).find(Boolean)
    ?.text;
}

function unityActivityLog(recentEvents) {
  const entries = recentEvents.map(unityActivityEntry).filter(Boolean),
    unique = entries.filter(
      (entry, index) =>
        entries.findLastIndex((candidate) => candidate.text === entry.text) ===
        index,
    );
  return unique.slice(-5);
}

function adjacentClosedDoor(state, level) {
  return level.doors.some(
    (door) =>
      door.revealed &&
      door.state === "closed" &&
      gridDistance("square", state.hero, door) === 1,
  );
}

function unityCombatIntents(state, items, targets) {
  const weapon = ROGUE_EQUIPMENT[state.hero.weapon],
    inRange = (target, range) =>
      gridDistance("square", state.hero, target) <= range;
  return [
    ...(weapon?.rangeSquares &&
    targets.some((target) => inRange(target, weapon.rangeSquares))
      ? ["ranged_attack"]
      : []),
    ...(items.some(
      (item) =>
        item.throwable && targets.some((target) => inRange(target, item.range)),
    )
      ? ["throw_item"]
      : []),
  ];
}

function unityResourceIntents(state, items, targets) {
  const needsHealth = state.hero.hp < state.hero.maxHp,
    canInvoke = items.some(
      (item) =>
        item.invokable &&
        (!["scroll_flame", "wand_arc"].includes(item.kind) || targets.length),
    );
  return [
    ...(items.some((item) => item.kind === "healing_potion") && needsHealth
      ? ["use_item"]
      : []),
    ...(canInvoke ? ["invoke_item"] : []),
    ...(state.hero.classPower.remaining > 0 &&
    (state.hero.classPower.key === "magic_missile"
      ? targets.length
      : needsHealth)
      ? ["class_power"]
      : []),
    ...(restStatus(state).available ? ["short_rest"] : []),
  ];
}

function unityEquipmentIntents(state) {
  const actors = partyActors(state),
    items = actors.flatMap((actor) => actor.inventory ?? []);
  return [
    ...(items.some((item) => item.itemType === "equipment" && !item.equipped)
      ? ["equip"]
      : []),
    ...(actors.some((actor) => actor.equipment.offhand) ? ["unequip"] : []),
  ];
}

function unityPositionIntents(state, level) {
  return [
    ...(adjacentClosedDoor(state, level) ? ["open"] : []),
    ...(same(state.hero, level.entrance) ? ["stairs_up"] : []),
    ...(same(state.hero, level.exit) && state.depth < state.maxDepth
      ? ["stairs"]
      : []),
  ];
}

function unityDungeonIntents(state, level) {
  if (state.status === "dying") return ["death_save"];
  if (state.status !== "active") return [];
  const items = unityInventory(state),
    targets = unityTargets(state);
  return [
    "move",
    "command",
    "configure_party_member",
    "wait",
    "search",
    "examine",
    ...unityPositionIntents(state, level),
    ...unityCombatIntents(state, items, targets),
    ...unityResourceIntents(state, items, targets),
    ...unityEquipmentIntents(state),
  ];
}

function unityInventoryItems(actor) {
  return (actor.inventory ?? [])
    .filter((item) => (item.quantity ?? item.charges ?? 1) > 0)
    .map((item) => ({
      id: item.id,
      name: item.name,
      kind: item.kind,
      itemType: item.itemType ?? item.kind,
      slot: item.slot ?? null,
      quantity: item.quantity ?? 0,
      charges: item.charges ?? 0,
      equipped: Boolean(item.equipped),
      throwable: Boolean(item.thrownRange),
      range: item.thrownRange ?? 0,
      invokable: ["relic", "scroll", "wand"].includes(item.itemType),
    }));
}

function unityInventory(state) {
  return unityInventoryItems(state.hero);
}

function unityPartyInventories(state) {
  return partyActors(state).map((actor) => ({
    actorId: actor.id,
    actorName: actor.name,
    items: unityInventoryItems(actor),
  }));
}

function unityPartyOrder(state) {
  const group = state.partyGroup;
  return {
    id: group.id,
    leaderId: group.leaderId,
    commandRevision: group.commandRevision,
    ...group.order,
  };
}

function equippedName(actor, slot) {
  const itemId = actor.equipment?.[slot];
  return actor.inventory?.find((item) => item.id === itemId)?.name ?? "None";
}

function partyMemberLife(state, actor) {
  if (actor.id === state.hero.id)
    return state.village.playerCharacterStates.find(
      (life) => life.actorId === actor.id,
    );
  return companionWorker(state, actor.id)?.life ?? null;
}

// function-length-exempt: template -- client activity projection
function partyMemberActivities(state, actor, worker) {
  if (actor.id === state.hero.id)
    return [
      {
        jobType: "lead_party",
        name: "Lead the party",
        priority: actor.management.workPriority,
        skillNames: ["Leadership"],
        available: true,
        requirement: null,
      },
    ];
  return Object.entries(worker?.workPriorities ?? {}).map(
    ([jobType, priority]) => {
      const template = companionTemplate(jobType),
        skillNames = (
          template?.skills ?? [jobType === "heal_party" ? "medicine" : null]
        )
          .filter(Boolean)
          .map(
            (skillKey) =>
              CHARACTER_SKILLS.find((skill) => skill.key === skillKey)?.name,
          )
          .filter(Boolean);
      return {
        jobType,
        name:
          template?.name ??
          (jobType === "heal_party" ? "Care for wounded companions" : jobType),
        priority,
        skillNames,
        available:
          jobType === "heal_party" ||
          companionActivityAvailable(state, jobType),
        requirement: template?.facility ?? null,
      };
    },
  );
}

// function-length-exempt: template -- client management projection
function partyMemberManagementView(state, actor) {
  const worker = companionWorker(state, actor.id),
    activeJob = state.village.jobs.find(
      (job) =>
        job.assignedActorId === actor.id &&
        ["reserved", "active", "blocked", "suspended"].includes(job.status),
    ),
    life = partyMemberLife(state, actor),
    activities = partyMemberActivities(state, actor, worker),
    highestActivity = [...activities]
      .filter((activity) => activity.available)
      .sort(
        (left, right) =>
          right.priority - left.priority ||
          left.jobType.localeCompare(right.jobType),
      )[0];
  return {
    id: actor.id,
    name: actor.name,
    className: actor.class,
    level: actor.level,
    combatRole: actor.management.combatRole,
    jobFocus: highestActivity?.jobType ?? actor.management.jobFocus,
    workPriority: highestActivity?.priority ?? actor.management.workPriority,
    hp: actor.hp,
    maxHp: actor.maxHp,
    ac: actor.ac,
    attackBonus: actor.attackBonus,
    damage: actor.damage,
    attackRange: actor.attackRange,
    abilities: Object.entries(actor.abilities).map(([key, score]) => ({
      key,
      score,
      modifier: Math.floor((score - 10) / 2),
    })),
    skills: characterSkillView(actor),
    jobOptions:
      actor.id === state.hero.id
        ? ["lead_party"]
        : [...(worker?.workPermissions.allowedJobTypes ?? [])],
    workPriorities: Object.entries(worker?.workPriorities ?? {}).map(
      ([jobType, priority]) => ({ jobType, priority }),
    ),
    activities,
    currentJob: activeJob?.name ?? null,
    currentJobStatus: activeJob?.status ?? null,
    needs: life
      ? Object.entries(life.needs).map(([key, value]) => ({
          key,
          value: Math.round(value),
        }))
      : [],
    equipment: {
      weapon: equippedName(actor, "weapon"),
      armor: equippedName(actor, "armor"),
      offhand: equippedName(actor, "offhand"),
    },
  };
}

function unityTargets(state) {
  const visible = visibility(state);
  return aliveEnemies(state)
    .filter((enemy) => visible.has(key(enemy)))
    .map((enemy) => ({
      id: enemy.id,
      name: enemy.name,
      x: enemy.x,
      y: enemy.y,
      hp: enemy.hp,
      maxHp: enemy.maxHp,
    }));
}

function villageObservationCenter(state) {
  const residents = state.village.npcStates.filter(
    (resident) => resident.life?.status !== "dead",
  );
  if (!residents.length) return { x: 0, y: 0 };
  const global = residents.map((resident) =>
      globalVillagePosition(state, resident.position),
    ),
    total = global.reduce(
      (sum, position) => ({ x: sum.x + position.x, y: sum.y + position.y }),
      { x: 0, y: 0 },
    );
  return {
    x: Math.round(total.x / global.length),
    y: Math.round(total.y / global.length),
  };
}

function unityVillageShop(state) {
  if (state.location !== "village") return null;
  const shopKey = villageShopAt(state, state.village.heroPosition)?.shopKey,
    shop = VILLAGE.shops.find((candidate) => candidate.id === shopKey);
  if (!shop) return null;
  const status = villageShopStatus(state, shop);
  return {
    id: shop.id,
    name: shop.name,
    keeper: shop.keeper,
    ...status,
    goods: shop.goods
      .map((itemKind) => ({
        ...villageGood(itemKind),
        quantity: shopStock(state, shop.id, itemKind)?.quantity ?? 0,
      }))
      .filter((good) => good.quantity > 0),
  };
}

export function rogueUnityView(state, recentEvents = [], options = {}) {
  const jobActors = [
      ...state.village.npcStates.map((npc) => ({
        ...npc,
        name: VILLAGE_PEOPLE.find((person) => person.key === npc.personKey)
          .name,
      })),
      ...state.village.companionStates,
    ],
    dungeon = state.location === "dungeon",
    map = dungeon
      ? unityDungeonMap(state)
      : unityVillageMap(state, options.villageCenter, options),
    level = active(state),
    jobs = dungeon
      ? level.jobs.map((job) => jobView(job, level.reservations, level.enemies))
      : state.village.jobs.map((job) =>
          jobView(job, state.village.reservations, jobActors),
        ),
    shop = unityVillageShop(state),
    adventurersPresent = dungeon || state.village.adventurersPresent !== false,
    villageHeroPosition = globalVillagePosition(
      state,
      state.village.heroPosition,
    );
  return {
    protocolVersion: 1,
    visualRegistryVersion: VILLAGE_VISUAL_REGISTRY_VERSION,
    runId: state.id,
    revision: state.revision,
    tick: state.tick,
    status: state.status,
    location: state.location,
    villageScenario: dungeon ? null : state.village.scenario,
    adventurersPresent,
    title: dungeon ? level.theme.title : VILLAGE.name,
    townClock: dungeon
      ? null
      : `DAY ${state.village.clock.day} · ${String(state.village.clock.hour).padStart(2, "0")}:${String(state.village.clock.minute).padStart(2, "0")} · ${state.village.clock.phase} · ${state.village.clock.block.replaceAll("_", " ")}`,
    daylightPhase: dungeon ? null : state.village.clock.phase,
    daylightLevel: dungeon ? 0 : daylightLevel(state.village.clock),
    activity: unityActivity(recentEvents),
    activityLog: unityActivityLog(recentEvents),
    legalIntents: dungeon
      ? unityDungeonIntents(state, level)
      : [
          ...(adventurersPresent
            ? [
                "local_move",
                "configure_party_member",
                "set_party_movement",
                "set_spending_policy",
              ]
            : []),
          "wait",
          "decide_village_proposal",
          "revise_village_proposal",
          "decide_architect_plan",
          "set_village_commission_status",
          "set_cemetery_policy",
          ...(adventurersPresent && shop?.open ? ["shop_buy"] : []),
        ],
    message: dungeon ? level.theme.atmosphere : VILLAGE.description,
    hero: {
      id: state.hero.id,
      name: state.hero.name,
      hp: state.hero.hp,
      maxHp: state.hero.maxHp,
      goldCp: state.hero.goldCp,
      x: dungeon ? state.hero.x : villageHeroPosition.x,
      y: dungeon ? state.hero.y : villageHeroPosition.y,
    },
    observationCenter: dungeon ? null : villageObservationCenter(state),
    map,
    jobs,
    inventory: dungeon ? unityInventory(state) : [],
    inventories: dungeon ? unityPartyInventories(state) : [],
    targets: dungeon ? unityTargets(state) : [],
    partyOrder: dungeon ? unityPartyOrder(state) : null,
    partyMembers: adventurersPresent
      ? partyActors(state).map((actor) =>
          partyMemberManagementView(state, actor),
        )
      : [],
    combatRoles: [...COMBAT_ROLES],
    simulation: rogueSimulationStatus(state),
    partyMovement:
      dungeon || !adventurersPresent ? null : state.village.partyMovement,
    regrouping: dungeon ? false : state.village.regrouping,
    spendingPolicy: dungeon ? null : { ...state.village.spendingPolicy },
    villageDevelopment: dungeon
      ? null
      : structuredClone(state.village.development),
    villageTrade: dungeon ? null : villageTradeView(state, true),
    villageMeaning: dungeon ? null : villageMeaningView(state),
    classPower: dungeon ? structuredClone(state.hero.classPower) : null,
    shop,
    events: recentEvents.slice(-12),
  };
}

// function-length-exempt: template -- complete client view projection
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
    dungeon: {
      entityCount: dungeonEntityIndex(state).size,
      jobs: level.jobs.map((job) =>
        jobView(job, level.reservations, level.enemies),
      ),
    },
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
                "configure_party_member",
                "set_party_movement",
                "open_world",
                ...(village.currentShopKey ? ["shop_buy"] : []),
                "equip",
                "unequip",
              ]
            : state.location === "exterior"
              ? [
                  "local_move",
                  "configure_party_member",
                  "enter_dungeon",
                  ...(!state.exterior.danger ? ["open_world"] : []),
                ]
              : state.location === "world"
                ? [
                    "world_move",
                    "world_travel",
                    "configure_party_member",
                    ...(state.world.position ? ["enter_location"] : []),
                  ]
                : [
                    "move",
                    "command",
                    "configure_party_member",
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

// function-length-exempt: template -- legacy group-state migration
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

function migratePartyDevelopment(value) {
  for (const actor of partyActors(value)) {
    actor.abilities ??= defaultAbilities(actor.class);
    actor.proficiencyBonus ??= 2;
    const development = createCharacterDevelopment(actor);
    actor.development ??= development;
    actor.development.skills ??= {};
    for (const [skillKey, skill] of Object.entries(development.skills)) {
      actor.development.skills[skillKey] ??= skill;
      actor.development.skills[skillKey].rank ??= skill.rank;
      actor.development.skills[skillKey].practice ??= 0;
    }
    actor.management ??= createPartyManagement(actor);
    actor.management.combatRole ??= actor.role ?? "frontline";
    actor.management.jobFocus ??= createPartyManagement(actor).jobFocus;
    actor.management.workPriority ??= 70;
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
    enemy.capabilityTags ??= ["investigate"];
    enemy.workPermissions ??= {
      allowedJobTypes: ["investigate_noise"],
    };
    enemy.workState ??= "available";
    enemy.lastJobType ??= null;
    enemy.currentAction ??= "Guarding its territory";
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
  level.jobs ??= [];
  level.reservations ??= [];
  for (const job of level.jobs) job.scope = "dungeon";
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

// function-length-exempt: template -- legacy party-state migration
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

// function-length-exempt: template -- declarative legacy-save identity mapping
function migrateIdentity(value) {
  const migration = identityMigration(value);
  migrateHeroIdentity(value, migration.actorId);
  migrateCompanionIdentities(value, migration.actorId);
  migratePartyDevelopment(value);
  for (const level of value.levels) migrateLevelIdentity(level, migration);
  migratePartyItems(value, migration.objectIds, migration.objectId);
  migratePartyGroup(value, migration.actorIds);
  for (const level of value.levels) {
    assignEnemyGroups(level, value, migration.actorIds);
  }
  value.schemaVersion = 22;
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
  value.village.scenario ??= "established";
  value.village.adventurersPresent = false;
  value.village.buildings ??=
    value.village.scenario === "founding"
      ? []
      : structuredClone(VILLAGE_BUILDINGS);
  value.village.residences ??= [];
  value.village.fixtures ??= [];
  value.village.pastures ??= [];
  value.village.facilities ??= [];
  ensureVillageDevelopment(value);
  value.village.heroPosition ??= { ...VILLAGE.heroPosition };
  value.village.companionPositions ??= structuredClone(
    VILLAGE.companionPositions,
  );
  value.village.viewportOrigin ??= { ...VILLAGE.viewportOrigin };
  value.village.partyMovement ??= "follow";
  value.village.clock ??= createTownClock();
  value.village.clock.minute ??= 0;
  value.village.clock.second ??= 0;
  value.village.clock.block = scheduleBlock(value.village.clock.hour);
  value.village.clock.phase = daylightPhase(
    value.village.clock.hour,
    value.village.clock.minute,
  );
  value.village.playerCharacterStates ??= [
    createLifeState(value.hero.id, "player_directed"),
  ];
  if (
    !value.village.playerCharacterStates.some(
      (life) => life.actorId === value.hero.id,
    )
  )
    value.village.playerCharacterStates.push(
      createLifeState(value.hero.id, "player_directed"),
    );
  value.village.regrouping ??= false;
  value.village.spendingPolicy ??= {
    mode: "approval_required",
    autonomousLimitCp: 0,
    spentCp: 0,
  };
  value.village.companionStates ??= value.companions.map((actor, index) =>
    createCompanionWorkState(
      actor,
      value.village.companionPositions[index] ?? value.village.heroPosition,
    ),
  );
  for (const actor of value.companions) {
    let townState = value.village.companionStates.find(
      (candidate) => candidate.actorId === actor.id,
    );
    if (!townState) {
      const index = value.companions.indexOf(actor);
      townState = createCompanionWorkState(
        actor,
        value.village.companionPositions[index] ?? value.village.heroPosition,
      );
      value.village.companionStates.push(townState);
    }
    const profile = companionWorkProfile(actor);
    townState.id = actor.id;
    townState.actorId = actor.id;
    townState.actorKind = "companion";
    townState.name = actor.name;
    townState.capabilityTags ??= profile.capabilityTags;
    townState.workPermissions ??= profile.workPermissions;
    townState.workPriorities = {
      ...profile.workPriorities,
      ...(townState.workPriorities ?? {}),
    };
    delete townState.workPriorities.train;
    townState.workPermissions.allowedJobTypes = [
      ...new Set([
        ...townState.workPermissions.allowedJobTypes,
        ...profile.workPermissions.allowedJobTypes,
      ]),
    ].filter((jobType) => jobType !== "train");
    if (
      !townState.workPermissions.allowedJobTypes.includes(
        actor.management.jobFocus,
      )
    ) {
      actor.management.jobFocus = Object.entries(townState.workPriorities)
        .filter(([, priority]) => priority > 0)
        .sort((left, right) => right[1] - left[1])[0]?.[0];
      actor.management.workPriority =
        townState.workPriorities[actor.management.jobFocus] ?? 0;
    }
    townState.workState ??= "available";
    townState.lastJobType ??= null;
    townState.completedJobTypes ??= [];
    townState.objective ??= "follow_leader";
    townState.currentAction ??= "Following the party leader";
    townState.actionReason ??= "party_order";
    townState.discoveries ??= [];
    townState.life ??= createLifeState(actor.id, "player_directed");
  }
  value.village.modifications ??= [];
  value.village.looseMaterials ??= [];
  value.village.constructionPrimitives ??= [];
  value.village.constructionMaterials ??= [];
  value.village.wantedLevel ??= 0;
  value.village.incidents ??= [];
  value.village.jobs ??= [];
  value.village.reservations ??= [];
  for (const job of value.village.jobs) {
    job.scope ??= "village";
    job.retryCount ??= 0;
    job.nextRetryAtTick ??= null;
    for (const input of job.production?.inputs ?? []) {
      const source = value.village.stockpiles?.find(
        (stockpile) => stockpile.id === input.stockpileId,
      );
      if (!source) continue;
      input.itemKind ??= source.itemKind;
      input.name ??= source.name;
      input.position ??= { ...source.position };
      input.requiresPickup ??=
        value.village.scenario === "founding" &&
        source.itemKind !== "labor_credit";
      input.carriedQuantity ??= 0;
    }
  }
  const stockpileDefaults =
    value.village.scenario === "founding"
      ? createFoundingStockpiles(value.id)
      : createVillageStockpiles(value.id);
  const loadedStockpiles = value.village.stockpiles ?? [];
  value.village.stockpiles = stockpileDefaults.map((fallback) => {
    const existing = loadedStockpiles.find(
      (stockpile) =>
        stockpile.key === fallback.key ||
        (stockpile.itemKind === fallback.itemKind &&
          stockpile.containerKind === fallback.containerKind &&
          stockpile.position.x === fallback.position.x &&
          stockpile.position.y === fallback.position.y),
    );
    return existing
      ? {
          ...fallback,
          ...existing,
          capacity: Math.max(fallback.capacity, existing.capacity ?? 0),
          ...(fallback.key === "river_catch"
            ? { position: { ...fallback.position } }
            : {}),
          containerId: fallback.containerId,
        }
      : fallback;
  });
  const defaultKeys = new Set(stockpileDefaults.map((item) => item.key));
  value.village.stockpiles.push(
    ...loadedStockpiles.filter((item) => !defaultKeys.has(item.key)),
  );
  ensureVillageAnimals(value);
  const npcDefaults = createVillageNpcStates(value.id, value.village.scenario);
  value.village.npcStates ??= [];
  for (const fallback of npcDefaults)
    if (
      !value.village.npcStates.some(
        (candidate) => candidate.personKey === fallback.personKey,
      )
    )
      value.village.npcStates.push(fallback);
  for (const npc of value.village.npcStates) {
    npc.id ??= namedUuid(value.id, `townsperson:${npc.personKey}`);
    npc.name ??= npcDefaults.find(
      (candidate) => candidate.personKey === npc.personKey,
    )?.name;
    npc.actionReason ??= "personal_routine";
    npc.routeIndex ??= 0;
    const profile = villageWorkerProfile(
      npc.personKey,
      value.village.scenario === "founding",
    );
    npc.capabilityTags ??= profile.capabilityTags;
    npc.workPermissions ??= profile.workPermissions;
    npc.workPriorities ??= profile.workPriorities;
    npc.capabilityTags = [
      ...new Set([...npc.capabilityTags, ...profile.capabilityTags]),
    ];
    npc.workPermissions.allowedJobTypes = [
      ...new Set([
        ...npc.workPermissions.allowedJobTypes,
        ...profile.workPermissions.allowedJobTypes,
      ]),
    ];
    retireRemovedFoundingPermissions(npc, profile, value.village.scenario);
    npc.skills = { ...profile.skills, ...(npc.skills ?? {}) };
    npc.skillPriorities = {
      ...profile.skillPriorities,
      ...(npc.skillPriorities ?? {}),
    };
    npc.skillPractice ??= {};
    npc.workState ??= profile.workState;
    npc.lastJobType ??= profile.lastJobType;
    npc.risk ??= profile.risk;
    npc.carriedItem ??= null;
    npc.defenseEquipment ??= null;
    npc.life ??= createLifeState(npc.id, "autonomous");
  }
  ensureVillageHouseholds(value);
  ensureVillageDemography(value);
  syncResidentHousing(value);
  ensureFoundingSleepingPlaces(value);
  for (const toolKind of ["hand_axe", "field_shovel"])
    if (!value.hero.inventory.some((item) => item.kind === toolKind))
      value.hero.inventory.push(equipmentItem(newInstanceId(), toolKind));
  value.village.doors ??= value.village.buildings.map((building) => ({
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
  const existingVillageDoors = [...value.village.doors],
    buildingDoors = value.village.buildings.map((building) => {
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
    }),
    normalizedById = new Map(buildingDoors.map((door) => [door.id, door])),
    existingDoorIds = new Set(existingVillageDoors.map((door) => door.id)),
    normalizedExisting = existingVillageDoors.map(
      (door) => normalizedById.get(door.id) ?? door,
    ),
    missingBuildingDoors = buildingDoors.filter(
      (door) => !existingDoorIds.has(door.id),
    );
  value.village.doors = [...normalizedExisting, ...missingBuildingDoors];
  syncFoundingFacilityStructures(value);
  upgradeMissingConstructionRoofs(value);
  upgradeMissingHouseExits(value);
  const needsArchitectureMigration =
    value.village.rooms == null ||
    value.village.constructionHistory == null ||
    value.village.architectureDirty == null;
  value.village.rooms ??= [];
  value.village.constructionHistory ??= [];
  if (needsArchitectureMigration) {
    value.village.architectureDirty = true;
  }
  if (value.village.architectureDirty) deriveVillageArchitecture(value);
  syncResidentHousing(value);
  ensureVillageFoodSystem(value);
  ensureVillageTradeSystem(value);
  reconcileVillageStorage(value, (position) =>
    villageNpcTerrain(value, position),
  );
  ensureRegionalSimulation(value);
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
