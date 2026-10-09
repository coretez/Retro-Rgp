export const ANIMAL_DAYS_PER_YEAR = 365;

const species = (definition) => Object.freeze(definition);

export const ANIMAL_SPECIES = Object.freeze({
  cow: species({
    name: "cattle",
    domestic: true,
    maturityDays: 450,
    gestationDays: 283,
    offspringRange: [1, 1],
    lifespanDays: [5475, 7300],
    femaleName: "cow",
    maleName: "bull",
    juvenileName: "calf",
    adultSize: [2, 1],
    housing: "pasture",
    feedUnitsPerDay: 2,
    grazingFraction: 0.9,
    waterUnitsPerDay: 4,
    carryingUnits: 2,
    weaningDays: 180,
    lactationDays: 305,
  }),
  pig: species({
    name: "pigs",
    domestic: true,
    maturityDays: 210,
    gestationDays: 114,
    offspringRange: [5, 10],
    lifespanDays: [5475, 7300],
    femaleName: "sow",
    maleName: "boar",
    juvenileName: "piglet",
    adultSize: [1, 1],
    housing: "pig_pen",
    feedUnitsPerDay: 1,
    grazingFraction: 0.3,
    waterUnitsPerDay: 2,
    carryingUnits: 1,
    weaningDays: 56,
  }),
  sheep: species({
    name: "sheep",
    domestic: true,
    maturityDays: 270,
    gestationDays: 150,
    offspringRange: [1, 2],
    lifespanDays: [3650, 4380],
    femaleName: "ewe",
    maleName: "ram",
    juvenileName: "lamb",
    adultSize: [1, 1],
    housing: "sheepfold",
    feedUnitsPerDay: 1,
    grazingFraction: 0.9,
    waterUnitsPerDay: 2,
    carryingUnits: 1,
    weaningDays: 90,
  }),
  dog: species({
    name: "dogs",
    domestic: true,
    maturityDays: 365,
    gestationDays: 63,
    offspringRange: [4, 8],
    lifespanDays: [3650, 5110],
    femaleName: "female dog",
    maleName: "male dog",
    juvenileName: "puppy",
    adultSize: [1, 1],
    housing: "kennel",
    feedUnitsPerDay: 0.75,
    grazingFraction: 0,
    waterUnitsPerDay: 1.5,
    carryingUnits: 0.75,
    weaningDays: 56,
  }),
  chicken: species({
    name: "chickens",
    domestic: true,
    maturityDays: 140,
    gestationDays: 21,
    offspringRange: [4, 10],
    lifespanDays: [1825, 3650],
    femaleName: "hen",
    maleName: "rooster",
    juvenileName: "chick",
    adultSize: [1, 1],
    reproduction: "incubation",
    housing: "coop",
    feedUnitsPerDay: 0.25,
    grazingFraction: 0.4,
    waterUnitsPerDay: 0.5,
    carryingUnits: 0.25,
    weaningDays: 42,
  }),
  deer: species({
    name: "deer",
    domestic: false,
    maturityDays: 730,
    gestationDays: 200,
    offspringRange: [1, 2],
    lifespanDays: [4015, 4380],
    femaleName: "doe",
    maleName: "buck",
    juvenileName: "fawn",
    adultSize: [1, 1],
    carryingUnits: 1,
  }),
  wolf: species({
    name: "wolves",
    domestic: false,
    maturityDays: 730,
    gestationDays: 63,
    offspringRange: [4, 7],
    lifespanDays: [1825, 4745],
    femaleName: "female wolf",
    maleName: "male wolf",
    juvenileName: "wolf pup",
    adultSize: [1, 1],
    predator: true,
    carryingUnits: 1,
  }),
  wild_boar: species({
    name: "wild boar",
    domestic: false,
    maturityDays: 300,
    gestationDays: 115,
    offspringRange: [4, 7],
    lifespanDays: [730, 3650],
    femaleName: "wild sow",
    maleName: "wild boar",
    juvenileName: "boar piglet",
    adultSize: [1, 1],
    aggressive: true,
    carryingUnits: 1,
  }),
  bear: species({
    name: "brown bears",
    domestic: false,
    maturityDays: 1460,
    gestationDays: 215,
    offspringRange: [1, 3],
    lifespanDays: [7300, 10950],
    femaleName: "sow bear",
    maleName: "boar bear",
    juvenileName: "bear cub",
    adultSize: [2, 1],
    predator: true,
    aggressive: true,
    carryingUnits: 2,
  }),
});

export function animalSpecies(speciesKey) {
  return ANIMAL_SPECIES[speciesKey] ?? null;
}

export function animalAdultName(animal) {
  const definition = animalSpecies(animal.species);
  if (!definition) return animal.species;
  return animal.sex === "female" ? definition.femaleName : definition.maleName;
}

export function animalLifeStage(animal, day) {
  const definition = animalSpecies(animal.species),
    age = Math.max(0, day - (animal.birthDay ?? day));
  if (!definition || age >= definition.maturityDays) return "adult";
  const juvenileAt = definition.weaningDays ??
    Math.ceil(definition.maturityDays * 0.25);
  return age >= juvenileAt ? "juvenile" : definition.juvenileName;
}

export function animalAgeDays(animal, day) {
  return Math.max(0, day - (animal.birthDay ?? day));
}
