import { Component, createContext, Suspense, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useAnimations, useGLTF, useProgress } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { Color, EdgesGeometry, LineBasicMaterial, LineSegments, type BufferGeometry, type Group, type Material, type Mesh, type Object3D } from 'three';
import type { ModelAsset as ModelAssetConfig } from '../content/assets';
import { removeSouthStudyScreens } from './studyScreens';
import { AtmosphereMotionContext } from './atmosphereMotion';
import { realignStudyPaving } from './courtyardPaving';
import { moveStudyDeskFurniture } from './studyDesk';
import { extendStudyEnclosure, raiseStudyUpperStructure } from './studyCanopy';

export const AssetNightContext = createContext(false);
export const AssetSunsetContext = createContext(false);
const inkGeometry = new WeakMap<BufferGeometry, Map<number, EdgesGeometry>>();
const solidInkGeometry = new WeakMap<EdgesGeometry, LineSegmentsGeometry>();
// Architecture and furnishings share one ink tone, opacity and screen-space weight.
const inkStyle = { color: '#514b3e', transparent: true, opacity: .62, depthWrite: false };
const inkMaterial = new LineBasicMaterial(inkStyle);
const plantInkMaterial = new LineBasicMaterial({ color: '#75664f', transparent: true, opacity: .24, depthWrite: false });
const solidInkMaterial = new LineMaterial({ ...inkStyle, linewidth: 1.10, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });
const architecturalName = /^(?:study_(?:structure|screens|sill_walls|transoms|roof|platform|details)|(?:east_wing|west_wing|north_hall|south_gate|outer_gate|south_rooms)(?:_roof|_interior)?|entrance_screen|inner_partition|outer_boundary|perimeter)__/;

export function AssetLoading() {
  const { active, progress, errors } = useProgress();
  if (!active && !errors.length) return null;
  return <div className="asset-loading-overlay" role="status"><div className="asset-loading"><span>宅</span><p>{errors.length ? '画卷未能展开，请刷新重试' : '展开庭院画卷'}</p><small>{errors.length ? '' : `${Math.round(progress)}%`}</small></div></div>;
}
class AssetBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? null : this.props.children; }
}

function LoadedAsset({ asset, animation }: { asset: ModelAssetConfig; animation?: string }) {
  const group = useRef<Group>(null);
  const night = useContext(AssetNightContext);
  const sunset = useContext(AssetSunsetContext);
  const moving = useContext(AtmosphereMotionContext);
  const windTime = useRef({ value: 0 });
  useFrame((_, delta) => { if (moving) windTime.current.value += Math.min(delta, .1); });
  const url = asset.url!.startsWith('http') ? asset.url! : `${import.meta.env.BASE_URL}${asset.url!.replace(/^\//, '')}`;
  const gltf = useGLTF(url);
  const scene = useMemo(() => {
    const source = asset.node ? gltf.scene.getObjectByName(asset.node) : gltf.scene;
    if (!source) throw new Error(`Missing model node: ${asset.node}`);
    const instance = clone(source);
    if (asset.localOrigin) instance.position.set(0, 0, 0);
    for (const [name, transform] of Object.entries(asset.nodeTransforms ?? {})) {
      const node = instance.getObjectByName(name);
      if (!node) continue;
      if (transform.scale !== undefined) node.scale.multiplyScalar(transform.scale);
      if (transform.offset) {
        node.position.x += transform.offset[0];
        node.position.y += transform.offset[1];
        node.position.z += transform.offset[2];
      }
    }
    const materials = new Map<Material, Material>();
    const windMaterials = new Map<Material, Material>();
    // Collect source meshes before adding ink: wide line objects are themselves meshes.
    const meshes: Mesh[] = [];
    instance.traverse(object => { if ((object as Mesh).isMesh) meshes.push(object as Mesh); });
    meshes.forEach(mesh => {
      let ancestor: Object3D | null = mesh;
      let included = !asset.includePrefixes?.length;
      let excluded = false, vegetation = false, skipInk = false, architectural = false, furniture = false, fineDetail = false;
      let threshold = 35;
      while (ancestor) {
        const name = ancestor.name;
        if (asset.includePrefixes?.some(prefix => name.startsWith(prefix))) included = true;
        if (asset.excludePrefixes?.some(prefix => name.startsWith(prefix))) excluded = true;
        if (name.startsWith('lux_flower_') || ancestor.userData.vegetationType) vegetation = true;
        if (architecturalName.test(name)) architectural = true;
        if (name.includes('furniture') || ancestor.userData.furnitureRole) furniture = true;
        if (/__lantern$/.test(name) || name === 'study_details__red') fineDetail = true;
        if (ancestor.userData.skipInk) skipInk = true;
        if (ancestor.userData.inkThreshold) threshold = ancestor.userData.inkThreshold;
        ancestor = ancestor.parent;
      }
      mesh.visible = included && !excluded;
      mesh.castShadow = false; mesh.receiveShadow = false;
      if (!mesh.visible) return;
      if (asset.studyNorthShift) {
        if (mesh.name.startsWith('study_')) mesh.position.z -= asset.studyNorthShift;
        if (mesh.name === 'landscape_main_paths__slab' || mesh.name === 'landscape_main_paths__slab_alt') {
          mesh.geometry = realignStudyPaving(mesh.geometry, asset.studyNorthShift, mesh.name.endsWith('__slab_alt'));
        }
      }
      if (asset.openSouthStudyFront && mesh.name.startsWith('study_screens__')) {
        mesh.geometry = removeSouthStudyScreens(mesh.geometry);
      }
      if (asset.studyDeskSouthShift && mesh.name.startsWith('study_furniture__')) {
        mesh.geometry = moveStudyDeskFurniture(mesh.geometry, asset.studyDeskSouthShift);
      }
      if (asset.studyCanopyRaise) {
        if (mesh.name.startsWith('study_roof__')) mesh.position.y += asset.studyCanopyRaise;
        if (mesh.name.startsWith('study_structure__') || mesh.name.startsWith('study_details__')) {
          mesh.geometry = raiseStudyUpperStructure(mesh.geometry, asset.studyCanopyRaise);
        }
        if (mesh.name.startsWith('study_screens__') || mesh.name.startsWith('study_sill_walls__')) {
          mesh.geometry = extendStudyEnclosure(mesh.geometry, asset.studyCanopyRaise);
        }
        if (mesh.name.startsWith('study_transoms__')) {
          mesh.geometry = extendStudyEnclosure(mesh.geometry, asset.studyCanopyRaise, true);
        }
      }
      const tint = (material: Material) => {
        const cache = vegetation ? windMaterials : materials;
        if (cache.has(material)) return cache.get(material)!;
        const copy = material.clone();
        if (night && 'color' in copy) (copy.color as Color).multiply(new Color('#8e9e9a'));
        else if (sunset && 'color' in copy) (copy.color as Color).multiply(new Color('#ffe0b8'));
        if (vegetation) {
          copy.onBeforeCompile = shader => {
            shader.uniforms.tangWindTime = windTime.current;
            shader.vertexShader = 'uniform float tangWindTime;\n' + shader.vertexShader;
            shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed.x += sin(tangWindTime * .8 + position.y * .5) * smoothstep(.6, 2.0, position.y) * .016;');
          };
          copy.customProgramCacheKey = () => 'tang-foliage-wind-v1';
        }
        cache.set(material, copy); return copy;
      };
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map(tint) : tint(mesh.material);
      if (asset.ink === false || skipInk || mesh.name.includes('retouched_ink')) return;
      // Geometry is shared across scene instances; compute each crease outline once.
      let thresholds = inkGeometry.get(mesh.geometry);
      if (!thresholds) { thresholds = new Map(); inkGeometry.set(mesh.geometry, thresholds); }
      let edges = thresholds.get(threshold);
      if (!edges) { edges = new EdgesGeometry(mesh.geometry, threshold); thresholds.set(threshold, edges); }
      let lines: LineSegments | LineSegments2;
      if ((architectural || furniture) && !vegetation && !fineDetail) {
        let geometry = solidInkGeometry.get(edges);
        if (!geometry) {
          geometry = new LineSegmentsGeometry().fromEdgesGeometry(edges);
          solidInkGeometry.set(edges, geometry);
        }
        // Screen-space width stays legible on both close folds and a distant courtyard.
        // A small depth offset keeps coplanar creases visible, with occlusion intact.
        lines = new LineSegments2(geometry, solidInkMaterial);
      } else {
        lines = new LineSegments(edges, vegetation ? plantInkMaterial : inkMaterial);
      }
      lines.name = 'illustrated-ink'; lines.renderOrder = 1;
      lines.userData.isIllustratedInk = true;
      lines.raycast = () => {};
      mesh.add(lines);
    });
    return instance;
  }, [gltf.scene, asset, night, sunset]);
  useEffect(() => () => {
    // Only cloned materials belong to this instance. Cached geometry/textures stay shared.
    const materials = new Set<Material>();
    scene.traverse(object => {
      if (!(object as Mesh).isMesh || object.userData.isIllustratedInk) return;
      const material = (object as Mesh).material;
      (Array.isArray(material) ? material : [material]).forEach(m => materials.add(m));
    });
    const sourceMaterials = new Set<Material>();
    gltf.scene.traverse(object => {
      if ((object as Mesh).isMesh) {
        const m = (object as Mesh).material;
        (Array.isArray(m) ? m : [m]).forEach(value => sourceMaterials.add(value));
      }
    });
    materials.forEach(material => { if (!sourceMaterials.has(material)) material.dispose(); });
  }, [scene, gltf.scene]);
  const { actions } = useAnimations(gltf.animations, group);
  useEffect(() => {
    const action = actions[animation || 'Idle'];
    action?.reset().fadeIn(.25).play();
    return () => { action?.fadeOut(.25); };
  }, [actions, animation]);
  return <group ref={group} position={asset.position} rotation={asset.rotation} scale={asset.scale} name={asset.node || 'tang-courtyard-model'}>
    <primitive object={scene} dispose={null} />
  </group>;
}
export function ModelAsset({ asset, animation, fallback = null }: { asset: ModelAssetConfig; animation?: string; fallback?: ReactNode }) {
  if (!asset.url) return fallback;
  return <AssetBoundary key={`${asset.url}:${asset.node || ''}`} fallback={fallback}>
    <Suspense fallback={fallback}><LoadedAsset asset={asset} animation={animation} /></Suspense>
  </AssetBoundary>;
}
