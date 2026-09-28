const VOLUME_KEY = "boss-bgm-volume";
const FADE_SECONDS = 5;

// Playback follows the media clock, independently of combat phases and speed.
export class BossBgm {
  constructor(boss) {
    this.tracks = [1, 2].map((phase) => {
      const audio = new Audio(new URL(`../assets/audio/${boss}_P${phase}.wav`, import.meta.url).href);
      audio.preload = "metadata";
      audio.loop = phase === 2;
      return audio;
    });
    this.index = 0;
    this.running = false;
    this.volume = 0.5;
    try {
      const saved = localStorage.getItem(VOLUME_KEY);
      if (saved !== null && Number.isFinite(Number(saved)))
        this.volume = Math.max(0, Math.min(1, Number(saved)));
    } catch {}
    this.tracks[0].addEventListener("ended", () => {
      this.index = 1;
      this.update();
      if (this.running) this.play();
    });
    for (const track of this.tracks)
      for (const event of ["timeupdate", "loadedmetadata", "seeking"])
        track.addEventListener(event, () => this.update());
    this.update();
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
    if (this.context?.state === "suspended") this.context.resume().catch(() => {});
    this.update();
  }

  play() {
    this.tracks[this.index].play().catch(() => {
      // A rejected autoplay request must not interrupt the game; resume retries it.
    });
  }

  resume() {
    this.prepareOutput();
    this.running = true;
    this.play();
  }

  pause() {
    this.running = false;
    this.tracks.forEach((track) => track.pause());
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
