# ACC Report — Lord of Shadows

Per `data/lore/xmls/album_canon_checkup.md`. Run: 2026-09-08. Album: 12 songs,
Era III (~150–300 AGD), sister album to *Queen of Carnage* told from **Malakar's**
perspective. This ACC ran **before** audio production (correct process — Queen of
Carnage's failure mode); the corrections below are the basis for Suno generation.

## Summary table

| Item | Verdict | Evidence | Action |
|---|---|---|---|
| A. AlbumPlot ↔ lore | **PASS** | Timeline ~150–300 AGD matches DB events: Malakar's defeat ~230 (Fall of Nythoria), Exile to Shadow Realm ~250, Shadow Council ~290. Malakar ENMITY_WITH Seraphina + Draven; RULES Nythoria; WIELDS Forbidden Tome; FEEDS_SOULS_TO Legion of Souls. NYTHORIAN race = "elven kin" (lyrics' ''elven'' usage valid) | none |
| B. Song plots ↔ album plot | **PASS** (1 stale analysis) | 12 songs in narrative order, 3-act mapping (I: The Bitter Peace 1–3; II: The Fall of Nythoria 4–7; III: The Hiding 8–12). POV: songs 1,2,3,9,10 are first-person Malakar | fix analysis on song 1 |
| C. Lyrics ↔ song plot & lore | **FAIL** (repetition + 1 stale character) | Cross-song template overlap; "Vesper" is not a DB character and her song's plot was reframed to the Obsidian Gate frequency attack | see "Repetition defects" + "Vesper" |
| D. Graph sync | **PATCH** | All 12 songs exist with FEATURES + LOCATED_AT/PART_OF. Missing: LYRICAL_POV (Malakar) on the 5 first-person songs; no OCCURRED_IN event links on this album's songs | add LYRICAL_POV + OCCURRED_IN |
| E. Book reconciliation | **N/A** | Novel is Eldoria's Prophecy | — |

## A/B — Lore-anchor verification against Neo4j

| Song | Entity anchors | Graph status |
|---|---|---|
| 1 The Hollow Crown | Malakar (first-person), Nyktoros (sealed/silent), The Obsidian Citadel | PASS — Malakar SERVANT_OF Nyktoros; FEATURES Malakar+Nyktoros; LOCATED_AT Obsidian Citadel |
| 2 Ghosts of the Citadel | Malakar's sacrificed souls, Forbidden Tome | PASS — Malakar FEEDS_SOULS_TO Legion of Souls, WIELDS Forbidden Tome; LOCATED_AT Obsidian Citadel |
| 3 The Iron Peace | Malakar's martial law, Seraphina's rising power (Ravenspire) | PASS — FEATURES Malakar+Seraphina; Seraphina RULES New Ravenspire (~150 AGD) |
| 4 Veil of Betrayal | Draven's defection, Seraphina, Obsidian Gate | PASS — Draven DEFECTS_FROM Malakar + ENMITY_WITH; FEATURES Draven+Malakar+Seraphina; LOCATED_AT Nythoria + Obsidian Gate |
| 5 Hidden Insurrection | Nythorian uprising backing Seraphina/Draven | PASS — FEATURES Draven+Malakar; Nythoria |
| 6 The Queen's Deception | Seraphina poisoning frequency via Obsidian Gate | PASS on plot — Obsidian Gate is a controlled frequency bridge (DB). **Vesper in lyrics is stale** (see below) |
| 7 The Fall of Nythoria | fall of Malakar's capital, escape | PASS — FEATURES Malakar+Seraphina; event The Fall of Nythoria ~230 AGD |
| 8 Survival in the Shadows | exile flight, hidden refuge | PASS — FEATURES Malakar; event Malakar's Exile ~250 AGD |
| 9 The Shadow Realm | crossing into sub-zone, adapting void magic | PASS — FEATURES Malakar; location The Shadow Realm (Region+Location) |
| 10 Whispers of the Void | communing with silent Nyktoros, shedding dependence | PASS — FEATURES Malakar+Nyktoros; LOCATED_AT Shadow Realm |
| 11 The Council | Shadow Council formation | PASS — Malakar FOUNDED Shadow Council; event Formation of the Shadow Council ~290 AGD |
| 12 Prelude to Vengeance | completion of preparations | PASS — FEATURES Malakar+Seraphina; LOCATED_AT Shadow Realm |

## Findings

### Stale analysis — The Hollow Crown (song 1)
`<analysis>` reads *"Vorgos narrates Malakar's despair"* — **wrong**: the lyrics are
first-person Malakar ("I gave my kingdom", "I am the King of Nothing", "I sold the
souls"). Vorgos is not present. Fix: attribute to Malakar's POV.

### Vesper (song 6 — The Queen's Deception)
- The lyrics reference **Vesper** (V1, Bridge, Outro) as Malakar's trusted advisor.
- **No `Character` node "Vesper" exists in the DB.**
- **Name collision:** *Crimson Covenant* (book canon) already has a vampire named
  **Vesper** (healer, eldest vampire) — a different person entirely.
- The song's plot was already reframed to the **Obsidian Gate frequency attack**
  ("she used the Obsidian Gate to disrupt the harmonic frequency of his shadow
  magic"), yet the lyrics still carry the old Vesper spy subplot.

**Action:** de-Vesper the lyrics — replace the three Vesper lines with spy-figure
lines consistent with the reframed frequency-attack plot. Do NOT add a DB node
(avoids the book-character collision).

### Repetition defects (cross-song template overlap)
| Template | Songs |
|---|---|
| "I gave my kingdom …" | The Hollow Crown V1 / Whispers of the Void V1 |
| "I am the priest …" | The Hollow Crown V2 / Whispers of the Void V2 |
| "… the center of the …" | The Hollow Crown (bridge) / The Shadow Realm (bridge) |
| "… the elven day" | Ghosts of the Citadel V1 / Whispers of the Void (bridge) |
| "… the silence of the …" | The Council V1 / Whispers of the Void V1 |
| "… in the heart of …" | Survival in the Shadows (outro) / Whispers of the Void V2 |
| "The Queen of Carnage" | The Queen's Deception (chorus) / The Shadow Realm V3 — **title usage, acceptable** |

### Intra-song duplication
| Song | Issue |
|---|---|
| Hidden Insurrection | Outro = Verse 5 verbatim (both Original + Lyrics) |
| Survival in the Shadows | Outro repeats the Bridge **twice, verbatim** after its first 4 lines |

## Action

**Canon: PASS (A, B, D) — with lyric fixes (C) + a stale analysis + graph-sync patch.**

1. Fix `<analysis>` on The Hollow Crown → Malakar POV.
2. De-Vesper The Queen's Deception (3 lines).
3. Rewrite the 6 cross-song template overlaps (metrics preserved, Suno-safe).
4. De-duplicate Hidden Insurrection outro + Survival in the Shadows outro.
5. Graph-sync patch (D): add `LYRICAL_POV` for Malakar on songs 1, 2, 3, 9, 10;
   add `OCCURRED_IN` links from this album's songs to events (The Fall of Nythoria,
   Malakar's Exile to the Shadow Realm, Formation of the Shadow Council).
6. `python3 data/scripts/verify_album.py "Lord of Shadows"` + XML parse → PASS.

## Result (2026-09-08 fixes applied)

- All lyric fixes synced to master XML; verified (verify_album PASS, XML parses).
- Cross-song repeated templates eliminated; intra-song non-chorus duplication removed.
- Chorus repetition retained (by design).
- Stale "Vorgos narrates" analysis corrected to Malakar POV.
- Graph sync: `LYRICAL_POV` (Malakar, 5 songs) + `OCCURRED_IN` (3 song→event links) added.