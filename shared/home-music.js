import { BOSSES } from '../miniprogram/lib/catalog.js';

// Display numbering is independent of encounter phases.
export const HOME_TRACKS = BOSSES.flatMap(boss => boss.phases.map((phase, index) => ({
  id: `${boss.id}-${index + 1}`, boss: boss.id, bossName: boss.name, image: boss.image, phase, label: `${boss.name}${index + 1}`,
  path: `/assets/audio/${boss.name}_P${phase}.m4a`,
})));

// Hosts call step once per rendered frame. Only one background load is in flight;
// explicit selections can take priority without waiting for a slow preload.
export class HomeMusic {
  constructor(create, changed = () => {}) {
    this.create = create; this.changed = changed; this.entries = new Map();
    this.index = 0; this.status = 'paused'; this.wanted = false; this.suspended = false; this.destroyed = false;
    this.observedIndex = -1; this.observedTime = 0;
  }
  ensure(index) {
    let entry = this.entries.get(index);
    if (entry) return entry;
    entry = { state: 'loading' }; this.entries.set(index, entry);
    entry.player = this.create(HOME_TRACKS[index], status => {
      if (this.destroyed || this.entries.get(index) !== entry) return;
      if (status === 'ended') {
        if (index === this.index && this.wanted && !this.suspended) this.select((index + 1) % HOME_TRACKS.length);
        return;
      }
      if (status === 'error') entry.state = 'error';
      if (index !== this.index || (status === 'loading' && !this.wanted)) return;
      if (status === 'playing' && (!this.wanted || this.suspended)) { entry.player.pause(); return; }
      if (status === 'error' || status === 'blocked') this.wanted = false;
      this.status = status; this.changed();
    });
    entry.player.ready.then(() => {
      if (this.destroyed || this.entries.get(index) !== entry) return;
      entry.state = 'ready'; this.changed();
    }, () => {
      if (this.destroyed || this.entries.get(index) !== entry) return;
      entry.state = 'error';
      entry.player.destroy();
      if (index === this.index && this.wanted) { this.wanted = false; this.status = 'error'; }
      this.changed();
    });
    return entry;
  }
  step() {
    if (this.destroyed) return;
    const currentTime = Number(this.entries.get(this.index)?.player.currentTime);
    if (this.index === this.observedIndex && this.wanted && !this.suspended && Number.isFinite(currentTime) && currentTime > this.observedTime + .001 && this.status !== 'playing') {
      this.status = 'playing'; this.changed();
    }
    this.observedIndex = this.index;
    this.observedTime = Number.isFinite(currentTime) ? currentTime : 0;
    if (this.suspended || [...this.entries.values()].some(entry => entry.state === 'loading')) return;
    const index = HOME_TRACKS.findIndex((_, i) => !this.entries.has(i));
    if (index !== -1) this.ensure(index);
  }
  select(index) {
    if (this.destroyed || !HOME_TRACKS[index]) return;
    this.pause(); this.index = index; this.play();
  }
  play() {
    if (this.destroyed || this.suspended) return;
    const old = this.entries.get(this.index);
    if (old?.state === 'error') { old.player.destroy(); this.entries.delete(this.index); }
    this.wanted = true; this.status = 'loading'; this.changed();
    // Call directly during the user gesture so browsers can unlock audio.
    this.ensure(this.index).player.play();
  }
  pause() {
    this.wanted = false; this.entries.get(this.index)?.player.pause();
    this.status = 'paused'; this.changed();
  }
  toggle() { if (this.wanted) this.pause(); else this.play(); }
  destroy() {
    this.destroyed = true; this.wanted = false;
    for (const entry of this.entries.values()) entry.player.destroy();
    this.entries.clear();
  }
}
