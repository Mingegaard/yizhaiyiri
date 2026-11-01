import { knowledgeCards } from '../content/cards';
import { localDay } from './engine';
import { CHAPTERS } from '../story/chapters';
import type { ActivityId, MemoryEntry, StoryProgress } from './types';

type MemoryActivity = ActivityId | 'legacy-breakfast' | 'meal' | 'adventure' | 'other';
const activityOrder: MemoryActivity[] = ['breakfast', 'legacy-breakfast', 'lunch', 'outdoors', 'dinner', 'sleep', 'meal', 'adventure', 'other'];
export const memoryActivityLabels: Record<MemoryActivity, string> = {
  breakfast: '晨读', lunch: '朝食', outdoors: '外出', dinner: '夕食', sleep: '就寝',
  'legacy-breakfast': '早饭', meal: '饮食', adventure: '冒险', other: '日常',
};

/** Demo books keep only the newest card; reward history still drives the card pool. */
export function memoriesForBook(memories: MemoryEntry[], demo: boolean, visits: StoryProgress['chapterVisits'] = []): MemoryEntry[] {
  if (visits.length) memories = [...memories, ...visits.flatMap(visit => {
    const chapterTitle = CHAPTERS[visit.act]?.replace(/^\S+\s+/, '');
    return chapterTitle ? [{ id: `story:chapter:${visit.date}:${visit.act}`, date: visit.date, timestamp: visit.timestamp,
      kind: 'adventure' as const, title: chapterTitle, chapterTitle, rods: 0 }] : [];
  })];
  if (!demo) return memories;
  let latest: MemoryEntry | undefined;
  for (const entry of memories) {
    if (entry.cardId && (!latest || entry.timestamp >= latest.timestamp)) latest = entry;
  }
  if (!latest) return memories;
  return memories.map(entry => {
    if (!entry.cardId || entry === latest) return entry;
    const { cardId: _cardId, ...record } = entry;
    return record;
  });
}

/** Older saves lack activityId; recover only what the original record actually identifies. */
export function memoryActivity(entry: MemoryEntry): MemoryActivity {
  // Keep old breakfast memories truthful after the morning slot became reading.
  if ((entry.activityId === 'breakfast' && /早[餐饭]/.test(entry.title)) || (!entry.activityId && (/早[餐饭]/.test(entry.title) || /:breakfast$/.test(entry.id)))) return 'legacy-breakfast';
  if (entry.activityId) return entry.activityId;
  const legacyId = entry.id.match(/:(breakfast|lunch|outdoors|dinner|sleep)$/)?.[1];
  if (legacyId) return legacyId as ActivityId;
  if (/午[餐饭]/.test(entry.title)) return 'lunch';
  if (/晚[餐饭]/.test(entry.title)) return 'dinner';
  if (entry.kind === 'outdoors' || entry.cardId === 'outdoors') return 'outdoors';
  if (entry.kind === 'sleep' || entry.cardId === 'sleep') return 'sleep';
  if (entry.kind === 'meal' || entry.cardId === 'meal') return 'meal';
  if (entry.kind === 'adventure') return 'adventure';
  return 'other';
}

export function memoryColumns(entries: MemoryEntry[]) {
  const groups = new Map<MemoryActivity, { activity: MemoryActivity; cardId?: string; photoIds: string[] }>();
  for (const entry of [...entries].sort((a, b) => a.timestamp - b.timestamp)) {
    if (!entry.photoId && !entry.cardId) continue;
    const activity = memoryActivity(entry);
    const group = groups.get(activity) ?? { activity, photoIds: [] };
    if (entry.cardId) group.cardId = entry.cardId;
    if (entry.photoId && !group.photoIds.includes(entry.photoId)) group.photoIds.push(entry.photoId);
    groups.set(activity, group);
  }
  return activityOrder.flatMap(activity => groups.has(activity) ? [groups.get(activity)!] : []);
}

export function memorySentences(entries: MemoryEntry[]): string[] {
  const focus = entries.filter(entry => entry.kind === 'focus' || entry.kind === 'meditation')
    .reduce((sum, entry) => sum + (entry.durationMinutes ?? 0), 0);
  const sentences = [`专注总时长 ${Number(focus.toFixed(1))} 分钟。`];
  const health = [
    { id: 'breakfast', done: '与银钩一起晨读', received: '与银钩一起阅读了' },
    { id: 'lunch', done: '与银钩一起朝食', received: '与银钩一起品尝了' },
    { id: 'outdoors', done: '与银钩一起外出', received: '银钩外出并遇到了' },
    { id: 'sleep', done: '与银钩一起早早入眠', received: '与银钩一起早睡并进入梦境' },
  ] as const;
  for (const activity of health) {
    const completed = entries.filter(entry => memoryActivity(entry) === activity.id && !(activity.id === 'sleep' && entry.kind === 'meditation'));
    if (!completed.length) continue;
    const titles = [...new Set(completed.flatMap(entry => entry.cardId && knowledgeCards[entry.cardId] ? [knowledgeCards[entry.cardId].title] : []))];
    sentences.push(`${titles.length ? activity.received + titles.map(title => `《${title}》`).join('、') : activity.done}。`);
  }
  const chapters = [...new Set(entries.flatMap(entry => entry.chapterTitle ? [entry.chapterTitle] : []))];
  if (chapters.length) sentences.push(`进入${chapters.map(title => `《${title}》`).join('、')}冒险。`);
  else if (entries.some(entry => entry.kind === 'adventure')) sentences.push('进入《李宅异闻》冒险。');
  return sentences;
}

const lunarFormatter = new Intl.DateTimeFormat('zh-CN-u-ca-chinese', { year: 'numeric', month: 'long', day: 'numeric' });
const chineseDigits = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
export function lunarDate(date: Date) {
  const parts = lunarFormatter.formatToParts(date);
  const day = Number(parts.find(part => part.type === 'day')?.value);
  const dayName = day <= 10 ? `初${chineseDigits[day - 1]}` : day < 20 ? `十${chineseDigits[day - 11]}` : day === 20 ? '二十' : day < 30 ? `廿${chineseDigits[day - 21]}` : '三十';
  const year = parts.find(part => String(part.type) === 'yearName')?.value;
  const month = parts.find(part => part.type === 'month')?.value ?? '';
  return { year: year ? `${year}年` : '', monthDay: `${month}${dayName}` };
}

export function calendarCells(year: number, month: number): (string | null)[] {
  const offset = (new Date(year, month, 1).getDay() + 6) % 7;
  const count = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: Math.ceil((offset + count) / 7) * 7 }, (_, index) => {
    const day = index - offset + 1;
    return day >= 1 && day <= count ? localDay(new Date(year, month, day)) : null;
  });
}
