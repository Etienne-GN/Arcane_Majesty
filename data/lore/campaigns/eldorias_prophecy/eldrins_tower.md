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
This location is two parts: **the grounds** (outside, existing map) and
**the tower interior** (new — several small floors, since it's a tower
and not a hall). Do not conflate the two into one flat map.

- **The Grounds:** `apps/amo/src/data/maps/eldrin_tower.js` already
  exists in the codebase — a forest clearing with the tower's footprint
  sitting in it (west wall col 7, east wall col 18, north row 14, south
  row 27; door gap at south wall cols 12-13). Today that door gap opens
  onto solid stone (`tile 2`) — there is no interior behind it yet. This
  spec keeps the grounds map as-is (its deer/fox/bird wildlife, the
  longsword chest, the entry sign) and turns that door into a real portal
  into the tower interior below, instead of a dead end.
- **The Tower Interior — three small floors, stacked:**
  1. **Ground Floor — The Study:** entered directly from the grounds
     door. Small, ~12x12 tiles — this is where **The Strata Wall** set-
     piece lives (see Points of Interest), plus the casting-tutorial
     space for the Resonance-Wisp. A stairway up connects to Floor 2.
  2. **Second Floor — The Archive:** ~12x10 tiles, smaller and denser
     with shelving than the Study below it. This is where **The Missing
     Decades** side quest's library lore fragments are actually found —
     giving that quest a real physical space instead of being folded
     into the Study. A stairway continues up to Floor 3; another leads
     back down to the Study.
  3. **Top Floor — The Sanctum:** ~10x10 tiles, the smallest floor,
     at the tower's peak. **The Bell That Never Struck Correctly** hangs
     here. This is also where the Song 12 **Sealed Sanctum** transition
     happens (the ward drawn around this room) and where Vorgos's
     epilogue dream-visit ("The Architect's Design") plays out.
  Each floor is its own small map file, connected by stair portals
  (up/down), matching the pattern already used elsewhere in the codebase
  for portal-linked maps rather than one oversized multi-level file.
- **To East Road / Thaloria city:** the tower sits just outside Thaloria —
  a short walk, no wilderness crossing needed (Song 3 begins the moment
  Eldrin steps past the city gate). No separate connecting map required;
  Song 3's departure begins from the grounds map, tower door locked
  behind him (see Song 3's own spec, `thaloria_and_east_road.md`).
- **Terrain description:** A single scholar's tower — dust, silence,
  strata samples along the study's walls, a bell that never struck
  correctly at the peak. Each floor is small and contained by design: the
  point of Song 1 is isolation, not scale, and a tower's rooms are
  naturally cramped compared to a hall. In Song 12 the same rooms read
  differently — the ward's light replacing the dust, the sanctum sealed
  rather than abandoned; this transformation is concentrated on the top
  floor (the Sanctum) rather than remodeling every floor.

## Points of Interest
- **The Strata Wall** (Bible-named, detailed here; Ground Floor — the
  Study): the geological samples Eldrin studies — the "Echoes" set-piece.
  Examining it triggers the strata-memory investigation mechanic (layered
  past endings revealed). This is the Song 1 tutorial's central prop.
- **The Missing Decades' shelves** (new, Second Floor — the Archive): the
  library lore fragments the side quest of the same name asks the player
  to find, physically placed among this floor's shelving rather than
  handed over in the Study.
- **The Bell That Never Struck Correctly** (Bible-named, ambient only;
  Top Floor — the Sanctum): no mechanic — a recurring detail/sound cue
  for atmosphere across both visits, unchanged by the ward.
- **The Sealed Sanctum** (new, Song 12 only; Top Floor): the same top
  room, now marked by the ward of the keeping — a visible barrier/glow
  overlay distinguishing "vigil-state" Eldrin's Tower from the Song 1
  "scholar-state" version. Mechanically this can be the same top-floor
  map data with a `lightTint`/decoration swap rather than a second map
  file, if the engine supports per-visit map variants; otherwise a
  near-duplicate second map id for just this one small floor is the
  fallback (the Study and Archive floors need no Song 12 variant at all).

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
either visit. The three interior floors (Study/Archive/Sanctum) are
game-only interior architecture of that same single Location, not new
DB nodes.

## Implementation note (2026-08-28)
The existing `eldrin_tower.js` map is grounds-only: its door gap (south
wall, cols 12-13) currently opens onto solid stone tiles (`tile 2`) —
there is no interior behind it. Building this location for real means
(1) leaving the grounds map's exterior content untouched, (2) replacing
the solid-stone tower block with an actual enterable door portal, and
(3) building the three small interior floor maps described above,
linked by stair portals. This is a real gap in what's built today, not
just a documentation gap — flagging it here since it will block Song 1
implementation otherwise.
