import test from "node:test";
import assert from "node:assert/strict";
import { AssetLoader, fetchAudio } from "../shared/assets.js";

test("entry waits for every resource and retry retains successful downloads", async () => {
  const assets = new AssetLoader();
  let images = 0, downloads = 0, finish;
  assets.add("图片", async () => { images++; });
  assets.add("音乐", async () => {
    if (++downloads === 1) throw new Error("offline");
    await new Promise((resolve) => { finish = resolve; });
  });
  const progress = [];
  assert.deepEqual(await assets.load((p) => progress.push(p)), ["音乐"]);
  assert.equal(assets.ready, false);
  assert.deepEqual(progress.at(-1), { loaded: 1, total: 2 });
  const retry = assets.load();
  assert.equal(assets.ready, false);
  const duplicate = assets.load();
  finish();
  assert.deepEqual(await retry, []);
  assert.deepEqual(await duplicate, []);
  assert.equal(assets.ready, true);
  assert.equal(images, 1);
  assert.equal(downloads, 2);
});

test("audio loading rejects HTTP failures and aborts stalled responses", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response("missing", { status: 404 }));
  await assert.rejects(fetchAudio("https://example.test/music.wav"), /404/);
  globalThis.fetch = (_, { signal }) => new Promise((_, reject) => {
    signal.addEventListener("abort", () => reject(new Error("aborted")));
  });
  await assert.rejects(fetchAudio("https://example.test/music.wav", { timeout: 5 }), { name: "TimeoutError" });
});

test("releasing music wait still requires images and retry retains completed images", async () => {
  const assets = new AssetLoader();
  let imageFails = true, musicFails = true, images = 0;
  assets.add("图片", async () => { images++; if (imageFails) throw new Error("image failed"); });
  assets.add("音乐", async () => { if (musicFails) throw new Error("blocked"); }, { optional: true });
  await assets.load();
  assets.allowOptionalPending();
  assert.equal(assets.ready, false);
  imageFails = false;
  await assets.load();
  assert.equal(assets.requiredReady, true);
  assert.equal(assets.ready, true);
  musicFails = false;
  const retry = assets.load();
  assert.equal(assets.ready, true);
  assert.deepEqual(await retry, []);
  assert.equal(assets.tasks[1].error, null);
  assert.equal(images, 2);
});

test("audio timeout covers an incomplete HTTP 200 body and retry bypasses cache", async (t) => {
  let cacheMode;
  t.mock.method(globalThis, "fetch", async (_, { signal, cache }) => {
    cacheMode = cache;
    return {
      ok: true,
      blob: () => new Promise((_, reject) => {
        signal.addEventListener("abort", () => reject(new Error("body aborted")));
      }),
    };
  });
  await assert.rejects(fetchAudio("https://example.test/music.m4a", { timeout: 5, retry: true }), { name: "TimeoutError" });
  assert.equal(cacheMode, "reload");
});
