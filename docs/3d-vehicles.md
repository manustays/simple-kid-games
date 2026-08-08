# 3D Vehicles — Maintainer's Guide

`3d-vehicles/` ("Vehicle World") is a fullscreen PWA for toddlers: a grid of 23 vehicles, each
opening into a 3D viewer where the child can spin the model, hear an engine sound while holding a
button, toggle headlights/taillights, and hear the vehicle's name spoken aloud. This doc explains
how the activity is built so a future contributor can safely add, fix, or extend it. It assumes no
prior familiarity with the code.

## What it does, from the child's side

1. Grid screen: 23 colorful cards (emoji + name), 4 columns, no scrolling.
2. Tapping a card opens the viewer: the 3D model animates in, its name is spoken, and it starts an
   idle auto-spin.
3. Drag on the canvas to rotate (yaw + limited pitch); arrow keys do the same; after 3s of no
   interaction, auto-spin resumes.
4. Holding the 🔊 button plays a synthesized engine sound for that vehicle's class; releasing stops
   it.
5. Tapping 💡 toggles a small headlight/taillight rig with a soft light cone.
6. Tapping the name label re-speaks the name. ◀ / ▶ step to the adjacent vehicle; ↩ returns to the
   grid.

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
    └── *.glb                     ← 18 CC0 model files, one per sourced vehicle
```

Plus, **outside** `3d-vehicles/lib/`:

```
3d-vehicles/utils/
└── BufferGeometryUtils.js
```

**Why `utils/` sits next to `lib/` instead of inside it — read this before "cleaning it up":**
`GLTFLoader.js` is vendored unmodified from the three.js source tree, and its own internal import
statement is `import { mergeVertices } from '../utils/BufferGeometryUtils.js';` — a relative path
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

The five procedural vehicles (see below) are pure code inside `index.html` — they have no separate
file, so they are correctly absent from `ASSETS`.

## The `VEHICLES` array

Everything about each vehicle lives in one JS array literal near the top of the module script in
`index.html`:

```js
const VEHICLES = [
  { id: 'bus', name: 'Bus', emoji: '🚌', recipe: 'diesel', rot: Math.PI / 2 },
  { id: 'excavator', name: 'Excavator', emoji: '⛏️', recipe: 'heavyDiesel',
    lightsOverride: { head: [[0.02, 0.58, 0.15]], tail: [[-0.05, 0.85, -0.35]] } },
  { id: 'suv', name: 'SUV', speechName: 'S U V', emoji: '🚘', recipe: 'petrol' },
  // ...23 entries total
];
```

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
in `index.html`. Look at `buildTowTruck()` or `buildRickshaw()` as templates — the pattern is:

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

The 8 recipes and their assigned vehicles (from `progress.md`'s self-review): 7 vehicles use
`diesel` (bus, truck, towtruck, firetruck, ambulance, van, cementmixer), 5 use `heavyDiesel`
(tractor, excavator, digger, crane, roadroller), 6 use `petrol` (jeep, suv, sedan, coupe,
hatchback, vintage), and `train`, `electric` (metro), `putt` (rickshaw), `boat`, and `helicopter`
are each used by exactly one vehicle.

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
units. That makes the model tall enough to visually clip into the name label at the top of the
viewer screen. Capping height separately at 1.5 catches exactly this case: for a tall/thin model,
`1.5 / size.y` is the smaller (more restrictive) of the two ratios and wins the `Math.min`, shrinking
the whole model further so it clears the label. For a normal wide/long vehicle (a car, a bus), width
or depth is the largest dimension, so `2 / maxDimension` is already ≤ `1.5 / size.y` and wins
unchanged — the height cap only ever kicks in for the unusually tall models it was added for.

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
necessarily anywhere near an actual headlight. Four vehicles currently need `lightsOverride` with
hand-placed `[x, y, z]` coordinates (in the model's local, normalized space) because the heuristic
put lamps somewhere visibly wrong:

- **excavator** — heuristic put lights on the tracked base corners instead of the cab.
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
