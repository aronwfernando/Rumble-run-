export const CONTENT_VERSION = 3;
export const GENERATOR_VERSION = 3;
export const RULES_VERSION = 2;
const definition = (id, motion, navigation, tags = []) => Object.freeze({
  id, version: 1, motion, navigation, tags, modes: ['race', 'survival'],
  lifecycle: motion === 'static' ? ['idle', 'contact'] : ['active', 'repeat'],
  difficulty: [0, 1], maxInstances: 40, reset: 'round',
  cost: { bodies: 1, visualInstances: 1, network: 'phase' },
  sockets: [{ id: 'entry', direction: [0, 0, -1] }, { id: 'exit', direction: [0, 0, -1] }],
});
export const OBSTACLES = Object.freeze(Object.fromEntries([
  definition('spinner', 'rotation', ['wait', 'jump'], ['timing']),
  definition('pendulum', 'swing', ['wait', 'run'], ['timing']),
  definition('sliding-wall', 'translation', ['wait', 'sidestep']),
  definition('bumper', 'static', ['avoid'], ['knockback']),
  definition('hammer', 'swing', ['wait', 'run'], ['knockback']),
  definition('piston', 'translation', ['wait', 'sidestep']),
  definition('roller', 'translation', ['sidestep', 'jump']),
  definition('windmill', 'rotation', ['wait', 'jump']),
  definition('door', 'static', ['run', 'dive'], ['secret', 'breakable']),
  definition('flipper', 'rotation', ['launch']),
  definition('cannonball', 'translation', ['sidestep']),
  definition('fruit', 'translation', ['sidestep']),
  definition('log', 'translation', ['jump']),
  definition('timed-gate', 'translation', ['wait', 'run']),
  definition('jump-pad', 'static', ['launch']),
  definition('block-wall', 'translation', ['sidestep', 'jump']),
].map(d => [d.id, d])));

/** Conservative full-cycle bounds, used for checkpoint and editor checks. */
export function obstacleBounds(h, margin = 0) {
  if (!OBSTACLES[h.kind]) throw new Error(`Unsupported obstacle: ${h.kind}`);
  let half = h.size ? h.size.map(v => v / 2) : [h.radius, h.radius, h.radius];
  if (h.kind === 'log') half[0] *= 2.75;
  if (h.kind === 'spinner') half[0] = half[2] = Math.hypot(half[0], half[2]);
  if (h.kind === 'windmill') half[0] = half[1] = Math.hypot(half[0], half[1]);
  if (h.kind === 'pendulum' || h.kind === 'sliding-wall') half[0] += h.amplitude || 0;
  if (h.kind === 'hammer') { half[0] += h.arm || 0; half[1] += h.arm || 0; }
  if (['piston', 'timed-gate'].includes(h.kind)) half[1] += h.amplitude || 0;
  if (['roller', 'cannonball', 'fruit', 'log'].includes(h.kind)) { half[2] += h.amplitude || 0; half[1] += Math.abs((h.amplitude || 0) * (h.slope || 0)); }
  if (h.kind === 'fruit') half[0] += 1.8;
  if (h.kind === 'block-wall') half[2] += 18;
  return { min: h.position.map((v, i) => v - half[i] - margin), max: h.position.map((v, i) => v + half[i] + margin) };
}

export function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().filter(k => value[k] !== undefined).map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
  return JSON.stringify(value);
}
// Non-security checksum for version/asset mismatch detection. Authority remains
// on the server; this is not a signature or an anti-cheat boundary.
export function checksum(value) {
  let hash = 2166136261;
  for (const c of canonical(value)) { hash ^= c.charCodeAt(0); hash = Math.imul(hash, 16777619); }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
export function layoutFingerprint(map) {
  return checksum({ mode: map.mode, rule: map.rule || map.mode,
    platforms: map.platforms.map(p => [p.position.map(v => Math.round(v * 2) / 2), p.size.map(v => Math.round(v)), p.rotation, p.surface, p.seesaw, p.turntable]),
    hazards: map.hazards.map(h => [h.kind, h.position.map(v => Math.round(v)), h.size, h.radius, Math.round((h.speed || 0) * 4) / 4]) });
}

export function publicMap(map) {
  const result = structuredClone(map);
  delete result.secretSeed;
  for (const h of result.hazards) if (h.kind === 'door') delete h.breakable;
  for (const p of result.platforms) if (p.puzzle) { delete p.fallOnTouch; delete p.fragile; delete p.truth; }
  result.contentVersion = CONTENT_VERSION; result.generatorVersion = GENERATOR_VERSION; result.rulesVersion = RULES_VERSION;
  result.layoutFingerprint = layoutFingerprint(result);
  result.contentChecksum = checksum(result);
  return result;
}
export function verifyPublicMap(map) {
  if (map.contentVersion !== CONTENT_VERSION || map.rulesVersion !== RULES_VERSION) return false;
  const { contentChecksum, ...data } = map;
  return checksum(data) === contentChecksum;
}
