// Period tracking: pure date maths plus storage. Everything stays on the phone.
import { dateKey, diaryChanged, readSetting, writeSetting } from './store';

export const FLOWS = [
  { key: 'spotting', label: 'Spotting' },
  { key: 'light', label: 'Light' },
  { key: 'medium', label: 'Medium' },
  { key: 'heavy', label: 'Heavy' },
];

export const SYMPTOMS = [
  'Cramps', 'Bloating', 'Cravings', 'Headache', 'Tired', 'Back pain', 'Tender breasts',
  'Acne', 'Low mood', 'Anxious', 'Irritable', 'Happy', 'Energetic', 'Can\'t sleep',
];

export const DEFAULT_CYCLE = { days: {}, cycleLen: 28, periodLen: 5, remind: true };

const DAY = 864e5;
export const toDate = key => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d, 12); };
export const addDays = (d, n) => new Date(d.getTime() + n * DAY);
export const daysBetween = (a, b) => Math.round((b - a) / DAY);

export async function loadCycle() {
  const c = await readSetting('cycle', DEFAULT_CYCLE);
  return { ...DEFAULT_CYCLE, ...c, days: c.days || {} };
}
export async function saveCycle(c) {
  await writeSetting('cycle', c);
  diaryChanged(); // re-plans reminders
}

// Period = run of days with flow (spotting alone doesn't start a period). Gaps of up to 2 days are joined.
export function findPeriods(days) {
  const keys = Object.keys(days).filter(k => days[k].flow && days[k].flow !== 'spotting').sort();
  const periods = [];
  for (const k of keys) {
    const d = toDate(k);
    const last = periods[periods.length - 1];
    if (last && daysBetween(last.end, d) <= 2) last.end = d;
    else periods.push({ start: d, end: d });
  }
  return periods;
}

// Averages from her own history, falling back to her settings.
export function stats(cycle) {
  const periods = findPeriods(cycle.days);
  const lens = [];
  for (let i = 1; i < periods.length; i++) {
    const l = daysBetween(periods[i - 1].start, periods[i].start);
    if (l >= 18 && l <= 60) lens.push(l);
  }
  const recent = lens.slice(-6);
  const cycleLen = recent.length ? Math.round(recent.reduce((a, b) => a + b, 0) / recent.length) : cycle.cycleLen;
  const pl = periods.slice(-6).map(p => daysBetween(p.start, p.end) + 1).filter(x => x >= 2 && x <= 10);
  const periodLen = pl.length ? Math.round(pl.reduce((a, b) => a + b, 0) / pl.length) : cycle.periodLen;
  return { periods, cycleLen, periodLen, fromHistory: recent.length > 0, cycles: recent };
}

// Where she is today and what's coming up.
export function predict(cycle, today = new Date()) {
  const st = stats(cycle);
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12);
  const last = st.periods[st.periods.length - 1];
  if (!last) return { ...st, hasData: false };
  const expected = addDays(last.start, st.cycleLen);
  const late = Math.max(0, daysBetween(expected, t));
  // If she's late, show the next period as "any day now" (tomorrow) rather than in the past.
  const nextStart = late > 0 ? addDays(t, 1) : expected;
  const cycleDay = daysBetween(last.start, t) + 1;
  const ovulation = addDays(expected, -14);
  const fertileStart = addDays(ovulation, -5);
  const fertileEnd = addDays(ovulation, 1);
  let phase;
  if (cycleDay >= 1 && (t <= last.end || (daysBetween(last.end, t) <= 1 && cycleDay <= st.periodLen))) phase = 'period';
  else if (t >= fertileStart && t <= fertileEnd) phase = 'fertile';
  else if (t < fertileStart) phase = 'follicular';
  else phase = 'luteal';
  return {
    ...st, hasData: true, lastStart: last.start, lastEnd: last.end, expected, nextStart, late,
    daysToNext: daysBetween(t, nextStart), cycleDay, ovulation, fertileStart, fertileEnd, phase,
  };
}

// Per-day calendar marking for a month view: 'period' | 'spotting' | 'predicted' | 'fertile' | 'ovulation' | null
export function dayKind(cycle, pred, d) {
  const rec = cycle.days[dateKey(d)];
  if (rec?.flow && rec.flow !== 'spotting') return 'period';
  if (rec?.flow === 'spotting') return 'spotting';
  if (!pred.hasData) return null;
  const now = new Date();
  for (let i = 0; i < 4; i++) {
    const start = i === 0 ? pred.nextStart : addDays(pred.expected, i * pred.cycleLen);
    const diff = daysBetween(start, d);
    if (d > now && diff >= 0 && diff < pred.periodLen) return 'predicted';
    const ov = addDays(addDays(pred.lastStart, (i + 1) * pred.cycleLen), -14);
    const f = daysBetween(ov, d);
    if (f >= -5 && f <= 1 && d >= pred.lastStart) return f === 0 ? 'ovulation' : 'fertile';
  }
  return null;
}

export const PHASES = {
  period: { label: 'Period', color: '#C2456F', tip: 'Iron helps right now: lentils, spinach, kala chana, pumpkin seeds. Cravings and a little water weight are completely normal this week, so go easy on yourself and the scale.' },
  follicular: { label: 'Follicular phase', color: '#2E7D4F', tip: 'Energy often picks up after your period. A good time for workouts you enjoy.' },
  fertile: { label: 'Fertile window', color: '#7B5CB8', tip: 'Estimated fertile days around ovulation. This is an estimate and not a form of contraception.' },
  luteal: { label: 'Luteal phase', color: '#B9801A', tip: 'Appetite can rise a little before your period. Protein and fibre help keep you full; a bit of extra hunger is normal.' },
};
