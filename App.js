import React, { useRef, useState } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { C } from './src/theme';
import Diary from './src/screens/Diary';
import Browse from './src/screens/Browse';
import Trends from './src/screens/Trends';
import Me from './src/screens/Me';

const TABS = [
  ['diary', 'Diary', '◷'],
  ['foods', 'Foods', '◍'],
  ['recipes', 'Recipes', '❦'],
  ['trends', 'Trends', '▥'],
  ['me', 'Me', '♡'],
];

export default function App() {
  const [tab, setTab] = useState('diary');
  const [toast, setToast] = useState('');
  const fade = useRef(new Animated.Value(0)).current;
  const timer = useRef(null);

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
        <View style={{ flex: 1 }}>
          {tab === 'diary' && <Diary onToast={showToast} />}
          {tab === 'foods' && <Browse mode="foods" onToast={showToast} />}
          {tab === 'recipes' && <Browse mode="recipes" onToast={showToast} />}
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
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
