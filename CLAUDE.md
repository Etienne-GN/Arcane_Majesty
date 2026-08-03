# Arcane Majesty — CLAUDE.md

## Project Overview
Arcane Majesty is a transmedia dark-fantasy universe combining narrative music albums, deep lore, a Neo4j knowledge graph, and a 2D top-down Action RPG prototype (Phaser 3).

## Key Files
- **Pitch / Social Media Blurb →** `pitch.md`
- **Current Progress →** `current_progress.md`
- **World Lore →** `world_lore.md`
- **Project Summary & Process →** `data/lore/xmls/project_summary.md`
- **Rework Approach →** `rework_approach.md`
- **Game README →** `apps/amo/README.md`
- **Neo4j DB →** Running locally (schema below)

## Neo4j Graph Database — Current State
**13 Characters**, **8 Albums**, **103 Songs**, **34 Locations**, **10 Organizations**, **6 Races**, **3 Artifacts**, **3 Prophecies**, **30 Events**, **3 Planes**, **10 Regions**, **2 TransPlanar**

### Node Labels
| Label | Count | Key Attributes |
|---|---|---|
| `Character` | 13 | name, role, race, description, backstory, origin |
| `Album` | 8 | title, summary, global_timeline, era, timeline_range, origin |
| `Song` | 103 | title, track_index, plot, lyrics, timestamp, origin |
| `Location` | 35 | name, description, origin, x, y (Phaser px coords) |
| `Plane` | 3 | name, origin |
| `Region` | 10 | name, origin |
| `TransPlanar` | 2 | name, origin |
| `Event` | 30 | name, description, era, timeline_label, origin |
| `Organization` | 10 | name, description, origin |
| `Race` | 6 | name, nature, origin |
| `Artifact` | 3 | name, description, origin |
| `Prophecy` | 3 | name, description, origin |

All nodes have an `origin` property: `"album"` (from songs/lore docs) or `"game"` (game-only expansion).

### Key Relationships

**Character ↔ Character:** `ALLY_OF`, `ENMITY_WITH`, `LOVES`, `SERVANT_OF`, `KILLED`, `MENTORED_BY`, `SECRET_RIVAL`, `SACRIFICES_FOR`, `DEFECTS_FROM`
**Character → Location:** `ORIGINATES_FROM`, `RULES`, `EXILED_FROM`
**Character → Organization:** `FOUNDED`, `FEEDS_SOULS_TO`, `SECRETLY_FUELS`
**Character → Artifact:** `DISCOVERED`, `WIELDS`, `SEEKS`, `GUARDS`
**Character → Prophecy:** `SUBJECT_OF`, `BOUND_BY`, `OBSESSED_WITH`
**Event → Song:** `OCCURRED_IN`
**Event → Character:** `INVOLVES`
**Event → Location:** `TAKES_PLACE_AT`
**Event → Event:** `PRECEDES`
**Song → Album:** `PART_OF`
**Song → Character:** `FEATURES`, `LYRICAL_POV`
**Song → Location:** `LOCATED_AT`
**Song → Artifact:** `MENTIONS`
**Song → Prophecy:** `REVEALS`
**Location → Region/Plane/Location:** `LOCATED_IN` (hierarchical containment)
**Region → Plane:** `LOCATED_IN`
**Album → Album:** `CONCURRENT_WITH`
**Organization → Organization:** `ENEMIES_OF`, `SECRETLY_FUELS`

### Planar Hierarchy
**3 Planes**, **10 Regions**, **34 Locations**, **2 TransPlanar nodes**.

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
  │    └── The Forbidden Archive
  ├── The Emerald Fields (Region)
  │    ├── The Emerald Fields
  │    │    └── The Hidden Cabin
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
       ├── The Sanctuary
       ├── Underworld
       │    └── Underworld Prison
        └── ── (via The Great Rift)

The Aether (TransPlanar — LOCATED_IN all 3 planes)
The Great Rift / Underworld's Gate (TransPlanar + Location — LOCATED_IN all 3 planes, unstable passage to the Underworld created by Vorgos at 0 GD; shadow creatures leak into Eldoria)
```

### LOCATED_IN containment rules
- `(Region)-[:LOCATED_IN]->(Plane)` — regions belong to planes
- `(Location)-[:LOCATED_IN]->(Region)` — most locations are in a region
- `(Location)-[:LOCATED_IN]->(Plane)` — plane-anchored locations (Auroria, The Great Rift)
- `(Location)-[:LOCATED_IN]->(Location)` — nested locations (Hidden Cabin → Emerald Fields)
- The Obsidian Gate has two `LOCATED_IN` relationships (trans-planar: Scarlands + Nythoria Surface)

### origin property
All nodes carry `origin: "album"` (from songs/lore) or `origin: "game"` (game-only expansion). New game locations, races, events, etc. must always set `origin: "game"`.
