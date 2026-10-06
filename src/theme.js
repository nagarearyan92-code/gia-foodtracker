// Baby pink theme, matching Gia's web page.
export const C = {
  bg: '#FFF0F4',
  surface: '#FFFFFF',
  sunk: '#FCE2EA',
  line: '#F4CBD8',
  ink: '#3A2229',
  muted: '#8A5F6C',
  accent: '#C2456F',
  accentInk: '#FFFFFF',
  accentSoft: '#FBDCE5',
  protein: '#C2456F',
  carbs: '#B9801A',
  fat: '#7B5CB8',
  fibre: '#1F7F86',
  water: '#3B82C4',
  warn: '#B4362A',
  good: '#2E7D4F',
};

export const MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];

// Nutrients tracked. unit is what we display; values are stored per 100 g in that unit.
export const MACROS = [
  { key: 'p', label: 'Protein', unit: 'g', color: C.protein },
  { key: 'c', label: 'Carbs', unit: 'g', color: C.carbs },
  { key: 'f', label: 'Fat', unit: 'g', color: C.fat },
  { key: 'fi', label: 'Fibre', unit: 'g', color: C.fibre },
];

// Micronutrients with UK adult female reference intakes (NHS / UK RNI).
export const MICROS = [
  { key: 'iron', label: 'Iron', unit: 'mg', target: 14.8 },
  { key: 'ca', label: 'Calcium', unit: 'mg', target: 700 },
  { key: 'b12', label: 'Vitamin B12', unit: 'µg', target: 1.5 },
  { key: 'vd', label: 'Vitamin D', unit: 'µg', target: 10 },
  { key: 'zn', label: 'Zinc', unit: 'mg', target: 7 },
  { key: 'sug', label: 'Sugars', unit: 'g', target: 90, limit: true },
  { key: 'sat', label: 'Saturated fat', unit: 'g', target: 20, limit: true },
  { key: 'salt', label: 'Salt', unit: 'g', target: 6, limit: true },
];

export const NUTRIENT_KEYS = ['k', 'p', 'c', 'f', 'fi', ...MICROS.map(m => m.key)];
