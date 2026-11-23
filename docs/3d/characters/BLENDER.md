# Editing the v2 bodies in Blender

The v2 base bodies are generated in code (`apps/amo3d/src/content/models/v2/base.js`). You can still reshape them by hand
in Blender: your moved points are saved in `edits_male.json` / `edits_female.json` next to it, and the code uses them
every time it builds the body (in the Lab, in the game, under Eldrin's clothes).

## The round trip

1. On any computer on the same network, open the Character Lab:
   `http://192.168.0.206:5190/charlab.html?who=base` (the dev server must be running on the PC).
2. Click **Export male body (Blender)** (or female). A `base_male.glb` downloads.
3. In Blender: **File › Import › glTF 2.0** and pick the file.
4. Select the body, **Tab** into Edit Mode, and **turn on X-mirror** (the butterfly icon at the top right of the
   viewport, or the Mesh Symmetry option for X) so both sides move together.
5. **Move points only.** Grab (G), scale (S), rotate (R) — anything that moves existing vertices.
   - Do **not** add, delete, merge, extrude or subdivide: each point carries its identity in the UV map.
   - Do **not** delete or rename the UV map.
   - Leave the object where it is (don't move/rotate/scale it in Object Mode — or apply the transform first).
6. **File › Export › glTF 2.0**, format **glTF Binary (.glb)**, default options (keep UVs; no Draco compression).
7. Back in the Lab, click **Import male body (.glb)** and pick your exported file. The moved points are saved and the page
   reloads with your shape.

Repeat as often as you like: each import adds to (or updates) the saved points.

## Good to know

- Your edits are positions for points the code generates. If the code later changes a point you had moved, that edit no
  longer applies to it (nothing breaks; that point just goes back to the code's shape).
- To start over, empty the file: put `{}` in `edits_male.json` / `edits_female.json`.
- The ponytail, the camisole straps, eyes, brows and Eldrin's clothes are separate pieces and are not in the export (yet).
- Eldrin uses the male body, so its edits show on him too (feet excepted: his boots are bigger).
