# Design Spec: *A Tapestry of Souls* — The 0 GD Trilogy

**Date:** 2026-08-04
**Status:** Approved by user (all sections reviewed in conversation)
**Genre:** Dark fantasy / cosmic dark fantasy concept albums (Suno)
**Canon status:** Album lyrics are canon. The Neo4j graph on scarif is the authoritative record; this spec drives a DB migration (split one album into three) and the corresponding doc updates. The 13 original songs keep their existing Suno audio; reworks are light-touch only.

---

## 1. Core Decisions

| Decision | Choice |
|---|---|
| Split | *A Tapestry of Souls* (1 album, 13 songs) → **3-album saga**, 31 songs total (13 kept + 18 new) |
| Saga modeling | Umbrella title lives as a `saga` property on each album (`saga: "A Tapestry of Souls"`) — no new schema element |
| Era | All three albums are **Era II** (0 GD) |
| Timeline ranges | The Awakening: → 0 GD · The Paradox of Light: 0 GD · Dawn of Ravenspire: 0 GD → the dawn |
| Existing songs | Kept, **light-touch lore anchoring** (structure frozen, ≥70% verbatim, canonical anchors only) |
| New songs | Written lore-first (lyrics first, then Suno generation), `origin: "album"` in the DB |
| Minimum album size | 10 songs per album |
| Queen of Carnage boundary | Seraphina's formal rise + New Ravenspire founding (~150 AGD) stay with *Queen of Carnage*; the trio ends at the *dawn* (arrival + the vow) |
| Vows of Silence boundary | The Shadow Civil War and the resistance founding stay Era I / *Vows of Silence*; backstory songs are personal framing, not civil-war plot |

---

## 2. The Trilogy Structure

**Saga title:** *A Tapestry of Souls* (umbrella, `saga` property)

### Album 1 — *A Tapestry of Souls: The Awakening* (10 songs, 1 kept + 9 new)

Arc: Nyktoros rises → the Legion of Souls → invasion of Nythoria → the war → Vorgos's decision → the Rift → Anya plucked. Ends on a cliffhanger.

| # | Song | Type | Concept / POV |
|---|---|---|---|
| 1 | The Tilt | new | Vorgos — the balance tips (vampiric leak + tyrant's sacrifices). Grave opener. |
| 2 | The Awakening | new | Nyktoros stirs in the Underworld; the first dark breath. |
| 3 | Empire of the Void | kept | Nyktoros's anthem; the Legion declares. |
| 4 | March of the Legion | new | The Legion of Souls unleashed — the war anthem. |
| 5 | The First Stand | new | Seraphina and Valen introduced, defending against the Legion. |
| 6 | The Fall of Ravenspire | new | The invasion of Nythoria; the ancestral ruins burn. |
| 7 | The Unending War | new | The war grinds on; mortals defend ground they can't hold. |
| 8 | Auroria's Lament | new | The Celestial Plane watches its daughter fall. |
| 9 | The Sentinel's Gambit | new | Vorgos's agonized choice to pluck a scholar from Auroria. |
| 10 | Torn from the Stars | new | The Great Rift tears open; Anya pulled from the Crystal Sanctum. Cliffhanger finale. |

### Album 2 — *A Tapestry of Souls: The Paradox of Light* (11 songs, 7 kept + 4 new)

Arc: Anya arrives → meets Valen → meets Seraphina → backstory → Elara's reveal → training → the Tablets → mastering the Rift → Valen's fall (finale).

| # | Song | Type | Concept / POV |
|---|---|---|---|
| 1 | Eternal Nightfall | kept | Anya lands in the Underworld, meets Valen. |
| 2 | After the Snowfall | kept | Anya and Seraphina recognize a shared nature. |
| 3 | What the Dark Took | new | Seraphina backstory ballad — the life the Void destroyed. |
| 4 | Ghosts of Ravenspire | new | Valen backstory — the family the Void took; makes his fall hurt. |
| 5 | Mystic Horizon | kept | Celestial Gardens; Elara reveals The Void-Echo / The Living Lock. |
| 6 | Learning to Fly | kept | Training with Seraphina. |
| 7 | The Last Stronghold | new | The resistance haven; the war closes in. |
| 8 | Shadows and Stardust | kept | The Tablets confirm Anya as the Living Lock. |
| 9 | The Rebel's Blood | new | Anya's first battle alongside the rebels; she proves herself. |
| 10 | Stormbringer | kept | Training peak — Anya masters the Rift via resonance (wields, not claims, Vorgos's power). |
| 11 | Symphony of Suffering | kept | Valen's death — the gut-punch finale. |

### Album 3 — *A Tapestry of Souls: Dawn of Ravenspire* (10 songs, 5 kept + 5 new)

Arc: Anya's resolve → the last charge → the ritual → the farewell → the seal → Nyktoros's rage → the vigil → Seraphina rallies → the exodus → the vow (dawn). Ends at the *dawn*, not the formal founding.

| # | Song | Type | Concept / POV |
|---|---|---|---|
| 1 | For Valen | new | Opener — Anya carries Valen's memory into the last stand. |
| 2 | The Last Charge | new | The assault on Nyktoros; the Rift at full fury. |
| 3 | Eclipse of Destiny | kept | The final ritual during the total eclipse. |
| 4 | Shadows in the Rain | kept | Anya and Seraphina's farewell before the separation. |
| 5 | Endless Night | kept | The seal completes; Anya traps Nyktoros. |
| 6 | The Prisoner's Wrath | new | Nyktoros rages within the seal — it holds. |
| 7 | Haunting Life | kept | Anya's eternal vigil begins. |
| 8 | Celestial Rebellion | kept | Seraphina rallies the survivors. |
| 9 | Across the Rift | new | The exodus over the Great Rift; leaving Anya behind. |
| 10 | The Vow | new | Arrival in Eldoria; the dawn; the promise to build New Ravenspire. Finale. |

**Totals:** 31 songs = 13 kept + 18 new.

---

## 3. Rework Philosophy (13 kept songs)

**Light-touch lore anchoring:**
1. Structure frozen — every verse/chorus/bridge stays; nothing added or cut.
2. ≥70% of original lines stay verbatim.
3. Lore enters only where a generic line begs for it — one canonical anchor per verse, preserving syllable count and rhyme so the melody is untouched.
4. Song identity (hook, title, mood) is sacred; no POV or genre changes unless canon demands it.
5. The aggressive `<Lyrics>` blocks in the current master XML become a *menu* of anchor lines; we graft from them lightly, never wholesale.

**Mandatory canon fixes (wrong as-is, always applied):**
- **Celestial Rebellion:** "Queen of Carnage" (Era III title) → **"Queen of the Fallen"** (Era II; user-approved nod).
- **Mystic Horizon / Shadows and Stardust:** "Impossible Key" → the canon prophecies *The Void-Echo* and *The Living Lock*.
- **Shadows and Stardust:** "the Stone as our guide" → the Tablets.
- **Empire of the Void:** remove the "humble scholar" line — Anya never joins the Void; the anthem stays Legion/Nyktoros POV.
- **Stormbringer:** Anya wields Vorgos's power; she does not literally claim his title.

---

## 4. Boundaries & Canon Locks

- All three albums are **Era II**. The trio tells: the awakening, the war, Anya's arc, the seal, the exodus, and the *dawn*.
- **Queen of Carnage** owns: Seraphina's rise as sovereign (~150–300 AGD), the founding of New Ravenspire (~150 AGD), the Shadow Legion. The trio only *seeds* these (the vow).
- **Vows of Silence** owns: the Acheron/Malakar rivalry (its spine — Acheron's Vow of Silence and defection from Nyktoros, the Threshold Assassination), the Shadow Civil War (Malakar's coup), and the Nythorian Resistance founding (~10 BGD, final-act subplot). Seraphina/Valen backstory in the trio is personal framing only — what the Void took, never re-telling the founding.
- **Crimson Covenant** (~500–100 BGD) is the saga's earliest story, immediately preceding Vows of Silence. Reading order: Crimson Covenant → Vows of Silence → The Awakening.
- **Music is primary; album XMLs are canon.** The media-model rule applies — no in-world character references songs/albums.
- New DB content carries `origin: "album"` (trilogy songs/events) or existing `origin: "game"` stays untouched.

---

## 5. Neo4j Migration (source of truth)

1. **Delete** old Album node `A Tapestry of Souls`.
2. **Create** 3 Album nodes, all `era: "Era II"`, `saga: "A Tapestry of Souls"`, `origin: "album"`:
   - `A Tapestry of Souls: The Awakening` — timeline_range `→ 0 GD`
   - `A Tapestry of Souls: The Paradox of Light` — timeline_range `0 GD`
   - `A Tapestry of Souls: Dawn of Ravenspire` — timeline_range `0 GD → the dawn`
3. **Re-parent** the 13 existing Song nodes (`PART_OF` → new albums) and set `track_index` per the tracklists above.
4. **Add** 18 new Song nodes as written (`origin: "album"`, `PART_OF`, `FEATURES`/`LYRICAL_POV`/`LOCATED_AT` anchors).
5. **Add ~2–3 new Event nodes** (confirm against existing Era II events during work): the fall/invasion of Ravenspire (Era II, distinct from Era III "Fall of Nythoria"), the crossing of the Rift, the vow.
6. **Counts:** 8 → 10 Albums, 103 → 121 Songs.

### Docs to update
- `world_lore.md` — Era II "Relevant Albums" → the three albums.
- `data/lore/xmls/processed_data/era_alignment.md` — Era II album list.
- `data/lore/xmls/album_production_process.md` — status table (A Tapestry of Souls → 3 rows).
- `pitch.md` / `current_progress.md` — album/song counts and progress.
- `CLAUDE.md` — verified DB state counts + relevant-albums references.
- New master album XMLs in `data/lore/xmls/processed_albums/` (3 files); old `A_Tapestry_of_Souls.xml` archived.

---

## 6. Production Notes

- Follow `data/lore/xmls/album_production_process.md`: per-song archive files, user listens to Suno audio before `human_reviewed` / `production_ready`, then master sync, then ACC.
- New songs are written lore-first (lyrics with canonical anchors), then generated in Suno.
- The 13 kept songs are reworked light-touch *before* any re-generation; existing audio remains the reference.

## 7. Open Thread (deferred)

- User has a question about *Vows of Silence* — to be discussed separately from this spec.
