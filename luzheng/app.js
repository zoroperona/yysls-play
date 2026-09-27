import { bindFullscreen } from "./fullscreen.js?v=76245c7662c7";
import { bindTouchControls } from "./touch-controls.js?v=76245c7662c7";
import { Game, dist } from "./engine.js?v=76245c7662c7";
import { PRACTICE_OPTIONS, TIMELINE } from "./timeline.js?v=76245c7662c7";
const $ = (id) => document.getElementById(id),
  canvas = $("arena"),
  ctx = canvas.getContext("2d");
const fmt = (t) =>
  `${Math.floor(t / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor(t % 60)
    .toString()
    .padStart(2, "0")}`;
const image = (name) => {
  const i = new Image();
  const url = new URL("../assets/luzheng/sprites/" + name + ".png", import.meta.url);
  let retries = 0;
  i.onerror = () => {
    if (retries++ < 2) setTimeout(() => {
      url.searchParams.set("retry", String(retries));
      i.src = url.href;
    }, 500 * retries);
  };
  i.src = url.href;
  return i;
};
const bossImg = image("luzheng-boss-display"),
  soulImg = image("soul-display"),
  teamImg = image("team-chibi");
const victoryImg = $("victoryImage");
let victoryRetries = 0;
victoryImg.onload = () => { $("victoryText").hidden = true; victoryImg.hidden = false; };
victoryImg.onerror = () => {
  $("victoryText").hidden = false;
  victoryImg.hidden = true;
  if (victoryRetries++ < 2) setTimeout(() => {
    const url = new URL(victoryImg.src);
    url.searchParams.set("retry", String(victoryRetries));
    victoryImg.src = url.href;
  }, 500 * victoryRetries);
};
if (victoryImg.complete && victoryImg.naturalWidth) victoryImg.onload();
else if (victoryImg.complete) victoryImg.onerror();
let game = new Game(),
  started = false,
  paused = true,
  keys = new Set(),
  last = 0,
  acc = 0,
  uiTimer = 0,
  resultDismissed = false;
const touch = bindTouchControls({
  zone: $("joystickZone"),
  tap: (event) => canvas.onclick(event),
  joystick: $("joystick"),
  knob: $("joystickKnob"),
  buttons: document.querySelectorAll("[data-action]"),
  enabled: () => started && !paused && game.status === "running" && game.party[0].hp > 0,
  action: (key) => game.input(key),
});
const mobileLayout = window.matchMedia("(any-pointer: coarse)");
bindFullscreen({
  button: $("fullscreenToggle"),
  status: $("fullscreenStatus"),
  help: document.querySelectorAll(".home-screen-help"),
  mobile: mobileLayout,
  onExit: () => {
    if (started && !paused && game.status === "running") togglePause();
  },
});
for (const event of ["contextmenu", "selectstart", "dragstart"])
  document.querySelector(".stage").addEventListener(event, (e) => e.preventDefault());
const history = [];
function logText() {
  return [
    ...history,
    "# 当前练习 · " +
      (game.practice?.name || "完整战斗") +
      " · " +
      game.playerTeam +
      "队\n" +
      [...game.logs]
        .reverse()
        .map((l) => "[" + fmt(l.t) + "] " + l.s)
        .join("\n"),
  ].join("\n\n");
}
$("showLog").onclick = () => {
  if (started && !paused && game.status === "running") togglePause();
  $("fullLog").textContent = logText();
  $("logMenu").showModal();
};
$("closeLog").onclick = () => $("logMenu").close();
$("pauseLog").onclick = $("resultLog").onclick = $("showLog").onclick;
$("exportLog").onclick = () => {
  const url = URL.createObjectURL(
    new Blob([logText()], { type: "text/plain;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "陆狰-战斗日志.txt";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
PRACTICE_OPTIONS.forEach((e) => {
  const o = document.createElement("option");
  o.value = e.id;
  o.textContent = fmt(e.at) + " " + e.name;
  $("chapter").append(o);
});
let victoryFor = null, victoryFinished = false, victoryAnimation = null;
function reset(practiceOverride) {
  victoryAnimation?.cancel();
  victoryFor = null;
  victoryFinished = false;
  $("victoryBanner").hidden = true;
  if (game.logs.length)
    history.push(
      "# " +
        (game.practice?.name || "完整战斗") +
        " · " +
        game.playerTeam +
        "队\n" +
        [...game.logs]
          .reverse()
          .map((l) => "[" + fmt(l.t) + "] " + l.s)
          .join("\n"),
    );
  started = false;
  $("pauseMenu").close();
  $("result").close();
  resultDismissed = false;
  const option = practiceOverride?.id
    ? practiceOverride
    : PRACTICE_OPTIONS.find((e) => e.id === $("chapter").value);
  game = new Game(
    {
      aiDps: Math.max(0, Number($("dps").value) || 0),
      playerTeam: Number($("team").value),
      continuousPractice: true,
    },
    option,
  );
  keys.clear();
  touch.reset();
  paused = true;
  acc = 0;
  updateUI();
}
$("reset").onclick = reset;
$("retry").onclick = () => {
  if (game.status === "victory") $("chapter").value = "all";
  const event = game.status === "wipe" ? game.retryEvent() : null;
  reset(event);
  start();
};
$("dismiss").onclick = () => {
  resultDismissed = true;
  updateUI();
};
$("chapter").onchange = reset;
$("team").onchange = reset;
function start() {
  started = true;
  paused = false;
  $("entryMenu").close();
  $("pauseMenu").close();
  keys.clear();
  touch.reset();
  canvas.focus();
  updateUI();
}
function togglePause() {
  if (!started || game.status !== "running") return;
  if (paused) {
    start();
    return;
  }
  paused = true;
  keys.clear();
  touch.reset();
  $("pauseMenu").showModal();
  $("resume").focus();
  updateUI();
}
$("resume").onclick = start;
$("start").onclick = () => {
  start();
};
$("entryMenu").addEventListener("cancel", (e) => e.preventDefault());
$("pauseMenu").addEventListener("cancel", (e) => {
  e.preventDefault();
  start();
});
$("result").addEventListener("cancel", (e) => {
  e.preventDefault();
  $("dismiss").click();
});
$("pause").onclick = () => {
  if (game.status !== "running") {
    reset();
    return;
  }
  if (!started) start();
  else togglePause();
};
function adjacentMechanic(direction) {
  const currentAt = game.a?.at ?? game.jumpTarget?.at ?? game.t;
  return direction > 0
    ? TIMELINE.find((item) => item.at > currentAt)
    : [...TIMELINE].reverse().find((item) => item.at < currentAt);
}
function switchMechanic(direction) {
  if (!started || paused || game.status !== "running") return;
  const event = adjacentMechanic(direction);
  if (event && game.jumpTo(event)) {
    $("chapter").value = event.id;
    acc = 0;
    start();
  }
}
$("previousMechanic").onclick = () => switchMechanic(-1);
$("nextMechanic").onclick = () => switchMechanic(1);
window.addEventListener("keydown", (e) => {
  if (
    ["ArrowLeft", "ArrowRight"].includes(e.key) &&
    !/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)
  ) {
    e.preventDefault();
    if (e.repeat) return;
    switchMechanic(e.key === "ArrowRight" ? 1 : -1);
    return;
  }
  if (e.key === "Escape") {
    if (
      !$("pauseMenu").open &&
      !$("result").open &&
      !$("logMenu").open &&
      !e.repeat
    ) {
      e.preventDefault();
      togglePause();
    }
    return;
  }
  if (/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
  const k = e.key.toLowerCase();
  if (["w", "a", "s", "d", "q", "e", "shift", " "].includes(k)) {
    e.preventDefault();
    keys.add(k);
    if (!paused && !e.repeat) game.input(k === "q" ? "1" : k);
  }
});
window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
window.addEventListener("blur", () => {
  keys.clear();
  touch.reset();
  if (started && !paused && game.status === "running") togglePause();
  updateUI();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    touch.reset();
    keys.clear();
    if (started && !paused && game.status === "running") togglePause();
  }
});
canvas.onclick = (e) => {
  if (paused) return;
  const r = canvas.getBoundingClientRect(),
    p = {
      x: (e.clientX - r.left - view.x) / view.scale,
      y: (e.clientY - r.top - view.y) / view.scale,
    };
  const hit = [...game.adds, game.boss]
    .filter((a) => a.hp > 0 && !a.expired && dist(p, a) < 50)
    .sort((a, b) => dist(p, a) - dist(p, b))[0];
  if (hit) game.target = hit.id;
};
function text(s, x, y, color = "#ded4b9", size = 12) {
  ctx.fillStyle = color;
  ctx.font = `${size}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(s, x, y);
}
function ring(x, y, r, color, width = 1) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}
const view = { x: 0, y: 0, scale: 1, width: 0, height: 0, dpr: 1 };
function resize() {
  touch.reset();
  keys.clear();
  if (mobileLayout.matches && window.innerHeight > window.innerWidth && started && !paused)
    togglePause();
  syncCanvasSize();
}
function syncCanvasSize() {
  const { width, height } = canvas.getBoundingClientRect();
  if (!width || !height) return;
  // Cap backing-store memory on iOS; CSS size and game coordinates remain unchanged.
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  if (view.width === width && view.height === height && view.dpr === dpr) return;
  Object.assign(view, { width, height, dpr });
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  view.x = width / 2;
  view.y = height / 2 + (mobileLayout.matches ? 16 : 25);
  view.scale = Math.max(
    0.1,
    Math.min((width - (mobileLayout.matches && width > height ? 340 : 32)) / 650, (height - (mobileLayout.matches ? 90 : 170)) / 620),
  );
}
window.addEventListener("resize", resize);
window.addEventListener("orientationchange", resize);
window.visualViewport?.addEventListener("resize", resize);
new ResizeObserver(resize).observe(canvas);
mobileLayout.addEventListener("change", resize);
resize();
function render() {
  // Safari can change CSS viewport size after its window resize event.
  syncCanvasSize();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  const dpr = view.dpr;
  ctx.setTransform(
    dpr * view.scale,
    0,
    0,
    dpr * view.scale,
    dpr * view.x,
    dpr * view.y,
  );
  ctx.fillStyle = "#2a3930";
  ctx.beginPath();
  ctx.arc(0, 0, 300, 0, Math.PI * 2);
  ctx.fill();
  ring(0, 0, 300, "#a89b69", 3);
  ring(0, 0, 280, "#5f6b50");
  ring(0, 0, 165, "#4d6051");
  ctx.strokeStyle = "#4b5b4a";
  ctx.setLineDash([4, 8]);
  ctx.beginPath();
  ctx.moveTo(-300, 0);
  ctx.lineTo(300, 0);
  ctx.moveTo(0, -300);
  ctx.lineTo(0, 300);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, 298, 0, Math.PI * 2);
  ctx.clip();
  if (game.divided) {
    ctx.fillStyle = "#e0bd6570";
    ctx.fillRect(-38, -300, 76, 600);
    ctx.strokeStyle = "#ffe49a";
    ctx.strokeRect(-38, -300, 76, 600);
    text("巨剑隔离", 0, -245, "#ffe49a", 13);
  }
  for (const z of game.zones) {
    const colors = {
        gold: ["#e0b94565", "#eed280"],
        red: ["#d6494540", "#f38472"],
        green: ["#5da48150", "#9bdab1"],
      },
      [fill, stroke] = colors[z.color];
    ctx.fillStyle = z.impact
      ? z.color === "red"
        ? "#ff625ddd"
        : "#ffe695cc"
      : fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (z.shape === "polygon") {
      z.points.forEach((p, i) =>
        i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y),
      );
      ctx.closePath();
      ctx.fill();
      if (z.progress !== undefined && !z.impact) {
        ctx.save();
        ctx.clip();
        const minX = Math.min(...z.points.map((p) => p.x));
        const maxX = Math.max(...z.points.map((p) => p.x));
        const minY = Math.min(...z.points.map((p) => p.y));
        const maxY = Math.max(...z.points.map((p) => p.y));
        const frontY = minY + (maxY - minY) * z.progress;
        ctx.fillStyle = "#ff4b3ddd";
        ctx.fillRect(minX, minY, maxX - minX, frontY - minY);
        ctx.fillStyle = "#fff2cc";
        ctx.shadowColor = "#ff6a4e";
        ctx.shadowBlur = 12;
        ctx.fillRect(minX, frontY - 3, maxX - minX, 6);
        ctx.restore();
      }
      ctx.stroke();
      text(z.label, z.labelX, z.labelY, stroke, 11);
      continue;
    }
    if (z.shape === "line") {
      ctx.moveTo(z.origin.x, z.origin.y);
      ctx.lineTo(z.end.x, z.end.y);
      ctx.lineWidth = 12;
      ctx.globalAlpha = 0.65;
      ctx.stroke();
      ctx.globalAlpha = 1;
      if (z.label)
        text(
          z.label,
          (z.origin.x + z.end.x) / 2,
          (z.origin.y + z.end.y) / 2 - 15,
          stroke,
          11,
        );
      continue;
    }
    if (z.shape === "charge") {
      ctx.fillStyle = "#ffe695b0";
      ctx.fillRect(z.x, z.y, z.w, z.h);
      continue;
    }
    if (z.shape === "rect") ctx.rect(z.x, z.y, z.w, z.h);
    else {
      ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2);
      if (z.shape === "ring") ctx.arc(z.x, z.y, z.inner, 0, Math.PI * 2, true);
    }
    ctx.fill();
    ctx.stroke();
    if (z.progress !== undefined && !z.impact) {
      ctx.fillStyle = "#ff77677a";
      ctx.fillRect(z.x, z.y, z.w, z.h * z.progress);
    }
    if (z.label)
      text(
        z.label,
        z.shape === "rect" ? z.x + z.w / 2 : z.x,
        z.shape === "rect" ? z.y + 18 : z.y - z.r - 8,
        stroke,
        11,
      );
  }
  for (const ray of game.a?.rays || [])
    if (ray.until > game.t) {
      ctx.beginPath();
      ctx.moveTo(ray.origin.x, ray.origin.y);
      ctx.lineTo(ray.end.x, ray.end.y);
      ctx.strokeStyle = "#fb9278";
      ctx.lineWidth = 5;
      ctx.stroke();
    }
  ctx.restore();
  for (const [x, label] of [
    [-230, "1 号点"],
    [230, "2 号点"],
  ]) {
    ring(x, 0, 24, "#dfd9a6", 2);
    text(label, x, -34, "#fff0ac", 16);
  }
  for (const e of game.effects || []) {
    const t = Math.min(1, ((game.real || 0) - e.at) / e.duration),
      x = e.origin.x + (e.end.x - e.origin.x) * t,
      y = e.origin.y + (e.end.y - e.origin.y) * t;
    ctx.save();
    if (e.kind === "sword-hit" || e.kind === "sword-break") {
      ctx.globalAlpha = 1 - t;
      ctx.strokeStyle = "#fff0b0";
      ctx.fillStyle = "#fff0b0";
      ctx.shadowColor = "#ffd365";
      ctx.shadowBlur = 20;
      ctx.lineWidth = 3;
      if (e.kind === "sword-hit") {
        ctx.fillRect(-38, -280, 76, 560);
        ring(x, y, 12 + t * 65, "#fff8d5", 4);
        for (let i = 0; i < 10; i++) {
          const angle = (i * Math.PI) / 5;
          ctx.beginPath();
          ctx.moveTo(
            x + Math.cos(angle) * t * 60,
            y + Math.sin(angle) * t * 60,
          );
          ctx.lineTo(
            x + Math.cos(angle) * (t * 60 + 16),
            y + Math.sin(angle) * (t * 60 + 16),
          );
          ctx.stroke();
        }
        text("命中 " + e.count + "/6", x, y - 28 - t * 20, "#fff8d5", 18);
      } else {
        for (let i = 0; i < 24; i++) {
          const side = i % 2 ? -1 : 1;
          ctx.save();
          ctx.translate(
            side * (15 + t * (70 + (i % 5) * 18)),
            -260 + i * 22 + t * t * 100,
          );
          ctx.rotate(side * t * 3);
          ctx.fillRect(-8, -14, 16, 28);
          ctx.restore();
        }
        text("巨剑破碎", 0, -80, "#fff8d5", 26);
      }
      ctx.restore();
      continue;
    }
    ctx.strokeStyle = e.kind === "knife" ? "#ff514a" : "#bff8ff";
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 12;
    ctx.lineWidth = e.kind === "knife" ? 7 : 3;
    ctx.beginPath();
    ctx.moveTo(
      x - (e.end.x - e.origin.x) * 0.13,
      y - (e.end.y - e.origin.y) * 0.13,
    );
    ctx.lineTo(x, y);
    ctx.stroke();
    ring(x, y, e.kind === "knife" ? 5 : 9, ctx.strokeStyle, 2);
    ctx.restore();
  }
  function drawEnemies() {
    const b = game.boss;
    if (bossImg.complete && bossImg.naturalWidth) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(b.x, b.y, 25, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = "#202a24";
      ctx.fill();
      ctx.drawImage(bossImg, b.x - 24, b.y - 25, 48, 51);
      ctx.restore();
    } else {
      ctx.fillStyle = "#663e30";
      ctx.beginPath(); ctx.arc(b.x, b.y, 24, 0, Math.PI * 2); ctx.fill();
      text("陆", b.x, b.y + 7, "#fff0ac", 22);
    }
    ring(b.x, b.y, 26, "#ae654d", 2);
    text("陆狰", b.x, b.y + 43);
    if (game.target === "boss") ring(b.x, b.y, 32, "#e9d295", 2);
    for (const a of game.adds) {
      if (a.hp <= 0) continue;
      if (a.id === "soul") ring(a.x, a.y, 30, "#e86c58", 2);
      ctx.fillStyle = a.expired ? "#645b4c" : "#c8af75";
      if (a.id === "soul" && soulImg.complete && soulImg.naturalWidth) {
        ctx.save();
        ctx.shadowColor = "#f6c85c";
        ctx.shadowBlur = 12;
        ctx.drawImage(soulImg, a.x - 36, a.y - 43, 72, 78);
        ctx.restore();
      } else if (a.id === "soul") {
        ctx.beginPath(); ctx.arc(a.x, a.y, 25, 0, Math.PI * 2); ctx.fill();
        text("魂", a.x, a.y + 7, "#33281a", 22);
      } else ctx.fillRect(a.x - 7, a.y - 25, 14, 43);
      text(a.name, a.x, a.id === "soul" ? a.y - 55 : a.y + 38, "#fff0ac", 15);
      text(
        a.deadline
          ? `${a.id === "soul" ? "结算 " : ""}${Math.max(0, a.deadline - game.t).toFixed(1)}s`
          : `${Math.ceil((a.hp / a.max) * 100)}%`,
        a.x,
        a.id === "soul" ? a.y - 73 : a.y - 34,
        "#f0d99b",
      );
      const hpY = a.id === "soul" ? a.y - 47 : a.y + 20;
      ctx.fillStyle = "#1a241c";
      ctx.fillRect(a.x - 30, hpY, 60, 5);
      ctx.fillStyle = "#e0ba66";
      ctx.fillRect(a.x - 30, hpY, (60 * a.hp) / a.max, 5);
      if (game.target === a.id)
        ring(a.x, a.y, 35, a.id === "soul" ? "#ff8975" : "#fff3a5", 3);
    }
  }
  for (const p of [...game.party].sort((a, b) => a.y - b.y)) {
    ctx.save();
    ctx.globalAlpha = p.hp > 0 ? 1 : 0.3;
    // 原图三人互相搭肩：只截取各自头部作为棋子，避免错误切割身体。
    if (teamImg.complete && teamImg.naturalWidth) {
      const sx = [6, 119, 238][p.id % 3];
      ctx.drawImage(teamImg, sx, 8, 110, 112, p.x - 18, p.y - 18.5, 36, 37);
    }
    ring(
      p.x,
      p.y,
      13,
      p.id === 0 ? "#f2d68b" : p.healer ? "#a1d4a2" : "#9eacba",
      p.id === 0 ? 3 : 1,
    );
    if (p.id === 0) text("你", p.x, p.y + 4, "#fff2b5", 10);
    if (game.a?.marks?.some((m) => m.target === p.id && !m.fired))
      text("▼", p.x, p.y - 47, "#ffe17d", 18);
    ctx.fillStyle = "#1a241c";
    ctx.fillRect(p.x - 18, p.y + 18, 36, 4);
    ctx.fillStyle = p.hp < 25 ? "#e67864" : "#a7c599";
    ctx.fillRect(p.x - 18, p.y + 18, (36 * p.hp) / 100, 4);
    if (p.hp > 0 && (game.real || 0) - (p.parryFx ?? -999) < 0.25)
      ring(p.x, p.y, 28, "#e0f2d3", 3);
    if (!p.hp) text("倒地", p.x, p.y - 40, "#ebad97", 11);
    ctx.restore();
  }
  // 敌人最后绘制，避免角色头像遮挡 Boss、战魂和小剑。
  drawEnemies();
  if (game.goldFeedback && (game.real || 0) - game.goldFeedback.at < 2)
    text(game.goldFeedback.text, 0, 220, "#fff0ac", 19);
  if (game.a?.id === "sweep" && game.a.slot >= 0 && game.a.guarded)
    text(
      `已点按 ${game.a.pushes} 次 · 连续点按 E，长按无效`,
      0,
      280,
      "#d9edb4",
      16,
    );
  const next = game.a
    ? game.a.duration - (game.t - game.a.at)
    : game.queue.find((e) => !e.started)?.at - game.t;
  text(
    game.a?.id === "cleave"
      ? game.t < game.a.resolveAt
        ? `力劈卸势结算倒计时 ${Math.max(0, game.a.resolveAt - game.t).toFixed(1)} 秒 · 红条满格时按 E`
        : "力劈已结算"
      : game.a
        ? `本机制剩余 ${Math.max(0, next).toFixed(1)} 秒${game.a.beats ? " · 飞刀 " + game.a.beats + "/8" : ""}`
        : Number.isFinite(next)
          ? `下一机制 · ${game.queue.find((e) => !e.started)?.name} · ${Math.max(0, next).toFixed(1)} 秒`
          : "观测轴末段",
    0,
    318,
    "#c9c5a7",
    13,
  );
  ctx.restore();
}
function updateUI() {
  $("targetNotice").hidden = !(
    started && game.status === "running" && game.a?.id === "rally" && game.target !== "soul" &&
    game.adds.some((add) => add.id === "soul" && add.hp > 0 && game.t < add.deadline)
  );
  const dead = game.party[0].hp <= 0;
  const controlsDisabled = !started || paused || dead || game.status !== "running";
  $("touchControls").hidden = controlsDisabled;
  if (controlsDisabled) touch.reset();
  document.querySelector(".stage").classList.toggle("player-dead", dead);
  $("deathNotice").hidden = !dead || game.status !== "running";
  $("reviveStatus").textContent =
    game.rescue?.target === 0
      ? "复活中 · " +
        Math.max(0, game.rescue.end - (game.real || 0)).toFixed(1) +
        " 秒 · 恢复 30% 血量"
      : game.rescues > 0
        ? "等待奶妈救援 · 血量 0%"
        : "救援次数已用尽 · 血量 0%";
  $("clock").textContent =
    fmt(game.t) +
    (game.a ? " · 机制 1×" : ` · 空档 ${game.c.idleSpeed}×`);
  $("bossValue").textContent =
    ((game.boss.hp / game.boss.max) * 100).toFixed(1) + "%";
  $("bossHp").value = (game.boss.hp / game.boss.max) * 100;
  if (!started && !$("entryMenu").open) $("entryMenu").showModal();
  $("pause").hidden = !started;
  $("mechanicControls").hidden = !started;
  $("previousMechanic").disabled = paused || game.status !== "running" || !adjacentMechanic(-1);
  $("nextMechanic").disabled = paused || game.status !== "running" || !adjacentMechanic(1);
  document.querySelector(".notice").hidden = !started;
  $("team").disabled = started;
  $("pause").textContent = !started
    ? "开始游戏"
    : game.status !== "running"
      ? "重开 / 选队"
      : mobileLayout.matches ? "暂停" : "暂停 · Esc";
  const upcoming = game.queue.find((e) => !e.started);
  $("skill").textContent = !started
    ? "准备入场"
    : game.a?.name || (upcoming ? "即将到来 · " + upcoming.name : "常规输出");
  $("hint").textContent = !started
    ? "选择队伍，开始演练"
    : game.a?.hint || upcoming?.hint || "保持输出，观察下一机制";
  if (mobileLayout.matches)
    $("hint").textContent = $("hint").textContent.replace(/按 E/g, "点击卸势").replace(/连续 E/g, "连续点击卸势");
  $("alive").textContent = game.party.filter((p) => p.hp > 0).length + " / 10";
  $("party").innerHTML = [1, 2]
    .map(
      (team) =>
        `<div class="team-column"><div class="team-heading">${team} 队 · ${team === 1 ? "左半场" : "右半场"}</div>` +
        game.party
          .filter((p) => p.team === team)
          .sort((a, b) => a.slot - b.slot)
          .map(
            (p) =>
              `<div class="member ${!p.id ? "you" : ""} ${p.healer ? "healer" : ""} ${!p.hp ? "dead" : ""}"><span>${p.name}<b>${p.hp ? Math.ceil(p.hp) : "倒地"}</b></span><progress aria-label="${p.name}血量" max="100" value="${p.hp}"></progress></div>`,
          )
          .join("") +
        "</div>",
    )
    .join("");
  $("assignment").textContent =
    game.playerTeam === 1
      ? "你属于 1 队：分边去左；横扫进入绿圈卸势，再连续 E 推剑。"
      : "你属于 2 队：分边去右；横扫挡剑后约 5 秒开始飞刀卸势，避免 6 点方向刮到推剑人。";
  $("rescue").textContent =
    `团队救人 ${game.rescues}/5 · 奶妈自动自活` +
    (game.rescue ? " · 正在救人" : "");
  $("score").textContent =
    `成功卸势 ${game.success} · 受伤次数 ${game.mistakes}`;
  $("log").innerHTML = game.logs
    .map((l) => `<li><time>${fmt(l.t)}</time>${l.s}</li>`)
    .join("");
  if (game.status === "victory" && victoryFor !== game) {
    victoryFor = game;
    const wonGame = game;
    victoryFinished = false;
    $("victoryBanner").hidden = false;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    victoryAnimation = $("victoryBanner").animate([
      { opacity: 0, transform: reduced ? "none" : "scale(1.08)", offset: 0 },
      { opacity: 1, transform: "scale(1)", offset: .2 },
      { opacity: 1, transform: "scale(1)", offset: .7 },
      { opacity: 0, transform: reduced ? "none" : "scale(.98)", offset: 1 },
    ], { duration: reduced ? 1600 : 3200, easing: "ease-in-out", fill: "forwards" });
    victoryAnimation.onfinish = () => {
      if (game !== wonGame) return;
      victoryFinished = true;
      $("victoryBanner").hidden = true;
      updateUI();
    };
  }
  const show = game.status !== "running" && !resultDismissed &&
      (game.status !== "victory" || victoryFinished),
    wasHidden = !$("result").open;
  if (show && wasHidden) $("result").showModal();
  if (!show && !wasHidden) $("result").close();
  $("resultTitle").textContent =
    { victory: "击败陆狰", wipe: "团灭 · 全队倒地", complete: "演练结束" }[
      game.status
    ] || "";
  $("resultReason").textContent = game.endReason || "";
  const retryEvent = game.status === "wipe" ? game.retryEvent() : null;
  $("retry").textContent = game.status === "victory"
    ? "从头再来"
    : retryEvent ? "重试当前机制 · " + retryEvent.name : "重新挑战";
  if (show && wasHidden) $("retry").focus();
}
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000 || 0);
  last = now;
  if (!paused && game.status === "running") {
    acc += dt;
    while (acc >= 1 / 60) {
      game.step(1 / 60, {
        dx: (keys.has("d") ? 1 : 0) - (keys.has("a") ? 1 : 0) + touch.dx,
        dy: (keys.has("s") ? 1 : 0) - (keys.has("w") ? 1 : 0) + touch.dy,
        attack: keys.has("q") || touch.attack,

      });
      acc -= 1 / 60;
    }
  }
  render();
  uiTimer += dt;
  if (uiTimer > 0.1) {
    updateUI();
    uiTimer = 0;
  }
  requestAnimationFrame(frame);
}
updateUI();
requestAnimationFrame(frame);
