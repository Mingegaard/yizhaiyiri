import { describe, expect, it } from 'vitest';
import { calendarCells, lunarDate, memoriesForBook, memoryActivity, memoryColumns, memorySentences } from '../src/game/memoryBook';
import { createInitialState, FOCUS_DURATION_MS, reduceGame } from '../src/game/engine';
import type { MemoryEntry } from '../src/game/types';

const entry = (overrides: Partial<MemoryEntry> = {}): MemoryEntry => ({
  id: 'record', date: '2026-10-31', timestamp: new Date(2026, 9, 31, 12).getTime(),
  kind: 'focus', title: '完成一段专注', rods: 1, ...overrides,
});

describe('黄历记忆本', () => {
  it('演示记忆本跨日期只保留最新卡片，照片、时长和奖励历史不变', () => {
    const records = [
      entry({ id: 'newest', date: '2026-11-01', timestamp: 300, activityId: 'outdoors', cardId: 'outdoors-camel-musicians', photoId: 'latest-photo', durationMinutes: 30 }),
      entry({ id: 'older', timestamp: 100, activityId: 'outdoors', cardId: 'outdoors-agate-cup', photoId: 'old-photo', durationMinutes: 30 }),
      entry({ id: 'middle', timestamp: 200, activityId: 'lunch', cardId: 'meal' }),
      entry({ id: 'no-card', timestamp: 400, durationMinutes: 30 }),
    ];
    const before = JSON.stringify(records);
    const book = memoriesForBook(records, true);
    expect(book.filter(record => record.cardId)).toEqual([records[0]]);
    expect(book.map(({ cardId: _cardId, ...record }) => record)).toEqual(records.map(({ cardId: _cardId, ...record }) => record));
    expect(memoryColumns(book).flatMap(column => column.photoIds)).toEqual(['old-photo', 'latest-photo']);
    expect(memorySentences(book)).toContain('今日专注 90 分钟。');
    expect(memorySentences(book).some(sentence => sentence.includes('缠丝玛瑙'))).toBe(false);
    expect(JSON.stringify(records)).toBe(before);
  });

  it('正式模式保留所有卡片，演示模式相同时间的奖励取最后收下的那张', () => {
    const records = [entry({ id: 'first', cardId: 'outdoors-agate-cup' }), entry({ id: 'last', cardId: 'outdoors-dancing-horse' })];
    expect(memoriesForBook(records, false)).toBe(records);
    expect(memoriesForBook(records, true).filter(record => record.cardId)).toEqual([records[1]]);
    expect(memoriesForBook([], true)).toEqual([]);
  });

  it('十月从星期四开始，日期完整且星期列保持对齐', () => {
    const cells = calendarCells(2026, 9);
    expect(cells.slice(0, 4)).toEqual([null, null, null, '2026-10-01']);
    expect(cells.filter(Boolean)).toHaveLength(31);
    expect(cells[33]).toBe('2026-10-31');
    expect(cells).toHaveLength(35);
    expect(new Set(cells.filter(Boolean)).size).toBe(31);
  });

  it.each([[2027, 1, 28], [2028, 1, 29], [2026, 3, 30], [2026, 11, 31]])('正确生成 %i 年第 %i 月的 %i 天', (year, month, count) => {
    const cells = calendarCells(year, month);
    expect(cells.filter(Boolean)).toHaveLength(count);
    expect(cells.length % 7).toBe(0);
  });

  it('阴历使用汉字日期与干支年', () => {
    expect(lunarDate(new Date(2026, 9, 31, 12))).toEqual({ year: '丙午年', monthDay: '九月廿二' });
    expect(lunarDate(new Date(2026, 9, 10, 12)).monthDay).toBe('九月初一');
  });

  it('旧照片按原任务 ID 恢复，无法辨认的旧饮食记录不误认作午饭', () => {
    expect(memoryActivity(entry({ id: 'photo:2026-10-31:lunch', kind: 'meal' }))).toBe('lunch');
    expect(memoryActivity(entry({ kind: 'meal', cardId: 'meal' }))).toBe('meal');
  });

  it('同活动的来信与多张打卡照片保持同列，普通专注不占照片栏', () => {
    const records = [entry(), entry({ id: 'outside', activityId: 'outdoors', cardId: 'outdoors', photoId: 'walk' }),
      entry({ id: 'lunch-1', activityId: 'lunch', cardId: 'meal', photoId: 'lunch-a' }),
      entry({ id: 'lunch-2', activityId: 'lunch', photoId: 'lunch-b' })];
    const before = JSON.stringify(records);
    expect(memoryColumns(records)).toEqual([
      { activity: 'lunch', cardId: 'meal', photoIds: ['lunch-a', 'lunch-b'] },
      { activity: 'outdoors', cardId: 'outdoors', photoIds: ['walk'] },
    ]);
    expect(JSON.stringify(records)).toBe(before);
  });

  it('保留真实专注时长，合并重复知识与健康记录，不把睡眠计入专注', () => {
    const sentences = memorySentences([
      entry({ id: 'first', activityId: 'lunch', cardId: 'meal', durationMinutes: 30 }),
      entry({ id: 'second', activityId: 'lunch', cardId: 'meal', durationMinutes: 60 }),
      entry({ id: 'rest', kind: 'sleep', activityId: 'sleep', durationMinutes: 360 }),
    ]);
    expect(sentences).toContain('今日专注 90 分钟。');
    expect(sentences.filter(sentence => sentence === '与银钩共进朝食。')).toHaveLength(1);
    expect(sentences.filter(sentence => sentence.includes('食谱卡'))).toHaveLength(1);
    expect(sentences.every(sentence => (sentence.match(/[。！？!?]/g) ?? []).length === 1)).toBe(true);
  });

  it('睡前冥想不会被当成已经完成睡眠', () => {
    const sentences = memorySentences([entry({ kind: 'meditation', activityId: 'sleep', durationMinutes: 10 })]);
    expect(sentences).toContain('睡前静坐已毕。');
    expect(sentences).not.toContain('完成一次安寝约定。');
  });

  it('新增记录保留原活动归属，同时不改变任务结算', () => {
    const now = new Date(2026, 9, 31, 12).getTime();
    const started = reduceGame(createInitialState(), { type: 'startTimer', mode: 'focus', activityId: 'lunch', durationMs: FOCUS_DURATION_MS }, now);
    const finished = reduceGame(started, { type: 'reconcile' }, now + FOCUS_DURATION_MS);
    expect(finished.memories[0]).toMatchObject({ activityId: 'lunch', rods: 1, durationMinutes: 30 });
    expect(finished.rods).toBe(10);
    const photo = reduceGame(createInitialState(), { type: 'completePhoto', activityId: 'outdoors', photoId: 'test:photo' }, new Date(2026, 9, 31, 16).getTime());
    expect(photo.memories[0]).toMatchObject({ activityId: 'outdoors', photoId: 'test:photo' });
  });
  it('新知识卡中的诗句引号保持完整，不拆出孤立的右引号', () => {
    const sentences = memorySentences([entry({ cardId: 'sleep-moon', activityId: 'sleep' })]);
    expect(sentences).toContain('“清月出岭光入扉。”');
    expect(sentences.some(sentence => sentence.startsWith('”'))).toBe(false);
  });

  it('旧早餐记录仍表示早饭，不会随晨间任务改成晨读', () => {
    const old = entry({ title: '好好吃早餐', activityId: 'breakfast', photoId: 'old-breakfast' });
    expect(memoryActivity(old)).toBe('legacy-breakfast');
    expect(memorySentences([old])).toContain('与小精灵共进早饭。');
    expect(memorySentences([old])).not.toContain('与银钩共度晨读时光。');
    expect(memoryActivity(entry({ title: '与银钩晨读', activityId: 'breakfast' }))).toBe('breakfast');
  });

});
