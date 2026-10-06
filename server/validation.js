import { COLORS } from '../shared/config.js';
import { PRESETS } from '../shared/presets.js';
import { THEMES } from '../shared/maps.js';
import { OBJECTIVES } from '../shared/objectives.js';
export function cleanName(value) {
  return String(value ?? 'Bean').normalize('NFKC').replace(/[^\p{L}\p{N} _.-]/gu, '').trim().slice(0, 18) || 'Bean';
}
export function cleanSettings(value = {}) {
  return { rounds: value.practice===true?1:Number.isInteger(value.rounds) ? Math.max(4, Math.min(value.format==='grandprix'?10:8, value.rounds)) : 6, seed: String(value.seed || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40), difficulty: ['easy', 'normal', 'hard'].includes(value.difficulty) ? value.difficulty : 'normal', playlist: ['races','party'].includes(value.playlist) ? value.playlist : 'mixed',
    capacity: [2, 4, 8, 16, 24, 30].includes(Number(value.capacity)) ? Number(value.capacity) : 16,
    content: ['presets','blend'].includes(value.content) ? value.content : 'procedural',
    preset: PRESETS.some(p => p.id === value.preset) ? value.preset : '',
    theme: THEMES.some(t => t.id === value.theme) ? value.theme : '',
    objective:Object.hasOwn(OBJECTIVES,value.objective||'')?value.objective:'',practice:value.practice===true,format:value.format==='grandprix'?'grandprix':'knockout',
  };
}
export function cleanColor(value) { return COLORS.includes(value) ? value : COLORS[0]; }
export function cleanInput(value) {
  if (!value || typeof value !== 'object' || !Number.isSafeInteger(value.seq) || value.seq < 0 || value.seq > 2147483647) return null;
  if (!Number.isFinite(value.x) || !Number.isFinite(value.z)) return null;
  if (![value.jump, value.dive, value.grab].every(n => Number.isSafeInteger(n) && n >= 0 && n <= 2147483647)) return null;
  const x = Math.max(-1, Math.min(1, value.x)), z = Math.max(-1, Math.min(1, value.z));
  const len = Math.max(1, Math.hypot(x, z));
  return { seq: value.seq, x: x / len, z: z / len, jump: value.jump, dive: value.dive, grab: value.grab };
}
export class Bucket {
  constructor(rate, capacity = rate * 2) { this.rate = rate; this.capacity = capacity; this.tokens = capacity; this.at = performance.now(); }
  take() {
    const now = performance.now();
    this.tokens = Math.min(this.capacity, this.tokens + (now - this.at) / 1000 * this.rate);
    this.at = now;
    if (this.tokens < 1) return false;
    this.tokens--;
    return true;
  }
}
