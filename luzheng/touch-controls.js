// Pointer ownership lets movement, held attack and individual parries coexist.
export function bindTouchControls({ joystick, knob, buttons, enabled, action }) {
  let movementPointer = null;
  const held = new Map();
  const state = { dx: 0, dy: 0, attack: false, fastForward: false, reset };
  const listenRelease = (element, release) => {
    for (const name of ["pointerup", "pointercancel", "lostpointercapture"])
      element.addEventListener(name, release);
    element.addEventListener("contextmenu", (event) => event.preventDefault());
  };
  function center() {
    state.dx = state.dy = 0;
    knob.style.transform = "translate(-50%, -50%)";
    joystick.classList.remove("active");
  }
  function reset() {
    const pointer = movementPointer;
    movementPointer = null;
    center();
    if (pointer !== null && joystick.hasPointerCapture(pointer))
      joystick.releasePointerCapture(pointer);
    const captured = [...held];
    held.clear();
    state.attack = false;
    state.fastForward = false;
    for (const [button, id] of captured) {
      button.classList.remove("active");
      if (button.hasPointerCapture(id)) button.releasePointerCapture(id);
    }
  }
  function move(event) {
    const rect = joystick.getBoundingClientRect();
    const x = event.clientX - rect.left - rect.width / 2;
    const y = event.clientY - rect.top - rect.height / 2;
    const length = Math.hypot(x, y);
    const radius = rect.width * 0.32;
    const ratio = length ? Math.min(1, radius / length) : 0;
    state.dx = length > 8 ? x / length : 0;
    state.dy = length > 8 ? y / length : 0;
    knob.style.transform = `translate(-50%, -50%) translate(${x * ratio}px, ${y * ratio}px)`;
  }
  joystick.addEventListener("pointerdown", (event) => {
    if (!enabled() || movementPointer !== null || event.button !== 0) return;
    event.preventDefault();
    movementPointer = event.pointerId;
    joystick.setPointerCapture(event.pointerId);
    joystick.classList.add("active");
    move(event);
  });
  joystick.addEventListener("pointermove", (event) => {
    if (event.pointerId !== movementPointer) return;
    if (!enabled()) { reset(); return; }
    move(event);
  });
  listenRelease(joystick, (event) => {
    if (event.pointerId !== movementPointer) return;
    movementPointer = null;
    center();
  });
  for (const button of buttons) {
    button.addEventListener("pointerdown", (event) => {
      if (!enabled() || held.has(button) || event.button !== 0) return;
      event.preventDefault();
      held.set(button, event.pointerId);
      button.setPointerCapture(event.pointerId);
      button.classList.add("active");
      if (button.dataset.action === "1") state.attack = true;
      if (button.dataset.action === "fastForward") state.fastForward = true;
      else action(button.dataset.action);
    });
    listenRelease(button, (event) => {
      if (held.get(button) !== event.pointerId) return;
      held.delete(button);
      button.classList.remove("active");
      if (button.dataset.action === "1") state.attack = false;
      if (button.dataset.action === "fastForward") state.fastForward = false;
    });
  }
  return state;
}
