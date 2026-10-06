import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { C } from '../theme';
import { dateKey, deleteWeight, logWeight, saveGoals, useGoals, useWeights } from '../store';
import { Btn, Card, Field, H, Muted, r1 } from '../ui';
import RemindersCard from '../RemindersCard';

export default function Me({ onToast }) {
  const goals = useGoals();
  const weights = useWeights() || [];
  const [g, setG] = useState(null);
  const [kg, setKg] = useState('');

  useEffect(() => { if (goals && !g) setG(Object.fromEntries(Object.entries(goals).map(([k, v]) => [k, String(v)]))); }, [goals]); // eslint-disable-line
  if (!g) return null;
  const set = k => t => setG(x => ({ ...x, [k]: t }));
  const lastKg = weights.length ? weights[weights.length - 1].kg : null;

  async function save() {
    const out = {};
    for (const k in g) out[k] = parseFloat(g[k]) || 0;
    await saveGoals(out);
    onToast('Targets saved');
  }
  async function addKg() {
    const v = parseFloat(kg);
    if (!v || v < 25 || v > 250) return Alert.alert('Check the number', 'Enter your weight in kg, e.g. 62.5');
    await logWeight(dateKey(new Date()), v);
    setKg('');
    onToast('Weight logged');
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 110 }} keyboardShouldPersistTaps="handled">
      <Card style={{ backgroundColor: C.accentSoft, borderColor: C.accentSoft, gap: 8 }}>
        <Text style={{ fontSize: 15, lineHeight: 22, color: C.ink }}>
          I made this little corner of the internet just for you. Every recipe in here is something I thought you'd love, and every food is one you actually buy.
        </Text>
        <Text style={{ fontSize: 15, lineHeight: 22, color: C.ink }}>
          You don't have to be perfect with it. Some days you'll log everything, some days you'll forget, and that's completely fine. I'm proud of you for taking care of yourself, and I'm right here cheering you on, one meal at a time.
        </Text>
      </Card>

      <RemindersCard onToast={onToast} />

      <Card style={{ gap: 10 }}>
        <H>Weight</H>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
          <Field label={lastKg ? `Today (last: ${lastKg} kg)` : 'Today (kg)'} value={kg} onChangeText={setKg} numeric />
          <Btn title="Log" onPress={addKg} style={{ paddingHorizontal: 22 }} />
        </View>
        {weights.slice(-5).reverse().map(w => (
          <View key={w.date} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
            <Muted>{new Date(w.date + 'T12:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</Muted>
            <Text style={{ color: C.ink, fontVariant: ['tabular-nums'] }} onLongPress={() => deleteWeight(w.date)}>{r1(w.kg)} kg</Text>
          </View>
        ))}
      </Card>

      <Card style={{ gap: 10 }}>
        <H>Daily targets</H>
        <Muted>A common starting point for active adults is 1.2–1.6 g protein per kg of body weight and about 30 g fibre a day.</Muted>
        {lastKg ? <Btn small kind="ghost" title={`Set protein to 1.4 g/kg (${Math.round(lastKg * 1.4)} g)`} onPress={() => set('p')(String(Math.round(lastKg * 1.4)))} /> : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {[['k', 'Calories'], ['p', 'Protein g'], ['c', 'Carbs g'], ['f', 'Fat g'], ['fi', 'Fibre g'], ['water', 'Water ml']].map(([k, l]) => (
            <Field key={k} label={l} value={g[k]} onChangeText={set(k)} numeric style={{ minWidth: '30%' }} />
          ))}
        </View>
        <Btn title="Save targets" onPress={save} />
      </Card>

      <Muted style={{ textAlign: 'center' }}>
        Everything is saved on this phone. Barcode lookups use Open Food Facts, a free food database; values from it are crowd-sourced, so check the pack if a number looks odd.
      </Muted>
    </ScrollView>
  );
}
