import { useMemo, useRef } from 'react';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { storyTarget } from './adventureLayout';
import { gameProp } from '../content/assets';
import { ModelAsset } from './ModelAsset';
import type { StoryView } from './types';

export { storyTarget, storyApproach } from './adventureLayout';

export function StoryInteraction({ view, nodeId, label, blocked, onInteract, passive = false }: {
  view: StoryView; nodeId: string; label: string; blocked: boolean; onInteract?: () => void; passive?: boolean;
}) {
  const target = storyTarget(nodeId);
  const nearby = useRef(false);
  const tag = useRef<HTMLSpanElement>(null);
  const source = useMemo(() => {
    if (view.prop === 'books') return null; // Inspect the existing scroll cabinet.
    if (view.prop === 'letter') {
      if (nodeId === 'a3-letter') return null; // Its letter is part of the retained shoes table.
      if (view.state === 'talisman') return { ...gameProp('letter_visible'), scale: .4 };
      const letter = { ...gameProp('letter_collected'), scale: .4 };
      // This letter rests on the furnished writing table, without another desk.
      return nodeId === 'a3-defense' ? { ...letter, position: [0, -1.08 * .4, 0] as [number, number, number],
        includePrefixes: ['letter_collected__paper', 'letter_collected__ink', 'letter_collected__red'] } : letter;
    }
    if (view.prop === 'none') return null;
    return { ...gameProp(`${view.prop}_${view.state}`, view.prop === 'clothes' && view.state === 'hanging' ? [0, 1.1, 0] : [0, 0, 0]), scale: .5 };
  }, [view.prop, view.state, nodeId]);
  useFrame(({ camera }) => {
    if (passive) return;
    nearby.current = Math.hypot(camera.position.x - target[0], camera.position.z - target[2]) < 2.5;
    if (tag.current) {
      tag.current.textContent = nearby.current ? `${label} · 点击查看` : '走近查看';
      tag.current.style.opacity = blocked ? '0' : '1';
    }
  });
  return <group position={target}>
    <group onClick={event => {
      event.stopPropagation();
      if (event.delta < 6 && nearby.current && !blocked && !passive) onInteract?.();
    }}>
      {nodeId === 'fire-trace' ? <ModelAsset asset={{ url: '/models/story/fire-trace.glb', position: [0, 0, 0], rotation: [0, 0, 0], scale: 1 }} /> : source ? <ModelAsset asset={source} /> : null}
      {!passive ? <mesh position={[0, .45, 0]}><boxGeometry args={[1.1, 1.15, .85]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} /></mesh> : null}
    </group>
    {!passive ? <><mesh position={[0, .018, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[.48, .5, 40]} /><meshBasicMaterial color="#ad986c" transparent opacity={.55} depthWrite={false} /></mesh><Html position={[0, 1.35, 0]} center style={{ pointerEvents: 'none' }}><span ref={tag} className="story-world-label">走近查看</span></Html></> : null}
  </group>;
}
