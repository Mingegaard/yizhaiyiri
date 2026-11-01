import { HEALTH_WINDOWS } from '../game/healthSchedule';

export interface EstateAtmosphere {
  mode: 'day' | 'sunset' | 'night';
  night: boolean;
  sunset: boolean;
  kitchenSmoking: boolean;
}

/** Environment follows the local/demo clock, independently of task or saved UI state. */
export function estateAtmosphere(date: Date): EstateAtmosphere {
  const minute = date.getHours() * 60 + date.getMinutes();
  const [eveningStart, eveningEnd] = HEALTH_WINDOWS.dinner;
  const sunset = minute >= eveningStart && minute < eveningEnd;
  const night = minute >= eveningEnd || minute < 6 * 60;
  const kitchenSmoking = [HEALTH_WINDOWS.lunch, HEALTH_WINDOWS.dinner]
    .some(([start, end]) => minute >= start && minute < end);
  return { mode: night ? 'night' : sunset ? 'sunset' : 'day', night, sunset, kitchenSmoking };
}
