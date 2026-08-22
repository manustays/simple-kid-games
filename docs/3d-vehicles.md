# 3D Vehicles — Maintainer's Guide

`3d-vehicles/` ("Vehicle World") is a fullscreen PWA for toddlers: a grid of 18 vehicles, each
opening into a 3D viewer where the child can spin the model and hear the vehicle's name spoken
aloud. This doc explains how the activity is built so a future contributor can safely add, fix, or
extend it. It assumes no prior familiarity with the code.

Two features are built and working but **disabled** behind the `FEATURES` object at the top of the
module script: `engineSound` (a synthesized per-vehicle engine while the 🔊 button is held) and
`headlights` (a 💡 toggle for a headlight/taillight rig). While a flag is `false` its button is
hidden and its handlers are never bound. Flip the flag to `true` to bring it back — nothing was
deleted. The sections below document both, since they are still in the code.

## What it does, from the child's side

1. Grid screen: 18 colorful cards (emoji + name), 4 columns, no scrolling.
2. Tapping a card opens the viewer: the 3D model animates in, its name is spoken, and it starts an
   idle auto-spin.
3. Drag on the canvas to rotate (yaw + limited pitch); arrow keys do the same; after 3s of no
   interaction, auto-spin resumes.
4. Holding the 🔊 button plays a synthesized engine sound for that vehicle's class; releasing stops
   it.
5. Tapping 💡 toggles a small headlight/taillight rig with a soft light cone.
6. Tapping the name label re-speaks the name. ◀ / ▶ step to the adjacent vehicle; ↩ returns to the
   grid.

## Keyboard (laptop use)

One global `keydown` handler covers both screens, so the whole activity is playable without a
pointer.

| Key | Viewer open | Grid screen |
|-----|-------------|-------------|
| Arrows | rotate (yaw ← →, pitch ↑ ↓), stops the auto-spin | ignored |
| `Escape` | back to the grid | ignored |
| `Space` / `Enter` | next vehicle in roster order, wraps (same as ▶) | opens the last-viewed vehicle (Bus on cold start) |
| a–z | opens a random vehicle whose **name** starts with that letter | same |
| digit, punctuation, unmatched letter | opens a random vehicle | same |

Details worth knowing before changing it:

- `pickVehicle()` matches on the visible `name`, not `id` — note `id: 'suv'` is named *Jeep* and
  `id: 'jeep'` is named *SUV*.
- It avoids re-picking the vehicle already open, but only when another candidate matches, so `v`
  on an open Van still reopens the Van rather than jumping somewhere unrelated.
- `key.length === 1` is the "printable key" test: it covers letters, digits and punctuation while
  leaving `Tab`, `Shift` and the F-keys alone. Any event with `ctrlKey`/`metaKey`/`altKey` is
  ignored so browser shortcuts (Cmd+R, Alt+Tab) still work.
- `e.repeat` is ignored for everything except the arrows — a held letter would otherwise stack
  model loads and speech utterances.

## File layout

```
3d-vehicles/
├── index.html                    ← entire app: HTML + CSS + JS, all inline
├── manifest.json                 ← PWA manifest (scope "./", display "fullscreen")
├── sw.js                         ← network-first service worker, cache "3d-vehicles-v1"
├── lib/
│   ├── three.module.min.js       ← vendored three.js 0.170.0
│   └── GLTFLoader.js             ← vendored three.js addon
└── models/
    └── *.glb                     ← 17 CC0 model files, one per sourced vehicle
```

Plus, **outside** `3d-vehicles/lib/`:

```
3d-vehicles/utils/
└── BufferGeometryUtils.js
```

**Why `utils/` sits next to `lib/` instead of inside it — read this before "cleaning it up":**
`GLTFLoader.js` is vendored unmodified from the three.js source tree, and its own internal import
statement is `import { toTrianglesDrawMode } from '../utils/BufferGeometryUtils.js';` — a relative path
that assumes it lives inside a `lib/` (or `examples/jsm/loaders/`) folder with `utils/` as a
*sibling* one level up... in this repo, `GLTFLoader.js` was placed directly in `3d-vehicles/lib/`,
so `../utils/` resolves to `3d-vehicles/utils/`. This was a deliberate choice to avoid patching
the vendored loader file: instead of editing the import path, the directory structure was shaped
to match what the unmodified file already expects. If you ever move or rename `lib/`, you must
move `utils/` to keep the same relative relationship, and update `sw.js`'s `ASSETS` array
(see below).

There is no bundler. `index.html` declares a native import map:

```html
<script type="importmap">
  { "imports": { "three": "./lib/three.module.min.js" } }
</script>
```

so that `import * as THREE from 'three'` inside the module script resolves to the vendored file —
this is what lets the code use the same bare `"three"` specifier that npm/bundler projects use,
with zero build step.

## The service worker and `ASSETS`

`sw.js` caches every file the app needs on install (`cache.addAll(ASSETS)`) so the app works fully
offline after the first load. **If `cache.addAll` fails on even one URL (typo, missing file, wrong
path), the entire install fails and the service worker never activates** — the app then has no
offline capability at all, silently. This is the single most common way to break this activity.

The cache name is `3d-vehicles-v1` per this repo's one-name-per-activity convention (see
`AGENTS.md`) — it does not need bumping when you add files, only if you want to force-evict
existing installed clients' caches.

Whenever you add a new file the app fetches at runtime — a new `.glb`, a new `lib/` or `utils/`
file — **you must add its path to the `ASSETS` array in `sw.js`**, or that file will 404 offline
even though it loads fine online (masking the bug until someone tests offline).

The procedural vehicles (see below) are pure code inside `index.html` — they have no separate file,
so they are correctly absent from `ASSETS`.

## The `VEHICLES` array

Everything about each vehicle lives in one JS array literal near the top of the module script in
`index.html`:

```js
const VEHICLES = [
  { id: 'bus', name: 'Bus', emoji: '🚌', recipe: 'diesel', rot: Math.PI / 2 },
  { id: 'crane', name: 'Crane', emoji: '🏗️', recipe: 'heavyDiesel',
    lightsOverride: { head: [[0.12, 1.3, 0.08]], tail: [[-0.15, 1.48, -0.05]] } },
  { id: 'jeep', name: 'SUV', speechName: 'S U V', emoji: '🚘', recipe: 'petrol' },
  // ...18 active entries, plus a few commented-out ones
];
```

Note that `id` and `name` are independent: `id` picks the model file or builder, `name` is what the
child reads and hears. Several car entries deliberately pair a label with a differently-named model
because that model simply looks more like the labelled vehicle — `suv.glb` is labelled "Jeep",
`jeep.glb` is labelled "SUV", `vintage.glb` is labelled "Sedan". Don't "fix" these to match.

Fields:

| Field | Required | Meaning |
|---|---|---|
| `id` | yes | Lowercase slug. Doubles as the `.glb` filename (`models/<id>.glb`) for sourced vehicles, or the lookup key into `BUILDERS` for procedural ones. Must be unique. |
| `name` | yes | Display text on the grid card and the in-viewer name label. |
| `speechName` | no | Overrides what's passed to the Web Speech API. Use when the display name would be mispronounced (e.g. `suv` displays "SUV" but speaks "S U V" so it isn't read as a word). Omit unless a real TTS mispronunciation is confirmed. |
| `emoji` | yes | Shown on the grid card, and used as the fallback 3D sprite if the `.glb` fails to load at runtime (see `showModel`). Should not normally be seen in the viewer — if you see an emoji sprite instead of a model, that's a load failure, not by design. |
| `color` | auto | **Do not set this by hand.** It's assigned automatically after the array is defined: `VEHICLES.forEach((v, i) => { v.color = P[i % P.length]; })`, cycling through the 10-color palette `P` by array index. Adding a vehicle anywhere in the array shifts every subsequent vehicle's color — this is intentional and harmless, just don't be surprised. |
| `recipe` | yes | Key into `RECIPES`, selects which of the 8 engine-sound presets plays for this vehicle. |
| `rot` | no | Extra Y-axis rotation (radians) applied once, inside `normalize()`, to correct a model's default facing (e.g. `bus` ships facing sideways in its source file, so `rot: Math.PI / 2` turns it to face the camera). Only needed for GLB models whose authored orientation is wrong for this viewer's default camera angle. |
| `lightsOverride` | no | Replaces the auto-computed headlight/taillight positions (see "Light rig" below) for models where the bounding-box heuristic puts lamps in visibly wrong places. |

## Where to find models

Two exhaustive searches were run while building this activity. What follows is what they learned,
so the next person does not repeat them.

**Only CC0 is usable here.** Not CC-BY, not CC-BY-SA, not "free for personal use". CC-BY requires
carrying visible attribution in a fullscreen app aimed at pre-readers, which there is nowhere sane
to put. Sketchfab's default licence is *not* CC0 — filter explicitly, and check the individual
model, not the site's general terms.

Sources, in the order worth trying:

| Source | Licence | Format | Notes |
|---|---|---|---|
| [kenney.nl/assets](https://kenney.nl/assets) | CC0, all of it | `.glb` in most kits | Best first stop. Direct zip downloads, no gating. Car Kit, Train Kit, Watercraft Kit all shipped models here. Consistent art style — models from different Kenney kits look like they belong together. |
| [poly.pizza](https://poly.pizza) | mixed — **filter to CC0** | `.glb` download button | Search is JavaScript-driven, so `curl` sees nothing; browse it in a real browser. Mirrors a lot of Kenney and Quaternius work. Verify licence per model. |
| [quaternius.com](https://quaternius.com) | CC0, all of it | `.obj`/`.fbx`, sometimes `.gltf` | Good construction and transport packs, but downloads sit behind **Google Drive folders** that `curl` cannot enumerate — you must click through in a browser. This is what blocked the first sourcing pass. |
| [opengameart.org](https://opengameart.org) | mixed — **filter to CC0** | anything, often `.blend` | Widest selection, worst consistency. Many good models ship only as `.blend`, which needs Blender to export. |

**Search terms that worked:** the plain vehicle name, plus its regional synonyms — "digger" and
"bulldozer", "tuk tuk" and "auto rickshaw" and "three wheeler", "road roller" and "steam roller"
and "compactor", "cement mixer" and "concrete mixer". Searching one name only will miss models.

**What is genuinely hard to find under CC0** (as of the 2026-08 sweep): tow truck, excavator,
bulldozer/digger, road roller, auto rickshaw. All five were built procedurally instead — see Route B
— though only the tow truck was good enough to keep enabled. If you find good CC0 models for any of
them, swapping one in is clean: delete its `BUILDERS` entry and follow Route A.
If you find good CC0 models for these, replacing a procedural build with a real model is a clean
swap: delete the `BUILDERS` entry, add the file plus its `ASSETS` line and credits row.

### Getting a model into the repo

1. Download it. Prefer `.glb` — a single self-contained binary. A `.gltf` + `.bin` + loose textures
   set means several extra fetches and several extra `ASSETS` lines; convert it or pick another.
2. If it is `.obj`/`.fbx`/`.blend`, convert to `.glb`. Blender is the general-purpose tool
   (`File > Import`, then `File > Export > glTF 2.0`, choosing the **glTF Binary (.glb)** format and
   ticking the option to embed textures). Blender is not a project dependency — it is a one-off
   tool on your machine, and only the resulting `.glb` gets committed.
3. Check the size. Aim under 300 KB per model; the whole activity is ~4 MB and every model is
   pre-cached for offline use, so a single 5 MB model is a real cost on a phone.
4. Sanity-check the file really is a GLB: `head -c 4 yourfile.glb` should print `glTF`. A "model"
   that is actually an HTML error page saved with the wrong extension is a common download failure.
5. Rename it to `<id>.glb`, lowercase, no spaces — the `id` in `VEHICLES` builds the path.
6. Then follow Route A below for the wiring.

## Adding a 24th vehicle

There are two routes, depending on whether a CC0 `.glb` model exists for it.

### Route A — a sourced `.glb` model exists

1. Find a CC0-licensed `.glb` (or convert an `.obj`/`.fbx` to `.glb` — see the conversion notes in
   `docs/3d-vehicles-credits.md` for the approach used for `bus`/`cementmixer`/`crane`). Kenney GLBs
   in particular reference their texture atlas as an external file by URI; re-pack the atlas into
   the binary chunk so the `.glb` stays a single self-contained file (see the "Note on Kenney GLB
   texture embedding" in the credits doc) — this repo's rule is no runtime fetch of a second file
   per model.
2. Drop the file at `3d-vehicles/models/<id>.glb`.
3. Add an entry to `VEHICLES` in `index.html` with a unique `id` matching the filename, a `name`,
   `emoji`, and `recipe`. Add `rot` if the model doesn't face the camera correctly by default (test
   it and look at which way the "front" points). Playtest before assuming a `lightsOverride` is
   needed — most models don't need one.
4. Add `'./models/<id>.glb'` to the `ASSETS` array in `sw.js`.
5. Add a row to the credits table in `docs/3d-vehicles-credits.md` (id, model name, author, source
   URL, license).

### Route B — no CC0 model exists, build it procedurally

Five vehicles (Tow Truck, Excavator, Digger, Road Roller, Auto Rickshaw) have no available CC0 model
and are instead assembled from three.js primitive meshes (boxes, cylinders, cones, torus) directly
in `index.html`. All five builders are still in the code, but only the Tow Truck is enabled — the
other four read poorly enough that their `VEHICLES` entries are commented out. Re-enabling one is a
matter of uncommenting its entry, but improve the geometry first. Look at `buildTowTruck()` as the
template — the pattern is:

1. Write a `buildYourVehicle()` function that creates a `THREE.Group`, adds primitive `THREE.Mesh`
   objects (via the `mesh(geometry, color)` helper) positioned/rotated to form a recognizable
   silhouette, and returns the group. Use the `wheel(radius, width, color)` helper for wheels.
   No file I/O, no textures — flat colors only.
2. Register it in the `BUILDERS` map: `BUILDERS.yourid = buildYourVehicle;`.
3. Add a `VEHICLES` entry with the same `id` as the `BUILDERS` key. No `.glb` file, no `ASSETS`
   entry, no credits row — procedural vehicles are code, not licensed assets.
4. `showModel()` checks `BUILDERS[v.id]` before trying to fetch a `.glb`, so simply having the
   `BUILDERS` entry is what routes it down the procedural path instead of a network load.
5. Test the default (mostly nose-on, three-quarter) camera angle carefully — a procedural build
   that looks fine top-down can read as an unrecognizable flat bar or disc edge-on. The `rickshaw`
   builder's comments document exactly this problem (front wheel reading edge-on) and how it was
   fixed (enlarging and offsetting the wheel, adding visible fork struts).

## The 8 engine-sound recipes

`RECIPES` is a lookup table; `engineStart(name)` builds a small Web Audio graph from a recipe and
`engineStop()` fades and tears it down. Each recipe is an object:

```js
diesel: { osc: 'sawtooth', f0: 52, f1: 52, ramp: 0, noise: 0.25, nfreq: 220, pitchLfo: [6, 4], ampLfo: null }
```

| Parameter | Meaning |
|---|---|
| `osc` | Oscillator waveform (`'sawtooth'`, `'sine'`, `'square'`) — the tonal core of the engine note. Sawtooth reads as combustion/mechanical, sine as smooth/electric, square as a puttering small engine. |
| `f0` | Starting oscillator frequency (Hz) at the moment the button is pressed. |
| `f1` | Frequency the oscillator ramps to over `ramp` seconds (linear ramp). Equal to `f0` for a constant-pitch engine (idle diesel); higher than `f0` for a "revving up" feel (petrol, electric). |
| `ramp` | Seconds to go from `f0` to `f1`. `0` means no ramp — the tone starts at its final pitch immediately. |
| `noise` | Gain (0–1) of a filtered white-noise layer mixed under the oscillator — this is what makes an engine sound like machinery instead of a pure tone. |
| `nfreq` | Low-pass filter cutoff (Hz) applied to that noise layer — lower values sound duller/heavier (`heavyDiesel` at 160Hz), higher values sound airier/hissier (`helicopter` at 420Hz, `electric` at 800Hz). |
| `pitchLfo` | `[rate, depth]` or `null`. When set, a low-frequency oscillator wobbles the main oscillator's frequency by ± `depth` Hz at `rate` Hz — simulates an uneven idle/chug. |
| `ampLfo` | `[rate, depth]` or `null`. When set, a second LFO modulates the overall output gain between `1 - depth` and `1` at `rate` Hz — simulates a throbbing/pulsing volume (train chuff, helicopter rotor thump, boat engine put-put). |

All 8 recipes still exist, but only 7 are reachable from the currently-active roster: 7 vehicles use
`diesel` (bus, truck, towtruck, firetruck, ambulance, van, cementmixer), 2 use `heavyDiesel`
(tractor, crane), 5 use `petrol` (the five cars), and `train`, `electric` (metro), `boat` and
`helicopter` are each used by exactly one vehicle. `putt` currently has no vehicle — it belonged to
the auto rickshaw, whose entry is commented out. None of this is audible today anyway, since
`FEATURES.engineSound` is `false`.

## `normalize()` — how a model gets framed

`normalize(sceneRoot, rot)` takes a raw loaded (or procedurally built) `THREE.Object3D` and returns
a new group that is centered at the origin, sitting on the ground plane (`y = 0`), and scaled to a
predictable size, regardless of what units or pivot the source model used:

```js
const TARGET_HEIGHT = 1.5; // cap vertical extent so tall/thin models (crane, boat mast) clear the name label
function normalize(sceneRoot, rot = 0) {
  const inner = new THREE.Group();
  sceneRoot.rotation.y = rot;
  inner.add(sceneRoot);
  let box = new THREE.Box3().setFromObject(inner);
  const size = box.getSize(new THREE.Vector3());
  inner.scale.setScalar(Math.min(2 / Math.max(size.x, size.y, size.z), TARGET_HEIGHT / size.y));
  box = new THREE.Box3().setFromObject(inner);
  const c = box.getCenter(new THREE.Vector3());
  inner.position.set(-c.x, -box.min.y, -c.z);
  ...
}
```

The scale factor is `Math.min(2 / maxDimension, 1.5 / size.y)` — two competing caps, and the
*smaller* result wins:

- `2 / maxDimension` scales the model so its single largest dimension (whichever of width/height/
  depth is biggest) is 2 world units. This is the normal case: it makes every vehicle roughly the
  same "size on screen" regardless of whether the source model was authored in centimeters, meters,
  or some arbitrary scale.
- `1.5 / size.y` independently caps the model's *height* to 1.5 world units.

Why both exist: with only the first cap, a tall, narrow model (the crane's tower, the boat's mast)
gets scaled so its largest dimension — which for these is height, not width or depth — becomes 2
units, tall enough to run off the top of the viewer. Capping height separately at 1.5 catches
exactly this case: for a tall/thin model, `1.5 / size.y` is the smaller (more restrictive) of the
two ratios and wins the `Math.min`, shrinking the whole model further. For a normal wide/long
vehicle (a car, a bus), width or depth is the largest dimension, so `2 / maxDimension` is already
≤ `1.5 / size.y` and wins unchanged — the height cap only ever kicks in for the unusually tall
models it was added for. (The cap was originally added when the name label sat at the top of the
screen; the label has since moved to the bottom, but the cap still earns its place by stopping tall
models overrunning the frame.)

### Camera framing — `aimCamera()`

Because `normalize()` seats every model on the ground rather than centring it vertically (the ground
shadow depends on that), each vehicle's vertical *centre* sits at a different height — roughly 0.27
for a low car, 0.75 for the crane. A camera aimed at one fixed height would therefore centre only
one of them and leave the rest sitting low in frame.

`aimCamera()` fixes this by targeting the current model's bounding-box centre, stored in
`camTargetY` and refreshed in `showModel()` each time a model is attached. The camera's height is
expressed as `camTargetY + CAM_ELEV * k` — an offset *above* the target rather than an absolute
value — so the three-quarter-from-above viewing angle is identical for every vehicle and only the
framing shifts. Since the camera looks directly at the bbox centre, that centre lands on the centre
of the viewport by construction, whatever the model.

The same function applies `k = max(1, CAM_BASE_ASPECT / aspect)`, which pulls the camera back on
narrower-than-design aspect ratios. Without it, a phone in portrait clips the nose and tail off long
vehicles as the idle auto-spin swings them broadside. `aimCamera()` is called from both `resize()`
and `showModel()`, which is why it is a separate function rather than living inside `resize()`.

After scaling, the box is recomputed and the model is re-centered on X/Z and dropped so its lowest
point sits exactly at `y = 0` (`inner.position.set(-c.x, -box.min.y, -c.z)`) — this is what makes
every vehicle appear to stand on the same invisible ground plane regardless of where its own pivot
point was authored.

`g.userData.bbox` stores the final (post-normalize) bounding box on the returned group — this is
what the light rig reads to know the model's real on-screen size and extent (see below).

## Light rig — how headlights/taillights are placed

`buildLightRig(bbox, override)` builds a small group: a headlight disc + taillight disc pair, a
`THREE.SpotLight` pointed forward, and a translucent cone mesh to fake a visible light beam. It
needs to know *where on the model* to put these — there's no metadata in a GLB telling you "this is
the front bumper."

The default heuristic just uses the model's own (already-normalized) bounding box: put headlights
near the top-front corners and taillights near the top-rear corners, inset by 30% of the model's
width from each side, at 35% of its height:

```js
const pos = override || {
  head: [[ size.x * 0.3, size.y * 0.35, bbox.max.z ], [ -size.x * 0.3, size.y * 0.35, bbox.max.z ]],
  tail: [[ size.x * 0.3, size.y * 0.35, bbox.min.z ], [ -size.x * 0.3, size.y * 0.35, bbox.min.z ]]
};
```

This works fine for roughly car-shaped, roughly-centered models. It breaks down for models that are
asymmetric, off-center, or shaped very differently from a car — a bounding-box corner isn't
necessarily anywhere near an actual headlight. Four vehicles carry a `lightsOverride` with
hand-placed `[x, y, z]` coordinates (in the model's local, normalized space) because the heuristic
put lamps somewhere visibly wrong — three of them still active, plus the commented-out excavator:

- **excavator** — heuristic put lights on the tracked base corners instead of the cab. (Entry
  currently commented out, but the override is kept with it for whenever it returns.)
- **crane** — heuristic put lights near ground level on a model whose visual mass is a tall tower.
- **boat** — heuristic's left/right corners don't correspond to bow/stern on a narrow hull.
- **helicopter** — heuristic's corners land on the rotor blades, not the fuselage nose/tail.

If a new vehicle's lights land somewhere wrong (test this — it's a "playtest and look" call, not a
formula), add a `lightsOverride: { head: [[x,y,z], ...], tail: [[x,y,z], ...] }` entry for it using
the same coordinate space (post-normalize, so roughly ±1 unit from center, `y` from 0 up).

## Constraints (repo-wide, still apply here)

No frameworks, no npm, no build step, no new external runtime dependencies. Every asset the app
uses at runtime must be same-origin and listed in `sw.js`'s `ASSETS` (except the Google Fonts
stylesheet, which is the one intentional exception across this whole repo).
