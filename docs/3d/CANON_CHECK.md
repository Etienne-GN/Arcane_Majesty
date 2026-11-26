# Canon check — `LORE_REVIEW.md`, item by item (2026-11-26)

Checked against the lore DB on scarif (147 nodes, 318 relationships, 103 songs — read only, nothing written), the album
XMLs, the book (`books/eldorias_prophecy/`, canon files and manuscript), `world_lore.md`, `data/lore/world_systems.md`
and the decisions of 2026-11-20 (`CANON_DECISIONS.md`). Checked against the **current code**: `LORE_REVIEW.md` still
quoted spell texts rewritten on 2026-11-20 (Valdric and the Asran Academy are gone from the code).

**How to answer:** for each decision, keep my recommendation or write yours. For the sections below, a ✔ line is my
proposed verdict — strike it or change it if you disagree. Then I apply: code fixes first, then the DB sync (only the
lines marked *DB*), with `origin: "game"` (or `"album"` where the albums already say it).

Verdict words: **keep** (as it is, game-side, no DB node) · **DB** (add a node to the DB) · **rewrite** (change the
game's text) · **drop** (remove from the game) · **done** (already settled).

---

## A. Decisions for you (8)

1. **The 2D leftovers: Silvara and 13 quests nobody can reach in 3D.** These quests: The Forest Hunt, Silvara's Supply
   Run, Echoes of the Ancient Ones, Initiation of the Order of the Grey Hour, The Concord Scholar, The Hunter's Trial,
   Void-Touched Beasts, The Void Fragment, The Hermit's Offering, The Hermit's Remedy, Shadows at the Threshold, The
   Frozen Camp, The Widow's Watch, Echoes in the Rime. They have no giver in 3D, nothing starts them, and some name the
   2D game's Hermit or Silvara. Silvara is in no canon (DB, albums, book).
   → **Recommend: drop them from the rules** (the 2D game is frozen with its own copy at tag `amo2d-final`). Their good
   ideas can come back as 3D quests later: the Summit's Frozen Camp, Widow's Watch and Rime Hollow fit the mountain.
2. **"The Anchor" — where Eldrin hears the rumor.** The book (canon/events.md): Legion agents ask about "the Anchor";
   Eldrin learns of it "via a trader's rumor (Port Silver) at an inn". The game: Thaloria's trader tells it (Trader's
   Rumor). → **Recommend: rewrite lightly** — the Thaloria trader heard it from a Port Silver captain at the inn. The
   book stays true and the quest stays where Eldrin can take it.
3. **The Lower Town's student:** "They say the Keeper of the Archive hasn't opened it in a lifetime." The book (ch. 3):
   Eldrin has held the Archive's key for thirty years and uses it. → **Recommend: rewrite** — "They say one old scholar
   has held the Archive's key for thirty years. No one else has seen past the iron door."
4. **Shadow Veil's spell text:** "The Void Wraith's corruption left a residue in Eldrin's mana pathways." No Void Wraith
   exists anywhere in the canon. → **Recommend: rewrite** — "A shadow-creature's touch on the winter road left a residue
   in Eldrin's mana pathways…" (the rest unchanged).
5. **The forest Elemental** of the Sylvan Sanctuary is canon (the DB's Hermit "bound his spirit to the Sylvan Sanctuary's
   forest Elemental"; the event *The Elemental's Trial*; the book), but it has no node. → **Recommend: DB** — a
   `Character` "The Forest Elemental", origin `album`, `ORIGINATES_FROM` the Sylvan Sanctuary, `INVOLVES` from the trial.
6. **Crossing the veil (2026-11-25).** The DB backs it: event *Acheron's Crossing* ("frequency-masters crossed the
   Aether directly… across the thinning veil"); Whisper-Wood ("where the planar veil thins"); the Sanguine Vaults
   ("frequency dips close to Nythoria's"); Malakar's "cross-dimensional strike". The crossing Tear at thin places extends
   the Aetheric Tear (`world_lore.md`: "any visited coordinate"). → **Recommend: keep**, and add one row to
   `world_lore.md`'s Cross-Planar Travel table: *Thin places · the veil worn thin · same spot, the other plane · Acheron
   (pre-Rift), Eldrin (late-game, at a great cost)*. **No DB node** for the mechanic.
7. **The Sanguine Vaults' capital.** The album (*Crimson Covenant*, ~220 BGD): "a subterranean metropolis built beneath
   Eldoria's capital city". The DB places the Vaults at their own spot, away from Thaloria, and the game follows the DB.
   → **Recommend: keep** (the capital of ~220 BGD need not be Thaloria; nothing says it is) — unless you know which city
   it was.
8. **Nythoria's open decisions N-1, N-2, N-4, N-5, N-6** (`NYTHORIA_PLAN.md`) were still open in the 2026-11-20 sheet,
   but the world plan of 2026-11-22 (approved with you) built Nythoria on them: the twin land, Ravenspire's ruins on the
   citadel's twin spot, the eclipse sky, twins only where they make sense, the world in 501 AGD.
   → **Recommend: done** — record them as decided by the world plan.

---

## B. Proposed verdicts by section

### Summary items (LORE_REVIEW top)
- ✔ **done** — Valdric (replaced by real places), the Asran Academy (→ the College of Thaloria, *DB* already), the Arcane
  Covenant (→ the Arcane Concord, *DB* already), the Twilight Order (→ the Order of the Grey Hour, the Dusk-Fang), the
  Rift-Gates (*DB* already), the Border Watch (*DB* already), 0 GD (book; the DB's songs use AGD), the Star-Guard (*DB*
  already), the Citadel of Thaloria and the Great Library (*DB* already) — all settled 2026-11-20.
- ✔ **keep** — the Lower Town, the Thalorian Wilds, the Mountain's names, the Corrupted Rim, the Hermit's old camp (map
  names; a DB node when a story needs one). The Corrupted Rim and the Hermit's camp were listed as "DB sync owed":
  → recommend **keep** game-side too, for the same reason.
- ✔ **keep** — the dungeons and their bosses; 116 creature kinds (no `Creature` label in the DB) — settled 2026-11-20.
- ✔ **keep** — werewolves playable (a game mechanic on the DB's `Race: Werewolf`) — settled 2026-11-20.
- Silvara → decision A1.

### 1. Places
- 1.1 regions already in the DB (Duskmeet, Graywatch, Iron Hollow, Lake Aethera, Port Silver, the Crossroads, the
  Emerald Fields, the Fire Gate, the Inferno Labyrinth, the Ruins of Eldoria, the Sylvan Sanctuary, Whisper-Wood): their
  lore lines, signs and landmarks agree with their DB descriptions. ✔ **keep**. Two notes:
  - The Fire Gate's sign ("WHO GOES DOWN IS NAMED. WHO IS NAMED IS WEIGHED.") matches the book's gate of flame. ✔
  - The Emerald Fields' cabin sign ("K · A", swept) fits the DB's Hidden Cabin (Kael and Anya's sanctuary). ✔
- 1.1 not in the DB: Summit of Despair — the Approach, the Lower Town, the Citadel's terrace (*DB* already as the
  Citadel). ✔ **keep** (map names).
- 1.2 places built in code — the glade, the East Road and its Waystone, the Hollow, the Mountain and its cairns, Widow's
  Overlook, the Rime Hollow, the Frozen Basin, Thaloria's gates and interiors, Eldrin's Tower's rooms, the four
  dungeons. ✔ **keep**. The tower's Study and the Archive's iron door agree with the book (ch. 1, ch. 3).

### 2. People
- 2.1 Silvara → A1. The forest Elemental → A5. **The Alpha** of the Guardians: canon (the DB's event *The Truce of the
  Emerald Fields*: "The Wolf Alpha"). ✔ **keep**. Dungeon bosses ✔ **keep** (game-side). Thaloria's roles (innkeeper,
  smith…) ✔ **keep** — roles, not names.
- 2.2 villagers of the regions: plain roles, and their lines agree with the DB and the book, but for the student (A3).
  ✔ **keep**. Checked lines: the Well-keeper's "stone-faced old wizard from the west" (Eldrin passing — fine); the
  Dockhand's "black sails" (a rumor, no claim); the Scribe's "the originals stay in the Citadel" (agrees with the Citadel
  as the College).

### 3. Institutions
- ✔ **done** — all settled 2026-11-20 (above). "The capital" (Silvara's scholar) goes with A1.

### 4. Creatures
- ✔ **keep** game-side (settled). The bestiary texts checked: none contradicts canon. Notes:
  - Cinder-Soul ("travellers… who answered when the gate of flame called them by name") — the book calls them "the
    burned, the ones the fire took before their time": compatible. ✔
  - Grave-Wraith / Cursed Knight ("keepers of the vigil") — fit the Ruins as "the ruins of a vigil". ✔
  - The Forest Wolf "driven by the Void General's will" — Malphas is a Void General (DB). ✔
  - Void Scout "possibly once a Concord soldier" — the Concord is game canon (DB). ✔

### 5. Items
- ✔ **keep** — names and flavour make no claim against canon (the Warlord's Cleaver and the Concord's staff and blade
  settled 2026-11-20). The review's "Twilight Fang" and "Staff of the First Covenant" are old names — the code says the
  Dusk-Fang and the Staff of the First Concord.
- Eldrin's Journal (Oren takes it): canon (DB: Oren "takes the journal with the coordinates"). ✔

### 6. Story
- 6.1 chapters 6–12 ✔ **keep** — each maps to a DB event; the Voraun fight settled 2026-11-20. Added 2026-11-25 from
  the book (ch. 13–14, 22): the vow, the gate of flame, the golems, the Magma-Eaters and Cinder-Souls trial, the
  Hermit's return — book canon, not new lore. ✔
- 6.2 Malphas ✔ **keep** — matches the DB ("Aether Sight and the refusal of fear break his hold… retreats ALIVE").
- 6.3 quests: the 2D ones → A1; Trader's Rumor → A2; the rest (Odyssey's Dawn, Read the Erasure, the Scholar's
  Saddlebags, the Sanctuary's three, Whisperer of Doubt, bounties) ✔ **keep**.

### 7. Flavour text
- 7.1 spell texts (current code): ✔ **keep**, except Shadow Veil (A4). Notes: the Graywatch "siege engineer" and
  "assassin" (Flame Lance, Eclipse Mark) were your 2026-11-20 choice. Stone Skin's "treants of Eldoria" are game
  creatures; fine as flavour.
- 7.2 the Hermit's and the Elemental's lines follow the book (ch. 9–10, ch. 22). ✔

### 8. Races
- Werewolves playable ✔ **keep**. How the elven races look (Aurorian light, Nythorian shadow skin, Fallen veins) ✔
  **keep** (looks, no lore claim). Dwarves — not in the lore; your call (TODO §14).

### 9. Already in the DB as game-origin
- The Silver Coast, the Heartlands, Port Silver, the Crossroads, Iron Hollow, Graywatch, the Sunken Temple, Duskmeet, the
  Weeping Stones, Lake Aethera, the Silverrun: their game texts agree with their nodes. ✔ **keep**.

### Added by the run of 2026-11-25
- Quests for levels 31–50 (The Edge of the Wound … The Wrong Hill) ✔ **keep** (game-side; no DB nodes).
- The Legion post on the Rift's lip; the bone gate of the Obsidian Citadel (DB: "Malakar's fortress-palace… of basalt and
  bone") ✔ **keep**.
- The Black Lake's Underworld spawn (WORLD_PLAN) ✔ **keep**.
- The Outlander ✔ **keep** (a game status).
- Across the veil → A6. The sealed reliquary ✔ **keep** (game-side).
- The Sanguine Vaults' inside (the tithe halls, the soul-cisterns, the Tithe-Keeper, What Drinks in the Cisterns): the
  DB's "Soul-Bank of the Crimson Covenant" backs the halls and cisterns. ✔ **keep** game-side; the capital → A7.

---

## C. What applying this does
1. **Code** — A1 drop the 2D-only quests (and Silvara's dialogue); A2 the trader's line; A3 the student's line;
   A4 Shadow Veil's text.
2. **Docs** — A6 one row in `world_lore.md`; A8 the N-decisions recorded; `LORE_REVIEW.md` ticked and closed.
3. **DB** (the only write) — A5 the Forest Elemental (`Character`, origin `album`, two relationships).
