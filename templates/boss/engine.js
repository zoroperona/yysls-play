import { TIMELINE, validateTimeline } from './timeline.js';
// Deliberate integration boundary, not a finished shared combat engine.
export function createEncounter() {
  validateTimeline(TIMELINE);
  throw new Error('根据已确认规则实现引擎、AI、成功失败与生命周期后再接入');
}
