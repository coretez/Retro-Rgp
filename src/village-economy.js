import { definitionId, namedUuid } from "./identity.js";

const BASE_STOCKPILES = [
  [
    "stable_smithy_supplies",
    "Smithy supply crates",
    "smithy_supplies",
    3,
    38,
    23,
    "cart",
  ],
  [
    "smithy_supplies",
    "Smithy working stock",
    "smithy_supplies",
    0,
    11,
    3,
    "forge",
    2,
    6,
  ],
  [
    "smithy_weapons",
    "Finished ash spears",
    "ash_spear",
    0,
    3,
    3,
    "counter",
    1,
    4,
    "smithy",
  ],
  [
    "apothecary_herbs",
    "Medicinal herbs",
    "medicinal_herbs",
    3,
    36,
    3,
    "fixture",
  ],
  [
    "apothecary_remedies",
    "Healing potions",
    "healing_potion",
    0,
    27,
    3,
    "counter",
    2,
    6,
    "apothecary",
  ],
  [
    "armorer_materials",
    "Armor fittings",
    "armor_fittings",
    3,
    34,
    16,
    "fixture",
  ],
  [
    "armorer_shields",
    "Reinforced shields",
    "reinforced_shield",
    0,
    24,
    16,
    "counter",
    1,
    4,
    "armorer",
  ],
  ["river_catch", "Fresh river fish", "raw_fish", 0, -1, 16, "fixture", 2, 4],
  ["inn_fish", "Inn fish pantry", "raw_fish", 0, -12, 4, "counter", 2, 4],
  ["inn_meals", "Prepared meals", "hearty_meal", 0, -12, 4, "counter", 2, 4],
  ["stable_feed", "Stable feed", "animal_feed", 3, 38, 23, "cart"],
  [
    "stable_care",
    "Prepared stalls",
    "prepared_stall",
    0,
    38,
    21,
    "fixture",
    1,
    2,
  ],
  [
    "message_log",
    "Delivered notices",
    "delivered_notice",
    0,
    21,
    10,
    "fixture",
    1,
    1,
  ],
];

const STARTING_SHOP_STOCK = {
  smithy: [
    "iron_mace",
    "longsword",
    "battleaxe",
    "warhammer",
    "hand_axe",
    "field_shovel",
    "shortbow",
  ],
  armorer: ["mage_robes", "chain_shirt", "scale_mail"],
};

const SHOP_COUNTERS = {
  smithy: { x: 3, y: 3 },
  apothecary: { x: 27, y: 3 },
  armorer: { x: 24, y: 16 },
};

function stockpileDefinition(values) {
  const [
    key,
    name,
    itemKind,
    quantity,
    x,
    y,
    containerKind,
    threshold,
    capacity,
    shopKey,
  ] = values;
  return {
    key,
    name,
    itemKind,
    quantity,
    position: { x, y },
    containerKind,
    threshold: threshold ?? 0,
    capacity: capacity ?? Math.max(quantity, 6),
    shopKey: shopKey ?? null,
  };
}

function startingShopDefinitions() {
  return Object.entries(STARTING_SHOP_STOCK).flatMap(([shopKey, goods]) =>
    goods.map((itemKind) => {
      const position = SHOP_COUNTERS[shopKey];
      return {
        key: `${shopKey}_${itemKind}`,
        name: `${itemKind.replaceAll("_", " ")} stock`,
        itemKind,
        quantity: 1,
        position: { ...position },
        containerKind: "counter",
        threshold: 0,
        capacity: 4,
        shopKey,
      };
    }),
  );
}

export const VILLAGE_STOCKPILE_DEFINITIONS = Object.freeze([
  ...BASE_STOCKPILES.map(stockpileDefinition),
  ...startingShopDefinitions(),
]);

export const RESIDENT_JOB_TEMPLATES = Object.freeze([
  {
    jobType: "craft_weapon",
    name: "Forge ash spear",
    personKey: "smith",
    capability: "forge",
    priority: 60,
    targetPosition: { x: 11, y: 3 },
    inputKey: "smithy_supplies",
    outputKey: "smithy_weapons",
    duration: 3,
  },
  {
    jobType: "brew_remedy",
    name: "Brew healing potion",
    personKey: "herbalist",
    capability: "brew",
    priority: 70,
    targetPosition: { x: 29, y: 7 },
    inputKey: "apothecary_herbs",
    outputKey: "apothecary_remedies",
    duration: 2,
  },
  {
    jobType: "craft_armor",
    name: "Fit reinforced shield",
    personKey: "armorer",
    capability: "armorcraft",
    priority: 60,
    targetPosition: { x: 26, y: 20 },
    inputKey: "armorer_materials",
    outputKey: "armorer_shields",
    duration: 3,
  },
  {
    jobType: "prepare_meal",
    name: "Prepare fish stew",
    personKey: "innkeeper",
    capability: "cook",
    priority: 55,
    targetPosition: { x: -12, y: 4 },
    inputKey: "inn_fish",
    outputKey: "inn_meals",
    duration: 2,
  },
  {
    jobType: "catch_fish",
    name: "Fish the river",
    personKey: "fisher",
    capability: "fish",
    priority: 45,
    targetPosition: { x: -1, y: 16 },
    outputKey: "river_catch",
    duration: 2,
  },
  {
    jobType: "haul_stock",
    name: "Carry fish to the inn",
    personKey: "porter",
    capability: "haul",
    priority: 50,
    sourceKey: "river_catch",
    outputKey: "inn_fish",
    accessPosition: { x: -8, y: 10 },
    duration: 2,
  },
  {
    jobType: "tend_stable",
    name: "Prepare the horse stalls",
    personKey: "hostler",
    capability: "stablecare",
    priority: 65,
    targetPosition: { x: 38, y: 21 },
    inputKey: "stable_feed",
    outputKey: "stable_care",
    duration: 2,
  },
  {
    jobType: "deliver_message",
    name: "Post the town notices",
    personKey: "child",
    capability: "message",
    priority: 30,
    targetPosition: { x: 7, y: 10 },
    outputKey: "message_log",
    duration: 1,
  },
]);

export const SHOP_PROPRIETORS = Object.freeze({
  smithy: "smith",
  apothecary: "herbalist",
  armorer: "armorer",
});

export function createVillageStockpiles(runId) {
  return VILLAGE_STOCKPILE_DEFINITIONS.map((definition) => ({
    id: namedUuid(runId, `stockpile:${definition.key}`),
    definitionId: definitionId("stockpile", definition.key),
    entityType: "stockpile",
    ...structuredClone(definition),
    containerId: namedUuid(
      runId,
      `village-object:${definition.containerKind}:${definition.position.x},${definition.position.y}`,
    ),
  }));
}

export function stockpileByKey(state, key) {
  return state.village.stockpiles.find((stockpile) => stockpile.key === key);
}

export function shopStock(state, shopKey, itemKind) {
  return state.village.stockpiles.find(
    (stockpile) =>
      stockpile.shopKey === shopKey && stockpile.itemKind === itemKind,
  );
}
