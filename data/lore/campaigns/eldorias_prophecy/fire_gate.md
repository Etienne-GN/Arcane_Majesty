# Map Spec: Fire Gate

## Meta
- **DB Location node:** Fire Gate (origin: album)
- **Campaign Bible entry:** Song 6 — Treachery's Bite (`data/lore/campaigns/Eldorias_Prophecy_campaign.md`)
- **Biome / region:** Eldoria > Thaloria (per CLAUDE.md's planar hierarchy and the Bible's own DB Sync Log G2, which added Fire Gate as a Thaloria-parented location)
- **Act / progression position:** Act II, 5th map in the linear campaign path (Sylvan Sanctuary → **Fire Gate** → The Descent → ...)

## Narrative Anchor
The Fire Gate's first landing — black glass, the snow-line/ash
transition below Sylvan Sanctuary's green. Oren strikes here: "the
dagger that the shadows bring." He is revealed as Voraun's agent of
thirty years, a shadow-blade arm grafted from Voraun's touch — but his
scholarship and kindness across the journey were real; this is the
hardest mask to remove, one made of true things. Oren does not kill
Eldrin: the Stone needs a hand it accepts, and Eldrin is too valuable
to lose. He takes Eldrin's journal (the coordinates) and descends the
labyrinth ahead, leaving Eldrin alone for the rest of the campaign.
Main quest "Treachery's Bite" (survive the ambush, lose the journal
permanently). Canon anchors: Fire Gate, Oren, Voraun, event *Oren's
Betrayal at the Fire Gate* (`LOCATED_AT Fire Gate` in the DB).

**Conflict note carried from the Bible:** Oren is written as a
sympathetic traitor, never a cartoon villain — this is a scripted
set-piece, not a normal boss fight the player can lose in the usual
sense. His later fate (the Warden has the sword) is only seeded here,
never shown.

## Geography & Connectivity
- **From Sylvan Sanctuary:** a short descent from the valley's green
  into black glass — per the Sylvan Sanctuary spec, a ~15x15 connector
  stretch already covers the transition; Fire Gate itself is the first
  landing at the bottom of that descent.
- **Fire Gate map size:** a compact, contained set-piece — ~25x25 tiles.
  This is a single scripted landing, not an open dungeon: small enough
  that the betrayal reads as an ambush rather than getting lost in scale.
- **To The Descent:** immediately after the betrayal — Oren flees ahead
  into the labyrinth, and Eldrin's own path continues down alone. No
  separate connector map: The Descent begins at Fire Gate's far edge,
  the moment the journal is gone.
- **Terrain description:** Black volcanic glass underfoot, the last
  patches of snow giving way to ash and heat-haze at the landing's far
  side. The stone here is sharp-edged and unweathered — this place was
  never meant to be crossed casually. No settlement, no shelter: a
  waypoint, not a place to linger.

## Points of Interest
- **The Ambush Landing** (Bible-named, detailed here): the set-piece
  itself — where Oren turns. A scripted combat/dialogue sequence rather
  than a free-roam encounter; the landing's layout should support a
  short duel that ends in Oren's forced flight, not a normal victory
  condition.
- **The Journal's Last Resting Place** (new, minor): a small alcove near
  the landing where Eldrin's satchel is knocked loose during the
  struggle — an environmental detail underscoring the permanent loss
  (the journal itself is gone, taken by Oren; this is just the visual
  beat of the moment it happened).

## Spawns — Enemies
| Creature | Count | Notes |
|---|---|---|
| Void-Squire | 2 (support during the ambush) | Standard Umbral Legion infantry; shadow-blades that "flicker," making them hard to parry (per `bestiary.md`) |
| Aether-Leech | 1 (support during the ambush) | Mana-draining floater; intercepts projectiles (per `bestiary.md`) |

Per the Bible, the boss of this map **is Oren** — a duel he flees from
rather than a killable encounter; the Void-Squire/Aether-Leech pair are
support enemies dressing the ambush, not a separate combat area.

## Spawns — Wildlife / Gathering
None. This is a hostile transitional waypoint, not a place with
peaceful wildlife or gathering content — consistent with its role as a
single scripted betrayal set-piece.

## Treasure & Loot
| Source | Contents | Tier |
|---|---|---|
| Treachery's Bite (main quest, permanent loss) | The Journal (with the coordinates) — taken by Oren, **not recoverable** | N/A — quest item removed, not gained |
| Treachery's Bite (main quest reward) | Umbral Dagger (stealth/silent takedowns) | Tier II — Adept/Steel |

The Bible is explicit this is a real, permanent consequence — the
journal's loss is not a bug to route around in later specs; the
Ruins of Eldoria and Heartstone Chamber specs (below) must not assume
the player still has it.

## Quests
- **Main:** "Treachery's Bite" — survive the ambush; the journal is lost
  permanently; Umbral Dagger is granted as the encounter's resolution.
  (From the Bible — pointer, not full re-write.)

## NPCs
- **Oren** — companion-turned-betrayer. This is a scripted set-piece,
  not a normal recruitable/persistent NPC from this point forward — he
  flees at the end of this map and does not appear again in the
  mainline until his fate is seeded (not shown) in later specs.

## DB Sync Log (G-items)
None. Fire Gate, Oren, and Voraun are already covered by the Bible's own
DB Sync Log (G1/G2); this spec introduces no new entities beyond the
minor "Journal's Last Resting Place" set-dressing detail, which is a
prop, not a DB node type.
