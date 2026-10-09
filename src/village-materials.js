export const TREE_WOOD_YIELDS = Object.freeze({
  pine: 27,
  birch: 27,
  maple: 27,
  elm: 32,
  oak: 46,
});

export const WOOD_BUILD_COSTS = Object.freeze({
  fence: 1,
  wall: 5,
  door: 25,
  gate: 25,
  floor: 3,
  roof: 2,
});

export const SAW_BATCH_UNITS = 5;
export const CONSTRUCTION_CARRY_UNITS = 5;

export function treeWoodYield(species) {
  return TREE_WOOD_YIELDS[species] ?? TREE_WOOD_YIELDS.pine;
}
