// Draw last so the lock-on dot remains visible over sprites and attack effects.
export function drawTargetMarker(ctx, target, radius, scale) {
  if (!target) return;
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.setLineDash([]);
  ctx.strokeStyle = '#ff514b';
  ctx.lineWidth = 2 / scale;
  ctx.beginPath();
  ctx.arc(target.x, target.y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(target.x, target.y, 3 / scale, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#202020';
  ctx.lineWidth = 1 / scale;
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
