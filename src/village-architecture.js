import { boundaryBuildProfile, WOOD_BUILD_COSTS } from "./village-materials.js";
import { definitionId, namedUuid } from "./identity.js";
import {
  cancelJob,
  releaseJobReservations,
  transitionJob,
} from "./job-board.js";

const HOUSE_ARCHETYPES = Object.freeze({
  cottage: { width: 10, height: 8, capacity: 2 },
  family_house: { width: 14, height: 10, capacity: 4 },
});

const REQUIRED_FIXTURES = Object.freeze([
  "bed",
  "kitchen",
  "storage",
  "table",
  "chair",
]);
const BED_TYPES = Object.freeze({
  single: { width: 1, height: 2, sleepingCapacity: 1 },
  double: { width: 2, height: 2, sleepingCapacity: 2 },
});

export const ANIMAL_HOUSING_ENCLOSURES = Object.freeze([
  Object.freeze({
    key: "pig_pen",
    name: "Pig pen",
    purpose: "animal_housing",
    housing: "pig_pen",
    allowedSpecies: Object.freeze(["pig"]),
    x: -72,
    y: 41,
    w: 10,
    h: 8,
    clearance: 1,
    gate: Object.freeze({ x: -68, y: 41 }),
    capacityUnits: 8,
    waterSource: "stable trough",
    fenceMaterial: "timber",
  }),
  Object.freeze({
    key: "sheepfold",
    name: "Sheepfold",
    purpose: "animal_housing",
    housing: "sheepfold",
    allowedSpecies: Object.freeze(["sheep"]),
    x: -60,
    y: 41,
    w: 12,
    h: 8,
    clearance: 1,
    gate: Object.freeze({ x: -55, y: 41 }),
    capacityUnits: 10,
    waterSource: "stable trough",
    fenceMaterial: "timber",
  }),
  Object.freeze({
    key: "chicken_coop_yard",
    name: "Chicken coop yard",
    purpose: "animal_housing",
    housing: "coop",
    allowedSpecies: Object.freeze(["chicken"]),
    x: -72,
    y: 51,
    w: 9,
    h: 7,
    clearance: 1,
    gate: Object.freeze({ x: -68, y: 51 }),
    capacityUnits: 12,
    waterSource: "poultry waterer",
    fenceMaterial: "timber",
  }),
  Object.freeze({
    key: "dog_kennel_yard",
    name: "Dog kennel yard",
    purpose: "animal_housing",
    housing: "kennel",
    allowedSpecies: Object.freeze(["dog"]),
    x: -60,
    y: 51,
    w: 9,
    h: 7,
    clearance: 1,
    gate: Object.freeze({ x: -56, y: 51 }),
    capacityUnits: 4,
    waterSource: "kennel water bowl",
    fenceMaterial: "timber",
  }),
]);

const SITE_CLEARING_LABOR_UNITS = 90;

function facilityFixtures(spec) {
  return spec.roles.map((role, index) => ({
    key: `${spec.key}_${role}_${index + 1}`,
    role,
    x: spec.x + 2 + (index % 3) * 3,
    y: spec.y + 2 + Math.floor(index / 3) * 3,
    width: ["storage", "material_storage", "guest_bed"].includes(role) ? 2 : 1,
    height: role === "guest_bed" ? 2 : 1,
  }));
}

function facilityPlan(spec) {
  const interior = {
    x: spec.x + 1,
    y: spec.y + 1,
    width: spec.w - 2,
    height: spec.h - 2,
  };
  return Object.freeze({
    ...spec,
    facilityKey: spec.key,
    wallMaterial: spec.wallMaterial ?? "timber",
    door: spec.door ?? {
      x: spec.x + Math.floor(spec.w / 2),
      y: spec.y + spec.h - 1,
      material: "wood",
    },
    floors: [
      {
        key: `${spec.key}_floor`,
        ...interior,
        material: spec.floor ?? "timber",
      },
    ],
    roofs: [
      {
        key: `${spec.key}_roof`,
        ...interior,
        material: spec.roof ?? "timber",
      },
    ],
    fixtures: facilityFixtures(spec),
  });
}

const SPECIALIST_PLAN_SPECS = Object.freeze({
  specialist_fishing_hut: {
    key: "fishing_hut",
    name: "Stonebridge fishing hut",
    glyph: "J",
    x: 18,
    y: 56,
    w: 12,
    h: 8,
    secondaryDoors: [{ x: 24, y: 56, material: "wood" }],
    roles: ["netting_bench", "net_rack", "fish_cleaning_table", "fish_storage"],
  },
  specialist_forge: {
    key: "forge",
    name: "Stonebridge forge and smithy",
    glyph: "S",
    x: 17,
    y: 12,
    w: 14,
    h: 10,
    wallMaterial: "stone",
    floor: "stone",
    roof: "stone",
    fireSafetyClass: "masonry_hot_work",
    roles: ["forge", "anvil", "workbench", "fuel_storage", "material_storage"],
  },
  specialist_mill: {
    key: "mill",
    name: "Stonebridge grain mill",
    glyph: "M",
    x: -8,
    y: 30,
    w: 14,
    h: 10,
    roles: [
      "millstones",
      "hopper",
      "sifting_table",
      "grain_storage",
      "flour_storage",
    ],
  },
  specialist_bakery: {
    key: "bakery",
    name: "Stonebridge bakery",
    glyph: "B",
    x: 8,
    y: 30,
    w: 14,
    h: 10,
    floor: "stone",
    roles: [
      "oven",
      "preparation_table",
      "cooling_rack",
      "flour_storage",
      "bread_storage",
    ],
  },
  specialist_infirmary: {
    key: "infirmary",
    name: "Stonebridge infirmary",
    glyph: "+",
    x: 26,
    y: 28,
    w: 14,
    h: 10,
    roles: [
      "treatment_table",
      "recovery_bed",
      "recovery_bed",
      "medicine_storage",
      "linen_storage",
    ],
  },
  specialist_carpenter: {
    key: "carpenter_workshop",
    name: "Stonebridge carpenter workshop",
    glyph: "C",
    x: -42,
    y: 14,
    w: 14,
    h: 10,
    roles: [
      "workbench",
      "sawpit",
      "tool_rack",
      "lumber_storage",
      "component_storage",
    ],
  },
  specialist_granary: {
    key: "granary",
    name: "Stonebridge granary and store",
    glyph: "G",
    x: -42,
    y: 30,
    w: 14,
    h: 10,
    roles: [
      "grain_storage",
      "seed_storage",
      "inspection_aisle",
      "storage",
      "storage",
    ],
  },
  specialist_inn: {
    key: "inn",
    name: "Stonebridge public inn",
    glyph: "I",
    x: 8,
    y: 42,
    w: 18,
    h: 12,
    roles: ["hearth", "table", "table", "guest_bed", "guest_bed", "pantry"],
  },
  specialist_stable: {
    key: "stable",
    name: "Stonebridge stable",
    glyph: "H",
    x: -72,
    y: 30,
    w: 16,
    h: 10,
    roles: [
      "stall",
      "stall",
      "tack_storage",
      "feed_storage",
      "hitching_rail",
      "water_trough",
    ],
    enclosures: ANIMAL_HOUSING_ENCLOSURES,
  },
  security_watch_house: {
    key: "watch_house",
    name: "Stonebridge watch house",
    glyph: "W",
    x: 52,
    y: 2,
    w: 12,
    h: 9,
    roles: ["duty_desk", "alarm_bell", "equipment_storage", "watch_bench"],
  },
  security_armory: {
    key: "armory",
    name: "Stonebridge armory",
    glyph: "A",
    x: 66,
    y: 2,
    w: 12,
    h: 9,
    roles: ["weapon_rack", "armor_rack", "equipment_storage", "issue_desk"],
  },
  security_training_yard: {
    key: "training_yard",
    name: "Stonebridge training hall and yard",
    glyph: "T",
    x: 52,
    y: 13,
    w: 14,
    h: 10,
    roles: ["weapon_rack", "practice_dummy", "practice_dummy", "drill_space"],
  },
  security_gatehouse: {
    key: "gatehouse",
    name: "Stonebridge east gatehouse",
    glyph: "G",
    x: 82,
    y: 8,
    w: 12,
    h: 10,
    door: { x: 88, y: 17, material: "wood" },
    secondaryDoors: [{ x: 88, y: 8, material: "wood" }],
    roles: ["gate_controls", "guard_post", "alarm_bell", "equipment_storage"],
  },
});

export const SPECIALIST_FACILITY_PLANS = Object.freeze(
  Object.fromEntries(
    Object.entries(SPECIALIST_PLAN_SPECS).map(([key, spec]) => [
      key,
      facilityPlan(spec),
    ]),
  ),
);

const FOUNDER_HOUSE_PLOTS = Object.freeze([
  Object.freeze({ householdKey: "farmer", x: -34, y: 35, use: "farmhouse" }),
  Object.freeze({
    householdKey: "brand",
    x: -22,
    y: 35,
    use: "stockkeeper_cottage",
  }),
  Object.freeze({
    householdKey: "woodcutter",
    x: -50,
    y: 13,
    use: "woodland_cottage",
  }),
  Object.freeze({
    householdKey: "fisher",
    x: -8,
    y: 25,
    use: "riverside_cottage",
  }),
  Object.freeze({
    householdKey: "innkeeper",
    x: 3,
    y: 26,
    use: "hospitality_cottage",
  }),
  Object.freeze({ householdKey: "voss", x: -10, y: 1, use: "civic_cottage" }),
  Object.freeze({
    householdKey: "watchman",
    x: 22,
    y: 1,
    use: "watch_cottage",
  }),
  Object.freeze({
    householdKey: "herbalist",
    x: 34,
    y: 1,
    use: "healer_cottage",
  }),
  Object.freeze({
    householdKey: "porter",
    x: 22,
    y: 25,
    use: "logistics_cottage",
  }),
  Object.freeze({
    householdKey: "carter",
    x: 34,
    y: 25,
    use: "carter_cottage",
  }),
]);

const CONSTRUCTION_BLOCKERS = new Set([
  "outdoor_rock",
  "outdoor_water",
  "village_building",
  "village_construction",
  "village_door_closed",
  "village_door_locked",
  "village_fence",
  "village_furniture",
  "village_material",
  "village_pit",
]);

const cellKey = ({ x, y }) => `${x},${y}`;
const neighbors = ({ x, y }) => [
  { x: x - 1, y },
  { x: x + 1, y },
  { x, y: y - 1 },
  { x, y: y + 1 },
];

function fixtureCells(fixture) {
  const cells = [];
  for (let y = fixture.y; y < fixture.y + fixture.height; y += 1)
    for (let x = fixture.x; x < fixture.x + fixture.width; x += 1)
      cells.push({ x, y });
  return cells;
}

function interiorCells(plan) {
  const cells = [];
  for (let y = 1; y < plan.height - 1; y += 1)
    for (let x = 1; x < plan.width - 1; x += 1) cells.push({ x, y });
  return cells;
}

function reachableInterior(plan) {
  const blocked = new Set(plan.fixtures.flatMap(fixtureCells).map(cellKey)),
    start = { x: plan.door.x, y: plan.height - 2 },
    pending = blocked.has(cellKey(start)) ? [] : [start],
    reached = new Set(pending.map(cellKey));
  while (pending.length) {
    const current = pending.shift();
    for (const next of neighbors(current)) {
      const inside =
        next.x > 0 &&
        next.x < plan.width - 1 &&
        next.y > 0 &&
        next.y < plan.height - 1;
      if (!inside || blocked.has(cellKey(next)) || reached.has(cellKey(next)))
        continue;
      reached.add(cellKey(next));
      pending.push(next);
    }
  }
  return reached;
}

function houseDoorCandidates(plan) {
  const middleX = Math.floor(plan.width / 2),
    middleY = Math.floor(plan.height / 2);
  return [
    { side: "north", opposite: "south", x: middleX, y: 0 },
    { side: "south", opposite: "north", x: middleX, y: plan.height - 1 },
    { side: "west", opposite: "east", x: 0, y: middleY },
    { side: "east", opposite: "west", x: plan.width - 1, y: middleY },
  ];
}

function worldDoorSite(plan, plot, door) {
  return {
    x: plot.x,
    y: plot.y,
    w: plan.width,
    h: plan.height,
    door: { x: plot.x + door.x, y: plot.y + door.y },
  };
}

export function orientHousePlan(plan, plot, terrainAt) {
  const ranked = houseDoorCandidates(plan)
      .map((door) => {
        const access = buildingAccess(worldDoorSite(plan, plot, door));
        return {
          door,
          distance: nearestRoadDistance(access.outside, terrainAt),
        };
      })
      .sort((left, right) => left.distance - right.distance),
    primary = ranked[0].door,
    secondary = ranked.find(
      (candidate) => candidate.door.side === primary.opposite,
    ).door,
    oriented = {
      ...structuredClone(plan),
      door: { x: primary.x, y: primary.y },
      secondaryDoors: [{ x: secondary.x, y: secondary.y }],
    };
  oriented.assessment = assessHousePlan(oriented);
  return oriented;
}

function fixtureAccessible(fixture, reached) {
  return fixtureCells(fixture).some((cell) =>
    neighbors(cell).some((next) => reached.has(cellKey(next))),
  );
}

// function-length-exempt: template -- plan assessment projection
export function assessHousePlan(plan) {
  const archetype = HOUSE_ARCHETYPES[plan.archetype],
    interior = interiorCells(plan),
    occupied = plan.fixtures.flatMap(fixtureCells),
    uniqueOccupied = new Set(occupied.map(cellKey)),
    reached = reachableInterior(plan),
    roles = new Set(plan.fixtures.map((fixture) => fixture.role)),
    beds = plan.fixtures.filter((fixture) => fixture.role === "bed"),
    errors = [];
  if (!archetype) errors.push("unknown_archetype");
  if (
    archetype &&
    (plan.width < archetype.width || plan.height < archetype.height)
  )
    errors.push("house_too_small");
  if (interior.length - uniqueOccupied.size < plan.residentCapacity * 10)
    errors.push("insufficient_usable_area");
  if (occupied.length !== uniqueOccupied.size) errors.push("fixture_overlap");
  if (
    occupied.some(
      (cell) => !interior.some((inside) => cellKey(inside) === cellKey(cell)),
    )
  )
    errors.push("fixture_outside_interior");
  for (const role of REQUIRED_FIXTURES)
    if (!roles.has(role)) errors.push(`missing_${role}`);
  for (const bed of beds) {
    const type = BED_TYPES[bed.bedType];
    if (!type) errors.push("unknown_bed_type");
    else if (
      bed.width !== type.width ||
      bed.height !== type.height ||
      bed.sleepingCapacity !== type.sleepingCapacity
    )
      errors.push("invalid_bed_footprint");
  }
  const sleepingCapacity = beds.reduce(
    (total, bed) => total + (BED_TYPES[bed.bedType]?.sleepingCapacity ?? 0),
    0,
  );
  if (sleepingCapacity < plan.residentCapacity)
    errors.push("insufficient_beds");
  if (plan.fixtures.some((fixture) => !fixtureAccessible(fixture, reached)))
    errors.push("fixture_unreachable");
  const exits = [plan.door, ...(plan.secondaryDoors ?? [])],
    access = exits.map((door) =>
      buildingAccess({ x: 0, y: 0, w: plan.width, h: plan.height, door }),
    );
  if (exits.length < 2) errors.push("insufficient_exits");
  if (new Set(exits.map(cellKey)).size !== exits.length)
    errors.push("duplicate_exit");
  if (access.some((entry) => !entry)) errors.push("invalid_exit");
  if (access.some((entry) => entry && !reached.has(cellKey(entry.inside))))
    errors.push("exit_unreachable");
  return {
    valid: errors.length === 0,
    errors,
    interiorArea: interior.length,
    usableArea: interior.length - uniqueOccupied.size,
    reachableArea: reached.size,
    sleepingCapacity,
  };
}

// function-length-exempt: template -- authored fixture layout
function houseFixtures(width, height, capacity) {
  const beds = Array.from({ length: capacity }, (_, index) => ({
      key: `bed_${index + 1}`,
      role: "bed",
      bedType: "single",
      sleepingCapacity: 1,
      x: 2 + index * 2,
      y: height - 4,
      width: 1,
      height: 2,
    })),
    tableX = Math.floor(width / 2) - 1,
    chairs = [
      { x: tableX - 1, y: 3 },
      { x: tableX + 2, y: 3 },
      { x: tableX, y: 2 },
      { x: tableX + 1, y: 4 },
    ].slice(0, capacity);
  return [
    { key: "hearth", role: "kitchen", x: 1, y: 1, width: 2, height: 2 },
    {
      key: "household_store",
      role: "storage",
      x: width - 3,
      y: 1,
      width: 2,
      height: 1,
    },
    {
      key: "family_table",
      role: "table",
      x: tableX,
      y: 3,
      width: 2,
      height: 1,
    },
    ...chairs.map((position, index) => ({
      key: `chair_${index + 1}`,
      role: "chair",
      ...position,
      width: 1,
      height: 1,
    })),
    ...beds,
  ];
}

export function designHouse(residentCapacity = 2) {
  const archetypeKey = residentCapacity <= 2 ? "cottage" : "family_house",
    archetype = HOUSE_ARCHETYPES[archetypeKey];
  if (residentCapacity < 1 || residentCapacity > archetype.capacity)
    throw new Error("House capacity must be between one and four residents.");
  const plan = {
    archetype: archetypeKey,
    width: archetype.width,
    height: archetype.height,
    residentCapacity,
    wallMaterial: "timber",
    door: { x: Math.floor(archetype.width / 2), y: archetype.height - 1 },
    secondaryDoors: [{ x: Math.floor(archetype.width / 2), y: 0 }],
    zones: [
      { key: "common", x: 1, y: 1, width: archetype.width - 2, height: 3 },
      {
        key: "sleeping",
        x: 1,
        y: 4,
        width: archetype.width - 2,
        height: archetype.height - 5,
      },
    ],
    fixtures: houseFixtures(
      archetype.width,
      archetype.height,
      residentCapacity,
    ),
  };
  return { ...plan, assessment: assessHousePlan(plan) };
}

export function founderHousePlot(index, householdKey = null) {
  const plot = householdKey
    ? FOUNDER_HOUSE_PLOTS.find(
        (candidate) => candidate.householdKey === householdKey,
      )
    : FOUNDER_HOUSE_PLOTS[index];
  return plot ? { ...plot } : null;
}

export function buildingAccess(site, door = site.door) {
  if (!door) return null;
  const { x, y } = door,
    left = x === site.x,
    right = x === site.x + site.w - 1,
    top = y === site.y,
    bottom = y === site.y + site.h - 1;
  if ([left, right, top, bottom].filter(Boolean).length !== 1) return null;
  if (top) return { inside: { x, y: y + 1 }, outside: { x, y: y - 1 } };
  if (bottom) return { inside: { x, y: y - 1 }, outside: { x, y: y + 1 } };
  if (left) return { inside: { x: x + 1, y }, outside: { x: x - 1, y } };
  return { inside: { x: x - 1, y }, outside: { x: x + 1, y } };
}

function buildingClearance(site) {
  return site.attachedToSiteKey || site.connectionMode === "extension"
    ? 0
    : (site.clearance ?? 1);
}

function buildingClearanceCells(site) {
  const padding = buildingClearance(site),
    cells = [];
  for (let y = site.y - padding; y < site.y + site.h + padding; y += 1)
    for (let x = site.x - padding; x < site.x + site.w + padding; x += 1)
      if (
        x < site.x ||
        x >= site.x + site.w ||
        y < site.y ||
        y >= site.y + site.h
      )
        cells.push({ x, y });
  return cells;
}

function reservedConstructionCells(reservedSite, candidate) {
  return [
    ...constructionSiteCells(reservedSite),
    ...(candidate.attachedToSiteKey === reservedSite.key
      ? []
      : buildingClearanceCells(reservedSite)),
  ];
}

export function assessConstructionSite(
  site,
  terrainAt,
  { reservedSites = [] } = {},
) {
  const conflicts = [],
    reserved = new Map(
      reservedSites.flatMap((reservedSite) =>
        reservedConstructionCells(reservedSite, site).map((position) => [
          cellKey(position),
          reservedSite.key,
        ]),
      ),
    ),
    sections = [site, ...(site.enclosures ?? [])].map((section) => {
      const gates =
        section.gates ?? [section.gate ?? section.door].filter(Boolean);
      return {
        ...section,
        door: gates[0] ?? section.door,
        secondaryDoors: gates.length ? gates.slice(1) : section.secondaryDoors,
      };
    });
  for (const section of sections) {
    const doors = [section.door, ...(section.secondaryDoors ?? [])].filter(
        Boolean,
      ),
      accesses = doors.map((door) => ({
        door,
        access: buildingAccess(section, door),
      })),
      positions = section.purpose
        ? enclosureConstructionCells(section)
        : sectionAreaCells(section);
    for (const { x, y } of positions) {
      const tile = terrainAt({ x, y }),
        reservedBy = reserved.get(`${x},${y}`),
        naturalBarrier =
          section.purpose === "defensive_perimeter" &&
          ["outdoor_water", "outdoor_rock"].includes(tile);
      if (reservedBy)
        conflicts.push({ x, y, tile: `reserved_site:${reservedBy}` });
      else if (
        !naturalBarrier &&
        (tile?.startsWith("road_") || CONSTRUCTION_BLOCKERS.has(tile))
      )
        conflicts.push({ x, y, tile });
    }
    for (const { door, access } of accesses) {
      if (!access) {
        conflicts.push({ ...door, tile: "invalid_door" });
        continue;
      }
      for (const [side, position] of Object.entries(access)) {
        const tile = terrainAt(position),
          reservedBy = reserved.get(cellKey(position));
        if (reservedBy)
          conflicts.push({
            ...position,
            tile: `blocked_door_${side}:reserved_site:${reservedBy}`,
          });
        else if (CONSTRUCTION_BLOCKERS.has(tile))
          conflicts.push({ ...position, tile: `blocked_door_${side}:${tile}` });
      }
    }
  }
  for (const position of buildingClearanceCells(site)) {
    const tile = terrainAt(position),
      reservedBy = reserved.get(cellKey(position));
    if (reservedBy)
      conflicts.push({
        ...position,
        tile: `clearance:reserved_site:${reservedBy}`,
      });
    else if (CONSTRUCTION_BLOCKERS.has(tile))
      conflicts.push({ ...position, tile: `clearance:${tile}` });
  }
  const unique = [
    ...new Map(
      conflicts.map((conflict) => [
        `${conflict.x},${conflict.y}:${conflict.tile}`,
        conflict,
      ]),
    ).values(),
  ];
  return { valid: unique.length === 0, conflicts: unique };
}

function sectionAreaCells(section) {
  const cells = [];
  for (let y = section.y; y < section.y + section.h; y += 1)
    for (let x = section.x; x < section.x + section.w; x += 1)
      cells.push({ x, y });
  return cells;
}

function enclosureConstructionCells(enclosure) {
  if (enclosure.purpose !== "defensive_perimeter")
    return sectionAreaCells(enclosure);
  const gates = enclosure.gates ?? [enclosure.gate].filter(Boolean);
  return constructionPerimeter({
    ...enclosure,
    door: gates[0],
    secondaryDoors: gates.slice(1),
  });
}

export function constructionSiteCells(site) {
  const cells = sectionAreaCells(site);
  for (const enclosure of site.enclosures ?? [])
    cells.push(...enclosureConstructionCells(enclosure));
  for (const enclosure of site.enclosures ?? [])
    for (const position of enclosureClearanceCells(enclosure))
      cells.push(position);
  return [...new Map(cells.map((cell) => [cellKey(cell), cell])).values()];
}

function enclosureClearanceCells(enclosure) {
  const clearance = enclosure.clearance ?? 0,
    cells = [];
  for (
    let y = enclosure.y - clearance;
    y < enclosure.y + enclosure.h + clearance;
    y += 1
  )
    for (
      let x = enclosure.x - clearance;
      x < enclosure.x + enclosure.w + clearance;
      x += 1
    )
      if (
        x < enclosure.x ||
        x >= enclosure.x + enclosure.w ||
        y < enclosure.y ||
        y >= enclosure.y + enclosure.h
      )
        cells.push({ x, y });
  return cells;
}

export function translateConstructionSite(
  site,
  dx,
  dy,
  { fixedEnclosurePurposes = [] } = {},
) {
  const translate = (position) => ({
      ...position,
      x: position.x + dx,
      y: position.y + dy,
    }),
    fixed = new Set(fixedEnclosurePurposes),
    translateEnclosure = (enclosure) => {
      if (fixed.has(enclosure.purpose ?? "pasture"))
        return structuredClone(enclosure);
      const gates = (enclosure.gates ?? [enclosure.gate].filter(Boolean)).map(
        translate,
      );
      return {
        ...translate(enclosure),
        ...(gates[0] ? { gate: gates[0] } : {}),
        ...(gates.length ? { gates } : {}),
      };
    };
  return {
    ...structuredClone(site),
    x: site.x + dx,
    y: site.y + dy,
    ...(site.door ? { door: translate(site.door) } : {}),
    ...(site.secondaryDoors
      ? { secondaryDoors: site.secondaryDoors.map(translate) }
      : {}),
    ...(site.fixtures
      ? { fixtures: site.fixtures.map((fixture) => translate(fixture)) }
      : {}),
    ...(site.floors
      ? { floors: site.floors.map((floor) => translate(floor)) }
      : {}),
    ...(site.roofs ? { roofs: site.roofs.map((roof) => translate(roof)) } : {}),
    ...(site.enclosures
      ? {
          enclosures: site.enclosures.map(translateEnclosure),
        }
      : {}),
  };
}

function searchOffsets(maxRadius) {
  const offsets = [];
  for (let radius = 0; radius <= maxRadius; radius += 1)
    for (let dy = -radius; dy <= radius; dy += 1)
      for (let dx = -radius; dx <= radius; dx += 1)
        if (Math.abs(dx) + Math.abs(dy) === radius) offsets.push({ dx, dy });
  return offsets;
}

export function findConstructionSite(
  preferredSite,
  terrainAt,
  {
    reservedSites = [],
    maxRadius = 32,
    fixedEnclosurePurposes = [],
    candidateFilter = null,
  } = {},
) {
  const rejections = [];
  for (const { dx, dy } of searchOffsets(maxRadius)) {
    const site = translateConstructionSite(preferredSite, dx, dy, {
        fixedEnclosurePurposes,
      }),
      assessment = assessConstructionSite(site, terrainAt, { reservedSites });
    const accepted =
      assessment.valid && (!candidateFilter || candidateFilter(site));
    if (accepted)
      return {
        site,
        assessment,
        offset: { x: dx || 0, y: dy || 0 },
        attempts: rejections.length + 1,
        rejections,
      };
    rejections.push({
      origin: { x: site.x, y: site.y },
      conflicts: assessment.valid
        ? [{ tile: "unreachable", position: { ...site.door } }]
        : assessment.conflicts,
    });
  }
  return {
    site: null,
    assessment: null,
    offset: null,
    attempts: rejections.length,
    rejections,
  };
}

export function specialistFacilityPlan(projectKey) {
  const plan = SPECIALIST_FACILITY_PLANS[projectKey];
  return plan ? structuredClone(plan) : null;
}

function distanceToBuilding(position, building) {
  const nearestX = Math.max(
      building.x,
      Math.min(position.x, building.x + building.w - 1),
    ),
    nearestY = Math.max(
      building.y,
      Math.min(position.y, building.y + building.h - 1),
    );
  return Math.abs(position.x - nearestX) + Math.abs(position.y - nearestY);
}

function nearestRoadDistance(position, terrainAt, limit = 18) {
  for (let radius = 0; radius <= limit; radius += 1)
    for (let dy = -radius; dy <= radius; dy += 1)
      for (let dx = -radius; dx <= radius; dx += 1) {
        if (Math.abs(dx) + Math.abs(dy) !== radius) continue;
        if (
          terrainAt({ x: position.x + dx, y: position.y + dy })?.startsWith(
            "road_",
          )
        )
          return radius;
      }
  return limit + 1;
}

/**
 * Produces inspectable, ranked alternatives without reserving any of them.
 * The council reserves only the alternative it approves.
 */
function annotateDefensiveNaturalBarriers(site, terrainAt) {
  for (const enclosure of site.enclosures ?? []) {
    if (enclosure.purpose !== "defensive_perimeter") continue;
    const gates = enclosure.gates ?? [enclosure.gate].filter(Boolean),
      positions = constructionPerimeter({
        ...enclosure,
        door: gates[0],
        secondaryDoors: gates.slice(1),
      });
    enclosure.naturalBarrierCells = positions.filter((position) =>
      ["outdoor_water", "outdoor_rock"].includes(terrainAt(position)),
    );
  }
}

export function architectSiteAlternatives(
  projectKey,
  terrainAt,
  {
    reservedSites = [],
    buildings = [],
    supplyPosition = null,
    preferredSite = null,
    requiredDoorPosition = null,
    maxAlternatives = 3,
    planningEvaluator = null,
  } = {},
) {
  const preferred = preferredSite ?? specialistFacilityPlan(projectKey);
  if (!preferred) return [];
  const anchorOffsets = [
      { x: 0, y: 0 },
      { x: 18, y: 0 },
      { x: 0, y: 14 },
      { x: -18, y: 0 },
      { x: 0, y: -14 },
    ],
    alternatives = [],
    origins = new Set();
  for (const anchor of anchorOffsets) {
    const candidate = translateConstructionSite(preferred, anchor.x, anchor.y),
      result = findConstructionSite(candidate, terrainAt, {
        reservedSites,
        maxRadius: 24,
        candidateFilter: requiredDoorPosition
          ? (site) =>
              site.door.x === requiredDoorPosition.x &&
              site.door.y === requiredDoorPosition.y
          : null,
      });
    if (!result.site) continue;
    annotateDefensiveNaturalBarriers(result.site, terrainAt);
    const planning = planningEvaluator?.(result.site) ?? {
      valid: true,
      score: 0,
      reasons: [],
    };
    if (!planning.valid) continue;
    const originKey = `${result.site.x},${result.site.y}`;
    if (origins.has(originKey)) continue;
    origins.add(originKey);
    const treeCells = constructionSiteCells(result.site).filter(
        (position) => terrainAt(position) === "outdoor_tree",
      ),
      roadDistance = nearestRoadDistance(result.site.door, terrainAt),
      supplyDistance = supplyPosition
        ? Math.abs(result.site.door.x - supplyPosition.x) +
          Math.abs(result.site.door.y - supplyPosition.y)
        : 0,
      homeClearance = buildings
        .filter((building) =>
          String(building.key ?? "").startsWith("founder_house_"),
        )
        .reduce(
          (minimum, building) =>
            Math.min(minimum, distanceToBuilding(result.site.door, building)),
          99,
        ),
      firePenalty = Math.max(0, 8 - homeClearance) * 8,
      elements = constructionElements(result.site),
      materials = constructionMaterialRequirements(result.site),
      billOfMaterials = {
        lumber:
          materials.find((entry) => entry.key === "lumber_yard_lumber")
            ?.quantity ?? 0,
        stone:
          materials.find((entry) => entry.key === "quarry_stone")?.quantity ??
          0,
        laborUnits:
          elements.reduce(
            (total, element) =>
              total +
              (element.laborRequired ??
                (element.kind === "fence"
                  ? 6
                  : element.kind === "wall"
                    ? 10
                    : 12)),
            0,
          ) +
          treeCells.length * SITE_CLEARING_LABOR_UNITS,
        elementCount: elements.length,
      },
      score =
        result.attempts * 4 +
        roadDistance * 6 +
        Math.ceil(supplyDistance / 3) +
        firePenalty +
        treeCells.length * 3 +
        (planning.score ?? 0);
    alternatives.push({
      site: result.site,
      score,
      rank: 0,
      status: "pending_survey",
      reasons: [
        `${roadDistance} cells from a road`,
        `${supplyDistance} cells from building-lumber supply`,
        `${treeCells.length} trees require clearing`,
        ...(planning.reasons ?? []),
        homeClearance === 99
          ? "no completed homes nearby"
          : `${homeClearance} cells fire clearance from homes`,
        `${result.rejections.length} rejected placements before this fit`,
      ],
      assessment: {
        valid: true,
        attempts: result.attempts,
        rejectedCandidates: result.rejections.length,
        roadDistance,
        supplyDistance,
        homeClearance,
        treeCells,
        masterPlan: planning,
      },
      billOfMaterials,
    });
    if (alternatives.length >= maxAlternatives) break;
  }
  return alternatives
    .sort(
      (left, right) =>
        left.score - right.score ||
        left.site.y - right.site.y ||
        left.site.x - right.site.x,
    )
    .map((alternative, index) => ({ ...alternative, rank: index + 1 }));
}

export function constructionPerimeter(site) {
  const cells = [],
    doors = new Set(
      [site.door, ...(site.secondaryDoors ?? [])].filter(Boolean).map(cellKey),
    ),
    add = (x, y) => {
      if (!doors.has(`${x},${y}`)) cells.push({ x, y });
    };
  for (let x = site.x; x < site.x + site.w; x += 1) add(x, site.y);
  for (let y = site.y + 1; y < site.y + site.h; y += 1)
    add(site.x + site.w - 1, y);
  for (let x = site.x + site.w - 2; x >= site.x; x -= 1)
    add(x, site.y + site.h - 1);
  for (let y = site.y + site.h - 2; y > site.y; y -= 1) add(site.x, y);
  return cells;
}

export function formalizeStoneBoundary(enclosure) {
  const profile = boundaryBuildProfile("stone");
  return {
    ...structuredClone(enclosure),
    fenceMaterial: "stone",
    gateMaterial: "timber",
    boundaryProfile: profile.key,
    fenceHeightFeet: profile.heightFeet,
  };
}

// function-length-exempt: template -- authored construction element expansion
export function constructionElements(site) {
  const walls = constructionPerimeter(site).map((position, index) => ({
    key: `wall_${index + 1}`,
    kind: "wall",
    material: site.wallMaterial ?? "timber",
    materialRequired: WOOD_BUILD_COSTS.wall,
    position,
  }));
  const fixtures = (site.fixtures ?? []).map((fixture) => ({
      key: `fixture_${fixture.key}`,
      kind: "fixture",
      fixtureVariant: fixture.role,
      fixtureKey: fixture.key,
      role: fixture.role,
      ...(fixture.bedType ? { bedType: fixture.bedType } : {}),
      ...(fixture.sleepingCapacity != null
        ? { sleepingCapacity: fixture.sleepingCapacity }
        : {}),
      ...(fixture.providesShelter ? { providesShelter: true } : {}),
      width: fixture.width,
      height: fixture.height,
      material:
        fixture.material ??
        site.fixtureMaterials?.[fixture.role] ??
        site.wallMaterial ??
        "timber",
      materialRequired: Math.max(1, fixture.width * fixture.height),
      position: { x: fixture.x, y: fixture.y },
    })),
    areaElements = (sections, kind) =>
      (sections ?? []).map((section) => {
        const area = section.width * section.height;
        return {
          key: `${kind}_${section.key}`,
          kind,
          material: section.material ?? "timber",
          materialRequired: Math.ceil(area / 16) * WOOD_BUILD_COSTS[kind],
          laborRequired: Math.max(12, Math.ceil(area / 4)),
          position: { x: section.x, y: section.y },
          width: section.width,
          height: section.height,
        };
      }),
    floors = areaElements(site.floors, "floor"),
    roofs = areaElements(site.roofs, "roof");
  const fences = (site.enclosures ?? []).flatMap((enclosure) => {
    const enclosureGates = enclosure.gates ?? [enclosure.gate].filter(Boolean),
      naturalBarriers = new Set(
        (enclosure.naturalBarrierCells ?? []).map(cellKey),
      );
    const fenceSite = {
      x: enclosure.x,
      y: enclosure.y,
      w: enclosure.w,
      h: enclosure.h,
      door: enclosureGates[0],
      secondaryDoors: enclosureGates.slice(1),
    };
    return constructionPerimeter(fenceSite)
      .filter((position) => !naturalBarriers.has(cellKey(position)))
      .map((position, index) => {
        const material = enclosure.fenceMaterial ?? "timber",
          profile = boundaryBuildProfile(material);
        return {
          key: `fence_${enclosure.key}_${index + 1}`,
          kind: "fence",
          material,
          materialRequired: profile.materialUnits,
          laborRequired: profile.laborUnits,
          boundaryProfile: enclosure.boundaryProfile ?? profile.key,
          heightFeet: enclosure.fenceHeightFeet ?? profile.heightFeet,
          pastureKey: enclosure.key,
          enclosurePurpose: enclosure.purpose ?? "pasture",
          position,
        };
      });
  });
  const gates = (site.enclosures ?? []).flatMap((enclosure) =>
      (enclosure.gates ?? [enclosure.gate].filter(Boolean)).map(
        (position, index) => ({
          key: `gate_${enclosure.key}${index ? `_${index + 1}` : ""}`,
          kind: "gate",
          material:
            enclosure.gateMaterial ?? enclosure.fenceMaterial ?? "timber",
          materialRequired: WOOD_BUILD_COSTS.gate,
          pastureKey: enclosure.key,
          enclosurePurpose: enclosure.purpose ?? "pasture",
          position: { ...position },
        }),
      ),
    ),
    survivalFixtures = fixtures.filter((fixture) =>
      ["bed", "kitchen"].includes(fixture.role),
    ),
    domesticFixtures = fixtures.filter(
      (fixture) => !["bed", "kitchen"].includes(fixture.role),
    );
  const doors = [site.door, ...(site.secondaryDoors ?? [])]
    .filter(Boolean)
    .map((position, index) => ({
      key: `door_${index + 1}`,
      kind: "door",
      material: position.material ?? site.door?.material ?? "wood",
      materialRequired: WOOD_BUILD_COSTS.door,
      position: { x: position.x, y: position.y },
    }));
  return [
    ...doors,
    ...walls,
    ...floors,
    ...roofs,
    ...survivalFixtures,
    ...domesticFixtures,
    ...gates,
    ...fences,
  ];
}

function constructionStockpileKey(material) {
  return material === "stone" ? "quarry_stone" : "lumber_yard_lumber";
}

export function constructionMaterialRequirements(site) {
  const quantities = new Map();
  for (const element of constructionElements(site)) {
    const key = constructionStockpileKey(element.material);
    quantities.set(key, (quantities.get(key) ?? 0) + element.materialRequired);
  }
  return [...quantities].map(([key, quantity]) => ({
    key,
    quantity,
    consume: true,
  }));
}

function constructionLaborRequired(element) {
  return (
    element.laborRequired ??
    (element.kind === "fence" ? 6 : element.kind === "wall" ? 10 : 12)
  );
}

function retrofitAdditions(job, site, work) {
  const interior = {
    x: site.x + 1,
    y: site.y + 1,
    width: Math.max(1, site.w - 2),
    height: Math.max(1, site.h - 2),
    material: site.wallMaterial ?? "timber",
  };
  site.floors ??= [{ key: "retrofitted_floor", ...interior }];
  site.roofs = [{ key: "retrofitted_roof", ...interior }];
  const existingKeys = new Set(work.elements.map((element) => element.key));
  return constructionElements(site)
    .filter(
      (element) =>
        ["floor", "roof"].includes(element.kind) &&
        !existingKeys.has(element.key),
    )
    .map((element) => ({
      ...element,
      id: namedUuid(job.id, `construction-element:${element.key}`),
      definitionId: definitionId("construction-element", element.kind),
      entityType: "construction-element",
      projectId: job.id,
      status: "planned",
      materialDelivered: false,
      materialDeliveredQuantity: 0,
      laborCompleted: 0,
      laborRequired: constructionLaborRequired(element),
    }));
}

function reopenRoofRetrofit(job, additions) {
  const materialInput = job.production?.inputs?.find(
    (input) => input.consume && input.requiresPickup,
  );
  if (materialInput)
    materialInput.quantity += additions.reduce(
      (total, element) => total + element.materialRequired,
      0,
    );
  job.progress.total += additions.reduce(
    (total, element) => total + element.laborRequired,
    0,
  );
  job.progress.completed = job.plan.constructionWork.elements.reduce(
    (total, element) => total + (element.laborCompleted ?? 0),
    0,
  );
  Object.assign(job, {
    status: "available",
    completedAtTick: null,
    assignedActorId: null,
    destination: null,
    blockingReason: null,
    nextRetryAtTick: null,
  });
  Object.assign(job.plan, {
    step: "to_input",
    activeConstructionElementKey: null,
    roofRetrofit: true,
  });
  job.basePriority = Math.max(job.basePriority ?? job.priority ?? 0, 130);
  job.priority = job.basePriority + (job.scheduleModifier ?? 0);
  job.reason = "mandatory_roof_retrofit";
  delete job.plan.derivedFacts;
  if (job.production) job.production.inputConsumed = false;
}

/**
 * Reopens construction created before roofs became mandatory. Existing shell
 * evidence and delivered material remain untouched; only missing interior
 * floor/roof work is appended to the original project identity.
 */
export function upgradeMissingConstructionRoofs(state) {
  let upgraded = 0;
  for (const job of state.village.jobs ?? []) {
    if (job.plan?.roofRetrofit && job.status !== "completed") {
      job.basePriority = Math.max(job.basePriority ?? job.priority ?? 0, 130);
      job.priority = job.basePriority + (job.scheduleModifier ?? 0);
      job.reason = "mandatory_roof_retrofit";
    }
    const site = job.plan?.construction,
      work = job.plan?.constructionWork,
      shell = work?.elements?.filter((element) =>
        ["wall", "door"].includes(element.kind),
      ),
      roofs = work?.elements?.filter((element) => element.kind === "roof");
    if (!site || !work || !shell?.length || roofs?.length) continue;
    const additions = retrofitAdditions(job, site, work);
    if (!additions.length) continue;
    const supportIds = work.elements
      .filter((element) => ["wall", "door"].includes(element.kind))
      .map((element) => element.id);
    for (const element of additions)
      if (element.kind === "roof") element.supportIds = [...supportIds];
    work.elements.push(...additions);
    reopenRoofRetrofit(job, additions);
    upgraded += 1;
  }
  if (upgraded) markVillageArchitectureDirty(state);
  return upgraded;
}

function oppositeHouseDoor(site, door) {
  const right = site.x + site.w - 1,
    bottom = site.y + site.h - 1;
  if (door.y === bottom)
    return { x: door.x, y: site.y, material: door.material ?? "wood" };
  if (door.y === site.y)
    return { x: door.x, y: bottom, material: door.material ?? "wood" };
  if (door.x === site.x)
    return { x: right, y: door.y, material: door.material ?? "wood" };
  return { x: site.x, y: door.y, material: door.material ?? "wood" };
}

function removeCompletedPrimitive(state, element) {
  state.village.constructionPrimitives = (
    state.village.constructionPrimitives ?? []
  ).filter((primitive) => primitive.id !== element.id);
}

function reopenExitRetrofit(state, job, element) {
  const actor = state.village.npcStates.find(
    (candidate) => candidate.id === job.assignedActorId,
  );
  if (actor) actor.workState = "available";
  releaseJobReservations(state, job.id, "mandatory_exit_retrofit");
  Object.assign(job, {
    status: "available",
    completedAtTick: null,
    assignedActorId: null,
    destination: null,
    blockingReason: null,
    nextRetryAtTick: null,
  });
  Object.assign(job.plan, {
    step: "to_input",
    activeConstructionElementKey: element.key,
    exitRetrofit: true,
  });
  job.basePriority = Math.max(job.basePriority ?? job.priority ?? 0, 135);
  job.priority = job.basePriority + (job.scheduleModifier ?? 0);
  job.reason = "mandatory_exit_retrofit";
  delete job.plan.derivedFacts;
}

function convertWallToDoor(state, job, element) {
  const wasComplete = element.status === "complete",
    previousMaterial = element.materialRequired ?? WOOD_BUILD_COSTS.wall;
  if (wasComplete) removeCompletedPrimitive(state, element);
  Object.assign(element, {
    kind: "door",
    definitionId: definitionId("construction-element", "door"),
    status: wasComplete ? "planned" : element.status,
    materialRequired: WOOD_BUILD_COSTS.door,
    materialDelivered: false,
    laborCompleted: wasComplete ? 0 : Math.min(element.laborCompleted ?? 0, 12),
    laborRequired: 12,
  });
  const input = job.production?.inputs?.find(
    (candidate) => candidate.consume && candidate.requiresPickup,
  );
  if (input) input.quantity += WOOD_BUILD_COSTS.door - previousMaterial;
}

function syncHouseEntrance(job, site) {
  job.targetPosition = { ...site.door };
  job.plan.accessPosition = { ...site.door };
}

function legacyExitWall(site, work, roadDoor) {
  return work.elements.find(
    (element) =>
      element.kind === "wall" &&
      cellKey(element.position) === cellKey(roadDoor),
  );
}

function recalculateConstructionProgress(job, work) {
  job.progress.total = work.elements.reduce(
    (total, element) => total + constructionLaborRequired(element),
    0,
  );
  job.progress.completed = work.elements.reduce(
    (total, element) => total + (element.laborCompleted ?? 0),
    0,
  );
}

/**
 * Converts legacy one-door founder homes into road-facing, two-exit homes.
 * The old entrance remains an escape route; its opposite wall is rebuilt.
 */
export function upgradeMissingHouseExits(state) {
  let upgraded = 0;
  for (const job of state.village.jobs ?? []) {
    const site = job.plan?.construction,
      work = job.plan?.constructionWork;
    if (job.plan?.exitRetrofit && site) syncHouseEntrance(job, site);
    if (
      !site?.key?.startsWith("founder_house_") ||
      !work ||
      site.secondaryDoors?.length
    )
      continue;
    const legacyDoor = { ...site.door },
      roadDoor = oppositeHouseDoor(site, legacyDoor),
      wall = legacyExitWall(site, work, roadDoor);
    if (!wall) continue;
    site.door = roadDoor;
    site.secondaryDoors = [legacyDoor];
    syncHouseEntrance(job, site);
    convertWallToDoor(state, job, wall);
    recalculateConstructionProgress(job, work);
    reopenExitRetrofit(state, job, wall);
    upgraded += 1;
  }
  if (upgraded) markVillageArchitectureDirty(state);
  return upgraded;
}

const MANAGED_FACILITIES = new Set([
  "lumber_yard",
  "farmstead",
  "communal_kitchen",
  "housing",
  "fishing_hut",
  "forge",
]);

function constructionEntityCollections(state) {
  return [
    state.village.constructionPrimitives ?? [],
    state.village.doors ?? [],
    state.village.fixtures ?? [],
  ];
}

function constructionEntity(state, id) {
  for (const collection of constructionEntityCollections(state)) {
    const entity = collection.find((candidate) => candidate.id === id);
    if (entity) return entity;
  }
  return null;
}

function serviceable(entity) {
  return (
    entity &&
    entity.lifecycleState !== "destroyed" &&
    entity.lifecycleState !== "deconstructed" &&
    entity.state !== "destroyed" &&
    (entity.condition ?? 1) > 0
  );
}

function constructionProjects(state) {
  return (state.village.jobs ?? [])
    .filter((job) => job.plan?.constructionWork && job.plan?.construction)
    .sort(
      (left, right) =>
        left.createdAtTick - right.createdAtTick ||
        left.id.localeCompare(right.id),
    );
}

function physicalEvidence(state, job) {
  const elements = job.plan.constructionWork.elements,
    entities = new Map(
      elements.map((element) => [
        element.id,
        constructionEntity(state, element.id),
      ]),
    ),
    present = (element) => serviceable(entities.get(element.id));
  return { elements, entities, present };
}

// function-length-exempt: template -- building projection from physical evidence
function derivedBuilding(state, job, evidence) {
  const site = job.plan.construction,
    shell = evidence.elements.filter((element) =>
      ["wall", "door"].includes(element.kind),
    ),
    roofs = evidence.elements.filter((element) => element.kind === "roof");
  if (!shell.length || !shell.every(evidence.present)) return null;
  const roofed =
      roofs.length > 0 && roofs.every((roof) => roofSupported(evidence, roof)),
    allComplete = evidence.elements.every(evidence.present) && roofed,
    previous = (state.village.buildings ?? []).find(
      (building) => building.key === site.key,
    );
  return {
    ...(previous ?? {}),
    id: namedUuid(state.id, `building:${site.key}`),
    definitionId: definitionId(
      "building",
      site.key.startsWith("founder_house_") && allComplete
        ? "family_house"
        : site.key,
    ),
    entityType: "building",
    key: site.key,
    x: site.x,
    y: site.y,
    w: site.w,
    h: site.h,
    name: site.name,
    glyph: site.glyph ?? "H",
    wallMaterial: site.wallMaterial,
    door: { ...site.door },
    secondaryDoors: structuredClone(site.secondaryDoors ?? []),
    enclosures: structuredClone(site.enclosures ?? []),
    primitiveBacked: true,
    status: allComplete ? "complete" : "enclosed",
    roofed,
    roofIds: roofs.filter(evidence.present).map((roof) => roof.id),
    evidenceIds: (allComplete
      ? evidence.elements.filter(evidence.present)
      : shell
    ).map((element) => element.id),
  };
}

function roofSupported(evidence, roof) {
  return (
    evidence.present(roof) &&
    roof.supportIds?.length > 0 &&
    roof.supportIds.every((id) => serviceable(evidence.entities.get(id)))
  );
}

function derivedRoom(state, job, building, evidence) {
  const floor = evidence.elements.find((element) => element.kind === "floor"),
    roof = evidence.elements.find((element) => element.kind === "roof");
  if (!building || !floor || !roof || !evidence.present(floor)) return null;
  return {
    id: namedUuid(state.id, `room:${building.key}:interior`),
    definitionId: definitionId("room", "interior"),
    entityType: "room",
    buildingId: building.id,
    key: `${building.key}_interior`,
    status: roofSupported(evidence, roof) ? "sheltered" : "exposed",
    sheltered: roofSupported(evidence, roof),
    floorId: floor.id,
    roofId: roof.id,
    supportIds: [...(roof.supportIds ?? [])],
    x: floor.position.x,
    y: floor.position.y,
    w: floor.width ?? 1,
    h: floor.height ?? 1,
  };
}

// function-length-exempt: template -- residence projection from physical evidence
function derivedResidence(state, job, building, room, evidence) {
  if (
    !building ||
    building.status !== "complete" ||
    !room?.sheltered ||
    !job.plan.construction.key.startsWith("founder_house_")
  )
    return null;
  const fixtures = evidence.elements
      .filter(
        (element) => element.kind === "fixture" && evidence.present(element),
      )
      .map((element) => evidence.entities.get(element.id)),
    beds = fixtures.filter((fixture) => fixture.role === "bed"),
    roles = new Set(fixtures.map((fixture) => fixture.role)),
    required = ["bed", "kitchen", "storage", "table", "chair"],
    bedCapacity = beds.reduce(
      (total, bed) => total + (bed.sleepingCapacity ?? 0),
      0,
    );
  if (required.some((role) => !roles.has(role)) || bedCapacity < 1) return null;
  const previous = (state.village.residences ?? []).find(
      (residence) => residence.buildingId === building.id,
    ),
    residentCapacity = Math.min(job.plan.houseCapacity ?? 4, bedCapacity);
  return {
    ...(previous ?? {}),
    id: namedUuid(state.id, `residence:${building.key}`),
    definitionId: definitionId("residence", "family_house"),
    entityType: "residence",
    buildingId: building.id,
    roomId: room.id,
    status: "complete",
    habitable: true,
    residentCapacity,
    bedCapacity,
    plannedHouseholdId: job.plan.targetHouseholdId ?? null,
    occupantIds: [...(previous?.occupantIds ?? [])],
    householdIds: [...(previous?.householdIds ?? [])],
    evidenceIds: evidence.elements.map((element) => element.id),
    plan: designHouse(residentCapacity),
  };
}

// function-length-exempt: template -- pasture projection from physical evidence
function derivedPastures(state, job, evidence) {
  return (job.plan.construction.enclosures ?? []).flatMap((enclosure) => {
    if ((enclosure.purpose ?? "pasture") !== "pasture") return [];
    const elements = evidence.elements.filter(
      (element) => element.pastureKey === enclosure.key,
    );
    if (!elements.length || !elements.every(evidence.present)) return [];
    const gateElement = elements.find((element) => element.kind === "gate"),
      gate = evidence.entities.get(gateElement?.id),
      previous = (state.village.pastures ?? []).find(
        (pasture) => pasture.key === enclosure.key,
      );
    return [
      {
        ...(previous ?? {}),
        id: namedUuid(state.id, `pasture:${enclosure.key}`),
        definitionId: definitionId("pasture", enclosure.key),
        entityType: "pasture",
        status: "complete",
        ...structuredClone(enclosure),
        evidenceIds: elements.map((element) => element.id),
        gate: {
          ...structuredClone(enclosure.gate),
          id: gate.id,
          entityType: "gate",
          material: gate.material,
          state: gate.state,
        },
      },
    ];
  });
}

function retainResidenceAssignments(state, residences) {
  const residentIds = new Set(
      state.village.npcStates.map((resident) => resident.id),
    ),
    assigned = new Set();
  for (const residence of residences) {
    const planned = residence.plannedHouseholdId
      ? (state.village.households.find(
          (household) => household.id === residence.plannedHouseholdId,
        )?.memberIds ?? [])
      : residence.occupantIds;
    residence.occupantIds = planned
      .filter((id) => residentIds.has(id) && !assigned.has(id))
      .slice(0, residence.residentCapacity);
    for (const id of residence.occupantIds) assigned.add(id);
  }
  const available = state.village.npcStates
    .filter((resident) => !assigned.has(resident.id))
    .sort(
      (left, right) =>
        left.life.needs.safety - right.life.needs.safety ||
        ["hunger", "fatigue", "safety"].reduce(
          (total, need) =>
            total + left.life.needs[need] - right.life.needs[need],
          0,
        ) ||
        left.id.localeCompare(right.id),
    );
  return { assigned, available };
}

function fillResidenceVacancies(residences, assigned, available) {
  for (const residence of residences)
    while (
      !residence.plannedHouseholdId &&
      residence.occupantIds.length < residence.residentCapacity &&
      available.length
    ) {
      const resident = available.shift();
      residence.occupantIds.push(resident.id);
      assigned.add(resident.id);
    }
}

function residenceBed(state, residence, resident) {
  if (!residence) return null;
  const beds = state.village.fixtures
    .filter(
      (fixture) =>
        fixture.buildingId === residence.buildingId &&
        fixture.role === "bed" &&
        serviceable(fixture),
    )
    .sort((left, right) => left.id.localeCompare(right.id));
  return beds[residence.occupantIds.indexOf(resident.id)] ?? null;
}

function assignResidentSleep(state, residences, resident) {
  const residence = residences.find((candidate) =>
      candidate.occupantIds.includes(resident.id),
    ),
    bed = residenceBed(state, residence, resident),
    bedroll = bed
      ? null
      : state.village.fixtures.find(
          (fixture) =>
            fixture.temporary && fixture.assignedActorId === resident.id,
        );
  resident.residenceId = residence?.id ?? null;
  if (bed)
    resident.sleepingLocation = {
      fixtureId: bed.id,
      position: { x: bed.x, y: bed.y },
    };
  else if (bedroll)
    resident.sleepingLocation = {
      fixtureId: bedroll.id,
      position: { x: bedroll.x, y: bedroll.y },
      temporary: true,
    };
}

function residenceHouseholdIds(state, residence) {
  return [
    ...new Set(
      residence.occupantIds
        .map(
          (id) =>
            state.village.npcStates.find((resident) => resident.id === id)
              ?.householdId,
        )
        .filter(Boolean),
    ),
  ];
}

function assignDerivedResidences(state, residences) {
  const { assigned, available } = retainResidenceAssignments(state, residences);
  fillResidenceVacancies(residences, assigned, available);
  for (const resident of state.village.npcStates) {
    assignResidentSleep(state, residences, resident);
  }
  for (const residence of residences)
    residence.householdIds = residenceHouseholdIds(state, residence);
}

/**
 * Rebuilds every architectural summary from serviceable physical primitives.
 * Returned transitions allow the simulation to emit events without making the
 * event handler authoritative for world state.
 */
// function-length-exempt: template -- complete derived architecture projection
export function deriveVillageArchitecture(state) {
  if (state.village.architectureDirty === false)
    return {
      facilitiesAdded: [],
      facilitiesRemoved: [],
      residencesAdded: [],
      residencesRemoved: [],
    };
  state.village.rooms ??= [];
  state.village.constructionHistory ??= [];
  const projects = constructionProjects(state),
    managedByProjects = new Set(
      projects.map((job) => job.plan.facilityKey).filter(Boolean),
    );
  if (projects.some((job) => job.plan.buildHouse))
    managedByProjects.add("housing");
  const previousFacilities = new Set(state.village.facilities ?? []),
    previousResidenceIds = new Set(
      (state.village.residences ?? []).map((residence) => residence.id),
    ),
    unrelatedBuildings = (state.village.buildings ?? []).filter(
      (building) => !building.primitiveBacked,
    ),
    buildings = [],
    rooms = [],
    residences = [],
    pastures = (state.village.pastures ?? []).filter(
      (pasture) => !pasture.evidenceIds?.length,
    ),
    facilities = new Set(
      [...previousFacilities].filter(
        (facility) =>
          !MANAGED_FACILITIES.has(facility) || !managedByProjects.has(facility),
      ),
    );
  for (const job of projects) {
    const evidence = physicalEvidence(state, job),
      building = derivedBuilding(state, job, evidence),
      room = derivedRoom(state, job, building, evidence),
      residence = derivedResidence(state, job, building, room, evidence);
    const roofElements = evidence.elements.filter(
        (element) => element.kind === "roof",
      ),
      roofed =
        roofElements.length > 0 &&
        roofElements.every((roof) => roofSupported(evidence, roof));
    job.plan.derivedFacts = {
      expected: evidence.elements.length,
      permanent: evidence.elements.filter(evidence.present).length,
      roofRequired: true,
      roofed,
      complete:
        evidence.elements.length > 0 &&
        evidence.elements.every(evidence.present) &&
        roofed,
    };
    if (building) buildings.push(building);
    if (room) rooms.push(room);
    if (residence) residences.push(residence);
    pastures.push(...derivedPastures(state, job, evidence));
    const commissioningApproved =
      !job.plan.specialistFacility ||
      job.plan.commissioning?.status === "approved";
    if (
      job.plan.facilityKey &&
      building?.status === "complete" &&
      commissioningApproved
    )
      facilities.add(job.plan.facilityKey);
  }
  assignDerivedResidences(state, residences);
  if (state.village.npcStates.every((resident) => resident.residenceId))
    facilities.add("housing");
  state.village.buildings = [...unrelatedBuildings, ...buildings];
  state.village.rooms = rooms;
  state.village.residences = residences;
  state.village.pastures = pastures;
  state.village.facilities = [...facilities].sort();
  state.village.architectureDerivedAtTick = state.tick;
  state.village.architectureDirty = false;
  return {
    facilitiesAdded: [...facilities].filter(
      (facility) => !previousFacilities.has(facility),
    ),
    facilitiesRemoved: [...previousFacilities].filter(
      (facility) =>
        MANAGED_FACILITIES.has(facility) && !facilities.has(facility),
    ),
    residencesAdded: residences.filter(
      (residence) => !previousResidenceIds.has(residence.id),
    ),
    residencesRemoved: [...previousResidenceIds].filter(
      (id) => !residences.some((residence) => residence.id === id),
    ),
  };
}

export function damageConstructionEntity(state, entityId, amount) {
  const entity = constructionEntity(state, entityId);
  if (!entity || !Number.isFinite(amount) || amount <= 0) return false;
  entity.maxCondition ??= 100;
  entity.condition = Math.max(
    0,
    (entity.condition ?? entity.maxCondition) - amount,
  );
  entity.lifecycleState = entity.condition === 0 ? "destroyed" : "damaged";
  state.village.architectureDirty = true;
  deriveVillageArchitecture(state);
  return true;
}

export function repairConstructionEntity(state, entityId) {
  const entity = constructionEntity(state, entityId);
  if (!entity || entity.lifecycleState === "deconstructed") return false;
  entity.maxCondition ??= 100;
  if ((entity.condition ?? entity.maxCondition) >= entity.maxCondition)
    return false;
  const lumber = state.village.stockpiles.find(
    (stockpile) =>
      stockpile.itemKind === "building_lumber" && stockpile.quantity > 0,
  );
  if (!lumber) return false;
  lumber.quantity -= 1;
  entity.condition = entity.maxCondition;
  entity.lifecycleState = "complete";
  state.village.architectureDirty = true;
  deriveVillageArchitecture(state);
  return true;
}

export function deconstructConstructionEntity(state, entityId) {
  const collections = constructionEntityCollections(state),
    collection = collections.find((items) =>
      items.some((candidate) => candidate.id === entityId),
    ),
    entity = collection?.find((candidate) => candidate.id === entityId);
  if (!entity) return false;
  collection.splice(collection.indexOf(entity), 1);
  state.village.constructionHistory ??= [];
  state.village.constructionHistory.push({
    id: entity.id,
    kind: entity.kind ?? entity.objectKind ?? entity.entityType,
    lifecycleState: "deconstructed",
    deconstructedAtTick: state.tick,
  });
  const lumber = state.village.stockpiles.find(
    (stockpile) => stockpile.itemKind === "building_lumber",
  );
  if (lumber && entity.materialQuantity > 0)
    lumber.quantity = Math.min(
      lumber.capacity,
      lumber.quantity + Math.floor(entity.materialQuantity / 2),
    );
  state.village.architectureDirty = true;
  deriveVillageArchitecture(state);
  return true;
}

function suspendConstructionProject(state, job) {
  if (!["available", "reserved", "active"].includes(job.status)) return false;
  const actor = state.village.npcStates.find(
    (candidate) => candidate.id === job.assignedActorId,
  );
  transitionJob(job, "suspended", state.tick, "player_suspended");
  releaseJobReservations(state, job.id, "player_suspended");
  if (actor) actor.workState = "available";
  return true;
}

function returnCancelledMaterials(state, job) {
  const source = job.production?.inputs
      ?.filter((input) => input.consume)
      .map((input) =>
        state.village.stockpiles.find(
          (stockpile) => stockpile.id === input.stockpileId,
        ),
      )
      .find(Boolean),
    returned = (state.village.constructionMaterials ?? []).filter(
      (material) =>
        material.projectId === job.id && material.state === "delivered",
    );
  for (const material of returned) {
    if (source)
      source.quantity = Math.min(
        source.capacity,
        source.quantity + material.quantity,
      );
    material.state = "returned";
    material.returnedAtTick = state.tick;
  }
}

function cancelConstructionProject(state, job) {
  returnCancelledMaterials(state, job);
  const cancelled = cancelJob(state, job, "player_cancelled");
  if (cancelled) {
    state.village.architectureDirty = true;
    deriveVillageArchitecture(state);
  }
  return cancelled;
}

export function controlConstructionProject(state, projectId, action, value) {
  const job = state.village.jobs.find(
    (candidate) => candidate.id === projectId && candidate.plan?.construction,
  );
  if (!job) return false;
  if (action === "prioritize") {
    const priority = Math.max(1, Math.min(200, Number(value)));
    if (!Number.isFinite(priority)) return false;
    job.basePriority = priority;
    job.priority = priority + (job.scheduleModifier ?? 0);
    return true;
  }
  if (action === "suspend") {
    return suspendConstructionProject(state, job);
  }
  if (action === "resume") {
    if (job.status !== "suspended") return false;
    transitionJob(job, "available", state.tick);
    job.assignedActorId = null;
    return true;
  }
  if (action !== "cancel") return false;
  return cancelConstructionProject(state, job);
}

export function markVillageArchitectureDirty(state) {
  state.village.architectureDirty = true;
}

export { BED_TYPES, FOUNDER_HOUSE_PLOTS, HOUSE_ARCHETYPES };
