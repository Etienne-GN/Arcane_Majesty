# Arcane Majesty 3D — full roadmap

Everything amo (the 2D game) has, and where it lands in the 3D game. Nothing on this list is
dropped: each amo screen and system has a phase. Rules come over through `packages/rules`
(`@rules`) unchanged; what gets rebuilt is presentation — 3D scenes, models, HTML overlay screens.

Legend: **R** = rules already shared via `@rules` · **B** = rebuild (Phaser-bound in amo) ·
**N** = new for 3D.

## Phase 0 — Foundations ✅ (2026-11-12)
Rules package, engine/game/content split, input (keyboard, gamepad, touch), quality presets,
perf overlay, saving (SaveManager, **R**), Android build, batching. Owed: mid-range phone test.

## Phase 1 — The combat loop (see PHASE1.md)
| amo | Kind | Slice |
|---|---|---|
| Melee: CombatManager, weapons.js, mastery.js | B + R | 1 ✅ staff strike, then all weapon types (4) |
| Loot tables (ENEMY_TYPES lootTable), pickups | R + N | 2 |
| **InventoryScene** — satchel, equipment, both hands (equipPlan), satchel tiers | B + R | 3 |
| Visible weapons + animation set per weapon type (animProfiles idea) | N | 4 |
| **StatScene** (attributes, level-up points), **SkillTreeScene**, talents, mastery | B + R | 5 |
| **StylesScene**, StyleSkills, styles.js, hotbar.js | B + R | 5 |
| **SpellbookScene**, spells.js, spellLearning.js (scrolls, lessons, resonance) | B + R | 5 |
| Archery.js, ammo.js, quivers, arrow recovery | B + R | 6 |
| StatusManager + statuses.js (on player and enemies), reactions.js | R | 7 |
| Enemy.js / BossEnemy.js → data-driven enemies: enemyMagic, elites, affinities, levelBands, bestiary | B + R | 8 |
| **GameOverScene** (death, respawn.js) | B + R | 8 |

## Phase 1.5 — Title screen & main menu (right after combat)
The first thing anyone sees, so it has to look epic — built live in the engine, not a picture.
| amo | Kind |
|---|---|
| **Title screen**: a slow cinematic camera drifting through Eldrin's vale at dusk — the tower's lit windows, the waterfall mist, fireflies, light shafts — with the ARCANE MAJESTY title rising in gold over it; a soft vignette, embers drifting past the lens, the logo's arcane sigil slowly turning | N |
| **Main menu** over the same live scene: Continue (last save), New Game, Options (quality, audio), Credits — mouse, gamepad and touch | B (MenuScene, OfflineMenuScene) |
| Seamless start: Continue/New Game flies the camera down from the cinematic shot to Eldrin and hands over control | N |
| **Album music on the title screen, wired in Phase 1.5 itself** (not waiting for Phase 5): a minimal music player for one track — the user chose **"Echoes of Stone"** (Eldoria's Prophecy, track 01, `assets/music/Eldoria's Prophecy/01 - Echoes of Stone.mp3`) | N |

## Phase 2 — Camp & craft (moved up: it makes the glade a place to live in)
Status: **2.1 gathering done** (38 spots in the glade: herbs, mushrooms, berries, deadwood, ore, shallows, reeds; G / Enter / pad A / tap; tools; amo rollHarvest; regrow). **2.2 campfire done** (a campfire near the start: G opens Cook / Rest; amo COOKING_RECIPES via availableRecipes, scroll locks, craftRank + extraOutput; rest heals and saves; deer drop venison). **2.3 stations done** (one crafting screen, four stations: campfire, the tower hall hearth, the pavilion cauldron = alchemy, the pavilion workbench = amo CRAFTING_RECIPES incl. arrows/quivers; ranks + double batches for cooking and alchemy). Forge enchanting (ENCHANT_RECIPES) waits for a forge. **2.4 chests done** (Eldrin's chest in the tower hall: store/take, stacks merge, 24 slots, saved in amo chestContents). Item use and potions were covered in Phase 1 (satchel + hotbar). **Phase 2 done (2026-11-12).** Next: Phase 3 — the 3D Forge.
| amo | Kind |
|---|---|
| Gathering (gathering.js): herbs, wood, stone, feathers, deadwood sticks — nodes in the world | R + N |
| **CampfireScene**: cooking, resting, food buffs (addTempMaxHealth) | B + R |
| **CraftingScene** + stations.js: workbench, alchemy, forge; craftingRecipes, recipeScrolls, upgrades | B + R |
| **ChestScene**: storage chests | B + R |
| Item tooltips, use/consume, potions | B + R |

## Phase 3 — The 3D Forge (characters)
Decided with the user (2026-11-12): **both** a dedicated Forge page (to author characters for the game — the
lore cast used by the campaigns, saved as data) **and** an in-game creator used when starting a **multiplayer**
game with a DIY character. Campaigns play as lore characters (as in amo); multiplayer as your own.
Slices: 3.1 a character is data — one builder turns a definition into the 3D model (Eldrin re-expressed as a
definition) · 3.2 the parts library (body builds, faces, hair, facial hair, outfits, boots, gloves, palettes) ·
3.3 the Forge page (3D turntable preview, part and colour pickers, randomize, save/export to the cast) ·
3.4 the in-game creator (multiplayer New Game → create your character; campaigns → the lore cast) ·
3.5 equipment shows on the body (armor slots override outfit pieces).
Status: **3.1 done** (content/models/character.js builds any look definition — build, skin, eyes, hair, facial hair, outfit colours; Eldrin is content/cast/eldrin.json). **3.2a done** (parts library — hair: tousled, short, long, ponytail, braids, bald; facial hair: none, stubble, beard, moustache, goatee — content/models/parts/hair.js). Next: 3.2b outfits (robe / coat / tunic / armour shapes, hoods, capes) and body builds, 3.3 the Forge page **done** (forge.html: turntable, identity, body, hair, facial hair, outfit colours, pose and weapon preview, randomize, save to src/content/cast via the dev server, export JSON; THE FORGE in the title menu). 3.2b outfits **done** (cuts: longcoat, robe, tunic, armour; hood; cape — in the builder and the Forge). 3.4 the creator **done** (title: CAMPAIGN — ELDRIN or YOUR OWN HERO → forge.html?mode=create: name, amo class, look → Begin; saved in stats.flags.hero; class talents and a class start kit). Multiplayer (Phase 6) will reuse it. 3.5 equipment on the body **done** (game/wardrobe.js: head items → hood / helmet / hat, body items → robe / tunic / armour cut or a cape, in the item colour; the hero is rebuilt on equip). **Phase 3 done (2026-11-12).** Next: Phase 4 — world pipeline, starting with day/night and weather.
| amo | Kind |
|---|---|
| LPC Forge v2 → **3D Forge**: our own parts library (bodies, faces, hair, outfits, armor per slot, weapons), palettes, save as JSON | N |
| **CharacterCreatorScene**, characters.js, cast data → create Eldrin and others in 3D | B + R |
| Equipment shows on the body (armor/outfit per equipment slot) | N |
| townsfolkLooks.js → townsfolk built from the parts library | B |

## Phase 4 — World pipeline
Status: **4.1 day/night & weather done** (engine/sky.js: keyframed sky dawn→day→golden→dusk→night, sun arc and moonlight, stars, moon; rain and storms with streaks and lightning; amo gameClock 24-min day + weatherAt forest table; void creatures +20% at night; HUD clock; the title shot is fixed at golden hour; ?weather=clear|rain|storm). **4.2 pathfinding done** (engine/nav.js: 1 m walk grid from colliders + water, amo findPath A*, aim() = straight when clear else the farthest visible waypoint; wolves and soldiers chase/return/patrol with it; ~0.3 ms a route). Shadows reach 72 m on high. **4.3 map done** (game/mapview.js: map painted from the terrain + trees + landmarks; amo fog.js exploration saved in stats.explored; minimap north-up with arrow, view cone, enemies, deer; world map on M / touch MAP with landmark names; nothing shows through the fog). **4.4 fast travel done** (game/travel.js: three rift-gate monoliths in the glade, touch to attune (stats.attunedGates), travel between attuned gates; the Aetheric Tear T / touch TEAR: 85% max mana (75% with Aetheric Comprehension), 60 s cooldown (45), channel then step through; death respawns at the last gate). **4.5 regions done** (engine/region.js builds an outdoor map from content/regions/*.json: terrain recipe + features (lake, hill, clearing), path, palette, mood (fog, light, night floor, motes), trees by kind (flora.js), rocks, undergrowth, gathering, monoliths, actors (wolves, shadows, deer), links (archways) — first region **Whisper-Wood**, through an archway on the glade's south-east rim; gates travel across regions; respawn on the right map). Region changes are fade transitions, not seamless streaming (add later if the world needs it). **4.6 region editor done** (editor.html: top-down map painted from regionHeight, drag markers, tools for lake/hill/clearing/path/gate/wolves/shadow post/deer/link/landmark/delete, region settings (terrain, colours, mood, trees, gathering), Save → src/content/regions via the dev server, Play here → index.html?region=<id>; the game loads every region file automatically). **Phase 4 done (2026-11-13).** Next: Phase 5 — content (Thaloria, Summit of Despair, townsfolk, dialogue, quests, shops, music).
| amo | Kind |
|---|---|
| Region format, region chunks, streaming (regionFormat, regionChunks, worldLayout) → 3D regions + LOD | R + N |
| interiors.js → interior maps (as Eldrin's Tower) | R + N |
| gameClock.js + weather.js → day/night, sun/moon, rain, snow, fog | R + N |
| walkGrid / pathfind.js → navigation for NPCs and enemies in 3D | R + N |
| fog.js, mapMarkers → **MapScene**: world map, fog of war, minimap, landmarks | B + R |
| **FastTravelScene**, rift-gates (attunedGates) | B + R |
| **AethericTearScene** (spatial tear spell / travel) | B + R |
| WorldState.js (persistent world changes) | R |
| In-browser map editor (place props, paint terrain) | N |

## Phase 5 — Content: places and people
Plan (2026-11-13): Thaloria is built **from amo's own city data** (data/maps/regions/thaloria.js — tile grid,
~2000 named wall/roof/door pieces, door fronts, gates, landmarks; 1 tile = 1 m), so 2D and 3D match street for street.
Slices: 5.1 Thaloria's streets, walls and buildings in 3D, the West Gate road to Eldrin's Tower · 5.2 its 40 residents
(amo townsfolk + schedules) built with the character builder · 5.3 dialogue + named NPCs · 5.4 shops · 5.5 quests,
journal, bounty board · 5.6 Thaloria's interiors (inn, temple, smithy…) · 5.7 Summit of Despair · 5.8 music per region,
codex, campaigns.
Status: **5.1 Thaloria done** (content/thaloria.js: amo's tile grid → grass / roads / paved square; 616 wall pieces → the city wall with merlons; roof+front-wall clusters → ~50 houses with amo's roof (gable, hip, dome) and wall styles, doors and windows where amo has them; the bell tower, temple dome, manor; garden trees, bushes, flowers, knight statues, street lamps lit at night, market stalls, the fountain; the West Gate to the glade (a new archway on the glade's north rim), the East Gate shut; amo's hearth and alchemy stations; nav grid, map and landmarks). **5.2 residents done** (content/actors/townsfolk.js: amo's 41 residents and schedules.whereAt unchanged — homes, work, evenings at the inn, wanderers, guard patrols; looks by role (guards armoured with spears, priests in robes, nobles in long coats, children smaller…); full models within 24 m, simple figures beyond; named people labelled; they step around the player; 0.7 ms per update). **5.3 dialogue done** (game/dialogue.js: amo DIALOGUES with letter-by-letter text, choices, flags, startQuest hook; G to talk; named people greet then use their after-dialogue (talked_<id> flag), shops greet then open, teachers offer their style; anyone else answers with an amo bark (pickBark by role, hour, weather) in a speech bubble; residents pushed out of 3D walls). **5.4 shops done** (game/shop.js: amo catalogues + filters, gold/glint prices with the map bias, sell at sellPrice in the item's currency, buy back the last ten; shops open only while the merchant works). **5.5 quests done** (game/quests.js: amo questManager on amo's shared playerStats; givers offer after talking (Accept / Not now), progress from kills, gathering, attuning, pickups, cooking and talking, turn-ins, amo rewards; journal on J / touch QST; banners). Bounty board deferred: amo's Thaloria board posts East Road bounties, so it waits for the East Road. Note: side_traders_rumor needs the East Road waystone. **5.6 interiors done** (content/interior.js builds any amo interior MAP: room from its tile grid, ~35 furniture kinds from its pieces, lamps, chests (seeded with amo's items, saved), signs, inner doors (the inn's cellar), the exit back to its door; walls toward the camera sink; townsfolk shown inside by their amo schedule; all 17 Thaloria interiors behind the 16 doors from doors.json). **5.7 Summit of Despair done** (content/regions/summit_of_despair.json from amo's summit map: a trail carved north through rock walls, Widow's Overlook west, the Rime Hollow east, the Frozen Basin with the scout's journal and a monolith, the summit clearing; snow biome weather (falling snow, amo weatherAt); Gloom-Beaks (circle, dive), Frost-Shades (near-invisible), Crag-Fiends (wind-up slam) — content/actors/beast.js on enemyCore; mountain herbs, ice crystals; reached through Thaloria's East Gate for now (the East Road between comes later); north link to the Sylvan Sanctuary shown but closed). Not yet: Malphas (boss), the Summit quests' givers. **5.8 music skipped** (needs the user's tracks). **Teachers done** (amo lessonCheck/takeLesson for the Smith (Crusher) and Sergeant (Guard), spellLessonCheck for the Priest (arcane spells): one lesson a day, dearer each time, working hours only; G picks whichever of a person or a station is closer). **Codex done** (game/codex.js: amo bestiaryEntries from stats.trackKill / seenEnemyTypes, places visited; K / touch CDX). **Phase 5 status:** done except music (5.8, needs tracks), Malphas the boss, the East Road (Trader's waystone, Innkeeper's saddlebags, bounty board, Odyssey's Dawn), campaigns. **East Road done** (content/eastRoad.js from amo's Thalorian Wilds region: forest on its tile grid, the road, the stream, stumps/bushes/flowers/rocks/ruined wall/gargoyles from its pieces; the Old Waystone, the Shepherd's Lean-to and Oren, three journal-page satchels, two campfires, gathering, the East Road Monolith, 22 void-stalkers (beast.js shadow-hounds); Thaloria East Gate → East Road → Summit; Odyssey's Dawn auto-starts in Thaloria and completes (3 stalkers, the monolith, Oren → Iron Spell-Blade); the Trader's waystone and the Innkeeper's pages work). **The Hollow, the bounty board, elites done (2026-11-14)**: the Hollow — amo's east_road_cave behind a cave mouth in a rock outcrop at its doors.json spot, built by interior.js in cave mode (dark rock, boulders heaped along the walls, glowing mushrooms, two seeded chests); Thaloria's bounty board at amo's spot (game/bounty.js on amo bounties.js: three seeded East Road bounties a game day, accept, progress in the journal, turn in at the board); the East Road now has amo's whole roster (22 void-stalkers, 12 root-wraiths, 8 blight-ents, the corrupted sentinel — new bodies in beast.js); amo elites on every beast spawn (eliteCap/rollElite/pickAffixes/eliteStats, gold plate with affixes, swift/warded/vampiric, double loot + rare regional drop) so 'Elite Quarry' can be done; kills carry mapId/isElite to the quest manager; stale nameplates swept each frame. **The mountain done** (user rework v2, content/mountain.js 'the_summit'): the old Summit map is now "Summit of Despair — the Approach"; its north exit leads to the range itself — an east–west ridge (pass ~92 m, higher peaks either side, ridged crags) that walls off the north. One tortuous trail (a spline through irregular control points with a slow sideways wobble; long rising traverses, a bend round the east spur, a run of hairpins, a false summit at 99 m; grade capped at ~0.6, cut into the rock or built out where the ground is steeper; ~720 m long) climbs the south flank, crosses the Summit Pass and winds down the north flank to a river; a single arched stone bridge crosses it to the Sylvan Sanctuary's gate (closed) — the only way through, deep gorges close both ends of the range. The trail is a ledge cut into the cliff: safe stretches behind a low stone parapet, exposed stretches with only stakes (gusts push you toward the drop, warned), plateaus at the turns, two caves (rock roof, ice crystals, Frost-Shades; the camera comes under the roof), a sagging rope bridge over a ravine, six cairns (Base camp, the Shelf of Sighs, the Widow's Ledge, the Summit Pass with its ring of standing stones for Malphas, the Cloudbreak, the Riverwatch) as respawn points. Faces >42° can't be climbed (you slide), falls hurt. **Sylvan Sanctuary done (2026-11-14)** (content/sanctuary.js; amo's map is a stub, so from the campaign spec + book ch. 9–10, lore DB event The Elemental's Trial): the summit's river-bridge gate opens once Malphas has fled; over the pass into an impossible early-spring valley ringed by snow — living-wood arches, nameless flowers, motes, deer, a deep river (region feature 'river') that only the ford crosses; the forest Elemental (wood, water, green light) stands in the ford and asks "Why do you seek the light of day?" — wrong answers get the question again, unchanged; the true one (the book's) and it steps aside; the Hermit's hut of living walls at the heart of the green, the Hermit (bark skin, river eyes) gives the book's lines — the Balrog, the binding, the sight — and teaches Aether Sight (flag aether_sight; the rest of the day passes); quests registered as generated quests on amo's manager: The Elemental's Trial (main), Seeds of the Valley (2 blight-ents + 3 root-wraiths at the greyed Corrupted Rim), The Hermit's Debt (the old camp past the western rim, on a hidden path only Aether Sight shows; reward resonance amulet); the way down toward the Fire Gate (closed). Engine: region terrain snowLine/rockLine, ground tints, river feature; person.r.onTalk for map-owned conversations; station.onUse. DB sync owed (spec G1/G2: The Corrupted Rim, the Hermit's camp). **Malphas done** (content/actors/malphas.js, on the Summit Pass): the Whisperer of Doubt (lore DB: Void General, "carries the winter like an instrument"; Eldrin breaks his illusion-hold; he retreats alive). amo's BossEnemy numbers (350 HP, 20 dmg, strike 1.4 s, shadow burst up close every 4.2 s with knockback; 50% enrage ×1.6 speed ×1.5 dmg; 25% void rain — six telegraphed circles — every 5.5 s and a teleport behind you every 7 s) plus his own: rises from the snow when you reach the pass; at 75% two illusions (no shadow — Aether Sight; their blows drain Vigor; one hit shatters them; no nameplate while they stand); the winter closes in (whiteout fog) as he weakens; a wall of wind keeps you on the pass during the fight; leaving or dying resets him. At 0 he flees into the storm: amo's 'void_general' kill → Whisperer of Doubt completes (auto-started on reaching the mountain), codex, flag malphas_retreated (he never returns). Standing still at level 1 you die in ~11 s — dodge, parry, fireballs. Clouds: the fog thickens with altitude into a cloud band (50–76 m) where you see a few metres; above it the air clears and from the pass you look over a sea of cloud (three drifting cloud layers, which also hide the valleys and the world's edges). Headless walk: foot to river bridge in ~160 s, no stuck spots, falls only from gusts; builds in ~1.3 s. Next options: bounty board + the Hollow, Malphas on the plateau, or Phase 6 multiplayer.
| amo | Kind |
|---|---|
| **Thaloria** (city), Summit of Despair, Whisper-Wood, Iron Hollow… — from the lore DB locations | N |
| TownsfolkManager, schedules.js, crowd.js, barks.js → living towns | R + B |
| **DialogueScene**, dialogues.js, npcs.js | B + R |
| QuestManager, quests.js, questRules.js → **QuestJournalScene** | B + R |
| bounties.js → **BountyBoardScene** | B + R |
| **ShopScene**, economy.js (merchants, prices, gold/glint) | B + R |
| CampaignManager, stories.js → **StorySelectScene**, campaigns | B + R |
| **CodexScene** (bestiary lore, codex echoes, recovered memories) | B + R |
| MusicManager / SoundManager → music per region (the albums), ambience, effects | B + N |

## Phase 6 — Multiplayer
| amo | Kind |
|---|---|
| server/index.js → authoritative server running `@rules` in Node | B + R |
| NetworkManager, RemotePlayer → 3D remote players | B |
| **ServerSelectScene**, **OnlineCharacterScene**, **ChatScene** | B |

Status: **6.1 presence + chat done (2026-11-14)**: apps/amo3d/server/index.js (npm run server, port 3003) on amo's server model — a room per map, moves relayed (position, facing, speed, sprint, hop, cast, strike), each player's Forge look / weapon / level, chat to the room, /status; every message checked and rate-limited. game/net.js: Options → Online (name, server, on/off); others drawn as full 3D characters from their own look, eased between updates, nameplates; chat (Enter / MENU → Chat); "● online · N here". Phone app: mixed content + cleartext allowed for the LAN server — debug builds only; the release build (Phase 7) must reach the server over TLS (wss) instead. tools/fake_player.mjs for tests. **6.2 seeing each other fight done**: strikes, hops and casting poses come through the move state; a cast sends origin + direction (player:act) and the others replay it as a cosmetic fireball (same flight and burst, no damage — no player-vs-player); server hardening: player:update ≤2/s and only when something changed, a repeated join leaves its old room, joins throttled; remote models freed on removal. Next: 6.3 shared enemies (server-run, amo's ENEMY_TYPES), 6.4 online characters / server list.

## Phase 7 — Menus, platforms, polish
| amo | Kind |
|---|---|
| **BootScene** (loading), **CharacterSelectScene** (save slots) — the title screen and main menu came in Phase 1.5 | B |
| **OptionsScene**: graphics (quality presets), audio, controls remapping | B + N |
| **CreditsScene** (now: everything is ours) | B |
| GamepadNav / MenuFocus → every menu usable with a gamepad and touch | B |
| LauncherControls → touch layout per screen (phone) | B |
| PC build (Tauri or Electron), Android release build, performance passes | N |
| Game manual (docs/manual) updated for 3D | B |


Status: **7.1 readability done (2026-11-14)**: one type scale — every UI font is calc(Npx × var(--ui)), sizes raised (nothing under 14 px; body text 15–18), --ui 1 on laptops, 1.15/1.3 on tall screens, 1.1 on phones; the dev title and the speed readout are gone from the HUD (speed with ?perf=1); the keyboard help is a card on H (a hint fades after 25 s), never on touch; the title's logo glides up and shrinks when the menu opens (two columns on short screens), TAP TO BEGIN on touch; world-map names scale with the canvas. **7.2 touch rework done**: compact bars top-left with only the filled hotbar slots under them; MENU (top right, beside the minimap) opens a sheet of big tiles — Satchel, Hero, Map, Journal, Codex, Aetheric Tear; tap the minimap for the world map; FIRE / HIT / HOP under the right thumb, style skills beside them (only the learned ones); push the stick past its ring to sprint (the RUN button is gone); the door/gather prompt is a tappable pill; everything steps aside while a menu or conversation is open. **7.3 options done**: game/options.js (title OPTIONS, touch MENU → Options, O): graphics Low/Medium/High (saves, reloads), text size Normal/Large/Larger (×1/1.15/1.3 on the --ui scale), FPS shown/hidden, music volume (scales the title 15% / in-game 1%), camera turn speed and invert vertical (applied in cam.orbit for every input), the controls for keyboard/gamepad or touch; engine/settings.js remembers them per device. Android: immersive full screen, drawn under the cutout, screen kept on, HUD clear of the cutout. **7.4 save slots done**: three slots on amo's SaveManager (slot 1 keeps the old key, so existing saves are slot 1); title SAVE SLOTS screen (who, level, place, when; Play / New / Delete with a second confirm), CONTINUE names the active slot; a new campaign or hero goes into the active slot if empty, else the first empty one, else the screen asks which to replace. **7.5 gamepad in menus done**: engine/padnav.js — in any open panel (and the title menu) the D-pad / left stick moves a gold focus ring to the nearest button in that direction, A presses (or advances a conversation), B backs out, left/right nudges sliders; the press that opened a panel is ignored; the hotbar, skills, strike and Tear no longer fire while a menu is open. Next: credits, PC + Android release builds, the manual.

## Phase 8 — More customisation in the Forge (user order 2026-11-14: after multiplayer)
More parts, shapes and colours for heroes in forge.html — to plan when Phase 6 is done.

## Phase 9 — The campaign, chapters 6–12 (after the Forge)
One chapter per pass from the campaign spec, the book and the lore DB (amo's maps are stubs): 6 Treachery's Bite (the Fire Gate, Oren's betrayal), 7 The Solitary Path (the Descent), 8 Inferno's Trial (the Inferno Labyrinth), 9 Eldoria's Heartbeat (the Ruins of Eldoria), 10 Heart of War (the Heartstone Chamber, the Ancient Door), 11 The Weight of Eternity, 12 Dawn's Embrace (Eldrin's Tower). The user's music per region as each place is built.

## Not ported (2D-only tooling)
LPC sprite ledger, sprite catalogue pipeline, LPC atlas, tile map generators, mapPaint/mapTexture,
CharacterRenderer/lpcPalettes — replaced by the 3D Forge and the 3D world pipeline.

## How we work
One small slice per pass, playable, tested headless (`tools/headless.mjs`, `__poc.advance`), checked on
the phone (`tools/device_eval.mjs`), committed on branch `3d`.
