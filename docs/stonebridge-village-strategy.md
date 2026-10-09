# Stonebridge Village Strategy

Status: active rework plan  
Design reference: RimWorld's visible work, zoning, hauling, construction, and
inspection grammar, adapted to a leader-directed medieval village  
Authority: subordinate to `stonebridge-colony-simulation-spec.md` and maintained
alongside `stonebridge-colony-roadmap.md`

All implementation and acceptance work must follow
`stonebridge-behavioral-development-method.md`.

Regional scale, population growth, relationships, and civic cohesion follow the
[semi-open growth and social simulation contract](stonebridge-semi-open-growth-design.md).
The visible camera window is not a village boundary.

Implementation status: V1-V3 mechanics exist, but their planning-quality claims
were withdrawn on 2026-10-03 after watched play. The current reeve selects a
hard-coded dependency order; that proves authorization plumbing, not intelligent
village strategy. V1-V3 remain implementation foundations and must be
revalidated against the decision-quality gate below before they can be called
complete. V4 final inspection and repair-list behavior is active.

## Decision-quality gate

Planning quality is the first product gate. A legal job, an approved blueprint,
or a completed building is not evidence that the village made a sensible
decision. No roadmap phase receives completion credit from component existence
or headless execution alone.

Before authorizing capital work, the reeve must build an inspectable assessment
from current physical state:

- safe sleeping places tonight and permanent beds still required;
- prepared meals and emergency forage measured in resident-days;
- reliable water, fire, weather, injury, and threat exposure;
- usable tools, available materials, carrying capacity, and travel distance;
- residents required to keep hunting, fishing, cooking, hauling, and care alive;
- candidate plans with time-to-benefit, bed or meal capacity, material cost,
  labor diversion, operating burden, and failure consequences.

The reeve chooses a survival doctrine rather than merely selecting the highest
score. At founding, the compared alternatives must include at least a minimal
camp, a fast communal roofed shelter, and household homes. A communal shelter
may be rational when it roofs ten beds sooner; household homes may win when
weather, privacy, family assignment, fire separation, or incremental completion
make them safer. The decision must name the losing alternatives and explain why
they lost using live evidence.

Every active resident must have a visible reason for the current action, a
traceable contribution to the doctrine, or a truthful blocking reason. The plan
is reevaluated when food coverage, shelter capacity, weather, injury, threat,
materials, workforce, or project ETA changes materially. It is not allowed to
continue an obsolete build simply because its commission exists.

Acceptance requires both a watched run and an action ledger that answer:

1. Why is this the most important village objective now?
2. Why is this facility the best feasible way to meet it?
3. Why is this resident doing this job instead of food, shelter, or recovery?
4. What observation will make the village change its plan?
5. Did the promised survival benefit arrive before the danger it addressed?

If any answer is missing or contradicted by the visible game, the planning gate
fails even when every automated test passes.

## Behavioral correctness gate

Stonebridge is evaluated as play, not as a collection of completed jobs. Every
resident and the village as a whole use the same ordered survivability model:

1. **Immediate danger:** defend, flee, seek cover, rescue, or call for help.
   Attack response interrupts sleep, construction, hauling, social activity,
   and routine needs. A threatened actor may never begin or continue a fence,
   meal, or sleep action while the threat remains physically immediate.
2. **Imminent collapse:** eat available safe food, drink, treat serious injury,
   and sleep at a real reachable sleeping place. These actions interrupt normal
   work before the actor becomes incapacitated.
3. **Community survival:** preserve enough hunters, fishers, cooks, haulers,
   carers, fire keepers, and shelter builders to maintain explicit coverage.
   The reeve may not spend the last viable survival worker on capital work.
4. **Stable production:** farming, storage, tools, housing improvement, and
   maintenance proceed only while the first three layers remain covered.
5. **Expansion and comfort:** fences, trade growth, specialist buildings,
   beautification, and civic upgrades are lowest unless a concrete threat or
   production dependency makes one survival-critical.

The individual and community layers continuously inform each other. An animal
attacking a hunter causes a personal fight-or-flight decision; it also removes
or endangers a food worker, changes expected food coverage, may require rescue
or care, and can suspend unrelated construction. Conversely, a community food
emergency changes which safe ordinary actions are available to individuals but
does not override their response to an immediate attacker.

Watched acceptance samples decision boundaries, not just end-state statistics.
At each material transition the reviewer must be able to pause the game, select
an actor, and answer: what does this person perceive, what alternatives were
considered, why did this action win, what village objective does it support,
and what event would interrupt it? Standing sleep, work during an attack, idle
survival specialists, raw-food consumption, unreachable beds, and expansion
while survival coverage is absent are automatic failures.

### Founding needs census and seasonal food rule

One game day is 2,400 ticks. The reeve performs a village review every 100
ticks—24 scheduled reviews per day—rather than polling every resident on every
simulation beat. The review writes a completed council receipt without leaving
a continuous governance job on the reeve's work ledger. Between reviews the
last decision remains authoritative and the reeve continues ordinary work.

The reeve inventories each resident during that scheduled review rather than
consulting only the capital plan. The persisted census records the resident,
household, housing status, current need values, warning needs at or below 40,
danger needs at or below 25, and the practical requests implied by those needs.
It also records ready and transformable food portions, one-day and three-day
targets, coverage days, whether seasonal planting is underway, forecast risks,
and the recommended village priority with its reason.

This census is an interim planning mechanism. The intended richer model is
bottom-up: residents and households generate petitions, complaints, and urgent
reports which the reeve reviews at the same scheduled council interval. Direct
danger response remains an individual and guard responsibility and never waits
for the next council review.

The census drives both reactive and anticipatory decisions:

1. any starving residents or a reserve below one portion per resident makes
   food the emergency priority;
2. a healthy population does not justify complacency when seasonal fields are
   still unsown—the reeve protects fishing, hunting, cooking, field clearing,
   preparation, and sowing before the reserve collapses;
3. the lumber workshop, bedrolls, fire, and cooking point are acceptable
   communal emergency shelter while this food floor is established;
4. field clearing and sowing begin as soon as the lumber yard can support them;
   they do not wait for private homes or for the complete barn-and-pasture plan;
5. once at least one seasonal field is growing, nobody is hungry, and the
   one-day reserve exists, incremental household construction may begin while
   food production continues;
6. renewed hunger or a forecast reserve failure can supersede ordinary housing
   work at safe action boundaries.

The resulting founding order is `emergency camp and common shelter → short-term
food bridge plus immediate seasonal sowing → incremental farmhouses and homes`.
The farmstead, pasture, storage, and additional fields continue as concurrent
production infrastructure rather than one monolithic prerequisite.

## Trade and agricultural expansion policy

The merchant is a visitor, not a resident and not an infinite shop. Each visit
brings finite seed grain plus iron, steel, copper, tin, and brass, carries finite
coin, remains for two days, and preserves its inventory and transactions through
save/load. The village trades from its own treasury. Automatic purchasing must
respect a cash reserve, exact target quantities, stock capacity, and merchant
availability. Automatic selling may export flour only above the village pantry
reserve.

The current eighteen-day cadence is a tested baseline, not permanent balance.
The test model assumes eighteen days of coverage for critical imports, charges
one unit of overhead per visit, and heavily penalizes stockout days. Fourteen
days is safe but needlessly frequent; twenty-one days and quarterly service are
unsafe under that assumption. Seasonal simulations must revisit consumption,
storage, road closure, caravan variance, and the desired amount of player
pressure before release.

Agricultural growth consumes land as well as seed. Planned field areas retain
their trees until a named worker fells them into stored logs. A field becomes a
crop plot only after all tree cells are physically clear; activation removes
the remaining roots/stumps as field-preparation work. More plots increase the
need for seed, labor, storage, milling capacity, and merchant planning rather
than granting food directly.

## Strategy statement

Stonebridge grows through four distinct authorities:

1. **Specialists create demand.** A smith may request a forge; a baker may
   request a bakery; a healer may request an infirmary. Requests explain the
   unmet need, required rooms and fixtures, expected inputs and outputs, desired
   access, and operating resident.
2. **The village leader authorizes work.** The reeve compares proposals against
   food, shelter, safety, labor, material, storage, road, and expansion needs.
   The reeve approves, defers, rejects, reprioritizes, and assigns accountable
   residents.
3. **The architect designs the solution.** An actual resident with architecture
   capability surveys candidate plots, selects or adapts an archetype, lays out
   every physical element, validates access and expansion, and returns an
   inspectable blueprint and bill of materials.
4. **The common workforce executes it.** Assigned haulers, builders, foresters,
   masons, and laborers complete element-local work. They may select the next
   valid task inside their commission, but they do not decide which facility to
   build or silently redesign it.

In short: demand is bottom-up, authorization is top-down, design is specialized,
and execution is communal.

## Village roles and authority

### Reeve — village leader

Edda Voss is the founding reeve. Leadership must be executable simulation state,
not merely a name attached to an automatic score.

The reeve:

- maintains the visible village strategy and ordered proposal queue;
- declares emergency, survival, civic, trade, and expansion priorities;
- approves a proposal into a UUID-backed commission;
- assigns the architect, foreman, haulers, builders, and specialist owner;
- sets material and labor budgets plus suspension conditions;
- resolves conflicts between private trade needs and common survival;
- inspects completion evidence before commissioning a facility;
- explains every decision and accepts player reprioritization or veto.

The reeve assigns projects and crews, not individual hammer strikes. Within an
assigned project, the foreman and job scheduler allocate exact deliveries and
construction elements.

### Architect

The architect is a resident actor with position, schedule, architecture skill,
current commission, survey route, design time, and failure reasons.

The architect:

- receives only leader-authorized commissions;
- walks to and surveys candidate plots;
- considers districts, roads, water, terrain, existing buildings, reserved
  expansion, storage, fire separation, entrances, and construction access;
- chooses and adapts an archetype rather than accepting a fixed coordinate;
- places foundations, floors, walls, doors, roofs, fixtures, work cells,
  stockpile cells, and access paths;
- produces a bill of materials, labor estimate, dependencies, and alternatives;
- submits the plan to the reeve before designation;
- revises or rejects an impossible commission without creating partial objects.

No translucent blueprint appears until a real architect has completed the plan.

### Trade specialists

Specialists own operating requirements and generate proposals when their trade
cannot meet demand. A request does not authorize construction.

Every proposal declares:

- requester and intended operator;
- facility type and reason;
- current unmet demand and expected village benefit;
- required rooms, fixtures, storage, utilities, access, and safety rules;
- expected inputs, outputs, throughput, and staffing;
- acceptable delay and consequences of rejection.

### Common workforce

Village builders and haulers are a shared labor pool. A commission names its
crew and foreman. Workers retain valid tasks through safe action boundaries,
while survival emergencies may interrupt them visibly.

- Haulers reserve source stock, carried quantity, destination cell, and incoming
  stack capacity.
- Builders occupy a valid work cell and advance one supplied element.
- Foresters, miners, masons, and carpenters supply real materials.
- The trade specialist may help only when qualified and when operating needs do
  not require their presence elsewhere.

## Proposal-to-operation lifecycle

1. **Need detected** — a specialist or reeve identifies a measurable shortfall.
2. **Proposal submitted** — requirements and expected benefit enter the council
   queue; no building or stock is created.
3. **Leader decision** — approve, defer, reject, or request revision with a
   visible reason and priority.
4. **Architect assigned** — the leader names an architect and survey budget.
5. **Survey** — the architect physically inspects candidate districts and plots.
6. **Plan submitted** — the complete footprint, access, fixtures, stock zones,
   materials, labor, dependencies, and rejected alternatives become inspectable.
7. **Commission issued** — the reeve approves the design and assigns a crew.
8. **Designation** — exact blueprint elements and reserved logistics cells
   appear in the world.
9. **Supply and construction** — materials move physically and builders complete
   individual elements in access-safe dependency order.
10. **Inspection** — the architect and intended operator verify enclosure,
    access, utilities, fixtures, storage, safety, and production affordances.
11. **Commissioning** — ownership and operation begin only after physical
    evidence passes; rejected work remains a repair list, not a metadata flag.

## Example proposals

### Smith requests a forge

The smith submits a forge proposal when repair, tool, or weapon demand exceeds
the current workspace. It requires a forge, anvil/workbench, fuel store, raw
material store, finished-goods racks, ventilation, fire clearance, road access,
and safe customer or delivery space.

The reeve may defer it while food or housing is dangerous. Once approved, the
architect chooses an appropriate production plot and the common workforce builds
it. The smith becomes operator only after inspection proves the forge usable.

### Baker requests a bakery

The baker submits a bakery proposal when meal demand and grain supply justify
one. It requires an oven, preparation table, flour and fuel storage, cooling or
finished-food storage, chimney/fire clearance, sanitation, and delivery access.

The architect may place it near grain storage and the market while preserving
fire separation from dense housing. The reeve assigns builders and haulers; the
baker defines operating requirements but does not personally place walls.

## Physical organization of Stonebridge

The architect organizes growth through constraints and reserved districts, not
invisible bonuses or immutable fixed plots:

Stonebridge's founding core sits inside a persistent semi-open region. District
plans may span multiple streamed chunks and connect outlying farms, pasture,
managed woodland, hunting routes, quarries, mines, defenses, and satellite
holdings. Each remote site still requires land, access, travel, hauling,
staffing, protection, storage, maintenance, and an inspectable relationship to
the civic core.

- **Civic/common:** council space, common green, inn, worship, notices, and
  emergency assembly.
- **Residential:** homes, household storage, wells, sanitation, safe walking,
  and reserved expansion.
- **Production:** smithing, carpentry, masonry, baking, workshops, fuel, and
  fire/noise separation.
- **Food/agriculture:** fields, pasture, barns, dairying, butchery, kitchens, and
  protected seed storage.
- **Storage/logistics:** road-connected stock zones, carts, sheds, warehouses,
  loading cells, filters, stack limits, and overflow.
- **Security:** watch routes, gates, sightlines, protected stores, fallback
  shelter, and incident access.

Principal roads remain inviolable. Every plan declares its road connection,
pedestrian access, material route, work positions, storage cells, and future
expansion reservation.

## Facility roster and growth order

Facilities enter play through needs, prerequisites, and proposals rather than a
global build menu. This is the initial canonical roster; each facility still
requires a requester, leader decision, architect plan, construction crew,
physical inputs, and an operator where appropriate.

### Founding and survival

- **Homes** provide assigned beds, household storage, warmth, privacy, and room
  for family growth. Temporary shelter may satisfy survival but not permanent
  housing demand.
- **Well or protected water point** supplies households, food production,
  livestock, sanitation, and firefighting.
- **Farms** are complete agricultural holdings that may combine crop fields,
  gardens, orchards, pasture, pens, barns, and livestock. Their plans declare
  both plant production—grain, vegetables, fruit, seed—and animal
  production—meat, milk, eggs, wool, hides, breeding, and draft power. A farm
  may begin with only one branch, but “farm” never means crops alone.
- **Granary and storehouse** are logistics facilities for protected food, seed,
  materials, and tools. They are not retail stores and must use bounded physical
  storage cells.
- **Common kitchen or cookhouse** provides the first dependable prepared-food
  chain before a specialist bakery is justified.

### Food and livestock

- **Mill** converts grain into flour. Its plan depends on a viable grain surplus
  and a power source such as water, wind, or animal labor.
- **Bakery** turns flour, water, and fuel into durable meals and bread.
- **Barn** shelters livestock, fodder, milking, and animal-care work.
- **Stables and cart shed** support horses, draft animals, carts, tack, feed,
  transport, and caravan handling. Stables do not replace general livestock
  barns or pasture.
- **Pasture, pens, and poultry yard** provide bounded grazing and animal control.
- **Smokehouse, dairy, or butcher** may be proposed when herd size and food
  preservation demand justify specialized processing.

### Production and trades

- **Forge and smithy** provide tool, hardware, weapon, and repair production.
- **Carpenter's workshop and sawpit** produce construction components,
  furniture, carts, doors, and storage fixtures.
- **Mason's yard and quarry support** prepare stone for foundations, wells,
  roads, and defensive structures.
- **Charcoal kiln** supplies forge fuel but requires safe separation from homes
  and woodland controls.
- **Tannery, weaver, and tailor** form later clothing and textile chains; dirty
  or odorous work must respect water flow and residential separation.

### Trade, civic, and care

- **General store or market stall** is a retail/trade facility holding priced
  goods for residents and visitors. It is distinct from a storehouse, which is
  logistical storage without a shopkeeper or sales counter.
- **Inn and tavern** require surplus food, drink, guest beds, sanitation, stable
  access, and an innkeeper. They support visitors, caravans, rumors, and social
  life rather than merely generating income.
- **Council hall or reeve's office** houses the strategy board, proposals,
  records, inspections, and civic meetings.
- **Infirmary and apothecary** provide beds, clean water, medicine storage, and
  healer work.
- **Shrine, common hall, school, or bathhouse** are later wellbeing and civic
  proposals driven by population and culture rather than founding survival.

### Security and infrastructure

- **Guardhouse, watchtower, gate, palisade, and fallback shelter** emerge from
  measured threats and protected-area requirements.
- **Roads, bridges, drainage, firebreaks, lighting, and waste areas** are
  architected infrastructure commissions with maintenance costs, not free map
  decoration.

The first production dependencies are deliberately legible:

1. fields produce grain;
2. the granary protects grain and seed;
3. the mill produces flour;
4. the bakery produces bread and prepared food;
5. the general store and inn distribute surplus output;
6. the forge supplies tools that improve farming, milling, transport, and
   construction;
7. barns, stables, carts, and roads increase the physical reach of every chain.

The reeve may change the order when hunger, shelter, fire, attack, population,
trade opportunity, or material shortage makes another commission more urgent.

## Resident skills and learning by doing

Civilian work uses the same core progression principle as fighting: a resident
gets better by completing real, relevant activity. Combat and village work may
have different effects, but they share one inspectable rank-and-experience
contract rather than unrelated advancement systems.

The initial village skill families are:

- **Cultivation:** preparing soil, sowing, tending, diagnosing crop problems,
  harvesting, selecting seed, and managing orchards.
- **Hunting:** reading tracks, approaching wild game, taking a clean shot,
  recovering meat, and managing pressure on a renewable population.
- **Foraging and fieldcraft:** identifying safe berries, flowers, weeds, roots,
  and shoots; gathering without destroying the patch; and recognizing regrowth.
- **Animal husbandry:** feeding, handling, herding, milking, shearing, breeding,
  birth care, disease observation, and humane slaughter.
- **Forestry, mining, and quarrying:** identifying, extracting, and renewing raw
  resources safely.
- **Milling, baking, cooking, and brewing:** separate processing skills whose
  inputs and outputs remain physical.
- **Smithing, carpentry, masonry, textiles, and leatherworking:** trade skills
  attached to their actual recipes, tools, and workstations.
- **Construction and architecture:** executing a plan versus surveying,
  designing, estimating, revising, and inspecting it.
- **Logistics and animal driving:** hauling, packing, cart handling, route
  planning, and safe movement of goods and draft animals.
- **Medicine, leadership, trade, and hospitality:** care, village decisions,
  negotiation, retail service, and inn operation.

Experience is awarded only when a resident performs or completes meaningful
work at the relevant target. Walking, waiting, fictional routines, cancelled
jobs, and repeatedly exploiting a trivial action do not grant full experience.
The work event records the actor, skill, action, target, difficulty, experience
awarded, previous rank, and resulting progress.

Skill has visible mechanical effects:

- qualified residents become eligible for harder work and advanced recipes;
- speed improves within bounded limits without eliminating physical work time;
- output quality, harvest recovery, animal handling, and diagnosis improve;
- material waste, accidents, crop damage, and animal stress decrease;
- high skill can support inspection, teaching, or apprenticeship;
- low skill remains useful on safe basic work and improves through practice.

Each skill exposes rank, accumulated experience, next-rank requirement,
aptitude, current modifiers, and the exact effects of the next rank. Aptitude may
alter learning rate, but never creates skill without work. Experience, ranks,
and the source events persist through save/load and use deterministic values in
canonical proofs.

For agriculture, cultivation and animal husbandry remain distinct skills even
when one farmer practices both. This lets a resident be an excellent grain
grower but an inexperienced stock keeper, while an established farm can employ
or train specialists in each branch.

Hunting is distinct from animal husbandry. Wild animals remain persistent
actors with home ranges and a protected population floor; a completed hunt
removes one exact animal and creates traceable meat. The reeve may authorize
hunting when the village is below a three-day food reserve, but not when doing
so would reduce the living herd below its renewal floor.

Foraging is an emergency founding measure, not a long-term food industry. Wild
plants remain finite persistent patches, gathering is authorized only below a
one-day durable-food reserve, the emergency basket is small, and depleted
patches regrow slowly. Gathered food is directly edible when no meal remains but
restores only half a prepared meal's hunger; it does not count toward the
reeve's three-day production target.

## Storage strategy

Storage is physical space, not an arbitrary quantity attached to a coordinate.

- A stockpile zone owns explicit cells.
- Each cell has one shared volume/stack allowance across all contents.
- Item definitions declare stack size or volume.
- Filters define allowed categories and exact items.
- Zone priority controls hauling preference.
- Incoming deliveries reserve remaining capacity before pickup.
- Quantity, allowance, filters, priority, reservations, and overflow are visible
  on the map and in the inspector.
- Oversized legacy piles migrate into adjacent valid cells or explicit loose
  overflow; migration never leaves `quantity > capacity`.

## Player authority

The village remains autonomous, but the player can inspect and intervene:

- reorder, approve, defer, or veto proposals;
- set strategic emphasis without placing every job manually;
- request an alternative architect plan or site;
- change a commission's budget, crew, or suspension state;
- designate emergency work or directly prioritize one valid element;
- inspect the reason for every decision, assignment, route, and blocker.

## Implementation program

### V0 — truthful baseline

- Reopen invalid roadmap gates and preserve the current deterministic proofs.
- Add assertions for leader authority, proposals, architect responsibility,
  physical storage, and visual acceptance.
- Remove claims that automatic site search is an architect actor.

Gate: audits fail when a project lacks an accountable requester, authorizer,
architect, crew, physical plan, or storage contract.

### V1 — leader strategy and assignments

Status: complete at roadmap checkpoint 9.

- Give the reeve a persisted strategy, proposal queue, decisions, reasons,
  budgets, commissions, and named crew assignments.
- Expose the strategy board and player overrides in Unity.

Gate: every active village project is authorized by a visible leader decision,
and every worker's project assignment traces to that commission.

### V2 — specialist proposals

Status: complete at roadmap checkpoint 10.

- Add demand models and facility requirements for smith, baker, healer,
  carpenter, farmer, innkeeper, and other trades.
- Allow proposals to be deferred, rejected, revised, and resubmitted.

Gate: a forge and bakery arise from demonstrated specialist demand rather than a
hard-coded global build order.

### V3 — architect actor and planning

Status: complete at roadmap checkpoint 11.

- Add architecture capability, surveying, alternatives, district constraints,
  archetype adaptation, bills of materials, and leader approval.
- Keep plans as UUID-backed objects through revision, construction, and save/load.

Gate: no blueprint appears without a completed architect commission, and the
selected plan visibly beats or explains its rejected alternatives.

### V4 — communal construction

Status: active; the forge vertical is green, while explicit final inspection
and repair-list cycles remain.

Checkpoint 12 adds a non-negotiable construction invariant: every enclosed
building must have a finished, supported physical roof before it can complete,
provide shelter, house residents, or operate as a facility. Roof loss reverses
those derived states until repair.

- Assign foremen, builders, haulers, and suppliers to approved commissions.
- Complete element-local dependencies, work positions, access-safe ordering,
  repair lists, inspection, and commissioning.

Gate: builders execute the approved plan without inventing facilities, remote
labor, inaccessible elements, or silent redesign.

### V5 — physical storage and logistics

- Replace coordinate stockpiles with cell zones, filters, priorities, stack
  limits, incoming reservations, overflow, and migration.
- Integrate storage cells into architect plans and facility inspection.

Gate: no cell exceeds its shared allowance and every stored unit is visibly
located, counted, allowed, reserved, and reachable.

### V6 — readable world and animation

- Finish terrain/occupant compositing, coherent asset scale, directional actor
  movement, work animation, construction stages, labels, and inspectors.
- Add watched motion and overview captures to acceptance rather than checking
  asset registration alone.

Gate: roads never flash green, plants have no tile squares, figures remain
readable while moving, and storage/build progress can be understood without
debug output.

### V7 — strategic village release

- Run specialist-request, leader-decision, architect-plan, construction,
  storage, survival, save/load, and watched Unity matrices across seeds.

Gate: Stonebridge grows from resident needs through accountable village
strategy, physical planning, communal work, bounded storage, and readable
presentation without hard-coded facility completion.
