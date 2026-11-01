import { describe, expect, it } from 'vitest';
import { ADVENTURE_COST, createInitialState as createFundedState, FOCUS_DURATION_MS, localDay, reduceGame, remainingTime } from '../src/game/engine';
import type { GameState } from '../src/game/types';
import { STORY_NODES } from '../src/story/content';

const noon = new Date(2026, 9, 31, 12).getTime();
// Reward arithmetic is tested from an empty wallet; initial funding has its own flow test.
const createInitialState = () => ({ ...createFundedState(), rods: 0 });
function startFocus(activityId?: 'lunch') {
  return reduceGame(createInitialState(), { type: 'startTimer', mode: 'focus', durationMs: FOCUS_DURATION_MS, activityId }, noon);
}

describe('专注与生活任务', () => {
  it('30分钟之前不发奖，到达截止时间后只发一次', () => {
    const started = startFocus();
    expect(reduceGame(started, { type: 'reconcile' }, noon + FOCUS_DURATION_MS - 1).rods).toBe(0);
    const done = reduceGame(started, { type: 'reconcile' }, noon + FOCUS_DURATION_MS);
    expect(done.rods).toBe(1);
    expect(done.session).toBeNull();
    expect(done.memories[0].durationMinutes).toBe(30);
    expect(reduceGame(done, { type: 'reconcile' }, noon + FOCUS_DURATION_MS + 10_000)).toBe(done);
  });

  it('暂停期间不积累专注时间，恢复后按剩余时间结算', () => {
    const paused = reduceGame(startFocus(), { type: 'pauseTimer' }, noon + 10 * 60000);
    expect(remainingTime(paused.session!, noon + 99999999)).toBe(20 * 60000);
    expect(reduceGame(paused, { type: 'reconcile' }, noon + 8 * 3600000).rods).toBe(0);
    const resumeAt = noon + 8 * 3600000;
    const resumed = reduceGame(paused, { type: 'resumeTimer' }, resumeAt);
    expect(reduceGame(resumed, { type: 'reconcile' }, resumeAt + 20 * 60000 - 1).rods).toBe(0);
    expect(reduceGame(resumed, { type: 'reconcile' }, resumeAt + 20 * 60000).rods).toBe(1);
  });

  it('开始后使用早于开始操作的渲染快照，不会显示超出设定时长的剩余时间', () => {
    const session = startFocus().session!;
    expect(remainingTime(session, noon - 900)).toBe(FOCUS_DURATION_MS);
    expect(session.durationMs - remainingTime(session, noon - 900)).toBe(0);
    expect(remainingTime(session, noon + 500)).toBe(FOCUS_DURATION_MS - 500);
    expect(remainingTime(session, session.endsAt + 1)).toBe(0);
  });

  it('恢复后使用旧渲染快照，剩余秒数和落瓣所用进度均不倒退', () => {
    const started = reduceGame(createInitialState(), { type: 'startTimer', mode: 'focus', durationMs: 10000 }, noon);
    const paused = reduceGame(started, { type: 'pauseTimer' }, noon + 8300);
    const remainingAtPause = remainingTime(paused.session!, noon + 8300);
    expect(remainingAtPause).toBe(1700);
    expect(remainingTime(paused.session!, noon + 99999)).toBe(remainingAtPause);
    const resumeAt = noon + 20000;
    const resumed = reduceGame(paused, { type: 'resumeTimer' }, resumeAt).session!;
    const staleRender = resumeAt - 650;
    expect(remainingTime(resumed, staleRender)).toBe(remainingAtPause);
    expect(Math.ceil(remainingTime(resumed, staleRender) / 1000)).toBe(2);
    expect(resumed.durationMs - remainingTime(resumed, staleRender)).toBe(8300);
    expect(remainingTime(resumed, resumeAt + 200)).toBe(1500);
    expect(remainingTime(resumed, resumeAt + remainingAtPause)).toBe(0);
  });

  it('后台或刷新后以时间戳恢复并将回忆归入完成当日', () => {
    const beforeMidnight = new Date(2026, 9, 31, 23, 50).getTime();
    const state = reduceGame(createInitialState(), { type: 'startTimer', mode: 'focus', durationMs: FOCUS_DURATION_MS }, beforeMidnight);
    const restored = JSON.parse(JSON.stringify(state)) as GameState;
    const done = reduceGame(restored, { type: 'reconcile' }, beforeMidnight + 3 * 3600000);
    expect(done.rods).toBe(1);
    expect(done.memories[0].date).toBe('2026-11-01');
    expect(done.memories[0].timestamp).toBe(beforeMidnight + FOCUS_DURATION_MS);
  });

  it('朝食专注增加一个算筹，重复健康任务不重复结算', () => {
    let state = reduceGame(startFocus('lunch'), { type: 'reconcile' }, noon + FOCUS_DURATION_MS);
    expect(state.rods).toBe(1);
    expect(state.memories[0].cardId).toBeUndefined();
    expect(state.healthyTaskCount).toBe(1);
    expect(state.completedActivities).toEqual([`${localDay(noon)}:lunch`]);
    state = reduceGame(state, { type: 'startTimer', mode: 'focus', durationMs: FOCUS_DURATION_MS, activityId: 'lunch' }, noon + FOCUS_DURATION_MS + 1);
    state = reduceGame(state, { type: 'reconcile' }, noon + 2 * FOCUS_DURATION_MS + 1);
    expect(state.rods).toBe(1);
    expect(state.memories.filter(memory => memory.cardId)).toHaveLength(0);
  });

  it('照片与专注两种路径共享每日生活任务领取状态', () => {
    const done = reduceGame(startFocus('lunch'), { type: 'reconcile' }, noon + FOCUS_DURATION_MS);
    const repeated = reduceGame(done, { type: 'completePhoto', activityId: 'lunch', photoId: 'main:test' }, noon + FOCUS_DURATION_MS + 1);
    expect(repeated).toBe(done);
    const tomorrow = reduceGame(done, { type: 'completePhoto', activityId: 'lunch', photoId: 'main:next' }, noon + 24 * 3600000);
    expect(tomorrow.rods).toBe(2);
    expect(tomorrow.memories[1].photoId).toBe('main:next');
  });

  it('取消未完成计时不发算筹', () => {
    const state = reduceGame(startFocus(), { type: 'cancelTimer' }, noon + 60000);
    expect(state.session).toBeNull();
    expect(state.rods).toBe(0);
    expect(state.memories).toEqual([]);
  });

  it('就寝专注只在夜间计为健康任务，重复领取不会发奖', () => {
    const bedtime = new Date(2026, 9, 31, 23).getTime();
    let state = reduceGame(createInitialState(), { type: 'startTimer', mode: 'focus', durationMs: 300000, activityId: 'sleep' }, bedtime);
    state = reduceGame(state, { type: 'reconcile' }, bedtime + 300000);
    expect(state.memories[0]).toMatchObject({ kind: 'focus', activityId: 'sleep', rods: 1 });
    expect(state.memories[0].cardId).toBeUndefined();
    expect(reduceGame(state, { type: 'beginSleep' }, bedtime + 301000)).toBe(state);
  });
});

describe('演示算筹', () => {
  it('从5筹或20筹均设为10筹，重复设置不累加且保留其他进度', () => {
    const meal = reduceGame(createInitialState(), { type: 'completePhoto', activityId: 'lunch', photoId: 'demo:lunch' }, noon);
    const entered = reduceGame({ ...meal, rods: 20 }, { type: 'startStory' }, noon + 1);
    const progressed = reduceGame(entered, { type: 'advanceStory', nodeId: 'opening' }, noon + 2);
    const running = reduceGame(progressed, { type: 'startTimer', mode: 'focus', durationMs: FOCUS_DURATION_MS }, noon + 3);
    const paused = reduceGame(running, { type: 'pauseTimer' }, noon + 4);
    for (const rods of [5, 20]) {
      const before = { ...paused, rods };
      const changed = reduceGame(before, { type: 'demoRods' }, noon + 5);
      expect(changed).toEqual({ ...before, rods: ADVENTURE_COST });
      expect(reduceGame(changed, { type: 'demoRods' }, noon + 6)).toEqual(changed);
      expect(before.rods).toBe(rods);
    }
  });
});

describe('就寝相伴', () => {
  const bedtime = new Date(2026, 9, 31, 23).getTime();
  it('旧就寝入口使用夜间专注，不再隔日六小时自动领卡', () => {
    const state = reduceGame(createInitialState(), { type: 'beginSleep' }, bedtime);
    expect(state.sleep).toBeNull();
    expect(state.session).toMatchObject({ activityId: 'sleep', mode: 'focus', durationMs: FOCUS_DURATION_MS });
    expect(reduceGame(state, { type: 'reconcile' }, bedtime + FOCUS_DURATION_MS - 1).rods).toBe(0);
    expect(reduceGame(state, { type: 'reconcile' }, bedtime + FOCUS_DURATION_MS).rods).toBe(1);
    const late = reduceGame(state, { type: 'reconcile', includeSleep: true }, bedtime + 6 * 3600000);
    expect(late.rods).toBe(0);
    expect(late.session).toBeNull();
  });
  it('不能同时开始普通打坐与就寝专注', () => {
    expect(() => reduceGame(startFocus(), { type: 'beginSleep' }, noon + 1)).toThrow();
    const sleeping = reduceGame(createInitialState(), { type: 'beginSleep' }, bedtime);
    expect(() => reduceGame(sleeping, { type: 'startTimer', mode: 'focus', durationMs: FOCUS_DURATION_MS }, bedtime + 1)).toThrow();
  });
});

function enterStory() {
  return reduceGame({ ...createInitialState(), rods: ADVENTURE_COST }, { type: 'startStory' }, noon);
}

function completeStory(input: GameState, target?: string): GameState {
  let state = input;
  const visited = new Set<string>();
  while (state.story) {
    const nodeId = state.story.nodeId;
    if (target === nodeId) return state;
    if (visited.has(nodeId)) throw new Error(`故事出现循环：${nodeId}`);
    visited.add(nodeId);
    const node = STORY_NODES[nodeId];
    if (!node) throw new Error(`缺失故事节点：${nodeId}`);
    for (const flag of node.requiredFlags ?? []) {
      state = reduceGame(state, { type: 'inspectStory', nodeId, flagId: flag.id }, noon + visited.size);
    }
    state = reduceGame(state, { type: 'advanceStory', nodeId }, noon + visited.size);
    if (!node.nextId) return state;
  }
  return state;
}

describe('李宅异闻', () => {
  it('九筹拒绝入场，十筹入场成功，余额不足时不能因已有进度而免费进入', () => {
    expect(() => reduceGame({ ...createInitialState(), rods: 9 }, { type: 'startStory' }, noon)).toThrow();
    const entered = enterStory();
    expect(entered.rods).toBe(0);
    expect(entered.story).toMatchObject({ entryConfirmed: true, nodeId: 'opening', storyCompleted: false });
    const restored = JSON.parse(JSON.stringify(entered)) as GameState;
    expect(() => reduceGame(restored, { type: 'startStory' }, noon + 1000)).toThrow();
    expect(restored.rods).toBe(0);
    expect(restored.story).toEqual(entered.story);
  });

  it('每次从金银筒入场都扣十筹，未完成故事沿保存节点继续', () => {
    const first = reduceGame({ ...createInitialState(), rods: 20 }, { type: 'startStory' }, noon);
    const progressed = reduceGame(first, { type: 'advanceStory', nodeId: 'opening' }, noon + 1);
    const restored = JSON.parse(JSON.stringify(progressed)) as GameState;
    const second = reduceGame(restored, { type: 'startStory' }, noon + 1000);
    expect(first.rods).toBe(10);
    expect(second.rods).toBe(0);
    expect(second.story?.nodeId).toBe(progressed.story?.nodeId);
    expect(second.story?.viewedFlags).toEqual(progressed.story?.viewedFlags);
    expect(() => reduceGame(second, { type: 'startStory' }, noon + 2000)).toThrow();
  });

  it('只有明确匹配当前节点的推进有效，双击旧按钮不会越过下一节点', () => {
    const entered = enterStory();
    const next = reduceGame(entered, { type: 'advanceStory', nodeId: 'opening' }, noon + 1);
    expect(next.story?.nodeId).toBe(STORY_NODES.opening.nextId);
    expect(next.story?.viewedFlags).toContain('read:opening');
    expect(reduceGame(next, { type: 'advanceStory', nodeId: 'opening' }, noon + 2)).toBe(next);
    expect(reduceGame(entered, { type: 'advanceStory', nodeId: 'ending' }, noon + 3)).toBe(entered);
  });

  it('关闭或返回页面不推进故事，持续时间不会自动跳过时间卡', () => {
    const opened = reduceGame(enterStory(), { type: 'advanceStory', nodeId: 'opening' }, noon + 1);
    // Closing the card has no domain command. A later restoration only reconciles life timers.
    const restored = JSON.parse(JSON.stringify(opened)) as GameState;
    const returned = reduceGame(restored, { type: 'reconcile', includeSleep: true }, noon + 10 * 24 * 3600000);
    expect(returned).toEqual(opened);
  });

  it('瓦魅必须检视眉目和衣物，只接受当前节点定义的检视项', () => {
    const reveal = Object.values(STORY_NODES).find(node => node.requiredFlags?.some(flag => flag.id === 'wamai:face'))!;
    expect(reveal).toBeDefined();
    const arrived = completeStory(enterStory(), reveal.id);
    expect(() => reduceGame(arrived, { type: 'advanceStory', nodeId: reveal.id }, noon + 100)).toThrow();
    expect(reduceGame(arrived, { type: 'inspectStory', nodeId: reveal.id, flagId: 'not-an-item' }, noon + 101)).toBe(arrived);
    expect(reduceGame(arrived, { type: 'inspectStory', nodeId: 'opening', flagId: 'wamai:face' }, noon + 102)).toBe(arrived);
    const face = reduceGame(arrived, { type: 'inspectStory', nodeId: reveal.id, flagId: 'wamai:face' }, noon + 103);
    expect(() => reduceGame(face, { type: 'advanceStory', nodeId: reveal.id }, noon + 104)).toThrow();
    const clothes = reduceGame(face, { type: 'inspectStory', nodeId: reveal.id, flagId: 'wamai:clothes' }, noon + 105);
    expect(reduceGame(clothes, { type: 'advanceStory', nodeId: reveal.id }, noon + 106).story?.nodeId).toBe(reveal.nextId);
  });

  it('十一篇中的水滨查验按家人回报呈现，明确翻页后才进入结尾', () => {
    const river = STORY_NODES['a7-river'];
    expect(river.presentation).toBe('narrative');
    expect(river.body.join('')).toContain('铛子');
    const arrived = completeStory(enterStory(), river.id);
    expect(reduceGame(arrived, { type: 'reconcile' }, noon + 1000).story?.nodeId).toBe(river.id);
    expect(reduceGame(arrived, { type: 'advanceStory', nodeId: river.id }, noon + 1001).story?.nodeId).toBe(river.nextId);
  });

  it('十一篇线性节点全部可达，通关只授予一次瓦魅收藏与算筹', () => {
    const completed = completeStory(enterStory());
    expect(completed.story).toMatchObject({ nodeId: 'ending', storyCompleted: true, rewardGranted: true });
    expect(completed.story?.viewedFlags.filter(flag => flag.startsWith('read:'))).toHaveLength(Object.keys(STORY_NODES).length);
    expect(completed.memories).toHaveLength(1);
    expect(completed.memories[0]).toMatchObject({ kind: 'adventure', title: '完成一次冒险', cardId: 'wamai', rods: 1 });
    expect(completed.rods).toBe(1);
    const repeated = reduceGame(completed, { type: 'advanceStory', nodeId: 'ending' }, noon + 10000);
    expect(repeated.rods).toBe(1);
    expect(repeated.memories).toHaveLength(1);
  });

  it('完成后再次付十筹从开场开始，永久收藏保留，第二次通关不再奖励', () => {
    const finished = completeStory(enterStory());
    const replay = reduceGame({ ...finished, rods: 10 }, { type: 'startStory' }, noon + 50000);
    expect(replay.story).toMatchObject({ nodeId: 'opening', storyCompleted: false, rewardGranted: true });
    expect(replay.story?.viewedFlags).toEqual([]);
    expect(replay.story?.collectedFlags).toEqual(finished.story?.collectedFlags);
    expect(replay.rods).toBe(0);
    const finishedAgain = completeStory(replay);
    expect(finishedAgain.rods).toBe(0);
    expect(finishedAgain.memories).toHaveLength(1);
    expect(finishedAgain.story).toMatchObject({ storyCompleted: true, rewardGranted: true });
  });

  it('新一轮的必要检视重新确认，不因永久收藏而跳过当前操作', () => {
    const finished = completeStory(enterStory());
    const replay = reduceGame({ ...finished, rods: 10 }, { type: 'startStory' }, noon + 50000);
    const reveal = Object.values(STORY_NODES).find(node => node.requiredFlags?.some(flag => flag.id === 'wamai:face'))!;
    const arrived = completeStory(replay, reveal.id);
    expect(arrived.story?.collectedFlags).toContain('wamai:face');
    expect(arrived.story?.viewedFlags).not.toContain('wamai:face');
    expect(() => reduceGame(arrived, { type: 'advanceStory', nodeId: reveal.id }, noon + 60000)).toThrow();
  });

  it('兼容没有collectedFlags的历史通关存档，再次入场时保留原收藏', () => {
    const finished = completeStory(enterStory());
    const { collectedFlags: _oldCollection, ...legacyStory } = finished.story!;
    const replay = reduceGame({ ...finished, rods: 10, story: legacyStory }, { type: 'startStory' }, noon + 50000);
    expect(replay.story?.collectedFlags).toEqual(legacyStory.viewedFlags);
    expect(replay.story?.viewedFlags).toEqual([]);
    expect(replay.story?.rewardGranted).toBe(true);
  });

  it('退出故事可使用日常功能，有专注或睡眠时不能重新进入故事', () => {
    const entered = enterStory();
    const focusing = reduceGame(entered, { type: 'startTimer', mode: 'focus', durationMs: FOCUS_DURATION_MS }, noon + 1);
    expect(focusing.story).toEqual(entered.story);
    expect(() => reduceGame(focusing, { type: 'startStory' }, noon + 2)).toThrow();
    const sleeping = reduceGame(entered, { type: 'beginSleep' }, new Date(2026, 9, 31, 23).getTime());
    expect(sleeping.story).toEqual(entered.story);
    expect(() => reduceGame(sleeping, { type: 'startStory' }, noon + 2)).toThrow();
  });
});
