import type { ActivityId } from './types';

// Endpoints are exclusive. The legacy IDs remain stable for existing memories.
export const HEALTH_WINDOWS: Record<ActivityId, readonly [number, number]> = {
  breakfast: [8 * 60, 10 * 60], lunch: [11 * 60 + 30, 13 * 60 + 30],
  outdoors: [15 * 60, 17 * 60], dinner: [17 * 60, 19 * 60 + 30], sleep: [22 * 60 + 30, 24 * 60],
};
export function healthyActivityAt(timestamp: number | Date): ActivityId | null {
  const date = new Date(timestamp);
  const minute = date.getHours() * 60 + date.getMinutes();
  return (Object.keys(HEALTH_WINDOWS) as ActivityId[]).find(id => {
    const [start, end] = HEALTH_WINDOWS[id];
    return minute >= start && minute < end;
  }) ?? null;
}
export function healthyWindowEnd(timestamp: number, id: ActivityId): number {
  const date = new Date(timestamp);
  date.setHours(0, HEALTH_WINDOWS[id][1], 0, 0);
  return date.getTime();
}
/** The existing demo selector changes the activity clock, never the elapsed timer. */
export function activityClock(now: number, demo: boolean, period: string): number {
  if (!demo || period === 'real') return now;
  const hour = Number(period);
  if (!Number.isFinite(hour) || hour < 0 || hour >= 24) return now;
  const date = new Date(now);
  date.setHours(Math.floor(hour), Math.round((hour % 1) * 60), 0, 0);
  return date.getTime();
}
