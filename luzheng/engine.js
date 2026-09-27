import { CONFIG } from "./config.js";
import {
  segmentDistance,
  hitsSword,
  sweepSlots,
  qiSource,
  cleaveX,
  inCleaveOuter,
  swordImpact,
  blocksBeforeSword,
} from "./geometry.js";
import { TIMELINE } from "./timeline.js";
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export class Game {
  constructor(settings = {}, practice = null) {
    this.c = { ...CONFIG, ...settings };
    this.practice = practice;
    this.t = practice ? Math.max(0, practice.at - 4) : 0;
    this.playerTeam = settings.playerTeam === 2 ? 2 : 1;
    this.party = Array.from({ length: 10 }, (_, i) => {
      const team =
          this.playerTeam === 1 ? (i < 5 ? 1 : 2) : i === 0 || i > 5 ? 2 : 1,
        healer =
          this.playerTeam === 1 ? i === 4 || i === 9 : i === 5 || i === 9;
      return {
        id: i,
        team,
        x: (team === 1 ? -1 : 1) * (70 + (i % 5) * 25),
        y: 100 + Math.floor(i / 5) * 40,
        hp: 100,
        healer,
        self: healer ? this.c.selfRevives : 0,
        deadAt: null,
        parry: -999,
      };
    });
    const names = [
      ["醉星入梦", "醉星入梦", "棠尸", "倾白", "醉星入梦"],
      ["醉星入梦", "衫上", "一夜飘零", "醉星入梦", "醉星入梦"],
    ];
    for (const team of [1, 2]) {
      const members = this.party.filter((p) => p.team === team);
      members.forEach((p, slot) => {
        p.slot = slot;
        p.name = p.id === 0 ? "玩家" : names[team - 1][slot];
        // 玩家在所选队伍第 1 格，两队第 5 格固定治疗。
        p.healer = slot === 4;
        p.self = p.healer ? this.c.selfRevives : 0;
      });
    }
    this.guards = this.party
      .filter((p) => p.team === 1)
      .slice(0, 4)
      .map((p) => p.id);
    this.bossBudgetDps =
      7 * this.c.aiDps +
      2 * this.c.healerDps +
      (this.c.attackDamage / this.c.attackInterval) * this.c.playerDamageBudget;
    const bossMax =
      this.c.bossHp ??
      Math.max(1, Math.round(this.bossBudgetDps * this.c.bossTargetDuration));
    this.boss = {
      id: "boss",
      x: 100,
      y: 0,
      hp: bossMax,
      max: bossMax,
    };
    if (practice) this.syncBossHealth(practice);
    this.adds = [];
    this.zones = [];
    this.logs = [];
    this.rescues = this.c.rescues;
    this.rescue = null;
    this.status = "running";
    this.queue = (
      practice
        ? this.c.continuousPractice
          ? TIMELINE.filter((e) => e.at >= practice.at)
          : [practice]
        : TIMELINE
    ).map((e) => ({ ...e }));
    this.a = null;
    this.target = "boss";
    this.lastAttack = -999;
    this.lastDodge = -999;
    this.dir = { x: 0, y: -1 };
    this.success = 0;
    this.mistakes = 0;
  }
  log(s) {
    this.logs.unshift({ t: this.t, s });
  }
  retryEvent() {
    const event = this.a || [...this.queue].reverse().find((e) => e.started) ||
      this.jumpTarget || this.practice;
    return event ? TIMELINE.find((e) => e.at === event.at && e.id === event.id) : null;
  }
  jumpTo(event) {
    if (this.status !== "running") return false;
    this.log("跳转至 " + event.name + "（保留血量与救援次数）");
    this.practice = null;
    this.jumpTarget = event;
    this.t = Math.max(0, event.at - 4);
    this.syncBossHealth(event);
    this.log(
      "跳转血量校准：陆狰 " +
        Math.round(this.boss.hp) +
        "/" +
        this.boss.max +
        "（视频机制节点约 " +
        Math.round(event.bossHpRatio * 100) +
        "%）",
    );
    this.queue = TIMELINE.filter((e) => e.at >= event.at).map((e) => ({
      ...e,
    }));
    this.a = null;
    this.adds = [];
    this.zones = [];
    this.effects = [];
    this.goldFeedback = null;
    this.divided = false;
    this.boss.x = 100;
    this.target = "boss";
    for (const p of this.party) {
      p.parry = -999;
      p.swordSide = null;
    }
    return true;
  }
  syncBossHealth(event) {
    this.boss.hp = Math.max(
      1,
      Math.round(this.boss.max * (event?.bossHpRatio ?? 1)),
    );
  }
  bossDamageScale() {
    return this.c.calibrateFinalDps && this.a?.id === "rage-lines-slow"
      ? Math.max(
          1,
          (this.boss.max * this.a.bossHpRatio) /
            Math.max(1, this.bossBudgetDps * this.a.duration),
        )
      : 1;
  }
  damage(p, n, why) {
    if (p.hp <= 0) return;
    p.hp = Math.max(0, p.hp - n);
    if (!p.id) this.mistakes++;
    this.log(
      p.name + " · " + why + "：受到 " + n + " 伤害，剩余 " + Math.ceil(p.hp),
    );
    if (!p.hp) {
      p.deadAt = this.t;
      p.deadReal = this.real || 0;
      this.log((p.id ? "队友 " + p.id : "你") + " 倒地");
    }
  }
  finish(s, msg) {
    if (this.status === "running") {
      this.status = s;
      this.endReason = msg;
      if (s === "wipe") {
        for (const p of this.party) {
          p.hp = 0;
          p.deadAt = this.t;
        }
        this.rescue = null;
      }
      this.log(msg);
    }
  }
  move(p, dx, dy, dt) {
    if (!p.hp) return;
    if (
      this.a?.id === "sweep" &&
      this.a.guardedAll &&
      this.guards.includes(p.id) &&
      this.t - this.a.at < 15
    )
      return;
    let n = Math.hypot(dx, dy);
    if (!n) return;
    p.x += (dx / n) * this.c.speed * dt;
    p.y += (dy / n) * this.c.speed * dt;
    n = Math.hypot(p.x, p.y);
    if (n > 285) {
      p.x *= 285 / n;
      p.y *= 285 / n;
    }
    if (this.divided)
      p.x = p.team === 1 ? Math.min(-50, p.x) : Math.max(50, p.x);
    if (
      this.a?.id === "sword-qi" &&
      this.a.done.has("slam") &&
      this.a.qiHits < 6
    ) {
      const side = p.swordSide || (p.team === 1 ? -1 : 1);
      p.x = side < 0 ? Math.min(-51, p.x) : Math.max(51, p.x);
    }
  }
  input(k) {
    const p = this.party[0];
    if (this.status !== "running" || !p.hp) return;
    if (k === "e") {
      p.parry = this.t;
      p.parryFx = this.real || 0;
      const a = this.a;
      if (
        a?.id === "sweep" &&
        a.slot >= 0 &&
        a.guarded &&
        this.t - a.at >= 3 &&
        this.t - a.at < 15 &&
        dist(p, sweepSlots(this.t - a.at)[a.slot]) < 23
      ) {
        a.pushes++;
        a.lastPushTap = this.real || 0;
      }
    }
    if (k === "shift" && (this.real || 0) - this.lastDodge > 1.2) {
      this.move(p, this.dir.x, this.dir.y, 95 / this.c.speed);
      this.lastDodge = this.real || 0;
    }
    if (
      k === "1" &&
      (this.real || 0) - this.lastAttack >= this.c.attackInterval
    ) {
      const q = [this.boss, ...this.adds].find(
        (q) => q.id === this.target && q.hp > 0 && !q.expired,
      );
      if (q && this.canAttack(p, q) && dist(p, q) < this.c.attackRange) {
        q.hp = Math.max(
          0,
          q.hp -
            this.c.attackDamage *
              (q.id === "boss" ? this.bossDamageScale() : 1),
        );
        this.lastAttack = this.real || 0;
        this.effects ??= [];
        this.effects.push({
          kind: "attack",
          origin: { x: p.x, y: p.y },
          end: { x: q.x, y: q.y },
          at: this.real || 0,
          duration: 0.28,
        });
      }
    }
  }
  recover(dt) {
    const now = this.real || 0;
    const revived = new Set();
    for (const p of this.party)
      if (
        !p.hp &&
        p.healer &&
        p.self > 0 &&
        now - p.deadReal >= this.c.selfDelay
      ) {
        p.self--;
        p.hp = this.c.rescueHp;
        revived.add(p.id);
        this.log(p.name + " 自活，血量 " + this.c.rescueHp + "%");
      }
    const hs = this.party.filter((p) => p.hp > 0 && p.healer);
    if (this.rescue) {
      const r = this.rescue;
      if (this.party[r.target].hp > 0 || !this.party[r.healer].hp)
        this.rescue = null;
      else if (now >= r.end) {
        this.party[r.target].hp = this.c.rescueHp;
        revived.add(r.target);
        this.rescues--;
        this.log(
          "救起 " +
            this.party[r.target].name +
            "，血量 " +
            this.c.rescueHp +
            "%",
        );
        this.rescue = null;
      }
    }
    if (!this.rescue && this.rescues > 0 && hs.length) {
      const p = this.party.find((p) => !p.hp && !(p.healer && p.self > 0));
      if (p)
        this.rescue = {
          target: p.id,
          healer: hs[0].id,
          end: now + this.c.rescueTime,
        };
    }
    for (const h of hs)
      if (this.rescue?.healer !== h.id) {
        const p = this.party
          .filter((p) => p.hp > 0 && p.hp < 100 && !revived.has(p.id))
          .sort((a, b) => a.hp - b.hp)[0];
        if (p) p.hp = Math.min(100, p.hp + this.c.healPerSecond * dt);
      }
    if (!this.party.some((p) => p.hp > 0 || (p.healer && p.self > 0)))
      this.finish("wipe", "全员倒地，无法复活");
  }
  destination(p) {
    let a = this.a,
      t = a ? this.t - a.at : 0;
    if (!a && this.divided)
      return { x: p.team === 1 ? -170 : 170, y: (p.slot - 2) * 45 };
    if (!a)
      return {
        x: this.boss.x + ((p.id % 3) - 1) * 30,
        y: 75 + Math.floor(p.id / 3) * 25,
      };
    if (a.id.startsWith("rage-lines"))
      return { x: -36 + (p.id % 2 ? -12 : 12), y: (p.id - 5) * 25 };
    if (a.id === "half-field")
      return { x: t < 3.2 ? 75 : -75, y: (p.id - 5) * 25 };
    if (a.id === "in-out") return { x: t < 3.2 ? 230 : 60, y: (p.id - 5) * 10 };
    if (a.id === "rally") {
      if (t < 3) return { x: 36, y: (p.id - 5) * 25 };
      // 绕战魂站成弧形，留出中心与头顶标识，仍在安全区和攻击距离内。
      const angle = -Math.PI / 2 + ((p.id - 1) / 8) * Math.PI;
      return { x: -215 + Math.cos(angle) * 85, y: Math.sin(angle) * 100 };
    }
    if (a.id === "sweep") {
      const slot = this.guards.indexOf(p.id);
      const knifeIndex = this.party
        .filter((q) => !this.guards.includes(q.id))
        .findIndex((q) => q.id === p.id);
      const angle = ((-170 + knifeIndex * 30) * Math.PI) / 180;
      return slot >= 0
        ? sweepSlots(t)[slot]
        : {
            x: this.boss.x + 125 * Math.cos(angle),
            y: this.boss.y + 125 * Math.sin(angle),
          };
    }
    if (a.id === "sword-qi") {
      const mark = a.marks?.find((m) => m.target === p.id),
        index = a.targetOrder?.indexOf(p.id) ?? -1,
        s = index >= 0 ? qiSource(index) : null;
      // 落剑前预先站到正确侧；未点名和已出刀的人远离弹道，不横穿巨剑。
      if (s)
        return {
          x: -Math.sign(s.x) * 180,
          y:
            Math.sign(s.x) *
            (120 + Math.floor(index / 2) * 22 + (mark && !mark.fired ? 0 : 30)),
        };
      return { x: (Math.sign(p.x) || 1) * 150, y: -180 - (p.id % 3) * 25 };
    }
    if (a.id === "flying-knives")
      return {
        x:
          this.boss.x +
          145 * Math.cos(-Math.PI / 2 + ((p.id - 1) * Math.PI) / 8),
        y:
          this.boss.y +
          145 * Math.sin(-Math.PI / 2 + ((p.id - 1) * Math.PI) / 8),
      };
    if (a.id === "cleave") {
      const y = (p.slot - 2) * 45;
      return { x: cleaveX(p.team, y), y };
    }
    if (a.id === "small-swords")
      return (
        this.adds.find(
          (s) =>
            s.hp > 0 &&
            !s.expired &&
            Math.sign(s.x) === (p.team === 1 ? -1 : 1),
        ) || { x: p.team === 1 ? -160 : 160, y: 0 }
      );
    return { x: -75, y: (p.id - 5) * 24 };
  }
  canAttack(p, target) {
    return (
      !this.divided ||
      (target.id !== "boss" && Math.sign(target.x) === (p.team === 1 ? -1 : 1))
    );
  }
  cleaveParticipants(team) {
    return this.party
      .filter((p) => p.id !== 0 && p.team === team)
      .slice(0, team === this.playerTeam ? 2 : 3);
  }
  ai(dt) {
    for (const p of this.party.slice(1))
      if (p.hp) {
        const q = this.destination(p);
        if (dist(p, q) > 5) this.move(p, q.x - p.x, q.y - p.y, dt);
        if (this.a?.id === "cleave") {
          if (
            this.cleaveParticipants(p.team).includes(p) &&
            this.t - this.a.at >= this.c.cleaveImpactAt - 0.2 &&
            this.t - this.a.at <= this.c.cleaveImpactAt + 0.05
          )
            p.parry = this.t;
        } else if (
          !this.a?.id.startsWith("rage-lines") ||
          (p.id <= 5 &&
            this.t - this.a.at >= this.c.rageImpactAt &&
            this.t - this.a.at <= this.c.rageImpactAt + this.c.rageParryLate)
        )
          p.parry = this.t;
        if (this.rescue?.healer === p.id) continue;
        const target =
          this.adds
            .filter(
              (s) =>
                s.hp > 0 &&
                !s.expired &&
                this.canAttack(p, s) &&
                dist(p, s) < this.c.attackRange,
            )
            .sort((a, b) =>
              this.a?.id === "small-swords"
                ? a.deadline - b.deadline
                : dist(p, a) - dist(p, b),
            )[0] || this.boss;
        if (this.canAttack(p, target) && dist(p, target) < this.c.attackRange)
          target.hp = Math.max(
            0,
            target.hp -
              (p.healer ? this.c.healerDps : this.c.aiDps) *
                dt *
                (target.id === "boss" ? this.bossDamageScale() : 1) *
                (this.a?.id === "small-swords"
                  ? this.c.aiSwordDamageMultiplier
                  : 1),
          );
      }
  }
  once(key, t, fn) {
    if (this.t - this.a.at >= t && !this.a.done.has(key)) {
      this.a.done.add(key);
      fn();
    }
  }
  check(p, space) {
    const ok = p.hp > 0 && space && this.t - p.parry <= 0.34;
    if (ok) {
      p.parryFx = this.real || 0;
      if (!p.id) this.success++;
    } else this.damage(p, this.c.knifeDamage, "卸势失败或站位错误");
    return ok;
  }
  zone(shape, props) {
    this.zones.push({ shape, ...props });
  }
  rect(x, y, w, h, color, label = "") {
    this.zone("rect", { x, y, w, h, color, label });
  }
  circle(x, y, r, color, label = "") {
    this.zone("circle", { x, y, r, color, label });
  }
  knives(p) {
    this.check(
      p,
      dist(p, this.boss) >
        this.c.knifeGoldRadiusMeters * this.c.arenaUnitsPerMeter,
    );
    const origin = { x: this.boss.x, y: this.boss.y },
      d = dist(origin, p) || 1,
      end = {
        x: origin.x + ((p.x - origin.x) * 650) / d,
        y: origin.y + ((p.y - origin.y) * 650) / d,
      };
    this.a.rays ??= [];
    this.a.rays.push({ origin, end, until: this.t + 0.3 });
    this.effects ??= [];
    this.effects.push({
      kind: "knife",
      origin,
      end,
      at: this.real || 0,
      duration: 0.45,
    });
    for (const q of this.party)
      if (q !== p && q.hp && segmentDistance(q, origin, end) < 18)
        this.damage(q, this.c.knifeDamage, "飞刀弹道刮到队友");
  }
  mechanic() {
    const a = this.a,
      t = this.t - a.at,
      p = this.party[0];
    this.zones = [];
    if (a.id.startsWith("rage-lines")) {
      const impactAt = this.c.rageImpactAt;
      if (t < impactAt + 0.35)
        [-36, 36].forEach((x) => {
          this.rect(
            x - 30,
            -265,
            60,
            530,
            "red",
            t < impactAt
              ? "落击 " + (impactAt - t).toFixed(1) + "s"
              : "落击 · E 卸势",
          );
          const zone = this.zones[this.zones.length - 1];
          zone.impact = t >= impactAt;
          zone.progress = Math.min(1, t / impactAt);
        });
      this.once("impact", impactAt, () => this.log("怒斩红条落击 · 此刻卸势"));
      this.once("hit", impactAt + this.c.rageParryLate, () => {
        const valid = (q) => Math.abs(q.x + 36) <= 30 && Math.abs(q.y) <= 265;
        const parried = (q) =>
          q.hp > 0 &&
          valid(q) &&
          q.parry >= a.at + impactAt - this.c.rageParryEarly &&
          q.parry <= a.at + impactAt + this.c.rageParryLate;
        const participants = this.party.slice(1, 6).filter(parried);
        for (const q of participants) q.parryFx = this.real || 0;
        const ok = parried(p);
        if (ok) {
          this.success++;
          p.parryFx = this.real || 0;
        }
        a.parryCount = participants.length + Number(ok);
        this.log(
          "怒斩卸势：" +
            a.parryCount +
            "/6 人，你" +
            (ok ? "已卸势" : "未成功卸势"),
        );
        if (!ok || a.parryCount < 6)
          this.finish(
            "wipe",
            "怒斩：" +
              a.parryCount +
              "/6 人卸势，" +
              (ok ? "人数不足" : "你未成功卸势"),
          );
      });
    }
    if (a.id === "half-field" || a.id === "in-out") {
      const half = a.id === "half-field";
      const firstHit = 3.2,
        secondHit = 6;
      const firstPhase = t < firstHit;
      const impactAt = firstPhase ? firstHit : secondHit;
      const label =
        (firstPhase ? "第一击" : "第二击") +
        " · " +
        Math.max(0, impactAt - t).toFixed(1) +
        " 秒";
      if (half && t < secondHit)
        this.rect(
          firstPhase ? -300 : 0,
          -300,
          300,
          600,
          "gold",
          label + (firstPhase ? " · 左半场" : " · 右半场"),
        );
      else if (!half && t < secondHit)
        this.zone(firstPhase ? "circle" : "ring", {
          x: 0,
          y: 0,
          r: firstPhase ? 165 : 300,
          inner: 165,
          color: "gold",
          label: label + (firstPhase ? " · 内圈" : " · 外圈"),
        });
      [firstHit, secondHit].forEach((at, i) => {
        // 落击闪光与伤害使用同一时刻、同一区域；不继续显示已结算的预警。
        if (t >= at && t < at + 0.3) {
          if (half)
            this.zone("rect", {
              x: i === 0 ? -300 : 0,
              y: -300,
              w: 300,
              h: 600,
              color: "gold",
              impact: true,
              label: "第" + (i + 1) + "击 · 落击",
            });
          else
            this.zone(i === 0 ? "circle" : "ring", {
              x: 0,
              y: 0,
              r: i === 0 ? 165 : 300,
              inner: 165,
              color: "gold",
              impact: true,
              label: "第" + (i + 1) + "击 · 落击",
            });
        }
        this.once("hit" + i, at, () => {
          const playerFirst = half ? p.x < 0 : Math.hypot(p.x, p.y) < 165;
          const hit = i === 0 ? playerFirst : !playerFirst;
          this.goldFeedback = {
            at: this.real || 0,
            text:
              a.name +
              "第" +
              (i + 1) +
              "击：" +
              (!p.hp ? "已倒地" : hit ? "命中 −" + this.c.aoeDamage : "已躲开"),
          };
          this.log(
            this.goldFeedback.text +
              "，站位 " +
              (half
                ? playerFirst
                  ? "左半场"
                  : "右半场"
                : playerFirst
                  ? "内圈"
                  : "外圈") +
              "（" +
              Math.round(p.x) +
              ", " +
              Math.round(p.y) +
              "）",
          );
          for (const q of this.party) {
            const first = half ? q.x < 0 : Math.hypot(q.x, q.y) < 165;
            if (i === 0 ? first : !first)
              this.damage(q, this.c.aoeDamage, a.name + "第" + (i + 1) + "击");
          }
        });
      });
    }
    if (a.id === "rally") {
      if (t < 3) {
        for (const x of [-36, 36]) {
          this.rect(
            x - 30,
            -265,
            60,
            530,
            "red",
            x > 0 ? "Boss 侧 · 卸势" : "远离 Boss 侧",
          );
          const zone = this.zones[this.zones.length - 1];
          zone.progress = Math.min(1, t / 2.8);
          zone.impact = t >= 2.8;
        }
      } else if (t < 10)
        this.rect(-35, -300, 335, 600, "gold", "退出黄光 · 打战魂");
      this.once("guard", 2.8, () => {
        for (const q of this.party) {
          const ok = this.check(
            q,
            Math.abs(q.x - 36) <= 30 && Math.abs(q.y) <= 265,
          );
          if (!q.id) this.log("合力：Boss 侧红条卸势" + (ok ? "成功" : "失败"));
        }
      });
      this.once("light", 5, () => {
        for (const q of this.party)
          if (q.x > -35) this.damage(q, 100, "合力金光（伤害暂定）");
      });
      this.once("jump", 10, () => {
        this.boss.x = -215 + this.c.soulBossOffset;
        this.log("卸势后约 7 秒，Boss 跳向战魂");
      });
      this.once("end", this.c.soulResolveAt, () => {
        if (this.adds[0].hp > 0) this.finish("wipe", "合力：战魂未及时击杀");
      });
    }
    if (a.id === "sweep" || a.id === "flying-knives") {
      const sweep = a.id === "sweep";
      const goldRadius =
        this.c.knifeGoldRadiusMeters * this.c.arenaUnitsPerMeter;
      {
        this.circle(
          this.boss.x,
          this.boss.y,
          goldRadius,
          "gold",
          "约 " +
            this.c.knifeGoldRadiusMeters +
            " 米金圈 · " +
            (t < 3 ? "即将生效，请离开" : "圈内致死"),
        );
        if (t >= 3)
          for (const q of this.party)
            if (q.hp && dist(q, this.boss) <= goldRadius)
              this.damage(q, 100, "全团飞刀：站在 Boss 金圈内");
      }
      const slots = sweepSlots(t);
      if (sweep) {
        const tip = { x: slots[0].x * 1.15, y: slots[0].y * 1.15 };
        this.zone("line", {
          origin: { x: 0, y: 0 },
          end: tip,
          color: "gold",
          label: "旋转巨剑",
        });
        if (a.guardedAll && t < 15) {
          this.guards.forEach((id, i) => {
            const q = this.party[id];
            if (q.hp) {
              q.x = slots[i].x;
              q.y = slots[i].y;
            }
          });
          for (const q of this.party)
            if (
              q.hp &&
              !this.guards.includes(q.id) &&
              segmentDistance(q, { x: 0, y: 0 }, tip) < 18
            )
              this.damage(q, 100, "被旋转巨剑扫中");
          for (let tick = 4; tick < 15; tick++)
            this.once("push-tick" + tick, tick, () => {
              if (
                a.guarded &&
                p.hp &&
                (this.real || 0) - a.lastPushTap > this.c.pushTapGrace
              )
                this.damage(p, this.c.pushMissDamage, "推剑未持续点按 E");
            });
        }
        slots.forEach((s, i) =>
          this.circle(s.x, s.y, 23, "green", "挡剑 " + (i + 1)),
        );
      }
      for (const q of this.party)
        if (q.hp && (!sweep || !this.guards.includes(q.id)))
          this.circle(q.x, q.y, 24, "red");
      this.once("assign", 2.9, () => {
        a.slot =
          sweep && this.playerTeam === 1
            ? slots.findIndex((s) => dist(p, s) < 23)
            : -1;
        a.pushes = 0;
        if (sweep && this.playerTeam === 1 && a.slot >= 0) {
          const original = this.guards.indexOf(0);
          [this.guards[original], this.guards[a.slot]] = [
            this.guards[a.slot],
            this.guards[original],
          ];
        }
        this.log(
          a.slot >= 0
            ? "你负责挡剑圈 " + (a.slot + 1)
            : "你处理飞刀：约挡剑后 5 秒开始，避开 6 点推剑队友",
        );
      });
      if (sweep)
        this.once("guard", 3, () => {
          slots.forEach((s, j) => {
            const q = this.party[this.guards[j]],
              ok = this.check(q, dist(q, s) < 23);
            if (q.id === 0) a.guarded = ok;
            if (!ok) a.missed++;
          });
          if (a.missed) this.finish("wipe", "横扫：有绿圈未成功卸势");
          else {
            a.guardedAll = true;
            a.lastPushTap = this.real || 0;
            if (a.slot >= 0)
              this.log("挡剑成功：锁定位置随剑旋转，连续点按 E（长按无效）");
          }
        });
      for (let i = 0; i < 8; i++)
        this.once("beat" + i, (sweep ? 8 : 3) + i * 0.85, () => {
          if (this.status !== "running") return;
          a.beats = i + 1;
          if (sweep) {
            for (const q of this.party)
              if (q.hp && !this.guards.includes(q.id)) this.knives(q);
          } else
            for (const q of this.party)
              if (q.hp) {
                this.effects ??= [];
                this.effects.push({
                  kind: "knife",
                  origin: { x: this.boss.x, y: this.boss.y },
                  end: { x: q.x, y: q.y },
                  at: this.real || 0,
                  duration: 0.45,
                });
                this.check(q, dist(q, this.boss) > goldRadius);
              }
        });
      if (sweep)
        this.once("sweep", 15, () => {
          this.log("推剑结束，解除位置锁定");
        });
    }
    if (a.id === "sword-qi") {
      a.marks ??= [];
      a.qiHits ??= 0;
      if (!a.targetOrder) {
        a.targetOrder = this.party.slice(0, 6).map((q) => q.id);
        const random = this.c.random || Math.random;
        for (let i = a.targetOrder.length - 1; i > 0; i--) {
          const j = Math.floor(random() * (i + 1));
          [a.targetOrder[i], a.targetOrder[j]] = [
            a.targetOrder[j],
            a.targetOrder[i],
          ];
        }
      }
      const slamAt = 5 * this.c.qiMarkInterval;
      if (a.qiHits < 6) {
        this.rect(
          -38,
          -280,
          76,
          560,
          "gold",
          t < slamAt ? "巨剑蓄力 · 12 点 → 6 点" : "巨剑已落 · 引导剑气击碎",
        );
        if (t >= slamAt && t < slamAt + 0.3)
          this.zones[this.zones.length - 1].impact = true;
        this.zone("charge", {
          x: -38,
          y: -280,
          w: 76,
          h: 560 * Math.min(1, t / slamAt),
          color: "gold",
          label: "",
        });
      }
      for (let i = 0; i < 6; i++) {
        const source = qiSource(i),
          target = this.party[a.targetOrder[i]],
          start = i * this.c.qiMarkInterval,
          fireAt = this.c.qiFirstKnifeAt + i * this.c.qiKnifeInterval;
        this.once("mark" + i, start, () => {
          a.marks.push({ target: target.id, source, fired: false });
          this.log(
            "点名 " +
              (i + 1) +
              "：" +
              (target.id ? target.name : "你") +
              "，起点 " +
              (source.x < 0 ? "9" : "3") +
              " 点，跑到对面",
          );
        });
        if (t >= start && t < fireAt)
          this.zone("line", {
            origin: source,
            end: { x: target.x, y: target.y },
            color: "gold",
            label:
              "第 " + (i + 1) + " 刀 → " + (target.id ? target.name : "你"),
          });
        this.once("qi" + i, fireAt, () => {
          if (this.status !== "running") return;
          const mark = a.marks.find((m) => m.target === target.id);
          if (mark) mark.fired = true;
          this.effects ??= [];
          const knife = {
            kind: "knife",
            origin: source,
            end: { x: target.x, y: target.y },
            at: this.real || 0,
            duration: 0.6,
          };
          this.effects.push(knife);
          const impact = swordImpact(source, target);
          const blocker =
            impact &&
            this.party.find(
              (q) =>
                q !== target &&
                q.hp > 0 &&
                blocksBeforeSword(q, source, impact),
            );
          if (!target.hp || !impact || blocker) {
            a.failed = true;
            this.log(
              "第 " +
                (i + 1) +
                " 刀未撞中巨剑" +
                (!target.hp
                  ? "（点名者已倒地）"
                  : blocker
                    ? "（巨剑前被 " + blocker.name + " 挡住）"
                    : "（弹道未穿过巨剑）"),
            );
            return;
          }
          mark.impact = impact;
          mark.impactAt = fireAt + 0.35;
          knife.end = mark.impact;
          knife.duration = 0.35;
        });
        const mark = a.marks.find((m) => m.target === target.id);
        if (mark?.impact)
          this.once("qi-impact" + i, mark.impactAt, () => {
            a.qiHits++;
            this.effects.push({
              kind: "sword-hit",
              origin: mark.impact,
              end: mark.impact,
              at: this.real || 0,
              duration: 0.55,
              count: a.qiHits,
            });
            this.log("第 " + (i + 1) + " 刀命中巨剑，累计 " + a.qiHits + "/6");
            if (a.qiHits === 6) {
              this.log("六刀全部命中，巨剑破碎");
              this.effects.push({
                kind: "sword-break",
                origin: { x: 0, y: 0 },
                end: { x: 0, y: 0 },
                at: this.real || 0,
                duration: 1,
              });
            }
          });
      }
      this.once("slam", slamAt, () => {
        this.log("第六条点名黄线出现，巨剑劈落");
        for (const q of this.party) {
          q.swordSide = Math.sign(q.x) || (q.team === 1 ? -1 : 1);
          if (Math.abs(q.x) <= 38 && Math.abs(q.y) <= 280)
            this.damage(q, 100, "巨剑劈落");
        }
      });
      this.once("resolve", this.c.qiResolveAt, () => {
        if (a.qiHits < 6)
          this.finish("wipe", "巨剑未碎：只有 " + a.qiHits + "/6 刀命中");
      });
    }
    if (a.id === "small-swords") {
      for (let i = 0; i < 6; i++)
        this.once("spawn" + i, Math.floor(i / 2) * 3, () =>
          this.adds.push({
            id: "sword" + i,
            name: "小剑 " + (i + 1),
            x: i % 2 ? 175 : -175,
            y: (Math.floor(i / 2) - 1) * 110,
            hp: this.c.swordHp,
            max: this.c.swordHp,
            deadline: this.t + this.c.swordLifetime,
          }),
        );
      for (const s of this.adds)
        if (s.hp > 0 && !s.expired && this.t >= s.deadline) {
          s.expired = true;
          a.missed++;
          this.log(s.name + " 超时，已漏 " + a.missed + " 把");
        }
      if (a.missed > this.c.allowedSwordMisses)
        this.finish("wipe", "剑来漏掉超过两把小剑");
    }
    if (a.id === "cleave") {
      const impactAt = this.c.cleaveImpactAt;
      a.resolveAt = a.at + impactAt;
      if (t < impactAt + 0.35)
        for (const team of [1, 2])
          for (const outer of [false, true])
            this.zone("polygon", {
              points: [
                { x: cleaveX(team, -210, outer) - 25, y: -210 },
                { x: cleaveX(team, -210, outer) + 25, y: -210 },
                { x: cleaveX(team, 210, outer) + 25, y: 210 },
                { x: cleaveX(team, 210, outer) - 25, y: 210 },
              ],
              color: "red",
              progress: Math.min(1, t / impactAt),
              impact: t >= impactAt,
              label:
                (outer ? "外条 · 三人卸势 " : "内条 ") +
                Math.min(100, Math.floor((t / impactAt) * 100)) +
                "%",
              labelX: cleaveX(team, 0, outer),
              labelY: outer ? -30 : 30,
            });
      this.once("hit", impactAt, () => {
        const counts = [1, 2].map((team) => {
          const candidates = [...this.cleaveParticipants(team)];
          if (team === this.playerTeam) candidates.push(p);
          return candidates.filter((q) => this.check(q, inCleaveOuter(q)))
            .length;
        });
        this.log(
          "力劈卸势：1 队 " + counts[0] + "/3，2 队 " + counts[1] + "/3",
        );
        if (counts.some((n) => n < 3))
          this.finish(
            "wipe",
            "力劈：每侧须三人外条卸势，你这侧仅两名 AI，玩家必须参与",
          );
      });
    }
    if (t >= a.duration) {
      if (a.id === "rage-lines-slow" && this.boss.hp > 0) {
        this.finish("wipe", "DPS 不足：第二轮怒斩结束，陆狰仍存活");
        return;
      }
      if (a.id === "cleave" && this.status === "running") {
        this.divided = false;
        this.boss.hp = Math.min(this.boss.hp, Math.round(this.boss.max * this.c.cleaveEndBossRatio));
        this.log("力劈完成：Boss 血量降至 " + (this.boss.hp / this.boss.max * 100).toFixed(1) + "%，继续输出击杀");
      }
      this.a = null;
      this.zones = [];
      if (a.id !== "rally" && a.id !== "flying-knives") this.boss.x = 100;
      if (this.practice && !this.c.continuousPractice)
        this.finish("complete", "本次机制演练结束");
    }
  }
  step(dt, input = {}) {
    if (this.status !== "running") return;
    this.real = (this.real || 0) + dt;
    this.effects = (this.effects || []).filter(
      (e) => this.real - e.at < e.duration,
    );
    const next = this.queue.find((e) => !e.started);
    const idleSpeed = input.fastForward ? 3 : this.c.idleSpeed;
    this.t += this.a
      ? dt
      : Math.min(
          dt * idleSpeed,
          next ? Math.max(0, next.at - this.t) : dt * idleSpeed,
        );
    if (input.dx || input.dy) {
      this.dir = { x: input.dx, y: input.dy };
      this.move(this.party[0], input.dx || 0, input.dy || 0, dt);
    }
    if (input.attack) this.input("1");
    for (const e of this.queue)
      if (!e.started && this.t >= e.at) {
        e.started = true;
        if (this.c.syncBossAtMechanics && this.boss.hp > 0) {
          const before = this.boss.hp;
          this.boss.hp = Math.min(
            before,
            Math.round(this.boss.max * e.bossHpRatio),
          );
          this.log(
            e.name +
              "：录像血量节点 " +
              Math.round(e.bossHpRatio * 100) +
              "%，同步至 " +
              ((this.boss.hp / this.boss.max) * 100).toFixed(1) +
              "%（不补血）",
          );
        }
        this.jumpTarget = null;
        this.a = { ...e, done: new Set(), slot: -1, beats: 0, missed: 0 };
        if (e.id === "rage-lines-slow" && this.c.calibrateFinalDps)
          this.log(
            "最终 DPS 检查：Boss 受伤倍率 " +
              this.bossDamageScale().toFixed(2) +
              "，按 7 秒及玩家 80% 输出预算校准",
          );
        this.adds = [];
        this.boss.x =
          e.id === "flying-knives"
            ? -215 + this.c.soulBossOffset
            : e.id === "sweep"
              ? 155
              : 100;
        if (e.id === "small-swords" || e.id === "cleave") {
          this.divided = true;
          for (const p of this.party) {
            p.x = (p.team === 1 ? -1 : 1) * Math.max(50, Math.abs(p.x));
          }
        }
        if (e.id === "rally")
          this.adds = [
            {
              id: "soul",
              name: "战魂",
              x: -215,
              y: 0,
              hp: this.c.soulHp,
              max: this.c.soulHp,
              deadline: e.at + this.c.soulResolveAt,
            },
          ];
        this.log(e.name + "：" + e.hint);
      }
    this.ai(dt);
    if (this.a) this.mechanic();
    if (this.status !== "running") return;
    this.recover(dt);
    if (this.boss.hp <= 0) this.finish("victory", "陆狰已击败");
    if ((!this.practice || this.c.continuousPractice) && this.t >= 360)
      this.finish("complete", "已到观测轴末尾；后续待补充");
  }
}
