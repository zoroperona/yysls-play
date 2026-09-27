// Pointer ownership lets movement, held attack and individual parries coexist.
export function bindTouchControls({ zone, joystick, knob, buttons, enabled, action, tap = () => {} }) {
  let movementPointer = null;
  let origin = { x: 0, y: 0 };
  let dragged = false;
  const held = new Map();
  const state = { dx: 0, dy: 0, attack: false, reset };
  const listenRelease = (element, release) => {
    for (const name of ["pointerup", "pointercancel", "lostpointercapture"])
      element.addEventListener(name, release);
    // Some WebKit/WebView callouts begin on touchstart without a contextmenu
    // event. Cancel only game controls, leaving menus and form fields usable.
    for (const name of ["touchstart", "touchmove", "contextmenu", "selectstart", "dragstart"])
      element.addEventListener(name, (event) => {
        if (event.cancelable) event.preventDefault();
      }, { passive: false, capture: true });
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
    if (pointer !== null && zone.hasPointerCapture(pointer))
      zone.releasePointerCapture(pointer);
    const captured = [...held];
    held.clear();
    state.attack = false;
    for (const [button, id] of captured) {
      button.classList.remove("active");
      if (button.hasPointerCapture(id)) button.releasePointerCapture(id);
    }
  }
  function move(event) {
    const rect = joystick.getBoundingClientRect();
    const x = event.clientX - origin.x;
    const y = event.clientY - origin.y;
    const length = Math.hypot(x, y);
    if (length > 8) dragged = true;
    const radius = rect.width * 0.32;
    const ratio = length ? Math.min(1, radius / length) : 0;
    state.dx = length > 8 ? x / length : 0;
    state.dy = length > 8 ? y / length : 0;
    knob.style.transform = `translate(-50%, -50%) translate(${x * ratio}px, ${y * ratio}px)`;
  }
  zone.addEventListener("pointerdown", (event) => {
    if (!enabled() || movementPointer !== null || event.button !== 0) return;
    event.preventDefault();
    movementPointer = event.pointerId;
    origin = { x: event.clientX, y: event.clientY };
    dragged = false;
    const rect = zone.getBoundingClientRect();
    joystick.style.left = `${origin.x - rect.left}px`;
    joystick.style.top = `${origin.y - rect.top}px`;
    zone.setPointerCapture(event.pointerId);
    joystick.classList.add("active");
    move(event);
  });
  zone.addEventListener("pointermove", (event) => {
    if (event.pointerId !== movementPointer) return;
    if (!enabled()) { reset(); return; }
    move(event);
  });
  listenRelease(zone, (event) => {
    if (event.pointerId !== movementPointer) return;
    move(event);
    const isTap = event.type === "pointerup" && !dragged && enabled();
    movementPointer = null;
    center();
    if (isTap) tap(event);
  });
  for (const button of buttons) {
    button.addEventListener("pointerdown", (event) => {
      if (!enabled() || held.has(button) || event.button !== 0) return;
      event.preventDefault();
      held.set(button, event.pointerId);
      button.setPointerCapture(event.pointerId);
      button.classList.add("active");
      if (button.dataset.action === "1") state.attack = true;
      action(button.dataset.action);
    });
    listenRelease(button, (event) => {
      if (held.get(button) !== event.pointerId) return;
      held.delete(button);
      button.classList.remove("active");
      if (button.dataset.action === "1") state.attack = false;
    });
  }
  return state;
}
