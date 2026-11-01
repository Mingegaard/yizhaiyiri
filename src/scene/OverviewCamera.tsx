import { useLayoutEffect, useMemo, useRef, type ComponentRef } from 'react';
import { OrbitControls, OrthographicCamera, useGLTF } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { Box3, Vector3, type OrthographicCamera as Camera } from 'three';
import { courtyardAsset } from '../content/assets';
import { fitOverviewCamera } from './overviewFraming';

const url = `${import.meta.env.BASE_URL}${courtyardAsset.url!.replace(/^\//, '')}`;

export function OverviewCamera({ blocked, resetKey = 0 }: { blocked: boolean; resetKey?: number }) {
  const camera = useRef<Camera>(null);
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const size = useThree(state => state.size);
  const gltf = useGLTF(url);
  const bounds = useMemo(() => {
    const box = new Box3().setFromObject(gltf.scene);
    const scale = courtyardAsset.scale as number;
    const offset = new Vector3(...courtyardAsset.position);
    box.min.multiplyScalar(scale).add(offset);
    box.max.multiplyScalar(scale).add(offset);
    return box;
  }, [gltf.scene]);
  const frame = useMemo(() => fitOverviewCamera(bounds, size.width / size.height), [bounds, size.width, size.height]);

  useLayoutEffect(() => {
    if (!camera.current) return;
    camera.current.position.set(...frame.position);
    camera.current.zoom = 1;
    camera.current.lookAt(...frame.target);
    camera.current.updateProjectionMatrix();
    if (controls.current) {
      controls.current.target.set(...frame.target);
      controls.current.update();
    }
  }, [frame, resetKey]);

  return <>
    <OrthographicCamera ref={camera} makeDefault manual position={frame.position}
      left={frame.left} right={frame.right} top={frame.top} bottom={frame.bottom}
      near={frame.near} far={frame.far} />
    <OrbitControls key={`${resetKey}:${size.width}:${size.height}`} ref={controls} makeDefault target={frame.target} enabled={!blocked}
      enableDamping dampingFactor={.09} minZoom={.65} maxZoom={4}
      minPolarAngle={.12} maxPolarAngle={Math.PI * .42} />
  </>;
}
