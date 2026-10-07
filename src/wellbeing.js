// Daily check-ins (mood, energy, sleep, feelings) and supplements. Stored on the phone.
import { dateKey, diaryChanged, readSetting, writeSetting } from './store';
import { nowHM } from './times';

export const MOODS = [
  { v: 1, face: '😣', label: 'Awful' },
  { v: 2, face: '😕', label: 'Low' },
  { v: 3, face: '😐', label: 'Okay' },
  { v: 4, face: '🙂', label: 'Good' },
  { v: 5, face: '😄', label: 'Great' },
];
export const ENERGY = [['low', 'Low energy'], ['ok', 'Okay'], ['high', 'Lots of energy']];
export const SLEEP_Q = [['poor', 'Slept badly'], ['ok', 'Okay'], ['good', 'Slept well']];
export const TAGS = ['Stressed', 'Anxious', 'Calm', 'Motivated', 'Social', 'Lonely', 'Sore', 'Bloated', 'Hungry', 'Overwhelmed', 'Grateful', 'Sad'];

// ---- Check-ins: { [date]: { mood, energy, sleepH, sleepQ, tags, feeling, note, thread: [{role, text, source}] } }
export async function loadCheckins() { return readSetting('checkins', {}); }
export async function getCheckin(key) { return (await loadCheckins())[key] || null; }
export async function saveCheckin(key, data) {
  const all = await loadCheckins();
  all[key] = { ...(all[key] || {}), ...data, updatedAt: Date.now() };
  await writeSetting('checkins', all);
  diaryChanged(); // re-plans the evening nudge
  return all[key];
}

// ---- Supplements
// suppLog: { day: [ids taken] } (unchanged format), suppTimes: { day: { id: "HH:MM" } }.
// A supplement can count toward a nutrient total: { dose, unit, nutrient }.
export const SUPP_NUTRIENTS = [
  { key: 'vd', label: 'Vitamin D', units: ['µg', 'IU'] },
  { key: 'iron', label: 'Iron', units: ['mg'] },
  { key: 'b12', label: 'Vitamin B12', units: ['µg'] },
  { key: 'ca', label: 'Calcium', units: ['mg'] },
  { key: 'zn', label: 'Zinc', units: ['mg'] },
];
export const DEFAULT_SUPPS = [
  { id: 'vitd', name: 'Vitamin D', hint: 'UK advice: 10 µg a day, especially October to March', nutrient: 'vd', dose: 10, unit: 'µg' },
  { id: 'iron', name: 'Iron', hint: 'Take as your GP or pharmacist advises; vitamin C helps absorption, tea and coffee reduce it', nutrient: 'iron', dose: null, unit: 'mg' },
];
// Older saved lists don't have dose details for the two defaults; fill them in.
export function normalizeSupps(list) {
  return (list || DEFAULT_SUPPS).map(x => {
    const d = DEFAULT_SUPPS.find(y => y.id === x.id);
    return d && x.nutrient === undefined ? { ...d, ...x, nutrient: d.nutrient, unit: x.unit || d.unit, dose: x.dose !== undefined ? x.dose : d.dose } : x;
  });
}
export async function loadSupps() { return normalizeSupps(await readSetting('supps', DEFAULT_SUPPS)); }
export async function saveSupps(list) { await writeSetting('supps', list); diaryChanged(); }
export async function loadSuppLog() { return readSetting('suppLog', {}); }
export async function toggleSupp(key, id, time) {
  const log = await loadSuppLog();
  const day = new Set(log[key] || []);
  const times = await readSetting('suppTimes', {});
  const t = { ...(times[key] || {}) };
  if (day.has(id)) { day.delete(id); delete t[id]; } else { day.add(id); t[id] = time || nowHM(); }
  log[key] = [...day];
  times[key] = t;
  await writeSetting('suppTimes', times);
  await writeSetting('suppLog', log);
  diaryChanged();
}
export async function setSuppTime(key, id, time) {
  const times = await readSetting('suppTimes', {});
  times[key] = { ...(times[key] || {}), [id]: time };
  await writeSetting('suppTimes', times);
}

// Amounts supplements add to the day's nutrients, in the same units as MICROS (µg / mg).
export function suppAmounts(list, takenIds = []) {
  const out = {};
  for (const x of normalizeSupps(list)) {
    if (!takenIds.includes(x.id) || !x.nutrient || !(x.dose > 0)) continue;
    const amt = x.nutrient === 'vd' && x.unit === 'IU' ? x.dose / 40 : x.dose;
    out[x.nutrient] = (out[x.nutrient] || 0) + amt;
  }
  return out;
}

// Words that suggest she may be in serious distress. If matched, the app shows support details straight away.
const CRISIS = /(suicid|kill (myself|me)|end (it all|my life|things)|self[- ]?harm|hurt(ing)? myself|cut(ting)? myself|don'?t want to (be here|live|exist|wake up)|want to die|wish i (was|were) dead|no (point|reason) (in )?(living|going on)|can'?t go on|better off without me)/i;
export const isCrisis = text => CRISIS.test(text || '');

// Low mood on most of the last 14 days (needs at least 8 check-ins).
export function persistentLowMood(all, today = new Date()) {
  let n = 0, low = 0;
  for (let i = 0; i < 14; i++) {
    const d = new Date(today.getTime() - i * 864e5);
    const c = all[dateKey(d)];
    if (c && c.mood) { n++; if (c.mood <= 2) low++; }
  }
  return n >= 8 && low / n >= 0.6;
}

export const moodFace = v => (MOODS.find(m => m.v === v) || {}).face || '';
