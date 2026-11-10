// Shared portrait composition. World size is caller-owned, never inferred from a Boss ID.
export function portraitArena({ width, height, noticeTop, diameterUnits }) {
  if (![width, height, noticeTop, diameterUnits].every(Number.isFinite) || width <= 0 || height <= 0 || diameterUnits <= 0) throw new RangeError('Invalid portrait arena');
  const diameter = Math.min(width * .92, Math.max(60, height - noticeTop - 132 - 24));
  return { x: width / 2, y: Math.max(noticeTop + 132 + diameter / 2, height * .56), scale: diameter / diameterUnits };
}
