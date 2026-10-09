# RimWorld versus Stonebridge construction review

Date: 2026-09-28

This review compares observable construction behavior. RimWorld is a reference
for legibility and systemic object construction; Stonebridge must retain original
art, code, content, economy, and rules.

## Executive conclusion

RimWorld builds **world objects**. A wall blueprint becomes a supplied wall
frame and then that exact wall. Floors, doors, furniture, and roofs are separate
designations. A room becomes a room because its physical boundary and roof
satisfy room rules.

Stonebridge currently builds **a project with element progress**, then converts
the completed project into a building/facility record. Its individual wall
delivery and labor are real, but the final conversion still creates the bounding
box, floor, door, fixtures, capacity, pasture, or facility affordances in a
single completion effect. That hybrid is the primary reason construction still
looks and feels weak.

## Stage-by-stage comparison

| Stage                 | RimWorld behavior                                                                                                                 | Stonebridge now                                                                                                                                                          | Required correction                                                                                                                            |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Authority             | Player places exact construction designations; work priorities and direct orders determine who responds.                          | The reeve selects a fixed priority and hard-coded plot automatically.                                                                                                    | Keep autonomous reeve planning, but expose the actual plan, reason, priority, dependencies, and player override.                               |
| Site selection        | Each blueprint occupies its final footprint and is rejected where placement rules fail.                                           | A bounding rectangle is checked mainly for roads and blocking tiles.                                                                                                     | Validate every occupied cell, work cell, entrance, haul route, terrain change, fixture clearance, roof support, and expansion route.           |
| Pre-material plan     | The exact intended object is visible before resources arrive.                                                                     | This now occurs, but wall plans are pale crossbar symbols.                                                                                                               | Render a translucent material-tinted silhouette of the final connected wall, floor, door, roof, or fixture.                                    |
| Bill of materials     | Every designated object owns a material type and exact cost.                                                                      | Physical elements now use 5 wood per wall, 25 per door/gate, and 1 per fence; the older project summary still says four logs.                                            | Generate the project summary and every element requirement from one authoritative recipe.                                                      |
| Work selection        | Construction/hauling work is selected through pawn work settings, eligibility, pathing, priorities, and direct prioritization.    | The scheduler is deterministic, but several founders perform generic labor-token jobs unrelated to exact objects.                                                        | Schedule only concrete survey, clearing, fabrication, hauling, building, repair, or cleanup jobs tied to world targets.                        |
| Material hauling      | Required material is physically reserved, carried, and placed at the blueprint/frame.                                             | Up to four haulers reserve a maximum five-unit stack for one element and physically travel to it.                                                                        | Retain object-local delivery; make carried and delivered stacks selectable and quantitatively readable.                                        |
| Supplied state        | Delivered resources remain visibly associated with the specific construction.                                                     | The element records delivered quantity, but the small three-plank marker is hard to distinguish.                                                                         | Show recognizable material piles and `delivered/required` counts without replacing the blueprint silhouette.                                   |
| Frame                 | The supplied object becomes an unfinished frame; work is applied to that object.                                                  | `planned` changes directly to `in_progress` on the first labor tick. The visual is a thicker crossbar.                                                                   | Persist a real frame state/object with material-specific artwork, hit state, reservations, labor, and cancellation behavior.                   |
| Construction labor    | Builder work advances the target's work-to-build; construction skill affects performance. No abstract labor currency is consumed. | Each element has labor, but founders also manufacture and consume `settlement_labor` tokens first.                                                                       | Delete labor tokens. Apply all labor directly to preparation, fabrication, frames, roofs, and fixtures.                                        |
| Completion            | That exact frame becomes that exact finished object at the same footprint.                                                        | A wall element can display as complete, but the project remains authoritative until every element finishes.                                                              | Make the completed element the permanent world object immediately; the project should only index its members.                                  |
| Building/room result  | Rooms emerge from completed boundaries, doors, roof coverage, and terrain. Floors remain separately constructed.                  | Final project completion calls a world-effect function that adds a bounding-box building, interior floor, door, house fixtures, capacity, pasture, or facility metadata. | Remove the whole-building conversion. Derive enclosure, shelter, capacity, production, and pasture status continuously from completed objects. |
| Roof                  | Roof areas are designated/constructed, require support, can be removed, and affect indoor state.                                  | There are no construction roof elements or roof-support rules.                                                                                                           | Add roof designations, support reach, build/remove work, visible coverage, and collapse/incomplete states.                                     |
| Door/gate             | Doors and fence gates are separate structures with passage state and material properties.                                         | Main doors and pasture gates are elements, but the finished object and its route state are installed at project completion.                                              | Preserve the same UUID from blueprint through frame to finished open/closed object and update pathing from that state.                         |
| Floors                | Floor tiles are independent designations with their own material and labor.                                                       | Interior floor tiles appear from the completed building rectangle without being supplied or built.                                                                       | Make each floor tile a material-backed construction element and world object.                                                                  |
| Furniture             | Furniture is independently designated, supplied, built, moved/deconstructed, and used.                                            | Fixtures can be construction elements, but house fixtures are instantiated together when `completeFounderHouse` runs.                                                    | Turn each completed fixture element into its permanent UUID-backed object immediately; never spawn the set at commissioning.                   |
| Cancellation          | A blueprint/frame can be cancelled; reservations and delivered resources are handled at that object.                              | Cancellation invariants are documented, but the complete element-local recovery loop is not live-proven.                                                                 | Cancel exact elements, release claims, leave/recover actual delivered stock, and preserve completed neighbors.                                 |
| Repair/deconstruction | Damage, repair, replacement, deconstruction, and salvage operate on finished objects.                                             | These lifecycles are absent from founding construction.                                                                                                                  | Use the same persistent object identity for damage, repair, deconstruction, salvage, and material replacement.                                 |
| Inspection            | Selection communicates object, material, progress, and relevant commands; pawn work can be prioritized.                           | Selection reports stage and aggregate completed sections only.                                                                                                           | Show exact material, labor, frame health, worker, hauler, reservation, work cell, blocker, dependencies, and prioritize/cancel controls.       |
| Visual hierarchy      | Blueprint, resources, frame, active work, finished object, damage, room and roof are distinguishable at play zoom.                | Most stages are thin cream/brown variations and disconnected repeated shapes.                                                                                            | Establish high-contrast state treatments and connected material-specific structure art before expanding construction types.                    |

## The labor-model mismatch

Stonebridge's `settlement_labor` is the largest process error. Founders currently
perform generic tasks such as:

- Clear the building site;
- Carry project materials;
- Brace the working frames;
- Maintain the shared tools;
- Survey the next foundation;
- Dig foundation trenches;
- Sort construction lumber;
- Prepare timber joinery.

Those tasks create fungible labor credits. The project consumes those credits,
then builders perform hundreds of additional element labor minutes. The result
is double-counted labor and residents who appear busy without creating a visible
change.

RimWorld's useful principle is simpler: hauling moves a real resource, and
construction work advances a real blueprint/frame. Stonebridge preparation
should therefore change exact terrain or fabricate exact components. If a task
does neither, it should not be presented as construction.

## The world-object mismatch

Current Stonebridge completion uses two whole-project effects:

- `ensureFoundingFacilityStructure` adds a rectangular building and door after
  the facility flag completes. The map then infers all boundary walls and every
  interior floor from that rectangle.
- `completeFounderHouse` creates the building, every fixture, the finished door,
  residence capacity, bed capacity, occupancy data, and habitability together.

These operations undo the credibility gained from cell-local construction.
Even if every planned element received material and labor, the visible and
usable finished objects do not grow out of those elements; a new parallel set
of objects is spawned at the end.

The replacement rule is:

> A construction project never creates the finished building. Each completed
> element becomes its own permanent world object, and building/room/facility
> status is derived from that collection.

## What Stonebridge already does well

The current implementation should not be discarded wholesale. It already has:

- deterministic UUID-backed jobs and replay;
- one material delivery applied to one exact element;
- several haulers supplying different elements concurrently;
- hauling continuing while supplied elements are built;
- one worker action completing at most one element;
- material-starved construction releasing labor for prerequisite production;
- persistent household identity independent of housing;
- the beginnings of access-aware element ordering.

Those are strong simulation foundations. The error is that they currently feed
an aggregate building-completion model.

## Stonebridge target model

### Persistent primitives

Every constructed primitive owns a UUID from designation onward:

- prepared-ground or foundation tile;
- floor tile;
- wall segment;
- door or gate;
- roof tile/area segment and support relation;
- freestanding or multi-cell fixture;
- delivered material stack;
- permanent finished world object.

The identity is never replaced between blueprint, supplied, frame, finished,
damaged, repaired, and deconstructed states.

### Derived structures

A `building`, `room`, `residence`, `pasture`, or `facility` is a derived spatial
group, not a shortcut that paints missing objects. It becomes usable only when
its completed primitives prove:

- continuous required boundary;
- valid door/gate access;
- required floor and roof coverage;
- sufficient roof support;
- reachable required fixtures;
- storage and workstation requirements;
- material and safety rules;
- declared capacity rules.

### Real work only

Every construction-related resident action must answer all four questions:

1. Which persistent world object or terrain cell is the target?
2. What physical stock, component, tool, or labor changes this tick?
3. What visible state changes when the action completes?
4. How can the player inspect, prioritize, suspend, cancel, repair, or resume it?

If those questions have no concrete answers, the action is not valid building
work.

## Required rebuild order

1. Remove `settlement_labor` and every generic labor-credit job from founding
   construction.
2. Replace project cost constants with recipes calculated from exact elements.
3. Introduce persistent construction-object identities that survive every state
   transition and become the finished objects themselves.
4. Add real foundation/floor and supported-roof elements to one lumber-yard
   archetype.
5. Derive enclosure and facility readiness from completed primitives; remove
   bounding-box floor/wall spawning and whole-house fixture spawning.
6. Replace crossbar markers with connected blueprint, delivered-stack, frame,
   active-work, finished, and damaged visuals.
7. Add exact inspection plus prioritize, suspend, cancel, repair, and deconstruct
   controls.
8. Prove one lumber yard from designation through commissioning in a fresh live
   run before reusing the system for fences, farms, houses, or pastures.

## Acceptance replay

The rebuilt lumber-yard gate must visibly demonstrate all of the following:

1. Pause with zero material: complete foundation, floor, wall, door, roof, and
   workstation silhouettes are visible and individually selectable.
2. Run: workers cut trees, leave stumps, carry logs, and stage exact quantities.
3. Delivered material changes only its target element.
4. A builder enters a valid work position and creates one recognizable frame.
5. That frame gains labor over multiple visible beats and becomes one permanent
   timber object.
6. Other blueprints remain planned; other supplied elements remain supplied.
7. Floors, walls, door, roof, and workstation complete separately without a
   whole-building pop.
8. The room/facility inspector changes from incomplete to operational only when
   physical enclosure, roof, access, storage, and workstation rules pass.
9. Cancellation during delivery and during framing conserves stock and preserves
   completed objects.
10. Save/load at every stage reproduces the same object identities and result.

## References

- [RimWorld Work To Build](https://rimworldwiki.com/wiki/Work_To_Build)
- [RimWorld Structure](https://rimworldwiki.com/wiki/Structure)
- [RimWorld Roof](https://rimworldwiki.com/wiki/Roof)
- [RimWorld Room](https://rimworldwiki.com/wiki/Room)
- [RimWorld Orders](https://rimworldwiki.com/wiki/Orders)
- [Clanfolk Construction](https://wiki.hoodedhorse.com/Clanfolk/Construction)
