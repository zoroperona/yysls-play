import test from 'node:test';
import assert from 'node:assert/strict';
import { portraitArena } from '../shared/mobile-battle.js';
test('portrait composition shares screen geometry across different world units', () => {
  const input = { width:402, height:692, noticeTop:156 };
  const a = portraitArena({ ...input, diameterUnits:44 });
  const b = portraitArena({ ...input, diameterUnits:650 });
  assert.equal(a.x,b.x); assert.equal(a.y,b.y);
  assert.equal(a.scale*44,b.scale*650);
  assert.ok(a.y-a.scale*44/2 >= input.noticeTop+96);
  for (const diameterUnits of [0,NaN,Infinity,-1]) assert.throws(()=>portraitArena({...input,diameterUnits}),RangeError);
});
