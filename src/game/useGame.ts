import { useCallback, useEffect, useRef, useState } from 'react';
import { createInitialState, reduceGame, FOCUS_DURATION_MS } from './engine';
import { activityClock } from './healthSchedule';
import { timerDuration } from './timerDuration';
import { loadGame, saveGame, savePhoto, storageKey, withGameLock } from './storage';
import type { GameCommand, GameState } from './types';

export function useGame(demo: boolean) {
  const [state, setState] = useState<GameState>(createInitialState);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stateRef = useRef(state);
  const serializedRef = useRef('');

  const acceptState = useCallback((next: GameState) => {
    const serialized = JSON.stringify(next);
    stateRef.current = next;
    if (serializedRef.current !== serialized) {
      serializedRef.current = serialized;
      setState(next);
    }
  }, []);

  const dispatch = useCallback(async (command: GameCommand) => {
    try {
      if (!demo && (command.type === 'demoRods' || command.type === 'demoOutdoors')) throw new Error('演示操作只能在演示模式中使用。');
      // Daybed sitting and life tasks share the original desk timer durations.
      let action = command;
      if (!demo && command.type === 'beginSleep') action = { ...command, durationMs: FOCUS_DURATION_MS };
      if (command.type === 'startTimer') {
        action = { ...command, durationMs: timerDuration(command, demo) };
      }
      await withGameLock(demo, () => {
        const previous = loadGame(demo);
        const now = Date.now();
        const next = reduceGame(previous, action, now, activityClock(now, demo, localStorage.getItem('yizhaiyiri-demo-period') ?? 'real'));
        if (next !== previous) saveGame(next, demo);
        acceptState(next);
      });
      setError(null);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : '保存没有完成，请重试。';
      setError(message);
      throw reason;
    }
  }, [demo, acceptState]);

  useEffect(() => {
    setReady(false);
    let mounted = true;
    const reconcileReturn = () => {
      if (document.visibilityState === 'hidden') return;
      void dispatch({ type: 'reconcile', includeSleep: true }).catch(() => undefined);
    };
    const prepareAdventure = demo && new URLSearchParams(location.search).get('setup') === 'adventure';
    void dispatch({ type: 'reconcile', includeSleep: true })
      .then(async () => {
        if (prepareAdventure) {
          await dispatch({ type: 'demoRods' });
          const url = new URL(location.href);
          url.searchParams.delete('setup');
          history.replaceState(history.state, '', url);
        }
      })
      .catch(() => undefined).finally(() => { if (mounted) setReady(true); });
    const timer = window.setInterval(() => {
      if (stateRef.current.session?.status === 'running') {
        void dispatch({ type: 'reconcile' }).catch(() => undefined);
      }
    }, 1000);
    const storageChanged = (event: StorageEvent) => {
      if (event.key === storageKey(demo)) {
        try { acceptState(loadGame(demo)); }
        catch (reason) { setError(reason instanceof Error ? reason.message : '读取存档失败。'); }
      }
    };
    window.addEventListener('storage', storageChanged);
    window.addEventListener('focus', reconcileReturn);
    document.addEventListener('visibilitychange', reconcileReturn);
    return () => {
      mounted = false;
      window.clearInterval(timer);
      window.removeEventListener('storage', storageChanged);
      window.removeEventListener('focus', reconcileReturn);
      document.removeEventListener('visibilitychange', reconcileReturn);
    };
  }, [demo, dispatch, acceptState]);

  const addPhoto = useCallback(async (file: File): Promise<string> => {
    try { return await savePhoto(file, demo); }
    catch (reason) {
      setError(reason instanceof Error ? reason.message : '照片保存失败。');
      throw reason;
    }
  }, [demo]);

  return { state, ready, error, dispatch, addPhoto };
}
