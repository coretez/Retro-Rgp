#!/usr/bin/env node
import { randomUUID } from "node:crypto";

const baseUrl = process.env.ROGUE_SIM_URL ?? "http://127.0.0.1:4321";
const directions = [
  [0, -1, "north"],
  [1, 0, "east"],
  [0, 1, "south"],
  [-1, 0, "west"],
];
const games = [
  { seed: "party-simulation-keep", heroClass: "fighter", form: "fortress" },
  {
    seed: "party-simulation-river",
    heroClass: "cleric",
    form: "flooded_underways",
  },
  { seed: "party-simulation-caves", heroClass: "mage", form: "natural_caves" },
];

const cellKey = ({ x, y }) => `${x},${y}`;
const passable = (cell) => cell && cell.tile !== "wall";

async function request(path, options) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const value = await response.json();
  if (!response.ok) throw new Error(value.error ?? `HTTP ${response.status}`);
  return value;
}

async function createGame(config, index) {
  return request("/api/new", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: baseUrl,
    },
    body: JSON.stringify({
      ...config,
      heroName: `Mara Thorn · Simulation ${index + 1}`,
      size: "small",
      levels: 3,
    }),
  });
}

async function act(intent) {
  return request("/api/action", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: baseUrl,
    },
    body: JSON.stringify({ intent, requestId: randomUUID() }),
  });
}

function knownCells(view) {
  return new Map(view.map.cells.map((cell) => [cellKey(cell), cell]));
}

function neighbors(position, cells) {
  return directions
    .map(([dx, dy, direction]) => ({
      x: position.x + dx,
      y: position.y + dy,
      direction,
    }))
    .filter((position) => passable(cells.get(cellKey(position))));
}

function routeTo(view, targets) {
  const cells = knownCells(view),
    start = { x: view.hero.x, y: view.hero.y },
    targetKeys = new Set(targets.map(cellKey)),
    queue = [start],
    previous = new Map(),
    seen = new Set([cellKey(start)]);
  while (queue.length) {
    const current = queue.shift();
    if (targetKeys.has(cellKey(current)))
      return rebuildRoute(current, previous);
    for (const next of neighbors(current, cells)) {
      const value = cellKey(next);
      if (seen.has(value)) continue;
      seen.add(value);
      previous.set(value, current);
      queue.push(next);
    }
  }
  return null;
}

function rebuildRoute(target, previous) {
  const path = [target];
  while (previous.has(cellKey(path[0])))
    path.unshift(previous.get(cellKey(path[0])));
  return path;
}

function frontierCells(view) {
  const cells = knownCells(view),
    known = new Set(cells.keys());
  return [...cells.values()].filter(
    (cell) =>
      passable(cell) &&
      directions.some(([dx, dy]) => {
        const x = cell.x + dx,
          y = cell.y + dy;
        return (
          x >= 0 &&
          y >= 0 &&
          x < view.map.width &&
          y < view.map.height &&
          !known.has(`${x},${y}`)
        );
      }),
  );
}

function visibleTargets(view, predicate) {
  return view.map.cells.filter(
    (cell) => cell.visibility === "visible" && predicate(cell),
  );
}

function healingIntent(view) {
  if (view.hero.hp > Math.floor(view.hero.maxHp * 0.45)) return null;
  const potion = view.hero.inventory.find(
    (item) => item.kind === "healing_potion" && item.quantity > 0,
  );
  if (potion) return { kind: "use_item", itemId: potion.id };
  if (
    ["second_wind", "healing_word"].includes(view.hero.classPower.key) &&
    view.hero.classPower.remaining > 0
  )
    return { kind: "class_power" };
  if (view.rest.available) return { kind: "short_rest" };
  return null;
}

function offensiveItem(view) {
  if (!visibleTargets(view, (cell) => cell.enemy).length) return null;
  const item = view.hero.inventory.find(
    (entry) =>
      ["scroll", "wand"].includes(entry.itemType) &&
      ((entry.quantity ?? 0) > 0 || (entry.charges ?? 0) > 0),
  );
  return item ? { kind: "invoke_item", itemId: item.id } : null;
}

function priorityRoute(view, visits) {
  const enemies = visibleTargets(view, (cell) => cell.enemy),
    loot = visibleTargets(
      view,
      (cell) => cell.treasure || cell.feature?.kind === "item",
    ),
    stairs = view.map.cells.filter((cell) =>
      ["stairs_down", "exit"].includes(cell.tile),
    );
  for (const targets of [enemies, loot, stairs, frontierCells(view)]) {
    const ordered = [...targets].sort(
      (a, b) => (visits.get(cellKey(a)) ?? 0) - (visits.get(cellKey(b)) ?? 0),
    );
    const route = routeTo(view, ordered);
    if (route?.length > 1) return route;
  }
  return null;
}

function movementIntent(view, visits) {
  if (view.legalIntents.includes("stairs")) return { kind: "stairs" };
  const route = priorityRoute(view, visits),
    next = route?.[1];
  if (!next) return { kind: "wait" };
  const direction = directions.find(
    ([dx, dy]) => view.hero.x + dx === next.x && view.hero.y + dy === next.y,
  )?.[2];
  const cell = knownCells(view).get(cellKey(next));
  return {
    kind: cell?.tile?.includes("door_closed") ? "open" : "move",
    direction,
  };
}

function chooseIntent(view, visits) {
  if (view.status === "dying") return { kind: "death_save" };
  const healing = healingIntent(view);
  if (healing) return healing;
  const enemies = visibleTargets(view, (cell) => cell.enemy);
  if (
    enemies.length &&
    view.hero.classPower.key === "magic_missile" &&
    view.hero.classPower.remaining > 0
  )
    return { kind: "class_power" };
  return offensiveItem(view) ?? movementIntent(view, visits);
}

function recordEvents(summary, events) {
  for (const event of events) {
    summary.events[event.type] = (summary.events[event.type] ?? 0) + 1;
    if (event.type === "attack") {
      summary.attacksBySide[event.actorKind] =
        (summary.attacksBySide[event.actorKind] ?? 0) + 1;
      if (event.actorKind === "enemy" && event.hit) {
        summary.damageTaken += event.appliedDamage.hpDamage;
        summary.damageByTarget[event.targetName] =
          (summary.damageByTarget[event.targetName] ?? 0) +
          event.appliedDamage.hpDamage;
      }
    }
    if (event.type === "companion_move") summary.companionMoves += 1;
  }
}

async function play(config, index) {
  let view = await createGame(config, index);
  const visits = new Map(),
    summary = {
      game: index + 1,
      ...config,
      status: "active",
      turns: 0,
      depth: 1,
      damageTaken: 0,
      companionMoves: 0,
      attacksBySide: {},
      damageByTarget: {},
      events: {},
    };
  while (["active", "dying"].includes(view.status) && summary.turns < 1800) {
    const position = `${view.hero.x},${view.hero.y}`;
    visits.set(position, (visits.get(position) ?? 0) + 1);
    const result = await act(chooseIntent(view, visits));
    recordEvents(summary, result.events);
    view = result.view;
    summary.turns += 1;
    summary.depth = view.depth;
  }
  summary.status = view.status;
  summary.hp = `${view.hero.hp}/${view.hero.maxHp}`;
  summary.treasureCp = view.hero.goldCp;
  summary.party = view.groups.party.memberStatus.map((member) => ({
    name: member.name,
    hp: member.hp,
    maxHp: member.maxHp,
    alive: member.alive,
    conditions: member.conditions,
  }));
  summary.partyPositions = view.groups.party.memberStatus.map(
    (member) => member.position,
  );
  return summary;
}

const results = [];
for (let index = 0; index < games.length; index++) {
  const result = await play(games[index], index);
  results.push(result);
  console.log(JSON.stringify(result));
}
console.log(JSON.stringify({ complete: true, results }, null, 2));
