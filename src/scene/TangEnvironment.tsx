import { Suspense, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { cookingElfAsset, elfAsset, roomFurniture, sceneAssets, studyDaybedAsset, studyWritingTableAsset } from '../content/assets';
import { CourtyardSigns } from './CourtyardSigns';
import { AssetBoundary, ModelAsset } from './ModelAsset';
import { StudyFoldingScreen } from './StudyFoldingScreen';
import { StudySilverHook } from './StudySilverHook';
import type { ElfState, SceneId } from './types';

export function TangEnvironment({ sceneId, furniture = true }: { sceneId: SceneId; furniture?: boolean }) {
  return <>
    <ModelAsset asset={sceneAssets[sceneId]} />
    <CourtyardSigns interior={sceneId !== 'courtyard'}/>
    {sceneId === 'courtyard' ? <Suspense fallback={null}><StudyFoldingScreen /></Suspense> : null}
    {sceneId === 'courtyard' ? <ModelAsset asset={studyDaybedAsset} /> : null}
    {sceneId === 'courtyard' ? <ModelAsset asset={studyWritingTableAsset} /> : null}
    {sceneId !== 'courtyard' && furniture ? <ModelAsset asset={roomFurniture[sceneId]} /> : null}
  </>;
}
export function CourtyardCompanion({ state, celebrating = false, silverHook = false }: { state: ElfState; celebrating?: boolean; silverHook?: boolean }) {
  const group = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (!group.current || state === 'sleeping') return;
    group.current.position.y = celebrating ? .045 + Math.abs(Math.sin(clock.elapsedTime * 5.5)) * .34 : silverHook ? 0 : .045 + Math.sin(clock.elapsedTime * 1.4) * .035;
    group.current.rotation.z = celebrating ? Math.sin(clock.elapsedTime * 5.5) * .08 : 0;
    group.current.rotation.y = silverHook ? 0 : Math.sin(clock.elapsedTime * .55) * .10;
  });
  return <group ref={group}>{silverHook
    ? <AssetBoundary fallback={null}><Suspense fallback={null}><StudySilverHook /></Suspense></AssetBoundary>
    : <ModelAsset asset={state === 'cooking' ? cookingElfAsset : elfAsset}/>}</group>;
}
