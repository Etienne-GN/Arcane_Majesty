# amo3d — 3D proof of concept

A side experiment: can Arcane Majesty go 3D while reusing amo's game rules?

```
cd apps/amo3d && npm install && npm run dev   # http://localhost:5190
```

**Controls:** WASD/arrows move · Shift sprint · Space hop · drag to orbit · wheel zoom · Q/E turn camera.

## What it shows
- **Three.js** low-poly scene: noise terrain, lake, forest clusters, standing stones with an aether shard,
  a ruined tower, a fenced pen, a mountain rim, real-time shadows, fog.
- **A procedural hero** (no assets): a joint hierarchy animated in code — idle, walk, sprint, hop, a cloak that flares.
- **amo's movement rules, imported unchanged** from `apps/amo/src/systems/movementRules.js` through the `@amo`
  alias: Vigor drain/regen and being winded, sprint speed, hop cost and timing, and `hopLanding` — fences,
  logs and small rocks block walking but a hop clears them, exactly like in the 2D game.
  Scale: amo's 16 px tile = 0.5 m (`PX = 32` in `src/main.js`).

## Not here (yet)
Rigged/skinned models (glTF), combat, the server, any of the real maps.
