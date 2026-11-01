import type { ActivityId, GameCommand, GameState, MemoryEntry, StoryProgress, TimerSession } from './types';
import { healthyActivityAt, healthyWindowEnd } from './healthSchedule';
import { healthyCardPools } from '../content/cards';
import { STORY_NODES } from '../story/content';

export const FOCUS_DURATION_MS = 30 * 60 * 1000;
export const MEDITATION_DURATION_MS = 10 * 60 * 1000;
export const SLEEP_DURATION_MS = 6 * 60 * 60 * 1000;
export const ADVENTURE_COST = 10;
export const STARTING_RODS = 9;

export function localDay(timestamp: number | Date): string {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function createInitialState(): GameState {
  return { version: 1, rods: STARTING_RODS, startingRodsGranted: true, memories: [], session: null, sleep: null, story: null, completedActivities: [], healthyTaskCount: 0, healthyCelebration: null };
}

export function activityKey(date: string, id: ActivityId): string { return `${date}:${id}`; }
export function remainingTime(session: TimerSession, now: number): number {
  // The render clock may still be the snapshot from just before start/resume.
  return session.status === 'paused' ? session.remainingMs : Math.max(0, Math.min(session.remainingMs, session.endsAt - now));
}

const activityTitles: Record<ActivityId, string> = {
  breakfast: '与银钩晨读', lunch: '与银钩朝食', dinner: '与银钩夕食', outdoors: '与银钩共度户外时光', sleep: '与银钩一同入眠',
};
function requireHealthyWindow(id: ActivityId, activityNow: number) {
  if (healthyActivityAt(activityNow) !== id) throw new Error('这段时辰已经过去，等下一次与银钩相约吧。');
}
function completeHealthyTask(state: GameState, memory: MemoryEntry, key: string): GameState {
  if (state.completedActivities.includes(key)) return state;
  const healthyTaskCount = (state.healthyTaskCount ?? new Set(state.completedActivities).size) + 1;
  const id = memory.activityId!;
  const pool = healthyCardPools[id];
  const previousCards = state.memories.filter(item => item.activityId === id && item.cardId && pool.includes(item.cardId)).length;
  const cardId = healthyTaskCount % 5 === 0 ? pool[previousCards % pool.length] : undefined;
  return { ...addMemory(state, { ...memory, ...(cardId ? { cardId } : {}) }, key), healthyTaskCount,
    healthyCelebration: { memoryId: memory.id, activityId: id, ...(cardId ? { cardId } : {}) } };
}

function addMemory(state: GameState, memory: MemoryEntry, completedKey?: string): GameState {
  if (state.memories.some(item => item.id === memory.id)) return state;
  return {
    ...state, rods: state.rods + memory.rods, memories: [...state.memories, memory],
    completedActivities: completedKey ? [...state.completedActivities, completedKey] : state.completedActivities,
  };
}

function rememberChapterVisit(story: StoryProgress, now: number): StoryProgress {
  const act = STORY_NODES[story.nodeId]?.act;
  const date = localDay(now);
  const visits = story.chapterVisits ?? [];
  if (act === undefined || visits.some(visit => visit.date === date && visit.act === act)) return story;
  return { ...story, chapterVisits: [...visits, { date, act, timestamp: now }] };
}

function finishTimer(state: GameState, now: number, activityNow: number): GameState {
  const session = state.session;
  if (!session || session.status !== 'running' || now < session.endsAt) return state;
  const finished = { ...state, session: null };
  const memory: MemoryEntry = {
    id: session.id, date: localDay(session.endsAt), timestamp: session.endsAt, kind: session.mode,
    title: session.activityId ? activityTitles[session.activityId] : session.retreat === 'daybed' ? '完成一段打坐' : session.mode === 'focus' ? '完成一段专注' : '完成一段冥想',
    rods: 1, durationMinutes: session.durationMs / 60000,
    ...(session.activityId ? { activityId: session.activityId } : {}),
  };
  if (!session.activityId) return addMemory(finished, memory);
  // Both the completed interval and its settlement must belong to the same window.
  // Pauses, reloads, midnight and changes to the demo period cannot bypass it.
  const deadline = session.activityWindowEndsAt ?? healthyWindowEnd(session.startedAt, session.activityId);
  if (session.endsAt >= deadline || healthyActivityAt(activityNow) !== session.activityId || localDay(activityNow) !== session.activityDate) return finished;
  return completeHealthyTask(finished, memory, activityKey(session.activityDate, session.activityId));
}

/** Pure state transitions. Time is supplied by the caller, so reloads and background tabs do not shorten sessions. */
export function reduceGame(input: GameState, command: GameCommand, now: number, activityNow = now): GameState {
  const state = finishTimer(input, now, activityNow);
  switch (command.type) {
    case 'startTimer': {
      if (state.session || state.sleep) throw new Error('请先结束当前的打坐或休息。');
      if (!Number.isFinite(command.durationMs) || command.durationMs <= 0) throw new Error('请选择有效的计时时长。');
      if (command.activityId) {
        requireHealthyWindow(command.activityId, activityNow);
        if (state.completedActivities.includes(activityKey(localDay(activityNow), command.activityId))) return state;
      }
      return { ...state, session: { id: `timer:${now}`, mode: command.mode, activityId: command.activityId,
        ...(command.retreat ? { retreat: command.retreat } : {}),
        activityDate: localDay(activityNow),
        ...(command.activityId ? { activityWindowEndsAt: healthyWindowEnd(activityNow, command.activityId) - (activityNow - now) } : {}),
        startedAt: now, endsAt: now + command.durationMs,
        durationMs: command.durationMs, remainingMs: command.durationMs, status: 'running' } };
    }
    case 'pauseTimer': {
      if (!state.session || state.session.status === 'paused') return state;
      return { ...state, session: { ...state.session, status: 'paused', remainingMs: remainingTime(state.session, now) } };
    }
    case 'resumeTimer': {
      if (!state.session || state.session.status === 'running') return state;
      return { ...state, session: { ...state.session, status: 'running', endsAt: now + state.session.remainingMs } };
    }
    case 'cancelTimer': return state.session ? { ...state, session: null } : state;
    case 'completePhoto': {
      requireHealthyWindow(command.activityId, activityNow);
      const key = activityKey(localDay(activityNow), command.activityId);
      if (state.completedActivities.includes(key)) return state;
      if (state.session || state.sleep) throw new Error('请先结束当前的专注。');
      if (!command.photoId) throw new Error('请先选择一张照片。');
      const replay = command.activityId === 'outdoors' && state.demoOutdoorsRound ? `:demo:${state.demoOutdoorsRound}` : '';
      return completeHealthyTask(state, { id: `photo:${key}${replay}`, date: localDay(now), timestamp: now,
        kind: command.activityId === 'outdoors' ? 'outdoors' : command.activityId === 'sleep' ? 'sleep' : 'meal',
        title: activityTitles[command.activityId], rods: 1, activityId: command.activityId, photoId: command.photoId }, key);
    }
    // Compatibility for old callers: sleep now uses the same in-window focus flow.
    case 'beginSleep': return reduceGame(state, { type: 'startTimer', mode: 'focus', activityId: 'sleep', durationMs: command.durationMs ?? FOCUS_DURATION_MS }, now, activityNow);
    case 'cancelSleep': return state.sleep ? { ...state, sleep: null } : state;
    case 'reconcile': return state;
    case 'dismissHealthyCelebration': return state.healthyCelebration?.memoryId === command.memoryId ? { ...state, healthyCelebration: null } : state;
    case 'startStory': {
      if (state.session || state.sleep) throw new Error('请先结束当前的打坐或休息。');
      if (state.rods < ADVENTURE_COST) throw new Error('再积攒一些算筹，满 10 个就能出发。');
      const previous = state.story;
      return { ...state, rods: state.rods - ADVENTURE_COST,
        story: rememberChapterVisit(previous ? {
          ...previous,
          entryConfirmed: true,
          nodeId: previous.storyCompleted ? 'opening' : previous.nodeId,
          viewedFlags: previous.storyCompleted ? [] : previous.viewedFlags,
          collectedFlags: [...new Set([...(previous.collectedFlags ?? []), ...previous.viewedFlags])],
          storyCompleted: false,
        } : { entryConfirmed: true, nodeId: 'opening', viewedFlags: [], collectedFlags: [], storyCompleted: false, rewardGranted: false }, now) };
    }
    case 'inspectStory': {
      const story = state.story;
      if (!story?.entryConfirmed || story.nodeId !== command.nodeId) return state;
      const node = STORY_NODES[story.nodeId];
      if (!node?.inspectItems?.some(item => item.id === command.flagId) || story.viewedFlags.includes(command.flagId)) return state;
      return { ...state, story: { ...story, viewedFlags: [...story.viewedFlags, command.flagId],
        collectedFlags: [...new Set([...(story.collectedFlags ?? []), ...story.viewedFlags, command.flagId])] } };
    }
    case 'advanceStory': {
      const story = state.story;
      if (!story?.entryConfirmed || story.nodeId !== command.nodeId) return state;
      const node = STORY_NODES[story.nodeId];
      if (!node) return state;
      if (node.requiredFlags?.some(flag => !story.viewedFlags.includes(flag.id))) {
        throw new Error('请先查看卡片中标出的必要细节。');
      }
      const viewedFlags = [...new Set([...story.viewedFlags, `read:${node.id}`, ...(node.evidenceFlags ?? [])])];
      const collectedFlags = [...new Set([...(story.collectedFlags ?? []), ...viewedFlags])];
      if (node.nextId) {
        return { ...state, story: rememberChapterVisit({ ...story, nodeId: node.nextId, viewedFlags, collectedFlags }, now) };
      }
      const finished = { ...state, story: { ...story, viewedFlags, collectedFlags, storyCompleted: true, rewardGranted: true } };
      if (story.rewardGranted) return finished;
      return addMemory(finished, { id: 'story:lizhaiyiwen:completed', date: localDay(now), timestamp: now,
        kind: 'adventure', title: '完成一次冒险', rods: 1, cardId: 'wamai' });
    }
    case 'demoRods': return { ...state, rods: ADVENTURE_COST };
    case 'demoOutdoors': {
      if (state.session || state.sleep) throw new Error('请先结束当前的打坐或休息。');
      const count = state.healthyTaskCount ?? new Set(state.completedActivities).size;
      return { ...state,
        // Prime the next fifth task without granting a card or changing existing rewards.
        healthyTaskCount: Math.floor(count / 5) * 5 + 4,
        demoOutdoorsRound: (state.demoOutdoorsRound ?? 0) + 1,
        completedActivities: state.completedActivities.filter(key => key !== activityKey(localDay(activityNow), 'outdoors')),
        healthyCelebration: null,
      };
    }
  }
}
