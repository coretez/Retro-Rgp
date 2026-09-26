# Changelog

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
