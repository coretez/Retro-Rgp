import { applyRogueTurn, newRogueRun } from "../src/rogue-engine.js";
import {
  createVillageRunTelemetry,
  diffVillageMaterialLedgers,
  evaluateVillageAudit,
  recordVillageRunTelemetry,
  villageRunTelemetryReport,
  villageSimulationAudit,
} from "../src/village-audit.js";
import {
  CANONICAL_FOUNDING_PROOF_INPUT,
  runCanonicalVillageProof,
  runDomesticFoodProof,
  runFiveTownProof,
  runFoundingSurvivalProof,
  runReleaseGateProof,
  runSchedulerTimingProof,
} from "../src/village-proof.js";

function positiveInteger(value, name) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1)
    throw new Error(`${name} must be a positive integer`);
  return parsed;
}

const BOOLEAN_ARGUMENTS = Object.freeze({
  "--prove": "prove",
  "--survival": "survival",
  "--domestic": "domestic",
  "--scheduler": "scheduler",
  "--release": "release",
  "--full-town": "fullTown",
});

function consumeValueArgument(options, argument, value) {
  if (argument === "--ticks") options.ticks = positiveInteger(value, "ticks");
  else if (argument === "--runs") options.runs = positiveInteger(value, "runs");
  else if (argument === "--checkpoints")
    options.checkpoints = value
      .split(",")
      .map((item) => Number.parseInt(item, 10));
  else if (argument === "--require-facility")
    options.requiredFacilities.push(...value.split(","));
  else return false;
  return true;
}

function parseArguments(argv) {
  const options = {
    ticks: 500,
    runs: 10,
    checkpoints: null,
    requiredFacilities: [],
    prove: false,
    survival: false,
    domestic: false,
    scheduler: false,
    release: false,
    fullTown: false,
    gate: true,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (/^\d+$/.test(argument))
      options.ticks = positiveInteger(argument, "ticks");
    else if (BOOLEAN_ARGUMENTS[argument])
      options[BOOLEAN_ARGUMENTS[argument]] = true;
    else if (argument === "--no-gate") options.gate = false;
    else if (consumeValueArgument(options, argument, argv[index + 1]))
      index += 1;
    else throw new Error(`Unknown argument: ${argument}`);
  }
  return options;
}

function runSingleAudit(options) {
  const state = newRogueRun({
      ...CANONICAL_FOUNDING_PROOF_INPUT,
      requestId: "founding-audit-cli",
      runId: "66fc7e4f-07fe-5d64-a58b-788b673800bc",
      seed: "founding-audit-cli",
    }),
    before = villageSimulationAudit(state),
    telemetry = createVillageRunTelemetry(state);

  for (let tick = 0; tick < options.ticks; tick += 1) {
    const result = applyRogueTurn(state, { kind: "wait" });
    recordVillageRunTelemetry(telemetry, state, result.events);
  }

  const after = villageSimulationAudit(state),
    gate = evaluateVillageAudit(after, {
      requiredFacilities: options.requiredFacilities,
    });
  return {
    output: {
      mode: "audit",
      ticks: options.ticks,
      before,
      after,
      materialDelta: diffVillageMaterialLedgers(before, after),
      telemetry: villageRunTelemetryReport(telemetry),
      gate,
    },
    passed: !options.gate || gate.passed,
  };
}

function runProof(options) {
  const checkpoints = options.checkpoints ?? [0, 100, 250, options.ticks],
    proof = runCanonicalVillageProof({
      runs: options.runs,
      ticks: options.ticks,
      checkpoints,
      gate: { requiredFacilities: options.requiredFacilities },
    });
  return {
    output: { mode: "proof", ...proof },
    passed: !options.gate || proof.passed,
  };
}

function runSurvivalProof(options) {
  const proof = runFoundingSurvivalProof();
  return {
    output: { mode: "survival", ...proof },
    passed: !options.gate || proof.passed,
  };
}

function runDomesticProof(options) {
  const proof = runDomesticFoodProof();
  return {
    output: { mode: "domestic", ...proof },
    passed: !options.gate || proof.passed,
  };
}

function runSchedulerProof(options) {
  const proof = runSchedulerTimingProof();
  return {
    output: { mode: "scheduler", ...proof },
    passed: !options.gate || proof.passed,
  };
}

function runReleaseProof(options) {
  const proof = runReleaseGateProof();
  return {
    output: { mode: "release", ...proof },
    passed: !options.gate || proof.passed,
  };
}

function runFullTownProof(options) {
  const proof = runFiveTownProof({
    seeds: undefined,
    dayTicks: options.ticks === 500 ? 2400 : options.ticks,
  });
  return {
    output: { mode: "full-town", ...proof },
    passed: !options.gate || proof.passed,
  };
}

try {
  const options = parseArguments(process.argv.slice(2)),
    result = options.fullTown
      ? runFullTownProof(options)
      : options.release
        ? runReleaseProof(options)
        : options.scheduler
          ? runSchedulerProof(options)
          : options.domestic
            ? runDomesticProof(options)
            : options.survival
              ? runSurvivalProof(options)
              : options.prove
                ? runProof(options)
                : runSingleAudit(options);
  console.log(JSON.stringify(result.output, null, 2));
  if (!result.passed) process.exitCode = 1;
} catch (error) {
  console.error(error.message);
  process.exitCode = 2;
}
