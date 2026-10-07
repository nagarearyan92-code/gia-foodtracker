import React, { useEffect, useState } from 'react';
import { Alert, Pressable, Switch, Text, TextInput, View } from 'react-native';
import { C } from './theme';
import { dateKey, useSetting, writeSetting } from './store';
import { DEFAULT_SUPPS, SUPP_NUTRIENTS, normalizeSupps, saveSupps, setSuppTime, toggleSupp } from './wellbeing';
import TimeRow from './TimeRow';
import { averageHM, fmtHM, nowHM } from './times';
import { KEY_PROBLEM, cleanKey, getKey, removeKey, setKey, testKey } from './ai';
import { Btn, Card, Chip, Field, H, Muted, Sheet, s as ui } from './ui';

// Diary: tick off supplements, with the time taken. Tap a taken one to change the time.
export function SuppCard({ dayKey }) {
  const raw = useSetting('supps', DEFAULT_SUPPS);
  const log = useSetting('suppLog', {});
  const times = useSetting('suppTimes', {});
  const [edit, setEdit] = useState(null); // supplement whose time is being changed
  const [history, setHistory] = useState(false);
  if (!raw || !log || !times) return null;
  const list = normalizeSupps(raw);
  if (!list.length) return null;
  const taken = log[dayKey] || [];
  const dayTimes = times[dayKey] || {};
  const done = list.every(x => taken.includes(x.id));
  const isToday = dayKey === dateKey(new Date());
  const counts = list.filter(x => x.nutrient && x.dose > 0);
  return (
    <Card style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <H>Supplements</H>
        <Text style={{ color: done ? C.good : C.muted, fontWeight: '700' }}>{done ? 'All taken ✓' : `${taken.filter(id => list.some(x => x.id === id)).length} of ${list.length}`}</Text>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {list.map(x => {
          const on = taken.includes(x.id);
          return (
            <Pressable key={x.id} onPress={() => (on ? setEdit(x) : toggleSupp(dayKey, x.id, isToday ? nowHM() : '09:00'))}
              style={[{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: C.line, backgroundColor: C.surface },
                on && { backgroundColor: C.good, borderColor: C.good }]}>
              <Text style={{ color: on ? '#fff' : C.muted, fontWeight: '800' }}>{on ? '✓' : '○'}</Text>
              <Text style={{ color: on ? '#fff' : C.ink, fontWeight: '700' }}>{x.name}{on && dayTimes[x.id] ? ` · ${fmtHM(dayTimes[x.id])}` : ''}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Muted style={{ flex: 1 }}>{counts.length ? `${counts.map(x => `${x.name} ${x.dose} ${x.unit}`).join(', ')} counted in your vitamins below.` : 'Tap to tick off. Tap again to change the time.'}</Muted>
        <Pressable onPress={() => setHistory(true)} hitSlop={8}><Text style={{ color: C.accent, fontWeight: '700' }}>History</Text></Pressable>
      </View>

      <Sheet visible={!!edit} title={edit ? edit.name : ''} onClose={() => setEdit(null)}>
        {edit ? <SuppTimeEditor x={edit} dayKey={dayKey} time={dayTimes[edit.id] || '09:00'} onDone={() => setEdit(null)} /> : null}
      </Sheet>
      <Sheet visible={history} title="Supplement history" onClose={() => setHistory(false)}>
        {history ? <SuppHistory list={list} log={log} times={times} /> : null}
      </Sheet>
    </Card>
  );
}

function SuppTimeEditor({ x, dayKey, time, onDone }) {
  const [t, setT] = useState(time);
  return (
    <View style={{ gap: 16 }}>
      <TimeRow label="Taken at" value={t} onChange={setT} />
      <Btn title="Save" onPress={async () => { await setSuppTime(dayKey, x.id, t); onDone(); }} />
      <Btn kind="ghost" title="I didn't take it" onPress={async () => { await toggleSupp(dayKey, x.id); onDone(); }} />
    </View>
  );
}

// Last 14 days, one row per supplement.
function SuppHistory({ list, log, times }) {
  const days = [];
  for (let i = 13; i >= 0; i--) { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - i); days.push(d); }
  return (
    <View style={{ gap: 18 }}>
      {list.map(x => {
        const took = days.map(d => (log[dateKey(d)] || []).includes(x.id));
        const n = took.filter(Boolean).length;
        const missed = days.filter((d, i) => !took[i] && i < 13).map(d => d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' }));
        const ts = days.map(d => (times[dateKey(d)] || {})[x.id]).filter(Boolean);
        return (
          <View key={x.id} style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: C.ink, fontWeight: '800', fontSize: 16 }}>{x.name}</Text>
              <Text style={{ color: n >= 12 ? C.good : C.ink, fontWeight: '700' }}>{n} of 14 days</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {days.map((d, i) => (
                <View key={i} style={{ flex: 1, alignItems: 'center', gap: 3 }}>
                  <View style={{ width: '100%', aspectRatio: 1, maxWidth: 22, borderRadius: 6, backgroundColor: took[i] ? C.good : C.sunk }} />
                  <Text style={{ fontSize: 9, color: C.muted }}>{d.toLocaleDateString('en-GB', { weekday: 'narrow' })}</Text>
                </View>
              ))}
            </View>
            {ts.length >= 3 ? <Muted>Usually taken around {fmtHM(averageHM(ts))}.</Muted> : null}
            {missed.length && missed.length <= 5 ? <Muted>Missed: {missed.join(', ')}</Muted> : null}
          </View>
        );
      })}
      <Muted>Today is on the right.</Muted>
    </View>
  );
}

// Me tab: the supplement list, with doses that count toward vitamin totals.
export function SuppSettings({ onToast }) {
  const raw = useSetting('supps', DEFAULT_SUPPS);
  const [name, setName] = useState('');
  const [edit, setEdit] = useState(null);
  if (!raw) return null;
  const list = normalizeSupps(raw);
  const add = async () => {
    const n = name.trim();
    if (!n) return;
    await saveSupps([...list, { id: 's' + Date.now().toString(36), name: n }]);
    setName('');
    onToast && onToast('Added ' + n);
  };
  return (
    <Card style={{ gap: 10 }}>
      <H>Supplements</H>
      {list.map(x => (
        <Pressable key={x.id} onPress={() => setEdit(x)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, borderTopWidth: 1, borderTopColor: C.line }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.ink, fontWeight: '700' }}>{x.name}{x.dose > 0 ? ` · ${x.dose} ${x.unit}` : ''}</Text>
            <Muted>{x.nutrient && x.dose > 0 ? `Counts toward ${SUPP_NUTRIENTS.find(n => n.key === x.nutrient)?.label.toLowerCase()}` : x.nutrient ? 'Tap to add the dose from the pack' : x.hint || 'Tap to edit'}</Muted>
          </View>
          <Text style={{ color: C.accent, fontWeight: '700' }}>Edit</Text>
        </Pressable>
      ))}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput value={name} onChangeText={setName} placeholder="Add one, e.g. Magnesium" placeholderTextColor="#C9A3AF" style={[ui.input, { flex: 1 }]} />
        <Btn title="Add" onPress={add} style={{ paddingHorizontal: 18 }} />
      </View>
      <Muted>The supplement reminder is in Reminders above.</Muted>
      <Sheet visible={!!edit} title={edit ? edit.name : ''} onClose={() => setEdit(null)}>
        {edit ? <SuppEditor x={edit} list={list} onDone={msg => { setEdit(null); msg && onToast && onToast(msg); }} /> : null}
      </Sheet>
    </Card>
  );
}

function SuppEditor({ x, list, onDone }) {
  const [name, setName] = useState(x.name);
  const [dose, setDose] = useState(x.dose > 0 ? String(x.dose) : '');
  const [nutrient, setNutrient] = useState(x.nutrient || null);
  const units = SUPP_NUTRIENTS.find(n => n.key === nutrient)?.units || ['mg', 'µg'];
  const [unit, setUnit] = useState(x.unit && units.includes(x.unit) ? x.unit : units[0]);
  const save = async () => {
    const d = parseFloat(dose);
    await saveSupps(list.map(y => (y.id === x.id ? { ...y, name: name.trim() || y.name, nutrient, dose: d > 0 ? d : null, unit: units.includes(unit) ? unit : units[0] } : y)));
    onDone('Saved');
  };
  const remove = () => Alert.alert(`Remove ${x.name}?`, 'It will no longer appear on the Diary. Past days are kept.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Remove', style: 'destructive', onPress: async () => { await saveSupps(list.filter(y => y.id !== x.id)); onDone('Removed'); } },
  ]);
  return (
    <View style={{ gap: 16 }}>
      <Field label="Name" value={name} onChangeText={setName} />
      <View style={{ gap: 8 }}>
        <H>Counts toward</H>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          <Chip label="Nothing" active={!nutrient} onPress={() => setNutrient(null)} />
          {SUPP_NUTRIENTS.map(n => <Chip key={n.key} label={n.label} active={nutrient === n.key} onPress={() => { setNutrient(n.key); if (!n.units.includes(unit)) setUnit(n.units[0]); }} />)}
        </View>
      </View>
      {nutrient ? (
        <View style={{ gap: 8 }}>
          <H>Dose per day (from the pack)</H>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
            <Field label="Amount" value={dose} onChangeText={setDose} numeric />
            <View style={{ flexDirection: 'row', gap: 6, flex: 1.2 }}>
              {units.map(u => <Chip key={u} label={u} active={unit === u} onPress={() => setUnit(u)} />)}
            </View>
          </View>
          <Muted>{nutrient === 'iron' ? 'Use the amount of iron itself, e.g. "14 mg iron", not the total tablet weight (like 210 mg ferrous fumarate).' : nutrient === 'vd' ? '1,000 IU = 25 µg. Either unit is fine.' : 'Use the amount on the pack per daily dose.'}</Muted>
        </View>
      ) : null}
      <Btn title="Save" onPress={save} />
      <Btn kind="ghost" title="Remove supplement" onPress={remove} />
    </View>
  );
}

// Me tab: paste or remove the Anthropic API key.
export function AiSettings({ onToast }) {
  const [has, setHas] = useState(null);
  const [val, setVal] = useState('');
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState(null); // null | { ok, code }
  useEffect(() => { getKey().then(k => setHas(!!k)); }, []);
  if (has === null) return null;

  async function save() {
    const k = cleanKey(val);
    if (!k.startsWith('sk-ant-')) return Alert.alert('That doesn\'t look right', 'The key should start with sk-ant-. Copy it again from the Claude Console.');
    setChecking(true);
    const r = await testKey(k);
    setChecking(false);
    // A key that's simply offline/busy to check is still saved; a rejected key isn't.
    if (!r.ok && (r.code === 'bad-key' || r.code === 'no-access')) {
      setStatus(r);
      return Alert.alert('That key didn\'t work', KEY_PROBLEM[r.code]);
    }
    await setKey(k);
    setVal(''); setHas(true); setStatus(r);
    onToast && onToast(r.ok ? 'Miss Curious Bae is ready 🌸' : 'Key saved');
  }
  async function check() {
    setChecking(true);
    const r = await testKey();
    setChecking(false); setStatus(r);
    onToast && onToast(r.ok ? 'Key works 🌸' : 'Key problem');
  }
  const problem = status && !status.ok ? (KEY_PROBLEM[status.code] || KEY_PROBLEM.error) + (status.code === 'error' && status.message ? ` (${status.message})` : '') : '';
  return (
    <Card style={{ gap: 10 }}>
      <H>Miss Curious Bae 🌸</H>
      <Muted>Your AI check-in buddy. She replies to how you're feeling.</Muted>
      {has ? (
        <>
          {problem
            ? <Text style={{ color: C.accent, fontWeight: '700' }}>✗ {problem}</Text>
            : <Text style={{ color: C.good, fontWeight: '700' }}>{status?.ok ? '✓ Key checked and working.' : '✓ Key saved.'} She'll reply to your check-ins.</Text>}
          <Muted>The key is stored securely on this phone only. What you write in a check-in, plus a short summary of your day, is sent to Anthropic's Claude, which powers her replies.</Muted>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Btn small title={checking ? 'Checking…' : 'Test key'} disabled={checking} onPress={check} style={{ flex: 1 }} />
            <Btn small kind="ghost" title={problem ? 'Replace key' : 'Remove key'} style={{ flex: 1 }} onPress={() => Alert.alert(problem ? 'Remove this key?' : 'Turn off Miss Curious Bae?', problem ? 'Then paste a new one.' : 'Check-ins will use short built-in replies instead.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Remove', style: 'destructive', onPress: async () => { await removeKey(); setHas(false); setStatus(null); } },
            ])} />
          </View>
        </>
      ) : (
        <>
          <Muted>Paste the API key from the Claude Console to turn her on. Without it, check-ins get short built-in notes.</Muted>
          <TextInput value={val} onChangeText={setVal} placeholder="sk-ant-…" placeholderTextColor="#C9A3AF" autoCapitalize="none" autoCorrect={false}
            secureTextEntry style={ui.input} />
          {problem ? <Text style={{ color: C.accent, fontWeight: '700' }}>✗ {problem}</Text> : null}
          <Btn title={checking ? 'Checking the key…' : 'Save key'} onPress={save} disabled={!val.trim() || checking} />
        </>
      )}
      <BubbleSwitch />
    </Card>
  );
}

function BubbleSwitch() {
  const hidden = useSetting('bubbleHidden', false);
  if (hidden === null) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: C.line, paddingTop: 10, gap: 10 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: C.ink, fontWeight: '600' }}>Show chat bubble 🌸</Text>
        <Muted>A little bubble on every screen to chat with her any time. Drag it wherever you like.</Muted>
      </View>
      <Switch value={!hidden} onValueChange={v => writeSetting('bubbleHidden', !v)} trackColor={{ true: C.accent, false: C.line }} thumbColor="#fff" />
    </View>
  );
}
