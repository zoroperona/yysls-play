// Locate a concrete occurrence, never by a repeated skill name.
export function adjacentEvent(timeline, current, direction) {
  if (![1, -1].includes(direction)) return null;
  if (Number.isInteger(current.index)) return timeline[current.index + direction] ?? null;
  if (!Number.isFinite(current.at)) return null;
  return (direction > 0 ? timeline : [...timeline].reverse()).find(e => direction > 0 ? e.at > current.at : e.at < current.at) ?? null;
}

export function onceAt(done, key, elapsed, at, action, epsilon = 0) {
  if (!Number.isFinite(elapsed) || !Number.isFinite(at) || elapsed + epsilon < at || done.has(key)) return false;
  // Record before calling: nested updates cannot trigger the same event twice.
  done.add(key);
  action();
  return true;
}

// Lifecycle orchestration only; callbacks own prerequisites, cycle and resource policies.
export function createPracticeController({ clear, canJump, jump, reset, retry, terminal, before = () => {}, after = () => {} }) {
  function transition(kind, fn, value) {
    clear(); before(kind);
    const result = fn(value);
    after(kind, result);
    return result;
  }
  return {
    reset: value => transition('reset', reset, value),
    retry: () => transition('retry', terminal() ? reset : retry),
    jump: delta => [1, -1].includes(delta) && canJump() ? transition('jump', jump, delta) : false,
  };
}
