import { randomInt } from "node:crypto";
export class RuleError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.code = code;
    this.details = details;
  }
}
export function requireRule(condition, code, message, details) {
  if (!condition) throw new RuleError(code, message, details);
}
export const mod = (score) => Math.floor((score - 10) / 2);
export const proficiency = (level) => 2 + Math.floor((level - 1) / 4);
export class Dice {
  constructor(source = (sides) => randomInt(1, sides + 1)) {
    this.source = source;
  }
  die(sides) {
    const result = this.source(sides);
    requireRule(
      Number.isInteger(result) && result >= 1 && result <= sides,
      "INVALID_RNG",
      "Invalid die result.",
    );
    return result;
  }
  roll(expression, { critical = false } = {}) {
    const match = /^(\d{1,3})d(\d{1,4})([+-]\d{1,5})?$/.exec(
      expression.replaceAll(" ", ""),
    );
    requireRule(
      match,
      "INVALID_DICE",
      "Use NdS, optionally followed by +N or -N.",
    );
    const count = Number(match[1]) * (critical ? 2 : 1),
      sides = Number(match[2]),
      bonus = Number(match[3] ?? 0);
    requireRule(
      count >= 1 && count <= 200 && sides >= 2 && sides <= 1000,
      "INVALID_DICE",
      "Dice limits: 1–200 dice, 2–1000 sides.",
    );
    const rolls = Array.from({ length: count }, () => this.die(sides));
    return {
      expression,
      critical,
      rolls,
      bonus,
      total: rolls.reduce((a, b) => a + b, bonus),
    };
  }
  d20(bonus = 0, { advantage = false, disadvantage = false } = {}) {
    const mode =
      advantage === disadvantage
        ? "normal"
        : advantage
          ? "advantage"
          : "disadvantage";
    const rolls = Array.from({ length: mode === "normal" ? 1 : 2 }, () =>
      this.die(20),
    );
    const natural =
      mode === "advantage"
        ? Math.max(...rolls)
        : mode === "disadvantage"
          ? Math.min(...rolls)
          : rolls[0];
    return { rolls, mode, natural, bonus, total: natural + bonus };
  }
}
