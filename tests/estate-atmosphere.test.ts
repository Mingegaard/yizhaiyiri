import { describe, expect, it } from 'vitest';
import { estateAtmosphere } from '../src/scene/estateAtmosphere';
import { activityClock } from '../src/game/healthSchedule';
import { activityAt } from '../src/content/activities';

const date = (h: number, m = 0) => new Date(2026, 10, 1, h, m);

describe('宅院光照完全跟随时钟', () => {
  it.each([
    [0, 0, 'night'], [5, 59, 'night'], [6, 0, 'day'], [16, 59, 'day'],
    [17, 0, 'sunset'], [19, 29, 'sunset'], [19, 30, 'night'], [22, 30, 'night'], [23, 59, 'night'],
  ])('%i:%i 使用 %s', (hour, minute, mode) => {
    const result = estateAtmosphere(date(hour, minute));
    expect(result.mode).toBe(mode);
    expect(result.night).toBe(mode === 'night');
    expect(result.sunset).toBe(mode === 'sunset');
  });

  it.each([
    [11, 29, false], [11, 30, true], [13, 29, true], [13, 30, false],
    [16, 59, false], [17, 0, true], [19, 29, true], [19, 30, false],
  ])('%i:%i 的炊烟状态为 %s', (hour, minute, visible) => {
    expect(estateAtmosphere(date(hour, minute)).kitchenSmoking).toBe(visible);
  });

  it('任务间隙为闲时，夜间闲时仍保持黑夜', () => {
    for (const [hour, minute] of [[10, 0], [11, 29], [13, 30], [14, 59], [19, 30], [22, 29]]) {
      expect(activityAt(date(hour, minute))).toBeNull();
    }
    expect(estateAtmosphere(date(21))).toMatchObject({ night: true, sunset: false, kitchenSmoking: false });
    expect(activityAt(date(16, 59))?.title).toBe('外出');
    expect(activityAt(date(17))?.title).toBe('夕食');
  });

  it('演示的昼夜和炊烟使用同一时钟，正式模式仍用设备时间', () => {
    const now = date(9).getTime();
    expect(estateAtmosphere(new Date(activityClock(now, true, '19')))).toMatchObject({ mode: 'sunset', kitchenSmoking: true });
    expect(estateAtmosphere(new Date(activityClock(now, true, '23')))).toMatchObject({ mode: 'night', kitchenSmoking: false });
    expect(estateAtmosphere(new Date(activityClock(now, false, '23')))).toMatchObject({ mode: 'day', kitchenSmoking: false });
  });
});
