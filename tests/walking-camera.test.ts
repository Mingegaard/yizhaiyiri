import { describe, expect, it } from 'vitest';
import { firstPersonPose, moveOnGround, scenes } from '../src/scene/config';
import { advanceWalkingCamera, createWalkingCamera, resetWalkingCamera, walkingCameraPose } from '../src/scene/walkingCamera';
import type { Vec3 } from '../src/scene/types';

const look = { yaw: 0, pitch: 0 };

describe('walking camera presentation', () => {
  it('breathes gently at rest without moving the player or accumulating drift', () => {
    const ground: Vec3 = [0, 0, 7];
    const camera = createWalkingCamera(ground, look);
    const heights: number[] = [];
    for (let frame = 0; frame < 576; frame++) {
      advanceWalkingCamera(camera, ground, look, 1 / 60);
      heights.push(walkingCameraPose(camera, ground).position[1]);
    }
    expect(ground).toEqual([0, 0, 7]);
    expect(Math.max(...heights) - Math.min(...heights)).toBeCloseTo(.012, 4);
    expect(camera.weight).toBe(0);
    expect(camera.lift).toBeCloseTo(0, 6);
    expect(camera.yaw).toBe(look.yaw);
  });

  it('eases into footsteps from real displacement and settles after release or a blocked wall', () => {
    let ground: Vec3 = [0, 0, 7];
    const camera = createWalkingCamera(ground, look);
    const heights: number[] = [];
    for (let frame = 0; frame < 90; frame++) {
      ground = moveOnGround(ground, 0, 1, 0, 1 / 60, scenes.courtyard);
      advanceWalkingCamera(camera, ground, look, 1 / 60);
      heights.push(camera.lift);
    }
    expect(camera.weight).toBeGreaterThan(.99);
    expect(Math.max(...heights) - Math.min(...heights)).toBeGreaterThan(.04);
    const phase = camera.stepPhase;
    for (let frame = 0; frame < 60; frame++) advanceWalkingCamera(camera, ground, look, 1 / 60);
    expect(camera.weight).toBeLessThan(.001);
    expect(camera.stepPhase).toBe(phase);
    expect(Math.abs(camera.side)).toBeLessThan(.00002);

    // A held movement key at an obstacle produces no footsteps once the gait fades out.
    ground = [0, 0, scenes.courtyard.bounds.maxZ - .24];
    resetWalkingCamera(camera, ground, look);
    for (let frame = 0; frame < 120; frame++) {
      ground = moveOnGround(ground, 0, -1, 0, 1 / 60, scenes.courtyard);
      advanceWalkingCamera(camera, ground, look, 1 / 60);
    }
    expect(camera.weight).toBe(0);
    expect(camera.stepPhase).toBe(0);
  });

  it('keeps the same gait and damping at 30, 60 and 120 frames per second', () => {
    const results = [30, 60, 120].map(fps => {
      const camera = createWalkingCamera([0, 0, 7], look);
      for (let frame = 1; frame <= fps; frame++) {
        advanceWalkingCamera(camera, [3.3 * frame / fps, 0, 7], { yaw: .8, pitch: -.2 }, 1 / fps);
      }
      return camera;
    });
    for (const key of ['weight', 'stepPhase', 'lift', 'side', 'nod', 'yaw', 'pitch'] as const) {
      expect(results[0][key]).toBeCloseTo(results[1][key], 8);
      expect(results[0][key]).toBeCloseTo(results[2][key], 8);
    }
    expect(results[0].yaw).toBeCloseTo(.8, 5);
  });

  it('holds still behind a dialog and resets cleanly for focus, travel and reduced motion', () => {
    const ground: Vec3 = [0, .272, -3];
    const camera = createWalkingCamera(ground, look);
    for (let frame = 0; frame < 30; frame++) advanceWalkingCamera(camera, ground, look, 1 / 60);
    const held = structuredClone(camera);
    for (let frame = 0; frame < 120; frame++) advanceWalkingCamera(camera, ground, look, 1 / 60, true);
    expect(camera).toEqual(held);

    const nextLook = { yaw: 1.2, pitch: -.3 };
    const destination: Vec3 = [10, 0, 7];
    advanceWalkingCamera(camera, destination, nextLook, 1 / 60);
    expect(walkingCameraPose(camera, destination)).toEqual(firstPersonPose(destination, 1.2, -.3, false));
    advanceWalkingCamera(camera, destination, nextLook, 1 / 60);
    resetWalkingCamera(camera, destination, nextLook);
    expect(walkingCameraPose(camera, destination)).toEqual(firstPersonPose(destination, 1.2, -.3, false));

    for (let frame = 0; frame < 60; frame++) advanceWalkingCamera(camera, destination, nextLook, 1 / 60, false, true);
    expect(walkingCameraPose(camera, destination)).toEqual(firstPersonPose(destination, 1.2, -.3, false));
  });

  it('softens a floor step without altering the ground pose and bounds a delayed frame', () => {
    const camera = createWalkingCamera([0, 0, 7], look);
    const step: Vec3 = [0, .272, 6.95];
    advanceWalkingCamera(camera, step, { yaw: .2, pitch: .1 }, 1 / 60);
    expect(camera.floor).toBeGreaterThan(0);
    expect(camera.floor).toBeLessThan(.272);
    expect(camera.yaw).toBeGreaterThan(0);
    expect(camera.yaw).toBeLessThan(.2);
    for (let frame = 0; frame < 30; frame++) advanceWalkingCamera(camera, step, { yaw: .2, pitch: .1 }, 1 / 60);
    expect(camera.floor).toBeCloseTo(.272, 3);
    expect(step).toEqual([0, .272, 6.95]);
    const phase = camera.breathPhase;
    advanceWalkingCamera(camera, step, look, 10);
    expect(camera.breathPhase - phase).toBeLessThan(.07);
    expect(Math.abs(camera.lift)).toBeLessThan(.031);
    expect(Math.abs(camera.side)).toBeLessThan(.013);
  });
});
