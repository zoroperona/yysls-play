// Platform-neutral fixed-step driver. Encounter clocks and AI remain in the engine.
export function createBattleClock({ running, step, control = () => [], clearInput = () => {}, timestep = 1 / 60, maxDelta = .1 }) {
  if (!(Number.isFinite(timestep) && timestep > 0 && Number.isFinite(maxDelta) && maxDelta >= timestep)) throw new RangeError('Invalid battle clock');
  let accumulator = 0;
  return {
    reset() { accumulator = 0; },
    advance(seconds) {
      if (!running()) { accumulator = 0; return; }
      if (!Number.isFinite(seconds) || seconds <= 0) return;
      accumulator += Math.min(maxDelta, seconds);
      while (accumulator >= timestep && running()) {
        const before = control();
        accumulator -= timestep;
        step(timestep);
        const after = control();
        if (!running() || before.some((allowed, i) => allowed && !after[i])) {
          accumulator = 0;
          clearInput();
          break;
        }
      }
    },
  };
}

export function movementInput(keys, touch) {
  return { dx: Number(keys.has('d')) - Number(keys.has('a')) + touch.dx,
    dy: Number(keys.has('s')) - Number(keys.has('w')) + touch.dy,
    attack: keys.has('q') || touch.attack };
}

// Keep pagehide in the same pause/clear path as blur: bfcache must not resume held input.
export function bindBattleVisibility({ pause, clear, audio, window: win = globalThis.window, document: doc = globalThis.document }) {
  const suspend = () => { pause(); clear(); audio?.pause(); };
  const visibility = () => { if (doc.hidden) suspend(); };
  win.addEventListener('blur', suspend);
  win.addEventListener('pagehide', suspend);
  doc.addEventListener('visibilitychange', visibility);
  return () => {
    win.removeEventListener('blur', suspend);
    win.removeEventListener('pagehide', suspend);
    doc.removeEventListener('visibilitychange', visibility);
  };
}
