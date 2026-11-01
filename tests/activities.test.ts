import { describe, expect, it } from 'vitest';
import { activityAt } from '../src/content/activities';

describe('本地生活时段', () => {
  it.each([
    [7,59,null], [8,0,'breakfast'], [9,59,'breakfast'], [10,0,null],
    [11,29,null], [11,30,'lunch'], [13,29,'lunch'], [13,30,null],
    [14,59,null], [15,0,'outdoors'], [16,59,'outdoors'], [17,0,'dinner'],
    [19,29,'dinner'], [19,30,null], [22,29,null], [22,30,'sleep'], [23,59,'sleep'], [0,0,null],
  ])('%i:%i 推荐 %s', (hour,minute,id) => {
    expect(activityAt(new Date(2026,9,31,hour,minute))?.id??null).toBe(id);
  });
});
