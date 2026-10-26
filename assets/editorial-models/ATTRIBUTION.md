# Sculpture geometry and generated renders

## Sculpture master

- **Marble Bust 01**, **Rico Cilliers**, Poly Haven.
- Source: https://polyhaven.com/a/marble_bust_01
- File metadata: https://api.polyhaven.com/files/marble_bust_01
- License: **CC0 1.0 Universal**, https://polyhaven.com/license
- Legal text: https://creativecommons.org/publicdomain/zero/1.0/
- Checked-in GLTF master and 2K texture inputs: `assets/editorial-models/marble-bust/`.

The mesh is **not claimed as our original sculpting**. The new transparent
render changes the material to satin black basalt and uses a new camera,
lighting and framing authored in `scripts/generate-editorial-assets.py`.
These are derived renders generated for this project, not crops of the user's
MP4 and not images produced by a generative-image service.

The other rendered objects (chess, devices, camera, clock, target, eye, foil,
and flowers) are modeled procedurally in that script.
Their geometry, lighting and material definitions are project-authored.
The anatomical study is an original vector engraving in
`src/motion-lab/AnatomicalEngraving.tsx`; the first procedural skull draft was
rejected and is not shipped.

## Fonts

Inter and Inter Tight, Rasmus Andersson / Google Fonts distributions,
self-hosted via Fontsource. SIL Open Font License 1.1; license texts are
included in the respective installed packages.

## Active WebGL composition

The live v3 composition reads a geometry-only derivative and the CC0 normal map
from `public/references/editorial-geometry/`. It does not display a cropped video
frame or the intermediate Blender PNG. Black stone material, studio reflection
environment, lights, framing and motion are authored in
`src/motion-lab/editorial/{models.ts,Stage3D.tsx}`.
Other active objects are generated in `models.ts`; the anatomy illustration is
the original SVG component mentioned above. The scanned sculpture and its normal
map remain attributed to Rico Cilliers / Poly Haven, not to this project.
