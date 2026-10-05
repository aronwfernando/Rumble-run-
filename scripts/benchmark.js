#!/usr/bin/env node
import { performance } from 'node:perf_hooks';
import { generateMap } from '../shared/maps.js';
import { PhysicsWorld } from '../shared/physics.js';
const map = generateMap({ seed: 'bench', round: 3, type: 'race', difficulty: .6 });
const physics = new PhysicsWorld(map);
for (let i = 0; i < 30; i++) physics.addPlayer(`p${i}`, map.spawn[i]);
const start = performance.now();
for (let i = 0; i < 600; i++) physics.step(new Map(Array.from(physics.players, ([id]) => [id, { x: 0, z: -1, jump: false, dive: false }])));
const elapsed = performance.now() - start;
console.log(JSON.stringify({ steps: 600, players: 30, elapsedMs: +elapsed.toFixed(2), simMsPerStep: +(elapsed / 600).toFixed(3), headroomAt60fps: +(16.67 / (elapsed / 600)).toFixed(1) }));
