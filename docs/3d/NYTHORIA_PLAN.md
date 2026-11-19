# Nythoria — the plan for its maps (drafted 2026-11-19, from a chat with the user)

Reference art: `assets/art/concept/ravenspire_nythoria.jpeg` (the user's picture of Ravenspire: a gothic citadel of black
spires on a cliff, waterfalls into a misty valley and lake, mountains behind, vines over the stone, violet light in the
windows, crows, a black eclipsed sun with a silver corona).

## 1. What the lore says (checked against the DB and `world_lore.md`, read only)

- **Nythoria is a plane.** DB: *Nythoria — "the Umbral Plane of shadow and silence"*, beside Eldoria (the Material
  Plane) and Auroria (the Celestial Plane), separated by the Aether.
- **The planes share one space.** `world_lore.md`: *"Existence consists of three parallel dimensions occupying the
  same space at different vibrational frequencies… like radio stations broadcasting in the same room."* So the idea
  that Nythoria's land lies where Eldoria's does (the same mountains, rivers and lakes, in their umbral form) **follows
  from canon**. The canon doesn't spell out the geography, so this rule is a game interpretation to approve in
  Phase 10.
- **It fits what we know.** The Obsidian Gate joins the Scarlands (Eldoria) and Nythoria Surface. If the planes share
  one space, its two ends are the same spot, and New Ravenspire stands by the Eldorian end. The Great Rift tears
  "across all three planes", at one spot in each.
- **Old Ravenspire** (DB: *Ravenspire (Ancestral Ruins) — "the destroyed home of Seraphina"*, on Nythoria Surface):
  - ~10 BGD: Seraphina and Valen founded the Nythorian Resistance there.
  - 0 GD: the Legion of Souls' anthem *Empire of the Void* is set there, when Nyktoros awakes.
  - By Eldrin's time (501 AGD) it has been **a ruin for about 500 years**. Seraphina's capital is *New* Ravenspire,
    in Eldoria's Scarlands.
- **Who holds Nythoria in 501 AGD:** Seraphina's Shadow Legion, which conquered Malakar's Obsidian Citadel ~230 AGD.
  Malakar fled into the Shadow Realm (a low-frequency sub-zone) ~250 AGD and formed the Shadow Council ~290 AGD.
  Below all of it is the Underworld, the lowest stratum (Nyktoros sealed, Anya's vigil, the prison), reached through
  the Underworld's Gate at the Great Rift's deepest threshold.

### Ravenspire on Thaloria's spot

Nothing in the lore places old Ravenspire, so putting it where Thaloria stands is new: a game-origin decision for
Phase 10. It is coherent: the same cliff, the same gorge and waterfalls are the best citadel site in both planes. The
user's picture has the same composition as the Eldoria's Prophecy cover the 3D Citadel of Thaloria was built from:
a citadel on a cliff, waterfalls into a misty river valley, mountains behind.

### Is the picture consistent?

- **Consistent:** the setting, the mood, the cliff, the waterfalls, the eclipse light, the crows, the vines of long
  neglect.
- **Not consistent with "destroyed ruins":** the citadel stands whole and its windows are lit.
- **Proposed:** in the present day (501 AGD) the map shows **Ravenspire in ruins, keeping the picture's silhouette**:
  - the great spire still standing, its crown broken;
  - flanking spires fallen;
  - walls gaping, vines everywhere;
  - the violet light reduced to a few haunted windows (whose light is a lore question).
- **The picture as it is** would be Ravenspire **before its fall** (~10 BGD → 0 GD): a memory or vision scene, or a
  map for a future campaign in Seraphina's era.

## 2. Decisions to approve (they join the Phase 10 canon check)

- [ ] **N-1** The geography rule: each Nythorian place is the umbral twin of the Eldorian place in the same space (same
      landforms, different surface and builders).
- [ ] **N-2** Old Ravenspire stands on the twin of Thaloria's citadel cliff.
- [ ] **N-3** In 501 AGD it is a ruin (the picture's silhouette, broken); the picture as it is shows it before its fall.
- [ ] **N-4** Nythoria's sky: a black eclipsed sun with a silver corona, in grey and violet (canon only says "shadow and
      silence").
- [ ] **N-5** Twin sites for the other places (proposals):
  - **the Black Well** ↔ Lake Aethera (a well of the dark where the lake is);
  - **the Shadow-Vale** (where Valen fell) ↔ the Heartlands' plain by the Crossroads;
  - **the Obsidian Citadel** ("built upon the ruins of the old world") ↔ to choose (the Summit range? Iron Hollow's
    hills?);
  - **the Obsidian Gate's Nythorian end** ↔ the Scarlands, east of Graywatch;
  - **the Great Rift** ↔ to place in Eldoria first (the DB has no position for it).
- [ ] **N-6** Which era the maps show: 501 AGD (Eldrin's time) by default, other eras only through visions or other
      campaigns.

## 3. How Nythoria maps are made

- **Twins.** A Nythoria map can be built as the twin of an Eldoria map. The region JSON gets
  `"plane": "nythoria", "twinOf": "<eldoria map id>"`. The builder takes the twin's heights, rivers, lakes, cliffs,
  ridges and paths, then re-skins and repopulates them:
  - **Ground:** ash-grey grass and bare rock.
  - **Trees:** dead and black, bare branches.
  - **Water:** black still water under a lying mist; waterfalls stay.
  - **Buildings:** none of Eldoria's. Ruins, and Nythorian building (gothic, black stone, violet-glass windows).
  - **Life:** crows and bats; no deer, no farm animals.
- **The sky:**
  - A `plane: 'nythoria'` preset in `engine/sky.js`: the eclipse disc with its corona, a grey-violet ambient light,
    cold silver rim light, and a slow, dim day.
  - Ash drifting in the air; mist banks in the low ground.
- **Getting there** (Eldrin's campaign never goes to Nythoria, so these maps are for exploring, the end of the game and
  future campaigns):
  - through the **Obsidian Gate** in the Scarlands (needs the Scarlands and New Ravenspire built first);
  - or through the **Great Rift**;
  - the god-mode Aetheric Tear lists them for testing.
- **Lore safety:** every new name or claim goes into `docs/3d/LORE_REVIEW.md` and the Phase 10 check before it becomes
  canon. No new characters are invented in Nythoria until they have been checked.

## 4. Steps

| Step | What |
|---|---|
| **N0** | The decisions in §2 approved (with Phase 10) |
| **N1** | Engine: the `nythoria` plane (eclipse sky, palette, mist, ash, crows); twin building in `engine/region.js`; a Nythorian kit: dead trees, black-stone ruins, broken spires, gothic arches, violet windows, vines |
| **N2** | **Ravenspire (Ancestral Ruins)** — the first map, Thaloria's twin: the citadel cliff and gorge, the river and waterfalls, the misty valley lake. The Ravenspire model built after the picture (the great central spire, flanking spires, buttresses, lancet windows, vines), in its ruined state (with a "before the fall" switch for a vision scene). The view of the picture is a landmark: the rocky outcrop facing the citadel across the valley. |
| **N3** | The way in: the Scarlands (Eldoria) with the Obsidian Gate and New Ravenspire, and the Gate's Nythorian end; or the Great Rift |
| **N4** | The Surface around it: twins of the Glade and the East Road, the Shadow-Vale (Valen's battlefield, 0 GD), the Black Well, the Obsidian Citadel (Seraphina's since ~230 AGD) |
| **N5** | Below: the Underworld (dungeon levels — the Sanctuary, the Prison) through the Underworld's Gate; the Shadow Realm (Malakar's exile, the Shadow Council) as a faded, low-frequency map |
| **N6** | Who lives there: the Shadow Legion, Nythorians (elven kin, shadow-skinned), Void creatures (void crawlers, soul eaters, rift walkers) — after the canon check |
