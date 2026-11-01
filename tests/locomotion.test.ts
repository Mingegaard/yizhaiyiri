import { describe, expect, it } from 'vitest';
import { canStandAt, moveOnGround, scenes, WALK_SPEED, walkingInput } from '../src/scene/config';
import { advanceLocomotion, createLocomotion, locomotionSpeed, resetLocomotion, SPRINT_SPEED, sprintRequested, startJump } from '../src/scene/locomotion';
import { advanceWalkingCamera, createWalkingCamera, walkingCameraPose } from '../src/scene/walkingCamera';
import type { Vec3 } from '../src/scene/types';

describe('jump and forward sprint', () => {
  it('jumps once with a bounded arc, cannot jump again in mid-air, and lands without drift', () => {
    const state = createLocomotion();
    expect(startJump(state)).toBe(true);
    expect(startJump(state)).toBe(false);
    const heights: number[] = [];
    for (let frame = 0; frame < 60; frame++) {
      advanceLocomotion(state, 1 / 60, false);
      heights.push(state.height);
      if (frame === 10) expect(startJump(state)).toBe(false);
    }
    expect(Math.max(...heights)).toBeGreaterThan(.59);
    expect(Math.max(...heights)).toBeLessThan(.61);
    expect(Math.min(...heights)).toBe(0);
    expect(state.height).toBe(0);
    expect(state.velocity).toBe(0);
    for (let frame = 0; frame < 120; frame++) advanceLocomotion(state, 1 / 60, false);
    expect(state.height).toBe(0);
    expect(startJump(state)).toBe(true);
  });

  it('uses the same jump arc and acceleration at 30, 60 and 120 fps', () => {
    const states = [30, 60, 120].map(fps => {
      const state = createLocomotion();
      startJump(state);
      for (let frame = 0; frame < fps / 5; frame++) advanceLocomotion(state, 1 / fps, true);
      return state;
    });
    for (const state of states.slice(1)) {
      expect(state.height).toBeCloseTo(states[0].height, 8);
      expect(state.velocity).toBeCloseTo(states[0].velocity, 8);
      expect(state.sprint).toBeCloseTo(states[0].sprint, 8);
    }
  });

  it('both Shift keys accelerate only forward movement, and release returns smoothly to walking', () => {
    for (const shift of ['ShiftLeft', 'ShiftRight']) {
      for (const forward of ['KeyW', 'ArrowUp']) {
        const keys = new Set([shift, forward]);
        expect(sprintRequested(keys, walkingInput(keys).forward)).toBe(true);
      }
      for (const direction of ['KeyA', 'KeyS', 'KeyD', 'ArrowDown', '']) {
        const keys = new Set([shift, direction]);
        expect(sprintRequested(keys, walkingInput(keys).forward)).toBe(false);
      }
    }
    expect(sprintRequested(new Set(['KeyW']), 1)).toBe(false);
    const state = createLocomotion();
    for (let frame = 0; frame < 60; frame++) advanceLocomotion(state, 1 / 60, true);
    expect(locomotionSpeed(state, 1)).toBeCloseTo(SPRINT_SPEED, 4);
    expect(locomotionSpeed(state, 0)).toBe(WALK_SPEED);
    expect(locomotionSpeed(state, -1)).toBe(WALK_SPEED);
    const origin: Vec3 = [0, 0, 7];
    const forward = moveOnGround(origin, 0, 1, 0, .05, scenes.courtyard, locomotionSpeed(state, 1));
    const diagonal = moveOnGround(origin, 0, 1, 1, .05, scenes.courtyard, locomotionSpeed(state, 1));
    expect(Math.hypot(diagonal[0], diagonal[2] - origin[2])).toBeCloseTo(origin[2] - forward[2]);
    for (let frame = 0; frame < 18; frame++) advanceLocomotion(state, 1 / 60, false);
    expect(locomotionSpeed(state, 1)).toBeCloseTo(WALK_SPEED, 2);
  });

  it('holds an airborne pose behind dialogs, resets for travel/focus, and bounds delayed frames', () => {
    const state = createLocomotion();
    startJump(state);
    advanceLocomotion(state, .05, true);
    const held = { ...state };
    advanceLocomotion(state, 10, true, true);
    expect(state).toEqual(held);
    const bounded = { ...state };
    advanceLocomotion(state, 10, true);
    advanceLocomotion(bounded, .05, true);
    expect(state).toEqual(bounded);
    resetLocomotion(state);
    expect(state).toEqual(createLocomotion());
  });

  it('sprinting while jumping still respects thin walls and courtyard bounds', () => {
    const scene = { ...scenes.courtyard, colliders: [{ minX: -10, maxX: 10, minZ: 0, maxZ: .01 }] };
    const state = createLocomotion();
    state.sprint = 1;
    startJump(state);
    let position: Vec3 = [0, 0, .6];
    for (let frame = 0; frame < 120; frame++) {
      advanceLocomotion(state, .05, true);
      position = moveOnGround(position, 0, 1, 0, 10, scene, locomotionSpeed(state, 1));
      expect(canStandAt(position[0], position[2], scene.bounds, scene.colliders)).toBe(true);
      expect(position[2]).toBeGreaterThanOrEqual(.25);
      expect(position[1]).toBe(0);
    }
    position = [0, 0, scenes.courtyard.bounds.maxZ - .24];
    const stopped = moveOnGround(position, Math.PI, 1, 0, 10, scenes.courtyard, SPRINT_SPEED);
    expect(stopped[2]).toBe(position[2]);
  });

  it('raises the view and target together without changing ground position or adding airborne footsteps', () => {
    const ground: Vec3 = [0, .272, -3];
    const look = { yaw: .5, pitch: -.2 };
    const camera = createWalkingCamera(ground, look);
    const standing = walkingCameraPose(camera, ground);
    const jumping = walkingCameraPose(camera, ground, .6);
    expect(jumping.position[1] - standing.position[1]).toBeCloseTo(.6);
    expect(jumping.target[1] - standing.target[1]).toBeCloseTo(.6);
    expect(ground).toEqual([0, .272, -3]);
    advanceWalkingCamera(camera, [.1, .272, -3], look, 1 / 60, false, false, true);
    expect(camera.weight).toBe(0);
    expect(camera.stepPhase).toBe(0);
  });
});
