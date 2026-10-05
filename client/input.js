export class InputController {
  constructor() {
    this.keys = new Set(); this.axes = { x: 0, z: 0 }; this.pulses = { jump: false, dive: false, grab: false };
    this.counters = { jump: 0, dive: 0, grab: 0 }; this.seq = 0; this.enabled = false;
    this.onToggleScore = null; this.onMenu = null;
    window.addEventListener('keydown', e => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName) || document.querySelector('dialog[open]')) return;
      if (e.code === 'Escape') { this.onMenu?.(); return; }
      if (e.code === 'Tab' && this.inGame) { e.preventDefault(); if (!e.repeat) this.onToggleScore?.(); return; }
      if (!this.enabled) return;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      this.keys.add(e.code);
      if (!e.repeat) {
        if (e.code === 'Space') this.action('jump');
        if (['ShiftLeft', 'ShiftRight', 'KeyF'].includes(e.code)) this.action('dive');
        if (e.code === 'KeyE') this.action('grab');
      }
    });
    window.addEventListener('keyup', e => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.clear());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.clear(); });
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
  }
  action(name) { this.pulses[name] = true; this.counters[name]++; this.onAction?.(name); }
  clear() { this.keys.clear(); this.axes = { x: 0, z: 0 }; this.pulses = { jump: false, dive: false, grab: false }; }
  direction() {
    if (!this.enabled) return { x: 0, z: 0 };
    let x = this.axes.x + Number(this.keys.has('KeyD') || this.keys.has('ArrowRight')) - Number(this.keys.has('KeyA') || this.keys.has('ArrowLeft'));
    let z = this.axes.z + Number(this.keys.has('KeyS') || this.keys.has('ArrowDown')) - Number(this.keys.has('KeyW') || this.keys.has('ArrowUp'));
    const l = Math.max(1, Math.hypot(x, z)); return { x: x / l, z: z / l };
  }
  consume() { const result = { ...this.direction(), ...this.pulses }; this.pulses = { jump: false, dive: false, grab: false }; return result; }
  packet(roundKey) { return { seq: ++this.seq, ...this.direction(), ...this.counters, roundKey }; }
}
