import { useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, DoubleSide, Object3D, type InstancedMesh } from 'three';
import { gardenVegetation } from '../content/assets';
import { gardenTrees } from './config';
import { AssetNightContext } from './ModelAsset';
import { MEDITATION_PETAL_COUNT, placeMeditationPetal } from './meditationPetals';
import type { FocusView } from './types';
const PETALS_PER_BATCH = 12;
const blossomColors = ['#dfb7a6', '#edcfbc', '#d8a995'];
const daybedBlossomColors = ['#eee3ca', '#e7d8bd', '#ddcbb0', '#e7cfbf'];

/** A fixed-size pool derives the current batch from the focus clock, never from accumulated spawns. */
function FocusPetals({ focusView }: { focusView?: FocusView }) {
  const night = useContext(AssetNightContext);
  const petals = useRef<InstancedMesh>(null);
  const object = useMemo(() => new Object3D(), []);
  const time = useRef<(FocusView & { receivedAt: number }) | null>(null);
  useEffect(() => {
    time.current = focusView ? { ...focusView, receivedAt: performance.now() } : null;
  }, [focusView?.elapsedMs, focusView?.petalCycleMs, focusView?.paused, focusView?.retreat, focusView?.entering]);
  const initializePetals = useCallback((mesh: InstancedMesh | null) => {
    petals.current = mesh;
    if (!mesh) return;
    const colors = focusView?.retreat === 'daybed' ? daybedBlossomColors : blossomColors;
    const tint = new Color(night ? '#8e9e9a' : '#ffffff');
    for (let index = 0; index < MEDITATION_PETAL_COUNT; index++) mesh.setColorAt(index, new Color(colors[index % colors.length]).multiply(tint));
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [focusView?.retreat, night]);
  useFrame(() => {
    const mesh = petals.current;
    if (!mesh) return;
    const anchor = time.current;
    if (!anchor || anchor.entering || anchor.petalCycleMs <= 0) { mesh.visible = false; return; }
    // The parent publishes one-second focus snapshots; interpolate only up to the next snapshot.
    const elapsedMs = anchor.elapsedMs + (anchor.paused ? 0 : Math.min(1000, performance.now() - anchor.receivedAt));
    if (anchor.retreat === 'daybed') {
      mesh.visible = true;
      mesh.count = MEDITATION_PETAL_COUNT;
      for (let index = 0; index < MEDITATION_PETAL_COUNT; index++) {
        placeMeditationPetal(object, index, elapsedMs);
        mesh.setMatrixAt(index, object.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
      return;
    }
    mesh.count = PETALS_PER_BATCH;
    const bucket = Math.floor(elapsedMs / anchor.petalCycleMs);
    const withinBatch = elapsedMs - bucket * anchor.petalCycleMs;
    const durationMs = Math.min(14_000, anchor.petalCycleMs * .92);
    mesh.visible = bucket > 0 && withinBatch < durationMs;
    if (!mesh.visible) return;
    for (let index = 0; index < PETALS_PER_BATCH; index++) {
      const seed = index * 2.399 + bucket * .71;
      const delay = (index / PETALS_PER_BATCH) * durationMs * .17;
      const progress = Math.max(0, Math.min(1, (withinBatch - delay) / (durationMs - delay)));
      const source = gardenTrees[index % gardenTrees.length];
      const inward = source[0] < 0 ? 1 : -1;
      object.position.set(
        source[0] + Math.sin(seed) * .9 + inward * progress * .7 + Math.sin(progress * 7 + seed) * .2,
        .13 + (gardenVegetation.petalHeight + Math.sin(seed * .4) * .27 - .13) * (1 - progress),
        source[2] + Math.cos(seed) * .8 + progress * .75 + Math.sin(progress * 5 + seed) * .17,
      );
      object.rotation.set(progress * 4 + seed, progress * 2 + seed * .5, Math.sin(progress * 8 + seed) * .7);
      const fade = Math.min(1, progress * 15, (1 - progress) * 7);
      object.scale.set(.68 * fade, fade, fade);
      object.updateMatrix();
      mesh.setMatrixAt(index, object.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh key="focus-petals" ref={initializePetals} args={[undefined, undefined, MEDITATION_PETAL_COUNT]} visible={false} frustumCulled={false} name="focus-petal-batch"><circleGeometry args={[.065, 6]}/><meshBasicMaterial side={DoubleSide} transparent opacity={.92} depthWrite={false}/></instancedMesh>;
}

export function GardenAtmosphere({ focusView }: { focusView?: FocusView }) {
  return <group name="garden-atmosphere">
    <FocusPetals focusView={focusView}/>
  </group>;
}
