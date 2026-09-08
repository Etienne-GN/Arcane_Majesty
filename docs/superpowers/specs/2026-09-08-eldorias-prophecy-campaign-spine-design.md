# Eldoria's Prophecy — Campaign Spine Design

**Status:** approved in conversation 2026-09-08; ready for an implementation plan.

## Context

Eldoria's Prophecy is already designed. What is missing is the machinery that
makes it a campaign in the game rather than a document.

Already in the repo:

- `data/lore/campaigns/Eldorias_Prophecy_campaign.md` — the campaign bible:
  twelve songs across three acts, a location path, an ability unlock ladder,
  and five boss designs.
- `data/lore/campaigns/eldorias_prophecy/*.md` — ten per-location map specs
  (~1100 lines) with narrative anchors, geography, connectivity and tile sizes.
- A working quest engine: `QuestManager` with event hooks (`onKill`, `onTalk`,
  `onGather`, `onAttune`, …), `quests.js`, `dialogues.js`, persisted through
  `SaveManager` as `playerStats.questLog`.
- The map pipeline: `ascii_to_tiles`, the map assembly procedure, and a
  catalogued sprite library.
- Two of the campaign's maps (`eldrin_tower`, `summit_of_despair`).

What the engine has no concept of is *a campaign*. `getMap(id)` will hand back
any map to anyone; there is no ordering, no gating, no record of how far
through the story a player is, and nothing that can be checked against the
bible.

This spec covers the spine only: the structure, the gating, the progress, and
enough scaffolding to walk it end to end. No real maps, quests or art.

## Goals

- Represent the bible's twelve chapters as data the game reads.
- Gate map entry on campaign progress.
- Grant the unlock ladder as chapters complete.
- Persist and restore progress through the existing save.
- Be walkable start to finish through placeholder content, so the spine is
  proven by play and not only by unit tests.
- Make the game checkable against the bible by a test.

## Non-goals

- Real maps, quests, dialogue, enemies, bosses or art. Every later map replaces
  a stub in place.
- Multiplayer or co-op campaign play. Eldoria's Prophecy is single-player:
  Eldrin alone, one protagonist. Co-op belongs to *A Tapestry of Souls*, which
  has several playable protagonists, and will be its own campaign definition
  and its own design.
- Changing the existing presence networking. "Single-player campaign" here
  means campaign progress is per-player and solo; it does not mean switching
  off the socket layer that lets players see each other.
- Any change to how `QuestManager` works. The campaign observes it.

## The model

A campaign is a data file. The engine gains one system that reads it.

```js
// src/data/campaigns/eldorias_prophecy.js
export const ELDORIAS_PROPHECY = {
    id: 'eldorias_prophecy',
    title: "Eldoria's Prophecy",
    protagonist: 'eldrin',
    chapters: [
        {
            id: 'ch01_echoes_of_stone',
            song: 1,
            act: 1,
            title: 'Echoes of Stone',
            maps: ['eldrin_tower'],
            quests: ['main_read_the_erasure'],
            unlocks: [{ type: 'item', id: 'scholars_staff' }],
            boss: null,
        },
        // …twelve in total
    ],
};
```

Progress is one object on `playerStats`, so it rides the existing
`SaveManager` with no new persistence code:

```js
campaign: {
    id: 'eldorias_prophecy',
    chapter: 'ch04_summit_of_despair',
    completed: ['ch01_echoes_of_stone', 'ch02_dreamweavers_call', 'ch03_odysseys_dawn'],
}
```

A chapter is **complete** when every quest in its `quests` list is complete.
`QuestManager` already tracks that and already emits `onQuestEvent`.
Completing a chapter grants its `unlocks`, appends it to `completed`, and
advances `chapter`.

Gating is one rule: **a chapter's maps open once every earlier chapter is
complete.** No exceptions.

### Chapters own maps, not the reverse

`maps` is a list on the chapter, and map ids may repeat across chapters. This
is forced by the material, not a preference:

- Chapter 10 runs Heartstone Chamber → The Ancient Door — two maps, one
  chapter.
- Chapter 11 runs Ruins of Eldoria → Thaloria — two maps, and both were
  already visited in earlier chapters.
- Chapter 12 returns to Eldrin's Tower, first seen in chapter 1.

Modelling this the other way round — a map owning its chapter — breaks on the
first revisit.

`maps[0]` is the chapter's entry map. `chapterFor(mapId)` returns the
*earliest* chapter claiming that map, so a revisited map stays unlocked once
it has been reached.

**Note on a correction:** this design was approved in conversation with a
single `mapId` per chapter. Transcribing the bible showed three chapters span
two maps each, so the field became a list. The change is recorded here rather
than made silently.

## Chapters

Transcribed from the bible's song-by-song breakdown. "Map" is the bible's own
`Map/area` line for that song; **bold** marks maps that do not exist yet.

| # | Act | Title | Maps | Boss |
|---|-----|-------|------|------|
| 1 | I | Echoes of Stone | `eldrin_tower`, `echoes_of_stone` | — |
| 2 | I | Dreamweaver's Call | **`aetheric_vision`** | — |
| 3 | I | Odyssey's Dawn | **`thaloria`**, **`east_road`** | — (optional miniboss) |
| 4 | II | Summit of Despair | `summit_of_despair` | Malphas |
| 5 | II | Sylvan Sanctuary | **`sylvan_sanctuary`** | the Elemental (trial of intent) |
| 6 | II | Treachery's Bite | **`fire_gate`** | Oren (scripted, flees) |
| 7 | II | The Solitary Path | **`the_descent`** | — (survival gauntlet) |
| 8 | II | Inferno's Trial | **`inferno_labyrinth`** | Xarathos |
| 9 | III | Eldoria's Heartbeat | **`ruins_of_eldoria`** | Voraun's rune-dead gate (puzzle) |
| 10 | III | Heart of War | **`heartstone_chamber`**, **`ancient_door`** | the Shadow Balrog |
| 11 | III | The Weight of Eternity | `ruins_of_eldoria`, `thaloria` | — |
| 12 | III | Dawn's Embrace | `eldrin_tower` | — |

Thirteen distinct map ids; three exist (`eldrin_tower`, `echoes_of_stone`,
`summit_of_despair`), so ten need stubs. The unlock ladder, also from the
bible: Staff (1)
→ first spell (2) → Spell-Blade and Rift-Gate tease (3) → Aether Sight (4–5) →
Umbral Dagger (6) → Silent Guardian passive (7) → Runic Focus (8) → Aetheric
Witness (9) → Heartstone and ward (10–11) → permanent ward and post-game
Rift-Gates (12).

Chapter 1 spans two existing maps: `eldrin_tower` is the exterior clearing and
tower, and `echoes_of_stone` is the Study on its ground floor — named after
Song 1 deliberately, and reached by a portal from the clearing. They are one
location on two maps, not a naming collision.

## Room left for co-op

Co-op campaign play is wanted eventually — just not for this campaign, and not
as a requirement here. Rather than build for it, the spine avoids three
assumptions that would have to be unpicked later. None of these cost anything
now; they are choices about where to *not* hardcode.

- **Progress hangs off a campaign id, not off the player.** `playerStats.campaign`
  names which campaign it belongs to, so a second campaign with different rules
  is another entry, not a migration.
- **Gating is one function, not scattered conditionals.** `canEnter(mapId)` is
  the only place the rule lives, and `GameScene` has exactly one call site.
  A co-op rule — say, letting a player follow a party member into a map they
  have not unlocked — becomes an edit to one function, not an audit of the
  codebase.
- **Protagonist is a field on the campaign, not an engine constant.**
  Eldoria's Prophecy declares `protagonist: 'eldrin'`. *A Tapestry of Souls*
  has several playable protagonists; that is a different value in a different
  file, not a change to `CampaignManager`.

What is explicitly *not* built: party membership, invitations, shared quest
state, server-side progression, or any exemption to the gating rule. Those
belong to whatever design takes co-op on.

## Components

**New**

- `src/data/campaigns/eldorias_prophecy.js` — the definition.
- `src/data/campaigns/index.js` — `getCampaign(id)` / `listCampaigns()`,
  mirroring `maps/index.js`.
- `src/systems/CampaignManager.js` — the only new logic.
- `src/data/maps/_stubs.js` — `makeStubMap()`, scaffolding.

**Touched**

- `GameScene._enterPortal` — one guard at the top. This is the single choke
  point for every map transition, so gating needs exactly one hook.
- `PlayerStats` / `SaveManager` — one `campaign` field carried through.
- `src/data/maps/index.js` — register the stub maps.
- `src/data/quests.js` — stub quests.

### CampaignManager

```
currentChapter()      → chapter object
chapterFor(mapId)     → earliest chapter claiming this map, or null
canEnter(mapId)       → { allowed, reason }
isChapterComplete(id) → bool
```

It subscribes to `questManager.onQuestEvent` at construction. It never calls
into `QuestManager`; it only listens. The quest engine is untouched.

## Flows

**Entering a map.** The portal fires → `canEnter(targetMap)` → if refused, the
reason is shown and the transition aborts *before* the fade, so the player
simply does not leave. Otherwise the existing code runs unchanged.

**Completing a chapter.** A quest completes → `QuestManager` emits →
`CampaignManager` checks whether every quest in the current chapter is now
complete → if so, grants `unlocks`, appends to `completed`, advances
`chapter`, and saves.

## Failure handling

Three cases designed for rather than discovered:

- **Maps the campaign does not claim stay ungated.** `samplemap`,
  `big_forest`, `hermit_hut` and the other sandbox maps are not in any
  chapter; `chapterFor()` returns `null` and entry is always allowed. Without
  this rule, adding gating would lock the sandbox.
- **A save referencing a chapter the definition no longer has.** Editing the
  campaign must not brick an existing save. On load, an unrecognised chapter id
  falls back to the first chapter not present in `completed`.
- **A definition that lies.** Chapter maps and quest ids that do not resolve,
  or unknown unlock types, are caught by a test at build time rather than by a
  runtime guard.

Unlocks are declarative — `{ type: 'spell' | 'item' | 'weapon' | 'ability', id }`
— dispatched to the existing `PlayerStats`/inventory calls. An unrecognised
type fails the validation test rather than silently doing nothing in play.

## Scaffolding

**Stub maps.** One `makeStubMap({ id, displayName, exits })` factory produces a
small walkable room with a sign naming the chapter and portals to its
neighbours. `maps/index.js` registers the ten missing ids through it, marked
as scaffolding. Replacing a stub with a real map is then a one-line registry
swap: the chapter already points at that map id.

A side effect worth having: `summit_of_despair` already carries portals aimed
at `east_road`, which does not exist. Stubs make those live.

**Stub quests.** One per chapter — a single `talk` step against an NPC standing
in the stub room. `talk` is already implemented and deterministic, so a chapter
can be completed deliberately in seconds. Real quests replace them by id.

## Testing

Plain Node test scripts wired into `npm test`, matching the repo's existing
convention. TDD: tests first.

- `test_campaign_manager.mjs` — gating allows and refuses correctly; unclaimed
  maps stay open; a chapter completes only when *all* its quests are done;
  unlocks are granted exactly once, not re-granted on reload; progress
  round-trips through save and load; an unknown chapter id in a save falls back
  rather than throwing.
- `test_campaign_definition.mjs` — the honesty test: every chapter's maps
  resolve in the map registry, every quest id in `QUESTS`, every unlock type
  known, chapters contiguous and ordered, songs 1–12 each present exactly once.
  This is what keeps the game aligned with the bible as content lands.
- **A browser walkthrough** to finish: new game, play all twelve chapters
  through the stubs, confirm a locked portal actually refuses entry, reload
  mid-campaign and confirm the right chapter and unlocks come back.

## Done means

You can start a new game and walk chapter 1 through chapter 12 in the browser
via stub maps and stub quests, watching gates open and abilities unlock, with
progress surviving a reload — and `npm test` proves the definition matches the
map registry, the quest table and the bible's chapter list.
