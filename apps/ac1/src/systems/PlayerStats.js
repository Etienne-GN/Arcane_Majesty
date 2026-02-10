// src/systems/PlayerStats.js

// Enum adaptations from your snippets
export const SKILL_TYPE = {
    AOE: 'aoe',
    INFIGHT: 'infight', // Melee?
    CRIT: 'crit',
    SUBTLE: 'subtle',   // Stealth?
    NORMAL_ATTACK: 'normalattack'
};

export const SKILL_CATEGORY = {
    ACTIVE: 'active',
    PASSIVE: 'passive'
};

export class PlayerStats {
    constructor() {
        // Base Stats
        this.level = 1;
        this.xp = 0;
        this.xpToNextLevel = 100;
        this.health = 100;
        this.maxHealth = 100;
        this.mana = 50;
        this.maxMana = 50;

        // Core Attributes (RPGs usually have these)
        this.attributes = {
            strength: 5,  // Affects Normal/Infight
            agility: 5,   // Affects Crit/Subtle
            wisdom: 5     // Affects AoE/Mana
        };

        // Skill Tree Data
        // Structure inspired by your snippets, adapted for JS
        this.skills = {
            'basic_strike': {
                id: 'basic_strike',
                name: 'Basic Strike',
                type: SKILL_TYPE.NORMAL_ATTACK,
                category: SKILL_CATEGORY.ACTIVE,
                level: 1,
                maxLevel: 5,
                description: 'A simple melee attack.',
                requirements: null // No requirements, starting skill
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
            }
        };

        this.skillPoints = 0;
    }

    gainXp(amount) {
        this.xp += amount;
        if (this.xp >= this.xpToNextLevel) {
            this.levelUp();
        }
    }

    levelUp() {
        this.level++;
        this.xp -= this.xpToNextLevel;
        this.xpToNextLevel = Math.floor(this.xpToNextLevel * 1.5);
        this.skillPoints++;
        
        // Auto-heal on level up
        this.health = this.maxHealth;
        this.mana = this.maxMana;
        
        console.log(`Level Up! You are now level ${this.level}. Skill Points: ${this.skillPoints}`);
    }

    canUnlock(skillId) {
        const skill = this.skills[skillId];
        if (!skill) return false;
        if (skill.level >= skill.maxLevel) return false;
        
        // Check requirements
        if (skill.requirements) {
            if (skill.requirements.level && this.level < skill.requirements.level) return false;
            if (skill.requirements.strength && this.attributes.strength < skill.requirements.strength) return false;
            if (skill.requirements.wisdom && this.attributes.wisdom < skill.requirements.wisdom) return false;
            if (skill.requirements.agility && this.attributes.agility < skill.requirements.agility) return false;
        }

        return true;
    }

    upgradeSkill(skillId) {
        if (this.skillPoints <= 0) return false;
        if (!this.canUnlock(skillId)) return false;

        this.skills[skillId].level++;
        this.skillPoints--;
        return true;
    }
}

// Export a singleton instance so state persists across scenes
export const playerStats = new PlayerStats();
