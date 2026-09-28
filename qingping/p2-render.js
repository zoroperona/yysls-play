import { marker } from "./p2.js?v=ce2d7eddec36";
export function renderP2(ctx, g, { circle, line, text }) {
  const a = g.a,
    e = g.elapsed;
  const drawCone = (z, fill, stroke) => {
    ctx.beginPath();
    ctx.moveTo(z.x, z.y);
    ctx.arc(z.x, z.y, z.radius, z.angle - z.halfAngle, z.angle + z.halfAngle);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 0.09;
    ctx.stroke();
  };
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, g.c.arenaRadius, 0, Math.PI * 2);
  ctx.clip();
  if (g.finalPullActive && g.finalPosition) {
    const pos = g.finalPosition;
    circle(pos.x, pos.y, 2, "#92d1cc22", "#b6e5da");
    text("引位目标", pos.x, pos.y - 2.6, "#b6e5da");
    const leader = g.specials.find((p) => !p.qingbai);
    line(g.boss, leader, "#dfc492", 0.16);
  }
  if (a?.type === "final" && a.aoeFlashUntil > g.real) {
    circle(g.boss.x, g.boss.y, g.c.arenaRadius * 2, "#d95e6033", "#ed998f");
    text("全团冲击", g.boss.x, g.boss.y - 5, "#ffb4a4");
  }
  for (const z of g.poisons) drawCone(z, "#967bc75a", "#bfa0d1");
  if (a?.cones && !a.done.has("hit") && !a.done.has("poison")) {
    const red = a.type === "cleave" || a.type === "sweep";
    for (const z of a.cones) {
      drawCone(z, red ? "#ee66552a" : "#dcc35535", red ? "#f28274" : "#ebd281");
      if (red)
        drawCone(
          { ...z, radius: z.radius * Math.min(1, e / a.cast) },
          "#ef67565a",
          "#ff9e8b",
        );
    }
  }
  if (a?.greens && e < 6)
    for (const z of a.greens) {
      const p = g.party[z.id];
      circle(p.x, p.y, g.c.greenRadius, "#70df7b20", "#9feb9b");
      circle(
        p.x,
        p.y,
        g.c.greenRadius * Math.min(1, e / 6),
        "#70df7b44",
        "#aff3a3",
      );
      text("入幻 +1", p.x, p.y - g.c.greenRadius - 0.6, "#b6efab");
    }
  if (
    (a?.type === "gaze" && e < 4) ||
    (a?.type === "spray" && e < g.c.sprayWarmup)
  )
    for (const id of a.targets) {
      const p = g.party[id],
        duration = a.type === "gaze" ? 4 : g.c.sprayWarmup;
      circle(p.x, p.y, 6, "#dcb75420", "#eacf78");
      circle(p.x, p.y, 6 * Math.min(1, e / duration), "#e3b74840", "#ffe195");
    }
  for (const shot of g.p2Flights) {
    circle(shot.x, shot.y, 6, "#dcc04a35", "#eacf78");
    const t = Math.min(1, (g.real - shot.start) / (shot.land - shot.start));
    const pos = {
      x: shot.origin.x + (shot.x - shot.origin.x) * t,
      y: shot.origin.y + (shot.y - shot.origin.y) * t,
    };
    line(shot.origin, pos, "#b4dc8699");
    circle(pos.x, pos.y, 0.45, "#b4dc86");
  }
  for (const z of g.smallCircles)
    circle(z.x, z.y, z.radius, "#7adbd566", "#b6eee8");
  if (g.phase === 2) {
    const p = marker(g);
    circle(p.x, p.y, 1, null, "#a8dded", 0.12);
    text("1", p.x, p.y + 0.4, "#c8efff", 1);
  }
  if (g.finalShield?.hp > 0) {
    circle(g.boss.x, g.boss.y, 3, "#bad9f733", "#bce4ff", 0.2);
    text(
      `幻障 ${Math.ceil(g.finalShield.hp)}`,
      g.boss.x,
      g.boss.y - 4,
      "#c5eaff",
    );
  }
  for (const p of g.party)
    if (p.layers === 3) {
      circle(p.x, p.y, 1.1, null, "#8ef3eb", 0.13);
      text(
        `三重${p.tempUntil != null ? " " + Math.max(0, p.tempUntil - g.real).toFixed(1) + "s" : ""}`,
        p.x,
        p.y - 3.1,
        "#9ef0e8",
        0.55,
      );
    }
  ctx.restore();
}
