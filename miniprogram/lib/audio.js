import { AUDIO_ORIGIN } from './catalog.js';
const KEY = 'boss-bgm-volume';
export class Music {
  constructor(api, info, onError = () => {}, source = phase => `${AUDIO_ORIGIN}/assets/audio/${encodeURIComponent(info.name + '_P' + phase + '.m4a')}`) {
    this.api = api; this.info = info; this.onError = onError;
    this.volume = .5; this.running = false; this.index = 0; this.destroyed = false;
    try { const saved = api.getStorageSync(KEY); if (saved !== '' && Number.isFinite(Number(saved))) this.volume = Math.max(0, Math.min(1, Number(saved))); } catch {}
    this.tracks = info.phases.map((phase, index) => {
      const audio = api.createInnerAudioContext();
      audio.autoplay = false; audio.obeyMuteSwitch = true;
      audio.loop = info.phases.length === 1 || index === 1;
      audio.src = source(phase);
      audio.onTimeUpdate(() => this.update());
      audio.onError(() => { if (!this.destroyed && this.running) onError('音乐暂不可用，可继续演练或在菜单重试'); });
      audio.onEnded(() => {
        if (this.destroyed || index !== this.index) return;
        this.index = info.phases.length === 1 ? 0 : 1;
        this.update(); if (this.running) this.tracks[this.index].play();
      });
      return audio;
    });
    this.update();
  }
  update() {
    this.tracks.forEach((audio, index) => {
      const time = audio.currentTime || 0;
      const remaining = audio.duration > 0 ? audio.duration - time : Infinity;
      audio.volume = index === this.index ? this.volume * Math.max(0, Math.min(1, time / 5, remaining / 5)) : 0;
    });
  }
  resume() { if (this.destroyed) return; this.running = true; this.tracks[this.index].play(); }
  pause() { this.running = false; this.tracks.forEach(t => t.pause()); }
  reset() { this.pause(); this.index = 0; this.tracks.forEach(t => t.stop()); this.update(); }
  setVolume(value) {
    if (!Number.isFinite(value)) return;
    this.volume = Math.max(0, Math.min(1, value));
    try { this.api.setStorageSync(KEY, this.volume); } catch {}
    this.update();
  }
  destroy() { this.destroyed = true; this.running = false; this.tracks.forEach(t => t.destroy()); }
}
