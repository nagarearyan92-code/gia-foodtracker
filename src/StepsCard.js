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
  const [week, setWeek] = useState(null); // the 7 days ending on this day

  const refresh = useCallback(async () => {
    const st = await stepsStatus();
    setStatus(st);
    if (st === 'connected') {
      const days = [6, 5, 4, 3, 2, 1, 0].map(i => new Date(date.getFullYear(), date.getMonth(), date.getDate() - i, 12));
      const list = await stepsForDays(days);
      setSteps(list[6]);
      setWeek(days.map((d, i) => ({ d, n: list[i] })));
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
      {week ? <WeekBars week={week} goal={goal} /> : null}
    </Card>
  );
}

// Last 7 days at a glance, today (or the chosen day) on the right.
function WeekBars({ week, goal }) {
  const known = week.filter(x => x.n != null && x.n > 0);
  const max = Math.max(goal, ...week.map(x => x.n || 0), 1);
  const avg = known.length ? Math.round(known.reduce((a, x) => a + x.n, 0) / known.length) : 0;
  const short = n => (n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'k' : String(n));
  return (
    <View style={{ marginTop: 12, gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 74 }}>
        {week.map((x, i) => {
          const h = x.n ? Math.max(4, (x.n / max) * 52) : 4;
          const last = i === week.length - 1;
          return (
            <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 3 }}>
              <Text style={{ fontSize: 9, color: C.muted, fontVariant: ['tabular-nums'] }}>{x.n ? short(x.n) : x.n === 0 ? '0' : '–'}</Text>
              <View style={{ width: '70%', height: h, borderRadius: 4, backgroundColor: x.n >= goal ? C.good : x.n ? (last ? C.good : '#9CCFB0') : C.sunk }} />
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {week.map((x, i) => (
          <Text key={i} style={{ flex: 1, textAlign: 'center', fontSize: 11, color: i === week.length - 1 ? C.ink : C.muted, fontWeight: i === week.length - 1 ? '800' : '600' }}>
            {x.d.toLocaleDateString('en-GB', { weekday: 'narrow' })}
          </Text>
        ))}
      </View>
      <Muted>{avg ? `Last 7 days: about ${avg.toLocaleString('en-GB')} steps a day. More in Trends.` : 'Your last 7 days will fill in here.'}</Muted>
    </View>
  );
}
