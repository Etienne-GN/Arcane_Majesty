# Polish backlog

Looks and feel, parked on 2026-10-26 so the work can go to making the game playable
(test cooking and crafting, add sword fighting and sword skills, ranged weapons).
Come back to these in a polishing phase. Add to it freely.

## Maps (from the W6 preview review)

- **Thaloria looks like a park.** Small houses stand alone on wide lawns on a strict
  street grid. Wanted: rows of houses along the streets, shared walls, fenced yards and
  gardens, more buildings, less empty grass. Layout: `apps/amo/tools/maps/thaloria_layout.py`,
  generator `gen_thaloria.py` (then `node tools/gen_walk_grids.mjs`).
- **Forest trees all look the same.** Every tree tile (tile 1) is one identical trunk and
  canopy (`GameScene._buildTreeChunk`, W2), so dense woods read as orchard rows. Wanted: mixed
  tree kinds and sizes. Touches every forest map, and the W2 performance budget.
- **The Wilds:** the forest shape was improved (ragged clearings, gradual thinning), but
  check it again with real tree art.

## Sprites

- The user has many sprite changes in mind (characters, props). List them here as they come.
- **Weapon sprites switch hands with direction:** the weapon is in the right hand walking right and the left hand walking left. Every weapon sprite needs reworking so the main-hand weapon stays in the same hand in all four directions, and an off-hand weapon (combat design, two hands) has a hand of its own.

- **Combat C1 art gaps:** the wand has no LPC art (nothing drawn in hand); the bo staff borrows the cane; off-hand weapons other than shields are not drawn (they work in play); both shields use the oak heater; new weapons reuse old icons (spear = stone sword, mace = stone, axe = pickaxe, shield = wooden box, bo = log). Story heroes (baked sheets) show no weapon art at all — only creator-made characters draw weapons.

## Small things left from earlier work (W3–W5 reviews)

- A seated townsperson stands up while you talk to them.
- A hop or blink can land on a walking townsperson.
- "Closed — come back in the morning" shows for a few minutes after 08:00 while the
  keeper walks to the stall.
- Named shopkeepers greet you again after you go through a door and back.
- The boss's floating text draws under walls and roofs (depth 26), the bug fixed for
  speech bubbles on 2026-10-26.
- Two Thaloria residents share a look (`look_05`: `beggar_gate`, `stallholder_b`) and both work near the market by day.
- Combat C1 review leftovers: touch can raise the shield while out of mana (keyboard can't); the blue block tint and other tints (status colours, hurt flash) clear each other; a stun in the middle of a block keeps the block up for the whole stun; hold-to-block works on the keyboard only (touch and gamepad get 0.7 s per press).
- Combat C2 review leftovers: passive element gains (rain, kills by type) are not limited to 1 point per tick, so level 2 comes a little fast; weapon procs, earth-pillar fall damage, the Unravel bonus and damage over time teach no mastery; the power attack's wait ignores mastery speed; old hero saves don't get the new starting spells; `PlayerStats.reset()` leaves talents (both callers set them right after); a few missing tests (mastery save round-trip, Resonant Mind under the cap, the skill-gate test's `if`).
- Combat C3 art: style skills borrow the normal attack animation and arc (a bigger arc for strong hits and spins); no own art for Parry, Vanish, Shadowstep, the leap, Taunt or the stances (only a tint and a ring).
- Combat C3: on desktop there is no Q / R / F / T bar on screen (only the touch ring shows slots, greyed when the weapon is not in hand); the STYLES and TOME screens show the slot tags.
- Combat C3 review leftovers: a skill pressed on cooldown or while stunned says nothing; reading a manual shows no '+40%' notice and the Guild keeps selling manuals for known styles; skill hits skip the on-hit effects (thorns, vampiric, lifebloom, enchant statuses, execute, eclipse mark, lore procs); the boss has no facing (Backstab counts as behind from the north, Shadowstep lands inside it); Vanish is ignored by the boss and networked enemies and online LPC characters don't fade; Deflect Arrows also stops the boss's shadow burst; skills aren't blocked during a hop, mid-attack (pad/touch) or when mana-exhausted; Taunt doesn't really pull enemies (its text overpromises); skill cooldowns carry over to the next character on Continue; dazes can keep the boss stunned often.
