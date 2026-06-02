# Arcane Majesty (amo): Eldoria's Prophecy — Master Implementation Roadmap

**Status:** Director's Directive for Claude (Coder)
**Objective:** Build a high-fidelity ARPG prototype based on the "Silent Century" (~500 AGD) lore.

---

## 🏗️ Phase 1: Core Engine & Foundations
*Focus: The "Player Shell" and basic movement.*

- [ ] **Character Attribute System:** Implement STR, INT, STA, AGI stats.
- [ ] **Hybrid Progression Engine:** 
    - [x] XP logic for Leveling (Stats: STR, INT, STA, AGI).
    - [ ] Resonance Insight logic for Skill Tree (Spells/Aetheric Tear).
- [ ] **Movement & Interaction:** 
    - [x] 8-directional movement.
    - [ ] Interaction system for NPCs, Investigation Nodes, and **Campfire Placement**.
- [ ] **Inventory System (Slot-Based):** 
    - [x] Satchel tier logic (10 to 60 slots).
    - [x] Slots for Head, Body, Weapon, and 2 Accessories.
    - [ ] **Purchasable Tent** (unlocks full rest at campfires).

---

## ✨ Phase 2: Resonance & Magic (The Soul of the Game)
*Focus: The "Aetheric Scent" and scholarly magic.*

- [x] **Mana Pool Mechanics:**
    - [x] Mana Regeneration vs. Consumption.
    - [x] "Magic Burn" (HP damage at 0 Mana).
- [x] **The "Ping" (Aetheric Scent) System:**
    - [x] Dynamic `ManaScent` variable (0-100%).
    - [x] Aggro radius scaling based on `ManaScent`.
- [ ] **Spell-Casting System:**
    - [x] "Gathering -> Structuring -> Release" logic (Basic/Augmented).
    - [ ] **Universal Mastery (The Aetheric Tear):** 
        - [ ] Logic for teleporting from ANYWHERE to ANYWHERE.
        - [ ] High Mana cost (80-90%) and 2-second "Resonance Stun".

---

## ⚔️ Phase 3: Combat & Equipment
*Focus: Augmentation and tactical swapping.*

- [x] **Weapon Swapping System:** Staff, Spell-Blade, Umbral Dagger, Resonance Bow.
- [ ] **Weapon Diversity Expansion:** 
    - [ ] **Tier III & IV (Relic) Weapons:** Unique visuals and "Lore-Abilities" (e.g., *Vorgos's Fang* with Chain-Lightning).
    - [ ] **Weapon-Specific Styles:** Distinct animation sets and "Weight" for different weapon classes.
- [ ] **Aether-Augmentation Skills:**
    - [x] Blink-Step (Dodge).
    - [x] Mana-Shield (Reactive Barrier).
    - [x] Aetheric Sight (Time-Slow).
- [x] **Weapon Logic:** Mana-dependency for physical strikes (Augmentation with INT/AGI scaling).

---

## 🌿 Phase 4: World, Survival & Economy
*Focus: Exploration and resource management.*

- [ ] **Gathering & Tools:**
    - [x] Tool check logic (Iron Axe for Wood, Pickaxe for Minerals).
    - [x] Interaction nodes for Herbs and Monster Drops.
- [ ] **The Hearth System:**
    - [x] Aetheric Monoliths (Static Save/Heal).
    - [ ] **Dynamic Campfire Placement:** Craft anywhere using Wood; light with fire magic.
    - [ ] **The Tent Mechanic:** Purchased item; unlocks 'Full Rest' (stat buffs) at campfires.
- [x] **Alchemy & Cooking:**
    - [x] Portable Alembic UI for Potions.
    - [x] Campfire UI for Cooking/Buffs.
- [x] **Glint Economy:**
    - [x] Shop UI (Buy/Sell/Buy-back).
    - [x] Glint drop logic from enemies/ruins.

---

## 📜 Phase 8: Quest & Chronicle Management
*Focus: Narrative progression and the "Gap" in history.*

- [ ] **Quest Tracking System:**
    - [ ] UI Journal for Active/Completed quests.
    - [ ] Multi-stage quest logic (Speak -> Fetch/Kill -> Speak).
    - [ ] Refer to `apps/amo/documentation/CAMPAIGN_SCRIPTURE.md` (Strict Lore Edition) for all quest data and dialogue anchors.
- [ ] **Lore-Driven Quests:** Quests that reward "Resonance Insights" and reveal fragments of Era I/II lore.
- [ ] **The Archive of Souls:** Integration with the Quest Journal to store "Recovered Memories."

---

## 👾 Phase 5: Bestiary & AI
*Focus: Reactive and regional enemies.*

- [ ] **Regional AI Spawning:**
    - [ ] Whispering Woods (Shadow-Touched wildlife).
    - [ ] Summit of Despair (Environmental hazards + Void-Stalkers).
    - [ ] Inferno Labyrinth (Elemental corruption).
- [ ] **The "Ping" AI Logic:** Enemies investigating or aggroing based on `ManaScent`.
- [ ] **Void General Boss Logic:** Multi-phase fights with lore-based dialogue.

---

## 🗺️ Phase 6: Navigation & World Map
*Focus: The Rift-Gate Network.*

- [ ] **Static Rift-Gates:** Fast travel between attuned hubs.
- [ ] **Universal Mastery (The Aetheric Tear):** 
    - [ ] Anywhere-to-anywhere teleport.
    - [ ] 90% Mana cost and "Resonance Stun" (2 sec).
- [ ] **World Map UI:** 16-bit overlay showing discovered nodes.

---

## 🎶 Phase 7: Audio & Narrative Polish
*Focus: Retro-Resonance immersion.*

- [ ] **MusicManager:** 
    - [ ] 8-variant shuffle (4 Basic, 4 Intense).
    - [ ] Mana-Scent threshold transitions (at 50%).
- [ ] **The Scholar's Eye:**
    - [ ] Ghostly reconstruction visuals for ruins.
    - [ ] Master Journal (Codex) implementation.
- [ ] **Ancient Echo Triggers:** (Pending discussion) Support for high-fidelity audio snippets.

---

## ✅ Final Validation Checklist for Claude
*Before submitting a task, ensure:*
1. [ ] Does the mana usage match `magic_system.md`?
2. [ ] Does the equipment conductivity match `equipment_tiers.md`?
3. [ ] Are enemies reacting to the "Scent" per `bestiary.md`?
4. [ ] Does the XP/Insight split match `world_systems.md`?
5. [ ] Is the dialogue tone consistent with the "Silent Century"?

---
**Lore-Master Directive:** *A world is built one rune at a time. Start with the self (Eldrin), then build the stars.*
