import { random } from '../shared/random.js';
import { publicMap } from '../shared/content.js';
import { validateMap } from '../shared/map-validation.js';

export function resolveSecrets(map, secretSeed) {
  const rng = random(secretSeed), rows = new Map();
  for (const h of map.hazards) if (h.kind === 'door') {
    const key = h.position[2]; if (!rows.has(key)) rows.set(key, []); rows.get(key).push(h);
  }
  for (const row of rows.values()) {
    const open = rng.int(0, row.length - 1), second = (open + rng.int(1, row.length - 1)) % row.length;
    row.forEach((door, i) => door.breakable = i === open || i === second);
  }
  const sections = new Map();
  for (const p of map.platforms) if (p.puzzle) {
    const match = p.id.match(/^(s\d+)-puzzle-(\d+)-(\d+)$/);
    if (!match) continue;
    if (!sections.has(match[1])) sections.set(match[1], []);
    sections.get(match[1]).push({ p, row: Number(match[2]), col: Number(match[3]) });
  }
  for (const tiles of sections.values()) {
    let safe = rng.int(1, 2);
    for (let row = 0; row <= Math.max(...tiles.map(t => t.row)); row++) {
      safe = Math.max(0, Math.min(3, safe + rng.int(-1, 1)));
      for (const tile of tiles.filter(t => t.row === row)) {
        tile.p.truth = tile.col === safe; tile.p.fallOnTouch = !tile.p.truth; tile.p.fragile = !tile.p.truth;
      }
    }
  }
  validateMap(map);
  return { authoritative: map, public: publicMap(map) };
}
