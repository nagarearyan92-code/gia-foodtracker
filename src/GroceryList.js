// Grocery list inside the Foods tab: grouped by aisle, tick things off as you shop, share it.
import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Share, Text, TextInput, View } from 'react-native';
import { C } from './theme';
import { useSetting } from './store';
import { OTHER, addGroceryItems, clearAllGrocery, clearDoneGrocery, groceryText, removeGrocery, toggleGrocery } from './grocery';
import { Btn, Card, Muted, s as ui } from './ui';

// Aisles in a sensible walking order; anything else goes at the end.
const ORDER = ['Fresh fruit & veg', 'Yogurt & milk', 'Cottage & soft cheese', 'Grains & bread', 'Beans & lentils', 'Tins & frozen', 'Nuts & seeds', 'Sauces', 'Spices & extras', 'Protein powder', 'My foods', OTHER];
const rank = g => { const i = ORDER.indexOf(g); return i < 0 ? ORDER.length - 1 : i; };

export default function GroceryList({ onToast }) {
  const list = useSetting('grocery', []);
  const [text, setText] = useState('');
  const groups = useMemo(() => {
    const open = (list || []).filter(x => !x.done);
    const names = [...new Set(open.map(x => x.group || OTHER))].sort((a, b) => rank(a) - rank(b));
    return names.map(g => ({ g, items: open.filter(x => (x.group || OTHER) === g) }));
  }, [list]);
  if (!list) return null;
  const done = list.filter(x => x.done);
  const openCount = list.length - done.length;

  async function add() {
    // "milk, bananas, oats" adds three items
    const parts = text.split(/,|\n/).map(t => t.trim()).filter(Boolean);
    if (!parts.length) return;
    const n = await addGroceryItems(parts.map(t => ({ text: t.charAt(0).toUpperCase() + t.slice(1) })));
    setText('');
    if (!n) onToast && onToast('Already on your list');
  }
  const share = () => Share.share({ message: groceryText(list) }).catch(() => {});
  const clearAll = () => Alert.alert('Clear the whole list?', 'This removes everything, ticked or not.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Clear all', style: 'destructive', onPress: () => clearAllGrocery() },
  ]);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 4, gap: 12, paddingBottom: 110 }} keyboardShouldPersistTaps="handled">
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput value={text} onChangeText={setText} onSubmitEditing={add} returnKeyType="done" blurOnSubmit={false}
          placeholder="Add an item, e.g. paneer, bananas" placeholderTextColor="#C9A3AF" style={[ui.input, { flex: 1, fontSize: 16 }]} />
        <Btn title="Add" onPress={add} style={{ paddingHorizontal: 18 }} />
      </View>

      {!list.length ? (
        <Card style={{ backgroundColor: C.accentSoft, borderColor: C.accentSoft, gap: 6 }}>
          <Text style={{ color: C.ink, fontWeight: '800', fontSize: 16 }}>Your grocery list 🛒</Text>
          <Muted>Type items above, or tap "Add to grocery list" on any food. On a recipe, it adds all the ingredients at once.</Muted>
        </Card>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ flex: 1, color: C.ink, fontWeight: '700' }}>{openCount ? `${openCount} to buy` : 'All done 🎉'}</Text>
          <Pressable onPress={share} hitSlop={8}><Text style={link}>Share</Text></Pressable>
          <Pressable onPress={clearAll} hitSlop={8}><Text style={[link, { color: C.muted }]}>Clear</Text></Pressable>
        </View>
      )}

      {groups.map(({ g, items }) => (
        <Card key={g} style={{ paddingVertical: 8 }}>
          <Text style={head}>{g}</Text>
          {items.map(x => <Item key={x.id} x={x} />)}
        </Card>
      ))}

      {done.length ? (
        <Card style={{ paddingVertical: 8, opacity: 0.85 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[head, { flex: 1 }]}>In the basket · {done.length}</Text>
            <Pressable onPress={() => clearDoneGrocery()} hitSlop={8}><Text style={link}>Remove ticked</Text></Pressable>
          </View>
          {done.map(x => <Item key={x.id} x={x} />)}
        </Card>
      ) : null}
      {list.length ? <Muted style={{ textAlign: 'center' }}>Tap to tick off · hold to delete</Muted> : null}
    </ScrollView>
  );
}

function Item({ x }) {
  return (
    <Pressable onPress={() => toggleGrocery(x.id)} onLongPress={() => removeGrocery(x.id)}
      style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.line }, pressed && { opacity: 0.6 }]}>
      <View style={{ width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: x.done ? C.good : C.accent, backgroundColor: x.done ? C.good : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
        {x.done ? <Text style={{ color: '#fff', fontWeight: '900', fontSize: 13 }}>✓</Text> : null}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: x.done ? C.muted : C.ink, fontWeight: '600', fontSize: 15, textDecorationLine: x.done ? 'line-through' : 'none' }}>{x.text}</Text>
        {x.note && !x.done ? <Muted numberOfLines={1}>for {x.note}</Muted> : null}
      </View>
    </Pressable>
  );
}

const head = { fontSize: 12, fontWeight: '800', color: C.accent, textTransform: 'uppercase', letterSpacing: 0.8, paddingVertical: 6 };
const link = { color: C.accent, fontWeight: '700' };
