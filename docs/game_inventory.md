# Arcane Majesty (amo) — Complete Game Inventory

_Generated from the game data by `apps/amo/tools/gen_game_inventory.mjs` on 2026-09-30. Regenerate after changing the data; don't hand-edit._

**At a glance:** 61 spells in 8 elements · 9 skills · 6 masteries · 19 status effects · 136 items (45 weapons) · 30 cooking recipes · 20 potion recipes · 6 crafting recipes · 6 enchantments · 112 enemy/creature types + 1 boss · 25 quests · 12 campaign chapters · 24 maps · 5 playable characters · 24 dialogues

## Contents
1. [Systems & controls](#systems--controls)
2. [Character & progression](#character--progression)
3. [Magic — all spells](#magic--all-spells)
4. [Status effects](#status-effects)
5. [Cooking](#cooking)
6. [Brewing (potions)](#brewing-potions)
7. [Crafting](#crafting)
8. [Enchantments](#enchantments)
9. [Items](#items)
10. [Shops](#shops)
11. [Gathering & world objects](#gathering--world-objects)
12. [Enemies & creatures](#enemies--creatures)
13. [Boss](#boss)
14. [Quests](#quests)
15. [Campaign](#campaign)
16. [Maps](#maps)
17. [Characters & stories](#characters--stories)
18. [Dialogues](#dialogues)

## Systems & controls

| Key | Action |
|---|---|
| Arrows / WASD | Move (speed 100 + 4 × Agility, × status speed) |
| Z | Attack (basic strike) |
| X | Power attack |
| E | Interact (talk, chests, signs, gathering, rift-gates) |
| Q R F T | Cast the spells in slots 1–4 |
| SPACE | Blink-Step (skill, 8 MP) |
| V | Aetheric Sight (skill: slows enemies, shows their detection range) |
| B | Build a campfire anywhere (costs 3 Wood) |
| G | Aetheric Tear — open a rift to a known place (85% of max MP, cooldown) |
| I | Inventory |
| P | Stats |
| K | Skill tree |
| J | Spellbook |
| M | World map |
| N | Quest journal |
| L | Codex (world lore, bestiary, recovered memories) |
| C | Crafting bench |
| ESC | Menu |
| Gamepad | Full support (menus and play) |

| System | How it works |
|---|---|
| Resonance | Acting with an element (kills, casting, resting…) builds resonance in it (fire, arcane, lightning, shadow, earth, ice, nature, wind). Crossing a spell's threshold **discovers** it; further thresholds raise it to Novice → Apprentice → Adept. |
| Mana scent | Casting and blinking leave an "Aetheric Scent" (0–100) that decays over time; enemies detect you from up to 3× further while it is high. |
| Mana exhaustion | Below 20% MP you suffer growing fatigue (up to −50%); emptying your mana exhausts or collapses you until you recover. |
| Aetheric Tear | Teleport by tearing space (G): costs 85% of max MP (75% with a mastery). A mastery lets you target any explored location. |
| Rift-Gates | Monoliths you attune to (E): save points and fast-travel destinations. |
| Campfires | Placed (B, 3 Wood) or found. Rest (+30% HP/MP; full rest with a Tent: full restore + 50 XP), Cook, Brew. |
| Scholar's Eye | Walking near ruins and ancient markers reveals lore echoes, collected in the Codex. |
| Pillar gates & cracked boulders | The Earth Pillar spell raises stone that opens pillar gates and shatters cracked boulders. |
| Recipe discovery | A recipe appears once you have held one of its ingredients, and is fully revealed once you have held all of them. |
| Satchel | Inventory size by satchel tier: Weathered Pouch 10, Expanded Haversack 20, Runic Satchel 35, Void-Fold 60. |
| Currencies | Gold (mundane trade) and Glint (arcane); shops price in both, with a 20% regional discount on the favoured one. |
| Memories | Completing quests recovers lore fragments ("Archive of Souls"), readable in the Codex. |
| Campaign | Eldoria's Prophecy: chapters gate which maps you can enter; completing a chapter grants its unlocks; progress is saved. |
| Saving | Stats, inventory, equipment, spells, resonance, quests, campaign, codex, explored map, attuned gates, chest contents. |
| Online | Server select, online characters, chat; other players are visible (presence). The campaign is single-player. |
| Character creator | LPC layered characters with palette swaps, export of the character and sheet (with licences). |

## Character & progression

Starting attributes: strength 5, intelligence 5, stamina 5, agility 5. Max HP = 60 + 8 × Stamina (100 at start); Max MP = 10 + 8 × Intelligence (50). Each level gives 1 attribute point and 1 skill point and fully restores HP/MP.

Combat formulas: melee damage 8 + 2 × Strength (weapon type modifiers apply); crit chance 8% + 1.2% × Agility + 5% × Keen Eye level; spell blades add 1.4 × Intelligence.

| Level | XP to next | Total XP to reach |
|---|---|---|
| 1 | 100 | 0 |
| 2 | 283 | 100 |
| 3 | 520 | 383 |
| 5 | 1118 | 1703 |
| 10 | 3162 | 11106 |
| 15 | 5809 | 31998 |
| 20 | 8944 | 67135 |
| 25 | 12500 | 118809 |
| 30 | 16432 | 189029 |

### Skills
| Skill | Type | Max level | Requirements | Effect |
|---|---|---|---|---|
| Basic Strike | active / normalattack | 5 | — | A simple melee attack. |
| Power Slash | active / infight | 5 | level 2, strength 10 | Deals heavy damage to a single target. |
| Keen Eye | passive / crit | 5 | agility 8 | Increases critical hit chance. |
| Arcane Ward | passive / subtle | 3 | level 2, intelligence 8 | Reduces damage taken by 10% per level. |
| Blink-Step | active / infight | 3 | level 3, agility 8, arcane resonance 3 | Aether dash in facing direction. 8 MP. [SPACE] |
| Mana-Shield | passive / subtle | 3 | level 2, intelligence 8, arcane resonance 5 | Absorbs 30/50/70% of incoming damage using mana. |
| Aetheric Sight | active / subtle | 3 | level 4, intelligence 12, arcane resonance 8 | Slow enemies for 2/3/4s. Reveals detection ranges. [V] |
| Shadow Step | passive / subtle | 3 | shadow resonance 10 | Shadow Veil lasts +1s/lv, costs 10% less MP/lv. |
| Arcane Mastery | passive / subtle | 3 | arcane resonance 15 | +10% spell damage per level. |

### Masteries (bought with Resonance Insights from quests: hidden 3, main 2, side 1)
| Mastery | Cost | Effect |
|---|---|---|
| Aetheric Comprehension | 3 | Aetheric Tear cooldown 60s → 45s, mana cost 85% → 75%. |
| Spatial Attunement | 5 | Aetheric Tear tier 2 — freely target any explored location on the world map. |
| Scholar's Vigilance | 2 | Scholar's Eye echo zones extend 30% further. |
| Mana Efficiency | 2 | All spells cost 10% less mana. |
| Void Sense | 3 | Aetheric Scent dissipates 25% faster. |
| Resonant Mind | 4 | Spell discovery resonance thresholds reduced by 15%. |

### Resonance gains
| Action | Resonance gained |
|---|---|
| kill wisp | lightning +3 |
| kill wolf | nature +2, fire +1 |
| kill shadow sprite | shadow +4 |
| kill void stalker | shadow +5, arcane +2 |
| kill scout | arcane +2 |
| kill treant | earth +4, nature +2 |
| kill boss | shadow +10, arcane +5 |
| take shadow damage | shadow +2 |
| use scroll | arcane +4 |
| use tome | arcane +6 |
| cast fire nova | fire +2 |
| rest campfire | fire +1 |
| cast earth pillar | earth +2 |
| cast quagmire | earth +1 |
| stand in rain | ice +1, nature +1 |
| find nature herb | nature +2 |
| use nature item | nature +3 |
| cast in wind | wind +2 |
| kill ice elemental | ice +4 |

## Magic — all spells

Values given per tier (Novice / Apprentice / Adept). Discover = resonance needed in the element; mastery = resonance for the next tiers.

### Fire (6)
| Spell | Discover / mastery | Targeting | Damage (base, per-level, scaling) | Mana | Cooldown (ms) | Range | Status | Learn from | Lore |
|---|---|---|---|---|---|---|---|---|---|
| **Fire Nova** | 5 / 18, 40 | targeted aoe | 14 / 7 / 0.9 | 20 / 18 / 15 | 2500 / 2100 / 1700 | 80 / 90 / 105 | burning (35%, 6000ms) | resonance | An eruption of compressed fire mana, released outward in a ring. |
| **Warmth Aura** | 12 / 28, 55 | self | — | 15 / 12 / 9 | 7000 / 5600 / 4200 |  | regen (100%, 10000ms) | npc, scroll | A gentle warmth — not the burning, not the nova, but the kind of fire that lives in a hearth and does not want to consume anything. |
| **Ember Bloom** | 20 / 38, 72 | targeted aoe | 4 / 2 / 0.3 | 12 / 10 / 8 | 3500 / 2800 / 2200 | 90 / 105 / 120 | burning (80%, 8000ms) | npc, market, chest | In Eldoria's south, a flower blooms once a year in wildfire season, its petals igniting on contact with air. |
| **Flame Wall** | 28 / 48, 82 | targeted aoe | 8 / 4 / 0.5 | 26 / 21 / 16 | 6000 / 4800 / 3800 | 70 / 85 / 100 | burning (75%, 6000ms) | tome, quest, scroll | A curtain of fire, raised between you and whatever you are trying not to think about right now. |
| **Flame Lance** | 35 / 55, 95 | targeted directional | 22 / 10 / 1.1 | 24 / 20 / 16 | 2000 / 1600 / 1200 | 180 / 200 / 225 | burning (50%, 5000ms) | tome, scroll | A narrow, concentrated lance of fire mana. |
| **Fire Rain** | 42 / 65, 108 | targeted aoe | 10 / 5 / 0.6 | 30 / 24 / 18 | 5500 / 4400 / 3500 | 95 / 115 / 135 | burning (40%, 5000ms) | tome, chest | Fire mana, dispersed upward and allowed to fall. |

### Arcane (13)
| Spell | Discover / mastery | Targeting | Damage (base, per-level, scaling) | Mana | Cooldown (ms) | Range | Status | Learn from | Lore |
|---|---|---|---|---|---|---|---|---|---|
| **Mana Dart** | 8 / 22, 48 | targeted directional | 8 / 4 / 0.6 | 10 / 8 / 6 | 1100 / 900 / 700 | 160 / 180 / 200 | — | resonance | The first spell Eldrin ever truly understood. |
| **Arcane Burst** | 15 / 28, 58 | targeted aoe | 18 / 8 / 0.8 | 22 / 18 / 14 | 2200 / 1800 / 1400 | 55 / 70 / 85 | — | scroll, chest | A wide, short-range detonation of raw mana — no finesse, no geometry. |
| **Luminance** | 20 / 36, 68 | targeted aoe | 5 / 2 / 0.3 | 14 / 11 / 8 | 4000 / 3200 / 2500 | 100 / 120 / 140 | silenced (40%, 3000ms) | tome, scroll, market | A bright light, sustained. |
| **Benediction** | 25 / 42, 78 | self | — | 25 / 20 / 15 | 10000 / 8000 / 6200 |  | blessed (100%, 20000ms) | npc, tome | An academic ritual formalized into a single cast. |
| **Needle Volley** | 30 / 50, 90 | targeted directional | 3 / 2 / 0.25 | 22 / 18 / 14 | 2500 / 2000 / 1600 | 140 / 160 / 180 | — | scroll, chest | Five needles. |
| **Phantom Script** | 35 / 55, 95 | targeted aoe | 20 / 9 / 1.1 | 18 / 14 / 10 | 8000 / 6400 / 5000 | 120 / 140 / 165 | — | scroll, quest, chest | A rune, inscribed in light, that exists for a few seconds then releases itself as a wave of arcane force. |
| **Arcane Circle** | 40 / 58, 90 | self | — | 40 / 32 / 24 | 120000 / 90000 / 60000 |  | — | tome, npc | A teleportation circle inscribed in living mana. |
| **Phantom Dart** | 42 / 60, 100 | targeted directional | 12 / 6 / 0.8 | 16 / 13 / 10 | 2000 / 1600 / 1200 | 220 / 250 / 280 | — | tome, quest | It passes through the first target. |
| **Aetheric Ward** | 50 / 72, 118 | self | — | 30 / 24 / 18 | 15000 / 12000 / 9000 |  | warded (100%, -1ms) | tome, quest, npc | A standing field of defensive mana. |
| **Aetheric Inscription** | 60 / 70, 120 | targeted aoe | 28 / 12 / 1.5 | 35 / 28 / 22 | 4500 / 3500 / 2600 | 120 / 140 / 165 | — | quest, npc | Eldrin's signature. |
| **Triple Dart** | — / 30, 62 | targeted directional | 5 / 3 / 0.4 | 18 / 15 / 12 | 1800 / 1500 / 1200 | 150 / 170 / 190 | — | scroll, chest, market | Firing three darts at once is not harder than firing one — it is a different understanding of intent. |
| **Seeker Dart** | — / 40, 75 | targeted directional | 10 / 5 / 0.7 | 14 / 11 / 8 | 1400 / 1100 / 850 | 200 / 230 / 260 | — | tome, npc | Conventional darts travel straight. |
| **Cleanse** | — / 30, 60 | self | — | 20 / 16 / 12 | 5000 / 4000 / 3000 |  | — | npc, tome, quest | Strips away attached mana structures from the self. |

### Lightning (5)
| Spell | Discover / mastery | Targeting | Damage (base, per-level, scaling) | Mana | Cooldown (ms) | Range | Status | Learn from | Lore |
|---|---|---|---|---|---|---|---|---|---|
| **Arc Bolt** | 12 / 28, 55 | targeted directional | 16 / 8 / 1 | 18 / 15 / 12 | 1800 / 1500 / 1200 | 130 / 150 / 170 | shocked (25%, 2000ms) | resonance | Wisps carry electrical mana in their cores. |
| **Static Field** | 18 / 38, 72 | targeted aoe | 6 / 3 / 0.4 | 22 / 18 / 14 | 7000 / 5600 / 4400 | 70 / 85 / 100 | shocked (50%, 1500ms) | scroll, runestone | A zone of charged air. |
| **Thunder Clap** | 25 / 45, 80 | targeted aoe | 10 / 5 / 0.7 | 20 / 16 / 12 | 3000 / 2400 / 1800 | 60 / 75 / 90 | shocked (60%, 2000ms) | scroll, chest, market | The sound arrives before you expect it. |
| **Chain Lightning** | 32 / 52, 92 | targeted directional | 14 / 7 / 0.9 | 24 / 19 / 14 | 3800 / 3000 / 2300 | 155 / 175 / 200 | shocked (30%, 1500ms) | tome, scroll, chest | Hits one. |
| **Lightning Lance** | 45 / 65, 110 | targeted directional | 30 / 14 / 1.4 | 32 / 26 / 20 | 5000 / 4000 / 3000 | 210 / 240 / 270 | shocked (40%, 2000ms) | tome, quest | Not a bolt. |

### Shadow (6)
| Spell | Discover / mastery | Targeting | Damage (base, per-level, scaling) | Mana | Cooldown (ms) | Range | Status | Learn from | Lore |
|---|---|---|---|---|---|---|---|---|---|
| **Shadow Bolt** | 10 / 25, 52 | targeted directional | 20 / 9 / 1 | 18 / 14 / 10 | 1600 / 1300 / 1000 | 160 / 185 / 210 | void_tainted (30%, 15000ms) | scroll, chest, market | A dense projectile of shadow mana. |
| **Shadow Veil** | 15 / 35, 65 | self | — | 22 / 18 / 14 | 5000 / 4200 / 3200 |  | — | resonance | The Void Wraith's corruption left a residue in Eldrin's mana pathways. |
| **Hush** | 20 / 38, 72 | targeted aoe | 0 / 0 / 0 | 18 / 14 / 10 | 6000 / 4800 / 3800 | 80 / 95 / 112 | hushed (80%, 12000ms) | scroll, npc, tome | Silence, enforced. |
| **Void Pulse** | 28 / 48, 85 | targeted aoe | 12 / 6 / 0.8 | 20 / 16 / 12 | 3200 / 2600 / 2000 | 70 / 85 / 100 | void_tainted (45%, 20000ms) | scroll, npc, chest | Shadow mana, compressed and released. |
| **Eclipse Mark** | 38 / 55, 95 | targeted directional | 0 / 0 / 0 | 12 / 10 / 8 | 2800 / 2200 / 1700 | 150 / 170 / 190 | marked (100%, 1500ms) | scroll, quest | A sigil inscribed upon an enemy in shadow mana. |
| **Life Drain** | 45 / 68, 112 | targeted directional | 15 / 7 / 0.8 | 20 / 16 / 12 | 4000 / 3200 / 2500 | 140 / 160 / 185 | — | scroll, npc, quest | Shadow mana follows the oldest rule: what is taken must go somewhere. |

### Earth (10)
| Spell | Discover / mastery | Targeting | Damage (base, per-level, scaling) | Mana | Cooldown (ms) | Range | Status | Learn from | Lore |
|---|---|---|---|---|---|---|---|---|---|
| **Rock Bullet** | 6 / 18, 40 | targeted directional | 16 / 8 / 0.7 | 14 / 11 / 8 | 1500 / 1200 / 950 | 140 / 160 / 185 | — | resonance, scroll | Stone, accelerated. |
| **Stone Skin** (passive) | 10 / 26, 52 |  | — |  |  |  | — | resonance | The treants of Eldoria do not resist force — they simply grow, over centuries, into something that does not care about force. |
| **Rubble Spray** | 15 / 32, 60 | targeted directional | 6 / 3 / 0.4 | 15 / 12 / 9 | 2000 / 1600 / 1200 | 90 / 105 / 120 | dirty (60%, -1ms) | scroll, runestone | A cone of stone fragments — not precision magic. |
| **Earth Pillar** | 18 / 38, 70 | targeted aoe | 18 / 9 / 0.8 | 16 / 13 / 10 | 2200 / 1800 / 1400 | 70 / 85 / 100 | — | resonance | Stone remembers what it once was — compressed, buried, waiting to rise. |
| **Mud Trap** | 22 / 42, 76 | targeted aoe | 8 / 4 / 0.5 | 18 / 14 / 10 | 6000 / 5000 / 4000 | 100 / 115 / 130 | entangled (85%, 4000ms) | scroll, chest, market | Place it and walk away. |
| **Quagmire** | 28 / 50, 85 | targeted aoe | 4 / 2 / 0.3 | 24 / 20 / 16 | 4000 / 3200 / 2500 | 55 / 70 / 88 | entangled (70%, 3000ms) | resonance | The earth does not fight — it holds. |
| **Spike Field** | 32 / 52, 90 | targeted aoe | 12 / 6 / 0.6 | 24 / 19 / 14 | 4500 / 3600 / 2800 | 75 / 90 / 108 | entangled (60%, 2500ms) | tome, runestone, chest | The ground opens. |
| **Mud Wall** | 34 / 56, 92 | targeted aoe | 6 / 3 / 0.3 | 22 / 18 / 14 | 5000 / 4000 / 3200 | 80 / 95 / 110 | dirty (90%, -1ms) | scroll, npc, chest | Raises a wall of compressed earth and water at the target point. |
| **Stone Cannon** | 40 / 62, 105 | targeted directional | 32 / 14 / 1.2 | 28 / 23 / 18 | 3500 / 2800 / 2200 | 160 / 185 / 210 | — | tome, scroll, market | A boulder, compressed to the size of a fist, launched at speed that makes it briefly glow from friction. |
| **Tremor** | 50 / 75, 125 | targeted aoe | 10 / 5 / 0.6 | 30 / 24 / 18 | 7000 / 5600 / 4200 | 50 / 65 / 80 | entangled (50%, 2000ms) | tome, quest | The ground shifts. |

### Ice (7)
| Spell | Discover / mastery | Targeting | Damage (base, per-level, scaling) | Mana | Cooldown (ms) | Range | Status | Learn from | Lore |
|---|---|---|---|---|---|---|---|---|---|
| **Frost Shard** | 8 / 22, 45 | targeted directional | 14 / 7 / 0.9 | 16 / 13 / 10 | 1600 / 1300 / 1000 | 150 / 170 / 195 | cold (60%, 10000ms) | scroll, market, chest | Ice mana compressed to a single crystal, launched with velocity. |
| **Water Conjure** | 12 / 28, 55 | targeted aoe | 0 / 0 / 0 | 14 / 11 / 8 | 4000 / 3200 / 2500 | 80 / 95 / 110 | wet (100%, 25000ms) | scroll, market, npc | Draws moisture from ambient mana and releases it as a wave of cold water. |
| **Frostbite** | 18 / 35, 68 | targeted aoe | 8 / 4 / 0.5 | 20 / 16 / 12 | 3200 / 2600 / 2000 | 80 / 95 / 110 | cold (90%, 15000ms) | scroll, npc, tome | An area of cold mana, sustained long enough for flesh to begin to lose sensation. |
| **Glacial Spike** | 22 / 42, 78 | targeted directional | 28 / 12 / 1.1 | 25 / 20 / 15 | 3000 / 2400 / 1900 | 165 / 190 / 215 | cold (80%, 12000ms) | scroll, tome, chest | A single spike of solid ice, large enough to be alarming, launched on a flat trajectory. |
| **Water Blade** | 28 / 48, 85 | targeted directional | 26 / 11 / 1 | 22 / 18 / 14 | 2200 / 1800 / 1400 | 180 / 205 / 230 | wet (100%, 20000ms) | scroll, npc | A thin, pressurized blade of water — the same principle used in Valdric quarrying equipment, reduced to a shape a single mage can manage. |
| **Blizzard Shard** | 35 / 55, 95 | targeted aoe | 7 / 4 / 0.6 | 28 / 22 / 16 | 4500 / 3600 / 2800 | 85 / 100 / 118 | cold (55%, 12000ms) | tome, quest, chest | Seven shards at once, arranged by mana geometry rather than aim. |
| **Ice Prison** | 45 / 68, 112 | targeted directional | 10 / 5 / 0.5 | 28 / 22 / 16 | 6000 / 4800 / 3800 | 140 / 160 / 185 | frozen (90%, 5000ms) | tome, quest | Ice, grown rapidly around a single point of warmth. |

### Nature (8)
| Spell | Discover / mastery | Targeting | Damage (base, per-level, scaling) | Mana | Cooldown (ms) | Range | Status | Learn from | Lore |
|---|---|---|---|---|---|---|---|---|---|
| **Vine Grasp** | 8 / 20, 42 | targeted aoe | 6 / 3 / 0.3 | 18 / 14 / 10 | 3800 / 3000 / 2400 | 75 / 90 / 108 | entangled (85%, 4000ms) | scroll, npc, runestone | In the old forests near Valdric, the roots move toward warmth. |
| **Vessel Mend** | 12 / 25, 52 | self | — | 20 / 16 / 12 | 8000 / 6400 / 5000 |  | regen (100%, 20000ms) | npc, scroll, tome | Draws on nature mana to accelerate the body's own repair. |
| **Acid Splash** | 15 / 30, 58 | targeted aoe | 8 / 4 / 0.5 | 16 / 13 / 10 | 2600 / 2100 / 1700 | 80 / 95 / 112 | poison (70%, 10000ms) | scroll, chest, market | Nature produces toxins for reasons nature does not explain. |
| **Barkskin** | 22 / 38, 70 | self | — | 18 / 15 / 12 | 8000 / 6400 / 5000 |  | blessed (100%, 15000ms) | scroll, npc, quest | The surface hardens, briefly. |
| **Spore Cloud** | 30 / 50, 88 | targeted aoe | 2 / 1 / 0.2 | 20 / 16 / 12 | 5000 / 4000 / 3200 | 90 / 110 / 130 | poison (90%, 15000ms) | tome, chest, runestone | A cloud of toxic spores, dispersed from a single point. |
| **Thornwall** | 38 / 60, 100 | targeted aoe | 5 / 2 / 0.3 | 22 / 18 / 14 | 7000 / 5600 / 4400 | 70 / 85 / 100 | poison (40%, 8000ms) | npc, runestone, quest | Dense thornbriar, grown in seconds. |
| **Petal Storm** | — / 18, 38 | targeted aoe | 1 / 0 / 0.1 | 8 / 6 / 4 | 6000 / 5000 / 4000 | 100 / 115 / 130 | — | npc, scroll | It is beautiful. |
| **Purifying Sweep** | — / 12, 28 | targeted aoe | 0 / 0 / 0 | 10 / 8 / 6 | 3000 / 2400 / 1800 | 80 / 95 / 110 | — | npc, market | Removes applied substances from the target area. |

### Wind (6)
| Spell | Discover / mastery | Targeting | Damage (base, per-level, scaling) | Mana | Cooldown (ms) | Range | Status | Learn from | Lore |
|---|---|---|---|---|---|---|---|---|---|
| **Drying Wind** | 5 / 16, 35 | targeted aoe | 0 / 0 / 0 | 12 / 10 / 8 | 4000 / 3200 / 2500 | 85 / 100 / 118 | dried (100%, 10000ms) | scroll, npc, market | A warm, dry wind that strips moisture from anything in range. |
| **Wind Knife** | 8 / 20, 42 | targeted directional | 12 / 6 / 0.7 | 10 / 8 / 6 | 900 / 720 / 560 | 200 / 225 / 255 | — | scroll, market | Fast. |
| **Gale Slash** | 12 / 28, 55 | targeted directional | 18 / 9 / 0.8 | 16 / 13 / 10 | 1400 / 1100 / 850 | 170 / 195 / 220 | — | scroll, chest, market | Compressed wind, released in a single blade shape. |
| **Tempest Step** | 18 / 35, 65 | self | — | 15 / 12 / 9 | 4000 / 3200 / 2500 |  | blessed (100%, 2000ms) | scroll, npc | Move very quickly in the direction you are facing. |
| **Wind Barrier** | 24 / 42, 76 | self | — | 20 / 16 / 12 | 9000 / 7200 / 5600 |  | blessed (100%, 8000ms) | scroll, tome | A rotating shell of wind mana around the caster. |
| **Cyclone** | 30 / 50, 88 | targeted aoe | 8 / 4 / 0.5 | 28 / 22 / 16 | 6500 / 5200 / 4000 | 80 / 95 / 112 | — | tome, quest | A column of rotating wind, sustained. |

## Status effects
| Status | Duration | Effect |
|---|---|---|
| Wet | 30.0s | fireDmgMult: 0.5, lightningDmgMult: 2 |
| Dried | 10.0s | fireDmgMult: 1.3 |
| Cold | 20.0s | speedMult: 0.7 |
| Frozen | 4.0s | speedMult: 0, stunned: true |
| Burning | 8.0s | dotDmg: 3, dotInterval: 1000 |
| Shocked | 2.0s | stunned: true |
| Poisoned | 15.0s | dotDmg: 2, dotInterval: 2000, maxStacks: 3 |
| Dirty | until removed | (flag used by spells/AI) |
| Silenced | 6.0s | (flag used by spells/AI) |
| Entangled | 3.0s | speedMult: 0, stunned: true |
| Cursed | 20.0s | statsMult: 0.85 |
| Blessed | 30.0s | statsMult: 1.1 |
| Swift | 20.0s | speedMult: 1.25 |
| Regen | 10.0s | regenAmt: 3, regenInterval: 1000 |
| Void-Tainted | 30.0s | (flag used by spells/AI) |
| Marked | 1.5s | (flag used by spells/AI) |
| Warded | until removed | (flag used by spells/AI) |
| Hushed | 15.0s | (flag used by spells/AI) |
| Resonance Stun | 2.0s | speedMult: 0, stunned: true |

## Cooking
At a campfire (REST / **COOK** / BREW). Recipes appear as their ingredients are discovered.

| Dish | Ingredients | Effect |
|---|---|---|
| Roasted Boar | Boar Meat | Slow-cooked over an open flame. Restores 40 HP and regenerates 5 HP/s for 10s. |
| Roasted Venison | Venison | Lean and flavourful. Restores 30 HP and regenerates 4 HP/s for 10s. |
| Roasted Rabbit | Rabbit Meat | Small but nourishing. Restores 18 HP and regenerates 3 HP/s for 8s. |
| Mushroom Soup | 2× Mushroom Spore | Earthy and warm. Restores 20 HP and 20 MP, then regenerates 15 HP over time. |
| Herb Tea | 3× Forest Herb | Steeped forest herbs. Slowly regenerates 35 HP and boosts mana recovery for 12s. |
| Forest Salad | 4× Forest Herb | Fresh herbs tossed together. Restores 18 MP and regenerates 15 HP over time. |
| Spiced Venison | Venison + 2× Forest Herb | Venison rubbed with forest herbs. Restores 45 HP and regenerates 30 HP over time. |
| Ember-Glazed Boar | Boar Meat + Ember Stone | Boar crust-seared with ember stone. Restores 55 HP instantly. |
| Spicy Rabbit Skewer | Rabbit Meat + Ember Stone | Rabbit glazed with ember spice. Restores 28 HP and regenerates 22 HP over time. |
| Bone Broth | Venison + 2× Bone Fragment | Rich marrow broth. Regenerates 60 HP over time and raises max HP by 8 for 10 minutes. |
| Mushroom Medley | 3× Mushroom Spore + Forest Herb | Sautéed spores and herbs. Restores 15 HP, 30 MP, and triples mana recovery for 10s. |
| Void Stew | Venison + Void Shard | Tainted meat in corrupted broth. Restores 75 HP but drains 25 MP. Eat at your own risk. |
| Hearty Stew | Boar Meat + Venison + Rabbit Meat | A thick hunter's stew. Restores 60 HP, full mana regen, and +10 max HP for 10 minutes. |
| Hunter's Feast | Boar Meat + Venison | A mixed grill of boar and venison. Restores 50 HP, 18 MP, and regenerates 30 HP. |
| Herb-Crusted Rabbit | Rabbit Meat + 2× Forest Herb + Mushroom Spore | Rabbit rolled in forest herbs and mushroom dust. Restores 30 HP, 15 MP, and regenerates 20 HP. |
| Wild Herb Broth | Venison + 3× Forest Herb | Thin venison broth steeped with herbs. Restores 12 HP and 25 MP. |
| Herb & Mushroom Pie | Venison + 2× Forest Herb + 2× Mushroom Spore | A hearty forest pie. Restores 35 HP, 25 MP, and regenerates 20 HP over time. |
| Lucky Rabbit's Stew | Rabbit Meat + Rabbit's Foot + Forest Herb | Brewed with a rabbit's foot. Restores 22 HP and applies Blessed for 20s. |
| Frost-Cured Venison | Venison + Ice Crystal | Venison slowly cured in enchanted ice. Restores 35 HP and regenerates 28 HP over time. |
| Double Boar Rack | 2× Boar Meat | Two whole boar ribs roasted to perfection. Restores 65 HP instantly. |
| Char-Seared Venison | 2× Venison + Ember Stone | Venison blackened over fierce ember heat. Restores 60 HP instantly. |
| Ice-Smoked Boar | Boar Meat + Ice Crystal | Boar slow-smoked over crystalline ice vapour. Restores 50 HP and regenerates 30 HP. |
| Boar & Mushroom Stew | Boar Meat + 2× Mushroom Spore + Bone Fragment | Boar simmered with rich mushrooms. Restores 50 HP and regenerates 40 HP over time. |
| Mushroom Risotto | 3× Mushroom Spore + Venison + Forest Herb | Dense spore risotto with venison bits. Restores 22 HP, 40 MP, and boosts mana regen for 15s. |
| Venison Tartare | 2× Venison | Finely prepared raw venison. Restores 20 HP and 20 MP instantly. |
| Spectral Broth | Venison + Spectral Dust | Venison simmered with spectral dust. Restores 25 HP and 35 MP, and triples mana regen for 8s. |
| Void Jerky | Rabbit Meat + Void Shard | Rabbit dried in void brine. Restores 40 HP but drains 10 MP. Unsettling aftertaste. |
| Corrupted Stew | Boar Meat + Corrupted Essence | Boar cooked in corrupted essence. Restores 90 HP but drains 30 MP. Power comes at a price. |
| Bone & Herb Soup | 2× Bone Fragment + 2× Forest Herb | Slow-simmered bone stock with herbs. Raises max HP by 12 for 10 minutes and regenerates 25 HP over time. |
| Grand Feast | Boar Meat + Venison + Rabbit Meat + Mushroom Spore | The ultimate campfire meal — all meats, all flavours. Fully restores HP and MP, regenerates 80 HP and leaves you Blessed for a minute. |

## Brewing (potions)
At a campfire (BREW). Every potion needs an Empty Bottle.

| Potion | Ingredients | Effect |
|---|---|---|
| Health Potion | 2× Forest Herb + Empty Bottle | Restores 30 HP. |
| Greater Health Potion | 4× Forest Herb + Empty Bottle | A concentrated herbal tincture. Restores 60 HP. |
| Mana Potion | 2× Mushroom Spore + Empty Bottle | Restores 25 MP instantly and accelerates mana regen for 8s. |
| Greater Mana Potion | 4× Mushroom Spore + Empty Bottle | A concentrated spore infusion. Restores 60 MP. |
| Double-Down Elixir | 2× Forest Herb + 2× Mushroom Spore + Empty Bottle | Equal parts health and mana restoration. Restores 35 HP and 35 MP at once. |
| Regeneration Potion | 3× Forest Herb + Heart Crystal + Empty Bottle | Crystallised heart essence in herb tincture. Regenerates 80 HP over 20 seconds. |
| Frost Vial | 2× Ice Crystal + Empty Bottle | A cooling draught of condensed tundra ice. Restores 20 HP and regenerates 24 HP over 8s. |
| Ember Tonic | 2× Ember Stone + Empty Bottle | Volcanic stone dissolved into a burning brew. Restores 35 HP instantly. |
| Iron Skin Tonic | 2× Bone Fragment + Empty Bottle | Ground bone dissolved in water. Raises max HP by 15 for 10 minutes. |
| Antidote | Venom Sac + Forest Herb + Empty Bottle | Neutralises poison. Clears the Poisoned status and restores 5 HP. |
| Antitoxin | 2× Venom Sac + Ice Crystal + Empty Bottle | Double-strength venom neutraliser. Clears Poisoned, restores 12 HP, and applies Blessed for 15s. |
| Blessing Draught | 2× Rabbit's Foot + Spectral Dust + Empty Bottle | Brewed from lucky charms and spectral essence. Applies Blessed for 30s (+10% all stats). |
| Speed Draught | Rabbit's Foot + Ice Crystal + Empty Bottle | Lucky charm and frost combined. Applies Swift for 20s — you move 25% faster. |
| Thorn Potion | Venom Sac + 2× Forest Herb + Empty Bottle | Venom and herb extract. Applies Blessed for 15s and regenerates 20 HP over time. |
| Wildfire Tonic | 2× Ember Stone + Venom Sac + Empty Bottle | Ember and venom fused. Restores 30 HP and applies Blessed for 18s. |
| Void Tonic | 2× Void Shard + Spectral Dust + Empty Bottle | Crystallised void energy dissolved in spectral dust. Restores 45 MP and triples mana regen for 12s. |
| Spectral Veil | 2× Spectral Dust + Empty Bottle | Pure spectral essence bottled. Applies Blessed for 25s and restores 10 MP. |
| Elixir of Clarity | Spectral Dust + Heart Crystal + Empty Bottle | Spectral dust and heart crystal. Restores 40 MP and triples mana recovery for 20s. |
| Moonveil Tonic | Ice Crystal + Spectral Dust + Rabbit's Foot + Empty Bottle | Ice, spectral dust and luck fused. Restores 22 HP, 22 MP, and applies Blessed for 30s. |
| Corrupted Flask | Corrupted Essence + Empty Bottle | Distilled corrupted essence. Restores 55 MP but drains 20 HP. Dangerous. |

## Crafting
At the crafting bench (C).

| Item | Tier | Category | Ingredients | Result |
|---|---|---|---|---|
| Bone Ring | 1 | accessory | Boar Tusk + 2× Rabbit's Foot | Carved from tusk and bone. Crude but effective. +1 STR, +1 AGI. |
| Void Pendant | 3 | accessory | 4× Void Shard + Ancient Scroll | Crystallised corruption shaped into a focus. +3 INT. Deepens shadow resonance. |
| Hunter's Cloak | 2 | armor | 2× Wolf Pelt + 2× Deer Hide | Stitched from wolf pelt and deer hide. Light but durable. +2 AGI, +1 STA. |
| Corrupted Hide Armor | 3 | armor | 3× Deer Hide + 3× Void Shard | Void-tainted leather that hums with dark energy. +2 STR, +2 INT. |
| Tusk Blade | 2 | weapon | 2× Boar Tusk + 2× Mineral Ore | A dagger ground from boar ivory and iron. Brutal at close range. +3 STR. |
| Void Fang | 3 | weapon | Boar Tusk + 4× Void Shard + Wolf Pelt | A corrupted blade that pulses with shadow energy. +2 STR, +3 INT. |

## Enchantments
| Enchantment | Effect |
|---|---|
| Resonant | Physical hits reduce active spell cooldowns by 300ms. |
| Arcane Surge | 10% chance on hit to restore 3 MP. |
| Flame-Kissed | Hits deal bonus fire damage equal to STR × 0.6. |
| Vampiric | Steal 15% of damage dealt as HP. |
| Swiftness | Attack cooldown reduced by 15%. |
| Void-Touched | +40% damage vs shadow and void enemies. |

## Items

### Weapons (45)
**spell blade** (14)

| Weapon | Tier | Rarity | Stats | Buy / sell | Description | Source |
|---|---|---|---|---|---|---|
| Longsword | 1 | common | +3 STR +1 INT | 90 / 30 | A well-balanced longsword. Hits cost 2 MP, deal +35% arcane. +3 STR, +1 INT. | — |
| Iron Spell-Blade | 1 | common | +2 STR +1 INT | 70 / 24 | Iron blade with a mana crystal at the hilt. Hits cost 2 MP, deal +35% arcane. +2 STR, +1 INT. | shop |
| Etched Shortsword | 1 | common | +1 STR +2 INT | 60 / 20 | Simple blade etched with arcane runes. Hits cost 2 MP, deal +35% arcane. +1 STR, +2 INT. | shop |
| Tusk Blade | 2 | uncommon | +3 STR | 0 / 40 | A dagger ground from boar ivory and iron. Brutal at close range. +3 STR. | crafting |
| Katana | 2 | uncommon | +4 STR +2 INT | 160 / 55 | A razor-sharp katana. Swift strikes cost 2 MP, deal +40% arcane. +4 STR, +2 INT. | — |
| Spell-Blade | 2 | uncommon | +3 INT +2 STR | 180 / 60 | Arcane-forged short sword. Hits cost 2 MP, deal +35% arcane. +3 INT, +2 STR. | shop |
| Arcane Saber | 2 | uncommon | +2 INT +3 STR | 165 / 55 | Longer blade for wider swings. Hits cost 2 MP, deal +35% arcane. +2 INT, +3 STR. | shop |
| Void Fang | 3 | rare | +2 STR +3 INT | 0 / 80 | A corrupted blade that pulses with shadow energy. +2 STR, +3 INT. | crafting |
| Resonant Edge | 3 | rare | +4 INT +3 STR | 370 / 123 | Hums with resonant energy. Hits cost 2 MP, deal +35% arcane. +4 INT, +3 STR. [Resonant] | — |
| Mana-Etched Sword | 3 | rare | +5 INT +2 STR | 390 / 130 | Runes cover every inch. Hits cost 2 MP, deal +35% arcane. +5 INT, +2 STR. [Arcane Surge] | shadow_sprite 8% |
| Void-Slicer | 4 | epic | +7 INT +5 STR | 780 / 260 | A blade that cuts through reality. Hits cost 2 MP, +35% arcane. +7 INT, +5 STR. [Void-Touched] [Lore: 20% void stun] | — |
| Arcane War-Blade | 4 | epic | +6 INT +6 STR | 800 / 267 | Battle-tested arcane fury. Hits cost 2 MP, +35% arcane. +6 INT, +6 STR. [Flame-Kissed] [Lore: 20% arcane burst hits 2 more] | — |
| Blade of the Covenant | 5 | legendary | +9 INT +7 STR | 0 / 999 | One of the original Covenant weapons. Hits cost 2 MP, deal +35% arcane. +9 INT, +7 STR. [Blade strikes grant 2 MP if INT > 12] | — |
| Cleaver of Vorgos | 5 | legendary | +12 STR +4 INT | 0 / 999 | The warlord Vorgos's legendary blade. Hits cost 2 MP, deal +35% arcane. +12 STR, +4 INT. [3× damage vs enemies below 30% HP] | quest: The Void Fragment |

**staff** (11)

| Weapon | Tier | Rarity | Stats | Buy / sell | Description | Source |
|---|---|---|---|---|---|---|
| Novice Staff | 1 | common | +2 INT | 80 / 28 | Oak wood. Basic arcane focus. +2 INT. | shop |
| Weathered Sage's Staff | 1 | common | +1 INT +1 STA | 65 / 22 | Worn smooth by years of use. +1 INT, +1 STA. | shop |
| Scholar's Staff | 1 | common | +2 INT | 0 / 28 | Eldrin's own study focus — worn smooth by decades of quiet reading. +2 INT. | — |
| Adept's Spire | 2 | uncommon | +4 INT +1 AGI | 200 / 70 | Crystal-tipped. Faster spell structuring. +4 INT, +1 AGI. | shop |
| Mossy Branch Staff | 2 | uncommon | +3 INT +1 STA | 175 / 60 | A living branch from an ancient tree. +3 INT, +1 STA. | shop |
| Verdant Focus | 3 | rare | +6 INT +2 AGI | 380 / 125 | Living crystal infused with nature-energy. +6 INT, +2 AGI. [Resonant] | chest |
| Crystalline Rod | 3 | rare | +5 INT +2 STA | 360 / 120 | Aether-crystal rod that amplifies mana flow. +5 INT, +2 STA. [Arcane Surge] | — |
| Void Channel | 4 | epic | +9 INT +3 AGI | 750 / 250 | Channels void-energy into spells. +9 INT, +3 AGI. [Void-Touched] [Lore: 20% void pulse on hit] | — |
| Arcane Sceptre | 4 | epic | +8 INT +3 STA | 720 / 240 | Pure arcane authority. +8 INT, +3 STA. [Flame-Kissed] [Lore: 25% chain-lightning arc] | — |
| Staff of the First Covenant | 5 | legendary | +12 INT +4 AGI | 0 / 999 | Forged at the founding of the Arcane Covenant. +12 INT, +4 AGI. [+25% all spell damage] | quest: The Covenant Scholar |
| Heartwood Resonator | 5 | legendary | +10 INT +5 STA | 0 / 999 | Resonates with the forest's living heartbeat. +10 INT, +5 STA. [+50% mana regen] | — |

**umbral dagger** (10)

| Weapon | Tier | Rarity | Stats | Buy / sell | Description | Source |
|---|---|---|---|---|---|---|
| Crude Dagger | 1 | common | +2 AGI +1 STR | 55 / 18 | A simple, sharp blade. Augmented double-hit costs 1 MP. +2 AGI, +1 STR. | shop |
| Shadow Shiv | 1 | common | +1 AGI +2 STR | 55 / 18 | Darkness-stained iron blade. Augmented double-hit costs 1 MP. +1 AGI, +2 STR. | shop |
| Umbral Dagger | 2 | uncommon | +3 AGI +1 STR | 160 / 55 | Shadow-infused blade. Augmented double-hit costs 1 MP. +3 AGI, +1 STR. | shop |
| Phantom Blade | 2 | uncommon | +2 AGI +2 INT | 155 / 52 | Slightly translucent — strikes like a ghost. Augmented double-hit costs 1 MP. +2 AGI, +2 INT. | shop |
| Voidwhisper Dagger | 3 | rare | +4 AGI +3 INT | 390 / 130 | Whispers of the void guide your strikes. Augmented double-hit costs 1 MP. +4 AGI, +3 INT. [Vampiric] | — |
| Dusk Fang | 3 | rare | +5 AGI +2 STR | 370 / 123 | The last light before darkness. Augmented double-hit costs 1 MP. +5 AGI, +2 STR. [Swiftness] | void_stalker 10% |
| Midnight Reaver | 4 | epic | +7 AGI +4 STR | 800 / 267 | Cuts through shadow and flesh alike. Double-hit costs 1 MP. +7 AGI, +4 STR. [Vampiric] [Lore: 25% shadow clone second strike] | chest |
| Ecliptic Stiletto | 4 | epic | +6 AGI +5 INT | 820 / 273 | Eclipse-forged precision weapon. Double-hit costs 1 MP. +6 AGI, +5 INT. [Void-Touched] [Lore: 20% eclipse mark — next hit 2×] | — |
| The Twilight Fang | 5 | legendary | +9 AGI +5 INT | 0 / 999 | Fang of the Twilight Order. Augmented double-hit costs 1 MP. +9 AGI, +5 INT. [Enemies killed in Shadow Veil drop +50% Glint] | quest: Initiation of the Twilight Order |
| Dagger of the Void | 5 | legendary | +10 AGI +6 STR | 0 / 999 | Born from pure void energy. Double-hit is always augmented — no mana cost. +10 AGI, +6 STR. | — |

**resonance bow** (10)

| Weapon | Tier | Rarity | Stats | Buy / sell | Description | Source |
|---|---|---|---|---|---|---|
| Carved Shortbow | 1 | common | +2 AGI +1 INT | 75 / 25 | A simple carved bow. Ranged strikes cost 3 MP, reach 150px. +2 AGI, +1 INT. | shop |
| Hunter's Shortbow | 1 | common | +1 AGI +1 INT +1 STR | 70 / 23 | A hunter's trusted bow. Ranged strikes cost 3 MP, reach 150px. +1 AGI, +1 INT, +1 STR. | shop |
| Resonance Bow | 2 | uncommon | +2 INT +2 AGI | 200 / 70 | Aether-thread strung bow. Ranged strikes cost 3 MP, reach 150px. +2 INT, +2 AGI. | shop |
| Forest Longbow | 2 | uncommon | +3 AGI +1 STR | 185 / 62 | Carved from elder wood. Ranged strikes cost 3 MP, reach 150px. +3 AGI, +1 STR. | shop |
| Aether-Strung Bow | 3 | rare | +4 INT +3 AGI | 380 / 127 | Bowstring of pure aether. Ranged strikes cost 3 MP, reach 150px. +4 INT, +3 AGI. [Resonant] | — |
| Spirit Bow | 3 | rare | +3 INT +4 AGI | 375 / 125 | Guided by ancestral spirits. Ranged strikes cost 3 MP, reach 150px. +3 INT, +4 AGI. [Swiftness] | chest |
| Celestial Arc | 4 | epic | +6 INT +6 AGI | 820 / 273 | Forged under a celestial alignment. Ranged strikes cost 3 MP. +6 INT, +6 AGI. [Arcane Surge] [Lore: 25% arrow bounce to second enemy] | — |
| Tempest Bow | 4 | epic | +8 AGI +3 STR | 800 / 267 | Crackling with storm-energy. Ranged strikes cost 3 MP. +8 AGI, +3 STR. [Void-Touched] [Lore: 20% storm burst AoE on impact] | — |
| The Eternal Draw | 5 | legendary | +10 AGI +6 INT | 0 / 999 | A bow that never misses. Ranged strikes cost 3 MP, reach 150px. +10 AGI, +6 INT. [Every 3rd consecutive shot deals 2× damage] | quest: The Hunter's Trial |
| The Void-Piercer | 5 | legendary | +8 INT +8 AGI | 0 / 999 | Arrows pierce through the first enemy struck. Range 220px. Ranged strikes cost 3 MP. +8 INT, +8 AGI. [Arrows pierce first enemy] | — |

### Armor & accessories (9)
| Item | Slot | Tier | Stats | Description | Source |
|---|---|---|---|---|---|
| Hunter's Cloak | body | 2 | +2 AGI +1 STA | Stitched from wolf pelt and deer hide. Light but durable. +2 AGI, +1 STA. | crafting |
| Corrupted Hide Armor | body | 3 | +2 STR +2 INT | Void-tainted leather that hums with dark energy. +2 STR, +2 INT. | crafting |
| Scholar's Tunic | body | 1 | +1 STA | Standard scholarly attire. +1 STA. | shop |
| Violet Silk Robes | body | 2 | +2 INT +2 STA | Conductive silk that enhances Aether flow. +2 INT, +2 STA. | — |
| Scholar's Cowl | head | 1 | +1 INT | A simple hood. +1 INT. | shop |
| Bone Ring | accessory | 1 | +1 STR +1 AGI | Carved from tusk and bone. Crude but effective. +1 STR, +1 AGI. | crafting |
| Void Pendant | accessory | 3 | +3 INT | Crystallised corruption shaped into a focus. +3 INT. Deepens shadow resonance. | crafting |
| Iron Ring | accessory | 1 | +1 STR | A plain iron ring. +1 STR. | shop |
| Resonance Amulet | accessory | 2 | +2 INT +1 AGI | Hums faintly with Aether. +2 INT, +1 AGI. | — |

### Other consumables, tools & key items (12)
| Item | Description | Buy / sell | Source |
|---|---|---|---|
| Eldritch Tome | Forbidden knowledge. Grants 150 XP, 1 skill point, and deep arcane resonance. | 150 / 50 | void_stalker 15%, chest |
| Traveler's Tent | A compact tent. Full rest: restores HP and MP to max, clears exhaustion, grants 50 bonus XP. | 120 / 40 | shop |
| Turkey Meat | Plump and savoury. Restores 12 HP. | 0 / 5 | turkey 80% |
| Iron Axe | Required to gather Wood nodes. | 45 / 15 | shop |
| Iron Pickaxe | Required to gather Mineral Ore nodes. | 50 / 17 | shop |
| Wood | Gathered timber. Used in campfire construction and basic crafting. | 0 / 4 | gathering (iron axe) |
| Expanded Haversack | Aether-Oak fiber reinforcement. Upgrades Satchel to Tier II (20 slots). | 120 / 40 | shop |
| Runic Satchel | "Weightless" runes stitched into the lining. Upgrades Satchel to Tier III (35 slots). | 280 / 90 | — |
| Void-Fold Relic | Folds micro-rifts into your pouch. Upgrades Satchel to Tier IV (60 slots). | 600 / 200 | — |
| Legion Lore Fragment | A page from the frozen scout's journal, describing the Legion's movements before the cold took them. Grants 60 XP. | 0 / 15 | quest: The Frozen Camp |
| Soul-Gem of Still Waters | A relic gem recovered from the Widow's Overlook shrine. Permanently increases Max Mana by 15. | 0 / 60 | quest: The Widow's Watch |
| Aether-Shard | A crystallized fragment of raw Aether. Used at the Foundry of the Ancients to upgrade Tier II gear to Tier III. | 0 / 25 | quest: Echoes in the Rime |

### Ingredients & materials (20)
| Ingredient | Used in | Source |
|---|---|---|
| Boar Meat | 9 recipes | feral_boar 70%, boar 80%, grizzly_bear 70%, black_bear 65%, pig 90%, corrupted_boar 60% |
| Venison | 14 recipes | deer 85%, deer_doe 80%, dark_deer 85%, dark_deer_doe 80%, lion 50%, lioness 45% (+4 more) |
| Rabbit Meat | 7 recipes | rabbit 90%, chicken 90%, arctic_fox 50% |
| Mushroom Spore | 10 recipes | mushroom_shaman 60%, mushroom_walker 70%, amanita_walker 80%, blight_moth 30% |
| Forest Herb | 16 recipes | wolf 35%, scout 25%, treant 40%, vine_horror 50%, forest_fox 30%, mushroom_walker 30% (+4 more) |
| Ember Stone | 5 recipes | ember_imp 50%, lava_elemental 70%, ash_crawler 40%, forge_daemon 60%, cinder_hawk 30%, fire_lizard 25% (+1 more) |
| Bone Fragment | 4 recipes | skeleton_archer 60%, grizzly_bear 40%, giant_rat 50%, polar_bear 45%, shark 60% |
| Void Shard | 6 recipes | rift_walker 40%, soul_eater 40%, carrion_crow 30%, hollow_cat 35%, plague_heron 35%, rot_frog 30% (+11 more) |
| Rabbit's Foot | 5 recipes | rabbit 25% |
| Ice Crystal | 6 recipes | frost_bear 50%, ice_revenant 60%, blizzard_sprite 50%, wendigo 50%, glacier_crab 60%, corrupted_elk 30% |
| Spectral Dust | 6 recipes | grave_wraith 50%, cursed_knight 30%, ice_revenant 30%, blind_stalker 40% |
| Corrupted Essence | 2 recipes | deep_horror 40%, void_spawn 50%, mirror_shade 40%, arcane_sentinel 50%, rift_walker 50%, soul_eater 60% |
| Empty Bottle | 20 recipes | shop |
| Heart Crystal | 2 recipes | chest |
| Venom Sac | 4 recipes | giant_spider 40%, bog_lurker 40%, rot_toad 50%, plague_rat 15%, giant_rat 20%, amanita_walker 35% (+13 more) |
| Boar Tusk | 3 recipes | feral_boar 25%, boar 30%, corrupted_boar 20% |
| Ancient Scroll | 1 recipes | shadow_sprite 15%, dark_druid 20%, cursed_knight 10%, runic_turret 15%, forge_daemon 10%, wendigo 10% (+6 more) |
| Wolf Pelt | 2 recipes | grizzly_bear 50%, black_bear 40%, lion 60%, lioness 50%, polar_bear 65%, arctic_fox 40% (+1 more) |
| Deer Hide | 2 recipes | deer 50%, deer_doe 45%, dark_deer 55%, dark_deer_doe 45%, cow 50%, llama 70% (+5 more) |
| Mineral Ore | 1 recipes | stone_golem 50%, runic_turret 40%, crystal_golem 60%, crag_fiend 40%, gathering (iron pickaxe) |

## Shops
Merchant catalogue (27 entries). Prices: Glint / Gold.

| Item | Glint | Gold |
|---|---|---|
| Empty Bottle | 5 | 4 |
| Health Potion | 25 | 18 |
| Mana Potion | 20 | 30 |
| Forest Herb | 12 | 7 |
| Iron Axe | 45 | 32 |
| Iron Pickaxe | 50 | 36 |
| Scholar's Cowl | 60 | 85 |
| Scholar's Tunic | 70 | 98 |
| Iron Ring | 40 | 30 |
| Expanded Haversack | 120 | 90 |
| Traveler's Tent | 120 | 85 |
| Novice Staff | 80 | 115 |
| Weathered Sage's Staff | 65 | 92 |
| Iron Spell-Blade | 70 | 95 |
| Etched Shortsword | 60 | 44 |
| Crude Dagger | 55 | 38 |
| Shadow Shiv | 55 | 78 |
| Carved Shortbow | 75 | 58 |
| Hunter's Shortbow | 70 | 52 |
| Adept's Spire | 200 | 290 |
| Mossy Branch Staff | 175 | 250 |
| Spell-Blade | 180 | 260 |
| Arcane Saber | 165 | 235 |
| Umbral Dagger | 160 | 230 |
| Phantom Blade | 155 | 218 |
| Resonance Bow | 200 | 280 |
| Forest Longbow | 185 | 140 |

## Gathering & world objects
| Node | Tool | Gives | Text |
|---|---|---|---|
| wood | iron axe | Wood | A fallen log. An Iron Axe would split it into usable timber. |
| wood | iron axe | Wood | Dead wood stacked against an old tree. Perfect for gathering. |
| wood | iron axe | Wood | Dry timber. Use an Iron Axe to collect it. |
| mineral | iron pickaxe | Mineral Ore | A mineral seam runs through the rock here. An Iron Pickaxe could break it open. |
| mineral | iron pickaxe | Mineral Ore | Glinting ore deposits in the stone. Use an Iron Pickaxe to extract them. |
| mineral | iron pickaxe | Mineral Ore | An exposed mineral vein, rich in ore. Needs an Iron Pickaxe. |

Prologue world objects: 3 campfires, 3 chests, 3 rift-gates, 3 readable signs, 3 pillar gates, 3 cracked boulders, 1 NPC (Silvara).

## Enemies & creatures
### Hostile (77)
| Creature | HP | Damage | Speed | XP | Loot |
|---|---|---|---|---|---|
| wisp | 18 | 5 | 85 | 15 | Mana Potion 30% |
| wolf | 28 | 8 | 95 | 20 | Forest Herb 35%, Health Potion 20% |
| shadow sprite | 22 | 13 | 72 | 25 | Mana Potion 35%, Ancient Scroll 15%, Mana-Etched Sword 8% |
| void stalker | 55 | 18 | 48 | 38 | Mana Potion 45%, Eldritch Tome 15%, Dusk Fang 10% |
| scout | 32 | 9 | 56 | 22 | Health Potion 35%, Forest Herb 25% |
| treant | 65 | 16 | 30 | 42 | Health Potion 50%, Forest Herb 40% |
| giant spider | 45 | 11 | 55 | 28 | Venom Sac 40%, Health Potion 25% |
| dark druid | 38 | 14 | 48 | 32 | Ancient Scroll 20%, Mana Potion 35% |
| feral boar | 30 | 16 | 115 | 24 | Boar Meat 70%, Boar Tusk 25% |
| skeleton archer | 30 | 10 | 45 | 28 | Bone Fragment 60%, Health Potion 20% |
| stone golem | 120 | 22 | 28 | 55 | Mineral Ore 50%, Health Potion 30% |
| grave wraith | 35 | 18 | 90 | 38 | Spectral Dust 50%, Mana Potion 30% |
| cursed knight | 80 | 20 | 50 | 48 | Health Potion 40%, Spectral Dust 30%, Ancient Scroll 10% |
| runic turret | 50 | 12 | 0 | 35 | Mineral Ore 40%, Ancient Scroll 15% |
| bog lurker | 55 | 15 | 60 | 35 | Venom Sac 40%, Health Potion 20% |
| rot toad | 40 | 10 | 45 | 28 | Venom Sac 50% |
| will o wisp | 22 | 8 | 78 | 20 | Mana Potion 30% |
| vine horror | 65 | 14 | 35 | 40 | Forest Herb 50%, Health Potion 35% |
| plague rat | 12 | 5 | 95 | 8 | Venom Sac 15% |
| ember imp | 28 | 12 | 110 | 30 | Ember Stone 50%, Mana Potion 20% |
| lava elemental | 90 | 20 | 35 | 52 | Ember Stone 70%, Health Potion 30% |
| ash crawler | 42 | 16 | 70 | 35 | Ember Stone 40% |
| forge daemon | 100 | 25 | 45 | 60 | Ember Stone 60%, Health Potion 40%, Ancient Scroll 10% |
| cinder hawk | 22 | 14 | 130 | 28 | Ember Stone 30% |
| frost bear | 100 | 22 | 70 | 55 | Ice Crystal 50%, Health Potion 40% |
| ice revenant | 45 | 16 | 65 | 38 | Ice Crystal 60%, Spectral Dust 30% |
| blizzard sprite | 30 | 12 | 58 | 32 | Ice Crystal 50%, Mana Potion 30% |
| wendigo | 75 | 28 | 80 | 58 | Ice Crystal 50%, Health Potion 40%, Ancient Scroll 10% |
| glacier crab | 85 | 18 | 38 | 45 | Ice Crystal 60%, Health Potion 30% |
| cave bat | 14 | 8 | 100 | 10 | — |
| crystal golem | 80 | 18 | 35 | 48 | Mineral Ore 60%, Health Potion 30% |
| blind stalker | 55 | 20 | 75 | 42 | Spectral Dust 40% |
| deep horror | 70 | 22 | 50 | 50 | Corrupted Essence 40%, Mana Potion 30% |
| mushroom shaman | 45 | 12 | 38 | 38 | Mushroom Spore 60%, Health Potion 30% |
| void spawn | 55 | 20 | 85 | 45 | Corrupted Essence 50%, Mana Potion 30% |
| mirror shade | 40 | 16 | 70 | 40 | Corrupted Essence 40%, Ancient Scroll 15% |
| arcane sentinel | 90 | 24 | 0 | 60 | Corrupted Essence 50%, Mana Potion 40%, Ancient Scroll 20% |
| rift walker | 75 | 22 | 65 | 58 | Corrupted Essence 50%, Void Shard 40%, Ancient Scroll 15% |
| soul eater | 60 | 18 | 78 | 52 | Corrupted Essence 60%, Void Shard 40% |
| grizzly bear | 70 | 20 | 80 | 40 | Boar Meat 70%, Wolf Pelt 50%, Bone Fragment 40% |
| black bear | 55 | 16 | 90 | 32 | Boar Meat 65%, Wolf Pelt 40% |
| giant rat | 18 | 7 | 88 | 12 | Bone Fragment 50%, Venom Sac 20% |
| carrion crow | 15 | 6 | 110 | 8 | Void Shard 30% |
| hollow cat | 20 | 8 | 95 | 10 | Void Shard 35% |
| lion | 65 | 18 | 95 | 38 | Wolf Pelt 60%, Venison 50% |
| lioness | 55 | 15 | 105 | 32 | Wolf Pelt 50%, Venison 45% |
| mushroom walker | 22 | 6 | 45 | 14 | Mushroom Spore 70%, Forest Herb 30% |
| amanita walker | 28 | 9 | 42 | 18 | Mushroom Spore 80%, Venom Sac 35% |
| polar bear | 80 | 24 | 75 | 45 | Wolf Pelt 65%, Bone Fragment 45% |
| shark | 90 | 28 | 110 | 55 | Venison 50%, Bone Fragment 60% |
| bird eagle | 18 | 8 | 130 | 12 | Deer Hide 25% |
| plague heron | 20 | 7 | 90 | 10 | Void Shard 35% |
| rot frog | 28 | 9 | 65 | 12 | Venom Sac 40%, Void Shard 30% |
| ember lizard | 22 | 8 | 100 | 10 | Ember Stone 50%, Void Shard 30% |
| ash vulture | 20 | 7 | 85 | 10 | Void Shard 40% |
| corrupted elk | 55 | 18 | 100 | 22 | Deer Hide 40%, Void Shard 50%, Ice Crystal 30% |
| void fox | 25 | 10 | 115 | 12 | Wolf Pelt 30%, Void Shard 40% |
| void crawler | 18 | 9 | 85 | 10 | Void Shard 40% |
| blight moth | 16 | 7 | 95 | 8 | Void Shard 35%, Mushroom Spore 30% |
| corrupted boar | 38 | 12 | 88 | 18 | Boar Meat 60%, Boar Tusk 20%, Void Shard 45% |
| corrupted deer | 28 | 9 | 100 | 14 | Deer Hide 40%, Void Shard 50% |
| corrupted rabbit | 12 | 5 | 110 | 8 | Void Shard 35% |
| spider green | 18 | 6 | 95 | 10 | Venom Sac 35% |
| spider brown | 18 | 6 | 90 | 10 | Venom Sac 35% |
| spider red | 22 | 8 | 100 | 14 | Venom Sac 45%, ruby_dust 15% |
| spider blue | 20 | 7 | 105 | 12 | Venom Sac 40% |
| spider gray | 20 | 7 | 92 | 12 | Venom Sac 35% |
| spider yellow | 16 | 5 | 110 | 8 | Venom Sac 25% |
| spider orange | 18 | 6 | 95 | 10 | Venom Sac 35% |
| spider pink | 16 | 5 | 108 | 8 | Venom Sac 25% |
| spider white | 24 | 9 | 88 | 16 | Venom Sac 50%, bone_dust 20% |
| spider dark | 28 | 11 | 100 | 20 | Venom Sac 60%, shadow_essence 25% |
| spider queen | 55 | 15 | 85 | 45 | Venom Sac 90%, spider_silk 70%, Void Shard 30% |
| gloom beak | 20 | 10 | 135 | 22 | Mana Potion 15% |
| frost shade | 26 | 14 | 70 | 28 | Mana Potion 30% |
| crag fiend | 70 | 20 | 40 | 45 | Mineral Ore 40% |
| resonance wisp | 12 | 1 | 30 | 5 | — |

### Passive animals (35) — flee, hunted for meat and hides
| Creature | HP | Damage | Speed | XP | Loot |
|---|---|---|---|---|---|
| boar | 20 | 0 | 105 | 0 | Boar Meat 80%, Boar Tusk 30% |
| deer | 14 | 0 | 120 | 0 | Venison 85%, Deer Hide 50% |
| deer doe | 12 | 0 | 125 | 0 | Venison 80%, Deer Hide 45% |
| forest fox | 10 | 0 | 135 | 0 | Forest Herb 30% |
| rabbit | 6 | 0 | 130 | 0 | Rabbit Meat 90%, Rabbit's Foot 25% |
| crow | 8 | 0 | 140 | 0 | — |
| stray cat | 10 | 0 | 120 | 0 | — |
| dark deer | 16 | 0 | 118 | 0 | Venison 85%, Deer Hide 55% |
| dark deer doe | 12 | 0 | 122 | 0 | Venison 80%, Deer Hide 45% |
| field mouse | 4 | 0 | 110 | 0 | — |
| white mouse | 4 | 0 | 110 | 0 | — |
| shiba | 12 | 0 | 100 | 0 | — |
| goat | 14 | 0 | 90 | 0 | Venison 60% |
| turkey | 8 | 0 | 85 | 0 | Turkey Meat 80% |
| cow | 22 | 0 | 50 | 0 | Venison 90%, Deer Hide 50% |
| llama | 18 | 0 | 70 | 0 | Deer Hide 70% |
| pig | 16 | 0 | 80 | 0 | Boar Meat 90% |
| sheep | 14 | 0 | 55 | 0 | Deer Hide 80%, Forest Herb 30% |
| chicken | 6 | 0 | 90 | 0 | Rabbit Meat 90%, Forest Herb 20% |
| arctic fox | 10 | 0 | 135 | 0 | Wolf Pelt 40%, Rabbit Meat 50% |
| bird bluejay | 4 | 0 | 150 | 0 | — |
| bird sparrow | 4 | 0 | 140 | 0 | — |
| bird robin | 4 | 0 | 140 | 0 | — |
| bird cardinal | 4 | 0 | 145 | 0 | — |
| bird brown | 4 | 0 | 140 | 0 | — |
| bird black | 4 | 0 | 138 | 0 | — |
| bird blue | 4 | 0 | 142 | 0 | — |
| bird white | 4 | 0 | 140 | 0 | — |
| heron | 10 | 0 | 115 | 0 | — |
| giant frog | 18 | 0 | 80 | 0 | Venom Sac 20% |
| fire lizard | 12 | 0 | 120 | 0 | Ember Stone 25% |
| vulture | 14 | 0 | 100 | 0 | — |
| elk | 22 | 0 | 125 | 0 | Venison 80%, Deer Hide 50% |
| cave fish | 6 | 0 | 90 | 0 | — |
| glow moth | 5 | 0 | 110 | 0 | — |

## Boss
**The Void General** — 350 HP, 20 damage, 280 XP. Three phases (enrages at 75/50/25% HP) with a burst attack and phase-3 special attacks. Guaranteed drops: Void Channel and Arcane Sceptre (tier 4 staves).

## Quests
| Quest | Type | Steps | Reward |
|---|---|---|---|
| The Forest Hunt | main | Speak with the Hermit → Defeat Forest Wolves → Defeat Shadow Sprites → Attune to an Aetheric Monolith → Defeat the Void General | 300 XP, 150 Glint |
| Silvara's Supply Run | side | Gather Wood (0/3) → Gather Mineral Ore (0/2) → Return to Silvara | 100 XP, 80 Glint, Health Potion, Mana Potion |
| Echoes of the Ancient Ones | side | Read Ancient Signs (0/3) | 80 XP, 60 Glint, Ancient Scroll |
| Initiation of the Twilight Order | hidden | Comprehend Shadow Veil → Defeat enemies in Shadow Veil (0/8) | 250 XP, The Twilight Fang |
| The Covenant Scholar | hidden | Reach 30 Arcane Resonance (0/30) → Attune to 3 Rift-Gates (0/3) | 300 XP, Staff of the First Covenant |
| The Hunter's Trial | hidden | Defeat enemies with a Resonance Bow (0/12) → Defeat the Void General with a bow | 250 XP, The Eternal Draw |
| Void-Touched Beasts | side | Hunt Corrupted Boars (0/3) → Hunt Corrupted Deer (0/2) → Hunt Corrupted Rabbits (0/3) | 90 XP, 70 Glint, Health Potion, Void Shard |
| The Hermit's Offering | side | Collect Void Shards (0/5) → Return to the Hermit | 100 XP, 60 Glint, Mana Potion, Mana Potion, Ancient Scroll |
| The Hunter's Larder | side | Cook Roasted Boar → Cook Roasted Venison → Cook Roasted Rabbit | 70 XP, 50 Glint, Roasted Boar, Hearty Stew |
| The Void Fragment | hidden | Defeat Shadow Sprites (0/10) → Defeat the Void General | 250 XP, Cleaver of Vorgos |
| Whisperer of Doubt | main | Force Malphas to retreat | 400 XP, 200 Glint |
| The Frozen Camp | side | Read the scout's journal | 60 XP, 40 Glint, Legion Lore Fragment |
| The Widow's Watch | side | Gather Wood (0/1) → Gather Mineral Ore (0/1) | 80 XP, Soul-Gem of Still Waters |
| Echoes in the Rime | side | Clear the Frost-Shades (0/2) | 100 XP, Aether-Shard, Aether-Shard |
| Read the Erasure | main | Examine the Strata Wall | 30 XP |
| Dreamweaver's Call (placeholder) | main | Speak with the placeholder | 10 XP |
| Odyssey's Dawn (placeholder) | main | Speak with the placeholder | 10 XP |
| Sylvan Sanctuary (placeholder) | main | Speak with the placeholder | 10 XP |
| Treachery's Bite (placeholder) | main | Speak with the placeholder | 10 XP |
| The Solitary Path (placeholder) | main | Speak with the placeholder | 10 XP |
| Inferno's Trial (placeholder) | main | Speak with the placeholder | 10 XP |
| Eldoria's Heartbeat (placeholder) | main | Speak with the placeholder | 10 XP |
| Heart of War (placeholder) | main | Speak with the placeholder | 10 XP |
| The Weight of Eternity (placeholder) | main | Speak with the placeholder | 10 XP |
| Dawn's Embrace (placeholder) | main | Speak with the placeholder | 10 XP |

## Campaign
**Eldoria's Prophecy** — protagonist: eldrin.

| # | Chapter | Maps | Quests to complete | Unlocks |
|---|---|---|---|---|
| 1 | Echoes of Stone | eldrin_tower, echoes_of_stone | Read the Erasure | — |
| 2 | Dreamweaver's Call | aetheric_vision | Dreamweaver's Call (placeholder) | — |
| 3 | Odyssey's Dawn | thaloria, east_road | Odyssey's Dawn (placeholder) | — |
| 4 | Summit of Despair | summit_of_despair | Whisperer of Doubt | — |
| 5 | Sylvan Sanctuary | sylvan_sanctuary | Sylvan Sanctuary (placeholder) | ability aetheric_sight |
| 6 | Treachery's Bite | fire_gate | Treachery's Bite (placeholder) | — |
| 7 | The Solitary Path | the_descent | The Solitary Path (placeholder) | — |
| 8 | Inferno's Trial | inferno_labyrinth | Inferno's Trial (placeholder) | — |
| 9 | Eldoria's Heartbeat | ruins_of_eldoria | Eldoria's Heartbeat (placeholder) | — |
| 10 | Heart of War | heartstone_chamber, ancient_door | Heart of War (placeholder) | — |
| 11 | The Weight of Eternity | ruins_of_eldoria, thaloria | The Weight of Eternity (placeholder) | — |
| 12 | Dawn's Embrace | eldrin_tower | Dawn's Embrace (placeholder) | — |

## Maps
| Map id | Name | Size (tiles) | Kind |
|---|---|---|---|
| prologue_forest | Prologue Forest | 50×40 | game map |
| hermit_hut | Hermit's Hut | 20×14 | game map |
| eldrin_tower | Eldrin's Tower | 50×45 | game map |
| northern_forest | Northern Dense Forest | 40×45 | game map |
| big_forest | Big Forest (Test) | 64×56 | game map |
| samplemap | Sample Map (Tiled Import) |  | test / showcase |
| summit_of_despair | Summit of Despair | 18×20 | game map |
| echoes_of_stone | Echoes of Stones | 12×12 | game map |
| aetheric_vision | Aetheric Vision | 14×10 | chapter placeholder |
| thaloria | Thaloria | 14×10 | chapter placeholder |
| east_road | East Road | 14×10 | chapter placeholder |
| sylvan_sanctuary | Sylvan Sanctuary | 14×10 | chapter placeholder |
| fire_gate | Fire Gate | 14×10 | chapter placeholder |
| the_descent | The Descent | 14×10 | chapter placeholder |
| inferno_labyrinth | Inferno Labyrinth | 14×10 | chapter placeholder |
| ruins_of_eldoria | Ruins of Eldoria | 14×10 | chapter placeholder |
| heartstone_chamber | Heartstone Chamber | 14×10 | chapter placeholder |
| ancient_door | The Ancient Door | 14×10 | chapter placeholder |
| lpc_showcase | LPC Collection Showcase (Test) | 82×100 | test / showcase |
| pipoya_showcase | Pipoya Collection Showcase (Test) | 50×205 | test / showcase |
| forestest | The Forestest (Test) | 64×48 | test / showcase |
| wintertest | Winter Test | 48×36 | test / showcase |
| dungeontest | Dungeon Test | 50×40 | test / showcase |
| worldtest | The Grand Tour (Test) | 128×100 | test / showcase |

## Characters & stories
| Character | Role | About |
|---|---|---|
| Eldrin |  | Activated by Vorgos in the Epoch of Silence to secure the Heart Stone of Creation — a cure for a wound the world has not yet suffered. |
| Eldrin |  | The same Eldrin, rendered from the lpc-forge composition — a variant skin, not a different character. |
| Kael |  | Descendant of Acheron's most loyal servant — his bloodline was chosen to carry the Aurorian Spark so the Thirst could never fully consume Acheron's divine light. |
| Anya |  | Torn from Auroria by Vorgos at the moment of the Great Darkness and cast into the Underworld — her sacrifice sealed Nyktoros and made her the Silent Guardian of the prison. |
| Seraphina |  | A rebel who stood against Malakar during the Shadow Civil War. |

| Story | Summary |
|---|---|
| Eldoria's Prophecy | Vorgos activates Eldrin Nightshade to secure the Heart Stone of Creation — a contingency for a wound the world has not yet suffered. |

## Dialogues
`hermit_intro`, `hermit_after`, `hermit_quest_done`, `hermit_hut_greeting`, `hermit_hut_after`, `merchant_greeting`, `merchant_after`, `silvara_lore`, `eldrin_premonition`, `eldrin_second_vision`, `boss_encounter`, `boss_defeated`, `ancient_scroll_read`, `eldritch_tome_read`, `stub_ch02_dreamweavers_call_greeting`, `stub_ch03_odysseys_dawn_greeting`, `stub_ch05_sylvan_sanctuary_greeting`, `stub_ch06_treacherys_bite_greeting`, `stub_ch07_the_solitary_path_greeting`, `stub_ch08_infernos_trial_greeting`, `stub_ch09_eldorias_heartbeat_greeting`, `stub_ch10_heart_of_war_greeting`, `stub_ch11_the_weight_of_eternity_greeting`, `stub_ch12_dawns_embrace_greeting`
