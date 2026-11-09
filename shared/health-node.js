// Atomically apply only the supplied boss bars; shields/party resources are untouched.
// Ratios use [0, scale]. Percent-based encounters can retain their original arithmetic.
export function applyHealthNode(boss, values, { mode = 'force', scale = 1, minimum = 1, round = true, allowZero = true } = {}) {
  if (!['force', 'preserve'].includes(mode) || !Number.isFinite(boss.max) || boss.max <= 0 ||
      !Number.isFinite(scale) || scale <= 0 || !Number.isFinite(minimum) || minimum < 0 || minimum > boss.max) throw new RangeError('Invalid boss HP node policy');
  const updates = Object.entries(values).map(([key, ratio]) => {
    if (key === 'max' || !Object.prototype.hasOwnProperty.call(boss, key) || !Number.isFinite(boss[key]) ||
        !Number.isFinite(ratio) || ratio < 0 || (!allowZero && ratio === 0) || ratio > scale) throw new RangeError('Invalid boss HP node');
    const value = boss.max * ratio / scale;
    if (!Number.isFinite(value)) throw new RangeError('Invalid boss HP node');
    return [key, Math.max(minimum, round ? Math.round(value) : value)];
  });
  if (mode === 'preserve') return;
  for (const [key, value] of updates) boss[key] = value;
}
