import { useEffect, useState } from 'react';
import { MoreHorizontal, Pause, Play, Square } from 'lucide-react';
import type { TimerSession } from '../game/types';
import { remainingTime } from '../game/engine';

/** A quiet corner of the scene, with controls revealed only when requested. */
export function FocusRetreat({ session, now, busy, onPause, onResume, onCancel }: {
  session: TimerSession; now: number; busy: boolean;
  onPause: () => void; onResume: () => void; onCancel: () => void;
}) {
  const [controlsOpen, setControlsOpen] = useState(false);
  const seconds = Math.ceil(Math.min(session.durationMs, remainingTime(session, now)) / 1000);
  const label = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  const paused = session.status === 'paused';
  const practice = session.activityId ? '专注' : '打坐';

  useEffect(() => {
    function keydown(event: KeyboardEvent) {
      if (event.key === 'Escape') setControlsOpen(open => !open);
    }
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, []);

  return <div className={`focus-retreat ${controlsOpen ? 'controls-open' : ''}`} data-testid="focus-retreat" data-focus-state={session.status}>
    <div className="quiet-clock">
      <span className="quiet-clock-label">{paused ? '暂歇' : practice}</span>
      <span role="timer" aria-label={`剩余 ${label}`}>{label}</span>
      <button aria-label={`${practice}操作`} aria-expanded={controlsOpen} onClick={() => setControlsOpen(open => !open)}><MoreHorizontal size={18}/></button>
    </div>
    {controlsOpen ? <div className="retreat-actions">
      <button disabled={busy} onClick={() => { paused ? onResume() : onPause(); }}>
        {paused ? <Play size={14}/> : <Pause size={14}/>}{paused ? `继续${practice}` : `暂停${practice}`}
      </button>
      <button disabled={busy} onClick={onCancel}><Square size={13}/>结束本次{practice}</button>
      <small>提前结束不计奖励</small>
    </div> : null}
  </div>;
}

export function MeditationInvitation({ demo, busy, onStart, onClose }: {
  demo: boolean; busy: boolean; onStart: () => void; onClose: () => void;
}) {
  return <div className="prose-panel study-invitation">
    <span className="study-character" aria-hidden="true">静</span>
    <h2>在书阁，留一段清静。</h2>
    <p>在榻上打坐，看庭院花木随风轻动。<br/>接下来的三十分钟，留给眼前的一件事。</p>
    <button className="primary full" disabled={busy} onClick={onStart}>开始打坐{demo ? ' · 10 秒演示' : ' · 30 分钟'}</button>
    <div className="study-other-actions"><button className="text-button" onClick={onClose}>再逛一会儿</button></div>
  </div>;
}
