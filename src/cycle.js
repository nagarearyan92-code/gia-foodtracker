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

export const DEFAULT_CYCLE = { days: {}, cycleLen: 28, periodLen: 5, remind: true, open: null };

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
  const periods = withOpen(cycle, st.periods.map(p => ({ ...p })), t);
  const last = periods[periods.length - 1];
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

// ---- Logging periods as ranges (start → end), instead of tapping every day ----
const MAX_PERIOD = 10;
const noon = d => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12);
export const todayNoon = () => noon(new Date());

// While a period is "still going", count it as running up to today.
function withOpen(cycle, periods, today = todayNoon()) {
  if (!cycle.open) return periods;
  const s = toDate(cycle.open);
  const age = daysBetween(s, today);
  if (age < 0 || age >= MAX_PERIOD) return periods;
  const p = periods.find(x => dateKey(x.start) === cycle.open);
  if (p) { if (today > p.end) p.end = today; return periods; }
  return [...periods, { start: s, end: today }].sort((a, b) => a.start - b.start);
}

export function periodAt(cycle, d) {
  const t = noon(d);
  return withOpen(cycle, findPeriods(cycle.days)).find(p => t >= p.start && t <= p.end) || null;
}

// Marks every day from start to end as a period day (keeps any symptoms/notes already there).
export function fillPeriod(cycle, start, end, flow = 'medium') {
  const days = { ...cycle.days };
  for (let d = noon(start); d <= noon(end); d = addDays(d, 1)) {
    const k = dateKey(d);
    const rec = days[k] || {};
    if (!rec.flow || rec.flow === 'spotting') days[k] = { ...rec, flow };
  }
  return { ...cycle, days };
}

// Removes period flow from a range of days (symptoms and notes stay).
export function clearPeriodDays(cycle, start, end) {
  const days = { ...cycle.days };
  for (let d = noon(start); d <= noon(end); d = addDays(d, 1)) {
    const k = dateKey(d);
    if (!days[k]?.flow) continue;
    const { flow, ...rest } = days[k]; // eslint-disable-line no-unused-vars
    if ((rest.symptoms && rest.symptoms.length) || rest.note) days[k] = rest; else delete days[k];
  }
  return { ...cycle, days };
}

// Her period started on `start` and is still going: mark the start and remember it's open.
export function startPeriod(cycle, start) {
  return { ...fillPeriod(cycle, start, start), open: dateKey(noon(start)) };
}
// Still going today: fill in the days since it started.
export function periodStillOn(cycle, today = todayNoon()) {
  if (!cycle.open) return cycle;
  return { ...fillPeriod(cycle, toDate(cycle.open), today), open: cycle.open };
}
// It ended on `end`: fill start..end, clear anything after, close it.
export function endPeriod(cycle, start, end, today = todayNoon()) {
  let c = fillPeriod(cycle, start, end);
  const after = addDays(noon(end), 1);
  const limit = addDays(noon(start), MAX_PERIOD + 2);
  if (after <= limit) c = clearPeriodDays(c, after, limit < today ? limit : today);
  return { ...c, open: null };
}
// The open period, if any. Periods left open too long are closed using her usual length.
export function openPeriodInfo(cycle, today = todayNoon()) {
  if (!cycle.open) return null;
  const start = toDate(cycle.open);
  const day = daysBetween(start, today) + 1;
  if (day < 1) return null;
  if (day > MAX_PERIOD) return { stale: true, start, closed: endPeriod(cycle, start, addDays(start, (stats(cycle).periodLen || 5) - 1), today) };
  return { start, day };
}
export function removePeriod(cycle, p) {
  const c = clearPeriodDays(cycle, p.start, p.end);
  return cycle.open && toDate(cycle.open) >= p.start && toDate(cycle.open) <= p.end ? { ...c, open: null } : c;
}

// Per-day calendar marking for a month view: 'period' | 'spotting' | 'predicted' | 'fertile' | 'ovulation' | null
export function dayKind(cycle, pred, d) {
  const rec = cycle.days[dateKey(d)];
  if (cycle.open && !rec?.flow) {
    const s = toDate(cycle.open), t = todayNoon();
    if (d >= s && d <= t && daysBetween(s, t) < MAX_PERIOD) return 'period';
  }
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
