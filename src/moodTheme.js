// Mood colours: the second colour follows today's check-in mood. Baby pink always stays.
// Turned off with the "Match colours to my mood" switch on the Me tab (setting: moodColours).
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { C } from './theme';
import { dateKey, useSetting } from './store';

export const EVERYDAY = { accent2: '#7A1934', accent2Soft: '#F6E3E8', accent2Line: '#EBC7D1', name: 'burgundy' };

// Low moods get softer, more soothing colours, never darker ones.
export const MOOD_COLOURS = {
  5: { accent2: '#C98A1E', accent2Soft: '#FFF1D6', accent2Line: '#F2DBA8', name: 'sunny gold', note: "I've added some sunshine to your app today ☀️" },
  4: { accent2: '#3A9A86', accent2Soft: '#DDF3EC', accent2Line: '#BFE5D8', name: 'fresh mint', note: 'Your app has gone a fresh mint to match your good day 🌿' },
  3: { ...EVERYDAY, note: '' },
  2: { accent2: '#8B6BC9', accent2Soft: '#EFE7FB', accent2Line: '#DCCDF3', name: 'calm lavender', note: "I've made things a little calmer in here today 💜" },
  1: { accent2: '#5B7FA6', accent2Soft: '#E5EDF6', accent2Line: '#CAD8E8', name: 'soft, soothing blue', note: "I've made everything soft and quiet in here for you today 💙" },
};

export function paletteFor(mood, enabled = true) {
  return (enabled && MOOD_COLOURS[mood]) || EVERYDAY;
}

function apply(p) {
  C.accent2 = p.accent2;
  C.accent2Soft = p.accent2Soft;
  C.accent2Line = p.accent2Line;
}

// Used by App: sets the colours for today before the screens render, and re-checks when the app
// comes back to the front (so a new day starts in burgundy).
export function useMoodTheme() {
  const enabled = useSetting('moodColours', true);
  const checkins = useSetting('checkins', {});
  const [today, setToday] = useState(dateKey(new Date()));
  useEffect(() => {
    const sub = AppState.addEventListener('change', st => st === 'active' && setToday(dateKey(new Date())));
    return () => sub.remove();
  }, []);
  const mood = checkins?.[today]?.mood || null;
  const p = paletteFor(mood, enabled !== false);
  apply(p);
  return p.accent2; // changes whenever the colours do
}

// A short line Miss Curious Bae can add about the colour change, for today's check-in only.
export function colourNote(mood, enabled, isToday) {
  if (!enabled || !isToday) return '';
  return MOOD_COLOURS[mood]?.note || '';
}
