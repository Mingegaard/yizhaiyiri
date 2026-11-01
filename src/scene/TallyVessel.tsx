import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useThree, type ThreeEvent } from '@react-three/fiber';
import { Object3D, type InstancedMesh } from 'three';
import { tallyVesselAssets } from '../content/assets';
import { isNearStudyDesk, tallyVessel } from './config';
import { ModelAsset } from './ModelAsset';
import { isVesselTap, stickPositions } from './vesselMath';
import { adventureVesselPosition, isNearAdventureVessel } from './adventureLayout';

function TallySticks({ count }: { count: number }) {
  const positions = useMemo(() => stickPositions(count), [count]);
  const attachMesh = useCallback((mesh: InstancedMesh | null) => {
    if (!mesh) return;
    const object = new Object3D();
    positions.forEach((position, index) => {
      object.position.set(...position);
      object.rotation.set(Math.sin(index * 2.4) * .025, index * .7, Math.cos(index * 2.4) * .025);
      object.updateMatrix();
      mesh.setMatrixAt(index, object.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.boundingBox = null;
    mesh.boundingSphere = null;
  }, [positions]);
  if (!count) return null;
  return <instancedMesh key={count} ref={attachMesh} args={[undefined, undefined, count]} name="tally-sticks" castShadow>
    <boxGeometry args={[.0032, .19, .0014]} /><meshStandardMaterial color="#ddc58a" metalness={.4} roughness={.48} />
  </instancedMesh>;
}

export function TallyVessel({ rods, enabled, onTouch, writingTable = false }: { rods: number; enabled: boolean; onTouch: () => void; writingTable?: boolean }) {
  const { camera, gl } = useThree();
  const press = useRef<{ pointerId: number; x: number; y: number; moved: number } | null>(null);
  const latest = useRef({ enabled, onTouch });
  latest.current = { enabled, onTouch };
  const isNear = () => writingTable ? isNearAdventureVessel([camera.position.x, 0, camera.position.z]) : isNearStudyDesk([camera.position.x, 0, camera.position.z], 'courtyard');
  useEffect(() => {
    const move = (event: PointerEvent) => {
      const initial = press.current;
      if (initial?.pointerId === event.pointerId) initial.moved = Math.max(initial.moved, Math.hypot(event.clientX - initial.x, event.clientY - initial.y));
    };
    const release = (event: PointerEvent) => {
      const initial = press.current;
      if (!initial || initial.pointerId !== event.pointerId) return;
      press.current = null;
      const movement = Math.max(initial.moved, Math.hypot(event.clientX - initial.x, event.clientY - initial.y));
      if (isVesselTap(movement, latest.current.enabled, isNear())) latest.current.onTouch();
    };
    const cancel = () => { press.current = null; };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', cancel);
    window.addEventListener('blur', cancel);
    return () => {
      gl.domElement.style.cursor = '';
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', release);
      window.removeEventListener('pointercancel', cancel);
      window.removeEventListener('blur', cancel);
    };
  }, [camera, gl, writingTable]);
  const touch = (event: ThreeEvent<PointerEvent>) => {
    if (!enabled || event.button !== 0 || !isNear()) return;
    press.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, moved: 0 };
  };
  return <group position={writingTable ? adventureVesselPosition : tallyVessel.position} name="tally-vessel">
    <ModelAsset asset={tallyVesselAssets.vessel} />
    <TallySticks count={rods} />
    <mesh position={[0, .22, 0]} onPointerDown={touch}
      onPointerOver={() => { if (enabled && isNear()) gl.domElement.style.cursor = 'pointer'; }}
      onPointerOut={() => { gl.domElement.style.cursor = ''; }}>
      <boxGeometry args={tallyVessel.hitSize} /><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
    </mesh>
  </group>;
}
