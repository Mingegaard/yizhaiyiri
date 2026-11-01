import { WALK_SPEED } from './config';

export const SPRINT_SPEED = 6;
const JUMP_VELOCITY = 4.4;
const GRAVITY = 16;

export interface Locomotion {
  height: number;
  velocity: number;
  sprint: number;
}

export function createLocomotion(): Locomotion {
  return { height: 0, velocity: 0, sprint: 0 };
}

export function resetLocomotion(state: Locomotion) {
  state.height = state.velocity = state.sprint = 0;
}

export function startJump(state: Locomotion) {
  if (state.height > 0 || state.velocity !== 0) return false;
  state.velocity = JUMP_VELOCITY;
  return true;
}

export function sprintRequested(keys: ReadonlySet<string>, forward: number) {
  return forward > 0 && (keys.has('ShiftLeft') || keys.has('ShiftRight'));
}

export function locomotionSpeed(state: Locomotion, forward: number) {
  return WALK_SPEED + (forward > 0 ? state.sprint * (SPRINT_SPEED - WALK_SPEED) : 0);
}

/** Jump height is separate from the ground used for collision and proximity checks. */
export function advanceLocomotion(state: Locomotion, delta: number, sprinting: boolean, paused = false) {
  if (paused || delta <= 0) return;
  const dt = Math.min(delta, .05);
  state.sprint += ((sprinting ? 1 : 0) - state.sprint) * -Math.expm1(-(sprinting ? 14 : 22) * dt);
  if (state.height > 0 || state.velocity > 0) {
    state.height += state.velocity * dt - .5 * GRAVITY * dt * dt;
    state.velocity -= GRAVITY * dt;
    if (state.height <= 0) state.height = state.velocity = 0;
  }
}
