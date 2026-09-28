import { createRoster } from "../shared/roster.js?v=ce2d7eddec36";
import {
  resetP2,
  beginP2,
  updateP2,
  p2AITarget,
  p2Attack,
  placeFinalPractice,
} from "./p2.js?v=ce2d7eddec36";
import { CONFIG } from "./config.js?v=ce2d7eddec36";
import { TIMELINE, P1_END } from "./timeline.js?v=ce2d7eddec36";
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const unit = (x, y) => {
  const d = Math.hypot(x, y);
  return d ? { x: x / d, y: y / d } : { x: 0, y: -1 };
};
export function segmentDistance(p, a, b) {
  const dx = b.x - a.x,
    dy = b.y - a.y,
    n = dx * dx + dy * dy;
  const t = n
    ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / n))
    : 0;
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
}
export function inFireCone(p, cone) {
  const dx = p.x - cone.x,
    dy = p.y - cone.y;
  const d = Math.hypot(dx, dy);
  if (d > cone.radius + 1e-9) return false;
  if (d < 1e-9) return true;
  const difference = Math.atan2(dy, dx) - cone.angle;
  const offset = Math.atan2(Math.sin(difference), Math.cos(difference));
  return Math.abs(offset) <= cone.halfAngle + 1e-9;
}
export class Game {
  constructor({ random = Math.random, config = {} } = {}) {
    this.c = { ...CONFIG, ...config };
    this.random = random;
    this.playerTeam = 1;
    this.party = createRoster(this.playerTeam);
    for (const p of this.party) {
      p.special =
        (p.team === 1 && p.slot === 3) || (p.team === 2 && p.slot === 1);
      p.qingbai = p.team === 1 && p.slot === 3;
      p.layers = 0;
      p.cap = p.special ? 2 : 1;
      p.face = { x: 0, y: -1 };
      p.deadReal = null;
      p.parry = -999;
      p.parryFx = -999;
      const angle = Math.PI * 0.15 + (p.id * Math.PI * 2) / 10;
      p.homeAngle = angle;
      p.x = Math.cos(angle) * (p.qingbai ? this.c.qingbaiDistance : 9);
      p.y = Math.sin(angle) * (p.qingbai ? this.c.qingbaiDistance : 9);
    }
    this.boss = { x: 0, y: 0, hp: this.c.bossHp, max: this.c.bossHp };
    this.t = 0;
    this.real = 0;
    this.phase = 1;
    this.status = "ready";
    this.rescues = this.c.rescues;
    this.logs = [];
    this.a = null;
    this.next = 0;
    this.orbs = [];
    this.balls = [];
    this.shields = [];
    this.flashes = [];
    this.effects = [];
    this.lastAttack = -999;
    this.lastDodge = -999;
    this.aim = { x: 0, y: -1 };
    this.lastEvent = 0;
    this.speed = 1;
    this.rescue = null;
    this.openingRemaining = this.c.openingDuration;
    resetP2(this);
  }
  get player() {
    return this.party[0];
  }
  get specials() {
    return this.party.filter((p) => p.special);
  }
  get elapsed() {
    return this.a ? this.t - this.a.at : 0;
  }
  get forced() {
    return (
      this.a?.type === "illusion" &&
      this.elapsed >= this.c.aimDuration &&
      this.elapsed < this.c.aimDuration + this.c.forcedDuration
    );
  }
  ability(p) {
    return p.special && this.phase === 2
      ? "circle"
      : p.layers === 2
        ? "shield"
        : null;
  }
  log(message) {
    this.logs.push({ t: this.t, event: this.a?.id ?? "idle", message });
  }
  start() {
    if (this.status === "ready" || this.status === "paused")
      this.status = "running";
  }
  pause() {
    if (this.status === "running") this.status = "paused";
  }
  finish(status, reason) {
    if (this.status !== "running") return;
    this.status = status;
    this.reason = reason;
    this.log(reason);
    if (status === "wipe") {
      this.party.forEach((p) => (p.hp = 0));
      this.rescue = null;
    }
  }
  spawnOrbs() {
    this.orbs = Array.from({ length: 12 }, (_, id) => {
      const angle = this.random() * Math.PI * 2,
        r = 5 + this.random() * 11;
      return {
        id,
        x: Math.cos(angle) * r,
        y: Math.sin(angle) * r,
        taken: false,
      };
    });
  }
  setLayers(p, n) {
    p.layers = n;
    if (n >= 4) this.damage(p, 100, "入幻四重 · 暴毙");
  }
  collect(p, orb) {
    if (
      this.status !== "running" ||
      !p.hp ||
      p.layers >= p.cap ||
      this.t >= 11 ||
      !orb ||
      orb.taken ||
      distance(p, orb) > this.c.pickupRadius
    )
      return false;
    orb.taken = true;
    this.setLayers(p, p.layers + 1);
    this.log(`${p.team}队${p.slot + 1}位 ${p.name} · 拾球，入幻${p.layers}重`);
    return true;
  }
  interact(id) {
    const available = this.orbs
      .filter((o) => !o.taken)
      .sort((a, b) => distance(this.player, a) - distance(this.player, b));
    return this.collect(
      this.player,
      id == null ? available[0] : this.orbs.find((o) => o.id === id),
    );
  }
  damage(p, amount, reason) {
    if (!p.hp) return;
    p.hp = Math.max(0, p.hp - amount);
    this.flashes.push({
      x: p.x,
      y: p.y,
      text: `−${amount}`,
      until: this.real + 0.8,
    });
    this.log(
      `${p.team}队${p.slot + 1}位 ${p.name} · ${reason}，损失${amount}%血量`,
    );
    if (!p.hp) p.deadReal = this.real;
  }
  parry() {
    if (
      this.status === "running" &&
      this.player.hp &&
      !this.forced &&
      !this.player.corrupted
    ) {
      this.player.parry = this.real;
      this.player.parryFx = this.real;
      return true;
    }
    return false;
  }
  isParrying(p) {
    const success =
      p.hp > 0 && (p.id !== 0 || this.real - p.parry <= this.c.parryWindow);
    if (success) p.parryFx = this.real;
    return success;
  }
  aimAt(x, y) {
    if (this.status === "running" && !this.forced && !this.player.corrupted)
      this.aim = unit(x - this.player.x, y - this.player.y);
  }
  dodge() {
    if (
      this.status !== "running" ||
      !this.player.hp ||
      this.forced ||
      this.player.corrupted ||
      this.real - this.lastDodge < this.c.dodgeCooldown
    )
      return;
    this.move(this.player, this.player.face, this.c.dodgeDistance);
    this.lastDodge = this.real;
  }
  move(p, direction, amount) {
    if (!p.hp) return;
    p.x += direction.x * amount;
    p.y += direction.y * amount;
    const r = Math.hypot(p.x, p.y),
      limit = this.c.arenaRadius - 0.6;
    if (r > limit) {
      p.x *= limit / r;
      p.y *= limit / r;
    }
  }
  toward(p, target, dt) {
    const d = distance(p, target);
    this.move(
      p,
      unit(target.x - p.x, target.y - p.y),
      Math.min(d, this.c.aiSpeed * dt),
    );
  }
  home(p) {
    const r = p.qingbai
      ? this.c.qingbaiDistance
      : p.healer
        ? 9
        : p.team === 1 && p.slot === 2
          ? this.c.tangshiDistance
          : 4;
    return {
      x: this.boss.x + Math.cos(p.homeAngle) * r,
      y: this.boss.y + Math.sin(p.homeAngle) * r,
    };
  }
  choose(count, excluded = []) {
    const pool = this.party.filter((p) => !excluded.includes(p.id));
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, count).map((p) => p.id);
  }
  syncBossHealth(event) {
    const ratio = Math.max(0, Math.min(1, event.bossHpRatio ?? 1));
    this.boss.hp = Math.max(1, Math.round(this.boss.max * ratio));
    this.log(`${event.name} · Boss血量强制设置为${(ratio * 100).toFixed(0)}%`);
  }
  begin(event) {
    this.a = { ...event, done: new Set(), targets: [] };
    this.lastEvent = TIMELINE.indexOf(event);
    this.log(event.name);
    this.syncBossHealth(event);
    beginP2(this);
    if (event.type === "aoe") {
      this.boss.x = 0;
      this.boss.y = 0;
    }
    if (event.type === "fire") {
      // Training facing: turn toward the player at cast start, then keep this direction.
      this.a.fire = {
        x: this.boss.x,
        y: this.boss.y,
        radius: this.c.fireRadius,
        firstTick: this.c.fireWarmup,
        interval: this.c.fireInterval,
        angle: Math.atan2(
          this.player.y - this.boss.y,
          this.player.x - this.boss.x,
        ),
        halfAngle: (this.c.fireAngleDegrees * Math.PI) / 360,
      };
    }
    if (event.type === "soul") {
      const a = this.a;
      a.targets = this.specials.map((p) => p.id);
      a.lanes = this.specials.map((p) => {
        const direction = unit(p.x - this.boss.x, p.y - this.boss.y);
        return {
          id: p.id,
          origin: { x: p.x, y: p.y },
          direction,
          x: this.boss.x + direction.x * this.c.soulKnockbackDistance,
          y: this.boss.y + direction.y * this.c.soulKnockbackDistance,
        };
      });
      const helpers = this.party.filter((p) => p.id && !p.special);
      a.blockers = [];
      for (const lane of a.lanes) {
        const members = this.party[lane.id].qingbai
          ? [this.player, ...helpers.splice(0, 3)]
          : helpers.splice(0, 4);
        members.forEach((p, wave) => {
          const radius = 4 + wave * 2.5;
          const x = this.boss.x + lane.direction.x * radius,
            y = this.boss.y + lane.direction.y * radius;
          a.blockers.push({
            id: p.id,
            target: lane.id,
            wave,
            x,
            y,
            waiting: {
              x: x - lane.direction.y * (3 + wave * 0.7),
              y: y + lane.direction.x * (3 + wave * 0.7),
            },
          });
        });
      }
      this.log("衫上、倾白被击退至距Boss约14米 · 两路各四球，间隔2秒");
    }
    if (event.type === "mist") this.a.targets = [0, ...this.choose(2, [0])];
    if (event.type === "illusion") {
      const angle = this.random() * Math.PI * 2;
      this.boss.x = Math.cos(angle) * 5;
      this.boss.y = Math.sin(angle) * 5;
      this.a.safe = "ring";
      this.a.safeZone = {
        x: this.boss.x,
        y: this.boss.y,
        inner: this.c.illusionSafeRadius - this.c.illusionSafeWidth / 2,
        outer: this.c.illusionSafeRadius + this.c.illusionSafeWidth / 2,
      };
      this.aim = unit(this.boss.x - this.player.x, this.boss.y - this.player.y);
      const baseAngle = this.random() * Math.PI * 2;
      this.a.guides = this.specials.map((p, i) => {
        const angle = baseAngle + i * Math.PI + (this.random() - 0.5) * 0.4;
        return {
          id: p.id,
          angle,
          x: this.boss.x + Math.cos(angle) * this.c.illusionSafeRadius,
          y: this.boss.y + Math.sin(angle) * this.c.illusionSafeRadius,
        };
      });
      this.a.paths = this.party
        .filter((p) => p.id && !p.special)
        .map((p, i) => {
          const guide = this.a.guides[i % 2];
          const end = { x: guide.x, y: guide.y };
          let direction, start;
          for (let attempt = 0; attempt < 20; attempt++) {
            const angle = this.random() * Math.PI * 2 + i * 2.4;
            direction = { x: Math.cos(angle), y: Math.sin(angle) };
            start = {
              x:
                end.x -
                direction.x * this.c.forcedSpeed * this.c.forcedDuration,
              y:
                end.y -
                direction.y * this.c.forcedSpeed * this.c.forcedDuration,
            };
            if (Math.hypot(start.x, start.y) <= this.c.arenaRadius - 0.8) break;
          }
          if (Math.hypot(start.x, start.y) > this.c.arenaRadius - 0.8) {
            direction = unit(end.x - this.boss.x, end.y - this.boss.y);
            start = {
              x:
                end.x -
                direction.x * this.c.forcedSpeed * this.c.forcedDuration,
              y:
                end.y -
                direction.y * this.c.forcedSpeed * this.c.forcedDuration,
            };
          }
          return { id: p.id, guideId: guide.id, end, start, direction };
        });
    }
  }
  inIllusionSafe(p) {
    if (this.a?.type !== "illusion") return false;
    const zone = this.a.safeZone,
      d = distance(p, zone);
    return d >= zone.inner - 1e-8 && d <= zone.outer + 1e-8;
  }
  illusionGuideDirection(p) {
    const path = this.a.paths.find((path) => path.id === p.id);
    const guide = this.party[path.guideId];
    return unit(guide.x - p.x, guide.y - p.y);
  }
  illusionArrow(p) {
    if (
      this.a?.type !== "illusion" ||
      p.special ||
      !p.hp ||
      this.a.done.has("impact")
    )
      return null;
    const path = this.a.locked?.find((path) => path.id === p.id);
    const direction =
      path?.direction ??
      (p.id === 0 ? this.aim : this.illusionGuideDirection(p));
    const end = path?.end ?? {
      x: p.x + direction.x * this.c.arrowLength,
      y: p.y + direction.y * this.c.arrowLength,
    };
    return {
      origin: { x: p.x, y: p.y },
      end: { ...end },
      length: distance(p, end),
    };
  }
  mistCue() {
    if (this.a?.type !== "mist") return null;
    const index = [...this.a.done].filter((key) =>
      key.startsWith("mist"),
    ).length;
    if (index >= this.c.mistPulses) return null;
    const at = this.c.mistFirstPulse + index * this.c.mistInterval;
    const start = index === 0 ? 0 : at - this.c.mistInterval;
    return {
      index,
      at,
      progress: Math.max(0, Math.min(1, (this.elapsed - start) / (at - start))),
    };
  }
  attack() {
    if (
      this.status !== "running" ||
      this.forced ||
      !this.player.hp ||
      this.player.corrupted ||
      this.real - this.lastAttack < this.c.attackInterval
    )
      return false;
    const specialTarget = p2Attack(this, this.player, this.c.attackDamage);
    if (
      !specialTarget &&
      (this.finalShield ||
        (this.player.layers === 3 && this.demons.some((d) => !d.saved)))
    )
      return false;
    if (!specialTarget && distance(this.player, this.boss) > this.c.attackRange)
      return false;
    if (!specialTarget)
      this.boss.hp = Math.max(1, this.boss.hp - this.c.attackDamage);
    this.lastAttack = this.real;
    this.effects.push({
      kind: "attack",
      origin: { x: this.player.x, y: this.player.y },
      end: {
        x: (specialTarget ?? this.boss).x,
        y: (specialTarget ?? this.boss).y,
      },
      at: this.real,
      duration: 0.28,
    });
    return true;
  }
  once(key, at, action) {
    if (this.elapsed + 1e-8 >= at && !this.a.done.has(key)) {
      this.a.done.add(key);
      action();
    }
  }
  shield(p) {
    if (
      this.status !== "running" ||
      p.corrupted ||
      !p.hp ||
      p.layers !== 2 ||
      this.real - p.shieldAt < 15 ||
      this.ability(p) !== "shield" ||
      (p.special && distance(p, this.boss) > 0.5)
    )
      return false;
    p.shieldAt = this.real;
    this.shields.push({
      owner: p.id,
      x: p.x,
      y: p.y,
      until: this.real + this.c.shieldDuration,
    });
    this.log(`${p.name} · 开启辟幻，持续10秒`);
    return true;
  }
  updateAI(dt) {
    const claimed = new Set();
    // Reserve one reachable ball for the human while NPCs collect their own quotas.
    const reserve =
      this.player.layers === 0
        ? this.orbs
            .filter((o) => !o.taken)
            .sort(
              (a, b) => distance(this.player, a) - distance(this.player, b),
            )[0]?.id
        : null;
    for (const p of this.party.slice(1)) {
      if (!p.hp) continue;
      if (this.t < 11 && p.layers < p.cap) {
        const orb = this.orbs
          .filter((o) => !o.taken && o.id !== reserve && !claimed.has(o.id))
          .sort((a, b) => distance(p, a) - distance(p, b))[0];
        if (orb) {
          claimed.add(orb.id);
          this.toward(p, orb, dt);
          this.collect(p, orb);
        }
        continue;
      }
      let target = this.home(p);
      if (this.a?.type === "illusion") {
        const guide = this.a.guides.find((g) => g.id === p.id);
        if (guide) target = guide;
        else {
          if (this.elapsed >= this.c.aimDuration) continue;
          const path = this.a.paths.find((path) => path.id === p.id);
          this.toward(p, path.start, dt);
          path.direction = this.illusionGuideDirection(p);
          continue;
        }
      }
      if (this.a?.type === "mist" && this.a.targets.includes(p.id))
        target = {
          x:
            this.boss.x +
            Math.cos(p.homeAngle) * (p.qingbai ? this.c.qingbaiDistance : 16),
          y:
            this.boss.y +
            Math.sin(p.homeAngle) * (p.qingbai ? this.c.qingbaiDistance : 16),
        };
      if (this.a?.type === "soul") {
        if (p.special) {
          const lane = this.a.lanes.find((l) => l.id === p.id);
          const hit = this.balls.some((ball) => ball.hitBy === p.id);
          if (hit)
            this.toward(
              p,
              {
                x: lane.x - lane.direction.y * 3,
                y: lane.y + lane.direction.x * 3,
              },
              dt,
            );
          else {
            const t = Math.min(1, this.elapsed / this.c.soulKnockbackDuration);
            p.x = lane.origin.x + (lane.x - lane.origin.x) * t;
            p.y = lane.origin.y + (lane.y - lane.origin.y) * t;
          }
          continue;
        }
        const assigned = this.a.blockers.find((b) => b.id === p.id);
        if (assigned) {
          const hit = this.balls.some((ball) => ball.hitBy === p.id);
          target = hit ? assigned.waiting : assigned;
        }
      }
      const upcoming = TIMELINE[this.next];
      const preparingShield =
        upcoming?.type === "shield" && upcoming.at - this.t <= 4;
      if (this.a?.type === "shield" || preparingShield) {
        target = p.special
          ? this.boss
          : {
              x: this.boss.x + Math.cos(p.homeAngle) * 2,
              y: this.boss.y + Math.sin(p.homeAngle) * 2,
            };
      }
      target = p2AITarget(this, p, target);
      this.toward(p, target, dt);
    }
  }
  updateMechanic(dt) {
    const a = this.a,
      c = this.c;
    if (!a) return;
    if (a.type === "orbs")
      this.once("resolve", 11, () => {
        for (const p of this.party)
          if (!p.layers) this.damage(p, 100, "起手未吃球");
        if (this.player.layers === 0)
          this.finish(
            "wipe",
            "入幻结算失败：你未吃球。靠近球后交互，起手只需一球。",
          );
        else if (this.specials.some((p) => p.layers !== 2))
          this.finish("wipe", "入幻分配失败：衫上和倾白需要各两球。");
        else this.log("入幻结算通过 · 八人一重、衫上与倾白二重");
        this.orbs = [];
      });
    if (a.type === "rings")
      [3, 6].forEach((at, i) =>
        this.once(`ring${i}`, at, () => {
          this.party
            .filter((p) =>
              i === 0
                ? distance(p, this.boss) <= c.ringRadius
                : distance(p, this.boss) > c.ringRadius,
            )
            .forEach((p) => this.damage(p, c.ringDamage, "内外圈"));
        }),
      );
    if (a.type === "fire")
      for (let i = 0; i < c.fireTicks; i++)
        this.once(`fire${i}`, a.fire.firstTick + i * a.fire.interval, () => {
          this.party
            .filter((p) => inFireCone(p, a.fire) && !this.isParrying(p))
            .forEach((p) => this.damage(p, c.fireDamage, "幽火持续伤害"));
        });
    if (a.type === "soul") {
      for (let wave = 0; wave < c.soulWaves; wave++) {
        this.once(
          `launch${wave}`,
          c.soulFirstShot + wave * c.soulInterval,
          () => {
            this.specials.forEach((p) => {
              const direction = unit(p.x - this.boss.x, p.y - this.boss.y);
              this.balls.push({
                x: this.boss.x,
                y: this.boss.y,
                target: p.id,
                wave,
                launchedAt: this.t,
                direction,
                hit: false,
              });
            });
            this.log(`摄魂发球 ${wave + 1}/${c.soulWaves} · 衫上、倾白各一球`);
          },
        );
      }
      for (const ball of this.balls) {
        if (ball.hit) continue;
        const from = { x: ball.x, y: ball.y };
        ball.x += ball.direction.x * c.soulSpeed * dt;
        ball.y += ball.direction.y * c.soulSpeed * dt;
        const hit = this.party
          .filter(
            (p) => p.hp && segmentDistance(p, from, ball) <= c.soulHitRadius,
          )
          .sort((p, q) => distance(from, p) - distance(from, q))[0];
        if (hit) {
          ball.hit = true;
          ball.hitBy = hit.id;
          this.damage(
            hit,
            c.soulDamage,
            hit.special ? "摄魂之见 · 命中点名者" : "摄魂之见 · 挡球",
          );
          this.log(`${hit.name}挡住摄魂球`);
        }
        if (distance(ball, this.boss) > c.arenaRadius * 2) ball.hit = true;
      }
    }
    if (a.type === "mist")
      for (let i = 0; i < c.mistPulses; i++)
        this.once(`mist${i}`, c.mistFirstPulse + i * c.mistInterval, () => {
          for (const id of a.targets) {
            const target = this.party[id];
            if (!target.hp) continue;
            for (const p of this.party)
              if (
                p.hp &&
                distance(p, target) <= c.mistRadius &&
                (p.id !== id || !this.isParrying(p))
              )
                this.damage(p, c.mistDamage, "幻雾红圈爆炸");
          }
        });
    if (a.type === "illusion") {
      this.once("lock", c.aimDuration, () => {
        a.direction = { ...this.aim };
        a.locked = this.party
          .filter((p) => !p.special)
          .map((p) => {
            const direction =
              p.id === 0 ? { ...this.aim } : this.illusionGuideDirection(p);
            const end = {
              x: p.x + direction.x * c.forcedSpeed * c.forcedDuration,
              y: p.y + direction.y * c.forcedSpeed * c.forcedDuration,
            };
            const r = Math.hypot(end.x, end.y),
              limit = c.arenaRadius - 0.6;
            if (r > limit) {
              end.x *= limit / r;
              end.y *= limit / r;
            }
            return { id: p.id, origin: { x: p.x, y: p.y }, direction, end };
          });
        this.effects = [];
        this.log("方向锁定 · 强制前进8秒，禁止操作与输出");
      });
      if (a.locked && !a.done.has("impact")) {
        const travel =
          Math.min(
            c.forcedDuration,
            Math.max(0, this.elapsed - c.aimDuration),
          ) * c.forcedSpeed;
        for (const path of a.locked) {
          const p = this.party[path.id];
          if (!p.hp) continue;
          p.x = path.origin.x;
          p.y = path.origin.y;
          this.move(p, path.direction, travel);
        }
      }
      this.once("impact", c.aimDuration + c.forcedDuration, () => {
        for (const p of this.party)
          if (!this.inIllusionSafe(p))
            this.damage(p, c.illusionDamage, "幻象迷踪 · 未到安全区");
      });
    }
    if (a.type === "aoe")
      this.once("aoe", c.aoeCast, () =>
        this.party.forEach((p) => this.damage(p, c.aoeDamage, "引破幻障")),
      );
    if (a.type === "shield")
      for (let round = 0; round < 2; round++) {
        this.once(`shield${round}`, round * 9, () => {
          if (!this.shield(this.specials[round]))
            this.finish(
              "wipe",
              "超脱凡躯失败：负责开盾的特殊角色倒地、未达到两层或未到Boss脚下。",
            );
        });
        for (let i = 0; i < c.shieldPulses; i++)
          this.once(
            `pulse${round}-${i}`,
            round * 9 +
              c.shieldCast +
              ((i + 1) * c.shieldChannel) / c.shieldPulses,
            () => {
              for (const p of this.party) {
                const covered = this.shields.some(
                  (s) =>
                    s.until >= this.real && distance(p, s) <= c.shieldRadius,
                );
                if (!covered || !this.isParrying(p))
                  this.damage(
                    p,
                    c.shieldMissDamage,
                    covered ? "蜕 · 漏卸势" : "蜕 · 未在辟幻范围",
                  );
              }
              this.log(`第${round + 1}轮卸势 ${i + 1}/${c.shieldPulses}`);
            },
          );
      }
  }
  recover(dt) {
    if (this.rescue && this.party[this.rescue.id].corrupted) this.rescue = null;
    const healers = this.party.filter(
      (p) => p.healer && p.hp > 0 && !p.corrupted,
    ).length;
    for (const p of this.party)
      if (p.hp > 0 && !p.corrupted)
        p.hp = Math.min(
          100,
          p.hp + ((this.c.healPerSecond * healers) / 2) * dt,
        );
    for (const p of this.party)
      if (
        p.healer &&
        !p.corrupted &&
        !p.hp &&
        this.real - p.deadReal >= this.c.rescueDelay
      ) {
        p.hp = this.c.rescueHp;
        p.deadReal = null;
        this.log(`${p.name} · 治疗自活`);
      }
    if (!this.rescue && this.rescues > 0) {
      const p = this.party.find((p) => !p.hp && !p.healer && !p.corrupted);
      if (p) this.rescue = { id: p.id, at: this.real };
    }
    if (this.rescue && this.real - this.rescue.at >= this.c.rescueDelay) {
      const p = this.party[this.rescue.id];
      p.hp = this.c.rescueHp;
      p.deadReal = null;
      this.rescues--;
      this.rescue = null;
      this.log(`${p.name} · 获救，恢复30%血量`);
    }
  }
  step(dt, input = {}) {
    if (this.status !== "running") return;
    dt = Math.min(dt, 0.05);
    if (this.openingRemaining > 0) {
      this.real += dt;
      this.openingRemaining = Math.max(0, this.openingRemaining - dt);
      if (this.openingRemaining < 1e-8) {
        this.openingRemaining = 0;
        this.spawnOrbs();
      }
      if (input.dx || input.dy)
        this.move(
          this.player,
          unit(input.dx || 0, input.dy || 0),
          this.c.speed * dt,
        );
      if (input.attack) this.attack();
      this.effects = this.effects.filter(
        (effect) => this.real - effect.at < effect.duration,
      );
      return;
    }
    const wasForced = this.forced;
    this.real += dt;
    const next = this.a ? null : TIMELINE[this.next];
    this.speed = this.a ? 1 : this.c.idleSpeed;
    this.t += dt * this.speed;
    if (!this.a && next && this.t >= next.at) {
      this.begin(next);
      this.speed = 1;
      this.next++;
    }
    const controlsLocked = wasForced || this.forced || this.player.corrupted;
    if (this.player.hp && !controlsLocked) {
      if (this.a?.type === "illusion" && this.elapsed < this.c.aimDuration) {
        const angle =
          Math.atan2(this.aim.y, this.aim.x) +
          Math.max(-1, Math.min(1, input.dx || 0)) * this.c.aimTurnSpeed * dt;
        this.aim = { x: Math.cos(angle), y: Math.sin(angle) };
        this.player.face = { ...this.aim };
        this.move(
          this.player,
          this.aim,
          -Math.max(-1, Math.min(1, input.dy || 0)) * this.c.speed * dt,
        );
      } else if (input.dx || input.dy) {
        const dir = unit(input.dx || 0, input.dy || 0);
        this.player.face = dir;
        this.move(this.player, dir, this.c.speed * dt);
      }
    }
    this.updateAI(dt);
    this.updateMechanic(dt);
    if (this.status === "running") updateP2(this, dt);
    if (this.status !== "running") return;
    if (input.attack && !controlsLocked && !this.player.corrupted)
      this.attack();
    if (!controlsLocked && !this.finalShield)
      this.boss.hp = Math.max(1, this.boss.hp - dt * 80);
    this.recover(dt);
    this.shields = this.shields.filter((s) => s.until >= this.real);
    this.flashes = this.flashes.filter((f) => f.until > this.real);
    this.effects = this.effects.filter(
      (effect) => this.real - effect.at < effect.duration,
    );
    if (this.a && this.elapsed + 1e-8 >= this.a.duration) {
      this.a = null;
      this.balls = [];
      this.shields = [];
    }
    if (this.t >= P1_END) this.phase = 2;
    if (this.party.every((p) => !p.hp)) this.finish("wipe", "全员倒地。");
  }
  jump(index, { retry = false } = {}) {
    index = Math.max(0, Math.min(TIMELINE.length - 1, index));
    const event = TIMELINE[index];
    this.openingRemaining = 0;
    this.t = Math.max(0, event.at - 4);
    this.next = index;
    this.lastEvent = index;
    this.a = null;
    this.phase = event.at >= P1_END ? 2 : 1;
    resetP2(this);
    this.balls = [];
    this.shields = [];
    this.flashes = [];
    this.effects = [];
    this.aim = { x: 0, y: -1 };
    this.boss.x = this.boss.y = 0;
    this.syncBossHealth(event);
    for (const p of this.party) {
      p.parry = -999;
      p.parryFx = -999;
      p.layers = index === 0 ? 0 : event.at > 189 ? 2 : p.cap;
      if (retry) {
        p.hp = 100;
        p.deadReal = null;
      }
      const h = this.home(p);
      p.x = h.x;
      p.y = h.y;
    }
    if (event.type === "final") placeFinalPractice(this);
    this.orbs = [];
    if (index === 0) this.spawnOrbs();
    if (retry) {
      this.rescues = this.c.rescues;
      this.rescue = null;
      this.status = "running";
    }
    this.log(
      `进入${event.name} · ${retry ? "重试恢复血量" : "保留队员血量与救援，Boss血量按节点设置"}，初始化该轮入幻前置状态`,
    );
  }
}
