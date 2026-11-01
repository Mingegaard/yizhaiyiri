import { studyScrollCabinetPosition, studyWritingTable } from './studyWritingTableLayout';
import { canStandAt, scenes } from './config';
import type { Vec3 } from './types';

// Keep the vessel and its interactions centered on the writing tabletop.
export const adventureVesselPosition: Vec3 = [studyWritingTable.position[0],
  studyWritingTable.position[1] + studyWritingTable.tabletopHeight + .007,
  studyWritingTable.position[2]];

export function isNearAdventureVessel(position: Vec3) {
  return position[0] > .7 && position[0] < 2.78
    && Math.hypot(position[0] - adventureVesselPosition[0], position[2] - adventureVesselPosition[2]) < 1.65;
}

export function storyTarget(nodeId: string): Vec3 {
  if (nodeId === 'fire-trace') return [-3.6, .01, 2];
  if (['a1-missing', 'a1-returned'].includes(nodeId)) return [...studyScrollCabinetPosition];
  if (nodeId === 'a2-letter') return [-13.1, .12, -10.6];
  if (['a3-empty', 'a3-restored'].includes(nodeId)) return [3.7, .03, -2];
  // Reuse the flat letter already resting beside the returned shoes and hat.
  if (nodeId === 'a3-letter') return [3.75, .03 + .475 * .5, -1.94];
  if (['neighbor-letter', 'a5-letter'].includes(nodeId)) return [-4.8, .03, -1.6];
  if (nodeId === 'a3-defense') return [studyWritingTable.position[0],
    studyWritingTable.position[1] + studyWritingTable.tabletopHeight + .008, studyWritingTable.position[2]];
  if (['a4-reveal', 'a4-fragments', 'second-tile', 'second-fragments'].includes(nodeId)) return [-3.9, .02, -3.4];
  if (['a5-clothes', 'a5-clothes-returned'].includes(nodeId)) return [-9.2, .05, 4.9];
  if (nodeId === 'wei-letter') return [2.64, 2.1, -2.45];
  if (['a7-chest', 'a7-confession', 'a7-inventory-verified'].includes(nodeId)) return [3.75, .02, -5.7];
  return [-3.9, .02, -3.4];
}

/** Author reachable approaches around the existing furniture, walls and planting. */
export function storyApproach(nodeId: string): Vec3 {
  if (['a1-missing', 'a1-returned'].includes(nodeId)) return [.65, .272, -2.35];
  if (nodeId === 'a3-defense') return [2.45, .272, -3.25];
  if (['a5-clothes', 'a5-clothes-returned'].includes(nodeId)) return [-10.8, 0, 6.3];
  const [x, , z] = storyTarget(nodeId);
  const scene = scenes.courtyard;
  const offsets: [number, number][] = [[0, 1.9], [1.9, 0], [-1.9, 0], [0, -1.9], [1.5, 1.5], [-1.5, 1.5], [2.2, 1], [-2.2, 1]];
  for (const [dx, dz] of offsets) {
    if (canStandAt(x + dx, z + dz, scene.bounds, scene.colliders)) return [x + dx, 0, z + dz];
  }
  return [...scene.spawn];
}
