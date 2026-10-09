import assert from "node:assert/strict";
import test from "node:test";
import {
  newRogueRun,
  parseRogueState,
  rogueUnityView,
  serializeRogueState,
} from "../src/rogue-engine.js";
import {
  regionalChunkCoordinates,
  regionalChunkState,
  regionalEntityUpdateDue,
  syncRegionalSimulation,
} from "../src/village-region-simulation.js";
import { isUuid, namedUuid } from "../src/identity.js";
import { regionalTravelAssessment } from "../src/village-region.js";

const INPUT = Object.freeze({
  heroName: "R8 Regional Proof",
  heroClass: "fighter",
  seed: "r8-regional-proof",
  levels: 3,
  scenario: "founding",
  worldGeneration: "regional_v3",
});

function stateAtVillage() {
  const state = newRogueRun(INPUT);
  state.location = "village";
  return state;
}

function tierChunk(state, tier) {
  return state.village.regionalSimulation.chunks.find(
    (chunk) => chunk.tier === tier,
  );
}

function localChunk(state, position) {
  const origin =
      state.village.development.masterPlan.regionalContext.site.origin,
    global = { x: position.x + origin.x, y: position.y + origin.y };
  return regionalChunkCoordinates(global);
}

function projectedChunk(state, chunk) {
  const center = {
      x: chunk.chunkX * 32 + 16,
      y: chunk.chunkY * 32 + 16,
    },
    view = rogueUnityView(state, [], { villageCenter: center });
  return view.map.chunks.find(
    (candidate) =>
      candidate.chunkX === chunk.chunkX && candidate.chunkY === chunk.chunkY,
  );
}

test("R8.0 remote dispatch requires a supporting camp beyond a day trip", () => {
  const policy = { dayTripLimit: 96, expeditionLimit: 192 },
    destination = { x: 240, y: 0 },
    blocked = regionalTravelAssessment(destination, { x: 0, y: 0 }, policy),
    camp = {
      id: namedUuid(INPUT.runId ?? "13d7a749-93d6-5d3d-a665-3dc0efed15f4", "field-camp:test"),
      status: "operational",
      position: { x: 224, y: 0 },
      foodUnits: 2,
    },
    approved = regionalTravelAssessment(
      destination,
      { x: 0, y: 0 },
      policy,
      [camp],
    ),
    undersupplied = regionalTravelAssessment(
      destination,
      { x: 0, y: 0 },
      policy,
      [{ ...camp, foodUnits: 1 }],
    );
  assert.equal(blocked.tripClass, "remote_outpost");
  assert.equal(blocked.dispatchStatus, "needs_field_camp");
  assert.equal(blocked.approved, false);
  assert.equal(approved.approved, true);
  assert.equal(approved.fieldCampId, camp.id);
  assert.ok(approved.riskScore < blocked.riskScore);
  assert.equal(undersupplied.approved, false);
  assert.equal(undersupplied.dispatchStatus, "needs_field_camp");
});

test("R8.0 persists active, warm, and cold simulation tiers", () => {
  const state = stateAtVillage(),
    simulation = state.village.regionalSimulation;
  assert.ok(tierChunk(state, "active"));
  assert.ok(tierChunk(state, "warm"));
  assert.ok(tierChunk(state, "cold"));
  assert.ok(simulation.chunks.every((chunk) => chunk.checkpoint));
  assert.ok(simulation.chunks.every((chunk) => isUuid(chunk.id)));
  assert.equal(
    new Set(simulation.chunks.map((chunk) => chunk.id)).size,
    simulation.chunks.length,
  );
});

test("R8.0 camera observation cannot activate or mutate a region", () => {
  const state = stateAtVillage(),
    before = structuredClone(state.village.regionalSimulation),
    view = rogueUnityView(state, [], { villageCenter: { x: 1500, y: -1500 } });
  assert.ok(view.map.chunks.every((chunk) => chunk.tier === "cold"));
  assert.deepEqual(state.village.regionalSimulation, before);
});

test("R8.0 assigned remote work activates its destination", () => {
  const state = stateAtVillage(),
    targetPosition = { x: 960, y: 736 },
    coordinates = localChunk(state, targetPosition),
    job = {
      id: "remote-r8-job",
      status: "available",
      targetPosition,
      assignedActorId: null,
    };
  state.village.jobs.push(job);
  syncRegionalSimulation(state);
  assert.equal(
    regionalChunkState(state, coordinates.chunkX, coordinates.chunkY).tier,
    "warm",
  );
  job.assignedActorId = state.village.npcStates[0].id;
  syncRegionalSimulation(state);
  assert.equal(
    regionalChunkState(state, coordinates.chunkX, coordinates.chunkY).tier,
    "active",
  );
});

test("R8.0 checkpoints honor active, warm, and cold cadence", () => {
  const state = stateAtVillage(),
    active = tierChunk(state, "active"),
    warm = tierChunk(state, "warm"),
    cold = tierChunk(state, "cold");
  state.tick = 1;
  syncRegionalSimulation(state);
  assert.equal(
    regionalChunkState(state, active.chunkX, active.chunkY).lastCheckpointTick,
    1,
  );
  assert.equal(
    regionalChunkState(state, warm.chunkX, warm.chunkY).lastCheckpointTick,
    0,
  );
  assert.equal(
    regionalChunkState(state, cold.chunkX, cold.chunkY).lastCheckpointTick,
    0,
  );
  state.tick = 10;
  syncRegionalSimulation(state);
  assert.equal(
    regionalChunkState(state, warm.chunkX, warm.chunkY).lastCheckpointTick,
    10,
  );
  assert.equal(
    regionalChunkState(state, cold.chunkX, cold.chunkY).lastCheckpointTick,
    0,
  );
  state.tick = 100;
  syncRegionalSimulation(state);
  assert.equal(
    regionalChunkState(state, cold.chunkX, cold.chunkY).lastCheckpointTick,
    100,
  );
});

test("R8.0 entity cadence and save restoration preserve regional truth", () => {
  const state = stateAtVillage(),
    animal = state.village.animals.find((candidate) => {
      const chunk = localChunk(state, candidate.position);
      return ["warm", "cold"].includes(
        regionalChunkState(state, chunk.chunkX, chunk.chunkY)?.tier,
      );
    });
  assert.ok(animal);
  state.tick = 12;
  syncRegionalSimulation(state);
  assert.equal(regionalEntityUpdateDue(state, animal, 12), false);
  const before = structuredClone(state.village.regionalSimulation),
    restored = parseRogueState(serializeRogueState(state));
  assert.deepEqual(restored.village.regionalSimulation, before);
});

test("R8.0 chunk deltas retain physical state and change revision", () => {
  const state = stateAtVillage(),
    resident = state.village.npcStates[0],
    coordinates = localChunk(state, resident.position),
    before = regionalChunkState(state, coordinates.chunkX, coordinates.chunkY),
    changeId = namedUuid(state.id, "regional-test:cleared-ground");
  assert.ok(before.checkpoint.delta.resourceIds.length > 0);
  assert.ok(before.checkpoint.delta.ownershipIds.length > 0);
  state.village.modifications.push({
    id: changeId,
    entityType: "terrain-change",
    kind: "cleared_ground",
    ...resident.position,
  });
  state.tick += 1;
  syncRegionalSimulation(state);
  const after = regionalChunkState(
    state,
    coordinates.chunkX,
    coordinates.chunkY,
  );
  assert.notEqual(
    after.checkpoint.delta.revision,
    before.checkpoint.delta.revision,
  );
  assert.ok(after.checkpoint.delta.terrainChangeIds.includes(changeId));
});

test("R8.0 Unity chunk transport uses full, summary, and overview detail", () => {
  const state = stateAtVillage(),
    active = projectedChunk(state, tierChunk(state, "active")),
    warm = projectedChunk(state, tierChunk(state, "warm")),
    cold = projectedChunk(state, tierChunk(state, "cold"));
  assert.equal(active.detailLevel, "full");
  assert.ok(active.delta);
  assert.equal(warm.detailLevel, "summary");
  assert.equal("delta" in warm, false);
  assert.equal(cold.detailLevel, "overview");
  assert.equal("delta" in cold, false);
  assert.ok(active.deltaRevision);
  assert.ok(warm.deltaRevision);
  assert.ok(cold.deltaRevision);
});

test("R8.0 unchanged chunk revisions omit redundant full deltas", () => {
  const state = stateAtVillage(),
    chunk = tierChunk(state, "active"),
    center = {
      x: chunk.chunkX * 32 + 16,
      y: chunk.chunkY * 32 + 16,
    },
    first = rogueUnityView(state, [], { villageCenter: center }),
    full = first.map.chunks.find((candidate) => candidate.id === chunk.id),
    second = rogueUnityView(state, [], {
      villageCenter: center,
      knownChunkRevisions: { [full.id]: full.deltaRevision },
    }),
    unchanged = second.map.chunks.find(
      (candidate) => candidate.id === chunk.id,
    );
  assert.ok(full.delta);
  assert.equal(unchanged.unchanged, true);
  assert.equal("delta" in unchanged, false);
  assert.equal(unchanged.deltaRevision, full.deltaRevision);
});

test("R8.0 native cell chunks cache and stream only newly entered land", () => {
  const state = stateAtVillage(),
    center = { x: 32, y: -32 },
    first = rogueUnityView(state, [], {
      villageCenter: center,
      cellChunkProtocol: true,
    }),
    revisions = Object.fromEntries(
      first.map.chunks.map((chunk) => [chunk.id, chunk.cellRevision]),
    ),
    shifted = rogueUnityView(state, [], {
      villageCenter: { x: center.x + 32, y: center.y },
      cellChunkProtocol: true,
      knownCellChunkRevisions: revisions,
    }),
    unchanged = shifted.map.chunks.filter((chunk) => chunk.cellsUnchanged),
    entered = shifted.map.chunks.filter((chunk) => !chunk.cellsUnchanged);
  assert.equal(first.map.cells.length, 0);
  assert.ok(first.map.chunks.every((chunk) => chunk.cells.length === 1024));
  assert.ok(first.map.chunks.every((chunk) => chunk.cellRevision));
  assert.ok(unchanged.length > entered.length);
  assert.ok(unchanged.every((chunk) => !("cells" in chunk)));
  assert.ok(entered.every((chunk) => chunk.cells.length === 1024));
});

test("R8.0 unchanged native cell chunks collapse the repeated payload", () => {
  const state = stateAtVillage(),
    options = { villageCenter: { x: 32, y: -32 }, cellChunkProtocol: true },
    first = rogueUnityView(state, [], options),
    revisions = Object.fromEntries(
      first.map.chunks.map((chunk) => [chunk.id, chunk.cellRevision]),
    ),
    second = rogueUnityView(state, [], {
      ...options,
      knownCellChunkRevisions: revisions,
    }),
    firstBytes = Buffer.byteLength(JSON.stringify(first)),
    secondBytes = Buffer.byteLength(JSON.stringify(second));
  assert.ok(second.map.chunks.every((chunk) => chunk.cellsUnchanged));
  assert.ok(second.map.chunks.every((chunk) => !("cells" in chunk)));
  assert.ok(secondBytes < firstBytes * 0.15, { firstBytes, secondBytes });
});
