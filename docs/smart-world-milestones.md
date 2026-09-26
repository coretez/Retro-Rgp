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

| Milestone                           | State    |
| ----------------------------------- | -------- |
| M-1 · Contracts and simulation seam | Complete |
| M-2 · Navigation and credible roads | Next     |
| M-3 through M-10                    | Planned  |

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

## M-4 — Job board and reservations

### Player-visible result

The inspect view can show available, reserved, active, blocked, and completed
work. Actors do not yet perform a full economic routine, but jobs are real
persistent objects rather than descriptive text.

### Build

- Add UUID-backed jobs with lifecycle states.
- Add exclusive reservations for jobs, objects, items, and work positions.
- Add capability and work-permission checks.
- Add deterministic assignment scoring using priority, path cost, skill,
  continuity, and risk.
- Add inspect projections for current job, destination, progress, and reason.
- Add save migration for job and reservation state.

### Automated gate

- One exclusive job cannot be assigned to two actors.
- One resource cannot be reserved by two jobs.
- Invalid reservations are released deterministically.
- Incapable or forbidden actors never receive incompatible jobs.
- Assignment ties have deterministic UUID-based resolution.
- Save/load preserves jobs, reservations, and assignments.

### Manual gate

- Open the job inspector and follow a manually posted haul job through its
  available, reserved, active, and completed states.

### Not included

General autonomous schedules, needs, or a complete delivery chain.

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

Implement **M-1 only**. Its purpose is to create a safe simulation seam and
contract tests before changing navigation or behavior. M-2 begins only after
the M-1 gates pass and the existing town remains playable.
