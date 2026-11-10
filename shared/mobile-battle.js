// Shared portrait composition. World size is caller-owned, never inferred from a Boss ID.
export function portraitArena({ width, height, noticeTop, diameterUnits, noticeHeight = 96 }) {
  if (![width, height, noticeTop, diameterUnits, noticeHeight].every(Number.isFinite) || width <= 0 || height <= 0 || diameterUnits <= 0 || noticeHeight < 0) throw new RangeError('Invalid portrait arena');
  const arenaTop = noticeTop + noticeHeight + 8;
  const diameter = Math.min(width * .92, Math.max(60, height - arenaTop - 24));
  return { x: width / 2, y: Math.max(arenaTop + diameter / 2, height * .5), scale: diameter / diameterUnits };
}
