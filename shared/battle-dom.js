import { formatTime, hintView, selectNotice } from './battle-presentation.js';

export function paintHint(elements, rows) {
  const model = hintView(rows);
  for (const key of ['skill', 'hint', 'countdown']) if (elements[key]) elements[key].textContent = model[key];
}
export function paintNotice(element, entries, visible = true) {
  const notice = selectNotice(entries, visible);
  element.hidden = !notice;
  element.textContent = notice?.text ?? '';
  element.dataset.kind = notice?.kind ?? '';
  element.dataset.priority = String(notice?.priority ?? 0);
}
export function fillChapters(select, timeline, value = (_, i) => i, label = e => `${formatTime(e.at)} · ${e.name}`) {
  // Keep caller-owned options such as "完整战斗"; only replace our own entries.
  select.querySelectorAll('[data-chapter]').forEach(option => option.remove());
  timeline.forEach((event, i) => {
    const option = select.ownerDocument.createElement('option');
    option.dataset.chapter = ''; option.value = value(event, i); option.textContent = label(event);
    select.append(option);
  });
}
export function downloadLog(text, filename) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  try {
    const link = document.createElement('a'); link.href = url; link.download = filename; link.click();
  } finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
}
export function bindBattleLog({ open, close, exportButton, dialog, content, text, pause, afterClose = () => {}, filename }) {
  open.onclick = () => { pause(); content.textContent = text(); if (!dialog.open) dialog.showModal(); };
  close.onclick = () => { dialog.close(); afterClose(); };
  exportButton.onclick = () => downloadLog(text(), filename);
  dialog.addEventListener('cancel', event => { event.preventDefault(); close.click(); });
}

// One owner per page. Reset invalidates animation callbacks even when the Game is reused.
export function createResultFlow({ banner, image, fallback, show, stop, reduced = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false, duration = 3000, scale = false }) {
  let owner = null, animation = null, generation = 0, handled = false;
  function reset() {
    generation++; if (animation) { animation.onfinish = null; animation.cancel(); }
    animation = null; owner = null; handled = false; banner.hidden = true;
  }
  return { reset, update(game, result) {
    if (!result.terminal) return;
    if (owner !== game) { reset(); owner = game; }
    if (handled) return;
    handled = true; stop();
    if (!result.won) { show(result); return; }
    const token = generation;
    banner.hidden = false;
    const ready = image?.naturalWidth > 0;
    if (image) image.hidden = !ready;
    if (fallback) fallback.hidden = ready;
    const finish = () => {
      if (token !== generation || owner !== game) return;
      banner.hidden = true; show(result);
    };
    const motion = reduced();
    try {
      animation = banner.animate([
        { opacity: 0, transform: scale && !motion ? 'scale(1.08)' : 'none' },
        { opacity: 1, transform: 'none', offset: .2 },
        { opacity: 1, transform: 'none', offset: .8 },
        { opacity: 0, transform: scale && !motion ? 'scale(.98)' : 'none' },
      ], { duration: motion ? 1600 : duration, easing: 'ease-in-out' });
      animation.onfinish = finish;
    } catch { finish(); }
  } };
}
