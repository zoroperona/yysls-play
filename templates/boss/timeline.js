// No real encounter data. at/resolveAt/endAt use combat seconds.
// Required: id, mechanicType, phase, at, resolveAt, endAt,
// bossHpRatio, evidenceId, practiceSetup, cleanup.
export const TIMELINE = [];

export function validateTimeline(events) {
  if (!events.length) throw new Error('时间轴待填写，不能开始战斗');
  const ids = new Set(); let previous = -Infinity;
  for (const event of events) {
    if (!event.id || ids.has(event.id)) throw new Error('轮次 ID 必须唯一');
    ids.add(event.id);
    if (!event.mechanicType || !event.phase || !event.evidenceId || !event.practiceSetup || !Array.isArray(event.cleanup))
      throw new Error('规则、证据或前置/清理字段缺失');
    if (![event.at, event.resolveAt, event.endAt].every(Number.isFinite) ||
        event.at < 0 || event.at < previous || event.resolveAt < event.at || event.endAt < event.resolveAt)
      throw new Error('时间必须有序且单位为秒');
    if (!Number.isFinite(event.bossHpRatio) || event.bossHpRatio <= 0 || event.bossHpRatio > 1)
      throw new Error('血量节点必须明确填写，不能用未知值开局');
    previous = event.at;
  }
  return events;
}
