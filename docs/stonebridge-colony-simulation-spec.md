# Stonebridge colony-simulation specification

Status: authoritative simulation program  
Scope: Stonebridge village and founding scenario  
Out of scope: dungeon presentation and combat rules

## Product decision

Stonebridge is a continuous, deterministic colony simulation rendered by Unity.
The village is not a sequence of adventure-turn side effects and it is not a
collection of icons representing completed abstractions. People, stock, plans,
frames, walls, doors, furniture, rooms, animals, farms, and facilities are
persistent world entities or derived facts about those entities.

RimWorld is the principal reference for colony-simulation grammar: visible
designations, autonomous prioritized work, physical hauling, object-local
construction, derived rooms, readable pawn composition, and inspectable failure.
Clanfolk remains a secondary reference for medieval production chains and
construction presentation. Stonebridge keeps original art, source code, setting,
economy, time scale, and D&D-derived combat.

This document governs the overall program. Supporting implementation contracts
remain binding where they do not conflict with it:

- [Construction contract](village-construction-contract.md)
- [Construction gap review](rimworld-construction-gap-review.md)
- [Households and housing](m11-households-housing.md)
- [Village art contract](village-art-style.md)
- [Visual-state inventory](village-visual-state-inventory.md)
- [Acceptance ledger](stonebridge-rimworld-baseline.md)
- [Logical-town validation](stonebridge-town-richness-validation.md)
- [Semi-open growth and social simulation](stonebridge-semi-open-growth-design.md)

## Contract authority and boundaries

The current engine grew from a discrete roguelike turn contract. That contract
is still correct for party intent, dungeon exploration, and D&D combat. It is
not allowed to define the internal granularity of the village simulation.

The authority order is:

1. D&D rules govern combat resolution, abilities, damage, recovery, and party
   advancement.
2. This colony-simulation contract governs village time, needs, schedules,
   work selection, reservations, hauling, movement, construction, production,
   rooms, housing, agriculture, animals, and presentation state.
3. `applyRogueTurn` may advance the village clock, but it may not turn a
   multi-stage village process into one atomic world effect.
4. Unity renders a projection of authoritative state. It never invents a
   finished object, job, carried item, room, or animation state.
5. SQLite is a load/save boundary. Live simulation owns one in-memory object
   graph and does not reconstruct or persist it every tick.

No legacy compatibility rule may justify free resources, aggregate labor,
whole-building spawning, remote work, hidden routes, or misleading activity.

## Reference findings adopted from RimWorld

The following are design principles, not instructions to copy art or code.

| Reference behavior                                                                                      | Stonebridge contract                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Work priorities are ordered, capability-limited, and directly prioritizable.                            | Every resident has explicit allowed work types and numeric priorities. Need overrides, eligibility, target priority, skill, distance, and reservations produce a deterministic choice with an inspectable score. |
| Pawns re-evaluate needs and schedules between jobs instead of abandoning every job each tick.           | Jobs have safe interruption points. Food, shelter, sleep, danger, and direct orders may interrupt according to declared policy; ordinary reprioritization waits for an atomic action boundary.                   |
| Blueprints receive physical materials, then construction work is applied to the supplied object.        | Each Stonebridge element owns required/delivered material, a frame, work remaining, worker claims, and one stable UUID from designation through finished object.                                                 |
| Haulers deliver to blueprints/frames and stockpiles have filters, capacity, and priority.               | Loose items, carried stacks, element deliveries, stockpile cells, containers, and shelves are real inventory locations. A pile cannot be decorative metadata.                                                    |
| Walls, doors, and roofs physically create rooms; roof support is spatial.                               | Enclosure, indoors, shelter, residence capacity, and facility readiness are derived continuously from completed primitives. Project completion creates no missing shell or fixtures.                             |
| Terrain and objects contribute movement cost; doors add passage behavior.                               | Routing uses authoritative terrain/object costs and door state. Visual and navigational state must agree at every tick.                                                                                          |
| Growing zones designate work on fertile terrain; sowing, growth, harvest, and hauling are distinct.     | A farm is a set of field cells and structures, not a facility icon. Each crop cell has its own biological state and work opportunities.                                                                          |
| Pawn visuals are assembled from directional body, head, hair, apparel, equipment, and condition layers. | Stonebridge uses a modular render recipe and caches completed appearances. Stable idle pawns do not rock; movement and work effects are driven only by authoritative action state.                               |
| Inspect panes expose objects, work, schedules, storage, and reasons work cannot happen.                 | Every visible plan, object, stock location, pawn, room, and facility has a truthful inspection projection and actionable blocker.                                                                                |

Reference pages used for this extraction:

- [Work](https://rimworldwiki.com/index.php?title=Work),
  [Orders](https://rimworldwiki.com/wiki/Orders), and
  [Schedule](https://rimworldwiki.com/wiki/Menus)
- [Hauling](https://rimworldwiki.com/wiki/Hauling) and
  [Stockpiles](https://www.rimworldwiki.com/wiki/Stockpile)
- [Work To Build](https://rimworldwiki.com/wiki/Work_To_Build),
  [Structures](https://rimworldwiki.com/wiki/Structure),
  [Doors](https://rimworldwiki.com/wiki/Door), and
  [Roofs](https://rimworldwiki.com/index.php?redirect=no&title=Roof)
- [Rooms](https://rimworldwiki.com/wiki/Room),
  [Needs](https://rimworldwiki.com/wiki/Need), and
  [Growing zones](https://www.rimworldwiki.com/wiki/Growing_zone)
- [Move speed and path cost](https://rimworldwiki.com/wiki/Path_cost),
  [texture/facing conventions](https://rimworldwiki.com/wiki/Modding_Tutorials/Textures),
  and Ludeon's official
  [1.5 pawn-renderer overview](https://ludeon.com/blog/2024/03/anomaly-expansion-and-update-1-5-announced/)

Numerical RimWorld values are balance references, not automatic Stonebridge
rules. Any adopted number must be recorded in a Stonebridge recipe and tested.

## Simulation kernel

### Clock and decisions

- The authoritative clock is integer game minutes plus a monotonic simulation
  tick. Normal speed remains approximately thirty real minutes per game day.
- Pause performs no simulation ticks. Step performs exactly one tick. Speed
  changes wall-clock cadence, never decisions or results.
- Each tick updates spatial indexes, needs, job validity, movement or active
  interaction, world processes, derived spatial facts, and telemetry in a fixed
  documented order.
- Random outcomes use named deterministic streams. Rendering time, frame rate,
  HTTP timing, iteration order, and database timing never affect simulation.
- Actors retain valid jobs. They do not rescan the entire job board or change
  purpose every visual frame.

### Persistent entities

Every mutable entity has a UUID, definition ID, revision, position or owner,
and lifecycle state. Required entity families are:

- actor: resident, party member, visitor, or animal;
- item stack, carried stack, tool, and container inventory;
- designation and construction element;
- finished structure, fixture, terrain improvement, crop, and plant;
- stockpile/zone and its cell membership;
- household and residence assignment;
- project, job, reservation, and actor plan.

Project and building records are indexes and derived groupings. They are not an
alternate store of objects that can disagree with the map.

### Derived facts

Rooms, buildings, shelter, indoors, facility readiness, pasture enclosure,
storage totals, bed capacity, residence capacity, and population capacity are
recomputed or incrementally maintained from persistent entities. A derived fact
must name the primitive evidence supporting it and the first failing condition.

## Work and purpose contract

### Work selection

At a job boundary, a resident evaluates candidates in this order:

1. immediate danger, incapacitation, fire, rescue, or medical emergency;
2. critical food need;
3. critical exposure/shelter need, with `homeless` retained as an explicit tag;
4. critical sleep or health need;
5. direct player order;
6. scheduled work by work-type priority;
7. noncritical food, shelter, rest, hygiene, social, or recreation needs;
8. low-priority hauling, cleaning, maintenance, training, learning, or useful
   preparation that changes a real skill, object, stock, or terrain state;
9. truthful leisure or `Available for work` when no useful candidate exists.

Homelessness does not create a house. A homeless resident eats first, then seeks
the best available legal shelter or performs high-priority shelter-building work
when safe and eligible.

Candidate scoring is deterministic and inspectable. It includes work priority,
settlement urgency, direct-order status, capability, skill, path cost, tool
availability, target priority, reservation status, and continuity bonus. Stable
tie-breaking uses entity UUID, never container iteration order.

### Resident skill progression

Combat and civilian work share one learning-by-doing contract. A successful,
meaningful action names one or more practiced skills and awards deterministic
experience from declared effort and difficulty. No experience is awarded merely
for movement, waiting, decorative routines, cancelled work, or repeated
zero-value actions.

Village skills include cultivation, animal husbandry, forestry, mining,
quarrying, milling, baking, cooking, brewing, smithing, carpentry, masonry,
textiles, leatherworking, construction, architecture, logistics, animal
driving, medicine, leadership, trade, and hospitality. The skill catalog may
grow, but every job and recipe must declare the skills it practices and requires.

Rank has bounded, inspectable effects on job eligibility, work time, output
quality, recovery or yield, waste, accident risk, diagnosis, teaching, and
inspection. It never creates inputs, bypasses movement, or replaces physical
work. Rank, experience, next-rank threshold, aptitude, modifiers, and source
events persist through save/load. Cultivation and animal husbandry are distinct
skills even when both are practiced on the same farm.

### Job and reservation lifecycle

Jobs progress through `available`, `reserved`, `active`, `suspended`, `blocked`,
`complete`, or `cancelled`. A job names its actor requirements, exact target,
interaction cell, inputs, tool, action duration, interruption policy, and effect.

- Reservations cover the actor, target, interaction cell, tool, and exact item
  quantity when applicable.
- A failure releases only claims that job owns.
- Temporary path contention is not permanent blockage.
- Repeated failure uses bounded retry/backoff and reports the actual reason.
- A job label is a statement about current physical work, not flavor text.
- No `settlement_labor` or other fungible labor token may stand in for visible
  preparation or construction.

### Movement

- Simulation positions change by legal orthogonal map steps; Unity interpolates
  only between confirmed positions.
- Route cost combines terrain, completed objects, open/closed doors, carried
  load, and declared actor capabilities.
- Occupied cells, multi-cell actors, work cells, and destination adjacency are
  reserved consistently.
- Residents yield and repath before declaring blockage. They never teleport,
  overlap illegally, or oscillate solely to look active.
- Facing comes from the most recent meaningful movement or interaction target.
- The client receives movement start, destination, facing, action, carried item,
  and progress; it never guesses work from sprite position.

## Physical logistics contract

An item quantity exists in exactly one location: source object, ground stack,
carried inventory, container/shelf, delivered construction element, installed
object, consumed output, or declared waste/salvage.

- Stockpiles are cell zones with filters, priorities, capacity, and actual
  stacks. Storage buildings are containers with footprints and interaction cells.
- Shelves begin visibly empty. Contents are separate state-backed overlays.
- Haulers reserve a bounded quantity, walk to it, pick it up, visibly carry it,
  walk to a destination, and transfer it.
- Builders may deliver their own missing material only through the same transfer
  rules. This does not create a second private inventory model.
- Material accounting tests reconcile source, transit, delivered, installed,
  output, legitimate waste, and salvage after every mutation.
- Species/type identity is preserved whenever mechanics or visuals distinguish
  it. Until that is systemic, generic lumber must not display species-specific
  boards.

## Construction state machine

Every constructed primitive uses one identity and this lifecycle:

```text
designated -> clearing_required -> awaiting_material
           -> partially_supplied -> supplied -> frame
           -> active_work -> complete -> damaged
           -> repair_frame -> complete
           -> deconstruction -> salvage/destroyed
```

Cancellation is legal before completion and produces an explicit recovery
result. Replacement changes material only through deconstruction/rebuild or a
declared upgrade recipe.

### State rules

- `designated` displays the connected silhouette and costs nothing.
- `clearing_required` creates exact cut, haul, demolish, or prepare-terrain jobs.
- supply states display the intended silhouette plus actual delivered stock.
- `frame` exists only after full required material is physically delivered.
- `active_work` requires an eligible builder at a valid interaction cell with a
  reserved tool when the recipe requires one.
- `complete` turns that same entity into the permanent world object immediately.
- A completed wall blocks movement and supports roofs immediately, even while
  neighboring elements remain planned.
- A completed door immediately becomes an openable/closable passage.
- A completed fixture immediately becomes selectable and usable if its own
  requirements pass. It is never delayed until whole-project commissioning.
- Project completion only observes that all required members and commissioning
  predicates pass. It spawns no walls, floors, doors, fixtures, capacity, stock,
  animals, crops, or facility metadata.

### Recipes and phases

One recipe source generates element inputs, displayed bill of materials, labor,
tool/skill requirements, salvage, and telemetry. A mismatch is a test failure.

Projects declare a dependency graph rather than a flat list:

1. survey and exact clearing;
2. prepared ground/foundations;
3. floor or outdoor work surface;
4. structural frames and walls;
5. supported roof coverage;
6. doors/gates in an access-safe order;
7. independently produced and installed fixtures;
8. commissioning predicates.

Builders work one primitive over multiple visible beats, finish it, and move to
the next. Separate workers may build separate primitives concurrently.

## Architecture and facilities

### Rooms and buildings

A room is a contiguous walkable region enclosed by completed boundaries and
valid doors, with separately derived roof coverage, access, floor state, and
contents. A building is a stable grouping of connected rooms and exterior
structures. Neither is created by painting a bounding rectangle.

Every architecture archetype declares occupied cells, circulation, doors,
interaction cells, roof supports, room intentions, fixture clearances, and an
expansion edge. Site validation operates on every cell and route.

### Required founding archetypes

1. **Lumber yard** — outdoor log/board zones, saw/workstation, tool storage,
   weather-protected lumber storage, and circulation.
2. **Farmstead** — individually designated field cells, barn or storage room,
   fence sections, a working gate, seed/harvest storage, and animal access where
   applicable. A field zone itself costs no building material; preparation,
   fencing, storage, and barn objects do.
3. **Timber cottage/family house** — validated full-size plan; floors, timber
   walls, door, supported roof, 1x2 single or 2x2 double beds, empty household
   storage, kitchen, table, and chairs. Capacity derives from habitable space and
   completed assigned beds.
4. **Inn** — a genuinely buildable facility, not `communal_kitchen` metadata.
   It requires an enclosed roofed kitchen, ingredient and meal storage, cooking
   station, common room, tables/seating, guest sleeping capacity, doors, and
   service circulation. Cooking and lodging activate independently when their
   physical predicates pass; final commissioning creates nothing.

The farm, house, and inn reuse the same primitive construction system. None gets
a facility-specific shortcut.

## Agriculture and food

- Water interactions require visible reachable water and a real fishing work
  position. A dry-land marker cannot produce fish.
- Field designations expose crop choice, fertility, sowing policy, growth,
  harvest readiness, blight/damage where later implemented, and current work.
- Sowing, tending, harvesting, carrying, storing, cooking, serving, and eating
  are separate actions with physical targets and inputs.
- Kitchens consume ingredients, fuel where required, tool use, and labor.
- Residents take meals from real storage, carry them, select a legal eating
  location, and consume them. Food never disappears from a distant pile.
- Food reserves and projected demand participate in reeve priorities before
  cosmetic expansion.
- The reeve reviews resident needs and forecasts every 100 ticks (24 times per
  2,400-tick day), retains the last decision between reviews, and returns to
  ordinary work after the review. Future resident petitions replace omniscient
  polling without delaying individual emergency reactions.

## Presentation contract

### World-state readability

At normal overview zoom, without selecting an object, the player must distinguish:

- terrain types, roads, fertile soil, water, floor, and roof coverage;
- mature tree species, saplings, stumps, logs, boards, and loose stacks;
- blueprint, partial supply, full supply, frame, active construction, completed,
  damaged, and deconstruction states;
- timber wall versus later stone wall;
- the same wooden/steel door in open, closed, frame, and damaged states;
- empty shelf/container versus actual stored contents;
- idle, walking, carrying, and actively working residents;
- field designation, prepared soil, planted crop, growth, harvest, and fallow.

Blueprints are translucent versions of the final connected footprint, not
crossbars. Supplied material remains visible without replacing that silhouette.
Frames resemble the intended object and material. Active work adds a local
progress/effect layer, not a generic icon.

### Modular pawn renderer

A pawn appearance is a data recipe, not a role PNG:

```text
body build + skin + head + hair + facial detail
+ underlayer + clothing + outerwear + headwear
+ carried item/tool + condition/status overlays
```

Initial body builds are slim, average, heavy, and obese. Each visual layer uses
the same pivots, scale, facing convention, and attachment points. South, north,
and east art are required; west may mirror east only when every asymmetric layer
permits it. The compositor validates the complete recipe and caches the composed
result by appearance hash, facing, action state, and equipment state.

Animation rules:

- Idle is stable. There is no perpetual whole-body rocking, bobbing, swaying,
  or fake walking.
- Locomotion runs only while authoritative movement is in progress. A short,
  restrained two- or four-phase gait may offset independent body parts, but it
  may not slide the whole pawn side to side.
- Cell interpolation is monotonic and ends exactly on the confirmed cell.
- Building, chopping, hauling, eating, sleeping, and using a workstation each
  have explicit poses/effects driven by the current job and progress.
- Carried objects come from actual carried inventory and use consistent hand or
  shoulder anchors. Dropping/transferring the stack removes the overlay.
- Direction changes update facing; a stationary worker faces the target.
- Tight alpha bounds and an approved world scale keep pawns readable at 100x60.
- Stable composed layers are cached. Transient tool/effect layers render
  separately so a work swing does not rebuild every appearance texture.

The renderer may take inspiration from RimWorld's layered clarity, but all
Stonebridge silhouettes, clothing, faces, textures, and animations are original.

## Inspection and control

Selection of a pawn shows current need override, schedule block, current job,
target, path destination, carried item, reserved tool, progress, next decision,
and blocker. Selection of construction shows recipe, required/delivered stock,
frame/work state, worker and hauler claims, valid interaction cells,
dependencies, and cancellation result.

The player can prioritize, queue, suspend, forbid, cancel, repair, deconstruct,
change storage priority/filter, and change work priorities. Commands operate on
the same jobs used by autonomous residents and must explain why unavailable.

Pause, step, speed, save, centering, selection, and inspection remain available
while the simulation is running. Camera state never controls simulation state.

## Performance contract

The camera viewport is never the authoritative world extent. Regional growth
uses the persistent chunk identities and active/warm/cold simulation tiers in
`stonebridge-semi-open-growth-design.md`; a cold chunk may update less often,
but it may not lose identities, invent resources, skip travel, or discard
scheduled events. Unity receives relevant chunk deltas and level-of-detail
summaries rather than a full regional cell snapshot every beat.

- Live authoritative state remains in memory. Database access occurs on load,
  explicit save, checkpoint, or clean shutdown only.
- Frequently queried entity, spatial, room, stock, job, and sprite indexes are
  cached and invalidated by relevant state revisions rather than rebuilt per
  actor or per rendered frame.
- Simulation updates are independent of Unity render frame rate. Unity consumes
  snapshots/deltas and interpolates visuals without posting extra turns.
- Telemetry measures tick duration, scheduler scans, route searches, cache hits,
  active jobs, blocked jobs, and projection/render time.
- The 10-resident founding run must remain smooth at normal and fast speed
  before population growth is accepted. Subsequent 50-, 150-, and 400-resident
  fixtures must meet declared tick, route, scheduler, projection, and memory
  budgets before their corresponding growth stage is accepted.

## Verification program

Every milestone requires four forms of proof:

1. focused deterministic invariant tests;
2. the complete automated suite;
3. a headless replay from canonical founding state with a machine-readable
   audit and no state injection;
4. a watched Unity replay of the same seed/build in which map, inspector, and
   audit agree.

Required conservation ledgers cover food, wood by processing state, tools,
construction inputs, fixtures, crops, and animals. Required resident telemetry
classifies every minute as movement, useful interaction, need fulfillment,
recreation, forced waiting, or truthful idle with a reason.

## Delivery program

### S0 — contract seam and observability

- Separate village scheduling from adventure/combat action resolution while
  retaining the public turn entry point.
- Remove `settlement_labor` and generic activity that changes no target.
- Add build/run fingerprints and resident/job/material ledgers.
- Freeze new facility shortcuts until the primitive pipeline passes.

Gate: a 500-tick founding replay accounts for every resident and every material
delta; no database access occurs during live ticks; all blockers are classified.

### S1 — persistent primitives and immediate completion

- Introduce one UUID-backed entity lifecycle for floors, walls, doors, gates,
  roofs, fixtures, fields, and delivered material.
- Make each completed element immediately become its permanent object.
- Remove `ensureFoundingFacilityStructure`, `completeFounderHouse`, and other
  whole-project object spawning after their callers migrate.
- Derive room/building/facility facts from primitives.

Gate: save/load at every lifecycle state preserves UUIDs and quantity; completing
one fixture makes exactly that fixture usable while unfinished neighbors remain.

### S2 — one truthful lumber yard

- Add exact clearing, floor/work surface, walls/storage cover where designed,
  supported roof, door, workstation, and stock zones.
- Replace crossbars/plank placeholders with connected silhouettes, delivered
  stacks, recognizable frames, active work, and completed art.
- Add exact selection/prioritize/cancel/deconstruct behavior.

Gate: a watched zero-material start proceeds cell by cell to an operational
lumber yard without spawning, remote work, free inputs, or unexplained idleness.

### S3 — logistics, storage, and tools

- Implement stockpile cells, filters/priorities, container contents, carried
  stacks, tool reservation/return, staging, and cancellation recovery.
- Render empty shelves and truthful content overlays.
- Preserve wood processing identity and reconcile every unit.

Gate: concurrent haulers/builders never duplicate or lose stock; an interrupted
multi-worker project reconciles exactly across save/load.

### S4 — architecture, rooms, doors, and housing

- Implement room/enclosure/roof/support/access derivation.
- Build valid cottage and family-house archetypes at full useful size.
- Build correctly oriented 1x2 single and 2x2 double beds plus household
  storage, kitchen, tables, and chairs as independent objects.
- Implement matching open/closed wooden doors and later material variants.
- Assign residents to completed beds; destruction/abandonment restores homeless.

Gate: ten founders can construct shelter and receive valid sleeping locations;
no capacity or fixture appears before its physical evidence exists.

Founding-order constraint: emergency communal shelter in the completed lumber
workshop plus assigned bedrolls is sufficient to defer private homes. The reeve
must first inventory resident hunger and the food outlook, preserve a one-day
food floor through fishing, hunting, gathering, and cooking, clear the planned
seasonal field, and begin sowing. Private household construction becomes
eligible after planting is underway and no hunger warning or one-day reserve
failure is active; it does not require the entire barn, pasture, or long-range
farm master plan to be complete.

### S5 — farmstead and food chain

- Rebuild the farm as field zones, crop cells, storage/barn primitives, fence,
  working gate, and real animal access.
- Add visible water-backed fishing and physical ingredient/meal logistics.
- Prove soil preparation, sowing, growth, harvest, storage, cooking, and eating.

Gate: food production/consumption balances over a full deterministic day and
every food unit has a traceable origin, location, and consumer.

### S6 — buildable inn

- Replace the founding `communal_kitchen` placeholder with the inn archetype.
- Independently construct kitchen, pantry, common room, furniture, guest beds,
  doors, floor, roof, and circulation.
- Derive cooking, dining, and lodging operations from completed rooms/fixtures.

Gate: a zero-building founding run can build and operate an inn; the prebuilt
scenario uses the same primitives and rules rather than a separate implementation.

### S7 — scheduler, needs, and movement hardening

- Implement the explicit priority/need model, job continuity, direct orders,
  bounded retry, yielding, congestion recovery, and low-priority useful work.
- Tune work/travel/eat/sleep durations against the slow day.
- Add controls and diagnostics for work priorities, schedules, and blockers.

Gate: no healthy resident is unexplained for a full day; no permanent blocked
job remains; normal/fast/headless runs produce identical decisions.

### S8 — world art and state readability

- Complete original terrain, tree, material, blueprint/frame, wall, door,
  furniture, storage-content, crop, animal, and work-effect families.
- Enforce asset registry, prompt provenance, tight crop, alpha, scale, pivots,
  state continuity, and overview/close-zoom checks.

Gate: blind screenshot review can correctly identify object class, material,
state, and footprint without letters or inspector text.

### S9 — modular pawns and action animation

- Implement appearance recipes, layered compositor, cache, body builds, skin,
  hair, clothing, equipment, and conditions.
- Add directional stable idle, locomotion, carrying, building, chopping, eating,
  sleeping, and workstation states without whole-body rocking.
- Give residents and party members persistent distinct appearances.

Gate: watched workers visibly match their authoritative facing, carried item,
movement, target, and current action; static pawns remain visually still.

### S10 — survival and growth gate

- Run repeated 3–5 minute learning loops, then one-day and multi-day audits.
- Report production/consumption, completed primitives/facilities, capacity,
  occupancy, unmet needs, health, fatigue, homelessness, blockage, congestion,
  and idle classification.
- Balance recipes and priorities systemically, never by spawning rescue stock.

Gate: existing residents repeatedly survive without intervention, invalid beds,
starvation, dangerous fatigue, permanent blockage, hidden stock, or database
thrashing. Population growth remains disabled until this gate passes.

## Current issue disposition

The review findings map to the program as follows:

- House and farm element mechanics are retained, then migrated through S1–S5.
- The inn is added as a real archetype in S6; `communal_kitchen` is retired.
- Missing directional/action character art is addressed structurally in S9,
  after the authoritative action projection is reliable.
- Crossbar blueprints, generic plank piles, and weak frames are replaced in S2
  and completed across the asset families in S8.
- Delayed fixtures/facility metadata are corrected in S1, not cosmetically hidden.
- The rocking idle behavior is forbidden immediately by the art contract; a
  stable fallback is preferable to false animation while S9 is unfinished.

The immediate implementation milestone is **S0**, followed by **S1**. Art and
additional facility work must not leapfrog the identity and completion model
that makes their visuals truthful.

## Implementation status — 2026-09-28

- **S0 foundation passes:** `settlement_labor` and targetless community-labor
  jobs are removed. A deterministic 500-tick audit accounts for every resident,
  job status, blocker, and stored/loose/carried/delivered material without
  touching persistence during live ticks.
- **S1 is active, not complete:** construction elements now receive stable
  UUIDs. Completed walls, fences, doors, gates, and fixtures immediately become
  persistent world objects with the same identity, including across save/load.
  Access frames are installed open before enclosing work and close when the
  project finishes, so builders cannot seal away the remaining work.
- Enclosed building groupings are now derived as soon as their completed wall
  and door evidence exists. Commissioned buildings, residences, and pastures
  retain the exact primitive UUIDs that justify them. A finished fixture is
  selectable and usable under its construction UUID while neighboring fixtures
  remain unfinished; delivered batches expose exact identities and quantities.
- Remaining S1 work is to derive room, residence, and facility readiness from
  floors, roofs, enclosure, access, and fixtures. Compatibility aggregate
  metadata remains, but no longer paints over primitive-backed construction.
