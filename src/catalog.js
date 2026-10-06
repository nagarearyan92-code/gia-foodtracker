import { FOOD, FOODS, HIDDEN, RECIPES } from './data';

export const BUILT_IN = FOODS.filter(f => !HIDDEN.has(f.id));

export const RECIPE_FOODS = RECIPES.map(r => ({
  ...r,
  kind: 'recipe',
  id: 'recipe-' + r.id,
  name: r.name.charAt(0).toUpperCase() + r.name.slice(1),
  ingLines: [
    ...r.ing.map(([id, g]) => {
      const f = FOOD[id];
      const label = f ? (f.brand ? `${f.brand} ${f.name}` : f.name) : id;
      return `${g} g ${label}`;
    }),
    ...(r.extra || []),
  ],
}));

export const GROUPS = [...new Set(BUILT_IN.map(f => f.group))];

export function searchFoods(list, q) {
  const t = q.trim().toLowerCase();
  if (!t) return list;
  const words = t.split(/\s+/);
  return list.filter(f => {
    const hay = `${f.brand || ''} ${f.name} ${f.group || ''}`.toLowerCase();
    return words.every(w => hay.includes(w));
  });
}

// Protein per 100 kcal, used to rank foods.
export const proteinDensity = f => (f.n && f.n.k ? (f.n.p / f.n.k) * 100 : 0);
