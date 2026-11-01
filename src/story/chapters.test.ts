import { describe, expect, it } from 'vitest';
import { STORY_NODES, STORY_ORDER } from './content';
describe('用户修改后的环节', () => {
 it('书卷缺口先提供查找和质问，祝祈由下一环节确认', () => {
  expect(STORY_NODES['a1-missing'].buttonLabel).toBe('继续');
  expect(STORY_NODES['a1-missing'].options?.map(x=>x.label)).toEqual(['再找一遍书架','向空处质问']);
  expect(STORY_NODES['a1-prayer'].buttonLabel).toBe('诚心祝祈');
  expect(STORY_NODES['a1-prayer'].nextId).toBe('a1-returned');
 });
 it('靠近冠履空位直接接两人对白，不提前祈祝', () => {
  expect(STORY_NODES['a3-empty'].autoAdvanceOnApproach).toBe(true);
  expect(STORY_NODES['a3-empty'].nextId).toBe('shoes-complaint');
  expect(STORY_NODES['shoes-complaint'].nextId).toBe('shoes-prayer');
  expect(STORY_NODES['shoes-prayer'].buttonLabel).toBe('稍祈之');
 });
 it('妇人对白前有数日后的背景过渡', () => {
  const index=STORY_ORDER.indexOf('a5-woman');
  const previous=STORY_NODES[STORY_ORDER[index-1]];
  expect(previous.presentation).toBe('narrative');
  expect(previous.body.join('')).toContain('丧服');
  expect(previous.nextId).toBe('a5-woman');
 });
});
