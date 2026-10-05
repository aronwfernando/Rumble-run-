import * as CANNON from 'cannon-es';
import { DT, RULES, EMPTY_INPUT } from './config.js';
import { hazardTransform } from './maps.js';

const vec = a => new CANNON.Vec3(...a);
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

/** One fixed-step world shared by the authoritative server and client prediction.
 * The client can predict only its own body; it never decides winners or sends poses.
 */
export class PhysicsWorld {
  constructor(map) {
    this.map = map;
    this.time = 0;
    this.world = new CANNON.World({ gravity: new CANNON.Vec3(0, RULES.gravity, 0), allowSleep: false });
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    this.world.solver.iterations = 8;
    this.world.defaultContactMaterial.friction = 0.02;
    this.world.defaultContactMaterial.restitution = 0.06;
    this.players = new Map();
    this.platforms = new Map();
    this.hazards = new Map();
    this.broken = new Set();
    this.pendingBreaks = new Set();
    for (const p of map.platforms) {
      const shape = p.radius ? new CANNON.Cylinder(p.radius, p.radius, p.size[1], p.sides || 12) : new CANNON.Box(vec(p.size.map(v => v / 2)));
      const body = new CANNON.Body({ mass: 0, type: p.seesaw || p.turntable ? CANNON.Body.KINEMATIC : CANNON.Body.STATIC, shape, position: vec(p.position), collisionFilterGroup: 1, collisionFilterMask: 2 });
      body.quaternion.setFromEuler(...p.rotation);
      body.platformId = p.id;
      this.world.addBody(body);
      this.platforms.set(p.id, { body, data: p, removed: false, angle: 0, dropAt: p.collapseAt ?? null });
    }
    for (const h of map.hazards) {
      const shape = h.kind === 'log' ? new CANNON.Cylinder(h.radius, h.radius, h.radius * 5.5, 10) : h.radius ? new CANNON.Sphere(h.radius) : new CANNON.Box(vec(h.size.map(v => v / 2)));
      const body = new CANNON.Body({ mass: 0, type: ['bumper', 'door', 'jump-pad'].includes(h.kind) ? CANNON.Body.STATIC : CANNON.Body.KINEMATIC, position: vec(h.position), collisionFilterGroup: 1, collisionFilterMask: 2 });
      const orientation = new CANNON.Quaternion();
      if (h.kind === 'log') orientation.setFromEuler(0, 0, Math.PI / 2);
      body.addShape(shape, new CANNON.Vec3(), orientation);
      body.hazard = h;
      this.world.addBody(body);
      this.hazards.set(h.id, { body, data: h });
    }
    this.updateEnvironment(0);
  }

  addPlayer(id, spawn, remote = false) {
    if (this.players.has(id)) return this.players.get(id);
    const body = new CANNON.Body({ mass: remote ? 0 : 1, type: remote ? CANNON.Body.KINEMATIC : CANNON.Body.DYNAMIC, fixedRotation: true, linearDamping: 0.04, position: vec(spawn), collisionFilterGroup: 2, collisionFilterMask: remote ? 0 : 3 });
    // Three overlapping spheres approximate a vertical capsule cheaply.
    for (const y of [-0.35, 0, 0.35]) body.addShape(new CANNON.Sphere(RULES.radius), new CANNON.Vec3(0, y, 0));
    body.updateMassProperties();
    const p = { id, body, remote, grounded: false, lastGround: -10, jumpBuffer: -10, diveUntil: 0, nextDive: 0, stunUntil: 0, lastHit: -10, hits: 0, face: 0, teleports: 0, ray: new CANNON.RaycastResult(), input: EMPTY_INPUT };
    body.addEventListener('collide', event => {
      const h = event.body.hazard;
      if (!h || remote || this.time - p.lastHit < 0.8) return;
      const impact = Math.abs(event.contact.getImpactVelocityAlongNormal());
      if (h.kind === 'door') {
        if (h.breakable && Math.hypot(body.velocity.x, body.velocity.z) > 4) this.pendingBreaks.add(h.id);
        return;
      }
      if (h.kind === 'flipper' || h.kind === 'jump-pad') {
        p.lastHit = this.time;
        body.velocity.y = h.kind === 'jump-pad' ? 12.5 : 11;
        body.velocity.z -= h.kind === 'jump-pad' ? 4 : 12;
        return;
      }
      if (impact < 1.6 && h.kind !== 'bumper') return;
      p.lastHit = this.time;
      p.hits++;
      p.stunUntil = this.time + 0.3;
      let dx = body.position.x - event.body.position.x;
      let dz = body.position.z - event.body.position.z;
      const l = Math.hypot(dx, dz) || 1;
      const kick = h.kind === 'bumper' ? 8 : 5;
      body.velocity.x += dx / l * kick;
      body.velocity.z += dz / l * kick;
      body.velocity.y = Math.max(body.velocity.y, 3.8);
    });
    this.players.set(id, p);
    this.world.addBody(body);
    return p;
  }

  removePlayer(id) {
    const p = this.players.get(id);
    if (p) this.world.removeBody(p.body);
    this.players.delete(id);
  }

  teleport(id, position) {
    const p = this.players.get(id);
    if (!p) return;
    p.body.position.copy(vec(position));
    p.body.previousPosition.copy(p.body.position);
    p.body.interpolatedPosition.copy(p.body.position);
    p.body.velocity.set(0, 0, 0);
    p.body.angularVelocity.set(0, 0, 0);
    p.body.aabbNeedsUpdate = true;
    p.grounded = false;
    p.jumpBuffer = -10;
    p.lastGround = -10;
    p.diveUntil = 0;
    p.teleports++;
  }

  updateEnvironment(time) {
    for (const { body, data } of this.hazards.values()) {
      if (this.broken.has(data.id)) continue;
      const t = hazardTransform(data, time);
      body.position.copy(vec(t.position));
      body.quaternion.setFromEuler(...t.rotation);
      body.velocity.copy(vec(t.velocity));
      body.angularVelocity.copy(vec(t.angular));
      body.aabbNeedsUpdate = true;
    }
    for (const p of this.platforms.values()) {
      if (p.data.turntable && !p.removed) {
        p.body.quaternion.setFromEuler(0, time * p.data.turntable, 0);
        p.body.angularVelocity.set(0, p.data.turntable, 0);
        p.body.aabbNeedsUpdate = true;
      }
      if (p.data.seesaw && !p.removed) {
        let weight = 0, count = 0;
        for (const player of this.players.values()) {
          const pos = player.body.position;
          if (Math.abs(pos.z - p.body.position.z) < p.data.size[2] / 2 && Math.abs(pos.x - p.body.position.x) < p.data.size[0] / 2 && Math.abs(pos.y - p.body.position.y) < 3) { weight += pos.x - p.body.position.x; count++; }
        }
        const target = clamp(-(count ? weight / count : 0) * 0.055, -0.28, 0.28);
        const next = p.angle + (target - p.angle) * 0.025;
        p.body.quaternion.setFromEuler(p.data.rotation[0], 0, next);
        p.body.angularVelocity.set(0, 0, (next - p.angle) / DT);
        p.angle = next;
        p.body.aabbNeedsUpdate = true;
      }
      if (!p.removed && p.dropAt !== null && time >= p.dropAt) {
        this.world.removeBody(p.body);
        p.removed = true;
      }
    }
  }

  step(inputs = new Map(), time = this.time + DT) {
    this.time = time;
    this.updateEnvironment(time);
    for (const p of this.players.values()) {
      if (p.remote) continue;
      const b = p.body;
      const input = inputs.get(p.id) || EMPTY_INPUT;
      p.ray.reset();
      this.world.raycastClosest(b.position, new CANNON.Vec3(b.position.x, b.position.y - RULES.halfHeight - 0.13, b.position.z), { collisionFilterMask: 1, skipBackfaces: true }, p.ray);
      p.grounded = p.ray.hasHit && p.ray.hitNormalWorld.y > 0.5 && b.velocity.y < 2.5;
      if (p.grounded) p.lastGround = time;
      const floor = p.ray.hasHit ? this.platforms.get(p.ray.body?.platformId) : null;
      if (p.grounded && floor?.data.fallOnTouch && floor.dropAt === null) floor.dropAt = time + (floor.data.collapseDelay ?? 0.65);
      if (input.jump) p.jumpBuffer = time;
      if (time - p.jumpBuffer < 0.12 && time - p.lastGround < RULES.coyoteTime && time >= p.stunUntil) {
        b.velocity.y = RULES.jumpSpeed;
        p.jumpBuffer = -10;
        p.lastGround = -10;
        p.grounded = false;
      }
      let x = clamp(Number(input.x) || 0, -1, 1), z = clamp(Number(input.z) || 0, -1, 1);
      const len = Math.hypot(x, z);
      if (len > 1) { x /= len; z /= len; }
      if (len > 0.1) p.face = Math.atan2(-x, -z);
      if (input.dive && time >= p.nextDive && time >= p.stunUntil) {
        const fx = len > 0.1 ? x / Math.max(1, len) : -Math.sin(p.face);
        const fz = len > 0.1 ? z / Math.max(1, len) : -Math.cos(p.face);
        b.velocity.x = fx * RULES.diveSpeed;
        b.velocity.z = fz * RULES.diveSpeed;
        b.velocity.y = Math.max(b.velocity.y, 3.2);
        p.diveUntil = time + RULES.diveDuration;
        p.nextDive = time + RULES.diveCooldown;
      }
      if (time > p.diveUntil) {
        const ice = p.grounded && floor?.data.surface === 'ice';
        const belt = p.grounded ? floor?.data.conveyor || [0, 0] : [0, 0];
        const turn = p.grounded ? floor?.data.turntable || 0 : 0;
        const carryX = turn ? turn * (b.position.z - floor.body.position.z) : 0;
        const carryZ = turn ? -turn * (b.position.x - floor.body.position.x) : 0;
        const rate = (p.grounded ? RULES.acceleration : RULES.airAcceleration) * DT * (time < p.stunUntil ? 0.16 : 1) * (ice ? 0.19 : 1);
        b.velocity.x += clamp(x * RULES.speed + belt[0] + carryX - b.velocity.x, -rate, rate);
        b.velocity.z += clamp(z * RULES.speed + belt[1] + carryZ - b.velocity.z, -rate, rate);
      }
      const speed = Math.hypot(b.velocity.x, b.velocity.z);
      if (speed > 25) { b.velocity.x *= 25 / speed; b.velocity.z *= 25 / speed; }
      b.velocity.y = clamp(b.velocity.y, -45, 18);
    }
    this.world.step(DT);
    for (const id of this.pendingBreaks) {
      if (this.broken.has(id)) continue;
      this.broken.add(id);
      this.world.removeBody(this.hazards.get(id).body);
    }
    this.pendingBreaks.clear();
  }

  environmentSnapshot() {
    return { broken: [...this.broken], platforms: [...this.platforms.values()].filter(p => p.data.seesaw || p.data.fallOnTouch).map(p => ({ id: p.data.id, a: Math.round(p.angle * 1000) / 1000, dropAt: p.dropAt })) };
  }
  syncEnvironment(env) {
    if (!env) return;
    for (const id of env.broken) {
      if (!this.broken.has(id) && this.hazards.has(id)) this.world.removeBody(this.hazards.get(id).body);
      this.broken.add(id);
    }
    for (const state of env.platforms) {
      const p = this.platforms.get(state.id);
      if (!p) continue;
      p.angle = state.a;
      p.dropAt = state.dropAt;
      if (p.removed && (p.dropAt === null || p.dropAt > this.time)) {
        this.world.addBody(p.body);
        p.body.aabbNeedsUpdate = true;
        p.removed = false;
      }
    }
  }

  snapshot(id) {
    const p = this.players.get(id);
    if (!p) return null;
    const b = p.body;
    const q = n => Math.round(n * 1000) / 1000;
    return { id, p: [q(b.position.x), q(b.position.y), q(b.position.z)], v: [q(b.velocity.x), q(b.velocity.y), q(b.velocity.z)], f: q(p.face), g: p.grounded, d: q(Math.max(0, p.diveUntil - this.time)), c: q(Math.max(0, p.nextDive - this.time)), s: q(Math.max(0, p.stunUntil - this.time)), hits: p.hits, tp: p.teleports };
  }
}
