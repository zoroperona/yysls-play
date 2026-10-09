import test from 'node:test';
import assert from 'node:assert/strict';
import { bindTouchControls } from '../shared/touch-controls.js';

class Control extends EventTarget {
  style = {};
  dataset = {};
  captured = new Set();
  classList = { add() {}, remove() {} };
  getBoundingClientRect() { return { left: 0, top: 0, width: 120, height: 120 }; }
  setPointerCapture(id) { this.captured.add(id); }
  hasPointerCapture(id) { return this.captured.has(id); }
  releasePointerCapture(id) { this.captured.delete(id); }
  pointer(type, id, x = 60, y = 60) {
    const event = new Event(type, { cancelable: true });
    Object.assign(event, { pointerId: id, clientX: x, clientY: y, button: 0 });
    this.dispatchEvent(event);
  }
}
function setup() {
  const zone = new Control(), joystick = new Control(), knob = new Control(), attack = new Control(), parry = new Control(), dodge = new Control();
  attack.dataset.action = '1'; parry.dataset.action = 'e';
  dodge.dataset.action = 'shift';
  const actions = [];
  const taps = [];
  let enabled = true;
  const state = bindTouchControls({ zone, joystick, knob, buttons: [attack, parry, dodge], enabled: () => enabled, tap: event => taps.push([event.clientX, event.clientY]), action: key => actions.push(key) });
  return { zone, joystick, knob, attack, parry, dodge, actions, taps, state, disable: () => enabled = false };
}
test('diagonal movement, held attack and discrete parries have independent fingers', () => {
  const { zone, joystick, attack, parry, state, actions } = setup();
  zone.pointer('pointerdown', 1, 60, 60);
  zone.pointer('pointermove', 1, 110, 10);
  attack.pointer('pointerdown', 2);
  parry.pointer('pointerdown', 3);
  assert.ok(state.dx > 0 && state.dy < 0);
  assert.ok(Math.abs(Math.hypot(state.dx, state.dy) - 1) < 1e-9);
  assert.equal(state.attack, true);
  assert.deepEqual(actions, ['1', 'e']);
  parry.pointer('pointerup', 3);
  assert.equal(state.attack, true);
  zone.pointer('pointerup', 99);
  assert.ok(state.dx > 0);
  zone.pointer('pointerup', 1);
  assert.equal(state.dx, 0);
  assert.equal(state.attack, true);
  attack.pointer('pointerup', 2);
  assert.equal(state.attack, false);
});
test('dead zone, pointer cancellation and lost capture stop their input', () => {
  const { zone, joystick, attack, state } = setup();
  zone.pointer('pointerdown', 1, 63, 62);
  assert.equal(state.dx, 0);
  zone.pointer('pointermove', 1, 300, 62);
  assert.equal(state.dx, 1);
  zone.pointer('pointercancel', 1);
  assert.equal(state.dx, 0);
  attack.pointer('pointerdown', 2);
  attack.pointer('lostpointercapture', 2);
  assert.equal(state.attack, false);
});
test('pause/reset clears every held input and rejects disabled controls', () => {
  const { zone, joystick, attack, state, disable, actions } = setup();
  zone.pointer('pointerdown', 1, 100, 60);
  attack.pointer('pointerdown', 2);
  state.reset();
  assert.equal(state.dx, 0);
  assert.equal(state.attack, false);
  assert.equal(zone.captured.size, 0);
  assert.equal(attack.captured.size, 0);
  disable();
  zone.pointer('pointerdown', 3, 100, 60);
  attack.pointer('pointerdown', 4);
  assert.equal(state.dx, 0);
  assert.deepEqual(actions, ['1']);
});
test('dodge taps stay independent of held movement and output', () => {
  const { zone, joystick, attack, dodge, state, actions } = setup();
  zone.pointer('pointerdown', 1, 60, 60);
  zone.pointer('pointermove', 1, 110, 60);
  attack.pointer('pointerdown', 2);
  dodge.pointer('pointerdown', 3);
  dodge.pointer('pointerdown', 3);
  assert.deepEqual(actions, ['1', 'shift']);
  dodge.pointer('pointerup', 3);
  assert.equal(state.attack, true);
  assert.equal(state.dx, 1);
  dodge.pointer('pointerdown', 4);
  assert.deepEqual(actions, ['1', 'shift', 'shift']);
});
test('floating origin follows each initial touch and ignores other fingers', () => {
  const { zone, joystick, state } = setup();
  zone.pointer('pointerdown', 1, 180, 220);
  assert.equal(state.dx, 0);
  assert.equal(state.dy, 0);
  assert.equal(joystick.style.left, '180px');
  assert.equal(joystick.style.top, '220px');
  zone.pointer('pointerdown', 2, 20, 30);
  assert.equal(joystick.style.left, '180px');
  zone.pointer('pointermove', 1, 210, 220);
  assert.equal(state.dx, 1);
  zone.pointer('pointerup', 1, 210, 220);
  zone.pointer('pointerdown', 3, 45, 95);
  assert.equal(state.dx, 0);
  assert.equal(joystick.style.left, '45px');
  assert.equal(joystick.style.top, '95px');
  zone.pointer('pointermove', 3, 45, 60);
  assert.equal(state.dy, -1);
});

test('stationary taps select targets but drags and cancellations do not', () => {
  const { zone, taps } = setup();
  zone.pointer('pointerdown', 1, 50, 80);
  zone.pointer('pointerup', 1, 52, 82);
  assert.deepEqual(taps, [[52, 82]]);
  zone.pointer('pointerdown', 2, 50, 80);
  zone.pointer('pointermove', 2, 90, 80);
  zone.pointer('pointerup', 2, 50, 80);
  zone.pointer('pointerdown', 3, 50, 80);
  zone.pointer('pointercancel', 3, 50, 80);
  assert.equal(taps.length, 1);
});

test('native touch defaults are suppressed without interrupting held attack or movement', () => {
  const { zone, attack, state } = setup();
  zone.pointer('pointerdown', 1, 60, 60);
  zone.pointer('pointermove', 1, 90, 60);
  attack.pointer('pointerdown', 2);
  for (const control of [zone, attack]) {
    for (const type of ['touchstart', 'touchmove', 'contextmenu', 'selectstart', 'dragstart']) {
      const event = new Event(type, { cancelable: true });
      control.dispatchEvent(event);
      assert.equal(event.defaultPrevented, true, type);
    }
  }
  assert.equal(state.attack, true);
  assert.equal(state.dx, 1);
  attack.pointer('pointerup', 2);
  assert.equal(state.attack, false);
  assert.equal(state.dx, 1);
  zone.pointer('pointerup', 1, 90, 60);
  assert.equal(state.dx, 0);
});
