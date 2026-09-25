// Renderer-independent grid geometry. Hex x/y are axial q/r; one cell is 5 feet.
import { requireRule as check } from "./dice.js";
export const key = (p) => `${p.x},${p.y}`;
export const gridDistance = (grid, a, b) =>
  grid === "hex"
    ? (Math.abs(a.x - b.x) +
        Math.abs(a.y - b.y) +
        Math.abs(a.x + a.y - b.x - b.y)) /
      2
    : Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
export const inside = (map, p) =>
  p.x >= 0 && p.y >= 0 && p.x < map.width && p.y < map.height;
export const blocked = (map, p) =>
  !inside(map, p) || map.blocked.some((c) => key(c) === key(p));

const center = (grid, p) =>
  grid === "hex" ? { x: Math.sqrt(3) * (p.x + p.y / 2), y: 1.5 * p.y } : p;
const cross = (a, b) => a.x * b.y - a.y * b.x;
const subtract = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
// Clip a segment against a closed convex polygon. Boundary contact blocks too,
// so rays cannot leak between touching walls or through a blocked corner.
function intersectsCell(grid, from, to, cell) {
  const c = center(grid, cell),
    vertices =
      grid === "hex"
        ? Array.from({ length: 6 }, (_, i) => {
            const angle = ((i * 60 - 30) * Math.PI) / 180;
            return { x: c.x + Math.cos(angle), y: c.y + Math.sin(angle) };
          })
        : [
            [-0.5, -0.5],
            [0.5, -0.5],
            [0.5, 0.5],
            [-0.5, 0.5],
          ].map(([x, y]) => ({ x: c.x + x, y: c.y + y }));
  const delta = subtract(to, from),
    epsilon = 1e-9;
  let enter = 0,
    leave = 1;
  for (let i = 0; i < vertices.length; i++) {
    const v = vertices[i],
      edge = subtract(vertices[(i + 1) % vertices.length], v),
      offset = cross(edge, subtract(from, v)),
      slope = cross(edge, delta);
    if (Math.abs(slope) < epsilon) {
      if (offset < -epsilon) return false;
    } else {
      const t = -offset / slope;
      if (slope > 0) enter = Math.max(enter, t);
      else leave = Math.min(leave, t);
      if (enter > leave + epsilon) return false;
    }
  }
  return true;
}
export function lineOfSight(map, from, to) {
  check(
    inside(map, from) && inside(map, to),
    "SPATIAL_BOUNDS",
    "Sight endpoints must be inside the map.",
    { from, to },
  );
  const start = center(map.grid, from),
    end = center(map.grid, to),
    blockedBy = map.blocked.filter((p) =>
      intersectsCell(map.grid, start, end, p),
    );
  return {
    from,
    to,
    distanceFeet: gridDistance(map.grid, from, to) * 5,
    clear: blockedBy.length === 0,
    blockedBy,
  };
}
export function requireLineOfSight(map, from, to) {
  const sight = lineOfSight(map, from, to);
  check(
    sight.clear,
    "LINE_OF_SIGHT_BLOCKED",
    "An opaque obstacle blocks the target. Move to a clear line before targeting.",
    sight,
  );
  return sight;
}
export function occupants(state, except) {
  return new Set(
    (state.encounter?.participants ?? [])
      .filter((p) => p.actorId !== except && !state.actors[p.actorId].dead)
      .map((p) => key(p.position)),
  );
}
export function neighbors(map, p) {
  const steps =
    map.grid === "hex"
      ? [
          [1, 0],
          [1, -1],
          [0, -1],
          [-1, 0],
          [-1, 1],
          [0, 1],
        ]
      : [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
          [1, 1],
          [1, -1],
          [-1, 1],
          [-1, -1],
        ];
  return steps
    .map(([x, y]) => ({ x: p.x + x, y: p.y + y }))
    .filter(
      (q) =>
        !blocked(map, q) &&
        (map.grid === "hex" ||
          q.x === p.x ||
          q.y === p.y ||
          (!blocked(map, { x: q.x, y: p.y }) &&
            !blocked(map, { x: p.x, y: q.y }))),
    );
}
export function paths(
  map,
  from,
  occupied = new Set(),
  budget = Infinity,
  multiplier = 1,
) {
  check(
    !blocked(map, from),
    "SPATIAL_BLOCKED",
    "Starting cell is outside the map or blocked.",
  );
  const costs = new Map([[key(from), 0]]),
    previous = new Map(),
    queue = [from],
    terrain = new Set(map.difficult.map(key));
  while (queue.length) {
    queue.sort((a, b) => costs.get(key(a)) - costs.get(key(b)));
    const p = queue.shift();
    for (const q of neighbors(map, p)) {
      if (occupied.has(key(q))) continue;
      const cost =
        costs.get(key(p)) + 5 * (multiplier + (terrain.has(key(q)) ? 1 : 0));
      if (cost > budget || cost >= (costs.get(key(q)) ?? Infinity)) continue;
      costs.set(key(q), cost);
      previous.set(key(q), p);
      queue.push(q);
    }
  }
  return { costs, previous };
}
export function route(map, from, to, occupied, multiplier = 1) {
  check(
    !blocked(map, to),
    "SPATIAL_BLOCKED",
    "Destination is outside the map or blocked.",
    { to },
  );
  check(
    !occupied.has(key(to)),
    "SPATIAL_OCCUPIED",
    "Destination is occupied.",
    { to },
  );
  const { costs, previous } = paths(map, from, occupied, Infinity, multiplier);
  check(
    costs.has(key(to)),
    "SPATIAL_NO_PATH",
    "No traversable path to destination.",
    { to },
  );
  const path = [to];
  while (key(path[0]) !== key(from)) path.unshift(previous.get(key(path[0])));
  return { path, cost: costs.get(key(to)), feet: (path.length - 1) * 5 };
}
export function validatePlacement(state, parts) {
  const occupied = new Set();
  for (const p of parts) {
    check(
      p.position && !blocked(state.spatial, p.position),
      "SPATIAL_BLOCKED",
      "Participant needs an open in-bounds position.",
      { actorId: p.actorId },
    );
    check(
      !occupied.has(key(p.position)),
      "SPATIAL_OCCUPIED",
      "Two active participants cannot occupy the same cell.",
    );
    occupied.add(key(p.position));
  }
}
