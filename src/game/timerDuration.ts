import { FOCUS_DURATION_MS, MEDITATION_DURATION_MS } from './engine';
import type { GameCommand } from './types';

export function timerDuration(command: Extract<GameCommand, { type: 'startTimer' }>, demo: boolean) {
  // Sitting on the daybed changes presentation, not the desk timer's rules.
  return demo ? command.durationMs : command.mode === 'focus' ? FOCUS_DURATION_MS : MEDITATION_DURATION_MS;
}
