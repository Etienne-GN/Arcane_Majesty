# Arcane Majesty — CLAUDE.md

> **MIGRATION IN PROGRESS (2026-11-23):** if you are running on **exegol** and `docs/HANDOFF_EXEGOL.md` exists, read it and do its steps before anything else. Delete it and this note once done.

## Project Overview
Arcane Majesty is a transmedia dark-fantasy universe combining narrative concept albums, deep lore, a Neo4j knowledge graph, a 3D Action RPG (Three.js, Android via Capacitor — `apps/amo3d`), and written novels. The earlier 2D game (Phaser 3, `apps/amo`) is **archived**. Music is the primary medium; the Neo4j DB is the source of truth for lore.

## Key Files
- **Pitch / Social Media Blurb →** `pitch.md`
- **Current Progress →** `current_progress.md` (album production + lore review status)
- **World Lore →** `world_lore.md`
- **Project Summary & Process →** `data/lore/xmls/project_summary.md`
- **Rework Approach →** `rework_approach.md`
- **Album Canon Checkup (ACC) →** `data/lore/xmls/acc/`
- **Album Production Process →** `data/lore/xmls/album_production_process.md`
- **Book →** `books/eldorias_prophecy/` (README, manuscript, canon, outlines)
- **Game README →** `apps/amo3d/README.md` · roadmap `docs/3d/ROADMAP.md`
- **Game rules & data →** `packages/rules/` (`@rules`; items, spells, enemies, quests, maps — copied from the 2D game, edited here)

## Commands

**Game (3D):** `cd apps/amo3d && npm run dev` (dev server, port 5190) · `npm run android` (APK) — see `apps/amo3d/README.md`. Releases: push a tag `amo3d-vX.Y.Z` (CI builds the APK).

**Neo4j (dedicated VM "scarif", host 192.168.0.159):**
- Browser UI: `http://192.168.0.159:7474` (sign in `neo4j`/password)
- Bolt (programmatic / MCP): `192.168.0.159:7687`
- Local scripts (run from repo, after DB reachable): `data/scripts/start_neo4j.sh`, `data/scripts/stop_neo4j.sh`, `data/scripts/restart_neo4j.sh`, `data/scripts/run_mcp_server.sh`
- The DB is **not** hosted locally in this repo (`neo4j_db/` is a legacy local datastore, gitignored). Never start a local Neo4j container — it lives on scarif.

**Lore / album workflows:**
- ACC review of an album: see `data/lore/xmls/album_production_process.md` + existing checkup in `data/lore/xmls/acc/`
- Graph migration / data import: `data/lore/xmls/graph_migration_procedure.md`

## Repo Map
```
apps/amo3d        The game (Three.js + Capacitor) — src/, server/, android/
packages/rules    Game rules and data shared by the game (and later the server)
apps/amo          ARCHIVED 2D game (Phaser 3) — frozen, tag amo2d-final; never edit
apps/compendium   Static lore compendium web app
books/eldorias_prophecy/  Novel: manuscript/, canon/, outlines/
data/lore/        World-building source of truth (see below)
data/lore/xmls/   raw_albums/ · processed_albums/ · archived_data/ · acc/ · process docs
archives/         Historical exports, prototypes, per-song XML archives
assets/           art + music
data/scripts/     Neo4j + conversion scripts
```

## The 2D game is archived
`apps/amo` (the Phaser 2D game) is obsolete and frozen since 2026-11-18 — **never modify anything under `apps/amo/`**, data files included. The 3D game no longer imports it: its rules and data live in `packages/rules/src` — add or change items, spells, enemies and quests there (or in `apps/amo3d`). `apps/tool_suite` (the LPC sprite tools) is 2D tooling and is archived with it — not used by the 3D game.

## Lore Source of Truth
**The Neo4j graph on scarif is the authoritative lore record** — always verify against it before writing new lore. `world_lore.md` and the album XMLs mirror subsets of it; when they disagree, the DB wins (and the doc should be fixed).

### Canon rules (gotchas)
- **Music is the primary medium.** Songs/albums are the in-world telling of the story; album XMLs are canon. Do not edit song/album XMLs without explicit user approval.
- **Media-model rule:** characters NEVER reference songs or albums in-world. In prose/books, replace any "the songs tell" phrasing with the old tales / the vision / the record.
- **Book vs album conflicts:** the book wins over album text on conflicts, but must not contradict established DB lore.
- New game-only content must set `origin: "game"` (DB nodes carry `origin: "album"` or `"game"`).

## Neo4j Graph Database — Current State (verified against DB)
**19 Characters · 8 Albums · 103 Songs · 39 Locations · 15 Organizations · 6 Races · 4 Artifacts · 3 Prophecies · 37 Events · 3 Planes · 10 Regions · 2 TransPlanar**

### Node Labels
| Label | Count | Key Attributes |
|---|---|---|
| `Character` | 19 | name, role, race, description, backstory, origin |
| `Album` | 8 | title, summary, global_timeline, era, timeline_range, origin |
| `Song` | 103 | title, track_index, plot, lyrics, origin |
| `Location` | 39 | name, description, origin, x, y (Phaser px coords) |
| `Plane` | 3 | name, description, origin |
| `Region` | 10 | name, description, origin |
| `TransPlanar` | 2 | name, description, origin |
| `Event` | 37 | name, description, era, timeline_label, origin |
| `Organization` | 15 | name, description, origin |
| `Race` | 6 | name, nature, origin |
| `Artifact` | 4 | name, description, origin |
| `Prophecy` | 3 | name, description, origin |

`The Great Rift` carries both `Location` and `TransPlanar` labels (so it counts in both).

### Relationships (directions verified from DB)
**Character → Character:** `ALLY_OF`, `ENMITY_WITH`, `LOVES`, `SERVANT_OF`, `KILLED`, `MENTORED_BY`, `SECRET_RIVAL`, `SACRIFICES_FOR`, `DEFECTS_FROM`
**Character → Organization:** `FOUNDED`, `FEEDS_SOULS_TO`, `SECRETLY_FUELS`
**Character → Race:** `PART_OF_RACE`
**Character → Song:** `LYRICAL_POV` (POV-of)
**Character → Location:** `ORIGINATES_FROM`, `RULES`, `FOUNDED`
**Character → Plane/TransPlanar:** `ORIGINATES_FROM`, `RULES`, `EXILED_FROM`
**Character → Artifact:** `DISCOVERED`, `WIELDS`, `SEEKS`, `GUARDS`
**Character → Prophecy:** `SUBJECT_OF`, `BOUND_BY`, `OBSESSED_WITH`
**Event → Song:** `OCCURRED_IN` · **Event → Character:** `INVOLVES`
**Event → Location:** `TAKES_PLACE_AT` · **Event → Plane:** `TAKES_PLACE_AT`
**Event → Event:** `PRECEDES`
**Song → Album:** `PART_OF` · **Song → Character:** `FEATURES`
**Song → Location/Plane/TransPlanar:** `LOCATED_AT`
**Song → Artifact:** `MENTIONS` · **Song → Prophecy:** `REVEALS`
**Location → Region/Plane/Location:** `LOCATED_IN` (hierarchical containment)
**Region → Plane:** `LOCATED_IN` · **TransPlanar → Plane:** `LOCATED_IN`
**Album → Album:** `CONCURRENT_WITH`
**Organization → Organization:** `ENEMIES_OF`, `SECRETLY_FUELS`
**Organization → Artifact/Plane:** `HIDDEN_IN`

### Planar Hierarchy (verified against DB)
```
Auroria (Plane)
  ├── Astral Archives
  ├── The Celestial Gardens
  ├── The Crystal Sanctum
  └── The Seer's Library

Eldoria (Plane)
  ├── Thaloria (Region)
  │    ├── Eldrin's Tower
  │    ├── Heartstone Chamber
  │    ├── Iron Hollow
  │    ├── Summit of Despair
  │    ├── Sylvan Sanctuary
  │    ├── Thaloria (city)
  │    └── The Citadel of Thaloria (game; the College)
  │         └── The Forbidden Archive (nested)
  ├── The Emerald Fields (Region)
  │    ├── The Emerald Fields
  │    │    └── The Hidden Cabin (nested)
  │    └── The Weeping Stones
  ├── The Heartlands (Region)
  │    ├── Lake Aethera
  │    ├── Silverrun River
  │    ├── The Crossroads
  │    └── The Sunken Temple
  ├── The Scarlands (Region)
  │    ├── Graywatch
  │    ├── New Ravenspire
  │    └── The Obsidian Gate (also → Nythoria Surface)
  ├── The Silver Coast (Region)
  │    └── Port Silver
  ├── Whisper-Wood (Region)
  │    ├── Duskmeet
  │    └── Whisper-Wood
  └── Sanguine Vaults (Region)
       └── Sanguine Vaults

Nythoria (Plane)
  ├── Nythoria Surface (Region)
  │    ├── Ravenspire (Ancestral Ruins)
  │    ├── The Black Well
  │    ├── The Obsidian Citadel
  │    ├── The Shadow-Vale
  │    └── The Obsidian Gate (also → The Scarlands)
  ├── The Shadow Realm (Region)
  │    └── The Shadow Realm
  └── The Underworld (Region)
       ├── Underworld
       │    └── Underworld Prison (nested)
       └── The Sanctuary

Plane-anchored: The Great Rift — LOCATED_IN all 3 planes (TransPlanar + Location)
The Aether — TransPlanar, LOCATED_IN all 3 planes; Vorgos's domain
```

### LOCATED_IN containment rules
- `(Region)-[:LOCATED_IN]->(Plane)` — regions belong to planes
- `(Location)-[:LOCATED_IN]->(Region)` — most locations are in a region
- `(Location)-[:LOCATED_IN]->(Plane)` — plane-anchored locations (Auroria, The Great Rift)
- `(Location)-[:LOCATED_IN]->(Location)` — nested locations (Hidden Cabin → Emerald Fields; Underworld Prison → Underworld)
- The Obsidian Gate has two `LOCATED_IN` relationships (trans-planar: Scarlands + Nythoria Surface)
- The Great Rift has three (all planes)

### origin property
All nodes carry `origin: "album"` (from songs/lore docs) or `"game"` (game-only expansion). New game locations, races, events, etc. must always set `origin: "game"`.
