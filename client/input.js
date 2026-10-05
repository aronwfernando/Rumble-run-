export class InputController {
  constructor() {
    this.keys = new Set(); this.axes = { x: 0, z: 0 }; this.pulses = { jump: false, dive: false, grab: false };
    this.counters = { jump: 0, dive: 0, grab: 0 }; this.seq = 0; this.enabled = false;
    this.gamepadAxes = { x: 0, z: 0 }; this.gamepadButtons = [];
    this.focused = true;
    this.sensitivity = 1;
    this.onToggleScore = null; this.onMenu = null;
    window.addEventListener('keydown', e => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName) || document.querySelector('dialog[open]')) return;
      if (e.code === 'Escape') { this.onMenu?.(); return; }
      if (e.code === 'Tab' && this.inGame) { e.preventDefault(); if (!e.repeat) this.onToggleScore?.(); return; }
      if (!this.enabled && !this.inGame) return;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      this.keys.add(e.code);
      if (!e.repeat) this.onChange?.();
      if (!this.enabled) return;
      if (!e.repeat) {
        if (e.code === 'Space') this.action('jump');
        if (['ShiftLeft', 'ShiftRight', 'KeyF'].includes(e.code)) this.action('dive');
        if (e.code === 'KeyE') this.action('grab');
        if (e.code === 'KeyR') this.onReset?.();
        if (e.code === 'KeyC') this.onCenterCamera?.();
      }
    });
    window.addEventListener('keyup', e => { this.keys.delete(e.code); this.onChange?.(); });
    window.addEventListener('blur', () => { this.focused = false; this.clear(); });
    window.addEventListener('focus', () => { this.focused = true; });
    document.addEventListener('visibilitychange', () => { if (document.hidden) { this.focused = false; this.clear(); } else this.focused = true; });
    for (const name of ['jump', 'dive', 'grab']) {
      document.querySelector(`#touch-${name}`).addEventListener('pointerdown', e => { e.preventDefault(); if (this.enabled) this.action(name); });
    }
    const pad = document.querySelector('#joystick'), stick = document.querySelector('#stick');
    let pointer = null;
    const move = e => {
      if (e.pointerId !== pointer) return;
      const rect = pad.getBoundingClientRect();
      let x = e.clientX - rect.left - rect.width / 2, y = e.clientY - rect.top - rect.height / 2;
      const len = Math.hypot(x, y), max = rect.width * 0.32;
      if (len > max) { x *= max / len; y *= max / len; }
      this.axes = { x: x / max, z: y / max };
      stick.style.transform = `translate(${x}px,${y}px)`;
    };
    pad.addEventListener('pointerdown', e => { pointer = e.pointerId; pad.setPointerCapture(pointer); move(e); });
    pad.addEventListener('pointermove', move);
    const reset = () => { pointer = null; this.axes = { x: 0, z: 0 }; stick.style.transform = ''; };
    pad.addEventListener('pointerup', reset); pad.addEventListener('pointercancel', reset);
    pad.addEventListener('lostpointercapture', reset);
    this.resetStick = reset;
    const canvas = document.querySelector('#game');
    let lookPointer = null, lookX = 0;
    canvas.addEventListener('contextmenu', e => { if (this.inGame) e.preventDefault(); });
    canvas.addEventListener('pointerdown', e => {
      if (!this.inGame) return;
      if (e.button === 2) { e.preventDefault(); if (this.enabled) this.action('jump'); return; }
      lookPointer = e.pointerId; lookX = e.clientX; canvas.setPointerCapture(lookPointer);
    });
    canvas.addEventListener('pointermove', e => {
      if (e.pointerId !== lookPointer) return;
      this.onLook?.(-(e.clientX - lookX) * 0.006 * this.sensitivity); lookX = e.clientX;
    });
    const endLook = () => { lookPointer = null; };
    canvas.addEventListener('pointerup', endLook); canvas.addEventListener('pointercancel', endLook); canvas.addEventListener('lostpointercapture', endLook);
  }
  action(name) { this.pulses[name] = true; this.counters[name]++; this.onAction?.(name); }
  clear() { this.keys.clear(); this.axes = { x: 0, z: 0 }; this.pulses = { jump: false, dive: false, grab: false }; this.resetStick?.(); this.onChange?.(); }
  pollGamepad(delta) {
    let pad;
    try { pad = Array.from(navigator.getGamepads?.() || []).find(Boolean); } catch { /* Gamepad permission is optional. */ }
    const deadzone = n => Math.abs(n || 0) < 0.18 ? 0 : Math.sign(n) * (Math.abs(n) - 0.18) / 0.82;
    this.gamepadAxes = { x: deadzone(pad?.axes[0]), z: deadzone(pad?.axes[1]) };
    if (pad) {
      if (this.inGame && this.focused) this.onLook?.(-deadzone(pad.axes[2]) * delta * 2.4 * this.sensitivity);
      ['jump', 'dive', 'grab'].forEach((name, i) => { if (this.enabled && this.focused && pad.buttons[i]?.pressed && !this.gamepadButtons[i]) this.action(name); });
    }
    this.gamepadButtons = pad?.buttons.map(b => b.pressed) || [];
  }
  direction() {
    if (!this.enabled || !this.focused) return { x: 0, z: 0 };
    let x = this.axes.x + this.gamepadAxes.x + Number(this.keys.has('KeyD') || this.keys.has('ArrowRight')) - Number(this.keys.has('KeyA') || this.keys.has('ArrowLeft'));
    let z = this.axes.z + this.gamepadAxes.z + Number(this.keys.has('KeyS') || this.keys.has('ArrowDown')) - Number(this.keys.has('KeyW') || this.keys.has('ArrowUp'));
    const l = Math.max(1, Math.hypot(x, z)), yaw = this.getYaw?.() || 0;
    return { x: (x * Math.cos(yaw) + z * Math.sin(yaw)) / l, z: (z * Math.cos(yaw) - x * Math.sin(yaw)) / l };
  }
  consume() { const result = { ...this.direction(), ...this.pulses }; this.pulses = { jump: false, dive: false, grab: false }; return result; }
  packet(roundKey) { return { seq: ++this.seq, ...this.direction(), ...this.counters, roundKey }; }
}
