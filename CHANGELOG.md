# Changelog

## Interactive Version 1 · Traveling merchant and milling economy

- Added a persisted traveling merchant with finite stock, finite coin, a
  map-visible two-day visit, deterministic recurrence, and conserved village
  buy/sell transactions.
- Evaluated 14-, 18-, 21-, and 90-day cadences against import coverage and
  caravan overhead; selected eighteen days as the current test baseline.
- Added explicit seed, iron, steel, copper, tin, and brass stores plus a village
  treasury and reserve-aware reeve purchasing policy.
- Added mill-gated grain-to-flour production with food provenance and milling
  skill practice; flour above the village reserve can be exported for coin.
- Added planned woodland field expansion: trees become stored timber, the area
  opens only after clearing, and the crop scheduler supports multiple plots.

## Interactive Version 1 · R6–R7 colony release gate

- Completed visual registry version 2 across actors, animals, crops, trees,
  materials, construction, floors, roofs, fences, doors, gates, fixtures,
  signs, terrain, condition, and damage states.
- Added an original strict-overhead modular pawn anchor plus cached Unity pawn
  recipes for deterministic body, skin, hair, clothing, facing, locomotion,
  work, equipment, and carried-item layers.
- Made construction supply, frames, progress, connected structures, crops,
  individual co-located stock contents, damage, cattle, and work effects readable
  from authoritative state; the runtime visual audit now has 35 accepted sprite
  anchors, no missing key, and truthful diagnostic fallback.
- Replaced the cow and deer with original strict-overhead transparent sprites,
  registered all emitted animal states, and archived the superseded hybrid-view
  cow outside runtime resources.
- Added the R7 ten-seed one-day survival matrix, repeated three- and five-day
  food runs, exact blueprint/delivery/frame/sleep/harvest/meal save-load matrix,
  scheduler parity, resource visibility, memory budget, and disabled population
  growth gates.
- Preserved unmatched physical gates and unfinished-building doors through save
  migration, deduplicated fresh-run work permissions, and kept every co-located
  stockpile inspectable in the Unity projection.
- Protected the founding farm specialist from unrelated construction after the
  farm exists while allowing the farmstead's own commissioning tick to finish.
- Made mature saved runs resume directly from their local snapshot instead of
  projecting multi-megabyte history through MCP before the live session starts.
- Rebuilt and watched the exact canonical run in Unity at founding and tick
  33,007; the mature view contained 751 accepted visual cells and no fallback.
- Added a five-seed full-town release proof. Every seed constructs and
  commissions all 12 roofed strategic objectives, houses all ten founders, then
  survives a natural 2,400-tick day with clean storage, provenance, strategy,
  visibility, blocked-work, and save/load audits.
- Fixed a project self-deadlock in which a parent builder could preempt its own
  helper and wait forever on that helper's claimed wall section.
- Enforced a 30-line maximum across 1,178 named JavaScript/C# functions with
  explicit template/data-projection exemptions; all 278 tests and final static,
  visual, Unity-build, and formatting gates pass.

## Interactive Version 1 · M-11 village priorities and subsistence

- Added colony-sim-style right-mouse map dragging alongside middle-mouse drag,
  scroll-wheel zoom, Shift+WASD/arrow panning, and Home recentering, with a
  compact control reminder in the village command bar.
- Established the versioned `stonebridge-colony-v1` art contract with a shared
  generation prompt, controlled pawn and object variants, asset provenance,
  runtime-scale review, and consistent Unity import rules.
- Defined material-plus-state image keys for paired open and closed doors and
  the future tree, sapling, stump, log, board, and firewood lifecycle. The
  renderer accepts state-specific doors while retaining the current closed-door
  fallback; species-specific processed wood waits for authoritative tracking.
- Replaced Stonebridge's environmental font markers with transparent top-down
  picture sprites for pine, elm, maple, oak and birch trees, timber walls,
  wooden doors, tables, chairs, villagers, guards, shopkeepers and party
  members. The same renderer already supports stone walls and steel doors when
  those material-backed objects enter the world.
- Added authoritative tree species, wood class, wall material and door material
  metadata so the graphical differences can become harvesting, construction,
  durability and repair rules rather than remaining cosmetic variants.
- Refined the Unity-only Stonebridge glyph language with connected box-drawn
  walls, readable door and sign symbols, and five deterministic tree species
  with distinct markers and colors. Dungeon walls retain their established
  ASCII presentation.
- Began M-11.1 with deterministic UUID-backed household identities and exactly
  one household assignment per resident. Save migration repairs membership but
  intentionally creates no homes, beds, kitchens, storage, materials, or labor.
- Separated household membership from nullable residence assignment. Residents
  without usable housing are explicitly tagged homeless and prioritize food,
  then temporary shelter; destroyed or uninhabitable residences do not count.
- Documented the staged household, residence, construction, fixture, sleeping,
  and multi-day survival contracts and their acceptance gates. Saves advance to
  schema 22.
- Replaced the Unity village's camera-bound picture frame with a movable
  100×60 observation window. Panning near an edge streams another deterministic
  terrain window without moving the party or inflating every simulation tick.
- Added Unity landmark and inspection metadata so selecting a sign reveals its
  text and selecting any cell of a known building identifies that building.
- Corrected village work routing to approach closed access doors before routing
  into interiors, report real path failures instead of `no_eligible_actor`, and
  collapse duplicate blocking notices in the visible activity log.
- Expanded the native village projection from 76×46 to 100×60 cells while
  retaining a sub-500 KB snapshot. Unity now preserves zoom across simulation
  updates, supports middle-mouse dragging and Shift+WASD/arrow panning during
  live simulation, recenters with Home, and clamps zoom to the available map
  instead of revealing an empty picture frame.
- Slowed normal village time to one 24-hour day per 2,400 authoritative beats,
  approximately 30 real minutes at the native client's normal 0.75-second
  cadence. Fast mode changes scheduling frequency without changing outcomes.
- Added a persisted second-resolution clock and fixed dawn, day, dusk, and
  night phases. Unity now shades outdoor ASCII terrain continuously from the
  authoritative daylight level while keeping interiors readable.
- Converted production, companion activities, meals, social activity, worship,
  shelter and sleep to game-minute progress. Need decay now scales with elapsed
  game time instead of firing at the old 15-minute-per-turn rate.
- Audited a deterministic morning and night run. Parallel morning production
  remained useful, but the night run exposed five inn beds for eighteen
  residents, sixteen blocked sleep jobs, no household beds, and no bed-building
  work; housing is therefore the next hard dependency.
- Added deterministic village-wide priorities for lumber infrastructure, food
  security, and housing, including scores, explanations, dependencies, and
  UUID-backed persistent development projects.
- Added woodcutter Klara Holt with explicit forestry, construction, and sawing
  permissions and priorities. Her ranked forestry, construction, and carpentry
  skills gain practice only when the corresponding work completes.
- Added village reeve Edda Voss as the persistent administrator. She evaluates
  settlement priorities every simulation tick and issues UUID-backed work
  orders that authorize the relevant jobs without player micromanagement while
  the village clock advances.
- Added a real lumber economy: generated trees become persistent stumps, logs
  enter a bounded camp stockpile, four logs construct the lumber yard, and
  later logs become bounded building-lumber inventory.
- Exposed the active village priority through the web and Unity projections and
  placed it compactly in the native top bar without reducing the map viewport.
- Advanced saves to schema 21 and ruleset `party-roguelike-v11`; migration adds
  missing projects, stockpiles, and the woodcutter with stable UUID references.
- Added farmer Ada Weiss and herder Niko Brand, a lumber-backed farmstead,
  finite seed and breeding-herd resources, and bounded grain, vegetable, milk,
  meat and prepared-meal production. Eating now consumes one stored meal.
- Kept household kitchens and material-backed housing as the remaining M-11
  stages instead of simulating those resources implicitly.
- Added seven M-11 gates; all 155 tests pass, Unity scripts compile, the macOS
  player builds, and the migrated live village visibly assigns Klara a real
  timber-tree job while remaining paused between requested turns.

## Interactive Version 1 · M-10 continuous simulation controls

- Split characters from the static ASCII terrain mesh and added eased,
  identity-preserving movement between authoritative grid positions. Manual and
  normal-speed turns use a readable glide; accelerated simulation shortens the
  animation without skipping a simulation state.
- Added compact native Unity Pause, Step, Run 1×, and Fast 4× controls with
  F5–F8 shortcuts while preserving the full map viewport.
- Routed single-step and both continuous speeds through the same authoritative
  `wait` turn used by manual play; speed changes only how often that turn is
  requested and never changes simulation outcomes.
- Added explicit simulation eligibility to the Unity projection. Dungeon play,
  unresolved town danger, dying/completed runs, and travel decisions cannot
  silently advance and force an explanatory pause where tactical input is
  required.
- Made Pause interrupt continuous scheduling even while the current networked
  turn is resolving; the accepted turn completes, but no later turn begins.
- Added actor-to-actor passage negotiation when a route is occupied. A blocker
  may yield one legal adjacent step, refuse because it already moved or lacks
  space, or deliberately hold a doorway while danger is active. Yielding uses
  the actor's movement for that turn, preventing traffic resolution from
  creating teleports or double moves.
- Replaced random reservation claim identities with replay-stable UUIDs derived
  from the job, resource claim, and reservation attempt.
- Added seven focused M-10 regression gates. The complete 148-test suite passes,
  the macOS Unity build succeeds, and native play verifies step, normal, fast,
  and fast-to-pause behavior through visible controls.

## Interactive Version 1 · Party management and character development

- Added a persistent `Manage Group` action beneath the gameplay roster. It
  opens a true group-level landing page for shared movement, spending policy,
  tactical orders, party health, roles, and priorities before drilling into an
  individual character. Character pages now provide a visible route back to
  group management.
- Added a UUID-driven, scrollable party roster with no four-member limit; the
  established four remain the starting party rather than a system cap.
- Added Unity screens for each member's activity priorities, fighting role,
  current work, equipment, needs, abilities, and skills.
- Added individual character sheets and twelve trainable physical, combat,
  field, craft, knowledge, and social skills with class-based starting ranks.
- Made Party Management and Character Record opaque modal workspaces that hide
  the active map and suspend gameplay input until the player returns. Added
  fixed Back to Party and Return to Game controls plus visible keyboard
  shortcuts for every page.
- Added a persistent collapsible Group accordion to gameplay with a scrollable
  uncapped roster, health totals, condition markers, health bars, and direct
  member selection into Party Management.
- Skills now advance only through real combat, exploration, social, and work
  events. Activity priorities replace direct skill-training buttons; specialized
  archery and tournament practice remain locked until their facilities exist.
- Added schema-19 migration for existing characters and converted the old
  generic training job into concrete work and facility-backed activities.
- Made party configuration authoritative and non-turn-consuming across dungeon,
  village, exterior, and world contexts.
- Expanded the suite to 141 passing tests and completed a successful Unity
  script compilation gate.

## Interactive Version 1 · M-9 needs, schedules, and social life

- Added one shared life-state contract for residents, the hero, and companions,
  with explicit autonomous versus player-directed authority.
- Added a deterministic quarter-hour town clock, work/rest/free-time schedule
  scoring, and bounded hunger, fatigue, safety, social, and morale needs.
- Added reservable meals, beds, public seating, chapel shelter, worship places,
  conversations, and bounded recent memories through the existing job board.
- Added critical-need interruption without overriding immediate guard danger
  response, plus stale-life-job replacement to prevent satisfaction loops.
- Added Unity clock, need, schedule, recommendation, and memory inspection.
- Migrated saves to schema 18 and added nine focused M-9 regression gates for
  NPCs and player-controlled characters. The full 134-test suite and macOS
  Unity build pass, and the native visible-control gate completed a town day.

## Interactive Version 1 · M-8 autonomous dispersed companions

- Added UUID-keyed companion work state with role-derived capabilities,
  permissions, priorities, objective history, and inspectable action reasons.
- Added autonomous healing, scouting, training, research, rumor gathering,
  rest, and paid work through the shared jobs, reservations, smart objects, and
  one-cell navigation systems.
- Added leadership recall and danger overrides that suspend work, release
  claims, open unlocked access doors, and regroup without teleporting or
  stacking. Re-dispersal resumes eligible suspended objectives.
- Added approval-only, routine-supplies, and autonomous spending policies with
  equipment restrictions and copper limits.
- Added compact Unity Disperse/Regroup, spending-policy, and village Wait
  controls plus companion objective details without changing the frozen native
  dungeon interface.
- Migrated saves to schema 17, expanded the suite to 125 passing tests, built
  the macOS Unity player, and passed the native gate with three distinct jobs
  followed by a complete visible-controls recall.

## Interactive Version 1 · M-7.1 economy hardening

- Enforced one active job per resident while retaining explicit guard
  preemption, and made qualified busy work wait without false blocked events.
- Added deterministic route caching, bounded blocked-job retry backoff, and a
  binary-heap weighted router. The 100-turn benchmark improved from roughly
  249 ms to 20 ms per village turn.
- Repaired every stockpile-to-container UUID reference, including save
  migration, and made delivery status name the real cargo and destination.
- Added actual herbalist treatment using remedy stock, complete resident work
  permissions/capabilities in both inspectors, and correct companion recipients
  for consumable purchases.
- Expanded the regression suite to 116 passing tests, compiled the Unity client,
  and completed the delivery-to-forging-to-stock gate through visible Unity
  controls with `Ash spear ×1` displayed in the staffed smithy.

## Interactive Version 1 · M-7 working residents and local economy

- Added bounded work templates for the smith, herbalist, armorer, innkeeper,
  fisher, porter, hostler, and messenger, each with explicit capabilities,
  permissions, priorities, workstations, durations, inputs, and outputs.
- Connected fishing, hauling, cooking, stable care, remedies, armor work, and
  notices to persistent UUID-backed stockpiles and the shared job system.
- Connected the existing carter delivery to smith production so delivered
  supplies become a real ash spear in the smithy's sale inventory.
- Made production consume inputs and create outputs exactly once, reserve its
  workstation and stock, and survive save/load without duplicating goods.
- Made shops depend on proprietor presence and actual inventory. Purchases now
  decrement stock and out-of-stock goods cannot be sold.
- Added resident work priorities to native inspection and a dismissible Unity
  shop overlay that lists only stocked goods, quantities, prices, and keeper.
- Migrated saves to schema 16, expanded the suite to 108 passing tests, and
  produced a successful macOS Unity build.
- Completed the native gate: resident production appeared in the activity
  feed, the delivery-to-forging chain completed, and the staffed smithy offered
  its newly forged ash spear through visible Unity controls.

## Interactive Version 1 · M-6 reactive guard work

- Converted the Stonebridge watch patrol into persistent low-priority work and
  added higher-priority, UUID-backed crime investigation and danger-response
  jobs.
- Added deterministic guard perception, evidence reservations, priority-based
  suspension and resumption, investigation, warning, and repeat-offense escort
  behavior.
- Routed evidence inspection through the shared smart-object interaction
  executor and made invalid or completed incidents release every work claim.
- Added compact Unity village interaction commands and an inspect-panel reason
  so nearby objects can be examined, used, read, breached, or discussed while
  selected residents explain what they are doing and why.
- Migrated saves to schema 15 and expanded the regression suite to 101 passing
  tests. The macOS Unity player builds successfully.
- Completed the native M-6 playability gate: property damage interrupted a
  patrol, the guard investigated and warned the offender, and the suspended
  patrol resumed through visible Unity controls. The accepted D-M5.2 dungeon
  interface remains frozen.

## Interactive Version 1 · D-M5.2 native dungeon hardening

- Made Unity dungeon commands state-aware so actions appear only when their
  health, resource, target, range, equipment, door, stair, and status
  requirements can currently succeed.
- Added visible Examine, Shoot, Ascend, Descend, and Death Save commands plus
  actor HP inspection, damage flashing, colored combat and exploration activity,
  and explicit victory, death, and stabilization overlays.
- Replaced the nine-item hero-only drawer with scrollable UUID-addressed
  inventories and equipment controls for all four party members.
- Fixed a native-playtest blocker where a failed passive perception check
  consumed the square's deliberate Search action, potentially sealing the only
  route to required stairs behind an undiscovered secret door.
- Expanded the suite to 95 passing tests, produced a successful macOS Unity
  build, and completed a 176-turn, three-level victory using only the visible
  Unity controls. The party opened six doors, resolved 23 attacks, changed
  level twice, and reached the final exit with all four members alive.
- Accepted and froze the D-M5.2 Unity dungeon interface. Further interface
  changes now belong to a later milestone rather than this compatibility gate.

## Interactive Version 1 · D-M5.1 Unity dungeon playability

- Replaced the full-floor dungeon projection with a rolling 30×20 viewport so
  visible rooms and nearby threats occupy useful screen space.
- Added engine-declared dungeon intents plus compact inventory, visible-target,
  class-power, and revisioned party-order projections for the native client.
- Added native contextual commands for search, waiting, healing, class powers,
  short rests, inventory/equipment management, and party objectives and
  formations without introducing permanent sidebars.
- Added UUID-targeted ranged attacks, thrown items, invokable items, and Magic
  Missile while retaining the authoritative engine rules.
- Kept all 90 regression tests green and produced a successful macOS Unity
  player build. A 252-turn three-level dive through the Unity action protocol
  reached victory with all four party members alive.

## Interactive Version 1 · Dungeon parity through M-5

- Added a dedicated dungeon simulation seam while preserving the existing
  authoritative turn, combat, party, persistence, and event contracts.
- Added per-level persistent jobs and reservations plus monster capabilities,
  work permissions, current actions, and deterministic assignment.
- Converted revealed dungeon doors, stairs, treasure, traps, shrines, and items
  into UUID-backed smart-object projections with shared affordance queries.
- Routed player and monster door opening through the same interaction executor.
- Added the first autonomous dungeon plan: monster groups hear noise, reserve an
  investigation, navigate one legal step per turn, block at locked access,
  survive save/load, resume, open doors, and complete the investigation.
- Made Unity location-aware so it renders the active dungeon with native move,
  examine, wait, door, and stair controls while retaining the retro ASCII look.
- Migrated saves to schema 14 and expanded the regression suite to 90 tests.

## Interactive Version 1 · M-5

- Added persistent UUID-backed stable cargo and smithy stock with deterministic
  low-stock delivery requests.
- Added Bram Eder's multi-step `deliver_goods` work plan: reserve, travel, load,
  travel, open access when permitted, unload, complete, and release claims.
- Conserved cargo through delivery, cancellation, invalid targets, and
  save/load while in transit; locked access now blocks truthfully and resumes
  when restored.
- Added meaningful delivery activity plus actor action and objective details to
  the Unity HUD without reducing the map viewport.
- Migrated saves to schema 13 and expanded the regression suite to 85 tests;
  the dungeon-parity checkpoint subsequently advances the schema to 14.

## Interactive Version 1 · Unity client foundation

- Added a Unity 6000.5 client while preserving the retro ASCII visual language.
- Rendered the visible map with one vertex-shaded terrain mesh and one colored
  glyph mesh instead of thousands of browser DOM controls.
- Added a compact, versioned Unity state/action protocol backed by the same
  authoritative simulation, persistence, and revision checks as the HTML client.
- Added keyboard and adjacent-cell click movement, selection, camera fitting,
  zoom, status HUD, distance shading, and a custom animated ground shader.
- Removed redundant grass, road, and ordinary floor punctuation so terrain is
  communicated by shading while actors and meaningful objects retain glyphs.
- Reorganized the native HUD into a party-status card, contextual selection
  inspector, and bottom command strip without reducing the map viewport.
- Reworked the HUD after comparing RimWorld and Dwarf Fortress: the world now
  acts as the full-window canvas, persistent status occupies one thin top bar,
  commands occupy a thin bottom strip, and larger details appear contextually.
- Expanded the Unity rolling town view from 56×50 narrow terminal cells to
  76×46 square cells, using nearly the entire window while remaining below the
  compact protocol's 500 KB payload ceiling.
- Added protocol size and identity tests and retained the complete 80-test suite.

## Interactive Version 1 · M-4

- Added persistent UUID-backed jobs with guarded lifecycle transitions.
- Added atomic reservations for jobs, world objects, items, and work positions.
- Added explicit resident capabilities, permissions, skills, work state, and
  deterministic assignment scoring.
- Added a real stable-cart stocktake job using legal navigation and the shared
  smart-object interaction executor.
- Added an overlay work-order inspector with assignment, progress, destination,
  and blocking information.
- Migrated saves to schema 12 and added cancellation, invalidation, replay,
  serialization, MCP-schema, and full-lifecycle tests.

## Interactive Version 1 · M-3

- Added UUID-backed smart world objects and spatial entity indexing for town
  interactions.
- Added data-driven affordances shared by players and NPCs, with range, state,
  visibility, tool, duration, and failure-reason contracts.
- Converted signs, residents, doors, trees, walls, materials, terrain,
  counters, the forge, and a stable cart to contextual interactions.
- Replaced fixed town interaction controls with an object-driven overlay that
  keeps unavailable actions visible and explained.
- Added effect idempotence, persistent request replay, and compatibility
  regression coverage.

## 0.2.0-alpha.7 — Local and world travel scales

- Replace the direct dungeon-to-village jump with a three-scale travel model:
  dungeon/local maps, an exterior local area and a regional world map.
- Represent all party members separately on local maps and collapse the company
  to `群` (`qún`, group) only while travelling on the world map.
- Add revisioned `open_world`, `world_travel` and `enter_location` intents and
  persist the party's current world node.
- Connect the Rooted Keep and Stonebridge as the first world destinations while
  preserving the same dungeon expedition when the party returns.
- Give exterior, world and village screens a light ground palette with black
  linework, vegetation greens, building browns, gray stone roads and tan dirt
  tracks.
- Render both the keep exterior and the regional world as ASCII-like grids;
  destinations on the world grid are clickable and the `群` marker animates
  along the available road before arriving.
- Offer the regional map only when the party is safe, while preserving the
  local exterior as the immediate space outside the dungeon.
- Use the same ASCII-like visual vocabulary for dungeon, exterior, regional
  and village maps. The initial camera mode keeps every map static while actor
  glyphs move; a centered-on-hero mode is reserved as the second camera option.
- Replace the finite regional board with an open coordinate plane. A
  deterministic rolling-tile window generates only the currently relevant
  world terrain, keeping its origin and tile seams invisible to the player.
- Make every outdoor scale explorable: click any traversable exterior or town
  square to path the four-character party there, click any visible world tile
  to move `群`, or use the same eight directional controls used underground.
- Turn Stonebridge buildings into dungeon-scale spaces with blocking walls,
  closed doors and walkable interiors. Moving into a door opens it; entering
  the building reveals only that shop's inventory and enables its purchases.
- Replace the bounded town board with a rolling local-coordinate viewport that
  reveals more terrain as the party reaches an edge while keeping the camera
  static during ordinary movement.
- Enlarge all three shop interiors, add deterministic trees, signed storefronts
  and road signs, and condense town information into a compact map footer.
- Expand Stonebridge to seven buildings with multi-room partitions, counters,
  chairs, tables, workstations and fourteen named residents across its streets
  and interiors.
- Add contextual and explicit examine actions for signs, people, furniture,
  buildings and terrain, returning readable descriptions to the event log.
- Add follow and dispersed local-party movement modes so the leader can explore
  town independently without dragging every companion through each building.
- Center the rolling town viewport on the leader, matching regional-map travel,
  and add coherent rivers, water and mountain ridges to regional terrain.
- Animate click-to-travel one square and one turn at a time on town and exterior
  maps, and slow regional marker travel enough for its route to remain visible.
- Stretch town and regional grids across their complete map panels, add an
  always-visible interaction guide and response area, and let every named
  resident answer an explicit Talk action with individual dialogue.
- Keep the event panel beside the map at ordinary desktop widths and omit
  routine hero, companion and enemy movement from its significant-event feed.
- Give the party, civilians, shopkeepers, guards, hostile humans and monsters
  separate map colors; identify bandits and cultists as human adversaries.
- Preserve the two main Stonebridge roads as clear public space and derive a
  dirt approach from every building door instead of placing walls on roads.

## 0.2.0-alpha.6 — Tactical party deployment

- Track party facing and the explicit `travel`, `deployed` and `engaged`
  tactical phases in persistent run state.
- Deploy companions into distinct column, line, wedge or scatter slots when the
  leader stops, issues an order or engages an enemy.
- Restore role policy from the earlier group work: the scout closes with the
  coordinated target, support preserves access to the formation, and the rear
  guard fights at range or withdraws from melee pressure.
- Make ranged characters actively increase their distance from enemies within
  two squares, while melee companions prioritize and intercept creatures
  threatening the ranged or support line.
- Prefer enemies already engaged with the party and wounded enemies so members
  coordinate attacks without all crowding the nearest creature.
- Add live formation and strategy controls to the Party interface plus clear
  deployment and repositioning events.
- Add formation geometry and role-behavior regression tests; all 37 tests pass.

## 0.2.0-alpha.5 — Village expedition loop

- Add upward stairs at every level entrance and preserve bidirectional level
  travel through the dungeon.
- Let the party leave depth 1 for the persistent village of Stonebridge and
  later re-enter the same dungeon expedition.
- Add a smithy, armorer and apothecary with copper-denominated inventory.
- Purchase equipment for any party-member UUID, retain ownership on that
  character sheet and equip it immediately; potions enter shared supplies.
- Add a dedicated village interface, buyer selection, shop events and visible
  ascend, leave and re-enter controls.

## 0.2.0-alpha.4 — Group-to-group combat

- Give all three companions persistent D&D-style attack statistics, damage
  types, ranges, conditions and combat resources.
- Resolve the leader, companions in party order, and then monster groups on
  each roguelike turn.
- Let group focus, hold and retreat orders control companion target priority
  and engagement behavior.
- Select monster targets spatially from the complete living party instead of
  directing every hostile attack at the hero.
- Add limited support healing, party-member unconsciousness, combat events and
  richer party status in the HTML interface.
- Add repeatable three-game simulation coverage and group-combat regression
  tests.

## 0.2.0-alpha.3 — Four-character follow movement

- Create Mara Thorn's established party with Niklas Ried, Adelheid Bauer and
  Konrad Falk as independent persisted actor instances.
- Add an explicit `follow_leader` movement mode and move companions through the
  leader's vacated trail without actor stacking when the party reverses.
- Increase roguelike room minimums for four-character maneuvering.
- Generate spatial creature packs whose members share one enemy group and home
  room.
- Render companions on the dungeon grid and expose party status in the game UI.

## 0.2.0-alpha.2 — UUID identity model

- Give definitions stable UUID v5 identifiers and runtime actors, groups,
  items, treasures, rooms, doors, features and dungeon levels UUID v4 instance
  identifiers.
- Replace embedded group-member records with `memberIds`, separate role
  assignments and a dereferenced `memberStatus` read model.
- Address item use by exact `itemId` instead of item type.
- Rename readable definition identifiers to `key` and retain names only as
  presentation metadata.
- Deterministically migrate legacy textual IDs using the run UUID as namespace.

## 0.2.0-alpha.1 — MCP-native group foundation

- Persist player and creature groups with leaders/alphas, member roles,
  formations, objectives, target/destination policy, resource policy and
  casualty-based retreat thresholds.
- Add leader-only revisioned command intents to the replay-safe turn stream.
- Add deterministic leadership succession and connect group hold/retreat policy
  to creature decisions.
- Add `rogue_groups_get` without exposing hidden groups, membership or alphas.
- Preserve the frozen one-character v0.1 behavior while the companion action and
  formation-execution layer remains under development.

## 0.1.0 — 2026-09-25 (frozen solo baseline)

- Add a dedicated `dungeon-rogue` MCP with persistent replay-safe runs.
- Add themed multi-level dungeon generation, large maps, fog of war, rooms,
  doors, sound, traps, secret doors, stairs, factions and a final-floor boss.
- Add D&D SRD 5.1-compatible attack, damage, healing, death-save and recovery
  semantics with explicit roguelike cadence overrides.
- Add Fighter, Mage and Cleric starts, equipment, spells, consumables, treasure,
  shrines, permanent tomes, experience and leveling.
- Add 25 behavioral creatures and a searchable Monster Manual driven by the
  authoritative runtime bestiary.
- Add an HTML game interface with passive discovery, combat feedback, event
  history, inventory management, dungeon lore and keyboard controls.

Future party and multiple-character experiments begin after this frozen tag.
