import { fetchAudio } from "./assets.js";

const VOLUME_KEY = "boss-bgm-volume";
const FADE_SECONDS = 5;

// Playback follows the media clock, independently of combat phases and speed.
export class BossBgm {
  constructor(boss, { singleTrack = false, format = "m4a", phases = null } = {}) {
    const sequence = phases ?? (singleTrack ? [1] : [1, 2]);
    if (!Array.isArray(sequence) || sequence.length < 1 || sequence.length > 2 || sequence.some(n => !Number.isInteger(n) || n < 1))
      throw new RangeError("BGM requires one or two positive track numbers");
    singleTrack = sequence.length === 1;
    this.tracks = sequence.map((phase, index) => {
      const audio = new Audio(new URL(`../assets/audio/${boss}_P${phase}.${format}`, import.meta.url).href);
      audio.preload = "none";
      audio.loop = singleTrack || index === 1;
      return audio;
    });
    this.index = 0;
    this.running = false;
    this.loaded = this.tracks.map(() => true);
    this.playRequest = 0;
    this.volume = 0.5;
    try {
      const saved = localStorage.getItem(VOLUME_KEY);
      if (saved !== null && Number.isFinite(Number(saved)))
        this.volume = Math.max(0, Math.min(1, Number(saved)));
    } catch {}
    this.tracks[0].addEventListener("ended", () => {
      this.index = singleTrack ? 0 : 1;
      if (singleTrack) this.tracks[0].currentTime = 0;
      this.update();
      if (this.running) this.play();
    });
    for (const track of this.tracks)
      for (const event of ["timeupdate", "loadedmetadata", "seeking"])
        track.addEventListener(event, () => this.update());
    for (const track of this.tracks)
      track.addEventListener("error", () => {
        if (this.running && track === this.tracks[this.index]) this.onPlaybackError?.();
      });
    this.update();
  }

  registerAssets(loader) {
    this.tracks.forEach((track, i) => {
      this.loaded[i] = false;
      const url = new URL(track.src);
      const version = new URL(import.meta.url).searchParams.get("v");
      if (version) url.searchParams.set("v", version);
      let attempts = 0;
      loader.add(`第${i + 1}段音乐`, async () => {
        const source = new URL(url);
        const retry = attempts++ > 0;
        if (retry) source.searchParams.set("retry", String(attempts));
        const blob = await fetchAudio(source, { retry });
        // Fully downloaded blobs avoid mobile browsers ignoring media preload.
        track.src = URL.createObjectURL(blob);
        track.preload = "auto";
        track.load();
        this.loaded[i] = true;
        if (this.running && this.index === i) this.play();
      }, { optional: true });
    });
  }

  prepareOutput() {
    // GainNode also supports volume/fades on iOS, where media.volume is ignored.
    const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!this.context && Context) {
      this.context = new Context();
      this.gain = this.context.createGain();
      this.gain.connect(this.context.destination);
      this.sources = this.tracks.map((track) => {
        const source = this.context.createMediaElementSource(track);
        source.connect(this.gain);
        track.volume = 1;
        return source;
      });
    }
    const resumed = this.context && this.context.state !== "running"
      ? this.context.resume() : Promise.resolve();
    this.update();
    return resumed;
  }

  play(output = Promise.resolve()) {
    const request = ++this.playRequest;
    if (!this.loaded[this.index]) {
      // Unlock output on the start click, but never start a second network download.
      output.catch(() => {
        if (this.running && request === this.playRequest) this.onPlaybackError?.();
      });
      return;
    }
    Promise.all([output, this.tracks[this.index].play()]).then(() => {
      if (this.running && request === this.playRequest) this.onPlaybackSuccess?.();
    }).catch(() => {
      if (this.running && request === this.playRequest) this.onPlaybackError?.();
    });
  }

  resume() {
    this.running = true;
    // Keep both calls synchronous in the click handler to preserve user activation.
    try { this.play(this.prepareOutput()); }
    catch { this.onPlaybackError?.(); }
  }

  pause() {
    this.running = false;
    this.playRequest++;
    this.tracks.forEach((track) => track.pause());
    this.onPause?.();
  }

  reset() {
    this.pause();
    this.index = 0;
    this.tracks.forEach((track) => { track.currentTime = 0; });
    this.update();
  }

  setVolume(value) {
    if (!Number.isFinite(value)) return;
    this.volume = Math.max(0, Math.min(1, value));
    try { localStorage.setItem(VOLUME_KEY, String(this.volume)); } catch {}
    this.update();
  }

  update() {
    const track = this.tracks[this.index];
    // Native P2 looping resets currentTime, so every loop gets a fresh fade-in.
    const remaining = Number.isFinite(track.duration)
      ? track.duration - track.currentTime : Infinity;
    const fade = Math.max(0, Math.min(
      1, track.currentTime / FADE_SECONDS, remaining / FADE_SECONDS,
    ));
    const volume = this.volume * fade;
    if (this.gain) this.gain.gain.value = volume;
    else this.tracks.forEach((audio) => { audio.volume = volume; });
  }
}
