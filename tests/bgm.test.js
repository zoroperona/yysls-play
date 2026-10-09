import test from "node:test";
import assert from "node:assert/strict";
import { BossBgm } from "../shared/bgm.js";
import { AssetLoader } from "../shared/assets.js";

class AudioStub extends EventTarget {
  constructor(src) {
    super();
    this.src = src;
    this.currentTime = 0;
    this.duration = 100;
    this.paused = true;
  }
  play() { this.paused = false; return Promise.resolve(); }
  pause() { this.paused = true; }
  load() {}
}

test("template plays P2 then loops P3 and reset returns to P2", () => {
  globalThis.Audio = AudioStub;
  const bgm = new BossBgm("template", { phases: [2, 3] });
  assert.match(decodeURI(bgm.tracks[0].src), /template_P2.m4a$/);
  assert.match(decodeURI(bgm.tracks[1].src), /template_P3.m4a$/);
  assert.equal(bgm.tracks[0].loop, false);assert.equal(bgm.tracks[1].loop, true);
  bgm.resume();bgm.tracks[0].dispatchEvent(new Event("ended"));
  assert.equal(bgm.index,1);assert.equal(bgm.tracks[1].paused,false);
  bgm.reset();assert.equal(bgm.index,0);assert.ok(bgm.tracks.every(t=>t.paused && t.currentTime===0));
});

test("single-track boss loops its own music and registers no P2 asset", () => {
  globalThis.Audio = AudioStub;
  const bgm = new BossBgm("template", { singleTrack: true, format: "wav" });
  assert.equal(bgm.tracks.length,1);assert.deepEqual(bgm.loaded,[true]);
  const track=bgm.tracks[0];assert.match(decodeURI(track.src),/template_P1.wav$/);
  assert.equal(track.loop,true);bgm.resume();assert.equal(track.paused,false);
  track.currentTime=100;track.dispatchEvent(new Event("ended"));
  assert.equal(bgm.index,0);assert.equal(track.currentTime,0);
  bgm.pause();assert.equal(track.paused,true);bgm.reset();assert.equal(bgm.index,0);
  const tasks=[];bgm.registerAssets({add:(...args)=>tasks.push(args)});
  assert.equal(tasks.length,1);assert.deepEqual(bgm.loaded,[false]);
});

test("both tracks fade in and out over five media seconds, including every P2 loop", () => {
  globalThis.Audio = AudioStub;
  const bgm = new BossBgm("template");
  bgm.setVolume(0.8);
  bgm.resume();
  const [p1, p2] = bgm.tracks;
  assert.match(decodeURI(p1.src), /template_P1.m4a$/);
  assert.equal(p1.volume, 0);
  p1.currentTime = 2.5;
  p1.dispatchEvent(new Event("timeupdate"));
  assert.equal(p1.volume, 0.4);
  p1.currentTime = 5;
  bgm.update();
  assert.equal(p1.volume, 0.8);
  p1.currentTime = 95;
  bgm.update();
  assert.equal(p1.volume, 0.8);
  p1.currentTime = 97.5;
  bgm.update();
  assert.equal(p1.volume, 0.4);
  bgm.pause();
  assert.equal(p1.paused, true);
  bgm.resume();
  assert.equal(p1.currentTime, 97.5);
  assert.equal(p1.volume, 0.4);
  p1.currentTime = 100;
  bgm.update();
  assert.equal(p1.volume, 0);
  p1.dispatchEvent(new Event("ended"));
  assert.equal(p2.paused, false);
  assert.equal(p2.loop, true);
  assert.equal(p2.volume, 0);
  for (let loop = 0; loop < 2; loop++) {
    for (const [time, volume] of [[2.5, 0.4], [5, 0.8], [95, 0.8], [97.5, 0.4], [100, 0]]) {
      p2.currentTime = time;
      p2.dispatchEvent(new Event("timeupdate"));
      assert.equal(p2.volume, volume);
    }
    // Model the native loop wrapping back to the beginning of P2.
    p2.currentTime = 0;
    p2.dispatchEvent(new Event("seeking"));
    assert.equal(p2.volume, 0);
    assert.equal(bgm.index, 1);
  }
  bgm.reset();
  assert.equal(bgm.index, 0);
  assert.ok(bgm.tracks.every((track) => track.paused && track.currentTime === 0));
});

test("muting survives the track transition; saved volume is shared between bosses", () => {
  globalThis.Audio = AudioStub;
  const saved = new Map();
  globalThis.localStorage = {
    getItem: (key) => saved.get(key) ?? null,
    setItem: (key, value) => saved.set(key, value),
  };
  const first = new BossBgm("template");
  first.setVolume(0);
  first.resume();
  first.tracks[0].dispatchEvent(new Event("ended"));
  assert.equal(first.tracks[1].volume, 0);
  const second = new BossBgm("template");
  assert.equal(second.volume, 0);
  second.pause();
  second.tracks[0].dispatchEvent(new Event("ended"));
  assert.equal(second.tracks[1].paused, true);
  delete globalThis.localStorage;
});

test("playback rejection is recoverable and a late rejection after pause stays hidden", async () => {
  globalThis.Audio = AudioStub;
  const bgm = new BossBgm("template");
  let failures = 0, recoveries = 0, rejectPlay;
  bgm.onPlaybackError = () => failures++;
  bgm.onPlaybackSuccess = () => recoveries++;
  bgm.tracks[0].play = () => Promise.reject(new Error("NotAllowedError"));
  bgm.resume();
  await new Promise(setImmediate);
  assert.equal(failures, 1);
  bgm.tracks[0].play = () => Promise.resolve();
  bgm.resume();
  await new Promise(setImmediate);
  assert.equal(recoveries, 1);
  bgm.tracks[0].play = () => new Promise((_, reject) => { rejectPlay = reject; });
  bgm.resume();
  bgm.pause();
  rejectPlay(new Error("AbortError"));
  await new Promise(setImmediate);
  assert.equal(failures, 1);
});

test("media play success must not hide an audio output unlock failure", async () => {
  globalThis.Audio = AudioStub;
  const bgm = new BossBgm("template");
  bgm.context = {
    state: "suspended",
    resume: () => Promise.reject(new Error("output blocked")),
  };
  let failed = 0, succeeded = 0;
  bgm.onPlaybackError = () => failed++;
  bgm.onPlaybackSuccess = () => succeeded++;
  bgm.resume();
  await new Promise(setImmediate);
  assert.equal(failed, 1);
  assert.equal(succeeded, 0);
});

test("pending music never starts a second download on start, pause or reset", () => {
  globalThis.Audio = AudioStub;
  const bgm = new BossBgm("template");
  bgm.loaded = [false, false];
  bgm.resume();
  assert.ok(bgm.tracks.every((track) => track.paused));
  bgm.pause();
  bgm.reset();
  bgm.resume();
  assert.ok(bgm.tracks.every((track) => track.paused));
  bgm.loaded[0] = true;
  bgm.play();
  assert.equal(bgm.tracks[0].paused, false);
  bgm.tracks[0].dispatchEvent(new Event("ended"));
  assert.equal(bgm.tracks[1].paused, true);
});

test("background music joins a running game, but a paused game stays silent", async (t) => {
  globalThis.Audio = AudioStub;
  const downloads = [];
  t.mock.method(globalThis, "fetch", () => new Promise((resolve) => downloads.push(resolve)));
  for (const pause of [false, true]) {
    const loader = new AssetLoader();
    const bgm = new BossBgm("template");
    bgm.registerAssets(loader);
    const loading = loader.load();
    bgm.resume();
    assert.ok(bgm.tracks.every((track) => track.paused));
    if (pause) bgm.pause();
    downloads.splice(0).forEach((resolve) => resolve(new Response(new Blob(["audio"], { type: "audio/mp4" }))));
    await loading;
    assert.equal(bgm.tracks[0].paused, pause);
    assert.equal(bgm.tracks[1].paused, true);
    if (pause) {
      bgm.resume();
      assert.equal(bgm.tracks[0].paused, false);
    }
    bgm.tracks.forEach((track) => URL.revokeObjectURL(track.src));
  }
});
