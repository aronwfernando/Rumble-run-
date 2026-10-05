export const VERSION = '1.0.0';
export const TICK_RATE = 60;
export const SNAPSHOT_RATE = 20;
export const DT = 1 / TICK_RATE;
export const MAX_PLAYERS = 30;
export const COLORS = ['#ff658c', '#6de8ce', '#ffcf56', '#8975ff', '#56c9ff', '#ff975f'];
export const RULES = Object.freeze({
  speed: 8.8, acceleration: 58, airAcceleration: 21,
  jumpSpeed: 9.5, gravity: -25, diveSpeed: 16,
  diveDuration: 0.36, diveCooldown: 1.25,
  radius: 0.44, halfHeight: 0.79, coyoteTime: 0.1,
  inputTimeout: 0.25, countdown: 3, intermission: 7,
  raceSeconds: 95, survivalSeconds: 65, finalSeconds: 100,
});
export function roundType(index, total) {
  return index === total - 1 ? 'final' : index % 2 === 1 ? 'survival' : 'race';
}
export function qualificationTarget(count, index, total) {
  return index === total - 1 ? 1 : Math.min(count, Math.max(2, Math.ceil(count * (total - index - 1) / (total - index))));
}
export const EMPTY_INPUT = Object.freeze({ x: 0, z: 0, jump: false, dive: false });
