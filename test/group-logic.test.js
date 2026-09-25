import test from "node:test";
import assert from "node:assert/strict";
import {
  createGroup,
  groupView,
  issueGroupOrder,
  reconcileGroupLeadership,
} from "../src/group-logic.js";

const ids = {
  group: "11111111-1111-4111-8111-111111111111",
  definition: "22222222-2222-4222-8222-222222222222",
  captain: "33333333-3333-4333-8333-333333333333",
  scout: "44444444-4444-4444-8444-444444444444",
  guard: "55555555-5555-4555-8555-555555555555",
  enemy: "66666666-6666-4666-8666-666666666666",
};

const actors = [
  { id: ids.captain, name: "Captain", hp: 0, maxHp: 12 },
  { id: ids.scout, name: "Scout", hp: 8, maxHp: 8 },
  { id: ids.guard, name: "Guard", hp: 10, maxHp: 10 },
];

const group = () =>
  createGroup({
    id: ids.group,
    definitionId: ids.definition,
    name: "Lantern Company",
    side: "party",
    memberIds: [ids.captain, ids.scout, ids.guard],
    assignments: [
      { actorId: ids.captain, role: "leader", commandScore: 100 },
      { actorId: ids.scout, role: "scout", commandScore: 30 },
      { actorId: ids.guard, role: "frontline", commandScore: 50 },
    ],
    leaderId: ids.captain,
  });

test("group leadership remains stable until the leader is unavailable", () => {
  const value = group();
  assert.deepEqual(reconcileGroupLeadership(value, actors), {
    groupId: ids.group,
    previousLeaderId: ids.captain,
    leaderId: ids.guard,
    reason: "leader_unavailable",
    leadershipRevision: 1,
  });
  assert.equal(reconcileGroupLeadership(value, actors), null);
  assert.equal(value.leaderId, ids.guard);
});

test("only the current leader can issue a revisioned group order", () => {
  const value = group();
  reconcileGroupLeadership(value, actors);
  assert.throws(
    () =>
      issueGroupOrder(
        value,
        {
          issuerId: ids.scout,
          expectedCommandRevision: 0,
          objective: "hold",
          formation: "line",
          resourcePolicy: "conserve",
          retreatThreshold: 30,
        },
        4,
      ),
    (error) => error.code === "NOT_GROUP_LEADER",
  );
  const order = issueGroupOrder(
    value,
    {
      issuerId: ids.guard,
      expectedCommandRevision: 0,
      objective: "focus",
      formation: "wedge",
      targetId: ids.enemy,
      resourcePolicy: "spend",
      retreatThreshold: 20,
    },
    4,
  );
  assert.equal(order.commandRevision, 1);
  assert.equal(value.order.targetId, ids.enemy);
  assert.throws(
    () =>
      issueGroupOrder(
        value,
        {
          issuerId: ids.guard,
          expectedCommandRevision: 0,
          objective: "hold",
          formation: "line",
          resourcePolicy: "balanced",
          retreatThreshold: 20,
        },
        5,
      ),
    (error) => error.code === "GROUP_COMMAND_CONFLICT",
  );
});

test("group views include roles, health and authoritative order state", () => {
  const view = groupView(group(), actors);
  assert.deepEqual(view.memberIds, [ids.captain, ids.scout, ids.guard]);
  assert.equal(view.memberStatus.length, 3);
  assert.equal(view.memberStatus[0].alive, false);
  assert.equal(view.memberStatus[2].role, "frontline");
  assert.equal(view.order.objective, "explore");
});
