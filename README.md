# Simple Kid Games

A collection of simple, pure web-based games and interactive activities for toddlers. No frameworks, no dependencies, no build step — just open and play.

Live at: **https://&lt;username&gt;.github.io/simple-kid-games/**

## Philosophy

- **Zero setup** — every activity is a self-contained folder with plain HTML, CSS, and JavaScript
- **Touch-friendly** — designed for tablets and phones as well as desktops
- **Offline-capable** — each activity installs as its own PWA and works without a network connection
- **Distraction-free** — installed apps launch fullscreen with no browser UI
- **Safe** — no tracking, no ads, no external data collection

## Activities

| Folder | Name | Description |
|--------|------|-------------|
| [`type/`](type/) | Number Fun! | Tap or type numbers 0–9; each one pops with color |

## Architecture

### Hosting

The project is hosted on **GitHub Pages** (static, zero config). The root [`index.html`](index.html) is a launcher page that links to every activity.

### Per-activity PWAs

Each subfolder is an independent installable PWA. Because each one has its own `manifest.json` (with `scope: "./"`) and its own `sw.js`, the browser treats them as completely separate apps. Users can install all of them simultaneously — each appears as its own icon on the home screen.

On **Android Chrome** the install banner fires automatically after the second visit.
On **iOS Safari** use Share → "Add to Home Screen".
Both launch in `fullscreen` mode with no browser UI.

### Service worker scoping

A service worker is automatically scoped to the directory it lives in, so the SWs never overlap:

| File | Scope |
|------|-------|
| `type/sw.js` | `/simple-kid-games/type/*` |
| `colors/sw.js` | `/simple-kid-games/colors/*` |

### Repository structure

```
simple-kid-games/
├── index.html              ← launcher page (lists all games)
├── README.md
└── type/                   ← one folder per activity
    ├── index.html          ← self-contained entry point; registers sw.js
    ├── manifest.json       ← PWA manifest (scope + start_url + icons)
    └── sw.js               ← network-first service worker with offline fallback
```

## Running Locally

Serve from the repo root with any static file server (required for service workers — `file://` won't work):

```bash
# Python 3
python3 -m http.server 8080

# Node.js
npx serve .
```

Then open `http://localhost:8080/`.

## Adding a New Activity

1. Create a new subfolder (e.g. `colors/`, `shapes/`, `alphabet/`).
2. Add `index.html` — fully self-contained; link to `manifest.json` and register `sw.js`.
3. Add `manifest.json` — include `"scope": "./"` and `"display": "fullscreen"`.
4. Add `sw.js` — network-first service worker with offline fallback (copy the pattern from [`type/sw.js`](type/sw.js) and update the cache name).
5. Add a card to the root [`index.html`](index.html) launcher.
6. Add a row to the **Activities** table in this README.

## Contributing

Pull requests are welcome! Please keep each activity self-contained and dependency-free.
