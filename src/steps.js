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

// Total steps for each date (array of Date at noon). Returns array of numbers (null if unavailable).
export async function stepsForDays(dates) {
  const lib = hc();
  if (!lib) return dates.map(() => null);
  try {
    await lib.initialize();
    const out = [];
    for (const d of dates) {
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
      const end = new Date(start.getTime() + 864e5);
      if (start > new Date()) { out.push(0); continue; }
      const res = await lib.aggregateRecord({
        recordType: 'Steps',
        timeRangeFilter: { operator: 'between', startTime: start.toISOString(), endTime: (end > new Date() ? new Date() : end).toISOString() },
      });
      out.push(res && typeof res.COUNT_TOTAL === 'number' ? res.COUNT_TOTAL : 0);
    }
    return out;
  } catch (e) {
    return dates.map(() => null);
  }
}

export async function wasConnected() {
  return !!(await readSetting('stepsConnected', false));
}
