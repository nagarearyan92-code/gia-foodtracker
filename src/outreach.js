// Miss Curious Bae reaching out first:
//  - Sunday recap: a warm look back at her week (Sundays from 7 pm).
//  - Low-day follow-up: the morning after a "Low" or "Awful" check-in, she asks how Gia is today.
// The phone schedules a notification (reminders.js). The message itself is written when the app is
// next open (on tapping the notification, or just opening the app), so it's always up to date and
// doesn't rely on Android running anything in the background. It lands in the 🌸 chat.
import { Platform } from 'react-native';
import { DEFAULT_GOALS, dateKey, loadDays, readSetting, sumNutrients, writeSetting } from './store';
import { ENERGY, MOODS, loadCheckins, loadSuppLog, loadSupps } from './wellbeing';
import { loadCycle, predict, PHASES } from './cycle';
import { askOutreach } from './ai';

export const OUTREACH_DEFAULTS = { recap: true, followUp: true };
export const RECAP_HOUR = 19;     // Sunday 7 pm
export const FOLLOW_HOUR = 9;     // 9:30 am the next morning
export const FOLLOW_MIN = 30;

export async function getOutreach() {
  return { ...OUTREACH_DEFAULTS, ...(await readSetting('baeOutreach', {})) };
}

const label = v => MOODS.find(m => m.v === v)?.label || '';

// Sunday of the week a date is in, as a key (the recap for that week).
function lastSunday(now) {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay(), RECAP_HOUR, 0, 0);
  return d;
}

// What's due right now and not yet delivered.
export async function dueOutreach(now = new Date()) {
  const set = await getOutreach();
  const done = await readSetting('baeDelivered', {});
  const out = [];
  if (set.recap) {
    const sun = lastSunday(now);
    const key = dateKey(sun);
    // From Sunday 7 pm until Tuesday night, if not delivered yet.
    if (now >= sun && now - sun < 2.2 * 864e5 && done.recap !== key) out.push({ kind: 'recap', key });
  }
  if (set.followUp) {
    const yKey = dateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 12));
    const ci = await loadCheckins();
    const y = ci[yKey];
    const today = ci[dateKey(now)];
    const after = now.getHours() * 60 + now.getMinutes() >= FOLLOW_HOUR * 60 + FOLLOW_MIN;
    if (y && y.mood && y.mood <= 2 && after && !(today && today.mood) && done.followUp !== yKey) out.push({ kind: 'followUp', key: yKey, checkin: y });
  }
  return out;
}

async function weekLines(now) {
  const days = [6, 5, 4, 3, 2, 1, 0].map(i => new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 12));
  const keys = days.map(dateKey);
  const list = await loadDays(keys);
  const goals = { ...DEFAULT_GOALS, ...(await readSetting('goals', {})) };
  const logged = list.map(d => sumNutrients(d.entries.map(e => e.n))).filter(t => (t.k || 0) > 0);
  const avg = k => Math.round(logged.reduce((a, t) => a + (t[k] || 0), 0) / Math.max(1, logged.length));
  const lines = [];
  lines.push(`Food logged on ${logged.length} of the last 7 days.`);
  if (logged.length) {
    lines.push(`On those days, on average: ${avg('k')} kcal (target ${goals.k}), protein ${avg('p')} g (target ${goals.p}), fibre ${avg('fi')} g (target ${goals.fi}). Protein target reached on ${logged.filter(t => (t.p || 0) >= goals.p).length} days.`);
  }
  const water = list.map(d => d.water || 0).filter(Boolean);
  if (water.length) lines.push(`Water: about ${Math.round(water.reduce((a, b) => a + b, 0) / water.length)} ml on days she logged it (goal ${goals.water}).`);
  const ci = await loadCheckins();
  const moods = keys.map((k, i) => (ci[k]?.mood ? `${days[i].toLocaleDateString('en-GB', { weekday: 'short' })} ${label(ci[k].mood).toLowerCase()}` : null)).filter(Boolean);
  if (moods.length) lines.push(`Check-in moods: ${moods.join(', ')}.`);
  const sleeps = keys.map(k => ci[k]?.sleepH).filter(Boolean);
  if (sleeps.length) lines.push(`Sleep: about ${(sleeps.reduce((a, b) => a + b, 0) / sleeps.length).toFixed(1)} hours a night (${sleeps.length} nights logged).`);
  const tags = {};
  keys.forEach(k => (ci[k]?.tags || []).forEach(t => { tags[t] = (tags[t] || 0) + 1; }));
  const top = Object.entries(tags).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t, n]) => `${t.toLowerCase()} (${n}×)`);
  if (top.length) lines.push(`Feelings she tagged most: ${top.join(', ')}.`);
  try {
    const steps = require('./steps');
    if ((await steps.stepsStatus()) === 'connected') {
      const n = (await steps.stepsForDays(days)).filter(x => x);
      if (n.length) lines.push(`Steps: about ${Math.round(n.reduce((a, b) => a + b, 0) / n.length)} a day (goal ${goals.steps || 8000}).`);
    }
  } catch (e) { /* optional */ }
  const supps = await loadSupps();
  if (supps.length) {
    const log = await loadSuppLog();
    const all = keys.filter(k => supps.every(s => (log[k] || []).includes(s.id))).length;
    lines.push(`Took all her supplements on ${all} of 7 days.`);
  }
  const cyc = predict(await loadCycle(), now);
  if (cyc.hasData) lines.push(`Cycle now: day ${cyc.cycleDay}, ${PHASES[cyc.phase].label.toLowerCase()}${cyc.phase !== 'period' && cyc.daysToNext >= 0 && cyc.daysToNext <= 7 ? `, period expected in about ${cyc.daysToNext} days` : ''}.`);
  return { lines, logged: logged.length, moods: moods.length };
}

async function writeRecap(now) {
  const w = await weekLines(now);
  try {
    return await askOutreach(`[App note: Gia hasn't messaged you. It's Sunday evening, and you're starting the conversation with a short, warm look back at her week.
Use the data below: notice one or two real things worth celebrating (effort counts, not just results), mention anything gently if it stands out (like short sleep or a run of low days), and end with one small, specific idea for the week ahead or a question for her. If there isn't much data, keep it light and don't make her feel bad for not logging.
About 70 to 120 words, plain text, at most two emoji. Never comment on her weight and never push her to eat less.]

Her week:
${w.lines.join('\n')}`);
  } catch (e) {
    const bits = [`Happy Sunday, Gia 🌸 Here's your week in a nutshell.`];
    bits.push(w.logged ? `You logged your food on ${w.logged} day${w.logged === 1 ? '' : 's'}, which is lovely: every bit helps you see what's working.` : `It was a quiet week in the diary, and that's completely okay.`);
    if (w.moods) bits.push(`Thank you for checking in with me ${w.moods} time${w.moods === 1 ? '' : 's'}.`);
    bits.push(`For the week ahead, maybe pick one tiny thing, like a protein-rich breakfast or an extra glass of water. I'm cheering you on 💗`);
    return bits.join(' ');
  }
}

async function writeFollowUp(c) {
  const feel = [label(c.mood), c.energy ? ENERGY.find(e => e[0] === c.energy)?.[1].toLowerCase() : '', ...(c.tags || []).map(t => t.toLowerCase())].filter(Boolean).join(', ');
  try {
    return await askOutreach(`[App note: Gia hasn't messaged you. Yesterday's check-in was a hard one (${feel}${c.sleepH ? `, ${c.sleepH} h sleep` : ''}). It's the next morning. Start the conversation with a short, gentle good-morning message asking how she's feeling today. Mention yesterday lightly and kindly without repeating details, and let her know she can reply here or just do today's check-in. No list of advice. 40 to 80 words, plain text, at most one emoji.]`);
  } catch (e) {
    return "Morning, Gia 🌸 Yesterday sounded like a tough one, so I just wanted to check in. How are you feeling today? You can tell me here, or just do today's check-in when you're ready. I'm right here either way.";
  }
}

let running = null;
// Writes and delivers anything due into the 🌸 chat. Returns how many were delivered.
export function deliverDue() {
  if (Platform.OS === 'web') return Promise.resolve(0);
  if (running) return running;
  running = (async () => {
    let n = 0;
    try {
      const now = new Date();
      for (const item of await dueOutreach(now)) {
        const text = item.kind === 'recap' ? await writeRecap(now) : await writeFollowUp(item.checkin);
        const chat = await readSetting('buddyChat', []);
        await writeSetting('buddyChat', [...chat, { role: 'assistant', text, at: Date.now(), from: item.kind }].slice(-60));
        await writeSetting('baeDelivered', { ...(await readSetting('baeDelivered', {})), [item.kind]: item.key });
        await writeSetting('buddyUnread', true);
        n++;
      }
    } catch (e) { /* never break the app over this */ }
    running = null;
    return n;
  })();
  return running;
}

// Notification times for the next days (used by reminders.js when planning notifications).
export async function outreachSchedule(now, daysAhead) {
  const set = await getOutreach();
  const out = [];
  if (set.recap) {
    for (let d = 0; d < daysAhead; d++) {
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d, RECAP_HOUR, 0, 0);
      if (day.getDay() === 0 && day > now) {
        out.push({ when: day, title: 'Your week with Miss Curious Bae 💌', body: "I've been thinking about your week. Tap to read my little Sunday recap.", data: { bae: 'recap' } });
      }
    }
  }
  if (set.followUp) {
    const ci = await loadCheckins();
    const t = ci[dateKey(now)];
    if (t && t.mood && t.mood <= 2) {
      const when = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, FOLLOW_HOUR, FOLLOW_MIN, 0);
      out.push({ when, title: 'Morning, Gia 🌸', body: 'Just checking in after yesterday. How are you feeling today?', data: { bae: 'followUp' } });
    }
  }
  return out;
}
