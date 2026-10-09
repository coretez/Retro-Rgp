# Stonebridge logical-town validation

Status: in progress; receipt foundation implemented, regional/social gates planned  
Scope: Stonebridge R8 and every future visitable settlement  
Authority: subordinate to `stonebridge-colony-simulation-spec.md` and maintained
with `stonebridge-colony-roadmap.md`

## Product question

A town passes only when an arriving adventuring party can encounter a place
that continues to make sense without the party present.

The test is not “does every building contain the expected NPC?” It is:

- why was this settlement founded here;
- why does each resident live here;
- what does each resident do, use, need, know, and affect;
- why was each building constructed and why is it in that location;
- where do food, materials, money, labor, and information come from and go;
- what has happened here, what is happening now, and what is likely to happen
  next;
- what changes when a person, building, herd, crop, route, or institution is
  removed;
- what can a visitor truthfully see, ask about, buy, use, help, or disrupt.

Survival and construction are necessary foundations. They are not sufficient
evidence of a rich town.

## Meaning contracts

### Resident meaning receipt

Every persistent resident must expose a state-derived receipt containing:

- stable identity, age/life stage, household, residence, and arrival or birth
  reason;
- primary social role and profession, with secondary or emergency work where
  appropriate;
- work permissions, priorities, skills, tools, workplace, schedule, current
  task, and truthful wait reason;
- real inputs consumed, outputs or services produced, clients served, and
  downstream dependents;
- family, household, professional, civic, and conflict relationships;
- present needs, obligations, possessions, recent meaningful actions, and
  bounded memories;
- a consequence statement derived from the dependency graph: what becomes
  slower, unavailable, unsafe, or understaffed if this person cannot act.

A child, injured resident, elder, guest, pilgrim, or unemployed newcomer may
still be meaningful. The receipt must explain that state; it must not invent a
fake production job merely to keep the actor moving.

### Building and institution meaning receipt

Every building or civic site must expose:

- the need or opportunity that caused its proposal;
- requester, authorizer, architect plan, builders, construction inputs, and
  completion history;
- district, site-selection reasons, access, utilities, hazards, storage, and
  expansion constraints;
- owner or steward, workers, users, opening policy, maintenance state, and
  sleeping policy where relevant;
- physical inputs, outputs, inventory, service events, and destinations;
- recent utilization and the inspectable reason if it is idle, seasonal,
  damaged, reserved, obsolete, or awaiting staff;
- the services or production chains that degrade when it is unavailable.

A forge does not justify a smith, and a smith does not automatically justify a
forge. The resident's skill, local demand, material supply, authorization,
construction, and continued operation must form one traceable causal chain.

### Town meaning receipt

Each town must expose a compact state-derived account of:

- founding cause, geography, water, roads, local resources, and hazards;
- households, population structure, governance, laws, work coverage, and
  unresolved labor needs;
- food, storage, trade, production, health, hospitality, defense, burial, and
  religious or civic services;
- imports, exports, shortages, reserves, merchant relationships, and route
  dependencies;
- districts, important buildings, travel paths, future plans, and current
  projects;
- important births, arrivals, departures, deaths, harvests, shortages,
  attacks, construction, trade, and leadership decisions;
- current opportunities and problems that could matter to an adventurer.

Every claim in the receipt must cite live entity IDs, event IDs, quantities, or
derived spatial evidence. Generated prose may summarize those facts but may not
create facts.

## Causal generation rule for future towns

Future towns are generated in this order:

1. geography, routes, resources, climate, hazards, and regional demand;
2. founding cause and initial households;
3. viable food, water, shelter, storage, governance, and security strategies;
4. work and service demand;
5. residents whose existing skills, relationships, migration reasons, or
   training plans can answer that demand;
6. specialist proposals, architect plans, physical construction, and operation;
7. accumulated history, current pressures, and visitor-facing opportunities.

The generator may leave a need unmet. It must represent the shortage, vacancy,
abandoned facility, training plan, import dependency, or recruitment request.
It may not spawn a decorative person solely because a room wants an occupant.

## Semi-open scale and social truth

The camera is an observation window, not the settlement boundary. The
[semi-open growth and social simulation contract](stonebridge-semi-open-growth-design.md)
defines persistent chunks, regional resource flows, population growth, life
stages, relationships, household change, and civic cohesion for R8.

A logical town may occupy a dense civic core, farm belt, managed woods,
hunting grounds, mines, roads, and remote holdings across multiple simulation
tiers. Off-screen work remains real travel and conserved work. Likewise, a
resident's friendship, family, romance, grievance, or civic belonging must
come from shared state and events; prose and population targets cannot create
social facts.

## Test layers

### L0 — Entity and reference invariants

Run on every relevant test and save/load:

- every resident belongs to exactly one household and has a valid residence or
  explicit housing state;
- every resident has a valid birth date, chronological age, life stage, origin,
  and guardian when their stage requires one;
- parentage, partnership, pregnancy, adoption, guardianship, and succession
  references are reciprocal where required and backed by retained events;
- every profession, workplace, tool, relationship, memory, job, inventory,
  grave, plan, and event reference resolves to a live or historically retained
  UUID;
- every loaded cell resolves through a stable world coordinate and chunk; the
  observer window never acts as a world wall or changes state when moved;
- every item quantity exists in exactly one authoritative location;
- every building and derived service names its physical evidence;
- every meaning-receipt statement has supporting state evidence;
- no visitor dialogue or town summary claims a person, stock, service, event,
  or relationship that does not exist.
- relationship labels and civic-cohesion summaries cite the encounters,
  memories, material conditions, and institutions from which they derive; no
  arbitrary global bonus may create them.

### L1 — Vertical production and service proofs

Exercise complete state chains rather than isolated counters:

- seed -> planted crop -> growth -> field harvest pile -> haul -> granary ->
  mill/kitchen -> meal -> named consumer;
- pasture feed + eligible bull and cow -> conception -> gestation -> calf ->
  juvenile -> adult, with lineage and husbandry work;
- ore/metal + fuel -> forge storage -> smith work -> tool -> named user ->
  repair or production benefit;
- illness or injury -> diagnosis -> medicine source -> healer -> treatment bed
  -> recovery or death;
- death -> corpse -> grave designation -> digging -> hauling -> burial -> marker
  and household memory;
- merchant arrival -> finite inventory and money -> negotiated trade -> changed
  village and merchant stock -> departure;
- threat report -> watch response -> muster/equipment -> resolution -> repair,
  injury, burial, or changed security plan.

Each proof fails on a skipped movement, free input, remote transformation,
phantom storage, invented worker, invalid reference, or missing consequence.

### L2 — Resident-purpose audit

Measure complete schedules, not a single final snapshot.

Hard gates:

- 100% of persistent residents have a resident meaning receipt;
- 100% of adults have a primary role or an explicit unemployed, retired,
  incapacitated, visiting, caregiving, training, or other supported state;
- every scheduled work tick is working, traveling for work, performing a
  declared need activity, or waiting for a named reason;
- zero unexplained idle ticks;
- no capable adult remains underemployed for more than two consecutive workdays
  without a visible labor-surplus issue, reassignment decision, training plan,
  or player-visible choice;
- work experience is awarded only by meaningful actions and affects later
  eligibility, speed, quality, yield, waste, or risk.

The report separately measures purposeful work, necessary needs, recreation,
contention, missing inputs, seasonal waiting, unemployment, and avoidable idle
time. A high animation or movement percentage is not a success metric.

### L3 — Facility and spatial-logic audit

For every facility and civic site:

- validate district, access, road/cart route, entrances, work cells, storage,
  fire separation, water, sanitation, noise/smoke, defense, and expansion rules;
- trace its actual worker and user visits over the reporting window;
- require a recent production/service event or a truthful dormant reason after
  its commissioning grace period;
- verify that closing the facility removes or degrades the service instead of
  leaving a duplicate abstract capability active;
- verify adjacency chains such as field -> granary -> mill -> bakery and ore ->
  store -> forge -> tool user with measured hauling cost.

### L4 — Longitudinal town proof

The routine headless gate runs five seeds for at least 30 simulated days. It
must cover multiple crop cycles, merchant opportunities, work schedules,
maintenance, shortages, recovery, and save/load checkpoints. The milestone
gate expands to multiple seasons once seasonal agriculture exists.

Report per day:

- population, ages, life stages, births, pregnancies or adoption processes,
  guardianship, partnerships, household changes, migration, and deaths;
- relationship changes, belonging, loneliness, institutional trust, social
  tension, and the events or material conditions that caused them;
- work coverage and underemployment;
- food days, seed reserve, crop state, herd demographics, and pasture load;
- every storage tier's used, reserved, protected, spoiled, and overflow amount;
- production, service utilization, imports, exports, treasury, and shortages;
- health, safety, deaths, graves, incidents, repairs, and response time;
- district violations, travel cost, facility downtime, and current strategy;
- history events and new resident/building/town meaning-receipt changes.

The proof must fail early with a causal explanation, not only a final score.

### L5 — Counterfactual and recovery tests

Richness is demonstrated when dependencies matter. Starting from the same
snapshot, apply one controlled change and compare it with an untouched control:

| Intervention                                        | Required observable consequence                                                                                                    |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Remove or incapacitate the only miller/smith/healer | The service slows or stops, dependent queues appear, and leadership seeks reassignment, training, trade, or recruitment.           |
| Remove the only mature bull                         | Existing pregnancy may finish, but no new conception occurs.                                                                       |
| Destroy or fill the granary                         | Harvest destinations change, visible overflow/spoilage risk appears, and storage becomes a strategy issue.                         |
| Miss a merchant visit or close the main road        | Imports become scarce, affected recipes block honestly, prices or priorities change, and no stock appears for free.                |
| Lose a crop to weather or disease                   | Food projections fall, emergency forage/hunting/trade may rise, seed and planting decisions change.                                |
| Kill a resident                                     | Their work and relationships cease, a corpse and burial response appear, dependents react, and succession/reassignment is visible. |
| Damage the gate or trigger an attack                | Patrol and response coverage change, guards muster, civilians seek safety, and damage/injuries persist.                            |
| Close the inn                                       | Guest beds, meals, rumors, and trade hospitality become unavailable or move to a real alternative.                                 |

The changed run must differ only through state downstream of the intervention
and named deterministic random streams.

### L6 — Adventurer black-box visit

Spawn a party at a legal town entrance without giving the test privileged
simulation access. Through the same view and interaction contracts available to
the player, the party must be able to:

- find a legal route to food, lodging, trade, healing, leadership, and the town
  exit when those services exist;
- discover who leads, what the town produces, what it imports, what it currently
  lacks, and what recent event residents consider important;
- inspect a resident and learn a truthful role, workplace or supported state,
  household/residence, present activity, and relevant relationship or memory;
- buy, sell, sleep, eat, or receive care through physical inventories,
  facilities, money, schedules, and staff availability;
- observe that a closed, empty, damaged, out-of-stock, or unstaffed service is
  genuinely unavailable;
- receive rumors, requests, or quests only from unresolved state-backed events
  and needs;
- leave a transaction and visit receipt that survives save/load.

Canonical visitor questions form an automated truth test. Every answer must be
supported by the town receipt, and every referenced person, place, item, event,
or relationship must resolve. “I do not know” is valid when the speaker lacks
knowledge; fabricated certainty is not.

### L7 — Watched presentation acceptance

At least one canonical run is watched in Unity at play zoom. A reviewer must be
able to identify, without debug-only overlays:

- homes, workplaces, civic sites, districts, roads, fields, pasture, storage,
  graves, and defensive places;
- adult and juvenile animals, crop stages, stored goods, carried goods,
  construction, damage, and repair;
- whether a resident is traveling, working, waiting, resting, socializing,
  guarding, or responding to danger;
- why a selected resident, facility, stock cell, crop, animal, grave, or plan is
  in its current state.

Screenshots and a short interaction transcript are retained with the proof
report. Asset registration alone does not satisfy this gate.

## Generated-town portfolio gate

Stonebridge is the reference town. A future settlement generator is accepted
only after at least 20 deterministic town seeds pass the invariant and visitor
gates while producing structural variety.

The portfolio must contain multiple founding causes, resource bases, economic
specializations, household structures, layouts, shortages, service gaps, and
histories. Variation in names or coordinates alone does not count. Each town
must remain viable or truthfully distressed according to its own circumstances;
the test must not require every town to contain every profession or facility.

Portfolio reports compare causal fingerprints:

- founding geography and opportunity graph;
- resident-role and dependency graph;
- production, service, import, and export graph;
- district and route graph;
- event-history and unresolved-pressure graph;
- visitor services and adventure-opportunity graph.

Two towns with identical graphs and only renamed entities are one structural
result for diversity purposes.

## Proof artifacts

Every richness run emits machine-readable JSON plus a concise human report:

- pass/fail gates with first causal failure;
- town, resident, and building meaning receipts;
- dependency and resource-flow edges;
- daily ledger and event timeline;
- counterfactual control/difference report;
- visitor questions, answers, evidence IDs, routes, and transactions;
- save/load hashes and deterministic replay hashes;
- watched-run screenshots and review notes where required.

The game inspector should consume the same receipts used by the tests. Tests
must not rely on a private explanatory model that the player cannot access.

## Implementation slices

1. Add receipt schemas and evidence/reference validation without generated
   prose.
2. Extend telemetry with underemployment, facility utilization, client/service
   events, dependency edges, and daily ledgers.
3. Implement R8 storage, agriculture, livestock, burial, security, and master
   planning vertical proofs against those receipts and the regional substrate.
4. Add counterfactual snapshot forks and causal-difference reports.
5. Add life stages, sparse relationships, household evolution, population
   growth, migration, and civic-cohesion receipts and invariants.
6. Add the adventurer black-box visit harness and evidence-backed town brief.
7. Run Stonebridge's five-seed longitudinal, multi-year, scale, and watched
   gates.
8. Reuse the same contracts for the future 20-town generated portfolio.
