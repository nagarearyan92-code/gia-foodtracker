import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { C } from './theme';
import { useCustomFoods, useRecent } from './store';
import { BUILT_IN, RECIPE_FOODS, searchFoods } from './catalog';
import FoodDetail from './FoodDetail';
import ProductForm from './ProductForm';
import Scanner from './Scanner';
import { Btn, Chip, Muted, Sheet, r0, r1, s } from './ui';

// One full-screen sheet that handles: search -> food detail -> add, scan, and create product.
// start: 'search' | 'scan' | 'create'
export default function AddFlow({ visible, onClose, day, meal, start = 'search', onToast }) {
  const [view, setView] = useState(start);
  const [food, setFood] = useState(null);
  const [formInitial, setFormInitial] = useState(null);
  const [q, setQ] = useState('');
  const [tab, setTab] = useState('foods');
  const custom = useCustomFoods() || [];
  const recent = useRecent() || [];

  useEffect(() => {
    if (visible) { setView(start); setFood(null); setFormInitial(start === 'create' ? {} : null); setQ(''); }
  }, [visible, start]);

  const list = useMemo(() => {
    if (tab === 'recipes') return searchFoods(RECIPE_FOODS, q);
    if (tab === 'mine') return searchFoods(custom, q);
    if (tab === 'recent') return searchFoods(recent, q);
    return searchFoods([...custom, ...BUILT_IN], q);
  }, [tab, q, custom, recent]);

  const open = f => { setFood(f); setView('detail'); };
  const edit = f => { setFormInitial(f); setView('form'); };
  const done = msg => { onToast && onToast(msg); onClose(); };

  let title = `Add to ${meal}`;
  let body = null;
  if (view === 'scan') {
    title = 'Scan a barcode';
    body = (
      <Scanner
        onResult={({ food: f }) => open(f)}
        onNotFound={code => { setFormInitial(code ? { barcode: code, notFound: true } : {}); setView('form'); }}
      />
    );
  } else if (view === 'form') {
    title = formInitial?.custom && !formInitial?.unsaved ? 'Edit product' : 'New product';
    body = (
      <>
        {formInitial?.notFound ? (
          <View style={{ backgroundColor: C.accentSoft, padding: 12, borderRadius: 12, marginBottom: 14 }}>
            <Text style={{ color: C.ink, fontWeight: '600' }}>Barcode {formInitial.barcode} isn't in the database yet.</Text>
            <Muted>Add it from the label once and it'll scan instantly from now on.</Muted>
          </View>
        ) : null}
        <ProductForm
          initial={formInitial}
          onSaved={f => { onToast && onToast('Saved ' + f.name); open(f); }}
          onDeleted={() => { setView('search'); onToast && onToast('Food deleted'); }}
        />
      </>
    );
  } else if (view === 'detail' && food) {
    title = food.kind === 'recipe' ? 'Recipe' : 'Food';
    body = <FoodDetail food={food} meal={meal} day={day} onAdded={done} onEdit={edit} />;
  }

  if (body) {
    return (
      <Sheet visible={visible} title={title} onClose={() => (view === 'search' || start !== 'search' && view === start ? onClose() : setView('search'))} scroll={view !== 'scan'}>
        {view !== 'scan' && (
          <Pressable onPress={() => setView('search')} style={{ marginBottom: 12 }}>
            <Text style={{ color: C.accent, fontWeight: '700' }}>‹ Back to search</Text>
          </Pressable>
        )}
        {body}
      </Sheet>
    );
  }

  return (
    <Sheet visible={visible} title={title} onClose={onClose} scroll={false}>
      <View style={{ padding: 16, gap: 10 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Btn title="Scan barcode" onPress={() => setView('scan')} style={{ flex: 1 }} />
          <Btn kind="ghost" title="New product" onPress={() => { setFormInitial({}); setView('form'); }} style={{ flex: 1 }} />
        </View>
        <TextInput
          value={q} onChangeText={setQ} placeholder="Search foods, brands, recipes…" placeholderTextColor="#C9A3AF"
          style={[s.input, { fontSize: 16 }]}
        />
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          {[['foods', 'All foods'], ['recent', 'Recent'], ['mine', 'My foods'], ['recipes', 'Recipes']].map(([k, l]) => (
            <Chip key={k} label={l} active={tab === k} onPress={() => setTab(k)} />
          ))}
        </View>
      </View>
      <FlatList
        data={list}
        keyExtractor={f => f.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        ListEmptyComponent={<Muted style={{ textAlign: 'center', marginTop: 30 }}>{tab === 'mine' ? 'Products you add or scan will appear here.' : tab === 'recent' ? 'Foods you log will appear here.' : 'Nothing matches. Try scanning the barcode or adding a new product.'}</Muted>}
        renderItem={({ item: f }) => <FoodRow f={f} onPress={() => open(f)} />}
      />
    </Sheet>
  );
}

export function FoodRow({ f, onPress }) {
  const isRecipe = f.kind === 'recipe';
  const n = isRecipe ? f.per : f.n || {};
  const mult = isRecipe ? 1 : (f.serv || 100) / 100;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.line, flexDirection: 'row', gap: 10, alignItems: 'center' }, pressed && { opacity: 0.6 }]}>
      <View style={{ flex: 1 }}>
        {f.brand ? <Text style={{ fontSize: 11, color: C.accent, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 }}>{f.brand}</Text> : null}
        <Text style={{ fontSize: 15, color: C.ink, fontWeight: '600' }} numberOfLines={2}>{f.name}</Text>
        <Muted>{isRecipe ? `per serving · serves ${f.serves}` : f.servLabel || `${f.serv || 100} g`}</Muted>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ fontWeight: '700', color: C.ink, fontVariant: ['tabular-nums'] }}>{r0((n.k || 0) * mult)} kcal</Text>
        <Text style={{ fontSize: 12, color: C.protein, fontVariant: ['tabular-nums'] }}>{r1((n.p || 0) * mult)} g protein</Text>
      </View>
    </Pressable>
  );
}
