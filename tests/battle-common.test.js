import test from 'node:test';
import assert from 'node:assert/strict';
import { createBattleClock, bindBattleVisibility } from '../shared/battle-session.js';
import { adjacentEvent, onceAt, createPracticeController } from '../shared/timeline-navigation.js';
import { createResultFlow } from '../shared/battle-dom.js';
import { healthPercent, selectNotice, resultView } from '../shared/battle-presentation.js';
import { createActions } from '../shared/action-dispatch.js';

test('clock stops within a frame at terminal/control loss and drops stale partial steps', () => {
  let running = true, active = true, steps = 0, clears = 0;
  const clock = createBattleClock({ running: () => running, control: () => [active], clearInput: () => clears++, step: () => { steps++; active = false; } });
  clock.advance(.1); assert.equal(steps, 1); assert.equal(clears, 1);
  running = false; clock.advance(10); running = true; active = true;
  clock.advance(.001); assert.equal(steps, 1);
  for (const value of [NaN, Infinity, -1]) clock.advance(value);
  assert.equal(steps, 1);
  const terminal = createBattleClock({ running: () => running, step: () => { steps++; running = false; } });
  terminal.advance(.1); assert.equal(steps, 2);
});

test('background lifecycle pauses and clears on pagehide, and can be disposed', () => {
  const win = new EventTarget(), doc = new EventTarget(), calls = [];
  const dispose = bindBattleVisibility({ window: win, document: doc, pause: () => calls.push('pause'), clear: () => calls.push('clear'), audio: { pause: () => calls.push('audio') } });
  win.dispatchEvent(new Event('pagehide')); assert.deepEqual(calls, ['pause', 'clear', 'audio']);
  dispose(); win.dispatchEvent(new Event('blur')); assert.equal(calls.length, 3);
});

test('navigation uses occurrence identity, keeps boundaries and does not mutate timeline', () => {
  const axis = [{id:'repeat',at:1},{id:'repeat',at:5},{id:'end',at:5}];
  assert.equal(adjacentEvent(axis,{index:1},1),axis[2]);
  assert.equal(adjacentEvent(axis,{at:1},1),axis[1]);
  assert.equal(adjacentEvent(axis,{index:0},-1),null);
  assert.equal(adjacentEvent(axis,{index:2},1),null);
  assert.equal(adjacentEvent(axis,{index:1},NaN),null);
  assert.equal(axis[0].at,1);
  let calls = 0; const done = new Set();
  onceAt(done,'tick',2,2,()=>{calls++;onceAt(done,'tick',2,2,()=>calls++);});
  onceAt(done,'tick',3,2,()=>calls++); assert.equal(calls,1);
  onceAt(new Set(),'tick',2-1e-9,2,()=>calls++,1e-8); assert.equal(calls,2);
});

test('practice orchestration preserves callback-owned retry policy and rejects blocked jumps', () => {
  const calls=[];let allowed=false,terminal=false;
  const controller=createPracticeController({clear:()=>calls.push('clear'),canJump:()=>allowed,jump:d=>calls.push(d),reset:v=>calls.push(['reset',v]),retry:()=>calls.push('retry'),terminal:()=>terminal});
  controller.jump(1);assert.deepEqual(calls,[]);
  allowed=true;controller.jump(-1);controller.retry();terminal=true;controller.retry();
  assert.deepEqual(calls,['clear',-1,'clear','retry','clear',['reset',undefined]]);
});

test('cancelled victory callbacks cannot open results in a replacement or reused game', () => {
  const animations=[],shown=[];let stops=0;
  const banner={hidden:true,animate(){const a={cancel(){}};animations.push(a);return a;}};
  const flow=createResultFlow({banner,image:{naturalWidth:0},fallback:{},reduced:()=>false,stop:()=>stops++,show:r=>shown.push(r)});
  const game={},won={terminal:true,won:true};flow.update(game,won);flow.update(game,won);
  assert.equal(stops,1);const stale=animations[0].onfinish;
  flow.reset();flow.update(game,won);stale();assert.equal(shown.length,0);
  animations[1].onfinish();assert.equal(shown.length,1);assert.equal(banner.hidden,true);
  flow.update(game,won);assert.equal(shown.length,1);
  flow.reset();flow.update({}, {terminal:true,won:false});assert.equal(shown.length,2);
});

test('victory falls back to result when browser animation API is unavailable', () => {
  let shown=0;const flow=createResultFlow({banner:{},stop(){},show(){shown++;},reduced:()=>true});
  flow.update({}, {terminal:true,won:true});assert.equal(shown,1);
});

test('presentation keeps encounter-specific victory and stable priority, bounds invalid health', () => {
  assert.equal(resultView({status:'complete'},{name:'示例甲',victory:'victory'}).won,false);
  assert.equal(resultView({status:'complete'},{name:'示例乙'}).won,true);
  assert.equal(healthPercent(5,0),0);assert.equal(healthPercent(Infinity,5),0);assert.equal(healthPercent(20,10),100);
  const notices=[{text:'first',priority:4},{text:'second',priority:4},{text:'urgent',priority:5}];
  assert.equal(selectNotice(notices).text,'urgent');assert.equal(selectNotice(notices.slice(0,2)).text,'first');assert.equal(selectNotice(notices,false),null);
});

test('semantic actions read fresh state and leave final validation to the engine', () => {
  let active=true,cooldown=3,calls=0;const rejected=[];
  const actions=createActions({enabled:()=>active,states:{special:()=>({enabled:cooldown===0,cooldown,reason:'冷却中'})},onRejected:state=>rejected.push(state.reason),handlers:{special:()=>{calls++;return false;}}});
  assert.equal(actions.dispatch('g'),false);assert.equal(calls,0);assert.deepEqual(rejected,['冷却中']);
  cooldown=0;assert.equal(actions.dispatch('special'),false);assert.equal(calls,1);
  active=false;assert.equal(actions.dispatch('g'),false);assert.equal(calls,1);
  assert.equal(actions.state('unknown').visible,false);
  assert.equal(actions.dispatch('constructor'),false);
  assert.equal(actions.state('toString').visible,false);
});

