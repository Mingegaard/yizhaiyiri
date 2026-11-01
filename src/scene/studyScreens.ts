import type { BufferGeometry } from 'three';

const openSouthScreens = new WeakMap<BufferGeometry, BufferGeometry>();

/** The supplied screen meshes merge all four facades by material. Remove only
 * the south-facing fixed/folded leaves, keeping the north and side screens.
 * Coordinates are in the original GLB's Y-up space, before the asset transform.
 */
export function removeSouthStudyScreens(source: BufferGeometry): BufferGeometry {
  const cached = openSouthScreens.get(source);
  if (cached) return cached;
  const positions = source.getAttribute('position');
  const indices = source.getIndex();
  const count = indices?.count ?? positions.count;
  const kept: number[] = [];
  for (let triangle = 0; triangle < count; triangle += 3) {
    const a = indices ? indices.getX(triangle) : triangle;
    const b = indices ? indices.getX(triangle + 1) : triangle + 1;
    const c = indices ? indices.getX(triangle + 2) : triangle + 2;
    // The side-screen frame starts at |x| = 3.5925; the south leaves end at
    // |x| = 3.5725. This narrow separation preserves both corner elevations.
    const southLeaf = [a, b, c].every(vertex =>
      positions.getZ(vertex) > 2.5 && Math.abs(positions.getX(vertex)) < 3.58);
    if (!southLeaf) kept.push(a, b, c);
  }
  const result = kept.length === count ? source : source.clone().setIndex(kept);
  openSouthScreens.set(source, result);
  return result;
}
