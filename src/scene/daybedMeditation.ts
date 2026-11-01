import { studyDaybed } from './studyDaybedLayout';
import type { SceneId, Vec3 } from './types';

export const MEDITATION_CAMERA_SECONDS = 2.8;

/** Approach the front or either side, without offering a seat through a wall/screen. */
export function isNearDaybed(position: Vec3, sceneId: SceneId) {
  if (sceneId !== 'courtyard' || Math.abs(position[0]) > 2.65) return false;
  const dx = Math.max(0, Math.abs(position[0] - studyDaybed.position[0]) - studyDaybed.width / 2);
  const dz = Math.max(0, Math.abs(position[2] - studyDaybed.position[2]) - studyDaybed.depth / 2);
  return position[2] > studyDaybed.position[2] - studyDaybed.depth / 2 - .30
    && Math.hypot(dx, dz) <= .95;
}

/** Seated framing just behind the backrest, looking south down the courtyard axis. */
export function daybedMeditationPose(aspect: number) {
  return {
    position: [0, 1.62, studyDaybed.position[2] - .90] as Vec3,
    // Keep the courtyard axis centered in landscape and portrait.
    target: [0, 1.58, 12] as Vec3,
    fov: aspect < 1 ? 76 : 64,
  };
}

export const meditationCameraEase = (progress: number) => {
  const t = Math.min(1, Math.max(0, progress));
  return t * t * (3 - 2 * t);
};
