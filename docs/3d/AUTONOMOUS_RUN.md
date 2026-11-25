# Autonomous run — plan (started 2026-11-25)

Items asked by the user: **1, 2, 3, 5, 6, 7**. Executed top to bottom without stopping. One commit per step on main.
Every step is checked headless (`?play=1`, `__poc`) before its commit. Never touched: the uncommitted v2 face files,
the lore DB (writes), release tags, pushes, deleting releases.

Legend: ✅ done · ▶ in progress · ☐ to do

## 0. Housekeeping
- ✅ Allow rules for edits under apps/amo3d, packages/rules, data/lore, plus read-only commands (fewer prompts)
- ✅ CI: tags build only the APK; desktop builds in `amo3d-desktop.yml`, run by hand; 48 Actions caches deleted
- ☐ Waiting on the user: push the commits; delete old releases (keep the last 10)?

## 1. Level bands, quests, start choice
- ✅ 1.1 Villagers offer their quests (they never did) — e55b4ebd
- ✅ 1.2 Creatures for the empty level 41–50 lands: Inferno biome (Magma-Eater, Cinder-Soul, Ash Crawler, Forge Daemon, Obsidian Golem), Ruins' moor (Grave-Wraith, Cursed Knight, Arcane Sentinel, Blind Stalker). Check: spawn there headless, levels ~41–46
- ✅ 1.3 Quests for levels 31–50 (~8): givers in New Ravenspire (Quartermaster, Map-Maker, Gate-Warden) and Graywatch (Quartermaster); targets: the Great Rift's edge, the Fire Gate's ash lands, the Inferno, the Ruins, the Black Well and Obsidian Citadel in Nythoria. Check: every giver id exists, every kill target spawns where sent, every read_signs target exists
- ✅ 1.4 Outsider start (WORLD_PLAN): an Eldorian hero in Nythoria (or a Nythorian in Eldoria) pays +25% at shops there, regenerates health 25% slower on the other plane, gets the title "Outlander" and +10% XP there. Check: prices and regen differ headless
- ✅ 1.5 WORLD_PLAN step 5 ticked, LORE_REVIEW gets the new game-only names

## 2. Campaign chapters 6–12 (one commit per chapter)
For each: read the book chapter, beat sheet and DB events; replace the `stub_chNN_*` quest with real steps, people and
places in the open world; chain it from the previous chapter; game-only details `origin: "game"` → LORE_REVIEW.
- ✅ 2.6 Treachery's Bite — the Fire Gate, Oren's betrayal
- ✅ 2.7 The Solitary Path — the Descent
- ✅ 2.8 Inferno's Trial — the Inferno Labyrinth
- ✅ 2.9 Eldoria's Heartbeat — the Ruins of Eldoria
- ✅ 2.10 Heart of War — the Heartstone Chamber, the Ancient Door
- ✅ 2.11 The Weight of Eternity
- ✅ 2.12 Dawn's Embrace — Eldrin's Tower
Check per chapter: headless walk of its steps start to finish (flags, quest completes, next chapter offered).

> Item 2 note: chapters 6–12 already existed (2026-11-19). Done instead: a full headless playthrough in the open world; the Balrog fix (181e4cfc); ch. 7 from the book — vow, gate of flame, golems, the Cinder trial (7d832db6, ed1cee7a); ch. 12 the return by the Hermit (9188c117).

## 3. Magic leftovers
- ✅ 3.1 Aim line for bolts; the area ring snaps to the nearest enemy near the aim point
- ✅ 3.2 Aetheric Sight active use (reveal hidden paths, illusions, invisible foes for a duration, mana cost)
- ✅ 3.3 Dual-wand overpower (a wand in each hand: a charged combined bolt)
- ✅ 3.4 Set-pieces for the remaining area spells that have none
Check: each cast headless, no console errors, damage applied.

## 4b. Across the veil (user's idea, approved 2026-11-25)
Lore: the planes share one space at different frequencies (world_lore.md); the veil thins in Whisper-Wood, the Sanguine
Vaults dip toward Nythoria, the Rift bleeds; Malakar struck Acheron across dimensions; the Tear costs 80–90% mana and
arrives with 100% Mana Scent and a 2 s Resonance Stun (data/lore/world_systems.md). Same land on both sides, each
plane its own buildings (twins only where it makes sense, e.g. Ravenspire on the citadel spot). Eldrin may use it too
(his later story, The Prophecy of Darkness, takes him to Nythoria with Seraphina). Cross-plane Tear = game addition →
LORE_REVIEW; recheck against the DB when scarif answers (it timed out 2026-11-25).
- ☐ 4b.1 Mana Scent in 3D: spells raise it by cost, creatures in a scent radius are alerted; HUD mark. The ordinary Tear gets its written cost: 100% scent + 2 s Resonance Stun on arrival
- ☐ 4b.2 Thin places (Whisper-Wood, over the Sanguine Vaults, the Rift's edge + a few game ones): the sight shows a shimmer; standing in one, the other plane's buildings ghost in around you
- ☐ 4b.3 The crossing Tear at a thin place: ALL the mana, once per game day, 100% Mana Scent + stun on arrival — the same spot, the other world
- ☐ 4b.4 One-sided places: first a vault sealed in Nythoria under a bare hillside in Eldoria, entered only by crossing there; one late quest
Check: cross both ways headless; cooldown/cost/scent; arrival inside the vault; no stuck spots.

## 5. Parchment map for every region
- ☐ 5.1 Each stamped place gives the chart its roads, buildings and walls (mapInfo.groundAt / buildings / walls) like Thaloria — region JSONs (Crossroads, Port Silver, Iron Hollow, Duskmeet, Graywatch, Fields village, New Ravenspire…) and the Nythoria towns
Check: world-map screenshot per place.

## 6. New regions from the DB
Missing as places of their own in the open world (survey first with the world-geography skill and tools/world_survey.py):
- ☐ 6.1 The Weeping Stones, the Hidden Cabin (Fields) — fill out if only labels
- ☐ 6.2 Silverrun River's crossing and the Heartlands' country between the Crossroads and the lake
- ☐ 6.3 The Sanguine Vaults (beyond the gatehouse: an interior/dungeon)
- ☐ 6.4 Heartstone Chamber, the Ancient Door (also needed by chapter 10 — may land with 2.10)
Check: survey renders, headless walk, no floating ground, relief kept.

## 7. Upkeep
- ☐ 7.1 Phone perf pass headless (open world <~400k tris / ~350 calls) after all the above; fix the worst offenders
- ☐ 7.2 v2 bodies: triangle trim toward ~1,300 / 1,500 — only on parts not under the user's face work
- ☐ 7.3 The game manual updated for what this run added
- ☐ 7.4 Numbers check: quest rewards vs level bands, creature scaling at 41–50

## For LORE_REVIEW (game-only names added this run — appended at the end of the run)
- Quests: The Edge of the Wound, Cold Shapes on the Heath, What the Divide Keeps, Cinders on the Wind, The Mountain's Hunger, The Vigil That Never Ended, The Light at the Bottom, The Bone Gate
- Chapter scenes (from the book, not new names): the golems' rune figures (lock, knot, foundation); the Hermit's return scene
- Signs: the Legion post on the Great Rift's lip ("THE RIFT. NO CLOSER."), the Obsidian Citadel's bone gate ("ALL SOULS COME HOME.")
- The Black Lake's shore (Nythoria): Underworld spawn round the Black Well; the Outlander (title/status)

## Log
- 2026-11-25 — 0 and item 1 done (e55b4ebd, e624cf3d, 86f4856d, 11d412bf). Item 2 done (playthrough + fixes + book beats). Item 3 done (f9f2c6af aim line + snap, 976f64bd Aether Sight active use (L), cdd113ba dual-wand overpower, set-pieces). Item 4b started.
