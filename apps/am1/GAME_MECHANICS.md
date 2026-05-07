# Arcane Majesty — Game Mechanics Reference
### AM1 — Prologue Chapter

---

## Table of Contents

1. [Core Concept](#1-core-concept)
2. [Attributes](#2-attributes)
3. [Leveling & Progression](#3-leveling--progression)
4. [Mana System](#4-mana-system)
5. [Movement & Combat](#5-movement--combat)
6. [Weapon Families](#6-weapon-families)
7. [Skill Tree](#7-skill-tree)
8. [Resonance System](#8-resonance-system)
9. [Spell System — All 60 Spells](#9-spell-system--all-60-spells)
10. [Status Effects](#10-status-effects)
11. [Enemies & Boss](#11-enemies--boss)
12. [Equipment](#12-equipment)
13. [Inventory & Items](#13-inventory--items)
14. [Quests & Archive of Souls](#14-quests--archive-of-souls)
15. [World Systems](#15-world-systems)

---

## 1. Core Concept

You play as **Eldrin**, a scholar-mage navigating the Prologue chapter of Arcane Majesty. The game is a top-down action RPG built in Phaser 3. Combat is real-time. Magic is learned through *lived experience* — resonance builds automatically as Eldrin encounters elements in the world, not from leveling up.

The world does not reward grinding. It rewards *doing things*.

---

## 2. Attributes

Four core stats drive every derived value in the game.

| Attribute | Key | Starting Value | What it does |
|-----------|-----|---------------|--------------|
| **Strength** | STR | 5 | Melee damage, base = `8 + STR × 2` |
| **Intelligence** | INT | 5 | Spell damage, max mana = `10 + INT × 8`, mana regen |
| **Stamina** | STA | 5 | Max HP = `60 + STA × 8` |
| **Agility** | AGI | 5 | Movement speed = `100 + AGI × 4`, crit chance = `8% + AGI × 1.2%` |

**Attribute Points** are earned one per level-up and distributed freely via the `[K]` Skills & Stats screen using the `[+]` buttons.

Equipping items with `stats` values immediately applies them — unequipping removes them.

---

## 3. Leveling & Progression

### XP & Levels

- XP is gained by killing enemies. Each kill awards a fixed `xpReward` (15–42 XP per enemy, 200+ for the boss).
- Level threshold starts at 100 XP and scales by ×1.5 each level (`xpToNextLevel × 1.5`).
- On level-up: full HP and MP restore, +1 **Skill Point**, +1 **Attribute Point**.

### Skill Points

Spent in the Skill Tree (`[K]`) to upgrade combat and passive abilities. Separate from Attribute Points.

### Resonance Points

Not points — a passive accumulation. Each of the 8 elements has its own counter that fills through in-world events (kills, spell use, environmental exposure). Resonance unlocks spells automatically when thresholds are crossed.

---

## 4. Mana System

Mana (MP) is both the resource for spells *and* a survival meter. Running dry has real consequences.

### Mana Regeneration

`regenRate = (1 + INT × 0.15) × (HP fraction, min 8%) × modifiers`

- Nature Bond legendary weapon passive: +50% regen
- Mana collapsed (see below): ×0.4 regen
- Regen is continuous, per-frame

### Mana Exhaustion States

| State | Trigger | Effect |
|-------|---------|--------|
| **Normal** | Mana > 0 | Full function |
| **Exhausted** | Mana = 0 | Cannot cast spells or use mana-cost attacks. Grey tint. Speed penalty up to 85% of normal. |
| **Collapsed** | 6 seconds at 0 mana | Immobile. Flicker grey. Regen at 40% rate. Camera shake on entry. |
| **Recovery** | Mana reaches 20% of max | Exhaustion and collapsed state both clear. |

### Fatigue

Below 20% mana, movement speed is penalized linearly: 0–50% fatigue as mana drains from 20% to 0.

### ManaScent (Ping)

Every spell cast and mana-augmented attack generates **ManaScent** (0–100). This is the enemy aggro amplifier — enemies detect the player from further away when scent is high.

- Scent decays at 12 points/sec
- Spell cost × 0.55 = scent added per cast
- At 100% scent, enemy sight range is ×3 normal

A "PG" bar in the HUD shows current scent level (green → orange → red).

---

## 5. Movement & Combat

### Movement

`[WASD]` or arrow keys. Diagonal movement is normalized (×0.707). Speed reduced by fatigue and status effects (cold = 0.7×, entangled = 0×).

### Basic Attack `[Z]`

Activates the equipped weapon's melee hitbox. Damage formula:

```
base = 8 + STR × 2
strikeBonus = basic_strike skill level × 3
dmg = base + strikeBonus + random(−2, +3)
```

- **Crit chance**: `8% + AGI × 1.2% + keen_eye × 5%`
- Crits deal ×1.6 damage
- Knockback applied on every hit (130px normal, 220px power)

### Power Slash `[X]`

Requires `power_slash` skill (level 1+). Enlarged hitbox (60×60 vs 40×40). Damage × 1.8. Power cooldown: 1200ms. Cannot crit.

```
slashBonus = power_slash skill level × 6
dmg = (base + strikeBonus + slashBonus) × 1.8
```

### Blink-Step `[SPACE]`

Requires `blink_step` skill. Costs 8 MP. Teleports forward `60 / 80 / 105` px depending on level.

---

## 6. Weapon Families

There are 4 weapon types, 5 tiers (T1 Common → T5 Legendary), 2 variants per tier = **40 total weapons**.

### Tier Availability

| Tier | Rarity | Source |
|------|--------|--------|
| T1 | Common | Merchant |
| T2 | Uncommon | Merchant |
| T3 | Rare | Chests, drops |
| T4 | Epic | Chest, boss reward |
| T5 | Legendary | Hidden quest reward only |

T3+ weapons come with pre-rolled **enchants**.

### Enchants

| Enchant | Effect |
|---------|--------|
| **Resonant** | Physical hits reduce all active spell cooldowns by 300ms |
| **Arcane Surge** | 10% chance on hit to restore 3 MP |
| **Flame-Kissed** | Bonus fire damage equal to STR × 0.6 per hit |
| **Vampiric** | Steal 15% of damage dealt as HP |
| **Swiftness** | Attack cooldown −15% |
| **Void-Touched** | +40% damage vs shadow/void enemy types |

### Lore Abilities (T4+ only, proc on hit)

| Ability | Weapon | Chance | Effect |
|---------|--------|--------|--------|
| `chain_void` | Void Channel (staff) | 20% | AoE void pulse hits all enemies within 50px for 55% damage |
| `chain_lightning` | Arcane Sceptre (staff) | 25% | Arcs to nearest second enemy for 75% damage |
| `arcane_burst` | Arcane War-Blade | 20% | Hits 2 additional nearby enemies at 60% damage |
| `void_stun` | Void-Slicer | 20% | Extends enemy stun timer to 550ms |
| `shadow_clone` | Midnight Reaver | 25% | Phantom second strike at 50% damage after 140ms |
| `eclipse_mark` | Ecliptic Stiletto | 20% | Marks enemy — next hit within 1.5s deals ×2 |

### Legendary Passives

| Passive | Weapon | Effect |
|---------|--------|--------|
| `spell_amplifier` | Staff of the First Covenant | +25% all spell damage |
| `nature_bond` | Heartwood Resonator | +50% mana regen |
| `mana_on_hit` | Blade of the Covenant | Blade strikes grant 2 MP if INT > 12 |
| `execute_strike` | Cleaver of Vorgos | ×3 damage vs enemies below 30% HP |
| `shadow_harvest` | The Twilight Fang | +50% Glint from enemies killed in Shadow Veil |
| `void_rend` | Dagger of the Void | Double-hit always augmented — no mana cost |
| `triple_shot` | The Eternal Draw | Every 3rd consecutive bow shot deals ×2 |
| `void_piercer` | The Void-Piercer | Arrows pierce first enemy, range 220px |

---

### Staff `[cooldown 400ms]`
Physical hits cost 0 MP. No augmentation bonus on basic attacks. VFX: blue circle arc on swing. Best for pure casters — saves MP entirely for spells.

### Spell-Blade `[cooldown 480ms]`
Each hit costs **2 MP**. When augmented (mana available), deal **+35% damage + INT × 1.4** bonus arcane damage. VFX: X-cross arc. Hybrid playstyle: melee damage scales with INT.

### Umbral Dagger `[cooldown 260ms]`
Each hit costs **1 MP**. When augmented, fires a second hit 70ms later at **78% damage** (smaller hitbox). VFX: triangle spike in facing direction. Fast, stacking, shadow-flavored.

### Resonance Bow `[cooldown 650ms]`
Each shot costs **3 MP**. Ranged strike at **150px** (or 220px for Void-Piercer). No melee hitbox — damage handled by scene's `_bowStrike()` 120ms after animation. No arc VFX.

---

## 7. Skill Tree

Accessed with `[K]`. 9 skills total. Costs 1 Skill Point per level. Shown with `[P]` (passive) or `[A]` (active) labels.

| Skill | Type | Max Lv | Requirements | Effect |
|-------|------|--------|--------------|--------|
| **Basic Strike** | Active | 5 | None | +3 melee damage per level |
| **Power Slash** | Active | 5 | Lv 2, STR 10 | Unlocks `[X]` power attack; +6 bonus damage per level |
| **Keen Eye** | Passive | 5 | AGI 8 | +5% crit chance per level |
| **Arcane Ward** | Passive | 3 | Lv 2, INT 8 | Reduces incoming damage by 10% per level |
| **Blink-Step** | Active | 3 | Lv 3, AGI 8, Arcane ≥3 | Unlocks `[SPACE]` dash; range 60/80/105px |
| **Mana-Shield** | Passive | 3 | Lv 2, INT 8, Arcane ≥5 | Absorbs 30/50/70% of incoming damage using mana (2 mana per 1 HP shielded) |
| **Aetheric Sight** | Active | 3 | Lv 4, INT 12, Arcane ≥8 | `[V]` slows all enemies to 25% speed for 2/3/4s; reveals aggro radius |
| **Shadow Step** | Passive | 3 | Shadow ≥10 | Shadow Veil lasts +1s per level |
| **Arcane Mastery** | Passive | 3 | Arcane ≥15 | +10% all spell damage per level |

**Resonance-gated skills** (Blink-Step, Mana-Shield, Aetheric Sight, Shadow Step, Arcane Mastery) require specific elemental resonance in addition to any stat/level requirements. The requirement is shown in the skill row with a colored badge (e.g. "Arcane ≥3✓").

---

## 8. Resonance System

Resonance is a hidden progression layer — it cannot be gained by spending points. It fills through what Eldrin *does* in the world.

### 8 Elements

`fire` · `arcane` · `lightning` · `shadow` · `earth` · `ice` · `nature` · `wind`

Each element has its own counter (0–999). When a threshold is crossed, spells tied to that element automatically unlock or level up. The player gets a notification and screen flash.

### How Resonance Accumulates

| Event | Gain |
|-------|------|
| Kill wisp | Lightning +3 |
| Kill scout | Arcane +2 |
| Kill treant | Earth +4, Nature +2 |
| Kill boss | Shadow +10, Arcane +5 |
| Take shadow damage | Shadow +2 |
| Use scroll | Arcane +4 |
| Use tome | Arcane +6 |
| Cast Fire Nova | Fire +2 |
| Rest at campfire | Fire +1 |
| Cast Earth Pillar | Earth +2 |
| Cast Quagmire | Earth +1 |
| Stand in rain | Ice +1, Nature +1 |
| Find nature herb | Nature +2 |
| Use nature item | Nature +3 |
| Cast in wind | Wind +2 |
| Kill ice elemental | Ice +4 |

### Spell Discovery vs Mastery

Each spell has a `discoverCondition` (first threshold) and two `masteryThresholds`. Crossing them advances the spell from level 0 → 1 → 2 → 3.

Some spells have `discoverCondition: null` — they can *only* be learned from NPCs, scrolls, tomes, quests, or chests. Resonance alone will never unlock them.

---

## 9. Spell System — All 60 Spells

### Casting

- Spells are mapped to 4 slots: `[Q]` `[R]` `[F]` `[T]`
- Right-click or slot key + click to cast at cursor position
- Each cast consumes mana and starts a cooldown
- ManaScent spikes by (cost × 0.55)
- Silenced or Hushed = cannot cast anything
- Spell damage formula: `floor((base + perLevel × (tier−1) + perINT × INT) × ampMult × masteryMult)`
  - `ampMult` = 1.25 with `spell_amplifier` legendary passive
  - `masteryMult` = 1 + (arcane_mastery level × 0.10)

### Spell Tiers

| Tier | Name | Effect |
|------|------|--------|
| 1 | Novice | Base values |
| 2 | Apprentice | Reduced cooldown and mana cost, increased range/damage |
| 3 | Adept | Further improvements |

---

### ARCANE (12 Spells)

| Spell | Target | MP (1/2/3) | CD (ms) | baseDmg | Status | Learn |
|-------|--------|-----------|---------|---------|--------|-------|
| **Mana Dart** | Directional | 10/8/6 | 1100/900/700 | 8+4lv+0.6i | — | Resonance ≥8 |
| **Triple Dart** | Directional | 18/15/12 | 1800/1500/1200 | 5+3lv+0.4i | — | Scroll/Chest/Market |
| **Seeker Dart** | Directional | 14/11/8 | 1400/1100/850 | 10+5lv+0.7i | — | Tome/NPC |
| **Needle Volley** | Directional | 22/18/14 | 2500/2000/1600 | 3+2lv+0.25i ×5 | — | Resonance ≥30 |
| **Phantom Dart** | Directional (piercing) | 16/13/10 | 2000/1600/1200 | 12+6lv+0.8i | — | Resonance ≥42 |
| **Arcane Burst** | AoE | 22/18/14 | 2200/1800/1400 | 18+8lv+0.8i | — | Resonance ≥15 |
| **Luminance** | AoE | 14/11/8 | 4000/3200/2500 | 5+2lv+0.3i | Silenced 40%/3s | Resonance ≥20 |
| **Phantom Script** | AoE (trap/rune) | 18/14/10 | 8000/6400/5000 | 20+9lv+1.1i | — | Resonance ≥35 |
| **Benediction** | Self | 25/20/15 | 10000/8000/6200 | — | Blessed (100%) | Resonance ≥25 |
| **Cleanse** | Self | 20/16/12 | 5000/4000/3000 | — | Removes negatives | NPC/Tome/Quest |
| **Aetheric Ward** | Self | 30/24/18 | 15000/12000/9000 | — | Warded (permanent) | Resonance ≥50 |
| **Aetheric Inscription** | AoE (signature) | 35/28/22 | 4500/3500/2600 | 28+12lv+1.5i | — | Resonance ≥60 |

---

### FIRE (6 Spells)

| Spell | Target | MP | CD (ms) | baseDmg | Status | Learn |
|-------|--------|-----|---------|---------|--------|-------|
| **Fire Nova** | AoE ring | 20/18/15 | 2500/2100/1700 | 14+7lv+0.9i | Burning 35%/6s | Resonance ≥5 |
| **Ember Bloom** | AoE | 12/10/8 | 3500/2800/2200 | 4+2lv+0.3i | Burning 80%/8s | Resonance ≥20 |
| **Flame Lance** | Directional | 24/20/16 | 2000/1600/1200 | 22+10lv+1.1i | Burning 50%/5s | Resonance ≥35 |
| **Flame Wall** | AoE (barrier) | 26/21/16 | 6000/4800/3800 | 8+4lv+0.5i | Burning 75%/6s | Resonance ≥28 |
| **Fire Rain** | AoE (falling) | 30/24/18 | 5500/4400/3500 | 10+5lv+0.6i | Burning 40%/5s | Resonance ≥42 |
| **Warmth Aura** | Self | 15/12/9 | 7000/5600/4200 | — | Regen (100%), removes Cold/Frozen | Resonance ≥12 |

---

### LIGHTNING (5 Spells)

| Spell | Target | MP | CD (ms) | baseDmg | Status | Learn |
|-------|--------|-----|---------|---------|--------|-------|
| **Arc Bolt** | Directional (cone) | 18/15/12 | 1800/1500/1200 | 16+8lv+1.0i | Shocked 25%/2s | Resonance ≥12 |
| **Thunder Clap** | AoE short | 20/16/12 | 3000/2400/1800 | 10+5lv+0.7i | Shocked 60%/2s | Resonance ≥25 |
| **Lightning Lance** | Directional | 32/26/20 | 5000/4000/3000 | 30+14lv+1.4i | Shocked 40%/2s | Resonance ≥45 |
| **Chain Lightning** | Directional (3-chain) | 24/19/14 | 3800/3000/2300 | 14+7lv+0.9i | Shocked 30%/1.5s | Resonance ≥32 |
| **Static Field** | AoE (zone) | 22/18/14 | 7000/5600/4400 | 6+3lv+0.4i | Shocked 50%/1.5s | Resonance ≥18 |

---

### SHADOW (6 Spells)

| Spell | Target | MP | CD (ms) | baseDmg | Status | Learn |
|-------|--------|-----|---------|---------|--------|-------|
| **Shadow Veil** | Self | 22/18/14 | 5000/4200/3200 | — | Invisible, immune | Resonance ≥15 |
| **Shadow Bolt** | Directional | 18/14/10 | 1600/1300/1000 | 20+9lv+1.0i | Void-Tainted 30% | Resonance ≥10 |
| **Void Pulse** | AoE | 20/16/12 | 3200/2600/2000 | 12+6lv+0.8i | Void-Tainted 45% | Resonance ≥28 |
| **Hush** | AoE | 18/14/10 | 6000/4800/3800 | 0 | Hushed 80%/12s | Resonance ≥20 |
| **Eclipse Mark** | Directional | 12/10/8 | 2800/2200/1700 | 0 | Marked (100%, next hit ×2) | Resonance ≥38 |
| **Life Drain** | Directional | 20/16/12 | 4000/3200/2500 | 15+7lv+0.8i | Heals 50% of dmg | Resonance ≥45 |

**Shadow Veil mechanics**: Eldrin becomes 35% alpha, invincible. Duration: 1600/2400/3500ms base, +1000ms per **Shadow Step** skill level.

**Eclipse Mark**: Sets `_eclipseMarkTimer` on enemy. Next physical or spell hit on that enemy within 1.5s deals ×2 damage, then clears.

---

### EARTH (10 Spells)

| Spell | Target | MP | CD (ms) | baseDmg | Status | Learn |
|-------|--------|-----|---------|---------|--------|-------|
| **Stone Skin** | Passive | — | — | — | 8/14/20% damage reduction | Resonance ≥10 |
| **Earth Pillar** | AoE dual-mode | 16/13/10 | 2200/1800/1400 | 18+9lv+0.8i | — | Resonance ≥18 |
| **Quagmire** | AoE (zone) | 24/20/16 | 4000/3200/2500 | 4+2lv+0.3i | Entangled 70% | Resonance ≥28 |
| **Rock Bullet** | Directional | 14/11/8 | 1500/1200/950 | 16+8lv+0.7i | — | Resonance ≥6 |
| **Rubble Spray** | Directional (cone) | 15/12/9 | 2000/1600/1200 | 6+3lv+0.4i | Dirty 60% | Resonance ≥15 |
| **Mud Trap** | AoE (trap) | 18/14/10 | 6000/5000/4000 | 8+4lv+0.5i | Entangled 85%/4s | Resonance ≥22 |
| **Mud Wall** | AoE (barrier) | 22/18/14 | 5000/4000/3200 | 6+3lv+0.3i | Dirty 90% | Resonance ≥34 |
| **Stone Cannon** | Directional | 28/23/18 | 3500/2800/2200 | 32+14lv+1.2i | — | Resonance ≥40 |
| **Spike Field** | AoE | 24/19/14 | 4500/3600/2800 | 12+6lv+0.6i | Entangled 60%/2.5s | Resonance ≥32 |
| **Tremor** | AoE (close) | 30/24/18 | 7000/5600/4200 | 10+5lv+0.6i | Entangled 50%/2s | Resonance ≥50 |

**Earth Pillar dual-mode**: If cast within 60px of self → platform mode (lifts player, opens pillar gates). If cast further → assault mode (erupts at target, deals damage).

---

### ICE / WATER (7 Spells)

| Spell | Target | MP | CD (ms) | baseDmg | Status | Learn |
|-------|--------|-----|---------|---------|--------|-------|
| **Frost Shard** | Directional | 16/13/10 | 1600/1300/1000 | 14+7lv+0.9i | Cold 60%/10s | Resonance ≥8 |
| **Water Conjure** | AoE | 14/11/8 | 4000/3200/2500 | 0 | Wet 100%/25s | Resonance ≥12 |
| **Frostbite** | AoE | 20/16/12 | 3200/2600/2000 | 8+4lv+0.5i | Cold 90%/15s | Resonance ≥18 |
| **Water Blade** | Directional | 22/18/14 | 2200/1800/1400 | 26+11lv+1.0i | Wet 100%/20s | Resonance ≥28 |
| **Glacial Spike** | Directional | 25/20/15 | 3000/2400/1900 | 28+12lv+1.1i | Cold 80%/12s | Resonance ≥22 |
| **Blizzard Shard** | AoE (7 shards) | 28/22/16 | 4500/3600/2800 | 7+4lv+0.6i ×7 | Cold 55%/12s | Resonance ≥35 |
| **Ice Prison** | Directional | 28/22/16 | 6000/4800/3800 | 10+5lv+0.5i | Frozen 90%/5s | Resonance ≥45 |

---

### NATURE (8 Spells)

| Spell | Target | MP | CD (ms) | baseDmg | Status | Learn |
|-------|--------|-----|---------|---------|--------|-------|
| **Vine Grasp** | AoE | 18/14/10 | 3800/3000/2400 | 6+3lv+0.3i | Entangled 85%/4s | Resonance ≥8 |
| **Acid Splash** | AoE | 16/13/10 | 2600/2100/1700 | 8+4lv+0.5i | Poison 70%/10s | Resonance ≥15 |
| **Vessel Mend** | Self | 20/16/12 | 8000/6400/5000 | — | Regen 100%/20s | Resonance ≥12 |
| **Barkskin** | Self | 18/15/12 | 8000/6400/5000 | — | Blessed 100%/15s | Resonance ≥22 |
| **Spore Cloud** | AoE | 20/16/12 | 5000/4000/3200 | 2+1lv+0.2i | Poison 90%/15s | Resonance ≥30 |
| **Thornwall** | AoE (barrier) | 22/18/14 | 7000/5600/4400 | 5+2lv+0.3i | Poison 40%/8s | Resonance ≥38 |
| **Petal Storm** | AoE (cosmetic) | 8/6/4 | 6000/5000/4000 | 1+0lv+0.1i | — | NPC/Scroll only |
| **Purifying Sweep** | AoE (cleanse area) | 10/8/6 | 3000/2400/1800 | 0 | Removes Dirty | NPC/Market only |

---

### WIND (6 Spells)

| Spell | Target | MP | CD (ms) | baseDmg | Status | Learn |
|-------|--------|-----|---------|---------|--------|-------|
| **Wind Knife** | Directional (fast) | 10/8/6 | 900/720/560 | 12+6lv+0.7i | — | Resonance ≥8 |
| **Drying Wind** | AoE | 12/10/8 | 4000/3200/2500 | 0 | Dried 100%/10s | Resonance ≥5 |
| **Gale Slash** | Directional | 16/13/10 | 1400/1100/850 | 18+9lv+0.8i | — | Resonance ≥12 |
| **Tempest Step** | Self (dash) | 15/12/9 | 4000/3200/2500 | — | Blessed 2s | Resonance ≥18 |
| **Wind Barrier** | Self | 20/16/12 | 9000/7200/5600 | — | Blessed 8s | Resonance ≥24 |
| **Cyclone** | AoE (sustained) | 28/22/16 | 6500/5200/4000 | 8+4lv+0.5i | — | Resonance ≥30 |

---

## 10. Status Effects

Status effects are managed by the `StatusManager` system. They are stored on each entity as `_statuses` — a map of `{ remaining, stacks, dotTimer, regenTimer }`.

### All 17 Statuses

| Status | Duration | Tint | Special |
|--------|----------|------|---------|
| **Wet** | 30s | Blue | Fire damage ×0.5, Lightning damage ×2.0 |
| **Dried** | 10s | Tan | Fire damage ×1.3 |
| **Cold** | 20s | Ice blue | Speed ×0.7 |
| **Frozen** | 4s | Pale blue | Speed ×0 (stunned) |
| **Burning** | 8s | Orange-red | DoT: 3 dmg / 1s |
| **Shocked** | 2s | Yellow | Stunned |
| **Poison** | 15s | Green | DoT: 2 dmg / 2s, max 3 stacks |
| **Dirty** | Permanent | Brown | No mechanical effect (quest/spell interaction) |
| **Silenced** | 6s | Grey | Cannot cast spells |
| **Entangled** | 3s | Dark green | Speed ×0 (stunned) |
| **Cursed** | 20s | Purple | Stat multiplier ×0.85 |
| **Blessed** | 30s | Gold | Stat multiplier ×1.10 |
| **Regen** | 10s | Bright green | Heal: 3 HP / 1s (player only) |
| **Void-Tainted** | 30s | Dark violet | No direct effect (story significance) |
| **Marked** | 1.5s | Magenta | Next hit deals ×2 damage |
| **Warded** | Permanent | Blue | Defensive aura (story/boss interaction) |
| **Hushed** | 15s | None | Cannot cast spells (same as Silenced, different source) |

### Stun Types

Three statuses count as **Stunned** for movement: `frozen`, `shocked`, `entangled`. While stunned, the entity cannot move. Enemy AI is overridden. Player movement is blocked.

### Status Interactions (Interaction Matrix)

| Applying | When target has | Result |
|----------|----------------|--------|
| **Burning** | Wet | → Steam event (both removed, VFX) |
| **Burning** | Frozen | → Frozen removed, Burning applied |
| **Burning** | Cold | → Cold removed |
| **Wet** | Burning | → Steam event (both removed) |
| **Wet** | Dried | → Dried removed |
| **Dried** | Wet | → Wet removed |
| **Cold** | (any) Burning | → Cold application blocked |
| **Frozen** | (any) Burning | → Frozen application blocked |

### Incoming Damage Modifiers

Applied automatically when damage is dealt to a status-afflicted entity:

| Damage element | Target status | Modifier |
|----------------|--------------|----------|
| Fire | Wet | ×0.5 |
| Fire | Dried | ×1.3 |
| Lightning | Wet | ×2.0 |
| Physical | Frozen | ×1.5 (and removes Frozen → "shatter") |

### Tint Priority

When multiple statuses are active, the tint with highest visual priority wins:
`frozen > shocked > burning > cold > entangled > cursed > blessed > warded > wet > poison > dirty > silenced > void_tainted > marked`

Status labels are shown as a compact colored strip below the Ping bar in the HUD.

---

## 11. Enemies & Boss

### Standard Enemies

| Type | HP | Damage | Speed | Sight | XP | Loot |
|------|----|--------|-------|-------|----|------|
| **Wisp** | 18 | 5 | 85 | 100px | 15 | Mana Potion 30% |
| **Scout** | 32 | 9 | 56 | 115px | 22 | Health Potion 35%, Forest Herb 25% |
| **Treant** | 65 | 16 | 30 | 70px | 42 | Health Potion 50%, Forest Herb 40% |

### Enemy AI States

`PATROL → CHASE → ATTACK → STUNNED → DEAD`

- **Patrol**: Wanders within `patrolRadius` of spawn point. Changes target every 1.5–3.5s.
- **Chase**: Moves directly to player at full speed.
- **Attack**: Stops moving, hits player on cooldown (1100ms).
- **Stunned**: 180ms after taking damage. Velocity reset to 0.
- **Dead**: Death tween (alpha→0, scaleY→0.1 over 320ms), then emits `died`.

**ManaScent aggro**: Effective sight range = `sightRange × (1 + (manaScent / 100) × 2)`. At 100% scent, enemies see 3× further.

When first alerted, enemies show `!` (normal sight) or `?!` (scent-range aggro beyond normal sight).

### Boss — Void Wraith

Spawned at the arena coordinates in the world map. Separate `BossEnemy` class.

**Taunt lines (triggered at HP thresholds):**
- 75%: *"You carry the scent of failure, scholar."*
- 50%: *"The Void does not yield. Neither do I."*
- 25%: *"ENOUGH! I will consume your soul!"*

**Boss kill rewards:** Shadow +10, Arcane +5 resonance, plus quest completion.

### Post-death Resonance Gains

| Kill | Resonance |
|------|-----------|
| Wisp | Lightning +3 |
| Scout | Arcane +2 |
| Treant | Earth +4, Nature +2 |
| Boss | Shadow +10, Arcane +5 |

---

## 12. Equipment

### Slots

`Head` · `Body` · `Weapon` · `Accessory 1` · `Accessory 2`

Equipment is managed through `[I]` (Inventory). Stats are applied on equip and removed on unequip. Two accessory slots — items tagged as `slot: 'accessory'` auto-fill the first available slot.

### Armor & Accessories Available

| Item | Slot | Tier | Stats | Source |
|------|------|------|-------|--------|
| Scholar's Cowl | Head | 1 | +1 INT | Merchant |
| Scholar's Tunic | Body | 1 | +1 STA | Merchant |
| Violet Silk Robes | Body | 2 | +2 INT, +2 STA | Drops/Chests |
| Iron Ring | Accessory | 1 | +1 STR | Merchant |
| Resonance Amulet | Accessory | 2 | +2 INT, +1 AGI | Drops/Chests |

Each +1 to Stamina adds 8 Max HP. Each +1 to Intelligence adds 8 Max Mana.

---

## 13. Inventory & Items

### Satchel Tiers

Satchel capacity upgrades via usable items (consumed on use):

| Tier | Name | Slots | Item |
|------|------|-------|------|
| 1 | Weathered Pouch | 10 | Starting |
| 2 | Expanded Haversack | 20 | `expanded_haversack` (120 gl) |
| 3 | Runic Satchel | 35 | `runic_satchel` (280 gl) |
| 4 | Void-Fold | 60 | `void_fold` (600 gl) |

### Consumables

| Item | Effect | Buy | Sell |
|------|--------|-----|------|
| Health Potion | Restore 30 HP | 25 | 8 |
| Mana Potion | Restore 20 MP | 20 | 6 |
| Forest Herb | Restore 10 HP | 12 | 4 |
| Heart Crystal | Restore 80 HP + max HP +10 | 100 | 35 |
| Ancient Scroll | +50 XP, Arcane +4 | 60 | 20 |
| Eldritch Tome | +150 XP, +1 Skill Point, Arcane +6 | 150 | 50 |
| Traveler's Tent | Full HP + MP restore, clear exhaustion, +50 XP | 120 | 40 |

### Gathering Tools

| Tool | Use | Buy |
|------|-----|-----|
| Iron Axe | Required to harvest Wood nodes | 45 |
| Iron Pickaxe | Required to harvest Mineral Ore | 50 |

### Resources

| Resource | Sell | From |
|----------|------|------|
| Wood | 4 | Timber gathering nodes (axe required) |
| Mineral Ore | 8 | Ore vein nodes (pickaxe required) |

### Currency

**Glint (gl)** — enemy gold drops. Wisps drop less, Treants and boss drop more.

---

## 14. Quests & Archive of Souls

### Quest Journal `[N]`

Two tabs, toggled with `[A]`:

**Quests tab**: Lists active and completed quests. Navigate with `[↑↓]`, view detail pane. Shows: title, objectives (with progress where tracked), status.

**Archive of Souls tab**: Lists recovered memory fragments — lore entries unlocked by completing specific quests. Each entry shows: title, full lore text, timestamp of discovery.

### Quest Types

- **Main quests**: Auto-started. Drive the prologue narrative.
- **Side quests**: Auto-started or triggered by world events.
- **Hidden quests**: Triggered by specific player actions (first bow kill, first shadow_veil discovery, arcane resonance ≥10, etc.).

### Known Quests (Prologue)

| ID | Title | Trigger |
|----|-------|---------|
| `main_forest_hunt` | The Forest Hunt | Auto at game start |
| `side_supply_run` | Scout's Report | Auto at game start |
| `side_read_the_signs` | Reading the Signs | Auto at game start |
| `hidden_shadow_initiation` | The Shadow Initiation | Discovering shadow_veil |
| `hidden_covenant_scholar` | The Covenant Scholar | Arcane resonance ≥10 |
| `hidden_hunters_trial` | The Hunter's Trial | First kill with resonance_bow |

---

## 15. World Systems

### Scholar's Eye

Six echo zones placed near ruins and signs in the world. When Eldrin enters one:
- Screen gets a blue ghostly overlay
- A lore notification appears with archaeological/historical text
- Active for the duration of proximity

Cooldown between triggers is throttled to every 500ms.

### Campfires

Interact `[E]` to rest: full HP + MP restore. Costs nothing. Grants Fire +1 resonance.

### NPCs

Interact `[E]` within 48px. Open dialogue tree. Some NPCs teach spells, give quests, sell items (merchant), or provide lore.

### Signs

Interact to read. Grants progress toward `side_read_the_signs` quest.

### Rift Gates

Void-energy portals in the world. Interact to **attune** (one-time). Once attuned, fast-travel between any two attuned gates is available.

### Gathering Nodes

Three node types appear on the map:
- **Timber** — requires Iron Axe
- **Mineral Ore** — requires Iron Pickaxe
- **Herbs** — no tool required

Interacting with a node (when tool is in inventory for the right type) adds the resource to inventory. Nodes do not respawn in the prologue.

### Cracked Boulders

Can be broken by **Earth Pillar** (platform mode, within 55px). May hide passages or loot.

### Pillar Gates

Stone gates that open when **Earth Pillar** is cast near them (within 80px). The gate stays open for the duration of the pillar (3.2–5.5s by tier).

### Music

Procedural WebAudio music adapts to game state:
- **Calm**: sine/triangle wave arpeggios (4 patterns)
- **Intense**: square/sawtooth (4 patterns, triggered when ManaScent > 30 or enemies nearby)
- **Boss**: sawtooth with sub-bass pulse (single pattern)

Mood transitions only happen at the end of the current loop cycle, not mid-phrase.

### Save System

Auto-saves on every enemy kill. Saves: level, XP, stats, resonance, spells, skills, equipment, inventory, quest log, attunement gates, recovered memories, gold.

---

*Document generated from AM1 source — apps/am1/src/ — accurate to current build.*
