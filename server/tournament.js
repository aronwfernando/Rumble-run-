import { EventEmitter } from 'node:events';
import { randomBytes, randomUUID } from 'node:crypto';
import { DT, MAX_PLAYERS, RULES, roundType, qualificationTarget, EMPTY_INPUT } from '../shared/config.js';
import { generateMap, crownHeight } from '../shared/maps.js';
import { PhysicsWorld } from '../shared/physics.js';

export class Tournament extends EventEmitter {
  constructor(code, { privateRoom = true, rounds = 6, seed = '', timings = {} } = {}) {
    super();
    this.code = code;
    this.privateRoom = privateRoom;
    this.settings = { rounds, seed };
    this.rules = { ...RULES, ...timings };
    this.players = new Map();
    this.hostId = null;
    this.phase = 'lobby';
    this.phaseTime = 0;
    this.round = -1;
    this.time = 0;
    this.tick = 0;
    this.physics = null;
    this.map = null;
    this.qualifiers = [];
    this.results = [];
    this.winner = null;
    this.seed = seed || randomBytes(5).toString('hex');
    this.tournamentId = randomUUID();
    this.prepareCourses();
  }
  prepareCourses() {
    this.courseDeck = Array.from({ length: this.settings.rounds }, (_, round) => generateMap({ seed: this.seed, round, type: roundType(round, this.settings.rounds), difficulty: round / this.settings.rounds }));
  }
  get roundKey() { return `${this.tournamentId}:${this.round}`; }
  get humans() { return [...this.players.values()]; }
  get connectedHumans() { return this.humans.filter(p => p.connected); }
  get competitors() { return [...this.players.values()].filter(p => p.active && p.status === 'racing'); }

  addHuman({ id = randomUUID(), name, color }) {
    if (this.phase !== 'lobby') throw new Error('This match has started. Ask the host for a new lobby.');
    if (this.players.size >= MAX_PLAYERS) throw new Error('This room is full.');
    const p = { id, name, color, connected: true, active: true, status: 'waiting', checkpoint: 0, progress: 0, lastSeq: -1, input: EMPTY_INPUT, lastInput: -10, jumps: 0, dives: 0, grabs: 0, grabUntil: 0, pendingJump: false, pendingDive: false, pendingGrab: false };
    this.players.set(id, p);
    if (!this.hostId) this.hostId = id;
    this.emitState();
    return p;
  }

  start(id) {
    if (id !== this.hostId) throw new Error('Only the host can start the match.');
    if (this.phase !== 'lobby') throw new Error('A match is already running.');
    if (this.connectedHumans.length < 2) throw new Error('Invite at least one friend to start.');
    this.round = 0;
    this.beginRound();
  }

  rematch(id) {
    if (id !== this.hostId || this.phase !== 'finished') throw new Error('The host can restart after the tournament.');
    for (const [key, p] of this.players) {
      if (!p.connected) this.players.delete(key);
      else { p.active = true; p.status = 'waiting'; p.progress = 0; p.checkpoint = 0; }
    }
    this.phase = 'lobby'; this.phaseTime = 0; this.round = -1;
    this.map = null; this.physics = null; this.winner = null; this.results = [];
    this.seed = this.settings.seed || randomBytes(5).toString('hex');
    this.tournamentId = randomUUID();
    this.prepareCourses();
    this.emitState();
  }

  beginRound() {
    const type = roundType(this.round, this.settings.rounds);
    this.map = this.courseDeck[this.round];
    this.physics = new PhysicsWorld(this.map);
    this.time = 0; this.phase = 'countdown'; this.phaseTime = 0;
    this.qualifiers = []; this.results = [];
    const active = [...this.players.values()].filter(p => p.active);
    this.roundEntrants = active.length;
    this.target = qualificationTarget(active.length, this.round, this.settings.rounds);
    this.roundLimit = type === 'survival' ? this.rules.survivalSeconds : type === 'final' ? this.rules.finalSeconds : this.rules.raceSeconds;
    active.forEach((p, i) => {
      p.status = 'racing'; p.checkpoint = 0; p.progress = 0; p.falls = 0;
      p.input = EMPTY_INPUT; p.pendingJump = false; p.pendingDive = false;
      p.pendingGrab = false; p.grabUntil = 0;
      this.physics.addPlayer(p.id, this.map.spawn[i]);
    });
    this.emitState();
  }

  receiveInput(id, input, key) {
    const p = this.players.get(id);
    if (!p || !p.active || this.phase !== 'playing' || key !== this.roundKey || input.seq <= p.lastSeq) return;
    p.pendingJump ||= input.jump > p.jumps;
    p.pendingDive ||= input.dive > p.dives;
    p.pendingGrab ||= input.grab > p.grabs;
    p.grabs = Math.max(p.grabs, input.grab);
    p.jumps = Math.max(p.jumps, input.jump); p.dives = Math.max(p.dives, input.dive);
    p.lastSeq = input.seq;
    p.lastInput = this.time;
    p.input = input;
  }

  setConnected(id, connected) {
    const p = this.players.get(id);
    if (!p) return;
    p.connected = connected;
    p.input = EMPTY_INPUT; p.pendingJump = false; p.pendingDive = false;
    p.pendingGrab = false;
    if (!connected && id === this.hostId) this.hostId = this.connectedHumans[0]?.id || id;
    this.emitState();
  }

  leave(id) {
    const p = this.players.get(id);
    if (!p) return;
    this.physics?.removePlayer(id);
    this.players.delete(id);
    this.qualifiers = this.qualifiers.filter(key => key !== id);
    if (id === this.hostId) this.hostId = this.connectedHumans[0]?.id || this.humans[0]?.id || null;
    this.emitState();
  }

  step() {
    this.tick++;
    this.phaseTime += DT;
    if (this.phase === 'lobby') {
      if (!this.privateRoom && this.connectedHumans.length < 2) this.phaseTime = 0;
      if (!this.privateRoom && this.phaseTime >= 8 && this.connectedHumans.length >= 2) this.start(this.hostId);
      return;
    }
    if (this.phase === 'countdown') {
      if (this.phaseTime >= this.rules.countdown) { this.phase = 'playing'; this.phaseTime = 0; this.emitState(); }
      return;
    }
    if (this.phase === 'results') {
      if (this.phaseTime >= this.rules.intermission) { this.round++; this.beginRound(); }
      return;
    }
    if (this.phase !== 'playing') return;
    this.time += DT;
    const inputs = new Map();
    for (const p of this.competitors) {
      {
        const valid = p.connected && this.time - p.lastInput <= RULES.inputTimeout;
        inputs.set(p.id, valid ? { ...p.input, jump: p.pendingJump, dive: p.pendingDive } : EMPTY_INPUT);
        if (valid && p.pendingGrab) p.grabUntil = this.time + 0.25;
        p.pendingGrab = false;
        p.pendingJump = false; p.pendingDive = false;
      }
    }
    this.physics.step(inputs, this.time);
    const survival = this.map.mode === 'survival';
    for (const p of this.competitors) {
      const pp = this.physics.players.get(p.id);
      if (!pp) continue;
      const pos = pp.body.position;
      const killY = this.map.slime ? this.map.slime.start + this.time * this.map.slime.speed + 0.5 : this.map.killY ?? -14;
      if (!Number.isFinite(pos.x + pos.y + pos.z) || pos.y < killY || Math.abs(pos.x) > 150) {
        if (survival) {
          // Preserve the final two in earlier rounds. Friend duels should
          // reach their chosen finale; simultaneous falls also cannot take
          // a qualifying group below its target in one physics tick.
          if (this.map.type !== 'final' && this.competitors.length <= this.target) {
            const safe = [...this.physics.platforms.values()].filter(floor => !floor.removed && (floor.dropAt === null || floor.dropAt > this.time + 1) && floor.body.position.y + 1.7 > killY + 0.3)
              .sort((a, b) => b.body.position.y - a.body.position.y || Math.hypot(a.body.position.x, a.body.position.z) - Math.hypot(b.body.position.x, b.body.position.z))[0];
            if (!safe) { this.endRound(this.competitors.map(bean => bean.id)); return; }
            this.physics.teleport(p.id, [safe.body.position.x, safe.body.position.y + 1.7, safe.body.position.z]);
            p.falls++; pp.hits++;
          } else {
            p.status = 'eliminated'; p.active = false; p.outAt = this.time;
            this.physics.removePlayer(p.id);
          }
        } else {
          const c = this.map.checkpoints[p.checkpoint];
          this.physics.teleport(p.id, [c.x, c.y + 0.4, c.z - 0.5]);
          p.falls++;
        }
        continue;
      }
      if (!survival) {
        const next = this.map.checkpoints[p.checkpoint + 1];
        if (next && pos.z <= next.z && pos.z >= next.z - 5 && Math.abs(pos.x - next.x) < next.width / 2 && Math.abs(pos.y - next.y) < 5) p.checkpoint++;
        // Only count progress within the next gate. Skipping gates cannot qualify.
        const gateLimit = this.map.checkpoints[p.checkpoint + 1]?.z ?? this.map.finish.z;
        p.progress = Math.max(p.progress, Math.min(-pos.z, -gateLimit));
        const f = this.map.finish;
        const finish = p.checkpoint === this.map.checkpoints.length - 1 && pos.z <= f.z && pos.z >= f.z - 5 && Math.abs(pos.x - f.x) < f.width / 2 && Math.abs(pos.y - f.y) < 4;
        const crown = !f.crown || Math.hypot(pos.x - f.x, pos.z - f.z) < 2.2 && Math.abs(pos.y + 0.4 - crownHeight(this.map, this.time)) < 1.2 && !pp.grounded && p.grabUntil >= this.time;
        if (finish && crown) {
          p.status = 'qualified';
          p.finishTime = this.time;
          this.qualifiers.push(p.id);
          this.physics.removePlayer(p.id);
          if (this.qualifiers.length >= this.target) break;
        }
      }
    }
    if (survival && this.competitors.length <= this.target && (this.roundEntrants > this.target || this.competitors.length < this.roundEntrants)) this.endRound(this.competitors.map(p => p.id));
    else if (this.qualifiers.length >= this.target) this.endRound(this.qualifiers);
    else if (this.time >= this.roundLimit) {
      // Tile survival rewards the highest remaining layer at the horn.
      // Other survival arenas reward fewest hits, then nearest center.
      const remaining = [...this.competitors].sort((a, b) => {
        if (!survival) return b.checkpoint - a.checkpoint || b.progress - a.progress || a.falls - b.falls || a.id.localeCompare(b.id);
        const aa = this.physics.players.get(a.id), bb = this.physics.players.get(b.id);
        const layer = this.map.variant === 'tilefall' ? Math.round(bb.body.position.y / 4) - Math.round(aa.body.position.y / 4) : 0;
        return layer || aa.hits - bb.hits || Math.hypot(aa.body.position.x, aa.body.position.z) - Math.hypot(bb.body.position.x, bb.body.position.z) || a.id.localeCompare(b.id);
      });
      this.endRound([...this.qualifiers, ...remaining.map(p => p.id)].slice(0, this.target));
    }
  }

  endRound(ids) {
    if (this.phase !== 'playing') return;
    const winners = ids.filter(id => this.players.has(id));
    const last = this.round === this.settings.rounds - 1;
    this.qualifiers = winners;
    this.results = [...this.players.values()].filter(p => p.active || p.outAt !== undefined).map(p => ({ id: p.id, qualified: winners.includes(p.id), progress: p.progress, time: p.finishTime ?? null }));
    for (const p of this.players.values()) {
      p.active = winners.includes(p.id);
      p.status = p.active ? 'qualified' : 'eliminated';
      delete p.outAt; delete p.finishTime;
    }
    this.phaseTime = 0;
    if (last || winners.length <= 1) {
      this.phase = 'finished';
      this.winner = winners[0] || null;
    } else this.phase = 'results';
    this.emitState();
  }

  state() {
    return { code: this.code, privateRoom: this.privateRoom, hostId: this.hostId, settings: this.settings, seed: this.seed, courses: this.courseDeck.map(map => ({ name: map.name, type: map.type, mode: map.mode, family: map.family, color: map.theme.accent, objective: map.objective })), roundKey: this.roundKey, round: this.round, phase: this.phase, target: this.target, map: this.map, winner: this.winner, qualifiers: this.qualifiers, results: this.results, players: [...this.players.values()].map(p => ({ id: p.id, name: p.name, color: p.color, connected: p.connected, active: p.active, status: p.status })) };
  }
  emitState() { this.emit('state', this.state()); }
  snapshot() {
    const phaseLeft = this.phase === 'playing' ? Math.max(0, this.roundLimit - this.time) : this.phase === 'countdown' ? Math.max(0, this.rules.countdown - this.phaseTime) : this.phase === 'results' ? Math.max(0, this.rules.intermission - this.phaseTime) : this.phase === 'lobby' && !this.privateRoom ? Math.max(0, 8 - this.phaseTime) : 0;
    return { roundKey: this.roundKey, tick: this.tick, phase: this.phase, time: this.time, phaseLeft, target: this.target, qualified: this.qualifiers.length, alive: this.competitors.length, environment: this.physics?.environmentSnapshot(), players: [...this.players.values()].map(p => ({ ...this.physics?.snapshot(p.id), id: p.id, seq: p.lastSeq, status: p.status, progress: Math.round(p.progress * 100) / 100, checkpoint: p.checkpoint })) };
  }
}
