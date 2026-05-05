import { ITEMS } from '../data/items.js';

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

        this.health = 100;
        this.maxHealth = 100;
        this.mana = 50;
        this.maxMana = 50;

        this.gold = 0;

        this.attributes = {
            strength: 5,
            agility:  5,
            wisdom:   5
        };

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
            'fire_nova': {
                id: 'fire_nova',
                name: 'Fire Nova',
                type: SKILL_TYPE.AOE,
                category: SKILL_CATEGORY.ACTIVE,
                level: 0,
                maxLevel: 3,
                description: 'Explosion of fire around the player.',
                requirements: { level: 3, wisdom: 10 }
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
                requirements: { level: 2, wisdom: 8 }
            }
        };

        this.skillPoints = 0;

        // Inventory: array of { id, name, description, color, qty, stackable }
        this.inventory = [];
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
        this.maxHealth += 10;
        this.maxMana += 5;
        this.health = this.maxHealth;
        this.mana = this.maxMana;
        // Distribute a stat point automatically by class tendency
        this.attributes.strength++;
        this.attributes.wisdom++;
    }

    canUnlock(skillId) {
        const skill = this.skills[skillId];
        if (!skill || skill.level >= skill.maxLevel) return false;
        if (!skill.requirements) return true;

        const r = skill.requirements;
        if (r.level     && this.level                    < r.level)     return false;
        if (r.strength  && this.attributes.strength      < r.strength)  return false;
        if (r.wisdom    && this.attributes.wisdom         < r.wisdom)    return false;
        if (r.agility   && this.attributes.agility        < r.agility)   return false;
        return true;
    }

    upgradeSkill(skillId) {
        if (this.skillPoints <= 0 || !this.canUnlock(skillId)) return false;
        this.skills[skillId].level++;
        this.skillPoints--;
        return true;
    }

    addItem(itemId, qty = 1) {
        const def = ITEMS[itemId];
        if (!def) return;

        if (def.stackable) {
            const existing = this.inventory.find(i => i.id === itemId);
            if (existing) { existing.qty += qty; return; }
        }
        this.inventory.push({
            id:          itemId,
            name:        def.name,
            description: def.description,
            color:       def.color ?? 0x8855ff,
            stackable:   def.stackable,
            qty
        });
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
        this.health = 100;
        this.maxHealth = 100;
        this.mana = 50;
        this.maxMana = 50;
        this.gold = 0;
        this.skillPoints = 0;
        this.inventory = [];
        this.attributes = { strength: 5, agility: 5, wisdom: 5 };
        Object.values(this.skills).forEach(s => {
            s.level = s.id === 'basic_strike' ? 1 : 0;
        });
    }
}

export const playerStats = new PlayerStats();
