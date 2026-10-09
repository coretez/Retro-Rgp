import { definitionId, namedUuid } from "./identity.js";

export const VILLAGE_DAYS_PER_YEAR = 360;

const FOUNDER_DEMOGRAPHY = Object.freeze({
  farmer: [31, "female"],
  reeve: [38, "female"],
  herbalist: [29, "female"],
  herder: [34, "male"],
  fisher: [36, "male"],
  watchman: [28, "male"],
  woodcutter: [33, "female"],
  carter: [35, "male"],
  porter: [24, "female"],
  innkeeper: [30, "female"],
});

const FOUNDER_RELATIONSHIPS = Object.freeze([
  ["farmer", "reeve", "partner"],
  ["herder", "fisher", "partner"],
  ["woodcutter", "carter", "partner"],
  ["herbalist", "farmer", "mentor"],
  ["innkeeper", "porter", "mentor"],
]);

function lifeStage(ageYears) {
  if (ageYears < 3) return "infant";
  if (ageYears < 13) return "child";
  if (ageYears < 18) return "adolescent";
  if (ageYears < 60) return "adult";
  return "elder";
}

function demographicProfile(state, resident) {
  const [ageYears, sex] = FOUNDER_DEMOGRAPHY[resident.personKey] ?? [25, "unknown"];
  return {
    birthDay: (state.village.clock?.day ?? 1) - ageYears * VILLAGE_DAYS_PER_YEAR,
    ageYears,
    lifeStage: lifeStage(ageYears),
    sex,
    healthState: { status: "healthy", recoveryUntilDay: null },
    reproductiveState: { status: "eligible", pregnancy: null },
    origin: state.village.scenario === "founding" ? "founding_cohort" : "resident",
    parentIds: [],
    childIds: [],
    siblingIds: [],
    guardianIds: [],
    partnerIds: [],
    history: [{ type: "arrival", day: 1, reason: "settlement_founding" }],
  };
}

function relationshipMetrics(kind) {
  if (kind === "partner")
    return { familiarity: 90, trust: 80, affection: 80, respect: 70, attraction: 70, fear: 0, obligation: 55, grievance: 0 };
  return { familiarity: 65, trust: 60, affection: 35, respect: 70, attraction: 0, fear: 0, obligation: 45, grievance: 0 };
}

function relationship(state, left, right, kind) {
  const actorIds = [left.id, right.id].sort();
  return {
    id: namedUuid(state.id, `relationship:${kind}:${actorIds.join(":")}`),
    definitionId: definitionId("resident-relationship", kind),
    entityType: "resident-relationship",
    actorIds,
    kind,
    status: "active",
    metrics: relationshipMetrics(kind),
    events: [{ type: `founding_${kind}`, day: 1, actorIds }],
  };
}

function foundingRelationships(state) {
  const byKey = new Map(state.village.npcStates.map((resident) => [resident.personKey, resident]));
  return FOUNDER_RELATIONSHIPS.flatMap(([leftKey, rightKey, kind]) => {
    const left = byKey.get(leftKey), right = byKey.get(rightKey);
    return left && right ? [relationship(state, left, right, kind)] : [];
  });
}

function syncPartnerReferences(state) {
  for (const resident of state.village.npcStates) resident.partnerIds = [];
  for (const bond of state.village.relationships.filter((item) => item.kind === "partner" && item.status === "active"))
    for (const actorId of bond.actorIds) {
      const resident = state.village.npcStates.find((item) => item.id === actorId);
      if (resident) resident.partnerIds.push(...bond.actorIds.filter((id) => id !== actorId));
    }
}

export function ensureVillageDemography(state) {
  for (const resident of state.village.npcStates) {
    const fallback = demographicProfile(state, resident);
    for (const [key, value] of Object.entries(fallback)) resident[key] ??= structuredClone(value);
    resident.lifeStage = lifeStage(resident.ageYears);
  }
  state.village.relationships ??= foundingRelationships(state);
  state.village.demographyLedger ??= { lastProcessedDay: state.village.clock?.day ?? 1, events: [] };
  syncPartnerReferences(state);
  return state.village.demographyLedger;
}

export function advanceVillageDemography(state) {
  const ledger = ensureVillageDemography(state), day = state.village.clock?.day ?? 1;
  if (ledger.lastProcessedDay >= day) return [];
  const events = [];
  for (const resident of state.village.npcStates) {
    const age = Math.max(0, Math.floor((day - resident.birthDay) / VILLAGE_DAYS_PER_YEAR));
    if (age === resident.ageYears) continue;
    resident.ageYears = age;
    resident.lifeStage = lifeStage(age);
    events.push({ type: "resident_birthday", day, residentId: resident.id, ageYears: age, lifeStage: resident.lifeStage });
  }
  ledger.lastProcessedDay = day;
  ledger.events.push(...events);
  return events;
}
