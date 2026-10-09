# Stonebridge village art contract

Style ID: `stonebridge-colony-v1`

The complete object, material, construction, content, damage, action, and
overlay matrix is maintained in the
[Stonebridge visual-state inventory](village-visual-state-inventory.md). This
document defines the shared style and generation workflow; the inventory defines
which assets and state transitions must exist.

Stonebridge uses an original, readable top-down colony-simulation style. Its
visual grammar follows RimWorld and Clanfolk: orthographic colony overview,
compact schematic pawns and animals, restrained texture, clear footprints, and
world objects that read as parts of the map rather than isolated inventory
illustrations. The village is not ASCII, realistic, isometric, or a 1990s
action-RPG. Dungeon art may retain the existing ASCII presentation.

## Shared prompt anchor

Start every Stonebridge image-generation prompt with this block. Add the asset
description afterward without rewriting the anchor.

```text
Use case: stylized-concept
Asset type: top-down 2D Unity colony-simulation game sprite
Visual system: Stonebridge colony v1; overhead colony-sim visual grammar;
  original design; compact schematic shapes; restrained texture; clean edge;
  warm medieval character; no photorealism; never an inventory icon
Camera: orthographic top-down; never isometric; consistent south-facing light
Palette: forest green, moss, bark brown, warm timber, muted ochre, iron gray;
  role colors may accent but never overwhelm the shared earthy palette
Scale intent: immediately identifiable at the final in-game size
Backdrop: genuinely transparent with a tight, centered crop
Constraints: one isolated asset; no scene; no text; no letters; no symbols;
  no UI; no grid; no watermark; no copied game assets
```

## Pawn prompt

Append this block for residents and party members. Change only the role,
clothing accent, hair, age, and carried tool between variants.

```text
Primary request: one <ROLE> pawn for Stonebridge
Subject: oversized round head occupying about half the silhouette; compact oval
  torso; tiny simplified arms; no detailed legs; readable hair and clothing
  color blocks; optional single role tool held close to the body
Composition: facing south; head and shoulders remain recognizable at 24-32 px;
  no portrait proportions; no long cape or limb silhouette
Animation readiness: neutral centered pose; stable when idle; compatible with
  independently layered movement and work states; clear ground-contact point
Role details: <ROLE-SPECIFIC DETAILS>
```

## Animal prompt

Animals use the same map grammar as pawns, not the environment-object prompt.
Their back is the dominant visible plane and their features are simplified for
overview readability.

```text
Primary request: one <SPECIES> map creature for Stonebridge
Camera: strict orthographic overhead; the back dominates; never side profile
Anatomy: compact schematic torso; small head; legs reduced to short side nubs;
  minimal face detail; species readable from silhouette and broad color blocks
Footprint: <WIDTH>x<HEIGHT> cells; fill the footprint without portrait padding
Animation readiness: neutral pose; direction supplied by facing variants or a
  safe east/west mirror; no painted motion, ground, scene, or cast shadow
```

Reject any animal that resembles a field-guide illustration, inventory icon,
sticker, portrait, side-view livestock painting, or freestanding clip art.

Role accents:

- Party: muted blue, small travel pack.
- Civilian: moss or brown, practical work clothes.
- Guard: dark green and iron gray, compact helmet; no long spear silhouette.
- Shopkeeper: muted rust and cream, short apron.
- Official: ochre and deep green, simple shoulder sash.

## Environment and fixture prompt

```text
Primary request: one <OBJECT> used in a medieval lumber village
Composition: top-down object footprint; clear functional silhouette; centered;
  crop closely without cutting off the object
Materials: <SYSTEMIC MATERIAL>; material must be recognizable before fine detail
Scale intent: recognizable at one map cell unless explicitly marked oversized
```

Never use an object name as its only art direction. A timber wall must describe
logs or planks; a maple must describe its crown and leaf color; a bed must
describe frame, mattress, blanket, and top-down orientation.

## Consistency workflow

1. Generate one pawn anchor and approve it in the live Unity camera.
2. Use that approved image as the visual reference for all pawn variants.
3. Make one controlled change per variant; repeat the shared anchor verbatim.
4. Keep the original generation, final prompt, provider, model, and date.
5. Review the imported sprite at normal zoom and maximum overview zoom.
6. Reject assets that need a letter, tooltip, or excessive scale to be legible.

For animation, Unity supplies movement interpolation and state-driven layered
motion. Idle actors remain still: no perpetual whole-body bob, rocking, swaying,
or fake walking is allowed. Generated images remain neutral static anchors;
image generation is not used to fake per-frame locomotion.

## Stateful asset contract

An image key combines identity, material, and visible state. State variants are
edits of one approved anchor image, not unrelated generations. The edit prompt
must say `change only the state; preserve design, material, palette, camera,
lighting, scale, and footprint`.

Doors use `door_<material>_<state>.png`:

| Material | Required first states | Later states |
| -------- | --------------------- | ------------ |
| wood     | closed, open          | damaged      |
| steel    | closed, open          | damaged      |

The open version must visibly be the same door as the closed version: identical
planks or plates, hinges, handle, trim, palette, and lighting. Only the door's
pose changes. Unity may fall back to the current material-only closed image
until the paired state images are approved.

Wood uses two related but distinct state families:

| Family     | Image key                     | Simulation status |
| ---------- | ----------------------------- | ----------------- |
| Biological | `tree_<species>_mature`       | species tracked   |
| Biological | `tree_<species>_sapling`      | not implemented   |
| Biological | `tree_<species>_stump`        | stump tracked     |
| Processed  | `material_<species>_log`      | generic logs only |
| Processed  | `material_<species>_boards`   | generic lumber    |
| Processed  | `material_<species>_firewood` | not implemented   |

Current harvesting knows the original tree species and wood class, but the
stockpile economy currently merges output into generic `timber_log` and
`building_lumber` quantities. Species-specific processed-wood art therefore
waits until species survives harvesting, hauling, sawing, storage, and use.
Images must never imply a distinction the simulation no longer tracks.

## Import and naming

- Store runtime images under `UnityClient/Assets/Resources/VillageSprites/`.
- Use `actor_<role>.png`, `tree_<species>.png`, `wall_<material>.png`,
  `door_<material>_<state>.png`, and `fixture_<kind>.png`.
- Preserve alpha, disable mipmaps, clamp edges, and use consistent filtering.
- Do not overwrite an approved anchor while experimenting; use a versioned
  sibling such as `actor_civilian_v2.png` until the replacement is accepted.

## Stonebridge object inventory

The projection emits these keys now. A missing PNG deliberately falls back to
the truthful map marker instead of making the object invisible.

First-pass solid fixtures:

| Runtime key                                           | Covers                          |
| ----------------------------------------------------- | ------------------------------- |
| `sign_posted`                                         | posted village signs            |
| `fixture_bed`                                         | guest and future household beds |
| `fixture_counter`                                     | shop counters and the inn bar   |
| `fixture_forge`                                       | the stone forge                 |
| `fixture_shelves`, `fixture_rack`                     | herb shelves and armor rack     |
| `fixture_cooking_pot`, `fixture_meal_place`           | inn food service                |
| `fixture_altar`, `fixture_prayer_stone`               | worship fixtures                |
| `fixture_stall`, `fixture_cart`                       | stable fixtures                 |
| `fixture_jetty`                                       | fishing jetty                   |
| `fixture_hitching_rail`, `fixture_milking_rail`       | animal rails                    |
| `fixture_trestles`, `fixture_storage_shed`            | lumber and farm equipment       |
| `terrain_stump`, `terrain_pit`                        | worked terrain                  |
| `material_timber`, `material_stone`, `material_earth` | loose resources                 |

## Fixture footprints and contents

Object identity is anchored once even when its footprint spans several cells.
Every occupied cell resolves to that anchor UUID, while only the anchor emits
the sprite. Unity centers and scales the picture over the declared footprint.
The first validated oversized fixtures are tables and shelves at `2x1`; other
legacy fixtures remain `1x1` until their rooms and navigation are retested.

Container art shows the container itself, not assumed inventory. Shelves are
drawn empty. Stored goods later render as separate state-backed overlays, so an
empty stockpile never displays herbs, books, tools, or food that do not exist.

Stateful or systemic fixtures use the same renderer but need multiple images
as their simulation states mature:

| Runtime key                                    | Current state boundary                              |
| ---------------------------------------------- | --------------------------------------------------- |
| `fixture_construction_site`                    | site now; framed and completed stages later         |
| `fixture_grain_plot`, `fixture_kitchen_garden` | one marker now; crop growth later                   |
| `actor_cow_v2`                                 | UUID-backed overhead cattle with directional motion |
| `door_<material>_<state>`                      | paired open and closed images required first        |
| tree and processed-wood keys                   | follow the lifecycle table above                    |

People are a separate animation family. A pawn is assembled from compatible
body-build, skin, head, hair, clothing, outerwear, headwear, equipment, carried
item, and condition layers. The compositor caches the assembled result instead
of rebuilding every layer every rendered frame.

The first production set uses south, north, and east facings; west may mirror
east only when every visible asymmetric layer permits it. Stable idle and actual
locomotion are the first states. Unity derives facing from movement delta or the
active interaction target, so direction does not pollute the simulation
contract. Locomotion may use a restrained two- or four-phase gait, but may not
slide or rock the entire pawn from side to side. Work poses, carried-material
overlays, sleep, and injury follow the same anchors. Resident identity comes
from the component recipe rather than one completed role sprite per villager.

## Acceptance checks

- A pawn is visibly a person at the 100x60 overview scale.
- Pawns remain distinct from trees, chairs, and signs without labels.
- Role is communicated mainly through color and one compact detail.
- Adjacent pawns remain individually readable and do not visually merge.
- Movement looks continuous and never teleports.
- Sprites do not reveal rectangular backgrounds or alpha halos.
- Material and species variants remain backed by simulation metadata.
- Animals read as moving map creatures, never as pasted illustrations.
