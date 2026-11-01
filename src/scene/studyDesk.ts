import type { BufferGeometry } from 'three';

const movedDesks = new WeakMap<BufferGeometry, Map<number, BufferGeometry>>();

/** The supplied furniture is merged by material. These separated source-space
 * regions contain the complete writing desk/tabletop objects and both stools;
 * the corner bookcases and western scroll stand sit outside them.
 */
export function moveStudyDeskFurniture(source: BufferGeometry, southShift: number): BufferGeometry {
  let variants = movedDesks.get(source);
  if (!variants) { variants = new Map(); movedDesks.set(source, variants); }
  const cached = variants.get(southShift);
  if (cached) return cached;
  const positions = source.getAttribute('position');
  const moved: number[] = [];
  for (let vertex = 0; vertex < positions.count; vertex++) {
    const x = positions.getX(vertex), z = positions.getZ(vertex);
    const deskAndFrontStool = Math.abs(x) < 1.7 && z > -.65 && z < 2;
    const sideStool = x > 1.8 && x < 2.7 && z > -.65 && z < .1;
    if (deskAndFrontStool || sideStool) moved.push(vertex);
  }
  const result = moved.length ? source.clone() : source;
  if (moved.length) {
    const translated = result.getAttribute('position');
    for (const vertex of moved) translated.setZ(vertex, positions.getZ(vertex) + southShift);
    translated.needsUpdate = true;
    result.computeBoundingBox();
    result.computeBoundingSphere();
  }
  variants.set(southShift, result);
  return result;
}
