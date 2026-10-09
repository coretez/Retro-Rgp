# Stonebridge semi-open growth and social simulation

Status: accepted direction; regional terrain substrate partially implemented  
Scope: R8 regional scale, population growth, relationships, and small-city load  
Authority: subordinate to `stonebridge-colony-simulation-spec.md` and maintained
with `stonebridge-colony-roadmap.md`

## Correction to the current model

The 140×84 Unity map is an observation window, not the town boundary. Treating
that snapshot as the settlement world would make agriculture, forestry,
hunting, mining, roads, districts, outlying farms, and eventual population
growth compete inside an implausibly small rectangle.

Stonebridge must be a semi-open settlement region. The player observes and
interacts with a bounded window, while the authoritative world persists beyond
that window and streams deterministic chunks as the camera, residents, or
adventurers move. Geography and travel time—not an arbitrary camera edge—limit
growth.

The current ten-founder site is a camp-sized core inside that larger region. It
must not determine the eventual footprint of the village, town, or small city.

## Spatial contract

### Persistent regional world

- Divide the region into deterministic 32×32-cell chunks addressed by stable
  world coordinates and UUID-backed chunk identities.
- Persist discovered terrain, resources, ownership, improvements, paths,
  structures, hazards, and ecological changes per chunk.
- Generate untouched chunks from the seed and regional geography; never
  regenerate a modified chunk from appearance alone.
- Keep the camera window independent from world extent. Zooming or panning may
  request more chunks but may not move actors or advance time.
- Use natural boundaries and world travel transitions—rivers, cliffs, distant
  wilderness, roads to other settlements—instead of an invisible town wall.
- Keep every remote action spatial: residents travel a real route, spend time,
  carry bounded goods, face danger, and return. Off-screen does not mean
  instantaneous.

### Growth envelopes

These are load and land-reservation targets, not rigid square city walls:

| Stage      | Population target | Minimum planning envelope | Required spatial character                                                                  |
| ---------- | ----------------- | ------------------------- | ------------------------------------------------------------------------------------------- |
| Founding   | 10–25             | 256×256 cells             | camp, first homes, fields, pasture, managed timber, safe water                              |
| Hamlet     | 25–50             | 384×384 cells             | multiple households, common, workshops, larger farm belt, hunting routes                    |
| Village    | 50–150            | 512×512 cells             | neighborhoods, civic services, market/logistics, outlying farms and resource sites          |
| Town       | 150–400           | 768×768 cells             | multiple districts, defenses, industrial separation, satellite holdings                     |
| Small city | 400–1,000         | 1,024×1,024+ cells        | streamed districts, suburbs, regional roads, specialized institutions and remote extraction |

The simulation does not need every cell loaded or updated every tick. It must
be able to persist and revisit any developed cell and prove all flows between
active and remote areas.

### Spatial simulation tiers

- **Active:** visible chunks and chunks containing immediate danger use full
  cell navigation, reservations, work, needs, animals, and animation state.
- **Warm:** nearby occupied chunks retain exact actors, inventories, routes,
  jobs, and facilities but update on coarser deterministic intervals.
- **Cold:** distant resource and travel chunks retain exact conserved state and
  resolve only scheduled events such as growth, depletion, migration, arrival,
  and weather. They may not create resources or skip travel.
- Moving between tiers must produce the same result as full-detail simulation
  at declared checkpoints. Save/load preserves tier, scheduled events, and
  every entity location.

Unity should eventually receive chunk deltas and level-of-detail summaries
rather than a complete multi-megabyte cell snapshot every simulation beat.

## Regional resources

### Land and renewable resources

- Fields, gardens, orchards, pasture, and managed woodland occupy designated
  land cells with fertility, moisture, access, ownership, and seasonal state.
- Trees and forage are finite individuals or cohorts. Harvest reduces the
  local supply; planting, succession, and regrowth take believable time.
- Wildlife belongs to regional populations with habitat, sex/age structure,
  births, deaths, migration, carrying capacity, and hunting pressure.
- Hunting creates expeditions with routes, search time, risk, carcasses, field
  dressing, and return hauling. Animals do not respawn beside the town.

### Minerals and extraction

- Prospecting reveals deposits with material, grade, estimated volume, depth,
  access difficulty, and uncertainty.
- Surface stone and clay lead to pits or quarries; ore and coal may require
  shafts, supports, drainage, ventilation, hauling, and safety work.
- Deposits deplete. A forge cannot consume generic metal disconnected from a
  mine, salvage source, or merchant import.
- Extraction sites may be remote holdings connected by roads, carts, guards,
  camps, and scheduled deliveries rather than squeezed into the civic core.

## Person, family, and life-course model

Every resident remains one persistent person rather than a population counter.
The person record gains:

- birth date, chronological age, life stage, biological/reproductive state,
  health, mobility, and expected care needs;
- household, parents, children, siblings, guardians, partner history, and
  lineage references;
- personality/values, preferences, skills, education, profession, beliefs,
  memories, possessions, obligations, and civic memberships;
- physical needs plus social connection, belonging, recreation, privacy,
  purpose, stress, grief, and perceived safety;
- arrival, birth, departure, death, and household-history events.

Life stages include infant, child, adolescent, adult, and elder. Exact year
lengths and aging speed remain a product-tuning decision, but stage transitions
must be real, scheduled, save-stable events. Children require guardianship,
food, shelter, care, safety, play, and education before apprenticeship or adult
work eligibility.

## Relationship graph

Relationships are a sparse graph, not an all-pairs matrix and not generated
flavor text.

Immutable or historical edges record kinship, parentage, guardianship, former
households, mentorship, and major shared events. Mutable directed measures
include familiarity, trust, affection, respect, attraction, fear, obligation,
and grievance. Friendship, rivalry, romance, partnership, and estrangement are
derived from reciprocal measures, memories, compatibility, and behavior.

Relationships change through real encounters:

- living, eating, working, learning, worshipping, celebrating, traveling, or
  enduring danger together;
- aid, gifts, fair exchange, leadership decisions, neglect, conflict, injury,
  crime, death, and mourning;
- available time, proximity, schedule overlap, personality, existing bonds,
  privacy, and community rules.

The scheduler evaluates plausible nearby contacts and scheduled social events;
it does not scan every resident pair every tick.

## Partnership and population growth

- Dating or courtship requires mutual eligibility, interest, opportunity, and
  continuing interactions. One favorable roll cannot create a partnership.
- Partnership, marriage, cohabitation, separation, and household formation are
  explicit events governed by the settlement's culture and player policy.
- Conception requires an eligible mutually consenting partnership or another
  declared family path, followed by pregnancy, birth, recovery, and infant
  care. Adoption and immigration can grow households without pretending to be
  biological birth.
- Parentage, pregnancy, birth, guardianship, and residence capacity must all
  resolve to real entities. No child appears because the town has spare beds.
- Housing privacy, food security, health, workload, safety, culture, and family
  preference influence population growth. Growth can stop or reverse.
- Migration remains independently causal: people arrive for work, safety,
  family, land, faith, trade, displacement, or invitation, and may leave when
  those reasons fail.

## Community and civic cohesion

“Town unity” is a dashboard, not a magic resource. It is derived from auditable
components:

- household stability and cross-household friendship;
- belonging, loneliness, trust, grievance, and unresolved conflict;
- perceived fairness of work, food, housing, justice, risk, and leadership;
- shared institutions, celebrations, worship, markets, schools, defense, and
  mutual-aid events;
- safety, scarcity, inequality, crime, factional pressure, casualties, and
  collective memory.

The summary may report cohesion, solidarity, institutional trust, and social
tension, but tests and player inspection must be able to trace each value back
to people, relationships, events, institutions, and material conditions.
High cohesion is not always obedience; a tightly bonded household or faction
may oppose the reeve.

## Institutions required by growth

As population and territory increase, demand—not a decorative tier unlock—may
justify wells and waterworks, sanitation, schools or apprenticeships, worship,
markets, warehouses, inns, infirmaries, council buildings, courts, fire
response, watch houses, walls, gates, barracks, cemeteries, roads, bridges, and
remote camps. Each institution follows the same need -> proposal -> plan ->
construction -> staffing -> service -> maintenance chain as the forge and farm.

## Verification gates

### Spatial and resource gates

- A camera can pan across multiple chunks and zoom to a regional overview
  without changing simulation state.
- The architect can expand beyond the founding window without colliding with a
  hidden map edge or overwriting resources, roads, districts, or ownership.
- A complete timber, hunting, quarry, and ore chain begins at a finite regional
  source, travels a measured route, and ends in named storage or production.
- Depleted sites remain depleted until a real recovery process occurs.
- Chunk streaming and active/warm/cold transitions are deterministic and exact
  through save/load.

### Demographic and relationship gates

- Every resident has a valid age/life stage, household, origin, guardian when
  required, and sparse relationship references.
- Friendship or conflict requires repeated supporting events; deleting those
  events from a controlled fork changes the derived relationship.
- A partnership cannot form without mutual state and interaction opportunity.
- No birth occurs without a valid family path, gestation or adoption event,
  guardian, household, and safe physical placement.
- Children age through care and education into legal apprenticeships and adult
  work; they never inherit adult schedules or permissions prematurely.
- Death, departure, separation, and migration update households, work,
  relationships, grief, succession, housing, and population exactly once.
- Cohesion changes for explainable reasons and cannot be raised by an arbitrary
  town-level bonus.

### Scale gates

- Natural or scripted fixtures exercise 10, 50, 150, and 400 persistent
  residents without duplicate identities, quadratic relationship scans,
  scheduler collapse, phantom resources, or hidden idle time.
- A multi-year deterministic proof covers births, childhood progression,
  partnerships, household changes, migration, aging, deaths, resource
  depletion, district expansion, and institutional growth.
- The 400-resident load fixture may accelerate demographics, but the canonical
  lineage and causal tests use normal rules and exact save/load state.

## Decisions still requiring playtesting

- calendar scale, season length, pregnancy and childhood duration;
- target upper population and how much distant simulation remains individual;
- partnership, marriage, inheritance, adoption, and immigration policies;
- disease, fertility, mortality, and violence severity;
- chunk activation radii and warm/cold update cadence;
- when the camera transitions from cell view to regional planning view;
- whether remote mines, farms, and hunting camps remain town districts or
  become linked satellite settlements.

These values should be selected through deterministic scenario suites and
watched play, not chosen solely to make growth fast.
