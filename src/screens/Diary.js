import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { C, MACROS, MEALS, MICROS } from '../theme';
import { addWater, dateKey, removeEntry, sumNutrients, useDay, useGoals } from '../store';
import AddFlow from '../AddFlow';
import { RemindersInvite } from '../RemindersCard';
import StepsCard from '../StepsCard';
import { PeriodBanner } from './Cycle';
import { CheckInCard } from '../CheckIn';
import { SuppCard } from '../WellbeingCards';
import { UpdateBanner } from '../AppCards';
import { Bar, Btn, Card, H, Muted, Ring, r0, r1 } from '../ui';

function dayTitle(d) {
  const today = new Date(); today.setHours(12, 0, 0, 0);
  const diff = Math.round((d - today) / 864e5);
  if (diff === 0) return 'Today';
  if (diff === -1) return 'Yesterday';
  if (diff === 1) return 'Tomorrow';
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
}

export default function Diary({ onToast, onOpenRecipes, onOpenCycle }) {
  const [date, setDate] = useState(() => { const d = new Date(); d.setHours(12, 0, 0, 0); return d; });
  const key = dateKey(date);
  const day = useDay(key) || { entries: [], water: 0 };
  const goals = useGoals();
  const [flow, setFlow] = useState(null); // { meal, start }

  const total = useMemo(() => sumNutrients(day.entries.map(e => e.n)), [day]);
  if (!goals) return null;
  const left = goals.k - (total.k || 0);
  const shift = n => setDate(d => new Date(d.getTime() + n * 864e5));

  const confirmDelete = e =>
    Alert.alert('Remove from diary?', `${e.name} (${e.amountLabel})`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeEntry(key, e.id) },
    ]);

  const microsWithData = MICROS.filter(m => total[m.key] != null);

  return (
    <>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 110 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable onPress={() => shift(-1)} hitSlop={12} style={navBtn}><Text style={navTxt}>‹</Text></Pressable>
          <Text style={{ fontSize: 20, fontWeight: '800', color: C.ink }}>{dayTitle(date)}</Text>
          <Pressable onPress={() => shift(1)} hitSlop={12} style={navBtn}><Text style={navTxt}>›</Text></Pressable>
        </View>

        <Card style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
          <Ring value={total.k || 0} target={goals.k} size={132}>
            <Text style={{ fontSize: 28, fontWeight: '800', color: left < 0 ? C.warn : C.ink }}>{r0(Math.abs(left))}</Text>
            <Muted>{left < 0 ? 'kcal over' : 'kcal left'}</Muted>
          </Ring>
          <View style={{ flex: 1 }}>
            <Muted style={{ marginBottom: 8 }}>{r0(total.k)} of {goals.k} kcal eaten</Muted>
            {MACROS.map(m => <Bar key={m.key} label={m.label} value={total[m.key] || 0} target={goals[m.key]} color={m.color} />)}
          </View>
        </Card>

        <UpdateBanner onToast={onToast} />
        <StepsCard date={date} />
        <CheckInCard dayKey={key} isToday={dayTitle(date) === 'Today'} />
        <PeriodBanner onOpen={onOpenCycle} />
        <RemindersInvite onToast={onToast} />

        <Pressable onPress={() => setFlow({ meal: 'Snacks', start: 'scan' })}
          style={({ pressed }) => [{ backgroundColor: C.accent, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }, pressed && { opacity: 0.8 }]}>
          <Text style={{ fontSize: 26 }}>▦</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>Scan a barcode</Text>
            <Text style={{ color: '#FFE3EB' }}>Look up any packed food, or add it if it's new</Text>
          </View>
        </Pressable>

        {MEALS.map(meal => {
          const items = day.entries.filter(e => e.meal === meal);
          const mt = sumNutrients(items.map(e => e.n));
          return (
            <Card key={meal} style={{ paddingBottom: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <H>{meal}</H>
                <Muted>{items.length ? `${r0(mt.k)} kcal · ${r0(mt.p)} g protein` : ''}</Muted>
              </View>
              {items.map(e => (
                <Pressable key={e.id} onLongPress={() => confirmDelete(e)} onPress={() => confirmDelete(e)}
                  style={{ flexDirection: 'row', paddingVertical: 8, borderTopWidth: 1, borderTopColor: C.line, gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: C.ink, fontWeight: '600' }} numberOfLines={2}>{e.name}</Text>
                    <Muted>{e.amountLabel}</Muted>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: C.ink, fontVariant: ['tabular-nums'] }}>{r0(e.n.k)} kcal</Text>
                    <Text style={{ fontSize: 12, color: C.protein, fontVariant: ['tabular-nums'] }}>{r1(e.n.p)} g P · {r1(e.n.fi)} g fibre</Text>
                  </View>
                </Pressable>
              ))}
              <Pressable onPress={() => setFlow({ meal, start: 'search' })} style={{ paddingVertical: 10 }}>
                <Text style={{ color: C.accent, fontWeight: '700' }}>+ Add food</Text>
              </Pressable>
            </Card>
          );
        })}

        <Pressable onPress={onOpenRecipes} style={({ pressed }) => [{ backgroundColor: C.accentSoft, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center' }, pressed && { opacity: 0.7 }]}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.ink, fontWeight: '700' }}>Need ideas? 30 vegetarian recipes</Text>
            <Muted>Dal makhani, palak paneer 2.0, protein mousse and more</Muted>
          </View>
          <Text style={{ color: C.accent, fontSize: 22, fontWeight: '800' }}>›</Text>
        </Pressable>

        <SuppCard dayKey={key} />

        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <H>Water</H>
            <Text style={{ color: C.water, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{day.water || 0} / {goals.water} ml</Text>
          </View>
          <View style={{ height: 10, borderRadius: 99, backgroundColor: C.sunk, overflow: 'hidden', marginVertical: 10 }}>
            <View style={{ height: '100%', width: Math.min(100, ((day.water || 0) / goals.water) * 100) + '%', backgroundColor: C.water }} />
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Btn small kind="ghost" title="− 250 ml" onPress={() => addWater(key, -250)} style={{ flex: 1 }} />
            <Btn small title="+ 250 ml glass" onPress={() => addWater(key, 250)} style={{ flex: 2 }} />
          </View>
        </Card>

        <Card>
          <H style={{ marginBottom: 4 }}>Vitamins & minerals</H>
          <Muted style={{ marginBottom: 10 }}>
            Counted from scanned and label-entered foods that list them. Key ones to watch on a vegetarian diet: iron, B12, calcium, zinc.
          </Muted>
          {microsWithData.length === 0
            ? <Muted>Nothing recorded yet today.</Muted>
            : microsWithData.map(m => <Bar key={m.key} label={m.label} value={total[m.key]} target={m.target} unit={m.unit} color={C.fibre} limit={m.limit} />)}
        </Card>
        <Muted style={{ textAlign: 'center' }}>Tap a diary item to remove it.</Muted>
      </ScrollView>

      <AddFlow visible={!!flow} onClose={() => setFlow(null)} day={key} meal={flow?.meal || 'Snacks'} start={flow?.start} onToast={onToast} />
    </>
  );
}

const navBtn = { width: 40, height: 40, borderRadius: 20, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' };
const navTxt = { fontSize: 22, color: C.accent, fontWeight: '700', marginTop: -2 };
