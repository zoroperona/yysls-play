export const SKILLS = {
  umbrella: {
    id: "umbrella",
    name: "红硝香断",
    alias: "完美伞",
    externalRatio: 1.8084,
    externalFlat: 500,
    elementalRatio: 2.7126,
    elementalFlat: 272,
    group: "umbrella",
    skillType: "martial",
    weaponType: "umbrella",
    source: "110阶表格",
  },
  echo: {
    id: "echo",
    name: "回响",
    alias: "伞共鸣 · 默认红硝×2",
    externalRatio: 0.54,
    externalFlat: 0,
    elementalRatio: 0.81,
    elementalFlat: 0,
    group: "echo",
    skillType: "martial",
    weaponType: "umbrella",
    source: "110阶表格共鸣行",
  },
  snap: {
    id: "snap",
    name: "焚巢捣穴",
    alias: "指响",
    externalRatio: 2.2987,
    externalFlat: 637,
    elementalRatio: 3.448,
    elementalFlat: 347,
    group: "snap",
    skillType: "martial",
    weaponType: "rope",
    source: "110阶表格",
  },
  xiaoAoe: {
    id: "xiaoAoe",
    name: "箫吟千浪",
    alias: "AOE",
    externalRatio: 3.9746,
    externalFlat: 1008,
    elementalRatio: 5.9619,
    elementalFlat: 0,
    group: "xiao",
    skillType: "qishu",
    weaponType: "qishu",
    source: "110阶表格",
  },
  xiaoMeteor: {
    id: "xiaoMeteor",
    name: "箫吟千浪",
    alias: "后续流星",
    externalRatio: 1.4904,
    externalFlat: 378,
    elementalRatio: 2.2356,
    elementalFlat: 0,
    group: "xiao",
    skillType: "qishu",
    weaponType: "qishu",
    source: "110阶表格",
  },
  tiangong: {
    id: "tiangong",
    name: "天工·焚烬",
    alias: "天工·火",
    externalRatio: 0.262,
    externalFlat: 0,
    elementalRatio: 0,
    elementalFlat: 0,
    group: "tiangong",
    skillType: "tiangong",
    weaponType: "tiangong",
    source: "现有模拟器数据",
  },
  linglong: {
    id: "linglong",
    name: "玲珑泡影",
    alias: "系数待校准",
    externalRatio: 0,
    externalFlat: 0,
    elementalRatio: 0,
    elementalFlat: 0,
    directDamage: 0,
    group: "linglong",
    skillType: "qishu",
    weaponType: "qishu",
    source: "待校准",
  },
};

export const SKILL_GROUPS = {
  umbrella: { label: "红硝香断", color: "#d66d53" },
  echo: { label: "回响", color: "#d99871" },
  snap: { label: "焚巢捣穴", color: "#c79b4a" },
  xiao: { label: "箫吟千浪", color: "#79a987" },
  tiangong: { label: "天工·焚烬", color: "#c76848" },
  linglong: { label: "玲珑泡影", color: "#8296b3" },
};

export const DEFAULT_STATE = {
  duration: 60,
  panel: {
    minAttack: 3600,
    maxAttack: 5200,
    critRate: 45,
    insightRate: 18,
    directCritRate: 4.6,
    directInsightRate: 0,
    nativeElementMin: 600,
    nativeElementMax: 1600,
    foreignElementMin: 0,
    foreignElementMax: 0,
    externalPenetration: 63.5,
    elementalPenetration: 30,
    umbrellaBonus: 8.52,
    allSkillBonus: 8.52,
    bossDamageBonus: 8.87,
    damageBonus: 32,
    precision: 92,
  },
  rotation: {
    umbrella: { normal: 50, stagger: 26 },
    echo: { normal: 100, stagger: 52 },
    snap: { normal: 3, stagger: 1 },
    xiaoAoe: { normal: 1, stagger: 0 },
    xiaoMeteor: { normal: 1, stagger: 4 },
    tiangong: { normal: 0, stagger: 0 },
    linglong: { normal: 0, stagger: 0 },
  },
  skillOverrides: Object.fromEntries(
    Object.entries(SKILLS).map(([key, skill]) => [key, {
      externalRatio: skill.externalRatio,
      externalFlat: skill.externalFlat,
      elementalRatio: skill.elementalRatio,
      elementalFlat: skill.elementalFlat,
      directDamage: skill.directDamage ?? 0,
    }]),
  ),
  effects: {
    lossSoul: {
      enabled: true,
      uptime: 100,
      damageBonus: 5,
      critDamageBonus: 27,
    },
  },
  model: {
    critMultiplier: 1.5,
    insightMultiplier: 1.35,
    staggerMultiplier: 1.35,
    calibration: 1,
  },
  season: {
    name: "杭州西 · 110阶",
    values: {
      maxAttack: 114.1,
      minAttack: 114.1,
      critRate: 0.7,
      insightRate: 0.5,
      directCritRate: 0,
      directInsightRate: 0,
      nativeElementMin: 68.5,
      nativeElementMax: 68.5,
      foreignElementMin: 68.5,
      foreignElementMax: 68.5,
      externalPenetration: 0,
      elementalPenetration: 0,
      umbrellaBonus: 0,
      allSkillBonus: 0,
      bossDamageBonus: 0,
      damageBonus: 0.8,
      precision: 0.7,
    },
  },
  affixes: [
    { id: "starter-max-attack", stat: "maxAttack", count: 1, value: 114.1 },
  ],
};

export const STAT_META = {
  maxAttack: { label: "最大外功", unit: "", decimals: 1 },
  minAttack: { label: "最小外功", unit: "", decimals: 1 },
  critRate: { label: "会心率", unit: "%", decimals: 2 },
  insightRate: { label: "会意率", unit: "%", decimals: 2 },
  directCritRate: { label: "直接会心率", unit: "%", decimals: 2 },
  directInsightRate: { label: "直接会意率", unit: "%", decimals: 2 },
  nativeElementMin: { label: "本属攻击下限", unit: "", decimals: 1 },
  nativeElementMax: { label: "本属攻击上限", unit: "", decimals: 1 },
  foreignElementMin: { label: "外属攻击下限", unit: "", decimals: 1 },
  foreignElementMax: { label: "外属攻击上限", unit: "", decimals: 1 },
  externalPenetration: { label: "外功穿透", unit: "", decimals: 2 },
  elementalPenetration: { label: "属攻穿透", unit: "", decimals: 2 },
  umbrellaBonus: { label: "伞武学增效", unit: "%", decimals: 2 },
  allSkillBonus: { label: "全武学增效", unit: "%", decimals: 2 },
  bossDamageBonus: { label: "对首领单位增伤", unit: "%", decimals: 2 },
  damageBonus: { label: "其他通用增伤", unit: "%", decimals: 2 },
  precision: { label: "精准率", unit: "%", decimals: 2 },
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

export function getOutcomeProbabilities(panel) {
  const precision = clamp(number(panel.precision) / 100, 0, 1);
  const critRate = clamp(
    Math.min(number(panel.critRate) / 100, 0.8) + number(panel.directCritRate) / 100,
    0,
    1,
  );
  const insight = clamp(
    Math.min(number(panel.insightRate) / 100, 0.4) + number(panel.directInsightRate) / 100,
    0,
    1,
  );
  const graze = (1 - precision) * (1 - insight);
  const crit = Math.min((1 - insight) * precision, precision * critRate);
  const normal = Math.max(0, 1 - insight - crit - graze);

  return { graze, normal, crit, insight };
}

export function applyAffixes(panel, affixes) {
  const adjusted = { ...panel };
  for (const affix of affixes) {
    if (!(affix.stat in adjusted)) continue;
    adjusted[affix.stat] = number(adjusted[affix.stat]) + number(affix.value) * Math.max(0, number(affix.count));
  }
  adjusted.minAttack = Math.min(adjusted.minAttack, adjusted.maxAttack);
  adjusted.nativeElementMin = Math.min(adjusted.nativeElementMin, adjusted.nativeElementMax);
  adjusted.foreignElementMin = Math.min(adjusted.foreignElementMin, adjusted.foreignElementMax);
  return adjusted;
}

function rangeValues(minimum, maximum) {
  const min = number(minimum);
  const max = Math.max(min, number(maximum));
  return { min, max, average: (min + max) / 2 };
}

function outcomeChannels(skill, panel, outcome, outcomeMultiplier) {
  const externalRange = rangeValues(panel.minAttack, panel.maxAttack);
  const nativeRange = rangeValues(panel.nativeElementMin, panel.nativeElementMax);
  const foreignRange = rangeValues(panel.foreignElementMin, panel.foreignElementMax);
  const attackKey = outcome === "graze" ? "min" : outcome === "insight" ? "max" : "average";
  const externalPenetration = 1 + number(panel.externalPenetration) / 200;
  const elementalPenetration = 1 + number(panel.elementalPenetration) / 200;

  return {
    external: (
      externalRange[attackKey] * skill.externalRatio + number(skill.externalFlat)
    ) * externalPenetration * outcomeMultiplier,
    nativeElement: (
      nativeRange[attackKey] * skill.elementalRatio + number(skill.elementalFlat)
    ) * elementalPenetration * outcomeMultiplier,
    foreignElement: (
      foreignRange[attackKey] * skill.externalRatio
    ) * elementalPenetration * outcomeMultiplier,
    direct: number(skill.directDamage),
  };
}

function skillBonusPercent(skill, panel) {
  let bonus = number(panel.damageBonus) + number(panel.bossDamageBonus);
  if (skill.skillType === "martial") bonus += number(panel.allSkillBonus);
  if (skill.weaponType === "umbrella") bonus += number(panel.umbrellaBonus);
  return bonus;
}

export function getExpectedSkillDamage(skill, panel, model, effects = {}) {
  const probabilities = getOutcomeProbabilities(panel);
  const lossSoul = effects.lossSoul ?? {};
  const lossSoulUptime = lossSoul.enabled ? clamp(number(lossSoul.uptime) / 100, 0, 1) : 0;
  const bonus = 1 + (
    skillBonusPercent(skill, panel) + number(lossSoul.damageBonus) * lossSoulUptime
  ) / 100;
  const critMultiplier = number(model.critMultiplier, 1.5)
    + number(lossSoul.critDamageBonus) / 100 * lossSoulUptime;

  const outcomeMultipliers = {
    graze: 1,
    normal: 1,
    crit: critMultiplier,
    insight: number(model.insightMultiplier, 1.35),
  };
  const channels = { external: 0, nativeElement: 0, foreignElement: 0, direct: 0 };
  const outcomes = {};

  for (const key of Object.keys(outcomeMultipliers)) {
    const outcome = outcomeChannels(skill, panel, key, outcomeMultipliers[key]);
    outcomes[key] = Object.values(outcome).reduce((sum, value) => sum + value, 0);
    for (const channel of Object.keys(channels)) {
      channels[channel] += outcome[channel] * probabilities[key] * bonus;
    }
  }

  const expected = Object.values(channels).reduce((sum, value) => sum + value, 0);
  return { expected, outcomes, probabilities, channels };
}

export function calculateBuild(state, panel = state.panel) {
  const duration = Math.max(1, number(state.duration, 60));
  const model = state.model;
  const stagger = Math.max(0, number(model.staggerMultiplier, 1.35));
  const calibration = Math.max(0, number(model.calibration, 1));
  const skillTotals = {};
  const groupTotals = {};
  const perCast = {};
  const channelTotals = { external: 0, nativeElement: 0, foreignElement: 0, direct: 0 };
  let rawNormalTotal = 0;
  let rawStaggerTotal = 0;

  for (const [skillId, baseSkill] of Object.entries(SKILLS)) {
    const skill = { ...baseSkill, ...state.skillOverrides?.[skillId] };
    const skillDamage = getExpectedSkillDamage(skill, panel, model, state.effects);
    const expected = skillDamage.expected;
    const rotation = state.rotation?.[skillId] ?? {};
    const normalDamage = expected * Math.max(0, number(rotation.normal));
    const staggerDamage = expected * Math.max(0, number(rotation.stagger)) * stagger;
    const totalDamage = (normalDamage + staggerDamage) * calibration;
    skillTotals[skillId] = totalDamage;
    groupTotals[skill.group] = (groupTotals[skill.group] ?? 0) + totalDamage;
    perCast[skillId] = expected * calibration;
    const weightedCasts = Math.max(0, number(rotation.normal))
      + Math.max(0, number(rotation.stagger)) * stagger;
    for (const channel of Object.keys(channelTotals)) {
      channelTotals[channel] += skillDamage.channels[channel] * weightedCasts * calibration;
    }
    rawNormalTotal += normalDamage;
    rawStaggerTotal += staggerDamage;
  }

  const rawTotal = rawNormalTotal + rawStaggerTotal;
  const total = rawTotal * calibration;
  const normalTotal = rawNormalTotal * calibration;
  const staggerTotal = rawStaggerTotal * calibration;

  return {
    panel,
    total,
    dps: total / duration,
    normalTotal,
    staggerTotal,
    skillTotals,
    groupTotals,
    perCast,
    channelTotals,
    probabilities: getOutcomeProbabilities(panel),
  };
}

export function calculateComparison(state) {
  const baseline = calculateBuild(state, state.panel);
  const adjustedPanel = applyAffixes(state.panel, state.affixes);
  const adjusted = calculateBuild(state, adjustedPanel);
  const gain = adjusted.dps - baseline.dps;
  const gainPercent = baseline.dps > 0 ? gain / baseline.dps * 100 : 0;
  return { baseline, adjusted, gain, gainPercent, adjustedPanel };
}

export function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}
