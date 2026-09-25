# MCP-native group logic

Status: first experimental slice on `codex/multi-character-experiment`.

Group strategy is authoritative server state. A UI may present choices and an
agent may recommend them, but neither owns an invisible tactical policy. Any MCP
client reading the same run receives the same group, leader, order and revision.

## Persisted group contract

Every player party and creature group has:

- a stable group ID, side and member roster;
- one leader or alpha plus a separate leadership revision;
- explicit member roles and command scores used only for succession;
- a revisioned order containing objective, formation, priority target or
  destination, resource policy and retreat threshold;
- a deterministic succession rule when the leader becomes unavailable.

Supported objectives are `explore`, `hold`, `advance`, `focus` and `retreat`.
Formations are `column`, `line`, `wedge` and `scatter`. Resource policy is
`conserve`, `balanced` or `spend`.

Only the current leader may replace an order. The caller must submit the current
`commandRevision`; stale commands fail rather than silently replacing a newer
decision. A command is a `rogue_act` intent, so it is persisted with the same
request replay protection, run revision and event history as every other turn.

`rogue_groups_get` returns the complete player-party record and only enemy groups
with currently visible members. It does not reveal hidden membership counts or
an unseen alpha.

## Behavior connected in this slice

Creature groups choose a stable alpha from their actual members. If that actor
falls, the highest-ranked living member succeeds it with a stable actor-ID
tie-break. Group-wide hold and retreat objectives alter individual movement.
The retreat threshold uses aggregate current HP against aggregate maximum HP,
so casualties can change the whole group's posture. Individual bestiary roles
still govern execution within that strategy.

## Deliberately next

Version 0.1 remains a one-character game. This slice establishes the server
contract before companions are added. Formation-slot movement, companion action
selection, focus-target execution, leader incapacitation in the player party,
automatic alpha strategy reassessment and UI command controls are not yet
implemented. They must build on this persisted contract rather than recreate
group logic in the HTML client.
