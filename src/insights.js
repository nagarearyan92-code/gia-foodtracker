// Simple patterns from her own check-ins over the last 60 days.
import { dateKey } from './store';
import { daysBetween, findPeriods } from './cycle';

const avg = a => a.reduce((x, y) => x + y, 0) / a.length;
const f1 = n => Math.round(n * 10) / 10;

// 'period' | 'pre' (5 days before a logged period) | 'other' | null (unknown)
function phaseOf(d, periods) {
  for (let i = 0; i < periods.length; i++) {
    const p = periods[i];
    if (d >= p.start && d <= p.end) return 'period';
    const until = daysBetween(d, p.start);
    if (until > 0 && until <= 5) return 'pre';
  }
  return periods.length >= 2 ? 'other' : null;
}

export function buildInsights(checkins, cycle, goals, today = new Date()) {
  const days = [];
  for (let i = 0; i < 60; i++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i, 12);
    const c = checkins[dateKey(d)];
    if (c && c.mood) days.push({ d, c });
  }
  if (days.length < 10) return [];
  const out = [];
  const periods = findPeriods(cycle?.days || {});

  // Sleep vs mood
  const good = days.filter(x => x.c.sleepH >= 7).map(x => x.c.mood);
  const short = days.filter(x => x.c.sleepH && x.c.sleepH < 7).map(x => x.c.mood);
  if (good.length >= 3 && short.length >= 3) {
    const a = avg(good), b = avg(short);
    if (a - b >= 0.4) out.push(`On days after 7+ hours' sleep, your mood averages ${f1(a)}/5, compared with ${f1(b)}/5 after less sleep.`);
    else if (Math.abs(a - b) < 0.4) out.push('Your mood looks about the same whether you sleep more or less than 7 hours.');
  }

  // Cycle vs mood and energy
  if (periods.length >= 2) {
    const by = { period: [], pre: [], other: [] };
    const lowEnergy = { period: [0, 0], pre: [0, 0], other: [0, 0] };
    days.forEach(x => {
      const ph = phaseOf(x.d, periods);
      if (!ph) return;
      by[ph].push(x.c.mood);
      if (x.c.energy) { lowEnergy[ph][1]++; if (x.c.energy === 'low') lowEnergy[ph][0]++; }
    });
    if (by.pre.length >= 3 && by.other.length >= 3 && avg(by.other) - avg(by.pre) >= 0.4) {
      out.push(`Your mood tends to dip in the 5 days before your period (${f1(avg(by.pre))}/5 vs ${f1(avg(by.other))}/5 otherwise). That's very common, and it passes.`);
    }
    const share = ([lo, n]) => (n ? lo / n : null);
    const pe = share(lowEnergy.period), ot = share(lowEnergy.other);
    if (lowEnergy.period[1] >= 3 && lowEnergy.other[1] >= 3 && pe - ot >= 0.25) {
      out.push(`You report low energy on ${Math.round(pe * 100)}% of period days vs ${Math.round(ot * 100)}% of other days. Iron-rich meals and rest help then.`);
    }
  }

  // Sleep quality
  const poor = days.filter(x => x.c.sleepQ === 'poor').map(x => x.c.mood);
  const well = days.filter(x => x.c.sleepQ === 'good').map(x => x.c.mood);
  if (poor.length >= 3 && well.length >= 3 && avg(well) - avg(poor) >= 0.5) {
    out.push(`Sleep quality matters for you: mood ${f1(avg(well))}/5 after a good night vs ${f1(avg(poor))}/5 after a bad one.`);
  }

  // Common feelings
  const counts = {};
  days.forEach(x => (x.c.tags || []).forEach(t => { counts[t] = (counts[t] || 0) + 1; }));
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  if (top && top[1] >= 4) out.push(`"${top[0]}" is the feeling you've tagged most (${top[1]} times in the last two months).`);

  const avgSleep = days.filter(x => x.c.sleepH).map(x => x.c.sleepH);
  if (avgSleep.length >= 7) out.push(`You average ${f1(avg(avgSleep))} hours of sleep on nights you've logged.`);
  return out;
}
