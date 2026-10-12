import test from "node:test";
import assert from "node:assert/strict";
import {
  FOOD_PLAYBOOKS,
  VILLAGE_COMMANDS,
  commandExecutorKind,
  foodPlaybookAudit,
  validateVillagePlaybooks,
} from "../src/village-playbooks.js";
import { syncFoodPlaybookController } from "../src/village-playbook-controller.js";
import { createJob, transitionJob } from "../src/job-board.js";
import { newRogueRun, rogueUnityView } from "../src/rogue-engine.js";

const runInput = {
  requestId: "food-playbook-controller",
  runId: "3b63ad8c-ee84-4ef2-a028-64faad5c226a",
  seed: "food-playbook-controller",
  heroName: "Mara",
  heroClass: "fighter",
  form: "hybrid",
  size: "small",
  levels: 3,
  scenario: "founding",
};

function playbookJob(state, jobType, plan = {}) {
  return createJob(state, {
    jobType,
    name: `Test ${jobType}`,
    priority: 40,
    targetPosition: { x: 1, y: 1 },
    plan,
  }).job;
}

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

test("controller turns the current crop action into prioritized work", () => {
  const state = newRogueRun(runInput),
    job = playbookJob(state, "grow_grain", { cropAction: "prepare" });
  const controller = syncFoodPlaybookController(state);
  assert.equal(controller.focusPlaybookId, "grain_cycle");
  assert.equal(controller.focusCommandId, "prepare_crop_cell");
  assert.equal(job.plan.playbookCommandId, "prepare_crop_cell");
  assert.equal(job.basePriority, 146);
});

test("controller advances when the physical crop action advances", () => {
  const state = newRogueRun(runInput),
    prepare = playbookJob(state, "grow_grain", { cropAction: "prepare" });
  syncFoodPlaybookController(state);
  transitionJob(prepare, "cancelled", state.tick, "cell_prepared");
  const sow = playbookJob(state, "grow_grain", {
    cropAction: "sow",
    parallelSlot: 1,
  });
  const controller = syncFoodPlaybookController(state);
  assert.equal(controller.focusCommandId, "sow_crop_cell");
  assert.equal(sow.plan.playbookStepIndex, 1);
});

test("client view exposes the mayor's executable food order", () => {
  const state = newRogueRun(runInput);
  state.location = "village";
  playbookJob(state, "catch_fish");
  syncFoodPlaybookController(state);
  const view = rogueUnityView(state);
  assert.equal(view.foodPlaybooks.focusPlaybookId, "river_fishing");
  assert.equal(view.foodPlaybooks.focusCommandId, "catch_river_fish");
});
