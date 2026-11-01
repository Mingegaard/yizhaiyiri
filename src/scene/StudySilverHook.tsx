import { useContext, useEffect, useMemo, useRef } from 'react';
import { useAnimations, useGLTF } from '@react-three/drei';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { BackSide, Color, MeshBasicMaterial, SkinnedMesh, type Group, type Mesh, type MeshStandardMaterial } from 'three';
import { AssetNightContext, AssetSunsetContext } from './ModelAsset';

/** Shared study/kitchen Silver Hook character, rigged and animated by Lux3D. */
export function StudySilverHook() {
  const group = useRef<Group>(null);
  const night = useContext(AssetNightContext);
  const sunset = useContext(AssetSunsetContext);
  const gltf = useGLTF(`${import.meta.env.BASE_URL}models/silverhook-study-idle.glb`);
  const { scene, materials } = useMemo(() => {
    const scene = clone(gltf.scene);
    scene.updateMatrixWorld(true);
    const materials: MeshBasicMaterial[] = [];
    const meshes: Mesh[] = [];
    scene.traverse(object => { if ((object as Mesh).isMesh) meshes.push(object as Mesh); });
    for (const mesh of meshes) {
      const paint = (source: MeshStandardMaterial) => {
        const material = new MeshBasicMaterial({ map: source.map, color: source.color.clone() });
        material.userData.basePigment = source.color.clone();
        // Muted pigment and paper highlights retain the face and robe's painted details.
        material.onBeforeCompile = shader => {
          shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
            #include <map_fragment>
            float pigment = dot(diffuseColor.rgb, vec3(.2126, .7152, .0722));
            diffuseColor.rgb = mix(vec3(pigment), diffuseColor.rgb, .63);
            diffuseColor.rgb = diffuseColor.rgb * vec3(.87, .84, .75) + vec3(.026, .024, .018);
          `);
        };
        material.customProgramCacheKey = () => 'silverhook-paper-pigment-v1';
        materials.push(material);
        return material;
      };
      mesh.material = Array.isArray(mesh.material)
        ? mesh.material.map(material => paint(material as MeshStandardMaterial))
        : paint(mesh.material as MeshStandardMaterial);
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.frustumCulled = false;
      if (!(mesh instanceof SkinnedMesh)) continue;
      const ink = new MeshBasicMaterial({ color: '#514b3e', side: BackSide });
      const inkWidth = .003 / mesh.matrixWorld.getMaxScaleOnAxis();
      ink.onBeforeCompile = shader => {
        shader.uniforms.silverhookInkWidth = { value: inkWidth };
        // Expand before skinning, so the silhouette follows the same bones as the body.
        shader.vertexShader = 'uniform float silverhookInkWidth;\n' + shader.vertexShader.replace('#include <begin_vertex>',
          '#include <begin_vertex>\ntransformed += normal * silverhookInkWidth;');
      };
      ink.customProgramCacheKey = () => 'silverhook-skinned-ink-v1';
      const outline = new SkinnedMesh(mesh.geometry, ink);
      outline.name = 'silverhook-animated-ink';
      outline.bindMode = mesh.bindMode;
      outline.bind(mesh.skeleton, mesh.bindMatrix);
      outline.frustumCulled = false;
      outline.raycast = () => {};
      mesh.add(outline);
      materials.push(ink);
    }
    scene.name = 'silverhook-study-rig';
    return { scene, materials };
  }, [gltf.scene]);
  useEffect(() => {
    const tint = new Color(night ? '#8e9e9a' : sunset ? '#ffe0b8' : '#ffffff');
    materials.forEach(material => {
      if (material.userData.basePigment) material.color.copy(material.userData.basePigment).multiply(tint);
    });
  }, [materials, night, sunset]);
  const { actions } = useAnimations(gltf.animations, group);
  const idleClip = gltf.animations[0]?.name;
  useEffect(() => {
    const action = idleClip ? actions[idleClip] : undefined;
    action?.reset().fadeIn(.25).play();
    return () => { action?.fadeOut(.25); };
  }, [actions, idleClip, scene]);
  useEffect(() => () => { materials.forEach(material => material.dispose()); }, [materials]);
  return <group ref={group} name="silverhook-study"><primitive object={scene} dispose={null} /></group>;
}
