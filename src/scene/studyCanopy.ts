import type { BufferGeometry } from 'three';

const raisedStructures = new WeakMap<BufferGeometry, Map<number, BufferGeometry>>();
const extendedEnclosures = new WeakMap<BufferGeometry, Map<string, BufferGeometry>>();

// Source-space heights from the supplied study: keep the solid lower leaves and
// side sills fixed, and extend the paper lattice to its original beam junction.
const latticeBottom = 1.255;
const frameTop = 3.3175;

/** Fill the extra canopy height with taller windows, not a floating screen.
 * Door transoms move as complete bands; their entrance thresholds stay put.
 */
export function extendStudyEnclosure(source: BufferGeometry, lift: number, transom = false): BufferGeometry {
  if (!lift) return source;
  let variants = extendedEnclosures.get(source);
  if (!variants) { variants = new Map(); extendedEnclosures.set(source, variants); }
  const key = `${lift}:${transom}`;
  const cached = variants.get(key);
  if (cached) return cached;
  const positions = source.getAttribute('position');
  const result = source.clone();
  const extended = result.getAttribute('position');
  for (let vertex = 0; vertex < positions.count; vertex++) {
    const y = positions.getY(vertex);
    const amount = transom ? (y > 2.8 ? 1 : 0)
      : Math.max(0, Math.min(1, (y - latticeBottom) / (frameTop - latticeBottom)));
    extended.setY(vertex, y + lift * amount);
  }
  extended.needsUpdate = true;
  result.computeVertexNormals();
  result.computeBoundingBox();
  result.computeBoundingSphere();
  variants.set(key, result);
  return result;
}

/** Source Y=3.2 separates the roof support assembly from the fixed lower parts.
 * Moving the upper post rings extends the columns without lifting their bases.
 * The same cut extends lantern cords, keeping the lantern bodies in place, and
 * moves the roof-mounted plaque with its beam. Window meshes are extended
 * separately with extendStudyEnclosure; furniture remains unchanged.
 */
export function raiseStudyUpperStructure(source: BufferGeometry, lift: number): BufferGeometry {
  let variants = raisedStructures.get(source);
  if (!variants) { variants = new Map(); raisedStructures.set(source, variants); }
  const cached = variants.get(lift);
  if (cached) return cached;
  const positions = source.getAttribute('position');
  const raised: number[] = [];
  for (let vertex = 0; vertex < positions.count; vertex++) {
    if (positions.getY(vertex) > 3.2) raised.push(vertex);
  }
  const result = raised.length ? source.clone() : source;
  if (raised.length) {
    const translated = result.getAttribute('position');
    for (const vertex of raised) translated.setY(vertex, positions.getY(vertex) + lift);
    translated.needsUpdate = true;
    result.computeVertexNormals();
    result.computeBoundingBox();
    result.computeBoundingSphere();
  }
  variants.set(lift, result);
  return result;
}
