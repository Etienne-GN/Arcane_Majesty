# The Rework Approach: Narrative Songwriting for Suno

The **Rework Approach** is a specialized method for converting atmospheric "vibe-based" lyrics into narrative-driven stories without losing the musicality or rhythmic compatibility for AI generation tools like Suno.

## Core Principles

### 1. Structural Integrity (CRITICAL)
- **Constraint:** NEVER remove a verse, pre-chorus, bridge, or outro. The new version must have the exact same number of structural elements as the original.
- **Goal:** Ensure Suno can generate a remake that matches the original track's length and arrangement perfectly.

### 2. Preservation of Variations
- **Constraint:** If repeating sections (like Pre-Choruses or Choruses) have subtle differences in the original text, these variations must be preserved or adapted narratively in the rework. 
- **Goal:** Maintain the unique lyrical phrasing of each specific instance in the song.

### 3. Rhythmic & Syllabic Preservation
- **Constraint:** New lyrics **MUST** match the syllable count and rhythmic meter of the original lyrics perfectly.
- **Goal:** Ensure the song can be "covered" by Suno without breaking the vocal phrasing or timing established in previous versions.

---

## The Surgical Lyrics Rework Protocol
*Established March 2026 for the Systematic Rework Phase*

This protocol ensures that narrative alignment is achieved with the absolute minimum number of changes, prioritizing the preservation of the original song's musical "feel."

### Step 1: The Alignment Self-Audit
Before proposing any changes, the AI must compare the **Original Lyrics** (from `raw_albums/`) against the **Refined Song Plot**.
*   **Question to ask:** "Do the original lyrics already convey the key story points of this plot?"
*   **Action:** If the alignment is already high (90%+), suggest keeping the original lyrics as they are to protect the musical integrity.

### Step 2: Minimalist Narrative Anchoring
If the plot requires a specific lore anchor (e.g., a character name, location, or artifact) that is missing from the original lyrics:
*   **Rule of 1-2 Words:** Change as little as possible. Prioritize swapping generic words for lore-specific ones.
*   **Syllabic Integrity:** The new word(s) **MUST** match the syllable count of the original word(s) perfectly.
*   **Preserve the Start:** Unless the plot demands it, leave the first verse alone to maintain the song’s initial musical "vibe."
*   **The "Outro Reveal":** Prefer the Outro for introducing character names or final plot twists, as it provides a narrative "payoff" without disrupting the early rhythm.

### Step 3: Vocabulary & "AI-Trope" Scrubbing
*   **Scrutinize Filler:** Look for generic rhymes (e.g., "shadows in the night," "symphony of light," "echoes of time").
*   **Refine Phrasing:** Replace these fillers with specific, evocative, and lore-consistent language that fits the song's tone (e.g., replacing "night so shallow" with "Gap in history").

### Step 4: Explicit User Approval
*   **Transparency:** Present the original lyrics, the proposed change, and the **Syllable Count Verification** for each edit.
*   **Wait for Confirmation:** No database updates or compendium rebuilds until the user gives the green light.

---

## Implementation Workflow
1. **Identify the Plot:** Extract the specific `<Plot>` from the master XML.
2. **Assign a Speaker:** Determine whose perspective best tells this part of the story.
3. **Execute Self-Audit:** Check if the original lyrics already fit the plot.
4. **Surgical Rework:** Apply minimal anchors/refinements while strictly respecting the original syllable count.
5. **Final Review:** Ensure the "Suno Persona" matches the intended tone (e.g., "Vengeful," "Melancholic," "Epic").
