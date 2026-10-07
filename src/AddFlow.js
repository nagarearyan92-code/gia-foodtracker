import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { C } from './theme';
import { useCustomFoods, useRecent } from './store';
import { BUILT_IN, RECIPE_FOODS, searchFoods } from './catalog';
import FoodDetail from './FoodDetail';
import ProductForm from './ProductForm';
import Scanner from './Scanner';
import { searchProducts } from './openfoodfacts';
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
  const [online, setOnline] = useState({ q: '', state: 'idle', list: [] }); // idle | loading | done | error

  useEffect(() => {
    if (visible) { setView(start); setFood(null); setFormInitial(start === 'create' ? {} : null); setQ(''); setOnline({ q: '', state: 'idle', list: [] }); }
  }, [visible, start]);

  const list = useMemo(() => {
    if (tab === 'recipes') return searchFoods(RECIPE_FOODS, q);
    if (tab === 'mine') return searchFoods(custom, q);
    if (tab === 'recent') return searchFoods(recent, q);
    return searchFoods([...custom, ...BUILT_IN], q);
  }, [tab, q, custom, recent]);

  const open = f => { setFood(f); setView('detail'); };

  async function searchOnline() {
    const term = q.trim();
    setOnline({ q: term, state: 'loading', list: [] });
    try {
      const list = await searchProducts(term);
      const mine = new Set(custom.map(f => f.barcode).filter(Boolean));
      setOnline({ q: term, state: 'done', list: list.filter(f => !mine.has(f.barcode)) });
    } catch (e) {
      setOnline({ q: term, state: 'error', list: [], busy: e?.message === 'busy' });
    }
  }
  const showOnline = tab === 'foods' && q.trim().length >= 2;
  const onlineFresh = online.q === q.trim();
  const OnlineFooter = !showOnline ? null : (
    <View style={{ paddingTop: 14, gap: 6 }}>
      {onlineFresh && online.state === 'done' ? (
        <>
          <Text style={{ fontSize: 12, fontWeight: '800', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 4 }}>
            From Open Food Facts · {online.list.length} found
          </Text>
          {online.list.map(f => <FoodRow key={f.id} f={f} onPress={() => open(f)} />)}
          {!online.list.length ? <Muted>Nothing found online either. Try the brand plus product, e.g. "Tesco Greek yogurt", or scan the barcode.</Muted> : (
            <Muted style={{ marginTop: 6 }}>Values are crowd-sourced, so check the pack if a number looks odd. Adding one saves it to your foods.</Muted>
          )}
        </>
      ) : onlineFresh && online.state === 'loading' ? (
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', paddingVertical: 10 }}>
          <ActivityIndicator color={C.accent} /><Muted>Searching Open Food Facts…</Muted>
        </View>
      ) : (
        <>
          {onlineFresh && online.state === 'error'
            ? <Muted>{online.busy ? 'Open Food Facts is busy, try again in a minute.' : "Couldn't search online. Check you're connected."}</Muted>
            : null}
          <Btn kind="ghost" title={`🔎 Search online for “${q.trim()}”`} onPress={searchOnline} />
        </>
      )}
    </View>
  );
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
          returnKeyType="search" onSubmitEditing={() => { if (tab === 'foods' && q.trim().length >= 2 && !searchFoods([...custom, ...BUILT_IN], q).length) searchOnline(); }}
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
        ListEmptyComponent={showOnline ? null : <Muted style={{ textAlign: 'center', marginTop: 30 }}>{tab === 'mine' ? 'Products you add or scan will appear here.' : tab === 'recent' ? 'Foods you log will appear here.' : 'Nothing matches. Try scanning the barcode or adding a new product.'}</Muted>}
        ListFooterComponent={OnlineFooter}
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
