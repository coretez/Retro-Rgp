# Changelog

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
