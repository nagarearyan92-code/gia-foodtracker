import React, { useMemo, useState } from 'react';
import { FlatList, TextInput, View } from 'react-native';
import { useCustomFoods } from '../store';
import { BUILT_IN, GROUPS, RECIPE_FOODS, proteinDensity, searchFoods } from '../catalog';
import { dateKey } from '../store';
import { FoodRow } from '../AddFlow';
import FoodDetail from '../FoodDetail';
import ProductForm from '../ProductForm';
import { Chip, Muted, Sheet, s } from '../ui';

const SORTS = [['pd', 'Most protein per kcal'], ['p', 'Most protein'], ['fi', 'Most fibre'], ['az', 'A to Z']];

// Browse all foods or recipes; tapping one lets her log it to today.
export default function Browse({ mode, onToast }) {
  const custom = useCustomFoods() || [];
  const [q, setQ] = useState('');
  const [group, setGroup] = useState('All');
  const [sort, setSort] = useState('pd');
  const [open, setOpen] = useState(null);
  const [editing, setEditing] = useState(null);
  const isRecipes = mode === 'recipes';

  const list = useMemo(() => {
    if (isRecipes) {
      let l = searchFoods(RECIPE_FOODS, q);
      if (group !== 'All') l = l.filter(r => r.tags.includes(group));
      return l;
    }
    let l = searchFoods([...custom, ...BUILT_IN], q);
    if (group === 'My foods') l = l.filter(f => f.custom);
    else if (group !== 'All') l = l.filter(f => f.group === group);
    const per = f => (f.serv || 100) / 100;
    const key = {
      pd: f => -proteinDensity(f),
      p: f => -(f.n.p || 0) * per(f),
      fi: f => -(f.n.fi || 0) * per(f),
    }[sort];
    return [...l].sort((a, b) => (sort === 'az' ? a.name.localeCompare(b.name) : key(a) - key(b)));
  }, [isRecipes, q, group, sort, custom]);

  const groups = isRecipes ? ['All', 'High protein', 'High fibre', 'Vegan'] : ['All', 'My foods', ...GROUPS];

  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: 16, gap: 10 }}>
        <TextInput value={q} onChangeText={setQ} placeholder={isRecipes ? 'Search recipes…' : 'Search foods and brands…'}
          placeholderTextColor="#C9A3AF" style={[s.input, { fontSize: 16 }]} />
        <FlatList horizontal data={groups} keyExtractor={g => g} showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6 }}
          renderItem={({ item }) => <Chip label={item} active={group === item} onPress={() => setGroup(item)} />} />
        {!isRecipes && (
          <FlatList horizontal data={SORTS} keyExtractor={x => x[0]} showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 6 }}
            renderItem={({ item: [k, l] }) => <Chip label={l} active={sort === k} onPress={() => setSort(k)} />} />
        )}
      </View>
      <FlatList
        data={list}
        keyExtractor={f => f.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 110 }}
        ListEmptyComponent={<Muted style={{ textAlign: 'center', marginTop: 30 }}>Nothing matches.</Muted>}
        renderItem={({ item }) => <FoodRow f={item} onPress={() => setOpen(item)} />}
      />
      <Sheet visible={!!open} title={isRecipes ? 'Recipe' : 'Food'} onClose={() => setOpen(null)}>
        {open && (
          <FoodDetail food={open} meal="Snacks" day={dateKey(new Date())}
            onAdded={msg => { onToast && onToast(msg + ' (today)'); setOpen(null); }}
            onEdit={f => { setOpen(null); setEditing(f); }} />
        )}
      </Sheet>
      <Sheet visible={!!editing} title="Edit product" onClose={() => setEditing(null)}>
        {editing && <ProductForm initial={editing} onSaved={() => { setEditing(null); onToast && onToast('Saved'); }} onDeleted={() => setEditing(null)} />}
      </Sheet>
    </View>
  );
}
