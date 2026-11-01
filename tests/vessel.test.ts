import { describe, expect, it } from 'vitest';
import { study, tallyVessel } from '../src/scene/config';
import { cloudOrbit, cloudProgress, isVesselTap, stickPositions } from '../src/scene/vesselMath';
import { studyDeskZ } from '../src/scene/studyLayout';

describe('turtle lotus tally vessel', () => {
  it('places the 34cm vessel on the actual tabletop surface and leaves the scroll space free', () => {
    expect(tallyVessel.height).toBe(.34);
    expect(tallyVessel.position[1]).toBeCloseTo(study.deskPosition[1] + study.deskHeight + study.deskSize[1] / 2);
    // The tabletop objects retain their spacing after the whole study moves north.
    expect(tallyVessel.position[0] + .08).toBeLessThan(-.48);
    expect(tallyVessel.position[2] + .06).toBeLessThan(studyDeskZ(-2.18));
    expect(Math.abs(tallyVessel.position[0]) + .08).toBeLessThan(study.deskSize[0] / 2);
  });

  it('renders exactly one physical stick per rod, including balances above the story threshold', () => {
    for (const count of [0, 1, 9, 10, 37, 100]) {
      const sticks = stickPositions(count);
      expect(sticks).toHaveLength(count);
      expect(sticks.every(([x, , z]) => Math.hypot(x, z) <= .025)).toBe(true);
    }
  });

  it('accepts a nearby tap but not a drag, distant interaction or locked focus', () => {
    expect(isVesselTap(3, true, true)).toBe(true);
    expect(isVesselTap(7, true, true)).toBe(false);
    expect(isVesselTap(0, true, false)).toBe(false);
    expect(isVesselTap(0, false, true)).toBe(false);
  });
});

describe('cloud transition clock', () => {
  it('finishes at three elapsed seconds independent of frame count', () => {
    expect(cloudProgress(1000, 1000)).toBe(0);
    expect(cloudProgress(1000, 2500)).toBe(.5);
    expect(cloudProgress(1000, 4000)).toBe(1);
    expect(cloudProgress(1000, 9000)).toBe(1);
  });

  it('begins at the vessel and brings every cloud into the camera-relative orbit', () => {
    for (let index = 0; index < 10; index++) {
      expect(cloudOrbit(0, index).blend).toBe(0);
      expect(cloudOrbit(1, index).blend).toBe(1);
      expect(cloudOrbit(1, index).offset[2]).toBeLessThan(0);
    }
  });
});
