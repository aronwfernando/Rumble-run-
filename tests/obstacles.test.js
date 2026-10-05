import test from 'node:test';
import assert from 'node:assert/strict';
import * as CANNON from 'cannon-es';
import { generateMap } from '../shared/maps.js';
import { PhysicsWorld } from '../shared/physics.js';

test('stepping on a hex tile removes its collider after the warning interval', () => {
  const map = generateMap({ type: 'survival', variant: 'tilefall', seed: 'feet' });
  const world = new PhysicsWorld(map), position = map.spawn[0];
  const tile = [...world.platforms.values()].find(p => p.data.position[0] === position[0] && p.data.position[2] === position[2] && p.data.position[1] === -0.6);
  const bean = world.addPlayer('bean', position);
  for (let i = 0; i < 90; i++) world.step();
  assert.ok(tile.dropAt > 0);
  assert.equal(tile.removed, true);
  assert.ok(bean.body.position.y < 0);
});

test('spinning decks carry standing players sideways', () => {
  const map = generateMap({ type: 'survival', variant: 'carousel' });
  map.hazards = [];
  const world = new PhysicsWorld(map), bean = world.addPlayer('bean', [2, 1.1, 0]);
  for (let i = 0; i < 90; i++) world.step();
  assert.ok(bean.body.position.z < -0.6);
  assert.ok(bean.body.position.y > 0.6);
});

test('spring pads launch players without an input or a power-up', () => {
  const map = generateMap({ seed: 'spring-check', course: 'spring-street' });
  const pad = map.hazards.find(h => h.kind === 'jump-pad');
  assert.ok(pad);
  const world = new PhysicsWorld(map);
  const bean = world.addPlayer('bean', [pad.position[0], pad.position[1] + 1.1, pad.position[2]]);
  let launchSpeed = 0;
  for (let i = 0; i < 45; i++) { world.step(); launchSpeed = Math.max(launchSpeed, bean.body.velocity.y); }
  assert.ok(launchSpeed > 10);
});

test('rolling log collisions cover the visible ends of the log', () => {
  const map = generateMap({ seed: 'log-check', course: 'fruit-freeway' });
  const world = new PhysicsWorld(map);
  const log = [...world.hazards.values()].find(h => h.data.kind === 'log');
  assert.ok(log);
  const pos = log.body.position, ray = new CANNON.RaycastResult();
  world.world.raycastClosest(new CANNON.Vec3(pos.x + log.data.radius * 2, pos.y + 3, pos.z), new CANNON.Vec3(pos.x + log.data.radius * 2, pos.y - 1, pos.z), { collisionFilterMask: 1 }, ray);
  assert.equal(ray.body?.hazard?.id, log.data.id);
});

test('server correction restores a tile that a client predicted would fall too early', () => {
  const world = new PhysicsWorld(generateMap({ type: 'survival', variant: 'tilefall' }));
  const tile = [...world.platforms.values()][0];
  tile.dropAt = 0.1;
  world.step(new Map(), 0.2);
  assert.equal(tile.removed, true);
  world.syncEnvironment({ broken: [], platforms: [{ id: tile.data.id, a: 0, dropAt: null }] });
  assert.equal(tile.removed, false);
  assert.ok(world.world.bodies.includes(tile.body));
});
