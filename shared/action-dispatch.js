const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const aliases = Object.freeze({ e: 'parry', shift: 'dodge', f: 'interact', g: 'special', ' ': 'jump', space: 'jump', q: 'attack', '1': 'attack' });
export function actionName(input) { return hasOwn(aliases, input) ? aliases[input] : input; }
// Boss handlers remain the authoritative validators; UI state may add restrictions.
export function createActions({ enabled, handlers, states = {}, onRejected = () => {} }) {
  const state = input => {
    const name = actionName(input), own = (hasOwn(states, name) ? states[name]() : null) ?? {};
    const supported = hasOwn(handlers, name) && typeof handlers[name] === 'function';
    return { ...own, visible: supported && own.visible !== false,
      enabled: supported && enabled() && own.enabled !== false,
      cooldown: Number.isFinite(own.cooldown) ? Math.max(0, own.cooldown) : 0,
      reason: own.reason ?? '' };
  };
  return { state, dispatch(input) {
    const name = actionName(input);
    const current = state(name);
    if (!current.enabled) {
      if (enabled() && current.reason) onRejected(current, name);
      return false;
    }
    return handlers[name]() !== false;
  } };
}
