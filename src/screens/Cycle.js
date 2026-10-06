import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { C } from '../theme';
import { dateKey, useSetting } from '../store';
import { DEFAULT_CYCLE, FLOWS, PHASES, SYMPTOMS, addDays, dayKind, predict, saveCycle } from '../cycle';
import { ensurePermission } from '../reminders';
import { Btn, Card, Chip, H, Muted, Sheet, s as ui } from '../ui';

const fmt = d => d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
const KIND_STYLE = {
  period: { backgroundColor: C.accent, color: '#fff' },
  spotting: { backgroundColor: '#F4A3BE', color: C.ink },
  predicted: { borderWidth: 2, borderColor: C.accent, borderStyle: 'dashed', color: C.accent },
  fertile: { backgroundColor: '#E6DDF7', color: '#5B3FA0' },
  ovulation: { backgroundColor: '#7B5CB8', color: '#fff' },
};

export default function Cycle({ onToast }) {
  const stored = useSetting('cycle', DEFAULT_CYCLE);
  const cycle = stored ? { ...DEFAULT_CYCLE, ...stored, days: stored.days || {} } : null;
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1, 12); });
  const [edit, setEdit] = useState(null); // Date being edited
  const pred = useMemo(() => (cycle ? predict(cycle) : null), [stored]); // eslint-disable-line
  if (!cycle) return null;

  const today = new Date(); today.setHours(12, 0, 0, 0);
  const todayRec = cycle.days[dateKey(today)];

  async function periodStartedToday() {
    const days = { ...cycle.days, [dateKey(today)]: { ...(todayRec || {}), flow: todayRec?.flow && todayRec.flow !== 'spotting' ? todayRec.flow : 'medium' } };
    await saveCycle({ ...cycle, days });
    onToast && onToast('Period logged for today');
  }

  return (
    <>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 110 }}>
        <Summary pred={pred} />

        <View style={{ flexDirection: 'row', gap: 8 }}>
          {pred.phase !== 'period' || !todayRec?.flow
            ? <Btn title={pred.hasData && pred.phase === 'period' ? 'Log period today' : 'Period started today'} onPress={periodStartedToday} style={{ flex: 1 }} />
            : null}
          <Btn kind="ghost" title="Log symptoms" onPress={() => setEdit(today)} style={{ flex: 1 }} />
        </View>

        <Calendar month={month} setMonth={setMonth} cycle={cycle} pred={pred} onPick={setEdit} />

        <Settings cycle={cycle} pred={pred} onToast={onToast} />

        <Muted style={{ textAlign: 'center' }}>
          Predictions are estimates based on your own history and get better as you log more cycles. They're not a form of contraception. Everything stays on this phone.
        </Muted>
      </ScrollView>

      <Sheet visible={!!edit} title={edit ? fmt(edit) : ''} onClose={() => setEdit(null)}>
        {edit && <DayEditor date={edit} cycle={cycle} onDone={msg => { setEdit(null); msg && onToast && onToast(msg); }} />}
      </Sheet>
    </>
  );
}

function Summary({ pred }) {
  if (!pred.hasData) {
    return (
      <Card style={{ backgroundColor: C.accentSoft, borderColor: C.accentSoft, gap: 6 }}>
        <H>Your cycle 🌸</H>
        <Muted>Log the first day of your period and the app will start predicting your next one. Logging past periods on the calendar makes predictions better straight away.</Muted>
      </Card>
    );
  }
  const ph = PHASES[pred.phase];
  return (
    <Card style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ width: 84, height: 84, borderRadius: 42, borderWidth: 6, borderColor: ph.color, alignItems: 'center', justifyContent: 'center' }}>
          <Muted>Day</Muted>
          <Text style={{ fontSize: 26, fontWeight: '800', color: C.ink }}>{pred.cycleDay}</Text>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontWeight: '800', fontSize: 17, color: ph.color }}>{ph.label}</Text>
          {pred.late > 0
            ? <Text style={{ color: C.ink }}>Period is {pred.late} day{pred.late === 1 ? '' : 's'} later than usual</Text>
            : pred.phase === 'period'
              ? <Text style={{ color: C.ink }}>Next one expected around {fmt(pred.nextStart)}</Text>
              : <Text style={{ color: C.ink }}>Next period in about <Text style={{ fontWeight: '800' }}>{pred.daysToNext} day{pred.daysToNext === 1 ? '' : 's'}</Text> ({fmt(pred.nextStart)})</Text>}
          <Muted>Cycle {pred.cycleLen} days · period {pred.periodLen} days{pred.fromHistory ? ' (from your history)' : ' (your settings)'}</Muted>
        </View>
      </View>
      <Text style={{ color: C.ink, lineHeight: 20 }}>{ph.tip}</Text>
    </Card>
  );
}

function Calendar({ month, setMonth, cycle, pred, onPick }) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1, 12);
  const offset = (first.getDay() + 6) % 7; // Monday first
  const daysIn = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysIn; d++) cells.push(new Date(month.getFullYear(), month.getMonth(), d, 12));
  while (cells.length % 7) cells.push(null);
  const todayKey = dateKey(new Date());
  const shift = n => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1, 12));

  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <Pressable onPress={() => shift(-1)} hitSlop={10}><Text style={nav}>‹</Text></Pressable>
        <H>{month.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</H>
        <Pressable onPress={() => shift(1)} hitSlop={10}><Text style={nav}>›</Text></Pressable>
      </View>
      <View style={{ flexDirection: 'row' }}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((l, i) => <Text key={i} style={{ flex: 1, textAlign: 'center', color: C.muted, fontSize: 12, fontWeight: '600' }}>{l}</Text>)}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 }}>
        {cells.map((d, i) => {
          if (!d) return <View key={i} style={{ width: `${100 / 7}%`, height: 44 }} />;
          const kind = dayKind(cycle, pred, d);
          const st = kind ? KIND_STYLE[kind] : {};
          const rec = cycle.days[dateKey(d)];
          const isToday = dateKey(d) === todayKey;
          return (
            <Pressable key={i} onPress={() => onPick(d)} style={{ width: `${100 / 7}%`, height: 44, alignItems: 'center', justifyContent: 'center' }}>
              <View style={[{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }, st, isToday && !kind && { borderWidth: 2, borderColor: C.ink }]}>
                <Text style={{ color: st.color || C.ink, fontWeight: isToday ? '800' : '600' }}>{d.getDate()}</Text>
              </View>
              {rec?.symptoms?.length || rec?.note ? <View style={{ position: 'absolute', bottom: 1, width: 5, height: 5, borderRadius: 3, backgroundColor: C.muted }} /> : null}
            </Pressable>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10 }}>
        {[['period', 'Period'], ['predicted', 'Predicted'], ['fertile', 'Fertile'], ['ovulation', 'Ovulation']].map(([k, l]) => (
          <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={[{ width: 14, height: 14, borderRadius: 7 }, KIND_STYLE[k]]} />
            <Muted>{l}</Muted>
          </View>
        ))}
      </View>
      <Muted style={{ marginTop: 8 }}>Tap any day to log or edit it, including past periods.</Muted>
    </Card>
  );
}

function DayEditor({ date, cycle, onDone }) {
  const key = dateKey(date);
  const rec = cycle.days[key] || {};
  const [flow, setFlow] = useState(rec.flow || null);
  const [sym, setSym] = useState(rec.symptoms || []);
  const [note, setNote] = useState(rec.note || '');
  const toggle = x => setSym(v => (v.includes(x) ? v.filter(y => y !== x) : [...v, x]));

  async function save() {
    const days = { ...cycle.days };
    if (!flow && !sym.length && !note.trim()) delete days[key];
    else days[key] = { flow, symptoms: sym, note: note.trim() };
    await saveCycle({ ...cycle, days });
    onDone('Saved');
  }

  return (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 8 }}>
        <H>Period</H>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          <Chip label="None" active={!flow} onPress={() => setFlow(null)} />
          {FLOWS.map(f => <Chip key={f.key} label={f.label} active={flow === f.key} onPress={() => setFlow(f.key)} />)}
        </View>
      </View>
      <View style={{ gap: 8 }}>
        <H>How are you feeling?</H>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {SYMPTOMS.map(x => <Chip key={x} label={x} active={sym.includes(x)} onPress={() => toggle(x)} />)}
        </View>
      </View>
      <View style={{ gap: 8 }}>
        <H>Notes</H>
        <TextInput value={note} onChangeText={setNote} multiline placeholder="Anything you want to remember…" placeholderTextColor="#C9A3AF"
          style={[ui.input, { minHeight: 80, textAlignVertical: 'top' }]} />
      </View>
      <Btn title="Save" onPress={save} />
    </View>
  );
}

function Settings({ cycle, pred, onToast }) {
  const [cl, setCl] = useState(String(cycle.cycleLen));
  const [pl, setPl] = useState(String(cycle.periodLen));
  useEffect(() => { setCl(String(cycle.cycleLen)); setPl(String(cycle.periodLen)); }, [cycle.cycleLen, cycle.periodLen]);
  const step = (v, set, d, min, max) => set(String(Math.min(max, Math.max(min, (parseInt(v, 10) || 0) + d))));

  async function save() {
    await saveCycle({ ...cycle, cycleLen: parseInt(cl, 10) || 28, periodLen: parseInt(pl, 10) || 5 });
    onToast && onToast('Saved');
  }
  async function toggleRemind(v) {
    if (v && !(await ensurePermission())) { onToast && onToast('Allow notifications to get reminders'); return; }
    await saveCycle({ ...cycle, remind: v });
  }

  return (
    <Card style={{ gap: 12 }}>
      <H>Cycle settings</H>
      {[['Usual cycle length', cl, setCl, 18, 45], ['Usual period length', pl, setPl, 2, 10]].map(([label, v, set, min, max]) => (
        <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ flex: 1, color: C.ink, fontWeight: '600' }}>{label}</Text>
          <Pressable onPress={() => step(v, set, -1, min, max)} style={circ}><Text style={circTxt}>−</Text></Pressable>
          <Text style={{ width: 64, textAlign: 'center', color: C.ink, fontWeight: '700' }}>{v} days</Text>
          <Pressable onPress={() => step(v, set, 1, min, max)} style={circ}><Text style={circTxt}>+</Text></Pressable>
        </View>
      ))}
      <Muted>{pred.fromHistory ? `Your logged history (${pred.cycles.length} cycle${pred.cycles.length === 1 ? '' : 's'}) is used for predictions now; these are a fallback.` : 'Used until you have logged two periods.'}</Muted>
      <Btn small kind="ghost" title="Save settings" onPress={save} />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: C.line, paddingTop: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.ink, fontWeight: '600' }}>Remind me before my period</Text>
          <Muted>A gentle heads-up 2 days before it's due</Muted>
        </View>
        <Switch value={!!cycle.remind} onValueChange={toggleRemind} trackColor={{ true: C.accent, false: C.line }} thumbColor="#fff" />
      </View>
    </Card>
  );
}

// Small banner for the Diary during her period.
export function PeriodBanner({ onOpen }) {
  const stored = useSetting('cycle', DEFAULT_CYCLE);
  if (!stored) return null;
  const pred = predict({ ...DEFAULT_CYCLE, ...stored, days: stored.days || {} });
  if (!pred.hasData) return null;
  const soon = pred.phase !== 'period' && pred.daysToNext >= 0 && pred.daysToNext <= 2 && !pred.late;
  if (pred.phase !== 'period' && !soon) return null;
  return (
    <Pressable onPress={onOpen} style={{ backgroundColor: C.accentSoft, borderRadius: 16, padding: 14, gap: 4 }}>
      <Text style={{ color: C.ink, fontWeight: '800' }}>{pred.phase === 'period' ? `Period · day ${pred.cycleDay} 💗` : 'Period due soon 🌸'}</Text>
      <Text style={{ color: C.ink, lineHeight: 20 }}>
        Iron-rich picks: lentils, spinach, kala chana, pumpkin seeds. Cravings and a little water weight are normal around now, so don't let the scale worry you.
      </Text>
    </Pressable>
  );
}

const nav = { fontSize: 24, color: C.accent, fontWeight: '800', paddingHorizontal: 8 };
const circ = { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' };
const circTxt = { color: C.accent, fontWeight: '800', fontSize: 16 };
