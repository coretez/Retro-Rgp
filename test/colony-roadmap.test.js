import test from "node:test";
import assert from "node:assert/strict";
import { applyRogueTurn, newRogueRun } from "../src/rogue-engine.js";
import { villageSimulationAudit } from "../src/village-audit.js";

const input = {
  requestId: "r1-founding-chain",
  runId: "ebf617aa-2f58-5738-ac47-a32c2ab04788",
  seed: "r1-founding-chain",
  heroName: "Mara",
  heroClass: "fighter",
  form: "hybrid",
  size: "small",
  levels: 3,
  scenario: "founding",
};

test("R1 hands-off founding chain plants food before private housing", () => {
  const state = newRogueRun(input),
    before = villageSimulationAudit(state),
    eventCounts = {};
  let plantingTick = null,
    housingTick = null;
  for (let tick = 0; tick < 12000; tick += 1) {
    const { events } = applyRogueTurn(state, { kind: "wait" });
    for (const event of events)
      eventCounts[event.type] = (eventCounts[event.type] ?? 0) + 1;
    if (
      plantingTick == null &&
      state.village.cropPlots?.some((plot) => plot.plantedAtTick != null)
    )
      plantingTick = state.tick;
    if (
      housingTick == null &&
      state.village.jobs.some((job) => job.jobType === "build_house")
    )
      housingTick = state.tick;
    if (
      plantingTick != null &&
      housingTick != null &&
      state.village.jobs.some((job) => job.jobType === "build_house")
    )
      break;
  }

  const after = villageSimulationAudit(state),
    yard = state.village.jobs.find(
      (job) => job.jobType === "build_lumber_yard",
    ),
    house = state.village.jobs.find((job) => job.jobType === "build_house");
  assert.ok(state.tick <= 12000);
  assert.ok(state.village.facilities.includes("survival_camp"));
  assert.ok(state.village.facilities.includes("lumber_yard"));
  assert.ok(plantingTick != null);
  assert.ok(housingTick != null);
  assert.ok(plantingTick <= housingTick);
  assert.equal(state.village.development.activePriority, "housing");
  assert.equal(yard.status, "completed");
  assert.ok(house);
  assert.ok(state.village.jobs.some((job) => job.jobType === "build_farmstead"));
  assert.ok(state.village.cropPlots.some((plot) => plot.plantedAtTick != null));
  assert.ok(eventCounts.animal_hunted >= 1);
  assert.ok(eventCounts.production_completed >= 1);
  assert.ok(
    state.village.stockpiles.every((stockpile) => stockpile.quantity >= 0),
  );
  assert.equal(after.materialTotals.hand_axe, before.materialTotals.hand_axe);
  assert.equal(
    after.materialTotals.crosscut_saw,
    before.materialTotals.crosscut_saw,
  );
  assert.equal(
    after.materialTotals.claw_hammer,
    before.materialTotals.claw_hammer,
  );
  assert.deepEqual(
    after.construction.sites.map((site) => site.key),
    ["lumber_yard", "farmstead", "founder_house_farmer"],
  );
  assert.equal(after.survival.temporarySleepingCapacity, 10);
  assert.equal(after.survival.assignedSleepingLocations, 10);
  assert.equal(eventCounts.construction_site_selected, 3);
  assert.ok(eventCounts.facility_completed >= 2);
});
