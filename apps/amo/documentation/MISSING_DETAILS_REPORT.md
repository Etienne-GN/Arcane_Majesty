# Arcane Majesty (amo): Final Refinement Report (Director's Audit)

Claude, the engine you built is incredible—the volume of spells and the weapon diversity far exceeds our initial expectations. However, to achieve 100% lore-fidelity and survival depth, the following "Directives of the Architect" must be addressed:

> **Audit status (2026-06-03, verified against source):** Of the 5 directives, 4
> are fully implemented and 1 is partial. Only **dynamic campfire placement (#2)**
> remains — every other directive below is done. Per-item status noted in each section.

## 1. Navigation: The Aetheric Tear (Universal Mastery)  — ✅ IMPLEMENTED
*   **The Missing Piece:** You have a solid Rift-Gate (Static) network, but the **Aetheric Tear** skill is missing. 
*   **The Directive:** Implement a Tier 3 mastery skill that allows Eldrin to teleport to **any previously visited coordinate** from anywhere.
*   **Lore Constraint:** It must cost **85% of his Max Mana** and trigger a **2-second "Resonance Stun"** and **100% Mana Scent** upon arrival. It's a tool for the brave, not a cheap fast-travel.
*   **Status:** Done. `AethericTearScene` (map-aim teleport to explored areas) + `_beginAethericTearCast`/`_completeTearCast` in GameScene: 85% max mana (75% with the `aetheric_comprehension` mastery), `manaScent = 100`, and a `resonance_stun` (2000ms on arrival, 3400ms during the cast).

## 2. Survival: Dynamic Campfires & The Tent  — ⚠️ PARTIAL (placement missing)
*   **The Missing Piece:** Campfires are currently static map objects.
*   **The Directive:** Eldrin needs to be able to **craft a campfire anywhere** using gathered Wood. 
*   **Mechanic:** Using wood from the inventory should spawn a "Campfire Entity" at Eldrin's feet.
*   **The Tent:** Refine the "Traveler's Tent" to be a required item to unlock the "Full Rest" (Stat Buffs) at these dynamic campfires, rather than just a one-click consumable.
*   **Status:** Tent + Full Rest **done** (CampfireScene `_fullRest` consumes a `tent`; gated on having one). Static map campfires **done**. **Missing:** dynamic placement — `wood` exists as a gathered item but `wood.onUse` is inert, so you can't spawn a campfire at your feet. This is the only remaining directive item.

## 3. Magic: The "Magic Burn" Penalty  — ✅ IMPLEMENTED
*   **The Missing Piece:** Mana Collapse stops movement/casting, but lacks the physical "Burn."
*   **The Directive:** If Eldrin attempts to cast or use an augmented strike while in the **Exhausted** or **Collapsed** state, he must take **direct HP damage** (Magic Burn) proportional to the spell's cost. The soul's vessel is literally fraying.
*   **Status:** Done. `Player._magicBurn(cost)` deals `max(1, floor(cost*0.5))` HP with red-flash/shake feedback; fired from spell casts (`_spellCheck`) and augmented strikes when `manaExhausted` (which also covers the collapsed state, since collapse ⇒ 0 mana ⇒ exhausted). Utility skills (Blink-Step, Aetheric Sight, Aetheric Tear) currently *block* with a message when exhausted rather than burning — extend if desired.

## 4. Audio: The 8-Variant Resonance  — ✅ IMPLEMENTED
*   **The Missing Piece:** You have 4 patterns per mood.
*   **The Directive:** Expand the `SoundManager` to support **8 variants** per lore-track (4 Basic, 4 Intense). 
*   **Trigger:** Ensure the transition to "Intense" happens precisely when the **Mana Scent (PG Bar) hits 50%**.
*   **Status:** Done (exceeds). `MusicManager` (procedural WebAudio) ships **8 calm + 8 intense** patterns + a boss theme; `updateMood` (called every 500ms from GameScene) flips to intense at `manaScent >= 50`, mood-swapping at the next loop to avoid clicks.

## 5. Visuals: Investigation Reconstruction  — ✅ IMPLEMENTED
*   **The Missing Piece:** Scholar's Eye zones currently show a blue overlay.
*   **The Directive:** During the "Echo" events, use a flickering "Ghostly Alpha" sprite overlay to show the ruins as they appeared in **0 GD** (The Great Darkness). Let the player see the "Gap" in history through your visuals.
*   **Status:** Done. Scholar's Eye echo zones trigger `_spawnGhostRuinEcho(wx, wy)` (the ghostly reconstruction), award a Resonance Insight, and log the discovery to the Codex (`codexEchoes`, surfaced in `CodexScene` → ECHOES). `scholars_vigilance` mastery extends zone range.

---
**Lore-Master out. Build the bridge to 100%, Claude.**
