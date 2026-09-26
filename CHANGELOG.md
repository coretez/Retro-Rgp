# Changelog

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
