import React, { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { C } from './theme';
import { deleteCustomFood, saveCustomFood, uid } from './store';
import { Btn, Card, Chip, Field, Muted, s } from './ui';

const MAIN = [
  ['k', 'Calories (kcal)'], ['p', 'Protein (g)'], ['c', 'Carbs (g)'], ['f', 'Fat (g)'], ['fi', 'Fibre (g)'],
  ['sug', 'of which sugars (g)'], ['sat', 'of which saturates (g)'], ['salt', 'Salt (g)'],
];
const EXTRA = [['iron', 'Iron (mg)'], ['ca', 'Calcium (mg)'], ['b12', 'Vitamin B12 (µg)'], ['vd', 'Vitamin D (µg)'], ['zn', 'Zinc (mg)']];

// Create or edit a product from its pack label. Values can be typed per 100 g or per serving.
export default function ProductForm({ initial, onSaved, onDeleted }) {
  const editing = initial && initial.custom && !initial.unsaved;
  const [name, setName] = useState(initial?.name || '');
  const [brand, setBrand] = useState(initial?.brand || '');
  const [barcode, setBarcode] = useState(initial?.barcode || '');
  const [serv, setServ] = useState(String(initial?.serv || 100));
  const [servLabel, setServLabel] = useState(initial?.servLabel || '');
  const [basis, setBasis] = useState('100');
  const [vals, setVals] = useState(() => {
    const v = {};
    const n = initial?.n || {};
    [...MAIN, ...EXTRA].forEach(([k]) => { if (n[k] != null) v[k] = String(Math.round(n[k] * 100) / 100); });
    return v;
  });
  const set = k => t => setVals(v => ({ ...v, [k]: t }));

  async function save() {
    if (!name.trim()) return Alert.alert('Add a name', 'Give the product a name so you can find it later.');
    if (!vals.k) return Alert.alert('Add calories', 'Calories are needed to track this product.');
    const servG = parseFloat(serv) || 100;
    const factor = basis === '100' ? 1 : 100 / servG;
    const n = {};
    [...MAIN, ...EXTRA].forEach(([k]) => {
      const x = parseFloat(vals[k]);
      if (!Number.isNaN(x)) n[k] = x * factor;
    });
    ['p', 'c', 'f', 'fi'].forEach(k => { if (n[k] == null) n[k] = 0; });
    const food = {
      id: initial?.id && initial.custom ? initial.id : uid(),
      name: name.trim(), brand: brand.trim(), barcode: barcode.trim(),
      serv: servG, servLabel: servLabel.trim() || `${servG} g`,
      n, custom: true, group: 'My foods',
      source: initial?.source === 'Open Food Facts' ? 'Open Food Facts, checked by you' : 'Your food',
    };
    await saveCustomFood(food);
    onSaved && onSaved(food);
  }

  function remove() {
    Alert.alert('Delete this food?', `${name} will be removed from your foods. Past diary entries stay.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteCustomFood(initial.id); onDeleted && onDeleted(); } },
    ]);
  }

  return (
    <View style={{ gap: 14 }}>
      <Card style={{ gap: 10 }}>
        <Field label="Product name" value={name} onChangeText={setName} placeholder="e.g. High Protein Yogurt" />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Field label="Brand" value={brand} onChangeText={setBrand} placeholder="e.g. Milbona" />
          <Field label="Barcode (optional)" value={barcode} onChangeText={setBarcode} numeric />
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Field label="Serving size (g)" value={serv} onChangeText={setServ} numeric />
          <Field label="Serving name" value={servLabel} onChangeText={setServLabel} placeholder="e.g. 1 pot" />
        </View>
      </Card>

      <Card style={{ gap: 10 }}>
        <Text style={s.h}>Nutrition from the label</Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Chip label="Per 100 g" active={basis === '100'} onPress={() => setBasis('100')} />
          <Chip label="Per serving" active={basis === 'serv'} onPress={() => setBasis('serv')} />
        </View>
        <Muted>UK labels list carbs without fibre. Copy them as printed.</Muted>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {MAIN.map(([k, l]) => <Field key={k} label={l} value={vals[k] || ''} onChangeText={set(k)} numeric style={{ minWidth: '45%' }} />)}
        </View>
        <Text style={[s.h, { fontSize: 15, marginTop: 6 }]}>Vitamins & minerals (if on the label)</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {EXTRA.map(([k, l]) => <Field key={k} label={l} value={vals[k] || ''} onChangeText={set(k)} numeric style={{ minWidth: '45%' }} />)}
        </View>
      </Card>

      <Btn title={editing ? 'Save changes' : 'Save product'} onPress={save} />
      {editing ? <Btn kind="ghost" title="Delete this food" onPress={remove} /> : null}
      <Muted style={{ textAlign: 'center' }}>Saved on this phone only.</Muted>
    </View>
  );
}
