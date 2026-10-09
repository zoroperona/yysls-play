// Existing ten-player cyan projectile/trail, in the caller's world coordinates.
export function attackEffect(origin, end, at) {
  return { kind: "attack", origin: { x: origin.x, y: origin.y }, end: { x: end.x, y: end.y }, at, duration: 0.28 };
}
export function drawAttackEffect(ctx, effect, now, scale = 1) {
  const t = Math.max(0, Math.min(1, (now - effect.at) / effect.duration));
  const dx = effect.end.x - effect.origin.x, dy = effect.end.y - effect.origin.y;
  const x = effect.origin.x + dx * t, y = effect.origin.y + dy * t;
  const color = effect.kind === "heartAttack" ? "#ff625c" : "#bff8ff";
  ctx.save(); ctx.strokeStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 12;
  ctx.lineWidth = Math.max(0.16, 2 / scale);
  ctx.beginPath(); ctx.moveTo(x - dx * 0.13, y - dy * 0.13); ctx.lineTo(x, y); ctx.stroke();
  ctx.lineWidth = 0.06; ctx.beginPath(); ctx.arc(x, y, Math.max(0.35, 4 / scale), 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}
