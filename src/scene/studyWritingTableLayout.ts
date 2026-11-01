import { studyDaybed } from './studyDaybedLayout';
import type { Collider, Vec3 } from './types';

const tabletopDepth = .60;
const gapToDaybed = .10;

/** The table faces west, 10 cm from the daybed; circulation runs outside it. */
export const studyWritingTable = {
  position: [studyDaybed.position[0] + studyDaybed.width / 2 + gapToDaybed + tabletopDepth / 2, .272, studyDaybed.position[2] + .55] as Vec3,
  rotation: [0, -Math.PI / 2, 0] as Vec3,
  length: 2.32,
  depth: tabletopDepth,
  gapToDaybed,
  tabletopHeight: .77,
};

// The cabinet's authored Blender center is (.64, .071); the table faces west.
export const studyScrollCabinetPosition: Vec3 = [
  studyWritingTable.position[0] + .071,
  studyWritingTable.position[1] + studyWritingTable.tabletopHeight + .008,
  studyWritingTable.position[2] + .64,
];

export const studyWritingTableCollider: Collider = {
  minX: studyWritingTable.position[0] - studyWritingTable.depth / 2,
  maxX: studyWritingTable.position[0] + studyWritingTable.depth / 2,
  minZ: studyWritingTable.position[2] - studyWritingTable.length / 2,
  maxZ: studyWritingTable.position[2] + studyWritingTable.length / 2,
};
