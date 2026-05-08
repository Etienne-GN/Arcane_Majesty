# Arcane Majesty: Resonance Combat & Equipment System

This document defines how Eldrin Nightshade engages in combat, balancing his primary identity as a scholar-mage with the necessity of physical weaponry in the "Silent Century."

## 1. The "Mage-First" Philosophy (MT Inspiration)
Eldrin is not a warrior. Without magic, his physical strikes are weak and his defense is low. However, like Rudeus Greyrat, he uses magic to **augment** his physical capabilities.

*   **Aether-Augmentation:** Eldrin can expend Mana to temporarily boost his speed, strength, or reflexes. This is the only way he can compete with the high-speed "Void-Squires" or "Generals."
*   **The Multi-Tool Approach:** Eldrin swaps equipment not for "more damage," but for "different resonance."

---

## 2. Equipment Categories

### **A. The Scholar’s Staff (Primary / Focus)**
*   **Role:** Magic Amplification.
*   **Gameplay:** Increases Mana Regeneration and reduces "Structuring" time (faster casting).
*   **Physical:** Low damage, slow blunt strikes. Used primarily to push enemies away to create distance for casting.

### **B. The Spell-Blade (Sword)**
*   **Role:** Defensive Combat & Close Quarters.
*   **Gameplay:** Allows for "Parrying" physical attacks. Eldrin can imbue the blade with an element (e.g., Fire/Ice) for a single strike.
*   **Lore:** He isn't a master swordsman; he uses magic to "guide" the blade's path.

### **C. The Umbral Dagger**
*   **Role:** Stealth & "Silent" Takedowns.
*   **Gameplay:** High critical damage if the enemy hasn't detected Eldrin's resonance.
*   **Lore:** Used for "surgical" strikes against Aether-Leeches or distracted Shadow-Touched creatures.

### **D. The Resonance Bow (Aetheric Bow)**
*   **Role:** Long-range sniping.
*   **Gameplay:** Instead of physical arrows, it fires "Aether-Bolts."
*   **Cost:** High Mana cost per shot.
*   **Benefit:** Zero "Scent" (low noise). It doesn't trigger the "Ping" system as easily as a fireball.

---

## 3. Physical Skills (Aether-Augmentation)
Following the "Hard Magic" rules, these are physical moves fueled by the Mana Pool:

*   **Blink-Step:** A short-range magical dash (replaces the standard dodge).
*   **Mana-Shield:** A reactive barrier that consumes Mana instead of HP when hit.
*   **Aetheric Sight:** Slows down time (Reflex Augmentation) to allow Eldrin to dodge high-speed projectiles from Void-Archers.

---

4.  **Combat Flow: "The Scholar's Rhythm"**
1.  **Analyze:** Use Aether-Sight to identify enemy `AetherSensitivity`.
2.  **Distance:** Use the Staff or Bow to soften targets or set traps.
3.  **Engagement:** If closed in, swap to the Spell-Blade to parry, then Blink-Step away.
4.  **The Finisher:** High-level structured spells (e.g., "Inferno's Trial") require a "Casting Window" where Eldrin is vulnerable.

## 5. Gear Tiers & Tactical Choice
The equipment system (detailed in `data/lore/equipment_tiers.md`) directly impacts the Rhythm:
*   **High Tier Robes:** Allow for a "Caster-Heavy" playstyle with near-infinite mana.
*   **Heavy Armor (Future Characters):** Allows for a "Brawler" style that ignores minor hits but relies on physical stamina more than magic.
*   **Relic Synergy:** Equipping a full set of Runic or Relic gear unlocks "Set Resonance" (e.g., permanent Aether-Sight).

## 6. Technical Directives for Claude (AC1)

1.  **Weapon Swapping:** Implement a hot-key system for Staff/Sword/Dagger/Bow.
2.  **Mana-Physical Dependency:** Physical attacks with the Sword/Bow should draw small amounts of Mana to represent the "Augmentation."
3.  **Animation/Vibe:** Eldrin’s movements should look calculated and precise, not aggressive or "brutish." He fights like a man who knows exactly how much energy is required to win.
4.  **Scaling:** Eldrin’s physical damage stays relatively flat, but his **Mana-Scaling** for skills increases as he finds "Runic Focus" items.

---
**Lore-Master Directive:** *A sword is just a rod for a different kind of lightning. Do not confuse the tool with the power.*
