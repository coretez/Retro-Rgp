import { FOOD_PLAYBOOKS, VILLAGE_COMMANDS } from "./village-playbooks.js";

const CROP_COMMANDS = Object.freeze({
  prepare: "prepare_crop_cell",
  sow: "sow_crop_cell",
  harvest: "harvest_crop_cell",
});

const JOB_COMMANDS = new Map([
  ["gather_wild_food", "gather_wild_food"],
  ["craft_fishing_net", "craft_fishing_net"],
  ["catch_fish", "catch_river_fish"],
  ["craft_hunting_bow", "craft_hunting_bow"],
  ["hunt_game", "hunt_wild_game"],
  ["water_fields", "water_crop"],
  ["save_seed", "save_crop_seed"],
  ["prepare_meal", "prepare_fish_meal"],
  ["bake_grain_meal", "prepare_grain_meal"],
  ["cook_vegetable_stew", "prepare_vegetable_meal"],
  ["cook_beef_stew", "prepare_meat_meal"],
  ["eat_meal", "eat_prepared_meal"],
  ["haul_stock", "haul_physical_stock"],
]);

function commandForJob(job) {
  if (job.jobType === "grow_grain")
    return CROP_COMMANDS[job.plan?.cropAction] ?? null;
  return JOB_COMMANDS.get(job.jobType) ?? null;
}

function playbooksForCommand(commandId) {
  return Object.entries(FOOD_PLAYBOOKS)
    .filter(([, playbook]) =>
      [
        ...playbook.steps,
        ...(playbook.alternatives ?? []).map((id) => ({ commandId: id })),
      ].some((step) => step.commandId === commandId),
    )
    .map(([id]) => id);
}

function haulPlaybook(job) {
  const source = job.transfer?.sourceStockpileKey ?? "";
  if (source.includes("river")) return "river_fishing";
  if (source.includes("forage")) return "emergency_forage";
  if (source.includes("meat")) return "hunting";
  return "grain_cycle";
}

function playbookForJob(job, commandId) {
  if (commandId === "haul_physical_stock") return haulPlaybook(job);
  return playbooksForCommand(commandId)[0] ?? null;
}

function commandReadiness(job) {
  if (["reserved", "active"].includes(job.status)) return "active";
  if (["blocked", "suspended"].includes(job.status)) return "blocked";
  return "ready";
}

function annotateJob(job, commandId, playbookId, focus) {
  job.plan ??= {};
  job.plan.playbookId = playbookId;
  job.plan.playbookCommandId = commandId;
  job.plan.playbookStepIndex = FOOD_PLAYBOOKS[playbookId].steps.findIndex(
    (step) => step.commandId === commandId,
  );
  job.basePriority = Math.max(
    job.basePriority ?? job.priority,
    focus ? 146 : 126,
  );
}

function directiveFor(job) {
  const commandId = commandForJob(job);
  if (!commandId || !VILLAGE_COMMANDS[commandId]) return null;
  const playbookId = playbookForJob(job, commandId);
  if (!playbookId) return null;
  return {
    playbookId,
    commandId,
    jobId: job.id,
    jobType: job.jobType,
    readiness: commandReadiness(job),
    blocker: job.blockingReason ?? job.statusReason ?? null,
    priority: job.priority,
  };
}

function directiveRank(directive) {
  const readiness =
    directive.readiness === "active"
      ? 3
      : directive.readiness === "ready"
        ? 2
        : 0;
  return readiness * 1000 + directive.priority;
}

function activeDirectives(state) {
  return state.village.jobs
    .filter((job) => !["completed", "cancelled"].includes(job.status))
    .map(directiveFor)
    .filter(Boolean)
    .sort((left, right) => directiveRank(right) - directiveRank(left));
}

export function syncFoodPlaybookController(state) {
  const directives = activeDirectives(state),
    focus = directives[0] ?? null;
  for (const directive of directives) {
    const job = state.village.jobs.find(
      (candidate) => candidate.id === directive.jobId,
    );
    annotateJob(
      job,
      directive.commandId,
      directive.playbookId,
      directive === focus,
    );
  }
  state.village.playbookController = {
    updatedAtTick: state.tick,
    focusPlaybookId: focus?.playbookId ?? null,
    focusCommandId: focus?.commandId ?? null,
    directives,
  };
  return state.village.playbookController;
}
