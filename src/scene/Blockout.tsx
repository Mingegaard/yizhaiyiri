import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BufferGeometry, Float32BufferAttribute, type Group } from 'three';
import type { ElfState, SceneId, Vec3 } from './types';
import { study } from './config';

const palette = { wall: '#e5dbc6', timber: '#8b5242', roof: '#667b70', stone: '#c4c0ad', ground: '#c4c5aa', pale: '#ede8d8' };

function Box({ at, size, color, rotation }: { at: Vec3; size: Vec3; color: string; rotation?: Vec3 }) {
  return <mesh position={at} rotation={rotation} castShadow receiveShadow><boxGeometry args={size} /><meshStandardMaterial color={color} roughness={.9} /></mesh>;
}

function HipRoof({ width, depth, position }: { width: number; depth: number; position: Vec3 }) {
  const geometry = useMemo(() => {
    const x = width / 2, z = depth / 2, ridge = width * .31;
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute([
      -x, 0, -z, x, 0, -z, x, 0, z, -x, 0, z, -ridge, .85, 0, ridge, .85, 0,
    ], 3));
    g.setIndex([0, 4, 5, 0, 5, 1, 1, 5, 2, 2, 5, 4, 2, 4, 3, 3, 4, 0, 0, 1, 2, 0, 2, 3]);
    g.computeVertexNormals();
    return g;
  }, [width, depth]);
  return <group position={position}>
    <mesh geometry={geometry} castShadow receiveShadow><meshStandardMaterial color={palette.roof} roughness={.85} /></mesh>
    <Box at={[0, -.09, 0]} size={[width + .13, .18, depth + .13]} color="#4f645b" />
    <Box at={[0, .88, 0]} size={[width * .66, .11, .13]} color="#4f645b" />
    {Array.from({ length: Math.round(width / .38) }, (_, i) => {
      const x = -width / 2 + .25 + i * .38;
      const height = Math.min(1, (width / 2 - Math.abs(x)) / (width * .19)) * .85;
      const length = Math.sqrt(depth * depth / 4 + height * height);
      return <group key={i}>
        <Box at={[x, height / 2 + .018, depth / 4]} size={[.025, .025, length]} rotation={[Math.atan2(height, depth / 2), 0, 0]} color="#829183" />
        <Box at={[x, height / 2 + .018, -depth / 4]} size={[.025, .025, length]} rotation={[-Math.atan2(height, depth / 2), 0, 0]} color="#829183" />
      </group>;
    })}
  </group>;
}

function Pavilion() {
  const halfWidth = study.width / 2;
  const halfDepth = study.depth / 2;
  return <group position={study.center}>
    <Box at={[0, .025, 0]} size={[study.width + .5, .07, study.depth + .35]} color="#b9b19c" />
    {Array.from({ length: 11 }, (_, index) => <Box key={index} at={[-2.8 + index * .56, .073, 0]} size={[.54, .045, study.depth]} color={index % 3 ? '#b69a77' : '#c0a784'} />)}
    <Box at={[0, 1.5, -halfDepth]} size={[study.width, 3, .16]} color="#e3d9c1" />
    <Box at={[0, .42, -halfDepth + .1]} size={[study.width, .72, .08]} color="#9b7558" />
    {[-1, 1].map(side => <group key={side}>
      <Box at={[side * halfWidth, .43, 0]} size={[.16, .72, study.depth]} color="#a48565" />
      {[-halfDepth + .1, 0, halfDepth - .1].map(z => <Box key={z} at={[side * (halfWidth - .08), 1.65, z]} size={[.19, 3.2, .19]} color="#805b46" />)}
      {[.87, 1.4, 2.03, 2.63, 3.05].map(y => <Box key={y} at={[side * halfWidth, y, 0]} size={[.13, y === 3.05 ? .19 : .06, study.depth]} color="#8f694e" />)}
      {Array.from({ length: 8 }, (_, index) => <Box key={index} at={[side * halfWidth, 1.72, -1.88 + index * .54]} size={[.065, 1.75, .045]} color="#9a7b58" />)}
    </group>)}
    {[-1.85, 0, 1.85].map(x => <Box key={x} at={[x, 1.7, -halfDepth + .11]} size={[.1, 2.65, .08]} color="#a28764" />)}
    <Box at={[0, 3.08, halfDepth - .09]} size={[study.width, .26, .24]} color="#79563f" />
    <Box at={[0, 3.08, -halfDepth + .09]} size={[study.width, .26, .24]} color="#79563f" />
    {[-2.55, -1.27, 0, 1.27, 2.55].map(x => <Box key={x} at={[x, 3.14, 0]} size={[.12, .17, study.depth]} color="#997756" />)}
    <HipRoof width={study.width + .85} depth={study.depth + .7} position={[0, 3.29, 0]} />
    <Box at={[0, 2.78, halfDepth + .065]} size={[1.05, .35, .06]} color="#7c8066" />
  </group>;
}

function StudyDesk() {
  return <group position={study.deskPosition}>
    <Box at={[0, study.deskHeight, 0]} size={study.deskSize} color="#76553e" />
    <Box at={[0, study.deskHeight - .15, 0]} size={[study.deskSize[0] - .15, .18, study.deskSize[2] - .13]} color="#8b6749" />
    {[-.91, .91].flatMap(x => [-.35, .35].map(z => <Box key={`${x}:${z}`} at={[x, .38, z]} size={[.11, .76, .11]} color="#805d42" />))}
    <Box at={[0, .24, .35]} size={[1.82, .075, .065]} color="#8e6c4b" />
    <Box at={[-.22, study.deskHeight + .074, -.02]} size={[1.02, .018, .55]} color="#e8dcc0" />
    {[-.31, .27].map(z => <mesh key={z} position={[-.22, study.deskHeight + .092, z]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[.035, .035, 1.12, 8]}/><meshStandardMaterial color="#b29b75" roughness={.9}/></mesh>)}
    <Box at={[.69, study.deskHeight + .09, .1]} size={[.26, .045, .18]} color="#5b5c50" />
    <mesh position={[.7, study.deskHeight + .1, -.23]} rotation={[Math.PI / 2, 0, -.2]} castShadow><cylinderGeometry args={[.015, .02, .37, 6]}/><meshStandardMaterial color="#a18b62" roughness={1}/></mesh>
    <Box at={[0, .31, -.99]} size={[.77, .1, .46]} color="#ad9271" />
    {[-.28, .28].map(x => <Box key={x} at={[x, .15, -.99]} size={[.09, .3, .34]} color="#8f7354" />)}
  </group>;
}

function Corridor({ x }: { x: number }) {
  return <group position={[x, 0, 0]}>
    <Box at={[0, .08, 0]} size={[2.5, .16, 17.6]} color="#d7d0ba" />
    <Box at={[x > 0 ? .95 : -.95, 1.35, 0]} size={[.22, 2.7, 17.5]} color={palette.wall} />
    {[-7.8, -5.2, -2.6, 0, 2.6, 5.2, 7.8].map(z => <Box key={z} at={[x > 0 ? -.9 : .9, 1.4, z]} size={[.16, 2.8, .16]} color={palette.timber} />)}
    <Box at={[x > 0 ? -.9 : .9, 2.7, 0]} size={[.18, .18, 17.6]} color={palette.timber} />
    <group position={[0, 0, -1.5]} rotation={[0, Math.PI / 2, 0]}><HipRoof width={15} depth={2.55} position={[0, 2.85, 0]} /></group>
    <Box at={[x > 0 ? .8 : -.8, 1.12, 1.5]} size={[.15, 2.24, 1.6]} color="#687463" />
    <Box at={[x > 0 ? .7 : -.7, 1.12, 1.5]} size={[.12, 2.24, .055]} color="#ae9373" />
  </group>;
}

/** Geometry only. GardenAtmosphere is mounted separately so artists can replace either layer. */
export function CourtyardBlockout() {
  return <group>
    <Box at={[0, -.3, 0]} size={[21, .55, 21]} color="#bbb69f" />
    <Box at={[0, -.04, 0]} size={[20.5, .1, 20.5]} color={palette.ground} />
    <Box at={[0, .01, 4.3]} size={[2.5, .045, 8.2]} color="#d6d2bf" />
    <Box at={[0, .015, 1.5]} size={[17, .05, 2]} color="#d6d2bf" />
    {Array.from({ length: 6 }, (_, i) => <Box key={i} at={[0, .048, .85 + i * 1.28]} size={[2.42, .025, 1.2]} color={i % 3 ? '#dfdac7' : '#d5d0bd'} />)}
    <Pavilion /><StudyDesk />
    <Corridor x={9} /><Corridor x={-9} />
    <Box at={[0, 1.4, -9.5]} size={[18, 2.8, .3]} color={palette.wall} />
    {[-4.3, 4.3].map(x => <group key={x} position={[x, 0, 7.6]}>
      <Box at={[0, .2, 0]} size={[.7, .4, .7]} color="#b0ad98" />
      <Box at={[0, .8, 0]} size={[.2, 1, .2]} color="#a09b85" />
      <Box at={[0, 1.35, 0]} size={[.5, .45, .5]} color="#e6d6ad" />
      <HipRoof width={.75} depth={.75} position={[0, 1.6, 0]} />
    </group>)}
    {[-1, 1].map(side => <group key={side}>
      <Box at={[side * 4.7, 1.2, 8]} size={[7.2, 2.4, .28]} color="#ddd4bd" />
      <Box at={[side * 4.7, 2.43, 8]} size={[7.3, .12, .45]} color="#6e7a68" />
      <Box at={[side * 1.17, 1.53, 8]} size={[.18, 3.06, .24]} color="#846149" />
    </group>)}
    <Box at={[0, 2.96, 8]} size={[2.65, .2, .24]} color="#846149" />
    <HipRoof width={3.05} depth={1.18} position={[0, 3.12, 8]} />
  </group>;
}

/** Deliberately empty rooms establish navigable dimensions for the artists' replacements. */
export function RoomBlockout({ sceneId }: { sceneId: Exclude<SceneId, 'courtyard'> }) {
  return <group>
    <Box at={[0, -.2, 0]} size={[11, .4, 10.5]} color="#b9b29c" />
    <Box at={[0, .01, 0]} size={[10.5, .04, 10]} color={sceneId === 'kitchen' ? '#d4ceba' : '#c8c8b4'} />
    <Box at={[0, 1.5, -4.9]} size={[10.5, 3, .22]} color={palette.wall} />
    <Box at={[-5.3, 1.5, 0]} size={[.22, 3, 10]} color={palette.wall} />
    <Box at={[5.3, 1.5, 0]} size={[.22, 3, 10]} color={palette.wall} />
    {[-5.1, 0, 5.1].map(x => <Box key={x} at={[x, 1.5, -4.7]} size={[.18, 3, .18]} color={palette.timber} />)}
    <Box at={[0, 3, -4.7]} size={[10.5, .18, .22]} color={palette.timber} />
    <Box at={[2.5, 1.9, -4.7]} size={[1.7, 1.3, .15]} color="#8a9b86" />
    {[-.55, 0, .55].map(x => <Box key={x} at={[2.5 + x, 1.9, -4.58]} size={[.05, 1.3, .03]} color="#c7b494" />)}
    <Box at={[0, .045, 4.25]} size={[2.3, .07, .9]} color="#eee5d0" />
  </group>;
}

export function ElfBlockout({ state }: { state: ElfState }) {
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.position.y = .1 + Math.sin(clock.elapsedTime * 1.7) * .09;
      ref.current.rotation.y = Math.sin(clock.elapsedTime * .6) * .15;
    }
  });
  return <group ref={ref}>
    <mesh position={[0, .48, 0]} castShadow><sphereGeometry args={[.38, 20, 14]} /><meshStandardMaterial color="#afbd91" roughness={.85} /></mesh>
    <mesh position={[0, 1.02, .03]} castShadow><sphereGeometry args={[.36, 20, 14]} /><meshStandardMaterial color="#eddbbc" /></mesh>
    <mesh position={[0, 1.29, .015]} castShadow><sphereGeometry args={[.29, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#586f5d" /></mesh>
    {[-.115, .115].map(x => <mesh key={x} position={[x, 1.03, .365]}><sphereGeometry args={[.027, 8, 8]} /><meshBasicMaterial color="#5a5247" /></mesh>)}
    <mesh position={[.32, .75, .07]} rotation={[0, 0, state === 'cooking' ? -.8 : -.3]} castShadow><capsuleGeometry args={[.065, .28, 4, 8]} /><meshStandardMaterial color="#e0cbaa" /></mesh>
    <mesh position={[-.32, .75, .07]} rotation={[0, 0, .3]} castShadow><capsuleGeometry args={[.065, .28, 4, 8]} /><meshStandardMaterial color="#e0cbaa" /></mesh>
  </group>;
}
