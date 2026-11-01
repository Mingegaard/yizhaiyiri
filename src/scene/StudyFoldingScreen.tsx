import { useContext, useMemo } from 'react';
import { useLoader } from '@react-three/fiber';
import { Edges } from '@react-three/drei';
import { Color, PlaneGeometry, SRGBColorSpace, TextureLoader, type MeshBasicMaterial } from 'three';
import { AssetNightContext } from './ModelAsset';
import { studyScreen, studyScreenLeaves } from './studyScreenLayout';
import type { Vec3 } from './types';

const paintingUrl = `${import.meta.env.BASE_URL}textures/tang-six-fold-flower-birds.png`;
const bodyHeight = studyScreen.height - studyScreen.foot;
const paintingWidth = studyScreen.leafWidth - 2 * studyScreen.frame;
const paintingHeight = bodyHeight - 2 * studyScreen.frame;
const paintingY = studyScreen.foot + bodyHeight / 2;
const paintPaper = new Color('#e8dfc6');
const softenPaint: MeshBasicMaterial['onBeforeCompile'] = shader => {
  shader.uniforms.screenPaintPaper = { value: paintPaper };
  shader.fragmentShader = 'uniform vec3 screenPaintPaper;\n' + shader.fragmentShader;
  shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>',
    '#include <map_fragment>\ndiffuseColor.rgb = mix(screenPaintPaper * diffuse, diffuseColor.rgb, .56);');
};
const softenedPaintKey = () => 'screen-pale-pigment-v1';

function Timber({ position, size, color }: { position: Vec3; size: Vec3; color: Color }) {
  return <mesh position={position}>
    <boxGeometry args={size} />
    <meshBasicMaterial color={color} />
    <Edges threshold={35} color="#514b3e" transparent opacity={.62} depthWrite={false} />
  </mesh>;
}

export function StudyFoldingScreen() {
  const night = useContext(AssetNightContext);
  const atlas = useLoader(TextureLoader, paintingUrl);
  atlas.colorSpace = SRGBColorSpace;
  const paintGeometry = useMemo(() => studyScreenLeaves.map((_, index) => {
    const plane = new PlaneGeometry(paintingWidth, paintingHeight);
    const uv = plane.getAttribute('uv');
    for (let vertex = 0; vertex < uv.count; vertex++) {
      // Keep the atlas's thin separators underneath the physical timber frame.
      uv.setX(vertex, (index + .006 + uv.getX(vertex) * .988) / studyScreenLeaves.length);
    }
    return plane;
  }), []);
  const palette = useMemo(() => {
    const tint = new Color(night ? '#8e9e9a' : '#ffffff');
    return {
      wood: new Color('#94624e').multiply(tint),
      back: new Color('#b7b293').multiply(tint),
      brass: new Color('#b7a16c').multiply(tint),
      paint: tint,
    };
  }, [night]);
  const { leafWidth, height, thickness, frame, foot } = studyScreen;
  return <group name="study-six-fold-screen" position={studyScreen.position}>
    {studyScreenLeaves.map((leaf, index) => <group key={index} name={`study-screen-leaf-${index + 1}`}
      position={[leaf.x, 0, leaf.z]} rotation={[0, leaf.angle, 0]}>
      <mesh position={[0, paintingY, 0]}>
        <boxGeometry args={[paintingWidth, paintingHeight, thickness * .65]} />
        <meshBasicMaterial color={palette.back} />
      </mesh>
      <mesh name={`screen-painting-${index + 1}`} geometry={paintGeometry[index]} position={[0, paintingY, thickness * .34]}>
        <meshBasicMaterial map={atlas} color={palette.paint} toneMapped={false}
          onBeforeCompile={softenPaint} customProgramCacheKey={softenedPaintKey} />
      </mesh>
      {[-1, 1].map(side => <group key={side}>
        <Timber position={[side * (leafWidth - frame) / 2, foot + bodyHeight / 2, 0]}
          size={[frame, bodyHeight, thickness]} color={palette.wood} />
        <Timber position={[side * (leafWidth - frame) / 2, foot / 2, 0]}
          size={[frame, foot, thickness * 1.5]} color={palette.wood} />
      </group>)}
      {[foot + frame / 2, height - frame / 2].map(y => <group key={y}>
        <Timber position={[0, y, 0]} size={[leafWidth - 2 * frame, frame, thickness]} color={palette.wood} />
        <mesh position={[0, y, thickness / 2 + .001]}>
          <boxGeometry args={[leafWidth - 2.8 * frame, .005, .002]} />
          <meshBasicMaterial color={palette.brass} />
        </mesh>
      </group>)}
      {index < studyScreenLeaves.length - 1 ? [.38, 1.05, 1.78].map(y => <mesh key={y}
        position={[leafWidth / 2, y, 0]}>
        <cylinderGeometry args={[.012, .012, .085, 8]} />
        <meshBasicMaterial color={palette.brass} />
      </mesh>) : null}
    </group>)}
  </group>;
}
