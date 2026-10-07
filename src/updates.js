// Checks GitHub for a newer Gia Mia release and installs it over the current app.
// Installing over the top keeps all her data (same app id and signing key).
import { Linking, Platform } from 'react-native';
import Constants from 'expo-constants';
import { Directory, File, Paths } from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import { readSetting, writeSetting } from './store';

const REPO = 'nagarearyan92-code/gia-foodtracker';
const CHECK_EVERY = 6 * 3600e3;

export const currentVersion = () => Constants.expoConfig?.version || '0.0.0';

// '1.0.12' -> [1,0,12]; true if a is newer than b.
const parts = v => String(v).replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0);
export function isNewer(a, b) {
  const x = parts(a), y = parts(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0);
  }
  return false;
}

// Release notes are written above a '---' line in the release description.
function notesFrom(body) {
  return (body || '').split(/\n-{3,}\s*\n/)[0].replace(/[*_#`]/g, '').trim();
}

// Returns { version, notes, url, size } if a newer version exists, else null.
// `force` skips the "checked recently" limit (for the Check for updates button).
export async function checkForUpdate(force = false) {
  if (Platform.OS !== 'android') return null;
  if (!force) {
    const last = await readSetting('updateCheckedAt', 0);
    if (Date.now() - last < CHECK_EVERY) {
      const cached = await readSetting('updateAvailable', null);
      return cached && isNewer(cached.version, currentVersion()) ? cached : null;
    }
  }
  const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'GiaMia' },
  });
  if (!res.ok) throw new Error('Update check failed (' + res.status + ')');
  const rel = await res.json();
  const apk = (rel.assets || []).find(a => /\.apk$/i.test(a.name));
  const version = (rel.tag_name || '').replace(/^v/, '');
  const found = apk && isNewer(version, currentVersion())
    ? { version, notes: notesFrom(rel.body), url: apk.browser_download_url, size: apk.size }
    : null;
  await writeSetting('updateCheckedAt', Date.now());
  await writeSetting('updateAvailable', found);
  return found;
}

// Downloads the new APK and opens Android's installer. The first time, Android asks her to allow
// Gia Mia to install apps; after that it's just "Update".
export async function installUpdate(update) {
  try {
    const dir = new Directory(Paths.cache, 'updates');
    if (dir.exists) dir.delete();
    dir.create();
    const file = await File.downloadFileAsync(update.url, new File(dir, `GiaMia-${update.version}.apk`), { idempotent: true });
    await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
      data: file.contentUri,
      type: 'application/vnd.android.package-archive',
      flags: 1 | 0x10000000, // FLAG_GRANT_READ_URI_PERMISSION | FLAG_ACTIVITY_NEW_TASK
    });
    return 'installer';
  } catch (e) {
    // Fall back to downloading in the browser, then tapping the download to install.
    await Linking.openURL(update.url);
    return 'browser';
  }
}

export const fmtMB = bytes => (bytes ? Math.round(bytes / 1e6) + ' MB' : '');
