import { describe, expect, it } from 'vitest';
import { canStandAt, dragLook, EYE_HEIGHT, firstPersonPose, gardenTrees, isNearStudyDesk, moveOnGround, scenes, study, walkingInput, wheelLook } from '../src/scene/config';
import type { Vec3 } from '../src/scene/types';
import { studyZ } from '../src/scene/studyLayout';
import { studyScreen } from '../src/scene/studyScreenLayout';
import { studyDaybed } from '../src/scene/studyDaybedLayout';
import { studyWritingTable } from '../src/scene/studyWritingTableLayout';

describe('first-person scene navigation', () => {
  it('leaves every player spawn and doorway approach navigable', () => {
    for (const scene of Object.values(scenes)) {
      expect(canStandAt(scene.spawn[0], scene.spawn[2], scene.bounds, scene.colliders), `${scene.id} spawn`).toBe(true);
      for (const portal of scene.portals) {
        expect(canStandAt(portal.position[0], portal.position[2], scene.bounds, scene.colliders), portal.id).toBe(true);
        expect(scenes[portal.target]).toBeDefined();
      }
    }
  });

  it('keeps the full player radius inside each side of the boundary', () => {
    const bounds = { minX: -5, maxX: 5, minZ: -5, maxZ: 5 };
    expect(canStandAt(4.75, 0, bounds, [], .25)).toBe(true);
    expect(canStandAt(-4.75, 0, bounds, [], .25)).toBe(true);
    for (const [x, z] of [[4.76, 0], [-4.76, 0], [0, 4.76], [0, -4.76]]) {
      expect(canStandAt(x, z, bounds, [], .25)).toBe(false);
    }
  });

  it('lets the user approach the daybed and pass around both furnishings to the north doorway', () => {
    const scene = scenes.courtyard;
    let position: Vec3 = [...scene.spawn];
    for (let frame = 0; frame < 300; frame++) position = moveOnGround(position, 0, 1, 0, 1 / 60, scene);
    expect(position[2]).toBeLessThan(study.center[2] + study.depth / 2);
    expect(position[2]).toBeGreaterThan(studyDaybed.position[2] + studyDaybed.depth / 2);
    expect(isNearStudyDesk(position, 'courtyard')).toBe(false);
    expect(canStandAt(position[0], position[2], scene.bounds, scene.colliders)).toBe(true);
    const approach = [...position] as Vec3;
    for (const side of [-1, 1]) {
      position = [...approach];
      // Leave space in front of the daybed before passing both pieces.
      for (let frame = 0; frame < (side === 1 ? 34 : 12); frame++) position = moveOnGround(position, 0, -1, 0, 1 / 60, scene);
      if (side === 1) {
        // The requested 10 cm furniture gap is not an aisle. Enter through
        // the east bay and pass between the table and the side wall instead.
        for (let frame = 0; frame < 44; frame++) position = moveOnGround(position, 0, 0, 1, 1 / 60, scene);
        for (let frame = 0; frame < 100; frame++) position = moveOnGround(position, 0, 1, 0, 1 / 60, scene);
        for (let frame = 0; frame < 44; frame++) position = moveOnGround(position, 0, 0, -1, 1 / 60, scene);
      } else {
        for (let frame = 0; frame < 60; frame++) position = moveOnGround(position, 0, 0, side, 1 / 60, scene);
        for (let frame = 0; frame < 80; frame++) position = moveOnGround(position, 0, 1, 0, 1 / 60, scene);
        for (let frame = 0; frame < 47; frame++) position = moveOnGround(position, 0, 0, -side, 1 / 60, scene);
      }
      for (let frame = 0; frame < 60; frame++) position = moveOnGround(position, 0, 1, 0, 1 / 60, scene);
      expect(position[2]).toBeLessThan(study.center[2] - study.depth / 2 - .24);
    }
  });

  it('retains architecture, tree and daybed collisions with clear space beside the new furniture', () => {
    const { bounds, colliders } = scenes.courtyard;
    for (const [x, z] of [[-2.92, studyZ(-2)], [2.92, studyZ(-2)], [-2, studyZ(-4.28)], ...gardenTrees.map(([x, , z]) => [x, z])]) {
      expect(canStandAt(x, z, bounds, colliders)).toBe(false);
    }
    expect(canStandAt(0, study.center[2] + study.depth / 2 + .16, bounds, colliders)).toBe(true);
    expect(canStandAt(0, studyZ(-4.2), bounds, colliders)).toBe(true);
    expect(canStandAt(studyDaybed.position[0], studyDaybed.position[2], bounds, colliders)).toBe(false);
    for (const [x, z] of [[0, study.deskPosition[2] + 1.2], [2.4, studyZ(-2.2)], [-2.45, studyZ(-3.5)], [2.45, studyZ(-3.5)]]) {
      expect(canStandAt(x, z, bounds, colliders)).toBe(true);
    }
    expect(canStandAt(studyWritingTable.position[0], studyWritingTable.position[2], bounds, colliders)).toBe(false);
    for (let z = -4.6; z < -2.5; z += .1) expect(canStandAt(2.4, z, bounds, colliders)).toBe(true);
    expect(canStandAt(1.37, studyDaybed.position[2], bounds, colliders)).toBe(false);
    expect(canStandAt(study.focusCamera[0], study.focusCamera[2], bounds, colliders)).toBe(true);
  });

  it('allows walking through both removed south screen bays while retaining the columns and north screens', () => {
    const scene = scenes.courtyard;
    for (const x of [-1.9, 2.4]) {
      let position: Vec3 = [x, 0, studyZ(1.5)];
      for (let frame = 0; frame < 45; frame++) position = moveOnGround(position, 0, 1, 0, 1 / 60, scene);
      expect(position[2]).toBeLessThan(studyZ(-.6));
      expect(canStandAt(x, studyZ(-4.28), scene.bounds, scene.colliders)).toBe(false);
    }
    for (const x of [-.976, .976]) expect(canStandAt(x, studyZ(.28), scene.bounds, scene.colliders)).toBe(false);
  });

  it('keeps the vacated courtyard level and raises the player only on the relocated study floor', () => {
    const scene = scenes.courtyard;
    expect(canStandAt(0, -.2, scene.bounds, scene.colliders)).toBe(true);
    expect(moveOnGround([0, 0, .1], 0, 1, 0, .05, scene)[1]).toBe(0);
    expect(moveOnGround([0, 0, studyZ(.4)], 0, 1, 0, .05, scene)[1]).toBe(.272);
    expect(isNearStudyDesk([0, 0, -.5], 'courtyard')).toBe(false);
    expect(isNearStudyDesk([0, 0, studyZ(-.5)], 'courtyard')).toBe(false);
  });

  it('keeps both room doors reachable along the cross-courtyard path', () => {
    const scene = scenes.courtyard;
    for (let x = -14.1; x <= 14.1; x += .1) expect(canStandAt(x, 1.5, scene.bounds, scene.colliders)).toBe(true);
    for (const portal of scene.portals) {
      for (let z = portal.position[2]; z <= 1.5; z += .1) expect(canStandAt(portal.position[0], z, scene.bounds, scene.colliders), portal.id).toBe(true);
    }
  });

  it('moves relative to the camera heading, normalizes diagonals, and stays on the ground', () => {
    const scene = scenes.courtyard;
    const origin: Vec3 = [0, 0, 5];
    const forward = moveOnGround(origin, 0, 1, 0, .05, scene);
    const rightFacing = moveOnGround(origin, Math.PI / 2, 1, 0, .05, scene);
    const diagonal = moveOnGround(origin, 0, 1, 1, .05, scene);
    expect(forward[2]).toBeLessThan(origin[2]);
    expect(rightFacing[0]).toBeGreaterThan(origin[0]);
    expect(rightFacing[2]).toBeCloseTo(origin[2]);
    expect(Math.hypot(diagonal[0], diagonal[2] - origin[2])).toBeCloseTo(origin[2] - forward[2]);
    expect(diagonal[1]).toBe(0);
  });

  it('does not jump through the daybed after a delayed frame', () => {
    const scene = scenes.courtyard;
    const front = studyDaybed.position[2] + studyDaybed.depth / 2 + .3;
    const position = moveOnGround([0, 0, front], 0, 1, 0, 10, scene);
    expect(position[2]).toBe(front);
  });
});

describe('study focus view', () => {
  it('does not offer desk or vessel interactions anywhere after the study props are removed', () => {
    expect(isNearStudyDesk([0, 0, study.deskPosition[2]], 'courtyard')).toBe(false);
    expect(isNearStudyDesk([0, 0, studyZ(-.5)], 'courtyard')).toBe(false);
    expect(isNearStudyDesk([0, 0, study.center[2] + study.depth / 2 + .1], 'courtyard')).toBe(false);
    expect(isNearStudyDesk([0, 0, studyZ(-4.3)], 'courtyard')).toBe(false);
    expect(isNearStudyDesk([0, 0, -1.5], 'kitchen')).toBe(false);
  });

  it('locks to the study-facing-garden camera and restores the unmodified walking pose afterward', () => {
    const walking: Vec3 = [1.7, 0, -1.7];
    const before = firstPersonPose(walking, .8, -.2, false);
    const focused = firstPersonPose(walking, .8, -.2, true);
    expect(focused.position).toEqual(study.focusCamera);
    expect(focused.target).toEqual(study.focusTarget);
    expect(firstPersonPose(walking, .8, -.2, false)).toEqual(before);
    expect(walking).toEqual([1.7, 0, -1.7]);
    expect(before.position[1]).toBe(EYE_HEIGHT);
  });

  it('frames one flowering tree on portrait screens from the same study seat without changing the walking camera', () => {
    const walking: Vec3 = [1.7, 0, -1.7];
    const portrait = firstPersonPose(walking, .8, -.2, true, 461 / 853);
    const desktop = firstPersonPose(walking, .8, -.2, true, 1440 / 1000);
    expect(portrait.position).toEqual(study.focusCamera);
    expect(portrait.target).toEqual([10, 3, -8]);
    expect(portrait.target[0]).toBeGreaterThan(portrait.position[0]);
    expect(desktop.target).toEqual(study.focusTarget);
    expect(firstPersonPose(walking, .8, -.2, false, 461 / 853)).toEqual(firstPersonPose(walking, .8, -.2, false, 1440 / 1000));
  });
});

describe('keyboard movement and touchpad gaze', () => {
  it('maps all arrow keys to the same movement as WASD, without keyboard rotation', () => {
    for (const [wasd, arrow] of [['KeyW', 'ArrowUp'], ['KeyS', 'ArrowDown'], ['KeyA', 'ArrowLeft'], ['KeyD', 'ArrowRight']]) {
      const input = walkingInput(new Set([arrow]));
      expect(input).toEqual(walkingInput(new Set([wasd])));
      expect(input.turn).toBe(0);
      expect(walkingInput(new Set([wasd, arrow]))).toEqual(input);
    }
  });

  it('cancels opposite movement keys and preserves diagonal walking', () => {
    expect(walkingInput(new Set(['KeyW', 'ArrowDown', 'KeyA', 'ArrowRight']))).toEqual({ forward: 0, right: 0, turn: 0 });
    expect(walkingInput(new Set(['ArrowUp', 'ArrowLeft']))).toEqual({ forward: 1, right: -1, turn: 0 });
  });

  it('normalizes touchpad pixel and line deltas and limits large gesture jumps', () => {
    const initial = { yaw: 0, pitch: 0 };
    expect(wheelLook(initial, { deltaX: 32, deltaY: -16, deltaMode: 0 })).toEqual(wheelLook(initial, { deltaX: 2, deltaY: -1, deltaMode: 1 }));
    expect(wheelLook(initial, { deltaX: 50_000, deltaY: -50_000, deltaMode: 0 })).toEqual({ yaw: .16, pitch: .16 });
  });

  it('keeps drag and wheel as gaze-only operations without translating the walking position', () => {
    const position: Vec3 = [0, 0, 7];
    const initial = { yaw: 0, pitch: 0 };
    const dragged = dragLook(initial, 20, -10);
    const wheeled = wheelLook(initial, { deltaX: 20, deltaY: -10, deltaMode: 0 });
    expect(dragged.yaw).toBeGreaterThan(0);
    expect(wheeled.pitch).toBeGreaterThan(0);
    expect(firstPersonPose(position, dragged.yaw, dragged.pitch, false).position).toEqual([0, EYE_HEIGHT, 7]);
    expect(firstPersonPose(position, wheeled.yaw, wheeled.pitch, false).position).toEqual([0, EYE_HEIGHT, 7]);
    expect(position).toEqual([0, 0, 7]);
  });

  it('does not change gaze while locked or during Ctrl+wheel system zoom, and limits pitch', () => {
    const initial = { yaw: .4, pitch: 1.05 };
    const event = { deltaX: 40, deltaY: -80, deltaMode: 0 };
    expect(wheelLook(initial, event, true)).toBe(initial);
    expect(wheelLook(initial, { ...event, ctrlKey: true })).toBe(initial);
    expect(dragLook(initial, 30, 20, true)).toBe(initial);
    expect(wheelLook(initial, event).pitch).toBe(1.1);
    expect(dragLook(initial, 0, 50_000).pitch).toBe(-1.1);
  });
});
