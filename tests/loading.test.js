import test from "node:test";
import assert from "node:assert/strict";
import { assets } from "../shared/assets.js";
import { mountLoading } from "../shared/loading.js";

function fixture(t, { imageFails = false } = {}) {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  assets.tasks = [];
  assets.optionalAllowed = false;
  assets.pending = null;
  const message = {}, bar = {}, retry = {};
  const panel = { setAttribute() {}, querySelector: (q) => ({ p: message, progress: bar, button: retry })[q] };
  const document = { baseURI: "https://example.test/", body: { append() {}, classList: { toggle() {} } }, createElement: (tag) => tag === "section" ? panel : {} };
  const previousDocument = globalThis.document;
  globalThis.document = document;
  t.after(() => { if (previousDocument) globalThis.document = previousDocument; else delete globalThis.document; });
  const image = new EventTarget();
  image.naturalWidth = imageFails ? 0 : 10;
  image.decode = async () => {};
  let src = "https://example.test/victory.png";
  Object.defineProperty(image, "src", {
    get: () => src,
    set: (value) => { src = value; queueMicrotask(() => image.dispatchEvent(new Event(imageFails ? "error" : "load"))); },
  });
  let finish;
  const bgm = { registerAssets: (loader) => loader.add("第1段音乐", () => new Promise((resolve, reject) => { finish = { resolve, reject }; }), { optional: true }) };
  const button = { disabled: true, before() {} };
  mountLoading({ button, bgm, victoryImage: image });
  return { button, message, retry, finish: () => finish };
}

const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };

test("the original start button unlocks at 15 seconds while music is pending and stays unlocked after failure", async (t) => {
  const ui = fixture(t);
  await flush();
  t.mock.timers.tick(14999);
  assert.equal(ui.button.disabled, true);
  t.mock.timers.tick(1);
  assert.equal(ui.button.disabled, false);
  assert.match(ui.message.textContent, /后台加载/);
  ui.finish().reject(Object.assign(new Error("timeout"), { name: "TimeoutError" }));
  await flush();
  assert.equal(ui.button.disabled, false);
  assert.match(ui.message.textContent, /下载超时/);
  assert.match(ui.message.textContent, /手机流量/);
  assert.equal(ui.retry.hidden, false);
  const retry = ui.retry.onclick();
  assert.equal(ui.button.disabled, false);
  ui.finish().resolve();
  await retry;
  assert.equal(ui.message.textContent, "资源已就绪");
  assert.equal(ui.button.disabled, false);
});

test("15 seconds never bypasses a missing image", async (t) => {
  const ui = fixture(t, { imageFails: true });
  await flush();
  t.mock.timers.tick(15000);
  assert.equal(ui.button.disabled, true);
  ui.finish().resolve();
  await flush();
  assert.equal(ui.button.disabled, true);
  assert.equal(ui.retry.hidden, false);
});

test("fast resources allow immediate entry without waiting 15 seconds", async (t) => {
  const ui = fixture(t);
  ui.finish().resolve();
  await flush();
  assert.equal(ui.button.disabled, false);
  assert.equal(ui.message.textContent, "资源已就绪");
});
