// Browser fullscreen and home-screen standalone mode are separate capabilities.
export function bindFullscreen({ button, status, help, mobile, onExit }) {
  const root = document.documentElement;
  const standaloneQuery = window.matchMedia('(display-mode: standalone)');
  const fullscreenQuery = window.matchMedia('(display-mode: fullscreen)');
  const installed = () => navigator.standalone === true || standaloneQuery.matches ||
    (fullscreenQuery.matches && !active());
  const active = () => document.fullscreenElement || document.webkitFullscreenElement;
  const available = () => Boolean(
    (root.requestFullscreen && document.fullscreenEnabled !== false) ||
    (root.webkitRequestFullscreen && document.webkitFullscreenEnabled !== false),
  );
  let wasActive = Boolean(active());
  function update() {
    button.hidden = installed() || !available();
    button.textContent = active() ? '退出全屏' : '进入全屏';
    for (const item of help) {
      item.hidden = !mobile.matches || installed() || available();
      item.textContent = '全屏游玩：在 Safari 分享菜单中选择“添加到主屏幕”，再从主屏幕图标打开。';
      if (!/iPhone|iPad|iPod/.test(navigator.userAgent) && !navigator.standalone)
        item.textContent = '此浏览器无法直接全屏，可尝试在浏览器菜单中安装或添加到主屏幕，再从图标打开。';
    }
    if (wasActive && !active()) onExit();
    wasActive = Boolean(active());
  }
  async function enter() {
    if (installed() || active() || !available()) return;
    status.hidden = true;
    try {
      if (root.requestFullscreen && document.fullscreenEnabled !== false)
        await root.requestFullscreen({ navigationUI: 'hide' });
      else await root.webkitRequestFullscreen();
      // Orientation locking is optional and unsupported in some browsers.
      if (mobile.matches && active()) {
        try { await screen.orientation?.lock?.('landscape'); } catch {}
      }
    } catch {
      status.textContent = '未能进入全屏，可在暂停菜单重试，或继续在当前窗口游玩。';
      status.hidden = false;
    }
    update();
  }
  button.onclick = async () => {
    if (!active()) return enter();
    try {
      if (document.exitFullscreen) await document.exitFullscreen();
      else await document.webkitExitFullscreen();
    } catch {
      status.textContent = '未能退出全屏，请使用浏览器的退出全屏操作。';
      status.hidden = false;
    }
    update();
  };
  document.addEventListener('fullscreenchange', update);
  document.addEventListener('webkitfullscreenchange', update);
  standaloneQuery.addEventListener('change', update);
  fullscreenQuery.addEventListener('change', update);
  mobile.addEventListener('change', update);
  update();
  return { enter };
}
