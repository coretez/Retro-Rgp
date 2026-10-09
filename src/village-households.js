import { definitionId, namedUuid } from "./identity.js";

const SHARED_HOUSEHOLDS = Object.freeze([
  ["voss", "Voss household", ["smith", "reeve"]],
  ["brand", "Brand household", ["delver", "herder"]],
]);

const FOUNDING_FAMILIES = Object.freeze([
  ["farmer", "Weiss-Voss family", ["farmer", "reeve", "herbalist"]],
  ["brand", "Brand-Venn family", ["herder", "fisher", "watchman"]],
  [
    "woodcutter",
    "Holt-Eder family",
    ["woodcutter", "carter", "porter", "innkeeper"],
  ],
]);

const FOUNDING_BEDROLL_POSITIONS = Object.freeze([
  ...[-18, -16, -14, -12, -10].map((x) => Object.freeze({ x, y: 15 })),
  ...[-18, -16, -14, -12, -10].map((x) => Object.freeze({ x, y: 17 })),
]);

function workshopBedrollPosition(building, index) {
  return {
    x: building.x + 1 + (index % 4) * 2,
    y: building.y + 5 + Math.floor(index / 4),
  };
}

function pioneerBedrollPlacement(state, resident) {
  const job = state.village.jobs?.find(
      (candidate) =>
        candidate.assignedActorId === resident.id &&
        candidate.plan?.remoteTravel?.pioneerCamp &&
        !["completed", "cancelled"].includes(candidate.status),
    ),
    camp = state.village.development?.masterPlan?.regionalContext?.fieldCamps
      ?.find((candidate) => candidate.id === job?.plan?.regionalFieldCampId);
  if (!job || !camp) return null;
  const distance =
    Math.abs(resident.position.x - camp.localPosition.x) +
    Math.abs(resident.position.y - camp.localPosition.y);
  if (!job.plan.pioneerBedrollPlaced && distance > 2) return null;
  job.plan.pioneerBedrollPlaced = true;
  return {
    position: { x: camp.localPosition.x, y: camp.localPosition.y + 1 },
    buildingId: null,
    shelterClass: "pioneer_camp",
    description:
      "A builder's bedroll beside the unfinished field camp prevents wasteful nightly travel home.",
  };
}

function foundingBedrollPlacement(state, resident, index) {
  const pioneer = pioneerBedrollPlacement(state, resident),
    workshop = state.village.buildings?.find(
    (building) =>
      building.key === "lumber_yard" &&
      building.status === "complete" &&
      building.roofed !== false,
  );
  if (pioneer) return pioneer;
  if (resident.housingStatus !== "housed" && workshop)
    return {
      position: workshopBedrollPosition(workshop, index),
      buildingId: workshop.id,
      shelterClass: "emergency_workshop",
      description:
        "A founder's bedroll laid out inside the completed lumber workshop until a permanent home is ready.",
    };
  return {
    position: FOUNDING_BEDROLL_POSITIONS[index],
    buildingId: null,
    shelterClass: "temporary_outdoor",
    description:
      "A personal bedroll beneath the founders' shared weather canvas. It provides temporary sleep and shelter but no residence capacity.",
  };
}

function retargetOpenSleepJobs(state, resident, fixture) {
  const targetPosition = {
    x: fixture.x + fixture.width - 1,
    y: fixture.y + fixture.height - 1,
  };
  for (const job of state.village.jobs ?? []) {
    if (
      !job.plan?.lifeJob ||
      job.plan.ownerActorId !== resident.id ||
      ["completed", "cancelled"].includes(job.status)
    )
      continue;
    if (
      job.targetPosition?.x === targetPosition.x &&
      job.targetPosition?.y === targetPosition.y &&
      !job.plan.targetRefreshRequired
    )
      continue;
    job.targetPosition = { ...targetPosition };
    job.targetId = fixture.id;
    job.plan.targetRefreshRequired = true;
    delete job.plan.cachedPath;
  }
}

function foundingBedrollId(state, resident) {
  return namedUuid(state.id, `founding-bedroll:${resident.id}`);
}

function bedrollRetirementEvent(state, resident, fixture) {
  return {
    type: "bedroll_retired",
    scope: "village",
    tick: state.tick,
    fixtureId: fixture.id,
    residentId: resident.id,
    residentName: resident.name,
    decidedByActorId:
      state.village.npcStates.find((actor) => actor.personKey === "reeve")?.id ??
      null,
    reason: "permanent_bed_assigned",
  };
}

function retireFounderBedroll(state, resident, events) {
  const id = foundingBedrollId(state, resident),
    index = state.village.fixtures.findIndex((fixture) => fixture.id === id);
  if (index < 0) return null;
  const [fixture] = state.village.fixtures.splice(index, 1),
    record = bedrollRetirementEvent(state, resident, fixture);
  state.village.sleepingPlaceRetirements ??= [];
  state.village.sleepingPlaceRetirements.push(record);
  events.push(record);
  return record;
}

function syncSleepingPlaceInventory(state) {
  const beds = state.village.fixtures.filter((fixture) => fixture.role === "bed"),
    bedrolls = beds.filter((fixture) => fixture.temporary),
    permanent = beds.filter((fixture) => !fixture.temporary);
  state.village.sleepingPlaceInventory = {
    updatedAtTick: state.tick,
    permanentBeds: permanent.length,
    assignedPermanentBeds: permanent.filter((bed) => bed.assignedActorId).length,
    bedrolls: bedrolls.length,
    assignedBedrolls: bedrolls.filter((bed) => bed.assignedActorId).length,
    homelessResidents: state.village.npcStates.filter(
      (resident) => resident.housingStatus !== "housed",
    ).length,
    retiredBedrolls: state.village.sleepingPlaceRetirements?.length ?? 0,
  };
  return state.village.sleepingPlaceInventory;
}

function household(runId, key, name, members) {
  return {
    id: namedUuid(runId, `village-household:${key}`),
    definitionId: definitionId("village-household", key),
    entityType: "village-household",
    key,
    name,
    memberIds: members.map((resident) => resident.id).sort(),
  };
}

function assignMembership(residents, households) {
  const householdByMember = new Map(
    households.flatMap((entry) =>
      entry.memberIds.map((memberId) => [memberId, entry.id]),
    ),
  );
  for (const resident of residents)
    resident.householdId = householdByMember.get(resident.id);
  return households;
}

function normalizeMembership(residents, households, defaults) {
  const residentIds = new Set(residents.map((resident) => resident.id)),
    claimed = new Set();
  for (const entry of households)
    entry.memberIds = entry.memberIds.filter((memberId) => {
      if (!residentIds.has(memberId) || claimed.has(memberId)) return false;
      claimed.add(memberId);
      return true;
    });
  for (const resident of residents) {
    if (claimed.has(resident.id)) continue;
    const fallback = defaults.find((entry) =>
        entry.memberIds.includes(resident.id),
      ),
      destination = households.find((entry) => entry.key === fallback.key);
    destination.memberIds.push(resident.id);
    destination.memberIds.sort();
  }
  return assignMembership(residents, households);
}

export function createVillageHouseholds(runId, residents) {
  const founding =
      residents.length === 10 &&
      FOUNDING_FAMILIES.flatMap(([, , keys]) => keys).every((key) =>
        residents.some((resident) => resident.personKey === key),
      ),
    specs = founding ? FOUNDING_FAMILIES : SHARED_HOUSEHOLDS,
    assignedKeys = new Set(specs.flatMap(([, , keys]) => keys)),
    byKey = new Map(
      residents.map((resident) => [resident.personKey, resident]),
    ),
    shared = specs.map(([key, name, keys]) =>
      household(
        runId,
        key,
        name,
        keys.map((personKey) => byKey.get(personKey)).filter(Boolean),
      ),
    ).filter((entry) => entry.memberIds.length),
    single = residents
      .filter((resident) => !assignedKeys.has(resident.personKey))
      .map((resident) =>
        household(runId, resident.personKey, `${resident.name} household`, [
          resident,
        ]),
      );
  return assignMembership(
    residents,
    [...shared, ...single].sort((left, right) =>
      left.key.localeCompare(right.key),
    ),
  );
}

function restoredHousehold(saved, fallback) {
  return {
    ...fallback,
    ...saved,
    memberIds: Array.isArray(saved.memberIds)
      ? [...new Set(saved.memberIds)].sort()
      : [...(fallback?.memberIds ?? [])],
  };
}

export function ensureVillageHouseholds(state) {
  const defaults = createVillageHouseholds(state.id, state.village.npcStates),
    existing = state.village.households ?? [],
    savedKeys = new Set(existing.map((entry) => entry.key));
  state.village.households = [
    ...existing.map((saved) =>
      restoredHousehold(
        saved,
        defaults.find((entry) => entry.key === saved.key),
      ),
    ),
    ...defaults.filter((entry) => !savedKeys.has(entry.key)),
  ];
  return normalizeMembership(
    state.village.npcStates,
    state.village.households,
    defaults,
  );
}

function residenceUsable(residence) {
  return residence.status === "complete" && residence.habitable !== false;
}

function residenceBeds(state, residence) {
  return state.village.fixtures
    .filter(
      (fixture) =>
        fixture.buildingId === residence.buildingId &&
        fixture.role === "bed" &&
        !fixture.temporary,
    )
    .sort((left, right) => left.y - right.y || left.x - right.x);
}

function residenceMemberIds(state, residence) {
  const household = state.village.households.find(
    (entry) => entry.id === residence.plannedHouseholdId,
  );
  return household?.memberIds ?? residence.occupantIds ?? [];
}

function assignPermanentBed(state, resident, bed, residence) {
  Object.assign(bed, {
    assignedActorId: resident.id,
    assignedHouseholdId: resident.householdId,
    residenceId: residence.id,
    assignmentStatus: "assigned",
    walkable: false,
    description: `${bed.name} is assigned to ${resident.name} in their household home.`,
  });
  resident.residenceId = residence.id;
  resident.sleepingLocation = {
    fixtureId: bed.id,
    position: { x: bed.x, y: bed.y },
    temporary: false,
  };
  retargetOpenSleepJobs(state, resident, bed);
}

export function syncResidenceBedAssignments(state) {
  const claimed = new Set();
  for (const bed of state.village.fixtures.filter(
    (fixture) => fixture.role === "bed" && !fixture.temporary,
  ))
    Object.assign(bed, {
      assignedActorId: null,
      assignedHouseholdId: null,
      residenceId: null,
      assignmentStatus: "unassigned",
    });
  for (const residence of state.village.residences.filter(residenceUsable)) {
    const beds = residenceBeds(state, residence);
    if (!beds.length) {
      for (const resident of state.village.npcStates.filter(
        (entry) => entry.residenceId === residence.id,
      ))
        claimed.add(resident.id);
      continue;
    }
    const residents = residenceMemberIds(state, residence)
        .map((id) => state.village.npcStates.find((entry) => entry.id === id))
        .filter(
          (resident) =>
            resident &&
            resident.life?.status !== "dead" &&
            !claimed.has(resident.id),
        )
        .slice(0, Math.min(residence.residentCapacity, beds.length));
    residence.occupantIds = residents.map((resident) => resident.id);
    residence.householdIds = [...new Set(residents.map((r) => r.householdId))];
    residents.forEach((resident, index) => {
      claimed.add(resident.id);
      assignPermanentBed(state, resident, beds[index], residence);
    });
  }
  return claimed;
}

export function syncResidentHousing(state) {
  const claimed = syncResidenceBedAssignments(state),
    usableResidenceIds = new Set(
    (state.village.residences ?? [])
      .filter(residenceUsable)
      .map((residence) => residence.id),
  );
  for (const resident of state.village.npcStates) {
    if (
      !claimed.has(resident.id) &&
      usableResidenceIds.has(resident.residenceId)
    ) {
      resident.residenceId = null;
      if (resident.sleepingLocation?.temporary === false)
        resident.sleepingLocation = null;
    }
    resident.residenceId ??= null;
    const housed = usableResidenceIds.has(resident.residenceId);
    resident.housingStatus = housed ? "housed" : "homeless";
    resident.life.statusTags ??= [];
    resident.life.statusTags = resident.life.statusTags.filter(
      (tag) => !["homeless", "rough_sleeping"].includes(tag),
    );
    if (!housed)
      resident.life.statusTags.push("homeless", "rough_sleeping");
  }
}

// function-length-exempt: template -- authored founding shelter construction
export function ensureFoundingSleepingPlaces(state, events = []) {
  if (state.village.scenario !== "founding") return [];
  state.village.fixtures ??= [];
  const fixtures = state.village.npcStates.flatMap((resident, index) => {
    if (
      resident.housingStatus === "housed" &&
      resident.sleepingLocation?.temporary === false
    ) {
      retireFounderBedroll(state, resident, events);
      return [];
    }
    const id = foundingBedrollId(state, resident),
      placement = foundingBedrollPlacement(state, resident, index),
      position = placement.position;
    let fixture = state.village.fixtures.find(
      (candidate) => candidate.id === id,
    );
    if (!fixture) {
      fixture = {
        id,
        definitionId: definitionId(
          "temporary-sleeping-place",
          "canvas-bedroll",
        ),
        entityType: "world-object",
        objectKind: "bed",
        role: "bed",
        bedType: "bedroll",
        name: `${resident.name}'s canvas bedroll`,
        description: placement.description,
        x: position.x,
        y: position.y,
        width: 2,
        height: 1,
        sleepingCapacity: 1,
        temporary: true,
        providesShelter: true,
        walkable: true,
        assignedActorId: resident.id,
        buildingId: placement.buildingId,
      };
      state.village.fixtures.push(fixture);
    }
    Object.assign(fixture, {
      bedType: "bedroll",
      width: 2,
      height: 1,
      sleepingCapacity: 1,
      temporary: true,
      providesShelter: true,
      shelterClass: placement.shelterClass,
      walkable: true,
      assignedActorId:
        resident.housingStatus === "housed" ? null : resident.id,
      assignmentStatus:
        resident.housingStatus === "housed" ? "released" : "assigned",
      buildingId: placement.buildingId,
      description: placement.description,
      x: position.x,
      y: position.y,
    });
    if (fixture.assignedActorId === resident.id) {
      if (
        !resident.sleepingLocation ||
        resident.sleepingLocation.fixtureId === fixture.id
      )
        resident.sleepingLocation = {
          fixtureId: fixture.id,
          position: { x: fixture.x, y: fixture.y },
          temporary: true,
        };
      retargetOpenSleepJobs(state, resident, fixture);
    }
    return [fixture];
  });
  syncSleepingPlaceInventory(state);
  return fixtures;
}

export { FOUNDING_BEDROLL_POSITIONS };
