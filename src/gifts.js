// Gifts and notes from Aryan. He sends them from his Jarvis app, which writes them to gifts.json in
// a private GitHub repo. Gia Mia reads that file with a read-only key (the "connection code"),
// shows each new gift as a little animation, and pops up a notification when it arrives while the
// app is closed (checked in the background every so often; Android decides exactly when).
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Notifications from 'expo-notifications';
import { readSetting, writeSetting } from './store';

export const GIFTS = {
  flowers: { emoji: '🌹', floats: ['🌹', '🌸', '🌷', '💐'], title: 'Aryan sent you flowers' },
  kisses: { emoji: '💋', floats: ['💋', '😘', '💕'], title: 'Aryan sent you kisses' },
  cuddles: { emoji: '🤗', floats: ['🤗', '🧸', '💞'], title: 'Aryan sent you a cuddle' },
  chocolate: { emoji: '🍫', floats: ['🍫', '🍓', '🍬'], title: 'Aryan sent you chocolate' },
  treat: { emoji: '🍰', floats: ['🍰', '🧁', '🍩'], title: 'Aryan sent you a treat' },
  thinking: { emoji: '💭', floats: ['💭', '✨', '💗'], title: "Aryan's thinking of you" },
  note: { emoji: '💌', floats: ['💌', '💗', '✨'], title: 'A note from Aryan' },
};
export const giftInfo = g => GIFTS[g.type] || GIFTS.note;

const CONN = 'gifts_connection';
const TASK = 'gia-gifts-check';

// Connection code from Jarvis: "gm1:" + base64 of {"r": "owner/repo", "t": "<read-only key>"}.
export function parseCode(code) {
  try {
    const c = String(code || '').trim().replace(/\s+/g, '');
    if (!c.startsWith('gm1:')) return null;
    const j = JSON.parse(atob(c.slice(4)));
    if (!/^[\w.-]+\/[\w.-]+$/.test(j.r || '') || !(j.t || '').length) return null;
    return { repo: j.r, token: j.t };
  } catch (e) { return null; }
}

export async function getConnection() {
  if (Platform.OS === 'web') return null;
  try { const v = await SecureStore.getItemAsync(CONN); return v ? JSON.parse(v) : null; } catch (e) { return null; }
}
export async function connect(code) {
  const c = parseCode(code);
  if (!c) return { ok: false, error: "That code doesn't look right. Ask Aryan to copy it again from Jarvis." };
  const r = await fetchGifts(c);
  if (!r.ok) return r;
  await SecureStore.setItemAsync(CONN, JSON.stringify(c));
  await writeSetting('giftsConnected', true);
  // Old gifts arrive quietly; only ones sent from now on get the big pop-up.
  const seen = new Set(await readSetting('giftsSeen', []));
  r.gifts.forEach(g => seen.add(g.id));
  await writeSetting('giftsSeen', [...seen].slice(-300));
  await writeSetting('giftsNotified', [...seen].slice(-300));
  await writeSetting('gifts', r.gifts.slice(-50));
  await registerBackground();
  return { ok: true };
}
export async function disconnect() {
  try { await SecureStore.deleteItemAsync(CONN); } catch (e) { /* none */ }
  await writeSetting('giftsConnected', false);
  try { const BT = require('expo-background-task'); await BT.unregisterTaskAsync(TASK); } catch (e) { /* not registered */ }
}

async function fetchGifts(c) {
  try {
    const r = await fetch(`https://api.github.com/repos/${c.repo}/contents/gifts.json?ts=${Date.now()}`, {
      headers: { Authorization: `Bearer ${c.token}`, Accept: 'application/vnd.github.raw+json', 'X-GitHub-Api-Version': '2022-11-28' },
    });
    if (r.status === 404) return { ok: true, gifts: [] }; // nothing sent yet (or no access: see below)
    if (r.status === 401 || r.status === 403) return { ok: false, error: 'The connection code was refused. Ask Aryan for a fresh one.' };
    if (!r.ok) return { ok: false, error: `Couldn't check for gifts (error ${r.status}). Try again later.` };
    const j = JSON.parse(await r.text());
    return { ok: true, gifts: Array.isArray(j.gifts) ? j.gifts.filter(g => g && g.id) : [] };
  } catch (e) {
    return { ok: false, error: "Couldn't reach GitHub. Check you're online." };
  }
}

// Checks for gifts and saves them. Returns the gifts she hasn't opened yet.
export async function checkGifts() {
  const c = await getConnection();
  if (!c) return [];
  const r = await fetchGifts(c);
  if (r.ok) await writeSetting('gifts', r.gifts.slice(-50));
  return unseenGifts();
}
export async function unseenGifts() {
  const all = await readSetting('gifts', []);
  const seen = new Set(await readSetting('giftsSeen', []));
  return all.filter(g => !seen.has(g.id));
}
export async function markSeen(id) {
  const seen = await readSetting('giftsSeen', []);
  if (!seen.includes(id)) await writeSetting('giftsSeen', [...seen, id].slice(-300));
}

// Background check: notify about new gifts once each.
async function notifyNew() {
  const fresh = await checkGifts();
  const notified = new Set(await readSetting('giftsNotified', []));
  for (const g of fresh.filter(x => !notified.has(x.id))) {
    const info = giftInfo(g);
    await Notifications.scheduleNotificationAsync({
      content: { title: `${info.title} ${info.emoji}`, body: g.note ? g.note.slice(0, 140) : 'Open Gia Mia to see it 💗', data: { gift: g.id } },
      trigger: null,
    });
    notified.add(g.id);
  }
  await writeSetting('giftsNotified', [...notified].slice(-300));
}

if (Platform.OS !== 'web') {
  try {
    const TaskManager = require('expo-task-manager');
    const BT = require('expo-background-task');
    TaskManager.defineTask(TASK, async () => {
      try { await notifyNew(); return BT.BackgroundTaskResult.Success; } catch (e) { return BT.BackgroundTaskResult.Failed; }
    });
  } catch (e) { /* background checks unavailable: gifts still arrive when the app opens */ }
}

export async function registerBackground() {
  if (Platform.OS === 'web' || !(await getConnection())) return;
  try {
    const BT = require('expo-background-task');
    await BT.registerTaskAsync(TASK, { minimumInterval: 30 });
  } catch (e) { /* fine: checked when the app opens */ }
}
