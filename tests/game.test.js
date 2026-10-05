import test from 'node:test';
import assert from 'node:assert/strict';
import { Tournament } from '../server/tournament.js';
import { cleanInput, cleanName, cleanSettings } from '../server/validation.js';
import { generateMap, FINAL_TYPES, crownHeight } from '../shared/maps.js';

test('lobby requires two human players and supports 4–8 rounds', () => {
  const room = new Tournament('ABC123', { rounds: 4, seed: 'x' });
  const host = room.addHuman({ name: 'A', color: '#ff658c' });
  assert.throws(() => room.start(host.id), /friend/);
  const friend = room.addHuman({ name: 'B', color: '#6de8ce' });
  room.start(host.id);
  assert.equal(room.phase, 'countdown');
  assert.equal(room.settings.rounds, 4);
  assert.equal(room.players.size, 2);
  assert.equal(room.map.type, 'race');
  assert.equal(friend.name, 'B');
});
test('input validation bounds movement and rejects malformed data', () => {
  assert.deepEqual(cleanInput({ seq: 1, x: 20, z: 0, jump: 1, dive: 0, grab: 0 }).x, 1);
  assert.equal(cleanInput({ seq: 1, x: 'bad', z: 0, jump: 1, dive: 0, grab: 0 }), null);
  assert.equal(cleanName('<script>'), 'script');
  assert.equal(cleanSettings({ rounds: 99 }).rounds, 8);
});
test('server round progression changes map and keeps humans only', () => {
  const room = new Tournament('TEST00', { rounds: 4, seed: 'flow' });
  const a = room.addHuman({ name: 'A', color: '#ff658c' });
  room.addHuman({ name: 'B', color: '#6de8ce' });
  room.start(a.id);
  assert.equal([...room.players.values()].some(p => p.bot), false);
  for (let i = 0; i < 180; i++) room.step();
  assert.ok(room.map);
  assert.ok(['countdown', 'playing', 'results', 'finished'].includes(room.phase));
});

test('eight-round match transitions match the lobby course preview', () => {
  const room = new Tournament('EIGHT0', { rounds: 8, seed: 'full-match', timings: { countdown: 0, intermission: 0, raceSeconds: 0.05, survivalSeconds: 0.05, finalSeconds: 0.05 } });
  const a = room.addHuman({ name: 'Host', color: '#ff658c' });
  room.addHuman({ name: 'Friend', color: '#6de8ce' });
  const preview = room.state().courses;
  const visited = new Map();
  room.start(a.id);
  for (let i = 0; i < 300 && room.phase !== 'finished'; i++) {
    if (room.map) visited.set(room.round, room.map.name);
    room.step();
  }
  assert.equal(room.phase, 'finished');
  assert.equal(visited.size, 8);
  assert.deepEqual([...visited.values()], preview.map(course => course.name));
  assert.ok(room.winner);
});

for (const variant of FINAL_TYPES) test('final declares an authoritative winner: ' + variant, () => {
  const room = new Tournament('FINAL0', { rounds: 4, timings: { countdown: 0 } });
  const host = room.addHuman({ name: 'Host', color: '#ff658c' });
  const friend = room.addHuman({ name: 'Friend', color: '#6de8ce' });
  room.courseDeck[3] = generateMap({ seed: 'final-proof', round: 3, type: 'final', variant });
  room.round = 3; room.beginRound(); room.step();
  if (variant === 'crown-climb') {
    const f = room.map.finish;
    host.checkpoint = room.map.checkpoints.length - 1;
    room.physics.teleport(host.id, [f.x, crownHeight(room.map, room.time), f.z - 0.1]);
    room.receiveInput(host.id, { seq: 1, x: 0, z: 0, jump: 0, dive: 0, grab: 1 }, room.roundKey);
  } else room.physics.teleport(friend.id, [0, -50, 0]);
  room.step();
  assert.equal(room.phase, 'finished');
  assert.equal(room.winner, host.id);
});

test('two friends can fall in an early survival round without ending their tournament', () => {
  const room = new Tournament('DUEL00', { rounds: 6, timings: { countdown: 0 } });
  const host = room.addHuman({ name: 'Host', color: '#ff658c' });
  const friend = room.addHuman({ name: 'Friend', color: '#6de8ce' });
  room.courseDeck[1] = generateMap({ type: 'survival', variant: 'tilefall' });
  room.round = 1; room.beginRound(); room.step();
  room.physics.teleport(host.id, [0, -50, 0]);
  room.physics.teleport(friend.id, [0, -50, 0]);
  room.step();
  assert.equal(room.phase, 'playing');
  assert.equal(room.competitors.length, 2);
  assert.equal(host.falls, 1);
  assert.equal(friend.falls, 1);
  assert.ok(room.physics.players.get(host.id).body.position.y > room.map.killY);
});

test('checkpoint reset is authoritative, counted, rate-limited, and unavailable in survival', () => {
  const room = new Tournament('RESET0', { timings: { countdown: 0 } });
  const a = room.addHuman({ name: 'A' }); room.addHuman({ name: 'B' });
  const events = []; room.on('player-event', event => events.push(event));
  room.start(a.id); room.step();
  const checkpoint = room.map.checkpoints[1]; a.checkpoint = 1;
  room.resetCheckpoint(a.id);
  assert.equal(a.falls, 1);
  assert.ok(room.snapshot().players.find(p => p.id === a.id).respawnLeft > 0);
  assert.equal(room.physics.snapshot(a.id).p[0], Math.round(checkpoint.x * 1000) / 1000);
  assert.equal(events.at(-1).type, 'respawn');
  assert.throws(() => room.resetCheckpoint(a.id), /moment/);
  room.round = 1; room.beginRound(); room.step();
  assert.throws(() => room.resetCheckpoint(a.id), /racing/);
});

test('survival elimination emits reliable feedback before transitioning rounds', () => {
  const room = new Tournament('OUT000', { rounds: 4, timings: { countdown: 0 } });
  const players = Array.from({ length: 4 }, (_, i) => room.addHuman({ name: 'Bean' + i }));
  room.round = 1; room.beginRound(); room.step();
  const events = []; room.on('player-event', event => events.push(event));
  room.physics.teleport(players[0].id, [0, -50, 0]); room.step();
  assert.equal(events[0].type, 'eliminated');
  assert.equal(events[0].id, players[0].id);
  assert.equal(room.players.get(players[0].id).status, 'eliminated');
  assert.equal(room.physics.players.has(players[0].id), false);
});

test('race-only tournaments have unique race families and difficulty options affect hazards', () => {
  const normal = new Tournament('RACES0', { seed: 'playlist-test', rounds: 8, playlist: 'races' });
  assert.equal(new Set(normal.courseDeck.slice(0, -1).map(m => m.family)).size, 7);
  assert.ok(normal.courseDeck.every(m => m.mode === 'race'));
  assert.equal(normal.courseDeck.at(-1).finale, 'crown-climb');
  const hard = new Tournament('HARD00', { seed: 'playlist-test', rounds: 8, playlist: 'races', difficulty: 'hard' });
  assert.ok(hard.courseDeck[0].difficulty > normal.courseDeck[0].difficulty);
  assert.equal(cleanSettings({ difficulty: 'broken', playlist: 'broken' }).difficulty, 'normal');
});
