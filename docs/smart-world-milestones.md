# Smart World Development Plan

## Objective

Transform Stonebridge from a collection of scripted movements into a
deterministic, inspectable world simulation. Objects advertise interactions,
world conditions create jobs, suitable actors claim work, plans decompose work
into atomic actions, and navigation moves actors one legal cell at a time.

The public engine contracts remain stable while the internals change:

- `applyRogueTurn(state, intent)` remains the authoritative turn entry point.
- `rogueRunView(state)` remains the UI-facing projection.
- Definition and instance UUIDs remain authoritative references.
- Existing saves are migrated rather than discarded.
- Identical seeds and input sequences produce identical results.

## Delivery rules

1. Complete only one milestone at a time.
2. Do not begin the next milestone until its automated and manual gates pass.
3. Every milestone adds focused tests; the existing regression suite must stay
   green.
4. Each milestone should end in a playable commit on the interactive branch.
5. Movement details do not fill the event history. Events describe decisions,
   blocked work, meaningful actions, and completed outcomes.
6. New simulation functions should normally remain below 20–30 executable
   statements. Content data does not count toward this limit.

## Status

| Milestone                            | State    |
| ------------------------------------ | -------- |
| M-1 · Contracts and simulation seam  | Complete |
| M-2 · Navigation and credible roads  | Complete |
| M-3 · Smart objects and interactions | Complete |
| M-4 · Job board and reservations     | Complete |
| M-5 · Carter delivery                | Complete |
| D-M1–D-M5 · Dungeon parity           | Complete |
| M-6 · Reactive guard work            | Next     |
| M-7 through M-10                     | Planned  |

## Target architecture

```text
Player intent or world condition
              |
              v
Objects advertise valid affordances
              |
              v
Jobs are created on a shared job board
              |
              v
Eligible actors are scored and assigned
              |
              v
A task template creates an atomic plan
              |
              v
Navigation supplies one legal map step
              |
              v
Interaction commits world-state effects
              |
              v
Events and inspect views explain the result
```

The intended module boundary is:

```text
src/
  simulation/
    simulation-step.js
    entity-index.js
    events.js
    affordances/
    jobs/
    planning/
    navigation/
    systems/
  content/
    stonebridge/
```

This structure is introduced gradually. A milestone should not move unrelated
dungeon or combat code merely to make the directory tree look complete.

## M-1 — Contracts and simulation seam

### Player-visible result

No intended gameplay change. The current game behaves exactly as it does now.

### Build

- Record the current save schema, turn contract, view contract, and simulation
  invariants.
- Introduce a small `advanceVillageSimulation` seam called by the existing
  village turn resolver.
- Move NPC advancement behind that seam without redesigning behavior yet.
- Add structured simulation event helpers so later systems do not write
  arbitrary log strings.
- Add a test fixture that creates a deterministic Stonebridge state directly.

### Automated gate

- Existing 42 tests pass.
- Same seed plus same intents produces the same village state and events.
- Every resident, party member, door, item, and modification has a valid UUID.
- One accepted village intent advances exactly one simulation tick.
- Save/load round-trip preserves village actor positions and objectives.

### Manual gate

- Load the existing run, walk through town, enter a shop, inspect a person, and
  return to the regional map without visible regression.

### Not included

Weighted pathfinding, jobs, smart objects, new routines, or UI redesign.

### Completion evidence

- The full regression suite passes with 50 tests, including complete semantic
  determinism checks, every accepted village intent category, rejected intents,
  UUID coverage, in-memory serialization, and a real SQLite save/load round trip.
- The manual gate passed: town movement, shop entry, resident inspection,
  regional-map travel, and return to Stonebridge all worked without a browser
  console error.
- One legacy relationship remains explicitly documented: companion positions
  are array-aligned until M-8 migrates them to actor-UUID-keyed records.

## M-2 — Navigation and credible roads

### Player-visible result

Stonebridge has two-cell-wide principal roads. Moving residents travel one
orthogonal cell per turn, avoid blocked terrain, and prefer roads and paths.

### Build

- Extend `src/spatial.js` with deterministic weighted local routing.
- Give terrain explicit movement costs.
- Make the principal stone roads two cells wide and keep building footprints
  off them.
- Add dynamic blockers and an adjacent-interaction destination rule.
- Replace direct NPC coordinate assignment with navigation requests.
- Keep the current patrol content temporarily, but execute it through the new
  navigation service.

### Automated gate

- No actor moves more than one orthogonal cell per simulation tick.
- Paths never cross walls, furniture, closed doors, trees, pits, or occupied
  cells.
- A road route is preferred over a shorter grass route when its total cost is
  lower.
- Two actors can pass on the principal road without stacking.
- A blocked destination returns a reason rather than moving or teleporting.
- Road generation never places a building wall on a principal road cell.

### Manual gate

- Follow the guard for a complete patrol circuit and observe continuous,
  road-following movement with no jumps or wall crossings.

### Not included

The guard still has a prescribed patrol objective. Residents do not yet choose
work.

### Completion evidence

- Deterministic weighted routing uses explicit terrain costs, four-directional
  one-cell steps, dynamic actor occupancy, and adjacent interaction targets.
- Stonebridge's principal stone roads are two cells wide; signs were moved off
  the roadway, and the guard routes around the baker instead of occupying the
  same cell.
- Automated gates cover cheaper-road selection, static blockers, blocked-route
  reasons, two-actor passing, collision prevention, and a complete 16-turn
  guard patrol circuit.
- Navigation has no fixed coordinate boundary. A bounded work budget reports
  `search_limit` distinctly from a proven `no_path`, and the regression suite
  covers a valid detour beyond the former 20-cell margin.
- Zero-step routes emit `npc_wait` rather than claiming movement. Full building
  footprints are checked directly against principal-road geometry.
- The full suite passes with 59 tests. In a clean isolated live run, the guard
  completed all 16 orthogonal patrol steps, used the passing lane, returned to
  its starting cell, and produced no browser console error.

## M-3 — Smart objects and unified interactions

### Player-visible result

Selecting or right-clicking a person, fixture, item, or terrain cell shows the
actions that object actually supports. Player and NPC actions use the same
interaction definitions.

### Build

- Add world-object instances and an entity index.
- Add data-driven affordance definitions with requirements, effects, duration,
  and failure reasons.
- Convert doors, signs, trees, walls, loose materials, counters, the forge, and
  one cart.
- Generate the contextual command panel from affordance queries.
- Keep unavailable actions visible when an explanation is useful.

### Automated gate

- Affordance queries return only valid actions for the actor and object state.
- A locked or distant interaction reports the correct blocking reason.
- Player and NPC execution of the same affordance produce the same state
  effects.
- Object effects are replay-safe and cannot be applied twice.
- Existing examine, talk, collect, dig, harvest, breach, and door tests remain
  green.

### Manual gate

- Inspect a sign, door, tree, forge, counter, cart, and resident. Confirm that
  each presents distinct, meaningful actions without shrinking the map.

### Not included

Autonomous job selection or multi-step production.

### Completion evidence

- Runtime town cells now expose UUID-backed world objects, and the visible
  projection is validated by an identity and spatial entity index.
- Data-driven affordances define requirements, effects, duration, labels, and
  useful failure reasons. Player and NPC door interactions share the same
  executor.
- Signs, residents, doors, trees, walls, loose materials, diggable terrain,
  forges, counters, and a stable supply cart have distinct contextual actions.
- The contextual panel is generated from affordance descriptions. Disabled
  commands stay visible with their blocking reason and float over the map
  without changing its dimensions.
- Replay safety is covered both by object-state rejection and an end-to-end
  SQLite request-ID replay test.
- The full suite passes with 68 tests. The live browser gate inspected a sign,
  door, tree, forge, counter, cart, and resident and confirmed their distinct
  action sets with no interaction failure or map contraction.

## M-4 — Job board and reservations

### Player-visible result

The inspect view can show available, reserved, active, blocked, and completed
work. Actors do not yet perform a full economic routine, but jobs are real
persistent objects rather than descriptive text.

### Build

- Add UUID-backed jobs with explicit legal lifecycle transitions, including
  blocked, suspended, completed, and cancelled states.
- Add atomic exclusive reservations for jobs, objects, items, and work
  positions.
- Add capability and work-permission checks.
- Add deterministic assignment ordering using priority, continuity, skill,
  risk, path cost, and actor UUID.
- Add inspect projections for current job, destination, progress, and reason.
- Add save-schema-12 migration for jobs, reservations, and actor work data.
- Add one real single-action stocktake job that navigates to the stable cart
  and executes its M-3 examine affordance.

### Automated gate

- One exclusive job cannot be assigned to two actors.
- One resource cannot be reserved by two jobs.
- Invalid reservations are released deterministically.
- Incapable or forbidden actors never receive incompatible jobs.
- Assignment ties have deterministic UUID-based resolution.
- Save/load preserves jobs, reservations, and assignments.
- Illegal lifecycle transitions are rejected; cancellation releases claims
  exactly once.
- Request replay and repeated posting cannot duplicate an open job.

### Manual gate

- Request a stable-cart stocktake and follow it through available, reserved,
  active, and completed states in the work-order inspector.

### Not included

General autonomous schedules, needs, cargo transfer, or a complete delivery
chain.

### Completion evidence

- UUID-backed jobs and typed reservations persist as authoritative village
  state. Jobs own their actor reference; actor views derive assignments.
- Reservation batches are atomic and exclusive across jobs, objects, items,
  and location-scoped work positions. Release history retains tick and reason.
- Actor capability tags, permissions, skills, availability, continuity, route
  cost, risk, and UUID tie-breaking drive deterministic assignment.
- The stable cart posts an idempotent stocktake. A worker reserves the job,
  cart, and work position; navigates legally; executes the shared M-3 examine
  affordance; completes; and releases all claims.
- Missing targets release both worker and claims. Suspension and cancellation
  are distinct from environmental blocking, and illegal transitions fail.
- Save schema 12 migrates existing runs and preserves job, reservation, and
  actor work data through serialization and SQLite persistence.
- The MCP action schema now accepts the M-3/M-4 `world_interact` envelope and
  every registered affordance, with a regression assertion on its published
  tool schema.
- The full suite passes with 78 tests. The live browser gate posted and
  completed a stocktake, displayed its assignment to Otto Kern and 1/1
  progress, released every held claim, and retained the full map viewport.

## M-5 — First living-world vertical slice: carter delivery

### Player-visible result

Bram Eder performs a real supply delivery. Cargo moves from the stable cart to
the smithy, the smithy stock changes, and Bram's inspect view explains every
stage and decision.

### Build

- Add stable cargo and smithy stock as persistent world objects.
- Post a delivery job when smithy stock falls below its threshold.
- Add the `deliver_goods` task template:
  reserve cargo, navigate, load, navigate, unload, complete.
- Emit meaningful start, load, blocked, delivery, and completion events.
- Suspend and safely resume the job if navigation or access becomes blocked.

### Automated gate

- Cargo cannot be duplicated, lost, or delivered twice.
- Bram reaches both endpoints by legal navigation.
- The job remains blocked when a required door or route is unavailable.
- Reopening the route allows deterministic resumption.
- Completion removes cargo from the cart and increases smithy stock exactly
  once.
- Inspect output always matches the actual plan step and job state.

### Manual gate

- Observe one complete delivery without issuing commands. Interrupt the next
  delivery by closing access, inspect the blocked reason, restore access, and
  observe completion.

### Not included

Other professions, general needs, or companion autonomy.

### Completion evidence

- Stable-cart cargo and smithy stock are persistent UUID-backed stockpiles.
  Save schema 13 adds them to existing runs without discarding village state.
- A smithy stock threshold posts one deterministic `deliver_goods` job. Bram
  Eder is the only current resident with both the hauling capability and
  delivery permission, so assignment follows the M-4 eligibility contract.
- The job reserves its source, cargo, destination, and work position; Bram
  walks every route one legal orthogonal cell at a time, loads one unit, opens
  the shared M-3 smithy door when needed, unloads once, and releases all claims.
- Cargo remains conserved across delivery, cancellation, missing targets, and
  save/load while in transit. Locked access blocks the plan truthfully;
  restoring access resumes the saved plan and completes it deterministically.
- Meaningful job, cargo, access, and completion events replace movement noise.
  The Unity inspector exposes an actor's current action and objective, and the
  bottom strip presents recent meaningful simulation activity.
- The full regression suite passes with 85 tests. Focused M-5 coverage verifies
  a complete delivery, legal movement, conservation, blocked save/resume,
  cancellation recovery, stock-threshold posting, and schema migration.

## D-M1 through D-M5 — Dungeon parity checkpoint

### Player-visible result

Dungeon play uses the same simulation concepts as Stonebridge and is available
in the Unity client. Doors, dungeon features, monster objectives, autonomous
work, blocked access, and meaningful activity are inspectable instead of being
separate legacy behavior.

### Completion evidence

- Dungeon turns now pass through a dedicated simulation seam while preserving
  the authoritative `applyRogueTurn` contract and one-tick-per-intent rule.
- Dungeon work uses deterministic weighted, orthogonal navigation. Autonomous
  investigators move at most one cell per tick and return truthful route or
  access blocking reasons.
- Revealed doors, stairs, treasure, traps, shrines, and loose items project as
  UUID-backed smart objects. Player and monster door opening executes through
  the same affordance definition and interaction executor.
- Every dungeon level owns persistent jobs and reservations. Monsters declare
  capabilities and work permissions; investigation assignments reserve their
  job and destination and release claims on completion.
- Noise creates one scoped `investigate_noise` plan per hearing group. The plan
  assigns an eligible monster, navigates toward the source, blocks at locked
  access, survives save/load, resumes when access changes, opens a closed door,
  and completes at the investigation destination.
- The Unity projection is location-aware and renders the active dungeon rather
  than Stonebridge. Native controls support dungeon movement, door opening by
  click, examination, waiting, and ascending or descending stairs.
- Save schema 14 migrates dungeon work ledgers and monster worker profiles. The
  full regression suite passes with 90 tests, including focused determinism,
  dungeon smart
  object, investigation, migration, legal-movement, Unity projection, complete
  depth traversal, exit, and re-entry coverage.

## M-6 — Reactive guard work

### Player-visible result

The guard chooses between patrol, investigate, warn, escort, and respond to
danger. Crime interrupts routine work, and the guard later returns to an
appropriate job.

### Build

- Represent patrol and investigation as jobs.
- Add perception-driven crime and danger job creation.
- Add priority-based interruption, suspension, and resumption.
- Add guard interactions with offenders and damaged property.
- Explain the guard's selected job and reason in the inspect panel.

### Automated gate

- Crime creates one investigation job rather than one per tick.
- Investigation outranks routine patrol.
- The guard navigates to evidence rather than directly to coordinates.
- Completing or invalidating an investigation releases reservations.
- The guard returns to eligible work after the interruption.

### Manual gate

- Damage town property, watch the guard interrupt patrol and investigate, then
  verify that the guard resumes town work afterward.

### Not included

Full law, arrest, trial, imprisonment, or faction reputation systems.

## M-7 — Working residents and local economy

### Player-visible result

Several residents perform useful, world-changing work: hauling, crafting,
operating shops, healing, fishing, and maintaining the stable. Shops depend on
people and stock rather than being permanently available menus.

### Build

- Add bounded job templates for the smith, herbalist, armorer, innkeeper,
  fisher, porter, hostler, and messenger.
- Add workshop inputs, work duration, outputs, and stock thresholds.
- Add shop-open conditions based on proprietor presence and usable inventory.
- Add work permissions and priorities to the resident inspector.
- Add batch assignment or global minimum-cost matching if greedy assignment
  produces poor outcomes.

### Automated gate

- Production consumes inputs and creates outputs exactly once.
- Shops cannot sell unavailable stock.
- Workstations cannot be occupied by multiple exclusive jobs.
- Essential work outranks decorative or low-value work.
- Resident jobs remain deterministic under save/load and replay.

### Manual gate

- Observe at least three connected jobs: delivery supplies production,
  production creates stock, and a staffed shop offers that stock.

### Not included

Town-wide economic balancing, prices driven by supply and demand, or complex
social relationships.

## M-8 — Autonomous dispersed companions

### Player-visible result

When dispersed, companions choose useful personal objectives. Regrouping or
danger interrupts those objectives and returns the party to leadership control.

### Build

- Give each companion work permissions and personal priorities derived from
  class and role.
- Add scouting, healing, training, research, rumor gathering, rest, and paid
  work jobs.
- Add direct party orders as high-priority overrides.
- Add suspend, regroup, and resume behavior.
- Add an explicit party spending policy; equipment purchases require approval
  unless the policy permits them.

### Automated gate

- Dispersed companions select only capable and permitted work.
- Follow-leader suspends or releases autonomous jobs safely.
- Combat or danger overrides town work.
- Regrouping cannot duplicate companions or leave stale reservations.
- Companions cannot spend beyond party policy.

### Manual gate

- Disperse the party, inspect three distinct objectives, recall the party, and
  confirm that everyone returns without teleporting or losing state.

### Not included

Companion romance, deep personality simulation, or unsupervised major
financial decisions.

## M-9 — Needs, schedules, and social life

### Player-visible result

Actors work, eat, rest, worship, socialize, and react to basic needs. Needs
compete with work using the same scoring system and remain understandable in
the inspector.

### Build

- Add a town clock and work/rest/free-time schedule blocks.
- Add bounded hunger, fatigue, safety, social, and morale needs.
- Treat satisfying a need as eligible work rather than a separate AI system.
- Add beds, meals, seating, worship, and conversations as smart-object
  affordances.
- Add simple memories for recent meaningful events, not free-form generative
  dialogue.

### Automated gate

- Critical needs interrupt low-priority work but not immediate danger response.
- Needs remain bounded and change deterministically.
- Actors reserve beds, chairs, meals, and conversation partners correctly.
- Schedule changes affect job scoring without directly moving actors.
- No actor becomes permanently trapped in a need-satisfaction loop.

### Manual gate

- Advance through one town day and observe work, meals, rest, and social
  activity with inspectable reasons.

### Not included

Generative-AI dialogue, family simulation, politics, or a complete sociology
model.

## M-10 — Continuous simulation controls

### Player-visible result

The player can pause, advance one turn, or let the town run at controlled
speeds. All modes execute the same deterministic simulation step.

### Build

- Add pause, single-step, normal, and accelerated controls.
- Keep combat and explicit tactical decisions paused by default.
- Batch rendering without skipping simulation ticks.
- Add event filters so routine movement does not overwhelm important events.

### Automated gate

- Ten manual steps produce the same state as ten continuous ticks.
- Pausing prevents every simulation mutation.
- Speed changes affect presentation frequency, not game outcomes.
- Combat entry pauses continuous execution before accepting another action.

### Manual gate

- Run, pause, single-step, resume, and enter danger while confirming consistent
  state and readable events.

## Smart-world completion criteria

The first smart-world release is complete when all of the following are true:

- A resident completes a multi-step job that changes persistent world state.
- Residents select work from actual conditions rather than decorative routes.
- Roads are preferred through costed navigation.
- Player and NPC interactions use the same affordance definitions.
- Companions can work independently and respond to leadership orders.
- Every selected actor explains what they are doing, where they are going, and
  why.
- Jobs, plans, reservations, objects, and actors survive save/load with stable
  UUID references.
- Turn-based and continuous modes produce identical results for identical
  simulation ticks.

## Immediate next objective

Implement **M-6 only**: convert guard patrol and investigation into competing
jobs, then prove that danger can interrupt routine work and that the guard can
resume appropriate work afterward. Do not add the broader economy, companion
autonomy, needs, or continuous time yet.
