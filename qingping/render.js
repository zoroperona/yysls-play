import { renderP2 } from "./p2-render.js?v=ce2d7eddec36";
import { distance } from "./engine.js?v=ce2d7eddec36";
function loadImage(path) {
  const img = new Image(),
    url = new URL(path, import.meta.url);
  const version = new URL(import.meta.url).searchParams.get("v");
  if (version) url.searchParams.set("v", version);
  let retries = 0;
  img.onerror = () => {
    if (retries++ < 2)
      setTimeout(() => {
        url.searchParams.set("retry", String(retries));
        img.src = url.href;
      }, 500 * retries);
  };
  img.src = url.href;
  return img;
}
const teamImg = loadImage("../assets/luzheng/sprites/team-chibi.png");
const bossImg = loadImage("../assets/qingping/sprites/boss-head.png");
const shanshangMarker = loadImage(
  "../assets/qingping/sprites/shanshang-marker.png",
);
const qingbaiMarker = loadImage(
  "../assets/qingping/sprites/qingbai-marker.png",
);
const heartArrow = loadImage("../assets/qingping/sprites/heart-arrow.png");
export function render(ctx, game, view) {
  const { width: w, height: h, scale: s, cx, cy } = view,
    c = game.c,
    a = game.a,
    e = game.elapsed;
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s, s);
  function circle(x, y, r, fill, stroke, width = 0.06) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = width;
      ctx.stroke();
    }
  }
  function text(str, x, y, color = "#dedfc7", size = 0.65) {
    ctx.fillStyle = color;
    ctx.font = `${Math.max(size, 8.5 / s)}px "PingFang SC",sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(str, x, y);
  }
  function line(from, to, color, width = 0.1) {
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }
  circle(0, 0, c.arenaRadius, "#243931", "#839278");
  circle(0, 0, c.arenaRadius - 1, null, "#5c7053");
  circle(0, 0, 10, null, "#425443");
  circle(0, 0, 16, null, "#425443");
  if (a?.type === "rings") {
    const inner = e < 3;
    if (!inner) {
      circle(game.boss.x, game.boss.y, c.arenaRadius, "#ce9b2d44");
      circle(game.boss.x, game.boss.y, c.ringRadius, "#243931", "#ddbf63");
    } else
      circle(game.boss.x, game.boss.y, c.ringRadius, "#ce9b2d44", "#ddbf63");
    text(
      inner ? "内圈 · 40%" : "外圈 · 40%",
      game.boss.x,
      game.boss.y - c.ringRadius - 1,
      "#e3c172",
    );
  }
  if (a?.type === "fire" && !a.done.has(`fire${c.fireTicks - 1}`)) {
    const cone = a.fire;
    const warning = e < cone.firstTick;
    ctx.save();
    if (warning) ctx.setLineDash([0.35, 0.25]);
    ctx.beginPath();
    ctx.moveTo(cone.x, cone.y);
    ctx.arc(
      cone.x,
      cone.y,
      cone.radius,
      cone.angle - cone.halfAngle,
      cone.angle + cone.halfAngle,
    );
    ctx.closePath();
    ctx.fillStyle = warning ? "#d84c4c22" : "#d84c4c66";
    ctx.fill();
    ctx.strokeStyle = "#f17b70";
    ctx.lineWidth = 0.09;
    ctx.stroke();
    line(
      cone,
      {
        x: cone.x + Math.cos(cone.angle) * 1.6,
        y: cone.y + Math.sin(cone.angle) * 1.6,
      },
      "#ffa18e",
      0.18,
    );
    text(
      warning ? "即将吐火 · 红扇形预警" : "正在吐火 · 连续卸势",
      cone.x + Math.cos(cone.angle) * (cone.radius + 1.5),
      cone.y + Math.sin(cone.angle) * (cone.radius + 1.5),
      "#ffa18e",
    );
    ctx.restore();
  }
  if (a?.type === "soul") {
    for (const p of game.specials) line(game.boss, p, "#d4ad7daa", 0.17);
    const assigned = a.blockers.find((p) => p.id === 0);
    circle(assigned.x, assigned.y, 1, null, "#adcba0");
    text("排队挡球 · 中球后侧移", assigned.x, assigned.y - 1.5, "#daca96");
  }

  if (a?.type === "mist") {
    const cue = game.mistCue();
    if (cue)
      for (const id of a.targets) {
        const p = game.party[id];
        if (!p.hp) continue;
        circle(p.x, p.y, c.mistRadius, "#d35b521a", "#ed8175", 0.09);
        const radius = Math.max(0.01, c.mistRadius * cue.progress);
        circle(
          p.x,
          p.y,
          radius,
          "#d35b5244",
          "#ff786d",
          Math.max(0.12, 1.5 / s),
        );
        text(
          `卸势 · ${Math.max(0, cue.at - e).toFixed(1)}秒`,
          p.x,
          p.y - c.mistRadius - 0.6,
          "#ffa394",
          0.6,
        );
      }
  }
  if (a?.type === "illusion") {
    const zone = a.safeZone;
    if (!a.done.has("impact")) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, c.arenaRadius, 0, Math.PI * 2);
      ctx.clip();
      ctx.beginPath();
      ctx.arc(0, 0, c.arenaRadius, 0, Math.PI * 2);
      ctx.moveTo(zone.x + zone.outer, zone.y);
      ctx.arc(zone.x, zone.y, zone.outer, 0, Math.PI * 2);
      ctx.moveTo(zone.x + zone.inner, zone.y);
      ctx.arc(zone.x, zone.y, zone.inner, 0, Math.PI * 2);
      ctx.fillStyle = "#dcb33b55";
      ctx.fill("evenodd");
      circle(zone.x, zone.y, zone.inner, null, "#f0cf68", 0.09);
      circle(zone.x, zone.y, zone.outer, null, "#f0cf68", 0.09);
      ctx.restore();
    }
    for (const guide of a.guides) {
      circle(guide.x, guide.y, 0.5, null, "#cad7a4");
      text("安全环 · 2米宽", guide.x, guide.y - 1.8, "#cad7a4", 0.55);
    }
    for (const p of game.party) {
      const arrow = game.illusionArrow(p);
      if (!arrow || arrow.length < 0.05) continue;
      const color = p.id === 0 ? "#f1d899" : "#b7c9a599";
      const angle = Math.atan2(arrow.end.y - p.y, arrow.end.x - p.x);
      const head = Math.min(p.id === 0 ? 1.3 : 0.8, arrow.length * 0.35);
      line(p, arrow.end, color, p.id === 0 ? 0.22 : 0.1);
      for (const side of [-1, 1])
        line(
          arrow.end,
          {
            x: arrow.end.x - Math.cos(angle + side * 0.5) * head,
            y: arrow.end.y - Math.sin(angle + side * 0.5) * head,
          },
          color,
          p.id === 0 ? 0.22 : 0.1,
        );
      if (p.id === 0 && !a.locked) {
        circle(arrow.end.x, arrow.end.y, 0.45, null, "#ead6a1");
        text("预计落点", arrow.end.x, arrow.end.y - 1, "#ead6a1", 0.55);
      }
    }
  }
  renderP2(ctx, game, { circle, line, text });
  for (const shield of game.shields) {
    circle(shield.x, shield.y, c.shieldRadius, "#8bae7530", "#b5d396");
    text("辟幻", shield.x, shield.y - c.shieldRadius - 0.6, "#c4dfa3");
  }
  if (a?.type === "aoe") {
    circle(game.boss.x, game.boss.y, 1.8 + e * 1.7, null, "#d7a68d");
  }
  for (const orb of game.orbs)
    if (!orb.taken) {
      circle(orb.x, orb.y, 0.6, "#e851514d");
      circle(orb.x, orb.y, 0.3, "#ff6666");
      if (
        game.player.layers === 0 &&
        distance(game.player, orb) <= c.pickupRadius
      )
        circle(orb.x, orb.y, 0.9, null, "#f5dd95");
    }
  for (const ball of game.balls)
    if (!ball.hit) {
      circle(ball.x, ball.y, 0.45, "#ead291", "#fff0b9");
    }
  function drawMember(p) {
    const color = p.corrupted
      ? "#ff5757"
      : p.id === 0
        ? "#f2d68b"
        : p.healer
          ? "#a1d4a2"
          : "#9eacba";
    const size = Math.max(2.4, 22 / s);
    const portraitRadius = size * 0.36;
    ctx.save();
    ctx.globalAlpha = p.hp > 0 ? 1 : 0.3;
    if (teamImg.complete && teamImg.naturalWidth) {
      const sx = [6, 119, 238][p.id % 3];
      const width = portraitRadius * 2,
        height = (width * 112) / 110;
      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, portraitRadius, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(
        teamImg,
        sx,
        8,
        110,
        112,
        p.x - width / 2,
        p.y - height / 2,
        width,
        height,
      );
      ctx.restore();
    } else circle(p.x, p.y, portraitRadius, color);
    if (p.corrupted) circle(p.x, p.y, portraitRadius, "#ed2020aa");
    circle(
      p.x,
      p.y,
      portraitRadius,
      null,
      color,
      p.id === 0 ? Math.max(0.16, 2 / s) : 0.07,
    );
    if (p.id === 0) text("你", p.x, p.y + 0.2, "#fff2b5", 0.5);
    text(p.name, p.x, p.y - size * 0.55 - 0.25, color, 0.6);
    if (p.special && p.layers >= 2) {
      const icon = p.qingbai ? qingbaiMarker : shanshangMarker;
      const iconSize = Math.max(1.5, 20 / s);
      const iconBottom = p.y - size * 0.55 - Math.max(1, 11 / s);
      if (icon.complete && icon.naturalWidth) {
        const height = (iconSize * icon.naturalHeight) / icon.naturalWidth;
        ctx.drawImage(
          icon,
          p.x - iconSize / 2,
          iconBottom - height,
          iconSize,
          height,
        );
      } else {
        text(
          p.qingbai ? "◎" : "✿",
          p.x,
          iconBottom,
          p.qingbai ? "#f4d7a0" : "#ffa9a1",
          0.9,
        );
      }
    }
    const hpY = p.y + size * 0.6;
    line(
      { x: p.x - size / 2, y: hpY },
      { x: p.x + size / 2, y: hpY },
      "#13201a",
      0.16,
    );
    line(
      { x: p.x - size / 2, y: hpY },
      { x: p.x - size / 2 + (size * p.hp) / 100, y: hpY },
      p.hp < 25 ? "#e67864" : "#a7c599",
      0.16,
    );
    if (p.hp > 0 && game.real - (p.parryFx ?? -999) < 0.25)
      circle(p.x, p.y, size * 0.78, null, "#e0f2d3", Math.max(0.2, 2 / s));
    ctx.restore();
  }
  for (const p of [...game.party]
    .filter((p) => !p.corrupted)
    .sort((a, b) => a.y - b.y))
    drawMember(p);
  // Boss is above ordinary portraits; corrupted players are drawn above it.
  const bossRadius = Math.max(1.65, 16 / s),
    boss = game.boss;
  ctx.save();
  ctx.beginPath();
  ctx.arc(boss.x, boss.y, bossRadius, 0, Math.PI * 2);
  ctx.clip();
  if (bossImg.complete && bossImg.naturalWidth)
    ctx.drawImage(
      bossImg,
      boss.x - bossRadius,
      boss.y - bossRadius,
      bossRadius * 2,
      bossRadius * 2,
    );
  else {
    circle(boss.x, boss.y, bossRadius, "#203c37");
    text("青瓶", boss.x, boss.y + 0.25, "#d2dbb9", 0.75);
  }
  ctx.restore();
  circle(boss.x, boss.y, bossRadius, null, "#d8c88c", 0.12);
  text("青瓶居士", boss.x, boss.y + bossRadius + 0.9, "#d2dbb9", 0.7);
  // Match Luzheng's cyan moving trail and ring, scaled from pixels into metre coordinates.
  for (const effect of game.effects) {
    const t = Math.min(1, (game.real - effect.at) / effect.duration);
    const dx = effect.end.x - effect.origin.x,
      dy = effect.end.y - effect.origin.y;
    const x = effect.origin.x + dx * t,
      y = effect.origin.y + dy * t;
    ctx.save();
    const color = effect.kind === "heartAttack" ? "#ff625c" : "#bff8ff";
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    line(
      { x: x - dx * 0.13, y: y - dy * 0.13 },
      { x, y },
      color,
      Math.max(0.16, 2 / s),
    );
    circle(x, y, Math.max(0.35, 4 / s), null, color);
    if (effect.kind === "heartAttack") {
      const radius = Math.max(1, 12 / s);
      circle(
        effect.origin.x,
        effect.origin.y,
        radius * (1 + t * 0.6),
        null,
        `rgba(255,80,70,${1 - t})`,
        0.14,
      );
      if (t > 0.55) {
        const impact = (t - 0.55) / 0.45;
        circle(
          effect.end.x,
          effect.end.y,
          radius * (0.5 + impact),
          null,
          `rgba(255,100,80,${1 - impact})`,
          0.2,
        );
      }
    }
    ctx.restore();
  }
  for (const p of game.party.filter((p) => p.corrupted)) drawMember(p);
  if (a?.type === "heart") {
    const marked = a.targets
      .map((id) => ({
        p: game.party[id],
        d: game.demons.find((d) => d.id === id),
      }))
      .filter(({ d }) => !d?.saved);
    const barWidth = Math.max(5, 64 / s),
      barHeight = Math.max(0.3, 5 / s);
    const nearby =
      marked.length === 2 && distance(marked[0].p, marked[1].p) < barWidth;
    const middle =
      marked.reduce((sum, item) => sum + item.p.x, 0) /
      Math.max(1, marked.length);
    marked.forEach(({ p, d }, index) => {
      const x = nearby ? middle + (index ? 1 : -1) * (barWidth / 2 + 0.3) : p.x;
      const y = p.y - Math.max(2.6, 28 / s);
      if (nearby && d)
        line({ x: p.x, y: p.y - 1 }, { x, y: y + 0.4 }, "#f48c8577", 0.06);
      const iconHeight = Math.max(2.5, 30 / s),
        iconWidth =
          (iconHeight * heartArrow.naturalWidth) /
          (heartArrow.naturalHeight || 78);
      // Anchor the arrow tip to the portrait, independently of HUD collision layout.
      const portraitRadius = Math.max(2.4, 22 / s) * 0.36;
      const arrowBottom = p.y - portraitRadius - Math.max(0.15, 2 / s);
      if (heartArrow.complete && heartArrow.naturalWidth)
        ctx.drawImage(
          heartArrow,
          p.x - iconWidth / 2,
          arrowBottom - iconHeight,
          iconWidth,
          iconHeight,
        );
      else text("↓", p.x, arrowBottom, "#ff6767", 1.4);
      text(
        `${Math.ceil(Math.max(0, (d ? 32 : 7) - e - 1e-8))}`,
        (d ? x : p.x) - iconWidth * 0.8,
        arrowBottom - iconHeight * 0.5,
        "#ffd4cf",
        Math.max(0.85, 13 / s),
      );
      if (d) {
        const left = x - barWidth / 2;
        ctx.fillStyle = "#4b191bcc";
        ctx.fillRect(left, y, barWidth, barHeight);
        ctx.fillStyle = "#ed6c61";
        ctx.fillRect(left, y, barWidth * Math.max(0, d.hp / d.max), barHeight);
        ctx.strokeStyle = "#e98c7d";
        ctx.lineWidth = 0.06;
        ctx.strokeRect(left, y, barWidth, barHeight);
        text(
          `${p.name} · ${Math.ceil(d.hp)}/${d.max}`,
          x,
          y + barHeight + Math.max(0.65, 9 / s),
          "#ffa79a",
          0.55,
        );
      }
    });
  }
  for (const f of game.flashes)
    text(f.text, f.x, f.y - 2 - (f.until - game.real) * 0.5, "#ffad88", 0.8);
  ctx.restore();
}
