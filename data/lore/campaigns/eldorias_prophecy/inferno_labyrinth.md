# Map Spec: Inferno Labyrinth

## Meta
- **DB Location node:** Inferno Labyrinth (origin: album)
- **Campaign Bible entry:** Song 8 — Inferno's Trial (`data/lore/campaigns/Eldorias_Prophecy_campaign.md`)
- **Biome / region:** Eldoria > Thaloria (per CLAUDE.md's planar hierarchy — Inferno Labyrinth is one of Thaloria's locations, per the Bible's own DB Sync Log G2)
- **Act / progression position:** Act II, 7th and final Act II map (The Descent → **Inferno Labyrinth** → Ruins of Eldoria [Act III begins])

## Narrative Anchor
Xarathos's territory — the Legion seeded its defenses with Eldrin's own
identity: "the gate of flame that calls me by my given name." A full
dungeon: golem rune-puzzle combat, Magma-Eaters, Cinder-Souls, the
flame itself burning away doubt. Xarathos, the Pyre-Lord, fights with a
mana-steal Super-Nova; the canon mechanic is a **rune-drain counter** —
when he drains the player, the player can drain back, exploiting the
crack in his Thirst-driven arrogance. Xarathos is destroyed here — the
one real kill among the three Void Generals. His dying words: "Voraun
will have you at the door." Main quest "Inferno's Trial"; side "The
Golem Frequencies". Canon anchors: Inferno Labyrinth, Xarathos, event
*Xarathos Destroyed in the Crucible* (`LOCATED_AT Inferno Labyrinth` in
the DB).

## Geography & Connectivity
- **From The Descent:** immediate — the labyrinth begins where The
  Descent ends, at the flame gate that "calls me by my given name" (per
  The Descent spec). No separate connector map.
- **Inferno Labyrinth map size:** ~55x55 tiles — a genuine dungeon, per
  the Bible's own "full dungeon" framing: large enough for multiple
  distinct combat pockets (golem puzzle rooms, Magma-Eater/Cinder-Soul
  corridors) plus the Xarathos arena as a separate climactic space at
  the far end, rather than a single corridor crawl.
- **To Ruins of Eldoria:** per Song 8's own bridge ("out of the mountain
  to the ruins under the moon"), the exit from the labyrinth leads
  directly to the ruins — a short ~15x15 connector stretch (mountain-
  to-valley transition, night falling) is enough; no second full map
  needed between them.
- **Terrain description:** A volcanic dungeon of black rock, lava
  channels, and heat-haze — narrow passages opening into wider rune-
  puzzle chambers guarded by Obsidian Golems. The air thickens with
  smoke the deeper the player goes. Xarathos's arena, at the far end,
  is a floor-is-lava set-piece — open, exposed, no cover, matching his
  Super-Nova mechanic.

## Points of Interest
- **The Flame Gate** (Bible-named, detailed here): the labyrinth's
  entrance — it "calls him by his given name," a scripted opening
  sequence establishing that the Legion specifically targeted Eldrin,
  not a generic ward.
- **The Golem Rune-Puzzle Chambers** (Bible-named): multiple rooms
  along the main path, each guarding a passage with an Obsidian Golem
  vulnerable only to a specific magic frequency — the mechanical spine
  of "The Golem Frequencies" side quest.
- **Xarathos's Crucible Arena** (Bible-named, detailed here): the
  labyrinth's climax — a floor-is-lava arena where the Pyre-Lord fights;
  his dying words here seed Voraun's presence at the Ruins of Eldoria's
  door, directly setting up the next spec.

## Spawns — Enemies
| Creature | Count | Notes |
|---|---|---|
| Magma-Eater | 4 | Lizard-like creatures that consume fire spells to grow larger (Sensitivity 2) — per `bestiary.md` |
| Cinder-Soul | 3 | Floating fire skulls; explode into Void-Flame, burning HP and Mana (Sensitivity 1) |
| Obsidian Golem | 3 (one per rune-puzzle chamber) | High-defense constructs, vulnerable only to a specific magic frequency — runic puzzle combat (Sensitivity 0) |
| Void-Squire | 2 | Standard Umbral Legion infantry; flickering shadow-blades hard to parry |
| Aether-Leech | 2 | Mana-draining floaters; intercept projectiles |

## Spawns — Wildlife / Gathering
| Type | Count | Time | Notes |
|---|---|---|---|
| Mineral Ore (gathering node) | 3 nodes | Always | Volcanic rock exposed along side-passages, away from the main combat path |

No peaceful wildlife fits a labyrinth this hostile; gathering content
stays minimal and combat-adjacent.

## Treasure & Loot
| Source | Contents | Tier |
|---|---|---|
| The Golem Frequencies (side quest reward) | Rune-frequency notes (unlocks the bypass mechanic) + a Tier II item | Tier II — Adept/Steel |
| Xarathos, the Pyre-Lord (boss kill — the one real General kill) | Runic Focus (mana-scaling item) + spell Inferno's Trial (finisher requiring a Casting Window) | Tier III — Master/Runic |
| Xarathos (boss kill, bonus) | 2x Aether-Shard (Foundry-of-the-Ancients upgrade material, per `equipment_tiers.md` §5) | Tier II→III bridge material |

This is the campaign's first Tier III (Runic) drop, matching
`equipment_tiers.md`'s rule that such gear appears rarely, hidden behind
a real boss kill — Xarathos being the only General actually defeated
makes this the natural place for it.

## Quests
- **Main:** "Inferno's Trial" — navigate the labyrinth, defeat Xarathos
  using the rune-drain counter. (From the Bible — pointer, not full
  re-write.)
- **Side:** "The Golem Frequencies" (Bible-named) — find the rune-
  frequencies needed to bypass the Obsidian Golems guarding the puzzle
  chambers.

## NPCs
None during the dungeon proper. Post-boss, Xarathos's dying words
("Voraun will have you at the door") play as seeded lore — a scripted
line, not a placed NPC.

## DB Sync Log (G-items)
None. Inferno Labyrinth and Xarathos already exist as DB nodes
(`origin: album`, per the Bible's own DB Sync Log G1/G2); no new
sub-locations or entities are introduced by this spec's rune-puzzle
chambers or arena — they're geography within the existing node, not new
DB-modeled places.
