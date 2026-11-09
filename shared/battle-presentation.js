export function formatTime(value) {
  const t = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}
export function healthPercent(value, max) {
  return Number.isFinite(value) && Number.isFinite(max) && max > 0 ? Math.max(0, Math.min(100, value / max * 100)) : 0;
}
export function partySummary(party) {
  return { alive: party.filter(p => p.hp > 0).length, total: party.length };
}
export function hintView(rows = []) {
  return { skill: rows[0] ?? '', hint: rows[1] ?? '', countdown: rows[2] ?? '' };
}
export function selectNotice(entries, visible = true) {
  if (!visible) return null;
  return entries.filter(e => e?.text).reduce((best, entry) => !best || (entry.priority ?? 0) > (best.priority ?? 0) ? entry : best, null);
}
export function resultView(game, { name, victory = 'complete', terminal = ['wipe', 'complete', 'ended'], failureTitle = '演练失败' }) {
  const won = game.status === victory;
  return { terminal: terminal.includes(game.status) || won, won,
    title: won ? `击败${name}` : game.status === 'wipe' ? failureTitle : '演练结束',
    reason: game.reason ?? game.endReason ?? '' };
}
export function formatLogs(rows, { reverse = false, events = true, empty = '' } = {}) {
  return (reverse ? [...rows].reverse() : rows).map(l => `[${formatTime(l.t)}] ${events && l.event != null ? `[${l.event}] ` : ''}${l.message ?? l.s ?? ''}`).join('\n') || empty;
}
