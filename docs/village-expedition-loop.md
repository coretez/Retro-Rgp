# Village expedition loop

Stonebridge is the persistent surface hub for a dungeon run. Leaving the
dungeon does not reset rooms, enemies, treasure, doors, discovered cells,
character state or group orders.

## Travel

- Every level entrance is an upward stair represented by `<`.
- `stairs_up` at depths 2–8 returns the party to the previous level's downward
  stair.
- `stairs_up` at depth 1 moves the party to Stonebridge.
- Leaving depth 1 first enters the Rooted Keep exterior local area, where every
  party member remains individually represented on an ASCII-like outdoor map.
- `open_world` is available only while that exterior is safe. It zooms out to
  an ASCII-like map of the Stonebridge March and represents the complete party
  as `群` (`qún`, group).
- `world_travel` moves that single group marker between the Rooted Keep and
  Stonebridge. Clicking a destination animates the marker along its road before
  arrival; `enter_location` then zooms back into a local area.
- From the keep exterior, `enter_dungeon` returns the complete party to the
  first-level entrance.
- Downward travel continues to use `stairs` at `>`.

## Shops and ownership

The Red Hammer Smithy sells weapons, the Gatehouse Armorer sells armor and
shields, and Juniper & Salt sells healing potions. Prices use the party's shared
copper total. Equipment purchases name the receiving actor UUID, become part of
that character's own inventory and equip immediately. Replaced equipment
remains in that character's inventory. Potions enter the leader's expedition
supplies until shared consumable management is implemented.

Each shop is a physical local-map building. Its walls block movement, its `+`
door opens through the same movement interaction used underground, and its
interior is walkable. Inventory and buying controls are available only while
the leader is inside that particular shop; the engine rejects purchase intents
sent from elsewhere.

Stonebridge itself is an open local-coordinate plane. The visible 48×26 map is
a rolling viewport rather than a town boundary. It follows the leader using the
same centered presentation as regional travel, while deterministic terrain
continues beyond every side. Seven buildings include the smithy, apothecary,
armorer, inn, chapel, guildhall and stable. Interior partitions, counters,
tables, chairs, workstations, signs, trees, stone roads and dirt approaches make
the town readable without changing the dungeon-style interaction.

Fourteen named residents occupy streets and interiors. Selecting a person,
sign or furnishing examines it directly; Examine mode allows inspection of any
visible town cell and reports the result in the event log. The party can switch
between follow mode and dispersed mode. In dispersed mode only the leader moves
and each companion retains their position until following is resumed.

Shopping and travel are persisted replay-safe intents. A retry with the same
request ID cannot charge the party twice.

Dungeon, exterior, world and village views share the same ASCII-like terrain
and actor language. The current camera mode keeps the complete map stationary
while the hero or `群` marker moves. A second, centered-hero camera mode is
identified in the interface but deliberately disabled until it is implemented.

The regional map is an open world-coordinate plane rather than a finite board.
Its 46×28 display is only a rolling viewport: terrain is generated
deterministically from world coordinates, and the viewport origin and tile
seams are internal details that are never presented as world boundaries.

Exterior and Stonebridge maps support the same eight-direction exploration as
the dungeon. A player can use direction keys or click any traversable square;
the leader follows the selected path and companions occupy the leader's trail.
On the regional map, every visible square is clickable and moves the `群`
marker, while named destinations retain their preferred road route.

## Deliberately next

The village does not yet contain an inn, temple services, selling, randomized
stock, reputation, quests or companion-specific inventory controls outside the
shop. Those systems should extend this hub instead of creating a second economy
in the HTML client.
