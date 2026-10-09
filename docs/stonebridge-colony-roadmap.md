# Stonebridge Colony Simulation Roadmap

Status: R0–R3 and R7 complete; R4–R6 and R8 proper-village work in progress  
Primary reference grammar: RimWorld colony work, hauling, construction, rooms,
needs, schedules, and inspection  
Authority: subordinate to `stonebridge-colony-simulation-spec.md`

Mandatory development method: `stonebridge-behavioral-development-method.md`

## Phase status

This table is the current chat checkpoint and must be updated whenever a roadmap
section is completed or materially re-scoped.

| Phase                            | Status      | Current evidence                                                                                                                                                                                                                                                                                                                              | Next gate                                                                                         |
| -------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| R0 — deterministic proof harness | Complete    | Ten fresh 500-tick runs still match and the deterministic/save-load gates remain green.                                                                                                                                                                                                                                                       | Keep as a mandatory regression gate.                                                              |
| R1 — founding critical path      | Complete    | Five distinct seeds complete the survival core, three family homes, farmstead, kitchen, and every specialist building without resource injection. Full-output forestry now releases its worker and reusable axe so sawing can break the storage cycle.                                                                                        | Keep the five-seed full-town proof as a mandatory regression gate.                                |
| R2 — minimum viable survival     | Complete    | The visible run completed a 2,421-tick post-home window and the strict 2,400-tick proof passed. Checkpoint 42 also makes sheltered sleep outrank standing shelter at night; all nine off-watch founders visibly slept while the guard patrolled.                                                                                              | Keep the watched run and strict telemetry proof as mandatory regression gates.                    |
| R3 — persistent construction     | Complete    | All 12 town objectives finish from physical elements, retain two-exit/access rules where applicable, derive complete buildings only after supported roofs, and pass commissioning plus exact save/load in five full-town runs.                                                                                                                | Keep physical-element, roof, commissioning, and save/load proofs mandatory.                       |
| R4 — food and domestic logistics | In progress | Food planning distinguishes survival and stability reserves. Checkpoint 111 closes the broad founding/life regression at 144/144, including physical farm delivery, simultaneous forestry/sawing, cooked food, bounded storage, and conserved carcass meat.                                                                                   | Complete the watched farmstead and prove sustained harvest, cooking, storage, and consumption.    |
| R5 — scheduler and timing        | In progress | Ordinary work rests at night, interrupted jobs reopen, and checkpoint 111 proves readiness-aware skill selection, helper construction, truthful standby, scheduled governance, guard preemption, and completion of household mourning.                                                                                                        | Prove the same behavior over a watched full-day employment ledger with no long unexplained waits. |
| R6 — readability and pawns       | In progress | Finished buildings retain English captions. Cattle and deer now share the accepted overhead style with original pig, sheep, dog, chicken, wolf, wild-boar, and bear sprites; watched native proof shows the domestic set without the old green ground patch.                                                                                  | Add sex/age variation, animation states, and complete the watched quality gate.                   |
| R7 — release gate                | Complete    | The suite passes 339/339. Five unique towns build all 12 roofed and commissioned objectives, then each survives 2,400 natural ticks with safe needs, valid sheltered sleep, no permanent blocks, bounded storage, visible resources, food provenance, and exact save/load hashes.                                                             | Preserve this matrix; population growth remains disabled until R8.6/R8.7.                         |
| R8 — proper village systems      | In progress | R8.0–R8.3 are complete. Checkpoint 111 closes every current automated R8.4 burial, mourning, carcass, disposition, and persistence proof. Security planning, mustering, armory accounting, training, gatehouse, and palisade contracts remain implemented but still require natural physical completion and operation in the main saved town. | Build and operate every security facility in the main saved town, then complete R8.5–R8.7.        |

## Product gate

Status: the deterministic founding release gate reclosed at checkpoint 55.
The broader proper-village product gate remains open for R4–R6 and R8: deeper
domestic economics, employment timing, final animation/art quality, civic life,
demography, and multi-season growth. Population growth remains intentionally
disabled.

The active rework program is maintained in
`stonebridge-village-strategy.md`.

Stonebridge is complete as a founding colony simulation only when ten founders
can begin without finished buildings, establish physical production and
shelter, and survive repeated deterministic multi-day runs. A green component
suite is necessary but does not satisfy this gate.

The player must be able to explain every important outcome from visible state:

- who selected each job and why;
- which stock was reserved, carried, delivered, consumed, or produced;
- which blueprint, frame, finished object, room, or facility changed;
- why a resident is moving, working, waiting, resting, or blocked;
- why food, shelter, security, or another need is deteriorating;
- what exact prerequisite prevents the next settlement objective.

## RimWorld design principles adopted

Stonebridge does not copy RimWorld content, art, balance, or code. It adopts the
following systemic grammar:

1. Work is capability-limited and priority-driven. Skilled construction,
   hauling, forestry, cooking, growing, and care remain distinct work types.
2. A direct priority may interrupt ordinary work, but autonomous actors retain
   valid jobs instead of reconsidering their purpose every visual frame.
3. Materials move physically from stock to a specific blueprint or frame.
4. Builders add work to supplied objects; project completion never creates
   missing walls, floors, roofs, doors, stock, or furniture.
5. Stockpiles have accepted contents, capacity, position, and priority.
6. Rooms, shelter, beds, storage, and facility readiness emerge from physical
   objects and access rather than project metadata.
7. Food, shelter, and security are the first survival dependencies. A colony
   that leaves those needs critical has failed even if jobs continue running.
8. Inspection exposes the actual object, worker, reservation, material,
   progress, blocker, and available player order.

Reference behavior:

- <https://rimworldwiki.com/wiki/Work>
- <https://rimworldwiki.com/wiki/Orders>
- <https://rimworldwiki.com/wiki/Hauling>
- <https://rimworldwiki.com/wiki/Work_To_Build>
- <https://rimworldwiki.com/wiki/Stockpile_zone>
- <https://rimworldwiki.com/wiki/Room>
- <https://rimworldwiki.com/wiki/Roof>
- <https://rimworldwiki.com/wiki/Needs>

## Current recovery baseline — 2026-09-28

- The complete component suite passes 215 tests.
- The farmstead completion gate is intermittent when run independently.
- A three-day founding audit can end with only the lumber yard complete.
- The fixed farmstead site can conflict with existing village terrain.
- All ten founders can remain homeless with fatigue at zero and safety near ten.
- Job posting, blocking, reopening, and cancellation churn is excessive.
- The existing audit misreports fatigue and does not summarize survival.
- Unity normal movement animates for 0.28 seconds on a 0.75-second tick cadence,
  producing a visible move-stop rhythm.
- The visual registry contains many provisional or missing runtime assets.

## Implementation progress — checkpoint 1

Completed in the first recovery slice:

- canonical run identities can be supplied by the proof harness;
- generated job and reservation identities are deterministic;
- the audit reports actual needs plus food, shelter, bed, facility, and active
  priority state;
- two independently created 500-tick canonical runs are regression-tested for
  identical audits;
- unfinished construction keeps its matching door or pasture gate open, removing
  the farmstead access deadlock;
- the complete suite passes 216 tests and the 25-test founding suite passes in
  three consecutive fresh processes.

The current 500-tick audit still reports all ten founders homeless. That is now a
visible product failure rather than a hidden test success, and it is the next
critical-path target in R1 and R2.

## Implementation progress — checkpoint 2

Completed in the architect, founding-chain, and initial-survival slice:

- the architect searches translated candidates in deterministic Manhattan-ring
  order instead of accepting only one fixed coordinate;
- complete building and enclosure plots are reserved against later projects;
- chosen sites and summarized rejection reasons persist in development state and
  survive save/load;
- construction always targets the selected door rather than a stale template
  coordinate;
- a hands-off canonical run completes the lumber yard and farmstead within the
  declared 12,000-tick bound;
- the proof accounts for every required construction unit, preserves axes, saws,
  and hammers, and rejects negative stock;
- redundant in-flight deliveries return their cargo instead of leaving surplus
  material on a completed element;
- an element cannot receive labor until its own material requirement is met;
- each founder has one UUID-backed canvas bedroll under temporary weather cover;
  these sleeping places are physical, walkable, uniquely assigned, and usable
  for fatigue and safety needs without granting residence capacity.
- the complete regression suite passes 221 tests; the hands-off chain test takes
  roughly 100 seconds in the full parallel run, confirming the need for later
  scheduler and performance work.

### Stop-point evaluation

What worked well:

- The proof was strong enough to discover two conservation defects rather than
  merely checking facility flags.
- Site choice is deterministic, inspectable, reserved, and compatible with
  save/load.
- Temporary survival infrastructure improves fatigue and safety while retaining
  truthful `homeless` state and zero permanent bed capacity.

What remained weak at this checkpoint:

- R0 was not complete: the harness compared only two short fresh runs and the
  CLI did not yet fail automatically on unmet gates. This was closed in
  checkpoint 3 below.
- The R1 proof is one canonical run, not yet a seed matrix, and its 12,000-tick
  budget is long enough to hide scheduling inefficiency.
- Job blocking, reopening, suspension, and idle ticks remain noisy even though
  the production chain completes.
- R2 has only temporary bedrolls. No permanent home completes in the canonical
  proof window, and multi-day survival is not yet green.
- Site search relocates whole authored plans but does not yet expose player
  approval, alternative ranking, terrain clearing cost, or expansion policy.

### Plan reevaluation

At checkpoint 2, the R0–R7 order remained valid, with three clarifications:

1. Finish the remaining R0 harness work before calling any later phase
   release-ready, even though R1's canonical gate now passes.
2. The next implementation slice stays in R2 until one permanent house is built
   naturally and all ten founders maintain food, sleep, and safety for one day.
3. Scheduler churn and proof-run performance are measured during R2 and fixed in
   R5 unless they prevent the R2 gate; correctness blockers are fixed immediately.

## Implementation progress — checkpoint 3

Completed in the R0 proof-harness closure slice:

- ten independently created canonical founding worlds advance through ticks 0,
  100, 250, and 500;
- every checkpoint compares the complete audit plus separate hashes for material
  ledgers, current and historical assignments, construction order, resident
  needs, and final outcomes;
- the run recorder accounts for produced and consumed material, job blocking and
  cancellation reasons, congestion events, construction order, and purposeful,
  blocked, and idle actor-time;
- the audit CLI evaluates survival thresholds, sleeping capacity and assignment,
  material non-negativity, and optional required facilities;
- an unmet gate returns exit status 1 with machine-readable failure reasons;
- `npm run audit:village:proof` executes the canonical ten-run proof;
- the complete regression suite passes 225 tests with no failures.

The 500-tick canonical baseline is identical across all ten runs. It records
68.92% purposeful actor-time, 31.08% idle actor-time, no blocked actor-time or
congestion, four `construction_material_pending` transitions, 124 assignments,
19 completed construction elements, 146 timber logs and 3 raw fish produced,
and 95 timber logs consumed.

### R0 closure evaluation

What worked well:

- The proof creates fresh worlds, so deterministic identity generation and
  initialization are tested rather than bypassed through cloning.
- Independent hashes identify whether a divergence came from materials,
  assignments, construction sequence, needs, outcome, or broader state.
- The CLI is useful both interactively and in automation: its JSON explains a
  failure and its process status enforces it.
- Telemetry turns the known scheduler concern into a measured baseline instead
  of a qualitative complaint.

Current limits:

- R0 proves one canonical seed for 500 ticks. Seed diversity, a full-day bound,
  repeated multi-day runs, and save/load checkpoint matrices remain R7 work.
- Exact hashes intentionally flag every state change; an approved simulation
  design change will require reviewing and accepting a new baseline.
- The 31.08% idle share is now visible but is not itself an R0 failure. Its cause
  and acceptable budget belong to R5 unless it blocks R2 survival.

### Plan reevaluation after R0 closure

The R0–R7 sequence remains sound. R0 is complete, R1's canonical gate remains
passed, and implementation should now return to R2. The next product gate is to
complete the first permanent home naturally and prove that all ten founders keep
food, sleep, and safety above the danger threshold for one full 2,400-tick day.
R3 through R6 remain partial foundations, and R7 remains deliberately unopened
until the survival and persistence layers are complete.

## Implementation progress — checkpoint 4

Completed in the permanent-home and one-day survival slice:

- explicit construction elements now include an interior floor and supported
  roof as well as 71 wall sections, one door, and 11 fixtures;
- the first family home completes naturally at tick 32,989 with all 85 elements
  material-backed and complete;
- the finished home has four reachable beds, four chairs, a table, kitchen,
  storage, one floor, and a roof referencing 72 physical wall/door supports;
- newly completed worksite doors and the physical/derived pasture gates remain
  synchronized and open, preventing builders and herders from being sealed in;
- large-area floor and roof work uses an accessible door-side work position, so
  a completed hearth cannot make the final roof delivery unreachable;
- project-assist ownership can no longer conflict with the current parent
  builder, inherit a duplicated schedule modifier, or preempt the wrong actor;
- explicit run IDs now deterministically derive the hero, companions, and
  starting equipment as well as colony identities;
- vulnerable founders receive the first permanent beds by safety and combined
  survival deficit rather than arbitrary UUID order;
- warning-level survival arbitration selects the lowest current hunger,
  fatigue, or safety value and can interrupt another long survival action before
  either need reaches danger;
- the canonical proof starts its measured day at tick 32,989 and completes it at
  tick 35,389 with minima of 52.554 hunger, 52.26 fatigue, and 58.43 safety;
- all ten founders retain valid, sheltered sleeping assignments on every one of
  the 2,400 measured ticks;
- the meal ledger balances exactly: 19 prepared meals at the start, 10 produced,
  6 consumed through actor/source-linked events, and 23 remaining;
- two separate 15,000-tick processes produce the same complete village audit
  hash, and the ten-run R0 proof still reports zero mismatches;
- the complete regression suite passes 226 tests with no failures.

### R2 closure evaluation

What worked well:

- The proof rejected status-only housing and forced every floor, roof, support,
  fixture, sleeping location, meal, and need value to have inspectable evidence.
- Long deterministic traces exposed four real systemic defects: duplicated gate
  closure, parent/assist ownership conflict, an unreachable roof anchor, and a
  rest-block survival priority inversion.
- The final margin is substantial rather than marginal: the lowest measured
  need is more than 27 points above the declared danger threshold.
- The survival behavior remains hands-off. No worker, material, meal, need, or
  construction element is injected or teleported by the proof.

What remains weak:

- The proof is canonical, not a seed matrix, and covers one post-home day rather
  than repeated multi-day sustainability.
- Six founders still use temporary canvas shelters after the first four-bed home;
  later homes and household expansion remain R3/R4 work.
- The 35,389-tick proof is slow in wall-clock time. Its correctness is now green,
  but pathfinding, job churn, and test cost are material R5 debt.
- Residence and facility completion still retain some project-level derived
  effects; full continuous derivation from primitives is not yet complete.
- Social and morale can reach zero without failing this narrowly defined survival
  gate. Their long-run consequences belong in the expanded R4/R7 scenarios.

### Plan reevaluation after R2 canonical closure

The R0–R7 sequence remains valid, with the active frontier moving to R3:

1. R0 remains complete; keep both the short ten-run proof and long cross-process
   reproducibility check as foundations for the eventual R7 matrix.
2. R1 remains canonical-gate passed. Seed diversity is still deferred to R7,
   while any new R3 construction change must preserve the hands-off chain.
3. R2 is canonical-gate passed. The 2,400-tick survival audit is now a mandatory
   regression gate, not an open implementation objective.
4. R3 is next: remove remaining whole-project compatibility effects and derive
   rooms, shelter, residence/facility readiness, damage, repair, cancellation,
   and deconstruction continuously from persistent primitives.
5. R4 remains partial: extend the proven one-day food ledger into repeated
   multi-day growing, storage, cooking, and household logistics without rescue
   stock.
6. R5 remains partial and now has measured urgency: optimize the long proof,
   reduce scheduler churn/idle ambiguity, and fix presentation cadence without
   weakening R0–R2 correctness.
7. R6 remains partial; authoritative pawn animation and asset closure follow the
   stable simulation contracts.
8. R7 remains unopened until R3–R6 are complete, then expands the canonical
   proofs across seeds, save/load points, watched Unity replay, and performance
   budgets.

## Implementation progress — checkpoint 5

Completed in the R3–R5 construction, domestic-logistics, and scheduler slice on
2026-09-29:

- rooms, shelter, buildings, residences, pastures, occupancy, and facility
  readiness are continuously rederived from serviceable walls, doors, floors,
  supported roofs, gates, fences, and fixtures;
- damage removes unsupported derived facts, repair restores the same identities,
  deconstruction records terminal evidence, and prioritize/suspend/resume/cancel
  controls target exact projects;
- save/load preserves the already-derived architecture without changing
  diagnostic ticks, while legacy saves still migrate through derivation;
- the founders physically construct a sheltered inn kitchen with hearth,
  pantry, table, walls, door, floor, and roof;
- food batches retain origin, stock location, transformations, source batches,
  and final consumer; cancelled hauling restores the exact batch instead of
  inventing reconciliation stock;
- field preparation, sowing, timed growth, harvest, seed saving, cooking, meal
  placement, and eating form a complete loop for grain and vegetables;
- the sole farmer is protected from construction-assistance starvation after
  the farm opens, while the founding herder-builder carries continued building
  work;
- the R4 three-day measured window begins after the physical inn is complete,
  removes edible founding rescue stock, completes both crop cycles, produces 33
  meals, consumes 22, ends with 21, and passes a 230-batch/770-transaction
  provenance audit;
- the same R4 run keeps hunger, fatigue, and safety above 39 without treating
  those values as the R4 gate; repeated survival remains an R7 matrix concern;
- sleep restores fatigue progressively while rest is actually performed, so an
  interrupted long sleep retains honest partial benefit;
- A* prioritization preserves weighted routing while reducing the long-run
  search cost; forestry candidates are cached and exhausted candidates are
  removed rather than rescanned every tick;
- terminal job and reservation history is bounded, valid routes are retained
  across movement, suspended work is safely reopened when its interrupter is
  gone, and every non-working tick receives an explicit explanation;
- a 2,400-tick R5 day produces the same complete state hash in headless, normal,
  and fast modes, reports zero unexplained ticks, no block longer than 32 ticks,
  and approximately 1,344 headless ticks per second on the validation host;
- Unity normal/fast cadence now interpolates continuously between authoritative
  positions; Unity 6000.5.10f1 imports and compiles both runtime and editor
  assemblies successfully in batch mode;
- the R0 ten-run/500-tick proof still has zero mismatches, and the R2 measured
  day passes after the final scheduler changes with minima of 39.21 hunger,
  39.86 fatigue, and 51.09 safety.

### R3–R5 evaluation

What worked well:

- Primitive-derived architecture made damage and save/load tests much stronger:
  no facility or residence can survive after its physical evidence is removed.
- The domestic proof found two genuine systemic problems—seed competition and
  construction starving the only farmer—rather than accepting aggregate food
  totals.
- Profiling the long run found the coupled forestry/routing slowdown. The fix
  both restored natural inn completion and more than doubled the short R5
  benchmark compared with the earlier 618-tick/second result.
- The scheduler proof now distinguishes purposeful routine movement, useful
  rest, contention, missing input, schedule policy, and truthful idleness with
  no unexplained remainder.

Remaining limits and revised plan:

1. R0–R5 canonical gates are passed, but only R0 is considered broadly complete;
   the seed matrix and save/load matrix remain R7 acceptance work.
2. R6 is now the active frontier. It should consume the stable primitive,
   lifecycle, item, actor-action, and cadence contracts rather than add new
   simulation authority in the renderer.
3. R7 remains unopened until R6 closes. Its watched Unity replay is still
   required even though batch compilation and static cadence validation pass.
4. Six founders may still rely on founding shelters after the first home. More
   housing is permitted to develop naturally, but population growth remains
   disabled until the repeated R7 survival matrix passes.
5. Stockpile filtering and priority controls are still thinner than the adopted
   RimWorld design grammar and should be completed before or during R7.

### Phase-5 code review closure

The post-R5 review is complete. It concentrated on material and food
conservation, deterministic routing, suspended-job recovery, save/load-derived
state, proof failure behavior, and simulation/presentation separation.

Two defects found during review were corrected before closure:

- cancelling production with multiple food inputs drawn from the same stockpile
  now restores each exact provenance entry once instead of removing all matching
  entries after the first restoration;
- a domestic proof that never enters its measured window now reports a numeric
  zero need floor and an explicit failure instead of serializing an infinite
  minimum as `null`.

Regression coverage includes the multiple-input cancellation case. The final
suite passes 234 of 234 tests, formatting and whitespace validation pass, Unity
6000.5.10f1 batch compilation passes, the ten-run R0 proof has zero mismatches,
and the final R2, R4, and R5 canonical proofs pass. No remaining high- or
medium-severity code finding blocks the R5 checkpoint.

Residual acceptance risks are deliberately assigned to later phases: the exact
canonical replay still needs a watched Unity run in R7, seed and save/load
matrices remain R7 work, stockpile policy is not yet RimWorld-depth, and R6's
authoritative modular pawn presentation is incomplete.

## Implementation progress — checkpoint 6

R6 and R7 closed on 2026-09-30 after the readability pass, watched Unity
acceptance replay, full release matrix, and post-release code review.

R6 closure:

- the visual registry now covers actors, animals, crops, trees, materials,
  walls, floors, roofs, fences, doors, gates, fixtures, signs, and terrain with
  explicit sprite or procedural acceptance, orientation, lifecycle, and damage
  states;
- Unity renders physical stock, construction stages, crops, surfaces, damage,
  connected structures, and cached modular pawns with facing, work, and carrying
  cues from authoritative simulation state;
- the accepted overhead pawn is original generated work, and its prompt,
  provenance, runtime path, and visual limitations are recorded in the visual
  inventory;
- 26 accepted sprites remain under runtime `Resources`; 21 rejected or legacy
  source images are preserved outside runtime packaging for reference;
- the visual audit reports zero provisional sprites, missing runtime keys,
  missing accepted assets, unaccepted runtime keys, or unreferenced runtime
  files;
- the exact canonical Unity run was watched from founding camp through tick
  33,007. Its mature overview exposed 751 accepted visual cells across actors,
  crops, doors, fences, fixtures, floors, materials, trees, and walls with no
  diagnostic fallback.

R7 closure:

- all ten unique seeds naturally complete a permanent home and then survive the
  measured 2,400-tick day; home completion ranges from tick 27,023 to 29,832
  and total proof completion from tick 29,423 to 32,232;
- the ten-run global need minima are 35.88 hunger, 39.63 fatigue, and 39.44
  safety against a danger threshold of 25; every sleeping location and resource
  visibility audit passes;
- three long runs spanning 3, 3, and 5 measured days complete at ticks 44,683,
  46,199, and 61,311. All sustain positive meal balances, complete grain and
  vegetable cycles, preserve provenance, expose all resources, and report zero
  unexplained ticks;
- blueprint, delivery, frame, sleep, harvest, and meal states captured at ticks
  1, 224, 267, 677, 12,032, and 603 replay for 120 ticks with identical direct
  and restored hashes, identities, material ledgers, and provenance;
- headless, normal, and fast schedulers produce the same state hash, no
  permanent blocks, and no unexplained ticks. The validation host sustained
  1,769 ticks per second against the 250-tick minimum;
- the complete release audit finishes in 312.7 seconds with 94,770,016 bytes of
  heap growth, below the 512 MiB budget, and records zero live-tick database
  writes because persistence stays in the in-memory engine;
- population growth is explicitly disabled. Enabling it requires a new survival
  and capacity gate rather than inheriting this founding-colony acceptance.

### Post-R7 code review closure

The final review concentrated on deterministic survival across seeds,
construction access, specialist scheduling, resource visibility, save/load,
runtime asset authority, viewer memory behavior, and proof strictness. It found
and corrected these release-relevant defects before closure:

- mature Unity resume no longer sends and reparses a multi-megabyte state
  through the control protocol merely to recover the run identity;
- the protected-farmer policy now waits for both crop cycles and sufficient food
  reserves without preventing farmstead completion or permanently starving
  later construction;
- construction delivery and labor target reachable inward cells, including
  diagonal corner access, so a nearly enclosed inn cannot seal its last wall
  away from builders;
- when residents share a cell, Unity projection prioritizes the actor carrying
  a physical item, preventing a non-carrier from hiding transported resources;
- procedural fallback suppression now applies only to accepted procedural
  states or real overlays rather than every entity identity;
- the visual audit rejects any unaccepted runtime key, and legacy source art no
  longer enters the player build;
- release seeds are unique, population-growth state is asserted, scheduler
  throughput has an enforced floor, and carried/co-located resources are part
  of the release visibility gate.

The post-review regression suite passes 247 of 247 tests. The R0 proof, visual
audit, formatting, whitespace validation, Unity 6000.5.10f1 batch build, watched
replay, and complete R7 release audit all pass. No remaining high- or
medium-severity finding blocks the founding-colony release gate.

Remaining work is deliberately non-blocking depth rather than an incomplete
phase: stockpile filters and priorities are not yet RimWorld-depth; the 21
legacy/source images are retained outside runtime resources; animals and pawns
can receive more bespoke directional animation; and a mature full web state
response remains large even though the Unity resume path no longer requires it.

### Phase status after checkpoint 6

R0, R1, R2, R3, R4, R5, R6, and R7 are complete. Future simulation work starts
from a new roadmap or explicitly reopens one of these gates; it must not silently
weaken the maintained proof suite.

## Implementation progress — checkpoint 7 / acceptance reset

Direct user review of the built player on 2026-09-30 invalidated parts of the
checkpoint-6 acceptance claim:

- the generated overhead pawn plus procedural skin, hair, and outfit ellipses
  collapsed into unreadable pot-like figures at gameplay scale;
- actor interpolation exposed a green destination cell because occupant type had
  replaced underlying road terrain;
- every tree exposed a dark rectangular base because `outdoor_tree` was used as
  both vegetation identity and ground color;
- stock zones did not visibly show allowance or quantity, multiple logical piles
  shared one coordinate, and the live run contained 30 meals in a pile reporting
  capacity 12;
- the reeve attributed automatic priorities but did not exercise meaningful
  leader authority, while the “architect” was an immediate site-selection
  function rather than a resident actor.

The first graphics repair restores role-specific civilian, guard, official,
shopkeeper, and four party sprites; removes the procedural pawn ellipses;
projects ground independently beneath trees and actors; outlines designated
stock cells; and displays aggregate used/capacity labels plus inspector detail.
The focused Unity and registry suite passes 22 of 22 tests, the visual audit
accepts 34 runtime sprites with no missing or unregistered keys, and the macOS
player rebuild succeeds. A watched smoke pass confirms that trees no longer
carry dark tile rectangles, moving residents retain their role sprites, and the
overview uses compact, staggered stock quantities instead of overlapping full
capacity labels. The road-under-actor protocol assertion also passes. This is a
repair checkpoint, not R6 closure: directional motion, work animation,
construction stages, close-scale readability, and a longer watched matrix are
still required.

The replacement organization and implementation program is maintained in
`stonebridge-village-strategy.md`. R1, R3, R4, R6, and R7 are reopened. R0,
R2, and R5 remain complete regression foundations, not proof that the strategic
village product gate has passed.

The strategy now also maintains the canonical facility roster and dependencies:
homes, water, farms, granary/storehouse, cookhouse, mill, bakery, barns, stables,
forge, trade workshops, general store, inn, civic and care buildings, security,
and road/logistics infrastructure. A retail store is explicitly distinct from
bounded physical storage.

“Farm” now means the full agricultural holding: crop fields for grain,
vegetables, fruit, and seed plus livestock systems for meat, milk, eggs, wool,
hides, breeding, and draft power. The revised strategy also requires civilian
learning by doing. Cultivation and animal husbandry are separate skills, while
all meaningful village work earns persistent, inspectable experience under the
same progression principle used by combat.

## Implementation progress — checkpoint 8 / strategy authority begins

V0 and V1 implementation began on 2026-10-01. The persisted village development
state now contains a strategy board with specialist or civic proposals, reeve
decisions, material and labor budgets, UUID-backed commissions, and named leader,
requester, operator, foreman, builder, hauler, and supplier assignments. Active
work orders and their posted jobs carry proposal, decision, commission, and
allowed-crew identities; the scheduler rejects residents outside the assigned
crew even when they otherwise have the capability.

Edda can approve, defer, or reject a proposal with a persisted reason. Automatic
founding approval uses the same decision function rather than bypassing it. A V0
strategy audit rejects missing requesters, decisions, commissions, budgets,
crews, and job lineage. It separately reports the current site plans as
`architect_assignment_pending` instead of claiming V3 exists. The Unity model
and top bar now expose the active leader, priority, proposal decision, and crew
count.

This is partial V0/V1, not phase closure. Player-facing proposal controls, a full
council/strategy panel, budget consumption, commission suspension, and explicit
foreman behavior remain. V3 still owns real architect selection, surveying, and
plan alternatives. R1 remains reopened; all R0–R7 statuses at the top of this
document are unchanged.

## Implementation progress — checkpoint 9 / V1 strategy complete

V1 completed on 2026-10-01. The Unity council screen now exposes every proposal,
its requested lumber and labor budget, the reeve's decision, commission status,
operator, foreman, crew size, live budget use, planning state, and latest foreman
review. The player can approve, defer, or reject undecided proposals and suspend
or resume an approved commission without advancing simulation time.

Commission control is executable rather than decorative. Suspension releases
reservations and carried transfers, pauses its work order, and prevents new
construction, delivery, assistance, or inspection jobs. Resume safely reopens
the same work. Scheduler eligibility enforces the named crew. A named foreman
now interrupts lower-priority work after physical construction progress,
performs a timed worksite review, records completed and material-blocked
elements, and allows the interrupted job to resume. Material and labor use are
measured against physical construction elements; completed commissions migrated
without retained construction history are marked `legacy_untracked` instead of
claiming zero historical use.

Verification at this checkpoint: 252 of 252 automated tests pass, including the
founding production chain and strategy-control regressions; the Unity 6000.5.10f1
macOS player compiles; and a watched live build displays the council with the
operating lumber commission plus submitted farm, home, and kitchen proposals.

R0, R2, and R5 remain complete. R1, R3, R4, R6, and R7 remain reopened for the
same physical-product reasons documented above. The next implementation phase is
V2: demand-driven specialist proposals, revisions, and resubmission. V3 then
replaces the provisional site function with an accountable architect actor.

## Implementation progress — checkpoint 10 / V2 specialist demand complete

V2 completed on 2026-10-01. Stonebridge now evaluates persisted, measurable
facility demand for seven specialist chains: forge/smithy, mill, bakery,
infirmary/apothecary, carpenter's workshop, granary, and public inn. A request is
created only when its named specialist is present, the matching facility is
absent, and every declared threshold is satisfied. Each request records the
evidence values and thresholds plus its expected benefit, acceptable delay,
rejection consequence, rooms, fixtures, storage, utilities, access, safety,
inputs, outputs, staffing, and provisional material/labor request.

The first production dependency is now executable council state rather than a
hard-coded build order. Grain surplus submits a mill proposal. A bakery proposal
does not exist until grain remains available, prepared meals are below the
declared reserve, and the mill chain has been authorized or physically exists.
Likewise, forge demand depends on metalwork supply and a finished-tool shortfall;
the existing established smithy suppresses a duplicate request.

Leader decisions now include `revision_requested`. Deferred, rejected, or
revision-requested specialist proposals cannot be approved stale. The requester
must revise and resubmit, producing a new deterministic UUID-backed revision
linked to an immutable superseded record. Demand, requirements, decisions, and
revision lineage survive save/load and are audited. The Unity council hides
superseded cards, displays specialist/revision/demand evidence, and provides the
request-revision and revise/resubmit controls. Approved V2 commissions stop at
`architect_assignment_pending`; they do not create a blueprint, work order, or
facility before V3.

Verification at this checkpoint: 256 of 256 automated tests pass; the focused
V2 tests demonstrate demand-backed forge and bakery requests and all five other
specialist models; the founding production chain remains green; and the Unity
6000.5.10f1 macOS player compiles successfully.

R0, R2, and R5 remain complete. R1, R3, R4, R6, and R7 remain reopened. The
active frontier is now V3: an actual architect resident, physical surveying,
alternative plans, constraints, bills of materials, plan revision, and leader
selection before any blueprint designation.

## Implementation progress — checkpoint 11 / R1 and V3 complete

R1 and V3 completed on 2026-10-01. Ada Weiss is now an accountable architect
actor with architecture skill, permission, schedule, position, and a named
commission assignment. An approved specialist request creates no blueprint.
Ada must first perform three physical survey jobs. Each persisted alternative
records its exact adapted footprint, access point, road and supply distance,
home fire clearance, tree-clearing burden, rejected placements, score, bill of
materials, labor estimate, and explanation.

The reeve can approve one surveyed site or request a new planning revision
without consuming a simulation tick. Approval persists a separate plan
decision, reserves only the selected footprint, and issues a work order linked
to the original specialist proposal, leader decision, commission, architect
plan, selected alternative, budget, and named common crew. The strategy audit
rejects an unapproved blueprint, a missing selection, or an approved plan that
exceeds its commission budget.

The forge is the first complete vertical slice. Its selected site is physically
cleared by a forester; the resulting logs enter stock; haulers deliver all 281
lumber units to exact elements; common builders complete a door, walls, stone
floor, supported roof, forge, anvil, workbench, fuel store, and material store.
The derived building and facility become complete only from those 51 persistent
objects. The commission then becomes `operating`, working and finished stock
move to the physical forge fixtures, and the smith's weapon job targets the new
forge rather than the former fixed smithy coordinate. The complete state and
all plan identities survive save/load.

Sleeping infrastructure is explicit at both horizons. All ten founders begin
with unique, sheltered, walkable bedroll assignments, while three valid
four-person founder-house plans contain twelve 1×2 physical beds. Existing R2
proofs still require a naturally completed permanent house and a full 2,400
tick day with all ten founders above the food, sleep, shelter, and safety danger
thresholds.

Verification at this checkpoint: 259 of 259 automated tests pass. The focused
R1 vertical confirms every surveyed alternative is within the approved budget,
no blueprint exists before leader approval, every selected-site tree is
cleared, construction material and clearing labor quantities are conserved,
every planned element materializes, the smith receives an operational target,
and the strategy audit has no violation or pending gate. The Unity 6000.5.10f1
macOS player also compiles successfully with the architect plan and
site-approval controls.

R0, R1, R2, and R5 are complete. R3, R4, R6, and R7 remain reopened. The next
strategy phase is V4: finish explicit architect/operator inspection, rejected
work and repair lists, then re-prove commissioning before moving into V5
physical storage zones.

## Implementation progress — checkpoint 12 / physical roofs enforced

Completed on 2026-10-01. Every construction-backed enclosed building now
requires at least one finished roof primitive supported by its serviceable door
and wall shell. A shell without that evidence remains `enclosed`; it cannot
become `complete`, provide a sheltered room, enable residence capacity, or add
its operational facility flag. Damaging a roof immediately removes shelter and
operation, while physically repairing that same roof restores both without
changing building identity.

The previously roofless founding lumber workshop and farmstead barn now contain
explicit timber floor and roof sections with matching material and labor
budgets. Founder homes, the communal kitchen, and the forge retain their
existing physical roof work. Blueprint projection presents overlapping floor
and roof work sequentially at their shared footprint, and completed buildings
publish `roofed` plus their supporting roof evidence IDs.

Legacy saves reopen missing roofs as conserved material-backed construction,
and mandatory roof retrofits outrank new expansion until the existing shelter
is safe. The active colony was advanced and saved at revision 16268 with both
the lumber workshop and farmstead barn physically complete and `roofed: true`.

Verification at this checkpoint: all 262 automated tests pass, including the
71-test architecture, village-development, founding, and release-gate group.
New regressions reject roofless completion, prove roof damage removes shelter
and operation, prove repair restores them, and require roof work in every
current founding and specialist building plan.

Phase status is unchanged: R0, R1, R2, and R5 are complete; R3, R4, R6, and R7
remain reopened. Roof enforcement closes one R3 invariant, but V4 final
inspection and repair-list commissioning remains the next active work.

## Implementation progress — checkpoint 13 / fields and wild-game hunting

Completed on 2026-10-01. The founding farm now owns two visible, field-scale
crop areas rather than point markers: an 84-cell grain field and a 60-cell
kitchen garden. Their cells project the authoritative planted, growing, and
harvestable state while remaining grass terrain underneath. Mature harvests
produce eight grain or six vegetables, and Ada's existing cultivation work
continues to harvest, reserve seed, and replant through the same conserved food
ledger.

Wild game is now persistent simulation state. Four deterministic red deer
occupy edge-of-map home ranges, wander without crossing blocked terrain or
residents, survive save/load, and replenish slowly when the living herd falls
below two. Tomas Venn has an explicit hunting capability and skill. When the
village is below its three-day food reserve, he can select a living deer, travel
to it, complete a 120-minute hunt, remove that exact animal, create four units
of capacity-bounded meat with `hunting` provenance, and gain hunting practice.
The strategy will not hunt below the protected population floor.

The active migrated colony completed that vertical at revision 17804 and was
saved at revision 17839: the herd fell from four visible deer to three, the hunt
job completed, four meat appeared in the 4/12 butchered-meat stock, grain reached
7/24 with a seed-reservation job active, and all 144 crop cells remained visible
(84 growing grain and 60 harvestable vegetables). The reeve now targets thirty
portions for ten founders and raises food above expansion once the farm exists
and the three-day reserve is short.

Verification at this checkpoint: all 264 automated tests pass, including new
field-footprint, wildlife, skill-growth, population-floor, meat-provenance, and
Unity-projection regressions. The macOS Unity player also builds successfully,
with deer rendered as smaller tawny animals rather than cow sprites.

Phase status is unchanged: R0, R1, R2, and R5 are complete; R3, R4, R6, and R7
remain reopened. This closes the first substantial R4 agriculture-and-hunting
vertical. R4 still requires physical hauling, bounded storage zones,
preservation, and repeated seasonal/multi-day production proof.

## Implementation progress — checkpoint 14 / emergency wild forage

Completed on 2026-10-01. The founding map now contains six persistent edible
wild-plant patches: blackberry, rose hip, wood sorrel, dandelion greens, wild
onion, and cattail shoots. Each patch is a UUID-backed world object with an
exact position, species, yield, ripe/depleted state, harvest count, and slow
regrowth deadline. Unity renders the plants as small stems, leaves, flowers, or
berries directly over grass without adding a colored square beneath them.

Foraging is deliberately a starvation buffer rather than a parallel farm.
Only the founding colony authorizes Mei Lin to gather when durable food falls
below one portion per resident. A completed job depletes one exact patch,
creates one or two units of `wild_forage` with `foraging` provenance, awards
foraging practice, and stores the result in a basket capped at eight units.
The basket stops accepting work at four units, patches take 1,200–1,800 ticks
to regrow, and wild forage is excluded from the reeve's three-day production
reserve. If cooked meals run out, a resident may eat forage, but it restores
only half the hunger of a prepared meal.

Verification at this checkpoint: all 266 automated tests pass. Regressions
prove plant projection without terrain blotches, depletion and deterministic
regrowth, the below-one-day authorization boundary, conserved food provenance,
foraging skill practice, the small basket limit, and the half-strength
emergency meal contract. The macOS Unity player builds successfully with the
new procedural plant layer.

Phase status is unchanged: R0, R1, R2, and R5 are complete; R3, R4, R6, and R7
remain reopened. R4 now has farm crops, livestock, hunting, fishing, and
emergency gathering; its next gate remains physical hauling, bounded storage,
preservation, and repeated seasonal/multi-day food-surplus proof.

## Implementation progress — checkpoint 15 / merchant, mill, and field expansion

Completed on 2026-10-01. Stonebridge now has a persisted village treasury and a
finite traveling merchant rather than a periodic resource injection. Cadence
testing compares 14, 18, 21, and 90 days under an explicit assumption that the
village can carry eighteen days of critical import coverage. Eighteen days is
the current recommendation: fourteen adds six annual visits without improving
coverage, while twenty-one days and quarterly visits produce modeled stockout
days. The interval remains policy data so later seasonal trials can replace the
assumption rather than hiding it in scheduler code.

The merchant first arrives after three days, remains for two days, and then
returns every eighteen days. Each visit owns finite stock, coin, arrival and
departure ticks, a map-visible visitor actor, and an immutable transaction
trail. The reeve's initial automatic policy sells only flour above a six-sack
reserve and buys seed, iron, steel, copper, tin, and brass up to explicit
targets while retaining a sixty-copper treasury reserve. Every exchange moves
both goods and coin between exact owners; imported seed and exported flour are
also represented in the food-provenance ledger.

A completed mill now unlocks a real `mill_grain` job. Ada carries two grain
units to the workstation, produces three traceable flour units, and earns
milling practice. No mill means no milling job. Planned western field expansion
is likewise physical: a woodcutter must clear each tree into conserved timber;
only when no tree remains does stump removal prepare the area and create a new
persistent grain plot. The crop scheduler can service multiple plots instead of
silently selecting only the first one.

Phase status is unchanged: R0, R1, R2, and R5 are complete; R3, R4, R6, and R7
remain reopened. This is a substantial R4 trade-and-processing vertical, but it
does not close R4 because shared cell storage, spoilage/preservation, explicit
market controls, and repeated seasonal surplus proof remain outstanding.

## Implementation progress — checkpoint 16 / strategic town proof

Completed in the R3/R4 closure and release-proof slice:

- every specialist project now proceeds through site clearing, material
  delivery, construction, architect inspection, operator inspection, repair
  rejection, repair work, and recommissioning;
- empty cleared ground is a valid deterministic construction target and remote
  specialist sites remain routable across the full settlement;
- temporary log laydown and compact permanent stock cells enforce a shared
  ten-unit allowance with filters, priorities, reservations, visible contents,
  and overflow rather than permitting unlimited stock on one coordinate;
- housing and specialist work budgets no longer strand the founding plan, and
  the bakery is demanded as part of the complete strategic chain;
- save/load preserves the authored door and gate order while appending any
  missing derived entrances, producing an exact post-load town audit;
- the new full-town proof requires all 12 strategic objectives, supported
  roofs, commissioned specialist facilities, ten surviving founders, valid
  sheltered sleep, visible resources, food provenance, unblocked work, valid
  storage, strategy completion, and exact save/load;
- release seed 1 completed qualification at tick 8,945 and then passed a
  natural 2,400-tick day with minimum hunger 66.386, fatigue 75.99, safety 100,
  no invalid sleep, no permanent block, and all ten residents present.

R3 and R4 are therefore complete. R6 remains active for final watched Unity
acceptance of the replacement animals and readability work. R7 remains active
until the 30-line audit, full QA suite, and all five final seeds pass.

## Implementation progress — checkpoint 17 / R6–R7 closure

Completed on 2026-10-02:

- rebuilt and watched the macOS Unity player with readable terrain, pawns,
  roofs, construction, roads, fields, water, and compact per-cell storage
  quantities, with no movement or plant-base green patches;
- replaced the malformed animal presentation with original strict-overhead
  `actor_cow_v2` and `actor_deer_v2` sprites, registered every emitted animal
  state, and archived the superseded cow outside runtime resources;
- passed the runtime visual audit with 35 accepted and referenced sprite
  anchors, zero missing assets, zero provisional assets, zero unaccepted keys,
  and zero unreferenced runtime files;
- found and fixed a seed-dependent construction self-deadlock in which a parent
  project preempted its own helper and then waited for the helper's claimed wall
  section; a focused regression now protects that scheduler invariant;
- passed all five complete town runs at qualification ticks 8,905, 8,891,
  8,966, 8,994, and 9,041 without resource injection;
- every run built three roofed homes with capacity 12 plus the lumber yard,
  farmstead, communal kitchen, granary, stable, mill, forge, carpenter workshop,
  bakery, infirmary, and inn, with every specialist facility commissioned;
- all 50 founder-days stayed above the danger threshold: minimum hunger 66.386,
  fatigue 75.99, and safety 100, with no invalid or unsheltered sleep, permanent
  block, storage violation, hidden resource, provenance failure, strategy
  violation, or save/load mismatch;
- passed 278 automated tests, formatting, `git diff --check`, the visual audit,
  and the 30-line audit over 1,178 named JavaScript/C# functions; the 130
  explicit exemptions are templates or data projections;
- the final code review found no remaining blocking correctness, persistence,
  resource-conservation, scheduler, or rendering defect in the R0–R7 scope.

R0 through R7 are complete. Future population growth, seasons, bespoke
directional animal animation, and additional art polish are post-release work,
not hidden requirements of this gate.

## Implementation progress — checkpoint 18 / outage recovery validation

Validated on 2026-10-03 after the host lost power. A fresh
`stonebridge-release-1` town again completed all 12 roofed and commissioned
objectives without resource injection at qualification tick 8,905, then ran a
natural 2,400-tick day with all ten founders present. Minimum needs were 66.386
hunger, 75.99 fatigue, and 100 safety. The run reported no invalid or
unsheltered sleep, permanent block, storage error, strategy violation, hidden
resource, food-provenance failure, or save/load mismatch.

Phase status remains R0–R7 complete. The power outage stopped the local game
server process but did not damage the workspace, roadmap, Unity build, or
deterministic simulation state.

## Implementation progress — checkpoint 19 / proper-village audit

Audited on 2026-10-03 against a fresh completed `stonebridge-release-1` town.
The town again passed the R7 founding gate at tick 11,305 after its natural
2,400-tick day: all ten founders were housed, all 12 strategic objectives were
roofed and commissioned, both crops had completed harvests, and the storage,
strategy, provenance, resource-visibility, and save/load audits passed.

That result proves a viable founding simulation, not yet a mature village. The
audit found the following post-R7 gaps:

- every founder has a named profession and an allowed-work list, but work
  coverage is incomplete. In a measured domestic day, 27.69% of resident-time
  was idle, principally classified as contention. The reeve has no ordinary
  governance jobs on the job board, while the fisher and herbalist have long
  periods with no available specialist task. A proper village needs a visible
  work ledger that distinguishes employed, scheduled, resting, underemployed,
  and genuinely idle residents;
- grain and vegetable fields physically occupy 84 and 60 cells, but each plot
  advances as one aggregate object. Grain matures in 360 ticks (3.6 simulated
  hours) and vegetables in 300 ticks (3 hours), independent of season,
  temperature, light, fertility, water, disease, or per-cell plant state.
  Harvest output is deposited directly into an abstract destination stockpile
  rather than appearing in the field and being hauled to a selected store;
- storage cells are capped at ten units and visible overflow is audited, so the
  former unlimited-cell failure is closed. However, zones are generated
  automatically from abstract stockpile capacity, may spread in a spiral around
  an anchor without validating terrain or fixtures, and all ground, shelving,
  bins, and specialist stores use the same ten-unit allowance. There is no
  player-drawn zone, storage-tier rule, stack definition, roof/weather effect,
  or truthful hauling choice among competing destinations;
- the herd starts with one adult female and one adult male, but a completed
  `breed_cattle` job creates a calf immediately. It does not require a mature
  bull and eligible cow, conception, pregnancy, gestation, parentage, nursing,
  weaning, or aging. Calves retain the adult 2x1 footprint and the renderer uses
  the same fixed cow sprite size for every bovine;
- the replacement deer asset is a materially better strict-overhead animal and
  is registered in the live renderer. Deer still have one static pose and no
  age or sex variation, but the earlier malformed-deer defect is closed;
- there is no resident corpse, grave, cemetery, burial job, mourning, or burial
  capacity system. Animal hunting can leave a dead animal record, but civic
  death and burial do not exist;
- the architect performs real surveys and compares road distance, lumber
  distance, clearing cost, home fire clearance, and placement conflicts. It
  still plans one building at a time from fixed archetype anchors. There is no
  persisted settlement master plan, district map, civic common, agricultural
  belt, industrial nuisance/fire district, logistics corridor, cemetery,
  military district, defensive perimeter, or reserved future expansion;
- the watchman has a continuous patrol and all guards may use ordinary homes,
  but the town has no watch house, barracks policy, armory, training yard,
  gatehouse, muster point, or measured patrol/response coverage.

R0 through R7 remain complete within their founding-colony acceptance scope.
The next implementation level is R8; none of the findings above are silently
reclassified as already complete.

## Implementation progress — checkpoint 20 / logical-town acceptance

Defined on 2026-10-03 in
`stonebridge-town-richness-validation.md`. The new acceptance model treats a
town as a causal system that exists before, during, and after an adventurer's
visit. It requires evidence-backed meaning receipts for every resident,
building, institution, and town; schedule-wide purpose accounting; vertical
production and service proofs; multi-day and multi-season ledgers;
counterfactual dependency tests; a black-box adventurer visit; watched Unity
acceptance; and, eventually, a structurally varied 20-town generated portfolio.

The central test is consequence, not decoration. A resident is meaningful when
their identity, household, work or supported state, relationships, history, and
dependencies are real—and when their absence produces an understandable change.
A building is meaningful when a real need caused it, people use it, physical
flows sustain it, and its loss removes or degrades a service. Visitor dialogue,
rumors, quests, and town summaries may only describe state-backed facts.

Phase status remains R0–R7 complete and R8 in progress. The R8.1 implementation
gate now begins with receipt schemas and reference validation so every later
storage, agriculture, livestock, burial, security, and planning feature must
prove both mechanical correctness and town meaning.

## Implementation progress — checkpoint 21 / meaning receipts and live inspector

Implemented and watched on 2026-10-03. Every current founder now has a
save-stable, UUID-backed meaning receipt connecting identity, profession,
household, residence, permissions, skills, workplace, current purpose, reason,
schedule, consequence, and source evidence. Completed buildings expose the
need that caused them, their operators, district status, consequence, and
evidence. A town receipt summarizes the founding cause, leader, population,
housing, services, storage overflow, and supporting facts.

Reference validation rejects receipts that claim nonexistent households,
residences, actors, or buildings. The audit reports `foundation`, rather than a
false `complete`, while age/life stage, social relationships, facility
utilization, the settlement master plan, and the visitor truth harness remain
unmodeled.

The rebuilt native Unity client now includes a visible **Town Logic** panel.
It can be opened with `M` even while the simulation is running, pauses the
simulation, and presents resident and building meaning side by side. The live
Stonebridge run displayed 10/10 resident receipts and 3/3 current building
receipts; it truthfully reported four housed founders and the five open model
gaps above.

QA passed 282 automated tests, formatting, `git diff --check`, the accepted
visual-asset audit, a successful native macOS Unity build, and the 30-line
audit over 1,211 JavaScript/C# functions with no violations.

Phase status is now R0–R7 complete and R8 in progress. The completed portion
of R8.1 is the causal receipt/reference foundation and its player-visible
inspector. The next implementation section is physical storage tiers and haul
destination selection, followed by the resident work and underemployment
ledger that closes R8.1.

## Implementation progress — checkpoint 22 / storage-structure separation

Corrected on 2026-10-03 after watched play exposed storage cells sharing the
same world coordinates as completed timber walls. The allocator had only
excluded cells claimed by other storage zones; it did not consider the
architectural world.

Storage reconciliation now reserves completed and planned walls, doors, gates,
fences, persisted fixtures, building perimeters, and pasture perimeters before
placing any stock cell. Existing saves automatically relocate invalid cells
while preserving the zone identity, filters, priority, allowance, stock
quantities, reservations, and zero-overflow result. The storage audit now has a
separate structural-conflict failure list.

The actual resumed Stonebridge save was migrated in memory and verified with
80 visible storage cells, zero wall/door/gate/fence conflicts, no storage
overflow, and a passing storage audit. QA passed all 284 automated tests and
the 30-line audit over 1,216 JavaScript/C# functions with no violations.

Phase status remains R0–R7 complete and R8 in progress. This closes the
structural-separation portion of R8.1; storage tiers, player/architect zone
designation, terrain/road validity, and destination scoring remain next.

## Implementation progress — checkpoint 23 / town observation scale

Corrected on 2026-10-03 after watched play showed that the town camera was
effectively locked. The former 100×60 observation window initialized at almost
its maximum fit, leaving only a few cells of pan range and approximately one
useful zoom-out step.

The native client now receives a 140×84 town window: 11,760 inspectable cells
instead of 6,000. Initial play zoom remains close enough to read residents and
work, while the larger retained map provides meaningful right-drag and
Shift+WASD pan range and roughly 55% more overview zoom. Mouse-wheel zoom now
has equivalent `-` and `+` keyboard controls. Panning near an observation edge
continues to request the next deterministic world window without moving the
party.

The enlarged protocol snapshot is 1,225,446 bytes in the founding fixture and
remains under its explicit 1.35 MB budget. QA passed all 284 automated tests,
the 30-line audit over 1,217 JavaScript/C# functions, and a fresh native macOS
Unity build.

Phase status remains R0–R7 complete and R8 in progress. This checkpoint fixes
observation scale and camera access; it does not claim that the settlement
itself has reached the R8 population, district, or facility-growth gates.

## Implementation progress — checkpoint 24 / semi-open regional growth

Re-scoped on 2026-10-03 after review established that the larger camera window
still treated a camp-scale local map as if it were the settlement world. The
live founding core occupies only about 47×45 cells and contains three completed
buildings, one pasture, ten residents, and a small local wildlife set. That is
valid founding evidence, but it cannot contain believable forestry, hunting,
agriculture, mineral extraction, outlying holdings, districts, family growth,
or a future small city.

The accepted
[semi-open growth and social simulation contract](stonebridge-semi-open-growth-design.md)
now makes the 140×84 projection an observation window over a persistent
chunked region. Regional land, finite resources, travel, and remote holdings
remain spatial and causal while active, warm, and cold simulation tiers bound
cost without inventing stock or skipping journeys. Planning envelopes grow
from a 256×256 founding region through a 1,024×1,024-or-larger small-city
region; those envelopes are load targets and land reservations, not invisible
walls.

The same correction makes residents persistent life courses rather than ten
independent workers. R8 now explicitly includes age and life stage, households
and guardianship, sparse event-backed relationships, courtship and partnership,
pregnancy or adoption, childhood care and education, migration, death, and
derived civic cohesion. These are acceptance contracts, not claims that those
systems already exist.

Phase status remains R0–R7 complete and R8 in progress. The next implementation
section is R8.0: establish regional coordinates, deterministic 32×32 chunks,
streaming and simulation tiers, then reconnect R8.1 storage and work to that
substrate.

## Implementation progress — checkpoint 25 / live deer and R8 truth review

Reviewed on 2026-10-03 in the running native client and live state at about
tick 72,100. R8 is not complete. Two deer remained alive and visible at widely
separated positions near (-54, 14) and (33, 43), so the herd was not literally
extinct. The watched view showed the accepted overhead deer silhouette, but the
runtime still uses one mirrored static sprite with position interpolation and a
small generic movement bob. It has no multi-frame gait, age/sex variation,
alert/feeding/rest poses, or herd motion.

The population behavior failed the ecological intent. The saved state at tick
71,328 contained nine dead deer—three original animals and six migrants—plus
two survivors, and the live run completed another hunt at tick 71,926. Hunting
is allowed when two deer remain, which reduces the population to one. The
replenishment rule then injects a migrant when fewer than two remain. Each deer
also wanders inside its own isolated 11×11 home range, with no social group,
breeding population, seasonal movement, habitat capacity, or response to
hunting pressure. This is an anti-extinction placeholder that can become a
repeating hunt-and-respawn supply, not a validated wildlife system.

R8 must replace that loop with regional habitat populations, sex and age
structure, groups and home ranges, reproduction, births and deaths, migration,
carrying capacity, hunting pressure, scarcity-aware hunting policy, and a
player-visible wildlife ledger. The hunt gate must preserve a viable local or
regional breeding population rather than merely checking a count before a
kill. The watched visual gate must include movement at play speed and group
behavior, not only sprite registration or a still frame.

Phase status remains R0–R7 complete and R8 in progress. The immediate defect
slice is deer conservation and movement truth; the architectural next step
remains R8.0 because regional wildlife cannot be made credible while animals
are confined to independent camera-sized home ranges.

## Implementation progress — checkpoint 26 / fresh household-planned founding run

Started on 2026-10-03 after the Day 31 watched layout showed that aggregate bed
capacity and collision-free anchors did not produce a logical settlement. The
old run was saved for comparison and the native client was switched to fresh
founding run `9a60f5fd-3b24-430b-a7c3-1cdb8e9f7e77`, seed
`stonebridge-r8-fresh-2026-10-03`, at Day 1. The visible simulation remains
active at normal speed for player review.

The first buildout correction is implemented but not complete. Founding state
now persists an approved 256×256 master-plan envelope with civic, farm,
woodland, residential, and logistics districts. Ten compact, growth-capable
household lots replace three oversized generic family-house anchors. The
farmer's lot is explicitly a farmhouse beside the western farm holding, and
new residences reserve themselves for their intended household instead of
filling spare beds with unrelated residents. The farm commission now contains
physical gated boundaries around both crop fields as well as the cattle
pasture.

Focused architecture, household, and food validation passes 33/33 tests. The
complete suite currently passes 279/284. The remaining failures expose one
real throughput issue—the expanded farm commission cannot finish inside the
old founding time gate—and four tests that still encode the replaced
three-large-houses, numeric-house-key, or pasture-only-fence assumptions. R8
cannot be called complete while those gates are red or before the fresh run is
watched through household and farm construction.

Phase status remains R0–R7 complete and R8 in progress. The immediate review
gate is player feedback on the fresh layout as it builds. The next engineering
slice must separate survival-critical barn/pasture completion from later field
boundary work, update the intentional household-layout contracts, close the
five failing tests, and then rerun the fresh watched proof.

## Implementation progress — checkpoint 27 / watched storage and work truth

Corrected and watched on 2026-10-03 after the fresh run showed that the prior
"storage separation" claim was insufficient. The allocator still built a
square spiral around each abstract container and protected only structural
perimeters. That allowed one zone to cross the planned lumber yard and appear
both inside and outside a future building. The headless capacity audit could
pass while the town looked incoherent.

Founding storage now uses explicit named rectangles: an outdoor bulk yard, a
founding camp store, farm stores, and a trade/metal yard. A reserved or built
structure blocks its whole footprint, not merely its walls. Bare-ground cells
hold ten units each; actual carts, counters, forges, and fixtures use one
bounded container cell whose allowance is derived from declared container
capacity. Capacity changes regenerate the physical allowance rather than
silently retaining an old smaller cell. The watched run projected 82 storage
cells, no over-capacity cell, and cleanly separated occupied log, tool, meal,
seed, and metal areas.

The presentation/work gap is also narrowed. Unity now receives an explicit
actor pose; sleeping residents lie down and no longer emit work effects. Cattle
can move inside a bounded founding tether range, report grazing near the tether,
and visibly sleep at night; deer report browsing or care. This remains a state
and pose layer, not the multi-frame livestock animation or breeding ecology
required by R8.3.

The reeve now owns a persistent, preemptible `govern_village` job tied to the
strategy board, so her real priority and assignment authority no longer renders
as idleness. Every non-guard, non-reeve founding adult has common-building
capability and may join an architect-approved project. Waiting residents now
say whether they are off duty, missing supplies, blocked by access, waiting on
contention, held by schedule policy, or reporting for assignment. In watched
work hours the town stabilized at eight or nine active founders at a time; the
remaining one or two had named supply or contention waits. Constant 10/10
busyness is not claimed, and the 2,400-tick employment ledger remains open.

Native build and visual-registry validation pass. The function-length audit
reports zero non-exempt functions over 30 lines. Focused storage, economy,
hauling, pose, livestock, governance, common-builder, save/load, and specialist
forge checks pass. The complete suite passes 285/290. The five red gates are:

- the expanded farmstead/field commission misses the old hands-off deadline;
- all new fence groups do not complete inside the old farmstead fixture;
- one early-fixture test accepts only the replaced object-kind set;
- one permanent-home test still requires the old 22×16 generic house instead
  of the compact 10×8 household cottage;
- one resident-over-site test still addresses the former generic house target.

The visible client is running fresh founding run
`434669c6-7e79-4fb5-8c4d-da061e6bf541`, seed
`stonebridge-r8-coherent-watch-2026-10-03`, at normal speed for review.

Phase checkpoint: R0 is complete; R1 is reopened; R2 and R3 are revalidating;
R4, R5, R6, and R8 are in progress; R7 is blocked. The next engineering slice
is to separate pasture/barn completion from field-boundary expansion, update
the four intentional compact-house/fixture contracts, return all 290 tests to
green, and then complete R8.1 storage tiers and the full-day work ledger before
claiming the village is proper.

## Implementation progress — checkpoint 28 / physical outdoor bedrolls

Completed on 2026-10-03 after review clarified that a homeless founder still
needs a real place to lie down. Each founder now owns one outdoor canvas
bedroll with a two-cell footprint, one sleeping position, one-person capacity,
and no building or residence identity. The assignment satisfies sleep while
`housingStatus` and the `homeless` life tag remain unchanged until a derived,
habitable residence is complete.

The former bed sprite has been replaced for temporary sleeping places by a
dedicated horizontal canvas-bedroll asset. The sleeper targets the far cell so
the anchor continues rendering the complete bedroll beneath the pawn. Unity
receives the sleeping fixture dimensions and centers and rotates the sleeping
pawn across the two-cell footprint; this avoids both standing sleep and the
old occupied-cell disappearance effect. Existing founding saves migrate their
bedroll dimensions, positions, and assignments deterministically.

Focused founding, sleep, and Unity-protocol checks pass; the visual registry
accepts the new asset; the native Unity build succeeds; and the function-length
audit remains at zero violations. Phase checkpoint is unchanged: R0 is
complete; R1 is reopened; R2 and R3 are revalidating; R4, R5, R6, and R8 are in
progress; R7 is blocked. The next engineering slice remains the R1 farmstead
critical-path split followed by the complete 290-test gate and a watched
2,400-tick R2 survival proof.

## Implementation progress — checkpoint 29 / field-first land clearing

Completed on 2026-10-03 after review clarified that planned farmland should
drive forestry instead of appearing after unrelated logging. The founding
master plan now owns persistent clearing surveys for both the grain and
vegetable boundaries. On the first simulation tick each survey records every
tree in its footprint, species-specific expected log yield, clearing progress,
and the intended material uses: field fencing first and shared village
construction afterward.

The field boundaries are visible from the beginning as amber planning lines;
they do not replace or hide the trees inside them. Initial nearby logging still
supplies the lumber-yard bootstrap. As soon as that yard can process timber,
the surveyed field trees outrank ordinary forestry targets. Every completed cut
creates its normal conserved log output, leaves a persistent stump, increments
the field's cleared-tree and recovered-log ledger, and feeds the same sawing
and building-lumber stock used by the farm fences. Because the farm construction
order already delivers gates and fences before the barn shell, that lumber
serves the planned boundaries first; material remaining in common stock stays
available for household construction.

Focused proofs confirm early survey persistence, visible boundaries over live
tree terrain, field-first post-yard targeting, species-correct yield, conserved
log creation, and reusable axes. Phase checkpoint is unchanged: R0 is complete;
R1 is reopened; R2 and R3 are revalidating; R4, R5, R6, and R8 are in progress;
R7 is blocked. The next R1 slice remains separating the survival-critical
pasture/barn from later boundary completion so the hands-off gate can finish in
the intended time.

## Implementation progress — checkpoint 30 / survival-first founding order

Corrected on 2026-10-03 after watched play showed founders constructing field
fences while every resident was still homeless. Checkpoint 30 supersedes the
execution order described in checkpoint 29 without discarding its early field
survey. Field boundaries may be surveyed and shown from day one, but survey
metadata is not work authorization.

The enforced founding order is now:

1. Establish the shared campfire while fishing and hunting begin immediately.
2. Haul raw fish to the camp store and cook it; hunger jobs may consume only
   prepared meals or weak emergency forage, never raw fish or raw meat.
3. Cut enough timber and complete the lumber-yard bootstrap.
4. Build roofed household homes, with beds and hearths before nonessential
   domestic fixtures. Housing remains the active capital priority until every
   founder has a permanent residence and assigned bed.
5. Only then authorize field-tree clearing, farmstead construction, gates, and
   fences. Within an approved farm project the barn shell and roof now precede
   enclosures rather than forcing every fence segment ahead of shelter.

A separate founding hunter allows hunting and fishing to proceed concurrently;
the innkeeper establishes the survival fire before joining forestry or cooking.
A natural 2,400-tick probe transitioned from lumber infrastructure to housing
at tick 1,373, retained zero farm or field-clearing jobs, and produced cooked
fish and hunted meat while the first house was under construction.

The regression suite at checkpoint 30 passed 291/295. The four failures are the
same obsolete farm-completion, early-fixture, former oversized-house, and old
work-target compatibility assertions; all new campfire, raw-food exclusion,
hunting/fishing, housing-priority, field-gating, and hands-off ordering proofs
pass.

Phase checkpoint: R0 remains complete. R1 is reopened but now has the correct
survival-first dependency graph. R2 and R3 remain in revalidation. R4, R5, R6,
and R8 remain in progress. R7 remains blocked until the natural housing/farm
sequence and full release suite pass.

## Implementation progress — checkpoint 31 / planning-quality reset

Re-scoped on 2026-10-03 after watched play and user review showed that checkpoint
30 still set too low a bar. Preventing fences before houses corrected one bad
ordering, but the replacement remained a hard-coded sequence. It did not prove
that the reeve assessed the settlement, compared feasible plans, protected the
food workforce, adapted to changed risk, or could explain every resident's job.

The prior claim that R1 now had the correct founding logic is withdrawn. The
visible run is diagnostic evidence: surveyed work occupies the landscape,
residents cluster or wait, and permanent shelter arrives too slowly to justify
the plan. Passing job, dependency, and construction tests proves that mechanics
can execute; it does not prove intelligent play.

R1 is now the decision-quality phase. Its next implementation slice must:

1. derive a reeve assessment from sleeping capacity, prepared-food days, water,
   weather, safety, tools, materials, labor, travel, and project ETAs;
2. compare minimal camp, communal shelter, and household-home alternatives;
3. reserve enough residents for food and recovery before staffing construction;
4. publish the chosen doctrine, rejected alternatives, evidence, stop
   conditions, and reason for every assignment;
5. reevaluate when the evidence changes and visibly cancel, suspend, or restaff
   an obsolete plan;
6. pass watched action-ledger review before any survival or village claim.

Phase checkpoint: R0 remains complete because it is only the deterministic proof
harness. R1 is reopened and is the sole primary objective. R2 is blocked behind
R1 rather than merely revalidating. R3-R6 and R8 remain implementation work but
cannot advance the product claim. R7 remains blocked. No phase may be described
as complete solely because a feature exists or a headless test passes.

The first truthfulness implementation records live survival evidence plus camp,
communal-shelter, and household-home alternatives. It intentionally reports
`insufficient_evidence` and selects no doctrine while the communal plan and
time-to-benefit estimates are absent. The focused strategy tests pass; the full
suite passes 292/296 with the same four pre-existing compatibility failures.

## Implementation progress — checkpoint 32 / behavioral correctness rubric

Re-scoped on 2026-10-03 to make watched, moment-to-moment behavior the governing
definition of simulation correctness. End-state statistics cannot establish
that a run played correctly. Individual survival and community survival are now
one linked hierarchy: immediate danger, imminent personal collapse, community
survival coverage, stable production, then expansion and comfort.

This checkpoint adds no completion claim. It explicitly identifies missing
implementation: non-guard residents do not yet have a general fight, flight,
cover, rescue, and help-request decision layer; the reeve does not yet recompute
community coverage when a resident is threatened, injured, exhausted, or absent;
and the inspector does not yet expose perceived alternatives and interruption
conditions. These are now R1 blockers ahead of shelter-plan optimization.

Phase checkpoint: R0 remains complete as a deterministic harness. R1 remains
reopened and active. R2 remains blocked. R3-R6 and R8 remain implementation
work without completion credit, and R7 remains blocked.

## Implementation progress — checkpoint 33 / behavioral development method

Added on 2026-10-03 to make the user's simulation standard durable across lost
chat history and future Codex sessions. The mandatory method begins with
ordinary-language decision scenes, models perception and alternatives, tests
decision boundaries and interruptions, observes the real game at readable
speed, probes counterfactual changes, and uses aggregate statistics only after
visible behavior is credible. Every feature must retain a watched acceptance
record and explicitly distinguish mechanism existence from correct play.

Phase checkpoint: this is a process correction, not a gameplay completion. R0
remains complete; R1 remains reopened and active; R2 remains blocked; R3-R6 and
R8 remain implementation work without completion credit; R7 remains blocked.

## Implementation progress — checkpoint 34 / usable workshop correction

Watched play on 2026-10-03 exposed a failed claim: the founders completed a
large roofed lumber workshop but processed lumber outdoors, left the interior
empty, and continued sleeping under outdoor canvas. The replacement workshop
now physically requires a timber sawbench, carpentry tool rack, and
finished-lumber rack. Sawing targets the installed interior bench. Until homes
are ready, all ten homeless founders move their assigned bedrolls into the
completed roofed workshop; this grants emergency shelter without falsely
granting residence or permanent housing.

The first corrected run then exposed a second failure at 368/406 labor: the old
commission authorized only 370 labor and 210 lumber, less than the honest
406-labor and 216-lumber building. The founding commission now authorizes 430
labor and 230 lumber, and all eight non-reeve, non-watchman founders can assist
commissioned emergency structures as common builders.

Watched run `87918bf2-cd20-46f7-b918-5ce9b2bf266b` proved the corrected
transition. At tick 2,501 the workshop completed at 406/406; housing became the
active capital priority; all three interior fixtures were visible; all ten
bedrolls occupied interior coordinates; and the saw-lumber job targeted the
interior bench. At tick 4,182, Klara Holt was visibly sleeping inside the
workshop while the watch patrol continued. Completed walls, doors, rooms, and
fixtures now identify their parent structure in English in the bottom-left
inspector.

The rebuilt Unity client also renders a persistent English caption at the
lower-left corner of every completed building. The watched settlement now
shows `Founders' lumber workshop` directly on the map without requiring a
selection; future farmhouses, forges, mills, inns, and other completed
structures inherit the same treatment from their landmark name.

The full automated suite now passes 296/300. The four remaining failures are
legacy compatibility expectations for obsolete farmstead ordering, early
fixture classification, the former 22×16 house footprint, and old work-target
identity. The strict 30-line function audit and whitespace validation pass.

Phase checkpoint: R0 remains complete. R1 is still reopened rather than
complete, but the first capital structure and shelter handoff now pass watched
behavior. R2 remains blocked until the first permanent home and a full natural
2,400-tick survival day pass. R3 is revalidating; R4-R6 and R8 remain in
progress; R7 remains blocked.

## Implementation progress — checkpoint 35 / visible identity and sleep planning

Every completed building now carries its own persistent English caption at its
lower-left map corner. This was rebuilt and watched in the Unity client: the
existing structure reads `Founders' lumber workshop` without selection. The
same landmark-driven treatment applies to completed farmhouses, forges, mills,
inns, and later structures.

The continued watched run exposed two R2 failures. A sleep order created before
the bedrolls moved indoors retained its old outdoor coordinate and reported
`target missing`; moving a bedroll now retargets and reopens every live sleep
order for that bed. More importantly, residents were waiting for fatigue to
cross the emergency threshold during working hours. The rest schedule now makes
a full night's sleep the proactive choice once fatigue falls below 98, ahead of
noncritical social or morale activity. Emergency survival preemption remains
unchanged. Both corrections have focused regression tests.

The full suite passes 298/302 after these additions. The same four legacy
compatibility expectations remain: obsolete farmstead ordering, early fixture
classification, the former 22×16 house footprint, and old work-target identity.
The Unity macOS build succeeds, the 30-line function audit has zero violations,
and whitespace validation passes.

Phase checkpoint: R0 remains complete. R1 remains reopened, with the labeled
workshop and shelter handoff visibly passing. R2 remains blocked: this watched
run exposed and corrected sleep planning, but the first permanent home and the
subsequent natural 2,400-tick survival day have not passed. R3 is revalidating;
R4-R6 and R8 remain in progress; R7 remains blocked.

## Implementation progress — checkpoint 36 / fresh watched founding order

Fresh visible run `98613c31-adbb-4fc0-b397-2999e7032304`, seed
`stonebridge-visible-correct-play-2026-10-03`, started from ten founders and no
finished buildings. The first day visibly assigned watch, fishing, hunting,
forestry, campfire, surveying, governance, and common construction instead of
fences. The campfire and cooked-food chain operated while the founders built
the lumber workshop. The first night exposed ordinary forestry continuing
during the declared rest block; ordinary work now suspends at the 22:00
boundary, releases its reservations, and cannot resume until rest ends. Life
jobs and the watch remain eligible.

The same save then completed the honest 406-work workshop on Day 2. Its door,
roof, sawbench, tool rack, and lumber rack became visible; the permanent English
caption remained on the map; all ten owned bedrolls moved to valid interior
coordinates; and the capital priority changed to housing. Day 2 night visibly
showed eight tired founders asleep indoors, one sufficiently rested founder off
ordinary work, and Friedel Koch patrolling. No construction, hauling, sawing,
fishing, cooking, or governance remained active during rest. A short
`destination congested` retry cleared naturally and did not become a blocked
sleep job.

On Day 3 the suspended production chain resumed. The architect-approved first
home is `Ada Weiss household farmhouse`, placed in the farm-holding district
with a planned hearth, household store, table, chairs, two real beds, timber
floor, walls, door, and supported roof. Material moves from bounded stock in
five-unit deliveries. Ada completed the physical door and the first wall
segments while fishing, cooking, sawing, governance, and the watch continued.
The run has therefore proved the handoff into real housing but has not yet
earned R1 or R2 completion; the farmhouse and the subsequent natural 2,400-tick
survival day remain open.

The complete suite now passes 300/304 after the new rest test's transient
action-text assertion was replaced with a behavioral state assertion. The four
remaining failures are the documented legacy expectations for
obsolete farmstead ordering, early fixture classification, the replaced 22×16
generic house, and its old work-target identity. The strict 30-line audit and
whitespace validation pass.

Phase checkpoint: R0 is complete. R1 is reopened and actively proving the first
permanent home. R2 is blocked on that home plus the full-day survival proof. R3
is revalidating; R4, R5, R6, and R8 remain in progress; R7 remains blocked.

## Implementation progress — checkpoint 37 / visible long-run truth

The watched farmhouse build demonstrated that the conserved sawmill and
five-unit construction deliveries require several natural days. A separate
`Observe 16× [F10]` client mode now advances the same authoritative single-tick
wait intents on screen without changing work duration, yield, inventory, job
choice, or survival rules. Normal 1× and reviewable 4× remain available. The
native macOS build succeeds and the widened control strip no longer overlaps
the town controls at the active review resolution.

The accelerated visible run exposed a false presentation claim. Once the
farmhouse walls enclosed the footprint, its English caption appeared even
though the derived building was still `enclosed`, unroofed, and incomplete.
Landmarks now project authoritative `status` and `complete` fields. Unfinished
shells remain selectable and describe their real state, but only a building
whose status is `complete` receives the persistent finished-building caption.
Focused Unity, sleep, schedule, function-length, and whitespace checks pass.

Run `98613c31-adbb-4fc0-b397-2999e7032304` is saved at tick 13,872, Day 7
00:43. Housing remains the active priority. `Ada Weiss household farmhouse` is
at 322/430 labor with 32/41 physical elements complete; the server reports it
as `enclosed`, `complete: false`, and unfinished. The completed workshop still
reports `complete: true` and retains its caption. The visible continuation is
paused only because macOS locked and requires a manual unlock before the Unity
client can reopen; no headless continuation was substituted.

Phase checkpoint: R0 is complete. R1 remains reopened at the unfinished first
home. R2 remains blocked on home completion and the subsequent natural
2,400-tick survival day. R3 is revalidating; R4, R5, R6, and R8 remain in
progress; R7 remains blocked at 300/304 pending the four documented contract
updates and the remaining watched gates.

## Implementation progress — checkpoint 38 / first home and watched survival day

The same saved Unity run resumed visibly rather than being replaced by a
headless continuation. During Day 7, the crew supplied and finished all 41
physical elements of `Ada Weiss household farmhouse`. The derived landmark
changed from `enclosed`, `complete: false` to `complete`, `complete: true` only
after its supported roof and domestic fixtures existed. Its persistent English
caption then appeared in the lower-left of the finished footprint. The completed
home contains a material-backed hearth, household store, table, two chairs, and
two reachable single beds. Ada Weiss is now truthfully `housed`; the other nine
founders remain truthfully homeless while using their emergency sleeping places.

The visible run then continued from tick 15,361 through tick 17,782, exceeding
one complete 2,400-tick day without pausing or injecting resources. Across the
observed proof samples, the population remained ten, combined permanent and
temporary sleeping capacity remained twelve, prepared meals never fell below
36, critical hunger remained zero, and the meaning validator remained at zero
violations. Ordinary work stopped at the night rest boundary, food recovered by
dawn, and the town resumed its housing work period. The run is saved and paused
at tick 17,926, Day 8 17:15, with 40 prepared meals (four days), two permanent
beds, ten emergency sleeping places, the lumber workshop operational, and the
survival camp operational.

This closes the missing watched first-home and full-day evidence. R1 still has
to demonstrate that the housing critical path hands off to cleared and planted
fields at the correct planning gate. The strict R2 proof initially exposed a
stale acceptance rule that demanded four beds and four chairs from a two-person
home even though its own evidence reported the intended two of each. The rule
now derives the required counts from residence capacity. The rerun passed all
2,400 ticks: minimum hunger was 39.19, minimum fatigue 33.11, and minimum safety
39.50 against the danger threshold of 25; invalid and unsheltered sleeping
actor-ticks were both zero; nine traceable meals balanced exactly (41 starting

- 6 produced - 9 consumed = 38 ending); and no resource was hidden.

Phase checkpoint: R0 and R2 are complete. R1 is revalidating after the first
permanent home; R3 is revalidating; R4, R5, R6, and R8 remain in progress; R7
remains blocked at 300/304 pending the four obsolete contract updates and the
remaining integrated gates. The focused R1/R2/R7 regression slice passes 30/30,
the strict 30-line audit reports zero violations, and whitespace validation
passes.

## Implementation progress — checkpoint 39 / adventurers removed from town simulation

The adventuring party is temporarily absent whenever the active location is the
village. This is a simulation boundary rather than a cosmetic hide: the hero
and companions no longer occupy village cells, block resident routes, receive
village need decay or healing jobs, accept autonomous town work, regroup, expose
village interactions, or appear in the village Unity roster and map. Party
movement, spending, shopping, and character-management controls are hidden;
the camera now says `Center Town`, while the simulation controls and council
remain available. Dungeon party state and behavior are preserved behind the
persisted `adventurersPresent` capability flag for later reintroduction.

The saved-run migration forces the temporary absence policy so existing runs do
not retain four stray adventurers. A dedicated regression proves a village tick
leaves player needs and companion positions unchanged, creates no autonomous
party jobs, projects no party cells or roster, and advertises no party movement
intent. Legacy companion and party-system tests explicitly opt into the flag so
the dormant subsystem remains tested. The focused village, Unity, companion,
and party suite passes 53/53. The complete suite remains at its prior 300/304
baseline; the four failures are the already documented obsolete founding
contracts, not regressions from removing the party. The native macOS client
build succeeds, the saved Day 8 run migrates to zero party members and zero
party cells, and the visible client shows `Center Town` with no party roster,
hero HUD, movement controls, or adventurer sprites.

Phase checkpoint: R0 and R2 are complete. R1 and R3 are revalidating; R4, R5,
R6, and R8 remain in progress; R7 remains blocked pending the four obsolete
contract updates and remaining integrated gates.

## Implementation progress — checkpoint 40 / road-facing dual-exit homes

House planning no longer treats paths and entrances as unrelated decorations.
The architect evaluates the outside access cell on all four walls, selects the
door nearest the connected road as the primary entrance, and places a second
door on the opposite wall as an independently reachable escape. Construction
perimeters omit both openings, create two material-backed door elements, and
reject plans with fewer than two unique reachable exits.

The active saved settlement was not grandfathered into the defect. Its two
legacy south-door houses were migrated so the north wall facing the approach is
the primary entrance and the original south door is retained as the escape.
For Ada Weiss's completed farmhouse, migration removed the finished north wall
primitive, reused its five lumber units, reopened the project for the remaining
twenty lumber and twelve labor minutes, and temporarily withdrew the derived
residence until the shell was safe again. In the watched Day 9 run, Bram Eder
hauled the material to `(-29, 35)`, Ada Weiss built the door, the farmhouse and
English label returned, and the visible map showed the path meeting the north
entrance while the south exit remained present. The verified state was saved at
tick 20,557.

The focused entrance tests pass 3/3, the complete suite is 302/306 with only the
same four documented obsolete founding-contract failures, and the strict
30-line audit reports zero violations.

Phase checkpoint: R0 and R2 are complete. R1 and R3 remain revalidating with
this defect closed; R4, R5, R6, and R8 remain in progress; R7 remains blocked
on the four obsolete contract updates and the remaining integrated gates.

## Implementation progress — checkpoint 41 / needs-led seasonal founding

The founding order is no longer `lumber yard → all private housing → farm`.
The lumber workshop, assigned bedrolls, campfire, and cooking point form a
truthful communal emergency shelter. Once that exists, the reeve protects the
food bridge and seasonal lead time before approving private homes.

Every 100 ticks—24 times in a 2,400-tick day—the reeve now persists a
resident-needs inventory containing all ten
residents' current needs, warning and danger needs, practical requests, housing
status, and household identity. Its food outlook records available portions,
one-day and three-day targets, coverage days, unsown-field risk, and whether
planting is underway. The inventory stores the recommended priority and causal
reason, and the council screen shows its aggregate hunger, fatigue, safety,
homelessness, reserve, coverage, planting, and recommendation values. Current
Hunger detected at a scheduled review changes the village priority; individual
survival behavior responds to personal hunger between reviews. Reserve coverage
and seasonal planting produce the anticipatory response before anybody starves.

The review writes a completed governance receipt, not a continuous job or the
reeve's permanent occupation. The last council decision remains authoritative
between reviews and the reeve continues ordinary eligible work. Resident and household petitions are the
planned bottom-up source for later reviews; direct personal danger response
continues immediately without waiting for council.

The first agricultural action is now deliberately smaller than the master
plan. Each planned field is surveyed for the least-obstructed interior 4×4
starter plot. Only that plot must be clear before soil preparation and sowing
can begin. The full barn, pasture fences, remaining trees, and additional field
acreage continue concurrently. Private housing becomes eligible after at least
one real crop plot is growing, nobody is at the hunger-warning threshold, and
the one-day reserve exists; crop work remains authorized after housing starts.

The focused needs and priority tests pass 3/3. The unassisted canonical R1 run
now builds the workshop, opens and sows a starter field, and only then posts the
first road-facing two-exit home; this proof completes in roughly six seconds
rather than spending five simulated days on the full 28-tree farm plan without
planting.

The rebuilt Unity client compiles and the migrated visible Day 9 village now
shows the inventory in the council panel. At the watched checkpoint the reeve
reported 42 portions for ten residents (4.2 days), zero hungry residents, nine
homeless residents, planting not started, and still recommended food security.
This is the intended anticipatory decision: current hunger is safe, but the
seasonal production chain is not. The persisted resident census also exposed
one social and morale danger request, and the council now displays those totals
plus the recommendation reason instead of hiding them behind the food summary.

The complete QA suite passes 305/309. Static QA reports zero whitespace errors
and zero unapproved function-length violations across 1,285 functions; the 134
longer exemptions are documented data/template composition. Native Unity build
verification passes after correcting the resident-needs projection type.

Phase checkpoint: R0 and R2 remain complete. R1 is revalidating with the
critical order corrected; R3 is revalidating; R4, R5, R6, and R8 remain in
progress; R7 remains blocked on the four construction-contract failures and the
remaining integrated gates.

## Implementation progress — checkpoint 42 / watched two-day scheduler debug

Watched and corrected on 2026-10-04 after running the saved settlement from
late Day 9 through Day 12 in the visible Unity client. The colony survived and
kept food, fatigue, and safety out of danger, but the run did not qualify as a
successful village proof: only one permanent home existed, nine residents were
still homeless, the farmstead commission had almost no physical progress, and
several healthy founders spent long windows without useful work.

The run exposed two coupled scheduler defects. After a harvest, both plots
entered their legitimate fallow/prepared interval, but the reeve interpreted
that interval as “seasonal planting not started” and switched from housing back
to food despite roughly 5.8 food-days. The existing grain and vegetable jobs
then remained suspended behind a house job that was merely available. The
resumption rule had incorrectly required an interrupting job to be completed or
cancelled rather than simply no longer reserved or active.

The corrected contracts now:

- treat any plot with a completed sowing cycle as an established seasonal food
  program while still posting the next prepare/sow/harvest action;
- retain a suspension only while its interrupting job is actually reserved or
  active, reopening the displaced work when the interrupter becomes available,
  blocked, suspended, completed, or cancelled;
- prefer sleep during the rest block when the assigned bed also provides
  shelter and there is no immediate threat; and
- add progressive safety recovery to sheltered sleep, so a resident does not
  need a separate standing-shelter action beside the same bed.

Three focused regression tests prove the harvested-cycle decision, stale
interruption release, and sheltered-sleep choice. The strict 30-line audit
passes with zero violations across 1,291 functions.

The repaired save was then replayed visibly. At night all nine off-watch
founders slept in assigned beds while Friedel Koch maintained the watch. At
dawn the two stale crop jobs cleared their house-job suspension; Ada Weiss
resumed physical grain-field preparation, and the vegetable job returned to the
available queue. At the next council review, the visible panel reported 53
food portions for ten residents, 5.3 coverage days, zero hungry, tired, or
unsafe residents, “planting underway,” and a housing recommendation. This
confirms that the specific deadlock and night-schedule inversion are closed.
The verified run is paused and saved at tick 26,877, Day 12 10:40, with the
council panel visible.

The broader result is still not a release pass. Daytime staffing remained too
sparse; Ada's farming could still be interrupted by an architectural inspection;
the farmstead and next home progressed slowly; the guard reached social and
morale danger before relief; and the settlement remains one completed household
short of even modest village coherence. These are R1/R4/R5 blockers, not
statistics to waive.

The full regression suite passes 305/312. The seven failures are the hands-off
lumber-yard job's nonterminal duplicate state, forge repair commissioning,
farm-fence completion, early founder movement accounting, pre-commission
fixture classification, an obsolete large-home footprint expectation, and
construction target identity when a resident shares the work cell.

Phase checkpoint: R0 and R2 remain complete. R1 and R3 remain revalidating. R4,
R5, R6, and R8 remain in progress. R7 remains blocked on the seven named suite
failures plus the multi-run and watched release gates.

## Implementation progress — checkpoint 43 / coherent farm geometry

Corrected on 2026-10-04 after visible review showed that the planned farm
fences were offset from the field designations and used different origins. The
cause was architectural rather than graphical: when an occupied lot forced the
farmstead barn to move, generic site search translated the barn, cattle pasture,
grain field, and vegetable field together. The already-approved master-plan
field surveys and starter crop plots remained at their original coordinates.

Farmstead site search now distinguishes two spatial authorities. The barn and
its cattle pasture may move together to resolve a building conflict. Surveyed
crop-field boundaries remain fixed because clearing, crop plots, gates, and
fences all refer to those approved areas. Future farm jobs therefore cannot
silently drag established fields when relocating a building.

A save migration repairs legacy farmstead jobs whose field fence elements are
still planned and unsupplied. It replaces their shifted grain and vegetable
enclosures with the master-plan boundaries and repositions every corresponding
planned gate and fence element. It deliberately refuses to teleport delivered
or completed physical fences; those will require explicit deconstruction and
rebuilding if encountered in another save.

The visible Day 12 save contained no delivered field-fence material, so the
migration was lossless. After one paused simulation step, the farm job's grain
enclosure exactly matched the 14×9 grain designation at `(-51, 22)` and the
vegetable enclosure exactly matched the 12×8 vegetable designation at
`(-50, 32)`. The correction emitted `farm_field_geometry_repaired` at tick
26,877 and the repaired state was saved at tick 26,878.

Two regression tests cover both future placement and legacy repair. The
complete architecture suite passes 23/23, the full suite passes 307/314, and
the strict function-length audit remains green.

Phase checkpoint: R0 and R2 remain complete. R1 and R3 remain revalidating with
the farm-coordinate defect closed. R4, R5, R6, and R8 remain in progress. R7
remains blocked on the same seven named suite failures and integrated release
proofs.

## Implementation progress — checkpoint 44 / building circulation aprons

Corrected on 2026-10-04 after visible review found the Brand household
cottage's north door opening directly onto a cattle-pasture fence post. The
architect had reserved exact building and enclosure footprints plus individual
door cells, but it had no symmetric circulation contract. A later project could
therefore consume the outside approach to an earlier building.

Every standalone primary building now reserves a one-cell circulation apron
around its complete footprint. Buildings and fences cannot occupy that apron;
roads and paths may, so a door can connect to the street without turning the
apron into unusable empty decoration. Two neighboring standalone homes therefore
retain a two-cell wall-to-wall passage, one cell contributed by each home. Exact
structural footprints may never overlap.

The exception is explicit rather than inferred. A planned extension or connected
structure may use its parent's apron only when it declares the parent through
`attachedToSiteKey` or declares `connectionMode: "extension"`. This permits
future additions without allowing unrelated fences, stores, or buildings to
silently block circulation.

The live cottage shell already contained completed walls and doors, so moving it
would have teleported physical work. The pasture contained no delivered or
completed construction. On the next paused simulation step, the legacy plan was
therefore repaired conservatively: the barn and cattle pasture moved, the two
surveyed crop fields remained fixed, and `farm_circulation_plan_repaired` was
emitted at tick 26,878. The cattle pasture is now at `(-10, 24)` instead of
occupying the cottage's north-door approach at `(-17, 34)`. The repaired visible
state was saved at tick 26,879. A watched follow-up exposed and fixed the farm
work order's stale pre-migration terrain target: construction-anchor repair now
retargets the moved job and reopens a legacy `target_missing` block. The farm
job is available with no blocking reason, and the final visible state was saved
at tick 26,880.

Four new regression tests prove the two-cell house gap, reject a fence at a
house entrance, permit a declared extension, and re-site an untouched pasture
without moving surveyed fields. The complete architecture suite passes 26/26;
the full suite passes 311/318 with exactly the same seven previously named
failures. The strict function-length audit remains green.

Phase checkpoint: R0 and R2 remain complete. R1 and R3 remain revalidating with
the circulation and entrance-blocking defect closed. R4, R5, R6, and R8 remain
in progress. R7 remains blocked on the same seven suite failures and integrated
release proofs.

## Implementation progress — checkpoint 45 / adaptive village watch

Corrected on 2026-10-04 after visible review showed Friedel Koch endlessly
walking the original founding-store circuit even though homes, fields, work,
and residents had spread well beyond it. A patrol is now a bounded watch shift,
not the watchman's permanent occupation.

Each shift snapshots up to four meaningful, deterministic watch points: occupied
home entrances first, one current work area, and the current edge of resident
activity. The points are ordered from the watchman's actual position and each is
accepted only if real navigation can reach it. This prevents a resident inside
a closed or unfinished structure from creating a permanently blocked patrol.
Legacy continuous patrols acquire the new route on use, and duplicate legacy/new
patrol orders are consolidated to one open duty.

One completed circuit records the last watch tick. Routine daytime patrols then
have a 600-tick cooldown; night checks use a 200-tick cooldown. Reported crime
and immediate danger remain priority 90/100 duties and preempt ordinary work.
While the watch is not due, Friedel may survey construction, join common building,
haul stock, and deliver construction material. Personal survival and social
needs remain legitimate rather than being suppressed to make him work.

The visible Day 12 save migrated successfully. Its route now covers the lumber
workshop, Ada Weiss farmhouse, and the southern resident/work area rather than
circling the outdoor stock. The first adaptive shift completed at tick 26,970;
the duplicate order was cancelled, and no new routine patrol was posted during
the cooldown. The saved visible run is paused at tick 27,167 while Friedel
finishes needs accumulated during his former permanent watch assignment.

The outdoor stock remains an outdoor stockpile, not a building. R4 now explicitly
requires a roofed storehouse with bounded storage cells, shelving, categories,
access, and a proprietor/quartermaster workflow; the architect must site it as a
real service building rather than allowing storage markings to become one.

Focused guard, navigation, incident-response, and engine regressions pass 62/62.
The full suite passes 313/320 with the same seven previously named failures;
the strict function-length audit remains green at zero violations across 1,311
functions.

Phase checkpoint: R0 and R2 remain complete. R1 and R3 remain revalidating with
adaptive watch behavior implemented. R4, R5, R6, and R8 remain in progress, with
the storehouse added to R4. R7 remains blocked on the same seven suite failures
and integrated release proofs.

## Implementation progress — checkpoint 46 / regional land and extraction substrate

Corrected on 2026-10-04 after visible review again showed that the founding core
was being mistaken for the whole settlement. Stonebridge now declares a
1,024×1,024-cell authoritative region. The 140×84 Unity payload remains a moving
observation window over that region, and every overlapping 32×32 chunk has a
stable UUID derived from the run and chunk coordinates. The founding and hamlet
planning envelopes remain 256 and 384 cells respectively; neither is a camera
edge or eventual city wall.

The two trunk routes are now bounded regional routes rather than infinite lines.
In a founding run they are dirt tracks. An established settlement has stone only
through its developed core, while the approaches remain dirt until traffic,
stone supply, and approved labor justify an upgrade. A continuous meandering
five-cell-wide river now runs north-south east of the founding core. The east-west
track crosses it on an explicit passable timber bridge; water remains impassable
everywhere else. The original fishing water remains as a small oxbow pool, so the
early food chain is preserved without pretending the pool is the regional river.

A remote western ridge and limestone face now exist outside the founding core.
Ridge cells block travel. The exposed face is inspectable and quarryable with a
suitable tool, yields a bounded loose pile of three building-stone units, and
persists as worked ground instead of regenerating. Unity renders the ridge,
lighter quarry face, bridge planks, river water, dirt track, and stone road as
different physical terrain. This is the first usable extraction proof, not yet
the autonomous quarry industry: resident quarry jobs, surveyed deposit volumes,
carts, guarded hauling, quarry storage, and masonry production remain R8.0 work.

The mayor's persisted master plan now records regional water and quarry districts,
dirt-first road policy, timber-to-stone bridge progression, and a staged defense
strategy. The current stage is an open settlement using an adaptive watch, muster
point, and clear sightlines. Population, repeated attacks, or valuable stores can
justify a palisade, gates, watch houses, and eventually a stone wall. Any perimeter
must preserve two exits plus farm, bridge, and quarry access. Wolves, predatory
animals, bandits, and fire are explicit assessed threats, but threat spawning,
combat readiness, perimeter construction, and gate-defense behavior are not yet
implemented and receive no completion credit here.

Focused regional, Unity, world-object, road, navigation, persistence, and guard
regressions pass 49/49. The full suite passes 317/324; its seven failures are the
same previously named founding-priority, forge, fence, purposeful-duty, fixture,
obsolete oversized-home, and occupied-work-target failures. Four timing-sensitive
construction tests initially regressed when dirt travel was made slower; founding
tracks now retain the proven road travel cadence while their material, appearance,
upgrade policy, and future weather/maintenance behavior remain distinct. Those
four tests are green again. The strict function-length audit remains green at zero
violations across 1,318 functions and 135 documented template exemptions.

The macOS client compiled and built successfully. Watched review confirms the
founding roads are visibly brown dirt rather than gray stone, the regional river
continues beyond the observation window, and the two-cell road crosses it on a
visible timber-plank bridge. Camera panning streamed from the settlement to the
crossing without moving residents or advancing simulation as part of the browse.
The live Day 12 save was paused and saved at tick 27,186 with the camera left on
the river crossing for review.

Phase checkpoint: R0 and R2 remain complete. R1 and R3 remain revalidating. R4,
R5, R6, and R8 remain in progress; this is a material R8.0 advance, not R8.0
closure. R7 remains blocked pending the existing release failures plus proof of
autonomous regional extraction, transport, threat response, and persistence.

## Implementation progress — checkpoint 47 / field sightlines and clean regional restart

Corrected on 2026-10-04 after watched review found trees touching the two crop
enclosures and occupying the strip between them. Every founding field boundary
now reserves a two-cell exterior access and defensive-sightline apron. The field
survey includes both interior and apron trees, identifies which trees are in the
clearance strip, and removes the tree plus stump/root obstruction to walkable
ground. Reserved farm sites include the apron, so later buildings and storage
cannot silently consume that circulation space.

Field fences now wait for their local two-cell sightline to be genuinely clear.
The restriction is local rather than a whole-project freeze, so builders can
continue on unobstructed sections while foresters clear another edge. Completed
field fences also trigger ongoing clearance work in partially commissioned legacy
farms. This closes the defect found in the Day 12 save where a visible farm
existed but the scheduler withheld additional felling until the abstract
`farmstead` facility flag was complete. Farm budget version 4 includes the real
tree-clearing labor and expanded lumber allowance instead of silently exhausting
the old commission authorization.

Old saves migrate their boundaries, surveys, construction reservations, and open
farm blueprints to the new clearance contract. A watched migration found the
previously ignored perimeter trees and began a traceable fell/saw cycle. At the
user's request, that inherited session was then replaced as the active session by
a clean founding run, `cbe2e46f-b588-4239-9217-0cef0a75efee`, on the declared
1,024×1,024 regional world with stable 32×32 chunks. The previous save remains
recoverable. The new run was visibly centered, left running in Unity, and saved
at tick 792 on Day 1.

QA passes the seven focused field, forestry, construction-order, and tool-flow
regressions. The full suite passes 319/326; the seven remaining failures are the
same named founding-priority, forge commissioning, pasture/fence completion,
purposeful-duty, fixture timing, obsolete oversized-home, and occupied-work-target
failures. The strict 30-line audit passes all 1,328 functions with 135 documented
template exemptions and zero violations.

Phase checkpoint: R0 and R2 remain complete. R1 and R3 remain revalidating, now
with the field-clearance contract implemented. R4, R5, R6, and R8 remain in
progress. R7 remains blocked on the same seven release failures and the broader
multi-run proofs; the regional restart is an R8.0 advance, not R8 completion.

## R8 — Proper village systems

### R8.0 — Semi-open regional substrate

Build:

- separate the camera observation window from authoritative world extent and
  introduce stable world coordinates plus UUID-backed 32×32 chunk identities;
- deterministically generate untouched chunks from the regional seed while
  persisting terrain, resources, ownership, improvements, structures, hazards,
  and ecological changes in every discovered or modified chunk;
- stream chunks around the camera and traveling actors, with an overview that
  can inspect the settlement, farm belt, wildlands, routes, and remote holdings
  without advancing time;
- implement active, warm, and cold simulation tiers whose checkpoints conserve
  entities, inventory, scheduled events, travel, depletion, and regeneration;
- represent fields, pasture, managed woodland, wildlife habitat, forage,
  quarries, mineral deposits, roads, camps, and extraction sites as regional
  spatial state rather than quantities anchored to the founding viewport;
- make remote work use real routes, travel time, bounded carrying, risk,
  storage, and return journeys; camera movement never moves residents or
  changes simulation outcomes;
- replace full-region Unity snapshots with chunk deltas and level-of-detail
  summaries before population and developed-area load materially increase.

Gate:

The architect can reserve and build outside the founding camera window without
colliding with a hidden edge or overwriting terrain, roads, resources,
ownership, or another plan. Timber, hunting, quarry, and ore proofs begin at
finite regional sources and end through measured travel and physical storage.
Streaming, tier transitions, save/load, panning, and zooming remain
deterministic, and no resource or actor appears, vanishes, or teleports when a
chunk changes detail level.

### R8.1 — Physical storage and work ledger

Build:

- add evidence-backed resident, building, institution, and town meaning-receipt
  schemas plus UUID/reference validation; expose the same receipts to tests and
  the player inspector;
- replace generated spiral capacity with explicit, valid, persisted storage
  cells designated by the player or by an approved architect plan;
- define storage fixtures and tiers: bare ground holds one item stack per cell,
  covered floor preserves but does not multiply stacks, shelves/racks hold
  multiple eligible stacks, and bins/granary cells specialize by material;
- give item definitions stack size, volume, deterioration, and storage
  compatibility; derive capacity only from the actual cells and fixtures;
- select haul destinations by filter, priority, remaining physical space,
  protection, and travel cost; production must wait or spill a visible loose
  pile when no destination can accept output;
- add an always-readable zone overlay plus used/reserved/total capacity,
  filters, tier, protection, priority, and overflow in the inspector;
- add a resident work table containing primary profession, enabled work types,
  priority, current/queued job, schedule, skill, last completed work, and a
  truthful idle or wait reason. Give governance, cleaning, maintenance,
  hauling, field work, care, and other fallback work explicit demand sources.

Gate:

No capacity exists without a valid designated cell or fixture. Ground,
shelving, and specialist stores demonstrate different capacities and item
rules. A 2,400-tick audit accounts for every capable resident as working,
scheduled rest/recreation, or waiting for a named and inspectable reason; it
reports underemployment separately from scheduler contention.

### R8.2 — Plant agriculture lifecycle

Build:

- make fields designated cell areas with a selected crop and sow/cut controls;
- model prepare, sow, germinate, grow, mature, harvest, fail, and fallow per
  cell or coherent field cohort;
- express growth in days and make it respond to season, temperature, light,
  fertility, water, crop damage, and farmer skill;
- place harvested produce physically in the field, then haul it to a compatible
  selected store before milling, cooking, selling, or seed reservation;
- expose expected maturity, actual growth rate, yield, seed requirement,
  disease/damage, and destination; retain forage as emergency food rather than
  a durable staple.

Gate:

A traced batch travels seed store -> field -> harvested field pile -> selected
granary -> mill or kitchen -> meal, with conserved quantity and believable
multi-day timing. A field can fail from an adverse growing condition and
recover through visible work rather than a metadata reset.

### R8.3 — Livestock lifecycle and readable animals

Build:

- distinguish bull, cow, calf, and juvenile using sex, age, maturity,
  fertility, lineage, and life-stage data;
- require at least one eligible mature male and female in a compatible pasture
  for mating; add conception chance, pregnancy, gestation, birth, nursing,
  weaning, aging, health, feed demand, and pasture carrying capacity;
- prevent milk, breeding, or slaughter work when age, sex, health, pregnancy,
  or policy disallows it;
- give calves a smaller footprint and rendered scale, then add readable adult
  sex/age variation without returning to malformed or non-overhead art;
- apply the same age/size foundation to deer and other wildlife before adding
  their reproduction.

Gate:

No calf is born without traceable eligible parents, conception, and completed
gestation. Removing or sterilizing the only mature bull prevents new
pregnancies. A calf is visibly smaller, consumes age-appropriate feed, becomes
a juvenile, and eventually reaches adult eligibility through save/load-stable
state.

### R8.4 — Civic death, burial, and security

Build:

- create persistent resident and animal corpses with identity, condition,
  ownership, hauling rules, exposure effects, and respectful/utility disposal;
- add player- or architect-designated cemetery plots, constructed graves,
  grave capacity, digging, hauling, burial, markers, mourning, and later
  exhumation or cremation policy;
- add a watch house, gatehouse, armory, training yard, muster point, patrol
  coverage, response-time audit, and an explicit policy for household versus
  barracks sleeping;
- reserve the cemetery away from wells, food handling, and future housing, and
  place military services against actual routes and defensive approaches.

Gate:

A death produces a physical corpse and a complete, inspectable chain through
grave designation and burial. Guards have equipment storage, a duty location,
sleeping policy, patrol coverage, and a measured response path rather than only
an abstract repeating patrol.

### R8.5 — Settlement master plan

Build:

- persist a master plan before further specialist sites are approved;
- define civic/common, residential, food/agricultural, storage/logistics,
  industrial, hospitality, health, military, cemetery, road, and expansion
  districts with allowed and discouraged uses;
- score adjacency and separation: fields -> granary -> mill -> bakery;
  pasture -> stable; timber -> carpenter; ore/fuel -> forge; inn -> main road;
  infirmary -> housing; forge/oven -> fire-separated industrial access;
- reserve roads, entrances, cart turning space, firebreaks, utilities,
  defensive approaches, future lots, and building expansion before approving a
  site;
- make each architect survey validate its candidate against the master plan and
  require the reeve to approve any exception with a visible reason.

Gate:

Across five seeds, the architect produces a coherent persisted district plan,
then sites all required buildings inside their valid service relationships
without blocking roads, fields, defense, burial, or future growth. The player
can inspect why each building belongs where it was placed.

### R8.6 — Demography, relationships, and civic cohesion

Build:

- give every resident a birth date, age, life stage, health and reproductive
  state, origin, household, parents, children, siblings, guardians, partners,
  and persistent arrival/birth/departure/death history;
- add infant, child, adolescent, adult, and elder schedules, permissions,
  needs, care, education, apprenticeship, work eligibility, and dependency;
- maintain a sparse relationship graph with kinship and mentorship history plus
  event-backed familiarity, trust, affection, respect, attraction, fear,
  obligation, and grievance;
- create plausible encounters from co-location, households, work, meals,
  worship, recreation, travel, danger, aid, conflict, and civic events without
  scanning every resident pair each tick;
- model mutual courtship, partnership, cohabitation, separation, household
  formation, conception, pregnancy, birth, recovery, infant care, adoption,
  immigration, emigration, and succession as explicit causal events;
- derive belonging, solidarity, institutional trust, faction pressure, and
  social tension from people, relationships, material conditions, fairness,
  shared institutions, and collective events rather than a free town bonus;
- expose the evidence and consequences in resident, household, institution,
  and town receipts while preserving privacy and knowledge boundaries for
  visitor dialogue.

Gate:

No partnership forms without reciprocal state and repeated opportunity; no
birth occurs without a valid family path, gestation or adoption event,
guardianship, household, and safe placement. Children progress through care and
education before adult work. Death, departure, separation, and migration update
households, roles, housing, inheritance, grief, and relationships exactly once.
A deterministic multi-generation proof can explain every bond and cohesion
change from supporting events and never performs an all-pairs per-tick scan.

### R8.7 — Multi-season and growth proof

Run a five-seed, multi-season proof after R8.0–R8.6. It must demonstrate
bounded physical storage, full employment accounting, repeated crop cycles,
seed continuity, livestock generations, death/burial recovery, military
coverage, coherent regional expansion, life-course and household change,
event-backed relationships, survival, and exact save/load continuity. Add
deterministic 10-, 50-, 150-, and 400-resident scale fixtures plus a multi-year
lineage fixture. A watched Unity run must confirm storage zones, crop stages,
calf/adult scale, civic districts, regional routes, and social/life-stage state
at the appropriate cell or planning zoom.

Apply every layer in `stonebridge-town-richness-validation.md`: evidence and
reference invariants, vertical chains, resident purpose, facility/spatial
logic, longitudinal ledgers, counterfactual recovery, a black-box adventurer
visit, and watched presentation. Retain the machine-readable receipts and
human-readable causal report as proof artifacts.

Implementation order: R8.0 regional substrate; finish R8.1 storage and work
ledger; R8.2 crops; R8.3 livestock; R8.5 master planning; R8.4 burial and
security; R8.6 demography and social systems; R8.7 proof. Chunk identity,
coordinates, persistence, and tier contracts come first so storage zones,
fields, wildlife, deposits, buildings, districts, households, and journeys do
not bind themselves to the obsolete camera-sized world. Master-plan schema may
begin beside R8.2/R8.3, but no new specialist building should bypass the R8.5
district contract.

## R0 — Deterministic proof harness

Build:

- Allow a canonical founding run identity so independently created runs share
  stable resident, project, stock, job, and reservation identities.
- Expand the audit with real needs, minimum need values, critical residents,
  housing and bed capacity, food stock, facilities, project status, idle state,
  and current blockers.
- Record production, consumption, cancellation, blocking, congestion, and
  purposeful/idle time over the complete run.
- Compare independently created runs at fixed checkpoints.
- Make the farmstead gate pass repeatedly in isolation and in the full suite.

Gate:

Ten fresh runs from the canonical snapshot produce identical checkpoint hashes,
material ledgers, assignments, construction order, needs, and final outcome.
The audit returns a failing exit status when any required survival condition is
not met.

Status: complete at checkpoint 3. The canonical proof uses ticks 0, 100, 250,
and 500; the broader seed and duration matrix remains an R7 release gate.

## R1 — Founding critical path

Build:

- Replace fixed-site assumptions with deterministic architect search,
  validation, reservation, and visible rejection reasons.
- Keep foresters producing raw wood, haulers supplying exact elements, and
  skilled builders working supplied elements concurrently.
- Make stock thresholds serve the next project instead of permanently
  outranking food and housing.
- Preserve access while doors, gates, walls, fences, floors, and roofs close.
- Remove duplicate and stale project-assistance claims.

Gate:

A zero-building run establishes one lumber yard and one complete farmstead with
a working gate. No resource is injected, copied, lost, or consumed remotely;
no resident or project remains permanently blocked.

## R2 — Minimum viable survival

Build:

- Add physical temporary sleeping places or founding shelters.
- Produce and construct beds rather than granting abstract capacity.
- Build one valid home with floor, walls, door, supported roof, storage,
  kitchen, table, chairs, and reachable beds.
- Add declared exhaustion, starvation, exposure, incapacity, and recovery
  rules.
- Allow critical food, shelter, sleep, and danger work to interrupt at safe
  action boundaries.

Gate:

Ten founders complete a full day with traceable meals, valid sleeping
locations, shelter, and every survival need above its declared danger threshold.

## R3 — Persistent construction and derived architecture

Build:

- Complete the one-identity lifecycle for foundations, floors, walls, doors,
  gates, roofs, fixtures, damage, repair, cancellation, and deconstruction.
- Derive enclosure, rooms, shelter, residence capacity, storage, pasture, and
  facility readiness continuously from finished primitives.
- Remove remaining whole-project compatibility effects.
- Add exact prioritize, suspend, cancel, repair, and deconstruct controls.

Gate:

No building, room, residence, pasture, capacity, or facility exists without the
complete physical evidence that justifies it. Save/load preserves every identity
and quantity at every construction state.

## R4 — Food and domestic logistics

Build:

- Model field preparation, sowing, growth, harvest, hauling, storage, cooking,
  meal placement, eating, seed preservation, pasture access, and animal care.
- Add filtered, prioritized stockpile cells and truthful container contents.
- Construct a roofed storehouse with bounded floor storage, higher-capacity
  shelving, item-category policies, reachable aisles, and accountable
  quartermaster work; outdoor stock remains temporary and capacity-limited.
- Build household kitchens and storage as independent objects.
- Replace `communal_kitchen` with a physically constructed inn.

Gate:

Every consumed food unit has a traceable origin, location, transformation, and
consumer. Production exceeds consumption across repeated multi-day runs without
rescue stock.

## R5 — Scheduler, congestion, and presentation timing

Build:

- Retain valid jobs through atomic action boundaries.
- Bound retry, cancellation, suspension, and reopening behavior.
- Classify every wait as useful rest, contention, missing input, blocked access,
  schedule policy, or truthful idle.
- Harden yielding and route recovery without teleportation.
- Buffer authoritative actor positions in Unity and interpolate continuously at
  the selected simulation cadence.

Gate:

No healthy resident is unexplained for a full day, no permanent blocked job
remains, headless/normal/fast modes choose identical actions, and watched Unity
movement has no move-stop cadence.

## R6 — World-state readability and pawn presentation

Build:

- Finish connected construction silhouettes, material stacks, frames, floors,
  roofs, stock contents, crops, animals, damage, and work effects.
- Complete the asset registry and replace missing runtime keys.
- Add cached modular pawn appearance, directional locomotion, carrying, and
  authoritative work states.

Gate:

At overview zoom, a reviewer can identify object class, material, lifecycle
state, footprint, carried item, and worker action without relying on letters or
debug text.

## R7 — Survival and growth release gate

Run:

- repeated 500-tick founding diagnostics;
- ten deterministic one-day runs;
- repeated three-day and longer survival runs;
- save/load at blueprint, delivery, frame, sleep, harvest, and meal states;
- one watched Unity replay of the exact canonical run;
- performance and allocation measurements at each scale.

Gate:

Existing residents repeatedly survive without starvation, dangerous exhaustion,
invalid sleeping locations, hidden resources, unexplained idleness, permanent
blockage, or database work during live ticks. Population growth remains disabled
until this gate passes.

## Implementation progress — checkpoint 48 / usable regional observation and mayor geography

The earlier 1,024×1,024 claim was incomplete: the engine could generate cells
outside the founding window, but the player could not reliably traverse retained
windows and the mayor did not possess an actionable regional geography. This
checkpoint records that failure and replaces the UI-only interpretation of
"large world" with one shared regional contract.

The Unity camera now streams fixed 140×84 observation windows across the bounded
region. Shift+WASD advances by 24 world cells per accepted input, ordinary drag
panning streams a neighboring window near its edge, founding mode also accepts
left-drag, and observation centers clamp at the true regional border. The native
client was visibly driven from the founding settlement east across adjacent
chunks to the Stonebridge River and its timber bridge; the village did not move
and the simulation was paused there for review.

The new in-game Regional Survey screen exposes the full 1,024×1,024 boundary,
32×32 chunk scale, current observation window, trunk road, river, and surveyed
resource sites. Its source records are also persisted in the mayor's master
plan. Each record names its chunk, resources, one-way cell distance, round-trip
tick cost, trip class, and dispatch status. The river crossing is an authorized
82-cell day trip (164 ticks round trip); the western limestone ridge is a
160-cell expedition (320 ticks round trip) and is explicitly blocked until a
field camp, food reserve, and return route exist. This prevents the scheduler
from treating remote stone as if it were beside the town.

Proof: five focused regional/Unity/mayor tests pass, retained windows clamp at
both world corners, the function-length audit reports 1,340 functions with 136
template exemptions and zero violations, and the macOS Unity player builds
successfully. The broad suite remains at its previously known seven failures;
this checkpoint introduced no eighth failure.

This is not yet autonomous regional extraction. R8.0 still needs persistent
chunk discovery/fog-of-knowledge, expedition jobs with carried provisions and
overnight camps, travel-aware job scoring against local alternatives, remote
resource depletion, and hauling chains back into bounded town storage.

Phase checkpoint: R0 and R2 remain complete. R1 and R3 remain revalidating. R4,
R5, R6, and R8 remain in progress; this work advances R8.0 from a render-only
substrate to player- and mayor-visible geography. R7 remains blocked by the
seven existing release failures and their repeated-run proofs.

## Implementation progress — checkpoint 49 / generated watershed replaces the demo map

The fixed pond and intersecting two-road founding template is retired for new
`regional_v3` runs. A seed now determines a variable-width meandering main
river, two tributaries, banks and floodplain, rock, meadow, grass and woodland
cover, and one irregular dirt trail. The founding-site selector surveys the
whole region for flood-safe ground 36–56 cells from fresh water rather than
placing every settlement at the legacy origin. The mayor's surveyed crossing
now uses that selected site's global coordinates.

The launch gate explicitly rejects a pond tile, a second road/crossroads column,
or a start with no visible water. The canonical v5 launch exposes 823 water
cells, zero pond cells, three waterway polylines, and a single curved trail whose
widest road column is three cells. The macOS client was rebuilt and visually
inspected in both settlement and regional-survey views: the settlement view has
a broad irregular river and one dirt trail, while the regional view shows the
main river, both tributaries, and that single trail. Run
`df7eac09-6fda-4a58-ade3-04c7d2d64754` then began at Day 1 dawn.

Proof: all five focused regional generation/projection tests pass, the Unity
macOS build succeeds, and the strict function-length audit reports 1,367
functions with zero non-template violations. The broad suite's seven previously
known behavioral failures remain release blockers; this checkpoint adds none.

Phase checkpoint: R0 and R2 remain complete. R1 and R3 remain revalidating. R4,
R5, and R6 remain in progress. R8 remains in progress, with generated regional
geography and terrain-aware founding now implemented and visibly validated. R7
remains blocked by the seven existing release failures and repeated-run proofs.

## Implementation progress — checkpoint 50 / terrain-aware founding plans

The v5 watched run exposed a real contract split: regional terrain rendered
water and rock correctly, but fixed legacy field rectangles were displayed
before terrain validation and the architect did not classify exposed rock as a
construction blocker. This allowed plan overlays to cross the river and made
buildings appear eligible for mountain ground. The same run also exposed a
rendering defect where every rock cell drew an identical pair of ovals, turning
large rock regions into repeated rows of coins.

New regional-v3 founding plans now survey each grain and vegetable footprint,
including its two-cell circulation and sightline apron. Every accepted cell must
be outside water, riverbank/floodplain, regional rock, and the dirt trail. The
farmstead blueprint consumes those surveyed boundaries rather than the legacy
field coordinates. Exposed `outdoor_rock` is now an architect construction
blocker for every structure. Rock generation combines broad elevation with
smaller-scale ruggedness, producing bounded ridges and outcrops rather than
solid slabs; the Unity fallback draws sparse deterministic surface stones over
rock ground rather than an identical boulder on every tile.

Clean v6 run `436c3fd3-73f2-407a-add9-23ae7c3c04d2` was inspected in the native
client. Both fields and their aprons are wholly west of the river and clear of
rock and roads; trees inside the designation remain intentional clearing work.
The macOS client rebuilt successfully. Four focused generation/architecture
regressions pass, and a broader relevant set passes ten of eleven checks. The
remaining failure—requiring every farm fence segment before pasture
completion—is pre-existing and remains a release blocker rather than a terrain
planning regression. The strict function audit remains green at zero violations.

Phase checkpoint: R0 and R2 remain complete. R1 and R3 remain revalidating; this
checkpoint fixes terrain-aware site validation but leaves the known farm-fence
completion defect open in R1. R4, R5, R6, and R8 remain in progress. R7 remains
blocked by the seven known behavioral failures and repeated-run proofs.

## Implementation progress — checkpoint 51 / hidden geology and finite quarry proof

The regional-v3 mayor and inspector no longer reveal stone or ore merely because
a mountain cell exists. The master plan records only an unprospected rocky ridge
with no resource list. Each rock face remains generically inspectable until a
persisted prospecting action reveals its material, actor, tick, and finite yield.
The architect now approves an exposed building-stone face only after proving its
work edge is reachable from the settlement; that exact site is persisted so
reloads and later quarry work cannot silently select a different deposit.

After the complete survival core (lumber workshop, farmstead, communal kitchen,
and permanent housing), the carter can perform the survey and the woodcutter can
collect one of two reusable founding pickaxes. One quarry action produces exactly
three stone, depletes that face to zero, and leaves a visible quarried-rock scar.
Stone is placed in a named 6×4 quarry yard with ten-unit cell allowances and a
36-unit total logical limit; it no longer creates an unbounded invisible pile.

Focused proof covers hidden pre-survey material identity, persisted prospecting,
reachable NPC job assignment, reusable tools, exact output, finite depletion,
visible terrain change, bounded storage, and save/load. The relevant 46-test
regional, Unity, storage, guard, and economy set passes. The strict audit reports
1,396 functions, 136 declarative exemptions, and zero over-30-line violations.
The saved v6 native run migrated in place at tick 2,379 with two pickaxes, zero
stone, generic ridge knowledge, and no geology job released before its survival
prerequisites. Visual review still flags the exposed mountain-ground edge as too
geometric; that remains active R6/R8 art work rather than a claimed completion.

Phase checkpoint: R0 and R2 remain complete. R1 and R3 remain revalidating. R4
advances with bounded quarry storage and finite stone; R5 and R6 remain in
progress; R8 advances with hidden geology and reachable remote work. R7 remains
blocked by the seven known behavioral failures and repeated-run proofs.

## Implementation progress — checkpoint 52 / generic mountain-face rendering

Regional rock now projects a four-direction exposed-edge mask without exposing
any geological material. The rebuilt native client draws dark cliff bands and a
lighter irregular lip only along mountain boundaries, varies the generic rock
ground subtly by coordinate, and retains sparse surface stones in the interior.
The result reads as one coherent mass with a mineable face instead of identical
ore-like tokens tiled across a flat gray field. Iron, copper, tin, and building
stone remain absent from all pre-prospecting names and descriptions.

The native macOS player rebuilt successfully and was restarted on the saved v6
run. Successive observed frames show settlers moving, survey work completing,
and farmstead construction starting at Day 2 11:45. The full regression suite
now reports 329 passing and exactly the same seven documented failures; the new
mountain, hidden-geology, and NPC quarry proofs pass. Visual asset audit and the
strict 30-line audit also pass, with 1,400 functions and zero violations.

Phase checkpoint: R0 and R2 remain complete. R1 and R3 remain revalidating; the
live run is actively constructing the farmstead. R4, R5, R6, and R8 remain in
progress, with R6/R8 advanced by generic cliff rendering and concealed mineral
identity. R7 remains blocked by the seven known behavioral failures and release
proofs.

## Implementation progress — checkpoint 53 / assisted completion and watched QA

An assisted founding project can now close through the same physical evidence
as its primary builder. When common builders finish the last real element, the
parent project derives its final facts, creates its conserved output, applies
the facility effect, returns reusable tools, releases reservations, and reaches
the legal completed lifecycle instead of remaining indefinitely available. The
hands-off founding proof now reaches planted food before private housing.

The founding forester pool now truthfully matches its skills: the woodcutter,
herder, and innkeeper may all clear approved building and field sites. The
farmstead fence proof distinguishes pasture completion from the separate crop
field boundaries and supplies its tree-clearance prerequisite explicitly before
testing every planned, delivered, framed, and completed fence segment.

The native v6 run was visibly resumed after a stalled Observe client and advanced
from Day 2 16:57 to 18:03. The lumber workshop remains complete and roofed; the
farm boundaries, pasture, bridge, generic unrevealed ridge, moving residents,
and new housing approval are visible. The full suite now reports 332 passing of
337, reducing the release blockers from seven to five without adding a new
failure. The strict audit reports 1,403 functions, 136 declarative exemptions,
and zero over-30-line violations; `git diff --check` is clean.

Phase checkpoint: R0 and R2 remain complete. R1 and R3 remain revalidating, with
the assisted completion and farm-fence blockers removed. R4, R5, R6, and R8
remain in progress while the watched run builds housing and progresses toward
the full town and quarry. R7 remains blocked by five known behavioral failures
and repeated-run release proofs.

## Implementation progress — checkpoint 54 / green regression baseline

The remaining five regression failures are resolved. Assisted completion now
explicitly leaves specialist facilities in their commissioning lifecycle, and
final inspection or repair duties can preempt lower-priority construction. A
deliberately damaged forge therefore receives a physical repair, a fresh
architect inspection, an operator inspection, and only then becomes operational.

Housing proofs now follow the household-aware master plan rather than the retired
fixed 22×16 prototype. A one-person founder household receives a 10×8 cottage
with capacity for two, two real beds, two chairs, storage, cooking, table, two
exits, supported roof, and one spare place for future growth. Work-site identity
is tested at the architect-selected position, including when a resident passes
over that cell, and intermediate fixtures remain usable before commissioning.

The complete test suite passes 337 of 337. The strict function audit remains at
1,403 functions with zero non-template violations; the visual registry audit
passes all 36 accepted runtime assets with no missing, provisional, or unreferenced
files. The native v6 run was saved, the server restarted onto the repaired code,
and the same run resumed visibly at Day 3 01:38 with residents sleeping inside
the roofed lumber workshop and housing/farm construction retained.

Phase checkpoint: R0 and R2 remain complete. R1 and R3 now have a green complete
regression baseline but remain under live-run revalidation until the physical town
finishes. R4, R5, R6, and R8 remain in progress. R7 has no remaining code-test
failures; repeated-run, full-town, visible quarry, and final release proofs remain.

## Implementation progress — checkpoint 55 / five-town release closure

The founding population is now three persisted families rather than ten unrelated
households. Their three cottages provide ten permanent places, while the common
building crew, reeve, role permissions, and individual needs remain authoritative.
Construction now respects element dependencies: shell and floor work may proceed
in parallel, but roofs require a shell and fixtures require the enclosing shell,
floor, and roof. Completed fixtures become usable immediately without falsely
commissioning an unfinished building. Reusable tools are returned whenever work
completes or blocks on full output.

The full-town stall was traced through two real resource cycles. First, a relocated
house overlapped the old bulk yard, so finished lumber now uses a separate 22×2
rack district with a finite 100-unit allowance per rack cell and a 4,000-unit
logical ceiling. Second, some seeds filled the log camp while a field clearer held
the shared axe. Full-output production now releases its actor, reservations, and
reusable input, allowing the sawyer to convert logs and reopen field clearing.
Recurring economy jobs also use persisted monotonic sequences instead of IDs based
on retained job count, so history pruning cannot silently collide with old work.

The release proof passes five distinct seeds. Each town completes the lumber
workshop, farmstead, three family homes, communal kitchen, granary, stable, mill,
forge, carpenter workshop, bakery, infirmary, and inn; every objective is roofed
and commissioned. Each completed town then runs 2,400 natural ticks with minimum
hunger 66.386, minimum fatigue 86.45 or better, safety 100, zero invalid or
unsheltered sleeping ticks, zero permanent blocks, bounded conflict-free storage,
visible physical resources, valid food provenance, and exact save/load hashes.
Qualification finishes between ticks 14,948 and 17,174 without resource injection.

Hidden geology remains enforced. Before prospecting, the native client shows only
generic mountain ground, exposed cliff edges, and a sparse surface-rock treatment;
stone or ore identity is absent from names, descriptions, plans, stockpiles, loose
materials, and carried items. Focused proof confirms persisted prospecting, a
reachable villager quarry job, exact three-stone output, the bounded 6×4 quarry
yard, and permanent finite depletion. Fresh native run
`812759e6-e005-44c1-b969-cf0bccfe582b` replaced the legacy watched settlement and
was inspected on the broad regional-v3 map at Day 1 08:32.

Final QA is green: 339/339 tests, all five full-town runs, 36/36 accepted runtime
visual assets with no missing or provisional entry, 1,406 audited functions with
zero non-template functions over 30 lines, and a clean whitespace diff check.

Phase checkpoint: R0, R1, R2, R3, and R7 are complete. R4 and R5 remain in
progress for deeper multi-season domestic economics and richer employment timing;
R6 remains in progress for animation and final art quality; R8 remains in progress
for the proper-village, visible-quarry, civic, demographic, and multi-season growth
program. Population growth remains disabled until R8.6 and R8.7 are proven.

## Implementation progress — checkpoint 56 / real regional scale and continuous observation

The earlier 1,024×1,024 region failed its visible scale test. Although the engine
could generate those coordinates, regional features were concentrated near the
founding core and the client changed 140×84 snapshots in 24-cell pages. That made
the declared world feel like another bounded demo. This checkpoint records that
failure rather than treating the size constant as proof.

The authoritative region is now 4,096×4,096 cells: 128×128 stable 32-cell chunks
and 16,777,216 deterministic coordinates without allocating a full-region grid.
The founding and hamlet planning envelopes expand to 512 and 1,024 cells. New
and migrated mayor plans use this same regional contract. Tributary placement,
reach, trail latitude, founding-site candidates, river lookup, and rock-source
search now derive from or clamp to the authoritative bounds instead of retaining
the old central 1,024-cell assumptions.

The first client implementation still failed review because it page-flipped
between server snapshots. That behavior has been replaced. Dragging moves the
camera locally, Shift+WASD provides eased tap motion and continuous held motion,
and adjacent windows begin streaming before the camera reaches their edge. When
a 140×84 backing window changes, the camera is translated by the exact origin
delta so the same world coordinate remains under the viewer instead of snapping
back to the new window center. Direct regional-map observations intentionally
recenter. The HUD reports the current view coordinate and `140×84 OF 4096×4096`;
the regional survey adds a scale grid and retains the precise viewport marker.

Native watched proof moved east from the founding settlement, crossed a streamed
window boundary while preserving visual direction, and then moved vertically
through untouched deterministic woodland. The view center changed from +35 to
+88 during the streamed handoff without moving a resident or advancing time as
part of observation. Both retained-window corner tests and all seven focused
regional-v3/substrate tests pass. The macOS player builds successfully and the
strict audit reports 1,412 functions with zero non-template functions over 30
lines.

The expanded latitude initially exposed two invalid old assumptions: one cliff
test inspected the founding window instead of the surveyed ridge, and one seed's
nearest naturally noisy rock mass was 388 cells away, so the quarry correctly
refused to pretend it was local. The generator now includes a coherent irregular
regional ridge alongside the watershed. Founding selection requires nearby water,
safe ground, and a reachable building-stone face; the repaired seed prices stone
at 76 cells and completes prospecting, physical quarrying, bounded storage, and
finite depletion. Existing unprospected saves refresh this generated source when
the regional generation version changes, while revealed deposits remain fixed.
The complete suite is green at 339/339, `git diff --check` is clean, and the final
strict audit reports 1,413 functions with zero violations.

Phase checkpoint: R0, R1, R2, R3, and R7 remain complete. R4 and R5 remain in
progress. R6 remains in progress despite this camera improvement because final
motion and art quality are not closed. R8 remains in progress: this materially
advances R8.0 regional scale and observation, but active/warm/cold simulation,
chunk deltas, civic systems, demography, and multi-season growth are not complete.

## Implementation progress — checkpoint 57 / animal generations and truthful town focus

The old cattle shortcut is removed from the breeding path. Completing a breeding
job now starts a calendar-dated pregnancy only when one eligible mature female
and male exist. Birth waits for the species gestation or incubation period and
records mother, father, generation, birth day, deterministic natural-death day,
and juvenile life stage. Pregnancy and lineage survive the exact save/load path;
removing the only mature bull blocks cattle conception. Juveniles occupy one
cell and project a reduced rendered scale rather than reusing an adult cattle
footprint.

The shared species contract covers domestic cattle, pigs, sheep, dogs, and
chickens plus deer, wolves, wild boar, and brown bears. The initial population
contains both sexes for every species. It uses 283 days for cattle gestation,
114 for pigs, 150 for sheep, 63 for dogs and wolves, 21 for chicken incubation,
200 for deer, and 115 for wild boar. Lifespan ranges are stored in days and are
not shortened merely to make a quick demo birth. Biological inputs were checked
against the Merck Veterinary Manual, West Virginia University aging-animal care
guidance, NC State sheep guidance, University of Minnesota poultry guidance,
and Animal Diversity Web species accounts.

Seven new original transparent overhead assets are accepted and shipped for
pig, sheep, dog, chicken, wolf, wild boar, and brown bear. The Unity renderer no
longer maps every non-deer animal to cattle. Watched native proof shows cattle,
pigs, sheep, and chickens together at gameplay scale without the previous dark
green base patch. The first watched review also exposed that `Center Town` used
the removed adventurer's remote saved position. The protocol now projects the
average living-resident focus and the rebuilt client recenters on the actual
settlement.

Focused lifecycle, persistence, regional-camera, and visual-registry checks pass.
The complete suite is green at 345/345, and the final focused matrix passes
87/87. The accepted visual audit
contains 43 runtime assets with no missing, provisional, or unreferenced entries.
The strict audit covers 1,440 functions with zero non-template functions over 30
lines, and `git diff --check` is clean.

This does not close R8.3. Species-specific pens, coops, kennels and pasture
compatibility; feed and water consumption; nursing and weaning; health and
fertility policy; carrying-capacity enforcement; adult sex-specific art;
predator/prey behavior; seasonal wildlife carrying capacity; corpses; and
multi-generation multi-season proof remain open. Bear inclusion is provisional
until its ecology and threat behavior are observed rather than merely spawned.

Phase checkpoint: R0, R1, R2, R3, and R7 remain complete. R4 and R5 remain in
progress. R6 advances through seven accepted animal assets and corrected watched
focus but remains in progress for motion, sex/age variation, and final art QA.
R8 remains in progress; this checkpoint materially advances R8.3 but does not
close it or the broader active/warm/cold, civic, demographic, and seasonal gates.

## Implementation progress — checkpoint 58 / finite husbandry and welfare policy

The animal roster now participates in a finite husbandry economy rather than
remaining decorative. Domestic animals consume species- and age-scaled feed once
per calendar day from a bounded `stable_feed` stockpile. The initial settlers
bring sixty units with a sixty-unit limit, the farm store explicitly permits that
item kind, and every daily withdrawal records need, consumed quantity, coverage,
day, and source stockpile. Shortfalls increase animal hunger; sustained hunger
reduces health and can kill an animal. Repeated simulation calls on the same day
cannot double-charge feed.

Housing now declares compatible species and carrying units. The existing pasture
is cattle-and-sheep compatible instead of silently accepting pigs and chickens,
and animals without assigned compatible housing remain in their tether range
rather than being teleported into the first pasture. Conception checks the
projected litter against compatible completed capacity. Birth records dependency
through the species weaning day; mothers retain their dependent offspring IDs,
and cattle lactation is calendar-bounded. Daily lifecycle processing releases
weaned or dead offspring from the mother's nursing list.

Production targeting now respects the animal itself. Milk work selects only a
mature, healthy, lactating cow; it cannot select a bull. Culling excludes pregnant
and nursing animals and will not remove the last adult of either sex needed for a
breeding population. Hunt work remains species-targeted. These rules are used by
both job readiness and the eventual job target, removing the former discrepancy
where a valid aggregate count could still select an invalid individual.

Four new behavioral proofs cover once-daily finite feed, starvation consequences,
sex/family-aware production, and carrying-capacity refusal. The accepted visual
audit remains green at 43 assets with no
missing, provisional, or unreferenced runtime sprite. The strict audit covers
1,452 functions with 136 declarative exemptions and zero non-template functions
over 30 lines; `git diff --check` is clean.

The feed chain is renewable rather than a larger hidden starting allowance. Once
the farmstead operates, the herder can conserve two units of harvested grain into
ten units of animal feed while preserving six grain for human food and seed
security. The job is posted only below the feed threshold, claims real input and
output storage, and exercises animal-husbandry skill. A focused proof follows the
grain withdrawal, daily animal consumption, feed output, and skill practice. The
complete suite after this supply-chain addition is green at 350/350.

R8.3 remains open. The architect must still plan and physically build a pig pen,
sheepfold, chicken coop, and dog kennel without delaying founding shelter or
seasonal crops; each needs walkable access, feed storage, finite water, shelter,
and visible fixtures. Water consumption, grazing seasons, eggs/wool/manure,
predator-prey behavior, wildlife carrying capacity, carcasses, disease, and a
watched multi-generation proof also remain. Adult male/female and juvenile art
variants remain an R6 art task even though every species already has accepted
original base art.

Phase checkpoint: R0, R1, R2, R3, and R7 remain complete. R4 and R5 remain in
progress. R6 remains in progress for motion and sex/age art variants. R8 remains
in progress; R8.3 now has finite feed, family welfare, compatibility, and capacity
contracts, but it is not complete until the physical housing, water, ecology, and
watched multi-generation gates pass.

## Implementation progress — checkpoint 59 / regional camera is actually traversable

The declared 4,096×4,096 region was not a usable player-facing world. The
retained 140×84 window could stream when driven by repeated Shift+WASD, but the
normal town controls gave no useful feedback, short taps lurched, ordinary WASD
did nothing, rapid drag events could be missed by frame polling, and the Region
button was covered by the simulation toolbar at the native window size. The size
claim was therefore technically true and experientially false.

The native camera now accepts ordinary WASD and arrow keys while the adventuring
party is absent, uses small smooth steps, and reserves Shift for six-times-fast
regional travel. Drag motion is handled from Unity GUI drag events instead of
requiring the player and Update loop to overlap on several polling frames. The
HUD reports the camera's actual stable world coordinate rather than only the
retained window center. Camera, council, regional survey, and simulation controls
no longer overlap, so the regional overview and its existing click-to-observe
navigation are visible.

Watched proof began at camera `+35,-129`, crossed successive streamed windows in
both axes, and ended at `+152,-106`. The settlement left the screen while new
forest and the regional river entered it; residents did not move with the
camera. This proves real traversal beyond the founding rectangle. Direct mouse
drag still needs confirmation with a human-duration gesture because the desktop
automation emits mouse-down, movement, and release too quickly for a reliable
Unity visual assertion; keyboard traversal and viewport streaming are visibly
proven rather than inferred from dimensions.

The macOS Unity player rebuild succeeds. All 29 Unity protocol/regional tests
pass, including retained-window browsing and both world-corner clamps. The
visual registry remains green with 43 accepted runtime assets, the strict audit
covers 1,456 functions with 136 template exemptions and zero violations, player
logs contain no new exceptions, and `git diff --check` is clean.

Phase checkpoint: R0, R1, R2, R3, and R7 remain complete. R4 and R5 remain in
progress. R6 remains in progress for animation and sex/age art variants. R8
remains in progress: this closes the immediate player-navigation defect in R8.0,
but R8 as a whole still requires the physical livestock campus, water and
ecology systems, active/warm/cold regional simulation, civic/demographic work,
and the watched multi-season release proof.

## Implementation progress — checkpoint 60 / predictive regional streaming

Watched traversal exposed a smaller pause at retained-window boundaries. Direct
measurement on the developed live save showed why: each camera handoff projected
11,760 cells, synchronously generated and serialized 1.3–2.0 MB, and took
1.3–1.8 seconds while normal simulation snapshots competed for the same engine.
This was the periodic delay visible during long pans.

The projection path now indexes physical buildings, fixtures, residents,
animals, loose materials, construction surfaces, storage positions, crop areas,
and forage locations instead of repeatedly scanning their full collections for
each cell. Procedural terrain seed hashes are cached; CPU profiling had shown
seed hashing alone dominating the regional request. On the same developed save,
four distant windows now complete in 0.16–0.20 seconds. The Unity camera also
uses its smooth-pan destination to request the next retained block before the
camera arrives, turning the loaded window into a moving directional ring rather
than waiting at its edge.

Native watched proof traversed from the founding camera at `+35,-129` through
forest, river, and ridge windows to `+500,-79`, with horizontal and vertical
movement both exercised while paused and while the simulation ran. Thirty fast
direction inputs and the resulting streamed render completed in roughly one
second during the paused proof; twenty more inputs while running completed in
under a second. The simulation was then paused and saved on the distant ridge
view. No resident moved with the camera and no blank seam or old founding map
reappeared.

All 46 focused Unity, regional, food, and storage regressions pass. The first
full run exposed six unsafe within-tick lookup caches affecting guard evidence
and newly quarried stone; those caches were removed or keyed to collection
changes rather than weakening the proofs. The repaired full suite passes
352/352. The macOS Unity build succeeds, `git diff --check` is clean, and the
strict function audit covers 1,462 functions with 136 template exemptions and
zero violations.

Phase checkpoint: R0, R1, R2, R3, and R7 remain complete. R4 and R5 remain in
progress. R6 remains in progress. R8 remains in progress, but the immediate
R8.0 player-navigation and periodic stream-stall defect is now materially fixed;
true active/warm/cold chunk simulation and the remaining R8.3–R8.7 gates are not
being claimed complete.

## Implementation progress — checkpoint 61 / livestock campus and finite water

The specialist stable was failing honestly but unnecessarily. Its physical hall
and four species-specific yards require 521 lumber, while the council commission
still authorized only 320. The approved budget is now 600 lumber; labor remains
within its existing allowance. A fresh qualification built and commissioned the
roofed stable, pig pen, sheepfold, chicken coop yard, and dog kennel yard, then
continued through every remaining approved specialist building. All objectives
completed after 20,270 accelerated work ticks without resource injection.

Domestic animals now have species-scaled daily water needs as well as finite
feed needs. The bounded animal-water reserve is consumed once per day, records
need, consumption, coverage, and provenance in the husbandry ledger, and empty
troughs raise thirst and cause health loss. Water is not silently regenerated:
below its threshold the herder receives a visible river-water job, travels to
the established water point, replenishes bounded trough storage, and practices
animal husbandry. The filled-vessel return leg is not yet separately animated
and remains a visual-accounting follow-up. Focused proofs cover daily
conservation, duplicate-call refusal, dehydration consequences, and the
completed refill job.

The complete single-town release proof now passes. It constructs and commissions
all founding and specialist buildings, then survives a natural 2,400-tick day
with minimum hunger 66.386, fatigue 89.36, and safety 100. There are zero invalid
or unsheltered sleeping ticks, no permanent blocked jobs, no storage overflow or
structural conflicts, and the strategy, geology-visibility, food-provenance, and
save/load gates pass. This is executable evidence, not yet the required watched
multi-season livestock proof.

Phase checkpoint: R0, R1, R2, R3, and R7 remain complete. R4 and R5 remain in
progress. R6 remains in progress for fluid person/animal motion and sex/age art
variants. R8 remains in progress: R8.3 now has physical species housing, finite
feed and water, bounded capacity, sex-aware breeding, lineage, gestation,
incubation, nursing, weaning, lifespan, and welfare-aware production. Grazing
seasons, eggs/wool/manure, predator-prey ecology, disease/carcasses, and a watched
multi-generation multi-season proof remain before R8.3 can close.

## Implementation progress — checkpoint 62 / livestock products close real loops

Livestock products are now scheduled, bounded work rather than decorative
inventory. Healthy housed hens lay one collectible batch per hen per day;
healthy housed cattle produce one collectable manure batch per animal per day;
and mature sheep can be shorn only once per 180 days. Milk is now explicitly
limited to once per eligible cow per day as well. Every collection targets the
persisted animal instance, records its production day, uses the herder's time,
and practices animal husbandry. Dehydrated, starving, immature, unhoused, or
unhealthy animals cannot produce.

The outputs now participate in the wider village. Eggs receive food-provenance
batches and the innkeeper can convert two eggs into two cooked meals at a real
kitchen. Wool occupies bounded farm storage; the traveling merchant buys only
the renewable surplus above a two-unit village reserve and conserves coin and
stock in the normal trade ledger. Manure occupies bounded storage, is consumed
by a farmer's field-fertilizing job, raises persisted plot fertility by twenty
points, and reduces the next crop's growth time. Each harvest removes ten
fertility points, preventing a permanent free bonus.

An integration run exposed that sheep could be assigned to a completed
sheepfold while their physical coordinates remained in the founding pasture,
making shearing unreachable. Housing installation now places every compatible
animal at a distinct valid interior housing cell and updates its home range.
This removes the contradictory world state. The transition is currently part of
facility commissioning; a visibly animated herder-led relocation journey is
still required before the presentation gate can claim that transition complete.

Focused development, founding, food, storage, economy, and trade proofs pass.
The strict function audit covers 1,472 functions with 136 declarative
exemptions and zero violations; `git diff --check` remains clean.

The complete suite passes 358/358. A fresh no-injection town qualification
completed every required building in 20,280 ticks and then passed its natural
2,400-tick day: minimum hunger 66.386, fatigue 89.27, and safety 100; no
permanent blocked work; no storage conflict, overload, disallowed allocation,
or overflow; and strategy, geology visibility, food provenance, and save/load
all remain green. The live native client is connected to the rebuilt server and
left paused on the centered founding view.

Phase checkpoint: R0, R1, R2, R3, and R7 remain complete. R4 and R5 remain in
progress. R6 remains in progress for fluid motion and animal sex/age variants.
R8 remains in progress. R8.3 now proves housed production and downstream food,
fertility, and trade loops, but animated relocation, grazing seasons,
predator-prey ecology, carcasses/disease, and watched multi-generation and
multi-season behavior remain open.

## Implementation progress — checkpoint 63 / physical animal transfer and five-town repair

Stable commissioning no longer teleports animals into their permanent yards.
Each compatible animal records a pending pasture and remains at its real world
position until a herder accepts a species-specific transfer. The herder walks to
the animal, leads it one cell behind through the world, enters the correct gate,
and only then commits its persisted home range and interior position. Focused
proof observes more than eight distinct animal positions, `animal_led` events,
the final `animal_relocated` event, and a destination physically inside the
correct enclosure. Pigs, sheep, chickens, and dogs all use this same contract.

The integrated product loop is also green. Housed healthy hens, sheep, and cattle
produce bounded eggs, wool, and manure at their declared cadence. Eggs retain
provenance through kitchen cooking, wool enters the merchant's conserved surplus
trade, and a farmer consumes stored manure to restore persisted field fertility.
Finite feed, trough water, housing capacity, sex-aware reproduction, lineage,
nursing/weaning, maturity, lifespan, and welfare restrictions remain intact.

The first five-town qualification rejected the build at four passes out of five.
Release seed 3 held 218 available wood units but stalled because a hauler carrying
four conserved lumber units could approach an unfinished perimeter wall only from
the house interior. Completed neighboring walls made that single work square
unreachable. Static navigation now releases empty-handed workers after repeated
failed assignments, and a loaded construction delivery can approach the same
physical element from any reachable side. No material is injected, lost, or
duplicated, and the element claim remains authoritative.

The repaired five-seed qualification passes. The towns complete every founding
and specialist objective at 20,249, 22,109, 20,142, 20,040, and 22,231 accelerated
work ticks respectively, then each passes a natural 2,400-tick day. Minimum hunger
is 66.386, minimum fatigue is 88.55, and safety remains 100. Across all five runs
there are no permanent blocks, invalid or unsheltered sleeping ticks, storage
conflicts/overloads/overflow, strategy violations, hidden-resource leaks,
food-provenance failures, or save/load mismatches. The final complete regression
suite passes 363/363, including the physical animal-transfer and construction
routing coverage. The strict audit covers 1,487 functions with 136 declarative
exemptions and zero violations, and
`git diff --check` is clean.

Phase checkpoint: R0, R1, R2, R3, and R7 remain complete. R4 and R5 remain in
progress. R6 remains in progress for fluid pawn/animal motion and sex/age art
variants. R8 remains in progress. R8.3 now has a physically truthful livestock
campus, husbandry inputs and products, real relocation, and five-town compatibility
proof. Seasonal grazing, predator/prey ecology, carcasses and disease, plus the
watched multi-generation and multi-season gate remain before R8.3 and R8 close.

## Implementation progress — checkpoint 64 / finite seasonal grazing

Pastures now hold persisted finite forage rather than serving only as decorative
movement bounds. Forage capacity derives from the usable enclosure interior,
daily grazing removes conserved units, and each season has a distinct regrowth
rate: spring is strongest, summer slows, autumn slows again, and winter regrowth
is zero. The 360-day season cycle repeats deterministically across save/load.

Feed accounting is per animal. Cattle and sheep can meet ninety percent of their
daily ration from available grass, pigs and chickens can forage a smaller share,
and dogs require supplied feed. Stored feed covers only the remaining need, so
good pasture genuinely saves grain without becoming a free complete ration.
Juvenile and nursing demand modifiers still apply. When forage and stored feed
are both insufficient, each animal receives its own coverage result and suffers
the existing hunger and health consequences.

Pasture state is visible rather than debug-only. Fence and gate inspection in the
native projection reports the pasture name, current forage units, capacity, and
season, and the compact client cells expose the same authoritative values.
Focused proof covers spring feed displacement, slower summer growth, zero winter
growth, bare-winter stored-feed consumption, starvation behavior, and native
inspection. The complete regression suite passes 367/367. The strict audit covers
1,498 functions with 136 declarative exemptions and zero violations, and
`git diff --check` is clean.

Phase checkpoint: R0, R1, R2, R3, and R7 remain complete. R4 and R5 remain in
progress. R6 remains in progress for fluid motion and animal sex/age variants.
R8 remains in progress. R8.3 now includes finite seasonal grazing; predator/prey
ecology, wildlife carrying capacity, carcasses, disease, and watched
multi-generation/multi-season proof remain open.

## Implementation progress — checkpoint 65 / wildlife ecology, carcasses, and animal care

Wildlife now advances through a persisted daily ecology rather than respawning
from a short tick timer. Spring births, seasonal habitat capacity, and bounded
migration replenish deer and wild boar without exceeding the current carrying
capacity. A two-animal refuge floor prevents hunters and predators from erasing
either prey population. Wolves and bears select persisted prey, pursue it one
cell at a time, place the target in a visible fleeing state, and can leave a
physical fresh carcass at the kill position.

Carcasses remain in the world with traceable cause, killer, and death day. Fresh
remains spoil after three days, become bones after ten, and disappear after
thirty. Hunted or slaughtered animals instead become dressed remains because the
conserved meat has already entered bounded storage; this prevents one death from
implicitly producing food twice. The native projection identifies carcasses and
emits a distinct dead pose. The rebuilt client compiles that pose successfully;
a watched predator-kill/dead-pose sequence is still required before the visual
gate can close.

Domestic animals now face deterministic disease pressure from winter, depleted
pasture, overcrowding, and nearby carcasses. Hoof rot, respiratory infection,
and parasites reduce health over persisted multi-day courses. A sick animal
posts urgent work independently of the current mayor development order. A
herder travels to that exact animal, consumes one finite apothecary remedy,
practices animal husbandry, and records treatment and recovery in the disease
ledger. Sick livestock rest instead of continuing ordinary wandering.

The first full regression exposed a stale fence-construction fixture: the
physical farmstead now requires 410 lumber while the test supplied 400, so it
spent the remaining window correctly sawing five-unit batches rather than
testing only fence assembly. The fixture now supplies enough material to isolate
its declared construction behavior; independent sawmill and no-injection town
proofs still cover production throughput.

The complete regression suite passes 373/373. The strict audit covers 1,525
functions with 136 declarative exemptions and zero violations, and
`git diff --check` is clean. Unity 6000.5.10f1 rebuilt the macOS client
successfully, the server was restarted on the new code, and the visible client
reconnected to the persisted regional run.

Phase checkpoint: R0, R1, R2, R3, and R7 remain complete. R4 and R5 remain in
progress. R6 remains in progress for fluid pawn/animal motion, dead-state watched
proof, and sex/age variants. R8 remains in progress. R8.3 now has seasonal
grazing, wildlife carrying capacity and migration, predator pursuit, conserved
carcass processing/decay, disease, and physical treatment. It still requires a
watched multi-generation and multi-season qualification before closure; R8.4–
R8.7 also remain open.

## Implementation progress — checkpoint 66 / readable sex and life-stage art

The domestic livestock projection no longer uses one interchangeable picture per
species. Cattle, pigs, sheep, dogs, and chickens each have accepted transparent
adult-female, adult-male, and juvenile overhead sprites. The differences are
anatomical rather than label-only: bulls have heavier horns, boars are heavier
and tusked, rams have curled horns, the dog pair differs in build and coat, and
roosters have a larger comb and tail. Juveniles retain smaller bodies and softer
features. The generated atlas and all fifteen project-bound cutouts are retained
under `UnityClient/Assets/VillageSpriteSources`; runtime copies are imported from
`Resources/VillageSprites` with genuine alpha and no terrain-colored ground
patch.

The authoritative Unity protocol selects these assets from persisted species,
sex, and life stage. Adult cows in a fresh run project as distinct female and
male asset keys, while a calf born after a traceable conception and gestation
projects as the juvenile key. Wildlife continues to use its accepted species
art until the corresponding sex/age variation is added.

Unity rebuilt successfully with all fifteen textures. A watched daytime native
view at gameplay zoom visibly showed the brown female and black male dogs as
different animals, retained the correct smaller-than-pawn scale, and showed no
green or brown base patch. Zooming from the regional view into the livestock
area was smooth. This is adult-sex presentation evidence; a watched calf-aging
sequence and dead-pose sequence remain open.

The complete suite passes 374/374. The strict audit covers 1,526 functions with
136 declarative exemptions and zero violations, and `git diff --check` is clean.

Phase checkpoint: R0, R1, R2, R3, and R7 remain complete. R4 and R5 remain in
progress. R6 remains in progress for fluid motion, wildlife sex/age variants,
and watched juvenile/dead-state sequences. R8 remains in progress. R8.3 now
meets the domestic adult sex-art requirement and has a tested juvenile asset
path, but still needs the watched multi-generation/multi-season qualification;
R8.4–R8.7 remain open.

## Implementation progress — checkpoint 67 / authoritative regional simulation tiers

The regional map now has persisted simulation state rather than projecting every
visible chunk as falsely active. UUID-backed 32×32 chunk records cover the active
settlement, a warm surrounding belt, a cold preloaded belt, surveyed sources,
physical stockpiles, and every resident and animal location. Each chunk records
its tier, discovery tick, next checkpoint, resident/animal identities, bounded
stock quantity and container identities, and open scheduled work. Tier changes
are retained in a bounded transition ledger.

People and assigned distant work activate their real chunk and immediate
neighbors. Unassigned work and known sources remain warm. Remote wildlife no
longer makes its entire neighborhood simulate at full rate: active animals move
at the normal twelve-tick cadence, warm animals at one-tenth that frequency,
and cold animals at one-hundredth, while daily lifecycle and ecology accounting
remain authoritative. Active checkpoints refresh every tick, warm checkpoints
every ten ticks, and cold checkpoints every hundred ticks. A tier transition
forces an immediate conserved checkpoint rather than carrying stale detail into
the new tier.

Camera observation is explicitly read-only. Panning to a distant untracked area
projects stable cold chunk identities but does not add an active simulation
anchor, move any entity, advance time, or mutate the regional ledger. Assigning
a real remote job promotes its destination from warm to active independently of
the camera. Save migration and SQLite restoration retain the complete tier,
checkpoint, transition, entity, stock, and scheduled-work state exactly.

Five focused regional proofs cover all three tiers, camera non-interference,
remote-work promotion, checkpoint cadence, remote-entity cadence, and exact
save/load restoration. The complete regression suite passes 379/379. The strict
audit covers 1,554 functions with 136 declarative exemptions and zero functions
over thirty lines; `git diff --check` is clean.

Phase checkpoint: R0, R1, R2, R3, and R7 remain complete. R4, R5, and R6 remain
in progress. R8 remains in progress. This establishes the R8.0 simulation-tier
foundation, but R8.0 still requires persisted per-chunk terrain/resource/
ownership deltas, physical remote outbound and return journeys, chunk-delta/LOD
transport, and watched native tier-boundary validation before closure. R8.3
still requires the watched multi-generation/multi-season qualification; R8.4–
R8.7 remain open.

## Implementation progress — checkpoint 68 / quarry stone now returns through the world

Remote quarry output no longer appears instantly in town storage when mining
finishes. The worker exhausts the finite revealed rock face, creates the
persisted quarried-rock terrain change, physically carries the three-unit stone
load along the measured route to its compatible bounded stockpile, deposits it,
and then returns the shared pickaxe. The town inventory remains unchanged while
the stone is in transit; the normal output-capacity reservation continues to
protect its destination.

The in-transit state is explicit and inspectable: the job records
`return_output`, the worker exposes the carried stone, the regional tier follows
the assigned traveler instead of the camera, and save/load retains both the job
phase and carried item exactly. Target validation no longer mistakes an already
mined rock face for a missing work target during the return leg. Only arrival at
the physical store emits the production and remote-output-stored events and
changes stock quantity.

The integration proof now runs the unassisted scheduler for the whole chain.
The carter walks the outbound prospecting route and surveys the face; the
woodcutter later collects a shared pickaxe, walks the separate mining route,
performs the full six-hour work budget, and carries the result home. It observes
more than eight distinct positions in each outbound survey, quarry, and loaded
return phase, proves zero premature stock creation, round-trips the loaded
worker through a save, verifies the exact three-unit deposit, returns both
shared pickaxes, and confirms that geology is depleted and the mined opening
persists. The complete regression suite passes 379/379. The strict audit covers
1,559 functions with 136 declarative exemptions and zero functions over thirty
lines; `git diff --check` remains clean.

Phase checkpoint: R0, R1, R2, R3, and R7 remain complete. R4, R5, and R6 remain
in progress. R8 remains in progress. This closes the false remote
quarry-accounting shortcut and proves natural outbound and return geology travel
in R8.0. Regional camps and risk, persisted chunk terrain/resource/ownership
deltas, chunk-delta/LOD transport, and watched native boundary validation remain
before R8.0 can close. R8.3 still requires watched multi-generation and
multi-season qualification; R8.4–R8.7 remain open.

## Implementation progress — checkpoint 69 / persisted chunk deltas and LOD summaries

Regional checkpoints now index the physical world state inside each 32×32 chunk,
not only its actors and aggregate stock. The persisted delta covers terrain
changes; constructed buildings, primitives, and fixtures; bounded stockpiles,
crops, pastures, forage, surveyed sources, and revealed geology; plus planned
district and field ownership. Resource state entries retain quantity, stage,
status, remaining deposit units, and pasture forage where applicable. Every
content set receives a deterministic revision UUID that changes when an object
is added, removed, depleted, regenerated, built, or changes state.

The Unity protocol now applies explicit regional detail levels. An active chunk
projects its full persisted delta; a warm chunk projects revision and category
counts; a cold chunk projects only the same overview metadata. A camera window
over an as-yet untracked area remains a stable cold overview and still cannot
create simulation state. This establishes a revisioned delta/LOD contract while
preserving the current procedural terrain window; server-side changed-revision
subscription and native cache reuse remain to replace every redundant payload.

Focused proof creates a real cleared-ground modification at a resident's
position, advances the active checkpoint, observes its UUID in the correct
chunk, and proves the delta revision changes. A separate native-protocol proof
selects real active, warm, and cold chunks and verifies full, summary, and
overview payloads respectively. The strengthened geology proof now uses a fixed
run UUID so scheduler tie-breaking is repeatable; it passed twice in isolation
and in the full run. The complete regression suite passes 381/381. The strict
audit covers 1,569 functions with 136 declarative exemptions and zero functions
over thirty lines; `git diff --check` is clean.

Phase checkpoint: R0, R1, R2, R3, and R7 remain complete. R4, R5, and R6 remain
in progress. R8 remains in progress. R8.0 now has deterministic regional
generation, stable chunks, active/warm/cold simulation, conserved checkpoints,
camera-independent observation, natural remote quarry travel, persisted
physical deltas, and three-level projection. Remaining R8.0 work is regional
camp/risk policy, client revision caching/changed-delta requests, and watched
native tier-boundary continuity. R8.3 still requires watched multi-generation
and multi-season qualification; R8.4–R8.7 remain open.

## Implementation progress — checkpoint 70 / native cell streaming and smooth traversal

The native client now caches both regional simulation deltas and the rendered
32×32 terrain/cell chunks needed to reconstruct its 140×84 observation window.
Every cell chunk has a deterministic revision derived from its physical records,
storage allocations, residents, animals, field surveys, and time-sensitive crop
growth. The server checks that lightweight revision before generating cells, so
an unchanged known chunk is neither regenerated nor retransmitted. The client
keeps a bounded 96-chunk least-recently-used working set, advertises only its 48
most recent revisions, restores omitted chunks from cache, and rebuilds the
visible row-major cell array without changing the renderer contract.

Live HTTP measurements against the persisted town prove the difference. A cold
24-chunk observation was 3,006,027 bytes and 475 ms. Repeating the same view was
271,842 bytes and 7 ms: all 24 cell chunks were reused, a 90.96% payload
reduction. Moving exactly 32 cells east transferred only the four newly entered
chunks and completed in 71 ms at 645,419 bytes, a 78.53% reduction. The older
simulation-delta-only cache had reduced the 1.64 MB response by just 0.79%, so
the measured dominant repeated-cell payload—not merely the smaller metadata
delta—has now been removed.

The rebuilt Unity 6000.5.10f1 macOS client was watched while paused. It crossed
roughly 230 cells east and 145 cells north, traversing several chunk boundaries
in both axes without the prior periodic frozen/loading cadence, missing terrain,
or a reset to the small founding map. It displayed continuous forest, river,
and mountain terrain at the destination and returned through the cache to the
same physical town intact. The client is left paused on that useful town view.

Two regression proofs cover changed-only cell streaming and the repeated-payload
collapse. The regional identity proof now also requires every persisted chunk
ID to be a unique UUID. The complete suite passes 384/384. The strict audit
covers 1,595 functions with 136 declarative exemptions and zero functions over
thirty lines; `git diff --check` is clean, and the Unity player build succeeded.

Phase checkpoint: R0, R1, R2, R3, and R7 remain complete. R4, R5, and R6 remain
in progress. R8 remains in progress. R8.0 now has measured changed-only native
cell transport and watched horizontal/vertical tier-boundary continuity in
addition to its authoritative simulation tiers, persisted deltas, and physical
quarry return. It is not closed: regional camps and travel risk, remote timber/
hunting/ore end-to-end gates, and architect construction beyond the founding
window still require physical proofs. R8.3 still requires watched multi-season
and multi-generation qualification; R8.4–R8.7 remain open.

## Implementation progress — checkpoint 71 / governed remote travel and journey receipts

Remote geology work now passes a persisted dispatch assessment instead of being
authorized from distance metadata alone. The assessment records Manhattan route
distance from the settlement hub, round-trip tick budget, day-trip/expedition/
outpost class, required food, field-camp requirement and supporting camp UUID,
risk score and readable band, approval state, and assessment tick. A trip beyond
the 96-cell day-trip limit is refused unless an operational field camp exists
within 32 cells of its destination. A qualifying camp both authorizes the trip
and reduces its risk score; the 192-cell expedition boundary remains explicit.

Once assigned, a worker's actual route is counted one physical step at a time by
job phase. Every 24 walked steps adds a risk check, and the latest physical move
is retained. Prospecting records completion at the revealed source; quarrying
does not record success until its carried stone reaches bounded town storage.
Each completed trip writes one UUID-backed receipt to a bounded regional journey
ledger with job, destination, assessment, actual phase steps, outcome, and
completion tick. The assessment and ledger survive exact save/load and are part
of the mayor's persisted regional context.

The natural quarry proof now requires an approved low-risk day trip, more than
24 physically observed travel steps, at least one risk check, a
`remote_journey_completed` event, separate prospecting and quarry receipts, and
a final `stored` outcome only after the three-unit load arrives. A policy proof
also demonstrates that a 240-cell outpost is refused without a camp and approved
with a nearby operational camp, with the expected risk reduction.

The complete suite passes 385/385. The strict audit covers 1,602 functions with
136 declarative exemptions and zero functions over thirty lines;
`git diff --check` is clean. The running server has been restarted on this code,
and the native client remains paused on the town review view.

Phase checkpoint: R0, R1, R2, R3, and R7 remain complete. R4, R5, and R6 remain
in progress. R8 remains in progress. R8.0 now has enforceable remote dispatch
risk and conserved journey accounting, but a field camp still needs a natural
architect/build/supply proof rather than only a policy fixture. Remote timber,
hunting, ore, and outside-envelope construction gates also remain before R8.0
can close. R8.3 still requires watched multi-season and multi-generation proof;
R8.4–R8.7 remain open.

## Implementation progress — checkpoint 72 / physical regional field camp

An expedition camp is now a real architect-selected construction project rather
than a policy record. Work beyond the configured day-trip limit first creates a
persisted UUID-backed camp designation near the remote source. The architect
searches for a terrain-valid five-by-four footprint and rejects otherwise-valid
sites whose door cannot be reached from town. Qualified common builders may
execute the plan, so the protected farmer can continue seasonal food work while
another founder establishes the expedition base.

The ordinary construction pipeline supplies and consumes real lumber one
element at a time. The finished camp has a timber shell, floor, supported roof,
opposite entrance and escape doors, a physical bed, bounded storage cache, and
hearth. Only completion of that physical evidence changes the camp from planned
to operational and authorizes the distant geology work. The camp identity,
global position, supported destination, building and evidence UUIDs, fixtures,
and completion tick persist in the regional context and its owning chunk delta.
The builder's outbound movement contributes actual journey steps and periodic
risk checks; completion no longer pretends the shared hammer has already been
returned, and the parent job remains in its truthful return-input phase until it
is back in storage.

The focused integration proof runs the normal scheduler from a founding state,
observes more than twenty distinct builder positions, verifies physical material
delivery, proves no prospecting job appears before the camp is operational, and
checks the roof, two exits, three fixtures, completion event, chunk identity, and
exact save/load. A separate architect regression proves that a valid but
unreachable footprint is rejected and relocated. The regional suite passes
41/41 and the complete suite passes 387/387. The strict audit covers 1,609
functions with 136 declarative exemptions
and zero functions over thirty lines; `git diff --check` is clean.

Phase checkpoint: R0, R1, R2, R3, and R7 remain complete. R4, R5, and R6 remain
in progress. R8 remains in progress. This closes the physical field-camp
construction gate within R8.0. It does not close R8.0: expedition food must be
conserved, remote workers must actually use camp sleep, travel-risk checks need
real consequences and recovery, and timber, hunting, ore, and clearly
outside-founding-window construction still require end-to-end physical proofs.
R8.3 still needs watched multi-season and multi-generation qualification;
R8.4–R8.7 remain open.

## Implementation progress — checkpoint 73 / conserved expedition provisions

A roofed camp no longer authorizes remote work while empty. After construction,
the camp enters a truthful built state and the scheduler posts a separate
high-priority supply job. The carter physically collects prepared meals from the
inn, walks them to the camp's bounded cache, and only then makes the camp
operational. The camp records its required and available food units in the same
persisted regional identity projected into its chunk delta.

Travel assessment now requires a nearby operational camp with enough food for
the calculated round trip. A nominally operational but undersupplied camp is
refused. When a remote geology job is posted, its exact expedition ration is
reserved once from the supporting camp and retained on the job; a UUID-backed
event records camp, quantity, and remaining supply. This prevents one meal cache
from silently authorizing unlimited expeditions and causes the next journey to
request a real resupply when the cache is depleted.

The natural camp proof now observes both the built and provisioned milestones,
matches the camp ration to the food-ledger withdrawal performed by the supply
job, advances into remote dispatch, and proves the ration leaves the camp and is
attached to the prospecting job. The policy proof separately refuses a camp one
unit below its two-unit requirement. The complete suite passes 387/387. The
strict function audit covers 1,613 functions with 136 declarative exemptions
and zero functions over thirty lines; `git diff --check` is clean.

Phase checkpoint: R0, R1, R2, R3, and R7 remain complete. R4, R5, and R6 remain
in progress. R8 remains in progress. R8.0 now has physical camp construction,
physical resupply, and conserved dispatch rations. It is not closed: the worker
must route through and use the camp rather than only reserve its supplies,
multi-day expeditions must use the camp bed, risk checks need consequences and
recovery, and remote timber, hunting, ore, and outside-envelope construction
still require end-to-end physical proofs. R8.3 still needs watched multi-season
and multi-generation qualification; R8.4–R8.7 remain open.

## Implementation progress — checkpoint 74 / camp waypoints and overnight expeditions

Provisioned remote jobs now route through their supporting camp before starting
work. Arrival is a physical waypoint with an observed worker position, persisted
visit tick, and UUID-backed event; a no-input survey can no longer skip the camp
merely because its production step begins as `produce`. Once food is committed,
the expedition receives continuity priority above ordinary hauling but below
critical survival and danger work, preventing a paid-for trip from starving in
the available queue indefinitely.

Rest and survival behavior now follow the expedition context. A remote worker's
old home-sleep intention is cancelled and retargeted to the camp bed. The bed is
a sheltered physical fixture under the supported camp roof. The worker walks to
it, sleeps for the ordinary eight-hour life-job duration, gains fatigue and
safety recovery there, and resumes the suspended expedition after rest. The
camp does not become a residence and the worker retains their permanent home.

Reusable expedition tools no longer teleport back to town when work suspends at
night or for a critical need. The carried tool remains with the worker, survives
the camp sleep, and is returned through the normal physical return-input phase
only after the expedition completes. The end-to-end proof builds and provisions
the camp, routes and rests the prospector there, completes the survey, performs
a second physical resupply, sends the quarry worker through the camp, retains
the shared pickaxe overnight, completes the finite quarry/stone return, and
finally restores both pickaxes to town storage. Exact camp save/load remains
proven after both trips.

The life, architecture, and regional suites pass 61/61, and the complete suite
passes 387/387. The strict audit covers 1,619 functions with 136 declarative
exemptions and zero functions over thirty lines; `git diff --check` is clean.

Phase checkpoint: R0, R1, R2, R3, and R7 remain complete. R4, R5, and R6 remain
in progress. R8 remains in progress. R8.0 now has real camp waypoints, camp-bed
sleep, expedition continuity, conserved provisions, and non-teleporting shared
tools. It is not closed: risk checks still need concrete incidents/recovery;
remote timber, hunting, and ore each need their own physical end-to-end proof;
and architect construction must be demonstrated clearly outside the founding
viewport. R8.3 still needs watched multi-season and multi-generation proof;
R8.4–R8.7 remain open.

## Implementation progress — checkpoint 75 / deterministic travel incidents and recovery

Remote risk checks now have bounded, deterministic consequences instead of
being inert counters. At each 24th physical travel step, a UUID-seeded roll uses
the trip's persisted risk score. A journey can suffer at most one incident,
classified as rough ground, weather delay, or predator sign according to its
risk band. The incident records its UUID, check number, exact position and tick,
temporary fatigue/safety loss, recovery duration, and status inside the remote
travel record that later enters the journey receipt.

An affected worker stops at their real map position for a short bounded recovery
instead of teleporting, disappearing, or silently continuing. Each recovery tick
is observable; the final tick marks the incident resolved and resumes the same
job and route. These are expedition setbacks rather than invisible combat, so
they do not invent an attacker or force a false town-wide danger pause. The
native activity protocol now explains the visible setback and recovery in plain
English.

The forced high-risk integration proof produces one predator-sign incident on
the camp-supported quarry trip, observes the stationary recovery, proves the
incident resolves, then completes the overnight quarry, stone return, and shared
pickaxe return. The complete suite passes 388/388. The strict audit covers 1,623
functions with 136 declarative exemptions and zero functions over thirty lines;
`git diff --check` is clean.

Phase checkpoint: R0, R1, R2, R3, and R7 remain complete. R4, R5, and R6 remain
in progress. R8 remains in progress. R8.0 now has physical construction,
provisions, camp routing and sleep, non-teleporting tools, and deterministic
recoverable travel risk. It is still open on distinct remote timber, hunting,
and ore workflows plus a clearly outside-founding-viewport architect build.
R8.3 still needs watched multi-season and multi-generation qualification;
R8.4–R8.7 remain open.

## Implementation progress — checkpoint 76 / conserved regional hunting

Regional hunting is now a distinct late-founding expedition rather than a
renamed local food job. It waits behind active prospecting, quarrying, and field
camp work so the town does not abandon its founding sequence or commission a
second camp while the quarry expedition is still underway. Ordinary nearby
hunting remains available during that sequence; once the regional job is
authorized, duplicate local hunting is suppressed until the expedition clears.

The regional hunter selects a specific persisted deer by distance, keeps that
animal UUID as the job target, and receives the standard regional travel plan.
If the range is beyond a day trip, dispatch uses the already-proven physical
camp construction, provisioning, ration, waypoint, sleep, and risk contracts.
On a reachable day trip the worker walks the route directly. The animal becomes
a dressed carcass at the target rather than vanishing, the venison is visibly
carried home, and stock does not receive the expedition output until the worker
reaches bounded compatible storage. The resulting food batch records hunting
provenance back to the exact job, and the regional journey ledger records the
stored outcome. Exhausting the currently approved geology face now also records
an explicit `exhausted` knowledge state so dispatch can advance cleanly to the
next regional resource class.

The end-to-end proof observes more than 32 cells of travel, over 24 physical
steps, the selected deer becoming dead and dressed, carried venison, storage,
the four-unit provenance batch, and the completed journey receipt. Local hunt,
founding food, and founding forestry regressions remain green. The complete
suite passes 389/389. The strict audit covers 1,630 functions with 136
declarative exemptions and zero functions over thirty lines; `git diff --check`
is clean.

Phase checkpoint: R0, R1, R2, R3, and R7 remain complete. R4, R5, and R6 remain
in progress. R8 remains in progress. R8.0 now has an end-to-end physical remote
hunting workflow in addition to its field-camp and quarry contracts. It is
still open on distinct remote timber and ore workflows plus a clearly
outside-founding-viewport architect build. R8.3 still needs watched
multi-season and multi-generation qualification; R8.4–R8.7 remain open.

## Implementation progress — checkpoint 77 / regional timber and finite ore

Forestry now escalates honestly when the founding area's ordinary 48-cell tree
search is exhausted. The shortage is persisted as regional timber pressure,
and a forester selects a real species-bearing tree beyond the local work radius.
The worker takes the shared axe, walks the assessed regional route, physically
fells that exact tree, carries its species-scaled logs home, and adds no timber
to the village account until the load reaches bounded compatible storage. The
tree becomes a persistent stump, the tool returns through the normal physical
phase, and the completed journey records the stored outcome.

Remote mineral work now begins from generic exposed rock and honors the same
fog-of-geology contract as the renderer and mayor. Site selection does not read
the hidden deposit identity. A prospector physically reaches the selected face
and only that persisted action reveals whether it contains iron, copper, tin,
or building stone. A miner can then take a shared pickaxe, exhaust the finite
revealed deposit, visibly carry the exact raw-ore quantity home, and place it in
a separate bounded iron, copper, or tin bin. Each bin is a real inspectable
fixture with a stable container UUID and an accepted storage visual; ore
knowledge, depletion, stock, tool state, and the journey ledger survive exact
save/load.

Regional dispatch now prioritizes construction-blocking timber pressure first,
then food hunting, then ore, so metallurgy cannot starve the settlement. Once a
remote trip is committed, it receives continuity priority above routine hauling
but remains below immediate danger and survival needs. The end-to-end proofs
observe more than 96 timber steps and more than 32 distinct positions, unchanged
stock while output is in transit, physical terrain change, exact conserved
storage increments, carried output, event provenance, and completed receipts.
The ore proof additionally begins with no known deposits and proves that its
tin identity appears only after prospecting.

The complete suite passes 391/391. The strict audit covers 1,646 functions with
136 declarative exemptions and zero functions over thirty lines;
`git diff --check` is clean.

Phase checkpoint: R0, R1, R2, R3, and R7 remain complete. R4, R5, and R6 remain
in progress. R8 remains in progress. R8.0 now has physical regional field-camp,
provisions, sleep, risk, building-stone quarrying, hunting, timber, and finite
raw-ore extraction proofs. It is still open on an architect-selected building
completed clearly outside the founding viewport; raw ore also still needs the
ordinary forge transformation chain before that broader production claim can
close. R8.3 still needs watched multi-season and multi-generation qualification;
R8.4–R8.7 remain open.

## Implementation progress — checkpoint 78 / R8.0 regional construction gate

The final R8.0 construction proof no longer treats a camp inside the original
140×84 observation window as remote evidence. The deterministic test selects a
finite building-stone face beyond the founding window's west edge and requires
the architect to reserve, build, roof, furnish, and provision a five-by-four
field camp there. Its stable global position remains outside the original view,
while its owning chunk, structure identity, fixtures, supplies, and geology
destination persist normally and become visible when that region is observed.

This stricter run exposed and corrected three genuine planning failures. Site
approval had considered a door cell reachable from the future interior even
when its exterior approach would be blocked; every camp entrance and escape
door must now have a town-reachable exterior approach. Common builders could
also close the walls before hanging the door frames, so remote camps now use a
door-first closure dependency. Finally, the pioneer repeatedly carried the
shared hammer home for sleep while establishing the very camp intended to make
remote work possible. After first arrival, the builder now moves their physical
two-cell bedroll beside the unfinished camp, remains homeless, rests there, and
retains the hammer through normal survival interruptions. The bedroll returns
to its ordinary placement after the pioneer job ends.

Remote construction is committed above routine hauling but below danger and
critical survival work. Construction surveys and exterior work positions use
the special remote policy only for `build_field_camp`; ordinary founding
forestry, farming, guard fallback work, milling, foreman reviews, and other
building schedules retain their established behavior. The complete proof spans
multiple real work/rest days, consumes every material delivery, completes a
supported roof and two usable doors, provisions the bounded cache, routes the
prospector through the camp bed and ration contract, physically resupplies the
cache for the quarry trip, and then completes the finite stone journey.

The complete suite passes 391/391. The strict audit covers 1,650 functions with
136 declarative exemptions and zero functions over thirty lines;
`git diff --check` is clean.

Phase checkpoint: R0, R1, R2, R3, and R7 remain complete. R4, R5, and R6 remain
in progress. R8 remains in progress, but R8.0 is now complete: regional extent,
stable chunks, active/warm/cold simulation, changed-only native transport,
panning and zooming, finite timber/hunting/quarry/ore journeys, camp logistics,
and an architect-selected building beyond the founding camera window all have
physical end-to-end proofs. Work now advances to the remaining R8.1 storage and
work-ledger gate, followed by R8.2–R8.7. R8.3 still requires watched
multi-season and multi-generation qualification.

## Implementation progress — checkpoint 79 / R8.1 storage tiers and work truth

Storage policy now distinguishes bare ground, covered floor, lumber racks,
shelves, material bins, granaries, and physical containers instead of treating
every marked cell as the same unlimited square. Each zone persists its tier,
protection, stack-slot count, filters, priority, cells, and per-cell allowance.
Bare ground and covered floor accept one distinct item stack per cell; racks and
shelves can hold several eligible stack kinds; bins and granaries enforce their
material compatibility. Incompatible stock becomes inspectable overflow with a
specific `tier_incompatible` reason rather than silently occupying the cell.

Item definitions now expose stack size, volume, deterioration rate, and
compatible storage tiers for logs, lumber, grain, seed, flour, fish, meat,
stone, and each raw ore. Unity's retained map projects non-default tier,
protection, stack use, capacity use, reservations, and overflow without
breaking the compact snapshot budget. The native inspector understands those
fields and reports tier, protection, and used stack slots. A separate native
input defect had prevented all map inspection whenever the adventuring party
was absent; town cells are now selected before the movement-only adventurer
guard is applied, so removing the adventurers no longer removes inspection.
The rebuilt macOS client is open on the paused live town.

Resident accountability is now persisted rather than reconstructed from a
headline statistic. Each completed job records the actor, job UUID and type,
name, tick, and physical position. Meaning receipts expose primary role,
enabled work, current and top queued jobs, schedule, skills, last completed
work, and a named wait reason. The audit separately counts productive work,
scheduled rest/recreation, ordinary waiting, underemployment, and scheduler
contention. Its full-day proof accounts for all 24,000 resident-ticks across ten
founders during exactly 2,400 simulation ticks, with no unexplained category.

The complete suite passes 396/396, including the outside-window camp, finite
quarry, remote timber, regional hunting, ore, storage, work-ledger, save/load,
and compact Unity protocol proofs. The strict audit covers 1,665 functions with
138 declarative data/template exemptions and zero non-template functions over
thirty lines; `git diff --check` is clean. The native Unity build succeeds.

Phase checkpoint: R0, R1, R2, R3, and R7 remain complete. R4, R5, and R6 remain
in progress. R8.0 is complete and R8.1 is materially advanced but remains in
progress. R8.1 still must derive capacity from volume as well as quantity,
score alternative haul destinations by filters, priority, remaining space,
protection, and travel cost, apply deterioration behavior, and produce a
separate physical loose pile when every destination refuses output. R8.2 and
R8.4–R8.7 remain open. R8.3 remains in progress and still requires watched
multi-season and multi-generation qualification.

## Implementation progress — checkpoint 80 / physical volume, haul cells, and loose piles

Storage capacity now uses item volume and stack size as rules rather than
descriptive metadata. Every allocation consumes physical volume, and each cell
enforces both its volume allowance and its finite stack slots. Building stone
therefore occupies twice the capacity of an ordinary one-volume good, while a
single bare-ground stack cannot exceed that item's stack-size definition.
Multi-purpose physical containers derive enough internal stack compartments
from their declared stock capacities, and designated zones reserve enough real
cells for both volume and stack demand. A fresh founding state no longer spills
starting tools merely because several tool kinds share the camp store.

Haul work now selects and persists an exact compatible destination cell. It
scores priority, remaining physical space, protection, travel distance, and a
stable identity tie-breaker; when capacity differs, useful space wins before a
shorter walk, and distance resolves otherwise equal cells. The logical target
fixture remains the job's authoritative object, while the selected storage
cell becomes the carrier's physical post-pickup destination. This separation
fixed a regression where treating a designated floor cell as the target object
produced a high-priority `target_missing` haul and delayed the quarry expedition.

Rejected or excess output now receives a stable UUID-backed loose-pile record
on its own non-storage cell near the owning zone. It has zero storage capacity,
retains the exact stockpile identity, item kind, quantity, and refusal reason,
and projects as an outdoor `loose_pile`. The native renderer draws the goods
without a storage-zone border and labels them `LOOSE !N`; the inspector names
the pile and explains that no valid storage accepted it. Once valid space
exists the derived pile disappears rather than duplicating inventory. The
resource-visibility audit sums stored and loose portions exactly once, so a
pile cannot hide a carrier or double-count a stockpile.

The corrected complete suite passes 398/398. It includes the full outside-
window camp build, quarry, remote timber, regional hunting, finite ore,
founding sequence, carrier visibility, storage volume, exact haul destination,
loose overflow, work ledger, compact protocol, and save/load proofs. The strict
audit covers 1,682 functions with 138 declarative data/template exemptions and
zero non-template functions over thirty lines; `git diff --check` is clean.
The native macOS Unity build succeeds.

Phase checkpoint: R0, R1, R2, R3, and R7 remain complete. R4, R5, and R6 remain
in progress. R8.0 is complete; R8.1 remains in progress but now has physical
volume, stack limits, within-zone destination selection, separate loose piles,
and the complete work-ledger day gate. Its remaining blockers are destination
choice across multiple compatible zones, actual time-based deterioration and
protection effects, and a watched native inspection of tier/overflow behavior.
R8.2 and R8.4–R8.7 remain open. R8.3 remains in progress and still requires
watched multi-season and multi-generation qualification.

## Implementation progress — checkpoint 81 / protected food deterioration

Storage protection now changes the simulation rather than appearing only as
inspector metadata. Every completed village day applies deterministic food
deterioration from the item's declared decay rate, current quantity, and
physical protection. Dry granary goods deteriorate at one fifth of the outdoor
rate, covered-floor goods at 45 percent, and ordinary fixtures at 35 percent.
Outdoor stock takes the full rate, while rejected goods in a loose pile decay
25 percent faster than ordinary outdoor storage. Fractional deterioration is
persisted per stockpile so small quantities cannot evade spoilage through
rounding.

Spoilage withdraws exact portions from the food provenance ledger before it
decrements the physical stockpile. Each loss records the day, storage
protection, item kind, stockpile UUID, quantity, and source batch portions in
both the ledger and simulation event stream. Save migration begins the clock
at the loaded day rather than retroactively destroying food from an older save.
The focused proof follows equal fresh-fish batches over five completed days and
requires the loose batch to lose more food than the covered batch while both
retain a valid provenance audit.

The complete suite passes 399/399. It includes the 123-second physical remote
camp proof, finite quarry, remote timber, regional hunting, raw ore, founding
priorities, one-day work accounting, storage capacity and overflow, protected
deterioration, save/load, and compact Unity protocol proofs. The strict audit
covers 1,688 functions with 138 declarative data/template exemptions and zero
non-template functions over thirty lines; `git diff --check` is clean.

Phase checkpoint: R0, R1, R2, R3, and R7 remain complete. R4, R5, and R6 remain
in progress. R8.0 is complete; R8.1 remains in progress but now has behavioral
capacity, stack limits, exact within-zone haul cells, visible loose overflow,
work-ledger accounting, and time-based protection-sensitive food spoilage. Its
remaining blockers are destination choice across genuinely separate compatible
zones and watched native inspection of tier, capacity, overflow, and spoilage
behavior. R8.2 and R8.4–R8.7 remain open. R8.3 remains in progress and still
requires watched multi-season and multi-generation qualification.

## Implementation progress — checkpoint 82 / R8.1 closure

The last storage migration and routing gaps are now closed. Schema 4 repairs an
older designated zone whose automatically derived filter predates a newly
introduced good in the same physical store. The migration unions only legacy
filters with the goods that the store now owns; a current-schema empty or
restricted filter remains an intentional refusal. This repaired the watched
Day 3 town's false 59-unit loose-water pile. After migration, the same conserved
water occupies finite accepted cells, no overflow remains, and the native town
was stepped, visually rechecked, and explicitly saved at tick 6,427 with storage
schema 4 and zero loose piles.

Haul selection now searches genuinely separate compatible stockpiles and zones,
not only alternate cells inside one zone. Every candidate remains bounded by
both the cell's physical volume/stack space and the receiving stockpile's
logical capacity. Candidates are compared by zone priority, usable remaining
space, protection, travel cost, and stable cell identity; the selected
destination persists both the exact cell and receiving stockpile. The posting
path excludes the source stockpile, targets the selected store's actual world
object, walks to the selected cell after pickup, and deposits into that same
inventory rather than visually walking to one place while crediting another.

The complete suite passes 401/401, including the 123-second outside-window camp
proof, quarry, remote timber, hunting, ore, founding survival priorities,
storage migration, cross-zone selection, deterioration, full-day work ledger,
save/load, and native protocol. The strict audit covers 1,693 functions with
138 declarative data/template exemptions and zero non-template functions over
thirty lines; `git diff --check` is clean.

Phase checkpoint: R0, R1, R2, R3, and R7 remain complete. R4, R5, and R6 remain
in progress. R8.0 and R8.1 are complete. R8.1 now satisfies bounded physical
capacity, distinct tiers, filters, priority, multi-zone destination choice,
visible overflow, protection-sensitive deterioration, resident accountability,
and the 2,400-tick accounting gate. Implementation advances to R8.2 plant
agriculture. R8.3 remains in progress pending watched multi-season and
multi-generation qualification; R8.4–R8.7 remain open.

## Implementation progress — checkpoint 83 / R8.2 crop lifecycle foundation

R8.2 now has a first physical vertical slice. Crop plots persist germination,
growing, mature, failed, recovered, prepared, harvested, and fallow state rather
than jumping from one sowing timer directly to harvestable. Each coherent field
cohort records growth progress and rate, last evaluated tick, expected maturity
day, fertility, moisture, crop damage, stress, seed batch identity, and current
season/light conditions. Spring, summer, autumn, and winter apply distinct
growth factors; fertility, moisture, and damage multiply the rate. A crop held
at zero growth long enough fails, and the farmer must complete an explicit
recovery action that repairs damage and returns the field to prepared state.
The native projection now carries progress, rate, expected day, fertility,
moisture, and damage for every field cell.

Harvest output no longer teleports into the farm's logical inventory. Grain and
vegetables are created as UUID-backed outdoor field-pile stockpiles at the
worked plot with their exact seed provenance. A normal `haul_stock` order then
selects a bounded compatible destination, reserves one live order per pile,
walks a capable resident to the pile, carries the crop visibly, and deposits the
same batch into farm storage. The established-farm proof requires at least two
physical crop piles, `food_produced` ledger entries at those pile UUIDs, and a
completed haul from a field pile before it accepts stored grain and vegetables.

The first full run exposed redundant harvest jobs being posted every tick for
one pile, which delayed the remote quarry expedition beyond its long gate. Each
pile now owns at most one nonterminal haul order. The isolated 104-second remote
camp/quarry proof then passes, followed by the complete 402/402 suite. The strict
audit covers 1,704 functions with 138 declarative data/template exemptions and
zero non-template functions over thirty lines; `git diff --check` is clean.

Phase checkpoint: R0, R1, R2, R3, R7, R8.0, and R8.1 remain complete. R4, R5,
and R6 remain in progress. R8.2 is in progress: lifecycle stages, seasonal and
field-condition response, visible failure/recovery work, physical harvest piles,
conserved hauling, provenance, and inspector projection are implemented. It
still needs field crop selection/cut controls, genuinely multi-day crop timing,
farmer-skill yield effects, water and disease/damage work, explicit selected
destinations, and the complete seed-to-meal gate. R8.3 remains in progress;
R8.4–R8.7 remain open.

## Implementation progress — checkpoint 84 / R8.2 multi-day crops and skilled yield

Crop time and harvest quantity now represent village work rather than a short
demonstration loop. Grain requires 4,800 simulation ticks, or two complete game
days under ideal conditions; vegetables require 3,600 ticks, or one and a half
days. Seasonal conditions, fertility, moisture, and accumulated damage continue
to affect the actual maturity date. The established-farm integration proof now
advances a controlled two-day interval only after both fields have physically
been prepared and sown, then resumes normal resident work to prove harvest and
hauling rather than waiting thousands of test turns merely to advance the clock.

Harvest quantity now derives from the assigned farmer's farming skill, plot
fertility, and crop damage. The harvested batch remains conserved and carries
its crop and seed provenance into the physical field pile. Each plot persists
the last yield and responsible farmer's skill so a weak or damaged harvest can
be explained after the fact. The proof requires those persisted observations,
the field-pile production receipt, and a completed physical haul into bounded
compatible storage.

The longer growing season exposed a real remote-infrastructure scheduling gap:
once an authorized field camp was underway, temporary founding-core pressure
could stop the expedition between construction and provisioning. Geology work
now preserves continuity for a committed camp while stone remains available,
and its supply job receives the same remote commitment priority. The remote
proof was extended to 9,000 ticks to cover legitimate multi-day farm work and
now observes a resident carry conserved prepared meals to the completed camp
before it becomes operational.

The complete suite passes 402/402, including the 161-second remote field-camp
proof, finite quarry, remote timber, hunting, ore, crop lifecycle, winter
failure/recovery, physical field piles, skilled yields, storage, save/load, and
native protocol. The strict audit covers 1,708 functions with 138 declarative
data/template exemptions and zero non-template functions over thirty lines;
`git diff --check` is clean.

Phase checkpoint: R0, R1, R2, R3, R7, R8.0, and R8.1 remain complete. R4, R5,
and R6 remain in progress. R8.2 is in progress: it now includes genuinely
multi-day timing and farmer-skill, fertility, and damage-sensitive yield in
addition to the prior physical lifecycle and hauling proof. It still needs
player crop selection/sow/cut controls, physical irrigation work, generated and
treated crop disease/damage, explicit haul-destination controls, a complete
multi-day seed-to-meal acceptance gate, and watched native presentation of the
new field inspector evidence. R8.3 remains in progress pending watched
multi-season and multi-generation qualification; R8.4–R8.7 remain open.

## Implementation progress — checkpoint 85 / R8.2 field decisions and irrigation

R8.2 fields are now managed objects rather than automatic background timers.
The town-management protocol can select grain or vegetables on a fallow or
prepared plot, suspend or resume sowing, and order a standing crop cut. A cut is
not an instant data edit: it becomes the next highest-priority physical crop
action, requires a farmer to reach and work the plot, then returns the cohort to
fallow without creating harvest output. The rebuilt native client exposes these
orders in the bottom command bar whenever a crop cell is selected, including a
truthful pending-cut state.

Growing fields now lose moisture at a season-sensitive daily rate. Below the
dry-field threshold, the scheduler posts `water_fields`; a farmer reserves one
finite unit of clean water, collects and carries it through the normal
production-input path, reaches the exact plot, and raises persisted moisture.
The food ledger records the plot, crop, job, tick, and resulting moisture. The
integration proof requires a real `field_watered` receipt rather than directly
calling the effect. It also exposed and repaired an actor-wiring defect in the
harvest completion path: persisted `lastFarmerSkill` now comes from the actual
assigned farmer rather than silently defaulting to zero.

The native field inspector now reads stage, progress, expected maturity day,
growth rate, fertility, moisture, damage, last yield, and responsible farming
skill from the authoritative protocol. Default crop values are omitted when
safe, and the protocol no longer repeats the noninteractive `terrain` object
kind on thousands of ordinary cells. This keeps a full 140×84 retained-mode
snapshot below its existing 1.35 MB budget while preserving all interactive
identities.

The longer farming workload moved legitimate remote construction later. The
remote acceptance window now runs for up to 12,000 ticks and still requires the
same physical proof: every camp element, including roof, bed, hearth, and cache,
must exist before a carter carries a conserved prepared meal over the real
route and the camp becomes operational. The isolated proof passes in 145
seconds and the clean complete suite passes 404/404, including the 151-second
version of that proof. The strict audit covers 1,718 functions with 138
declarative data/template exemptions and zero non-template functions over
thirty lines; `git diff --check` is clean. Unity 6000.5.10f1 rebuilt the native
macOS player successfully. The updated visible Day 4 town is paused, saved, and
left open for review.

Phase checkpoint: R0, R1, R2, R3, R7, R8.0, and R8.1 remain complete. R4, R5,
and R6 remain in progress. R8.2 is in progress: multi-day crops, physical
harvest piles and hauling, skill/fertility/damage yield, crop selection,
sowing suspension, physical cutting, moisture loss, finite-water irrigation,
and native field evidence are implemented. Remaining R8.2 gates are generated
crop disease/damage with physical treatment, explicit selected haul
destinations, a complete multi-day seed-to-meal acceptance trace, and watched
native interaction proof for the new inspector and controls. R8.3 remains in
progress pending watched multi-season and multi-generation qualification;
R8.4–R8.7 remain open.

## Implementation progress — checkpoint 86 / R8.2 crop health and food-chain proof

Field conditions now create consequences without a test directly editing the
result. Daily moisture evaluation gives severely dry crops `drought_wilt` and
over-wet crops `fungal_blight`, adding bounded persisted crop damage that
immediately lowers growth and eventual yield. Once damage reaches the treatment
threshold, the scheduler posts `treat_crop_disease`. A farmer reserves and
carries one finite unit of medicinal herbs, travels to the exact plot, performs
the work there, reduces damage, clears the named disease when successful, and
records the treatment in the food ledger. The rebuilt native inspector names
the active disease beside moisture and damage instead of exposing only a
generic percentage.

The established-farm acceptance proof now follows one coherent multi-day food
chain. A UUID seed batch is consumed when the field is sown; the resulting crop
cohort matures across days; the assigned farmer's skill and the plot's health
determine the harvest; the harvest appears in a physical field pile; a hauler
moves its conserved batch into compatible bounded storage; an innkeeper then
withdraws that exact stored crop batch and creates a cooked meal whose source
points to the crop harvest, whose source in turn points to the original seed.
The same proof requires generated field watering and a completed medicinal-herb
treatment receipt.

The clean complete suite passes 405/405, including the 155-second physical
remote-camp proof, crop controls, multi-day maturity, irrigation, generated
damage, physical treatment, skilled yields, and seed-to-meal provenance. The
strict audit covers 1,721 functions with 138 declarative data/template
exemptions and zero non-template functions over thirty lines; `git diff --check`
is clean. Unity 6000.5.10f1 rebuilt the macOS player successfully. The
updated Day 4 town is paused, explicitly saved, and left open on the review
view.

Phase checkpoint: R0, R1, R2, R3, R7, R8.0, and R8.1 remain complete. R4, R5,
and R6 remain in progress. R8.2 is in progress but its crop simulation vertical
slice is now complete from planning and seed through conditions, intervention,
harvest, hauling, cooking, and provenance. The remaining R8.2 implementation
gate is explicit player-selected haul destinations; the remaining acceptance
gate is watched native interaction with the field inspector and crop controls.
R8.3 remains in progress pending watched multi-season and multi-generation
qualification; R8.4–R8.7 remain open.

## Implementation progress — checkpoint 87 / R8.2 closure

R8.2 now closes with an exact player-selected harvest destination rather than
an automatic suggestion disguised as a choice. Each projected designated
storage square carries its stable cell UUID, zone UUID, and accepted item
kinds. From a selected field, the native player enters harvest-storage mode and
chooses a compatible physical square. The management command validates that
exact square against current filters, stack/volume space, reservations, and
the crop kind, then persists its UUID and coordinates on the plot. An invalid
or incompatible square is refused. When harvest creates the physical field
pile, that choice follows the pile into its haul order; if the selected square
is no longer available, posting waits instead of silently routing the crop to
somewhere the player did not choose.

The native inspection path is now usable at regional zoom. `Inspect field [F]`
cycles to and centers an actual crop cohort while retaining the selected world
coordinate across streamed viewport shifts. The field inspector visibly showed
the watched mature grain cohort at 100% growth with its rate, fertility,
moisture, and damage, and exposed `Cut crop` plus `Storage [H]`. The watched
client also entered `Select crop storage` mode with a cancel affordance. The
exact-cell completion is independently covered at three levels: destination
selection rejects an incompatible lumber cell, the management protocol
persists and projects the chosen grain cell and coordinates, and the
established-farm proof requires the completed physical haul's destination UUID
to equal the player's selected UUID.

The clean complete suite passes 408/408, including the 145-second remote camp
proof, finite quarry, remote timber, hunting, ore, full crop lifecycle,
generated irrigation and treatment, seed-to-meal provenance, exact storage
routing, save/load, and compact native protocol. The strict audit covers 1,730
functions with 138 declarative data/template exemptions and zero non-template
functions over thirty lines; `git diff --check` is clean. Unity 6000.5.10f1
rebuilt the native macOS player successfully. The live town was explicitly
paused and saved on Day 4 at approximately 11:10, then reopened and left paused
on the mature-grain inspector for review.

Phase checkpoint: R0, R1, R2, R3, R7, R8.0, R8.1, and R8.2 are complete. R4,
R5, and R6 remain in progress, and R8 overall remains in progress. Work now
moves to R8.3 livestock qualification: the implemented species, sex, age,
housing, feed, water, disease, products, breeding, lineage, wildlife predation,
and migration systems still need watched multi-season and multi-generation
proof. R8.4–R8.7 remain open.

## Implementation progress — checkpoint 88 / R8.3 closure

R8.3 now closes on a physical, save-stable lifecycle rather than species counts
alone. Born animals retain eligible mother and father UUIDs, generation, sex,
birth day, gestation history, and species timing. A calf is proven through
weaning into an explicit juvenile stage and onward to adult eligibility across
save/load; its name and one-cell juvenile footprint change to the correct adult
sex name and species footprint at maturity. Each transition emits a persisted
life-stage event. Removing the only eligible mature male still prevents a new
pregnancy, and normal feed, water, disease, product, capacity, and welfare rules
remain mandatory regressions.

The multi-generation qualification advances real daily lifecycle and husbandry
for 439 days, crossing every season. It proves healthy second-generation pigs
with traceable parents and preserved welfare. Large litters no longer stack on
the mother's two fallback squares: every newborn is placed in a distinct free
physical housing cell after accounting for every living animal footprint. This
keeps later hauling, treatment, feeding, and inspection spatially truthful.

The native protocol now carries authoritative age stage, sex, and generation
through the final compact actor projection. That repaired a presentation defect
where the juvenile asset was selected but Unity lacked the age stage needed to
apply its smaller scale. The watched native client showed a generation-two
piglet at juvenile scale among adult pigs and exposed both parent UUIDs and its
generation in the animal inspector. `Inspect animal [L]` cycles to and centers
real animals so this evidence remains reviewable without hunting across the
regional map.

The clean complete suite passes 410/410, including the 153-second remote camp
proof, crop and storage chains, livestock husbandry, conception/gestation,
male-removal prevention, calf weaning and adulthood, four-season generation-two
qualification, unique litter placement, save/load, art registry, and compact
native protocol. The strict audit covers 1,733 functions with 138 declarative
data/template exemptions and zero non-template functions over thirty lines;
`git diff --check` is clean.

Phase checkpoint: R0, R1, R2, R3, R7, R8.0, R8.1, R8.2, and R8.3 are complete.
R4, R5, and R6 remain in progress, and R8 overall remains in progress. Work now
moves to R8.4 civic death, burial, and security. R8.5–R8.7 remain open.

## Implementation progress — checkpoint 89 / R8.4 resident burial vertical slice

Resident death now changes the simulation instead of leaving a working pawn with
a hidden status flag. The deceased is removed from the labor pool, assigned work
is cancelled and its claims released, and a persistent corpse retains the
resident UUID, cause, condition, death day/tick, and physical death position.
The native protocol exposes the corpse as an inspectable `resident_corpse` in an
explicit dead pose, so Unity rotates it and suppresses standing/walking motion.

The architect's initial civic response designates a bounded founders' cemetery
with stable grave UUIDs. Candidate sites are rejected when they overlap surface
water, buildings and their circulation buffer, food handling, or agricultural
land. One grave is reserved for the specific corpse. An
eligible common worker physically travels to the grave, performs three digging
steps, returns to the corpse, visibly carries it, travels back, performs burial
labor, and leaves an occupied marked grave linked to that exact corpse. Corpse,
cemetery, grave, burial job, and marker survive serialization. The focused
end-to-end proof passes and requires both the exposed corpse and finished grave
to remain inspectable in the compact native projection.

An exposed resident corpse now changes from fresh to decomposing and then to
remains by elapsed day. Nearby living residents lose safety and morale and keep
a named memory explaining why. After burial, every surviving household member
receives their own routed mourning job, visits the exact grave, spends time
there, records the deceased in memory, and only then gains mourning relief.

Security has also moved beyond a repeating patrol. The approved open-settlement
strategy contains a persistent, inspectable muster point and an explicit calm,
threat, and sleeping-duty policy. Calm adaptive patrols remain focused on homes,
people, and active work instead of spending founding labor walking to the muster
marker every circuit. An immediate threat suspends routine patrol, sends the
guard to muster first, then routes adjacent to the evidence so
the guard does not stand on and hide it. Arrival and resolution ticks are stored
in a response ledger, giving the town a measured response time instead of only
a success flag. Watch house, armory, training yard, and perimeter-dependent
gatehouse are explicit planned facilities, not yet claimed as built.

The clean complete suite passes 412/412, including the 150-second remote camp
proof, the new death-to-grave and household mourning chain, threat mustering,
measured guard response, save/load, and compact native protocol. The strict
audit covers 1,772 functions with 138 declarative data/template exemptions and
zero non-template functions over thirty lines; `git diff --check` is clean. The
main Day 4 town is paused, saved, and open in the native client; no test fixture
remains attached.

Phase checkpoint: R0, R1, R2, R3, R7, R8.0, R8.1, R8.2, and R8.3 remain
complete. R4, R5, R6, R8 overall, and R8.4 are in progress. R8.4 still needs
animal-carcass utility/disposal policy, player cemetery controls and later
exhumation/cremation policy, plus physical construction and operation of the
watch house, gatehouse, armory, and training yard. R8.5–R8.7 remain open.

## Implementation progress — checkpoint 90 / R8.4 animal-remains workflow

Animal death now produces a town decision and physical work rather than a
timer-only prop. A fresh predator kill can be claimed by a resident with the
butchery capability, dressed in place over visible labor steps, carried to the
bounded meat store, and converted into four conserved portions with a food
ledger batch that names the exact carcass as its origin. The job refuses to
create food beyond the store's physical capacity.

Unsafe natural-death, spoiled, and skeletal remains instead create common-labor
work. A resident walks to the exact carcass, visibly carries it away, and
delivers it to a persistent animal-remains pit selected away from water,
buildings, food handling, and agricultural land. The pit is separate from the
resident cemetery, is visible and inspectable in the native projection, and
retains the UUIDs of disposed carcasses. Carried carcasses no longer remain
drawn at their death cell. Both processed and discarded remains retain a
terminal disposition, so a later daily lifecycle pass cannot resurrect them.

Two focused behavior proofs cover fresh-predation recovery, finite stored meat,
food provenance, unsafe-remains hauling, the inspectable pit, next-day terminal
state, and save/load. The clean complete suite now passes 414/414. The strict
audit covers 1,788 functions with 138 declarative data/template exemptions and
zero non-template functions over thirty lines; `git diff --check` is clean.

Phase checkpoint: R0, R1, R2, R3, R7, R8.0, R8.1, R8.2, and R8.3 remain
complete. R4, R5, R6, R8 overall, and R8.4 are in progress. The animal-remains
portion of R8.4 is complete. R8.4 still needs player cemetery controls and the
later exhumation/cremation policy, plus physical construction and operation of
the watch house, gatehouse, armory, and training yard. R8.5–R8.7 remain open.

## Implementation progress — checkpoint 91 / R8.4 physical security facilities

The village strategy now contains architect-authored watch-house, armory, and
training-yard proposals requested and operated by the watchman. Each proposal
has its own non-conflicting eastern site, door, supported roof, circulation,
and at least four functional fixtures rather than being a data-only checkbox.
The watch house also becomes an adaptive patrol anchor once it physically
exists, so the security plan changes visible guard movement.

One representative training-yard commission is proven through the complete
shared production path: specialist proposal, approval, architect survey,
material delivery, physical construction, foreman review, final inspection,
facility registration, defense-plan registration, and save/load. This test
also exposed and repaired two false-completion paths. A roofed shell no longer
satisfies a founding-town specialist proposal before commissioning, and stale
assistants and foreman reviews no longer crowd out the final inspector. Legacy
established maps retain their compatibility building treatment without
weakening the stricter founding-town contract.

The focused security, architecture, and development set passes 69/69. The clean
complete suite passes 417/417, including deterministic replay, the 141-second
remote-camp proof, the representative security commission, and the watch-house
patrol behavior. The strict audit covers 1,790 functions with 138 declarative
data/template exemptions and zero non-template functions over thirty lines;
`git diff --check` is clean.

Phase checkpoint: R0, R1, R2, R3, R7, R8.0, R8.1, R8.2, and R8.3 remain
complete. R4, R5, R6, R8 overall, and R8.4 remain in progress. Security
architecture and its shared physical commissioning path are proven, but this
checkpoint does not claim that all three facilities are already built in the
main saved town. R8.4 next needs operational armory issue/return work, recurring
militia training, the perimeter and gatehouse dependency, and player cemetery
controls with later exhumation/cremation policy. R8.5–R8.7 remain open.

## Implementation progress — checkpoint 92 / R8.4 armory and training operation

Completed security buildings now produce real work. When the commissioned
armory has a physical issue desk and the forge has finished weapon stock, the
watchman walks to the armory, spends time checking out equipment, consumes one
finite weapon, and receives an individually identified issue record. The actor,
source stock, issue tick, and outstanding-return state persist in both an
equipment ledger and the watchman's visible simulation state.

The commissioned training yard now selects a named eligible civilian rather
than incrementing an abstract readiness score. That resident walks to a physical
practice dummy, completes a three-stage drill, gains combat-readiness practice
through the ordinary skill-XP system, and is recorded with the watchman as
instructor. Training rotates toward the least-trained eligible resident and the
next session is not due for another full 2,400-tick day. The equipment and
training ledgers survive save/load.

Focused guard and development QA passes 40/40. The clean complete suite passes
418/418, including exact founding save/load, deterministic replay, the
138-second remote-camp proof, finite equipment consumption, named militia
training, and daily cadence. The strict audit covers 1,802 functions with 138
declarative data/template exemptions and zero non-template functions over
thirty lines; `git diff --check` is clean.

Phase checkpoint: R0, R1, R2, R3, R7, R8.0, R8.1, R8.2, and R8.3 remain
complete. R4, R5, R6, R8 overall, and R8.4 remain in progress. R8.4 has physical
security architecture, representative commissioning, watch-house patrol use,
finite armory issue, and recurring militia practice. It still needs equipment
return and loss handling, construction of all security facilities in the main
town, the perimeter and gatehouse dependency, and player cemetery controls with
later exhumation/cremation policy. R8.5–R8.7 remain open.

## Implementation progress — checkpoint 93 / R8.4 accountable security and gatehouse

Armory custody now covers the entire initial lifecycle. Issued equipment appears
on the watchman's inspector, consumes one exact finished weapon, and remains an
outstanding ledger item. If the watchman dies, a common worker travels to the
physical recovery position, collects the weapon, visibly carries it to the
armory issue desk, and restores the finite stock only when capacity permits. A
missing holder instead produces an explicit loss record; neither return nor loss
silently duplicates the item. Guard scheduling also now tolerates a town with no
living watchman instead of dereferencing one during preemption.

The mayor now evaluates the approved perimeter triggers during the normal
100-tick needs review. Population 25, two danger incidents, or sufficiently
valuable weapon/treasury stores can authorize the perimeter; no wall is ordered
merely because the feature exists. Authorization records the evidence and a
measured boundary around real and approved construction, lays out four gates,
and unblocks the gatehouse from `blocked_by_perimeter` to `planned`.

The watch then submits a requirements-backed gatehouse proposal. Its architect
plan has a supported roof, two opposing exits, gate controls, guard post, alarm,
and equipment storage. The preferred outer door starts at the east boundary;
if terrain or circulation forces a different valid site, council approval
revises the still-unbuilt perimeter rather than leaving the building detached
from its gate. The end-to-end proof constructs and commissions the physical
gatehouse and requires its outer door to equal the persisted east-gate position.

The clean complete suite passes 419/419, including exact founding save/load,
equipment issue/recovery/loss, evidence-based perimeter authorization, and the
physical boundary-aligned gatehouse. The strict audit covers 1,815 functions
with 138 declarative data/template exemptions and zero non-template functions
over thirty lines; `git diff --check` is clean.

Phase checkpoint: R0, R1, R2, R3, R7, R8.0, R8.1, R8.2, and R8.3 remain
complete. R4, R5, R6, R8 overall, and R8.4 remain in progress. R8.4 now has the
four physical security designs, their commissioning pipeline, operational
patrol/armory/training behavior, accountable issue/return/loss records, and an
authorized physical gatehouse aligned to a persisted perimeter plan. It still
needs the palisade itself, every security facility built in the main saved town,
and player cemetery controls with later exhumation/cremation policy. R8.5–R8.7
remain open.

## Implementation progress — checkpoint 107 / clean restart and plan audit

The prior run exposed an ownership bug in skill-priority selection: a resident
could decline ready work because a higher-priority personal need order owned by
someone else existed on the board. Ownership-aware selection and interruption
checks now exclude another resident's personal order. The focused queue and
interruption regressions pass 4/4. A new visible founding run,
`755a9939-0476-45e4-92ee-5f881c3067ad`, replaced the contaminated settlement.

The live audit did **not** approve the town plan. The plan lists all sixteen
founding, specialist, security, and civic facilities, but its geometry is not
collision-free. Static reservations overlap the lumber yard with the carpenter,
the farmstead with the granary, the mill with two cottages, the bakery with the
innkeeper cottage, the infirmary with the cemetery and two cottages, the
carpenter with the woodcutter cottage, and the granary with the farmhouse. The
stone drop zone is worse: all eight of its cells occupy the planned porter home
and four also occupy the planned infirmary. Drop/load areas therefore are not
yet first-class reservations in site selection.

The stationary-founder report was also reproduced. At Day 1 07:31 the clock was
still in `free_time`: six residents were explicitly off duty while four
food/forestry workers continued essential work. At Day 1 09:48 only five of ten
were active; three general workers reported contention and two reported
truthful idle despite nine ready jobs. Several ready construction cells were
fixed to already-working owners, so the shared crew still cannot continuously
pull the next reachable cell.

The four apparently unselectable founders are real resident cells, not decorative
family sprites. Native hit testing rejects every click whose GUI y-coordinate is
under 224 pixels, even though the visible top controls end substantially above
that. Residents drawn in that dead strip therefore select as nearby grass or do
nothing. This is a client hit-area defect, not missing resident data.

Phase checkpoint: R0, R2, R3, R7, R8.0, R8.1, and R8.2 remain complete. R1 is
again in clean-run revalidation and the lumber workshop is under construction;
no permanent home is credited. R8.3 remains in live revalidation. R4, R5, R6,
R8 overall, and R8.4 remain in progress; R8.5–R8.7 remain open. The collision,
shared-crew utilization, and selection dead-strip findings are explicit R8
blockers.

## Implementation progress — checkpoint 94 / R8.4 physical palisade

Perimeter authorization now funds and builds the enclosure it promises. The
gatehouse architect carries the mayor's measured boundary into one approved
construction plan containing finite timber fence segments and eight two-lane
road gates. Water and rock on the boundary remain documented natural barriers
rather than receiving impossible fence objects. If terrain forces relocation,
the gatehouse sits inside and beside the road opening, with its south entrance
on the circulation apron and a second north exit; the building no longer
occupies the road cell it controls.

The commission budget now accounts for every fence and gate material unit and
its labor instead of treating the palisade as free. Construction clears only
the approved perimeter and building cells, can address authoritative regional
tree cells outside the currently rendered chunk, and does not repeatedly clear
an already persisted terrain modification. Completion records the exact
physical element and gate UUIDs on the defense plan. The integration proof
requires more than one hundred built perimeter elements, all eight gate
objects, a roofed commissioned gatehouse, and exact perimeter persistence
through save/load.

Focused QA passes 30/30 architecture tests, 41/41 development and guard tests,
and 10/10 release-gate tests. The strict audit covers 1,820 functions with 138
declarative data/template exemptions and zero non-template functions over
thirty lines; `git diff --check` is clean. The complete regression passes
419/419, including the 133-second remote-camp proof and the physical
gatehouse/palisade commissioning proof.

Phase checkpoint: R0, R1, R2, R3, R7, R8.0, R8.1, R8.2, and R8.3 remain
complete. R4, R5, R6, R8 overall, and R8.4 remain in progress. The physical
palisade and gatehouse dependency are now complete in the implementation and
focused proof. R8.4 still needs all security facilities constructed in the main
saved town plus player cemetery controls and later exhumation/cremation policy.
R8.5–R8.7 remain open.

## Implementation progress — checkpoint 108 / sustained timber and tether proof

The clean founding run exposed three independent scheduler failures behind the
visible idle crowd: another resident's personal survival order could mask a
worker's own queue, construction cells remained effectively pinned to their
first preferred builder, and optional social work did not yield to a resident's
higher-priority ready skill. Ownership-aware readiness, shared construction
cells, and skill-priority preemption now repair those cases without allowing a
lower-priority construction order to steal the dedicated woodcutter from
forestry.

The live run crossed a complete scarcity cycle rather than merely reporting a
queue. At tick 1,167, Klara felled timber while three residents hauled and two
built. When that timber was consumed, Klara finished the next tree at tick
1,300; four new construction deliveries opened immediately, Bram and Lina took
the first two, Niko remained assigned to the workshop, and Marta continued
felling the replacement tree. The Founders' lumber workshop then completed
naturally on Day 1 with all physical elements, supported roof, fixtures, and its
English label visible. The architect opened the farmstead next; no road, quarry,
or specialist building leapfrogged it.

Founding livestock now retain a persisted tether point and a compact temporary
movement range until their approved physical housing exists. The native client
renders a rope and stake so this safeguard is visible instead of making animals
look abandoned. The first rendering attempt incorrectly mixed local and global
map coordinates and painted large bands across the world; visual inspection
caught it, coordinate projection and scale were corrected, the native client
was rebuilt, and the corrected view shows individual restrained tether marks.
This is deliberately temporary: the farmstead's barn, gate, and pasture fence
remain the permanent containment proof, followed by relocation/herding jobs.

Five focused ownership, shared-cell, social-preemption, livestock projection,
and night-rest regressions pass. The strict audit covers 1,928 functions with
138 declarative/template exemptions and zero non-template functions over thirty
lines; `git diff --check` is clean.

Phase checkpoint: R0, R2, R3, R7, R8.0, R8.1, and R8.2 remain complete. R1 is
still in clean-run revalidation: the workshop is complete, the farmstead is now
planned, and no permanent home is credited yet. R8.3 remains in live
revalidation until the pasture fence is physically complete and the livestock
are transferred. R4, R5, R6, R8 overall, and R8.4 remain in progress; R8.5–R8.7
remain open. The collision-free master-plan/drop-zone repair and the native
selection dead strip remain explicit R8 blockers.

Follow-up native proof removed the selection blocker. Hit testing now excludes
only the actual top bar, camera controls, simulation controls, and group panel
instead of discarding the top 224 pixels of the world. After rebuilding, a
click at screen y=160 selected the planned Weiss-Voss family construction
fixture and opened its correct inspection receipt. Collision-free master-plan
and drop/load-zone reservations remain the active planning blocker.

## Implementation progress — checkpoint 95 / R8.4 cemetery control and disposition

The cemetery is now a player-managed civic system rather than an automatic
burial-only sink. A management order can designate a terrain-valid cemetery,
choose burial or cremation as the default disposition, and order a specific
occupied grave exhumed or cremated. New resident remains inherit the current
policy, every change increments a persisted revision, and a cremation policy
prevents the ordinary burial scheduler from quietly overriding the player.

Disposition orders produce physical resident work. A qualified worker walks to
the occupied grave, performs visible exhumation labor, returns the grave to
available service, and exposes the same identified remains. The worker then
collects and visibly carries those remains to an inspectable cemetery pyre.
Cremation consumes ten finite building-lumber units, records the exact corpse
UUID and cumulative fuel use on the pyre, converts the remains to persisted
ashes, and emits explicit exhumation and cremation events. The pyre appears in
the native world-object projection with its real use count instead of existing
only in civic metadata.

All 76 founding/lifecycle tests pass, including burial, policy, exhumation,
finite fuel, physical pyre inspection, and save/load. The combined Unity and
release set passes 45/45, including the 131-second remote-camp proof. The strict
audit covers 1,835 functions with 138 declarative data/template exemptions and
zero non-template functions over thirty lines; `git diff --check` is clean. The
complete regression passes 421/421, including the 136-second remote-camp proof,
physical palisade commissioning, and both resident disposition paths.

Phase checkpoint: R0, R1, R2, R3, R7, R8.0, R8.1, R8.2, and R8.3 remain
complete. R4, R5, R6, R8 overall, and R8.4 remain in progress. The R8.4 civic
policy and remains-disposition gate is complete. R8.4 now has one remaining
acceptance gap: the current main saved town must naturally construct and operate
all four security facilities and its palisade rather than relying only on the
isolated commissioning proof. R8.5–R8.7 remain open.

## Implementation progress — checkpoint 96 / live founding recovery

The visible main save exposed a real scheduler failure at Day 4 rather than a
slow build: the farmstead commission and food-security work order were active,
but no farmstead job existed. The architect had fixed the grain field in a
position whose two-cell circulation apron overlapped the completed lumber
workshop. Because the barn could move while the field could not, all 2,113 site
candidates failed and the town retried the impossible layout every 240 ticks.

The architect now validates each still-unbuilt founding field against physical
construction, roads, water, rock, furniture, and the other field. An invalid
field is moved to the nearest valid site, its prior survey and harvested-log
provenance are archived, active clearing work is cancelled honestly, and the
new location is surveyed. Failed field searches have a bounded retry cadence.
A field-layout signature also invalidates only stale farmstead rejection
cooldowns. In the main save the grain field moved from `(-52, 22)` to
`(-55, 22)`, the farmstead selected `(-34, 27)`, and a work-order-accountable
156-element physical project appeared.

The watched dawn then exposed a second scheduling defect: incremental housing
took the farmer while the farmstead remained a blueprint. Founding worker
protection now keeps the farmer available for the unfinished farmstead while
other common builders may continue housing. After the server reloaded the
saved town, the house released the farmer and the farmstead visibly completed
its first three construction elements. Normal eating, sleep, and worship may
still interrupt work; permanent reassignment to unrelated construction may
not.

The first live repair also exposed a save-specific self-collision before more
work was lost. The older running server continued validating fields after the
farm blueprint existed, interpreted that blueprint as an obstacle to itself,
and accumulated 259 alternating/drifting survey revisions; one grain fence
reached Y=-498. Replanning now stops as soon as a farm site or job exists. A
bounded recovery migration selects the first post-blueprint accepted revision,
compacts the corrupted history into an explicit recovery receipt, realigns all
still-planned fence elements, and cancels stale child jobs. The main save now
has grain at `(-55, 22)`, vegetables at `(-50, 36)`, farm construction bounds
of X=-55..-10 and Y=22..43, and no open off-map farm jobs.

All 78 founding/lifecycle tests pass, including the new loaded-save field
replan, field-geometry migration, forestry ordering, skilled concurrency,
farmer protection, burial, and cremation paths. The strict audit covers 1,848
functions with 138 declarative data/template exemptions and zero non-template
functions over thirty lines; `git diff --check` is clean. The pre-recovery
complete suite passed 423/423; the final suite must be rerun on the compacting
recovery change before this checkpoint can promote any phase.

Phase checkpoint: R0, R1, R2, R3, R7, R8.0, R8.1, R8.2, and R8.3 remain
complete. R4, R5, R6, R8 overall, and R8.4 remain in progress. R8.4's remaining
acceptance gap is unchanged: the current main saved town must naturally finish
and operate all four security facilities and its palisade. R8.5–R8.7 remain
open.

## Implementation progress — checkpoint 97 / continuous construction shifts

The Day 11–13 visible run exposed why founders appeared to stop after one wall
section. Cancelled child jobs left workers marked as working, loaded survey jobs
targeted blocked blueprint cells, and multiple survey orders claimed the same
construction element. The scheduler now releases cancelled workers, repairs
survey work positions to valid adjacent cells, cancels duplicate survey owners,
and prevents new surveys from selecting an already claimed element. A builder
can therefore finish one supplied section and immediately claim the next ready
section instead of waiting behind a stale or duplicate child order.

The watched run then identified a real material-throughput pause. The founding
party carried two saws, but the scheduler posted only one saw-lumber job and
reserved the entire bench and stockpile for that worker. Sawing is now a
two-slot parallel operation across the physical two-cell sawbench. Eligible
founding labor can use the second saw, input and tool quantities are withdrawn
atomically, and old unslotted saw jobs are cancelled during save migration.
This preserves finite logs and tools while allowing two distinct workers and
work positions to feed the same bounded lumber store.

In the native client, the farmstead advanced from 16 to 21 completed elements
after the survey repair, then from 27 to 32 elements and 272 to 329.2 work units
after the two-saw repair. Klara Holt and Bram Eder were visibly working beside
one another at the sawbench while Lina Roth delivered material and the builder
continued the farm wall. The private house remained fixed at 284 work units, so
it did not consume the founding farm's lumber. Overnight pauses were legitimate
sleep in physical bedrolls; morning work resumed without player intervention.

The combined founding and job-board regression passes 91/91. Focused continuous
construction, dual-saw, purposeful-work, and lifecycle checks pass 17/17 after
the final throughput change. The first complete run passed 423/424 and caught
over-broad second-saw eligibility changing remote quarry ownership. Second-saw
work is now limited to the founding carter and woodcutter during an active
construction shortage; the 116-second remote field-camp/quarry regression and
both dual-saw tests pass after that correction. Loaded saves retire the obsolete
broad saw permission and cancel any active or suspended assignment that its
worker can no longer legally perform. The strict audit covers 1,859 functions
with 138 declarative data/template exemptions and zero non-template functions
over thirty lines; `git diff --check` is clean. A final complete-suite rerun
remains due before release promotion.

Phase checkpoint: R0, R1, R2, R3, R7, R8.0, R8.1, R8.2, and R8.3 remain
complete. R4, R5, R6, R8 overall, and R8.4 remain in progress. Continuous
founding construction and material supply are now live-proved. R8.4 still
requires the current main save to naturally finish and operate the four
security facilities and palisade. R8.5–R8.7 remain open.

## Implementation progress — checkpoint 98 / skill-owned work queues

The Day 38 visible save confirmed that project elements existed but were not a
coherent crew queue. Delivery, surveying, clearance, and construction could
each select from the entire farmstead, so residents scattered across distant
cells and a worker completing one section did not necessarily continue the
same work front. Construction now owns an ordered eight-element active batch.
Only that batch may receive survey, delivery, builder, or helper work; field
clearing first selects trees within two cells of its active fence sections.
The persisted queue exposes each cell as ready or blocked and records its exact
blocker: clearance, survey, material, dependency, or an existing worker claim.

Farming now has a separate skill-owned queue for every plot and crop action.
Prepare, sow, recover, cut, and harvest work use a persisted serpentine list of
physical field cells. Finishing one cell marks it complete and exposes the next
cell in the same local batch; the plot changes agricultural stage only after
the entire cell list is complete. Cancelled or obsolete jobs release their cell
claims instead of leaving a field permanently stuck. Both farming and
construction queues are registered under `village.skillWorkQueues`, and the
client state exposes the queues plus each resident's skills and priorities for
inspection.

Residents now persist a one-to-five priority for each known skill. Assignment
first considers jobs that are actually ready, then prefers the resident's
higher-priority skill and skill level. Founding common labor can fall through
from blocked construction to logistics: a builder does not claim a wall whose
material, survey, clearance, dependency, or work position is unavailable, but
may instead haul the missing material. Founding builders retain construction
as priority one; the farmer also retains farming as priority one, and the
herder retains husbandry and hunting as priority-one survival work.

The focused queue, concurrency, and physical construction regressions pass,
including complete farmstead/fence construction. The dedicated farming
queue regression proves adjacent ordered cell handoff and a stage that remains
fallow until the queue drains. The strict audit covers 1,883 functions with 138
declarative/template exemptions and zero non-template functions over thirty
lines; `git diff --check` is clean. The native client was rebuilt successfully,
the API body ceiling was raised to 64 KiB, and the client now keeps a bounded
least-recently-used set of chunk revisions so long regional camera sessions do
not fail with `400 Request too large`.

The Day 39 native run then migrated two legacy whole-plot crop jobs into cell
jobs without losing their plot action. Ada resumed grain recovery at the first
queued cell `(-44, 23)` while the next vegetable-harvest cell `(-48, 39)`
remained available. The saved farm queue visibly recorded that first cell as
claimed and the next twelve cells as ready. A legacy fence delivery that held
Bram and lumber against an uncleared, unreachable cell was also cancelled with
its cargo restored; Bram immediately returned to his hunger need. Future
construction deliveries are posted only when their active cell has physical
clearance. The final strict audit covers 1,883 functions with the same 138
exemptions and zero violations; the queue, hauling, complete-farmstead, and
one-cell conservation regressions pass after the live-save migrations.

Phase checkpoint: R0, R1, R2, R3, R7, R8.0, R8.1, R8.2, and R8.3 remain
complete. R4, R5, R6, R8 overall, and R8.4 remain in progress. This checkpoint
closes the scattered single-cell scheduler defect, but R8.4 still requires the
main save to naturally complete and operate its security facilities and
palisade. R8.5–R8.7 remain open.

## Implementation progress — checkpoint 99 / livestock extinction recovery

The Day 39 visible save contradicted the prior R8.3 completion claim: the
completed cattle pasture was empty because every founding domestic animal had
died on Day 15 with maximum hunger and thirst. Husbandry had been incorrectly
gated behind commissioning the complete farmstead, so a delayed fence or field
also prevented the herder from drawing water or preparing feed. The empty pen
was therefore a real simulation failure, not a camera or rendering problem.

Animal survival work is now independent of the active capital project. As long
as a living domestic animal exists, finite trough-water work can be posted.
When feed falls below its safe reserve, the forager gathers physical renewable
patches and the herder can convert two gathered-forage units into eight units
of emergency fodder. Permanent grain feed remains the better long-term chain;
the emergency recipe bridges construction delays without creating free food.

The existing save does not resurrect dead animals. A visiting merchant may
replace an extinct cattle herd only when a completed compatible pasture has
capacity. The replacement is a new adult cow-and-bull pair with new identities,
lineage state, finite needs, physical pasture positions, and an inspectable
160-CP livestock-credit transaction. Loaded saves reconcile a missed order
against the latest valid visit only when the cattle died before that visit.
The Day 39 town now visibly contains Dapple and Rowan inside the pasture; both
began housed and grazing at 100 health with zero hunger and thirst. The herder
immediately started drawing river water while the forager started gathering
emergency feed material.

At the Day 40 rollover both cattle remained housed at 100 health and zero
thirst. Pasture grazing limited hunger to eight rather than a danger state;
Niko completed the finite emergency-fodder job that morning, leaving eight feed
units and thirty-two trough-water units for the following husbandry cycle. The
visible client was paused and saved at tick 93,955 with both cattle still
rendered inside the pasture.

The focused R8.3 suite passes 33/33 before the historical-order reconciliation,
and the three targeted survival/recovery regressions pass afterward. The strict
audit covers 1,889 functions with 138 declarative/template exemptions and zero
non-template functions over thirty lines; `git diff --check` is clean.

Phase checkpoint: R0, R1, R2, R3, R7, R8.0, R8.1, and R8.2 remain complete.
R8.3 is reopened for live revalidation until the replacement cattle cross a
daily husbandry rollover with water and feed supplied by the corrected jobs.
R4, R5, R6, R8 overall, and R8.4 remain in progress; R8.5–R8.7 remain open.

## Implementation progress — checkpoint 100 / founding housing layout gate

The Day 40 visible save exposed another false visual impression. The large
unlabelled shell beside the pasture was not a finished home: it was the enclosed
but unfinished Founders' farmstead barn. The authoritative town had zero
residences, zero housed households, one active Weiss-Voss farmhouse project,
and no instantiated sites for the other two founding families. Housing was
therefore failing as a settlement plan even though a single build job existed.

The architect now scouts the complete founding household layout as soon as the
lumber workshop operates. Each real household receives a persisted, named,
two-exit site selected against terrain, farms, existing buildings, circulation
clearance, and the other reserved homes. The current save now contains the
Weiss-Voss family farmhouse at `(-34, 37)`, the Brand-Venn family cottage at
`(-18, 37)`, and the Holt-Eder family cottage at `(-62, 9)`. The farm homes
retain a two-cell circulation gap, while the woodland household remains near
forestry without overlapping the lumber workshop. All three surveyed outlines
are visible in the native client. Construction remains sequential so the crew
finishes and occupies one complete roofed, furnished home before opening the
next work front.

The live save has no authorized or operating quarry and no revealed geology;
the distant gray face is regional rock terrain, not proof of a commissioned
quarry. Nevertheless, the unsafe rule that allowed a planned or operating field
camp to bypass unfinished settlement infrastructure has been removed. Founding
prospecting and quarrying now require the lumber workshop, farmstead, communal
kitchen, and complete household housing. The transport policy also records an
explicit `all_founder_homes_habitable` gate for permanent road construction;
dirt foot traffic remains available while houses are built.

The two new focused regressions pass: all three actual family sites are named,
distinct, two-exit, persisted, and visible; an operational field camp cannot
post prospecting or quarry work before housing completes. Nineteen adjacent
housing, farm, animal-housing, gatehouse, fixture, and field-source regressions
also pass. An over-broad Unity protocol selection was stopped after 408 seconds
without an assertion failure, so the complete suite remains due. The strict
function audit covers 1,894 functions with 138 declarative/template exemptions
and zero non-template functions over thirty lines.

Phase checkpoint: R0, R2, R3, R7, R8.0, R8.1, and R8.2 remain complete. R1 is
reopened for live housing completion and household move-in proof. R8.3 remains
in live revalidation. R4, R5, R6, R8 overall, and R8.4 remain in progress;
R8.5–R8.7 remain open.

## Implementation progress — checkpoint 101 / housing crew and farm-core gate

The Day 41 visible run exposed why the three surveyed family lots still did not
become homes. Main founding construction ownership was restricted to the farmer
and herder even though the mayor's commission named a larger common building
crew. Both specialists remained correctly occupied by seasonal food work, while
Mei Lin had reached construction skill twelve and still could not own a ready
wall. Helpers were also incorrectly withheld until a project's aggregate input
flag closed, even when individual cells already held their required material.

All founding common laborers with build capability may now own the lumber yard,
farmstead, household, kitchen, field-camp, and specialist construction queues.
They retain role-specific skill priorities: the farmer and herder remain lead
builders, while other villagers fall through to construction when higher
personal work is unavailable. Helpers may claim any surveyed, dependency-ready
cell whose own material is delivered; they no longer wait for every cell in the
entire project to be supplied.

The same live save revealed a second sequencing defect. The physical farmstead
barn and cattle pasture were complete, but fifty-three future field-boundary
segments remained blocked on tree clearance. Those fences made the scheduler
treat the farmstead as unfinished and withhold all household lumber. Housing is
now released when the operational farmstead core is physically complete; field
clearing and its fences remain real work but cannot keep ten founders homeless.
Permanent roads and geology work remain gated behind all habitable founder
homes.

After the corrected server was loaded, the visible Day 41 town assigned Klara
Holt as the Weiss-Voss farmhouse builder while Mei Lin, Tomas Venn, Friedel
Koch, and other common workers hauled lumber or claimed adjacent wall cells.
The farmhouse advanced from 28/55 to 43/55 physical elements during the
observed work period. Its remaining floor, roof, beds, hearth, storage, and
furnishings correctly suspended for the night rather than being credited as a
finished residence. No residence or move-in is claimed yet.

The two new scheduler regressions and the adjacent farmstead, circulation, and
fence regressions pass. The strict audit covers 1,895 functions with 138
declarative/template exemptions and zero non-template functions over thirty
lines; `git diff --check` is clean.

Phase checkpoint: R0, R2, R3, R7, R8.0, R8.1, and R8.2 remain complete. R1
remains open until all three named, roofed, furnished homes commission and their
families move in. R8.3 remains in live revalidation. R4, R5, R6, R8 overall,
and R8.4 remain in progress; R8.5–R8.7 remain open.

## Implementation progress — checkpoint 102 / first occupied family home

The Day 41–44 observed run exposed and corrected a survival interruption
livelock. An urgent hunger order could suspend a delivery, fail to reserve the
communal food target, and then allow the delivery to resume in the same tick.
The actor therefore appeared busy without moving. Suspended work now remains
suspended while its valid higher-priority interrupter is still open; obsolete
or ineligible interrupters still release the old work as before.

The reservation model was also too coarse for survival. It treated the whole
founding food supply as a single exclusive object and item claim, even though
the fire has multiple meal positions and finite quantities can be checked when
each meal is consumed. Life jobs no longer claim an entire shared survival
object or stockpile. Critical hunger, fatigue, and safety work also receives
skill priority zero, so a starving skilled worker cannot reject food in favor
of their trade. The regression proves that two critically hungry founders can
reserve distinct meal work concurrently.

With those fixes loaded, the visible crew completed all 55 physical elements
of the Weiss-Voss family farmhouse on Day 44 at 10:33. The client visibly shows
the English building label, complete walls, timber floor and supported roof,
north and south exits, hearth, bounded household storage, table, three chairs,
and three individual beds. The derived residence is habitable with bed and
resident capacity three. Ada Weiss, Edda Voss, and Mei Lin are its assigned
occupants, and Mei immediately selected `Sleep at home` rather than a workshop
bedroll. The Brand-Venn and Holt-Eder homes remain named, persisted, and visibly
scouted; construction stays sequential to prevent another scattered work front.

The mayor correctly returned to food security after commissioning because the
town had zero cooked meals, zero harvested grain, zero harvested vegetables,
two raw fish, and four meat. Permanent roads and geology projects remain empty,
so neither infrastructure was allowed to leapfrog the remaining two homes.

Seven focused housing, survival, interruption, bedroll, and partial-fixture
regressions pass. The strict audit covers 1,897 functions with 138 declarative
template exemptions and zero non-template functions over thirty lines;
`git diff --check` is clean. The complete suite remains due.

Phase checkpoint: R0, R2, R3, R7, R8.0, R8.1, and R8.2 remain complete. R1
has live proof for one of three founding households and remains open for the
Brand-Venn and Holt-Eder completions and move-ins. R8.3 remains in live
revalidation. R4, R5, R6, R8 overall, and R8.4 remain in progress; R8.5–R8.7
remain open.

## Implementation progress — checkpoint 103 / truthful restart and skill queues

The Day 44 save was retired because it could no longer provide trustworthy
founding-sequence evidence. Although it contained one occupied home, its stale
campfire target held food policy open, the early fields visually occupied only
a small part of their oversized enclosures, and the job ledger did not expose
one complete readiness view per skill. A new regional-v3 founding run now owns
the visible client: `a8db2278-3ba3-41f8-82b6-debf229b4930`.

Every open job is now projected into a persisted skill queue with its readiness,
blocker, priority, and upstream dependency job IDs. Assignments reject work
whose input is not ready instead of claiming a worker and failing afterward.
Construction retains its focused cell queues; farming retains its ordered cell
queue; both are visible under the same skill registry. The fresh live queue
shows the lumber workshop blocked truthfully on material, linked to three
upstream timber jobs, while its surveys and assist cells remain independent
work. A live-check defect that initially classified input-free surveys and
patrols as missing production resources was caught, fixed, and included in the
regression before restarting again.

Founding grain and vegetable enclosures are now compact 6×6 plans whose 4×4
interiors are exactly the crop plots they protect. Terrain-aware relocation
updates both crop and fence geometry from the same master-plan boundary. The
previous large-fence/small-field visual contract is removed.

The master plan now records a demand snapshot at every 100-tick mayor review:
population, active households, habitable capacity, housing shortfall, food
target, hunger, and active priority. A changed snapshot increments the plan
version and emits a revision. New households receive planned expansion lots,
so population and household change can no longer leave housing outside the
town plan. The fresh run's plan advanced to version 2 with ten residents,
three households, ten missing beds, and a thirty-portion food target.

The household-hearth migration also now replaces a stale production target ID,
clears `target_missing`, and preserves the same job at the real permanent
kitchen. Focused validation passes seven adjacent queue, field, housing,
planning, and mayor tests; the final four-change regression passes 4/4. The
strict audit covers 1,910 functions with 138 declarative/template exemptions
and zero non-template functions over thirty lines; `git diff --check` is clean.

Visible fresh-run proof currently reaches Day 1 08:30. Workers have left camp,
surveyed the lumber workshop, begun timber and material work, and have not
opened any road, prospecting, or quarry job. This is an early-sequence proof,
not proof of completed housing or town operation.

Phase checkpoint: R0, R2, R3, R7, R8.0, R8.1, and R8.2 remain complete. R1 is
revalidating from a clean founding run and is open until all three named homes
are physically complete and occupied. R8.3 remains in live revalidation. R4,
R5, R6, R8 overall, and R8.4 remain in progress; R8.5–R8.7 remain open.

## Implementation progress — checkpoint 104 / relocated-bed interruption recovery

The clean run completed and visibly labelled the Founders' lumber workshop on
Day 2. Its physical proof includes all 39 construction elements, supported
roof, sawbenches, storage, two exits, and ten temporary indoor bedrolls. The
architect then visibly scouted all three named household sites before opening
the farmstead. Roads, prospecting, and quarrying remained at zero.

The Day 3–4 transition exposed a real interruption deadlock. Bram Eder and
Klara Holt had valid saw-lumber work suspended for sleep, but their sleep jobs
retained object identities from the outdoor bedroll positions after the same
physical bedrolls moved into the workshop. The sleep jobs repeatedly failed
`target_missing`, remained open, and therefore correctly—but permanently—held
the saw work suspended. With no sawn lumber, the farm could not receive its
first material cell.

Relocated sleeping places now mark their open life orders for a world-target
refresh. Before need scheduling, the order re-resolves the current physical
bed object, position, access door, and fixture identity, clears stale path
state, and reopens a `target_missing` order only after the new object exists.
The focused regression now moves a bedroll into a completed workshop, advances
the actual simulation, and proves the order points to the world object at the
new position. The interruption regression still proves ordinary work waits
while a genuinely valid higher-priority need remains open.

After loading the repair into the same saved run, eight founders visibly slept
inside the workshop. Bram completed the formerly suspended saw cycle on Day 4
at tick 7517; sawn lumber appeared, material hauling opened, and the farmstead
advanced naturally from 0/118 to 3/118 physical elements while vegetable work,
fodder preparation, meals, and further sawing continued. No construction flag
or aggregate statistic was substituted for those observed transitions.

The bedroll/interruption/home regression passes 3/3. The strict audit covers
1,911 functions with 138 declarative/template exemptions and zero non-template
functions over thirty lines; `git diff --check` is clean.

Phase checkpoint: R0, R2, R3, R7, R8.0, R8.1, and R8.2 remain complete. R1
remains in clean-run revalidation: the workshop and all three household surveys
are proved, while the farmstead and homes remain physically incomplete. R8.3
remains in live revalidation. R4, R5, R6, R8 overall, and R8.4 remain in
progress; R8.5–R8.7 remain open.

## Implementation progress — checkpoint 105 / failed-run reset gate

The replacement run was paused and saved on Day 6 at tick 11,457 because its
visible result remained below the founding acceptance bar. It had one complete
communal workshop, three surveyed household sites, and 8/118 farm elements,
but no habitable home. This is retained as failed-run evidence rather than
counted as progress toward R1.

The scheduler already grouped open work by skill and maintained ordered cell
queues for construction and farming. Inspection nevertheless found that the
summary concealed too much: suspended jobs could have no stated reason, and a
construction job did not expose the entire producer-to-hauler dependency chain.
Job transitions now persist their status reason. Each skill-queue entry reports
finite resource needs with required, delivered, available, and missing amounts,
plus the open producer and construction-delivery job IDs that can satisfy them.
This makes a material-starved wall visibly different from a ready wall and from
a wall merely claimed by another worker.

The authoritative field contract is now explicit and regression-covered. Each
founding field is a 6×6 enclosure with one gate and a 4×4 crop interior derived
from the same terrain-aware master-plan boundary. No independent crop offset or
size is permitted.

The initial master plan was also found incomplete: it reserved districts,
fields, routes, housing lots, and defense policy, but did not enumerate every
approved specialist facility. It now reserves sites from the beginning for the
founding workshop, farmstead, communal kitchen, granary/store, stable, mill,
forge, bakery, infirmary, inn, carpenter workshop, watch house, armory, training
yard, and gatehouse. The 100-tick mayor review synchronizes facility status,
adds lots for new households, and records a demand response for food and
housing. Plan version changes occur only when demand or planned capacity
changes; a routine review timestamp no longer creates a false revision.

Four focused contract tests pass. The strict audit covers 1,919 functions with
138 declarative/template exemptions and zero non-template functions over thirty
lines; `git diff --check` is clean. The broader founding suite still reports
nine pre-existing behavioral failures, including incomplete farm fencing,
sawyer throughput, delivery proof, burial, carcass processing, standby truth,
and social restoration. Those failures reinforce the reset decision and remain
release blockers.

Phase checkpoint: R0, R2, R3, R7, R8.0, R8.1, and R8.2 remain complete. R1 is
restarting from a new founding run after the queue, field, and town-plan repair;
no home completion is currently credited. R8.3 remains in live revalidation.
R4, R5, R6, R8 overall, and R8.4 remain in progress; R8.5–R8.7 remain open.

## Implementation progress — checkpoint 106 / corrected native restart

The corrected founding run is `165cd293-374b-47a1-b62e-8454b85f95db`. A
native-client defect initially left the camera at the prior run's coordinates
because camera reset considered location and map dimensions but not run
identity. The rebuilt client now resets and fits whenever `runId` changes. The
visible client opens on the actual new camp beside its river and timber bridge,
not on stale terrain.

Early live inspection also found fixed-owner survey work repeatedly failing a
route while other general laborers were already on the reachable side of the
river. Construction surveys now relinquish their original owner after repeated
navigation failure so the shared skill queue can reassign the same cell to an
available worker. Building closure also preserves at least two unfinished wall
gaps until a door is complete; common builders may work concurrently without
sealing themselves inside or outside.

By Day 1 14:33 the visible workshop had advanced naturally to 18/39 complete
physical elements with 20/39 supplied and sixteen completed site surveys.
Residents were working on both sides of the bridge. Its remaining 97-log need
was explicitly linked to three open forestry jobs, while no road, quarry, or
specialist project leapfrogged the founding sequence. This remains an early-run
observation, not R1 completion.

Phase checkpoint: R0, R2, R3, R7, R8.0, R8.1, and R8.2 remain complete. R1 is
in clean-run revalidation on the new visible run; the workshop is under
construction and no permanent home is yet credited. R8.3 remains in live
revalidation. R4, R5, R6, R8 overall, and R8.4 remain in progress; R8.5–R8.7
remain open.

## Implementation progress — checkpoint 109 / motion and sleep regression repair

Visible run `755a9939-0476-45e4-92ee-5f881c3067ad` exposed a combined
projection, traffic, and sleep-routing regression. Residents standing on loose
materials disappeared because the material projection replaced the resident;
two residents could also repeatedly yield the same passage back to one another.
Finally, sleep used an adjacent-work routing rule, so a resident could be shown
as asleep beside a bed and the native interpolation could carry the horizontal
sleep sprite into place.

Loose materials now retain the resident projection. Passage yielding records
the requester and origin and refuses an immediate reciprocal yield. Sleep is an
exact-destination job, cached adjacent-only sleep routes are rejected, and the
Unity view reports a resident as sleeping only while the resident actually
occupies the assigned sleeping-place cell. The native renderer snaps the first
sleep frame to that bed cell instead of interpolating a horizontal body across
the floor.

The same run was observed through a full night-to-work transition. Repeated
samples kept all ten founders visible and removed the rapid two-cell reversal
loop. On Day 5 the farmstead advanced naturally from six to nine completed
physical elements, delivered lumber rose from 50 to 65, and the forestry/sawing
chain accumulated 82 logs. This proves work resumed, but it does not prove the
founding scheduler complete: lumber remains the bottleneck and the farm is only
9/118 elements complete. The broad four-file regression run is 132/143; eleven
failures remain release blockers, including two-saw assignment, construction
delivery, purposeful-work, burial, carcass processing, social restoration, and
save-round-trip expectations. No completion credit is taken from the passing
aggregate count.

Focused visibility, sleep-position, exact-route, collision, and schedule
regressions pass. The strict function audit covers 1,943 functions with 138
declarative/template exemptions and zero non-template functions over thirty
lines; `git diff --check` is clean.

Phase checkpoint: R0, R2, R3, R7, R8.0, R8.1, and R8.2 remain complete. R1 and
R8.3 are revalidating in the visible run; the workshop is complete, but the
farmstead and permanent homes are not. R4, R5, R6, R8 overall, and R8.4 remain
in progress. R8.5–R8.7 remain open.

## Implementation progress — checkpoint 110 / live motion spot check

A 24-sample Observe-16× sequence initially kept all ten residents visible but
recorded seventeen A→B→A cell reversals. Inspection showed that a stationary
resident could yield for different passers on consecutive ticks, bypassing the
same-requester cooldown. Yielding now has a six-tick actor-wide cooldown while
retaining the longer same-requester refusal. The same inspection found that a
human task containing the phrase `gathered forage` was incorrectly classified
as an animal grazing pose; grazing is now restricted to animal entities.

After the live server reload, the repeated 24-sample sequence again retained
all ten residents and reduced reversals from seventeen to two. No resident
disappeared, no sleeping resident repeatedly changed cells, and the single
observed sleep arrival snapped to its bed. Large sampled coordinate deltas were
continuous purposeful travel viewed between Observe-16× polls, not reciprocal
teleports. The focused yield and human-pose regressions pass, the strict
function-length audit remains at zero violations, and `git diff --check` is
clean.

Phase checkpoint: R0, R2, R3, R7, R8.0, R8.1, and R8.2 remain complete. R1 and
R8.3 remain in visible revalidation. R4, R5, R6, R8 overall, and R8.4 remain in
progress; R8.5–R8.7 remain open.

## Implementation progress — checkpoint 111 / scheduler and civic regression closure

The founding scheduler and current R8.4 civic proofs are green together in the
same broad regression. Open life orders no longer replace a valid physical
target every tick, eliminating campfire retargeting that prevented social and
morale work from finishing. Survival work remains urgent, while free-time life
work can outrank ordinary employment without displacing work during the work
block. Founding saw jobs retain their critical supply designation across an
existing saved assignment, so both physical saws continue feeding construction
instead of silently yielding to lower-throughput work.

Construction helpers now physically collect reusable tools and start the
parent production record before assisting a supplied element. They cannot
claim an unsupplied cell merely because the project exists, but they can join
once a particular cell is actually ready. Guard duties are no longer blocked
by the guard's ordinary skill priority, and a founder with no eligible ready
job truthfully reports founding standby rather than off duty.

Fresh recoverable animal remains and household bereavement are urgent civic
duties. The only qualified butcher no longer abandons a nearby predator kill
for a distant hunting order; the carcass becomes four conserved units of meat
with persisted provenance. Every eligible household member now finishes the
owner-specific mourning order at the physical grave. Unsafe remains continue
to be hauled to the separate visible disposal pit. Serialization no longer
changes farming-queue timestamps when queue contents did not change, restoring
exact in-memory and SQLite round trips.

The combined world-object, village-life, village-simulation, and
village-founding regression passes 144/144. This includes physical farm
delivery and helper construction, two-saw throughput, truthful purposeful-work
state, social restoration, fresh and unsafe animal remains, burial and full
household mourning, and exact save persistence. The strict function audit
covers 1,947 functions with 138 declarative/template exemptions and zero
non-template functions over thirty lines; `git diff --check` is clean.

Phase checkpoint: R0–R3, R7, and R8.0–R8.3 remain complete at the automated
contract level. R4–R6, R8 overall, and R8.4 remain in progress because the main
visible save still must naturally complete its farmstead, homes, and every
security facility. R8.5–R8.7 remain open; no watched multi-season or population
growth completion is claimed from this regression closure.

## Implementation progress — checkpoint 112 / productive-work starvation repair

The Day 14 visible save exposed a scheduler failure rather than a shortage of
work. All ten founders could reserve optional worship or reflection while food,
forestry, hauling, and construction orders were ready. Several then entered the
workday with every need at zero, so that save was no longer a fair survival
proof. Optional social and morale work is now limited to two concurrent founding
orders, survival preparation outranks leisure outside the work block, and
optional life work releases immediately when its owner has compatible ready
productive work. Hunger, fatigue, safety, and immediate danger retain their
survival interrupts.

The reeve was also deliberately excluded from the founding labor pool and
therefore waited between 100-tick civic reviews. Founding reeves now retain
governance as their highest skill priority but may survey, haul, or build when
no review is due. Focused regressions prove sleep before morale, bounded camp
leisure, workday cancellation of even critical optional leisure, and the
reeve's govern-first fallback labor contract.

Fresh visible run `28208d84-fd1a-4b10-b2cc-db1357c95670` was started on the
corrected code. At Day 1 10:46 it had completed 54 discrete job cells; six
founders were simultaneously surveying, hauling, felling, building, or
supervising, the reeve was supplying construction, and there were zero open
optional-leisure orders during work. Four founders still reported short-lived
contention while the current material and construction cells were claimed.
That is improved throughput, not yet a claim that queue saturation is solved;
the visible run remains active for continued observation.

The late Day 1 sample then exposed a separate bootstrap deadlock: 54 raw logs
were stored, finished lumber was empty, and seven founders truthfully waited for
input because saw jobs were gated on the lumber workshop already being
complete. The portable founding saws now operate at camp before the permanent
sawbench exists. Both saw slots activated after reload, consumed raw logs, and
fed construction. By Day 2 08:48 the same watched workshop was physically
39/39 complete, supplied 39/39, roofed, furnished, labeled, and the mayor had
advanced the town to food security and farmstead work. At the final watched
Day 4 11:50 checkpoint the farmstead was 34/118 permanent elements complete,
already ahead of the abandoned run's Day 13 total of 26/118.

The saw crew is now role-safe as well as productive. The innkeeper/herbalist
pool owns the first portable saw and the porter/carter pool owns the second, so
the specialist woodcutter keeps felling and at least one logistics specialist
remains available to haul. Five-unit batches complete in thirty work minutes,
which keeps cutting, delivery, and construction stages overlapping instead of
leaving long empty gaps. Off-hours morale work again receives schedule priority
after survival preparation, while the two-order cap prevents settlement-wide
leisure capture. A player-ordered exhumation also cancels remaining grave
mourning claims so the disposition order can physically proceed.

The village-life regression passes 25/25 and the complete founding regression
passes 92/92, including the no-workshop portable-saw proof, overlapping skill
pipeline, social/morale restoration, and burial/exhumation flow. The strict
audit covers 1,962 functions with 138 declarative/template
exemptions and zero non-template functions over thirty lines; `git diff
--check` is clean.

Phase checkpoint: R0–R3, R7, and R8.0–R8.3 remain complete at the automated
contract level. R4–R6, R8 overall, and R8.4 remain in progress pending natural
building and survival proof. R8.5 has its district, reservation, and
service-relationship foundation implemented but remains in multi-seed live
validation. R8.6–R8.7 remain open.

## Implementation progress — checkpoint 113 / coherent farm inputs and resumed work

Crop sowing now consumes one conserved seed batch for an entire approved plot,
not one batch for every cell of the plot. The first sowing cell records the
pending batch provenance, subsequent cells retain it without duplicating or
destroying seed, and the completed plot owns the batch until harvest. The
agriculture integration proves grain, vegetables, milk, field piles, hauling,
crop meals, and the identity and increasing skill of the farmer who harvested
the crop. The focused food regression passes 16/16.

The watched Day 6 save exposed a smaller continuation fault in the founding
scheduler. A productive assignment suspended for sleep or another urgent need
was not counted as ready work when optional morale or social work was
considered. The resident could therefore keep the leisure order while their
existing hauling, building, or farming assignment waited. Suspended,
actor-owned productive work now participates in the readiness check, including
commission, budget, material, construction-readiness, permission, and
capability gates. Eating, required sleep, safety, and danger still preempt work;
optional leisure does not. The village-life regression passes 26/26, including
the new suspended-work proof.

After the live server reload, a Day 6 17:45 sample showed nine of ten founders
performing productive work: farmstead construction, pasture fencing, material
delivery, field clearing, and lumber production. One founder occupied the
bounded morale slot. The farm remained an active physical 118-element project,
with 11 prepared meals, 139 stored logs, 32 finished lumber, and eight seed
batches; no crop harvest is claimed yet. The broad development regression now
passes 37/37, including the farm chain, five-seed master-plan placement, gatehouse,
specialist buildings, livestock work, emergency gathering, and conserved food.
The strict audit covers 1,963 functions with 138 declarative/template
exemptions and zero non-template functions over thirty lines; `git diff
--check` is clean.

Phase checkpoint: R0–R3, R7, and R8.0–R8.3 remain complete at the automated
contract level. R4–R6, R8 overall, and R8.4 remain in progress pending the
current run's natural food, housing, civic-security, and multi-day survival
proof. R8.5 remains implemented at the planning-contract level and in live
multi-seed validation. R8.6–R8.7 remain open.

## Implementation progress — checkpoint 114 / parallel survival work streams

The Day 9–11 visible save proved that its remaining waiting was not caused by a
wood shortage. It held more than one hundred raw logs and finished lumber, but
the mayor's single active food-security work order had no authority to start a
home. Crop and food specialists occupied only part of the settlement, leaving
general builders and haulers without an accountable capital project.

Founding governance now approves a limited parallel housing commission after
the lumber workshop is operating, seasonal crop work exists, and at least sixty
finished lumber is available. This does not supersede food security. The one
active work order remains food security, while the housing commission supplies
proposal, decision, commission, budget, and crew accountability to the first
home. Its eligible crew deliberately excludes the farmer, herder, fisher,
innkeeper, and herbalist. Available crop cells now count as planting underway;
the previous check incorrectly recognized only claimed or suspended crop work.

The same checkpoint repairs the livestock move contract. Completing compatible
housing queues a physical transfer instead of assigning an animal to a pasture
on paper. An animal already being led through a gate is not silently marked
housed before the relocation job records completion. Focused governance,
parallel-home, cattle-pasture, stable-transfer, visible animal-leading, bounded
animal production, and egg-to-meal regressions pass 8/8. The deterministic
2,400-tick scheduler audit passes with no permanent blocks and identical normal,
fast, and headless action hashes. The strict audit covers 1,973 functions with
138 declarative/template exemptions and zero non-template functions over thirty
lines; `git diff --check` is clean.

After reloading the native client, the watched Day 11 work period showed the
farmstead complete, active grain work owned by Ada Weiss, and a parallel first
home physically underway. Bram Eder and Edda Voss were hauling lumber to
specific house elements, Friedel Koch was continuing wall work, Klara Holt's
parent build order was retained through a meal interruption, and the remaining
specialists were hauling fish, gathering food, or tending cattle. The visible
house is not complete yet, so permanent housing and resident transfer are not
claimed.

Phase checkpoint: R0–R3, R7, and R8.0–R8.3 remain complete at the automated
contract level. R4–R6, R8 overall, and R8.4 remain in progress pending natural
completion of the first homes, livestock transfer, civic-security buildings,
and the full watched survival proof. R8.5 remains implemented at the
planning-contract level and in live multi-seed validation. R8.6–R8.7 remain
open.

## Implementation progress — checkpoint 115 / survival-idleness watchdog

A recurring five-minute visible watchdog now treats an unoccupied founder as a
critical founding defect unless the resident is legitimately sleeping, eating,
recovering, fleeing danger, or blocked by a specific unavailable input or
route. Each check traces skill priority, readiness, permissions, resources,
reservations, interruptions, and routes before changing code. Food, seasonal
planting, temporary sleep, and permanent shelter explicitly outrank leisure,
roads, ordinary patrol, and secondary expansion.

The first check failed. At Day 11 night the settlement had 262 stored logs but
zero finished lumber, the first home was blocked for material, all prepared and
raw food stores were empty, one founder's hunger had reached zero, another was
below twenty, and healthy residents still reported useful rest. The lumber
failure came from a policy that stopped authorizing saw work as soon as the
farmstead completed, even though the already-authorized house still required
119 more delivered lumber.

Any open construction input that still lacks building lumber now keeps the two
founding saw slots authorized, independent of which primary mayoral work order
is active. Specialist roles also remain eligible for the housing commission;
their higher-priority ready farming, fishing, cooking, husbandry, and foraging
work protects them naturally, while the absence of specialist work allows them
to haul or build instead of standing idle. Focused parallel-housing,
farmer-protection, overlapping-pipeline, function-length, and whitespace checks
pass. The strict audit covers 1,974 functions with zero non-template functions
over thirty lines.

After reload, the visible Day 12 run immediately resumed the house, emergency
foraging, fishing, livestock work, material hauling, and both saw slots. The
morning work-block sample had eight founders assigned; the remaining starvation
and crop-cycle failure is still an active survival incident, not a completed
proof. The watchdog remains active and must continue until food production,
housing, and work saturation are visibly stable across multiple days.

Phase checkpoint: R0–R3, R7, and R8.0–R8.3 remain complete at the automated
contract level. R4–R6, R8 overall, and R8.4 remain in progress; the Day 12 food
emergency prevents any survival-completion claim. R8.5 remains at the
planning-contract and live-validation stage. R8.6–R8.7 remain open.

## Approved survival system — non-electric light and heat

Stonebridge has no electrical technology. Global daylight tint is not proof
that a work cell, path, or room is safely illuminated. Every local light source
must have a physical position, radius, intensity, remaining fuel, burn rate,
ignition state, heat contribution, smoke/ventilation requirement, and fire
risk. Portable sources additionally have an owner or carrier and occupy a hand
or an approved belt/hook slot.

The progression is:

1. Founding campfires provide stationary outdoor light, warmth, cooking, and a
   social focus. They consume firewood and require tending.
2. Rushlights and wooden torches provide cheap short-lived portable light.
   Torches can be placed in wall brackets but have high smoke and fire risk
   indoors.
3. Tallow and beeswax candles provide dim, safer indoor light. A candle mold or
   dipping workspace, wick, and rendered fat or wax are required.
4. Hearths, fireplaces, ovens, and enclosed stoves provide room light and heat
   while operating. Indoor fire requires a chimney, flue, or credible smoke
   vent; an unvented room becomes unsafe.
5. Reusable oil lanterns provide protected portable or hanging light. These are
   historically appropriate low-technology lanterns fueled by animal fat or
   plant oil, with horn, thin hide, or later glass panes and smith-made metal
   fittings—not kerosene pressure lamps. They require a smith or tinsmith and a
   sustained oil or fat supply.
6. Braziers, watch fires, gate lanterns, and street lamps extend reliable light
   to defensive and civic spaces. They remain individually fueled and tended;
   there is no electrical grid.

After dusk, task readiness must require adequate illumination for the work cell
and its route. A villager may obtain a portable light, replenish or ignite a
nearby source, move the work to a lit station, or defer unsafe work. Darkness
reduces travel speed, construction and crafting accuracy, threat detection, and
animal handling safety, and increases falls, tool injuries, fire mistakes, and
predator ambush risk. Emergency rescue and defense may proceed in darkness with
explicit risk rather than becoming impossible.

The mayor tracks night-work demand and fuel reserves; the architect places
hearths, chimneys, sconces, safe clearances, gate lights, and lit circulation;
individuals still decide whether their immediate route and work cell are safe.
Food and shelter remain ahead of decorative lighting. The implementation gate
is: no villager visibly performs precision work in darkness without a real
light source, and no building is considered operational at night merely because
the renderer applies a global daylight value.

## Implementation progress — checkpoint 116 / integrated farmyard and misery

The founding architect's old barn and pasture were physically separate: a gap
and independent fence prevented livestock from circulating naturally between
shelter and grazing. The corrected farmstead plan places the pasture boundary
on the barn's exterior wall. That shared barn wall substitutes for redundant
fencing, a dedicated livestock door opens directly from barn to pasture, and a
separate outside gate remains available to people and carts. The construction
contract proves the animal doorway is a real door, not a fence segment, and
that the opposite gate remains on the outer pasture boundary. Existing saves
whose old farmstead is already complete are not falsely relabeled; they require
a physical reconfiguration project or a fresh founding run to exhibit the new
layout.

Homelessness now has an explicit welfare cost. A founder using a temporary
bedroll receives both `homeless` and `rough_sleeping` state. Rough sleeping plus
the absence of a permanent home produces a baseline misery score of 55
(`severe`), with hunger, fatigue, safety, social, and morale deprivation raising
the score toward `extreme`. Completing and assigning a habitable residence
removes those housing causes. The mayor's resident inventory now records each
person's misery score, level, and causes instead of treating bedroll capacity as
successful housing.

Focused integrated-barn, real-bed home, homeless-priority, and misery
regressions pass 4/4. The strict audit covers 1,975 functions with zero
non-template functions over thirty lines; `git diff --check` is clean. In the
reloaded visible save, the first house reached 424.6/600 work units by Day 12
22:24. All ten founders had legitimate night assignments, but all remained
homeless: seven were severely miserable and three were extremely miserable.
This is now visible evidence of failure, not a hidden statistic or a housing
success claim.

Phase checkpoint: R0–R3, R7, and R8.0–R8.3 remain complete at the automated
contract level. R4–R6, R8 overall, and R8.4 remain in progress. Permanent
housing, integrated livestock circulation in a fresh or physically corrected
farmstead, stable food, and watched survival remain required. R8.5 remains in
planning-contract and live validation; R8.6–R8.7 remain open.

## Implementation progress — checkpoint 117 / physical fishing contract

Fishing can no longer produce food from an arbitrary grass cell. The river
fishing job now has two distinct physical positions: a water-harvest target
that must resolve to an actual `outdoor_water` terrain cell, and an exact
walkable work position on the adjacent jetty. Production cannot begin when the
water target is absent or invalid. The River fishing jetty remains visibly a
jetty but now supplies a walkable floor for pathfinding instead of forcing the
generic router to stop on neighboring grass. Loaded jobs created under the old
contract are retargeted to the water and pier rather than continuing the
invalid behavior.

Two focused regressions prove both a newly posted fishing job and a migrated
loaded job require the water/pier pairing. They pass 2/2. The strict function
audit covers 1,977 functions with zero non-template functions over thirty
lines, and `git diff --check` is clean. In the restarted visible simulation,
Tomas occupied the jetty at `(-1,16)` with the action `Fish the river`; the
active production job targeted the neighboring river cell `(0,16)` and made
progress there. This proves the current Stonebridge fishing site physically;
future procedurally placed fishing sites must apply the same contract when an
architect selects a reachable bank or builds a new pier.

Phase checkpoint: R0–R3, R7, and R8.0–R8.3 remain complete at the automated
contract level. R4–R6, R8 overall, and R8.4 remain in progress. Permanent
housing, stable food, integrated livestock circulation, and watched survival
remain required. R8.5 remains in planning-contract and live validation;
R8.6–R8.7 remain open.

## Implementation progress — checkpoint 118 / fire-safe material planning

The specialist forge is no longer a timber building whose stone identity exists
only in its name. Its approved blueprint now specifies stone walls, a stone
floor, and a stone roof under a `masonry_hot_work` safety classification. The
wooden door remains an explicit separate material. Construction bills and
commission budgets now distinguish quarried stone from building lumber, and
the hauling queue selects the correct bounded stockpile for each construction
element instead of supplying every element from the lumber yard.

An approved forge may be planned while the founding homes are still underway,
but its masonry cells cannot become build-ready until stone has physically been
quarried, stored, and hauled. The initial eight-cell quarry milestone no longer
silently ends stone extraction while an authorized masonry project still has
an unmet stone bill. Quarrying continues against that finite demand. This keeps
the ordering honest: finish survival housing, establish the quarry chain, then
raise the fire-safe forge.

The communal kitchen remains valid as an early timber structure, matching the
founding-era survival decision. Its long-term civic plan requires a later
masonry fire-safety upgrade when sustained stone production is available. Fire
spread, ignition, suppression, chimneys, and structural damage remain a future
simulation layer; material classification is now ready to support it rather
than retroactively pretending every building has equal fire risk.

Focused roof, forge-material, proposal, and physical commissioning regressions
pass 4/4. The commissioning proof delivers conserved stone to every masonry
element, conserved lumber to the wooden door, completes the supported roof,
and opens the operating forge. The complete architecture and development suites
pass 71/71. The strict audit covers 1,983 functions with zero non-template
functions over thirty lines; `git diff --check` is clean.

Phase checkpoint: R0–R3, R7, and R8.0–R8.3 remain complete at the automated
contract level. R4–R6, R8 overall, and R8.4 remain in progress. Permanent
housing and stable food still precede normal forge construction in the watched
town. R8.5 remains in planning-contract and live validation; R8.6–R8.7 remain
open.

## Implementation progress — checkpoint 119 / completed-wall projection

The Weiss–Voss farmhouse did not physically lose its walls. The saved state
retained all 42 completed timber wall primitives, both completed doors, the
floor, the supported roof, and a completed residence. The visual projection was
wrong: once the construction job became `completed`, it dropped out of the
active-job index; the still-`scouted` housing reservation was then synthesized
as a fresh zero-progress blueprint and rendered ahead of the real primitives.

Completed and historical construction jobs now continue to suppress that
scouted-plan fallback, and completed buildings provide an independent guard for
legacy saves. New house completion also changes the corresponding site from
`scouted` to `built` with its completion tick. A focused retained-mode
regression proves a completed wall primitive cannot revert to a planned wall
projection. The reloaded native client visibly shows the farmhouse perimeter
again; the live projection reports 42 complete walls and zero planned
Weiss–Voss construction elements. The strict function audit remains clean at
1,983 functions with zero violations, and `git diff --check` is clean.

Phase checkpoint: R0–R3, R7, and R8.0–R8.3 remain complete at the automated
contract level. R4–R6, R8 overall, and R8.4 remain in progress. This rendering
fault is closed, but the separate blocked home-sleep route and the invalid
animal-remains pit inside the farmhouse remain open defects. R8.5 remains in
planning-contract and live validation; R8.6–R8.7 remain open.

## Implementation progress — checkpoint 120 / owned beds and stable sleep

Permanent family beds now have explicit resident, household, and residence
ownership. The housing synchronizer assigns only members of the household for
which the home was planned, preserves those assignments across loaded saves,
and releases each housed resident's temporary bedroll without allowing that
bedroll to overwrite the permanent sleeping destination again. Existing open
sleep orders are retargeted to the owner's assigned bed and have stale route
caches cleared.

Beds and bedrolls remain visible furniture while also being traversable to
villager navigation. This distinction fixes both observed failures: changing a
bed to generic floor no longer makes its sprite disappear, and treating visible
bedding as a solid obstacle no longer makes sleepers, haulers, or builders
bounce away from it. Sleepers route to the occupied half of their own bed and
remain there while sleep progress is applied.

In the restarted native client, the three beds in the Weiss–Voss farmhouse are
visible and assigned separately to Mei Lin, Ada Weiss, and Edda Voss. All three
active sleep orders targeted their corresponding permanent bed IDs with no
blocking reason. Edda remained at the same bed cell in the sleeping pose from
ticks 42,386 through 42,507; there was no displacement or up/down routing loop.
The corrected live state was saved at revision 43,260.

Focused temporary-bed, bedroll-retargeting, and completed-family-home
regressions pass 3/3. The family-home proof also reruns the founding sleeping
place synchronizer after occupancy and verifies that no released bedroll can
reclaim a housed resident. The strict audit covers 1,989 functions with zero
non-template functions over thirty lines, and `git diff --check` is clean.

Phase checkpoint: R0–R3, R7, and R8.0–R8.3 remain complete at the automated
contract level. R4–R6, R8 overall, and R8.4 remain in progress. The home-sleep
route and disappearing/bouncing bed regression are closed. The animal-remains
pit incorrectly placed inside the farmhouse remains an open defect. R8.5
remains in planning-contract and live validation; R8.6–R8.7 remain open.

## Implementation progress — checkpoint 127 / emergency dairy reserve

The next survival checkpoint found seven portions of fresh milk while prepared
meals and forage were empty and several founders remained at hunger zero. The
mayor's food outlook counted dairy, but personal survival readiness did not;
residents could therefore starve beside an acknowledged edible reserve.

Fresh milk is now a third-tier emergency food after cooked meals and gathered
forage. It restores only half a normal meal's hunger value, so it wards off
starvation without becoming the intended long-term diet. Claims remain finite
and conserved against the dairy stockpile, and danger-ordered assignment still
gives the scarcest portion to the founder in greatest need.

The focused dairy fallback, scarce-meal ordering, and emergency-cook
preemption regressions pass 3/3. The strict audit covers 2,002 functions with
zero non-template functions over thirty lines, and `git diff --check` is clean.
In the reloaded visible save at Day 26 night, Edda Voss, Niko Brand, and Klara
Holt were actively drinking emergency fresh milk while Marta Pell continued
the lit emergency fish-stew job. Ordinary third-home construction remained
suspended for rest.

Phase checkpoint: R0–R3, R7, and R8.0–R8.3 remain complete at the automated
contract level. R4–R6, R8 overall, and R8.4 remain in progress. Emergency dairy
use closes an immediate starvation-readiness hole, but the colony still lacks
a stable multi-day food reserve. The Holt–Eder home remains under construction;
R8.5 remains in planning-contract and live validation, and R8.6–R8.7 remain
open.

## Implementation progress — checkpoint 126 / second household home gate

The Brand–Venn family cottage completed physically at Day 25: its timber shell,
roof, doors, furniture, and three permanent beds are visible and the building
has its English identity label. The sleeping inventory immediately retired the
three Brand–Venn bedrolls, leaving six assigned permanent beds and exactly four
assigned bedrolls for the still-homeless Holt–Eder household. The next distinct
`founder_house_woodcutter` project is already available, proving that continuous
housing advanced across the completed-home boundary.

Phase checkpoint: R0–R3, R7, and R8.0–R8.3 remain complete at the automated
contract level. R4–R6, R8 overall, and R8.4 remain in progress. Two of three
founding household homes are now physically complete; the Holt–Eder cottage,
stable food reserve, and remaining R8 infrastructure are still open. R8.5
remains in planning-contract and live validation; R8.6–R8.7 remain open.

## Implementation progress — checkpoint 121 / structure-label edge cleanup

The apparent second outline beneath the Weiss–Voss farmhouse was not another
construction plan or lost wall state. The live projection still contained
exactly 42 completed farmhouse walls and no duplicate farmhouse construction
cells. The artifact came from the structure-name plate covering most of the
bottom wall sprites while leaving their lowest pixels exposed as a repeated
line.

Completed-building labels now use a flat borderless backdrop and anchor from
the projected lower edge of the building's bottom wall. The offset therefore
adapts to camera zoom instead of relying on a fixed pixel guess. The rebuilt
native client visibly shows the complete farmhouse bottom wall, a clean gap,
and the English `Weiss-Voss family farmhouse` label below it without the false
outline. The same correction applies consistently to every completed building.

Unity 6000.5.10f1 rebuilt the macOS player successfully. The strict function
length audit remains clean, and `git diff --check` passes.

Phase checkpoint: R0–R3, R7, and R8.0–R8.3 remain complete at the automated
contract level. R4–R6, R8 overall, and R8.4 remain in progress. The farmhouse
wall, bed, sleep-routing, and label-edge rendering defects are closed. The
animal-remains pit inside the farmhouse remains open. R8.5 remains in
planning-contract and live validation; R8.6–R8.7 remain open.

## Implementation progress — checkpoint 122 / animal structural collision

Animal wandering had a separate and incomplete collision contract: it blocked
mountains, mine chambers, water, and trees, but allowed animals to enter
buildings, furniture, construction cells, fences, closed doors and gates,
signs, and pits. Predator pursuit used an even smaller blocked set. Both normal
movement and pursuit now honor the full physical obstruction set while open
doors and open gates remain passable.

The fix also repairs persisted animals already overlapping a newly completed
structure. Such an animal is moved once to the nearest valid, unoccupied cell
inside its legitimate home range or enclosure; ordinary wandering resumes from
there. This was required for Willow, whose old tether range was later occupied
by the completed farmstead barn. Preventing new wall entry alone would have
trapped her inside.

In the restarted visible simulation, Willow moved off the barn's bottom wall to
`(-58,53)` and Thistle remained outside at `(-57,54)`. Across the observed
ticks 49,279–49,345, both sheep wandered only south of the barn and recorded
zero positions inside its `(-63..-52,45..52)` footprint. Focused structural
collision and persisted-overlap recovery regressions pass 2/2. The strict
function audit covers 1,991 functions with zero violations, and `git diff
--check` is clean.

Phase checkpoint: R0–R3, R7, and R8.0–R8.3 remain complete at the automated
contract level. R4–R6, R8 overall, and R8.4 remain in progress. Animal wall and
fence collision is closed; completing the intended species-specific sheepfold
and naturally transferring the sheep into it remain part of the R8 livestock
buildout. The invalid animal-remains pit inside the farmhouse remains open.

## Implementation progress — checkpoint 123 / continuous household housing

The apparent labor shortage around the two remaining household homes was a
real scheduler defect, not merely the night schedule. Parallel founding
housing required a fresh sixty-lumber surplus every time it tried to post a
home. The first farmhouse consumed that surplus, so the planned Brand–Venn and
Holt–Eder homes had no parent construction job. Without a parent job, their
material deliveries could not exist and the forestry system could not see an
unmet construction-lumber demand. Qualified villagers therefore truthfully
reported that no position was open while two empty blueprints remained on the
map.

The surplus threshold is now a one-time gate. Seasonal food work and sixty
lumber are still required to begin private housing, but an active housing
commission with a completed or already-posted home must continue household by
household. The next planned household receives its own construction job even
when the stockpile is depleted; that unmet bill then creates the dependent
felling, sawing, delivery, survey, and construction-cell work.

The focused regression proves that after the first household is housed, a
food-security work order with zero lumber still queues the next distinct
household home and opens forestry or sawmill supply work. In the corrected
live save, `founder_house_brand` appeared immediately after restart. During
Day 22 work hours Ada built, Edda and Bram hauled building lumber, Klara felled
timber, and Marta and Lina sawed logs while the other villagers covered food,
animals, and safety. Two visual observations showed workers changing positions
around the cottage and lumber workshop. By tick 52,020 the cottage had advanced
from 0 to 152 of 600 work-minutes and suspended normally for nighttime rest;
all ten founders were then eating or traveling to assigned sleep work rather
than falsely waiting for construction. At tick 52,943 on Day 23, the cottage
automatically resumed with Ada carrying the shared hammers, Bram and Edda
supplying the site, Lina and Marta sawing, and its progress advancing to 162.

The targeted new regression passes. The broader R1/M-11.1 selection passes
48/51; its three existing failures remain the long farm-fence completion proof,
the founding-pipeline role-specific hauling assertion, and the exact
hauler-before-builder progress assertion. The strict audit covers 1,992
functions with zero non-template functions over thirty lines, and `git diff
--check` is clean.

Phase checkpoint: R0–R3, R7, and R8.0–R8.3 remain complete at the automated
contract level. R4–R6, R8 overall, and R8.4 remain in progress. Continuous
household construction is now live-proven, but both remaining homes still need
to complete naturally and the three broader founding regressions above remain
release blockers. The animal-remains pit inside the farmhouse remains open.
R8.5 remains in planning-contract and live validation; R8.6–R8.7 remain open.

## Implementation progress — checkpoint 124 / temporary bedroll retirement

Founding bedrolls now follow an explicit temporary-equipment lifecycle. Each
bedroll remains personally assigned while its founder is homeless. Once that
founder has an assigned permanent household bed, the reeve records a
`bedroll_retired` decision and the corresponding bedroll fixture is physically
removed. The synchronizer cannot recreate a retired bedroll for a housed
resident. Permanent beds, other furniture, and bedrolls still assigned to
homeless founders are never affected by this cleanup rule.

The village now maintains a sleeping-place inventory with permanent-bed count,
assigned permanent beds, active and assigned bedrolls, homeless residents, and
cumulative bedroll retirements. This provides the same assignment discipline
for temporary sleeping equipment as permanent beds and creates a clean place
to extend the model with species-specific animal sleeping spots later.

The focused lifecycle proof begins with ten personal bedrolls, installs three
permanent beds for the Weiss–Voss household, and proves that exactly those
three bedrolls are retired by the reeve. Seven homeless founders retain seven
assigned bedrolls, all three permanent beds remain assigned, and a repeated
synchronization creates neither duplicate fixtures nor duplicate retirement
events. The related homeless-bedroll, workshop relocation, and complete-home
tests pass 4/4.

The corrected live save now projects exactly seven unique canvas bedrolls in
the lumber workshop for Lina Roth, Friedel Koch, Bram Eder, Tomas Venn, Marta
Pell, Klara Holt, and Niko Brand, plus the three permanent Weiss–Voss beds.
No released bedroll remains visible for Ada Weiss, Edda Voss, or Mei Lin. The
strict audit covers 1,996 functions with zero non-template functions over
thirty lines, and `git diff --check` is clean.

Phase checkpoint: R0–R3, R7, and R8.0–R8.3 remain complete at the automated
contract level. R4–R6, R8 overall, and R8.4 remain in progress. Temporary
founder sleeping-place assignment and retirement are now live-proven; animal
sleeping-place ownership remains a planned livestock extension. R8.5 remains
in planning-contract and live validation; R8.6–R8.7 remain open.

## Implementation progress — checkpoint 125 / starvation-first food triage

The five-minute survival checkpoint found a critical priority inversion rather
than ordinary idleness. Ada Weiss and Niko Brand reached hunger zero while
continuing farm and housing work. Raw fish was available, but the only cook was
still assigned to the lumber pipeline, so no prepared portion existed from
which their personal eating jobs could be posted.

Founding meal production now becomes an emergency food duty whenever any
living founder crosses the survival warning threshold. That duty outranks the
worker's ordinary skill queue, may safely interrupt a carried shared tool by
returning it to stock, and continues at the lit founding kitchen/campfire during
rest hours while ordinary construction and lumber work stops. Personal survival
jobs are also considered in danger order, so scarce prepared portions are
claimed by the resident with the lowest urgent need rather than whichever
resident happens to appear first in state order.

Focused proofs show that critical hunger interrupts an active innkeeper saw
assignment, conserves the shared saw, starts emergency fish cooking even after
the clock enters rest, and assigns a single scarce meal to the most endangered
founder. The related communal-meal and normal rest-suspension contracts remain
green. The four focused regressions pass 4/4. The strict audit covers 1,998
functions with zero non-template functions over thirty lines, and `git diff
--check` is clean.

In the reloaded visible save, Marta Pell's emergency fish stew remained active
through the night while both saw jobs and housing suspended. At tick 57,959 the
first scarce prepared portion was assigned to hunger-zero Ada Weiss, who was
walking to the meal; gathering continued and the remaining hunger-zero founders
remained first in the subsequent survival queue. This closes the scheduler
inversion, although the colony's dangerously thin food reserve remains an
active simulation risk rather than a completed food-security gate.

Phase checkpoint: R0–R3, R7, and R8.0–R8.3 remain complete at the automated
contract level. R4–R6, R8 overall, and R8.4 remain in progress. Emergency food
preparation and scarce-meal triage are now live-proven, but stable multi-day
food reserves and completion of both remaining household homes are still
required before the founding survival gate can be considered secure. R8.5
remains in planning-contract and live validation; R8.6–R8.7 remain open.

## Implementation progress — checkpoint 128 / family holdings and town transition

The architect now distinguishes the founding commons from the next settlement
stage. No common barn, field, or tether is removed while the Holt–Eder home is
unfinished. After all three homes are habitable, the plan advances toward three
owned holdings rather than cloning one generic community farm:

- the Weiss–Voss crop holding inherits the grain and vegetable fields;
- the Brand–Venn livestock holding plans direct barn-to-pasture circulation
  for cattle, sheep, and working dogs;
- the Holt–Eder woodland holding plans secure small-stock housing for pigs and
  chickens alongside its woodlot economy.

Each holding has a future detached stone kitchen with a one-cell firebreak. A
kitchen may not share the timber dwelling wall. The founding barn and pasture
remain an operating commons until each replacement enclosure is physically
complete, gated, reachable, and capable of shelter circulation; only then may
the relevant animals be transferred and their temporary tethers removed.

The settlement evolution contract is now explicit: `founding_village` is the
active survival stage, `family_hamlet` follows completed household holdings,
and `masonry_town` requires a working quarry and sustained food surplus. A city
stage is deliberately out of scope. Roads remain dirt during survival. The
architect may straighten and improve the principal road only after housing,
food security, quarry production, detached kitchens, and fire-safe service
buildings stop competing for critical labor and stone. The forge and later inn
belong to that masonry town core rather than being inserted among timber homes
without fire separation.

The planning regression proves all three household ownership records, the
large-stock and small-stock species split, detached stone-kitchen constraints,
commons-retention gate, and out-of-scope city boundary. This is a planning
contract only: it intentionally posts no new construction while the third
founder home and emergency food recovery remain active.

Phase checkpoint: R0–R3, R7, and R8.0–R8.3 remain complete at the automated
contract level. R4–R6, R8 overall, and R8.4 remain in progress. Family holdings
and the village-to-town transition are now specified at master-plan level; the
Holt–Eder home must complete before household boundary surveys and replacement
animal housing may enter the work queue. R8.5 remains in planning-contract and
live validation; R8.6–R8.7 remain open.

## Implementation progress — checkpoint 129 / housing gate and food stabilization

The visible Day 29 town naturally completed all three founder homes. Each home
is roofed and habitable, all ten founders have permanent assigned beds, and the
homeless count has fallen from four to zero. This completes the physical
founder-housing gate rather than merely a project flag.

Completion now releases the three family holdings for boundary survey and
advances the settlement plan from `founding_village` to `family_hamlet`. It
does not remove the common fields, barn, pasture, tethers, or storage. Those
remain in service until their family replacements are physically complete and
operational.

Food is the active survival blocker: the observed reserve is only 3/10
one-day portions, one founder is in hunger danger, and seasonal planting is not
yet established. The communal kitchen previously depended on food security
becoming the mayor's primary project, creating a sequencing deadlock. It may
now be posted as parallel post-housing survival construction while fishing,
foraging, farming, animal care, and hunting remain active. Quarrying, forge
construction, household kitchens, smokehouse/butchery expansion, storage
replacement, nets, and boats remain subordinate to establishing a credible
food floor.

Focused regressions prove the initial deferred holding state, release after all
three homes become habitable, and parallel communal-kitchen posting without
removing food work. The strict audit covers 2,009 functions with 138 declared
template/data exemptions and zero non-template functions over thirty lines;
`git diff --check` is clean.

Phase checkpoint: R0–R3 and R7 remain complete at the automated-contract
level. R4–R6 and R8 overall remain in progress. R8.4 remains in progress, but
its permanent founder-housing sub-gate is now physically complete. R8.5 has
advanced to `family_hamlet` planning and live validation; R8.6–R8.7 remain
open. Immediate acceptance is now food reserve, communal kitchen operation,
bounded storage use, and corrected field/enclosure geometry.

## Implementation progress — checkpoint 130 / permanent-bed sleep presentation

Completed permanent beds now block ordinary movement. The sleep job retains a
deliberate endpoint exception so the assigned resident can enter the bed's
sleeping cell without making the bed a general walkway. Temporary communal
bedrolls remain step-over survival gear: making those solid during the founding
stage physically deadlocked builders inside the shared lumber workshop in the
natural-construction regression.

The Unity presentation now keeps the complete 1-by-2 bed visible while it is
occupied, aligns the resident along the bed footprint, shifts the head toward
the pillow end, and draws a muted blanket over the torso and lower body. The
blanket is a separate layer above the resident. Animal sleep does not receive a
human blanket. The same renderer also supports the horizontal 2-by-1
orientation used by temporary bedrolls.

The rebuilt native client was inspected during Day 32's rest block. All ten
founders were sleeping at home, all ten permanent bed fixtures remained in the
Unity projection, and every persisted permanent bed reported
`walkable: false`. The visible beds remained beneath the sleeping figures, with
the colored covers and exposed heads making the sleep state readable. No bed
fixture disappeared during the inspection.

Focused sleep, projection, and natural-home construction regressions pass
(3/3). The strict audit covers 2,012 functions with 138 declared template/data
exemptions and zero non-template functions over thirty lines; the native Unity
build succeeds and `git diff --check` is clean.

Phase checkpoint: R0–R3 and R7 remain complete at the automated-contract
level. R4–R6 and R8 overall remain in progress. R8.4's permanent founder
housing and permanent-bed presentation sub-gates are physically complete.
R8.5 remains in `family_hamlet` live validation; R8.6–R8.7 remain open. The
immediate acceptance sequence remains food reserve, communal kitchen
operation, bounded storage use, and corrected field/enclosure geometry.

## Implementation progress — checkpoint 131 / commission-budget scheduler repair

The Day 32 idle-work inspection exposed a false eligibility failure rather than
a shortage of capable founders. The completed farmstead commission had exceeded
its estimated lumber budget by two units, and the budget flag was copied onto
every job carrying that commission identity. This incorrectly stopped farming,
foraging, lumber production, milking, hauling, and the parallel kitchen while
reporting only `no_eligible_actor`.

Commission overruns now block only work that actually spends the construction
budget. Ordinary survival and production jobs remain eligible. Parallel
founding construction is also excluded from another project's usage ledger, so
the emergency communal kitchen no longer consumes or inherits the completed
farmstead's budget.

After save and server reload, the false blocked-job set cleared. Fishing,
foraging, cooking, crop tending, lumber sawing, and milking all resumed during
the Day 32 work block. Focused budget-accounting regressions pass (2/2), the
strict audit covers 2,013 functions with zero violations, and
`git diff --check` is clean.

The scheduler gate is not yet complete: several founders can still become idle
after those finite jobs are claimed, while the available communal-kitchen
deliveries lack a continuously replenished timber-to-lumber supply chain. The
next correction must keep forestry, sawing, and hauling posted from the
kitchen's explicit material deficit until the building becomes ready.

Phase checkpoint: R0–R3 and R7 remain complete at the automated-contract
level. R4–R6 and R8 overall remain in progress. R8.4 housing and permanent-bed
presentation remain physically complete. R8.5 remains in `family_hamlet` live
validation; its food and communal-kitchen production chain is the immediate
blocker. R8.6–R8.7 remain open.

## Implementation progress — checkpoint 132 / live work-chain recovery

The apparent post-reload pause was the native client remaining paused, not a
second scheduler failure. After explicitly resuming Observe 16x, the corrected
Day 32 colony assigned all ten founders to concrete activity. The observed
mix included fishing, emergency foraging, meal hauling/cooking, sawing,
construction-material hauling, kitchen wall construction, mayoral food
coordination, and legitimate personal eating or morale activity. No founder
reported `no_eligible_actor`, founding standby, or open-position waiting in the
verified sample.

This live sample also proves that the kitchen's immediate timber-to-lumber-to-
delivery chain can resume after the commission-accounting correction. It does
not yet prove sustained completion of the communal kitchen or the full food
floor, so those remain the next acceptance observations.

Phase checkpoint: R0–R3 and R7 remain complete at the automated-contract
level. R4–R6 and R8 overall remain in progress. R8.4 housing and permanent-bed
presentation remain physically complete. R8.5 remains in `family_hamlet` live
validation; the next gate is sustained food reserve plus physical completion
and operation of the communal kitchen. R8.6–R8.7 remain open.

## Implementation progress — checkpoint 133 / guard survival reassignment

Day 35 exposed the watchman performing a routine patrol while the entire food
reserve remained below one day. Routine patrols now cancel during a founding
food emergency when no incident is active. The guard is released from the
patrol reservation and returns to the ordinary skill-priority queue; real
danger and reported incidents continue to override civilian work.

After save, reload, and Observe 16x resumption, the watchman hauled a vegetable
harvest instead of patrolling. Eight founders were actively fishing, farming,
milking, felling timber, constructing the kitchen, installing its hearth and
table, or hauling food. Two founders were temporarily waiting on contested
positions rather than falsely blocked. No routine patrol remained open.

The focused normal-patrol and food-emergency regressions pass (2/2). The strict
audit covers 2,016 functions with 138 exemptions and zero violations;
`git diff --check` is clean.

Phase checkpoint: R0–R3 and R7 remain complete at the automated-contract
level. R4–R6 and R8 overall remain in progress. R8.4 housing and permanent-bed
presentation remain physically complete. R8.5 remains in `family_hamlet` live
validation; the communal kitchen is in fixture construction, but the one-day
food floor is still unmet. R8.6–R8.7 remain open.

## Implementation progress — checkpoint 134 / communal kitchen operation

The founders' inn kitchen is now physically complete: all 49 planned elements,
the enclosing walls, roof, door, hearth, work fixtures, and bounded pantry are
present. The production chain also ran in the live colony. Marta Pell completed
fish and vegetable stew jobs and placed prepared meals into the kitchen's
finite meal storage. This advances R8.5 from construction proof to initial
operation proof.

The food gate is not complete. Prepared meals are consumed nearly as quickly as
they are produced, crop harvests have not yet stabilized, and the total reserve
continues to cross below the ten-founder one-day floor.

Phase checkpoint: R0–R3 and R7 remain complete at the automated-contract
level. R4–R6 and R8 overall remain in progress. R8.4 housing and permanent-bed
presentation remain physically complete. R8.5 now has a complete and operating
communal kitchen, but sustained food reserve and full worker utilization remain
open. R8.6–R8.7 remain open.

## Implementation progress — checkpoint 135 / emergency gathering crew

The Day 36–37 watchdog found four to six founders off duty or truthfully idle
while the food reserve oscillated between eight and eleven portions. Emergency
gathering had been serialized through the herbalist even though founding labor
was otherwise available. Founding general laborers can now assist a skilled
forager, and the mayor can post up to three distinct, parallel gathering jobs
against separate ripe patches. Each job retains a named patch, worker,
production record, and finite output; it does not manufacture food or let two
workers harvest the same plant.

The focused emergency-gathering regression passes, including proof that more
than one finite patch is harvested. The strict audit covers 2,016 functions
with 138 exemptions and zero violations, and `git diff --check` is clean. The
native simulation was saved, the server reloaded, and Observe 16x resumed.

Live recheck remains a blocker rather than a completion claim. At Day 37 14:40
the reserve was exactly ten portions but no wild patches were currently ripe,
so no gathering job could be posted; six founders were idle while fishing,
cooking, and one-cell site clearing continued. The next scheduler correction
must parallelize ready site-clearing/building cells and provide useful fallback
work without inventing unavailable food inputs.

Phase checkpoint: R0–R3 and R7 remain complete at the automated-contract
level. R4–R6 and R8 overall remain in progress. R8.4 housing and permanent-bed
presentation remain physically complete. R8.5 has an operating kitchen but is
still blocked on sustained food and work utilization. R8.6–R8.7 remain open.

## Implementation progress — checkpoint 136 / parallel site-clearing cells

Approved specialist sites no longer expose only the first tree as a serial
project. The architect's complete set of uncleared cells is now ordered and up
to three distinct cells can be posted concurrently. Existing in-flight clearing
work migrates into the same cell queue. Every job retains its own tree target,
tool requirement, worker, work-order lineage, stump effect, and lumber output.
The normal storage availability calculation counts every unfinished output, so
the parallel jobs cannot promise more logs than the bounded yard can hold.

The forge construction regression now explicitly proves at least two site cells
are open concurrently before proving that every planned tree becomes a stump
and the physical forge proceeds. The regression passes. The strict audit covers
2,019 functions with 139 template/data exemptions and zero non-template
functions over thirty lines; `git diff --check` remains clean.

After save, reload, and Observe 16x resumption, the Day 38 work block had nine
of ten founders assigned to concrete work: two sawyers, construction surveying,
material delivery, project assistance, crop tending, milking, eating, and the
last granary/store clearing cell. Mei Lin alone reported contention because all
currently eligible positions were claimed. The live site had only one tree left,
so parallelism is regression-proven but could not be visually demonstrated on
that nearly cleared plan.

Phase checkpoint: R0–R3 and R7 remain complete at the automated-contract
level. R4–R6 and R8 overall remain in progress. R8.4 housing and permanent-bed
presentation remain physically complete. R8.5 has an operating kitchen and a
repaired multi-cell construction queue, but sustained food reserve, the
granary/store's physical completion, and full operational proof remain open.
R8.6–R8.7 remain open.

## Implementation progress — checkpoint 137 / streamed vertical camera input

The native camera previously discarded directional input whenever Observe 16x
reported the simulation busy. Because accelerated simulation is almost always
busy, north/south chunk requests appeared completely broken. Camera movement
now queues a requested center while simulation work is active instead of
dropping the input. The rebuilt native client visibly moved from camera
`-69,-44` to `-63,-66` and back across a streamed vertical boundary while the
simulation remained at Observe 16x. The horizontal and vertical busy-input
regression passes. Mouse-drag feel still needs a separate visual acceptance
pass; this checkpoint proves keyboard streaming, not every input mode.

Phase checkpoint: R0–R3 and R7 remain complete at the automated-contract
level. R4–R6 and R8 overall remain in progress. R8.5 remains in live town
validation, and R8.6–R8.7 remain open.

## Implementation progress — checkpoint 138 / enforceable logistics layout

The current lower construction site was identified as the Stonebridge granary
and store, not a quarry. The prior architect accepted its door nineteen cells
from rendered road and about fifty cells from construction lumber because the
master plan's broad overlapping districts did not enforce its documented road
corridors. Under the migrated plan, that same approved site is identified as
requiring a four-cell dirt access spur to `farm_cart_lane`; one-cell frontage
remains the preferred direct-access standard.

Facility placement now carries a named entrance-access contract. The plan
distinguishes the founders' road, farm and stable lanes, market street, civic
service lane, food-processing lane, industrial haul lane, inn guest lane, and
eastern defensive approach. Granary, mill, bakery, inn, forge, carpenter,
health, and security sites must meet their correct route as well as their
district and dependent facilities. A five-seed regression proves all default
sites satisfy those contracts, while a displaced granary regression proves a
site beyond a practical short spur is no longer sufficient.

The regional plan now also records a visible managed woodland edge and names
two outlying works: the Managed Woodland Timber Camp at the forest edge and
the Stonebridge Quarry and Stonecutting Yard at an exposed rock face. Its
inspectable flows are woodland -> timber camp -> lumber workshop, ridge ->
quarry works -> forge/town, farmstead -> granary -> mill, and mill -> bakery ->
inn. This is the planning and validation contract; physical dirt-road jobs,
current-granary remediation, and natural construction/operation of both
resource-edge works remain open and must not be claimed from plan data alone.

The migrated live plan has now assigned the disconnected granary a named four-cell
`specialist_granary_access_spur`, from the farm cart lane at `(-35,52)` to its
door at `(-35,56)`. It is deliberately a planned dirt route rather than a
silent claim that a road already exists. Posting, completing, rendering, and
then validating that road work remains the next physical circulation step.

Focused layout and natural-construction tests pass (11/11), including the
forge, gatehouse, and architect revision workflows. The strict audit covers
2,031 functions with 141 template/data exemptions and zero non-template violations;
`git diff --check` is clean. The live save migrated to three regional source
anchors and the named logistics network without resetting the colony.

Phase checkpoint: R0–R3 and R7 remain complete at the automated-contract
level. R4–R6 and R8 overall remain in progress. R8.5 now has an enforceable
town/logistics plan, but the granary spur, physical roads, resource-edge works,
sustained food reserve, and full operational proof remain open. R8.6–R8.7
remain open.

## Implementation progress — checkpoint 139 / visible sleeping occupants

The first blanket presentation covered the entire pawn and made an occupied
bed look empty. Permanent-bed sleepers now retain their person sprite at the
pillow end while a shorter blanket, shifted toward the foot, covers the torso
and legs. The obsolete 1.34-cell full-body cover was replaced by a 1.05-cell
cover with a larger shoulder offset. The focused projection regression passes,
the strict function audit remains clean, and the native macOS client rebuilt
successfully. A live Day 39 night inspection with nine residents asleep shows
their heads above the blankets and the beds retained beneath them.

Phase checkpoint: R0–R3 and R7 remain complete at the automated-contract
level. R4–R6 and R8 overall remain in progress. This closes the current R6/R8
sleep-presentation defect; R8.5 circulation, resource works, and food stability
remain open, followed by R8.6–R8.7.

## Implementation progress — checkpoint 140 / explicit sleeper identity

The exposed end of the rotated pawn sprite was still too subtle and could make
an occupied bed read as empty at normal zoom. Sleeping presentation no longer
depends on accidental sprite overlap: every non-animal sleeper now receives an
explicit head above the blanket at the pillow end. The head uses the resident's
projected skin tone and hair color, while the shorter blanket continues to
cover the torso and legs and leaves the physical bed visible underneath.

The focused sleeping-render regression passes, the strict audit covers 2,041
functions with 141 approved template/data exemptions and zero non-template
functions over thirty lines, `git diff --check` is clean, and the native macOS
client rebuilt successfully. Live night occupancy is being rechecked after the
natural Day 39 work period; this checkpoint does not infer visual acceptance
from the source assertion alone.

Phase checkpoint: R0–R3 and R7 remain complete at the automated-contract
level. R4–R6 and R8 overall remain in progress. The sleeper-head correction is
implemented under R6/R8 presentation; live revalidation remains in progress.
R8.5 circulation, resource works, and food stability remain open, followed by
R8.6–R8.7.

## Implementation progress — checkpoint 141 / founding food dispatch

The Day 40 reserve exposed a real scheduler failure rather than a reporting
problem: ten residents had only about eight edible portions while the fisher
and cook could be diverted into construction and lumber work. Founding food
collection and cooking now carry an explicit reserve duty whenever usable food
falls below one portion per resident. Skill queues expose fishing and cooking
directly, existing saved jobs migrate those skills and priorities, and only
starvation-level personal hunger can make the cook abandon food production.
Emergency forage work also prefers general workers instead of stealing the
fisher, innkeeper, farmer, or herder.

The visible Day 41 proof showed Tomas Venn fishing from an actual river cell,
Marta Pell preparing fish stew, and Mei Lin gathering emergency forage. The
reserve rose from roughly eight portions to thirteen before normal consumption
reduced it to eleven by 16:54. This crosses the ten-person one-day floor but is
not yet the thirty-portion stable reserve. Grain, vegetables, meat, and eggs
remain at zero; one resident was below the hunger warning threshold at the
last checkpoint. Food collection is therefore operational but only narrowly
keeping pace.

The widened three-cell jetty now gives the fishing scheduler alternate bank
positions instead of blocking on one occupant. Its fish stockpile was moved to
the fixture anchor so saved container identity, inspection, and hauling agree.
The food, life, and economy suite passes 57/57; the strict audit covers 2,043
functions with 141 approved template/data exemptions and zero violations, and
`git diff --check` is clean.

Phase checkpoint: R0–R3 and R7 remain complete at the automated-contract
level. R4–R6 and R8 overall remain in progress. R8.5 food dispatch is repaired,
but sustained food stability, farm harvests, animal foods, granary circulation,
and resource-edge works remain open. R8.6–R8.7 remain open.

## Implementation progress — checkpoint 142 / three-day food duty and first R8.6 state

The one-day food threshold was not a stability policy: it repeatedly released
the fisher and cook as soon as the ten founders could survive one more day.
Founding food duty now remains reserve-critical until all edible stores reach
three portions per living resident. A mature crop under that threshold becomes
priority-136 food work, so field watering, building, and leisure cannot leave a
ready harvest standing while the pantry is unsafe.

The Day 42 visible run proves the corrected chain is active. Tomas continued
fishing, Marta converted delivered fish into meals, Ada began the first natural
west-field grain harvest, and the food stock rose from eight dawn portions to
about thirteen portions plus a growing physical field pile. This remains below
the thirty-portion stability gate and therefore does not close R8.5.

The granary exposed a separate scheduler defect: a construction helper moved
to survival work while retaining its claim on the final fixture. That stale
claim blocked the parent project for 69 retries despite all material being
present. Survival preemption now releases the claimed construction element and
reclaims it only if the helper legitimately resumes. In the live run the final
fixture completed immediately after reload; the granary is physically complete
and now awaits its two-stage final inspection.

R8.6 now has its first persisted foundation. All ten founders have a birth day,
age, adult life stage, sex, health and reproductive state, origin, explicit
parent/child/sibling/guardian/partner arrays, and arrival history. Five sparse,
event-backed founding relationships include three reciprocal partnerships and
two mentorships. Birthday changes are processed once per day, references are
validated, the state survives exact save/load, and the Unity meaning projection
exposes age, life stage, sex, and partners. Courtship, conception/adoption,
children, dependency schedules, migration, succession, dynamic encounters, and
civic-cohesion derivation remain open; this is not an R8.6 completion claim.

Focused food, construction-preemption, demography, richness, and save/load
regressions pass. The strict audit covers 2,055 functions with 141 approved
template/data exemptions and zero functions over thirty lines; `git diff
--check` is clean.

Phase checkpoint: R0–R3 and R7 remain complete at the automated-contract
level. R4–R6 and R8 overall remain in progress. R8.5 has an active natural
harvest and a physically complete granary pending commissioning, but its
thirty-portion reserve, circulation, animal foods, and resource-edge works are
open. R8.6 is now in progress at the persisted identity/relationship-foundation
layer. R8.7 remains open.

## Implementation progress — checkpoint 143 / occupied fishing-bank repair

The Day 43 reserve briefly fell to seven portions, below the ten-founder
one-day floor. Emergency gathering, cooking, milking, farming, and hunting
raised it naturally to twenty-four portions, but the river job repeatedly
reported `destination_occupied` whenever another entity occupied the primary
bank cell. The fishing planner had three nominal alternatives on the same side
of the river and then fell back to the known-blocked cell, so Tomas could be
left without valid food work.

Fishing now evaluates four passable banks around the real water cell, preserves
an existing assignment only while both its water and bank remain valid, and
does not post a false fallback when every bank is unavailable. A focused
regression occupies the primary pier and proves the job selects the free north
bank while still targeting the river. The three fishing regressions pass, the
strict audit covers 2,057 functions with 141 approved template/data exemptions
and zero violations, and `git diff --check` is clean. The live client was saved,
reloaded on the corrected server, and the fishing job now remains ready rather
than blocked; the current night state is legitimate rest.

Phase checkpoint: R0–R3 and R7 remain complete at the automated-contract
level. R4–R6 and R8 overall remain in progress. R8.5 food recovery is working
and the reserve is at 24/30, but sustained three-day stability is not yet
proved. The physical granary still awaits architect/operator commissioning;
animal foods, circulation, and resource-edge works remain open. R8.6 remains
in progress and R8.7 remains open.

## Implementation progress — checkpoint 144 / regional river fishing

Day 45 exposed a larger cause behind the intermittent fishing stalls. The
founding fishing template still assumed the removed demo pond at local
`0,16`; in the regional-v3 world that cell is grass. Once the last inherited
legacy job completed, no truthful fishing job could be posted even though the
food reserve was only fourteen portions and the surveyed Stonebridge River was
available.

The fishing planner now converts the surveyed river source from global to
settlement-local coordinates, searches the real generated river for a passable
unoccupied bank, and targets an adjacent water cell. It retains the legacy
jetty only in legacy worlds where that water physically exists. A regional-v3
regression proves the selected work cell renders as grass bank and the target
renders as river water; all four focused fishing regressions pass. The strict
audit covers 2,060 functions with 141 approved template/data exemptions and
zero violations, and `git diff --check` is clean.

The visible run was saved and reloaded. Its new fishing job targets local
`59,22`, which projects to global river cell `19,42`; the adjacent global
`18,42` work cell is visible grass. Tomas has the job reserved but temporarily
suspended it for legitimate fatigue recovery at dawn. Food is 15/30 with no
hunger danger, so the repair is operational but sustained stability remains
unproved.

Phase checkpoint: R0–R3 and R7 remain complete at the automated-contract
level. R4–R6 and R8 overall remain in progress. R8.5 now has truthful regional
river fishing plus active farming and cooking, but its thirty-portion reserve,
granary commissioning, animal foods, circulation, and resource-edge works are
still open. R8.6 remains in progress and R8.7 remains open.

## Implementation progress — checkpoint 145 / founding farmhand relief

The Day 46 work-hour inspection found eight founders truthfully idle while the
food reserve remained below one day. The crop queues themselves were sound,
but only the designated farmer possessed the `farm` capability and crop-job
permissions. This made the ready grain and vegetable queues mutually exclusive
and left willing generalists unable to reinforce the harvest.

Every founding adult now has novice farming skill, low farming priority, and
permission to reinforce both crop queues. The farmer retains priority 1 and
the higher skill rank, so she remains the first choice; novice farmhands enter
only when a second ready field or survival contention needs them. A regression
proves the distinction. Replaying the preserved Day 46 state assigned Ada to
grain, the carter to vegetables, and Tomas to the corrected river. After the
visible server reload, Day 47 showed the porter and carter advancing successive
harvest cells concurrently, the innkeeper producing stew, and the herder
drawing livestock water. The crop progress reset to the next cell rather than
stopping after one cell, which is direct queue-continuation proof.

This is not a claim that the idle-work gate is closed. Five generalists still
reported contention after the two fields and other ready survival stations
were occupied. Their downstream hauling and construction work remains blocked
by inputs or the architect's granary inspection. The reserve is about ten
edible portions against the thirty-portion stability target, so R8.5 remains
in danger and requires continued observation.

The focused farmhand regression passes, the strict audit covers 2,060
functions with 141 approved template/data exemptions and zero violations, and
`git diff --check` is clean.

Phase checkpoint: R0–R3 and R7 remain complete at the automated-contract
level. R4–R6 and R8 overall remain in progress. R8.5 now has concurrent crop
harvest, truthful river fishing, cooking, and livestock water work, but food
stability, granary commissioning, full useful employment, circulation, animal
foods, and resource-edge works remain open. R8.6 remains in progress and R8.7
remains open.

## Implementation progress — checkpoint 146 / coordinated harvest crews

The Day 47 noon checkpoint proved that novice farming permission alone was not
enough. Five founders were still idle while both mature fields contained many
queued cells, because each crop type exposed only one assignable job. This was
a real queue-concurrency defect rather than missing resources or bad routes.

Critical harvests now expose three coordinated slots per crop. Each slot claims
a distinct cell from the field's ordered skill queue, and an existing one-slot
save migrates in place without abandoning its claimed cell. Prepare and sow
work deliberately remain single-worker operations so scarce seed handling is
not duplicated. A focused regression proves three unique cell claims and
stable slots for a mature field.

After saving and reloading the visible client, all ten founders had legitimate
survival assignments: six distinct grain/vegetable harvest cells, two emergency
forage patches, real-river fishing, and one reserved meal need. Subsequent
observation showed workers advancing onto new vegetable cells rather than
stopping after one. The rendered town also showed the crew dispersed through
the fields instead of clustered at storage. Food rose from eleven to twelve
portions but remains far below the thirty-portion stability gate.

The three focused crop/farmhand regressions pass. The strict audit covers 2,062
functions with 141 approved template/data exemptions and zero violations, and
`git diff --check` is clean.

Phase checkpoint: R0–R3 and R7 remain complete at the automated-contract
level. R4–R6 and R8 overall remain in progress. R8.5 now has concurrent field
crews and no work-hour idle founder at the live checkpoint, but sustained food
stability, granary commissioning, circulation, animal foods, and resource-edge
works remain open. R8.6 remains in progress and R8.7 remains open.

## Implementation progress — checkpoint 147 / harvest circulation and claim release

Day 48 exposed two linked readiness defects behind apparently idle founders.
First, every general founder carried the `haul` capability, but the founding
permission profile omitted `haul_stock`; valid grain, vegetable, and fish haul
orders therefore remained unassignable. All founders may now haul ready
survival output. The visible replay emptied both field piles, placed the first
grain in bounded storage, and let the innkeeper turn it into meals.

Second, urgent fatigue could suspend a shared crop job while retaining its
field-cell claim and assigned farmer. That stranded the last harvest cell and
prevented the plot from advancing to its next cycle. Survival preemption now
cancels that worker-specific crop assignment, returns the exact cell to the
shared queue, restores any carried input, and permits another eligible
farmhand to claim it. Scheduled night rest remains a suspension because work
should not be reassigned into darkness.

Focused regressions prove universal founding haul permission, unique crop-crew
claims, and crop-cell release under survival preemption. All three pass. The
strict audit covers 2,064 functions with 141 approved template/data exemptions
and zero violations; `git diff --check` is clean. At the visible night check,
nine founders were sleeping in assigned homes and the tenth was safely off
duty. Food remains only thirteen portions against the thirty-portion gate.

Phase checkpoint: R0–R3 and R7 remain complete at the automated-contract
level. R4–R6 and R8 overall remain in progress. R8.5 now has working field-to-
storage circulation and recoverable crop claims, but sustained food stability,
granary commissioning, animal foods, and resource-edge works remain open.
R8.6 remains in progress and R8.7 remains open.

## Implementation progress — checkpoint 148 / conserved-seed sowing crews

Day 49 found six founders idle during work hours while both harvested plots
were being replanted by only one worker each. The first sowing cell correctly
secures one conserved seed batch for the whole plot, but every later cell was
still serialized even after that seed provenance was persisted.

Prepare, harvest, recovery, and cutting now expose three coordinated field
slots. Sowing remains single-worker until the first cell has secured a seed
batch; only then may two more farmhands join, and all later jobs have no seed
input of their own. This preserves the one-batch-per-plot rule while allowing
the village to finish seasonal planting before workers become idle.

The focused regression proves three sowing slots, one persisted seed batch,
and zero duplicate seed inputs. It passes alongside crop-preemption and harvest
crew tests. The strict audit covers 2,065 functions with 141 approved
template/data exemptions and zero violations; `git diff --check` is clean.
After visible reload, two additional founders joined the grain sowing queue,
two distinct vegetable slots were ready for assignment, and the granary's
operator inspection resumed. Food remains thirteen portions against the
thirty-portion stability gate.

Phase checkpoint: R0–R3 and R7 remain complete at the automated-contract
level. R4–R6 and R8 overall remain in progress. R8.5 now has conserved-seed
parallel planting as well as parallel harvest and bounded hauling, but sustained
food stability, completed granary commissioning, animal foods, and resource-
edge works remain open. R8.6 remains in progress and R8.7 remains open.

## Implementation progress — checkpoint 149 / all-hands seasonal food duty

Day 50 still had three idle founders while the guard patrolled and the
architect surveyed a stable at only fourteen stored portions. The policy gap
was that only harvesting counted as reserve-critical; preparation and sowing
were treated as ordinary farm work even though delayed planting threatens the
next food cycle.

Preparation, sowing, harvesting, and crop recovery now all carry founding food
reserve duty while the town is below its three-day reserve. The emergency crew
may expand to six distinct cells, so patrol, leisure, and secondary architecture
yield to seasonal food work. Non-emergency fields retain the smaller three-
person crew. A related storage-accounting defect was fixed: each harvest cell
now reserves only its fractional share of the plot yield instead of reserving
the whole expected crop, which had silently capped a nominal six-person crew at
three jobs.

The visible replay showed six founders on distinct grain cells and two more on
emergency forage while the guard and civic specialists joined food production.
At scheduled rest, all field work stopped rather than continuing into the
unlit night. Crop actions now report `food_reserve_emergency` or
`seasonal_crop_cycle` instead of the misleading `null_below_threshold`.

Four focused crop-priority, capacity, sowing, and preemption regressions pass.
The strict audit covers 2,065 functions with 141 approved template/data
exemptions and zero violations; `git diff --check` is clean. Food fell to about
ten portions during this cycle, so this repair improves throughput but does not
close stability.

Phase checkpoint: R0–R3 and R7 remain complete at the automated-contract
level. R4–R6 and R8 overall remain in progress. R8.5 now enforces all-hands
seasonal food priority and truthful crop readiness, but the thirty-portion
reserve, completed granary commissioning, animal foods, and resource-edge works
remain open. R8.6 remains in progress and R8.7 remains open.

## Implementation progress — checkpoint 150 / landed-food circulation

The Day 51–52 watch found a concrete reason caught fish remained beside the
river while the inn had no fish. An active fishing order exclusively reserved
its output stockpile for the entire job, so the innkeeper's ready haul order
could not claim already-landed fish. Water harvesting no longer claims the
output basket: the fisher retains actor, position, and job claims while a
hauler may independently collect conserved catch.

The first restart exposed a second priority error rather than hiding it. Crop
work carried reserve-critical skill priority, but a ready fish haul did not,
so every eligible founder preferred future harvest work to food already on the
ground. Founding food transfers now carry reserve duty, and a ready transfer
during a shortage carries emergency-food duty. Immediate food circulation
therefore precedes seasonal planting, which remains the next survival tier.
Existing open transfer jobs acquire the policy during reconciliation, so the
repair applies to the persisted town rather than only new games.

At tick 123,410 (Day 52, 16:06), the visible restarted client showed the repair
operating naturally. One fish haul had completed, moving one portion from the
river basket into the inn, and the next haul was active. All ten founders had
legitimate work or survival activity: hauling fish, farming, gathering forage,
eating, or yielding a congested path. Successive visible frames showed actual
movement through the rendered town. The reserve was still only eleven portions
against the thirty-portion stability gate, so food stability is not claimed.

Three focused fishing, concurrent-hauling, and shortage-priority regressions
pass. The strict audit covers 2,066 functions with 141 approved template/data
exemptions and zero violations; `git diff --check` is clean. The broader
founding file remains at four known failures in exhumation, full fence
completion, legacy crew-role expectation, and construction-haul accounting;
none is accepted as closed by this checkpoint.

Phase checkpoint: R0–R3 and R7 remain complete at the automated-contract
level. R4–R6 and R8 overall remain in progress. R8.5 now has concurrent river
production and priority-correct landed-food hauling, but the thirty-portion
reserve, full cooking throughput, granary commissioning, animal foods, and
resource-edge works remain open. R8.6 remains in progress and R8.7 remains
open.

## Implementation progress — checkpoint 151 / visual truth reset

The preserved Day 53 town exposed three visible contradictions that aggregate
status had hidden. Partially sown fields remained labelled `PREPARED` at zero
percent because growth did not begin until every cell in the plot had been
sown. Completed walls and floors retained tree-stump modifications beneath
them. Sleeping presentation replaced the villager with a synthetic head rather
than rendering the actual horizontal actor under the blanket. The rocky ridge
also read as an almost-black void and the functioning geology workflow had no
named physical landmark, making the quarry appear absent.

Crop cells now remember their own planting tick and advance independently as
soon as they are sown; the plot reports that partial growth while later cells
remain in the sowing queue. Construction completion removes stumps covered by
its actual footprint. Beds keep the real rotated character sprite visible,
with the blanket layered over the body rather than substituting a circle.
Unrevealed solid rock remains generic and geology-safe but uses readable rock
mass values instead of near-black fill. The surveyed face is now labelled
`Planned quarry works`, changing to `Stonebridge quarry face` after extraction.
Forge autonomy was moved ahead of stable and mill so the quarry-to-stone-forge
chain is not postponed behind secondary livestock and milling work.

The mining contract was rechecked against the interaction patterns documented
for RimWorld and Dwarf Fortress: designate reachable solid face cells, keep
interior rock impassable, reveal geology only through legitimate exposure or
survey, turn mined walls into traversable floor, conserve finite stone or ore,
and continue through connected ready cells. Stonebridge already implements the
core reveal, finite-deposit, face-access, and wall-to-mine-floor behavior; the
remaining R8 proof is a visibly operating stonecutting yard, connected work
cadence, bounded stone hauling, and the resulting stone forge.

Focused crop and construction regressions pass. The strict audit covers 2,070
functions with 141 approved template/data exemptions and zero violations;
`git diff --check` is clean. The native Unity client builds successfully. The
failed town remains saved as run `28208d84-fd1a-4b10-b2cc-db1357c95670`.
A new regional founding run, `14bcea28-bc14-46e5-8731-5bd757e7f8a5`, started
at Day 1 on the corrected client and is running visibly at Observe 16x. Its
regional payload contains a distinct named quarry reserve at the rocky ridge.
At the Day 1 night visual checkpoint, the selected grain field was still
`PREPARED` while unsown cells remained, but its already-planted cells reported
one-percent growth. This is direct rendered proof that partial sowing no longer
holds the entire field at zero.

Phase checkpoint: R0–R3 and R7 remain complete at the automated-contract
level. R4–R6 remain in progress pending natural proof in the clean run. R8
remains in progress: the visual reset, per-cell crop growth, stump clearing,
sleep layering, geology readability, quarry naming, and forge ordering are
implemented, while the operating quarry yard, bounded stone circulation,
natural stone-forge completion, stable food reserve, and full R8.4–R8.7 town
proof remain open.

The broader food/development pass then caught one additional priority leak:
open emergency-forage jobs survived after the durable reserve returned above
one day. Those jobs now cancel with the explicit reason
`emergency_food_reserve_restored`, releasing their workers for the next ready
survival skill. The focused regression passes; the strict audit now covers
2,071 functions with the same 141 exemptions and zero violations. The complete
food/development regression set passes 66/66 after the repair. The corrected
visible run was saved during Day 2 rest with the lumber workshop physically in
progress and the next architect reservations visible on the map.

## Validation checkpoint 152 / Day 13 prolonged visible run

The clean run was inspected and preserved at tick 30,204 (Day 13, 20:02). It
is not a successful founding proof. The lumber workshop is complete and
roofed, the farmstead barn is roofed but only enclosed, the Weiss-Voss family
farmhouse is complete and roofed, and the pasture has a real gate and barn
access. Three permanent beds are assigned and three obsolete bedrolls were
retired, but seven founders remain homeless and use assigned workshop
bedrolls. Two further family houses are only construction reservations.

Food is surviving hand-to-mouth rather than stabilizing. Prepared meals,
grain, vegetables, fish, meat, milk, eggs, animal feed, and stable water are
all at zero. Several small field-harvest piles exist but have not become a
durable reserve. The food ledger shows repeated single portions of wild forage
being gathered and immediately eaten. Human hunger is currently controlled,
but the town has no buffer.

The selected grain field visibly reports growth at 23 percent on Day 13,
despite expected maturity on Day 10, with moisture 10, damage 10, fertility 40,
and drought wilt. Its aggregate plot progress is 56 percent, confirming that
per-cell growth now works but the field-care loop does not: no ready irrigation
or crop-treatment job was present. Fishing is blocked by `no_path`, hunting by
`destination_unreachable`, and one emergency forage target is also
unreachable. Two founders were gathering forage for animal feed while the
human food reserve was zero. All ten founders nevertheless had a concrete
task, travel, interruption, or legitimate sleep transition; generic idle work
was not the dominant defect at this checkpoint.

The quarry remains only a named planned ridge: geology is unprospected, no
cells have been mined, quarry stone is zero, and no stone forge exists. No
server exception was emitted during inspection. The visible layout remains
weak: fields do not share a coherent protected farm enclosure, large
reservations remain uncleared, and the settlement still reads as adjacent
projects rather than an organized road-and-district plan.

Phase checkpoint: R0–R3 and R7 remain complete only at the automated-contract
level. R4 is failing natural food-stability proof. R5–R6 remain unproven in the
clean run. R8 remains in progress and is blocked next by field care and
reachable primary food work, followed by remaining housing, the operating
quarry-to-stone-forge chain, and coherent district circulation.

## Validation checkpoint 153 / livestock enclosure correction

The Day 13 pasture is physically complete but is not an adequate livestock
system. Its footprint is only 14 by 10 cells (12 by 8 usable inside), its forage
capacity is 24 units, and it is the only completed animal enclosure. The two
cattle are recorded as housed, but both sheep, both pigs, both dogs, and all
four chickens remain tethered. No relocation job is open.

There is also a contract mismatch: the enclosure explicitly allows cattle and
sheep, but the housing resolver treats the untyped enclosure as cattle pasture
and rejects sheep because their preferred housing string is `sheepfold`.
Pigs, chickens, and dogs correctly require purpose-built zones, but those zones
were never planned. R8 livestock acceptance therefore requires a substantially
larger grazing enclosure sized from head count, carrying units, seasonal forage
and regrowth; automatic relocation of compatible cattle and sheep through its
gate; and an integrated farm complex with a pig pen, coop, and kennel rather
than indefinite tethers. Expansion must preserve barn-to-pasture access and
must be planned before nearby housing consumes the required land.

Phase checkpoint remains unchanged: R4 is failing natural food stability and
R8 remains in progress. Livestock enclosure sizing, housing compatibility, and
physical relocation are now explicit R8 blockers alongside field care,
remaining homes, and the quarry-to-forge chain.

## Repair checkpoint 154 / food-work truth and harvest conservation

The preserved Day 13 failure was repaired in priority order rather than
discarded. Fishing, hunting, and foraging now validate a real route before a
target is accepted. The unreachable deer and forage targets were cancelled and
replaced by a reachable active hunt plus three route-valid human-food forage
jobs. The unreachable regional fishing job is now cancelled explicitly as
`fishing_target_unreachable`; it may be reposted only after a real accessible
bank exists, instead of retrying an impossible route.

Drought-stressed crops now raise river-water collection to emergency priority
155, ahead of ordinary survival work, and the resulting field-watering job is
priority 150 once water is available. Watering a drought-wilted plot clears
that wilt state after moisture is restored. Human food foraging now outranks
animal-feed foraging whenever durable human food is below one portion per
resident. Existing field-harvest haul jobs are upgraded to priority 148 during
a founding food emergency rather than retaining their earlier low priority.

The save/reload proof found a deeper conservation defect: normalization kept
only predefined stockpiles and silently discarded dynamic field-harvest piles.
The loader now preserves non-default stockpiles. The pre-loss saved state was
restored, and both grain piles (0.375 and 5.5625 units) survived another
save/reload with their emergency haul job intact. A serialization regression
now checks pile identifiers and quantities, in addition to the natural farm
test.

At the first corrected visible tick, river-water collection was assigned,
human-food foraging and a reachable hunt were active, the grain haul was ready
at emergency priority, and the remaining house stayed queued below those food
and crop-care duties. During the following night interval, founders correctly
left ordinary work for assigned sleep; this is not counted as idle failure.
Natural completion of watering, hauling, the remaining homes, quarrying, and
the stone forge is still being observed and is not claimed by this checkpoint.

The regional run also proved that the legacy trough-water coordinate was grass,
not water. Water collection now validates an actual water cell and reachable
bank. A 128-cell physical survey found the nearest real river at local
coordinate (18,-27), but no current walkable bank. The mayor therefore keeps
the crop-watering job visible as an urgent input-blocked need and commissions a
priority-154 tree-clearing corridor toward that surveyed water. Competing field
clearing is preempted while drought access is critical, avoiding both fake
grass-water collection and unrelated fence/field work. The first corridor tree
at (-14,6) was route-valid, reserved naturally, and visibly accepted before the
night rest transition.

Focused farming, fishing, forage, water, and regional-river regressions pass.
The strict audit covers 2,088 functions with 141 approved template/data
exemptions and zero violations; `git diff --check` is clean.

Phase checkpoint: R0–R3 and R7 remain complete only at the automated-contract
level. R4 remains in natural revalidation: route-invalid work and harvest loss
are repaired, but a durable food buffer and completed crop-recovery loop remain
to be proved. R5–R6 remain unproven in this run. R8 remains in progress, with
remaining homes followed by the quarry-to-stone-forge chain as the next gates;
livestock redesign remains deliberately after these run faults.

## Repair checkpoint 155 / route analysis and the food-stability build gate

The next build gate is deliberately limited to three connected outcomes:

1. secure a genuine water route and recover drought-stressed fields;
2. keep fishing, hunting, and foraging restricted to reachable targets while
   human food outranks animal feed under scarcity; and
3. conserve each crop through growth, harvest, field pile, bounded storage,
   cooking, and consumption, including save/load.

`analyzeVillagePath` now separates a ready route from a blocked route and a
route that can become ready by clearing named tree cells. It reports the chosen
path, movement cost, step count, terrain composition, clearance cells, and
readiness. Ordinary movement continues to treat trees, rock, water, fences, and
closed structures as impassable. Access planning may price trees as removable,
but still cannot plan through rock, water, buildings, or fences. This replaces
the former straight-line water-clearing guess, which could point workers into
an obstacle rather than opening a traversable route.

The same cost model already makes dirt and stone roads preferable to grass when
their total route cost is lower. Road construction and upgrades can therefore
change route choice later without a second pathfinder. Focused regression proof
now covers both a tree-clearable corridor and preference for a slightly longer,
faster dirt-road route.

The current clean run has resurveyed a genuine river cell at `(27,69)` and its
bank at `(27,68)`. The persisted analysis reports a ready 148-step route with a
cost of 407. Both `draw_stable_water` and `catch_fish` now use that same verified
water/bank pair. At checkpoint time it is Day 13 at night, so the assignments
remain legitimately pending until the work period. Existing grain field piles
remain conserved at 0.375 and 5.5625 units; the emergency haul is posted, while
durable stored grain, clean water, river catch, and prepared meals remain zero.
No stability completion is claimed yet.

For the 1240 technology boundary, the ordinary settlement well should begin as
a dug and lined shaft with a rope-and-bucket or windlass. A treadwheel or
animal-powered lifting arrangement may be a later civic upgrade. A familiar
levered piston hand pump should not be the default village object: surviving
evidence supports early medieval wells and medieval water-lifting wheels, while
common European public pumps are substantially later. This is a roadmap note,
not part of the present three-objective build gate.

Fishing, hunting, and foraging now rank valid targets by computed route cost,
not straight-line distance. This prevents a visually close resource on the
wrong side of terrain from winning over a slightly farther but genuinely faster
target.

QA: fourteen focused path, fishing, forage, crop-growth, harvest, and
persistence tests pass; the strict audit reports 2,094 functions, 141 recorded
template exemptions, and
zero functions over thirty lines. `git diff --check` is clean.

Phase checkpoint: R0–R3 and R7 remain complete only at the automated-contract
level. R4 is the active natural-proof gate and remains in progress until river
water returns, the field is watered, harvest reaches bounded storage, food is
cooked, and the founders eat it. R5–R6 remain unproven in this clean run. R8
remains in progress and does not advance to quarry/forge work until this food
gate and the remaining homes are physically complete.

## Repair checkpoint 156 / food milestones and starvation scheduler

Food is now treated as one physical chain with explicit gates rather than one
aggregate reserve number. The active milestones, in dependency order, are:

1. **Access and movement:** every fishing, hunting, foraging, water, and field
   delivery target must have a route-valid work position. This is implemented
   and covered by route tests; the live river trip remains long and therefore
   still needs watched completion proof.
2. **Emergency acquisition:** an empty pantry must expose reachable forage,
   fishing, hunting, and existing-harvest work ahead of animal feed and ordinary
   construction. The preserved Day 15 run now assigns an emergency forage crew
   naturally while other exhausted founders continue sleeping.
3. **Crop survival:** prepared and sown cells must advance through growth;
   drought must create water collection and field-treatment dependencies rather
   than leave growth silently at zero. The job chain exists, but live water
   return and resumed growth are still unproved.
4. **Harvest circulation:** mature cells produce conserved field piles; those
   piles must be claimed, hauled, and accepted by compatible finite storage.
   Save/load conservation of the two current grain piles is proved. Natural
   collection into the bounded grain store is still open.
5. **Processing and meals:** stored grain, vegetables, fish, meat, eggs, and
   emergency forage must enter an appropriate kitchen/mill/bakery or direct
   emergency-consumption recipe. The clean run has not yet physically operated
   this stage.
6. **Consumption and reserve:** named residents must consume provenance-linked
   portions, needs must recover, and production must exceed consumption long
   enough to build a multi-day reserve. This remains the R4 completion gate.
7. **Long-term resilience:** seasonal planting, seed retention, spoilage,
   storage capacity, livestock outputs, and multiple acquisition modes must
   survive seed/save-load matrices. This remains R7/R8.7 acceptance work even
   though its automated contracts exist.

The preserved failure revealed two coupled scheduler defects. First, a founder
with both hunger and fatigue at zero repeatedly cancelled and recreated sleep
because hunger was more urgent even though no edible stock existed; sleep made
no progress and the whole town thrashed. Second, a reserved or active life job
could be rebound to a different bed target mid-route, producing the previously
observed bed bouncing. An unavailable meal can no longer replace committed
critical recovery, and committed life jobs now retain their target unless an
explicit invalidation requests a refresh.

Keeping every founder asleep was also insufficient. When no survival food is
available, ready `emergencyFoodDuty` work now outranks critical sleep for actors
who can actually perform that job. This releases only the necessary specialist
crew; it does not wake every resident or invent work. In the saved Day 15 state,
Lina Roth naturally resumed reachable emergency foraging while Ada Weiss, Bram
Eder, Friedel Koch, and Tomas Venn continued gaining real sleep progress. This
is the intended founding behavior: enough people recover, while a small crew
prevents collective starvation.

The first visible replay then exposed two more scheduler details that aggregate
tests had hidden. Critical-need preemption could suspend an assigned starvation
worker before skill priority reopened the same job later in that tick, leaving
the pawn labelled `Resuming` without advancing. Critical sleep now leaves an
active emergency-food duty alone while no edible stock exists. A pawn displaced
to yield a narrow route could also retain `workState: working` after losing its
job and therefore become ineligible for new work; a jobless pawn is now returned
to the available pool before its wait reason is recorded.

At Day 15, 18:04, the corrected visible run had all ten founders in truthful
states: Lina Roth, Mei Lin, and Edda Voss were moving on three separate forage
routes; Klara Holt was carrying an axe toward the water-access tree; Niko Brand
was travelling toward the verified river; and the other five founders were
visibly gaining uninterrupted sleep progress. Positions changed across the
watched interval and no founder remained in `Waiting for open work`. This proves
dispatch and movement recovery, not food production completion: no forage,
water, stored grain, fish, or meal had returned yet.

Continued visible observation reached Day 15, 19:18. Two forage jobs completed
naturally, placed two conserved portions in the finite emergency-forage fixture,
and immediately produced an active named `Eat gathered wild food` job. A third
forager was at 57/60 work minutes, and the real-river water job had reached its
work phase at 13.2/90 minutes. This closes the immediate dispatch-to-acquisition
sub-gate. It does not close R4: the crop-water return, field-pile haul, durable
storage, processing/cooking, consumption completion, and reserve surplus remain
open.

QA: the broad food/path/survival selection passes 31 of 31 focused cases, and a
second idle/scheduler selection passes 22 of 22. The strict audit covers 2,095
functions with 141 recorded template exemptions and zero functions over thirty
lines. `git diff --check` is clean.

Phase checkpoint: R0–R3 and R7 remain complete only at the automated-contract
level. R4 is still the active natural-proof gate; emergency dispatch is now
working, but water return, crop recovery, field-pile hauling, bounded storage,
cooking, eating, and a durable reserve remain open. R5 has a material scheduler
repair but remains under live revalidation. R6 remains unproven in this clean
run. R8 remains in progress and stays behind the food-stability gate.

## Repair checkpoint 157 / river-anchored fishing jetty

The apparent river jetty beside the town road was not the regional fishing
site. It was a surviving static demonstration fixture at local `(-1,15)`, while
the route-valid fishing job correctly targeted the generated river much farther
away. Regional worlds now suppress that obsolete static fixture completely.

When the fishing scheduler selects a valid river site, it now persists one
authoritative `fishing_jetty` fixture on the actual water cell and records its
separate walkable bank position. Existing fishing work prefers the installed
jetty instead of moving the structure whenever another candidate bank is
temporarily closer. The water under the fixture remains explicitly projected as
`outdoor_water`; the worker routes to the adjacent bank while the harvest target
is the water-mounted jetty.

The live Day 15 save now contains the jetty at local `(27,69)`, global
`(-45,-889)`, with its land access at local `(27,68)`. Visual inspection confirms
the old road/grass location is plain outdoor grass and the replacement timber
jetty is visibly centered in the generated river. Five focused fishing and
regional-placement tests pass. The strict function audit covers 2,098 functions
with zero over thirty lines, and `git diff --check` is clean.

Phase checkpoint: R0–R3 and R7 retain automated-contract completion. R4 remains
the active natural food-production proof; truthful fishing infrastructure is now
repaired, but a completed catch, haul, cooking cycle, crop-water recovery, and
durable reserve remain open. R5 remains under live scheduler validation, R6 is
unproven in this run, and R8 remains in progress behind food stability.

## Repair checkpoint 158 / continuous north-south camera travel

The vertical camera constraint was structural rather than a world-size defect.
The retained village window was 140 cells wide but only 84 cells high, and a
new server slice was requested after consuming only 55 percent of that smaller
vertical margin. While the request was pending, further camera destinations
were discarded, which made north-south travel repeatedly pause at a local edge.

The retained window is now 140 by 112 cells. A viewport transition begins at 82
percent of the local margin, and the camera continues replacing the queued
destination while a prior viewport request is in flight. This keeps the larger
4096 by 4096 region authoritative while giving north-south movement enough
resident terrain to cross a slice boundary without a visible input lock.

The rebuilt native client loaded the preserved Day 25 town with the new
`140×112 FOR 4096×4096` camera receipt. Live keyboard validation moved south to
global Y -880, reversed north to -897, and accepted three further rapid north
commands through another retained-window transition to Y -949. Terrain remained
rendered throughout and the client continued accepting camera input while the
simulation was resolving a turn.

QA: all four focused Unity protocol and camera tests pass. The native macOS
build reports success. The strict function audit covers 2,098 functions with
141 template exemptions and zero functions over thirty lines; `git diff
--check` is clean.

Phase checkpoint: this is an R8 world-navigation repair, not an R4 food proof.
R0–R3 and R7 retain automated-contract completion. R4 remains the active
natural food-production gate; R5 is under live scheduler validation; R6 remains
unproven in this run; and R8 remains in progress behind food stability.

## Repair checkpoint 159 / camera frame-flow and reliable dragging

The larger vertical window removed the short north-south boundary but did not
make the camera fluid. Two independent presentation faults remained. First,
every simulation response synchronously rebuilt all 15,680 static cells,
including terrain, structures, crops, stock, glyphs, and sprite layers, even
when only a resident moved. Those main-thread mesh rebuilds interrupted camera
frames. Second, mouse dragging depended on immediate-mode GUI `MouseDrag`
events, which could be consumed by repainting overlays; repeated live vertical
drags left the camera fixed at global `(-82,-940)`.

Static world rendering now has a visual-state signature covering viewport,
terrain, structures, construction, bounded stock, crop growth bands, forage,
and daylight bands. Actor motion is updated every authoritative response and
rendered every frame, but static meshes are reused until that signature changes.
An actor merely changing cells no longer invalidates the static map. Camera
dragging now runs in the ordinary per-frame input loop and applies every screen
delta independently of GUI repaint events.

The rebuilt client accepted the same live vertical drag that previously did
nothing and changed the visible camera receipt from `(-82,-940)` to
`(-101,-928)` while the simulation continued resolving turns. Direction-key
travel also continued into the surrounding streamed terrain. This proves the
input path and static-frame separation; final feel remains a watched acceptance
criterion rather than a data-only completion claim.

QA: five focused Unity protocol/camera regressions pass. The native macOS build
reports success. The strict function audit covers 2,105 functions with 141
template exemptions and zero functions over thirty lines; `git diff --check`
is clean.

Phase checkpoint: R8 camera navigation is materially improved but remains under
visual acceptance. R0–R3 and R7 retain automated-contract completion. R4
remains the active natural food-production gate, R5 remains under live scheduler
validation, R6 remains unproven in this run, and R8 remains in progress.

## Repair checkpoint 160 / camera-shake regression

The first frame-flow cache still treated the glyph temporarily occupied by a
moving resident as part of the static terrain signature. Every actor step
therefore invalidated and rebuilt the entire static town mesh, producing severe
visible shaking rather than the intended dynamic-only actor update. A completed
viewport shift could also leave an identical queued request behind and apply the
same retained window twice.

Actor glyphs are now excluded from the static scene signature. Terrain,
structures, bounded stock, construction, crops, forage, and daylight bands still
invalidate correctly, while resident movement updates only the animated actor
layers. Applying a viewport now discards any queued destination already
satisfied by that delivered map center, so a camera transition settles once.

The rebuilt native client was paused before validation, then run at normal speed.
Across multiple active actor updates the camera receipt remained exactly at
global `(-82,-940)`. A southward pan settled at `(-82,-937)` and remained at that
coordinate across further simulation ticks while residents continued moving.
No terrain oscillation or repeated viewport recenter was observed in this check.

QA: five focused Unity camera/protocol tests pass. The native macOS build reports
success. The strict function audit covers 2,106 functions with 141 template
exemptions and zero functions over thirty lines; `git diff --check` is clean.

Phase checkpoint: the severe R8 camera-shake regression is repaired in the live
client, but R8 remains open for user visual acceptance and the remaining town
work. R0–R3 and R7 retain automated-contract completion. R4 remains the active
natural food-production gate, R5 remains under live scheduler validation, and
R6 remains unproven in this run.

## Repair checkpoint 161 / rollback of failed camera-flow experiment

User observation showed that checkpoints 159 and 160 did not remove the severe
visible shake. Their screenshot and coordinate checks were insufficient proof:
a stable integer camera receipt does not prove stable frame-to-frame rendering.
Both experimental changes introduced for frame flow have therefore been removed:
the static-scene signature cache and the replacement per-frame mouse-drag path.
The renderer once again rebuilds its established complete visual projection, and
camera dragging again uses the previously stable input implementation.

The native client was rebuilt and briefly replayed at normal speed. Across the
rollback check, fixed terrain and building positions remained aligned while
actors advanced, but this is recorded only as rollback verification—not as
camera-flow acceptance. The client was then deliberately left paused. Future
camera work must use a genuine observed motion sequence or captured frame-delta
evidence before it can be called complete; static screenshots and coordinate
receipts are not sufficient.

QA: the four baseline Unity camera/protocol tests pass. The native macOS build
reports success. The strict function audit is back to 2,098 functions with 141
template exemptions and zero functions over thirty lines; `git diff --check`
is clean.

Phase checkpoint: checkpoints 159 and 160 are superseded by this rollback. R8
camera flow remains open and the client is paused in a non-shaking baseline
state. R0–R3 and R7 retain automated-contract completion. R4 remains the active
natural food-production gate, R5 remains under live scheduler validation, and
R6 remains unproven in this run.

## Repair checkpoint 162 / complete camera-change rollback

The first rollback was incomplete: it removed the experimental renderer cache
and drag loop but left the earlier enlarged 140-by-112 viewport, 82-percent edge
threshold, and concurrent viewport-destination updates active. User observation
confirmed that the scene still shook. Those earlier changes are now reverted as
well.

The client/server camera contract is restored to the last pre-work baseline:
the retained viewport is 140 by 84 cells, the original 55-percent shift trigger
is restored, and a new viewport shift cannot be generated while the current one
is pending. The renderer uses its established full projection and the original
GUI drag path. The saved Day 25 town was preserved before the server restart.

The rebuilt visible client now explicitly reports `140×84 OF 4096×4096` and is
left paused. This checkpoint claims complete rollback and removal of the known
regression only; it does not claim that the older north-south flow limitation is
solved. Any new solution must be developed independently from these rejected
changes and proved with motion evidence before replacing this baseline.

QA: four baseline Unity camera/protocol tests pass. The native macOS build
reports success. The strict function audit covers 2,098 functions with 141
template exemptions and zero functions over thirty lines; `git diff --check`
is clean.

Phase checkpoint: R8 camera work is reset to the stable pre-change baseline and
remains open. R0–R3 and R7 retain automated-contract completion. R4 remains the
active natural food-production gate, R5 remains under live scheduler validation,
and R6 remains unproven in this run.

## Repair checkpoint 163 / full-zoom camera preload and handoff

An initial attempted fix reduced maximum zoom so the existing 140-by-84 window
would retain a travel margin. The user correctly rejected that approach because
it removed the wide view instead of loading more world. That attempt was
reverted before this checkpoint.

The maximum visible footprint remains the original 140 by 84 cells. The
retained terrain window is now 280 by 168 cells, providing an additional full
screen of resident terrain split around the visible view. Full zoom-out is
therefore preserved while north, south, east, and west camera movement can use
already loaded cells before requesting another regional window.

Two independent handoff faults were repaired at the same time. `ApplyView` no
longer clears the pending flag before the browse coroutine is actually done,
closing the one-frame gap that could queue a duplicate request. Automatic
browsing now derives its requested center from the camera's actual interpolated
position rather than a far-ahead keyboard target. Keyboard movement uses
bounded `SmoothDamp` easing, and the camera and its pending target retain the
same global world point when a legitimate viewport-origin change arrives.

The rebuilt native client reports `280x168 OF 4096x4096` while retaining the
former full 140-by-84 maximum view. At that maximum zoom, eight captured
southward frames moved continuously from global Y -940 through -937, -934,
-931, -928, -925, -922, -920, and -917. Buildings, fields, forest, river, and
mountain edges remained spatially continuous; there was no delayed 40-to-100
cell jump, reverse movement, or duplicate oscillation.

QA: five focused Unity protocol, boundary, regional-site, and camera tests pass.
The native macOS build exits successfully. The strict audit covers 2,098
functions with 141 template exemptions and zero functions over thirty lines;
`git diff --check` is clean.

Phase checkpoint: this repairs the current R8 full-zoom navigation defect; it
does not complete R8. R0–R3 and R7 retain automated-contract completion. R4
remains the active natural food-production gate, R5 remains under live
scheduler validation, R6 remains unproven in this run, and R8 remains in
progress for the remaining town, infrastructure, and watched-acceptance work.

## Repair checkpoint 164 / river retained at true full zoom

The river had not been removed from regional generation or from the streamed
cell data. At the current town latitude it begins roughly 67 cells east of the
town-center camera. The full-zoom calculation promised a 140-cell horizontal
view but used the smaller of its width and height limits; on the native window
that exposed only about 119 horizontal cells and placed the river just beyond
the right edge.

Maximum zoom now uses the larger required orthographic extent so both promised
dimensions are actually visible. On the current native window this presents at
least 140 cells horizontally and at least 84 vertically. The retained window
remains 280 by 168, leaving substantial preloaded terrain around the visible
camera and preserving the repaired smooth pan behavior.

The native client was rebuilt from the saved Day 25 state. At maximum zoom the
town buildings remain readable in the center-left while the continuous blue
river and its banks are visible in the northeast of the same frame. Four
eastward camera inputs moved smoothly toward the river without a chunk jump or
loss of the water geometry. The client is left paused on that combined town and
river review view.

QA: seven focused camera, retained-snapshot, coordinate, watershed, site,
terrain-hazard, and geology-visibility tests pass. The macOS client build exits
successfully. The strict audit covers 2,098 functions with 141 exemptions and
zero violations; `git diff --check` is clean.

Phase checkpoint: the R8 zoom-and-river presentation defect is repaired, but
R8 remains in progress. R0–R3 and R7 retain automated-contract completion. R4
remains the active natural food-production gate, R5 remains under live
scheduler validation, and R6 remains unproven in this run.

## Repair checkpoint 165 / large-map mesh and river continuity

Watched reproduction showed that checkpoint 164 had not solved the reported
failure. Home followed by maximum zoom still produced a colored upper strip,
a black lower half, and only the northern segment of a river whose cells were
present throughout the authoritative server snapshot.

The decisive cause was the enlarged retained map's mesh size. A 280-by-168
ground grid emits about 188,000 vertices, but the renderer still used Unity's
default 16-bit mesh index format. Only the first portion of the ground mesh was
reliably drawable. The background, glyph, and actor meshes now use 32-bit
indices. Cell geometry is also positioned from each cell's authoritative
coordinates rather than its array index, so a missing transport chunk cannot
pack later terrain upward and manufacture a false blank region. Cell-chunk
assembly snapshots unchanged cached arrays before applying evictions, and its
cache was enlarged for the maximum chunk span of the retained viewport.

The rebuilt Day 25 client now shows terrain across the complete maximum-zoom
frame. From Home, both the northern and southern river reaches are visible on
the east side instead of terminating at the old mesh cutoff. Six successive
northward camera inputs preserved filled terrain and displayed the river
continuously down the entire right side while the town moved naturally toward
the lower edge. No world restart or regeneration was required.

QA: eight focused camera, cache, renderer, retained-snapshot, coordinate,
watershed, founding-site, terrain-hazard, and geology-visibility tests pass.
The native macOS build exits successfully. The strict audit still reports
2,098 functions, 141 exemptions, and zero violations; `git diff --check` is
clean.

Phase checkpoint: the R8 large-map blank-region and disappearing-river defect
is now repaired with watched evidence. R8 remains in progress. R0–R3 and R7
retain automated-contract completion; R4 remains the active natural food gate,
R5 remains under live scheduler validation, and R6 remains unproven.

## Repair checkpoint 166 / field harvest dispatch and bounded storage

The Day 25 food audit found eight grain units physically present in three field
piles at the grain plot while stored grain, fish, forage, and cooked meals were
all zero. The logistics queue showed an emergency harvest-haul order, but it was
incorrectly classified as `cargo_unavailable`. Two independent defects caused
the stall. The first job demanded one whole unit from a fractional 0.375-unit
pile, while the other colocated piles could not create distinct open jobs. The
second defect made every transfer reserve the enclosing source and destination
world objects, so unrelated work anywhere in the farmstead could prevent grain
from entering a free granary cell.

Each nonempty field pile now has an independent parallel work identity, a
fractional pile produces a fractional transfer, and transfer reservations cover
the precise source cargo plus destination storage cell rather than whole
buildings. A focused regression creates colocated 0.375- and 5.625-unit piles,
holds an unrelated reservation on the destination building, and proves both
hauls remain valid and one is naturally claimed.

The repaired server was then replayed through the visible native client at
accelerated observed speed. Bram Eder naturally claimed the 5.5625-unit field
pile, carried one grain unit, and deposited it into bounded stored-grain
capacity. The source visibly/accountably fell to 4.5625 while stored grain rose
from zero to one. He continued into the next harvest haul, and Marta Pell
naturally claimed the resulting emergency grain-loaf job. This closes the first
broken link--field harvest to bounded storage--but does not yet prove sustained
food stability. Fishing remains suspended at 54/60 work minutes, the first
loaves are still in progress, current prepared meals remain zero, and several
founders are already below the hunger danger threshold.

Phase checkpoint: R4 remains failing until caught/foraged/hunted food and crops
reliably become stored meals and all founders recover through a sustained
reserve window. R5 remains under live scheduler validation; this checkpoint
repairs one concrete readiness/reservation failure. R0–R3 and R7 retain their
automated-contract completion, R6 remains unproven in this run, and R8 remains
in progress.

## Repair checkpoint 167 / food transformation and consumption

The next watched pass exposed two more scheduler faults rather than treating
stored grain as success. Suspended fishing remained stranded when its
interrupting haul order was no longer assigned, and urgent eat jobs lost their
workers to emergency food hauling even though those meals were already
reserved for the starving residents. Suspended work now remains interrupted
only while its interrupter actually owns the same actor. Survival skill order
is now explicit: immediate danger, urgent personal food/sleep/shelter, then
emergency food production and hauling.

The visible Day 25 run proved the repaired chain. Fishing resumed at 54/60,
completed, and placed one raw fish in the river catch. Three colocated grain
piles continued through independent bounded-storage hauls. Marta Pell took one
stored grain, baked two hearty meals, and the two hungriest residents received
distinct eat jobs. Edda Voss naturally walked to the household table, consumed
one meal, completed the full thirty-minute eating action, and recovered from
0.61 hunger to 48.53. Niko Brand consumed the second meal and was still
finishing his eating action at the checkpoint. The ledger preserves each load,
store, transformation, and consumption transaction.

This is a complete end-to-end transaction proof, not yet food stability. The
two meals were consumed immediately and the prepared-meal reserve returned to
zero. One caught fish still awaits delivery to the kitchen, crop watering is
available but unclaimed, the next grain batch has been collected for baking,
and the only remaining ripe forage patch requires the posted access-tree job.
The next food gate is therefore sustained throughput: finish fish delivery and
cooking, service drought-stressed crops, clear the forage route, and hold a
positive reserve while every founder remains above danger.

QA: the focused scarce-meal, concurrent-meal, and emergency-food ordering tests
pass; all twenty-four food/crop/provenance regressions pass. The strict audit
covers 2,104 functions with 141 documented template exemptions and zero
functions over thirty lines; `git diff --check` is clean. The older critical-
hunger cooking setup test still fails before its asserted emergency event
because it cannot establish the expected active saw job; this pre-existing
fixture failure remains recorded for the next scheduler QA pass.

Phase checkpoint: R0–R3 and R7 retain automated-contract completion. R4 has
its first natural end-to-end food proof but remains in progress until the town
holds a sustained reserve and all ten founders remain safe. R5 remains under
live scheduler validation, R6 remains unproven in this clean run, and R8
remains in progress.

## Repair checkpoint 168 / shared food work survives personal interruptions

The caught-fish delivery revealed another queue ownership error. Ada Weiss left
the shared `Carry fish to the inn` order for a personal sleep requirement, but
the delivery remained suspended under Ada's identity for the entire sleep job.
Shared work interrupted by an individual survival need now restores any carried
cargo, releases its actor and reservations, and returns to the common skill
queue. A focused regression proves the personal job proceeds while the shared
job becomes available and unowned for another qualified villager.

After server reload, the saved Day 25 fish job changed from suspended under Ada
to available with no owner, no blocker, and no stale interrupter. It did not yet
complete: most founders simultaneously entered legitimate fatigue recovery,
one worker foraged, and the remaining available founder also had a pending
sleep need. This is now visible capacity pressure rather than lost work. The
next scheduler analysis must determine the minimum awake survival crew when
food reserve is zero, then prove fish delivery, cooking, watering, and forage
access continue through staggered rest.

QA: four focused interruption and survival-order regressions pass. The strict
audit now covers 2,105 functions with 141 exemptions and zero violations;
`git diff --check` is clean.

Phase checkpoint: R0–R3 and R7 retain automated-contract completion. R4 remains
in progress: one food transaction completed naturally, but reserve stability
and continuous throughput are not proven. R5 remains under live scheduler
validation, R6 remains unproven, and R8 remains in progress.

## Repair checkpoint 169 / minimum food crew and specialist continuity

The zero-reserve run exposed two related rest-preemption failures. Once fatigue
became recoverable, too many founders could enter sleep simultaneously; after
three general food workers remained active, the sole qualified cook could still
stay asleep with landed fish waiting. Food-zero scheduling now keeps a minimum
three-person survival crew awake above the true danger threshold, protects an
active emergency-food job from fatigue thrashing, and separately wakes a sole
qualified specialist when a ready food job requires that person's skill.
Danger-level fatigue or safety still overrides work.

The reloaded visible Day 25 run proved the new dispatch rather than merely
showing posted orders. Marta Pell woke, physically carried the delivered fish
from bounded pantry storage to the kitchen, and began the stew operation. Lina
Roth finished a wild-food action, producing two forage units, and immediately
claimed food for her critical hunger. Niko Brand continued river-water work
from 35.4 to 69 of 90 work minutes, while Tomas Venn transitioned back into
food hauling. Thus fishing delivery, transformation, forage acquisition, and
water collection now continue through the colony's staggered rest period.

QA: the minimum-crew, active-duty anti-thrash, sole-cook wake-up, emergency
cooking, landed-food priority, and raw-fish cooking regressions pass. All 24
food/crop/storage-provenance tests pass. The strict audit covers 2,110 functions
with 141 documented template exemptions and zero functions over thirty lines;
`git diff --check` is clean. A clean 2,400-tick founding survival proof is in
progress and is not counted as passed here.

Phase checkpoint: R0–R3 and R7 retain automated-contract completion. R4 is
materially repaired but remains in progress until the stew is produced and
consumed, crop water is delivered, a positive reserve is sustained, and all ten
founders pass the full-day danger-threshold proof. R5 remains under live
scheduler validation, R6 remains unproven in this run, and R8 remains in
progress.

## Repair checkpoint 170 / live forage, cooking, and water transfer

The same uninterrupted visible run completed the next physical transitions.
Two separate forage actions produced edible units and assigned them to hungry
founders. Marta completed the fish stew, producing one conserved hearty meal;
Mei Lin then received the corresponding household-table eating job. The meal
reserve remained positive while she travelled, proving that production no
longer vanishes between kitchen output and consumption.

Niko completed the ninety-minute river draw and created twenty conserved clean
water units. Ada claimed the ready crop-watering order, traversed the route to
the actual water stock, removed exactly one unit (20 to 19), visibly carried
`clean_water`, and began the valid return route toward the grain plot. This
proves collection, readiness, reservation, pickup, conservation, and route
validity. The final field application is still in progress because the legacy
town stores water far from its field; that poor placement is recorded as a
town-planning inefficiency rather than a scheduler or path failure.

Phase checkpoint: R4 now has watched acquisition and transformation proof for
fish, forage, and crop water. It remains in progress because the reserve was
consumed by the already-starving population and the 2,400-tick all-founder
survival proof has not completed. R5's repaired readiness and specialist
dispatch are holding in the live run. R0–R3 and R7 retain automated-contract
completion, R6 remains unproven here, and R8 remains in progress.

## Repair checkpoint 171 / expanded food capacity and equipment-gated harvests

The immediate food-shortage build now adds three physical capacity increases.
Founding grain and vegetable fields use 8×8 cultivated interiors inside 10×10
fenced boundaries instead of 4×4 interiors, and harvest yield scales with the
number of worked cells rather than remaining fixed at the old plot size. The
fishing hut is now a roofed, two-exit waterfront specialist building with a
netting bench, net rack, cleaning table, and catch storage. Its fisher consumes
two netting-fiber bundles to make a reusable net; each completed net harvest
produces four fish rather than the one-fish pole harvest, while returning the
net to its bounded rack.

Hunting is no longer posted as ready work for an unequipped hunter. The masonry
forge now exposes a high-priority hunting-bow order that consumes one smithy
supply and one lumber unit. A completed shortbow is reusable equipment: its
presence makes the deer hunt ready, it is physically picked up for the hunt,
and it is not consumed as meat is produced. During a founding run the
woodcutter serves as the first qualified smith until a dedicated smith joins.

Automated behavioral proof covers the full net-making/net-fishing chain, the
full forge/bow chain, bow-gated hunting and traceable venison, roof/exit/fixture
truth for the fishing hut, larger-field sowing, field rendering, and scaled
crop capacity. The focused architecture, economy, and food suites pass 73/73;
the eight cross-system food/equipment proofs pass 8/8, including cancellation
of loaded legacy hunts that lack the new bow contract. The strict function
audit covers 2,122 functions with 141 documented template exemptions and zero
functions over thirty lines, and `git diff --check` is clean.

Phase checkpoint: R0–R3 and R7 retain automated-contract completion. R4 is
materially expanded and its new production chains are proven in focused
simulation, but remains in progress until a clean visible settlement naturally
builds the hut and forge, sustains a positive multi-day food reserve, and all
ten founders pass the 2,400-tick danger-threshold proof. R5 remains under live
scheduler validation, R6 remains unproven in the current clean run, and R8
remains in progress behind the same natural town-build and survival gates.

## Repair checkpoint 172 / Farmland layout and bounded barn storage

Food sustainability now continues on the dedicated `codex/farmland` branch.
The farm architect places 8×8 cultivated interiors inside complete 10×10 field
boundaries and reserves a two-cell access and defensive sightline apron around
each fence. A circular scheduler dependency had prevented those aprons from
being cleared before the first fence segment existed. A farmstead whose barn
and pasture core are physically complete now authorizes the clearance queue,
so lumber is generated from the future fields before field-fence construction
and founders do not abandon the higher-priority shelter core prematurely.

The farmstead now contains a physical food and fodder barn rather than relying
on unlimited ground storage. Grain bins, seed bins, produce shelving, and a hay
loft occupy a bounded twenty-cell interior storage area. Before the barn is
complete, farm goods use a bounded two-row staging lane between the grain and
vegetable fields; this lane does not overlap either cultivated area or its
two-cell tree-clearance apron. On barn completion those goods transfer to the
dry granary plan with explicit cell allowance and stack-slot limits. Trough
water remains with livestock supplies instead of incorrectly consuming the
food barn, and stable feed now belongs to the farm storage group.

Automated proof covers core-ready apron-clearing work, protected crop
interiors, physical grain/seed/produce/fodder fixtures, temporary staging
separation, completed-barn storage, hard capacity, hauling destinations, and
production reservations. The focused architecture, economy, and storage
suites pass 70/70, and the two targeted clearance proofs pass 2/2. A broader
181-test sweep reached 174 passes but is not release-green: six assertions and
one interrupted file remain, including the expensive natural proof that every
expanded-field fence finishes. Those failures are recorded rather than hidden
behind the focused results. The strict audit covers 2,125 functions with 141
documented template exemptions and zero functions over thirty lines;
formatting and `git diff --check` are clean.

Phase checkpoint: R0–R3 and R7 retain automated-contract completion. R4 has
complete focused contracts for expanded protected fields, net fishing, bow
hunting, and bounded barn storage, but remains in progress until a clean
visible settlement naturally completes and operates the chain while sustaining
a positive multi-day reserve. R5 remains under scheduler validation, R6 remains
unproven in the current clean run, and R8 remains in progress behind the full
natural town-build, survival, and visual acceptance gates.

## Repair checkpoint 173 / formal low stone farm boundaries

The architect now has a distinct low stone boundary-wall option for farms,
pastures, gardens, and formal property lines. It remains a fence-class barrier
for routing, livestock containment, field protection, gates, and connected
corners; it is not treated as a full-height building wall. The authored profile
is 2.5 feet high, consumes two quarried-stone units and seven labor units per
cell, compared with five material units and ten labor units for a full house
wall. Gates remain timber so a stone boundary still has a usable entrance.

Settlement evolution keeps timber rails through the founding-village and
family-hamlet stages, then declares low stone walls as the masonry-town boundary
standard. The transition is gated by both an operating quarry and a food
surplus, preventing cosmetic masonry from displacing survival work. Every
planned family holding records the same future upgrade. This checkpoint adds
the construction and rendering capability plus the planning contract; posting
and completing replacement work remains part of the later masonry-town stage,
not the current founding survival queue.

The native renderer draws stone boundaries as low, connected courses rather
than tall house walls or brown timber rails. Construction projection preserves
the boundary profile and physical height, while completed inspection names the
object a low stone boundary wall. Three focused material, policy, and visual
tests pass; the combined architecture, visual-registry, and storage suites pass
64/64. The strict audit covers 2,128 functions with 141 documented template
exemptions and zero non-template functions over thirty lines. The macOS Unity
player builds successfully and `git diff --check` is clean.

Phase checkpoint: R0–R3 and R7 retain automated-contract completion. R4 now
includes the formal stone-boundary option alongside protected fields, net
fishing, bow hunting, and bounded barn storage, but remains in progress pending
the clean natural food-surplus proof. R5 remains under scheduler validation,
R6 remains unproven in the current clean run, and R8 remains in progress behind
the natural town-build, survival, visual, and later masonry-transition gates.

## Repair checkpoint 174 / opening farm plan and physical storage truth

The first visible `codex/farmland` run was stopped and saved on Day 1 at 09:06
because its opening layout failed visual review. Regional terrain selection had
moved both crop fields while leaving the temporary farm store at a hard-coded
coordinate inside the grain field. Only active construction appeared planned,
so the three family farmhouses and shared barn were not readable as one farm
system. Storage reconciliation also painted assigned inventory into designated
cells without requiring a villager to haul it there. The failed run remains the
evidence for this checkpoint and is not counted as a successful proof.

The opening planner now scouts the shared farmstead barn and all three named
family farmhouses on the first simulation update, before the lumber workshop is
operational. Brand-Venn and Holt-Eder are explicitly farmhouses rather than
generic cottages. Both crop boundaries record their holding, farmhouse, and
barn relationship. Planned structures render as plans without becoming active
construction jobs, keeping the plan distinct from the mayor's survival build
order. A migration identity defect that collapsed all ten reserved household
lots onto the farmer lot is fixed by using each entry's appropriate stable key.

Temporary farm storage is selected relative to the terrain-approved barn and
rejects every crop clearance apron, building footprint, and pasture enclosure.
For the failed seed it now occupies a two-cell staging position north of the
barn rather than the grain field or livestock space. Designation no longer
means possession: existing supplies remain at their physical cache/cart
positions, designated cells begin empty, and only a completed delivery records
stored quantity. Loading removes the corresponding stored quantity.

QA passes all 61 focused architecture and storage tests, including
the exact failed regional seed, empty-until-hauled storage, distinct future-lot
identity, field ownership, and complete Day-1 farm planning. The strict audit
covers 2,137 functions with 141 documented template exemptions and zero
non-template functions over thirty lines; formatting and `git diff --check` are
clean. Broader food and economy regressions passed; the expensive founding
suite was separately observed and is reported below.

The first replacement regional seed then exposed two further terrain-specific
faults before acceptance. A mountain-and-river arrangement could exhaust the
old 32-cell home search and omit the Holt-Eder farmhouse. Founding homes now
have a bounded 64-cell search while ordinary projects retain the tighter
search. Relocated barns also left their internal storage area, pasture access,
and natural barrier cells at the authored coordinates. All barn sub-geometry
now translates with the selected building while surveyed crop fields remain
fixed. The exact failed seed proves all three homes and translated barn access.

The final visible acceptance seed began with all three named farmhouses, the
shared barn/pasture, and both fields visibly designated. At Day 1 06:33, seven
founders were already farming, surveying construction, felling trees, or
travelling to the real river jetty; three were in scheduled dawn free time.
Starting meals, seed, and animal feed remained at their actual caches with zero
quantity painted into the new farm-store cells. The relocated barn's storage
and pasture doorway were both confirmed at their translated coordinates. The
economy and food regressions passed before the expensive founding suite was
interrupted after 39 additional passes and no assertion failure; that
interrupted suite is not counted as a full green run.

The requested visible 16× observation continued beyond ten real minutes to
tick 695 (Day 1, 12:57). At the final checkpoint all ten founders had concrete
work: three tended the kitchen garden, two sawed lumber, two delivered lumber
to walls, one fished, one collected the river catch, and the guard used the
current town work area. Five caught fish had been physically hauled and showed
`stored: 5`; untouched starting meals and seed still showed `stored: 0`.
Short contention waits occurred while lumber was being sawn, then cleared as
delivery work became ready. No farmhouse or barn plan disappeared, no starting
farm supply teleported into the staging lane, and no field/storage overlap was
observed. The economy and food suites pass 39/39, the combined architecture and
storage suites pass 61/61, and the branch is synced to the remote.

Phase checkpoint: R0–R3 and R7 retain automated-contract completion. R4 remains
in progress until the corrected visible run proves physical hauling, field
work, harvest, storage, and sustained food reserves. R5 remains under scheduler
validation, R6 remains unproven in the clean run, and R8 remains in progress
behind the same natural town-build and visual acceptance gates.
