import type { ActivityId } from '../game/types';
import type { SceneId } from '../scene/types';
import { healthyActivityAt } from '../game/healthSchedule';

export interface ActivityDefinition {
  id: ActivityId; title: string; time: string; invitation: string; guide: string;
  scene: SceneId; together: string; photoLabel: string;
}
export const ACTIVITIES: Record<ActivityId, ActivityDefinition> = {
  breakfast: { id: 'breakfast', title: '晨读', time: '08:00 — 10:00',
    invitation: '闲持贝叶书，步出东斋读。', guide: '银钩在书阁，快去找他吧',
    scene: 'courtyard', together: '陪银钩一起晨读', photoLabel: '上传晨读图片' },
  lunch: { id: 'lunch', title: '朝食', time: '11:30 — 13:30',
    invitation: '宿雨林笋嫩，晨露园葵鲜。\n烹葵炮嫩笋，可以备朝餐。', guide: '银钩在厨房，快去找他吧',
    scene: 'kitchen', together: '陪银钩一起朝食', photoLabel: '上传朝食图片' },
  outdoors: { id: 'outdoors', title: '外出', time: '15:00 — 17:00',
    invitation: '轻衣稳马槐阴下，自要闲行一两坊。', guide: '银钩出门了，你也起身走走吧。',
    scene: 'courtyard', together: '等待银钩', photoLabel: '上传活动图片' },
  dinner: { id: 'dinner', title: '夕食', time: '17:00 — 19:30',
    invitation: '鱼香肥泼火，饭细滑流匙。', guide: '银钩在厨房，快去找他吧',
    scene: 'kitchen', together: '陪银钩一起夕食', photoLabel: '上传夕食图片' },
  sleep: { id: 'sleep', title: '就寝', time: '22:30 — 24:00',
    invitation: '夜深静卧百虫绝，清月出岭光入扉。', guide: '与银钩一同入眠，快去找他吧',
    scene: 'west-wing', together: '陪银钩一起入眠', photoLabel: '上传就寝图片' },
};
export function activityAt(date: Date): ActivityDefinition | null {
  const id = healthyActivityAt(date);
  return id ? ACTIVITIES[id] : null;
}
export { localDay, FOCUS_DURATION_MS as FOCUS_MS, MEDITATION_DURATION_MS as MEDITATION_MS, SLEEP_DURATION_MS as SLEEP_MS } from '../game/engine';
