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
| **Album music on the title screen, wired in Phase 1.5 itself** (not waiting for Phase 5): a minimal music player for one track — ask the user which album track opens the game | N |

## Phase 2 — Camp & craft (moved up: it makes the glade a place to live in)
| amo | Kind |
|---|---|
| Gathering (gathering.js): herbs, wood, stone, feathers, deadwood sticks — nodes in the world | R + N |
| **CampfireScene**: cooking, resting, food buffs (addTempMaxHealth) | B + R |
| **CraftingScene** + stations.js: workbench, alchemy, forge; craftingRecipes, recipeScrolls, upgrades | B + R |
| **ChestScene**: storage chests | B + R |
| Item tooltips, use/consume, potions | B + R |

## Phase 3 — The 3D Forge (characters)
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
