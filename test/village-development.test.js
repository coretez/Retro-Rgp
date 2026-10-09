import test from "node:test";
import assert from "node:assert/strict";
import {
  applyRogueTurn,
  newRogueRun,
  parseRogueState,
  rogueRunView,
  rogueUnityView,
  serializeRogueState,
} from "../src/rogue-engine.js";
import {
  infectAnimal,
  installAnimalHousingSites,
  livingAnimals,
} from "../src/village-animals.js";
import {
  constructionElements,
  damageConstructionEntity,
  specialistFacilityPlan,
} from "../src/village-architecture.js";
import { namedUuid } from "../src/identity.js";
import {
  advanceCropGrowth,
  ensureVillageFoodSystem,
} from "../src/village-food.js";
import {
  assessSettlementMasterPlanSite,
  assessFoundingStrategy,
  auditVillageStrategy,
  decideVillageProposal,
  ensureVillageDevelopment,
  MAYOR_REVIEW_INTERVAL_TICKS,
  updateVillageDevelopment,
} from "../src/village-development.js";
import { reconcileVillageStorage } from "../src/village-storage.js";

test("R1 founding strategy compares shelter doctrines before capital work", () => {
  const state = newRogueRun({ ...input, scenario: "founding" });
  state.location = "village";
  state.village.development.projects.find(
    (project) => project.key === "housing",
  ).status = "complete";
  const assessment = assessFoundingStrategy(state);
  assert.equal(assessment.status, "ready");
  assert.equal(assessment.selectedDoctrine.key, "minimal_camp");
  assert.equal(assessment.selectedDoctrine.nextCapitalStep, "lumber_yard");
  assert.deepEqual(
    assessment.alternatives.map((alternative) => alternative.key),
    ["minimal_camp", "communal_shelter", "household_homes"],
  );
  assert.equal(assessment.missingEvidence.length, 0);
  assert.ok(
    assessment.alternatives.every(
      (alternative) => alternative.timeToBenefitTicks != null,
    ),
  );
});

test("R1 the reeve inventories resident needs and anticipates food scarcity", () => {
  const state = newRogueRun({ ...input, scenario: "founding" });
  state.village.facilities.push("lumber_yard");
  for (const resident of state.village.npcStates)
    for (const need of Object.keys(resident.life.needs))
      resident.life.needs[need] = 100;
  updateVillageDevelopment(state);
  const inventory = state.village.development.residentNeedsAssessment;
  assert.equal(inventory.assessedByActorId, reeve(state).id);
  assert.equal(inventory.residents.length, 10);
  assert.equal(inventory.warningCounts.hunger, 0);
  assert.deepEqual(inventory.foodOutlook.risks, ["seasonal_fields_unsown"]);
  assert.equal(inventory.recommendedPriority, "food_security");
  assert.match(inventory.recommendationReason, /seasonal planting not started/);

  for (const resident of state.village.npcStates.slice(0, 3))
    resident.life.needs.hunger = 20;
  updateVillageDevelopment(state);
  assert.equal(
    state.village.development.residentNeedsAssessment.dangerCounts.hunger,
    0,
  );
  state.tick += MAYOR_REVIEW_INTERVAL_TICKS;
  updateVillageDevelopment(state);
  assert.equal(
    state.village.development.residentNeedsAssessment.dangerCounts.hunger,
    3,
  );
  assert.match(
    state.village.development.residentNeedsAssessment.recommendationReason,
    /3 hungry and 3 starving/,
  );
});

test("R8 the master plan revises for population and new household demand", () => {
  const state = newRogueRun({ ...input, scenario: "founding" });
  updateVillageDevelopment(state);
  const plan = state.village.development.masterPlan,
    version = plan.version,
    resident = structuredClone(state.village.npcStates[0]),
    household = {
      id: "growth-household-id",
      key: "growth_household",
      name: "Growth household",
      memberIds: ["growth-resident-id"],
    };
  Object.assign(resident, {
    id: "growth-resident-id",
    personKey: "growth_resident",
    name: "Growth Resident",
    householdId: household.id,
    residenceId: null,
  });
  state.village.npcStates.push(resident);
  state.village.households.push(household);
  state.tick += MAYOR_REVIEW_INTERVAL_TICKS;
  updateVillageDevelopment(state);
  assert.equal(plan.version, version + 1);
  assert.equal(plan.demand.population, 11);
  assert.equal(plan.demand.households, 4);
  assert.ok(
    plan.householdLots.some((lot) => lot.householdKey === household.key),
  );
  assert.equal(plan.planningResponse.requiredHomeCapacity, 11);
  assert.ok(plan.planningResponse.priorities.includes("housing"));
});

test("R8 the founding master plan reserves every approved facility", () => {
  const state = newRogueRun({ ...input, scenario: "founding" }),
    plan = state.village.development.masterPlan,
    keys = new Set(plan.plannedFacilities.map((facility) => facility.key));
  for (const key of [
    "lumber_yard",
    "farmstead",
    "communal_kitchen",
    "specialist_granary",
    "specialist_stable",
    "specialist_mill",
    "specialist_forge",
    "specialist_bakery",
    "specialist_infirmary",
    "specialist_inn",
    "security_watch_house",
    "security_armory",
    "security_training_yard",
    "security_gatehouse",
    "civic_cemetery",
  ])
    assert.ok(keys.has(key), `missing ${key}`);
  assert.ok(
    plan.plannedFacilities.every(
      (facility) => facility.site.w > 0 && facility.districtKey,
    ),
  );
});

test("R8.5 the master plan persists every required district and reservation", () => {
  const state = newRogueRun({ ...input, scenario: "founding" }),
    plan = state.village.development.masterPlan,
    districtKeys = new Set(plan.districts.map((district) => district.key));
  for (const key of [
    "civic_common",
    "residential",
    "food_agriculture",
    "storage_logistics",
    "industrial",
    "hospitality",
    "health",
    "military",
    "cemetery",
    "expansion",
  ])
    assert.ok(districtKeys.has(key), `missing ${key}`);
  assert.ok(plan.districts.every((district) => district.allowedUses.length));
  assert.ok(
    plan.districts.every((district) => district.discouragedUses.length),
  );
  for (const key of [
    "roadCorridors",
    "entrances",
    "cartTurningSpaces",
    "firebreaks",
    "utilities",
    "defensiveApproaches",
    "futureLots",
    "buildingExpansion",
  ])
    assert.ok(plan.spatialReservations[key].length, `missing ${key}`);
});

test("R8.5 the architect names the extraction-to-town supply chain", () => {
  const state = newRogueRun({
      ...input,
      scenario: "founding",
      worldGeneration: "regional_v3",
    }),
    network = state.village.development.masterPlan.logisticsNetwork,
    works = new Map(network.resourceWorks.map((entry) => [entry.key, entry]));
  assert.equal(works.get("timber_camp").placement, "forest_edge_outside_town");
  assert.equal(
    works.get("quarry_works").placement,
    "exposed_rock_face_outside_town",
  );
  assert.ok(
    network.flows.some(
      (flow) =>
        flow.from === "managed_woodland_edge" && flow.to === "lumber_yard",
    ),
  );
  assert.ok(
    network.flows.some(
      (flow) => flow.from === "unprospected_rocky_ridge" && flow.to === "forge",
    ),
  );
  assert.equal(network.sourceAnchors.length, 2);
});

test("R8.5 five seeds keep every approved facility inside its service plan", () => {
  for (let index = 0; index < 5; index += 1) {
    const state = newRogueRun({
        ...input,
        scenario: "founding",
        seed: `r8-master-plan-${index}`,
      }),
      plan = state.village.development.masterPlan;
    for (const facility of plan.plannedFacilities) {
      const assessment = assessSettlementMasterPlanSite(
        state,
        facility.key,
        facility.site,
      );
      assert.equal(
        assessment.valid,
        true,
        `${facility.key}: ${assessment.conflicts.join(", ")}`,
      );
    }
    const restored = parseRogueState(serializeRogueState(state));
    assert.deepEqual(
      restored.village.development.masterPlan.spatialReservations,
      plan.spatialReservations,
    );
  }
});

test("R8.5 an architect cannot treat an out-of-district site as compliant", () => {
  const state = newRogueRun({ ...input, scenario: "founding" }),
    forge = specialistFacilityPlan("specialist_forge"),
    assessment = assessSettlementMasterPlanSite(state, "specialist_forge", {
      ...forge,
      x: -110,
      y: 80,
    });
  assert.equal(assessment.valid, false);
  assert.deepEqual(assessment.conflicts, ["outside_industrial_district"]);
  assert.match(assessment.reasons[0], /forge belongs in industrial/);
});

test("R8.5 a granary cannot exceed a practical farm-lane spur", () => {
  const state = newRogueRun({ ...input, scenario: "founding" }),
    granary = state.village.development.masterPlan.plannedFacilities.find(
      (facility) => facility.key === "specialist_granary",
    ),
    disconnected = {
      ...structuredClone(granary.site),
      y: granary.site.y + 30,
      door: { ...granary.site.door, y: granary.site.door.y + 30 },
    },
    assessment = assessSettlementMasterPlanSite(
      state,
      "specialist_granary",
      disconnected,
    );
  assert.equal(assessment.valid, false);
  assert.ok(assessment.conflicts.includes("route_access:farm_cart_lane"));
  assert.equal(assessment.route.satisfied, false);
});

test("R8.5 an approved disconnected facility receives a named dirt spur", () => {
  const state = newRogueRun({ ...input, scenario: "founding" }),
    development = state.village.development,
    granary = development.masterPlan.plannedFacilities.find(
      (facility) => facility.key === "specialist_granary",
    ),
    site = {
      ...structuredClone(granary.site),
      key: "granary",
      y: granary.site.y + 17,
      door: { ...granary.site.door, y: granary.site.door.y + 17 },
      architectPlanId: "disconnected-plan",
    };
  development.architectPlans.push({
    id: "disconnected-plan",
    projectKey: "specialist_granary",
    status: "approved",
  });
  development.constructionSites.push(site);
  ensureVillageDevelopment(state);
  const spur = development.masterPlan.spatialReservations.accessSpurs.find(
    (entry) => entry.facilityKey === "specialist_granary",
  );
  assert.equal(spur.routeKey, "farm_cart_lane");
  assert.equal(spur.surface, "dirt");
  assert.deepEqual(spur.to, site.door);
  assert.equal(
    assessSettlementMasterPlanSite(state, "specialist_granary", site).route
      .requiresSpur,
    true,
  );
});

test("R8.4 the mayor authorizes a measured perimeter after repeated danger", () => {
  const state = newRogueRun({ ...input, scenario: "founding" }),
    defense = state.village.development.masterPlan.defenseStrategy;
  state.village.buildings.push(
    { key: "west_home", x: -42, y: -12, w: 10, h: 8 },
    { key: "east_workshop", x: 48, y: 36, w: 14, h: 10 },
  );
  state.village.incidents.push(
    { id: "danger-one", kind: "danger", status: "resolved" },
    { id: "danger-two", kind: "danger", status: "reported" },
  );
  const events = [];
  updateVillageDevelopment(state, events);
  assert.equal(defense.perimeter.status, "authorized");
  assert.equal(defense.perimeter.trigger.key, "repeated_attack");
  assert.ok(defense.perimeter.boundary.x < -42);
  assert.ok(
    defense.perimeter.boundary.x + defense.perimeter.boundary.width > 62,
  );
  assert.equal(defense.perimeter.boundary.gates.length, 8);
  assert.equal(
    defense.facilities.find((facility) => facility.key === "gatehouse").status,
    "planned",
  );
  assert.ok(
    events.some((event) => event.type === "village_perimeter_authorized"),
  );
  updateVillageDevelopment(state, events);
  const proposal = state.village.development.strategyBoard.proposalQueue.find(
      (candidate) => candidate.projectKey === "security_gatehouse",
    ),
    plan = specialistFacilityPlan("security_gatehouse"),
    elements = constructionElements(plan);
  assert.equal(proposal.demand.status, "demonstrated");
  assert.ok(elements.some((element) => element.kind === "roof"));
  assert.equal(elements.filter((element) => element.kind === "door").length, 2);
  assert.ok(plan.fixtures.length >= 4);
});

const input = {
  requestId: "m11-village-development",
  runId: "a38ae02b-0883-5576-b6d9-3066170dd242",
  seed: "m11-village-development",
  heroName: "Mara",
  form: "hybrid",
  size: "small",
};

function villageState() {
  const state = newRogueRun(input);
  state.location = "village";
  return state;
}

function advance(state) {
  for (const job of state.village.jobs)
    if (job.plan?.constructionWork && job.production?.inputConsumed) {
      const element = job.plan.constructionWork.elements.find(
        (candidate) =>
          candidate.materialDelivered && candidate.status !== "complete",
      );
      if (element)
        element.laborCompleted = Math.max(0, element.laborRequired - 0.5);
    } else if (
      job.progress?.unit?.endsWith("_minute") &&
      ["reserved", "active"].includes(job.status)
    )
      job.progress.completed = Math.max(
        job.progress.completed,
        job.progress.total - 0.6,
      );
  for (const job of state.village.jobs.filter(
    (candidate) =>
      candidate.plan?.constructionDelivery &&
      candidate.assignedActorId &&
      candidate.destination &&
      ["reserved", "active"].includes(candidate.status),
  )) {
    const actor = state.village.npcStates.find(
      (candidate) => candidate.id === job.assignedActorId,
    );
    if (actor) actor.position = { ...job.destination };
  }
  const axe = state.hero.inventory.find((item) => item.kind === "hand_axe");
  return applyRogueTurn(state, { kind: "equip", itemId: axe.id });
}

test("R8.5 builders complete every cell of a planned dirt access spur", () => {
  const state = newRogueRun({ ...input, scenario: "founding" }),
    plan = state.village.development.masterPlan,
    spur = {
      key: "test_granary_access",
      facilityKey: "specialist_granary",
      routeKey: "farm_cart_lane",
      from: { x: -40, y: -10 },
      to: { x: -36, y: -10 },
      surface: "dirt",
      status: "planned",
    };
  state.location = "village";
  plan.spatialReservations.accessSpurs.push(spur);
  state.village.residences = state.village.households.map(
    (household, index) => ({
      id: `road-test-home-${index}`,
      plannedHouseholdId: household.id,
      habitable: true,
      status: "complete",
    }),
  );
  for (let turn = 0; turn < 120 && spur.status !== "operating"; turn += 1) {
    expediteVillageJobs(
      state,
      (job) => job.jobType === "build_dirt_access_road",
    );
    advance(state);
  }
  const cells = state.village.modifications.filter(
      (entry) => entry.kind === "built_dirt_road" && entry.y === -10,
    ),
    job = state.village.jobs.find(
      (candidate) => candidate.jobType === "build_dirt_access_road",
    );
  assert.equal(spur.status, "operating", JSON.stringify({ spur, job, cells }));
  assert.equal(job.status, "completed");
  assert.deepEqual(
    cells.map(({ x, y }) => ({ x, y })),
    [
      { x: -39, y: -10 },
      { x: -38, y: -10 },
      { x: -37, y: -10 },
    ],
  );
  const visible = rogueUnityView(state).map.cells.filter(
    (cell) => cell.y === -10 && [-39, -38, -37].includes(cell.x),
  );
  assert.equal(visible.length, 3);
  assert.ok(visible.every((cell) => cell.tile === "road_dirt"));
});

function stock(state, key) {
  return state.village.stockpiles.find((item) => item.key === key);
}

function woodcutter(state) {
  return state.village.npcStates.find(
    (actor) => actor.personKey === "woodcutter",
  );
}

function reeve(state) {
  return state.village.npcStates.find((actor) => actor.personKey === "reeve");
}

function resident(state, personKey) {
  return state.village.npcStates.find((actor) => actor.personKey === personKey);
}

function developmentJobs(state) {
  return state.village.jobs.filter((job) =>
    ["fell_tree", "build_lumber_yard", "saw_lumber"].includes(job.jobType),
  );
}

test("R8.4 the watch proposes three roofed physical security facilities", () => {
  const state = newRogueRun({ ...input, scenario: "founding" }),
    projectKeys = [
      "security_watch_house",
      "security_armory",
      "security_training_yard",
    ];
  for (const facility of [
    "lumber_yard",
    "farmstead",
    "housing",
    "communal_kitchen",
  ])
    if (!state.village.facilities.includes(facility))
      state.village.facilities.push(facility);
  updateVillageDevelopment(state);
  for (const projectKey of projectKeys) {
    const plan = specialistFacilityPlan(projectKey),
      elements = constructionElements(plan),
      proposal = state.village.development.strategyBoard.proposalQueue.find(
        (candidate) => candidate.projectKey === projectKey,
      );
    assert.ok(plan);
    assert.ok(elements.some((element) => element.kind === "roof"));
    assert.ok(elements.some((element) => element.kind === "door"));
    assert.ok(plan.fixtures.length >= 4);
    assert.equal(proposal.requesterPersonKey, "watchman");
    assert.equal(proposal.intendedOperatorPersonKey, "watchman");
  }
});

test("R8.4 the authorized gatehouse becomes physical and operational", () => {
  const state = newRogueRun({ ...input, scenario: "founding" }),
    projectKeys = ["security_gatehouse"],
    facilityKeys = ["gatehouse"],
    existing = [
      "lumber_yard",
      "farmstead",
      "housing",
      "communal_kitchen",
      "forge",
      "mill",
      "bakery",
      "infirmary",
      "carpenter_workshop",
      "granary",
      "inn",
      "stable",
      "watch_house",
      "armory",
      "training_yard",
    ];
  state.location = "village";
  state.village.facilities.push(
    ...existing.filter((key) => !state.village.facilities.includes(key)),
  );
  stock(state, "lumber_yard_lumber").quantity = 300;
  stock(state, "lumber_yard_lumber").capacity = 3000;
  stock(state, "lumber_camp_logs").quantity = 0;
  stock(state, "lumber_camp_logs").capacity = 5000;
  Object.assign(
    state.village.development.masterPlan.defenseStrategy.perimeter,
    {
      status: "authorized",
      trigger: { key: "repeated_attack", value: 2 },
      authorizedAtTick: state.tick,
      boundary: {
        x: -20,
        y: -5,
        width: 40,
        height: 30,
        gates: [
          { edge: "west", lane: 0, x: -20, y: 14 },
          { edge: "west", lane: 1, x: -20, y: 15 },
          { edge: "east", lane: 0, x: 19, y: 14 },
          { edge: "east", lane: 1, x: 19, y: 15 },
          { edge: "north", lane: 0, x: -8, y: -5 },
          { edge: "north", lane: 1, x: -7, y: -5 },
          { edge: "south", lane: 0, x: -8, y: 24 },
          { edge: "south", lane: 1, x: -7, y: 24 },
        ],
      },
    },
  );
  for (let step = 0; step < 5000; step += 1) {
    if (stock(state, "lumber_yard_lumber").quantity < 200)
      stock(state, "lumber_yard_lumber").quantity = 300;
    expediteVillageJobs(state, (job) => {
      if (job.plan?.finalInspectionDuty) return false;
      const commission =
        state.village.development.strategyBoard.commissions.find(
          (candidate) => candidate.id === job.plan?.commissionId,
        );
      return !commission || projectKeys.includes(commission.projectKey);
    });
    advance(state);
    const commissions = state.village.development.strategyBoard.commissions;
    if (
      projectKeys.every((projectKey) =>
        commissions.some(
          (commission) =>
            commission.projectKey === projectKey &&
            commission.status === "operating",
        ),
      )
    )
      break;
  }
  advance(state);
  for (const [index, key] of facilityKeys.entries()) {
    const commission = state.village.development.strategyBoard.commissions.find(
        (candidate) => candidate.projectKey === projectKeys[index],
      ),
      build = state.village.jobs.find((job) => job.plan?.facilityKey === key),
      building = state.village.buildings.find(
        (candidate) => candidate.key === key,
      ),
      defense =
        state.village.development.masterPlan.defenseStrategy.facilities.find(
          (facility) => facility.key === key,
        );
    const related = state.village.jobs
      .filter((job) => job.plan?.commissionId === commission?.id)
      .map((job) => ({
        type: job.jobType,
        status: job.status,
        reason: job.blockingReason,
        commissioning: job.plan?.commissioning?.status,
      }));
    assert.equal(
      commission?.status,
      "operating",
      `${projectKeys[index]} ${JSON.stringify({
        related,
        facilities: state.village.facilities,
        modifications: state.village.modifications.length,
        clearedSelectedTrees: state.village.development.architectPlans
          .find((candidate) => candidate.id === commission?.planning?.planId)
          ?.alternatives.find(
            (alternative) =>
              alternative.id ===
              state.village.development.architectPlans.find(
                (candidate) => candidate.id === commission?.planning?.planId,
              )?.selectedAlternativeId,
          )
          ?.assessment.treeCells.filter((tree) =>
            state.village.modifications.some(
              (change) => change.x === tree.x && change.y === tree.y,
            ),
          ).length,
        constructionSites: state.village.development.constructionSites.filter(
          (site) => site.architectPlanId === commission?.planning?.planId,
        ),
        specialistJobs: state.village.jobs
          .filter((job) => job.jobType === "build_specialist_facility")
          .map((job) => ({
            facilityKey: job.plan?.facilityKey,
            status: job.status,
            reason: job.blockingReason,
          })),
        facilityJobs: state.village.jobs
          .filter(
            (job) =>
              job.plan?.facilityKey === key ||
              job.plan?.workOrderId === commission?.planning?.workOrderId,
          )
          .map((job) => ({
            type: job.jobType,
            status: job.status,
            reason: job.blockingReason,
            progress: job.progress,
            elements: job.plan?.constructionWork?.elements?.reduce(
              (counts, element) => ({
                ...counts,
                [element.status]: (counts[element.status] ?? 0) + 1,
              }),
              {},
            ),
          })),
        planning: commission?.planning,
        budget: commission?.budget,
        proposal: state.village.development.strategyBoard.proposalQueue.find(
          (candidate) => candidate.projectKey === projectKeys[index],
        )?.requestedBudget,
        plan: state.village.development.architectPlans.find(
          (candidate) => candidate.id === commission?.planning?.planId,
        ) && {
          status: state.village.development.architectPlans.find(
            (candidate) => candidate.id === commission?.planning?.planId,
          ).status,
          alternatives: state.village.development.architectPlans
            .find((candidate) => candidate.id === commission?.planning?.planId)
            .alternatives.map((alternative) => ({
              status: alternative.status,
              trees: alternative.assessment.treeCells.length,
              billOfMaterials: alternative.billOfMaterials,
            })),
        },
        stock: stock(state, "lumber_yard_lumber"),
        workOrders: state.village.development.workOrders.filter(
          (order) => order.commissionId === commission?.id,
        ),
        siteIssue: state.village.development.siteIssue,
      })}`,
    );
    assert.equal(
      building?.roofed,
      true,
      `${key} ${JSON.stringify({ building, elements: build?.plan?.constructionWork?.elements?.map((element) => [element.kind, element.status]) })}`,
    );
    assert.equal(
      defense.status,
      "operating",
      `${key} ${JSON.stringify({ related, facilities: state.village.facilities })}`,
    );
    assert.equal(defense.buildingKey, building.key);
    if (key === "gatehouse") {
      const gate =
        state.village.development.masterPlan.defenseStrategy.perimeter.boundary.gates.find(
          (candidate) => candidate.edge === "east",
        );
      assert.equal(building.x + building.w, gate.x);
      assert.equal(building.door.x, gate.x - 6);
      assert.equal(building.door.y, gate.y - 1);
      assert.equal(building.secondaryDoors.length, 1);
    }
  }
  const perimeter =
      state.village.development.masterPlan.defenseStrategy.perimeter,
    physicalIds = new Set([
      ...state.village.constructionPrimitives.map((item) => item.id),
      ...state.village.doors.map((item) => item.id),
    ]);
  assert.equal(perimeter.status, "physically_complete");
  assert.ok(perimeter.elementIds.length > 100);
  assert.equal(perimeter.gateIds.length, 8);
  assert.ok(perimeter.elementIds.every((id) => physicalIds.has(id)));
  const restored = parseRogueState(serializeRogueState(state));
  assert.ok(
    restored.village.development.masterPlan.defenseStrategy.facilities
      .filter((facility) => facilityKeys.includes(facility.key))
      .every((facility) => facility.status === "operating"),
  );
  assert.deepEqual(
    restored.village.development.masterPlan.defenseStrategy.perimeter,
    perimeter,
  );
});

function expediteCurrentWork(state) {
  const expedited = state.village.jobs.filter(
    (job) =>
      ["reserved", "active"].includes(job.status) &&
      (developmentJobs(state).includes(job) ||
        job.plan?.constructionDelivery ||
        job.plan?.projectAssist),
  );
  for (const job of expedited) {
    const actor = state.village.npcStates.find(
      (candidate) => candidate.id === job.assignedActorId,
    );
    if (actor && job.destination) actor.position = { ...job.destination };
  }
  for (const actor of state.village.npcStates)
    for (const need of Object.keys(actor.life.needs))
      actor.life.needs[need] = 100;
}

function expediteVillageJobs(state, predicate = () => true) {
  for (const actor of state.village.npcStates)
    for (const need of Object.keys(actor.life.needs))
      actor.life.needs[need] = 100;
  for (const job of state.village.jobs.filter(
    (candidate) =>
      predicate(candidate) && ["reserved", "active"].includes(candidate.status),
  )) {
    const actor = state.village.npcStates.find(
      (candidate) => candidate.id === job.assignedActorId,
    );
    if (actor) {
      const destination = job.destination ?? job.targetPosition;
      if (destination) actor.position = { ...destination };
    }
    if (job.progress?.unit?.endsWith("_minute"))
      job.progress.completed = Math.max(
        job.progress.completed,
        job.progress.total - 0.6,
      );
  }
}

test("M-11 village priorities expose dependencies instead of vague goals", () => {
  const state = villageState();
  advance(state);
  const development = state.village.development,
    food = development.priorities.find((item) => item.key === "food_security"),
    housing = development.priorities.find((item) => item.key === "housing");
  assert.equal(development.activePriority, "lumber_infrastructure");
  assert.equal(development.administratorActorId, reeve(state).id);
  const order = development.workOrders.find(
    (candidate) => candidate.id === development.activeOrderId,
  );
  assert.equal(order.issuedByActorId, reeve(state).id);
  assert.ok(order.jobTypes.includes("fell_tree"));
  const board = development.strategyBoard,
    proposal = board.proposalQueue.find(
      (candidate) => candidate.projectKey === "lumber_yard",
    ),
    decision = board.decisions.find(
      (candidate) => candidate.id === proposal.latestDecisionId,
    ),
    commission = board.commissions.find(
      (candidate) => candidate.id === proposal.commissionId,
    );
  assert.equal(board.leaderActorId, reeve(state).id);
  assert.equal(proposal.requesterActorId, woodcutter(state).id);
  assert.equal(proposal.status, "approved");
  assert.equal(decision.decidedByActorId, reeve(state).id);
  assert.equal(decision.outcome, "approved");
  assert.equal(commission.authorizedByActorId, reeve(state).id);
  assert.equal(commission.budget.materials.lumber, 230);
  assert.equal(commission.budget.laborUnits, 430);
  assert.ok(
    ["within_budget", "legacy_untracked"].includes(
      commission.budgetUsage.status,
    ),
  );
  assert.ok(commission.assignments.foreman.actorName);
  assert.ok(commission.assignments.builders.length);
  assert.ok(commission.assignments.haulers.length);
  assert.equal(commission.planning.architectActorId, null);
  assert.equal(commission.planning.status, "provisional_legacy_plan");
  assert.equal(order.proposalId, proposal.id);
  assert.equal(order.decisionId, decision.id);
  assert.equal(order.commissionId, commission.id);
  assert.equal(
    developmentJobs(state).find((job) => job.jobType === "fell_tree").plan
      .workOrderId,
    order.id,
  );
  const lumberJob = developmentJobs(state).find(
    (job) => job.jobType === "fell_tree",
  );
  assert.equal(lumberJob.plan.proposalId, proposal.id);
  assert.equal(lumberJob.plan.decisionId, decision.id);
  assert.equal(lumberJob.plan.commissionId, commission.id);
  assert.deepEqual(
    lumberJob.plan.allowedActorIds,
    commission.assignments.crewActorIds,
  );
  const strategyAudit = auditVillageStrategy(state);
  assert.deepEqual(strategyAudit.violations, []);
  assert.deepEqual(
    strategyAudit.pendingGates.map((item) => item.code),
    [],
  );
  assert.deepEqual(food.blockedBy, ["farmstead"]);
  assert.deepEqual(housing.blockedBy, ["lumber_yard"]);
  assert.equal(
    development.projects.find((project) => project.key === "lumber_yard")
      .status,
    "active",
  );
  assert.equal(
    rogueRunView(state).village.development.activePriority,
    "lumber_infrastructure",
  );
  assert.equal(
    rogueUnityView(state).villageDevelopment.activePriority,
    "lumber_infrastructure",
  );
  state.village.heroPosition = { x: -20, y: 17 };
  const klara = rogueUnityView(state).map.cells.find(
    (cell) => cell.entityName === "Klara Holt",
  );
  assert.match(klara.entityCapabilities, /forestry 4/);
});

test("M-11 an exceeded building budget does not stop survival production", () => {
  const state = villageState();
  advance(state);
  const commission = state.village.development.strategyBoard.commissions[0],
    construction = state.village.jobs.find(
      (job) =>
        job.plan?.commissionId === commission.id && job.plan.constructionWork,
    ),
    production = state.village.jobs.find(
      (job) =>
        job.plan?.commissionId === commission.id && job.jobType === "fell_tree",
    );
  commission.budget.laborUnits = -1;
  updateVillageDevelopment(state, []);
  assert.equal(commission.budgetUsage.status, "exceeded");
  assert.equal(construction.plan.budgetBlocked, true);
  assert.equal(production.plan.budgetBlocked, false);
});

test("M-11 parallel founding work does not spend another project's budget", () => {
  const state = villageState();
  advance(state);
  const commission = state.village.development.strategyBoard.commissions[0],
    construction = state.village.jobs.find(
      (job) =>
        job.plan?.commissionId === commission.id && job.plan.constructionWork,
    );
  construction.plan.parallelFoundingWork = true;
  construction.plan.constructionWork.elements[0].laborCompleted = 999;
  updateVillageDevelopment(state, []);
  assert.equal(commission.budgetUsage.laborUnits, 0);
  assert.equal(construction.plan.budgetBlocked, false);
});

test("R1 the reeve authorizes a first home alongside seasonal food work", () => {
  const state = newRogueRun({ ...input, scenario: "founding" });
  state.location = "village";
  state.village.facilities.push("lumber_yard");
  stock(state, "lumber_yard_lumber").quantity = 100;
  state.village.jobs.push({
    id: "seasonal-grain-work",
    jobType: "grow_grain",
    status: "suspended",
  });
  updateVillageDevelopment(state);
  const development = state.village.development,
    proposal = development.strategyBoard.proposalQueue.find(
      (candidate) => candidate.projectKey === "housing",
    ),
    commission = development.strategyBoard.commissions.find(
      (candidate) => candidate.projectKey === "housing",
    );
  assert.equal(development.activePriority, "food_security");
  assert.equal(proposal.status, "approved");
  assert.equal(commission.status, "active");
  assert.equal(commission.decisionId, proposal.latestDecisionId);
  assert.equal(
    development.workOrders.filter((order) => order.status === "active").length,
    1,
  );
  assert.equal(
    development.workOrders.find((order) => order.status === "active")
      .priorityKey,
    "food_security",
  );
});

test("R8 mayor plan knows regional sources and prices remote travel", () => {
  const state = villageState();
  advance(state);
  const context = state.village.development.masterPlan.regionalContext;
  assert.deepEqual(
    context.surveyedSources.map((source) => source.key),
    ["stonebridge_crossing", "western_limestone_ridge"],
  );
  assert.deepEqual(
    context.surveyedSources.map((source) => source.distance),
    [82, 160],
  );
  assert.equal(context.surveyedSources[0].dispatchStatus, "reachable");
  assert.equal(context.surveyedSources[1].dispatchStatus, "needs_field_camp");
  assert.deepEqual(context.dispatchPolicy.remoteWorkRequires, [
    "field_camp",
    "food_reserve",
    "return_route",
  ]);
});

test("V1 the reeve can defer a specialist proposal with a persisted reason", () => {
  const state = villageState(),
    board = state.village.development.strategyBoard,
    farmProposal = board.proposalQueue.find(
      (candidate) => candidate.projectKey === "farmstead",
    ),
    events = [];
  const result = decideVillageProposal(
    state,
    {
      proposalId: farmProposal.id,
      outcome: "deferred",
      reason: "Permanent shelter is still below the safe minimum.",
    },
    events,
  );
  assert.equal(result.proposal.status, "deferred");
  assert.equal(result.decision.decidedByActorId, reeve(state).id);
  assert.equal(result.decision.reason, events[0].reason);
  assert.equal(result.commission, null);
  assert.equal(
    state.village.development.strategyBoard.commissions.some(
      (commission) => commission.proposalId === farmProposal.id,
    ),
    false,
  );
  const restored = parseRogueState(serializeRogueState(state)),
    restoredProposal =
      restored.village.development.strategyBoard.proposalQueue.find(
        (candidate) => candidate.id === farmProposal.id,
      );
  assert.equal(restoredProposal.status, "deferred");
  assert.equal(
    restored.village.development.strategyBoard.decisions.find(
      (decision) => decision.id === result.decision.id,
    ).reason,
    "Permanent shelter is still below the safe minimum.",
  );
});

test("V1 council decisions and commission suspension are immediate and persisted", () => {
  const state = villageState();
  advance(state);
  const board = state.village.development.strategyBoard,
    commission = board.commissions.find(
      (candidate) => candidate.projectKey === "lumber_yard",
    ),
    order = state.village.development.workOrders.find(
      (candidate) => candidate.commissionId === commission.id,
    ),
    tick = state.tick;
  applyRogueTurn(state, {
    kind: "set_village_commission_status",
    commissionId: commission.id,
    status: "suspended",
    reason: "The council is protecting the reserve.",
  });
  assert.equal(state.tick, tick);
  assert.equal(commission.status, "suspended");
  assert.equal(
    commission.suspensionReason,
    "The council is protecting the reserve.",
  );
  assert.equal(order.status, "suspended");
  assert.ok(
    state.village.jobs
      .filter((job) => job.plan?.commissionId === commission.id)
      .every(
        (job) =>
          ["completed", "cancelled", "suspended"].includes(job.status) &&
          (job.status !== "suspended" || job.plan.commissionSuspended),
      ),
  );
  applyRogueTurn(state, {
    kind: "set_village_commission_status",
    commissionId: commission.id,
    status: "active",
    reason: "The council released the reserve.",
  });
  assert.equal(state.tick, tick);
  assert.equal(commission.status, "active");
  assert.equal(order.status, "active");
  assert.ok(
    state.village.jobs
      .filter(
        (job) =>
          job.plan?.commissionId === commission.id &&
          !["completed", "cancelled"].includes(job.status),
      )
      .every(
        (job) => job.status === "available" && !job.plan.commissionSuspended,
      ),
  );
  const restored = parseRogueState(serializeRogueState(state)),
    restoredCommission =
      restored.village.development.strategyBoard.commissions.find(
        (candidate) => candidate.id === commission.id,
      );
  assert.equal(restoredCommission.status, "active");
  assert.equal(restoredCommission.suspensionReason, null);
});

test("V1 the named foreman performs and records construction reviews", () => {
  const state = villageState();
  for (let turn = 0; turn < 500; turn += 1) {
    expediteCurrentWork(state);
    advance(state);
    const commission = state.village.development.strategyBoard.commissions.find(
      (candidate) => candidate.projectKey === "lumber_yard",
    );
    if (commission?.foremanReview) break;
  }
  const commission = state.village.development.strategyBoard.commissions.find(
      (candidate) => candidate.projectKey === "lumber_yard",
    ),
    foremanJobs = state.village.jobs.filter(
      (job) =>
        job.jobType === "supervise_project" &&
        job.plan?.commissionId === commission.id,
    );
  assert.ok(commission.foremanReview);
  assert.equal(
    commission.foremanReview.foremanActorId,
    commission.assignments.foreman.actorId,
  );
  assert.ok(foremanJobs.length > 0);
  assert.ok(
    foremanJobs.every(
      (job) =>
        job.plan.allowedActorIds.length === 1 &&
        job.plan.allowedActorIds[0] === commission.assignments.foreman.actorId,
    ),
  );
  assert.ok(
    commission.budgetUsage.materials.lumber <=
      commission.budget.materials.lumber,
  );
  assert.ok(commission.budgetUsage.laborUnits <= commission.budget.laborUnits);
});

test("V2 a smith submits a requirements-backed forge proposal only after demonstrated demand", () => {
  const state = villageState(),
    smith = resident(state, "smith");
  assert.equal(
    state.village.development.strategyBoard.proposalQueue.some(
      (proposal) => proposal.projectKey === "specialist_forge",
    ),
    false,
  );
  state.village.buildings = state.village.buildings.filter(
    (building) => building.key !== "smithy",
  );
  advance(state);
  const proposal = state.village.development.strategyBoard.proposalQueue.find(
    (candidate) => candidate.projectKey === "specialist_forge",
  );
  assert.ok(proposal);
  assert.equal(proposal.proposalKind, "specialist");
  assert.equal(proposal.requesterActorId, smith.id);
  assert.equal(proposal.intendedOperatorActorId, smith.id);
  assert.equal(proposal.demand.status, "demonstrated");
  assert.ok(proposal.demand.metrics.every((metric) => metric.satisfied));
  assert.ok(proposal.requirements.fixtures.includes("forge"));
  assert.ok(proposal.requirements.safety.includes("fire clearance from homes"));
  assert.deepEqual(proposal.requirements.outputs, [
    "tools",
    "hardware",
    "weapons",
    "repairs",
  ]);
  assert.equal(
    state.village.jobs.some((job) => job.plan?.proposalId === proposal.id),
    false,
  );
  const unity = rogueUnityView(state),
    unityProposal = unity.villageDevelopment.strategyBoard.proposalQueue.find(
      (candidate) => candidate.id === proposal.id,
    );
  assert.equal(unityProposal.demand.status, "demonstrated");
  assert.ok(unityProposal.requirements.fixtures.includes("forge"));
  assert.ok(unity.legalIntents.includes("revise_village_proposal"));
  assert.deepEqual(auditVillageStrategy(state).violations, []);
});

test("R1 a smith commission becomes an architect-approved, physically operating forge", () => {
  let state = villageState();
  state.village.buildings = state.village.buildings.filter(
    (building) => !["smithy", "forge"].includes(building.key),
  );
  state.village.facilities = state.village.facilities.filter(
    (facility) => !["smithy", "forge"].includes(facility),
  );
  stock(state, "lumber_yard_lumber").quantity = 500;
  stock(state, "lumber_yard_lumber").capacity = 600;
  stock(state, "lumber_camp_logs").capacity = 600;
  stock(state, "quarry_stone").quantity = 300;
  stock(state, "quarry_stone").capacity = 300;

  advance(state);
  const proposal = state.village.development.strategyBoard.proposalQueue.find(
      (candidate) => candidate.projectKey === "specialist_forge",
    ),
    decisionTick = state.tick;
  applyRogueTurn(state, {
    kind: "decide_village_proposal",
    proposalId: proposal.id,
    outcome: "approved",
    reason: "The demonstrated tool demand justifies a dedicated forge.",
  });
  assert.equal(state.tick, decisionTick);

  let plan;
  for (let turn = 0; turn < 40; turn += 1) {
    expediteVillageJobs(state, (job) => job.plan?.architectSurvey);
    advance(state);
    plan = state.village.development.architectPlans.find(
      (candidate) => candidate.projectKey === "specialist_forge",
    );
    if (plan?.status === "awaiting_approval") break;
  }
  const commission = state.village.development.strategyBoard.commissions.find(
      (candidate) => candidate.proposalId === proposal.id,
    ),
    architect = resident(state, "farmer");
  assert.equal(plan.status, "awaiting_approval");
  assert.equal(plan.architectActorId, architect.id);
  assert.equal(commission.assignments.architect.actorId, architect.id);
  assert.equal(plan.alternatives.length, 3);
  assert.deepEqual(
    plan.alternatives.map((alternative) => alternative.rank),
    [1, 2, 3],
  );
  assert.ok(
    plan.alternatives.every(
      (alternative) =>
        alternative.status === "surveyed" &&
        alternative.billOfMaterials.lumber <=
          commission.budget.materials.lumber &&
        alternative.billOfMaterials.stone <=
          commission.budget.materials.stone &&
        alternative.billOfMaterials.laborUnits <=
          commission.budget.laborUnits &&
        alternative.reasons.length >= 3,
    ),
  );
  assert.equal(
    state.village.jobs.some(
      (job) =>
        job.jobType === "build_specialist_facility" &&
        job.plan?.commissionId === commission.id,
    ),
    false,
  );
  assert.equal(
    state.village.development.constructionSites.some(
      (site) => site.architectPlanId === plan.id,
    ),
    false,
  );

  state = parseRogueState(serializeRogueState(state));
  plan = state.village.development.architectPlans.find(
    (candidate) => candidate.id === plan.id,
  );
  const selected = plan.alternatives.find(
      (alternative) => alternative.id === plan.recommendedAlternativeId,
    ),
    approvalTick = state.tick;
  assert.ok(selected.assessment.treeCells.length > 0);
  applyRogueTurn(state, {
    kind: "decide_architect_plan",
    planId: plan.id,
    alternativeId: selected.id,
    outcome: "approved",
    reason: "Approve the best road access and fire-clearance balance.",
  });
  assert.equal(state.tick, approvalTick);
  assert.equal(plan.status, "approved");
  assert.equal(plan.selectedAlternativeId, selected.id);
  assert.ok(
    state.village.development.workOrders.some(
      (order) =>
        order.architectPlanId === plan.id &&
        order.issuedByActorId === reeve(state).id,
    ),
  );

  let sawSiteClearing = false,
    maxParallelClearing = 0;
  for (let turn = 0; turn < 240; turn += 1) {
    expediteVillageJobs(state, (job) => job.plan?.architectPlanId === plan.id);
    advance(state);
    sawSiteClearing ||= state.village.jobs.some(
      (job) =>
        job.jobType === "clear_building_site" &&
        job.plan?.architectPlanId === plan.id,
    );
    maxParallelClearing = Math.max(
      maxParallelClearing,
      state.village.jobs.filter(
        (job) =>
          job.jobType === "clear_building_site" &&
          job.plan?.architectPlanId === plan.id &&
          !["completed", "cancelled"].includes(job.status),
      ).length,
    );
    const cleared = selected.assessment.treeCells.every((position) =>
      state.village.modifications.some(
        (item) =>
          item.kind === "tree_stump" &&
          item.x === position.x &&
          item.y === position.y,
      ),
    );
    if (cleared) break;
  }
  assert.equal(sawSiteClearing, true);
  assert.ok(maxParallelClearing >= 2);
  assert.ok(
    selected.assessment.treeCells.every((position) =>
      state.village.modifications.some(
        (item) =>
          item.kind === "tree_stump" &&
          item.x === position.x &&
          item.y === position.y,
      ),
    ),
  );
  advance(state);
  const build = state.village.jobs.find(
    (job) =>
      job.jobType === "build_specialist_facility" &&
      job.plan?.architectPlanId === plan.id,
  );
  assert.ok(build);
  assert.equal(build.plan.architectAlternativeId, selected.id);

  let injectedInspectionDefect = false;
  for (let turn = 0; turn < 800; turn += 1) {
    if (
      build.plan.commissioning?.status === "architect_pending" &&
      !injectedInspectionDefect
    ) {
      const wall = build.plan.constructionWork.elements.find(
        (element) => element.kind === "wall",
      );
      assert.equal(damageConstructionEntity(state, wall.id, 25), true);
      injectedInspectionDefect = true;
    }
    for (const element of build.plan.constructionWork.elements)
      if (element.status !== "complete")
        element.laborCompleted = Math.max(
          element.laborCompleted,
          element.laborRequired - 0.6,
        );
    expediteVillageJobs(
      state,
      (job) =>
        job.id === build.id ||
        job.plan?.parentJobId === build.id ||
        job.plan?.commissionId === commission.id,
    );
    advance(state);
    if (state.village.facilities.includes("forge")) break;
  }
  stock(state, "smithy_supplies").quantity = 1;
  advance(state);
  const constructionInput = build.production.inputs.find(
      (input) => input.stockpileKey === "quarry_stone",
    ),
    deliveredMaterials = state.village.constructionMaterials.filter(
      (material) => material.projectId === build.id,
    ),
    doorInput = build.production.inputs.find(
      (input) => input.stockpileKey === "lumber_yard_lumber",
    ),
    forge = state.village.buildings.find(
      (building) => building.key === "forge" && building.status === "complete",
    ),
    fixtureRoles = new Set(
      state.village.fixtures
        .filter((fixture) => fixture.buildingId === forge?.id)
        .map((fixture) => fixture.role),
    ),
    restoredCommission =
      state.village.development.strategyBoard.commissions.find(
        (candidate) => candidate.id === commission.id,
      ),
    craftJob = state.village.jobs.find(
      (job) =>
        job.jobType === "craft_weapon" && !["cancelled"].includes(job.status),
    );
  assert.equal(constructionInput.deliveredQuantity, constructionInput.quantity);
  assert.equal(constructionInput.itemKind, "stone");
  assert.equal(doorInput.itemKind, "building_lumber");
  assert.equal(
    deliveredMaterials
      .filter((material) => material.itemKind === "stone")
      .reduce((total, material) => total + material.quantity, 0),
    constructionInput.quantity,
  );
  assert.ok(
    build.plan.constructionWork.elements.every(
      (element) => element.materialDelivered && element.status === "complete",
    ),
  );
  assert.ok(forge);
  assert.equal(forge.roofed, true);
  assert.ok(
    state.village.constructionPrimitives.some(
      (primitive) =>
        primitive.projectKey === forge.key && primitive.kind === "roof",
    ),
  );
  assert.deepEqual([...fixtureRoles].sort(), [
    "anvil",
    "forge",
    "fuel_storage",
    "material_storage",
    "workbench",
  ]);
  assert.equal(restoredCommission.status, "operating");
  assert.equal(restoredCommission.planning.status, "operating");
  assert.equal(build.plan.commissioning.status, "approved");
  assert.ok(build.plan.commissioning.cycle >= 2);
  assert.ok(
    state.village.jobs.some(
      (job) => job.plan?.facilityRepair && job.status === "completed",
    ),
  );
  assert.equal(
    state.village.jobs.filter(
      (job) => job.plan?.finalInspectionDuty && job.status === "completed",
    ).length,
    3,
  );
  assert.equal(
    restoredCommission.budgetUsage.laborUnits,
    selected.billOfMaterials.laborUnits,
  );
  assert.equal(restoredCommission.budgetUsage.status, "within_budget");
  assert.ok(craftJob);
  assert.deepEqual(craftJob.targetPosition, {
    x: [...state.village.fixtures].find(
      (fixture) => fixture.buildingId === forge.id && fixture.role === "forge",
    ).x,
    y: [...state.village.fixtures].find(
      (fixture) => fixture.buildingId === forge.id && fixture.role === "forge",
    ).y,
  });
  assert.deepEqual(auditVillageStrategy(state).violations, []);
  assert.deepEqual(auditVillageStrategy(state).pendingGates, []);
  const final = parseRogueState(serializeRogueState(state));
  assert.equal(
    final.village.development.architectPlans.find(
      (candidate) => candidate.id === plan.id,
    ).selectedAlternativeId,
    selected.id,
  );
});

test("V3 a requested architect revision creates a fresh survey plan without a blueprint", () => {
  const state = villageState();
  state.village.buildings = state.village.buildings.filter(
    (building) => !["smithy", "forge"].includes(building.key),
  );
  state.village.facilities = state.village.facilities.filter(
    (facility) => !["smithy", "forge"].includes(facility),
  );
  advance(state);
  const proposal = state.village.development.strategyBoard.proposalQueue.find(
    (candidate) => candidate.projectKey === "specialist_forge",
  );
  applyRogueTurn(state, {
    kind: "decide_village_proposal",
    proposalId: proposal.id,
    outcome: "approved",
    reason: "Survey a forge site.",
  });
  let original;
  for (let turn = 0; turn < 40; turn += 1) {
    expediteVillageJobs(state, (job) => job.plan?.architectSurvey);
    advance(state);
    original = state.village.development.architectPlans[0];
    if (original?.status === "awaiting_approval") break;
  }
  applyRogueTurn(state, {
    kind: "decide_architect_plan",
    planId: original.id,
    outcome: "revision_requested",
    reason: "Find a site with a different delivery approach.",
  });
  advance(state);
  const revision = state.village.development.architectPlans.find(
    (candidate) => candidate.id !== original.id,
  );
  assert.equal(original.status, "revision_requested");
  assert.ok(revision);
  assert.equal(revision.revision, 2);
  assert.equal(revision.status, "surveying");
  assert.notEqual(revision.id, original.id);
  assert.equal(
    state.village.development.constructionSites.some(
      (site) =>
        site.architectPlanId === original.id ||
        site.architectPlanId === revision.id,
    ),
    false,
  );
  assert.equal(
    state.village.jobs.some(
      (job) => job.jobType === "build_specialist_facility",
    ),
    false,
  );
});

test("V2 rejected specialist proposals revise and resubmit as linked immutable revisions", () => {
  const state = villageState();
  state.village.buildings = state.village.buildings.filter(
    (building) => building.key !== "smithy",
  );
  advance(state);
  const board = state.village.development.strategyBoard,
    first = board.proposalQueue.find(
      (candidate) => candidate.projectKey === "specialist_forge",
    ),
    tick = state.tick;
  applyRogueTurn(state, {
    kind: "decide_village_proposal",
    proposalId: first.id,
    outcome: "rejected",
    reason: "Move the fuel store farther from the homes.",
  });
  assert.equal(state.tick, tick);
  assert.equal(first.status, "rejected");
  assert.throws(
    () =>
      decideVillageProposal(state, {
        proposalId: first.id,
        outcome: "approved",
        reason: "Approve the old revision anyway.",
      }),
    /revised and resubmitted/,
  );
  applyRogueTurn(state, {
    kind: "revise_village_proposal",
    proposalId: first.id,
    reason:
      "Fuel storage and fire clearance will be reconsidered by the architect.",
  });
  assert.equal(state.tick, tick);
  const second = board.proposalQueue.find(
    (candidate) => candidate.previousProposalId === first.id,
  );
  assert.equal(first.status, "superseded");
  assert.equal(first.supersededByProposalId, second.id);
  assert.equal(second.status, "submitted");
  assert.equal(second.revision, 2);
  assert.equal(second.proposalSeriesId, first.proposalSeriesId);
  assert.equal(second.latestDecisionId, null);
  assert.equal(second.commissionId, null);
  const restored = parseRogueState(serializeRogueState(state)),
    restoredSecond =
      restored.village.development.strategyBoard.proposalQueue.find(
        (candidate) => candidate.id === second.id,
      );
  assert.equal(restoredSecond.previousProposalId, first.id);
  assert.match(restoredSecond.revisionReason, /fire clearance/);
  assert.deepEqual(auditVillageStrategy(restored).violations, []);
});

test("V2 mill authorization unlocks bakery demand and starts architect surveys", () => {
  const state = villageState();
  stock(state, "farm_grain").quantity = 12;
  stock(state, "inn_meals").quantity = 0;
  advance(state);
  const board = state.village.development.strategyBoard,
    mill = board.proposalQueue.find(
      (proposal) => proposal.projectKey === "specialist_mill",
    );
  assert.ok(mill);
  assert.equal(
    board.proposalQueue.some(
      (proposal) => proposal.projectKey === "specialist_bakery",
    ),
    false,
  );
  const tick = state.tick;
  applyRogueTurn(state, {
    kind: "decide_village_proposal",
    proposalId: mill.id,
    outcome: "approved",
    reason: "The grain surplus proves a mill can remain supplied.",
  });
  assert.equal(state.tick, tick);
  advance(state);
  const bakery = board.proposalQueue.find(
      (proposal) => proposal.projectKey === "specialist_bakery",
    ),
    millCommission = board.commissions.find(
      (commission) => commission.proposalId === mill.id,
    );
  assert.ok(bakery);
  assert.equal(bakery.demand.status, "demonstrated");
  assert.equal(bakery.requesterPersonKey, "baker");
  assert.ok(bakery.requirements.fixtures.includes("oven"));
  assert.ok(millCommission);
  assert.equal(millCommission.projectId, null);
  assert.equal(
    millCommission.planning.architectActorId,
    resident(state, "farmer").id,
  );
  assert.equal(millCommission.planning.status, "surveying");
  assert.ok(
    state.village.development.architectPlans.some(
      (plan) =>
        plan.commissionId === millCommission.id && plan.status === "surveying",
    ),
  );
  assert.equal(
    state.village.jobs.some(
      (job) =>
        job.type === "build_specialist_facility" &&
        job.plan?.commissionId === millCommission.id,
    ),
    false,
  );
});

test("V2 specialist demand covers care, carpentry, storage, milling, and hospitality", () => {
  const state = villageState();
  state.village.buildings = state.village.buildings.filter(
    (building) => !["apothecary", "inn"].includes(building.key),
  );
  state.hero.hp -= 1;
  stock(state, "lumber_yard_lumber").quantity = 24;
  stock(state, "farm_grain").quantity = 12;
  stock(state, "inn_meals").quantity = state.village.npcStates.length * 3;
  state.village.residences.push({
    id: "v2-demand-housing",
    status: "complete",
    residentCapacity: state.village.npcStates.length,
  });
  updateVillageDevelopment(state, []);
  const specialistKeys = new Set(
    state.village.development.strategyBoard.proposalQueue
      .filter((proposal) => proposal.proposalKind === "specialist")
      .map((proposal) => proposal.projectKey),
  );
  for (const projectKey of [
    "specialist_mill",
    "specialist_infirmary",
    "specialist_carpenter",
    "specialist_granary",
    "specialist_inn",
  ])
    assert.ok(specialistKeys.has(projectKey), `${projectKey} was not proposed`);
  assert.equal(specialistKeys.has("specialist_bakery"), false);
  assert.deepEqual(auditVillageStrategy(state).violations, []);
});

test("M-11 trees become stored logs, a yard, and usable lumber", () => {
  const state = villageState();
  for (let turn = 0; turn < 3600; turn += 1) {
    expediteCurrentWork(state);
    advance(state);
    if (
      state.village.facilities.includes("lumber_yard") &&
      stock(state, "lumber_yard_lumber").quantity >= 2
    )
      break;
  }
  assert.ok(
    state.village.modifications.some((item) => item.kind === "tree_stump"),
  );
  assert.ok(state.village.facilities.includes("lumber_yard"));
  assert.ok(stock(state, "lumber_yard_lumber").quantity >= 2);
  assert.ok(woodcutter(state).skillPractice.forestry > 0);
  assert.equal(
    state.village.development.projects.find(
      (project) => project.key === "lumber_yard",
    ).status,
    "complete",
  );
});

function cropMealBatch(state) {
  const cropBatchIds = new Set(
    state.village.foodLedger.batches
      .filter((batch) => batch.originType === "crop_harvest")
      .map((batch) => batch.id),
  );
  return state.village.foodLedger.batches.find(
    (batch) =>
      batch.itemKind === "hearty_meal" &&
      batch.sourceBatchIds.some((id) => cropBatchIds.has(id)),
  );
}

test("M-11 an established farm grows crops and tends individual cattle", () => {
  const state = villageState();
  state.village.facilities.push("lumber_yard", "farmstead");
  ensureVillageFoodSystem(state);
  const grainPlot = state.village.cropPlots.find(
      (plot) => plot.cropKind === "grain",
    ),
    grainStore = stock(state, "farm_grain"),
    grainZone = reconcileVillageStorage(state).zones.find(
      (zone) => zone.containerId === grainStore.containerId,
    ),
    chosenGrainCell = grainZone.cells.at(-1);
  applyRogueTurn(state, {
    kind: "set_crop_plan",
    action: "set_destination",
    targetId: grainPlot.id,
    objectId: chosenGrainCell.id,
  });
  let maturityWindowElapsed = false;
  for (let turn = 0; turn < 3000; turn += 1) {
    for (const actor of [
      resident(state, "farmer"),
      resident(state, "herder"),
      resident(state, "innkeeper"),
    ]) {
      for (const need of Object.keys(actor.life.needs))
        actor.life.needs[need] = 100;
      const job = state.village.jobs.find(
        (candidate) =>
          candidate.assignedActorId === actor.id &&
          ["reserved", "active"].includes(candidate.status),
      );
      if (job?.destination) actor.position = { ...job.destination };
    }
    advance(state);
    const planted = state.village.cropPlots.filter((plot) =>
      ["germinating", "growing"].includes(plot.stage),
    );
    if (!maturityWindowElapsed && planted.length >= 2) {
      planted[0].cropDamage = 20;
      planted[0].cropDisease = "drought_wilt";
      state.tick += 4800;
      state.village.clock.day += 2;
      advanceCropGrowth(state);
      maturityWindowElapsed = true;
    }
    if (
      state.village.facilities.includes("farmstead") &&
      stock(state, "farm_grain").quantity > 0 &&
      stock(state, "farm_vegetables").quantity > 0 &&
      stock(state, "dairy_milk").quantity > 0 &&
      cropMealBatch(state)
    )
      break;
  }
  assert.ok(state.village.facilities.includes("farmstead"));
  assert.ok(stock(state, "farm_seed").quantity < 6);
  assert.ok(stock(state, "farm_grain").quantity > 0);
  assert.ok(stock(state, "farm_vegetables").quantity > 0);
  assert.ok(stock(state, "dairy_milk").quantity > 0);
  const cropMeal = cropMealBatch(state),
    sourceHarvest = state.village.foodLedger.batches.find((batch) =>
      cropMeal?.sourceBatchIds.includes(batch.id),
    );
  assert.ok(cropMeal);
  assert.ok(sourceHarvest?.sourceBatchIds.length > 0);
  const harvestPiles = state.village.stockpiles.filter(
    (item) => item.containerKind === "field_pile",
  );
  assert.ok(harvestPiles.length >= 2);
  const restoredPiles = parseRogueState(
    serializeRogueState(state),
  ).village.stockpiles.filter((item) => item.containerKind === "field_pile");
  assert.deepEqual(
    restoredPiles.map(({ id, quantity }) => ({ id, quantity })),
    harvestPiles.map(({ id, quantity }) => ({ id, quantity })),
  );
  assert.ok(
    harvestPiles.every((pile) =>
      state.village.foodLedger.transactions.some(
        (entry) =>
          entry.type === "food_produced" && entry.stockpileId === pile.id,
      ),
    ),
  );
  assert.ok(
    harvestPiles.every((pile) => {
      const plot = state.village.cropPlots.find(
        (candidate) => candidate.id === pile.cropPlotId,
      );
      return (
        (plot?.lastYield ?? 0) > 0 &&
        plot.lastFarmerId === resident(state, "farmer").id &&
        plot.lastFarmerSkill <= resident(state, "farmer").skills.farming
      );
    }),
  );
  assert.ok(
    state.village.jobs.some(
      (job) =>
        job.jobType === "haul_stock" &&
        harvestPiles.some(
          (pile) => pile.id === job.transfer?.sourceStockpileId,
        ) &&
        job.status === "completed",
    ),
  );
  const routedPile = harvestPiles.find(
      (pile) => pile.cropPlotId === grainPlot.id,
    ),
    routedHaul = state.village.jobs.find(
      (job) =>
        job.jobType === "haul_stock" &&
        job.transfer?.sourceStockpileId === routedPile?.id &&
        job.status === "completed",
    );
  assert.equal(routedPile.harvestDestinationCellId, chosenGrainCell.id);
  assert.equal(routedHaul.plan.storageDestination.cellId, chosenGrainCell.id);
  assert.ok(livingAnimals(state, "cow").length >= 2);
  const animalIds = new Set(state.village.animals.map((animal) => animal.id));
  assert.ok(
    state.village.jobs
      .filter((job) => job.jobType.endsWith("_cattle"))
      .every((job) => animalIds.has(job.targetId)),
  );
  assert.equal(stock(state, "pasture_cattle"), undefined);
  assert.ok(resident(state, "farmer").skillPractice.farming > 0);
  assert.ok(resident(state, "herder").skillPractice.animal_husbandry > 0);
  assert.ok(
    state.village.foodLedger.transactions.some(
      (entry) => entry.type === "field_watered",
    ),
  );
  assert.ok(
    state.village.foodLedger.transactions.some(
      (entry) => entry.type === "crop_treated",
    ),
  );
});

test("R8.3 a farm replenishes finite animal feed from conserved grain", () => {
  const state = villageState(),
    grain = stock(state, "farm_grain"),
    feed = stock(state, "stable_feed");
  state.village.facilities.push("lumber_yard", "farmstead");
  grain.quantity = 12;
  feed.quantity = 19;
  for (let turn = 0; turn < 400; turn += 1) {
    expediteVillageJobs(state, (job) => job.jobType === "prepare_animal_feed");
    advance(state);
    if (
      state.village.jobs.some(
        (job) =>
          job.jobType === "prepare_animal_feed" && job.status === "completed",
      )
    )
      break;
  }
  assert.equal(grain.quantity, 10);
  const consumed = state.village.animalHusbandryLedger.reduce(
    (total, entry) => total + entry.consumed,
    0,
  );
  assert.equal(feed.quantity, 29 - consumed);
  assert.ok(resident(state, "herder").skillPractice.animal_husbandry > 0);
});

test("R8.3 a herder visibly draws finite trough water", () => {
  const state = villageState(),
    water = stock(state, "stable_water");
  state.village.facilities.push("lumber_yard", "farmstead");
  water.quantity = 0;
  for (let turn = 0; turn < 400; turn += 1) {
    expediteVillageJobs(state, (job) => job.jobType === "draw_stable_water");
    advance(state);
    if (
      state.village.jobs.some(
        (job) =>
          job.jobType === "draw_stable_water" && job.status === "completed",
      )
    )
      break;
  }
  const job = state.village.jobs.find(
    (candidate) => candidate.jobType === "draw_stable_water",
  );
  assert.equal(job.status, "completed");
  assert.deepEqual(job.targetPosition, { x: 0, y: 16 });
  assert.ok(water.quantity > 0);
  assert.ok(resident(state, "herder").skillPractice.animal_husbandry > 0);
});

test("R8.3 animal survival work starts before farm commissioning", () => {
  const state = villageState(),
    water = stock(state, "stable_water"),
    feed = stock(state, "stable_feed"),
    forage = stock(state, "wild_forage");
  water.quantity = 0;
  feed.quantity = 0;
  forage.quantity = 4;
  advance(state);
  const open = state.village.jobs.filter(
    (job) => !["completed", "cancelled"].includes(job.status),
  );
  assert.ok(open.some((job) => job.jobType === "draw_stable_water"));
  assert.ok(open.some((job) => job.jobType === "prepare_emergency_fodder"));
  assert.ok(!state.village.facilities.includes("farmstead"));
});

test("R8.3 a herder reaches and treats a sick animal with finite medicine", () => {
  const state = villageState(),
    animal = livingAnimals(state, "cow")[0],
    remedies = stock(state, "apothecary_remedies"),
    herder = resident(state, "herder");
  remedies.quantity = 2;
  const remediesBefore = remedies.quantity,
    practiceBefore = herder.skillPractice.animal_husbandry ?? 0;
  state.village.facilities.push("lumber_yard", "farmstead");
  infectAnimal(state, animal, "hoof_rot");
  for (let turn = 0; turn < 600; turn += 1) {
    expediteVillageJobs(state, (job) => job.jobType === "treat_sick_cow");
    advance(state);
    if (
      state.village.jobs.some(
        (job) => job.jobType === "treat_sick_cow" && job.status === "completed",
      )
    )
      break;
  }
  const job = state.village.jobs.find(
    (candidate) =>
      candidate.jobType === "treat_sick_cow" &&
      candidate.status === "completed",
  );
  assert.ok(
    job,
    JSON.stringify({
      day: state.village.clock.day,
      disease: animal.disease,
      remedies: remedies.quantity,
      herderAction: herder.currentAction,
      herderPosition: herder.position,
      jobs: state.village.jobs
        .filter(
          (candidate) =>
            candidate.jobType.startsWith("treat_sick_") ||
            candidate.assignedActorId === herder.id,
        )
        .map((candidate) => ({
          type: candidate.jobType,
          status: candidate.status,
          step: candidate.plan?.step,
          block: candidate.blockingReason,
          target: candidate.targetId,
        })),
    }),
  );
  assert.equal(job.targetId, animal.id);
  assert.equal(animal.disease.treatedDay, state.village.clock.day);
  assert.equal(remedies.quantity, remediesBefore - 1);
  assert.ok(herder.skillPractice.animal_husbandry > practiceBefore);
  assert.ok(
    state.village.animalDiseaseLedger.some(
      (entry) => entry.type === "treatment" && entry.animalId === animal.id,
    ),
  );
});

test("R8.3 housed livestock produce bounded eggs, wool, and manure", () => {
  const state = villageState(),
    stable = specialistFacilityPlan("specialist_stable"),
    elements = constructionElements(stable).map((element, index) => ({
      ...element,
      id: namedUuid(state.id, `production-stable:${index}`),
    })),
    jobTypes = new Set(["collect_eggs", "shear_sheep", "collect_manure"]);
  installAnimalHousingSites(state, stable, elements);
  state.village.architectureDirty = false;
  state.village.facilities.push("lumber_yard", "farmstead", "stable");
  for (let turn = 0; turn < 3600; turn += 1) {
    expediteVillageJobs(state, (job) => jobTypes.has(job.jobType));
    advance(state);
    if (
      ["farm_eggs", "sheep_wool", "farm_manure"].every(
        (key) => stock(state, key).quantity > 0,
      )
    )
      break;
  }
  assert.ok(
    stock(state, "farm_eggs").quantity > 0,
    JSON.stringify(
      state.village.jobs
        .filter((job) => job.jobType.startsWith("relocate_"))
        .map((job) => ({
          type: job.jobType,
          status: job.status,
          step: job.plan.step,
          block: job.blockingReason,
          relocation: job.plan.animalRelocation,
          destination: job.plan.relocationDestination,
        })),
    ),
  );
  assert.ok(
    stock(state, "sheep_wool").quantity > 0,
    JSON.stringify(
      state.village.jobs
        .filter((job) => jobTypes.has(job.jobType))
        .map((job) => ({
          type: job.jobType,
          status: job.status,
          block: job.blockingReason,
          target: job.targetPosition,
        })),
    ),
  );
  assert.ok(stock(state, "farm_manure").quantity > 0);
  assert.ok(
    state.village.jobs
      .filter((job) => jobTypes.has(job.jobType) && job.status === "completed")
      .every((job) => job.plan.animalTarget),
  );
});

test("R8.3 a farmer consumes manure to restore fallow-field fertility", () => {
  const state = villageState();
  state.village.facilities.push("lumber_yard", "farmstead");
  ensureVillageFoodSystem(state);
  const plot = state.village.cropPlots[0];
  Object.assign(plot, { stage: "fallow", fertility: 40 });
  stock(state, "farm_manure").quantity = 1;
  for (let turn = 0; turn < 300; turn += 1) {
    expediteVillageJobs(state, (job) => job.jobType === "fertilize_fields");
    advance(state);
    if (plot.manureApplications > 0) break;
  }
  assert.equal(plot.manureApplications, 1);
  assert.equal(plot.fertility, 60);
  assert.equal(stock(state, "farm_manure").quantity, 0);
  assert.ok(
    state.village.foodLedger.transactions.some(
      (entry) => entry.type === "field_fertilized" && entry.plotId === plot.id,
    ),
  );
});

test("R8.3 a herder visibly leads an animal into permanent housing", () => {
  const state = villageState(),
    stable = specialistFacilityPlan("specialist_stable"),
    elements = constructionElements(stable).map((element, index) => ({
      ...element,
      id: namedUuid(state.id, `relocation-stable:${index}`),
    })),
    pig = livingAnimals(state, "pig")[0],
    positions = new Set([`${pig.position.x},${pig.position.y}`]),
    eventTypes = [];
  installAnimalHousingSites(state, stable, elements);
  state.village.architectureDirty = false;
  state.village.facilities.push("lumber_yard", "farmstead", "stable");
  const destinationSiteId = pig.pendingPastureId;
  for (let turn = 0; turn < 800 && pig.pendingPastureId; turn += 1) {
    for (const actor of state.village.npcStates)
      for (const need of Object.keys(actor.life.needs))
        actor.life.needs[need] = 100;
    const result = applyRogueTurn(state, { kind: "wait" });
    positions.add(`${pig.position.x},${pig.position.y}`);
    eventTypes.push(...result.events.map((event) => event.type));
  }
  const site = state.village.pastures.find(
    (pasture) => pasture.id === destinationSiteId,
  );
  assert.equal(pig.homePastureId, site.id);
  assert.equal(pig.pendingPastureId, null);
  assert.ok(positions.size > 8);
  assert.ok(eventTypes.includes("animal_led"));
  assert.ok(eventTypes.includes("animal_relocated"));
  assert.ok(pig.position.x > site.x && pig.position.x < site.x + site.w - 1);
  assert.ok(pig.position.y > site.y && pig.position.y < site.y + site.h - 1);
});

test("R8.3 collected eggs become traceable cooked meals", () => {
  const state = villageState(),
    stable = specialistFacilityPlan("specialist_stable"),
    elements = constructionElements(stable).map((element, index) => ({
      ...element,
      id: namedUuid(state.id, `egg-meal-stable:${index}`),
    }));
  installAnimalHousingSites(state, stable, elements);
  state.village.architectureDirty = false;
  state.village.facilities.push("lumber_yard", "farmstead", "stable");
  for (const key of [
    "inn_meals",
    "inn_fish",
    "farm_grain",
    "farm_vegetables",
    "pasture_meat",
  ])
    stock(state, key).quantity = 0;
  for (
    let turn = 0;
    turn < 3600 && stock(state, "farm_eggs").quantity < 2;
    turn += 1
  ) {
    expediteVillageJobs(state, (job) => job.jobType === "collect_eggs");
    advance(state);
  }
  stock(state, "inn_meals").quantity = 0;
  for (const key of [
    "inn_fish",
    "farm_grain",
    "farm_vegetables",
    "pasture_meat",
  ])
    stock(state, key).quantity = 0;
  for (let turn = 0; turn < 600; turn += 1) {
    if (!state.village.jobs.some((job) => job.jobType === "cook_egg_meal"))
      stock(state, "inn_meals").quantity = 0;
    expediteVillageJobs(state, (job) => job.jobType === "cook_egg_meal");
    advance(state);
    if (
      state.village.jobs.some(
        (job) => job.jobType === "cook_egg_meal" && job.status === "completed",
      )
    )
      break;
  }
  const cooked = state.village.jobs.find(
    (job) => job.jobType === "cook_egg_meal" && job.status === "completed",
  );
  assert.ok(
    cooked,
    JSON.stringify({
      eggs: stock(state, "farm_eggs").quantity,
      meals: stock(state, "inn_meals").quantity,
      jobs: state.village.jobs
        .filter((job) =>
          ["relocate_chicken", "collect_eggs", "cook_egg_meal"].includes(
            job.jobType,
          ),
        )
        .map((job) => ({
          type: job.jobType,
          status: job.status,
          step: job.plan.step,
          block: job.blockingReason,
        })),
    }),
  );
  assert.ok(stock(state, "inn_meals").quantity >= 2);
  assert.ok(cooked.plan.foodInputBatchIds.length > 0);
});

test("R4 a skilled hunter turns persistent wild game into traceable meat", () => {
  const state = villageState(),
    hunter = resident(state, "fisher"),
    meat = stock(state, "pasture_meat"),
    deerBefore = livingAnimals(state, "deer").length;
  meat.quantity = 0;
  stock(state, "hunting_bows").quantity = 1;
  for (let turn = 0; turn < 600; turn += 1) {
    expediteVillageJobs(state, (job) => job.jobType === "hunt_game");
    advance(state);
    if (
      state.village.jobs.some(
        (job) => job.jobType === "hunt_game" && job.status === "completed",
      )
    )
      break;
  }
  assert.equal(livingAnimals(state, "deer").length, deerBefore - 1);
  assert.equal(
    state.village.animals.find(
      (animal) => animal.species === "deer" && animal.status === "dead",
    ).carcassState,
    "dressed",
  );
  assert.equal(meat.quantity, 4);
  assert.ok(hunter.skillPractice.hunting > 0);
  assert.ok(
    state.village.foodLedger.transactions.some(
      (entry) =>
        entry.type === "food_produced" && entry.originType === "hunting",
    ),
  );
});

test("R4 emergency gathering supplies weak food only below a one-day reserve", () => {
  const state = newRogueRun({
      ...input,
      requestId: "r4-emergency-forage",
      runId: "7be8fccf-8455-4d72-9330-17763c7a8999",
      scenario: "founding",
    }),
    herbalist = resident(state, "herbalist"),
    forage = stock(state, "wild_forage"),
    durableFoodKeys = [
      "inn_meals",
      "farm_grain",
      "farm_vegetables",
      "dairy_milk",
      "pasture_meat",
    ];
  for (const key of durableFoodKeys) stock(state, key).quantity = 0;
  forage.quantity = 0;
  const ripeBefore = state.village.foragePatches.filter(
    (patch) => patch.stage === "ripe",
  ).length;

  for (let turn = 0; turn < 400; turn += 1) {
    expediteVillageJobs(state, (job) => job.jobType === "gather_wild_food");
    advance(state);
    if (
      state.village.jobs.some(
        (job) =>
          job.jobType === "gather_wild_food" && job.status === "completed",
      )
    )
      break;
  }

  const completedGathering = state.village.jobs.filter(
    (job) => job.jobType === "gather_wild_food" && job.status === "completed",
  );
  assert.ok(forage.quantity >= 1);
  assert.equal(
    state.village.foragePatches.filter((patch) => patch.stage === "ripe")
      .length,
    ripeBefore - completedGathering.length,
  );
  assert.ok(completedGathering.length >= 2);
  assert.ok(herbalist.skillPractice.foraging > 0);
  assert.ok(
    state.village.foodLedger.transactions.some(
      (entry) =>
        entry.type === "food_produced" && entry.originType === "foraging",
    ),
  );
  assert.equal(
    state.village.jobs.find(
      (job) => job.jobType === "gather_wild_food" && job.status === "completed",
    ).reason,
    "starvation_reserve_below_one_day",
  );

  stock(state, "farm_grain").quantity = state.village.npcStates.length;
  advance(state);
  assert.equal(
    state.village.jobs.filter(
      (job) =>
        job.jobType === "gather_wild_food" &&
        !["completed", "cancelled"].includes(job.status),
    ).length,
    0,
  );

  const hungry = resident(state, "reeve");
  hungry.life.needs.hunger = 20;
  advance(state);
  const emergencyMeal = state.village.jobs.find(
    (job) => job.jobType === "eat_meal" && job.plan.ownerActorId === hungry.id,
  );
  assert.equal(emergencyMeal.plan.foodStockpileKey, "wild_forage");
  assert.equal(emergencyMeal.plan.needGainMultiplier, 0.5);
  assert.equal(emergencyMeal.name, "Eat gathered wild food");
});

test("M-11 an undersupplied farm keeps forestry and sawing authorized", () => {
  const state = villageState();
  state.village.facilities.push("lumber_yard");
  stock(state, "lumber_camp_logs").quantity = 5;
  stock(state, "lumber_yard_lumber").quantity = 12;
  advance(state);
  assert.equal(state.village.development.activePriority, "food_security");
  for (const jobType of ["fell_tree", "saw_lumber", "build_farmstead"])
    assert.ok(
      state.village.jobs.some((job) => job.jobType === jobType),
      `${jobType} should remain authorized`,
    );
});

test("M-11 eating consumes one prepared meal", () => {
  const state = villageState(),
    pilgrim = resident(state, "pilgrim"),
    meals = stock(state, "inn_meals");
  meals.quantity = 1;
  for (const actor of state.village.npcStates)
    for (const need of Object.keys(actor.life.needs))
      actor.life.needs[need] = 100;
  pilgrim.life.needs.hunger = 1;
  for (let turn = 0; turn < 80 && meals.quantity; turn += 1) advance(state);
  assert.equal(meals.quantity, 0);
  assert.ok(pilgrim.life.needs.hunger > 1);
});

test("M-11 eating reserves one meal for the whole eating job", () => {
  const state = villageState(),
    pilgrim = resident(state, "pilgrim"),
    meals = stock(state, "inn_meals");
  meals.quantity = 10;
  for (const actor of state.village.npcStates)
    for (const need of Object.keys(actor.life.needs))
      actor.life.needs[need] = 100;
  pilgrim.life.needs.hunger = 1;
  let satisfied = false;
  for (let turn = 0; turn < 80 && !satisfied; turn += 1) {
    const job = state.village.jobs.find(
      (candidate) =>
        candidate.plan?.ownerActorId === pilgrim.id &&
        ["reserved", "active"].includes(candidate.status),
    );
    if (job?.destination) pilgrim.position = { ...job.destination };
    const result = advance(state);
    satisfied = result.events.some(
      (event) =>
        event.type === "need_satisfied" && event.actorId === pilgrim.id,
    );
  }
  assert.equal(satisfied, true);
  assert.equal(meals.quantity, 9);
  assert.ok(pilgrim.life.needs.hunger > 1);
});

test("M-11 schema migration preserves UUID-backed development state", () => {
  const state = villageState();
  delete state.village.development;
  state.village.npcStates = state.village.npcStates.filter(
    (actor) => !["woodcutter", "reeve"].includes(actor.personKey),
  );
  const restored = parseRogueState(serializeRogueState(state));
  assert.equal(restored.schemaVersion, 22);
  assert.ok(
    restored.village.development.projects.every((project) => project.id),
  );
  assert.ok(woodcutter(restored));
  assert.ok(reeve(restored));
  assert.ok(resident(restored, "farmer"));
  assert.ok(resident(restored, "herder"));
  assert.ok(stock(restored, "lumber_camp_logs"));
});
