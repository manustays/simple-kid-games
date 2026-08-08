# 3D Vehicles — Model Credits

All 16 shipped models are **CC0 1.0 (Creative Commons Zero / Public Domain)**. No attribution is
legally required, but creators are credited below as a courtesy. 7 of the 23 vehicle slots in the
app have no model yet (see `task-5-report.md`) — those show their emoji fallback instead.

| id | model name | author | source URL | license |
|---|---|---|---|---|
| ambulance | Ambulance (Car Kit) | Kenney | https://kenney.nl/assets/car-kit | CC0 1.0 |
| boat | Boat Sail A (Watercraft Kit) | Kenney | https://kenney.nl/assets/watercraft-kit | CC0 1.0 |
| coupe | Sedan Sports (Car Kit) | Kenney | https://kenney.nl/assets/car-kit | CC0 1.0 |
| crane | Crane (Factory Kit) | Kenney | https://kenney.nl/assets/factory-kit | CC0 1.0 |
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

## Note on Kenney GLB texture embedding

Kenney's "GLB format" exports reference their `Textures/colormap.png` atlas via an external
`images[].uri` instead of embedding it in the binary chunk, which would have made the shipped
file a hidden multi-file dependency (`.glb` + a sibling PNG the loader fetches at runtime — exactly
the "not a single self-contained binary" case this project's asset rule forbids). Every Kenney-sourced
model above was re-packed with a one-off script (not part of the build, not committed) that copies the
atlas bytes into the GLB's binary chunk and rewrites `images[].bufferView` accordingly, so each
shipped `.glb` is fully self-contained with no other network fetch. Geometry, materials and license
are otherwise untouched.
