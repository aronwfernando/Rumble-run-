import test from 'node:test';
import assert from 'node:assert/strict';
import { PhysicsWorld } from '../shared/physics.js';
import { DT, RULES } from '../shared/config.js';

const floor = { id: 'floor', position: [0, -0.6, 0], size: [100, 1.2, 300], rotation: [0, 0, 0] };
function arena(extra = []) {
  const world = new PhysicsWorld({ platforms: [floor, ...extra], hazards: [] });
  const bean = world.addPlayer('bean', [0, 1.1, 1]);
  for (let i = 0; i < 30; i++) world.step();
  return { world, bean };
}
const advance = (world, ticks, input) => { for (let i = 0; i < ticks; i++) world.step(new Map([['bean', typeof input === 'function' ? input(i) : input]])); };

test('holding movement into a tall wall never suspends the player in mid-air', () => {
  const { world, bean } = arena([{ id: 'wall', position: [0, 4, -5], size: [50, 8, 1], rotation: [0, 0, 0] }]);
  advance(world, 210, i => ({ x: 0, z: -1, jump: i === 70 }));
  assert.ok(bean.body.position.y < 0.85, 'the bean must fall back to the floor');
  assert.ok(bean.grounded);
  assert.ok(bean.body.position.z > -4.5, 'the wall must still block forward movement');
  advance(world, 25, { x: 1, z: 0 });
  assert.ok(bean.body.position.x > 2, 'the bean can steer away from a wall');
});

test('normal and diagonal acceleration cover the same distance', () => {
  const straight = arena(), diagonal = arena();
  advance(straight.world, 12, { x: 1, z: 0 });
  advance(diagonal.world, 12, { x: Math.SQRT1_2, z: -Math.SQRT1_2 });
  const a = straight.bean.body.position, b = diagonal.bean.body.position;
  assert.ok(Math.abs(a.x - Math.hypot(b.x, b.z - 1)) < 0.02);
  advance(straight.world, 18, { x: 0, z: 0 });
  assert.ok(Math.abs(straight.bean.body.velocity.x) < 0.05, 'release has a controlled stop');
});

test('a buffered jump fires once on landing', () => {
  const { world, bean } = arena();
  world.teleport('bean', [0, 1.6, 1]); bean.body.velocity.y = -5;
  advance(world, 12, i => ({ jump: i === 0 }));
  assert.ok(bean.body.velocity.y > 5, 'early jump press should survive until the landing');
  advance(world, 110, {});
  assert.ok(bean.grounded, 'the buffered press must not auto-repeat');
});

test('coyote jump works just beyond an edge but not after the window', () => {
  for (const [ticks, succeeds] of [[4, true], [12, false]]) {
    const { world, bean } = arena();
    bean.body.position.x = 51; bean.body.aabbNeedsUpdate = true;
    advance(world, ticks, {}); advance(world, 1, { jump: true });
    assert.equal(bean.body.velocity.y > 0, succeeds);
  }
});

test('an analog dive uses full momentum and cannot be repeated in mid-air', () => {
  const { world, bean } = arena();
  world.teleport('bean', [0, 100, 0]);
  advance(world, 1, { x: 0.3, z: -0.3, dive: true });
  assert.ok(Math.hypot(bean.body.velocity.x, bean.body.velocity.z) > RULES.diveSpeed - 0.1);
  advance(world, Math.ceil(RULES.diveCooldown / DT) + 2, {});
  const cooldown = bean.nextDive;
  advance(world, 1, { x: 0, z: -1, dive: true });
  assert.equal(bean.nextDive, cooldown);
  assert.ok(bean.body.velocity.y < 0);
});

test('overlapping players cannot trap one another', () => {
  const { world, bean } = arena();
  for (let i = 0; i < 12; i++) world.addPlayer('friend-' + i, [0, 1.1, -0.6 - i * 0.1]);
  advance(world, 70, { x: 0, z: -1 });
  assert.ok(bean.body.position.z < -8);
});

test('a small floor seam and shallow ramp remain traversable', () => {
  const ramp = { id: 'ramp', position: [0, 0.18, -8], size: [12, 1.2, 12], rotation: [0.08, 0, 0] };
  const { world, bean } = arena([ramp]);
  advance(world, 150, { x: 0, z: -1 });
  assert.ok(bean.body.position.z < -17);
  assert.ok(Number.isFinite(bean.body.position.y));
});

test('respawn clears stale dive and stun states', () => {
  const { world, bean } = arena();
  bean.diveUntil = 100; bean.stunUntil = 100; bean.airDiveUsed = true;
  world.teleport('bean', [0, 1.1, 1]);
  advance(world, 40, { x: 0, z: -1 });
  assert.ok(bean.body.position.z < -3);
  assert.equal(bean.stunUntil, 0);
});
