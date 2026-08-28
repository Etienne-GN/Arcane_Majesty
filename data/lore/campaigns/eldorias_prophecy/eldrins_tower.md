# Map Spec: Eldrin's Tower

## Meta
- **DB Location node:** Eldrin's Tower (origin: album)
- **Campaign Bible entry:** Song 1 — Echoes of Stone, and Song 12 — Dawn's Embrace (`data/lore/campaigns/Eldorias_Prophecy_campaign.md`)
- **Biome / region:** Eldoria > Thaloria > Eldrin's Tower (per CLAUDE.md's planar hierarchy)
- **Act / progression position:** Act I (opening, tutorial hub) AND Act III (closing/epilogue — same physical map, revisited in a transformed state). This is one location spanning both ends of the campaign, not two separate maps.

## Narrative Anchor
**Song 1:** Eldrin studies the strata in his tower above Silverrun and finds
the "Echoes" — proof the world has ended before. Tutorial hub: Scholar's
Staff, the Aetheric Reading insight, no enemies (a non-canon training
Resonance-Wisp only), no boss. Main quest "Read the Erasure"; side "The
Missing Decades" (library lore fragments about the Gap).

**Song 12:** Eldrin returns, seals the sanctum with the ward of the
keeping, and begins the 400-year vigil. World is quiet — no enemies, no
boss, the campaign closes in stillness. Main quest "Dawn's Embrace";
epilogue "The Architect's Design" (Vorgos's dream-visit, ~600 AGD: "You
will not see it, but it will come.").

Canon anchors: Eldrin Nightshade, Eldrin's Tower, Thaloria, events
*Eldrin's Call* (Song 1, part) and *Eldrin's 400-Year Vigil* (Song 12).
`LOCATED_AT Eldrin's Tower` (DB).

## Geography & Connectivity
- **Existing map:** `apps/amo/src/data/maps/eldrin_tower.js` already exists
  in the codebase — this spec extends/aligns it rather than proposing a
  fresh build. Keep its current footprint; add the Song 12 "transformed"
  visual state as a second variant (see Points of Interest) rather than a
  new map.
- **To East Road / Thaloria city:** the tower sits just outside Thaloria —
  a short walk, no wilderness crossing needed (Song 3 begins the moment
  Eldrin steps past the city gate). No separate connecting map required.
- **Terrain description:** A single scholar's tower — dust, silence,
  strata samples along the walls, a bell that never struck correctly. Small
  and contained by design: the point of Song 1 is isolation, not scale. In
  Song 12 the same rooms read differently — the ward's light replacing the
  dust, the sanctum sealed rather than abandoned.

## Points of Interest
- **The Strata Wall** (Bible-named, detailed here): the geological samples
  Eldrin studies — the "Echoes" set-piece. Examining it triggers the
  strata-memory investigation mechanic (layered past endings revealed).
  This is the Song 1 tutorial's central prop.
- **The Bell That Never Struck Correctly** (Bible-named, ambient only): no
  mechanic — a recurring detail/sound cue for atmosphere across both
  visits, unchanged by the ward.
- **The Sealed Sanctum** (new, Song 12 only): the same tower, now marked by
  the ward of the keeping — a visible barrier/glow overlay distinguishing
  "vigil-state" Eldrin's Tower from the Song 1 "scholar-state" version.
  Mechanically this can be the same map data with a `lightTint`/decoration
  swap rather than a second map file, if the engine supports per-visit map
  variants; otherwise a near-duplicate second map id is the fallback.

## Spawns — Enemies
| Creature | Count | Notes |
|---|---|---|
| Resonance-Wisp (training only) | 1 | Non-canon tutorial tool for the casting tutorial — not a bestiary entry, not present in Song 12 |

No hostile spawns in either visit — the Bible is explicit that both songs
have "none" for enemies and boss.

## Spawns — Wildlife / Gathering
None. This is a contained interior location both times; no gathering
nodes fit the scholar's-tower setting.

## Treasure & Loot
| Source | Contents | Tier |
|---|---|---|
| Song 1 starting gear | Scholar's Staff | Tier I — Novice/Iron |
| Song 12 permanent unlock | The ward of the keeping (re-seal ability, not equipment) | N/A — mechanic, not gear |

No chests/loot tables beyond the two scripted unlocks above — this
location is narrative-first both visits, per the Bible's own framing
("isolation is the point" / "the campaign ends in stillness").

## Quests
- **Main (Song 1):** "Read the Erasure" — inspect the strata, find the
  Echoes, gain the first Insight.
- **Side (Song 1):** "The Missing Decades" — library lore fragments about
  the Gap.
- **Main (Song 12):** "Dawn's Embrace" — the vigil begins, year montage.
- **Epilogue (Song 12):** "The Architect's Design" — Vorgos's dream-visit,
  seeding the next saga (The Prophecy of Darkness).

## NPCs
None in Song 1 (isolation is the point). Vorgos appears in Song 12's
epilogue only, as a dream-visit — not a placed NPC, a scripted sequence.

## DB Sync Log (G-items)
None — Eldrin's Tower already exists as a DB `Location` node with
`origin: album`, and no new sub-locations or entities are introduced by
either visit.
