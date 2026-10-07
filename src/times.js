// Times of day stored as "HH:MM" (24h) on diary entries and supplement logs.
import { dateKey } from './store';

const pad = n => String(n).padStart(2, '0');
export const toMin = hm => { const [h, m] = String(hm || '0:0').split(':').map(Number); return (h || 0) * 60 + (m || 0); };
export const fromMin = m => { const x = ((Math.round(m) % 1440) + 1440) % 1440; return `${pad(Math.floor(x / 60))}:${pad(x % 60)}`; };
export const nowHM = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
export const shiftHM = (hm, mins) => fromMin(toMin(hm) + mins);

// "13:05" -> "1:05 pm"
export function fmtHM(hm) {
  if (!hm) return '';
  const m = toMin(hm), h = Math.floor(m / 60), mm = m % 60;
  return `${((h + 11) % 12) + 1}:${pad(mm)} ${h < 12 ? 'am' : 'pm'}`;
}

const MEAL_TIME = { Breakfast: '08:30', Lunch: '13:00', Dinner: '19:30', Snacks: '16:00' };
// Logging for today: the time now. For another day: a sensible time for that meal.
export function defaultTime(dayKey, meal) {
  return dayKey === dateKey(new Date()) ? nowHM() : MEAL_TIME[meal] || '12:00';
}

// Average of clock times, e.g. for "usual breakfast time".
export function averageHM(list) {
  const mins = list.filter(Boolean).map(toMin);
  if (!mins.length) return null;
  return fromMin(mins.reduce((a, b) => a + b, 0) / mins.length);
}
