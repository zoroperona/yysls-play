// Native adapter: Mini Game loads one local music subpackage at a time;
// the retained Mini Program uses its configured HTTPS audio origin.
export function createHomeAudio(api, track, changed, resolveSource) {
  const audio = api.createInnerAudioContext();
  audio.autoplay = false; audio.obeyMuteSwitch = true; audio.loop = false; audio.volume = .5;
  let destroyed = false, wanted = false, hasSource = false, hasStarted = false, resolveReady, rejectReady;
  const ready = new Promise((resolve, reject) => { resolveReady = resolve; rejectReady = reject; });
  const timer = setTimeout(() => { if (!destroyed) rejectReady(new Error('audio load timed out')); }, 20000);
  audio.onCanplay(() => { clearTimeout(timer); resolveReady(); });
  audio.onPlay(() => { if (destroyed || !wanted) audio.pause(); else { hasStarted = true; changed('playing'); } });
  audio.onEnded?.(() => { if (!destroyed) changed('ended'); });
  audio.onTimeUpdate?.(() => { if (!destroyed && wanted && Number(audio.currentTime) > 0 && !hasStarted) { hasStarted = true; changed('playing'); } });
  audio.onWaiting?.(() => { if (wanted && !hasStarted) changed('loading'); });
  audio.onError(() => { clearTimeout(timer); rejectReady(new Error('audio load failed')); changed('error'); });
  Promise.resolve().then(() => { if (destroyed) throw new Error('disposed'); return resolveSource(track); }).then(source => {
    if (destroyed) return;
    audio.src = source; hasSource = true;
    if (wanted) audio.play();
  }, () => {
    clearTimeout(timer); rejectReady(new Error('music package load failed'));
    if (!destroyed) changed('error');
  });
  return {
    ready,
    get currentTime() { return Number(audio.currentTime) || 0; },
    get duration() { return Number.isFinite(Number(audio.duration)) ? Number(audio.duration) : 0; },
    seek(time) { if (Number.isFinite(Number(audio.duration))) audio.seek(Math.max(0, Math.min(Number(audio.duration), time))); },
    play() { wanted = true; hasStarted = false; if (hasSource) audio.play(); },
    pause() { wanted = false; hasStarted = false; audio.pause(); },
    destroy() { if (destroyed) return; destroyed = true; wanted = false; clearTimeout(timer); audio.destroy(); rejectReady(new Error('disposed')); },
  };
}
