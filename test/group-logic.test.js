import test from "node:test";
import assert from "node:assert/strict";
import {
  createGroup,
  groupView,
  issueGroupOrder,
  reconcileGroupLeadership,
} from "../src/group-logic.js";

const actors = [
  { id: "captain", name: "Captain", hp: 0, maxHp: 12 },
  { id: "scout", name: "Scout", hp: 8, maxHp: 8 },
  { id: "guard", name: "Guard", hp: 10, maxHp: 10 },
];

const group = () =>
  createGroup({
    id: "party",
    name: "Lantern Company",
    side: "party",
    members: [
      { actorId: "captain", role: "leader", commandScore: 100 },
      { actorId: "scout", role: "scout", commandScore: 30 },
      { actorId: "guard", role: "frontline", commandScore: 50 },
    ],
    leaderId: "captain",
  });

test("group leadership remains stable until the leader is unavailable", () => {
  const value = group();
  assert.deepEqual(reconcileGroupLeadership(value, actors), {
    groupId: "party",
    previousLeaderId: "captain",
    leaderId: "guard",
    reason: "leader_unavailable",
    leadershipRevision: 1,
  });
  assert.equal(reconcileGroupLeadership(value, actors), null);
  assert.equal(value.leaderId, "guard");
});

test("only the current leader can issue a revisioned group order", () => {
  const value = group();
  reconcileGroupLeadership(value, actors);
  assert.throws(
    () =>
      issueGroupOrder(
        value,
        {
          issuerId: "scout",
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
      issuerId: "guard",
      expectedCommandRevision: 0,
      objective: "focus",
      formation: "wedge",
      targetId: "enemy-alpha",
      resourcePolicy: "spend",
      retreatThreshold: 20,
    },
    4,
  );
  assert.equal(order.commandRevision, 1);
  assert.equal(value.order.targetId, "enemy-alpha");
  assert.throws(
    () =>
      issueGroupOrder(
        value,
        {
          issuerId: "guard",
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
  assert.equal(view.members.length, 3);
  assert.equal(view.members[0].alive, false);
  assert.equal(view.members[2].role, "frontline");
  assert.equal(view.order.objective, "explore");
});
