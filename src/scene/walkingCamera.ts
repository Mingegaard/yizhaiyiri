import { firstPersonPose } from './config';
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
  paused = false, reducedMotion = false,
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
  const walking = Math.min(1, distance / dt / 3.3);
  state.weight = damp(state.weight, walking, walking > state.weight ? 9 : 7, dt);
  state.stepPhase = (state.stepPhase + distance * Math.PI * 2 / 1.5) % (Math.PI * 4);
  state.breathPhase = (state.breathPhase + dt * Math.PI * 2 / 4.8) % (Math.PI * 2);
  const breath = Math.sin(state.breathPhase) * (1 - .65 * state.weight);
  state.side = Math.sin(state.stepPhase / 2) * .012 * state.weight;
  state.lift = Math.sin(state.stepPhase) * .024 * state.weight + breath * .006;
  state.nod = Math.sin(state.stepPhase) * .0015 * state.weight + breath * .0006;
  // Short damping softens mouse/trackpad steps without adding inertia to the player.
  state.yaw = damp(state.yaw, look.yaw, 22, dt);
  state.pitch = damp(state.pitch, look.pitch, 22, dt);
  state.floor = damp(state.floor, ground[1], 14, dt);
}

export function walkingCameraPose(state: WalkingCamera, ground: Vec3) {
  return firstPersonPose([
    ground[0] + Math.cos(state.yaw) * state.side,
    state.floor + state.lift,
    ground[2] + Math.sin(state.yaw) * state.side,
  ], state.yaw, state.pitch + state.nod, false);
}
