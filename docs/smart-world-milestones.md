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

| Milestone                                 | State       |
| ----------------------------------------- | ----------- |
| M-1 · Contracts and simulation seam       | Complete    |
| M-2 · Navigation and credible roads       | Complete    |
| M-3 · Smart objects and interactions      | Complete    |
| M-4 · Job board and reservations          | Complete    |
| M-5 · Carter delivery                     | Complete    |
| D-M1–D-M5 · Dungeon parity                | Complete    |
| D-M5.1 · Unity dungeon playability        | Complete    |
| D-M5.2 · Native dungeon hardening         | Complete    |
| M-6 · Reactive guard work                 | Complete    |
| M-7 · Working residents and economy       | Complete    |
| M-7.1 · Economy hardening gate            | Complete    |
| M-8 · Autonomous dispersed companions     | Complete    |
| M-9 · Needs, schedules, social life       | Complete    |
| M-10 · Continuous simulation controls     | Complete    |
| M-11 · Village priorities and subsistence | In progress |

M-11 is now governed by the phased program in
[`stonebridge-colony-simulation-spec.md`](stonebridge-colony-simulation-spec.md).
The earlier smart-world milestones remain valid infrastructure, but their
discrete adventure-turn contracts do not authorize aggregate village labor,
whole-project spawning, remote work, or presentation-only activity. D&D combat
remains unchanged while the village simulation proceeds through S0–S10.

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

## D-M5.1 — Unity dungeon playability gate

### Player-visible result

The native client presents a useful local dungeon viewport and exposes the
complete tactical action set without shrinking the map behind permanent side
panels.

### Completion evidence

- Unity receives a rolling 30×20 dungeon viewport centered on the party leader
  instead of fitting an entire unseen 56×40 floor into the window.
- The dungeon projection declares its legal intents and provides compact
  inventory, visible-target, class-power, and revisioned party-order data.
- A thin contextual command bar exposes search, wait, healing, powers, rest,
  inventory, and party orders. Inventory and order controls are dismissible
  overlays rather than permanent columns.
- Selecting a visible enemy supplies the authoritative instance UUID to ranged
  attacks, thrown items, invokable items, and Magic Missile. Equipment can be
  equipped and offhand gear removed through native controls.
- Automated protocol coverage verifies viewport dimensions and every new
  command projection. All 90 tests pass and the macOS Unity player builds
  successfully.
- A clean three-level fortress dive completed through `/api/unity/action` in
  252 turns: the party opened 10 doors, fought 24 attacks, changed depth twice,
  collected treasure and an item, used healing and a class power, and reached
  the final exit with all four members alive. Native smoke checks separately
  verified movement, search, inventory/equipment, and a revisioned party order.

## D-M5.2 — Native dungeon hardening

### Player-visible result

The native dungeon now explains combat and only offers actions that can
currently succeed. Inventory, targeting, terminal states, and party equipment
are usable without leaving the Unity window.

### Completion evidence

- Dungeon `legalIntents` now respect active, dying, stable, dead, and won
  states plus health, remaining powers, safe rest, equipment, visible targets,
  weapon range, nearby doors, and stair position.
- The command strip exposes Examine, Shoot, Ascend, Descend, and Death Save when
  relevant. Unusable potion, power, rest, ranged, throw, invoke, and equipment
  controls remain hidden instead of failing after selection.
- Selected actors show current and maximum HP. A transient red screen flash and
  a five-entry colored activity overlay communicate attacks, misses, damage,
  healing, traps, discoveries, treasure, equipment, level changes, and death
  saves.
- Inventory is scrollable and can inspect or equip each party member by UUID.
  Victory, death, and stabilization receive explicit terminal overlays.
- The regression suite passes with 95 tests and the macOS Unity player builds
  successfully. A 255-turn, three-level Unity-protocol dungeon run reached
  victory with all four party members alive after 10 opened doors and 32
  attacks.
- The native gate passed in a fresh 176-turn, three-level run driven only by
  visible Unity controls: six doors opened, 23 attacks resolved, three enemies
  were defeated, treasure and items were collected, two level transitions
  completed, and all four party members survived the final exit. The run also
  exposed and fixed passive searching consuming the deliberate Search action.

### Accepted interface freeze

- D-M5.2 is accepted. Preserve the native dungeon viewport, contextual command
  strip, activity feedback, inventory/equipment drawer, party controls, and
  terminal overlays while M-6 begins. Material redesign belongs to a later,
  explicitly opened interface milestone.

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

### Completion evidence

- Patrol is persistent priority-20 work. Property damage creates one
  priority-90 evidence-backed investigation, while reported danger creates
  priority-100 response work.
- Guard perception is deterministic and uses observation plus distance. An
  accepted incident records stable UUID references to its evidence, offender,
  guard, and resulting job.
- Higher-priority guard work suspends patrol and releases its reservations.
  Once the interruption resolves, eligible suspended work is reserved again
  and resumes rather than being recreated.
- The investigation plan navigates toward the evidence object, examines it
  through the shared interaction executor, warns the offender, escalates a
  repeat offense to escort, then releases all incident and job claims. Missing
  evidence cancels cleanly and also permits patrol to resume.
- The Unity village inspector exposes each resident's current reason. Nearby
  smart-object affordances create visible contextual commands with keyboard
  shortcuts without adding a permanent panel or altering the frozen dungeon
  interface.
- Save schema 15 migrates incident state and expanded guard capabilities. The
  full regression suite passes with 101 tests and the macOS Unity player builds
  successfully.
- The native manual gate passed: breaching the armorer wall through Unity
  suspended the active patrol, produced a single investigation, displayed the
  guard's reaction in the activity feed, then showed the guard investigate,
  warn, complete the work, and resume patrol using only visible Unity controls.

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

### Completion evidence

- Eight bounded templates cover smithing, remedy brewing, armor fitting, meal
  preparation, fishing, hauling, stable care, and message delivery. Each role
  declares its capability, permitted job type, and numeric priority.
- Persistent UUID-backed stockpiles provide explicit inputs, capacity,
  thresholds, work duration, and outputs. Production consumes each input and
  creates each output exactly once, including across save/load.
- Work jobs reserve their workstation plus input and output stock. Competing
  work cannot claim an occupied exclusive workstation. Essential remedies and
  stable care outrank notices and other low-value routine work.
- The M-5 carter delivery now feeds a complete economic chain: delivery places
  supplies in the forge, Hanne Voss converts one supply into one ash spear, and
  the staffed smithy exposes that spear as sale inventory.
- Fishing creates a catch, porter work moves it to the inn, and innkeeper work
  converts it into meals. The herbalist, armorer, hostler, and messenger also
  create persistent world-state outputs through the same job engine.
- Shops open only when their proprietor is inside and at least one configured
  good is in stock. Sales decrement real stock; unavailable goods cannot be
  purchased.
- The resident inspector exposes work permissions and priorities. Unity adds a
  dismissible `Shop [Y]` overlay listing the keeper, stocked goods, quantities,
  and prices without reducing the map viewport.
- Exact role permissions make assignments unambiguous in this bounded slice,
  so global minimum-cost matching was not necessary. Deterministic tie-breaking
  remains available in the shared assignment contract.
- Save schema 16 migrates expanded stock and worker priorities. All 108 tests
  pass and the macOS Unity player builds successfully.
- The native manual gate passed: the Unity activity feed showed resident
  production, the persisted carter-to-smith chain completed, and entering the
  staffed Red Hammer Smithy displayed its newly forged `Ash spear ×1` in the
  visible shop overlay.

## M-7.1 — Economy hardening gate

### Result

- An available actor may hold only one job. Higher-priority jobs win genuine
  contention; queued work remains available rather than reporting a false
  failure, while guard preemption remains explicit.
- Blocked jobs use bounded exponential retry backoff and immediately reconsider
  changed locked-door access. Job routes retain valid path segments instead of
  replanning the entire route every tick.
- Weighted navigation uses a deterministic binary heap. A 100-turn village
  benchmark improved from roughly 249 ms to 20 ms per turn without restoring a
  fixed map boundary.
- Every stockpile container UUID resolves to its current world object, including
  repaired references in existing saves. Delivery descriptions name their real
  cargo and destination.
- The herbalist can consume remedy stock to heal the most injured party member.
  Resident inspection exposes permissions, capabilities, and priorities in both
  projections.
- Consumables purchased for a companion now enter that companion's inventory.
- The regression suite passes with 116 tests, formatting is clean, and Unity
  scripts compile successfully under Unity 6000.5.10f1.
- The native visible-controls run showed delivery enabling ash-spear production,
  concurrent remedy production and resident healing, and meaningful work events
  without API-driven turn advancement.

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

### Completion evidence

- Companion work state is keyed by actor UUID and carries role-derived
  capabilities, permissions, priorities, current objective, action, reason,
  discoveries, and completed objective history.
- Dispersed companions independently perform healing, scouting, training,
  research, rumor gathering, rest, and paid work through the shared job,
  reservation, navigation, and smart-object systems.
- Follow-leader and reported danger suspend active personal work, release its
  claims, and begin a one-cell-at-a-time regroup. Re-dispersing resumes eligible
  suspended work instead of recreating it.
- Regrouping opens unlocked building access through the shared interaction
  executor, blocks the leader from stepping onto companions, and recalculates
  dynamic occupancy so companions never stack while returning.
- The party spending policy supports approval-only, routine-supplies, and
  autonomous modes with a copper limit. Autonomous equipment and over-limit
  purchases are rejected; explicit player purchases remain approvals.
- Unity exposes Disperse/Regroup, spending policy, and a village Wait action in
  the compact command strip, with keyboard shortcuts and companion work details
  in selection data. The accepted dungeon interface remains unchanged.
- Save schema 17 migrates partial legacy companion records and preserves jobs,
  claims, work history, and actor references. The full regression suite passes
  with 125 tests, formatting is clean, and the macOS Unity player builds under
  Unity 6000.5.10f1.
- The native gate dispersed the party into rumor gathering, chapel rest, and
  guild research, recalled all three through visible Unity controls, and used
  visible Wait turns until every companion returned without teleporting,
  stacking, stale reservations, or lost objectives.

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

### Accepted implementation

- NPCs, the hero, and every companion use the same bounded life-state contract
  for hunger, fatigue, safety, social contact, morale, schedule, recent
  memories, and recommendations. Authority is explicit: residents are
  autonomous; the hero is recommendation-only; companions self-direct only
  while dispersed.
- A deterministic quarter-hour Stonebridge clock selects work, rest, and
  free-time blocks. Schedule modifiers change shared job-board scores without
  moving actors or bypassing ordinary turn resolution.
- Meals, beds, chapel benches, prayer places, public benches, and conversation
  partners are UUID-backed smart resources. Jobs reserve the actor, object, and
  social partner atomically and use the existing navigation and access-door
  logic.
- Critical needs can replace stale queued life work and suspend ordinary work,
  while priority-100 danger response remains authoritative. Completed life
  jobs record bounded meaningful memories and release every claim.
- Unity displays the town clock and selected actors' needs, schedule, current
  reason, and latest memory. Player-controlled characters expose the same data
  without silently taking control away from the player.
- Save schema 18 migrates clocks and life state. Nine focused M-9 gates cover
  shared contracts, determinism, authority, preemption, danger priority,
  reservations, a complete town day, and Unity inspection.
- The native Unity gate advanced from day 1 at 06:00 to day 2 at 06:00 using
  only the visible Wait control. The map showed residents converging on meals
  and beds, the activity feed reported meal work, and the resulting inspector
  projection contained completed meal, sleep, and social memories.

### Party-management extension

- The four established characters are the default starting roster, not a
  party-size limit. Party membership, Unity projection, selection, and
  management are UUID-driven and scroll over an arbitrary member array.
- Every member now has a separate character sheet, six abilities, twelve
  trainable skills, a combat role, and prioritized activities. Skills advance
  only from the work, combat, exploration, and social actions a character
  actually completes.
- The Unity Party panel is available in town and dungeon play, with Overview,
  Activities, Combat, and read-only Skills tabs plus a full individual sheet.
  Specialized practice is gated by physical facilities, and management changes
  do not consume a simulation turn.
- Save schema 19 adds development and management safely to existing party
  members. Five focused party gates include a five-member projection test; the
  complete 141-test suite and Unity script compilation pass.

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

### Completion evidence

- The Unity HUD now exposes Pause, Step, Run 1×, and Fast 4× in one compact
  strip over the map. F5–F8 provide the same controls without opening another
  panel or reducing the playfield.
- Every mode executes the existing authoritative `wait` intent. Normal and fast
  alter client scheduling frequency only; requests remain serialized and every
  accepted tick is rendered in order.
- Pause is accepted even while a server turn is resolving. That already
  accepted turn finishes atomically, then no further turn is scheduled.
- Simulation eligibility is projected from authoritative state. Dungeon play,
  unresolved village danger, non-active run states, and world/regional travel
  decisions cannot advance continuously. Tactical cases surface an explicit
  pause reason.
- Reservation UUIDs are deterministic across replay while still distinguishing
  later reservation attempts for the same job and resource.
- Seven focused M-10 gates prove manual/continuous equivalence, zero mutation
  while paused, speed equivalence, dungeon and village-danger tactical pauses,
  explicit travel suspension, and actor passage negotiation. The complete
  148-test M-10 suite passes, the
  macOS player builds, and the visible Unity controls pass step, run, fast, and
  fast-to-pause checks.

## M-11 — Village priorities and subsistence

The authoritative cross-system requirements and acceptance order for the live
Stonebridge founding simulation are maintained in
[`stonebridge-rimworld-baseline.md`](stonebridge-rimworld-baseline.md). Detailed
construction, household/housing, and art rules remain in their linked supporting
contracts. An M-11 feature is not accepted until it satisfies that plan's test,
deterministic replay, live Unity, and truthful-inspector proof rules.

### Player-visible result

Stonebridge evaluates settlement-wide needs instead of merely filling isolated
resident jobs. The current priority is visible in Unity, projects explain their
dependencies, and production expands the village's persistent capacity.

### Delivery stages

1. **Lumber infrastructure — complete.** A woodcutter harvests generated trees,
   leaves persistent stumps, stores bounded log inventory, constructs a lumber
   yard from four logs, and converts later logs into building lumber. Her
   forestry, construction, and carpentry ranks improve through completed work.
2. **Food security — complete.** A farmstead consumes lumber, crops consume a
   finite seed reserve, grain can be retained as future seed, and a persistent
   breeding herd produces milk or can be culled without consuming its last
   breeding pair. Grain, vegetables, milk and meat feed real meal production,
   and eating consumes one prepared meal.
3. **Kitchens and households — next.** Stonebridge currently has five inn beds
   for eighteen residents. A focused night audit produced sixteen blocked sleep
   jobs and confirmed that no resident can construct a bed. Give homes beds,
   household kitchens and storage while retaining an inn or communal kitchen
   for residents without a household.
   The first M-11.1 slice now persists deterministic UUID-backed households and
   exclusive resident membership without creating free housing or fixtures.
4. **Housing growth.** Spend lumber and other materials on plotted homes, add
   beds and household capacity, and allow population only when food and housing
   support it.

### Automated gate

- A full 24-hour day advances in exactly 2,400 deterministic 36-second beats;
  at the native normal cadence this is approximately 30 real minutes.
- Dawn, day, dusk and night derive from the persisted clock, and the Unity
  terrain shade consumes the same authoritative daylight value.
- Time-based work and needs advance in game minutes rather than raw turns, so
  changing the calendar scale does not make a tree, meal or night's sleep
  complete in a few seconds of world time.
- Priority scores and dependency explanations are deterministic and survive
  save/load with UUID-backed projects.
- A named village administrator owns UUID-backed work orders, and development
  jobs reference the active order rather than appearing without authority.
- Harvesting changes one real tree into one persistent stump and adds exactly
  two logs without duplicating resources.
- Lumber-yard construction consumes four stored logs exactly once.
- Sawing consumes logs and creates bounded lumber inventory.
- Farm construction consumes four lumber; crop, dairy and meat output remains
  bounded by seed, herd, storage and labor rather than appearing implicitly.
- Ada Weiss and Niko Brand accumulate farming, construction, husbandry and
  butchery practice from completed work.
- One satisfied hunger job consumes exactly one prepared meal.
- Continuous and manual turns still execute the same simulation step.

### Scope boundary

The rolling map remains spatially open. M-11 grows its meaningful sites and
production regions rather than imposing a hard town rectangle. Farms, homes and
livestock are not considered complete until their own vertical stages and tests
pass.

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

M-1 through M-10 are complete. M-11 is active: preserve the accepted D-M5.2
dungeon interface and extend the shared deterministic simulation from tested
lumber and food security into household kitchens and material-backed housing.
