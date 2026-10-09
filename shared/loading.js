import { assets, registerImage } from "./assets.js";

export function mountLoading({ button, bgm, victoryImage }) {
  registerImage(victoryImage, victoryImage.src, "胜利图片");
  bgm.registerAssets(assets);
  const panel = document.createElement("section");
  panel.className = "boss-loading";
  panel.innerHTML = `<p role="status" aria-live="polite">正在准备资源…</p>
    <progress max="1" value="0" aria-label="资源加载进度"></progress>
    <button type="button" hidden>重试加载</button>`;
  button.before(panel);
  const message = panel.querySelector("p");
  const bar = panel.querySelector("progress");
  const retry = panel.querySelector("button");
  const audioNotice = document.createElement("button");
  audioNotice.className = "boss-audio-retry";
  audioNotice.textContent = "音乐未能播放 · 点击恢复";
  audioNotice.hidden = true;
  document.body.append(audioNotice);
  audioNotice.onclick = () => { if (bgm.running) bgm.resume(); };
  bgm.onPlaybackError = () => { audioNotice.hidden = false; };
  bgm.onPlaybackSuccess = () => { audioNotice.hidden = true; };
  bgm.onPause = () => { audioNotice.hidden = true; };
  let loading = false;
  // Slow or blocked music must not hold a fully loaded battlefield behind the menu.
  const entryTimer = setTimeout(() => {
    assets.allowOptionalPending();
    refresh();
  }, 15000);

  function refresh() {
    const loaded = assets.tasks.filter((task) => task.done).length;
    const failed = assets.tasks.filter((task) => task.error);
    bar.max = assets.tasks.length || 1;
    bar.value = loaded;
    button.disabled = !assets.ready;
    document.body.classList.toggle("assets-loading", !assets.ready);
    panel.setAttribute("aria-busy", String(loading));
    retry.hidden = loading || !failed.length;
    if (loaded === assets.tasks.length) {
      clearTimeout(entryTimer);
      message.textContent = "资源已就绪";
    } else if (!loading && failed.length) {
      const timedOut = failed.some((task) => task.error.name === "TimeoutError");
      message.textContent = `${timedOut ? "音乐下载超时" : "资源加载失败"}：${failed.map((task) => task.label).join("、")}。可尝试切换手机流量后重试。`;
      if (assets.ready) message.textContent += "图片已就绪，可以开始游戏。";
      else if (assets.requiredReady) message.textContent += "稍后将允许先开始游戏。";
    } else if (assets.ready) {
      message.textContent = "图片已就绪，可以开始游戏。音乐仍在后台加载。";
    } else {
      message.textContent = `正在准备图片与音乐 · ${loaded}/${assets.tasks.length}`;
    }
  }

  async function run() {
    loading = true;
    await assets.load(refresh);
    loading = false;
    refresh();
  }
  retry.onclick = run;
  run();
  return assets;
}
