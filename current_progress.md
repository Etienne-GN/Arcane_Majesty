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
- **Vorgos's Grand Design:** The Stormbringer is revealed as the Architect of the entire timeline, setting up Anya (0 GD), Kael (~300 AGD), and Eldrin (~500 AGD) as pieces to prevent the collapse in ~900 AGD.

- **Systematic Lyrics Rework (Phase 5) — ✅ COMPLETE:**
    - **All 8 Albums Processed:** 
      - *Crimson Covenant* (~500 to 100 BGD — Era I Vampiric Origins) ✅
      - *Vows of Silence* (~100 to 0 BGD — Era I Malakar & Shadow Civil War) ✅
      - *A Tapestry of Souls* (0 GD — Era II Great Darkness Threshold) ✅
      - *Queen of Carnage* (~150 to 300 AGD — Era III Shadow Sovereign) ✅
      - *Lord of Shadows* (~150 to 300 AGD — Era III Sister Album / Exiled Sorcerer) ✅
      - *Beyond the Veil Twilight* (~300 AGD — Kael's Living Lock Reclamation) ✅
      - *Bound by Blood* (~300 to 400 AGD — The Sanctuary of Two) ✅
      - *Eldoria's Prophecy* (~500 AGD — Era III Epoch of Silence) ✅
    - **Next Phase:** Master Knowledge Graph / Neo4j Migration on scarif.lan.
- **Cross-Album Vocabulary & Lyrics Audit — ✅ COMPLETE:**
    - All 8 albums audited for phrase duplication, cliché tropes, and structural errors.
    - All duplicate non-chorus verses across all 8 albums identified and replaced with unique, meter-matched lyrics.
    - Zero structural verse duplications remaining in the codebase.

## 4. Album Restructuring (Linear Alignment)
To maintain strict chronological consistency, the original **Lord of Shadows** album has been split:
- **Vows of Silence (Era I):** A new prequel album focused on Malakar’s origins, his discovery of the Forbidden Tome, and his rise as the "Void Disciple."
- **Lord of Shadows (Era III):** Repurposed as the "Sister Album" to *Queen of Carnage*. Focuses on Malakar’s downfall, his defeat by Seraphina, and his exile to the Shadow Realm.
