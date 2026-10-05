import test from 'node:test';
import assert from 'node:assert/strict';
import { generateMap, validateMap, COURSES, SURVIVAL_TYPES, FINAL_TYPES, hazardTransform } from '../shared/maps.js';
import { reachablePlatforms } from '../shared/map-validation.js';

test('same seed and round produces the same course', () => {
  const a = generateMap({ seed: 'same', round: 2, type: 'race' });
  const b = generateMap({ seed: 'same', round: 2, type: 'race' });
  assert.deepEqual(a, b);
});
test('different seeds change layout or palette', () => {
  const a = generateMap({ seed: 'alpha', round: 0, type: 'race' });
  const b = generateMap({ seed: 'bravo', round: 0, type: 'race' });
  assert.notDeepEqual({ theme: a.theme.name, sections: a.sections.map(s => s.kind), hazards: a.hazards.map(h => h.kind) }, { theme: b.theme.name, sections: b.sections.map(s => s.kind), hazards: b.hazards.map(h => h.kind) });
});
test('all round types remain validated and spawn 30 players', () => {
  for (const type of ['race', 'survival', 'final']) for (let round = 0; round < 8; round++) {
    const map = generateMap({ seed: `grid-${round}`, round, type, difficulty: round / 8 });
    assert.equal(validateMap(map), true);
    assert.equal(map.spawn.length, 30);
    assert.ok(map.platforms.length >= 1);
  }
});
test('survival variants cover the requested mechanics', () => {
  const variants = new Set();
  for (let i = 0; i < 40; i++) variants.add(generateMap({ seed: `variant-${i}`, round: 1, type: 'survival' }).variant);
  assert.deepEqual([...variants].sort(), ['blockdash', 'carousel', 'rising-slime', 'sweeper', 'tilefall']);
});

test('every course family keeps a permanent race route across seeds and difficulties', () => {
  for (const course of COURSES) for (let i = 0; i < 12; i++) {
    const map = generateMap({ seed: 'route-' + i, course: course.id, difficulty: (i % 3) / 2 });
    assert.equal(map.family, course.id);
    assert.ok(reachablePlatforms(map).has('finish'), course.id + ':' + i);
    assert.ok(JSON.stringify(map).length < 85000);
    for (const h of map.hazards) for (const time of [0, 7, 41]) {
      const pose = hazardTransform(h, time);
      assert.ok([...pose.position, ...pose.velocity, ...pose.rotation, ...pose.angular].every(Number.isFinite));
    }
  }
});

test('eight-round tournaments do not repeat race families or neighbouring palettes', () => {
  for (let i = 0; i < 30; i++) {
    const maps = Array.from({ length: 8 }, (_, round) => generateMap({ seed: 'deck-' + i, round, type: round === 7 ? 'final' : round % 2 ? 'survival' : 'race' }));
    assert.equal(new Set(maps.filter(m => m.type === 'race').map(m => m.family)).size, 4);
    assert.equal(new Set(maps.filter(m => m.type === 'survival').map(m => m.variant)).size, 3);
    for (let round = 1; round < maps.length; round++) assert.notEqual(maps[round].theme.name, maps[round - 1].theme.name);
  }
});

test('route validator rejects a disconnected finish and an unsupported checkpoint', () => {
  const map = generateMap({ seed: 'validation', course: 'mirage-mile' });
  assert.ok(map.platforms.some(p => p.fragile));
  assert.ok(reachablePlatforms(map).has('finish'));
  const badFinish = structuredClone(map);
  badFinish.platforms.find(p => p.id === 'finish').position[0] = 500;
  assert.throws(() => validateMap(badFinish), /permanent route/);
  const badCheckpoint = structuredClone(map);
  badCheckpoint.checkpoints[1].x = 500;
  assert.throws(() => validateMap(badCheckpoint), /reachable landing/);
});

test('timed gate rows always leave a lane with standing clearance', () => {
  const map = generateMap({ seed: 'gate-test', course: 'gate-garden' });
  const rows = new Map();
  for (const h of map.hazards.filter(h => h.kind === 'timed-gate')) {
    const row = rows.get(h.position[2]) || [];
    row.push(h); rows.set(h.position[2], row);
  }
  assert.ok(rows.size > 0);
  for (const row of rows.values()) for (let time = 0; time < 20; time += 0.1) {
    assert.ok(row.some(h => hazardTransform(h, time).position[1] - h.position[1] >= 1.8));
  }
});

test('hex survival has three real hexagonal layers and all final variants are available', () => {
  const hex = generateMap({ type: 'survival', variant: 'tilefall' });
  assert.equal(hex.platforms.length, 111);
  assert.ok(hex.platforms.every(p => p.shape === 'hex' && p.sides === 6 && p.fallOnTouch));
  assert.equal(new Set(hex.platforms.map(p => p.position[1])).size, 3);
  for (const variant of SURVIVAL_TYPES) assert.equal(generateMap({ type: 'survival', variant }).mode, 'survival');
  for (const variant of FINAL_TYPES) {
    const map = generateMap({ type: 'final', variant });
    assert.equal(map.type, 'final');
    assert.equal(map.mode, variant === 'crown-climb' ? 'race' : 'survival');
  }
});
