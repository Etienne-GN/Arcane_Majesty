# Arcane Majesty: Economy and Spatial Inventory

This document defines the trade, currency, and resource management systems of Eldoria during the Silent Century (~500 AGD).

## 1. The Currency: "Glint"
In a world where magic is a "Scent," physical gold is less valuable than **Glint**—small shards of silver that have been naturally infused with Aurorian Resonance.

*   **Utility:** Glint is used by scholars to stabilize experiments and by commoners as a light source.
*   **Acquisition:** Found in ruins, dropped by high-level Umbral remnants, or earned through trading rare alchemical reagents.

---

## 2. Spatial Inventory: The Satchel System
Inventory is not infinite. It is limited by the physical and magical capacity of Eldrin’s gear.

### **The Scholar's Satchel**
Eldrin’s inventory is **Slot-Based**. Different items take up different amounts of space.

| Satchel Tier | Name | Slot Count | Lore |
| :--- | :--- | :--- | :--- |
| **I** | **Weathered Pouch** | 10 Slots | A basic leather bag from the tower. |
| **II** | **Expanded Haversack** | 20 Slots | Reinforced with Aether-Oak fibers for durability. |
| **III** | **Runic Satchel** | 35 Slots | Engraved with "Weightless" runes to reduce physical strain. |
| **IV** | **The Void-Fold (Relic)** | 60 Slots | A relic that utilizes micro-rifts to store items in a pocket dimension. |

---

## 3. Commerce: "The Silent Trade"
In 500 AGD, large cities are rare. Trade happens at **Resonance Hubs**—protected settlements where the "Scent" of magic is masked by ancient monoliths.

### **Market Types**
1.  **Village Markets:** Found in places like the *Whispering Woods*. Sells basic reagents, Tier I gear, and food.
2.  **Traveling Merchants:** Rare NPCs found on the road. They often carry "Adept" (Tier II) gear and rare alchemical recipes. They are high-risk targets for Shadow Beasts.
3.  **The Archivist’s Guild:** Found in major ruins. The only place to buy "Runic" (Tier III) components and upgrade the Satchel.

---

## 4. Selling & Scarcity
*   **Scarcity:** Merchants have limited Glint. You cannot dump 100 swords on a village baker. 
*   **Reputation:** Selling rare "Relic" items to the wrong person might increase the "Void Aggro" in that region as the "Scent" of the item attracts predators to the town.

---

## 5. Technical Directives for Claude (AC1)

1.  **Inventory Management:** 
    *   Implement a grid-based UI.
    *   Satchel upgrades should be a core progression milestone.
2.  **Shop UI:** 
    *   Dual-pane interface (Player Inventory vs. Merchant Stock).
    *   Implement "Buy-back" functionality.
3.  **Currency HUD:** A permanent "Glint" counter on the screen or within the inventory menu.
4.  **Weight System (Optional):** If Eldrin is over-encumbered, his "Blink-Step" mana cost increases.

---
**Lore-Master Directive:** *Value is subjective. To a starving man, a loaf of bread is worth more than a Relic of the Great Darkness. To the Void, both are merely fuel.*
