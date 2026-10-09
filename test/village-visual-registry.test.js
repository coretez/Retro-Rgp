import test from "node:test";
import assert from "node:assert/strict";
import {
  validateVillageVisualRegistry,
  villageVisualDescriptor,
} from "../src/village-visual-registry.js";

test("V0 registry contains every physical construction state", () => {
  assert.equal(validateVillageVisualRegistry(), true);
  for (const [stage, expected] of [
    ["planned", "designated"],
    ["material_delivered", "materials_delivered"],
    ["in_progress", "in_progress"],
  ]) {
    const visual = villageVisualDescriptor({
      tile: "village_construction",
      construction: { elementKind: "wall", stage, material: "timber" },
    });
    assert.equal(visual.visualFamily, "wall");
    assert.equal(visual.visualState, expected);
    assert.equal(visual.visualMaterial, "timber");
    assert.equal(visual.visualAssetKey, "procedural_wall");
    assert.equal(visual.visualRenderMode, "procedural");
    assert.equal(visual.visualAccepted, true);
    assert.equal(visual.visualFallback, false);
  }
});

test("V0 registry reports truthful fallbacks instead of inventing states", () => {
  const visual = villageVisualDescriptor({
    tile: "village_animal",
    animal: { status: "unknown_pose" },
  });
  assert.equal(visual.visualFamily, "animal");
  assert.equal(visual.visualState, "base");
  assert.equal(visual.visualFallback, true);
});

test("approved animal art is registered against systemic species", () => {
  const legacyV2 = new Set(["cow", "deer"]);
  for (const species of [
    "cow",
    "deer",
    "pig",
    "sheep",
    "dog",
    "chicken",
    "wolf",
    "wild_boar",
    "bear",
  ]) {
    const visual = villageVisualDescriptor({
      tile: "village_animal",
      animal: { species, status: "grazing" },
    });
    assert.equal(visual.visualFamily, "animal");
    assert.equal(visual.visualState, "idle");
    assert.equal(visual.visualMaterial, species);
    assert.equal(
      visual.visualAssetKey,
      `actor_${species}_${legacyV2.has(species) ? "v2" : "v1"}`,
    );
    assert.equal(visual.visualAccepted, true);
    assert.equal(visual.visualFallback, false);
  }
});

test("R8.3 domestic animal art distinguishes sex and juvenile stages", () => {
  for (const species of ["cow", "pig", "sheep", "dog", "chicken"])
    for (const [sex, ageStage, variant] of [
      ["female", "adult", "female"],
      ["male", "adult", "male"],
      ["female", "calf", "juvenile"],
    ]) {
      const visual = villageVisualDescriptor({
        tile: "village_animal",
        animal: { species, status: "grazing", sex, ageStage },
      });
      assert.equal(visual.visualAssetKey, `actor_${species}_${variant}_v3`);
      assert.equal(visual.visualAccepted, true);
    }
});

test("V1 connected fence state carries orientation and junction masks", () => {
  const vertical = villageVisualDescriptor({
      tile: "village_fence",
      connectionMask: 5,
      primitive: { kind: "fence", material: "timber" },
    }),
    corner = villageVisualDescriptor({
      tile: "village_fence",
      connectionMask: 6,
      primitive: { kind: "fence", material: "timber" },
    });
  assert.equal(vertical.visualOrientation, "vertical");
  assert.equal(vertical.visualConnectionMask, 5);
  assert.equal(corner.visualOrientation, "horizontal");
  assert.equal(corner.visualConnectionMask, 6);
  assert.equal(vertical.visualAccepted, true);
  assert.equal(corner.visualAccepted, true);
});

test("R4 low stone boundaries retain fence connectivity and material identity", () => {
  const visual = villageVisualDescriptor({
    tile: "village_fence",
    connectionMask: 10,
    primitive: {
      kind: "fence",
      material: "stone",
      boundaryProfile: "low_stone_wall",
    },
  });
  assert.equal(visual.visualFamily, "fence");
  assert.equal(visual.visualMaterial, "stone");
  assert.equal(visual.visualOrientation, "horizontal");
  assert.equal(visual.visualAccepted, true);
});

test("R6 emitted crop, stock, pawn, and damage states have accepted visuals", () => {
  const crop = villageVisualDescriptor({
      tile: "village_floor",
      cropPlot: { cropKind: "grain", stage: "growing" },
    }),
    stock = villageVisualDescriptor({
      tile: "village_material",
      material: { material: "timber" },
      stockpile: { itemKind: "timber_log" },
    }),
    pawn = villageVisualDescriptor({
      tile: "village_person",
      person: {
        workState: "working",
        currentAction: "Building wall section",
        carriedItem: { itemKind: "claw_hammer" },
      },
    }),
    damaged = villageVisualDescriptor({
      tile: "village_building",
      primitive: {
        kind: "wall",
        material: "timber",
        condition: 20,
        maxCondition: 100,
        lifecycleState: "damaged",
      },
    });
  assert.deepEqual(
    [crop.visualState, stock.visualState, pawn.visualState],
    ["growing", "stored", "carrying"],
  );
  assert.ok(
    [crop, stock, pawn, damaged].every((entry) => entry.visualAccepted),
  );
  assert.equal(damaged.visualDamageBand, "critical");
  assert.equal(damaged.visualLifecycle, "damaged");
});
