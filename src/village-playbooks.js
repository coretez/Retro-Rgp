import { RESIDENT_JOB_TEMPLATES } from "./village-economy.js";
import { DEVELOPMENT_JOB_TEMPLATES } from "./village-development.js";
import { LIFE_JOB_TYPES } from "./village-life.js";

const templates = [...RESIDENT_JOB_TEMPLATES, ...DEVELOPMENT_JOB_TEMPLATES];
const templateTypes = new Set(templates.map((template) => template.jobType));
const transferTypes = new Set(["deliver_goods", "haul_stock"]);

function compileJob(commandId, jobType, expectedAction, input = {}) {
  return Object.freeze({
    commandId,
    jobType,
    expectedAction,
    input: { ...input },
  });
}

export function gatherWildFood(input) {
  return compileJob("gather_wild_food", "gather_wild_food", "gather", input);
}

export function craftFishingNet(input) {
  return compileJob("craft_fishing_net", "craft_fishing_net", "produce", input);
}

export function catchRiverFish(input) {
  return compileJob("catch_river_fish", "catch_fish", "produce", input);
}

export function haulPhysicalStock(input) {
  return compileJob("haul_physical_stock", "haul_stock", "transfer", input);
}

export function craftHuntingBow(input) {
  return compileJob("craft_hunting_bow", "craft_hunting_bow", "produce", input);
}

export function huntWildGame(input) {
  return compileJob("hunt_wild_game", "hunt_game", "produce", input);
}

export function prepareCropCell(input) {
  return compileJob("prepare_crop_cell", "grow_grain", "prepare", input);
}

export function sowCropCell(input) {
  return compileJob("sow_crop_cell", "grow_grain", "sow", input);
}

export function growCrop(input) {
  return compileJob("grow_crop", "grow_grain", "grow", input);
}

export function waterCrop(input) {
  return compileJob("water_crop", "water_fields", "water", input);
}

export function harvestCropCell(input) {
  return compileJob("harvest_crop_cell", "grow_grain", "harvest", input);
}

export function saveCropSeed(input) {
  return compileJob("save_crop_seed", "save_seed", "produce", input);
}

export function prepareFishMeal(input) {
  return compileJob("prepare_fish_meal", "prepare_meal", "produce", input);
}

export function prepareGrainMeal(input) {
  return compileJob("prepare_grain_meal", "bake_grain_meal", "produce", input);
}

export function prepareVegetableMeal(input) {
  return compileJob(
    "prepare_vegetable_meal",
    "cook_vegetable_stew",
    "produce",
    input,
  );
}

export function prepareMeatMeal(input) {
  return compileJob("prepare_meat_meal", "cook_beef_stew", "produce", input);
}

export function eatPreparedMeal(input) {
  return compileJob("eat_prepared_meal", "eat_meal", "satisfy_need", input);
}

const command = (id, execute, contract) =>
  Object.freeze({ id, execute, ...contract });

export const VILLAGE_COMMANDS = Object.freeze({
  gather_wild_food: command("gather_wild_food", gatherWildFood, {
    jobType: "gather_wild_food",
    input: "reachable edible forage patch",
    output: "physical wild forage in bounded basket storage",
  }),
  craft_fishing_net: command("craft_fishing_net", craftFishingNet, {
    jobType: "craft_fishing_net",
    input: "netting fiber and an operating fishing hut",
    output: "reusable fishing net in bounded rack storage",
  }),
  catch_river_fish: command("catch_river_fish", catchRiverFish, {
    jobType: "catch_fish",
    input: "reachable valid water access and fishing equipment",
    output: "physical fish at the river-bank catch container",
  }),
  haul_physical_stock: command("haul_physical_stock", haulPhysicalStock, {
    jobType: "haul_stock",
    input: "physical source stock and compatible free destination capacity",
    output: "conserved stock moved between bounded containers",
  }),
  craft_hunting_bow: command("craft_hunting_bow", craftHuntingBow, {
    jobType: "craft_hunting_bow",
    input: "lumber, fiber, and a forge or field bowyer stump",
    output: "usable hunting bow in bounded equipment storage",
  }),
  hunt_wild_game: command("hunt_wild_game", huntWildGame, {
    jobType: "hunt_game",
    input: "reachable game, hunting bow, ammunition, and safe firing access",
    output: "physical butchered meat in bounded food storage",
  }),
  prepare_crop_cell: command("prepare_crop_cell", prepareCropCell, {
    jobType: "grow_grain",
    input: "clear cultivable field cell",
    output: "physically prepared crop cell",
  }),
  sow_crop_cell: command("sow_crop_cell", sowCropCell, {
    jobType: "grow_grain",
    input: "prepared crop cell and conserved seed",
    output: "planted crop cell with persisted planting tick",
  }),
  grow_crop: command("grow_crop", growCrop, {
    jobType: "grow_grain",
    input: "planted crop cell with valid light, moisture, and fertility",
    output: "persisted crop growth and maturity state",
  }),
  water_crop: command("water_crop", waterCrop, {
    jobType: "water_fields",
    input: "dry planted plot and physically available water",
    output: "increased persisted crop moisture",
  }),
  harvest_crop_cell: command("harvest_crop_cell", harvestCropCell, {
    jobType: "grow_grain",
    input: "mature reachable crop cell",
    output: "fractional physical field pile with provenance",
  }),
  save_crop_seed: command("save_crop_seed", saveCropSeed, {
    jobType: "save_seed",
    input: "stored grain above the protected food reserve",
    output: "conserved seed in bounded seed storage",
  }),
  prepare_fish_meal: command("prepare_fish_meal", prepareFishMeal, {
    jobType: "prepare_meal",
    input: "stored fish and an operating cookery position",
    output: "prepared meal in bounded meal storage",
  }),
  prepare_grain_meal: command("prepare_grain_meal", prepareGrainMeal, {
    jobType: "bake_grain_meal",
    input: "stored grain and an operating cookery position",
    output: "prepared meals in bounded meal storage",
  }),
  prepare_vegetable_meal: command(
    "prepare_vegetable_meal",
    prepareVegetableMeal,
    {
      jobType: "cook_vegetable_stew",
      input: "stored vegetables and an operating cookery position",
      output: "prepared meal in bounded meal storage",
    },
  ),
  prepare_meat_meal: command("prepare_meat_meal", prepareMeatMeal, {
    jobType: "cook_beef_stew",
    input: "stored meat and an operating cookery position",
    output: "prepared meals in bounded meal storage",
  }),
  eat_prepared_meal: command("eat_prepared_meal", eatPreparedMeal, {
    jobType: "eat_meal",
    input: "reachable prepared meal",
    output: "meal consumed and resident hunger restored",
  }),
});

const step = (commandId, requires = []) =>
  Object.freeze({ commandId, requires: Object.freeze([...requires]) });

export const FOOD_PLAYBOOKS = Object.freeze({
  emergency_forage: Object.freeze({
    goal: "Bridge an immediate meal shortage without replacing farming.",
    steps: Object.freeze([
      step("gather_wild_food"),
      step("haul_physical_stock", ["gather_wild_food"]),
    ]),
  }),
  river_fishing: Object.freeze({
    goal: "Land and store a conserved river harvest.",
    steps: Object.freeze([
      step("craft_fishing_net"),
      step("catch_river_fish", ["craft_fishing_net"]),
      step("haul_physical_stock", ["catch_river_fish"]),
    ]),
  }),
  hunting: Object.freeze({
    goal: "Turn reachable wild game into physically stored meat.",
    steps: Object.freeze([
      step("craft_hunting_bow"),
      step("hunt_wild_game", ["craft_hunting_bow"]),
      step("haul_physical_stock", ["hunt_wild_game"]),
    ]),
  }),
  grain_cycle: Object.freeze({
    goal: "Grow grain from field preparation through protected seed reserve.",
    steps: Object.freeze([
      step("prepare_crop_cell"),
      step("sow_crop_cell", ["prepare_crop_cell"]),
      step("grow_crop", ["sow_crop_cell"]),
      step("water_crop", ["sow_crop_cell"]),
      step("harvest_crop_cell", ["grow_crop"]),
      step("haul_physical_stock", ["harvest_crop_cell"]),
      step("save_crop_seed", ["haul_physical_stock"]),
    ]),
  }),
  meal_service: Object.freeze({
    goal: "Convert stored ingredients into meals and feed hungry residents.",
    alternatives: Object.freeze([
      "prepare_fish_meal",
      "prepare_grain_meal",
      "prepare_vegetable_meal",
      "prepare_meat_meal",
    ]),
    steps: Object.freeze([
      step("prepare_fish_meal"),
      step("eat_prepared_meal", ["prepare_fish_meal"]),
    ]),
  }),
});

export function commandExecutorKind(jobType) {
  if (LIFE_JOB_TYPES.has(jobType)) return "life";
  if (transferTypes.has(jobType)) return "transfer";
  if (templateTypes.has(jobType)) return "production";
  return null;
}

function validateCommand(commandId) {
  const item = VILLAGE_COMMANDS[commandId],
    errors = [];
  if (!item) return [`Unknown command ${commandId}.`];
  if (typeof item.execute !== "function")
    errors.push("Missing command function.");
  if (!commandExecutorKind(item.jobType))
    errors.push("Missing runtime executor.");
  const compiled = item.execute({ validationProbe: true });
  if (compiled.commandId !== commandId)
    errors.push("Function compiled wrong command.");
  if (compiled.jobType !== item.jobType)
    errors.push("Function compiled wrong job type.");
  if (!item.input || !item.output)
    errors.push("Missing physical I/O contract.");
  return errors.map((error) => `${commandId}: ${error}`);
}

function playbookCommandIds(playbook) {
  return [
    ...playbook.steps.map((item) => item.commandId),
    ...(playbook.alternatives ?? []),
  ];
}

export function validateVillagePlaybooks(playbooks = FOOD_PLAYBOOKS) {
  const errors = [];
  for (const [playbookId, playbook] of Object.entries(playbooks)) {
    const commandIds = new Set(playbookCommandIds(playbook));
    for (const commandId of commandIds)
      errors.push(...validateCommand(commandId));
    for (const item of playbook.steps)
      for (const requirement of item.requires)
        if (!commandIds.has(requirement))
          errors.push(
            `${playbookId}: ${item.commandId} requires absent ${requirement}.`,
          );
  }
  return Object.freeze({
    valid: errors.length === 0,
    errors: Object.freeze(errors),
  });
}

export function foodPlaybookAudit() {
  const validation = validateVillagePlaybooks();
  return Object.freeze({
    ...validation,
    playbooks: Object.keys(FOOD_PLAYBOOKS).length,
    commands: Object.keys(VILLAGE_COMMANDS).length,
    executors: Object.fromEntries(
      Object.entries(VILLAGE_COMMANDS).map(([id, item]) => [
        id,
        commandExecutorKind(item.jobType),
      ]),
    ),
  });
}
