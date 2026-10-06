import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { C } from './theme';

export const r0 = n => Math.round(n || 0);
export const r1 = n => Math.round((n || 0) * 10) / 10;

export function Card({ children, style }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function H({ children, style }) {
  return <Text style={[s.h, style]}>{children}</Text>;
}

export function Muted({ children, style }) {
  return <Text style={[s.muted, style]}>{children}</Text>;
}

export function Btn({ title, onPress, kind = 'primary', small, style, disabled }) {
  const primary = kind === 'primary';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        s.btn,
        small && s.btnSmall,
        primary ? s.btnPrimary : s.btnGhost,
        (pressed || disabled) && { opacity: 0.7 },
        style,
      ]}
    >
      <Text style={[s.btnText, small && { fontSize: 13 }, { color: primary ? C.accentInk : C.accent }]}>{title}</Text>
    </Pressable>
  );
}

export function Chip({ label, active, onPress }) {
  return (
    <Pressable onPress={onPress} style={[s.chip, active && s.chipActive]}>
      <Text style={[s.chipText, active && { color: C.accent }]}>{label}</Text>
    </Pressable>
  );
}

export function Bar({ label, value, target, unit = 'g', color, limit }) {
  const pct = target ? Math.min(100, (value / target) * 100) : 0;
  const over = limit && value > target;
  return (
    <View style={{ marginBottom: 10 }}>
      <View style={s.barRow}>
        <Text style={s.barLabel}>{label}</Text>
        <Text style={[s.barValue, over && { color: C.warn }]}>
          {unit === 'g' || unit === 'ml' ? r0(value) : r1(value)} / {target} {unit}
        </Text>
      </View>
      <View style={s.track}>
        <View style={[s.fill, { width: pct + '%', backgroundColor: over ? C.warn : color || C.accent }]} />
      </View>
    </View>
  );
}

export function Ring({ size = 150, stroke = 14, value, target, children }) {
  const rad = (size - stroke) / 2;
  const circ = 2 * Math.PI * rad;
  const pct = target ? Math.min(1, value / target) : 0;
  const over = value > target;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={rad} stroke={C.sunk} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2} cy={size / 2} r={rad}
          stroke={over ? C.warn : C.accent} strokeWidth={stroke} fill="none"
          strokeDasharray={`${circ} ${circ}`} strokeDashoffset={circ * (1 - pct)} strokeLinecap="round"
        />
      </Svg>
      {children}
    </View>
  );
}

export function Field({ label, value, onChangeText, numeric, placeholder, style, autoFocus }) {
  return (
    <View style={[{ flex: 1, minWidth: 90 }, style]}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={numeric ? 'decimal-pad' : 'default'}
        placeholder={placeholder}
        placeholderTextColor="#C9A3AF"
        style={s.input}
        autoFocus={autoFocus}
      />
    </View>
  );
}

export function Sheet({ visible, title, onClose, children, scroll = true }) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen">
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'bottom']}>
        <View style={s.sheetHead}>
          <Text style={s.sheetTitle} numberOfLines={1}>{title}</Text>
          <Pressable onPress={onClose} hitSlop={12}><Text style={s.close}>Close</Text></Pressable>
        </View>
        {scroll ? (
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        ) : (
          <View style={{ flex: 1 }}>{children}</View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

export function MacroStrip({ n }) {
  const items = [['kcal', n.k, C.ink], ['prot', n.p, C.protein], ['carb', n.c, C.carbs], ['fat', n.f, C.fat], ['fibre', n.fi, C.fibre]];
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {items.map(([l, v, col]) => (
        <View key={l} style={s.macroBox}>
          <Text style={[s.macroVal, { color: col }]}>{l === 'kcal' ? r0(v) : r1(v)}</Text>
          <Text style={s.macroLbl}>{l}</Text>
        </View>
      ))}
    </View>
  );
}

export const s = StyleSheet.create({
  card: { backgroundColor: C.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.line },
  h: { fontSize: 18, fontWeight: '700', color: C.ink },
  muted: { fontSize: 13, color: C.muted },
  btn: { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  btnSmall: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 10 },
  btnPrimary: { backgroundColor: C.accent },
  btnGhost: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.line },
  btnText: { fontSize: 15, fontWeight: '700' },
  chip: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: C.line, backgroundColor: C.surface },
  chipActive: { backgroundColor: C.accentSoft, borderColor: C.accent },
  chipText: { fontSize: 13, fontWeight: '600', color: C.muted },
  barRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  barLabel: { fontSize: 13, fontWeight: '600', color: C.ink },
  barValue: { fontSize: 13, color: C.muted, fontVariant: ['tabular-nums'] },
  track: { height: 9, borderRadius: 99, backgroundColor: C.sunk, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 99 },
  fieldLabel: { fontSize: 12, color: C.muted, marginBottom: 4, fontWeight: '500' },
  input: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9, fontSize: 15, color: C.ink },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.line, backgroundColor: C.bg },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: C.ink, flex: 1, marginRight: 12 },
  close: { fontSize: 15, fontWeight: '700', color: C.accent },
  macroBox: { flex: 1, backgroundColor: C.sunk, borderRadius: 8, paddingVertical: 6, alignItems: 'center' },
  macroVal: { fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
  macroLbl: { fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
});
