export const VILLAGE_MEANING_SCHEMA_VERSION = 1;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ROLE_CONSEQUENCES = Object.freeze({
  reeve:
    "Village priorities, commissions, and reassignment lose their accountable leader.",
  woodcutter: "Timber harvesting and lumber production slow or stop.",
  farmer:
    "Crop work, seed continuity, milling, and architectural surveys lose their specialist.",
  herder:
    "Livestock care, breeding, and the principal construction crew lose capacity.",
  fisher: "River food and hunting supply lose their specialist.",
  porter: "Stock and construction deliveries lose hauling capacity.",
  carter: "Long-haul deliveries and caravan logistics lose capacity.",
  herbalist: "Foraging, remedies, and medical care lose their specialist.",
  watchman: "Patrol, investigation, and danger response lose coverage.",
  innkeeper: "Prepared meals and hospitality lose their operator.",
});

const ROLE_WORKPLACES = Object.freeze({
  reeve: [],
  woodcutter: ["lumber_yard", "carpenter_workshop"],
  farmer: ["farmstead", "granary", "mill"],
  herder: ["farmstead", "stable"],
  fisher: [],
  porter: ["granary"],
  carter: ["stable", "granary"],
  herbalist: ["infirmary"],
  watchman: [],
  innkeeper: ["communal_kitchen", "inn", "bakery"],
});

const BUILDING_CONSEQUENCES = Object.freeze({
  lumber_yard:
    "Building-lumber production and dry timber work lose their base.",
  farmstead: "Crop, seed, pasture, and herd work lose their operating base.",
  communal_kitchen: "Founding meal preparation loses its sheltered kitchen.",
  granary:
    "Grain and seed lose their intended protected store and mill staging point.",
  stable: "Livestock and caravan animals lose sheltered care and feed storage.",
  mill: "Grain cannot be locally converted into flour.",
  forge: "Local metal tools, hardware, repairs, and weapons lose production.",
  carpenter_workshop:
    "Furniture, carts, doors, and wood components lose production.",
  bakery: "Flour cannot become preserved baked food at village scale.",
  infirmary:
    "Treatment, recovery beds, medicine, and linen lose a dedicated site.",
  inn: "Visitors lose staffed lodging, meals, trade hospitality, and a common room.",
});

function activeJob(state, actorId) {
  return state.village.jobs.find(
    (job) =>
      job.assignedActorId === actorId &&
      ["reserved", "active", "blocked"].includes(job.status),
  );
}

function householdFor(state, resident) {
  return state.village.households?.find(
    (household) => household.id === resident.householdId,
  );
}

function residenceFor(state, resident) {
  return state.village.residences?.find(
    (residence) => residence.id === resident.residenceId,
  );
}

function householdRelations(state, resident) {
  const household = householdFor(state, resident);
  if (!household) return [];
  return household.memberIds.filter((id) => id !== resident.id);
}

function workplaceIds(state, personKey) {
  const keys = new Set(ROLE_WORKPLACES[personKey] ?? []);
  return state.village.buildings
    .filter(
      (building) => keys.has(building.key) && building.status === "complete",
    )
    .map((building) => building.id)
    .sort();
}

function queuedWork(state, resident) {
  const capabilities = new Set(resident.capabilityTags ?? []),
    allowed = new Set(resident.workPermissions?.allowedJobTypes ?? []);
  return state.village.jobs
    .filter(
      (job) =>
        ["available", "reserved", "suspended"].includes(job.status) &&
        allowed.has(job.jobType) &&
        (job.plan?.allowedActorIds?.includes(resident.id) ?? true) &&
        job.requiredCapabilities.every((tag) => capabilities.has(tag)),
    )
    .sort(
      (left, right) =>
        right.priority - left.priority || left.id.localeCompare(right.id),
    )
    .slice(0, 3)
    .map((job) => ({
      id: job.id,
      jobType: job.jobType,
      priority: job.priority,
    }));
}

function residentPurpose(state, resident, job) {
  return {
    status: job ? job.status : resident.workState,
    jobId: job?.id ?? null,
    jobType: job?.jobType ?? null,
    action: resident.currentAction ?? null,
    reason:
      job?.blockingReason ??
      resident.actionReason ??
      resident.waitReason ??
      null,
    schedule: resident.life?.scheduleBlock ?? null,
    queuedWork: queuedWork(state, resident),
    lastCompletedWork: resident.lastCompletedWork
      ? structuredClone(resident.lastCompletedWork)
      : resident.lastJobType
        ? { jobType: resident.lastJobType }
        : null,
  };
}

function residentEvidence(resident, household, residence, job) {
  return [
    { kind: "resident", id: resident.id },
    ...(household ? [{ kind: "household", id: household.id }] : []),
    ...(residence ? [{ kind: "residence", id: residence.id }] : []),
    ...(job ? [{ kind: "job", id: job.id }] : []),
  ];
}

function residentDemography(resident) {
  return {
    lifeStage: resident.lifeStage ?? null,
    birthDay: resident.birthDay ?? null,
    ageYears: resident.ageYears ?? null,
    sex: resident.sex ?? null,
    healthState: structuredClone(resident.healthState ?? null),
    reproductiveState: structuredClone(resident.reproductiveState ?? null),
    parentIds: [...(resident.parentIds ?? [])],
    childIds: [...(resident.childIds ?? [])],
    siblingIds: [...(resident.siblingIds ?? [])],
    guardianIds: [...(resident.guardianIds ?? [])],
    partnerIds: [...(resident.partnerIds ?? [])],
    lifeHistory: structuredClone(resident.history ?? []),
  };
}

function residentReceipt(state, resident) {
  const job = activeJob(state, resident.id),
    household = householdFor(state, resident),
    residence = residenceFor(state, resident);
  return {
    id: resident.id,
    name: resident.name,
    primaryRole: resident.personKey,
    ...residentDemography(resident),
    originReason:
      state.village.scenario === "founding"
        ? "founding_cohort"
        : "established_resident",
    householdId: household?.id ?? resident.householdId ?? null,
    householdName: household?.name ?? null,
    residenceId: residence?.id ?? resident.residenceId ?? null,
    residenceName: residence?.name ?? null,
    housingStatus: resident.housingStatus ?? "unknown",
    enabledWorkTypes: [...(resident.workPermissions?.allowedJobTypes ?? [])],
    skills: { ...(resident.skills ?? {}) },
    workplaceIds: workplaceIds(state, resident.personKey),
    relationshipActorIds: householdRelations(state, resident),
    purpose: residentPurpose(state, resident, job),
    consequence:
      ROLE_CONSEQUENCES[resident.personKey] ??
      "The town loses this resident's work, relationships, and household contribution.",
    evidence: residentEvidence(resident, household, residence, job),
  };
}

function specialistProposal(state, building) {
  const keys = new Set([building.key, `specialist_${building.key}`]);
  return state.village.development?.strategyBoard?.proposalQueue?.find(
    (proposal) =>
      keys.has(proposal.projectKey) || proposal.facilityType === building.key,
  );
}

function proposalCommission(state, proposal) {
  if (!proposal?.commissionId) return null;
  return state.village.development?.strategyBoard?.commissions?.find(
    (commission) => commission.id === proposal.commissionId,
  );
}

function foundingCause(building) {
  if (building.key.startsWith("founder_house_"))
    return "The founding households required permanent sheltered beds.";
  return {
    lumber_yard: "The founders required processed lumber for construction.",
    farmstead:
      "The founders required crops, seed security, pasture, and herd care.",
    communal_kitchen: "The founders required sheltered meal production.",
  }[building.key];
}

function operatorIds(proposal, commission) {
  const operator =
    commission?.assignments?.operator ?? commission?.assignments?.operatorActor;
  return [operator?.actorId ?? proposal?.intendedOperatorActorId]
    .filter(Boolean)
    .sort();
}

function buildingEvidence(building, proposal, commission) {
  return [
    { kind: "building", id: building.id },
    ...(proposal ? [{ kind: "proposal", id: proposal.id }] : []),
    ...(commission ? [{ kind: "commission", id: commission.id }] : []),
  ];
}

function buildingReceipt(state, building) {
  const proposal = specialistProposal(state, building),
    commission = proposalCommission(state, proposal);
  return {
    id: building.id,
    key: building.key,
    name: building.name,
    status: building.status,
    cause:
      proposal?.reason ?? foundingCause(building) ?? "Legacy town service.",
    districtKey: building.districtKey ?? null,
    operatorActorIds: operatorIds(proposal, commission),
    recentServiceEvents: [],
    consequence:
      BUILDING_CONSEQUENCES[building.key] ??
      (building.key.startsWith("founder_house_")
        ? "A household loses permanent shelter, beds, and domestic space."
        : "The town loses the physical service represented by this site."),
    evidence: buildingEvidence(building, proposal, commission),
  };
}

function entityIdSet(state) {
  const groups = [
    state.village.npcStates,
    state.village.households,
    state.village.residences,
    state.village.buildings,
    state.village.jobs,
    state.village.development?.strategyBoard?.proposalQueue,
    state.village.development?.strategyBoard?.commissions,
  ];
  return new Set(
    groups.flatMap((group) => group ?? []).map((entity) => entity.id),
  );
}

function evidenceViolations(receipts, ids) {
  return receipts.flatMap((receipt) =>
    receipt.evidence
      .filter((evidence) => !ids.has(evidence.id))
      .map(
        (evidence) =>
          `missing_evidence:${receipt.id}:${evidence.kind}:${evidence.id}`,
      ),
  );
}

function invalidUuid(label, id) {
  return id && !UUID_PATTERN.test(id) ? [`${label}_not_uuid:${id}`] : [];
}

function demographicReferenceIds(receipt) {
  return [
    ...receipt.parentIds,
    ...receipt.childIds,
    ...receipt.siblingIds,
    ...receipt.guardianIds,
    ...receipt.partnerIds,
  ];
}

function receiptUuidViolations(residents, buildings, town) {
  const residentRefs = residents.flatMap((receipt) => [
      receipt.id,
      receipt.householdId,
      receipt.residenceId,
      ...receipt.relationshipActorIds,
      ...demographicReferenceIds(receipt),
      ...receipt.workplaceIds,
      ...receipt.evidence.map((evidence) => evidence.id),
    ]),
    buildingRefs = buildings.flatMap((receipt) => [
      receipt.id,
      ...receipt.operatorActorIds,
      ...receipt.evidence.map((evidence) => evidence.id),
    ]),
    townRefs = [
      town.id,
      town.leaderActorId,
      ...town.evidence.map((evidence) => evidence.id),
    ];
  return [...residentRefs, ...buildingRefs, ...townRefs].flatMap((id) =>
    invalidUuid("meaning_reference", id),
  );
}

function residentViolations(state, receipts) {
  const ids = new Set(receipts.map((receipt) => receipt.id)),
    failures = [];
  if (ids.size !== state.village.npcStates.length)
    failures.push("resident_receipt_coverage_mismatch");
  for (const receipt of receipts) {
    if (!receipt.householdId)
      failures.push(`resident_household_missing:${receipt.id}`);
    if (receipt.housingStatus === "housed" && !receipt.residenceId)
      failures.push(`housed_resident_without_residence:${receipt.id}`);
    if (!receipt.primaryRole)
      failures.push(`resident_role_missing:${receipt.id}`);
    if (!receipt.consequence)
      failures.push(`resident_consequence_missing:${receipt.id}`);
  }
  return failures;
}

function residentReferenceViolations(state, receipts) {
  const households = new Set(
      (state.village.households ?? []).map((item) => item.id),
    ),
    residences = new Set(
      (state.village.residences ?? []).map((item) => item.id),
    ),
    actors = new Set(state.village.npcStates.map((item) => item.id)),
    buildings = new Set(state.village.buildings.map((item) => item.id));
  return receipts.flatMap((receipt) => [
    ...(receipt.householdId && !households.has(receipt.householdId)
      ? [
          `resident_household_reference_invalid:${receipt.id}:${receipt.householdId}`,
        ]
      : []),
    ...(receipt.residenceId && !residences.has(receipt.residenceId)
      ? [
          `resident_residence_reference_invalid:${receipt.id}:${receipt.residenceId}`,
        ]
      : []),
    ...receipt.relationshipActorIds
      .filter((id) => !actors.has(id))
      .map(
        (id) => `resident_relationship_reference_invalid:${receipt.id}:${id}`,
      ),
    ...demographicReferenceIds(receipt)
      .filter((id) => !actors.has(id))
      .map((id) => `resident_demography_reference_invalid:${receipt.id}:${id}`),
    ...receipt.workplaceIds
      .filter((id) => !buildings.has(id))
      .map((id) => `resident_workplace_reference_invalid:${receipt.id}:${id}`),
  ]);
}

function relationshipViolations(state) {
  const actors = new Set(state.village.npcStates.map((resident) => resident.id));
  return (state.village.relationships ?? []).flatMap((bond) => [
    ...invalidUuid("relationship", bond.id),
    ...(bond.actorIds?.length === 2 ? [] : [`relationship_pair_invalid:${bond.id}`]),
    ...(bond.actorIds ?? [])
      .filter((id) => !actors.has(id))
      .map((id) => `relationship_actor_invalid:${bond.id}:${id}`),
    ...(bond.events?.length ? [] : [`relationship_evidence_missing:${bond.id}`]),
  ]);
}

function buildingViolations(state, receipts) {
  const ids = new Set(receipts.map((receipt) => receipt.id)),
    failures = [];
  if (ids.size !== state.village.buildings.length)
    failures.push("building_receipt_coverage_mismatch");
  for (const receipt of receipts) {
    if (!receipt.cause) failures.push(`building_cause_missing:${receipt.id}`);
    if (!receipt.consequence)
      failures.push(`building_consequence_missing:${receipt.id}`);
  }
  return failures;
}

function richnessGaps(state) {
  const gaps = [];
  if (state.village.npcStates.some((resident) => resident.lifeStage == null))
    gaps.push("resident_age_and_life_stage_unmodeled");
  if (!state.village.relationships)
    gaps.push("social_relationship_graph_unmodeled");
  if (!state.village.serviceLedger)
    gaps.push("facility_utilization_ledger_unmodeled");
  if (!state.village.masterPlan) gaps.push("settlement_master_plan_unmodeled");
  if (!state.village.visitorKnowledge)
    gaps.push("visitor_truth_harness_unmodeled");
  return gaps;
}

function townReceipt(state, residents, buildings) {
  const board = state.village.development?.strategyBoard,
    leader = state.village.npcStates.find(
      (resident) => resident.id === board?.leaderActorId,
    );
  return {
    id: state.id,
    name: "Stonebridge",
    scenario: state.village.scenario,
    foundingCause: "Protect and provision the Stonebridge river crossing.",
    population: residents.length,
    householdCount: state.village.households?.length ?? 0,
    housedResidents: residents.filter(
      (receipt) => receipt.housingStatus === "housed",
    ).length,
    leaderActorId: leader?.id ?? null,
    leaderName: leader?.name ?? null,
    activePriority: state.village.development?.activePriority ?? null,
    services: buildings
      .filter((receipt) => receipt.status === "complete")
      .map((receipt) => receipt.key)
      .sort(),
    storageOverflow: (state.village.storage?.overflow ?? []).reduce(
      (sum, item) => sum + item.quantity,
      0,
    ),
    evidence: [
      ...(leader ? [{ kind: "resident", id: leader.id }] : []),
      ...buildings.map((building) => ({ kind: "building", id: building.id })),
    ],
  };
}

// function-length-exempt: template -- complete town-meaning projection
export function villageMeaningAudit(state) {
  const residents = state.village.npcStates.map((resident) =>
      residentReceipt(state, resident),
    ),
    buildings = state.village.buildings.map((building) =>
      buildingReceipt(state, building),
    ),
    town = townReceipt(state, residents, buildings),
    ids = entityIdSet(state),
    violations = [
      ...residentViolations(state, residents),
      ...residentReferenceViolations(state, residents),
      ...relationshipViolations(state),
      ...buildingViolations(state, buildings),
      ...receiptUuidViolations(residents, buildings, town),
      ...evidenceViolations([...residents, ...buildings], ids),
      ...evidenceViolations([town], new Set([...ids, state.id])),
    ],
    gaps = richnessGaps(state),
    passed = violations.length === 0;
  return {
    schemaVersion: VILLAGE_MEANING_SCHEMA_VERSION,
    status: !passed ? "invalid" : gaps.length ? "foundation" : "complete",
    passed,
    complete: passed && gaps.length === 0,
    summary: `${residents.length}/${state.village.npcStates.length} residents and ${buildings.length}/${state.village.buildings.length} buildings have causal receipts.`,
    residentCount: state.village.npcStates.length,
    residentReceiptCount: residents.length,
    buildingCount: state.village.buildings.length,
    buildingReceiptCount: buildings.length,
    gaps,
    violations,
    town,
    residents,
    buildings,
  };
}

function residentView(receipt) {
  return {
    id: receipt.id,
    name: receipt.name,
    primaryRole: receipt.primaryRole,
    lifeStage: receipt.lifeStage,
    ageYears: receipt.ageYears,
    sex: receipt.sex,
    partnerIds: receipt.partnerIds,
    originReason: receipt.originReason,
    householdName: receipt.householdName,
    housingStatus: receipt.housingStatus,
    purpose: receipt.purpose,
    consequence: receipt.consequence,
  };
}

function buildingView(receipt) {
  return {
    id: receipt.id,
    key: receipt.key,
    name: receipt.name,
    status: receipt.status,
    cause: receipt.cause,
    districtKey: receipt.districtKey,
    operatorActorIds: receipt.operatorActorIds,
    consequence: receipt.consequence,
  };
}

export function villageMeaningView(state) {
  const audit = villageMeaningAudit(state);
  return {
    schemaVersion: audit.schemaVersion,
    status: audit.status,
    passed: audit.passed,
    complete: audit.complete,
    summary: audit.summary,
    residentCount: audit.residentCount,
    residentReceiptCount: audit.residentReceiptCount,
    buildingCount: audit.buildingCount,
    buildingReceiptCount: audit.buildingReceiptCount,
    gaps: audit.gaps,
    violations: audit.violations,
    town: audit.town,
    residents: audit.residents.map(residentView),
    buildings: audit.buildings.map(buildingView),
  };
}
