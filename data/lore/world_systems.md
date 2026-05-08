# Arcane Majesty: World Systems (Refined Progression, Saving, & Navigation)

This document defines the core RPG loop for AC1, combining classic mechanics with specific lore-based constraints.

## 1. Hybrid Progression System
Eldrin’s growth is split between his physical vessel and his scholarly mind.

### **A. Character Leveling (The Vessel)**
*   **XP Source:** Defeating enemies.
*   **Level Up:** Provides Stat Points to distribute into:
    *   **Strength (STR):** Increases physical damage with swords/staves and carry capacity.
    *   **Intelligence (INT):** Increases spell damage and total Mana Pool.
    *   **Stamina (STA):** Increases total Health Points (HP) and physical defense.
    *   **Agility (AGI):** Increases movement speed, attack speed, and parry windows.

### **B. Skill Progression (The Mind - Resonance Insights)**
*   **Insight Source:** Deciphering ancient texts, finding Lore Fragments, and defeating Void Generals.
*   **The Runic Tree:** Used to unlock and upgrade specific **Spells** and **Aether-Augments**. This is independent of your character level.

---

## 2. The Three Tiers of Navigation
Moving through the "Silent Century" evolves as Eldrin’s power grows.

*   **Tier 1: The Scholar’s Trek (Foot):** Early game. Focuses on exploration and the danger of the wilderness.
*   **Tier 2: Rift-Gate Attunement (Static Portals):** Mid-game. Eldrin discovers ancient monuments and attunes them with Aether-Shards to create a permanent fast-travel network between major hubs.
*   **Tier 3: The Aetheric Tear (Universal Mastery):** The ultimate evolution of space-folding. Eldrin earns the ability to "tear" the Aether and step through to **any previously visited coordinate** or known location, bypassing the need for Rift-Gates.
    *   **The Cost:** Consumes 80-90% of the maximum Mana Pool.
    *   **The Danger:** 100% Mana Scent upon arrival. Eldrin arrives in a "Resonance Stun" state for 2 seconds, making him extremely vulnerable to the predators he just alerted. This is a tool for the brave or the desperate.

---

## 3. Saving & Survival: The Hearth System
Safety is a resource that must be managed.

*   **Aetheric Monoliths (Static):** Ancient structures that provide a full heal, permanent save, and world-respawn.
*   **The Wild Camp (Player-Placed):**
    *   **Campfire:** Requires gathered **Wood** (Axe required). Acts as a temporary save point and minor HP/Mana restoration.
    *   **Tent:** Must be purchased from merchants. Combined with a campfire, it allows for a "Full Rest" in the wilderness.

---

## 4. Gathering & Tools
Eldrin must interact with the environment to survive and craft.

*   **Gathering Tools:**
    *   **Iron Axe:** Used for felling trees to get Wood (for campfires and tool repairs).
    *   **Iron Pickaxe:** Used for mining minerals and Aether-Shards from ore veins.
    *   **Manual Gathering:** Herbs, berries, and monster drops are collected by hand.
*   **Focus:** Potions and Food only. No textile or armor crafting (robes and gear are bought or found).

---

## 5. Technical Directives for Claude (AC1)

1.  **Stat Interface:** Implement a classic RPG stat sheet (STR, INT, STA, AGI).
2.  **Tool Dependency:** Resource nodes (Trees, Ores) must check for the presence of the correct tool in the inventory.
3.  **Survival UI:** Implement a crafting sub-menu for "Cooking" (Food) and "Alchemy" (Potions).
4.  **Portal Animation:** The "Aetheric Tear" should have a more violent, unstable visual compared to the static Rift-Gates.

---
**Lore-Master Directive:** *Survival is the first step to wisdom. You cannot read the stars if you are starving on the ground.*
