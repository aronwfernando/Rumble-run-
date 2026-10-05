export const VERSION = '1.1.0';
export const TICK_RATE = 60;
export const SNAPSHOT_RATE = 20;
export const DT = 1 / TICK_RATE;
export const MAX_PLAYERS = 30;
export const COLORS = ['#ff658c', '#6de8ce', '#ffcf56', '#8975ff', '#56c9ff', '#ff975f'];
export const RULES = Object.freeze({
  // Tuned for a forgiving, momentum-based bean controller: quick enough to
  // react around hazards, with enough glide to make dives and landings feel
  // physical instead of snapping from one direction to another.
  speed: 9.2,
  acceleration: 44,
  deceleration: 58,
  airAcceleration: 26,
  airDeceleration: 9,
  iceAcceleration: 18,
  iceDeceleration: 4,
  maxSpeed: 24,
  jumpSpeed: 10.2,
  gravity: -25,
  diveSpeed: 18,
  diveLift: 3.6,
  diveDuration: 0.42,
  diveRecovery: 0.14,
  diveCooldown: 1.05,
  hitCooldown: 0.42,
  stunDuration: 0.26,
  respawnGrace: 0.55,
  radius: 0.44,
  halfHeight: 0.79,
  coyoteTime: 0.13,
  jumpBuffer: 0.16,
  inputTimeout: 0.35,
  countdown: 3,
  intermission: 5,
  raceSeconds: 90,
  survivalSeconds: 60,
  finalSeconds: 90,
});
export function roundType(index, total) {
  return index === total - 1 ? 'final' : index % 2 === 1 ? 'survival' : 'race';
}
export function qualificationTarget(count, index, total) {
  return index === total - 1 ? 1 : Math.min(count, Math.max(2, Math.ceil(count * (total - index - 1) / (total - index))));
}
export const EMPTY_INPUT = Object.freeze({ x: 0, z: 0, jump: false, dive: false });
