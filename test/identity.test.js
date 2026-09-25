import test from "node:test";
import assert from "node:assert/strict";
import { definitionId, isUuid, namedUuid } from "../src/identity.js";
import { newRogueRun } from "../src/rogue-engine.js";

const input = {
  seed: "identity-audit",
  heroName: "Mara",
  heroClass: "fighter",
  form: "hybrid",
  size: "small",
  levels: 3,
};

test("definition UUIDs are stable while instance UUIDs are unique", () => {
  const first = newRogueRun(input),
    second = newRogueRun(input);
  assert.ok(isUuid(first.id));
  assert.notEqual(first.id, second.id);
  assert.notEqual(first.hero.id, second.hero.id);
  assert.equal(first.hero.definitionId, second.hero.definitionId);
  assert.notEqual(first.hero.inventory[0].id, second.hero.inventory[0].id);
  assert.equal(
    first.hero.inventory[0].definitionId,
    second.hero.inventory[0].definitionId,
  );
  assert.equal(
    definitionId("item", "longsword"),
    definitionId("item", "longsword"),
  );
  assert.notEqual(
    definitionId("item", "longsword"),
    definitionId("item", "battleaxe"),
  );
  assert.equal(
    namedUuid(first.id, "legacy-instance:item:old-sword"),
    namedUuid(first.id, "legacy-instance:item:old-sword"),
  );
});

test("all runtime identity fields in a new universe are UUIDs", () => {
  const state = newRogueRun(input),
    failures = [];
  const visit = (value, path = "state") => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach((entry, index) => visit(entry, `${path}[${index}]`));
      return;
    }
    for (const [field, child] of Object.entries(value)) {
      if (
        (field === "id" || field.endsWith("Id")) &&
        typeof child === "string" &&
        !isUuid(child)
      )
        failures.push(`${path}.${field}=${child}`);
      visit(child, `${path}.${field}`);
    }
  };
  visit(state);
  assert.deepEqual(failures, []);
  assert.deepEqual(state.partyGroup.memberIds, [state.hero.id]);
  assert.equal(state.partyGroup.leaderId, state.hero.id);
});
