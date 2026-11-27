# The Library — one codex of every entity, with its editor (plan, 2026-11-27)

The user: "like the Bestiary, but unified for everything, by classes — mobs, animals, bosses, but also trees, chests,
fences, houses, weapons and armour, everything wearable, and the NPCs. I make a character in the Forge and find it in the
codex, then edit it in the Sculptor with all its accessories. I want to copy items or mobs, make a clone, change it, save
it. A unified library with an editor."

## What exists to build on
| Piece | Today | In the Library |
|---|---|---|
| Bestiary (`bestiary.html`, src/bestiary) | every mob and animal, by group, made with the game's own create functions; mob notes | its list and stage become the Library's mob/animal/boss classes |
| Sculptor (`sculptor.html`) | point editing for v2 bodies, creatures and the Mob subjects; layers, alternates, topology, dress, compare | the Library's editor |
| Forge (`forge.html`) + `content/cast/*.json` | heroes and cast characters, saved as cast files | each cast file is a Library NPC; "Sculpt this character" already exists |
| Townsfolk (`castList.js`) | Thaloria's residents with their looks | Library NPCs (read only until cloned) |
| Props (`buildings.js` buildHouse / buildProp, `flora.js` treeKinds) | code-built houses, stalls, fences, crates…; tree kinds | the world-object classes — need a Sculptor path |
| Wearables (`models/parts/*`, `PART_CATALOG`, `weapons.js` buildWeapon) | the Forge's parts per slot; weapons by type | the equipment classes — need a Sculptor path |

## The shape of it
- **One page, `library.html`** (the Bestiary folds into it): a class tree on the left — Creatures (Mobs, Animals, Bosses),
  People (Heroes & cast, Townsfolk), World (Trees, Houses, Props: chests, fences, stalls…), Equipment (Weapons, Armour,
  Clothing & accessories) — a search box, the entry on a turning stage in the middle, its card on the right (name, class,
  where it is used, notes) with **Edit in the Sculptor**, **Clone**, **Open in the Forge** (people), **Delete** (clones only).
- **Every entry is a record:** `{ id, class, name, base, … }` — built-in entries come from the code (as the Bestiary's
  list does); clones and Forge characters are files: `src/content/library/<class>/<id>.json` = `{ base: '<built-in id>',
  name, params: {…}, layer: {…}, colors: {…} }` — a clone is its base plus what was changed.
- **The Sculptor edits any entry** through one adapter per kind: bodies and creatures as today (layers); props and
  wearables through a **mesh layer** — the code-built mesh's points keyed by where they are built (as skin.js does), their
  moves saved as offsets — plus their **parameters** (sizes, counts) and **colours** as sliders in the panel.
- **Forge → Library:** saving in the Forge writes the cast file (as today) and it appears under People; its accessories are
  its parts, each editable in place (opens the part in the Sculptor, saved as the character's own variant of it).

## Phases
1. **Library page over what exists** — the class tree, the stage, the cards; mobs/animals/bosses (the Bestiary's list),
   heroes & cast (cast files), townsfolk, trees, houses and props, weapons and parts — view only, with "Edit in the
   Sculptor" for what the Sculptor already takes. The Bestiary's notes kept.
2. **Clone** — any entry copied into `library/<class>/<id>.json`, renamed, listed beside its base; the game reads clones
   where it reads their base kind (a cloned mob placeable in a region, a cloned weapon in the item tables).
3. **Props and wearables in the Sculptor** — the mesh-layer adapter (points), parameters and colours.
4. **Forge round trip** — accessories edited per character; the Forge lists Library clones of parts.

## Decisions (the user, 2026-11-27)
- The Library **replaces the Bestiary** (its mobs, notes and stage fold in; the old link points there).
- Props and wearables are edited with **points + sliders** (sizes, counts, colours).
- Clones show up **in the Library and in the game** (regions, loot and shop tables, the Forge for wearables).
- **Phase 1 first**: the Library page.
