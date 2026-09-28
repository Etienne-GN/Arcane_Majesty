# ACC Report — Bound by Blood

Per `data/lore/xmls/album_canon_checkup.md`. Run: 2026-09-13. Album: 13 songs,
Era III (~600–700 AGD), sister album to *Beyond the Veil of Twilight* telling the
Emerald Fields exile. This ACC ran **before** audio production (correct process).
Corrections are already synced to the master XML.

## Summary table

| Item | Verdict | Evidence | Action |
|---|---|---|---|
| A. AlbumPlot ↔ lore | **PASS** | Album ~600–700 AGD **matches the DB Album node** (`timeline_range` ~700 AGD, source of truth). XML `<TimelineEvent>`/header/analysis conformed ~300–400 → ~600–700 AGD to match the DB | none (conform done) |
| B. Song plots ↔ album plot | **PASS** | 13 songs in narrative order. POV: 1 Anya; 2 Kael; 3 Anya; 4 Kael; 5 third-person/narrator (ambiguous "I"); 6 narrator (Vexis-focused); 7 Kael/Anya unfold; 8 Kael; 9 Anya; 10 Kael; 11 Kael; 12 narrator/collective "we"; 13 Kael+Anya "we" | none (LYRICAL_POV dropped) |
| C. Lyrics ↔ song plot & lore | **FAIL** (grammar) | "The living deads", "The Crimson Remnant's dark kin", "price of my stash" | 3 fixes applied (below) |
| D. Graph sync | **PATCH** | All 13 songs exist with FEATURES + LOCATED_AT/PART_OF. Missing: OCCURRED_IN. LYRICAL_POV intentionally **dropped** (project decision). **`Race:Werewolf` node added** (was missing). DB timeline is correct | add OCCURRED_IN (optional) |
| E. Book reconciliation | **FLAG** | Book canon places Kael's Awakening ~300 AGD / interludes at 501 AGD, contradicting the DB ~600–700 AGD exile | book docs need conformance — pending user decision |

## A/B — Lore-anchor verification against Neo4j

| Song | Entity anchors | Graph status |
|---|---|---|
| 1 A Peaceful Dawn | cabin, Emerald Fields, exile cause (resonance) | PASS — Emerald Fields Region+Location; Hidden Cabin nested |
| 2 Shadows Gathering | Werewolf pack circling cabin | PASS — **`Race:Werewolf` node added** |
| 3 Unveiling the Truth | Guardians of the Wild pack | PASS — pack = canonical Werewolf guardians |
| 4 Feral Howl | pack attack, Kael mortal combat | PASS — Kael Human (Vampire Hybrid) |
| 5 The Shapeshifter's Shadow | Vexis the Faceless, Crimson Remnants | PASS — Vexis assassin of Crimson Remnants; Shapeshifter race |
| 6 A Dangerous Alliance | Vexis manipulates Wolf Alpha | PASS on plot — Wolf Alpha not a DB Character node (pack-level) |
| 7 Love Under Siege | Anya's restraint, coming threats | PASS — Anya Void-Echo; Kael+Anya love arc |
| 8 Eclipse of Hope | Kael fights at vampiric speed, Vexis observes | PASS |
| 9 Trials of Courage | Anya's combat agency, Sanctuary-light | PASS — Anya Aurorian (Void-Echo); Sanctuary-light consistent |
| 10 A Haunting Fear | The Spark unleashed, Vexis IDs the Living Lock | PASS — Kael "The Living Lock" (DB role) |
| 11 Sacrifice and Redemption | Kael executes Vexis | PASS — Kael KILLED Vexis (DB rel) |
| 12 A New Dawn | truce with Wolf Alpha | PASS on plot |
| 13 Endless Horizons | closing vow, hidden protectors → Eldrin | PASS — bridges to interlude i2 (Underworld Sanctuary, Kael thinner) |

## Findings

### Grammar defects (lyrics)
| Location | Before | After |
|---|---|---|
| Feral Howl V2 | "But silence is the price of my **stash**." | "But silence is the **price I pay**." |
| The Shapeshifter's Shadow V2 | "He walks among the living **deads**." | "He walks among the **living dead**." |
| The Shapeshifter's Shadow V2 | "The **Crimson Remnant's** dark kin." | "The **Crimson Remnants'** dark kin." (org is plural) |

Meter preserved (7–8 syllables per line, Suno-safe).

### Graph sync (D)
- **`Race:Werewolf` added** (origin `"album"`) — the Guardians of the Wild pack,
  introduced by this album. Wolf Alpha optionally a Character or bestiary entry.
- DB album node is already correct: title `Bound by Blood`,
  `timeline_range` `~700 AGD` (source of truth; XML conformed to it).
- `LYRICAL_POV` intentionally **dropped** — no longer wanted per project decision.

### Book-timeline flag (E)
Book canon (`events.md` §54): "~300 AGD — Kael made the Living Lock at the turn
of the age"; interlude i2 (501 AGD): Kael two centuries deep. This contradicts
the DB ordering (Eldoria's Prophecy ~500 AGD → Beyond the Veil of Twilight
~600 AGD → Bound by Blood ~600–700 AGD). Per project ruling the **DB wins**;
the book docs need conformance. **Pending user decision.**

## Action

**Canon: PASS (A, B) — with lyric fixes (C) and a book-canon flag (E).**

1. Apply the 3 lyric fixes to the master XML.
2. `python3 data/scripts/verify_album.py "Bound by Blood"` → PASS.
3. Conform XML/docs to DB (already done): header/TimelineEvent/analysis
   ~300–400 → **~600–700 AGD** (matches DB).
4. Graph-sync patch (D, done + optional):
   - **`Race:Werewolf` added** — DONE.
   - Add `OCCURRED_IN`: song→event links (The Exile in the Emerald Fields →
     1–4; The Hunt of Vexis → 5–11; The Truce → 12–13) — optional.
   - `LYRICAL_POV` intentionally **dropped**.

## Result (2026-09-13 fixes applied)

- Master XML edited: 3 lyric fixes; `verify_album.py` PASS; XML parses.
- XML/docs conformed to DB timeline (~600–700 AGD); DB unchanged except
  `Race:Werewolf` node added and Bound by Blood summary fixed (~300–400 → ~600–700).
- Book-canon conformance (~300 AGD) still **pending user decision**.