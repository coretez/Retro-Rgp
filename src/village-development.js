import { definitionId, namedUuid } from "./identity.js";
import {
  releaseJobReservations,
  restoreJobTransfer,
  transitionJob,
} from "./job-board.js";
import {
  createFarmsteadPasture,
  FARMSTEAD_PASTURE,
} from "./village-animals.js";
import {
  FOUNDER_HOUSE_PLOTS,
  SPECIALIST_FACILITY_PLANS,
} from "./village-architecture.js";
import {
  SAW_BATCH_UNITS,
  TREE_WOOD_YIELDS,
  WOOD_BUILD_COSTS,
} from "./village-materials.js";
import {
  regionalGround,
  regionalHydrology,
  regionalSourceCatalog,
  regionalTrailAt,
  selectRegionalFoundingSite,
  VILLAGE_REGION,
  VILLAGE_REGION_GENERATION_VERSION,
} from "./village-region.js";

function breedingTemplate(species, name, priority, x) {
  return {
    jobType: `breed_${species}`,
    name: `Tend the breeding ${name}`,
    personKey: "herder",
    capability: "husbandry",
    skill: "animal_husbandry",
    priority,
    targetPosition: { x, y: 24 },
    animalSpecies: species,
    minimumAnimals: 2,
    animalEffect: "breed",
    duration: 4,
  };
}

function relocationTemplate(species, name, priority) {
  return {
    jobType: `relocate_${species}`,
    name: `Lead ${name} to permanent housing`,
    personKey: "herder",
    capability: "husbandry",
    skill: "animal_husbandry",
    priority,
    targetPosition: { x: -20, y: 24 },
    animalSpecies: species,
    animalEffect: "relocate",
    duration: 2,
  };
}

function treatmentTemplate(species, priority) {
  return {
    jobType: `treat_sick_${species}`,
    name: `Treat sick ${species.replaceAll("_", " ")}`,
    personKey: "herder",
    capability: "husbandry",
    skill: "animal_husbandry",
    priority,
    targetPosition: { x: -31, y: 25 },
    animalSpecies: species,
    animalEffect: "treat",
    inputKey: "apothecary_remedies",
    inputQuantity: 1,
    duration: 3,
  };
}

export const DEVELOPMENT_JOB_TEMPLATES = Object.freeze([
  {
    jobType: "build_campfire",
    name: "Establish the founding campfire",
    personKey: "innkeeper",
    capability: "build_fire",
    skill: "survival",
    priority: 145,
    targetPosition: { x: -14, y: 18 },
    facilityKey: "survival_camp",
    duration: 1,
  },
  {
    jobType: "fell_tree",
    name: "Fell a timber tree",
    personKey: "woodcutter",
    capability: "forestry",
    skill: "forestry",
    priority: 95,
    outputKey: "lumber_camp_logs",
    outputQuantity: TREE_WOOD_YIELDS.pine,
    requirementKey: "founding_axes",
    duration: 3,
  },
  {
    jobType: "remote_fell_tree",
    name: "Fell timber in the regional woodland",
    personKey: "woodcutter",
    capability: "forestry",
    skill: "forestry",
    priority: 92,
    outputKey: "lumber_camp_logs",
    outputQuantity: TREE_WOOD_YIELDS.pine,
    requirementKey: "founding_axes",
    duration: 3,
  },
  {
    jobType: "clear_building_site",
    name: "Clear an approved building site",
    personKey: "woodcutter",
    capability: "forestry",
    skill: "forestry",
    priority: 109,
    outputKey: "lumber_camp_logs",
    outputQuantity: TREE_WOOD_YIELDS.pine,
    ignoreOutputThreshold: true,
    requirementKey: "founding_axes",
    duration: 3,
  },
  {
    jobType: "clear_field_tree",
    name: "Clear trees for a new field",
    personKey: "woodcutter",
    capability: "forestry",
    skill: "forestry",
    priority: 107,
    outputKey: "lumber_camp_logs",
    outputQuantity: TREE_WOOD_YIELDS.pine,
    ignoreOutputThreshold: true,
    requirementKey: "founding_axes",
    duration: 3,
  },
  {
    jobType: "build_lumber_yard",
    name: "Build the lumber yard",
    personKey: "farmer",
    capability: "build",
    skill: "construction",
    priority: 100,
    targetPosition: { x: -22, y: 18 },
    inputKey: "lumber_camp_logs",
    inputQuantity: 4,
    requirementKey: "founding_hammers",
    outputKey: "lumber_yard_project",
    facilityKey: "lumber_yard",
    duration: 4,
  },
  {
    jobType: "saw_lumber",
    name: "Saw logs into building lumber",
    personKey: "woodcutter",
    capability: "saw",
    skill: "carpentry",
    priority: 105,
    targetPosition: { x: -23, y: 18 },
    inputKey: "lumber_camp_logs",
    inputQuantity: SAW_BATCH_UNITS,
    requirementKey: "founding_saws",
    outputKey: "lumber_yard_lumber",
    outputQuantity: SAW_BATCH_UNITS,
    duration: 1,
  },
  {
    jobType: "prospect_rock",
    name: "Prospect the surveyed rocky ridge",
    personKey: "carter",
    capability: "inspect",
    skill: "observation",
    priority: 82,
    duration: 4,
  },
  {
    jobType: "quarry_stone",
    name: "Quarry finite building stone",
    personKey: "woodcutter",
    capability: "quarry",
    skill: "mining",
    priority: 115,
    requirementKey: "founding_pickaxes",
    outputKey: "quarry_stone",
    outputQuantity: 3,
    duration: 6,
  },
  {
    jobType: "prospect_ore",
    name: "Prospect a remote rock face",
    personKey: "carter",
    capability: "inspect",
    skill: "observation",
    priority: 116,
    duration: 4,
  },
  {
    jobType: "mine_ore",
    name: "Mine a finite ore vein",
    personKey: "woodcutter",
    capability: "quarry",
    skill: "mining",
    priority: 117,
    requirementKey: "founding_pickaxes",
    outputKey: "mine_iron_ore",
    outputQuantity: 3,
    duration: 6,
  },
  {
    jobType: "build_field_camp",
    name: "Build a regional field camp",
    personKey: "farmer",
    capability: "build",
    skill: "construction",
    priority: 118,
    inputKey: "lumber_yard_lumber",
    requirementKey: "founding_hammers",
    duration: 4,
  },
  {
    jobType: "supply_field_camp",
    name: "Supply a regional field camp",
    personKey: "carter",
    capability: "haul",
    skill: "logistics",
    priority: 119,
    inputKey: "inn_meals",
    duration: 1,
  },
  {
    jobType: "build_farmstead",
    name: "Establish the farmstead",
    personKey: "farmer",
    capability: "build",
    skill: "construction",
    priority: 100,
    targetPosition: { x: -26, y: 24 },
    inputKey: "lumber_yard_lumber",
    inputQuantity: 12,
    requirementKey: "founding_hammers",
    outputKey: "farmstead_project",
    facilityKey: "farmstead",
    duration: 5,
  },
  {
    jobType: "build_house",
    name: "Build a founder family house",
    personKey: "farmer",
    capability: "build",
    skill: "construction",
    priority: 102,
    targetPosition: { x: -22, y: 8 },
    inputKey: "lumber_yard_lumber",
    inputQuantity: 8,
    requirementKey: "founding_hammers",
    outputKey: "housing_project",
    outputQuantity: 1,
    duration: 8,
  },
  {
    jobType: "build_communal_kitchen",
    name: "Build the founders' inn kitchen",
    personKey: "farmer",
    capability: "build",
    skill: "construction",
    priority: 103,
    targetPosition: { x: 7, y: 24 },
    inputKey: "lumber_yard_lumber",
    inputQuantity: 8,
    requirementKey: "founding_hammers",
    facilityKey: "communal_kitchen",
    duration: 7,
  },
  {
    jobType: "build_specialist_facility",
    name: "Build an approved specialist facility",
    personKey: "farmer",
    capability: "build",
    skill: "construction",
    priority: 104,
    targetPosition: { x: 0, y: 0 },
    inputKey: "lumber_yard_lumber",
    inputQuantity: 1,
    duration: 8,
  },
  {
    jobType: "grow_grain",
    name: "Tend the grain field",
    personKey: "farmer",
    capability: "farm",
    skill: "farming",
    priority: 94,
    targetPosition: { x: -27, y: 24 },
    inputKey: "farm_seed",
    inputQuantity: 1,
    outputKey: "farm_grain",
    outputQuantity: 8,
    duration: 4,
  },
  {
    jobType: "grow_vegetables",
    name: "Tend the kitchen garden",
    personKey: "farmer",
    capability: "farm",
    skill: "farming",
    priority: 93,
    targetPosition: { x: -25, y: 24 },
    inputKey: "farm_seed",
    inputQuantity: 1,
    inputMinRemaining: 1,
    outputKey: "farm_vegetables",
    outputQuantity: 6,
    duration: 3,
  },
  {
    jobType: "hunt_game",
    name: "Hunt wild deer",
    personKey: "fisher",
    capability: "hunt",
    skill: "hunting",
    priority: 112,
    targetPosition: { x: -52, y: 31 },
    animalSpecies: "deer",
    minimumAnimals: 2,
    animalEffect: "hunt",
    requirementKey: "hunting_bows",
    outputKey: "pasture_meat",
    outputQuantity: 4,
    duration: 4,
  },
  {
    jobType: "remote_hunt_game",
    name: "Hunt the regional deer range",
    personKey: "fisher",
    capability: "hunt",
    skill: "hunting",
    priority: 108,
    targetPosition: { x: -52, y: 31 },
    animalSpecies: "deer",
    minimumAnimals: 2,
    animalEffect: "hunt",
    requirementKey: "hunting_bows",
    outputKey: "pasture_meat",
    outputQuantity: 4,
    duration: 4,
  },
  {
    jobType: "gather_wild_food",
    name: "Gather emergency wild food",
    personKey: "herbalist",
    capability: "forage",
    skill: "foraging",
    priority: 118,
    targetPosition: { x: -9, y: 13 },
    outputKey: "wild_forage",
    outputQuantity: 1,
    duration: 2,
  },
  {
    jobType: "save_seed",
    name: "Reserve grain for seed",
    personKey: "farmer",
    capability: "farm",
    skill: "farming",
    priority: 96,
    targetPosition: { x: -26, y: 24 },
    inputKey: "farm_grain",
    inputQuantity: 1,
    outputKey: "farm_seed",
    outputQuantity: 1,
    duration: 1,
  },
  {
    jobType: "prepare_animal_feed",
    name: "Prepare winter animal feed",
    personKey: "herder",
    capability: "husbandry",
    skill: "animal_husbandry",
    priority: 100,
    targetPosition: { x: -31, y: 25 },
    inputKey: "farm_grain",
    inputQuantity: 2,
    inputMinRemaining: 6,
    outputKey: "stable_feed",
    outputQuantity: 10,
    duration: 2,
  },
  {
    jobType: "prepare_emergency_fodder",
    name: "Mix gathered forage into emergency fodder",
    personKey: "herder",
    capability: "husbandry",
    skill: "animal_husbandry",
    priority: 123,
    targetPosition: { x: -31, y: 25 },
    inputKey: "wild_forage",
    inputQuantity: 2,
    outputKey: "stable_feed",
    outputQuantity: 8,
    duration: 2,
  },
  {
    jobType: "draw_stable_water",
    name: "Draw river water for the animal troughs",
    personKey: "herder",
    capability: "husbandry",
    skill: "animal_husbandry",
    priority: 104,
    targetPosition: { x: 0, y: 16 },
    outputKey: "stable_water",
    outputQuantity: 20,
    duration: 3,
  },
  relocationTemplate("pig", "a pig", 114),
  relocationTemplate("sheep", "a sheep", 113),
  relocationTemplate("chicken", "a chicken", 112),
  relocationTemplate("dog", "a dog", 111),
  relocationTemplate("cow", "cattle", 115),
  treatmentTemplate("cow", 121),
  treatmentTemplate("pig", 120),
  treatmentTemplate("sheep", 120),
  treatmentTemplate("chicken", 119),
  treatmentTemplate("dog", 119),
  {
    jobType: "breed_cattle",
    name: "Tend the breeding herd",
    personKey: "herder",
    capability: "husbandry",
    skill: "animal_husbandry",
    priority: 92,
    targetPosition: { x: -20, y: 24 },
    animalSpecies: "cow",
    minimumAnimals: 2,
    animalEffect: "breed",
    duration: 5,
  },
  breedingTemplate("pig", "pigs", 90, -18),
  breedingTemplate("sheep", "sheep", 89, -17),
  breedingTemplate("dog", "dogs", 86, -8),
  breedingTemplate("chicken", "chickens", 87, -15),
  {
    jobType: "milk_cattle",
    name: "Milk the pasture herd",
    personKey: "herder",
    capability: "husbandry",
    skill: "animal_husbandry",
    priority: 91,
    targetPosition: { x: -19, y: 24 },
    animalSpecies: "cow",
    minimumAnimals: 1,
    animalEffect: "milk",
    outputKey: "dairy_milk",
    outputQuantity: 2,
    duration: 2,
  },
  {
    jobType: "collect_eggs",
    name: "Collect eggs from the chicken coop",
    personKey: "herder",
    capability: "husbandry",
    skill: "animal_husbandry",
    priority: 90,
    targetPosition: { x: -68, y: 51 },
    animalSpecies: "chicken",
    animalEffect: "eggs",
    outputKey: "farm_eggs",
    outputQuantity: 2,
    duration: 1,
  },
  {
    jobType: "shear_sheep",
    name: "Shear one mature sheep",
    personKey: "herder",
    capability: "husbandry",
    skill: "animal_husbandry",
    priority: 89,
    targetPosition: { x: -55, y: 41 },
    animalSpecies: "sheep",
    animalEffect: "wool",
    outputKey: "sheep_wool",
    outputQuantity: 2,
    duration: 3,
  },
  {
    jobType: "collect_manure",
    name: "Collect manure from the cattle pasture",
    personKey: "herder",
    capability: "husbandry",
    skill: "animal_husbandry",
    priority: 84,
    targetPosition: { x: -20, y: 24 },
    animalSpecies: "cow",
    animalEffect: "manure",
    outputKey: "farm_manure",
    outputQuantity: 2,
    duration: 2,
  },
  {
    jobType: "fertilize_fields",
    name: "Spread composted manure on a fallow field",
    personKey: "farmer",
    capability: "farm",
    skill: "farming",
    priority: 97,
    targetPosition: { x: -43, y: 27 },
    inputKey: "farm_manure",
    inputQuantity: 1,
    duration: 2,
  },
  {
    jobType: "water_fields",
    name: "Carry water to a dry crop field",
    personKey: "farmer",
    capability: "farm",
    skill: "farming",
    priority: 99,
    targetPosition: { x: -43, y: 27 },
    inputKey: "stable_water",
    inputQuantity: 1,
    duration: 2,
  },
  {
    jobType: "treat_crop_disease",
    name: "Treat a diseased crop field",
    personKey: "farmer",
    capability: "farm",
    skill: "farming",
    priority: 101,
    targetPosition: { x: -43, y: 27 },
    inputKey: "apothecary_herbs",
    inputQuantity: 1,
    duration: 2,
  },
  {
    jobType: "slaughter_cattle",
    name: "Cull one animal for meat",
    personKey: "herder",
    capability: "butcher",
    skill: "butchery",
    priority: 88,
    targetPosition: { x: -21, y: 24 },
    animalSpecies: "cow",
    minimumAnimals: 3,
    animalEffect: "slaughter",
    outputKey: "pasture_meat",
    outputQuantity: 3,
    duration: 3,
  },
]);

const PROJECTS = Object.freeze([
  ["lumber_yard", "Establish a lumber yard", [], 4],
  ["farmstead", "Establish farms and pasture", ["lumber_yard"], 12],
  ["housing", "Build resident homes", ["lumber_yard"], 8],
  ["communal_kitchen", "Build a communal kitchen", ["farmstead"], 6],
]);

const PROJECT_PROPOSALS = Object.freeze({
  lumber_yard: Object.freeze({
    requesterPersonKey: "woodcutter",
    operatorPersonKey: "woodcutter",
    facilityType: "lumber_yard",
    reason: "Stonebridge needs local logs and building lumber.",
    lumberBudget: 230,
    laborUnits: 430,
  }),
  farmstead: Object.freeze({
    requesterPersonKey: "farmer",
    stakeholderPersonKeys: Object.freeze(["herder"]),
    operatorPersonKey: "farmer",
    facilityType: "integrated_farm",
    reason:
      "The founders need crop fields, seed security, pasture, and livestock care.",
    lumberBudget: 450,
    laborUnits: 6500,
  }),
  housing: Object.freeze({
    requesterPersonKey: "reeve",
    operatorPersonKey: null,
    facilityType: "family_housing",
    reason: "Founding households need permanent beds and shelter.",
    lumberBudget: 1600,
    laborUnits: 3000,
  }),
  communal_kitchen: Object.freeze({
    requesterPersonKey: "innkeeper",
    operatorPersonKey: "innkeeper",
    facilityType: "communal_kitchen",
    reason: "Stored farm output needs a sheltered place for meal production.",
    lumberBudget: 278,
    laborUnits: 526,
  }),
});

export const SPECIALIST_PROPOSAL_DEFINITIONS = Object.freeze({
  specialist_fishing_hut: Object.freeze({
    name: "Build a fishing hut and net loft",
    requesterPersonKey: "fisher",
    operatorPersonKey: "fisher",
    facilityType: "fishing_hut",
    reason:
      "The settlement needs dependable river harvests beyond hook fishing.",
    expectedBenefit:
      "Produces reusable fishing nets and increases each successful river harvest.",
    lumberBudget: 260,
    laborUnits: 9000,
    acceptableDelayTicks: 600,
    rejectionConsequence:
      "The village remains dependent on low-yield pole fishing.",
    satisfiedByBuildings: Object.freeze(["fishing_hut"]),
    requirements: Object.freeze({
      rooms: Object.freeze(["covered net loft", "fish preparation room"]),
      fixtures: Object.freeze(["netting bench", "net rack", "cleaning table"]),
      storage: Object.freeze(["fiber store", "fresh catch bins"]),
      utilities: Object.freeze(["river access", "cleaning water"]),
      access: Object.freeze(["walkable river bank", "food-hauling path"]),
      safety: Object.freeze(["non-slip landing", "two exits"]),
      inputs: Object.freeze(["netting fiber", "fisher labor"]),
      outputs: Object.freeze(["fishing nets", "fresh fish"]),
      staffing: Object.freeze(["one fisher and net maker"]),
    }),
  }),
  specialist_forge: Object.freeze({
    name: "Build a forge and smithy",
    requesterPersonKey: "smith",
    operatorPersonKey: "smith",
    facilityType: "forge",
    reason:
      "Tool, repair, and metalwork demand requires a safe dedicated forge.",
    expectedBenefit:
      "Local tools, hardware, repairs, and weapons for farming, transport, and defense.",
    lumberBudget: 30,
    stoneBudget: 600,
    laborUnits: 15000,
    acceptableDelayTicks: 1200,
    rejectionConsequence:
      "Tool shortages and outside repair dependence continue.",
    satisfiedByBuildings: Object.freeze(["smithy"]),
    requirements: Object.freeze({
      rooms: Object.freeze(["fire-safe smithy workroom"]),
      fixtures: Object.freeze(["forge", "anvil", "workbench"]),
      storage: Object.freeze([
        "fuel store",
        "raw metal store",
        "finished goods rack",
      ]),
      utilities: Object.freeze(["ventilation", "water for quenching"]),
      access: Object.freeze(["road delivery", "safe customer space"]),
      safety: Object.freeze(["chimney", "fire clearance from homes"]),
      inputs: Object.freeze(["fuel", "metal", "repair work"]),
      outputs: Object.freeze(["tools", "hardware", "weapons", "repairs"]),
      staffing: Object.freeze(["one qualified smith"]),
    }),
  }),
  specialist_mill: Object.freeze({
    name: "Build a grain mill",
    requesterPersonKey: "miller",
    operatorPersonKey: "miller",
    facilityType: "mill",
    reason: "A dependable grain surplus now justifies local flour production.",
    expectedBenefit: "Turns protected grain into flour for efficient baking.",
    lumberBudget: 360,
    laborUnits: 14000,
    acceptableDelayTicks: 1600,
    rejectionConsequence:
      "Grain remains limited to less efficient meal recipes.",
    satisfiedByBuildings: Object.freeze(["mill"]),
    requirements: Object.freeze({
      rooms: Object.freeze(["milling floor", "dry grain room"]),
      fixtures: Object.freeze(["millstones", "hopper", "sifting table"]),
      storage: Object.freeze(["grain bins", "flour bins"]),
      utilities: Object.freeze(["water, wind, or animal power"]),
      access: Object.freeze(["cart unloading", "bakery delivery route"]),
      safety: Object.freeze(["dust ventilation", "guarded machinery"]),
      inputs: Object.freeze(["grain", "motive power"]),
      outputs: Object.freeze(["flour"]),
      staffing: Object.freeze(["one miller"]),
    }),
  }),
  specialist_bakery: Object.freeze({
    name: "Build a village bakery",
    requesterPersonKey: "baker",
    operatorPersonKey: "baker",
    facilityType: "bakery",
    reason:
      "Meal demand and grain supply justify a dedicated bread production chain.",
    expectedBenefit:
      "Produces durable bread and prepared food at village scale.",
    lumberBudget: 300,
    laborUnits: 14000,
    acceptableDelayTicks: 1200,
    rejectionConsequence:
      "The common kitchen remains the only meal bottleneck.",
    satisfiedByBuildings: Object.freeze(["bakery"]),
    requirements: Object.freeze({
      rooms: Object.freeze(["bakehouse", "clean preparation room"]),
      fixtures: Object.freeze(["oven", "preparation table", "cooling rack"]),
      storage: Object.freeze(["flour store", "fuel store", "bread store"]),
      utilities: Object.freeze(["clean water", "chimney"]),
      access: Object.freeze(["mill delivery", "market delivery"]),
      safety: Object.freeze(["fire clearance", "sanitation"]),
      inputs: Object.freeze(["flour", "water", "fuel"]),
      outputs: Object.freeze(["bread", "durable meals"]),
      staffing: Object.freeze(["one baker"]),
    }),
  }),
  specialist_infirmary: Object.freeze({
    name: "Build an infirmary and apothecary",
    requesterPersonKey: "herbalist",
    operatorPersonKey: "herbalist",
    facilityType: "infirmary",
    reason: "Sustained injuries require clean beds and protected medical work.",
    expectedBenefit:
      "Safer treatment, medicine storage, and recovery capacity.",
    lumberBudget: 280,
    laborUnits: 14000,
    acceptableDelayTicks: 600,
    rejectionConsequence:
      "Wounded residents continue receiving improvised care.",
    satisfiedByBuildings: Object.freeze(["apothecary", "infirmary"]),
    requirements: Object.freeze({
      rooms: Object.freeze(["clean treatment room", "recovery room"]),
      fixtures: Object.freeze(["treatment table", "recovery beds"]),
      storage: Object.freeze(["medicine cabinet", "linen store"]),
      utilities: Object.freeze(["clean water", "heating"]),
      access: Object.freeze(["stretcher-safe entrance"]),
      safety: Object.freeze(["sanitation", "quiet separation"]),
      inputs: Object.freeze(["herbs", "linen", "clean water"]),
      outputs: Object.freeze(["remedies", "recovered patients"]),
      staffing: Object.freeze(["one healer"]),
    }),
  }),
  specialist_carpenter: Object.freeze({
    name: "Build a carpenter's workshop",
    requesterPersonKey: "woodcutter",
    operatorPersonKey: "woodcutter",
    facilityType: "carpenter_workshop",
    reason:
      "The construction queue needs a dedicated place for doors, furniture, carts, and storage fixtures.",
    expectedBenefit:
      "Faster production of reusable wooden building components.",
    lumberBudget: 300,
    laborUnits: 14000,
    acceptableDelayTicks: 1800,
    rejectionConsequence:
      "Builders continue shaping components at temporary sites.",
    satisfiedByBuildings: Object.freeze(["carpenter_workshop"]),
    requirements: Object.freeze({
      rooms: Object.freeze(["covered woodworking floor"]),
      fixtures: Object.freeze(["workbenches", "sawpit", "tool rack"]),
      storage: Object.freeze(["dry lumber racks", "component store"]),
      utilities: Object.freeze(["daylight", "weather cover"]),
      access: Object.freeze(["lumber yard route", "cart access"]),
      safety: Object.freeze(["sawdust control", "tool clearance"]),
      inputs: Object.freeze(["seasoned lumber"]),
      outputs: Object.freeze(["doors", "furniture", "carts", "fixtures"]),
      staffing: Object.freeze(["one carpenter", "apprentice space"]),
    }),
  }),
  specialist_granary: Object.freeze({
    name: "Build a protected granary",
    requesterPersonKey: "farmer",
    operatorPersonKey: "farmer",
    facilityType: "granary",
    reason: "The harvest now exceeds safe temporary grain and seed storage.",
    expectedBenefit: "Protects food and seed while feeding the mill reliably.",
    lumberBudget: 300,
    laborUnits: 14000,
    acceptableDelayTicks: 900,
    rejectionConsequence:
      "Harvest and seed remain exposed to spoilage and overflow.",
    satisfiedByBuildings: Object.freeze(["granary", "storehouse"]),
    requirements: Object.freeze({
      rooms: Object.freeze(["dry raised store"]),
      fixtures: Object.freeze(["sealed bins", "inspection aisle"]),
      storage: Object.freeze(["grain cells", "protected seed cells"]),
      utilities: Object.freeze(["ventilation", "weatherproof roof"]),
      access: Object.freeze(["field carts", "mill route"]),
      safety: Object.freeze(["pest control", "fire separation"]),
      inputs: Object.freeze(["grain", "seed"]),
      outputs: Object.freeze(["protected grain", "protected seed"]),
      staffing: Object.freeze(["one storekeeper or farmer"]),
    }),
  }),
  specialist_inn: Object.freeze({
    name: "Expand a public inn and tavern",
    requesterPersonKey: "innkeeper",
    operatorPersonKey: "innkeeper",
    facilityType: "inn",
    reason:
      "Food surplus and stable housing can now support guests, trade, and a common room.",
    expectedBenefit:
      "Guest beds, meals, trade, social life, and caravan support.",
    lumberBudget: 540,
    laborUnits: 21000,
    acceptableDelayTicks: 2400,
    rejectionConsequence: "Visitors and village social life remain camp-bound.",
    satisfiedByBuildings: Object.freeze(["inn"]),
    requirements: Object.freeze({
      rooms: Object.freeze(["common room", "guest rooms", "kitchen"]),
      fixtures: Object.freeze(["hearth", "tables", "guest beds"]),
      storage: Object.freeze(["pantry", "drink store", "guest baggage"]),
      utilities: Object.freeze(["clean water", "sanitation", "heating"]),
      access: Object.freeze(["main road", "stable route"]),
      safety: Object.freeze(["fire exits", "night lighting"]),
      inputs: Object.freeze(["surplus meals", "drink", "linen"]),
      outputs: Object.freeze(["lodging", "hospitality", "trade"]),
      staffing: Object.freeze(["one innkeeper", "service labor"]),
    }),
  }),
  specialist_stable: Object.freeze({
    name: "Build a village stable",
    requesterPersonKey: "herder",
    operatorPersonKey: "herder",
    facilityType: "stable",
    reason:
      "Livestock, carts, and visiting caravans need sheltered animal care.",
    expectedBenefit:
      "Protects working animals, feed, tack, and merchant mounts.",
    lumberBudget: 600,
    laborUnits: 16000,
    acceptableDelayTicks: 1500,
    rejectionConsequence: "Animals and caravan mounts remain exposed.",
    satisfiedByBuildings: Object.freeze(["stable"]),
    requirements: Object.freeze({
      rooms: Object.freeze(["ventilated stable hall"]),
      fixtures: Object.freeze(["stalls", "tack rack", "feed bins"]),
      storage: Object.freeze(["feed store", "tack store"]),
      utilities: Object.freeze(["water", "drainage", "ventilation"]),
      access: Object.freeze(["pasture route", "cart road"]),
      safety: Object.freeze(["fire separation", "secure gates"]),
      inputs: Object.freeze(["feed", "bedding", "labor"]),
      outputs: Object.freeze(["sheltered livestock", "ready draft animals"]),
      staffing: Object.freeze(["one hostler or herder"]),
    }),
  }),
  security_watch_house: Object.freeze({
    name: "Build a watch house",
    requesterPersonKey: "watchman",
    operatorPersonKey: "watchman",
    facilityType: "watch_house",
    reason:
      "The expanding settlement needs a staffed duty point near its approaches.",
    expectedBenefit:
      "Provides guard equipment, alarms, records, and a reliable patrol start.",
    lumberBudget: 260,
    laborUnits: 12000,
    acceptableDelayTicks: 1200,
    rejectionConsequence:
      "The watch remains improvised around the outdoor muster point.",
    satisfiedByBuildings: Object.freeze(["watch_house"]),
    requirements: Object.freeze({
      rooms: Object.freeze(["watch duty room"]),
      fixtures: Object.freeze(["duty desk", "alarm bell", "watch bench"]),
      storage: Object.freeze(["guard equipment store"]),
      utilities: Object.freeze(["night lighting", "heating"]),
      access: Object.freeze(["muster route", "principal road"]),
      safety: Object.freeze(["two exits", "clear defensive sightline"]),
      inputs: Object.freeze(["guard labor", "equipment"]),
      outputs: Object.freeze(["patrol coverage", "incident response"]),
      staffing: Object.freeze(["one watch officer"]),
    }),
  }),
  security_armory: Object.freeze({
    name: "Build a village armory",
    requesterPersonKey: "watchman",
    operatorPersonKey: "watchman",
    facilityType: "armory",
    reason:
      "Weapons and protective gear need controlled storage near the watch.",
    expectedBenefit:
      "Keeps defensive equipment secure, counted, and ready to issue.",
    lumberBudget: 240,
    laborUnits: 11000,
    acceptableDelayTicks: 1600,
    rejectionConsequence:
      "Defensive equipment remains scattered in household storage.",
    satisfiedByBuildings: Object.freeze(["armory"]),
    requirements: Object.freeze({
      rooms: Object.freeze(["secure equipment room"]),
      fixtures: Object.freeze(["weapon racks", "armor racks", "issue desk"]),
      storage: Object.freeze(["locked equipment storage"]),
      utilities: Object.freeze(["dry ventilation"]),
      access: Object.freeze(["watch house route"]),
      safety: Object.freeze(["controlled door", "inventory records"]),
      inputs: Object.freeze(["weapons", "armor", "tools"]),
      outputs: Object.freeze(["issued defensive equipment"]),
      staffing: Object.freeze(["one accountable watch officer"]),
    }),
  }),
  security_training_yard: Object.freeze({
    name: "Build a training hall and yard",
    requesterPersonKey: "watchman",
    operatorPersonKey: "watchman",
    facilityType: "training_yard",
    reason:
      "Residents need a safe place to drill without blocking roads or work sites.",
    expectedBenefit:
      "Supports guard readiness and organized household defense.",
    lumberBudget: 300,
    laborUnits: 13000,
    acceptableDelayTicks: 2000,
    rejectionConsequence:
      "The town cannot safely practice coordinated defense.",
    satisfiedByBuildings: Object.freeze(["training_yard"]),
    requirements: Object.freeze({
      rooms: Object.freeze(["covered training hall", "drill space"]),
      fixtures: Object.freeze(["practice dummies", "weapon rack"]),
      storage: Object.freeze(["training equipment store"]),
      utilities: Object.freeze(["lighting", "water"]),
      access: Object.freeze(["watch house route", "clear assembly apron"]),
      safety: Object.freeze([
        "separation from homes",
        "controlled firing direction",
      ]),
      inputs: Object.freeze(["instructor labor", "training equipment"]),
      outputs: Object.freeze(["guard readiness", "militia drill"]),
      staffing: Object.freeze(["one watch instructor"]),
    }),
  }),
  security_gatehouse: Object.freeze({
    name: "Build the authorized east gatehouse",
    requesterPersonKey: "watchman",
    operatorPersonKey: "watchman",
    facilityType: "gatehouse",
    reason:
      "The authorized perimeter needs a controlled principal-road entrance.",
    expectedBenefit:
      "Controls entry without severing trade, farm, or quarry access.",
    lumberBudget: 320,
    laborUnits: 25000,
    acceptableDelayTicks: 1600,
    rejectionConsequence: "The perimeter remains open at its busiest approach.",
    satisfiedByBuildings: Object.freeze(["gatehouse"]),
    requirements: Object.freeze({
      rooms: Object.freeze(["covered gate watch room"]),
      fixtures: Object.freeze(["gate controls", "guard post", "alarm bell"]),
      storage: Object.freeze(["gate equipment storage"]),
      utilities: Object.freeze(["night lighting", "heating"]),
      access: Object.freeze(["principal road", "two-sided gate passage"]),
      safety: Object.freeze([
        "two exits",
        "controlled gate",
        "clear sightline",
      ]),
      inputs: Object.freeze(["guard labor", "authorized perimeter"]),
      outputs: Object.freeze(["controlled town access", "gate response"]),
      staffing: Object.freeze(["one watch officer"]),
    }),
  }),
});

export const STRATEGIC_BUILDING_OBJECTIVES = Object.freeze([
  "lumber_yard",
  "farmstead",
  "housing",
  "communal_kitchen",
  "fishing_hut",
  "granary",
  "stable",
  "mill",
  "forge",
  "carpenter_workshop",
  "bakery",
  "infirmary",
  "inn",
]);

const SPECIALIST_AUTONOMY_ORDER = Object.freeze([
  "specialist_fishing_hut",
  "specialist_granary",
  "specialist_forge",
  "specialist_stable",
  "specialist_mill",
  "specialist_carpenter",
  "specialist_bakery",
  "specialist_infirmary",
  "specialist_inn",
  "security_watch_house",
  "security_armory",
  "security_training_yard",
  "security_gatehouse",
]);

const PRIORITY_PROJECT = Object.freeze({
  lumber_infrastructure: "lumber_yard",
  food_security: "farmstead",
  housing: "housing",
  domestic_logistics: "communal_kitchen",
});

const FOUNDING_SPECIALIST_PROXIES = Object.freeze({
  smith: "woodcutter",
  miller: "farmer",
  baker: "innkeeper",
});

function specialistActor(state, personKey) {
  const direct = state.village.npcStates.find(
    (actor) => actor.personKey === personKey,
  );
  if (direct || state.village.scenario !== "founding") return direct ?? null;
  const proxyKey = FOUNDING_SPECIALIST_PROXIES[personKey];
  return (
    state.village.npcStates.find((actor) => actor.personKey === proxyKey) ??
    null
  );
}

function residentId(runId, personKey) {
  return personKey ? namedUuid(runId, `townsperson:${personKey}`) : null;
}

// function-length-exempt: template -- persisted proposal construction
function proposal(runId, projectEntry) {
  const [projectKey, projectName, dependencies, lumberRequired] = projectEntry,
    definition = PROJECT_PROPOSALS[projectKey];
  return {
    id: namedUuid(runId, `village-proposal:${projectKey}`),
    definitionId: definitionId("village-proposal", projectKey),
    entityType: "village-proposal",
    projectKey,
    proposalKind: "founding",
    proposalSeriesId: namedUuid(runId, `village-proposal-series:${projectKey}`),
    revision: 1,
    facilityType: definition.facilityType,
    name: projectName,
    status: "submitted",
    requesterPersonKey: definition.requesterPersonKey,
    requesterActorId: residentId(runId, definition.requesterPersonKey),
    stakeholderActorIds: (definition.stakeholderPersonKeys ?? []).map((key) =>
      residentId(runId, key),
    ),
    intendedOperatorActorId: residentId(runId, definition.operatorPersonKey),
    intendedOperatorPersonKey: definition.operatorPersonKey,
    reason: definition.reason,
    dependencies: [...dependencies],
    requestedBudget: {
      materials: { lumber: definition.lumberBudget ?? lumberRequired },
      laborUnits: definition.laborUnits,
    },
    budgetVersion: 4,
    submittedAtTick: 0,
    latestDecisionId: null,
    commissionId: null,
    previousProposalId: null,
    supersededByProposalId: null,
  };
}

function createStrategyBoard(runId) {
  return {
    policy: "survival_and_growth",
    leaderActorId: residentId(runId, "reeve"),
    revision: 0,
    activeProposalId: null,
    activeCommissionId: null,
    proposalQueue: PROJECTS.map((entry) => proposal(runId, entry)),
    decisions: [],
    commissions: [],
  };
}

const FOUNDING_FIELD_ENCLOSURES = Object.freeze([
  Object.freeze({
    key: "grain_field_boundary",
    purpose: "field",
    cropKind: "grain",
    x: -55,
    y: 18,
    w: 10,
    h: 10,
    clearance: 2,
    gate: Object.freeze({ x: -46, y: 23 }),
    fenceMaterial: "timber",
  }),
  Object.freeze({
    key: "vegetable_field_boundary",
    purpose: "field",
    cropKind: "vegetables",
    x: -55,
    y: 34,
    w: 10,
    h: 10,
    clearance: 2,
    gate: Object.freeze({ x: -46, y: 39 }),
    fenceMaterial: "timber",
  }),
]);

function fieldCells(boundary) {
  const clearance = boundary.clearance ?? 0,
    cells = [];
  for (
    let y = boundary.y - clearance;
    y < boundary.y + boundary.h + clearance;
    y += 1
  )
    for (
      let x = boundary.x - clearance;
      x < boundary.x + boundary.w + clearance;
      x += 1
    )
      cells.push({ x, y });
  return cells;
}

function fieldCellIsUsable(seed, mode, origin, position) {
  const x = origin.x + position.x,
    y = origin.y + position.y;
  const water = regionalHydrology(seed, x, y, mode);
  return (
    !water.floodplain &&
    regionalGround(seed, x, y, mode) !== "rock" &&
    !regionalTrailAt(seed, x, y, mode)
  );
}

function fieldDoesNotOverlap(boundary, selected) {
  const occupied = new Set(
    selected
      .flatMap(fieldCells)
      .map((position) => `${position.x},${position.y}`),
  );
  return fieldCells(boundary).every(
    (position) => !occupied.has(`${position.x},${position.y}`),
  );
}

function fieldCandidates(template) {
  const candidates = [];
  for (let y = -40; y <= 88; y += 2)
    for (let x = -92; x <= 72; x += 2)
      candidates.push({
        ...structuredClone(template),
        x,
        y,
        gate: { ...template.gate, x: x + template.w - 1, y: y + 3 },
      });
  return candidates.sort(
    (left, right) =>
      Math.abs(left.x - template.x) +
      Math.abs(left.y - template.y) -
      Math.abs(right.x - template.x) -
      Math.abs(right.y - template.y),
  );
}

export function terrainAwareFoundingFields(seed, mode, regionalSite) {
  if (mode !== "regional_v3")
    return FOUNDING_FIELD_ENCLOSURES.map((area) => ({ ...area }));
  const selected = [];
  for (const template of FOUNDING_FIELD_ENCLOSURES) {
    const boundary = fieldCandidates(template).find(
      (candidate) =>
        fieldDoesNotOverlap(candidate, selected) &&
        fieldCells(candidate).every((position) =>
          fieldCellIsUsable(seed, mode, regionalSite.origin, position),
        ),
    );
    selected.push(boundary ?? structuredClone(template));
  }
  return selected;
}

export const FOUNDER_FACILITY_PLANS = Object.freeze({
  lumber_yard: Object.freeze({
    x: -34,
    y: 13,
    w: 10,
    h: 9,
    name: "Founders' lumber workshop",
    glyph: "L",
    door: Object.freeze({ x: -29, y: 13, material: "wood" }),
    floors: Object.freeze([
      Object.freeze({
        key: "yard_floor",
        x: -33,
        y: 14,
        width: 8,
        height: 7,
        material: "timber",
      }),
    ]),
    roofs: Object.freeze([
      Object.freeze({
        key: "yard_roof",
        x: -33,
        y: 14,
        width: 8,
        height: 7,
        material: "timber",
      }),
    ]),
    fixtures: Object.freeze([
      Object.freeze({
        key: "sawbench",
        role: "sawbench",
        x: -32,
        y: 15,
        width: 2,
        height: 1,
      }),
      Object.freeze({
        key: "tool_rack",
        role: "tool_rack",
        x: -27,
        y: 15,
        width: 2,
        height: 1,
      }),
      Object.freeze({
        key: "lumber_rack",
        role: "lumber_rack",
        x: -27,
        y: 17,
        width: 2,
        height: 1,
      }),
    ]),
  }),
  farmstead: Object.freeze({
    x: -34,
    y: 25,
    w: 12,
    h: 8,
    name: "Founders' farmstead barn",
    glyph: "F",
    door: Object.freeze({ x: -31, y: 25, material: "wood" }),
    secondaryDoors: Object.freeze([
      Object.freeze({ ...FARMSTEAD_PASTURE.barnAccess, material: "wood" }),
    ]),
    floors: Object.freeze([
      Object.freeze({
        key: "barn_floor",
        x: -33,
        y: 26,
        width: 10,
        height: 6,
        material: "timber",
      }),
    ]),
    roofs: Object.freeze([
      Object.freeze({
        key: "barn_roof",
        x: -33,
        y: 26,
        width: 10,
        height: 6,
        material: "timber",
      }),
    ]),
    storageArea: Object.freeze({
      x: -33,
      y: 27,
      width: 4,
      height: 5,
    }),
    fixtures: Object.freeze([
      Object.freeze({
        key: "barn_grain_bins",
        role: "grain_storage",
        x: -33,
        y: 27,
        width: 2,
        height: 2,
      }),
      Object.freeze({
        key: "barn_seed_bins",
        role: "seed_storage",
        x: -31,
        y: 27,
        width: 1,
        height: 2,
      }),
      Object.freeze({
        key: "barn_hay_loft",
        role: "fodder_storage",
        x: -33,
        y: 30,
        width: 3,
        height: 2,
      }),
      Object.freeze({
        key: "barn_produce_shelves",
        role: "produce_storage",
        x: -29,
        y: 27,
        width: 2,
        height: 2,
      }),
    ]),
    enclosures: Object.freeze([
      FARMSTEAD_PASTURE,
      ...FOUNDING_FIELD_ENCLOSURES,
    ]),
  }),
  communal_kitchen: Object.freeze({
    x: 1,
    y: 15,
    w: 14,
    h: 10,
    name: "Founders' inn kitchen",
    glyph: "I",
    door: Object.freeze({ x: 7, y: 24, material: "wood" }),
    floors: Object.freeze([
      Object.freeze({
        key: "inn_floor",
        x: 2,
        y: 16,
        width: 12,
        height: 8,
        material: "timber",
      }),
    ]),
    roofs: Object.freeze([
      Object.freeze({
        key: "inn_roof",
        x: 2,
        y: 16,
        width: 12,
        height: 8,
        material: "timber",
      }),
    ]),
    fixtures: Object.freeze([
      Object.freeze({
        key: "inn_hearth",
        role: "kitchen",
        x: 3,
        y: 17,
        width: 2,
        height: 2,
      }),
      Object.freeze({
        key: "inn_pantry",
        role: "storage",
        x: 11,
        y: 17,
        width: 2,
        height: 1,
      }),
      Object.freeze({
        key: "inn_table",
        role: "table",
        x: 7,
        y: 19,
        width: 2,
        height: 1,
      }),
    ]),
  }),
});

export function foundingFacilityPlan(key, fieldBoundaries = null) {
  const plan = FOUNDER_FACILITY_PLANS[key];
  const result = plan
    ? { key, ...structuredClone(plan), wallMaterial: "timber" }
    : null;
  if (key === "farmstead" && fieldBoundaries)
    result.enclosures = [
      result.enclosures[0],
      ...structuredClone(fieldBoundaries),
    ];
  return result;
}

export function selectedFoundingFacilityPlan(state, key) {
  return (
    state.village.development?.constructionSites?.find(
      (site) => site.key === key,
    ) ??
    foundingFacilityPlan(
      key,
      state.village.development?.masterPlan?.fieldBoundaries,
    )
  );
}

// function-length-exempt: template -- authored physical structure construction
export function ensureFoundingFacilityStructure(state, key) {
  const plan = selectedFoundingFacilityPlan(state, key);
  if (
    state.village.scenario !== "founding" ||
    !plan ||
    !state.village.facilities.includes(key)
  )
    return null;
  state.village.buildings ??= [];
  state.village.doors ??= [];
  const physicalProject = state.village.jobs?.find(
    (job) => job.plan?.facilityKey === key && job.plan?.construction,
  );
  if (physicalProject)
    return (
      state.village.buildings.find(
        (building) => building.key === physicalProject.plan.construction.key,
      ) ?? null
    );
  let building = state.village.buildings.find(
    (candidate) => candidate.key === key,
  );
  if (!building) {
    const primitiveBacked = state.village.constructionPrimitives?.some(
      (primitive) => primitive.projectKey === key,
    );
    building = {
      id: namedUuid(state.id, `building:${key}`),
      definitionId: definitionId("building", key),
      entityType: "building",
      ...plan,
      primitiveBacked,
    };
    state.village.buildings.push(building);
  }
  if (!state.village.doors.some((door) => door.buildingKey === key))
    state.village.doors.push({
      id: namedUuid(state.id, `door:${key}`),
      entityType: "door",
      buildingKey: key,
      ...building.door,
      state: "closed",
    });
  if (key === "farmstead") {
    state.village.pastures ??= [];
    let pasture = state.village.pastures.find(
      (candidate) => candidate.key === FARMSTEAD_PASTURE.key,
    );
    if (!pasture) {
      pasture = createFarmsteadPasture(
        state.id,
        plan.enclosures?.[0] ?? FARMSTEAD_PASTURE,
      );
      state.village.pastures.push(pasture);
    }
    for (const animal of (state.village.animals ?? []).filter(
      (candidate) => candidate.species === "cow",
    )) {
      animal.homePastureId = pasture.id;
      animal.status = "grazing";
    }
  }
  return building;
}

export function syncFoundingFacilityStructures(state) {
  for (const key of Object.keys(FOUNDER_FACILITY_PLANS))
    ensureFoundingFacilityStructure(state, key);
  return state.village.buildings;
}

// function-length-exempt: template -- settlement district zoning policy
const FOUNDING_DISTRICTS = Object.freeze([
  [
    "civic_common",
    "Civic common",
    -64,
    -32,
    128,
    96,
    ["civic", "common", "food_service"],
    ["heavy_industry", "livestock"],
  ],
  [
    "residential",
    "Household neighborhoods",
    -64,
    -32,
    128,
    96,
    ["housing", "gardens", "local_paths"],
    ["heavy_industry", "quarry", "cemetery"],
  ],
  [
    "food_agriculture",
    "Western food and agriculture belt",
    -128,
    0,
    192,
    96,
    ["fields", "pasture", "barn", "food_processing"],
    ["forge", "cemetery"],
  ],
  [
    "storage_logistics",
    "Protected storage and cart logistics",
    -96,
    -16,
    160,
    96,
    ["granary", "storehouse", "cart_yard"],
    ["housing", "cemetery"],
  ],
  [
    "industrial",
    "Craft and industrial access",
    -96,
    -32,
    192,
    96,
    ["lumber", "carpentry", "forge"],
    ["housing", "health"],
  ],
  [
    "hospitality",
    "Roadside hospitality",
    -32,
    0,
    128,
    96,
    ["inn", "market", "guest_stable"],
    ["quarry", "cemetery"],
  ],
  [
    "health",
    "Quiet health quarter",
    -32,
    -16,
    128,
    96,
    ["infirmary", "apothecary", "recovery_garden"],
    ["forge", "training"],
  ],
  [
    "military",
    "Watch and defensive approaches",
    -64,
    -32,
    192,
    96,
    ["watch", "armory", "training", "gatehouse"],
    ["childcare", "food_storage"],
  ],
  [
    "cemetery",
    "Downstream cemetery reserve",
    0,
    0,
    96,
    96,
    ["cemetery", "memorial"],
    ["well", "food", "housing"],
  ],
  [
    "expansion",
    "Future settlement expansion",
    -120,
    56,
    224,
    64,
    ["future_housing", "future_services", "roads"],
    ["permanent_extraction"],
  ],
]);

const FACILITY_PLANNING_RULES = Object.freeze({
  lumber_yard: {
    districtKey: "industrial",
    use: "lumber",
    route: ["farmstead_lane", 1],
    near: [],
  },
  farmstead: {
    districtKey: "food_agriculture",
    use: "barn",
    route: ["farm_cart_lane", 4],
    near: [],
  },
  communal_kitchen: {
    districtKey: "civic_common",
    use: "food_service",
    route: ["common_kitchen_lane", 1],
    near: [],
  },
  specialist_fishing_hut: {
    districtKey: "food_agriculture",
    use: "food_processing",
    route: ["farm_cart_lane", 4, 64],
    near: [],
  },
  specialist_granary: {
    districtKey: "storage_logistics",
    use: "granary",
    route: ["farm_cart_lane", 1],
    near: [
      ["farmstead", 24],
      ["specialist_mill", 32],
    ],
  },
  specialist_stable: {
    districtKey: "food_agriculture",
    use: "pasture",
    route: ["west_farm_lane", 2],
    near: [["farmstead", 48]],
  },
  specialist_mill: {
    districtKey: "food_agriculture",
    use: "food_processing",
    route: ["market_street", 4],
    near: [
      ["specialist_granary", 32],
      ["specialist_bakery", 20],
    ],
  },
  specialist_forge: {
    districtKey: "industrial",
    use: "forge",
    route: ["industrial_haul_lane", 1, 48],
    near: [],
  },
  specialist_carpenter: {
    districtKey: "industrial",
    use: "carpentry",
    route: ["farm_cart_lane", 4],
    near: [["lumber_yard", 18]],
  },
  specialist_bakery: {
    districtKey: "food_agriculture",
    use: "food_processing",
    route: ["food_processing_lane", 1],
    near: [["specialist_mill", 20]],
  },
  specialist_infirmary: {
    districtKey: "health",
    use: "infirmary",
    route: ["civic_service_lane", 4],
    near: [],
  },
  specialist_inn: {
    districtKey: "hospitality",
    use: "inn",
    route: ["inn_guest_lane", 1],
    near: [],
  },
  security_watch_house: {
    districtKey: "military",
    use: "watch",
    route: ["east_west_founders_road", 1],
    near: [],
  },
  security_armory: {
    districtKey: "military",
    use: "armory",
    route: ["east_west_founders_road", 1],
    near: [["security_watch_house", 16]],
  },
  security_training_yard: {
    districtKey: "military",
    use: "training",
    route: ["east_defense_lane", 4],
    near: [["security_watch_house", 24]],
  },
  security_gatehouse: {
    districtKey: "military",
    use: "gatehouse",
    route: ["east_gate_approach", 1, 40],
    near: [["security_watch_house", 32]],
  },
  civic_cemetery: {
    districtKey: "cemetery",
    use: "cemetery",
    route: ["civic_service_lane", 4],
    near: [],
  },
});

function plannedDistrict(
  runId,
  [key, name, x, y, width, height, allowedUses, discouragedUses],
) {
  return {
    id: namedUuid(runId, `master-plan-district:${key}`),
    key,
    name,
    area: { x, y, width, height },
    allowedUses: [...allowedUses],
    discouragedUses: [...discouragedUses],
  };
}

function plannedFieldClearing(runId, boundary) {
  return {
    id: namedUuid(runId, `field-clearing-survey:${boundary.key}`),
    definitionId: definitionId("field-clearing-survey", boundary.cropKind),
    entityType: "field-clearing-survey",
    boundaryKey: boundary.key,
    cropKind: boundary.cropKind,
    clearanceRadius: boundary.clearance ?? 2,
    clearancePurpose: "access_and_defensive_sightline",
    status: "planned",
    surveyedAtTick: null,
    clearedAtTick: null,
    treeCells: [],
    initialTreeCount: 0,
    clearedTreeCount: 0,
    estimatedLogYield: 0,
    clearedLogYield: 0,
    intendedUses: ["field_fencing", "village_construction_surplus"],
  };
}

function facilityDistrict(districts, plan) {
  return (
    districts.find(
      ({ area }) =>
        plan.x >= area.x &&
        plan.x < area.x + area.width &&
        plan.y >= area.y &&
        plan.y < area.y + area.height,
    )?.key ?? "regional_edge"
  );
}

function plannedFacility(key, plan, districts, phase) {
  const rule = FACILITY_PLANNING_RULES[key] ?? {};
  return {
    key,
    name: plan.name,
    phase,
    districtKey: rule.districtKey ?? facilityDistrict(districts, plan),
    plannedUse: rule.use ?? "general_service",
    serviceRelationships: (rule.near ?? []).map(
      ([facilityKey, maxDistance]) => ({
        facilityKey,
        maxDistance,
        reason: `${key} depends on practical access to ${facilityKey}`,
      }),
    ),
    serviceRoute: rule.route
      ? {
          routeKey: rule.route[0],
          maxDoorDistance: rule.route[1],
          maxSpurDistance: rule.route[2] ?? 8,
          reason: `${plan.name} requires direct cart and foot access`,
        }
      : null,
    status: key === "lumber_yard" ? "planned" : "future",
    site: {
      x: plan.x,
      y: plan.y,
      w: plan.w,
      h: plan.h,
      door: {
        ...(plan.door ?? {
          x: plan.x + Math.floor(plan.w / 2),
          y: plan.y + plan.h - 1,
        }),
      },
    },
  };
}

function foundingFacilityLayout(runId) {
  const districts = FOUNDING_DISTRICTS.map((entry) =>
      plannedDistrict(runId, entry),
    ),
    founding = Object.entries(FOUNDER_FACILITY_PLANS).map(([key, plan]) =>
      plannedFacility(key, plan, districts, "founding"),
    ),
    specialist = Object.entries(SPECIALIST_FACILITY_PLANS).map(([key, plan]) =>
      plannedFacility(key, plan, districts, "specialist"),
    ),
    cemetery = plannedFacility(
      "civic_cemetery",
      { name: "Founders' cemetery", x: 28, y: 36, w: 10, h: 6 },
      districts,
      "civic",
    );
  return { districts, facilities: [...founding, ...specialist, cemetery] };
}

function siteInsideDistrict(site, district) {
  const area = district?.area;
  return Boolean(
    area &&
    site.x >= area.x &&
    site.y >= area.y &&
    site.x + site.w <= area.x + area.width &&
    site.y + site.h <= area.y + area.height,
  );
}

function rectangleDistance(left, right) {
  const xGap = Math.max(
      0,
      left.x - (right.x + right.w),
      right.x - (left.x + left.w),
    ),
    yGap = Math.max(
      0,
      left.y - (right.y + right.h),
      right.y - (left.y + left.h),
    );
  return xGap + yGap;
}

function assessFacilityRelationships(masterPlan, facility, site) {
  return facility.serviceRelationships.map((relationship) => {
    const target = masterPlan.plannedFacilities.find(
        (candidate) => candidate.key === relationship.facilityKey,
      ),
      distance = target ? rectangleDistance(site, target.site) : Infinity;
    return {
      ...relationship,
      distance,
      satisfied: distance <= relationship.maxDistance,
    };
  });
}

function pointToAreaDistance(position, area) {
  const x = Math.max(area.x, Math.min(position.x, area.x + area.w - 1)),
    y = Math.max(area.y, Math.min(position.y, area.y + area.h - 1));
  return Math.abs(position.x - x) + Math.abs(position.y - y);
}

function assessFacilityRoute(masterPlan, facility, site) {
  const contract = facility.serviceRoute;
  if (!contract) return null;
  const route = masterPlan.spatialReservations?.roadCorridors?.find(
      (candidate) => candidate.key === contract.routeKey,
    ),
    distance = route ? pointToAreaDistance(site.door, route) : Infinity;
  return {
    ...contract,
    distance,
    direct: distance <= contract.maxDoorDistance,
    requiresSpur: distance > contract.maxDoorDistance,
    satisfied: distance <= contract.maxSpurDistance,
  };
}

function masterPlanSiteConflicts(
  facility,
  district,
  relationships,
  route,
  site,
) {
  const conflicts = [];
  if (!facility) conflicts.push("facility_not_in_master_plan");
  if (facility && !siteInsideDistrict(site, district))
    conflicts.push(`outside_${facility.districtKey}_district`);
  for (const relationship of relationships)
    if (!relationship.satisfied)
      conflicts.push(`service_distance:${relationship.facilityKey}`);
  if (route && !route.satisfied)
    conflicts.push(`route_access:${route.routeKey}`);
  return conflicts;
}

function masterPlanSiteReasons(facility, relationships, route) {
  const reasons = [
    facility
      ? `${facility.plannedUse} belongs in ${facility.districtKey}`
      : "facility is absent from the approved master plan",
  ];
  for (const entry of relationships)
    reasons.push(
      `${entry.distance} cells from ${entry.facilityKey} (maximum ${entry.maxDistance})`,
    );
  if (route)
    reasons.push(
      `${route.distance} cells from ${route.routeKey}; direct frontage ${route.maxDoorDistance}, maximum dirt spur ${route.maxSpurDistance}`,
    );
  return reasons;
}

export function assessSettlementMasterPlanSite(state, projectKey, site) {
  const masterPlan = state.village.development?.masterPlan,
    facility = masterPlan?.plannedFacilities.find(
      (candidate) => candidate.key === projectKey,
    ),
    district = masterPlan?.districts.find(
      (candidate) => candidate.key === facility?.districtKey,
    ),
    relationships = facility
      ? assessFacilityRelationships(masterPlan, facility, site)
      : [],
    route = facility ? assessFacilityRoute(masterPlan, facility, site) : null,
    conflicts = masterPlanSiteConflicts(
      facility,
      district,
      relationships,
      route,
      site,
    );
  return {
    valid: conflicts.length === 0,
    districtKey: facility?.districtKey ?? null,
    plannedUse: facility?.plannedUse ?? null,
    score:
      relationships.reduce((sum, entry) => sum + entry.distance, 0) +
      (route?.distance ?? 0) * 8,
    reasons: masterPlanSiteReasons(facility, relationships, route),
    conflicts,
    relationships,
    route,
  };
}

// function-length-exempt: template -- named settlement circulation reservations
function masterPlanSpatialReservations(layout, householdLots) {
  return {
    roadCorridors: [
      { key: "east_west_founders_road", x: -128, y: 10, w: 256, h: 2 },
      { key: "north_south_trade_road", x: -2, y: -128, w: 2, h: 256 },
      { key: "farm_cart_lane", x: -36, y: 10, w: 2, h: 43 },
      { key: "farmstead_lane", x: -29, y: 10, w: 2, h: 25 },
      { key: "west_farm_lane", x: -80, y: 39, w: 46, h: 2 },
      { key: "market_street", x: -1, y: 10, w: 3, h: 54 },
      { key: "civic_service_lane", x: 0, y: 38, w: 44, h: 2 },
      { key: "common_kitchen_lane", x: 7, y: 10, w: 2, h: 16 },
      { key: "food_processing_lane", x: -1, y: 38, w: 18, h: 2 },
      { key: "inn_guest_lane", x: 17, y: 38, w: 2, h: 17 },
      { key: "industrial_haul_lane", x: 24, y: 10, w: 2, h: 13 },
      { key: "east_defense_lane", x: 58, y: 8, w: 2, h: 22 },
      { key: "east_gate_approach", x: 58, y: 16, w: 38, h: 2 },
    ],
    accessSpurs: [],
    entrances: [
      { key: "east_trade_entrance", x: 96, y: 10 },
      { key: "west_farm_entrance", x: -96, y: 10 },
    ],
    cartTurningSpaces: [
      { key: "granary_cart_apron", x: -26, y: 28, w: 8, h: 8 },
      { key: "inn_cart_apron", x: 28, y: 42, w: 8, h: 8 },
    ],
    firebreaks: [
      {
        key: "forge_firebreak",
        aroundFacilityKey: "specialist_forge",
        radius: 4,
      },
      {
        key: "bakery_firebreak",
        aroundFacilityKey: "specialist_bakery",
        radius: 3,
      },
    ],
    utilities: [
      { key: "river_water_access", use: "water", protectedWidth: 2 },
      { key: "sanitation_downstream", use: "waste", districtKey: "cemetery" },
    ],
    defensiveApproaches: [
      { key: "east_gate_approach", districtKey: "military", clearWidth: 8 },
      {
        key: "river_bridge_approach",
        districtKey: "civic_common",
        clearWidth: 6,
      },
    ],
    futureLots: householdLots.map((lot) => ({ ...lot, w: 12, h: 10 })),
    buildingExpansion: layout.facilities.map((facility) => ({
      facilityKey: facility.key,
      clearance: facility.phase === "specialist" ? 3 : 2,
    })),
  };
}

const FOUNDING_HOLDING_SPECS = Object.freeze([
  Object.freeze({
    householdKey: "farmer",
    name: "Weiss-Voss crop holding",
    holdingType: "mixed_crop",
    dwellingSiteKey: "founder_house_farmer",
    inheritedCommons: Object.freeze([
      "grain_field_boundary",
      "vegetable_field_boundary",
    ]),
    animalSpecies: Object.freeze([]),
  }),
  Object.freeze({
    householdKey: "brand",
    name: "Brand-Venn livestock holding",
    holdingType: "large_livestock",
    dwellingSiteKey: "founder_house_brand",
    inheritedCommons: Object.freeze([]),
    animalSpecies: Object.freeze(["cow", "sheep", "dog"]),
  }),
  Object.freeze({
    householdKey: "woodcutter",
    name: "Holt-Eder woodland holding",
    holdingType: "woodland_small_stock",
    dwellingSiteKey: "founder_house_woodcutter",
    inheritedCommons: Object.freeze([]),
    animalSpecies: Object.freeze(["pig", "chicken"]),
  }),
]);

function householdHolding(runId, spec) {
  return {
    id: namedUuid(runId, `household-holding:${spec.householdKey}`),
    entityType: "household-holding-plan",
    ...structuredClone(spec),
    status: "deferred_until_all_founder_homes_habitable",
    boundaryStatus: "unsurveyed",
    detachedKitchen: {
      status: "future",
      wallMaterial: "stone",
      attachedToTimberHome: false,
      firebreak: 1,
    },
    boundaryUpgrade: {
      status: "future",
      profile: "low_stone_wall",
      material: "stone",
      heightFeet: 2.5,
      gateMaterial: "timber",
      gate: "masonry_town",
    },
  };
}

function foundingHouseholdHoldings(runId) {
  return FOUNDING_HOLDING_SPECS.map((spec) => householdHolding(runId, spec));
}

function settlementEvolutionPlan() {
  return {
    currentStage: "founding_village",
    stages: [
      { key: "founding_village", status: "active", gate: "survival" },
      { key: "family_hamlet", status: "pending", gate: "household_holdings" },
      {
        key: "masonry_town",
        status: "future",
        gate: "quarry_and_food_surplus",
      },
      { key: "city", status: "out_of_scope", gate: "future_design" },
    ],
    commonsTransition: "retain_until_replacement_housing_is_operational",
    roadPolicy: "dirt_first_stone_after_masonry_surplus",
    boundaryPolicy: {
      founding_village: "timber_rail",
      family_hamlet: "timber_rail",
      masonry_town: "low_stone_wall",
      replacementGate: "quarry_and_food_surplus",
      retainsWoodenGates: true,
    },
  };
}

// function-length-exempt: template -- named extraction and processing network
function foundingLogisticsNetwork(layout, sources) {
  const facility = (key) =>
      layout.facilities.find((candidate) => candidate.key === key)?.name,
    source = (key) => sources.find((candidate) => candidate.key === key);
  return {
    resourceWorks: [
      {
        key: "timber_camp",
        name: "Managed woodland timber camp",
        sourceKey: "managed_woodland_edge",
        placement: "forest_edge_outside_town",
        maxSourceDistance: 6,
        output: "logs",
      },
      {
        key: "quarry_works",
        name: "Stonebridge quarry and stonecutting yard",
        sourceKey: "unprospected_rocky_ridge",
        placement: "exposed_rock_face_outside_town",
        maxSourceDistance: 6,
        output: "cut_stone",
      },
    ],
    namedDestinations: [
      {
        key: "lumber_yard",
        name: facility("lumber_yard"),
        role: "logs_to_lumber",
      },
      {
        key: "granary",
        name: facility("specialist_granary"),
        role: "crop_storage",
      },
      {
        key: "mill",
        name: facility("specialist_mill"),
        role: "grain_to_flour",
      },
      {
        key: "bakery",
        name: facility("specialist_bakery"),
        role: "flour_to_bread",
      },
      {
        key: "forge",
        name: facility("specialist_forge"),
        role: "ore_and_fuel_to_metalwork",
      },
      {
        key: "inn",
        name: facility("specialist_inn"),
        role: "roadside_hospitality",
      },
      {
        key: "watch_house",
        name: facility("security_watch_house"),
        role: "guard_trade_approach",
      },
    ],
    flows: [
      {
        from: "managed_woodland_edge",
        through: "timber_camp",
        to: "lumber_yard",
        routeKey: "forest_haul_route",
      },
      {
        from: "unprospected_rocky_ridge",
        through: "quarry_works",
        to: "forge",
        routeKey: "stone_haul_route",
      },
      {
        from: "farmstead",
        through: "granary",
        to: "mill",
        routeKey: "farm_cart_lane",
      },
      {
        from: "mill",
        through: "bakery",
        to: "inn",
        routeKey: "food_processing_lane",
      },
    ],
    sourceAnchors: [
      source("managed_woodland_edge"),
      source("unprospected_rocky_ridge"),
    ].filter(Boolean),
  };
}

// function-length-exempt: template -- founding regional master-plan state
export function createFoundingMasterPlan(runId, seed, worldGeneration) {
  const regionalSite = selectRegionalFoundingSite(seed, worldGeneration);
  const surveyHub = worldGeneration?.startsWith("regional_")
    ? regionalSite.hub
    : { x: 0, y: 11 };
  const fieldBoundaries = terrainAwareFoundingFields(
      seed,
      worldGeneration,
      regionalSite,
    ),
    layout = foundingFacilityLayout(runId),
    surveyedSources = regionalSourceCatalog(surveyHub, seed, worldGeneration);
  return {
    id: namedUuid(runId, "village-master-plan:founding"),
    entityType: "village-master-plan",
    version: 1,
    status: "approved",
    planningEnvelope: { x: -128, y: -128, width: 256, height: 256 },
    districts: layout.districts,
    plannedFacilities: layout.facilities,
    householdLots: FOUNDER_HOUSE_PLOTS.map((lot) => ({ ...lot })),
    householdHoldings: foundingHouseholdHoldings(runId),
    settlementEvolution: settlementEvolutionPlan(),
    spatialReservations: masterPlanSpatialReservations(
      layout,
      FOUNDER_HOUSE_PLOTS,
    ),
    logisticsNetwork: foundingLogisticsNetwork(layout, surveyedSources),
    housingLayout: [],
    fieldBoundaries,
    fieldClearingSurveys: fieldBoundaries.map((area) =>
      plannedFieldClearing(runId, area),
    ),
    reservedRoutes: ["east_west_founders_road", "north_south_trade_road"],
    regionalContext: {
      generationVersion: VILLAGE_REGION_GENERATION_VERSION,
      authoritativeRegion: {
        width: VILLAGE_REGION.width,
        height: VILLAGE_REGION.height,
        chunkSize: VILLAGE_REGION.chunkSize,
      },
      foundingEnvelope: VILLAGE_REGION.foundingEnvelope,
      hamletEnvelope: VILLAGE_REGION.hamletEnvelope,
      waterway: "stonebridge_river",
      quarryDistrict:
        worldGeneration === "regional_v3"
          ? "unprospected_rocky_ridge"
          : "western_limestone_ridge",
      geologyKnowledge: {
        status: "unprospected",
        revealedDeposits: [],
      },
      site: regionalSite,
      surveyedSources,
      dispatchPolicy: {
        dayTripLimit: 96,
        expeditionLimit: 192,
        remoteWorkRequires: ["field_camp", "food_reserve", "return_route"],
      },
      fieldCamps: [],
      journeyLedger: [],
    },
    transportPolicy: {
      foundingSurface: "dirt",
      bridgeSequence: ["timber", "stone"],
      upgradeRequires: ["traffic_demand", "local_stone", "approved_labor"],
      roadConstructionGate: "all_founder_homes_habitable",
    },
    defenseStrategy: {
      stage: "open_settlement",
      assessedThreats: ["wolves", "predatory_animals", "bandits", "fire"],
      immediateMeasures: ["adaptive_watch", "muster_point", "clear_sightlines"],
      musterPoint: {
        id: namedUuid(runId, "village-defense:muster-point"),
        definitionId: definitionId("world-object", "muster_point"),
        entityType: "muster_point",
        name: "Founders' muster point",
        position: { x: -8, y: 13 },
        status: "designated",
      },
      dutyPolicy: {
        calm: "guard_helps_common_work",
        threat: "guard_musters_then_responds",
        sleeping: "household_bed_with_night_watch_rotation",
      },
      facilities: [
        { key: "watch_house", status: "planned" },
        { key: "gatehouse", status: "blocked_by_perimeter" },
        { key: "armory", status: "planned" },
        { key: "training_yard", status: "planned" },
      ],
      securityOperations: {
        issuedEquipment: [],
        equipmentLedger: [],
        trainingLedger: [],
        nextTrainingAtTick: 0,
      },
      perimeter: {
        status: "deferred",
        trigger: null,
        authorizedAtTick: null,
        boundary: null,
      },
      responseLedger: [],
      perimeterTriggers: [
        "population_25",
        "repeated_attack",
        "valuable_stores",
      ],
      perimeterSequence: ["palisade", "gates", "watch_houses", "stone_wall"],
      accessRules: ["two_exits", "bridge_gate", "farm_and_quarry_routes"],
    },
  };
}

function project(runId, [key, name, dependencies, lumberRequired]) {
  return {
    id: namedUuid(runId, `village-project:${key}`),
    definitionId: definitionId("village-project", key),
    entityType: "village-project",
    key,
    name,
    status: key === "lumber_yard" ? "planned" : "blocked",
    dependencies: [...dependencies],
    resources: { lumberRequired },
    blockingReasons: [],
  };
}

export function createVillageDevelopment(runId, seed, worldGeneration) {
  return {
    policy: "survival_and_growth",
    administratorActorId: null,
    activePriority: "lumber_infrastructure",
    activeOrderId: null,
    orderRevision: 0,
    workOrders: [],
    constructionSites: [],
    siteDecisions: [],
    architectPlans: [],
    architectPlanDecisions: [],
    masterPlan: createFoundingMasterPlan(runId, seed, worldGeneration),
    strategyAssessment: null,
    lastResidentNeedsReviewAtTick: null,
    nextResidentNeedsReviewAtTick: 0,
    priorities: [],
    projects: PROJECTS.map((entry) => project(runId, entry)),
    strategyBoard: createStrategyBoard(runId),
  };
}

function migrateFieldClearances(development, defaults) {
  development.masterPlan.fieldBoundaries =
    defaults.masterPlan.fieldBoundaries.map((fallback) => ({
      ...fallback,
      ...(development.masterPlan.fieldBoundaries ?? []).find(
        (boundary) => boundary.key === fallback.key,
      ),
      clearance: fallback.clearance,
    }));
  for (const site of development.constructionSites)
    for (const enclosure of site.enclosures ?? []) {
      const boundary = development.masterPlan.fieldBoundaries.find(
        (candidate) => candidate.key === enclosure.key,
      );
      if (boundary && (enclosure.purpose ?? "pasture") === "field")
        enclosure.clearance = boundary.clearance;
    }
}

function migrateRegionalGeology(state, masterPlan, refreshSources = false) {
  const context = masterPlan.regionalContext,
    mode = context?.site?.mode;
  if (mode !== "regional_v3") return;
  context.geologyKnowledge ??= { status: "unprospected", revealedDeposits: [] };
  const ridge = context.surveyedSources?.find((source) =>
    ["quarry", "geology_survey"].includes(source.kind),
  );
  if (ridge?.knowledge === "landform_only" && !refreshSources) return;
  if (context.geologyKnowledge.revealedDeposits.length > 0) return;
  context.surveyedSources = regionalSourceCatalog(
    context.site.hub,
    state.seed,
    mode,
  );
  context.quarryDistrict = "unprospected_rocky_ridge";
}

function migrateRegionalBounds(masterPlan) {
  const context = masterPlan.regionalContext;
  const changed =
    context.generationVersion !== VILLAGE_REGION_GENERATION_VERSION ||
    context.authoritativeRegion?.width !== VILLAGE_REGION.width ||
    context.authoritativeRegion?.height !== VILLAGE_REGION.height;
  context.generationVersion = VILLAGE_REGION_GENERATION_VERSION;
  context.authoritativeRegion = {
    width: VILLAGE_REGION.width,
    height: VILLAGE_REGION.height,
    chunkSize: VILLAGE_REGION.chunkSize,
  };
  context.foundingEnvelope = VILLAGE_REGION.foundingEnvelope;
  context.hamletEnvelope = VILLAGE_REGION.hamletEnvelope;
  return changed;
}

function migratePlannedFacilities(masterPlan, defaults) {
  const current = masterPlan.plannedFacilities ?? [],
    defaultKeys = new Set(defaults.map((facility) => facility.key));
  masterPlan.plannedFacilities = [
    ...defaults.map((fallback) => {
      const existing = current.find(
        (facility) => facility.key === fallback.key,
      );
      return existing
        ? {
            ...fallback,
            ...existing,
            site: { ...fallback.site, ...existing.site },
            serviceRelationships: structuredClone(
              fallback.serviceRelationships,
            ),
            serviceRoute: structuredClone(fallback.serviceRoute),
          }
        : structuredClone(fallback);
    }),
    ...current.filter((facility) => !defaultKeys.has(facility.key)),
  ];
}

function migratePlanDistricts(masterPlan, defaults) {
  const current = masterPlan.districts ?? [];
  masterPlan.districts = defaults.map((fallback) => {
    const existing = current.find((district) => district.key === fallback.key);
    return existing
      ? {
          ...fallback,
          ...existing,
          area: { ...fallback.area, ...existing.area },
          allowedUses: [...fallback.allowedUses],
          discouragedUses: [...fallback.discouragedUses],
        }
      : structuredClone(fallback);
  });
}

function mergeNamedPlanEntries(current = [], defaults = []) {
  const identity = (entry) =>
      entry.key ?? entry.householdKey ?? entry.facilityKey ?? entry.id,
    defaultKeys = new Set(defaults.map(identity));
  return [
    ...defaults.map((fallback) => ({
      ...fallback,
      ...(current.find((entry) => identity(entry) === identity(fallback)) ??
        {}),
    })),
    ...current.filter((entry) => !defaultKeys.has(identity(entry))),
  ];
}

function migrateSpatialReservations(masterPlan, defaults) {
  masterPlan.spatialReservations ??= structuredClone(defaults);
  const reservations = masterPlan.spatialReservations;
  for (const [key, entries] of Object.entries(defaults))
    reservations[key] = mergeNamedPlanEntries(reservations[key], entries);
}

function routeAccessSpur(plan, site, route) {
  return {
    key: `${plan.projectKey}_access_spur`,
    facilityKey: plan.projectKey,
    routeKey: route.key,
    from: {
      x: Math.max(route.x, Math.min(site.door.x, route.x + route.w - 1)),
      y: Math.max(route.y, Math.min(site.door.y, route.y + route.h - 1)),
    },
    to: { ...site.door },
    surface: "dirt",
    status: "planned",
  };
}

function approvedRouteAssessment(state, masterPlan, plan) {
  const site = state.village.development.constructionSites.find(
    (candidate) => candidate.architectPlanId === plan.id,
  );
  if (!site) return {};
  const assessment = assessSettlementMasterPlanSite(
      state,
      plan.projectKey,
      site,
    ),
    route = masterPlan.spatialReservations.roadCorridors.find(
      (candidate) => candidate.key === assessment.route?.routeKey,
    );
  return { site, assessment, route };
}

function syncApprovedAccessSpurs(state, masterPlan) {
  const reservations = masterPlan.spatialReservations,
    existing = reservations.accessSpurs ?? [];
  for (const plan of state.village.development.architectPlans) {
    if (plan.status !== "approved") continue;
    const { site, assessment, route } = approvedRouteAssessment(
      state,
      masterPlan,
      plan,
    );
    if (!route || assessment?.route?.requiresSpur !== true) continue;
    if (!existing.some((entry) => entry.facilityKey === plan.projectKey))
      existing.push(routeAccessSpur(plan, site, route));
  }
  reservations.accessSpurs = existing;
}

// function-length-exempt: template -- save migration/default construction
export function ensureVillageDevelopment(state) {
  const generationMode =
      state.village.development?.masterPlan?.regionalContext?.site?.mode ??
      "legacy_origin",
    defaults = createVillageDevelopment(state.id, state.seed, generationMode);
  state.village.development ??= defaults;
  state.village.development.policy ??= defaults.policy;
  state.village.development.administratorActorId ??= null;
  state.village.development.activeOrderId ??= null;
  state.village.development.orderRevision ??= 0;
  state.village.development.workOrders ??= [];
  state.village.development.constructionSites ??= [];
  state.village.development.siteDecisions ??= [];
  state.village.development.architectPlans ??= [];
  state.village.development.architectPlanDecisions ??= [];
  state.village.development.masterPlan ??= defaults.masterPlan;
  state.village.development.strategyAssessment ??= null;
  state.village.development.residentNeedsAssessment ??= null;
  state.village.development.lastResidentNeedsReviewAtTick ??=
    state.village.development.residentNeedsAssessment?.assessedAtTick ?? null;
  state.village.development.nextResidentNeedsReviewAtTick ??=
    (state.village.development.lastResidentNeedsReviewAtTick ??
      -MAYOR_REVIEW_INTERVAL_TICKS) + MAYOR_REVIEW_INTERVAL_TICKS;
  migrateMayorReviewJobs(state);
  const masterPlanDefaults = defaults.masterPlan,
    masterPlan = state.village.development.masterPlan;
  masterPlan.fieldBoundaries ??= masterPlanDefaults.fieldBoundaries;
  migratePlanDistricts(masterPlan, masterPlanDefaults.districts);
  migratePlannedFacilities(masterPlan, masterPlanDefaults.plannedFacilities);
  migrateSpatialReservations(
    masterPlan,
    masterPlanDefaults.spatialReservations,
  );
  syncApprovedAccessSpurs(state, masterPlan);
  masterPlan.fieldClearingSurveys ??= masterPlanDefaults.fieldClearingSurveys;
  masterPlan.householdLots ??= masterPlanDefaults.householdLots;
  masterPlan.householdHoldings ??= masterPlanDefaults.householdHoldings;
  masterPlan.settlementEvolution ??= masterPlanDefaults.settlementEvolution;
  masterPlan.housingLayout ??= [];
  masterPlan.regionalContext ??= masterPlanDefaults.regionalContext;
  masterPlan.regionalContext.surveyedSources ??=
    masterPlanDefaults.regionalContext.surveyedSources;
  masterPlan.regionalContext.surveyedSources = mergeNamedPlanEntries(
    masterPlan.regionalContext.surveyedSources,
    masterPlanDefaults.regionalContext.surveyedSources,
  );
  masterPlan.logisticsNetwork ??= masterPlanDefaults.logisticsNetwork;
  masterPlan.regionalContext.dispatchPolicy ??=
    masterPlanDefaults.regionalContext.dispatchPolicy;
  masterPlan.regionalContext.fieldCamps ??= [];
  masterPlan.regionalContext.journeyLedger ??= [];
  masterPlan.regionalContext.geologyKnowledge ??=
    masterPlanDefaults.regionalContext.geologyKnowledge;
  const regionalBoundsChanged = migrateRegionalBounds(masterPlan);
  migrateRegionalGeology(state, masterPlan, regionalBoundsChanged);
  masterPlan.transportPolicy ??= masterPlanDefaults.transportPolicy;
  masterPlan.transportPolicy.roadConstructionGate ??=
    "all_founder_homes_habitable";
  masterPlan.defenseStrategy ??= masterPlanDefaults.defenseStrategy;
  masterPlan.defenseStrategy.musterPoint ??=
    masterPlanDefaults.defenseStrategy.musterPoint;
  masterPlan.defenseStrategy.dutyPolicy ??=
    masterPlanDefaults.defenseStrategy.dutyPolicy;
  masterPlan.defenseStrategy.facilities ??=
    masterPlanDefaults.defenseStrategy.facilities;
  masterPlan.defenseStrategy.securityOperations ??=
    masterPlanDefaults.defenseStrategy.securityOperations;
  const security = masterPlan.defenseStrategy.securityOperations;
  security.issuedEquipment ??= [];
  security.equipmentLedger ??= [];
  security.trainingLedger ??= [];
  security.nextTrainingAtTick ??= 0;
  masterPlan.defenseStrategy.perimeter ??=
    masterPlanDefaults.defenseStrategy.perimeter;
  masterPlan.defenseStrategy.responseLedger ??= [];
  migrateFieldClearances(state.village.development, defaults);
  state.village.development.priorities ??= [];
  state.village.development.projects = defaults.projects.map((fallback) => {
    const existing = state.village.development.projects?.find(
      (candidate) => candidate.key === fallback.key,
    );
    return existing
      ? { ...fallback, ...existing, dependencies: [...fallback.dependencies] }
      : fallback;
  });
  const boardDefaults = defaults.strategyBoard;
  state.village.development.strategyBoard ??= boardDefaults;
  const board = state.village.development.strategyBoard;
  board.policy ??= boardDefaults.policy;
  board.leaderActorId ??= boardDefaults.leaderActorId;
  board.revision ??= 0;
  board.activeProposalId ??= null;
  board.activeCommissionId ??= null;
  board.decisions ??= [];
  board.commissions ??= [];
  const existingProposals = board.proposalQueue ?? [],
    foundingProjectKeys = new Set(
      boardDefaults.proposalQueue.map((candidate) => candidate.projectKey),
    ),
    migratedFounding = boardDefaults.proposalQueue.map((fallback) => {
      const existing = board.proposalQueue?.find(
        (candidate) => candidate.projectKey === fallback.projectKey,
      );
      if (!existing) return fallback;
      const merged = {
        ...fallback,
        ...existing,
        dependencies: [...fallback.dependencies],
      };
      if ((existing.budgetVersion ?? 0) < fallback.budgetVersion) {
        merged.requestedBudget = structuredClone(fallback.requestedBudget);
        merged.budgetVersion = fallback.budgetVersion;
      }
      return merged;
    });
  board.proposalQueue = [
    ...migratedFounding,
    ...existingProposals.filter(
      (candidate) => !foundingProjectKeys.has(candidate.projectKey),
    ),
  ];
  for (const proposalRecord of board.proposalQueue) {
    proposalRecord.proposalKind ??=
      proposalRecord.projectKey in SPECIALIST_PROPOSAL_DEFINITIONS
        ? "specialist"
        : "founding";
    proposalRecord.proposalSeriesId ??= namedUuid(
      state.id,
      `village-proposal-series:${proposalRecord.projectKey}`,
    );
    proposalRecord.revision ??= 1;
    proposalRecord.previousProposalId ??= null;
    proposalRecord.supersededByProposalId ??= null;
  }
  for (const commission of board.commissions) {
    const proposalRecord = board.proposalQueue.find(
      (candidate) => candidate.id === commission.proposalId,
    );
    if (
      proposalRecord &&
      (commission.budgetVersion ?? 0) < proposalRecord.budgetVersion
    ) {
      commission.budget = structuredClone(proposalRecord.requestedBudget);
      commission.budgetVersion = proposalRecord.budgetVersion;
    }
  }
  return state.village.development;
}

function stock(state, key) {
  return state.village.stockpiles.find((item) => item.key === key);
}

function facilityComplete(state, key) {
  return state.village.facilities.includes(key);
}

function stockQuantity(state, key) {
  return stock(state, key)?.quantity ?? 0;
}

function specialistFacilitySatisfied(state, definition) {
  const keys = [
    definition.facilityType,
    ...(definition.satisfiedByBuildings ?? []),
  ];
  if (keys.some((key) => facilityComplete(state, key))) return true;
  if (state.village.scenario === "founding") return false;
  return state.village.buildings.some((building) =>
    keys.includes(building.key),
  );
}

function demandMetric(key, label, value, threshold, comparison = "at_least") {
  const satisfied =
    comparison === "below" ? value < threshold : value >= threshold;
  return { key, label, value, threshold, comparison, satisfied };
}

function latestProposalForProject(board, projectKey) {
  return board.proposalQueue
    .filter((candidate) => candidate.projectKey === projectKey)
    .sort(
      (left, right) =>
        (right.revision ?? 1) - (left.revision ?? 1) ||
        right.id.localeCompare(left.id),
    )[0];
}

function authorizedProposalExists(board, projectKey) {
  return board.proposalQueue.some(
    (candidate) =>
      candidate.projectKey === projectKey && candidate.status === "approved",
  );
}

// function-length-exempt: template -- declarative demand definitions
function specialistDemand(state, development, projectKey) {
  const residents = state.village.npcStates.length,
    grain = stockQuantity(state, "farm_grain"),
    seed = stockQuantity(state, "farm_seed"),
    meals = stockQuantity(state, "inn_meals"),
    fishingNets = stockQuantity(state, "fishing_nets"),
    lumber = stockQuantity(state, "lumber_yard_lumber"),
    stableSmithySupply = stockQuantity(state, "stable_smithy_supplies"),
    finishedWeapons = stockQuantity(state, "smithy_weapons"),
    housingCapacity = (state.village.residences ?? [])
      .filter((residence) => residence.status === "complete")
      .reduce((total, residence) => total + residence.residentCapacity, 0),
    constructionBacklog = development.projects.filter(
      (projectRecord) => projectRecord.status !== "complete",
    ).length,
    medicalCases =
      [state.hero, ...(state.companions ?? [])].filter(
        (actor) => actor.hp < actor.maxHp,
      ).length +
      (state.village.incidents ?? []).filter(
        (incident) =>
          incident.status !== "resolved" && incident.kind === "danger",
      ).length,
    millAuthorized =
      authorizedProposalExists(development.strategyBoard, "specialist_mill") ||
      state.village.buildings?.some((building) => building.key === "mill") ||
      facilityComplete(state, "mill");
  let metrics;
  switch (projectKey) {
    case "specialist_fishing_hut":
      metrics = [
        demandMetric(
          "food_shortfall",
          "prepared meals versus two-day reserve",
          meals,
          residents * 2,
          "below",
        ),
        demandMetric(
          "net_shortfall",
          "serviceable fishing nets",
          fishingNets,
          2,
          "below",
        ),
      ];
      break;
    case "specialist_forge":
      metrics = [
        demandMetric(
          "smithy_supply",
          "metalwork supply crates",
          stableSmithySupply +
            ["forge_iron", "forge_steel", "forge_copper", "forge_tin"]
              .map((key) => stockQuantity(state, key))
              .reduce((total, quantity) => total + quantity, 0),
          1,
        ),
        demandMetric(
          "finished_tools",
          "finished tools and weapons",
          finishedWeapons,
          2,
          "below",
        ),
      ];
      break;
    case "specialist_mill":
      metrics = [demandMetric("grain_surplus", "stored grain", grain, 8)];
      break;
    case "specialist_bakery":
      metrics = [
        demandMetric("grain_supply", "stored grain", grain, 8),
        demandMetric(
          "meal_shortfall",
          "prepared meals versus four-day reserve",
          meals,
          residents * 4,
          "below",
        ),
        demandMetric(
          "mill_chain",
          "authorized mill chain",
          millAuthorized ? 1 : 0,
          1,
        ),
      ];
      break;
    case "specialist_infirmary":
      metrics = [
        demandMetric(
          "care_load",
          "residents and active medical cases",
          residents + medicalCases,
          10,
        ),
      ];
      break;
    case "specialist_carpenter":
      metrics = [
        demandMetric("lumber_surplus", "stored building lumber", lumber, 24),
        demandMetric(
          "construction_backlog",
          "open construction projects",
          constructionBacklog,
          2,
        ),
      ];
      break;
    case "specialist_granary":
      metrics = [
        demandMetric("harvest_volume", "grain and seed", grain + seed, 12),
      ];
      break;
    case "specialist_inn":
      metrics = [
        demandMetric("meal_surplus", "prepared meals", meals, residents * 3),
        demandMetric(
          "housing_stability",
          "permanent housing capacity",
          housingCapacity,
          residents,
        ),
      ];
      break;
    case "specialist_stable":
      metrics = [
        demandMetric(
          "livestock_count",
          "living cattle and visiting mounts",
          (state.village.animals ?? []).filter(
            (animal) => animal.status !== "dead",
          ).length + (state.village.trade?.activeVisit ? 1 : 0),
          2,
        ),
      ];
      break;
    case "security_gatehouse":
      metrics = [
        demandMetric(
          "perimeter_authorized",
          "authorized village perimeter",
          development.masterPlan.defenseStrategy.perimeter.status ===
            "authorized"
            ? 1
            : 0,
          1,
        ),
      ];
      break;
    default:
      metrics = [];
  }
  const met = metrics.length > 0 && metrics.every((metric) => metric.satisfied),
    score = metrics.length
      ? Math.round(
          (metrics.filter((metric) => metric.satisfied).length /
            metrics.length) *
            100,
        )
      : 0,
    summary = metrics
      .map(
        (metric) =>
          `${metric.label}: ${metric.value}/${metric.threshold}${metric.satisfied ? " ready" : " needed"}`,
      )
      .join("; ");
  return {
    status: met ? "demonstrated" : "not_met",
    score,
    summary,
    metrics,
    evaluatedAtTick: state.tick,
  };
}

function specialistProposalBudget(state, projectKey, definition) {
  const budget = {
    materials: {
      lumber: definition.lumberBudget,
      ...(definition.stoneBudget ? { stone: definition.stoneBudget } : {}),
    },
    laborUnits: definition.laborUnits,
  };
  if (projectKey !== "security_gatehouse") return budget;
  const boundary =
      state.village.development.masterPlan.defenseStrategy.perimeter.boundary,
    gates = boundary?.gates?.length ?? 0;
  if (!boundary) return budget;
  const perimeterCells = 2 * (boundary.width + boundary.height) - 4,
    fenceCells = Math.max(0, perimeterCells - gates);
  budget.materials.lumber +=
    fenceCells * WOOD_BUILD_COSTS.fence + gates * WOOD_BUILD_COSTS.gate;
  budget.laborUnits += fenceCells * 6 + gates * 12;
  return budget;
}

// function-length-exempt: template -- specialist proposal construction
function createSpecialistProposal(
  state,
  projectKey,
  definition,
  demand,
  requester,
  operator,
) {
  const revision = 1;
  return {
    id: namedUuid(
      state.id,
      `village-proposal:${projectKey}:revision:${revision}`,
    ),
    definitionId: definitionId("village-proposal", projectKey),
    entityType: "village-proposal",
    projectKey,
    proposalKind: "specialist",
    proposalSeriesId: namedUuid(
      state.id,
      `village-proposal-series:${projectKey}`,
    ),
    revision,
    facilityType: definition.facilityType,
    name: definition.name,
    status: "submitted",
    requesterPersonKey: requester.personKey,
    requesterActorId: requester.id,
    stakeholderActorIds: [],
    intendedOperatorActorId: operator?.id ?? requester.id,
    intendedOperatorPersonKey: operator?.personKey ?? requester.personKey,
    reason: definition.reason,
    expectedBenefit: definition.expectedBenefit,
    acceptableDelayTicks: definition.acceptableDelayTicks,
    rejectionConsequence: definition.rejectionConsequence,
    requirements: structuredClone(definition.requirements),
    demand: structuredClone(demand),
    dependencies: [],
    requestedBudget: specialistProposalBudget(state, projectKey, definition),
    budgetVersion: 1,
    submittedAtTick: state.tick,
    latestDecisionId: null,
    commissionId: null,
    previousProposalId: null,
    supersededByProposalId: null,
  };
}

function foundingStrategyDemand(state, development, projectKey, observed) {
  if (projectKey === "security_gatehouse") return observed;
  if (
    state.village.scenario !== "founding" ||
    !foundingCoreComplete(development)
  )
    return observed;
  return {
    status: "demonstrated",
    score: 100,
    summary: `${projectKey.replaceAll("_", " ")} is required by the founding master plan.`,
    metrics: [
      demandMetric(
        "founding_master_plan",
        "founding strategy authorization",
        1,
        1,
      ),
    ],
    observedDemand: structuredClone(observed),
    evaluatedAtTick: state.tick,
  };
}

function refreshSpecialist(state, development, projectKey, definition, events) {
  const board = development.strategyBoard,
    requester = specialistActor(state, definition.requesterPersonKey),
    operator = specialistActor(state, definition.operatorPersonKey);
  if (!requester || specialistFacilitySatisfied(state, definition)) return;
  const observed = specialistDemand(state, development, projectKey),
    demand = foundingStrategyDemand(state, development, projectKey, observed),
    latest = latestProposalForProject(board, projectKey);
  if (latest) return;
  if (demand.status !== "demonstrated") return;
  const proposalRecord = createSpecialistProposal(
    state,
    projectKey,
    definition,
    demand,
    requester,
    operator,
  );
  board.proposalQueue.push(proposalRecord);
  board.revision += 1;
  events.push(
    specialistProposalEvent(
      state,
      proposalRecord,
      projectKey,
      requester,
      demand,
    ),
  );
}

// function-length-exempt: template -- specialist proposal event projection
function specialistProposalEvent(
  state,
  proposal,
  projectKey,
  requester,
  demand,
) {
  return {
    type: "village_specialist_proposal_submitted",
    proposalId: proposal.id,
    projectKey,
    actorId: requester.id,
    actorName: requester.name,
    demand: structuredClone(demand),
    tick: state.tick,
  };
}

function updateSpecialistProposals(state, development, events) {
  for (const [projectKey, definition] of Object.entries(
    SPECIALIST_PROPOSAL_DEFINITIONS,
  ))
    refreshSpecialist(state, development, projectKey, definition, events);
}

function updateProjects(state, development) {
  const lumber = stock(state, "lumber_yard_lumber")?.quantity ?? 0;
  for (const project of development.projects) {
    const missing = project.dependencies.filter(
      (dependency) => !facilityComplete(state, dependency),
    );
    project.blockingReasons = missing.map(
      (dependency) => `Requires ${dependency.replaceAll("_", " ")}`,
    );
    if (facilityComplete(state, project.key)) project.status = "complete";
    else if (missing.length) project.status = "blocked";
    else if (lumber < project.resources.lumberRequired)
      project.status = project.key === "lumber_yard" ? "active" : "planned";
    else project.status = "ready";
  }
}

function priority(key, name, score, reason, blockedBy = []) {
  return { key, name, score, reason, blockedBy };
}

function seasonalPlantingUnderway(state) {
  return (state.village.cropPlots ?? []).some(
    (plot) =>
      ["germinating", "growing", "mature", "harvestable"].includes(
        plot.stage,
      ) || (plot.cycle ?? 0) > 0,
  );
}

const NEED_REQUESTS = Object.freeze({
  hunger: "food",
  fatigue: "sleep",
  safety: "protection",
  social: "companionship",
  morale: "hope",
});
const RESIDENT_NEEDS = Object.freeze(Object.keys(NEED_REQUESTS));
export const MAYOR_REVIEW_INTERVAL_TICKS = 100;

function migrateMayorReviewJobs(state) {
  for (const job of state.village.jobs ?? []) {
    if (
      !job.plan?.governanceDuty ||
      ["completed", "cancelled"].includes(job.status)
    )
      continue;
    const actor = state.village.npcStates.find(
      (candidate) => candidate.id === job.assignedActorId,
    );
    releaseJobReservations(state, job.id, "replaced_by_scheduled_review");
    Object.assign(job, {
      status: "cancelled",
      assignedActorId: null,
      blockingReason: "replaced_by_scheduled_review",
      completedAtTick: state.tick,
    });
    if (actor) actor.workState = "available";
  }
}

function residentNeedRecord(resident) {
  const needs = structuredClone(resident.life?.needs ?? {}),
    urgentNeeds = Object.entries(needs)
      .filter(([, value]) => value <= 40)
      .sort((left, right) => left[1] - right[1])
      .map(([need]) => need),
    requests = urgentNeeds.map((need) => NEED_REQUESTS[need]);
  if (resident.housingStatus !== "housed") requests.push("permanent_home");
  return {
    residentId: resident.id,
    residentName: resident.name,
    householdId: resident.householdId ?? null,
    housingStatus: resident.housingStatus,
    misery: resident.life?.misery ?? 0,
    miseryLevel: resident.life?.miseryLevel ?? "comfortable",
    miseryReasons: [...(resident.life?.miseryReasons ?? [])],
    needs,
    urgentNeeds,
    requests: [...new Set(requests)],
  };
}

function needCounts(residents, threshold) {
  return Object.fromEntries(
    RESIDENT_NEEDS.map((need) => [
      need,
      residents.filter((resident) => resident.needs[need] <= threshold).length,
    ]),
  );
}

function residentFoodOutlook(state, residentCount) {
  const foodReserve = [
    "inn_meals",
    "inn_fish",
    "wild_forage",
    "farm_grain",
    "farm_vegetables",
    "dairy_milk",
    "pasture_meat",
  ].reduce((total, key) => total + (stock(state, key)?.quantity ?? 0), 0);
  return {
    availablePortions: foodReserve,
    oneDayTarget: residentCount,
    stableTarget: residentCount * 3,
    coverageDays: residentCount ? foodReserve / residentCount : 0,
    seasonalPlantingUnderway: seasonalPlantingUnderway(state),
    risks: [
      ...(foodReserve < residentCount ? ["reserve_below_one_day"] : []),
      ...(seasonalPlantingUnderway(state) ? [] : ["seasonal_fields_unsown"]),
    ],
  };
}

function assessResidentNeeds(state) {
  const residents = state.village.npcStates.map(residentNeedRecord);
  return {
    assessedAtTick: state.tick,
    assessedByActorId: villageAdministrator(state)?.id ?? null,
    residentCount: residents.length,
    residents,
    warningCounts: needCounts(residents, 40),
    dangerCounts: needCounts(residents, 25),
    homelessCount: residents.filter(
      (resident) => resident.housingStatus !== "housed",
    ).length,
    foodOutlook: residentFoodOutlook(state, residents.length),
  };
}

function sleepingCapacity(state, temporary) {
  return (state.village.fixtures ?? [])
    .filter(
      (fixture) => fixture.role === "bed" && !!fixture.temporary === temporary,
    )
    .reduce((total, fixture) => total + (fixture.sleepingCapacity ?? 0), 0);
}

function foundingEvidence(state) {
  const residents = state.village.npcStates,
    meals = stock(state, "inn_meals")?.quantity ?? 0;
  return {
    residentCount: residents.length,
    homelessResidents: residents.filter(
      (resident) => resident.housingStatus !== "housed",
    ).length,
    permanentBedCapacity: sleepingCapacity(state, false),
    temporarySleepingCapacity: sleepingCapacity(state, true),
    preparedMeals: meals,
    preparedMealDays: residents.length ? meals / residents.length : 0,
    criticalHunger: residents.filter(
      (resident) => (resident.life?.needs?.hunger ?? 100) <= 25,
    ).length,
    availableBuilders: residents.filter((resident) =>
      resident.capabilityTags?.includes("build"),
    ).length,
    availableLumber: stock(state, "lumber_yard_lumber")?.quantity ?? 0,
    lumberYardOperational: facilityComplete(state, "lumber_yard"),
    survivalCampOperational: facilityComplete(state, "survival_camp"),
    farmsteadOperational: facilityComplete(state, "farmstead"),
    seasonalPlantingUnderway: seasonalPlantingUnderway(state),
  };
}

function foundingAlternatives(evidence) {
  const firstHomeTicks = Math.ceil(432 / 0.6),
    fullHousingTicks = Math.ceil(2990 / 0.6);
  return [
    {
      key: "minimal_camp",
      feasible: evidence.temporarySleepingCapacity >= evidence.residentCount,
      timeToBenefitTicks: evidence.survivalCampOperational ? 0 : 30,
      lumberRequired: 0,
      permanentBedCapacity: 0,
      limitation:
        "Bedrolls and canvas prevent collapse but do not end homelessness.",
    },
    {
      key: "communal_shelter",
      feasible: evidence.temporarySleepingCapacity >= evidence.residentCount,
      timeToBenefitTicks: 0,
      lumberRequired: 0,
      permanentBedCapacity: 0,
      limitation: "The shared weather canvas is temporary communal shelter.",
    },
    {
      key: "household_homes",
      feasible: evidence.lumberYardOperational,
      timeToBenefitTicks: firstHomeTicks,
      fullCoverageTicks: fullHousingTicks,
      lumberRequired: 1590,
      permanentBedCapacity: evidence.residentCount,
      limitation:
        "Permanent homes require the lumber yard and sustained crews.",
    },
  ];
}

function foundingDoctrine(evidence, alternatives) {
  const key = !evidence.survivalCampOperational
      ? "minimal_camp"
      : !evidence.lumberYardOperational ||
          !evidence.farmsteadOperational ||
          !evidence.seasonalPlantingUnderway
        ? "communal_shelter"
        : evidence.homelessResidents
          ? "household_homes"
          : "household_homes",
    selected = alternatives.find((alternative) => alternative.key === key);
  return {
    key,
    objective:
      key === "minimal_camp"
        ? evidence.lumberYardOperational
          ? "Keep emergency shelter and food operating."
          : "Stabilize camp while bootstrapping construction lumber."
        : "Replace temporary bedrolls with roofed household beds.",
    nextCapitalStep: !evidence.lumberYardOperational
      ? "lumber_yard"
      : !evidence.farmsteadOperational || !evidence.seasonalPlantingUnderway
        ? "farmstead"
        : "housing",
    timeToBenefitTicks: selected.timeToBenefitTicks,
  };
}

export function assessFoundingStrategy(state) {
  const evidence = foundingEvidence(state),
    alternatives = foundingAlternatives(evidence),
    selectedDoctrine = foundingDoctrine(evidence, alternatives),
    missingEvidence = alternatives.some(
      (plan) => plan.timeToBenefitTicks == null,
    )
      ? ["time_to_benefit"]
      : [];
  return {
    status: missingEvidence.length ? "insufficient_evidence" : "ready",
    evaluatedAtTick: state.tick,
    evidence,
    alternatives,
    selectedDoctrine,
    rejectedAlternatives: alternatives
      .filter((alternative) => alternative.key !== selectedDoctrine.key)
      .map((alternative) => ({
        key: alternative.key,
        reason: alternative.limitation,
      })),
    missingEvidence,
    reevaluateOn: [
      "food_coverage_change",
      "sleeping_capacity_change",
      "material_or_labor_change",
      "weather_injury_or_threat_change",
    ],
  };
}

// function-length-exempt: template -- priority report projection
function villagePriorities(state) {
  const founding = state.village.scenario === "founding",
    residents = state.village.npcStates.length,
    meals = stock(state, "inn_meals")?.quantity ?? 0,
    storedFood = [
      "farm_grain",
      "farm_vegetables",
      "dairy_milk",
      "pasture_meat",
    ].reduce((total, key) => total + (stock(state, key)?.quantity ?? 0), 0),
    bridgeFood = ["inn_fish", "wild_forage"].reduce(
      (total, key) => total + (stock(state, key)?.quantity ?? 0),
      0,
    ),
    lumber = stock(state, "lumber_yard_lumber")?.quantity ?? 0,
    hasYard = facilityComplete(state, "lumber_yard"),
    hasFarm = facilityComplete(state, "farmstead"),
    hasKitchen = facilityComplete(state, "communal_kitchen"),
    housedResidents = state.village.npcStates.filter(
      (resident) => resident.housingStatus === "housed",
    ).length,
    housingComplete =
      state.village.scenario !== "founding" ||
      state.village.facilities.includes("housing") ||
      housedResidents === residents,
    foodReserve = meals + storedFood + bridgeFood,
    survivalFoodTarget = residents,
    stableFoodTarget = residents * 3,
    hungryResidents = state.village.npcStates.filter(
      (resident) => (resident.life?.needs?.hunger ?? 100) <= 40,
    ).length,
    starvingResidents = state.village.npcStates.filter(
      (resident) => (resident.life?.needs?.hunger ?? 100) <= 25,
    ).length,
    foodCritical = foodReserve < survivalFoodTarget || hungryResidents > 0,
    plantingUnderway = seasonalPlantingUnderway(state),
    farmProjectUnderway = state.village.jobs.some(
      (job) =>
        job.jobType === "build_farmstead" &&
        !["completed", "cancelled"].includes(job.status),
    ),
    farmEstablished = hasFarm && plantingUnderway,
    housingReady = plantingUnderway && (hasFarm || farmProjectUnderway),
    foodSecure = farmEstablished && foodReserve >= stableFoodTarget;
  return [
    priority(
      "lumber_infrastructure",
      "Secure building lumber",
      hasYard ? 35 : 130,
      hasYard ? `${lumber}/12 lumber stored` : "Lumber yard not operational",
    ),
    priority(
      "housing",
      "House the settlement",
      founding
        ? housingComplete
          ? 25
          : hasYard && housingReady && !foodCritical
            ? hasFarm
              ? 125
              : 130
            : hasYard
              ? 60
              : 110
        : housingComplete
          ? 25
          : hasYard
            ? 125
            : 110,
      `${housedResidents}/${residents} residents have roofed household housing with beds`,
      founding
        ? [
            ...(hasYard ? [] : ["lumber_yard"]),
            ...(plantingUnderway ? [] : ["seasonal_planting"]),
            ...(foodCritical ? ["one_day_food_reserve"] : []),
          ]
        : hasYard
          ? []
          : ["lumber_yard"],
    ),
    priority(
      "food_security",
      "Feed the settlement",
      founding
        ? starvingResidents
          ? 145
          : foodCritical
            ? 140
            : !hasYard
              ? 120
              : !farmEstablished
                ? 128
                : foodSecure
                  ? 70
                  : 115
        : foodSecure
          ? 45
          : housingComplete
            ? hasFarm
              ? 120
              : 115
            : 70,
      `${foodReserve}/${stableFoodTarget} food portions; ${hungryResidents} hungry and ${starvingResidents} starving; one-day floor ${survivalFoodTarget}; seasonal planting ${plantingUnderway ? "underway" : "not started"}`,
      founding
        ? hasYard
          ? []
          : ["lumber_yard"]
        : [
            ...(housingComplete ? [] : ["housing"]),
            ...(hasFarm ? [] : ["farmstead"]),
          ],
    ),
    priority(
      "domestic_logistics",
      "Build a physical inn kitchen",
      housedResidents > 0 && hasFarm && !hasKitchen ? 85 : 20,
      hasKitchen
        ? "The founders' inn kitchen is operational"
        : "A sheltered kitchen and pantry are still required",
      [
        ...(hasFarm ? [] : ["farmstead"]),
        ...(housedResidents > 0 ? [] : ["first_home"]),
      ],
    ),
  ].sort(
    (left, right) =>
      right.score - left.score || left.key.localeCompare(right.key),
  );
}

const PRIORITY_WORK = Object.freeze({
  lumber_infrastructure: ["fell_tree", "build_lumber_yard", "saw_lumber"],
  food_security: [
    "build_farmstead",
    "grow_grain",
    "grow_vegetables",
    "hunt_game",
    "gather_wild_food",
    "save_seed",
    "relocate_cow",
    "relocate_pig",
    "relocate_sheep",
    "relocate_chicken",
    "relocate_dog",
    "treat_sick_cow",
    "treat_sick_pig",
    "treat_sick_sheep",
    "treat_sick_chicken",
    "treat_sick_dog",
    "breed_cattle",
    "breed_pig",
    "breed_sheep",
    "breed_dog",
    "breed_chicken",
    "milk_cattle",
    "collect_eggs",
    "shear_sheep",
    "collect_manure",
    "fertilize_fields",
    "slaughter_cattle",
  ],
  housing: ["build_house"],
  domestic_logistics: ["build_communal_kitchen"],
});

function villageAdministrator(state) {
  return state.village.npcStates.find((actor) => actor.personKey === "reeve");
}

function namedActor(actor) {
  return actor
    ? { actorId: actor.id, actorName: actor.name, personKey: actor.personKey }
    : null;
}

function rankActors(actors, skill) {
  return [...actors].sort(
    (left, right) =>
      (right.skills?.[skill] ?? 0) - (left.skills?.[skill] ?? 0) ||
      left.id.localeCompare(right.id),
  );
}

// function-length-exempt: template -- assignment recommendation projection
function commissionAssignments(state, proposalRecord, jobTypes) {
  const actors = state.village.npcStates,
    leader = actors.find((actor) => actor.personKey === "reeve"),
    requester = actors.find(
      (actor) => actor.id === proposalRecord.requesterActorId,
    ),
    operator = actors.find(
      (actor) => actor.id === proposalRecord.intendedOperatorActorId,
    ),
    builders = rankActors(
      actors.filter((actor) => actor.capabilityTags?.includes("build")),
      "construction",
    ),
    haulers = rankActors(
      actors.filter((actor) => actor.capabilityTags?.includes("haul")),
      "logistics",
    ),
    suppliers = actors
      .filter((actor) =>
        actor.workPermissions?.allowedJobTypes?.some((jobType) =>
          jobTypes.includes(jobType),
        ),
      )
      .sort((left, right) => left.id.localeCompare(right.id)),
    foreman = builders[0] ?? null,
    crew = [requester, operator, foreman, ...builders, ...haulers, ...suppliers]
      .filter(Boolean)
      .filter(
        (actor, index, all) =>
          all.findIndex((candidate) => candidate.id === actor.id) === index,
      );
  return {
    leader: namedActor(leader),
    requester: namedActor(requester),
    operator: namedActor(operator),
    foreman: namedActor(foreman),
    builders: builders.map(namedActor),
    haulers: haulers.map(namedActor),
    suppliers: suppliers.map(namedActor),
    crewActorIds: crew.map((actor) => actor.id),
  };
}

function villageArchitect(state) {
  return [...state.village.npcStates]
    .filter(
      (actor) =>
        actor.capabilityTags?.includes("architect") &&
        actor.workPermissions?.allowedJobTypes?.includes("survey_architecture"),
    )
    .sort(
      (left, right) =>
        (right.skills?.architecture ?? 0) - (left.skills?.architecture ?? 0) ||
        (right.skills?.construction ?? 0) - (left.skills?.construction ?? 0) ||
        left.id.localeCompare(right.id),
    )[0];
}

function assignCommissionArchitect(state, commission, proposalRecord, events) {
  if (proposalRecord.proposalKind !== "specialist") return null;
  const appointed = state.village.npcStates.find(
      (actor) => actor.id === commission.planning?.architectActorId,
    ),
    architect = appointed ?? villageArchitect(state);
  commission.planning ??= {
    status: "architect_assignment_pending",
    architectActorId: null,
    planId: null,
  };
  if (!architect) return null;
  commission.assignments.architect = namedActor(architect);
  if (!commission.assignments.crewActorIds.includes(architect.id))
    commission.assignments.crewActorIds.push(architect.id);
  if (commission.planning.architectActorId) return architect;
  commission.planning = {
    ...commission.planning,
    status: "survey_pending",
    architectActorId: architect.id,
    architectName: architect.name,
    assignedAtTick: state.tick,
    planId: commission.planning.planId ?? null,
    note: "The appointed architect must survey alternatives before a blueprint can exist.",
  };
  events.push({
    type: "village_architect_assigned",
    commissionId: commission.id,
    projectKey: commission.projectKey,
    actorId: architect.id,
    actorName: architect.name,
    tick: state.tick,
  });
  return architect;
}

function commissionJobTypes(proposalRecord) {
  const priority = Object.entries(PRIORITY_PROJECT).find(
    ([, projectKey]) => projectKey === proposalRecord.projectKey,
  )?.[0];
  return [
    ...(PRIORITY_WORK[priority] ?? []),
    ...(proposalRecord.requestedBudget.materials.lumber > 0 &&
    proposalRecord.projectKey !== "lumber_yard"
      ? ["fell_tree", "saw_lumber"]
      : []),
    ...((proposalRecord.requestedBudget.materials.stone ?? 0) > 0
      ? ["prospect_rock", "quarry_stone"]
      : []),
  ];
}

function retainedNamedActor(state, current, fallback) {
  if (!current?.actorId) return fallback;
  const actor = state.village.npcStates.find(
    (candidate) => candidate.id === current.actorId,
  );
  return actor?.life?.status === "dead" ? fallback : current;
}

function refreshCommissionAssignments(state, commission, proposal, jobTypes) {
  const refreshed = commissionAssignments(state, proposal, jobTypes);
  refreshed.foreman = retainedNamedActor(
    state,
    commission.assignments?.foreman,
    refreshed.foreman,
  );
  if (
    refreshed.foreman?.actorId &&
    !refreshed.crewActorIds.includes(refreshed.foreman.actorId)
  )
    refreshed.crewActorIds.push(refreshed.foreman.actorId);
  return refreshed;
}

function refreshCommission(
  state,
  commission,
  projectRecord,
  proposalRecord,
  jobTypes,
) {
  if (commission.status !== "suspended")
    commission.status =
      projectRecord?.status === "complete" ||
      specialistFacilitySatisfied(
        state,
        SPECIALIST_PROPOSAL_DEFINITIONS[proposalRecord.projectKey] ?? {},
      )
        ? "operating"
        : "active";
  if (
    commission.status === "operating" &&
    commission.planning?.status === "approved"
  )
    commission.planning.status = "operating";
  commission.assignments = refreshCommissionAssignments(
    state,
    commission,
    proposalRecord,
    jobTypes,
  );
  return commission;
}

// function-length-exempt: template -- commission state construction
function newCommission(state, board, projectRecord, proposalRecord, jobTypes) {
  return {
    id: namedUuid(state.id, `village-commission:${proposalRecord.projectKey}`),
    definitionId: definitionId("village-commission", proposalRecord.projectKey),
    entityType: "village-commission",
    proposalId: proposalRecord.id,
    decisionId: proposalRecord.latestDecisionId,
    projectId: projectRecord?.id ?? null,
    projectKey: proposalRecord.projectKey,
    status: projectRecord?.status === "complete" ? "operating" : "active",
    authorizedByActorId: board.leaderActorId,
    authorizedAtTick: state.tick,
    budget: structuredClone(proposalRecord.requestedBudget),
    budgetVersion: proposalRecord.budgetVersion,
    budgetUsage: {
      materials: Object.fromEntries(
        Object.keys(proposalRecord.requestedBudget.materials).map((key) => [
          key,
          0,
        ]),
      ),
      laborUnits: 0,
      remainingMaterials: structuredClone(
        proposalRecord.requestedBudget.materials,
      ),
      remainingLaborUnits: proposalRecord.requestedBudget.laborUnits,
      status: "within_budget",
    },
    assignments: commissionAssignments(state, proposalRecord, jobTypes),
    planning: {
      status:
        proposalRecord.proposalKind === "specialist"
          ? "architect_assignment_pending"
          : "provisional_legacy_plan",
      architectActorId: null,
      planId: null,
      note:
        proposalRecord.proposalKind === "specialist"
          ? "An architect must survey alternatives before any blueprint is created."
          : "Founding projects retain their validated pre-V3 site plan.",
    },
  };
}

function commissionForProposal(state, development, proposalRecord) {
  const board = development.strategyBoard,
    projectRecord = development.projects.find(
      (candidate) => candidate.key === proposalRecord.projectKey,
    ),
    existing = board.commissions.find(
      (candidate) => candidate.proposalId === proposalRecord.id,
    ),
    jobTypes = commissionJobTypes(proposalRecord);
  if (existing)
    return refreshCommission(
      state,
      existing,
      projectRecord,
      proposalRecord,
      jobTypes,
    );
  const commission = newCommission(
    state,
    board,
    projectRecord,
    proposalRecord,
    jobTypes,
  );
  board.commissions.push(commission);
  proposalRecord.commissionId = commission.id;
  return commission;
}

function usedConstructionMaterials(parents) {
  const used = {};
  for (const job of parents)
    for (const element of job.plan.constructionWork.elements) {
      const key = element.material === "stone" ? "stone" : "lumber";
      used[key] = (used[key] ?? 0) + (element.materialDeliveredQuantity ?? 0);
    }
  return used;
}

function remainingMaterialBudget(budget, used) {
  return Object.fromEntries(
    Object.entries(budget).map(([key, quantity]) => [
      key,
      quantity - (used[key] ?? 0),
    ]),
  );
}

// function-length-exempt: template -- commission usage projection
function commissionUsage(state, commission) {
  const parents = state.village.jobs.filter(
      (job) =>
        job.plan?.commissionId === commission.id &&
        job.plan?.constructionWork &&
        !job.plan?.parallelFoundingWork,
    ),
    materials = usedConstructionMaterials(parents),
    laborUsed =
      (commission.preconstructionLaborUnits ?? 0) +
      parents.reduce(
        (total, job) =>
          total +
          job.plan.constructionWork.elements.reduce(
            (sum, element) => sum + (element.laborCompleted ?? 0),
            0,
          ),
        0,
      ),
    materialBudget = commission.budget?.materials ?? {},
    laborBudget = commission.budget?.laborUnits ?? 0,
    remainingMaterials = remainingMaterialBudget(materialBudget, materials),
    laborRemaining = laborBudget - laborUsed,
    materialValues = Object.values(remainingMaterials),
    status =
      parents.length === 0 && commission.status === "operating"
        ? "legacy_untracked"
        : materialValues.some((quantity) => quantity < 0) || laborRemaining < 0
          ? "exceeded"
          : materialValues.some((quantity) => quantity === 0) ||
              laborRemaining === 0
            ? "at_limit"
            : "within_budget";
  return {
    materials,
    laborUnits: laborUsed,
    remainingMaterials,
    remainingLaborUnits: laborRemaining,
    status,
  };
}

function updateCommissionBudgets(state, development) {
  for (const commission of development.strategyBoard.commissions) {
    commission.budgetUsage = commissionUsage(state, commission);
    const exceeded = commission.budgetUsage.status === "exceeded";
    for (const job of state.village.jobs.filter(
      (candidate) => candidate.plan?.commissionId === commission.id,
    ))
      job.plan.budgetBlocked = exceeded && commissionBudgetControls(job);
  }
}

function commissionBudgetControls(job) {
  return Boolean(
    job.plan?.constructionWork ||
    job.plan?.constructionDelivery ||
    job.plan?.projectAssist,
  );
}

function suspendCommissionJobs(state, commission) {
  for (const job of state.village.jobs.filter(
    (candidate) =>
      candidate.plan?.commissionId === commission.id &&
      !["completed", "cancelled"].includes(candidate.status),
  )) {
    job.plan.commissionSuspended = true;
    const actor = state.village.npcStates.find(
      (candidate) => candidate.id === job.assignedActorId,
    );
    if (["reserved", "active"].includes(job.status)) {
      restoreJobTransfer(state, job);
      releaseJobReservations(state, job.id, "commission_suspended");
      transitionJob(job, "suspended", state.tick);
      job.assignedActorId = null;
      job.destination = null;
      if (actor) actor.workState = "available";
    } else if (job.status === "available")
      transitionJob(job, "suspended", state.tick);
    else if (job.status === "blocked") {
      transitionJob(job, "available", state.tick);
      transitionJob(job, "suspended", state.tick);
      job.assignedActorId = null;
    }
  }
}

function resumeCommissionJobs(state, commission) {
  for (const job of state.village.jobs.filter(
    (candidate) =>
      candidate.plan?.commissionId === commission.id &&
      !["completed", "cancelled"].includes(candidate.status),
  )) {
    delete job.plan.commissionSuspended;
    if (job.status === "suspended") transitionJob(job, "available", state.tick);
    job.assignedActorId = null;
    job.destination = null;
    job.nextAssignmentAtTick = null;
  }
}

export function setVillageCommissionStatus(
  state,
  { commissionId, status, reason = "Player council decision" },
  events = [],
) {
  const development = ensureVillageDevelopment(state),
    board = development.strategyBoard,
    commission = board.commissions.find(
      (candidate) => candidate.id === commissionId,
    ),
    administrator = villageAdministrator(state);
  if (!commission)
    throw new Error(`Unknown village commission: ${commissionId}`);
  if (!administrator) throw new Error("The village has no reeve.");
  if (!["active", "suspended"].includes(status))
    throw new Error(`Unsupported commission status: ${status}`);
  if (status === "suspended") {
    commission.status = "suspended";
    commission.suspendedAtTick = state.tick;
    commission.suspensionReason = reason;
    suspendCommissionJobs(state, commission);
  } else {
    const projectRecord = development.projects.find(
      (candidate) => candidate.id === commission.projectId,
    );
    commission.status =
      projectRecord?.status === "complete" ? "operating" : "active";
    commission.resumedAtTick = state.tick;
    commission.suspensionReason = null;
    resumeCommissionJobs(state, commission);
  }
  for (const order of development.workOrders.filter(
    (candidate) => candidate.commissionId === commission.id,
  ))
    if (status === "suspended" && order.status === "active")
      order.status = "suspended";
    else if (status === "active" && order.status === "suspended")
      order.status = "active";
  events.push({
    type:
      status === "suspended"
        ? "village_commission_suspended"
        : "village_commission_resumed",
    projectKey: commission.projectKey,
    status: commission.status,
    reason,
    actorId: administrator.id,
    actorName: administrator.name,
    tick: state.tick,
  });
  return commission;
}

export function decideVillageProposal(
  state,
  { proposalId, outcome, reason, budget = null, source = "player" },
  events = [],
) {
  const development = ensureVillageDevelopment(state),
    board = development.strategyBoard,
    administrator = villageAdministrator(state),
    proposalRecord = board.proposalQueue.find(
      (candidate) => candidate.id === proposalId,
    );
  if (!administrator) throw new Error("The village has no reeve.");
  if (!proposalRecord)
    throw new Error(`Unknown village proposal: ${proposalId}`);
  if (
    !["approved", "deferred", "rejected", "revision_requested"].includes(
      outcome,
    )
  )
    throw new Error(`Unsupported village proposal decision: ${outcome}`);
  if (proposalRecord.status === "superseded")
    throw new Error("A superseded proposal revision cannot be decided.");
  if (
    proposalRecord.proposalKind === "specialist" &&
    proposalRecord.status !== "submitted" &&
    outcome === "approved"
  )
    throw new Error(
      "A deferred or rejected specialist proposal must be revised and resubmitted before approval.",
    );
  if (proposalRecord.status === "approved" && outcome !== "approved")
    throw new Error(
      "Suspend the active commission instead of reversing its approval.",
    );
  board.revision += 1;
  const decision = {
    id: namedUuid(
      state.id,
      `village-decision:${board.revision}:${proposalRecord.projectKey}:${outcome}`,
    ),
    definitionId: definitionId("village-decision", outcome),
    entityType: "village-decision",
    proposalId: proposalRecord.id,
    projectKey: proposalRecord.projectKey,
    outcome,
    reason,
    source,
    decidedByActorId: administrator.id,
    decidedAtTick: state.tick,
    budget: structuredClone(budget ?? proposalRecord.requestedBudget),
  };
  board.decisions.push(decision);
  proposalRecord.status = outcome;
  proposalRecord.latestDecisionId = decision.id;
  const commission =
    outcome === "approved"
      ? commissionForProposal(state, development, proposalRecord)
      : null;
  if (commission) {
    commission.decisionId = decision.id;
    commission.budget = structuredClone(decision.budget);
  }
  events.push({
    type: "village_proposal_decided",
    projectKey: proposalRecord.projectKey,
    outcome,
    reason,
    actorId: administrator.id,
    actorName: administrator.name,
    tick: state.tick,
  });
  return { proposal: proposalRecord, decision, commission };
}

export function reviseVillageProposal(
  state,
  { proposalId, reason, source = "requester_resubmission" },
  events = [],
) {
  const development = ensureVillageDevelopment(state),
    board = development.strategyBoard,
    previous = board.proposalQueue.find(
      (candidate) => candidate.id === proposalId,
    );
  if (!previous) throw new Error(`Unknown village proposal: ${proposalId}`);
  if (previous.proposalKind !== "specialist")
    throw new Error("Only specialist proposals support V2 revision.");
  if (!["deferred", "rejected", "revision_requested"].includes(previous.status))
    throw new Error(
      `Proposal status ${previous.status} cannot be revised and resubmitted.`,
    );
  if (previous.demand?.status !== "demonstrated")
    throw new Error("The specialist demand is no longer demonstrated.");
  const requester = state.village.npcStates.find(
    (actor) => actor.id === previous.requesterActorId,
  );
  if (!requester) throw new Error("The proposal requester is unavailable.");
  const revision = (previous.revision ?? 1) + 1,
    proposalRecord = {
      ...structuredClone(previous),
      id: namedUuid(
        state.id,
        `village-proposal:${previous.projectKey}:revision:${revision}`,
      ),
      revision,
      status: "submitted",
      submittedAtTick: state.tick,
      revisionReason: reason,
      revisionSource: source,
      revisedByActorId: requester.id,
      previousProposalId: previous.id,
      supersededByProposalId: null,
      latestDecisionId: null,
      commissionId: null,
    };
  previous.status = "superseded";
  previous.supersededByProposalId = proposalRecord.id;
  board.proposalQueue.push(proposalRecord);
  board.revision += 1;
  events.push({
    type: "village_specialist_proposal_resubmitted",
    proposalId: proposalRecord.id,
    previousProposalId: previous.id,
    projectKey: proposalRecord.projectKey,
    revision,
    reason,
    actorId: requester.id,
    actorName: requester.name,
    tick: state.tick,
  });
  return proposalRecord;
}

export function registerVillageArchitectPlan(
  state,
  { commissionId, alternatives },
  events = [],
) {
  const development = ensureVillageDevelopment(state),
    board = development.strategyBoard,
    commission = board.commissions.find(
      (candidate) => candidate.id === commissionId,
    ),
    proposalRecord = board.proposalQueue.find(
      (candidate) => candidate.id === commission?.proposalId,
    );
  if (!commission)
    throw new Error(`Unknown village commission: ${commissionId}`);
  if (proposalRecord?.proposalKind !== "specialist")
    throw new Error(
      "Architect plans currently require a specialist commission.",
    );
  if (!commission.planning?.architectActorId)
    throw new Error("The commission has no appointed architect.");
  if (!alternatives?.length)
    throw new Error("The architect found no valid site alternatives.");
  const current = development.architectPlans.find(
    (candidate) =>
      candidate.commissionId === commission.id &&
      ["surveying", "awaiting_approval", "approved"].includes(candidate.status),
  );
  if (current) return current;
  const revision =
      development.architectPlans.filter(
        (candidate) => candidate.commissionId === commission.id,
      ).length + 1,
    plan = {
      id: namedUuid(
        state.id,
        `architect-plan:${commission.projectKey}:revision:${revision}`,
      ),
      definitionId: definitionId("architect-plan", commission.projectKey),
      entityType: "architect-plan",
      commissionId: commission.id,
      proposalId: commission.proposalId,
      projectKey: commission.projectKey,
      revision,
      status: "surveying",
      architectActorId: commission.planning.architectActorId,
      createdAtTick: state.tick,
      recommendedAlternativeId: null,
      selectedAlternativeId: null,
      latestDecisionId: null,
      alternatives: alternatives.map((alternative, index) => ({
        ...structuredClone(alternative),
        id: namedUuid(
          state.id,
          `architect-plan:${commission.projectKey}:revision:${revision}:alternative:${index + 1}`,
        ),
        status: "pending_survey",
      })),
    };
  plan.recommendedAlternativeId = plan.alternatives[0].id;
  development.architectPlans.push(plan);
  commission.planning = {
    ...commission.planning,
    status: "surveying",
    planId: plan.id,
    planRevision: revision,
  };
  events.push({
    type: "village_architect_plan_started",
    planId: plan.id,
    commissionId: commission.id,
    projectKey: commission.projectKey,
    alternativeCount: plan.alternatives.length,
    actorId: plan.architectActorId,
    tick: state.tick,
  });
  return plan;
}

function alignApprovedGatehouseBoundary(development, plan, site, tick) {
  if (plan.projectKey !== "security_gatehouse") return;
  const perimeter = development.masterPlan.defenseStrategy.perimeter,
    enclosure = site.enclosures?.find(
      (candidate) => candidate.purpose === "defensive_perimeter",
    );
  if (!perimeter.boundary || !enclosure) return;
  const previous = structuredClone(perimeter.boundary);
  perimeter.boundary = {
    x: enclosure.x,
    y: enclosure.y,
    width: enclosure.w,
    height: enclosure.h,
    gates: enclosure.gates.map((gate) => ({ ...gate })),
  };
  perimeter.revisions ??= [];
  perimeter.revisions.push({
    architectPlanId: plan.id,
    previousBoundary: previous,
    approvedBoundary: structuredClone(perimeter.boundary),
    revisedAtTick: tick,
  });
}

function approvedMasterPlanException(selected, allowException, reason) {
  const assessment = selected?.assessment?.masterPlan;
  if (!assessment || assessment.valid) return null;
  if (!allowException)
    throw new Error(
      "The selected site conflicts with the settlement master plan.",
    );
  if (String(reason ?? "").trim().length < 12)
    throw new Error("A master-plan exception requires a visible reeve reason.");
  return {
    districtKey: assessment.districtKey,
    conflicts: [...assessment.conflicts],
    reason,
  };
}

export function decideVillageArchitectPlan(
  state,
  {
    planId,
    alternativeId = null,
    outcome,
    reason,
    source = "player",
    allowMasterPlanException = false,
  },
  events = [],
) {
  const development = ensureVillageDevelopment(state),
    board = development.strategyBoard,
    administrator = villageAdministrator(state),
    plan = development.architectPlans.find(
      (candidate) => candidate.id === planId,
    ),
    commission = board.commissions.find(
      (candidate) => candidate.id === plan?.commissionId,
    );
  if (!administrator) throw new Error("The village has no reeve.");
  if (!plan) throw new Error(`Unknown architect plan: ${planId}`);
  if (!commission) throw new Error("The architect plan has no commission.");
  if (
    !["approved", "deferred", "rejected", "revision_requested"].includes(
      outcome,
    )
  )
    throw new Error(`Unsupported architect plan decision: ${outcome}`);
  if (plan.status !== "awaiting_approval")
    throw new Error(
      "The architect must finish every survey before a decision.",
    );
  const selected =
    outcome === "approved"
      ? plan.alternatives.find(
          (candidate) =>
            candidate.id === (alternativeId ?? plan.recommendedAlternativeId),
        )
      : null;
  if (outcome === "approved" && !selected)
    throw new Error("Choose a surveyed site alternative to approve.");
  if (selected && selected.status !== "surveyed")
    throw new Error("The selected site has not been surveyed.");
  const masterPlanException = approvedMasterPlanException(
    selected,
    allowMasterPlanException,
    reason,
  );
  if (
    selected &&
    (selected.billOfMaterials?.lumber >
      (commission.budget?.materials?.lumber ?? 0) ||
      selected.billOfMaterials?.laborUnits >
        (commission.budget?.laborUnits ?? 0))
  )
    throw new Error(
      "The selected architect plan exceeds the approved commission budget.",
    );
  board.revision += 1;
  const decision = {
    id: namedUuid(
      state.id,
      `architect-plan-decision:${board.revision}:${plan.id}:${outcome}`,
    ),
    definitionId: definitionId("architect-plan-decision", outcome),
    entityType: "architect-plan-decision",
    planId: plan.id,
    commissionId: commission.id,
    projectKey: commission.projectKey,
    alternativeId: selected?.id ?? null,
    outcome,
    reason,
    source,
    masterPlanException,
    decidedByActorId: administrator.id,
    decidedAtTick: state.tick,
  };
  development.architectPlanDecisions.push(decision);
  plan.status = outcome;
  plan.latestDecisionId = decision.id;
  plan.selectedAlternativeId = selected?.id ?? null;
  for (const alternative of plan.alternatives)
    if (outcome === "approved")
      alternative.status =
        alternative.id === selected.id ? "selected" : "not_selected";
  if (outcome === "approved") {
    const site = {
      ...structuredClone(selected.site),
      architectPlanId: plan.id,
      architectAlternativeId: selected.id,
      commissionId: commission.id,
      proposalId: commission.proposalId,
      approvedByActorId: administrator.id,
      approvedAtTick: state.tick,
      masterPlanException,
    };
    development.constructionSites = development.constructionSites.filter(
      (candidate) => candidate.key !== site.key,
    );
    development.constructionSites.push(site);
    alignApprovedGatehouseBoundary(development, plan, site, state.tick);
    commission.planning = {
      ...commission.planning,
      status: "approved",
      planId: plan.id,
      selectedAlternativeId: selected.id,
      selectedSite: { x: site.x, y: site.y, w: site.w, h: site.h },
      approvedAtTick: state.tick,
    };
    const order = {
      id: namedUuid(state.id, `architect-work-order:${plan.id}`),
      definitionId: definitionId("village-work-order", commission.projectKey),
      entityType: "village-work-order",
      priorityKey: commission.projectKey,
      status: "active",
      issuedByActorId: administrator.id,
      issuedAtTick: state.tick,
      jobTypes: [
        "clear_building_site",
        "build_specialist_facility",
        "fell_tree",
        "saw_lumber",
      ],
      proposalId: commission.proposalId,
      decisionId: commission.decisionId,
      commissionId: commission.id,
      architectPlanId: plan.id,
      architectPlanDecisionId: decision.id,
      budget: structuredClone(commission.budget),
      assignments: structuredClone(commission.assignments),
    };
    development.workOrders.push(order);
    commission.planning.workOrderId = order.id;
  } else if (outcome === "revision_requested") {
    commission.planning = {
      ...commission.planning,
      status: "survey_pending",
      planId: null,
      revisionReason: reason,
    };
  } else {
    commission.planning = {
      ...commission.planning,
      status: outcome,
    };
  }
  events.push({
    type: "village_architect_plan_decided",
    planId: plan.id,
    commissionId: commission.id,
    projectKey: commission.projectKey,
    alternativeId: selected?.id ?? null,
    outcome,
    reason,
    actorId: administrator.id,
    actorName: administrator.name,
    tick: state.tick,
  });
  return { plan, decision, commission, alternative: selected };
}

// function-length-exempt: template -- complete strategy audit projection
export function auditVillageStrategy(state) {
  const development = ensureVillageDevelopment(state),
    board = development.strategyBoard,
    violations = [],
    pendingGates = [];
  for (const proposalRecord of board.proposalQueue) {
    if (!proposalRecord.requesterActorId)
      violations.push({
        code: "proposal_requester_missing",
        proposalId: proposalRecord.id,
      });
    if (proposalRecord.proposalKind === "specialist") {
      if (
        !["superseded", "withdrawn"].includes(proposalRecord.status) &&
        proposalRecord.demand?.status !== "demonstrated"
      )
        violations.push({
          code: "specialist_demand_unproven",
          proposalId: proposalRecord.id,
        });
      for (const field of [
        "rooms",
        "fixtures",
        "storage",
        "utilities",
        "access",
        "safety",
        "inputs",
        "outputs",
        "staffing",
      ])
        if (!proposalRecord.requirements?.[field]?.length)
          violations.push({
            code: `specialist_requirement_${field}_missing`,
            proposalId: proposalRecord.id,
          });
      if ((proposalRecord.revision ?? 1) > 1) {
        const previous = board.proposalQueue.find(
          (candidate) => candidate.id === proposalRecord.previousProposalId,
        );
        if (
          !previous ||
          previous.proposalSeriesId !== proposalRecord.proposalSeriesId ||
          previous.supersededByProposalId !== proposalRecord.id
        )
          violations.push({
            code: "specialist_revision_lineage_invalid",
            proposalId: proposalRecord.id,
          });
      }
    }
    if (proposalRecord.status !== "approved") continue;
    const decision = board.decisions.find(
        (candidate) => candidate.id === proposalRecord.latestDecisionId,
      ),
      commission = board.commissions.find(
        (candidate) => candidate.id === proposalRecord.commissionId,
      );
    if (!decision || decision.outcome !== "approved")
      violations.push({
        code: "approval_decision_missing",
        proposalId: proposalRecord.id,
      });
    if (!commission)
      violations.push({
        code: "approved_proposal_uncommissioned",
        proposalId: proposalRecord.id,
      });
  }
  for (const commission of board.commissions) {
    const proposalRecord = board.proposalQueue.find(
      (candidate) => candidate.id === commission.proposalId,
    );
    if (!commission.authorizedByActorId)
      violations.push({
        code: "commission_authorizer_missing",
        commissionId: commission.id,
      });
    if (!commission.budget || commission.budget.laborUnits == null)
      violations.push({
        code: "commission_budget_missing",
        commissionId: commission.id,
      });
    if (!commission.assignments?.crewActorIds?.length)
      violations.push({
        code: "commission_crew_missing",
        commissionId: commission.id,
      });
    if (commission.budgetUsage?.status === "exceeded")
      violations.push({
        code: "commission_budget_exceeded",
        commissionId: commission.id,
        budgetUsage: structuredClone(commission.budgetUsage),
      });
    if (
      proposalRecord?.proposalKind === "specialist" &&
      !commission.planning?.architectActorId
    )
      pendingGates.push({
        code: "architect_assignment_pending",
        phase: "V3",
        commissionId: commission.id,
        planningStatus: commission.planning?.status ?? "unplanned",
      });
    if (
      proposalRecord?.proposalKind === "specialist" &&
      commission.planning?.architectActorId &&
      !["approved", "operating"].includes(commission.planning?.status)
    )
      pendingGates.push({
        code: "architect_plan_pending",
        phase: "V3",
        commissionId: commission.id,
        planningStatus: commission.planning.status,
      });
  }
  for (const plan of development.architectPlans) {
    const commission = board.commissions.find(
        (candidate) => candidate.id === plan.commissionId,
      ),
      budget = commission?.budget,
      approvedAlternative = plan.alternatives?.find(
        (alternative) => alternative.id === plan.selectedAlternativeId,
      );
    if (!plan.architectActorId)
      violations.push({
        code: "architect_plan_actor_missing",
        planId: plan.id,
      });
    if ((plan.alternatives?.length ?? 0) < 2)
      violations.push({
        code: "architect_plan_alternatives_missing",
        planId: plan.id,
      });
    if (plan.status === "approved" && !approvedAlternative)
      violations.push({
        code: "architect_plan_selection_missing",
        planId: plan.id,
      });
    if (
      approvedAlternative &&
      (approvedAlternative.billOfMaterials?.lumber >
        (budget?.materials?.lumber ?? 0) ||
        approvedAlternative.billOfMaterials?.laborUnits >
          (budget?.laborUnits ?? 0))
    )
      violations.push({
        code: "architect_plan_over_budget",
        planId: plan.id,
        commissionId: commission?.id ?? null,
        billOfMaterials: structuredClone(approvedAlternative.billOfMaterials),
        budget: structuredClone(budget ?? null),
      });
  }
  for (const order of development.workOrders.filter(
    (candidate) => candidate.status === "active",
  )) {
    for (const field of ["proposalId", "decisionId", "commissionId"])
      if (!order[field])
        violations.push({
          code: `work_order_${field.replace("Id", "")}_missing`,
          workOrderId: order.id,
        });
    if (!order.assignments?.crewActorIds?.length)
      violations.push({
        code: "work_order_crew_missing",
        workOrderId: order.id,
      });
  }
  for (const job of state.village.jobs.filter(
    (candidate) => candidate.plan?.workOrderId,
  )) {
    const order = development.workOrders.find(
      (candidate) => candidate.id === job.plan.workOrderId,
    );
    if (!order)
      violations.push({ code: "job_work_order_unknown", jobId: job.id });
    for (const field of ["proposalId", "decisionId", "commissionId"])
      if (!job.plan[field])
        violations.push({
          code: `job_${field.replace("Id", "")}_missing`,
          jobId: job.id,
        });
    if (!job.plan.allowedActorIds?.length)
      violations.push({ code: "job_crew_missing", jobId: job.id });
    if (
      job.jobType === "build_specialist_facility" &&
      !development.architectPlans.some(
        (plan) =>
          plan.id === job.plan.architectPlanId && plan.status === "approved",
      )
    )
      violations.push({
        code: "specialist_blueprint_unapproved",
        jobId: job.id,
      });
  }
  return { violations, pendingGates };
}

function updateStrategyBoard(state, development, events) {
  const board = development.strategyBoard,
    activeProjectKey = PRIORITY_PROJECT[development.activePriority],
    initialProposal = board.proposalQueue.find(
      (candidate) => candidate.projectKey === activeProjectKey,
    ),
    priorityRecord = development.priorities.find(
      (candidate) => candidate.key === development.activePriority,
    );
  board.leaderActorId = villageAdministrator(state)?.id ?? board.leaderActorId;
  if (!initialProposal) {
    board.activeProposalId = null;
    board.activeCommissionId = null;
    return null;
  }
  if (initialProposal.status === "submitted")
    decideVillageProposal(
      state,
      {
        proposalId: initialProposal.id,
        outcome: "approved",
        reason: priorityRecord?.reason ?? initialProposal.reason,
        source: "reeve_autonomy",
      },
      events,
    );
  const proposalRecord = board.proposalQueue.find(
    (candidate) => candidate.projectKey === activeProjectKey,
  );
  const commission = board.commissions.find(
    (candidate) => candidate.id === proposalRecord.commissionId,
  );
  if (commission) commissionForProposal(state, development, proposalRecord);
  board.activeProposalId = proposalRecord.id;
  board.activeCommissionId = commission?.id ?? null;
  for (const projectRecord of development.projects)
    linkProjectAuthority(board, projectRecord);
  return commission ?? null;
}

function linkProjectAuthority(board, projectRecord) {
  const proposal = board.proposalQueue.find(
      (item) => item.projectKey === projectRecord.key,
    ),
    commission = board.commissions.find(
      (item) => item.projectKey === projectRecord.key,
    );
  projectRecord.proposalId = proposal?.id ?? null;
  projectRecord.commissionId = commission?.id ?? null;
  projectRecord.authorizedByActorId = commission?.authorizedByActorId ?? null;
}

// function-length-exempt: template -- work-order state construction
function createWorkOrder(state, development, administrator, commission) {
  return {
    id: namedUuid(
      state.id,
      `village-work-order:${development.orderRevision}:${development.activePriority}`,
    ),
    definitionId: definitionId(
      "village-work-order",
      development.activePriority,
    ),
    entityType: "village-work-order",
    priorityKey: development.activePriority,
    status: "active",
    issuedByActorId: administrator.id,
    issuedAtTick: state.tick,
    jobTypes: [...(PRIORITY_WORK[development.activePriority] ?? [])],
    proposalId: commission.proposalId,
    decisionId: commission.decisionId,
    commissionId: commission.id,
    budget: structuredClone(commission.budget),
    assignments: structuredClone(commission.assignments),
  };
}

function issueWorkOrder(state, development, administrator, commission, events) {
  const current = development.workOrders.find(
    (order) => order.id === development.activeOrderId,
  );
  if (
    current?.priorityKey === development.activePriority &&
    current.commissionId === commission?.id &&
    current.status === "active"
  )
    return current;
  if (!commission || commission.status === "suspended") return null;
  if (current) current.status = "superseded";
  development.orderRevision += 1;
  const order = createWorkOrder(state, development, administrator, commission);
  development.workOrders.push(order);
  development.activeOrderId = order.id;
  events.push({
    type: "village_work_order_issued",
    orderId: order.id,
    priority: order.priorityKey,
    actorId: administrator.id,
    actorName: administrator.name ?? "Village reeve",
    tick: state.tick,
  });
  return order;
}

function foundingCoreComplete(development) {
  return development.projects.every((project) => project.status === "complete");
}

function activeSpecialistCommission(development) {
  const board = development.strategyBoard;
  return board.commissions.find((commission) => {
    const proposalRecord = board.proposalQueue.find(
      (proposal) => proposal.id === commission.proposalId,
    );
    return (
      proposalRecord?.proposalKind === "specialist" &&
      !["operating", "rejected"].includes(commission.status)
    );
  });
}

function autoApproveSpecialistProposal(state, development, events) {
  if (
    state.village.scenario !== "founding" ||
    !foundingCoreComplete(development)
  )
    return null;
  if (activeSpecialistCommission(development)) return null;
  const board = development.strategyBoard,
    proposalRecord = SPECIALIST_AUTONOMY_ORDER.map((projectKey) =>
      latestProposalForProject(board, projectKey),
    ).find((proposal) => proposal?.status === "submitted");
  if (!proposalRecord) return null;
  board.leaderActorId ??= villageAdministrator(state)?.id ?? null;
  return decideVillageProposal(
    state,
    {
      proposalId: proposalRecord.id,
      outcome: "approved",
      reason: `The founding strategy authorizes ${proposalRecord.name.toLowerCase()}.`,
      source: "reeve_autonomy",
    },
    events,
  );
}

function clearingStorageCapacity(state) {
  const logs = stock(state, "lumber_camp_logs");
  return Math.max(0, (logs?.capacity ?? 0) - (logs?.quantity ?? 0));
}

function authorizeClearingStorage(state, plan, alternative, events) {
  const required =
      alternative.assessment.treeCells.length * TREE_WOOD_YIELDS.pine,
    expansion = Math.max(0, required - clearingStorageCapacity(state));
  if (!expansion) return;
  const logs = stock(state, "lumber_camp_logs"),
    quantity = Math.ceil(expansion / 10) * 10;
  logs.capacity += quantity;
  state.village.storageExpansions ??= [];
  state.village.storageExpansions.push({
    id: namedUuid(state.id, `clearing-storage:${plan.id}`),
    planId: plan.id,
    stockpileId: logs.id,
    quantity,
    reason: "architect_site_clearing_laydown",
    authorizedAtTick: state.tick,
  });
  events.push({
    type: "clearing_storage_authorized",
    planId: plan.id,
    quantity,
    tick: state.tick,
  });
}

function affordableSurveyedAlternative(plan, commission) {
  return plan.alternatives
    .filter(
      (alternative) =>
        alternative.status === "surveyed" &&
        alternative.billOfMaterials.lumber <=
          (commission?.budget?.materials?.lumber ?? 0) &&
        (alternative.billOfMaterials.stone ?? 0) <=
          (commission?.budget?.materials?.stone ?? 0) &&
        alternative.billOfMaterials.laborUnits <=
          (commission?.budget?.laborUnits ?? 0),
    )
    .sort(
      (left, right) =>
        left.assessment.treeCells.length - right.assessment.treeCells.length ||
        left.rank - right.rank,
    )[0];
}

function flagPlanBudgetRevision(state, plan, commission, events) {
  plan.status = "budget_revision_required";
  if (commission) commission.planning.status = "budget_revision_required";
  events.push({
    type: "architect_plan_budget_revision_required",
    planId: plan.id,
    commissionId: plan.commissionId,
    tick: state.tick,
  });
}

function autoApproveArchitectPlan(state, development, events) {
  if (
    state.village.scenario !== "founding" ||
    !foundingCoreComplete(development)
  )
    return null;
  const plan = development.architectPlans.find(
    (candidate) => candidate.status === "awaiting_approval",
  );
  if (!plan) return null;
  const commission = development.strategyBoard.commissions.find(
      (candidate) => candidate.id === plan.commissionId,
    ),
    selected = affordableSurveyedAlternative(plan, commission);
  if (!selected) {
    flagPlanBudgetRevision(state, plan, commission, events);
    return null;
  }
  authorizeClearingStorage(state, plan, selected, events);
  return decideVillageArchitectPlan(
    state,
    {
      planId: plan.id,
      alternativeId: selected.id,
      outcome: "approved",
      reason: "The reeve accepts the architect's best valid surveyed site.",
      source: "reeve_autonomy",
    },
    events,
  );
}

function refreshCommissions(state, development, events) {
  for (const commission of development.strategyBoard.commissions) {
    const proposalRecord = development.strategyBoard.proposalQueue.find(
      (candidate) => candidate.id === commission.proposalId,
    );
    if (proposalRecord?.status === "approved")
      commissionForProposal(state, development, proposalRecord);
    if (proposalRecord)
      assignCommissionArchitect(state, commission, proposalRecord, events);
  }
}

function directActivePriority(state, development, events) {
  const administrator = villageAdministrator(state);
  if (!administrator) return;
  development.administratorActorId = administrator.id;
  const commission = updateStrategyBoard(state, development, events);
  issueWorkOrder(state, development, administrator, commission, events);
  administrator.objective = "govern_village";
  administrator.currentAction = `Directing ${development.activePriority.replaceAll("_", " ")}`;
  administrator.actionReason = "village_priority";
}

function foundingFarmWorkStarted(state) {
  if (seasonalPlantingUnderway(state)) return true;
  return state.village.jobs.some(
    (job) =>
      ["grow_grain", "grow_vegetables"].includes(job.jobType) &&
      !["completed", "cancelled"].includes(job.status),
  );
}

function parallelHousingProposal(state, development) {
  if (state.village.scenario !== "founding") return null;
  if (development.activePriority !== "food_security") return null;
  if (!facilityComplete(state, "lumber_yard")) return null;
  if (!foundingFarmWorkStarted(state)) return null;
  if (stockQuantity(state, "lumber_yard_lumber") < 60) return null;
  return development.strategyBoard.proposalQueue.find(
    (proposalRecord) =>
      proposalRecord.projectKey === "housing" &&
      proposalRecord.status === "submitted",
  );
}

function authorizeParallelFoundingHousing(state, development, events) {
  const proposalRecord = parallelHousingProposal(state, development);
  if (!proposalRecord) return null;
  return decideVillageProposal(
    state,
    {
      proposalId: proposalRecord.id,
      outcome: "approved",
      reason:
        "Surplus builders may begin the first home while food specialists continue seasonal work.",
      source: "reeve_parallel_survival_authority",
    },
    events,
  );
}

function mayorReviewDue(state, development) {
  return (
    !development.residentNeedsAssessment ||
    state.tick >= development.nextResidentNeedsReviewAtTick
  );
}

function perimeterTrigger(state) {
  const living = state.village.npcStates.filter(
      (actor) => actor.life?.status !== "dead",
    ).length,
    attacks = state.village.incidents.filter(
      (incident) => incident.kind === "danger",
    ).length,
    weapons = stockQuantity(state, "smithy_weapons"),
    treasury = state.village.trade?.treasuryCp ?? 0;
  if (living >= 25) return { key: "population_25", value: living };
  if (attacks >= 2) return { key: "repeated_attack", value: attacks };
  if (weapons >= 8 || treasury >= 2000)
    return { key: "valuable_stores", value: Math.max(weapons, treasury) };
  return null;
}

function perimeterRects(state, development) {
  return [...state.village.buildings, ...development.constructionSites]
    .map((entry) => ({
      x: entry.x,
      y: entry.y,
      w: entry.w ?? entry.width,
      h: entry.h ?? entry.height,
    }))
    .filter((entry) =>
      [entry.x, entry.y, entry.w, entry.h].every(Number.isFinite),
    );
}

function plannedPerimeterBoundary(state, development) {
  const rects = perimeterRects(state, development),
    muster = development.masterPlan.defenseStrategy.musterPoint.position,
    buffer = 32,
    minX = Math.min(muster.x - 16, ...rects.map((entry) => entry.x)) - buffer,
    minY = Math.min(muster.y - 16, ...rects.map((entry) => entry.y)) - buffer,
    maxX =
      Math.max(muster.x + 16, ...rects.map((entry) => entry.x + entry.w - 1)) +
      buffer,
    maxY =
      Math.max(muster.y + 16, ...rects.map((entry) => entry.y + entry.h - 1)) +
      buffer,
    horizontalY = Math.max(minY + 1, Math.min(maxY - 1, muster.y)),
    verticalX = Math.max(minX + 1, Math.min(maxX - 1, muster.x));
  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
    gates: [
      { edge: "west", lane: 0, x: minX, y: horizontalY },
      { edge: "west", lane: 1, x: minX, y: horizontalY + 1 },
      { edge: "east", lane: 0, x: maxX, y: horizontalY },
      { edge: "east", lane: 1, x: maxX, y: horizontalY + 1 },
      { edge: "north", lane: 0, x: verticalX, y: minY },
      { edge: "north", lane: 1, x: verticalX + 1, y: minY },
      { edge: "south", lane: 0, x: verticalX, y: maxY },
      { edge: "south", lane: 1, x: verticalX + 1, y: maxY },
    ],
  };
}

function authorizePerimeter(state, development, events) {
  const defense = development.masterPlan.defenseStrategy,
    trigger = perimeterTrigger(state);
  if (defense.perimeter.status !== "deferred" || !trigger) return;
  Object.assign(defense.perimeter, {
    status: "authorized",
    trigger,
    authorizedAtTick: state.tick,
    boundary: plannedPerimeterBoundary(state, development),
  });
  const gatehouse = defense.facilities.find(
    (entry) => entry.key === "gatehouse",
  );
  Object.assign(gatehouse, { status: "planned", unblockedAtTick: state.tick });
  events.push({
    type: "village_perimeter_authorized",
    scope: "village",
    trigger: trigger.key,
    boundary: structuredClone(defense.perimeter.boundary),
    tick: state.tick,
  });
}

function livingResidentIds(state) {
  return new Set(
    state.village.npcStates
      .filter((resident) => resident.life?.status !== "dead")
      .map((resident) => resident.id),
  );
}

function activeHouseholds(state, living) {
  return (state.village.households ?? []).filter((household) =>
    household.memberIds?.some((id) => living.has(id)),
  );
}

function expansionHouseholdLot(household, index) {
  const column = index % 8,
    row = Math.floor(index / 8);
  return {
    householdKey: household.key,
    x: -106 + column * 16,
    y: 58 + row * 12,
    use: "expansion_cottage",
    plannedForPopulationGrowth: true,
  };
}

function ensureHouseholdPlanningCapacity(state, masterPlan, households) {
  const planned = new Set(
    masterPlan.householdLots.map((lot) => lot.householdKey),
  );
  for (const household of households) {
    if (planned.has(household.key)) continue;
    masterPlan.householdLots.push(
      expansionHouseholdLot(household, masterPlan.householdLots.length),
    );
    planned.add(household.key);
  }
}

function syncPlannedFacilityStatus(state, masterPlan) {
  for (const facility of masterPlan.plannedFacilities) {
    if (facility.key === "civic_cemetery" && state.village.civic?.cemetery) {
      facility.status = "designated";
      facility.site = structuredClone(state.village.civic.cemetery);
      continue;
    }
    const building = state.village.buildings.find(
        (candidate) =>
          candidate.key === facility.key ||
          candidate.facilityKey === facility.key ||
          candidate.name === facility.name,
      ),
      site = state.village.development.constructionSites.find(
        (candidate) => candidate.key === facility.key,
      );
    facility.status =
      building?.status === "complete"
        ? "complete"
        : site
          ? (site.status ?? "commissioned")
          : facility.key === "lumber_yard"
            ? "planned"
            : "future";
  }
}

function habitableHoldingHomeKeys(state) {
  const buildingIds = new Set(
    state.village.residences
      .filter((residence) => residence.habitable)
      .map((residence) => residence.buildingId),
  );
  return new Set(
    state.village.buildings
      .filter((building) => buildingIds.has(building.id))
      .map((building) => building.key),
  );
}

function syncHouseholdHoldingGate(state, masterPlan, events) {
  const holdings = masterPlan.householdHoldings ?? [],
    habitable = habitableHoldingHomeKeys(state);
  if (
    !holdings.length ||
    !holdings.every((item) => habitable.has(item.dwellingSiteKey))
  )
    return;
  const released = holdings.some((item) => item.status.startsWith("deferred_"));
  for (const holding of holdings)
    if (holding.status.startsWith("deferred_"))
      holding.status = "ready_for_boundary_survey";
  const evolution = masterPlan.settlementEvolution;
  evolution.currentStage = "family_hamlet";
  for (const stage of evolution.stages)
    if (stage.key === "founding_village") stage.status = "complete";
    else if (stage.key === "family_hamlet") stage.status = "active";
  if (released)
    events.push({
      type: "household_holdings_released",
      scope: "village",
      tick: state.tick,
    });
}

function planningResponse(demand, masterPlan, needs) {
  const priorities = [];
  if (
    demand.hungryResidents ||
    needs.foodOutlook.availablePortions < demand.foodPortionTarget
  )
    priorities.push("food_security");
  if (demand.housingShortfall) priorities.push("housing");
  return {
    priorities,
    requiredHomeCapacity: demand.housingShortfall,
    plannedHouseholdLots: masterPlan.householdLots.length,
    reviewedAtTick: needs.assessedAtTick,
  };
}

function townPlanSignature(demand, response) {
  return JSON.stringify({
    demand,
    priorities: response.priorities,
    requiredHomeCapacity: response.requiredHomeCapacity,
    plannedHouseholdLots: response.plannedHouseholdLots,
  });
}

function townPlanDemand(state, development, households, living) {
  const residenceCapacity = state.village.residences
      .filter((residence) => residence.habitable)
      .reduce((total, residence) => total + residence.residentCapacity, 0),
    hungry = state.village.npcStates.filter(
      (resident) =>
        living.has(resident.id) && resident.life?.needs?.hunger <= 40,
    ).length;
  return {
    population: living.size,
    households: households.length,
    residenceCapacity,
    housingShortfall: Math.max(0, living.size - residenceCapacity),
    foodPortionTarget: living.size * 3,
    hungryResidents: hungry,
    activePriority: development.activePriority,
  };
}

function refreshAdaptiveTownPlan(state, development, events) {
  const masterPlan = development.masterPlan,
    living = livingResidentIds(state),
    households = activeHouseholds(state, living);
  ensureHouseholdPlanningCapacity(state, masterPlan, households);
  syncPlannedFacilityStatus(state, masterPlan);
  syncHouseholdHoldingGate(state, masterPlan, events);
  const demand = townPlanDemand(state, development, households, living),
    response = planningResponse(
      demand,
      masterPlan,
      development.residentNeedsAssessment,
    ),
    signature = townPlanSignature(demand, response);
  if (signature === masterPlan.demandSignature) {
    masterPlan.planningResponse.reviewedAtTick = response.reviewedAtTick;
    return;
  }
  masterPlan.version = (masterPlan.version ?? 1) + 1;
  masterPlan.demand = demand;
  masterPlan.planningResponse = response;
  masterPlan.demandSignature = signature;
  masterPlan.updatedAtTick = state.tick;
  events.push({
    type: "village_master_plan_revised",
    scope: "village",
    version: masterPlan.version,
    demand: structuredClone(demand),
    tick: state.tick,
  });
}

function conductMayorReview(state, development, events) {
  const previous = development.activePriority;
  development.strategyAssessment = assessFoundingStrategy(state);
  development.residentNeedsAssessment = assessResidentNeeds(state);
  development.priorities = villagePriorities(state);
  development.activePriority = development.priorities[0]?.key ?? null;
  Object.assign(development.residentNeedsAssessment, {
    recommendedPriority: development.activePriority,
    recommendationReason: development.priorities[0]?.reason ?? null,
  });
  development.lastResidentNeedsReviewAtTick = state.tick;
  development.nextResidentNeedsReviewAtTick =
    state.tick + MAYOR_REVIEW_INTERVAL_TICKS;
  refreshAdaptiveTownPlan(state, development, events);
  authorizePerimeter(state, development, events);
  directActivePriority(state, development, events);
  return previous;
}

export function updateVillageDevelopment(state, events = []) {
  syncFoundingFacilityStructures(state);
  const development = ensureVillageDevelopment(state);
  updateProjects(state, development);
  updateSpecialistProposals(state, development, events);
  autoApproveSpecialistProposal(state, development, events);
  refreshCommissions(state, development, events);
  autoApproveArchitectPlan(state, development, events);
  updateCommissionBudgets(state, development);
  if (mayorReviewDue(state, development)) {
    const previous = conductMayorReview(state, development, events);
    if (previous && previous !== development.activePriority)
      events.push({
        type: "village_priority_changed",
        previous,
        priority: development.activePriority,
        tick: state.tick,
      });
  }
  authorizeParallelFoundingHousing(state, development, events);
  return development;
}
