import React, { useEffect, useState } from 'react';
import { Alert, Linking, Platform, Pressable, Switch, Text, View } from 'react-native';
import { C } from './theme';
import { REMINDERS, ensurePermission, fmtTime, getSettings, saveSettings } from './reminders';
import { readSetting, writeSetting } from './store';
import { Btn, Card, H, Muted } from './ui';

export async function turnOnReminders() {
  const ok = await ensurePermission();
  if (!ok) {
    Alert.alert('Notifications are off',
      'To get reminders, allow notifications for Gia Food Tracker in your phone settings.',
      [{ text: 'Not now', style: 'cancel' }, { text: 'Open settings', onPress: () => Linking.openSettings() }]);
    return false;
  }
  const s = await getSettings();
  await saveSettings({ ...s, enabled: true });
  return true;
}

// Full settings card for the Me tab.
export default function RemindersCard({ onToast }) {
  const [s, setS] = useState(null);
  useEffect(() => { getSettings().then(setS); }, []);
  if (Platform.OS === 'web') {
    return (
      <Card style={{ gap: 6 }}>
        <H>Reminders</H>
        <Muted>Meal reminders work in the Android app. This browser preview can't send notifications.</Muted>
      </Card>
    );
  }
  if (!s) return null;

  const update = async next => { setS(next); await saveSettings(next); };

  async function toggleAll(v) {
    if (v) {
      const ok = await turnOnReminders();
      if (ok) { setS(await getSettings()); onToast && onToast('Reminders on'); }
    } else {
      await update({ ...s, enabled: false });
      onToast && onToast('Reminders off');
    }
  }

  const shift = (key, mins) => {
    const it = s.items[key];
    let t = it.hour * 60 + it.minute + mins;
    t = (t + 24 * 60) % (24 * 60);
    update({ ...s, items: { ...s.items, [key]: { ...it, hour: Math.floor(t / 60), minute: t % 60 } } });
  };

  return (
    <Card style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <H>Reminders</H>
        <Switch value={s.enabled} onValueChange={toggleAll} trackColor={{ true: C.accent, false: C.line }} thumbColor="#fff" />
      </View>
      <Muted>
        Gentle nudges for meals, supplements and an evening check-in. Anything you've already done that day is skipped.
      </Muted>
      {s.enabled && REMINDERS.map(r => {
        const it = s.items[r.key];
        return (
          <View key={r.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4, borderTopWidth: 1, borderTopColor: C.line }}>
            <Switch value={it.on} onValueChange={v => update({ ...s, items: { ...s.items, [r.key]: { ...it, on: v } } })}
              trackColor={{ true: C.accent, false: C.line }} thumbColor="#fff" />
            <Text style={{ flex: 1, color: it.on ? C.ink : C.muted, fontWeight: '600' }}>{r.label}</Text>
            <Pressable onPress={() => shift(r.key, -30)} hitSlop={8} style={timeBtn}><Text style={timeTxt}>−</Text></Pressable>
            <Text style={{ width: 52, textAlign: 'center', color: C.ink, fontVariant: ['tabular-nums'], fontWeight: '700' }}>{fmtTime(it.hour, it.minute)}</Text>
            <Pressable onPress={() => shift(r.key, 30)} hitSlop={8} style={timeBtn}><Text style={timeTxt}>+</Text></Pressable>
          </View>
        );
      })}
    </Card>
  );
}

// One-time invitation shown on the Diary until she turns reminders on or dismisses it.
export function RemindersInvite({ onToast }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    Promise.all([getSettings(), readSetting('reminderInviteDismissed', false)])
      .then(([st, dismissed]) => setShow(!st.enabled && !dismissed));
  }, []);
  if (!show) return null;
  return (
    <Card style={{ backgroundColor: C.accentSoft, borderColor: C.accentSoft, gap: 10 }}>
      <Text style={{ color: C.ink, fontWeight: '700', fontSize: 15 }}>🔔 Want a little nudge now and then?</Text>
      <Muted>Reminders for meals, supplements and an evening check-in. You can change the times on the Me tab.</Muted>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Btn small title="Turn on reminders" style={{ flex: 2 }}
          onPress={async () => { if (await turnOnReminders()) { setShow(false); onToast && onToast('Reminders on'); } }} />
        <Btn small kind="ghost" title="Not now" style={{ flex: 1 }}
          onPress={() => { setShow(false); writeSetting('reminderInviteDismissed', true); }} />
      </View>
    </Card>
  );
}

const timeBtn = { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' };
const timeTxt = { color: C.accent, fontWeight: '800', fontSize: 16 };
