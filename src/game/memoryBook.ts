import { knowledgeCards } from '../content/cards';
import { localDay } from './engine';
import type { ActivityId, MemoryEntry } from './types';

type MemoryActivity = ActivityId | 'legacy-breakfast' | 'meal' | 'adventure' | 'other';
const activityOrder: MemoryActivity[] = ['breakfast', 'legacy-breakfast', 'lunch', 'outdoors', 'dinner', 'sleep', 'meal', 'adventure', 'other'];
export const memoryActivityLabels: Record<MemoryActivity, string> = {
  breakfast: '晨读', lunch: '朝食', outdoors: '外出', dinner: '夕食', sleep: '就寝',
  'legacy-breakfast': '早饭', meal: '饮食', adventure: '冒险', other: '日常',
};

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
  if (!entries.length) return ['今日尚未留下记录。'];
  const sentences = new Set<string>();
  const cardIds = new Set(entries.flatMap(entry => entry.cardId ? [entry.cardId] : []));
  for (const id of cardIds) {
    const body = knowledgeCards[id]?.body;
    for (const sentence of body?.match(/[^。！？!?]+[。！？!?]?[”’」』]?/g) ?? []) {
      const trimmed = sentence.trim();
      if (trimmed) sentences.add(/[。！？!?][”’」』]?$/.test(trimmed) ? trimmed : `${trimmed}。`);
    }
  }
  const focus = entries.filter(entry => entry.kind === 'focus').reduce((sum, entry) => sum + (entry.durationMinutes ?? 0), 0);
  sentences.add(`今日专注 ${Number(focus.toFixed(1))} 分钟。`);
  const meditation = entries.filter(entry => entry.kind === 'meditation').reduce((sum, entry) => sum + (entry.durationMinutes ?? 0), 0);
  if (meditation) sentences.add(`静坐冥想 ${Number(meditation.toFixed(1))} 分钟。`);
  const health: Partial<Record<MemoryActivity, string>> = {
    'legacy-breakfast': '与小精灵共进早饭。', breakfast: '与银钩共度晨读时光。', lunch: '与银钩共进朝食。', dinner: '与银钩共进夕食。',
    outdoors: '出门走走，赴一场风与树的约。', sleep: '完成一次安寝约定。', meal: '好好吃过一餐。',
  };
  for (const entry of entries) {
    const activity = memoryActivity(entry);
    const sentence = activity === 'sleep' && entry.kind === 'meditation' ? '睡前静坐已毕。' : health[activity];
    if (sentence) sentences.add(sentence);
    if (entry.kind === 'adventure') {
      const title = /^完成李宅异闻(?:录)?$/.test(entry.title) ? '完成一次冒险' : entry.title;
      sentences.add(`${title.replace(/[。！？!?]+$/, '')}。`);
    }
  }
  return [...sentences];
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
