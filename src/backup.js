// Backup and restore of everything Gia Mia keeps on the phone (diary, foods, check-ins, cycle,
// weights, settings). The AI key is kept separately in secure storage and is never included.
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { dateKey, diaryChanged, readSetting, writeSetting } from './store';

const APP = 'GiaMia';
const SKIP = new Set(['lastBackup']);
const restoreHooks = new Set();
export function onRestore(fn) { restoreHooks.add(fn); return () => restoreHooks.delete(fn); }

export async function buildBackup() {
  const keys = (await AsyncStorage.getAllKeys()).filter(k => !SKIP.has(k));
  const pairs = await AsyncStorage.multiGet(keys);
  const data = {};
  pairs.forEach(([k, v]) => { if (v != null) data[k] = v; });
  return { app: APP, format: 1, appVersion: Constants.expoConfig?.version || '', exportedAt: new Date().toISOString(), data };
}

// Writes the backup to a file and opens the share sheet (Google Drive, email, WhatsApp to herself…).
export async function shareBackup() {
  const backup = await buildBackup();
  const file = new File(Paths.cache, `GiaMia-backup-${dateKey(new Date())}.json`);
  if (file.exists) file.delete();
  file.create();
  file.write(JSON.stringify(backup));
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Save your Gia Mia backup' });
  await writeSetting('lastBackup', backup.exportedAt);
  return Object.keys(backup.data).length;
}

export function summarise(backup) {
  const keys = Object.keys(backup.data);
  const days = keys.filter(k => k.startsWith('day:')).sort();
  let checkins = 0;
  try { checkins = Object.keys(JSON.parse(backup.data.checkins || '{}')).length; } catch (e) { /* ignore */ }
  return { days: days.length, from: days[0]?.slice(4), to: days[days.length - 1]?.slice(4), checkins, exportedAt: backup.exportedAt };
}

// Returns a parsed, checked backup, or null if she cancelled. Throws on a bad file.
export async function pickBackup() {
  const res = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
  if (res.canceled || !res.assets?.length) return null;
  const text = await new File(res.assets[0].uri).text();
  let b;
  try { b = JSON.parse(text); } catch (e) { throw new Error("That file isn't a Gia Mia backup."); }
  if (!b || b.app !== APP || typeof b.data !== 'object') throw new Error("That file isn't a Gia Mia backup.");
  return b;
}

// Replaces everything on this phone with the backup.
export async function restoreBackup(b) {
  const keys = (await AsyncStorage.getAllKeys()).filter(k => !SKIP.has(k));
  await AsyncStorage.multiRemove(keys);
  await AsyncStorage.multiSet(Object.entries(b.data).filter(([k, v]) => typeof v === 'string' && !SKIP.has(k)));
  restoreHooks.forEach(fn => { try { fn(); } catch (e) { /* ignore */ } });
  diaryChanged();
}

export async function lastBackupAt() { return readSetting('lastBackup', null); }
