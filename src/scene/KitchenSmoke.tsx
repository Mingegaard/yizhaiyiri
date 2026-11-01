import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group, Mesh } from 'three';

/** Small paper-colored billows match the courtyard's flat illustrated materials. */
export function KitchenSmoke({ interior }: { interior: boolean }) {
  const root = useRef<Group>(null);
  useFrame(({ clock }) => {
    root.current?.children.forEach((object, index) => {
      const mesh = object as Mesh;
      const phase = (clock.elapsedTime * .16 + index / 10) % 1;
      mesh.position.set(Math.sin(phase * 4 + index) * .12 + phase * (interior ? .25 : 1.1), phase * (interior ? 1.35 : 4.8), 0);
      const spread = (interior ? .11 : .22) + phase * (interior ? .15 : .70);
      mesh.scale.set(spread, spread * .7, spread);
      const material = mesh.material as import('three').MeshBasicMaterial;
      material.opacity = Math.sin(phase * Math.PI) * (interior ? .45 : .62);
    });
  });
  return <group ref={root} position={interior ? [1.75, 1.45, -3.5] : [16.8, 5.4, -2.32]} name="kitchen-smoke">
    {Array.from({ length: 10 }, (_, index) => <mesh key={index}><icosahedronGeometry args={[1, 1]}/><meshBasicMaterial color={interior ? "#f1ead8" : "#d4d8ca"} transparent opacity={0} depthWrite={false}/></mesh>)}
  </group>;
}
