#!/usr/bin/env node
import fs from 'node:fs';
import { performance } from 'node:perf_hooks';
import { generateMap } from '../shared/maps.js';
import { createArena } from '../shared/arenas.js';
import { OBJECTIVES } from '../shared/objectives.js';
import { PRESETS,presetMap } from '../shared/presets.js';
import { validateMap } from '../shared/map-validation.js';
import { layoutFingerprint,verifyPublicMap } from '../shared/content.js';
import { resolveSecrets } from '../server/map-manifests.js';

const layouts=new Set(),families=new Set(),failures=[],start=performance.now();
let maps=0,maxPlatforms=0,maxHazards=0;
const count=1000,rules=Object.keys(OBJECTIVES);
for(let seed=0;seed<count;seed++){
  const options={seed:'release-'+seed,difficulty:(seed%11)/10};
  const preset=PRESETS[seed%PRESETS.length];
  const factories=[
    ...[[0,'race'],[3,'survival'],[7,'final']].map(([round,type])=>()=>generateMap({...options,round,type})),
    ()=>createArena(rules[seed%rules.length],options),
    ()=>preset.type==='objective'?createArena(preset.rule,options):presetMap(preset.id,options),
  ];
  for(let index=0;index<factories.length;index++){
    let map;
    try{
      map=factories[index]();validateMap(map);
      if(index===0){layouts.add(layoutFingerprint(map));families.add(map.family);}
      const {public:manifest}=resolveSecrets(map,'private-test-'+seed);
      if(!verifyPublicMap(manifest))throw new Error('Public checksum mismatch');
      maps++;maxPlatforms=Math.max(maxPlatforms,map.platforms.length);maxHazards=Math.max(maxHazards,map.hazards.length);
    }catch(error){failures.push({seed:options.seed,index,error:error.message});if(failures.length<=10)fs.writeFileSync('docs/failing-map-'+seed+'-'+index+'.json',JSON.stringify(map||options,null,2));}
  }
}
const report={seeds:count,maps,uniqueRaceLayouts:layouts.size,raceFamilies:families.size,arenaRules:rules.length,presets:PRESETS.length,difficulties:11,validatedSpawnsPerMap:30,maxPlatforms,maxHazards,invalid:failures.length,rejected:0,fallbacks:0,elapsedMs:Math.round(performance.now()-start),failures,
  scope:'Finite geometry, spawn support, permanent race connectivity, ordered checkpoints, secret-path resolution and manifest integrity. This does not prove hazard timing, human difficulty, or collision-free camera paths. No rejection/fallback search is implemented yet.'};
fs.writeFileSync('docs/generation-results.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
if(failures.length||layouts.size<count||families.size!==8)process.exitCode=1;
