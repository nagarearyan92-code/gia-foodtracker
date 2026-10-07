import React, { useEffect, useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { C } from './theme';
import { useSetting } from './store';
import { DEFAULT_SUPPS, saveSupps, toggleSupp } from './wellbeing';
import { KEY_PROBLEM, cleanKey, getKey, removeKey, setKey, testKey } from './ai';
import { Btn, Card, H, Muted, s as ui } from './ui';

// Diary: tick off today's supplements.
export function SuppCard({ dayKey }) {
  const list = useSetting('supps', DEFAULT_SUPPS);
  const log = useSetting('suppLog', {});
  if (!list || !log || !list.length) return null;
  const taken = log[dayKey] || [];
  const done = list.every(x => taken.includes(x.id));
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
            <Pressable key={x.id} onPress={() => toggleSupp(dayKey, x.id)}
              style={[{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: C.line, backgroundColor: C.surface },
                on && { backgroundColor: C.good, borderColor: C.good }]}>
              <Text style={{ color: on ? '#fff' : C.muted, fontWeight: '800' }}>{on ? '✓' : '○'}</Text>
              <Text style={{ color: on ? '#fff' : C.ink, fontWeight: '700' }}>{x.name}</Text>
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}

// Me tab: edit the supplement list.
export function SuppSettings({ onToast }) {
  const list = useSetting('supps', DEFAULT_SUPPS);
  const [name, setName] = useState('');
  if (!list) return null;
  const add = async () => {
    const n = name.trim();
    if (!n) return;
    await saveSupps([...list, { id: 's' + Date.now().toString(36), name: n }]);
    setName('');
    onToast && onToast('Added ' + n);
  };
  const remove = x => Alert.alert(`Remove ${x.name}?`, 'It will no longer appear on the Diary.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Remove', style: 'destructive', onPress: () => saveSupps(list.filter(y => y.id !== x.id)) },
  ]);
  return (
    <Card style={{ gap: 10 }}>
      <H>Supplements</H>
      {list.map(x => (
        <View key={x.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4, borderTopWidth: 1, borderTopColor: C.line }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.ink, fontWeight: '700' }}>{x.name}</Text>
            {x.hint ? <Muted>{x.hint}</Muted> : null}
          </View>
          <Pressable onPress={() => remove(x)} hitSlop={10}><Text style={{ color: C.warn, fontWeight: '700' }}>Remove</Text></Pressable>
        </View>
      ))}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput value={name} onChangeText={setName} placeholder="Add one, e.g. Magnesium" placeholderTextColor="#C9A3AF" style={[ui.input, { flex: 1 }]} />
        <Btn title="Add" onPress={add} style={{ paddingHorizontal: 18 }} />
      </View>
      <Muted>The supplement reminder is in Reminders above.</Muted>
    </Card>
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
    </Card>
  );
}
