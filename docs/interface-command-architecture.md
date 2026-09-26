# Map-first command interface and simulation plan

## Product direction

The map is the game. Persistent chrome must not reduce it to a preview window.
Information appears because the player selected something or because the world
produced an important alert. It disappears when it is no longer relevant.

The interaction model combines two useful patterns:

- RimWorld: select a pawn, item, structure, or cell; show one contextual inspect
  pane; issue a direct order against a target; retain autonomous priorities.
- Dwarf Fortress: keep simulation time separate from commands; expose jobs,
  squads, current activity, pause/play, and single-step inspection.

## Screen hierarchy

```text
┌ party strip ───────────────────────────── pause · step · follow · run ┐
│                                                                      │
│                          LOCAL ASCII MAP                             │
│                                                                      │
│  selected subject                                         alerts    │
│  name · health · current action · objective                          │
│  [Look] [Talk] [Move] [Attack] [Use…] [More…]                        │
└──────────────────────────────────────────────────────────────────────┘
                    optional drawer: details / events / lore
```

Rules:

1. The map receives at least 70% of the available width and nearly all height.
2. Only the selected square gets a persistent selection mark. Interactive
   squares may change cursor or highlight on hover, never all at once.
3. The inspect/command surface overlays the map and is hidden with no selection.
4. The right drawer shows one subject at a time. It never stacks Actions, Party,
   Inventory, Events, Lore, and Bestiary into one scrolling column.
5. Dungeon-only controls do not appear in town; shop controls appear only inside
   a shop; combat commands appear only for valid targets.
6. The party strip is a compact status view. Selecting a portrait selects that
   actor and opens details only on demand.

## Input grammar

Every interaction follows the same sentence:

> Select actor → select verb → select target → preview validity → commit intent.

Convenient forms may shorten the sentence without changing it:

- Select a person → Talk.
- Select the hero → Aim → select an enemy.
- Select a scroll → Use → select an enemy.
- Select an axe → Equip, Attack, or Throw → select a target.
- Select a sign, table, door, corpse, or terrain cell → Examine.
- Select a companion → Move → select a destination.

A command is shown only when its preconditions can be explained. A disabled
command must say why: out of range, no line of sight, wrong equipment, occupied,
unconscious, forbidden by the current group order, and so on.

## One action model, two time modes

Turn-based and continuous play must use the same action resolver. Continuous
play is not a second game implementation; it is an automatic caller of the
existing deterministic step function.

```text
world snapshot
    ↓
collect due actors
    ↓
choose one intent per actor
  player override → queued order → group doctrine → personal behavior
    ↓
validate intents against the same rules
    ↓
resolve movement, actions, reactions, damage, and events
    ↓
commit next snapshot
```

Time controls:

- **Pause:** no simulation steps run; commands and inspection remain available.
- **Step:** resolve one simulation beat for every actor due in that beat.
- **Follow turns:** resolve a beat after each committed player action. This is
  the current roguelike mode.
- **Run:** automatically resolve beats until paused or an interrupt fires.
- **Fast run:** same resolver with less presentation delay, never different
  combat or movement rules.

An interrupt automatically pauses continuous play for combat contact, a dying
party member, a discovered trap or secret, completed travel, failed order, or
dialogue requiring a player response.

## Persistent objectives and current actions

Group orders express intent across many turns. Actor actions explain what each
individual is doing now. They are related but must not be conflated.

```json
{
  "groupOrder": {
    "objective": "advance",
    "formation": "wedge",
    "targetId": null,
    "destination": { "x": 31, "y": 18 },
    "resourcePolicy": "conserve",
    "movementMode": "follow_leader"
  },
  "actorState": {
    "actorId": "uuid",
    "stance": "guard_ranged_ally",
    "currentAction": {
      "kind": "move",
      "targetId": null,
      "destination": { "x": 27, "y": 18 },
      "startedAtTick": 440,
      "remainingBeats": 1,
      "reason": "protect_ranged_ally"
    },
    "queuedActions": [],
    "lastCompletedAction": "move"
  }
}
```

The interface should always be able to answer four questions about a selected
actor:

1. What are you doing now?
2. Why are you doing it?
3. What will you do next?
4. Which group objective or direct order caused it?

## Command priority

For each actor decision, use this order:

1. Survival reaction: death, incapacitation, unavoidable hazard.
2. Immediate explicit player command.
3. Actor's queued commands.
4. Group objective, formation, and resource policy.
5. Role doctrine: leader, scout, protector, support, ranged, or melee.
6. Personal autonomous behavior: needs, morale, self-preservation, idle work.

Each chosen action records its source and reason. This makes AI behavior
debuggable and gives the interface a truthful explanation instead of a guessed
status label.

## Implementation sequence

### 1. Recover the map

- Remove permanent outlines from interactable cells.
- Hide the command overlay until an object is selected.
- Hide location-inappropriate controls.
- Replace stacked sidebar cards with a single drawer in a later layout pass.

### 2. Normalize command data

- Define a common `ActionIntent` envelope with actor, verb, target,
  destination, item, timing, source, and request UUID.
- Define `ActionValidation` with allowed, reason, range, path, and predicted
  cost.
- Route hero, companions, NPCs, and monsters through the same validator and
  action resolver.

### 3. Persist actor activity

- Add `currentAction`, `queuedActions`, `stance`, and `lastDecision` to actor
  instances.
- Preserve the existing group order as the durable party objective.
- Emit action-started, action-completed, action-failed, and action-interrupted
  events.

### 4. Rebuild the interaction shell

- Compact party strip across the top.
- Context overlay on selection with primary verbs only.
- Optional drawer for details, inventory, health, relationships, objectives,
  and history.
- Right-click or a More button opens secondary contextual commands.
- Target preview shows path, range, line of sight, and affected area before
  commitment.

### 5. Add simulation controls

- Keep `applyRogueTurn` as the first deterministic beat resolver.
- Generalize it to collect one intent per due actor.
- Add pause, single step, follow-turn, normal run, and fast run schedulers.
- Pause on configured interrupts and keep animation separate from simulation.

### 6. Verify behavior

- Deterministic replay produces the same snapshots in every time mode.
- Every visible status has an authoritative state field or event source.
- Invalid actions explain themselves without consuming time.
- The same selection and commands work in dungeon, town, forest, and exterior
  maps.
- Keyboard-only and mouse-only flows can perform the same actions.

## Explicit non-goals for the first pass

- Do not add more permanent panels.
- Do not make continuous time until every actor can express one validated action
  in turn-based mode.
- Do not encode AI decisions in the browser; the client submits commands and
  displays authoritative state.
- Do not treat animation duration as game time.
