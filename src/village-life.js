export const NEED_KEYS = Object.freeze([
  "hunger",
  "fatigue",
  "safety",
  "social",
  "morale",
]);

export const NEED_JOB_TYPES = Object.freeze({
  hunger: "eat_meal",
  fatigue: "sleep",
  safety: "seek_safety",
  social: "socialize",
  morale: "worship",
});

export const LIFE_JOB_TYPES = new Set(Object.values(NEED_JOB_TYPES));

export const SIMULATION_SECONDS_PER_TICK = 36;
export const SIMULATION_MINUTES_PER_TICK = SIMULATION_SECONDS_PER_TICK / 60;

export const LIFE_TARGETS = Object.freeze({
  hunger: {
    objectKind: "meal",
    name: "Eat a meal at the Lantern",
    position: { x: -10, y: 4 },
    positions: [
      { x: -10, y: 4 },
      { x: -9, y: 4 },
      { x: -8, y: 4 },
      { x: -7, y: 4 },
    ],
    accessPosition: { x: -8, y: 10 },
    capability: "eat",
    duration: 30,
    gain: 48,
  },
  fatigue: {
    objectKind: "bed",
    name: "Sleep at the Lantern",
    position: { x: -13, y: 8 },
    positions: [
      { x: -13, y: 8 },
      { x: -11, y: 8 },
      { x: -9, y: 8 },
      { x: -7, y: 8 },
      { x: -5, y: 8 },
    ],
    accessPosition: { x: -8, y: 10 },
    capability: "sleep",
    duration: 480,
    gain: 58,
  },
  safety: {
    objectKind: "seat",
    name: "Take shelter in the chapel",
    position: { x: 45, y: 8 },
    positions: [
      { x: 45, y: 8 },
      { x: 49, y: 8 },
      { x: 51, y: 8 },
    ],
    accessPosition: { x: 47, y: 9 },
    capability: "seek_safety",
    duration: 30,
    gain: 45,
  },
  social: {
    objectKind: "seat",
    name: "Share company with a neighbor",
    position: { x: 17, y: 14 },
    positions: [
      { x: 17, y: 14 },
      { x: 23, y: 10 },
      { x: 40, y: 14 },
      { x: 12, y: 24 },
      { x: 41, y: 13 },
      { x: 0, y: 13 },
    ],
    capability: "socialize",
    duration: 60,
    gain: 46,
  },
  morale: {
    objectKind: "worship",
    name: "Worship at the road altar",
    position: { x: 47, y: 4 },
    positions: [
      { x: 47, y: 4 },
      { x: 45, y: 4 },
      { x: 49, y: 4 },
      { x: 51, y: 4 },
    ],
    accessPosition: { x: 47, y: 9 },
    capability: "worship",
    duration: 45,
    gain: 42,
  },
});

const NEED_DECAY_PER_QUARTER_HOUR = Object.freeze({
  hunger: 0.35,
  fatigue: 0.25,
  safety: 0,
  social: 0.18,
  morale: 0.12,
});

export function scheduleBlock(hour) {
  if (hour < 6 || hour >= 22) return "rest";
  if (hour < 8) return "free_time";
  if (hour < 17) return "work";
  return "free_time";
}

export function createTownClock() {
  return {
    day: 1,
    hour: 6,
    minute: 0,
    second: 0,
    block: scheduleBlock(6),
    phase: daylightPhase(6),
  };
}

export function advanceTownClock(clock) {
  clock.second = (clock.second ?? 0) + SIMULATION_SECONDS_PER_TICK;
  if (clock.second >= 60) {
    clock.minute = (clock.minute ?? 0) + Math.floor(clock.second / 60);
    clock.second %= 60;
  }
  if (clock.minute >= 60) {
    clock.hour += Math.floor(clock.minute / 60);
    clock.minute %= 60;
  }
  if (clock.hour >= 24) {
    clock.hour = 0;
    clock.day += 1;
  }
  clock.block = scheduleBlock(clock.hour);
  clock.phase = daylightPhase(clock.hour, clock.minute);
  return clock;
}

export function daylightPhase(hour, minute = 0) {
  const time = hour + minute / 60;
  if (time >= 5 && time < 7) return "dawn";
  if (time >= 7 && time < 18) return "day";
  if (time >= 18 && time < 20) return "dusk";
  return "night";
}

export function daylightLevel(clock) {
  const time = clock.hour + (clock.minute ?? 0) / 60;
  if (clock.phase === "dawn") return 0.25 + ((time - 5) / 2) * 0.75;
  if (clock.phase === "dusk") return 1 - ((time - 18) / 2) * 0.75;
  return clock.phase === "day" ? 1 : 0.25;
}

export function createLifeState(actorId, authority = "autonomous") {
  return {
    actorId,
    authority,
    schedule: "resident_day",
    scheduleBlock: "free_time",
    statusTags: [],
    needs: { hunger: 68, fatigue: 66, safety: 82, social: 64, morale: 67 },
    misery: 0,
    miseryLevel: "comfortable",
    miseryReasons: [],
    memories: [],
    recommendation: null,
  };
}

export function clampNeed(value) {
  return Math.max(0, Math.min(100, value));
}

export function lifeMisery(life) {
  const tags = new Set(life.statusTags ?? []),
    reasons = [],
    add = (condition, reason, amount) => {
      if (condition) reasons.push({ reason, amount });
    };
  add(tags.has("homeless"), "homeless", 10);
  add(tags.has("rough_sleeping"), "rough_sleeping", 45);
  for (const [need, value] of Object.entries(life.needs ?? {}))
    add(value <= 40, `${need}_deprivation`, Math.ceil((40 - value) / 2));
  const score = clampNeed(
    reasons.reduce((total, entry) => total + entry.amount, 0),
  );
  return {
    score,
    level: score >= 75 ? "extreme" : score >= 50 ? "severe" : score >= 25 ? "strained" : "comfortable",
    reasons: reasons.map((entry) => entry.reason),
  };
}

export function updateLifeState(life, clock, danger = false) {
  life.scheduleBlock = clock.block;
  life.statusTags ??= [];
  for (const need of NEED_KEYS) {
    if (need === "safety")
      life.needs.safety = clampNeed(
        life.needs.safety +
          (danger ? -8 : life.statusTags.includes("homeless") ? -0.25 : 1) *
            (SIMULATION_MINUTES_PER_TICK / 15),
      );
    else
      life.needs[need] = clampNeed(
        life.needs[need] -
          NEED_DECAY_PER_QUARTER_HOUR[need] *
            (SIMULATION_MINUTES_PER_TICK / 15),
      );
  }
  const misery = lifeMisery(life);
  life.misery = misery.score;
  life.miseryLevel = misery.level;
  life.miseryReasons = misery.reasons;
  life.recommendation = recommendedNeed(life);
  return life;
}

function scheduleNeedBonus(block, need) {
  if (block === "rest") return need === "fatigue" ? 70 : -8;
  if (block === "work") return need === "safety" ? 4 : -12;
  return ["social", "morale", "hunger"].includes(need) ? 10 : 2;
}

export function needAttentionThreshold(life, need) {
  if (life.scheduleBlock === "rest" && need === "fatigue") return 98;
  if (life.scheduleBlock !== "work") return 60;
  return {
    hunger: 45,
    fatigue: 35,
    safety: 45,
    social: 20,
    morale: 20,
  }[need];
}

export function needScore(life, need) {
  const deficit = 100 - life.needs[need],
    critical = life.needs[need] <= 25 ? 120 : 0,
    homelessBonus = life.statusTags?.includes("homeless")
      ? ({ hunger: 20, safety: 10 }[need] ?? 0)
      : 0;
  return (
    deficit +
    critical +
    homelessBonus +
    scheduleNeedBonus(life.scheduleBlock, need)
  );
}

export function recommendedNeed(life) {
  return (
    NEED_KEYS.map((need) => ({ need, score: needScore(life, need) }))
      .filter(
        ({ need }) => life.needs[need] < needAttentionThreshold(life, need),
      )
      .sort(
        (left, right) =>
          right.score - left.score || left.need.localeCompare(right.need),
      )[0] ?? null
  );
}

export function needJobPriority(life, need) {
  return Math.min(200, Math.max(30, needScore(life, need)));
}

export function scheduleJobModifier(block, jobType) {
  if (LIFE_JOB_TYPES.has(jobType)) return 0;
  if (["respond_danger", "investigate_crime"].includes(jobType)) return 0;
  if (block === "work") return 15;
  if (block === "rest") return -20;
  return -5;
}

export function satisfyNeed(life, need, amount, tick, description) {
  life.needs[need] = clampNeed(life.needs[need] + amount);
  life.memories.push({ need, description, tick });
  life.memories = life.memories.slice(-8);
  life.recommendation = recommendedNeed(life);
}

export function lifeCapabilities() {
  return Object.values(LIFE_TARGETS).map((target) => target.capability);
}

export function lifeJobTypes() {
  return Object.values(NEED_JOB_TYPES);
}
