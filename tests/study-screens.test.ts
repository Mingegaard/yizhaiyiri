import { expect, it } from 'vitest';
import { BufferGeometry, Float32BufferAttribute } from 'three';
import { removeSouthStudyScreens } from '../src/scene/studyScreens';

it('removes the south fixed and folded screen leaves without changing the north, side, or source geometry', () => {
  const centers = [[-2.73, 2.85], [2.73, 2.85], [-1.66, 2.96], [1.66, 2.96],
    [-2.73, -2.85], [2.73, -2.85], [-3.65, 2.75], [3.65, 2.75]];
  const vertices = centers.flatMap(([x, z]) => [x, 1, z, x + .01, 1, z, x, 2, z]);
  const original = new BufferGeometry();
  original.setAttribute('position', new Float32BufferAttribute(vertices, 3));
  original.setIndex(Array.from({ length: 24 }, (_, index) => index));
  const opened = removeSouthStudyScreens(original);
  expect([...opened.getIndex()!.array]).toEqual(Array.from({ length: 12 }, (_, index) => index + 12));
  expect(original.getIndex()!.count).toBe(24);
  expect(removeSouthStudyScreens(original)).toBe(opened);
});
