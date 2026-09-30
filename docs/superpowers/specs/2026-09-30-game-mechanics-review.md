# Arcane Majesty (amo) — Game Mechanics Review

**Date:** 2026-09-30 · **Scope:** every gameplay system in `apps/amo/src` (not visuals).
**Method:** read the systems and scenes, and loaded the data modules to measure them
(item sources, recipe inputs, XP curve). Findings are marked **BUG** (wrong behaviour),
**EXPLOIT**, **GAP** (missing piece) or **DESIGN** (works, but should change).

---

## 1. What exists today

| System | Where | State |
|---|---|---|
| Campaign spine (12 chapters, gating, unlocks, save) | `CampaignManager`, `data/campaigns/` | Built and tested; 10 of 12 chapters run on placeholder quests/maps |
| Quests (kill, talk, gather, collect, cook, read signs, attune, spell, resonance…) | `QuestManager`, `data/quests.js` | 15 real quests (prologue forest, Summit) + 10 chapter stubs |
| Combat (melee, crits, weapon types, enchants, bosses) | `CombatManager`, `Enemy`, `BossEnemy` | Working; 115 enemy types incl. ~60 animals |
| Spells (61, 8 elements, 3 tiers) discovered by **resonance** | `data/spells.js`, `PlayerStats` | Working; distinctive system |
| Skills (9) + Masteries (6, bought with Resonance Insights) | `PlayerStats`, `SkillTreeScene` | Working |
| Status effects (18: wet, frozen, burning, poison, blessed…) | `StatusManager`, `data/statuses.js` | Working |
| Items (136): 45 weapons, 8 armor/accessories, consumables, materials | `data/items.js` | Working |
| Campfire: **Rest / Cook (30 recipes) / Brew (20 potions)** | `CampfireScene` | Broken by the stacking bug (§2.1) |
| Crafting (6 gear recipes) | `CraftingScene`, `data/craftingRecipes.js` | Broken by the stacking bug |
| Gathering (6 nodes: wood with an axe, ore with a pickaxe) | `worldMap.js GATHERING_NODES`, `GameScene` | Working, very narrow |
| Shops (two currencies: glint & gold, regional bias) | `ShopScene`, `MERCHANT_CATALOG` | Working |
| Chests, fast travel, Aetheric Tear, world map, codex / memories, satchel tiers | scenes | Working |
| Save (stats, inventory, quests, campaign, spells, resonance, codex…) | `SaveManager` | Working |

The foundation is broad. The problems are concentrated in the **crafting economy**
(broken counting, narrow inputs, no gathering of food/herbs) and the **progression
curve**.

---

## 2. Findings

### 2.1 BUG — stacked ingredients are counted and consumed as slots (critical)
`PlayerStats.addItem` stacks stackable items into **one** slot with a `qty`. But
`CampfireScene._countItem` / `_make` and `CraftingScene._countItem` / `_craft` count
**slots** (`inventory.filter(...).length`) and remove **whole slots** (`splice`).
- Any recipe needing 2+ of a stackable ingredient is **never craftable**
  (e.g. Herb Tea needs 3 herbs: with 20 herbs in one stack the count is 1).
- A recipe needing 1 of an ingredient **deletes the whole stack**.
- This disables most of Cook (all multi-quantity recipes), most of Brew
  (every potion needs 2+ of something) and 5 of 6 crafting recipes.

**Fix:** count `sum(qty)` and decrement quantities (one shared helper on
`PlayerStats`: `countItem(id)`, `consume(id, n)`), used by both scenes. Add a unit test.

### 2.2 EXPLOIT — Grand Feast permanently raises max HP each time
`grand_feast.onUse` does `maxHealth += 20` and is stackable/repeatable. Ten feasts =
+200 max HP forever. **Fix:** make it a timed "Well Fed" buff (see §3.2), or a
one-time unlock.

### 2.3 DESIGN — the XP curve stops the game around level 12
`xpToNextLevel *= 1.5` per level. Cumulative XP: L6 ≈ 1.3k, L11 ≈ 11k, **L16 ≈ 87k,
L21 ≈ 662k**. Enemies give 5–60 XP (median 28): reaching level 21 would take
~23,000 kills. **Fix:** a polynomial curve (e.g. `100 · L^1.6`, ~L20 at ~25k total) and
scale enemy XP by region tier; quest XP carries the main path.

### 2.4 GAP — nothing edible or medicinal is gathered
Every cooking/brewing input comes only from **creature drops**: herbs from wolves,
foxes, sheep; mushrooms from mushroom creatures; crystals from elementals. The 6
gathering nodes give only wood and ore. `heart_crystal` (Regeneration Potion, Elixir
of Clarity) comes **only from one chest** — those recipes are effectively dead.
**Fix:** a gatherable-resource layer (herb patches, mushrooms, berries, fishing
spots, crystal outcrops) — §3.1.

### 2.5 GAP — alchemy is "Brew" at the campfire, not its own craft
Potions are brewed at any campfire. The catalogued **Alchemy Table** art (3 tiers,
animated) is unused. There is no alchemy progression, no ingredient properties, no
reason to visit a place. **Proposal:** §3.3.

### 2.6 DESIGN — food effects are flat and overlap potions
30 dishes mostly do "heal X + regenerate Y". Few create choices; nothing is timed or
exclusive; a dish and a potion do the same job. **Proposal:** meals give one timed
**Well Fed** buff (only one at a time, the stronger replaces), potions give instant
effects — §3.2.

### 2.7 BUG — Speed Draught doesn't give speed
It applies *Blessed* (×1.10 stats). Either add a `swift` status (move speed ×1.25) or
rename it. Same review needed for every potion's name vs effect (table in §3.3).

### 2.8 GAP — quests have no giver, acceptance, turn-in or chaining
Quests start when a map loads (`mapDef.quests`) or on special triggers; they complete
the moment the last step fills (no return to the NPC); nothing says "B requires A";
`collect` counts pickups even if the items were since sold or eaten.
**Proposal:** add `giver`, `turnIn` (talk step to the giver, auto-appended),
`requires: [questIds]`, `chapter`, and a `have` step type that checks the inventory at
turn-in. The engine stays event-driven; this is data + a few checks.

### 2.9 DESIGN — two currencies with overlapping roles
Glint and gold are both spent in the same shops (with regional discounts); quests pay
glint; gold barely comes from anywhere. Either give each a clear role (gold = mundane
trade, glint = arcane goods/services only) or merge them. Recommendation: keep both,
make the split strict and visible in the shop.

### 2.10 GAP — gathering nodes don't regrow; world state isn't saved
Opened chests and harvested nodes are not in the save (no fields for them), so they
reset on reload — fine for nodes if intended (then add a regrow timer on purpose),
wrong for chests (infinite loot by reloading). **Fix:** persist opened chests per map;
give nodes an explicit regrow time.

### 2.11 DESIGN — attributes: strength/agility have no visible payoff on spend
Stamina/intelligence update max HP/MP immediately; strength/agility only act inside
combat formulas (damage, crit, move speed). Show their effect in the stat screen so a
point spent is visible.

### 2.12 Smaller notes
- `hunters_feast`, `hearty_stew`, `grand_feast` use the old `multi` recipe format — unify on `ingredients`.
- Recipe discovery (`seenItems`) is good; keep it, add recipe **scrolls** as loot/rewards for rare recipes.
- 29 items (mostly legendary weapons) have no data source — fine if bosses/quests grant them; the campaign should assign each one a source.
- Crafting has only 6 recipes — gear progression relies almost entirely on drops.

---

## 3. Proposals

### 3.1 Gathering layer (new)
Gatherable **nodes** placed on maps like today's wood/ore nodes, with a regrow timer
and region-specific yields. Tools gate a few (axe, pickaxe, sickle for fibre, rod for fishing).

| Node | Yields | Found |
|---|---|---|
| Herb patch | forest_herb, + regional herbs (e.g. silverleaf, emberroot, frostmoss) | forests, meadows, mountains |
| Mushroom ring | mushroom_spore, + glowcap (caves), bitter bolete | forests, caves, swamps |
| Berry bush | wild berries, sweet honeyberries | forests, village gardens |
| Fishing spot (rod) | river trout, lake perch, cave eel | rivers, lakes, underground pools |
| Crystal outcrop (pickaxe) | ice_crystal, ember_stone, heart_crystal (rare) | peaks, volcanic areas, deep caves |
| Farm plot / market | grain → flour, eggs, milk, salt | village (bought or harvested) |

This makes every current recipe obtainable without grinding specific creatures,
and ties ingredients to places (a reason to explore).

### 3.2 Cooking (campfire)
- **Well Fed** buff: one active meal buff (duration 3–10 min game time), stronger
  replaces weaker. Categories: *hearty* (max HP, regen), *spiced* (damage, fire
  resist), *light* (speed, stamina), *mystic* (mana, spell power).
- Recipes in three tiers (Camp cooking → Hearth → Feast) that combine a base (meat,
  fish, grain), an accent (herb, spice, crystal) and a region ingredient.
- Keep: instant small heal on eating, the discovery-by-seen-ingredients list.
- Fix: Grand Feast becomes a top-tier buff; no permanent stat gains from food.

### 3.3 Alchemy (new station)
- Brewing moves to **alchemy tables** (in towns, the Tower, some camps); the campfire
  keeps only a few "field remedies" (Herb Tea, Antidote, Health Potion).
- Ingredients carry one or two **properties** (Restorative, Arcane, Warming, Chilling,
  Toxic, Purifying, Spectral…). A recipe needs properties, not exact items, once the
  player has learned it — so regional herbs substitute naturally.
- **Alchemy rank** 1–3 (Apprentice → Adept → Master), raised by brewing; the three
  catalogued table tiers match the ranks. Higher rank: better potency, extra yield.
- Potions: instant (heal, mana, cure), timed (resist, swift, stone skin, clarity),
  offensive (thrown vials: frost, fire, poison, void). Every name matches its effect.

### 3.4 Crafting
Extend from 6 to ~25 recipes along the chapter path (each region's materials make
that region's gear); legendary weapons come from quests/bosses (assign each a source).

### 3.5 Quests — engine additions
`giver`, auto `turnIn`, `requires`, `chapter`, `have` steps, optional `choices`
(dialogue branch sets a flag), and rewards that can grant a **recipe**.
All additive; existing quests keep working.

---

## 4. Suggested order of work
1. **Fix the critical bugs** (stack counting §2.1, Grand Feast §2.2, Speed Draught §2.7, chest persistence §2.10). Small, safe, testable.
2. **Progression curve** (§2.3) — one formula + enemy XP by tier.
3. **Quest engine additions** (§3.5) — needed before writing campaign content.
4. **Economy design pass**: ingredient catalogue, gathering nodes per region, cooking & alchemy recipe tables (§3.1–3.3) — as data, with tests that every recipe input has a source.
5. **Campaign content**: chapter by chapter from the bible — main quest, 2–4 side quests per location, NPCs and dialogue — each checked against the lore graph (Neo4j) before it is written.
