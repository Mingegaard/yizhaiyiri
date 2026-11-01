import { ExtrudeGeometry, Shape, Vector2, type BufferGeometry } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

type Rectangle = readonly [number, number, number, number];
type Point = readonly [number, number];
const pavingCache = new WeakMap<BufferGeometry, Map<string, BufferGeometry>>();
const innerPavingCache = new Map<number, [BufferGeometry[], BufferGeometry[]]>();
const contains = ([x0, x1, z0, z1]: Rectangle, x: number, z: number) => x0 < x && x < x1 && z0 < z && z < z1;
const edgeKey = (a: Point, b: Point) => `${a[0]},${a[1]}:${b[0]},${b[1]}`;

/** Clip a slab to the route union, cancelling internal rectangle boundaries so
 * a junction reads as one fitted stone, rather than overlapping patches.
 */
function slabOutlines(tile: Rectangle, routes: Rectangle[], voids: Rectangle[]) {
  const [x0, x1, z0, z1] = tile;
  const xs = new Set([x0, x1]), zs = new Set([z0, z1]);
  for (const [a, b, c, d] of [...routes, ...voids]) {
    for (const x of [a, b]) if (x0 < x && x < x1) xs.add(x);
    for (const z of [c, d]) if (z0 < z && z < z1) zs.add(z);
  }
  const columns = [...xs].sort((a, b) => a - b), rows = [...zs].sort((a, b) => a - b);
  const edges = new Map<string, [Point, Point]>();
  for (let i = 0; i < columns.length - 1; i++) for (let j = 0; j < rows.length - 1; j++) {
    const a = columns[i], b = columns[i + 1], c = rows[j], d = rows[j + 1];
    const x = (a + b) / 2, z = (c + d) / 2;
    if (!routes.some(rect => contains(rect, x, z)) || voids.some(rect => contains(rect, x, z))) continue;
    const corners: Point[] = [[a, c], [b, c], [b, d], [a, d]];
    corners.forEach((start, index) => {
      const end = corners[(index + 1) % 4];
      if (!edges.delete(edgeKey(end, start))) edges.set(edgeKey(start, end), [start, end]);
    });
  }
  const loops: Point[][] = [];
  while (edges.size) {
    const [start, end] = edges.values().next().value!;
    edges.delete(edgeKey(start, end));
    const loop: Point[] = [start];
    let cursor = end;
    while (cursor[0] !== start[0] || cursor[1] !== start[1]) {
      loop.push(cursor);
      const next = [...edges.values()].find(([point]) => point[0] === cursor[0] && point[1] === cursor[1]);
      if (!next) throw new Error('Open courtyard paving boundary');
      edges.delete(edgeKey(...next));
      cursor = next[1];
    }
    loops.push(loop.filter((point, index) => {
      const prev = loop[(index + loop.length - 1) % loop.length], next = loop[(index + 1) % loop.length];
      return Math.abs((point[0] - prev[0]) * (next[1] - point[1]) - (point[1] - prev[1]) * (next[0] - point[0])) > 1e-8;
    }));
  }
  return loops;
}

function innerPaving(northShift: number) {
  const cached = innerPavingCache.get(northShift);
  if (cached) return cached;
  const north = -3.6 - northShift, south = 3.6 - northShift;
  const routes: Rectangle[] = [
    [-2.4, 2.4, south, 14.4], [-2.4, 2.4, -14.8, north],
    [-18.8, 18.8, -1.6, 1.6], // Keep both wing door approaches connected.
    [-6.6, 6.6, south, 6 - northShift], [-6.6, 6.6, -6 - northShift, north],
    [-6.6, -4.3, -6 - northShift, 6 - northShift], [4.3, 6.6, -6 - northShift, 6 - northShift],
    [-18.8, 18.8, -14.8, -13], [-18.8, -16.9, -14.8, 14.4],
    [16.9, 18.8, -14.8, 14.4], [-18.8, 18.8, 12.8, 14.4],
  ];
  const voids: Rectangle[] = [
    [-4.3, 4.3, north, south],
    [-16.5, -3.4, -12.7, -6.8], [3.4, 16.5, -12.7, -6.8],
    [-16.5, -3.4, 7, 12.7], [3.4, 16.5, 7, 12.7],
  ];
  const tiles: [BufferGeometry[], BufferGeometry[]] = [[], []];
  // Centre the same large-slab module on the relocated study, leaving 30mm joints.
  for (let ix = -8; ix < 8; ix++) for (let iz = -7; iz < 9; iz++) {
    const tile: Rectangle = [ix * 2.4 + .015, (ix + 1) * 2.4 - .015,
      iz * 2.4 - northShift + .015, (iz + 1) * 2.4 - northShift - .015];
    for (const loop of slabOutlines(tile, routes, voids)) {
      if (loop.length < 3) continue;
      const shape = new Shape(loop.map(([x, z]) => new Vector2(x, -z)));
      const slab = new ExtrudeGeometry(shape, { depth: .093, bevelEnabled: false, steps: 1, curveSegments: 1 });
      slab.deleteAttribute('uv');
      slab.rotateX(-Math.PI / 2);
      slab.translate(0, .112, 0);
      tiles[(ix * 3 + iz * 5) % 13 === 0 ? 1 : 0].push(slab);
    }
  }
  innerPavingCache.set(northShift, tiles);
  return tiles;
}

/** Re-tile the inner court around the moved plinth; retain the original forecourt
 * geometry and both limestone materials. Coordinates remain original GLB units.
 */
export function realignStudyPaving(source: BufferGeometry, northShift: number, alternate = false) {
  if (!northShift) return source;
  let variants = pavingCache.get(source);
  if (!variants) { variants = new Map(); pavingCache.set(source, variants); }
  const key = `${northShift}:${alternate}`;
  const cached = variants.get(key);
  if (cached) return cached;
  const positions = source.getAttribute('position'), indices = source.getIndex();
  const count = indices?.count ?? positions.count, kept: number[] = [];
  for (let triangle = 0; triangle < count; triangle += 3) {
    const vertices = [0, 1, 2].map(offset => indices ? indices.getX(triangle + offset) : triangle + offset);
    if (vertices.every(vertex => positions.getZ(vertex) > 16)) kept.push(...vertices);
  }
  const parts = [...innerPaving(northShift)[alternate ? 1 : 0]];
  let forecourt: BufferGeometry | undefined;
  if (kept.length) {
    const indexed = source.clone().setIndex(kept);
    forecourt = indexed.toNonIndexed();
    indexed.dispose();
    parts.unshift(forecourt);
  }
  const result = mergeGeometries(parts);
  forecourt?.dispose();
  if (!result) throw new Error('Unable to realign courtyard paving');
  result.computeBoundingBox();
  result.computeBoundingSphere();
  variants.set(key, result);
  return result;
}
