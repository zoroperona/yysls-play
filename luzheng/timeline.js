export const ENCOUNTER_DURATION = 342;

export const TIMELINE = [
  {
    at: 11,
    bossHpRatio: 0.96,
    id: "rage-lines",
    name: "怒斩",
    duration: 7,
    hint: "到左侧 1 号点红条集合，与 5 名 AI 一起按 E 卸势",
  },
  {
    at: 25,
    bossHpRatio: 0.93,
    id: "half-field",
    name: "半场金光",
    duration: 7,
    hint: "先躲第一侧，结算后跨到另一侧",
  },
  {
    at: 44,
    bossHpRatio: 0.85,
    id: "rally",
    name: "合力",
    duration: 19,
    hint: "并排红条选择靠 Boss 的一条卸势，再离开黄光集火战魂",
  },
  {
    at: 75,
    bossHpRatio: 0.79,
    id: "flying-knives",
    name: "全团红圈飞刀",
    duration: 10,
    hint: "Boss 留在左侧；离开脚下约 6 米金圈（圈内致死），连续卸势 8 次",
  },
  {
    at: 102,
    bossHpRatio: 0.72,
    id: "sword-qi",
    name: "剑气纵横",
    duration: 18,
    hint: "点名顺序随机；第六条黄线出现时巨剑劈落，避开中线，再引导六刀击碎巨剑",
  },
  {
    at: 138,
    bossHpRatio: 0.55,
    id: "in-out",
    name: "内外圈金光",
    duration: 7,
    hint: "先在外侧躲内圈，再进入内圈",
  },
  {
    at: 155,
    bossHpRatio: 0.5,
    id: "sweep",
    name: "横扫",
    duration: 16,
    hint: "4 圈卸势后锁定随剑旋转，连续点按 E；5 秒后其余人接飞刀，避开 Boss 脚下金圈",
  },
  {
    at: 190,
    bossHpRatio: 0.43,
    id: "half-field",
    name: "半场金光",
    duration: 7,
    hint: "根据先后顺序跨半场",
  },
  {
    at: 209,
    bossHpRatio: 0.37,
    id: "small-swords",
    name: "剑来",
    duration: 20,
    hint: "左右各 3 把小剑；最多允许漏 2 把，第 3 把超时团灭",
  },
  {
    at: 233,
    bossHpRatio: 0.34,
    id: "cleave",
    name: "力劈",
    duration: 9,
    hint: "选择红条，在靠近外场的一侧卸势",
  },
  {
    at: 277,
    bossHpRatio: 0.05,
    id: "rage-lines-slow",
    name: "怒斩 · 慢 DPS 追加",
    duration: 7,
    hint: "玩家必须参与六人卸势；本次怒斩结束 Boss 仍存活则 DPS 不足团灭",
  },
];

export const PRACTICE_OPTIONS = TIMELINE.filter(
  (event, index, list) =>
    list.findIndex((candidate) => candidate.id === event.id) === index,
);
