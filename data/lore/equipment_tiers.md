# Arcane Majesty: Aetheric Gear & Tier System

This document outlines the robust equipment system for the Arcane Majesty universe, providing a deep, Final Fantasy-style progression that accommodates mages (Eldrin) and future warriors (Kael).

## 1. The Core Stat: Resonance Conductivity
In this system, gear doesn't just provide "Defense." It manages the soul's connection to the Aether.

*   **Physical Armor (Plates/Mail):** High defense, but "muffles" the Aether. Increases Mana Costs for spells.
*   **Magical Robes (Conductive Silk):** Low defense, but enhances Aether flow. Increases Mana Regeneration and reduces "Scent" (lower Ping).

---

## 2. Equipment Slots
*   **Weapon:** Staff, Sword, Dagger, Bow, etc.
*   **Head:** Hats, Cowls, Circlets, Helmets.
*   **Body:** Robes, Tunics, Breastplates, Heavy Armor.
*   **Accessory 1 & 2:** Rings, Amulets, Soul-Gems (Focus on specific stat boosts like Mana Pool or Blink-Step distance).

---

## 3. Tier Progression

| Tier | Name | Rarity | Description |
| :--- | :--- | :--- | :--- |
| **I** | **Novice / Iron** | Common | Basic scholarly gear. Standard iron or wood. No special properties. |
| **II** | **Adept / Steel** | Uncommon | Refined materials. Staffs are made of Aether-Oak; Blades are tempered with Silver. |
| **III** | **Master / Runic** | Rare | Gear engraved with ancient runes. Provides passive bonuses (e.g., +10% Fire Damage). |
| **IV** | **Relic / Ancient** | Epic | Items from the era of the Great Darkness. Lore-significant (e.g., "The Eye of Vorgos"). |

---

## 4. Itemization for Eldrin (AC1)

### **Weapon Progression (Staff Example)**
1.  **Novice Staff:** Oak wood. Basic focus.
2.  **Adept's Spire:** Integrated with a small crystal. Faster structuring.
3.  **Runic Arcanist Staff:** Engraved with "Flow" runes. Halves the "Ping" sensitivity.
4.  **The Stormbringer’s Reach (Relic):** A staff made of petrified Aether-lightning. Allows for limited "Chantless" High-Tier spells.

### **Body Gear Examples**
*   **Scholar’s Tunic (Tier I):** Standard clothing. 
*   **Violet Silk Robes (Tier II):** Enhances Mana Regen.
*   **Armor of the Silent Watcher (Tier III):** A mix of leather and runic plates. Good defense without sacrificing too much mana efficiency.

---

## 5. Acquisition & Upgrading
*   **Foundry of the Ancients:** A mechanic where Eldrin can use "Aether-Shards" (dropped by Umbral Remnants) to upgrade a Tier II item into a Tier III item.
*   **Lore Caches:** Relic items are never bought; they are hidden in the most dangerous parts of the map (e.g., behind a Void General).

---

## 6. Technical Directives for Claude (AC1)

1.  **Inventory UI:** Implement a grid-based or list-based inventory with slots for Head, Body, Weapon, and 2 Accessories.
2.  **Stat Tooltips:** Items must show "Physical Defense" vs. "Resonance Efficiency" (Mana Cost modifier).
3.  **Visual Swapping:** Changing equipment should reflect on the character sprite (if using modular sprites) or at least change the "Aura" color of Eldrin.
4.  **Future-Proofing:** Ensure the system handles "Heavy Armor" logic, even if Eldrin rarely uses it, so Kael can plug into the same system later.

---
**Lore-Master Directive:** *Choose your skin wisely. A heavy shield may stop a blade, but it will also deafen you to the music of the world.*
