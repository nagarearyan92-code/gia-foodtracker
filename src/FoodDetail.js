import React, { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { C, MEALS, MICROS } from './theme';
import { addEntry, pushRecent, saveCustomFood, scale, uid } from './store';
import { Btn, Card, Chip, Field, MacroStrip, Muted, r1, s } from './ui';
import TimeRow from './TimeRow';
import { defaultTime } from './times';
import { addGroceryItems, foodLabel, recipeItems } from './grocery';

// Shows one food (built-in, custom, scanned or a recipe) and lets her add an amount to a meal.
export default function FoodDetail({ food, meal: initialMeal, day, onAdded, onEdit }) {
  const isRecipe = food.kind === 'recipe';
  const [meal, setMeal] = useState(initialMeal || 'Snacks');
  const [amount, setAmount] = useState(String(isRecipe ? 1 : food.serv || 100));
  const [time, setTime] = useState(() => defaultTime(day, initialMeal || 'Snacks'));
  useEffect(() => { setAmount(String(isRecipe ? 1 : food.serv || 100)); }, [food.id]); // eslint-disable-line

  const qty = parseFloat(amount) || 0;
  const n = useMemo(() => {
    if (isRecipe) {
      const out = {};
      for (const k in food.per) out[k] = food.per[k] * qty;
      return out;
    }
    return scale(food.n, qty);
  }, [food, qty, isRecipe]);

  const incomplete = !isRecipe && food.n.k == null;
  const [onList, setOnList] = useState('');
  async function toGrocery() {
    const items = isRecipe ? recipeItems(food) : [{ text: foodLabel(food), group: food.custom ? undefined : food.group }];
    const n = await addGroceryItems(items);
    setOnList(isRecipe ? (n ? `✓ ${n} ingredient${n === 1 ? '' : 's'} added to your grocery list` : '✓ Already on your grocery list') : '✓ On your grocery list');
  }
  const GroceryBtn = onList
    ? <Text style={{ color: C.good, fontWeight: '700', textAlign: 'center' }}>{onList}</Text>
    : <Btn kind="ghost" title={isRecipe ? '🛒 Add ingredients to grocery list' : '🛒 Add to grocery list'} onPress={toGrocery} />;
  const micros = MICROS.filter(m => n[m.key] != null);

  async function add() {
    const amountLabel = isRecipe ? `${qty} serving${qty === 1 ? '' : 's'}` : `${qty} g`;
    await addEntry(day, {
      name: food.brand ? `${food.brand} ${food.name}` : food.name,
      meal, amountLabel, n, time,
    });
    if (food.unsaved) await saveCustomFood({ ...food, id: food.id || uid(), unsaved: undefined, custom: true });
    await pushRecent(food.unsaved ? { ...food, unsaved: undefined, custom: true } : food);
    onAdded && onAdded(`Added ${food.name} to ${meal}`);
  }

  return (
    <View style={{ gap: 14 }}>
      <View>
        {food.brand ? <Text style={{ color: C.accent, fontWeight: '700', fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' }}>{food.brand}</Text> : null}
        <Text style={{ fontSize: 22, fontWeight: '800', color: C.ink }}>{food.name}</Text>
        <Muted>
          {isRecipe
            ? `Serves ${food.serves} · ${food.time}`
            : `${food.servLabel ? food.servLabel + ' · ' : ''}${food.source || (food.custom ? 'Your food' : food.builtIn ? 'Label values' : '')}`}
          {food.barcode ? ` · ${food.barcode}` : ''}
        </Muted>
        {food.note ? <Muted style={{ marginTop: 4 }}>* {food.note}</Muted> : null}
      </View>

      {incomplete ? (
        <Card style={{ backgroundColor: C.accentSoft, borderColor: C.accent }}>
          <Text style={{ color: C.ink, fontWeight: '600' }}>This product was found, but its nutrition values are missing.</Text>
          <Muted style={{ marginTop: 4 }}>Copy them from the pack label so it can be tracked.</Muted>
          <Btn title="Enter label values" onPress={() => onEdit && onEdit(food)} style={{ marginTop: 10 }} />
        </Card>
      ) : (
        <>
          <Card>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
              <Field label={isRecipe ? 'Servings' : 'Amount (g or ml)'} value={amount} onChangeText={setAmount} numeric />
              {!isRecipe && (
                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', flex: 1.4 }}>
                  {food.serv && food.serv !== 100 ? <Chip label={`1 serving (${food.serv} g)`} onPress={() => setAmount(String(food.serv))} /> : null}
                  <Chip label="100 g" onPress={() => setAmount('100')} />
                </View>
              )}
              {isRecipe && (
                <View style={{ flexDirection: 'row', gap: 6, flex: 1.4 }}>
                  {[0.5, 1, 2].map(v => <Chip key={v} label={String(v)} active={qty === v} onPress={() => setAmount(String(v))} />)}
                </View>
              )}
            </View>
            <View style={{ marginTop: 12 }}><MacroStrip n={n} /></View>
            {micros.length > 0 && (
              <View style={{ marginTop: 12, gap: 4 }}>
                {micros.map(m => (
                  <View key={m.key} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Muted>{m.label}</Muted>
                    <Text style={{ color: C.ink, fontVariant: ['tabular-nums'] }}>{r1(n[m.key])} {m.unit}</Text>
                  </View>
                ))}
              </View>
            )}
          </Card>

          <View>
            <Muted style={{ marginBottom: 6 }}>Add to</Muted>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              {MEALS.map(m => <Chip key={m} label={m} active={meal === m} onPress={() => setMeal(m)} />)}
            </View>
          </View>

          <TimeRow label="Time eaten" value={time} onChange={setTime} />

          <Btn title={`Add to ${meal}`} onPress={add} disabled={qty <= 0} />
          {food.unsaved ? <Muted>Adding it also saves this product to your foods, so it's instant next time.</Muted> : null}
          {GroceryBtn}
          {!isRecipe && !food.builtIn && onEdit ? <Btn kind="ghost" title="Edit nutrition values" onPress={() => onEdit(food)} /> : null}
        </>
      )}

      {isRecipe && (
        <Card style={{ gap: 8 }}>
          <Text style={s.h}>Ingredients</Text>
          {food.ingLines.map((l, i) => <Text key={i} style={{ color: C.ink }}>• {l}</Text>)}
          <Text style={[s.h, { marginTop: 8 }]}>Method</Text>
          {food.steps.map((st, i) => <Text key={i} style={{ color: C.ink, lineHeight: 21 }}>{i + 1}. {st}</Text>)}
          {food.stated && food.stated !== 'Not given' ? <Muted style={{ marginTop: 6 }}>Recipe's own figures: {food.stated}</Muted> : null}
        </Card>
      )}
    </View>
  );
}
