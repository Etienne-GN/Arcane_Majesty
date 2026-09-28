# ACC Report — Queen of Carnage

Per `data/lore/xmls/album_canon_checkup.md`. Run: 2026-09-06. Album: 11 songs,
Era III (~150–300 AGD). This checkup was run **retroactively** — the album had
already entered audio production before this ACC existed (a process failure: the
Phase-5 lyric rework was marked done but the ACC gate was skipped). Findings below
are the basis for regenerating songs in Suno with corrected lyrics.

## Summary table

| Item | Verdict | Evidence | Action |
|---|---|---|---|
| A. AlbumPlot ↔ lore | **PASS** | Timeline ~150–300 AGD matches DB events: Founding of New Ravenspire ~150 AGD, The Rise of the Queen of Carnage ~150 AGD, Battle of the Broken Dreams ~225 AGD, Fall of Nythoria ~230 AGD, Malakar's Exile to the Shadow Realm ~250 AGD | none |
| B. Song plots ↔ album plot | **PASS** | 11 songs in narrative order (song_id 1–11), clean 3-act mapping (I: Ascent; II: War for Dominance; III: The Queen's Burden). No invented events. All 3rd-person narrative; POV coherent (no `LYRICAL_POV` nodes needed for declamations) | none |
| C. Lyrics ↔ song plot & lore | **PASS** (repetition defect separate — below) | All anchors verified against DB (table below); correct place/character/artifact names; no lore contradictions | see "Repetition defects" |
| D. Graph sync | **PASS** | All named nodes exist with `origin:"album"`: New Ravenspire, The Obsidian Gate, The Shadow Realm, Ravenspire (Ancestral Ruins); events exist; `FEATURES` links confirmed for Seraphina on all 11 songs | none |
| E. Book reconciliation | **N/A** | No book for this album (novel is Eldoria's Prophecy) | — |

## C — Lore-anchor verification against Neo4j

| Song | Entity anchors | Graph status |
|---|---|---|
| 1 Queen of Carnage | Seraphina, New Ravenspire, Shadow Legion, Malakar (enmity), grief over Anya | PASS — Seraphina RULES/FOUNDED New Ravenspire, FOUNDED Shadow Legion, ENMITY_WITH Malakar, ALLY_OF Anya |
| 2 The Whispering Shadows | Malakar survives/exiled, the Obsidian Gate, spies, Nythoria | PASS — Malakar's Exile to Shadow Realm (~250 AGD), Obsidian Gate node exists |
| 3 The Gathering Storm | Shadow Legion, New Ravenspire (Eldoria), Obsidian Gate, march into Nythoria | PASS — exactly the AlbumPlot cross-planar campaign premise |
| 4 The Siege of Silence | siege on Malakar's Nythoria fortress | PASS — cross-planar campaign against remnant strongholds |
| 5 The Betrayal Within | internal Nythorian traitor leaks to Malakar | PASS — no DB conflict; Seraphina's iron rule motif |
| 6 The Dark Alliance | alliance with a rogue magesmith/sorcerer, anti-shadow weapons, Nythoria | PASS — no DB conflict (unnamed sorcerer, "rogue magesmith" per plot) |
| 7 Battle of the Broken Dreams | final battle, Malakar's army shattered → Shadow Realm exile | PASS — maps to Battle of the Broken Dreams (~225 AGD) + Fall of Nythoria (~230 AGD) |
| 8 The Fall of the Lord | Malakar flees to Shadow Realm (wounded), Seraphina reclaims Nythoria, Valen's loss | PASS — Malakar's Exile (~250 AGD); Valen grief canonical (Seraphina SACRIFICES_FOR Valen, ALLY_OF Valen) |
| 9 The Reign of Ruin | ruling dual-planar empire (Eldoria + Nythoria), crushing insurrections | PASS — New Ravenspire in Eldoria + occupied Nythoria; consistent |
| 10 The Echoes of Despair | grief over Anya's sacrifice, loneliness of crown | PASS — Anya ALLY_OF Seraphina, sacrificed (SACRIFICES_FOR); fully canonical |
| 11 The Eternal Queen | absolute sovereignty of Ravenspire, feared across planes | PASS — Seraphina as Eternal Queen/Queen of Carnage; consistent with Era III endstate |

## Repetition defects (the core finding)

The lyrics reuse a small stock of phrases across many songs. These do **not**
contradict canon, but they make the album read as template-generated and are the
primary reason the album needs rewriting before re-generation.

### Identical full lines used in 2+ songs
| Line | Songs |
|---|---|
| "A queen on a mission, with darkness as her guide," | Whispering Shadows, Siege of Silence, Betrayal Within |
| "In the still of the night, her resolve is like steel," | Whispering Shadows, Betrayal Within |
| "With your mind and your might, and your heart cold as stone," | Whispering Shadows, Betrayal Within |
| "With a heart full of fury, and a mind sharp as blades," | Gathering Storm, Siege of Silence |
| "In the heart of the darkness, your power is drawn." | Gathering Storm, Siege of Silence |
| "With your legions and might, and your will made of steel," | Gathering Storm, Siege of Silence |

### Recurring template lines (paraphrase repeats across 3+ songs)
| Template | Appears in |
|---|---|
| "So rise, oh, Queen Seraphina" (outro declamation) | Queen of Carnage, Whispering Shadows, Gathering Storm, Siege of Silence, Betrayal Within (5 songs) |
| "in (the heart/still/dead) of the night" | Whispering Shadows, Gathering Storm, Siege of Silence, Betrayal Within (4 songs) |
| "in the annals of time" | Dark Alliance, Broken Dreams, Fall of the Lord, Reign of Ruin (4 songs) |
| "stands tall" | Fall of the Lord, Reign of Ruin, Eternal Queen (3 songs) |
| "mind sharp as blades" | Gathering Storm, Siege of Silence, Betrayal Within (3 songs) |
| "will made of steel / heart of steel / iron will" | Gathering Storm, Siege of Silence, Reign of Ruin (3 songs) |
| "heart cold as stone" | Whispering Shadows, Betrayal Within (2 songs) |
| "darkness as (her/my) guide" | Whispering Shadows, Siege of Silence, Betrayal Within (3 songs) |
| "power won't hide / will bide" | Whispering Shadows, Siege of Silence, (Dark Alliance outro) |
| "a queen in her element" | Gathering Storm, Siege of Silence |

## Action

**Canon: PASS — no lore changes required.**

**Lyrics: must be varied.** Every repeated line / template above needs a rewrite
that (a) keeps each song's specific plot beats, (b) preserves line length/meter so
the Suno generation stays intact, (c) removes the cross-song stock phrasing. The
resulting per-song lyrics are delivered to the user for Suno re-generation; the
updated `<Lyrics>` blocks are synced to the master XML.

## Result (2026-09-06 fixes applied)

All 11 songs' `<Lyrics>` blocks were rewritten and synced to the master XML:

- **Cross-song repeated full lines: eliminated** (0 remaining across the album).
- **Intra-song non-chorus duplication: eliminated** — The Siege of Silence (duplicate
  V1=PreChorus and the re-sung outro), The Betrayal Within (duplicate V1=PreChorus),
  The Reign of Ruin (duplicate Bridge), The Eternal Queen (identical Bridge=Outro)
  all fixed.
- Chorus lines still repeat 3–5x per song **by design** (normal song structure) —
  these are intentional and retained.
- Shared stock templates removed: "So rise, oh, Queen Seraphina" (was 5 songs),
  "a queen on a mission, with darkness as her guide" (was 3), "in the annals of time"
  (was 4), "stands tall" (was 3), "will/heart made of steel", "mind sharp as blades",
  "heart cold as stone", "crown of thorns", "a queen in her element", "legend
  cascades", "power won't hide / will bide".
- POV and canon preserved throughout; Suno meter/line-count kept for all verses and
  choruses.
- `python3 data/scripts/verify_album.py "Queen of Carnage"` → **PASS**; XML parses.

## Status

- **ACC findings: PASS (A, B, C, D) + E N/A, WITH a repetition defect requiring lyric
  variation across all 11 songs.**
- Queen of Carnage entered audio production **before** this ACC ran (process
  failure) — this checkup and the resulting lyric corrections are the corrective
  pass. Songs are to be regenerated in Suno with the corrected lyrics.
- Follow-up: after lyric edits, run `python3 data/scripts/verify_album.py "Queen of
  Carnage"` and re-parse the XML.
