# Map Spec: Ruins of Eldoria

## Meta
- **DB Location node:** Ruins of Eldoria (origin: album)
- **Campaign Bible entry:** Song 9 — Eldoria's Heartbeat (Act III), and Song 11 — The Weight of Eternity (Vorgos scene, Act III) (`data/lore/campaigns/Eldorias_Prophecy_campaign.md`)
- **Biome / region:** Eldoria > Thaloria (per CLAUDE.md's planar hierarchy and the Bible's own Conflict note: the DB keeps `LOCATED_IN Thaloria` so the campaign journey holds on the Material Plane, even though narratively these are the ruins of the ancient, pre-Great-Darkness realm of Eldoria)
- **Act / progression position:** Act III opens here (8th map — Inferno Labyrinth → **Ruins of Eldoria** → Heartstone Chamber/The Ancient Door), and Act III's emotional close (Song 11) revisits this same map after the Heartstone Chamber events.

## Narrative Anchor
**Song 9:** A graveyard of the golden age — a vigil, not a city. The
approach is a rune-dead gate sealed by Voraun's silence; he has been
sitting at the door of the keeping for months. Eldrin "Witnesses" the
golden age through Aetheric Witness (a new Insight granted here). The
Heartstone's echo pulses through the floor. Main quest "Eldoria's
Heartbeat"; side "The Vigil's Bones". Canon anchors: Ruins of Eldoria,
Heartstone Chamber, Voraun, The Heartstone of Creation, event *The
Retrieval of the Heartstone* (`LOCATED_AT Ruins of Eldoria` in the DB).

**Song 11 (return only):** After the Heartstone Chamber/Ancient Door
events (Song 10), Vorgos steps from time here — "a storm of grey" — and
reveals the true condition: 400 years of vigil. This is a scripted
narrative beat reusing the same ruins geography, not a new map build.

**Conflict note carried from the Bible:** "ancient realm of Eldoria"
means the golden-age realm *within* the plane Eldoria, of which these
ruins are the last trace — physically the ruins sit in a red valley
below the Inferno Labyrinth's ridge. Do not confuse this with the
Heartstone Chamber, which is reparented under Ruins of Eldoria per the
Bible's own DB Sync Log G2 (nested location, see the Heartstone Chamber
spec).

## Geography & Connectivity
- **From Inferno Labyrinth:** per Song 8's bridge ("out of the mountain
  to the ruins under the moon"), a short ~15x15 connector (already
  specced in the Inferno Labyrinth entry) leads directly here; Ruins of
  Eldoria begins where that connector ends.
- **Ruins of Eldoria map size:** ~50x50 tiles — a graveyard-scale ruin,
  large enough for the rune-dead gate approach, several ghost-echo
  Witness set-pieces, and Legion sentry pockets, without crowding the
  Heartstone Chamber entrance (which is a separate, nested map — see
  that spec).
- **To Heartstone Chamber:** the rune-dead gate itself is the
  connection — passing it (a resonance-lock puzzle, not combat) leads
  directly into the Heartstone Chamber map.
- **Terrain description:** Black stone under moonlight — broken columns,
  fallen statues of Keepers, a silence heavier than the Inferno
  Labyrinth's noise ever was. This is explicitly a vigil, not a
  ruined city to loot freely: the tone is reverent, mournful. The
  Aetheric Witness mechanic should let the golden age visibly overlay
  the present-day ruin at set points, rather than being a passive lore
  dump.

## Points of Interest
- **The Rune-Dead Gate** (Bible-named, detailed here): the approach to
  the Heartstone Chamber, sealed by Voraun's presence — his "boss" here
  is a resonance-lock puzzle (he is *felt*, not yet fought; the actual
  duel is Song 10, at the Heartstone Chamber itself).
- **The Vigil's Bones** (Bible-named): scattered ghostly echoes of the
  Keepers, explored via the Aetheric Witness mechanic — this is the
  side quest's actual content: piece together the Keepers' vigil by
  triggering Witness-vision at marked points around the ruins.
- **The Heartstone's Echo** (Bible-named, ambient): a pulse felt through
  the floor as the player nears the gate — an atmospheric/audio cue,
  not an interactive object, building toward the Chamber itself.

## Spawns — Enemies
| Creature | Count | Notes |
|---|---|---|
| Hollow Guard | 3 | Ancient armor possessed by Nythorian souls; reflects projectiles (per `bestiary.md`) |
| Void-Archer | 3 | Fires Siphon-Arrows that stay lodged in Eldrin, draining mana until pulled out |
| Legion sentries | 4 (Void-Squire per `bestiary.md`'s Umbral Legion roster) | Standard infantry stationed to guard the approach, per the Bible's "Legion sentries" line |

## Spawns — Wildlife / Gathering
None. A graveyard/vigil site — the Bible's own tone note (reverent,
still) argues against ambient wildlife or casual gathering nodes here.

## Treasure & Loot
| Source | Contents | Tier |
|---|---|---|
| The Vigil's Bones (side quest reward) | A Tier II-III lore-significant accessory (Witness-attuned) | Tier II-III — Adept/Master |
| Eldoria's Heartbeat (main quest reward) | Insight: Aetheric Witness (lore-vision over the golden age) | N/A — mechanic, not gear |

The Bible's remaining big-ticket loot (the Heartstone of Creation
itself, the ward of the keeping) belongs to the Heartstone Chamber and
Ancient Door spec, not here — this map's rewards stay supporting/lore-
tier per the progression.

## Quests
- **Main:** "Eldoria's Heartbeat" — reach the Heartstone Chamber past the
  rune-dead gate. (From the Bible — pointer, not full re-write.)
- **Side:** "The Vigil's Bones" (Bible-named) — piece together the
  Keepers' vigil through the Aetheric Witness mechanic.
- **Main (Song 11 return, narrative only):** "The Weight of Eternity" —
  Vorgos's reveal and the 400-year condition; a scripted dialogue scene
  on this same map, no new combat/quest content required beyond the
  dialogue itself.

## NPCs
- **Ghostly echoes of the Keepers** — non-interactive Witness-mechanic
  apparitions, not placed NPCs in the usual sense.
- **Voraun** — felt, not fought, at the rune-dead gate (his actual duel
  is the Heartstone Chamber, Song 10).
- **Vorgos** — Song 11 return only; the reveal scene, not present during
  the Song 9 visit.

## DB Sync Log (G-items)
None. Ruins of Eldoria already exists as a DB `Location` node
(`origin: album`); the Heartstone Chamber's reparenting under it is
already recorded fixed in the Bible's own DB Sync Log (G2). No new
sub-locations are introduced by this spec — the Rune-Dead Gate, Vigil's
Bones sites, and Heartstone's Echo are set-pieces within the existing
node, not separate DB-modeled places.
