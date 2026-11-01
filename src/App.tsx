import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { BookOpen, Settings2, HelpCircle, DoorOpen, Check, X, Feather, Cylinder, Expand, Footprints, RotateCcw } from 'lucide-react';
import { useGame } from './game/useGame';
import { ADVENTURE_COST, remainingTime } from './game/engine';
import type { ActivityId, GameCommand } from './game/types';
import type { Portal, SceneId, MovementInput } from './scene/types';
import { activityAt, localDay, FOCUS_MS } from './content/activities';
import { FocusRetreat, MeditationInvitation } from './components/FocusRetreat';
import { activityClock, healthyActivityAt } from './game/healthSchedule';
import { companionPlaces, healthyTravel } from './scene/healthyCompanion';
import { estateAtmosphere } from './scene/estateAtmosphere';
import { SilverHookIcon } from './components/SilverHookIcon';
import { HealthyKnowledge } from './components/HealthyKnowledge';
import { knowledgeCards } from './content/cards';
import { ActivityPanel } from './components/ActivityPanel';
import { Modal } from './components/Modal';
import { MemoryBook } from './components/MemoryBook';
import { VesselInvitation } from './components/VesselInvitation';
import { HelpPanel, SettingsPanel, PhotoPreview } from './components/UtilityPanels';

const SceneCanvas = lazy(() => import('./scene/SceneCanvas').then(m => ({ default: m.SceneCanvas })));
const StoryScreen = lazy(() => import('./story/StoryScreen').then(m => ({ default: m.StoryScreen })));
const SCENE_NAMES: Record<SceneId, string> = { courtyard: '庭院', kitchen: '东厨', 'west-wing': '西厢房' };
const demo = new URLSearchParams(location.search).has('demo');
type Panel = 'memory' | 'vessel' | 'settings' | 'help' | 'daybed' | 'activity' | 'health-action' | null;
interface MeditationEntry { id: number; command: Extract<GameCommand, { type: 'startTimer' }> }

export default function App() {
  const { state, ready, error, dispatch, addPhoto } = useGame(demo);
  const [now, setNow] = useState(Date.now());
  const [sceneId, setSceneId] = useState<SceneId>('courtyard');
  const [overview, setOverview] = useState(false);
  const [overviewResetKey, setOverviewResetKey] = useState(0);
  const [portal, setPortal] = useState<Portal | null>(null);
  const [deskNear, setDeskNear] = useState(false);
  const [daybedNear, setDaybedNear] = useState(false);
  const [meditationEntry, setMeditationEntry] = useState<MeditationEntry | null>(null);
  const entryRef = useRef<MeditationEntry | null>(null);
  const startingEntry = useRef(false);
  const [panel, setPanel] = useState<Panel>(null);
  const [busy, setBusy] = useState(false);
  const [storyPlaying, setStoryPlaying] = useState(() => sessionStorage.getItem(`yizhaiyiri-story-active:${demo}`) === '1');
  const [vesselTransition, setVesselTransition] = useState(false);
  const enteringVessel = useRef(false);
  const [hasWalked, setHasWalked] = useState(false);
  const [message, setMessage] = useState('');
  const [preview, setPreview] = useState<{ file: File; url: string; activityId: ActivityId } | null>(null);
  const [period, setPeriod] = useState(() => demo ? (localStorage.getItem('yizhaiyiri-demo-period') ?? 'real') : 'real');
  const [openedHealthyCard, setOpenedHealthyCard] = useState<string | null>(null);
  const inputRef = useRef<MovementInput>({ forward: 0, right: 0, turn: 0 });
  const uploadRef = useRef<HTMLInputElement>(null);
  const photoActivityRef = useRef<ActivityId | null>(null);
  const [companionNear, setCompanionNear] = useState(false);
  const [travel, setTravel] = useState<ReturnType<typeof healthyTravel>>();
  const encountered = useRef<string | null>(null);
  const previousActivity = useRef<ActivityId | undefined>(undefined);
  const seenCount = useRef<number | null>(null);

  useEffect(() => { sessionStorage.setItem(`yizhaiyiri-story-active:${demo}`, storyPlaying ? '1' : '0'); }, [storyPlaying]);

  useEffect(() => {
    // A session started in another tab supersedes an unfinished local entry.
    if ((state.session || state.sleep) && entryRef.current && !startingEntry.current) {
      entryRef.current = null;
      setMeditationEntry(null);
    }
  }, [state.session, state.sleep]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(''), 6000);
    return () => clearTimeout(timer);
  }, [message]);
  useEffect(() => {
    if (!ready) return;
    if (seenCount.current !== null && state.memories.length > seenCount.current) {
      const memory = state.memories.at(-1)!;
      if (!memory.activityId) setMessage(`${memory.title} · +${memory.rods} 枚算筹${memory.cardId ? '，来信已收入记忆本' : ''}`);
    }
    seenCount.current = state.memories.length;
  }, [ready, state.memories]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview.url); }, [preview]);
  useEffect(() => {
    if (!overview || panel || preview) return;
    const exitOverview = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOverview(false);
    };
    window.addEventListener('keydown', exitOverview);
    return () => window.removeEventListener('keydown', exitOverview);
  }, [overview, panel, preview]);

  const displayDate = new Date(activityClock(now, demo, period));
  const activity = activityAt(displayDate);
  const atmosphere = estateAtmosphere(displayDate);
  const { night, sunset, kitchenSmoking } = atmosphere;
  const activityDone = !!activity && state.completedActivities.includes(`${localDay(now)}:${activity.id}`);
  const celebration = state.healthyCelebration;
  const outdoorsCard = celebration?.activityId === 'outdoors' && celebration.cardId ? knowledgeCards[celebration.cardId] : undefined;
  const cardDialogue = !!outdoorsCard?.tip && openedHealthyCard !== celebration?.memoryId;
  const availableActivity = activity && !activityDone ? activity : null;
  const healthyId = celebration?.activityId ?? state.session?.activityId ?? activity?.id;
  const healthyScene = healthyId ? companionPlaces[healthyId].sceneId : undefined;
  const occupied = !!state.session || !!state.sleep || !!meditationEntry || !!celebration;
  const focusing = !!state.session || !!meditationEntry;
  const focusView = state.session ? {
    elapsedMs: Math.max(0, state.session.durationMs - remainingTime(state.session, now)),
    petalCycleMs: demo ? 5000 : 5 * 60 * 1000,
    paused: state.session.status === 'paused',
    retreat: state.session.activityId ? undefined : state.session.retreat,
    activityId: state.session.activityId,
  } : meditationEntry ? { elapsedMs: 0, petalCycleMs: 16000, paused: true, retreat: 'daybed' as const, entering: true } : undefined;
  const elfState = healthyId === 'sleep' ? 'sleeping' : healthyId === 'outdoors' ? 'away' : healthyId === 'lunch' || healthyId === 'dinner' ? 'cooking' : 'idle';
  const nearCompanion = useCallback((near: boolean) => setCompanionNear(near), []);
  useEffect(() => {
    const key = availableActivity ? `${localDay(now)}:${availableActivity.id}` : null;
    if (!companionNear) { encountered.current = null; return; }
    if (key && key !== encountered.current && !occupied && !panel && !preview && !overview) {
      encountered.current = key;
      setPanel('health-action');
    }
  }, [companionNear, availableActivity?.id, occupied, panel, !!preview, overview, localDay(now)]);
  useEffect(() => {
    if ((panel === 'activity' || panel === 'health-action') && (!availableActivity || previousActivity.current !== availableActivity.id)) setPanel(null);
    previousActivity.current = availableActivity?.id;
  }, [availableActivity?.id, panel]);
  useEffect(() => {
    if (!celebration) return;
    setPanel(null);
    setOverview(false);
    setPreview(null);
    setSceneId(companionPlaces[celebration.activityId].sceneId);
    if (celebration.cardId) return;
    const timer = setTimeout(() => { void dispatch({ type: 'dismissHealthyCelebration', memoryId: celebration.memoryId }).catch(() => undefined); }, 3600);
    return () => clearTimeout(timer);
  }, [celebration?.memoryId, dispatch]);
  const recordWalk = useCallback((position: [number, number, number]) => { if (Math.hypot(position[0], position[2] - 7) > .6) setHasWalked(true); }, []);
  const nearPortal = useCallback((next: Portal | null) => setPortal(next), []);
  const nearDesk = useCallback((near: boolean) => setDeskNear(near), []);
  const nearDaybed = useCallback((near: boolean) => setDaybedNear(near), []);
  const controlsBlocked = !!panel || !!preview || occupied || vesselTransition;
  const touchVessel = useCallback(() => {
    if (deskNear && !controlsBlocked && !overview && !busy) setPanel('vessel');
  }, [deskNear, controlsBlocked, overview, busy]);
  const command = useCallback(async (action: GameCommand) => {
    setBusy(true);
    try { await dispatch(action); return true; }
    catch (reason) { setMessage(reason instanceof Error ? reason.message : '这次操作没有保存，请再试一次。'); return false; }
    finally { setBusy(false); }
  }, [dispatch]);
  const finishVesselTransition = useCallback(async () => {
    const entered = await command({ type: 'startStory' });
    setVesselTransition(false);
    if (entered) setStoryPlaying(true);
    enteringVessel.current = false;
  }, [command]);
  function prepareMeditation() {
    if (!daybedNear || occupied || entryRef.current || busy) return;
    const action: MeditationEntry['command'] = {
      type: 'startTimer', mode: 'focus', retreat: 'daybed',
      durationMs: demo ? 10000 : FOCUS_MS,
    };
    const entry = { id: Date.now(), command: action };
    entryRef.current = entry;
    startingEntry.current = false;
    setMeditationEntry(entry);
    setOverview(false);
    setSceneId('courtyard');
    setPanel(null);
  }
  const finishMeditationEntry = useCallback(async () => {
    const entry = entryRef.current;
    if (!entry || startingEntry.current) return;
    startingEntry.current = true;
    await command(entry.command);
    if (entryRef.current?.id === entry.id) {
      entryRef.current = null;
      setMeditationEntry(null);
      setNow(Date.now());
    }
    startingEntry.current = false;
  }, [command]);
  async function startActivity() {
    if (!availableActivity || occupied || busy || (availableActivity.id !== 'outdoors' && !companionNear)) return;
    if (await command({ type: 'startTimer', mode: 'focus', durationMs: demo ? 10000 : FOCUS_MS, activityId: availableActivity.id })) {
      setSceneId(availableActivity.scene);
      setOverview(false);
      setPanel(null);
      setNow(Date.now());
    }
  }
  function guideToCompanion() {
    if (!availableActivity || occupied) return;
    if (availableActivity.id === 'outdoors') { setPanel('health-action'); return; }
    setCompanionNear(false);
    encountered.current = null;
    setSceneId(availableActivity.scene);
    setTravel(healthyTravel(availableActivity.id, Date.now()));
    setOverview(false);
    setPanel(null);
  }
  function choosePhoto() {
    if (!availableActivity || occupied || (availableActivity.id !== 'outdoors' && !companionNear)) return;
    photoActivityRef.current = availableActivity.id;
    setPanel(null);
    uploadRef.current?.click();
  }
  async function submitPhoto() {
    if (!preview) return;
    setBusy(true);
    try {
      if (healthyActivityAt(activityClock(Date.now(), demo, period)) !== preview.activityId) throw new Error('这段时辰已经过去，等下一次与银钩相约吧。');
      const photoId = await addPhoto(preview.file);
      await dispatch({ type: 'completePhoto', activityId: preview.activityId, photoId });
      setPreview(null);
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : '照片没有保存，请再试一次。'); }
    finally { setBusy(false); }
  }
  function enterVessel() {
    if (enteringVessel.current || occupied || !deskNear || state.rods < ADVENTURE_COST) return;
    enteringVessel.current = true;
    setPanel(null); setMessage(''); setVesselTransition(true);
  }
  function enterPortal() {
    if (!portal || controlsBlocked) return;
    setSceneId(portal.target); setPortal(null); setDeskNear(false); setDaybedNear(false);
  }
  const switchDemo = () => {
    const url = new URL(location.href);
    if (demo) url.searchParams.delete('demo'); else url.searchParams.set('demo', '1');
    location.href = url.toString();
  };
  async function prepareOutdoorsDemo() {
    if (!demo || occupied || busy) return;
    if (await command({ type: 'demoOutdoors' })) {
      localStorage.setItem('yizhaiyiri-demo-period', '16');
      setPeriod('16');
      setSceneId('courtyard');
      setTravel(healthyTravel('outdoors', Date.now()));
      setCompanionNear(false);
      setDeskNear(false);
      setDaybedNear(false);
      setPortal(null);
      encountered.current = null;
      setOverview(false);
      setPanel(null);
    }
  }
  const viewingOverview = overview && !occupied && !vesselTransition;
  const renderedSceneId: SceneId = viewingOverview ? 'courtyard' : healthyScene && (state.session?.activityId || celebration) ? healthyScene : meditationEntry || state.session?.retreat ? 'courtyard' : sceneId;
  if (!ready) return <div className="boot-screen"><span className="brand-seal">宅</span><p>打开今日的庭院…</p></div>;
  if (storyPlaying && state.story) return <Suspense fallback={<div className="boot-screen">随祥云入境…</div>}>
    <StoryScreen atmosphere={atmosphere} story={state.story} onAdvance={nodeId => dispatch({ type: 'advanceStory', nodeId })} onInspect={(nodeId, flagId) => dispatch({ type: 'inspectStory', nodeId, flagId })} onClose={() => setStoryPlaying(false)}/>
  </Suspense>;

  return <main className={`estate ${night ? 'night' : ''} ${focusing ? 'is-focusing' : ''}`} data-testid="estate" data-mode={meditationEntry && !state.session ? 'settling' : focusing ? 'focus' : viewingOverview ? 'overview' : 'walk'}>
    <section className="estate-world" aria-label={viewingOverview ? '宅院全景鸟瞰' : `${SCENE_NAMES[renderedSceneId]}第一人称场景`}>
      <Suspense fallback={<div className="scene-loading">庭院正在展开…</div>}>
        <SceneCanvas sceneId={renderedSceneId} overview={viewingOverview} overviewResetKey={overviewResetKey} elfState={elfState} night={night} sunset={sunset} kitchenSmoking={kitchenSmoking} healthActivityId={healthyId} celebrating={!!celebration} companionSpeaking={!!outdoorsCard?.tip} travel={travel} onCompanionNear={nearCompanion} blocked={controlsBlocked} inputRef={inputRef} onPortalNear={nearPortal} onDeskNear={nearDesk} onDaybedNear={nearDaybed} onFocusReady={finishMeditationEntry} onPosition={recordWalk} focusView={focusView} rods={state.rods} onVesselTouch={touchVessel} vesselTransition={vesselTransition} onVesselTransitionComplete={finishVesselTransition}/>
      </Suspense>
    </section>

    {!focusing && !state.sleep && !vesselTransition && !celebration ? <>
      <header className="estate-header">
        <div className="estate-title"><span>一宅一日</span><small>{displayDate.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })}</small></div>
        <nav className="estate-nav" aria-label="宅院记录">
          <button className="view-toggle" data-testid="overview-toggle" aria-label={viewingOverview ? '返回行走视角' : '切换到全院鸟瞰'} aria-pressed={viewingOverview} disabled={controlsBlocked} onClick={() => setOverview(value => !value)}>{viewingOverview ? <Footprints size={18}/> : <Expand size={18}/>}<span>{viewingOverview ? '返回行走' : '全院鸟瞰'}</span></button>
          <button aria-label="记忆本" onClick={() => setPanel('memory')}><BookOpen size={18}/><span>记忆本</span></button>
        </nav>
      </header>
      {!panel && !preview && !viewingOverview ? <>
        {daybedNear || deskNear || (companionNear && availableActivity) ? <div className="study-prompts">
          {companionNear && availableActivity ? <button className="world-prompt" data-testid="companion-prompt" onClick={() => setPanel('health-action')}>与银钩相伴</button> : null}
          {daybedNear ? <button className="world-prompt" data-testid="daybed-prompt" onClick={() => setPanel('daybed')}><Feather size={16}/>在榻上打坐</button> : null}
          {deskNear ? <button className="world-prompt" data-testid="vessel-touch" onClick={touchVessel}><Cylinder size={18}/>触碰金银筒</button> : null}
        </div> : portal ? <button className="world-prompt" data-testid="portal-prompt" onClick={enterPortal}><DoorOpen size={18}/>{portal.label}</button> : null}
        <div className="estate-bottom-left">
          <button className={`daily-note ${availableActivity ? 'has-task' : ''}`} data-testid="healthy-task-label" disabled={!availableActivity || occupied} onClick={() => setPanel('activity')}><SilverHookIcon/><span>{availableActivity ? availableActivity.title : '闲时'}</span></button>
        </div>
      </> : null}
      {!panel && !preview && !viewingOverview ? <>{!hasWalked ? <div className="walk-guide"><span className="desktop-guide">WASD / 方向键行走 · 空格跳跃 · Shift 加速前进 · 拖动画面环顾</span><span className="mobile-guide">滑动画面环顾</span></div> : null}</> : null}
      {viewingOverview && !panel && !preview ? <div className="overview-toolbar" data-testid="overview-toolbar"><div><span className="overview-label">全院鸟瞰</span><p className="desktop-guide">拖动旋转 · 滚轮缩放 · 右键平移 · Esc 返回</p><p className="mobile-guide">单指旋转 · 双指缩放与平移</p></div><button type="button" aria-label="复位鸟瞰视角" title="复位视角" onClick={() => setOverviewResetKey(value => value + 1)}><RotateCcw size={17}/><span>复位</span></button></div> : null}
      <div className="estate-tools"><button onClick={() => setPanel('help')} aria-label="玩法说明"><HelpCircle size={17}/></button><button onClick={() => setPanel('settings')} aria-label="设置与演示"><Settings2 size={17}/></button></div>
    </> : null}

    {vesselTransition ? <div className="vessel-transition-veil" data-testid="vessel-transition" role="status"><span className="visually-hidden">祥云正带你进入冒险…</span></div> : null}

    {state.session ? <FocusRetreat key={state.session.id} session={state.session} now={now} busy={busy} onPause={() => void command({ type: 'pauseTimer' })} onResume={() => void command({ type: 'resumeTimer' })} onCancel={() => void command({ type: 'cancelTimer' })}/> : null}
    {meditationEntry && !state.session ? <div className="focus-retreat meditation-arriving" data-testid="meditation-arriving"><div className="quiet-clock"><span role="status">缓缓入座…</span></div></div> : null}
    {celebration && !celebration.cardId ? <div className="healthy-celebration" role="status" data-testid="healthy-celebration"><span className="visually-hidden">银钩正雀跃着</span></div> : null}
    {celebration?.cardId ? <Modal title={cardDialogue ? '银钩' : '银钩的知识卡片'} className={cardDialogue ? 'healthy-card-dialogue-modal' : 'healthy-card-modal'} showClose={false} onClose={() => void command({ type: 'dismissHealthyCelebration', memoryId: celebration.memoryId })}>
      {cardDialogue ? <section className="healthy-card-dialogue" data-testid="healthy-card-dialogue" data-card-id={celebration.cardId}>
        <p>{outdoorsCard!.tip}</p>
        <button className="healthy-destination" onClick={() => setOpenedHealthyCard(celebration.memoryId)}>进入详情</button>
      </section> : <HealthyKnowledge cardId={celebration.cardId} onClose={() => void command({ type: 'dismissHealthyCelebration', memoryId: celebration.memoryId })}/>}
    </Modal> : null}

    <input ref={uploadRef} hidden type="file" accept="image/*" aria-label="上传生活照片" onChange={event => {
      const file = event.target.files?.[0];
      if (file && !file.type.startsWith('image/')) { setMessage('请选择图片文件。'); event.target.value = ''; return; }
      if (file && photoActivityRef.current) setPreview({ file, url: URL.createObjectURL(file), activityId: photoActivityRef.current });
      event.target.value = '';
    }}/>
    {(message && !focusing) || error ? <div className="toast" role="status"><Check size={17}/><span>{error || message}</span><button onClick={() => setMessage('')} aria-label="关闭提示"><X size={15}/></button></div> : null}
    {panel === 'daybed' ? <Modal title="床榻打坐" onClose={() => setPanel(null)}><MeditationInvitation demo={demo} busy={busy} onStart={() => prepareMeditation()} onClose={() => setPanel(null)}/></Modal> : null}
    {(panel === 'activity' || panel === 'health-action') && availableActivity ? <Modal title={panel === 'activity' ? '银钩的字条' : '与银钩相伴'} className="healthy-modal" showClose={false} onClose={() => setPanel(null)}><ActivityPanel activity={availableActivity} stage={panel === 'activity' ? 'guide' : 'action'} disabled={busy || occupied} onBegin={() => void startActivity()} onPhoto={choosePhoto} onGuide={guideToCompanion} onClose={() => setPanel(null)}/></Modal> : null}
    {panel === 'memory' ? <Modal title="记忆本" wide className="memory-modal" onClose={() => setPanel(null)}><MemoryBook memories={state.memories} demo={demo} chapterVisits={state.story?.chapterVisits}/></Modal> : null}
    {panel === 'vessel' ? <Modal title="金银筒" className="vessel-modal" showClose={false} onClose={() => !busy && setPanel(null)}><VesselInvitation rods={state.rods} busy={busy} onEnter={() => void enterVessel()} onReturn={() => setPanel(null)}/></Modal> : null}
    {panel === 'help' ? <Modal title="玩法说明" onClose={() => setPanel(null)}><HelpPanel onClose={() => setPanel(null)}/></Modal> : null}
    {panel === 'settings' ? <Modal title="设置与演示" onClose={() => setPanel(null)}><SettingsPanel demo={demo} period={period} busy={busy} onSwitchDemo={switchDemo} onPeriodChange={value => { setPeriod(value); localStorage.setItem('yizhaiyiri-demo-period', value); }} onSetDemoRods={() => void command({ type: 'demoRods' })} outdoorsDemoBlocked={occupied} onDemoOutdoors={prepareOutdoorsDemo}/></Modal> : null}
    {preview ? <Modal title="留住这一刻" onClose={() => !busy && setPreview(null)}><PhotoPreview url={preview.url} busy={busy} onSubmit={() => void submitPhoto()}/></Modal> : null}
  </main>;
}
