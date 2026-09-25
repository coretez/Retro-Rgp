import { createHash } from "node:crypto";
import { definitionId } from "./identity.js";

export const DUNGEON_GENERATOR_VERSION = "original-table-driven-v1.0.0";

export const DUNGEON_FORMS = [
  "auto",
  "fortress",
  "temple",
  "crypt",
  "rooms",
  "natural_caves",
  "mine",
  "flooded_underways",
  "hybrid",
];

// These are original project tables. They are inspired by the useful workflow
// of early tabletop dungeon procedures, not copied from an edition or appendix.
export const DUNGEON_TABLES = [
  {
    id: definitionId("dungeon-table", "dungeon-form-v1"),
    key: "dungeon-form-v1",
    sides: 100,
    rows: [
      { min: 1, max: 14, result: "fortress" },
      { min: 15, max: 27, result: "temple" },
      { min: 28, max: 39, result: "crypt" },
      { min: 40, max: 49, result: "rooms" },
      { min: 50, max: 66, result: "natural_caves" },
      { min: 67, max: 77, result: "mine" },
      { min: 78, max: 87, result: "flooded_underways" },
      { min: 88, max: 100, result: "hybrid" },
    ],
  },
  {
    id: definitionId("dungeon-table", "dungeon-state-v1"),
    key: "dungeon-state-v1",
    sides: 12,
    rows: [
      { min: 1, max: 2, result: "occupied and maintained" },
      { min: 3, max: 5, result: "partly ruined but actively defended" },
      { min: 6, max: 8, result: "abandoned and claimed by later inhabitants" },
      { min: 9, max: 10, result: "sealed after a sudden disaster" },
      { min: 11, max: 11, result: "being excavated or rebuilt" },
      { min: 12, max: 12, result: "warped by an unnatural influence" },
    ],
  },
];

const THEMES = {
  fortress: {
    title: "The Broken March Keep",
    archetype: "fortress_keep",
    construction: "Dressed stone barracks, defended turns and narrow gates",
    dominantFeature: "A defensible inner ward controls movement between wings",
    atmosphere:
      "Old discipline survives as barricades, signals and patrol routes",
    inhabitants: ["bandit", "goblin", "ogre"],
    features: ["collapsed guardroom", "murder-hole gallery", "armory racks"],
    hazards: ["falling portcullis", "unstable parapet", "alarm cord"],
  },
  temple: {
    title: "The Temple Below the Processional Road",
    archetype: "human_temple",
    construction: "Axial ceremonial halls, side chapels and service passages",
    dominantFeature: "A desecrated sanctuary anchors the level",
    atmosphere:
      "Ritual order remains legible beneath soot, theft and occupation",
    inhabitants: ["bandit", "skeleton"],
    features: ["votive alcoves", "processional mosaic", "sealed reliquary"],
    hazards: [
      "counterweighted incense stone",
      "weak crypt floor",
      "warning bell",
    ],
  },
  crypt: {
    title: "The Procession of Silent Names",
    archetype: "burial_crypt",
    construction: "Stone burial chambers linked by a formal funerary route",
    dominantFeature: "The oldest tomb lies beyond later, poorer interments",
    atmosphere:
      "Genealogy, theft and disturbed burial customs tell the history",
    inhabitants: ["skeleton", "bandit"],
    features: ["inscribed bier", "bone niche", "mourning chamber"],
    hazards: ["grave-gas pocket", "sliding burial slab", "rotted floor boards"],
  },
  rooms: {
    title: "The Buried Household",
    archetype: "constructed_rooms",
    construction:
      "Connected chambers, storage rooms and repurposed domestic halls",
    dominantFeature: "Successive occupants divided a once-coherent residence",
    atmosphere: "Every room shows a different layer of use and abandonment",
    inhabitants: ["bandit", "goblin", "skeleton"],
    features: ["cold hearth", "partition wall", "sealed store"],
    hazards: ["jammed door", "loose ceiling", "concealed refuse pit"],
  },
  natural_caves: {
    title: "The Breathing Caves",
    archetype: "natural_cavern",
    construction: "Irregular chambers joined by constricted limestone passages",
    dominantFeature: "Airflow and water noise reveal routes before sight does",
    atmosphere:
      "Wet stone, animal traces and mineral growth replace architecture",
    inhabitants: ["goblin", "ogre"],
    features: ["calcite curtain", "guano shelf", "echoing chimney"],
    hazards: ["slick drop", "loose scree", "flash-flood channel"],
  },
  mine: {
    title: "The Abandoned Deepwork",
    archetype: "abandoned_mine",
    construction: "Worked galleries open into rough extraction chambers",
    dominantFeature:
      "A failed main shaft divides old workings from a new claim",
    atmosphere:
      "Tool marks, supports and spoil piles make the site's economics visible",
    inhabitants: ["goblin", "bandit", "ogre"],
    features: ["ore face", "timber lift", "abandoned sorting floor"],
    hazards: ["rotted shoring", "open winze", "powder-dry dust"],
  },
  flooded_underways: {
    title: "The River Under the Hill",
    archetype: "underground_river",
    construction: "Masonry access chambers interrupted by water-cut caverns",
    dominantFeature: "A cold underground river crosses the usable route",
    atmosphere:
      "Current, water level and distant echoes govern travel and habitation",
    inhabitants: ["goblin", "bandit", "ogre"],
    features: ["flood gauge", "stone landing", "silted side chamber"],
    hazards: ["swift current", "submerged step", "flood-stained collapse"],
  },
  hybrid: {
    title: "The Keep Rooted in Stone",
    archetype: "ruin_cavern_hybrid",
    construction: "A constructed stronghold breaks into older natural caves",
    dominantFeature:
      "The boundary between masonry and living rock is contested ground",
    atmosphere:
      "Two spatial languages expose two histories and two kinds of inhabitant",
    inhabitants: ["bandit", "goblin", "skeleton", "ogre"],
    features: ["breached foundation", "cave shrine", "blocked sally port"],
    hazards: ["undermined wall", "hidden fissure", "improvised alarm"],
  },
};

const hashBytes = (value) => createHash("sha256").update(value).digest();
const stableUuid = (value) => {
  const bytes = hashBytes(value).subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

function random(seed) {
  let state = hashBytes(seed).readUInt32LE(0) || 1;
  const next = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x100000000;
  };
  return {
    int(min, max) {
      return min + Math.floor(next() * (max - min + 1));
    },
    pick(values) {
      return values[this.int(0, values.length - 1)];
    },
    shuffle(values) {
      const copy = [...values];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = this.int(0, i);
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    },
  };
}

export function resolveDungeonTable(id, face) {
  const table = DUNGEON_TABLES.find(
    (candidate) => candidate.id === id || candidate.key === id,
  );
  if (!table) throw new Error(`Unknown dungeon table: ${id}`);
  if (!Number.isInteger(face) || face < 1 || face > table.sides)
    throw new Error(`Face must be an integer from 1 to ${table.sides}.`);
  return table.rows.find((row) => face >= row.min && face <= row.max).result;
}

const cellKey = ({ x, y }) => `${x},${y}`;
const center = (room) => ({
  x: room.x + Math.floor(room.width / 2),
  y: room.y + Math.floor(room.height / 2),
});

function line(a, b, horizontalFirst) {
  const cells = [];
  let { x, y } = a;
  const walkX = () => {
    while (x !== b.x) {
      x += Math.sign(b.x - x);
      cells.push({ x, y });
    }
  };
  const walkY = () => {
    while (y !== b.y) {
      y += Math.sign(b.y - y);
      cells.push({ x, y });
    }
  };
  cells.push({ x, y });
  if (horizontalFirst) {
    walkX();
    walkY();
  } else {
    walkY();
    walkX();
  }
  return cells;
}

function formFor(request, rng) {
  if (request.form !== "auto") return request.form;
  return resolveDungeonTable("dungeon-form-v1", rng.int(1, 100));
}

function dimensions(size) {
  // Rogue-only profiles deliberately create exploration-sized floors without
  // changing the public small/medium/large dungeon-generation contract.
  if (size === "rogue_expansive") return { width: 56, height: 40, rooms: 14 };
  if (size === "rogue_vast") return { width: 72, height: 52, rooms: 20 };
  if (size === "small") return { width: 22, height: 22, rooms: 6 };
  if (size === "large") return { width: 32, height: 32, rooms: 12 };
  return { width: 28, height: 28, rooms: 9 };
}

function buildRooms({ width, height, count, form, theme, rng }) {
  const columns = count > 9 ? 4 : 3;
  const rows = Math.ceil(count / columns);
  const cellWidth = Math.floor((width - 2) / columns);
  const cellHeight = Math.floor((height - 2) / rows);
  const slots = rng
    .shuffle(
      Array.from({ length: columns * rows }, (_, index) => ({
        column: index % columns,
        row: Math.floor(index / columns),
      })),
    )
    .slice(0, count);
  const rough = [
    "natural_caves",
    "mine",
    "flooded_underways",
    "hybrid",
  ].includes(form);
  const purposes = [
    "threshold",
    "guard",
    "work",
    "storage",
    "assembly",
    "ritual",
    "habitation",
    "hazard",
    "command",
    "secret",
  ];
  return slots.map((slot, index) => {
    const maxWidth = Math.max(3, cellWidth - 2);
    const maxHeight = Math.max(3, cellHeight - 2);
    const roomWidth = rng.int(3, maxWidth);
    const roomHeight = rng.int(3, maxHeight);
    const baseX = 1 + slot.column * cellWidth;
    const baseY = 1 + slot.row * cellHeight;
    const x = baseX + rng.int(0, Math.max(0, cellWidth - roomWidth - 1));
    const y = baseY + rng.int(0, Math.max(0, cellHeight - roomHeight - 1));
    const feature = rng.pick(theme.features);
    return {
      id: `room-${String(index + 1).padStart(2, "0")}`,
      name:
        index === 0
          ? "Entrance"
          : index === count - 1
            ? "Dungeon Heart"
            : `${feature[0].toUpperCase()}${feature.slice(1)}`,
      x,
      y,
      width: roomWidth,
      height: roomHeight,
      shape: rough && index % 2 ? "rough" : "rectangular",
      purpose:
        index === 0
          ? "entrance"
          : index === count - 1
            ? "climax"
            : purposes[
                (index + rng.int(0, purposes.length - 1)) % purposes.length
              ],
      description: `${feature}. ${theme.atmosphere}.`,
      tags: [
        form,
        index === 0 ? "entrance" : index === count - 1 ? "climax" : "interior",
      ],
      contents: [],
    };
  });
}

function roomGraph(rooms, rng, loops) {
  const remaining = new Set(rooms.slice(1).map((room) => room.id));
  const connected = [rooms[0]];
  const edges = [];
  while (remaining.size) {
    let best;
    for (const from of connected)
      for (const to of rooms.filter((room) => remaining.has(room.id))) {
        const a = center(from),
          b = center(to),
          distance = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
        if (
          !best ||
          distance < best.distance ||
          (distance === best.distance && rng.int(0, 1))
        )
          best = { from, to, distance };
      }
    edges.push(best);
    connected.push(best.to);
    remaining.delete(best.to.id);
  }
  const existing = new Set(
    edges.map(({ from, to }) => [from.id, to.id].sort().join(":")),
  );
  const candidates = [];
  for (let i = 0; i < rooms.length; i++)
    for (let j = i + 1; j < rooms.length; j++) {
      const key = [rooms[i].id, rooms[j].id].sort().join(":");
      if (!existing.has(key)) {
        const a = center(rooms[i]),
          b = center(rooms[j]);
        candidates.push({
          from: rooms[i],
          to: rooms[j],
          distance: Math.abs(a.x - b.x) + Math.abs(a.y - b.y),
        });
      }
    }
  candidates.sort((a, b) => a.distance - b.distance);
  for (const candidate of rng
    .shuffle(candidates.slice(0, Math.max(loops * 3, loops)))
    .slice(0, loops))
    edges.push(candidate);
  return edges.map(({ from, to }, index) => ({
    id: `connection-${String(index + 1).padStart(2, "0")}`,
    from: from.id,
    to: to.id,
    kind: index < rooms.length - 1 ? "passage" : "alternate_route",
    secret: false,
    locked: false,
    cells: line(center(from), center(to), rng.int(0, 1) === 1),
  }));
}

function populate(rooms, request, theme, rng) {
  const densityRate = { sparse: 0.25, normal: 0.45, dense: 0.7 }[
    request.density
  ];
  const difficultyFactor = { easy: 0.65, standard: 1, hard: 1.35, deadly: 1.7 }[
    request.difficulty
  ];
  const occupied = Math.max(
    1,
    Math.min(rooms.length - 1, Math.round(rooms.length * densityRate)),
  );
  const candidates = rng.shuffle(rooms.slice(1));
  const encounters = candidates.slice(0, occupied).map((room, index) => {
    const catalogId = rng.pick(theme.inhabitants);
    const weight = { bandit: 1, goblin: 1, skeleton: 1, ogre: 4 }[catalogId];
    const count = Math.max(
      1,
      Math.min(
        8,
        Math.round(
          (request.partyLevel * request.partySize * difficultyFactor) /
            (5 * weight),
        ),
      ),
    );
    const encounter = {
      id: `encounter-${String(index + 1).padStart(2, "0")}`,
      roomId: room.id,
      catalogId,
      count,
      role: index === occupied - 1 ? "level_anchor" : "patrol_or_lair",
      difficulty: request.difficulty,
      guidance:
        "Draft stocking only. Resolve final encounter XP, terrain advantage, reinforcements and rest access before installation.",
    };
    room.contents.push({ type: "creature_group", ...encounter });
    return encounter;
  });
  const hazardRoom = rng.pick(
    rooms.slice(1, -1).length ? rooms.slice(1, -1) : rooms,
  );
  const hazard = {
    type: "hazard",
    name: rng.pick(theme.hazards),
    dc: Math.min(
      20,
      10 +
        Math.ceil(request.partyLevel / 3) +
        (request.difficulty === "deadly" ? 2 : 0),
    ),
    guidance:
      "Choose a suitable ability/save and consequence during mission authoring; this draft does not apply damage.",
  };
  hazardRoom.contents.push(hazard);
  return {
    density: request.density,
    targetDifficulty: request.difficulty,
    dominantCatalogIds: theme.inhabitants,
    occupiedRoomCount: occupied,
    encounters,
    hazards: [{ roomId: hazardRoom.id, ...hazard }],
    ecology:
      "The entrance, water/food access, patrol loops and fallback room should be reviewed together before play.",
  };
}

export function generateDungeon(campaign, request) {
  const normalized = {
    seed: request.seed,
    form: request.form ?? "auto",
    size: request.size ?? "medium",
    partyLevel: request.partyLevel ?? 1,
    partySize: request.partySize ?? 4,
    dungeonLevel: request.dungeonLevel ?? 1,
    density: request.density ?? "normal",
    difficulty: request.difficulty ?? "standard",
    themeHint: request.themeHint ?? null,
  };
  const rng = random(
    `${campaign.id}:${campaign.revision}:${JSON.stringify(normalized)}`,
  );
  const form = formFor(normalized, rng);
  const baseTheme = THEMES[form];
  const themeState = resolveDungeonTable("dungeon-state-v1", rng.int(1, 12));
  const theme = {
    title: normalized.themeHint || baseTheme.title,
    archetype: baseTheme.archetype,
    form,
    state: themeState,
    construction: baseTheme.construction,
    dominantFeature: baseTheme.dominantFeature,
    atmosphere: baseTheme.atmosphere,
    history: [
      `Originally created as a ${baseTheme.archetype.replaceAll("_", " ")}.`,
      `It is now ${themeState}.`,
      `Dungeon level ${normalized.dungeonLevel} should feel deeper through access, isolation and consequence, not merely stronger monsters.`,
    ],
  };
  const { width, height, rooms: count } = dimensions(normalized.size);
  const rooms = buildRooms({
    width,
    height,
    count,
    form,
    theme: baseTheme,
    rng,
  });
  const loopCount =
    normalized.size === "small" ? 1 : normalized.size === "large" ? 3 : 2;
  const connections = roomGraph(rooms, rng, loopCount);
  const floor = new Set();
  for (const room of rooms)
    for (let x = room.x; x < room.x + room.width; x++)
      for (let y = room.y; y < room.y + room.height; y++) {
        const corner =
          (x === room.x || x === room.x + room.width - 1) &&
          (y === room.y || y === room.y + room.height - 1);
        if (room.shape !== "rough" || !corner) floor.add(`${x},${y}`);
      }
  for (const connection of connections)
    for (const cell of connection.cells) floor.add(cellKey(cell));
  const blocked = [];
  for (let x = 0; x < width; x++)
    for (let y = 0; y < height; y++)
      if (!floor.has(`${x},${y}`)) blocked.push({ x, y });
  const floorCells = [...floor].map((key) => {
    const [x, y] = key.split(",").map(Number);
    return { x, y };
  });
  const difficultRate = [
    "natural_caves",
    "mine",
    "flooded_underways",
    "hybrid",
  ].includes(form)
    ? form === "flooded_underways"
      ? 0.22
      : 0.08
    : 0.02;
  const protectedCells = new Set([
    cellKey(center(rooms[0])),
    cellKey(center(rooms.at(-1))),
  ]);
  const difficultCandidates = floorCells.filter(
    (cell) => !protectedCells.has(cellKey(cell)),
  );
  const riverCells = difficultCandidates.filter(
    (cell) => Math.abs(cell.x - Math.floor(width / 2)) <= 1,
  );
  const difficult =
    form === "flooded_underways" && riverCells.length >= 3
      ? riverCells
      : rng
          .shuffle(difficultCandidates)
          .slice(0, Math.floor(floorCells.length * difficultRate));
  const population = populate(rooms, normalized, baseTheme, rng);
  return {
    schemaVersion: 1,
    generatorVersion: DUNGEON_GENERATOR_VERSION,
    id: stableUuid(
      `${campaign.id}:${campaign.revision}:${JSON.stringify(normalized)}`,
    ),
    campaignId: campaign.id,
    campaignRevision: campaign.revision,
    seed: normalized.seed,
    request: normalized,
    theme,
    entranceId: rooms[0].id,
    exitId: rooms.at(-1).id,
    map: {
      name: theme.title,
      grid: "square",
      width,
      height,
      blocked,
      difficult,
    },
    rooms,
    connections,
    population,
    generation: {
      complete: true,
      steps: rooms.length + connections.length + width * height,
      roomCount: rooms.length,
      connectionCount: connections.length,
      floorCellCount: floor.size,
      connected: true,
    },
    provenance: {
      profile: "original-table-driven-v1",
      source:
        "Original Retro RPG tables and geometry; inspired by procedural tabletop play, not a reproduction of historical D&D tables.",
      tables: DUNGEON_TABLES.map((table) => ({
        id: table.id,
        key: table.key,
      })),
    },
    installation: {
      state: "draft",
      mapSetCompatible: true,
      nextStep:
        "Review the theme, routes, room purposes and population; then pass map to map_set and compile approved rooms into a mission.",
      limitations: [
        "Generation is deterministic and read-only; this call does not mutate or persist the campaign.",
        "Doors, locks, secrets, vertical connections, light and dynamic water are metadata for later mission authoring, not map_set mechanics.",
        "Creature groups are stocking guidance, not a claim of final encounter balance.",
      ],
    },
  };
}
