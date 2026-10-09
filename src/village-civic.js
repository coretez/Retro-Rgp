import { definitionId, namedUuid } from "./identity.js";
import { clampNeed } from "./village-life.js";
import { regionalHydrology } from "./village-region.js";

const CEMETERY_SITE = Object.freeze({ x: -38, y: 26, w: 10, h: 6 });
const CEMETERY_CANDIDATES = Object.freeze([
  CEMETERY_SITE,
  { x: 28, y: 36, w: 10, h: 6 },
  { x: -50, y: 40, w: 10, h: 6 },
  { x: 42, y: 34, w: 10, h: 6 },
]);
const ANIMAL_DISPOSAL_CANDIDATES = Object.freeze([
  { x: -34, y: 38, w: 3, h: 3 },
  { x: 34, y: 42, w: 3, h: 3 },
  { x: -46, y: 48, w: 3, h: 3 },
  { x: 48, y: 40, w: 3, h: 3 },
]);
const FOOD_KINDS = new Set([
  "grain",
  "vegetables",
  "prepared_meal",
  "fish",
  "venison",
  "meat",
  "milk",
  "eggs",
  "flour",
]);

function gravePositions(site) {
  const positions = [];
  for (let y = site.y + 1; y < site.y + site.h - 1; y += 2)
    for (let x = site.x + 1; x < site.x + site.w - 1; x += 2)
      positions.push({ x, y });
  return positions;
}

function createGrave(state, cemetery, position, index) {
  return {
    id: namedUuid(state.id, `grave:${cemetery.id}:${index + 1}`),
    definitionId: definitionId("world-object", "grave"),
    entityType: "grave",
    name: `Cemetery grave ${index + 1}`,
    position,
    status: "designated",
    occupantId: null,
    dugAtTick: null,
    buriedAtTick: null,
  };
}

export function ensureVillageCivic(state) {
  state.village.civic ??= { residentCorpses: [], cemetery: null };
  state.village.civic.residentCorpses ??= [];
  state.village.civic.animalDisposal ??= null;
  state.village.civic.cremationPyre ??= null;
  state.village.civic.cemeteryPolicy ??= {
    defaultDisposition: "burial",
    revision: 0,
    updatedAtTick: null,
  };
  return state.village.civic;
}

function siteContains(site, position, margin = 0) {
  return (
    position.x >= site.x - margin &&
    position.x < site.x + site.w + margin &&
    position.y >= site.y - margin &&
    position.y < site.y + site.h + margin
  );
}

function sitesOverlap(left, right, margin = 0) {
  return (
    left.x - margin < right.x + right.w &&
    left.x + left.w + margin > right.x &&
    left.y - margin < right.y + right.h &&
    left.y + left.h + margin > right.y
  );
}

function cemeteryTouchesWater(state, site) {
  const context = state.village.development?.masterPlan?.regionalContext?.site,
    origin = context?.origin ?? { x: 0, y: 0 },
    mode = context?.mode;
  if (!mode) return false;
  for (let y = site.y; y < site.y + site.h; y += 1)
    for (let x = site.x; x < site.x + site.w; x += 1)
      if (regionalHydrology(state.seed, x + origin.x, y + origin.y, mode).water)
        return true;
  return false;
}

export function assessCemeterySite(state, site) {
  const problems = [];
  if (cemeteryTouchesWater(state, site)) problems.push("surface_water");
  if (
    state.village.buildings?.some((building) => sitesOverlap(site, building, 3))
  )
    problems.push("existing_building");
  if (
    state.village.stockpiles?.some(
      (stockpile) =>
        FOOD_KINDS.has(stockpile.itemKind) &&
        siteContains(site, stockpile.position, 8),
    )
  )
    problems.push("food_handling");
  if (
    state.village.development?.masterPlan?.fieldBoundaries?.some((field) =>
      sitesOverlap(site, field, 3),
    )
  )
    problems.push("agricultural_land");
  return { valid: problems.length === 0, problems };
}

export function selectVillageCemeterySite(state) {
  return (
    CEMETERY_CANDIDATES.find((site) => assessCemeterySite(state, site).valid) ??
    CEMETERY_SITE
  );
}

export function designateVillageCemetery(state, site = null) {
  const civic = ensureVillageCivic(state);
  if (civic.cemetery) return civic.cemetery;
  site ??= selectVillageCemeterySite(state);
  const assessment = assessCemeterySite(state, site);
  if (!assessment.valid)
    throw new Error(`Invalid cemetery site: ${assessment.problems.join(", ")}`);
  const cemetery = {
    id: namedUuid(state.id, "civic:cemetery"),
    definitionId: definitionId("district", "cemetery"),
    entityType: "district",
    name: "Founders' cemetery",
    ...site,
    status: "designated",
    graves: [],
  };
  cemetery.graves = gravePositions(cemetery).map((position, index) =>
    createGrave(state, cemetery, position, index),
  );
  civic.cemetery = cemetery;
  return cemetery;
}

function requireDisposition(disposition) {
  if (!["burial", "cremation"].includes(disposition))
    throw new Error(`Unsupported resident disposition: ${disposition}`);
  return disposition;
}

export function setVillageCemeteryPolicy(state, input) {
  const civic = ensureVillageCivic(state),
    policy = civic.cemeteryPolicy;
  if (input.action === "designate") designateVillageCemetery(state, input.site);
  else if (input.action === "set_default")
    policy.defaultDisposition = requireDisposition(input.disposition);
  else {
    const corpse = residentCorpse(state, input.corpseId);
    if (!corpse) throw new Error(`Unknown resident remains: ${input.corpseId}`);
    if (input.action === "order_exhumation") {
      corpse.exhumationOrdered = true;
      corpse.requestedDisposition = "hold";
    } else if (input.action === "order_cremation") {
      corpse.requestedDisposition = "cremation";
      if (corpse.status === "buried") corpse.exhumationOrdered = true;
    } else throw new Error(`Unsupported cemetery action: ${input.action}`);
  }
  policy.revision += 1;
  policy.updatedAtTick = state.tick;
  return { cemetery: civic.cemetery, policy, corpseId: input.corpseId ?? null };
}

export function selectAnimalDisposalSite(state) {
  return ANIMAL_DISPOSAL_CANDIDATES.find(
    (site) => assessCemeterySite(state, site).valid,
  );
}

export function designateAnimalDisposalSite(state) {
  const civic = ensureVillageCivic(state);
  if (civic.animalDisposal) return civic.animalDisposal;
  const site = selectAnimalDisposalSite(state);
  if (!site) return null;
  civic.animalDisposal = {
    id: namedUuid(state.id, "civic:animal-disposal"),
    definitionId: definitionId("world-object", "animal_disposal_pit"),
    entityType: "world_object",
    name: "Animal remains pit",
    position: { x: site.x + 1, y: site.y + 1 },
    status: "designated",
    disposedCarcassIds: [],
  };
  return civic.animalDisposal;
}

export function recordAnimalDisposal(state, animal) {
  const site = designateAnimalDisposalSite(state);
  if (!site) return null;
  if (!site.disposedCarcassIds.includes(animal.id))
    site.disposedCarcassIds.push(animal.id);
  site.lastUsedAtTick = state.tick;
  return site;
}

export function markResidentDead(state, residentId, cause = "unknown") {
  const civic = ensureVillageCivic(state),
    resident = state.village.npcStates.find((entry) => entry.id === residentId);
  if (!resident || resident.life?.status === "dead") return null;
  resident.life.status = "dead";
  resident.workState = "dead";
  resident.currentAction = "Dead";
  const corpse = {
    id: namedUuid(resident.id, "corpse"),
    definitionId: definitionId("world-object", "resident_corpse"),
    entityType: "resident_corpse",
    residentId: resident.id,
    name: `${resident.name}'s body`,
    position: { ...resident.position },
    cause,
    condition: "fresh",
    status: "exposed",
    deathDay: state.village.clock.day,
    deathTick: state.tick,
    graveId: null,
    requestedDisposition: civic.cemeteryPolicy.defaultDisposition,
    exhumationOrdered: false,
  };
  civic.residentCorpses.push(corpse);
  return corpse;
}

export function availableVillageGrave(state) {
  return designateVillageCemetery(state).graves.find(
    (grave) => grave.status === "designated" && !grave.occupantId,
  );
}

export function reserveVillageGrave(state, corpseId) {
  const grave = availableVillageGrave(state);
  if (!grave) return null;
  grave.status = "reserved";
  grave.occupantId = corpseId;
  return grave;
}

export function residentCorpse(state, corpseId) {
  return ensureVillageCivic(state).residentCorpses.find(
    (corpse) => corpse.id === corpseId,
  );
}

export function villageGrave(state, graveId) {
  return designateVillageCemetery(state).graves.find(
    (grave) => grave.id === graveId,
  );
}

export function completeResidentBurial(state, corpse, grave) {
  corpse.status = "buried";
  corpse.position = { ...grave.position };
  corpse.graveId = grave.id;
  grave.status = "occupied";
  grave.buriedAtTick = state.tick;
  return { corpse, grave };
}

export function ensureVillageCremationPyre(state) {
  const civic = ensureVillageCivic(state);
  if (civic.cremationPyre) return civic.cremationPyre;
  const cemetery = designateVillageCemetery(state);
  civic.cremationPyre = {
    id: namedUuid(state.id, "civic:cremation-pyre"),
    definitionId: definitionId("world-object", "cremation_pyre"),
    entityType: "world_object",
    name: "Cemetery cremation pyre",
    position: { x: cemetery.x + cemetery.w - 2, y: cemetery.y + cemetery.h - 1 },
    status: "ready",
    crematedCorpseIds: [],
    consumedFuelUnits: 0,
  };
  return civic.cremationPyre;
}

export function completeResidentExhumation(state, corpse, grave) {
  Object.assign(grave, {
    status: "designated",
    occupantId: null,
    buriedAtTick: null,
    exhumedAtTick: state.tick,
  });
  Object.assign(corpse, {
    status: "exposed",
    position: { ...grave.position },
    graveId: null,
    exhumationOrdered: false,
  });
}

export function completeResidentCremation(state, corpse, pyre, fuelUnits) {
  corpse.status = "cremated";
  corpse.condition = "ashes";
  corpse.position = { ...pyre.position };
  corpse.crematedAtTick = state.tick;
  corpse.exhumationOrdered = false;
  if (!pyre.crematedCorpseIds.includes(corpse.id))
    pyre.crematedCorpseIds.push(corpse.id);
  pyre.consumedFuelUnits += fuelUnits;
  pyre.lastUsedAtTick = state.tick;
}

function corpseCondition(corpse, day) {
  const age = day - corpse.deathDay;
  if (age < 3) return "fresh";
  if (age < 10) return "decomposing";
  return "remains";
}

function exposedResidents(state, corpse) {
  return state.village.npcStates.filter((resident) => {
    if (resident.life?.status === "dead") return false;
    const distance =
      Math.abs(resident.position.x - corpse.position.x) +
      Math.abs(resident.position.y - corpse.position.y);
    return distance <= 8;
  });
}

function applyCorpseExposure(state, corpse, resident) {
  resident.life.needs.safety = clampNeed(resident.life.needs.safety - 2);
  resident.life.needs.morale = clampNeed(resident.life.needs.morale - 3);
  resident.life.memories.push({
    need: "morale",
    description: `Disturbed by ${corpse.name} remaining unburied`,
    tick: state.tick,
  });
  resident.life.memories = resident.life.memories.slice(-8);
}

export function advanceVillageCivic(state) {
  const civic = ensureVillageCivic(state),
    day = state.village.clock.day;
  if (civic.lastLifecycleDay === day) return [];
  civic.lastLifecycleDay = day;
  const events = [];
  for (const corpse of civic.residentCorpses.filter(
    (entry) => entry.status === "exposed",
  )) {
    corpse.condition = corpseCondition(corpse, day);
    const affected = exposedResidents(state, corpse);
    for (const resident of affected)
      applyCorpseExposure(state, corpse, resident);
    events.push({
      type: "resident_corpse_exposure",
      corpseId: corpse.id,
      condition: corpse.condition,
      affectedResidentIds: affected.map((resident) => resident.id),
      tick: state.tick,
    });
  }
  return events;
}

export function residentMourners(state, corpse) {
  const deceased = state.village.npcStates.find(
      (resident) => resident.id === corpse.residentId,
    ),
    household = state.village.households?.find(
      (entry) => entry.id === deceased?.householdId,
    ),
    mourned = new Set(corpse.mournedByIds ?? []);
  return state.village.npcStates.filter(
    (resident) =>
      household?.memberIds.includes(resident.id) &&
      resident.life?.status !== "dead" &&
      !mourned.has(resident.id),
  );
}

export function recordResidentMourning(state, corpse, resident) {
  corpse.mournedByIds ??= [];
  if (!corpse.mournedByIds.includes(resident.id))
    corpse.mournedByIds.push(resident.id);
  resident.life.needs.morale = clampNeed(resident.life.needs.morale + 12);
  resident.life.memories.push({
    need: "morale",
    description: `Mourned ${corpse.name} at the cemetery`,
    tick: state.tick,
  });
  resident.life.memories = resident.life.memories.slice(-8);
}
