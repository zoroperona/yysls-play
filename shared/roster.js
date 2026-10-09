// Shared five/ten-player roster; player ID is always 0, party slots stay stable.
export function createRoster(playerTeam = 1, selfRevives = Infinity, { size = 10 } = {}) {
  if (size !== 5 && size !== 10) throw new RangeError("阵容仅支持5人或10人");
  if (size === 5) playerTeam = 1;
  const party = Array.from({ length: 10 }, (_, i) => {
    const team = playerTeam === 1 ? (i < 5 ? 1 : 2) : i === 0 || i > 5 ? 2 : 1,
      healer = playerTeam === 1 ? i === 4 || i === 9 : i === 5 || i === 9;
    return {
      id: i,
      team,
      x: (team === 1 ? -1 : 1) * (70 + (i % 5) * 25),
      y: 100 + Math.floor(i / 5) * 40,
      hp: 100,
      healer,
      self: healer ? selfRevives : 0,
      deadAt: null,
      parry: -999,
    };
  });
  const names = [
    ["队员", "队员", "队员三", "队员四", "队员"],
    ["队员", "队员七", "队员八", "队员九", "队员"],
  ];
  const fivePlayerNames = ["队员", "队员", "队员", "队员四", "队员"];
  for (const team of [1, 2]) {
    const members = party.filter((p) => p.team === team);
    members.forEach((p, slot) => {
      p.slot = slot;
      p.name = p.id === 0 ? "玩家" : size === 5 ? fivePlayerNames[slot] : names[team - 1][slot];
      // 玩家在所选队伍第 1 格，两队第 5 格固定治疗。
      p.healer = slot === 4;
      p.self = p.healer ? selfRevives : 0;
    });
  }
  return size === 5 ? party.filter((p) => p.team === 1) : party;
}
