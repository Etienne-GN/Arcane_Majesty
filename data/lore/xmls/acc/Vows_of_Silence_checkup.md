# ACC Report — Vows of Silence

Per `data/lore/xmls/album_canon_checkup.md`. Run: 2026-09-14. Album: 16 songs,
Era I (~100 to 0 BGD), the **Shadow Civil War** prequel — Acheron's Vow of
Silence, Malakar's rise, the Threshold Assassination, and the founding of the
Nythorian Resistance. This ACC ran **before** audio production (correct process).

## Summary table

| Item | Verdict | Evidence | Action |
|---|---|---|---|
| A. AlbumPlot ↔ lore | **PASS** | AlbumPlot "Centuries before the Great Darkness (0 GD)" **matches the DB Album node** (Era I, ~100 to 0 BGD, origin album). All named entities (Acheron, Forbidden Tome, Malakar, Nyktoros, Crimson Covenant, Eldoria, Nythoria) exist in graph | none |
| B. Song plots ↔ album plot | **PASS** (1 fix) | 16 songs in narrative order (`-100` → `-1`), timestamps align to DB events (Discovery ~50 BGD, Rise ~40, Transference ~30, Assassination ~20, Resistance ~10). POV consistent with `FEATURES`. **Song 1 `-5000` was a stray value** contradicting the locked Discarding (~100 BGD) | timestamp corrected to `-100` |
| C. Lyrics ↔ song plot & lore | **PASS** (1 fix) | Canon spellings clean (Nyktoros throughout); titles consistent (Vorgos = Sentinel/Stormbringer, Malakar = Lord of Shadows, Acheron = Apostate). Era-I anachronisms in `<OriginalLyrics>` already corrected in canon `<Lyrics>`. **Song 1 analysis said "Vorgos narrates" but lyrics are Acheron 1st-person POV** | analysis fix applied |
| D. Graph sync | **PASS** | 16 Song nodes + Album node exist, `origin: album`. `PART_OF` ×16, `FEATURES` ×30 (all 16 songs covered), `LOCATED_AT` ×18, `MENTIONS` ×7 (Forbidden Tome). Events all present (Discarding, Acheron's Crossing, Threshold Assassination, Transference, Rise, Resistance founding, Great Darkness). `OCCURRED_IN` remains **optional** (project decision) | none |
| E. Book reconciliation | **PASS** | No book exists for this album. Cross-album anchors are already aligned: *Crimson Covenant* ends on the exact discarding (~100 BGD) that opens *Vows*; *A Tapestry of Souls* (Era II) begins where song 16 ends (0 GD) | none |

## A/B — Lore-anchor verification against Neo4j

| Song | Entity anchors | Graph status |
|---|---|---|
| 1 Vows of Silence | Acheron's Vow / discarding, Eldoria, Covenant | PASS — Acheron FEATURES + LOCATED_AT Eldoria; timestamp fixed to ~100 BGD (locked Discarding event) |
| 2 The Shadow Disciple | Malakar, Nyktoros, Nythoria | PASS — FEATURES Malakar + Nyktoros, LOCATED_AT Nythoria |
| 3 The Hidden Pilgrimage | Malakar's descent, Nythoria, The Black Well | PASS — FEATURES Malakar, LOCATED_AT Nythoria |
| 4 The Forbidden Tome | The Black Well, Void blueprints | PASS — LOCATED_AT The Black Well; Artifact node `SEEKS`/`WIELDS`/`DISCOVERED` correct (Malakar unearths; Acheron discovered & discarded) |
| 5 The Rise of Malakar | Nythorian coup, Lord of Shadows | PASS — FEATURES Malakar; matches Event "The Rise of the Lord of Shadows" (~40 BGD) |
| 6 The Crimson Elite | Covenant high society, Eldoria | PASS — FEATURES Acheron, LOCATED_AT Eldoria |
| 7 Heresy of the Sun | Transference → Kael's bloodline, Eldoria | PASS — matches Event "The Transference" (~30 BGD); consistent with `world_lore.md` §6 (Spark bound to Kael's ancestor) |
| 8 The Dual Leak | Vorgos/sentinel, Aether, two soul-leaks | PASS — FEATURES Vorgos+Acheron+Malakar, LOCATED_AT The Aether; matches `world_lore.md` §3 (Vampiric Leak + Tyrant's Sacrifice) |
| 9 Astral Sabotage | Malakar/Acheron cross-planar duel | PASS — FEATURES both; dialogue POV marked `[Malakar]`/`[Acheron]` in canon lyrics |
| 10 Threshold Assassination | Void-Sever, Acheron's body destroyed | PASS — FEATURES Malakar+Acheron; matches Event + `world_lore.md` §4 |
| 11 The Obsidian Throne | Obsidian Citadel, Royal Guard, Nyktoros | PASS — LOCATED_AT The Obsidian Citadel; FEATURES Nyktoros; Royal Guard FOUNDED by Malakar |
| 12 Altar of Bone | Seraphina, Valen, death-cult reveal | PASS — FEATURES Seraphina + Valen; matches Resistance-founding arc. **Renamed 2026-09-14** from "The Whispering Shadows" to de-conflict with *Queen of Carnage* track 2 "Whispering Shadows" (closing ~250 AGD) |
| 13 Sparks of Resistance | Ravenspire (Ancestral Ruins), resistance founding | PASS — LOCATED_AT Ravenspire (Ancestral Ruins); matches Event (~10 BGD). OriginalLyrics' "Shadow Legion"/"Obsidian gate" anachronisms already removed in canon `<Lyrics>` |
| 14 Tithes of the Void | critical-mass soul-bank, planar barrier | PASS — FEATURES Malakar; consistent with `world_lore.md` §5 (banked souls + sacrifices hit critical mass) |
| 15 Reign of the Shadow Lord | eve of Great Darkness, rebels | PASS — FEATURES Malakar+Acheron+Seraphina |
| 16 Rite of the Darkened Sun | 0 GD, Great Rift, Vorgos too late | PASS — FEATURES Malakar+Vorgos+Nyktoros; matches Event "The Great Darkness" (0 GD): Vorgos creates the Rift, Legion of Souls launches |

## Findings

### Fixed — song 1 timestamp outlier
`Vows of Silence` song 1 `<timestamp>` was `-5000`, contradicting the locked
event **"Discarding of the Forbidden Tome (~100 BGD)"** (DB) and the sibling
album *Crimson Covenant*, whose closer anchors the discarding at `-100`. All
Vows timestamps are canon year markers matching the album's `~100 to 0 BGD`
range — `-5000` was a stray from an older draft. Changed to `-100` (song 2
remains `-100`: the Disciple's hunt begins the same ~100 BGD window).

### Fixed — stale POV in song 1 analysis
`<analysis>` read *"Vorgos narrates Acheron's initial treason."* The canon lyrics
are Acheron's first-person POV (`"I threw the book into the ancient dust"`,
`"Now I am master of the endless night"`), and the graph `FEATURES` is
Acheron-only (no Vorgos) for this song. Reworded to *"Acheron narrates his own
initial treason — turning away from Nyktoros to establish the Crimson Covenant
and the 'Vampiric Leak' through secretive soul-banking in Eldoria."*

### Already correct (no action)
- Song 13 `<OriginalLyrics>` still carries the Era-I anachronisms **"Shadow
  Legion"** and **"Obsidian gate"** (both are Seraphina's post-Rift, Era-II/III
  constructs); the **canon `<Lyrics>` already corrected them** ("resistance
  kindles", "Citadel gate"). Historical draft, untouched.
- `world_lore.md` §1 lists "The Great Citadel" under Nythoria Surface, but the
  canonical node is **The Obsidian Citadel** (song 11 anchors to it). Cosmetic
  doc-vs-DB naming drift; optional cleanup, not blocking.

### Renamed — song 12 "The Whispering Shadows" → "Altar of Bone"
**Conflict:** *Queen of Carnage* track 2 is **"Whispering Shadows"** (DB, origin
album, ~250 AGD — Malakar's Exile / spy-activation through the Obsidian Gate).
*Vows of Silence* track 12 was **"The Whispering Shadows"** — a near-duplicate
title (a "The" apart) in the same universe. De-conflicted on user request
2026-09-14: renamed to **"Altar of Bone"**, taken from the song's own chorus
(*"a cult of silence and an altar of bone"*).

Changes:
- DB: `Song "The Whispering Shadows"` (Vows, track 12) → `Song "Altar of Bone"`.
- Master XML: `<Song song="...">` attribute, chorus anchor
  (*"The whispering shadows reveal the truth"* → *"The altar of bone reveals
  the truth"*), and the outro call-back (*"The shadows whisper."* →
  *"The altar waits."*).
- No other node touched — *Queen of Carnage* track 2 remains **"Whispering
  Shadows"** (unchanged).

## Action

**Canon: PASS (A, B, C, D, E) — 2 small fixes applied.**

1. Applied song 1 timestamp `-5000 → -100` and song 1 analysis POV fix to the
   master XML.
2. `python3 data/scripts/verify_album.py "Vows of Silence"` → PASS.
3. `OCCURRED_IN` not added (optional per project decision, consistent with
   *Beyond the Veil of Twilight* / *Bound by Blood* patch item).

## Result (2026-09-14 fixes applied)

- Master XML edited (timestamp + analysis); `verify_album.py` PASS; XML parses.
- DB unchanged (source of truth) — it was already fully in sync with the album.