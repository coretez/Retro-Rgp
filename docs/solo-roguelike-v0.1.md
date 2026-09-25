# Solo roguelike v0.1 frozen baseline

Frozen September 25, 2026 under the Git tag `rogue-v0.1.0`.

## What this version is

The v0.1 solo roguelike is the stable, single-character reference build. The
Node MCP service owns dungeon generation, movement, combat, enemy responses,
visibility, inventory, equipment, recovery, progression and persistence. The
HTML client is the development and play surface for this distinct mode.

The release includes themed multi-level dungeons, large fog-of-war maps,
room-by-room exploration, automatic hidden-feature discovery, traps, treasure,
doors and noise, D&D-style attacks and damage, death saves, short rests, three
hero classes, equipment management, consumables and relics, XP and leveling,
25 behavioral creatures, a creature reference, and generated dungeon lore.

## Freeze rule

This tag is immutable. Bug fixes discovered later are made after the tag and
recorded separately. Experiments involving several controllable characters,
party formation, leader commands or companion AI do not alter the tagged v0.1
baseline.

## Next experimental direction

The next design branch may replace one hero position with a party state while
keeping authoritative turns, deterministic persistence and the existing solo
mode available for comparison. The first design questions are party size,
formation representation, individual versus leader-issued actions, shared
initiative, companion autonomy and how one player turn advances several allied
actors.

The solo build remains available as the reference mode while party experiments
are developed separately after the frozen tag.
