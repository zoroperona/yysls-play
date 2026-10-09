// Touch identifiers keep joystick, held attacks and one-shot actions independent.
export class TouchInput {
  constructor(session) { this.session = session; this.clear(); }
  clear() { this.stick = null; this.attackIds = new Set(); this.session.clear(); }
  startStick(touch) {
    if (!this.session.active || this.stick) return;
    this.stick = { id: touch.identifier, x: touch.clientX, y: touch.clientY };
  }
  move(touches) {
    if (!this.stick || !this.session.active) return { x: 0, y: 0 };
    const p = touches.find(t => t.identifier === this.stick.id);
    if (!p) return { x: 0, y: 0 };
    const dx = p.clientX - this.stick.x, dy = p.clientY - this.stick.y;
    const magnitude = Math.hypot(dx, dy), scale = magnitude > 38 ? 38 / magnitude : 1;
    const x = dx * scale, y = dy * scale;
    this.session.input.dx = magnitude < 4 ? 0 : x / 38;
    this.session.input.dy = magnitude < 4 ? 0 : y / 38;
    return { x, y };
  }
  attack(touches) {
    if (!this.session.active) return;
    touches.forEach(t => this.attackIds.add(t.identifier));
    this.session.input.attack = this.attackIds.size > 0;
  }
  end(touches) {
    for (const t of touches) {
      if (this.stick?.id === t.identifier) {
        this.stick = null; this.session.input.dx = 0; this.session.input.dy = 0;
      }
      this.attackIds.delete(t.identifier);
    }
    this.session.input.attack = this.attackIds.size > 0 && this.session.active;
  }
}
