export const VILLAGE_VISUAL_REGISTRY_VERSION = 2;

export const VILLAGE_VISUAL_FAMILIES = Object.freeze({
  actor: ["idle", "walking", "working", "carrying", "sleeping"],
  animal: ["idle", "walking", "working", "sleeping", "dead"],
  crop: ["fallow", "prepared", "growing", "harvestable"],
  forage: ["ripe", "depleted"],
  tree: ["sapling", "standing", "felled", "stump"],
  material: ["loose", "stored", "carried", "delivered"],
  wall: ["designated", "materials_delivered", "in_progress", "complete"],
  floor: ["designated", "materials_delivered", "in_progress", "complete"],
  roof: ["designated", "materials_delivered", "in_progress", "complete"],
  fence: ["designated", "materials_delivered", "in_progress", "complete"],
  door: ["designated", "materials_delivered", "in_progress", "closed", "open"],
  gate: ["designated", "materials_delivered", "in_progress", "closed", "open"],
  fixture: [
    "designated",
    "materials_delivered",
    "in_progress",
    "empty",
    "occupied",
  ],
  sign: ["posted"],
  terrain: ["base", "dug", "rubble", "water"],
});

const accepted = (key, mode = "sprite") =>
  Object.freeze({ key, accepted: true, mode });

export const VILLAGE_VISUAL_ASSETS = Object.freeze({
  "actor:pawn:idle": accepted("pawn_base_overhead_v2"),
  "actor:pawn:walking": accepted("pawn_base_overhead_v2"),
  "actor:pawn:working": accepted("pawn_base_overhead_v2"),
  "actor:pawn:carrying": accepted("pawn_base_overhead_v2"),
  "actor:civilian:idle": accepted("actor_civilian"),
  "actor:guard:idle": accepted("actor_guard"),
  "actor:official:idle": accepted("actor_official"),
  "actor:shopkeeper:idle": accepted("actor_shopkeeper"),
  "actor:party_blue:idle": accepted("actor_party_blue"),
  "actor:party_green:idle": accepted("actor_party_green"),
  "actor:party_rust:idle": accepted("actor_party_rust"),
  "actor:party_ochre:idle": accepted("actor_party_ochre"),
  "animal:cow:idle": accepted("actor_cow_v2"),
  "animal:cow:walking": accepted("actor_cow_v2"),
  "animal:cow:working": accepted("actor_cow_v2"),
  "animal:cow:sleeping": accepted("actor_cow_v2"),
  "animal:cow:dead": accepted("actor_cow_v2"),
  "animal:deer:idle": accepted("actor_deer_v2"),
  "animal:deer:walking": accepted("actor_deer_v2"),
  "animal:deer:working": accepted("actor_deer_v2"),
  "animal:deer:sleeping": accepted("actor_deer_v2"),
  "animal:deer:dead": accepted("actor_deer_v2"),
  ...Object.fromEntries(
    [
      ["pig", "actor_pig_v1"],
      ["sheep", "actor_sheep_v1"],
      ["dog", "actor_dog_v1"],
      ["chicken", "actor_chicken_v1"],
      ["wolf", "actor_wolf_v1"],
      ["wild_boar", "actor_wild_boar_v1"],
      ["bear", "actor_bear_v1"],
    ].flatMap(([species, asset]) =>
      ["idle", "walking", "working", "sleeping", "dead"].map((state) => [
        `animal:${species}:${state}`,
        accepted(asset),
      ]),
    ),
  ),
  ...Object.fromEntries(
    ["pine", "elm", "maple", "oak", "birch"].map((species) => [
      `tree:${species}:standing`,
      accepted(`tree_${species}`),
    ]),
  ),
  "wall:timber:complete": accepted("wall_timber"),
  "wall:stone:complete": accepted("wall_stone"),
  ...Object.fromEntries(
    [
      "table",
      "chair",
      "counter",
      "forge",
      "shelves",
      "rack",
      "bedroll",
      "bed",
      "cooking_pot",
      "meal_place",
      "altar",
      "stall",
      "jetty",
      "construction_site",
      "trestles",
      "storage_shed",
      "grain_plot",
      "kitchen_garden",
    ].flatMap((kind) =>
      ["empty", "occupied"].map((state) => [
        `fixture:${kind}:${state}`,
        accepted(`fixture_${kind}`),
      ]),
    ),
  ),
});

export const VILLAGE_PROCEDURAL_VISUALS = Object.freeze({
  actor: ["idle", "walking", "working", "carrying", "sleeping"],
  animal: ["idle", "walking", "working", "sleeping", "dead"],
  crop: ["fallow", "prepared", "growing", "harvestable"],
  forage: ["ripe", "depleted"],
  material: ["loose", "stored", "carried", "delivered"],
  wall: ["designated", "materials_delivered", "in_progress", "complete"],
  floor: ["designated", "materials_delivered", "in_progress", "complete"],
  roof: ["designated", "materials_delivered", "in_progress", "complete"],
  fence: ["designated", "materials_delivered", "in_progress", "complete"],
  door: ["designated", "materials_delivered", "in_progress", "closed", "open"],
  gate: ["designated", "materials_delivered", "in_progress", "closed", "open"],
  fixture: [
    "designated",
    "materials_delivered",
    "in_progress",
    "empty",
    "occupied",
  ],
  sign: ["posted"],
  terrain: ["dug", "rubble"],
  tree: ["felled", "stump"],
});

const CONSTRUCTION_STATES = Object.freeze({
  planned: "designated",
  material_delivered: "materials_delivered",
  in_progress: "in_progress",
});

function familyForCell(cell) {
  if (cell.person || cell.partyMember) return "actor";
  if (cell.animal) return "animal";
  if (cell.cropPlot) return "crop";
  if (cell.foragePatch) return "forage";
  if (cell.stockpile) return "material";
  if (cell.material) return "material";
  if (cell.construction) return cell.construction.elementKind;
  if (cell.furniture) return "fixture";
  if (cell.sign) return "sign";
  if (cell.gateId || cell.primitive?.kind === "gate") return "gate";
  if (cell.doorId || cell.door) return "door";
  if (cell.primitive) return cell.primitive.kind;
  if (cell.tile === "outdoor_tree" || cell.tile === "outdoor_stump")
    return "tree";
  if (cell.tile === "village_fence") return "fence";
  if (cell.building && cell.tile === "village_building") return "wall";
  return "terrain";
}

// function-length-exempt: template -- visual-state projection
function stateForCell(cell, family) {
  if (cell.construction) return CONSTRUCTION_STATES[cell.construction.stage];
  if (["door", "gate"].includes(family))
    return cell.tile.endsWith("_open") ? "open" : "closed";
  if (family === "tree")
    return cell.tile === "outdoor_stump" ? "stump" : "standing";
  if (family === "crop") return cell.cropPlot.stage;
  if (family === "forage") return cell.foragePatch.stage;
  if (family === "material")
    return cell.stockpile ? "stored" : (cell.materialState ?? "loose");
  if (family === "fixture") return cell.fixtureOccupied ? "occupied" : "empty";
  if (family === "sign") return "posted";
  if (family === "actor") {
    const actor = cell.person ?? cell.partyMember;
    if (actor?.carriedItem) return "carrying";
    if (actor?.workState === "working")
      return actor.currentAction?.toLowerCase().includes("sleep")
        ? "sleeping"
        : "working";
    return "idle";
  }
  if (family === "animal") {
    const status = cell.animal?.status ?? "idle";
    if (["idle", "tethered", "grazing"].includes(status)) return "idle";
    return status;
  }
  if (["wall", "floor", "roof", "fence"].includes(family)) return "complete";
  if (cell.tile === "outdoor_water") return "water";
  if (cell.tile === "village_pit") return "dug";
  if (cell.tile === "village_rubble") return "rubble";
  return "base";
}

function conditionForCell(cell) {
  const entity = cell.primitive ?? cell.furniture ?? cell.door;
  if (!entity || entity.condition == null || !entity.maxCondition) return {};
  const ratio = Math.max(
    0,
    Math.min(1, entity.condition / entity.maxCondition),
  );
  return {
    visualCondition: entity.condition,
    visualMaxCondition: entity.maxCondition,
    visualDamageBand:
      ratio <= 0.25
        ? "critical"
        : ratio <= 0.5
          ? "damaged"
          : ratio <= 0.75
            ? "worn"
            : "intact",
    visualLifecycle: entity.lifecycleState ?? "complete",
  };
}

function animalVariantAsset(cell) {
  const species = cell.animal?.species;
  if (!["cow", "pig", "sheep", "dog", "chicken"].includes(species))
    return null;
  if (!cell.animal?.sex || !cell.animal?.ageStage) return null;
  const stage =
    cell.animal.ageStage === "adult" ? cell.animal.sex : "juvenile";
  return accepted(`actor_${species}_${stage}_v3`);
}

function assetFor(cell, family, material, state) {
  const variant = cell.visualVariant?.replace(/_(horizontal|vertical)$/, ""),
    animalVariant = family === "animal" ? animalVariantAsset(cell) : null,
    exact =
      animalVariant ??
      VILLAGE_VISUAL_ASSETS[`${family}:${variant}:${state}`] ??
      VILLAGE_VISUAL_ASSETS[`${family}:${material}:${state}`] ??
      (family === "actor"
        ? VILLAGE_VISUAL_ASSETS[`actor:pawn:${state}`]
        : null);
  if (exact) return exact;
  if (VILLAGE_PROCEDURAL_VISUALS[family]?.includes(state))
    return accepted(`procedural_${family}`, "procedural");
  return null;
}

// function-length-exempt: template -- visual registry projection
export function villageVisualDescriptor(cell) {
  const family = familyForCell(cell),
    state = stateForCell(cell, family) ?? "base",
    material =
      cell.construction?.material ??
      cell.primitive?.material ??
      cell.furniture?.material ??
      cell.material?.material ??
      cell.stockpile?.itemKind ??
      cell.cropPlot?.cropKind ??
      cell.animal?.species ??
      (family === "actor" ? "pawn" : cell.visualVariant) ??
      null,
    stateAccepted = VILLAGE_VISUAL_FAMILIES[family]?.includes(state) ?? false,
    asset = assetFor(cell, family, material, state),
    connectionMask = cell.construction?.connectionMask ?? cell.connectionMask,
    orientation =
      cell.construction?.fenceOrientation ??
      (connectionMask != null && family === "fence"
        ? connectionMask & 5 && !(connectionMask & 10)
          ? "vertical"
          : "horizontal"
        : null),
    acceptedState = stateAccepted && asset?.accepted === true;
  return {
    visualFamily: family,
    visualState: stateAccepted ? state : "base",
    ...(material ? { visualMaterial: material } : {}),
    ...(asset?.key ? { visualAssetKey: asset.key } : {}),
    ...(asset?.mode ? { visualRenderMode: asset.mode } : {}),
    ...(orientation ? { visualOrientation: orientation } : {}),
    ...(connectionMask != null ? { visualConnectionMask: connectionMask } : {}),
    ...conditionForCell(cell),
    visualAccepted: acceptedState,
    visualFallback: !acceptedState,
  };
}

export function validateVillageVisualRegistry() {
  const required = ["wall", "fence", "door", "gate", "fixture"];
  for (const family of required)
    for (const state of ["designated", "materials_delivered", "in_progress"])
      if (!VILLAGE_VISUAL_FAMILIES[family].includes(state))
        throw new Error(`${family} is missing ${state}`);
  for (const [identity, asset] of Object.entries(VILLAGE_VISUAL_ASSETS)) {
    const [family, , state] = identity.split(":");
    if (!VILLAGE_VISUAL_FAMILIES[family]?.includes(state))
      throw new Error(`${identity} references an unknown visual state`);
    if (!asset.key || typeof asset.accepted !== "boolean" || !asset.mode)
      throw new Error(`${identity} lacks an explicit acceptance decision`);
  }
  for (const [family, states] of Object.entries(VILLAGE_PROCEDURAL_VISUALS))
    for (const state of states)
      if (!VILLAGE_VISUAL_FAMILIES[family]?.includes(state))
        throw new Error(`${family}:${state} is not a declared visual state`);
  return true;
}
