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
Status: **3.1 done** (content/models/character.js builds any look definition — build, skin, eyes, hair, facial hair, outfit colours; Eldrin is content/cast/eldrin.json). **3.2a done** (parts library — hair: tousled, short, long, ponytail, braids, bald; facial hair: none, stubble, beard, moustache, goatee — content/models/parts/hair.js). Next: 3.2b outfits (robe / coat / tunic / armour shapes, hoods, capes) and body builds, 3.3 the Forge page **done** (forge.html: turntable, identity, body, hair, facial hair, outfit colours, pose and weapon preview, randomize, save to src/content/cast via the dev server, export JSON; THE FORGE in the title menu). Next: 3.2b outfit shapes and body builds into the Forge, then 3.4 the in-game creator.
| amo | Kind |
|---|---|
| LPC Forge v2 → **3D Forge**: our own parts library (bodies, faces, hair, outfits, armor per slot, weapons), palettes, save as JSON | N |
| **CharacterCreatorScene**, characters.js, cast data → create Eldrin and others in 3D | B + R |
| Equipment shows on the body (armor/outfit per equipment slot) | N |
| townsfolkLooks.js → townsfolk built from the parts library | B |

## Phase 4 — World pipeline
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

## Not ported (2D-only tooling)
LPC sprite ledger, sprite catalogue pipeline, LPC atlas, tile map generators, mapPaint/mapTexture,
CharacterRenderer/lpcPalettes — replaced by the 3D Forge and the 3D world pipeline.

## How we work
One small slice per pass, playable, tested headless (`tools/headless.mjs`, `__poc.advance`), checked on
the phone (`tools/device_eval.mjs`), committed on branch `3d`.
