import { ITEMS, SATCHEL_TIERS } from '../data/items.js';
import { SPELLS, RESONANCE_ELEMENTS } from '../data/spells.js';

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

export class PlayerStats {
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

        // Points earned on level-up: skillPoints for skill tree, attributePoints for STR/INT/STA/AGI
        this.attributePoints = 0;

        // Satchel tier (1–4) determines inventory capacity
        this.satchelTier = 1;

        // Equipment slots
        this.equipment = { head: null, body: null, weapon: null, accessory1: null, accessory2: null };

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
                description: 'Aether dash in facing direction. 8 MP. [SPACE]',
                requirements: { level: 3, agility: 8 }
            },
            'mana_shield': {
                id: 'mana_shield',
                name: 'Mana-Shield',
                type: SKILL_TYPE.SUBTLE,
                category: SKILL_CATEGORY.PASSIVE,
                level: 0,
                maxLevel: 3,
                description: 'Absorbs 30/50/70% of incoming damage using mana.',
                requirements: { level: 2, intelligence: 8 }
            },
            'aetheric_sight': {
                id: 'aetheric_sight',
                name: 'Aetheric Sight',
                type: SKILL_TYPE.SUBTLE,
                category: SKILL_CATEGORY.ACTIVE,
                level: 0,
                maxLevel: 3,
                description: 'Slow enemies for 2/3/4s. Reveals detection ranges. [V]',
                requirements: { level: 4, intelligence: 12 }
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

        this.skillPoints = 0;

        // Inventory: array of { id, name, description, color, qty, stackable }
        this.inventory = [];

        // Attuned Rift-Gates — enables fast-travel between them
        this.attunedGates = [];

        // Quest log: { questId: { status: 'active'|'completed', progress: { stepId: n } } }
        this.questLog = {};

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
        const regenRate   = baseRegen * hpFraction * (this.manaCollapsed ? 0.4 : 1) * natureMult;
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

        // Scent decay: -12/sec
        this.manaScent = Math.max(0, this.manaScent - 12 * delta / 1000);
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
        this.xpToNextLevel = Math.floor(this.xpToNextLevel * 1.5);
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
        if (r.level     && this.level                    < r.level)     return false;
        if (r.strength     && this.attributes.strength     < r.strength)     return false;
        if (r.intelligence && this.attributes.intelligence < r.intelligence) return false;
        if (r.stamina      && this.attributes.stamina      < r.stamina)      return false;
        if (r.agility      && this.attributes.agility      < r.agility)      return false;
        return true;
    }

    upgradeSkill(skillId) {
        if (this.skillPoints <= 0 || !this.canUnlock(skillId)) return false;
        this.skills[skillId].level++;
        this.skillPoints--;
        return true;
    }

    // Skill slot management
    assignSkillSlot(index, spellId) {
        if (index < 0 || index > 3) return false;
        if (spellId !== null && this.getSpellLevel(spellId) === 0) return false;
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
    onSpellEvent(fn) { this._resonanceCallbacks.push(fn); }

    // Register a callback: fn(element, newValue)
    onResonanceGain(fn) { this._resonanceGainCallbacks.push(fn); }

    gainResonance(element, amount) {
        if (!(element in this.resonance)) return;
        this.resonance[element] = Math.min(999, this.resonance[element] + amount);
        this._checkSpellProgress(element);
        this._resonanceGainCallbacks?.forEach(fn => fn(element, this.resonance[element]));
    }

    _checkSpellProgress(element) {
        for (const [id, spell] of Object.entries(SPELLS)) {
            if (spell.element !== element) continue;
            const current = this.spells[id];
            if (current >= 3) continue;

            const res = this.resonance[element];
            const thresholds = [spell.discoverCondition.threshold, ...(spell.masteryThresholds ?? [])];

            let newLevel = 0;
            for (const t of thresholds) { if (res >= t) newLevel++; }
            newLevel = Math.min(newLevel, 3);

            if (newLevel > current) {
                this.spells[id] = newLevel;
                const isDiscovery = current === 0;
                this._resonanceCallbacks.forEach(fn => fn(id, newLevel, isDiscovery));
            }
        }
    }

    getSpellLevel(id) { return this.spells[id] ?? 0; }

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
        this.spellCooldowns[id] = spell.cooldown?.[tier] ?? 2000;
    }

    getSpellManaCost(id) {
        const spell = SPELLS[id];
        if (!spell) return 0;
        const tier = Math.max(0, this.spells[id] - 1);
        return spell.manaCost?.[tier] ?? 0;
    }

    getSatchelCapacity() {
        return SATCHEL_TIERS[(this.satchelTier ?? 1) - 1]?.slots ?? 10;
    }

    addItem(itemId, qty = 1) {
        const def = ITEMS[itemId];
        if (!def) return false;

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

    // Equip an item from inventory to its equipment slot
    equipItem(itemId) {
        const def = ITEMS[itemId];
        if (!def?.slot) return false;
        const idx = this.inventory.findIndex(i => i.id === itemId);
        if (idx < 0) return false;

        // For accessories, use first free slot
        let eqSlot = def.slot;
        if (eqSlot === 'accessory') {
            eqSlot = this.equipment.accessory1 === null ? 'accessory1' : 'accessory2';
        }
        if (!(eqSlot in this.equipment)) return false;

        // Swap out current item in that slot back to inventory
        if (this.equipment[eqSlot]) this._returnEquippedToInventory(eqSlot);

        this.equipment[eqSlot] = itemId;
        this._applyEquipStats(itemId);
        this.inventory.splice(idx, 1);
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
        return true;
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

    _applyEquipStats(itemId) {
        const def = ITEMS[itemId];
        if (!def?.stats) return;
        for (const [stat, val] of Object.entries(def.stats)) {
            if (!(stat in this.attributes)) continue;
            this.attributes[stat] += val;
            if (stat === 'stamina')      { this.maxHealth += val * 8; this.health = Math.min(this.health + val * 8, this.maxHealth); }
            if (stat === 'intelligence') { this.maxMana   += val * 8; this.mana   = Math.min(this.mana   + val * 8, this.maxMana);   }
        }
    }

    _unapplyEquipStats(itemId) {
        const def = ITEMS[itemId];
        if (!def?.stats) return;
        for (const [stat, val] of Object.entries(def.stats)) {
            if (!(stat in this.attributes)) continue;
            this.attributes[stat] -= val;
            if (stat === 'stamina')      { this.maxHealth = Math.max(1, this.maxHealth - val * 8); this.health = Math.min(this.health, this.maxHealth); }
            if (stat === 'intelligence') { this.maxMana   = Math.max(1, this.maxMana   - val * 8); this.mana   = Math.min(this.mana,   this.maxMana);   }
        }
    }

    useItem(itemId) {
        const def = ITEMS[itemId];
        if (!def) return false;

        const idx = this.inventory.findIndex(i => i.id === itemId);
        if (idx < 0) return false;

        const success = def.onUse(this);
        if (!success) return false;

        const slot = this.inventory[idx];
        slot.qty--;
        if (slot.qty <= 0) this.inventory.splice(idx, 1);
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
        this.skillPoints = 0;
        this.attributePoints = 0;
        this.satchelTier = 1;
        this.equipment = { head: null, body: null, weapon: null, accessory1: null, accessory2: null };
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
        this.attunedGates     = [];
        this.questLog         = {};
        this.manaScent        = 0;
        this.manaExhausted    = false;
        this.manaCollapsed    = false;
        this._exhaustionTimer = 0;
        this._manaRegenAcc    = 0;
    }
}

export const playerStats = new PlayerStats();
