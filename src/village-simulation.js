import { key, weightedRoute } from "./spatial.js";

const ADVANCING_INTENTS = new Set([
  "local_move",
  "local_manipulate",
  "shop_buy",
  "equip",
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

const BLOCKED_TILES = new Set([
  "outdoor_tree",
  "village_sign",
  "village_building",
  "village_furniture",
  "village_door_closed",
  "village_pit",
]);

const TERRAIN_COSTS = {
  road_stone: 1,
  road_dirt: 2,
  village_door_open: 2,
  village_floor: 2,
  village_rubble: 3,
  outdoor_stump: 3,
  outdoor_grass: 4,
};

export const villageIntentAdvancesSimulation = (kind) =>
  ADVANCING_INTENTS.has(kind);

export const villageMovementCost = (tile) =>
  BLOCKED_TILES.has(tile) ? null : (TERRAIN_COSTS[tile] ?? 3);

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

function navigationBounds(from, to) {
  const margin = 20;
  return {
    minX: Math.min(from.x, to.x) - margin,
    maxX: Math.max(from.x, to.x) + margin,
    minY: Math.min(from.y, to.y) - margin,
    maxY: Math.max(from.y, to.y) + margin,
  };
}

function occupiedVillageCells(state, actorId) {
  return new Set(
    [
      state.village.heroPosition,
      ...state.village.companionPositions,
      ...state.village.npcStates
        .filter((npc) => npc.id !== actorId)
        .map((npc) => npc.position),
    ].map(key),
  );
}

export function planVillageRoute(state, npc, target, terrainAt, adjacent) {
  return weightedRoute({
    from: npc.position,
    to: target,
    bounds: navigationBounds(npc.position, target),
    occupied: occupiedVillageCells(state, npc.id),
    adjacent,
    isBlocked: (position) => villageMovementCost(terrainAt(position)) == null,
    terrainCost: (position) => villageMovementCost(terrainAt(position)),
  });
}

function patrolDestination(npc, route) {
  const nextIndex = (npc.routeIndex + 1) % route.length,
    [x, y] = route[nextIndex];
  return { nextIndex, target: { x, y } };
}

function npcObjective(npc) {
  if (npc.actionReason === "player_crime" && npc.actionTarget)
    return { target: npc.actionTarget, adjacent: true };
  const route = VILLAGE_ROUTES[npc.personKey];
  if (!route) return null;
  return { ...patrolDestination(npc, route), adjacent: false };
}

function applyNpcNavigation(state, npc, objective, terrainAt, events) {
  const result = planVillageRoute(
    state,
    npc,
    objective.target,
    terrainAt,
    objective.adjacent,
  );
  if (!result.ok) {
    events.push(
      villageActorEvent(state, "npc_blocked", npc, {
        reason: result.reason,
        destination: { ...objective.target },
      }),
    );
    return;
  }
  if (result.path.length > 1) npc.position = { ...result.path[1] };
  if (
    objective.nextIndex != null &&
    key(npc.position) === key(objective.target)
  )
    npc.routeIndex = objective.nextIndex;
  events.push(
    villageActorEvent(state, "npc_move", npc, {
      destination: { ...result.destination },
      routeCost: result.cost,
    }),
  );
}

function advanceVillageNpc(state, npc, terrainAt, events) {
  const objective = npcObjective(npc);
  if (objective) applyNpcNavigation(state, npc, objective, terrainAt, events);
}

export function advanceVillageSimulation(state, intent, events, context = {}) {
  if (!villageIntentAdvancesSimulation(intent.kind)) return false;
  const terrainAt = context.terrainAt;
  if (!terrainAt) throw new Error("Village navigation requires terrainAt.");
  for (const npc of state.village.npcStates)
    advanceVillageNpc(state, npc, terrainAt, events);
  return true;
}
