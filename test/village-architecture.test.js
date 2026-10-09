import test from "node:test";
import assert from "node:assert/strict";
import {
  assessConstructionSite,
  assessHousePlan,
  BED_TYPES,
  buildingAccess,
  controlConstructionProject,
  constructionSiteCells,
  constructionElements,
  constructionMaterialRequirements,
  damageConstructionEntity,
  deconstructConstructionEntity,
  deriveVillageArchitecture,
  designHouse,
  findConstructionSite,
  formalizeStoneBoundary,
  FOUNDER_HOUSE_PLOTS,
  HOUSE_ARCHETYPES,
  markVillageArchitectureDirty,
  orientHousePlan,
  repairConstructionEntity,
  specialistFacilityPlan,
  upgradeMissingHouseExits,
} from "../src/village-architecture.js";
import { foundingFacilityPlan } from "../src/village-development.js";
import {
  boundaryBuildProfile,
  treeWoodYield,
  WOOD_BUILD_COSTS,
} from "../src/village-materials.js";
import {
  applyRogueTurn,
  newRogueRun,
  parseRogueState,
  rogueUnityView,
  serializeRogueState,
} from "../src/rogue-engine.js";
import { createJob } from "../src/job-board.js";
import { ensureVillageFoodSystem } from "../src/village-food.js";

const architectureInput = {
  requestId: "r3-architecture",
  runId: "87fd1741-44ea-5ead-9a4c-4de75a886083",
  seed: "r3-architecture",
  heroName: "Mara",
  heroClass: "fighter",
  form: "hybrid",
  size: "small",
  levels: 3,
  scenario: "founding",
};

// function-length-exempt: template -- test fixture construction
function physicalFacilityState() {
  const state = newRogueRun(architectureInput),
    site = {
      key: "proof_yard",
      name: "Proof yard",
      x: 0,
      y: 0,
      w: 3,
      h: 3,
      wallMaterial: "timber",
      door: { x: 1, y: 2, material: "wood" },
      floors: [
        {
          key: "proof_floor",
          x: 1,
          y: 1,
          width: 1,
          height: 1,
          material: "timber",
        },
      ],
      roofs: [
        {
          key: "proof_roof",
          x: 1,
          y: 1,
          width: 1,
          height: 1,
          material: "timber",
        },
      ],
    },
    elements = [
      {
        id: "4d1ec488-5baa-5fa2-9f88-24a39069eb01",
        key: "door_1",
        kind: "door",
        status: "complete",
        materialRequired: 2,
        position: { x: 1, y: 2 },
      },
      {
        id: "4d1ec488-5baa-5fa2-9f88-24a39069eb02",
        key: "wall_1",
        kind: "wall",
        status: "complete",
        materialRequired: 5,
        position: { x: 0, y: 0 },
      },
      {
        id: "4d1ec488-5baa-5fa2-9f88-24a39069eb03",
        key: "floor_proof_floor",
        kind: "floor",
        status: "complete",
        materialRequired: 3,
        position: { x: 1, y: 1 },
        width: 1,
        height: 1,
      },
      {
        id: "4d1ec488-5baa-5fa2-9f88-24a39069eb04",
        key: "roof_proof_roof",
        kind: "roof",
        status: "complete",
        materialRequired: 2,
        position: { x: 1, y: 1 },
        width: 1,
        height: 1,
        supportIds: [
          "4d1ec488-5baa-5fa2-9f88-24a39069eb01",
          "4d1ec488-5baa-5fa2-9f88-24a39069eb02",
        ],
      },
    ],
    job = createJob(state, {
      jobType: "build_lumber_yard",
      name: "Build proof yard",
      targetId: elements[0].id,
      targetPosition: { x: 1, y: 2 },
      plan: {
        construction: site,
        constructionWork: { elements },
        facilityKey: "lumber_yard",
      },
    }).job;
  state.village.doors.push({
    id: elements[0].id,
    entityType: "door",
    objectKind: "door",
    buildingKey: site.key,
    x: 1,
    y: 2,
    material: "wood",
    materialQuantity: 2,
    state: "open",
    lifecycleState: "complete",
    condition: 100,
    maxCondition: 100,
  });
  state.village.constructionPrimitives.push({
    id: elements[1].id,
    entityType: "wall",
    kind: "wall",
    projectId: job.id,
    projectKey: site.key,
    material: "timber",
    materialQuantity: 5,
    state: "complete",
    lifecycleState: "complete",
    condition: 100,
    maxCondition: 100,
    position: { x: 0, y: 0 },
    width: 1,
    height: 1,
  });
  for (const element of elements.slice(2))
    state.village.constructionPrimitives.push({
      id: element.id,
      entityType: element.kind,
      kind: element.kind,
      projectId: job.id,
      projectKey: site.key,
      material: "timber",
      materialQuantity: element.materialRequired,
      state: "complete",
      lifecycleState: "complete",
      condition: 100,
      maxCondition: 100,
      position: { ...element.position },
      width: element.width,
      height: element.height,
      supportIds: element.supportIds,
    });
  markVillageArchitectureDirty(state);
  deriveVillageArchitecture(state);
  return {
    state,
    job,
    wallId: elements[1].id,
    roofId: elements[3].id,
  };
}

test("M-11.1 wood yields and building costs use a stable wood-unit scale", () => {
  assert.equal(treeWoodYield("pine"), 27);
  assert.equal(treeWoodYield("maple"), 27);
  assert.equal(treeWoodYield("birch"), 27);
  assert.equal(treeWoodYield("oak"), 46);
  assert.equal(treeWoodYield("elm"), 32);
  assert.deepEqual(WOOD_BUILD_COSTS, {
    fence: 1,
    wall: 5,
    door: 25,
    gate: 25,
    floor: 3,
    roof: 2,
  });
});

test("R4 formal farms can replace timber rails with low stone boundary walls", () => {
  const enclosure = formalizeStoneBoundary({
      key: "formal_field",
      purpose: "field",
      x: 10,
      y: 10,
      w: 6,
      h: 6,
      gate: { x: 15, y: 13 },
    }),
    site = { x: 0, y: 0, w: 2, h: 2, enclosures: [enclosure] },
    elements = constructionElements(site),
    fences = elements.filter((element) => element.kind === "fence"),
    gate = elements.find((element) => element.kind === "gate"),
    wall = elements.find((element) => element.kind === "wall"),
    materials = constructionMaterialRequirements(site);
  assert.ok(fences.length > 0);
  assert.ok(fences.every((element) => element.material === "stone"));
  assert.ok(
    fences.every((element) => element.boundaryProfile === "low_stone_wall"),
  );
  assert.ok(fences.every((element) => element.heightFeet === 2.5));
  assert.ok(
    fences.every((element) => element.materialRequired < wall.materialRequired),
  );
  assert.ok(fences.every((element) => element.laborRequired < 10));
  assert.equal(gate.material, "timber");
  assert.equal(
    materials.find((entry) => entry.key === "quarry_stone").quantity,
    fences.length * boundaryBuildProfile("stone").materialUnits,
  );
});

test("R4 masonry-town policy schedules low stone farm boundaries", () => {
  const plan = newRogueRun(architectureInput).village.development.masterPlan,
    policy = plan.settlementEvolution.boundaryPolicy;
  assert.equal(policy.founding_village, "timber_rail");
  assert.equal(policy.masonry_town, "low_stone_wall");
  assert.equal(policy.replacementGate, "quarry_and_food_surplus");
  assert.ok(
    plan.householdHoldings.every(
      (holding) => holding.boundaryUpgrade.profile === "low_stone_wall",
    ),
  );
});

test("R8 household cottages are compact without losing required rooms", () => {
  const plan = designHouse(2);
  assert.equal(plan.assessment.valid, true);
  assert.deepEqual(
    { width: plan.width, height: plan.height },
    { width: 10, height: 8 },
  );
  assert.ok(plan.assessment.usableArea >= 30);
  assert.deepEqual(
    plan.zones.map((zone) => zone.key),
    ["common", "sleeping"],
  );
  assert.equal(plan.secondaryDoors.length, 1);
  assert.equal(
    constructionElements({
      ...plan,
      x: 0,
      y: 0,
      w: plan.width,
      h: plan.height,
    }).filter((element) => element.kind === "door").length,
    2,
  );
});

test("R1 a house faces its connected path and retains an opposite escape", () => {
  const plot = { x: -34, y: 35 },
    plan = orientHousePlan(designHouse(2), plot, ({ x, y }) =>
      x === -29 && y < 35 ? "road_dirt" : "outdoor_grass",
    );
  assert.deepEqual(plan.door, { x: 5, y: 0 });
  assert.deepEqual(plan.secondaryDoors, [{ x: 5, y: 7 }]);
  assert.equal(plan.assessment.valid, true);
});

test("R1 the architect scouts and names all three founding family homes", () => {
  const state = newRogueRun(architectureInput);
  state.village.facilities.push("lumber_yard");
  applyRogueTurn(state, { kind: "wait" });
  const sites = state.village.development.constructionSites.filter(
      (site) => site.housingSurveyStatus === "scouted",
    ),
    layout = state.village.development.masterPlan.housingLayout;
  assert.equal(sites.length, 3);
  assert.equal(layout.length, 3);
  assert.deepEqual(
    new Set(sites.map((site) => site.name)),
    new Set([
      "Weiss-Voss family farmhouse",
      "Brand-Venn family cottage",
      "Holt-Eder family cottage",
    ]),
  );
  assert.equal(new Set(sites.map((site) => site.plannedHouseholdId)).size, 3);
  assert.ok(sites.every((site) => site.secondaryDoors.length === 1));
  const view = rogueUnityView(state);
  assert.ok(
    view.map.cells.some((cell) =>
      cell.objectName?.includes("Brand-Venn family cottage"),
    ),
  );
});

test("R8 an operational field camp cannot bypass unfinished housing", () => {
  const state = newRogueRun({
    ...architectureInput,
    scenario: "founding",
    worldGeneration: "regional_v3",
  });
  state.village.development.masterPlan.regionalContext.fieldCamps.push({
    id: "premature-camp",
    status: "operational",
  });
  applyRogueTurn(state, { kind: "wait" });
  assert.equal(state.village.facilities.includes("housing"), false);
  assert.ok(
    !state.village.jobs.some((job) =>
      ["prospect_rock", "quarry_stone"].includes(job.jobType),
    ),
  );
});

test("R1 legacy one-door homes reopen to build a road entrance", () => {
  const state = newRogueRun(architectureInput);
  state.village.facilities.push("lumber_yard");
  state.village.facilities.push("farmstead");
  ensureVillageFoodSystem(state);
  state.village.cropPlots[0].stage = "growing";
  state.village.stockpiles.find(
    (stockpile) => stockpile.key === "lumber_yard_lumber",
  ).quantity = 500;
  applyRogueTurn(state, { kind: "wait" });
  const job = state.village.jobs.find((candidate) =>
    candidate.plan?.construction?.key?.startsWith("founder_house_"),
  );
  const site = job.plan.construction,
    roadDoor = { ...site.door },
    oldDoor = { ...site.secondaryDoors[0] },
    roadElement = job.plan.constructionWork.elements.find(
      (element) => element.kind === "door" && element.position.y === roadDoor.y,
    );
  site.door = oldDoor;
  delete site.secondaryDoors;
  Object.assign(roadElement, {
    kind: "wall",
    materialRequired: WOOD_BUILD_COSTS.wall,
    laborRequired: 10,
  });
  const changed = upgradeMissingHouseExits(state);
  assert.equal(changed, 1);
  assert.equal(site.door.y, site.y);
  assert.deepEqual(site.secondaryDoors, [oldDoor]);
  assert.equal(
    job.plan.constructionWork.elements.filter(
      (element) => element.kind === "door",
    ).length,
    2,
  );
  assert.equal(job.reason, "mandatory_exit_retrofit");
});

test("R8 every founder household has a reserved growth-capable cottage", () => {
  const plans = FOUNDER_HOUSE_PLOTS.map(() => designHouse(2)),
    beds = plans.flatMap((plan) =>
      plan.fixtures.filter((fixture) => fixture.role === "bed"),
    ),
    capacity = beds.reduce(
      (total, bed) => total + (bed.sleepingCapacity ?? 0),
      0,
    );
  assert.equal(plans.length, 10);
  assert.equal(beds.length, 20);
  assert.equal(capacity, 20);
  assert.ok(
    beds.every(
      (bed) => bed.width >= 1 && bed.height >= 2 && bed.sleepingCapacity === 1,
    ),
  );
  assert.ok(capacity >= 10);
});

test("R1 every constructed founding and specialist building plan has a roof", () => {
  for (const projectKey of ["lumber_yard", "farmstead", "communal_kitchen"]) {
    const plan = foundingFacilityPlan(projectKey),
      roofs = constructionElements(plan).filter(
        (element) => element.kind === "roof",
      );
    assert.ok(plan.roofs?.length > 0, `${projectKey} has no roof plan`);
    assert.ok(roofs.length > 0, `${projectKey} has no roof work`);
  }
  const forge = specialistFacilityPlan("specialist_forge");
  assert.ok(forge.roofs.length > 0);
  assert.ok(
    constructionElements(forge).some((element) => element.kind === "roof"),
  );
});

test("R4 the farmstead barn physically stores grain seed produce and fodder", () => {
  const barn = foundingFacilityPlan("farmstead"),
    roles = new Set(barn.fixtures.map((fixture) => fixture.role));
  assert.deepEqual(
    roles,
    new Set([
      "grain_storage",
      "seed_storage",
      "fodder_storage",
      "produce_storage",
    ]),
  );
  assert.ok(barn.storageArea.width * barn.storageArea.height >= 20);
  assert.ok(
    constructionElements(barn).filter((element) => element.kind === "fixture")
      .length >= 4,
  );
});

test("R1 a forge is masonry and draws its shell from quarried stone", () => {
  const forge = specialistFacilityPlan("specialist_forge"),
    elements = constructionElements(forge),
    shell = elements.filter((element) =>
      ["wall", "floor", "roof"].includes(element.kind),
    );
  assert.equal(forge.fireSafetyClass, "masonry_hot_work");
  assert.ok(shell.length > 0);
  assert.ok(shell.every((element) => element.material === "stone"));
  assert.equal(
    elements.find((element) => element.kind === "door").material,
    "wood",
  );
});

test("R4 the fishing hut is roofed and contains the complete net workflow", () => {
  const hut = specialistFacilityPlan("specialist_fishing_hut"),
    roles = new Set(hut.fixtures.map((fixture) => fixture.role)),
    elements = constructionElements(hut);
  assert.ok(elements.some((element) => element.kind === "roof"));
  assert.ok(elements.filter((element) => element.kind === "door").length >= 2);
  for (const role of [
    "netting_bench",
    "net_rack",
    "fish_cleaning_table",
    "fish_storage",
  ])
    assert.ok(roles.has(role), role);
});

test("R8.3 the architect plans four compatible animal housing yards", () => {
  const stable = specialistFacilityPlan("specialist_stable"),
    enclosures = stable.enclosures,
    elements = constructionElements(stable);
  assert.deepEqual(
    enclosures.map((site) => site.housing),
    ["pig_pen", "sheepfold", "coop", "kennel"],
  );
  assert.ok(enclosures.every((site) => site.purpose === "animal_housing"));
  assert.ok(enclosures.every((site) => site.clearance >= 1));
  assert.ok(
    enclosures.every((site) => buildingAccess({ ...site, door: site.gate })),
  );
  assert.equal(elements.filter((item) => item.kind === "gate").length, 4);
  assert.ok(elements.filter((item) => item.kind === "fence").length > 80);
});

test("R1 the lumber workshop contains visible production equipment", () => {
  const plan = foundingFacilityPlan("lumber_yard"),
    roles = plan.fixtures.map((fixture) => fixture.role),
    fixtureWork = constructionElements(plan).filter(
      (element) => element.kind === "fixture",
    );
  assert.deepEqual(roles, ["sawbench", "tool_rack", "lumber_rack"]);
  assert.equal(fixtureWork.length, 3);
  assert.ok(
    fixtureWork.every(
      (element) =>
        element.position.x > plan.x &&
        element.position.x < plan.x + plan.w - 1 &&
        element.position.y > plan.y &&
        element.position.y < plan.y + plan.h - 1,
    ),
  );
});

test("M-11.1 founding architecture preserves both principal road lanes", () => {
  const house = designHouse(4),
    sites = [
      foundingFacilityPlan("lumber_yard"),
      foundingFacilityPlan("farmstead"),
      ...FOUNDER_HOUSE_PLOTS.map((plot, index) => ({
        key: `founder_house_${index + 1}`,
        ...plot,
        w: house.width,
        h: house.height,
      })),
    ],
    terrainAt = ({ x, y }) =>
      y === 11 || y === 12 || x === 19 || x === 20
        ? "road_stone"
        : "outdoor_grass";
  for (const site of sites)
    assert.deepEqual(assessConstructionSite(site, terrainAt), {
      valid: true,
      conflicts: [],
    });
});

test("M-11.1 an architect rejects any building footprint on a road", () => {
  const assessment = assessConstructionSite(
    { x: 18, y: 4, w: 4, h: 4 },
    ({ x }) => (x === 19 || x === 20 ? "road_stone" : "outdoor_grass"),
  );
  assert.equal(assessment.valid, false);
  assert.ok(assessment.conflicts.every(({ tile }) => tile === "road_stone"));
});

test("R8 architect rejects exposed regional rock as a building site", () => {
  const assessment = assessConstructionSite(
    { x: 4, y: 4, w: 3, h: 3 },
    ({ x, y }) => (x === 5 && y === 5 ? "outdoor_rock" : "outdoor_grass"),
  );
  assert.equal(assessment.valid, false);
  assert.ok(assessment.conflicts.some(({ tile }) => tile === "outdoor_rock"));
});

test("R1 architect deterministically relocates a conflicted construction site", () => {
  const preferred = {
      key: "workshop",
      x: 0,
      y: 0,
      w: 4,
      h: 4,
      door: { x: 1, y: 3 },
    },
    terrainAt = ({ x, y }) =>
      x === 0 && y === 0 ? "outdoor_water" : "outdoor_grass",
    left = findConstructionSite(preferred, terrainAt, { maxRadius: 4 }),
    right = findConstructionSite(preferred, terrainAt, { maxRadius: 4 });
  assert.deepEqual(left, right);
  assert.deepEqual(left.offset, { x: 2, y: 0 });
  assert.deepEqual({ x: left.site.x, y: left.site.y }, { x: 2, y: 0 });
  assert.deepEqual(left.site.door, { x: 3, y: 3 });
  assert.ok(left.rejections.length > 3);
});

test("R8 architect relocates a field camp until its door is town-reachable", () => {
  const preferred = {
      key: "field_camp",
      x: 0,
      y: 0,
      w: 3,
      h: 3,
      door: { x: 1, y: 2 },
    },
    result = findConstructionSite(preferred, () => "outdoor_grass", {
      maxRadius: 4,
      candidateFilter: (site) => site.door.x >= 3,
    });
  assert.deepEqual(result.offset, { x: 2, y: 0 });
  assert.equal(result.site.door.x, 3);
  assert.ok(
    result.rejections.some((rejection) =>
      rejection.conflicts.some(({ tile }) => tile === "unreachable"),
    ),
  );
});

test("R1 relocating a farm barn keeps surveyed field boundaries fixed", () => {
  const preferred = foundingFacilityPlan("farmstead"),
    result = findConstructionSite(
      preferred,
      ({ x, y }) =>
        x === preferred.x && y === preferred.y
          ? "village_building"
          : "outdoor_grass",
      { maxRadius: 4, fixedEnclosurePurposes: ["field"] },
    ),
    preferredFields = preferred.enclosures.filter(
      (enclosure) => enclosure.purpose === "field",
    ),
    selectedFields = result.site.enclosures.filter(
      (enclosure) => enclosure.purpose === "field",
    ),
    preferredPasture = preferred.enclosures.find(
      (enclosure) => !enclosure.purpose,
    ),
    selectedPasture = result.site.enclosures.find(
      (enclosure) => !enclosure.purpose,
    );
  assert.notDeepEqual(
    { x: result.site.x, y: result.site.y },
    { x: preferred.x, y: preferred.y },
  );
  assert.deepEqual(selectedFields, preferredFields);
  assert.deepEqual(
    {
      x: selectedPasture.x - preferredPasture.x,
      y: selectedPasture.y - preferredPasture.y,
    },
    result.offset,
  );
});

test("R1 architect reserves complete plots against later projects", () => {
  const preferred = {
      key: "second",
      x: 0,
      y: 0,
      w: 3,
      h: 3,
      door: { x: 1, y: 2 },
    },
    reservedSites = [
      {
        key: "first",
        x: 0,
        y: 0,
        w: 3,
        h: 3,
        door: { x: 1, y: 2 },
      },
    ],
    result = findConstructionSite(preferred, () => "outdoor_grass", {
      reservedSites,
      maxRadius: 6,
    });
  assert.ok(
    result.site.x + result.site.w <= preferred.x - 1 ||
      result.site.x >= preferred.x + preferred.w + 1 ||
      result.site.y + result.site.h <= preferred.y - 1 ||
      result.site.y >= preferred.y + preferred.h + 1,
  );
  assert.ok(
    result.rejections.some((rejection) =>
      rejection.conflicts.some(({ tile }) => tile === "reserved_site:first"),
    ),
  );
});

test("R1 standalone homes retain a one-cell circulation apron", () => {
  const first = {
      key: "first_home",
      x: 0,
      y: 0,
      w: 10,
      h: 8,
      door: { x: 5, y: 7 },
    },
    oneCellGap = {
      key: "second_home",
      x: 11,
      y: 0,
      w: 10,
      h: 8,
      door: { x: 16, y: 7 },
    },
    twoCellGap = { ...oneCellGap, x: 12, door: { x: 17, y: 7 } };
  assert.equal(
    assessConstructionSite(oneCellGap, () => "outdoor_grass", {
      reservedSites: [first],
    }).valid,
    false,
  );
  assert.equal(
    assessConstructionSite(twoCellGap, () => "outdoor_grass", {
      reservedSites: [first],
    }).valid,
    true,
  );
});

test("R1 a house entrance cannot terminate at a reserved fence", () => {
  const farm = foundingFacilityPlan("farmstead"),
    pasture = farm.enclosures.find((enclosure) => !enclosure.purpose),
    house = {
      key: "fence_blocked_home",
      x: -22,
      y: 35,
      w: 10,
      h: 8,
      door: { x: -17, y: 35 },
    };
  Object.assign(pasture, { x: -28, y: 25 });
  Object.assign(pasture.gate, { x: -28, y: 29 });
  const assessment = assessConstructionSite(house, () => "outdoor_grass", {
    reservedSites: [farm],
  });
  assert.equal(assessment.valid, false);
  assert.ok(
    assessment.conflicts.some(
      (conflict) =>
        conflict.x === -17 &&
        conflict.y === 34 &&
        conflict.tile.includes("reserved_site:farmstead"),
    ),
  );
});

test("R1 declared extensions may use their parent building apron", () => {
  const home = { key: "home", x: 0, y: 0, w: 10, h: 8 },
    extension = {
      key: "home_extension",
      attachedToSiteKey: "home",
      connectionMode: "extension",
      x: 10,
      y: 2,
      w: 3,
      h: 4,
    };
  assert.equal(
    assessConstructionSite(extension, () => "outdoor_grass", {
      reservedSites: [home],
    }).valid,
    true,
  );
});

test("M-11.1 every buildable door has clear interior and exterior access", () => {
  const house = designHouse(4),
    sites = [
      foundingFacilityPlan("lumber_yard"),
      foundingFacilityPlan("farmstead"),
      ...FOUNDER_HOUSE_PLOTS.map((plot, index) => ({
        key: `founder_house_${index + 1}`,
        x: plot.x,
        y: plot.y,
        w: house.width,
        h: house.height,
        door: {
          x: plot.x + house.door.x,
          y: plot.y + house.door.y,
        },
        secondaryDoors: house.secondaryDoors.map((door) => ({
          x: plot.x + door.x,
          y: plot.y + door.y,
        })),
      })),
    ];
  for (const site of sites) {
    for (const door of [site.door, ...(site.secondaryDoors ?? [])]) {
      const access = buildingAccess(site, door);
      assert.ok(access, `${site.key} has a corner or off-wall door`);
      assert.notDeepEqual(access.inside, access.outside);
    }
    assert.equal(
      assessConstructionSite(site, () => "outdoor_grass").valid,
      true,
    );
  }
});

test("M-11.1 the architect rejects corner doors and blocked approaches", () => {
  const corner = { x: 5, y: 5, w: 6, h: 5, door: { x: 10, y: 9 } },
    blocked = { ...corner, door: { x: 7, y: 5 } };
  assert.equal(
    assessConstructionSite(corner, () => "outdoor_grass").valid,
    false,
  );
  const result = assessConstructionSite(blocked, ({ x, y }) =>
    x === 7 && y === 4 ? "outdoor_water" : "outdoor_grass",
  );
  assert.equal(result.valid, false);
  assert.ok(
    result.conflicts.some(({ tile }) =>
      tile.startsWith("blocked_door_outside"),
    ),
  );
});

test("M-11.1 a farm crew installs access before closing the pasture fence", () => {
  const elements = constructionElements(foundingFacilityPlan("farmstead")),
    firstWall = elements.findIndex((element) => element.kind === "wall"),
    firstGate = elements.findIndex((element) => element.kind === "gate"),
    firstFence = elements.findIndex((element) => element.kind === "fence"),
    fences = elements.filter((element) => element.kind === "fence"),
    gates = elements.filter((element) => element.kind === "gate");
  assert.ok(fences.length >= 30);
  assert.equal(elements[0].kind, "door");
  assert.ok(firstWall > 0);
  assert.ok(firstGate > firstWall);
  assert.ok(firstFence > firstGate);
  assert.ok(
    elements.slice(firstGate, firstFence).every((item) => item.kind === "gate"),
  );
  assert.ok(elements.slice(firstFence).every((item) => item.kind === "fence"));
  assert.equal(gates.length, 3);
  assert.deepEqual(
    gates.map((gate) => [gate.pastureKey, gate.enclosurePurpose]),
    [
      ["farmstead_pasture", "pasture"],
      ["grain_field_boundary", "field"],
      ["vegetable_field_boundary", "field"],
    ],
  );
});

test("R1 farm reservations include the two-cell field circulation apron", () => {
  const site = foundingFacilityPlan("farmstead"),
    grain = site.enclosures.find(
      (enclosure) => enclosure.key === "grain_field_boundary",
    ),
    cells = new Set(
      constructionSiteCells(site).map(
        (position) => `${position.x},${position.y}`,
      ),
    );
  assert.equal(grain.clearance, 2);
  assert.ok(cells.has(`${grain.x - 2},${grain.y - 2}`));
  assert.ok(cells.has(`${grain.x + grain.w + 1},${grain.y + grain.h + 1}`));
  assert.ok(!cells.has(`${grain.x - 3},${grain.y}`));
});

test("M-11.1 house plans include reachable beds, storage, kitchen, table, and chairs", () => {
  const plan = designHouse(4),
    roles = plan.fixtures.map((fixture) => fixture.role);
  assert.equal(plan.archetype, "family_house");
  assert.equal(roles.filter((role) => role === "bed").length, 4);
  assert.equal(roles.filter((role) => role === "chair").length, 4);
  for (const role of ["bed", "storage", "kitchen", "table", "chair"])
    assert.ok(roles.includes(role));
  assert.equal(plan.assessment.reachableArea, plan.assessment.usableArea);
  assert.equal(plan.assessment.sleepingCapacity, 4);
});

test("M-11.1 single and double beds have physical footprints and capacity", () => {
  assert.deepEqual(BED_TYPES.single, {
    width: 1,
    height: 2,
    sleepingCapacity: 1,
  });
  assert.deepEqual(BED_TYPES.double, {
    width: 2,
    height: 2,
    sleepingCapacity: 2,
  });
  const plan = designHouse(2);
  plan.fixtures = plan.fixtures.filter((fixture) => fixture.role !== "bed");
  plan.fixtures.push({
    key: "double_bed",
    role: "bed",
    bedType: "double",
    sleepingCapacity: 2,
    x: 2,
    y: plan.height - 4,
    width: 2,
    height: 2,
  });
  assert.equal(assessHousePlan(plan).valid, true);
});

test("M-11.1 bed labels cannot lie about footprint or capacity", () => {
  const plan = designHouse(2),
    bed = plan.fixtures.find((fixture) => fixture.role === "bed");
  bed.width = 2;
  assert.ok(assessHousePlan(plan).errors.includes("invalid_bed_footprint"));
});

test("M-11.1 architecture validation rejects undersized and blocked homes", () => {
  const tiny = designHouse(2);
  tiny.width = HOUSE_ARCHETYPES.cottage.width - 2;
  assert.ok(assessHousePlan(tiny).errors.includes("house_too_small"));
  const blocked = designHouse(2);
  blocked.fixtures.push({
    key: "blocked_row",
    role: "storage",
    x: 1,
    y: blocked.height - 2,
    width: blocked.width - 2,
    height: 1,
  });
  assert.ok(assessHousePlan(blocked).errors.includes("fixture_unreachable"));
});

test("R3 buildings and facilities continuously derive from serviceable primitives", () => {
  const { state, wallId } = physicalFacilityState(),
    originalBuildingId = state.village.buildings[0].id;
  assert.equal(state.village.buildings[0].status, "complete");
  assert.ok(state.village.facilities.includes("lumber_yard"));

  assert.equal(damageConstructionEntity(state, wallId, 100), true);
  assert.equal(state.village.buildings.length, 0);
  assert.equal(state.village.facilities.includes("lumber_yard"), false);

  const lumber = state.village.stockpiles.find(
    (stockpile) => stockpile.itemKind === "building_lumber",
  );
  lumber.quantity = 1;
  assert.equal(repairConstructionEntity(state, wallId), true);
  assert.equal(state.village.buildings[0].id, originalBuildingId);
  assert.ok(state.village.facilities.includes("lumber_yard"));

  const restored = parseRogueState(serializeRogueState(state));
  assert.equal(restored.village.buildings[0].id, originalBuildingId);
  assert.equal(
    restored.village.constructionPrimitives.find((item) => item.id === wallId)
      .lifecycleState,
    "complete",
  );

  assert.equal(deconstructConstructionEntity(restored, wallId), true);
  assert.equal(restored.village.buildings.length, 0);
  assert.equal(restored.village.facilities.includes("lumber_yard"), false);
  assert.ok(
    restored.village.constructionHistory.some(
      (entry) =>
        entry.id === wallId && entry.lifecycleState === "deconstructed",
    ),
  );
});

test("R1 an enclosed building cannot complete or operate without its supported roof", () => {
  const { state, roofId } = physicalFacilityState();
  assert.equal(state.village.buildings[0].status, "complete");
  assert.equal(state.village.buildings[0].roofed, true);
  assert.ok(state.village.facilities.includes("lumber_yard"));

  assert.equal(damageConstructionEntity(state, roofId, 100), true);
  assert.equal(state.village.buildings[0].status, "enclosed");
  assert.equal(state.village.buildings[0].roofed, false);
  assert.equal(state.village.rooms[0].sheltered, false);
  assert.equal(state.village.facilities.includes("lumber_yard"), false);

  const lumber = state.village.stockpiles.find(
    (stockpile) => stockpile.itemKind === "building_lumber",
  );
  lumber.quantity = 2;
  assert.equal(repairConstructionEntity(state, roofId), true);
  assert.equal(state.village.buildings[0].status, "complete");
  assert.equal(state.village.buildings[0].roofed, true);
  assert.equal(state.village.rooms[0].sheltered, true);
  assert.ok(state.village.facilities.includes("lumber_yard"));
});

test("R1 loading a legacy roofless project reopens it with physical roof work", () => {
  const { state, job, roofId } = physicalFacilityState();
  job.plan.constructionWork.elements =
    job.plan.constructionWork.elements.filter(
      (element) => element.id !== roofId,
    );
  state.village.constructionPrimitives =
    state.village.constructionPrimitives.filter(
      (primitive) => primitive.id !== roofId,
    );
  delete job.plan.construction.roofs;
  job.status = "completed";
  job.completedAtTick = state.tick;
  const restored = parseRogueState(serializeRogueState(state)),
    restoredJob = restored.village.jobs.find(
      (candidate) => candidate.id === job.id,
    ),
    roof = restoredJob.plan.constructionWork.elements.find(
      (element) => element.kind === "roof",
    );
  assert.equal(restoredJob.status, "available");
  assert.equal(restoredJob.plan.roofRetrofit, true);
  assert.ok(restoredJob.priority >= 130);
  assert.equal(restoredJob.reason, "mandatory_roof_retrofit");
  assert.ok(roof);
  assert.equal(roof.status, "planned");
  assert.equal(roof.materialDelivered, false);
  assert.ok(roof.supportIds.length > 0);
  assert.equal(restored.village.buildings[0].status, "enclosed");
  assert.equal(restored.village.facilities.includes("lumber_yard"), false);
});

test("R3 construction controls prioritize, suspend, resume, and cancel exact projects", () => {
  const { state, job } = physicalFacilityState();
  assert.equal(
    controlConstructionProject(state, job.id, "prioritize", 140),
    true,
  );
  assert.equal(job.basePriority, 140);
  assert.equal(controlConstructionProject(state, job.id, "suspend"), true);
  assert.equal(job.status, "suspended");
  assert.equal(controlConstructionProject(state, job.id, "resume"), true);
  assert.equal(job.status, "available");
  assert.equal(controlConstructionProject(state, job.id, "cancel"), true);
  assert.equal(job.status, "cancelled");
});
