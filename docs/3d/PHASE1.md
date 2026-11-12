# 3D Phase 1 — the combat loop

Worktree `../Arcane_Majesty-3d`, branch `3d`, app `apps/amo3d` (dev: `npm run dev` → :5190;
phone: `npm run android`, then `adb -s <device> install -r android/app/build/outputs/apk/debug/app-debug.apk`).

Goal: the 3D game fights like amo — weapons in both hands, mastery and talents, styles, archery,
statuses, loot — using amo's rules through `@rules` (packages/rules), never copies.

## Ground rules
- **One slice per session pass.** Each slice is small, ends playable, tested and committed.
- Rules come from `@rules`; only presentation and 3D feel live in `apps/amo3d`.
  If a rule is stuck inside a Phaser file (like player damage in amo's `Player.js`), lift the pure part
  into a new engine-free module first, rather than duplicating it.
- Test headless with `__poc.advance(seconds)` (CPU rendering runs at ~2 fps) and wrap CDP evals in IIFEs.
- Check on the phone with `tools/device_eval.mjs` (real fps). Keep the outdoor scene near 60 fps.
- 3D-only tuning (ranges, speeds) goes in one place in `main.js` with a comment, as for the fireball.

## Slices, in order
1. **Melee: a staff strike.** Left-click / gamepad B / touch button. Use `weapons.js` moves and the
   `mastery.js` gain on hit; hit arc and reach in 3D; soldiers can block it with the shield.
2. **Loot.** Enemies drop from their `ENEMY_TYPES` `lootTable`; glowing pickups, walk over to collect,
   into `PlayerStats` inventory (satchel capacity rules apply).
3. **Inventory and equipment screen.** HTML overlay (I / Tab / touch button) over the live game:
   satchel, equip and unequip through `PlayerStats` (`equipPlan`, both hands), item tooltips.
4. **Weapons you can see.** Sword, axe, bow… built in code like the staff; the equipped weapon shows in
   Eldrin's hands, and the animation set follows the weapon type (amo's anim-manifest idea).
5. **Mastery, talents and styles on screen.** A character sheet overlay; style skills (amo's
   `STYLE_SKILLS`) usable from a hotbar.
6. **Archery and ammunition.** Bow draw/release, arrows as projectiles, quiver from `ammo.js`,
   arrows recovered from the ground.
7. **Statuses on the player.** `StatusManager` + `STATUS_DEFS` (burning, poison, slowed…) with icons.
8. **Enemy framework.** Generalise the shadow soldier into data-driven enemies (`ENEMY_TYPES`,
   `enemyMagic` kits, `elites`, affinities) and add a second, different enemy.

Phase 1 is done when a fight uses melee, a spell and a bow, drops loot you can equip, and levels
mastery — on desktop and on the phone.

## Status
- Phase 0 done (2026-11-12): rules package, engine/game/content split, input (keyboard, gamepad,
  touch), quality presets (F2), perf overlay (F3), saving via amo's SaveManager, Android build,
  batching. Galaxy S25 Ultra: 60 fps locked on high. Still owed: a mid-range phone test.
- Phase 1: slice 1 done (staff strike: click / R / pad B / touch HIT; amo damage, cooldown, hitGain mastery; shields block it). Next: slice 2, loot.
