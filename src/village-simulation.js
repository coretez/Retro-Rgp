import { key, orthogonalNeighbors, weightedRoute } from "./spatial.js";
import { definitionId, namedUuid } from "./identity.js";
import { WORLD_AFFORDANCES } from "./world-objects.js";
import {
  actorCanPerform,
  cancelJob,
  chooseAssignment,
  createJob,
  releaseJobReservations,
  reserveAll,
  restoreJobTransfer,
  transitionJob,
} from "./job-board.js";
import { RESIDENT_JOB_TEMPLATES, stockpileByKey } from "./village-economy.js";
import {
  assessSettlementMasterPlanSite,
  DEVELOPMENT_JOB_TEMPLATES,
  ensureFoundingFacilityStructure,
  foundingFacilityPlan,
  registerVillageArchitectPlan,
  updateVillageDevelopment,
} from "./village-development.js";
import {
  ensureFoundingSleepingPlaces,
  syncResidentHousing,
} from "./village-households.js";
import {
  assessConstructionSite,
  architectSiteAlternatives,
  constructionElements,
  constructionMaterialRequirements,
  deriveVillageArchitecture,
  designHouse,
  findConstructionSite,
  markVillageArchitectureDirty,
  orientHousePlan,
  repairConstructionEntity,
  specialistFacilityPlan,
  translateConstructionSite,
} from "./village-architecture.js";
import {
  CONSTRUCTION_CARRY_UNITS,
  TREE_WOOD_YIELDS,
  treeWoodYield,
} from "./village-materials.js";
import {
  COMPANION_WORK_TEMPLATES,
  companionActivityAvailable,
  companionTemplate,
} from "./companion-work.js";
import {
  advanceTownClock,
  LIFE_JOB_TYPES,
  LIFE_TARGETS,
  NEED_JOB_TYPES,
  needAttentionThreshold,
  needJobPriority,
  satisfyNeed,
  scheduleJobModifier,
  SIMULATION_MINUTES_PER_TICK,
  updateLifeState,
} from "./village-life.js";
import {
  advanceVillageAnimals,
  animalHousingDestination,
  animalHousingAvailable,
  animalProductionCandidates,
  animalFootprint,
  beginAnimalBreeding,
  completeAnimalRelocation,
  recordAnimalProduction,
  canBreedAnimals,
  ensureVillageAnimals,
  installAnimalHousingSites,
  livingAnimals,
  removeAnimal,
  treatAnimalDisease,
} from "./village-animals.js";
import { animalSpecies } from "./village-animal-species.js";
import { ensureRegionalSimulation } from "./village-region-simulation.js";
import {
  advanceFoodDeterioration,
  advanceForageRegrowth,
  activateFieldExpansion,
  advanceCropGrowth,
  applyCropAction,
  applyCropTreatment,
  applyFieldFertilizer,
  applyFieldWater,
  claimCropWorkCell,
  cropActionForJob,
  depositFood,
  ensureVillageFoodSystem,
  FOOD_ITEM_KINDS,
  fieldExpansionTreeCells,
  harvestForagePatch,
  produceFood,
  releaseCropWorkCell,
  ripeForagePatches,
  withdrawFood,
} from "./village-food.js";
import { advanceVillageTrade } from "./village-trade.js";
import { advanceVillageDemography } from "./village-demography.js";
import { regionalGeology, regionalTravelAssessment } from "./village-region.js";
import {
  reconcileVillageStorage,
  storageAvailableFor,
  storageDestinationAt,
  storageDestinationFor,
} from "./village-storage.js";
import {
  advanceVillageCivic,
  completeResidentBurial,
  completeResidentCremation,
  completeResidentExhumation,
  designateAnimalDisposalSite,
  designateVillageCemetery,
  ensureVillageCremationPyre,
  ensureVillageCivic,
  recordAnimalDisposal,
  recordResidentMourning,
  reserveVillageGrave,
  residentCorpse,
  residentMourners,
  villageGrave,
} from "./village-civic.js";

export const VILLAGE_POPULATION_GROWTH_ENABLED = false;
const CREMATION_FUEL_UNITS = 10;
const CONSTRUCTION_FOCUS_BATCH_SIZE = 8;

const VILLAGE_ROUTE_MAX_VISITED = 32768;

const SMITHY_DELIVERY = Object.freeze({
  sourcePosition: { x: 38, y: 23 },
  targetPosition: { x: 11, y: 3 },
  accessPosition: { x: 8, y: 9 },
  itemKind: "smithy_supplies",
});

const ADVANCING_INTENTS = new Set([
  "local_move",
  "local_manipulate",
  "shop_buy",
  "equip",
  "wait",
  "set_party_movement",
  "set_spending_policy",
]);

const VILLAGE_ROUTES = {
  watchman: [
    [20, 9],
    [20, 10],
    [20, 11],
    [24, 11],
    [20, 11],
    [20, 10],
  ],
  child: [
    [15, 15],
    [16, 15],
    [17, 15],
    [18, 15],
    [19, 15],
    [19, 14],
  ],
  porter: [
    [19, 14],
    [19, 13],
    [19, 12],
    [19, 11],
    [20, 11],
    [21, 11],
  ],
};

const FOUNDING_ROUTES = {
  watchman: [
    [-20, 14],
    [-8, 14],
    [-8, 22],
    [-20, 22],
  ],
};

const GUARD_JOB_TYPES = new Set([
  "patrol_route",
  "investigate_crime",
  "respond_danger",
]);

const PERSON_NAMES = {
  miller: "Greta Voll",
  baker: "Oskar Mertens",
  child: "Anja",
  watchman: "Friedel Koch",
  carter: "Bram Eder",
  porter: "Lina Roth",
  fisher: "Tomas Venn",
  hostler: "Pavel Dorn",
  smith: "Hanne Voss",
  herbalist: "Mei Lin",
  armorer: "Otto Kern",
  innkeeper: "Marta Pell",
  woodcutter: "Klara Holt",
  reeve: "Edda Voss",
  farmer: "Ada Weiss",
  herder: "Niko Brand",
  pilgrim: "Sister Elske",
  delver: "Ivo Brandt",
};

const TRANSFER_JOB_TYPES = new Set(["deliver_goods", "haul_stock"]);
const FORGE_JOB_TYPES = new Set(["craft_weapon", "craft_hunting_bow"]);
const HEAL_JOB_TYPE = "tend_wounded";
const COMPANION_HEAL_JOB_TYPE = "heal_party";
const COMPANION_JOB_TYPES = new Set([
  ...COMPANION_WORK_TEMPLATES.map((template) => template.jobType),
  COMPANION_HEAL_JOB_TYPE,
]);
const MAX_BLOCKED_RETRY_DELAY = 16;
const NAVIGATION_BLOCKED_RETRY_DELAY = 120;
const STATIC_NAVIGATION_FAILURES = new Set([
  "destination_blocked",
  "destination_unreachable",
  "no_path",
  "search_limit",
]);
const FORESTRY_SITE_CACHE = new WeakMap();

function blockedRetryDelay(job, reason) {
  const exponential = 2 ** (job.retryCount ?? 0);
  return Math.min(
    exponential,
    STATIC_NAVIGATION_FAILURES.has(reason)
      ? NAVIGATION_BLOCKED_RETRY_DELAY
      : MAX_BLOCKED_RETRY_DELAY,
  );
}
const SURVIVAL_WARNING_THRESHOLD = 40;
const SURVIVAL_DANGER_THRESHOLD = 25;
const FOUNDING_EMERGENCY_FOOD_CREW = 3;
const OPTIONAL_LIFE_NEEDS = new Set(["social", "morale"]);
const FOUNDING_OPTIONAL_LIFE_JOB_LIMIT = 2;
const FOUNDING_MEAL_TARGET = Object.freeze({
  ...LIFE_TARGETS.hunger,
  name: "Eat from the founding provisions",
  position: { x: -14, y: 18 },
  positions: [
    { x: -14, y: 18 },
    { x: -13, y: 18 },
    { x: -14, y: 19 },
    { x: -13, y: 19 },
  ],
  accessPosition: null,
});
const FOUNDING_SOCIAL_TARGET = Object.freeze({
  ...LIFE_TARGETS.social,
  objectKind: "meal",
  name: "Share company around the founding fire",
  duration: 30,
  position: { x: -13, y: 18 },
  positions: FOUNDING_MEAL_TARGET.positions.slice(1),
});
const FOUNDING_MORALE_TARGET = Object.freeze({
  ...LIFE_TARGETS.morale,
  objectKind: "meal",
  name: "Reflect beside the founding fire",
  duration: 30,
  position: { x: -14, y: 18 },
  positions: FOUNDING_MEAL_TARGET.positions,
  accessPosition: null,
});
const PRODUCTION_JOB_TYPES = new Set(
  [...RESIDENT_JOB_TEMPLATES, ...DEVELOPMENT_JOB_TEMPLATES]
    .filter((template) => template.jobType !== "haul_stock")
    .map((template) => template.jobType),
);
const ASSISTABLE_PROJECT_JOBS = new Set([
  "build_lumber_yard",
  "build_farmstead",
  "build_house",
  "build_communal_kitchen",
  "build_specialist_facility",
]);

const WORK_SKILLS = new Map(
  [...RESIDENT_JOB_TEMPLATES, ...DEVELOPMENT_JOB_TEMPLATES]
    .filter((template) => template.skill)
    .map((template) => [template.jobType, template.skill]),
);

const BLOCKED_TILES = new Set([
  "outdoor_tree",
  "outdoor_water",
  "outdoor_rock",
  "village_sign",
  "village_building",
  "village_furniture",
  "village_door_closed",
  "village_door_locked",
  "village_gate_closed",
  "village_gate_locked",
  "village_pit",
  "village_fence",
]);

const TERRAIN_COSTS = {
  road_stone: 1,
  road_dirt: 1,
  road_bridge_wood: 1,
  road_bridge_stone: 1,
  village_door_open: 2,
  village_gate_open: 2,
  village_floor: 2,
  village_mine_floor: 3,
  village_rubble: 3,
  outdoor_stump: 3,
  outdoor_grass: 4,
};

export function villageIntentAdvancesSimulation(intent) {
  const kind = typeof intent === "string" ? intent : intent.kind;
  if (kind === "world_interact")
    return (WORLD_AFFORDANCES[intent.action]?.duration ?? 0) > 0;
  return ADVANCING_INTENTS.has(kind);
}

export const villageMovementCost = (tile) =>
  BLOCKED_TILES.has(tile) ? null : (TERRAIN_COSTS[tile] ?? 3);

const accessPlanningCost = (tile) =>
  tile === "outdoor_tree" ? 40 : villageMovementCost(tile);

function summarizeVillagePath(route, terrainAt) {
  const clearableCells = route.path.filter(
      (position) => terrainAt(position) === "outdoor_tree",
    ),
    terrain = {};
  for (const position of route.path.slice(1)) {
    const tile = terrainAt(position);
    terrain[tile] = (terrain[tile] ?? 0) + 1;
  }
  return {
    ...route,
    stepCount: Math.max(0, route.path.length - 1),
    clearableCells,
    terrain,
    readiness: clearableCells.length ? "requires_clearing" : "ready",
  };
}

function guardPerceives(guard, position) {
  const distance =
      Math.abs(guard.position.x - position.x) +
      Math.abs(guard.position.y - position.y),
    radius = 30 + (guard.skills?.observation ?? 0);
  return distance <= radius;
}

// function-length-exempt: template -- incident state construction
function villageIncident(state, input) {
  return {
    id: namedUuid(
      state.id,
      `incident:${input.kind}:${input.position.x},${input.position.y}:${state.tick}`,
    ),
    kind: input.kind,
    status: "reported",
    evidenceId: input.evidenceId,
    position: { ...input.position },
    offenderId: input.offenderId ?? null,
    targetActorId: input.targetActorId ?? null,
    createdAtTick: state.tick,
    jobId: null,
  };
}

export function reportVillageIncident(state, input, events) {
  const incident = villageIncident(state, input),
    guard = state.village.npcStates.find((npc) => npc.personKey === "watchman");
  incident.perceivedBy = guardPerceives(guard, incident.position)
    ? guard.id
    : null;
  state.village.incidents.push(incident);
  events.push({ type: "incident_reported", incidentId: incident.id, ...input });
  if (!incident.perceivedBy) return incident;
  guard.objective = "protect_town";
  guard.currentAction = "Noticed damage to town property";
  guard.actionReason = "player_crime";
  guard.actionTarget = { ...incident.position };
  events.push({
    type: "guard_reacted",
    incidentId: incident.id,
    personId: guard.id,
    personName: PERSON_NAMES.watchman,
    wantedLevel: state.village.wantedLevel,
    position: { ...guard.position },
  });
  return incident;
}

function villageActorEvent(state, type, npc, details = {}) {
  return {
    type,
    scope: "village",
    tick: state.tick,
    actorId: npc.id,
    objective: npc.objective,
    currentAction: npc.currentAction,
    position: { ...npc.position },
    ...details,
  };
}

function occupiedVillageCells(state, actorId) {
  const adventurersPresent = state.village.adventurersPresent !== false,
    independentlyMoving =
      adventurersPresent &&
      (state.village.partyMovement === "dispersed" || state.village.regrouping),
    companions = !adventurersPresent
      ? []
      : independentlyMoving && state.village.companionStates?.length
        ? state.village.companionStates
            .filter((worker) => worker.id !== actorId)
            .map((worker) => worker.position)
        : state.village.companionPositions;
  return new Set(
    [
      ...(adventurersPresent ? [state.village.heroPosition] : []),
      ...companions,
      ...state.village.npcStates
        .filter((npc) => npc.id !== actorId && npc.life?.status !== "dead")
        .map((npc) => npc.position),
      ...livingAnimals(state).flatMap(animalFootprint),
    ].map(key),
  );
}

function villageWorkActors(state) {
  return [
    ...state.village.npcStates.filter((actor) => actor.life?.status !== "dead"),
    ...(state.village.adventurersPresent === false
      ? []
      : (state.village.companionStates ?? [])),
  ];
}

function villageWorkActor(state, actorId) {
  return villageWorkActors(state).find((actor) => actor.id === actorId);
}

function actorName(actor) {
  return actor?.name ?? PERSON_NAMES[actor?.personKey] ?? null;
}

function villageRouteOptions(npc, target, terrainAt, adjacent, occupied) {
  const margin = 32;
  return {
    from: npc.position,
    to: target,
    bounds: {
      minX: Math.min(npc.position.x, target.x) - margin,
      maxX: Math.max(npc.position.x, target.x) + margin,
      minY: Math.min(npc.position.y, target.y) - margin,
      maxY: Math.max(npc.position.y, target.y) + margin,
    },
    maxVisited: VILLAGE_ROUTE_MAX_VISITED,
    minimumStepCost: 1,
    ...(occupied ? { occupied } : {}),
    adjacent,
    isBlocked: (position) => villageMovementCost(terrainAt(position)) == null,
    terrainCost: (position) => villageMovementCost(terrainAt(position)),
  };
}

export function planVillageRoute(state, npc, target, terrainAt, adjacent) {
  const options = villageRouteOptions(
      npc,
      target,
      terrainAt,
      adjacent,
      occupiedVillageCells(state, npc.id),
    ),
    route = weightedRoute(options);
  if (
    route.ok ||
    !["destination_unreachable", "no_path"].includes(route.reason)
  )
    return route;
  const withoutPeople = weightedRoute(
    villageRouteOptions(npc, target, terrainAt, adjacent),
  );
  return withoutPeople.ok
    ? { ...route, reason: "destination_congested" }
    : route;
}

export function analyzeVillagePath(
  state,
  npc,
  target,
  terrainAt,
  { adjacent = false, allowTreeClearing = false } = {},
) {
  const direct = planVillageRoute(state, npc, target, terrainAt, adjacent);
  if (direct.ok) return summarizeVillagePath(direct, terrainAt);
  if (!allowTreeClearing) return { ...direct, readiness: "blocked" };
  const options = villageRouteOptions(npc, target, terrainAt, adjacent);
  options.isBlocked = (position) =>
    accessPlanningCost(terrainAt(position)) == null;
  options.terrainCost = (position) => accessPlanningCost(terrainAt(position));
  const cleared = weightedRoute(options);
  return cleared.ok
    ? summarizeVillagePath(cleared, terrainAt)
    : { ...cleared, readiness: "blocked" };
}

function villageActorAt(state, position, exceptId) {
  return villageWorkActors(state).find(
    (actor) => actor.id !== exceptId && key(actor.position) === key(position),
  );
}

function reservedVillagePositions(state, actorId) {
  const actorJobs = new Set(
    state.village.jobs
      .filter((job) => job.assignedActorId === actorId)
      .map((job) => job.id),
  );
  return new Set(
    state.village.reservations
      .filter(
        (claim) =>
          claim.state === "held" &&
          claim.kind === "position" &&
          !actorJobs.has(claim.jobId),
      )
      .map((claim) => key(claim.position)),
  );
}

function yieldPosition(state, blocker, mover, terrainAt, route) {
  const occupied = occupiedVillageCells(state, blocker.id),
    reserved = reservedVillagePositions(state, blocker.id),
    routeCells = new Set(route.map(key)),
    recentOrigin =
      state.tick - (blocker.lastYieldAtTick ?? -100) <= 3
        ? blocker.lastYieldOrigin
        : null;
  return orthogonalNeighbors(blocker.position)
    .filter(
      (candidate) =>
        key(candidate) !== key(mover.position) &&
        key(candidate) !== recentOrigin &&
        !occupied.has(key(candidate)) &&
        !reserved.has(key(candidate)) &&
        villageMovementCost(terrainAt(candidate)) != null,
    )
    .sort(
      (left, right) =>
        Number(routeCells.has(key(left))) -
          Number(routeCells.has(key(right))) ||
        villageMovementCost(terrainAt(left)) -
          villageMovementCost(terrainAt(right)) ||
        left.y - right.y ||
        left.x - right.x,
    )[0];
}

function invalidateActorRoute(state, actorId) {
  const job = state.village.jobs.find(
    (candidate) =>
      candidate.assignedActorId === actorId &&
      ["reserved", "active", "blocked"].includes(candidate.status),
  );
  if (!job?.plan) return;
  delete job.plan.cachedPath;
  delete job.plan.routeTarget;
  delete job.plan.cachedRouteCost;
}

function actorCanYieldPassage(state, blocker, mover) {
  if (villageDangerActive(state)) return false;
  if (state.tick - (blocker.lastYieldAtTick ?? -100) <= 6) return false;
  if (
    blocker.lastYieldForActorId === mover.id &&
    state.tick - (blocker.lastYieldAtTick ?? -100) <= 12
  )
    return false;
  const job = state.village.jobs.find(
    (candidate) =>
      candidate.assignedActorId === blocker.id &&
      ["reserved", "active"].includes(candidate.status),
  );
  return job?.jobType !== "respond_danger";
}

function passageRefusalReason(state, blocker, mover) {
  if (villageDangerActive(state)) return "tactical_hold";
  if (state.tick - (blocker.lastYieldAtTick ?? -100) <= 6)
    return "yield_cooldown";
  if (
    blocker.lastYieldForActorId === mover.id &&
    state.tick - (blocker.lastYieldAtTick ?? -100) <= 12
  )
    return "yield_cooldown";
  return "no_yield_space";
}

export function resolveVillageCrowdBlock(
  state,
  actor,
  target,
  terrainAt,
  adjacent,
  events = [],
  movedActors = new Set(),
) {
  const margin = 32,
    bounds = {
      minX: Math.min(actor.position.x, target.x) - margin,
      maxX: Math.max(actor.position.x, target.x) + margin,
      minY: Math.min(actor.position.y, target.y) - margin,
      maxY: Math.max(actor.position.y, target.y) + margin,
    },
    route = weightedRoute({
      from: actor.position,
      to: target,
      bounds,
      maxVisited: VILLAGE_ROUTE_MAX_VISITED,
      minimumStepCost: 1,
      occupied: new Set(),
      adjacent,
      isBlocked: (position) => villageMovementCost(terrainAt(position)) == null,
      terrainCost: (position) => villageMovementCost(terrainAt(position)),
    }),
    occupied = occupiedVillageCells(state, actor.id),
    blockedCell = route.ok
      ? route.path.slice(1).find((position) => occupied.has(key(position)))
      : null,
    blocker = blockedCell ? villageActorAt(state, blockedCell, actor.id) : null;
  if (!blocker) return false;
  events.push(
    villageActorEvent(state, "passage_requested", actor, {
      blockerId: blocker.id,
      blockerName: actorName(blocker),
    }),
  );
  if (movedActors.has(blocker.id)) {
    events.push(
      villageActorEvent(state, "passage_refused", blocker, {
        requestedByActorId: actor.id,
        reason: "already_moved",
      }),
    );
    return false;
  }
  const destination = actorCanYieldPassage(state, blocker, actor)
    ? yieldPosition(state, blocker, actor, terrainAt, route.path)
    : null;
  if (!destination) {
    events.push(
      villageActorEvent(state, "passage_refused", blocker, {
        requestedByActorId: actor.id,
        reason: passageRefusalReason(state, blocker, actor),
      }),
    );
    return false;
  }
  blocker.lastYieldOrigin = key(blocker.position);
  blocker.lastYieldAtTick = state.tick;
  blocker.lastYieldForActorId = actor.id;
  blocker.position = { ...destination };
  blocker.currentAction = `Yielding the way for ${actorName(actor)}`;
  blocker.actionReason = "passage_requested";
  movedActors.add(blocker.id);
  invalidateActorRoute(state, blocker.id);
  events.push(
    villageActorEvent(state, "passage_yielded", blocker, {
      requestedByActorId: actor.id,
    }),
  );
  return true;
}

function patrolDestination(npc, route) {
  const nextIndex = (npc.routeIndex + 1) % route.length,
    [x, y] = route[nextIndex];
  return { nextIndex, target: { x, y } };
}

function uniqueWatchPoints(points) {
  return [...new Map(points.map((point) => [key(point), point])).values()];
}

function activeVillageWatchPoints(state) {
  return state.village.jobs
    .filter(
      (job) =>
        ["reserved", "active"].includes(job.status) &&
        !GUARD_JOB_TYPES.has(job.jobType) &&
        !job.plan?.lifeJob,
    )
    .map((job) => job.plan?.accessPosition ?? job.targetPosition)
    .filter(Boolean)
    .slice(0, 2);
}

function residentWatchPoints(state) {
  return [...state.village.npcStates]
    .filter((resident) => resident.personKey !== "watchman")
    .sort(
      (left, right) =>
        left.position.y - right.position.y ||
        left.position.x - right.position.x,
    )
    .filter(
      (_, index, residents) => index === 0 || index === residents.length - 1,
    )
    .map((resident) => resident.position);
}

function buildingWatchPoints(state) {
  return [...state.village.buildings]
    .sort((left, right) => {
      const leftHome = left.householdId || left.key?.includes("house") ? 0 : 1,
        rightHome = right.householdId || right.key?.includes("house") ? 0 : 1;
      return leftHome - rightHome || left.key.localeCompare(right.key);
    })
    .map((building) => building.door)
    .filter(Boolean)
    .slice(0, 4);
}

function watchDutyPoint(state) {
  const watchHouse = state.village.buildings.find(
    (building) =>
      building.key === "watch_house" && building.status !== "destroyed",
  );
  return watchHouse?.door ?? null;
}

function orderWatchPoints(origin, points) {
  const remaining = [...points],
    ordered = [];
  let current = origin;
  while (remaining.length) {
    remaining.sort(
      (left, right) =>
        Math.abs(left.x - current.x) +
          Math.abs(left.y - current.y) -
          (Math.abs(right.x - current.x) + Math.abs(right.y - current.y)) ||
        left.y - right.y ||
        left.x - right.x,
    );
    current = remaining.shift();
    ordered.push(current);
  }
  return ordered;
}

function reachableWatchPoints(state, guard, points, terrainAt) {
  if (!terrainAt) return points;
  const reachable = [],
    partyCells = new Set(
      [state.village.heroPosition, ...state.village.companionPositions].map(
        key,
      ),
    ),
    probe = { ...guard, position: { ...guard.position } };
  for (const point of points) {
    const route = planVillageRoute(state, probe, point, terrainAt, true);
    if (
      !route.ok ||
      route.path.some((position) => partyCells.has(key(position)))
    )
      continue;
    reachable.push(point);
    probe.position = { ...route.destination };
  }
  return reachable;
}

export function guardPatrolRoute(state, terrainAt) {
  const guard = guardActor(state),
    duty = watchDutyPoint(state),
    buildings = buildingWatchPoints(state).slice(0, 2),
    work = activeVillageWatchPoints(state).slice(0, 1),
    residents = residentWatchPoints(state).slice(-1),
    points = uniqueWatchPoints([
      ...(duty ? [duty] : []),
      ...buildings,
      ...work,
      ...residents,
    ]).filter((point) => key(point) !== key(guard.position)),
    ordered = reachableWatchPoints(
      state,
      guard,
      orderWatchPoints(guard.position, points),
      terrainAt,
    ),
    fallback = reachableWatchPoints(
      state,
      guard,
      FOUNDING_ROUTES.watchman.map(([x, y]) => ({ x, y })),
      terrainAt,
    ),
    selected = ordered.length ? ordered : fallback;
  return [
    [guard.position.x, guard.position.y],
    ...selected.map((point) => [point.x, point.y]),
  ];
}

function villageRoute(state, personKey) {
  const routes =
    state.village.scenario === "founding" ? FOUNDING_ROUTES : VILLAGE_ROUTES;
  return routes[personKey];
}

function npcObjective(state, npc) {
  if (npc.actionReason === "player_crime" && npc.actionTarget)
    return { target: npc.actionTarget, adjacent: true };
  if (npc.personKey === "watchman") return null;
  const route = villageRoute(state, npc.personKey);
  if (!route) return null;
  return { ...patrolDestination(npc, route), adjacent: false };
}

function npcRoute(state, npc, objective, terrainAt, events, movedActors) {
  let result = planVillageRoute(
    state,
    npc,
    objective.target,
    terrainAt,
    objective.adjacent,
  );
  if (
    !result.ok &&
    resolveVillageCrowdBlock(
      state,
      npc,
      objective.target,
      terrainAt,
      objective.adjacent,
      events,
      movedActors,
    )
  )
    result = planVillageRoute(
      state,
      npc,
      objective.target,
      terrainAt,
      objective.adjacent,
    );
  return result;
}

function applyNpcRouteResult(
  state,
  npc,
  objective,
  result,
  events,
  movedActors,
) {
  if (!result.ok) {
    npc.waitReason = "blocked_access";
    events.push(
      villageActorEvent(state, "npc_blocked", npc, {
        reason: result.reason,
        destination: { ...objective.target },
      }),
    );
    return;
  }
  const moved = result.path.length > 1;
  npc.waitReason = "purposeful_routine";
  if (moved) {
    npc.position = { ...result.path[1] };
    movedActors.add(npc.id);
  }
  if (
    objective.nextIndex != null &&
    key(npc.position) === key(objective.target)
  )
    npc.routeIndex = objective.nextIndex;
  events.push(
    villageActorEvent(state, moved ? "npc_move" : "npc_wait", npc, {
      destination: { ...result.destination },
      routeCost: result.cost,
      ...(moved ? {} : { reason: "destination_reached" }),
    }),
  );
}

function applyNpcNavigation(
  state,
  npc,
  objective,
  terrainAt,
  events,
  movedActors,
) {
  if (movedActors.has(npc.id)) return;
  const result = npcRoute(
    state,
    npc,
    objective,
    terrainAt,
    events,
    movedActors,
  );
  applyNpcRouteResult(state, npc, objective, result, events, movedActors);
}

function npcWaitReason(state, npc, eligible) {
  const reasons = new Set(
    eligible.map((job) => job.blockingReason).filter(Boolean),
  );
  if (state.village.scenario === "founding" && eligible.length === 0)
    return "founding_standby";
  if (["rest", "free_time"].includes(npc.life?.scheduleBlock))
    return "useful_rest";
  if ([...reasons].some((reason) => MISSING_WORK_REASONS.has(reason)))
    return "missing_input";
  if ([...reasons].some((reason) => ACCESS_WORK_REASONS.has(reason)))
    return "blocked_access";
  if (
    eligible.some(
      (job) => job.assignedActorId && job.assignedActorId !== npc.id,
    )
  )
    return "contention";
  if (eligible.some((job) => (job.scheduleModifier ?? 0) < 0))
    return "schedule_policy";
  return "truthful_idle";
}

const MISSING_WORK_REASONS = new Set([
  "production_input_missing",
  "construction_material_pending",
  "cargo_unavailable",
  "remedy_unavailable",
  "prepared_meal_unavailable",
]);

const ACCESS_WORK_REASONS = new Set([
  "destination_blocked",
  "destination_unreachable",
  "no_path",
  "search_limit",
]);

const WAIT_ACTIONS = Object.freeze({
  founding_standby: "Awaiting the next survival assignment at camp",
  useful_rest: "Off duty",
  missing_input: "Waiting for required supplies",
  blocked_access: "Waiting for access to work",
  contention: "Waiting for an open work position",
  schedule_policy: "Waiting for scheduled work",
  truthful_idle: "Reporting to the reeve for assignment",
});

function advanceVillageNpc(state, npc, terrainAt, events, movedActors) {
  const objective = npcObjective(state, npc);
  if (objective)
    return applyNpcNavigation(
      state,
      npc,
      objective,
      terrainAt,
      events,
      movedActors,
    );
  if (npc.workState === "working") npc.workState = "available";
  const eligible = state.village.jobs.filter(
      (job) =>
        !["completed", "cancelled"].includes(job.status) &&
        actorCanPerform(npc, job, { allowWorking: true }),
    ),
    waitReason = npcWaitReason(state, npc, eligible);
  npc.currentAction = WAIT_ACTIONS[waitReason];
  npc.actionReason = waitReason;
  npc.waitReason = waitReason;
  events.push(
    villageActorEvent(state, "npc_wait", npc, { reason: waitReason }),
  );
}

function jobEvent(state, type, job, details = {}) {
  const actor = villageWorkActor(state, job.assignedActorId);
  return {
    type,
    scope: "village",
    tick: state.tick,
    jobId: job.id,
    jobType: job.jobType,
    jobName: job.name,
    status: job.status,
    actorId: job.assignedActorId,
    actorName: actorName(actor),
    ...details,
  };
}

function remoteTravelPlan(job) {
  return job.plan?.remoteTravel ?? null;
}

function remoteRiskRoll(job, check) {
  const id = namedUuid(job.id, `remote-risk:${check}`);
  return Number.parseInt(id.slice(0, 8), 16) / 0xffffffff;
}

function remoteIncidentDetails(travel) {
  if (travel.riskBand === "high")
    return { kind: "predator_sign", recoveryTicks: 6, needLoss: 6 };
  if (travel.riskBand === "guarded")
    return { kind: "weather_delay", recoveryTicks: 4, needLoss: 4 };
  return { kind: "rough_ground", recoveryTicks: 2, needLoss: 2 };
}

function triggerRemoteRisk(state, job, actor, events, check) {
  const travel = remoteTravelPlan(job);
  travel.incidents ??= [];
  if (
    travel.incidents.length ||
    remoteRiskRoll(job, check) > travel.riskScore / 100
  )
    return;
  const details = remoteIncidentDetails(travel),
    incident = {
      id: namedUuid(job.id, `remote-incident:${check}`),
      check,
      status: "recovering",
      position: { ...actor.position },
      occurredAtTick: state.tick,
      ...details,
    };
  travel.incidents.push(incident);
  travel.recoveryTicksRemaining = details.recoveryTicks;
  actor.life.needs.fatigue = Math.max(
    0,
    actor.life.needs.fatigue - details.needLoss,
  );
  actor.life.needs.safety = Math.max(
    0,
    actor.life.needs.safety - details.needLoss,
  );
  events.push(jobEvent(state, "remote_travel_incident", job, incident));
}

function recordRemoteTravelStep(state, job, actor, from, to, events) {
  const travel = remoteTravelPlan(job);
  if (!travel) return;
  const previousChecks = travel.riskChecks ?? 0;
  travel.actualSteps = (travel.actualSteps ?? 0) + 1;
  travel.stepsByPhase ??= {};
  travel.stepsByPhase[job.plan.step] =
    (travel.stepsByPhase[job.plan.step] ?? 0) + 1;
  travel.lastStep = { from: { ...from }, to: { ...to } };
  travel.riskChecks = Math.floor(travel.actualSteps / 24);
  if (travel.riskChecks > previousChecks)
    triggerRemoteRisk(state, job, actor, events, travel.riskChecks);
}

function recoverRemoteTravel(state, job, actor, events) {
  const travel = remoteTravelPlan(job),
    remaining = travel?.recoveryTicksRemaining ?? 0;
  if (!remaining) return false;
  travel.recoveryTicksRemaining = remaining - 1;
  actor.currentAction = "Recovering safely at the expedition route";
  actor.actionReason = "remote_travel_recovery";
  const incident = travel.incidents?.find(
    (item) => item.status === "recovering",
  );
  if (travel.recoveryTicksRemaining === 0 && incident) {
    incident.status = "resolved";
    incident.recoveredAtTick = state.tick;
    events.push(
      jobEvent(state, "remote_travel_recovered", job, {
        incidentId: incident.id,
      }),
    );
  } else events.push(jobEvent(state, "remote_travel_recovery", job));
  return true;
}

function recordRemoteJourney(state, job, outcome, events) {
  const travel = remoteTravelPlan(job);
  if (!travel || travel.recordedAtTick != null) return;
  const context = state.village.development.masterPlan.regionalContext,
    entry = {
      id: namedUuid(state.id, `regional-journey:${job.id}`),
      jobId: job.id,
      jobType: job.jobType,
      destination: { ...job.targetPosition },
      ...structuredClone(travel),
      outcome,
      completedAtTick: state.tick,
    };
  travel.recordedAtTick = state.tick;
  context.journeyLedger.push(entry);
  context.journeyLedger = context.journeyLedger.slice(-128);
  events.push(jobEvent(state, "remote_journey_completed", job, entry));
}

function jobTargetPosition(job) {
  if (job.plan?.constructionDelivery)
    return job.plan.step === "to_source"
      ? job.sourcePosition
      : job.targetPosition;
  if (job.transfer && job.plan?.step === "to_source") return job.sourcePosition;
  if (job.production && job.plan?.step === "to_input")
    return uncollectedProductionInput(job)?.position ?? job.targetPosition;
  if (job.production && job.plan?.step === "return_input")
    return reusableProductionInput(job)?.position ?? job.targetPosition;
  if (job.production && job.plan?.step === "return_output")
    return job.plan.returnOutputPosition ?? job.targetPosition;
  if (
    job.plan?.constructionWork &&
    job.plan.step === "to_target" &&
    job.production.inputs.some(
      (input) => input.consume && input.carriedQuantity > 0,
    )
  )
    return constructionElementWorkPosition(
      job,
      nextConstructionMaterialElement(job),
    );
  if (
    job.plan?.constructionWork &&
    ["to_target", "produce"].includes(job.plan.step) &&
    !job.production.inputs.some(
      (input) => input.consume && input.carriedQuantity > 0,
    )
  )
    return constructionElementWorkPosition(job, activeConstructionElement(job));
  return job.targetPosition;
}

function uncollectedProductionInput(job) {
  const inputs = job.production?.inputs ?? [],
    reusable = job.plan?.construction
      ? inputs.find(
          (input) =>
            input.requiresPickup &&
            input.consume === false &&
            input.carriedQuantity < input.quantity,
        )
      : null;
  if (job.plan?.construction) return reusable;
  return inputs.find(
    (input) =>
      input.requiresPickup &&
      (job.plan?.construction
        ? input.consume === false
          ? input.carriedQuantity < input.quantity
          : (input.deliveredQuantity ?? 0) < input.quantity
        : input.carriedQuantity < input.quantity),
  );
}

function reusableProductionInput(job) {
  return job.production?.inputs.find(
    (input) => input.consume === false && input.carriedQuantity > 0,
  );
}

// function-length-exempt: template -- construction work-state construction/migration
function ensureConstructionWork(job) {
  if (!job.plan?.construction) return;
  if (!job.plan.constructionWork) {
    const elements = constructionElements(job.plan.construction).map(
      (element) => ({
        ...element,
        id: namedUuid(job.id, `construction-element:${element.key}`),
        definitionId: definitionId("construction-element", element.kind),
        entityType: "construction-element",
        projectId: job.id,
        status: "planned",
        materialDelivered: false,
        materialDeliveredQuantity: 0,
        laborCompleted: 0,
        laborRequired:
          element.laborRequired ??
          (element.kind === "fence" ? 6 : element.kind === "wall" ? 10 : 12),
      }),
    );
    const supportIds = elements
      .filter((element) => ["wall", "door"].includes(element.kind))
      .map((element) => element.id);
    for (const element of elements)
      if (element.kind === "roof") element.supportIds = [...supportIds];
    job.plan.constructionWork = {
      elements,
      doorFirstClosure: Boolean(job.plan.construction.door),
    };
    job.progress.total = elements.reduce(
      (total, element) => total + element.laborRequired,
      0,
    );
  }
  for (const element of job.plan.constructionWork.elements) {
    element.id ??= namedUuid(job.id, `construction-element:${element.key}`);
    element.definitionId ??= definitionId("construction-element", element.kind);
    element.entityType ??= "construction-element";
    element.projectId ??= job.id;
    element.materialRequired ??= 1;
    element.materialDeliveredQuantity ??= element.materialDelivered
      ? element.materialRequired
      : 0;
    element.materialDelivered =
      element.materialDeliveredQuantity >= element.materialRequired;
  }
  if (job.plan.construction.door)
    job.plan.constructionWork.doorFirstClosure = true;
  else job.plan.constructionWork.doorFirstClosure ??= false;
  job.plan.activeConstructionElementKey ??=
    job.plan.constructionWork.elements[0]?.key ?? null;
}

function nextConstructionMaterialElement(job) {
  return job.plan?.constructionWork?.elements.find(
    (element) => element.materialDeliveredQuantity < element.materialRequired,
  );
}

function constructionInputKey(element) {
  return element?.material === "stone" ? "quarry_stone" : "lumber_yard_lumber";
}

function constructionMaterialInput(job, element = null) {
  const inputs = job.production?.inputs.filter(
    (input) => input.consume && input.requiresPickup,
  );
  if (!element || inputs?.length === 1) return inputs?.[0] ?? null;
  return inputs.find(
    (input) => input.stockpileKey === constructionInputKey(element),
  );
}

function recordConstructionMaterial(state, job, element, input, quantity) {
  state.village.constructionMaterials ??= [];
  const sequence = state.village.constructionMaterials.filter(
      (material) => material.elementId === element.id,
    ).length,
    material = {
      id: namedUuid(element.id, `delivered-material:${sequence + 1}`),
      definitionId: definitionId("construction-material", input.itemKind),
      entityType: "construction-material",
      projectId: job.id,
      elementId: element.id,
      itemKind: input.itemKind,
      quantity,
      position: { ...element.position },
      state: "delivered",
      deliveredAtTick: state.tick,
    };
  state.village.constructionMaterials.push(material);
  element.deliveredMaterialIds ??= [];
  element.deliveredMaterialIds.push(material.id);
  return material;
}

function consumeConstructionMaterials(state, element) {
  const ids = new Set(element.deliveredMaterialIds ?? []);
  for (const material of state.village.constructionMaterials ?? [])
    if (ids.has(material.id) && material.state === "delivered") {
      material.state = "consumed";
      material.consumedAtTick = state.tick;
    }
}

function activeConstructionElement(job) {
  ensureConstructionWork(job);
  const work = job.plan?.constructionWork,
    focus = constructionFocusElements(job);
  if (!work) return null;
  const active = focus.find(
    (element) => element.key === job.plan.activeConstructionElementKey,
  );
  if (
    active?.materialDelivered &&
    active.status !== "complete" &&
    constructionElementReady(work, active)
  )
    return active;
  const next = focus.find(
    (element) =>
      element.materialDelivered &&
      element.status !== "complete" &&
      constructionElementReady(work, element) &&
      !element.clearanceBlocked &&
      !element.claimedByAssistJobId,
  );
  job.plan.activeConstructionElementKey = next?.key ?? null;
  return next ?? null;
}

function constructionFocusElements(job) {
  ensureConstructionWork(job);
  const pending = job.plan.constructionWork.elements.filter(
    (element) => element.status !== "complete",
  );
  const elements = pending.slice(0, CONSTRUCTION_FOCUS_BATCH_SIZE);
  job.plan.workQueue = {
    skill: "construction",
    batchSize: CONSTRUCTION_FOCUS_BATCH_SIZE,
    activeElementKeys: elements.map((element) => element.key),
    completedCount: job.plan.constructionWork.elements.length - pending.length,
  };
  return elements;
}

function constructionQueuePhase(elements) {
  if (elements.some((element) => element.clearanceBlocked)) return "clearance";
  if (elements.some((element) => !element.surveyedById)) return "survey";
  if (elements.some((element) => !element.materialDelivered)) return "delivery";
  return "construction";
}

function constructionQueueEntry(state, parent, element) {
  const work = parent.plan.constructionWork;
  const blocker = element.clearanceBlocked
    ? "clearance_pending"
    : !element.surveyedById
      ? "survey_pending"
      : !element.materialDelivered
        ? "material_pending"
        : !constructionElementReady(work, element)
          ? "dependency_pending"
          : !fieldFenceClearanceReady(state, element)
            ? "clearance_pending"
            : element.claimedByAssistJobId
              ? "worker_claimed"
              : null;
  return {
    elementKey: element.key,
    position: { ...element.position },
    readiness: blocker ? "blocked" : "ready",
    blocker,
  };
}

function syncConstructionSkillQueue(state, parent) {
  const elements = constructionFocusElements(parent);
  parent.plan.workQueue.phase = constructionQueuePhase(elements);
  parent.plan.workQueue.updatedAtTick = state.tick;
  parent.plan.workQueue.jobs = elements.map((element) =>
    constructionQueueEntry(state, parent, element),
  );
  state.village.skillWorkQueues ??= {};
  state.village.skillWorkQueues.construction ??= {
    skill: "construction",
    queueIds: [],
  };
  const registry = state.village.skillWorkQueues.construction;
  registry.queueIds = state.village.jobs
    .filter((job) => job.plan?.workQueue && job.status !== "completed")
    .map((job) => job.id);
  registry.queues = state.village.jobs
    .filter((job) => registry.queueIds.includes(job.id))
    .map((job) => ({ projectId: job.id, ...job.plan.workQueue }));
  registry.updatedAtTick = state.tick;
  return elements;
}

function enclosureExteriorWorkPosition(job, element) {
  const enclosure = job.plan?.construction?.enclosures?.find(
    (candidate) => candidate.key === element?.pastureKey,
  );
  if (!enclosure) return null;
  const right = enclosure.x + enclosure.w - 1,
    bottom = enclosure.y + enclosure.h - 1;
  if (element.position.y === enclosure.y)
    return { x: element.position.x, y: element.position.y - 1 };
  if (element.position.y === bottom)
    return { x: element.position.x, y: element.position.y + 1 };
  if (element.position.x === enclosure.x)
    return { x: element.position.x - 1, y: element.position.y };
  if (element.position.x === right)
    return { x: element.position.x + 1, y: element.position.y };
  return null;
}

function wallInteriorWorkPosition(site, position) {
  const right = site.x + site.w - 1,
    bottom = site.y + site.h - 1,
    x = position.x === site.x ? 1 : position.x === right ? -1 : 0,
    y = position.y === site.y ? 1 : position.y === bottom ? -1 : 0;
  return { x: position.x + x, y: position.y + y };
}

function constructionElementWorkPosition(job, element) {
  const enclosureWork = ["fence", "gate"].includes(element?.kind)
    ? enclosureExteriorWorkPosition(job, element)
    : null;
  if (enclosureWork) return enclosureWork;
  if (["floor", "roof"].includes(element?.kind) && job.plan?.construction?.door)
    return job.plan.construction.door;
  if (element?.kind === "door" && job.plan?.construction?.requiresTownAccess)
    return (
      exteriorDoorApproaches(job.plan.construction, element.position)[0] ??
      element.position
    );
  if (element?.kind === "wall" && job.plan?.construction)
    return wallInteriorWorkPosition(job.plan.construction, element.position);
  return element?.position ?? job.targetPosition;
}

function updateConstructionProgress(job) {
  const elements = job.plan.constructionWork.elements;
  job.progress.completed = Math.min(
    job.progress.total,
    elements.reduce((sum, element) => sum + element.laborCompleted, 0),
  );
}

function keepConstructionAccessOpen(state, job) {
  const work = job.plan?.constructionWork,
    site = job.plan?.construction;
  if (
    !work ||
    !site ||
    work.elements.every((element) => element.status === "complete")
  )
    return;
  const pastureKeys = new Set(
    (site.enclosures ?? []).map((enclosure) => enclosure.key),
  );
  for (const door of state.village.doors)
    if (door.buildingKey === site.key || pastureKeys.has(door.pastureKey))
      door.state = "open";
}

function fishingJobRoute(state, actor, job, terrainAt) {
  if (job.jobType !== "catch_fish" || !job.plan?.fishingPosition) return null;
  return planVillageRoute(
    state,
    actor,
    job.plan.fishingPosition,
    terrainAt,
    false,
  );
}

function specialJobRoute(state, actor, job, terrainAt) {
  const campRoute = remoteCampRoute(state, actor, job, terrainAt),
    fishingRoute = fishingJobRoute(state, actor, job, terrainAt);
  if (campRoute || fishingRoute) return campRoute ?? fishingRoute;
  if (job.jobType === "patrol_route") {
    if (!job.plan.route) {
      job.plan.route = guardPatrolRoute(state, terrainAt);
      job.progress.completed = 0;
      job.progress.total = job.plan.route.length;
      actor.routeIndex = 0;
    }
    const objective = patrolDestination(actor, job.plan.route);
    job.targetPosition = { ...objective.target };
    job.plan.nextRouteIndex = objective.nextIndex;
    return planVillageRoute(state, actor, objective.target, terrainAt, true);
  }
  if (!["investigate_crime", "respond_danger"].includes(job.jobType))
    return null;
  const muster =
    state.village.development?.masterPlan?.defenseStrategy?.musterPoint;
  if (job.plan?.musterRequired && job.plan.musteredAtTick == null && muster)
    return planVillageRoute(state, actor, muster.position, terrainAt, false);
  const warning = ["warn_offender", "escort_offender"].includes(job.plan?.step);
  return planVillageRoute(
    state,
    actor,
    warning ? state.village.heroPosition : job.targetPosition,
    terrainAt,
    true,
  );
}

function remoteCampRoute(state, actor, job, terrainAt) {
  const travel = remoteTravelPlan(job);
  if (
    !travel?.fieldCampId ||
    travel.campVisitedAtTick != null ||
    !["to_target", "produce"].includes(job.plan?.step) ||
    job.progress.completed > 0
  )
    return null;
  const camp = geologyPlanContext(state).fieldCamps.find(
    (candidate) => candidate.id === travel.fieldCampId,
  );
  if (!camp) return null;
  travel.activeWaypoint = "field_camp";
  travel.campPosition = { ...camp.localPosition };
  return planVillageRoute(state, actor, camp.localPosition, terrainAt, false);
}

function completeRemoteWaypoint(state, job, actor, route, events) {
  const travel = remoteTravelPlan(job);
  if (route.path.length !== 1 || travel?.activeWaypoint !== "field_camp")
    return false;
  travel.campVisitedAtTick = state.tick;
  delete travel.activeWaypoint;
  delete job.plan.cachedPath;
  actor.currentAction = "Checking supplies at the regional field camp";
  actor.actionReason = "field_camp_waypoint";
  events.push(
    jobEvent(state, "regional_field_camp_visited", job, {
      fieldCampId: travel.fieldCampId,
      position: { ...actor.position },
    }),
  );
  return true;
}

function cachedJobRoute(job, actor, target, terrainAt, adjacent = true) {
  const cached = job.plan?.cachedPath,
    index = cached?.findIndex(
      (position) => key(position) === key(actor.position),
    ),
    remaining = index != null && index >= 0 ? cached.slice(index) : null;
  if (job.plan?.routeTarget !== key(target) || !remaining?.length) return null;
  if (!adjacent && key(remaining.at(-1)) !== key(target)) return null;
  if (remaining[1] && villageMovementCost(terrainAt(remaining[1])) == null)
    return null;
  job.plan.cachedPath = remaining;
  return {
    ok: true,
    path: remaining.map((position) => ({ ...position })),
    destination: { ...remaining.at(-1) },
    cost: job.plan.cachedRouteCost ?? remaining.length - 1,
  };
}

function constructionDeliveryFallbackRoute(state, actor, job, terrainAt) {
  if (!job.plan?.constructionDelivery || job.plan.step !== "to_target")
    return null;
  const parent = constructionDeliveryParent(state, job),
    element = constructionDeliveryElement(parent, job);
  if (!element) return null;
  const route = planVillageRoute(
    state,
    actor,
    element.position,
    terrainAt,
    true,
  );
  return route.ok ? route : null;
}

function routeForJob(state, actor, job, terrainAt) {
  keepConstructionAccessOpen(state, job);
  const special = specialJobRoute(state, actor, job, terrainAt);
  if (special) return special;
  const target = jobTargetPosition(job),
    adjacent = job.jobType !== "sleep",
    routeTerrainAt = sleepRouteTerrain(job, target, terrainAt),
    cached = cachedJobRoute(job, actor, target, routeTerrainAt, adjacent);
  if (cached) return cached;
  let route = planVillageRoute(state, actor, target, routeTerrainAt, adjacent);
  if (!route.ok)
    route =
      constructionDeliveryFallbackRoute(state, actor, job, terrainAt) ?? route;
  if (route.ok && job.assignedActorId === actor.id)
    cacheJobRoute(job, route, target);
  return route;
}

function sleepRouteTerrain(job, target, terrainAt) {
  if (job.jobType !== "sleep") return terrainAt;
  return (position) =>
    key(position) === key(target) ? "village_floor" : terrainAt(position);
}

function planVillageTerrainRoute(state, actor, target, terrainAt, adjacent) {
  const options = villageRouteOptions(actor, target, terrainAt, adjacent, null);
  return weightedRoute(options);
}

function routeForAssignment(state, actor, job, terrainAt) {
  const accessDoor = jobAccessDoor(state, job);
  if (accessDoor && accessDoor.state !== "open")
    return planVillageRoute(
      state,
      actor,
      job.plan.accessPosition,
      terrainAt,
      true,
    );
  const route = routeForJob(state, actor, job, terrainAt);
  if (route.ok || !job.plan?.accessPosition) return route;
  const accessRoute = planVillageRoute(
    state,
    actor,
    job.plan.accessPosition,
    terrainAt,
    true,
  );
  if (accessRoute.ok) return accessRoute;
  return planVillageTerrainRoute(
    state,
    actor,
    job.plan.accessPosition,
    terrainAt,
    true,
  );
}

function jobNavigationGoal(state, job) {
  if (job.jobType === "patrol_route")
    return { target: job.targetPosition, adjacent: false };
  if (job.jobType === "sleep")
    return { target: job.targetPosition, adjacent: false };
  if (
    ["investigate_crime", "respond_danger"].includes(job.jobType) &&
    ["warn_offender", "escort_offender"].includes(job.plan?.step)
  )
    return { target: state.village.heroPosition, adjacent: true };
  if (["investigate_crime", "respond_danger"].includes(job.jobType))
    return { target: job.targetPosition, adjacent: false };
  return { target: jobTargetPosition(job), adjacent: true };
}

function clearJobCrowdBlock(state, job, actor, terrainAt, events, movedActors) {
  const goal = jobNavigationGoal(state, job);
  return resolveVillageCrowdBlock(
    state,
    actor,
    goal.target,
    terrainAt,
    goal.adjacent,
    events,
    movedActors,
  );
}

function cacheJobRoute(job, route, target = jobTargetPosition(job)) {
  if (!job.plan || GUARD_JOB_TYPES.has(job.jobType)) return;
  job.plan.cachedPath = route.path.map((position) => ({ ...position }));
  job.plan.routeTarget = key(target);
  job.plan.cachedRouteCost = route.cost;
}

function consumeCachedStep(job, position) {
  if (job.plan?.cachedPath?.length > 1)
    job.plan.cachedPath = job.plan.cachedPath.slice(1);
  if (
    job.plan?.cachedPath?.length &&
    key(job.plan.cachedPath[0]) !== key(position)
  )
    delete job.plan.cachedPath;
}

function productionClaims(job) {
  if (job.plan?.lifeJob || job.plan?.parallelProduction) return [];
  const claims = (job.production?.inputs ?? [])
    .filter((input) => !(job.plan?.construction && input.consume))
    .map((input) => ({ kind: "item", targetId: input.stockpileId }));
  if (job.production?.output && !job.plan?.waterHarvest)
    claims.push({ kind: "item", targetId: job.production.output.stockpileId });
  return claims;
}

function transferClaims(job) {
  if (!job.transfer) return [];
  const destination =
    job.plan?.storageDestination?.cellId ?? job.transfer.targetStockpileId;
  return [
    { kind: "item", targetId: job.transfer.sourceStockpileId },
    { kind: "item", targetId: `storage-cell:${destination}` },
  ];
}

function jobClaims(job, destination, actorId) {
  const claims = [
    { kind: "job", targetId: job.id },
    { kind: "actor", targetId: actorId },
  ];
  if (!job.plan?.lifeJob)
    claims.push({
      kind: "position",
      locationKey: "stonebridge",
      position: { ...destination },
    });
  if (
    !job.plan?.lifeJob &&
    job.jobType !== "patrol_route" &&
    !job.transfer &&
    !job.plan?.projectAssist &&
    !job.plan?.parallelProduction
  )
    claims.push({ kind: "object", targetId: job.targetId });
  if (job.sourceId && !job.transfer)
    claims.push({ kind: "object", targetId: job.sourceId });
  if (job.plan?.partnerId)
    claims.push({ kind: "actor", targetId: job.plan.partnerId });
  claims.push(...transferClaims(job));
  claims.push(...productionClaims(job));
  return claims;
}

function constructionReadyForAssignment(job) {
  const elements = job.plan?.constructionWork?.elements ?? [];
  const focus = elements.length ? constructionFocusElements(job) : elements;
  return (
    !elements.some((element) => element.status !== "complete") ||
    focus.some(
      (element) =>
        element.materialDelivered &&
        element.status !== "complete" &&
        !element.clearanceBlocked,
    )
  );
}

function jobSkill(job) {
  if (job.plan?.skills?.length) return job.plan.skills[0];
  if (job.plan?.constructionDelivery || job.transfer) return "logistics";
  if (job.plan?.construction || job.plan?.projectAssist) return "construction";
  if (job.plan?.constructionSurvey) return "construction";
  return WORK_SKILLS.get(job.jobType) ?? job.jobType;
}

function inputSupplyReady(state, input) {
  if (input.requiresPickup && input.consume && input.deliveredQuantity != null)
    return input.deliveredQuantity >= input.quantity;
  if ((input.carriedQuantity ?? 0) >= input.quantity) return true;
  const source = stockpile(state, input.stockpileId);
  return (
    source && source.quantity >= input.quantity + (input.minimumRemaining ?? 0)
  );
}

function jobResourceBlocker(state, job) {
  if (job.plan?.construction || job.plan?.projectAssist) return null;
  if (job.plan?.constructionDelivery) {
    const source = stockpile(state, job.plan.sourceStockpileId);
    return source?.quantity >= (job.plan.deliveryQuantity ?? 1)
      ? null
      : "production_input_missing";
  }
  if (job.transfer) {
    const source = stockpile(state, job.transfer.sourceStockpileId);
    return source?.quantity >= job.transfer.quantity
      ? null
      : "cargo_unavailable";
  }
  if (!job.production) return null;
  return job.production?.inputs.every((input) => inputSupplyReady(state, input))
    ? null
    : "production_input_missing";
}

function queueJobReadiness(state, job) {
  if (["reserved", "active"].includes(job.status)) return "claimed";
  if (job.status === "suspended") return "suspended";
  if (job.status === "blocked") return "blocked";
  if (job.plan?.commissionSuspended || job.plan?.budgetBlocked)
    return "blocked";
  if (!constructionReadyForAssignment(job)) return "blocked";
  return jobResourceBlocker(state, job) ? "blocked" : "ready";
}

function resourceDependencyIds(state, job) {
  const stockpileIds = (job.production?.inputs ?? [])
    .filter((input) => !inputSupplyReady(state, input))
    .map((input) => input.stockpileId);
  return state.village.jobs
    .filter(
      (candidate) =>
        !["completed", "cancelled"].includes(candidate.status) &&
        ((candidate.plan?.parentJobId === job.id &&
          candidate.plan?.constructionDelivery) ||
          stockpileIds.includes(candidate.production?.output?.stockpileId) ||
          stockpileIds.includes(candidate.transfer?.targetStockpileId)),
    )
    .map((candidate) => candidate.id);
}

function resourceNeed(state, input) {
  const source = stockpile(state, input.stockpileId),
    delivered = input.deliveredQuantity ?? input.carriedQuantity ?? 0,
    available = source?.quantity ?? 0;
  return {
    itemKind: input.itemKind ?? source?.itemKind ?? "resource",
    required: input.quantity,
    delivered,
    available,
    missing: Math.max(0, input.quantity - delivered - available),
  };
}

function jobResourceNeeds(state, job, dependencyJobIds) {
  return (job.production?.inputs ?? [])
    .filter((input) => input.consume && !inputSupplyReady(state, input))
    .map((input) => ({
      ...resourceNeed(state, input),
      dependencyJobIds: [...dependencyJobIds],
    }));
}

function skillQueueJob(state, job) {
  const dependencyJobIds = resourceDependencyIds(state, job),
    statusBlocker = ["blocked", "suspended"].includes(job.status)
      ? (job.blockingReason ?? job.statusReason ?? job.status)
      : null;
  const blocker =
    statusBlocker ??
    jobResourceBlocker(state, job) ??
    (constructionReadyForAssignment(job) ? null : "work_not_ready");
  return {
    jobId: job.id,
    jobType: job.jobType,
    name: job.name,
    readiness: queueJobReadiness(state, job),
    blocker,
    priority: job.priority,
    dependencyJobIds,
    resourceNeeds: jobResourceNeeds(state, job, dependencyJobIds),
  };
}

function syncVillageSkillWorkQueues(state) {
  const open = state.village.jobs.filter(
    (job) => !["completed", "cancelled"].includes(job.status),
  );
  state.village.skillWorkQueues ??= {};
  for (const job of open) {
    const skill = jobSkill(job),
      registry = (state.village.skillWorkQueues[skill] ??= { skill });
    registry.jobs ??= [];
  }
  for (const registry of Object.values(state.village.skillWorkQueues)) {
    const jobs = open.filter((job) => jobSkill(job) === registry.skill);
    registry.jobIds = jobs.map((job) => job.id);
    registry.jobs = jobs.map((job) => skillQueueJob(state, job));
    registry.updatedAtTick = state.tick;
  }
}

function actorSkillPriority(state, actor, job) {
  if (job.jobType === "respond_danger") return -7;
  if (deferRecoveryForFoodCrew(state, actor, job)) return -4;
  if (
    job.plan?.lifeJob &&
    ["hunger", "fatigue", "safety"].includes(job.plan.need) &&
    actor.life?.needs?.[job.plan.need] <= SURVIVAL_WARNING_THRESHOLD
  )
    return -6;
  if (job.plan?.emergencyFoodDuty && !availableSurvivalFood(state)) return -5;
  if (job.plan?.emergencyFoodDuty) return -2;
  if (job.plan?.foodReserveDuty) return -1;
  if (GUARD_JOB_TYPES.has(job.jobType)) return 0;
  if (job.plan?.foundingSupplyCritical) return 0;
  if (job.plan?.animalCarcassDuty) return 0;
  if (job.plan?.civicMourning) return 0;
  if (job.plan?.lifeJob && actor.life?.scheduleBlock !== "work") return 0;
  return actor.skillPriorities?.[jobSkill(job)] ?? 5;
}

function activeEmergencyFoodCrew(state) {
  return new Set(
    state.village.jobs
      .filter(
        (job) =>
          job.plan?.emergencyFoodDuty &&
          ["reserved", "active"].includes(job.status),
      )
      .map((job) => job.assignedActorId)
      .filter(Boolean),
  ).size;
}

function readyEmergencyFoodWork(state, actor) {
  return state.village.jobs.some(
    (job) =>
      job.plan?.emergencyFoodDuty &&
      readyForSkillChoice(state, actor, job, { allowWorking: true }),
  );
}

function deferRecoveryForFoodCrew(state, actor, job) {
  if (availableSurvivalFood(state) || !job.plan?.lifeJob) return false;
  if (!["fatigue", "safety"].includes(job.plan.need)) return false;
  if (actor.life.needs[job.plan.need] <= SURVIVAL_DANGER_THRESHOLD)
    return false;
  if (requiredEmergencyFoodSpecialist(state, actor)) return true;
  if (activeEmergencyFoodCrew(state) >= FOUNDING_EMERGENCY_FOOD_CREW)
    return false;
  return readyEmergencyFoodWork(state, actor);
}

function requiredEmergencyFoodSpecialist(state, actor) {
  return state.village.jobs.some((job) => {
    if (job.status !== "available" || !job.plan?.emergencyFoodDuty)
      return false;
    const eligible = villageWorkActors(state).filter((candidate) =>
      actorCanPerform(candidate, job, { allowWorking: true }),
    );
    return eligible.length === 1 && eligible[0].id === actor.id;
  });
}

function readyForSkillChoice(state, actor, job, options = {}) {
  return (
    job.status === "available" &&
    (!job.plan?.ownerActorId || job.plan.ownerActorId === actor.id) &&
    !job.plan?.commissionSuspended &&
    !job.plan?.budgetBlocked &&
    constructionReadyForAssignment(job) &&
    !jobResourceBlocker(state, job) &&
    (job.nextAssignmentAtTick == null ||
      state.tick >= job.nextAssignmentAtTick) &&
    actorCanPerform(actor, job, options)
  );
}

function actorPrefersJobNow(state, actor, job) {
  const priority = actorSkillPriority(state, actor, job);
  return !state.village.jobs.some(
    (candidate) =>
      candidate.id !== job.id &&
      readyForSkillChoice(state, actor, candidate) &&
      actorSkillPriority(state, actor, candidate) < priority,
  );
}

function assignmentActors(state, job) {
  const actors = job.plan?.ownerActorId
      ? villageWorkActors(state).filter(
          (actor) => actor.id === job.plan.ownerActorId,
        )
      : villageWorkActors(state),
    eligible = actors.filter(
      (actor) => !protectedFarmSpecialist(state, actor, job),
    );
  return {
    available: eligible.filter(
      (actor) =>
        actorCanPerform(actor, job) && actorPrefersJobNow(state, actor, job),
    ),
    working: eligible.filter((actor) =>
      actorCanPerform(actor, job, { allowWorking: true }),
    ),
  };
}

export function villageAssignmentAudit(state, jobId) {
  const job = state.village.jobs.find((candidate) => candidate.id === jobId);
  if (!job) return null;
  return villageWorkActors(state).map((actor) => {
    const competing = state.village.jobs.filter(
      (candidate) =>
        candidate.id !== job.id &&
        readyForSkillChoice(state, actor, candidate) &&
        actorSkillPriority(state, actor, candidate) <
          actorSkillPriority(state, actor, job),
    );
    return {
      actorId: actor.id,
      actorName: actorName(actor),
      workState: actor.workState,
      canPerform: actorCanPerform(actor, job),
      skillPriority: actorSkillPriority(state, actor, job),
      preferredNow: actorPrefersJobNow(state, actor, job),
      competingJobIds: competing.map((candidate) => candidate.id),
      competingJobTypes: competing.map((candidate) => candidate.jobType),
    };
  });
}

function ordinaryWorkRests(job) {
  return (
    !job.plan?.lifeJob &&
    !job.plan?.emergencyFoodDuty &&
    !GUARD_JOB_TYPES.has(job.jobType)
  );
}

function blockAssignment(state, job, reason, events, retry = true) {
  transitionJob(job, "blocked", state.tick, reason);
  if (retry) {
    job.retryCount = (job.retryCount ?? 0) + 1;
    job.nextRetryAtTick = state.tick + blockedRetryDelay(job, reason);
  }
  events.push(jobEvent(state, "job_blocked", job, { reason }));
}

function assignmentChoice(state, job, actors, terrainAt) {
  const routes = new Map(),
    choice = chooseAssignment(
      job,
      actors,
      (actor) => {
        if (!routes.has(actor.id))
          routes.set(
            actor.id,
            routeForAssignment(state, actor, job, terrainAt),
          );
        return routes.get(actor.id);
      },
      job.plan?.parallelProduction
        ? (actor) => actor.personKey ?? actor.id
        : (actor) => actor.id,
    );
  const failure = actors
    .map((actor) => routes.get(actor.id))
    .find((route) => route && !route.ok)?.reason;
  return { choice, failure };
}

function claimProjectAssistElement(state, job) {
  if (!job.plan?.projectAssist) return;
  const parent = state.village.jobs.find(
      (candidate) => candidate.id === job.plan.parentJobId,
    ),
    element = parent?.plan?.constructionWork?.elements.find(
      (candidate) => candidate.key === job.plan.constructionElementKey,
    );
  if (element) element.claimedByAssistJobId = job.id;
}

function releaseProjectAssistClaim(state, job) {
  if (!job.plan?.projectAssist) return;
  const parent = state.village.jobs.find(
      (candidate) => candidate.id === job.plan.parentJobId,
    ),
    element = parent?.plan?.constructionWork?.elements.find(
      (candidate) => candidate.key === job.plan.constructionElementKey,
    );
  if (element?.claimedByAssistJobId === job.id)
    delete element.claimedByAssistJobId;
}

function reserveAssignment(state, job, choice, events) {
  const reserved = reserveAll(
    state,
    job,
    jobClaims(job, choice.route.destination, choice.actor.id),
  );
  if (!reserved.ok) {
    if (reserved.reason === "resource_reserved")
      job.nextAssignmentAtTick = state.tick + 2;
    else blockAssignment(state, job, reserved.reason, events, false);
    return false;
  }
  job.assignedActorId = choice.actor.id;
  job.nextAssignmentAtTick = null;
  job.destination = { ...choice.route.destination };
  cacheJobRoute(job, choice.route);
  claimProjectAssistElement(state, job);
  choice.actor.workState = "working";
  transitionJob(job, "reserved", state.tick);
  events.push(jobEvent(state, "job_reserved", job));
  return true;
}

function assignJob(state, job, terrainAt, events) {
  if (state.village.clock.block === "rest" && ordinaryWorkRests(job)) return;
  if (!constructionReadyForAssignment(job)) return;
  if (jobResourceBlocker(state, job)) return;
  const { available, working } = assignmentActors(state, job);
  if (!available.length) {
    if (working.length) {
      job.nextAssignmentAtTick = state.tick + 2;
      return;
    }
    blockAssignment(state, job, "no_eligible_actor", events);
    return;
  }
  const { choice, failure } = assignmentChoice(
    state,
    job,
    available,
    terrainAt,
  );
  if (!choice) {
    blockAssignment(state, job, failure ?? "no_eligible_actor", events);
    return;
  }
  reserveAssignment(state, job, choice, events);
}

function activateJob(state, job, events) {
  transitionJob(job, "active", state.tick);
  const actor = villageWorkActor(state, job.assignedActorId);
  const action = {
    deliver_goods: "Walking to the stable supply cart",
    patrol_route: "Patrolling the market road",
    investigate_crime: "Walking to reported property damage",
    respond_danger: "Responding to immediate danger",
    craft_weapon: "Walking to the forge",
    brew_remedy: "Walking to the mixing table",
    craft_armor: "Walking to the fitting table",
    prepare_meal: "Walking to the inn kitchen",
    build_campfire: "Walking to prepare the founding fire",
    catch_fish: "Walking to the river jetty",
    haul_stock: "Walking to collect the river catch",
    tend_stable: "Walking to the horse stalls",
    deliver_message: "Walking to the town notice board",
    tend_wounded: "Walking to treat a wounded traveler",
    eat_meal: "Walking to a meal at the Lantern",
    sleep: "Walking to a bed at the Lantern",
    seek_safety: "Walking to shelter at the chapel",
    socialize: "Walking to meet a neighbor",
    worship: "Walking to the road altar",
    govern_village: "Walking to the founding strategy table",
  }[job.jobType];
  actor.currentAction = action ?? job.name;
  actor.actionReason = job.reason;
  if (actor.actorKind === "companion") actor.objective = job.jobType;
  if (GUARD_JOB_TYPES.has(job.jobType)) actor.objective = "protect_town";
  events.push(jobEvent(state, "job_started", job));
}

function blockActiveJob(state, job, reason, events) {
  transitionJob(job, "blocked", state.tick, reason);
  job.retryCount = (job.retryCount ?? 0) + 1;
  job.nextRetryAtTick = state.tick + blockedRetryDelay(job, reason);
  const actor = villageWorkActor(state, job.assignedActorId);
  if (actor) {
    actor.currentAction = `Blocked: ${reason.replaceAll("_", " ")}`;
    actor.actionReason = "job_blocked";
  }
  events.push(jobEvent(state, "job_blocked", job, { reason }));
  if (
    [
      "production_input_missing",
      "construction_material_pending",
      "field_visibility_clearance_pending",
    ].includes(reason) &&
    (job.plan?.construction || job.plan?.constructionDelivery) &&
    !remoteTravelPlan(job)?.pioneerCamp
  ) {
    releaseBlockedWorkActor(state, job, actor, reason, events);
  } else if (reason === "production_output_full" && job.production) {
    releaseBlockedWorkActor(state, job, actor, reason, events);
  }
}

function releaseBlockedWorkActor(state, job, actor, reason, events) {
  if (actor && reusableProductionInput(job)) {
    returnReusableInputs(state, job, actor, events);
    job.plan.step = "to_input";
  }
  releaseJobReservations(state, job.id, reason);
  if (actor) actor.workState = "available";
  if (job.plan?.constructionSurvey) delete job.plan.ownerActorId;
  job.assignedActorId = null;
  job.destination = null;
  delete job.plan.cachedPath;
}

function practiceWorkSkill(state, job, actor, events) {
  const skill = job.plan?.skills?.[0] ?? WORK_SKILLS.get(job.jobType);
  if (!skill) return;
  actor.skills ??= {};
  actor.skillPractice ??= {};
  const rank = actor.skills[skill] ?? 0,
    gained = Math.max(1, job.plan?.practiceUnits ?? job.progress.total),
    total = (actor.skillPractice[skill] ?? 0) + gained,
    threshold = (rank + 1) * 10;
  actor.skillPractice[skill] = total;
  events.push(
    jobEvent(state, "resident_skill_practiced", job, { skill, gained, total }),
  );
  if (total < threshold) return;
  actor.skills[skill] = rank + 1;
  actor.skillPractice[skill] = total - threshold;
  events.push(
    jobEvent(state, "resident_skill_improved", job, {
      skill,
      rank: actor.skills[skill],
    }),
  );
}

function completeJob(state, job, actor, events) {
  job.progress.completed = job.progress.total;
  practiceWorkSkill(state, job, actor, events);
  transitionJob(job, "completed", state.tick);
  releaseJobReservations(state, job.id, "job_completed");
  actor.workState = "available";
  actor.lastJobType = job.jobType;
  actor.lastCompletedWork = {
    jobId: job.id,
    jobType: job.jobType,
    name: job.name,
    tick: state.tick,
    position: { ...actor.position },
  };
  actor.currentAction = "Available for work";
  actor.actionReason = "job_completed";
  job.retryCount = 0;
  job.nextRetryAtTick = null;
  events.push(jobEvent(state, "job_completed", job));
}

function completeInspection(state, job, actor, context, events) {
  context.executeInteraction(
    {
      actorId: actor.id,
      objectId: job.targetId,
      action: "examine",
      ...job.targetPosition,
    },
    events,
  );
  completeJob(state, job, actor, events);
}

function stockpile(state, id) {
  return state.village.stockpiles.find((candidate) => candidate.id === id);
}

function loadDelivery(state, job, actor, events) {
  const source = stockpile(state, job.transfer.sourceStockpileId),
    quantity = job.transfer.quantity;
  if (!source || source.quantity < quantity)
    return blockActiveJob(state, job, "cargo_unavailable", events);
  if (job.transfer.carriedQuantity > 0) return;
  if (FOOD_ITEM_KINDS.has(source.itemKind))
    job.plan.foodCargo = withdrawFood(state, source.id, quantity, {
      type: "food_loaded",
      jobId: job.id,
      actorId: actor.id,
    });
  source.quantity -= quantity;
  job.transfer.carriedQuantity = quantity;
  actor.carriedItem = {
    itemKind: job.transfer.itemKind,
    name: job.transfer.cargoName,
    quantity,
  };
  job.plan.step = "to_destination";
  job.progress.completed = 1;
  job.destination = {
    ...(job.plan.storageDestination?.position ?? job.targetPosition),
  };
  actor.currentAction = `Carrying ${job.transfer.cargoName.toLowerCase()} to ${stockpile(state, job.transfer.targetStockpileId).name.toLowerCase()}`;
  actor.actionReason = "delivery_loaded";
  events.push(
    jobEvent(state, "cargo_loaded", job, {
      quantity,
      cargoName: job.transfer.cargoName,
      sourceRemaining: source.quantity,
    }),
  );
}

function unloadDelivery(state, job, actor, events) {
  const target = stockpile(state, job.transfer.targetStockpileId),
    quantity = job.transfer.carriedQuantity;
  if (!target) return blockActiveJob(state, job, "stockpile_missing", events);
  if (quantity < 1) return blockActiveJob(state, job, "cargo_missing", events);
  if (storageAvailableFor(state, target.id, job.id) < quantity)
    return blockActiveJob(state, job, "destination_full", events);
  if (job.plan.foodCargo?.length)
    depositFood(state, target.id, job.transfer.itemKind, job.plan.foodCargo, {
      type: "food_stored",
      jobId: job.id,
      actorId: actor.id,
    });
  target.quantity += quantity;
  job.transfer.carriedQuantity = 0;
  actor.carriedItem = null;
  events.push(
    jobEvent(state, "cargo_delivered", job, {
      quantity,
      cargoName: job.transfer.cargoName,
      destinationQuantity: target.quantity,
    }),
  );
  completeJob(state, job, actor, events);
}

function productionInputsAvailable(state, production) {
  return production.inputs.every((input) => {
    if (input.requiresPickup)
      return input.consume && input.deliveredQuantity != null
        ? input.deliveredQuantity >= input.quantity
        : input.carriedQuantity >= input.quantity;
    const source = stockpile(state, input.stockpileId);
    return (
      source &&
      source.quantity >= input.quantity + (input.minimumRemaining ?? 0)
    );
  });
}

function consumeProductionInputs(state, job) {
  for (const input of job.production.inputs) {
    if (input.consume === false || input.requiresPickup) continue;
    const source = stockpile(state, input.stockpileId);
    if (FOOD_ITEM_KINDS.has(source?.itemKind)) {
      const portions = withdrawFood(state, source.id, input.quantity, {
        type: "food_transformed",
        jobId: job.id,
        actorId: job.assignedActorId,
      });
      job.plan.foodInputBatchIds ??= [];
      job.plan.foodInputBatchIds.push(
        ...portions.map((portion) => portion.batchId),
      );
    }
    source.quantity -= input.quantity;
  }
  for (const input of job.production.inputs)
    if (input.consume !== false && input.requiresPickup)
      input.carriedQuantity = 0;
}

function beginProduction(state, job, events) {
  const production = job.production,
    output = production.output
      ? stockpile(state, production.output.stockpileId)
      : null;
  if (production.inputConsumed) return true;
  if (!productionInputsAvailable(state, production)) {
    blockActiveJob(state, job, "production_input_missing", events);
    return false;
  }
  if (
    production.output &&
    (!output ||
      storageAvailableFor(state, output.id, job.id) <
        production.output.quantity)
  ) {
    blockActiveJob(state, job, "production_output_full", events);
    return false;
  }
  consumeProductionInputs(state, job);
  production.inputConsumed = true;
  events.push(jobEvent(state, "production_started", job));
  return true;
}

function beginConstructionProduction(state, job, events) {
  if (job.production.inputConsumed) return true;
  const supportInputs = job.production.inputs.filter(
    (input) => !(input.consume && input.requiresPickup),
  );
  const ready = supportInputs.every((input) => {
    if (input.requiresPickup) return input.carriedQuantity >= input.quantity;
    const source = stockpile(state, input.stockpileId);
    return source && source.quantity >= input.quantity;
  });
  if (!ready)
    return blockActiveJob(state, job, "production_input_missing", events);
  for (const input of supportInputs)
    if (input.consume && !input.requiresPickup)
      stockpile(state, input.stockpileId).quantity -= input.quantity;
  job.production.inputConsumed = true;
  events.push(jobEvent(state, "production_started", job));
  return true;
}

function collectFoodInput(state, job, actor, source, input, quantity) {
  if (!input.consume || !FOOD_ITEM_KINDS.has(source.itemKind)) return;
  const portions = withdrawFood(state, source.id, quantity, {
    type: "food_collected_for_transformation",
    jobId: job.id,
    actorId: actor.id,
  });
  job.plan.foodInputBatchIds ??= [];
  job.plan.foodInputBatchIds.push(
    ...portions.map((portion) => portion.batchId),
  );
  job.plan.foodInputCargo ??= [];
  job.plan.foodInputCargo.push({
    stockpileId: source.id,
    itemKind: source.itemKind,
    portions,
  });
}

function productionCarryQuantity(job, input) {
  if (!job.plan?.construction || !input.consume) return input.quantity;
  const element = nextConstructionMaterialElement(job),
    remaining = element
      ? element.materialRequired - element.materialDeliveredQuantity
      : input.quantity;
  return Math.min(CONSTRUCTION_CARRY_UNITS, remaining);
}

function collectProductionInput(state, job, actor, events) {
  const input = uncollectedProductionInput(job),
    source = input && stockpile(state, input.stockpileId);
  if (!input) {
    job.plan.step = "to_target";
    return;
  }
  const quantity = productionCarryQuantity(job, input);
  if (!source || source.quantity < quantity)
    return blockActiveJob(state, job, "production_input_missing", events);
  collectFoodInput(state, job, actor, source, input, quantity);
  source.quantity -= quantity;
  input.carriedQuantity = quantity;
  actor.carriedItem = {
    itemKind: input.itemKind,
    name: input.name,
    quantity,
  };
  job.plan.step =
    job.plan?.construction && input.consume
      ? "to_target"
      : uncollectedProductionInput(job)
        ? "to_input"
        : "to_target";
  delete job.plan.cachedPath;
  actor.currentAction = `Carrying ${input.name.toLowerCase()} to ${job.name.toLowerCase()}`;
  events.push(
    jobEvent(state, "production_input_collected", job, {
      itemKind: input.itemKind,
      quantity,
    }),
  );
}

// function-length-exempt: template -- construction input event projection
function constructionInputDetails(input, element, position, material) {
  return {
    itemKind: input.itemKind,
    delivered: input.deliveredQuantity,
    required: input.quantity,
    elementKey: element.key,
    elementDelivered: element.materialDeliveredQuantity,
    elementRequired: element.materialRequired,
    position: { ...position },
    materialEntityIds: [material.id],
  };
}

function deliverConstructionInput(job, actor, events, state) {
  const input = job.production.inputs.find(
    (candidate) => candidate.consume && candidate.carriedQuantity > 0,
  );
  if (!input) return false;
  const element = nextConstructionMaterialElement(job),
    deliveryPosition = element?.position ?? job.targetPosition;
  if (!element) return false;
  const quantity = input.carriedQuantity;
  element.materialDeliveredQuantity += quantity;
  element.materialDelivered =
    element.materialDeliveredQuantity >= element.materialRequired;
  input.deliveredQuantity = (input.deliveredQuantity ?? 0) + quantity;
  input.carriedQuantity = 0;
  actor.carriedItem = null;
  const material = recordConstructionMaterial(
    state,
    job,
    element,
    input,
    quantity,
  );
  events.push(
    jobEvent(
      state,
      "construction_material_delivered",
      job,
      constructionInputDetails(input, element, deliveryPosition, material),
    ),
  );
  job.plan.activeConstructionElementKey = element.key;
  job.plan.step = element.materialDelivered ? "produce" : "to_input";
  delete job.plan.cachedPath;
  return true;
}

function constructionDeliveryParent(state, job) {
  return state.village.jobs.find(
    (candidate) => candidate.id === job.plan?.parentJobId,
  );
}

function constructionDeliveryElement(parent, job) {
  return parent?.plan?.constructionWork?.elements.find(
    (element) => element.key === job.plan?.constructionElementKey,
  );
}

function cancelRedundantDelivery(
  state,
  job,
  actor,
  parent,
  element,
  source,
  events,
) {
  const returned = job.plan.carriedQuantity ?? 0;
  source.quantity += returned;
  job.plan.carriedQuantity = 0;
  actor.carriedItem = null;
  delete element.claimedByDeliveryJobId;
  cancelJob(state, job, "construction_element_supplied");
  actor.workState = "available";
  return events.push(
    jobEvent(state, "job_cancelled", job, {
      reason: "construction_element_supplied",
      returnedQuantity: returned,
    }),
  );
}

function collectConstructionDelivery(
  state,
  job,
  actor,
  parent,
  element,
  input,
  source,
  events,
) {
  const quantity = job.plan.deliveryQuantity ?? 1;
  if (source.quantity < quantity)
    return blockActiveJob(state, job, "production_input_missing", events);
  source.quantity -= quantity;
  job.plan.carriedQuantity = quantity;
  job.plan.step = "to_target";
  job.destination = constructionElementWorkPosition(parent, element);
  actor.carriedItem = { itemKind: input.itemKind, name: input.name, quantity };
  actor.currentAction = `Carrying ${input.name.toLowerCase()} to ${element.kind}`;
  delete job.plan.cachedPath;
  return events.push(
    jobEvent(state, "construction_material_collected", parent, {
      elementKey: element.key,
      workerId: actor.id,
      workerName: actorName(actor),
    }),
  );
}

// function-length-exempt: template -- construction delivery event projection
function constructionDeliveryDetails(element, input, actor, material) {
  return {
    elementKey: element.key,
    elementDelivered: element.materialDeliveredQuantity,
    elementRequired: element.materialRequired,
    delivered: input.deliveredQuantity,
    required: input.quantity,
    position: { ...element.position },
    workerId: actor.id,
    workerName: actorName(actor),
    materialEntityIds: [material.id],
  };
}

function finishConstructionDelivery(
  state,
  job,
  actor,
  parent,
  element,
  input,
  events,
) {
  const quantity = job.plan.carriedQuantity,
    material = recordConstructionMaterial(
      state,
      parent,
      element,
      input,
      quantity,
    );
  element.materialDeliveredQuantity += quantity;
  element.materialDelivered =
    element.materialDeliveredQuantity >= element.materialRequired;
  input.deliveredQuantity = (input.deliveredQuantity ?? 0) + quantity;
  job.plan.carriedQuantity = 0;
  actor.carriedItem = null;
  delete element.claimedByDeliveryJobId;
  events.push(
    jobEvent(
      state,
      "construction_material_delivered",
      parent,
      constructionDeliveryDetails(element, input, actor, material),
    ),
  );
  completeJob(state, job, actor, events);
}

function advanceConstructionDelivery(state, job, actor, events) {
  const parent = constructionDeliveryParent(state, job),
    element = constructionDeliveryElement(parent, job),
    input = parent && constructionMaterialInput(parent, element),
    source = input && stockpile(state, input.stockpileId);
  if (!parent || !element || !input || !source)
    return blockActiveJob(state, job, "construction_target_missing", events);
  if (element.materialDelivered || element.status === "complete")
    return cancelRedundantDelivery(
      state,
      job,
      actor,
      parent,
      element,
      source,
      events,
    );
  if (job.plan.step === "to_source")
    return collectConstructionDelivery(
      state,
      job,
      actor,
      parent,
      element,
      input,
      source,
      events,
    );
  finishConstructionDelivery(state, job, actor, parent, element, input, events);
}

function returnReusableInputs(state, job, actor, events) {
  for (const input of job.production.inputs) {
    if (input.consume !== false || input.carriedQuantity <= 0) continue;
    const source = stockpile(state, input.stockpileId);
    if (source) source.quantity += input.carriedQuantity;
    events.push(
      jobEvent(state, "production_tool_returned", job, {
        itemKind: input.itemKind,
        quantity: input.carriedQuantity,
      }),
    );
    input.carriedQuantity = 0;
  }
  actor.carriedItem = null;
}

// function-length-exempt: template -- authored household fixture materialization
function houseFixture(state, building, fixture) {
  const names = {
      bed: "Single bed",
      chair: "Household chair",
      anvil: "Smithing anvil",
      forge: "Stone forge",
      fuel_storage: "Forge fuel store",
      kitchen: "Household stew hearth",
      lumber_rack: "Finished-lumber rack",
      material_storage: "Smithing material store",
      sawbench: "Timber sawbench",
      storage: "Empty household shelves",
      table: "Household table",
      tool_rack: "Carpentry tool rack",
      workbench: "Smithing workbench",
    },
    position = { x: building.x + fixture.x, y: building.y + fixture.y },
    name =
      names[fixture.role] ??
      String(fixture.role ?? "built fixture")
        .replaceAll("_", " ")
        .replace(/^./, (letter) => letter.toUpperCase());
  return {
    id: namedUuid(state.id, `${building.key}:fixture:${fixture.key}`),
    definitionId: definitionId("house-fixture", fixture.role),
    entityType: "world-object",
    x: position.x,
    y: position.y,
    width: fixture.width,
    height: fixture.height,
    glyph: fixture.role === "bed" ? "b" : "F",
    name,
    description:
      fixture.role === "storage"
        ? "Newly built shelves stand empty until the household stores supplies."
        : `A material-backed ${name.toLowerCase()} belongs to this building.`,
    role: fixture.role,
    bedType: fixture.bedType,
    sleepingCapacity: fixture.sleepingCapacity,
    providesShelter: fixture.providesShelter ?? false,
    walkable: fixture.role === "bed" || fixture.walkable === true,
    buildingId: building.id,
  };
}

function constructionMaterial(job, element) {
  if (element.material) return element.material;
  if (element.kind === "door")
    return job.plan.construction.door.material ?? "wood";
  return job.plan.construction.wallMaterial ?? "timber";
}

function permanentFixture(state, job, element) {
  const buildingId = namedUuid(
      state.id,
      `building:${job.plan.construction.key}`,
    ),
    fixture = houseFixture(
      state,
      { id: buildingId, key: job.plan.construction.key, x: 0, y: 0 },
      {
        key: element.fixtureKey ?? element.key,
        role: element.role ?? element.fixtureVariant,
        bedType: element.bedType,
        sleepingCapacity: element.sleepingCapacity,
        providesShelter: element.providesShelter,
        x: element.position.x,
        y: element.position.y,
        width: element.width ?? 1,
        height: element.height ?? 1,
      },
    );
  return {
    ...fixture,
    id: element.id,
    x: element.position.x,
    y: element.position.y,
  };
}

// function-length-exempt: template -- physical construction entity materialization
function materializeConstructionElement(state, job, element) {
  const site = job.plan.construction,
    material = constructionMaterial(job, element);
  clearStumpsUnderElement(state, element);
  state.village.constructionPrimitives ??= [];
  if (element.kind === "fixture") {
    if (!state.village.fixtures.some((fixture) => fixture.id === element.id))
      state.village.fixtures.push({
        ...permanentFixture(state, job, element),
        lifecycleState: "complete",
        condition: 100,
        maxCondition: 100,
        material: material,
        materialQuantity: element.materialRequired,
      });
    markVillageArchitectureDirty(state);
    return;
  }
  if (["door", "gate"].includes(element.kind)) {
    if (!state.village.doors.some((door) => door.id === element.id))
      state.village.doors.push({
        id: element.id,
        definitionId: definitionId(element.kind, material),
        entityType: element.kind,
        objectKind: element.kind,
        ...(element.kind === "door" ? { buildingKey: site.key } : {}),
        ...(element.pastureKey ? { pastureKey: element.pastureKey } : {}),
        x: element.position.x,
        y: element.position.y,
        material,
        state: "open",
        lifecycleState: "complete",
        condition: 100,
        maxCondition: 100,
        materialQuantity: element.materialRequired,
      });
    markVillageArchitectureDirty(state);
    return;
  }
  if (
    state.village.constructionPrimitives.some((item) => item.id === element.id)
  )
    return;
  state.village.constructionPrimitives.push({
    id: element.id,
    definitionId: definitionId(element.kind, material),
    entityType: element.kind,
    projectId: job.id,
    projectKey: site.key,
    kind: element.kind,
    material,
    state: "complete",
    lifecycleState: "complete",
    condition: 100,
    maxCondition: 100,
    materialQuantity: element.materialRequired,
    position: { ...element.position },
    width: element.width ?? 1,
    height: element.height ?? 1,
    pastureKey: element.pastureKey,
    boundaryProfile: element.boundaryProfile,
    heightFeet: element.heightFeet,
    supportIds: element.supportIds ? [...element.supportIds] : undefined,
  });
  markVillageArchitectureDirty(state);
}

function clearStumpsUnderElement(state, element) {
  const right = element.position.x + (element.width ?? 1),
    bottom = element.position.y + (element.height ?? 1);
  state.village.modifications = state.village.modifications.filter(
    (item) =>
      item.kind !== "tree_stump" ||
      item.x < element.position.x ||
      item.x >= right ||
      item.y < element.position.y ||
      item.y >= bottom,
  );
}

function emitArchitectureTransitions(state, job, transitions, events) {
  for (const facilityKey of transitions.facilitiesAdded)
    events.push(jobEvent(state, "facility_completed", job, { facilityKey }));
  for (const residence of transitions.residencesAdded)
    events.push(
      jobEvent(state, "residence_completed", job, {
        buildingId: residence.buildingId,
        residenceId: residence.id,
        residentCapacity: residence.residentCapacity,
        bedCapacity: residence.bedCapacity,
      }),
    );
  for (const facilityKey of transitions.facilitiesRemoved)
    events.push(jobEvent(state, "facility_lost", job, { facilityKey }));
  for (const residenceId of transitions.residencesRemoved)
    events.push(jobEvent(state, "residence_lost", job, { residenceId }));
}

function residentSurvivalScore(resident) {
  return ["hunger", "fatigue", "safety"].reduce(
    (total, need) => total + resident.life.needs[need],
    0,
  );
}

function occupyResidence(state, residence, fixtures, householdId = null) {
  const household = householdId
      ? state.village.households.find((entry) => entry.id === householdId)
      : null,
    members = new Set(household?.memberIds ?? []),
    residents = state.village.npcStates
      .filter(
        (resident) =>
          resident.housingStatus === "homeless" &&
          (!household || members.has(resident.id)),
      )
      .sort((left, right) => {
        const leftSurvival = residentSurvivalScore(left),
          rightSurvival = residentSurvivalScore(right);
        return (
          left.life.needs.safety - right.life.needs.safety ||
          leftSurvival - rightSurvival ||
          left.id.localeCompare(right.id)
        );
      })
      .slice(0, residence.residentCapacity),
    beds = fixtures.filter((fixture) => fixture.role === "bed");
  residence.occupantIds = residents.map((resident) => resident.id);
  residence.householdIds = [...new Set(residents.map((r) => r.householdId))];
  residence.bedCapacity = Math.min(residence.bedCapacity, beds.length);
  syncResidentHousing(state);
}

// function-length-exempt: template -- derived building compatibility projection
function syncDerivedConstructionBuilding(state, job) {
  const site = job.plan?.construction,
    elements = job.plan?.constructionWork?.elements ?? [],
    shell = elements.filter((element) =>
      ["wall", "door"].includes(element.kind),
    );
  if (
    !site ||
    !shell.length ||
    shell.some((item) => item.status !== "complete")
  )
    return null;
  const id = namedUuid(state.id, `building:${site.key}`),
    evidenceIds = shell.map((element) => element.id),
    existing = state.village.buildings.find((building) => building.id === id);
  if (existing) {
    existing.evidenceIds = evidenceIds;
    existing.status = "enclosed";
    return existing;
  }
  const building = {
    id,
    definitionId: definitionId("building", site.key),
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
    enclosures: structuredClone(site.enclosures ?? []),
    primitiveBacked: true,
    status: "enclosed",
    evidenceIds,
  };
  state.village.buildings.push(building);
  return building;
}

// function-length-exempt: template -- completed household materialization
function completeFounderHouse(state, job, events) {
  const index = job.plan.houseIndex;
  if (!job.plan.construction || state.village.residences.length > index) return;
  const plan = designHouse(job.plan.houseCapacity ?? 4),
    key = job.plan.construction.key,
    building = syncDerivedConstructionBuilding(state, job),
    fixtures = state.village.fixtures.filter(
      (fixture) => fixture.buildingId === building.id,
    ),
    residence = {
      id: namedUuid(state.id, `residence:${key}`),
      definitionId: definitionId("residence", "family_house"),
      entityType: "residence",
      buildingId: building.id,
      status: "complete",
      habitable: true,
      residentCapacity: plan.residentCapacity,
      bedCapacity: plan.assessment.sleepingCapacity,
      plannedHouseholdId: job.plan.targetHouseholdId ?? null,
      occupantIds: [],
      householdIds: [],
      evidenceIds: job.plan.constructionWork.elements.map(
        (element) => element.id,
      ),
      plan,
    };
  building.definitionId = definitionId("building", "family_house");
  building.status = "complete";
  const site = state.village.development?.constructionSites?.find(
    (candidate) => candidate.key === key,
  );
  if (site)
    Object.assign(site, {
      housingSurveyStatus: "built",
      completedAtTick: state.tick,
    });
  state.village.residences.push(residence);
  occupyResidence(state, residence, fixtures, job.plan.targetHouseholdId);
  if (
    state.village.npcStates.every(
      (resident) => resident.housingStatus === "housed",
    )
  )
    state.village.facilities.push("housing");
  events.push(
    jobEvent(state, "residence_completed", job, {
      buildingId: building.id,
      residenceId: residence.id,
      residentCapacity: residence.residentCapacity,
      bedCapacity: residence.bedCapacity,
    }),
  );
}

function recordFieldClearing(state, job, events) {
  const survey = state.village.development.masterPlan.fieldClearingSurveys.find(
    (candidate) => candidate.boundaryKey === job.plan?.fieldBoundaryKey,
  );
  if (!survey) return;
  survey.clearedTreeCount += 1;
  survey.clearedLogYield += job.production?.output?.quantity ?? 0;
  if (
    (survey.starterTreeCells ?? []).some(
      (tree) => key(tree) === key(job.targetPosition),
    )
  ) {
    survey.starterClearedTreeCount += 1;
    if (survey.starterClearedTreeCount >= survey.starterInitialTreeCount)
      Object.assign(survey, {
        starterStatus: "cleared",
        starterClearedAtTick: state.tick,
      });
  }
  if (survey.clearedTreeCount >= survey.initialTreeCount)
    Object.assign(survey, { status: "cleared", clearedAtTick: state.tick });
  releaseFieldFenceBlocks(state);
  events.push(
    jobEvent(state, "field_tree_cleared", job, {
      boundaryKey: survey.boundaryKey,
      logYield: job.production?.output?.quantity ?? 0,
    }),
  );
}

function applyForestryEffect(state, job, events) {
  if (!["tree_stump", "cleared_ground"].includes(job.plan?.terrainEffect))
    return;
  const position = job.targetPosition;
  if (
    !state.village.modifications.some(
      (entry) => entry.x === position.x && entry.y === position.y,
    )
  )
    state.village.modifications.push({
      id: namedUuid(state.id, `forestry:${position.x},${position.y}`),
      definitionId: definitionId("terrain-change", job.plan.terrainEffect),
      entityType: "terrain-change",
      kind: job.plan.terrainEffect,
      x: position.x,
      y: position.y,
      originalTile: "outdoor_tree",
      actorId: job.assignedActorId,
      createdAtTick: state.tick,
    });
  events.push(jobEvent(state, "tree_felled", job, { position }));
  const expansion = state.village.fieldExpansions?.find(
    (candidate) => candidate.key === job.plan?.fieldExpansionKey,
  );
  if (expansion) expansion.clearedTreeCount += 1;
  recordFieldClearing(state, job, events);
}

function recordDefenseFacility(state, job, facilityKey) {
  const facility =
    state.village.development?.masterPlan?.defenseStrategy?.facilities?.find(
      (candidate) => candidate.key === facilityKey,
    );
  if (!facility) return;
  Object.assign(facility, {
    status: "operating",
    commissionedAtTick: state.tick,
    buildingKey: job.plan?.construction?.key ?? facilityKey,
  });
}

function recordDefensePerimeter(state, job, facilityKey) {
  if (facilityKey !== "gatehouse") return;
  const elements = job.plan?.constructionWork?.elements.filter(
      (element) => element.enclosurePurpose === "defensive_perimeter",
    ),
    perimeter =
      state.village.development?.masterPlan?.defenseStrategy?.perimeter;
  if (!perimeter || !elements?.length) return;
  if (elements.some((element) => element.status !== "complete")) return;
  Object.assign(perimeter, {
    status: "physically_complete",
    completedAtTick: state.tick,
    elementIds: elements.map((element) => element.id),
    gateIds: elements
      .filter((element) => element.kind === "gate")
      .map((element) => element.id),
  });
}

function applyFacilityEffect(state, job, events) {
  const facilityKey = job.plan?.facilityKey;
  if (!facilityKey) return;
  recordDefenseFacility(state, job, facilityKey);
  recordDefensePerimeter(state, job, facilityKey);
  const project = state.village.development?.projects?.find(
    (candidate) => candidate.key === facilityKey,
  );
  if (project)
    Object.assign(project, { status: "complete", blockingReasons: [] });
  if (state.village.facilities.includes(facilityKey)) return;
  state.village.facilities.push(facilityKey);
  const building = ensureFoundingFacilityStructure(state, facilityKey),
    elements = job.plan?.constructionWork?.elements ?? [];
  if (building)
    Object.assign(building, {
      status: "complete",
      roofed: true,
      evidenceIds: elements.map((element) => element.id),
    });
  if (facilityKey === "stable")
    installAnimalHousingSites(state, job.plan?.construction, elements);
  ensureFoundingSleepingPlaces(state, events);
  for (const pasture of state.village.pastures ?? []) {
    const evidence = elements.filter(
      (element) => element.pastureKey === pasture.key,
    );
    if (evidence.length) pasture.evidenceIds = evidence.map((item) => item.id);
  }
  events.push(jobEvent(state, "facility_completed", job, { facilityKey }));
}

function applyFieldCampEffect(state, job, events) {
  const campId = job.plan?.regionalFieldCampId;
  if (!campId) return;
  const context = state.village.development.masterPlan.regionalContext,
    camp = context.fieldCamps.find((candidate) => candidate.id === campId),
    elements = job.plan.constructionWork.elements;
  if (!camp || camp.status === "operational") return;
  Object.assign(camp, {
    status: "built",
    buildingId: namedUuid(state.id, `building:${camp.constructionKey}`),
    evidenceIds: elements.map((element) => element.id),
    bedFixtureIds: elements
      .filter((element) => element.role === "bed")
      .map((element) => element.id),
    cacheFixtureId:
      elements.find((element) => element.role === "storage")?.id ?? null,
    completedAtTick: state.tick,
  });
  events.push(
    jobEvent(state, "regional_field_camp_built", job, {
      fieldCampId: camp.id,
      position: camp.position,
    }),
  );
}

function applyFieldCampSupplyEffect(state, job, events) {
  const campId = job.plan?.fieldCampSupplyId;
  if (!campId) return;
  const context = state.village.development.masterPlan.regionalContext,
    camp = context.fieldCamps.find((candidate) => candidate.id === campId),
    delivered = job.production.inputs.find((input) => input.consume)?.quantity;
  if (!camp || !["built", "operational"].includes(camp.status) || !delivered)
    return;
  camp.foodUnits = (camp.foodUnits ?? 0) + delivered;
  camp.status = "operational";
  camp.provisionedAtTick = state.tick;
  events.push(
    jobEvent(state, "regional_field_camp_completed", job, {
      fieldCampId: camp.id,
      foodUnits: camp.foodUnits,
    }),
  );
}

function geologyPlanContext(state) {
  return state.village.development.masterPlan.regionalContext;
}

function geologyGlobalPosition(state, local) {
  const origin = geologyPlanContext(state).site.origin;
  return { x: origin.x + local.x, y: origin.y + local.y };
}

function applyProspectingEffect(state, job, events) {
  if (job.plan?.geologyAction !== "prospect") return;
  const knowledge = geologyPlanContext(state).geologyKnowledge,
    global = geologyGlobalPosition(state, job.targetPosition),
    mode = geologyPlanContext(state).site.mode,
    depositKind = regionalGeology(state.seed, global.x, global.y, mode);
  if (
    !depositKind ||
    knowledge.revealedDeposits.some(
      (item) => item.x === global.x && item.y === global.y,
    )
  )
    return;
  knowledge.revealedDeposits.push({
    id: namedUuid(state.id, `geology:${global.x},${global.y}`),
    ...global,
    depositKind,
    remainingUnits: 3,
    revealedAtTick: state.tick,
    revealedByActorId: job.assignedActorId,
  });
  knowledge.status = "partially_surveyed";
  events.push(jobEvent(state, "geology_prospected", job, { depositKind }));
}

const FOUNDING_QUARRY_CELL_QUOTA = 8;

function exhaustGeologyDeposit(knowledge, deposit) {
  deposit.remainingUnits = 0;
  knowledge.status = "partially_surveyed";
}

function recordQuarriedRock(state, job, global) {
  if (
    state.village.modifications.some(
      (item) =>
        item.x === job.targetPosition.x && item.y === job.targetPosition.y,
    )
  )
    return;
  state.village.modifications.push({
    id: namedUuid(state.id, `quarry:${global.x},${global.y}`),
    entityType: "terrain-change",
    kind: "quarried_rock",
    ...job.targetPosition,
    originalTile: "outdoor_rock",
    actorId: job.assignedActorId,
    createdAtTick: state.tick,
  });
  const knowledge = geologyPlanContext(state).geologyKnowledge;
  if (foundingQuarryCells(state) >= FOUNDING_QUARRY_CELL_QUOTA) {
    knowledge.foundingStoneExhausted = true;
    knowledge.status = "founding_quarry_complete";
  }
}

function applyQuarryEffect(state, job, events) {
  if (job.plan?.geologyAction !== "quarry") return;
  const global = geologyGlobalPosition(state, job.targetPosition),
    knowledge = geologyPlanContext(state).geologyKnowledge,
    deposit = knowledge.revealedDeposits.find(
      (item) => item.x === global.x && item.y === global.y,
    );
  if (!deposit || deposit.remainingUnits <= 0) return;
  exhaustGeologyDeposit(knowledge, deposit);
  recordQuarriedRock(state, job, global);
  const type = oreOutputKey(deposit.depositKind)
    ? "ore_mined"
    : "stone_quarried";
  events.push(
    jobEvent(state, type, job, {
      depositKind: deposit.depositKind,
      quantity: job.production?.output?.quantity ?? 3,
    }),
  );
}

function applyProductionWorldEffect(state, job, events) {
  applyForestryEffect(state, job, events);
  applyFacilityEffect(state, job, events);
  applyFieldCampEffect(state, job, events);
  applyFieldCampSupplyEffect(state, job, events);
  applyProspectingEffect(state, job, events);
  applyQuarryEffect(state, job, events);
  if (job.plan?.buildHouse) completeFounderHouse(state, job, events);
}

function constructionFactSummary(state, job) {
  const ids = new Set([
      ...(state.village.constructionPrimitives ?? []).map((item) => item.id),
      ...state.village.fixtures.map((item) => item.id),
      ...state.village.doors.map((item) => item.id),
    ]),
    elements = job.plan?.constructionWork?.elements ?? [],
    permanent = elements.filter((element) => ids.has(element.id)),
    shell = elements.filter((element) =>
      ["wall", "door"].includes(element.kind),
    ),
    roofs = elements.filter((element) => element.kind === "roof"),
    roofed =
      shell.length === 0 ||
      (roofs.length > 0 &&
        roofs.every(
          (roof) =>
            ids.has(roof.id) &&
            roof.supportIds?.length > 0 &&
            roof.supportIds.every((id) => ids.has(id)),
        ));
  return {
    expected: elements.length,
    permanent: permanent.length,
    roofRequired: shell.length > 0,
    roofed,
    complete:
      elements.length > 0 &&
      permanent.length === elements.length &&
      roofed &&
      elements.every((element) => element.status === "complete"),
  };
}

function holdForFinalInspection(state, job, actor, events) {
  if (!job.plan?.specialistFacility) return false;
  if (job.plan.commissioning?.status === "approved") return false;
  job.plan.commissioning ??= {
    status: "architect_pending",
    cycle: 1,
    physicalCompletedAtTick: state.tick,
    repairEntityIds: [],
  };
  transitionJob(job, "blocked", state.tick, "awaiting_final_inspection");
  releaseJobReservations(state, job.id, "awaiting_final_inspection");
  job.assignedActorId = null;
  actor.workState = "available";
  actor.currentAction = "Awaiting final facility inspection";
  actor.actionReason = "commissioning_inspection_pending";
  events.push(jobEvent(state, "facility_commissioning_started", job));
  return true;
}

function cropHarvestQuantity(job, actor, plot) {
  const base =
      job.plan?.wholePlotOutputQuantity ?? job.production.output.quantity,
    skill = actor?.skills?.farming ?? 0,
    skillFactor = Math.min(1.25, 0.8 + skill * 0.05),
    fertilityFactor = Math.max(0.25, Math.min(1.25, plot.fertility / 60)),
    healthFactor = Math.max(0.1, 1 - (plot.cropDamage ?? 0) / 100);
  return Math.max(
    1,
    Math.floor(base * skillFactor * fertilityFactor * healthFactor),
  );
}

function productionOutputQuantity(job, actor, plot) {
  if (job.plan?.cropAction !== "harvest") return job.production.output.quantity;
  const harvest = cropHarvestQuantity(job, actor, plot),
    cells = plot?.workQueue?.cells.length ?? 1;
  return job.plan?.cropCellKey ? harvest / cells : harvest;
}

function productionFoodOrigin(job, plot) {
  const cropHarvest = job.plan?.cropAction === "harvest";
  return {
    originType: cropHarvest
      ? "crop_harvest"
      : job.plan?.foragePatchId
        ? "foraging"
        : job.plan?.animalEffect === "hunt"
          ? "hunting"
          : "production",
    originId: plot?.id ?? job.plan?.foragePatchId ?? job.id,
    sourceBatchIds: cropHarvest
      ? (plot?.seedBatchIds ?? [])
      : (job.plan?.foodInputBatchIds ?? []),
  };
}

function recordCropYield(job, actor, plot, quantity) {
  job.production.output.quantity = quantity;
  if (!plot || job.plan?.cropAction !== "harvest") return;
  plot.lastYield = quantity;
  plot.lastFarmerId = actor?.id ?? null;
  plot.lastFarmerSkill = actor?.skills?.farming ?? 0;
}

function createProductionOutput(state, job, actor) {
  const output = job.production.output
    ? stockpile(state, job.production.output.stockpileId)
    : null;
  if (!output || job.production.outputCreated) return output;
  const plot = state.village.cropPlots?.find(
      (candidate) => candidate.id === job.plan?.cropPlotId,
    ),
    quantity = productionOutputQuantity(job, actor, plot),
    destination =
      job.plan?.cropAction === "harvest"
        ? fieldHarvestPile(state, plot, output, quantity)
        : output;
  produceFood(state, destination.id, quantity, productionFoodOrigin(job, plot));
  destination.quantity += quantity;
  recordCropYield(job, actor, plot, quantity);
  job.production.outputCreated = true;
  return destination;
}

function fieldHarvestPile(state, plot, output, quantity) {
  const key = `field_harvest_${plot.id}_${plot.cycle}`,
    existing = state.village.stockpiles.find((item) => item.key === key);
  if (existing) return existing;
  const position = { ...plot.workPosition };
  const pile = {
    id: namedUuid(state.id, `stockpile:${key}`),
    definitionId: definitionId("stockpile", "field-harvest"),
    entityType: "stockpile",
    key,
    name: `${plot.cropKind.replaceAll("_", " ")} field harvest`,
    itemKind: output.itemKind,
    quantity: 0,
    position,
    containerKind: "field_pile",
    containerId: namedUuid(state.id, `field-harvest:${plot.id}:${plot.cycle}`),
    threshold: 0,
    capacity: Math.max(quantity, output.capacity),
    harvestDestinationStockpileId: output.id,
    harvestDestinationCellId: plot.harvestDestinationCellId ?? null,
    cropPlotId: plot.id,
  };
  state.village.stockpiles.push(pile);
  return pile;
}

function emitProductionCompleted(state, job, output, events) {
  if (!output) return;
  events.push(
    jobEvent(state, "production_completed", job, {
      itemKind: output.itemKind,
      quantity: job.production.output.quantity,
      stockQuantity: output.quantity,
    }),
  );
}

function remoteOutputJob(job) {
  return (
    (job.plan?.geologyAction === "quarry" || job.plan?.remoteHarvest) &&
    job.production?.output
  );
}

function applyRemoteHarvestEffect(state, job, events) {
  if (job.plan?.remoteHarvest !== "animal" || job.plan.remoteHarvestApplied)
    return;
  finishAnimalProduction(state, job, events);
  job.plan.remoteHarvestApplied = true;
}

function applyProductionWorldEffectOnce(state, job, events) {
  if (job.plan?.worldEffectApplied) return;
  applyProductionWorldEffect(state, job, events);
  job.plan.worldEffectApplied = true;
}

function beginRemoteOutputReturn(state, job, actor, events) {
  const output = stockpile(state, job.production.output.stockpileId),
    quantity = job.production.output.quantity;
  applyProductionWorldEffectOnce(state, job, events);
  job.plan.step = "return_output";
  job.plan.returnOutputPosition = { ...output.position };
  delete job.plan.cachedPath;
  actor.carriedItem = {
    itemKind: output.itemKind,
    name: output.name,
    quantity,
  };
  actor.currentAction = `Carrying ${output.name.toLowerCase()} to storage`;
  actor.actionReason = "returning_remote_output";
  events.push(jobEvent(state, "remote_output_loaded", job, { quantity }));
}

function returnRemoteOutput(state, job, actor, events) {
  const output = createProductionOutput(state, job, actor);
  actor.carriedItem = null;
  emitProductionCompleted(state, job, output, events);
  events.push(jobEvent(state, "remote_output_stored", job));
  recordRemoteJourney(state, job, "stored", events);
  const tool = reusableProductionInput(job);
  if (!tool) return completeJob(state, job, actor, events);
  job.plan.step = "return_input";
  delete job.plan.cachedPath;
  showReusableProductionInput(job, actor);
  actor.currentAction = `Returning ${tool.name.toLowerCase()}`;
  actor.actionReason = "returning_shared_tool";
}

function finishForaging(state, job, events) {
  if (!job.plan?.foragePatchId) return;
  const patch = harvestForagePatch(state, job.plan.foragePatchId, job.id);
  if (patch)
    events.push(
      jobEvent(state, "forage_gathered", job, {
        patchId: patch.id,
        forageKind: patch.key,
        quantity: patch.yield,
        regrowAtTick: patch.regrowAtTick,
      }),
    );
}

function finishAnimalBreeding(state, job, events) {
  const conception = beginAnimalBreeding(state, job.plan.animalSpecies);
  if (!conception) return;
  events.push(
    jobEvent(state, "animal_conceived", job, {
      motherId: conception.mother.id,
      fatherId: conception.father.id,
      dueDay: conception.dueDay,
      offspringCount: conception.offspringCount,
    }),
  );
}

function finishAnimalTreatment(state, job, animal, events) {
  const disease = treatAnimalDisease(state, animal);
  if (!disease) return;
  events.push(
    jobEvent(state, "animal_treated", job, {
      animalId: animal.id,
      disease: disease.kind,
    }),
  );
}

function finishAnimalHarvest(state, job, animal, events) {
  const effect = job.plan?.animalEffect;
  if (recordAnimalProduction(animal, effect, state.village.clock?.day ?? 1)) {
    events.push(
      jobEvent(state, "animal_product_collected", job, {
        animalId: animal.id,
        effect,
      }),
    );
    return;
  }
  if (!["slaughter", "hunt"].includes(effect)) return;
  const removed = animal ? removeAnimal(state, animal.id, effect) : null;
  if (!removed) return;
  const type = effect === "hunt" ? "animal_hunted" : "animal_slaughtered";
  events.push(jobEvent(state, type, job, { animalId: removed.id }));
}

function finishAnimalProduction(state, job, events) {
  const effect = job.plan?.animalEffect;
  if (effect === "breed") {
    finishAnimalBreeding(state, job, events);
    return;
  }
  const species = job.plan.animalSpecies,
    animal = animalProductionCandidates(state, species, effect).find(
      (candidate) => candidate.id === job.targetId,
    );
  if (effect === "treat") {
    finishAnimalTreatment(state, job, animal, events);
    return;
  }
  finishAnimalHarvest(state, job, animal, events);
}

function accountSiteClearing(state, job) {
  if (!job.plan?.siteClearing || job.plan.commissionLaborAccounted) return;
  const commission = state.village.development?.strategyBoard?.commissions.find(
    (candidate) => candidate.id === job.plan.commissionId,
  );
  if (!commission) return;
  commission.preconstructionLaborUnits =
    (commission.preconstructionLaborUnits ?? 0) + job.progress.total;
  job.plan.commissionLaborAccounted = true;
}

function openCompletedConstruction(state, construction) {
  if (!construction) return;
  const enclosureKeys = new Set(
    (construction.enclosures ?? []).map((item) => item.key),
  );
  for (const door of state.village.doors)
    if (
      door.buildingKey === construction.key ||
      enclosureKeys.has(door.pastureKey)
    )
      door.state = "open";
  for (const pasture of state.village.pastures ?? [])
    if (enclosureKeys.has(pasture.key)) pasture.gate.state = "open";
}

function applyAgricultureProduction(state, job) {
  if (job.plan?.cropAction) applyCropAction(state, job);
  if (job.plan?.cropTreatmentPlotId) applyCropTreatment(state, job);
  if (job.plan?.fertilityPlotId) applyFieldFertilizer(state, job);
  if (job.plan?.waterPlotId) applyFieldWater(state, job);
}

function finishProduction(state, job, actor, events) {
  const facts = job.plan?.construction
    ? constructionFactSummary(state, job)
    : null;
  if (facts && !facts.complete)
    return blockActiveJob(state, job, "construction_objects_missing", events);
  if (facts) job.plan.derivedFacts = facts;
  if (facts && holdForFinalInspection(state, job, actor, events)) return;
  if (remoteOutputJob(job)) {
    applyRemoteHarvestEffect(state, job, events);
    return beginRemoteOutputReturn(state, job, actor, events);
  }
  const output = createProductionOutput(state, job, actor);
  applyAgricultureProduction(state, job);
  finishForaging(state, job, events);
  finishAnimalProduction(state, job, events);
  emitProductionCompleted(state, job, output, events);
  accountSiteClearing(state, job);
  applyProductionWorldEffectOnce(state, job, events);
  if (remoteTravelPlan(job) && !reusableProductionInput(job))
    recordRemoteJourney(state, job, "completed", events);
  openCompletedConstruction(state, job.plan?.construction);
  if (reusableProductionInput(job)) {
    const tool = reusableProductionInput(job);
    job.plan.step = "return_input";
    delete job.plan.cachedPath;
    actor.currentAction = `Returning ${(actor.carriedItem?.name ?? tool.name).toLowerCase()}`;
    actor.actionReason = "returning_shared_tool";
    return;
  }
  completeJob(state, job, actor, events);
}

function completeConstructionElement(state, job, element, events, worker) {
  element.laborCompleted = element.laborRequired;
  element.status = "complete";
  consumeConstructionMaterials(state, element);
  materializeConstructionElement(state, job, element);
  updateConstructionProgress(job);
  const transitions = deriveVillageArchitecture(state);
  syncResidentHousing(state);
  emitArchitectureTransitions(state, job, transitions, events);
  events.push(
    jobEvent(state, "construction_element_completed", job, {
      elementKey: element.key,
      elementKind: element.kind,
      position: { ...element.position },
      workerId: worker?.id ?? null,
      workerName: actorName(worker),
    }),
  );
}

function continueConstruction(state, job, actor, events) {
  const next = activeConstructionElement(job);
  if (next) {
    job.plan.step = next.materialDelivered ? "produce" : "to_input";
    delete job.plan.cachedPath;
    return;
  }
  const pending = job.plan.constructionWork.elements.some(
    (candidate) => candidate.status !== "complete",
  );
  if (!pending) return finishProduction(state, job, actor, events);
  const reason = constructionPendingReason(job);
  if (reason === "field_visibility_clearance_pending")
    return blockActiveJob(state, job, reason, events);
  if (uncollectedProductionInput(job)) {
    job.plan.step = "to_input";
    delete job.plan.cachedPath;
    actor.currentAction = "Collecting material for the next section";
    return;
  }
  return blockActiveJob(state, job, "construction_material_pending", events);
}

function constructionPendingReason(job) {
  const clearancePending = job.plan.constructionWork.elements.some(
    (element) =>
      element.materialDelivered &&
      element.status !== "complete" &&
      element.clearanceBlocked,
  );
  return clearancePending
    ? "field_visibility_clearance_pending"
    : "construction_material_pending";
}

function blockForFieldClearance(state, job, element, events) {
  if (fieldFenceClearanceReady(state, element)) return false;
  element.clearanceBlocked = true;
  job.plan.activeConstructionElementKey = null;
  blockActiveJob(state, job, "field_visibility_clearance_pending", events);
  return true;
}

function advanceConstruction(state, job, actor, events) {
  const element = activeConstructionElement(job);
  if (!element) {
    const pending = job.plan.constructionWork.elements.some(
      (candidate) => candidate.status !== "complete",
    );
    if (!pending) return finishProduction(state, job, actor, events);
    return blockActiveJob(state, job, constructionPendingReason(job), events);
  }
  if (blockForFieldClearance(state, job, element, events)) return;
  if (element.status === "planned") {
    element.status = "in_progress";
    events.push(
      jobEvent(state, "construction_element_started", job, {
        elementKey: element.key,
        elementKind: element.kind,
        position: { ...element.position },
        workerId: actor.id,
        workerName: actorName(actor),
      }),
    );
  }
  element.laborCompleted += SIMULATION_MINUTES_PER_TICK;
  updateConstructionProgress(job);
  actor.currentAction = `Building ${element.kind} ${element.key.split("_").at(-1)}`;
  actor.actionReason = "constructing_world_object";
  if (element.laborCompleted < element.laborRequired)
    return events.push(jobEvent(state, "construction_progress", job));
  completeConstructionElement(state, job, element, events, actor);
  job.plan.activeConstructionElementKey = null;
  return continueConstruction(state, job, actor, events);
}

function showReusableProductionInput(job, actor) {
  const reusable = reusableProductionInput(job);
  actor.carriedItem = reusable
    ? {
        itemKind: reusable.itemKind,
        name: reusable.name,
        quantity: reusable.carriedQuantity,
      }
    : null;
}

function advanceProduction(state, job, actor, events) {
  if (job.plan?.step === "to_input")
    return collectProductionInput(state, job, actor, events);
  if (job.plan?.step === "return_input") {
    returnReusableInputs(state, job, actor, events);
    recordRemoteJourney(state, job, "completed", events);
    return completeJob(state, job, actor, events);
  }
  if (job.plan?.step === "return_output")
    return returnRemoteOutput(state, job, actor, events);
  if (
    job.plan?.construction &&
    deliverConstructionInput(job, actor, events, state)
  )
    return;
  if (
    !(job.plan?.construction
      ? beginConstructionProduction(state, job, events)
      : beginProduction(state, job, events))
  )
    return;
  showReusableProductionInput(job, actor);
  if (job.plan?.step === "to_target") job.plan.step = "produce";
  if (job.plan?.construction)
    return advanceConstruction(state, job, actor, events);
  job.progress.completed += SIMULATION_MINUTES_PER_TICK;
  actor.currentAction = job.name;
  actor.actionReason = job.reason;
  if (job.progress.completed >= job.progress.total)
    return finishProduction(state, job, actor, events);
  events.push(
    jobEvent(state, "production_progress", job, {
      position: { ...actor.position },
    }),
  );
}

function startAssistedElement(state, parent, element, actor, events) {
  if (element.status !== "planned") return;
  element.status = "in_progress";
  events.push(
    jobEvent(state, "construction_element_started", parent, {
      elementKey: element.key,
      elementKind: element.kind,
      position: { ...element.position },
      workerId: actor.id,
      workerName: actorName(actor),
    }),
  );
}

function collectAssistedConstructionTools(state, parent, actor, events) {
  const inputs = parent.production.inputs.filter(
    (input) => input.consume === false && input.requiresPickup,
  );
  if (
    inputs.some((input) => {
      const source = stockpile(state, input.stockpileId);
      return (
        (source?.quantity ?? 0) < input.quantity - (input.carriedQuantity ?? 0)
      );
    })
  )
    return false;
  for (const input of inputs) {
    const quantity = input.quantity - (input.carriedQuantity ?? 0),
      source = stockpile(state, input.stockpileId);
    source.quantity -= quantity;
    input.carriedQuantity = (input.carriedQuantity ?? 0) + quantity;
    events.push(
      jobEvent(state, "production_tool_collected", parent, {
        itemKind: input.itemKind,
        quantity,
        workerId: actor.id,
      }),
    );
  }
  return beginConstructionProduction(state, parent, events);
}

function cancelBlockedConstructionAssist(state, job, actor, element, events) {
  if (fieldFenceClearanceReady(state, element)) return false;
  delete element.claimedByAssistJobId;
  cancelJob(state, job, "field_visibility_clearance_pending");
  actor.workState = "available";
  events.push(jobEvent(state, "job_cancelled", job));
  return true;
}

function advanceConstructionAssistance(
  state,
  parent,
  job,
  actor,
  element,
  events,
) {
  if (cancelBlockedConstructionAssist(state, job, actor, element, events))
    return;
  if (
    !parent.production.inputConsumed &&
    !collectAssistedConstructionTools(state, parent, actor, events)
  )
    return blockActiveJob(state, job, "construction_tool_unavailable", events);
  startAssistedElement(state, parent, element, actor, events);
  const contribution = Math.min(
    SIMULATION_MINUTES_PER_TICK,
    element.laborRequired - element.laborCompleted,
  );
  element.laborCompleted += contribution;
  job.progress.completed += contribution;
  updateConstructionProgress(parent);
  actor.objective = "assist_project";
  actor.currentAction = `Building ${element.kind} ${element.key.split("_").at(-1)}`;
  actor.actionReason = "constructing_world_object";
  if (element.laborCompleted < element.laborRequired)
    return events.push(jobEvent(state, "construction_progress", job));
  completeConstructionElement(state, parent, element, events, actor);
  delete element.claimedByAssistJobId;
  completeAssistedFoundingProject(state, parent, events);
  completeJob(state, job, actor, events);
}

function returnOrphanedProductionInputs(state, job, events) {
  for (const input of job.production?.inputs ?? []) {
    if (input.consume !== false || input.carriedQuantity <= 0) continue;
    const source = stockpile(state, input.stockpileId);
    if (source) source.quantity += input.carriedQuantity;
    events.push(
      jobEvent(state, "production_tool_returned", job, {
        itemKind: input.itemKind,
        quantity: input.carriedQuantity,
      }),
    );
    input.carriedQuantity = 0;
  }
}

function completeAssistedFoundingProject(state, parent, events) {
  if (
    parent.plan?.specialistFacility ||
    parent.plan?.commissioning ||
    parent.assignedActorId ||
    ["completed", "cancelled"].includes(parent.status)
  )
    return;
  const facts = constructionFactSummary(state, parent);
  if (!facts.complete) return;
  parent.plan.derivedFacts = facts;
  createProductionOutput(state, parent);
  applyProductionWorldEffect(state, parent, events);
  openCompletedConstruction(state, parent.plan.construction);
  returnOrphanedProductionInputs(state, parent, events);
  if (parent.status !== "available")
    transitionJob(parent, "available", state.tick);
  transitionJob(parent, "reserved", state.tick);
  transitionJob(parent, "active", state.tick);
  transitionJob(parent, "completed", state.tick);
  releaseJobReservations(state, parent.id, "job_completed");
  events.push(jobEvent(state, "job_completed", parent));
}

function advanceProjectAssistance(state, job, actor, events) {
  const parent = state.village.jobs.find(
      (candidate) => candidate.id === job.plan.parentJobId,
    ),
    element = parent?.plan?.constructionWork?.elements.find(
      (candidate) => candidate.key === job.plan.constructionElementKey,
    );
  if (element)
    return advanceConstructionAssistance(
      state,
      parent,
      job,
      actor,
      element,
      events,
    );
  cancelJob(state, job, "construction_element_missing");
  actor.workState = "available";
  events.push(jobEvent(state, "job_cancelled", job));
}

function advanceHealing(state, job, healer, events) {
  const target = woundedPartyTarget(state, job.targetId),
    remedies = stockpileByKey(state, "apothecary_remedies");
  if (!target) return completeJob(state, job, healer, events);
  if (!remedies?.quantity)
    return blockActiveJob(state, job, "remedy_unavailable", events);
  const restored = Math.min(6, target.actor.maxHp - target.actor.hp);
  remedies.quantity -= 1;
  target.actor.hp += restored;
  events.push(
    jobEvent(state, "resident_healed", job, {
      patientId: target.actor.id,
      patientName: target.actor.name,
      healing: restored,
      hp: target.actor.hp,
      maxHp: target.actor.maxHp,
    }),
  );
  completeJob(state, job, healer, events);
}

function recordCompanionOutcome(state, job, worker, events) {
  const actor = companionActor(state, worker.actorId),
    outcome = job.plan.outcome;
  if (outcome === "rested") actor.hp = Math.min(actor.maxHp, actor.hp + 2);
  if (outcome === "wages") state.hero.goldCp += job.plan.rewardCp;
  if (!["rested", "wages"].includes(outcome)) {
    worker.discoveries.push({ kind: outcome, completedAtTick: state.tick });
    worker.discoveries = worker.discoveries.slice(-8);
  }
  worker.completedJobTypes.push(job.jobType);
  worker.completedJobTypes = [...new Set(worker.completedJobTypes)];
  events.push(
    jobEvent(state, "companion_objective_completed", job, {
      outcome,
      rewardCp: job.plan.rewardCp,
      skills: job.plan.skills ?? [],
    }),
  );
}

function advanceCompanionWork(state, job, worker, events) {
  job.progress.completed += SIMULATION_MINUTES_PER_TICK;
  worker.objective = job.jobType;
  worker.currentAction = job.name;
  worker.actionReason = job.reason;
  if (job.progress.completed < job.progress.total) {
    events.push(jobEvent(state, "job_progress", job));
    return;
  }
  recordCompanionOutcome(state, job, worker, events);
  completeJob(state, job, worker, events);
}

function advanceCompanionHealing(state, job, worker, events) {
  const target = woundedPartyTarget(state, job.targetId),
    healer = companionActor(state, worker.actorId);
  if (!target || healer.supportUses < 1)
    return completeJob(state, job, worker, events);
  const restored = Math.min(6, target.actor.maxHp - target.actor.hp);
  healer.supportUses -= 1;
  target.actor.hp += restored;
  events.push(
    jobEvent(state, "companion_healed", job, {
      patientId: target.actor.id,
      patientName: target.actor.name,
      healing: restored,
      hp: target.actor.hp,
      maxHp: target.actor.maxHp,
    }),
  );
  completeJob(state, job, worker, events);
}

function consumeNeedMeal(state, job, actor, events) {
  if (job.plan.need !== "hunger" || job.plan.mealConsumed) return true;
  const food = stockpileByKey(state, job.plan.foodStockpileKey ?? "inn_meals");
  if (!food?.quantity)
    return blockActiveJob(state, job, "prepared_meal_unavailable", events);
  const portions = withdrawFood(state, food.id, 1, {
    type: "meal_consumed",
    jobId: job.id,
    actorId: actor.id,
  });
  food.quantity -= 1;
  job.plan.mealConsumed = true;
  events.push(
    jobEvent(state, "meal_consumed", job, {
      itemKind: food.itemKind,
      quantity: 1,
      sourceStockpileId: food.id,
      sourceStockpileKey: food.key,
      sourceRemaining: food.quantity,
      foodBatchIds: portions.map((portion) => portion.batchId),
    }),
  );
  return true;
}

function applyShelteredSleepProgress(state, job, actor, earned) {
  const fixture = state.village.fixtures.find(
    (candidate) =>
      candidate.id ===
      (job.plan?.shelterFixtureId ?? actor.sleepingLocation?.fixtureId),
  );
  if (!fixture?.providesShelter) return;
  const safetyEarned = Math.min(30, earned / 2),
    safetyApplied = job.plan.safetyGainApplied ?? 0;
  actor.life.needs.safety = Math.min(
    100,
    actor.life.needs.safety + Math.max(0, safetyEarned - safetyApplied),
  );
  job.plan.safetyGainApplied = safetyEarned;
}

function applyFatigueProgress(state, job, actor, target) {
  if (job.plan.need !== "fatigue") return;
  const earned = Math.min(
      target.gain,
      (target.gain * job.progress.completed) / job.progress.total,
    ),
    applied = job.plan.needGainApplied ?? 0;
  actor.life.needs.fatigue = Math.min(
    100,
    actor.life.needs.fatigue + Math.max(0, earned - applied),
  );
  applyShelteredSleepProgress(state, job, actor, earned);
  job.plan.needGainApplied = earned;
}

function satisfyPartnerNeed(state, job, actor, target) {
  if (job.plan.need !== "social" || !job.plan.partnerId) return;
  const partner = villageWorkActor(state, job.plan.partnerId);
  if (partner?.life)
    satisfyNeed(
      partner.life,
      "social",
      Math.floor(target.gain / 2),
      state.tick,
      `Spoke with ${actorName(actor)}`,
    );
}

function advanceNeedWork(state, job, actor, events) {
  const need = job.plan.need,
    target = LIFE_TARGETS[need];
  if (!consumeNeedMeal(state, job, actor, events)) return;
  job.progress.completed += SIMULATION_MINUTES_PER_TICK;
  actor.objective = NEED_JOB_TYPES[need];
  actor.currentAction = job.name;
  actor.actionReason = `${need}_need`;
  applyFatigueProgress(state, job, actor, target);
  if (job.progress.completed < job.progress.total) {
    events.push(jobEvent(state, "need_progress", job, { need }));
    return;
  }
  satisfyNeed(
    actor.life,
    need,
    Math.max(
      0,
      target.gain * (job.plan.needGainMultiplier ?? 1) -
        (job.plan.needGainApplied ?? 0),
    ),
    state.tick,
    job.name,
  );
  satisfyPartnerNeed(state, job, actor, target);
  events.push(
    jobEvent(state, "need_satisfied", job, {
      need,
      value: actor.life.needs[need],
      partnerId: job.plan.partnerId ?? null,
    }),
  );
  completeJob(state, job, actor, events);
}

function jobAccessDoor(state, job) {
  if (!job.plan?.accessPosition) return null;
  if (job.transfer && job.plan.step !== "to_destination") return null;
  return (
    state.village.doors.find(
      (door) =>
        door.x === job.plan.accessPosition.x &&
        door.y === job.plan.accessPosition.y,
    ) ??
    state.village.pastures
      ?.map((pasture) => pasture.gate)
      .find(
        (gate) =>
          gate.x === job.plan.accessPosition.x &&
          gate.y === job.plan.accessPosition.y,
      )
  );
}

function approachJobDoor(state, job, actor, terrainAt, events) {
  const door = jobAccessDoor(state, job);
  if (!door || door.state === "open") return false;
  const route = planVillageRoute(
    state,
    actor,
    job.plan.accessPosition,
    terrainAt,
    true,
  );
  if (!route.ok) return false;
  if (route.path.length > 1) {
    actor.position = { ...route.path[1] };
    job.destination = { ...route.destination };
    return true;
  }
  if (door.state === "locked") {
    blockActiveJob(state, job, "access_locked", events);
    return true;
  }
  door.state = "open";
  events.push(
    jobEvent(state, "door_opened", job, {
      doorId: door.id,
      position: { ...job.plan.accessPosition },
    }),
  );
  actor.currentAction = `Opened access for ${job.name.toLowerCase()}`;
  return true;
}

function advancePatrol(state, job, actor, route, events) {
  const moved = route.path.length > 1;
  if (moved) actor.position = { ...route.path[1] };
  if (key(actor.position) === key(route.destination)) {
    actor.routeIndex = job.plan.nextRouteIndex;
    job.progress.completed += 1;
  }
  if (job.progress.completed >= job.progress.total) {
    state.village.lastGuardPatrolAtTick = state.tick;
    events.push(jobEvent(state, "guard_patrol_completed", job));
    return completeJob(state, job, actor, events);
  }
  job.destination = { ...route.destination };
  actor.objective = "protect_town";
  actor.currentAction = `Patrolling toward ${job.targetPosition.x}, ${job.targetPosition.y}`;
  actor.actionReason = job.reason;
  events.push(
    villageActorEvent(state, moved ? "npc_move" : "npc_wait", actor, {
      destination: { ...route.destination },
      routeCost: route.cost,
      ...(moved ? {} : { reason: "patrol_waypoint_reached" }),
    }),
  );
  events.push(
    jobEvent(state, moved ? "job_progress" : "job_wait", job, {
      destination: { ...route.destination },
      position: { ...actor.position },
      ...(moved ? {} : { reason: "patrol_waypoint_reached" }),
    }),
  );
}

function incidentForJob(state, job) {
  return state.village.incidents.find(
    (incident) => incident.id === job.plan?.incidentId,
  );
}

function inspectIncident(state, job, actor, incident, context, events) {
  context.executeInteraction(
    {
      actorId: actor.id,
      objectId: job.targetId,
      action: "examine",
      ...job.targetPosition,
    },
    events,
  );
  incident.status = "investigated";
  incident.guardArrivedAtTick = state.tick;
  incident.responseTicks = state.tick - incident.createdAtTick;
  job.progress.completed = 1;
  job.plan.step =
    state.village.wantedLevel > 1 ? "escort_offender" : "warn_offender";
  actor.currentAction =
    job.plan.step === "escort_offender"
      ? "Moving to escort the repeat offender"
      : "Moving to warn the offender";
  actor.actionReason = "evidence_confirmed";
  events.push(
    jobEvent(state, "guard_investigated", job, { incidentId: incident.id }),
  );
}

function musterForIncident(state, job, actor, events) {
  const point =
    state.village.development.masterPlan.defenseStrategy.musterPoint;
  job.plan.musteredAtTick = state.tick;
  delete job.plan.cachedPath;
  actor.currentAction = `Mustering at ${point.name}`;
  actor.actionReason = "threat_muster";
  events.push(
    jobEvent(state, "guard_mustered", job, {
      musterPointId: point.id,
      position: { ...actor.position },
    }),
  );
}

function recordGuardResponse(state, job, incident, actor) {
  const defense = state.village.development.masterPlan.defenseStrategy;
  defense.responseLedger ??= [];
  defense.responseLedger.push({
    incidentId: incident.id,
    guardId: actor.id,
    reportedAtTick: incident.createdAtTick,
    musteredAtTick: job.plan.musteredAtTick ?? null,
    arrivedAtTick: incident.guardArrivedAtTick,
    resolvedAtTick: state.tick,
    responseTicks: incident.responseTicks,
    position: { ...incident.position },
  });
}

function resolveIncident(state, job, actor, incident, events) {
  const escort = job.plan.step === "escort_offender";
  incident.status = "resolved";
  incident.resolvedAtTick = state.tick;
  state.village.wantedLevel = Math.max(0, state.village.wantedLevel - 1);
  recordGuardResponse(state, job, incident, actor);
  events.push(
    jobEvent(state, escort ? "guard_escorted" : "guard_warned", job, {
      incidentId: incident.id,
      offenderId: incident.offenderId,
    }),
  );
  completeJob(state, job, actor, events);
}

function advanceGuardIncident(state, job, actor, route, context, events) {
  const incident = incidentForJob(state, job);
  if (!incident) return blockActiveJob(state, job, "incident_missing", events);
  if (route.path.length > 1) {
    actor.position = { ...route.path[1] };
    job.destination = { ...route.destination };
    events.push(
      jobEvent(state, "job_progress", job, {
        destination: { ...route.destination },
        position: { ...actor.position },
      }),
    );
    return;
  }
  if (job.plan.musterRequired && job.plan.musteredAtTick == null)
    return musterForIncident(state, job, actor, events);
  if (job.plan.step === "inspect_evidence")
    return inspectIncident(state, job, actor, incident, context, events);
  resolveIncident(state, job, actor, incident, events);
}

function burialStageProgress(state, job, actor, events, eventType) {
  job.plan.stageProgress = (job.plan.stageProgress ?? 0) + 1;
  job.progress.completed += 1;
  actor.currentAction = job.name;
  actor.actionReason = "civic_burial";
  events.push(jobEvent(state, eventType, job));
  return job.plan.stageProgress >= 3;
}

function finishGraveDigging(state, job, grave, actor, events) {
  grave.status = "dug";
  grave.dugAtTick = state.tick;
  job.plan.step = "collect_corpse";
  job.plan.stageProgress = 0;
  job.targetPosition = { ...residentCorpse(state, job.plan.corpseId).position };
  delete job.plan.cachedPath;
  actor.currentAction = "Walking to collect the deceased resident";
  events.push(jobEvent(state, "grave_dug", job, { graveId: grave.id }));
}

function collectResidentCorpse(state, job, corpse, grave, actor, events) {
  corpse.status = "carried";
  actor.carriedItem = {
    itemKind: "resident_corpse",
    name: corpse.name,
    quantity: 1,
  };
  job.plan.step = "carry_to_grave";
  job.targetPosition = { ...grave.position };
  delete job.plan.cachedPath;
  actor.currentAction = `Carrying ${corpse.name} to the cemetery`;
  events.push(jobEvent(state, "resident_corpse_collected", job));
}

function finishResidentBurial(state, job, corpse, grave, actor, events) {
  completeResidentBurial(state, corpse, grave);
  actor.carriedItem = null;
  events.push(
    jobEvent(state, "resident_buried", job, {
      residentId: corpse.residentId,
      corpseId: corpse.id,
      graveId: grave.id,
    }),
  );
  completeJob(state, job, actor, events);
}

function advanceCivicBurial(state, job, actor, events) {
  const corpse = residentCorpse(state, job.plan.corpseId),
    grave = villageGrave(state, job.plan.graveId);
  if (!corpse || !grave)
    return blockActiveJob(state, job, "burial_target_missing", events);
  if (job.plan.step === "dig_grave") {
    if (burialStageProgress(state, job, actor, events, "grave_digging"))
      finishGraveDigging(state, job, grave, actor, events);
    return;
  }
  if (job.plan.step === "collect_corpse")
    return collectResidentCorpse(state, job, corpse, grave, actor, events);
  corpse.position = { ...actor.position };
  if (burialStageProgress(state, job, actor, events, "burial_progress"))
    finishResidentBurial(state, job, corpse, grave, actor, events);
}

function advanceCivicExhumation(state, job, actor, events) {
  const corpse = residentCorpse(state, job.plan.corpseId),
    grave = villageGrave(state, job.plan.graveId);
  if (!corpse || !grave)
    return blockActiveJob(state, job, "burial_target_missing", events);
  if (!burialStageProgress(state, job, actor, events, "exhumation_progress"))
    return;
  completeResidentExhumation(state, corpse, grave);
  events.push(jobEvent(state, "resident_exhumed", job, { graveId: grave.id }));
  completeJob(state, job, actor, events);
}

function collectCorpseForCremation(job, corpse, pyre, actor, events, state) {
  corpse.status = "carried";
  actor.carriedItem = {
    itemKind: "resident_corpse",
    name: corpse.name,
    quantity: 1,
  };
  job.plan.step = "cremate";
  job.targetPosition = { ...pyre.position };
  delete job.plan.cachedPath;
  events.push(jobEvent(state, "resident_corpse_collected", job));
}

function finishResidentCremation(
  state,
  job,
  corpse,
  pyre,
  actor,
  fuel,
  events,
) {
  fuel.quantity -= CREMATION_FUEL_UNITS;
  completeResidentCremation(state, corpse, pyre, CREMATION_FUEL_UNITS);
  actor.carriedItem = null;
  completeJob(state, job, actor, events);
}

function advanceCivicCremation(state, job, actor, events) {
  const corpse = residentCorpse(state, job.plan.corpseId),
    pyre = ensureVillageCremationPyre(state),
    fuel = stockpileByKey(state, "lumber_yard_lumber");
  if (!corpse || !pyre)
    return blockActiveJob(state, job, "cremation_target_missing", events);
  if (job.plan.step === "collect_corpse")
    return collectCorpseForCremation(job, corpse, pyre, actor, events, state);
  corpse.position = { ...actor.position };
  if ((fuel?.quantity ?? 0) < CREMATION_FUEL_UNITS)
    return blockActiveJob(state, job, "cremation_fuel_missing", events);
  if (!burialStageProgress(state, job, actor, events, "cremation_progress"))
    return;
  events.push(jobEvent(state, "resident_cremated", job, { pyreId: pyre.id }));
  finishResidentCremation(state, job, corpse, pyre, actor, fuel, events);
}

function advanceCivicMourning(state, job, actor, events) {
  const corpse = residentCorpse(state, job.plan.corpseId);
  if (!corpse)
    return blockActiveJob(state, job, "burial_target_missing", events);
  job.progress.completed += SIMULATION_MINUTES_PER_TICK;
  actor.currentAction = `Mourning ${corpse.name} at the cemetery`;
  actor.actionReason = "household_mourning";
  if (job.progress.completed < job.progress.total)
    return events.push(jobEvent(state, "mourning_progress", job));
  recordResidentMourning(state, corpse, actor);
  events.push(jobEvent(state, "resident_mourned", job));
  completeJob(state, job, actor, events);
}

function animalCarcassForJob(state, job) {
  return state.village.animals.find(
    (animal) => animal.id === job.plan.carcassId,
  );
}

function collectAnimalCarcass(state, job, animal, actor, events) {
  animal.carcassState = "carried";
  actor.carriedItem = {
    itemKind: "animal_carcass",
    name: `${animal.name} carcass`,
    quantity: 1,
  };
  job.plan.step = "haul_disposal";
  job.targetPosition = { ...job.plan.disposalPosition };
  delete job.plan.cachedPath;
  events.push(jobEvent(state, "animal_carcass_collected", job));
}

function finishAnimalDisposal(state, job, animal, actor, events) {
  const site = recordAnimalDisposal(state, animal);
  animal.carcassState = "gone";
  animal.disposition = "disposed";
  animal.disposedAtTick = state.tick;
  actor.carriedItem = null;
  events.push(
    jobEvent(state, "animal_carcass_disposed", job, { siteId: site.id }),
  );
  completeJob(state, job, actor, events);
}

function dressAnimalCarcass(state, job, animal, actor, events) {
  job.plan.stageProgress = (job.plan.stageProgress ?? 0) + 1;
  job.progress.completed += 1;
  actor.currentAction = `Dressing ${animal.name}`;
  actor.actionReason = "animal_carcass_food_recovery";
  if (job.plan.stageProgress < 3)
    return events.push(jobEvent(state, "animal_carcass_dressing", job));
  animal.carcassState = "carried";
  actor.carriedItem = {
    itemKind: "meat",
    name: `Meat from ${animal.name}`,
    quantity: job.plan.meatQuantity,
  };
  job.plan.step = "store_meat";
  job.targetPosition = { ...job.plan.storagePosition };
  delete job.plan.cachedPath;
}

function storeCarcassMeat(state, job, animal, actor, events) {
  const meat = stockpileByKey(state, "pasture_meat"),
    quantity = job.plan.meatQuantity;
  if (!meat || storageAvailableFor(state, meat.id, job.id) < quantity)
    return blockActiveJob(state, job, "meat_storage_full", events);
  meat.quantity += quantity;
  produceFood(state, meat.id, quantity, {
    originType: "carcass_recovery",
    originId: animal.id,
  });
  Object.assign(animal, {
    carcassState: "gone",
    disposition: "processed_for_food",
    processedAtDay: state.village.clock.day,
    processedAtTick: state.tick,
  });
  actor.carriedItem = null;
  events.push(jobEvent(state, "animal_carcass_processed", job, { quantity }));
  completeJob(state, job, actor, events);
}

function advanceAnimalCarcassDuty(state, job, actor, events) {
  const animal = animalCarcassForJob(state, job);
  if (!animal)
    return blockActiveJob(state, job, "animal_carcass_missing", events);
  if (job.plan.step === "collect")
    return collectAnimalCarcass(state, job, animal, actor, events);
  if (job.plan.step === "haul_disposal")
    return finishAnimalDisposal(state, job, animal, actor, events);
  if (job.plan.step === "dress")
    return dressAnimalCarcass(state, job, animal, actor, events);
  storeCarcassMeat(state, job, animal, actor, events);
}

function advanceGovernanceDuty(state, job, actor, events) {
  if (actor.life?.scheduleBlock !== "work")
    return completeJob(state, job, actor, events);
  job.progress.completed += 1;
  actor.objective = "govern_village";
  actor.currentAction = `Coordinating ${state.village.development.activePriority.replaceAll("_", " ")}`;
  actor.actionReason = "village_priority";
  if (job.progress.completed < job.progress.total) return;
  events.push(jobEvent(state, "village_work_reviewed", job));
  completeJob(state, job, actor, events);
}

function activeJobRoute(state, job, actor, terrainAt, events, movedActors) {
  let route = routeForJob(state, actor, job, terrainAt);
  if (
    !route.ok &&
    clearJobCrowdBlock(state, job, actor, terrainAt, events, movedActors)
  )
    route = routeForJob(state, actor, job, terrainAt);
  return route;
}

function advanceOutputJob(state, job, actor, context, events) {
  if (PRODUCTION_JOB_TYPES.has(job.jobType))
    return advanceProduction(state, job, actor, events);
  if (TRANSFER_JOB_TYPES.has(job.jobType))
    return job.plan.step === "to_source"
      ? loadDelivery(state, job, actor, events)
      : unloadDelivery(state, job, actor, events);
  return completeInspection(state, job, actor, context, events);
}

function advanceSecurityDuty(state, job, actor, events) {
  if (job.plan?.securityEquipmentDuty)
    advanceSecurityEquipment(state, job, actor, events);
  else if (job.plan?.securityEquipmentReturnDuty)
    advanceSecurityEquipmentReturn(state, job, actor, events);
  else if (job.plan?.securityTrainingDuty)
    advanceSecurityTraining(state, job, actor, events);
  else return false;
  return true;
}

function advanceCivicDuty(state, job, actor, events) {
  if (job.plan?.civicBurial) advanceCivicBurial(state, job, actor, events);
  else if (job.plan?.civicExhumation)
    advanceCivicExhumation(state, job, actor, events);
  else if (job.plan?.civicCremation)
    advanceCivicCremation(state, job, actor, events);
  else if (job.plan?.civicMourning)
    advanceCivicMourning(state, job, actor, events);
  else if (job.plan?.animalCarcassDuty)
    advanceAnimalCarcassDuty(state, job, actor, events);
  else return false;
  return true;
}

function accessSpurForJob(state, job) {
  return (
    state.village.development.masterPlan.spatialReservations.accessSpurs ?? []
  ).find((spur) => spur.key === job.plan.routeWork.spurKey);
}

function recordDirtRoadCell(state, job, actor, position, events) {
  if (dirtRoadAt(state, position)) return;
  state.village.modifications.push({
    id: namedUuid(state.id, `dirt-road:${position.x},${position.y}`),
    definitionId: definitionId("terrain-change", "built_dirt_road"),
    entityType: "terrain-change",
    kind: "built_dirt_road",
    ...position,
    originalTile: "outdoor_grass",
    actorId: actor.id,
    createdAtTick: state.tick,
  });
  events.push(jobEvent(state, "access_road_cell_completed", job, { position }));
}

function nextAccessRoadCell(state, job) {
  return job.plan.routeWork.cells.find(
    (position) => !dirtRoadAt(state, position),
  );
}

function retargetAccessRoadJob(state, job, actor, position) {
  releaseJobReservations(state, job.id, "route_cell_completed");
  job.targetPosition = { ...position };
  job.destination = null;
  delete job.plan.cachedPath;
  reserveAll(state, job, jobClaims(job, position, actor.id));
}

function advanceAccessRoad(state, job, actor, events) {
  job.plan.routeWork.cellProgress ??= 0;
  job.plan.routeWork.cellProgress += SIMULATION_MINUTES_PER_TICK;
  job.progress.completed = Math.min(
    job.progress.total,
    job.progress.completed + SIMULATION_MINUTES_PER_TICK,
  );
  actor.currentAction = "Packing the dirt access road";
  actor.actionReason = "building_access_route";
  if (job.plan.routeWork.cellProgress < 12) return;
  recordDirtRoadCell(state, job, actor, job.targetPosition, events);
  job.plan.routeWork.cellProgress = 0;
  const next = nextAccessRoadCell(state, job);
  if (next) return retargetAccessRoadJob(state, job, actor, next);
  const spur = accessSpurForJob(state, job);
  if (spur)
    Object.assign(spur, { status: "operating", completedAtTick: state.tick });
  events.push(
    jobEvent(state, "access_road_completed", job, { spurKey: spur?.key }),
  );
  completeJob(state, job, actor, events);
}

function executeArrivedJob(state, job, actor, context, events) {
  if (LIFE_JOB_TYPES.has(job.jobType))
    return advanceNeedWork(state, job, actor, events);
  if (job.jobType === COMPANION_HEAL_JOB_TYPE)
    return advanceCompanionHealing(state, job, actor, events);
  if (COMPANION_JOB_TYPES.has(job.jobType))
    return advanceCompanionWork(state, job, actor, events);
  if (job.jobType === HEAL_JOB_TYPE)
    return advanceHealing(state, job, actor, events);
  if (job.plan?.finalInspectionDuty)
    return advanceFinalInspection(state, job, actor, events);
  if (job.plan?.facilityRepair)
    return advanceFacilityRepair(state, job, actor, events);
  if (job.plan?.constructionDelivery)
    return advanceConstructionDelivery(state, job, actor, events);
  if (job.plan?.projectAssist)
    return advanceProjectAssistance(state, job, actor, events);
  if (job.plan?.foremanDuty)
    return advanceForemanReview(state, job, actor, events);
  if (job.plan?.architectSurvey)
    return advanceArchitectSurvey(state, job, actor, events);
  if (job.plan?.constructionSurvey)
    return completeConstructionSurvey(state, job, actor, events);
  if (job.plan?.governanceDuty)
    return advanceGovernanceDuty(state, job, actor, events);
  if (job.plan?.routeWork) return advanceAccessRoad(state, job, actor, events);
  if (advanceCivicDuty(state, job, actor, events)) return;
  if (advanceSecurityDuty(state, job, actor, events)) return;
  return advanceOutputJob(state, job, actor, context, events);
}

function relocationAnimal(state, job) {
  return livingAnimals(state).find((animal) => animal.id === job.targetId);
}

function beginAnimalLead(state, job, actor, animal) {
  const site = state.village.pastures.find(
    (pasture) => pasture.id === job.plan.relocationPastureId,
  );
  if (!animal || !site) return false;
  job.plan.step = "lead_to_gate";
  job.targetPosition = { x: site.gate.x, y: site.gate.y };
  job.plan.accessPosition = { ...job.targetPosition };
  actor.currentAction = `Leading ${animal.name} to ${site.name}`;
  actor.actionReason = "animal_housing_transfer";
  invalidateActorRoute(state, actor.id);
  return true;
}

function enterAnimalHousing(state, job, actor) {
  job.plan.step = "lead_inside";
  job.targetPosition = { ...job.plan.relocationDestination };
  actor.currentAction = "Leading the animal through the enclosure gate";
  invalidateActorRoute(state, actor.id);
}

function finishAnimalRelocation(state, job, actor, events) {
  const result = completeAnimalRelocation(
    state,
    job.targetId,
    job.plan.relocationDestination,
  );
  if (!result) return blockActiveJob(state, job, "animal_missing", events);
  events.push(
    jobEvent(state, "animal_relocated", job, {
      animalId: result.animal.id,
      pastureId: result.site.id,
      position: { ...result.animal.position },
    }),
  );
  completeJob(state, job, actor, events);
}

function moveAnimalLead(state, job, actor, route, events) {
  const animal = relocationAnimal(state, job),
    previous = { ...actor.position };
  actor.position = { ...route.path[1] };
  consumeCachedStep(job, actor.position);
  job.destination = { ...route.destination };
  if (job.plan.step.startsWith("lead_") && animal) animal.position = previous;
  events.push(
    jobEvent(state, "animal_led", job, {
      animalId: animal?.id ?? null,
      animalPosition: animal ? { ...animal.position } : null,
      handlerPosition: { ...actor.position },
    }),
  );
}

function advanceAnimalRelocation(state, job, actor, route, events) {
  const animal = relocationAnimal(state, job);
  if (!animal) return blockActiveJob(state, job, "animal_missing", events);
  if (route.path.length > 1)
    return moveAnimalLead(state, job, actor, route, events);
  if (job.plan.step === "produce")
    return beginAnimalLead(state, job, actor, animal);
  if (job.plan.step === "lead_to_gate")
    return enterAnimalHousing(state, job, actor);
  return finishAnimalRelocation(state, job, actor, events);
}

function executeActiveJob(state, job, actor, route, context, events) {
  if (job.jobType === "patrol_route")
    return advancePatrol(state, job, actor, route, events);
  if (job.plan?.animalRelocation)
    return advanceAnimalRelocation(state, job, actor, route, events);
  if (["investigate_crime", "respond_danger"].includes(job.jobType))
    return advanceGuardIncident(state, job, actor, route, context, events);
  if (completeRemoteWaypoint(state, job, actor, route, events)) return;
  if (route.path.length === 1)
    return executeArrivedJob(state, job, actor, context, events);
  const previous = { ...actor.position };
  actor.position = { ...route.path[1] };
  recordRemoteTravelStep(state, job, actor, previous, actor.position, events);
  consumeCachedStep(job, actor.position);
  job.destination = { ...route.destination };
  events.push(
    jobEvent(state, "job_progress", job, {
      destination: { ...route.destination },
      position: { ...actor.position },
    }),
  );
}

function advanceActiveJob(state, job, terrainAt, context, events, movedActors) {
  const actor = villageWorkActor(state, job.assignedActorId);
  if (!actor) return blockActiveJob(state, job, "actor_missing", events);
  if (recoverRemoteTravel(state, job, actor, events)) return;
  if (movedActors.has(actor.id)) {
    events.push(
      jobEvent(state, "job_wait", job, { reason: "yielded_passage" }),
    );
    return;
  }
  const startingPosition = key(actor.position);
  try {
    const route = activeJobRoute(
      state,
      job,
      actor,
      terrainAt,
      events,
      movedActors,
    );
    if (route.ok)
      return executeActiveJob(state, job, actor, route, context, events);
    if (approachJobDoor(state, job, actor, terrainAt, events)) return;
    return blockActiveJob(state, job, route.reason, events);
  } finally {
    if (key(actor.position) !== startingPosition) movedActors.add(actor.id);
  }
}

function retryDoorRoute(state, job, actor, terrainAt, events, movedActors) {
  const door = jobAccessDoor(state, job);
  if (!door || door.state === "locked") return null;
  let route = planVillageRoute(
    state,
    actor,
    job.plan.accessPosition,
    terrainAt,
    true,
  );
  if (
    !route.ok &&
    resolveVillageCrowdBlock(
      state,
      actor,
      job.plan.accessPosition,
      terrainAt,
      true,
      events,
      movedActors,
    )
  )
    route = planVillageRoute(
      state,
      actor,
      job.plan.accessPosition,
      terrainAt,
      true,
    );
  return route;
}

function jobCarriesCargo(job) {
  return Boolean(
    job.plan?.carriedQuantity ||
    job.transfer?.carriedQuantity ||
    job.production?.inputs?.some((input) => input.carriedQuantity > 0),
  );
}

function releaseStalledNavigation(state, job, actor, events) {
  job.retryCount = (job.retryCount ?? 0) + 1;
  job.nextRetryAtTick = state.tick + blockedRetryDelay(job, job.blockingReason);
  const sharedWork = job.plan?.constructionSurvey,
    retryLimit = sharedWork ? 2 : 3;
  if (job.retryCount < retryLimit || jobCarriesCargo(job)) return;
  if (sharedWork) delete job.plan.ownerActorId;
  releaseBlockedWorkActor(
    state,
    job,
    actor,
    "navigation_retry_exhausted",
    events,
  );
  events.push(
    jobEvent(state, "job_assignment_released", job, {
      actorId: actor.id,
      reason: "navigation_retry_exhausted",
    }),
  );
}

function retryBlockedJob(state, job, terrainAt, events, movedActors) {
  if (!blockedRetryDue(state, job)) return;
  const actor = villageWorkActor(state, job.assignedActorId);
  if (!actor) {
    if (job.plan?.constructionSurvey) delete job.plan.ownerActorId;
    transitionJob(job, "available", state.tick);
    job.nextRetryAtTick = null;
    events.push(jobEvent(state, "job_reopened", job));
    return;
  }
  let route = routeForJob(state, actor, job, terrainAt);
  if (
    !route.ok &&
    clearJobCrowdBlock(state, job, actor, terrainAt, events, movedActors)
  )
    route = routeForJob(state, actor, job, terrainAt);
  const doorRoute = !route.ok
    ? retryDoorRoute(state, job, actor, terrainAt, events, movedActors)
    : null;
  if (!route.ok && !doorRoute?.ok)
    return releaseStalledNavigation(state, job, actor, events);
  transitionJob(job, "active", state.tick);
  job.retryCount = 0;
  job.nextRetryAtTick = null;
  actor.currentAction =
    job.jobType === "deliver_goods" ? "Resuming the smithy delivery" : job.name;
  actor.actionReason = "job_resumed";
  events.push(jobEvent(state, "job_resumed", job));
}

function blockedRetryDue(state, job) {
  const accessChanged =
    job.blockingReason === "access_locked" &&
    jobAccessDoor(state, job)?.state !== "locked";
  return accessChanged || (job.nextRetryAtTick ?? 0) <= state.tick;
}

const TARGET_INDEPENDENT_PLAN_FLAGS = Object.freeze([
  "constructionDelivery",
  "projectAssist",
  "foremanDuty",
  "finalInspectionDuty",
  "facilityRepair",
  "architectSurvey",
  "constructionSurvey",
  "governanceDuty",
  "animalRelocation",
  "civicBurial",
  "civicExhumation",
  "civicCremation",
  "civicMourning",
  "animalCarcassDuty",
  "securityEquipmentDuty",
  "securityEquipmentReturnDuty",
  "securityTrainingDuty",
  "terrainCellTarget",
  "routeWork",
]);

function targetIndependentJob(job) {
  return (
    ["completed", "cancelled"].includes(job.status) ||
    job.production?.outputCreated ||
    job.plan?.step === "return_output" ||
    job.plan?.constructionWork?.elements?.some(
      (element) => element.status !== "planned",
    ) ||
    job.jobType === "patrol_route" ||
    job.jobType === "respond_danger" ||
    TARGET_INDEPENDENT_PLAN_FLAGS.some((flag) => job.plan?.[flag])
  );
}

function refreshHealingTarget(state, job) {
  if (![COMPANION_HEAL_JOB_TYPE, HEAL_JOB_TYPE].includes(job.jobType))
    return false;
  const target = woundedPartyTarget(state, job.targetId);
  if (target) job.targetPosition = { ...target.position };
  return true;
}

function retargetAnimal(state, job) {
  if (!job.plan?.animalTarget) return false;
  const animal = livingAnimals(state, job.plan.animalSpecies ?? "cow").sort(
    (left, right) =>
      left.position.y - right.position.y ||
      left.position.x - right.position.x ||
      left.name.localeCompare(right.name),
  )[0];
  if (!animal) return false;
  job.targetId = animal.id;
  job.targetPosition = { ...animal.position };
  delete job.plan.cachedPath;
  return true;
}

function cancelMissingTargetJob(state, job, actor, missingReason, events) {
  if (actor && job.production) returnReusableInputs(state, job, actor, events);
  job.assignedActorId = null;
  cancelJob(state, job, missingReason);
  events.push(jobEvent(state, "job_cancelled", job, { reason: missingReason }));
  return false;
}

function invalidateIncidentJob(state, job, incident, missingReason, events) {
  Object.assign(incident, {
    status: "invalidated",
    resolvedAtTick: state.tick,
  });
  job.assignedActorId = null;
  transitionJob(job, "cancelled", state.tick, missingReason);
  events.push(jobEvent(state, "job_cancelled", job, { reason: missingReason }));
  return false;
}

function invalidateMissingJob(state, job, missingReason, events) {
  const actor = villageWorkActor(state, job.assignedActorId);
  restoreJobTransfer(state, job);
  releaseJobReservations(state, job.id, missingReason);
  if (actor) actor.workState = "available";
  if (job.plan?.terrainEffect && missingReason === "target_missing")
    return cancelMissingTargetJob(state, job, actor, missingReason, events);
  const incident = incidentForJob(state, job);
  if (incident)
    return invalidateIncidentJob(state, job, incident, missingReason, events);
  job.assignedActorId = null;
  if (job.status !== "blocked")
    transitionJob(job, "blocked", state.tick, missingReason);
  else job.blockingReason = missingReason;
  job.retryCount = (job.retryCount ?? 0) + 1;
  job.nextRetryAtTick = state.tick + blockedRetryDelay(job, missingReason);
  events.push(jobEvent(state, "job_blocked", job, { reason: missingReason }));
  return false;
}

function validateJobTarget(state, job, context, events) {
  if (targetIndependentJob(job) || refreshHealingTarget(state, job))
    return true;
  const objectAt = job.plan?.animalTarget
      ? context.objectAt
      : job.production || job.transfer || job.plan?.lifeJob
        ? (context.workObjectAt ?? context.objectAt)
        : context.objectAt,
    target = objectAt(job.targetPosition),
    source = job.sourcePosition ? objectAt(job.sourcePosition) : null,
    validTarget = target?.id === job.targetId,
    validSource = !job.sourceId || source?.id === job.sourceId;
  if (validTarget && validSource) return true;
  if (retargetAnimal(state, job)) return true;
  return invalidateMissingJob(
    state,
    job,
    validSource ? "target_missing" : "source_missing",
    events,
  );
}

function jobOrder(left, right) {
  if (left.priority !== right.priority) return right.priority - left.priority;
  if (left.jobType !== right.jobType)
    return left.jobType.localeCompare(right.jobType);
  if (left.plan?.parallelProduction && right.plan?.parallelProduction) {
    const positionOrder =
      left.targetPosition.y - right.targetPosition.y ||
      left.targetPosition.x - right.targetPosition.x;
    if (positionOrder) return positionOrder;
  }
  return left.id.localeCompare(right.id);
}

function deliveryStockpiles(state) {
  const source = state.village.stockpiles.find(
      (stockpile) =>
        stockpile.itemKind === SMITHY_DELIVERY.itemKind &&
        stockpile.containerKind === "cart",
    ),
    target = state.village.stockpiles.find(
      (stockpile) =>
        stockpile.itemKind === SMITHY_DELIVERY.itemKind &&
        stockpile.containerKind === "forge",
    );
  return { source, target };
}

function syncForgeOperations(state) {
  if (!state.village.facilities.includes("forge")) return null;
  const building = state.village.buildings.find(
      (candidate) =>
        candidate.key === "forge" && candidate.status === "complete",
    ),
    fixtures = state.village.fixtures.filter(
      (fixture) => fixture.buildingId === building?.id,
    ),
    forge = fixtures.find((fixture) => fixture.role === "forge"),
    materialStore = fixtures.find(
      (fixture) => fixture.role === "material_storage",
    ),
    workbench = fixtures.find((fixture) => fixture.role === "workbench"),
    workingStock = stockpileByKey(state, "smithy_supplies"),
    finishedStock = stockpileByKey(state, "smithy_weapons"),
    bowStock = stockpileByKey(state, "hunting_bows");
  if (!building || !forge || !materialStore || !workbench) return null;
  if (workingStock)
    workingStock.position = { x: materialStore.x, y: materialStore.y };
  if (finishedStock)
    finishedStock.position = { x: workbench.x, y: workbench.y };
  if (bowStock) bowStock.position = { x: workbench.x, y: workbench.y };
  return { building, forge, materialStore, workbench };
}

function syncFishingHutOperations(state) {
  if (!state.village.facilities.includes("fishing_hut")) return null;
  const building = state.village.buildings.find(
      (candidate) =>
        candidate.key === "fishing_hut" && candidate.status === "complete",
    ),
    fixtures = state.village.fixtures.filter(
      (fixture) => fixture.buildingId === building?.id,
    ),
    bench = fixtures.find((fixture) => fixture.role === "netting_bench"),
    rack = fixtures.find((fixture) => fixture.role === "net_rack"),
    fishStore = fixtures.find((fixture) => fixture.role === "fish_storage");
  if (!building || !bench || !rack || !fishStore) return null;
  const nets = stockpileByKey(state, "fishing_nets");
  if (nets)
    Object.assign(nets, {
      position: { x: rack.x, y: rack.y },
      containerKind: "fixture",
      containerId: rack.id,
    });
  return { building, bench, rack, fishStore };
}

// function-length-exempt: template -- declarative delivery-job policy
function postSmithyDelivery(state, context, events) {
  const operations = syncForgeOperations(state),
    { source, target } = deliveryStockpiles(state);
  if (
    !operations &&
    !state.village.buildings.some(
      (building) =>
        building.key === "smithy" && building.status !== "destroyed",
    )
  )
    return null;
  if (!source || !target || source.quantity < 1) return null;
  if (target.quantity >= target.threshold) return null;
  const sourceObject = context.objectAt(source.position),
    targetObject = (context.workObjectAt ?? context.objectAt)(target.position),
    quantity = Math.min(1, target.capacity - target.quantity);
  if (!sourceObject || !targetObject || quantity < 1) return null;
  const { job, created } = createJob(state, {
    id: namedUuid(
      state.id,
      `job:smithy-delivery:${state.village.jobs.filter((job) => job.jobType === "deliver_goods").length + 1}`,
    ),
    jobType: "deliver_goods",
    name: "Deliver smithy supplies",
    priority: 40,
    sourceId: sourceObject.id,
    sourcePosition: source.position,
    targetId: targetObject.id,
    targetPosition: target.position,
    requiredCapabilities: ["haul"],
    reason: "smithy_stock_below_threshold",
    progressTotal: 2,
    progressUnit: "stage",
    plan: {
      template: "deliver_goods",
      step: "to_source",
      accessPosition:
        operations?.building?.door ?? SMITHY_DELIVERY.accessPosition,
    },
    transfer: {
      itemKind: SMITHY_DELIVERY.itemKind,
      cargoName: source.name,
      quantity,
      carriedQuantity: 0,
      sourceStockpileId: source.id,
      targetStockpileId: target.id,
    },
  });
  if (created) events.push(jobEvent(state, "job_posted", job));
  return job;
}

function economyJobId(state, template) {
  state.village.economyJobSequences ??= {};
  const sequence =
    (state.village.economyJobSequences[template.jobType] ?? 0) + 1;
  state.village.economyJobSequences[template.jobType] = sequence;
  return namedUuid(state.id, `economy-job-v2:${template.jobType}:${sequence}`);
}

function productionRequirements(state, template) {
  const entries = [
    ...(template.inputKey
      ? [
          {
            key: template.inputKey,
            quantity: template.inputQuantity ?? 1,
            minimumRemaining: template.inputMinRemaining ?? 0,
            consume: true,
          },
        ]
      : []),
    ...(template.requirementKey
      ? [
          {
            key: template.requirementKey,
            quantity: template.requirementQuantity ?? 1,
            consume: false,
          },
        ]
      : []),
    ...(template.requirements ?? []).filter(
      (entry) => !entry.foundingOnly || state.village.scenario === "founding",
    ),
  ];
  return entries.map((entry) => ({
    ...entry,
    stockpile: stockpileByKey(state, entry.key),
  }));
}

function productionTarget(state, template, planDetails, context, position) {
  const reader = template.animalSpecies
      ? context.objectAt
      : (context.workObjectAt ?? context.objectAt),
    existing = reader(position);
  if (existing) return existing;
  const terrainCell =
      planDetails.terrainCellTarget &&
      context.terrainAt(position) === "outdoor_tree",
    waterCell =
      planDetails.waterHarvest &&
      context.terrainAt(position) === "outdoor_water";
  if (!planDetails.construction && !terrainCell && !waterCell) return null;
  const targetKind = terrainCell
    ? "terrain-cell"
    : waterCell
      ? "water-harvest"
      : "construction-site";
  return {
    id: namedUuid(
      state.id,
      terrainCell
        ? `terrain-cell:${position.x},${position.y}`
        : waterCell
          ? `water-harvest:${position.x},${position.y}`
          : `construction-site:${planDetails.construction.key}`,
    ),
    definitionId: definitionId(targetKind, targetKind),
    entityType: targetKind,
    position: { ...position },
  };
}

function animalProductionReady(state, template, animals) {
  if (!template.animalSpecies) return true;
  if (animals.length < (template.minimumAnimals ?? 1)) return false;
  if (template.animalEffect === "hunt") return true;
  const candidates = animalProductionCandidates(
    state,
    template.animalSpecies,
    template.animalEffect ?? "milk",
  );
  if (template.animalEffect !== "breed") return candidates.length > 0;
  return (
    canBreedAnimals(state, template.animalSpecies) &&
    animalHousingAvailable(state, template.animalSpecies, 1)
  );
}

function productionReady(
  state,
  template,
  allowMissingConstructionMaterial = false,
) {
  const output = stockpileByKey(state, template.outputKey),
    requirements = productionRequirements(state, template),
    animals = template.animalSpecies
      ? livingAnimals(state, template.animalSpecies)
      : [];
  if (!animalProductionReady(state, template, animals)) return false;
  if (
    template.outputKey &&
    (!output ||
      (!template.ignoreOutputThreshold &&
        output.quantity >= output.threshold) ||
      storageAvailableFor(state, output.id) < (template.outputQuantity ?? 1))
  )
    return false;
  return requirements.every((entry) => {
    if (allowMissingConstructionMaterial && entry.key === template.inputKey)
      return true;
    return (
      (entry.stockpile?.quantity ?? 0) >=
      entry.quantity + (entry.minimumRemaining ?? 0)
    );
  });
}

function productionSpec(state, template, construction = false) {
  const requirements = productionRequirements(state, template),
    output = stockpileByKey(state, template.outputKey);
  return {
    inputs: requirements.map((entry) => ({
      stockpileKey: entry.key,
      stockpileId: entry.stockpile.id,
      itemKind: entry.stockpile.itemKind,
      name: entry.stockpile.name,
      position: { ...entry.stockpile.position },
      quantity: entry.quantity,
      minimumRemaining: entry.minimumRemaining ?? 0,
      consume: entry.consume !== false,
      requiresPickup:
        (construction || state.village.scenario === "founding") &&
        entry.stockpile.itemKind !== "labor_credit",
      carriedQuantity: 0,
    })),
    output: output
      ? { stockpileId: output.id, quantity: template.outputQuantity ?? 1 }
      : null,
    inputConsumed: false,
    outputCreated: false,
  };
}

function villagePartyTargets(state) {
  if (state.village.adventurersPresent === false) return [];
  return [
    { actor: state.hero, position: state.village.heroPosition },
    ...state.companions.map((actor, index) => ({
      actor,
      position: state.village.companionPositions[index],
    })),
  ];
}

function woundedPartyTarget(state, actorId = null) {
  return villagePartyTargets(state)
    .filter(
      ({ actor }) =>
        (!actorId || actor.id === actorId) &&
        actor.hp > 0 &&
        actor.hp < actor.maxHp,
    )
    .sort(
      (left, right) =>
        left.actor.hp / left.actor.maxHp - right.actor.hp / right.actor.maxHp ||
        left.actor.id.localeCompare(right.actor.id),
    )[0];
}

function postHealingJob(state, events) {
  const target = woundedPartyTarget(state),
    remedies = stockpileByKey(state, "apothecary_remedies");
  if (!target || !remedies?.quantity) return null;
  const { job, created } = createJob(state, {
    id: namedUuid(state.id, `job:${HEAL_JOB_TYPE}:${target.actor.id}`),
    jobType: HEAL_JOB_TYPE,
    name: `Treat ${target.actor.name}`,
    priority: 80,
    targetId: target.actor.id,
    targetPosition: target.position,
    requiredCapabilities: ["heal"],
    reason: "party_member_wounded",
    progressTotal: 1,
    progressUnit: "treatment",
    plan: { template: HEAL_JOB_TYPE, step: "treat" },
  });
  if (created) events.push(jobEvent(state, "job_posted", job));
  return job;
}

function companionActor(state, actorId) {
  return state.companions.find((actor) => actor.id === actorId);
}

function companionJobOpen(state, actorId) {
  return state.village.jobs.some(
    (job) =>
      job.plan?.ownerActorId === actorId &&
      !["completed", "cancelled"].includes(job.status),
  );
}

function preferredCompanionJob(state, worker) {
  const actor = companionActor(state, worker.actorId),
    priorities = Object.entries(worker.workPriorities).sort(
      ([leftType, left], [rightType, right]) =>
        right - left || leftType.localeCompare(rightType),
    );
  const eligible = priorities.filter(([jobType, priority]) => {
    if (priority <= 0) return false;
    if (jobType === COMPANION_HEAL_JOB_TYPE)
      return actor.supportUses > 0 && woundedPartyTarget(state);
    if (!companionActivityAvailable(state, jobType)) return false;
    if (
      companionJobs(state).some(
        (job) =>
          job.jobType === jobType && job.plan.ownerActorId !== worker.actorId,
      )
    )
      return false;
    return true;
  });
  return (eligible.find(
    ([jobType]) => !worker.completedJobTypes.includes(jobType),
  ) ??
    eligible.find(([jobType]) => jobType !== worker.lastJobType) ??
    eligible[0])?.[0];
}

function postCompanionHealingJob(state, worker, events) {
  const target = woundedPartyTarget(state);
  if (!target) return null;
  const { job, created } = createJob(state, {
    id: namedUuid(state.id, `job:${COMPANION_HEAL_JOB_TYPE}:${worker.id}`),
    jobType: COMPANION_HEAL_JOB_TYPE,
    name: `Heal ${target.actor.name}`,
    priority: worker.workPriorities[COMPANION_HEAL_JOB_TYPE],
    targetId: target.actor.id,
    targetPosition: target.position,
    groupId: state.partyGroup.id,
    requiredCapabilities: ["heal"],
    reason: "companion_care",
    progressTotal: 1,
    progressUnit: "treatment",
    plan: {
      template: COMPANION_HEAL_JOB_TYPE,
      step: "treat",
      ownerActorId: worker.id,
      autonomous: true,
    },
  });
  if (created) events.push(jobEvent(state, "job_posted", job));
  return job;
}

// function-length-exempt: template -- declarative companion-job policy
function postCompanionTask(state, worker, jobType, context, events) {
  const template = companionTemplate(jobType),
    target = template && context.objectAt(template.targetPosition);
  if (!template || !target) return null;
  const { job, created } = createJob(state, {
    id: namedUuid(state.id, `job:${jobType}:${worker.id}:${state.tick}`),
    jobType,
    name: template.name,
    priority: worker.workPriorities[jobType],
    targetId: target.id,
    targetPosition: template.targetPosition,
    groupId: state.partyGroup.id,
    requiredCapabilities: [template.capability],
    reason: "personal_priority",
    progressTotal: template.duration * 30,
    progressUnit: "work_minute",
    plan: {
      template: jobType,
      step: "work",
      ownerActorId: worker.id,
      autonomous: true,
      outcome: template.outcome,
      skills: template.skills ?? [],
      rewardCp: template.rewardCp ?? 0,
      practiceUnits: template.duration,
      ...(template.accessPosition
        ? { accessPosition: template.accessPosition }
        : {}),
    },
  });
  if (created) events.push(jobEvent(state, "job_posted", job));
  return job;
}

function postCompanionJobs(state, context, events) {
  if (state.village.adventurersPresent === false) return;
  if (state.village.partyMovement !== "dispersed") return;
  for (const worker of state.village.companionStates) {
    if (companionJobOpen(state, worker.id)) continue;
    const jobType = preferredCompanionJob(state, worker);
    if (jobType === COMPANION_HEAL_JOB_TYPE)
      postCompanionHealingJob(state, worker, events);
    else postCompanionTask(state, worker, jobType, context, events);
  }
}

function lifeActorClaimed(state, actorId) {
  return state.village.jobs.some(
    (job) =>
      job.plan?.lifeJob &&
      [job.plan.ownerActorId, job.plan.partnerId].includes(actorId) &&
      !["completed", "cancelled"].includes(job.status),
  );
}

function releaseCriticalSocialClaims(state, actor, events) {
  const criticalNeed = ["hunger", "fatigue", "safety"].find(
    (need) => actor.life.needs[need] <= SURVIVAL_WARNING_THRESHOLD,
  );
  if (!criticalNeed) return;
  for (const job of state.village.jobs.filter(
    (candidate) =>
      candidate.plan?.lifeJob &&
      candidate.plan.partnerId === actor.id &&
      !["completed", "cancelled"].includes(candidate.status),
  )) {
    const assigned = villageWorkActor(state, job.assignedActorId);
    cancelJob(state, job, "critical_partner_need");
    if (assigned) assigned.workState = "available";
    events.push(
      jobEvent(state, "job_cancelled", job, {
        reason: "critical_partner_need",
        releasedPartnerId: actor.id,
        criticalNeed,
      }),
    );
  }
}

function immediateThreat(state, actor) {
  return state.village.incidents.find((incident) => {
    if (incident.kind !== "danger" || incident.status === "resolved")
      return false;
    if (incident.targetActorId) return incident.targetActorId === actor.id;
    const distance =
      Math.abs(incident.position.x - actor.position.x) +
      Math.abs(incident.position.y - actor.position.y);
    return distance <= 4;
  });
}

function shelteredSleepPreferred(state, actor) {
  if (state.village.clock.block !== "rest") return false;
  if (actor.life.needs.fatigue >= needAttentionThreshold(actor.life, "fatigue"))
    return false;
  return state.village.fixtures.some(
    (fixture) =>
      fixture.id === actor.sleepingLocation?.fixtureId &&
      fixture.providesShelter,
  );
}

function urgentSurvivalNeed(state, actor) {
  if (actor.personKey !== "watchman" && immediateThreat(state, actor))
    return "safety";
  const preferSleep = shelteredSleepPreferred(state, actor);
  return ["hunger", "fatigue", "safety"]
    .filter((need) => actor.life.needs[need] <= SURVIVAL_WARNING_THRESHOLD)
    .filter((need) => !(preferSleep && need === "safety"))
    .concat(
      preferSleep && actor.life.needs.safety <= SURVIVAL_WARNING_THRESHOLD
        ? ["fatigue"]
        : [],
    )
    .sort(
      (left, right) =>
        actor.life.needs[left] - actor.life.needs[right] ||
        left.localeCompare(right),
    )[0];
}

function conversationPartner(state, actor) {
  return villageWorkActors(state)
    .filter(
      (candidate) =>
        candidate.id !== actor.id &&
        candidate.life &&
        candidate.workState === "available" &&
        !lifeActorClaimed(state, candidate.id),
    )
    .sort(
      (left, right) =>
        Math.abs(left.position.x - actor.position.x) +
          Math.abs(left.position.y - actor.position.y) -
          (Math.abs(right.position.x - actor.position.x) +
            Math.abs(right.position.y - actor.position.y)) ||
        left.id.localeCompare(right.id),
    )[0];
}

function lifeTargetPosition(state, target, context) {
  return [...(target.positions ?? [target.position])]
    .map((position) => ({
      position,
      object: context.objectAt(position),
      claims: state.village.jobs.filter(
        (job) =>
          job.plan?.lifeJob &&
          !["completed", "cancelled"].includes(job.status) &&
          key(job.targetPosition) === key(position),
      ).length,
    }))
    .filter(({ object }) => object?.objectKind === target.objectKind)
    .sort(
      (left, right) =>
        left.claims - right.claims ||
        key(left.position).localeCompare(key(right.position)),
    )[0]?.position;
}

// function-length-exempt: template -- resident need-target projection
function residentHomeTarget(state, actor, need) {
  const residence = state.village.residences.find(
      (candidate) => candidate.id === actor.residenceId,
    ),
    building = state.village.buildings.find(
      (candidate) => candidate.id === residence?.buildingId,
    ),
    sleepingFixture = actor.sleepingLocation
      ? state.village.fixtures.find(
          (fixture) => fixture.id === actor.sleepingLocation.fixtureId,
        )
      : null,
    assignedToActor =
      sleepingFixture &&
      (!sleepingFixture.assignedActorId ||
        sleepingFixture.assignedActorId === actor.id),
    householdHome =
      !residence?.plannedHouseholdId ||
      residence.plannedHouseholdId === actor.householdId,
    sleepingPosition = sleepingFixture
      ? {
          x: sleepingFixture.x + (sleepingFixture.width ?? 1) - 1,
          y: sleepingFixture.y + (sleepingFixture.height ?? 1) - 1,
        }
      : null;
  if (
    sleepingFixture &&
    assignedToActor &&
    householdHome &&
    ["fatigue", "safety"].includes(need) &&
    (need !== "safety" || sleepingFixture.providesShelter || residence)
  )
    return {
      ...LIFE_TARGETS[need],
      objectKind: "bed",
      name: sleepingFixture.temporary
        ? need === "fatigue"
          ? sleepingFixture.shelterClass === "emergency_workshop"
            ? "Sleep on a bedroll inside the lumber workshop"
            : "Sleep in the founding bedroll"
          : sleepingFixture.shelterClass === "emergency_workshop"
            ? "Shelter inside the lumber workshop"
            : "Shelter beneath the founding canvas"
        : need === "fatigue"
          ? "Sleep at home"
          : "Take shelter at home",
      position: sleepingPosition,
      positions: [sleepingPosition],
      accessPosition: building?.door ?? null,
    };
  if (!residence || !building) return null;
  const homeRole = { hunger: "table", social: "table", morale: "kitchen" }[
      need
    ],
    homeFixture = homeRole
      ? state.village.fixtures.find(
          (fixture) =>
            fixture.buildingId === building.id && fixture.role === homeRole,
        )
      : null,
    source = LIFE_TARGETS[need];
  if (homeFixture) {
    const position = {
      x: homeFixture.x + homeFixture.width - 1,
      y: homeFixture.y + homeFixture.height - 1,
    };
    return {
      ...source,
      objectKind: "meal",
      name: {
        hunger: "Eat at the household table",
        social: "Share company at the household table",
        morale: "Reflect beside the household hearth",
      }[need],
      position,
      positions: [position],
      accessPosition: building.door,
    };
  }
  return null;
}

function actorExpeditionJob(state, actor) {
  return state.village.jobs.find(
    (job) =>
      job.assignedActorId === actor.id &&
      job.plan?.remoteTravel?.fieldCampId &&
      ["reserved", "active", "suspended", "blocked"].includes(job.status),
  );
}

function fieldCampLifeTarget(state, actor, need) {
  if (!["fatigue", "safety"].includes(need)) return null;
  const expedition = actorExpeditionJob(state, actor),
    camp = state.village.development.masterPlan.regionalContext.fieldCamps.find(
      (candidate) => candidate.id === expedition?.plan.remoteTravel.fieldCampId,
    ),
    fixture = state.village.fixtures.find((candidate) =>
      camp?.bedFixtureIds?.includes(candidate.id),
    );
  if (!camp || !fixture) return null;
  const position = { x: fixture.x, y: fixture.y + (fixture.height ?? 1) - 1 };
  return {
    ...LIFE_TARGETS[need],
    objectKind: "bed",
    name:
      need === "fatigue"
        ? "Sleep at the field camp"
        : "Shelter at the field camp",
    position,
    positions: [position],
    accessPosition: { ...camp.localPosition },
    fixtureId: fixture.id,
  };
}

function lifeTarget(state, actor, need) {
  const foundingTarget = {
    hunger: FOUNDING_MEAL_TARGET,
    social: FOUNDING_SOCIAL_TARGET,
    morale: FOUNDING_MORALE_TARGET,
  }[need];
  return (
    fieldCampLifeTarget(state, actor, need) ??
    residentHomeTarget(state, actor, need) ??
    (state.village.scenario === "founding" && foundingTarget
      ? foundingTarget
      : LIFE_TARGETS[need])
  );
}

function foodClaims(state, stockpileKey) {
  return state.village.jobs.filter(
    (job) =>
      job.jobType === "eat_meal" &&
      !["completed", "cancelled"].includes(job.status) &&
      !job.plan?.mealConsumed &&
      (job.plan?.foodStockpileKey ?? "inn_meals") === stockpileKey,
  ).length;
}

function availableSurvivalFood(state) {
  for (const key of ["inn_meals", "wild_forage", "dairy_milk"]) {
    const stockpile = stockpileByKey(state, key);
    if (stockpile && stockpile.quantity > foodClaims(state, key))
      return stockpile;
  }
  return null;
}

function hungerTarget(baseTarget, foodStockpile) {
  if (foodStockpile.key === "wild_forage")
    return { ...baseTarget, name: "Eat gathered wild food" };
  if (foodStockpile.key !== "dairy_milk") return baseTarget;
  return {
    ...baseTarget,
    name: "Drink emergency fresh milk",
  };
}

function survivalFoodGain(foodStockpile) {
  return foodStockpile.key === "inn_meals" ? 1 : 0.5;
}

// function-length-exempt: template -- declarative survival-job policy
function postNeedJob(state, actor, need, context, events) {
  let foodStockpile = null;
  const threat = need === "safety" ? immediateThreat(state, actor) : null;
  if (need === "hunger") {
    foodStockpile = availableSurvivalFood(state);
    if (!foodStockpile) return null;
  }
  const baseTarget = lifeTarget(state, actor, need),
    target =
      need === "hunger"
        ? hungerTarget(baseTarget, foodStockpile)
        : threat
          ? { ...baseTarget, name: "Flee immediate danger and take shelter" }
          : baseTarget,
    targetPosition = lifeTargetPosition(state, target, context),
    object = targetPosition ? context.objectAt(targetPosition) : null,
    partner = need === "social" ? conversationPartner(state, actor) : null;
  if (!object || (need === "social" && !partner)) return null;
  const { job, created } = createJob(state, {
    id: namedUuid(
      state.id,
      `job:${NEED_JOB_TYPES[need]}:${actor.id}:${state.tick}`,
    ),
    jobType: NEED_JOB_TYPES[need],
    name: target.name,
    priority: threat ? 200 : needJobPriority(actor.life, need),
    targetId: object.id,
    targetPosition,
    requiredCapabilities: [target.capability],
    reason: threat ? "immediate_danger" : `${need}_need`,
    progressTotal: target.duration,
    progressUnit: "life_minute",
    plan: {
      template: NEED_JOB_TYPES[need],
      step: "satisfy_need",
      need,
      ...(threat ? { threatIncidentId: threat.id } : {}),
      lifeJob: true,
      ownerActorId: actor.id,
      ...(foodStockpile
        ? {
            foodStockpileKey: foodStockpile.key,
            needGainMultiplier: survivalFoodGain(foodStockpile),
          }
        : {}),
      companionAutonomous: actor.actorKind === "companion",
      autonomous: actor.actorKind === "companion",
      ...(partner ? { partnerId: partner.id } : {}),
      ...(target.accessPosition
        ? { accessPosition: target.accessPosition }
        : {}),
      ...(target.fixtureId ? { shelterFixtureId: target.fixtureId } : {}),
    },
  });
  if (created) events.push(jobEvent(state, "job_posted", job));
  return job;
}

function ownedLifeJob(state, actorId) {
  return state.village.jobs.find(
    (job) =>
      job.plan?.lifeJob &&
      job.plan.ownerActorId === actorId &&
      !["completed", "cancelled"].includes(job.status),
  );
}

function lifeJobTargetRefreshDue(job, context) {
  if (!job?.plan?.lifeJob) return false;
  if (job.plan.targetRefreshRequired) return true;
  if (["reserved", "active"].includes(job.status)) return false;
  if (job.status === "blocked" && job.blockingReason === "target_missing")
    return true;
  const object = context.objectAt(job.targetPosition);
  return !object || object.id !== job.targetId;
}

function refreshLifeJobTarget(state, actor, job, context) {
  if (!job?.plan?.lifeJob || !job.plan.need) return job;
  if (!lifeJobTargetRefreshDue(job, context)) return job;
  const target = lifeTarget(state, actor, job.plan.need),
    position = lifeTargetPosition(state, target, context),
    object = position ? context.objectAt(position) : null;
  if (!object) return job;
  job.targetId = object.id;
  job.targetPosition = { ...position };
  if (target.accessPosition)
    job.plan.accessPosition = { ...target.accessPosition };
  if (target.fixtureId) job.plan.shelterFixtureId = target.fixtureId;
  delete job.plan.cachedPath;
  delete job.plan.targetRefreshRequired;
  if (job.status !== "blocked" || job.blockingReason !== "target_missing")
    return job;
  releaseJobReservations(state, job.id, "life_target_rebound");
  job.assignedActorId = null;
  transitionJob(job, "available", state.tick);
  job.nextAssignmentAtTick = state.tick + 1;
  actor.workState = "available";
  return job;
}

function cancelResolvedThreatJob(state, actor, job, events) {
  if (!job?.plan?.threatIncidentId) return job;
  const active = state.village.incidents.some(
    (incident) =>
      incident.id === job.plan.threatIncidentId &&
      incident.status !== "resolved",
  );
  if (active) return job;
  cancelJob(state, job, "danger_resolved");
  actor.workState = "available";
  events.push(
    jobEvent(state, "job_cancelled", job, { reason: "danger_resolved" }),
  );
  return null;
}

function cancelDeferredLifeJob(state, actor, job, events) {
  if (!job?.plan?.lifeJob || state.village.clock.block !== "work") return job;
  const need = job.plan.need;
  if (
    job.jobType === "eat_meal" ||
    (!OPTIONAL_LIFE_NEEDS.has(need) &&
      actor.life.needs[need] < needAttentionThreshold(actor.life, need)) ||
    (OPTIONAL_LIFE_NEEDS.has(need) &&
      actor.life.needs[need] < needAttentionThreshold(actor.life, need) &&
      !hasReadyProductiveWork(state, actor))
  )
    return job;
  cancelJob(state, job, "scheduled_work_resumed");
  actor.workState = "available";
  events.push(
    jobEvent(state, "job_cancelled", job, {
      reason: "scheduled_work_resumed",
    }),
  );
  return null;
}

function hasReadyProductiveWork(state, actor) {
  return state.village.jobs.some(
    (job) =>
      !job.plan?.lifeJob &&
      (readyForSkillChoice(state, actor, job, { allowWorking: true }) ||
        resumableProductiveWork(state, actor, job)),
  );
}

function resumableProductiveWork(state, actor, job) {
  return (
    job.status === "suspended" &&
    job.assignedActorId === actor.id &&
    !job.plan?.commissionSuspended &&
    !job.plan?.budgetBlocked &&
    constructionReadyForAssignment(job) &&
    !jobResourceBlocker(state, job) &&
    actorCanPerform(actor, job, { allowWorking: true })
  );
}

function optionalLifeCapacityAvailable(state, need) {
  if (!OPTIONAL_LIFE_NEEDS.has(need) || state.village.scenario !== "founding")
    return true;
  return (
    state.village.jobs.filter(
      (job) =>
        job.plan?.lifeJob &&
        OPTIONAL_LIFE_NEEDS.has(job.plan.need) &&
        !["completed", "cancelled"].includes(job.status),
    ).length < FOUNDING_OPTIONAL_LIFE_JOB_LIMIT
  );
}

function lifeNeedCanInterrupt(state, actor, need) {
  if (!OPTIONAL_LIFE_NEEDS.has(need)) return true;
  if (!optionalLifeCapacityAvailable(state, need)) return false;
  return (
    state.village.clock.block !== "work" ||
    !hasReadyProductiveWork(state, actor)
  );
}

function cancelLifeJobOutsideCamp(state, actor, job, events) {
  const expedition = actorExpeditionJob(state, actor);
  if (!job || !expedition) return job;
  const camp = geologyPlanContext(state).fieldCamps.find(
    (candidate) => candidate.id === expedition.plan.remoteTravel.fieldCampId,
  );
  if (camp?.bedFixtureIds?.includes(job.plan.shelterFixtureId)) return job;
  const assigned = villageWorkActor(state, job.assignedActorId);
  cancelJob(state, job, "expedition_camp_retarget");
  if (assigned) assigned.workState = "available";
  events.push(
    jobEvent(state, "job_cancelled", job, {
      reason: "expedition_camp_retarget",
      fieldCampId: camp?.id ?? null,
    }),
  );
  return null;
}

function cancelStaleLifeJob(state, actor, current, recommended, events) {
  const urgentNeed = urgentSurvivalNeed(state, actor),
    critical =
      Boolean(urgentNeed) ||
      (recommended && actor.life.needs[recommended.need] <= 25),
    committedMeal = current?.jobType === "eat_meal",
    survivalInterruption = urgentNeed && current?.plan?.need !== urgentNeed,
    replaceable =
      current?.plan?.lifeJob &&
      !committedMeal &&
      (["available", "blocked", "suspended"].includes(current.status) ||
        (survivalInterruption &&
          ["reserved", "active"].includes(current.status)));
  if (unavailableFoodCannotReplaceRecovery(state, actor, current, urgentNeed))
    return critical;
  if (
    !current ||
    !critical ||
    current.plan.need === (urgentNeed ?? recommended.need)
  )
    return critical;
  if (!replaceable) return critical;
  const assigned = villageWorkActor(state, current.assignedActorId);
  cancelJob(state, current, "critical_need_changed");
  if (assigned) assigned.workState = "available";
  events.push(
    jobEvent(state, "job_cancelled", current, {
      reason: "critical_need_changed",
    }),
  );
  return critical;
}

function unavailableFoodCannotReplaceRecovery(state, actor, current, need) {
  return Boolean(
    need === "hunger" &&
    !availableSurvivalFood(state) &&
    current?.plan?.lifeJob &&
    ["fatigue", "safety"].includes(current.plan.need) &&
    actor.life.needs[current.plan.need] <= SURVIVAL_WARNING_THRESHOLD &&
    ["reserved", "active"].includes(current.status),
  );
}

function survivalActorOrder(state, left, right) {
  const leftNeed = urgentSurvivalNeed(state, left),
    rightNeed = urgentSurvivalNeed(state, right),
    leftScore = leftNeed ? left.life.needs[leftNeed] : 101,
    rightScore = rightNeed ? right.life.needs[rightNeed] : 101;
  return leftScore - rightScore || left.id.localeCompare(right.id);
}

// function-length-exempt: template -- declarative survival-job policy
function postNeedJobs(state, context, events) {
  const actors = villageWorkActors(state)
    .filter(
      (actor) =>
        actor.life &&
        (actor.actorKind !== "companion" ||
          state.village.partyMovement === "dispersed"),
    )
    .sort((left, right) => survivalActorOrder(state, left, right));
  for (const actor of actors) {
    releaseCriticalSocialClaims(state, actor, events);
    const urgentNeed = urgentSurvivalNeed(state, actor),
      recommended = urgentNeed
        ? { need: urgentNeed }
        : actor.life.recommendation,
      refreshed = refreshLifeJobTarget(
        state,
        actor,
        ownedLifeJob(state, actor.id),
        context,
      ),
      scheduled = cancelDeferredLifeJob(state, actor, refreshed, events),
      resolvedCurrent = cancelResolvedThreatJob(
        state,
        actor,
        scheduled,
        events,
      ),
      current = cancelLifeJobOutsideCamp(state, actor, resolvedCurrent, events),
      critical = cancelStaleLifeJob(state, actor, current, recommended, events);
    if (
      actor.actorKind === "companion" &&
      companionJobOpen(state, actor.id) &&
      !current &&
      !critical
    )
      continue;
    if (lifeActorClaimed(state, actor.id)) continue;
    const needs = Object.keys(actor.life.needs)
      .filter(
        (need) =>
          lifeNeedCanInterrupt(state, actor, need) &&
          (need === urgentNeed ||
            actor.life.needs[need] < needAttentionThreshold(actor.life, need)),
      )
      .sort(
        (left, right) =>
          Number(right === urgentNeed) - Number(left === urgentNeed) ||
          (state.village.clock.block === "work"
            ? 0
            : Number(OPTIONAL_LIFE_NEEDS.has(left)) -
              Number(OPTIONAL_LIFE_NEEDS.has(right))) ||
          needJobPriority(actor.life, right) -
            needJobPriority(actor.life, left) ||
          left.localeCompare(right),
      );
    for (const need of needs)
      if (postNeedJob(state, actor, need, context, events)) break;
  }
}

function updateVillageLives(state) {
  syncResidentHousing(state);
  advanceTownClock(state.village.clock);
  const danger = villageDangerActive(state);
  for (const actor of villageWorkActors(state))
    if (actor.life) updateLifeState(actor.life, state.village.clock, danger);
  if (state.village.adventurersPresent !== false)
    for (const life of state.village.playerCharacterStates)
      updateLifeState(life, state.village.clock, danger);
}

function refreshScheduleScores(state) {
  for (const job of state.village.jobs) {
    const actor = job.plan?.ownerActorId
      ? villageWorkActor(state, job.plan.ownerActorId)
      : null;
    if (job.plan?.lifeJob && actor?.life)
      job.basePriority = job.plan.threatIncidentId
        ? 200
        : needJobPriority(actor.life, job.plan.need);
    else {
      job.basePriority ??= job.priority;
      if (foundingFarmDelivery(state, job))
        job.basePriority = Math.max(job.basePriority, 160);
    }
    const block = actor?.life?.scheduleBlock ?? state.village.clock.block;
    job.scheduleModifier = scheduleJobModifier(block, job.jobType);
    job.priority = job.basePriority + job.scheduleModifier;
  }
}

function foundingFarmDelivery(state, job) {
  if (
    state.village.scenario !== "founding" ||
    state.village.facilities.includes("farmstead") ||
    !job.plan?.constructionDelivery
  )
    return false;
  return state.village.jobs.some(
    (parent) =>
      parent.id === job.plan.parentJobId &&
      parent.jobType === "build_farmstead",
  );
}

function workOrderAccountability(state, workOrderId) {
  if (!workOrderId) return {};
  const order = state.village.development?.workOrders?.find(
    (candidate) => candidate.id === workOrderId,
  );
  if (!order) return { workOrderId };
  return {
    workOrderId: order.id,
    proposalId: order.proposalId,
    decisionId: order.decisionId,
    commissionId: order.commissionId,
    allowedActorIds: [...(order.assignments?.crewActorIds ?? [])],
  };
}

function parentProjectAccountability(parent) {
  return Object.fromEntries(
    [
      "workOrderId",
      "proposalId",
      "decisionId",
      "commissionId",
      "allowedActorIds",
    ]
      .filter((key) => parent.plan?.[key] != null)
      .map((key) => [
        key,
        Array.isArray(parent.plan[key])
          ? [...parent.plan[key]]
          : parent.plan[key],
      ]),
  );
}

function facilityProductionTemplate(state, template, planDetails = {}) {
  if (template.jobType === "craft_fishing_net")
    return fishingHutProductionTemplate(state, template);
  if (template.jobType !== "saw_lumber") return template;
  const building = state.village.buildings.find(
      (candidate) => candidate.key === "lumber_yard",
    ),
    bench = state.village.fixtures.find(
      (fixture) =>
        fixture.buildingId === building?.id && fixture.role === "sawbench",
    );
  if (!building || !bench)
    return {
      ...template,
      targetPosition: {
        x: template.targetPosition.x + (planDetails.parallelSlot ?? 0),
        y: template.targetPosition.y,
      },
    };
  return {
    ...template,
    targetPosition: {
      x: bench.x + (planDetails.parallelSlot ?? 0),
      y: bench.y,
    },
    accessPosition: { ...building.door },
  };
}

function fishingHutProductionTemplate(state, template) {
  const operations = syncFishingHutOperations(state);
  if (!operations) return template;
  return {
    ...template,
    targetPosition: { x: operations.bench.x, y: operations.bench.y },
    accessPosition: { ...operations.building.door },
  };
}

function pastureContainsAnimal(pasture, animal) {
  return (
    animal.position.x >= pasture.x &&
    animal.position.x < pasture.x + pasture.w &&
    animal.position.y >= pasture.y &&
    animal.position.y < pasture.y + pasture.h
  );
}

function currentAnimalPasture(state, animal) {
  return state.village.pastures?.find(
    (pasture) =>
      pasture.id === animal?.homePastureId ||
      (animal && pastureContainsAnimal(pasture, animal)),
  );
}

function refreshProductionTarget(state, job, template, context) {
  if (!template.accessPosition) return;
  const reader = context.workObjectAt ?? context.objectAt,
    target = reader(template.targetPosition);
  if (!target) return;
  job.targetId = target.id;
  job.targetPosition = { ...template.targetPosition };
  job.plan.accessPosition = { ...template.accessPosition };
  delete job.plan.cachedPath;
  if (job.status !== "blocked" || job.blockingReason !== "target_missing")
    return;
  transitionJob(job, "available", state.tick);
  job.nextAssignmentAtTick = state.tick + 1;
}

function refreshFishingTarget(state, job, template, planDetails, context) {
  if (!planDetails.waterHarvest) return;
  const target = productionTarget(
    state,
    template,
    planDetails,
    context,
    template.targetPosition,
  );
  if (!target) return;
  job.targetId = target.id;
  job.targetPosition = { ...template.targetPosition };
  job.plan.waterHarvest = true;
  job.plan.fishingPosition = { ...planDetails.fishingPosition };
  delete job.plan.cachedPath;
  if (
    job.status === "blocked" &&
    ["destination_occupied", "destination_unreachable", "no_path"].includes(
      job.blockingReason,
    )
  ) {
    transitionJob(job, "available", state.tick);
    job.nextAssignmentAtTick = state.tick + 1;
  }
}

function cropPlotYield(template, crop) {
  const cells = crop?.queue?.cells.length ?? 16,
    scale = Math.max(1, cells / 16);
  return template.outputQuantity * scale;
}

function reusableRequirementMatches(job, template) {
  if (!template.requirementKey) return true;
  return job.production?.inputs?.some(
    (input) =>
      input.stockpileKey === template.requirementKey &&
      input.consume === false &&
      input.quantity === (template.requirementQuantity ?? 1),
  );
}

function postProductionJob(state, template, context, events, planDetails = {}) {
  template = facilityProductionTemplate(state, template, planDetails);
  const crop = cropActionForJob(state, template.jobType);
  if (template.jobType === "fertilize_fields") {
    const plot = state.village.cropPlots
      .filter(
        (candidate) =>
          ["fallow", "prepared"].includes(candidate.stage) &&
          (candidate.fertility ?? 60) < 100,
      )
      .sort((left, right) => left.fertility - right.fertility)[0];
    if (!plot) return null;
    template = { ...template, targetPosition: { ...plot.workPosition } };
    planDetails = { ...planDetails, fertilityPlotId: plot.id };
  }
  if (template.jobType === "water_fields") {
    const plot = state.village.cropPlots
      .filter(
        (candidate) =>
          ["germinating", "growing"].includes(candidate.stage) &&
          (candidate.moisture ?? 70) < 60,
      )
      .sort((left, right) => left.moisture - right.moisture)[0];
    if (!plot) return null;
    const emergency = (plot.moisture ?? 70) <= 20,
      reserveCritical = foundingFoodReserveCritical(state);
    template = {
      ...template,
      priority:
        emergency || reserveCritical
          ? Math.max(template.priority, emergency ? 150 : 136)
          : template.priority,
      targetPosition: { ...plot.workPosition },
    };
    planDetails = {
      ...planDetails,
      waterPlotId: plot.id,
      foodReserveDuty: emergency || reserveCritical,
      emergencyFoodDuty: emergency || reserveCritical,
      allowMissingInput: true,
      reason: emergency ? "crop_drought_emergency" : "crop_moisture_low",
    };
  }
  if (template.jobType === "treat_crop_disease") {
    const plot = state.village.cropPlots
      .filter((candidate) => (candidate.cropDamage ?? 0) >= 20)
      .sort((left, right) => right.cropDamage - left.cropDamage)[0];
    if (!plot) return null;
    template = { ...template, targetPosition: { ...plot.workPosition } };
    planDetails = { ...planDetails, cropTreatmentPlotId: plot.id };
  }
  if (["grow_grain", "grow_vegetables"].includes(template.jobType)) {
    if (!crop) return null;
    const wholePlotOutputQuantity = cropPlotYield(template, crop);
    template =
      crop.action === "prepare"
        ? { ...template, inputKey: null, outputKey: null, duration: 2 }
        : ["recover", "cut"].includes(crop.action)
          ? { ...template, inputKey: null, outputKey: null, duration: 2 }
          : crop.action === "sow"
            ? {
                ...template,
                inputKey:
                  crop.queue.completedCount === 0 &&
                  !(crop.plot.pendingSeedBatchIds?.length > 0)
                    ? template.inputKey
                    : null,
                outputKey: null,
                duration: 2,
              }
            : { ...template, inputKey: null, duration: 3 };
    if (crop.action === "harvest")
      template = {
        ...template,
        outputQuantity: wholePlotOutputQuantity / crop.queue.cells.length,
      };
    planDetails = {
      ...planDetails,
      foodReserveDuty:
        ["prepare", "sow", "harvest", "recover"].includes(crop.action) &&
        foundingFoodReserveCritical(state),
      reason:
        planDetails.reason ??
        (foundingFoodReserveCritical(state)
          ? "food_reserve_emergency"
          : "seasonal_crop_cycle"),
      cropAction: crop.action,
      cropPlotId: crop.plot.id,
      cropQueueId: crop.queue.id,
      cropCellKey: crop.cell.key,
      cropGrowthTicks: crop.definition.growthTicks,
      ...(crop.action === "harvest" ? { wholePlotOutputQuantity } : {}),
    };
    if (planDetails.foodReserveDuty)
      template = { ...template, priority: Math.max(template.priority, 136) };
  }
  if (planDetails.construction) {
    const requirements = constructionMaterialRequirements(
      planDetails.construction,
    );
    template = {
      ...template,
      inputKey: null,
      requirements: [...(template.requirements ?? []), ...requirements],
    };
  }
  let existing = state.village.jobs.find(
    (job) =>
      job.jobType === template.jobType &&
      job.plan?.parallelSlot === planDetails.parallelSlot &&
      !["completed", "cancelled"].includes(job.status),
  );
  if (existing && !reusableRequirementMatches(existing, template)) {
    cancelJob(state, existing, "equipment_requirement_changed");
    events.push(
      jobEvent(state, "job_cancelled", existing, {
        reason: "equipment_requirement_changed",
      }),
    );
    existing = null;
  }
  if (existing) {
    existing.basePriority = template.priority;
    if (template.skill) existing.plan.skills = [template.skill];
    existing.plan.foodReserveDuty = Boolean(planDetails.foodReserveDuty);
    existing.plan.emergencyFoodDuty = Boolean(planDetails.emergencyFoodDuty);
    if (planDetails.allowedActorIds)
      existing.plan.allowedActorIds = [...planDetails.allowedActorIds];
    if (planDetails.reason) existing.reason = planDetails.reason;
    refreshProductionTarget(state, existing, template, context);
    refreshFishingTarget(state, existing, template, planDetails, context);
    return existing;
  }
  if (
    !planDetails.construction &&
    !planDetails.allowMissingInput &&
    !productionReady(state, template)
  )
    return null;
  const animals = template.animalSpecies
      ? animalProductionCandidates(
          state,
          template.animalSpecies,
          template.animalEffect ?? "milk",
        ).sort(
          (left, right) =>
            left.position.y - right.position.y ||
            left.position.x - right.position.x ||
            left.name.localeCompare(right.name),
        )
      : [],
    animalIndex = ["slaughter", "hunt"].includes(template.animalEffect)
      ? animals.length - 1
      : 0,
    selectedAnimal = planDetails.animalTargetId
      ? animals.find((candidate) => candidate.id === planDetails.animalTargetId)
      : null,
    animal = selectedAnimal ?? animals[animalIndex] ?? null,
    animalPasture = animal ? currentAnimalPasture(state, animal) : null,
    relocationDestination =
      template.animalEffect === "relocate"
        ? animalHousingDestination(state, animal)
        : null,
    targetPosition =
      animal?.position ?? crop?.cell.position ?? template.targetPosition,
    target = productionTarget(
      state,
      template,
      planDetails,
      context,
      targetPosition,
    ),
    production = productionSpec(
      state,
      template,
      Boolean(planDetails.construction),
    ),
    collectsInput = production.inputs.some((input) => input.requiresPickup),
    accountability = workOrderAccountability(state, planDetails.workOrderId);
  if (!target) return null;
  const { job, created } = createJob(state, {
    id: economyJobId(state, template),
    jobType: template.jobType,
    name: template.name,
    priority: template.priority,
    targetId: target.id,
    targetPosition,
    requiredCapabilities: [template.capability],
    reason:
      planDetails.reason ??
      (template.animalSpecies
        ? `${template.animalSpecies}_${template.animalEffect ?? "care"}`
        : `${template.outputKey}_below_threshold`),
    progressTotal: template.duration * 30,
    progressUnit: "work_minute",
    plan: {
      template: template.jobType,
      ...(template.animalSpecies ? { animalTarget: true } : {}),
      ...(template.animalSpecies
        ? { animalSpecies: template.animalSpecies }
        : {}),
      ...(template.animalEffect ? { animalEffect: template.animalEffect } : {}),
      ...(template.animalEffect === "relocate"
        ? {
            animalRelocation: true,
            relocationPastureId: animal?.pendingPastureId ?? null,
            relocationDestination,
          }
        : {}),
      step: collectsInput ? "to_input" : "produce",
      ...(template.facilityKey ? { facilityKey: template.facilityKey } : {}),
      ...(template.accessPosition
        ? { accessPosition: template.accessPosition }
        : {}),
      ...(animalPasture ? { accessPosition: { ...animalPasture.gate } } : {}),
      practiceUnits: template.duration,
      ...(template.skill ? { skills: [template.skill] } : {}),
      ...accountability,
      ...planDetails,
    },
    production,
  });
  if (planDetails.construction) {
    for (const input of job.production.inputs)
      if (input.consume && input.requiresPickup) input.deliveredQuantity ??= 0;
    ensureConstructionWork(job);
    if (created) markVillageArchitectureDirty(state);
  }
  if (created) events.push(jobEvent(state, "job_posted", job));
  if (created && crop) claimCropWorkCell(crop.plot, crop.cell.key, job.id);
  return job;
}

function assignCropCrewSlots(jobs) {
  const used = new Set(
    jobs.map((job) => job.plan.parallelSlot).filter(Number.isInteger),
  );
  for (const job of jobs.filter(
    (candidate) => !Number.isInteger(candidate.plan.parallelSlot),
  )) {
    let slot = 0;
    while (used.has(slot)) slot += 1;
    job.plan.parallelSlot = slot;
    job.plan.parallelProduction = true;
    used.add(slot);
  }
}

function postCropCrewJobs(state, template, context, events, planDetails) {
  const open = state.village.jobs.filter(
    (job) =>
      job.jobType === template.jobType &&
      job.plan?.cropCellKey &&
      !["completed", "cancelled"].includes(job.status),
  );
  assignCropCrewSlots(open);
  const preview = cropActionForJob(state, template.jobType),
    crewSize = cropCrewSize(state, preview);
  for (let slot = 0; slot < crewSize; slot += 1)
    postProductionJob(state, template, context, events, {
      ...planDetails,
      parallelProduction: true,
      parallelSlot: slot,
    });
}

function cropCrewSize(state, preview) {
  if (!preview) return 0;
  const sharedSize = foundingFoodReserveCritical(state) ? 6 : 3;
  if (["prepare", "harvest", "recover", "cut"].includes(preview.action))
    return sharedSize;
  if (preview.action !== "sow") return 1;
  const seedSecured =
    preview.queue.completedCount > 0 ||
    (preview.plot.pendingSeedBatchIds?.length ?? 0) > 0;
  return seedSecured ? sharedSize : 1;
}

function cancelLegacySawJobs(state, events) {
  for (const job of state.village.jobs.filter(
    (candidate) =>
      candidate.jobType === "saw_lumber" &&
      candidate.plan?.parallelSlot == null &&
      !["completed", "cancelled"].includes(candidate.status),
  )) {
    cancelJob(state, job, "parallel_saw_work_replaced");
    events.push(jobEvent(state, "job_cancelled", job));
  }
}

function postParallelSawJobs(state, template, context, events, planDetails) {
  cancelLegacySawJobs(state, events);
  const jobs = [0, 1].map((parallelSlot) =>
    postProductionJob(state, template, context, events, {
      ...planDetails,
      ...(state.village.scenario === "founding"
        ? { allowedActorIds: foundingSawyerIds(state, parallelSlot) }
        : {}),
      foundingSupplyCritical: state.village.scenario === "founding",
      parallelProduction: true,
      parallelSlot,
    }),
  );
  for (const job of jobs.filter(Boolean))
    job.plan.foundingSupplyCritical = state.village.scenario === "founding";
  return jobs;
}

function foundingSawyerIds(state, parallelSlot) {
  const preferred =
      parallelSlot === 0
        ? new Set(["innkeeper", "herbalist"])
        : new Set(["porter", "carter"]),
    qualified = villageWorkActors(state).filter(
      (actor) =>
        actor.capabilityTags.includes("saw") &&
        actor.workPermissions.allowedJobTypes.includes("saw_lumber"),
    ),
    selected = qualified.filter((actor) => preferred.has(actor.personKey));
  return (selected.length ? selected : qualified).map((actor) => actor.id);
}

function transferReady(state, template) {
  const source = stockpileByKey(state, template.sourceKey),
    target = stockpileByKey(state, template.outputKey);
  return (
    source &&
    target &&
    source.quantity > 0 &&
    (template.alwaysTransfer || target.quantity < target.threshold)
  );
}

function transferQuantity(source, target) {
  return Math.min(1, source.quantity, target.capacity - target.quantity);
}

// function-length-exempt: template -- declarative hauling-job policy
function postTransferJob(state, template, context, events) {
  if (!transferReady(state, template)) return null;
  const source = stockpileByKey(state, template.sourceKey),
    preferredTarget = stockpileByKey(state, template.outputKey),
    objectAt = context.workObjectAt ?? context.objectAt,
    sourceObject = objectAt(source.position),
    destination = template.destinationCellId
      ? storageDestinationAt(
          state,
          preferredTarget.id,
          template.destinationCellId,
          source.position,
          null,
          source.id,
        )
      : storageDestinationFor(
          state,
          preferredTarget.id,
          source.position,
          null,
          source.id,
        ),
    target = stockpile(state, destination?.stockpileId),
    targetObject = target && objectAt(target.position);
  if (!sourceObject || !targetObject || !destination) return null;
  const { job, created } = createJob(state, {
    id: economyJobId(state, template),
    jobType: template.jobType,
    name: template.name,
    priority: template.priority,
    sourceId: sourceObject.id,
    sourcePosition: source.position,
    targetId: targetObject.id,
    targetPosition: target.position,
    requiredCapabilities: [template.capability],
    reason: `${template.outputKey}_below_threshold`,
    progressTotal: 2,
    progressUnit: "stage",
    plan: {
      template: template.jobType,
      step: "to_source",
      parallelSlot: template.parallelSlot ?? null,
      foodReserveDuty: Boolean(template.foodReserveDuty),
      emergencyFoodDuty: Boolean(template.emergencyFoodDuty),
      ...(template.accessPosition
        ? { accessPosition: template.accessPosition }
        : {}),
      storageDestination: destination,
    },
    transfer: {
      itemKind: source.itemKind,
      cargoName: source.name,
      quantity: transferQuantity(source, target),
      carriedQuantity: 0,
      sourceStockpileId: source.id,
      targetStockpileId: target.id,
    },
  });
  job.plan.foodReserveDuty = Boolean(template.foodReserveDuty);
  job.plan.emergencyFoodDuty = Boolean(template.emergencyFoodDuty);
  if (created) events.push(jobEvent(state, "job_posted", job));
  return job;
}

function postFieldHarvestJobs(state, context, events) {
  const piles = state.village.stockpiles.filter(
    (item) => item.containerKind === "field_pile" && item.quantity > 0,
  );
  for (const pile of piles) {
    const existing = state.village.jobs.find(
      (job) =>
        job.transfer?.sourceStockpileId === pile.id &&
        !["completed", "cancelled"].includes(job.status),
    );
    const emergency = foundingFoodReserveCritical(state);
    if (existing) {
      refreshFieldHarvestJob(existing, pile, emergency);
      continue;
    }
    const target = stockpile(state, pile.harvestDestinationStockpileId);
    if (!target) continue;
    postTransferJob(
      state,
      {
        jobType: "haul_stock",
        name: `Haul ${pile.name} to ${target.name}`,
        capability: "haul",
        priority: emergency ? 148 : 104,
        sourceKey: pile.key,
        outputKey: target.key,
        alwaysTransfer: true,
        parallelSlot: `field_harvest:${pile.id}`,
        foodReserveDuty: emergency,
        emergencyFoodDuty: emergency,
        destinationCellId: pile.harvestDestinationCellId,
      },
      context,
      events,
    );
  }
}

function refreshFieldHarvestJob(job, pile, emergency) {
  job.basePriority = emergency ? 148 : 104;
  job.plan.foodReserveDuty = emergency;
  job.plan.emergencyFoodDuty = emergency;
  if (!(job.transfer?.carriedQuantity > 0))
    job.transfer.quantity = Math.min(1, pile.quantity);
}

function foundingMealEmergency(state) {
  return (
    state.village.scenario === "founding" &&
    state.village.npcStates.some(
      (resident) =>
        resident.life?.status !== "dead" && resident.life.needs.hunger <= 25,
    )
  );
}

function foundingFoodReserveCritical(state) {
  if (state.village.scenario !== "founding") return false;
  const reserve = [
    "river_catch",
    "inn_meals",
    "inn_fish",
    "wild_forage",
    "farm_grain",
    "farm_vegetables",
    "dairy_milk",
    "pasture_meat",
    "farm_eggs",
  ].reduce(
    (total, key) => total + (stockpileByKey(state, key)?.quantity ?? 0),
    0,
  );
  return reserve < state.village.npcStates.length * 3;
}

function foundingFishingDuty(state, context) {
  const fisher = state.village.npcStates.find(
    (actor) => actor.personKey === "fisher",
  );
  if (!fisher) return null;
  const open = state.village.jobs.find(
    (job) =>
      job.jobType === "catch_fish" &&
      ["reserved", "active"].includes(job.status),
  );
  if (open && validFishingDuty(state, fisher, open, context))
    return {
      targetPosition: { ...open.targetPosition },
      fishingPosition: { ...open.plan.fishingPosition },
    };
  const installed = installedFishingDuty(state, fisher, context);
  if (installed) return installed;
  const site = bestFishingSite(state, fisher, context);
  if (site) return { targetPosition: site.water, fishingPosition: site.bank };
  const nearby = nearbyReachableWaterDuty(state, fisher, context);
  return nearby
    ? {
        targetPosition: nearby.targetPosition,
        fishingPosition: nearby.accessPosition,
      }
    : null;
}

function installedFishingDuty(state, fisher, context) {
  const jetty = state.village.fixtures.find(
    (fixture) => fixture.role === "fishing_jetty" && fixture.waterCell,
  );
  if (!jetty?.bankPosition) return null;
  const route = analyzeVillagePath(
    state,
    fisher,
    jetty.bankPosition,
    context.terrainAt,
  );
  return route.ok
    ? {
        targetPosition: { x: jetty.x, y: jetty.y },
        fishingPosition: { ...jetty.bankPosition },
      }
    : null;
}

function ensureRegionalFishingJetty(state, duty) {
  if (geologyPlanContext(state).site.mode !== "regional_v3" || !duty) return;
  if (
    state.village.fixtures.some((fixture) => fixture.role === "fishing_jetty")
  )
    return;
  state.village.fixtures.push({
    id: namedUuid(state.id, "regional-fishing-jetty"),
    definitionId: definitionId("village-fixture", "fishing-jetty"),
    entityType: "world-object",
    x: duty.targetPosition.x,
    y: duty.targetPosition.y,
    width: 1,
    height: 1,
    glyph: "J",
    name: "River fishing jetty",
    description: "A timber jetty stands in the river beside a walkable bank.",
    role: "fishing_jetty",
    walkable: true,
    waterCell: true,
    bankPosition: { ...duty.fishingPosition },
  });
}

function bestFishingSite(state, fisher, context) {
  const occupied = occupiedVillageCells(state);
  return foundingFishingSites(state, context)
    .slice(0, 64)
    .map(([bank, water]) => ({
      bank,
      water,
      occupant: villageActorAt(state, bank),
      route: analyzeVillagePath(state, fisher, bank, context.terrainAt),
    }))
    .filter(
      (site) =>
        (!occupied.has(key(site.bank)) || site.occupant?.id === fisher.id) &&
        context.terrainAt(site.water) === "outdoor_water" &&
        site.route.ok,
    )
    .sort((left, right) => left.route.cost - right.route.cost)[0];
}

function cropWaterEmergency(state) {
  return (state.village.cropPlots ?? []).some(
    (plot) =>
      ["germinating", "growing"].includes(plot.stage) &&
      (plot.moisture ?? 70) <= 20,
  );
}

function validFishingDuty(state, fisher, job, context) {
  const bank = job.plan?.fishingPosition,
    occupant = bank && villageActorAt(state, bank);
  return Boolean(
    job.plan?.waterHarvest &&
    bank &&
    fishingWaterCell(state, job.targetPosition, context) &&
    villageMovementCost(context.terrainAt(bank)) != null &&
    (!occupant || occupant.id === job.assignedActorId) &&
    planVillageRoute(state, fisher, bank, context.terrainAt, false).ok,
  );
}

function fishingWaterCell(state, position, context) {
  return (
    context.terrainAt(position) === "outdoor_water" ||
    state.village.fixtures.some(
      (fixture) =>
        fixture.role === "fishing_jetty" &&
        fixture.waterCell &&
        fixture.x === position.x &&
        fixture.y === position.y,
    )
  );
}

function foundingFishingSites(state, context) {
  const water = { x: 0, y: 16 };
  return [
    [{ x: -1, y: 16 }, water],
    [{ x: 1, y: 16 }, water],
    [{ x: 0, y: 15 }, water],
    [{ x: 0, y: 17 }, water],
    ...regionalFishingSites(state, context),
  ];
}

function regionalFishingSites(state, context) {
  const source =
      state.village.development?.masterPlan?.regionalContext?.surveyedSources?.find(
        (item) => item.resources?.includes("fish"),
      ),
    fisher = state.village.npcStates.find(
      (actor) => actor.personKey === "fisher",
    ),
    origin =
      state.village.development?.masterPlan?.regionalContext?.site?.origin;
  if (!source || !fisher) return [];
  const sites = [],
    center = origin
      ? { x: source.position.x - origin.x, y: source.position.y - origin.y }
      : source.position;
  for (let y = center.y - 16; y <= center.y + 16; y += 1)
    for (let x = center.x - 16; x <= center.x + 16; x += 1)
      addRegionalFishingSites(sites, { x, y }, context);
  return sites.sort(
    ([left], [right]) =>
      positionDistance(fisher.position, left) -
      positionDistance(fisher.position, right),
  );
}

function positionDistance(left, right) {
  return Math.abs(left.x - right.x) + Math.abs(left.y - right.y);
}

function addRegionalFishingSites(sites, water, context) {
  if (context.terrainAt(water) !== "outdoor_water") return;
  for (const bank of orthogonalNeighbors(water))
    if (villageMovementCost(context.terrainAt(bank)) != null)
      sites.push([bank, water]);
}

function waterSearchRing(center, radius) {
  const cells = [];
  for (let offset = -radius; offset <= radius; offset += 1) {
    cells.push({ x: center.x + offset, y: center.y - radius });
    cells.push({ x: center.x + offset, y: center.y + radius });
    if (Math.abs(offset) === radius) continue;
    cells.push({ x: center.x - radius, y: center.y + offset });
    cells.push({ x: center.x + radius, y: center.y + offset });
  }
  return cells;
}

function reachableBankAt(state, actor, water, context) {
  if (context.terrainAt(water) !== "outdoor_water") return null;
  return orthogonalNeighbors(water).find(
    (bank) =>
      villageMovementCost(context.terrainAt(bank)) != null &&
      planVillageRoute(state, actor, bank, context.terrainAt, false).ok,
  );
}

function waterBankAnalysis(state, actor, water, context) {
  return orthogonalNeighbors(water)
    .map((bank) => ({
      bank,
      route: analyzeVillagePath(state, actor, bank, context.terrainAt, {
        allowTreeClearing: true,
      }),
    }))
    .filter(({ route }) => route.ok)
    .sort(
      (left, right) =>
        left.route.clearableCells.length - right.route.clearableCells.length ||
        left.route.cost - right.route.cost ||
        key(left.bank).localeCompare(key(right.bank)),
    )[0];
}

function cacheWaterAccess(regional, water, analysis, tick) {
  regional.localWaterAccessSurvey = {
    version: 3,
    targetPosition: { ...water },
    accessPosition: { ...analysis.bank },
    plannedPath: analysis.route.path.map((position) => ({ ...position })),
    routeCost: analysis.route.cost,
    readiness: analysis.route.readiness,
    surveyedAtTick: tick,
  };
}

function surveyedWaterDuty(state, actor, context, regional) {
  const survey = regional.localWaterAccessSurvey;
  if (!survey?.targetPosition || !survey.accessPosition) return null;
  const route = analyzeVillagePath(
    state,
    actor,
    survey.accessPosition,
    context.terrainAt,
    { allowTreeClearing: true },
  );
  if (!route.ok) return null;
  cacheWaterAccess(
    regional,
    survey.targetPosition,
    { bank: survey.accessPosition, route },
    state.tick,
  );
  return route.readiness === "ready"
    ? {
        targetPosition: survey.targetPosition,
        accessPosition: survey.accessPosition,
      }
    : null;
}

function nearbyReachableWaterDuty(state, actor, context) {
  const regional = geologyPlanContext(state),
    cached = regional.localWaterAccessSurvey;
  const surveyed = surveyedWaterDuty(state, actor, context, regional);
  if (surveyed) return surveyed;
  if (cached?.version === 3 && state.tick - cached.surveyedAtTick < 100)
    return null;
  for (let radius = 1; radius <= 128; radius += 1)
    for (const water of waterSearchRing(actor.position, radius)) {
      if (context.terrainAt(water) !== "outdoor_water") continue;
      const analysis = waterBankAnalysis(state, actor, water, context);
      if (!analysis) continue;
      cacheWaterAccess(regional, water, analysis, state.tick);
      return analysis.route.readiness === "ready"
        ? { targetPosition: water, accessPosition: analysis.bank }
        : null;
    }
  regional.localWaterAccessSurvey = {
    version: 3,
    readiness: "not_found",
    surveyedAtTick: state.tick,
  };
  return null;
}

function cancelUnreachableFishing(state, fishingDuty, events) {
  if (fishingDuty) return;
  for (const job of state.village.jobs.filter(
    (candidate) =>
      candidate.jobType === "catch_fish" &&
      !["completed", "cancelled"].includes(candidate.status),
  )) {
    if (!cancelJob(state, job, "fishing_target_unreachable")) continue;
    events.push(
      jobEvent(state, "job_cancelled", job, {
        reason: "fishing_target_unreachable",
      }),
    );
  }
}

function netFishingTemplate(state) {
  if ((stockpileByKey(state, "fishing_nets")?.quantity ?? 0) < 1) return {};
  return {
    name: "Harvest the river with a fishing net",
    requirementKey: "fishing_nets",
    requirementQuantity: 1,
    outputQuantity: 4,
  };
}

// function-length-exempt: template -- declarative economy-job policy
function postResidentEconomyJobs(state, context, events) {
  const forgeOperations = syncForgeOperations(state),
    fishingOperations = syncFishingHutOperations(state),
    foodReserveCritical = foundingFoodReserveCritical(state),
    fishingDuty = foundingFishingDuty(state, context),
    kitchens = state.village.fixtures
      .filter((fixture) => fixture.role === "kitchen")
      .sort(
        (left, right) =>
          Number(Boolean(left.temporary)) - Number(Boolean(right.temporary)) ||
          left.id.localeCompare(right.id),
      ),
    cookTypes = [
      "prepare_meal",
      "bake_grain_meal",
      "cook_vegetable_stew",
      "cook_beef_stew",
      "cook_egg_meal",
    ];
  ensureRegionalFishingJetty(state, fishingDuty);
  cancelUnreachableFishing(state, fishingDuty, events);
  for (const template of RESIDENT_JOB_TEMPLATES) {
    if (
      template.requiredFacility &&
      !state.village.facilities.includes(template.requiredFacility)
    )
      continue;
    if (
      FORGE_JOB_TYPES.has(template.jobType) &&
      !forgeOperations &&
      !state.village.buildings.some(
        (building) =>
          building.key === "smithy" && building.status !== "destroyed",
      )
    )
      continue;
    const foundingCook =
        state.village.scenario === "founding" &&
        [
          "prepare_meal",
          "bake_grain_meal",
          "cook_vegetable_stew",
          "cook_beef_stew",
          "cook_egg_meal",
        ].includes(template.jobType),
      foundingFoodCollection =
        state.village.scenario === "founding" &&
        ["catch_fish", "haul_stock"].includes(template.jobType),
      netFishing =
        template.jobType === "catch_fish" && Boolean(fishingOperations),
      kitchen = foundingCook
        ? kitchens[cookTypes.indexOf(template.jobType) % kitchens.length]
        : null,
      kitchenBuilding = kitchen
        ? state.village.buildings.find(
            (building) => building.id === kitchen.buildingId,
          )
        : null,
      adjusted =
        FORGE_JOB_TYPES.has(template.jobType) && forgeOperations
          ? {
              ...template,
              targetPosition: {
                x: forgeOperations.forge.x,
                y: forgeOperations.forge.y,
              },
              accessPosition: { ...forgeOperations.building.door },
            }
          : foundingCook
            ? {
                ...template,
                priority: Math.max(
                  template.priority,
                  foodReserveCritical ? 140 : 120,
                ),
                targetPosition: kitchen
                  ? {
                      x: kitchen.x + kitchen.width - 1,
                      y: kitchen.y + kitchen.height - 1,
                    }
                  : { x: -14, y: 18 },
                accessPosition: kitchenBuilding?.door ?? null,
              }
            : foundingFoodCollection
              ? {
                  ...template,
                  ...(netFishing ? netFishingTemplate(state) : {}),
                  priority: Math.max(
                    template.priority,
                    foodReserveCritical ? 138 : 118,
                  ),
                  foodReserveDuty: foodReserveCritical,
                  emergencyFoodDuty: foodReserveCritical,
                }
              : netFishing
                ? { ...template, ...netFishingTemplate(state) }
                : template;
    if (
      foundingCook &&
      !state.village.facilities.includes("survival_camp") &&
      !kitchen
    )
      continue;
    if (template.jobType === "catch_fish" && !fishingDuty) continue;
    if (template.jobType === "haul_stock") {
      const hauling =
        state.village.scenario === "founding"
          ? { ...adjusted, accessPosition: null }
          : adjusted;
      postTransferJob(state, hauling, context, events);
    } else {
      const productionJob = postProductionJob(
        state,
        template.jobType === "catch_fish"
          ? { ...adjusted, targetPosition: fishingDuty.targetPosition }
          : adjusted,
        context,
        events,
        template.jobType === "catch_fish"
          ? {
              waterHarvest: true,
              fishingPosition: fishingDuty.fishingPosition,
              foodReserveDuty: foodReserveCritical,
              emergencyFoodDuty: foodReserveCritical,
              allowedActorIds: [
                state.village.npcStates.find(
                  (actor) => actor.personKey === "fisher",
                ).id,
              ],
            }
          : {
              emergencyFoodDuty: foundingCook && foundingMealEmergency(state),
              foodReserveDuty: foundingCook && foodReserveCritical,
            },
      );
      if (productionJob && foundingCook) {
        productionJob.plan.emergencyFoodDuty = foundingMealEmergency(state);
        productionJob.plan.foodReserveDuty = foodReserveCritical;
      }
    }
  }
}

function fieldBoundary(state, survey) {
  return state.village.development.masterPlan.fieldBoundaries.find(
    (candidate) => candidate.key === survey.boundaryKey,
  );
}

function fieldClearingArea(boundary, clearance = boundary.clearance ?? 2) {
  return {
    x: boundary.x - clearance,
    y: boundary.y - clearance,
    width: boundary.w + clearance * 2,
    height: boundary.h + clearance * 2,
  };
}

function fieldInteriorArea(boundary) {
  return {
    x: boundary.x,
    y: boundary.y,
    width: boundary.w,
    height: boundary.h,
  };
}

function surveyedTree(context, position, interior) {
  if (context.terrainAt(position) !== "outdoor_tree") return null;
  const tree = context.objectAt(position);
  return {
    ...position,
    species: tree.species,
    logYield: treeWoodYield(tree.species),
    clearanceTree: !insideArea(position, interior),
  };
}

function scanFieldClearing(state, survey, context, events) {
  const boundary = fieldBoundary(state, survey),
    area = fieldClearingArea(boundary, survey.clearanceRadius ?? 2),
    interior = fieldInteriorArea(boundary),
    trees = [];
  for (let y = area.y; y < area.y + area.height; y += 1)
    for (let x = area.x; x < area.x + area.width; x += 1) {
      const tree = surveyedTree(context, { x, y }, interior);
      if (tree) trees.push(tree);
    }
  const starterArea = leastObstructedStarterArea(boundary, trees),
    starterTreeCells = trees.filter((tree) => insideArea(tree, starterArea));
  Object.assign(survey, {
    status: trees.length ? "clearing" : "cleared",
    surveyedAtTick: state.tick,
    clearedAtTick: trees.length ? null : state.tick,
    treeCells: trees,
    initialTreeCount: trees.length,
    estimatedLogYield: trees.reduce((total, tree) => total + tree.logYield, 0),
    starterArea,
    starterTreeCells,
    starterInitialTreeCount: starterTreeCells.length,
    starterClearedTreeCount: 0,
    starterStatus: starterTreeCells.length ? "clearing" : "cleared",
    starterClearedAtTick: starterTreeCells.length ? null : state.tick,
    clearanceRadius: boundary.clearance ?? 2,
  });
  if (trees.length) state.village.development.nextForestrySurveyAtTick = null;
  events.push(fieldClearingSurveyEvent(state, survey, trees.length));
}

function fieldClearingSurveyEvent(state, survey, treeCount) {
  return {
    type: "field_clearing_surveyed",
    boundaryKey: survey.boundaryKey,
    treeCount,
    estimatedLogYield: survey.estimatedLogYield,
    tick: state.tick,
  };
}

function insideArea(position, area) {
  return (
    position.x >= area.x &&
    position.x < area.x + area.width &&
    position.y >= area.y &&
    position.y < area.y + area.height
  );
}

function leastObstructedStarterArea(boundary, trees) {
  const candidates = [];
  for (let y = boundary.y + 1; y <= boundary.y + boundary.h - 5; y += 1)
    for (let x = boundary.x + 1; x <= boundary.x + boundary.w - 5; x += 1) {
      const area = { x, y, width: 4, height: 4 },
        treeCount = trees.filter((tree) => insideArea(tree, area)).length;
      candidates.push({ area, treeCount });
    }
  return candidates.sort(
    (left, right) =>
      left.treeCount - right.treeCount ||
      left.area.y - right.area.y ||
      left.area.x - right.area.x,
  )[0].area;
}

function ensureFieldClearingSurveys(state, context, events) {
  const surveys = state.village.development.masterPlan.fieldClearingSurveys;
  for (const survey of surveys)
    if (survey.status === "planned" || (survey.clearanceRadius ?? 0) < 2)
      scanFieldClearing(state, survey, context, events);
  return surveys;
}

function focusedFieldTree(state, context, excluded) {
  const farm = state.village.jobs.find(
    (job) =>
      job.jobType === "build_farmstead" &&
      job.plan?.constructionWork &&
      !["completed", "cancelled"].includes(job.status),
  );
  if (!farm) return null;
  const fences = constructionFocusElements(farm).filter(
    (element) =>
      element.kind === "fence" && element.enclosurePurpose === "field",
  );
  for (const fence of fences) {
    const survey =
      state.village.development.masterPlan.fieldClearingSurveys.find(
        (candidate) => candidate.boundaryKey === fence.pastureKey,
      );
    const target = survey?.treeCells.find(
      (tree) =>
        Math.max(
          Math.abs(tree.x - fence.position.x),
          Math.abs(tree.y - fence.position.y),
        ) <= 2 &&
        context.terrainAt(tree) === "outdoor_tree" &&
        !excluded.has(key(tree)),
    );
    if (target) return target;
  }
  return null;
}

function plannedFieldTree(state, context, excluded) {
  if (!state.village.facilities.includes("lumber_yard")) return null;
  const focused = focusedFieldTree(state, context, excluded);
  if (focused) return focused;
  const surveys = state.village.development.masterPlan.fieldClearingSurveys;
  for (const survey of surveys) {
    if (survey.starterStatus === "cleared") continue;
    const remaining = (survey.starterTreeCells ?? []).filter(
        (tree) => context.terrainAt(tree) === "outdoor_tree",
      ),
      starter = remaining.find((tree) => !excluded.has(key(tree)));
    if (starter) return starter;
    if (remaining.length) continue;
    Object.assign(survey, {
      starterStatus: "cleared",
      starterClearedAtTick: state.tick,
    });
  }
  for (const survey of surveys) {
    const remaining = survey.treeCells.filter(
        (tree) => context.terrainAt(tree) === "outdoor_tree",
      ),
      position = remaining.find((tree) => !excluded.has(key(tree)));
    if (position) return position;
    if (remaining.length) continue;
    if (survey.status === "clearing")
      Object.assign(survey, { status: "cleared", clearedAtTick: state.tick });
  }
  return null;
}

function fieldSurveyAt(state, position) {
  return state.village.development.masterPlan.fieldClearingSurveys.find(
    (survey) => survey.treeCells.some((tree) => key(tree) === key(position)),
  );
}

function forestryTarget(state, context, excluded = new Set()) {
  const fieldTarget = plannedFieldTree(state, context, excluded);
  if (fieldTarget) return fieldTarget;
  const origin = { x: -22, y: 18 };
  let candidates = FORESTRY_SITE_CACHE.get(state);
  if (!candidates) {
    candidates = [];
    for (let radius = 2; radius <= 48; radius += 1)
      for (let y = origin.y - radius; y <= origin.y + radius; y += 1)
        for (let x = origin.x - radius; x <= origin.x + radius; x += 1) {
          if (
            Math.max(Math.abs(x - origin.x), Math.abs(y - origin.y)) !== radius
          )
            continue;
          const position = { x, y };
          if (context.terrainAt(position) === "outdoor_tree")
            candidates.push(position);
        }
    candidates.sort(
      (left, right) =>
        Math.abs(left.x - origin.x) +
          Math.abs(left.y - origin.y) -
          (Math.abs(right.x - origin.x) + Math.abs(right.y - origin.y)) ||
        left.y - right.y ||
        left.x - right.x,
    );
    FORESTRY_SITE_CACHE.set(state, candidates);
  }
  for (let index = 0; index < candidates.length;) {
    const position = candidates[index];
    if (excluded.has(key(position))) {
      index += 1;
      continue;
    }
    if (context.terrainAt(position) === "outdoor_tree") return position;
    candidates.splice(index, 1);
  }
  return null;
}

// function-length-exempt: template -- declarative forestry-job policy
function postForestryJobs(state, template, context, events, workOrderId) {
  if (!productionReady(state, template)) return null;
  const remote = state.village.jobs.find(
    (job) =>
      job.jobType === "remote_fell_tree" &&
      !["completed", "cancelled"].includes(job.status),
  );
  if (remote) return remote;
  ensureFieldClearingSurveys(state, context, events);
  if ((state.village.development?.nextForestrySurveyAtTick ?? 0) > state.tick)
    return null;
  const open = state.village.jobs.filter(
      (job) =>
        job.jobType === template.jobType &&
        !["completed", "cancelled"].includes(job.status),
    ),
    toolStock = stockpileByKey(state, template.requirementKey),
    carriedTools = open.reduce(
      (total, job) =>
        total +
        (job.production?.inputs ?? []).reduce(
          (sum, input) =>
            sum + (input.consume === false ? input.carriedQuantity : 0),
          0,
        ),
      0,
    ),
    desired = Math.min(3, (toolStock?.quantity ?? 0) + carriedTools),
    excluded = new Set(
      state.village.jobs
        .filter(
          (job) =>
            job.plan?.terrainEffect &&
            job.targetPosition &&
            !["completed", "cancelled"].includes(job.status),
        )
        .map((job) => key(job.targetPosition)),
    );
  for (let index = open.length; index < desired; index += 1) {
    const targetPosition = forestryTarget(state, context, excluded),
      target = targetPosition ? context.objectAt(targetPosition) : null,
      fieldSurvey = targetPosition
        ? fieldSurveyAt(state, targetPosition)
        : null,
      harvestTemplate = target
        ? { ...template, outputQuantity: treeWoodYield(target.species) }
        : null,
      production = harvestTemplate
        ? productionSpec(state, harvestTemplate)
        : null;
    if (!target || !production) {
      state.village.development.nextForestrySurveyAtTick = state.tick + 240;
      if (template.jobType === "fell_tree")
        regionalResourcePressure(state).timber = "regional_required";
      break;
    }
    state.village.development.nextForestrySurveyAtTick = null;
    excluded.add(key(targetPosition));
    const { job, created } = createJob(state, {
      id: economyJobId(state, template),
      jobType: template.jobType,
      name: template.name,
      priority: template.priority,
      targetId: target.id,
      targetPosition,
      requiredCapabilities: [template.capability],
      reason: fieldSurvey
        ? "approved_field_clearing"
        : "lumber_supply_below_threshold",
      progressTotal: template.duration * 30,
      progressUnit: "work_minute",
      plan: {
        template: template.jobType,
        step: "to_input",
        terrainEffect: fieldSurvey ? "cleared_ground" : "tree_stump",
        ...(fieldSurvey
          ? {
              fieldBoundaryKey: fieldSurvey.boundaryKey,
              intendedWoodUses: [...fieldSurvey.intendedUses],
            }
          : {}),
        ...workOrderAccountability(state, workOrderId),
        practiceUnits: template.duration,
        parallelProduction: true,
      },
      production,
    });
    if (created) events.push(jobEvent(state, "job_posted", job));
  }
  return open;
}

function constructionSiteDecision(state, preferred, result) {
  const rejectedConflicts = result.rejections
    .flatMap((rejection) => rejection.conflicts)
    .reduce((summary, conflict) => {
      summary[conflict.tile] = (summary[conflict.tile] ?? 0) + 1;
      return summary;
    }, {});
  return {
    siteKey: preferred.key,
    preferredOrigin: { x: preferred.x, y: preferred.y },
    selectedOrigin: result.site ? { x: result.site.x, y: result.site.y } : null,
    offset: result.offset,
    attempts: result.attempts,
    rejectedCandidates: result.rejections.length,
    rejectedConflicts,
    tick: state.tick,
  };
}

function acceptConstructionSite(
  development,
  result,
  preferred,
  decision,
  events,
) {
  development.constructionSites.push(result.site);
  if (development.siteIssue?.siteKey === preferred.key)
    delete development.siteIssue;
  events.push({
    type: "construction_site_selected",
    scope: "village",
    ...decision,
  });
  return result.site;
}

function rejectConstructionSite(
  state,
  development,
  preferred,
  result,
  decision,
  events,
) {
  const issue = {
    siteKey: preferred.key,
    reason: "no_valid_site",
    attempts: result.attempts,
    rejectedConflicts: decision.rejectedConflicts,
    retryAfterTick: state.tick + 240,
    ...(preferred.key === "farmstead"
      ? { fieldLayoutSignature: fieldLayoutSignature(state) }
      : {}),
  };
  development.siteIssue = issue;
  events.push({
    type: "construction_site_rejected",
    scope: "village",
    tick: state.tick,
    ...issue,
  });
  return null;
}

function searchConstructionSite(state, development, preferred, context) {
  const template =
      state.village.scenario === "founding"
        ? preferred
        : { ...preferred, enclosures: [] },
    result = findConstructionSite(template, context.terrainAt, {
      reservedSites: development.constructionSites,
      fixedEnclosurePurposes: preferred.key === "farmstead" ? ["field"] : [],
      candidateFilter: preferred.requiresTownAccess
        ? (site) => constructionSiteReachable(state, site, context)
        : null,
    });
  if (result.site && template !== preferred)
    result.site = translateConstructionSite(
      preferred,
      result.offset.x,
      result.offset.y,
    );
  return result;
}

function fieldSite(boundary) {
  const site = { ...structuredClone(boundary), door: { ...boundary.gate } };
  delete site.gate;
  return site;
}

function fieldLayoutSignature(state) {
  return state.village.development.masterPlan.fieldBoundaries
    .map(({ key, x, y, w, h }) => `${key}:${x},${y},${w},${h}`)
    .join("|");
}

function restoredFieldBoundary(site) {
  const boundary = { ...structuredClone(site), gate: { ...site.door } };
  delete boundary.door;
  return boundary;
}

function archiveFieldSurvey(survey, boundary, tick) {
  survey.revisions ??= [];
  survey.revisions.push({
    boundary: structuredClone(boundary),
    status: survey.status,
    clearedTreeCount: survey.clearedTreeCount ?? 0,
    clearedLogYield: survey.clearedLogYield ?? 0,
    supersededAtTick: tick,
    reason: "construction_clearance_conflict",
  });
}

function resetFieldSurvey(survey) {
  Object.assign(survey, {
    status: "planned",
    surveyedAtTick: null,
    clearedAtTick: null,
    treeCells: [],
    initialTreeCount: 0,
    clearedTreeCount: 0,
    estimatedLogYield: 0,
    clearedLogYield: 0,
  });
  for (const key of Object.keys(survey))
    if (key.startsWith("starter")) delete survey[key];
}

function cancelSupersededFieldJobs(state, boundaryKey) {
  for (const job of state.village.jobs.filter(
    (candidate) =>
      candidate.plan?.fieldBoundaryKey === boundaryKey &&
      !["completed", "cancelled"].includes(candidate.status),
  ))
    cancelJob(state, job, "field_site_replanned");
}

function replanFieldBoundary(state, boundary, reserved, context, events) {
  const result = findConstructionSite(fieldSite(boundary), context.terrainAt, {
    reservedSites: reserved,
    maxRadius: 32,
  });
  if (!result.site) {
    state.village.development.masterPlan.fieldSiteIssues ??= {};
    state.village.development.masterPlan.fieldSiteIssues[boundary.key] = {
      reason: "no_valid_field_site",
      attempts: result.attempts,
      retryAfterTick: state.tick + 240,
    };
    return boundary;
  }
  const replacement = restoredFieldBoundary(result.site),
    survey = state.village.development.masterPlan.fieldClearingSurveys.find(
      (candidate) => candidate.boundaryKey === boundary.key,
    );
  delete state.village.development.masterPlan.fieldSiteIssues?.[boundary.key];
  if (survey) {
    archiveFieldSurvey(survey, boundary, state.tick);
    resetFieldSurvey(survey);
  }
  cancelSupersededFieldJobs(state, boundary.key);
  events.push({
    type: "founding_field_replanned",
    boundaryKey: boundary.key,
    previousOrigin: { x: boundary.x, y: boundary.y },
    selectedOrigin: { x: replacement.x, y: replacement.y },
    tick: state.tick,
  });
  return replacement;
}

function repairFoundingFieldLayout(state, context, events) {
  const plan = state.village.development.masterPlan,
    reserved = [...state.village.development.constructionSites];
  plan.fieldBoundaries = plan.fieldBoundaries.map((boundary) => {
    const valid = assessConstructionSite(
        fieldSite(boundary),
        context.terrainAt,
        {
          reservedSites: reserved,
        },
      ).valid,
      deferred =
        state.tick <
        (plan.fieldSiteIssues?.[boundary.key]?.retryAfterTick ?? 0),
      selected = valid
        ? boundary
        : deferred
          ? boundary
          : replanFieldBoundary(state, boundary, reserved, context, events);
    reserved.push(selected);
    return selected;
  });
  const issue = state.village.development.siteIssue;
  if (
    issue?.siteKey === "farmstead" &&
    issue.fieldLayoutSignature !== fieldLayoutSignature(state)
  )
    delete state.village.development.siteIssue;
}

function constructionSiteReachable(state, site, context) {
  const pathfinder = state.village.npcStates.find(
    (actor) => actor.personKey === "carter",
  );
  if (!pathfinder) return false;
  return [site.door, ...(site.secondaryDoors ?? [])].every((door) =>
    exteriorDoorApproaches(site, door).some(
      (position) =>
        planVillageTerrainRoute(
          state,
          pathfinder,
          position,
          context.terrainAt,
          true,
        ).ok,
    ),
  );
}

function exteriorDoorApproaches(site, door) {
  return orthogonalNeighbors(door).filter(
    (position) =>
      position.x < site.x ||
      position.x >= site.x + site.w ||
      position.y < site.y ||
      position.y >= site.y + site.h,
  );
}

function foundingPlan(state, key) {
  return foundingFacilityPlan(
    key,
    state.village.development.masterPlan.fieldBoundaries,
  );
}

function sameFieldGeometry(left, right) {
  return (
    left?.x === right?.x &&
    left?.y === right?.y &&
    left?.w === right?.w &&
    left?.h === right?.h &&
    (left?.clearance ?? 0) === (right?.clearance ?? 0) &&
    left?.gate?.x === right?.gate?.x &&
    left?.gate?.y === right?.gate?.y
  );
}

function correctedFarmEnclosures(state, site) {
  const boundaries = state.village.development.masterPlan.fieldBoundaries;
  return site.enclosures.map((enclosure) => {
    if ((enclosure.purpose ?? "pasture") !== "field") return enclosure;
    const boundary = boundaries.find((item) => item.key === enclosure.key);
    return boundary ? structuredClone(boundary) : enclosure;
  });
}

function driftingFarmJob(state) {
  return state.village.jobs.find(
    (job) =>
      job.jobType === "build_farmstead" &&
      !["completed", "cancelled"].includes(job.status) &&
      state.village.development.masterPlan.fieldClearingSurveys.some(
        (survey) => (survey.revisions?.length ?? 0) > 8,
      ),
  );
}

function recoverFieldRevision(state, survey, job, events) {
  if (!survey?.revisions) return null;
  const index = survey.revisions.findIndex(
    (entry) => entry.supersededAtTick > job.createdAtTick,
  );
  if (index < 0) return null;
  const recovered = structuredClone(survey.revisions[index].boundary),
    discarded = survey.revisions.length - index - 1;
  survey.revisions = survey.revisions.slice(0, index + 1);
  survey.driftRecovery = {
    recoveredAtTick: state.tick,
    discardedRevisions: discarded,
    reason: "post_blueprint_self_collision",
  };
  resetFieldSurvey(survey);
  events.push({
    type: "founding_field_drift_recovered",
    boundaryKey: survey.boundaryKey,
    selectedOrigin: { x: recovered.x, y: recovered.y },
    discardedRevisions: discarded,
    tick: state.tick,
  });
  return recovered;
}

function repairDriftingFarmFields(state, events) {
  const job = driftingFarmJob(state);
  if (!job) return;
  const plan = state.village.development.masterPlan;
  plan.fieldBoundaries = plan.fieldBoundaries.map((boundary) => {
    const survey = plan.fieldClearingSurveys.find(
      (candidate) => candidate.boundaryKey === boundary.key,
    );
    return recoverFieldRevision(state, survey, job, events) ?? boundary;
  });
}

function cancelMisalignedFarmChildJobs(state) {
  const parent = state.village.jobs.find(
    (job) =>
      job.jobType === "build_farmstead" &&
      !["completed", "cancelled"].includes(job.status),
  );
  if (!parent?.plan?.constructionWork) return;
  const valid = new Set(
    parent.plan.constructionWork.elements.flatMap((element) => [
      key(element.position),
      key(constructionElementWorkPosition(parent, element)),
    ]),
  );
  for (const job of state.village.jobs.filter(
    (candidate) =>
      candidate.plan?.parentJobId === parent.id &&
      !["completed", "cancelled"].includes(candidate.status) &&
      candidate.targetPosition &&
      !valid.has(key(candidate.targetPosition)),
  ))
    cancelJob(state, job, "construction_geometry_recovered");
}

function repairFarmFieldGeometry(state, events) {
  const job = state.village.jobs.find(
    (candidate) =>
      candidate.jobType === "build_farmstead" &&
      !["completed", "cancelled"].includes(candidate.status),
  );
  if (!job?.plan?.construction?.enclosures) return;
  const site = job.plan.construction,
    corrected = correctedFarmEnclosures(state, site),
    changed = corrected.some(
      (enclosure, index) =>
        !sameFieldGeometry(enclosure, site.enclosures[index]),
    );
  if (!changed) return;
  const planned = constructionElements({ ...site, enclosures: corrected }),
    replacements = new Map(planned.map((element) => [element.key, element]));
  for (const element of job.plan.constructionWork?.elements ?? []) {
    const replacement = replacements.get(element.key);
    if (!replacement || element.enclosurePurpose !== "field") continue;
    if (element.materialDelivered || element.status !== "planned") return;
    element.position = { ...replacement.position };
  }
  site.enclosures = corrected;
  const registered = state.village.development.constructionSites.find(
    (candidate) => candidate.key === site.key,
  );
  if (registered) registered.enclosures = structuredClone(corrected);
  markVillageArchitectureDirty(state);
  events.push({ type: "farm_field_geometry_repaired", tick: state.tick });
}

function farmBlueprintTerrain(job, terrainAt) {
  const blueprintCells = new Set(
    (job.plan.constructionWork?.elements ?? []).map((element) =>
      key(element.position),
    ),
  );
  return (position) => {
    const tile = terrainAt(position);
    return blueprintCells.has(key(position)) && tile === "village_construction"
      ? "outdoor_grass"
      : tile;
  };
}

function replacePlannedConstruction(job, site) {
  const replacements = new Map(
    constructionElements(site).map((element) => [element.key, element]),
  );
  for (const element of job.plan.constructionWork.elements) {
    const replacement = replacements.get(element.key);
    if (replacement) Object.assign(element, replacement);
  }
  job.plan.construction = site;
  job.plan.accessPosition = { ...site.door };
  delete job.plan.cachedPath;
  job.targetPosition = { ...site.door };
}

function retargetRepairedConstruction(state, job, objectAt, events) {
  const position = job.plan.construction.door,
    target = objectAt(position);
  if (!target) return;
  job.targetId = target.id;
  job.targetPosition = { ...position };
  job.plan.accessPosition = { ...position };
  if (job.status !== "blocked" || job.blockingReason !== "target_missing")
    return;
  transitionJob(job, "available", state.tick);
  job.nextRetryAtTick = null;
  events.push(
    jobEvent(state, "job_reopened", job, {
      reason: "construction_anchor_repaired",
    }),
  );
}

function registerRepairedFarmSite(state, job, site, reserved, events) {
  replacePlannedConstruction(job, site);
  state.village.development.constructionSites = [
    ...reserved,
    structuredClone(site),
  ];
  markVillageArchitectureDirty(state);
  events.push({
    type: "farm_circulation_plan_repaired",
    siteKey: site.key,
    selectedOrigin: { x: site.x, y: site.y },
    tick: state.tick,
  });
}

function repairUnbuiltFarmCirculation(state, context, events) {
  const job = state.village.jobs.find(
    (candidate) =>
      candidate.jobType === "build_farmstead" &&
      !["completed", "cancelled"].includes(candidate.status),
  );
  if (!job?.plan?.constructionWork?.elements?.length) return;
  if (
    job.plan.constructionWork.elements.some(
      (element) => element.materialDelivered || element.status !== "planned",
    )
  )
    return;
  const development = state.village.development,
    reserved = development.constructionSites.filter(
      (site) => site.key !== "farmstead",
    ),
    terrainAt = farmBlueprintTerrain(job, context.terrainAt),
    assessment = assessConstructionSite(job.plan.construction, terrainAt, {
      reservedSites: reserved,
    });
  if (assessment.valid)
    return retargetRepairedConstruction(state, job, context.objectAt, events);
  const result = findConstructionSite(
    foundingPlan(state, "farmstead"),
    terrainAt,
    { reservedSites: reserved, fixedEnclosurePurposes: ["field"] },
  );
  if (!result.site) return;
  registerRepairedFarmSite(state, job, result.site, reserved, events);
  retargetRepairedConstruction(state, job, context.objectAt, events);
}

function selectConstructionSite(state, preferred, context, events) {
  const development = state.village.development,
    existing = development.constructionSites.find(
      (site) => site.key === preferred.key,
    );
  if (existing) return existing;
  if (
    development.siteIssue?.siteKey === preferred.key &&
    state.tick < (development.siteIssue.retryAfterTick ?? 0)
  )
    return null;
  const result = searchConstructionSite(state, development, preferred, context);
  const decision = constructionSiteDecision(state, preferred, result);
  development.siteDecisions.push(decision);
  return result.site
    ? acceptConstructionSite(development, result, preferred, decision, events)
    : rejectConstructionSite(
        state,
        development,
        preferred,
        result,
        decision,
        events,
      );
}

function gatehousePreferredSite(state, projectKey) {
  if (projectKey !== "security_gatehouse") return null;
  const boundary =
      state.village.development.masterPlan.defenseStrategy.perimeter.boundary,
    gate = boundary?.gates.find((candidate) => candidate.edge === "east"),
    plan = specialistFacilityPlan(projectKey);
  if (!gate || !plan) return null;
  const targetDoor = { x: gate.x - 6, y: gate.y - 1 };
  const site = translateConstructionSite(
    plan,
    targetDoor.x - plan.door.x,
    targetDoor.y - plan.door.y,
  );
  site.enclosures = [
    {
      key: "village_palisade",
      name: "Stonebridge timber palisade",
      purpose: "defensive_perimeter",
      x: boundary.x,
      y: boundary.y,
      w: boundary.width,
      h: boundary.height,
      clearance: 2,
      gate: { ...gate },
      gates: boundary.gates.map((position) => ({ ...position })),
      fenceMaterial: "timber",
    },
  ];
  return site;
}

function fishingHutPreferredSite(state, projectKey) {
  if (projectKey !== "specialist_fishing_hut") return null;
  const plan = specialistFacilityPlan(projectKey),
    bank = geologyPlanContext(state).localWaterAccessSurvey?.accessPosition;
  if (!plan || !bank) return plan;
  return translateConstructionSite(
    plan,
    bank.x - plan.door.x,
    bank.y - plan.door.y,
  );
}

function specialistPreferredSite(state, projectKey) {
  return (
    gatehousePreferredSite(state, projectKey) ??
    fishingHutPreferredSite(state, projectKey)
  );
}

function fishingHutWaterDistance(site, terrainAt, limit = 8) {
  for (let radius = 1; radius <= limit; radius += 1)
    if (
      waterSearchRing(site.door, radius).some(
        (position) => terrainAt(position) === "outdoor_water",
      )
    )
      return radius;
  return Infinity;
}

function specialistSiteAssessment(state, projectKey, site, context) {
  const assessment = assessSettlementMasterPlanSite(state, projectKey, site);
  if (projectKey !== "specialist_fishing_hut") return assessment;
  const distance = fishingHutWaterDistance(site, context.terrainAt);
  return {
    ...assessment,
    valid: assessment.valid && Number.isFinite(distance),
    score: assessment.score + (Number.isFinite(distance) ? distance * 4 : 1000),
    reasons: [...assessment.reasons, `${distance} cells from fishable water`],
  };
}

// function-length-exempt: template -- declarative architect-job policy
function postArchitectPlanningJobs(state, context, events) {
  const development = state.village.development,
    board = development.strategyBoard,
    supply = stockpileByKey(state, "lumber_yard_lumber");
  for (const commission of board.commissions) {
    if (
      commission.status === "suspended" ||
      commission.planning?.status !== "survey_pending" ||
      commission.planning?.planId
    )
      continue;
    const alternatives = architectSiteAlternatives(
      commission.projectKey,
      context.terrainAt,
      {
        reservedSites: development.constructionSites,
        buildings: state.village.buildings,
        supplyPosition: supply?.position ?? null,
        preferredSite: specialistPreferredSite(state, commission.projectKey),
        planningEvaluator: (site) =>
          specialistSiteAssessment(state, commission.projectKey, site, context),
      },
    );
    if (!alternatives.length) {
      commission.planning.status = "site_blocked";
      commission.planning.note =
        "The architect could not find a valid site within the survey radius.";
      events.push({
        type: "village_architect_site_blocked",
        commissionId: commission.id,
        projectKey: commission.projectKey,
        tick: state.tick,
      });
      continue;
    }
    registerVillageArchitectPlan(
      state,
      { commissionId: commission.id, alternatives },
      events,
    );
  }
  for (const plan of development.architectPlans.filter(
    (candidate) => candidate.status === "surveying",
  )) {
    const commission = board.commissions.find(
        (candidate) => candidate.id === plan.commissionId,
      ),
      architect = state.village.npcStates.find(
        (actor) => actor.id === plan.architectActorId,
      ),
      openSurvey = state.village.jobs.some(
        (job) =>
          job.plan?.architectSurvey &&
          job.plan.architectPlanId === plan.id &&
          !["completed", "cancelled"].includes(job.status),
      ),
      alternative = plan.alternatives.find(
        (candidate) => candidate.status === "pending_survey",
      );
    if (
      !commission ||
      commission.status === "suspended" ||
      !architect ||
      openSurvey ||
      !alternative
    )
      continue;
    const { job, created } = createJob(state, {
      id: namedUuid(plan.id, `survey:${alternative.id}`),
      jobType: "survey_architecture",
      name: `Survey ${alternative.site.name} option ${alternative.rank}`,
      priority: 108,
      targetId: alternative.id,
      targetPosition: { ...alternative.site.door },
      requiredCapabilities: ["architect"],
      reason: "architect_site_comparison",
      progressTotal: 30,
      progressUnit: "work_minute",
      plan: {
        architectSurvey: true,
        architectPlanId: plan.id,
        alternativeId: alternative.id,
        ownerActorId: architect.id,
        allowedActorIds: [architect.id],
        commissionId: commission.id,
        proposalId: commission.proposalId,
        skills: ["architecture"],
        practiceUnits: 3,
      },
    });
    if (created) events.push(jobEvent(state, "job_posted", job));
  }
}

// function-length-exempt: template -- declarative specialist-job policy
function postSpecialistConstructionJobs(state, context, events) {
  const templates = Object.fromEntries(
      DEVELOPMENT_JOB_TEMPLATES.map((template) => [template.jobType, template]),
    ),
    development = state.village.development,
    board = development.strategyBoard,
    lumber = stockpileByKey(state, "lumber_yard_lumber"),
    logs = stockpileByKey(state, "lumber_camp_logs");
  for (const plan of development.architectPlans.filter(
    (candidate) => candidate.status === "approved",
  )) {
    const commission = board.commissions.find(
        (candidate) => candidate.id === plan.commissionId,
      ),
      proposalRecord = board.proposalQueue.find(
        (candidate) => candidate.id === commission?.proposalId,
      ),
      order = development.workOrders.find(
        (candidate) => candidate.architectPlanId === plan.id,
      ),
      selected = plan.alternatives.find(
        (candidate) => candidate.id === plan.selectedAlternativeId,
      ),
      site = development.constructionSites.find(
        (candidate) => candidate.architectPlanId === plan.id,
      );
    if (
      !commission ||
      !proposalRecord ||
      !order ||
      !site ||
      commission.status === "suspended" ||
      state.village.facilities.includes(proposalRecord.facilityType)
    )
      continue;
    const uncleared = specialistSiteTrees(state, selected, plan, context);
    if (uncleared.length) {
      if (
        logs &&
        storageAvailableFor(state, logs.id) < TREE_WOOD_YIELDS.pine &&
        state.village.facilities.includes("lumber_yard")
      ) {
        postProductionJob(
          state,
          { ...templates.saw_lumber, ignoreOutputThreshold: true },
          context,
          events,
          {
            workOrderId: order.id,
            architectPlanId: plan.id,
            reason: "clear_site_log_capacity",
          },
        );
        continue;
      }
      postSpecialistSiteClearing(
        state,
        templates.clear_building_site,
        { plan, order, site, trees: uncleared },
        context,
        events,
      );
      continue;
    }
    const needsWood = (lumber?.quantity ?? 0) < CONSTRUCTION_CARRY_UNITS * 6;
    if (needsWood) {
      postForestryJobs(state, templates.fell_tree, context, events, order.id);
      if (state.village.facilities.includes("lumber_yard"))
        postProductionJob(state, templates.saw_lumber, context, events, {
          workOrderId: order.id,
        });
    }
    postProductionJob(
      state,
      {
        ...templates.build_specialist_facility,
        name: `Build ${site.name}`,
        targetPosition: { ...site.door },
        facilityKey: proposalRecord.facilityType,
      },
      context,
      events,
      {
        workOrderId: order.id,
        architectPlanId: plan.id,
        architectAlternativeId: plan.selectedAlternativeId,
        specialistFacility: true,
        construction: site,
        accessPosition: { ...site.door },
        reason: "approved_architect_plan",
      },
    );
  }
}

function openSpecialistClearing(state, planId) {
  return state.village.jobs.filter(
    (job) =>
      job.jobType === "clear_building_site" &&
      job.plan?.architectPlanId === planId &&
      !["completed", "cancelled"].includes(job.status),
  );
}

function specialistSiteTrees(state, selected, plan, context) {
  const open = openSpecialistClearing(state, plan.id),
    claimed = new Set(open.map((job) => key(job.targetPosition)));
  return (selected?.assessment?.treeCells ?? [])
    .filter(
      (position) =>
        context.terrainAt(position) === "outdoor_tree" &&
        !state.village.modifications.some(
          (change) => change.x === position.x && change.y === position.y,
        ) &&
        !claimed.has(key(position)),
    )
    .sort((left, right) => left.y - right.y || left.x - right.x);
}

// function-length-exempt: template -- parallel specialist-site clearing policy
function postSpecialistSiteClearing(state, template, details, context, events) {
  const { plan, order, site } = details,
    open = openSpecialistClearing(state, plan.id);
  open.forEach((job, index) => {
    job.plan.parallelSlot ??= `${plan.id}:${index}`;
    job.plan.parallelProduction = true;
  });
  const targetCount = Math.min(3, open.length + details.trees.length);
  for (let index = open.length; index < targetCount; index += 1) {
    const position = details.trees[index - open.length];
    if (!position) break;
    const posted = postProductionJob(
      state,
      {
        ...template,
        name: `Clear the ${site.name} site`,
        targetPosition: position,
      },
      context,
      events,
      {
        workOrderId: order.id,
        architectPlanId: plan.id,
        siteClearing: true,
        terrainCellTarget: true,
        terrainEffect: "tree_stump",
        parallelProduction: true,
        parallelSlot: `${plan.id}:${index}`,
        reason: "approved_site_clearing",
      },
    );
    if (!posted) break;
  }
  return open;
}

// function-length-exempt: template -- declarative field-expansion policy
function postFieldExpansionJob(state, templates, context, events, order) {
  if (!state.village.facilities.includes("farmstead")) return null;
  if (specialistCommissionActive(state)) return null;
  const expansion = state.village.fieldExpansions?.find(
    (candidate) => candidate.status === "planned",
  );
  if (!expansion) return null;
  const trees = fieldExpansionTreeCells(expansion, context.terrainAt).sort(
    (left, right) => left.y - right.y || left.x - right.x,
  );
  if (!trees.length) {
    const plot = activateFieldExpansion(state, expansion.key);
    if (plot)
      events.push({
        type: "field_opened",
        scope: "village",
        tick: state.tick,
        expansionId: expansion.id,
        cropPlotId: plot.id,
        cropKind: plot.cropKind,
      });
    return plot;
  }
  const logs = stockpileByKey(state, "lumber_camp_logs");
  if (
    logs &&
    storageAvailableFor(state, logs.id) < TREE_WOOD_YIELDS.pine &&
    state.village.facilities.includes("lumber_yard")
  )
    return postProductionJob(
      state,
      { ...templates.saw_lumber, ignoreOutputThreshold: true },
      context,
      events,
      { reason: "clear_field_log_capacity" },
    );
  return postProductionJob(
    state,
    { ...templates.clear_field_tree, targetPosition: { ...trees[0] } },
    context,
    events,
    {
      ...(order ? { workOrderId: order.id } : {}),
      fieldExpansionKey: expansion.key,
      terrainEffect: "tree_stump",
      reason: "planned_field_expansion",
    },
  );
}

function nextHousingHousehold(state) {
  const housed = new Set(
    (state.village.residences ?? []).flatMap(
      (residence) => residence.householdIds ?? [],
    ),
  );
  const lots = state.village.development.masterPlan?.householdLots ?? [];
  for (const lot of lots) {
    const household = state.village.households.find(
      (candidate) => candidate.key === lot.householdKey,
    );
    if (household && !housed.has(household.id)) return { household, lot };
  }
  return null;
}

function householdHomeName(household, lot) {
  return lot.use === "farmhouse"
    ? `${household.name} farmhouse`
    : `${household.name} cottage`;
}

function founderHouseSurfaces(lot, plan) {
  const surface = (key, material) => ({
    key,
    x: lot.x + 1,
    y: lot.y + 1,
    width: plan.width - 2,
    height: plan.height - 2,
    material,
  });
  return {
    floors: [surface("interior", "timber")],
    roofs: [surface("supported", "timber")],
    fixtures: plan.fixtures.map((fixture) => ({
      ...fixture,
      x: lot.x + fixture.x,
      y: lot.y + fixture.y,
    })),
  };
}

function founderHousingPreferred(state, household, lot, context) {
  const capacity = Math.max(2, household.memberIds.length),
    plan = orientHousePlan(designHouse(capacity), lot, context.terrainAt);
  return {
    key: `founder_house_${household.key}`,
    name: householdHomeName(household, lot),
    districtKey: lot.use === "farmhouse" ? "farm_holding" : "residential",
    householdId: household.id,
    x: lot.x,
    y: lot.y,
    w: plan.width,
    h: plan.height,
    wallMaterial: "timber",
    door: { x: lot.x + plan.door.x, y: lot.y + plan.door.y, material: "wood" },
    secondaryDoors: plan.secondaryDoors.map((door) => ({
      x: lot.x + door.x,
      y: lot.y + door.y,
      material: "wood",
    })),
    ...founderHouseSurfaces(lot, plan),
  };
}

function recordHousingSurvey(state, household, lot, site) {
  const layout = state.village.development.masterPlan.housingLayout,
    existing = layout.find((entry) => entry.householdId === household.id),
    survey = {
      householdId: household.id,
      householdKey: household.key,
      siteKey: site.key,
      name: site.name,
      use: lot.use,
      status: "scouted",
      site: { x: site.x, y: site.y, w: site.w, h: site.h },
      door: { ...site.door },
      surveyedAtTick: existing?.surveyedAtTick ?? state.tick,
    };
  if (existing) Object.assign(existing, survey);
  else layout.push(survey);
}

function ensureFoundingHousingLayout(state, context, events) {
  if (state.village.scenario !== "founding") return;
  const development = state.village.development,
    lots = development.masterPlan.householdLots ?? [];
  for (const lot of lots) {
    const household = state.village.households.find(
      (candidate) => candidate.key === lot.householdKey,
    );
    if (!household) continue;
    const preferred = founderHousingPreferred(state, household, lot, context),
      site = selectConstructionSite(state, preferred, context, events);
    if (!site) continue;
    site.housingSurveyStatus = "scouted";
    site.plannedHouseholdId = household.id;
    recordHousingSurvey(state, household, lot, site);
  }
}

function permanentHousingComplete(state) {
  return (
    state.village.scenario !== "founding" ||
    state.village.facilities.includes("housing") ||
    state.village.npcStates.every(
      (resident) => resident.housingStatus === "housed",
    )
  );
}

function postFoundingCampfireJob(state, template, context, events) {
  if (
    state.village.scenario !== "founding" ||
    state.village.facilities.includes("survival_camp")
  )
    return null;
  return postProductionJob(state, template, context, events, {
    reason: "founding_survival_camp",
  });
}

function hasConstructedFieldBoundary(state) {
  return state.village.jobs.some((job) =>
    (job.plan?.constructionWork?.elements ?? []).some(
      (element) =>
        element.kind === "fence" &&
        element.enclosurePurpose === "field" &&
        element.status === "complete",
    ),
  );
}

function maintainFieldClearance(state, templates, context, events, order) {
  if (specialistCommissionActive(state) || waterAccessEmergency(state)) return;
  const surveys = ensureFieldClearingSurveys(state, context, events),
    pending = surveys.some((survey) => survey.status !== "cleared"),
    hasYard = state.village.facilities.includes("lumber_yard"),
    established =
      state.village.facilities.includes("farmstead") ||
      farmsteadReadyForFields(state) ||
      hasConstructedFieldBoundary(state);
  if (!pending || !hasYard || !established) return;
  postForestryJobs(
    state,
    templates.clear_field_tree,
    context,
    events,
    order?.id,
  );
  postProductionJob(
    state,
    { ...templates.saw_lumber, ignoreOutputThreshold: true },
    context,
    events,
    { ...(order ? { workOrderId: order.id } : {}), reason: "field_apron" },
  );
}

function waterAccessEmergency(state) {
  const survey = geologyPlanContext(state).localWaterAccessSurvey;
  return Boolean(
    cropWaterEmergency(state) &&
    survey?.nearestWaterPosition &&
    !survey?.targetPosition,
  );
}

function specialistCommissionActive(state) {
  return state.village.development.workOrders.some(
    (order) =>
      order.status === "active" && order.priorityKey.startsWith("specialist_"),
  );
}

function foundingCoreSupportsQuarry(state) {
  const facilities = new Set(state.village.facilities);
  return (
    facilities.has("lumber_yard") &&
    facilities.has("farmstead") &&
    facilities.has("communal_kitchen") &&
    facilities.has("housing")
  );
}

function pendingStoneConstruction(state) {
  return state.village.jobs.reduce(
    (total, job) =>
      total +
      (job.plan?.constructionWork?.elements ?? [])
        .filter(
          (element) =>
            element.material === "stone" && element.status !== "complete",
        )
        .reduce(
          (sum, element) =>
            sum +
            Math.max(
              0,
              element.materialRequired - element.materialDeliveredQuantity,
            ),
          0,
        ),
    0,
  );
}

function foundingStoneExhausted(state) {
  const knowledge = geologyPlanContext(state).geologyKnowledge;
  if (pendingStoneConstruction(state) > 0) return false;
  return (
    knowledge.foundingStoneExhausted === true ||
    foundingQuarryCells(state) >= FOUNDING_QUARRY_CELL_QUOTA
  );
}

function foundingQuarryCells(state) {
  return state.village.modifications.filter(
    (item) => item.kind === "quarried_rock",
  ).length;
}

function catalogGeologySite(state) {
  const regional = geologyPlanContext(state),
    source = regional.surveyedSources.find(
      (item) => item.kind === "geology_survey",
    );
  if (!source) return null;
  return {
    global: source.position,
    local: {
      x: source.position.x - regional.site.origin.x,
      y: source.position.y - regional.site.origin.y,
    },
  };
}

function geologyAccessPosition(site, context) {
  return (
    orthogonalNeighbors(site.local)
      .filter(
        (position) => villageMovementCost(context.terrainAt(position)) != null,
      )
      .sort(
        (left, right) =>
          Math.abs(left.x) +
          Math.abs(left.y) -
          (Math.abs(right.x) + Math.abs(right.y)),
      )[0] ?? null
  );
}

function geologySiteCandidate(state, catalog, context, local) {
  const global = geologyGlobalPosition(state, local),
    modified = state.village.modifications.some(
      (item) =>
        item.kind === "quarried_rock" &&
        item.x === local.x &&
        item.y === local.y,
    );
  if (modified) return null;
  const geology = regionalGeology(
    state.seed,
    global.x,
    global.y,
    geologyPlanContext(state).site.mode,
  );
  if (geology !== "building_stone") return null;
  const site = { local, global },
    access = geologyAccessPosition(site, context);
  if (!access) return null;
  return {
    ...site,
    access,
    distance:
      Math.abs(local.x - catalog.local.x) + Math.abs(local.y - catalog.local.y),
    tunnelContinuation: context.terrainAt(access) === "village_mine_floor",
  };
}

function nearbyGeologySites(state, catalog, context) {
  const sites = [];
  for (let y = catalog.local.y - 24; y <= catalog.local.y + 24; y += 1)
    for (let x = catalog.local.x - 24; x <= catalog.local.x + 24; x += 1) {
      const local = { x, y },
        site = geologySiteCandidate(state, catalog, context, local);
      if (site) sites.push(site);
    }
  return sites.sort(
    (left, right) =>
      Number(right.tunnelContinuation) - Number(left.tunnelContinuation) ||
      left.distance - right.distance,
  );
}

function approvedDeposit(state, approved) {
  if (!approved) return null;
  return geologyPlanContext(state).geologyKnowledge.revealedDeposits.find(
    (item) => item.x === approved.global.x && item.y === approved.global.y,
  );
}

function approvedGeologySite(state, context) {
  const knowledge = geologyPlanContext(state).geologyKnowledge,
    approved = knowledge.approvedSite,
    catalog = catalogGeologySite(state),
    carter = state.village.npcStates.find(
      (actor) => actor.personKey === "carter",
    );
  if (approved && (approvedDeposit(state, approved)?.remainingUnits ?? 1) > 0)
    return structuredClone(approved);
  if (approved) knowledge.approvedSite = null;
  if (!catalog || !carter) return null;
  const site = nearbyGeologySites(state, catalog, context).find(
    (candidate) =>
      planVillageTerrainRoute(
        state,
        carter,
        candidate.access,
        context.terrainAt,
        false,
      ).ok,
  );
  if (!site) return null;
  knowledge.approvedSite = {
    local: site.local,
    global: site.global,
    access: site.access,
  };
  return structuredClone(knowledge.approvedSite);
}

function geologyTravelAssessment(state, site) {
  const context = geologyPlanContext(state),
    assessment = regionalTravelAssessment(
      site.global,
      context.site.hub,
      context.dispatchPolicy,
      context.fieldCamps,
    );
  return { ...assessment, assessedAtTick: state.tick, actualSteps: 0 };
}

function regionalResourceSite(state, position, context) {
  const candidates = orthogonalNeighbors(position),
    access = candidates.find(
      (candidate) => villageMovementCost(context.terrainAt(candidate)) != null,
    );
  return {
    local: { ...position },
    global: geologyGlobalPosition(state, position),
    access: access ?? { ...position },
  };
}

function regionalResourceTravel(state, position, context) {
  return geologyTravelAssessment(
    state,
    regionalResourceSite(state, position, context),
  );
}

function regionalResourcePressure(state) {
  const regional = geologyPlanContext(state);
  regional.resourcePressure ??= {};
  return regional.resourcePressure;
}

function regionalTimberCandidate(context, origin, radius) {
  for (let y = origin.y - radius; y <= origin.y + radius; y += 1)
    for (let x = origin.x - radius; x <= origin.x + radius; x += 1) {
      if (Math.max(Math.abs(x - origin.x), Math.abs(y - origin.y)) !== radius)
        continue;
      const position = { x, y };
      if (context.terrainAt(position) === "outdoor_tree") return position;
    }
  return null;
}

function regionalTimberTarget(context) {
  const origin = { x: -22, y: 18 };
  for (let radius = 112; radius <= 192; radius += 4) {
    const target = regionalTimberCandidate(context, origin, radius);
    if (target) return target;
  }
  return null;
}

function knownGeologyPosition(state, position) {
  const global = geologyGlobalPosition(state, position);
  return geologyPlanContext(state).geologyKnowledge.revealedDeposits.some(
    (item) => item.x === global.x && item.y === global.y,
  );
}

function regionalRockCandidate(state, context, origin, radius) {
  const candidates = [];
  for (let y = origin.y - radius; y <= origin.y + radius; y += 1)
    for (let x = origin.x - radius; x <= origin.x + radius; x += 1) {
      if (Math.max(Math.abs(x - origin.x), Math.abs(y - origin.y)) !== radius)
        continue;
      const position = { x, y };
      if (
        context.terrainAt(position) === "outdoor_rock" &&
        !knownGeologyPosition(state, position) &&
        geologyAccessPosition({ local: position }, context)
      )
        candidates.push(position);
    }
  return (
    candidates.sort(
      (left, right) =>
        Math.abs(left.x - 19) +
          Math.abs(left.y - 11) -
          (Math.abs(right.x - 19) + Math.abs(right.y - 11)) ||
        left.y - right.y ||
        left.x - right.x,
    )[0] ?? null
  );
}

function regionalRockSurveyTarget(state, context) {
  const origin = { x: -22, y: 18 };
  for (let radius = 80; radius <= 256; radius += 4) {
    const target = regionalRockCandidate(state, context, origin, radius);
    if (target) return target;
  }
  return null;
}

function fieldCampKey(site) {
  return `regional_field_camp_${Math.floor(site.global.x / 32)}_${Math.floor(site.global.y / 32)}`;
}

// function-length-exempt: template -- field camp fixture blueprint
function fieldCampFixtures(x, y) {
  return [
    {
      key: "camp_bed",
      role: "bed",
      x: x + 1,
      y: y + 1,
      width: 1,
      height: 2,
      bedType: "single",
      sleepingCapacity: 1,
      providesShelter: true,
    },
    {
      key: "camp_cache",
      role: "storage",
      x: x + 3,
      y: y + 1,
      width: 1,
      height: 1,
    },
    {
      key: "camp_hearth",
      role: "kitchen",
      x: x + 3,
      y: y + 2,
      width: 1,
      height: 1,
    },
  ];
}

function preferredFieldCampPlan(site) {
  const key = fieldCampKey(site),
    x = site.access.x - 2,
    y = site.access.y + 2;
  return {
    key,
    name: "Regional field camp",
    glyph: "C",
    x,
    y,
    w: 5,
    h: 4,
    requiresTownAccess: true,
    wallMaterial: "timber",
    door: { x: x + 2, y: y + 3, material: "wood" },
    secondaryDoors: [{ x: x + 2, y, material: "wood" }],
    floors: [{ key: "camp_floor", x: x + 1, y: y + 1, width: 3, height: 2 }],
    roofs: [{ key: "camp_roof", x: x + 1, y: y + 1, width: 3, height: 2 }],
    fixtures: fieldCampFixtures(x, y),
  };
}

function ensureFieldCampRecord(state, site, construction, travel) {
  const context = geologyPlanContext(state),
    key = construction.key;
  let camp = context.fieldCamps.find((candidate) => candidate.key === key);
  if (camp) return camp;
  camp = {
    id: namedUuid(state.id, `regional-field-camp:${key}`),
    key,
    name: construction.name,
    status: "planned",
    position: geologyGlobalPosition(state, construction.door),
    localPosition: { ...construction.door },
    supportsDestination: { ...site.global },
    constructionKey: key,
    requiredFoodUnits: travel.requiredFoodUnits,
    foodUnits: 0,
    designatedAtTick: state.tick,
  };
  context.fieldCamps.push(camp);
  return camp;
}

function fieldCampSupplyTarget(state, camp) {
  const cache = state.village.fixtures.find(
    (fixture) => fixture.id === camp.cacheFixtureId,
  );
  return cache ? { x: cache.x, y: cache.y } : camp.localPosition;
}

function postFieldCampSupply(state, template, camp, context, events, travel) {
  const targetPosition = fieldCampSupplyTarget(state, camp),
    inputQuantity = Math.max(1, camp.requiredFoodUnits - (camp.foodUnits ?? 0));
  const job = postProductionJob(
    state,
    { ...template, targetPosition, inputQuantity },
    context,
    events,
    {
      accessPosition: { ...camp.localPosition },
      fieldCampSupplyId: camp.id,
      reason: "field_camp_requires_expedition_food",
      remoteTravel: {
        ...travel,
        approved: true,
        dispatchStatus: "field_camp_supply",
        pioneerCamp: true,
      },
    },
  );
  commitRemoteJob(job);
  return job;
}

function postCommittedProductionJob(...args) {
  const job = postProductionJob(...args);
  commitRemoteJob(job);
  return job;
}

function postFieldCampJob(state, templates, site, context, events, travel) {
  const preferred = preferredFieldCampPlan(site),
    construction = selectConstructionSite(state, preferred, context, events);
  if (!construction) return null;
  const camp = ensureFieldCampRecord(state, site, construction, travel);
  if (
    ["built", "operational"].includes(camp.status) &&
    (camp.foodUnits ?? 0) < travel.requiredFoodUnits
  )
    return postFieldCampSupply(
      state,
      templates.supply_field_camp,
      camp,
      context,
      events,
      travel,
    );
  if (camp.status === "operational") return null;
  return postCommittedProductionJob(
    state,
    { ...templates.build_field_camp, targetPosition: { ...construction.door } },
    context,
    events,
    {
      construction,
      accessPosition: { ...construction.door },
      regionalFieldCampId: camp.id,
      reason: "remote_work_requires_field_camp",
      remoteTravel: {
        ...travel,
        approved: true,
        dispatchStatus: "pioneer_camp_construction",
        pioneerCamp: true,
      },
    },
  );
}

function postGeologyProduction(
  state,
  template,
  site,
  context,
  events,
  remoteTravel,
  geologyAction,
) {
  const job = postProductionJob(
    state,
    { ...template, targetPosition: site.local },
    context,
    events,
    {
      accessPosition: site.access,
      geologyAction,
      reason:
        geologyAction === "prospect"
          ? "approved_geology_survey"
          : "building_stone_below_threshold",
      remoteTravel,
    },
  );
  commitRemoteJob(job);
  reserveExpeditionFood(state, job, remoteTravel, events);
  return job;
}

function commitRemoteJob(job) {
  if (!job) return;
  job.basePriority = Math.max(job.basePriority ?? job.priority, 150);
  job.priority = Math.max(job.priority, job.basePriority);
}

function reserveExpeditionFood(state, job, travel, events) {
  if (!job || !travel?.fieldCampId || job.plan.expeditionFoodUnits != null)
    return;
  const camp = geologyPlanContext(state).fieldCamps.find(
    (candidate) => candidate.id === travel.fieldCampId,
  );
  if (!camp || camp.foodUnits < travel.requiredFoodUnits) return;
  camp.foodUnits -= travel.requiredFoodUnits;
  job.plan.expeditionFoodUnits = travel.requiredFoodUnits;
  job.basePriority = Math.max(job.basePriority ?? job.priority, 125);
  job.priority = Math.max(job.priority, job.basePriority);
  events.push(
    jobEvent(state, "field_camp_food_reserved", job, {
      fieldCampId: camp.id,
      quantity: travel.requiredFoodUnits,
      remainingFoodUnits: camp.foodUnits,
    }),
  );
}

function geologyDepositAt(state, site) {
  return geologyPlanContext(state).geologyKnowledge.revealedDeposits.find(
    (item) => item.x === site.global.x && item.y === site.global.y,
  );
}

function postApprovedGeologyWork(
  state,
  templates,
  site,
  context,
  events,
  travel,
) {
  const deposit = geologyDepositAt(state, site);
  if (!deposit)
    return postGeologyProduction(
      state,
      templates.prospect_rock,
      site,
      context,
      events,
      travel,
      "prospect",
    );
  if (deposit.remainingUnits <= 0) return null;
  return postGeologyProduction(
    state,
    templates.quarry_stone,
    site,
    context,
    events,
    travel,
    "quarry",
  );
}

function postGeologyJobs(state, templates, context, events) {
  if (!foundingCoreSupportsQuarry(state) || foundingStoneExhausted(state))
    return null;
  const site = approvedGeologySite(state, context);
  if (!site) return null;
  const travel = geologyTravelAssessment(state, site);
  if (!travel.approved)
    return postFieldCampJob(state, templates, site, context, events, travel);
  return postApprovedGeologyWork(
    state,
    templates,
    site,
    context,
    events,
    travel,
  );
}

function openHuntingJob(state) {
  return state.village.jobs.find(
    (job) =>
      ["hunt_game", "remote_hunt_game"].includes(job.jobType) &&
      !["completed", "cancelled"].includes(job.status),
  );
}

function cancelUnequippedLegacyHunts(state, templates, events) {
  for (const job of state.village.jobs.filter(
    (candidate) =>
      ["hunt_game", "remote_hunt_game"].includes(candidate.jobType) &&
      !["completed", "cancelled"].includes(candidate.status),
  )) {
    const template = templates[job.jobType];
    if (template && reusableRequirementMatches(job, template)) continue;
    if (!cancelJob(state, job, "equipment_requirement_changed")) continue;
    events.push(
      jobEvent(state, "job_cancelled", job, {
        reason: "equipment_requirement_changed",
      }),
    );
  }
}

function reachableHuntingTarget(state, template, context) {
  const hunter = state.village.npcStates.find(
    (actor) => actor.personKey === template.personKey,
  );
  if (!hunter) return null;
  return animalProductionCandidates(
    state,
    template.animalSpecies,
    template.animalEffect,
  )
    .map((animal) => ({
      animal,
      route: analyzeVillagePath(
        state,
        hunter,
        animal.position,
        context.terrainAt,
        { adjacent: true },
      ),
    }))
    .filter(({ route }) => route.ok)
    .sort(
      (left, right) =>
        left.route.cost - right.route.cost ||
        left.animal.id.localeCompare(right.animal.id),
    )[0]?.animal;
}

function cancelUnreachableHunt(state, context, events) {
  const open = openHuntingJob(state),
    hunter = state.village.npcStates.find(
      (actor) => actor.personKey === "fisher",
    );
  if (!open || !hunter || !["blocked", "available"].includes(open.status))
    return;
  const route = planVillageRoute(
    state,
    hunter,
    open.targetPosition,
    context.terrainAt,
    true,
  );
  if (route.ok) return;
  cancelJob(state, open, "hunting_target_unreachable");
  events.push(jobEvent(state, "job_cancelled", open, { reason: route.reason }));
}

function regionalExtractionOpen(state) {
  return state.village.jobs.some(
    (job) =>
      [
        "build_field_camp",
        "supply_field_camp",
        "prospect_rock",
        "quarry_stone",
        "prospect_ore",
        "mine_ore",
        "remote_fell_tree",
      ].includes(job.jobType) &&
      !["completed", "cancelled"].includes(job.status),
  );
}

function openLocalForestry(state) {
  return state.village.jobs.some(
    (job) =>
      ["fell_tree", "clear_building_site", "clear_field_tree"].includes(
        job.jobType,
      ) && !["completed", "cancelled"].includes(job.status),
  );
}

function postRemoteForestryJob(state, templates, context, events) {
  const pressure = regionalResourcePressure(state),
    template = templates.remote_fell_tree;
  if (
    pressure.timber !== "regional_required" ||
    !foundingStoneExhausted(state) ||
    openLocalForestry(state) ||
    regionalExtractionOpen(state) ||
    !productionReady(state, template)
  )
    return null;
  const targetPosition = regionalTimberTarget(context),
    target = targetPosition ? context.objectAt(targetPosition) : null;
  if (!target) return null;
  return dispatchRemoteForestry(
    state,
    templates,
    template,
    target,
    targetPosition,
    context,
    events,
  );
}

function dispatchRemoteForestry(
  state,
  templates,
  template,
  target,
  targetPosition,
  context,
  events,
) {
  const site = regionalResourceSite(state, targetPosition, context),
    travel = regionalResourceTravel(state, targetPosition, context);
  if (!travel.approved)
    return postFieldCampJob(state, templates, site, context, events, travel);
  const harvest = {
      ...template,
      outputQuantity: treeWoodYield(target.species),
    },
    details = remoteForestryJobDetails(
      state,
      harvest,
      target,
      targetPosition,
      travel,
    ),
    { job, created } = createJob(state, details);
  commitRemoteJob(job);
  reserveExpeditionFood(state, job, travel, events);
  if (created) events.push(jobEvent(state, "job_posted", job));
  return job;
}

// function-length-exempt: template -- remote forestry job declaration
function remoteForestryJobDetails(
  state,
  harvest,
  target,
  targetPosition,
  travel,
) {
  return {
    id: economyJobId(state, harvest),
    jobType: harvest.jobType,
    name: harvest.name,
    priority: harvest.priority,
    targetId: target.id,
    targetPosition,
    requiredCapabilities: [harvest.capability],
    reason: "regional_timber_supply",
    progressTotal: harvest.duration * 30,
    progressUnit: "work_minute",
    plan: {
      template: harvest.jobType,
      step: "to_input",
      terrainEffect: "tree_stump",
      remoteHarvest: "timber",
      remoteTravel: travel,
      practiceUnits: harvest.duration,
    },
    production: productionSpec(state, harvest),
  };
}

function oreOutputKey(depositKind) {
  return {
    iron_ore: "mine_iron_ore",
    copper_ore: "mine_copper_ore",
    tin_ore: "mine_tin_ore",
  }[depositKind];
}

function revealedOreSite(state, context) {
  const regional = geologyPlanContext(state),
    deposit = regional.geologyKnowledge.revealedDeposits.find(
      (item) => oreOutputKey(item.depositKind) && item.remainingUnits > 0,
    );
  if (!deposit) return null;
  const local = {
    x: deposit.x - regional.site.origin.x,
    y: deposit.y - regional.site.origin.y,
  };
  return {
    deposit,
    local,
    global: { x: deposit.x, y: deposit.y },
    access: geologyAccessPosition({ local }, context),
  };
}

function remoteOreTemplate(templates, site) {
  if (!site.deposit) return templates.prospect_ore;
  return {
    ...templates.mine_ore,
    name: `Mine finite ${site.deposit.depositKind.replaceAll("_", " ")}`,
    outputKey: oreOutputKey(site.deposit.depositKind),
  };
}

function postRemoteOreProduction(state, templates, site, context, events) {
  const travel = geologyTravelAssessment(state, site);
  if (!travel.approved)
    return postFieldCampJob(state, templates, site, context, events, travel);
  const template = remoteOreTemplate(templates, site),
    geologyAction = site.deposit ? "quarry" : "prospect",
    job = postProductionJob(
      state,
      { ...template, targetPosition: site.local },
      context,
      events,
      {
        accessPosition: site.access,
        geologyAction,
        remoteOre: true,
        remoteTravel: travel,
        reason: site.deposit ? "revealed_ore_supply" : "regional_ore_survey",
      },
    );
  commitRemoteJob(job);
  reserveExpeditionFood(state, job, travel, events);
  return job;
}

function postRemoteOreJob(state, templates, context, events) {
  if (!foundingStoneExhausted(state) || regionalExtractionOpen(state))
    return null;
  let site = revealedOreSite(state, context);
  if (!site) {
    const local = regionalRockSurveyTarget(state, context);
    if (!local) return null;
    site = regionalResourceSite(state, local, context);
  }
  if (!site.access) return null;
  return postRemoteOreProduction(state, templates, site, context, events);
}

function farthestHuntingTarget(state, template) {
  const hub = geologyPlanContext(state).site.hub;
  return animalProductionCandidates(
    state,
    template.animalSpecies,
    template.animalEffect,
  ).sort((left, right) => {
    const leftGlobal = geologyGlobalPosition(state, left.position),
      rightGlobal = geologyGlobalPosition(state, right.position),
      leftDistance =
        Math.abs(leftGlobal.x - hub.x) + Math.abs(leftGlobal.y - hub.y),
      rightDistance =
        Math.abs(rightGlobal.x - hub.x) + Math.abs(rightGlobal.y - hub.y);
    return rightDistance - leftDistance || left.id.localeCompare(right.id);
  })[0];
}

function postRemoteHuntingJob(state, templates, context, events) {
  if (
    !foundingCoreSupportsQuarry(state) ||
    openHuntingJob(state) ||
    regionalExtractionOpen(state)
  )
    return null;
  const template = templates.remote_hunt_game,
    target = farthestHuntingTarget(state, template);
  if (!target || !productionReady(state, template)) return null;
  const site = regionalResourceSite(state, target.position, context),
    travel = regionalResourceTravel(state, target.position, context);
  if (!travel.approved)
    return postFieldCampJob(state, templates, site, context, events, travel);
  const job = postProductionJob(state, template, context, events, {
    animalTargetId: target.id,
    remoteHarvest: "animal",
    remoteTravel: travel,
    reason: "regional_game_supply",
  });
  commitRemoteJob(job);
  reserveExpeditionFood(state, job, travel, events);
  return job;
}

function postAnimalTreatmentJobs(state, templates, context, events) {
  for (const template of Object.values(templates).filter(
    (candidate) => candidate.animalEffect === "treat",
  ))
    postProductionJob(state, template, context, events, {
      reason: "sick_animal_requires_treatment",
    });
}

function farmsteadProjectPosted(state) {
  return (
    state.village.development.constructionSites.some(
      (site) => site.key === "farmstead",
    ) ||
    state.village.jobs.some(
      (job) =>
        job.jobType === "build_farmstead" &&
        !["completed", "cancelled"].includes(job.status),
    )
  );
}

function farmsteadReadyForFields(state) {
  const project = state.village.jobs.find(
    (job) =>
      job.jobType === "build_farmstead" &&
      !["completed", "cancelled"].includes(job.status),
  );
  return Boolean(
    project?.plan?.constructionWork && farmsteadCoreComplete(project),
  );
}

function livingDomesticAnimals(state) {
  return livingAnimals(state).filter(
    (animal) => animalSpecies(animal.species)?.domestic,
  );
}

function parallelHousingCrew(state) {
  return state.village.npcStates
    .filter((actor) =>
      actor.capabilityTags.some((tag) => ["build", "haul"].includes(tag)),
    )
    .map((actor) => actor.id);
}

function parallelHousingAccountability(state) {
  const commission = state.village.development.strategyBoard.commissions.find(
    (entry) => entry.projectKey === "housing" && entry.status === "active",
  );
  if (!commission) return null;
  return {
    proposalId: commission.proposalId,
    decisionId: commission.decisionId,
    commissionId: commission.id,
    allowedActorIds: parallelHousingCrew(state),
    parallelFoundingWork: true,
  };
}

function cropPlantingUnderway(state) {
  const planted = (state.village.cropPlots ?? []).some(
      (plot) =>
        [
          "prepared",
          "germinating",
          "growing",
          "mature",
          "harvestable",
        ].includes(plot.stage) || (plot.cycle ?? 0) > 0,
    ),
    active = state.village.jobs.some(
      (job) =>
        ["grow_grain", "grow_vegetables"].includes(job.jobType) &&
        ["available", "reserved", "active", "suspended"].includes(job.status),
    );
  return planted || active;
}

function foundingHousingStarted(state) {
  return (
    (state.village.residences ?? []).length > 0 ||
    state.village.jobs.some(
      (job) =>
        job.jobType === "build_house" && !["cancelled"].includes(job.status),
    )
  );
}

function parallelHousingReady(state, order, lumber) {
  if (state.village.scenario !== "founding") return false;
  if (order?.priorityKey !== "food_security") return false;
  if (!state.village.facilities.includes("lumber_yard")) return false;
  if (!parallelHousingAccountability(state)) return false;
  if (foundingHousingStarted(state)) return true;
  return cropPlantingUnderway(state) && (lumber?.quantity ?? 0) >= 60;
}

function parallelKitchenReady(state, order) {
  if (state.village.scenario !== "founding") return false;
  if (order?.priorityKey !== "food_security") return false;
  const facilities = new Set(state.village.facilities);
  if (!facilities.has("housing") || !facilities.has("farmstead")) return false;
  if (facilities.has("communal_kitchen")) return false;
  return !state.village.jobs.some(
    (job) =>
      job.jobType === "build_communal_kitchen" &&
      !["completed", "cancelled"].includes(job.status),
  );
}

function postParallelKitchen(state, templates, context, events, order) {
  if (!parallelKitchenReady(state, order)) return null;
  const preferred = foundingPlan(state, "communal_kitchen"),
    site = selectConstructionSite(state, preferred, context, events);
  if (!site) return null;
  return postProductionJob(
    state,
    { ...templates.build_communal_kitchen, targetPosition: { ...site.door } },
    context,
    events,
    {
      workOrderId: order.id,
      accessPosition: { ...site.door },
      construction: site,
      allowedActorIds: parallelHousingCrew(state),
      parallelFoundingWork: true,
      reason: "post_housing_food_stabilization",
    },
  );
}

function constructionLumberPending(state) {
  return state.village.jobs.some(
    (job) =>
      !["completed", "cancelled"].includes(job.status) &&
      job.production?.inputs?.some(
        (input) =>
          input.itemKind === "building_lumber" &&
          (input.deliveredQuantity ?? 0) + (input.carriedQuantity ?? 0) <
            input.quantity,
      ),
  );
}

function postAnimalSurvivalJobs(state, templates, context, events) {
  if (!livingDomesticAnimals(state).length) return;
  postWaterCollection(state, templates, context, events);
  postProductionJob(
    state,
    templates.prepare_emergency_fodder,
    context,
    events,
    { reason: "founding_feed_below_safe_reserve" },
  );
}

function postWaterCollection(state, templates, context, events) {
  const waterDuty = foundingWaterDuty(state, context);
  cancelUnreachableWaterCollection(state, waterDuty, events);
  if (!waterDuty)
    return postWaterAccessClearing(state, templates, context, events);
  const cropEmergency =
    cropWaterEmergency(state) ||
    (foundingFoodReserveCritical(state) &&
      state.village.cropPlots.some(
        (plot) =>
          ["germinating", "growing"].includes(plot.stage) &&
          (plot.moisture ?? 70) < 60,
      ));
  postProductionJob(
    state,
    {
      ...templates.draw_stable_water,
      targetPosition: waterDuty.targetPosition,
      accessPosition: waterDuty.accessPosition,
      priority: cropEmergency
        ? Math.max(templates.draw_stable_water.priority, 155)
        : templates.draw_stable_water.priority,
    },
    context,
    events,
    {
      reason: cropEmergency
        ? "drought_stressed_crops_need_water"
        : "living_animals_require_water",
      foodReserveDuty: cropEmergency,
      emergencyFoodDuty: cropEmergency,
    },
  );
}

function waterAccessTree(state, context) {
  const survey = geologyPlanContext(state).localWaterAccessSurvey,
    worker = state.village.npcStates.find(
      (actor) => actor.personKey === "woodcutter",
    );
  if (!survey?.accessPosition || !worker) return null;
  const route = analyzeVillagePath(
    state,
    worker,
    survey.accessPosition,
    context.terrainAt,
    { allowTreeClearing: true },
  );
  return route.ok ? route.clearableCells[0] : null;
}

function postWaterAccessClearing(state, templates, context, events) {
  const tree = waterAccessTree(state, context);
  if (!tree) return null;
  preemptWaterAccessBlockers(state, events);
  return postProductionJob(
    state,
    {
      ...templates.clear_field_tree,
      name: "Clear an emergency path to real water",
      priority: 154,
      targetPosition: tree,
    },
    context,
    events,
    {
      parallelSlot: "water_access",
      terrainCellTarget: true,
      terrainEffect: "tree_stump",
      foodReserveDuty: true,
      emergencyFoodDuty: true,
      reason: "drought_water_access_blocked_by_trees",
    },
  );
}

function preemptWaterAccessBlockers(state, events) {
  for (const job of state.village.jobs.filter(
    (candidate) =>
      candidate.jobType === "clear_field_tree" &&
      candidate.plan?.parallelSlot !== "water_access" &&
      !["completed", "cancelled"].includes(candidate.status),
  )) {
    cancelJob(state, job, "emergency_water_access_preempted_field_clearing");
    events.push(jobEvent(state, "job_cancelled", job));
  }
  for (const job of state.village.jobs.filter(
    (candidate) =>
      candidate.jobType === "saw_lumber" &&
      !["completed", "cancelled"].includes(candidate.status),
  )) {
    job.basePriority = Math.max(job.basePriority ?? job.priority, 153);
    job.plan.foodReserveDuty = true;
    job.plan.emergencyFoodDuty = true;
  }
}

function foundingWaterDuty(state, context) {
  const worker = state.village.npcStates.find(
    (actor) => actor.personKey === "herder",
  );
  if (!worker) return null;
  for (const [bank, water] of foundingFishingSites(state, context))
    if (
      context.terrainAt(water) === "outdoor_water" &&
      planVillageRoute(state, worker, bank, context.terrainAt, false).ok
    )
      return { targetPosition: water, accessPosition: bank };
  return nearbyReachableWaterDuty(state, worker, context);
}

function cancelUnreachableWaterCollection(state, waterDuty, events) {
  if (waterDuty) return;
  for (const job of state.village.jobs.filter(
    (candidate) =>
      candidate.jobType === "draw_stable_water" &&
      !["completed", "cancelled"].includes(candidate.status),
  )) {
    if (!cancelJob(state, job, "water_source_unreachable")) continue;
    events.push(
      jobEvent(state, "job_cancelled", job, {
        reason: "water_source_unreachable",
      }),
    );
  }
}

function accessSpurCells(spur) {
  const cells = [],
    cursor = { ...spur.from };
  while (cursor.x !== spur.to.x) {
    cursor.x += Math.sign(spur.to.x - cursor.x);
    if (cursor.x !== spur.to.x || cursor.y !== spur.to.y)
      cells.push({ ...cursor });
  }
  while (cursor.y !== spur.to.y) {
    cursor.y += Math.sign(spur.to.y - cursor.y);
    if (cursor.x !== spur.to.x || cursor.y !== spur.to.y)
      cells.push({ ...cursor });
  }
  return cells;
}

function dirtRoadAt(state, position) {
  return state.village.modifications.some(
    (entry) =>
      entry.kind === "built_dirt_road" &&
      entry.x === position.x &&
      entry.y === position.y,
  );
}

function openAccessSpur(state) {
  const spurs =
    state.village.development.masterPlan.spatialReservations.accessSpurs ?? [];
  return spurs.find((spur) => ["planned", "building"].includes(spur.status));
}

function postAccessRoadJob(state, context, events) {
  const spur = openAccessSpur(state);
  if (!spur) return;
  const cells = accessSpurCells(spur),
    remaining = cells.filter((position) => !dirtRoadAt(state, position));
  if (!remaining.length) return void (spur.status = "operating");
  if (
    !remaining.every(
      (position) => villageMovementCost(context.terrainAt(position)) != null,
    )
  )
    return void Object.assign(spur, { status: "blocked", blocker: "terrain" });
  const { job, created } = createJob(state, {
    jobType: "build_dirt_access_road",
    name: `Build ${spur.facilityKey.replaceAll("_", " ")} access road`,
    priority: 74,
    targetId: spur.key,
    targetPosition: remaining[0],
    requiredCapabilities: ["build"],
    progressTotal: cells.length * 12,
    progressUnit: "work_minute",
    reason: "architect_access_route",
    plan: { routeWork: { spurKey: spur.key, cells }, skills: ["construction"] },
  });
  if (!created) return;
  spur.status = "building";
  spur.jobId = job.id;
  events.push(
    jobEvent(state, "access_road_started", job, { spurKey: spur.key }),
  );
}

// function-length-exempt: template -- declarative founding-job policy
function postVillageDevelopmentJobs(state, context, events) {
  const templates = Object.fromEntries(
      DEVELOPMENT_JOB_TEMPLATES.map((template) => [template.jobType, template]),
    ),
    development = state.village.development,
    hasYard = state.village.facilities.includes("lumber_yard"),
    hasFarm = state.village.facilities.includes("farmstead"),
    order = development.workOrders.find(
      (candidate) =>
        candidate.id === development.activeOrderId &&
        candidate.status === "active",
    );
  if (hasYard) ensureFoundingHousingLayout(state, context, events);
  postEmergencyForagingJob(state, templates, context, events, order);
  postFoundingCampfireJob(state, templates.build_campfire, context, events);
  if (
    order?.priorityKey === "food_security" &&
    !hasFarm &&
    !farmsteadProjectPosted(state)
  )
    repairFoundingFieldLayout(state, context, events);
  postFieldExpansionJob(state, templates, context, events, order);
  maintainFieldClearance(state, templates, context, events, order);
  postGeologyJobs(state, templates, context, events);
  postRemoteForestryJob(state, templates, context, events);
  cancelUnequippedLegacyHunts(state, templates, events);
  cancelUnreachableHunt(state, context, events);
  const remoteHuntDispatch = postRemoteHuntingJob(
    state,
    templates,
    context,
    events,
  );
  postRemoteOreJob(state, templates, context, events);
  postAnimalTreatmentJobs(state, templates, context, events);
  postAnimalSurvivalJobs(state, templates, context, events);
  if (!order) return;
  const lumber = stockpileByKey(state, "lumber_yard_lumber"),
    needsConstructionWood =
      order.priorityKey === "lumber_infrastructure" ||
      order.priorityKey === "housing" ||
      order.priorityKey === "domestic_logistics" ||
      (order.priorityKey === "food_security" && !hasFarm) ||
      constructionLumberPending(state),
    needsWoodSupply =
      needsConstructionWood &&
      (!hasYard || lumber.quantity < CONSTRUCTION_CARRY_UNITS * 6);
  if (needsWoodSupply) {
    postForestryJobs(state, templates.fell_tree, context, events, order.id);
    postParallelSawJobs(state, templates.saw_lumber, context, events, {
      workOrderId: order.id,
    });
  }
  if (
    order.priorityKey === "food_security" &&
    !(state.village.cropPlots ?? []).length
  ) {
    postForestryJobs(
      state,
      { ...templates.fell_tree, ignoreOutputThreshold: true },
      context,
      events,
      order.id,
    );
    postParallelSawJobs(
      state,
      { ...templates.saw_lumber, ignoreOutputThreshold: true },
      context,
      events,
      { workOrderId: order.id, reason: "seasonal_field_clearing" },
    );
  }
  if (!remoteHuntDispatch && !openHuntingJob(state)) {
    const huntTarget = reachableHuntingTarget(
      state,
      templates.hunt_game,
      context,
    );
    if (huntTarget)
      postProductionJob(state, templates.hunt_game, context, events, {
        ...(order.priorityKey === "food_security"
          ? { workOrderId: order.id }
          : {}),
        animalTargetId: huntTarget.id,
        reason: "food_reserve_below_three_days",
      });
  }
  if (order.priorityKey === "lumber_infrastructure") {
    const preferred = hasYard ? null : foundingPlan(state, "lumber_yard"),
      site = preferred
        ? selectConstructionSite(state, preferred, context, events)
        : null;
    if (site)
      postProductionJob(
        state,
        { ...templates.build_lumber_yard, targetPosition: { ...site.door } },
        context,
        events,
        {
          workOrderId: order.id,
          construction: site,
          accessPosition: { ...site.door },
        },
      );
  }
  const parallelHousing = parallelHousingReady(state, order, lumber);
  postParallelKitchen(state, templates, context, events, order);
  if (order.priorityKey === "housing" || parallelHousing) {
    const request = nextHousingHousehold(state),
      houseIndex = request
        ? state.village.development.masterPlan.householdLots.findIndex(
            (lot) => lot.householdKey === request.household.key,
          )
        : -1,
      household = request?.household ?? null,
      plot = request?.lot ?? null,
      capacity = household ? Math.max(2, household.memberIds.length) : 0,
      preferred = plot
        ? founderHousingPreferred(state, household, plot, context)
        : null,
      site = preferred
        ? selectConstructionSite(state, preferred, context, events)
        : null;
    if (site)
      postProductionJob(
        state,
        { ...templates.build_house, targetPosition: { ...site.door } },
        context,
        events,
        {
          ...(parallelHousing
            ? parallelHousingAccountability(state)
            : { workOrderId: order.id }),
          buildHouse: true,
          houseIndex,
          houseCapacity: capacity,
          targetHouseholdId: household.id,
          accessPosition: { ...site.door },
          construction: site,
        },
      );
  }
  if (order.priorityKey === "domestic_logistics") {
    const preferred = state.village.facilities.includes("communal_kitchen")
        ? null
        : foundingPlan(state, "communal_kitchen"),
      site = preferred
        ? selectConstructionSite(state, preferred, context, events)
        : null;
    if (site)
      postProductionJob(
        state,
        {
          ...templates.build_communal_kitchen,
          targetPosition: { ...site.door },
        },
        context,
        events,
        {
          workOrderId: order.id,
          accessPosition: { ...site.door },
          construction: site,
        },
      );
  }
  const seasonalFields = (state.village.cropPlots ?? []).length > 0;
  const animalTransfersPending = livingAnimals(state).some(
    (animal) => animal.pendingPastureId,
  );
  if (!hasFarm && !seasonalFields && order.priorityKey !== "food_security")
    return;
  const jobTypes = [
    ...(!hasFarm && order.priorityKey === "food_security"
      ? ["build_farmstead"]
      : []),
    ...(seasonalFields
      ? [
          "grow_grain",
          "grow_vegetables",
          "hunt_game",
          "save_seed",
          "water_fields",
          "treat_crop_disease",
        ]
      : []),
    ...(animalTransfersPending
      ? [
          "relocate_cow",
          "relocate_pig",
          "relocate_sheep",
          "relocate_chicken",
          "relocate_dog",
        ]
      : []),
    ...(hasFarm
      ? [
          "grow_grain",
          "grow_vegetables",
          "prepare_animal_feed",
          "draw_stable_water",
          "breed_cattle",
          "breed_pig",
          "breed_sheep",
          "breed_dog",
          "breed_chicken",
          "milk_cattle",
          "collect_eggs",
          "shear_sheep",
          "collect_manure",
          "fertilize_fields",
          "slaughter_cattle",
        ]
      : []),
  ];
  for (const jobType of new Set(jobTypes)) {
    if (
      jobType === "hunt_game" &&
      (remoteHuntDispatch || openHuntingJob(state))
    )
      continue;
    const huntTarget =
      jobType === "hunt_game"
        ? reachableHuntingTarget(state, templates.hunt_game, context)
        : null;
    if (jobType === "hunt_game" && !huntTarget) continue;
    const preferred =
        jobType === "build_farmstead" ? foundingPlan(state, "farmstead") : null,
      site = preferred
        ? selectConstructionSite(state, preferred, context, events)
        : null;
    if (preferred && !site) continue;
    const template = site
        ? { ...templates[jobType], targetPosition: { ...site.door } }
        : templates[jobType],
      details = {
        ...(order.jobTypes.includes(jobType) ? { workOrderId: order.id } : {}),
        ...(huntTarget ? { animalTargetId: huntTarget.id } : {}),
        ...(site
          ? { construction: site, accessPosition: { ...site.door } }
          : {}),
      };
    if (["grow_grain", "grow_vegetables"].includes(jobType))
      postCropCrewJobs(state, template, context, events, details);
    else postProductionJob(state, template, context, events, details);
  }
}

function cancelResolvedForaging(state, template, events) {
  for (const job of state.village.jobs.filter(
    (candidate) =>
      candidate.jobType === template.jobType &&
      !["completed", "cancelled"].includes(candidate.status),
  )) {
    if (!cancelJob(state, job, "emergency_food_reserve_restored")) continue;
    events.push(
      jobEvent(state, "job_cancelled", job, {
        reason: "emergency_food_reserve_restored",
      }),
    );
  }
}

function forageRouteExists(state, workers, position, context) {
  return foragePathCost(state, workers, position, context) < Infinity;
}

function foragePathCost(state, workers, position, context) {
  return Math.min(
    ...workers.map((actor) => {
      const route = analyzeVillagePath(
        state,
        actor,
        position,
        context.terrainAt,
      );
      return route.ok ? route.cost : Infinity;
    }),
  );
}

function cancelUnreachableForaging(state, jobs, workers, context, events) {
  for (const job of jobs) {
    if (forageRouteExists(state, workers, job.targetPosition, context))
      continue;
    cancelJob(state, job, "forage_target_unreachable");
    events.push(
      jobEvent(state, "job_cancelled", job, {
        reason: "forage_target_unreachable",
      }),
    );
  }
}

export function forageAccessTree(state, workers, patches, context) {
  const routes = workers.flatMap((actor) =>
    patches.map((patch) =>
      analyzeVillagePath(state, actor, patch.position, context.terrainAt, {
        allowTreeClearing: true,
      }),
    ),
  );
  return routes
    .filter((route) => route.ok && route.clearableCells.length)
    .sort((left, right) => left.cost - right.cost)[0]?.clearableCells[0];
}

function postForageAccessClearing(state, template, tree, context, events) {
  if (!tree) return null;
  return postProductionJob(state, template, context, events, {
    parallelSlot: "forage_access",
    terrainCellTarget: true,
    terrainEffect: "tree_stump",
    allowMissingInput: true,
    foodReserveDuty: true,
    emergencyFoodDuty: true,
    reason: "starvation_forage_access_blocked_by_tree",
  });
}

// function-length-exempt: template -- declarative forage-job policy
function postEmergencyForagingJob(state, templates, context, events, order) {
  if (state.village.scenario !== "founding") return null;
  const template = templates.gather_wild_food;
  const residents = state.village.npcStates.length,
    durableFood = [
      "inn_meals",
      "farm_grain",
      "farm_vegetables",
      "dairy_milk",
      "pasture_meat",
    ].reduce(
      (total, stockpileKey) =>
        total + (stockpileByKey(state, stockpileKey)?.quantity ?? 0),
      0,
    );
  const feed = stockpileByKey(state, "stable_feed"),
    forage = stockpileByKey(state, "wild_forage"),
    humanEmergency = durableFood < residents,
    animalEmergency =
      livingDomesticAnimals(state).length > 0 &&
      (feed?.quantity ?? 0) < (feed?.threshold ?? 20) &&
      (forage?.quantity ?? 0) < 2;
  if (durableFood >= residents && !animalEmergency) {
    cancelResolvedForaging(state, template, events);
    return null;
  }
  const forager = state.village.npcStates.find(
    (actor) => actor.personKey === template.personKey,
  );
  if (!forager) return null;
  const patches = ripeForagePatches(state).sort(
    (left, right) =>
      foragePathCost(state, [forager], left.position, context) -
        foragePathCost(state, [forager], right.position, context) ||
      left.id.localeCompare(right.id),
  );
  const eligibleWorkers = state.village.npcStates
      .filter(
        (actor) =>
          actor.capabilityTags.includes("forage") &&
          actor.workPermissions.allowedJobTypes.includes(template.jobType),
      )
      .sort((left, right) => left.id.localeCompare(right.id)),
    generalWorkers = eligibleWorkers.filter(
      (actor) =>
        !["fisher", "innkeeper", "farmer", "herder"].includes(actor.personKey),
    ),
    workerIds = (generalWorkers.length ? generalWorkers : eligibleWorkers).map(
      (actor) => actor.id,
    );
  const originalOpen = state.village.jobs.filter(
    (job) =>
      job.jobType === template.jobType &&
      !["completed", "cancelled"].includes(job.status),
  );
  cancelUnreachableForaging(
    state,
    originalOpen,
    eligibleWorkers,
    context,
    events,
  );
  const open = originalOpen.filter((job) => job.status !== "cancelled"),
    claimed = new Set(open.map((job) => job.plan.foragePatchId)),
    availablePatches = patches.filter(
      (patch) =>
        !claimed.has(patch.id) &&
        forageRouteExists(state, eligibleWorkers, patch.position, context),
    ),
    accessTree = forageAccessTree(state, eligibleWorkers, patches, context),
    targetCount = humanEmergency
      ? Math.min(3, residents - durableFood, availablePatches.length)
      : Math.min(2, availablePatches.length),
    reason = humanEmergency
      ? "starvation_reserve_below_one_day"
      : "animal_feed_reserve_below_threshold";
  if (humanEmergency && !availablePatches.length)
    return postForageAccessClearing(
      state,
      { ...templates.clear_field_tree, targetPosition: accessTree },
      accessTree,
      context,
      events,
    );
  open.forEach((job, index) => {
    job.basePriority = humanEmergency ? 148 : 88;
    job.priority = Math.max(job.priority, job.basePriority);
    job.reason = reason;
    job.plan.parallelSlot ??= index;
    job.plan.parallelProduction = true;
    job.plan.allowedActorIds = [...workerIds];
    job.plan.emergencyFoodDuty = humanEmergency;
    job.plan.foodReserveDuty = humanEmergency;
    job.plan.reason = reason;
  });
  for (let slot = 0; slot < targetCount; slot += 1) {
    if (open.some((job) => job.plan.parallelSlot === slot)) continue;
    const patch = availablePatches.shift();
    if (!patch) break;
    postProductionJob(
      state,
      {
        ...template,
        priority: humanEmergency ? 148 : 88,
        targetPosition: { ...patch.position },
        outputQuantity: patch.yield,
      },
      context,
      events,
      {
        ...(order?.priorityKey === "food_security"
          ? { workOrderId: order.id }
          : {}),
        foragePatchId: patch.id,
        emergencyFoodDuty: humanEmergency,
        foodReserveDuty: humanEmergency,
        parallelProduction: true,
        parallelSlot: slot,
        allowedActorIds: workerIds,
        reason,
      },
    );
  }
  return open[0] ?? null;
}

function assistanceTargets(state, parent) {
  const site = parent.plan?.construction;
  if (!site) return [];
  ensureConstructionWork(parent);
  const claimed = new Set(
    state.village.jobs
      .filter(
        (job) =>
          job.plan?.parentJobId === parent.id &&
          !["completed", "cancelled"].includes(job.status),
      )
      .map((job) => job.plan.constructionElementKey),
  );
  claimed.add(parent.plan.activeConstructionElementKey);
  const work = parent.plan.constructionWork,
    candidates = syncConstructionSkillQueue(state, parent).filter(
      (element) =>
        element.materialDelivered &&
        element.status !== "complete" &&
        constructionElementReady(work, element) &&
        fieldFenceClearanceReady(state, element) &&
        !claimed.has(element.key),
    );
  return candidates;
}

function constructionElementReady(work, element) {
  const complete = (kinds) =>
    work.elements
      .filter((candidate) => kinds.includes(candidate.kind))
      .every((candidate) => candidate.status === "complete");
  if (element.kind === "wall" && work.doorFirstClosure)
    return complete(["door"]) || openWallCount(work) > 2;
  if (element.kind === "roof") return complete(["door", "wall"]);
  if (element.kind === "fixture")
    return complete(["door", "wall", "floor", "roof"]);
  return true;
}

function openWallCount(work) {
  return work.elements.filter(
    (element) => element.kind === "wall" && element.status !== "complete",
  ).length;
}

function fieldFenceClearanceReady(state, element) {
  if (element.kind !== "fence" || element.enclosurePurpose !== "field")
    return true;
  const survey = state.village.development.masterPlan.fieldClearingSurveys.find(
    (candidate) => candidate.boundaryKey === element.pastureKey,
  );
  if (!survey || (survey.clearanceRadius ?? 0) < 2) return false;
  return survey.treeCells
    .filter(
      (tree) =>
        Math.max(
          Math.abs(tree.x - element.position.x),
          Math.abs(tree.y - element.position.y),
        ) <= 2,
    )
    .every((tree) =>
      state.village.modifications.some(
        (change) => change.x === tree.x && change.y === tree.y,
      ),
    );
}

function releaseFieldFenceBlocks(state) {
  for (const job of state.village.jobs)
    for (const element of job.plan?.constructionWork?.elements ?? [])
      if (element.clearanceBlocked && fieldFenceClearanceReady(state, element))
        delete element.clearanceBlocked;
}

function staleProjectAssistReason(ownerBecameParentBuilder) {
  return ownerBecameParentBuilder
    ? "owner_became_parent_builder"
    : "project_no_longer_active";
}

function cancelStaleProjectAssists(state, events) {
  for (const job of state.village.jobs.filter(
    (candidate) =>
      (candidate.plan?.projectAssist || candidate.plan?.foremanDuty) &&
      !["completed", "cancelled"].includes(candidate.status),
  )) {
    if (job.status === "suspended" && job.suspendedByJobId)
      releaseProjectAssistClaim(state, job);
    const parent = state.village.jobs.find(
        (candidate) => candidate.id === job.plan.parentJobId,
      ),
      ownerBecameParentBuilder =
        job.plan?.projectAssist &&
        parent?.assignedActorId &&
        parent.assignedActorId === job.plan.ownerActorId;
    if (
      parent &&
      !parent.plan?.commissioning &&
      !["completed", "cancelled"].includes(parent.status) &&
      !ownerBecameParentBuilder
    )
      continue;
    const actor = villageWorkActor(state, job.assignedActorId);
    releaseProjectAssistClaim(state, job);
    cancelJob(state, job, staleProjectAssistReason(ownerBecameParentBuilder));
    if (actor) actor.workState = "available";
    events.push(jobEvent(state, "job_cancelled", job));
  }
}

function canAssistProject(state, actor, parent, occupied) {
  const current = currentActorJob(state, actor),
    protectedFarmer =
      state.village.facilities.includes("farmstead") &&
      actor.personKey === "farmer";
  return (
    actor.capabilityTags.includes("build") &&
    !protectedFarmer &&
    actor.id !== parent.assignedActorId &&
    !occupied.has(actor.id) &&
    (actor.workState === "available" ||
      (current &&
        !actor.carriedItem &&
        !current.plan?.lifeJob &&
        current.priority < parent.priority - 1))
  );
}

function projectAssistanceWorkers(state, parent) {
  const occupied = new Set(
    state.village.jobs
      .filter(
        (job) =>
          !["completed", "cancelled"].includes(job.status) &&
          job.plan?.projectAssist &&
          job.plan?.preferredActorId,
      )
      .map((job) => job.plan.preferredActorId),
  );
  return villageWorkActors(state)
    .filter((actor) => canAssistProject(state, actor, parent, occupied))
    .sort(
      (left, right) =>
        (right.skills?.construction ?? 0) - (left.skills?.construction ?? 0) ||
        left.id.localeCompare(right.id),
    )
    .slice(0, 4);
}

function releaseStaleConstructionDeliveryClaims(state, parent) {
  const live = new Set(
    state.village.jobs
      .filter(
        (job) =>
          job.plan?.constructionDelivery &&
          job.plan.parentJobId === parent.id &&
          !["completed", "cancelled"].includes(job.status),
      )
      .map((job) => job.id),
  );
  for (const element of parent.plan.constructionWork.elements)
    if (
      element.claimedByDeliveryJobId &&
      !live.has(element.claimedByDeliveryJobId)
    )
      delete element.claimedByDeliveryJobId;
}

function foundingConstructionSequenceAllows(state, parent) {
  if (state.village.scenario !== "founding" || parent.jobType !== "build_house")
    return true;
  const farmstead = state.village.jobs.find(
    (job) =>
      job.jobType === "build_farmstead" &&
      !["completed", "cancelled"].includes(job.status),
  );
  return !farmstead || farmsteadCoreComplete(farmstead);
}

function farmsteadCoreComplete(job) {
  return job.plan.constructionWork.elements
    .filter((element) => element.enclosurePurpose !== "field")
    .every((element) => element.status === "complete");
}

function cancelPrematureDeliveries(state, parent, events) {
  for (const job of state.village.jobs.filter(
    (candidate) =>
      candidate.plan?.constructionDelivery &&
      candidate.plan.parentJobId === parent.id &&
      !["completed", "cancelled"].includes(candidate.status),
  )) {
    const element = parent.plan.constructionWork.elements.find(
      (item) => item.key === job.plan.constructionElementKey,
    );
    if (
      element &&
      !element.clearanceBlocked &&
      fieldFenceClearanceReady(state, element)
    )
      continue;
    const actor = villageWorkActor(state, job.assignedActorId);
    restoreJobTransfer(state, job);
    if (element?.claimedByDeliveryJobId === job.id)
      delete element.claimedByDeliveryJobId;
    cancelJob(state, job, "construction_cell_not_ready");
    if (actor) actor.workState = "available";
    events.push(jobEvent(state, "job_cancelled", job));
  }
}

// function-length-exempt: template -- declarative delivery-job policy
function postConstructionDeliveryJobs(state, events) {
  const parents = state.village.jobs
    .filter(
      (job) =>
        job.plan?.constructionWork &&
        foundingConstructionSequenceAllows(state, job) &&
        !job.plan?.commissionSuspended &&
        !["completed", "cancelled"].includes(job.status),
    )
    .sort(jobOrder);
  for (const parent of parents) {
    cancelPrematureDeliveries(state, parent, events);
    releaseStaleConstructionDeliveryClaims(state, parent);
    const focus = syncConstructionSkillQueue(state, parent),
      open = state.village.jobs.filter(
        (job) =>
          job.plan?.constructionDelivery &&
          job.plan.parentJobId === parent.id &&
          !["completed", "cancelled"].includes(job.status),
      );
    const targets = focus.filter(
      (element) =>
        !element.materialDelivered &&
        !element.claimedByDeliveryJobId &&
        !element.clearanceBlocked &&
        fieldFenceClearanceReady(state, element),
    );
    const deliverySlots = Math.min(
        Math.max(0, 4 - open.length),
        targets.length,
      ),
      plannedBySource = new Map();
    for (const element of targets.slice(0, deliverySlots)) {
      const input = constructionMaterialInput(parent, element),
        source = input && stockpile(state, input.stockpileId);
      if (!input || !source) continue;
      const reserved = open
          .filter(
            (job) =>
              job.plan.sourceStockpileId === source.id &&
              job.plan.step === "to_source",
          )
          .reduce((total, job) => total + (job.plan.deliveryQuantity ?? 1), 0),
        planned = plannedBySource.get(source.id) ?? 0,
        available = source.quantity - reserved - planned;
      const remaining =
          element.materialRequired - element.materialDeliveredQuantity,
        deliveryQuantity = Math.min(
          CONSTRUCTION_CARRY_UNITS,
          remaining,
          available,
        );
      if (deliveryQuantity < 1) continue;
      const unit = element.materialDeliveredQuantity + 1,
        { job, created } = createJob(state, {
          id: namedUuid(parent.id, `material-delivery:${element.key}:${unit}`),
          jobType: "deliver_goods",
          name: `Haul material to ${element.kind} ${element.key.split("_").at(-1)}`,
          priority: parent.priority + 2,
          sourcePosition: { ...source.position },
          targetId: namedUuid(parent.id, `material-site:${element.key}`),
          targetPosition: {
            ...constructionElementWorkPosition(parent, element),
          },
          requiredCapabilities: ["haul"],
          reason: "supplying_construction",
          progressTotal: 2,
          progressUnit: "stage",
          plan: {
            template: "construction_delivery",
            step: "to_source",
            constructionDelivery: true,
            parentJobId: parent.id,
            constructionElementKey: element.key,
            sourceStockpileId: source.id,
            carriedQuantity: 0,
            deliveryQuantity,
            skills: ["logistics"],
            practiceUnits: deliveryQuantity,
            ...parentProjectAccountability(parent),
          },
        });
      if (!created) continue;
      plannedBySource.set(source.id, planned + deliveryQuantity);
      element.claimedByDeliveryJobId = job.id;
      element.deliveryRecords ??= [];
      element.deliveryRecords.push({
        jobId: job.id,
        quantity: deliveryQuantity,
        targetPosition: { ...job.targetPosition },
      });
      events.push(jobEvent(state, "job_posted", job));
    }
  }
}

// function-length-exempt: template -- declarative assistance-job policy
function postProjectAssistanceJob(state, parent, actor, target, cycle, events) {
  const targetPosition = constructionElementWorkPosition(parent, target),
    taskName =
      target.kind === "fence"
        ? "Build pasture fence section"
        : target.kind === "gate"
          ? "Build pasture gate"
          : target.kind === "wall"
            ? "Raise timber wall section"
            : target.kind === "door"
              ? "Hang the building door"
              : `Install ${target.fixtureVariant ?? "fixture"}`,
    { job, created } = createJob(state, {
      id: namedUuid(parent.id, `assist:${actor.id}:${cycle}`),
      jobType: "assist_project",
      name: taskName,
      priority: Math.max(60, (parent.basePriority ?? parent.priority) - 1),
      targetId: namedUuid(
        parent.id,
        `assist-site:${targetPosition.x},${targetPosition.y}`,
      ),
      targetPosition,
      requiredCapabilities: ["build"],
      reason: "helping_village_project",
      progressTotal: target.laborRequired ?? 12,
      progressUnit: "work_minute",
      plan: {
        template: "assist_project",
        step: "assist",
        projectAssist: true,
        parentJobId: parent.id,
        preferredActorId: actor.id,
        skills: ["construction"],
        practiceUnits: target.laborRequired ?? 12,
        ...parentProjectAccountability(parent),
        ...(parent.plan.constructionWork
          ? { constructionElementKey: target.key }
          : {}),
      },
    });
  if (created) events.push(jobEvent(state, "job_posted", job));
}

// function-length-exempt: template -- declarative assistance-job policy
function postProjectAssistanceJobs(state, events) {
  cancelStaleProjectAssists(state, events);
  const parent = [...state.village.jobs]
    .filter(
      (job) =>
        ASSISTABLE_PROJECT_JOBS.has(job.jobType) &&
        !job.plan?.commissionSuspended &&
        !["completed", "cancelled"].includes(job.status) &&
        assistanceTargets(state, job).length > 0,
    )
    .sort(jobOrder)[0];
  if (!parent) return;
  const workers = projectAssistanceWorkers(state, parent),
    targets = assistanceTargets(state, parent),
    cycle = parent.plan.constructionWork
      ? parent.plan.constructionWork.elements.filter(
          (element) => element.status === "complete",
        ).length
      : Math.floor(parent.progress.completed / 6);
  workers
    .slice(0, targets.length)
    .forEach((actor, index) =>
      postProjectAssistanceJob(
        state,
        parent,
        actor,
        targets[index],
        cycle,
        events,
      ),
    );
}

// function-length-exempt: template -- declarative inspection-job policy
function postForemanJobs(state, events) {
  const board = state.village.development?.strategyBoard;
  if (!board) return;
  for (const parent of state.village.jobs.filter(
    (job) =>
      job.plan?.constructionWork &&
      job.plan?.commissionId &&
      !job.plan?.commissioning &&
      !job.plan?.commissionSuspended &&
      !["completed", "cancelled"].includes(job.status),
  )) {
    const commission = board.commissions.find(
        (candidate) => candidate.id === parent.plan.commissionId,
      ),
      foreman = commission?.assignments?.foreman,
      completedElements = parent.plan.constructionWork.elements.filter(
        (element) => element.status === "complete",
      ).length,
      alreadyReviewed =
        parent.plan.foremanReview?.completedElements === completedElements,
      openReview = state.village.jobs.some(
        (job) =>
          job.plan?.foremanDuty &&
          job.plan.parentJobId === parent.id &&
          !["completed", "cancelled"].includes(job.status),
      );
    if (
      !foreman?.actorId ||
      commission.status === "suspended" ||
      completedElements === 0 ||
      alreadyReviewed ||
      openReview
    )
      continue;
    const targetPosition = projectInspectionPosition(parent),
      { job, created } = createJob(state, {
        id: namedUuid(
          parent.id,
          `foreman-review:${foreman.actorId}:${completedElements}`,
        ),
        jobType: "supervise_project",
        name: `Inspect ${parent.plan.construction.name}`,
        priority: parent.priority + 1,
        targetId: namedUuid(parent.id, `foreman-site:${completedElements}`),
        targetPosition,
        requiredCapabilities: ["build"],
        reason: "foreman_review_due",
        progressTotal: 15,
        progressUnit: "work_minute",
        plan: {
          template: "supervise_project",
          step: "review_project",
          foremanDuty: true,
          parentJobId: parent.id,
          ownerActorId: foreman.actorId,
          completedElementsAtPosting: completedElements,
          skills: ["construction"],
          practiceUnits: 2,
          ...parentProjectAccountability(parent),
          allowedActorIds: [foreman.actorId],
        },
      });
    if (created) events.push(jobEvent(state, "foreman_review_posted", job));
  }
}

function commissioningEntity(state, entityId) {
  return [
    ...(state.village.constructionPrimitives ?? []),
    ...(state.village.fixtures ?? []),
    ...(state.village.doors ?? []),
  ].find((entity) => entity.id === entityId);
}

function commissioningDefects(state, parent) {
  return parent.plan.constructionWork.elements
    .map((element) => ({
      element,
      entity: commissioningEntity(state, element.id),
    }))
    .filter(
      ({ entity }) =>
        !entity ||
        entity.lifecycleState === "destroyed" ||
        (entity.condition ?? entity.maxCondition ?? 100) <
          (entity.maxCondition ?? 100),
    )
    .map(({ element }) => element.id);
}

function openCommissioningJob(state, parent) {
  return state.village.jobs.some(
    (job) =>
      job.plan?.parentJobId === parent.id &&
      (job.plan.finalInspectionDuty || job.plan.facilityRepair) &&
      !["completed", "cancelled"].includes(job.status),
  );
}

function projectInspectionPosition(parent) {
  const site = parent.plan.construction,
    door = site.door,
    horizontalOffset = door.x >= site.x + site.w - 2 ? -1 : 1,
    verticalOffset = door.y >= site.y + site.h - 2 ? -1 : 1;
  if (door.y === site.y) return { x: door.x + horizontalOffset, y: door.y - 1 };
  if (door.y === site.y + site.h - 1)
    return { x: door.x + horizontalOffset, y: door.y + 1 };
  if (door.x === site.x) return { x: door.x - 1, y: door.y + verticalOffset };
  return { x: door.x + 1, y: door.y + verticalOffset };
}

function postFinalInspection(state, parent, actorId, stage, events) {
  const cycle = parent.plan.commissioning.cycle,
    { job, created } = createJob(state, {
      id: namedUuid(parent.id, `final-inspection:${stage}:${cycle}`),
      jobType: "inspect_object",
      name: `${stage === "architect" ? "Architect" : "Operator"} inspect ${parent.plan.construction.name}`,
      priority: parent.priority + 5,
      targetId: namedUuid(parent.id, `commissioning-site:${stage}:${cycle}`),
      targetPosition: projectInspectionPosition(parent),
      requiredCapabilities: ["inspect"],
      progressTotal: 15,
      progressUnit: "work_minute",
      reason: `final_${stage}_inspection`,
      plan: {
        finalInspectionDuty: true,
        inspectionStage: stage,
        parentJobId: parent.id,
        ownerActorId: actorId,
        allowedActorIds: [actorId],
        architectPlanId: parent.plan.architectPlanId,
        skills: [stage === "architect" ? "architecture" : "observation"],
        ...parentProjectAccountability(parent),
      },
    });
  job.plan.allowedActorIds = [actorId];
  if (created) events.push(jobEvent(state, "final_inspection_posted", job));
}

function postFacilityRepair(state, parent, actorId, entityId, events) {
  const cycle = parent.plan.commissioning.cycle,
    { job, created } = createJob(state, {
      id: namedUuid(parent.id, `commissioning-repair:${entityId}:${cycle}`),
      jobType: "assist_project",
      name: `Repair ${parent.plan.construction.name}`,
      priority: parent.priority + 6,
      targetId: entityId,
      targetPosition: projectInspectionPosition(parent),
      requiredCapabilities: ["build"],
      progressTotal: 30,
      progressUnit: "work_minute",
      reason: "final_inspection_repair",
      plan: {
        facilityRepair: true,
        repairEntityId: entityId,
        parentJobId: parent.id,
        ownerActorId: actorId,
        allowedActorIds: [actorId],
        architectPlanId: parent.plan.architectPlanId,
        skills: ["construction"],
        ...parentProjectAccountability(parent),
      },
    });
  job.plan.allowedActorIds = [actorId];
  if (created) events.push(jobEvent(state, "facility_repair_posted", job));
}

// function-length-exempt: template -- declarative commissioning-job policy
function postFinalCommissioningJobs(state, events) {
  const board = state.village.development?.strategyBoard;
  if (!board) return;
  for (const parent of state.village.jobs.filter(
    (job) =>
      job.plan?.commissioning &&
      job.plan.commissioning.status !== "approved" &&
      !["completed", "cancelled"].includes(job.status),
  )) {
    if (openCommissioningJob(state, parent)) continue;
    const commission = board.commissions.find(
        (item) => item.id === parent.plan.commissionId,
      ),
      status = parent.plan.commissioning.status;
    if (status === "repair_required")
      postFacilityRepair(
        state,
        parent,
        commission?.assignments?.foreman?.actorId,
        parent.plan.commissioning.repairEntityIds[0],
        events,
      );
    else
      postFinalInspection(
        state,
        parent,
        status === "architect_pending"
          ? commission?.planning?.architectActorId
          : commission?.assignments?.operator?.actorId,
        status === "architect_pending" ? "architect" : "operator",
        events,
      );
  }
}

// function-length-exempt: template -- foreman review projection
function foremanReview(state, parent, actor) {
  const elements = parent.plan.constructionWork.elements;
  return {
    foremanActorId: actor.id,
    foremanName: actorName(actor),
    completedElements: elements.filter(
      (element) => element.status === "complete",
    ).length,
    totalElements: elements.length,
    blockedElements: elements.filter(
      (element) => !element.materialDelivered && element.status !== "complete",
    ).length,
    tick: state.tick,
  };
}

function advanceForemanReview(state, job, actor, events) {
  const parent = state.village.jobs.find(
    (candidate) => candidate.id === job.plan.parentJobId,
  );
  if (!parent?.plan?.constructionWork) {
    cancelJob(state, job, "project_unavailable");
    actor.workState = "available";
    return events.push(jobEvent(state, "job_cancelled", job));
  }
  job.progress.completed += SIMULATION_MINUTES_PER_TICK;
  actor.objective = "supervise_project";
  actor.currentAction = `Inspecting ${parent.plan.construction.name}`;
  actor.actionReason = "foreman_review";
  if (job.progress.completed < job.progress.total)
    return events.push(jobEvent(state, "foreman_review_progress", job));
  const review = foremanReview(state, parent, actor),
    commission = state.village.development.strategyBoard.commissions.find(
      (candidate) => candidate.id === parent.plan.commissionId,
    );
  parent.plan.foremanReview = review;
  if (commission) commission.foremanReview = { ...review };
  events.push(jobEvent(state, "foreman_review_completed", job, review));
  completeJob(state, job, actor, events);
}

function finalizeSpecialistFacility(state, parent, actor, events) {
  const commission = state.village.development.strategyBoard.commissions.find(
    (item) => item.id === parent.plan.commissionId,
  );
  parent.plan.commissioning.status = "approved";
  parent.plan.commissioning.approvedAtTick = state.tick;
  parent.plan.commissioning.approvedByActorId = actor.id;
  if (commission) {
    commission.status = "operating";
    commission.planning.status = "operating";
    commission.commissioning = structuredClone(parent.plan.commissioning);
  }
  markVillageArchitectureDirty(state);
  applyProductionWorldEffect(state, parent, events);
  deriveVillageArchitecture(state);
  transitionJob(parent, "active", state.tick);
  parent.progress.completed = parent.progress.total;
  transitionJob(parent, "completed", state.tick);
  releaseJobReservations(state, parent.id, "job_completed");
  events.push(jobEvent(state, "facility_commissioned", parent));
  events.push(jobEvent(state, "job_completed", parent));
}

function finalInspectionUnavailable(state, job, actor) {
  const parent = state.village.jobs.find(
    (candidate) => candidate.id === job.plan.parentJobId,
  );
  const unavailable = !parent?.plan?.commissioning;
  const commissioned =
    parent?.plan?.commissioning?.status === "approved" ||
    parent?.status === "completed";
  if (!unavailable && !commissioned) return null;
  cancelJob(
    state,
    job,
    unavailable
      ? "commissioning_project_unavailable"
      : "facility_already_commissioned",
  );
  actor.workState = "available";
  return null;
}

function advanceFinalInspection(state, job, actor, events) {
  const parent = state.village.jobs.find(
    (candidate) => candidate.id === job.plan.parentJobId,
  );
  if (!parent?.plan?.commissioning || parent.status === "completed")
    return finalInspectionUnavailable(state, job, actor);
  if (parent.plan.commissioning.status === "approved")
    return finalInspectionUnavailable(state, job, actor);
  job.progress.completed += SIMULATION_MINUTES_PER_TICK;
  actor.currentAction = `Final inspection of ${parent.plan.construction.name}`;
  actor.actionReason = "facility_final_inspection";
  if (job.progress.completed < job.progress.total) return;
  const defects = commissioningDefects(state, parent),
    stage = job.plan.inspectionStage;
  if (defects.length) {
    parent.plan.commissioning.status = "repair_required";
    parent.plan.commissioning.repairEntityIds = defects;
    events.push(jobEvent(state, "final_inspection_failed", job, { defects }));
  } else if (stage === "architect") {
    parent.plan.commissioning.status = "operator_pending";
    parent.plan.commissioning.architectApprovedAtTick = state.tick;
    events.push(jobEvent(state, "architect_final_inspection_passed", job));
  } else {
    parent.plan.commissioning.operatorApprovedAtTick = state.tick;
    finalizeSpecialistFacility(state, parent, actor, events);
  }
  completeJob(state, job, actor, events);
}

function advanceFacilityRepair(state, job, actor, events) {
  const parent = state.village.jobs.find(
    (candidate) => candidate.id === job.plan.parentJobId,
  );
  if (!parent?.plan?.commissioning) {
    cancelJob(state, job, "commissioning_project_unavailable");
    actor.workState = "available";
    return;
  }
  job.progress.completed += SIMULATION_MINUTES_PER_TICK;
  actor.currentAction = `Repairing ${parent.plan.construction.name}`;
  actor.actionReason = "facility_inspection_repair";
  if (job.progress.completed < job.progress.total) return;
  if (!repairConstructionEntity(state, job.plan.repairEntityId))
    return blockActiveJob(state, job, "construction_material_pending", events);
  parent.plan.commissioning.repairEntityIds = commissioningDefects(
    state,
    parent,
  );
  if (!parent.plan.commissioning.repairEntityIds.length) {
    parent.plan.commissioning.status = "architect_pending";
    parent.plan.commissioning.cycle += 1;
  }
  events.push(jobEvent(state, "facility_repaired", job));
  completeJob(state, job, actor, events);
}

function submitSurveyedPlan(state, plan, commission, actor, events) {
  if (!plan.alternatives.every((candidate) => candidate.status === "surveyed"))
    return;
  plan.status = "awaiting_approval";
  plan.surveyCompletedAtTick = state.tick;
  if (commission)
    commission.planning = {
      ...commission.planning,
      status: "awaiting_leader_plan_approval",
      planId: plan.id,
      recommendedAlternativeId: plan.recommendedAlternativeId,
    };
  events.push({
    type: "village_architect_plan_submitted",
    planId: plan.id,
    commissionId: plan.commissionId,
    projectKey: plan.projectKey,
    recommendedAlternativeId: plan.recommendedAlternativeId,
    actorId: actor.id,
    actorName: actor.name,
    tick: state.tick,
  });
}

function advanceArchitectSurvey(state, job, actor, events) {
  const development = state.village.development,
    plan = development.architectPlans.find(
      (candidate) => candidate.id === job.plan.architectPlanId,
    ),
    alternative = plan?.alternatives.find(
      (candidate) => candidate.id === job.plan.alternativeId,
    ),
    commission = development.strategyBoard.commissions.find(
      (candidate) => candidate.id === plan?.commissionId,
    );
  if (!plan || !alternative || plan.status !== "surveying") {
    cancelJob(state, job, "architect_plan_unavailable");
    actor.workState = "available";
    return events.push(jobEvent(state, "job_cancelled", job));
  }
  job.progress.completed += SIMULATION_MINUTES_PER_TICK;
  actor.objective = "survey_architecture";
  actor.currentAction = `Surveying option ${alternative.rank} for ${alternative.site.name}`;
  actor.actionReason = "architect_site_comparison";
  if (job.progress.completed < job.progress.total)
    return events.push(jobEvent(state, "architect_survey_progress", job));
  alternative.status = "surveyed";
  alternative.surveyedByActorId = actor.id;
  alternative.surveyedAtTick = state.tick;
  events.push(
    jobEvent(state, "architect_site_surveyed", job, {
      planId: plan.id,
      alternativeId: alternative.id,
      rank: alternative.rank,
      score: alternative.score,
      billOfMaterials: structuredClone(alternative.billOfMaterials),
    }),
  );
  submitSurveyedPlan(state, plan, commission, actor, events);
  completeJob(state, job, actor, events);
}

function completeConstructionSurvey(state, job, actor, events) {
  const parent = state.village.jobs.find(
      (candidate) => candidate.id === job.plan.parentJobId,
    ),
    element = parent?.plan?.constructionWork?.elements.find(
      (candidate) => candidate.id === job.targetId,
    );
  if (!element || element.status === "complete") {
    cancelJob(state, job, "construction_element_unavailable");
    actor.workState = "available";
    return events.push(jobEvent(state, "job_cancelled", job));
  }
  element.surveyedById = actor.id;
  element.surveyedAtTick = state.tick;
  events.push(
    jobEvent(state, "construction_element_surveyed", job, {
      elementId: element.id,
      elementKey: element.key,
      position: { ...element.position },
    }),
  );
  completeJob(state, job, actor, events);
}

function constructionSurveyOrder(job) {
  return ["active", "reserved", "suspended", "available", "blocked"].indexOf(
    job.status,
  );
}

function cancelDuplicateConstructionSurveys(state, events) {
  const seen = new Set(),
    open = state.village.jobs
      .filter(
        (job) =>
          job.plan?.constructionSurvey &&
          !["completed", "cancelled"].includes(job.status),
      )
      .sort(
        (left, right) =>
          constructionSurveyOrder(left) - constructionSurveyOrder(right) ||
          left.id.localeCompare(right.id),
      );
  for (const job of open) {
    if (!seen.has(job.targetId)) {
      seen.add(job.targetId);
      continue;
    }
    cancelJob(state, job, "duplicate_construction_survey");
    events.push(jobEvent(state, "job_cancelled", job));
  }
}

function repairConstructionSurveyTargets(state, events) {
  cancelDuplicateConstructionSurveys(state, events);
  for (const job of state.village.jobs.filter(
    (candidate) =>
      candidate.plan?.constructionSurvey &&
      !["completed", "cancelled"].includes(candidate.status),
  )) {
    const parent = state.village.jobs.find(
        (candidate) => candidate.id === job.plan.parentJobId,
      ),
      element = parent?.plan?.constructionWork?.elements.find(
        (candidate) => candidate.id === job.targetId,
      );
    if (!parent || !element) continue;
    const target = constructionElementWorkPosition(parent, element);
    if (key(target) === key(job.targetPosition)) continue;
    job.targetPosition = { ...target };
    delete job.plan.cachedPath;
    if (job.status !== "blocked") continue;
    releaseJobReservations(state, job.id, "survey_target_repaired");
    job.assignedActorId = null;
    transitionJob(job, "available", state.tick);
    job.nextRetryAtTick = null;
    events.push(jobEvent(state, "job_reopened", job));
  }
}

// function-length-exempt: template -- declarative survey-job policy
function postConstructionSurveyJobs(state, events) {
  if (state.village.scenario !== "founding") return;
  repairConstructionSurveyTargets(state, events);
  const openSurveys = state.village.jobs.filter(
      (job) =>
        job.plan?.constructionSurvey &&
        !["completed", "cancelled"].includes(job.status),
    ),
    openOwners = new Set(openSurveys.map((job) => job.plan.preferredActorId)),
    openElementIds = new Set(openSurveys.map((job) => job.targetId)),
    parents = state.village.jobs.filter(
      (job) =>
        job.plan?.constructionWork &&
        !["completed", "cancelled"].includes(job.status),
    ),
    elements = parents.flatMap((parent) =>
      syncConstructionSkillQueue(state, parent)
        .filter(
          (element) =>
            element.status === "planned" &&
            !element.surveyedById &&
            !openElementIds.has(element.id),
        )
        .map((element) => ({ parent, element })),
    );
  const workers = state.village.npcStates.filter(
    (actor) =>
      actor.workState === "available" &&
      actor.capabilityTags.includes("general_labor") &&
      !openOwners.has(actor.id),
  );
  workers.slice(0, elements.length).forEach((actor, index) => {
    const { parent, element } = elements[index],
      { job, created } = createJob(state, {
        id: namedUuid(element.id, `survey:${actor.id}`),
        jobType: "survey_construction",
        name: `Survey ${element.kind} position`,
        priority:
          parent.jobType === "build_field_camp" ? parent.priority + 1 : 15,
        targetId: element.id,
        targetPosition: constructionElementWorkPosition(parent, element),
        requiredCapabilities: ["general_labor"],
        reason: "planning_construction_element",
        progressTotal: 1,
        progressUnit: "site",
        plan: {
          constructionSurvey: true,
          parentJobId: parent.id,
          preferredActorId: actor.id,
        },
      });
    if (created) events.push(jobEvent(state, "job_posted", job));
  });
}

function cancelDeadResidentWork(state, events) {
  const deadIds = new Set(
    state.village.npcStates
      .filter((actor) => actor.life?.status === "dead")
      .map((actor) => actor.id),
  );
  for (const job of state.village.jobs)
    if (
      deadIds.has(job.assignedActorId) &&
      !["completed", "cancelled"].includes(job.status)
    ) {
      const actor = state.village.npcStates.find(
        (candidate) => candidate.id === job.assignedActorId,
      );
      cancelJob(state, job, "assigned_resident_died");
      if (actor) actor.carriedItem = null;
      events.push(jobEvent(state, "job_cancelled", job));
    }
}

function cancelLegacyWholePlotJobs(state, events) {
  for (const job of state.village.jobs.filter(
    (candidate) =>
      candidate.plan?.cropAction &&
      !candidate.plan?.cropCellKey &&
      !["completed", "cancelled"].includes(candidate.status),
  )) {
    const actor = villageWorkActor(state, job.assignedActorId);
    restoreJobTransfer(state, job);
    cancelJob(state, job, "cell_queue_migration");
    if (actor) actor.workState = "available";
    events.push(jobEvent(state, "job_cancelled", job));
  }
}

function burialJobOpen(state, corpseId) {
  return state.village.jobs.some(
    (job) =>
      job.plan?.civicBurial &&
      job.plan.corpseId === corpseId &&
      !["completed", "cancelled"].includes(job.status),
  );
}

function residentBurialCandidates(state) {
  return ensureVillageCivic(state).residentCorpses.filter(
    (corpse) =>
      corpse.status === "exposed" &&
      (corpse.requestedDisposition ?? "burial") === "burial" &&
      !burialJobOpen(state, corpse.id),
  );
}

function postResidentBurialJobs(state, events) {
  const corpses = residentBurialCandidates(state);
  if (!corpses.length) return;
  designateVillageCemetery(state);
  for (const corpse of corpses) {
    const grave = reserveVillageGrave(state, corpse.id);
    if (!grave) break;
    const { job, created } = createJob(state, {
      id: namedUuid(corpse.id, "burial-job"),
      jobType: "bury_resident",
      name: `Bury ${corpse.name}`,
      priority: 155,
      targetId: corpse.id,
      targetPosition: grave.position,
      requiredCapabilities: ["burial"],
      reason: "resident_death_requires_burial",
      progressTotal: 6,
      progressUnit: "labor",
      plan: {
        civicBurial: true,
        corpseId: corpse.id,
        graveId: grave.id,
        step: "dig_grave",
        stageProgress: 0,
        skills: ["construction"],
      },
    });
    if (created)
      events.push(jobEvent(state, "job_posted", job, { graveId: grave.id }));
  }
}

function civicDispositionJobOpen(state, corpseId, flag) {
  return state.village.jobs.some(
    (job) =>
      job.plan?.[flag] &&
      job.plan.corpseId === corpseId &&
      !["completed", "cancelled"].includes(job.status),
  );
}

function cancelMourningForExhumation(state, corpseId) {
  for (const job of state.village.jobs.filter(
    (candidate) =>
      candidate.plan?.civicMourning &&
      candidate.plan.corpseId === corpseId &&
      !["completed", "cancelled"].includes(candidate.status),
  )) {
    const actor = villageWorkActor(state, job.assignedActorId);
    cancelJob(state, job, "player_ordered_exhumation");
    if (actor) actor.workState = "available";
  }
}

function postResidentExhumationJobs(state, events) {
  const corpses = ensureVillageCivic(state).residentCorpses.filter(
    (corpse) =>
      corpse.status === "buried" &&
      corpse.exhumationOrdered &&
      !civicDispositionJobOpen(state, corpse.id, "civicExhumation"),
  );
  for (const corpse of corpses) {
    cancelMourningForExhumation(state, corpse.id);
    const grave = villageGrave(state, corpse.graveId),
      { job, created } = createJob(state, {
        id: namedUuid(corpse.id, "exhumation-job"),
        jobType: "exhume_resident",
        name: `Exhume ${corpse.name}`,
        priority: 154,
        targetId: grave.id,
        targetPosition: grave.position,
        requiredCapabilities: ["burial"],
        reason: "player_ordered_exhumation",
        progressTotal: 3,
        progressUnit: "labor",
        plan: { civicExhumation: true, corpseId: corpse.id, graveId: grave.id },
      });
    if (created) events.push(jobEvent(state, "job_posted", job));
  }
}

function postResidentCremationJobs(state, events) {
  const corpses = ensureVillageCivic(state).residentCorpses.filter(
    (corpse) =>
      corpse.status === "exposed" &&
      corpse.requestedDisposition === "cremation" &&
      !civicDispositionJobOpen(state, corpse.id, "civicCremation"),
  );
  if (!corpses.length) return;
  ensureVillageCremationPyre(state);
  for (const corpse of corpses) {
    const { job, created } = createJob(state, {
      id: namedUuid(corpse.id, "cremation-job"),
      jobType: "cremate_resident",
      name: `Cremate ${corpse.name}`,
      priority: 153,
      targetId: corpse.id,
      targetPosition: corpse.position,
      requiredCapabilities: ["burial"],
      reason: "resident_cremation_policy",
      progressTotal: 3,
      progressUnit: "labor",
      plan: {
        civicCremation: true,
        corpseId: corpse.id,
        step: "collect_corpse",
      },
    });
    if (created) events.push(jobEvent(state, "job_posted", job));
  }
}

function mourningJobOpen(state, corpseId, actorId) {
  return state.village.jobs.some(
    (job) =>
      job.plan?.civicMourning &&
      job.plan.corpseId === corpseId &&
      job.plan.ownerActorId === actorId &&
      !["completed", "cancelled"].includes(job.status),
  );
}

function postResidentMourningJobs(state, events) {
  const corpses = ensureVillageCivic(state).residentCorpses.filter(
    (corpse) => corpse.status === "buried" && !corpse.exhumationOrdered,
  );
  for (const corpse of corpses) {
    const grave = villageGrave(state, corpse.graveId);
    for (const actor of residentMourners(state, corpse)) {
      if (!grave || mourningJobOpen(state, corpse.id, actor.id)) continue;
      const { job, created } = createJob(state, {
        id: namedUuid(corpse.id, `mourning:${actor.id}`),
        jobType: "mourn_resident",
        name: `Mourn ${corpse.name}`,
        priority: 130,
        targetId: grave.id,
        targetPosition: grave.position,
        requiredCapabilities: ["socialize"],
        reason: "household_bereavement",
        progressTotal: 30,
        progressUnit: "work_minute",
        plan: {
          civicMourning: true,
          corpseId: corpse.id,
          graveId: grave.id,
          ownerActorId: actor.id,
        },
      });
      if (created) events.push(jobEvent(state, "job_posted", job));
    }
  }
}

function openAnimalCarcassDuty(state) {
  return state.village.jobs.some(
    (job) =>
      job.plan?.animalCarcassDuty &&
      !["completed", "cancelled"].includes(job.status),
  );
}

function recoverableAnimalCarcass(state, animal) {
  if (animal.carcassState !== "fresh" || animal.deathCause !== "predation")
    return false;
  const meat = stockpileByKey(state, "pasture_meat");
  return Boolean(meat && storageAvailableFor(state, meat.id) >= 4);
}

function pendingAnimalCarcass(state) {
  return state.village.animals
    .filter(
      (animal) =>
        animal.status === "dead" &&
        ["fresh", "spoiled", "bones"].includes(animal.carcassState) &&
        !animal.disposition,
    )
    .sort(
      (left, right) =>
        left.deathDay - right.deathDay || left.id.localeCompare(right.id),
    )[0];
}

function animalCarcassJobInput(state, animal, disposal) {
  const recover = recoverableAnimalCarcass(state, animal),
    meat = stockpileByKey(state, "pasture_meat");
  return {
    id: namedUuid(animal.id, "carcass-duty"),
    jobType: recover ? "dress_animal_carcass" : "dispose_animal_carcass",
    name: recover ? `Dress ${animal.name}` : `Dispose of ${animal.name}`,
    priority: recover ? 140 : 132,
    targetId: animal.id,
    targetPosition: animal.position,
    requiredCapabilities: [recover ? "butcher" : "general_labor"],
    reason: recover ? "fresh_safe_carcass" : "unsafe_animal_remains",
    progressTotal: recover ? 4 : 2,
    progressUnit: "labor",
    plan: {
      animalCarcassDuty: true,
      carcassId: animal.id,
      step: recover ? "dress" : "collect",
      meatQuantity: 4,
      storagePosition: meat?.position,
      disposalPosition: disposal.position,
      skills: [recover ? "butchery" : "logistics"],
    },
  };
}

function postAnimalCarcassJob(state, events) {
  if (openAnimalCarcassDuty(state)) return;
  const animal = pendingAnimalCarcass(state),
    disposal = animal ? designateAnimalDisposalSite(state) : null;
  if (!animal || !disposal) return;
  const { job, created } = createJob(
    state,
    animalCarcassJobInput(state, animal, disposal),
  );
  if (created) events.push(jobEvent(state, "job_posted", job));
}

function securityOperations(state) {
  return state.village.development?.masterPlan?.defenseStrategy
    ?.securityOperations;
}

function operatingSecurityBuilding(state, key) {
  if (!state.village.facilities.includes(key)) return null;
  return state.village.buildings.find(
    (building) => building.key === key && building.status === "complete",
  );
}

function securityWorkstation(state, key, role) {
  const building = operatingSecurityBuilding(state, key);
  if (!building) return null;
  const fixture = state.village.fixtures.find(
    (candidate) =>
      candidate.buildingId === building.id && candidate.role === role,
  );
  return fixture ? { building, fixture } : null;
}

function openSecurityDuty(state, flag) {
  return state.village.jobs.find(
    (job) =>
      job.plan?.[flag] && !["completed", "cancelled"].includes(job.status),
  );
}

function outstandingSecurityIssue(operations, actorId = null) {
  return operations.issuedEquipment.find(
    (entry) =>
      (!actorId || entry.actorId === actorId) &&
      entry.returnedAtTick == null &&
      entry.lostAtTick == null,
  );
}

function postSecurityEquipmentJob(state, events) {
  const operations = securityOperations(state),
    guard = guardActor(state),
    station = securityWorkstation(state, "armory", "issue_desk"),
    weapons = stockpileByKey(state, "smithy_weapons");
  if (!operations || !guard || !station || !weapons?.quantity) return null;
  if (outstandingSecurityIssue(operations, guard.id)) return null;
  if (openSecurityDuty(state, "securityEquipmentDuty")) return null;
  const { job, created } = createJob(state, {
    jobType: "issue_defense_equipment",
    name: "Issue watch equipment",
    priority: 45,
    targetId: station.fixture.id,
    targetPosition: { x: station.fixture.x, y: station.fixture.y },
    requiredCapabilities: ["haul"],
    reason: "watch_equipment_unissued",
    progressTotal: 2,
    progressUnit: "stage",
    plan: {
      ownerActorId: guard.id,
      securityEquipmentDuty: true,
      sourceStockpileId: weapons.id,
      itemKind: weapons.itemKind,
      accessPosition: { ...station.building.door },
      skills: ["logistics"],
    },
  });
  if (created) events.push(jobEvent(state, "job_posted", job));
  return job;
}

function recordLostSecurityEquipment(state, issue, reason, events) {
  Object.assign(issue, {
    status: "lost",
    lostAtTick: state.tick,
    lossReason: reason,
  });
  const record = { ...issue, action: "lost" };
  securityOperations(state).equipmentLedger.push(record);
  events.push({ type: "security_equipment_lost", scope: "village", ...record });
}

function reconcileSecurityEquipment(state, events) {
  const operations = securityOperations(state);
  if (!operations) return;
  for (const issue of operations.issuedEquipment) {
    if (issue.returnedAtTick != null || issue.lostAtTick != null) continue;
    if (issue.status === "in_return_transit") continue;
    const actor = state.village.npcStates.find(
      (candidate) => candidate.id === issue.actorId,
    );
    if (!actor) {
      recordLostSecurityEquipment(state, issue, "actor_missing", events);
      continue;
    }
    if (actor.life?.status === "dead" && issue.status !== "recoverable")
      Object.assign(issue, {
        status: "recoverable",
        position: { ...actor.position },
        recoverableAtTick: state.tick,
      });
    else if (actor.life?.status !== "dead" && !actor.defenseEquipment)
      recordLostSecurityEquipment(state, issue, "equipment_missing", events);
  }
}

function postSecurityEquipmentReturnJob(state, events) {
  const operations = securityOperations(state),
    issue = operations?.issuedEquipment.find(
      (entry) => entry.status === "recoverable",
    ),
    station = securityWorkstation(state, "armory", "issue_desk"),
    stock = stockpileByKey(state, "smithy_weapons");
  if (!issue || !station || !stock) return null;
  if (openSecurityDuty(state, "securityEquipmentReturnDuty")) return null;
  const { job, created } = createJob(state, {
    jobType: "return_defense_equipment",
    name: "Recover issued watch equipment",
    priority: 72,
    targetId: issue.id,
    targetPosition: { ...issue.position },
    requiredCapabilities: ["general_labor"],
    reason: "issued_equipment_recoverable",
    progressTotal: 2,
    progressUnit: "stage",
    plan: {
      securityEquipmentReturnDuty: true,
      issueId: issue.id,
      targetStockpileId: stock.id,
      returnPosition: { x: station.fixture.x, y: station.fixture.y },
      accessPosition: { ...station.building.door },
      step: "collect",
      skills: ["logistics"],
    },
  });
  if (created) events.push(jobEvent(state, "job_posted", job));
  return job;
}

function militiaCandidate(state, operations) {
  const counts = new Map();
  for (const entry of operations.trainingLedger)
    counts.set(entry.actorId, (counts.get(entry.actorId) ?? 0) + 1);
  return state.village.npcStates
    .filter(
      (actor) =>
        actor.life?.status !== "dead" &&
        actor.personKey !== "watchman" &&
        actor.workPermissions.allowedJobTypes.includes("militia_training"),
    )
    .sort(
      (left, right) =>
        (counts.get(left.id) ?? 0) - (counts.get(right.id) ?? 0) ||
        left.id.localeCompare(right.id),
    )[0];
}

function postSecurityTrainingJob(state, events) {
  const operations = securityOperations(state),
    station = securityWorkstation(state, "training_yard", "practice_dummy"),
    instructor = guardActor(state);
  if (!operations || !station || !instructor) return null;
  if (state.tick < operations.nextTrainingAtTick) return null;
  if (openSecurityDuty(state, "securityTrainingDuty")) return null;
  const trainee = militiaCandidate(state, operations);
  if (!trainee) return null;
  const { job, created } = createJob(state, {
    jobType: "militia_training",
    name: "Practice village defense",
    priority: 24,
    targetId: station.fixture.id,
    targetPosition: { x: station.fixture.x, y: station.fixture.y },
    requiredCapabilities: ["general_labor"],
    reason: "daily_militia_readiness",
    progressTotal: 3,
    progressUnit: "drill",
    plan: {
      ownerActorId: trainee.id,
      instructorId: instructor.id,
      securityTrainingDuty: true,
      accessPosition: { ...station.building.door },
      skills: ["combat_readiness"],
      practiceUnits: 3,
    },
  });
  if (created) events.push(jobEvent(state, "job_posted", job));
  return job;
}

function advanceSecurityEquipment(state, job, actor, events) {
  job.progress.completed += 1;
  actor.currentAction = "Checking out watch equipment at the armory";
  actor.actionReason = "watch_equipment_issue";
  if (job.progress.completed < job.progress.total)
    return events.push(
      jobEvent(state, "security_equipment_issue_progress", job),
    );
  const source = state.village.stockpiles.find(
    (stockpile) => stockpile.id === job.plan.sourceStockpileId,
  );
  if (!source?.quantity)
    return blockActiveJob(state, job, "defense_equipment_unavailable", events);
  const issue = {
    id: namedUuid(state.id, `security-equipment:${actor.id}:${state.tick}`),
    actorId: actor.id,
    itemKind: job.plan.itemKind,
    status: "issued",
    issuedAtTick: state.tick,
    returnedAtTick: null,
    lostAtTick: null,
  };
  source.quantity -= 1;
  securityOperations(state).issuedEquipment.push(issue);
  securityOperations(state).equipmentLedger.push({
    ...issue,
    action: "issued",
  });
  actor.defenseEquipment = { issueId: issue.id, itemKind: issue.itemKind };
  events.push(jobEvent(state, "security_equipment_issued", job, issue));
  completeJob(state, job, actor, events);
}

function collectSecurityEquipment(state, job, issue, actor, events) {
  const owner = state.village.npcStates.find(
    (candidate) => candidate.id === issue.actorId,
  );
  if (owner) owner.defenseEquipment = null;
  actor.carriedItem = {
    itemKind: issue.itemKind,
    name: "Recovered watch equipment",
    quantity: 1,
  };
  issue.status = "in_return_transit";
  job.plan.step = "return";
  job.targetPosition = { ...job.plan.returnPosition };
  delete job.plan.cachedPath;
  events.push(jobEvent(state, "security_equipment_recovered", job));
}

function storeReturnedSecurityEquipment(state, job, issue, actor, events) {
  const stock = state.village.stockpiles.find(
    (candidate) => candidate.id === job.plan.targetStockpileId,
  );
  if (!stock || stock.quantity >= stock.capacity)
    return blockActiveJob(state, job, "armory_storage_full", events);
  stock.quantity += 1;
  Object.assign(issue, { status: "returned", returnedAtTick: state.tick });
  actor.carriedItem = null;
  const record = { ...issue, action: "returned", returnedByActorId: actor.id };
  securityOperations(state).equipmentLedger.push(record);
  events.push(jobEvent(state, "security_equipment_returned", job, record));
  completeJob(state, job, actor, events);
}

function advanceSecurityEquipmentReturn(state, job, actor, events) {
  const issue = securityOperations(state)?.issuedEquipment.find(
    (entry) => entry.id === job.plan.issueId,
  );
  if (!issue)
    return blockActiveJob(state, job, "security_issue_missing", events);
  if (job.plan.step === "collect")
    return collectSecurityEquipment(state, job, issue, actor, events);
  return storeReturnedSecurityEquipment(state, job, issue, actor, events);
}

function advanceSecurityTraining(state, job, actor, events) {
  job.progress.completed += 1;
  actor.currentAction = "Drilling at the village training yard";
  actor.actionReason = "militia_training";
  if (job.progress.completed < job.progress.total)
    return events.push(jobEvent(state, "militia_training_progress", job));
  const operations = securityOperations(state),
    record = {
      id: namedUuid(state.id, `militia-training:${actor.id}:${state.tick}`),
      actorId: actor.id,
      instructorId: job.plan.instructorId,
      completedAtTick: state.tick,
    };
  operations.trainingLedger.push(record);
  operations.nextTrainingAtTick = state.tick + 2400;
  events.push(jobEvent(state, "militia_training_completed", job, record));
  completeJob(state, job, actor, events);
}

function guardActor(state) {
  return state.village.npcStates.find(
    (npc) => npc.personKey === "watchman" && npc.life?.status !== "dead",
  );
}

// function-length-exempt: template -- declarative guard-job policy
function postGuardIncidentJobs(state, events) {
  const incidents = state.village.incidents.filter(
    (incident) =>
      incident.perceivedBy && incident.status === "reported" && !incident.jobId,
  );
  for (const incident of incidents) {
    const danger = incident.kind === "danger",
      { job, created } = createJob(state, {
        jobType: danger ? "respond_danger" : "investigate_crime",
        name: danger ? "Respond to danger" : "Investigate property damage",
        priority: danger ? 100 : 90,
        targetId: incident.evidenceId,
        targetPosition: incident.position,
        requiredCapabilities: [danger ? "respond" : "investigate"],
        reason: danger ? "danger_reported" : "property_damage_reported",
        progressTotal: 2,
        progressUnit: "stage",
        plan: {
          template: danger ? "respond_danger" : "investigate_crime",
          step: "inspect_evidence",
          musterRequired: danger,
          musterPointId: danger
            ? state.village.development?.masterPlan?.defenseStrategy
                ?.musterPoint?.id
            : null,
          incidentId: incident.id,
          offenderId: incident.offenderId,
        },
      });
    incident.jobId = job.id;
    if (created)
      events.push(
        jobEvent(state, "job_posted", job, { incidentId: incident.id }),
      );
  }
}

function activeGuardIncident(state) {
  return state.village.jobs.some(
    (job) =>
      ["investigate_crime", "respond_danger"].includes(job.jobType) &&
      !["completed", "cancelled"].includes(job.status),
  );
}

function guardPatrolDue(state) {
  const last = state.village.lastGuardPatrolAtTick;
  if (last == null) return true;
  const interval = state.village.clock.phase === "night" ? 200 : 600;
  return state.tick - last >= interval;
}

function reconcileGuardPatrols(state, events) {
  const open = state.village.jobs
    .filter(
      (job) =>
        job.jobType === "patrol_route" &&
        !["completed", "cancelled"].includes(job.status),
    )
    .sort(
      (left, right) =>
        Number(right.status === "active") - Number(left.status === "active") ||
        left.createdAtTick - right.createdAtTick,
    );
  for (const duplicate of open.slice(1)) {
    cancelJob(state, duplicate, "duplicate_guard_patrol");
    events.push(
      jobEvent(state, "job_cancelled", duplicate, {
        reason: "duplicate_guard_patrol",
      }),
    );
  }
  return open[0] ?? null;
}

function foundingFoodEmergency(state) {
  if (state.village.scenario !== "founding") return false;
  const keys = [
    "inn_meals",
    "inn_fish",
    "wild_forage",
    "farm_grain",
    "farm_vegetables",
    "dairy_milk",
    "pasture_meat",
  ];
  const portions = keys.reduce(
    (total, stockKey) =>
      total + (stockpileByKey(state, stockKey)?.quantity ?? 0),
    0,
  );
  return portions < state.village.npcStates.length;
}

function cancelPatrolForFoodEmergency(state, patrol, events) {
  if (!patrol) return;
  const guard = villageWorkActor(state, patrol.assignedActorId);
  releaseJobReservations(state, patrol.id, "founding_food_emergency");
  cancelJob(state, patrol, "founding_food_emergency");
  if (guard) guard.workState = "available";
  events.push(jobEvent(state, "job_cancelled", patrol));
}

function createGuardPatrolJob(state, guard, route) {
  const shift = Math.floor(state.tick / 200);
  return createJob(state, {
    jobType: "patrol_route",
    name: "Patrol Stonebridge",
    priority: 20,
    targetId: namedUuid(state.id, `guard-patrol:stonebridge:${shift}`),
    targetPosition: guard.position,
    requiredCapabilities: ["patrol"],
    reason: "routine_town_watch",
    progressTotal: route.length,
    progressUnit: "waypoint",
    plan: {
      template: "patrol_route",
      step: "patrol",
      nextRouteIndex: 1,
      route,
      watchBasis: "homes_people_active_work",
    },
  });
}

function postGuardPatrol(state, context, events) {
  const existing = reconcileGuardPatrols(state, events);
  if (foundingFoodEmergency(state)) {
    cancelPatrolForFoodEmergency(state, existing, events);
    return null;
  }
  if (existing) return existing;
  if (activeGuardIncident(state) || !guardPatrolDue(state)) return null;
  const guard = guardActor(state);
  if (
    guard.actionReason === "player_crime" &&
    guard.actionTarget &&
    state.village.incidents.length === 0
  )
    return null;
  const route = guardPatrolRoute(state, context.terrainAt),
    { job, created } = createGuardPatrolJob(state, guard, route);
  if (created) events.push(jobEvent(state, "job_posted", job));
  return job;
}

function completeLeadershipReview(state, job, leader, created, events) {
  job.progress.completed = 1;
  Object.assign(job, {
    status: "completed",
    assignedActorId: leader.id,
    completedAtTick: state.tick,
  });
  if (created) events.push(jobEvent(state, "job_posted", job));
  events.push(jobEvent(state, "village_work_reviewed", job));
  return job;
}

function postLeadershipDuty(state, events) {
  if (state.village.scenario !== "founding") return null;
  const leader = state.village.npcStates.find(
    (actor) => actor.personKey === "reeve",
  );
  if (state.village.development.lastResidentNeedsReviewAtTick !== state.tick)
    return null;
  const emergency = !permanentHousingComplete(state);
  if (!leader || (leader.life?.scheduleBlock !== "work" && !emergency))
    return null;
  const { job, created } = createJob(state, {
    jobType: "govern_village",
    name: "Coordinate founding work",
    priority: 25,
    targetId: namedUuid(state.id, "founding-strategy-table"),
    targetPosition: { x: -14, y: 20 },
    requiredCapabilities: ["govern", "assign_work"],
    reason: "village_priority",
    progressTotal: 1,
    progressUnit: "review_minute",
    plan: {
      governanceDuty: true,
      scheduledReview: true,
      ownerActorId: leader.id,
      allowedActorIds: [leader.id],
    },
  });
  return completeLeadershipReview(state, job, leader, created, events);
}

function currentGuardJob(state, guardId) {
  return state.village.jobs.find(
    (job) =>
      job.assignedActorId === guardId &&
      ["reserved", "active"].includes(job.status),
  );
}

function releaseSharedWorkForLifeNeed(state, job, actor, incoming, events) {
  if (job.plan?.ownerActorId || !incoming.plan?.lifeJob) return false;
  restoreJobTransfer(state, job);
  releaseProjectAssistClaim(state, job);
  releaseJobReservations(state, job.id, "personal_survival_need");
  job.assignedActorId = null;
  job.suspendedByJobId = null;
  if (["active", "reserved"].includes(job.status))
    transitionJob(job, "suspended", state.tick, "personal_survival_need");
  transitionJob(job, "available", state.tick, "personal_survival_need");
  job.nextAssignmentAtTick = state.tick + 1;
  actor.workState = "available";
  events.push(
    jobEvent(state, "job_reopened", job, {
      reason: "personal_survival_need",
    }),
  );
  return true;
}

function suspendJob(state, job, actor, incoming, events) {
  if (releasePreemptedCropJob(state, job, actor, incoming, events)) return;
  if (releaseSharedWorkForLifeNeed(state, job, actor, incoming, events)) return;
  if (
    job.production &&
    reusableProductionInput(job) &&
    !retainsExpeditionTool(job)
  ) {
    returnReusableInputs(state, job, actor, events);
    job.plan.step = "to_input";
    delete job.plan.cachedPath;
  }
  releaseProjectAssistClaim(state, job);
  transitionJob(job, "suspended", state.tick, "higher_priority_work");
  job.suspendedByJobId = incoming.id;
  releaseJobReservations(state, job.id, "higher_priority_work");
  actor.workState = "available";
  actor.currentAction = `Interrupting ${job.name.toLowerCase()}`;
  actor.actionReason = incoming.reason;
  events.push(
    jobEvent(state, "job_suspended", job, {
      reason: "higher_priority_work",
      interruptedByJobId: incoming.id,
    }),
  );
}

function releasePreemptedCropJob(state, job, actor, incoming, events) {
  if (!job.plan?.parallelProduction || !job.plan?.cropCellKey) return false;
  releaseCropWorkCell(state, job);
  cancelJob(state, job, "crop_worker_preempted");
  actor.currentAction = `Leaving ${job.name.toLowerCase()} for survival`;
  actor.actionReason = incoming.reason;
  events.push(
    jobEvent(state, "job_cancelled", job, {
      reason: "crop_worker_preempted",
      interruptedByJobId: incoming.id,
    }),
  );
  return true;
}

function retainsExpeditionTool(job) {
  return Boolean(
    (remoteTravelPlan(job)?.fieldCampId ||
      remoteTravelPlan(job)?.pioneerCamp) &&
    reusableProductionInput(job),
  );
}

function suspendForScheduledRest(state, job, actor, events) {
  if (
    job.production &&
    reusableProductionInput(job) &&
    !retainsExpeditionTool(job)
  ) {
    returnReusableInputs(state, job, actor, events);
    job.plan.step = "to_input";
    delete job.plan.cachedPath;
  }
  transitionJob(job, "suspended", state.tick, "scheduled_rest");
  job.suspendedByJobId = null;
  releaseJobReservations(state, job.id, "scheduled_rest");
  actor.workState = "available";
  actor.currentAction = "Ending work for scheduled rest";
  actor.actionReason = "scheduled_rest";
  events.push(
    jobEvent(state, "job_suspended", job, { reason: "scheduled_rest" }),
  );
}

function suspendWorkAtRest(state, events) {
  if (state.village.clock.block !== "rest") return;
  for (const job of state.village.jobs) {
    if (!ordinaryWorkRests(job) || !["reserved", "active"].includes(job.status))
      continue;
    const actor = villageWorkActor(state, job.assignedActorId);
    if (actor) suspendForScheduledRest(state, job, actor, events);
  }
}

function companionJobs(state) {
  return state.village.jobs.filter(
    (job) =>
      job.plan?.autonomous && !["completed", "cancelled"].includes(job.status),
  );
}

function villageDangerActive(state) {
  return state.village.incidents.some(
    (incident) => incident.kind === "danger" && incident.status !== "resolved",
  );
}

function interruptCompanionWork(state, events) {
  if (state.village.adventurersPresent === false) return;
  const danger = villageDangerActive(state);
  if (danger && state.village.partyMovement === "dispersed") {
    state.village.partyMovement = "follow";
    state.village.regrouping = true;
    events.push({ type: "party_recalled", reason: "danger", tick: state.tick });
  }
  if (state.village.partyMovement === "dispersed") return;
  for (const job of companionJobs(state)) {
    if (!["reserved", "active"].includes(job.status)) continue;
    const actor = villageWorkActor(state, job.assignedActorId);
    suspendJob(
      state,
      job,
      actor,
      { reason: danger ? "danger_override" : "leader_recall", id: null },
      events,
    );
    actor.objective = "regroup";
    actor.currentAction = "Returning to the party leader";
  }
}

function regroupCandidates(state, terrainAt) {
  const hero = state.village.heroPosition,
    candidates = [];
  for (let radius = 1; radius <= 3; radius += 1)
    for (let y = hero.y - radius; y <= hero.y + radius; y += 1)
      for (let x = hero.x - radius; x <= hero.x + radius; x += 1) {
        if (Math.max(Math.abs(x - hero.x), Math.abs(y - hero.y)) !== radius)
          continue;
        const position = { x, y };
        if (villageMovementCost(terrainAt(position)) != null)
          candidates.push(position);
      }
  return candidates;
}

function regroupDoor(state) {
  const hero = state.village.heroPosition;
  return state.village.doors
    .filter((door) => door.state === "closed")
    .sort(
      (left, right) =>
        Math.abs(left.x - hero.x) +
          Math.abs(left.y - hero.y) -
          (Math.abs(right.x - hero.x) + Math.abs(right.y - hero.y)) ||
        left.id.localeCompare(right.id),
    )[0];
}

function approachRegroupDoor(state, worker, terrainAt, context, events) {
  const door = regroupDoor(state);
  if (!door) return false;
  const target = { x: door.x, y: door.y },
    route = planVillageRoute(state, worker, target, terrainAt, true);
  if (!route.ok) return false;
  if (route.path.length > 1) worker.position = { ...route.path[1] };
  else
    context.executeInteraction(
      {
        actorId: worker.id,
        objectId: door.id,
        action: "open",
        ...target,
      },
      events,
    );
  return true;
}

function advanceCompanionRegroup(
  state,
  terrainAt,
  context,
  events,
  movedActors,
) {
  if (!state.village.regrouping) return;
  const targets = regroupCandidates(state, terrainAt),
    reservedTargets = new Set();
  let gathered = true;
  for (const worker of state.village.companionStates) {
    if (movedActors.has(worker.id)) continue;
    const target = targets.find(
      (candidate) => !reservedTargets.has(key(candidate)),
    );
    if (!target) continue;
    reservedTargets.add(key(target));
    if (key(worker.position) === key(target)) continue;
    gathered = false;
    moveRegroupingCompanion(
      state,
      worker,
      target,
      terrainAt,
      context,
      events,
      movedActors,
    );
  }
  syncCompanionPositions(state);
  if (!gathered) return;
  finishCompanionRegroup(state, events);
}

function moveRegroupingCompanion(
  state,
  worker,
  target,
  terrainAt,
  context,
  events,
  movedActors,
) {
  const route = planVillageRoute(state, worker, target, terrainAt, false);
  if (route.ok && route.path.length > 1) {
    worker.position = { ...route.path[1] };
    movedActors.add(worker.id);
  } else if (!route.ok)
    approachRegroupDoor(state, worker, terrainAt, context, events);
  worker.objective = "regroup";
  worker.currentAction = "Returning to the party leader";
  worker.actionReason = "leader_recall";
}

function finishCompanionRegroup(state, events) {
  state.village.regrouping = false;
  for (const worker of state.village.companionStates) {
    worker.objective = "follow_leader";
    worker.currentAction = "Following the party leader";
    worker.actionReason = "party_order";
  }
  events.push({ type: "party_regrouped", tick: state.tick });
}

function syncCompanionPositions(state) {
  if (state.village.adventurersPresent === false) return;
  state.village.companionPositions = state.companions.map((actor) => {
    const worker = state.village.companionStates.find(
      (candidate) => candidate.actorId === actor.id,
    );
    return { ...worker.position };
  });
}

function preemptGuardWork(state, events) {
  const guard = guardActor(state);
  if (!guard) return;
  const current = currentGuardJob(state, guard.id),
    incoming = [...state.village.jobs]
      .filter(
        (job) =>
          job.status === "available" &&
          GUARD_JOB_TYPES.has(job.jobType) &&
          actorCanPerform(guard, job, { allowWorking: true }),
      )
      .sort(jobOrder)[0];
  if (!current || !incoming || incoming.priority <= current.priority) return;
  if (
    current.plan?.lifeJob &&
    ["hunger", "fatigue", "safety"].includes(current.plan.need) &&
    guard.life.needs[current.plan.need] <= SURVIVAL_WARNING_THRESHOLD &&
    incoming.jobType !== "respond_danger"
  )
    return;
  suspendJob(state, current, guard, incoming, events);
}

function preemptCriticalNeeds(state, events) {
  const incomingJobs = state.village.jobs
    .filter((job) => {
      if (job.status !== "available" || !job.plan?.lifeJob) return false;
      const actor = villageWorkActor(state, job.plan.ownerActorId);
      return (
        ["hunger", "fatigue", "safety"].includes(job.plan.need) &&
        (actor?.life?.needs?.[job.plan.need] <= SURVIVAL_WARNING_THRESHOLD ||
          (job.plan.need === "safety" && immediateThreat(state, actor)))
      );
    })
    .sort(jobOrder);
  for (const incoming of incomingJobs) {
    const actor = villageWorkActor(state, incoming.plan.ownerActorId),
      current = state.village.jobs.find(
        (job) =>
          job.assignedActorId === actor?.id &&
          ["reserved", "active"].includes(job.status),
      );
    if (!actor || !current) continue;
    if (current.jobType === "respond_danger") continue;
    if (
      current.plan?.emergencyFoodDuty &&
      !availableSurvivalFood(state) &&
      actor.life.needs[incoming.plan.need] > SURVIVAL_DANGER_THRESHOLD
    )
      continue;
    suspendJob(state, current, actor, incoming, events);
    // A prior ordinary contention retry must not delay survival work once it
    // has crossed the danger threshold and displaced the actor's current job.
    incoming.nextAssignmentAtTick = null;
  }
}

function constructionWorkReady(job) {
  if (
    job.plan?.constructionDelivery ||
    job.plan?.projectAssist ||
    job.plan?.foremanDuty ||
    job.plan?.facilityRepair ||
    job.plan?.finalInspectionDuty
  )
    return true;
  return job.plan?.constructionWork?.elements.some(
    (element) => element.materialDelivered && element.status !== "complete",
  );
}

function preemptableConstructionActor(state, actor, incoming) {
  const current = state.village.jobs.find(
    (job) =>
      job.assignedActorId === actor.id &&
      ["reserved", "active"].includes(job.status),
  );
  return (
    current &&
    current.plan?.parentJobId !== incoming.id &&
    !protectedFarmSpecialist(state, actor, incoming) &&
    (!incoming.plan?.ownerActorId || incoming.plan.ownerActorId === actor.id) &&
    !actor.carriedItem &&
    current.priority < incoming.priority &&
    actorSkillPriority(state, actor, incoming) <=
      actorSkillPriority(state, actor, current) &&
    !current.plan?.lifeJob &&
    actorCanPerform(actor, incoming, { allowWorking: true })
  );
}

function currentActorJob(state, actor) {
  return state.village.jobs.find(
    (job) =>
      job.assignedActorId === actor.id &&
      ["reserved", "active"].includes(job.status),
  );
}

function readyForSkillPreemption(state, actor, job) {
  if (job.status === "available")
    return readyForSkillChoice(state, actor, job, { allowWorking: true });
  return (
    job.status === "suspended" &&
    job.assignedActorId === actor.id &&
    constructionReadyForAssignment(job) &&
    !jobResourceBlocker(state, job) &&
    actorCanPerform(actor, job, { allowWorking: true })
  );
}

function higherPriorityReadyJob(state, actor, current, terrainAt) {
  const currentPriority = actorSkillPriority(state, actor, current);
  return state.village.jobs
    .filter(
      (job) =>
        job.id !== current.id &&
        !foodDutyDefersRecovery(state, actor, current, job) &&
        readyForSkillPreemption(state, actor, job) &&
        actorSkillPriority(state, actor, job) < currentPriority &&
        routeForAssignment(state, actor, job, terrainAt).ok,
    )
    .sort(
      (left, right) =>
        actorSkillPriority(state, actor, left) -
          actorSkillPriority(state, actor, right) || jobOrder(left, right),
    )[0];
}

function foodDutyDefersRecovery(state, actor, current, incoming) {
  if (!current.plan?.emergencyFoodDuty || availableSurvivalFood(state))
    return false;
  if (!incoming.plan?.lifeJob) return false;
  if (!["fatigue", "safety"].includes(incoming.plan.need)) return false;
  return actor.life.needs[incoming.plan.need] > SURVIVAL_DANGER_THRESHOLD;
}

function releaseBlockedOptionalLifeActors(state, terrainAt, events) {
  for (const job of state.village.jobs.filter(
    (candidate) => candidate.status === "blocked" && candidate.plan?.lifeJob,
  )) {
    const actor = villageWorkActor(state, job.assignedActorId),
      incoming = actor && higherPriorityReadyJob(state, actor, job, terrainAt);
    if (!actor || !incoming) continue;
    releaseBlockedWorkActor(state, job, actor, "higher_priority_work", events);
    events.push(
      jobEvent(state, "job_assignment_released", job, {
        reason: "higher_priority_work",
        interruptedByJobId: incoming.id,
      }),
    );
  }
}

function preemptForSkillPriority(state, terrainAt, events) {
  for (const actor of villageWorkActors(state)) {
    const current = currentActorJob(state, actor);
    if (!current) continue;
    const incoming = higherPriorityReadyJob(state, actor, current, terrainAt);
    if (!incoming) continue;
    if (actor.carriedItem && !incoming.plan?.emergencyFoodDuty) continue;
    if (incoming.status === "suspended")
      reopenSuspendedJob(state, incoming, events);
    suspendJob(state, current, actor, incoming, events);
  }
}

function migrateSharedConstructionOwners(state) {
  for (const job of state.village.jobs) {
    if (!job.plan?.projectAssist && !job.plan?.constructionSurvey) continue;
    if (!job.plan.ownerActorId) continue;
    job.plan.preferredActorId ??= job.plan.ownerActorId;
    delete job.plan.ownerActorId;
  }
}

function preemptForConstruction(state, events) {
  const incomingJobs = state.village.jobs
    .filter(
      (job) =>
        job.status === "available" &&
        (job.plan?.architectSurvey ||
          job.plan?.siteClearing ||
          constructionWorkReady(job)) &&
        (job.plan?.construction ||
          job.plan?.constructionDelivery ||
          job.plan?.projectAssist ||
          job.plan?.foremanDuty ||
          job.plan?.facilityRepair ||
          job.plan?.finalInspectionDuty ||
          job.plan?.siteClearing ||
          job.plan?.architectSurvey),
    )
    .sort(jobOrder);
  for (const incoming of incomingJobs) {
    const candidate = villageWorkActors(state)
      .filter((actor) => preemptableConstructionActor(state, actor, incoming))
      .sort((left, right) => left.id.localeCompare(right.id))[0];
    if (!candidate) continue;
    const current = currentActorJob(state, candidate);
    suspendJob(state, current, candidate, incoming, events);
  }
}

function reopenSuspendedJob(state, job, events) {
  job.assignedActorId = null;
  job.suspendedByJobId = null;
  transitionJob(job, "available", state.tick);
  job.nextAssignmentAtTick = state.tick + 1;
  events.push(jobEvent(state, "job_reopened", job));
}

function interrupterStillOwnsActor(interrupter, actor) {
  if (!interrupter || !actor) return false;
  if (["completed", "cancelled"].includes(interrupter.status)) return false;
  if (interrupter.plan?.ownerActorId)
    return interrupter.plan.ownerActorId === actor.id;
  return interrupter.assignedActorId === actor.id;
}

function resumeSuspendedJob(state, job, terrainAt, events) {
  const actor = villageWorkActor(state, job.assignedActorId),
    interrupter = job.suspendedByJobId
      ? state.village.jobs.find(
          (candidate) => candidate.id === job.suspendedByJobId,
        )
      : null;
  if (state.village.clock.block === "rest" && ordinaryWorkRests(job)) return;
  if (interrupterStillOwnsActor(interrupter, actor)) return;
  if (
    !actor ||
    actor.workState !== "available" ||
    protectedFarmSpecialist(state, actor, job) ||
    !actorCanPerform(actor, job)
  ) {
    return reopenSuspendedJob(state, job, events);
  }
  const route = routeForAssignment(state, actor, job, terrainAt);
  if (!route.ok) return;
  const reserved = reserveAll(
    state,
    job,
    jobClaims(job, route.destination, actor.id),
  );
  if (!reserved.ok) return;
  transitionJob(job, "active", state.tick);
  claimProjectAssistElement(state, job);
  job.suspendedByJobId = null;
  actor.workState = "working";
  actor.currentAction = `Resuming ${job.name.toLowerCase()}`;
  actor.actionReason = "job_resumed";
  events.push(jobEvent(state, "job_resumed", job));
}

function farmCropCyclesEstablished(state) {
  const harvestedCrops = new Set(
    (state.village.foodLedger?.transactions ?? [])
      .filter((entry) => entry.type === "crop_harvest")
      .map((entry) => entry.cropKind),
  );
  return ["grain", "vegetables"].every((cropKind) =>
    harvestedCrops.has(cropKind),
  );
}

function farmSpecialistReserveNeeded(state) {
  const usableFood = [
    "inn_meals",
    "farm_grain",
    "farm_vegetables",
    "dairy_milk",
    "pasture_meat",
  ].reduce(
    (total, stockpileKey) =>
      total + (stockpileByKey(state, stockpileKey)?.quantity ?? 0),
    0,
  );
  return (
    usableFood < state.village.npcStates.length * 2 ||
    !farmCropCyclesEstablished(state)
  );
}

function readyCropWorkForFarmer(state, actor) {
  return state.village.jobs.some(
    (job) =>
      ["grow_grain", "grow_vegetables"].includes(job.jobType) &&
      (readyForSkillChoice(state, actor, job, { allowWorking: true }) ||
        (job.assignedActorId === actor.id &&
          ["reserved", "active", "suspended"].includes(job.status))),
  );
}

function cropDutyBlocksConstruction(state, actor, job) {
  if (state.village.scenario !== "founding") return false;
  if (actor.personKey !== "farmer") return false;
  if (!readyCropWorkForFarmer(state, actor)) return false;
  return Boolean(
    job.plan?.foremanDuty ||
    job.plan?.projectAssist ||
    job.plan?.constructionSurvey,
  );
}

function protectedFarmSpecialist(state, actor, job) {
  const parent = job.plan?.parentJobId
      ? state.village.jobs.find(
          (candidate) => candidate.id === job.plan.parentJobId,
        )
      : null,
    projectJobType = parent?.jobType ?? job.jobType,
    farmBuilt = state.village.facilities.includes("farmstead"),
    farmWorkPending = state.village.jobs.some(
      (candidate) =>
        candidate.jobType === "build_farmstead" &&
        !["completed", "cancelled"].includes(candidate.status),
    ),
    constructionProtected = !farmBuilt
      ? projectJobType === "build_house" && farmWorkPending
      : projectJobType === "build_communal_kitchen"
        ? !farmCropCyclesEstablished(state)
        : projectJobType === "build_house"
          ? false
          : farmSpecialistReserveNeeded(state);
  if (cropDutyBlocksConstruction(state, actor, job)) return true;
  return (
    state.village.scenario === "founding" &&
    actor.personKey === "farmer" &&
    projectJobType !== "build_farmstead" &&
    constructionProtected &&
    (job.plan?.construction ||
      job.jobType === "assist_project" ||
      job.jobType.startsWith("build_"))
  );
}

function releaseProtectedFarmSpecialist(state, events) {
  const farmer = state.village.npcStates.find(
    (actor) => actor.personKey === "farmer",
  );
  if (!farmer) return;
  const job = state.village.jobs.find(
    (candidate) =>
      candidate.assignedActorId === farmer.id &&
      ["reserved", "active", "suspended"].includes(candidate.status) &&
      protectedFarmSpecialist(state, farmer, candidate),
  );
  if (!job) return;
  restoreJobTransfer(state, job);
  releaseJobReservations(state, job.id, "farm_specialist_protected", job.scope);
  if (job.status === "active")
    transitionJob(job, "suspended", state.tick, "farm_specialist_protected");
  if (job.status !== "available")
    transitionJob(job, "available", state.tick, "farm_specialist_protected");
  job.assignedActorId = null;
  job.suspendedByJobId = null;
  job.nextAssignmentAtTick = state.tick + 1;
  farmer.workState = "available";
  farmer.currentAction = "Returning to farm work";
  farmer.actionReason = "farm_specialist_protected";
  events.push(
    jobEvent(state, "job_reopened", job, {
      actorId: farmer.id,
      actorName: actorName(farmer),
      reason: "farm_specialist_protected",
    }),
  );
}

function advancePatrolAssignment(
  state,
  job,
  status,
  terrainAt,
  context,
  events,
  movedActors,
) {
  if (
    status !== "available" ||
    job.jobType !== "patrol_route" ||
    job.status !== "reserved"
  )
    return;
  activateJob(state, job, events);
  advanceActiveJob(state, job, terrainAt, context, events, movedActors);
}

function advanceVillageJob(state, job, status, runtime) {
  const { terrainAt, context, events, movedActors } = runtime;
  if (job.plan?.autonomous && state.village.partyMovement !== "dispersed")
    return;
  if (job.plan?.commissioning && job.plan.commissioning.status !== "approved")
    return;
  if (status === "blocked" && !blockedRetryDue(state, job)) return;
  if (!validateJobTarget(state, job, context, events)) return;
  if (["completed", "cancelled"].includes(job.status)) return;
  if (
    status === "available" &&
    job.status === "available" &&
    (job.nextAssignmentAtTick == null || state.tick >= job.nextAssignmentAtTick)
  )
    assignJob(state, job, terrainAt, events);
  if (status === "reserved" && job.status === "reserved")
    activateJob(state, job, events);
  if (status === "suspended" && job.status === "suspended")
    resumeSuspendedJob(state, job, terrainAt, events);
  advancePatrolAssignment(
    state,
    job,
    status,
    terrainAt,
    context,
    events,
    movedActors,
  );
  if (status === "active" && job.status === "active")
    advanceActiveJob(state, job, terrainAt, context, events, movedActors);
  if (status === "blocked" && job.status === "blocked")
    retryBlockedJob(state, job, terrainAt, events, movedActors);
}

function advanceVillageJobs(state, terrainAt, context, events, movedActors) {
  migrateSharedConstructionOwners(state);
  for (const job of state.village.jobs.filter((candidate) =>
    ["reserved", "active", "suspended"].includes(candidate.status),
  )) {
    const actor = villageWorkActor(state, job.assignedActorId);
    if (actor && actorCanPerform(actor, job, { allowWorking: true })) continue;
    cancelJob(state, job, "worker_no_longer_eligible");
    events.push(jobEvent(state, "job_cancelled", job));
  }
  releaseProtectedFarmSpecialist(state, events);
  suspendWorkAtRest(state, events);
  preemptGuardWork(state, events);
  preemptCriticalNeeds(state, events);
  releaseBlockedOptionalLifeActors(state, terrainAt, events);
  preemptForSkillPriority(state, terrainAt, events);
  preemptForConstruction(state, events);
  const startingStates = new Map(
      state.village.jobs.map((job) => [job.id, job.status]),
    ),
    runtime = { terrainAt, context, events, movedActors };
  for (const job of [...state.village.jobs].sort(jobOrder))
    advanceVillageJob(state, job, startingStates.get(job.id), runtime);
  return new Set(
    state.village.jobs
      .filter(
        (job) =>
          job.assignedActorId && ["reserved", "active"].includes(job.status),
      )
      .map((job) => job.assignedActorId),
  );
}

function pruneReservationHistory(state) {
  if (state.village.reservations.length > 512) {
    const cutoff = state.tick - 32;
    state.village.reservations = state.village.reservations.filter(
      (reservation) =>
        reservation.state === "held" ||
        (reservation.releasedAtTick ?? state.tick) >= cutoff,
    );
  }
}

function pruneVillageJobHistory(state) {
  pruneReservationHistory(state);
  if (state.village.jobs.length <= 128) return;
  const open = state.village.jobs.filter(
      (job) => !["completed", "cancelled"].includes(job.status),
    ),
    milestones = state.village.jobs.filter(
      (job) =>
        ["completed", "cancelled"].includes(job.status) &&
        job.plan?.construction,
    ),
    milestoneIds = new Set(milestones.map((job) => job.id)),
    recent = state.village.jobs
      .filter(
        (job) =>
          ["completed", "cancelled"].includes(job.status) &&
          !milestoneIds.has(job.id),
      )
      .sort(
        (left, right) =>
          (right.completedAtTick ?? right.updatedAtTick ?? 0) -
            (left.completedAtTick ?? left.updatedAtTick ?? 0) ||
          right.id.localeCompare(left.id),
      )
      .slice(0, 64);
  state.village.jobs = [...open, ...milestones, ...recent].sort(
    (left, right) =>
      left.createdAtTick - right.createdAtTick ||
      left.id.localeCompare(right.id),
  );
  const retainedJobIds = new Set(state.village.jobs.map((job) => job.id));
  state.village.reservations = state.village.reservations.filter(
    (reservation) =>
      reservation.state === "held" || retainedJobIds.has(reservation.jobId),
  );
}

export function advanceVillageSimulation(state, intent, events, context = {}) {
  if (!villageIntentAdvancesSimulation(intent)) return false;
  const terrainAt = context.terrainAt;
  if (!terrainAt) throw new Error("Village navigation requires terrainAt.");
  if (!context.objectAt || !context.executeInteraction)
    throw new Error("Village simulation requires object interaction context.");
  ensureVillageAnimals(state);
  ensureRegionalSimulation(state);
  ensureVillageCivic(state);
  reconcileVillageStorage(state);
  repairDriftingFarmFields(state, events);
  repairFarmFieldGeometry(state, events);
  cancelMisalignedFarmChildJobs(state);
  repairUnbuiltFarmCirculation(state, context, events);
  updateVillageLives(state);
  events.push(...advanceVillageCivic(state));
  deriveVillageArchitecture(state);
  syncResidentHousing(state);
  ensureFoundingSleepingPlaces(state, events);
  ensureVillageFoodSystem(state);
  cancelLegacyWholePlotJobs(state, events);
  advanceFoodDeterioration(state, events);
  advanceCropGrowth(state);
  advanceForageRegrowth(state);
  advanceVillageTrade(state, events);
  events.push(...advanceVillageDemography(state));
  updateVillageDevelopment(state, events);
  postArchitectPlanningJobs(state, context, events);
  postSmithyDelivery(state, context, events);
  postResidentEconomyJobs(state, context, events);
  postFieldHarvestJobs(state, context, events);
  postVillageDevelopmentJobs(state, context, events);
  postSpecialistConstructionJobs(state, context, events);
  postAccessRoadJob(state, context, events);
  postForemanJobs(state, events);
  postFinalCommissioningJobs(state, events);
  postConstructionDeliveryJobs(state, events);
  postProjectAssistanceJobs(state, events);
  postConstructionSurveyJobs(state, events);
  cancelDeadResidentWork(state, events);
  postResidentExhumationJobs(state, events);
  postResidentBurialJobs(state, events);
  postResidentCremationJobs(state, events);
  postResidentMourningJobs(state, events);
  postAnimalCarcassJob(state, events);
  reconcileSecurityEquipment(state, events);
  postSecurityEquipmentReturnJob(state, events);
  postSecurityEquipmentJob(state, events);
  postSecurityTrainingJob(state, events);
  postHealingJob(state, events);
  postNeedJobs(state, context, events);
  postCompanionJobs(state, context, events);
  postGuardIncidentJobs(state, events);
  postLeadershipDuty(state, events);
  postGuardPatrol(state, context, events);
  refreshScheduleScores(state);
  syncVillageSkillWorkQueues(state);
  interruptCompanionWork(state, events);
  for (const actor of villageWorkActors(state)) actor.waitReason = null;
  const movedActors = new Set();
  const workingActors = state.village.jobs.length
    ? advanceVillageJobs(state, terrainAt, context, events, movedActors)
    : new Set();
  for (const npc of state.village.npcStates) {
    if (npc.life?.status === "dead") continue;
    if (workingActors.has(npc.id)) continue;
    advanceVillageNpc(state, npc, terrainAt, events, movedActors);
  }
  if (state.village.adventurersPresent !== false)
    advanceCompanionRegroup(state, terrainAt, context, events, movedActors);
  advanceVillageAnimals(state, terrainAt);
  syncCompanionPositions(state);
  deriveVillageArchitecture(state);
  syncResidentHousing(state);
  ensureFoundingSleepingPlaces(state, events);
  reconcileVillageStorage(state);
  syncVillageSkillWorkQueues(state);
  pruneVillageJobHistory(state);
  return true;
}
