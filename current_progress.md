# Arcane Majesty: Current Progress

This document tracks the current state of the project and serves as a quick-reference for progression.

## 1. Completed Milestones
- **Infrastructure:** Neo4j Production Server (`scarif.lan`) established with core schema and constraints.
- **Cosmic Balance:** Tri-Planar Axis (Auroria, Eldoria, Nythoria) and Soul-Cycle mechanics documented in `world_lore.md`.
- **Primary Era Finalized:** **0 GD (The Great Darkness)**.
- **Narrative Continuity:** All 8 current albums have their song plots refined for strict linear consistency.
- **AM1 Architecture (The Eldoria Blueprint):** 
    - **Scenario:** Full level-by-level mapping of *Eldoria's Prophecy* (apps/am1/SCENARIO.md).
    - **Magic System:** "Resonance & Aether" with Mana Pools and "Scent" mechanics (data/lore/magic_system.md).
    - **Combat System:** "Aether-Augmentation" for physical weapons (data/lore/combat_system.md).
    - **Bestiary:** 15+ Biome-specific enemies and 3 Void Generals (data/lore/bestiary.md).
    - **Economy & Inventory:** Glint currency and Slot-based Satchel system (data/lore/economy_and_inventory.md).
    - **Alchemy & Healing:** Restoration through stabilization and potion-crafting (data/lore/alchemy_and_healing.md).
- **Master Knowledge Graph:** Full album metadata (titles, plots, timelines) synchronized with the Neo4j database.

## 2. Established Lore Constants
- **Acheron:** Established as a Fallen Aurorian Seer and the "First Vampire."
- **Threshold Assassination:** Malakar confirmed as the one who destroyed Acheron's physical body.
- **Vorgos:** Identified as the Universal Sentinel of the Aether.
- **Naming Symmetry:** Perfected (Auroria/Aurorians vs. Nythoria/Nythorians).
- **The Living Lock:** Kael confirmed as the vessel of the Aurorian Spark, hiding in the Emerald Fields.
- **Vorgos's Grand Design:** The Stormbringer is revealed as the Architect of the entire timeline, setting up Anya (0 GD), Kael (~600 AGD), and Eldrin (~500 AGD) as pieces to prevent the collapse in ~900 AGD.

- **Systematic Lyrics Rework (Phase 5) — ✅ COMPLETE:**
    - **All 8 Albums Processed:** 
      - *Crimson Covenant* (~500 to 100 BGD — Era I Vampiric Origins) ✅
      - *Vows of Silence* (~100 to 0 BGD — Era I Malakar & Shadow Civil War) ✅
      - *A Tapestry of Souls* (0 GD — Era II Great Darkness Threshold) ✅
      - *Queen of Carnage* (~150 to 300 AGD — Era III Shadow Sovereign) ✅
      - *Lord of Shadows* (~150 to 300 AGD — Era III Sister Album / Exiled Sorcerer) ✅
      - *Beyond the Veil of Twilight* (~600 AGD — Kael's Living Lock Reclamation) ✅
      - *Bound by Blood* (~600 to 700 AGD — The Sanctuary of Two) ✅
      - *Eldoria's Prophecy* (~500 AGD — Era III Epoch of Silence) ✅
    - **Next Phase:** Master Knowledge Graph / Neo4j Migration on scarif.lan.
- **Album Production & Review (Phase 6) — IN PROGRESS:**
    - Standardized process documented in `data/lore/xmls/album_production_process.md` — now includes Suno style-tag method (house base + 2-3 song tags), bracketed lyric style cues, and generation sliders (Weirdness 30% / Style 75% / Voice 25%; covers use custom values).
    - *Eldoria's Prophecy* (~500 AGD) ✅ **DONE** — final audio production complete; final post-production (listened, glitches/quirk fixes done); links shared with select reviewers.
    - *Crimson Covenant* (~500 to 100 BGD — Era I Vampiric Origins) ✅ **DONE** — final audio production complete (13/13 songs); post-production done (pronunciation QA + full listening pass, 4 songs regenerated); links shared with select reviewers. Official phonetic spellings (Step 1b): Ah-keh-ron, Nee-tho-ree-ah, Nee-kto-ros.
    - *A Tapestry of Souls: The Awakening* (~0 GD — Trilogy Part I) ✅ **DONE** — final audio production complete.
    - *A Tapestry of Souls: The Paradox of Light* (~0 GD — Trilogy Part II) ✅ **DONE** — final audio production complete (11/11). During production: #7 renamed **The Stronghold → The Keep of Hope**; #10 **Stormbringer** refactored to **Vorgos's POV** (keeps the original "I am the stormbringer" chorus without claiming Anya takes the title).
    - *A Tapestry of Souls: Dawn of Ravenspire* (~0 GD → the dawn — Trilogy Part III) ✅ **DONE** — final audio production complete (10/10). During production: #9 **Across the Rift** made a grand-piano/classical-guitar ballad (anti-ooh/ahh treatment); #10 renamed **The Vow → Reborn** — **CANON FIX**: the original AlbumPlot/lyrics had Seraphina vow to "one day free Anya," which is false (she is never rescued; Eldrin's later Heartstone quest only stabilizes the failing Lock). Her real vow is to guard the world in Anya's place, hardening into the Queen of Carnage in Era III. Produced as **progressive folk metal**.
    - *Queen of Carnage* (~150 to 300 AGD — Era III Shadow Sovereign) ✅ **DONE** — final audio production complete (11/11). Retroactive ACC ran during production (canon PASS all songs; fixed cross-song/intra-song repetition across all 11 `<Lyrics>` blocks). Closer **The Eternal Queen** kept its original lyrics; only the triple-repeating outro was de-duplicated to a single pass + `[End]`. Anti-ooh/ahh lesson locked into process doc: epic/triumphant/soaring style tags trigger Suno vocalizing — the fix is switching genre (e.g. progressive folk metal), not the Exclude field.
    - *Lord of Shadows* (~150 to 300 AGD — Era III Sister Album / Exiled Sorcerer) ✅ **ACC PASS (ran 2026-09-08, before production)** — `acc/Lord_of_Shadows_checkup.md`. Canon PASS all 12 songs; fixed: stale `<analysis>` on The Hollow Crown → Malakar POV; de-Vespered The Queen's Deception (3 lines, no DB node — book `Crimson Covenant` already has a different vampire Vesper); 6 cross-song template overlaps rewritten; Hidden Insurrection + Survival in the Shadows outros de-duplicated. Verified (`verify_album.py` PASS, XML parses). Graph sync: `LYRICAL_POV` Malakar ×5 (songs 1,2,3,9,10) + `OCCURRED_IN` ×3 (The Fall of Nythoria, Malakar's Exile to the Shadow Realm, Formation of the Shadow Council). **Production started — 1/12 done (track 12):** closer reworked from *Prelude to Vengeance* → **The Lord of Shadows** (dark/aggressive title anthem, NOT epic — anti-ooh/ahh), title-hook chorus kept ("The Lord of Shadows rises"), closed with spoken vow "I was, I am, and I will always be... The Lord of Shadows." Suno-validated; synced to master XML (`[Spoken]` + `[End]`) + DB rename done.
    - **✅ 0 GD TRILOGY COMPLETE** — *The Awakening* + *The Paradox of Light* + *Dawn of Ravenspire* all audio-production done.
    - Remaining albums pending after the 0 GD Trilogy: Vows of Silence, Lord of Shadows (ACC PASS, awaiting audio production), Beyond the Veil of Twilight, Bound by Blood.
    - **Parked note — Beyond the Veil of Twilight remake:** Acheron's endgame must be made explicit on-album. He does NOT want Nyktoros free (he discarded the Forbidden Tome ~100 BGD precisely because Nyktoros would consume his lineage — self-preservation, not altruism). In Era III his true play is **The Cosmic Harvest** (`world_lore.md` §6 + "The Recombination" prophecy): trick Kael — the Spark's key — into shattering Anya's wall to crack the Lock and siphon the *sealed* Nyktoros's Void power into himself for transcendence. Killing Anya = breaking the lock to get at the contained battery, NOT unleashing Nyktoros. Current surface plot reads as self-defeating without this context (ACC finding — fix during the remake).
- **Lore & Story Review (restarting, album by album):** Full lore/story review of all 8 albums restarted one album at a time — foundation consolidation before any future book work.
- **Cross-Album Vocabulary & Lyrics Audit — ✅ COMPLETE:**
    - All 8 albums audited for phrase duplication, cliché tropes, and structural errors.
    - All duplicate non-chorus verses across all 8 albums identified and replaced with unique, meter-matched lyrics.
    - Zero structural verse duplications remaining in the codebase.

## 5. Novel Adaptations & Game Design Progress
- **Eldoria's Prophecy Novel:** First complete draft (~89k words, prologue + 23 chapters + interludes + epilogue), audited and polished.
- **Crimson Covenant Novel:** First complete draft (~108k words, prologue + 13 chapters + 3 interludes + epilogue), complete in English (`CRIMSON_COVENANT_FULL.md`) and French (`CRIMSON_COVENANT_FR_FULL.md`), with full canon files (`characters.md`, `events.md`, `locations.md`, `magic.md`, `fidelity-log.md`) and outline.
- **Game Design Documents:**
  - *A Tapestry of Souls: The Awakening* game design doc created (`apps/amo/documentation/GAME_DESIGN_TAPESTRY_AWAKENING.md`).
  - *Crimson Covenant* game design doc created (`apps/amo/documentation/GAME_DESIGN_CRIMSON_COVENANT.md`, 13 missions).
  - Campaign scripture and scenario docs updated (`CAMPAIGN_SCRIPTURE.md`, `SCENARIO.md`).
