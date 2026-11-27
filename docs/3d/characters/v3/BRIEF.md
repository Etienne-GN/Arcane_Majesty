# Brief — a low-poly human base body to match a reference sheet

You are asked to build (or rebuild) **one male low-poly base body** for a Three.js game, so that it looks **as close as
possible** to the reference sheet `reference_base_mesh.jpg` (in this folder; the **male** figure, top row: front, side,
back). A first attempt is in this folder: `v3_male.glb`. It is not good enough — the face especially is far from the sheet.
You may start from it or from scratch.

## What the sheet shows (read it closely)
- A stylised, **flat-shaded low-poly** human: few, large, **planar faces whose edges follow the anatomy** — the pecs are 2–3
  planes each, the shoulder blades and lats read as big triangles, the abs as a few planes, the deltoid is a rounded cap of
  a few faces, the calf a diamond. Maybe ~20 faces on the whole back. **Edges run diagonally along the muscles** (the
  pec's lower edge rising to the armpit, the trapezius slanting from the neck to the shoulder, the lats angling to the
  waist) — not round the body in horizontal bands.
- **The head**: a lean oval, longer than wide; a narrow jaw tapering to a defined chin; strong cheek planes (a lighter plane
  on the front of the cheek, a darker one at the side); a straight nose with a clear ridge; eyes set under a brow ridge,
  read mostly through the planes' shading; ears flat to the head. **Hair**: short dark hair with real volume on top, a
  jagged silhouette of pointed tufts swept up and to one side, the ears showing.
- Skin a warm flat tan, dark grey-brown boxer shorts to mid-thigh, bare feet, a thin dark outline round the forms (the
  outline is done in the engine — you only build the mesh).
- **A-pose**: arms ~29° out from the body, legs slightly apart, standing straight.

## Measurements taken from the sheet (male; 507 px = 1.80 m — the game uses the sheet's own height)
Heights from the sole (m): head top 1.80 · chin 1.55 · neck (slim, half-width ~0.078) 1.52 ·
trapezius slopes from the neck to the deltoid · deltoid's outer edge ~0.31 out at 1.32 · armpit 1.23 · chest half-width
~0.21 · waist (narrowest, half-width ~0.15) 1.10 · hips half-width ~0.21 · crotch 0.72 · knee 0.51 · calf widest (~0.16
across) 0.35 · ankle 0.10 · foot ~0.28 long. Arm: shoulder joint ~(0.25, 1.33), elbow ~0.31 below it along the arm, wrist
~0.25 further, the hand ~0.09. Depth (side view): chest front ~+0.13, back ~−0.13; glutes ~−0.135; the head ~0.24 deep.

## Hard constraints (so it plugs into the game)
- **Units metres, Y up, the figure facing +Z, the character's left on +X, the soles at Y = 0.**
- **One skinned mesh** bound to **exactly these 11 bones, with these names and this hierarchy** (as in `v3_male.glb`):
  `hips` → (`thigh_L` → `shin_L`), (`thigh_R` → `shin_R`), `spine` → (`head`, `upperarm_L` → `forearm_L`, `upperarm_R` →
  `forearm_R`). Keep the bones' rest positions as in the file (hips at y 0.95, no scale; thigh at
  (±0.108, −0.09); shin −0.347 below; spine +0.06; head +0.54 (z +0.008); upper arm at (±0.25, +0.32); forearm −0.31).
  The bind pose is the **A-pose** (upper arms rotated ±0.5 rad about Z). Up to 4 bone weights per vertex; blend at the
  elbows, knees, shoulders, hips and neck so they bend cleanly.
- **Hands**: a simple hand (a mitten with a thumb is fine); the engine puts weapons ~0.31 below the forearm's origin.
- **No textures**: colour per face or vertex (`COLOR_0`), flat shading. Keep the skin, shorts, hair, eyes, brows, lips as
  separate colours. Budget: roughly **1,000–2,500 triangles** for the whole body with its head and hair.
- Deliver **`v3_male.glb`** (binary glTF, the same bones and names) in this folder — a new file name is fine
  (e.g. `v3_male_agentX.glb`) so both can be compared.

## How it will be judged
Side by side with the sheet at the same angles (front, side, back, and the head close up): silhouette and proportions,
the planes (do they read like the sheet's?), the head (does it look like **that** face?), the hair's silhouette, and how
it deforms when the arms come down and the legs walk.

## Where it goes afterwards (for information)
The game is `apps/amo3d` (Three.js). Today's attempt is generated in code: `apps/amo3d/src/content/models/v3/body.js`;
the glTF will be loaded in its place and skinned to the same rig. A tool to compare: `apps/amo3d/tools/models/compare.py`
(after `shots.mjs`, with the dev server running).
