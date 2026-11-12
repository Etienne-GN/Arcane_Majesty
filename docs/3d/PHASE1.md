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
- Phase 1: slice 1 done (staff strike: click / R / pad B / touch HIT; amo damage, cooldown, hitGain mastery; shields block it). Slice 2 done (loot: amo lootTable rolled on death, glowing pickups with a light beam in the item colour, walk over to collect via PlayerStats.addItem, satchel-full message). Slice 3 done (inventory & equipment screen: I / Tab / pad View or Y / touch BAG; pauses the game; equip both hands, unequip, use, drop to the ground — all through PlayerStats). Slice 4 done (12 code-built weapon models, one per amo weapon type, tinted by the item colour; main hand + off hand/shield mounts follow onEquipChange; strikes use the equipped type: amo cooldown, reach, dmgMult, that type's mastery; thrust types stab; empty hands = Eldrin's staff). Slice 5 done (character sheet: C / pad Menu / touch HERO; attributes + distributePoint, weapon & element mastery vs talent ceilings, known spells with real cost/cooldown/damage; Eldrin has his amo talents). Slice 5b-1 done (consumable hotbar: amo hotbar.js, keys 1–4 / D-pad / tap, To-hotbar from the satchel, shared cooldown; fireball now F only). 5b-2 done (styles in the character sheet: styles of weapons in hand, progress, practise button, skill states; kills practise the current style via practiceGain). 5b-3 done (style skills Z/X/V, pad RB/LT/R3, tap: the practised style of the weapon in hand; kinds strike, spin, buff; player buffs read amo STATUS_DEFS fields — damageTakenMult, statsMult, swingMult, speedMult, manaRegen, parrying). Still to play: line, dash, leap, flurry, taunt, shadowstep, shot, volley, chain, release (shots/volley with archery in slice 6; the rest in 5b-4). Slice 6 done (archery: bow/crossbow in hand → the strike button shoots; takeAmmo from the quiver, flying arrows with drop, amo ranged damage × ammo mult, bow mastery, recordHit/ammoBack recovery, quiver refill after 3 s calm; ready/spare count on the HUD). Slice 7 done (amo STATUS_DEFS on enemies: dot damage, stun, speedMult, damageTakenMult, immunities; skills and poison arrows apply their status; player status icons with time left). Slice 8 done (actors/enemyCore.js: ENEMY_TYPES stats, affinities, statuses, XP + lootTable on death, nameplate, respawn — wolves built on it: a pack of three at a forest den that closes in, circles and lunges). The shadow soldier still has its own copy of these rules: move it onto enemyCore when next touched.
- **Phase 1 done (2026-11-12).** Left for later passes: style skill kinds line/dash/leap/flurry/taunt/shadowstep/shot/volley/chain/release; spell learning from scrolls; the soldier onto enemyCore. Next: Phase 1.5 — the title screen and main menu (ask the user which album track opens the game).
