import { circle } from './telegraphs.js';

// Bosses retain their own eligibility rules; accepted actions share timing and feedback.
export function activateParry(game, actor = game.player) {
  if (game.real - actor.parry < game.c.parryCooldown) return false;
  actor.parry = actor.parryFx = game.real;
  return true;
}
export function activateDodge(game) {
  if (game.real - game.lastDodge < game.c.dodgeCooldown) return false;
  game.lastDodge = game.real;
  game.move(game.player, game.face.x, game.face.y, game.c.dodgeDistance / game.c.moveSpeed);
  return true;
}
export function drawParry(ctx, actor, now, { y = actor.y, duration = .25, radius = 1.8, width = .2 } = {}) {
  const age = now - actor.parryFx;
  if (actor.hp > 0 && age >= 0 && age < duration) circle(ctx, actor.x, y, radius, null, '#ffffff', width);
}
