// Gifts from Aryan: the animated pop-up, and the "From Aryan" card on the Me tab.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Animated, AppState, Easing, Modal, Platform, Pressable, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { C } from './theme';
import { useSetting } from './store';
import { checkGifts, connect, disconnect, giftInfo, markSeen, registerBackground, unseenGifts } from './gifts';
import { Btn, Card, H, Muted, s as ui } from './ui';
import Svg, { Ellipse, Path } from 'react-native-svg';
import GiftArt from './GiftArt';

// Drawn hearts and petals that float up behind the card (no emoji).
const FLOAT_COLOURS = ['#C2456F', '#E06B8F', '#F2A7C0', '#7A1934', '#F7C6D4'];
function Floaty({ kind, colour, size }) {
  return (
    <Svg width={size} height={size} viewBox="-12 -12 24 24" style={{ backgroundColor: 'transparent', overflow: 'visible' }}>
      {kind === 'petal'
        ? <Ellipse cx={0} cy={0} rx={6} ry={10} fill={colour} fillOpacity={0.9} transform="rotate(30)" />
        : <Path d="M0 -3 C0 -9 8 -9 8 -3 C8 2 0 6 0 8 C0 6 -8 2 -8 -3 C-8 -9 0 -9 0 -3 Z" fill={colour} fillOpacity={0.9} />}
    </Svg>
  );
}

const POSES = { flowers: 1, kisses: 1, cuddles: 1, chocolate: 1, treat: 1, thinking: 1, note: 1 };
const when = g => {
  const d = new Date(g.sentAt || Date.now());
  const today = new Date().toDateString() === d.toDateString();
  return today ? d.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' }).replace(' ', '')
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

// Shows new gifts one at a time when the app opens (or comes back to the front).
export function GiftOverlay() {
  const [queue, setQueue] = useState([]);
  const refresh = useCallback(async () => {
    if (Platform.OS === 'web') return;
    const local = await unseenGifts();
    if (local.length) setQueue(local);
    const fresh = await checkGifts();
    if (fresh.length) setQueue(fresh);
  }, []);
  useEffect(() => {
    refresh();
    registerBackground();
    const sub = AppState.addEventListener('change', st => st === 'active' && refresh());
    return () => sub.remove();
  }, [refresh]);
  const g = queue[0];
  if (!g) return null;
  return <GiftPopup key={g.id} gift={g} onDone={async () => { await markSeen(g.id); setQueue(q => q.slice(1)); }} />;
}

export function GiftPopup({ gift, onDone }) {
  const info = giftInfo(gift);
  const { width, height } = useWindowDimensions();
  const pop = useRef(new Animated.Value(0)).current;
  const bob = useRef(new Animated.Value(0)).current;
  const floats = useRef(Array.from({ length: 18 }, (_, i) => ({
    v: new Animated.Value(0), x: Math.random() * (width - 40), delay: Math.random() * 1600, size: 14 + Math.random() * 16,
    kind: gift.type === 'flowers' && i % 2 ? 'petal' : 'heart', colour: FLOAT_COLOURS[i % FLOAT_COLOURS.length], drift: (Math.random() - 0.5) * 60,
  }))).current;
  useEffect(() => {
    Animated.spring(pop, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }).start();
    const b = Animated.loop(Animated.sequence([
      Animated.timing(bob, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(bob, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]));
    b.start();
    const loops = floats.map(f => Animated.loop(Animated.sequence([
      Animated.delay(f.delay),
      Animated.timing(f.v, { toValue: 1, duration: 3600, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(f.v, { toValue: 0, duration: 0, useNativeDriver: true }),
    ])));
    loops.forEach(l => l.start());
    return () => { b.stop(); loops.forEach(l => l.stop()); };
  }, []); // eslint-disable-line
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onDone}>
      <View style={{ flex: 1, backgroundColor: 'rgba(58,34,41,0.55)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        {floats.map((f, i) => (
          <Animated.View key={i} style={{
            position: 'absolute', left: f.x, top: height, backgroundColor: 'transparent',
            transform: [
              { translateY: f.v.interpolate({ inputRange: [0, 1], outputRange: [20, -height - 80] }) },
              { translateX: f.v.interpolate({ inputRange: [0, 1], outputRange: [0, f.drift] }) },
            ],
          }}><Floaty kind={f.kind} colour={f.colour} size={f.size} /></Animated.View>
        ))}
        <Animated.View style={{
          width: '100%', maxWidth: 380, backgroundColor: C.surface, borderRadius: 24, padding: 22, alignItems: 'center', gap: 10,
          borderWidth: 2, borderColor: C.accentSoft, transform: [{ scale: pop }], opacity: pop,
        }}>
          <Animated.View style={{ transform: [{ translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) }, { rotate: bob.interpolate({ inputRange: [0, 1], outputRange: ['-2deg', '2deg'] }) }] }}>
            <GiftArt type={gift.type in POSES ? gift.type : 'note'} size={130} />
          </Animated.View>
          <Text style={{ fontSize: 22, fontWeight: '800', color: C.ink, textAlign: 'center' }}>{info.title}</Text>
          {gift.note ? <Text style={{ fontSize: 17, lineHeight: 25, color: C.ink, textAlign: 'center', fontStyle: 'italic' }}>"{gift.note}"</Text> : null}
          <Muted>From Aryan 💗 · {when(gift)}</Muted>
          <Btn title="Aww, thank you 💗" onPress={onDone} style={{ alignSelf: 'stretch', marginTop: 6 }} />
        </Animated.View>
      </View>
    </Modal>
  );
}

// Me tab: connect once with the code from Aryan, then see everything he's sent.
export function FromAryanCard({ onToast }) {
  const connected = useSetting('giftsConnected', false);
  const gifts = useSetting('gifts', []);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [again, setAgain] = useState(null);
  if (connected === null || gifts === null) return null;
  if (Platform.OS === 'web') {
    return <Card style={{ gap: 6 }}><H>💌 From Aryan</H><Muted>Gifts and notes from Aryan show up in the Android app.</Muted></Card>;
  }

  if (!connected) {
    return (
      <Card style={{ gap: 10 }}>
        <H>💌 From Aryan</H>
        <Muted>Aryan can send you little gifts and notes: flowers, kisses, cuddles and more. Paste the connection code he gives you to switch it on.</Muted>
        <TextInput value={code} onChangeText={setCode} placeholder="gm1:…" placeholderTextColor="#C9A3AF" autoCapitalize="none" autoCorrect={false} style={ui.input} />
        <Btn title={busy ? 'Connecting…' : 'Connect'} disabled={busy || !code.trim()} onPress={async () => {
          setBusy(true);
          const r = await connect(code);
          setBusy(false);
          if (r.ok) { setCode(''); onToast && onToast('Connected 💌'); } else Alert.alert("Couldn't connect", r.error);
        }} />
      </Card>
    );
  }

  const list = [...gifts].reverse().slice(0, 12);
  return (
    <Card style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <H>💌 From Aryan</H>
        <Pressable onPress={async () => { const f = await checkGifts(); onToast && onToast(f.length ? 'Something new 💗' : 'Nothing new yet'); }} hitSlop={8}>
          <Text style={{ color: C.accent, fontWeight: '700' }}>Check</Text>
        </Pressable>
      </View>
      {list.length ? list.map(g => {
        const info = giftInfo(g);
        return (
          <Pressable key={g.id} onPress={() => setAgain(g)} style={{ flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 6, borderTopWidth: 1, borderTopColor: C.line }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, overflow: 'hidden', backgroundColor: C.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
              <GiftArt type={g.type in POSES ? g.type : 'note'} size={40} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.ink, fontWeight: '600' }} numberOfLines={1}>{g.note || info.title}</Text>
              <Muted>{when(g)}</Muted>
            </View>
          </Pressable>
        );
      }) : <Muted>Nothing yet. When Aryan sends something, it'll pop up right here 💗</Muted>}
      <Pressable onPress={() => Alert.alert('Disconnect?', "You won't get new gifts until you connect again.", [
        { text: 'Cancel', style: 'cancel' }, { text: 'Disconnect', style: 'destructive', onPress: disconnect }])} hitSlop={8}>
        <Muted style={{ textAlign: 'right' }}>Disconnect</Muted>
      </Pressable>
      {again ? <GiftPopup gift={again} onDone={() => setAgain(null)} /> : null}
    </Card>
  );
}
