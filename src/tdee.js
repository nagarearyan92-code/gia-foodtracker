// Calorie needs using the Mifflin–St Jeor equation.

export const ACTIVITY = [
  { key: 'sedentary', label: 'Mostly sitting', hint: 'Desk job, little exercise', factor: 1.2 },
  { key: 'light', label: 'Lightly active', hint: 'Walks, exercise 1–3 days a week', factor: 1.375 },
  { key: 'moderate', label: 'Moderately active', hint: 'Exercise 3–5 days a week', factor: 1.55 },
  { key: 'very', label: 'Very active', hint: 'Hard exercise 6–7 days a week', factor: 1.725 },
];

export const GOALS = [
  { key: 'lose', label: 'Gentle loss', hint: 'About 0.25–0.3 kg a week', delta: -300 },
  { key: 'maintain', label: 'Maintain', hint: 'Stay where you are', delta: 0 },
  { key: 'gain', label: 'Gentle gain', hint: 'Build muscle slowly', delta: 250 },
];

export const DEFAULT_PROFILE = { sex: 'female', age: '', height: '', activity: 'light', goal: 'maintain', auto: true };

export function bmr({ sex, age, height, weight }) {
  const base = 10 * weight + 6.25 * height - 5 * age;
  return sex === 'male' ? base + 5 : base - 161;
}

// Returns null if inputs are incomplete.
export function calculate(profile, weight) {
  const age = parseFloat(profile.age), height = parseFloat(profile.height), w = parseFloat(weight);
  if (!age || !height || !w || age < 14 || age > 100 || height < 120 || height > 230 || w < 30 || w > 250) return null;
  const act = ACTIVITY.find(a => a.key === profile.activity) || ACTIVITY[1];
  const goal = GOALS.find(g => g.key === profile.goal) || GOALS[1];
  const b = bmr({ sex: profile.sex, age, height, weight: w });
  const tdee = b * act.factor;
  // Never suggest eating below resting needs, and never below 1,200 kcal.
  const raw = tdee + goal.delta;
  const floor = Math.max(b, 1200);
  const kcal = Math.round(Math.max(raw, floor) / 10) * 10;
  const protein = Math.round(w * (profile.goal === 'maintain' ? 1.2 : 1.4));
  const fat = Math.round((kcal * 0.3) / 9);
  const fibre = Math.max(25, Math.round((kcal / 1000) * 14));
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9 - fibre * 2) / 4));
  return { bmr: Math.round(b), tdee: Math.round(tdee), k: kcal, p: protein, f: fat, c: carbs, fi: fibre, clamped: raw < floor };
}
