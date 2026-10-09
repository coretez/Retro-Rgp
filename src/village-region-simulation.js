import { namedUuid } from "./identity.js";
import { VILLAGE_REGION } from "./village-region.js";

export const REGIONAL_TIER_CADENCE = Object.freeze({
  active: 1,
  warm: 10,
  cold: 100,
});
const OPEN_JOB_STATES = new Set(["available", "reserved", "active", "blocked"]);

function regionalOrigin(state) {
  return (
    state.village.development?.masterPlan?.regionalContext?.site?.origin ?? {
      x: 0,
      y: 0,
    }
  );
}

export function regionalChunkCoordinates(position) {
  return {
    chunkX: Math.floor(position.x / VILLAGE_REGION.chunkSize),
    chunkY: Math.floor(position.y / VILLAGE_REGION.chunkSize),
  };
}

function globalPosition(state, position) {
  const origin = regionalOrigin(state);
  return { x: position.x + origin.x, y: position.y + origin.y };
}

function chunkKey(chunk) {
  return `${chunk.chunkX},${chunk.chunkY}`;
}

function chunkDistance(left, right) {
  return Math.max(
    Math.abs(left.chunkX - right.chunkX),
    Math.abs(left.chunkY - right.chunkY),
  );
}

function actorAnchors(state) {
  return state.village.npcStates.map((entity) =>
    regionalChunkCoordinates(globalPosition(state, entity.position)),
  );
}

function openJobs(state) {
  return state.village.jobs.filter((job) => OPEN_JOB_STATES.has(job.status));
}

function jobAnchors(state, assigned) {
  return openJobs(state)
    .filter((job) => Boolean(job.assignedActorId) === assigned)
    .map((job) => job.targetPosition)
    .filter(Boolean)
    .map((position) =>
      regionalChunkCoordinates(globalPosition(state, position)),
    );
}

function sourceAnchors(state) {
  const sources =
    state.village.development.masterPlan.regionalContext.surveyedSources ?? [];
  return sources.map((source) => regionalChunkCoordinates(source.position));
}

function entityAnchors(state) {
  return [...state.village.npcStates, ...(state.village.animals ?? [])].map(
    (entity) =>
      regionalChunkCoordinates(globalPosition(state, entity.position)),
  );
}

function stockpileAnchors(state) {
  return state.village.stockpiles.map((stockpile) =>
    regionalChunkCoordinates(globalPosition(state, stockpile.position)),
  );
}

function candidateChunks(simulation, active, warm, occupied) {
  const chunks = new Map(
    simulation.chunks.map((chunk) => [chunkKey(chunk), chunk]),
  );
  for (const anchor of active)
    for (let dy = -5; dy <= 5; dy += 1)
      for (let dx = -5; dx <= 5; dx += 1) {
        const chunk = {
          chunkX: anchor.chunkX + dx,
          chunkY: anchor.chunkY + dy,
        };
        chunks.set(chunkKey(chunk), chunks.get(chunkKey(chunk)) ?? chunk);
      }
  for (const chunk of warm)
    chunks.set(chunkKey(chunk), chunks.get(chunkKey(chunk)) ?? chunk);
  for (const chunk of occupied)
    chunks.set(chunkKey(chunk), chunks.get(chunkKey(chunk)) ?? chunk);
  return [...chunks.values()];
}

function simulationTier(chunk, active, warm) {
  if (active.some((anchor) => chunkDistance(chunk, anchor) <= 1))
    return "active";
  if (
    active.some((anchor) => chunkDistance(chunk, anchor) <= 3) ||
    warm.some((anchor) => chunkDistance(chunk, anchor) <= 1)
  )
    return "warm";
  return "cold";
}

function inChunk(state, position, chunk) {
  return (
    chunkKey(regionalChunkCoordinates(globalPosition(state, position))) ===
    chunkKey(chunk)
  );
}

function spatialId(state, category, record) {
  const key = record.id ?? record.key ?? record.name;
  return record.id ?? namedUuid(state.id, `regional-${category}:${key}`);
}

function spatialState(record) {
  return Object.fromEntries(
    [
      "kind",
      "itemKind",
      "status",
      "stage",
      "quantity",
      "remainingUnits",
      "forageUnits",
      "foodUnits",
      "requiredFoodUnits",
    ]
      .filter((key) => record[key] != null)
      .map((key) => [key, record[key]]),
  );
}

function spatialRecord(state, category, record, global = false) {
  const area = record.area ?? record,
    position = record.position ?? { x: area.x, y: area.y };
  if (position.x == null || position.y == null) return null;
  return {
    id: spatialId(state, category, record),
    category,
    position: global ? position : globalPosition(state, position),
    width: area.width ?? area.w ?? 1,
    height: area.height ?? area.h ?? 1,
    state: spatialState(record),
  };
}

function localSpatialRecords(state) {
  const groups = [
    ["terrain", state.village.modifications],
    ["structure", state.village.constructionPrimitives],
    ["structure", state.village.fixtures],
    ["structure", state.village.buildings],
    ["resource", state.village.stockpiles],
    ["resource", state.village.cropPlots ?? []],
    ["resource", state.village.pastures ?? []],
    ["resource", state.village.foragePatches ?? []],
    ["ownership", state.village.development.masterPlan.districts],
    ["ownership", state.village.development.masterPlan.fieldBoundaries],
  ];
  return groups.flatMap(([category, records]) =>
    records
      .map((record) => spatialRecord(state, category, record))
      .filter(Boolean),
  );
}

function globalSpatialRecords(state) {
  const context = state.village.development.masterPlan.regionalContext,
    deposits = context.geologyKnowledge.revealedDeposits ?? [],
    sources = context.surveyedSources ?? [],
    camps = context.fieldCamps ?? [];
  return [
    ...deposits.map((record) => spatialRecord(state, "resource", record, true)),
    ...sources.map((record) => spatialRecord(state, "resource", record, true)),
    ...camps.map((record) => spatialRecord(state, "structure", record, true)),
  ].filter(Boolean);
}

function regionalSpatialRecords(state) {
  return [...localSpatialRecords(state), ...globalSpatialRecords(state)];
}

function recordIntersectsChunk(record, chunk) {
  const size = VILLAGE_REGION.chunkSize,
    left = chunk.chunkX * size,
    top = chunk.chunkY * size,
    right = left + size,
    bottom = top + size;
  return (
    record.position.x < right &&
    record.position.x + record.width > left &&
    record.position.y < bottom &&
    record.position.y + record.height > top
  );
}

function chunkDelta(state, chunk, spatialRecords) {
  const records = spatialRecords
      .filter((record) => recordIntersectsChunk(record, chunk))
      .sort((left, right) => left.id.localeCompare(right.id)),
    byCategory = (category) =>
      records
        .filter((record) => record.category === category)
        .map((record) => record.id),
    stateEntries = records
      .filter((record) => Object.keys(record.state).length)
      .map((record) => ({ id: record.id, ...record.state })),
    contents = {
      terrainChangeIds: byCategory("terrain"),
      structureIds: byCategory("structure"),
      resourceIds: byCategory("resource"),
      ownershipIds: byCategory("ownership"),
      stateEntries,
    };
  return {
    ...contents,
    revision: namedUuid(
      state.id,
      `chunk-delta:${chunkKey(chunk)}:${JSON.stringify(contents)}`,
    ),
  };
}

function checkpointContents(state, chunk, spatialRecords) {
  const entityIds = [
      ...state.village.npcStates,
      ...(state.village.animals ?? []),
    ]
      .filter((entity) => inChunk(state, entity.position, chunk))
      .map((entity) => entity.id)
      .sort(),
    stockpiles = state.village.stockpiles.filter((stockpile) =>
      inChunk(state, stockpile.position, chunk),
    ),
    jobs = openJobs(state).filter(
      (job) => job.targetPosition && inChunk(state, job.targetPosition, chunk),
    );
  return {
    entityIds,
    stockUnits: stockpiles.reduce(
      (total, stockpile) => total + stockpile.quantity,
      0,
    ),
    stockpileIds: stockpiles.map((stockpile) => stockpile.id).sort(),
    scheduledJobIds: jobs.map((job) => job.id).sort(),
    delta: chunkDelta(state, chunk, spatialRecords),
  };
}

function recordTransition(simulation, chunk, from, to, tick) {
  if (!from || from === to) return;
  simulation.transitions.push({ chunkId: chunk.id, from, to, tick });
  simulation.transitions = simulation.transitions.slice(-128);
}

function refreshChunk(
  state,
  simulation,
  current,
  coordinates,
  tier,
  spatialRecords,
) {
  const tierChanged = current?.tier && current.tier !== tier,
    checkpointDue =
      current?.lastCheckpointTick == null ||
      state.tick >= current.nextCheckpointTick ||
      tierChanged;
  const chunk = {
    ...current,
    id:
      current?.id ??
      namedUuid(
        state.id,
        `village-chunk:${coordinates.chunkX},${coordinates.chunkY}`,
      ),
    ...coordinates,
    tier,
    discoveredAtTick: current?.discoveredAtTick ?? state.tick,
  };
  recordTransition(simulation, chunk, current?.tier, tier, state.tick);
  if (checkpointDue) {
    chunk.lastCheckpointTick = state.tick;
    chunk.nextCheckpointTick = state.tick + REGIONAL_TIER_CADENCE[tier];
    chunk.checkpoint = checkpointContents(state, chunk, spatialRecords);
  }
  return chunk;
}

export function ensureRegionalSimulation(state) {
  state.village.regionalSimulation ??= {
    version: 1,
    lastUpdatedTick: null,
    chunks: [],
    transitions: [],
  };
  return syncRegionalSimulation(state);
}

export function syncRegionalSimulation(state) {
  const simulation = state.village.regionalSimulation,
    active = [...actorAnchors(state), ...jobAnchors(state, true)],
    warm = [...jobAnchors(state, false), ...sourceAnchors(state)],
    occupied = [...entityAnchors(state), ...stockpileAnchors(state), ...warm],
    spatialRecords = regionalSpatialRecords(state),
    current = new Map(
      simulation.chunks.map((chunk) => [chunkKey(chunk), chunk]),
    );
  simulation.chunks = candidateChunks(simulation, active, warm, occupied)
    .map((coordinates) =>
      refreshChunk(
        state,
        simulation,
        current.get(chunkKey(coordinates)),
        coordinates,
        simulationTier(coordinates, active, warm),
        spatialRecords,
      ),
    )
    .sort(
      (left, right) => left.chunkY - right.chunkY || left.chunkX - right.chunkX,
    );
  simulation.lastUpdatedTick = state.tick;
  return simulation;
}

export function regionalChunkState(state, chunkX, chunkY) {
  const simulation = state.village.regionalSimulation;
  return simulation?.chunks.find(
    (chunk) => chunk.chunkX === chunkX && chunk.chunkY === chunkY,
  );
}

export function regionalPositionTier(state, position) {
  const global = globalPosition(state, position),
    coordinates = regionalChunkCoordinates(global);
  return (
    regionalChunkState(state, coordinates.chunkX, coordinates.chunkY)?.tier ??
    "cold"
  );
}

export function regionalEntityUpdateDue(state, entity, baseCadence = 1) {
  const tier = regionalPositionTier(state, entity.position),
    cadence = baseCadence * REGIONAL_TIER_CADENCE[tier];
  return state.tick % cadence === 0;
}
