import type { Object3D } from 'three';
import { gardenTrees } from './config';

export const MEDITATION_PETAL_COUNT = 40;

/** Recycle a small continuous pool under the flowering tree in the south view. */
export function placeMeditationPetal(object: Object3D, index: number, elapsedMs: number) {
  const seed = index * 2.399963;
  const duration = 17000 + (index % 7) * 1050;
  const progress = (elapsedMs / duration + ((index * .6180339) % 1)) % 1;
  const [treeX, , treeZ] = gardenTrees[0];
  object.position.set(
    treeX + Math.sin(seed) * 1.9 + progress * 1.15 + Math.sin(progress * 6 + seed) * .30,
    .16 + (4.9 + Math.cos(seed * .7) * .55 - .16) * (1 - progress),
    treeZ - .75 + Math.cos(seed * .9) * 1.5 - progress * .9 + Math.sin(progress * 5 + seed) * .23,
  );
  object.rotation.set(seed + progress * 2.3, seed * .4 + progress * 1.5, Math.sin(progress * 5 + seed) * .7);
  const fade = Math.max(0, Math.min(1, progress * 12, (1 - progress) * 8));
  object.scale.set(.72 * fade, fade, fade);
  object.updateMatrix();
}
