# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A collection of pure-web games and activities for toddlers (ages 1–4), hosted on GitHub Pages. Each activity is an independent installable PWA that launches fullscreen with no browser UI.

## Non-negotiable constraints

- No frameworks (no React, Vue, Svelte, etc.)
- No npm, no build step, no bundler
- No external runtime dependencies (Google Fonts are fine)
- Every activity must work offline after first load
- Every activity must be installable as a standalone fullscreen PWA

## Running locally

No build step required. Serve the repo root with any static file server:

```bash
python3 -m http.server 8080
# or
npx serve .
```

## Architecture

The repo is a **flat collection of self-contained activity folders** under the root. Each folder is an independent PWA scoped to its own path, which allows multiple apps to coexist on GitHub Pages without service worker conflicts.

```
simple-kid-games/
├── index.html          # Launcher page — links to all activities via .card elements
├── <activity-name>/
│   ├── index.html      # Entire app: HTML + CSS + JS all inline, no external files
│   ├── manifest.json   # PWA manifest (scope: "./", display: "fullscreen")
│   └── sw.js           # Network-first service worker scoped to this folder
```

The reference implementation is `type/` (Number Fun!). Study it before creating a new activity.

## Adding a new activity

1. Create `<activity-name>/index.html`, `manifest.json`, and `sw.js` — see `AGENTS.md` for exact templates.
2. Add a `.card` entry to the root `index.html` launcher.
3. Add a row to the Activities table in `README.md`.

Key rules from `AGENTS.md`:
- `manifest.json`: `scope` and `start_url` must be `"./"`, `display` must be `"fullscreen"`.
- `sw.js`: cache name must be `<activity-name>-v1`; use network-first strategy.
- `index.html`: register the SW as the last script before `</body>` using `{ updateViaCache: 'none' }`.

## Design rules (toddler UX)

- **Layout:** `position: fixed; inset: 0` on root; no scrolling; `overflow: hidden` on html/body; `user-select: none` everywhere.
- **Touch targets:** Minimum 72×72px. Use `pointerdown` (not `click`) for instant response. Add `transform: scale(0.92)` press feedback.
- **Typography:** Use `'Fredoka One'` for display text. Font sizes via `clamp()`. No font smaller than `1rem`.
- **Colors:** Dark background (`#0f0a1e`). Vivid high-contrast colors for buttons. Each key/item gets a distinct color with a matching glow (`box-shadow`).
- **Animation:** Every tap needs immediate feedback — pop animation + ripple/burst. Use `cubic-bezier(0.36, 1.56, 0.64, 1)` for object appearances.
- **Audio:** Web Audio API only (no external audio files). Create `AudioContext` on user gesture, not page load.
- **Avoid:** Modals, navigation links inside activities, text instructions longer than 2–4 words, timers, fail states, runtime network requests.
