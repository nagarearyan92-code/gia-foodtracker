// Barcode lookup against Open Food Facts (free, crowd-sourced, good UK coverage).
// https://openfoodfacts.github.io/openfoodfacts-server/api/

const FIELDS = [
  'product_name', 'product_name_en', 'brands', 'serving_size', 'serving_quantity', 'nutriments',
].join(',');

function num(v) {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return typeof n === 'number' && !Number.isNaN(n) ? n : undefined;
}

// Convert OFF nutriments (per 100 g, minerals in grams) to our units.
export function mapNutriments(nm = {}) {
  let k = num(nm['energy-kcal_100g']);
  if (k == null && num(nm['energy_100g']) != null) k = num(nm['energy_100g']) / 4.184; // kJ -> kcal
  const g = key => num(nm[key + '_100g']);
  const mg = key => (g(key) != null ? g(key) * 1000 : undefined);
  const ug = key => (g(key) != null ? g(key) * 1e6 : undefined);
  const out = {
    k, p: g('proteins'), c: g('carbohydrates'), f: g('fat'), fi: g('fiber'),
    sug: g('sugars'), sat: g('saturated-fat'), salt: g('salt'),
    iron: mg('iron'), ca: mg('calcium'), zn: mg('zinc'),
    b12: ug('vitamin-b12'), vd: ug('vitamin-d'),
  };
  Object.keys(out).forEach(key => out[key] == null && delete out[key]);
  return out;
}

const UA = 'GiaMia/1.0 (https://github.com/nagarearyan92-code/gia-foodtracker)';
let lastSearch = 0;

function toFood(p, code) {
  const n = mapNutriments(p.nutriments);
  return {
    name: (p.product_name_en || p.product_name || '').trim() || 'Unnamed product',
    brand: (p.brands || '').split(',')[0].trim(),
    barcode: code,
    serv: num(p.serving_quantity) || 100,
    servLabel: p.serving_size || '',
    n,
    source: 'Open Food Facts',
  };
}

// Search products by name. Open Food Facts allows ~10 searches a minute, so this runs when she
// taps "Search online", not on every keystroke. UK products first; falls back to everywhere.
export async function searchProducts(query) {
  const q = query.trim();
  if (q.length < 2) return [];
  const wait = 2500 - (Date.now() - lastSearch);
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastSearch = Date.now();
  const run = async uk => {
    const params = new URLSearchParams({
      search_terms: q, search_simple: '1', action: 'process', json: '1', page_size: '25',
      fields: 'code,product_name,product_name_en,brands,serving_size,serving_quantity,nutriments',
    });
    if (uk) { params.set('tagtype_0', 'countries'); params.set('tag_contains_0', 'contains'); params.set('tag_0', 'united-kingdom'); }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?${params}`, { headers: { 'User-Agent': UA }, signal: controller.signal });
      if (res.status === 429 || res.status === 503) throw new Error('busy');
      if (!res.ok) throw new Error('Search failed (' + res.status + ')');
      const data = await res.json();
      return (data.products || [])
        .filter(p => p.code && (p.product_name || p.product_name_en))
        .map(p => ({ ...toFood(p, p.code), id: 'off-' + p.code, unsaved: true }))
        .filter(f => f.n.k != null && f.n.p != null); // only products with usable nutrition
    } finally {
      clearTimeout(timer);
    }
  };
  let list = await run(true);
  if (list.length < 3) {
    const more = await run(false);
    const seen = new Set(list.map(f => f.id));
    list = [...list, ...more.filter(f => !seen.has(f.id))];
  }
  return list.slice(0, 25);
}

export async function lookupBarcode(code) {
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${FIELDS}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA },
      signal: controller.signal,
    });
    if (res.status === 404) return { found: false };
    if (!res.ok) throw new Error('Lookup failed (' + res.status + ')');
    const data = await res.json();
    if (data.status !== 1 || !data.product) return { found: false };
    const p = data.product;
    const n = mapNutriments(p.nutriments);
    return {
      found: true,
      complete: n.k != null && n.p != null,
      food: {
        name: (p.product_name_en || p.product_name || '').trim() || 'Unnamed product',
        brand: (p.brands || '').split(',')[0].trim(),
        barcode: code,
        serv: num(p.serving_quantity) || 100,
        servLabel: p.serving_size || '',
        n,
        source: 'Open Food Facts',
      },
    };
  } finally {
    clearTimeout(timer);
  }
}
