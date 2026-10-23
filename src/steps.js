import { Linking, Platform } from 'react-native';
import { readSetting, writeSetting } from './store';

// Steps come from Android Health Connect, which collects them from the phone,
// Samsung Health, Google Fit or a watch. We only ever read steps.

let HC = null;
function hc() {
  if (Platform.OS !== 'android') return null;
  if (!HC) {
    try { HC = require('react-native-health-connect'); } catch (e) { HC = null; }
  }
  return HC;
}

const PERMS = [{ accessType: 'read', recordType: 'Steps' }];

// 'unsupported' | 'needs-install' | 'needs-update' | 'not-connected' | 'connected'
export async function stepsStatus() {
  const lib = hc();
  if (!lib) return 'unsupported';
  try {
    const sdk = await lib.getSdkStatus();
    if (sdk === lib.SdkAvailabilityStatus.SDK_UNAVAILABLE) return 'needs-install';
    if (sdk === lib.SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) return 'needs-update';
    await lib.initialize();
    const granted = await lib.getGrantedPermissions();
    const ok = granted.some(p => p.recordType === 'Steps' && p.accessType === 'read');
    return ok ? 'connected' : 'not-connected';
  } catch (e) {
    return 'unsupported';
  }
}

export async function connectSteps() {
  const lib = hc();
  if (!lib) return false;
  await lib.initialize();
  const granted = await lib.requestPermission(PERMS);
  const ok = granted.some(p => p.recordType === 'Steps');
  await writeSetting('stepsConnected', ok);
  return ok;
}

export function openHealthConnectInstall() {
  Linking.openURL('market://details?id=com.google.android.apps.healthdata')
    .catch(() => Linking.openURL('https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata'));
}

export function openHealthConnect() {
  const lib = hc();
  if (lib) lib.openHealthConnectSettings();
}

// Total steps for each date (array of Dates). Returns an array of numbers (null if unknown).
// Each day is read on its own, so one failed day doesn't hide the rest, and every total read is
// saved (stepsLog), so past days still show if Health Connect can't return them later.
const keyOf = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export async function stepsForDays(dates) {
  const saved = await readSetting('stepsLog', {});
  const lib = hc();
  if (!lib) return dates.map(d => saved[keyOf(d)] ?? null);
  try { await lib.initialize(); } catch (e) { return dates.map(d => saved[keyOf(d)] ?? null); }
  const now = new Date();
  const out = [];
  let changed = false;
  for (const d of dates) {
    const k = keyOf(d);
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
    const end = new Date(start.getTime() + 864e5);
    if (start > now) { out.push(null); continue; }
    try {
      const res = await lib.aggregateRecord({
        recordType: 'Steps',
        timeRangeFilter: { operator: 'between', startTime: start.toISOString(), endTime: (end > now ? now : end).toISOString() },
      });
      const n = res && typeof res.COUNT_TOTAL === 'number' ? res.COUNT_TOTAL : 0;
      // Keep the higher number: Health Connect sometimes returns less for older days than it did on the day.
      const best = Math.max(n, saved[k] || 0);
      if (best !== saved[k]) { saved[k] = best; changed = true; }
      out.push(best);
    } catch (e) {
      out.push(saved[k] ?? null);
    }
  }
  if (changed) {
    const keep = Object.keys(saved).sort().slice(-400); // a bit over a year
    await writeSetting('stepsLog', Object.fromEntries(keep.map(k => [k, saved[k]])));
  }
  return out;
}

export async function wasConnected() {
  return !!(await readSetting('stepsConnected', false));
}
