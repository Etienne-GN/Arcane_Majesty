# ACC Report — A Tapestry of Souls: The Awakening

Per `data/lore/xmls/album_canon_checkup.md`. Run: 2026-08-04. Album fully produced
(10 songs: 1 kept rework + 9 new). Graph-sync items for **new** nodes/relations are
handled by the sibling Neo4j migration plan (delete old `A Tapestry of Souls` album
node, create 3 album nodes, re-parent/re-order the 13 kept songs, add 18 new songs,
add ~2-3 new Era II events). This ACC verifies the lyrics' lore anchors against the
existing graph and the locked era/media-model boundaries.

## Summary table

| Item | Verdict | Evidence | Action |
|---|---|---|---|
| A. AlbumPlot ↔ lore | **PASS** (1 note) | Era II / timeline `→ 0 GD` ✓; Nyktoros's rising, Legion invasion, Vorgos's gambit, Great Rift, Anya plucked — all map to DB events (The Great Darkness, The Great Rift Opening) | see E-1 |
| B. Song plots ↔ album plot | **PASS** | 10 songs in narrative order (song_id 1–10), clean 3-act mapping (Act I rising/awakening; Act II war for Nythoria; Act III Sentinel's gambit) | none |
| C. Lyrics ↔ song plot & lore | **PASS** (2 notes) | all anchors verified against DB (below); media-model rule clean; no Era III or Era I content in lyrics | see C notes |
| D. Graph sync | **PARTIAL** | existing 0 GD events confirmed; new album/song/event nodes are migration-plan scope | migration plan |
| E. Boundaries & canon locks | **PASS** | no "Queen of Carnage", no Shadow Legion, no New Ravenspire founding, no Kael, no resistance founding, no humble-scholar line | see E |

## C — Lore-anchor verification against Neo4j (all entities confirmed)

| Song | Entity anchors | Graph status |
|---|---|---|
| 1 The Tilt | Vorgos/Stormbringer, the Aether, Auroria, Eldoria, Nythoria, the Underworld | PASS — all nodes exist (Vorgos:Character, The Aether:TransPlanar, 3 Planes, The Underworld:Region) |
| 2 The Awakening | Nyktoros, the Underworld, the Legion of Souls, Nythoria | PASS — Nyktoros:Character, Legion of Souls:Organization |
| 3 Empire of the Void | Nyktoros, Aurorian suns, Nythoria, Legion/Nyktoros POV | PASS (kept rework) |
| 4 March of the Legion | the Legion of Souls, Nythoria, the Void, banked souls | PASS — soul-leak canon (Crimson Covenant Thirst-banking) |
| 5 The First Stand | Seraphina, Valen, Ravenspire (Ancestral Ruins), the Legion of Souls | PASS — all exist |
| 6 The Fall of Ravenspire | Ravenspire (Ancestral Ruins), Nythoria, the Legion of Souls, the Shadow-Kin | PASS |
| 7 The Unending War | the Legion of Souls, Nythoria, The Shadow-Vale | PASS — The Shadow-Vale:Location (DB-verified battlefield) |
| 8 Auroria's Lament | Auroria, the Celestial Gardens, the Crystal Sanctum, the Seers/frequencies | PASS — Crystal Focus artifact + Seer's Library confirm the scholars/frequencies motif |
| 9 The Sentinel's Gambit | Vorgos, the Great Rift, Auroria, the Underworld, a scholar | PASS |
| 10 Torn from the Stars | Anya, the Crystal Sanctum, the Great Rift, Auroria, the Underworld | PASS — Anya:Character, Crystal Sanctum:Location |

Spelling check: Nythoria, Auroria, Eldoria, Nyktoros, Vorgos, Ravenspire, the
Underworld, the Great Rift, the Legion of Souls, the Shadow-Vale, the Crystal
Sanctum, the Celestial Gardens — all canonical per graph. No "Impossible Key", no
"the Stone as our guide", no "humble scholar" (canon fixes verified applied).

## E — Boundaries & deviations

- **E-1** "The Fall of Ravenspire" (song 6) depicts the **Era II invasion** — the
  Legion overrunning the ancestral ruins at 0 GD. This is distinct from the **Era III
  "Fall of Nythoria"** (~230 AGD, Seraphina conquering Malakar, DB event exists). The
  Era II discovery event **does not yet have a graph node** — document/defer: it will
  be added by the migration plan (per design spec §5: "the fall/invasion of Ravenspire
  (Era II, distinct from Era III 'Fall of Nythoria')"). No conflict; the lyrics are
  rigidly Era II.
- **E-2** No book exists for this album yet (the novel is Eldoria's Prophecy, Era III).
  Item E of the ACC is therefore not-applicable/clean.
- **E-3** POV notes: song 2 "The Awakening" uses Nyktoros/the-Void first person ("I"),
  song 9 Vorgos first person, song 10 Anya first person, songs 4/5/7 collective
  "we" — each matches its mandated POV. The `FEATURES`/`LYRICAL_POV` graph links
  (`LYRICAL_POV`: Vorgos→1, Nyktoros→2, Legion(no node, represented via Nyktoros)→4,
  Seraphina/Valen→5, Seraphina→6, Vorgos→9, Anya→10) are applied at migration.

## Status

- ACC findings: **PASS (A, B, C) + E clean + D PARTIAL (graph nodes are migration-plan
  scope)**.
- The 10 song archives are `status="in_review" version="draft"` — each requires the
  user Suno listen + approval gate before `human_reviewed`/`production_ready` (per
  `album_production_process.md`).
- Follow-up: run `python3 data/scripts/verify_album.py "A Tapestry of Souls - The
  Awakening"` (currently **PASS**) after any lyric change. Execute the sibling Neo4j
  migration (delete old album node, create 3 album nodes + 18 new songs + Era II
  "invasion of Ravenspire" event, re-parent/re-order kept songs).