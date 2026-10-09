# Smart World M-1 Contracts

This document records the contracts protected before the smart-world systems
replace Stonebridge's existing scripted behavior.

## Baseline

- Save schema: `11`
- Ruleset: `party-roguelike-v11`
- Turn entry point: `applyRogueTurn(state, intent, dice)`
- UI projection: `rogueRunView(state, recentEvents)`
- Persistence boundary: `serializeRogueState` and `parseRogueState`
- Store concurrency boundary: `revision` and replay-safe `requestId`

## Turn contract

An accepted intent mutates the supplied state once and returns an event list.
It advances `state.tick` exactly once. The store, rather than the engine,
advances `state.revision` after a successful persisted turn.

Village actions are resolved before the village simulation seam is invoked.
The following successful intents currently advance autonomous village actors:

- `local_move`
- `local_manipulate`
- `shop_buy`
- `equip`

Read-only or command-state intents do not currently advance autonomous actors:

- `local_examine`
- `local_talk`
- `set_party_movement`
- `open_world`

M-1 preserves this policy rather than silently changing the cadence. A later
milestone may revise the policy explicitly with new tests and migration notes.

## Village simulation seam

`advanceVillageSimulation(state, intent, events)` is the only function that the
rogue engine calls to advance autonomous Stonebridge behavior. It owns the
decision about whether an intent advances the simulation and appends structured
simulation events to the engine's event array.

M-1 preserves the existing patrol data and behavior. M-2 will replace direct
patrol stepping with weighted navigation through this seam.

Village actor events include:

```json
{
  "type": "npc_move",
  "scope": "village",
  "tick": 0,
  "actorId": "uuid",
  "objective": "protect_town",
  "currentAction": "Patrolling the market road",
  "position": { "x": 20, "y": 10 }
}
```

The event `tick` is the tick being resolved. `state.tick` increments after turn
resolution completes.

## Identity contract

Runtime instances use UUIDs. This includes:

- Hero and companions
- Village residents
- Doors
- Inventory items
- Loose materials
- Persistent terrain modifications

Definitions and instances have separate identities. Identity-bearing
relationships should store UUIDs rather than display names.

M-1 records one legacy exception: local companion positions are aligned with
`state.companions` by array index. M-8 must migrate those positions to
actor-UUID-keyed records before autonomous companion work is introduced.

Fresh runs intentionally receive new instance UUIDs. Determinism tests compare
semantic simulation results—positions, objectives, actions, route state, and
public event fields—rather than expecting independently created runs to share
instance IDs.

## Persistence contract

Serialization removes derived active-level aliases and converts sets to JSON
arrays. Parsing migrates old state, restores sets, reattaches the active level,
and repairs invalid party placement when necessary.

A village save/load round trip must preserve:

- Location and tick
- Resident UUIDs
- Resident positions
- Objectives and current actions
- Action reasons and targets
- Route progress
- Doors, modifications, and loose materials

Future jobs, reservations, plans, and object states must enter this contract
when their milestone introduces them.

## View contract

`rogueRunView` remains the only browser-facing state projection. Simulation
modules mutate authoritative state and emit events; they do not create DOM
models or interface text.

The village view continues to expose:

- Rolling map dimensions and origin
- Terrain and object cells
- Hero and companion positions
- Resident identity, role, objective, and current action
- Accessible shop and buyer information
- Legal intents

Later milestones may add job, plan, destination, progress, and blocking-reason
fields without removing these existing fields during the migration.

## M-1 protected invariants

1. Existing dungeon, combat, travel, shopping, equipment, and village tests
   remain green.
2. Equal village seeds and intent sequences produce equal semantic outcomes.
3. One accepted intent advances exactly one game tick.
4. Runtime village instances use valid UUIDs.
5. Village actor positions and objectives survive save/load.
6. The live browser can load Stonebridge and inspect a resident without a
   console error.
