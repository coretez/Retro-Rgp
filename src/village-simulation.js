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
    [22, 11],
    [24, 11],
    [22, 11],
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

export const villageIntentAdvancesSimulation = (kind) =>
  ADVANCING_INTENTS.has(kind);

function villageActorEvent(state, type, npc) {
  return {
    type,
    scope: "village",
    tick: state.tick,
    actorId: npc.id,
    objective: npc.objective,
    currentAction: npc.currentAction,
    position: { ...npc.position },
  };
}

function stepNpcToward(npc, target) {
  const dx = Math.sign(target.x - npc.position.x),
    dy = Math.sign(target.y - npc.position.y);
  npc.position = {
    x: npc.position.x + (dx || 0),
    y: npc.position.y + (dx ? 0 : dy),
  };
}

function advanceNpcPatrol(npc, route) {
  const nextIndex = (npc.routeIndex + 1) % route.length,
    [x, y] = route[nextIndex];
  stepNpcToward(npc, { x, y });
  if (npc.position.x === x && npc.position.y === y) npc.routeIndex = nextIndex;
}

function advanceVillageNpc(state, npc, events) {
  if (npc.actionReason === "player_crime" && npc.actionTarget)
    stepNpcToward(npc, npc.actionTarget);
  else {
    const route = VILLAGE_ROUTES[npc.personKey];
    if (!route) return;
    advanceNpcPatrol(npc, route);
  }
  events.push(villageActorEvent(state, "npc_move", npc));
}

export function advanceVillageSimulation(state, intent, events) {
  if (!villageIntentAdvancesSimulation(intent.kind)) return false;
  for (const npc of state.village.npcStates)
    advanceVillageNpc(state, npc, events);
  return true;
}
