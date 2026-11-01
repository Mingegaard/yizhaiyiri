import type { ModelAsset as ModelAssetConfig } from '../content/assets';
import type { StoryZone, Vec3 } from './types';

export interface StoryShot { camera: Vec3; target: Vec3; propPosition: Vec3; room: boolean }

/** These are Li Zhe's fixed eye-level shots, never a second playable character. */
export const storyShots: Record<StoryZone, StoryShot> = {
  study: { camera: [0, 1.7, 4.4], target: [0, 1.15, -1.7], propPosition: [0, 0, -1.7], room: true },
  bedroom: { camera: [.8, 1.7, 4.2], target: [0, 1.15, -1.4], propPosition: [0, 0, -1.4], room: true },
  hall: { camera: [0, 1.7, 4.4], target: [0, 1.1, -1.6], propPosition: [0, 0, -1.6], room: true },
  courtyard: { camera: [-3.6, 1.7, 8.1], target: [-4.5, 1.25, 4.5], propPosition: [-4.5, 0, 4.5], room: false },
  garden: { camera: [-8.5, 1.7, 2.2], target: [-10, 1.5, -1.2], propPosition: [-10, 0, -1.2], room: false },
  gate: { camera: [.6, 1.7, 6.5], target: [0, .9, 10], propPosition: [0, 0, 10], room: false },
  // A fixed illustration of the family's report; no traversal to a river occurs.
  river: { camera: [0, 1.7, 4.5], target: [0, .65, -1.4], propPosition: [0, 0, -1.4], room: false },
};

/** Optional GLB replacements. E.g. props['tile.whole'] or environments.study. */
export const storyAssets: {
  environments: Partial<Record<StoryZone, ModelAssetConfig>>;
  props: Record<string, ModelAssetConfig>;
} = { environments: {}, props: {} };

export const storyPropStates: Record<string, readonly string[]> = {
  books: ['missing', 'returned'], letter: ['visible', 'collected', 'talisman'], bamboo: ['idle', 'letter', 'visible'],
  shoes: ['missing', 'returned'], tile: ['covered', 'whole', 'fragments'],
  clothes: ['hanging', 'returned'], vessels: ['nested', 'released'], luggage: ['packed', 'letter'],
  dogs: ['bowls', 'bowls_empty'], chest: ['closed', 'open', 'verified'], pot: ['hidden', 'found'], none: ['idle', 'fire'],
};
