# Universe identity standard

Every persistent object in the game universe uses UUID identity. Human-readable
names, slugs, sequence numbers and map labels are presentation or definition
keys; they are never runtime identity.

## Definition versus instance

A definition describes what something is. An instance is the particular thing
currently existing in a run.

```json
{
  "id": "28f1e12d-8de8-45af-92a0-66f3bf5b6660",
  "definitionId": "98e26530-e418-5a7f-86b8-e217989a6079",
  "entityType": "item",
  "kind": "longsword",
  "name": "Longsword"
}
```

- `id` is the instance UUID. Ownership, equipment slots, events and commands
  reference this value.
- `definitionId` is the stable UUID of the underlying actor, item, group, room,
  feature or creature definition.
- `entityType` identifies the broad storage/lookup family.
- `kind`, `key` and `name` are readable metadata. They may change without
  changing identity.

Runtime instances receive UUID v4 identifiers. Definitions receive stable UUID
v5 identifiers under the project's identity namespace. Legacy textual IDs are
converted to deterministic UUID v5 identifiers namespaced by the run UUID, so
reloading an old snapshot produces the same migrated references.

## Reference rules

- Fields named `id` or ending in `Id` contain UUIDs or `null`.
- Collections use UUID references rather than embedded copies of authoritative
  objects.
- Commands address exact instances. For example, `use_item` takes `itemId`, not
  an item type such as `healing_potion`.
- A character's full actor sheet is authoritative. Group status may include a
  derived snapshot, but it points back through `actorId`.
- Definitions may expose a readable `key`; keys are not foreign keys.

## Group representation

The persisted group stores only actor references in `memberIds`. Role metadata
is stored separately in `assignments`. The player-facing status derives
`memberStatus` from the authoritative actor sheets:

```json
{
  "id": "1a8786e9-f7ab-4437-91a4-7c91b70cd294",
  "definitionId": "af8c4697-ebac-52e5-b36a-b575d7391c03",
  "entityType": "group",
  "memberIds": ["9b7ef90c-4d02-49c4-a281-3853b1d82b36"],
  "leaderId": "9b7ef90c-4d02-49c4-a281-3853b1d82b36",
  "memberStatus": [
    {
      "actorId": "9b7ef90c-4d02-49c4-a281-3853b1d82b36",
      "role": "leader",
      "alive": true,
      "hp": 25,
      "maxHp": 25
    }
  ]
}
```

`memberStatus` is a read model, not a second character sheet.
