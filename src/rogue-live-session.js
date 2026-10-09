import { Dice } from "./dice.js";
import {
  applyRogueTurn,
  rogueRunView,
  rogueUnityView,
  serializeRogueState,
} from "./rogue-engine.js";

export function resumeRememberedRun(store, runId) {
  if (!runId) return null;
  try {
    const state = store.get(runId);
    return { runId: state.id, state };
  } catch {
    return null;
  }
}

export class RogueLiveSession {
  constructor(state, { dice = new Dice() } = {}) {
    this.dice = dice;
    this.replace(state);
  }

  replace(state) {
    this.state = state;
    this.events = [];
    this.dirty = false;
  }

  act(intent, project = rogueRunView, options = {}) {
    const { events } = applyRogueTurn(this.state, intent, this.dice);
    this.state.revision += 1;
    this.events = events;
    this.dirty = true;
    return {
      runId: this.state.id,
      revision: this.state.revision,
      events,
      view: project(this.state, events, options),
    };
  }

  runView() {
    return rogueRunView(this.state, this.events);
  }

  unityView(options = {}) {
    return rogueUnityView(this.state, this.events, options);
  }

  snapshot() {
    return serializeRogueState(this.state);
  }

  markSaved() {
    this.dirty = false;
  }
}
