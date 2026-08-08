# 3D Vehicles — Model Credits

All 18 shipped `.glb` models are **CC0 1.0 (Creative Commons Zero / Public Domain)**. No attribution
is legally required, but creators are credited below as a courtesy. The remaining 5 of the 23
vehicles (Tow Truck, Excavator, Digger, Road Roller, Auto Rickshaw) have no CC0 model available and
are instead built procedurally from three.js primitives directly in `3d-vehicles/index.html` — see
`docs/3d-vehicles.md` for how those are constructed. There is no emoji fallback in normal operation;
an emoji sprite only appears if a `.glb` fails to load at runtime, which is a bug, not a design.

| id | model name | author | source URL | license |
|---|---|---|---|---|
| ambulance | Ambulance (Car Kit) | Kenney | https://kenney.nl/assets/car-kit | CC0 1.0 |
| boat | Boat Sail A (Watercraft Kit) | Kenney | https://kenney.nl/assets/watercraft-kit | CC0 1.0 |
| bus | Bus | Quaternius | https://quaternius.com/packs/publictransport.html | CC0 1.0 |
| cementmixer | Concrete Truck Red (from "Trucks", LowPoly House Construction Site) | Majadroid | https://opengameart.org/content/3d-house-construction-site-lowpoly-cc0 | CC0 1.0 |
| coupe | Sedan Sports (Car Kit) | Kenney | https://kenney.nl/assets/car-kit | CC0 1.0 |
| crane | Crane Ground (from "Crane-On-Ground", LowPoly House Construction Site) | Majadroid | https://opengameart.org/content/3d-house-construction-site-lowpoly-cc0 | CC0 1.0 |
| firetruck | Firetruck (Car Kit) | Kenney | https://kenney.nl/assets/car-kit | CC0 1.0 |
| hatchback | Hatchback Sports (Car Kit) | Kenney | https://kenney.nl/assets/car-kit | CC0 1.0 |
| helicopter | Helicopter | kazuma | https://poly.pizza/m/EQJ2MECUbx | CC0 1.0 |
| jeep | SUV Luxury (Car Kit) | Kenney | https://kenney.nl/assets/car-kit | CC0 1.0 |
| metro | Train Electric Subway A (Train Kit) | Kenney | https://kenney.nl/assets/train-kit | CC0 1.0 |
| sedan | Sedan (Car Kit) | Kenney | https://kenney.nl/assets/car-kit | CC0 1.0 |
| suv | SUV (Car Kit) | Kenney | https://kenney.nl/assets/car-kit | CC0 1.0 |
| tractor | Tractor (Car Kit) | Kenney | https://kenney.nl/assets/car-kit | CC0 1.0 |
| train | Train Locomotive A (Train Kit) | Kenney | https://kenney.nl/assets/train-kit | CC0 1.0 |
| truck | Delivery (Car Kit) | Kenney | https://kenney.nl/assets/car-kit | CC0 1.0 |
| van | Van (Car Kit) | Kenney | https://kenney.nl/assets/car-kit | CC0 1.0 |
| vintage | Sports Car | Quaternius | https://poly.pizza/m/OyqKvX9xNh | CC0 1.0 |

## Note on bus and cementmixer/crane provenance

Unlike the other rows, `bus`, `cementmixer` and `crane` were not downloadable as `.glb` from their
source. Both packs are shared as public (no-login) Google Drive folders / a `.zip` containing `.obj`
or `.fbx` meshes only. These were converted to self-contained GLB with two small one-off scripts
(stdlib only: `struct`, `json`, `zlib` — no new dependencies), not part of the build and not
committed:

- **bus**: Quaternius's "Public Transport Pack" ships `Bus.obj` + `Bus.mtl`. The `.mtl` had lost its
  per-part colors in export (every material came out as the same flat grey `Kd 0.64 0.64 0.64` — a
  known Blender-OBJ-exporter artifact). Geometry and normals are the real, unmodified CC0 model; a
  script parsed the OBJ, grouped triangles by material name, and applied a curated toy-bus color per
  part (yellow body, blue-tinted windows, dark trim/tires) in place of the broken grey.
- **cementmixer** and **crane**: Majadroid's "3D House Construction Site" pack ships Blender-exported
  binary `.fbx` files whose per-part color comes from real UV-mapped texturing against a small shared
  gradient palette image (Imphenzia's technique), embedded directly inside each `.fbx`. A second
  script (a minimal binary-FBX node-tree reader) located the named `Model` → `Geometry` → texture
  chain for "Concrete Truck Red" and "Crane Ground", extracted positions/normals/UVs and the
  already-embedded palette PNG, and wrote a plain textured GLB — so these two ship with the pack's
  actual authored colors, not a guess.

`crane` replaces the Kenney Factory Kit crane originally shipped in this slot: the construction-site
crane is a clearer, more recognizable freestanding tower crane for a toddler than Kenney's abstract
industrial gantry arm, and came for free out of the same pack as `cementmixer`.

## Note on Kenney GLB texture embedding

Kenney's "GLB format" exports reference their `Textures/colormap.png` atlas via an external
`images[].uri` instead of embedding it in the binary chunk, which would have made the shipped
file a hidden multi-file dependency (`.glb` + a sibling PNG the loader fetches at runtime — exactly
the "not a single self-contained binary" case this project's asset rule forbids). Every Kenney-sourced
model above was re-packed with a one-off script (not part of the build, not committed) that copies the
atlas bytes into the GLB's binary chunk and rewrites `images[].bufferView` accordingly, so each
shipped `.glb` is fully self-contained with no other network fetch. Geometry, materials and license
are otherwise untouched.
