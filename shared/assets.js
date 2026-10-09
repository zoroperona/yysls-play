// One registry per page. Successful resources survive retries and new games.
export class AssetLoader {
  constructor() { this.tasks = []; this.optionalAllowed = false; }

  add(label, load, { optional = false } = {}) {
    this.tasks.push({ label, load, optional, done: false, error: null });
  }

  get requiredReady() {
    return this.tasks.every((task) => task.optional || task.done);
  }

  get ready() {
    return this.requiredReady && (this.optionalAllowed || this.tasks.every((task) => task.done));
  }

  allowOptionalPending() {
    this.optionalAllowed = true;
  }

  async load(report = () => {}) {
    if (this.pending) return this.pending;
    this.pending = this.run(report).finally(() => { this.pending = null; });
    return this.pending;
  }

  async run(report) {
    const progress = () => report({
      loaded: this.tasks.filter((task) => task.done).length,
      total: this.tasks.length,
    });
    progress();
    const results = await Promise.allSettled(this.tasks.map(async (task) => {
      if (task.done) return;
      task.error = null;
      try {
        await task.load();
        task.done = true;
        progress();
      } catch (error) {
        task.error = error;
        throw error;
      }
    }));
    const failed = results.flatMap((result, i) =>
      result.status === "rejected" ? [this.tasks[i].label] : []);
    return failed;
  }
}

export const assets = new AssetLoader();

export function registerImage(image, url, label) {
  let attempts = 0;
  assets.add(label, () => new Promise((resolve, reject) => {
    const source = new URL(url, document.baseURI);
    const version = new URL(import.meta.url).searchParams.get("v");
    if (version) source.searchParams.set("v", version);
    if (attempts++) source.searchParams.set("retry", String(attempts));
    let settled = false;
    const finish = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      image.removeEventListener("load", loaded);
      image.removeEventListener("error", failed);
      error ? reject(error) : resolve();
    };
    const loaded = () => {
      if (!image.naturalWidth) return failed();
      Promise.resolve(image.decode?.()).then(() => finish(), finish);
    };
    const failed = () => finish(new Error(label));
    const timer = setTimeout(failed, 30000);
    image.addEventListener("load", loaded);
    image.addEventListener("error", failed);
    image.src = source.href;
    if (image.complete && image.naturalWidth) loaded();
  }));
  return image;
}

export function loadImage(path, base, label) {
  const url = new URL(path, base);
  const version = new URL(base).searchParams.get("v");
  if (version) url.searchParams.set("v", version);
  return registerImage(new Image(), url, label);
}

export async function fetchAudio(url, { timeout = 90000, retry = false } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: retry ? "reload" : "default",
    });
    if (!response.ok) throw new Error(`Audio HTTP ${response.status}`);
    const blob = await response.blob();
    if (!blob.size || blob.type.includes("text/html")) throw new Error("Invalid audio");
    return blob;
  } catch (error) {
    if (controller.signal.aborted) {
      const timeoutError = new Error("音乐下载超时");
      timeoutError.name = "TimeoutError";
      throw timeoutError;
    }
    throw error;
  } finally { clearTimeout(timer); }
}
