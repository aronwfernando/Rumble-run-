// Original course recipes: each has a recognisable mechanic and a pool of
// compatible sections. The seeded composer remixes geometry and timing.
export const COURSES = [
  { id: 'pinwheel-park', name: 'Pinwheel Park', objective: 'Ride the spinning discs. Jump the sweepers.',
    sections: ['turntables', 'runway', 'turntables', 'split', 'conveyor', 'bridge'],
    obstacles: ['spinner', 'windmill', 'spinner', 'bumper'], layouts: ['meander', 'zigzag'], climb: false },
  { id: 'gate-garden', name: 'Gate Garden', objective: 'Time the gates and crash through the weak doors.',
    sections: ['runway', 'conveyor', 'runway', 'ice', 'runway', 'split'],
    obstacles: ['timed-gate', 'doors', 'timed-gate', 'sliding-wall'], layouts: ['straight', 'zigzag'], climb: false },
  { id: 'fruit-freeway', name: 'Fruit Freeway', objective: 'Run uphill against the belts. Dodge the rolling fruit.',
    sections: ['conveyor', 'ice', 'conveyor', 'runway', 'conveyor', 'split'],
    obstacles: ['fruit', 'log', 'cannonball', 'fruit'], layouts: ['straight', 'meander'], climb: true },
  { id: 'tilt-trails', name: 'Tilt Trails', objective: 'Balance the see-saws and pick your bridge.',
    sections: ['seesaw', 'split', 'seesaw', 'stones', 'bridge', 'seesaw'],
    obstacles: ['pendulum', 'hammer', 'spinner', 'roller'], layouts: ['zigzag', 'switchback'], climb: false },
  { id: 'fan-foundry', name: 'Fan Foundry', objective: 'Find a window between the blades. Keep your momentum.',
    sections: ['bridge', 'split', 'turntables', 'bridge', 'runway', 'stones'],
    obstacles: ['windmill', 'spinner', 'windmill', 'flipper'], layouts: ['switchback', 'zigzag'], climb: false },
  { id: 'summit-scramble', name: 'Summit Scramble', objective: 'Climb the switchbacks. Watch the hammers and pistons.',
    sections: ['runway', 'bridge', 'stones', 'split', 'runway', 'ice'],
    obstacles: ['piston', 'hammer', 'pendulum', 'sliding-wall'], layouts: ['switchback'], climb: true },
  { id: 'mirage-mile', name: 'Mirage Mile', objective: 'Find the solid path. Cracked tiles give way underfoot.',
    sections: ['false-floor', 'runway', 'false-floor', 'stones', 'split', 'false-floor'],
    obstacles: ['doors', 'bumper', 'sliding-wall', 'roller'], layouts: ['meander', 'zigzag'], climb: false },
  { id: 'spring-street', name: 'Spring Street', objective: 'Use the spring pads. Steer clear of the bumpers.',
    sections: ['runway', 'stones', 'conveyor', 'runway', 'split', 'runway'],
    obstacles: ['jump-pad', 'flipper', 'bumper', 'jump-pad'], layouts: ['zigzag', 'meander'], climb: false },
];

export const SURVIVAL_RECIPES = {
  sweeper: { name: 'Spin Cycle', objective: 'Jump the low beam. Move away from flashing floor tiles.' },
  tilefall: { name: 'Honeycomb Havoc', objective: 'Keep moving! The hexagons disappear after you step on them.' },
  blockdash: { name: 'Gap Parade', objective: 'Look ahead and pass through openings in the moving walls.' },
  'rising-slime': { name: 'Slime Time', objective: 'Climb toward the middle as the slime rises.' },
  carousel: { name: 'Carousel Chaos', objective: 'Fight the spinning floors. Return inward before the islands drop.' },
};
export const SURVIVAL_TYPES = Object.keys(SURVIVAL_RECIPES);
export const FINAL_TYPES = ['crown-climb', 'last-tiles', 'last-spinner'];

export function shuffle(values, rng) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
