import { firstPersonPose, WALK_SPEED } from './config';
import type { Vec3 } from './types';

interface Look { yaw: number; pitch: number }

/** Presentation only: none of these values feed movement, collisions or interaction distances. */
export interface WalkingCamera extends Look {
  previousX: number;
  previousZ: number;
  floor: number;
  breathPhase: number;
  stepPhase: number;
  weight: number;
  side: number;
  lift: number;
  nod: number;
}

export function createWalkingCamera(ground: Vec3, look: Look): WalkingCamera {
  return {
    ...look, previousX: ground[0], previousZ: ground[2], floor: ground[1],
    breathPhase: 0, stepPhase: 0, weight: 0, side: 0, lift: 0, nod: 0,
  };
}

export function resetWalkingCamera(state: WalkingCamera, ground: Vec3, look: Look) {
  state.yaw = look.yaw;
  state.pitch = look.pitch;
  state.previousX = ground[0];
  state.previousZ = ground[2];
  state.floor = ground[1];
  state.breathPhase = state.stepPhase = state.weight = state.side = state.lift = state.nod = 0;
}

const damp = (from: number, to: number, rate: number, dt: number) => from + (to - from) * -Math.expm1(-rate * dt);

/** Distance drives footsteps, so pushing against a wall never produces walking in place. */
export function advanceWalkingCamera(
  state: WalkingCamera, ground: Vec3, look: Look, delta: number,
  paused = false, reducedMotion = false, airborne = false,
) {
  const distance = Math.hypot(ground[0] - state.previousX, ground[2] - state.previousZ);
  if (reducedMotion || distance > .5) {
    resetWalkingCamera(state, ground, look);
    return;
  }
  state.previousX = ground[0];
  state.previousZ = ground[2];
  // Hold the composition behind dialogs; resume without a breathing phase jump.
  if (paused || delta <= 0) return;
  const dt = Math.min(delta, .05);
  const walking = airborne ? 0 : Math.min(1, distance / dt / WALK_SPEED);
  state.weight = damp(state.weight, walking, walking > state.weight ? 16 : 22, dt);
  state.stepPhase = (state.stepPhase + (airborne ? 0 : distance) * Math.PI * 2 / 1.35) % (Math.PI * 4);
  state.breathPhase = (state.breathPhase + dt * Math.PI * 2 / 4.8) % (Math.PI * 2);
  const breath = Math.sin(state.breathPhase) * (1 - .85 * state.weight);
  // A small, quick footfall keeps the horizon quiet; avoid the slow side-to-side sway.
  state.side = Math.sin(state.stepPhase / 2) * .0015 * state.weight;
  state.lift = Math.sin(state.stepPhase) * .009 * state.weight + breath * .006;
  state.nod = Math.sin(state.stepPhase) * .0002 * state.weight + breath * .0006;
  // Keep gaze responsive while taking the edge off individual input events.
  state.yaw = damp(state.yaw, look.yaw, 38, dt);
  state.pitch = damp(state.pitch, look.pitch, 38, dt);
  state.floor = damp(state.floor, ground[1], 18, dt);
}

export function walkingCameraPose(state: WalkingCamera, ground: Vec3, jumpHeight = 0) {
  return firstPersonPose([
    ground[0] + Math.cos(state.yaw) * state.side,
    state.floor + state.lift + jumpHeight,
    ground[2] + Math.sin(state.yaw) * state.side,
  ], state.yaw, state.pitch + state.nod, false);
}
