import { requireRule as check } from "./dice.js";

export const GROUP_FORMATIONS = ["column", "line", "wedge", "scatter"];
export const GROUP_OBJECTIVES = [
  "explore",
  "hold",
  "advance",
  "focus",
  "retreat",
];
export const GROUP_RESOURCE_POLICIES = ["conserve", "balanced", "spend"];

const living = (actor) => actor && actor.hp > 0 && !actor.dead;

export function createGroup({
  id,
  name,
  side,
  members,
  leaderId,
  formation = "column",
  objective = "explore",
  resourcePolicy = "balanced",
  retreatThreshold = 25,
}) {
  check(id && name, "INVALID_GROUP", "A group requires an id and name.");
  check(
    ["party", "enemy"].includes(side),
    "INVALID_GROUP_SIDE",
    "A group side must be party or enemy.",
  );
  check(
    members?.length,
    "EMPTY_GROUP",
    "A group requires at least one member.",
  );
  check(
    members.some((member) => member.actorId === leaderId),
    "INVALID_GROUP_LEADER",
    "The leader must be a member of the group.",
  );
  check(
    GROUP_FORMATIONS.includes(formation),
    "INVALID_FORMATION",
    "Unknown group formation.",
  );
  check(
    GROUP_OBJECTIVES.includes(objective),
    "INVALID_GROUP_OBJECTIVE",
    "Unknown group objective.",
  );
  check(
    GROUP_RESOURCE_POLICIES.includes(resourcePolicy),
    "INVALID_RESOURCE_POLICY",
    "Unknown group resource policy.",
  );
  check(
    Number.isInteger(retreatThreshold) &&
      retreatThreshold >= 0 &&
      retreatThreshold <= 100,
    "INVALID_RETREAT_THRESHOLD",
    "retreatThreshold must be an integer from 0 to 100.",
  );
  return {
    id,
    name,
    side,
    members: members.map((member) => ({
      actorId: member.actorId,
      role: member.role ?? "member",
      commandScore: member.commandScore ?? 0,
    })),
    leaderId,
    leadershipRevision: 0,
    commandRevision: 0,
    order: {
      objective,
      formation,
      targetId: null,
      destination: null,
      resourcePolicy,
      retreatThreshold,
      issuedBy: leaderId,
      issuedAtTick: 0,
    },
  };
}

export function reconcileGroupLeadership(group, actors) {
  const byId = new Map(actors.map((actor) => [actor.id, actor]));
  if (!group.members.some((member) => byId.has(member.actorId))) return null;
  if (living(byId.get(group.leaderId))) return null;
  const successor = group.members
    .filter((member) => living(byId.get(member.actorId)))
    .sort(
      (a, b) =>
        b.commandScore - a.commandScore || a.actorId.localeCompare(b.actorId),
    )[0];
  const previousLeaderId = group.leaderId;
  const leaderId = successor?.actorId ?? null;
  if (previousLeaderId === leaderId) return null;
  group.leaderId = leaderId;
  group.leadershipRevision += 1;
  if (group.order.issuedBy === previousLeaderId)
    group.order.issuedBy = group.leaderId;
  return {
    groupId: group.id,
    previousLeaderId,
    leaderId: group.leaderId,
    reason: successor ? "leader_unavailable" : "no_living_members",
    leadershipRevision: group.leadershipRevision,
  };
}

export function issueGroupOrder(group, command, tick) {
  check(
    group.leaderId,
    "GROUP_HAS_NO_LEADER",
    "The group has no living leader.",
  );
  check(
    command.issuerId === group.leaderId,
    "NOT_GROUP_LEADER",
    "Only the current group leader may issue an order.",
    { leaderId: group.leaderId, issuerId: command.issuerId },
  );
  check(
    command.expectedCommandRevision === group.commandRevision,
    "GROUP_COMMAND_CONFLICT",
    "Read the current group before replacing its order.",
    {
      expectedCommandRevision: command.expectedCommandRevision,
      actualCommandRevision: group.commandRevision,
    },
  );
  const next = {
    ...group.order,
    objective: command.objective,
    formation: command.formation,
    targetId: command.targetId ?? null,
    destination: command.destination ? { ...command.destination } : null,
    resourcePolicy: command.resourcePolicy,
    retreatThreshold: command.retreatThreshold,
    issuedBy: command.issuerId,
    issuedAtTick: tick,
  };
  check(
    GROUP_OBJECTIVES.includes(next.objective),
    "INVALID_GROUP_OBJECTIVE",
    "Unknown group objective.",
  );
  check(
    GROUP_FORMATIONS.includes(next.formation),
    "INVALID_FORMATION",
    "Unknown group formation.",
  );
  check(
    GROUP_RESOURCE_POLICIES.includes(next.resourcePolicy),
    "INVALID_RESOURCE_POLICY",
    "Unknown group resource policy.",
  );
  check(
    Number.isInteger(next.retreatThreshold) &&
      next.retreatThreshold >= 0 &&
      next.retreatThreshold <= 100,
    "INVALID_RETREAT_THRESHOLD",
    "retreatThreshold must be an integer from 0 to 100.",
  );
  check(
    next.objective !== "focus" || next.targetId,
    "GROUP_TARGET_REQUIRED",
    "A focus order requires a targetId.",
  );
  check(
    next.objective !== "retreat" || next.destination,
    "GROUP_DESTINATION_REQUIRED",
    "A retreat order requires a destination.",
  );
  group.commandRevision += 1;
  group.order = next;
  return { ...structuredClone(next), commandRevision: group.commandRevision };
}

export function groupView(group, actors) {
  const byId = new Map(actors.map((actor) => [actor.id, actor]));
  return {
    id: group.id,
    name: group.name,
    side: group.side,
    leaderId: group.leaderId,
    leadershipRevision: group.leadershipRevision,
    commandRevision: group.commandRevision,
    order: structuredClone(group.order),
    members: group.members.map((member) => {
      const actor = byId.get(member.actorId);
      return {
        ...member,
        name: actor?.name ?? member.actorId,
        alive: living(actor),
        hp: actor?.hp ?? null,
        maxHp: actor?.maxHp ?? null,
      };
    }),
  };
}
