# ACC Report — Eldoria's Prophecy

Per `data/lore/xmls/album_canon_checkup.md`. Run: 2026-08-03, after the first
AI-written book draft locked the canon. Graph-sync items BLOCKED at the time (Neo4j
not reachable at 192.168.0.159:7687); **re-run 2026-08-03 — D now PASS** (see below).

## Revision 2026-08-03 (media model)

User-confirmed creative rule applied to the book: **characters never reference
the songs or the album** ("like Jesus referencing the New Testament"). The album
is one external medium telling the story; the novel is Eldrin's story in his own
world. All "the songs" references in the manuscript were scrubbed (→ "the old
tales" / "the vision" / "the record"), the Balrog faceoff was added to ch20, and
a long-life hint was added to ch21. The album XML is **unchanged** — the album
keeps its own telling (deviations below are now documented overrides, not bugs).

## Summary table

| Item | Verdict | Evidence | Action |
|---|---|---|---|
| A. AlbumPlot ↔ lore | **PASS** (2 notes) | Timeline ~500 AGD ✓, Kael ~300 AGD ✓, Heartstone as Cosmic Insulator ✓, "bridge between tragedy of the past and salvation of the future" = exact book phrase | Note: "immortal guardian" + "sleeper agent" wording (below) |
| B. Song plots ↔ album plot | **PASS** | 12 songs in narrative order, clean 3-act mapping (fidelity-log matches track 1-12) | none |
| C. Lyrics ↔ song plot & lore | **PASS** (6 resolved) | many exact shared phrases; conflicts closed as media-model overrides | see E |
| D. Graph sync | **PASS** | Neo4j reachable; gaps closed 2026-08-03 (see below) | re-verify on next album/campaign task |
| E. Book-lore reconciliation | **6 resolved** | all decided by user; book rewritten | see E |

### D — Graph sync results (re-run 2026-08-03, DB up)

Queries from the original checkup, now resolved:

1. `MATCH (a:Album {title:"Eldoria's Prophecy"})<-[:PART_OF]-(s:Song) RETURN s.title, s.track_index, s.origin ORDER BY s.track_index` — **12 songs ✓**, all `origin: album`.
2. Song→Character/Location + Event→Song completeness — **fixed**. Added:
   - **G4** `LYRICAL_POV`: Eldrin on all 12 EP songs.
   - **G3** `LOCATED_AT`: coarse Plane-level links replaced with the specific location per song (Eldrin's Tower, Summit of Despair, Sylvan Sanctuary, Fire Gate, Inferno Labyrinth, Ruins of Eldoria, The Ancient Door, Thaloria).
   - **G5** `OCCURRED_IN`: linked the 3 album events + added 7 granular book-canon events with a `PRECEDES` chain (`The Race for the Anchor`, `Malphas Forced to Retreat`, `The Elemental's Trial`, `Oren's Betrayal at the Fire Gate`, `Xarathos Destroyed in the Crucible`, `The Shadow Balrog Yields`, `The 400-Year Condition Revealed`).
3. New book-canon locations/characters with `origin` set — **fixed**. Added **G1** six characters: Oren, The Hermit, Malphas, Xarathos, Voraun, The Shadow Balrog (role/description/backstory from `canon/characters.md`; rels: `SERVANT_OF` Legion of Souls, `ENMITY_WITH` Eldrin, `KILLED` Xarathos+Voraun by Eldrin, `PART_OF_RACE`). Added **G2** four locations: Fire Gate, Inferno Labyrinth, Ruins of Eldoria, The Ancient Door; reparented Heartstone Chamber → Ruins of Eldoria.

Remaining notes (not errors):
- **G6** "Eldoria's Prophecy" is the album title, not an in-world prophecy node — the
  in-world prophecy is *The Living Lock*. No node added; keep media vs prophecy distinct.
- **G7** The Hermit's hut is in **Sylvan Sanctuary**; the DB's **The Hidden Cabin** (in
  The Emerald Fields) is Kael's exile home — distinct, do not merge.

Campaign review: see `data/lore/campaigns/Eldorias_Prophecy_campaign.md` (ACR, 2026-08-03).

## C — What is strongly anchored (evidence, no action needed)

- Song 2: "The Lock will fail," "Find the Anchor" = exact book (ch02); "The Architect has moved a pawn today" = exact book (i3).
- Song 4: "Ice-kissed peaks, a barren expanse" = exact book (ch06-08 anchor).
- Song 5: "A valley green amidst the snow," Elemental's "Why do you seek the light of day?" = exact book (ch09).
- Song 6: "Treachery's bite, a sudden sting, the dagger that the shadows bring," "He seeks the Stone to break the seal" = exact book (ch12).
- Song 7: "No friends to lose, no trust to break," "A pawn upon a cosmic board" = exact book (ch13).
- Song 8: "A wall of fire, a gate of flame, that calls me by my given name," "It burns the fear, it burns the doubt," "Ashes fall, a new dawn breaks" = exact book (ch14-16).
- Song 9: "The ancient ruins hum a tune, beneath the pale and silent moon," "A pulse of light, a rhythm slow" = exact book (ch17-18). "A power vast, a cosmic seed" = deliberately quoted BY the book as the in-universe lie ("the old tales called it a power vast, a cosmic seed... and they were wrong") — keep.
- Song 10: "A shadow rises from the floor, the guardian of the ancient door. It hungers for the light I hold" = exact book (ch20).
- Song 11: "He steps from time, a storm of grey," "Put down the Stone, and walk away," "A hundred years, and then three more," "My friends will die, my world will change" = exact book (ch21).
- Song 12: "I am the watcher, here and now," "Until the Star-Guard needs the key" = exact book (ch23).

## E — Deviations, all resolved (book is canon; album = external medium)

| # | Song/field | Album claim | Book canon (final) | Resolution |
|---|---|---|---|---|
| 1 | 10 / chorus | "I force the shadow entity to kneel" | Balrog untamable, never forced or commanded; yields, satisfied | **Override accepted** — user: "this is a metaphor, it's ok". Album keeps the heroic chorus; book is the true record |
| 2 | 10 / plot | "corrupted by dark forces... seeks the Heartstone. A final confrontation... determine the fate of the world" | Ancient untamable guardian (not corrupted); guards the door, hungers for light, does not seek the stone; **a real battle now exists** (ch20) | **Override accepted** — user wanted Eldrin to fight the Balrog: ch20 now has a full magical duel (runes/ward/beacon/staff/sight all absorbed; hunger pins him; "the duel was over, and the Balrog had won it") ending in humility/settling |
| 3 | 11 / V1 | "The beast is tamed, the Stone is mine" | Balrog never tamed; stone is held, not owned; Eldrin "won" only metaphorically | **Override accepted** — user: "Eldrin won, which is metaphoric; the Balrog is not tamed as his balrog". Book: not defeated, not commanded, not bargained with — it settled |
| 4 | 12 / plot | "emerges victorious, having defeated the dark guardian... as a master mage" | Balrog not defeated (lost the duel by force, won the encounter by humility); Eldrin IS a mage and fought as one | **Override accepted** — user: "Eldrin IS a mage and he won the fight" (won = kept the Stone, passage opened). Book updated so he fights as a mage |
| 5 | AlbumPlot + 11 / analysis | "immortal guardian" / "400-year immortal watcher" | Long-lived, not immortal; ch21 hint added: "the years fold around him without folding him"; he can live as long as he's not killed | **Override accepted** — user: not immortal, cover in a later work; hint line added to the book |
| 6 | 7 / V1 | "I leave him bleeding in the snow, the friend who turned into a foe" | Oren leaves ELDRIN bleeding in the snow (ch12); ch13 shows Eldrin leaving his old trusting self | **Override accepted** — user's snow question answered: in the book the traitor (Oren) leaves Eldrin; the album's first-person line is the album's own telling. No in-book inversion framing (book never references songs) |

Minor (non-blocking) notes:
- Song 2 "Dreamweaver" as Vorgos title + plot "a command from the Aether" — standardize to Stormbringer/Architect, and soften "command" (book: he never forces pieces) if desired.
- Song 2 "Kael explodes" — book: Star-Guard shatters against the violet sky (loose but acceptable).
- Song 12 "to watch until the end of time" — vigil is 400 years to 900 AGD, not eternity (minor).
- Songs 3, 4, 5, 6, 8 residual plural "we" POV — production-process item (already known), not lore.

## D — Graph-sync queries to run when Neo4j is up

1. `MATCH (a:Album {title:"Eldoria's Prophecy"})<-[:PART_OF]-(s:Song) RETURN s.title, s.track_index, s.origin ORDER BY s.track_index` — verify 12 songs, titles, origin.
2. Verify Song→Character `FEATURES`/`LYRICAL_POV`, Song→Location `LOCATED_AT`, Event→Song `OCCURRED_IN` completeness for this album.
3. Verify any new locations/characters from the book (`canon/*.md` Book Canon Summaries) have graph nodes with `origin` set.

## Status

- ACC findings: **PASS (A, B, C) + 6 deviations resolved (E) + D PASS (re-run 2026-08-03)**.
- Follow-up: all 6 deviations closed as media-model overrides (album = external
  telling; book is canon). Manuscript revised accordingly (song references
  scrubbed, Balrog duel added to ch20, long-life hint in ch21). D graph sync
  complete 2026-08-03 (G1–G5 fixed; G6/G7 documented notes). Campaign bible
  written — `data/lore/campaigns/Eldorias_Prophecy_campaign.md`.
