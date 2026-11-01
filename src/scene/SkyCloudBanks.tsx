import { useEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { BackSide, Box3, Color, Group, Mesh, MeshBasicMaterial, Vector3 } from 'three';

const cloudUrl = `${import.meta.env.BASE_URL}models/tang-volume-clouds.glb`;
interface CloudBank {
  angle: number; radius: number; height: number; width: number;
  variant: number; speed: number; heightScale?: number; depthScale?: number;
}
const banks: readonly CloudBank[] = [
  { angle: -.18, radius: 100, height: 47, width: 48, variant: 0, speed: .0017, heightScale: 1.1 },
  { angle: .52, radius: 106, height: 51, width: 37, variant: 1, speed: .0017 },
  { angle: 1.28, radius: 98, height: 43, width: 32, variant: 2, speed: .0017 },
  { angle: 2.10, radius: 102, height: 46, width: 50, variant: 0, speed: .0017, heightScale: 1.1 },
  { angle: 2.92, radius: 100, height: 49, width: 35, variant: 1, speed: .0017 },
  { angle: 3.76, radius: 104, height: 45, width: 46, variant: 2, speed: .0017, heightScale: 1.1 },
  { angle: 4.57, radius: 101, height: 48, width: 33, variant: 1, speed: .0017 },
  { angle: 5.34, radius: 98, height: 42, width: 42, variant: 0, speed: .0017 },
  // Nearer, fuller cumulus at high elevations fill the view above the courtyard.
  { angle: -.05, radius: 44, height: 64, width: 60, variant: 2, speed: .0011, heightScale: 1.1 },
  { angle: 1.25, radius: 47, height: 72, width: 53, variant: 0, speed: .0009, depthScale: 1.05 },
  { angle: 3.00, radius: 40, height: 68, width: 62, variant: 1, speed: .0010, heightScale: 1.1 },
  { angle: 4.75, radius: 49, height: 70, width: 56, variant: 2, speed: .0009, depthScale: 1.1 },
  { angle: .45, radius: 12, height: 68, width: 50, variant: 1, speed: .0013, depthScale: 1.05 },
];

/** Connected sculpted cloud volumes, with painted folds and a quiet ink silhouette. */
export function SkyCloudBanks({ night, time }: { night: boolean; time: { current: number } }) {
  const gltf = useGLTF(cloudUrl);
  const layer = useRef<Group>(null);
  const actors = useRef<Array<Group | null>>([]);
  const { templates, materials } = useMemo(() => {
    const outline = new MeshBasicMaterial({ color: night ? '#596f82' : '#8395a4', side: BackSide,
      transparent: true, opacity: .48, depthWrite: false, fog: false, toneMapped: false });
    outline.onBeforeCompile = shader => {
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>',
        'vec3 transformed = position + normal * .022;');
    };
    outline.customProgramCacheKey = () => 'sculpted-cloud-ink-v1';
    const materialCache = new Map<MeshBasicMaterial, MeshBasicMaterial>();
    const templates = [1, 2, 3].map(index => {
      const source = gltf.scene.getObjectByName(`sky_cloud_bank_${index}`);
      if (!source) throw new Error(`Missing sky cloud bank ${index}`);
      const cloud = source.clone(true);
      const meshes: Mesh[] = [];
      cloud.traverse(object => { if ((object as Mesh).isMesh) meshes.push(object as Mesh); });
      for (const mesh of meshes) {
        const copyMaterial = (source: MeshBasicMaterial) => {
          if (materialCache.has(source)) return materialCache.get(source)!;
          const material = new MeshBasicMaterial({ color: source.color, map: source.map,
            vertexColors: source.vertexColors, fog: false, toneMapped: false });
          if (night) material.color.multiply(new Color('#9bafbc'));
          materialCache.set(source, material);
          return material;
        };
        mesh.material = Array.isArray(mesh.material)
          ? mesh.material.map(material => copyMaterial(material as MeshBasicMaterial))
          : copyMaterial(mesh.material as MeshBasicMaterial);
        mesh.raycast = () => {};
        if (mesh.name.endsWith('__painted_surface')) {
          const hull = new Mesh(mesh.geometry, outline);
          hull.name = 'cloud-ink-silhouette';
          hull.renderOrder = 1;
          hull.raycast = () => {};
          mesh.add(hull);
        }
      }
      const bounds = new Box3().setFromObject(cloud);
      const width = bounds.getSize(new Vector3()).x;
      const center = bounds.getCenter(new Vector3());
      const normalized = new Group();
      cloud.position.sub(center);
      normalized.scale.setScalar(10 / width);
      normalized.add(cloud);
      return normalized;
    });
    return { templates, materials: [outline, ...materialCache.values()] };
  }, [gltf.scene, night]);
  const instances = useMemo(() => banks.map(bank => {
    const cloud = templates[bank.variant].clone(true);
    cloud.traverse(object => { object.raycast = () => {}; });
    return cloud;
  }), [templates]);
  useEffect(() => () => materials.forEach(material => material.dispose()), [materials]);

  useFrame(({ camera }) => {
    if (!layer.current) return;
    // The downward overview has no horizon; keep its architectural view unobstructed.
    layer.current.visible = camera.type !== 'OrthographicCamera';
    layer.current.position.copy(camera.position);
    actors.current.forEach((actor, index) => {
      if (!actor) return;
      const bank = banks[index];
      const angle = bank.angle + time.current * bank.speed;
      actor.position.set(Math.sin(angle) * bank.radius,
        bank.height + Math.sin(time.current * .035 + index) * .22,
        -Math.cos(angle) * bank.radius);
      // Cloud bases stay horizontal. Ground views must reveal the underside;
      // never pitch their painted side toward the camera like a billboard.
      actor.rotation.set(0, -bank.angle, 0);
    });
  });

  return <group ref={layer} name="sculpted-sky-clouds" dispose={null}>
    {instances.map((cloud, index) => <group key={index} ref={node => { actors.current[index] = node; }}
      scale={[banks[index].width / 10, banks[index].width / 10 * (banks[index].heightScale ?? 1),
        banks[index].width / 10 * (banks[index].depthScale ?? 1)]}>
      <primitive object={cloud} dispose={null} />
    </group>)}
  </group>;
}
