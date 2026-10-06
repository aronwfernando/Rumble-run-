import { generateMap } from './maps.js';
const s = (kind, obstacle, extra = {}) => ({ kind, obstacle, ...extra });
export const PRESETS = [
  { id: 'disc-district', name: 'Disc District', reference: 'Dizzy Heights', course: 'pinwheel-park', sequence: [s('turntables','spinner'),s('runway','fruit'),s('turntables','spinner'),s('stones','roller'),s('turntables','spinner')] },
  { id: 'door-derby', name: 'Door Derby', reference: 'Door Dash', course: 'gate-garden', sequence: [20,18,16,14,12].map(width => s('runway','doors',{width,rise:0})) },
  { id: 'orchard-uphill', name: 'Orchard Uphill', reference: 'Fruit Chute', course: 'fruit-freeway', sequence: [s('conveyor','fruit'),s('conveyor','log'),s('conveyor','cannonball'),s('conveyor','fruit')] },
  { id: 'gate-gambit', name: 'Gate Gambit', reference: 'Gate Crash', course: 'gate-garden', sequence: [s('runway','timed-gate'),s('runway','timed-gate'),s('runway','timed-gate'),s('ice','timed-gate')] },
  { id: 'balance-boulevard', name: 'Balance Boulevard', reference: 'Hit Parade', course: 'summit-scramble', sequence: [s('bridge','none'),s('runway','spinner'),s('split','pendulum'),s('conveyor','sliding-wall')] },
  { id: 'teeter-trek', name: 'Teeter Trek', reference: 'See Saw', course: 'tilt-trails', sequence: Array.from({length:6},()=>s('seesaw','none',{rise:0.5})) },
  { id: 'goo-ascent', name: 'Goo Ascent', reference: 'Slime Climb / The Slimescraper', course: 'summit-scramble', extreme: true, rising: true, sequence: [s('runway','piston'),s('bridge','none'),s('runway','sliding-wall'),s('split','pendulum'),s('runway','piston'),s('bridge','hammer')] },
  { id: 'propeller-passage', name: 'Propeller Passage', reference: 'The Whirlygig', course: 'fan-foundry', sequence: [s('runway','spinner'),s('runway','jump-pad'),s('split','windmill'),s('runway','windmill'),s('bridge','windmill')] },
  { id: 'secret-step', name: 'Secret Step', reference: 'Tip Toe / Tile Fall', course: 'mirage-mile', hidden: true, sequence: Array.from({length:4},()=>s('false-floor','none',{rise:0})) },
  { id: 'wall-waltz', name: 'Wall Waltz', reference: 'Block Party / Block Dash', variant: 'blockdash', type:'survival' },
  { id: 'jump-jamboree', name: 'Jump Jamboree', reference: 'Jump Club', variant: 'sweeper', type:'survival', stableFloor:true },
  { id: 'memory-meadow', name: 'Memory Meadow', reference: 'Perfect Match / Sum Fruit', rule:'memory', type:'objective' },
  { id: 'barrel-border', name: 'Barrel Border', reference: 'Roll Out / Roll Off', rule:'rolling', type:'objective' },
  { id: 'ribbon-rush', name: 'Ribbon Rush', reference: 'Tail Tag / Royal Fumble / Team Tail Tag', rule:'tail', type:'objective' },
  { id: 'nest-quest', name: 'Nest Quest', reference: 'Egg Scramble / Egg Siege', rule:'collection', teams:3, type:'objective' },
  { id: 'bean-ball', name: 'Bean Ball', reference: 'Fall Ball / Stumble Soccer', rule:'football', teams:2, type:'objective' },
  { id: 'ball-boroughs', name: 'Ball Boroughs', reference: 'Hoarders', rule:'hoard', teams:3, type:'objective' },
  { id: 'ring-rally', name: 'Ring Rally', reference: 'Hoopsie Daisy / Hoopsie Legends / Ski Fall', rule:'hoops', teams:2, type:'objective' },
  { id: 'tag-contagion', name: 'Tag Contagion', reference: 'Jinxed', rule:'infection', teams:2, type:'objective' },
  { id: 'boulder-buddies', name: 'Boulder Buddies', reference: 'Rock ’n’ Roll', rule:'push', teams:3, type:'objective' },
  { id: 'summit-sprint', name: 'Summit Sprint', reference: 'Fall Mountain', type:'final', variant:'crown-climb', course:'summit-scramble', sequence: [s('conveyor','cannonball'),s('runway','fruit'),s('runway','spinner'),s('runway','hammer')] },
  { id: 'honeycomb-finale', name: 'Honeycomb Finale', reference: 'Hex-A-Gone / Honey Drop', type:'final', variant:'last-tiles' },
  { id: 'last-leap', name: 'Last Leap', reference: 'Jump Showdown', type:'final', variant:'last-spinner' },
];
export const RACE_PRESETS = PRESETS.filter(p => !p.type);
export function presetMap(id, options = {}) {
  const preset = PRESETS.find(p => p.id === id);
  if (!preset || preset.type === 'objective') throw new Error('This preset requires an objective arena');
  const map = generateMap({ ...options, type:preset.type || 'race', variant:preset.variant, course:preset.course, sequence:preset.sequence });
  map.presetId = preset.id; map.name = preset.name;
  map.approximation = 'Original dimensions and geometry; mechanical sequence follows the reference design. Exact commercial map fidelity is not claimed.';
  if (preset.stableFloor) for (const p of map.platforms) p.collapseAt = null;
  if (preset.extreme) { map.extreme = true; map.objective = 'Climb ahead of the rising goo. Falling eliminates you.'; }
  if (preset.rising) map.slime = { start:-4, speed:0.12, delay:8 };
  if (preset.hidden) {
    map.hiddenPath = true; map.objective = 'Discover the solid path. False tiles collapse after contact.';
    for (const p of map.platforms) if (p.id.includes('-puzzle-')) { p.puzzle = true; p.truth = !p.fallOnTouch; }
  }
  return map;
}
