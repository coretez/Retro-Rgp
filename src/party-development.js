export const CHARACTER_SKILLS = Object.freeze([
  { key: "athletics", name: "Athletics", ability: "str", category: "physical" },
  { key: "melee", name: "Melee", ability: "str", category: "combat" },
  {
    key: "marksmanship",
    name: "Marksmanship",
    ability: "dex",
    category: "combat",
  },
  { key: "stealth", name: "Stealth", ability: "dex", category: "field" },
  { key: "survival", name: "Survival", ability: "wis", category: "field" },
  { key: "vigilance", name: "Vigilance", ability: "wis", category: "field" },
  { key: "medicine", name: "Medicine", ability: "wis", category: "craft" },
  { key: "arcana", name: "Arcana", ability: "int", category: "knowledge" },
  { key: "lore", name: "Lore", ability: "int", category: "knowledge" },
  { key: "crafting", name: "Crafting", ability: "int", category: "craft" },
  { key: "leadership", name: "Leadership", ability: "cha", category: "social" },
  {
    key: "negotiation",
    name: "Negotiation",
    ability: "cha",
    category: "social",
  },
]);

export const COMBAT_ROLES = Object.freeze([
  "leader",
  "scout",
  "frontline",
  "support",
  "rear_guard",
]);

const CLASS_SKILLS = Object.freeze({
  fighter: { melee: 2, athletics: 2, leadership: 1, vigilance: 1 },
  rogue: { stealth: 2, vigilance: 2, marksmanship: 1, survival: 1 },
  cleric: { medicine: 2, lore: 1, leadership: 1, melee: 1 },
  mage: { arcana: 2, lore: 2, marksmanship: 1, crafting: 1 },
});

const DEFAULT_ABILITIES = Object.freeze({
  fighter: { str: 16, dex: 12, con: 14, int: 10, wis: 11, cha: 13 },
  rogue: { str: 11, dex: 16, con: 12, int: 13, wis: 14, cha: 10 },
  cleric: { str: 13, dex: 10, con: 14, int: 11, wis: 16, cha: 12 },
  mage: { str: 8, dex: 14, con: 12, int: 16, wis: 13, cha: 10 },
});

export function defaultAbilities(actorClass) {
  return { ...(DEFAULT_ABILITIES[actorClass] ?? DEFAULT_ABILITIES.fighter) };
}

export function createCharacterDevelopment(actor) {
  const starting = CLASS_SKILLS[actor.class] ?? {};
  return {
    skills: Object.fromEntries(
      CHARACTER_SKILLS.map(({ key }) => [
        key,
        { rank: starting[key] ?? 0, practice: 0 },
      ]),
    ),
  };
}

export function createPartyManagement(actor) {
  const jobFocus = {
    fighter: "lead_party",
    rogue: "scout_area",
    cleric: "heal_party",
    mage: "research_lore",
  }[actor.class];
  return {
    combatRole: actor.role ?? (actor.class === "fighter" ? "leader" : "scout"),
    jobFocus: jobFocus ?? "paid_work",
    workPriority: 70,
  };
}

export function skillTarget(rank) {
  return 5 * (rank + 1);
}

export function characterSkillView(actor) {
  return CHARACTER_SKILLS.map((definition) => {
    const value = actor.development.skills[definition.key];
    return {
      ...definition,
      rank: value.rank,
      practice: value.practice,
      practiceTarget: skillTarget(value.rank),
    };
  });
}

const EVENT_SKILLS = Object.freeze({
  attack: "melee",
  spell_cast: "arcana",
  companion_heal: "medicine",
  group_order_issued: "leadership",
  local_examined: "vigilance",
  world_manipulated: "crafting",
  local_talked: "negotiation",
  treasure_found: "vigilance",
  feature_found: "vigilance",
});

export function awardPartyPractice(state, events) {
  const actors = [state.hero, ...state.companions],
    practiceEvents = [];
  for (const event of [...events]) {
    const actor = actors.find((candidate) => candidate.id === event.actorId),
      skillKeys = event.skills ?? [EVENT_SKILLS[event.type]].filter(Boolean);
    if (!skillKeys.length || !actor?.development) continue;
    for (const skillKey of skillKeys) {
      const skill = actor.development.skills[skillKey];
      if (!skill) continue;
      skill.practice += 1;
      while (skill.rank < 5 && skill.practice >= skillTarget(skill.rank)) {
        skill.practice -= skillTarget(skill.rank);
        skill.rank += 1;
        practiceEvents.push({
          type: "skill_improved",
          actorId: actor.id,
          actorName: actor.name,
          skillKey,
          rank: skill.rank,
        });
      }
    }
  }
  events.push(...practiceEvents);
}
