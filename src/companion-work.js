import {
  createLifeState,
  lifeCapabilities,
  lifeJobTypes,
} from "./village-life.js";

export const COMPANION_WORK_TEMPLATES = Object.freeze([
  {
    jobType: "scout_area",
    name: "Scout Stonebridge's approaches",
    capability: "scout",
    targetPosition: { x: 21, y: 10 },
    duration: 2,
    outcome: "scouting_report",
    skills: ["survival", "vigilance", "stealth"],
  },
  {
    jobType: "gather_rumors",
    name: "Gather rumors at the Lantern",
    capability: "social",
    targetPosition: { x: -12, y: 4 },
    accessPosition: { x: -8, y: 10 },
    duration: 2,
    outcome: "rumor",
    skills: ["negotiation", "vigilance"],
  },
  {
    jobType: "cut_timber",
    name: "Cut and bundle firewood",
    capability: "labor",
    targetPosition: { x: 14, y: 17 },
    duration: 3,
    outcome: "firewood_bundle",
    skills: ["athletics", "crafting"],
  },
  {
    jobType: "research_lore",
    name: "Research the guild maps",
    capability: "study",
    targetPosition: { x: 8, y: 31 },
    accessPosition: { x: 10, y: 27 },
    duration: 3,
    outcome: "lore_note",
    skills: ["lore", "arcana"],
  },
  {
    jobType: "rest",
    name: "Rest at the chapel",
    capability: "rest",
    targetPosition: { x: 45, y: 8 },
    accessPosition: { x: 47, y: 9 },
    duration: 2,
    outcome: "rested",
    skills: [],
  },
  {
    jobType: "paid_work",
    name: "Help unload the stable cart",
    capability: "labor",
    targetPosition: { x: 38, y: 23 },
    duration: 3,
    outcome: "wages",
    rewardCp: 10,
    skills: ["athletics"],
  },
  {
    jobType: "archery_practice",
    name: "Practice at the archery range",
    capability: "martial",
    targetPosition: { x: 32, y: 24 },
    duration: 3,
    outcome: "archery_practice",
    facility: "archery_range",
    skills: ["marksmanship", "vigilance"],
  },
  {
    jobType: "tournament_drill",
    name: "Drill on the tournament ground",
    capability: "martial",
    targetPosition: { x: 32, y: 24 },
    duration: 3,
    outcome: "tournament_practice",
    facility: "tournament_ground",
    skills: ["melee", "athletics"],
  },
]);

const ROLE_WORK = Object.freeze({
  scout: {
    capabilities: ["scout", "social", "labor", "martial"],
    priorities: {
      scout_area: 90,
      gather_rumors: 55,
      cut_timber: 40,
      paid_work: 35,
      archery_practice: 0,
      tournament_drill: 0,
    },
  },
  support: {
    capabilities: ["heal", "study", "rest", "martial"],
    priorities: {
      heal_party: 100,
      research_lore: 70,
      rest: 40,
      archery_practice: 0,
      tournament_drill: 0,
    },
  },
  frontline: {
    capabilities: ["martial", "labor", "rest"],
    priorities: {
      cut_timber: 60,
      paid_work: 55,
      rest: 35,
      archery_practice: 0,
      tournament_drill: 0,
    },
  },
  rear_guard: {
    capabilities: ["study", "martial", "rest"],
    priorities: {
      research_lore: 85,
      rest: 35,
      archery_practice: 0,
      tournament_drill: 0,
    },
  },
});

export function companionWorkProfile(actor) {
  const profile = ROLE_WORK[actor.role] ?? ROLE_WORK.scout;
  return {
    capabilityTags: [...profile.capabilities, ...lifeCapabilities()],
    workPermissions: {
      allowedJobTypes: [...Object.keys(profile.priorities), ...lifeJobTypes()],
    },
    workPriorities: { ...profile.priorities },
  };
}

export function createCompanionWorkState(actor, position) {
  const profile = companionWorkProfile(actor);
  if (profile.workPriorities[actor.management?.jobFocus] != null)
    profile.workPriorities[actor.management.jobFocus] =
      actor.management.workPriority;
  return {
    id: actor.id,
    actorId: actor.id,
    actorKind: "companion",
    name: actor.name,
    position: { ...position },
    objective: "follow_leader",
    currentAction: "Following the party leader",
    actionReason: "party_order",
    workState: "available",
    lastJobType: null,
    completedJobTypes: [],
    skills: { observation: actor.role === "scout" ? 5 : 2 },
    risk: 0,
    discoveries: [],
    ...profile,
    life: createLifeState(actor.id, "player_directed"),
  };
}

export function companionTemplate(jobType) {
  return COMPANION_WORK_TEMPLATES.find(
    (template) => template.jobType === jobType,
  );
}

export function companionActivityAvailable(state, jobType) {
  const template = companionTemplate(jobType);
  return Boolean(
    template &&
    (!template.facility ||
      state.village.facilities.includes(template.facility)),
  );
}
