import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  applyRogueTurn,
  newRogueRun,
  parseRogueState,
  serializeRogueState,
} from "../src/rogue-engine.js";
import {
  createVillageRunTelemetry,
  diffVillageMaterialLedgers,
  evaluateVillageAudit,
  recordVillageRunTelemetry,
  villageRunTelemetryReport,
  villageSimulationAudit,
} from "../src/village-audit.js";
import { runCanonicalVillageProof } from "../src/village-proof.js";

const input = {
  requestId: "s0-audit",
  runId: "66fc7e4f-07fe-5d64-a58b-788b673800bc",
  seed: "s0-audit",
  heroName: "Mara",
  heroClass: "fighter",
  form: "hybrid",
  size: "small",
  levels: 3,
  scenario: "founding",
};

test("S0 audit deterministically accounts for residents and materials", () => {
  const left = newRogueRun(input),
    right = parseRogueState(serializeRogueState(left)),
    before = villageSimulationAudit(left);
  for (let tick = 0; tick < 500; tick += 1) {
    applyRogueTurn(left, { kind: "wait" });
    applyRogueTurn(right, { kind: "wait" });
  }
  const after = villageSimulationAudit(left);
  assert.deepEqual(after, villageSimulationAudit(right));
  assert.equal(after.accountedResidentCount, 10);
  assert.equal(after.residents.length, 10);
  assert.deepEqual(
    diffVillageMaterialLedgers(before, after),
    diffVillageMaterialLedgers(before, villageSimulationAudit(right)),
  );
  assert.equal("settlement_labor" in after.materials.stored, false);
  assert.equal(after.materialTotals.hand_axe, before.materialTotals.hand_axe);
  assert.equal(
    after.materialTotals.claw_hammer,
    before.materialTotals.claw_hammer,
  );
  assert.equal(
    after.materialTotals.crosscut_saw,
    before.materialTotals.crosscut_saw,
  );
  assert.ok(
    after.residents.every((resident) => Number.isFinite(resident.fatigue)),
  );
  assert.equal(after.survival.homelessResidents, 10);
  assert.equal(after.survival.housingCapacity, 0);
  assert.equal(after.survival.bedCapacity, 0);
  assert.equal(after.survival.temporarySleepingCapacity, 10);
  assert.equal(after.survival.assignedSleepingLocations, 10);
});

test("R0 fresh canonical founding runs produce the same audit", () => {
  const left = newRogueRun(input),
    right = newRogueRun(input);
  for (let tick = 0; tick < 500; tick += 1) {
    applyRogueTurn(left, { kind: "wait" });
    applyRogueTurn(right, { kind: "wait" });
  }
  assert.deepEqual(villageSimulationAudit(left), villageSimulationAudit(right));
});

test("R0 complete-run telemetry records work, lifecycle, and material activity", () => {
  const state = newRogueRun(input),
    telemetry = createVillageRunTelemetry(state);
  for (let tick = 0; tick < 500; tick += 1) {
    const result = applyRogueTurn(state, { kind: "wait" });
    recordVillageRunTelemetry(telemetry, state, result.events);
  }
  const report = villageRunTelemetryReport(telemetry);
  assert.equal(report.ticks, 500);
  assert.equal(report.actorTime.totalActorTicks, 5000);
  assert.equal(
    report.actorTime.purposefulTicks +
      report.actorTime.blockedTicks +
      report.actorTime.idleTicks,
    report.actorTime.totalActorTicks,
  );
  assert.ok(report.jobs.assignments.length > 0);
  assert.ok(report.events.job_reserved > 0);
  assert.ok(report.events.job_progress > 0);
  assert.ok(
    Object.values(report.production).some((quantity) => quantity > 0) ||
      Object.values(report.consumption).some((quantity) => quantity > 0),
  );
});

test("R8.1 one full day separates work, schedules, waiting, and contention", () => {
  const state = newRogueRun(input),
    telemetry = createVillageRunTelemetry(state);
  for (let tick = 0; tick < 2400; tick += 1) {
    const result = applyRogueTurn(state, { kind: "wait" });
    recordVillageRunTelemetry(telemetry, state, result.events);
  }
  const actorTime = villageRunTelemetryReport(telemetry).actorTime,
    detailed =
      actorTime.workingTicks +
      actorTime.scheduledTicks +
      actorTime.waitingTicks +
      actorTime.underemploymentTicks +
      actorTime.contentionTicks;
  assert.equal(actorTime.totalActorTicks, 24000);
  assert.equal(detailed, actorTime.totalActorTicks);
  assert.equal(actorTime.waitReasons.unexplained ?? 0, 0);
  assert.ok(actorTime.underemploymentTicks >= 0);
  assert.ok(actorTime.contentionTicks >= 0);
  assert.ok(
    Object.values(actorTime.byActor).every(
      (actor) =>
        actor.workingTicks +
          actor.scheduledTicks +
          actor.waitingTicks +
          actor.underemploymentTicks +
          actor.contentionTicks ===
        2400,
    ),
  );
});

test("R0 survival gate explains failures", () => {
  const audit = villageSimulationAudit(newRogueRun(input));
  audit.survival.minimumNeeds.hunger = 25;
  audit.survival.assignedSleepingLocations = 9;
  const result = evaluateVillageAudit(audit, {
    requiredFacilities: ["farmstead"],
  });
  assert.equal(result.passed, false);
  assert.deepEqual(
    result.failures.map((failure) => failure.code),
    [
      "survival_need_critical",
      "sleeping_assignments_missing",
      "facility_missing",
    ],
  );
});

test("R0 ten fresh runs match at every canonical checkpoint", () => {
  const proof = runCanonicalVillageProof();
  assert.equal(proof.passed, true);
  assert.equal(proof.runs, 10);
  assert.deepEqual(proof.checkpoints, [0, 100, 250, 500]);
  assert.deepEqual(proof.mismatches, []);
  assert.ok(proof.gateResults.every((result) => result.passed));
  assert.ok(
    proof.runSignatures.every(
      (signatures) => signatures.length === proof.checkpoints.length,
    ),
  );
});

test("R0 audit CLI exits nonzero when a required gate fails", () => {
  const result = spawnSync(
    process.execPath,
    [
      "scripts/audit-village-simulation.js",
      "--ticks",
      "1",
      "--require-facility",
      "farmstead",
    ],
    { cwd: process.cwd(), encoding: "utf8" },
  );
  const output = JSON.parse(result.stdout);
  assert.equal(result.status, 1);
  assert.equal(output.gate.passed, false);
  assert.ok(
    output.gate.failures.some(
      (failure) =>
        failure.code === "facility_missing" && failure.facility === "farmstead",
    ),
  );
});
