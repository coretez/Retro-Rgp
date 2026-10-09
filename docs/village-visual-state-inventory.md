# Stonebridge visual-state inventory

Status: authoritative asset and look/feel inventory  
Style ID: `stonebridge-colony-v1`  
Applies to: Unity village renderer; dungeons remain out of scope

## Purpose

Every visually meaningful simulation state must have a documented presentation.
This inventory prevents us from generating one attractive final icon while
leaving its blueprint, material, frame, damage, contents, or interaction state
as a letter or generic marker.

RimWorld documentation is used to identify functional state coverage and
readability conventions. We do not copy, trace, recolor, extract, or redistribute
RimWorld or Clanfolk pixels. All shipped silhouettes, textures, characters, and
animation are original Stonebridge artwork.

## Current audit

`UnityClient/Assets/Resources/VillageSprites/` contains only the 26 accepted
runtime PNG anchors. The 21 retained legacy/source PNGs are preserved under
`UnityClient/Assets/VillageSpriteSources/`, outside `Resources`, so Unity does
not package them. The combined source inventory is:

| Family             | PNG count | What exists                                                                         | Acceptance status                                                                                                                              |
| ------------------ | --------: | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Actors and animals |        17 | One overhead modular pawn anchor, one cow anchor, and 15 retained role/source files | The pawn and cow anchors are accepted. Pawn appearance, facing, work, carrying, and locomotion are composed from authoritative runtime layers. |
| Doors              |         6 | Wood/steel legacy, closed, and open source files                                    | Source files remain unaccepted. Production doors and gates use matched procedural states, orientation, and construction layers.                |
| Fixtures           |        17 | Bed, table, chair, shelves, work and decorative objects                             | All 17 are accepted anchors; construction, contents, occupancy, work, and damage are separate authoritative layers.                            |
| Trees              |         5 | Birch, elm, maple, oak, and pine mature trees                                       | All five standing species anchors are accepted; stumps, work, damage, and materials use procedural/state overlays.                             |
| Walls              |         2 | Finished timber and stone material anchors                                          | Both anchors are accepted; connection masks, lifecycle, material supply, damage, repair, and deconstruction are composed procedurally.         |

The production renderer declares no missing PNG key. The following former
missing keys are now deliberate procedural families rather than sprite-file
requests:

- `fixture_prayer_stone`
- `fixture_cart`
- `fixture_hitching_rail`
- `fixture_milking_rail`
- `sign_posted`
- `terrain_stump`
- `terrain_pit`
- `material_timber`
- `material_stone`
- `material_earth`

The old 135-key role/facing/action lookup has been removed. One accepted
strict-overhead pawn anchor is cached and combined with deterministic body,
skin, hair, clothing, equipment, carried-item, facing, locomotion, and work
layers. Unknown semantic states still use the explicit diagnostic fallback.

### Retained source mismatches

- `fixture_shelves` is front-facing while `fixture_table` and `fixture_bed` are
  predominantly overhead.
- `door_wood_closed` is 256x256, while `door_wood_open` is 1254x1254 and uses a
  more oblique architectural view. They do not read as the same object changing
  state.
- Wall images are seamless material squares, not connected structural pieces.
- Mature tree illustrations are readable but do not yet share a complete
  biological/material lifecycle.
- These mismatched door and role files are not referenced by the production
  renderer. They remain only as source/provenance material and can be archived
  in a later asset-cleanup pass.

`present` below means a usable source file exists. Runtime acceptance is defined
by registry version 2 and may be fulfilled by an accepted sprite anchor or by a
named procedural family whose inputs come from simulation state.

## Shared visual grammar

### Camera and projection

- Orthographic overhead colony map; never isometric and never inventory-card art.
- A shallow visible side may be used consistently to show object height, but the
  footprint and top plane remain dominant.
- One south/southwest light direction, one shadow softness, and one outline scale.
- Object art fills its declared footprint with a tight transparent crop.
- Furniture, structures, plants, items, animals, and pawns must appear to inhabit
  the same map rather than come from separate illustration sets.

### Readability hierarchy

At 100x60 overview, identify in this order:

1. footprint and category;
2. material or species;
3. lifecycle/state;
4. orientation or connection;
5. contents, damage, quality, or decorative detail.

Fine texture may not obscure the silhouette or make adjacent tiles merge.

### Render layers

From back to front:

1. base terrain;
2. terrain variation and prepared ground;
3. floor/field/roof-zone overlays;
4. designation silhouette;
5. actual delivered material;
6. frame or finished world object;
7. stored contents and carried objects;
8. pawns/animals;
9. work effect, selection, progress, reservation, and alert overlays.

No layer may imply an object or quantity absent from simulation state.

## Universal construction presentation

Every constructible family supports these lifecycle states unless marked
inapplicable. A shared shader/tint may handle selection and authorization, but
the object silhouette and material-specific frame must be family-specific.

| State                | Required visual                                                                           | Simulation evidence                 |
| -------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------- |
| `designated`         | Translucent connected silhouette of final object; dashed footprint edge; no material pile | UUID and valid designation          |
| `clearing_required`  | Same silhouette plus exact obstructing tree/rock/debris highlight                         | Clearing dependency                 |
| `awaiting_material`  | Blueprint only; empty material sockets/staging marks                                      | Required amount > delivered amount  |
| `partially_supplied` | Blueprint retained plus truthful partial stack and `delivered/required` inspection        | Partial delivered inventory         |
| `supplied`           | Blueprint retained plus complete staged material                                          | Exact required inventory delivered  |
| `frame`              | Recognizable incomplete material-specific skeleton                                        | Frame created after full supply     |
| `active_work`        | Frame plus local tool motion, dust/chips, and progress arc/bar                            | Builder at work cell applying labor |
| `complete`           | Finished connected object using its actual material                                       | Object completed                    |
| `damaged`            | Same object with state overlays at damage bands; never unrelated replacement art          | Hit points/damage state             |
| `repair_frame`       | Damaged object plus staged repair material and work effect                                | Repair job and inputs               |
| `deconstruction`     | Finished/damaged object with removal designation and dismantling progress                 | Deconstruction job                  |
| `destroyed/salvage`  | Debris or actual salvage stacks, then cleared terrain                                     | Destroyed state and outputs         |

Recommended damage bands are `intact`, `worn` (51–75%), `damaged` (26–50%),
and `critical` (1–25%). Damage can use a base sprite plus cracks, broken members,
scorch, or missing-piece overlays instead of four unrelated generations.

## Connectivity convention

Fences, walls, roads, pipes, and similar tile networks use a four-bit cardinal
neighbor mask: north=1, east=2, south=4, west=8. The renderer maps masks to ends,
straight sections, corners, T-junctions, crossings, and isolated pieces. Rotation
and reflection may reduce unique art only when grain, hardware, damage, and light
remain visually correct.

Construction silhouettes, frames, completed art, and damage overlays must use
the same connection mask so an element never changes orientation on completion.

## Stone lifecycle

Stonebridge will eventually distinguish stone species such as granite,
limestone, sandstone, slate, and marble. The first quarry implementation may
ship granite plus one local secondary stone, but it must use the complete state
model.

| Stage                       | Asset/state keys                                              | Footprint         | Status and rule                                                           |
| --------------------------- | ------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------- |
| Natural bedrock/outcrop     | `terrain_rock_<species>_<mask>`                               | 1x1 network       | Missing. Connected natural mass, not a loose boulder.                     |
| Quarry designation          | `overlay_quarry_designation`                                  | target cells      | Missing. Does not replace the rock art.                                   |
| Active quarry face          | `terrain_rock_<species>_worked_<mask>` plus chips/tool effect | 1x1               | Missing. Driven by mining progress.                                       |
| Loose raw chunk             | `material_<species>_chunk_<size>`                             | 1x1               | Missing. Physical, haulable and obstructive.                              |
| Carried chunk               | `carry_<species>_chunk`                                       | actor overlay     | Missing. Only while actor inventory owns it.                              |
| Dumped chunk stock          | same chunk sprite with quantity/stack offsets                 | stock cell        | Missing. Contents never baked into the stockpile zone.                    |
| Stonecutter input           | chunk placed at workstation input                             | interaction cell  | Missing. Same item identity until consumed.                               |
| Cut block stack             | `material_<species>_blocks_<small                             | medium            | large>`                                                                   | 1x1 | Missing. Quantity selects stack density. |
| Carried blocks              | `carry_<species>_blocks`                                      | actor overlay     | Missing.                                                                  |
| Delivered masonry           | block stack over target blueprint                             | element footprint | Missing. Uses actual delivered quantity.                                  |
| Masonry frame               | `frame_wall_<species>_<mask>` or fixture equivalent           | object footprint  | Missing. Rough courses, guide lines and gaps.                             |
| Finished wall/floor/fixture | material-specific family below                                | exact footprint   | Only generic finished `wall_stone` exists; replace with connected family. |
| Rubble/salvage              | `material_<species>_rubble` and recovered block stacks        | 1x1               | Missing. Quantity and recovery are systemic.                              |

RimWorld's documented raw-chunk-to-cut-block distinction is a useful logistics
reference: chunks are physical haulable objects and are processed at a
stonecutter before they become construction material. Stonebridge will choose
its own yields and medieval quarry rules rather than copying exact balance.

## Wood and tree lifecycle

| Stage                   | Required keys                               | Status                                                                  |
| ----------------------- | ------------------------------------------- | ----------------------------------------------------------------------- |
| Sapling                 | `tree_<species>_sapling`                    | Missing                                                                 |
| Young                   | `tree_<species>_young`                      | Missing                                                                 |
| Mature healthy          | `tree_<species>_mature`                     | Partial: five un-suffixed mature images exist and require normalization |
| Mature damaged/diseased | `tree_<species>_damaged`                    | Missing                                                                 |
| Felled tree             | `tree_<species>_felled`                     | Missing                                                                 |
| Stump                   | `tree_<species>_stump`                      | Missing; renderer fallback key also absent                              |
| Raw logs                | `material_<species                          | generic>_logs_<stack>`                                                  | Missing                             |
| Carried log             | `carry_<species                             | generic>_log`                                                           | Missing                             |
| Sawing input/work       | log at trestle/saw plus sawdust/work effect | Missing                                                                 |
| Boards                  | `material_<species                          | generic>_boards_<stack>`                                                | Missing                             |
| Carried boards          | `carry_<species                             | generic>_boards`                                                        | Missing                             |
| Firewood/offcuts        | `material_<species                          | generic>_firewood_<stack>`                                              | Deferred until simulation tracks it |

Pine, elm, maple, oak, and birch must remain recognizable from crown silhouette
and palette at overview scale. Processed-wood species art ships only after the
simulation preserves species through harvest, processing, storage, and use.

## Fence and gate lifecycle

### Fence

Family key: `fence_<material>_<construction-state>_<mask>`

Required initial material is timber. Later stone or metal enclosures use separate
recipes and silhouettes rather than recoloring timber rails.

| State            | Timber visual                                    | Status                                 |
| ---------------- | ------------------------------------------------ | -------------------------------------- |
| Designated       | Translucent posts/rails in final connection mask | Procedural placeholder exists; replace |
| Partial/supplied | Blueprint plus actual rail/post bundle           | Procedural placeholder exists; replace |
| Frame            | Posts set, incomplete rails/bracing              | Procedural placeholder exists; replace |
| Active work      | Frame plus hammer/wood-chip effect               | Missing                                |
| Complete         | Connected posts and rails                        | Procedural shape exists; not accepted  |
| Damaged bands    | Broken/leaning rails while retaining connection  | Missing                                |
| Repair           | Broken rail plus staged board/tool effect        | Missing                                |
| Deconstruction   | Removal overlay, then boards/scrap               | Missing                                |

### Fence gate

Family key: `gate_<material>_<construction-state>_<orientation>`

Required states are blueprint, partial/supplied, frame, closed, opening, open,
closing, damaged, repair, and deconstruction. The gate preserves the same posts,
rail pattern, hinges, latch, scale, and light in every state. Open/closed changes
collision and animal passage at the authoritative interaction boundary.

RimWorld's fence gate is a distinct constructed passage rather than decorative
fence art; Stonebridge adopts that semantic separation with original visuals.

## Wall lifecycle

Family key: `wall_<material>_<construction-state>_<mask>`

| Material         | Structural language                                            | Initial status                                       |
| ---------------- | -------------------------------------------------------------- | ---------------------------------------------------- |
| Timber           | Squared log or heavy plank wall with visible posts and joinery | One final texture exists; connections/states missing |
| Granite/stone    | Laid block courses with material-specific color and joints     | One generic final texture exists; replace            |
| Additional stone | Same masonry system with species palette/shape differences     | Deferred until quarry materials exist                |

Required states are universal construction states plus material-specific fire,
soot, breach, and collapse overlays. A wall cell becomes blocking and roof-
supporting immediately when that element reaches `complete`; its artwork and
path state change together.

Ends, straights, corners, junctions and door joins must align. Interior/exterior
surface variation is a later layer and may not alter footprint.

## Door lifecycle

Family key: `door_<material>_<state>_<orientation>`

| Material | Required states                                                                                      | Current status                                                               |
| -------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Wood     | blueprint, partial, supplied, frame, closed, opening, open, closing, damaged, repair, deconstruction | Closed/open files exist but are not a matched set; replace                   |
| Steel    | same                                                                                                 | Closed/open files exist but are not a matched set; replace after metal chain |

Stone doors are not in the planned material set. Stone is used for walls; doors
remain wood or metal unless a later design supplies a believable mechanism.

Open and closed are edits/poses of one approved anchor, not separate generated
concepts. They share canvas, pivot, frame, hinges, hardware, palette, crop,
orientation and light. Door progress may use transform animation between the
matched poses; authoritative pathing changes at a declared opening threshold.

## Floor, foundation, and roof lifecycle

### Ground and floors

Required ground states:

- natural grass/soil/rich soil/mud/sand/rock/water variants;
- selected or designated overlay;
- clearing required;
- dug/prepared earth;
- foundation material delivered;
- foundation/floor active work;
- complete timber, packed earth, flagstone, or later material floor;
- dirty, wet, blood/filth, damaged, removed.

Floors use edge blending and small variation tiles so a large room does not look
like repeated identical squares. Filth and damage are overlays driven by state.

### Roofs

Roof presentation has two coordinated views:

- normal view: subtle eaves/shadow and indoor shading without hiding residents;
- roof overlay: planned, unsupported, under construction, complete, damaged,
  leaking, removal-designated, and collapse-risk coverage.

Roof tiles never appear because a bounding rectangle completed. Support and
coverage are derived from completed walls/columns and roof work.

## Fixture and furniture lifecycle

Each fixture has blueprint, partial/supplied, frame, active-work, complete,
damaged, repair, and deconstruction states. Multi-cell art fills the declared
footprint and uses one anchor UUID. Contents and users are separate overlays.

| Fixture                 | Footprint contract                               | Content/state requirements                                | Current status                                                 |
| ----------------------- | ------------------------------------------------ | --------------------------------------------------------- | -------------------------------------------------------------- |
| Single bed              | 1x2, long axis explicit                          | empty, assigned, occupied/sleeping, unmade/damaged        | Complete image exists; construction/damage/user layers missing |
| Double bed              | 2x2                                              | same, two sleeping anchors                                | Missing                                                        |
| Table                   | 2x1 minimum; larger variants declared separately | empty surface; meals/items separate                       | Complete 2x1 image exists                                      |
| Chair/stool             | 1x1                                              | empty/occupied/damaged                                    | Complete chair exists                                          |
| Shelf                   | 2x1                                              | empty base plus actual content stacks                     | Empty image exists but wrong front-facing camera; replace      |
| Counter/bar             | multi-cell by archetype                          | empty base; food/tools/goods separate                     | Complete image exists; verify camera                           |
| Kitchen/cooking station | multi-cell                                       | cold, fueled, active, occupied, damaged                   | Cooking-pot image exists; full station family missing          |
| Forge/smithy            | multi-cell                                       | cold, fueled/heated, active, damaged                      | Complete image exists; state family missing                    |
| Trestles/saw            | multi-cell                                       | empty, log loaded, active cutting, boards output          | Complete image exists; operational states missing              |
| Storage shed/container  | declared footprint                               | empty, open/closed if applicable, content overlays        | Complete image exists; state family missing                    |
| Cart                    | 2x1 or architecture-defined                      | empty, loaded by material, hitched/moving, damaged        | Renderer key missing                                           |
| Hitching/milking rail   | architecture-defined                             | empty, animal attached/in use                             | Renderer keys missing                                          |
| Altar/prayer stone      | declared footprint                               | empty/in use/offering overlays                            | Altar exists; prayer stone missing                             |
| Sign                    | 1x1                                              | material/damage and readable inspection, never baked text | Missing                                                        |

## Stock and storage contents

Loose stock uses one base sprite per physical form with quantity-density variants:

- `single` — one or a few units;
- `small` — roughly quarter stack;
- `medium` — roughly half stack;
- `large` — near full stack.

Quantity labels appear only when selected or requested; the pile's density is
the default overview cue. Required forms include logs, boards, stone chunks,
stone blocks, earth, seed, grain, vegetables, fish, meat, milk, meals, tools,
and later metal ore/ingots.

Stockpile zones show only a subtle floor boundary/filter overlay. Shelves,
containers, carts, and ground piles display actual contents as separate layers.

## Fields, crops, and water

| Family       | Required states                                                               |
| ------------ | ----------------------------------------------------------------------------- |
| Field cell   | designated, clearing, prepared/furrowed, seeded, fallow, damaged              |
| Crop species | seed/sprout, young, mature, harvest-ready, harvested remains, dead/diseased   |
| Water        | shore masks, shallow/deep flow variants, weather/season overlays              |
| Fishing      | designated spot, occupied worker, line/net/tool effect, catch carried/stacked |

A farm is visible as individual field/crop cells and built structures. A single
grain-plot icon is not an acceptable replacement.

## Animals

Initial animals are cows and horses with 2x1 footprints. Each requires north,
south, east, and west appearance; idle stable; locomotion; eating; sleeping;
carried/led or harnessed states where applicable; injured/downed; and death.
Large-animal art must fill the two-cell footprint and remain a moving creature,
not a herd or facility icon.

## Pawn appearance and action inventory

Pawn appearance layers:

- body builds: slim, average, heavy, obese;
- skin palettes;
- head/face bases;
- hair styles and colors;
- underclothes;
- work clothing and role accents;
- outerwear/armor;
- headwear;
- equipment/tool;
- carried item;
- injury, dirt/wetness, status and selection overlays.

Required action states are stable idle, walking, carrying, hauling, building,
chopping, sawing, mining/quarrying, sowing, harvesting, cooking, eating, sitting,
sleeping, social/recreation, operating a workstation, injured/downed, and later
combat. Combat artwork is outside the present village milestone.

Idle has no perpetual whole-body animation. Work animation targets the actual
object, and carried visuals come from authoritative inventory.

## Overlay inventory

Overlays are consistent UI graphics, not substitutes for world objects:

- hover and selection footprint;
- valid/invalid placement;
- blueprint/designation;
- reservation and assigned worker;
- work progress;
- blocked/no path/missing material/missing tool;
- direct priority and queued order;
- forbidden/suspended/cancel/deconstruct/repair;
- room, roof, fertility, storage, temperature, access and traffic views;
- hunger, exhaustion, homelessness, exposure and medical alerts.

At ordinary zoom, persistent overlays are restrained. Selection and dedicated
views reveal detail without covering the map permanently.

## Asset key and provenance contract

Canonical filename structure:

```text
<family>_<kind>_<material-or-species>_<state>_<orientation-or-mask>_<variant>.png
```

Omit fields only when they are genuinely inapplicable. Simulation and renderer
use the same enum values; unknown state falls back to an explicit diagnostic,
not an unrelated final sprite.

Each approved family records:

- asset key and semantic state;
- simulation field and allowed transitions;
- footprint, pivot and interaction anchors;
- canvas and pixels-per-cell;
- material/species palette;
- source prompt and shared style anchor;
- generation/edit provider and model;
- date, version and approved reference anchor;
- permitted rotations/reflections;
- overview and close-zoom acceptance screenshots;
- reviewer and acceptance status.

External game documentation images may be linked in research notes to explain a
state or interaction. They are never placed in runtime resources, used as image-
to-image inputs, traced, or treated as Stonebridge source art.

## Production order

### V0 — registry and truthful fallback

1. Implement a machine-readable asset/state registry and validation test.
2. Inventory runtime keys, dimensions, footprints, and missing images.
3. Make missing/unaccepted art use a clearly diagnostic fallback.
4. Remove the claim that file presence equals visual acceptance.

### V1 — construction proof family

1. Timber wall full lifecycle and connection masks.
2. Timber fence and gate full lifecycle and connection masks.
3. Matched wooden door lifecycle.
4. Logs, boards, delivered stacks, hammer/tool effects, rubble/salvage.
5. Floor/foundation and roof overlays.

Gate: one lumber yard and one fence can be understood at overview zoom without
letters or selection text through every construction state.

### V0 implementation status — 2026-09-28

V0 now has a machine-readable family/state/asset registry, explicit per-asset
acceptance decisions, validation tests, and protocol versioning. New physical
construction cells project semantic family, material, lifecycle state, asset
key, and acceptance/fallback fields. Unity draws a magenta diagnostic outline
around missing or unaccepted finished art. Planned walls, doors, fences, and
gates instead use connected procedural silhouettes, so the fallback remains
readable without repeating an icon in every cell. File presence alone is not
acceptance. The inventory remains authoritative for dimensions, footprints,
runtime keys, and missing families. V1 art production remains open.

The accepted animal anchors are `actor_cow_v2.png` and `actor_deer_v2.png`.
Both were generated with OpenAI image generation on 2026-10-02 from original
Stonebridge prompts for strict overhead, transparent, compact colony-sim
animals with readable silhouettes at 64 pixels. Their untouched generated
sources remain under
`/Users/chris/.codex/generated_images/01a0ea7e-2018-7020-a8dd-8d3b4c5963f2/`;
the runtime copies are in `UnityClient/Assets/Resources/VillageSprites/`. The
superseded side/top hybrid cow was archived outside runtime resources. These
anchors cover idle, grazing, walking, working, and sleeping presentation while
directional locomotion remains a later bespoke-animation improvement.

`npm run audit:visuals` reads the runtime PNG headers, registry, and renderer
keys directly. The R6 closure audit requires every referenced runtime key to
have a file and an accepted registry entry, with no missing accepted asset or
unaccepted runtime key. Preserved legacy/source files remain intentionally
outside `Resources`. A nonzero exit is mandatory for any missing or unaccepted
runtime asset.

### R6 implementation closure — 2026-09-30

Registry version 2 now describes actor, animal, crop, tree, material, wall,
floor, roof, fence, door, gate, fixture, sign, and terrain families. It records
render mode, material/species, lifecycle, orientation/connection mask,
condition, and damage band. Stock content arrays preserve every co-located
stockpile rather than collapsing a cell to one item type.

The accepted pawn anchor is `pawn_base_overhead_v2.png`. It was generated with
OpenAI image generation on 2026-09-30 from an original Stonebridge prompt for a
strict orthographic overhead, neutral, compact, transparent modular civilian
base in the forest/moss/bark/ochre palette. The generation system did not expose
a model identifier. The untouched generated source remains at
`/Users/chris/.codex/generated_images/01a0ea7e-2018-7020-a8dd-8d3b4c5963f2/exec-e27b88ff-eff5-4fad-9789-6c747b53dc96.png`;
the runtime copy is
`UnityClient/Assets/Resources/VillageSprites/pawn_base_overhead_v2.png`.

The Unity renderer caches modular pawn recipes and procedural meshes. It shows
direction, continuous authoritative movement, action state, equipment, carried
items, construction supply/frame/work/complete states, crop state and progress,
individual stock contents, connected structures, and damage without inventing
simulation authority.

The exact canonical run
`ec02b607-150c-5276-9c46-24e7df1d0870` was watched in the rebuilt Mac client at
the founding camp and again at tick 33,007. The mature view contained 751
accepted visual cells across actors, crops, doors, fences, fixtures, floors,
materials, trees, and walls, with zero fallback cells. Completed construction,
an open door, cattle, pasture fence, fallow and harvestable fields, stored
materials, stumps, and working/carrying/idle pawn states remained distinguishable
at overview zoom. The final watched rebuild passed on 2026-10-02 with the new
cow and deer anchors, closing R6. Deeper bespoke directional animation is
polish work, not a release blocker.

### V2 — founding buildings and fixtures

1. Corrected bed, table, chair, empty shelf, storage, kitchen, saw and forge
   families with construction/damage states.
2. House, farmstead and inn architectural material families.
3. Field/crop and food item chains.

Gate: house, farm and inn grow visibly from primitives; no final object pops in.

### V3 — ecology and later materials

1. Complete tree lifecycle for five species.
2. Stone outcrop/chunk/block/wall/floor chain.
3. Later metal ore/ingot/steel-door chain.
4. Water, weather, season, dirt and damage overlays.

### V4 — pawns and animals

1. Modular pawn bases and appearance compositor.
2. Directional locomotion and village work states.
3. Carried-item and tool layers.
4. Cows/horses and their needs/action states.

## Acceptance checklist

An asset family is accepted only when:

1. every visual state maps to real simulation state;
2. state transitions preserve identity, footprint, material and orientation;
3. overview viewers identify category and state without a letter marker;
4. close zoom reveals useful construction/material detail without camera clash;
5. alpha is genuine, crop is tight, and no background/XOR halo appears;
6. occupied cells, pivot, interaction cells and art agree;
7. the image remains legible beside actors and neighboring objects;
8. open/closed, empty/full and intact/damaged pairs visibly remain the same object;
9. renderer fallback and inspection are truthful when a state asset is absent;
10. provenance is recorded and the artwork is original to Stonebridge.
