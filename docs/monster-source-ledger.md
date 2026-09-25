# Monster source and license ledger

The solo roguelike's runtime catalog is `src/rogue-bestiary.js`. Every creature
must declare either an open source identifier or be original to this project.
Mechanics, encounter stocking, AI behavior and the HTML Monster Manual all read
that same catalog so prose and play cannot silently diverge.

## Sources allowed in product data

| Source                            | License       | Current use                                                                                                                      |
| --------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| D&D System Reference Document 5.1 | CC BY 4.0     | Baseline concepts and mechanics for explicitly sourced creature entries; required attribution is emitted by `rogue_bestiary_get` |
| Retro RPG original work           | Project-owned | All 25 entry descriptions, behavioral interpretations, ecology, factions, adapted names, and wholly original creatures           |

The SRD source is <https://media.wizards.com/2023/downloads/dnd/SRD_CC_v5.1.pdf>.
Its required attribution is copied verbatim in the runtime bestiary response.

## Research-only sources

Dragon and Dungeon magazines remain copyrighted publications. They are useful
for studying editorial structure—especially the player-facing “hunter's guide”
approach described in Paizo's public Dragon writer guidelines—but their prose,
tables, art, maps, distinctive creatures and adventure material are not copied
into the project.

Open5e is useful as a discovery index because each record identifies its source
document. It is not treated as a blanket license: a record may be imported only
after its underlying document and license are recorded here.

The Basic Fantasy community dataset is a promising future source with per-record
provenance, mixing CC BY-SA 4.0 Core Rules data and OGL 1.0a Field Guide data.
No records are imported in v1; doing so would require the corresponding
share-alike or OGL attribution and distribution work first.

## Entry standard

Each creature entry contains:

- two original paragraphs covering background and personality/behavior;
- an italicized physical/statistical interpretation in the UI;
- compact combat numbers, a unique semantic CJK glyph with language, reading and meaning, hearing range and behavioral role;
- a faction and one sentence explaining its place in the dungeon ecology;
- explicit source provenance when derived from open material.

This is intentionally a small behavioral manual before it is a large catalog.
New monsters should add a new dungeon decision, relationship or traversal
problem rather than only a different hit-point total.
