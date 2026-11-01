import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Check, Compass, Feather, X } from 'lucide-react';
import type { StoryProgress } from '../game/types';
import type { MovementInput, Vec3 } from '../scene/types';
import type { EstateAtmosphere } from '../scene/estateAtmosphere';
import { STORY_ACTS, STORY_NODES, STORY_ORDER } from './content';
import { presentation, autoPresentation, speaker } from './presentation';
import { storyTarget } from '../scene/adventureLayout';
import { LETTER_TEXT } from './original';
import { OriginalText, Silhouette } from './StoryPresentation';
import { EndingReading } from './EndingReading';
import './story.css';

const SceneCanvas = lazy(() => import('../scene/SceneCanvas').then(m => ({ default: m.SceneCanvas })));
const ignore = () => {};

function PaperDialog({ children, title, onClose, className = '' }: { children: ReactNode; title: string; onClose: () => void; className?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const element = dialog.current!; element.showModal(); return () => element.close(); }, []);
  return <dialog ref={dialog} className={`adventure-paper ${className}`} aria-label={title} onCancel={event => { event.preventDefault(); onClose(); }}>{children}</dialog>;
}

export function AdventureJournal({ story, onClose }: { story: StoryProgress; onClose: () => void }) {
  const [tab, setTab] = useState<'notes' | 'original'>('notes');
  const [selected, setSelected] = useState<string | null>(null);
  const read = new Set(story.collectedFlags ?? story.viewedFlags);
  const entries = STORY_ORDER.map(id => STORY_NODES[id]).filter(node => read.has(`read:${node.id}`));
  const node = selected ? STORY_NODES[selected] : null;
  return <PaperDialog title="冒险札记" className="adventure-journal" onClose={onClose}>
    <header className="paper-heading"><div><small>筒中奇境 · 李宅异闻</small><h2>冒险札记</h2></div><button aria-label="关闭冒险札记" onClick={onClose}><X size={20}/></button></header>
    <nav className="journal-tabs"><button aria-pressed={tab === 'notes'} onClick={() => { setTab('notes'); setSelected(null); }}>宅中记事</button><button aria-pressed={tab === 'original'} onClick={() => setTab('original')}>古籍原文</button></nav>
    <div className="journal-scroll">{tab === 'original' ? <OriginalText full/> : node ? <>
      <button className="journal-back" onClick={() => setSelected(null)}><ArrowLeft size={14}/>返回札记</button><h3>{node.title}</h3>
      <div className="journal-copy">{(LETTER_TEXT[node.id] ? [LETTER_TEXT[node.id]] : node.body).map((text, i) => <p key={i}>{text}</p>)}</div>
      <details><summary>查阅对应原文</summary><OriginalText nodeId={node.id}/></details>
    </> : <>
      {story.rewardGranted ? <div className="journal-collection"><span className="adventure-seal">藏</span><div><h3>瓦魅</h3><p>永久纪念 · 李宅异闻已读毕</p></div><Check size={18}/></div> : null}
      {entries.length ? <ol className="journal-entries">{entries.map(entry => <li key={entry.id}><button onClick={() => setSelected(entry.id)}><span>{String(entry.act + 1).padStart(2, '0')}</span><strong>{entry.title}</strong><ArrowRight size={14}/></button></li>)}</ol> : <p className="journal-empty">故事刚刚开始。读过的来信与见闻，会一一留在这里。</p>}
    </>}</div>
  </PaperDialog>;
}

export interface StoryScreenProps { atmosphere: EstateAtmosphere; story: StoryProgress; onAdvance: (nodeId: string) => Promise<void>; onInspect: (nodeId: string, flagId: string) => Promise<void>; onClose: () => void }

export function StoryScreen({ atmosphere, story, onAdvance, onInspect, onClose }: StoryScreenProps) {
  const node = STORY_NODES[story.nodeId] ?? STORY_NODES.opening;
  const mode = presentation(node);
  const [cardOpen, setCardOpen] = useState(autoPresentation(node));
  const [journalOpen, setJournalOpen] = useState(false);
  const [line, setLine] = useState(0);
  const [choice, setChoice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [nearTarget, setNearTarget] = useState(false);
  const [travel, setTravel] = useState<{ id: number; nodeId: string }>();
  const [reading, setReading] = useState(story.storyCompleted);
  const actionLock = useRef(false);
  const inputRef = useRef<MovementInput>({ forward: 0, right: 0, turn: 0 });
  const lines = node.body.length ? node.body : [''];
  const current = lines[line] ?? '';
  const index = STORY_ORDER.indexOf(node.id);
  const complete = (node.requiredFlags ?? []).every(flag => story.viewedFlags.includes(flag.id));
  const ready = complete && (node.id !== 'fire-trace' || !!choice);
  const { night, sunset, kitchenSmoking } = atmosphere;
  const target = useMemo(() => storyTarget(node.id), [node.id]);
  const retained = useMemo(() => {
    const items = new Map<string, { nodeId: string; view: typeof node.visual }>();
    for (const id of STORY_ORDER) {
      const previous = STORY_NODES[id];
      if (!story.viewedFlags.includes(`read:${id}`) || autoPresentation(previous) || ['none', 'letter', 'books'].includes(previous.visual.prop)) continue;
      items.set(`${previous.visual.prop}:${storyTarget(id).join()}`, { nodeId: id, view: previous.visual });
    }
    return [...items.values()];
  }, [story.viewedFlags]);
  useEffect(() => { setCardOpen(autoPresentation(node)); setLine(0); setChoice(null); setNearTarget(false); setError(''); }, [node.id]);

  const advance = async () => {
    if (actionLock.current || !ready) return;
    if (mode !== 'letter' && line < lines.length - 1) { setLine(value => value + 1); return; }
    actionLock.current = true; setBusy(true); setError('');
    try { await onAdvance(node.id); if (!node.nextId) setReading(true); }
    catch (reason) { setError(reason instanceof Error ? reason.message : '这一页还未保存，请重试。'); }
    finally { actionLock.current = false; setBusy(false); }
  };
  const inspect = async (flagId: string) => {
    if (actionLock.current) return;
    actionLock.current = true; setBusy(true); setError('');
    try { await onInspect(node.id, flagId); setChoice(node.inspectItems?.find(item => item.id === flagId)?.body ?? null); }
    catch (reason) { setError(reason instanceof Error ? reason.message : '检视尚未保存，请重试。'); }
    finally { actionLock.current = false; setBusy(false); }
  };
  const interact = () => { if (!busy && !cardOpen && !journalOpen) { if (node.autoAdvanceOnApproach) void advance(); else setCardOpen(true); } };
  const reportPosition = (position: Vec3) => {
    const near = Math.hypot(position[0] - target[0], position[2] - target[2]) < 2.5;
    setNearTarget(near);
    if (near && node.autoAdvanceOnApproach && !cardOpen && !journalOpen && !busy) void advance();
  };
  if (reading) return <EndingReading onClose={onClose}/>;
  return <main className={`story-screen ${night ? 'story-night' : ''}`} data-testid="story-screen" data-node-id={node.id}>
    <div className="story-stage"><Suspense fallback={<div className="scene-loading">展开李宅画卷…</div>}>
      <SceneCanvas sceneId="courtyard" elfState="away" night={night} sunset={sunset} kitchenSmoking={kitchenSmoking} blocked={cardOpen || journalOpen || busy} inputRef={inputRef} onPosition={reportPosition} onPortalNear={ignore} rods={0} onVesselTouch={ignore} storyView={autoPresentation(node) ? undefined : node.visual} storyNodeId={node.id} storyActionLabel={node.hotspotLabel} onStoryInteract={interact} storyTravel={travel} retainedStoryProps={retained}/>
    </Suspense></div>
    <div className="story-vignette"/>
    <header className="adventure-header"><div className="adventure-heading"><span className="adventure-seal">异</span><div><small>筒中奇境 · 李宅异闻</small><h1>{STORY_ACTS[node.act]}</h1><span className="adventure-progress">{index + 1} / {STORY_ORDER.length}</span></div></div><nav aria-label="冒险记录"><button onClick={() => setJournalOpen(true)} disabled={busy}><BookOpen size={16}/><span>冒险札记</span></button><button onClick={onClose} disabled={busy}><ArrowLeft size={15}/><span>返回庭院</span></button></nav></header>
    {!cardOpen && !journalOpen ? <><div className="adventure-objective"><span><Feather size={14}/>{autoPresentation(node) ? '见闻待续' : node.task ?? node.title}</span>{autoPresentation(node) ? <button onClick={() => setCardOpen(true)}>继续阅读<ArrowRight size={14}/></button> : nearTarget ? <button data-testid="story-interact" onClick={interact}>查看物件<ArrowRight size={14}/></button> : <button data-testid="story-travel" onClick={() => setTravel({ id: Date.now(), nodeId: node.id })}><Compass size={14}/>移步至线索旁</button>}</div></> : null}
    {cardOpen ? <PaperDialog title={node.title} className={`presentation-${mode}`} onClose={() => { if (!busy) setCardOpen(false); }}>
      <div className="paper-rule"/><header className="paper-heading"><div><small>{mode === 'letter' ? '李宅来书' : mode === 'object' ? '留心检视' : mode === 'thought' ? '李哲 · 心想' : mode === 'dialogue' ? node.character ?? speaker(node.id) : '宅中记事'}</small><h2>{node.title}</h2></div><button aria-label="收起此页" disabled={busy} onClick={() => setCardOpen(false)}><X size={19}/></button></header>
      {mode === 'dialogue' && current.includes('“') ? <Silhouette name={node.character ?? speaker(node.id)}/> : null}
      <div className="paper-body">{mode === 'letter' ? <div className="letter-paper"><p>{LETTER_TEXT[node.id] ?? node.body.join('\n')}</p></div> : <p className={`adventure-copy ${mode === 'thought' ? 'is-thought' : ''}`}>{current}</p>}
        {node.inspectItems?.length ? <div className="adventure-options" aria-label="必要检视">{node.inspectItems.map(item => <button data-testid={`story-inspect-${item.id}`} key={item.id} disabled={busy} onClick={() => void inspect(item.id)}>{story.viewedFlags.includes(item.id) ? <Check size={14}/> : <span className="option-mark">◇</span>}{item.label}</button>)}</div> : null}
        {node.options?.length ? <div className="adventure-options">{node.options.map(option => <button key={option.label} disabled={busy} onClick={() => setChoice(option.feedback)}>{option.label}</button>)}</div> : null}
        {choice ? <p className="adventure-feedback" role="status">{choice}</p> : null}{error ? <p className="adventure-error" role="alert">{error}</p> : null}
      </div><footer className="paper-footer"><span>{mode === 'letter' ? '尺素传心' : `${line + 1} / ${lines.length}`}</span><button data-testid="story-next" disabled={busy || !ready} onClick={() => void advance()}>{mode !== 'letter' && line < lines.length - 1 ? '继续' : mode === 'letter' && node.buttonLabel === '继续' ? '收好此信' : node.buttonLabel}<ArrowRight size={16}/></button></footer>
    </PaperDialog> : null}
    {journalOpen ? <AdventureJournal story={story} onClose={() => setJournalOpen(false)}/> : null}
  </main>;
}
