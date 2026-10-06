import React, { useCallback, useEffect, useState } from 'react';
import { AppState, Platform, Text, View } from 'react-native';
import { C } from './theme';
import { useGoals } from './store';
import { connectSteps, openHealthConnectInstall, stepsForDays, stepsStatus } from './steps';
import { Btn, Card, H, Muted } from './ui';

// Shows steps for the given day, or a friendly way to connect Health Connect.
export default function StepsCard({ date }) {
  const goals = useGoals();
  const [status, setStatus] = useState(null);
  const [steps, setSteps] = useState(null);

  const refresh = useCallback(async () => {
    const st = await stepsStatus();
    setStatus(st);
    if (st === 'connected') {
      const [n] = await stepsForDays([date]);
      setSteps(n);
    }
  }, [date]);

  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', s => s === 'active' && refresh());
    return () => sub.remove();
  }, [refresh]);

  if (Platform.OS === 'web' && goals) {
    return (
      <Card style={{ gap: 8 }}>
        <H>Steps 👟</H>
        <Muted>On Gia's phone, her daily steps show here against her {(goals.steps || 8000).toLocaleString('en-GB')} step goal, from Health Connect. Steps can't be read in this browser preview.</Muted>
      </Card>
    );
  }
  if (!status || status === 'unsupported' || !goals) return null;
  const goal = goals.steps || 8000;

  if (status !== 'connected') {
    return (
      <Card style={{ gap: 8 }}>
        <H>Steps 👟</H>
        {status === 'not-connected' ? (
          <>
            <Muted>See your daily steps here. They come from Health Connect, which collects them from your phone, Samsung Health, Google Fit or a watch.</Muted>
            <Btn title="Connect steps" onPress={async () => { await connectSteps(); refresh(); }} />
          </>
        ) : (
          <>
            <Muted>Steps need Google's free Health Connect app{status === 'needs-update' ? ' to be updated' : ''}. Install it, then come back here.</Muted>
            <Btn title={status === 'needs-update' ? 'Update Health Connect' : 'Get Health Connect'} onPress={openHealthConnectInstall} />
          </>
        )}
      </Card>
    );
  }

  const n = steps || 0;
  const pct = Math.min(100, (n / goal) * 100);
  return (
    <Card>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <H>Steps 👟</H>
        <Text style={{ color: C.good, fontWeight: '800', fontVariant: ['tabular-nums'] }}>
          {steps == null ? '…' : n.toLocaleString('en-GB')} <Text style={{ color: C.muted, fontWeight: '600' }}>/ {goal.toLocaleString('en-GB')}</Text>
        </Text>
      </View>
      <View style={{ height: 10, borderRadius: 99, backgroundColor: C.sunk, overflow: 'hidden', marginTop: 10 }}>
        <View style={{ height: '100%', width: pct + '%', backgroundColor: C.good }} />
      </View>
      {n >= goal ? <Muted style={{ marginTop: 8 }}>Step goal reached 🎉</Muted> : null}
    </Card>
  );
}
