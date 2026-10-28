import { ITEMS, SATCHEL_TIERS } from '../data/items.js';
import { equipPlan, resolveMoves, movesFor } from './weapons.js';
import { SPELLS, RESONANCE_ELEMENTS } from '../data/spells.js';
import { UPGRADE_MAX, upgradeCost, upgradedStats } from '../data/upgrades.js';
import { vigorMax } from './movementRules.js';
import { addPoints, levelOf, ceilingOf, FAMILY, tierAt, unlockLevel, focusOf, focusBonus, hitGain } from './mastery.js';
import { STYLE_SKILLS } from '../data/styles.js';
import { emptyStyles, practising, practiceGain, readManual, skillState, handTypes } from './styles.js';

// Mastery skills — unlocked with Resonance Insights earned through lore/quests
export const MASTERY_DEFS = {
    aetheric_comprehension: {
        id: 'aetheric_comprehension', cost: 3,
        name: 'Aetheric Comprehension',
        description: 'Aetheric Tear cooldown 60s → 45s, mana cost 85% → 75%.',
        lore: '"The first record of spatial tearing predates the Covenant by 200 years." — Archive Fragment',
    },
    spatial_attunement: {
        id: 'spatial_attunement', cost: 5,
        name: 'Spatial Attunement',
        description: 'Aetheric Tear tier 2 — freely target any explored location on the world map.',
        lore: '"A master of the rift does not follow gates. The rift follows the master." — Vorgos, Fragment VII',
    },
    scholars_vigilance: {
        id: 'scholars_vigilance', cost: 2,
        name: "Scholar's Vigilance",
        description: "Scholar's Eye echo zones extend 30% further.",
        lore: '"The closer you walk to history, the louder it speaks." — Hermit',
    },
    mana_efficiency: {
        id: 'mana_efficiency', cost: 2,
        name: 'Mana Efficiency',
        description: 'All spells cost 10% less mana.',
        lore: '"The masters wasted nothing." — Covenant Training Manual',
    },
    void_sense: {
        id: 'void_sense', cost: 3,
        name: 'Void Sense',
        description: 'Aetheric Scent dissipates 25% faster.',
        lore: '"Learning to walk quietly through rift-threads is a discipline unto itself." — Vorgos, Fragment IV',
    },
    resonant_mind: {
        id: 'resonant_mind', cost: 4,
        name: 'Resonant Mind',
        description: 'Spell discovery resonance thresholds reduced by 15%.',
        lore: '"The scholars who read the most discovered spells fastest." — Archive, Index VII',
    },
};

export const SKILL_TYPE = {
    AOE: 'aoe',
    INFIGHT: 'infight',
    CRIT: 'crit',
    SUBTLE: 'subtle',
    NORMAL_ATTACK: 'normalattack'
};

export const SKILL_CATEGORY = {
    ACTIVE: 'active',
    PASSIVE: 'passive'
};

// XP needed to go from `level` to the next one. Polynomial, not exponential:
// the old ×1.5-per-level curve needed ~660k XP for level 21 against enemies
// worth ~28 XP. This puts level 10 at ~12k and level 20 at ~63k total.
export function xpForLevel(level) {
    return Math.round(100 * Math.pow(level, 1.5));
}

export class PlayerStats {
    _equipListeners = [];

    onEquipChange(cb) { this._equipListeners.push(cb); }
    offEquipChange(cb) { this._equipListeners = this._equipListeners.filter(f => f !== cb); }
    _notifyEquipChange(slot, itemId) { for (const cb of this._equipListeners) cb(slot, itemId); }

    constructor() {
        this.level = 1;
        this.xp = 0;
        this.xpToNextLevel = 100;

        this.attributes = {
            strength:     5,
            intelligence: 5,
            stamina:      5,
            agility:      5,
        };

        // Derived from attributes — STA drives HP, INT drives mana
        this.maxHealth = 60 + this.attributes.stamina      * 8;   // base 100
        this.maxMana   = 10 + this.attributes.intelligence * 8;   // base 50
        this.health    = this.maxHealth;
        this.mana      = this.maxMana;

        this.glint = 0;
        this.gold  = 50;

        // Points earned on level-up: skillPoints for skill tree, attributePoints for STR/INT/STA/AGI
        this.attributePoints = 0;

        // Satchel tier (1–4) determines inventory capacity
        this.satchelTier = 1;

        // Equipment slots
        this.equipment = { head: null, body: null, weapon: null, offHand: null, accessory1: null, accessory2: null };
        this.moveSlots = { attack: null, second: null };   // Combat C1: null = the default move
        this.mastery = { weapons: {}, elements: {} };   // Combat C2: points, grown by use
        this.talents = {};                                 // set from the character (data/talents.js)
        this._masteryCallbacks = [];
        this.styles = emptyStyles();                       // Combat C3: learning bars, manuals, lessons
        this.skillCooldowns = {};                          // style skill id → ms left (never saved)
        this._styleCallbacks = [];

        this.skills = {
            'basic_strike': {
                id: 'basic_strike',
                name: 'Basic Strike',
                type: SKILL_TYPE.NORMAL_ATTACK,
                category: SKILL_CATEGORY.ACTIVE,
                level: 1,
                maxLevel: 5,
                description: 'A simple melee attack.',
                requirements: null
            },
            'power_slash': {
                id: 'power_slash',
                name: 'Power Slash',
                type: SKILL_TYPE.INFIGHT,
                category: SKILL_CATEGORY.ACTIVE,
                level: 0,
                maxLevel: 5,
                description: 'Deals heavy damage to a single target.',
                requirements: { level: 2, strength: 10 }
            },
            'keen_eye': {
                id: 'keen_eye',
                name: 'Keen Eye',
                type: SKILL_TYPE.CRIT,
                category: SKILL_CATEGORY.PASSIVE,
                level: 0,
                maxLevel: 5,
                description: 'Increases critical hit chance.',
                requirements: { agility: 8 }
            },
            'arcane_ward': {
                id: 'arcane_ward',
                name: 'Arcane Ward',
                type: SKILL_TYPE.SUBTLE,
                category: SKILL_CATEGORY.PASSIVE,
                level: 0,
                maxLevel: 3,
                description: 'Reduces damage taken by 10% per level.',
                requirements: { level: 2, intelligence: 8 }
            },
            'blink_step': {
                id: 'blink_step',
                name: 'Blink-Step',
                type: SKILL_TYPE.INFIGHT,
                category: SKILL_CATEGORY.ACTIVE,
                level: 0,
                maxLevel: 3,
                description: 'Aether dash in facing direction. 8 MP. [H]',
                requirements: { level: 3, agility: 8, resonance: { arcane: 3 } }
            },
            'mana_shield': {
                id: 'mana_shield',
                name: 'Mana-Shield',
                type: SKILL_TYPE.SUBTLE,
                category: SKILL_CATEGORY.PASSIVE,
                level: 0,
                maxLevel: 3,
                description: 'Absorbs 30/50/70% of incoming damage using mana.',
                requirements: { level: 2, intelligence: 8, resonance: { arcane: 5 } }
            },
            'aetheric_sight': {
                id: 'aetheric_sight',
                name: 'Aetheric Sight',
                type: SKILL_TYPE.SUBTLE,
                category: SKILL_CATEGORY.ACTIVE,
                level: 0,
                maxLevel: 3,
                description: 'Slow enemies for 2/3/4s. Reveals detection ranges. [V]',
                requirements: { level: 4, intelligence: 12, resonance: { arcane: 8 } }
            },
            'shadow_step': {
                id: 'shadow_step',
                name: 'Shadow Step',
                type: SKILL_TYPE.SUBTLE,
                category: SKILL_CATEGORY.PASSIVE,
                level: 0,
                maxLevel: 3,
                description: 'Shadow Veil lasts +1s/lv, costs 10% less MP/lv.',
                requirements: { resonance: { shadow: 10 } }
            },
            'arcane_mastery': {
                id: 'arcane_mastery',
                name: 'Arcane Mastery',
                type: SKILL_TYPE.SUBTLE,
                category: SKILL_CATEGORY.PASSIVE,
                level: 0,
                maxLevel: 3,
                description: '+10% spell damage per level.',
                requirements: { resonance: { arcane: 15 } }
            }
        };

        // Elemental resonance — fills through lived experience, not XP
        this.resonance = Object.fromEntries(RESONANCE_ELEMENTS.map(e => [e, 0]));

        // Spellbook — id → level (0 = undiscovered, 1-3 = tier)
        this.spells = Object.fromEntries(Object.keys(SPELLS).map(id => [id, 0]));

        // Per-spell cooldown tracking (ms remaining)
        this.spellCooldowns = Object.fromEntries(Object.keys(SPELLS).map(id => [id, 0]));

        // Resonance event listeners
        this._resonanceCallbacks = [];

        // Skill bar slots — 4 mappable spell slots (Q/R/F/T)
        this.skillSlots = [null, null, null, null];
        // Consumable item ids on keys 1–4 (systems/hotbar.js)
        this.hotbar = [null, null, null, null];

        this.skillPoints = 0;

        // Resonance Insights — earned via quests and lore discovery; spent on masteries
        this.resonanceInsights = 0;
        this.masteries = Object.fromEntries(Object.keys(MASTERY_DEFS).map(k => [k, false]));

        // Inventory: array of { id, name, description, color, qty, stackable }
        this.inventory = [];

        // Every item ID ever obtained — drives recipe discovery
        this.seenItems = new Set();
        // Contents of every chest the player has opened, by "mapId:x,y" — chests
        // are small stores you can take from and put into, and must not refill
        // on reload.
        this.chestContents = {};
        // Enchantments applied at the forge, by weapon id; they replace the
        // weapon's own (pre-rolled) enchantment.
        this.weaponEnchants = {};
        // Crafts made of each kind → craft rank (data/stations.js)
        this.craftCounts = { cooking: 0, alchemy: 0 };
        // Scroll-locked recipes learned (data/recipeScrolls.js)
        this.knownRecipes = [];
        // Forge upgrade level per item id, 1–3 (data/upgrades.js)
        this.gearUpgrades = {};
        // Quests: dialogue flags, generated (bounty) quest definitions, bounty board state
        this.flags           = {};
        this.generatedQuests = {};
        this.bounties        = {};
        // Game clock (systems/gameClock.js): total game minutes, starting at 08:00 on day 0
        this.gameMinutes     = 480;
        // Vigor (W1, systems/movementRules.js): spent by sprinting and hopping, refills
        // in seconds. Not saved — a load starts full. Not the Stamina attribute.
        this.vigor        = vigorMax(this.attributes.agility);
        this.vigorWinded  = false;
        this._vigorIdleMs = 0;
        // Interiors (W3, systems/interiors.js): where each door you went through
        // leads back to, innermost last. Cleared on any outdoor map.
        this.interiorReturn = [];
        // Where the player is (kept fresh by GameScene) and where they rise after
        // death (last campfire / rift-gate) — see systems/respawn.js.
        this.location     = null;
        this.respawnPoint = null;
        // Harvested-node timers and defeated bosses, per map (systems/WorldState.js)
        this.worldState   = {};
        this.seenEnemyTypes = [];   // creatures met (bestiary shows them as "???" until killed)
        this.killCounts     = {};   // kills per creature type (bestiary)

        // Attuned Rift-Gates — enables fast-travel between them
        this.attunedGates = [];

        // Explored map chunks — 4×4 tile cells, key format "cx_cy"
        this.exploredChunks = [];

        // W5: fog of war per map ({ mapId: base64 bitset, one bit per 4×4 tiles }),
        // regions charted (chart items), landmarks discovered
        this.explored   = {};
        this.charted    = {};
        this.discovered = {};

        // Quest log: { questId: { status: 'active'|'completed', progress: { stepId: n } } }
        this.questLog          = {};
        // Campaign progress: { id, chapter, completed: [] } or null — see
        // CampaignManager, which owns writing to this. One campaign at a
        // time; a second in-progress campaign would need its own field.
        this.campaign = null;
        // Archive of Souls: [{ id, title, text, timestamp }]
        this.recoveredMemories = [];

        // Codex — Scholar's Eye echo discoveries
        this.codexEchoes = [];
        // Bestiary — enemy types encountered (array of type-id strings)
        this.killedEnemyTypes = [];

        // Resonance change listeners
        this._resonanceGainCallbacks = [];

        // ManaScent (0–100): spikes on spell use, decays over time — drives enemy Ping AI
        this.manaScent = 0;

        // Mana exhaustion state
        this.manaExhausted  = false;   // true at 0 mana
        this.manaCollapsed  = false;   // true after prolonged exhaustion
        this._exhaustionTimer = 0;     // ms spent at 0 mana before collapse
        this.COLLAPSE_THRESHOLD = 6000; // 6s at 0 mana → collapse

        // Fractional mana regen accumulator
        this._manaRegenAcc = 0;
    }

    // Tick mana regen + ManaScent decay + exhaustion — call every frame with delta (ms)
    tickMana(delta) {
        const hpFraction  = Math.max(0.08, this.health / this.maxHealth);
        const baseRegen   = 1 + this.attributes.intelligence * 0.15;
        const natureMult  = ITEMS[this.equipment.weapon]?.passive === 'nature_bond' ? 1.5 : 1;
        const boostMult   = (this._manaRegenBoost ?? 0) > 0 ? 3 : 1;
        if ((this._manaRegenBoost ?? 0) > 0) this._manaRegenBoost = Math.max(0, this._manaRegenBoost - delta);
        const regenRate   = baseRegen * hpFraction * (this.manaCollapsed ? 0.4 : 1) * natureMult * boostMult;
        this._manaRegenAcc += regenRate * delta / 1000;
        if (this._manaRegenAcc >= 1) {
            const gain = Math.floor(this._manaRegenAcc);
            this._manaRegenAcc -= gain;
            this.mana = Math.min(this.maxMana, this.mana + gain);
        }

        // Exhaustion state transitions
        if (this.mana === 0) {
            this.manaExhausted = true;
            if (!this.manaCollapsed) {
                this._exhaustionTimer += delta;
                if (this._exhaustionTimer >= this.COLLAPSE_THRESHOLD) {
                    this.manaCollapsed = true;
                }
            }
        } else if (this.manaExhausted && this.mana >= this.maxMana * 0.20) {
            // Clear exhaustion once mana recovers to 20%
            this.manaExhausted   = false;
            this.manaCollapsed   = false;
            this._exhaustionTimer = 0;
        }

        // Scent decay: -12/sec (void_sense mastery: -25% faster = -15/sec)
        const scentDecay = this.masteries?.void_sense ? 15 : 12;
        this.manaScent = Math.max(0, this.manaScent - scentDecay * delta / 1000);
    }

    // Spike ManaScent on spell cast (amount proportional to mana cost)
    addManaScent(amount) {
        this.manaScent = Math.min(100, this.manaScent + amount);
    }

    // Active weapon type derived from equipped weapon item
    get activeWeaponType() {
        const weaponId = this.equipment.weapon;
        if (!weaponId) return 'staff';
        return ITEMS[weaponId]?.weaponType ?? 'staff';
    }

    get maxVigor() { return vigorMax(this.attributes.agility); }

    // Fatigue fraction 0→1 based on mana level (for speed/power scaling)
    get fatigueFraction() {
        if (this.manaCollapsed) return 1;
        if (this.manaExhausted) return 0.85;
        const pct = this.mana / this.maxMana;
        return pct < 0.20 ? (0.20 - pct) / 0.20 * 0.5 : 0; // 0–50% fatigue in the low-mana zone
    }

    gainXp(amount) {
        this.xp += amount;
        while (this.xp >= this.xpToNextLevel) {
            this.xp -= this.xpToNextLevel;
            this._levelUp();
        }
    }

    _levelUp() {
        this.level++;
        this.xpToNextLevel = xpForLevel(this.level);
        this.skillPoints++;
        this.attributePoints++;
        // Full restore on level-up (stat gains applied when player distributes points)
        this.health = this.maxHealth;
        this.mana   = this.maxMana;
    }

    // Spend one attribute point on a stat — updates derived max values immediately
    distributePoint(attr) {
        if (this.attributePoints <= 0) return false;
        if (!(attr in this.attributes)) return false;
        this.attributes[attr]++;
        this.attributePoints--;
        if (attr === 'stamina')      { this.maxHealth += 8; this.health += 8; }
        if (attr === 'intelligence') { this.maxMana   += 8; this.mana   += 8; }
        return true;
    }

    canUnlock(skillId) {
        const skill = this.skills[skillId];
        if (!skill || skill.level >= skill.maxLevel) return false;
        if (!skill.requirements) return true;

        const r = skill.requirements;
        if (r.level        && this.level                    < r.level)        return false;
        if (r.strength     && this.attributes.strength      < r.strength)     return false;
        if (r.intelligence && this.attributes.intelligence  < r.intelligence) return false;
        if (r.stamina      && this.attributes.stamina       < r.stamina)      return false;
        if (r.agility      && this.attributes.agility       < r.agility)      return false;
        if (r.resonance) {
            for (const [el, val] of Object.entries(r.resonance)) {
                if (this.elementLevel(el) < unlockLevel(val)) return false;   // C2: element mastery
            }
        }
        return true;
    }

    upgradeSkill(skillId) {
        if (this.skillPoints <= 0 || !this.canUnlock(skillId)) return false;
        this.skills[skillId].level++;
        this.skillPoints--;
        return true;
    }

    // Skill slot management — a slot holds a spell or a style skill (C3)
    assignSkillSlot(index, spellId) {
        if (index < 0 || index > 3) return false;
        if (spellId !== null && STYLE_SKILLS[spellId]) {
            if (!['ready', 'weapon'].includes(this.styleSkillState(spellId))) return false;
        } else if (spellId !== null && this.getSpellLevel(spellId) === 0) return false;
        for (let i = 0; i < 4; i++) {
            if (this.skillSlots[i] === spellId) this.skillSlots[i] = null;
        }
        this.skillSlots[index] = spellId;
        return true;
    }

    getSlotSpell(index) { return this.skillSlots[index] ?? null; }

    getSpellSlotIndex(spellId) {
        return this.skillSlots.indexOf(spellId); // -1 if not assigned
    }

    // Register a callback: fn(spellId, newLevel, isDiscovery)
    onSpellEvent(fn)  { this._resonanceCallbacks.push(fn); }
    offSpellEvent(fn) { this._resonanceCallbacks = this._resonanceCallbacks.filter(f => f !== fn); }

    // Register a callback: fn(element, newValue)
    onResonanceGain(fn)  { this._resonanceGainCallbacks.push(fn); }
    offResonanceGain(fn) { this._resonanceGainCallbacks = this._resonanceGainCallbacks.filter(f => f !== fn); }

    gainResonance(element, amount) {
        if (!(element in this.resonance)) return;
        this.resonance[element] = Math.min(999, this.resonance[element] + amount);
        this.gainElementPoints(element, amount, { passive: true });   // C2: the feel for an element, capped at level 2
        this._resonanceGainCallbacks?.forEach(fn => fn(element, this.resonance[element]));
    }

    // Spells of an element unlock with its mastery level (mastery.js tierAt).
    // Never lowers a tier a spell already has.
    _checkSpellProgress(element) {
        const lv = this.elementLevel(element);
        for (const [id, spell] of Object.entries(SPELLS)) {
            if (spell.element !== element || !spell.discoverCondition) continue;
            const current = this.spells[id] ?? 0;
            const newLevel = Math.min(3, tierAt(spell, lv));
            if (newLevel > current) {
                this.spells[id] = newLevel;
                this._resonanceCallbacks.forEach(fn => fn(id, newLevel, current === 0));
            }
        }
    }

    getSpellLevel(id) { return this.spells[id] ?? 0; }

    // Grants a spell outright, bypassing the resonance-threshold discovery
    // system — used only by CampaignManager to deliver the bible's unlock
    // ladder. Never lowers an existing (higher) tier.
    forceUnlockSpell(id, tier = 1) {
        if (!(id in this.spells)) return false;
        this.spells[id] = Math.max(this.spells[id], tier);
        return true;
    }

    // Grants a skill level outright, bypassing skillPoints — same purpose
    // as forceUnlockSpell, for the skill tree instead of the spellbook.
    forceUnlockSkill(id) {
        if (!this.skills[id]) return false;
        if (this.skills[id].level < 1) this.skills[id].level = 1;
        return true;
    }

    tickSpellCooldowns(delta) {
        for (const id of Object.keys(this.spellCooldowns)) {
            if (this.spellCooldowns[id] > 0) this.spellCooldowns[id] = Math.max(0, this.spellCooldowns[id] - delta);
        }
    }

    canCastSpell(id) {
        if (!this.spells[id]) return false;
        return this.spellCooldowns[id] <= 0;
    }

    startSpellCooldown(id) {
        const spell = SPELLS[id];
        if (!spell) return;
        const tier = Math.max(0, this.spells[id] - 1);
        const focus = this.focusType();
        const f = focusBonus(focus, focus ? this.weaponLevel(focus) : 1);   // C2: a wand quickens, a staff slows
        this.spellCooldowns[id] = Math.round((spell.cooldown?.[tier] ?? 2000) * f.cooldown);
    }

    trackKill(enemyType) {
        if (!this.killedEnemyTypes.includes(enemyType)) {
            this.killedEnemyTypes.push(enemyType);
        }
        this.killCounts[enemyType] = (this.killCounts[enemyType] ?? 0) + 1;
    }

    gainResonanceInsight(amount = 1) {
        this.resonanceInsights = (this.resonanceInsights ?? 0) + amount;
    }

    unlockMastery(id) {
        const def = MASTERY_DEFS[id];
        if (!def || this.masteries[id]) return false;
        if ((this.resonanceInsights ?? 0) < def.cost) return false;
        this.resonanceInsights -= def.cost;
        this.masteries[id] = true;
        return true;
    }

    getSpellManaCost(id) {
        const spell = SPELLS[id];
        if (!spell) return 0;
        const tier = Math.max(0, this.spells[id] - 1);
        const base = spell.manaCost?.[tier] ?? 0;
        const disc = this.masteries?.mana_efficiency ? Math.floor(base * 0.10) : 0;
        return Math.max(1, base - disc);
    }

    getSatchelCapacity() {
        return SATCHEL_TIERS[(this.satchelTier ?? 1) - 1]?.slots ?? 10;
    }

    addItem(itemId, qty = 1) {
        const def = ITEMS[itemId];
        if (!def) return false;

        this.seenItems.add(itemId);

        if (def.stackable) {
            const existing = this.inventory.find(i => i.id === itemId);
            if (existing) { existing.qty += qty; return true; }
        }
        if (this.inventory.length >= this.getSatchelCapacity()) return false;
        this.inventory.push({
            id:          itemId,
            name:        def.name,
            description: def.description,
            color:       def.color ?? 0x8855ff,
            stackable:   def.stackable,
            slot:        def.slot ?? null,
            tier:        def.tier ?? null,
            qty
        });
        return true;
    }

    // Equip an item from inventory. Weapons go to a hand (Combat C1): the main hand
    // by default, the off hand on request; two-handers and shields follow
    // weapons.js equipPlan, and whatever they displace returns to the satchel.
    equipItem(itemId, hand = 'main') {
        const def = ITEMS[itemId];
        if (!def?.slot) return false;
        const idx = this.inventory.findIndex(i => i.id === itemId);
        if (idx < 0) return false;

        let eqSlot = def.slot;
        const clear = [];
        if (def.slot === 'weapon') {
            const plan = equipPlan(this.equipment, def, hand, ITEMS);
            eqSlot = plan.slot;
            clear.push(...plan.clear);
        } else if (eqSlot === 'accessory') {
            eqSlot = this.equipment.accessory1 === null ? 'accessory1' : 'accessory2';
        }
        if (!(eqSlot in this.equipment)) return false;

        // Everything that comes off must fit back in the satchel (the item being
        // equipped frees one slot); otherwise refuse — never hide an item.
        const back = [...new Set([...clear, eqSlot])].filter(slot => this.equipment[slot]).length;
        if (this.inventory.length - 1 + back > this.getSatchelCapacity()) return false;
        this.inventory.splice(idx, 1);
        for (const slot of [...clear, eqSlot]) {
            if (this.equipment[slot]) { this._returnEquippedToInventory(slot); this._notifyEquipChange(slot, null); }
        }
        this.equipment[eqSlot] = itemId;
        this._applyEquipStats(itemId);
        this._notifyEquipChange(eqSlot, itemId);
        return true;
    }

    // Remove equipped item from slot, return to inventory
    unequipItem(slot) {
        const itemId = this.equipment[slot];
        if (!itemId) return false;
        if (this.inventory.length >= this.getSatchelCapacity()) return false;
        this._unapplyEquipStats(itemId);
        this.equipment[slot] = null;
        const def = ITEMS[itemId];
        this.inventory.push({
            id: itemId, name: def.name, description: def.description,
            color: def.color ?? 0x8855ff, stackable: false, slot: def.slot ?? null,
            tier: def.tier ?? null, qty: 1
        });
        this._notifyEquipChange(slot, null);
        return true;
    }

    // Combat C1: the two action buttons
    availableMoves() { return movesFor(this.equipment, ITEMS); }
    resolvedMoves()  { return resolveMoves(this.moveSlots, this.equipment, ITEMS); }
    setMoveSlot(button, moveId) {
        if (!(button in this.moveSlots)) return false;
        if (moveId !== null && !this.availableMoves().some(m => m.id === moveId)) return false;
        this.moveSlots[button] = moveId;
        return true;
    }
    // A new game's weapons (data/characters.js startKit)
    giveStartKit(kit = {}) {
        for (const [slot, hand] of [['weapon', 'main'], ['offHand', 'off']]) {
            const id = kit?.[slot];
            if (!id || !ITEMS[id]) continue;
            this.addItem(id, 1);
            this.equipItem(id, hand);
        }
        for (const id of kit?.spells ?? []) this.forceUnlockSpell(id, 1);
    }

    // ── Combat C2: mastery ───────────────────────────────────────────────────
    setTalents(t) { this.talents = t ?? {}; }
    ceilingFor(key) { return ceilingOf(this.talents, key); }
    // never above the ceiling, even with points saved under another character's talents
    weaponLevel(type)  { return Math.min(levelOf(this.mastery.weapons[type] ?? 0), this.ceilingFor(type)); }
    elementLevel(el)   { return Math.min(levelOf(this.mastery.elements[el] ?? 0), this.ceilingFor(FAMILY(el))); }
    focusType() { return focusOf(this.equipment, ITEMS); }
    onMasteryUp(fn)  { this._masteryCallbacks.push(fn); }
    offMasteryUp(fn) { this._masteryCallbacks = this._masteryCallbacks.filter(f => f !== fn); }
    gainWeaponPoints(type, gain) {
        const before = this.weaponLevel(type);
        this.mastery.weapons[type] = addPoints(this.mastery.weapons[type] ?? 0, gain, this.ceilingFor(type));
        const after = this.weaponLevel(type);
        if (after > before) this._masteryCallbacks.forEach(fn => fn('weapon', type, after));
        return after;
    }
    // A hit with a weapon teaches the weapon; a kill also practises its style (C3).
    learnFromHit(type, killed, enemyLevel = 1) {
        const g = hitGain(killed, enemyLevel, this.level);
        this.gainWeaponPoints(type, g);
        if (!killed) return;
        const id = practising(this.styles, type);
        if (id && practiceGain(this.styles, id, g)) this._styleCallbacks.forEach(fn => fn(id));
    }

    // ── Combat C3: styles ────────────────────────────────────────────────────
    onStyleEvent(fn)  { this._styleCallbacks.push(fn); }
    offStyleEvent(fn) { this._styleCallbacks = this._styleCallbacks.filter(f => f !== fn); }
    knowsStyle(id) { return (this.styles.progress[id] ?? 0) >= 100; }
    // Reading a manual: +40%, practice counts double. False if read or known already.
    readStyleManual(id) {
        if (!readManual(this.styles, id)) return false;
        if (this.knowsStyle(id)) this._styleCallbacks.forEach(fn => fn(id));
        return true;
    }
    // A finished bar from a lesson or anything else outside practice
    announceStyle(id) { if (this.knowsStyle(id)) this._styleCallbacks.forEach(fn => fn(id)); }
    styleSkillState(skillId) {
        const k = STYLE_SKILLS[skillId];
        if (!k) return 'style';
        return skillState(this.styles, skillId, this.weaponLevel(k.weapon), handTypes(this.equipment, ITEMS).has(k.weapon));
    }
    skillReady(id) { return this.styleSkillState(id) === 'ready' && !(this.skillCooldowns[id] > 0); }
    startSkillCooldown(id) { if (STYLE_SKILLS[id]) this.skillCooldowns[id] = STYLE_SKILLS[id].cd; }
    tickSkillCooldowns(delta) {
        for (const id of Object.keys(this.skillCooldowns)) this.skillCooldowns[id] = Math.max(0, this.skillCooldowns[id] - delta);
    }

    gainElementPoints(el, gain, { passive = false } = {}) {
        if (!(el in this.resonance)) return 1;
        const before = this.elementLevel(el);
        const g = this.masteries?.resonant_mind ? gain * 1.15 : gain;   // the Resonant Mind mastery
        this.mastery.elements[el] = addPoints(this.mastery.elements[el] ?? 0, g, this.ceilingFor(FAMILY(el)), { passive });
        const after = this.elementLevel(el);
        if (after > before) this._masteryCallbacks.forEach(fn => fn('element', el, after));
        this._checkSpellProgress(el);
        return after;
    }

    _returnEquippedToInventory(slot) {
        const itemId = this.equipment[slot];
        if (!itemId) return;
        this._unapplyEquipStats(itemId);
        this.equipment[slot] = null;
        const def = ITEMS[itemId];
        this.inventory.push({
            id: itemId, name: def.name, description: def.description,
            color: def.color ?? 0x8855ff, stackable: false, slot: def.slot ?? null,
            tier: def.tier ?? null, qty: 1
        });
    }

    upgradeLevel(itemId) { return this.gearUpgrades?.[itemId] ?? 0; }

    // Forge upgrade of the item in an equipment slot: the stats come off at the
    // old level and go back on at the new one, so nothing drifts.
    upgradeEquipped(slot) {
        const id = this.equipment[slot];
        if (!id) return { ok: false, reason: 'empty' };
        const level = this.upgradeLevel(id);
        if (level >= UPGRADE_MAX) return { ok: false, reason: 'max' };
        const cost = upgradeCost(ITEMS[id], level + 1);
        if (!cost.every(c => this.countItem(c.id) >= c.qty)) return { ok: false, reason: 'materials' };
        cost.forEach(c => this.consumeItem(c.id, c.qty));
        // Upgrades are per item id: every worn copy (two identical rings) moves together.
        const worn = Object.values(this.equipment).filter(e => e === id).length;
        for (let i = 0; i < worn; i++) this._unapplyEquipStats(id);
        this.gearUpgrades ??= {};
        this.gearUpgrades[id] = level + 1;
        for (let i = 0; i < worn; i++) this._applyEquipStats(id);
        return { ok: true, level: level + 1 };
    }

    // Equipment stats include the item's forge upgrade (data/upgrades.js)
    _applyEquipStats(itemId) {
        const def = ITEMS[itemId];
        if (!def?.stats) return;
        for (const [stat, val] of Object.entries(upgradedStats(def, this.upgradeLevel(itemId)))) {
            if (!(stat in this.attributes)) continue;
            this.attributes[stat] += val;
            if (stat === 'stamina')      { this.maxHealth += val * 8; this.health = Math.min(this.health + val * 8, this.maxHealth); }
            if (stat === 'intelligence') { this.maxMana   += val * 8; this.mana   = Math.min(this.mana   + val * 8, this.maxMana);   }
        }
    }

    _unapplyEquipStats(itemId) {
        const def = ITEMS[itemId];
        if (!def?.stats) return;
        for (const [stat, val] of Object.entries(upgradedStats(def, this.upgradeLevel(itemId)))) {
            if (!(stat in this.attributes)) continue;
            this.attributes[stat] -= val;
            if (stat === 'stamina')      { this.maxHealth = Math.max(1, this.maxHealth - val * 8); this.health = Math.min(this.health, this.maxHealth); }
            if (stat === 'intelligence') { this.maxMana   = Math.max(1, this.maxMana   - val * 8); this.mana   = Math.min(this.mana,   this.maxMana);   }
        }
    }

    // Called by potion onUse callbacks that need status system access
    _clearStatus(id)              { this._statusClearQueue  = this._statusClearQueue  ?? []; this._statusClearQueue.push(id); }
    _applyStatus(id, opts = {})   { this._statusApplyQueue  = this._statusApplyQueue  ?? []; this._statusApplyQueue.push({ id, opts }); }

    useItem(itemId) {
        const def = ITEMS[itemId];
        if (!def) return false;
        // Slotted items (weapons, armor) are equipped via [E], not consumed via [U]
        if (def.slot) return false;

        const idx = this.inventory.findIndex(i => i.id === itemId);
        if (idx < 0) return false;

        const success = def.onUse(this);
        if (!success) return false;

        const slot = this.inventory[idx];
        slot.qty--;
        if (slot.qty <= 0) this.inventory.splice(idx, 1);
        return true;
    }

    // Temporary max-HP bonus from food and tonics. Only the strongest active
    // bonus applies (eating more never stacks), it wears off after `ms`, and
    // it is never written to the save (SaveManager stores maxHealth without it).
    addTempMaxHealth(amount, ms) {
        const current = this._tempMaxHp ?? 0;
        if (amount > current) {
            this.maxHealth += amount - current;
            this.health    += amount - current;
            this._tempMaxHp = amount;
        }
        this._tempMaxHpTimer = Math.max(this._tempMaxHpTimer ?? 0, ms);
    }

    tickTempMaxHealth(delta) {
        if (!(this._tempMaxHpTimer > 0)) return;
        this._tempMaxHpTimer -= delta;
        if (this._tempMaxHpTimer <= 0) {
            this.maxHealth -= this._tempMaxHp ?? 0;
            this.health     = Math.min(this.health, this.maxHealth);
            this._tempMaxHp = 0;
            this._tempMaxHpTimer = 0;
        }
    }

    // Stack-aware inventory queries. Stackable items live in one slot with a
    // qty, so a count is the sum of quantities, not the number of slots.
    // The equipped weapon's enchantment: one applied at the forge, else its own.
    activeEnchant(w = this.equipment.weapon) {   // Combat C1: the hand that swung
        if (!w) return null;
        return this.weaponEnchants?.[w] ?? ITEMS[w]?.enchant ?? null;
    }

    // Reading a recipe scroll. False (scroll kept) when the recipe is already known.
    learnRecipe(output) {
        this.knownRecipes ??= [];
        if (this.knownRecipes.includes(output)) return false;
        this.knownRecipes.push(output);
        return true;
    }

    countItem(itemId) {
        return this.inventory.reduce((n, i) => n + (i.id === itemId ? (i.qty ?? 1) : 0), 0);
    }

    // Removes `qty` units of an item across its slots. Returns false (and
    // removes nothing) when there aren't enough.
    consumeItem(itemId, qty = 1) {
        if (this.countItem(itemId) < qty) return false;
        let left = qty;
        for (let i = this.inventory.length - 1; i >= 0 && left > 0; i--) {
            const slot = this.inventory[i];
            if (slot.id !== itemId) continue;
            const take = Math.min(slot.qty ?? 1, left);
            slot.qty = (slot.qty ?? 1) - take;
            left -= take;
            if (slot.qty <= 0) this.inventory.splice(i, 1);
        }
        return true;
    }

    removeItem(itemId, qty = 1) {
        const idx = this.inventory.findIndex(i => i.id === itemId);
        if (idx < 0) return;
        this.inventory[idx].qty -= qty;
        if (this.inventory[idx].qty <= 0) this.inventory.splice(idx, 1);
    }

    reset() {
        this.level = 1;
        this.xp = 0;
        this.xpToNextLevel = 100;
        this.glint = 0;
        this.gold  = 50;          // a new game starts with the starting purse, not the last character's
        this.skillPoints = 0;
        this.attributePoints = 0;
        this.satchelTier = 1;
        this.equipment = { head: null, body: null, weapon: null, offHand: null, accessory1: null, accessory2: null };
        this.moveSlots = { attack: null, second: null };   // Combat C1: null = the default move
        this.mastery = { weapons: {}, elements: {} };   // Combat C2: points, grown by use
        this.styles = emptyStyles();                     // Combat C3
        this.skillCooldowns = {};
        this.inventory = [];
        this.attributes  = { strength: 5, intelligence: 5, stamina: 5, agility: 5 };
        this.maxHealth   = 60 + this.attributes.stamina      * 8;
        this.maxMana     = 10 + this.attributes.intelligence * 8;
        this.health      = this.maxHealth;
        this.mana        = this.maxMana;
        Object.values(this.skills).forEach(s => { s.level = s.id === 'basic_strike' ? 1 : 0; });
        RESONANCE_ELEMENTS.forEach(e => { this.resonance[e] = 0; });
        Object.keys(SPELLS).forEach(id => { this.spells[id] = 0; this.spellCooldowns[id] = 0; });
        this.skillSlots = [null, null, null, null];
        this.hotbar     = [null, null, null, null];
        this.attunedGates      = [];
        this.exploredChunks    = [];
        this.explored          = {};
        this.charted           = {};
        this.discovered        = {};
        this.questLog          = {};
        this.campaign          = null;
        this.recoveredMemories = [];
        this.manaScent        = 0;
        this.manaExhausted    = false;
        this.manaCollapsed    = false;
        this._exhaustionTimer = 0;
        this._manaRegenAcc    = 0;
        this.resonanceInsights = 0;
        this.masteries = Object.fromEntries(Object.keys(MASTERY_DEFS).map(k => [k, false]));
        this.codexEchoes      = [];
        this.killedEnemyTypes = [];
        this.seenItems        = new Set();   // recipe discovery restarts with the character
        this._tempMaxHp       = 0;
        this._tempMaxHpTimer  = 0;
        this.chestContents    = {};
        this.weaponEnchants   = {};
        this.craftCounts      = { cooking: 0, alchemy: 0 };
        this.knownRecipes     = [];
        this.gearUpgrades     = {};
        this.flags            = {};
        this.generatedQuests  = {};
        this.bounties         = {};
        this.gameMinutes      = 480;
        this.vigor            = vigorMax(this.attributes.agility);
        this.vigorWinded      = false;
        this._vigorIdleMs     = 0;
        this.interiorReturn   = [];
        this.location         = null;
        this.respawnPoint     = null;
        this.worldState       = {};
        this.seenEnemyTypes   = [];
        this.killCounts       = {};
    }
}

export const playerStats = new PlayerStats();
