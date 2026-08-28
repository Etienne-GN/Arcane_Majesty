# Map Spec: Heartstone Chamber & The Ancient Door

## Meta
- **DB Location node:** Heartstone Chamber (origin: album; reparented under Ruins of Eldoria per the Bible's DB Sync Log G2) and The Ancient Door (origin: album, new per G2)
- **Campaign Bible entry:** Song 10 — Heart of War (`data/lore/campaigns/Eldorias_Prophecy_campaign.md`)
- **Biome / region:** Eldoria > Thaloria > Ruins of Eldoria > Heartstone Chamber (nested); The Ancient Door sits beyond it, deeper still (per CLAUDE.md's planar hierarchy and the Bible's own reparenting note)
- **Act / progression position:** Act III climax, 9th map (Ruins of Eldoria → **Heartstone Chamber → The Ancient Door** → Ruins of Eldoria [Song 11 return, narrative only])

## Narrative Anchor
The Heartstone Chamber, past the rune-dead gate: Voraun, the Silent
Executioner, reaches for the Stone and is burned by the ward — his
dying truth seeds the next saga. The Heartstone is **accepted**:
resonance synced to Eldrin. Then the ancient door appears — older than
the valley — and the Shadow Balrog rises from the floor. Eldrin fights
as a mage (runes, ward, beacon, staff, Aether Sight) and loses the duel
by force; the Balrog eats runes; its hunger's weight pins him ("placed,
not fallen"). Force fails utterly — it cannot be commanded or bargained
with. Eldrin stops demanding and stands as what the Stone is meant for:
its intended guardian. The Balrog settles, satisfied — **not defeated,
not commanded, not tamed**. Mastery through humility. Vorgos then steps
from time (Song 11, at the Ruins of Eldoria — see that spec). Main
quest "Heart of War" (carry the Stone out past the Executioner, survive
the Balrog, the door opens). Canon anchors: The Ancient Door, The
Shadow Balrog, Voraun, The Heartstone of Creation, events *The
Retrieval of the Heartstone* + *The Shadow Balrog Yields* (`LOCATED_AT
The Ancient Door` in the DB).

**Conflict note carried from the Bible (critical, binding on
implementation):** album text says the Balrog was "corrupted by dark
forces… seeks the Heartstone" and later "defeated" — these are
**recorded overrides** (ACC E1–E4). The Balrog is ancient and
untamable, does **not** seek the Stone, and is **never** defeated or
commanded. Any playable encounter here must not show a kill or a
taming — see Boss Design below, copied from the Bible's own dedicated
section since this is the campaign's most conflict-sensitive fight.

## Geography & Connectivity
- **From Ruins of Eldoria:** the rune-dead gate itself is the
  connection (a resonance-lock puzzle, per that spec) — Heartstone
  Chamber begins the moment the gate opens.
- **Heartstone Chamber map size:** ~30x30 tiles — a contained inner
  sanctum, small and reverent rather than sprawling; the ward's glow
  and the Stone's pulse should dominate the space visually.
- **The Ancient Door map size:** ~25x25 tiles, nested past the chamber —
  per the Bible, "older than the valley," appearing only once the
  Heartstone is secured. A single self-contained arena for the Balrog
  encounter; no side content competes with this space, matching its
  status as the campaign's heaviest set-piece.
- **To Ruins of Eldoria (Song 11 return):** immediate — once the Balrog
  settles and the door opens, the scene cuts to Vorgos's reveal back at
  the Ruins of Eldoria (see that spec's Song 11 section); no new map
  needed for the transition itself.
- **Terrain description:** The Heartstone Chamber is close, quiet, lit
  by the Stone's own pulse and the ward's line on the floor — Voraun's
  duel happens at that ward's edge. The Ancient Door's chamber beyond it
  is older, starker, floor worn smooth by nothing that walks — the
  Balrog rises from the floor itself rather than entering from anywhere,
  reinforcing that it belongs to this place rather than intruding on it.

## Points of Interest
- **The Ward's Line** (Bible-named, detailed here): the boundary in the
  Heartstone Chamber's floor that Voraun cannot cross — unworthy hands
  burn. The tactical spine of his duel: fought at the ward's edge, won
  by carrying the Stone out past him rather than a normal HP-depletion
  kill.
- **The Ancient Door** (Bible-named, detailed here): appears only after
  the Heartstone is secured — "older than the valley." Its opening is
  the campaign's structural payoff, tied directly to the Balrog's
  Settle phase (see Boss Design), not to any conventional key/puzzle
  mechanic.

## Spawns — Enemies
| Creature | Count | Notes |
|---|---|---|
| Hollow Guard | 2 (Heartstone Chamber only) | Ancient armor possessed by Nythorian souls; reflects projectiles (per `bestiary.md`) |
| Legion remnants | 2 (Void-Squire, Heartstone Chamber only) | Standard Umbral Legion infantry per `bestiary.md`'s roster |

Per the Bible: at the chamber, Legion remnants and a Hollow Guard or
two; at the door, **the Balrog is the whole encounter** — no other
enemies share that space.

## Spawns — Wildlife / Gathering
None. Both spaces are climactic, contained set-pieces — no ambient
wildlife or gathering content fits either.

## Treasure & Loot
| Source | Contents | Tier |
|---|---|---|
| Heart of War (main quest reward, carried through both encounters) | The Heartstone of Creation (carried, central quest item) | N/A — narrative artifact, not tiered gear |
| Heart of War (main quest reward) | Insight: Mastery Through Humility | N/A — mechanic, not gear |
| Heart of War (main quest reward, permanent unlock) | The ward of the keeping (first use, against Voraun) | N/A — mechanic, not gear |

No conventional loot chests here — per the Bible, this map's rewards
are entirely narrative/mechanical, matching its status as the
campaign's climax rather than a farming location.

## Quests
- **Main:** "Heart of War" — carry the Stone out past Voraun; survive
  the Balrog; the door opens. (From the Bible — pointer, not full
  re-write; see Boss Design below for the two encounters this quest
  gates.)

## NPCs
- **Voraun, the Silent Executioner** — boss; see Boss Design.
- **The Shadow Balrog** — boss; see Boss Design.
- Voraun's dying truth plays post-fight as a scripted line, seeding the
  next saga (not a placed, ongoing NPC).

## Boss Design
*(Copied near-verbatim from the Bible's own dedicated Boss Design
section — this fight's canon constraints are unusually strict and
should not be re-derived or paraphrased away from the source.)*

### Voraun, the Silent Executioner (tactical duel)
- **Canon constraints:** runic reflection (mirrors magic back),
  shadow-blade across the ward's line; cannot touch the Stone
  (unworthy hands burn); on orders to *prevent* the Stone's use.
- **Mechanic:** his rune-reflection turns the player's own spells into
  dodgeable patterns; fought at the ward's edge. Canon win: **carry the
  Stone out past him** — his reach into the ward is what burns him.
  Dying truth seeds the next saga.

### The Shadow Balrog (survival / humility encounter)
- **Canon constraints:** ancient, untamable, subservient to no one;
  exists to protect the ancient door from misuse; hungers for light;
  cannot be commanded or bargained with; force fails — it *eats* runes;
  it yields only to the one the Stone accepts. Never defeated, never
  tamed.
- **Mechanic:** a "boss" with **no HP bar and no kill**. Three
  escalating phases:
  1. *Probe* — the player's strongest magic is absorbed; the hunger's
     weight begins to press.
  2. *Pinned* — the player is forced to their knees ("placed, not
     fallen"); damage keeps coming but cannot be answered by force.
  3. *Settle* — when the player **stops casting and stands as the
     Stone's guardian** (a non-combat resolve prompt / hand-empty
     moment), the Balrog settles, satisfied; the door opens.
- **Failure state:** if the player keeps attacking, the pressure never
  releases — the encounter cannot be won by damage; it must be *endured
  into yielding*.
- **Payoff:** no death, no taming, no banner; the door opens, and the
  player understands why.

## DB Sync Log (G-items)
None. Heartstone Chamber (reparented under Ruins of Eldoria) and The
Ancient Door are both already recorded fixed in the Bible's own DB Sync
Log (G2); no further new entities are introduced by this spec.
