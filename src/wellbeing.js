// Daily check-ins (mood, energy, sleep, feelings) and supplements. Stored on the phone.
import { dateKey, diaryChanged, readSetting, writeSetting } from './store';

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
export const DEFAULT_SUPPS = [
  { id: 'vitd', name: 'Vitamin D', hint: 'UK advice: 10 µg a day, especially October to March' },
  { id: 'iron', name: 'Iron', hint: 'Take as your GP or pharmacist advises; vitamin C helps absorption, tea and coffee reduce it' },
];
export async function loadSupps() { return readSetting('supps', DEFAULT_SUPPS); }
export async function saveSupps(list) { await writeSetting('supps', list); diaryChanged(); }
export async function loadSuppLog() { return readSetting('suppLog', {}); }
export async function toggleSupp(key, id) {
  const log = await loadSuppLog();
  const day = new Set(log[key] || []);
  day.has(id) ? day.delete(id) : day.add(id);
  log[key] = [...day];
  await writeSetting('suppLog', log);
  diaryChanged();
}

// ---- Safety
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
