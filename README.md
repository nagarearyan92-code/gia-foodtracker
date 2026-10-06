# Gia Food Tracker

A vegetarian food and nutrition tracker for Android, built with Expo (React Native).

- Daily diary by meal, with calories, protein, carbs, fat and fibre against targets
- Barcode scanning with lookups in [Open Food Facts](https://world.openfoodfacts.org)
- Add your own products from the pack label (saved by barcode, so they scan instantly next time)
- Built-in UK branded foods and 30 vegetarian recipes with worked-out macros
- Vitamins and minerals (iron, B12, calcium, vitamin D, zinc) where the data has them
- Water, weight, 7- and 30-day trends

Everything is stored on the phone.

## Getting the app

Every push to `main` builds an APK with GitHub Actions and publishes it under
**Releases**. On the phone, open the latest release, download `GiaFoodTracker.apk`
and open it. The first time, Android asks to allow installs from the browser or files app.

## Changing foods or recipes

Foods and recipes live in `src/data.js`. Values are per 100 g; carbs exclude fibre
(as on UK labels). Recipes list ingredients by food id and grams.

## Running locally

```bash
npm ci
npx expo run:android   # needs Android Studio / SDK
```
