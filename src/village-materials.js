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

export const BOUNDARY_BUILD_PROFILES = Object.freeze({
  timber: Object.freeze({
    key: "rail_fence",
    materialUnits: 1,
    laborUnits: 6,
    heightFeet: 4,
  }),
  stone: Object.freeze({
    key: "low_stone_wall",
    materialUnits: 2,
    laborUnits: 7,
    heightFeet: 2.5,
  }),
});

export const SAW_BATCH_UNITS = 5;
export const CONSTRUCTION_CARRY_UNITS = 5;

export function treeWoodYield(species) {
  return TREE_WOOD_YIELDS[species] ?? TREE_WOOD_YIELDS.pine;
}

export function boundaryBuildProfile(material) {
  return BOUNDARY_BUILD_PROFILES[material] ?? BOUNDARY_BUILD_PROFILES.timber;
}
