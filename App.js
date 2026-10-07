import React, { useEffect, useRef, useState } from 'react';
import { AppState, Animated, Image, Pressable, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { C } from './src/theme';
import Diary from './src/screens/Diary';
import Browse from './src/screens/Browse';
import Trends from './src/screens/Trends';
import Me from './src/screens/Me';
import Cycle from './src/screens/Cycle';
import { reschedule } from './src/reminders';
import { onDiaryChange } from './src/store';
import { onRestore } from './src/backup';
import Buddy from './src/Buddy';

const TABS = [
  ['diary', 'Diary', '◷'],
  ['foods', 'Foods', '◍'],
  ['recipes', 'Recipes', '❦'],
  ['cycle', 'Cycle', '✿'],
  ['trends', 'Trends', '▥'],
  ['me', 'Me', '♡'],
];

export default function App() {
  const [tab, setTab] = useState('diary');
  const [toast, setToast] = useState('');
  const fade = useRef(new Animated.Value(0)).current;
  const timer = useRef(null);
  const [welcome, setWelcome] = useState(true);
  const [epoch, setEpoch] = useState(0); // bumped after a restore so every screen reloads
  useEffect(() => onRestore(() => { setEpoch(e => e + 1); setTab('diary'); }), []);
  const welcomeFade = useRef(new Animated.Value(1)).current;
  const hideWelcome = () => Animated.timing(welcomeFade, { toValue: 0, duration: 450, useNativeDriver: true }).start(() => setWelcome(false));
  useEffect(() => { const t = setTimeout(hideWelcome, 3000); return () => clearTimeout(t); }, []); // eslint-disable-line

  // Keep reminders planned ahead, and skip today's ones for meals already logged.
  useEffect(() => {
    reschedule();
    const off = onDiaryChange(() => reschedule());
    const sub = AppState.addEventListener('change', st => st === 'active' && reschedule());
    return () => { off(); sub.remove(); };
  }, []);

  const showToast = msg => {
    setToast(msg);
    clearTimeout(timer.current);
    Animated.timing(fade, { toValue: 1, duration: 150, useNativeDriver: true }).start();
    timer.current = setTimeout(() => Animated.timing(fade, { toValue: 0, duration: 250, useNativeDriver: true }).start(), 1800);
  };

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'bottom']}>
        <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 }}>
          <Text style={{ fontSize: 28, fontWeight: '800', color: C.ink, letterSpacing: -0.5 }}>
            Hello <Text style={{ color: C.accent }}>Gia</Text>
          </Text>
        </View>
        <View key={epoch} style={{ flex: 1 }}>
          {tab === 'diary' && <Diary onToast={showToast} onOpenRecipes={() => setTab('recipes')} onOpenCycle={() => setTab('cycle')} />}
          {tab === 'foods' && <Browse mode="foods" onToast={showToast} />}
          {tab === 'recipes' && <Browse mode="recipes" onToast={showToast} />}
          {tab === 'cycle' && <Cycle onToast={showToast} />}
          {tab === 'trends' && <Trends />}
          {tab === 'me' && <Me onToast={showToast} />}
        </View>
        <Animated.View pointerEvents="none" style={{ position: 'absolute', bottom: 90, left: 24, right: 24, alignItems: 'center', opacity: fade }}>
          <Text style={{ backgroundColor: C.ink, color: '#fff', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, fontWeight: '600', overflow: 'hidden' }}>{toast}</Text>
        </Animated.View>
        <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.surface, paddingVertical: 6 }}>
          {TABS.map(([k, label, icon]) => {
            const active = tab === k;
            return (
              <Pressable key={k} onPress={() => setTab(k)} style={{ flex: 1, alignItems: 'center', paddingVertical: 6 }}>
                <Text style={{ fontSize: 20, color: active ? C.accent : C.muted }}>{icon}</Text>
                <Text style={{ fontSize: 11, fontWeight: active ? '800' : '600', color: active ? C.accent : C.muted }}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
        <Buddy />
        {welcome ? (
          <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: welcomeFade }}>
            <Pressable onPress={hideWelcome} style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Image source={require('./assets/splash-icon.png')} style={{ width: 220, height: 220 }} />
              <Text style={{ fontSize: 40, fontWeight: '800', color: C.accent, letterSpacing: -0.5 }}>Gia Mia</Text>
              <Text style={{ fontSize: 16, color: C.muted, fontWeight: '600', textAlign: 'center', paddingHorizontal: 24 }}>made with love, for hers truly,{'\n'}by Aryan 💗</Text>
            </Pressable>
          </Animated.View>
        ) : null}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
