# Smart World Object Contract

M-3 replaces special-case town clicks with one interaction contract shared by
players and simulation actors.

## Object instances

Every projected village cell exposes an `object` with:

- `id`: a UUID identifying this runtime instance.
- `definitionId`: a stable UUID for its object definition.
- `entityType` and `objectKind`: broad identity and interaction category.
- `position`: authoritative world coordinates.
- `name` and `description`: inspect-facing presentation.
- `affordanceKeys`: the actions the object can advertise.

Persistent actors, doors, and loose materials retain their stored instance
UUIDs. Deterministic terrain and fixtures derive a stable, run-scoped UUID from
the run ID, object kind, and world identity. The rolling map can therefore
reconstruct the same object identity without persisting an infinite grid.

`createEntityIndex` rejects duplicate identities and supports lookup by UUID or
position. The village view uses it to validate the visible object projection.

## Affordances

An affordance definition declares:

- a key and player-facing label;
- requirements such as visibility, range, object state, or tool capability;
- a named effect;
- a duration used by the simulation cadence.

`describeAffordances` returns supported actions including useful unavailable
ones and their failure reasons. `queryAffordances` returns only actions the
actor can currently perform. This distinction lets the interface teach the
player why an action is blocked without allowing an invalid command.

The initial vocabulary is `examine`, `read`, `talk`, `open`, `collect`, `dig`,
`harvest`, `breach`, and `use`.

## Execution

The `world_interact` intent carries an actor UUID, object UUID, action key, and
world position. Execution resolves the current object at that position, rejects
a stale UUID, re-evaluates requirements, and applies the named effect.

Legacy examine, talk, manipulate, and door entry points delegate to the same
executor. NPCs call the executor with their own actor UUID, so player and NPC
actions cannot acquire separate rules accidentally.

Mutation is protected at two levels:

1. Object state makes a completed effect unavailable, such as opening an
   already-open door.
2. The turn store records request IDs transactionally, so replaying the same
   request returns its original result without applying the effect again.

## Initial converted objects

- Signs advertise `read`.
- Residents advertise `examine` and `talk`.
- Doors advertise `examine` and state-dependent `open`.
- Trees advertise `examine` and tool-gated `harvest`.
- Walls advertise `examine` and tool-gated `breach`.
- Loose materials advertise `examine` and `collect`.
- Diggable ground advertises `examine` and tool-gated `dig`.
- Forges, counters, and the stable supply cart advertise distinct contextual
  uses.

The contextual command panel is a projection of these affordances. It is an
absolute overlay inside the map viewport, so showing it does not reduce the
playing field.
