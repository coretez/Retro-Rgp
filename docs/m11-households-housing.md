# M-11.1 household and housing contracts

Stonebridge housing is delivered as vertical slices. A household is social
membership, not a building: creating or migrating one never creates capacity,
fixtures, materials, food, or labor.

A resident's nullable `residenceId` is independent from `householdId`. Missing,
incomplete, destroyed, or uninhabitable housing gives that resident the
`homeless` status tag. Homeless residents consider food first and temporary
shelter second; a household continues to exist while any or all of its members
are homeless.

## Slice A — identities and membership

- `village.households` is authoritative. Each household has UUID `id` and
  `definitionId`, `entityType: village-household`, a readable key and name, and
  sorted resident UUIDs in `memberIds`.
- Every resident has one `householdId`; every referenced household contains that
  resident UUID exactly once. No resident belongs to two households.
- Every resident has a nullable `residenceId` and explicit `housingStatus`.
  Household membership never guarantees a building assignment.
- Initial membership is deterministic. Save migration restores the same UUIDs
  and repairs missing or stale derived membership without creating housing.
- Acceptance tests cover UUID validity, total/exclusive membership, stable
  save/load, and migration from a state with no household data.

## Slice B — residences and capacity

- Residences are persistent UUID-backed world instances separate from
  households. They expose integer resident and bed capacity, position, access,
  construction state, and resident occupants by UUID. Members of one household
  may temporarily have different housing status.
- Occupancy is derived from valid resident assignments. Planned, destroyed, or
  uninhabitable buildings contribute zero capacity and immediately leave their
  assigned residents homeless.
- Tests must prove capacity never exceeds completed physical space, assignments
  reject over-capacity residences, and save/load preserves references.

### Architecture gate

A residence is not valid because a rectangle has a capacity number. Every house
must carry a validated floor plan. The initial timber archetypes are a 16×12
one-or-two-person cottage and a 22×16 family house for up to four residents.
Plans require at least twenty-four clear interior cells per resident after fixtures,
one bed per resident, a kitchen, household storage, a table, an exterior door,
and a continuous walkable route from that door to every fixture. Tables,
storage, kitchens, and beds use their real footprints during validation.

Sleeping furniture has explicit type, footprint, and capacity. A single bed is
1×2 and sleeps one resident; a double bed is 2×2 and sleeps two. Validation
uses summed sleeping capacity and rejects a bed whose label, dimensions, and
capacity disagree. A two-person household may use two singles or one double;
the architecture model does not assume that household members share a bed.

The inn's legacy room arrangement is not a house template. Future construction
selects an architecture archetype first, validates it, then reserves its entire
plot; it may not shrink a plan to fit leftover land.

## Slice C — material-backed house construction

- A reeve work order may authorize a plotted house only after its dependencies
  are complete. The project reserves a real plot and lists exact inputs and
  labor minutes.
- Builders haul consumable inputs to the site one unit per trip. Persistent
  wall, door, and fixture elements each track planned, in-progress, and
  complete states plus their own labor. Several workers may claim distinct
  elements, but never the same element.
- Inputs are consumed exactly once through delivery; cancellation or blocking
  cannot duplicate them. A completed building, door, fixtures, and housing
  capacity exist only after every required element is complete.
- Tests must prove insufficient stock blocks the project, exact stock deltas,
  deterministic plot choice, one-unit hauling, multi-worker element labor,
  minute-based progress, and one building result.

## Slice D — household fixtures

- Beds, storage, and kitchens are UUID-backed world objects placed inside a
  completed residence. Household and residence records hold UUID references,
  not embedded fixture copies.
- A fixture exists only after a capable worker consumes its recipe materials
  and labor. Placement must be walkable and reachable through the residence
  access door.
- Tests must prove exact material consumption, no free migration fixtures, no
  duplicate placement, resolvable references, and ordinary path access.

## Slice E — sleeping assignment and daily viability

- Each resident receives one valid sleeping-object UUID. Household beds are
  preferred; unassigned residents may use explicitly available inn or communal
  beds. Each physical sleeping-capacity slot has at most one resident assignment
  even when no sleep job exists.
- Sleep jobs target the assigned object, reserve it normally, traverse doors,
  and take 480 game minutes. Eating and working retain their existing minute
  scale and schedule priorities.
- Tests must prove unique valid assignments, fallback behavior, no teleporting,
  completion across the rest block, and stable assignment after save/load.

## Slice F — survival audit before growth

- Population capacity is the lesser of supported completed residence capacity
  and assigned bed capacity. It is reported but cannot create residents yet.
- A deterministic multi-day audit reports food and lumber produced/consumed,
  completed buildings, bed capacity/occupancy, unmet needs, blocked work and
  congestion, health/fatigue ranges, and survival without player action.
- Growth remains disabled until existing residents survive the audit with no
  invalid sleeping assignment, no permanent blockage, and sustainable food.

## Session review — 2026-10-04

The working checkout already contains slices beyond membership: architecture,
construction elements, residence completion, household fixtures, life targets,
and founding survival proof tooling. These are existing work, not new acceptance
credit. The handoff's 157-test count is historical; use the current suite result.

The first prerequisite found is migration data loss: `ensureVillageHouseholds`
rebuilt the authoritative list from initial household keys and discarded newly
formed households. Fix membership persistence before extending residential rules.

### Exact acceptance order

1. **A: membership persistence.** Preserve saved household UUIDs, definition
   UUIDs, names, keys, extra metadata, and list order, including new households.
   Retain empty households. Remove departed resident references and duplicate
   memberships; the first saved household containing a resident wins. Sort
   surviving member UUIDs. Assign otherwise unclaimed residents to their
   deterministic initial household and derive every resident's `householdId`
   from the resulting list. Legacy migration and repeated repair are idempotent.
   Repair may modify only households and resident membership references.
2. **B: capacity.** Test planned, incomplete, destroyed, and uninhabitable
   residences as zero capacity; verify validated physical plans, exact occupancy,
   assignment limits, and stable save references. Review `syncResidentHousing`
   and `occupyResidence` together before accepting this boundary.
3. **C: construction.** Test a project with no stock, partial stock, exact stock,
   cancellation, and two workers. Assert material conservation, exclusive element
   claims, physical hauling, elapsed labor minutes, reachable plots, and exactly
   one completed residence. No capacity exists before completion.
4. **D: fixtures.** Assert each recipe's exact inputs and labor, UUID references,
   reachable placement, and no duplicate or free migrated fixtures. Explicitly
   review founding bedroll provisioning separately: the current migration helper
   can create bedrolls, and is not evidence for material-backed bed production.
5. **E: sleeping.** Test both 18-resident Stonebridge and the distinct 10-founder
   scenario. Assert exclusive sleeping-capacity slots (one for a single bed, two
   for a double), reachable assigned targets, fallback scarcity, destroyed beds,
   interruption and recovery, and a 480-minute rest interval. Growth stays off.
6. **F: viability.** Replay identical initial state and intents for at least
   three full days (7,200 ticks), with day-boundary snapshots and material
   ledgers. Report every metric specified above separately for each scenario.
   Sustainable food, valid sleep slots, resident health, and recovery from
   congestion are acceptance gates, not inferred from completed work counts.

### Membership repair scenes and proof boundary

- Normal: a resident joins a newly formed household; saving and loading preserves
  the authoritative membership rather than moving them back to their old family.
- Scarcity: household membership provides no bed, meal, lumber, or residence.
  Repair leaves physical assets unchanged; needs retain their existing rules.
- Danger: a destroyed home does not dissolve its household. Existing housing
  tests cover the homeless tag; membership repair grants no replacement shelter.
- Changed membership: stale resident-side references lose to the household list;
  departed and duplicate members are removed, and unclaimed residents receive
  deterministic fallback membership.

Regression coverage is in `test/village-households.test.js`: newly formed
household save/load, idempotent legacy repair, exact physical-state preservation,
and the existing exclusivity and authoritative-membership tests. This is a data
integrity repair, not a change to actor choices, movement, or production. No live
Unity observation or multi-day survival acceptance is claimed for this slice.
