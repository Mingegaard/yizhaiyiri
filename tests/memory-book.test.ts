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
    expect(memorySentences(book)).toContain('专注总时长 90 分钟。');
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

  it('汇总专注时长并合并重复活动，只引用卡片标题，不把睡眠计入专注', () => {
    const sentences = memorySentences([
      entry({ id: 'first', activityId: 'lunch', cardId: 'meal', durationMinutes: 30 }),
      entry({ id: 'second', activityId: 'lunch', cardId: 'meal', durationMinutes: 60 }),
      entry({ id: 'rest', kind: 'sleep', activityId: 'sleep', durationMinutes: 360 }),
    ]);
    expect(sentences).toEqual(['专注总时长 90 分钟。', '与银钩一起品尝了《一餐一味》。', '与银钩一起早早入眠。']);
  });

  it('睡前冥想不会被当成已经完成睡眠', () => {
    const sentences = memorySentences([entry({ kind: 'meditation', activityId: 'sleep', durationMinutes: 10 })]);
    expect(sentences).toEqual(['专注总时长 10 分钟。']);
  });

  it('摘要固定为六类信息，按顺序只列已完成项，不增加夕食或卡片全文', () => {
    const records = [
      entry({ id: 'sleep', kind: 'sleep', activityId: 'sleep' }),
      entry({ id: 'outdoors', kind: 'outdoors', activityId: 'outdoors' }),
      entry({ id: 'dinner', activityId: 'dinner', cardId: 'evening-rice', durationMinutes: 30 }),
      entry({ id: 'lunch', kind: 'meal', activityId: 'lunch' }),
      entry({ id: 'reading', activityId: 'breakfast', durationMinutes: 30 }),
      entry({ id: 'meditation', kind: 'meditation', durationMinutes: 10 }),
    ];
    expect(memorySentences(memoriesForBook(records, false, [{ date: '2026-10-31', act: 0, timestamp: 1 }]))).toEqual([
      '专注总时长 70 分钟。', '与银钩一起晨读。', '与银钩一起朝食。', '与银钩一起外出。', '与银钩一起早早入眠。', '进入《东郭火迹》冒险。',
    ]);
    expect(memorySentences([])).toEqual(['专注总时长 0 分钟。']);
    expect(memorySentences(records.filter(record => record.id === 'outdoors'))).toEqual(['专注总时长 0 分钟。', '与银钩一起外出。']);
  });

  it('收到卡片后用完整原题替换该项摘要，示例模式仅引用当前保留的卡片', () => {
    const records = [
      entry({ id: 'reading', activityId: 'breakfast', cardId: 'reading-leaves', timestamp: 1 }),
      entry({ id: 'lunch', activityId: 'lunch', cardId: 'morning-bamboo', timestamp: 2 }),
      entry({ id: 'outdoors', activityId: 'outdoors', cardId: 'outdoors-agate-cup', timestamp: 3 }),
      entry({ id: 'sleep', activityId: 'sleep', cardId: 'sleep-moon', timestamp: 4 }),
    ];
    expect(memorySentences(records)).toEqual([
      '专注总时长 0 分钟。', '与银钩一起阅读了《贝叶书》。', '与银钩一起品尝了《雨后新笋》。',
      '银钩外出并遇到了《这只兽嘴，竟是杯子的出酒口》。', '与银钩一起早睡并进入梦境《月光入扉》。',
    ]);
    expect(memorySentences(memoriesForBook(records, true))).toEqual([
      '专注总时长 0 分钟。', '与银钩一起晨读。', '与银钩一起朝食。', '与银钩一起外出。', '与银钩一起早睡并进入梦境《月光入扉》。',
    ]);
  });

  it('冒险章节按进入日期归入日历，同日的章节合并成一条', () => {
    const book = memoriesForBook([], true, [
      { date: '2026-10-31', act: 0, timestamp: 1 },
      { date: '2026-10-31', act: 1, timestamp: 2 },
      { date: '2026-11-01', act: 2, timestamp: 3 },
    ]);
    expect(memorySentences(book.filter(record => record.date === '2026-10-31'))).toEqual(['专注总时长 0 分钟。', '进入《东郭火迹》、《阿万报书》冒险。']);
    expect(memorySentences(book.filter(record => record.date === '2026-11-01'))).toEqual(['专注总时长 0 分钟。', '进入《伐竹得书》冒险。']);
    expect(book.every(record => record.rods === 0 && !record.cardId)).toBe(true);
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
  it('卡片诗句与正文不再展开在摘要中', () => {
    const sentences = memorySentences([entry({ cardId: 'sleep-moon', activityId: 'sleep' })]);
    expect(sentences).toEqual(['专注总时长 0 分钟。', '与银钩一起早睡并进入梦境《月光入扉》。']);
  });

  it('旧早餐记录仍表示早饭，不会随晨间任务改成晨读', () => {
    const old = entry({ title: '好好吃早餐', activityId: 'breakfast', photoId: 'old-breakfast' });
    expect(memoryActivity(old)).toBe('legacy-breakfast');
    expect(memorySentences([old])).toEqual(['专注总时长 0 分钟。']);
    expect(memoryActivity(entry({ title: '与银钩晨读', activityId: 'breakfast' }))).toBe('breakfast');
  });

});
