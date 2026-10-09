import test from 'node:test';
import assert from 'node:assert/strict';
import { HOME_TRACKS, HomeMusic } from '../shared/home-music.js';
import { createHomeAudio } from '../miniprogram/lib/home-music.js';

const flush = () => new Promise(resolve => setImmediate(resolve));
function setup() {
  const created = [];
  const music = new HomeMusic((track, changed) => {
    let resolve, reject;
    const player = { track, ready: new Promise((yes, no) => { resolve = yes; reject = no; }),
      play() { this.playing = true; changed('playing'); }, pause() { this.playing = false; }, destroy() { this.destroyed = true; this.playing = false; },
      loaded() { resolve(); }, fail() { reject(new Error('network')); changed('error'); }, changed,
    };
    created.push(player); return player;
  });
  return { music, created };
}
test('home playlist numbers each boss from 1 while retaining configured file paths', () => {
  assert.deepEqual(HOME_TRACKS.map(t => t.label), ['template1', 'template2']);
  assert.deepEqual(HOME_TRACKS.slice(-2).map(t => t.path), ['/assets/audio/template_P1.m4a', '/assets/audio/template_P2.m4a']);
});
test('home preloads first template only, waits for readiness, and yields a frame before the next load', async () => {
  const { music, created } = setup(); assert.equal(created.length, 0);
  music.step(); assert.equal(created[0].track.label, 'template1');
  for (let i = 0; i < 20; i++) music.step(); assert.equal(created.length, 1);
  created[0].loaded(); await flush(); assert.equal(created.length, 1);
  music.step(); assert.equal(created.length, 2); assert.equal(created[1].track.label, 'template2');
  assert.ok(created.every(t => !t.playing)); music.destroy();
});
test('selection bypasses a slow preload; late events cannot replace the selected song or restart paused playback', async () => {
  const { music, created } = setup(); music.step(); music.select(1);
  assert.equal(music.index, 1); assert.equal(created[1].playing, true);
  created[0].loaded(); created[0].changed('error'); await flush();
  assert.equal(music.status, 'playing'); assert.equal(music.index, 1);
  music.select(0); assert.equal(created[1].playing, false); assert.equal(created[0].playing, true);
  music.pause(); created[0].changed('playing'); assert.equal(created[0].playing, false); assert.equal(music.status, 'paused');
  music.destroy(); assert.ok(created.every(t => t.destroyed));
});
test('failed preload does not block later tracks; selected failures can be retried and hide suspends loading', async () => {
  const { music, created } = setup(); music.step(); created[0].fail(); await flush();
  music.suspended = true; music.step(); assert.equal(created.length, 1);
  music.suspended = false; music.step(); assert.equal(created.length, 2);
  music.play(); assert.equal(created[0].destroyed, true); assert.equal(created[2].playing, true);
  music.destroy(); created[1].loaded(); await flush(); assert.equal(music.entries.size, 0);
});
test('native home audio never starts after being paused or destroyed while its package is pending', async () => {
  let finish, plays = 0, src;
  const handlers = {};
  const native = { onCanplay(fn) { handlers.canplay = fn; }, onPlay(fn) { handlers.play = fn; }, onError(fn) { handlers.error = fn; },
    set src(value) { src = value; queueMicrotask(() => handlers.canplay()); }, play() { plays++; handlers.play(); }, pause() {}, destroy() {}, };
  const player = createHomeAudio({ createInnerAudioContext: () => native }, HOME_TRACKS[1], () => {}, () => new Promise(resolve => { finish = resolve; }));
  player.ready.catch(() => {}); player.play(); await flush(); player.pause();
  finish('music/template/p2.m4a'); await player.ready; assert.equal(plays, 0); assert.equal(src, 'music/template/p2.m4a');
  player.play(); assert.equal(plays, 1); player.destroy();
  src = undefined;
  const abandoned = createHomeAudio({ createInnerAudioContext: () => native }, HOME_TRACKS[0], () => {}, () => new Promise(resolve => { finish = resolve; }));
  abandoned.ready.catch(() => {}); abandoned.play(); await flush(); abandoned.destroy(); finish('music/template/p1.m4a'); await flush();
  assert.equal(src, undefined); assert.equal(plays, 1);
});
