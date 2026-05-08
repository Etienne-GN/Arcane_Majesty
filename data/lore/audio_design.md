# Arcane Majesty: Adaptive Retro-Resonance Audio

This document defines the audio aesthetic and technical implementation of music and sound in the Arcane Majesty game series (AC1).

## 1. The Aesthetic: 16/32-Bit Retro-Resonance
To match the retro-pixel aesthetic of AC1, the soundtrack consists of instrumental covers of the original "Arcane Majesty" albums, rendered in a **Super Nintendo (32-bit)** style.

*   **No Lyrics:** The gameplay music is strictly instrumental to maintain the "Silent Century" atmosphere.
*   **Track Distribution:**
    *   **Generic Areas:** Markets, ordinary forests, and neutral zones use generic retro-RPG themes.
    *   **Lore-Specific Areas:** Zones tied to the album (e.g., Summit of Despair) use 32-bit remakes of the actual album tracks.

---

## 2. The "8-Variant" Resonance System
To emphasize the "Shifting Aether" and the **Mana Scent** system, each lore-specific track has 8 distinct arrangements.

*   **4 Basic Variations:** Different instruments or arrangements of the main theme for standard exploration. Shuffled randomly when a track ends.
*   **4 Intense Variations:** Faster, higher-tempo versions of the basic variations.
*   **Dynamic Transition:** The `MusicManager` switches from a Basic variant to its corresponding Intense variant when the player's **Mana Scent** (Aetheric Scent) exceeds the 50% threshold.

---

## 3. [PENDING] The "Ancient Echo" Mechanic
*Director's Note: Currently under review for aesthetic compatibility.*
The idea of using high-fidelity original snippets as narrative rewards is on hold. We will revisit this once the 32-bit atmosphere is fully established.

---

## 4. Technical Directives for Claude (AC1)

1.  **Audio Engine Logic:**
    *   Implement a `MusicManager` that handles the shuffling of 8-variant sets for lore-specific scenes.
    *   The manager must track the `ManaScent` value to toggle between "Basic" and "Intense" track layers.
    *   Support smooth cross-fading (2-3 seconds) between variations.
2.  **Soundscape:** Environmental sounds (wind, fire, birds) should also be rendered in a 32-bit style to maintain consistency.

---
**Lore-Master Directive:** *Harmony is found in the variation, not the repetition. Let the world sing in eight voices.*
