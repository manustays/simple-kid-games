# Agent Guide — Simple Kid Games

This file tells coding agents how to create a new activity in this repository.
Read it fully before writing any code.

---

## What this repo is

A collection of pure-web games and activities for toddlers, hosted on GitHub Pages.
Each activity is an independent installable PWA that launches fullscreen.

**Non-negotiable constraints:**
- No frameworks (no React, Vue, Svelte, etc.)
- No npm, no build step, no bundler
- No external runtime dependencies (web fonts from Google Fonts are fine)
- Every activity must work offline after the first load
- Every activity must be installable as a standalone fullscreen PWA

---

## File checklist for every new activity

Create a folder at the repo root named after the activity (short, lowercase, no spaces).
It must contain exactly these three files:

```
<activity-name>/
├── index.html      ← the entire app (HTML + CSS + JS, all inline)
├── manifest.json   ← PWA manifest
└── sw.js           ← service worker
```

Do not create additional files unless the activity genuinely needs separate assets (e.g. audio files).
Do not create a separate `.css` or `.js` file — keep everything inline in `index.html`.

---

## 1. `manifest.json`

Copy this template exactly; replace the placeholder values.

```json
{
  "name": "<Full Activity Name>",
  "short_name": "<Short Name>",
  "description": "<One sentence description for a toddler app>",
  "start_url": "./",
  "scope": "./",
  "display": "fullscreen",
  "orientation": "portrait-primary",
  "background_color": "<dominant background hex>",
  "theme_color": "<dominant background hex>",
  "icons": [
    {
      "src": "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 192 192'><rect width='192' height='192' rx='32' fill='%23RRGGBB'/><text x='96' y='135' font-size='120' text-anchor='middle' fill='%23RRGGBB'>X</text></svg>",
      "sizes": "192x192",
      "type": "image/svg+xml"
    }
  ]
}
```

Rules:
- `scope` **must** be `"./"` — this locks the PWA to its own subfolder.
- `display` **must** be `"fullscreen"`.
- `start_url` **must** be `"./"`.
- The inline SVG icon is fine for now; embed a meaningful emoji or character as the icon glyph.
- `background_color` and `theme_color` should match the app's actual background so the splash screen looks right.

---

## 2. `sw.js`

Copy this template exactly; only change the `CACHE` name.

```js
const CACHE = '<activity-name>-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (!e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
```

Rules:
- The cache name must be unique per activity: `<activity-name>-v1`.
- Do not fetch or cache anything from external origins inside the SW.
- If the activity gains new files, add them to the `ASSETS` array.

---

## 3. `index.html`

### Required `<head>` boilerplate

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="theme-color" content="<dominant background hex>" />
  <title><Activity Name></title>
  <link rel="manifest" href="manifest.json" />
  <!-- web fonts are optional but fine -->
</head>
```

### Required SW registration (last thing before `</body>`)

```html
<script>
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js');
  }
</script>
</body>
</html>
```

---

## Design rules

These rules exist because the audience is toddlers (age 1–4) using a phone or tablet, often without adult help.

### Layout
- Use `position: fixed; inset: 0` on the root element — the app must fill the entire screen with no scrolling.
- Split the screen into two vertical zones: a large **display area** (top, `flex: 1`) and an **interaction area** (bottom, fixed height). Adjust the split for the specific activity.
- All interactive elements must have `touch-action: manipulation` and `-webkit-tap-highlight-color: transparent`.
- Disable text selection everywhere: `user-select: none`.
- `overflow: hidden` on `html, body` — no scrollbars, ever.

### Touch targets
- Minimum tap target size: **72 × 72 px** (preferably larger, up to 1/3 of screen width for primary actions).
- Use `pointerdown` (not `click`) for instant response on touch devices.
- Add a visible press animation (e.g. `transform: scale(0.92)`) so the child gets immediate tactile feedback.

### Typography
- Use `'Fredoka One'` (from Google Fonts) for display digits/letters/labels — it is round, friendly, and highly legible for pre-readers.
- Font sizes must use `clamp()` to scale with screen size. Minimum: `clamp(32px, 8vw, 64px)` for primary content.
- Never use a font smaller than `1rem` for any visible label.

### Color
- Dark background (`#0f0a1e` or similar near-black) — reduces eye strain and makes bright colors pop.
- Use a vivid, high-contrast color palette for interactive elements. Assign a distinct color to each key/item. Example palette:
  ```
  #ff4d6d  #ff9f1c  #2ec4b6  #c77dff  #f72585
  #7bdff2  #ffe74c  #6aff6a  #a8dadc  #b2f7ef
  ```
- Interactive elements (buttons, targets) must use strong saturated colors with a `box-shadow` or `drop-shadow` glow in their own color.
- Animate responses: use `@keyframes` pop/scale/bounce animations on every meaningful interaction.

### Animation & feedback
- Every tap must produce immediate, obvious visual feedback: a pop animation on the result element, a ripple on the button, and/or a floating emoji burst.
- Animation durations: 200–400ms for responses, 600–900ms for celebrations.
- Use `cubic-bezier(0.36, 1.56, 0.64, 1)` (overshoot) for object-appearance animations — children find the "bounce past then settle" motion delightful.

### Audio
- Use the Web Audio API (`AudioContext`) for sounds — do not load external audio files.
- Keep sounds short (< 0.5 s), pleasant, and not startling. Simple sine/triangle wave tones work well.
- Always create audio on a user gesture (pointerdown), not on page load, to comply with browser autoplay policies.

### Avoid
- No modal dialogs, alerts, or confirmations.
- No navigation links inside the activity (it is a fullscreen app).
- No text instructions longer than 2–4 words — the audience cannot read.
- No timers or fail states that create frustration. Every tap should "win".
- No network requests at runtime (all assets must be cached by the SW).

---

## After creating the activity files

1. Add a `<a class="card">` entry to the **root `index.html`** launcher:

```html
<a class="card" href="<activity-name>/">
  <div class="card-icon"><emoji></div>
  <div class="card-body">
    <div class="card-title"><Full Name></div>
    <div class="card-desc"><One line description></div>
  </div>
</a>
```

2. Add a row to the **Activities** table in `README.md`:

```markdown
| [`<activity-name>/`](<activity-name>/) | <Full Name> | <Short description> |
```

---

## Reference implementation

Study `type/` before writing a new activity — it demonstrates all the patterns above:
- Inline CSS + JS in one `index.html`
- `manifest.json` with correct `scope` and `start_url`
- `sw.js` with cache-first strategy
- Large colorful buttons with `pointerdown` handling, ripple, and burst animations
- `clamp()`-based font sizing
- Web Audio API tones on tap
