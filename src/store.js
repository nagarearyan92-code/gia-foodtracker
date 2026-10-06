import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { NUTRIENT_KEYS } from './theme';

// Everything is stored on the phone. Keys:
//   day:YYYY-MM-DD  -> { entries: [...], water: ml }
//   customFoods     -> [food]
//   goals           -> { k, p, c, f, fi, water }
//   weights         -> [{ date, kg }]

export const DEFAULT_GOALS = { k: 2000, p: 100, c: 230, f: 70, fi: 30, water: 2000 };

const listeners = new Set();
const diaryHooks = new Set();
// Called after diary entries change (used to re-plan reminders).
export function onDiaryChange(fn) { diaryHooks.add(fn); return () => diaryHooks.delete(fn); }
const diaryChanged = () => diaryHooks.forEach(fn => { try { fn(); } catch (e) {} });
function notify() { listeners.forEach(fn => fn()); }

async function readJSON(key, fallback) {
  try {
    const v = await AsyncStorage.getItem(key);
    return v == null ? fallback : JSON.parse(v);
  } catch (e) {
    return fallback;
  }
}
export async function readSetting(key, fallback) { return readJSON(key, fallback); }
export async function writeSetting(key, value) { return writeJSON(key, value); }
async function writeJSON(key, value) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
  notify();
}

export function dateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// Scale per-100g nutrients to an amount in grams.
export function scale(n100, grams) {
  const out = {};
  NUTRIENT_KEYS.forEach(k => {
    if (n100[k] != null && !Number.isNaN(n100[k])) out[k] = (n100[k] * grams) / 100;
  });
  return out;
}

export function sumNutrients(list) {
  const t = {};
  list.forEach(n => {
    for (const k in n) t[k] = (t[k] || 0) + (n[k] || 0);
  });
  return t;
}

// Generic hook that reloads whenever anything is written.
function useStored(loader, deps) {
  const [value, setValue] = useState(null);
  const reload = useCallback(() => { loader().then(setValue); }, deps); // eslint-disable-line
  useEffect(() => {
    reload();
    listeners.add(reload);
    return () => listeners.delete(reload);
  }, [reload]);
  return value;
}

// ---- Day ----
export function useDay(key) {
  return useStored(() => readJSON('day:' + key, { entries: [], water: 0 }), [key]);
}
export async function addEntry(key, entry) {
  const day = await readJSON('day:' + key, { entries: [], water: 0 });
  day.entries.push({ id: uid(), ...entry });
  await writeJSON('day:' + key, day);
  diaryChanged();
}
export async function removeEntry(key, id) {
  const day = await readJSON('day:' + key, { entries: [], water: 0 });
  day.entries = day.entries.filter(e => e.id !== id);
  await writeJSON('day:' + key, day);
  diaryChanged();
}
export async function addWater(key, ml) {
  const day = await readJSON('day:' + key, { entries: [], water: 0 });
  day.water = Math.max(0, (day.water || 0) + ml);
  await writeJSON('day:' + key, day);
}
export async function loadDays(keys) {
  const pairs = await AsyncStorage.multiGet(keys.map(k => 'day:' + k));
  return pairs.map(([, v]) => (v ? JSON.parse(v) : { entries: [], water: 0 }));
}

// ---- Custom foods ----
export function useCustomFoods() {
  return useStored(() => readJSON('customFoods', []), []);
}
export async function saveCustomFood(food) {
  const list = await readJSON('customFoods', []);
  const i = list.findIndex(f => f.id === food.id);
  if (i >= 0) list[i] = food; else list.push(food);
  await writeJSON('customFoods', list);
}
export async function deleteCustomFood(id) {
  const list = await readJSON('customFoods', []);
  await writeJSON('customFoods', list.filter(f => f.id !== id));
}
export async function findCustomByBarcode(code) {
  const list = await readJSON('customFoods', []);
  return list.find(f => f.barcode === code) || null;
}

// ---- Recent foods (for quick re-adding) ----
export function useRecent() {
  return useStored(() => readJSON('recent', []), []);
}
export async function pushRecent(food) {
  const list = await readJSON('recent', []);
  const next = [food, ...list.filter(f => f.id !== food.id)].slice(0, 15);
  await writeJSON('recent', next);
}

// ---- Goals ----
export function useGoals() {
  return useStored(async () => ({ ...DEFAULT_GOALS, ...(await readJSON('goals', {})) }), []);
}
export async function saveGoals(goals) {
  await writeJSON('goals', goals);
}

// ---- Weight ----
export function useWeights() {
  return useStored(() => readJSON('weights', []), []);
}
export async function logWeight(date, kg) {
  const list = await readJSON('weights', []);
  const next = [...list.filter(w => w.date !== date), { date, kg }].sort((a, b) => (a.date < b.date ? -1 : 1));
  await writeJSON('weights', next);
}
export async function deleteWeight(date) {
  const list = await readJSON('weights', []);
  await writeJSON('weights', list.filter(w => w.date !== date));
}
