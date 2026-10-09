// World-space primitives. Progress comes from the mechanic's impact clock.
export function circle(ctx, x, y, radius, fill, stroke, width = 0.06) {
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0, radius), 0, Math.PI * 2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
}
export function expandingCircle(ctx, { x, y, radius, progress, color = "gold", width = 0.09 }) {
  const red = color === "red";
  circle(ctx, x, y, radius, red ? "#d35b521a" : "#dcb33b22", red ? "#ed8175" : "#ddbf63", width);
  circle(ctx, x, y, radius * Math.max(0, Math.min(1, progress)), red ? "#d35b5244" : "#dcb33b55", red ? "#ff786d" : "#f1d779", width * 1.4);
}
export function rectProgress(ctx, { x, y, w, h, progress, fill = "#ff77677a" }) {
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h * Math.max(0, Math.min(1, progress)));
}
export function parryLane(ctx, { origin, end, width, progress }) {
  const dx = end.x - origin.x, dy = end.y - origin.y, length = Math.hypot(dx, dy);
  ctx.save();
  ctx.translate(origin.x, origin.y);
  ctx.rotate(Math.atan2(dy, dx) - Math.PI / 2);
  ctx.fillStyle = "#d6494540"; ctx.strokeStyle = "#f38472"; ctx.lineWidth = 0.1;
  ctx.fillRect(-width / 2, 0, width, length); ctx.strokeRect(-width / 2, 0, width, length);
  rectProgress(ctx, { x: -width / 2, y: 0, w: width, h: length, progress });
  ctx.fillStyle = "#fff2cc";
  ctx.fillRect(-width / 2, length * Math.max(0, Math.min(1, progress)) - 0.06, width, 0.12);
  ctx.restore();
}
