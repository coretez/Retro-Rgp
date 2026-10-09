import { definitionId, namedUuid } from "./identity.js";
import {
  animalAdultName,
  animalAgeDays,
  animalLifeStage,
  animalSpecies,
} from "./village-animal-species.js";
import { regionalEntityUpdateDue } from "./village-region-simulation.js";

const CATTLE_STARTS = Object.freeze([
  { x: -19, y: 27, sex: "female", name: "Brindle" },
  { x: -16, y: 29, sex: "male", name: "Alder" },
  { x: -13, y: 26, sex: "female", name: "Clover" },
]);

const WILDLIFE_STARTS = Object.freeze([
  { x: -54, y: 16, name: "Red deer 1" },
  { x: -52, y: 31, name: "Red deer 2" },
  { x: -47, y: 43, name: "Red deer 3" },
  { x: 33, y: 42, name: "Red deer 4" },
]);

const DOMESTIC_STARTS = Object.freeze([
  ["pig", "female", "Hazel", -12, 26],
  ["pig", "male", "Bramble", -10, 27],
  ["sheep", "female", "Willow", -18, 31],
  ["sheep", "male", "Thistle", -16, 32],
  ["dog", "female", "Moss", -6, 18],
  ["dog", "male", "Flint", -4, 19],
  ["chicken", "female", "Speckle", -14, 34],
  ["chicken", "female", "Honey", -13, 35],
  ["chicken", "female", "Ash", -12, 34],
  ["chicken", "male", "Copper", -11, 35],
]);

const WILD_STARTS = Object.freeze([
  ["wolf", "female", "Grey wolf 1", -61, -34],
  ["wolf", "male", "Grey wolf 2", -58, -31],
  ["wild_boar", "female", "Wild sow 1", 49, 38],
  ["wild_boar", "male", "Wild boar 1", 52, 41],
  ["bear", "female", "Brown bear 1", 72, -48],
  ["bear", "male", "Brown bear 2", 77, -45],
]);

const GRAZING_SEASONS = Object.freeze([
  Object.freeze({ key: "spring", until: 90, regrowth: 0.18 }),
  Object.freeze({ key: "summer", until: 180, regrowth: 0.12 }),
  Object.freeze({ key: "autumn", until: 270, regrowth: 0.06 }),
  Object.freeze({ key: "winter", until: 360, regrowth: 0 }),
]);

const WILDLIFE_RULES = Object.freeze({
  deer: Object.freeze({ capacity: 12, refuge: 2, migrationDays: 14 }),
  wild_boar: Object.freeze({ capacity: 6, refuge: 2, migrationDays: 21 }),
  wolf: Object.freeze({ capacity: 4, prey: Object.freeze(["deer"]) }),
  bear: Object.freeze({
    capacity: 2,
    prey: Object.freeze(["deer", "wild_boar"]),
  }),
});

const SEASONAL_HABITAT = Object.freeze({
  spring: 1,
  summer: 1,
  autumn: 0.85,
  winter: 0.65,
});

const ANIMAL_DISEASES = Object.freeze({
  hoof_rot: Object.freeze({ durationDays: 6, dailyDamage: 2 }),
  respiratory_infection: Object.freeze({ durationDays: 8, dailyDamage: 3 }),
  parasites: Object.freeze({ durationDays: 10, dailyDamage: 1 }),
});

const FARMSTEAD_BARN_EDGE = Object.freeze(
  Array.from({ length: 8 }, (_, index) =>
    Object.freeze({ x: -23, y: 25 + index }),
  ),
);

export const FARMSTEAD_PASTURE = Object.freeze({
  key: "farmstead_pasture",
  name: "Founders' cattle pasture",
  x: -23,
  y: 24,
  w: 14,
  h: 10,
  gate: Object.freeze({ x: -10, y: 28 }),
  barnAccess: Object.freeze({ x: -23, y: 28 }),
  barnBuildingKey: "farmstead",
  naturalBarrierCells: FARMSTEAD_BARN_EDGE,
  capacity: 6,
  capacityUnits: 12,
  allowedSpecies: Object.freeze(["cow", "sheep"]),
  waterSource: "pasture trough",
  fenceMaterial: "timber",
});

export function animalFootprint(animal) {
  const width = animal.width ?? 2,
    height = animal.height ?? 1,
    cells = [];
  for (let y = 0; y < height; y += 1)
    for (let x = 0; x < width; x += 1)
      cells.push({ x: animal.position.x + x, y: animal.position.y + y });
  return cells;
}

export function livingAnimals(state, species = null) {
  return (state.village.animals ?? []).filter(
    (animal) =>
      animal.status !== "dead" && (!species || animal.species === species),
  );
}

function animalRange(x, y, domestic) {
  const radius = domestic ? 2 : 7;
  return {
    x: x - radius,
    y: y - radius,
    width: radius * 2 + 1,
    height: radius * 2 + 1,
  };
}

function baseAnimal(runId, serial, start, domestic) {
  const [species, sex, name, x, y] = start,
    definition = animalSpecies(species),
    [width, height] = definition.adultSize;
  return {
    id: namedUuid(runId, `village-animal:${species}:${serial}`),
    definitionId: definitionId("animal", species),
    entityType: "animal",
    species,
    name,
    sex,
    ageStage: "adult",
    position: { x, y },
    width,
    height,
    facing: serial % 2 ? "west" : "east",
    health: 100,
    hunger: 0,
    thirst: 0,
    status: domestic ? "tethered" : "wild",
    activity: domestic ? "Waiting with the settlers" : "Foraging in the wild",
    homePastureId: null,
    ...(domestic ? { tetherPosition: { x, y } } : {}),
    homeRange: animalRange(x, y, domestic),
  };
}

function startingAnimals(runId) {
  return DOMESTIC_STARTS.map((start, index) =>
    baseAnimal(runId, `domestic:${index + 1}`, start, true),
  );
}

function startingWildlife(runId) {
  return WILD_STARTS.map((start, index) =>
    baseAnimal(runId, `wild:${index + 1}`, start, false),
  );
}

function cattle(runId, index) {
  const start = CATTLE_STARTS[index];
  return {
    id: namedUuid(runId, `village-animal:cow:${index + 1}`),
    definitionId: definitionId("animal", "cow"),
    entityType: "animal",
    species: "cow",
    name: start.name,
    sex: start.sex,
    ageStage: "adult",
    position: { x: start.x, y: start.y },
    width: 2,
    height: 1,
    facing: index % 2 ? "west" : "east",
    health: 100,
    hunger: 0,
    thirst: 0,
    status: "tethered",
    activity: "Grazing near the tether",
    homePastureId: null,
    tetherPosition: { x: start.x, y: start.y },
    homeRange: {
      x: start.x - 1,
      y: start.y - 1,
      width: 4,
      height: 3,
    },
  };
}

function wildGame(
  runId,
  serial,
  start = WILDLIFE_STARTS[serial % WILDLIFE_STARTS.length],
) {
  return {
    id: namedUuid(runId, `village-animal:deer:${serial + 1}`),
    definitionId: definitionId("animal", "deer"),
    entityType: "animal",
    species: "deer",
    name: start.name ?? `Red deer ${serial + 1}`,
    sex: serial % 2 ? "male" : "female",
    ageStage: "adult",
    position: { x: start.x, y: start.y },
    width: 1,
    height: 1,
    facing: serial % 2 ? "west" : "east",
    health: 60,
    hunger: 0,
    thirst: 0,
    status: "wild",
    activity: "Browsing for forage",
    homePastureId: null,
    homeRange: {
      x: start.x - 5,
      y: start.y - 5,
      width: 11,
      height: 11,
    },
  };
}

export function createVillageAnimals(runId, scenario = "established") {
  const count = scenario === "founding" ? 2 : 3;
  return [
    ...Array.from({ length: count }, (_, index) => cattle(runId, index)),
    ...startingAnimals(runId),
    ...WILDLIFE_STARTS.map((start, index) => wildGame(runId, index, start)),
    ...startingWildlife(runId),
  ];
}

export function createFarmsteadPasture(runId, enclosure = FARMSTEAD_PASTURE) {
  const forageCapacity = pastureForageCapacity(enclosure);
  return {
    id: namedUuid(runId, `pasture:${enclosure.key}`),
    definitionId: definitionId("pasture", enclosure.key),
    entityType: "pasture",
    status: "complete",
    forageCapacity,
    forageUnits: forageCapacity,
    forageSeason: "spring",
    lastForageDay: 1,
    ...structuredClone(enclosure),
    gate: {
      ...structuredClone(enclosure.gate),
      id: namedUuid(runId, `pasture-gate:${enclosure.key}`),
      entityType: "gate",
      material: enclosure.fenceMaterial,
      state: "closed",
    },
  };
}

function pastureForageCapacity(site) {
  const cells = Math.max(1, (site.w - 2) * (site.h - 2));
  return Math.max(4, Math.floor(cells * 0.25));
}

export function grazingSeason(day) {
  const seasonDay = ((Math.max(1, day) - 1) % 360) + 1;
  return GRAZING_SEASONS.find((season) => seasonDay <= season.until);
}

export function wildlifeCarryingCapacity(species, day) {
  const base = WILDLIFE_RULES[species]?.capacity ?? 0,
    multiplier = SEASONAL_HABITAT[grazingSeason(day).key] ?? 1;
  return Math.max(1, Math.floor(base * multiplier));
}

function pastureGrowthBetween(site, fromDay, throughDay) {
  let growth = 0;
  for (let day = fromDay; day <= throughDay; day += 1)
    growth += site.forageCapacity * grazingSeason(day).regrowth;
  return growth;
}

export function refreshPastureForage(site, day) {
  site.forageCapacity ??= pastureForageCapacity(site);
  site.forageUnits ??= site.forageCapacity;
  site.lastForageDay ??= day;
  if (day > site.lastForageDay)
    site.forageUnits = Math.min(
      site.forageCapacity,
      site.forageUnits +
        pastureGrowthBetween(site, site.lastForageDay + 1, day),
    );
  site.lastForageDay = Math.max(site.lastForageDay, day);
  site.forageSeason = grazingSeason(day).key;
  return site.forageUnits;
}

function housingPosition(site, index, width = 1) {
  const columns = Math.max(1, site.w - width - 1);
  return {
    x: site.x + 1 + (index % columns),
    y: site.y + 1 + Math.floor(index / columns),
  };
}

const MERCHANT_CATTLE = Object.freeze([
  ["cow", "female", "Dapple"],
  ["cow", "male", "Rowan"],
]);

function merchantAnimal(state, visitId, site, start, index) {
  const position = housingPosition(site, index, 2),
    animal = baseAnimal(
      state.id,
      `merchant:${visitId}:${index + 1}`,
      [...start, position.x, position.y],
      true,
    );
  animal.id = namedUuid(state.id, `merchant-livestock:${visitId}:${index + 1}`);
  animal.homePastureId = site.id;
  animal.status = "housed";
  animal.activity = housedAnimalActivity(animal, site);
  migrateAnimalLife(animal, state.village.clock?.day ?? 1);
  return animal;
}

export function restoreExtinctCattleFromMerchant(state, visitId) {
  if (livingAnimals(state, "cow").length) return [];
  const site = animalHousing(state, "cow");
  if (!site || !animalHousingAvailable(state, "cow", 2)) return [];
  const animals = MERCHANT_CATTLE.map((start, index) =>
    merchantAnimal(state, visitId, site, start, index),
  );
  state.village.animals.push(...animals);
  for (const animal of animals)
    recordAnimalLifeEvent(
      state,
      "merchant_livestock_arrival",
      animal,
      state.village.clock?.day ?? 1,
      { visitId, pastureId: site.id },
    );
  return animals;
}

function assignAnimalsToHousing(state, site) {
  const compatible = livingAnimals(state).filter((animal) =>
    (site.allowedSpecies ?? []).includes(animal.species),
  );
  for (const animal of compatible)
    if (animal.homePastureId !== site.id)
      Object.assign(animal, {
        pendingPastureId: site.id,
        status: "awaiting_transfer",
        activity: `Waiting to move to ${site.name}`,
      });
}

export function animalHousingDestination(state, animal) {
  const site = state.village.pastures?.find(
    (candidate) => candidate.id === animal?.pendingPastureId,
  );
  if (!site) return null;
  const occupants = livingAnimals(state).filter(
    (candidate) =>
      candidate.id !== animal.id && candidate.homePastureId === site.id,
  );
  return housingPosition(site, occupants.length, animal.width);
}

export function completeAnimalRelocation(state, animalId, position) {
  const animal = livingAnimals(state).find((item) => item.id === animalId),
    site = state.village.pastures?.find(
      (candidate) => candidate.id === animal?.pendingPastureId,
    );
  if (!animal || !site || !position) return null;
  animal.position = { ...position };
  animal.homePastureId = site.id;
  animal.pendingPastureId = null;
  animal.status = "housed";
  animal.activity = housedAnimalActivity(animal, site);
  animal.homeRange = {
    x: site.x + 1,
    y: site.y + 1,
    width: Math.max(1, site.w - 2),
    height: Math.max(1, site.h - 2),
  };
  return { animal, site };
}

export function installAnimalHousingSites(state, construction, elements = []) {
  const enclosures = (construction?.enclosures ?? []).filter(
    (enclosure) => enclosure.purpose === "animal_housing",
  );
  state.village.pastures ??= [];
  for (const enclosure of enclosures) {
    let site = state.village.pastures.find(
      (candidate) => candidate.key === enclosure.key,
    );
    site ??= createFarmsteadPasture(state.id, enclosure);
    if (!state.village.pastures.includes(site))
      state.village.pastures.push(site);
    const evidence = elements.filter(
      (element) => element.pastureKey === site.key,
    );
    site.evidenceIds = evidence.map((element) => element.id);
    site.gate.id =
      evidence.find((element) => element.kind === "gate")?.id ?? site.gate.id;
    assignAnimalsToHousing(state, site);
  }
  return enclosures.length;
}

function animalNumber(seed) {
  return [...seed].reduce(
    (value, character) => (value * 33 + character.charCodeAt(0)) >>> 0,
    5381,
  );
}

function deterministicRange(id, range, salt) {
  const [minimum, maximum] = range;
  return minimum + (animalNumber(`${id}:${salt}`) % (maximum - minimum + 1));
}

function updateAnimalAgeIdentity(animal, definition, stage) {
  const serial = animal.name?.match(/\d+$/)?.[0];
  animal.ageStage = stage;
  if (animal.generation > 0 && serial)
    animal.name = `${stage === "adult" ? animalAdultName(animal) : stage} ${serial}`;
  const size = stage === "adult" ? definition.adultSize : [1, 1];
  [animal.width, animal.height] = size;
}

function migrateAnimalLife(animal, day) {
  const definition = animalSpecies(animal.species);
  if (!definition) return;
  const adultAge = definition.maturityDays + 365;
  animal.birthDay ??= day - (animal.ageStage === "adult" ? adultAge : 0);
  animal.naturalDeathDay ??=
    animal.birthDay +
    deterministicRange(animal.id, definition.lifespanDays, "life");
  animal.motherId ??= null;
  animal.fatherId ??= null;
  animal.generation ??= 0;
  updateAnimalAgeIdentity(animal, definition, animalLifeStage(animal, day));
  animal.pregnancy ??= null;
  animal.dependentUntilDay ??= null;
  animal.nursingOffspringIds ??= [];
  animal.thirst ??= 0;
  if (animal.species === "cow" && animal.sex === "female")
    animal.lactatingUntilDay ??= day + definition.lactationDays;
}

function matureAnimal(animal, day) {
  const definition = animalSpecies(animal.species);
  return definition && animalAgeDays(animal, day) >= definition.maturityDays;
}

function availableParent(animals, sex, day) {
  return animals.find(
    (animal) => animal.sex === sex && matureAnimal(animal, day),
  );
}

export function canBreedAnimals(state, species) {
  const day = state.village.clock?.day ?? 1,
    animals = livingAnimals(state, species),
    mother = availableParent(animals, "female", day),
    father = availableParent(animals, "male", day);
  return Boolean(mother && !mother.pregnancy && father);
}

export function animalHousing(state, species) {
  const definition = animalSpecies(species);
  return (state.village.pastures ?? []).find(
    (site) =>
      site.status === "complete" &&
      (site.allowedSpecies ?? ["cow"]).includes(species) &&
      (!definition?.housing ||
        site.housing === definition.housing ||
        (definition.housing === "pasture" && !site.housing)),
  );
}

function housingUse(state, site) {
  return livingAnimals(state)
    .filter((animal) => animal.homePastureId === site.id)
    .reduce(
      (total, animal) =>
        total + (animalSpecies(animal.species)?.carryingUnits ?? 1),
      0,
    );
}

export function animalHousingAvailable(state, species, expected = 1) {
  const site = animalHousing(state, species),
    units = animalSpecies(species)?.carryingUnits ?? 1;
  if (!site) return false;
  return (
    housingUse(state, site) + expected * units <=
    (site.capacityUnits ?? site.capacity ?? 0)
  );
}

function reconcileCompletedHousing(state, animal) {
  const site = animalHousing(state, animal.species);
  if (!site) return;
  if (animal.pendingPastureId === site.id) return;
  if (pastureContains(site, animal.position, animal.width)) {
    animal.homePastureId = site.id;
    animal.pendingPastureId = null;
    animal.status = "housed";
    return;
  }
  animal.homePastureId = null;
  animal.pendingPastureId = site.id;
  animal.status = "awaiting_transfer";
  animal.activity = `Waiting to move to ${site.name}`;
}

export function beginAnimalBreeding(state, species) {
  const day = state.village.clock?.day ?? 1,
    definition = animalSpecies(species),
    herd = livingAnimals(state, species),
    mother = availableParent(herd, "female", day),
    father = availableParent(herd, "male", day);
  if (!definition || !mother || !father || mother.pregnancy) return null;
  const count = deterministicRange(
    `${mother.id}:${father.id}:${day}`,
    definition.offspringRange,
    "litter",
  );
  if (!animalHousingAvailable(state, species, count)) return null;
  mother.pregnancy = {
    fatherId: father.id,
    conceivedDay: day,
    dueDay: day + definition.gestationDays,
    offspringCount: count,
    process: definition.reproduction ?? "gestation",
  };
  return { mother, father, ...mother.pregnancy };
}

function newbornPosition(state, mother, index) {
  const site = state.village.pastures?.find(
      (candidate) => candidate.id === mother.homePastureId,
    ),
    occupied = new Set(
      livingAnimals(state).flatMap((animal) =>
        animalFootprint(animal).map((cell) => `${cell.x},${cell.y}`),
      ),
    );
  if (!site)
    return {
      x: mother.position.x - 1 + (index % 3),
      y: mother.position.y + 1 + Math.floor(index / 3),
    };
  let available = 0;
  const slots = Math.max(1, (site.w - 2) * (site.h - 2));
  for (let slot = 0; slot < slots; slot += 1) {
    const position = housingPosition(site, slot);
    if (occupied.has(`${position.x},${position.y}`)) continue;
    if (available === index) return position;
    available += 1;
  }
  return { ...mother.position };
}

function newbornStart(mother, definition, serial, position) {
  return [
    mother.species,
    serial % 2 ? "female" : "male",
    `${definition.juvenileName} ${serial}`,
    position.x,
    position.y,
  ];
}

function newbornAnimal(state, mother, father, index, day) {
  const definition = animalSpecies(mother.species),
    serial = ++state.village.animalSerial,
    id = namedUuid(state.id, `village-animal:${mother.species}:born:${serial}`),
    position = newbornPosition(state, mother, index);
  return {
    ...baseAnimal(
      state.id,
      `born:${serial}`,
      newbornStart(mother, definition, serial, position),
      definition.domestic,
    ),
    id,
    ageStage: definition.juvenileName,
    birthDay: day,
    naturalDeathDay:
      day + deterministicRange(id, definition.lifespanDays, "life"),
    motherId: mother.id,
    fatherId: father.id,
    generation: Math.max(mother.generation ?? 0, father.generation ?? 0) + 1,
    width: 1,
    height: 1,
    homePastureId: mother.homePastureId,
    status: definition.domestic ? "grazing" : "wild",
    dependentUntilDay:
      mother.pregnancy?.process === "incubation"
        ? null
        : day + (definition.weaningDays ?? 0),
  };
}

function deliverPregnancy(state, mother, day) {
  const pregnancy = mother.pregnancy,
    father = state.village.animals.find(
      (animal) => animal.id === pregnancy.fatherId,
    );
  if (!father) return [];
  const newborns = Array.from(
    { length: pregnancy.offspringCount },
    (_, index) => newbornAnimal(state, mother, father, index, day),
  );
  state.village.animals.push(...newborns);
  mother.nursingOffspringIds = newborns
    .filter((animal) => animal.dependentUntilDay)
    .map((animal) => animal.id);
  const lactationDays = animalSpecies(mother.species)?.lactationDays;
  if (lactationDays) mother.lactatingUntilDay = day + lactationDays;
  mother.pregnancy = null;
  return newborns;
}

function releaseWeanedOffspring(state, animal, day) {
  if (!animal.nursingOffspringIds?.length) return;
  animal.nursingOffspringIds = animal.nursingOffspringIds.filter((id) => {
    const child = state.village.animals.find(
      (candidate) => candidate.id === id,
    );
    return child?.status !== "dead" && child.dependentUntilDay > day;
  });
}

function recordAnimalLifeEvent(state, type, animal, day, details = {}) {
  state.village.animalLifeEvents ??= [];
  state.village.animalLifeEvents.push({
    type,
    animalId: animal.id,
    day,
    ...details,
  });
}

export function markAnimalDead(state, animal, cause, killerId = null) {
  if (!animal || (animal.status === "dead" && animal.deathDay != null))
    return null;
  const day = state.village.clock?.day ?? 1;
  Object.assign(animal, {
    status: "dead",
    deathDay: day,
    deathCause: cause,
    killedById: killerId,
    carcassState: "fresh",
    activity: `Fresh ${animal.species.replaceAll("_", " ")} carcass`,
  });
  recordAnimalLifeEvent(state, "death", animal, day, { cause, killerId });
  return animal;
}

function advanceCarcassDecay(state, day) {
  for (const animal of state.village.animals.filter(
    (candidate) => candidate.status === "dead" && candidate.deathDay != null,
  )) {
    if (animal.disposition) {
      animal.carcassState = "gone";
      continue;
    }
    if (animal.carcassState === "carried") continue;
    const age = day - animal.deathDay;
    animal.carcassState =
      age >= 30
        ? "gone"
        : age >= 10
          ? "bones"
          : animal.processedAtDay != null
            ? "dressed"
            : age >= 3
              ? "spoiled"
              : "fresh";
    animal.activity =
      animal.carcassState === "gone"
        ? "Carcass fully decayed"
        : `${animal.carcassState} ${animal.species.replaceAll("_", " ")} carcass`;
  }
}

export function advanceAnimalLifecycle(state) {
  const day = state.village.clock?.day ?? 1;
  if (state.village.lastAnimalLifecycleDay === day) return [];
  state.village.lastAnimalLifecycleDay = day;
  const born = [];
  advanceCarcassDecay(state, day);
  for (const animal of livingAnimals(state)) {
    const previousStage = animal.ageStage;
    migrateAnimalLife(animal, day);
    if (previousStage !== animal.ageStage)
      recordAnimalLifeEvent(state, "life_stage", animal, day, {
        previousStage,
        ageStage: animal.ageStage,
      });
    releaseWeanedOffspring(state, animal, day);
    if (day >= animal.naturalDeathDay) {
      markAnimalDead(state, animal, "natural_death");
    } else if (animal.pregnancy?.dueDay <= day) {
      const litter = deliverPregnancy(state, animal, day);
      born.push(...litter);
      for (const newborn of litter)
        recordAnimalLifeEvent(state, "birth", newborn, day);
    }
  }
  return born;
}

function animalFeedNeed(animal, day) {
  const definition = animalSpecies(animal.species);
  if (!definition?.domestic) return 0;
  if (animal.dependentUntilDay > day) return 0;
  const juvenile = animal.ageStage !== "adult" ? 0.5 : 1,
    nursing = animal.nursingOffspringIds?.length ? 1.25 : 1;
  return definition.feedUnitsPerDay * juvenile * nursing;
}

function animalWaterNeed(animal, day) {
  const definition = animalSpecies(animal.species);
  if (!definition?.domestic) return 0;
  if (animal.dependentUntilDay > day) return 0;
  const juvenile = animal.ageStage !== "adult" ? 0.5 : 1,
    nursing = animal.nursingOffspringIds?.length ? 1.25 : 1;
  return definition.waterUnitsPerDay * juvenile * nursing;
}

function applyFeedCoverage(animal, coverage) {
  if (coverage >= 1) {
    animal.hunger = Math.max(0, animal.hunger - 15);
    return;
  }
  animal.hunger = Math.min(
    100,
    animal.hunger + Math.max(8, 30 * (1 - coverage)),
  );
  if (animal.hunger >= 70) animal.health = Math.max(0, animal.health - 5);
  if (animal.health <= 0) animal.status = "dead";
}

function applyWaterCoverage(animal, coverage) {
  if (coverage >= 1) {
    animal.thirst = Math.max(0, animal.thirst - 20);
    return;
  }
  animal.thirst = Math.min(
    100,
    animal.thirst + Math.max(12, 40 * (1 - coverage)),
  );
  if (animal.thirst >= 65) animal.health = Math.max(0, animal.health - 8);
  if (animal.health <= 0) animal.status = "dead";
}

function animalPasture(state, animal) {
  return state.village.pastures?.find(
    (site) => site.id === animal.homePastureId && site.status === "complete",
  );
}

function grazeAnimal(state, animal, need, day) {
  const site = animalPasture(state, animal),
    fraction = animalSpecies(animal.species)?.grazingFraction ?? 0;
  if (!site || fraction <= 0 || need <= 0) return { amount: 0, site: null };
  refreshPastureForage(site, day);
  const amount = Math.min(site.forageUnits, need * fraction);
  site.forageUnits -= amount;
  return { amount, site };
}

function grazingAllocations(state, domestic, needs, day) {
  const byAnimal = {},
    byPasture = {};
  domestic.forEach((animal, index) => {
    const grazing = grazeAnimal(state, animal, needs[index], day);
    byAnimal[animal.id] = grazing.amount;
    if (grazing.site)
      byPasture[grazing.site.id] =
        (byPasture[grazing.site.id] ?? 0) + grazing.amount;
  });
  return { byAnimal, byPasture };
}

function animalFeedCoverage(domestic, needs, grazing, storedCoverage) {
  return Object.fromEntries(
    domestic.map((animal, index) => {
      const need = needs[index],
        grazed = grazing.byAnimal[animal.id] ?? 0,
        stored = Math.max(0, need - grazed) * storedCoverage;
      return [animal.id, need ? (grazed + stored) / need : 1];
    }),
  );
}

function consumeAnimalFeed(state, domestic) {
  const day = state.village.clock?.day ?? 1,
    needs = domestic.map((animal) => animalFeedNeed(animal, day)),
    totalNeed = needs.reduce((total, amount) => total + amount, 0),
    grazing = grazingAllocations(state, domestic, needs, day),
    grazed = Object.values(grazing.byAnimal).reduce(
      (sum, value) => sum + value,
      0,
    ),
    storedNeed = Math.max(0, totalNeed - grazed),
    stockpile = state.village.stockpiles.find(
      (item) => item.key === "stable_feed",
    ),
    consumed = Math.min(stockpile?.quantity ?? 0, storedNeed),
    storedCoverage = storedNeed ? consumed / storedNeed : 1;
  if (stockpile) stockpile.quantity -= consumed;
  return {
    totalNeed,
    storedNeed,
    consumed,
    grazed,
    coverage: totalNeed ? (grazed + consumed) / totalNeed : 1,
    animalCoverage: animalFeedCoverage(
      domestic,
      needs,
      grazing,
      storedCoverage,
    ),
    pastureConsumption: grazing.byPasture,
    stockpileId: stockpile?.id ?? null,
    season: grazingSeason(day).key,
  };
}

function consumeAnimalResource(state, domestic, needFor, key) {
  const day = state.village.clock?.day ?? 1,
    needs = domestic.map((animal) => needFor(animal, day)),
    totalNeed = needs.reduce((total, amount) => total + amount, 0),
    stockpile = state.village.stockpiles.find((item) => item.key === key),
    consumed = Math.min(stockpile?.quantity ?? 0, totalNeed),
    coverage = totalNeed ? consumed / totalNeed : 1;
  if (stockpile) stockpile.quantity -= consumed;
  return { totalNeed, consumed, coverage, stockpileId: stockpile?.id ?? null };
}

export function advanceAnimalHusbandry(state) {
  const day = state.village.clock?.day ?? 1;
  if (state.village.lastAnimalHusbandryDay === day) return null;
  state.village.lastAnimalHusbandryDay = day;
  const domestic = livingAnimals(state).filter(
      (animal) => animalSpecies(animal.species)?.domestic,
    ),
    feed = consumeAnimalFeed(state, domestic),
    water = consumeAnimalResource(
      state,
      domestic,
      animalWaterNeed,
      "stable_water",
    );
  domestic.forEach((animal) =>
    applyFeedCoverage(animal, feed.animalCoverage[animal.id] ?? 0),
  );
  domestic.forEach((animal) => applyWaterCoverage(animal, water.coverage));
  domestic
    .filter((animal) => animal.status === "dead" && animal.deathDay == null)
    .forEach((animal) => markAnimalDead(state, animal, "husbandry_failure"));
  const entry = { day, ...feed, feed, water };
  state.village.animalHusbandryLedger ??= [];
  state.village.animalHusbandryLedger.push(entry);
  return entry;
}

function nearbyCarcass(state, animal) {
  return state.village.animals.some(
    (candidate) =>
      candidate.status === "dead" &&
      candidate.carcassState !== "gone" &&
      Math.abs(candidate.position.x - animal.position.x) +
        Math.abs(candidate.position.y - animal.position.y) <=
        4,
  );
}

function animalDiseaseRisk(state, animal, day) {
  const site = animalPasture(state, animal),
    winter = grazingSeason(day).key === "winter" ? 8 : 0,
    depleted = site && site.forageUnits < site.forageCapacity * 0.2 ? 8 : 0,
    crowded =
      site && housingUse(state, site) > (site.capacityUnits ?? 0) ? 12 : 0,
    carcass = nearbyCarcass(state, animal) ? 18 : 0;
  return winter + depleted + crowded + carcass;
}

function speciesDisease(animal) {
  if (["cow", "sheep"].includes(animal.species)) return "hoof_rot";
  if (["pig", "chicken"].includes(animal.species)) return "parasites";
  return "respiratory_infection";
}

export function infectAnimal(state, animal, kind = speciesDisease(animal)) {
  if (!animal || animal.status === "dead" || animal.disease) return null;
  const day = state.village.clock?.day ?? 1;
  animal.disease = { kind, startedDay: day, treatedDay: null };
  animal.activity = `Sick with ${kind.replaceAll("_", " ")}`;
  state.village.animalDiseaseLedger ??= [];
  state.village.animalDiseaseLedger.push({
    type: "infection",
    animalId: animal.id,
    kind,
    day,
  });
  return animal.disease;
}

export function treatAnimalDisease(state, animal) {
  if (!animal?.disease || animal.status === "dead") return null;
  const day = state.village.clock?.day ?? 1;
  animal.disease.treatedDay = day;
  animal.health = Math.min(100, animal.health + 5);
  state.village.animalDiseaseLedger ??= [];
  state.village.animalDiseaseLedger.push({
    type: "treatment",
    animalId: animal.id,
    kind: animal.disease.kind,
    day,
  });
  return animal.disease;
}

function recoverAnimalDisease(state, animal, day) {
  const disease = animal.disease;
  animal.disease = null;
  animal.activity = "Recovering after veterinary care";
  state.village.animalDiseaseLedger.push({
    type: "recovery",
    animalId: animal.id,
    kind: disease.kind,
    day,
  });
}

function progressAnimalDisease(state, animal, day) {
  const disease = animal.disease,
    definition = ANIMAL_DISEASES[disease.kind];
  if (disease.treatedDay != null && day > disease.treatedDay)
    return recoverAnimalDisease(state, animal, day);
  if (day - disease.startedDay >= definition.durationDays)
    return recoverAnimalDisease(state, animal, day);
  animal.health = Math.max(0, animal.health - definition.dailyDamage);
  animal.activity = `Sick with ${disease.kind.replaceAll("_", " ")}`;
  if (animal.health <= 0) markAnimalDead(state, animal, "disease");
}

function exposeAnimalToDisease(state, animal, day) {
  const risk = animalDiseaseRisk(state, animal, day),
    scheduled = day % 7 === animalNumber(animal.id) % 7,
    roll = animalNumber(`${animal.id}:${day}:disease`) % 100;
  if (scheduled && roll < risk) infectAnimal(state, animal);
}

export function advanceAnimalDisease(state) {
  const day = state.village.clock?.day ?? 1;
  if (state.village.lastAnimalDiseaseDay === day) return null;
  state.village.lastAnimalDiseaseDay = day;
  state.village.animalDiseaseLedger ??= [];
  for (const animal of livingAnimals(state).filter(
    (candidate) => animalSpecies(candidate.species)?.domestic,
  ))
    if (animal.disease) progressAnimalDisease(state, animal, day);
    else exposeAnimalToDisease(state, animal, day);
  return state.village.animalDiseaseLedger.at(-1) ?? null;
}

export function canMilkAnimal(animal, day) {
  return Boolean(
    animal?.species === "cow" &&
    animal.sex === "female" &&
    matureAnimal(animal, day) &&
    animal.status !== "dead" &&
    animal.health > 40 &&
    animal.homePastureId &&
    animal.productionDays?.milk !== day &&
    animal.lactatingUntilDay >= day,
  );
}

function healthyHousedAdult(animal, day) {
  return Boolean(
    animal.homePastureId &&
    animal.ageStage === "adult" &&
    animal.health > 40 &&
    animal.hunger < 70 &&
    animal.thirst < 65 &&
    matureAnimal(animal, day),
  );
}

function canLayEggs(animal, day) {
  return Boolean(
    animal.species === "chicken" &&
    animal.sex === "female" &&
    healthyHousedAdult(animal, day) &&
    animal.productionDays?.eggs !== day,
  );
}

function canShearAnimal(animal, day) {
  const lastDay = animal.productionDays?.wool;
  return Boolean(
    animal.species === "sheep" &&
    healthyHousedAdult(animal, day) &&
    (lastDay == null || day - lastDay >= 180),
  );
}

function canCollectManure(animal, day) {
  return Boolean(
    healthyHousedAdult(animal, day) && animal.productionDays?.manure !== day,
  );
}

export function recordAnimalProduction(animal, effect, day) {
  if (!animal || !["milk", "eggs", "wool", "manure"].includes(effect))
    return false;
  animal.productionDays ??= {};
  animal.productionDays[effect] = day;
  return true;
}

export function canCullAnimal(state, animal) {
  if (!animal || animal.status === "dead" || animal.pregnancy) return false;
  if (animal.nursingOffspringIds?.length) return false;
  const adults = livingAnimals(state, animal.species).filter(
    (candidate) => candidate.ageStage === "adult",
  );
  const sameSex = adults.filter((candidate) => candidate.sex === animal.sex);
  return adults.length > 2 && sameSex.length > 1;
}

export function animalProductionCandidates(state, species, effect) {
  const day = state.village.clock?.day ?? 1,
    animals = livingAnimals(state, species);
  if (effect === "milk")
    return animals.filter((animal) => canMilkAnimal(animal, day));
  if (effect === "eggs")
    return animals.filter((animal) => canLayEggs(animal, day));
  if (effect === "wool")
    return animals.filter((animal) => canShearAnimal(animal, day));
  if (effect === "manure")
    return animals.filter((animal) => canCollectManure(animal, day));
  if (effect === "relocate")
    return animals.filter((animal) => animal.pendingPastureId);
  if (effect === "treat")
    return animals.filter(
      (animal) => animal.disease && animal.disease.treatedDay == null,
    );
  if (effect === "slaughter")
    return animals.filter((animal) => canCullAnimal(state, animal));
  if (effect === "breed")
    return animals.filter(
      (animal) => animal.sex === "female" && matureAnimal(animal, day),
    );
  return animals;
}

// function-length-exempt: template -- persisted animal-state construction/migration
export function ensureVillageAnimals(state) {
  state.village.animals ??= createVillageAnimals(
    state.id,
    state.village.scenario,
  );
  state.village.pastures ??= [];
  state.village.wildlifeSerial ??= WILDLIFE_STARTS.length;
  if (!state.village.wildlifeInitialized) {
    for (const [index, start] of WILDLIFE_STARTS.entries()) {
      const id = namedUuid(state.id, `village-animal:deer:${index + 1}`);
      if (!state.village.animals.some((animal) => animal.id === id))
        state.village.animals.push(wildGame(state.id, index, start));
    }
    state.village.wildlifeInitialized = true;
  }
  if (!state.village.expandedAnimalsInitialized) {
    for (const animal of [
      ...startingAnimals(state.id),
      ...startingWildlife(state.id),
    ])
      if (
        !state.village.animals.some((candidate) => candidate.id === animal.id)
      )
        state.village.animals.push(animal);
    state.village.expandedAnimalsInitialized = true;
  }
  if (state.village.scenario !== "founding" && !state.village.pastures.length)
    state.village.pastures.push(createFarmsteadPasture(state.id));
  for (const pasture of state.village.pastures) {
    pasture.gate.id ??= namedUuid(state.id, `pasture-gate:${pasture.key}`);
    pasture.gate.entityType ??= "gate";
    pasture.gate.material ??= pasture.fenceMaterial ?? "timber";
    pasture.gate.state ??= "closed";
    refreshPastureForage(pasture, state.village.clock?.day ?? 1);
  }
  state.village.animalSerial ??= state.village.animals.length;
  for (const animal of state.village.animals) {
    migrateAnimalLife(animal, state.village.clock?.day ?? 1);
    if (animal.status === "tethered" && !animal.tetherPosition)
      animal.tetherPosition = tetherAnchor(animal);
    animal.activity ??=
      animal.species === "cow"
        ? "Grazing near the tether"
        : "Browsing for forage";
  }
  for (const animal of state.village.animals)
    reconcileCompletedHousing(state, animal);
  return state.village.animals;
}

function tetherAnchor(animal) {
  const range = animal.homeRange;
  if (!range) return { ...animal.position };
  return {
    x: range.x + Math.floor((range.width - 1) / 2),
    y: range.y + Math.floor((range.height - 1) / 2),
  };
}

function areaContains(area, position, width = 1) {
  return (
    position.x >= area.x &&
    position.x + width - 1 < area.x + area.width &&
    position.y >= area.y &&
    position.y < area.y + area.height
  );
}

function migrantWildlife(state, species) {
  const serial = state.village.wildlifeSerial++,
    wildStart = WILD_STARTS.find((start) => start[0] === species),
    animal =
      species === "deer"
        ? wildGame(
            state.id,
            serial,
            WILDLIFE_STARTS[serial % WILDLIFE_STARTS.length],
          )
        : baseAnimal(state.id, `migrant:${serial}`, wildStart, false);
  animal.id = namedUuid(
    state.id,
    `village-animal:${species}:migrant:${serial}`,
  );
  animal.name = `Migrant ${animalSpecies(species).name} ${serial}`;
  state.village.animals.push(animal);
  return animal;
}

function migrateWildlife(state, species, day) {
  const rule = WILDLIFE_RULES[species],
    capacity = wildlifeCarryingCapacity(species, day),
    count = livingAnimals(state, species).length,
    threshold = Math.max(rule.refuge, Math.ceil(capacity * 0.4));
  state.village.nextWildlifeMigrationDay ??= {};
  state.village.nextWildlifeMigrationDay[species] ??= day + rule.migrationDays;
  if (
    count >= threshold ||
    day < state.village.nextWildlifeMigrationDay[species]
  )
    return null;
  state.village.nextWildlifeMigrationDay[species] = day + rule.migrationDays;
  return migrantWildlife(state, species);
}

function wildlifeBirth(state, species, day) {
  if (grazingSeason(day).key !== "spring" || day % 30 !== 0) return null;
  const herd = livingAnimals(state, species),
    mother = availableParent(herd, "female", day),
    father = availableParent(herd, "male", day);
  if (
    !mother ||
    !father ||
    herd.length >= wildlifeCarryingCapacity(species, day)
  )
    return null;
  const newborn = newbornAnimal(state, mother, father, 0, day);
  newborn.status = "wild";
  newborn.homePastureId = null;
  state.village.animals.push(newborn);
  recordAnimalLifeEvent(state, "wild_birth", newborn, day);
  return newborn;
}

function availableWildlifePrey(state, species, targeted) {
  const rule = WILDLIFE_RULES[species],
    herd = livingAnimals(state, species),
    assigned = herd.filter((animal) => targeted.has(animal.id)).length,
    available = herd.filter((animal) => !targeted.has(animal.id)),
    allowance = Math.max(0, herd.length - rule.refuge - assigned);
  if (!rule || herd.length <= rule.refuge) return [];
  return available.slice(0, allowance);
}

function assignPredatorTargets(state) {
  const targeted = new Set(
    livingAnimals(state)
      .map((animal) => animal.huntingTargetId)
      .filter(Boolean),
  );
  for (const predator of livingAnimals(state).filter(
    (animal) => WILDLIFE_RULES[animal.species]?.prey,
  )) {
    if (predator.huntingTargetId) continue;
    const prey = WILDLIFE_RULES[predator.species].prey.flatMap((species) =>
      availableWildlifePrey(state, species, targeted),
    )[0];
    if (!prey) continue;
    predator.huntingTargetId = prey.id;
    predator.activity = `Hunting ${prey.name}`;
    targeted.add(prey.id);
  }
}

function wildlifeCounts(state) {
  return Object.fromEntries(
    Object.keys(WILDLIFE_RULES).map((species) => [
      species,
      livingAnimals(state, species).length,
    ]),
  );
}

export function advanceWildlifeEcology(state) {
  const day = state.village.clock?.day ?? 1;
  if (state.village.lastWildlifeEcologyDay === day) return null;
  state.village.lastWildlifeEcologyDay = day;
  const migrants = [
      migrateWildlife(state, "deer", day),
      migrateWildlife(state, "wild_boar", day),
    ].filter(Boolean),
    births = [
      wildlifeBirth(state, "deer", day),
      wildlifeBirth(state, "wild_boar", day),
    ].filter(Boolean);
  assignPredatorTargets(state);
  const entry = {
    day,
    season: grazingSeason(day).key,
    capacities: Object.fromEntries(
      Object.keys(WILDLIFE_RULES).map((species) => [
        species,
        wildlifeCarryingCapacity(species, day),
      ]),
    ),
    counts: wildlifeCounts(state),
    migrantIds: migrants.map((animal) => animal.id),
    birthIds: births.map((animal) => animal.id),
    predationIds: [],
  };
  state.village.wildlifeEcologyLedger ??= [];
  state.village.wildlifeEcologyLedger.push(entry);
  return entry;
}

export function addCalf(state, pasture) {
  state.village.animalSerial = (state.village.animalSerial ?? 0) + 1;
  const serial = state.village.animalSerial,
    animal = cattle(state.id, serial % CATTLE_STARTS.length);
  animal.id = namedUuid(state.id, `village-animal:cow:${serial}`);
  animal.name = `Calf ${serial}`;
  animal.ageStage = "calf";
  animal.position = { x: pasture.x + 2, y: pasture.y + 2 };
  animal.homePastureId = pasture.id;
  animal.status = "grazing";
  state.village.animals.push(animal);
  return animal;
}

export function removeAnimal(state, animalId, cause = "hunted") {
  const animal = state.village.animals.find(
    (candidate) => candidate.id === animalId,
  );
  if (animal) {
    markAnimalDead(state, animal, cause);
    animal.carcassState = "dressed";
    animal.processedAtDay = state.village.clock?.day ?? 1;
    animal.activity = `Dressed ${animal.species.replaceAll("_", " ")} remains`;
  }
  return animal ?? null;
}

function pastureContains(pasture, position, width = 2) {
  return (
    position.x > pasture.x &&
    position.x + width - 1 < pasture.x + pasture.w - 1 &&
    position.y > pasture.y &&
    position.y < pasture.y + pasture.h - 1
  );
}

const ANIMAL_DIRECTIONS = Object.freeze([
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: 0, y: -1 },
]);

const ANIMAL_BLOCKED_TILES = new Set([
  "outdoor_tree",
  "outdoor_water",
  "outdoor_rock",
  "village_mine_floor",
  "village_sign",
  "village_building",
  "village_furniture",
  "village_construction",
  "village_door_closed",
  "village_door_locked",
  "village_gate_closed",
  "village_gate_locked",
  "village_pit",
  "village_fence",
]);

function pennedAnimal(animal) {
  return Boolean(animal.homePastureId);
}

function housedAnimalActivity(animal, pasture) {
  if (!pasture)
    return animal.status === "tethered"
      ? "Grazing near the tether"
      : "Foraging near camp";
  if (animal.species === "pig") return "Rooting in the pig pen";
  if (animal.species === "chicken") return "Foraging in the coop yard";
  if (animal.species === "dog") return "Resting in the kennel yard";
  return "Grazing in the pasture";
}

function animalMoveAllowed(
  animal,
  position,
  pasture,
  occupied,
  people,
  terrainAt,
) {
  const cells = animalFootprint({ ...animal, position }),
    penned = pennedAnimal(animal),
    range = penned ? (pasture ?? animal.homeRange) : animal.homeRange,
    contained =
      penned && pasture
        ? pastureContains(pasture, position, animal.width)
        : range && areaContains(range, position, animal.width),
    crowded = cells.some(
      (cell) =>
        occupied.has(`${cell.x},${cell.y}`) ||
        people.has(`${cell.x},${cell.y}`),
    ),
    blocked = cells.some((cell) =>
      ANIMAL_BLOCKED_TILES.has(terrainAt(cell)),
    );
  return contained && !crowded && !blocked;
}

function animalRecoveryPosition(animal, pasture, occupied, people, terrainAt) {
  const range = pennedAnimal(animal) ? (pasture ?? animal.homeRange) : animal.homeRange;
  if (!range) return null;
  const candidates = [];
  for (let y = range.y; y < range.y + range.height; y += 1)
    for (let x = range.x; x < range.x + range.width; x += 1) {
      const position = { x, y };
      if (animalMoveAllowed(animal, position, pasture, occupied, people, terrainAt))
        candidates.push(position);
    }
  return candidates.sort(
    (left, right) =>
      Math.abs(left.x - animal.position.x) + Math.abs(left.y - animal.position.y) -
        Math.abs(right.x - animal.position.x) - Math.abs(right.y - animal.position.y) ||
      left.y - right.y || left.x - right.x,
  )[0] ?? null;
}

function recoverBlockedAnimal(animal, pasture, occupied, people, terrainAt) {
  const blocked = animalFootprint(animal).some((cell) =>
    ANIMAL_BLOCKED_TILES.has(terrainAt(cell)),
  );
  if (!blocked) return false;
  const position = animalRecoveryPosition(
    animal, pasture, occupied, people, terrainAt,
  );
  if (position) animal.position = position;
  return Boolean(position);
}

function moveAnimal(state, animal, pasture, occupied, people, terrainAt) {
  for (const cell of animalFootprint(animal))
    occupied.delete(`${cell.x},${cell.y}`);
  if (recoverBlockedAnimal(animal, pasture, occupied, people, terrainAt)) {
    animal.activity = "Moving clear of an obstruction";
    for (const cell of animalFootprint(animal))
      occupied.add(`${cell.x},${cell.y}`);
    return;
  }
  const offset =
    (state.tick / 12 + state.village.animalSerial + animal.name.length) % 4;
  for (let index = 0; index < 4; index += 1) {
    const direction = ANIMAL_DIRECTIONS[(offset + index) % 4],
      position = {
        x: animal.position.x + direction.x,
        y: animal.position.y + direction.y,
      };
    if (
      !animalMoveAllowed(animal, position, pasture, occupied, people, terrainAt)
    )
      continue;
    animal.position = position;
    if (direction.x) animal.facing = direction.x > 0 ? "east" : "west";
    break;
  }
  for (const cell of animalFootprint(animal))
    occupied.add(`${cell.x},${cell.y}`);
}

function pursuitDistance(position, target) {
  return (
    Math.abs(position.x - target.position.x) +
    Math.abs(position.y - target.position.y)
  );
}

function pursuitPositionAllowed(animal, position, occupied, people, terrainAt) {
  return animalFootprint({ ...animal, position }).every(
    (cell) =>
      !occupied.has(`${cell.x},${cell.y}`) &&
      !people.has(`${cell.x},${cell.y}`) &&
      !ANIMAL_BLOCKED_TILES.has(terrainAt(cell)),
  );
}

function recordPredation(state, predator, prey) {
  const entry = state.village.wildlifeEcologyLedger?.at(-1),
    record = { predatorId: predator.id, preyId: prey.id };
  if (entry?.day === (state.village.clock?.day ?? 1))
    entry.predationIds.push(record);
  state.village.wildlifeEvents ??= [];
  state.village.wildlifeEvents.push({
    type: "predation",
    day: state.village.clock?.day ?? 1,
    ...record,
  });
}

function finishPredation(state, predator, prey) {
  markAnimalDead(state, prey, "predation", predator.id);
  recordPredation(state, predator, prey);
  predator.huntingTargetId = null;
  predator.lastWildlifeMealDay = state.village.clock?.day ?? 1;
  predator.activity = `Feeding on ${prey.name}`;
  prey.threatenedById = null;
}

function pursuitStep(predator, prey, occupied, people, terrainAt) {
  return ANIMAL_DIRECTIONS.map((direction) => ({
    x: predator.position.x + direction.x,
    y: predator.position.y + direction.y,
  }))
    .filter((position) =>
      pursuitPositionAllowed(predator, position, occupied, people, terrainAt),
    )
    .sort(
      (left, right) =>
        pursuitDistance(left, prey) - pursuitDistance(right, prey),
    )[0];
}

function takePursuitStep(predator, next) {
  if (!next) return;
  if (next.x > predator.position.x) predator.facing = "east";
  if (next.x < predator.position.x) predator.facing = "west";
  predator.position = next;
}

function advancePredatorPursuit(state, predator, occupied, people, terrainAt) {
  const prey = livingAnimals(state).find(
    (animal) => animal.id === predator.huntingTargetId,
  );
  if (!prey) {
    predator.huntingTargetId = null;
    return false;
  }
  prey.threatenedById = predator.id;
  prey.activity = `Fleeing from ${predator.name}`;
  if (pursuitDistance(predator.position, prey) <= 1) {
    finishPredation(state, predator, prey);
    return true;
  }
  for (const cell of animalFootprint(predator))
    occupied.delete(`${cell.x},${cell.y}`);
  takePursuitStep(
    predator,
    pursuitStep(predator, prey, occupied, people, terrainAt),
  );
  for (const cell of animalFootprint(predator))
    occupied.add(`${cell.x},${cell.y}`);
  predator.activity = `Hunting ${prey.name}`;
  return true;
}

function advanceAnimal(
  state,
  animal,
  pasture,
  occupied,
  people,
  terrainAt,
  workingTargets,
) {
  if (workingTargets.has(animal.id)) {
    animal.activity = "Receiving animal care";
    return;
  }
  const hour = state.village.clock?.hour ?? 12;
  if (hour >= 20 || hour < 5) {
    animal.activity = "Sleeping";
    return;
  }
  if (animal.disease) {
    animal.activity = `Sick with ${animal.disease.kind.replaceAll("_", " ")}`;
    return;
  }
  if (
    animal.huntingTargetId &&
    advancePredatorPursuit(state, animal, occupied, people, terrainAt)
  )
    return;
  animal.activity = animalSpecies(animal.species)?.domestic
    ? housedAnimalActivity(animal, pasture)
    : animalSpecies(animal.species)?.predator
      ? "Patrolling its hunting range"
      : "Browsing for forage";
  moveAnimal(state, animal, pasture, occupied, people, terrainAt);
}

function animalsDueToMove(state) {
  return livingAnimals(state).filter((animal) =>
    regionalEntityUpdateDue(state, animal, 12),
  );
}

export function advanceVillageAnimals(state, terrainAt) {
  advanceAnimalLifecycle(state);
  advanceWildlifeEcology(state);
  advanceAnimalHusbandry(state);
  advanceAnimalDisease(state);
  if (state.tick % 12 !== 0) return;
  const people = occupiedPeople(state);
  const occupied = new Set(
      livingAnimals(state)
        .flatMap(animalFootprint)
        .map((position) => `${position.x},${position.y}`),
    ),
    workingTargets = new Set(
      state.village.jobs
        .filter(
          (job) =>
            job.plan?.animalTarget &&
            !["completed", "cancelled"].includes(job.status),
        )
        .map((job) => job.targetId),
    );
  for (const animal of animalsDueToMove(state)) {
    const pasture = state.village.pastures?.find(
      (item) => item.id === animal.homePastureId && item.status === "complete",
    );
    advanceAnimal(
      state,
      animal,
      pasture,
      occupied,
      people,
      terrainAt,
      workingTargets,
    );
  }
}

function occupiedPeople(state) {
  const positions = [
    state.village.heroPosition,
    ...state.village.companionPositions,
    ...state.village.npcStates.map((actor) => actor.position),
  ];
  return new Set(positions.map((position) => `${position.x},${position.y}`));
}
