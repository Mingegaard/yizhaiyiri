import { useLayoutEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { PerspectiveCamera, Vector3 } from 'three';
import { TangEnvironment } from './TangEnvironment';
import { ModelAsset } from './ModelAsset';
import { StoryProps } from './StoryProps';
import { storyAssets, storyShots } from './storyConfig';
import type { StoryView } from './types';
import { skyPalette } from './skyPalette';

function StoryCamera({ view }: { view: StoryView }) {
  const { camera, size, invalidate } = useThree();
  useLayoutEffect(() => {
    const shot = storyShots[view.zone];
    const target = new Vector3(...shot.target);
    if (view.prop === 'dogs' || view.prop === 'shoes' || view.prop === 'pot' || (view.prop === 'tile' && view.state === 'fragments')) target.y = .5;
    const distanceFactor = Math.max(1, .9 / (size.width / size.height));
    camera.position.set(
      target.x + (shot.camera[0] - target.x) * distanceFactor,
      shot.camera[1],
      target.z + (shot.camera[2] - target.z) * distanceFactor,
    );
    camera.lookAt(target);
    if (camera instanceof PerspectiveCamera) {
      camera.fov = 48;
      camera.updateProjectionMatrix();
    }
    invalidate();
  }, [camera, invalidate, size.width, size.height, view.zone, view.prop, view.state]);
  return null;
}

/** Fixed first-person evidence scenes; no avatar, movement listener, or life-task portal is mounted. */
export function StoryStage({ view, night }: { view: StoryView; night: boolean }) {
  const shot = storyShots[view.zone];
  const environment = storyAssets.environments[view.zone];
  const propAsset = storyAssets.props[`${view.prop}.${view.state}`] || storyAssets.props[view.prop];
  const propGeometry = <StoryProps view={view} />;
  const palette = skyPalette[night ? 'night' : 'day'];
  const background = palette.horizon;
  return <>
    <color attach="background" args={[background]} />
    <fog attach="fog" args={[background, 25, 60]} />
    <ambientLight color={night ? '#c4d3c2' : '#faf0d9'} intensity={night ? .95 : 1.35} />
    <hemisphereLight args={['#d5e2cd', '#696650', .65]} />
    <directionalLight position={[-4, 12, 7]} intensity={night ? 1.1 : 1.8} color={night ? '#bdcbbb' : '#fff1cf'} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-15} shadow-camera-right={15} shadow-camera-top={15} shadow-camera-bottom={-15} shadow-normalBias={.035} />
    <pointLight position={[shot.propPosition[0] + 1.5, 2.3, shot.propPosition[2] + 1.5]} intensity={night ? 15 : 8} distance={7} color="#f0c788" />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.6, 0]} receiveShadow><planeGeometry args={[120, 120]} /><meshStandardMaterial color={palette.ground} /></mesh>
    {environment ? <ModelAsset asset={environment}/> : view.zone !== 'river' ? <TangEnvironment sceneId={shot.room ? 'west-wing' : 'courtyard'} furniture={view.zone === 'bedroom'}/> : <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.015, -2]}><planeGeometry args={[30, 30]}/><meshBasicMaterial color="#91afa5"/></mesh>}
    <group position={shot.propPosition}>
      {propAsset ? <ModelAsset asset={propAsset} fallback={propGeometry} /> : propGeometry}
    </group>
    <StoryCamera view={view} />
  </>;
}
