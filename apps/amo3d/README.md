# amo3d — 3D proof of concept

A side experiment: can Arcane Majesty go 3D while reusing amo's game rules?

```
cd apps/amo3d && npm install && npm run dev   # http://localhost:5190
```

**Controls:** WASD move · Shift sprint · Space hop · F / right-click fireball · drag to orbit · wheel zoom · Q/E turn camera.

## What it shows
- **No assets at all** — every mesh, texture and effect is generated in code (Three.js).
- **Thaloria Glade** (`world.js`): noise terrain, lake, mixed forest (oak, birch, autumn maple, pine),
  standing stones, fenced pen, mountain rim, wandering deer (`deer.js`: graze, look up, flee, get hit).
- **Eldrin's Tower** (`eldrin.js`), after the reference painting: ivy-clad tower with a timber gallery and a
  mossy cone roof, smoking chimney, cottage annex, pavilion, stone stairs, a two-tier waterfall off a cliff,
  a stream into the lake under a walkable stone arch bridge, and its own mood (mist, light shafts, fireflies).
- **The tower interior** (`tower.js`) is a separate map loaded through the door: Hall, Study and Crypt joined by
  staircases, floors above the hero cut away, walls on the camera side hidden. It is bigger on the inside than
  the outside (a wizard's tower — and the stairs need the room).
- **Shadow Soldiers** (`shadow.js`): translucent shadow-men with sword and kite shield, red eyes, dark fumes.
  They patrol, notice, chase, circle with the shield up, telegraph an overhead swing, block fireballs from the
  front, flinch, burn, dissolve on death and reform later. Stats are amo's `ENEMY_TYPES.mirror_shade`; fire goes
  through amo's affinity table, burning through `STATUS_DEFS.burning`, kills through `PlayerStats.gainXp`.
  Eldrin has health, an 800 ms invulnerability after a hit (amo's value), knockback, falls and returns at the
  start; hopping through a swing dodges it (amo's hop i-frames). `__poc.advance(seconds)` steps the game
  logic for headless tests.
- **amo's rules, imported unchanged** through the `@amo` alias: the hero is a real `PlayerStats` (mana, regen,
  fatigue when mana runs low, learned spells, cooldowns); movement uses `movementRules.js` (Vigor, sprint, hop,
  hoppable fences/logs/rocks); the fireball uses `SPELLS.fireball` (mana cost, cooldown, damage formula,
  60% burning). Scale: amo's 16 px tile = 0.5 m.
- **POC-only tuning** (amo untouched): sprint drains 7 Vigor/s instead of 20; fireball range ×3, speed ×1.6,
  blast ×2 because 2D screen distances feel short in 3D.

## Not here (yet)
Rigged/skinned models (glTF), melee combat, enemies that fight back, the server, any of the real maps.
