// Both encounters use this shell; only practice settings are supplied by the page.
export function mountPauseMenu({ dialog, bgm, resetLabel = "重新开始" }) {
  const settings = dialog.querySelector("details");
  dialog.classList.add("boss-pause-menu");
  dialog.setAttribute("aria-labelledby", "pauseTitle");
  dialog.innerHTML = `
    <div class="menu-panel">
      <h2 id="pauseTitle">演练暂停</h2>
      <p>战场已冻结 · Esc 返回</p>
      <div class="menu-actions">
        <button id="resume" class="primary">继续游戏</button>
        <button id="reset">${resetLabel}</button>
        <button id="returnHome">返回主界面</button>
      </div>
      <label class="bgm-volume" for="bgmVolume">
        <span>背景音乐音量</span><output id="bgmVolumeValue" for="bgmVolume"></output>
        <input id="bgmVolume" type="range" min="0" max="100" step="1" />
      </label>
      <div class="menu-actions">
        <button id="pauseLog">战斗日志</button>
        <button id="fullscreenToggle" hidden>进入全屏</button>
      </div>
      <p id="fullscreenStatus" role="status" hidden></p>
      <p class="home-screen-help" hidden></p>
      <p class="contact-note">问题反馈请使用仓库 Issues</p>
    </div>`;
  if (settings) dialog.querySelector(".menu-panel").append(settings);
  const slider = dialog.querySelector("#bgmVolume");
  const value = dialog.querySelector("#bgmVolumeValue");
  slider.value = Math.round(bgm.volume * 100);
  const refresh = () => { value.value = `${slider.value}%`; };
  slider.addEventListener("input", () => {
    bgm.setVolume(Number(slider.value) / 100);
    refresh();
  });
  refresh();
  dialog.querySelector("#pauseLog").onclick = () => document.getElementById("showLog").click();
  dialog.querySelector("#returnHome").onclick = () => { window.location.href = "../"; };
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    dialog.querySelector("#resume").click();
  });
}
