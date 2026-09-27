// P2 training parameters and decisions are documented in docs/qingping-p2-design.md.
import { distance, inFireCone } from "./engine.js?v=a53cc621f12e";
export const P2_TYPES = new Set([
  "green",
  "cleave",
  "gaze",
  "mark",
  "spray",
  "sweep",
  "heart",
  "poisonFans",
  "final",
]);
export const marker = (g) => ({ x: 0, y: g.c.arenaRadius / 2 });
const direction = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
const cone = (p, angle, radius, degrees) => ({
  x: p.x,
  y: p.y,
  angle,
  radius,
  halfAngle: (degrees * Math.PI) / 360,
});
export function resetP2(g) {
  g.poisons = [];
  g.poisonCache = null;
  g.p2Flights = [];
  g.smallCircles = [];
  g.demons = [];
  g.finalShield = null;
  g.finalPosition = null;
  g.finalPullActive = false;
  for (const p of g.party) {
    p.corrupted = false;
    p.tempUntil = null;
    p.shieldAt = -999;
    p.circleAt = -999;
    p.aiAttackAt = -999;
  }
}
export function selectFinalPosition(g, hazards = g.poisons) {
  const ranged = g.specials.find((p) => p.qingbai);
  const offset = {
    x: Math.cos(ranged.homeAngle) * g.c.qingbaiDistance,
    y: Math.sin(ranged.homeAngle) * g.c.qingbaiDistance,
  };
  let best = null,
    bestScore = Infinity;
  for (const radius of [6, 9, 12])
    for (let i = 0; i < 48; i++) {
      const angle = (i * Math.PI) / 24;
      const pos = { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
      if (pos.x > -4) continue;
      const remote = { x: pos.x + offset.x, y: pos.y + offset.y };
      if (
        Math.hypot(remote.x, remote.y) + g.c.greenRadius >
        g.c.arenaRadius - 0.5
      )
        continue;
      let score = 0;
      for (const center of [pos, remote])
        for (const r of [0, 3, 6])
          for (let n = 0; n < 16; n++) {
            const point = {
              x: center.x + Math.cos((n * Math.PI) / 8) * r,
              y: center.y + Math.sin((n * Math.PI) / 8) * r,
            };
            score += hazards.filter(
              (z) =>
                (z.until == null || z.until > g.real) && inFireCone(point, z),
            ).length;
          }
      score += distance(pos, g.boss) * 0.01;
      if (score < bestScore) {
        bestScore = score;
        best = pos;
      }
    }
  return best ?? { x: g.boss.x, y: g.boss.y };
}
export function placeFinalPractice(g) {
  const pos = selectFinalPosition(g);
  g.finalPosition = pos;
  g.boss.x = pos.x;
  g.boss.y = pos.y;
  for (const p of g.party) {
    const point = p.qingbai ? g.home(p) : p.special ? pos : g.home(p);
    p.x = point.x;
    p.y = point.y;
  }
}
export function beginP2(g) {
  const a = g.a,
    c = g.c;
  if (!P2_TYPES.has(a.type)) return;
  g.phase = 2;
  const excluded = g.party.filter((p) => p.special || !p.hp).map((p) => p.id);
  if (a.type === "green" || a.type === "final") {
    a.greens = g.specials.map((p) => ({
      id: p.id,
      ...(p.qingbai ? g.home(p) : { x: g.boss.x, y: g.boss.y }),
    }));
  }
  if (a.type === "cleave" || a.type === "sweep") {
    a.cast = a.type === "cleave" ? 2 : 3;
    a.cones = [
      cone(
        g.boss,
        direction(g.boss, g.player),
        a.type === "cleave" ? 6 : 15,
        a.type === "cleave" ? 30 : 180,
      ),
    ];
  }
  if (a.type === "gaze" || a.type === "spray")
    a.targets = g.choose(a.type === "gaze" ? 2 : 3, excluded);
  if (a.type === "mark") {
    a.targets = g.party.filter((p) => !p.special).map((p) => p.id);
    a.cones = [];
  }
  if (a.type === "poisonFans")
    a.cones = g.party
      .filter((p) => !p.special)
      .map((p) => cone(g.boss, direction(g.boss, p), c.arenaRadius * 2, 15));
  if (a.type === "heart") {
    a.targets = g.choose(2, excluded);
    g.demons = [];
    g.log(
      "心魔点名：" +
        a.targets.map((id) => g.party[id].name).join("、") +
        " · 去1号点",
    );
  }
}
export function smallCircle(g, p) {
  if (!p.hp || g.ability(p) !== "circle" || g.real - p.circleAt + 1e-8 < 15)
    return false;
  const zone = {
    x: p.x + p.face.x * 3,
    y: p.y + p.face.y * 3,
    radius: 3,
    until: g.real + 1,
  };
  p.circleAt = g.real;
  g.smallCircles.push(zone);
  const excluded = g.party
    .filter(
      (q) =>
        !q.hp ||
        q.special ||
        q.corrupted ||
        q.layers !== 2 ||
        distance(q, zone) > zone.radius,
    )
    .map((q) => q.id);
  const ids = g.choose(2, excluded);
  for (const id of ids) {
    const q = g.party[id];
    g.setLayers(q, q.layers + 1);
    q.tempUntil = g.real + 10;
  }
  g.log(
    `${p.name}小圈：${ids.length ? ids.map((id) => g.party[id].name).join("、") + "临时三重" : "空圈，无人升层"}`,
  );
  return true;
}
export function p2Attack(g, p, amount) {
  if (!p.hp || p.corrupted || p.layers !== 3) return null;
  const demon = g.demons
    .filter((d) => !d.saved && distance(p, g.party[d.id]) <= g.c.attackRange)
    .sort((a, b) => distance(p, g.party[a.id]) - distance(p, g.party[b.id]))[0];
  if (demon) {
    demon.hp = Math.max(0, demon.hp - amount);
    const target = g.party[demon.id];
    if (!demon.hp) {
      demon.saved = true;
      target.corrupted = false;
      target.hp = Math.max(30, target.hp);
      target.deadReal = null;
      g.log(`${target.name} · 心魔获救`);
      if (g.demons.every((d) => d.saved))
        for (const q of g.party)
          if (q.tempUntil != null) {
            q.tempUntil = null;
            g.setLayers(q, 2);
          }
    }
    return target;
  }
  const shield = g.finalShield;
  if (shield && shield.hp > 0 && distance(p, g.boss) <= g.c.attackRange) {
    const used = shield.contributions[p.id] ?? 0;
    const hit = Math.min(amount, shield.hp);
    if (hit <= 0) return null;
    shield.contributions[p.id] = used + hit;
    shield.hp = Math.max(0, shield.hp - hit);
    if (shield.hp < 1e-6) {
      shield.hp = 0;
      if (
        g.party.every(
          (q) =>
            q.hp > 0 && q.layers === 3 && (shield.contributions[q.id] ?? 0) > 0,
        )
      ) {
        g.boss.hp = 0;
        g.finish("complete", "克敌制胜 · 全员三重，幻障已破！");
      } else {
        g.finish("wipe", "破盾失败：需要十人存活、三重且都参与输出。");
      }
    }
    return g.boss;
  }
  return null;
}
function avoidPoison(g, p, target) {
  if (!g.poisons.some((z) => inFireCone(target, z) || inFireCone(p, z)))
    return target;
  const signature = g.poisons
    .map((z) => `${z.x},${z.y},${z.angle},${z.until}`)
    .join(";");
  if (g.poisonCache?.signature !== signature) {
    const candidates = [];
    for (const radius of [4, 8, 12, 16, 20])
      for (let i = 0; i < 90; i++) {
        const angle = (i * Math.PI) / 45;
        const q = { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
        if (!g.poisons.some((z) => inFireCone(q, z))) candidates.push(q);
      }
    g.poisonCache = { signature, candidates };
  }
  let nearest = null,
    best = Infinity;
  for (const q of g.poisonCache.candidates) {
    const d = distance(p, q);
    if (d < best) {
      nearest = q;
      best = d;
    }
  }
  return nearest ?? target;
}
export function p2AITarget(g, p, target) {
  const a = g.a,
    e = g.elapsed;
  if (
    g.finalPosition &&
    (g.finalPullActive || (a?.type === "poisonFans" && e >= 5))
  ) {
    if (p.special && !p.qingbai) return g.finalPosition;
    const radius = p.qingbai ? g.c.qingbaiDistance : 3;
    return {
      x: g.finalPosition.x + Math.cos(p.homeAngle) * radius,
      y: g.finalPosition.y + Math.sin(p.homeAngle) * radius,
    };
  }
  if (!a) return avoidPoison(g, p, target);
  if (a.type === "poisonFans" && e < 5) {
    if (p.special) return p.qingbai ? g.home(p) : { x: g.boss.x, y: g.boss.y };
    const ordinary = g.party.filter((q) => !q.special);
    const angle =
      ((-60 +
        (ordinary.findIndex((q) => q.id === p.id) * 120) /
          (ordinary.length - 1)) *
        Math.PI) /
      180;
    return {
      x: g.boss.x + Math.cos(angle) * 10,
      y: g.boss.y + Math.sin(angle) * 10,
    };
  }
  if (a.type === "green" || a.type === "final") {
    if (e < 6) {
      const own = a.greens.find((q) => q.id === p.id);
      return own ?? a.greens[p.id % 2];
    }
    if (a.type === "final")
      return avoidPoison(g, p, {
        x: g.boss.x + Math.cos(p.homeAngle) * 3,
        y: g.boss.y + Math.sin(p.homeAngle) * 3,
      });
  }
  if (a.type === "mark" && e < 3 && !p.special) {
    p.face = { x: Math.cos(p.homeAngle), y: Math.sin(p.homeAngle) };
    return { x: g.boss.x + p.face.x * 12, y: g.boss.y + p.face.y * 12 };
  }
  if (a.type === "gaze" || a.type === "spray") {
    if (a.targets.includes(p.id)) {
      const index = a.targets.indexOf(p.id);
      const angle =
        -Math.PI / 2 +
        (index * Math.PI * 2) / 3 +
        (a.type === "spray" ? Math.max(0, e - g.c.sprayWarmup) * 0.28 : 0);
      return { x: Math.cos(angle) * 17, y: Math.sin(angle) * 17 };
    }
  }
  if (a.type === "heart") {
    const point = marker(g);
    if (p.special && !p.qingbai) return target;
    const rescued = g.demons.length === 2 && g.demons.every((d) => d.saved);
    if (rescued && e < 27) return target;
    if (p.qingbai && e < 24) return { x: point.x, y: point.y - 3 };
    if (e < 27 || p.corrupted || (!rescued && p.layers === 3))
      return {
        x: point.x + Math.cos(p.homeAngle) * 0.8,
        y: point.y + Math.sin(p.homeAngle) * 0.8,
      };
    return {
      x: g.boss.x + Math.cos(p.homeAngle) * 2,
      y: g.boss.y + Math.sin(p.homeAngle) * 2,
    };
  }
  return avoidPoison(g, p, target);
}
export function castState(g) {
  if (g.a?.type === "poisonFans")
    return {
      round: 0,
      local: g.elapsed,
      castDuration: 5,
      channelDuration: 3,
      name: g.a.name,
      castLabel: "扇形定型",
      channelLabel: "劈下",
    };
  if (g.a?.type === "shield") {
    const duration = g.c.shieldCast + g.c.shieldChannel;
    const round = Math.min(1, Math.floor(g.elapsed / duration));
    return { round, local: g.elapsed - round * duration };
  }
  if (g.a?.type === "heart" && g.elapsed >= 27)
    return { round: 0, local: g.elapsed - 27 };
  return null;
}
export function updateP2(g, dt) {
  const a = g.a,
    c = g.c,
    e = g.elapsed;
  for (const p of g.party)
    if (p.tempUntil != null && g.real + 1e-8 >= p.tempUntil) {
      p.tempUntil = null;
      g.setLayers(p, 2);
    }
  g.smallCircles = g.smallCircles.filter((z) => z.until > g.real);
  g.poisons = g.poisons.filter((z) => z.until > g.real);
  for (const z of g.poisons)
    if (g.real + 1e-8 >= z.next) {
      z.next += 1;
      for (const p of g.party)
        if (inFireCone(p, z)) g.damage(p, z.damage ?? 8, "毒地板");
    }
  for (const shot of g.p2Flights)
    if (!shot.hit && g.real >= shot.land) {
      shot.hit = true;
      for (const p of g.party)
        if (distance(p, shot) <= 6) g.damage(p, 20, "毒素喷流");
      g.flashes.push({
        x: shot.x,
        y: shot.y,
        text: "毒球爆炸",
        until: g.real + 0.6,
      });
    }
  g.p2Flights = g.p2Flights.filter((z) => !z.hit);
  if (g.finalPullActive) {
    const leader = g.specials.find((p) => !p.qingbai);
    if (!leader.hp) {
      g.finish("wipe", "衫上倒地，无法引导Boss拉位。");
      return;
    }
    const d = distance(g.boss, leader);
    if (d > 0.01)
      g.move(
        g.boss,
        { x: (leader.x - g.boss.x) / d, y: (leader.y - g.boss.y) / d },
        Math.min(d, c.finalBossSpeed * dt),
      );
    if (distance(g.boss, g.finalPosition) < 0.1) g.finalPullActive = false;
  }
  if (!a || !P2_TYPES.has(a.type)) return;
  const once = (key, t, fn) => g.once(key, t, fn);
  if (a.type === "green" || a.type === "final") {
    once("green", 6, () => {
      for (const p of g.party) {
        if (!p.hp || (a.type === "green" && p.special)) continue;
        const hits = a.greens.filter(
          (z) => distance(p, g.party[z.id]) <= c.greenRadius,
        ).length;
        g.setLayers(p, p.layers + hits);
        if (a.type === "green" && p.layers === 3) {
          g.finish("wipe", "阶段初吃到两个绿圈：临时三重后归零，机制失败。");
          return;
        }
        if (p.layers >= 4) {
          g.finish("wipe", "入幻四重暴毙 · 重叠吃圈");
          return;
        }
      }
      if (a.type === "final") {
        g.syncBossHealth(a);
        g.finalShield = { hp: 10000, max: 10000, contributions: {} };
      }
    });
    if (a.type === "final")
      for (let at = 6 + c.finalAoeInterval; at < 26; at += c.finalAoeInterval) {
        once(`finalAoe${at}`, at, () => {
          if (!g.finalShield || g.finalShield.hp <= 0 || g.status !== "running")
            return;
          for (const p of g.party) g.damage(p, c.finalAoeDamage, "破盾全团AOE");
          a.aoeFlashUntil = g.real + 0.5;
        });
      }
    if (a.type === "final")
      once("deadline", 26, () => {
        if (g.finalShield?.hp > 0)
          g.finish("wipe", "破盾超时：十人必须各自三重并参与输出。");
      });
  }
  if (a.type === "cleave" || a.type === "sweep")
    once("hit", a.cast, () => {
      for (const p of g.party)
        if (inFireCone(p, a.cones[0]) && !g.isParrying(p))
          g.damage(p, a.type === "cleave" ? 30 : 60, a.name);
    });
  if (a.type === "gaze")
    once("gaze", 4, () => {
      for (const id of a.targets)
        for (const p of g.party)
          if (p.id !== id && distance(p, g.party[id]) <= 6)
            g.damage(p, 80, "冰冷注视");
    });
  if (a.type === "mark") {
    if (!a.done.has("poison"))
      a.cones = a.targets.map((id) => {
        const p = g.party[id];
        return cone(p, Math.atan2(p.face.y, p.face.x), 25, 15);
      });
    once("poison", 3, () =>
      a.cones.forEach((z) =>
        g.poisons.push({ ...z, damage: 30, until: g.real + 12, next: g.real }),
      ),
    );
  }
  if (a.type === "poisonFans") {
    if (!a.done.has("fanLock")) {
      a.cones = g.party
        .filter((p) => !p.special)
        .map((p) => cone(g.boss, direction(g.boss, p), c.arenaRadius * 2, 15));
      once("fanLock", 5, () => {
        g.finalPosition = selectFinalPosition(g, [...g.poisons, ...a.cones]);
        g.finalPullActive = true;
        g.log("执迷幻象方向锁定 · 衫上立即带Boss向左半场，3秒内离开右侧扇形");
      });
    }
    once("poison", 8, () =>
      a.cones.forEach((z) =>
        g.poisons.push({
          ...z,
          damage: c.fanPoisonDamage,
          until: g.real + c.fanPoisonDuration,
          next: g.real,
        }),
      ),
    );
  }
  if (a.type === "spray")
    for (let i = 0; i < 6; i++)
      once(`spray${i}`, c.sprayWarmup + i * c.sprayInterval, () => {
        for (const id of a.targets) {
          const p = g.party[id];
          g.p2Flights.push({
            x: p.x,
            y: p.y,
            start: g.real,
            land: g.real + c.sprayFlight,
            origin: { x: g.boss.x, y: g.boss.y },
          });
        }
      });
  if (a.type === "heart") {
    once("shieldHealth", 27, () =>
      g.syncBossHealth({
        name: "超脱凡躯（后段开盾）",
        bossHpRatio: a.shieldBossHpRatio,
      }),
    );
    once("turn", 7, () => {
      g.demons = a.targets.map((id) => ({
        id,
        hp: c.heartHp,
        max: c.heartHp,
        saved: false,
      }));
      for (const id of a.targets) {
        g.party[id].corrupted = true;
        g.party[id].tempUntil = null;
        g.setLayers(g.party[id], 2);
      }
      g.log("心魔叛变 · 25秒救援开始");
    });
    for (const at of [7, 22])
      once(`circle${at}`, at, () => {
        if (g.demons.length === 2 && g.demons.every((d) => d.saved)) return;
        const p = g.specials.find((p) => p.qingbai),
          point = marker(g),
          d = distance(p, point);
        p.face = d
          ? { x: (point.x - p.x) / d, y: (point.y - p.y) / d }
          : { x: 0, y: 1 };
        smallCircle(g, p);
      });
    for (let i = 0; i < 12; i++)
      once(`betray${i}`, 9 + i * 2, () => {
        for (const d of g.demons.filter((d) => !d.saved)) {
          const p = g.party[d.id];
          const victim = g.party
            .filter((q) => q.hp && !q.corrupted && distance(p, q) <= 12)
            .sort((x, y) => distance(p, x) - distance(p, y))[0];
          if (victim) {
            g.effects.push({
              kind: "heartAttack",
              origin: { x: p.x, y: p.y },
              end: { x: victim.x, y: victim.y },
              at: g.real,
              duration: 0.55,
            });
            g.damage(victim, 10, "心魔攻击");
          }
        }
      });
    once("deadline", 32, () => {
      if (g.demons.some((d) => !d.saved)) {
        for (const d of g.demons.filter((d) => !d.saved))
          g.damage(g.party[d.id], 100, "心魔截止秒杀");
        g.finish("wipe", "心魔未救出：Boss正读条结束，心魔被秒杀。");
      }
    });
    for (let i = 0; i < 3; i++)
      once(`p2pulse${i}`, 32 + ((i + 1) * 4) / 3, () => {
        if (g.status !== "running") return;
        const shields = g.shields.filter(
          (s) => s.owner === 0 && s.until >= g.real,
        );
        if (!shields.length) {
          g.finish("wipe", "超脱凡躯失败：玩家未以二重身份开盾。");
          return;
        }
        for (const p of g.party)
          if (
            !shields.some((s) => distance(p, s) <= c.shieldRadius) ||
            !g.isParrying(p)
          )
            g.damage(p, c.shieldMissDamage, "超脱凡躯 · 盾外或漏卸式");
      });
  }
  for (const p of g.party.slice(1))
    if (g.real - p.aiAttackAt >= 0.5) {
      const hit = p2Attack(
        g,
        p,
        g.demons.some((d) => !d.saved) ? c.heartAiDps / 2 : 50,
      );
      if (hit) {
        p.aiAttackAt = g.real;
        g.effects.push({
          origin: { x: p.x, y: p.y },
          end: { x: hit.x, y: hit.y },
          at: g.real,
          duration: 0.28,
        });
      }
    }
}
export function p2Hint(g) {
  const a = g.a,
    e = g.elapsed;
  if (!a || !P2_TYPES.has(a.type)) return null;
  let text = "",
    timer = `剩余 ${Math.max(0, a.duration - e).toFixed(1)} 秒`;
  if (a.type === "green" || a.type === "final") {
    text =
      e < 6
        ? "只吃一个绿圈 · 重叠会多加一重"
        : a.type === "green"
          ? "二重获得开盾技能"
          : "三重才能伤盾 · 按住输出，十人都需参与";
    timer =
      e < 6
        ? `绿圈结算 ${(6 - e).toFixed(1)} 秒`
        : g.finalShield
          ? `护盾 ${Math.ceil(g.finalShield.hp)} / 10000 · 限时 ${(26 - e).toFixed(1)} 秒`
          : timer;
  }
  if (a.type === "final" && e >= 6 && g.finalShield?.hp > 0) {
    const next =
      6 +
      (Math.floor((e - 6) / g.c.finalAoeInterval) + 1) * g.c.finalAoeInterval;
    timer += ` · 团伤 ${Math.max(0, next - e).toFixed(1)}秒`;
  }
  if (a.type === "cleave" || a.type === "sweep") {
    text = "避开Boss正面红扇形，或卸式";
    timer = `结算 ${Math.max(0, a.cast - e).toFixed(1)} 秒`;
  }
  if (a.type === "gaze")
    text = a.targets.includes(0)
      ? "你被点名 · 离开队友，金圈炸队友不伤自己"
      : "远离金圈点名队友";
  if (a.type === "mark") text = "八人脚下朝前铺毒 · 每块每跳30%，重叠分别扣血";
  if (a.type === "spray")
    text = a.targets.includes(0)
      ? "你被点名 · 离开人群，持续移动躲六次毒球"
      : "远离点名者的连续毒球";
  if (a.type === "poisonFans") {
    text =
      e < 5
        ? "到右半场引扇形 · 定型后跟随衫上向左撤离"
        : "扇形已定型 · 跟随衫上向左，地板保留至破盾结束";
    timer =
      e < 5
        ? `方向锁定 ${(5 - e).toFixed(1)} 秒`
        : `毒地板生成 ${Math.max(0, 8 - e).toFixed(1)} 秒`;
  }
  if (a.type === "heart") {
    text = g.player.corrupted
      ? "你已变成心魔 · 无法操作，等待三重队友救援"
      : e < 27
        ? g.demons.length === 2 && g.demons.every((d) => d.saved)
          ? "心魔已救出 · 回Boss输出，准备后续开盾"
          : "前往1号点吃小圈 · 三重按住输出救心魔"
        : "先到Boss脚下集合 · 二重时按G/点特殊键，再卸式三次";
    timer = `${e < 7 ? "叛变" : "心魔截止"} ${Math.max(0, (e < 7 ? 7 : 32) - e).toFixed(1)} 秒 · 已救 ${g.demons.filter((d) => d.saved).length}/2`;
  }
  return [a.name, text, timer];
}
