# Arcane Majesty 3D — the big TODO list (2026-11-18)

Everything still to do, grouped by area. ★ = the user asked for it. Check items off as they land; the finished
history stays in `ROADMAP.md`. Lore rule: verify against the Neo4j DB before inventing anything, and new
game-only lore gets `origin: "game"`.

## 1. Characters & clothing ★
- [ ] **More garments in every Forge slot** (today ~1–4 each). Torso: gambeson, chain shirt, plate cuirass, leather jerkin, tabard, gown/dress, vest, apron, priest's vestment. Legs: skirts, kilts, greaves, breeches, hose. Feet: sandals, riding boots, sabatons. Arms: gloves, gauntlets, vambraces. Shoulders: mantle, fur collar, plate pauldrons. Waist: pouches, tassets, rope belt. Neck: amulets, scarves, gorget. Head: circlet, crown, coif, great helm, kettle hat, feathered cap, veils. Back: quiver, cloak variants, banner pole, backpack.
- [ ] Patterns and finishes: trim, embroidery, studs, wear and dirt, metal tints (iron, steel, bronze, gold, blackened).
- [ ] More hair, beard and face options (brows, scars, eye glow, age lines); polish the female, child and elder bodies.
- [ ] Wear what you equip: every wearable item in `packages/rules` maps to a 3D part (`game/wardrobe.js`); new items for the new parts, sold in shops and dropped as loot.
- [ ] Townsfolk built from the archetypes and new parts, so Thaloria's 41 residents look varied (guards, nobles, traders, children).
- [ ] Phase 8 from the roadmap: more shapes, colours and parts for heroes in `forge.html`.

## 2. Races ★
The lore DB already has 7: **Werewolf** (Guardians of the Wild, the Emerald Fields pack), **Aurorian** (elven, of light), **Nythorian** (elven kin of the Underworld: Seraphina, Malakar, Valen), **Fallen Aurorian** (Xarathos, Acheron), **Human**, **Shapeshifter** (Vexis), **Ancient Entity**.
- [ ] Decide: **dwarves are not in the lore yet** — add them as new canon (DB + world_lore), or leave them out?
- [ ] A race slot on the body: ears, skin and eye tones, build, glow (Aurorian light, Nythorian shadow), horns or marks for the Fallen.
- [x] Werewolves (2026-11-18): the Guardians of the Wild in the Emerald Fields (content/actors/werewolf.js) — upright wolf-men on digitigrade legs, an Alpha; neutral, they warn you off their ground, hunt Void-corruption, and the whole pack turns on you if you strike one. Codex entry 'Guardian of the Wild'.
- [ ] Werewolves, later: playable (the human ↔ wolf change), the Vexis story beat (he turns the pack against Kael), werewolf townsfolk or a pack village.
- [ ] Race traits in the rules (affinities, small stat leanings), playable races in New Game, race-specific NPCs and places.

## 3. Fighting styles & moves ★
- [x] **The 14 style skills that said "not in 3D yet"** (2026-11-19, 0.15.0): Shadowstep, Piercing Lunge, Leaping Strike, Run Through, Flurry of Blows, Taunt, Aimed Shot, Snare, Mark Prey, Headshot, Pierce, Snap Cast, Chain, Release.
- [x] **Every style skill has its own move and effect** (2026-11-19, 0.17.0): a pose per skill in `models/character.js` (`move`: parry, riposte, guard, cleave, overhead, sidelong, chop, stab, haymaker, grab, headbutt, roar, wall, twirl, channel, raise, flourish, aim, vanish, beckon, spinhigh, land, cross); the blow lands on the move's impact frame; `game/skillFx.js` draws bursts, shock-waves, ground cracks, sweep arcs, stance auras (Rage embers, the Shield Wall pane, Deflect's whirling ring, Channel's gathering motes, Echo's orbiting sparks, Taunt's pulse) and marks on creatures (dazed stars, blood, roots, the hunter's mark, cracked armour, a limp). New sounds: parry, whoosh, roar, smash, puff.
- [x] **The stances do what they say** (0.17.0): Perfect Block (every blow nothing, attacker dazed), Shield Wall (front blows ×0.15), Deflect Arrows (nothing from range), Parry dazes the attacker and opens a 2 s Riposte window (×1.5), Backstab ×3 from behind, Vanish hides you (creatures lose you) and doubles the next hit, Echo repeats a spell at half power, Overload ×1.4 spell damage for ×1.5 mana; knockback for Haymaker, Grab & Throw (to the side), Windmill, Release, Snap Cast (`enemyCore.shove`, heavier creatures go less far, a stagger).
- [x] **Combat feel** (0.17.0): three-blow combos — the second comes back the other way, the third is the weapon's finisher (sword lunge, greatsword/halberd cleave, dagger stab, axe chop, mace/staff overhead slam, spear long lunge, bo spin, fists haymaker; ×1.6, throws them back); every blow makes them flinch; a press during recovery is kept 0.35 s.
- [x] Per-weapon attacks (0.17.0): spear and bo thrusts levelled at the foe (they pointed at the sky), greatsword and claymore swung with both hands; shield **Block** (0.15.0).
- [x] Dual-wielding (0.17.0): a weapon in each hand — the strike key alternates hands, the finisher is a cross-cut with both blades.
- [ ] Still: bow draw and crossbow reload animations; dual-wand overpower; one favourites list per weapon type (two of the same share it); a dodge roll (the hop's i-frames are the dodge today); hit-stop; enemy telegraphs on every creature.
- [ ] Favourites polish: skills in the Spellbook-style ⋯ menus, and style skills on the hands.

## 4. Magic
- [ ] Enemy magic, and Void Aegis to block it.
- [ ] Dispels: Unravel and Purifying Sweep.
- [ ] Aetheric Sight's active use.
- [ ] Set-pieces for the remaining area spells, and the incantation for more of them.
- [ ] Targeting polish: an aim line for bolts, the ring snapping to enemies.

## 5. World & maps ★
- [x] **Map and minimap refresh** (2026-11-18): a parchment chart (ink shorelines, watercolour water, inked trees, hatched rock, blank parchment where unexplored; towns show streets, buildings and walls), a leather frame, a compass and a scale, drawn icons, labelled exits, pan and zoom, tap-to-set waypoints; the minimap is a bronze ring with N, turns with the camera (Options: north up), and shows the waypoint or a rim arrow with the distance.
- [ ] Maps for the other places: let each region give the chart its roads and buildings, as Thaloria does (`mapInfo.groundAt`, `buildings`, `walls`).
- [ ] **New regions from the lore** (38 DB locations; built so far: Thaloria Glade, Eldrin's Tower, Thaloria city and its interiors, the East Road and the Hollow, the Summit and the mountain, the Sylvan Sanctuary, Whisper-Wood). Missing: the Emerald Fields and the Weeping Stones, the Heartlands (Lake Aethera, Silverrun River, the Crossroads, the Sunken Temple), the Scarlands (Graywatch, New Ravenspire, the Obsidian Gate), the Silver Coast and Port Silver, the Sanguine Vaults, Iron Hollow, the Forbidden Archive, Nythoria, the Great Rift.
- [ ] Dungeons and caves with puzzles; interiors for the new towns.
- [ ] Region editor: painting tools, place props, test spawns.
- [ ] Music per region (the user's tracks).

## 6. Campaign ★
- [ ] Phase 9, one chapter per pass (from the book, the beat sheet and the lore DB): 6 Treachery's Bite (the Fire Gate, Oren's betrayal), 7 The Solitary Path (the Descent), 8 Inferno's Trial (the Inferno Labyrinth), 9 Eldoria's Heartbeat (the Ruins of Eldoria), 10 Heart of War (the Heartstone Chamber, the Ancient Door), 11 The Weight of Eternity, 12 Dawn's Embrace (Eldrin's Tower).
- [ ] Review chapters 1–5 as played in 3D: quest givers, pacing, cutscenes and dialogue staging.
- [ ] Lore DB sync owed for game-only places: the Corrupted Rim, the Hermit's camp (`origin: "game"`).

## 7. Creatures
- [ ] Only ~20 of the 115 creature types have 3D bodies (wolves, shadow soldiers, the summit beasts, the East Road roster, Malphas, 11 animals, deer). Build the rest as regions need them: spiders, golems, wraiths, imps, elementals, the frost and ember families, bats, crabs…
- [ ] More bosses, one per campaign act.
- [ ] Codex: a Field Notes skill (auto write-up — the hook exists), more sketch body plans.

## 8. Skills, items & economy
- [ ] Field Notes skill in the Skills book.
- [ ] Tools as hand items: torch, pickaxe, fishing rod, lantern.
- [ ] The claymore item uses the new claymore model in the game (it still draws as the greatsword).
- [ ] Shops and loot for the new clothes and weapons; crafting recipes for them.
- [x] ★ **A checkout step at merchants** (2026-11-18) (and other traders): put several items in a basket to buy or sell, review the total, then confirm — no more one-click purchases.

## 9. Multiplayer (parked 2026-11-14 — don't forget)
- [ ] Test the shared wolves and shadow soldiers (coded, untested).
- [ ] Share Malphas and the deer; per-map shared weather.
- [ ] 6.4: online characters and a server list.
- [ ] TLS (wss) for the server, so release builds can play online.

## 10. Release, platform & housekeeping
- [ ] Repo visibility: stay public, or go private plus a public releases-only repo (the app needs no key that way).
- [ ] A proper release signing key (today's is the debug key), and a store listing later.
- [ ] PC build (Electron or the browser), and a test on a mid-range phone.
- [ ] The player manual for 3D.
- [ ] CLAUDE.md: the DB counts are outdated (7 races now, not 6).
