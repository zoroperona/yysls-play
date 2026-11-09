// Fictional, deterministic wiring example. No encounter rules or runtime assets.
import { createActions } from '../shared/action-dispatch.js';
import { applyHealthNode } from '../shared/health-node.js';
import { heal, updateRescue } from '../shared/life.js';

export function runExample() {
  const boss = { max: 1000, hp: 900 };
  const party = [{ id: 0, hp: 60 }, { id: 1, hp: 0 }];
  const state = { rescues: 1, rescue: null };
  let running = true;
  const actions = createActions({ enabled: () => running, handlers: { attack: () => { boss.hp -= 10; } } });
  applyHealthNode(boss, { hp: .5 });
  actions.dispatch('q');
  running = false;
  actions.dispatch('q'); // Paused input cannot attack.
  heal(party[0], 10);
  const options = { delay: 5, order: 'exclusive', eligible: () => state.rescues > 0,
    onStart: () => state.rescues--, onComplete: actor => { actor.hp = 30; } };
  updateRescue(state, party, { ...options, now: 0 });
  updateRescue(state, party, { ...options, now: 5 });
  return { boss, party, rescues: state.rescues };
}
console.log(JSON.stringify(runExample()));
