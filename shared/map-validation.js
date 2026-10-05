import { RULES } from './config.js';

// Conservative footprints: circular decks use the inscribed circle of their
// low-poly collider. Sloped decks use their horizontal projection.
function footprint(p) {
  const radius = p.radius ? p.radius * Math.cos(Math.PI / (p.sides || 12)) : null;
  const hx = radius || p.size[0] / 2;
  const hz = radius || p.size[2] * Math.cos(p.rotation[0]) / 2;
  return { x: p.position[0], z: p.position[2], radius, hx, hz };
}
export function platformTop(p, x, z) {
  return p.position[1] + p.size[1] / (2 * Math.cos(p.rotation[0])) - (z - p.position[2]) * Math.tan(p.rotation[0]);
}
export function platformContains(p, x, z, margin = 0) {
  const f = footprint(p), dx = x - f.x, dz = z - f.z;
  return f.radius ? Math.hypot(dx, dz) <= f.radius - margin : Math.abs(dx) <= f.hx - margin && Math.abs(dz) <= f.hz - margin;
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function nearestPoints(a, b) {
  const f = footprint(a), g = footprint(b);
  if (f.radius && g.radius) {
    const dx = g.x - f.x, dz = g.z - f.z, d = Math.hypot(dx, dz) || 1;
    return [[f.x + dx / d * f.radius, f.z + dz / d * f.radius], [g.x - dx / d * g.radius, g.z - dz / d * g.radius], Math.max(0, d - f.radius - g.radius)];
  }
  if (f.radius || g.radius) {
    const circle = f.radius ? f : g, box = f.radius ? g : f;
    const q = [clamp(circle.x, box.x - box.hx, box.x + box.hx), clamp(circle.z, box.z - box.hz, box.z + box.hz)];
    const dx = q[0] - circle.x, dz = q[1] - circle.z, d = Math.hypot(dx, dz);
    const p = d > 0 ? [circle.x + dx / d * Math.min(d, circle.radius), circle.z + dz / d * Math.min(d, circle.radius)] : q;
    return f.radius ? [p, q, Math.max(0, d - circle.radius)] : [q, p, Math.max(0, d - circle.radius)];
  }
  function axis(c, h, d, k) {
    const lo = Math.max(c - h, d - k), hi = Math.min(c + h, d + k);
    if (lo <= hi) return [(lo + hi) / 2, (lo + hi) / 2];
    return c < d ? [c + h, d - k] : [c - h, d + k];
  }
  const x = axis(f.x, f.hx, g.x, g.hx), z = axis(f.z, f.hz, g.z, g.hz);
  return [[x[0], z[0]], [x[1], z[1]], Math.hypot(x[0] - x[1], z[0] - z[1])];
}

export function reachablePlatforms(map) {
  // Unsafe puzzle tiles are excluded: a permanent route must remain after all
  // fragile tiles have vanished. Moving hazards are tested separately.
  const floors = map.platforms.filter(p => !p.fallOnTouch && p.collapseAt == null);
  const start = floors.find(p => p.id === 'start');
  if (!start) return new Set();
  const seen = new Set([start.id]), pending = [start];
  const maxRise = RULES.jumpSpeed ** 2 / (-2 * RULES.gravity) - 0.25;
  while (pending.length) {
    const a = pending.pop();
    for (const b of floors) {
      if (seen.has(b.id)) continue;
      const [p, q, gap] = nearestPoints(a, b);
      if (gap > 1.8 || platformTop(b, ...q) - platformTop(a, ...p) > maxRise) continue;
      seen.add(b.id); pending.push(b);
    }
  }
  return seen;
}

export function validateMap(map) {
  if (!map || map.version !== 2 || map.spawn.length !== 30) throw new Error('Invalid map schema');
  if (map.platforms.length > 160 || map.hazards.length > 70) throw new Error('Map exceeds geometry budget');
  const ids = new Set();
  for (const p of map.platforms) {
    if (ids.has(p.id)) throw new Error('Duplicate platform');
    ids.add(p.id);
    if (![...p.position, ...p.size, ...p.rotation].every(Number.isFinite)) throw new Error('Non-finite platform');
    if (p.size.some(v => v <= 0) || (p.radius != null && (!Number.isFinite(p.radius) || p.radius <= 0))) throw new Error('Invalid platform size');
    if (Math.abs(p.rotation[0]) > 0.24) throw new Error('Ramp too steep');
    if ((p.gapBefore || 0) > 1.8) throw new Error('Unjumpable gap');
  }
  for (const h of map.hazards) {
    if (!h.position.every(Number.isFinite) || !Number.isFinite(h.phase) || h.size?.some(v => !Number.isFinite(v) || v <= 0) || (h.radius != null && (!Number.isFinite(h.radius) || h.radius <= 0))) throw new Error('Invalid hazard');
  }
  for (const spawn of map.spawn) {
    if (!spawn.every(Number.isFinite) || !map.platforms.some(p => platformContains(p, spawn[0], spawn[2], RULES.radius) && spawn[1] - RULES.halfHeight >= platformTop(p, spawn[0], spawn[2]) - 0.03 && spawn[1] - platformTop(p, spawn[0], spawn[2]) < 2)) throw new Error('Spawn has no safe floor');
  }
  if (map.mode === 'race') {
    if (!map.finish || map.checkpoints.length < 2) throw new Error('Missing race route');
    const reachable = reachablePlatforms(map);
    if (!reachable.has('finish')) throw new Error('No permanent route to finish');
    for (let i = 0; i < map.checkpoints.length; i++) {
      const c = map.checkpoints[i];
      if (i && c.z >= map.checkpoints[i - 1].z) throw new Error('Invalid checkpoint order');
      if (!map.platforms.some(p => reachable.has(p.id) && platformContains(p, c.x, c.z, RULES.radius) && Math.abs(c.y - platformTop(p, c.x, c.z) - 1.1) < 0.35)) throw new Error('Checkpoint has no reachable landing');
    }
  }
  return true;
}
