import type { Collider, MovementInput, SceneDefinition, SceneId, Vec3 } from './types';
import { DESK_SOUTH_SHIFT, STUDY_DEPTH, STUDY_FURNISHED, studyDeskZ, studyZ } from './studyLayout';
import { APRICOT_TREE_SCALE, ROCKERY_WEST_SHIFT } from './gardenLayout';
import { studyScreenColliders } from './studyScreenLayout';
import { studyDaybedCollider } from './studyDaybedLayout';
import { studyWritingTableCollider } from './studyWritingTableLayout';

export const EYE_HEIGHT = 1.5;
export const WALK_SPEED = 3.3;
/** Surveyed from the supplied courtyard GLB, normalized at 0.8 metres per source unit. */
export const study = {
  center: [0, 0, studyZ(-2)] as Vec3,
  width: 5.84,
  depth: STUDY_DEPTH,
  deskPosition: [0, 0, studyDeskZ(-1.88)] as Vec3,
  deskSize: [2.56, .12, 1.04] as Vec3,
  deskHeight: 1.008,
  deskRadius: 1.85,
  focusCamera: [2.40, 1.65, studyDeskZ(-1.6)] as Vec3,
  focusTarget: [10, 2.8, -7] as Vec3,
};
export const gardenTrees: Vec3[] = [[-6.96, 0, 5.84], [-10, 0, -9.76], [10, 0, -9.76]];
export const tallyVessel = {
  height: .34,
  position: [study.deskPosition[0] - .64, study.deskPosition[1] + study.deskHeight + study.deskSize[1] / 2, study.deskPosition[2] - .41] as Vec3,
  openingHeight: .30,
  hitSize: [.35, .55, .35] as Vec3,
  dragThresholdPx: 6,
  transitionMs: 3000,
};

const studyWallThickness = .2;
const halfWidth = study.width / 2;
const backZ = study.center[2] - study.depth / 2;
const frontZ = study.center[2] + study.depth / 2;

const studyColliders: Collider[] = [
  // The south leaves are open; retain the north/side screens and columns.
  { minX: -3.04, maxX: -2.82, minZ: -4.5, maxZ: .5 },
  { minX: 2.82, maxX: 3.04, minZ: -4.5, maxZ: .5 },
  { minX: -2.9, maxX: -1.05, minZ: -4.37, maxZ: -4.19 },
  { minX: 1.05, maxX: 2.9, minZ: -4.37, maxZ: -4.19 },
  ...[-.976, .976].map(x => ({ minX: x - .11, maxX: x + .11, minZ: .17, maxZ: .39 })),
  ...(STUDY_FURNISHED ? [
    { minX: -1.3, maxX: 1.3, minZ: -2.43 + DESK_SOUTH_SHIFT, maxZ: -1.33 + DESK_SOUTH_SHIFT },
    { minX: -.31, maxX: .31, minZ: -.99 + DESK_SOUTH_SHIFT, maxZ: -.43 + DESK_SOUTH_SHIFT },
    { minX: 1.48, maxX: 2.15, minZ: -2.47 + DESK_SOUTH_SHIFT, maxZ: -1.93 + DESK_SOUTH_SHIFT },
    { minX: -2.7, maxX: -1.55, minZ: -3.85, maxZ: -3.15 },
    { minX: 1.55, maxX: 2.7, minZ: -3.85, maxZ: -3.15 },
  ] : []),
].map(collider => ({ ...collider, minZ: studyZ(collider.minZ), maxZ: studyZ(collider.maxZ) }));

export const scenes: Record<SceneId, SceneDefinition> = {
  courtyard: {
    id: 'courtyard', label: '庭院', spawn: [0, 0, 7], elfAnchor: [-2.2, 0, 1],
    bounds: { minX: -20.9, maxX: 20.9, minZ: -14.05, maxZ: 25.1 },
    colliders: [
      ...studyColliders,
      ...studyScreenColliders,
      studyDaybedCollider,
      studyWritingTableCollider,
      ...gardenTrees.map(([x, , z], index) => {
        const radius = .36 * (index === 0 ? APRICOT_TREE_SCALE : 1);
        return { minX: x - radius, maxX: x + radius, minZ: z - radius, maxZ: z + radius };
      }),
      // Flanking wings and the inner partition leave the actual entrance passages open.
      { minX: -19.4, maxX: -15.1, minZ: -12.3, maxZ: 8.2 },
      { minX: 15.1, maxX: 19.4, minZ: -12.3, maxZ: 8.2 },
      { minX: -20.9, maxX: -4.2, minZ: 10.1, maxZ: 11.0 },
      { minX: 4.2, maxX: 20.9, minZ: 10.1, maxZ: 11.0 },
      // Furniture, rockery, well and entrance screen have their own navigation volumes.
      { minX: 7.3 - ROCKERY_WEST_SHIFT, maxX: 13.3 - ROCKERY_WEST_SHIFT, minZ: 3.9, maxZ: 9.2 },
      { minX: -10.9, maxX: -5.9, minZ: 1.8, maxZ: 4.5 },
      { minX: 9.4, maxX: 11.4, minZ: -5.8, maxZ: -4.2 },
      { minX: 16.05, maxX: 19.1, minZ: 13.6, maxZ: 16.5 },
      { minX: 14.7, maxX: 19.5, minZ: 20.4, maxZ: 21.3 },
      { minX: -20.9, maxX: 13.2, minZ: 23.0, maxZ: 25.1 },
    ],
    portals: [
      { id: 'kitchen-door', label: '要进入厨房吗？', target: 'kitchen', position: [14.1, 0, -2.32], radius: 1.4 },
      { id: 'west-door', label: '要进入西厢房吗？', target: 'west-wing', position: [-14.1, 0, -2.32], radius: 1.4 },
    ],
  },
  kitchen: {
    id: 'kitchen', label: '厨房', spawn: [0, 0, .4], elfAnchor: [1.2, 0, -2.7],
    bounds: { minX: -3.5, maxX: 3.5, minZ: -4.7, maxZ: 2.2 },
    colliders: [
      { minX: .9, maxX: 2.6, minZ: -5, maxZ: -3.7 },
      { minX: -2.95, maxX: -.55, minZ: -5, maxZ: -4.2 },
      { minX: -3.5, maxX: -1.25, minZ: .9, maxZ: 1.25 },
      { minX: 1.25, maxX: 3.5, minZ: .9, maxZ: 1.25 },
    ],
    portals: [{ id: 'courtyard-from-kitchen', label: '要返回庭院吗？', target: 'courtyard', position: [0, 0, 1.6], radius: .85 }],
  },
  'west-wing': {
    id: 'west-wing', label: '西厢房', spawn: [0, 0, .4], elfAnchor: [.8, .71, -2.8],
    bounds: { minX: -3.5, maxX: 3.5, minZ: -4.7, maxZ: 2.2 },
    colliders: [
      { minX: .5, maxX: 2.4, minZ: -4.25, maxZ: -1.5 },
      { minX: -3.5, maxX: -1.25, minZ: .9, maxZ: 1.25 },
      { minX: 1.25, maxX: 3.5, minZ: .9, maxZ: 1.25 },
    ],
    portals: [{ id: 'courtyard-from-west', label: '要返回庭院吗？', target: 'courtyard', position: [0, 0, 1.6], radius: .85 }],
  },
};

export function getSceneLabel(id: SceneId) { return scenes[id].label; }

/** Axis-aligned navigation volumes are authored independently from decorative meshes. */
export function canStandAt(x: number, z: number, bounds: Collider, obstacles: Collider[], radius = .24) {
  if (x - radius < bounds.minX || x + radius > bounds.maxX || z - radius < bounds.minZ || z + radius > bounds.maxZ) return false;
  return !obstacles.some(o => x + radius > o.minX && x - radius < o.maxX && z + radius > o.minZ && z - radius < o.maxZ);
}

export function isNearStudyDesk(position: Vec3, sceneId: SceneId) {
  return STUDY_FURNISHED && sceneId === 'courtyard'
    && position[0] > -halfWidth && position[0] < halfWidth
    && position[2] > backZ + studyWallThickness / 2 && position[2] < frontZ
    && Math.hypot(position[0] - study.deskPosition[0], position[2] - study.deskPosition[2]) <= study.deskRadius;
}

const portraitFocusTarget: Vec3 = [10, 3, -8];

export function firstPersonPose(position: Vec3, yaw: number, pitch: number, focused: boolean, aspect = 1): { position: Vec3; target: Vec3 } {
  if (focused) return { position: [...study.focusCamera], target: [...(aspect < 1 ? portraitFocusTarget : study.focusTarget)] };
  return {
    position: [position[0], EYE_HEIGHT + position[1], position[2]],
    target: [position[0] + Math.sin(yaw) * Math.cos(pitch), EYE_HEIGHT + position[1] + Math.sin(pitch), position[2] - Math.cos(yaw) * Math.cos(pitch)],
  };
}

export function walkingInput(keys: ReadonlySet<string>, external: MovementInput = { forward: 0, right: 0, turn: 0 }): MovementInput {
  return {
    forward: external.forward + Number(keys.has('KeyW') || keys.has('ArrowUp')) - Number(keys.has('KeyS') || keys.has('ArrowDown')),
    right: external.right + Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft')),
    turn: external.turn,
  };
}

interface LookOrientation { yaw: number; pitch: number }
interface LookWheelEvent { deltaX: number; deltaY: number; deltaMode: number; ctrlKey?: boolean }
const clampPitch = (pitch: number) => Math.max(-1.1, Math.min(1.1, pitch));

export function dragLook(view: LookOrientation, deltaX: number, deltaY: number, locked = false): LookOrientation {
  if (locked) return view;
  return { yaw: view.yaw + deltaX * .004, pitch: clampPitch(view.pitch - deltaY * .003) };
}

/** Touchpad wheel changes gaze only. Line/page events are normalized before limiting a single jump. */
export function wheelLook(view: LookOrientation, event: LookWheelEvent, locked = false): LookOrientation {
  if (locked || event.ctrlKey) return view;
  const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 240 : 1;
  const pixels = (delta: number) => Math.max(-80, Math.min(80, delta * unit));
  return { yaw: view.yaw + pixels(event.deltaX) * .002, pitch: clampPitch(view.pitch - pixels(event.deltaY) * .002) };
}

/** Ground motion stays horizontal even while the first-person camera looks up or down. */
export function moveOnGround(position: Vec3, yaw: number, forward: number, right: number, deltaSeconds: number, scene: SceneDefinition, speed = WALK_SPEED): Vec3 {
  const magnitude = Math.hypot(forward, right);
  if (!magnitude) return position;
  const length = Math.max(1, magnitude);
  const step = Math.min(deltaSeconds, .05) * speed;
  const dx = (Math.sin(yaw) * forward + Math.cos(yaw) * right) / length * step;
  const dz = (-Math.cos(yaw) * forward + Math.sin(yaw) * right) / length * step;
  let x = position[0], z = position[2];
  if (canStandAt(x + dx, z, scene.bounds, scene.colliders)) x += dx;
  if (canStandAt(x, z + dz, scene.bounds, scene.colliders)) z += dz;
  return [x, scene.id === 'courtyard' && Math.abs(x) < 3.18 && z > studyZ(-4.64) && z < studyZ(.64) ? .272 : 0, z];
}
