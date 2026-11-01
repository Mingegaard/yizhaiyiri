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

export const studyWritingTableCollider: Collider = {
  minX: studyWritingTable.position[0] - studyWritingTable.depth / 2,
  maxX: studyWritingTable.position[0] + studyWritingTable.depth / 2,
  minZ: studyWritingTable.position[2] - studyWritingTable.length / 2,
  maxZ: studyWritingTable.position[2] + studyWritingTable.length / 2,
};
