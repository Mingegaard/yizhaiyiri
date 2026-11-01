import type { ElfState, SceneId, Vec3 } from '../scene/types';
import { DESK_SOUTH_SHIFT, STUDY_CANOPY_RAISE, STUDY_FURNISHED, STUDY_NORTH_SHIFT } from '../scene/studyLayout';
import { APRICOT_TREE_SCALE, ROCKERY_WEST_SHIFT } from '../scene/gardenLayout';
import { studyDaybed } from '../scene/studyDaybedLayout';
import { studyWritingTable } from '../scene/studyWritingTableLayout';

export interface ModelAsset {
  url: string | null;
  scale: number | Vec3;
  position: Vec3;
  rotation: Vec3;
  node?: string;
  includePrefixes?: string[];
  excludePrefixes?: string[];
  ink?: boolean;
  localOrigin?: boolean;
  openSouthStudyFront?: boolean;
  /** Courtyard-only study translation, measured in original GLB units. */
  studyNorthShift?: number;
  /** Courtyard-only writing desk and seating translation, in original GLB units. */
  studyDeskSouthShift?: number;
  /** Courtyard-only canopy lift, in original GLB units; floor/furniture stay fixed. */
  studyCanopyRaise?: number;
  /** Local node adjustments in source GLB units, applied around each node's own origin. */
  nodeTransforms?: Record<string, { scale?: number; offset?: Vec3 }>;
}

export const COURTYARD_SCALE = .8;
export const courtyardAsset: ModelAsset = {
  url: '/models/tang-courtyard.glb', scale: COURTYARD_SCALE, position: [0, -.176, -2], rotation: [0, 0, 0],
  openSouthStudyFront: true,
  excludePrefixes: STUDY_FURNISHED ? undefined : ['study_furniture'],
  studyNorthShift: STUDY_NORTH_SHIFT / COURTYARD_SCALE,
  studyDeskSouthShift: DESK_SOUTH_SHIFT / COURTYARD_SCALE,
  studyCanopyRaise: STUDY_CANOPY_RAISE / COURTYARD_SCALE,
  nodeTransforms: {
    lux_flower_wide_apricot_tree: { scale: APRICOT_TREE_SCALE },
    lux_rockery_courtyard: { offset: [-ROCKERY_WEST_SHIFT / COURTYARD_SCALE, 0, 0] },
    rockery_gravel_inset: { offset: [-ROCKERY_WEST_SHIFT / COURTYARD_SCALE, 0, 0] },
  },
};
export const interiorAsset: ModelAsset = {
  url: '/models/tang-courtyard.glb', scale: 1.05, position: [0, -.588, -2], rotation: [0, 0, 0],
  includePrefixes: ['study_'], excludePrefixes: ['study_furniture', 'study_garden'],
};
export const sceneAssets: Record<SceneId, ModelAsset> = {
  courtyard: courtyardAsset, kitchen: interiorAsset, 'west-wing': interiorAsset,
};
export const studyDaybedAsset: ModelAsset = {
  url: '/models/tang-study-daybed.glb', position: studyDaybed.position, scale: 1, rotation: [0, 0, 0],
};
export const studyWritingTableAsset: ModelAsset = {
  url: '/models/tang-study-writing-table.glb', position: studyWritingTable.position,
  rotation: studyWritingTable.rotation, scale: 1,
};
export function gameProp(node: string, position: Vec3 = [0, 0, 0]): ModelAsset {
  return { url: '/models/tang-game-props.glb', node, position, scale: 1, rotation: [0, 0, 0] };
}
export const roomFurniture = {
  kitchen: gameProp('kitchen_furniture', [0, 0, -2]),
  'west-wing': gameProp('bedroom_furniture', [0, 0, -1]),
};
export const elfAsset = { ...gameProp('companion_idle'), animations: {} as Partial<Record<ElfState, string>> };
export const cookingElfAsset = gameProp('companion_cooking');

/** Optional separate vegetation assets. The trunk stays fixed; only the canopy pivots in the breeze.
 * Export the canopy around its own local [0,0,0] pivot. canopyPivot places that origin above the tree root.
 * The courtyard GLB should omit these trees when using this independent vegetation layer.
 */
export const gardenVegetation: { trunk: ModelAsset; canopy: ModelAsset; canopyPivot: Vec3; petalHeight: number } = {
  trunk: { url: null, scale: 1, position: [0, 0, 0], rotation: [0, 0, 0] },
  canopy: { url: null, scale: 1, position: [0, 0, 0], rotation: [0, 0, 0] },
  canopyPivot: [0, 2.05, 0],
  petalHeight: 3.35,
};

/** Complete 0.34m vessel with offset lid, origin at its base; sticks remain data-driven.
 * The cloud replacement is one cloud cluster approximately one unit wide.
 */
export const tallyVesselAssets: { vessel: ModelAsset; cloud: ModelAsset } = {
  vessel: gameProp('tally_vessel'),
  cloud: gameProp('cloud_cluster'),
};
