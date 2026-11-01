import type { Vec3 } from './types';
import { tallyVessel } from './config';

export function stickPositions(count: number): Vec3[] {
  return Array.from({ length: count }, (_, index) => {
    const angle = index * 2.399963;
    const radius = Math.sqrt((index + .5) / count) * .025;
    return [Math.cos(angle) * radius, tallyVessel.openingHeight - .025 + (index % 4) * .006, Math.sin(angle) * radius];
  });
}

export function isVesselTap(maxMovementPx: number, enabled: boolean, nearDesk: boolean) {
  return enabled && nearDesk && maxMovementPx <= tallyVessel.dragThresholdPx;
}

/** Elapsed wall-clock time, not frame count, drives the one-shot transition. */
export function cloudProgress(startedAt: number, now: number) {
  return Math.max(0, Math.min(1, (now - startedAt) / tallyVessel.transitionMs));
}

export function cloudOrbit(progress: number, index: number): { blend: number; offset: Vec3; scale: number } {
  const delay = index * .018;
  const local = Math.max(0, Math.min(1, (progress - delay) / (1 - delay)));
  const blend = Math.min(1, local / .42);
  const smooth = blend * blend * (3 - 2 * blend);
  const angle = local * Math.PI * 3.4 + index * .65;
  const radius = .65 + (1 - local) * .45;
  return {
    blend: smooth,
    offset: [Math.sin(angle) * radius, Math.cos(angle * .8) * .32 + .05, -.7 - Math.cos(angle) * .22],
    scale: .045 + local * .48,
  };
}
