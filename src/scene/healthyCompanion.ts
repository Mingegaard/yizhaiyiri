import type { ActivityId } from '../game/types';
import type { SceneId, Vec3 } from './types';
import { daybedMeditationPose } from './daybedMeditation';

export const companionPlaces: Record<ActivityId, { sceneId: SceneId; anchor: Vec3; approach: Vec3 }> = {
  breakfast: { sceneId: 'courtyard', anchor: [-1.95, .272, -3.2], approach: [-1.95, .272, -.3] },
  lunch: { sceneId: 'kitchen', anchor: [1.2, 0, -2.7], approach: [0, 0, .4] },
  dinner: { sceneId: 'kitchen', anchor: [1.2, 0, -2.7], approach: [0, 0, .4] },
  sleep: { sceneId: 'west-wing', anchor: [1.45, .78, -1.85], approach: [0, 0, .4] },
  outdoors: { sceneId: 'courtyard', anchor: [0, 0, 6], approach: [0, 0, 7] },
};
export function isNearHealthyCompanion(position: Vec3, sceneId: SceneId, activityId?: ActivityId) {
  if (!activityId || activityId === 'outdoors') return false;
  const place = companionPlaces[activityId];
  return sceneId === place.sceneId && Math.hypot(position[0] - place.anchor[0], position[2] - place.anchor[2]) <= 1.75;
}
export function healthyTravel(activityId: ActivityId, id: number) {
  const place = companionPlaces[activityId];
  return { id, sceneId: place.sceneId, position: [...place.approach] as Vec3,
    yaw: Math.atan2(place.anchor[0] - place.approach[0], place.approach[2] - place.anchor[2]) };
}
export function healthyFocusPose(id: ActivityId, aspect: number, celebrating = false): { position: Vec3; target: Vec3; fov: number } {
  if (id === 'outdoors' && !celebrating) return daybedMeditationPose(aspect);
  if (id === 'outdoors') return { position: [0, 1.5, 8.5], target: [0, .85, 6], fov: 60 };
  if (id === 'breakfast') return { position: [-1.95, 1.5, -.6], target: [-1.95, 1.1, -3.2], fov: 60 };
  if (id === 'sleep' && celebrating) return { position: [-1.1, 1.6, .5], target: [0, 1.05, -2], fov: 64 };
  if (id === 'sleep') return { position: [-.6, 1.9, -2.4], target: [1.45, .9, -2.8], fov: 64 };
  return { position: [-.7, 1.55, -.1], target: [1.1, 1.0, -3.0], fov: 64 };
}
