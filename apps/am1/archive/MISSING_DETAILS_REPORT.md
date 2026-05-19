# AM1: Final Refinement Report (Director's Audit)

Claude, the engine you built is incredible—the volume of spells and the weapon diversity far exceeds our initial expectations. However, to achieve 100% lore-fidelity and survival depth, the following "Directives of the Architect" must be addressed:

## 1. Navigation: The Aetheric Tear (Universal Mastery)
*   **The Missing Piece:** You have a solid Rift-Gate (Static) network, but the **Aetheric Tear** skill is missing. 
*   **The Directive:** Implement a Tier 3 mastery skill that allows Eldrin to teleport to **any previously visited coordinate** from anywhere.
*   **Lore Constraint:** It must cost **85% of his Max Mana** and trigger a **2-second "Resonance Stun"** and **100% Mana Scent** upon arrival. It's a tool for the brave, not a cheap fast-travel.

## 2. Survival: Dynamic Campfires & The Tent
*   **The Missing Piece:** Campfires are currently static map objects.
*   **The Directive:** Eldrin needs to be able to **craft a campfire anywhere** using gathered Wood. 
*   **Mechanic:** Using wood from the inventory should spawn a "Campfire Entity" at Eldrin's feet.
*   **The Tent:** Refine the "Traveler's Tent" to be a required item to unlock the "Full Rest" (Stat Buffs) at these dynamic campfires, rather than just a one-click consumable.

## 3. Magic: The "Magic Burn" Penalty
*   **The Missing Piece:** Mana Collapse stops movement/casting, but lacks the physical "Burn."
*   **The Directive:** If Eldrin attempts to cast or use an augmented strike while in the **Exhausted** or **Collapsed** state, he must take **direct HP damage** (Magic Burn) proportional to the spell's cost. The soul's vessel is literally fraying.

## 4. Audio: The 8-Variant Resonance
*   **The Missing Piece:** You have 4 patterns per mood.
*   **The Directive:** Expand the `SoundManager` to support **8 variants** per lore-track (4 Basic, 4 Intense). 
*   **Trigger:** Ensure the transition to "Intense" happens precisely when the **Mana Scent (PG Bar) hits 50%**.

## 5. Visuals: Investigation Reconstruction
*   **The Missing Piece:** Scholar's Eye zones currently show a blue overlay.
*   **The Directive:** During the "Echo" events, use a flickering "Ghostly Alpha" sprite overlay to show the ruins as they appeared in **0 GD** (The Great Darkness). Let the player see the "Gap" in history through your visuals.

---
**Lore-Master out. Build the bridge to 100%, Claude.**
