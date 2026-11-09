import test from 'node:test';
import assert from 'node:assert/strict';
import { heal, updateRescue } from '../shared/life.js';
import { applyHealthNode } from '../shared/health-node.js';
import { distance, segmentDistance, pickTarget } from '../shared/geometry.js';
import { drawPartyPortrait, drawActorHealth } from '../shared/actor-render.js';

test('ordinary healing is bounded and cannot resurrect or repair invalid rates', () => {
  const actor = { hp: 95 }; heal(actor, 20); assert.equal(actor.hp, 100);
  actor.hp = 0; heal(actor, 20); assert.equal(actor.hp, 0);
  assert.throws(() => heal(actor, -1), RangeError);
  assert.throws(() => heal(actor, Infinity), RangeError);
  actor.hp = 110; heal(actor, 20, 120); assert.equal(actor.hp, 120);
});

for (const order of ['exclusive', 'start-complete', 'complete-start']) {
  test(`rescue scheduling preserves ${order} handoff and spends each charge only once`, () => {
    const state = { rescue: { id: 7, at: 1 }, rescues: 2 }, party = [{id:7,hp:0},{id:9,hp:0}];
    let completions=0;
    const options={now:6,delay:5,order,eligible:()=>state.rescues>0,
      onStart:()=>state.rescues--,onComplete:p=>{p.hp=30;completions++;}};
    updateRescue(state,party,options);
    assert.equal(party[0].hp,30);assert.equal(completions,1);
    assert.equal(state.rescue?.id,order==='complete-start'?9:undefined);
    updateRescue(state,party,options);assert.equal(completions,1);
    assert.equal(state.rescue.id,9);assert.equal(state.rescues,1);
    updateRescue(state,party,{...options,now:11});assert.equal(completions,2);assert.equal(state.rescue,null);
  });
}

test('rescue rejects stale IDs, already alive or ineligible targets without completion', () => {
  let completed=0;
  const options={now:20,delay:5,order:'exclusive',eligible:()=>true,onComplete:()=>completed++};
  for (const [pending,party,valid] of [
    [{id:4,at:1},[{id:2,hp:0}],()=>true],
    [{id:4,at:1},[{id:4,hp:50}],()=>true],
    [{id:4,at:1},[{id:4,hp:0}],()=>false],
    [{id:4,at:NaN},[{id:4,hp:0}],()=>true],
  ]) {
    const state={rescue:pending};updateRescue(state,party,{...options,valid});assert.equal(state.rescue,null);
  }
  assert.equal(completed,0);
  assert.throws(()=>updateRescue({},[],{...options,delay:-1}),RangeError);
});

test('multi-bar nodes validate atomically and never change shields or party resources', () => {
  const boss={max:1000,outer:200,inner:300,shield:40};
  assert.throws(()=>applyHealthNode(boss,{outer:.5,inner:NaN}),RangeError);
  assert.deepEqual(boss,{max:1000,outer:200,inner:300,shield:40});
  applyHealthNode(boss,{outer:.251,inner:0});assert.equal(boss.outer,251);assert.equal(boss.inner,1);assert.equal(boss.shield,40);
  assert.throws(()=>applyHealthNode(boss,{max:.5}),RangeError);
  assert.throws(()=>applyHealthNode(boss,{outer:0},{allowZero:false}),RangeError);
  assert.throws(()=>applyHealthNode(boss,{outer:Infinity}),RangeError);
});

test('health nodes explicitly preserve continuous progress, percentage arithmetic and fractional HP', () => {
  const boss={max:1234,hp:55.5};
  applyHealthNode(boss,{hp:20},{mode:'preserve',scale:100,round:false,minimum:0});assert.equal(boss.hp,55.5);
  applyHealthNode(boss,{hp:20},{scale:100,round:false,minimum:0});assert.equal(boss.hp,246.8);
  applyHealthNode(boss,{hp:0});assert.equal(boss.hp,1);
});

test('geometry is unit-independent and handles endpoints and degenerate segments', () => {
  const a={x:0,y:0},b={x:4,y:0};
  assert.equal(segmentDistance({x:2,y:3},a,b),3);
  assert.equal(segmentDistance({x:6,y:0},a,b),2);
  assert.equal(segmentDistance({x:3,y:4},a,a),5);
  assert.equal(distance(a,b),4);
  assert.equal(segmentDistance({x:30,y:45},{x:0,y:0},{x:60,y:0}),45);
});

test('target selection preserves strict range, filters, stable ties and explicit first-match policy', () => {
  const p={x:0,y:0},a={x:3,y:0,hp:1},b={x:1,y:0,hp:0},c={x:2,y:0,hp:1},d={x:-2,y:0,hp:1};
  const targets=[a,b,c,d];
  assert.equal(pickTarget(p,targets,{radius:3,eligible:t=>t.hp>0}),c);
  assert.equal(pickTarget(p,targets,{radius:2,eligible:t=>t.hp>0}),null);
  assert.equal(pickTarget(p,targets,{radius:4,nearest:false}),a);
  assert.deepEqual(targets,[a,b,c,d]);
});

test('party sprite crop works with native images, caller sizes/lift and failed image fallback', () => {
  const calls=[],ctx={drawImage:(...args)=>calls.push(args)},actor={id:4,x:10,y:20};
  const image={width:384,height:192};
  assert.equal(drawPartyPortrait(ctx,image,actor,{y:17,width:1.5}),true);
  assert.deepEqual(calls[0],[image,119,8,110,112,9.25,16.25,1.5,1.5]);
  assert.equal(drawPartyPortrait(ctx,{naturalWidth:0,naturalHeight:0,width:384,height:192},actor,{width:2}),false);
  assert.equal(drawPartyPortrait(ctx,image,actor,{width:0}),false);assert.equal(calls.length,1);
  assert.equal(drawPartyPortrait(ctx,image,actor,{x:NaN,width:2}),false);assert.equal(calls.length,1);
});

test('actor bars clamp visual health without mutating actor data', () => {
  const rects=[],ctx={save(){},restore(){},fillRect:(...args)=>rects.push(args)};
  drawActorHealth(ctx,{x:0,y:1,width:20,height:2,hp:200,max:100,background:'black',fill:'green'});
  assert.deepEqual(rects,[[0,1,20,2],[0,1,20,2]]);
});
