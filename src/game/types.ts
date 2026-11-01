export type ActivityId = 'breakfast' | 'lunch' | 'dinner' | 'outdoors' | 'sleep';
export type MemoryKind = 'focus' | 'meditation' | 'meal' | 'outdoors' | 'sleep' | 'adventure';

export interface MemoryEntry {
  id: string;
  date: string;
  timestamp: number;
  kind: MemoryKind;
  title: string;
  rods: number;
  activityId?: ActivityId;
  photoId?: string;
  cardId?: string;
  durationMinutes?: number;
  chapterTitle?: string;
}
export interface TimerSession {
  id: string;
  mode: 'focus' | 'meditation';
  retreat?: 'daybed';
  activityId?: ActivityId;
  activityDate: string;
  activityWindowEndsAt?: number;
  startedAt: number;
  endsAt: number;
  durationMs: number;
  status: 'running' | 'paused';
  remainingMs: number;
}
export interface SleepSession {
  id: string;
  startedAt: number;
  eligibleAt: number;
  activityDate: string;
}
export interface StoryProgress {
  entryConfirmed: boolean;
  nodeId: string;
  viewedFlags: string[];
  collectedFlags?: string[];
  storyCompleted: boolean;
  rewardGranted: boolean;
  chapterVisits?: { date: string; act: number; timestamp: number }[];
}
export interface GameState {
  version: 1;
  startingRodsGranted?: boolean;
  rods: number;
  memories: MemoryEntry[];
  session: TimerSession | null;
  sleep: SleepSession | null;
  story: StoryProgress | null;
  completedActivities: string[];
  healthyTaskCount?: number;
  /** Demo-only replay identity, kept in the separate demo save. */
  demoOutdoorsRound?: number;
  healthyCelebration?: { memoryId: string; activityId: ActivityId; cardId?: string } | null;
}

export type GameCommand =
  | { type: 'startTimer'; mode: TimerSession['mode']; durationMs: number; activityId?: ActivityId; retreat?: 'daybed' }
  | { type: 'dismissHealthyCelebration'; memoryId: string }
  | { type: 'pauseTimer' }
  | { type: 'resumeTimer' }
  | { type: 'cancelTimer' }
  | { type: 'reconcile'; includeSleep?: boolean }
  | { type: 'completePhoto'; activityId: ActivityId; photoId: string }
  | { type: 'beginSleep'; durationMs?: number }
  | { type: 'cancelSleep' }
  | { type: 'startStory' }
  | { type: 'advanceStory'; nodeId: string }
  | { type: 'inspectStory'; nodeId: string; flagId: string }
  | { type: 'demoRods' }
  | { type: 'demoOutdoors' };
