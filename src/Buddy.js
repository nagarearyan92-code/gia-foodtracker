// Floating Miss Curious Bae bubble: on every screen, drag it anywhere, tap to chat about anything.
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Animated, KeyboardAvoidingView, Modal, PanResponder, Platform, Pressable,
  ScrollView, Text, TextInput, View, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C } from './theme';
import { readSetting, useSetting, writeSetting } from './store';
import { ERROR_TEXT, askBuddy, getKey } from './ai';
import { isCrisis } from './wellbeing';
import { SafetyCard } from './CheckIn';
import { Muted } from './ui';

const SIZE = 58;
const IDEAS = ['What should I have for dinner?', 'High-protein snack ideas', 'I\'m feeling really tired today', 'Something sweet but healthy?'];

export default function Buddy() {
  const { width, height } = useWindowDimensions();
  const hidden = useSetting('bubbleHidden', false);
  const [open, setOpen] = useState(false);
  const pos = useRef(new Animated.ValueXY({ x: width - SIZE - 14, y: height - SIZE - 170 })).current;
  const start = useRef({ x: 0, y: 0 });
  const moved = useRef(false);

  // Restore where she left it.
  useEffect(() => {
    readSetting('bubblePos', null).then(p => { if (p) pos.setValue(clamp(p, width, height)); });
  }, []); // eslint-disable-line

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: () => { moved.current = false; start.current = { x: pos.x._value, y: pos.y._value }; },
    onPanResponderMove: (_, g) => {
      if (Math.abs(g.dx) + Math.abs(g.dy) > 6) moved.current = true;
      pos.setValue({ x: start.current.x + g.dx, y: start.current.y + g.dy });
    },
    onPanResponderRelease: (_, g) => {
      if (!moved.current) { setOpen(true); return; }
      const w = winRef.current;
      const p = clamp({ x: start.current.x + g.dx, y: start.current.y + g.dy }, w.width, w.height);
      const snapX = p.x + SIZE / 2 < w.width / 2 ? 10 : w.width - SIZE - 10; // tuck to the nearest side
      Animated.spring(pos, { toValue: { x: snapX, y: p.y }, useNativeDriver: false, friction: 7 }).start();
      writeSetting('bubblePos', { x: snapX, y: p.y });
    },
  })).current;
  const winRef = useRef({ width, height });
  winRef.current = { width, height };

  if (hidden === null || hidden) return null;
  return (
    <>
      <Animated.View {...pan.panHandlers} accessibilityRole="button" accessibilityLabel="Chat with Miss Curious Bae"
        style={{ position: 'absolute', left: 0, top: 0, transform: pos.getTranslateTransform(), width: SIZE, height: SIZE, borderRadius: SIZE / 2,
          backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center', elevation: 8,
          shadowColor: '#7A1E3E', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, borderWidth: 3, borderColor: '#FFE3EB' }}>
        <Text style={{ fontSize: 28 }}>🌸</Text>
      </Animated.View>
      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)} presentationStyle="fullScreen">
        {open ? <BuddyChat onClose={() => setOpen(false)} /> : null}
      </Modal>
    </>
  );
}

const clamp = (p, w, h) => ({ x: Math.max(6, Math.min(w - SIZE - 6, p.x)), y: Math.max(60, Math.min(h - SIZE - 100, p.y)) });

function BuddyChat({ onClose }) {
  const stored = useSetting('buddyChat', []);
  const [thread, setThread] = useState(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [hasKey, setHasKey] = useState(true);
  const scroller = useRef(null);

  useEffect(() => { if (stored && thread === null) setThread(stored); }, [stored]); // eslint-disable-line
  useEffect(() => { getKey().then(k => setHasKey(!!k)); }, []);
  if (thread === null) return null;
  const crisis = thread.some(m => m.role === 'user' && isCrisis(m.text));

  async function send(text) {
    const t = (text ?? msg).trim();
    if (!t || busy) return;
    setMsg(''); setNotice('');
    const next = [...thread, { role: 'user', text: t, at: Date.now() }];
    setThread(next);
    await writeSetting('buddyChat', next.slice(-60));
    await reply(next);
  }
  async function reply(next) {
    setBusy(true);
    try {
      const r = await askBuddy(next);
      const done = [...next, { role: 'assistant', text: r.text, at: Date.now() }];
      setThread(done);
      await writeSetting('buddyChat', done.slice(-60));
    } catch (e) {
      const code = e?.code || 'error';
      if (code === 'no-key') { setHasKey(false); setNotice(''); }
      else setNotice(code in ERROR_TEXT && ERROR_TEXT[code] ? ERROR_TEXT[code].replace(/ Here's a quick note instead[.;]?/, '') : ERROR_TEXT.error.replace(/ Here's a quick note instead\./, ''));
    }
    setBusy(false);
  }
  const lastIsMine = thread.length && thread[thread.length - 1].role === 'user';
  const clear = () => Alert.alert('Clear this chat?', 'Your daily check-ins aren\'t affected.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Clear', style: 'destructive', onPress: async () => { setThread([]); setNotice(''); await writeSetting('buddyChat', []); } },
  ]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'bottom']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.line, gap: 10 }}>
        <Text style={{ fontSize: 26 }}>🌸</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: C.ink }}>Miss Curious Bae</Text>
          <Muted>{busy ? 'typing…' : 'Ask me anything'}</Muted>
        </View>
        {thread.length ? <Pressable onPress={clear} hitSlop={10}><Text style={{ color: C.muted, fontWeight: '700' }}>Clear</Text></Pressable> : null}
        <Pressable onPress={onClose} hitSlop={12} style={{ marginLeft: 12 }}><Text style={{ color: C.accent, fontWeight: '800', fontSize: 16 }}>Close</Text></Pressable>
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={scroller} onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: true })}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 20 }} keyboardShouldPersistTaps="handled">
          {crisis ? <SafetyCard /> : null}
          {!thread.length ? (
            <View style={{ gap: 12, marginTop: 10 }}>
              <View style={[bubble, theirs]}>
                <Text style={{ color: C.ink, fontSize: 15, lineHeight: 22 }}>Hi Gia 🌸 I'm here whenever you want me. Ask me what to eat, for a recipe idea, about your cycle, or just tell me how your day's going.</Text>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {IDEAS.map(t => (
                  <Pressable key={t} onPress={() => send(t)} style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: C.line, backgroundColor: C.surface }}>
                    <Text style={{ color: C.accent, fontWeight: '600' }}>{t}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}
          {thread.map((m, i) => (
            <View key={i} style={[bubble, m.role === 'user' ? mine : theirs]}>
              <Text style={{ color: m.role === 'user' ? '#fff' : C.ink, fontSize: 15, lineHeight: 22 }}>{m.text}</Text>
            </View>
          ))}
          {busy ? (
            <View style={[bubble, theirs, { flexDirection: 'row', gap: 8, alignItems: 'center' }]}>
              <ActivityIndicator color={C.accent} /><Muted>Miss Curious Bae is thinking…</Muted>
            </View>
          ) : null}
          {!hasKey ? <Muted>I'm not switched on yet. Add the key in Me → Miss Curious Bae 🌸 and I can chat properly.</Muted> : null}
          {notice ? <Muted>{notice}</Muted> : null}
          {!busy && hasKey && lastIsMine ? (
            <Pressable onPress={() => reply(thread)} style={{ alignSelf: 'flex-start' }}><Text style={{ color: C.accent, fontWeight: '700' }}>↻ Try again</Text></Pressable>
          ) : null}
        </ScrollView>
        <View style={{ flexDirection: 'row', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.surface, alignItems: 'flex-end' }}>
          <TextInput value={msg} onChangeText={setMsg} placeholder="Message Miss Curious Bae…" placeholderTextColor="#C9A3AF" multiline
            style={{ flex: 1, maxHeight: 120, minHeight: 44, borderWidth: 1, borderColor: C.line, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, color: C.ink, backgroundColor: C.bg, fontSize: 15 }} />
          <Pressable onPress={() => send()} disabled={busy || !msg.trim()}
            style={{ height: 44, paddingHorizontal: 18, borderRadius: 14, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center', opacity: busy || !msg.trim() ? 0.5 : 1 }}>
            <Text style={{ color: '#fff', fontWeight: '800' }}>Send</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const bubble = { padding: 12, borderRadius: 16, maxWidth: '88%' };
const mine = { alignSelf: 'flex-end', backgroundColor: C.accent, borderBottomRightRadius: 4 };
const theirs = { alignSelf: 'flex-start', backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderBottomLeftRadius: 4 };
