import { DAMAGE_TYPES } from "./catalog.js";
import { requireRule as check } from "./dice.js";

const includes = (actor, field, damageType) =>
  (actor[field] ?? []).includes(damageType);

export function applyTypedDamage(
  actor,
  rawDamage,
  damageType,
  { critical = false } = {},
) {
  check(
    DAMAGE_TYPES.includes(damageType),
    "INVALID_DAMAGE_TYPE",
    "Damage requires a supported SRD damage type.",
    { damageType },
  );
  let adjusted = Math.max(0, rawDamage);
  if (includes(actor, "immunities", damageType)) adjusted = 0;
  else {
    if (includes(actor, "resistances", damageType))
      adjusted = Math.floor(adjusted / 2);
    if (includes(actor, "vulnerabilities", damageType)) adjusted *= 2;
  }

  const absorbed = Math.min(actor.tempHp ?? 0, adjusted);
  actor.tempHp = Math.max(0, (actor.tempHp ?? 0) - absorbed);
  const hpDamage = adjusted - absorbed,
    priorHp = actor.hp;
  if (priorHp === 0 && hpDamage > 0 && actor.death) {
    actor.death.failures += critical ? 2 : 1;
    if (actor.death.failures >= 3) actor.dead = true;
  }
  actor.hp = Math.max(0, actor.hp - hpDamage);
  const instantDeath =
    priorHp > 0 && actor.maxHp != null && hpDamage - priorHp >= actor.maxHp;
  if (instantDeath) actor.dead = true;
  return {
    raw: rawDamage,
    adjusted,
    absorbedByTemporaryHp: absorbed,
    hpDamage,
    damageType,
    instantDeath,
  };
}

export function resolveDeathSave(hero, dice) {
  const roll = dice.d20();
  let result, deathSnapshot;
  if (roll.natural === 20) {
    hero.hp = 1;
    hero.death = { successes: 0, failures: 0 };
    hero.dead = false;
    hero.conditions = hero.conditions.filter(
      (condition) => condition !== "unconscious",
    );
    result = "revived";
  } else {
    if (roll.natural === 1) hero.death.failures += 2;
    else if (roll.total >= 10) hero.death.successes += 1;
    else hero.death.failures += 1;
    deathSnapshot = { ...hero.death };
    if (hero.death.failures >= 3) {
      hero.dead = true;
      result = "dead";
    } else if (hero.death.successes >= 3) {
      hero.death = { successes: 0, failures: 0 };
      result = "stable";
    } else result = roll.total >= 10 ? "success" : "failure";
  }
  return {
    roll,
    result,
    death: deathSnapshot ?? { ...hero.death },
    hp: hero.hp,
  };
}

export const ROGUE_DND_PROFILE = {
  baseRuleset: "srd-5.1-2014",
  preserved: [
    "d20 attack rolls against Armor Class",
    "natural 1 misses and natural 20 critical hits",
    "critical hits double damage dice, not modifiers",
    "typed damage, immunity, resistance and vulnerability",
    "temporary hit points absorb damage before hit points",
    "zero hit points, unconsciousness and death saving throws",
    "saving throw ability and DC semantics",
    "the unconscious condition created at zero hit points",
  ],
  deferredSharedRules: [
    "full action, bonus-action and reaction economy",
    "the complete condition interactions",
    "concentration and spellcasting",
    "short rests, long rests and class resources",
    "opportunity attacks and cover",
  ],
  explicitOverrides: [
    "one square is five feet, but one step consumes the roguelike turn's movement cadence",
    "the hero resolves first, then eligible enemies resolve in stable order instead of rolling initiative",
    "opening a door consumes a roguelike turn instead of using the tabletop free object interaction",
    "hostiles stop resolving attacks when the solo hero falls unconscious",
    "room-scale awareness and noise replace passive Perception encounter setup",
  ],
};
