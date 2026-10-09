export const VILLAGE_REGION = Object.freeze({
  minX: -2048,
  minY: -2048,
  maxX: 2047,
  maxY: 2047,
  width: 4096,
  height: 4096,
  chunkSize: 32,
  foundingEnvelope: 512,
  hamletEnvelope: 1024,
});

export const VILLAGE_REGION_GENERATION_VERSION = 4;

export function regionalRiverCenter(y) {
  return 82 + Math.round(Math.sin(y / 17) * 8 + Math.sin(y / 43) * 5);
}

function hashUnit(seed, x, y = 0) {
  let value =
    seedIndex(seed) ^ Math.imul(x, 374761393) ^ Math.imul(y, 668265263);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
}

function smooth(value) {
  return value * value * (3 - 2 * value);
}

function valueNoise(seed, x, y, scale) {
  const gx = Math.floor(x / scale),
    gy = Math.floor(y / scale);
  const tx = smooth(x / scale - gx),
    ty = smooth(y / scale - gy);
  const north =
    hashUnit(seed, gx, gy) * (1 - tx) + hashUnit(seed, gx + 1, gy) * tx;
  const south =
    hashUnit(seed, gx, gy + 1) * (1 - tx) + hashUnit(seed, gx + 1, gy + 1) * tx;
  return north * (1 - ty) + south * ty;
}

function terrainNoise(seed, x, y) {
  return (
    valueNoise(seed, x, y, 192) * 0.52 +
    valueNoise(`${seed}:mid`, x, y, 72) * 0.31 +
    valueNoise(`${seed}:fine`, x, y, 24) * 0.17
  );
}

function generatedRiverCenter(seed, y) {
  const base = -80 + Math.floor(hashUnit(seed, 3) * 160);
  const phaseA = hashUnit(seed, 5) * Math.PI * 2;
  const phaseB = hashUnit(seed, 7) * Math.PI * 2;
  return Math.round(
    base +
      Math.sin(y / 61 + phaseA) * 44 +
      Math.sin(y / 23 + phaseB) * 17 +
      (terrainNoise(seed, 0, y) - 0.5) * 34,
  );
}

function generatedRiverWidth(seed, y) {
  return 3 + Math.floor(hashUnit(`${seed}:width`, Math.floor(y / 18)) * 4);
}

function generatedRidgeDistance(seed, x, y) {
  const side = hashUnit(`${seed}:ridge-side`, 1) < 0.5 ? -1 : 1;
  const offset = 126 + Math.sin(y / 137 + hashUnit(seed, 19) * 6) * 34;
  const center = generatedRiverCenter(seed, y) + side * offset;
  return Math.abs(x - center);
}

function tributaryDistance(seed, x, y, index) {
  const joinY = tributaryJoinY(seed, index);
  const reach = tributaryReach(seed, index);
  const deltaY = y - joinY;
  if (deltaY < -reach || deltaY > 8) return Infinity;
  const progress = Math.max(0, Math.min(1, (deltaY + reach) / reach));
  return Math.abs(x - generatedTributaryPoint(seed, index, progress).x);
}

function generatedTributaryPoint(seed, index, progress) {
  const joinY = tributaryJoinY(seed, index);
  const reach = tributaryReach(seed, index);
  const side = index === 0 ? -1 : 1;
  const mainX = generatedRiverCenter(seed, joinY);
  const sourceX = mainX + side * (190 + hashUnit(seed, index, 9) * 150);
  const bend = Math.sin(progress * Math.PI * 2 + index) * 24 * (1 - progress);
  return {
    x: Math.round(sourceX + (mainX - sourceX) * progress + bend),
    y: Math.round(joinY - reach + reach * progress),
  };
}

function tributaryJoinY(seed, index) {
  const span = Math.floor(VILLAGE_REGION.height * 0.72);
  return Math.floor(-span / 2 + hashUnit(`${seed}:join`, index) * span);
}

function tributaryReach(seed, index) {
  const base = Math.floor(VILLAGE_REGION.height * 0.1);
  return base + Math.floor(hashUnit(`${seed}:reach`, index) * base * 0.75);
}

function sampledLine(samples, pointAt) {
  return Array.from({ length: samples + 1 }, (_, index) =>
    pointAt(index / samples),
  );
}

export function regionalSurveyGeometry(seed, mode) {
  if (mode !== "regional_v3") return { waterways: [], trail: [] };
  const main = sampledLine(32, (progress) => {
    const y = VILLAGE_REGION.minY + progress * (VILLAGE_REGION.height - 1);
    return { x: generatedRiverCenter(seed, y), y: Math.round(y) };
  });
  return {
    waterways: [
      { name: "main_river", points: main },
      {
        name: "west_tributary",
        points: sampledLine(12, (progress) =>
          generatedTributaryPoint(seed, 0, progress),
        ),
      },
      {
        name: "east_tributary",
        points: sampledLine(12, (progress) =>
          generatedTributaryPoint(seed, 1, progress),
        ),
      },
    ],
    trail: sampledLine(32, (progress) => {
      const x = VILLAGE_REGION.minX + progress * (VILLAGE_REGION.width - 1);
      return { x: Math.round(x), y: regionalTrailY(seed, x, mode) };
    }),
  };
}

export function regionalHydrology(seed, x, y, mode = "legacy_origin") {
  if (mode !== "regional_v3") {
    const distance = Math.abs(x - regionalRiverCenter(y));
    return { water: distance <= 2, bank: distance <= 4, floodplain: false };
  }
  const mainDistance = Math.abs(x - generatedRiverCenter(seed, y));
  const tributaryDistanceValue = Math.min(
    tributaryDistance(seed, x, y, 0),
    tributaryDistance(seed, x, y, 1),
  );
  const distance = Math.min(mainDistance, tributaryDistanceValue);
  const width =
    tributaryDistanceValue < mainDistance ? 2 : generatedRiverWidth(seed, y);
  return {
    water: distance <= width,
    bank: distance <= width + 2,
    floodplain: distance <= width + 12,
  };
}

export function regionalTrailY(seed, x, mode = "legacy_origin") {
  if (mode !== "regional_v3") return 11;
  const span = Math.floor(VILLAGE_REGION.height * 0.6);
  const base = Math.floor(-span / 2 + hashUnit(`${seed}:trail`, 1) * span);
  return Math.round(
    base +
      Math.sin(x / 83 + hashUnit(seed, 12) * 6) * 18 +
      (terrainNoise(`${seed}:trail`, x, 0) - 0.5) * 12,
  );
}

export function regionalTrailAt(seed, x, y, mode = "legacy_origin") {
  return Math.abs(y - regionalTrailY(seed, x, mode)) <= 1;
}

export function regionalGround(seed, x, y, mode = "legacy_origin") {
  if (mode !== "regional_v3") return "grass";
  const water = regionalHydrology(seed, x, y, mode);
  if (water.water) return "water";
  if (water.bank) return "bank";
  const elevation = terrainNoise(seed, x, y);
  const ruggedness = valueNoise(`${seed}:rock-detail`, x, y, 38);
  const ridge = generatedRidgeDistance(seed, x, y);
  if (ridge < 17 && terrainNoise(`${seed}:ridge`, x, y) > 0.38) return "rock";
  if (elevation > 0.67 && ruggedness > 0.58) return "rock";
  if (water.floodplain || elevation < 0.34) return "meadow";
  return elevation > 0.61 ? "woodland" : "grass";
}

export function regionalGeology(seed, x, y, mode = "legacy_origin") {
  if (regionalGround(seed, x, y, mode) !== "rock") return null;
  const vein = hashUnit(
    `${seed}:geology`,
    Math.floor(x / 7),
    Math.floor(y / 7),
  );
  if (vein > 0.965) return "tin_ore";
  if (vein > 0.92) return "copper_ore";
  if (vein > 0.84) return "iron_ore";
  return "building_stone";
}

export function regionalPlacerMineral(seed, x, y, mode = "legacy_origin") {
  if (!regionalHydrology(seed, x, y, mode).water) return null;
  const placer = hashUnit(`${seed}:river-placer`, x, y);
  if (placer > 0.97) return "tin_ore";
  if (placer > 0.9) return "copper_ore";
  if (placer > 0.78) return "iron_ore";
  return null;
}

export function regionalRiverAt(x, y) {
  return Math.abs(x - regionalRiverCenter(y)) <= 2;
}

export function villageBridgeAt(x, y) {
  return regionalRiverAt(x, y) && (y === 11 || y === 12);
}

export function villageHighlandAt(x, y) {
  if (x < -152 || x > -103 || y < 22 || y > 104) return false;
  const ridge = -128 + Math.round(Math.sin(y / 11) * 15);
  const roughness = Math.abs((x * 31 + y * 17) % 9);
  return Math.abs(x - ridge) <= 8 + roughness;
}

export function villageQuarryFaceAt(x, y) {
  const ridge = -128 + Math.round(Math.sin(y / 11) * 15);
  return villageHighlandAt(x, y) && x >= ridge + 5 && y >= 45 && y <= 66;
}

const REGIONAL_SITES = Object.freeze([
  {
    key: "stonebridge_crossing",
    name: "Stonebridge River crossing",
    kind: "water_and_crossing",
    position: { x: 82, y: 11 },
    resources: ["fresh_water", "fish", "river_reeds"],
  },
  {
    key: "western_limestone_ridge",
    name: "Western limestone ridge",
    kind: "quarry",
    position: { x: -116, y: 55 },
    resources: ["limestone", "building_stone"],
  },
]);

const FOUNDING_SITE_ORIGINS = Object.freeze([
  Object.freeze({ x: -192, y: -160 }),
  Object.freeze({ x: 160, y: -96 }),
  Object.freeze({ x: -96, y: 192 }),
  Object.freeze({ x: 224, y: 160 }),
]);

const SEED_INDEX_CACHE = new Map();

function seedIndex(seed) {
  const text = String(seed),
    cached = SEED_INDEX_CACHE.get(text);
  if (cached !== undefined) return cached;
  const index = [...text].reduce(
    (value, character) => (value * 33 + character.charCodeAt(0)) >>> 0,
    5381,
  );
  SEED_INDEX_CACHE.set(text, index);
  return index;
}

export function selectRegionalFoundingSite(seed, mode) {
  const origin =
    mode === "regional_v3"
      ? generatedFoundingOrigin(seed)
      : mode === "regional_v2"
        ? FOUNDING_SITE_ORIGINS[seedIndex(seed) % FOUNDING_SITE_ORIGINS.length]
        : { x: 0, y: 0 };
  return {
    mode: mode ?? "legacy_origin",
    origin: { ...origin },
    hub: { x: origin.x + 19, y: origin.y + 11 },
  };
}

function generatedFoundingOrigin(seed) {
  const extent = Math.floor(VILLAGE_REGION.width * 0.22);
  const candidates = Array.from(
    { length: Math.floor((extent * 2) / 16) + 1 },
    (_, index) => -extent + index * 16,
  );
  const start = Math.floor(hashUnit(`${seed}:site`, 2) * candidates.length);
  let fallback = null;
  for (let offset = 0; offset < candidates.length; offset += 1) {
    const hubX = candidates[(start + offset) % candidates.length];
    const hubY = regionalTrailY(seed, hubX, "regional_v3");
    const riverDistance = Math.abs(hubX - generatedRiverCenter(seed, hubY));
    const ground = regionalGround(seed, hubX, hubY + 18, "regional_v3");
    if (ground !== "rock" && (!fallback || riverDistance < fallback.distance))
      fallback = { hubX, hubY, distance: riverDistance };
    const rock =
      riverDistance >= 36 && riverDistance <= 56 && ground !== "rock"
        ? nearestRockCandidate(seed, { x: hubX, y: hubY }, 160, 4)
        : null;
    if (rock) return { x: hubX - 19, y: hubY - 11 };
  }
  return { x: fallback.hubX - 19, y: fallback.hubY - 11 };
}

function travelClass(distance, policy) {
  if (distance <= policy.dayTripLimit) return "day_trip";
  if (distance <= policy.expeditionLimit) return "expedition";
  return "remote_outpost";
}

function supportingFieldCamp(destination, camps, requiredFoodUnits) {
  return camps.find(
    (camp) =>
      camp.status === "operational" &&
      (camp.foodUnits ?? 0) >= requiredFoodUnits &&
      Math.abs(camp.position.x - destination.x) +
        Math.abs(camp.position.y - destination.y) <=
        32,
  );
}

export function regionalTravelAssessment(
  destination,
  hub,
  policy = { dayTripLimit: 96, expeditionLimit: 192 },
  camps = [],
) {
  const distance =
      Math.abs(destination.x - hub.x) + Math.abs(destination.y - hub.y),
    tripClass = travelClass(distance, policy),
    requiredFoodUnits = Math.max(1, Math.ceil((distance * 2) / 240)),
    camp = supportingFieldCamp(destination, camps, requiredFoodUnits),
    requiresCamp = tripClass !== "day_trip",
    riskScore = Math.min(
      100,
      Math.ceil(distance / 8) +
        (tripClass === "remote_outpost" ? 35 : 0) -
        (camp ? 18 : 0),
    );
  return {
    distance,
    roundTripTicks: distance * 2,
    tripClass,
    requiresCamp,
    fieldCampId: camp?.id ?? null,
    riskScore,
    riskBand: riskScore <= 20 ? "low" : riskScore <= 45 ? "guarded" : "high",
    requiredFoodUnits,
    approved: !requiresCamp || Boolean(camp),
    dispatchStatus: !requiresCamp || camp ? "reachable" : "needs_field_camp",
  };
}

function sourceTravel(source, hub) {
  return regionalTravelAssessment(source.position, hub);
}

export function regionalSourceCatalog(
  hub = { x: 0, y: 11 },
  seed = "",
  mode = "legacy_origin",
) {
  const legacyHub = hub.x === 0 && hub.y === 11;
  const crossing =
    legacyHub && mode !== "regional_v3"
      ? REGIONAL_SITES[0]
      : {
          ...REGIONAL_SITES[0],
          position:
            mode === "regional_v3"
              ? nearestRiverSource(seed, hub)
              : { x: regionalRiverCenter(hub.y), y: hub.y },
        };
  const ridge =
    mode === "regional_v3" ? unprospectedRidge(seed, hub) : REGIONAL_SITES[1];
  const sources = [crossing, ridge];
  if (mode === "regional_v3") sources.push(woodlandSource(seed, hub));
  return sources.map((source) => ({
    ...structuredClone(source),
    chunkX: Math.floor(source.position.x / VILLAGE_REGION.chunkSize),
    chunkY: Math.floor(source.position.y / VILLAGE_REGION.chunkSize),
    ...sourceTravel(source, hub),
  }));
}

function woodlandSource(seed, hub) {
  return {
    key: "managed_woodland_edge",
    name: "Managed woodland edge",
    kind: "timber_source",
    position: nearestWoodland(seed, hub),
    resources: ["timber", "firewood"],
    knowledge: "surface_visible",
  };
}

function nearestWoodland(seed, hub) {
  for (let radius = 8; radius <= 96; radius += 4)
    for (let offset = -radius; offset <= radius; offset += 4)
      for (const position of [
        { x: hub.x + offset, y: hub.y + radius },
        { x: hub.x + offset, y: hub.y - radius },
        { x: hub.x + radius, y: hub.y + offset },
        { x: hub.x - radius, y: hub.y + offset },
      ])
        if (
          regionalGround(seed, position.x, position.y, "regional_v3") ===
          "woodland"
        )
          return position;
  return { x: hub.x - 64, y: hub.y };
}

function unprospectedRidge(seed, hub) {
  return {
    key: "unprospected_rocky_ridge",
    name: "Unprospected rocky ridge",
    kind: "geology_survey",
    position: nearestRockSource(seed, hub),
    resources: [],
    knowledge: "landform_only",
  };
}

const ROCK_SOURCE_CACHE = new Map();

function exposedRockFace(seed, x, y) {
  return [1, 2, 3, 4].some((distance) =>
    [
      [distance, 0],
      [-distance, 0],
      [0, distance],
      [0, -distance],
    ].some(([dx, dy]) =>
      ["grass", "meadow", "bank"].includes(
        regionalGround(seed, x + dx, y + dy, "regional_v3"),
      ),
    ),
  );
}

function nearestRockSource(seed, hub) {
  const cacheKey = `${seed}:${hub.x},${hub.y}`;
  if (ROCK_SOURCE_CACHE.has(cacheKey))
    return { ...ROCK_SOURCE_CACHE.get(cacheKey) };
  let best = nearestRockCandidate(seed, hub, 96, 4);
  if (!best) best = nearestRockCandidate(seed, hub, 500, 4);
  if (!best) best = nearestRockCandidate(seed, hub, 1200, 4);
  const position = best ? { x: best.x, y: best.y } : { x: hub.x, y: hub.y };
  ROCK_SOURCE_CACHE.set(cacheKey, position);
  return { ...position };
}

function nearestRockCandidate(seed, hub, radius, step) {
  let best = null;
  const minX = Math.max(VILLAGE_REGION.minX, hub.x - radius),
    maxX = Math.min(VILLAGE_REGION.maxX, hub.x + radius),
    minY = Math.max(VILLAGE_REGION.minY, hub.y - radius),
    maxY = Math.min(VILLAGE_REGION.maxY, hub.y + radius);
  for (let y = minY; y <= maxY; y += step)
    for (let x = minX; x <= maxX; x += step) {
      if (
        regionalGeology(seed, x, y, "regional_v3") !== "building_stone" ||
        !exposedRockFace(seed, x, y)
      )
        continue;
      const distance = Math.abs(x - hub.x) + Math.abs(y - hub.y);
      if (!best || distance < best.distance) best = { x, y, distance };
    }
  return best;
}

function nearestRiverSource(seed, hub) {
  let best = null;
  const minY = Math.max(VILLAGE_REGION.minY, hub.y - 128),
    maxY = Math.min(VILLAGE_REGION.maxY, hub.y + 128);
  for (let y = minY; y <= maxY; y += 4) {
    const candidate = { x: generatedRiverCenter(seed, y), y };
    const distance = Math.abs(candidate.x - hub.x) + Math.abs(y - hub.y);
    if (!best || distance < best.distance) best = { ...candidate, distance };
  }
  return { x: best.x, y: best.y };
}

export function clampVillageViewportCenter(center, viewport) {
  const halfWidth = Math.floor(viewport.width / 2);
  const halfHeight = Math.floor(viewport.height / 2);
  return {
    x: Math.max(
      VILLAGE_REGION.minX + halfWidth,
      Math.min(VILLAGE_REGION.maxX - halfWidth + 1, center.x),
    ),
    y: Math.max(
      VILLAGE_REGION.minY + halfHeight,
      Math.min(VILLAGE_REGION.maxY - halfHeight + 1, center.y),
    ),
  };
}
