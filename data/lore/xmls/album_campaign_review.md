# Album → Campaign Review (ACR)

The repeatable process that turns a **production-ready album** into the shared
source for its **novel** and its **game campaign**. Where `album_production_process.md`
produces lyrics and `album_canon_checkup.md` (ACC) verifies canon integrity, the
ACR **expands** the album's big-line plots into concrete story beats and designs
the gameplay that makes those beats playable — so a campaign is never "travel only."

Run the ACR for **every album**, one at a time, after the album is production-ready
and after its ACC has been run. The first album processed (Eldoria's Prophecy) is
the template.

## Deliverables

1. `data/lore/campaigns/<Album>_campaign.md` — the **Campaign Bible** (see Template).
2. DB sync: every character/location/event the album or book introduces exists in
   Neo4j with `origin` set and correct relationships (ACC §D).
3. Album XML `<Plot>` expanded to the story beats (only with explicit user approval —
   CLAUDE.md canon rule: never edit album XMLs without approval).

## Prerequisites

- Neo4j graph reachable (schema in `CLAUDE.md`). If down, mark DB-sync BLOCKED.
- Album master XML: `data/lore/xmls/processed_albums/<Album>.xml`.
- Book canon (if a book exists): `books/<title>/canon/*.md` + `fidelity-log.md`.
- Locked lore: `world_lore.md`, `data/lore/magic_system.md`, `data/lore/combat_system.md`,
  `data/lore/bestiary.md`, `data/lore/world_systems.md`.
- Game systems reference: `apps/amo/src/data/` (maps, quests, stories, characters,
  items, spells) + `data/lore/*.md` design docs.

## Checklist

### Step 1 — Fidelity audit (songs ↔ album plot)

- [ ] Pull the `AlbumPlot`, each `Act`, and every `Song` `<Plot>` from the album XML.
- [ ] One line per song: "what happens" vs. the album's narrative arc. Flag any
      skipped beats (plot gaps) or invented events (not supported by the album plot).
- [ ] If a book exists, cross-map songs ↔ chapters (`fidelity-log.md`) and record
      where the book expands a song plot.

### Step 2 — Canon grounding (album + book ↔ DB)

- [ ] Every named character, location, artifact, event, organization, race in the
      song plots and the book canon exists in Neo4j with `origin` set.
- [ ] Missing → **add** the node with `origin: "album"` (or `"game"` for game-only
      content). Never leave a canon character/location dangling.
- [ ] Record any DB gaps found (G-list in the bible) and close them in the sync step.

### Step 3 — Plot expansion (song plot → story beat)

- [ ] Expand each song's 1–2 sentence plot into a full beat: situation, inciting
      event, rising action, conflict, resolution, emotional beat, and **bridge into
      the next song**.
- [ ] Source of truth for the expansion:
  - Book exists → the book draft events drive the beats (book is canon on conflict).
  - No book yet → expand from the album plot + locked lore; flag beats that may need
    a book to resolve.
- [ ] Travel-only songs get **real events** here — an obstacle, a choice, a reveal,
      an encounter, a loss. This is where a campaign stops being boring.

### Step 4 — Game-ification (beat → gameplay)

- [ ] Per beat, define:
  - **Map/area** — canon name, tile-style, existing map or new.
  - **Enemies** — from `bestiary.md`; name + behavior + why it fits canon.
  - **Boss** — name + **mechanic** (how the player fights it, respecting canon:
        e.g. an un-killable enemy is an endurance/humility encounter, not a HP bar).
  - **NPCs** — name, role, quests given.
  - **Quests** — main-quest step + optional side quests (local names).
  - **Items / unlocks** — key items, gear, skills/spells earned.
  - **Set-piece / mechanic** — the environmental or systemic hook (puzzle, hazard,
        attunement, stealth, survival, ritual).
  - **Gameplay moment** — the single fun/unique thing the player remembers.
- [ ] Every beat is playable; no beat is "walk here, watch a cutscene." Cinematics
      are compressed to a short intro/outro around real gameplay.

### Step 5 — Conflict re-check (beats ↔ canon)

- [ ] Expanded beats do not contradict locked canon: album lyrics-as-canon, DB lore,
      and the album's specific guardrails (e.g. EP: untamable Balrog, Heartstone
      rejects unworthy hands, the 400-year vigil, Generals' fates).
- [ ] Where a beat conflicts, resolve as **refine** (change the beat) or
      **document-override** (record it like ACC §E) — never leave it silent.

### Step 6 — DB sync

- [ ] Add missing nodes (Step 2 list) with full key attributes + `origin`.
- [ ] Add/verify relationships the campaign needs: `PART_OF`, `FEATURES`, `LYRICAL_POV`,
      `LOCATED_AT` (at the specific location, not just the plane), `OCCURRED_IN`,
      `MENTIONS`, `REVEALS`, `LOCATED_IN` (hierarchy), plus Character rels (`KILLED`,
      `ENMITY_WITH`, `SERVANT_OF`, `SEEKS`, `GUARDS`, `WIELDS`).
- [ ] Re-run ACC §D queries and update the album's ACC report status.

### Step 7 — Deliverables

- [ ] `data/lore/campaigns/<Album>_campaign.md` written (bible template below).
- [ ] ACC report updated (D → PASS when graph synced; note remaining G-items).
- [ ] Album XML `<Plot>` expanded — **only with explicit user approval**. Without it,
      leave the XML untouched and note the beats in the bible.
- [ ] Update the status table in `album_production_process.md` with the campaign column.

## Campaign Bible Template

```markdown
# <Album> — Campaign Bible

## Meta
- Timeline / era (DB Album node + world_lore)
- Sources: album XML, book canon (title), DB nodes
- Status: draft | reviewed | approved

## Narrative Arc
<The AlbumPlot in 3-5 sentences.>

## Song-by-Song Breakdown
### Song N — <Title> (Act)
- **Song plot (XML):** <verbatim>
- **Expanded beat:** <situation → inciting event → rising action → conflict →
  resolution → emotional beat → bridge to next song>
- **Canon anchors:** <characters/locations/artifacts/events in the DB for this beat>
- **Game content:**
  - Map/area:
  - Enemies:
  - Boss:
  - NPCs:
  - Quests (main + side):
  - Items / unlocks:
  - Set-piece / mechanic:
  - Gameplay moment:
- **Conflict notes / overrides:** <refine or document-override>

## Boss Design
<Per campaign-critical boss: canon constraints + the mechanic that honors them.>

## Campaign Progression
<Map flow, level/skill gating, unlocks across the campaign, replay hooks.>

## DB Sync Log (G-items)
| # | Gap | Status |
|---|---|---|
| G1 | … | fixed |
```

## Definition of done

- Every song maps to a playable beat; nothing is travel-only.
- Every beat is canon-grounded (DB verified) with no silent conflicts.
- Campaign Bible written; ACC D synced; status table updated.
- Album XML only expanded with explicit user approval.
