#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateMap, validateMap, COURSES, SURVIVAL_TYPES, FINAL_TYPES } from '../shared/maps.js';

const args = new Map();
for (let i = 2; i < process.argv.length; i++) {
  const raw = process.argv[i];
  if (!raw.startsWith('--')) continue;
  const [key, inline] = raw.slice(2).split('=');
  args.set(key, key === 'list' ? true : inline ?? process.argv[++i]);
}
if (args.has('list')) {
  console.log(JSON.stringify({ races: COURSES.map(({ id, name, objective }) => ({ id, name, objective })), survival: SURVIVAL_TYPES, finals: FINAL_TYPES }, null, 2));
  process.exit(0);
}
const seed = args.get('seed') || `rumble-${Date.now().toString(36)}`;
const round = Math.max(0, Math.min(7, Number(args.get('round') || 0)));
const type = args.get('type') || (round === 7 ? 'final' : round % 2 ? 'survival' : 'race');
const difficulty = Math.max(0, Math.min(1, Number(args.get('difficulty') ?? round / 8)));
const out = args.get('out');
const map = generateMap({ seed, round, type, difficulty, variant: args.get('variant'), course: args.get('course') });
validateMap(map);
const json = JSON.stringify(map, null, 2) + '\n';
if (out) {
  const absolute = path.resolve(out);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, json);
  console.log(`Wrote ${absolute}`);
} else process.stdout.write(json);
