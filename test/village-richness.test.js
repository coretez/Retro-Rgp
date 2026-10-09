import test from "node:test";
import assert from "node:assert/strict";
import {
  newRogueRun,
  parseRogueState,
  rogueUnityView,
  serializeRogueState,
} from "../src/rogue-engine.js";
import { villageMeaningAudit } from "../src/village-richness.js";

const input = {
  requestId: "r8-town-meaning",
  runId: "80635565-ec2d-54cf-a8cc-24d704894486",
  seed: "r8-town-meaning",
  heroName: "Mara",
  heroClass: "fighter",
  form: "hybrid",
  size: "small",
  levels: 3,
  scenario: "founding",
};

test("R8 meaning receipts cover every resident with causal evidence", () => {
  const state = newRogueRun(input),
    audit = villageMeaningAudit(state);
  assert.equal(audit.passed, true);
  assert.equal(audit.complete, false);
  assert.equal(audit.residentReceiptCount, 10);
  assert.equal(audit.residentReceiptCount, audit.residentCount);
  assert.ok(
    audit.residents.every(
      (resident) =>
        resident.householdId &&
        resident.primaryRole &&
        resident.consequence &&
        resident.evidence.some((item) => item.kind === "resident"),
    ),
  );
  assert.ok(!audit.gaps.includes("resident_age_and_life_stage_unmodeled"));
  assert.ok(!audit.gaps.includes("social_relationship_graph_unmodeled"));
  assert.ok(audit.residents.every((resident) => resident.ageYears >= 18));
  assert.ok(audit.gaps.includes("visitor_truth_harness_unmodeled"));
});

test("R8 meaning validation rejects a housed resident with false references", () => {
  const state = newRogueRun(input),
    resident = state.village.npcStates[0];
  resident.housingStatus = "housed";
  resident.householdId = "missing-household";
  resident.residenceId = "missing-residence";
  const audit = villageMeaningAudit(state);
  assert.equal(audit.passed, false);
  assert.ok(
    audit.violations.some((failure) =>
      failure.startsWith(
        `resident_household_reference_invalid:${resident.id}:`,
      ),
    ),
  );
});

test("R8 meaning validation rejects non-UUID receipt identities", () => {
  const state = newRogueRun(input);
  state.id = "not-a-uuid";
  const audit = villageMeaningAudit(state);
  assert.equal(audit.passed, false);
  assert.ok(audit.violations.includes("meaning_reference_not_uuid:not-a-uuid"));
});

test("R8.6 meaning validation rejects a relationship to a missing resident", () => {
  const state = newRogueRun(input), bond = state.village.relationships[0];
  bond.actorIds[1] = "00000000-0000-4000-8000-000000000099";
  const audit = villageMeaningAudit(state);
  assert.equal(audit.passed, false);
  assert.ok(
    audit.violations.includes(`relationship_actor_invalid:${bond.id}:${bond.actorIds[1]}`),
  );
});

test("R8 meaning receipts survive save/load and project to Unity", () => {
  const state = newRogueRun(input),
    before = villageMeaningAudit(state),
    restored = parseRogueState(serializeRogueState(state)),
    after = villageMeaningAudit(restored),
    view = rogueUnityView(restored);
  assert.deepEqual(after, before);
  assert.equal(view.villageMeaning.status, after.status);
  assert.equal(
    view.villageMeaning.residentReceiptCount,
    after.residentReceiptCount,
  );
  assert.equal(
    view.villageMeaning.buildingReceiptCount,
    after.buildingReceiptCount,
  );
  assert.equal(view.villageMeaning.residents.length, after.residents.length);
  assert.equal(view.villageMeaning.town.name, "Stonebridge");
});
