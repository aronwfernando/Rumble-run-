import { random } from './random.js';
import { COURSES, SURVIVAL_RECIPES, SURVIVAL_TYPES, FINAL_TYPES, shuffle } from './course-catalog.js';
import { validateMap } from './map-validation.js';
export { COURSES, SURVIVAL_TYPES, FINAL_TYPES, validateMap };

export const THEMES = [
  { id: 'candy-carnival', name: 'Candy Carnival', sky: '#a4dcf5', floor: '#65d9dc', edge: '#159daf', accent: '#ff6798', secondary: '#ffc94c', fog: '#c6e9f6' },
  { id: 'toy-workshop', name: 'Toy Workshop', sky: '#b1bbf7', floor: '#ffb17e', edge: '#e37274', accent: '#8666e8', secondary: '#83f0cf', fog: '#d6d2fa' },
  { id: 'jungle-canopy', name: 'Jungle Canopy', sky: '#b1e5dc', floor: '#b5e575', edge: '#5cae94', accent: '#fa72a1', secondary: '#ffd878', fog: '#d2eee4' },
  { id: 'orbital-station', name: 'Orbital Station', sky: '#bab4ef', floor: '#9581e5', edge: '#6755b2', accent: '#ffca57', secondary: '#7ee1e5', fog: '#d7d2f7' },
  { id: 'pirate-islands', name: 'Pirate Islands', sky: '#a3dce8', floor: '#fd829e', edge: '#d9467a', accent: '#45c59b', secondary: '#ffe29a', fog: '#c6e8ef' },
  { id: 'frozen-docks', name: 'Frozen Docks', sky: '#bac9fb', floor: '#63b7f5', edge: '#3978d0', accent: '#ff9acb', secondary: '#ffdf69', fog: '#d0defa' },
  { id: 'desert-ruins', name: 'Desert Ruins', sky: '#f9d0a4', floor: '#ffad59', edge: '#db7742', accent: '#57d1ce', secondary: '#de9cf5', fog: '#f9e0c4' },
  { id: 'neon-factory', name: 'Neon Factory', sky: '#343364', floor: '#9a73ff', edge: '#5f39b8', accent: '#fa5eac', secondary: '#5eefd0', fog: '#55527e' },
];

export const SECTION_TYPES = ['runway', 'bridge', 'split', 'stones', 'seesaw', 'ice', 'conveyor', 'turntables', 'false-floor'];
export const OBSTACLE_TYPES = ['spinner', 'pendulum', 'sliding-wall', 'bumper', 'hammer', 'piston', 'roller', 'windmill', 'doors', 'flipper', 'cannonball', 'fruit', 'log', 'timed-gate', 'jump-pad'];

function platform(id, x, top, z, width, length, color, extra = {}) {
  return { id, position: [x, top - 0.6, z], size: [width, 1.2, length], rotation: [0, 0, 0], color, ...extra };
}

/** Compose reproducible courses locally, without model calls or asset downloads.
 * A shuffled recipe deck prevents repeated race families within a tournament.
 * Geometry, palette, obstacle placement and timing all derive from the seed.
 */
export function generateMap({ seed = 'rumble', round = 0, type = 'race', difficulty = 0.4, variant, course, raceIndex = Math.floor(round / 2), sequence = null, themeId = null } = {}) {
  if (!['race', 'survival', 'final'].includes(type)) throw new Error('Unknown map type');
  if (!Number.isInteger(round) || round < 0 || round > 63) throw new Error('Invalid round');
  difficulty = Math.max(0, Math.min(1, Number(difficulty) || 0));
  seed = String(seed);
  const rng = random(seed + ':' + round + ':' + type + ':' + (course || '') + ':' + (variant || ''));
  const finale = type === 'final' ? variant || random(seed + ':finale').pick(FINAL_TYPES) : null;
  if (finale && !FINAL_TYPES.includes(finale)) throw new Error('Unknown final variant');
  const mode = type === 'survival' || (finale && finale !== 'crown-climb') ? 'survival' : 'race';
  const palette = (random(seed).int(0, THEMES.length - 1) + round * 3) % THEMES.length;
  const theme = { ...THEMES.find(t => t.id === themeId) || THEMES[palette] };
  const map = { version: 2, seed, round, type, mode, finale, difficulty, theme, platforms: [], hazards: [], checkpoints: [], sections: [], spawn: [], finish: null };
  let serial = 0;
  const hazard = data => map.hazards.push({ id: 'h' + serial++, phase: rng.range(0, Math.PI * 2), ...data });

  if (mode === 'survival') {
    if (course) throw new Error('Course recipes apply to races and crown climbs');
    const deck = shuffle(SURVIVAL_TYPES, random(seed + ':survival-deck'));
    map.variant = finale === 'last-tiles' ? 'tilefall' : finale === 'last-spinner' ? 'sweeper' : variant || deck[Math.floor(round / 2) % deck.length];
    const recipe = SURVIVAL_RECIPES[map.variant];
    if (!recipe) throw new Error('Unknown survival variant');
    map.name = finale === 'last-tiles' ? 'Last Hex Standing' : finale === 'last-spinner' ? 'Crown Carousel' : recipe.name;
    map.objective = recipe.objective + (finale ? ' Last bean standing wins!' : '');
    map.family = map.variant;
    const tilefall = map.variant === 'tilefall', slime = map.variant === 'rising-slime';
    map.killY = tilefall ? -15 : -14;
    if (tilefall) {
      const spacing = 2.05, radius = 1.99;
      for (let layer = 0; layer < 3; layer++) {
        for (let q = -3; q <= 3; q++) for (let r = -3; r <= 3; r++) {
          if (Math.abs(q + r) > 3) continue;
          const x = Math.sqrt(3) * spacing * (q + r / 2), z = 1.5 * spacing * r;
          map.platforms.push(platform('hex-' + layer + '-' + q + '-' + r, x, -layer * 4, z, radius * 2, radius * 2, [theme.floor, theme.secondary, theme.accent][layer], {
            shape: 'hex', sides: 6, radius, fallOnTouch: true, collapseDelay: 0.65, tile: true,
          }));
        }
      }
    } else if (map.variant === 'carousel') {
      map.platforms.push(platform('hub', 0, 0, 0, 9, 9, theme.floor, { shape: 'disc', radius: 4.5, turntable: 0.5 }));
      const order = shuffle([0, 1, 2, 3, 4, 5], rng);
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3;
        map.platforms.push(platform('orbit-' + i, Math.cos(a) * 8.2, 0, Math.sin(a) * 8.2, 8.4, 8.4, i % 2 ? theme.secondary : theme.floor, {
          shape: 'disc', radius: 4.2, turntable: (i % 2 ? 1 : -1) * (0.45 + difficulty * 0.3), collapseAt: 32 + order[i] * 4,
        }));
      }
      hazard({ kind: 'spinner', position: [0, 0.6, 0], size: [22, 0.5, 0.6], speed: 0.55 + difficulty * 0.4, color: theme.accent });
    } else {
      const outerOrder = shuffle(Array.from({ length: 16 }, (_, i) => i), rng);
      let outer = 0, inner = 0;
      for (let x = -2; x <= 2; x++) for (let z = -2; z <= 2; z++) {
        const ring = Math.max(Math.abs(x), Math.abs(z));
        const collapseAt = map.variant === 'sweeper' ? (ring === 2 ? 20 + outerOrder[outer++] * 1.3 : ring === 1 ? 49 + inner++ * 1.3 : null) : null;
        map.platforms.push(platform('tile-' + x + '-' + z, x * 5, slime ? (2 - ring) * 1.1 : 0, z * 5, 5, 5, (x + z) % 2 ? theme.floor : theme.secondary, { collapseAt, tile: true }));
      }
      if (map.variant === 'sweeper' || slime) {
        hazard({ kind: 'spinner', position: [0, slime ? 2.75 : 0.58, 0], size: [24, 0.5, 0.58], speed: 0.65 + difficulty * 0.4, color: theme.accent });
        hazard({ kind: 'spinner', position: [0, slime ? 4.9 : 2.9, 0], size: [23, 0.6, 0.8], speed: -0.4 - difficulty * 0.3, color: theme.secondary });
      }
      if (map.variant === 'blockdash') {
        for (let wave = 0; wave < 3; wave++) {
          const gapX = rng.range(-6, 6), gap = 4.8 - difficulty * 0.4;
          const left = gapX - gap / 2 + 12.5, right = 12.5 - gapX - gap / 2;
          hazard({ kind: 'block-wall', position: [-12.5 + left / 2, 1.4, 0], size: [left, 2.8, 1], speed: 4.1 + difficulty, phase: wave * 12, color: theme.accent });
          hazard({ kind: 'block-wall', position: [12.5 - right / 2, 1.4, 0], size: [right, 2.8, 1], speed: 4.1 + difficulty, phase: wave * 12, color: theme.accent });
        }
      }
      if (slime) map.slime = { start: -2, speed: 0.065 };
    }
    // Spawns are placed inside real colliders, including the upper hex layer
    // and raised terraces, rather than on an arbitrary circle over gaps.
    const topLevel = Math.max(...map.platforms.map(p => p.position[1]));
    let pads = map.platforms.filter(p => !tilefall || p.position[1] === topLevel);
    pads = shuffle(pads, rng);
    for (let i = 0; i < 30; i++) {
      const p = pads[i % pads.length], visit = Math.floor(i / pads.length);
      const a = visit * 2.4 + (i % pads.length) * 0.1;
      const radius = pads.length < 10 ? 1.15 + visit * 0.18 : visit ? 1.1 : 0;
      map.spawn.push([p.position[0] + Math.cos(a) * radius, p.position[1] + 1.7, p.position[2] + Math.sin(a) * radius]);
    }
    map.length = 27;
  } else {
    const deck = shuffle(COURSES, random(seed + ':race-deck'));
    const recipe = course ? COURSES.find(c => c.id === course) : type === 'final' ? random(seed + ':crown-course').pick(COURSES.filter(c => ['summit-scramble', 'fan-foundry', 'gate-garden'].includes(c.id))) : deck[raceIndex % deck.length];
    if (!recipe) throw new Error('Unknown course recipe');
    if (type === 'race' && variant && !['meander', 'zigzag', 'switchback', 'straight'].includes(variant)) throw new Error('Unknown race layout');
    map.variant = type === 'race' && variant ? variant : rng.pick(recipe.layouts);
    map.family = recipe.id;
    map.name = type === 'final' ? 'Crown ' + recipe.name : recipe.name;
    map.objective = type === 'final' ? 'Reach the summit. Jump + E to grab the moving crown.' : recipe.objective;
    map.platforms.push(platform('start', 0, 0, 0, 20, 20, theme.floor));
    map.checkpoints.push({ x: 0, y: 1.1, z: 1, width: 20, index: 0 });
    for (let i = 0; i < 30; i++) map.spawn.push([(i % 6 - 2.5) * 2.25, 1.1, 2 + Math.floor(i / 6) * 1.45]);
    let end = 10, height = 0, centerX = 0;
    const segments = sequence?.length || (type === 'final' ? 8 : 7 + rng.int(0, 2));
    const order = shuffle(recipe.sections, rng), obstacleOrder = shuffle(recipe.obstacles, rng);
    const opener = {
      'pinwheel-park': ['turntables', 'spinner'], 'gate-garden': ['runway', 'timed-gate'],
      'fruit-freeway': ['conveyor', 'log'], 'tilt-trails': ['seesaw', 'spinner'],
      'fan-foundry': ['bridge', 'windmill'], 'summit-scramble': ['runway', 'piston'],
      'mirage-mile': ['false-floor', 'bumper'], 'spring-street': ['runway', 'jump-pad'],
    }[recipe.id];
    const guest = rng.pick(COURSES.filter(c => c.id !== recipe.id));
    const guestSlots = new Set([rng.int(2, 3), rng.int(5, segments - 1)]);
    map.remix = guest.name;
    for (let i = 0; i < segments; i++) {
      // Keep a clear central mechanic, with two guest sections. Remixing a
      // compatible module preserves safe landings better than scattering props.
      const guestSection = !sequence && guestSlots.has(i);
      let kind = guestSection ? rng.pick(guest.sections) : order[i % order.length];
      if (i === 0) kind = opener[0];
      if (i && kind === map.sections[i - 1].kind) kind = rng.pick(['runway', 'stones', 'split'].filter(k => k !== kind));
      if (sequence) kind = sequence[i].kind;
      const challenge = Math.min(1, difficulty * 0.7 + i / segments * 0.3);
      const gap = i > 0 && i % 3 === 0 ? rng.range(0.9, 1.3 + challenge * 0.3) : 0;
      const length = sequence?.[i].length || rng.range(21, 28), width = sequence?.[i].width || rng.range(16, 19);
      const rise = sequence?.[i].rise ?? (kind === 'turntables' ? 0 : type === 'final' ? rng.range(1.7, 2.6) : recipe.climb ? rng.range(1.2, 2.2) : i % 2 ? rng.range(0.7, 1.4) : 0);
      const shift = map.variant === 'zigzag' ? (i % 2 ? -5 : 5) : map.variant === 'switchback' ? (i < segments / 2 ? 4.5 : -4.5) : map.variant === 'straight' ? 0 : rng.range(-5, 5);
      centerX = Math.max(-16, Math.min(16, centerX + shift));
      const start = end + gap, center = start + length / 2;
      const color = i % 2 ? theme.secondary : theme.floor;
      const addSlab = (suffix, from, len, x, w, extra = {}) => {
        const y = height + rise * (from + len / 2) / length;
        const p = platform('s' + i + '-' + suffix, x, y, -(start + from + len / 2), w, Math.hypot(len, rise * len / length), color, { rotation: [Math.atan2(rise, length), 0, 0], ...extra });
        map.platforms.push(p);
        return p;
      };
      const entry = 4, exit = 4;
      if (['bridge', 'split', 'seesaw', 'turntables', 'false-floor'].includes(kind)) {
        addSlab('entry', 0, entry, centerX, width, { gapBefore: gap });
        addSlab('exit', length - exit, exit, centerX, width);
        if (kind === 'split') {
          for (const side of [-1, 1]) addSlab('lane' + side, entry, length - entry - exit, centerX + side * 5.4, 5.4);
        } else if (kind === 'turntables') {
          const radius = (length - entry - exit - 1) / 4;
          for (let j = 0; j < 2; j++) addSlab('disc' + j, entry + j * (radius * 2 + 1), radius * 2, centerX + (j ? 1.2 : -1.2), radius * 2, {
            radius, shape: 'disc', turntable: (j ? -1 : 1) * (0.6 + challenge * 0.35),
          });
        } else if (kind === 'false-floor') {
          const rows = 4, tileLength = (length - entry - exit) / rows, tileWidth = width / 4;
          let safeColumn = rng.int(1, 2);
          for (let row = 0; row < rows; row++) {
            safeColumn = Math.max(0, Math.min(3, safeColumn + rng.pick([-1, 0, 1])));
            for (let column = 0; column < 4; column++) addSlab('puzzle-' + row + '-' + column, entry + row * tileLength + 0.05, tileLength - 0.1, centerX + (column - 1.5) * tileWidth, tileWidth - 0.1, {
              fallOnTouch: column !== safeColumn, fragile: column !== safeColumn, collapseDelay: 0.23, tile: true,
            });
          }
        } else addSlab('middle', entry, length - entry - exit, centerX, kind === 'bridge' ? 5.6 - challenge : width - 1, { seesaw: kind === 'seesaw' });
      } else if (kind === 'stones') {
        const stepGap = 1 + challenge * 0.6, stoneLen = (length - 2 * stepGap) / 3;
        for (let j = 0; j < 3; j++) addSlab('stone' + j, j * (stoneLen + stepGap), stoneLen, centerX + (j === 1 ? rng.pick([-2, 2]) : 0), j === 0 || j === 2 ? width : 9, { gapBefore: j === 0 ? gap : stepGap });
      } else addSlab('full', 0, length, centerX, width, {
        gapBefore: gap, surface: kind, conveyor: kind === 'conveyor' ? [recipe.id === 'fruit-freeway' ? 0 : rng.pick([-2.5, 2.5]), 2.4 + challenge] : null,
      });
      map.sections.push({ kind, start, end: start + length, x: centerX, width, height, rise });
      map.checkpoints.push({ x: centerX, y: height + rise * 2 / length + 1.2, z: -(start + 2), width, index: i + 1 });

      let obstacle = guestSection ? rng.pick(guest.obstacles) : obstacleOrder[i % obstacleOrder.length];
      if (i === 0) obstacle = opener[1];
      if (kind === 'split') obstacle = 'pendulum';
      if (kind === 'stones') obstacle = recipe.id === 'spring-street' ? 'jump-pad' : 'roller';
      if (kind === 'bridge') obstacle = rng.pick(['hammer', 'windmill', 'pendulum']);
      if (['doors', 'timed-gate'].includes(obstacle) && kind === 'seesaw') obstacle = 'spinner';
      let pos = [centerX, height + rise / 2, -center], obstacleWidth = width;
      if (kind === 'turntables') {
        const disc = map.platforms.find(p => p.id === 's' + i + '-disc1');
        obstacle = 'spinner'; obstacleWidth = disc.radius * 2;
        pos = [disc.position[0], height, disc.position[2]];
      }
      if (kind === 'false-floor') {
        obstacle = 'bumper'; pos = [centerX, height + rise * (length - 2) / length, -(start + length - 2)];
      }
      if (sequence) obstacle = sequence[i].obstacle;
      const speed = (rng.range(0.65, 0.9) + challenge * 0.45) * (i === 0 ? 0.85 : 1);
      if (obstacle === 'spinner') hazard({ kind: obstacle, position: [pos[0], pos[1] + 0.65, pos[2]], size: [obstacleWidth - 1.2, 0.5, 0.65], speed: speed * rng.pick([-1, 1]), color: theme.accent });
      if (obstacle === 'pendulum') for (let j = 0; j < 2; j++) hazard({ kind: obstacle, position: [pos[0], pos[1] + 1.2, pos[2] + (j ? -3.5 : 3.5)], radius: 1.2, amplitude: width / 2 - 2, speed: speed * (j ? -1 : 1), color: theme.accent });
      if (obstacle === 'sliding-wall') hazard({ kind: obstacle, position: [pos[0], pos[1] + 1.05, pos[2]], size: [4.5, 2.1, 1.3], amplitude: width / 2 - 3, speed, color: theme.accent });
      if (obstacle === 'bumper') for (let b = -1; b <= 1; b++) hazard({ kind: obstacle, position: [pos[0] + b * 4, pos[1] + 0.85, pos[2] + (b === 0 ? 0.3 : -0.3)], radius: 1.1, color: theme.accent });
      if (obstacle === 'hammer') hazard({ kind: obstacle, position: [pos[0], pos[1] + 1.1, pos[2]], size: [2.8, 2.2, 2], arm: 5, speed, color: theme.accent });
      if (obstacle === 'piston') for (let j = -1; j <= 1; j++) hazard({ kind: obstacle, position: [pos[0] + j * 4.5, pos[1] + 1.05, pos[2]], size: [3.8, 2.1, 2.8], amplitude: 3.5, speed: speed * 1.5, color: theme.accent });
      if (['roller', 'cannonball', 'fruit', 'log'].includes(obstacle)) {
        const lanes = obstacle === 'log' ? [-1, 1] : [-1, 0, 1];
        for (const j of lanes) hazard({ kind: obstacle, position: [pos[0] + j * (obstacle === 'log' ? 4.5 : 2.5), pos[1] + 1.05, pos[2]], radius: obstacle === 'log' ? 1 : obstacle === 'fruit' ? 1.25 : 1, amplitude: Math.max(1, length / 2 - 6), slope: rise / length, speed: speed * 0.85, color: theme.accent });
      }
      if (obstacle === 'windmill') hazard({ kind: obstacle, position: [pos[0], pos[1] + 2.1, pos[2]], size: [8, 0.7, 0.8], speed: speed * 1.3, color: theme.accent });
      if (obstacle === 'doors' || obstacle === 'timed-gate') {
        const open = rng.int(0, 4), open2 = (open + rng.int(1, 4)) % 5, phase = rng.range(0, Math.PI * 2);
        for (let d = 0; d < 5; d++) hazard({ kind: obstacle === 'doors' ? 'door' : 'timed-gate', position: [pos[0] + (d - 2) * width / 5, pos[1] + 1.6, pos[2]], size: [width / 5 - 0.06, 3.2, 0.45], breakable: d === open || d === open2, speed, amplitude: 4.2, phase: phase + d * Math.PI * 2 / 5, color: theme.accent });
      }
      if (obstacle === 'flipper' || obstacle === 'jump-pad') for (const side of [-1, 1]) hazard({ kind: obstacle, position: [pos[0] + side * 3.2, pos[1] + (obstacle === 'jump-pad' ? 0.12 : 0.3), pos[2]], size: [3.5, obstacle === 'jump-pad' ? 0.22 : 0.45, 2], speed: speed * 1.5, color: theme.accent });
      // Later rounds add a separated second timing challenge on broad floors.
      // Entry/checkpoint zones and narrow jumps remain clear.
      if (challenge > 0.45 && ['runway', 'ice', 'conveyor'].includes(kind) && i % 2 === 0 && !['piston', 'roller', 'cannonball', 'fruit', 'log'].includes(obstacle)) {
        hazard({ kind: 'spinner', position: [centerX, height + rise * 0.78 + 0.6, -(start + length * 0.78)], size: [width * 0.62, 0.45, 0.55], speed: -speed * 0.72, color: theme.secondary });
      }
      map.sections.at(-1).obstacle = obstacle;
      map.sections.at(-1).guest = guestSection;
      end = start + length; height += rise;
    }
    const finishZ = -(end + 7);
    map.platforms.push(platform('finish', centerX, height, finishZ, 18, 14, theme.floor));
    map.finish = { x: centerX, y: height + (type === 'final' ? 2 : 1), z: finishZ, width: 16, crown: type === 'final' };
    map.length = -finishZ;
  }
  map.decor = random(seed + ':decor:' + round).pick(['clouds', 'crystals', 'balloons', 'towers']);
  validateMap(map);
  return map;
}

export function hazardTransform(h, time) {
  const [x, y, z] = h.position;
  const a = h.phase + time * (h.speed || 0);
  if (h.kind === 'timed-gate') return { position: [x, y + (1 + Math.sin(a)) * h.amplitude / 2, z], rotation: [0, 0, 0], velocity: [0, Math.cos(a) * h.speed * h.amplitude / 2, 0], angular: [0, 0, 0] };
  if (h.kind === 'spinner') return { position: [x, y, z], rotation: [0, a, 0], velocity: [0, 0, 0], angular: [0, h.speed, 0] };
  if (h.kind === 'pendulum') return { position: [x + Math.sin(a) * h.amplitude, y + (1 - Math.cos(a * 2)) * 0.55, z], rotation: [0, 0, 0], velocity: [Math.cos(a) * h.amplitude * h.speed, Math.sin(a * 2) * 1.1 * h.speed, 0], angular: [0, 0, 0] };
  if (h.kind === 'sliding-wall') return { position: [x + Math.sin(a) * h.amplitude, y, z], rotation: [0, 0, 0], velocity: [Math.cos(a) * h.amplitude * h.speed, 0, 0], angular: [0, 0, 0] };
  if (h.kind === 'hammer') {
    const swing = Math.sin(a) * 1.1, ds = Math.cos(a) * h.speed * 1.1;
    return { position: [x + Math.sin(swing) * h.arm, y + h.arm * (1 - Math.cos(swing)), z], rotation: [0, 0, -swing], velocity: [Math.cos(swing) * ds * h.arm, Math.sin(swing) * ds * h.arm, 0], angular: [0, 0, -ds] };
  }
  if (h.kind === 'piston') return { position: [x, y + (1 + Math.sin(a)) * h.amplitude / 2, z], rotation: [0, 0, 0], velocity: [0, Math.cos(a) * h.speed * h.amplitude / 2, 0], angular: [0, 0, 0] };
  if (h.kind === 'roller') {
    const shift = Math.sin(a) * h.amplitude, v = Math.cos(a) * h.speed * h.amplitude;
    return { position: [x, y - shift * h.slope, z + shift], rotation: [a * 3, 0, 0], velocity: [0, -v * h.slope, v], angular: [h.speed * 3, 0, 0] };
  }
  if (h.kind === 'cannonball' || h.kind === 'fruit') {
    const shift = Math.sin(a) * h.amplitude, v = Math.cos(a) * h.speed * h.amplitude;
    return { position: [x + (h.kind === 'fruit' ? Math.sin(a * 0.7) * 1.8 : 0), y - shift * h.slope, z + shift], rotation: [a * 2.2, a * 1.1, a], velocity: [h.kind === 'fruit' ? Math.cos(a * 0.7) * 1.26 * h.speed : 0, -v * h.slope, v], angular: [h.speed * 2.2, h.speed * 1.1, h.speed] };
  }
  if (h.kind === 'log') {
    const shift = Math.sin(a) * h.amplitude, v = Math.cos(a) * h.speed * h.amplitude;
    return { position: [x, y - shift * h.slope, z + shift], rotation: [a * 2.8, 0, 0], velocity: [0, -v * h.slope, v], angular: [h.speed * 2.8, 0, 0] };
  }
  if (h.kind === 'windmill') return { position: [x, y, z], rotation: [0, 0, a], velocity: [0, 0, 0], angular: [0, 0, h.speed] };
  if (h.kind === 'flipper') return { position: [x, y, z], rotation: [Math.sin(a) * 0.6, 0, 0], velocity: [0, 0, 0], angular: [Math.cos(a) * h.speed * 0.6, 0, 0] };
  if (h.kind === 'block-wall') return { position: [x, y, -18 + (h.phase + time * h.speed) % 36], rotation: [0, 0, 0], velocity: [0, 0, h.speed], angular: [0, 0, 0] };
  return { position: [x, y, z], rotation: [0, 0, 0], velocity: [0, 0, 0], angular: [0, 0, 0] };
}

export function crownHeight(map, time) { return map.finish.y + Math.sin(time * 1.6) * 0.55; }
