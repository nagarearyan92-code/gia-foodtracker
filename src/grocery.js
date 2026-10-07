// Grocery list, stored on the phone under "grocery" (included in backups).
// Item: { id, text, group, done, note, addedAt }
import { readSetting, uid, writeSetting } from './store';
import { FOOD } from './data';

export const OTHER = 'Other';
export const SPICES = 'Spices & extras';
const norm = t => String(t || '').trim().toLowerCase().replace(/\s+/g, ' ');
const singular = t => { const n = norm(t); return n.endsWith('ies') ? n.slice(0, -3) + 'y' : /[^s]s$/.test(n) ? n.slice(0, -1) : n; };

export async function loadGrocery() { return readSetting('grocery', []); }
const save = list => writeSetting('grocery', list);

// Adds items, skipping ones already on the list (a ticked-off duplicate is put back on).
// Returns how many were newly added.
export async function addGroceryItems(items) {
  const list = await loadGrocery();
  let added = 0;
  for (const it of items) {
    const text = String(it.text || '').trim();
    if (!text) continue;
    const same = list.find(x => norm(x.text) === norm(text));
    if (same) {
      if (same.done) { same.done = false; added++; }
      if (it.note && !(same.note || '').includes(it.note)) same.note = same.note ? `${same.note}, ${it.note}` : it.note;
      continue;
    }
    list.push({ id: uid(), text, group: it.group || guessGroup(text), done: false, note: it.note || '', addedAt: Date.now() });
    added++;
  }
  await save(list);
  return added;
}

export async function toggleGrocery(id) {
  const list = await loadGrocery();
  await save(list.map(x => (x.id === id ? { ...x, done: !x.done } : x)));
}
export async function removeGrocery(id) { await save((await loadGrocery()).filter(x => x.id !== id)); }
export async function clearDoneGrocery() { await save((await loadGrocery()).filter(x => !x.done)); }
export async function clearAllGrocery() { await save([]); }

// Aisle for a typed item or recipe extra: obvious keywords first, then an exact match in her food list.
const AISLES = [
  [/\b(garlic|ginger)/i, 'Fresh fruit & veg'],
  [/\b(chilli powder|chili powder|turmeric|cumin|jeera|garam masala|masala|methi|paprika|seasoning|bay lea|cinnamon|cardamom|clove|nutmeg|oregano|thyme|mustard seed|stock cube|nutritional yeast|essence|extract|sweetener|monk fruit|baking|yeast|spice)/i, 'SPICES'],
  [/\b(sauce|ketchup|chutney|mayo|vinegar|honey|syrup|jam|pesto|puree|purée)/i, 'Sauces'],
  [/\b(yog(h)?urt|milk|cream|kefir|skyr)/i, 'Yogurt & milk'],
  [/\b(paneer|cheese|cottage|halloumi|feta|mozzarella)/i, 'Cottage & soft cheese'],
  [/\b(bread|wrap|tortilla|rice|oats|pasta|noodle|flour|granola|cereal|flakes|bagel)/i, 'Grains & bread'],
  [/\b(lentil|dal\b|daal|chickpea|chana|beans|rajma|kidney)/i, 'Beans & lentils'],
  [/\b(nuts?\b|seeds|almond|cashew|peanut|walnut|pistachio|makhana)/i, 'Nuts & seeds'],
  [/\b(tomato|onion|chilli|chili|coriander|cilantro|mint|lemon|lime|spinach|potato|carrot|cucumber|lettuce|pepper|mushroom|broccoli|cauliflower|banana|apple|berr|grape|avocado|mango|orange|herb|veg|fruit|salad|kale|courgette|aubergine)/i, 'Fresh fruit & veg'],
];
export function guessGroup(text) {
  const t = norm(text);
  if (!t) return OTHER;
  for (const [re, g] of AISLES) if (re.test(t)) return g === 'SPICES' ? SPICES : g;
  const foods = Object.values(FOOD).filter(f => f.group !== 'Hidden');
  const hit = foods.find(f => singular(f.name) === singular(t)) || foods.find(f => singular(t).includes(singular(f.name)) && f.name.length > 3);
  return hit ? hit.group : OTHER;
}

export const foodLabel = f => (f.brand ? `${f.brand} ${f.name}` : f.name);

const PANTRY_SKIP = /^(salt|water|warm water|hot water|black pepper|pepper|salt and pepper|ice|oil)$/i;

// Turns recipe notes like "Tadka: 1 tsp kasuri methi (toasted), 1.5 tsp Kashmiri chilli powder" into
// ["kasuri methi", "Kashmiri chilli powder"]. Cooking notes ("About 225 g per serving") are skipped.
export function extrasToItems(lines) {
  const out = [];
  for (const raw of lines || []) {
    const line = String(raw);
    if (/^\s*(about|contains|approx)/i.test(line) || /(can be swapped|instead of|\bis \d|per serving|=)/i.test(line)) continue;
    const body = line.replace(/\([^)]*\)/g, ' ').replace(/^[^:]{1,25}:\s*/, ''); // drop "(notes)" and "Tadka:" labels
    for (let piece of body.split(/,|\+|\bor\b/)) {
      piece = piece
        .replace(/^\s*(a\s+)?(few drops|handful|squeeze|pinch|splash)(\s+of)?\s+/i, '')
        .replace(/^\s*[\d½¼¾⅓.\/–-]+\s*(g|kg|ml|l|tbsp|tsp|cups?|scoops?|cloves?|drops?|medium|large|small|dried|fresh)?\b\s*/i, '')
        .replace(/^\s*(of|fresh|finely chopped|chopped|grated|minced)\s+/i, '')
        .replace(/[,.]?\s*(to taste|optional|of your choice|a few drops|soaked|minced|toasted|powdered)\s*$/i, '')
        .replace(/\s+/g, ' ').trim();
      if (!piece || piece.length > 40 || /\d/.test(piece) || PANTRY_SKIP.test(piece) || /^your choice$/i.test(piece)) continue;
      const text = piece.charAt(0).toUpperCase() + piece.slice(1);
      if (!out.some(x => singular(x) === singular(text))) out.push(text);
    }
  }
  return out;
}

// A recipe's ingredients as grocery items: its foods plus spices/extras from its notes.
export function recipeItems(recipe) {
  const items = (recipe.ing || []).map(([id]) => FOOD[id]).filter(Boolean)
    .map(f => ({ text: foodLabel(f), group: f.group === 'Hidden' ? OTHER : f.group, note: recipe.name }));
  // Skip extras already covered by a listed food ("Ketchup" when "Heinz Tomato Ketchup" is there).
  const covered = t => items.some(i => norm(i.text).includes(singular(t)));
  const extras = extrasToItems(recipe.extra).filter(t => !covered(t)).map(text => {
    const g = guessGroup(text);
    return { text, group: g === OTHER ? SPICES : g, note: recipe.name };
  });
  return [...items, ...extras];
}

// Plain-text list for sharing (WhatsApp, Notes…).
export function groceryText(list) {
  const open = list.filter(x => !x.done);
  if (!open.length) return 'Grocery list is empty 🛒';
  const groups = [...new Set(open.map(x => x.group || OTHER))];
  return ['🛒 Grocery list', ...groups.flatMap(g => ['', g, ...open.filter(x => (x.group || OTHER) === g).map(x => `• ${x.text}`)])].join('\n');
}
