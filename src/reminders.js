import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { dateKey, loadDays } from './store';

// Gentle, local food-logging reminders. Nothing leaves the phone.
// Smart part: each reminder is scheduled per day, and a meal's reminder is skipped
// for today once something is logged in that meal.

const CHANNEL = 'reminders';
const DAYS_AHEAD = 14;

export const REMINDERS = [
  { key: 'Breakfast', label: 'Breakfast', hour: 9, minute: 30,
    title: 'Morning, Gia ☀️', body: "Had breakfast? Pop it in your diary when you get a sec." },
  { key: 'Lunch', label: 'Lunch', hour: 13, minute: 30,
    title: 'Lunch check-in 🥗', body: "What did you have for lunch? A quick log keeps today on track." },
  { key: 'Dinner', label: 'Dinner', hour: 19, minute: 30,
    title: 'Dinner time 🍲', body: "Log your dinner and see how close you are to your protein goal." },
  { key: 'Evening', label: 'Evening wrap-up', hour: 21, minute: 0,
    title: 'How did today go? 💗', body: "Anything not logged yet? No pressure, every bit counts." },
];

export const DEFAULT_SETTINGS = {
  enabled: false,
  items: Object.fromEntries(REMINDERS.map(r => [r.key, { on: true, hour: r.hour, minute: r.minute }])),
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false,
  }),
});

export async function getSettings() {
  try {
    const v = await AsyncStorage.getItem('reminders');
    if (!v) return DEFAULT_SETTINGS;
    const s = JSON.parse(v);
    return { ...DEFAULT_SETTINGS, ...s, items: { ...DEFAULT_SETTINGS.items, ...(s.items || {}) } };
  } catch (e) {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings) {
  await AsyncStorage.setItem('reminders', JSON.stringify(settings));
  await reschedule(settings);
}

// Ask Android for notification permission. Returns true if allowed.
export async function ensurePermission() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Food reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#C2456F',
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const res = await Notifications.requestPermissionsAsync();
  return !!res.granted;
}

// Cancel everything and schedule the next DAYS_AHEAD days of reminders.
export async function reschedule(settingsArg) {
  try {
    const settings = settingsArg || (await getSettings());
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!settings.enabled) return;
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) return;

    const now = new Date();
    const todayKey = dateKey(now);
    const [today] = await loadDays([todayKey]);
    const loggedMeals = new Set(today.entries.map(e => e.meal));

    for (let d = 0; d < DAYS_AHEAD; d++) {
      for (const r of REMINDERS) {
        const it = settings.items[r.key];
        if (!it || !it.on) continue;
        const when = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d, it.hour, it.minute, 0);
        if (when <= now) continue;
        if (d === 0) {
          if (r.key !== 'Evening' && loggedMeals.has(r.key)) continue;
          if (r.key === 'Evening' && loggedMeals.size >= 3) continue;
        }
        await Notifications.scheduleNotificationAsync({
          content: { title: r.title, body: r.body },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when, channelId: CHANNEL },
        });
      }
    }
  } catch (e) {
    // Reminders are a nice-to-have; never let them break the app.
  }
}

export const fmtTime = (h, m) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
