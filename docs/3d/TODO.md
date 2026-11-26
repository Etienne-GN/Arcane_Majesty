# Arcane Majesty 3D — the big TODO list (2026-11-18)

Everything still to do, grouped by area. ★ = the user asked for it. Check items off as they land; the finished
history stays in `ROADMAP.md`. Lore rule: verify against the Neo4j DB before inventing anything, and new
game-only lore gets `origin: "game"`.

**Order (user, 2026-11-26):** canon check → controller mapping → the v2 models everywhere → multiplayer → clothing & the race body (only once every NPC and the Forge are on v2) → creatures → magic → fighting styles → the rest; races last. Music waits for the user's tracks.
## 0. ⚠️ CANON CHECK PENDING ★★ (decided 2026-11-19 — must be done before any lore DB sync)
- [ ] **The book: Eldrin's age** (user, 2026-11-26) — Eldrin is in his thirties during Eldoria's Prophecy, not ~60. Revise `books/eldorias_prophecy/canon/characters.md` ("~60 at the start of the quest") and every passage that ages him: ch. 3 ("thirty years" with the Archive's key; the staff "worn smooth by thirty years of stairs"), ch. 14 ("sixty years being right"), the "forty years" of strata and journals, the Hermit's lines that assume an old scholar, and the game's texts that do (Mana Dart / spell lore "years", the 2D Hermit's "forty years" is gone with the 2D quests). He is **34** at the beginning (born ~467 AGD — decided 2026-11-26).
- [x] 2026-11-26: the check is done, approved and applied — written up in `docs/3d/CANON_CHECK.md` — 8 decisions for the user (§A), proposed verdicts for every section (§B); apply after the user answers (§C).
- [x] Run a canon check on every item of `docs/3d/LORE_REVIEW.md` (226 items: what the game has that the lore DB doesn't) against the DB, the album XMLs / ACC, the book canon and `world_lore.md`. **First the 4 possible conflicts** (Vorgos called "the warlord" on the Cleaver of Vorgos; the Arcane Covenant vs the DB's Crimson Covenant; Voraun as a duelist in the Ruins; the Shadow Balrog's look), then the new names (Valdric, the Asran Academy, the Arcane Covenant, the Twilight Order, the Rift-Gates, the Border Watch, 0 GD, the Star-Guard, Silvara…), then the rest. Our decisions must stay coherent with the established lore; the user approves each verdict before the DB sync (`origin: "game"`) and the game fixes.

## 1. Controller mapping screen (asked 2026-11-26)
- [x] (2026-11-26: engine/padmap.js + Options → Controls → Gamepad buttons) Options → Controls → a "map buttons" screen for the gamepad: every action (hop, the hands / cast and strike, cycle, Blink-Step, Aether Sight, satchel, sheet, hotbar, camera cycle, sprint…) listed with its button; press a row then a button to rebind; conflicts shown; reset to defaults; saved per device (engine/settings.js). engine/input.js reads the map instead of fixed indices (today: A hop, X/RT right hand, LT left hand, LB/RB cycle, B Blink-Step, Y tap Aether Sight / hold satchel, Start sheet, Back Blink-Step, D-pad hotbar, L3 sprint, R3 camera / hold change).

## 2. The v2 character models everywhere (asked 2026-11-25 — once the v2 models are polished)
- [ ] **First: character layers** (`docs/3d/characters/LAYERS_PLAN.md`, decided 2026-11-26) — man, woman, boy, girl, old man, old woman; layers Common → Sex → Age → Character override, for the model's shape (body and face — not clothes or hair, which dress the shape); edits in design space so they land on every proportion; the Lab's layer picker and a "dress the model" view (basic clothes and hair while sculpting).
- [ ] Replace every NPC (townsfolk, villagers, cast, story people) with the v2 skinned models.
- [ ] Refactor the Forge (forge.html / forge/main.js) onto the v2 models.
- [ ] Make every Forge item (garments, armour, hair, beards, handhelds, wardrobe.js equipment) compatible with the v2 bodies.

## 3. Multiplayer (parked 2026-11-14 — don't forget)
- [ ] Test the shared wolves and shadow soldiers (coded, untested).
- [ ] Share Malphas and the deer; per-map shared weather.
- [ ] 6.4: online characters and a server list.
- [ ] TLS (wss) for the server, so release builds can play online.

## 4. Characters & clothing ★ — ONLY after §2 (every NPC and the Forge on the v2 models): no clothing work before the model
- [ ] **More garments in every Forge slot** (today ~1–4 each). Torso: gambeson, chain shirt, plate cuirass, leather jerkin, tabard, gown/dress, vest, apron, priest's vestment. Legs: skirts, kilts, greaves, breeches, hose. Feet: sandals, riding boots, sabatons. Arms: gloves, gauntlets, vambraces. Shoulders: mantle, fur collar, plate pauldrons. Waist: pouches, tassets, rope belt. Neck: amulets, scarves, gorget. Head: circlet, crown, coif, great helm, kettle hat, feathered cap, veils. Back: quiver, cloak variants, banner pole, backpack.
- [ ] Patterns and finishes: trim, embroidery, studs, wear and dirt, metal tints (iron, steel, bronze, gold, blackened).
- [ ] More hair, beard and face options (brows, scars, eye glow, age lines); polish the female, child and elder bodies.
- [ ] Wear what you equip: every wearable item in `packages/rules` maps to a 3D part (`game/wardrobe.js`); new items for the new parts, sold in shops and dropped as loot.
- [ ] Townsfolk built from the archetypes and new parts, so Thaloria's 41 residents look varied (guards, nobles, traders, children).
- [ ] Phase 8 from the roadmap: more shapes, colours and parts for heroes in `forge.html`.
- [ ] A race slot on the body: ears, skin and eye tones, build, glow (Aurorian light, Nythorian shadow), horns or marks for the Fallen.

## 5. Creatures
- [x] (0.19.0) 14 more bodies (content/actors/bodies2.js): Giant Spider and the Spider Queen (a boss in Whisper-Wood), Frost Bear, Ice Revenant, Glacier Crab and Wendigo (the Summit), Ash Crawler and Cinder Hawk (the Fire Gate), Forge Daemon (the Inferno halls), Plague Rat (Graywatch), Rot Toad (Whisper-Wood, Lake Aethera), Dark Druid and Mushroom Shaman (Whisper-Wood, casters), Arcane Sentinel (the Keepers' Vaults); spiders in the Deep Shaft too.
- [ ] ~70 creature types still without a body (birds, small animals, the swamp and arcane families' rest, skeleton archers…); their own codex sketches (today a body plan per family).
- [ ] More bosses, one per campaign act.
- [ ] Codex: a Field Notes skill (auto write-up — the hook exists), more sketch body plans.

## 6. Magic
- [x] Enemy magic (0.18.0, content/actors/enemyMagic3d.js on amo's ENEMY_KITS): casters shape spells (a ring fills at their feet, they stand still; a stun, silence or hush breaks it), bolts fly at you (dodge, block, parry, deflect), hexes (curse, silence — no spells — and Unweave, which strips your buffs), wards, empowerment, quickening and mending on their allies (bubbles, embers, sparks); dungeon bosses raise the Void Aegis (blows do a third) at half and a quarter health.
- [x] Dispels (0.18.0): Unravel and Purifying Sweep tear away wards and the Void Aegis (Unravel hurts again for each); Counterspell and Unravel break a spell being shaped.
- [x] Aetheric Sight's active use (2026-11-25: L · SIGHT button · gamepad Y).
- [x] Set-pieces for the remaining area spells (2026-11-25). (The incantation for more of them: still open.)
- [x] Targeting polish: an aim line for bolts, the ring snapping to enemies (2026-11-25).

## 7. Fighting styles & moves ★
- [x] **The 14 style skills that said "not in 3D yet"** (2026-11-19, 0.15.0): Shadowstep, Piercing Lunge, Leaping Strike, Run Through, Flurry of Blows, Taunt, Aimed Shot, Snare, Mark Prey, Headshot, Pierce, Snap Cast, Chain, Release.
- [x] **Every style skill has its own move and effect** (2026-11-19, 0.17.0): a pose per skill in `models/character.js` (`move`: parry, riposte, guard, cleave, overhead, sidelong, chop, stab, haymaker, grab, headbutt, roar, wall, twirl, channel, raise, flourish, aim, vanish, beckon, spinhigh, land, cross); the blow lands on the move's impact frame; `game/skillFx.js` draws bursts, shock-waves, ground cracks, sweep arcs, stance auras (Rage embers, the Shield Wall pane, Deflect's whirling ring, Channel's gathering motes, Echo's orbiting sparks, Taunt's pulse) and marks on creatures (dazed stars, blood, roots, the hunter's mark, cracked armour, a limp). New sounds: parry, whoosh, roar, smash, puff.
- [x] **The stances do what they say** (0.17.0): Perfect Block (every blow nothing, attacker dazed), Shield Wall (front blows ×0.15), Deflect Arrows (nothing from range), Parry dazes the attacker and opens a 2 s Riposte window (×1.5), Backstab ×3 from behind, Vanish hides you (creatures lose you) and doubles the next hit, Echo repeats a spell at half power, Overload ×1.4 spell damage for ×1.5 mana; knockback for Haymaker, Grab & Throw (to the side), Windmill, Release, Snap Cast (`enemyCore.shove`, heavier creatures go less far, a stagger).
- [x] **Combat feel** (0.17.0): three-blow combos — the second comes back the other way, the third is the weapon's finisher (sword lunge, greatsword/halberd cleave, dagger stab, axe chop, mace/staff overhead slam, spear long lunge, bo spin, fists haymaker; ×1.6, throws them back); every blow makes them flinch; a press during recovery is kept 0.35 s.
- [x] Per-weapon attacks (0.17.0): spear and bo thrusts levelled at the foe (they pointed at the sky), greatsword and claymore swung with both hands; shield **Block** (0.15.0).
- [x] Dual-wielding (0.17.0): a weapon in each hand — the strike key alternates hands, the finisher is a cross-cut with both blades.
- [x] (0.18.0) Bow loosed from full draw, crossbow kick and crank; a dodge (hop with the stick held while something hunts you within 7 m: a low dive, untouchable all the way); hit-stop on finishers, parries and perfect blocks (engine/hitstop.js); a red tell-fan on the ground under every creature winding up a blow; the left hand keeps its own favourites when both hands hold the same kind of weapon.
- [x] Dual-wand overpower (2026-11-25).
- [ ] Favourites polish: skills in the Spellbook-style ⋯ menus, and style skills on the hands.

## 8. Campaign ★
- [x] Phase 9, one chapter per pass (built 2026-11-19; played through and filled in from the book 2026-11-25 — see ROADMAP) (from the book, the beat sheet and the lore DB): 6 Treachery's Bite (the Fire Gate, Oren's betrayal), 7 The Solitary Path (the Descent), 8 Inferno's Trial (the Inferno Labyrinth), 9 Eldoria's Heartbeat (the Ruins of Eldoria), 10 Heart of War (the Heartstone Chamber, the Ancient Door), 11 The Weight of Eternity, 12 Dawn's Embrace (Eldrin's Tower).
- [x] Chapters 1–5 reviewed in 3D (2026-11-19). Found: chapters 1 and 2 were not built (ch. 1's quest never started; ch. 2 a placeholder), and nothing led from one chapter to the next. Done: **ch. 1 Echoes of Stone** in the tower's study (the strata cores, the second journal, the letter from Silverrun — book ch. 1), **ch. 2 Dreamweaver's Call** (content/vision.js + content/prologue.js: the candle flattens, the bell rings every hour, the vision — the violet sky, the city out of true, the man who holds a door without a frame and breaks, the woman's silent vigil, the storm's eye: Vorgos's lines from the book; Eldrin wakes on the floor with the Compass), and the threads: each chapter now opens the next (3 Odyssey's Dawn → 4 Whisperer of Doubt → 5 The Elemental's Trial → 6 Treachery's Bite) with a "Next:" banner. Checked: the Sanctuary → Fire Gate way opens with Aether Sight.
- [x] The book's ch. 3, The Scholar's Life (2026-11-19): the compass tested at the study's window, the three fragments in the Forbidden Archive (a manifest, a canticle, a physician's note — Eldrin has held the Archive's key for thirty years, as in the book: the Library's register now says so), home to pack and lock the tower ("The scholar's life is mine to live no more.") — then Odyssey's Dawn.
- [ ] Still in chapters 3–5: a cutscene feel for Oren's first meeting and the Hermit (camera moves).
- [ ] Lore DB sync owed for game-only places: the Corrupted Rim, the Hermit's camp (`origin: "game"`).

## 9. Skills, items & economy
- [ ] Field Notes skill in the Skills book.
- [x] Tools (0.18.0): gathering takes out the tool the node needs (pickaxe, axe, sickle, rod) and works it, or kneels to pick; the Torch (merchant, 6 gold) held in the left hand lights the dark (a light every scene keeps at zero, so lighting it never rebuilds shaders). Lantern: not yet.
- [x] The claymore draws as the claymore (0.18.0).
- [x] Story rewards (0.18.0): chapters 6–12 give the Umbral Dagger, Manual: Shadow, a Crystalline Rod, a Heartwood Bracer, the Arcane Sceptre, a Void Pendant and the Staff of the First Covenant, with glint.
- [x] Werewolf change animation (0.18.0): doubled over and shaking, dark smoke and fur as the body turns, up with a roar (or a long breath).
- [ ] Shops and loot for the new clothes and weapons; crafting recipes for them.
- [x] ★ **A checkout step at merchants** (2026-11-18) (and other traders): put several items in a basket to buy or sell, review the total, then confirm — no more one-click purchases.

## 10. World & maps ★
- [x] **Map and minimap refresh** (2026-11-18): a parchment chart (ink shorelines, watercolour water, inked trees, hatched rock, blank parchment where unexplored; towns show streets, buildings and walls), a leather frame, a compass and a scale, drawn icons, labelled exits, pan and zoom, tap-to-set waypoints; the minimap is a bronze ring with N, turns with the camera (Options: north up), and shows the waypoint or a rim arrow with the distance.
- [x] Maps for the other places (found done 2026-11-25): let each region give the chart its roads and buildings, as Thaloria does (`mapInfo.groundAt`, `buildings`, `walls`).
- [x] (2026-11-25: every Eldorian DB place is in the open world; the Sanguine Vaults' inside added) **New regions from the lore** (38 DB locations; built so far: Thaloria Glade, Eldrin's Tower, Thaloria city and its interiors, the East Road and the Hollow, the Summit and the mountain, the Sylvan Sanctuary, Whisper-Wood). Missing: the Emerald Fields and the Weeping Stones, the Heartlands (Lake Aethera, Silverrun River, the Crossroads, the Sunken Temple), the Scarlands (Graywatch, New Ravenspire, the Obsidian Gate), the Silver Coast and Port Silver, the Sanguine Vaults, Iron Hollow, the Forbidden Archive, Nythoria, the Great Rift.
- [ ] Dungeons and caves with puzzles; interiors for the new towns.
- [ ] Region editor: painting tools, place props, test spawns.

## 11. Release, platform & housekeeping
- [ ] Repo visibility: stay public, or go private plus a public releases-only repo (the app needs no key that way).
- [ ] A proper release signing key (today's is the debug key), and a store listing later.
- [x] PC build (2026-11-19, user choice: a downloadable desktop app): `apps/amo3d/desktop` (Electron) — CI builds a portable Windows .exe and a Linux AppImage on every release tag and attaches them to the release; Linux starts it once on a virtual screen and keeps a screenshot.
- [ ] A test on a mid-range phone.
- [ ] Release signing key: keep the debug key until a store release (user, 2026-11-19); switching means one uninstall on phones (saves lost) — add a save export first.
- [x] The player manual for 3D (2026-11-19): `apps/amo3d/manual.html`, shipped in the game (title → HOW TO PLAY): controls for keyboard, gamepad and touch, the hands, combat, styles, magic, enemies, the world, living there, the story, menus, options, the Workshop.
- [x] CI: actions/setup-java v5 (the deprecation warning).
- [ ] CLAUDE.md: the DB counts are outdated (7 races now, not 6).

## 12. Repo cleanup (later — asked 2026-11-25)
- [ ] Move the old 2D assets and unused related stuff (apps/amo, apps/tool_suite, LPC sheets, 2D-only tools and data) out of this repo to an archive, and clean the repo — plan it with the user first.

## 13. Waiting on the user
- [ ] Music per region — the user's tracks (not made yet; comes later).

## 14. Races ★
The lore DB already has 7: **Werewolf** (Guardians of the Wild, the Emerald Fields pack), **Aurorian** (elven, of light), **Nythorian** (elven kin of the Underworld: Seraphina, Malakar, Valen), **Fallen Aurorian** (Xarathos, Acheron), **Human**, **Shapeshifter** (Vexis), **Ancient Entity**.
- [ ] Decide: **dwarves are not in the lore yet** — add them as new canon (DB + world_lore), or leave them out?
- [x] Werewolves (2026-11-18): the Guardians of the Wild in the Emerald Fields (content/actors/werewolf.js) — upright wolf-men on digitigrade legs, an Alpha; neutral, they warn you off their ground, hunt Void-corruption, and the whole pack turns on you if you strike one. Codex entry 'Guardian of the Wild'.
- [ ] Werewolves, later: playable (the human ↔ wolf change), the Vexis story beat (he turns the pack against Kael), werewolf townsfolk or a pack village.
- [ ] Race traits in the rules (affinities, small stat leanings), playable races in New Game, race-specific NPCs and places.
