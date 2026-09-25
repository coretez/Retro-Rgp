# Retro RPG: Dungeon Rogue

A persistent, single-character dungeon roguelike with D&D SRD 5.1-compatible
combat rules, a dedicated Model Context Protocol server, and an HTML play
surface.

Version 0.1 is the frozen solo baseline. It includes themed multi-level
dungeons, large fog-of-war maps, rooms, doors, noise, passive searching, traps,
secret doors, treasure, equipment, class powers, spells, consumables, rests,
experience and leveling, 25 behavioral creatures, dungeon lore, and a searchable
Monster Manual.

This repository contains only the roguelike. It intentionally excludes the
separate general campaign engine, Unity client, historical campaign material,
world atlas, item repository, and other game projects from the development
workspace.

## Run

Node.js 24 or later is required because persistence uses built-in SQLite.

```sh
npm ci
npm start
```

Open <http://127.0.0.1:4321>. Runtime state is stored under the ignored `var/`
directory. Set `DND_ROGUE_PORT`, `DND_ROGUE_DB`, or
`DND_ROGUE_ACTIVE_RUN_FILE` to override the defaults.

Run the focused engine and MCP integration tests with:

```sh
npm test
```

## Architecture

- `src/rogue-server.js` exposes the dedicated `dungeon-rogue` MCP.
- `src/rogue-engine.js` owns turns, exploration, encounters and progression.
- `src/dungeon-generator.js` creates themed connected dungeon levels.
- `src/rogue-bestiary.js` is the shared source for generation, creature AI and
  the Monster Manual.
- `src/rogue-store.js` persists replay-safe runs in SQLite.
- `scripts/rogue-viewer.js` connects the browser workbench to the MCP server.
- `viewer/` contains the game and Monster Manual interfaces.

See [the frozen v0.1 record](docs/solo-roguelike-v0.1.md),
[the design](docs/solo-roguelike-mode.md), and
[the D&D compatibility profile](docs/rogue-dnd-compatibility.md).

## Experimental group branch

The `codex/multi-character-experiment` branch begins the MCP-native group layer.
It persists leaders and monster alphas, role assignments, formations, objectives,
resource policy, retreat thresholds, command revisions and deterministic
succession. Group orders are replay-safe `rogue_act` intents, and
`rogue_groups_get` exposes the party plus only currently known enemy groups. See
[MCP-native group logic](docs/group-logic.md) for implemented behavior and the
remaining companion-play work.

## Public source and restricted rights

This public repository is **source-available for inspection, not open source**.
Original project code and content are copyright © 2026 Chris Jordan, all rights
reserved. Reuse, redistribution, modification, derivative works and commercial
use require prior written permission. SRD 5.1-derived material retains its CC BY
4.0 terms. Read [LICENSE.md](LICENSE.md) and [NOTICE.md](NOTICE.md) before using
any part of the repository.
