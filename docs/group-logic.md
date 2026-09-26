# MCP-native group logic

Status: first experimental slice on `codex/multi-character-experiment`.

Group strategy is authoritative server state. A UI may present choices and an
agent may recommend them, but neither owns an invisible tactical policy. Any MCP
client reading the same run receives the same group, leader, order and revision.

## Persisted group contract

Every player party and creature group has:

- an instance UUID, a stable definition UUID, side and `memberIds` containing
  only actor UUID references;
- separate role assignments and a derived `memberStatus` read model; the actor
  sheet remains authoritative;
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

The player group now contains four independent actor instances: the selected
leader plus Niklas Ried, Adelheid Bauer and Konrad Falk. Its movement mode is
`follow_leader`. A successful leader step moves each available companion toward
the position just vacated by the actor ahead of them. Reversals resolve without
placing two actors in one cell. Level transitions place the complete party near
the entrance, and legacy solo saves acquire deterministic companion instances.

Creature groups choose a stable alpha from their actual members. If that actor
falls, the highest-ranked living member succeeds it with a stable actor-ID
tie-break. Group-wide hold and retreat objectives alter individual movement.
The retreat threshold uses aggregate current HP against aggregate maximum HP,
so casualties can change the whole group's posture. Individual bestiary roles
still govern execution within that strategy.

Generated inhabitants can now appear as spatial packs. Pack members begin in
the same room, share a group record and retain individual actor UUIDs.

The party also has persisted tactical state: its last facing, anchor, deployment
tick and one of `travel`, `deployed` or `engaged`. A leader step establishes
facing and returns the group to travel. Waiting or issuing an order deploys the
companions; sighting an enemy changes the posture to engaged. Saves from before
this addition migrate to a north-facing travel posture.

Column, line, wedge and scatter now have role-specific grid slots relative to
the leader's position and facing. A blocked ideal slot falls back to the nearest
reachable free cell. Members move at most one cell on their activation, reserve
distinct cells through normal occupancy and never teleport into formation.

Every conscious companion now receives one deterministic combat activation
after the leader and before the enemy side. Niklas fights in melee, Adelheid
fights in melee or spends one of two support heals on a badly wounded ally, and
Konrad attacks at range. All attacks use the shared d20-versus-AC, critical-hit
and typed-damage resolver.

Companions obey the authoritative group objective. `focus` prioritizes the
ordered enemy UUID, `hold` permits attacks but suppresses pursuit, and `retreat`
suppresses engagement. Monster members select their own nearest visible living
party target unless their group carries a valid focus target. This distributes
pressure spatially across the formation rather than treating the leader as the
only combatant.

Within a deployment, Niklas is the closing melee element, Adelheid preserves
support access and Konrad maintains the rear ranged slot. Targets engaged with
any living party member rank ahead of isolated targets, followed by wounded
targets and distance. A pressured rear guard withdraws toward its slot instead
of entering a melee scrum. The HTML Party card issues revisioned formation and
Explore, Hold or Advance orders through the same server contract as MCP clients.

Backline protection is reciprocal. A ranged character with an enemy within two
squares selects a legal step that strictly increases its minimum distance from
all visible threats, preferring a cell near its formation slot and leader when
equally safe. Melee companions rank enemies within two squares of ranged or
support members above ordinary engaged targets and close with them using the
`protect_ranged_ally` movement reason. An explicit leader focus order remains
authoritative and overrides this default target priority.

An incapacitated companion remains an actor and party member, becomes
unconscious, stops acting and can be restored by support healing. Leadership
succession sees the same status immediately. Only the player hero exposes death
saves as interactive turns in this slice.

## Deliberately next

Automatic enemy-alpha strategy reassessment, companion death-save policy,
retreat-destination controls in the HTML interface and player control after
leader incapacitation are not yet implemented. They must build on this
persisted contract rather than recreate group logic in the HTML client.
