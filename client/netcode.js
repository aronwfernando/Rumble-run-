const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const angle = n => Math.atan2(Math.sin(n), Math.cos(n));

/** Sample received snapshots without crossing a respawn or overshooting a wall. */
export function samplePlayers(queue, now, delay = 90) {
  const result = new Map();
  if (!queue.length) return result;
  const at = now - delay;
  let a = queue[0], b = a;
  if (at >= queue.at(-1).at) a = b = queue.at(-1);
  else if (at > a.at) {
    for (let i = 1; i < queue.length; i++) if (queue[i].at >= at) { a = queue[i - 1]; b = queue[i]; break; }
  }
  const dt = Math.max(0.001, (b.at - a.at) / 1000);
  const t = clamp((at - a.at) / (dt * 1000), 0, 1), t2 = t * t, t3 = t2 * t;
  const late = clamp((at - b.at) / 1000, 0, 0.075);
  const previous = new Map(a.players.map(p => [p.id, p]));
  for (const current of b.players) {
    const old = previous.get(current.id);
    if (!current.p || !old?.p || old.tp !== current.tp) { result.set(current.id, current); continue; }
    const position = current.p.map((v, i) => {
      if (a === b) return v + (current.v?.[i] || 0) * late;
      const smooth = (2 * t3 - 3 * t2 + 1) * old.p[i] + (t3 - 2 * t2 + t) * (old.v?.[i] || 0) * dt
        + (-2 * t3 + 3 * t2) * v + (t3 - t2) * (current.v?.[i] || 0) * dt;
      // Contacts reverse velocities abruptly. Bound the interpolation to the
      // actual received positions so a cosmetic spline cannot go through walls.
      return clamp(smooth, Math.min(old.p[i], v), Math.max(old.p[i], v));
    });
    result.set(current.id, { ...current, p: position, f: old.f + angle(current.f - old.f) * t,
      v: current.v.map((v, i) => old.v[i] + (v - old.v[i]) * t) });
  }
  return result;
}

export function renderLocal(body, alpha, offset) {
  const b = body.body, previous = b.previousPosition;
  return [b.position.x, b.position.y, b.position.z].map((v, i) => {
    const old = [previous.x, previous.y, previous.z][i];
    return old + (v - old) * clamp(alpha, 0, 1) + offset[i];
  });
}
