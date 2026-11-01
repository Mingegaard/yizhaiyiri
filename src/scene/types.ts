import type { RefObject } from 'react';
import type { ActivityId } from '../game/types';

export type SceneId = 'courtyard' | 'kitchen' | 'west-wing';
export type ElfState = 'idle' | 'cooking' | 'away' | 'sleeping' | 'meditating';
export type Vec3 = [number, number, number];
export interface MovementInput { forward: number; right: number; turn: number }
export interface Portal { id: string; label: string; target: SceneId; spawn?: Vec3 }
export interface ScenePortal extends Portal { position: Vec3; radius: number }
export interface Collider { minX: number; maxX: number; minZ: number; maxZ: number }
export type StoryZone = 'study' | 'courtyard' | 'bedroom' | 'hall' | 'garden' | 'gate' | 'river';
export interface StoryView { zone: StoryZone; prop: string; state: string }
export interface FocusView { elapsedMs: number; petalCycleMs: number; paused: boolean; retreat?: 'daybed'; entering?: boolean; activityId?: ActivityId }
export interface SceneDefinition {
  id: SceneId;
  label: string;
  spawn: Vec3;
  elfAnchor: Vec3;
  bounds: Collider;
  colliders: Collider[];
  portals: ScenePortal[];
}
export interface SceneCanvasProps {
  sceneId: SceneId;
  elfState: ElfState;
  night: boolean;
  blocked: boolean;
  sunset?: boolean;
  kitchenSmoking?: boolean;
  healthActivityId?: ActivityId;
  celebrating?: boolean;
  travel?: { id: number; sceneId: SceneId; position: Vec3; yaw: number };
  onCompanionNear?: (near: boolean) => void;
  overview?: boolean;
  overviewResetKey?: number;
  inputRef: RefObject<MovementInput>;
  onPortalNear: (portal: Portal | null) => void;
  onPosition?: (position: Vec3) => void;
  onDeskNear?: (near: boolean) => void;
  onDaybedNear?: (near: boolean) => void;
  onFocusReady?: () => void;
  focusView?: FocusView;
  storyView?: StoryView;
  storyNodeId?: string;
  storyTravel?: { id: number; nodeId: string };
  storyActionLabel?: string;
  onStoryInteract?: () => void;
  retainedStoryProps?: { nodeId: string; view: StoryView }[];
  rods: number;
  onVesselTouch: () => void;
  vesselTransition?: boolean;
  onVesselTransitionComplete?: () => void;
}
