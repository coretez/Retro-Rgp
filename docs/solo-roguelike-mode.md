# Solo roguelike mode

Design direction discussed September 23, 2026. Milestone 1 is now implemented
as a playable demo; later sections remain the forward plan. It interprets the
requested feel as a traditional NetHack-like tile cadence; a room-node
interface can still be layered over the same room graph if “network” instead
means node-to-node play.

## Implemented demo

The `dungeon-rogue` MCP, its independent SQLite store and local HTML workbench
now implement the first loop:

- one persistent hero and generated small dungeon;
- eight-direction movement, wait and bump attacks;
- automatic goblin/skeleton pursuit and melee responses;
- server-owned current visibility and remembered terrain;
- basic treasure caches with stable IDs and copper values, collected once by
  entering their cells;
- victory at the dungeon heart and defeat at zero HP;
- atomic turn receipts, optimistic revisions, request replay and restart;
- player-facing state that omits undiscovered cells, enemies and treasure.

Run `npm run rogue`, then open `http://127.0.0.1:4321`. The demo database is
`var/rogue-demo.sqlite` unless `DND_ROGUE_DB` overrides it. Use
`DND_ROGUE_PORT` to change the local port. Run `npm run test:rogue` for the pure
engine, store/retry/restart and real stdio MCP checks.

## Product statement

Solo roguelike mode is a turn-based dungeon game for one player character. One
meaningful player action advances the dungeon by one turn. The server resolves
the action, every eligible enemy response, environmental changes and newly
visible information atomically, then returns control to the player.

The intended feel is a traditional tile roguelike: fast decisions, a readable
room/corridor network, fog of war, dangerous positioning, persistent
consequences and a compact event log. The first client is a local HTML
workbench. It renders committed state and sends intents; it never decides
movement, visibility, attacks, enemy behavior or discovery.

## Architecture decision

Create a focused `dungeon-rogue` MCP server and rules profile rather than add
live roguelike actions to the main D&D MCP.

The existing `dungeon_generate` authoring tool remains in the main server and
its implementation becomes a shared library. The new server reuses:

- generated maps, rooms, connections, themes and population drafts;
- square-grid bounds, obstacle, corner and route primitives;
- catalog creature statistics and dice primitives where the solo profile says
  they apply;
- transactional revisions, idempotent request IDs, output validation, state
  hashes and replay conventions.

It does not reuse the existing encounter state machine. Standard D&D initiative,
30-foot movement budgets, Dash, action/bonus/reaction budgets and explicit
`turn_end` calls would produce the wrong cadence and ambiguous tool choices.
The rules profile is named `solo-roguelike-v2`; it may reuse selected SRD math,
but it must not present itself as unmodified 2014 D&D.

The first implementation uses a separate `DND_ROGUE_DB`. A run owns its hero HP,
position, carried run inventory, dungeon knowledge and enemy state. It does not
mutate the same character concurrently in the campaign engine. Importing a
campaign character creates a versioned starting snapshot. A completed or
abandoned run later produces a settlement receipt for an explicit campaign
reconciliation step; until that adapter exists, the run is intentionally
standalone.

The hero is declared as the party leader even while the party contains only one
member. Class, XP, level, permanent gains, equipment slots and class-power uses
belong to that leader record. Future companions should join a party collection
behind the same leader rather than replacing the hero with an unrelated squad
model. Formation and leadership calls remain deferred until companion turns and
path occupancy can be resolved atomically.

## Core turn contract

One accepted player intent produces exactly one committed turn unless marked
free below. The transaction order is:

1. Validate run revision, status and player intent.
2. Resolve the player action.
3. Recompute noise, sight, awareness and triggered terrain.
4. Give each eligible non-player actor its response in stable scheduler order.
5. Resolve deaths, drops, doors, hazards and end conditions.
6. Recompute the player's visible and remembered map.
7. Commit one revision and one ordered event batch.
8. Return the next decision state.

The client never calls a separate enemy-turn tool. A rejected intent commits
nothing and causes no enemy response. Retrying the same request ID returns the
same complete turn without rerolling or advancing actors.

### Initial action costs

| Intent                         | Initial behavior                                                                              | Advances turn |
| ------------------------------ | --------------------------------------------------------------------------------------------- | ------------- |
| Move to one adjacent cell      | Move if open; moving into a hostile occupant becomes a bump attack                            | Yes           |
| Wait                           | Hold position deliberately                                                                    | Yes           |
| Melee attack                   | Normally expressed as bumping the target; explicit form supports accessibility/click UI       | Yes           |
| Open or close adjacent door    | Changes authoritative topology, sight and pathing                                             | Yes           |
| Search                         | Checks the current cell and adjacent authored surfaces; never certifies that no secret exists | Yes           |
| Pick up or drop one item/stack | Performs one authoritative physical transfer                                                  | Yes           |
| Use item                       | Applies one supported effect or rejects without consuming it                                  | Yes           |
| Use stairs/exit                | Changes level or ends the run when the destination is valid                                   | Yes           |
| Inspect/look/hover             | Returns already visible facts, descriptions and legal-intent hints                            | No            |
| Read status/log/help           | Read-only                                                                                     | No            |

Square maps allow eight-direction movement. A diagonal cannot cut a blocked
corner. One adjacent step is one ordinary move regardless of a D&D sheet's
30-foot speed. Difficult cells use a higher action cost only after the scheduler
supports energy; in the first playable slice they consume one turn and may add
an environmental consequence instead of silently simulating several hidden
turns.

## Scheduler

Build the state with an energy scheduler even if the first slice gives every
actor the same speed:

- Ordinary action cost: 100 energy.
- Standard player and enemy gain: 100 energy per cycle.
- Stable actor ID breaks ties after the player acts.
- A slow actor can later gain 80; a fast actor 120; expensive actions can cost
  more than 100 without changing the public turn contract.
- No actor may take an unbounded number of responses in one player call. A hard
  response/event budget fails the transaction rather than committing a partial
  turn.

This preserves classic one-step play now while avoiding a later rewrite for
haste, slow, encumbrance, difficult terrain or quick creatures.

## Solo rules profile

The character retains six abilities, level, AC, HP, attack bonuses, damage,
saves, skills and supported resources where useful. The profile changes these
assumptions:

- There is one hero, no party initiative and no allied-turn coordination.
- One turn normally contains one primary action. Bonus actions and reactions
  are not general budgets in the first slice.
- Movement is step-based, not feet-budget-based.
- Enemy awareness and behavior are automatic server decisions.
- Zero HP ends the run in the first slice. Death saves and stabilization can be
  reconsidered when companions, rescue or persistent bodies exist.
- Encounter balance uses the whole dungeon ecology and retreat routes, not an
  isolated four-character encounter budget.
- Rest cannot be assumed safe. Recovery consumes turns and may permit patrols,
  pursuit or wandering threats.
- Inventory is deliberately small and action-relevant. The first slice should
  use explicit slots/stacks, not silently duplicate both the legacy combat
  inventory and the physical item repository.

Every reused D&D mechanic must be named in the profile. Everything else is a
roguelike rule, not an implicit claim about the SRD.

## Enemy model

Enemies use a small deterministic state machine driven by committed knowledge:

`idle → suspicious → alerted → pursuing → searching → retreating`

Initial capabilities:

- Sight uses server line-of-sight and a bounded vision radius.
- Noise has a source cell and radius; doors/walls may attenuate it later.
- An unaware enemy does not path toward the player using hidden omniscience.
- An alerted enemy chooses one legal adjacent move, attack, wait or retreat.
- Pathfinding targets the last known player cell, not the live hidden cell.
- Enemies may block one another and cannot stack unless a creature rule permits
  it.
- Each decision records a short machine-readable reason for the event log and
  debugging view.

The first AI should be intentionally small: adjacent attack; otherwise approach
if the player is seen; otherwise search the last known cell; otherwise wait or
patrol. Doors, ranged attacks, fleeing, groups and alarms are later increments.

## Visibility and knowledge

The server returns three map layers:

- `visible`: cells and entities currently perceived;
- `remembered`: previously seen static terrain, without live occupants or
  uncollected hidden facts;
- `unknown`: everything else.

The HTML client receives no hidden enemies, traps, secrets, treasure or room
contents. Debug/GM state is a separate explicitly enabled endpoint and visual
mode. A player-facing state response must remain useful without the debug view.

Doors are authoritative topology, not decorative sprites. Closed doors block
movement and sight; open doors do neither. Secret doors appear as ordinary wall
until discovered. Traps have hidden, noticed, triggered and disarmed states.
These require a richer map contract than the current `blocked[]` array and are
part of the second rules milestone.

## Proposed MCP surface

Keep the player-facing surface narrow:

| Tool                 | Purpose                                                                                                         |
| -------------------- | --------------------------------------------------------------------------------------------------------------- |
| `rogue_run_create`   | Generate/install one immutable dungeon definition and create a solo run from an approved hero snapshot and seed |
| `rogue_run_get`      | Return the next-decision player view, revision, legal intent categories and recent event summary                |
| `rogue_act`          | Submit one typed intent and atomically resolve the complete turn batch                                          |
| `rogue_log`          | Page immutable turn receipts and events for replay/debugging                                                    |
| `rogue_run_export`   | Export definition, initial snapshot, current state and hashes for reproducibility                               |
| `rogue_bestiary_get` | Read the authoritative eight-creature manual, behavior roles, factions, ecology, mechanics and provenance       |

`rogue_act` uses a tagged union rather than separate move/attack/open/search
tools so that one request always means one world-advancing player turn. Example:

```json
{
  "runId": "uuid",
  "expectedRevision": 12,
  "requestId": "unique-logical-turn",
  "intent": { "kind": "move", "direction": "northwest" }
}
```

The result includes the committed revision, normalized player intent, ordered
events, changed visible cells, hero summary, run status and the next legal
decision categories. Full internal state is not returned to the player view.

## Run state

Persist these distinct records:

- `DungeonDefinition`: generator/profile version, seed, theme, immutable base
  tiles, rooms, connections, population specification and content provenance.
- `RunState`: definition ID, rules profile, revision, tick, status, hero,
  mutable tiles, entities, items, scheduler energy, visibility and knowledge.
- `TurnReceipt`: request fingerprint, before/after hashes, normalized intent,
  ordered dice/outcome events and resulting revision.

Entity IDs, item IDs and feature IDs are stable. Presentation symbols and
colors are derived from typed records, not stored as rules. A replay starts from
the saved definition and initial run snapshot and reapplies turn receipts; its
hashes must match.

## HTML workbench

The browser remains a local development client served by a small adapter that
speaks to `dungeon-rogue` over stdio MCP.

First layout:

- central tile grid rendered with HTML canvas or a compact DOM grid;
- keyboard controls: arrows, WASD and numpad, with clickable adjacent cells;
- hero health/resources and current floor at the top;
- contextual actions for wait, search, open/close, pickup and use;
- visible event log with one group per committed turn;
- optional developer overlay for room IDs, routes, AI state, sight/noise and
  scheduler energy;
- seed/new-run panel separate from the active play controls.

The adapter serializes mutations, supplies current revisions, and refreshes
from `rogue_run_get` after uncertain responses. The browser may animate ordered
events but cannot move a token until the server commits that event. Keyboard
repeat is throttled so one physical key press cannot enqueue turns against stale
state.

## Delivery plan

### Milestone 1 — walkable solo loop

- Refactor neutral dungeon generation context into a shared module.
- Add the separate rogue store/server and the five proposed tools.
- Create a run with one hero, immutable floor/wall cells and one exit.
- Implement eight-direction step, wait, bump attack, equal-speed enemy response,
  HP/death and atomic turn receipts.
- Build the minimal HTML grid, keyboard input, status and event log.
- Acceptance: play from entrance to exit or death; restart resumes the exact
  decision state; retries never advance twice.

### Milestone 2 — dungeon information game

- Add server-owned field of view, remembered terrain and player/debug views.
- Add doors, secret doors, traps, search, noise and enemy awareness states.
- Make generated form/theme affect door frequency, terrain and room contents.
- Acceptance: hidden enemies do not leak; closed doors alter path and sight;
  the same seed plus the same intents replays to identical hashes.

### Milestone 3 — complete small run

- Add pickup/use/equip and a deliberately bounded run inventory. Dropping is
  still deferred.
- Add healing/consumables, equippable weapons and armor, stairs and linked
  dungeon levels.
- Add patrols, ranged enemies, retreat and alarms.
- Add run completion/abandonment settlement receipt.
- Acceptance: a full small dungeon can be won without GM mutations, and all
  items/HP/events survive restart without duplication.

### Milestone 4 — content and tuning

- Expand the creature and item catalogs for theme-specific ecology.
- Add solo-specific encounter/population budgets, safe-start constraints and
  guaranteed escape/recovery opportunities.
- Run seeded corpus tests for completion, soft locks, unreachable exits,
  impossible key order and pathological turn budgets.
- Improve HTML presentation only after authoritative behavior is stable.

## Explicitly deferred

- Unity client work.
- Multiplayer, parties or simultaneous input.
- Real-time movement.
- A full port of every D&D action, class feature and spell.
- Procedural narrative generated during an unresolved turn.
- Campaign character synchronization while a run is active.
- Large streaming maps or an endless overworld.

## First implementation slice — complete

Start Milestone 1 with one fixed hero snapshot, one generated small level and
two enemy types. Support only move, wait and bump attack. This is enough to
validate the new turn cadence, atomic enemy responses, persistence, replay and
HTML feel before doors, searching, items or more elaborate D&D compatibility
make the state model larger.
