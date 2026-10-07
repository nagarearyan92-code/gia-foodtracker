import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { C } from './theme';
import { fmtHM, nowHM, shiftHM } from './times';

// "Time eaten  [−]  9:42 am  [+]  Now" — 15-minute steps; hold − / + to jump an hour.
export default function TimeRow({ label = 'Time', value, onChange, showNow = true }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Text style={{ flex: 1, color: C.ink, fontWeight: '600' }}>{label}</Text>
      <Pressable onPress={() => onChange(shiftHM(value, -15))} onLongPress={() => onChange(shiftHM(value, -60))} hitSlop={6} style={circ}>
        <Text style={circTxt}>−</Text>
      </Pressable>
      <Text style={{ minWidth: 74, textAlign: 'center', color: C.ink, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{fmtHM(value)}</Text>
      <Pressable onPress={() => onChange(shiftHM(value, 15))} onLongPress={() => onChange(shiftHM(value, 60))} hitSlop={6} style={circ}>
        <Text style={circTxt}>+</Text>
      </Pressable>
      {showNow ? (
        <Pressable onPress={() => onChange(nowHM())} hitSlop={6} style={[circ, { width: undefined, paddingHorizontal: 10 }]}>
          <Text style={{ color: C.accent, fontWeight: '700', fontSize: 13 }}>Now</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const circ = { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center', backgroundColor: C.surface };
const circTxt = { color: C.accent, fontWeight: '800', fontSize: 16 };
