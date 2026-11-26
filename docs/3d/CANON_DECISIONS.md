# Canon decisions — the sheet for our decision session (prepared 2026-11-20)

## ✅ Decided with the user (2026-11-20) — applied in the game
- **The Citadel is the college** (the Great Library inside, the Forbidden Archive beneath it). The building on the city's
  crown is **the Scholars' Hall** (not "Archivists' Hall": the Archivists' Guild already exists).
- **Valdric is replaced by real places** in the spell descriptions: siege engineer and assassin → Graywatch; miners and
  quarrying → Iron Hollow; old forests → Whisper-Wood; philosophers → Thalorian; the grandmother → Duskmeet.
- **The Asran Academy → the College of Thaloria** (4 mentions).
- **The Twilight Order → the Order of the Grey Hour**; the Twilight Fang → **the Dusk-Fang** (item id kept).
- **The Arcane Concord** = the ancient order that founded the College; **the Rift-Gates** and **the Border Watch**: game-origin lore.
- **Synced to the DB (read back):** Organization The Star-Guard (album), Location The Citadel of Thaloria (game; the
  Forbidden Archive now nested under it), Organizations The College of Thaloria, The Arcane Concord, The Border Watch
  (game), Artifact The Rift-Gates (game). No new relationship types (links are in descriptions).
- Still to decide: **Silvara**, and the smaller rows below; Nythoria's N-1, N-2, N-4, N-5, N-6.

Each new name the game uses, what the lore DB and the book say about it (searched 2026-11-20), and my
recommendation. **Nothing is written to the DB until you decide.** Tick or change each line; then I sync the approved
ones (DB nodes get `origin: "game"`, or `"album"` where the albums already say it).

## Already canon — the review was wrong to list them as missing
| Name | Found | Recommendation |
|---|---|---|
| **The Star-Guard** | DB: *Beyond the Veil of Twilight* (Kael "the Star-Guard of Eldoria"), songs *Blood and Shadows*, *Dreamweaver's Call*; the book (9 files) | Canon. Add an `Organization` node "The Star-Guard" (`origin: album`), Kael `MEMBER_OF` it. |
| **0 GD / AGD** | The book; the DB's songs use "900 AGD" | Canon. Note the epoch in the DB's `Event` timeline (no new node needed). |
| **The college, the bell tower, the East Gate** | The book (ch01–ch04: the college, its Archive beneath, the bell's "serene inaccuracy", the East Gate at dawn) | Canon (book). |

## ⚠️ One real conflict to settle first
**Where is the college?** The book: the Forbidden Archive is "iron rooms beneath the college". Our earlier decision put
the Archive "in the city, beneath the Citadel" (DB position moved). The new city now has *both* a college on its crown
and the Citadel across the gorge.
- **Recommendation: the Citadel *is* the college** (the "library-palace", the Great Library inside it, the Archive
  beneath it — matches the book, the DB move and the album cover). The building on the city's crown becomes the
  **Archivists' Hall** (the scholars' guild of the city), and the college quarter keeps its name.
- Alternative: the crown building is the college, and the Citadel is the royal seat (the Archive would move under the
  crown — DB position change).

## Game names to decide (not in the DB, not in the book)
| Name | Where it comes from | Recommendation |
|---|---|---|
| **Valdric** (siege engineers, miners, assassins, philosophers) | 7 spell descriptions from the 2D game | **Replace** with real places: miners → Iron Hollow, siege engineers/assassins → Graywatch, forests → Whisper-Wood, philosophers → Thaloria. No new land. |
| **The Asran Academy** (spell tiers, textbooks, banned texts) | 4 spell descriptions | **Rename to the College of Thaloria** — Thaloria is "the scholarly kingdom"; one academy, not two. |
| **The Arcane Concord** (renamed from "Covenant" earlier) | items, dialogues, a hidden quest | Keep, `origin: game`: the old order of mages who founded the College. Its staff and blade stay. |
| **The Twilight Order** + the Twilight Fang | a hidden quest, a dagger | **Rename** (it collides with the album *Beyond the Veil of Twilight*): e.g. "the Order of the Grey Hour" / "the Dusk-Fang". |
| **The Rift-Gate network** (Aetheric Monoliths) | world_lore.md, the game's fast travel | Keep, `origin: game`: an `Artifact`-type entry "The Rift-Gates", discovered not built. |
| **The Border Watch** of Graywatch | graywatch region | Keep, `origin: game` (`Organization`, `HIDDEN_IN`→ no; `BASED_AT` Graywatch). |
| **Silvara** (forest merchant-scout) | the archived 2D game, one quest | Keep as a minor game NPC (no DB node) — or drop with the 2D quest. |
| **The Lower Town, the Thalorian Wilds, the Corrupted Rim, the Hermit's camp, the Summit Pass** | game places | Keep game-side (map names), no DB nodes yet — add them when the album/book needs them. |
| **Thaloria's quarters** (Scholars', Market, Temple, Crafts, Gate) and **the South, West and North Gates** | the new city plan (today) | Keep as plain descriptive names (not lore). |
| **The 15 biome names** (whisper forest, ash lands, ruined moor…) | the biome registry (today) | Game-side terms only (the editor's), never presented as lore names. |
| **The four dungeons and their bosses** | game | Keep game-side; promote any that a chapter uses. |
| **116 creature kinds** | game | Keep game-side; no `Creature` label in the DB for now. |
| **Werewolves as a playable race** | game | Keep (the DB has `Race: Werewolf` and the Guardians of the Wild — album canon); the playable change is a game mechanic. |

## Nythoria's open decisions (from NYTHORIA_PLAN.md)
N-1, N-2, N-4, N-5, N-6 — ✅ **decided** (recorded 2026-11-26, canon check A8): settled by the world plan approved on 2026-11-22 (WORLD_PLAN.md) — the twin land, old Ravenspire's ruins on the citadel's twin spot, the eclipse sky, twins only where they make sense, the world shown in 501 AGD.

## ✅ Decided with the user (2026-11-26) — the canon check (`CANON_CHECK.md`)
- A1 the 2D-only quests and Silvara dropped from the rules · A2 the Anchor rumor comes from a Port Silver captain (the book's inn) · A3 the student's line made age-neutral · A4 Shadow Veil's "Void Wraith" gone · A5 the Forest Elemental added to the DB (album) · A6 thin places in world_lore's cross-planar table · A7 the Sanguine Vaults stay where the DB puts them · A8 Nythoria's N-decisions recorded.
- **Eldrin's age:** **34** at the beginning of Eldoria's Prophecy (501 AGD), born ~467 AGD (user, 2026-11-26; written to the DB: `age_at_quest: 34`, `born: '~467 AGD'`). The book's "~60" must be revised.
