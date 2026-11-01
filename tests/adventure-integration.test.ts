import { describe, expect, it, vi } from 'vitest';
import { ADVENTURE_COST, createInitialState, reduceGame } from '../src/game/engine';
import { STORY_ACTS, STORY_NODES, STORY_ORDER } from '../src/story/content';
import { autoPresentation } from '../src/story/presentation';
import { adventureVesselPosition, isNearAdventureVessel, storyApproach, storyTarget } from '../src/scene/adventureLayout';
import { canStandAt, scenes } from '../src/scene/config';
import { studyWritingTable } from '../src/scene/studyWritingTableLayout';
import { loadGame, storageKey } from '../src/game/storage';

describe('主游戏十一篇冒险接入', () => {
  it('初始九筹不能入境，完成一次打坐后恰好十筹，付费入境后不重复补筹', () => {
    const initial = createInitialState();
    expect(initial.rods).toBe(9);
    expect(() => reduceGame(initial, { type: 'startStory' }, 1000)).toThrow();
    const timer = reduceGame(initial, { type: 'startTimer', mode: 'focus', retreat: 'daybed', durationMs: 10000 }, 1000);
    const done = reduceGame(timer, { type: 'reconcile' }, 11000);
    expect(done.rods).toBe(ADVENTURE_COST);
    const entered = reduceGame(done, { type: 'startStory' }, 11001);
    expect(entered.rods).toBe(0);
    expect(entered.story?.nodeId).toBe('opening');
    expect(reduceGame(entered, { type: 'reconcile' }, 12000).rods).toBe(0);
  });
  it('每一篇及每件线索都可到达，不把新物证放在既有墙体或家具中', () => {
    expect(STORY_ACTS).toHaveLength(11);
    const scene = scenes.courtyard;
    for (const id of STORY_ORDER) {
      const node = STORY_NODES[id];
      expect(STORY_NODES[node.nextId ?? 'ending'], id).toBeDefined();
      if (autoPresentation(node)) continue;
      const approach = storyApproach(id), target = storyTarget(id);
      expect(canStandAt(approach[0], approach[2], scene.bounds, scene.colliders), id).toBe(true);
      expect(Math.hypot(approach[0] - target[0], approach[2] - target[2]), id).toBeLessThan(2.5);
    }
    expect(adventureVesselPosition[1]).toBeCloseTo(studyWritingTable.position[1] + studyWritingTable.tabletopHeight + .007);
    expect(isNearAdventureVessel([2.45, .272, -3.25])).toBe(true);
    expect(isNearAdventureVessel([0, 0, 7])).toBe(false);
  });
  it('旧空档只补一次九筹，已有照片、奖励和旧故事进度均保留', () => {
    const data = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value) });
    const { startingRodsGranted: _, ...old } = createInitialState();
    data.set(storageKey(false), JSON.stringify({ ...old, rods: 0 }));
    expect(loadGame(false).rods).toBe(9);
    const funded = loadGame(false);
    data.set(storageKey(false), JSON.stringify({ ...funded, rods: 0 }));
    expect(loadGame(false).rods).toBe(0);
    const memory = { id: 'old-photo', date: '2026-10-31', kind: 'meal', photoId: 'photo:1', rods: 1 };
    data.set(storageKey(false), JSON.stringify({ ...old, rods: 3, memories: [memory], story: { entryConfirmed: true, nodeId: 'a6-moving-letter', viewedFlags: ['read:a1-report'], storyCompleted: false, rewardGranted: false } }));
    const migrated = loadGame(false);
    expect(migrated.rods).toBe(3);
    expect(migrated.memories).toEqual([memory]);
    expect(migrated.story?.nodeId).toBe('a6-discussion');
    expect(migrated.story?.viewedFlags).toContain('read:a1-report');
    vi.unstubAllGlobals();
  });
});
