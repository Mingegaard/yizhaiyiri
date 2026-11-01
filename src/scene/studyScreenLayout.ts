import { studyZ } from './studyLayout';
import type { Collider, Vec3 } from './types';

/** A joined six-leaf screen inside the northern part of the relocated study.
 * Coordinates are app metres; painted fronts face south (+Z).
 */
export const studyScreen = {
  position: [0, .272, studyZ(-3.4)] as Vec3,
  leafWidth: .68,
  height: 2.1,
  thickness: .05,
  frame: .04,
  foot: .07,
};

const foldAngles = [28, -12, 10, -10, 12, -28].map(degrees => degrees * Math.PI / 180);
let hingeX = 0, hingeZ = 0;
const leaves = foldAngles.map(angle => {
  const dx = Math.cos(angle) * studyScreen.leafWidth;
  const dz = -Math.sin(angle) * studyScreen.leafWidth;
  const leaf = { x: hingeX + dx / 2, z: hingeZ + dz / 2, angle };
  hingeX += dx; hingeZ += dz;
  return leaf;
});
const centerX = hingeX / 2;
const centerZ = (Math.min(...leaves.map(leaf => leaf.z)) + Math.max(...leaves.map(leaf => leaf.z))) / 2;
export const studyScreenLeaves = leaves.map(leaf => ({ ...leaf, x: leaf.x - centerX, z: leaf.z - centerZ }));

export const studyScreenColliders: Collider[] = studyScreenLeaves.map(leaf => {
  const halfX = (Math.abs(Math.cos(leaf.angle)) * studyScreen.leafWidth + Math.abs(Math.sin(leaf.angle)) * studyScreen.thickness) / 2;
  const halfZ = (Math.abs(Math.sin(leaf.angle)) * studyScreen.leafWidth + Math.abs(Math.cos(leaf.angle)) * studyScreen.thickness) / 2;
  const x = studyScreen.position[0] + leaf.x, z = studyScreen.position[2] + leaf.z;
  return { minX: x - halfX, maxX: x + halfX, minZ: z - halfZ, maxZ: z + halfZ };
});
