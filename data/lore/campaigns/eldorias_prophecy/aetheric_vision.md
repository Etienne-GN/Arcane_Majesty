# Map Spec: Aetheric Vision

## Meta
- **DB Location node:** none — this is not a physical place, per the Bible's own framing ("an unreal, non-physical dream map"). No `Location` node exists or should be created for it.
- **Campaign Bible entry:** Song 2 — Dreamweaver's Call (`data/lore/campaigns/Eldorias_Prophecy_campaign.md`)
- **Biome / region:** N/A — outside the planar hierarchy entirely; a vision Vorgos pulls Eldrin into, not a place on any plane.
- **Act / progression position:** Act I, 2nd beat (immediately after Eldrin's Tower, before Odyssey's Dawn).

## Narrative Anchor
Vorgos pulls Eldrin out of time. He witnesses the future: the Violet Sky
of 900 AGD, the Star-Guard shattering, a woman (Anya) weeping over a
broken man (Kael). Vorgos speaks: "The Lock will fail. Find the Anchor."
Eldrin wakes with the Compass of the Storm implanted and the Lock's
deadline in his head. Canon anchors: Vorgos, Anya, Kael, The Heartstone
of Creation (mentioned), Eldrin's Tower, event *Eldrin's Call*.

**Conflict note carried from the Bible:** the album's "not a request; a
command" framing is softened in book canon — Vorgos never forces pieces,
he *moved* Eldrin. This spec follows the book version; any dialogue
written for this scene should read as Vorgos guiding, not compelling.

## Geography & Connectivity
- **From Eldrin's Tower:** instantaneous — this is a vision, not a walk.
  No travel time applies.
- **To Odyssey's Dawn (Thaloria/East Road):** Eldrin wakes back in his
  tower; the vision itself doesn't connect anywhere physically.
- **Map size:** short and linear by design — the Bible calls this a "timed
  forced-progression dream; you cannot stop the shattering." A small map,
  roughly 20x12 tiles, sized for a short guided walk rather than
  exploration — there is nothing to find here, only witness.
- **Terrain description:** Not a real place — an impressionistic dreamspace.
  Suggest rendering as a dark void with fragments of the future floating
  in it (the Violet Sky, the Star-Guard's silhouette, Anya and Kael as
  distant tableaux) rather than a naturalistic terrain. Echo-Phantoms of
  the future drift through the space, non-hostile.

## Points of Interest
- **The Violet Sky** (Bible-named): the vision's centerpiece — the moment
  Kael's Star-Guard shatters, witnessed but not preventable. A forced
  camera/walk beat, not an interactive POI in the usual sense.
- **Anya and Kael** (Bible-named): a distant tableau — a woman weeping over
  a broken man. Seen, not approached; this is foreshadowing for future
  chapters (Kael/Anya are not yet Eldoria's Prophecy protagonists).
- **Vorgos** (Bible-named, NPC): first contact. Speaks the Bible's core
  line and grants the Compass of the Storm.

## Spawns — Enemies
None. Echo-Phantoms of the future are explicitly non-hostile per the
Bible.

## Spawns — Wildlife / Gathering
None — a vision has nothing to gather.

## Treasure & Loot
| Source | Contents | Tier |
|---|---|---|
| Vision's end (scripted, not looted) | Compass of the Storm (quest item — points to the Anchor) | N/A — narrative item, not tiered gear |

No chests, no combat loot — nothing here is Tier-rated per
`equipment_tiers.md`; this is the campaign's only entirely non-physical,
non-combat location.

## Quests
- **Main:** "The Lock Will Fail" — walk the vision, witness the shattering.
  A single forced-progression sequence, no branching.

## NPCs
- **Vorgos** — first contact. Gives the Compass of the Storm. Per the
  Bible's conflict note, written as guiding/moving Eldrin, never
  commanding.

## DB Sync Log (G-items)
None — this location deliberately has no `Location` node (see Meta). No
new entities are introduced; Vorgos, Anya, and Kael are all
pre-established or covered by the Bible's own DB Sync Log (Anya/Kael are
mentioned only, not yet fleshed-out DB characters as of this writing —
out of scope for this spec to add).
