import test from 'node:test';
import assert from 'node:assert/strict';
import { validateTimeline } from '../templates/boss/timeline.js';
import { createRoster } from '../shared/roster.js';
const event = {id:'sample-01',mechanicType:'sample',phase:'P1',at:10,resolveAt:12,endAt:14,bossHpRatio:.8,evidenceId:'synthetic',practiceSetup:{},cleanup:[]};
test('timeline rejects unresolved, duplicate, reversed and unknown HP input', () => {
  assert.throws(() => validateTimeline([]));
  assert.throws(() => validateTimeline([event,event]));
  assert.throws(() => validateTimeline([{...event,resolveAt:9}]));
  assert.throws(() => validateTimeline([{...event,bossHpRatio:null}]));
  assert.equal(validateTimeline([event])[0].id,'sample-01');
});
test('roster keeps one player, unique IDs and fifth-slot healers for both teams', () => {
  for (const size of [5,10]) for (const team of [1,2]) {
    const party=createRoster(team,Infinity,{size});
    assert.equal(party.length,size);assert.equal(new Set(party.map(p=>p.id)).size,size);
    assert.equal(party.filter(p=>p.id===0).length,1);
    assert.equal(party.filter(p=>p.healer).length,size/5);
    assert.ok(party.filter(p=>p.healer).every(p=>p.slot===4));
    assert.equal(party.find(p=>p.id===0).team,size===5?1:team);
  }
});
