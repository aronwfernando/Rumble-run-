#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { generateMap } from '../shared/maps.js';
import { validateMap } from '../shared/map-validation.js';

const layouts = new Set(), scenery = new Set(), families = new Set();
let maps = 0, maxPlatforms = 0, maxHazards = 0;
for (let seed = 0; seed < 500; seed++) {
  for (const [round, type] of [[0, 'race'], [3, 'survival'], [7, 'final']]) {
    const map = generateMap({ seed: `release-${seed}`, round, type, difficulty: (seed % 11) / 10 });
    validateMap(map);
    maps++; maxPlatforms = Math.max(maxPlatforms, map.platforms.length); maxHazards = Math.max(maxHazards, map.hazards.length);
    if (type === 'race') {
      layouts.add(createHash('sha256').update(JSON.stringify([map.platforms, map.hazards])).digest('hex'));
      scenery.add(map.decor); families.add(map.family);
    }
  }
}
if (layouts.size !== 500 || families.size !== 8 || scenery.size !== 4) throw new Error('Map diversity regression');
console.log(JSON.stringify({ maps, seeds: 500, uniqueRaceLayouts: layouts.size, raceFamilies: families.size, sceneryStyles: scenery.size, maxPlatforms, maxHazards }));
