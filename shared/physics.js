import * as CANNON from 'cannon-es';
import { DT, RULES, EMPTY_INPUT } from './config.js';
import { hazardTransform } from './maps.js';

const vec = a => new CANNON.Vec3(...a);
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

/** One fixed-step world shared by the authoritative server and client prediction.
 * The client can predict only its own body; it never decides winners or sends poses.
 */
export class PhysicsWorld {
  constructor(map, { authoritative = true } = {}) {
    this.map = map;
    this.time = 0;
    this.world = new CANNON.World({ gravity: new CANNON.Vec3(0, RULES.gravity, 0), allowSleep: false });
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    this.world.solver.iterations = 10;
    // Horizontal grip is handled by the controller. Solver friction against
    // a wall can otherwise cancel gravity while the motor pushes into it.
    this.world.defaultContactMaterial.friction = 0;
    this.world.defaultContactMaterial.restitution = 0;
    this.players = new Map();
    this.platforms = new Map();
    this.hazards = new Map();
    this.objects = new Map();
    this.broken = new Set();
    this.pendingBreaks = new Set();
    for (const p of map.platforms) {
      const shape = p.radius ? new CANNON.Cylinder(p.radius, p.radius, p.size[1], p.sides || 12) : new CANNON.Box(vec(p.size.map(v => v / 2)));
      const body = new CANNON.Body({ mass: 0, type: p.seesaw || p.turntable || p.drum ? CANNON.Body.KINEMATIC : CANNON.Body.STATIC, position: vec(p.position), collisionFilterGroup: 1, collisionFilterMask: 6 });
      if (p.drum) {
        for (let i = 0; i < 20; i++) {
          if (i === p.drum.gap || i === p.drum.gap + 1) continue;
          const a = i / 20 * Math.PI * 2, q = new CANNON.Quaternion(); q.setFromEuler(a, 0, 0);
          body.addShape(new CANNON.Box(new CANNON.Vec3(p.drum.span / 2, 0.4, 0.64)), new CANNON.Vec3(0, Math.cos(a) * p.drum.radius, Math.sin(a) * p.drum.radius), q);
        }
      } else body.addShape(shape);
      body.quaternion.setFromEuler(...p.rotation);
      body.platformId = p.id;
      this.world.addBody(body);
      this.platforms.set(p.id, { body, data: p, removed: false, angle: 0, dropAt: p.collapseAt ?? null });
    }
    for (const h of map.hazards) {
      const shape = h.kind === 'log' ? new CANNON.Cylinder(h.radius, h.radius, h.radius * 5.5, 10) : h.radius ? new CANNON.Sphere(h.radius) : new CANNON.Box(vec(h.size.map(v => v / 2)));
      const body = new CANNON.Body({ mass: 0, type: ['bumper', 'door', 'jump-pad'].includes(h.kind) ? CANNON.Body.STATIC : CANNON.Body.KINEMATIC, position: vec(h.position), collisionFilterGroup: 1, collisionFilterMask: 6 });
      const orientation = new CANNON.Quaternion();
      if (h.kind === 'log') orientation.setFromEuler(0, 0, Math.PI / 2);
      body.addShape(shape, new CANNON.Vec3(), orientation);
      body.hazard = h;
      this.world.addBody(body);
      this.hazards.set(h.id, { body, data: h });
    }
    for (const item of map.items || []) if (!item.trigger) this.addObject(item, !authoritative);
    this.updateEnvironment(0);
  }

  addObject(data, remote = false) {
    const body = new CANNON.Body({ mass: remote ? 0 : data.mass || 1, type: remote ? CANNON.Body.KINEMATIC : CANNON.Body.DYNAMIC,
      shape: new CANNON.Sphere(data.radius || 0.5), position: vec(data.position), linearDamping: 0.35, angularDamping: 0.45,
      collisionFilterGroup: 4, collisionFilterMask: remote ? 2 : 7 });
    const object = { data, body, remote, owner: null, previousY: data.position[1] };
    this.world.addBody(body); this.objects.set(data.id, object); return object;
  }
  resetObject(id, position) {
    const object=this.objects.get(id); if(!object)return;
    object.body.position.set(...position); object.body.previousPosition.copy(object.body.position);
    object.body.velocity.set(0,0,0); object.body.angularVelocity.set(0,0,0); object.body.aabbNeedsUpdate=true;
    object.owner=null; object.body.collisionFilterMask=object.remote?2:7;
  }
  syncObjects(states = []) {
    for(const state of states) {
      const object=this.objects.get(state.id); if(!object||!state.p)continue;
      object.body.position.set(...state.p);object.body.velocity.set(...(state.v||[0,0,0]));
      object.body.aabbNeedsUpdate=true;object.owner=state.owner;object.body.collisionFilterMask=state.owner?0:2;
    }
  }
  setPlatformEnabled(id, enabled) {
    const p=this.platforms.get(id);if(!p)return;
    if(enabled&&p.removed){this.world.addBody(p.body);p.removed=false;p.body.aabbNeedsUpdate=true;}
    if(!enabled&&!p.removed){this.world.removeBody(p.body);p.removed=true;p.dropAt=this.time;}
    if(enabled)p.dropAt=null;
  }
  lineOfSight(from, to) {
    const ray=new CANNON.RaycastResult();
    this.world.raycastClosest(vec(from),vec(to),{collisionFilterMask:1,skipBackfaces:true},ray);
    return !ray.hasHit;
  }

  addPlayer(id, spawn, remote = false) {
    if (this.players.has(id)) return this.players.get(id);
    // Beans never hard-lock one another in a crowd. They still collide with
    // every course collider, while remote render-only bodies stay nonphysical.
    const body = new CANNON.Body({ mass: remote ? 0 : 1, type: remote ? CANNON.Body.KINEMATIC : CANNON.Body.DYNAMIC, fixedRotation: true, linearDamping: 0.015, position: vec(spawn), collisionFilterGroup: 2, collisionFilterMask: remote ? 0 : 5 });
    // Three overlapping spheres approximate a vertical capsule cheaply.
    for (const y of [-0.35, 0, 0.35]) body.addShape(new CANNON.Sphere(RULES.radius), new CANNON.Vec3(0, y, 0));
    body.updateMassProperties();
    const p = { id, body, remote, grounded: false, lastGround: -10, jumpBuffer: -10, diveUntil: 0, diveRecoveryUntil: 0, nextDive: 0, airDiveUsed: false, stunUntil: 0, respawnUntil: 0, lastHit: -10, hits: 0, face: 0, teleports: 0, ray: new CANNON.RaycastResult(), input: EMPTY_INPUT };
    body.addEventListener('collide', event => {
      const h = event.body.hazard;
      if (!h || remote || this.time < p.respawnUntil || this.time - p.lastHit < RULES.hitCooldown) return;
      const impact = Math.abs(event.contact.getImpactVelocityAlongNormal());
      if (h.kind === 'door') {
        if (h.breakable && Math.hypot(body.velocity.x, body.velocity.z) > 4) this.pendingBreaks.add(h.id);
        return;
      }
      if (h.kind === 'flipper' || h.kind === 'jump-pad') {
        p.lastHit = this.time;
        p.stunUntil = 0;
        body.velocity.y = h.kind === 'jump-pad' ? 12.5 : 11;
        body.velocity.z -= h.kind === 'jump-pad' ? 4 : 12;
        return;
      }
      if (impact < 1.6 && h.kind !== 'bumper') return;
      p.lastHit = this.time;
      p.hits++;
      p.stunUntil = this.time + RULES.stunDuration;
      p.diveUntil = this.time;
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
    p.diveRecoveryUntil = 0;
    p.airDiveUsed = false;
    p.stunUntil = 0;
    p.respawnUntil = this.time + RULES.respawnGrace;
    p.lastHit = this.time;
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
      if(p.data.drum&&!p.removed){p.body.quaternion.setFromEuler(time*p.data.drum.speed,0,0);p.body.angularVelocity.set(p.data.drum.speed,0,0);p.body.aabbNeedsUpdate=true;}
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
      p.input = input;
      p.ray.reset();
      this.world.raycastClosest(b.position, new CANNON.Vec3(b.position.x, b.position.y - RULES.halfHeight - 0.13, b.position.z), { collisionFilterMask: 1, skipBackfaces: true }, p.ray);
      p.grounded = p.ray.hasHit && p.ray.hitNormalWorld.y > 0.5 && b.velocity.y < 2.5;
      if (p.grounded) { p.lastGround = time; p.airDiveUsed = false; }
      const floor = p.ray.hasHit ? this.platforms.get(p.ray.body?.platformId) : null;
      if (p.grounded && floor?.data.fallOnTouch && floor.dropAt === null) floor.dropAt = time + (floor.data.collapseDelay ?? 0.65);
      if (input.jump) p.jumpBuffer = time;
      if (time - p.jumpBuffer < RULES.jumpBuffer && time - p.lastGround < RULES.coyoteTime && time >= p.stunUntil) {
        b.velocity.y = RULES.jumpSpeed;
        p.jumpBuffer = -10;
        p.lastGround = -10;
        p.grounded = false;
      }
      let x = clamp(Number(input.x) || 0, -1, 1), z = clamp(Number(input.z) || 0, -1, 1);
      const len = Math.hypot(x, z);
      if (len > 1) { x /= len; z /= len; }
      if (len > 0.1 && time >= p.diveUntil) p.face = Math.atan2(-x, -z);
      if (input.dive && !p.airDiveUsed && time >= p.nextDive && time >= p.stunUntil) {
        const directionLength = Math.hypot(x, z);
        const fx = len > 0.1 ? x / directionLength : -Math.sin(p.face);
        const fz = len > 0.1 ? z / directionLength : -Math.cos(p.face);
        b.velocity.x = fx * RULES.diveSpeed;
        b.velocity.z = fz * RULES.diveSpeed;
        b.velocity.y = Math.max(b.velocity.y, RULES.diveLift);
        p.diveUntil = time + RULES.diveDuration;
        p.diveRecoveryUntil = p.diveUntil + RULES.diveRecovery;
        p.nextDive = time + RULES.diveCooldown;
        p.airDiveUsed = true;
        p.face = Math.atan2(-fx, -fz);
      }
      if (time >= p.diveUntil) {
        const ice = p.grounded && floor?.data.surface === 'ice';
        const belt = p.grounded ? floor?.data.conveyor || [0, 0] : [0, 0];
        const turn = p.grounded ? floor?.data.turntable || 0 : 0;
        const carryX = turn ? turn * (b.position.z - floor.body.position.z) : 0;
        const carryZ = turn ? -turn * (b.position.x - floor.body.position.x) : p.grounded && floor?.data.drum ? floor.data.drum.speed * (b.position.y-floor.body.position.y) : 0;
        const moving = len > 0.1;
        const baseRate = p.grounded
          ? (moving ? RULES.acceleration : RULES.deceleration)
          : (moving ? RULES.airAcceleration : RULES.airDeceleration);
        const surfaceRate = ice ? (moving ? RULES.iceAcceleration : RULES.iceDeceleration) : baseRate;
        const stunControl = time < p.stunUntil ? 0.16 : 1;
        const recoveryControl = time < p.diveRecoveryUntil ? 0.38 : 1;
        const rate = surfaceRate * DT * stunControl * recoveryControl;
        const speedScale = (p.grounded && floor?.data.surface === 'mud' ? 0.55 : 1) * (p.speedScale || 1);
        const targetX = x * RULES.speed * speedScale + belt[0] + carryX;
        const targetZ = z * RULES.speed * speedScale + belt[1] + carryZ;
        const changeX = targetX - b.velocity.x, changeZ = targetZ - b.velocity.z;
        const steering = Math.min(1, rate / (Math.hypot(changeX, changeZ) || 1));
        b.velocity.x += changeX * steering;
        b.velocity.z += changeZ * steering;

      }
      const speed = Math.hypot(b.velocity.x, b.velocity.z);
      if (speed > RULES.maxSpeed) { b.velocity.x *= RULES.maxSpeed / speed; b.velocity.z *= RULES.maxSpeed / speed; }
      b.velocity.y = clamp(b.velocity.y, -45, 18);
    }
    // Bounded impulses separate crowds without a rigid pileup or door jam.
    const crowd=[...this.players.values()];
    for(let i=0;i<crowd.length;i++)for(let j=i+1;j<crowd.length;j++){
      const a=crowd[i],b=crowd[j];if(a.remote&&b.remote)continue;
      let dx=a.body.position.x-b.body.position.x,dz=a.body.position.z-b.body.position.z,d=Math.hypot(dx,dz);
      if(d>=0.84||Math.abs(a.body.position.y-b.body.position.y)>1.25)continue;
      const overlap=0.84-d;if(d<0.001){dx=a.id<b.id?1:-1;dz=0;d=1;}
      const impulse=Math.min(0.065,overlap*0.12);
      if(!a.remote){a.body.velocity.x+=dx/d*impulse;a.body.velocity.z+=dz/d*impulse;}
      if(!b.remote){b.body.velocity.x-=dx/d*impulse;b.body.velocity.z-=dz/d*impulse;}
    }
    for(const object of this.objects.values())if(!object.remote){object.previousY=object.body.position.y;const speed=object.body.velocity.length();if(speed>28)object.body.velocity.scale(28/speed,object.body.velocity);}
    this.world.step(DT);
    for (const id of this.pendingBreaks) {
      if (this.broken.has(id)) continue;
      this.broken.add(id);
      this.world.removeBody(this.hazards.get(id).body);
    }
    this.pendingBreaks.clear();
  }

  environmentSnapshot() {
    return { broken: [...this.broken], platforms: [...this.platforms.values()].filter(p => p.data.seesaw || p.data.fallOnTouch || p.data.puzzle || p.data.dynamic).map(p => ({ id: p.data.id, a: Math.round(p.angle * 1000) / 1000, dropAt: p.dropAt })) };
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
    return { id, p: [q(b.position.x), q(b.position.y), q(b.position.z)], v: [q(b.velocity.x), q(b.velocity.y), q(b.velocity.z)], f: q(p.face), g: p.grounded, d: q(Math.max(0, p.diveUntil - this.time)), r: q(Math.max(0, p.diveRecoveryUntil - this.time)), c: q(Math.max(0, p.nextDive - this.time)), s: q(Math.max(0, p.stunUntil - this.time)), airDiveUsed: p.airDiveUsed, hits: p.hits, tp: p.teleports };
  }
}
