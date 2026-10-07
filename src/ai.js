// Personal check-in replies from Claude (Anthropic API). The API key lives only on this phone,
// in Android's secure storage. Without a key, or offline, a short built-in reply is used instead.
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { dateKey, loadDays, readSetting, sumNutrients } from './store';
import { DEFAULT_GOALS } from './store';
import { loadCycle, predict, PHASES } from './cycle';
import { ENERGY, MOODS, SLEEP_Q, loadCheckins, loadSuppLog, loadSupps } from './wellbeing';
import { RECIPES } from './data';

const MODEL = 'claude-sonnet-5-5';
const KEY_NAME = 'anthropic_api_key';

export async function getKey() {
  if (Platform.OS === 'web') return null;
  try { return await SecureStore.getItemAsync(KEY_NAME); } catch (e) { return null; }
}
// Keys copied from emails, notes or chat apps can pick up spaces, line breaks or invisible characters.
export const cleanKey = k => (k || '').replace(/[\s​-‍⁠﻿]/g, '');
export async function setKey(k) { await SecureStore.setItemAsync(KEY_NAME, cleanKey(k)); }
export async function removeKey() { await SecureStore.deleteItemAsync(KEY_NAME); }

async function post(apiKey, body, ms = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  let res;
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (e) {
    throw { code: 'offline' };
  } finally {
    clearTimeout(timer);
  }
  let data = null;
  try { data = await res.json(); } catch (e) { /* ignore */ }
  if (!res.ok) {
    const msg = data?.error?.message || '';
    if (res.status === 401) throw { code: 'bad-key', message: msg };
    if (/credit balance/i.test(msg) || res.status === 402) throw { code: 'no-credit', message: msg };
    if (res.status === 403) throw { code: 'no-access', message: msg };
    if (res.status === 429 || res.status === 529 || res.status >= 500) throw { code: 'busy', message: msg };
    throw { code: 'error', message: msg || `HTTP ${res.status}` };
  }
  return data;
}

// A tiny request (costs a tiny fraction of a penny) to check the key really works.
export async function testKey(k) {
  const apiKey = cleanKey(k) || (await getKey());
  if (!apiKey) return { ok: false, code: 'no-key' };
  try {
    await post(apiKey, { model: MODEL, max_tokens: 1, messages: [{ role: 'user', content: 'Hi' }] }, 20000);
    return { ok: true };
  } catch (e) {
    return { ok: false, code: e?.code || 'error', message: e?.message || '' };
  }
}

export const KEY_PROBLEM = {
  'bad-key': "Anthropic says this key isn't valid. It may be an old or deleted key, or only part of it got copied. Create a new key in the Claude Console and copy the whole thing.",
  'no-credit': 'The key works, but the Anthropic account has no credit left. Add credit under Billing in the Claude Console.',
  'no-access': "This key doesn't have permission to use Claude. Check the key's workspace in the Claude Console.",
  offline: "Couldn't reach Anthropic. Check the phone is online and try again.",
  busy: 'Anthropic is busy right now. Try again in a minute.',
  error: 'Something went wrong checking the key.',
};

const SYSTEM = `You are Miss Curious Bae, a warm, caring and gently playful companion inside Gia's personal food and wellbeing app. Gia chose your name. You're curious about her day and genuinely care how she feels. Don't sign your messages or keep repeating your name. Her partner Aryan made this app for her as a gift. Gia lives in the UK, is vegetarian (no eggs; she avoids soy products), and uses the app to track food, cycle, sleep and mood.

Each check-in tells you how she feels plus a snapshot of her day. Reply like a kind, emotionally intelligent friend who also knows a lot about nutrition, sleep and wellbeing:
- First, reflect back what she actually said, in her terms, so she feels heard. Be specific, never generic.
- Then offer 2 or 3 small, practical, gentle ideas that fit her situation right now (her food so far, sleep, cycle phase, energy, time of day). Where food helps, suggest simple vegetarian options, and you may name one of her saved recipes.
- Keep it short: about 90 to 160 words, plain text, no headings or bullet symbols, at most one emoji.
- Never shame or pressure her about food, weight or calories, and never suggest restricting or skipping meals. If she has eaten little, encourage nourishing food.
- Don't diagnose. If something sounds medical or keeps happening, gently suggest her GP or a pharmacist.
- If she mentions hopelessness, self-harm, not wanting to be here, or being unsafe, respond with real care, tell her she matters and she doesn't have to handle it alone, and encourage her to reach out now: Samaritans on 116 123 (free, 24/7, UK), texting SHOUT to 85258, or 999 / A&E if she's in immediate danger. Suggest telling Aryan or someone she trusts.
- For follow-up messages, continue the conversation naturally and keep replies brief.`;

const fmtTime = d => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

// A short snapshot of her day for context.
export async function buildContext(key) {
  const date = new Date(key + 'T12:00');
  const isToday = key === dateKey(new Date());
  const [day] = await loadDays([key]);
  const goals = { ...DEFAULT_GOALS, ...(await readSetting('goals', {})) };
  const t = sumNutrients(day.entries.map(e => e.n));
  const meals = [...new Set(day.entries.map(e => e.meal))];
  const lines = [];
  lines.push(`Date: ${date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}${isToday ? `, time now ${fmtTime(new Date())}` : ''}.`);
  lines.push(day.entries.length
    ? `Food logged: ${Math.round(t.k || 0)} of ${goals.k} kcal, protein ${Math.round(t.p || 0)}/${goals.p} g, fibre ${Math.round(t.fi || 0)}/${goals.fi} g. Meals logged: ${meals.join(', ')}. Items: ${day.entries.slice(-8).map(e => e.name).join('; ')}.`
    : 'No food logged yet today.');
  lines.push(`Water: ${day.water || 0} of ${goals.water} ml.`);

  try {
    const steps = require('./steps');
    if ((await steps.stepsStatus()) === 'connected') {
      const [n] = await steps.stepsForDays([date]);
      if (n != null) lines.push(`Steps: ${n} (goal ${goals.steps || 8000}).`);
    }
  } catch (e) { /* steps optional */ }

  const cyc = predict(await loadCycle(), date);
  if (cyc.hasData) {
    lines.push(`Cycle: day ${cyc.cycleDay}, ${PHASES[cyc.phase].label.toLowerCase()}${cyc.phase !== 'period' && cyc.daysToNext >= 0 && cyc.daysToNext <= 5 ? `, period due in about ${cyc.daysToNext} days` : ''}${cyc.late ? `, period ${cyc.late} days late` : ''}.`);
  }

  const supps = await loadSupps();
  const taken = (await loadSuppLog())[key] || [];
  if (supps.length) lines.push(`Supplements today: ${supps.map(s => `${s.name} ${taken.includes(s.id) ? 'taken' : 'not yet'}`).join(', ')}.`);

  const all = await loadCheckins();
  const recent = [];
  for (let i = 1; i <= 3; i++) {
    const c = all[dateKey(new Date(date.getTime() - i * 864e5))];
    if (c && c.mood) recent.push(`${i === 1 ? 'yesterday' : i + ' days ago'}: mood ${c.mood}/5${c.sleepH ? `, slept ${c.sleepH} h` : ''}`);
  }
  if (recent.length) lines.push(`Recent check-ins: ${recent.join('; ')}.`);

  const ideas = RECIPES.filter(r => r.tags.includes('High protein')).slice(0, 8).map(r => r.name);
  lines.push(`Some of her saved recipes: ${ideas.join(', ')}.`);
  return lines.join('\n');
}

export function describeCheckin(c) {
  const parts = [];
  if (c.mood) parts.push(`Mood: ${MOODS.find(m => m.v === c.mood).label} (${c.mood}/5)`);
  if (c.energy) parts.push(`Energy: ${ENERGY.find(e => e[0] === c.energy)[1]}`);
  if (c.sleepH) parts.push(`Sleep: ${c.sleepH} hours${c.sleepQ ? ', ' + SLEEP_Q.find(q => q[0] === c.sleepQ)[1].toLowerCase() : ''}`);
  if (c.tags?.length) parts.push(`Feeling: ${c.tags.join(', ').toLowerCase()}`);
  return parts.join('. ') + '.';
}

const replyText = data => (data?.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();

// thread: [{ role: 'user'|'assistant', text }]. Returns { text, source: 'ai' } or throws { code, message }.
export async function askClaude(key, checkin, thread) {
  const apiKey = await getKey();
  if (!apiKey) throw { code: 'no-key' };
  const ctx = await buildContext(key);
  const first = `Here's my check-in.\n${describeCheckin(checkin)}\n${checkin.feeling ? `In my own words: ${checkin.feeling}` : "I didn't write anything else."}\n\n[Snapshot of my day, for context]\n${ctx}`;
  // Skip empty messages and merge back-to-back messages from the same side (the API needs them to alternate).
  const msgs = [];
  [{ role: 'user', text: first }, ...thread.slice(1)].forEach(m => {
    const t = (m.text || '').trim();
    if (!t) return;
    const last = msgs[msgs.length - 1];
    if (last && last.role === m.role) last.content += '\n\n' + t;
    else msgs.push({ role: m.role, content: t });
  });
  while (msgs.length > 14) msgs.splice(1, 2); // keep the check-in itself, drop the oldest back-and-forth
  if (msgs[msgs.length - 1].role !== 'user') throw { code: 'error', message: 'Nothing new to reply to' };

  // Sonnet 5.5 thinks before answering by default, and thinking counts toward max_tokens. A short,
  // warm reply doesn't need deep reasoning, so keep effort low and leave plenty of room for the answer.
  const body = { model: MODEL, max_tokens: 2000, output_config: { effort: 'low' }, system: SYSTEM, messages: msgs };
  let data = await post(cleanKey(apiKey), body);
  let text = replyText(data);
  if (!text && data.stop_reason !== 'refusal') {
    data = await post(cleanKey(apiKey), { ...body, max_tokens: 4000 }); // one more go with extra room
    text = replyText(data);
  }
  if (!text) throw { code: 'empty', message: data.stop_reason || '' };
  return { text, source: 'ai' };
}

export const ERROR_TEXT = {
  'no-key': '',
  offline: "Couldn't reach the AI right now (no internet?). Here's a quick note instead.",
  'bad-key': 'The AI key on this phone isn\'t working. Check it in Me → Miss Curious Bae.',
  'no-credit': 'The AI account has run out of credit, so here\'s a quick note instead.',
  'no-access': 'The AI key on this phone isn\'t allowed to use Claude. Check it in Me → Miss Curious Bae.',
  empty: "Miss Curious Bae couldn't put her reply into words that time. Here's a quick note instead; tap Try again for a proper reply.",
  busy: 'The AI is busy at the moment. Here\'s a quick note instead; try again in a minute.',
  error: 'Something went wrong with the AI reply. Here\'s a quick note instead.',
};

// Built-in reply when the AI isn't available.
export async function localReply(key, c) {
  // Follow-up messages need the AI; don't repeat the first note as if it were an answer.
  if ((c.thread || []).some(m => m.role === 'assistant')) {
    return { text: "I really want to reply to that properly, but I can't reach my AI brain right now. Tap Try again in a bit 💗", source: 'local' };
  }
  const cyc = predict(await loadCycle(), new Date(key + 'T12:00'));
  const [day] = await loadDays([key]);
  const t = sumNutrients(day.entries.map(e => e.n));
  const out = [];
  const low = c.mood && c.mood <= 2;
  const heavy = c.energy === 'low' || (c.tags || []).some(t => ['Stressed', 'Anxious', 'Overwhelmed', 'Sad', 'Lonely'].includes(t));
  out.push(low ? "Thank you for checking in, especially on a harder day. It's okay not to feel great."
    : c.mood >= 4 && !heavy ? 'Love that you\'re feeling good today!' : 'Thanks for checking in. Sounds like a bit of a mixed day.');
  if (/skip|didn'?t eat|haven'?t eaten|no (lunch|breakfast|dinner)|forgot to eat/i.test(c.feeling || '')) out.push("If you've missed a meal, something nourishing soon will help your energy and mood, even something simple like a dal with rice or cottage cheese on toast.");
  if (c.sleepH && c.sleepH < 6) out.push('Short sleep makes everything feel heavier. An earlier, screen-free wind-down tonight could really help.');
  if (c.energy === 'low' && cyc.hasData && cyc.phase === 'period') out.push('Low energy on your period is common. Iron-rich food like dal, spinach or kala chana, with something containing vitamin C, can help.');
  else if (c.energy === 'low' && (t.p || 0) < 30) out.push('A protein-rich meal or snack might lift your energy, like the cottage cheese crunch bowl or a dal.');
  if (c.tags?.includes('Stressed') || c.tags?.includes('Anxious') || c.tags?.includes('Overwhelmed')) out.push('Try a few slow breaths: in for 4, hold for 4, out for 6. Even two minutes helps.');
  if (low && cyc.hasData && (cyc.phase === 'luteal' && cyc.daysToNext <= 5)) out.push('Your period is due soon, and mood often dips in these days. It usually passes.');
  if ((day.water || 0) < 750 && new Date().getHours() >= 14) out.push('A glass of water might help too.');
  if (out.length < 3) out.push(low ? 'A short walk outside or a chat with someone you love can make a real difference.' : 'Keep being kind to yourself 💗');
  return { text: out.join(' '), source: 'local' };
}
