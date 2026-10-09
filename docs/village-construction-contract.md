# Village Construction Contract

Stonebridge construction follows an object-local workflow. A project is a
collection of independently supplied and independently built world objects; it
is never a single progress bar that makes several objects appear together.

The detailed comparison that governs the corrective rebuild is documented in
[`rimworld-construction-gap-review.md`](rimworld-construction-gap-review.md).

## Required lifecycle

Every fence tile, wall tile, door, gate, floor tile, and freestanding fixture
has its own construction element and stable identity.

1. **Designate** — the architect places a translucent blueprint at the exact
   occupied cell or footprint. No collision, shelter, storage, or other
   finished-object behavior exists yet.
2. **Reserve material** — a worker reserves a finite material unit from a real
   stockpile for one exact element.
3. **Haul material** — that worker walks from the stockpile to that element.
   One carried stack may change only that element's supplied quantity.
4. **Frame** — once the element has all required material, a builder standing
   at its work position changes that one blueprint into an unfinished frame.
5. **Build** — labor advances only while a builder remains at that element.
   The frame displays its own progress; no neighboring element inherits it.
6. **Complete** — sufficient labor changes exactly one frame into exactly one
   finished world object. The worker must then move to another element.

Supplied elements may be built while other elements in the same project still
await materials. Hauling and building are independent jobs and may happen in
parallel. A project completes only when every required element is complete.

## Non-negotiable invariants

- One delivery event modifies one construction element only.
- One worker action can complete at most one construction element.
- A planned or unsupplied element cannot receive construction labor.
- Every completed element consumed its declared material and labor.
- Materials are never copied across several cells or created on completion.
- A worker must physically route to the material and then to the work site.
- Workers cannot build from the project entrance or another remote cell.
- Two workers cannot reserve the same material or construction element.
- Cancelled work releases reservations and leaves or returns delivered stock.
- Save/load preserves element identity, supplied quantity, labor, and claims.
- UI text must describe real movement and work, never a fictional routine.

## Wood-unit scale

Stonebridge counts rough timber and sawn lumber in conserved wood units. Sawing
changes the usable form of wood; it does not multiply its mass. The initial
balance deliberately uses RimWorld's early-construction ratios as a legible
baseline:

| Source or object                                    | Wood units |
| --------------------------------------------------- | ---------: |
| Mature pine, maple, or birch                        |         27 |
| Mature elm (Stonebridge-specific provisional value) |         32 |
| Mature oak                                          |         46 |
| Timber fence section                                |          1 |
| Timber wall section                                 |          5 |
| Wood floor cell                                     |          3 |
| Wooden door or fence gate                           |         25 |

A common mature tree therefore supplies about five wall sections; an oak
supplies about nine. A standard construction carry is five wood units, so one
wall takes one visible material trip while a door takes five. Species survives
the harvest decision even though the first stockpile presentation still merges
the resulting rough timber; preserving species through stacks and boards is a
later material-identity slice.

## Visual language

- **Blueprint:** translucent silhouette of the final object.
- **Partially supplied:** blueprint plus a visible material stack and quantity.
- **Supplied:** complete material stack inside the blueprint.
- **Frame:** recognizable unfinished version of the object.
- **Active work:** frame plus progress and a visible worker/tool action.
- **Complete:** material-specific finished art with connections and shadows.

Fence art must connect straight sections, corners, ends, junctions, and gates.
Wood, stone, and metal constructions use distinct finished and framed art.

## Delivery order

The deterministic default is the architect's element order, adjusted only to
preserve access. For the founding farm this means fence sections are supplied
and completed one cell at a time before the barn, fixtures, and door. Doors and
gates are completed last when doing so prevents workers being trapped.

## Acceptance tests

1. A newly posted project exposes only blueprint elements.
2. The first material delivery changes exactly one blueprint to supplied.
3. Each delivery changes the supplied count by its exact carried quantity and
   affects no other element.
4. Construction cannot begin on an unsupplied element.
5. A supplied element can be built before the full project is supplied.
6. A builder completes one element, moves, and then starts the next element.
7. Concurrent workers claim different elements without duplicating material.
8. Stock reduction equals material present in frames and completed objects.
9. No facility or building appears before every required element completes.
10. A deterministic replay produces identical deliveries, movement, labor,
    completion order, and final stock.

The implementation must satisfy tests 1–6 before visual polish continues.
Tests 7–10 are required before the founding scenario is considered systemic.

## Live design review — 2026-09-28

The first watched pre-material plan is mechanically present but **not visually
or behaviorally accepted**. At the reviewed point, the lumber-yard plan exposed
33 wall cells and one door before material delivery, but the result still read
as a thin loop of repeated map symbols rather than a planned timber building.

### What is working

- The complete footprint now appears before logs, lumber, tools, or banked labor
  are available.
- Planned elements do not behave as completed collision, shelter, or production.
- Individual material reservations, carrying, delivery, and wall completion can
  occur on distinct cells.
- A finished wall segment does not complete the remaining project at once.

These are necessary invariants, not sufficient player-facing construction.

### Current design failures

1. **The blueprint is a marker, not the intended object.** Planned walls are
   rendered as repeated pale crossbars. They resemble fence/grid symbols and do
   not preview the mass, orientation, corners, doorway, interior, or eventual
   timber wall.
2. **The building is structurally incomplete.** The current plan contains a
   perimeter and door but no foundation, floor, roof area, roof supports, or
   commissioning state. It cannot truthfully become a usable building.
3. **Labor is counted twice.** Founders perform abstract jobs such as “brace the
   working frames,” “sort construction lumber,” and “prepare timber joinery” to
   manufacture `settlement_labor` tokens. Each physical element then consumes
   labor again. Those token jobs are largely invisible and make busy residents
   look idle or arbitrary.
4. **The bill of materials is contradictory.** The development project still
   describes the lumber yard as requiring four logs, while its 34 physical
   elements each require material. The displayed project cost, stock threshold,
   hauling demand, and actual installed material must come from one recipe.
5. **Site preparation is not physical.** Surveying, clearing, trenching, and
   joinery are generic progress jobs around offsets. They do not designate or
   change exact terrain, foundation, stock, or frame objects.
6. **Stage contrast is too weak.** Blueprint, delivered material, frame, active
   work, and complete states are small variations of thin brown/cream shapes.
   At overview scale the player cannot reliably answer what is planned, supplied,
   being worked, or finished.
7. **There is no readable project logistics surface.** Selecting one cell shows
   aggregate section completion, but not that element's required/delivered
   material, labor, reservation, assigned hauler/builder, valid work position,
   or blocking prerequisite.
8. **The plan has no architectural hierarchy.** A project is currently a flat
   ordered list. It needs explicit phases and dependencies so floors precede
   fixtures, supported roofs follow walls, and doors/gates preserve access.
9. **Connections are not designed.** Wall and fence neighbors do not yet choose
   ends, straights, corners, junctions, or doorway joins, so even completed work
   reads as disconnected pieces.
10. **Commissioning is an abrupt metadata change.** Completion still ultimately
    creates the facility/building record as one final effect. The physical room,
    roof, access, fixtures, and production affordances must independently prove
    that it is usable.

### Correct construction process

Stonebridge construction will use these explicit phases:

1. **Authorize** — the reeve issues a priority-backed project request. This
   creates no world object and consumes no material.
2. **Survey and validate** — an architect selects a full plot and validates
   roads, water, terrain, entrances, material routes, work positions, room size,
   fixture clearance, and future expansion. Rejection remains visible with its
   exact reason. A door must occupy exactly one non-corner perimeter edge and
   must have distinct, passable landing cells immediately inside and outside;
   a corner door or blocked approach invalidates the whole plan.
3. **Designate** — the entire plan appears immediately as object-shaped,
   material-tinted silhouettes: foundation/floor, walls with connections, door,
   roof coverage, workstations, storage, and access paths. This phase needs no
   construction stock.
4. **Prepare exact cells** — trees, rocks, debris, or unsuitable ground on the
   footprint receive real removal or ground-preparation jobs. Completed terrain
   changes remain visible; no abstract labor currency is created.
5. **Stage materials** — the project publishes a coherent bill of materials.
   Haulers reserve physical stock and carry units to a project staging zone or
   exact element. Delivered stacks remain visible and selectable. Forestry
   workers continue producing wood while this happens; they are not silently
   reassigned as builders.
6. **Build foundations and floors** — workers stand at valid work cells and
   construct one supplied element at a time. Their labor is recorded directly
   on those elements; no `settlement_labor` token is spent. Only residents with
   the `build` capability may add construction labor, and they prefer this work
   over lower-priority general tasks once a supplied cell is ready.
7. **Raise frames and walls** — a supplied wall first becomes a recognizable
   timber frame, then gains labor until it becomes a connected finished wall.
   Multiple builders may work different elements, never the same claim.
8. **Close the envelope** — supported roof elements, door, and gates are built
   in an access-safe order. Enclosure, indoors, shelter, and temperature begin
   only when their physical rules pass.
9. **Install fixtures** — storage, workstations, beds, tables, chairs, and other
   multi-cell objects are produced and installed only after their rooms and
   approach cells are usable.
10. **Inspect and commission** — the facility becomes operational only when its
    required room, access, roof, storage, and workstation objects all pass their
    own checks. Commissioning adds no free object or resource.

The founding crew therefore has three concurrent, non-interchangeable lanes:
foresters create raw wood, haulers with logistics skill move it to exact cells,
and builders with construction skill raise supplied cells. Assignment prefers
the strongest relevant skill and uses stable identity as the final deterministic
tie-break. General labor alone grants none of these specialized actions.

### Visual acceptance standard

At the ordinary overview zoom, without selecting anything, the player must be
able to distinguish:

- an empty planned cell from ordinary ground;
- the silhouette and footprint of the intended object;
- no material, partial material, and fully supplied states;
- a loose delivered stack from an installed timber frame;
- active work from a stationary resident;
- a frame from a finished material-specific object;
- connected wall/fence orientation and a door/gate opening;
- a physically complete room from an unroofed or inaccessible shell.

RimWorld's [work-to-build](https://rimworldwiki.com/wiki/Work_To_Build),
[structure](https://rimworldwiki.com/wiki/Structure), and
[roof](https://rimworldwiki.com/wiki/Roof) pages are references for the clarity
of delivered resources, construction labor, enclosure, access, and support.
[Clanfolk construction](https://wiki.hoodedhorse.com/Clanfolk/Construction) is
a reference for visibly separating blueprints, material collection, work time,
and the finished result. Stonebridge uses original art and its own mechanics.

### Corrective implementation order

1. Remove `settlement_labor` as a consumable construction resource and delete
   the generic labor-token job loop. Convert any legitimate preparation into
   element-local terrain, staging, fabrication, or construction work.
2. Make one authoritative project recipe generate both the displayed bill of
   materials and every element requirement. Reject mismatched totals in tests.
3. Add foundation/floor and roof elements plus explicit phase dependencies to
   the lumber-yard plan before expanding to farms or houses.
4. Replace crossbar blueprints with connected silhouettes and strongly distinct
   supplied, frame, active, and completed treatments.
5. Expand selection data to show exact element quantities, labor, reservations,
   workers, access cells, blockers, and project phase.
6. Prove the revised lumber yard in a fresh watched run before allowing the
   farmstead, fences, pasture, or housing to mask its failures.
