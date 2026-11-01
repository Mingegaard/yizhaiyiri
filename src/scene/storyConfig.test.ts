import { describe, expect, it } from 'vitest';
import { STORY_NODES } from '../story/content';
import { storyPropStates, storyShots } from './storyConfig';

describe('story scene integration', () => {
  it('provides a camera and supported evidence state for every authored story node', () => {
    for (const node of Object.values(STORY_NODES)) {
      const visual = node.visual;
      expect(storyShots[visual.zone], node.id).toBeDefined();
      expect(storyPropStates[visual.prop], node.id).toContain(visual.state);
    }
  });

  it('keeps story cameras at eye level, including the family report illustration', () => {
    for (const shot of Object.values(storyShots)) {
      expect(shot.camera[1]).toBeGreaterThanOrEqual(1.5);
      expect(shot.camera[1]).toBeLessThanOrEqual(1.9);
    }
  });

  it('does not reveal the tile before its inspection node, and has distinct aftermath states', () => {
    expect(STORY_NODES['a4-hard'].visual.state).toBe('covered');
    expect(STORY_NODES['a4-reveal'].visual.state).toBe('whole');
    expect(STORY_NODES['a4-fragments'].visual.state).toBe('fragments');
    expect(STORY_NODES['a5-clothes'].visual.state).not.toBe(STORY_NODES['a5-clothes-returned'].visual.state);
    expect(STORY_NODES['a7-chest'].visual.state).not.toBe(STORY_NODES['a7-confession'].visual.state);
  });
});
