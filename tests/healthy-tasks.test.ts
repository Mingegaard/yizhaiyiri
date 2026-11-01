import { describe, expect, it } from 'vitest';
import { createInitialState, FOCUS_DURATION_MS, localDay, reduceGame } from '../src/game/engine';
import { activityClock, HEALTH_WINDOWS } from '../src/game/healthSchedule';
import { healthyCardPools, knowledgeCards } from '../src/content/cards';
import { companionPlaces, healthyTravel, isNearHealthyCompanion } from '../src/scene/healthyCompanion';
import { canStandAt, scenes } from '../src/scene/config';
import type { ActivityId, GameState } from '../src/game/types';

const at = (hour: number, minute = 0, day = 1) => new Date(2026, 10, day, hour, minute).getTime();
const times: Record<ActivityId, number> = { breakfast: 8, lunch: 12, outdoors: 16, dinner: 18, sleep: 23 };
function photo(state: GameState, id: ActivityId, day = 1) {
  return reduceGame(state, { type: 'completePhoto', activityId: id, photoId: `photo:${id}:${day}` }, at(times[id], 0, day));
}

describe('银钩健康任务结算', () => {
  it('累计五次才给知识卡，类型跟随第五项；其他完成只触发雀跃', () => {
    let state = createInitialState();
    const order: ActivityId[] = ['breakfast', 'lunch', 'outdoors', 'dinner', 'sleep'];
    for (const [index, id] of order.entries()) {
      state = photo(state, id);
      expect(state.rods).toBe(10 + index);
      expect(state.healthyTaskCount).toBe(index + 1);
      expect(state.healthyCelebration).toMatchObject({ activityId: id });
      if (index < 4) expect(state.memories.at(-1)?.cardId).toBeUndefined();
    }
    expect(state.memories.at(-1)?.cardId).toBe(healthyCardPools.sleep[0]);
    expect(state.healthyCelebration?.cardId).toBe(healthyCardPools.sleep[0]);
    expect(state.memories.filter(memory => memory.cardId)).toHaveLength(1);
  });

  it.each(Object.keys(times) as ActivityId[])('第五次为%s时从该类型池取卡，跨日累计且再次轮到时取下一张', id => {
    const fifth = photo({ ...createInitialState(), healthyTaskCount: 4 }, id);
    expect(fifth.memories[0].cardId).toBe(healthyCardPools[id][0]);
    const tenth = photo({ ...fifth, healthyTaskCount: 9 }, id, 3);
    expect(tenth.memories[1].cardId).toBe(healthyCardPools[id][1]);
    expect(knowledgeCards[tenth.memories[1].cardId!]).toBeDefined();
    const back = photo({ ...tenth, healthyTaskCount: 14 }, id, 8);
    expect(back.memories[2].cardId).toBe(healthyCardPools[id][0]);
  });

  it('照片和专注混合累计，双击、刷新和另一种方式都不会多发', () => {
    let state = photo(createInitialState(), 'breakfast');
    const start = at(12);
    state = reduceGame(state, { type: 'startTimer', mode: 'focus', activityId: 'lunch', durationMs: FOCUS_DURATION_MS }, start);
    state = reduceGame(JSON.parse(JSON.stringify(state)), { type: 'reconcile' }, start + FOCUS_DURATION_MS);
    expect(state.healthyTaskCount).toBe(2);
    expect(state.rods).toBe(11);
    expect(photo(state, 'lunch')).toBe(state);
    expect(reduceGame(state, { type: 'reconcile' }, start + FOCUS_DURATION_MS + 1)).toBe(state);
    expect(reduceGame(state, { type: 'startTimer', mode: 'focus', activityId: 'lunch', durationMs: 10000 }, start + FOCUS_DURATION_MS + 1)).toBe(state);
  });

  it('普通打坐不计入健康任务累计，也不产生健康知识卡', () => {
    const state = { ...createInitialState(), healthyTaskCount: 4 };
    const started = reduceGame(state, { type: 'startTimer', mode: 'focus', retreat: 'daybed', durationMs: FOCUS_DURATION_MS }, at(10));
    const done = reduceGame(started, { type: 'reconcile' }, at(10, 30));
    expect(done).toMatchObject({ rods: 10, healthyTaskCount: 4, healthyCelebration: null });
    expect(done.memories[0].cardId).toBeUndefined();
  });

  it('仅打开应用不会完成任务；超出时段不能发起任务或提交图片', () => {
    expect(reduceGame(createInitialState(), { type: 'reconcile' }, at(8)).healthyTaskCount).toBe(0);
    for (const id of Object.keys(times) as ActivityId[]) {
      for (const minute of [HEALTH_WINDOWS[id][0] - 1, HEALTH_WINDOWS[id][1]]) {
        const now = at(Math.floor(minute / 60), minute % 60);
        expect(() => reduceGame(createInitialState(), { type: 'startTimer', mode: 'focus', activityId: id, durationMs: 10000 }, now)).toThrow('这段时辰已经过去');
        expect(() => reduceGame(createInitialState(), { type: 'completePhoto', activityId: id, photoId: 'expired' }, now)).toThrow('这段时辰已经过去');
      }
    }
  });

  it('计时跨出时段、暂停后超时、后台过时返回和跨日均不完成任务', () => {
    const started = reduceGame(createInitialState(), { type: 'startTimer', mode: 'focus', activityId: 'breakfast', durationMs: FOCUS_DURATION_MS }, at(9, 45));
    expect(reduceGame(started, { type: 'reconcile' }, at(10, 15))).toMatchObject({ rods: 9, healthyTaskCount: 0, session: null });
    const valid = reduceGame(createInitialState(), { type: 'startTimer', mode: 'focus', activityId: 'breakfast', durationMs: FOCUS_DURATION_MS }, at(8));
    expect(reduceGame(valid, { type: 'reconcile' }, at(10))).toMatchObject({ rods: 9, healthyTaskCount: 0, session: null });
    expect(reduceGame(valid, { type: 'reconcile' }, at(8, 0, 2)).rods).toBe(9);
    const paused = reduceGame(valid, { type: 'pauseTimer' }, at(8, 15));
    const resumed = reduceGame(paused, { type: 'resumeTimer' }, at(9, 50));
    expect(reduceGame(resumed, { type: 'reconcile' }, at(10, 5)).rods).toBe(9);
    const sleep = reduceGame(createInitialState(), { type: 'startTimer', mode: 'focus', activityId: 'sleep', durationMs: FOCUS_DURATION_MS }, at(23, 45));
    expect(reduceGame(sleep, { type: 'reconcile' }, at(0, 15, 2)).healthyTaskCount).toBe(0);
  });

  it('演示时段与真实计时分开，切走时段不能领取旧任务', () => {
    const real = at(10);
    const clock = activityClock(real, true, '12');
    const start = reduceGame(createInitialState(), { type: 'startTimer', mode: 'focus', activityId: 'lunch', durationMs: 10000 }, real, clock);
    const done = reduceGame(start, { type: 'reconcile' }, real + 10000, activityClock(real + 10000, true, '12'));
    expect(done).toMatchObject({ rods: 10, healthyTaskCount: 1 });
    const outside = reduceGame(start, { type: 'reconcile' }, real + 10000, activityClock(real + 10000, true, '10'));
    expect(outside).toMatchObject({ rods: 9, healthyTaskCount: 0, session: null });
    expect(localDay(done.memories[0].timestamp)).toBe(localDay(real));
  });

  it('知识卡片待领取状态跨刷新保存，仅对应的确认可以清除', () => {
    const state = JSON.parse(JSON.stringify(photo({ ...createInitialState(), healthyTaskCount: 4 }, 'dinner'))) as GameState;
    expect(reduceGame(state, { type: 'dismissHealthyCelebration', memoryId: 'stale' }, at(18))).toBe(state);
    const done = reduceGame(state, { type: 'dismissHealthyCelebration', memoryId: state.healthyCelebration!.memoryId }, at(18));
    expect(done.healthyCelebration).toBeNull();
    expect(done.rods).toBe(10);
    expect(done.memories[0].cardId).toBe(healthyCardPools.dinner[0]);
  });
});

describe('场景与银钩相遇', () => {
  it('跳转点可行走，接近对应场景的银钩才出现操作，外出没有在场银钩', () => {
    for (const id of Object.keys(times) as ActivityId[]) {
      const travel = healthyTravel(id, 1), scene = scenes[travel.sceneId];
      expect(canStandAt(travel.position[0], travel.position[2], scene.bounds, scene.colliders)).toBe(true);
      expect(isNearHealthyCompanion(travel.position, travel.sceneId, id)).toBe(false);
      const place = companionPlaces[id];
      expect(isNearHealthyCompanion(place.anchor, place.sceneId, id)).toBe(id !== 'outdoors');
      expect(isNearHealthyCompanion(place.anchor, place.sceneId === 'kitchen' ? 'courtyard' : 'kitchen', id)).toBe(false);
    }
  });
});
