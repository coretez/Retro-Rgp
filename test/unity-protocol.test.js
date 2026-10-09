import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  applyRogueTurn,
  executeVillageInteraction,
  newRogueRun,
  parseRogueState,
  rogueUnityView,
  serializeRogueState,
  villageWorldObjectAt,
} from "../src/rogue-engine.js";
import {
  regionalGeology,
  regionalGround,
  regionalHydrology,
  regionalTrailAt,
} from "../src/village-region.js";
import { cancelJob, releaseJobReservations } from "../src/job-board.js";
import { villageMovementCost } from "../src/village-simulation.js";
import { constructionElements } from "../src/village-architecture.js";

const input = {
  requestId: "unity-protocol",
  seed: "unity-protocol",
  heroName: "Mara",
  form: "hybrid",
  size: "small",
};

function stoneSourceWestOfWindow(state, map) {
  const mode = state.village.development.masterPlan.regionalContext.site.mode;
  for (let x = map.origin.x - 8; x >= map.origin.x - 72; x -= 1)
    for (let y = map.origin.y; y < map.origin.y + map.height; y += 1) {
      if (regionalGround(state.seed, x, y, mode) !== "rock") continue;
      if (regionalGeology(state.seed, x, y, mode) !== "building_stone")
        continue;
      const hasAccess = [
        { x: x + 1, y },
        { x: x - 1, y },
        { x, y: y + 1 },
        { x, y: y - 1 },
      ].some(
        (position) =>
          regionalGround(state.seed, position.x, position.y, mode) !== "rock" &&
          !regionalHydrology(state.seed, position.x, position.y, mode).water,
      );
      if (hasAccess) return { x, y };
    }
  throw new Error("No finite stone face exists west of the founding window");
}

test("R5 Unity interpolation spans the authoritative simulation cadence", () => {
  const source = readFileSync(
    new URL(
      "../UnityClient/Assets/RetroRpg/Scripts/RetroGameController.cs",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(source, /NormalSimulationInterval = 0\.75f/);
  assert.match(source, /FastSimulationInterval = 0\.18f/);
  assert.match(source, /"normal" => NormalSimulationInterval \* 1\.05f/);
  assert.match(source, /"fast" => FastSimulationInterval \* 1\.1f/);
});

test("R8 camera queues vertical and horizontal viewport shifts while simulation work is busy", () => {
  const source = readFileSync(
      new URL(
        "../UnityClient/Assets/RetroRpg/Scripts/RetroGameController.cs",
        import.meta.url,
      ),
      "utf8",
    ),
    shift = source.slice(
      source.indexOf("private void MaybeShiftVillageViewport()"),
      source.indexOf("private void RequestVillageViewport"),
    ),
    request = source.slice(
      source.indexOf("private void RequestVillageViewport"),
      source.indexOf("private IEnumerator BrowseVillage"),
    );
  assert.doesNotMatch(shift, /\|\| busy \|\|/);
  assert.match(shift, /var position = camera\.transform\.position/);
  assert.doesNotMatch(shift, /position = keyboardPanTarget/);
  assert.match(request, /if \(busy \|\| viewportShiftPending\)/);
  assert.match(request, /queuedViewportCenter = new Vector2Int\(centerX, centerY\)/);
  assert.match(source, /Vector3\.SmoothDamp/);
  assert.match(source, /KeyboardPanSmoothTime/);
  assert.match(source, /MaximumVisibleVillageWidth = 140f/);
  assert.match(source, /MaximumVisibleVillageHeight = 84f/);
  assert.match(source, /Mathf\.Max\(mapHeight, mapWidth\)/);
  assert.doesNotMatch(source, /Mathf\.Min\(mapHeight, mapWidth\)/);
  assert.doesNotMatch(source, /Vector3\.MoveTowards/);
  const applyView = source.slice(
      source.indexOf("private void ApplyView"),
      source.indexOf("private float MovementAnimationDuration"),
    ),
    browse = source.slice(
      source.indexOf("private IEnumerator BrowseVillage"),
      source.indexOf("private void HandleZoom"),
    );
  assert.doesNotMatch(applyView, /viewportShiftPending = false/);
  assert.match(
    browse,
    /viewportShiftPending = false;[\s\S]*busy = false;[\s\S]*FlushQueuedUiAction/,
  );
});

test("R8 retained chunks cannot pack missing terrain into false blank rows", () => {
  const api = readFileSync(
      new URL(
        "../UnityClient/Assets/RetroRpg/Scripts/RetroApiClient.cs",
        import.meta.url,
      ),
      "utf8",
    ),
    renderer = readFileSync(
      new URL(
        "../UnityClient/Assets/RetroRpg/Scripts/AsciiMapRenderer.cs",
        import.meta.url,
      ),
      "utf8",
    );
  assert.match(api, /CellChunkCacheLimit = 192/);
  assert.match(api, /SnapshotUnchangedCellChunks\(view\)/);
  assert.match(renderer, /cell\.y - view\.map\.origin\.y/);
  assert.match(renderer, /cell\.x - view\.map\.origin\.x/);
  assert.match(renderer, /backgroundMesh\.indexFormat = IndexFormat\.UInt32/);
}
);

test("R6 sleeping villagers retain beds and receive a blanket layer", () => {
  const source = readFileSync(
    new URL(
      "../UnityClient/Assets/RetroRpg/Scripts/VillageSpriteRenderer.cs",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(source, /Village Sleep Covers/);
  assert.match(source, /BuildSleepCovers\(actors, view\)/);
  assert.match(source, /entityPose == "sleeping"/);
  assert.match(source, /SleepCoverColor/);
  assert.match(source, /CellHeight \* 0\.38f/);
  assert.match(source, /CellHeight \* 1\.05f/);
  assert.match(source, /AddSleepingHead\(actor, view/);
  assert.match(source, /SleepingSkinColor\(actor\.cell\.entitySkinTone\)/);
  assert.match(source, /SleepingHairColor\(actor\.cell\.entityHairColor\)/);
  assert.doesNotMatch(source, /CellHeight \* 1\.34f/);
});

test("Unity protocol projects one compact retained-mode village snapshot", () => {
  const state = newRogueRun(input);
  state.location = "village";
  const view = rogueUnityView(state),
    json = JSON.stringify(view);
  assert.equal(view.protocolVersion, 1);
  assert.deepEqual(
    { width: view.map.width, height: view.map.height },
    { width: 280, height: 168 },
  );
  assert.equal(view.map.cells.length, view.map.width * view.map.height);
  assert.ok(Buffer.byteLength(json) < 5_500_000, Buffer.byteLength(json));
  assert.ok(
    view.map.cells.every(
      (cell) => !("object" in cell) && !("affordances" in cell),
    ),
  );
  assert.equal(view.adventurersPresent, false);
  assert.equal(view.partyMembers.length, 0);
  assert.ok(view.map.cells.every((cell) => cell.entityKind !== "party"));
  const interactive = view.map.cells.filter((cell) => cell.actions?.length);
  assert.equal(interactive.length, 0);
  assert.ok(
    view.map.cells.some(
      (cell) =>
        cell.entityName === "Friedel Koch" &&
        cell.entityReason === "personal_routine",
    ),
  );
  assert.ok(
    view.map.cells.some(
      (cell) =>
        cell.entityName === "Hanne Voss" &&
        cell.entityWork === "craft weapon 60" &&
        cell.entityPermissions.includes("craft weapon") &&
        cell.entityCapabilities.includes("forge"),
    ),
  );
  assert.ok(
    view.map.cells
      .filter((cell) => cell.entityKind && cell.entityKind !== "party")
      .every((cell) => cell.entityWorking === false),
  );
  assert.ok(
    view.map.cells
      .filter(
        (cell) =>
          ["outdoor_grass", "road_stone", "road_dirt"].includes(cell.tile) &&
          !cell.entityKind,
      )
      .every((cell) => cell.glyph === " "),
  );
});

test("R1 completed house walls never revert to a planning projection", () => {
  const state = newRogueRun({ ...input, scenario: "founding" });
  state.village.facilities.push("lumber_yard");
  applyRogueTurn(state, { kind: "wait" });
  const site = state.village.development.constructionSites.find(
      (candidate) => candidate.housingSurveyStatus === "scouted",
    ),
    wall = constructionElements(site).find(
      (element) => element.kind === "wall",
    ),
    projectId = "completed-house-project",
    primitiveId = "completed-house-wall";
  state.village.jobs.push({
    id: projectId,
    status: "completed",
    plan: {
      construction: site,
      constructionWork: { elements: [{ ...wall, status: "complete" }] },
    },
  });
  state.village.constructionPrimitives.push({
    id: primitiveId,
    projectId,
    projectKey: site.key,
    kind: "wall",
    material: "timber",
    state: "complete",
    lifecycleState: "complete",
    condition: 100,
    position: { ...wall.position },
  });
  state.village.heroPosition = {
    x: wall.position.x + 2,
    y: wall.position.y + 2,
  };
  const cell = rogueUnityView(state).map.cells.find(
    (candidate) => candidate.objectId === primitiveId,
  );
  assert.ok(cell);
  assert.equal(cell.tile, "village_building");
  assert.equal(cell.constructionStage, undefined);
});

test("Unity protocol preserves stable coordinates and lightweight identity", () => {
  const state = newRogueRun(input);
  state.location = "village";
  const first = rogueUnityView(state),
    second = rogueUnityView(state);
  assert.deepEqual(second, first);
  assert.equal(first.map.width, 280);
  assert.equal(first.map.height, 168);
  assert.equal(first.daylightPhase, "dawn");
  assert.ok(first.daylightLevel > 0.25 && first.daylightLevel < 1);
  assert.ok(
    first.map.cells.every(
      (cell) =>
        Number.isInteger(cell.x) &&
        Number.isInteger(cell.y) &&
        typeof cell.tile === "string" &&
        typeof cell.glyph === "string",
    ),
  );
});

test("Unity village observation window can browse land without moving the party", () => {
  const state = newRogueRun(input);
  state.location = "village";
  const heroBefore = { ...state.village.heroPosition },
    view = rogueUnityView(state, [], { villageCenter: { x: 120, y: -80 } });
  assert.deepEqual(view.map.origin, { x: 50, y: -122 });
  assert.deepEqual(state.village.heroPosition, heroBefore);
  assert.equal(view.map.cells.length, 11_760);
  assert.ok(view.map.cells.some((cell) => cell.tile === "outdoor_tree"));
});

test("R8 Center Town targets residents rather than the absent adventurer", () => {
  const state = newRogueRun(input);
  state.location = "village";
  state.village.adventurersPresent = false;
  state.village.heroPosition = { x: 900, y: -900 };
  const view = rogueUnityView(state),
    residents = state.village.npcStates,
    average = {
      x: Math.round(
        residents.reduce((sum, resident) => sum + resident.position.x, 0) /
          residents.length,
      ),
      y: Math.round(
        residents.reduce((sum, resident) => sum + resident.position.y, 0) /
          residents.length,
      ),
    };
  assert.deepEqual(view.observationCenter, average);
  assert.notDeepEqual(view.observationCenter, view.hero);
});

test("R8 town inspection remains available without adventurers", () => {
  const source = readFileSync(
      new URL(
        "../UnityClient/Assets/RetroRpg/Scripts/RetroGameController.cs",
        import.meta.url,
      ),
      "utf8",
    ),
    handler = source.slice(
      source.indexOf("private void HandleClick()"),
      source.indexOf("private static bool ClickSelectsOnly"),
    );
  assert.ok(handler.indexOf("selected = cell") >= 0);
  assert.ok(
    handler.indexOf("selected = cell") <
      handler.indexOf("!view.adventurersPresent"),
  );
});

test("Unity regional browsing keeps the retained window inside world bounds", () => {
  const state = newRogueRun(input);
  state.location = "village";
  const northwest = rogueUnityView(state, [], {
      villageCenter: { x: -50_000, y: -50_000 },
    }),
    southeast = rogueUnityView(state, [], {
      villageCenter: { x: 50_000, y: 50_000 },
    });
  assert.deepEqual(northwest.map.origin, { x: -2048, y: -2048 });
  assert.deepEqual(southeast.map.origin, { x: 1768, y: 1880 });
});

test("R8 regional-v2 seeds select and persist genuinely different founding sites", () => {
  const west = newRogueRun({
      ...input,
      seed: "stonebridge-regional-clean-2026-10-04-d",
      scenario: "founding",
      worldGeneration: "regional_v2",
    }),
    east = newRogueRun({
      ...input,
      seed: "stonebridge-regional-clean-2026-10-04-e",
      scenario: "founding",
      worldGeneration: "regional_v2",
    }),
    westView = rogueUnityView(west),
    westSite = west.village.development.masterPlan.regionalContext.site,
    eastSite = east.village.development.masterPlan.regionalContext.site;
  assert.deepEqual(westSite.origin, { x: -192, y: -160 });
  assert.deepEqual(eastSite.origin, { x: 160, y: -96 });
  assert.notDeepEqual(westSite.origin, eastSite.origin);
  assert.deepEqual(westView.map.origin, { x: -342, y: -226 });
  assert.equal(westView.hero.x, -202);
  assert.equal(westView.hero.y, -142);
  assert.ok(westView.map.cells.some((cell) => cell.y === westSite.hub.y));
});

test("R8 regional-v2 survey and bridge use the selected site's global road", () => {
  const state = newRogueRun({
      ...input,
      seed: "stonebridge-regional-clean-2026-10-04-d",
      scenario: "founding",
      worldGeneration: "regional_v2",
    }),
    source =
      state.village.development.masterPlan.regionalContext.surveyedSources[0],
    view = rogueUnityView(state, [], { villageCenter: source.position });
  assert.equal(source.position.y, -149);
  assert.ok(source.distance > 0);
  assert.ok(view.map.cells.some((cell) => cell.tile === "road_bridge_wood"));
  assert.ok(
    view.map.cells.some(
      (cell) => cell.tile === "outdoor_water" && cell.variant === "river",
    ),
  );
});

test("R8 regional-v3 generates a watershed instead of the pond demo", () => {
  const state = newRogueRun({
      ...input,
      seed: "stonebridge-generated-watershed",
      scenario: "founding",
      worldGeneration: "regional_v3",
    }),
    view = rogueUnityView(state),
    water = view.map.cells.filter((cell) => cell.tile === "outdoor_water"),
    trail = view.map.cells.filter((cell) => cell.tile.includes("road"));
  assert.equal(view.map.region.generationMode, "regional_v3");
  assert.equal(view.map.region.waterways.length, 3);
  assert.equal(view.map.region.trail.length, 33);
  assert.ok(water.length > 300);
  assert.equal(water.filter((cell) => cell.variant === "pond").length, 0);
  assert.ok(new Set(trail.map((cell) => cell.y)).size > 3);
});

test("R8 regional-v3 founds beside reachable water without a crossroads", () => {
  const state = newRogueRun({
      ...input,
      seed: "stonebridge-generated-founding-site",
      scenario: "founding",
      worldGeneration: "regional_v3",
    }),
    source =
      state.village.development.masterPlan.regionalContext.surveyedSources[0],
    view = rogueUnityView(state),
    roadsByColumn = new Map();
  for (const cell of view.map.cells.filter((entry) =>
    entry.tile.includes("road"),
  ))
    roadsByColumn.set(cell.x, (roadsByColumn.get(cell.x) ?? 0) + 1);
  assert.ok(source.distance >= 36 && source.distance <= 56);
  assert.ok(view.map.cells.some((cell) => cell.tile === "outdoor_water"));
  assert.equal(
    view.map.cells.filter((cell) => cell.variant === "pond").length,
    0,
  );
  assert.ok(Math.max(...roadsByColumn.values()) <= 3);
});

test("R8 regional-v3 surveys founding fields clear of terrain hazards", () => {
  const seed = "the-river-below",
    state = newRogueRun({
      ...input,
      seed,
      scenario: "founding",
      worldGeneration: "regional_v3",
    }),
    plan = state.village.development.masterPlan,
    origin = plan.regionalContext.site.origin;
  for (const boundary of plan.fieldBoundaries)
    for (let y = boundary.y - 2; y < boundary.y + boundary.h + 2; y += 1)
      for (let x = boundary.x - 2; x < boundary.x + boundary.w + 2; x += 1) {
        const globalX = origin.x + x,
          globalY = origin.y + y;
        assert.equal(
          regionalHydrology(seed, globalX, globalY, "regional_v3").floodplain,
          false,
        );
        assert.notEqual(
          regionalGround(seed, globalX, globalY, "regional_v3"),
          "rock",
        );
        assert.equal(
          regionalTrailAt(seed, globalX, globalY, "regional_v3"),
          false,
        );
      }
});

test("R8 regional-v3 hides geology until a persisted prospecting action", () => {
  const state = newRogueRun({
      ...input,
      seed: "hidden-geology",
      scenario: "founding",
      worldGeneration: "regional_v3",
    }),
    context = state.village.development.masterPlan.regionalContext,
    ridge = context.surveyedSources.find(
      (source) => source.kind === "geology_survey",
    );
  assert.equal(ridge.name, "Unprospected rocky ridge");
  assert.deepEqual(ridge.resources, []);
  let object = villageWorldObjectAt(
    state,
    ridge.position.x - context.site.origin.x,
    ridge.position.y - context.site.origin.y,
    false,
  );
  assert.ok(object);
  assert.equal(object.geologyKnown, false);
  assert.equal("depositKind" in object, false);
  state.village.heroPosition = {
    x: object.position.x - 1,
    y: object.position.y,
  };
  executeVillageInteraction(state, {
    actorId: state.hero.id,
    objectId: object.id,
    ...object.position,
    action: "prospect",
  });
  object = villageWorldObjectAt(
    state,
    object.position.x,
    object.position.y,
    false,
  );
  assert.equal(object.geologyKnown, true);
  assert.ok(object.depositKind);
  assert.ok(object.affordanceKeys.includes("quarry"));
});

test("R6 mountain projection distinguishes generic cliffs from solid interiors", () => {
  const state = newRogueRun({
    ...input,
    seed: "the-river-below",
    scenario: "founding",
    worldGeneration: "regional_v3",
  });
  state.location = "village";
  const ridge =
      state.village.development.masterPlan.regionalContext.surveyedSources.find(
        (source) => source.kind === "geology_survey",
      ),
    rocks = rogueUnityView(state, [], {
      villageCenter: ridge.position,
    }).map.cells.filter((cell) => cell.tile === "outdoor_rock");
  assert.ok(rocks.some((cell) => cell.terrainEdgeMask > 0));
  assert.ok(rocks.some((cell) => cell.terrainEdgeMask === 0));
  assert.ok(
    rocks.every(
      (cell) => !cell.objectDescription?.match(/iron|copper|tin|limestone/i),
    ),
  );
  assert.ok(
    rocks
      .filter((cell) => cell.terrainEdgeMask === 0)
      .every((cell) => cell.objectKind === "mountain_mass"),
  );
});

test("R8 excavation opens a roofed tunnel and exposes the next rock face", () => {
  const state = newRogueRun({
    ...input,
    seed: "the-river-below",
    scenario: "founding",
    worldGeneration: "regional_v3",
  });
  state.location = "village";
  const regional = state.village.development.masterPlan.regionalContext,
    ridge = regional.surveyedSources.find(
      (source) => source.kind === "geology_survey",
    ),
    before = rogueUnityView(state, [], { villageCenter: ridge.position }),
    rocks = before.map.cells.filter((cell) => cell.tile === "outdoor_rock"),
    byPosition = new Map(rocks.map((cell) => [`${cell.x},${cell.y}`, cell])),
    directions = [[0, -1], [1, 0], [0, 1], [-1, 0]],
    edge = rocks.find(
      (cell) =>
        cell.terrainEdgeMask > 0 &&
        directions.some(([dx, dy]) =>
          byPosition.get(`${cell.x + dx},${cell.y + dy}`)?.terrainEdgeMask === 0,
        ),
    ),
    interior = directions
      .map(([dx, dy]) => byPosition.get(`${edge.x + dx},${edge.y + dy}`))
      .find((cell) => cell?.terrainEdgeMask === 0),
    local = {
      x: edge.x - regional.site.origin.x,
      y: edge.y - regional.site.origin.y,
    };
  state.village.modifications.push({
    id: "excavation-proof",
    kind: "quarried_rock",
    entityType: "terrain-change",
    ...local,
    originalTile: "outdoor_rock",
  });
  const after = rogueUnityView(state, [], { villageCenter: ridge.position }),
    mined = after.map.cells.find((cell) => cell.x === edge.x && cell.y === edge.y),
    nextFace = after.map.cells.find(
      (cell) => cell.x === interior.x && cell.y === interior.y,
    ),
    chamber = villageWorldObjectAt(state, local.x, local.y, false);
  assert.equal(mined.tile, "village_mine_floor");
  assert.equal(mined.mountainRoof, true);
  assert.equal(chamber.objectKind, "mine_chamber");
  assert.equal(villageMovementCost(mined.tile), 3);
  assert.ok(nextFace.terrainEdgeMask > 0);
  assert.equal(nextFace.objectKind, "stone_deposit");
  assert.doesNotMatch(nextFace.objectDescription ?? "", /iron|copper|tin/i);
});

test("R8 villagers physically build and supply a required remote field camp", () => {
  const state = newRogueRun({
      ...input,
      seed: "the-river-below",
      runId: "6af12758-13bc-5c9f-b1ab-bfd02a6001ed",
      scenario: "founding",
      worldGeneration: "regional_v3",
    }),
    axe = state.hero.inventory.find((item) => item.kind === "hand_axe"),
    lumber = state.village.stockpiles.find(
      (item) => item.key === "lumber_yard_lumber",
    ),
    meals = state.village.stockpiles.find((item) => item.key === "inn_meals"),
    context = state.village.development.masterPlan.regionalContext,
    events = [],
    positions = new Set();
  state.location = "village";
  state.village.facilities.push(
    "survival_camp",
    "lumber_yard",
    "farmstead",
    "communal_kitchen",
    "housing",
  );
  context.dispatchPolicy.dayTripLimit = 16;
  lumber.quantity = 300;
  meals.quantity = 50;
  const mealsBefore = meals.quantity,
    foundingWindow = rogueUnityView(state).map;
  context.surveyedSources.find(
    (source) => source.kind === "geology_survey",
  ).position = stoneSourceWestOfWindow(state, foundingWindow);
  let camp,
    campJob,
    prospectBeforeCamp = false;
  for (let turn = 0; turn < 12000; turn += 1) {
    const result = applyRogueTurn(state, { kind: "equip", itemId: axe.id });
    events.push(...result.events);
    camp ??= context.fieldCamps[0];
    campJob ??= state.village.jobs.find(
      (job) => job.jobType === "build_field_camp",
    );
    const worker = state.village.npcStates.find(
      (actor) => actor.id === campJob?.assignedActorId,
    );
    if (worker) positions.add(`${worker.position.x},${worker.position.y}`);
    if (state.village.jobs.some((job) => job.jobType === "prospect_rock"))
      prospectBeforeCamp ||= camp?.status !== "operational";
    if (camp?.status === "operational") break;
  }
  assert.equal(
    camp?.status,
    "operational",
    JSON.stringify({
      camp,
      campJob: campJob && {
        status: campJob.status,
        step: campJob.plan.step,
        waitReason: campJob.waitReason,
        progress: campJob.progress,
        assignedActorId: campJob.assignedActorId,
        delivered: campJob.production.inputs[0].deliveredQuantity,
        actualSteps: campJob.plan.remoteTravel.actualSteps,
        elements: campJob.plan.constructionWork.elements.map((element) => ({
          key: element.key,
          status: element.status,
          delivered: element.materialDelivered,
        })),
      },
      workers: state.village.npcStates.map((worker) => ({
        personKey: worker.personKey,
        workState: worker.workState,
        currentAction: worker.currentAction,
        permitsCamp:
          worker.workPermissions.allowedJobTypes.includes("build_field_camp"),
        canBuild: worker.capabilityTags.includes("build"),
      })),
      childJobs: state.village.jobs
        .filter((job) => job.plan?.parentJobId === campJob?.id)
        .map((job) => ({
          jobType: job.jobType,
          status: job.status,
          step: job.plan.step,
          blockingReason: job.blockingReason,
          targetPosition: job.targetPosition,
          accessPosition: job.plan.accessPosition,
        })),
    }),
  );
  const provisionedFoodUnits = camp.foodUnits;
  let prospectJob;
  for (let turn = 0; turn < 20 && !prospectJob; turn += 1) {
    const result = applyRogueTurn(state, { kind: "equip", itemId: axe.id });
    events.push(...result.events);
    prospectJob = state.village.jobs.find(
      (job) => job.jobType === "prospect_rock",
    );
  }
  const building = state.village.buildings.find(
    (item) => item.key === camp.constructionKey,
  );
  assert.ok(
    building,
    JSON.stringify({
      camp,
      buildingKeys: state.village.buildings.map((item) => item.key),
      construction: campJob.plan.construction,
      architectureDirty: state.village.architectureDirty,
    }),
  );
  const fixtures = state.village.fixtures.filter(
      (fixture) => fixture.buildingId === building.id,
    ),
    supplyJob = state.village.jobs.find(
      (job) => job.jobType === "supply_field_camp",
    );
  assert.equal(prospectBeforeCamp, false);
  assert.equal(building.status, "complete");
  assert.equal(building.roofed, true);
  assert.equal(building.secondaryDoors.length, 1);
  assert.equal(
    camp.position.x < foundingWindow.origin.x ||
      camp.position.x >= foundingWindow.origin.x + foundingWindow.width ||
      camp.position.y < foundingWindow.origin.y ||
      camp.position.y >= foundingWindow.origin.y + foundingWindow.height,
    true,
    JSON.stringify({
      camp: camp.position,
      foundingWindow: {
        origin: foundingWindow.origin,
        width: foundingWindow.width,
        height: foundingWindow.height,
      },
    }),
  );
  assert.deepEqual(
    new Set(fixtures.map((fixture) => fixture.role)),
    new Set(["bed", "storage", "kitchen"]),
  );
  assert.ok(positions.size > 20);
  assert.ok(campJob.production.inputs[0].deliveredQuantity > 0);
  assert.equal(provisionedFoodUnits, camp.requiredFoodUnits);
  assert.equal(camp.foodUnits, 0);
  assert.equal(prospectJob.plan.expeditionFoodUnits, camp.requiredFoodUnits);
  assert.ok(meals.quantity <= mealsBefore - camp.requiredFoodUnits);
  assert.equal(supplyJob.production.inputs[0].quantity, camp.requiredFoodUnits);
  assert.ok(
    state.village.foodLedger.transactions.some(
      (entry) =>
        entry.jobId === supplyJob.id &&
        entry.type === "food_collected_for_transformation" &&
        entry.quantity === camp.requiredFoodUnits,
    ),
  );
  assert.equal(
    campJob.plan.remoteTravel.dispatchStatus,
    "pioneer_camp_construction",
  );
  assert.ok(campJob.plan.remoteTravel.actualSteps > 20);
  assert.ok(["return_input", "completed"].includes(campJob.plan.step));
  assert.ok(
    events.some((event) => event.type === "regional_field_camp_completed"),
  );
  assert.ok(events.some((event) => event.type === "regional_field_camp_built"));
  assert.ok(events.some((event) => event.type === "field_camp_food_reserved"));
  Object.assign(state.village.clock, {
    hour: 12,
    minute: 0,
    second: 0,
    block: "work",
  });
  const carter = state.village.npcStates.find(
    (actor) => actor.personKey === "carter",
  );
  for (const job of state.village.jobs.filter(
    (candidate) =>
      candidate.plan?.lifeJob &&
      candidate.plan.ownerActorId === carter.id &&
      !["completed", "cancelled"].includes(candidate.status),
  )) {
    cancelJob(state, job, "expedition_test_reset");
    releaseJobReservations(state, job.id, "expedition_test_reset");
  }
  carter.workState = "available";
  for (const need of Object.keys(carter.life.needs))
    carter.life.needs[need] = 100;
  let expeditionWorker;
  let sleepJob;
  for (let turn = 0; turn < 600; turn += 1) {
    const result = applyRogueTurn(state, { kind: "equip", itemId: axe.id });
    events.push(...result.events);
    expeditionWorker = state.village.npcStates.find(
      (actor) => actor.id === prospectJob.assignedActorId,
    );
    sleepJob = state.village.jobs.find(
      (job) =>
        job.jobType === "sleep" &&
        job.plan.shelterFixtureId === camp.bedFixtureIds[0] &&
        !["completed", "cancelled"].includes(job.status),
    );
    if ((prospectJob.status === "active" && expeditionWorker) || sleepJob)
      break;
  }
  expeditionWorker ??= carter;
  assert.ok(expeditionWorker);
  if (!sleepJob) {
    assert.equal(prospectJob.status, "active");
    expeditionWorker.life.needs.fatigue = 40;
    Object.assign(state.village.clock, {
      hour: 21,
      minute: 59,
      second: 24,
      block: "free_time",
    });
  }
  let expeditionSuspendedForRest = events.some(
      (event) =>
        event.type === "job_suspended" && event.jobId === prospectJob.id,
    ),
    reachedCampBed = false;
  for (let turn = 0; turn < 1000; turn += 1) {
    const result = applyRogueTurn(state, { kind: "equip", itemId: axe.id });
    events.push(...result.events);
    sleepJob ??= state.village.jobs.find(
      (job) =>
        job.jobType === "sleep" &&
        job.plan.ownerActorId === expeditionWorker.id &&
        job.plan.shelterFixtureId === camp.bedFixtureIds[0],
    );
    expeditionSuspendedForRest ||= prospectJob.status === "suspended";
    reachedCampBed ||=
      sleepJob?.status === "active" &&
      sleepJob.plan.shelterFixtureId === camp.bedFixtureIds[0] &&
      Math.abs(expeditionWorker.position.x - sleepJob.targetPosition.x) +
        Math.abs(expeditionWorker.position.y - sleepJob.targetPosition.y) <=
        1;
    if (sleepJob?.status === "completed") break;
  }
  assert.equal(expeditionSuspendedForRest, true);
  assert.equal(
    reachedCampBed,
    true,
    JSON.stringify({
      sleepJob: sleepJob && {
        status: sleepJob.status,
        targetPosition: sleepJob.targetPosition,
        fixtureId: sleepJob.plan.shelterFixtureId,
        completedAtTick: sleepJob.completedAtTick,
      },
      workerPosition: expeditionWorker.position,
      workerAction: expeditionWorker.currentAction,
      campPosition: camp.localPosition,
      bed: fixtures.find((fixture) => fixture.id === camp.bedFixtureIds[0]),
    }),
  );
  assert.equal(sleepJob.status, "completed");
  assert.ok(expeditionWorker.life.needs.fatigue > 40);
  Object.assign(state.village.clock, {
    hour: 8,
    minute: 0,
    second: 0,
    block: "work",
  });
  for (
    let turn = 0;
    turn < 1200 && prospectJob.status !== "completed";
    turn += 1
  ) {
    const result = applyRogueTurn(state, { kind: "equip", itemId: axe.id });
    events.push(...result.events);
  }
  assert.equal(prospectJob.status, "completed");
  assert.ok(prospectJob.plan.remoteTravel.campVisitedAtTick != null);
  assert.ok(
    events.some(
      (event) =>
        event.type === "regional_field_camp_visited" &&
        event.jobId === prospectJob.id,
    ),
  );
  let quarryJob;
  for (let turn = 0; turn < 2400 && !quarryJob; turn += 1) {
    const result = applyRogueTurn(state, { kind: "equip", itemId: axe.id });
    events.push(...result.events);
    quarryJob = state.village.jobs.find(
      (job) => job.jobType === "quarry_stone",
    );
  }
  assert.ok(quarryJob);
  quarryJob.plan.remoteTravel.riskScore = 100;
  quarryJob.plan.remoteTravel.riskBand = "high";
  const quarryWorker = state.village.npcStates.find(
    (actor) => actor.personKey === "woodcutter",
  );
  for (const job of state.village.jobs.filter(
    (candidate) =>
      candidate.plan?.lifeJob &&
      candidate.plan.ownerActorId === quarryWorker.id &&
      !["completed", "cancelled"].includes(candidate.status),
  )) {
    cancelJob(state, job, "expedition_test_reset");
    releaseJobReservations(state, job.id, "expedition_test_reset");
  }
  quarryWorker.workState = "available";
  for (const need of Object.keys(quarryWorker.life.needs))
    quarryWorker.life.needs[need] = 100;
  Object.assign(state.village.clock, {
    hour: 12,
    minute: 0,
    second: 0,
    block: "work",
  });
  for (let turn = 0; turn < 600; turn += 1) {
    const result = applyRogueTurn(state, { kind: "equip", itemId: axe.id });
    events.push(...result.events);
    if (quarryWorker.carriedItem?.itemKind === "pickaxe") break;
  }
  assert.equal(quarryWorker.carriedItem?.itemKind, "pickaxe");
  quarryWorker.life.needs.fatigue = 40;
  Object.assign(state.village.clock, {
    hour: 21,
    minute: 59,
    second: 24,
    block: "free_time",
  });
  let quarrySleep,
    retainedPickaxe = false;
  for (let turn = 0; turn < 1000; turn += 1) {
    const result = applyRogueTurn(state, { kind: "equip", itemId: axe.id });
    events.push(...result.events);
    quarrySleep ??= state.village.jobs.find(
      (job) =>
        job.jobType === "sleep" &&
        job.plan.ownerActorId === quarryWorker.id &&
        job.plan.shelterFixtureId === camp.bedFixtureIds[0],
    );
    retainedPickaxe ||=
      quarryJob.status === "suspended" &&
      quarryWorker.carriedItem?.itemKind === "pickaxe";
    if (quarrySleep?.status === "completed") break;
  }
  assert.equal(retainedPickaxe, true);
  assert.equal(quarrySleep.status, "completed");
  assert.equal(quarryWorker.carriedItem?.itemKind, "pickaxe");
  assert.equal(
    events.some(
      (event) =>
        event.type === "production_tool_returned" &&
        event.jobId === quarryJob.id &&
        event.tick <= quarrySleep.completedAtTick,
    ),
    false,
  );
  Object.assign(state.village.clock, {
    hour: 8,
    minute: 0,
    second: 0,
    block: "work",
  });
  for (
    let turn = 0;
    turn < 1600 && quarryJob.status !== "completed";
    turn += 1
  ) {
    const result = applyRogueTurn(state, { kind: "equip", itemId: axe.id });
    events.push(...result.events);
  }
  assert.equal(quarryJob.status, "completed");
  assert.ok(quarryJob.plan.remoteTravel.campVisitedAtTick != null);
  assert.equal(quarryJob.plan.remoteTravel.incidents.length, 1);
  assert.equal(quarryJob.plan.remoteTravel.incidents[0].status, "resolved");
  assert.ok(
    events.some(
      (event) =>
        event.type === "remote_travel_incident" && event.jobId === quarryJob.id,
    ),
  );
  assert.ok(
    events.some(
      (event) =>
        event.type === "remote_travel_recovered" &&
        event.jobId === quarryJob.id,
    ),
  );
  assert.equal(
    state.village.stockpiles.find((item) => item.key === "founding_pickaxes")
      .quantity,
    2,
  );
  assert.ok(
    state.village.regionalSimulation.chunks.some((chunk) =>
      chunk.checkpoint.delta.structureIds.includes(camp.id),
    ),
  );
  assert.deepEqual(
    parseRogueState(structuredClone(serializeRogueState(state))).village
      .development.masterPlan.regionalContext.fieldCamps,
    context.fieldCamps,
  );
});

test("R8 villagers prospect and exhaust one finite building-stone face", () => {
  const state = newRogueRun({
      ...input,
      seed: "the-river-below",
      runId: "3f030d41-7c22-5bd7-8d5e-64b157976783",
      scenario: "founding",
      worldGeneration: "regional_v3",
    }),
    axe = state.hero.inventory.find((item) => item.kind === "hand_axe"),
    prospectPositions = new Set(),
    quarryPositions = new Set(),
    returnPositions = new Set(),
    geologyEvents = [];
  state.location = "village";
  state.village.facilities.push(
    "survival_camp",
    "lumber_yard",
    "farmstead",
    "communal_kitchen",
    "housing",
  );
  const stoneStore = state.village.stockpiles.find(
      (item) => item.key === "quarry_stone",
    ),
    stoneBefore = stoneStore.quantity;
  let quarry,
    worker,
    inTransitProved = false,
    stored = false;
  for (let turn = 0; turn < 2400 && quarry?.status !== "completed"; turn += 1) {
    const result = applyRogueTurn(state, { kind: "equip", itemId: axe.id }),
      prospect = state.village.jobs.find(
        (job) => job.jobType === "prospect_rock",
      );
    quarry ??= state.village.jobs.find((job) => job.jobType === "quarry_stone");
    const active = quarry ?? prospect,
      actor = state.village.npcStates.find(
        (candidate) => candidate.id === active?.assignedActorId,
      );
    if (prospect?.status === "active" && actor)
      prospectPositions.add(`${actor.position.x},${actor.position.y}`);
    if (quarry?.status === "active" && actor) {
      worker = actor;
      quarryPositions.add(`${actor.position.x},${actor.position.y}`);
      if (quarry.plan.step === "return_output")
        returnPositions.add(`${actor.position.x},${actor.position.y}`);
    }
    geologyEvents.push(...result.events);
    stored ||= result.events.some(
      (event) => event.type === "remote_output_stored",
    );
    if (!stored) assert.equal(stoneStore.quantity, stoneBefore);
    if (quarry?.plan.step === "return_output" && !inTransitProved) {
      const inTransit = parseRogueState(
          structuredClone(serializeRogueState(state)),
        ),
        restoredWorker = inTransit.village.npcStates.find(
          (candidate) => candidate.id === worker.id,
        );
      assert.deepEqual(restoredWorker.carriedItem, worker.carriedItem);
      inTransitProved = true;
    }
  }
  const knowledge =
      state.village.development.masterPlan.regionalContext.geologyKnowledge,
    restored = parseRogueState(structuredClone(serializeRogueState(state)));
  assert.equal(
    quarry.status,
    "completed",
    JSON.stringify({
      tick: state.tick,
      step: quarry.plan.step,
      blockingReason: quarry.blockingReason,
      retryAt: quarry.nextRetryAtTick,
    }),
  );
  assert.equal(knowledge.revealedDeposits[0].remainingUnits, 0);
  assert.equal(stoneStore.quantity, stoneBefore + 3);
  assert.ok(prospectPositions.size > 8);
  assert.ok(quarryPositions.size > 8);
  assert.ok(returnPositions.size > 8);
  assert.equal(quarry.plan.remoteTravel.approved, true);
  assert.equal(quarry.plan.remoteTravel.tripClass, "day_trip");
  assert.equal(quarry.plan.remoteTravel.requiresCamp, false);
  assert.ok(quarry.plan.remoteTravel.actualSteps > 24);
  assert.ok(quarry.plan.remoteTravel.riskChecks > 0);
  assert.ok(
    geologyEvents.some((event) => event.type === "remote_output_stored"),
  );
  assert.ok(
    geologyEvents.some((event) => event.type === "remote_journey_completed"),
  );
  assert.equal(inTransitProved, true);
  assert.equal(
    state.village.stockpiles.find((item) => item.key === "founding_pickaxes")
      .quantity,
    2,
  );
  assert.ok(
    state.village.modifications.some((item) => item.kind === "quarried_rock"),
  );
  assert.deepEqual(
    restored.village.development.masterPlan.regionalContext.geologyKnowledge,
    knowledge,
  );
  const journeyLedger =
    state.village.development.masterPlan.regionalContext.journeyLedger;
  assert.ok(journeyLedger.some((entry) => entry.jobType === "prospect_rock"));
  assert.ok(
    journeyLedger.some(
      (entry) => entry.jobType === "quarry_stone" && entry.outcome === "stored",
    ),
  );
  assert.deepEqual(
    restored.village.development.masterPlan.regionalContext.journeyLedger,
    journeyLedger,
  );
});

test("R8 a regional hunter returns conserved venison from a real deer", () => {
  const state = newRogueRun({
      ...input,
      seed: "the-river-below",
      runId: "b1e722c5-2f8b-5e31-b0a3-f8bc17a2ab84",
      worldGeneration: "regional_v3",
    }),
    axe = state.hero.inventory.find((item) => item.kind === "hand_axe"),
    meat = state.village.stockpiles.find((item) => item.key === "pasture_meat"),
    positions = new Set(),
    events = [];
  state.location = "village";
  const regional = state.village.development.masterPlan.regionalContext;
  regional.dispatchPolicy.dayTripLimit = 500;
  regional.geologyKnowledge.status = "exhausted";
  regional.geologyKnowledge.foundingStoneExhausted = true;
  for (const worker of state.village.npcStates)
    for (const need of Object.keys(worker.life.needs))
      worker.life.needs[need] = 100;
  state.village.facilities.push(
    "survival_camp",
    "lumber_yard",
    "farmstead",
    "communal_kitchen",
    "housing",
  );
  for (const open of state.village.jobs.filter(
    (candidate) => candidate.jobType === "hunt_game",
  )) {
    const worker = state.village.npcStates.find(
      (candidate) => candidate.id === open.assignedActorId,
    );
    cancelJob(state, open, "regional_hunt_test_setup");
    releaseJobReservations(state, open.id, "regional_hunt_test_setup");
    if (worker) worker.workState = "available";
  }
  const before = meat.quantity;
  let job,
    targetId,
    carried = false,
    stored = false;
  for (let turn = 0; turn < 1800 && job?.status !== "completed"; turn += 1) {
    const result = applyRogueTurn(state, { kind: "equip", itemId: axe.id });
    events.push(...result.events);
    job ??= state.village.jobs.find(
      (candidate) => candidate.jobType === "remote_hunt_game",
    );
    targetId ??= job?.targetId;
    const worker = state.village.npcStates.find(
      (candidate) => candidate.id === job?.assignedActorId,
    );
    if (worker) positions.add(`${worker.position.x},${worker.position.y}`);
    carried ||=
      worker?.carriedItem?.itemKind === meat.itemKind ||
      result.events.some((event) => event.type === "remote_output_loaded");
    stored ||= result.events.some(
      (event) => event.type === "remote_output_stored",
    );
  }
  assert.equal(job?.status, "completed");
  assert.ok(job.plan.remoteTravel.distance > 32);
  assert.ok(job.plan.remoteTravel.actualSteps > 24);
  assert.ok(positions.size > 8);
  assert.equal(carried, true);
  assert.equal(stored, true);
  assert.ok(meat.quantity >= before + 4);
  assert.ok(
    state.village.foodLedger.batches.some(
      (batch) =>
        batch.originId === job.id &&
        batch.originType === "hunting" &&
        batch.quantityRemaining === 4,
    ),
  );
  const hunted = state.village.animals.find((animal) => animal.id === targetId);
  assert.equal(hunted.status, "dead");
  assert.equal(hunted.carcassState, "dressed");
  assert.ok(events.some((event) => event.type === "animal_hunted"));
  assert.ok(events.some((event) => event.type === "remote_output_stored"));
  assert.ok(
    state.village.development.masterPlan.regionalContext.journeyLedger.some(
      (entry) => entry.jobId === job.id && entry.outcome === "stored",
    ),
  );
});

test("R8 a regional woodcutter returns conserved timber beyond town", () => {
  const state = newRogueRun({
      ...input,
      seed: "the-river-below",
      runId: "e5c8f2ac-b71e-5ef9-b4f1-5938dfac8112",
      worldGeneration: "regional_v3",
    }),
    axe = state.hero.inventory.find((item) => item.kind === "hand_axe"),
    logs = state.village.stockpiles.find(
      (item) => item.key === "lumber_camp_logs",
    ),
    lumber = state.village.stockpiles.find(
      (item) => item.key === "lumber_yard_lumber",
    ),
    positions = new Set(),
    events = [];
  state.location = "village";
  const regional = state.village.development.masterPlan.regionalContext;
  regional.dispatchPolicy.dayTripLimit = 500;
  regional.geologyKnowledge.status = "exhausted";
  regional.resourcePressure = { timber: "regional_required" };
  lumber.quantity = lumber.threshold;
  for (const open of state.village.jobs.filter((job) =>
    ["fell_tree", "clear_field_tree", "saw_lumber"].includes(job.jobType),
  )) {
    const worker = state.village.npcStates.find(
      (candidate) => candidate.id === open.assignedActorId,
    );
    cancelJob(state, open, "regional_timber_test_setup");
    releaseJobReservations(state, open.id, "regional_timber_test_setup");
    if (worker) worker.workState = "available";
  }
  let job, transitQuantity, storedQuantity;
  for (let turn = 0; turn < 2200 && job?.status !== "completed"; turn += 1) {
    const result = applyRogueTurn(state, { kind: "equip", itemId: axe.id });
    events.push(...result.events);
    job ??= state.village.jobs.find(
      (candidate) => candidate.jobType === "remote_fell_tree",
    );
    const worker = state.village.npcStates.find(
      (candidate) => candidate.id === job?.assignedActorId,
    );
    if (worker) positions.add(`${worker.position.x},${worker.position.y}`);
    if (result.events.some((event) => event.type === "remote_output_loaded"))
      transitQuantity = logs.quantity;
    if (
      transitQuantity != null &&
      !result.events.some((event) => event.type === "remote_output_stored")
    )
      assert.equal(logs.quantity, transitQuantity);
    if (result.events.some((event) => event.type === "remote_output_stored"))
      storedQuantity = logs.quantity;
  }
  assert.equal(job?.status, "completed");
  assert.ok(job.plan.remoteTravel.distance > 96);
  assert.ok(job.plan.remoteTravel.actualSteps > 96);
  assert.ok(positions.size > 32);
  assert.equal(
    storedQuantity,
    transitQuantity + job.production.output.quantity,
  );
  assert.ok(
    state.village.modifications.some(
      (item) =>
        item.kind === "tree_stump" &&
        item.x === job.targetPosition.x &&
        item.y === job.targetPosition.y,
    ),
  );
  assert.ok(events.some((event) => event.type === "tree_felled"));
  assert.ok(events.some((event) => event.type === "remote_journey_completed"));
});

test("R8 prospecting reveals and returns one finite remote ore vein", () => {
  const state = newRogueRun({
      ...input,
      seed: "ore-close-7",
      runId: "79dd57b9-acde-50ad-9c87-0be31ea90656",
      worldGeneration: "regional_v3",
    }),
    axe = state.hero.inventory.find((item) => item.kind === "hand_axe"),
    ore = state.village.stockpiles.find((item) => item.key === "mine_tin_ore"),
    lumber = state.village.stockpiles.find(
      (item) => item.key === "lumber_yard_lumber",
    ),
    meals = state.village.stockpiles.find((item) => item.key === "inn_meals"),
    events = [],
    prospectPositions = new Set(),
    minePositions = new Set();
  state.location = "village";
  const regional = state.village.development.masterPlan.regionalContext;
  regional.dispatchPolicy.dayTripLimit = 96;
  regional.geologyKnowledge.status = "exhausted";
  regional.geologyKnowledge.foundingStoneExhausted = true;
  lumber.quantity = 300;
  meals.quantity = 50;
  for (const worker of state.village.npcStates)
    for (const need of Object.keys(worker.life.needs))
      worker.life.needs[need] = 100;
  for (const open of state.village.jobs.filter((job) =>
    ["prospect_rock", "quarry_stone", "fell_tree", "clear_field_tree"].includes(
      job.jobType,
    ),
  )) {
    const worker = state.village.npcStates.find(
      (candidate) => candidate.id === open.assignedActorId,
    );
    cancelJob(state, open, "remote_ore_test_setup");
    releaseJobReservations(state, open.id, "remote_ore_test_setup");
    if (worker) worker.workState = "available";
  }
  const before = ore.quantity;
  const targetWasHidden =
    regional.geologyKnowledge.revealedDeposits.length === 0;
  let prospect,
    mine,
    carried = false;
  for (let turn = 0; turn < 2400 && mine?.status !== "completed"; turn += 1) {
    const result = applyRogueTurn(state, { kind: "equip", itemId: axe.id });
    events.push(...result.events);
    prospect ??= state.village.jobs.find(
      (job) => job.jobType === "prospect_ore",
    );
    mine ??= state.village.jobs.find((job) => job.jobType === "mine_ore");
    for (const [job, positions] of [
      [prospect, prospectPositions],
      [mine, minePositions],
    ]) {
      const worker = state.village.npcStates.find(
        (candidate) => candidate.id === job?.assignedActorId,
      );
      if (worker) positions.add(`${worker.position.x},${worker.position.y}`);
      carried ||= worker?.carriedItem?.itemKind === "tin_ore";
    }
  }
  const deposit = regional.geologyKnowledge.revealedDeposits.find(
    (item) => item.depositKind === "tin_ore",
  );
  assert.equal(targetWasHidden, true);
  assert.equal(prospect?.status, "completed");
  assert.equal(
    mine?.status,
    "completed",
    JSON.stringify({
      tick: state.tick,
      clock: state.village.clock,
      mine: mine && {
        status: mine.status,
        step: mine.plan.step,
        reason: mine.suspensionReason ?? mine.blockingReason,
        assignedActorId: mine.assignedActorId,
        priority: mine.priority,
        progress: mine.progress,
      },
      worker: state.village.npcStates.find(
        (candidate) => candidate.id === mine?.assignedActorId,
      ),
    }),
  );
  assert.equal(deposit.remainingUnits, 0);
  assert.equal(mine.plan.remoteTravel.tripClass, "day_trip");
  assert.equal(ore.quantity, before + 3);
  assert.ok(prospectPositions.size > 32);
  assert.ok(minePositions.size > 32);
  assert.equal(carried, true);
  assert.ok(events.some((event) => event.type === "geology_prospected"));
  assert.ok(events.some((event) => event.type === "ore_mined"));
  assert.ok(events.some((event) => event.type === "remote_output_stored"));
  assert.deepEqual(
    parseRogueState(structuredClone(serializeRogueState(state))).village
      .development.masterPlan.regionalContext.geologyKnowledge,
    regional.geologyKnowledge,
  );
});

test("R8 regional substrate exposes a city-scale region through stable chunks", () => {
  const state = newRogueRun(input);
  state.location = "village";
  const first = rogueUnityView(state, [], {
      villageCenter: { x: -112, y: 55 },
    }),
    second = rogueUnityView(state, [], {
      villageCenter: { x: -112, y: 55 },
    });
  const { generationMode, waterways, trail, ...region } = first.map.region;
  assert.equal(generationMode, "legacy_origin");
  assert.deepEqual(waterways, []);
  assert.deepEqual(trail, []);
  assert.deepEqual(
    { ...region, sites: undefined },
    {
      minX: -2048,
      minY: -2048,
      maxX: 2047,
      maxY: 2047,
      width: 4096,
      height: 4096,
      chunkSize: 32,
      foundingEnvelope: 512,
      hamletEnvelope: 1024,
      sites: undefined,
    },
  );
  assert.deepEqual(
    first.map.region.sites.map((site) => site.key),
    ["stonebridge_crossing", "western_limestone_ridge"],
  );
  assert.equal(first.map.region.sites[0].tripClass, "day_trip");
  assert.equal(first.map.region.sites[1].dispatchStatus, "needs_field_camp");
  assert.ok(first.map.chunks.length > 12);
  assert.deepEqual(second.map.chunks, first.map.chunks);
  assert.ok(first.map.chunks.some((chunk) => chunk.tier === "active"));
  assert.ok(first.map.chunks.some((chunk) => chunk.tier === "warm"));
  assert.ok(first.map.chunks.some((chunk) => chunk.tier === "cold"));
  assert.equal(
    state.village.development.masterPlan.transportPolicy.foundingSurface,
    "dirt",
  );
  assert.deepEqual(
    state.village.development.masterPlan.defenseStrategy.perimeterSequence,
    ["palisade", "gates", "watch_houses", "stone_wall"],
  );
  assert.ok(
    first.map.cells.some(
      (cell) =>
        cell.tile === "outdoor_rock" && cell.variant === "limestone_outcrop",
    ),
  );
});

test("R8 river blocks the regional road except at a visible timber bridge", () => {
  const state = newRogueRun({ ...input, scenario: "founding" });
  state.location = "village";
  const view = rogueUnityView(state, [], { villageCenter: { x: 82, y: 12 } }),
    river = view.map.cells.filter(
      (cell) => cell.tile === "outdoor_water" && cell.variant === "river",
    ),
    bridge = view.map.cells.filter((cell) => cell.tile === "road_bridge_wood");
  assert.ok(river.length > view.map.height * 3);
  assert.ok(bridge.length >= 8);
  assert.ok(
    view.map.cells
      .filter(
        (cell) =>
          (cell.y === 11 || cell.y === 12) && cell.x >= -50 && cell.x < 70,
      )
      .every((cell) => cell.tile === "road_dirt"),
  );
});

test("Unity village cells identify signs and buildings on selection", () => {
  const state = newRogueRun(input);
  state.location = "village";
  const cells = rogueUnityView(state).map.cells,
    sign = cells.find((cell) => cell.x === 21 && cell.y === 10),
    smithy = rogueUnityView(state).map.landmarks.find(
      (landmark) => landmark.name === "Red Hammer Smithy",
    );
  assert.equal(sign.objectName, "Posted sign");
  assert.match(sign.objectDescription, /Stonebridge.*Keep west/);
  assert.equal(smithy.name, "Red Hammer Smithy");
});

test("Unity gives Stonebridge richer glyphs without changing dungeon ASCII", () => {
  const state = newRogueRun(input);
  state.location = "village";
  const village = rogueUnityView(state),
    treeGlyphs = new Set(
      village.map.cells
        .filter((cell) => cell.tile === "outdoor_tree")
        .map((cell) => cell.glyph),
    );
  assert.ok(treeGlyphs.size >= 4);
  assert.ok(
    village.map.cells
      .filter((cell) => cell.tile === "village_building")
      .every((cell) => cell.glyph !== "#"),
  );
  assert.ok(
    village.map.cells
      .filter((cell) => cell.objectKind === "door")
      .every((cell) => !["+", "'"].includes(cell.glyph)),
  );

  state.location = "dungeon";
  assert.ok(
    rogueUnityView(state).map.cells.some(
      (cell) => cell.tile === "wall" && cell.glyph === "#",
    ),
  );
});

test("Unity village pictures carry systemic species and material variants", () => {
  const state = newRogueRun(input);
  state.location = "village";
  state.village.adventurersPresent = true;
  const cells = rogueUnityView(state).map.cells,
    trees = cells.filter((cell) => cell.tile === "outdoor_tree"),
    walls = cells.filter((cell) => cell.tile === "village_building"),
    doors = cells.filter((cell) => cell.objectKind === "door"),
    furniture = cells.filter((cell) => cell.tile === "village_furniture");
  assert.deepEqual(
    new Set(trees.map((cell) => cell.variant)),
    new Set(["pine", "elm", "maple", "oak", "birch"]),
  );
  assert.ok(walls.every((cell) => cell.variant == null));
  assert.ok(doors.every((cell) => cell.variant == null));
  assert.ok(furniture.some((cell) => cell.variant === "table"));
  assert.ok(furniture.some((cell) => cell.variant === "chair"));
  assert.ok(
    furniture
      .filter((cell) => cell.glyph !== " ")
      .every((cell) => typeof cell.variant === "string"),
  );
  assert.equal(
    furniture.find((cell) => cell.objectName.endsWith("Worktable")).variant,
    "table",
  );
  assert.equal(
    furniture.find((cell) => cell.objectName.endsWith("Stable supply cart"))
      .variant,
    "cart",
  );
  assert.deepEqual(
    Object.fromEntries(
      [
        "Guest bed",
        "Stone forge",
        "Stew pot",
        "Prayer stone",
        "River fishing jetty",
        "Lumber yard site",
        "Grain field marker",
      ].map((name) => [
        name,
        furniture.find((cell) => cell.objectName === name)?.variant,
      ]),
    ),
    {
      "Guest bed": "bed",
      "Stone forge": "forge",
      "Stew pot": "cooking_pot",
      "Prayer stone": "prayer_stone",
      "River fishing jetty": "jetty",
      "Lumber yard site": "construction_site",
      "Grain field marker": "grain_plot",
    },
  );
  assert.ok(
    cells
      .filter((cell) => cell.objectKind === "sign")
      .every((cell) => cell.variant === "posted"),
  );
  const party = cells.filter((cell) => cell.entityKind === "party"),
    shelfAnchor = cells.find(
      (cell) =>
        cell.objectName === "Herb shelves" && cell.variant === "shelves",
    ),
    bedAnchor = cells.find(
      (cell) => cell.objectName === "Guest bed" && cell.variant === "bed",
    );
  assert.equal(new Set(party.map((cell) => cell.entityOutfit)).size, 4);
  assert.ok(party.every((cell) => cell.entityBodyBuild));
  assert.deepEqual(
    { width: shelfAnchor.objectWidth, height: shelfAnchor.objectHeight },
    { width: 2, height: 1 },
  );
  assert.deepEqual(
    { width: bedAnchor.objectWidth, height: bedAnchor.objectHeight },
    { width: 1, height: 2 },
  );
  assert.equal(
    villageWorldObjectAt(state, shelfAnchor.x, shelfAnchor.y).id,
    villageWorldObjectAt(state, shelfAnchor.x + 1, shelfAnchor.y).id,
  );
  assert.equal(villageWorldObjectAt(state, 1, 1).material, "timber");
  assert.equal(villageWorldObjectAt(state, 8, 9).material, "wood");
});

test("R6 Unity projection exposes accepted readable state without debug glyphs", () => {
  const state = newRogueRun(input);
  state.location = "village";
  const cells = rogueUnityView(state).map.cells,
    visualObjects = cells.filter((cell) => cell.visualFamily),
    stocked = cells.filter((cell) => cell.stockQuantity > 0),
    pawns = cells.filter(
      (cell) => cell.entityKind && cell.entityKind !== "animal",
    );
  assert.ok(visualObjects.length > 0);
  assert.ok(visualObjects.every((cell) => cell.visualFallback === false));
  assert.ok(stocked.length > 0);
  assert.ok(
    stocked.every(
      (cell) =>
        cell.stockpileId &&
        cell.stockItemKind &&
        cell.stockCapacity > 0 &&
        cell.stockpileIds.length === cell.stockItemKinds.length &&
        cell.stockpileIds.length === cell.stockQuantities.length &&
        cell.stockpileIds.length === cell.stockCapacities.length,
    ),
  );
  assert.ok(
    pawns.every(
      (cell) =>
        [
          "actor_civilian",
          "actor_guard",
          "actor_official",
          "actor_shopkeeper",
          "actor_party_blue",
          "actor_party_green",
          "actor_party_rust",
          "actor_party_ochre",
        ].includes(cell.visualAssetKey) &&
        cell.entityBodyBuild &&
        cell.entitySkinTone &&
        cell.entityHairStyle &&
        cell.entityHairColor &&
        cell.entityOutfit,
    ),
  );
});

test("R6 Unity keeps terrain beneath trees and moving actors", () => {
  const state = newRogueRun(input);
  state.location = "village";
  state.village.npcStates[0].position = { x: 19, y: 10 };
  const cells = rogueUnityView(state).map.cells,
    trees = cells.filter((cell) => cell.tile === "outdoor_tree"),
    actors = cells.filter((cell) => cell.entityKind);
  assert.ok(trees.length > 0);
  assert.ok(trees.every((cell) => cell.groundTile === "outdoor_grass"));
  assert.ok(
    actors.every((cell) => typeof (cell.groundTile ?? cell.tile) === "string"),
  );
  const roadActor = actors.find((cell) => cell.x === 19 && cell.y === 10);
  assert.ok(roadActor, "expected at least one actor standing on a road");
  assert.equal(roadActor.groundTile, "road_stone");
});

test("M-7 Unity projects only staffed, in-stock village shop offers", () => {
  const state = newRogueRun(input);
  state.location = "village";
  state.village.adventurersPresent = true;
  state.village.heroPosition = { x: 2, y: 2 };
  const view = rogueUnityView(state);
  assert.equal(view.shop.name, "Red Hammer Smithy");
  assert.equal(view.shop.open, true);
  assert.ok(view.shop.goods.length > 0);
  assert.ok(view.shop.goods.every((good) => good.quantity > 0));
  assert.ok(view.legalIntents.includes("shop_buy"));
});

test("Unity activity selects the newest meaningful delivery message", () => {
  const state = newRogueRun(input);
  state.location = "village";
  const view = rogueUnityView(state, [
    { type: "job_posted", jobName: "Deliver smithy supplies" },
    {
      type: "job_reserved",
      jobName: "Deliver smithy supplies",
      actorName: "Bram Eder",
    },
    { type: "npc_move" },
  ]);
  assert.equal(view.activity, "Bram Eder accepted Deliver smithy supplies.");
});

test("Unity activity explains a guard job interruption", () => {
  const state = newRogueRun(input);
  state.location = "village";
  const view = rogueUnityView(state, [
    {
      type: "job_suspended",
      jobName: "Patrol Stonebridge",
      actorName: "Friedel Koch",
    },
  ]);
  assert.equal(
    view.activity,
    "Friedel Koch's patrol stonebridge is interrupted.",
  );
});

test("R8 Unity explains a recoverable expedition incident", () => {
  const state = newRogueRun(input);
  state.location = "village";
  const view = rogueUnityView(state, [
    {
      type: "remote_travel_incident",
      actorName: "Lina Voss",
      kind: "predator_sign",
      jobName: "Quarry finite building stone",
    },
  ]);
  assert.deepEqual(view.activityLog, [
    {
      text: "Lina Voss encounters predator sign and stops to recover.",
      tone: "danger",
    },
  ]);
});

test("Unity activity describes a player-opened dungeon door", () => {
  const state = newRogueRun(input);
  const view = rogueUnityView(state, [
    { type: "door_opened", actorName: "Mara" },
  ]);
  assert.equal(view.activity, "Mara opened a door.");
});

test("Unity activity log gives combat readable tone and damage", () => {
  const state = newRogueRun(input);
  const view = rogueUnityView(state, [
    {
      type: "attack",
      actorKind: "enemy",
      actorName: "Goblin",
      targetName: "Mara",
      hit: true,
      appliedDamage: { hpDamage: 4 },
    },
  ]);
  assert.deepEqual(view.activityLog, [
    { text: "Goblin hits Mara for 4.", tone: "danger" },
  ]);
});

test("Unity legal intents collapse to death save while dying", () => {
  const state = newRogueRun(input);
  state.status = "dying";
  assert.deepEqual(rogueUnityView(state).legalIntents, ["death_save"]);
});

test("Unity exposes healing actions only when healing can succeed", () => {
  const state = newRogueRun(input);
  state.hero.hp -= 5;
  state.enemies = state.levels[state.depth - 1].enemies = [];
  const intents = rogueUnityView(state).legalIntents;
  assert.ok(intents.includes("use_item"));
  assert.ok(intents.includes("class_power"));
  assert.ok(intents.includes("short_rest"));
});

test("Unity protocol projects the active dungeon instead of Stonebridge", () => {
  const state = newRogueRun(input),
    view = rogueUnityView(state);
  assert.equal(view.location, "dungeon");
  assert.deepEqual(
    { width: view.map.width, height: view.map.height },
    { width: 30, height: 20 },
  );
  assert.equal(view.hero.x, state.hero.x);
  assert.equal(view.hero.y, state.hero.y);
  assert.equal(view.map.cells.length, view.map.width * view.map.height);
  assert.ok(view.map.cells.some((cell) => cell.entityId === state.hero.id));
  assert.ok(view.map.cells.some((cell) => cell.tile === "wall"));
  assert.notEqual(view.title, "Stonebridge");
  assert.ok(view.legalIntents.includes("search"));
  assert.ok(view.legalIntents.includes("command"));
  assert.ok(view.legalIntents.includes("equip"));
  assert.ok(!view.legalIntents.includes("use_item"));
  assert.ok(!view.legalIntents.includes("short_rest"));
  assert.ok(view.inventory.some((item) => item.itemType === "equipment"));
  assert.ok(view.inventory.some((item) => item.kind === "healing_potion"));
  assert.equal(view.inventories.length, 4);
  assert.equal(view.inventories[0].actorId, state.hero.id);
  assert.equal(view.partyOrder.id, state.partyGroup.id);
  assert.equal(view.partyOrder.commandRevision, 0);
  assert.equal(view.classPower.name, state.hero.classPower.name);
  assert.ok(Array.isArray(view.targets));
});
