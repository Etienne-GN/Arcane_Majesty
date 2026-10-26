# Combat: Weapons, Mastery, Styles and Arrows — Design

**Date:** 2026-10-26
**App:** `apps/amo` (Phaser 3)
**Status:** agreed with the user in conversation on 2026-10-26.

## Why

The user wants a game they can play, and have their son try. Combat is where most of the play happens. Today:
- every weapon is a magical variant: a staff, a spell-blade, an umbral dagger, a resonance bow;
- nothing grows with use;
- spells come too easily. Standing in the rain in Thaloria taught Riptide in 90 seconds.

This design adds:
- real weapons, held in two hands;
- mastery that grows by use, capped by each character's talent;
- fighting styles with their own skills, learned by practice, from manuals, or from teachers;
- arrows, bolts and quivers.

It also brings spells under the same rule.

**Success:** a new player picks up any weapon and fights with it at once. Each story hero feels different. Getting better takes fighting, not waiting. A child can read the manual's combat guide and understand all of it.

## Decisions (made by the user)

1. **Pick up anything, get better with use, talent sets the ceiling.**
   - Any character uses any weapon from the start.
   - Each weapon type, and each kind of magic, has a mastery that grows with use.
   - Each character's talent sets how high that mastery can go. Eldrin stays a mage: a sword works for him, but he never becomes a top swordsman. Kael is the reverse.
2. **Magic is magic.**
   - Spells are known by the character, not by the stick.
   - A wand or a staff is a *focus* that adds a bonus: the wand adds speed, the staff adds power and area.
   - Anyone can cast bare-handed or with a sword in hand (Seraphina).
3. **Two hands.** A main hand and an off hand. Eldrin may carry a sword and a staff ("full Gandalf").
4. **Controls do not change.**
   - The attack button and the second button (today's Power) each hold one *move*, which the player chooses. Defaults fill in on equip.
   - Q/R/F/T hold skills and spells, mixed freely.
5. **Styles.** Every weapon has fighting styles that bring their own skills, as elements do for magic.
6. **Learning: practice < manual < teacher.** Practice is free and slow. A manual is faster. A teacher is fastest and costs gold. Spells follow the same rule.
7. **Arrows are real.** Quivers, crafting from gathered materials, special arrows, and getting arrows back. No throwing knives (the user: "you can't carry that many knives").
8. **Created characters pick a class.** Changing class or taking a second class comes later; this design leaves room for it.
9. **The manual explains all of it "loud and clear"** in a combat guide, updated by every stage.

## 1. Weapons and hands

**Thirteen weapon types.** Existing items keep their names and stats; their old `weaponType` maps to a type.

| Type | Hands | Basic move | Feel | Existing items |
|---|---|---|---|---|
| Wand | one | **Bolt:** quick, light, one target | duelist magic | — (new) |
| Staff | one | **Blast:** slow, strong, small area | battle-mage magic | `staff` |
| Bo staff | two | **Strike:** fast pole blows, good reach | martial | — (new) |
| Spear | two | **Thrust:** long reach, pierces | keep-away | — (new) |
| Dagger | one | **Stab:** very fast, short reach | quick and close | `umbral_dagger` |
| One-handed sword | one | **Slash:** balanced | all-rounder | `spell_blade` |
| Two-handed sword | two | **Sweep:** slow, wide, heavy | crowds, big hits | — (new; see risks) |
| Mace | one | **Smash:** slow, cracks armour | anti-armour | — (new) |
| Axe | one | **Chop:** strong, can cleave two | brutal | — (new) |
| Shield | off hand only | **Block** (hold): stops most frontal damage, slows you | defence | — (new) |
| Bow | two | **Shoot:** long range, uses an arrow | distance | `resonance_bow` |
| Crossbow | two | **Shoot bolt:** slow reload, hits very hard | power at range | — (new) |
| Fists | (empty hands) | **Punch:** fast, weak, always available | when unarmed | — |

**Notes on the new types:**
- **The staff** can be held in one hand, like Gandalf's walking staff. It is a magic focus; its basic Blast is a spell-like strike.
- **The bo staff** is a fighting pole, not a magic focus.

**Hands:**
- **One-handed weapons pair freely:** wand, staff, dagger, one-handed sword, mace, axe. The shield goes in the off hand only.
- **Two-handed weapons take both hands:** bo staff, spear, two-handed sword, bow, crossbow.
- **An empty hand is a fist.**
- **Equipment:** `equipment.weapon` becomes `mainHand` and `offHand`. An old save's weapon moves to `mainHand`; nothing is lost.
- **The character shows both weapons** where the LPC art supports it, otherwise the main hand only. Gaps go to `docs/polish_backlog.md`.

## 2. Buttons: every action button holds a move

**The attack button and the second button** (today's Power: X, the second face button, touch PWR) each hold one **move**. Moves come from what is equipped:
- each weapon's basic move;
- each weapon's **power strike** (today's power attack: slower and costlier, much stronger);
- the arrow or bolt kind to shoot, for example "Shoot: Poison Arrow".

**Defaults on equip,** so nothing needs setting up:
- The attack button gets the main hand's basic move.
- The second button gets the off hand's basic move.
- With no off-hand weapon, or a two-hander, the second button gets the main weapon's power strike.
- With a shield, the second button gets Block.

**Q/R/F/T** (touch: the skill ring; gamepad: the skill buttons) hold skills and spells, mixed freely:
- A weapon skill whose weapon is not in hand is greyed out.
- Spells always work (decision 2).

**Changing a slot** happens in the inventory or skill screen. Keyboard, gamepad and touch bindings stay as they are.

## 3. Mastery and talent

**Mastery levels.** Every weapon type and every element has a **mastery level from 1 to 10**. Everyone starts at 1.

**How mastery grows:**
- **A weapon** gains points on each hit with it (1) and each kill (5), scaled by the enemy's level relative to yours. Weak enemies teach little.
- **An element** gains points each time a spell of it hits an enemy (1) and kills (5), with the same scaling.
- **Level L → L+1 costs `40 × L` points,** so reaching 10 takes 1,800 points: a good few hundred kills.
- **Passive gains** (rain, campfires, standing in an element) give at most 1 point per tick and stop at level 2. They are a nudge; they never teach a spell on their own.

**What mastery does:**
- **Weapon:** +8% damage per level above 1, and 2% less time between attacks per level.
- **Element:** +8% spell damage per level above 1. Spell tiers unlock at element levels (below).
- **Focus (wand, staff):** decides the size of the focus bonus.
  - **Wand:** casts and cooldowns are 10% + 2% per wand level faster, at 15% less power.
  - **Staff:** power is 10% + 3% per staff level higher and radius 5% + 2% per level wider, and casting takes 25% longer.
  - **No focus:** no bonus and no penalty.
- **Styles:** a style's skills unlock at that weapon's mastery 2, 5 and 8 (section 4).

**Talent: the ceiling.** Each character has one per weapon type and per magic family:
- **Gifted:** up to 10.
- **Trained:** up to 6.
- **Untrained:** up to 3.

**Magic families:**
- **elemental:** fire, water, earth, wind, ice, lightning, nature;
- **light (Aurorian):** arcane;
- **dark (Malakar, the Void):** shadow.

**Story characters:**

| | Eldrin | Kael | Anya | Seraphina |
|---|---|---|---|---|
| Wand | Gifted | Untrained | Gifted | Trained |
| Staff | Gifted | Untrained | Gifted | Trained |
| Bo staff | Trained | Untrained | Trained | Untrained |
| Spear | Untrained | Trained | Untrained | Trained |
| Dagger | Untrained | Trained | Trained | Gifted |
| One-handed sword | Untrained | Gifted | Untrained | Gifted |
| Two-handed sword | Untrained | Gifted | Untrained | Trained |
| Mace | Untrained | Trained | Untrained | Untrained |
| Axe | Untrained | Trained | Untrained | Trained |
| Shield | Untrained | Gifted | Untrained | Trained |
| Bow | Untrained | Untrained | Trained | Trained |
| Crossbow | Untrained | Trained | Untrained | Trained |
| Fists | Untrained | Trained | Untrained | Trained |
| Elemental magic | Gifted | Untrained | Trained | Untrained |
| Light magic | Trained | Trained (the Spark) | Gifted | Untrained |
| Dark magic | Trained | Untrained | Gifted | Gifted |

**Classes for created characters.** Anything not listed is Untrained.

| Class | Gifted | Trained |
|---|---|---|
| Warrior | one-handed sword, two-handed sword, shield | dagger, spear, mace, axe, crossbow, fists |
| Ranger | bow, crossbow, dagger | one-handed sword, spear, elemental magic |
| Mage | wand, staff, elemental magic | light magic, dark magic, bo staff, dagger |
| Brawler | fists, bo staff | dagger, two-handed sword, mace, axe |
| Spellsword | one-handed sword, shield, light magic | mace, wand, elemental magic |
| Shadowblade | dagger, one-handed sword, dark magic | bow, wand, fists |
| Seer | wand, light magic | staff, bo staff, dagger, elemental magic |
| Druid | bo staff, staff, elemental magic | spear, bow, light magic |

- **Character creation** gains a class choice.
- **A created character from before this update** is asked once to pick a class when loaded.
- **Talents live in data** (`characters.js` for story heroes, a classes table for created characters), so class change or a second class later is a data change plus a screen.

## 4. Styles and learning

**What a style is.** Each style brings **three skills**, unlocked at that weapon's mastery **2, 5 and 8**. So:
- **Untrained** (max 3) gets a style's first skill;
- **Trained** (max 6) gets two;
- **Gifted** (max 10) gets all three.

A character can know several styles of one weapon and mix their skills on Q/R/F/T. Style and skill names below are working names.

| Weapon | Styles (first style in bold, built in stage C3/C4) |
|---|---|
| One-handed sword | **Guard** (Parry, Riposte, Steady Advance) · Duelist (Lunge, Feint, Flurry) · Spellblade (Enchant Blade, Arc Slash, Blink Strike) |
| Two-handed sword | **Reaver** (Whirlwind, Cleave, Rampage) · Breaker (Overhead Smash, Ground Slam, Armour Break) · Vanguard (Charge, Momentum, Unstoppable) |
| Dagger | **Shadow** (Vanish, Backstab, Shadowstep) · Venom (Envenom, Bleeding Cuts, Toxic Cloud) · Twin Fangs (Twin Strike, Whirling Cuts, Hamstring) · Main-Gauche (Catch Blade, Disarm, Counter-Thrust) |
| Spear | **Lancer** (Piercing Lunge, Leaping Strike, Run Through) · Phalanx (Brace, Trip, Hold the Line) · Whirlwind Spear (Spin, Sweep, Cyclone) |
| Bo staff | **Spinning Staff** (Flurry of Blows, Deflect Arrows, Windmill) · Rooted (Heavy Blow, Knock-Down, Stand Firm) · Vaulting (Vault, Leaping Strike, Hit and Run) |
| Mace | **Crusher** (Bone Breaker, Stunning Blow, Shatter Armour) · Zealot (Holy Strike, Consecrate, Judgement) · Guardian (Brace, Rebuke, Last Stand) |
| Axe | **Berserker** (Rage, Bleeding Chop, Frenzy) · Cleaver (Wide Chop, Split, Executioner) · Hookaxe (Hook Shield, Pull, Trip) |
| Shield | **Bulwark** (Perfect Block, Taunt, Shield Wall) · Bash (Shield Bash, Charge, Stagger) · Aegis (Light Ward, Reflect, Sanctuary) |
| Bow | **Hunter** (Aimed Shot, Snare, Mark Prey) · Skirmisher (Rapid Fire, Volley, Backstep Shot) · Resonance (Fire / Frost / Storm Arrow, from elements you know) |
| Crossbow | **Marksman** (Steady Aim, Headshot, Pierce) · Siege (Heavy Bolt, Knock-Back, Pin) · Repeater (Quick Reload, Burst, Suppress) |
| Fists | **Brawler** (Haymaker, Grab & Throw, Headbutt) · Flow (Flurry, Palm Strike, Deflect) · Iron Body (Iron Skin, Ground Pound, Shrug Off) |
| Wand | **Quickcast** (Snap Cast, Echo, Chain) · Hex (Weaken, Slow, Siphon) · Twin Focus (Crossfire, Split Bolt, Mirror) |
| Staff | **Channeler** (Channel, Overload, Release) · Warder (Ward Circle, Barrier, Sanctuary) · Battle Staff (Sweep, Vault, Staff Strike) |

**Magic's styles are its elements,** which already exist (123 spells).

**Learning a style** fills a bar from 0 to 100%:
- **Practice (free, slow):** the player picks which style of each weapon they are practising. Each kill with that weapon adds 1%, scaled like mastery points.
- **A manual (faster):** found in chests or bought. Reading it adds 40% at once and doubles practice for that style.
- **A teacher (fastest, costs gold):** one lesson per in-game day, during the teacher's working hours (W4 schedules). Each lesson adds 35%, and lessons cost more as they go (100, 200, 300 gl).
- **At 100%** the style is known, and its skills appear as mastery allows.

**Spells follow the same rule:**
- casting in fights is practice (element points);
- scrolls and tomes are manuals;
- NPCs who teach spells are teachers.

**Spell tiers unlock by element level.**
- A spell's Novice tier unlocks at element level `clamp(round(threshold / 10), 1, 8)`, where `threshold` is today's `discoverCondition.threshold`.
- Apprentice unlocks 2 levels later and Adept 4 levels later, capped at 10.
- A tier above the character's ceiling is never reached by practice. A manual or teacher can grant a spell, but its tiers still follow the ceiling.

**Migration:**
- Spells a save already knows stay known, at their tiers. Nothing is taken away.
- Old resonance converts to element points at 5 points per resonance, capped by the ceiling.

**First teachers and manuals (stage C3), in Thaloria:**
- the barracks sergeant teaches Guard;
- the smith teaches Crusher;
- the Archivist's Guild sells the Warder and Hex manuals;
- the rest are found in chests and shops.

Teacher NPCs are townsfolk with a `teaches` field.

## 5. Arrows, bolts and quivers

**Quivers** sit in a new equipment slot. Only ammunition in the quiver can be shot.

| Quiver | Holds | Kinds (compartments) |
|---|---|---|
| Small quiver | 30 | 1 |
| Large quiver | 60 | 2 |
| Hunter's quiver | 90 | 3 |

- **What it holds:** a compartment holds arrows *or* bolts of one kind.
- **Refilling:** spare ammunition in the pack refills the quiver automatically after a few seconds with no fighting. In a fight, an empty quiver means you are out ("Out of arrows").
- **Without a quiver,** 10 arrows can be kept ready.

**Ammunition and crafting** (crafting screen, C). Each recipe makes 10.

| Ammunition | Ingredients | Effect | Got back on a kill |
|---|---|---|---|
| Basic arrow | 2 Sticks + 1 Feather | plain | about 1/3, as basic |
| Broadhead | 10 basic + 1 Mineral Ore (tip) + 1 Resin | +35% damage | about 1/3, as broadheads |
| Poison arrow | 10 basic + 1 Venom Sac | poisons | about 1/3, as **basic** (the poison is spent) |
| Explosive arrow | 10 basic + 1 Ember Stone + 1 Resin | small-area burst | never |
| Bolt | 2 Sticks + 1 Mineral Ore | plain (crossbow) | about 1/3 |

- **Getting arrows back:** when an enemy dies, about a third of the arrows and bolts that hit it come back, by kind, as in the table.
- **An explosion destroys everything:** if the killing blow is an explosive arrow, nothing comes back from that enemy.
- **Materials:**
  - **Sticks:** 1 Wood makes 4, and they sometimes drop when you gather wood.
  - **Feathers** are a new material, dropped by winged creatures and sold cheaply by the Merchant.
  - Mineral Ore, Venom Sac, Ember Stone and Resin already exist.
- **Elemental and magic arrows** are not items. They are the bow's Resonance style skills: they spend mana and use one normal arrow.
- **A new character with a bow** starts with a small quiver, 30 basic arrows, and a few Sticks and Feathers.
- **The Merchant** sells basic arrows, bolts, feathers and the small quiver. The large and Hunter's quivers are found or crafted (hide + resin).

## 6. The manual: a combat guide

`docs/manual/index.html` (generated by `tools/gen_game_inventory.mjs`) gets a **Combat** chapter written so a child can follow it. It has short sentences, tables, and one worked example per idea, for instance: "Eldrin with a sword and a staff: put Staff Blast on Attack and Slash on the second button."

It covers:
- hands and buttons;
- every weapon, and what it is good for;
- mastery and talent, with the character and class tables;
- every style and its skills;
- learning: practice, manual, teacher;
- spells and elements;
- arrows, bolts, quivers, crafting, and getting arrows back.

**Every stage updates its part.** A stage is not done until the guide matches the game.

## 7. Build stages

Each stage has its own plan and ends playable. `npm test` stays green, and each stage is checked headless in the running game (as W1–W6 were).

| Stage | Contents |
|---|---|
| **C0 (spike)** | Check the LPC longsword/katana oversized swing art for a two-handed sword. If it is good enough, the two-handed sword is in C1; if not, it waits for art and everything else proceeds. |
| **C1: weapons and hands** | the 13 types and their basic moves (new items: a wand, a bo staff, a spear, a mace, an axe, a shield, a crossbow, each at tier 1–2); main and off hand; Block; the two move buttons with defaults; save migration; manual: hands, buttons, weapons. |
| **C2: mastery and talent** | weapon and element mastery; ceilings; story-character talents; the 8 classes in character creation and the one-time prompt; spell tiers by element level; the rain fix and resonance migration; manual: mastery, talent, classes, spells. |
| **C3: styles, part 1 (close combat)** | the style system and learning bar; manuals and teachers; first styles for one-handed sword, two-handed sword, dagger, spear, bo staff, mace, axe, shield, fists; Thaloria's first teachers and manuals; manual: styles and learning. |
| **C4: styles, part 2 (range and magic)** | first styles for bow, crossbow, wand, staff; manual. |
| **C5: arrows and bolts** | quivers, ammunition, Sticks and Feathers, crafting, getting arrows back, explosions; manual. |
| **C6 onward** | the remaining styles, a few per stage. |

**Order rationale:** sword fighting first (the user's priority). C5 can move before C3 if the bow feels empty.

## Risks

- **Weapon hand.** LPC weapon sprites switch hands with the facing direction (right hand facing right, left hand facing left). A true off-hand drawing needs reworked weapon sprites. That work is later (polish backlog). Until then, the off-hand weapon may be drawn only where it looks right, or not at all, while still working in play.
- **Animations.** The LPC set has slash, thrust, shoot and cast. Fists use a weaponless slash or thrust, and the bo staff borrows the spear's pole art without the tip. The two-handed sword depends on C0. Gaps go to the polish backlog.
- **Balance.** The numbers above are a starting point. Each stage ends with a headless fight check against Chapter 1–3 enemies. Tuning that changes a number goes in the ledger.
- **Old saves.** Equipment, resonance and known spells migrate without loss, tested like W6's `layoutVersion`.

## Out of scope

- **The scythe** is reserved for one future character, not yet chosen.
- **Changing class and secondary classes:** later; this design keeps talents as data so they are possible.
- **New art beyond what LPC provides,** and visual polish (see `docs/polish_backlog.md`).
- **Online play changes.**

## Lore

Classes, styles and skills are game mechanics, not lore entities. The Shadowblade and Seer classes take their spirit from the Shadow Legion and the Seers of Auroria (album canon) without new nodes. No DB sync is needed. Teachers are unnamed townsfolk roles.
