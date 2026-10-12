import test from "node:test";
import assert from "node:assert/strict";
import {
  FOOD_PLAYBOOKS,
  VILLAGE_COMMANDS,
  commandExecutorKind,
  foodPlaybookAudit,
  validateVillagePlaybooks,
} from "../src/village-playbooks.js";

test("every food playbook step has a real command function and executor", () => {
  const result = validateVillagePlaybooks();
  assert.deepEqual(result, { valid: true, errors: [] });
});

test("every command compiles to its registered runtime job", () => {
  for (const [id, command] of Object.entries(VILLAGE_COMMANDS)) {
    const compiled = command.execute({ source: "contract-test" });
    assert.equal(compiled.commandId, id);
    assert.equal(compiled.jobType, command.jobType);
    assert.ok(commandExecutorKind(compiled.jobType));
    assert.equal(compiled.input.source, "contract-test");
  }
});

test("playbook validation rejects prose-only unsupported commands", () => {
  const invalid = {
    bad_plan: {
      steps: [{ commandId: "magically_store_food", requires: [] }],
    },
  };
  const result = validateVillagePlaybooks(invalid);
  assert.equal(result.valid, false);
  assert.match(result.errors[0], /Unknown command magically_store_food/);
});

test("food audit covers the founding food command surface", () => {
  const audit = foodPlaybookAudit();
  assert.equal(audit.valid, true);
  assert.equal(audit.playbooks, Object.keys(FOOD_PLAYBOOKS).length);
  assert.equal(audit.commands, 17);
  assert.deepEqual(
    new Set(Object.values(audit.executors)),
    new Set(["life", "production", "transfer"]),
  );
});
