import { p2Hint, castState } from "./p2.js?v=ce2d7eddec36";
import { Game, distance } from "./engine.js?v=ce2d7eddec36";
import { TIMELINE } from "./timeline.js?v=ce2d7eddec36";
import { render } from "./render.js?v=ce2d7eddec36";
import { bindTouchControls } from "../shared/touch-controls.js?v=ce2d7eddec36";
import { bindFullscreen } from "../shared/fullscreen.js?v=ce2d7eddec36";
import { BossBgm } from "../shared/bgm.js?v=ce2d7eddec36";
import { mountPauseMenu } from "../shared/pause-menu.js?v=ce2d7eddec36";
const $ = (id) => document.getElementById(id),
  canvas = $("arena"),
  ctx = canvas.getContext("2d");
const bgm = new BossBgm("青瓶居士");
mountPauseMenu({ dialog: $("menu"), bgm });
window.addEventListener("pagehide", () => bgm.pause());
const mobile = matchMedia("(any-pointer: coarse)");
let game = new Game(),
  accumulator = 0,
  last = performance.now(),
  view = {},
  shown = false;
const victoryImg = $("victoryImage");
let victoryRetries = 0;
victoryImg.onload = () => {
  $("victoryText").hidden = true;
  victoryImg.hidden = false;
};
victoryImg.onerror = () => {
  $("victoryText").hidden = false;
  victoryImg.hidden = true;
  if (victoryRetries++ < 2)
    setTimeout(() => {
      const url = new URL(victoryImg.src);
      url.searchParams.set("retry", String(victoryRetries));
      victoryImg.src = url.href;
    }, 500 * victoryRetries);
};
if (victoryImg.complete && victoryImg.naturalWidth) victoryImg.onload();
else if (victoryImg.complete) victoryImg.onerror();
let victoryFor = null,
  victoryFinished = false,
  victoryAnimation = null;
function resetVictory() {
  victoryAnimation?.cancel();
  victoryFor = null;
  victoryFinished = false;
  $("victoryBanner").hidden = true;
}
const keys = new Set(),
  dialogs = [$("entry"), $("menu"), $("result"), $("logMenu")];
const active = () =>
  game.status === "running" &&
  game.player.hp > 0 &&
  !game.forced &&
  !game.player.corrupted &&
  !dialogs.some((d) => d.open);
function clear() {
  keys.clear();
  touch.reset();
  accumulator = 0;
}
function pause() {
  if (game.status === "running" && !dialogs.some((d) => d.open)) {
    game.pause();
    bgm.pause();
    clear();
    $("menu").showModal();
  }
}
bindFullscreen({
  button: $("fullscreenToggle"),
  status: $("fullscreenStatus"),
  help: document.querySelectorAll(".home-screen-help"),
  mobile,
  onExit: pause,
});
function action(name) {
  if (!active()) return;
  if (name === "e") game.parry();
  if (name === "f") game.interact();
  if (name === "g") game.shield(game.player);
  if (name === "shift") game.dodge();
}
const touch = bindTouchControls({
  zone: $("joystickZone"),
  joystick: $("joystick"),
  knob: $("joystickKnob"),
  buttons: document.querySelectorAll("[data-action]"),
  enabled: active,
  action,
  tap: point,
});
function position(event) {
  return {
    x: (event.clientX - view.cx) / view.scale,
    y: (event.clientY - view.cy) / view.scale,
  };
}
function point(event) {
  if (!active()) return;
  const p = position(event);
  if (game.a?.type === "illusion") game.aimAt(p.x, p.y);
  else if (game.t < 11) {
    const orb = game.orbs
      .filter((o) => !o.taken && distance(o, p) < 1.7)
      .sort((a, b) => distance(a, p) - distance(b, p))[0];
    if (orb) game.interact(orb.id);
  }
}
canvas.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  point(event);
});
canvas.addEventListener("contextmenu", (event) => event.preventDefault());
window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (event.target.matches("select,input,textarea")) return;
  if (
    [" ", "arrowleft", "arrowright", "tab"].includes(key) &&
    game.status === "running" &&
    key !== "tab"
  )
    event.preventDefault();
  if (key === "escape") {
    event.preventDefault();
    if ($("menu").open) {
      if (!$("logMenu").open) $("resume").click();
    } else pause();
    return;
  }
  if (!active() || event.repeat) return;
  keys.add(key);
  action(key);
  if (key === "arrowleft") jump(-1);
  if (key === "arrowright") jump(1);
});
window.addEventListener("keyup", (event) =>
  keys.delete(event.key.toLowerCase()),
);
window.addEventListener("blur", () => {
  pause();
  clear();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    pause();
    clear();
  }
});
function resize() {
  const width = canvas.clientWidth,
    height = canvas.clientHeight,
    dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  view = {
    width,
    height,
    cx: width * 0.5,
    cy: height * 0.55,
    scale: Math.min(width * 0.64, height * 0.76) / 44,
  };
  if (mobile.matches && height > width) {
    fitPortraitArena();
  }
}
function fitPortraitArena() {
  if (!mobile.matches || view.height <= view.width) return;
  // Size by phone width rather than squeezing the arena into leftover HUD height.
  const diameter = view.width * 0.92;
  // Reserve a fixed HUD band: cast visibility and hint wrapping must not move the arena.
  const noticeTop = document
    .querySelector(".notice")
    .getBoundingClientRect().top;
  view.cy = Math.max(noticeTop + 132 + diameter / 2, view.height * 0.56);
  view.scale = diameter / 44;
}
window.addEventListener("resize", resize);
function reset(practiceIndex = null) {
  bgm.reset();
  resetVictory();
  clear();
  dialogs.forEach((d) => d.close());
  game = new Game();
  if (practiceIndex !== null) {
    game.jump(practiceIndex);
    game.pause();
  }
  shown = false;
  $("entry").showModal();
  renderParty();
}
function renderParty() {
  $("party").replaceChildren();
  for (let slot = 0; slot < 5; slot++)
    for (const team of [1, 2]) {
      const p = game.party.find((p) => p.team === team && p.slot === slot),
        el = document.createElement("div");
      el.id = `member-${p.id}`;
      el.className = `member${!p.id ? " player" : ""}${p.healer ? " healer" : ""}`;
      el.innerHTML = `<span>${p.name}<small class="hp"></small></span><progress max="100" value="100"></progress>`;
      $("party").append(el);
    }
}
$("start").onclick = () => {
  bgm.resume();
  dialogs.forEach((dialog) => dialog.close());
  clear();
  game.start();
};
$("pause").onclick = pause;
$("shieldAction").onclick = () => action("g");
$("resume").onclick = () => {
  bgm.resume();
  $("menu").close();
  clear();
  game.start();
};
$("reset").onclick = () => reset();
$("retry").onclick = () => {
  if (game.status === "complete") return reset();
  resetVictory();
  $("result").close();
  clear();
  game.jump(game.lastEvent, { retry: true });
  bgm.reset();
  bgm.resume();
  shown = false;
};
$("resultLog").onclick = () => $("showLog").click();
$("dismiss").onclick = () => $("result").close();
function jump(delta) {
  if (game.status !== "running") return;
  clear();
  game.jump(game.lastEvent + delta);
}
$("previous").onclick = () => jump(-1);
$("next").onclick = () => jump(1);
TIMELINE.forEach((e, i) => {
  const option = document.createElement("option");
  option.value = i;
  option.textContent = `${format(e.at)} · ${e.name}`;
  $("chapter").append(option);
});
$("practice").onclick = () => reset(Number($("chapter").value));
for (const dialog of dialogs)
  dialog.addEventListener("cancel", (event) => event.preventDefault());
$("showLog").onclick = () => {
  game.pause();
  bgm.pause();
  clear();
  $("fullLog").textContent =
    game.logs
      .map((l) => `[${format(l.t)}] [${l.event}] ${l.message}`)
      .join("\n") || "尚无战斗记录";
  $("logMenu").showModal();
};
$("closeLog").onclick = () => {
  $("logMenu").close();
  if (game.status === "paused" && !$("menu").open) $("menu").showModal();
};
$("export").onclick = () => {
  const url = URL.createObjectURL(
    new Blob([$("fullLog").textContent], { type: "text/plain;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "青瓶居士-战斗日志.txt";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
function format(t) {
  return `${Math.floor(t / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor(t % 60)
    .toString()
    .padStart(2, "0")}`;
}
function hint() {
  if (game.openingRemaining > 0)
    return [
      "准备开战",
      "Boss 暂不放技能 · 可移动并按住输出；倒计时后生成红球",
      `${game.openingRemaining.toFixed(1)} 秒后开始`,
    ];
  const p2 = p2Hint(game);
  if (p2) return p2;
  const a = game.a,
    e = game.elapsed,
    c = game.c,
    parry = mobile.matches ? "点击卸势" : "按 E 卸势";
  if (!a) {
    const n = TIMELINE[game.next];
    return [
      n ? `即将到来 · ${n.name}` : "转阶段",
      n
        ? n.type === "shield"
          ? "前往Boss脚下集合，倾白与衫上轮流开盾"
          : "保持状态，准备下一个机制"
        : "等待结算",
      n ? `${(n.at - game.t).toFixed(1)} 秒后` : "",
    ];
  }
  let text = "",
    timer = "";
  if (a.type === "orbs") {
    text = game.player.layers
      ? "已吃一球 · 等待结算，不能再拾取"
      : mobile.matches
        ? "靠近一颗球，点按球拾取"
        : "靠近一颗球，按 F 拾取";
    timer = `入幻结算 · ${Math.max(0, 11 - game.t).toFixed(1)} 秒`;
  }
  if (a.type === "rings") {
    text = "内外圈各一次 · 命中损失40%血量";
    timer = `${e < 3 ? "内圈" : "外圈"}结算 · ${Math.max(0, (e < 3 ? 3 : 6) - e).toFixed(1)} 秒`;
  }
  if (a.type === "fire") {
    const pulses = [...a.done].filter((key) => key.startsWith("fire")).length;
    const nextTick = a.fire.firstTick + pulses * a.fire.interval;
    text =
      pulses === c.fireTicks
        ? "吐火结束 · 危险区域已消失"
        : `避开 Boss 正面${c.fireAngleDegrees}°、${a.fire.radius}米红扇形，或连续${parry}`;
    timer =
      pulses === c.fireTicks
        ? `已结算 ${pulses}/${c.fireTicks} 次`
        : `${e < a.fire.firstTick ? "预警 · 开始吐火" : "下次灼烧"} · ${Math.max(0, nextTick - e).toFixed(1)} 秒 · ${pulses}/${c.fireTicks}`;
  }
  if (a.type === "soul") {
    const first = game.balls.find(
      (b) => b.wave === 0 && game.party[b.target].qingbai,
    );
    text = first?.hit
      ? "第一球已结算 · 侧移离开球线，身后队友继续挡球"
      : "每路4人提前排队，奶妈也参与 · 你挡倾白第一球，中球后侧移";
    const launched = [...a.done].filter((key) =>
      key.startsWith("launch"),
    ).length;
    const next = c.soulFirstShot + launched * c.soulInterval;
    timer =
      launched < c.soulWaves
        ? `每路已发 ${launched}/${c.soulWaves} · 下轮 ${Math.max(0, next - e).toFixed(1)} 秒`
        : `每路已发 ${c.soulWaves}/${c.soulWaves} · 等待末球命中`;
  }
  if (a.type === "mist") {
    text = a.targets.includes(0)
      ? `你被点名：离开人群，连续${parry} 6 次`
      : "避开三名点名队友的红圈";
    const next = game.mistCue()?.at ?? e;
    timer = `已结算 ${[...a.done].filter((k) => k.startsWith("mist")).length}/6 · ${Math.max(0, next - e).toFixed(1)} 秒`;
  }
  if (a.type === "illusion") {
    text = game.forced
      ? "方向已锁定 · 强制移动中，无法操作或输出"
      : mobile.matches
        ? "摇杆左右旋转箭头、上下前后移动 · 落点对准2米安全环"
        : "A/D 旋转箭头，W/S 沿箭头前后移动 · 落点对准2米安全环";
    timer = game.forced
      ? `强制前进 · ${Math.max(0, 18 - e).toFixed(1)} 秒`
      : `方向锁定 · ${Math.max(0, 10 - e).toFixed(1)} 秒`;
  }
  if (a.type === "aoe") {
    text = "全团65%伤害 · 留意血量";
    timer = `读条结束 · ${Math.max(0, c.aoeCast - e).toFixed(1)} 秒`;
  }
  if (a.type === "shield") {
    const round = Math.min(1, Math.floor(e / 9)),
      local = e - round * 9,
      count = [...a.done].filter((k) => k.startsWith(`pulse${round}-`)).length;
    text = `到Boss脚下进入${game.specials[round].name}的辟幻圈，引导期间${parry} 5 次`;
    const next = 5 + ((count + 1) * 4) / 5;
    timer =
      local < 5
        ? `第${round + 1}轮施法 · ${(5 - local).toFixed(1)} 秒`
        : `第${round + 1}轮 · 已结算 ${count}/5 · 下次 ${Math.max(0, next - local).toFixed(1)} 秒`;
  }
  return [a.name, text, timer];
}
function hud() {
  const h = hint();
  $("skill").textContent = h[0];
  $("hint").textContent = h[1];
  $("countdown").textContent = h[2];
  $("clock").textContent =
    `战斗 ${format(game.t)} · 视频 ${format(game.t + 3)} · ${game.speed}×`;
  const hp = (game.boss.hp / game.boss.max) * 100;
  $("bossValue").textContent = `${Math.ceil(hp)}%`;
  $("bossHp").value = hp;
  const shield = game.finalShield;
  $("shieldBar").hidden = !shield || shield.hp <= 0;
  if (shield) {
    const percent = Math.max(0, (shield.hp / shield.max) * 100);
    $("shieldFill").style.width = `${percent}%`;
    $("shieldValue").textContent = `◆ 护盾 ${Math.ceil(percent)}%`;
  }
  $("alive").textContent = `${game.party.filter((p) => p.hp > 0).length}/10`;
  for (const p of game.party) {
    const el = $(`member-${p.id}`);
    el.classList.toggle("dead", !p.hp);
    el.querySelector(".hp").textContent = p.hp
      ? mobile.matches
        ? `${Math.ceil(p.hp)}`
        : `${Math.ceil(p.hp)} · ${p.layers}重`
      : "倒地";
    el.querySelector("progress").value = p.hp;
  }
  $("rescue").textContent =
    `救援 ${game.rescues} 次${game.rescue ? " · 救援中" : ""}`;
  $("layerText").textContent = `入幻 ${game.player.layers} 重`;
  [...$("slots").children].forEach((el, i) =>
    el.classList.toggle("on", i < game.player.layers),
  );
  $("ability").textContent =
    game.player.layers === 0
      ? "起手需吃一球"
      : game.player.layers === 1
        ? "一重 · 无特殊技能"
        : game.player.layers === 2
          ? "二重 · 开盾"
          : "三重 · 可攻击护盾与心魔";
  const dead = game.player.hp <= 0;
  document.querySelector(".stage").classList.toggle("player-dead", dead);
  $("death").hidden = !dead || game.status !== "running";
  $("reviveStatus").textContent =
    game.rescue?.id === 0
      ? `复活中 · ${Math.max(0, game.c.rescueDelay - (game.real - game.rescue.at)).toFixed(1)} 秒 · 恢复 ${game.c.rescueHp}% 血量`
      : game.rescues > 0
        ? "等待奶妈救援 · 血量 0%"
        : "救援次数已用尽 · 血量 0%";
  $("joystickZone").hidden = dead || game.player.corrupted;
  document.querySelector(".touch-actions").hidden =
    dead || game.player.corrupted;
  const shieldTurn =
    game.a?.type === "heart" && game.elapsed >= 27 && game.elapsed < 36;
  const shieldReady = game.shields.some(
    (s) =>
      s.owner === 0 &&
      s.until >= game.real &&
      distance(s, game.boss) <= game.c.shieldRadius,
  );
  $("shieldNotice").hidden =
    game.status !== "running" || dead || !shieldTurn || shieldReady;
  const shieldKey = mobile.matches ? "点击「特殊」" : "按 G";
  $("shieldNoticeText").textContent = game.player.corrupted
    ? "等待队友救出心魔，获救后到Boss脚下开盾"
    : game.player.layers === 3
      ? "先到Boss脚下，恢复二重后开盾 · 三重无法开盾"
      : `到Boss脚下，${shieldKey}开盾 · 随后连续卸式3次`;
  const cast = castState(game);
  const casting = !!cast && game.status === "running";
  $("cast").hidden = !casting;
  if (casting) {
    const c = game.c;
    const { round, local } = cast;
    const castDuration = cast.castDuration ?? c.shieldCast;
    const channelDuration = cast.channelDuration ?? c.shieldChannel;
    const duration = castDuration + channelDuration;
    const channel = local >= castDuration;
    const remaining = Math.max(0, (channel ? duration : castDuration) - local);
    $("castLabel").textContent =
      `${cast.name ?? `第${round + 1}轮`} · ${channel ? (cast.channelLabel ?? "引导") : (cast.castLabel ?? "施法")} · ${remaining.toFixed(1)} 秒`;
    $("castProgress").value = Math.max(
      0,
      Math.min(1, channel ? remaining / channelDuration : local / castDuration),
    );
    $("castProgress").setAttribute(
      "aria-label",
      `${cast.name ?? "超脱凡躯"}${channel ? "引导剩余" : "施法进度"}`,
    );
    $("cast").classList.toggle("channeling", channel);
  }
  document
    .querySelectorAll(".touch-actions button")
    .forEach(
      (button) => (button.disabled = game.forced || game.player.corrupted),
    );
  $("shieldAction").hidden = game.phase !== 2 || mobile.matches;
  $("shieldAction").disabled =
    !active() ||
    game.ability(game.player) !== "shield" ||
    game.real - game.player.shieldAt < 15;
  $("shieldAction").textContent =
    game.player.layers === 3
      ? "三重不能开盾"
      : game.real - game.player.shieldAt < 15
        ? `开盾 ${(15 - game.real + game.player.shieldAt).toFixed(1)}s`
        : "开盾 · G";
  $("specialAction").hidden = game.phase !== 2;
  $("specialAction").disabled = $("shieldAction").disabled;
  $("specialLabel").textContent =
    game.player.layers === 3
      ? "三重禁用"
      : game.real - game.player.shieldAt < 15
        ? `${(15 - game.real + game.player.shieldAt).toFixed(1)}s`
        : "开盾";
  $("previous").disabled = game.lastEvent === 0 || game.status !== "running";
  $("next").disabled =
    game.lastEvent === TIMELINE.length - 1 || game.status !== "running";
  $("pause").disabled = game.status !== "running";
  if (game.status === "complete" && victoryFor !== game) {
    victoryFor = game;
    const wonGame = game;
    victoryFinished = false;
    $("victoryBanner").hidden = false;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    victoryAnimation = $("victoryBanner").animate(
      [
        { opacity: 0, transform: reduced ? "none" : "scale(1.08)", offset: 0 },
        { opacity: 1, transform: "scale(1)", offset: 0.2 },
        { opacity: 1, transform: "scale(1)", offset: 0.7 },
        { opacity: 0, transform: reduced ? "none" : "scale(.98)", offset: 1 },
      ],
      {
        duration: reduced ? 1600 : 3200,
        easing: "ease-in-out",
        fill: "forwards",
      },
    );
    victoryAnimation.onfinish = () => {
      if (game !== wonGame) return;
      victoryFinished = true;
      $("victoryBanner").hidden = true;
      hud();
    };
  }
  if (
    ["wipe", "complete"].includes(game.status) &&
    !shown &&
    (game.status !== "complete" || victoryFinished)
  ) {
    clear();
    shown = true;
    $("resultTitle").textContent =
      game.status === "complete" ? "击败青瓶居士" : "演练失败";
    $("reason").textContent = game.reason;
    $("retry").textContent =
      game.status === "complete"
        ? "从头再来"
        : `重试当前机制 · ${TIMELINE[game.lastEvent]?.name || ""}`;
    $("result").showModal();
    $("retry").focus();
  }
}
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (game.status === "running") accumulator += dt;
  else accumulator = 0;
  while (accumulator >= 1 / 60) {
    const wasAlive = game.player.hp > 0;
    const wasForced = game.forced;
    const wasCorrupted = game.player.corrupted;
    game.step(1 / 60, {
      dx: (keys.has("d") ? 1 : 0) - (keys.has("a") ? 1 : 0) + touch.dx,
      dy: (keys.has("s") ? 1 : 0) - (keys.has("w") ? 1 : 0) + touch.dy,
      attack: keys.has("q") || touch.attack,

    });
    accumulator -= 1 / 60;
    if (
      (!wasForced && game.forced) ||
      (!wasCorrupted && game.player.corrupted) ||
      (wasAlive && !game.player.hp)
    ) {
      clear();
      break;
    }
  }
  if (game.status !== "running" && bgm.running) bgm.pause();
  bgm.update();
  hud();
  render(ctx, game, view);
  requestAnimationFrame(frame);
}
$("inputHelp").textContent = mobile.matches
  ? "左侧拖动移动；点按球拾取。幻象准备时左右转箭头、上下前后移动；强制移动时无法操作。"
  : "WASD 移动，F 拾球，Q 输出，E 卸势，Shift 闪避。幻象准备时 W/S 前后移动、A/D 转箭头。";
resize();
renderParty();
$("entry").showModal();
requestAnimationFrame(frame);
