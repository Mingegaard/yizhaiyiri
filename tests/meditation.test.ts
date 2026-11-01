import { describe, expect, it } from 'vitest';
import { createInitialState, FOCUS_DURATION_MS, MEDITATION_DURATION_MS, reduceGame, remainingTime } from '../src/game/engine';
import { timerDuration } from '../src/game/timerDuration';
import { daybedMeditationPose, isNearDaybed } from '../src/scene/daybedMeditation';
import { studyDaybed } from '../src/scene/studyDaybedLayout';
import { memorySentences } from '../src/game/memoryBook';

describe('床榻打坐沿用书桌专注规则', () => {
  const now = new Date(2026, 10, 1, 12).getTime();
  const choice = { type: 'startTimer', mode: 'focus', retreat: 'daybed', durationMs: 10000 } as const;

  it('普通打坐与原书桌专注均固定三十分钟，演示为十秒', () => {
    for (const minutes of [1, 7, 120]) {
      const sitting = { ...choice, durationMs: minutes * 60000 };
      const { retreat: _, ...desk } = sitting;
      expect(timerDuration(sitting, false)).toBe(FOCUS_DURATION_MS);
      expect(timerDuration(sitting, false)).toBe(timerDuration(desk, false));
    }
    expect(timerDuration({ type: 'startTimer', mode: 'meditation', durationMs: 10000 }, false)).toBe(MEDITATION_DURATION_MS);
    expect(timerDuration({ type: 'startTimer', mode: 'focus', durationMs: 10000 }, false)).toBe(FOCUS_DURATION_MS);
    expect(timerDuration({ ...choice, durationMs: 10000 }, true)).toBe(10000);
  });

  it('旧冥想模式的时长兼容保留，健康任务由专注模式承接', () => {
    for (const activityId of ['outdoors', 'sleep'] as const) {
      expect(timerDuration({ ...choice, mode: 'meditation', activityId }, false)).toBe(MEDITATION_DURATION_MS);
      expect(timerDuration({ ...choice, mode: 'meditation', activityId }, true)).toBe(10000);
    }
  });

  it('三十分钟打坐可保存、暂停、恢复，完成只加一筹并计入原专注统计', () => {
    const start = reduceGame(createInitialState(), { ...choice, durationMs: timerDuration(choice, false) }, now);
    const saved = JSON.parse(JSON.stringify(start));
    expect(saved.session).toMatchObject({ retreat: 'daybed', mode: 'focus', durationMs: FOCUS_DURATION_MS });
    const paused = reduceGame(saved, { type: 'pauseTimer' }, now + 60000);
    const remaining = FOCUS_DURATION_MS - 60000;
    expect(remainingTime(paused.session!, now + 9999999)).toBe(remaining);
    const resumed = reduceGame(paused, { type: 'resumeTimer' }, now + 3600000);
    expect(reduceGame(resumed, { type: 'reconcile' }, now + 3600000 + remaining - 1).memories).toEqual([]);
    const done = reduceGame(resumed, { type: 'reconcile' }, now + 3600000 + remaining);
    expect(done.session).toBeNull();
    expect(done.rods).toBe(10);
    expect(done.memories[0]).toMatchObject({ kind: 'focus', title: '完成一段打坐', rods: 1, durationMinutes: 30 });
    expect(memorySentences(done.memories)).toContain('专注总时长 30 分钟。');
    expect(reduceGame(done, { type: 'reconcile' }, now + 9999999)).toBe(done);
    expect(reduceGame(start, { type: 'cancelTimer' }, now + 60000)).toMatchObject({ session: null, rods: 9, memories: [] });
  });

  it('健康任务与普通打坐分别结算，不与照片重复奖励', () => {
    const start = reduceGame(createInitialState(), { ...choice, activityId: 'lunch', durationMs: FOCUS_DURATION_MS }, now);
    const done = reduceGame(start, { type: 'reconcile' }, now + FOCUS_DURATION_MS);
    expect(done.rods).toBe(10);
    expect(done.memories[0]).toMatchObject({ activityId: 'lunch', rods: 1, kind: 'focus' });
    expect(reduceGame(done, { type: 'completePhoto', activityId: 'lunch', photoId: 'meal:photo' }, now + FOCUS_DURATION_MS + 1)).toBe(done);
    const repeated = reduceGame(done, { ...choice, durationMs: FOCUS_DURATION_MS }, now + FOCUS_DURATION_MS + 1);
    const finished = reduceGame(repeated, { type: 'reconcile' }, now + 2 * FOCUS_DURATION_MS + 1);
    expect(finished.rods).toBe(11);
    expect(finished.memories.filter(memory => memory.cardId)).toHaveLength(0);
  });

  it('前方与侧边可接近床榻，院外、北窗后方和其他房间没有入座提示', () => {
    const z = studyDaybed.position[2];
    expect(isNearDaybed([0, .272, z + 1.0], 'courtyard')).toBe(true);
    expect(isNearDaybed([1.64, .272, z], 'courtyard')).toBe(true);
    expect(isNearDaybed([-2.1, .272, z], 'courtyard')).toBe(true);
    for (const position of [[0, 0, 7], [3.3, 0, z], [0, 0, z - 1.6]] as [number, number, number][]) expect(isNearDaybed(position, 'courtyard')).toBe(false);
    expect(isNearDaybed([0, 0, z + 1], 'kitchen')).toBe(false);
    for (const aspect of [16 / 9, 390 / 844]) {
      expect(daybedMeditationPose(aspect).position[0]).toBe(0);
      expect(daybedMeditationPose(aspect).target[0]).toBe(0);
    }
    const seated = daybedMeditationPose(16 / 9);
    expect(seated.position[0]).toBe(0);
    expect(seated.position[2]).toBeLessThan(z);
    expect(seated.target[0]).toBe(0);
    expect(seated.target[2]).toBeGreaterThan(seated.position[2]);
  });
});
