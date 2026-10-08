# Gia Mia: notes for Claude

Gia Mia is an Expo (React Native, plain JavaScript) Android app that Aryan made for his partner Gia:
a vegetarian food diary with recipes, period tracker, check-ins with an AI friend ("Miss Curious Bae"),
supplements, grocery list and more. Read AGENTS.md for Expo rules.

When you change the app:
- Keep Gia's saved data working. Storage keys (AsyncStorage via src/store.js `readSetting`/`writeSetting`)
  must stay compatible: add new fields with defaults, never rename or drop existing ones.
- She is vegetarian: no meat or fish, no eggs, and she avoids soy/tofu. Food ideas and recipes must respect that.
- UK English, warm and friendly tone. Baby pink theme (src/theme.js); reuse `C` colours and components in src/ui.js.
- Write a short, warm note for Gia about what's new in WHATS_NEW.md (shown in the app's update banner).
- Check it still bundles: `npx expo export --platform android --output-dir /tmp/check` must succeed.
- Don't edit .github/workflows or bump versions; the build workflow handles versions.
- Merging to main builds a new APK that Gia receives through the app's Update button, so only
  ship complete, working changes.
