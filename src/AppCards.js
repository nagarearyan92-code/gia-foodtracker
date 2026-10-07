import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, AppState, Platform, Text, View } from 'react-native';
import { C } from './theme';
import { readSetting, useSetting, writeSetting } from './store';
import { Btn, Card, H, Muted } from './ui';
import { checkForUpdate, currentVersion, fmtMB, installUpdate } from './updates';
import { pickBackup, restoreBackup, shareBackup, summarise } from './backup';

const fmtDate = iso => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

function useUpdateInstaller(onToast) {
  const [state, setState] = useState('idle'); // idle | downloading | installer
  const run = async update => {
    setState('downloading');
    const how = await installUpdate(update);
    setState(how === 'installer' ? 'installer' : 'idle');
    if (how === 'browser') onToast && onToast('Downloading… tap the download when it finishes');
  };
  return [state, run];
}

function UpdateBody({ update, state, onUpdate, onLater }) {
  return (
    <>
      {update.notes ? <Text style={{ color: C.ink, fontSize: 14, lineHeight: 20 }}>{update.notes}</Text> : null}
      {state === 'downloading' ? (
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <ActivityIndicator color={C.accent} /><Muted>Downloading the update{update.size ? ` (${fmtMB(update.size)})` : ''}…</Muted>
        </View>
      ) : state === 'installer' ? (
        <Muted>Tap Update on the next screen. Everything you've logged stays safe. If Android asks, allow Gia Mia to install apps, then come back and tap Update now again.</Muted>
      ) : null}
      {state !== 'downloading' ? (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Btn small title="Update now" style={{ flex: 2 }} onPress={() => onUpdate(update)} />
          {onLater ? <Btn small kind="ghost" title="Later" style={{ flex: 1 }} onPress={onLater} /> : null}
        </View>
      ) : null}
    </>
  );
}

// Diary: shown when a new version is out, until she updates or taps Later.
export function UpdateBanner({ onToast }) {
  const [update, setUpdate] = useState(null);
  const [state, run] = useUpdateInstaller(onToast);
  const check = useCallback(async () => {
    try {
      const u = await checkForUpdate(false);
      const dismissed = await readSetting('updateDismissed', null);
      setUpdate(u && u.version !== dismissed ? u : null);
    } catch (e) { /* offline: try again later */ }
  }, []);
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    check();
    const sub = AppState.addEventListener('change', s => s === 'active' && check());
    return () => sub.remove();
  }, [check]);
  if (!update) return null;
  return (
    <Card style={{ backgroundColor: C.accentSoft, borderColor: C.accentSoft, gap: 10 }}>
      <Text style={{ color: C.ink, fontWeight: '800', fontSize: 15 }}>✨ A new version of Gia Mia is here</Text>
      <UpdateBody update={update} state={state} onUpdate={run}
        onLater={() => { writeSetting('updateDismissed', update.version); setUpdate(null); }} />
    </Card>
  );
}

// Me tab: version, manual update check.
export function UpdatesCard({ onToast }) {
  const [busy, setBusy] = useState(false);
  const [update, setUpdate] = useState(null);
  const [state, run] = useUpdateInstaller(onToast);
  if (Platform.OS !== 'android') {
    return (
      <Card style={{ gap: 6 }}>
        <H>App updates</H>
        <Muted>On her phone, Gia Mia checks for new versions and updates with one tap. This browser preview is always the latest.</Muted>
      </Card>
    );
  }
  async function check() {
    setBusy(true);
    try {
      const u = await checkForUpdate(true);
      setUpdate(u);
      if (!u) onToast && onToast("You're on the latest version 💗");
    } catch (e) {
      Alert.alert("Couldn't check for updates", 'Check the phone is online and try again.');
    }
    setBusy(false);
  }
  return (
    <Card style={{ gap: 10 }}>
      <H>App updates</H>
      <Muted>You're on version {currentVersion()}. New versions show up on the Diary, and updating keeps everything you've logged.</Muted>
      {update ? (
        <>
          <Text style={{ color: C.ink, fontWeight: '800' }}>Version {update.version} is available</Text>
          <UpdateBody update={update} state={state} onUpdate={run} />
        </>
      ) : (
        <Btn small kind="ghost" title={busy ? 'Checking…' : 'Check for updates'} disabled={busy} onPress={check} />
      )}
    </Card>
  );
}

// Me tab: back up to a file (Google Drive, email…) and restore from one.
export function BackupCard({ onToast }) {
  const last = useSetting('lastBackup', null);
  const [busy, setBusy] = useState(false);
  if (Platform.OS === 'web') {
    return (
      <Card style={{ gap: 6 }}>
        <H>Backup</H>
        <Muted>On her phone, she can save a backup of everything to Google Drive and restore it on any phone.</Muted>
      </Card>
    );
  }
  const stale = !last || Date.now() - new Date(last).getTime() > 14 * 864e5;

  async function backup() {
    setBusy(true);
    try {
      await shareBackup();
      onToast && onToast('Backup ready 💾');
    } catch (e) {
      Alert.alert("Couldn't make the backup", String(e?.message || e));
    }
    setBusy(false);
  }
  async function restore() {
    let b;
    try { b = await pickBackup(); } catch (e) { return Alert.alert('Wrong file', String(e?.message || e)); }
    if (!b) return;
    const s = summarise(b);
    const range = s.days ? `${s.days} days of diary (${fmtDate(s.from)} to ${fmtDate(s.to)})` : 'no diary days';
    Alert.alert('Restore this backup?',
      `Backup from ${fmtDate(s.exportedAt)} with ${range} and ${s.checkins} check-ins.\n\nThis replaces what's on this phone now.`,
      [{ text: 'Cancel', style: 'cancel' },
        { text: 'Restore', style: 'destructive', onPress: async () => { await restoreBackup(b); onToast && onToast('Backup restored 💗'); } }]);
  }

  return (
    <Card style={{ gap: 10 }}>
      <H>Backup</H>
      <Muted>
        Save a copy of everything (diary, your foods, check-ins, cycle, weight and settings) to Google Drive or anywhere you like. If you change or lose your phone, install Gia Mia and restore it.
      </Muted>
      <Text style={{ color: stale ? C.accent : C.good, fontWeight: '700' }}>
        {last ? `Last backup: ${fmtDate(last)}` : 'No backup yet'}{stale ? ' · time for a fresh one' : ' ✓'}
      </Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Btn small title={busy ? 'Preparing…' : 'Back up now'} disabled={busy} style={{ flex: 1 }} onPress={backup} />
        <Btn small kind="ghost" title="Restore" style={{ flex: 1 }} onPress={restore} />
      </View>
      <Muted>Tip: in the share menu, pick Drive and save it to your Google Drive. The Miss Curious Bae key isn't included, so paste it again after restoring on a new phone.</Muted>
    </Card>
  );
}
