import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { C } from './theme';
import { readSetting, saveGoals, useGoals, useWeights, writeSetting } from './store';
import { ACTIVITY, DEFAULT_PROFILE, GOALS, calculate } from './tdee';
import { Btn, Card, Chip, Field, H, Muted } from './ui';

// Re-run the calculator after a weight log, if she chose auto-update.
export async function autoUpdateTargets(weight) {
  const profile = await readSetting('profile', null);
  if (!profile || !profile.auto || !profile.applied) return false;
  const r = calculate(profile, weight);
  if (!r) return false;
  const goals = await readSetting('goals', {});
  await saveGoals({ ...goals, k: r.k, p: r.p, c: r.c, f: r.f, fi: r.fi });
  return true;
}

export default function TdeeCard({ onToast }) {
  const weights = useWeights() || [];
  const goals = useGoals();
  const [p, setP] = useState(null);
  const lastKg = weights.length ? weights[weights.length - 1].kg : null;
  const [kg, setKg] = useState('');

  useEffect(() => { readSetting('profile', DEFAULT_PROFILE).then(v => setP({ ...DEFAULT_PROFILE, ...v })); }, []);
  useEffect(() => { if (lastKg && !kg) setKg(String(lastKg)); }, [lastKg]); // eslint-disable-line

  // Remember what she typed (keeping whether targets were applied).
  useEffect(() => {
    if (!p) return;
    readSetting('profile', {}).then(old => writeSetting('profile', { ...p, applied: p.applied ?? old.applied }));
  }, [p]);

  const result = useMemo(() => (p ? calculate(p, kg) : null), [p, kg]);
  if (!p || !goals) return null;
  const set = k => v => setP(x => ({ ...x, [k]: v }));

  async function apply() {
    await saveGoals({ ...goals, k: result.k, p: result.p, c: result.c, f: result.f, fi: result.fi });
    setP(x => ({ ...x, applied: true }));
    onToast && onToast('Targets updated');
  }

  return (
    <Card style={{ gap: 12 }}>
      <H>Calorie calculator</H>
      <Muted>Estimates how much energy you use a day (your TDEE) and suggests targets.</Muted>

      <View style={{ flexDirection: 'row', gap: 6 }}>
        <Chip label="Female" active={p.sex === 'female'} onPress={() => set('sex')('female')} />
        <Chip label="Male" active={p.sex === 'male'} onPress={() => set('sex')('male')} />
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Field label="Age" value={p.age} onChangeText={set('age')} numeric />
        <Field label="Height (cm)" value={p.height} onChangeText={set('height')} numeric />
        <Field label="Weight (kg)" value={kg} onChangeText={setKg} numeric />
      </View>

      <Muted>How active are you?</Muted>
      <View style={{ gap: 6 }}>
        {ACTIVITY.map(a => (
          <Pressable key={a.key} onPress={() => set('activity')(a.key)}
            style={[opt, p.activity === a.key && optOn]}>
            <Text style={{ fontWeight: '700', color: C.ink }}>{a.label}</Text>
            <Muted>{a.hint}</Muted>
          </Pressable>
        ))}
      </View>

      <Muted>Your goal</Muted>
      <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
        {GOALS.map(g => <Chip key={g.key} label={g.label} active={p.goal === g.key} onPress={() => set('goal')(g.key)} />)}
      </View>

      {result ? (
        <View style={{ backgroundColor: C.accentSoft, borderRadius: 12, padding: 14, gap: 6 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Muted>Resting (BMR)</Muted><Text style={num}>{result.bmr} kcal</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Muted>Daily use (TDEE)</Muted><Text style={num}>{result.tdee} kcal</Text>
          </View>
          <View style={{ height: 1, backgroundColor: C.line, marginVertical: 4 }} />
          <Text style={{ fontSize: 22, fontWeight: '800', color: C.accent }}>{result.k} kcal a day</Text>
          <Muted>Protein {result.p} g · Carbs {result.c} g · Fat {result.f} g · Fibre {result.fi} g</Muted>
          {result.clamped ? <Muted>Kept at or above your resting needs, so it never goes too low.</Muted> : null}
          <Btn title="Use these as my targets" onPress={apply} style={{ marginTop: 6 }} />
          <Pressable onPress={() => set('auto')(!p.auto)} style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 4 }}>
            <View style={[box, p.auto && { backgroundColor: C.accent, borderColor: C.accent }]}>
              {p.auto ? <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>✓</Text> : null}
            </View>
            <Muted style={{ flex: 1 }}>Update my targets automatically when I log my weight</Muted>
          </Pressable>
        </View>
      ) : (
        <Muted>Fill in age, height and weight to see your numbers.</Muted>
      )}
      <Muted>These are estimates. Bodies vary, so adjust if your energy or weight trend says otherwise.</Muted>
    </Card>
  );
}

const opt = { borderWidth: 1, borderColor: C.line, borderRadius: 12, padding: 10, backgroundColor: C.surface };
const optOn = { borderColor: C.accent, backgroundColor: C.accentSoft };
const num = { color: C.ink, fontWeight: '700', fontVariant: ['tabular-nums'] };
const box = { width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: C.line, alignItems: 'center', justifyContent: 'center' };
