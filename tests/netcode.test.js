import test from 'node:test';
import assert from 'node:assert/strict';
import { samplePlayers, renderLocal } from '../client/netcode.js';

const row = (x, vx, tp = 0) => ({ id: 'a', p: [x, 0, 0], v: [vx, 0, 0], f: 0, tp });
test('snapshot interpolation is bounded at collisions and never rewinds a respawn', () => {
  const queue = [{ at: 0, players: [row(0, 20)] }, { at: 50, players: [row(0.1, -20)] }];
  for (let at = 0; at <= 50; at++) {
    const x = samplePlayers(queue, at, 0).get('a').p[0];
    assert.ok(x >= 0 && x <= 0.1);
  }
  queue[1].players[0] = row(-30, 0, 1);
  assert.equal(samplePlayers(queue, 25, 0).get('a').p[0], -30);
});

test('a delayed connection extrapolates only briefly before holding position', () => {
  const queue = [{ at: 100, players: [row(10, 10)] }];
  assert.equal(samplePlayers(queue, 150, 0).get('a').p[0], 10.5);
  assert.equal(samplePlayers(queue, 5000, 0).get('a').p[0], 10.75);
  assert.equal(samplePlayers(queue, 0, 0).get('a').p[0], 10);
});

test('local rendering interpolates fixed ticks at higher display refresh rates', () => {
  const bean = { body: { position: { x: 2, y: 1, z: 0 }, previousPosition: { x: 0, y: 1, z: 0 } } };
  assert.deepEqual(renderLocal(bean, 0.25, [0, 0, 0]), [0.5, 1, 0]);
  assert.deepEqual(renderLocal(bean, 0.75, [0.1, 0, 0]), [1.6, 1, 0]);
});
