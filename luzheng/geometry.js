export function segmentDistance(p, a, b) {
  const dx = b.x - a.x,
    dy = b.y - a.y,
    n = dx * dx + dy * dy,
    t = n
      ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / n))
      : 0;
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
}
export function hitsSword(origin, target, radius = 30) {
  if (origin.x * target.x >= 0) return false;
  const t = -origin.x / (target.x - origin.x);
  return Math.abs(origin.y + (target.y - origin.y) * t) <= 280;
}
export function swordImpact(origin, target) {
  if (!hitsSword(origin, target)) return null;
  const x = Math.sign(origin.x) * 38;
  const t = (x - origin.x) / (target.x - origin.x);
  const y = origin.y + (target.y - origin.y) * t;
  return Math.abs(y) <= 280 ? { x, y } : null;
}
export function blocksBeforeSword(p, origin, impact) {
  const dx = impact.x - origin.x,
    dy = impact.y - origin.y;
  const projection =
    ((p.x - origin.x) * dx + (p.y - origin.y) * dy) / (dx * dx + dy * dy);
  return (
    projection > 0 && projection < 1 && segmentDistance(p, origin, impact) < 16
  );
}
export function sweepSlots(elapsed) {
  const angle =
    ((150 -
      60 * Math.min(1, Math.max(0, (elapsed - 3) / 5)) -
      30 * Math.min(1, Math.max(0, (elapsed - 8) / 7))) *
      Math.PI) /
    180;
  return [250, 185, 120, 55].map((r) => ({
    x: Math.cos(angle) * r,
    y: Math.sin(angle) * r,
  }));
}
export function qiSource(index) {
  return { x: index % 2 ? -280 : 280, y: (Math.floor(index / 2) - 1) * 35 };
}
// 两条并排长条随 y 向外倾斜；外条中心与判定共用。
export function cleaveX(team, y, outer = true) {
  return (team === 1 ? -1 : 1) * ((outer ? 240 : 180) + y * 0.12);
}
export function inCleaveOuter(p) {
  return Math.abs(p.y) <= 210 && Math.abs(p.x - cleaveX(p.team, p.y)) <= 25;
}
