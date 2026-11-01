import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Quaternion, Vector3, type Group, type MeshBasicMaterial } from 'three';
import { tallyVesselAssets } from '../content/assets';
import { ModelAsset } from './ModelAsset';
import { tallyVessel } from './config';
import { cloudOrbit, cloudProgress } from './vesselMath';
import { adventureVesselPosition } from './adventureLayout';
import { STUDY_FURNISHED } from './studyLayout';

/** A short visual handoff only: charging rods and opening the story remain app-owned actions. */
export function VesselCloudTransition({ active, onComplete }: { active: boolean; onComplete?: () => void }) {
  const { camera } = useThree();
  const clouds = useRef<Array<Group | null>>([]);
  const veil = useRef<MeshBasicMaterial>(null);
  const veilGroup = useRef<Group>(null);
  const run = useRef<{ start: number; done: boolean; camera: Vector3; orientation: Quaternion } | null>(null);
  const callback = useRef(onComplete);
  callback.current = onComplete;
  const emission = useMemo(() => { const origin = STUDY_FURNISHED ? tallyVessel.position : adventureVesselPosition; return new Vector3(origin[0], origin[1] + tallyVessel.openingHeight, origin[2]); }, []);
  const destination = useMemo(() => new Vector3(), []);
  const offset = useMemo(() => new Vector3(), []);
  const complete = () => {
    const current = run.current;
    if (!current || current.done) return;
    current.done = true;
    callback.current?.();
  };
  useEffect(() => {
    if (!active) { run.current = null; return; }
    run.current = { start: performance.now(), done: false, camera: camera.position.clone(), orientation: camera.quaternion.clone() };
    const timer = window.setTimeout(complete, tallyVessel.transitionMs);
    return () => { window.clearTimeout(timer); run.current = null; };
  }, [active, camera]);
  useFrame(() => {
    const current = run.current;
    if (!active || !current) return;
    const progress = cloudProgress(current.start, performance.now());
    clouds.current.forEach((cloud, index) => {
      if (!cloud) return;
      const phase = cloudOrbit(progress, index);
      offset.set(...phase.offset).applyQuaternion(current.orientation);
      destination.copy(current.camera).add(offset);
      cloud.position.copy(emission).lerp(destination, phase.blend);
      cloud.quaternion.copy(current.orientation);
      cloud.rotateZ(Math.sin(progress * 4 + index) * .25);
      cloud.scale.setScalar(phase.scale);
    });
    if (veilGroup.current) {
      offset.set(0, 0, -.22).applyQuaternion(current.orientation);
      veilGroup.current.position.copy(current.camera).add(offset);
      veilGroup.current.quaternion.copy(current.orientation);
    }
    if (veil.current) veil.current.opacity = Math.max(0, (progress - .74) / .26) * .93;
    if (progress >= 1) complete();
  });
  if (!active) return null;
  return <group name="vessel-cloud-transition">
    {Array.from({ length: 10 }, (_, index) => <group key={index} ref={node => { clouds.current[index] = node; }} position={emission} scale={.045} renderOrder={10}>
      <ModelAsset asset={tallyVesselAssets.cloud} />
    </group>)}
    <group ref={veilGroup}>
      <mesh renderOrder={100}><planeGeometry args={[4, 4]} /><meshBasicMaterial ref={veil} color="#ede5ce" transparent opacity={0} depthWrite={false} depthTest={false} /></mesh>
    </group>
  </group>;
}
