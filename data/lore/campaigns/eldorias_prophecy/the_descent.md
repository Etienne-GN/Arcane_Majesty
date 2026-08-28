# Map Spec: The Descent

## Meta
- **DB Location node:** none directly — the Bible attaches Song 7 to `LOCATED_AT Inferno Labyrinth` (DB), treating The Descent as that location's upper approach rather than a separate DB node. See DB Sync Log.
- **Campaign Bible entry:** Song 7 — The Solitary Path (`data/lore/campaigns/Eldorias_Prophecy_campaign.md`)
- **Biome / region:** Eldoria > Thaloria (per CLAUDE.md's planar hierarchy — Inferno Labyrinth, which this map approaches, is one of Thaloria's locations)
- **Act / progression position:** Act II, 6th map in the linear campaign path (Fire Gate → **The Descent** → Inferno Labyrinth → ...)

## Narrative Anchor
Post-betrayal, bleeding, alone — Eldrin realizes he must walk the rest
of this path without allies; the stakes are too high for trust. A
solitude gauntlet: cold clinging to the upper reaches, doubt echoes
following him down, the cold/ash transition intensifying as he
descends. He embraces isolation, becoming the "Silent Guardian" in
spirit before he ever finds the Stone. No boss — this is a survival
gauntlet, not a fight. Main quest "The Solitary Path"; side "Echoes of
the Road" (fragments of Oren's true story). Canon anchors: Inferno
Labyrinth (approach), event *The Race for the Anchor* (context —
`LOCATED_AT Inferno Labyrinth` in the DB).

## Geography & Connectivity
- **From Fire Gate:** immediate — The Descent begins the moment Oren
  flees with the journal; no separate connector needed.
- **The Descent map size:** ~30x50 tiles (tall and narrow, matching a
  literal descent) — long enough to sustain a "no-help gauntlet" pacing
  beat without becoming a maze; the cold-to-ash transition should read
  gradually across its length rather than as a hard cut.
- **To Inferno Labyrinth:** immediate at the bottom — The Descent ends
  where the labyrinth's gate of flame begins (per Song 8's "the gate of
  flame that calls me by my given name"); no separate connector map.
- **Terrain description:** A single downward path — the last patches of
  snow and ice give way gradually to warm stone, ash-haze, and finally
  heat-shimmer as the labyrinth nears. Empty of other people by design:
  the Bible calls this "the road empties; the resolve hardens." Frost-
  Shades linger in the upper stretches (leftover cold, echoing Summit of
  Despair) while the first heat-adapted creatures (Magma-Eater, Cinder-
  Soul) appear as the ash deepens near the bottom.

## Points of Interest
- **The Solitude Gauntlet** (Bible-named, detailed here): the map's
  spine — a sustained stretch with no NPCs, only voice-over of Eldrin's
  resolve and an optional doubt-echo of Oren (a memory mechanic: brief,
  skippable vision-fragments of Oren along the path, not a combat
  encounter).
- **Echo Markers** (new, supporting "Echoes of the Road"): scattered
  points along the descent where an echo-fragment of Oren's true story
  can be found/triggered — pieces of the "mask made of true things," so
  the side quest doesn't require a single fetch object but a light
  collect-as-you-go structure matching the gauntlet's pacing.

## Spawns — Enemies
| Creature | Count | Notes |
|---|---|---|
| Frost-Shade | 2 (upper stretch only) | Invisible in snowstorms/dim light, lingering from the cold above; drains "Internal Heat" (Mana and HP) on contact (Sensitivity 1) — per `bestiary.md` |
| Magma-Eater | 2 (lower stretch, as heat rises) | Lizard-like creatures that consume fire spells to grow larger (Sensitivity 2) |
| Cinder-Soul | 2 (lower stretch, as heat rises) | Floating fire skulls; explode into Void-Flame, burning HP and Mana (Sensitivity 1) |

Per the Bible, no boss here — this is deliberately a survival gauntlet,
not a boss-gated map; enemy density stays low and spread out rather
than clustered.

## Spawns — Wildlife / Gathering
None. The Bible frames this stretch as empty by design ("the road
empties") — no wildlife, no gathering nodes; the point is isolation, not
resource density.

## Treasure & Loot
| Source | Contents | Tier |
|---|---|---|
| The Solitary Path (main quest reward) | Insight: Silent Guardian (resonance-silencing passive — lowers Scent) | N/A — mechanic, not gear |
| Echoes of the Road (side quest reward) | A small Tier I-II reagent/currency bundle | Tier I-II — Novice/Adept |

Nothing here rises to Tier III (Runic) or Tier IV (Relic) — the
Bible's own unlock ladder places Runic Focus at the Inferno Labyrinth
(Song 8), the map this one leads directly into.

## Quests
- **Main:** "The Solitary Path" — a no-help gauntlet; Eldrin embraces
  isolation. (From the Bible — pointer, not full re-write.)
- **Side:** "Echoes of the Road" (Bible-named) — collect Oren's true-
  story fragments scattered along the descent.

## NPCs
None — per the Bible, "the point is solitude." No NPCs are placed on
this map; Oren appears only as an optional memory/doubt-echo mechanic,
not a placed character.

## DB Sync Log (G-items)
| # | Gap | Status |
|---|---|---|
| G1 | "The Descent" itself is not modeled as a separate DB `Location` — it is treated here as Inferno Labyrinth's upper approach, matching the Bible's own `LOCATED_AT Inferno Labyrinth` choice for Song 7. If a distinct sub-location is later wanted for finer DB granularity, log it then; not needed for this spec. | note — no new node proposed |
