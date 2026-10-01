# Mechanics Expansion — Design

**Date:** 2026-09-30 · **Game:** `apps/amo` (Phaser 3) · **Status:** approved by the user ("all of it")
**Source:** the mechanics review of 2026-09-30 (conversation) — 20 additions in five phases.
**Related:** `docs/superpowers/specs/2026-09-30-game-mechanics-review.md` (first review; its
open items §2.5 stations, §2.8 quest engine, §2.9 currencies are folded in here).

## Why

The game has breadth (73 spells in 9 elements, reactive statuses, enemy magic, 115
creature types, cooking/brewing/crafting/enchanting, gathering, a campaign spine), but
the loop *around* combat is thin: dying throws you to the menu, cleared maps stay
empty, nothing scales by region, elements don't matter against monsters, enemy state
can't be read, and quests have no giver or turn-in. This expansion fixes the loop
first, then deepens combat, the economy, quests and the world.

## Global rules (every phase)

- Commit directly on `main`, small commits, message trailer as in the repo.
- No new npm dependencies.
- Game logic that can be pure lives in Phaser-free modules (`src/data/*`, pure helpers
  in `src/systems/*`) so it is testable with `node tools/test_*.mjs`; every new test
  file is added to `npm test`.
- Old saves must keep loading: every new save field has a default.
- New lore-facing names (places, NPCs, items) are checked against the Neo4j lore DB
  (scarif) before they are written; game-only content is `origin: "game"`.
- The manual (`docs/manual/index.html`, served on :5175) regenerates from data; every
  phase extends `tools/gen_game_inventory.mjs` for what it adds and commits the
  regenerated `docs/manual/index.html` + `docs/game_inventory.md`.
- English in code, data and UI.

---

## Phase 1 — Foundations (the game becomes a loop you can keep playing)

### F0. Save slot fix (found during planning)
Several saves call `SaveManager.save(stats)` without story/character ids (Crafting,
Campfire, rift-gates, fast travel) and write to `amo_save_undefined_undefined`.
**Design:** `SaveManager` remembers the active slot (`setSlot(storyId, characterId)`,
set by `GameScene.init` and by `load`); `save()` defaults to it.

### A1. Death → respawn, and Continue resumes where you were
- The save stores `location {mapId, x, y}` (kept fresh by `GameScene` every 0.5 s and set
  to the destination before a portal transition) and `respawnPoint {mapId, x, y, label}`.
- Respawn points are set by: interacting with a campfire, attuning or using a rift-gate,
  fast-travel arrival. Each one saves.
- **Continue** (character select) starts on `location` — today it always starts on the
  default map's start tile.
- **Death:** the Game Over screen offers *Rise at <respawn label>* and *Return to Menu*.
  Rising applies the death penalty — lose 10% of glint (rounded down), come back at 50% HP
  and full MP, statuses cleared — and starts `GameScene` on the respawn point (falling
  back to the death map's start). Inventory and XP are kept.

### A2. Region level bands + enemy respawn
- **Level band** per map: `mapDef.levelBand {min, max}` if set; else from the campaign
  chapter that first claims the map (chapter index *i* → levels 1+2i … 3+2i); maps outside
  the campaign are 1–3.
- Every hostile spawn rolls a level in the band and scales: HP ×(1 + 0.15·(L−1)),
  damage ×(1 + 0.10·(L−1)), XP ×(1 + 0.12·(L−1)), gold ×(1 + 0.10·(L−1)). Enemy spell
  damage scales like melee damage. Passive animals are not scaled. Online (server-
  authoritative) enemies are not scaled.
- **Respawn (single-player):** a creature spawned from the map's spawn list comes back
  `mapDef.respawnMs` (default 120 s) after it dies, at its spawn point, but only when the
  player is at least 320 px away (retry every 10 s). Split/summoned creatures and the boss
  never respawn.

### A3. World state remembered per map
`stats.worldState = { [mapId]: { nodes: { 'x,y': readyAt }, bossDefeated: true } }`.
- A harvested node stays harvested across reloads until its real-time `readyAt`
  (remaining time clamped to the node's regrow time, so a clock change can't lock it).
  Expired entries are pruned on save.
- A defeated boss stays defeated (today he respawns on reload with guaranteed tier-4
  drops).

### B5. Area spells: cast distance and area size are separate
Every `targeted_aoe` spell gets `radius[3]` (its old `range`, the area size) and
`range[3]` becomes the cast distance: `max(old range, [160, 180, 200][tier])`. The
reticle and every area effect (damage, statuses, dispel, Quagmire's zone) use `radius`.
Fireball already works this way.

---

## Phase 2 — Combat depth

### B1. Elemental resistances, weaknesses and immunities
- `ENEMY_TYPES[t].resist = { fire: 0.5, ice: 1.5, … }` — multiplier on spell damage of
  that element (applied in `GameScene._hit` with the hit's element), and
  `immune: ['burning', …]` — statuses that cannot be applied (`statusManager.apply`
  returns early). Lightning on wet and the other status multipliers still stack.
- Defaults by family, written into the data (not inferred at runtime): fire creatures
  (ember_imp, lava_elemental, ash_crawler, forge_daemon, cinder_hawk, fire_lizard,
  ember_lizard) fire 0.25 + immune burning, weak to water and ice ×1.5; ice creatures
  (frost_bear, ice_revenant, blizzard_sprite, wendigo, glacier_crab, frost_shade,
  polar_bear) ice 0.25 + immune cold/frozen, weak to fire ×1.5; void/shadow (void_*,
  shadow_sprite, soul_eater, rift_walker, mirror_shade) shadow 0.5, weak to arcane ×1.4;
  undead (skeleton_archer, grave_wraith, cursed_knight) weak to fire and arcane ×1.3,
  immune poison; plant/fungal (treant, vine_horror, mushroom_*) weak to fire ×1.5,
  resist earth/nature 0.5; constructs (stone_golem, crystal_golem, runic_turret,
  arcane_sentinel) immune poison/bleed, weak to lightning ×1.3; aquatic (shark,
  bog_lurker, frogs) water 0.5, weak to lightning ×1.4.
- A resisted/weak hit shows "resist"/"weak!" in the damage number colour.

### B3. Three new reactions
- **Freeze:** applying `cold` to a `wet` target turns it `frozen` (3 s) and removes wet.
- **Conduct:** a lightning hit on a wet target arcs to every other wet enemy within 90 px
  for 50% of the hit (no further chaining).
- **Detonate:** a fire hit on a `void_tainted` target bursts: 15 + 30% of the hit to
  enemies within 50 px, removes the taint.
All in `StatusManager`/`GameScene._hit`, each with a short VFX and a tested pure rule.

### B4. Enemy target frame
A HUD panel (top centre) for the current target — the last enemy you hit or hit you,
or the one under the pointer: name, level, HP numbers and bar, status chips with timers
(same chips as the player's), and the spell it is casting with a progress bar. Clears 4 s
after the target dies or leaves 400 px. The boss uses it too.

### B2. Elite variants
- Each hostile map spawn has an 8% chance to be elite (at most one elite per six
  spawns on a map; the boss and passive animals never).
- Elite: HP ×2.5, damage ×1.4, XP ×3, gold ×3, sprite scale ×1.2, a gold "Elite" tag in
  the target frame, and 1–2 affixes from: *Warded* (Mana Ward reapplied every 20 s),
  *Swift* (permanent Hastened), *Vampiric* (heals 30% of the damage it deals),
  *Arcane* (gains `arcane_bolt` in its kit), *Thorned* (reflects 15% of melee damage).
- Drops: one extra loot roll and one guaranteed rare gathering item from its region pool.

### F1. Bestiary
A Codex tab listing every creature you have killed: kill count (new
`stats.killCounts {type: n}`, kept beside `killedEnemyTypes`), HP and damage at your
current region band, resistances/weaknesses/immunities (B1), loot table, spells (enemy
kits). Unkilled creatures appear as "???" once seen.

### F2. Spell tooltips with real numbers
The Spellbook detail shows, for your tier and INT: damage per hit, status and its scaled
duration, mana, cooldown, cast range and area, discover/mastery progress bars.

---

## Phase 3 — Economy

### C2. Consumable hotbar
Four slots on keys **1–4** (verify they are free in `controls/keys.js`; touch: four small
buttons above the skill ring). `stats.hotbar = [itemId|null ×4]`, saved. Assign from the
Inventory ("Hotbar 1–4"); using one consumes one of that item; the slot shows the count
and greys out at 0. A shared 1 s cooldown prevents double use.

### C5. Currency roles + buy-back
- Gold buys mundane goods (food, tools, bags, materials, mundane gear); glint buys arcane
  goods (potions, scrolls, staves, enchanted gear). Each `MERCHANT_CATALOG` entry gets
  exactly one currency; the shop shows only that price.
- Selling pays in the item's currency. The shop keeps a buy-back list of your last 10
  sales (session only), repurchasable at the sell price.

### C1. Cooking hearth and alchemy table
- Map objects `spawns.stations: [{ x, y, type: 'hearth' | 'alchemy', rank: 1–3 }]`,
  using the catalogued Alchemy Table art (3 tiers) and a hearth sprite.
- Recipes get `station` and `rank`. The campfire keeps the simple ones (one or two
  ingredients, no station); feasts, three-plus-ingredient dishes, greater potions and
  elixirs move to stations.
- Craft ranks `stats.craftRanks = { cooking, alchemy }` (1–3), raised at 25 and 75
  crafts of that kind; rank 2/3 give a 15%/30% chance of a second output.
- Placement: Hermit's Hut (hearth 1, alchemy 1), Thaloria (hearth 2, alchemy 2),
  Eldrin's Tower (alchemy 3) — names verified against the lore DB.

### C3. Recipe scrolls
Items `recipe_<output>` (one per scroll-locked recipe); using one adds the recipe to
`stats.knownRecipes`; recipes with `requiresScroll: true` stay hidden until known.
Sources: elite loot, boss drops, chests, merchants (rank-gated), quest rewards. About a
dozen rare recipes are scroll-locked.

### C4. Gear upgrades at the forge
`stats.gearUpgrades = { [itemId]: 1–3 }` (per item id, like forge enchantments). Forge
category "UPGRADE EQUIPPED": +1/+2/+3 cost scales with the item tier (ore, silver,
heartwood/crystals, aether-shard at +3). Effect: weapons +8% damage per level; armour and
accessories +1 to each of their stats per level. Shown as "+N" after the item name.

---

## Phase 4 — Quests

### D1. Quest engine additions
- Quest fields: `giver` (NPC id), `turnIn` (default: the giver; a "Return to <name>"
  talk step is appended automatically), `requires: [questIds]`, `chapter`,
  `requiresFlags: [flag]`, `repeatable`.
- Step type `have {itemId, qty}` checked live against the inventory (and consumed on
  turn-in when `consume: true`).
- Dialogue choices: a line can carry `choices: [{ text, setFlag?, startQuest?, next? }]`;
  flags live in `stats.flags` (saved).
- Rewards: `xp, glint, gold, items, recipe, spell, insight`.
- The journal shows giver, turn-in place and requirements. Existing quests keep working
  unchanged (all fields optional).

### D2. Bounty board
A board object in towns. It offers three bounties per day (seeded by the day number —
the game day from E1 when it exists, otherwise the real date): hunt N of a creature of
the region, hunt an elite, or bring N of a regional gathered item. Rewards scale with the
region band. Built on D1 as `repeatable` generated quests; one active bounty per board.

---

## Phase 5 — World

### E2. Weather
- Per-map weather table by biome (`mapDef.weather` or a biome default): clear, rain,
  storm, snow, sandstorm, changing every 4–8 game hours (or 6–12 real minutes before E1).
- Rain: entities outdoors become wet every 10 s; fire spell damage ×0.8, lightning ×1.2;
  `stand_in_rain` resonance ticks. Storm: rain + random lightning strikes (telegraphed).
  Snow: cold on the player every 20 s unless within 120 px of a campfire or Warming.
  Sandstorm: sight ranges ×0.6, view overlay. Overlays are particles + tint.

### E1. Day/night cycle
- Game clock: one real minute = one game hour (24-minute day), saved; HUD clock.
- Ambient tint by hour; light radius around the player and campfires at night.
- Spawn entries can carry `time: 'day' | 'night'`; shadow/void creatures deal +20%
  damage at night; some yield entries are `nightOnly` (moonpetal blooms at night).

---

## Out of scope
Random per-item affixes on every drop (needs an item-instance inventory — a separate
project), mounts, housing, PvP, a skill-tree rework.

## Order and dependencies
Phase 1 first (respawn points, level bands and world state are used by elites,
bounties, the bestiary and weather). Inside Phase 2: B1 → B3 → B4 → B2 (elites need the
target frame) → F1 (needs B1 data and kill counts) → F2. Phase 3: C2, C5, C1, C3 (needs
stations), C4. Phase 4: D1 then D2. Phase 5: E2 then E1 (E2 works on real time until E1
lands). Each phase gets its own detailed implementation plan when the previous phase is
done, written against the code as it is then.
