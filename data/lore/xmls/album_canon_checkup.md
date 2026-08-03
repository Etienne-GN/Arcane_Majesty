# Album Canon Checkup (ACC)

A small, repeatable verification that **every album** content — album plot, each
song's plot, and the lyrics — is anchored to the **locked lore**, and that the
lore is documented and coherent with the plot.

This is the **canon-integrity** companion to `album_production_process.md`
(which is about producing lyrics for Suno). Run ACC **after** an album is
production-ready, and **again after any book / lore task** that could shift canon
(e.g. a novel, a rework, a new game doc).

## Prerequisites

- Neo4j graph reachable (schema in `CLAUDE.md`). If it is down, mark the
  graph-sync items as `BLOCKED` and re-run them later — never assume.
- The album's master XML: `data/lore/xmls/processed_albums/<Album>.xml`
  (`AlbumPlot`, `Act`, `Song{song_id, Tone, Plot, Lyrics, analysis}`).
- Locked-lore sources: book canon `books/<title>/canon/*.md` (Book Canon
  Summaries), `world_lore.md`, `data/lore/magic_system.md`, `data/lore/bestiary.md`.

## Checklist

### A. Album plot ↔ locked lore
- [ ] `AlbumPlot` timeline/era matches the graph `Album` node (`timeline_range`, `era`, `global_timeline`) and `world_lore.md`.
- [ ] Every named character, place, artifact, event in `AlbumPlot` exists in the canon docs or graph — if not, it must be ADDED with correct `origin` (`"album"`), not left dangling.
- [ ] No claims contradict the locked canon (e.g. someone dies who survives, an artifact behaves differently than established).

### B. Song plots ↔ album plot
- [ ] Songs are in narrative order (`song_id`/`track_index`), each advancing the album plot with no invented events or skipped beats.
- [ ] POV is consistent per song (the `FEATURES`/`LYRICAL_POV` graph relationships match the actual lyrics).
- [ ] Song `<Plot>` and `<analysis>` agree on what happens; `analysis` has no stale rationale from an older draft.

### C. Lyrics ↔ song plot & lore
- [ ] Lyrics reference the correct characters, places, artifacts, and timeline facts (specific, not generic).
- [ ] **Canonical spellings** (e.g. Heartstone, one word; Aether Sight; Star-Guard) — no drift.
- [ ] No claim contradicts locked lore — *especially* the guardrails:
  - metaphoric-only blindness, untamable Balrog (never forced/tamed/kneels),
  - Heartstone as Cosmic Insulator that rejects unworthy hands,
  - the 400-year vigil / "a hundred years, and then three more",
  - Generals' fates (Malphas retreats alive, Xarathos destroyed, Voraun at the gates).
- [ ] Character titles are consistent (e.g. Vorgos = Stormbringer/Architect; flag alternates like "Dreamweaver" for standardization).

### D. Lore documentation & graph sync
- [ ] Every new node the album introduces exists in Neo4j with `origin` set, key attributes populated.
- [ ] Relationships present and correct: `PART_OF`, `FEATURES`, `LYRICAL_POV`, `LOCATED_AT`, `OCCURRED_IN`, `MENTIONS`, `REVEALS`.
- [ ] Graph counts (songs, characters, locations) match the album XML (12 songs per album, etc.).
- [ ] If a book exists for the album: the book's `canon/*.md` Book Canon Summary is current.

### E. Book-lore reconciliation (book-is-canon rule)
- [ ] Where the album text and the locked book differ, EITHER refine the album text OR record a deliberate override — never leave a silent conflict.
- [ ] For each deviation, write one line in the report: `song N / field — old claim → locked canon → action (refine | document-override)`.

## Output

Write a report to `data/lore/xmls/acc/<Album>_checkup.md`:

| Item | PASS / FAIL / BLOCKED | Evidence (song/field + quote) | Action |
|---|---|---|---|
| A…E | … | … | … |

Then either apply the fixes (small, safe) or hand the deviation list to the user.
Mark the album's ACC status in `album_production_process.md`'s status table.

## Definition of done

Every item PASS (or BLOCKED only for graph-sync, with a re-run scheduled).
No silent conflicts between album content and locked lore.
