import { beforeAll, describe, expect, it, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { createInitialState, FOCUS_DURATION_MS, reduceGame } from '../src/game/engine';
import { loadGame, photoBlob, saveGame, savePhoto, storageKey } from '../src/game/storage';

beforeAll(() => {
  const data = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
  });
});

describe('本地持久化', () => {
  it('旧书桌计时恢复为榻上打坐，剩余时间和原有筹数不变', () => {
    const started = reduceGame(createInitialState(), { type: 'startTimer', mode: 'focus', durationMs: FOCUS_DURATION_MS }, 1000);
    const paused = reduceGame(started, { type: 'pauseTimer' }, 61000);
    saveGame(paused, false);
    const restored = loadGame(false);
    expect(restored.session).toEqual({ ...paused.session, retreat: 'daybed' });
    expect(restored.rods).toBe(paused.rods);
    expect(loadGame(false)).toEqual(restored);
  });
  it('演示与正式存档相互隔离', () => {
    saveGame({ ...createInitialState(), rods: 3 }, false);
    saveGame({ ...createInitialState(), rods: 100 }, true);
    expect(loadGame(false).rods).toBe(3);
    expect(loadGame(true).rods).toBe(100);
  });

  it('照片以Blob保存，回读后内容不变且ID区分演示模式', async () => {
    const image = new Blob(['image-bytes'], { type: 'image/png' });
    const mainId = await savePhoto(image);
    const demoId = await savePhoto(image, true);
    expect(mainId).toMatch(/^main:/);
    expect(demoId).toMatch(/^demo:/);
    expect(mainId).not.toBe(demoId);
    expect(await (await photoBlob(mainId))?.text()).toBe('image-bytes');
    expect(await photoBlob('missing')).toBeUndefined();
  });

  it('旧翻牌版本存档保留日常数据并迁移为空故事进度', () => {
    const { story: _story, ...legacy } = createInitialState();
    const old = { ...legacy, rods: 8, adventure: { id: 'old-demo', matchedPairs: [0, 1], startedAt: 10 },
      memories: [{ id: 'old-focus', date: '2026-10-31', timestamp: 123, kind: 'focus', title: '完成一段专注', rods: 1 }] };
    localStorage.setItem(storageKey(false), JSON.stringify(old));
    const migrated = loadGame(false);
    expect(migrated.story).toBeNull();
    expect(migrated.rods).toBe(8);
    expect(migrated.memories).toEqual(old.memories);
    expect('adventure' in migrated).toBe(false);
  });
  it('旧健康记录按唯一完成键迁移累计数，已有卡片与筹数保留且不补发', () => {
    const { healthyTaskCount: _, ...initial } = createInitialState();
    const legacy = { ...initial, rods: 13, completedActivities: ['2026-10-30:lunch', '2026-10-31:lunch', '2026-10-31:outdoors', '2026-10-31:sleep', '2026-10-31:sleep'],
      memories: [{ id: 'legacy-meal', date: '2026-10-31', timestamp: 1, kind: 'meal', title: '旧午餐', rods: 1, cardId: 'meal' }] };
    localStorage.setItem(storageKey(false), JSON.stringify(legacy));
    const migrated = loadGame(false);
    expect(migrated.healthyTaskCount).toBe(4);
    expect(migrated.rods).toBe(13);
    expect(migrated.memories).toEqual(legacy.memories);
    expect(migrated.healthyCelebration).toBeNull();
    expect(loadGame(false)).toEqual(migrated);
  });

});
