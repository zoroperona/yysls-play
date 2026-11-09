// Healing never revives. Encounter code chooses recipients, rate and healing order.
export function heal(actor, amount, max = 100) {
  if (!Number.isFinite(amount) || amount < 0 || !Number.isFinite(max) || max <= 0) throw new RangeError('Invalid healing amount or maximum');
  if (actor.hp > 0) actor.hp = Math.min(max, actor.hp + amount);
}

// Explicit scheduling preserves whether a newly completed rescue may start another
// in the same update. Budgets, healer eligibility and special resets belong to callers.
export function updateRescue(state, party, { now, delay, eligible, onStart = () => {}, onComplete,
  order = 'complete-start', valid = () => true }) {
  if (!Number.isFinite(now) || !Number.isFinite(delay) || delay < 0) throw new RangeError('Invalid rescue clock');
  if (!['complete-start', 'start-complete', 'exclusive'].includes(order)) throw new RangeError('Invalid rescue order');
  const hadPending = !!state.rescue;
  const start = () => {
    if (state.rescue) return;
    const target = party.find(p => p.hp <= 0 && eligible(p));
    if (!target) return;
    state.rescue = { id: target.id, at: now };
    onStart(target);
  };
  const complete = () => {
    const pending = state.rescue;
    if (!pending) return;
    const target = party.find(p => p.id === pending.id);
    if (!target || target.hp > 0 || !Number.isFinite(pending.at) || !valid(target)) {
      state.rescue = null;
      return;
    }
    if (now - pending.at < delay) return;
    state.rescue = null; // Clear before callback so completion cannot run twice.
    onComplete(target);
  };
  if (order === 'exclusive') { if (hadPending) complete(); else start(); }
  else if (order === 'start-complete') { start(); complete(); }
  else { complete(); start(); }
}
