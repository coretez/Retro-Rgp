import { gridDistance, key } from "./spatial.js";

export const WORLD_AFFORDANCES = Object.freeze({
  examine: {
    key: "examine",
    label: "Examine",
    requirements: { visible: true },
    effect: "describe_object",
    duration: 0,
  },
  read: {
    key: "read",
    label: "Read",
    requirements: { visible: true },
    effect: "read_object",
    duration: 0,
  },
  talk: {
    key: "talk",
    label: "Talk",
    requirements: { visible: true },
    effect: "talk_to_actor",
    duration: 0,
  },
  open: {
    key: "open",
    label: "Open",
    requirements: { maxRange: 1, state: "closed" },
    effect: "open_door",
    duration: 1,
  },
  collect: {
    key: "collect",
    label: "Collect",
    requirements: { maxRange: 1 },
    effect: "collect_material",
    duration: 1,
  },
  dig: {
    key: "dig",
    label: "Dig",
    requirements: { maxRange: 1, toolTag: "dig" },
    effect: "dig_ground",
    duration: 1,
  },
  prospect: {
    key: "prospect",
    label: "Prospect rock face",
    requirements: { maxRange: 1 },
    effect: "reveal_geology",
    duration: 4,
  },
  pan: {
    key: "pan",
    label: "Pan river sediment",
    requirements: { maxRange: 1 },
    effect: "pan_placer_minerals",
    duration: 4,
  },
  quarry: {
    key: "quarry",
    label: "Quarry stone",
    requirements: { maxRange: 1, toolTag: "breach" },
    effect: "quarry_stone",
    duration: 4,
  },
  harvest: {
    key: "harvest",
    label: "Harvest",
    requirements: { maxRange: 1, toolTag: "cut" },
    effect: "harvest_tree",
    duration: 1,
  },
  breach: {
    key: "breach",
    label: "Breach wall",
    requirements: { maxRange: 1, toolTag: "breach" },
    effect: "breach_wall",
    duration: 1,
  },
  use: {
    key: "use",
    label: "Use",
    requirements: { maxRange: 1 },
    effect: "use_fixture",
    duration: 1,
  },
  request_stocktake: {
    key: "request_stocktake",
    label: "Request stocktake",
    requirements: { visible: true },
    effect: "post_inspection_job",
    duration: 0,
  },
});

function requirementFailure(actor, object, definition, context) {
  const requirements = definition.requirements;
  if (requirements.visible && context.visible === false)
    return "The object is not visible.";
  if (
    requirements.maxRange != null &&
    gridDistance("square", context.position, object.position) >
      requirements.maxRange
  )
    return `Move within ${requirements.maxRange} cell${requirements.maxRange === 1 ? "" : "s"}.`;
  if (requirements.state && object.state !== requirements.state)
    return object.state === "locked"
      ? "The door is locked."
      : `The ${object.name.toLowerCase()} is already ${object.state}.`;
  if (
    requirements.toolTag &&
    !actor.inventory?.some(
      (item) =>
        item.quantity > 0 && item.toolTags?.includes(requirements.toolTag),
    )
  )
    return `Requires a tool suitable to ${definition.key}.`;
  return null;
}

export function describeAffordances(actor, object, context) {
  return object.affordanceKeys.map((affordanceKey) => {
    const definition = WORLD_AFFORDANCES[affordanceKey];
    if (!definition) throw new Error(`Unknown affordance: ${affordanceKey}`);
    const reason = requirementFailure(actor, object, definition, context);
    return {
      key: definition.key,
      label: object.actionLabels?.[definition.key] ?? definition.label,
      effect: definition.effect,
      duration: definition.duration,
      available: reason == null,
      reason,
    };
  });
}

export const queryAffordances = (actor, object, context) =>
  describeAffordances(actor, object, context).filter(
    (affordance) => affordance.available,
  );

export function createEntityIndex(entities) {
  const byId = new Map(),
    byPosition = new Map();
  for (const entity of entities) {
    if (byId.has(entity.id)) throw new Error(`Duplicate entity: ${entity.id}`);
    byId.set(entity.id, entity);
    if (entity.position) {
      const positionKey = key(entity.position),
        occupants = byPosition.get(positionKey) ?? [];
      occupants.push(entity);
      byPosition.set(positionKey, occupants);
    }
  }
  return {
    size: byId.size,
    get: (id) => byId.get(id) ?? null,
    at: (position) => [...(byPosition.get(key(position)) ?? [])],
    all: () => [...byId.values()],
  };
}
