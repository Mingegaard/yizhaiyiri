import { studyZ } from './studyLayout';
import type { Collider, Vec3 } from './types';

export const studyDaybed = {
  position: [0, .272, studyZ(-1.8)] as Vec3,
  width: 2.641,
  depth: 1.22,
  height: .88,
  seatHeight: .44,
};

export const studyDaybedCollider: Collider = {
  minX: studyDaybed.position[0] - studyDaybed.width / 2,
  maxX: studyDaybed.position[0] + studyDaybed.width / 2,
  minZ: studyDaybed.position[2] - studyDaybed.depth / 2,
  maxZ: studyDaybed.position[2] + studyDaybed.depth / 2,
};
