import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { C } from './theme';
import { useSetting } from './store';
import { ENERGY, MOODS, SLEEP_Q, TAGS, isCrisis, moodFace, persistentLowMood, saveCheckin } from './wellbeing';
import { ERROR_TEXT, askClaude, getKey, localReply } from './ai';
import { Btn, Card, Chip, H, Muted, Sheet, s as ui } from './ui';

// Diary card: quick mood row, or a summary once she's checked in.
export function CheckInCard({ dayKey, isToday }) {
  const all = useSetting('checkins', {});
  const [open, setOpen] = useState(null); // { mood } to prefill
  if (!all) return null;
  const c = all[dayKey];
  return (
    <>
      {c && c.mood ? (
        <Pressable onPress={() => setOpen({})} style={({ pressed }) => [card, pressed && { opacity: 0.8 }]}>
          <Text style={{ fontSize: 30 }}>{moodFace(c.mood)}</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.ink, fontWeight: '700' }}>
              {MOODS.find(m => m.v === c.mood).label}
              {c.energy ? ` · ${ENERGY.find(e => e[0] === c.energy)[1].toLowerCase()}` : ''}
              {c.sleepH ? ` · ${c.sleepH} h sleep` : ''}
            </Text>
            <Muted numberOfLines={2}>
              {c.thread?.length > 1 ? c.thread[c.thread.length - 1].text : 'Tap to add how you feel and get a reply'}
            </Muted>
          </View>
          <Text style={{ color: C.accent, fontSize: 22, fontWeight: '800' }}>›</Text>
        </Pressable>
      ) : (
        <View style={[card, { flexDirection: 'column', alignItems: 'stretch', gap: 10 }]}>
          <Text style={{ color: C.ink, fontWeight: '800', fontSize: 16 }}>{isToday ? 'How are you today?' : 'How were you this day?'}</Text>
          <Muted style={{ marginTop: -6 }}>Check in with Miss Curious Bae 🌸</Muted>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {MOODS.map(m => (
              <Pressable key={m.v} onPress={() => setOpen({ mood: m.v })} style={{ alignItems: 'center', padding: 4 }} hitSlop={6}>
                <Text style={{ fontSize: 32 }}>{m.face}</Text>
                <Text style={{ fontSize: 11, color: C.muted }}>{m.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
      <Sheet visible={!!open} title={isToday ? 'Miss Curious Bae 💗' : 'Miss Curious Bae · ' + new Date(dayKey + 'T12:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} onClose={() => setOpen(null)} scroll={false}>
        {open && <CheckInFlow dayKey={dayKey} existing={c} prefill={open} all={all} />}
      </Sheet>
    </>
  );
}

function CheckInFlow({ dayKey, existing, prefill, all }) {
  const [step, setStep] = useState(existing?.thread?.length ? 'chat' : 'form');
  const [c, setC] = useState(() => ({
    mood: prefill.mood || existing?.mood || null,
    energy: existing?.energy || null,
    sleepH: existing?.sleepH ?? 7,
    sleepQ: existing?.sleepQ || null,
    tags: existing?.tags || [],
    feeling: existing?.feeling || '',
    note: existing?.note || '',
    thread: existing?.thread || [],
  }));
  const set = (k, v) => setC(x => ({ ...x, [k]: v }));

  if (step === 'form') {
    return (
      <ScrollView contentContainerStyle={{ padding: 16, gap: 18, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        {persistentLowMood(all) ? <LowMoodNote /> : null}
        <Section title="Mood">
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {MOODS.map(m => (
              <Pressable key={m.v} onPress={() => set('mood', m.v)}
                style={[{ alignItems: 'center', padding: 6, borderRadius: 14, borderWidth: 2, borderColor: 'transparent' }, c.mood === m.v && { borderColor: C.accent, backgroundColor: C.accentSoft }]}>
                <Text style={{ fontSize: 30 }}>{m.face}</Text>
                <Text style={{ fontSize: 11, color: C.muted }}>{m.label}</Text>
              </Pressable>
            ))}
          </View>
        </Section>
        <Section title="Energy">
          <Row>{ENERGY.map(([k, l]) => <Chip key={k} label={l} active={c.energy === k} onPress={() => set('energy', k)} />)}</Row>
        </Section>
        <Section title="Sleep last night">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Pressable style={circ} onPress={() => set('sleepH', Math.max(0, c.sleepH - 0.5))}><Text style={circTxt}>−</Text></Pressable>
            <Text style={{ fontSize: 22, fontWeight: '800', color: C.ink, minWidth: 80, textAlign: 'center' }}>{c.sleepH} h</Text>
            <Pressable style={circ} onPress={() => set('sleepH', Math.min(14, c.sleepH + 0.5))}><Text style={circTxt}>+</Text></Pressable>
          </View>
          <Row>{SLEEP_Q.map(([k, l]) => <Chip key={k} label={l} active={c.sleepQ === k} onPress={() => set('sleepQ', k)} />)}</Row>
        </Section>
        <Section title="Anything else? (optional)">
          <Row>{TAGS.map(t => <Chip key={t} label={t} active={c.tags.includes(t)} onPress={() => set('tags', c.tags.includes(t) ? c.tags.filter(x => x !== t) : [...c.tags, t])} />)}</Row>
        </Section>
        <Section title="How are you feeling? Tell me about it">
          <TextInput value={c.feeling} onChangeText={v => set('feeling', v)} multiline placeholder="e.g. Long day at work, skipped lunch, feeling a bit flat and bloated…"
            placeholderTextColor="#C9A3AF" style={[ui.input, { minHeight: 110, textAlignVertical: 'top' }]} />
          <Muted>Miss Curious Bae replies to this. Write as much or as little as you like.</Muted>
        </Section>
        <Section title="Private note (optional, just for you)">
          <TextInput value={c.note} onChangeText={v => set('note', v)} multiline placeholder="Not sent anywhere"
            placeholderTextColor="#C9A3AF" style={[ui.input, { minHeight: 60, textAlignVertical: 'top' }]} />
        </Section>
        <Btn title="Save & talk to Miss Curious Bae 💗" disabled={!c.mood} onPress={async () => {
          const userText = c.feeling.trim() || 'Just checking in.';
          const next = { ...c, thread: c.thread.length ? c.thread : [{ role: 'user', text: userText }] };
          await saveCheckin(dayKey, next);
          setC(next);
          setStep('chat');
        }} />
        {!c.mood ? <Muted style={{ textAlign: 'center' }}>Pick a mood to continue.</Muted> : null}
      </ScrollView>
    );
  }
  return <Chat dayKey={dayKey} c={c} setC={setC} onEdit={() => setStep('form')} />;
}

function Chat({ dayKey, c, setC, onEdit }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [notice, setNotice] = useState('');
  const [hasKey, setHasKey] = useState(true);
  const scroller = useRef(null);
  const crisis = c.thread.some(m => m.role === 'user' && isCrisis(m.text)) || isCrisis(c.note);

  // Ask for a reply whenever the last message is hers.
  useEffect(() => {
    const last = c.thread[c.thread.length - 1];
    if (!last || last.role !== 'user' || busy) return;
    let alive = true;
    (async () => {
      setBusy(true); setNotice('');
      let reply;
      try {
        reply = await askClaude(dayKey, c, c.thread);
      } catch (e) {
        const code = e?.code || 'error';
        if (code === 'no-key') setHasKey(false);
        setNotice(code in ERROR_TEXT ? ERROR_TEXT[code] : ERROR_TEXT.error);
        reply = await localReply(dayKey, c);
      }
      if (!alive) return;
      const next = { ...c, thread: [...c.thread, { role: 'assistant', text: reply.text, source: reply.source }] };
      setC(next);
      await saveCheckin(dayKey, next);
      setBusy(false);
    })();
    return () => { alive = false; };
  }, [c.thread.length]); // eslint-disable-line

  useEffect(() => { getKey().then(k => setHasKey(!!k)); }, []);

  const lastMsg = c.thread[c.thread.length - 1];
  const canRetry = !busy && hasKey && lastMsg?.role === 'assistant' && lastMsg.source === 'local';
  async function retry() {
    const next = { ...c, thread: c.thread.slice(0, -1) };
    setNotice('');
    setC(next);
    await saveCheckin(dayKey, next);
  }

  async function send() {
    const t = msg.trim();
    if (!t || busy) return;
    setMsg('');
    const next = { ...c, thread: [...c.thread, { role: 'user', text: t }] };
    setC(next);
    await saveCheckin(dayKey, next);
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView ref={scroller} onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: true })}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 20 }} keyboardShouldPersistTaps="handled">
        <Pressable onPress={onEdit} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 26 }}>{moodFace(c.mood)}</Text>
          <Muted style={{ flex: 1 }}>
            {MOODS.find(m => m.v === c.mood)?.label}{c.energy ? ` · ${ENERGY.find(e => e[0] === c.energy)[1].toLowerCase()}` : ''} · {c.sleepH} h sleep{c.tags.length ? ` · ${c.tags.join(', ').toLowerCase()}` : ''}
          </Muted>
          <Text style={{ color: C.accent, fontWeight: '700' }}>Edit</Text>
        </Pressable>
        {crisis ? <SafetyCard /> : null}
        {c.thread.map((m, i) => (
          <View key={i} style={{ gap: 3 }}>
          {m.role === 'assistant' ? <Text style={{ fontSize: 12, fontWeight: '700', color: C.accent, marginLeft: 4 }}>Miss Curious Bae 🌸</Text> : null}
          <View style={[bubble, m.role === 'user' ? mine : theirs]}>
            <Text style={{ color: m.role === 'user' ? '#fff' : C.ink, fontSize: 15, lineHeight: 22 }}>{m.text}</Text>
          </View>
          </View>
        ))}
        {busy ? (
          <View style={[bubble, theirs, { flexDirection: 'row', gap: 8, alignItems: 'center' }]}>
            <ActivityIndicator color={C.accent} /><Muted>Miss Curious Bae is thinking…</Muted>
          </View>
        ) : null}
        {notice ? <Muted>{notice}</Muted> : null}
        {canRetry ? <Btn small kind="ghost" title="Try again with Miss Curious Bae" onPress={retry} /> : null}
        {!hasKey ? <Muted>Miss Curious Bae isn't fully set up on this phone yet, so these are short built-in notes. Turn her on in Me → Miss Curious Bae.</Muted> : null}
      </ScrollView>
      <View style={{ flexDirection: 'row', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.surface, alignItems: 'flex-end' }}>
        <TextInput value={msg} onChangeText={setMsg} placeholder="Reply…" placeholderTextColor="#C9A3AF" multiline
          style={[ui.input, { flex: 1, maxHeight: 110 }]} />
        <Btn title="Send" onPress={send} disabled={busy || !msg.trim()} style={{ paddingHorizontal: 18 }} />
      </View>
    </View>
  );
}

export function SafetyCard() {
  return (
    <Card style={{ borderColor: C.accent, backgroundColor: '#FFF7F9', gap: 8 }}>
      <Text style={{ color: C.ink, fontWeight: '800', fontSize: 15 }}>You don't have to carry this alone 💗</Text>
      <Text style={{ color: C.ink, lineHeight: 20 }}>
        If things feel too much, please talk to someone now. Samaritans are there any time, free, and they listen without judging.
      </Text>
      <Pressable onPress={() => Linking.openURL('tel:116123').catch(() => {})}><Text style={link}>📞 Samaritans: 116 123 (free, 24/7)</Text></Pressable>
      <Pressable onPress={() => Linking.openURL('sms:85258?body=SHOUT').catch(() => {})}><Text style={link}>💬 Text SHOUT to 85258</Text></Pressable>
      <Muted>If you're in danger right now, call 999 or go to A&E. Telling Aryan or someone you trust can help too.</Muted>
    </Card>
  );
}

function LowMoodNote() {
  return (
    <Card style={{ backgroundColor: C.accentSoft, borderColor: C.accentSoft, gap: 6 }}>
      <Text style={{ color: C.ink, fontWeight: '700' }}>It looks like it's been a tough couple of weeks</Text>
      <Text style={{ color: C.ink, lineHeight: 20 }}>
        Low moods happen, but when they stick around, talking helps, whether that's someone you trust or your GP. Samaritans are also there on 116 123, any time.
      </Text>
    </Card>
  );
}

const Section = ({ title, children }) => <View style={{ gap: 8 }}><H style={{ fontSize: 16 }}>{title}</H>{children}</View>;
const Row = ({ children }) => <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{children}</View>;
const card = { backgroundColor: C.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: C.line, flexDirection: 'row', alignItems: 'center', gap: 12 };
const bubble = { padding: 12, borderRadius: 16, maxWidth: '88%' };
const mine = { alignSelf: 'flex-end', backgroundColor: C.accent, borderBottomRightRadius: 4 };
const theirs = { alignSelf: 'flex-start', backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderBottomLeftRadius: 4 };
const circ = { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center', backgroundColor: C.surface };
const circTxt = { color: C.accent, fontWeight: '800', fontSize: 18 };
const link = { color: C.accent, fontWeight: '700', fontSize: 15 };
