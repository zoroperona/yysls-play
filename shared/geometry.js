// All points/radii must use the SAME caller-owned coordinate unit.
// No implicit conversion between arena units and metres.
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export function segmentDistance(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared)) : 0;
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
}
// Stable ties retain input ordering; nearest=false preserves first-match selection.
export function pickTarget(point, candidates, { radius, eligible = () => true, nearest = true }) {
  if (!Number.isFinite(radius) || radius <= 0) return null;
  let selected = null, best = radius;
  for (const target of candidates) {
    if (!eligible(target)) continue;
    const d = distance(point, target);
    if (d < best) {
      selected = target; best = d;
      if (!nearest) break;
    }
  }
  return selected;
}
