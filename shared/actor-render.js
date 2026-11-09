import { imageReady } from './canvas-image.js';
import { healthPercent } from './battle-presentation.js';

// Cropped heads from the common party sheet. Caller owns world size, clipping,
// alpha, selection rings and encounter-specific effects (egg, realm, airborne).
export function drawPartyPortrait(ctx, image, actor, { x = actor.x, y = actor.y, width, height = width }) {
  if (!imageReady(image) || !Number.isInteger(actor.id) || ![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) return false;
  const frame = ((actor.id % 3) + 3) % 3;
  ctx.drawImage(image, [6, 119, 238][frame], 8, 110, 112, x - width / 2, y - height / 2, width, height);
  return true;
}
export function drawActorHealth(ctx, { x, y, width, height, hp, max = 100, background, fill }) {
  ctx.save();
  ctx.fillStyle = background; ctx.fillRect(x, y, width, height);
  ctx.fillStyle = fill; ctx.fillRect(x, y, width * healthPercent(hp, max) / 100, height);
  ctx.restore();
}
