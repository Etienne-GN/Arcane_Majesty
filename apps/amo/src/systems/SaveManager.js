function saveKey(storyId, characterId) {
    return `amo_save_${storyId}_${characterId}`;
}

export class SaveManager {
    static save(stats, storyId, characterId) {
        const data = {
            storyId,
            characterId,
            level:         stats.level,
            xp:            stats.xp,
            xpToNextLevel: stats.xpToNextLevel,
            health:        stats.health,
            maxHealth:     stats.maxHealth,
            mana:          stats.mana,
            maxMana:       stats.maxMana,
            glint:         stats.glint ?? 0,
            gold:          stats.gold  ?? 50,
            skillPoints:   stats.skillPoints,
            attributePoints: stats.attributePoints ?? 0,
            satchelTier:   stats.satchelTier ?? 1,
            attributes:    { ...stats.attributes },
            equipment:     { ...stats.equipment },
            skills:        Object.fromEntries(
                               Object.entries(stats.skills).map(([k, v]) => [k, { level: v.level }])
                           ),
            spells:        { ...stats.spells },
            resonance:     { ...stats.resonance },
            spellCooldowns: { ...stats.spellCooldowns },
            skillSlots:    [...stats.skillSlots],
            attunedGates:   [...(stats.attunedGates   ?? [])],
            exploredChunks: [...(stats.exploredChunks ?? [])],
            questLog:          JSON.parse(JSON.stringify(stats.questLog ?? {})),
            recoveredMemories: JSON.parse(JSON.stringify(stats.recoveredMemories ?? [])),
            inventory:         stats.inventory.map(i => ({ ...i })),
            resonanceInsights: stats.resonanceInsights ?? 0,
            masteries:         { ...(stats.masteries ?? {}) },
            codexEchoes:       JSON.parse(JSON.stringify(stats.codexEchoes ?? [])),
            killedEnemyTypes:  [...(stats.killedEnemyTypes ?? [])],
            timestamp:     Date.now(),
        };
        try {
            localStorage.setItem(saveKey(storyId, characterId), JSON.stringify(data));
            return true;
        } catch { return false; }
    }

    static load(stats, storyId, characterId) {
        const raw = localStorage.getItem(saveKey(storyId, characterId));
        if (!raw) return false;
        try {
            const d = JSON.parse(raw);
            stats.level           = d.level;
            stats.xp              = d.xp;
            stats.xpToNextLevel   = d.xpToNextLevel;
            stats.health          = d.health;
            stats.maxHealth       = d.maxHealth;
            stats.mana            = d.mana;
            stats.maxMana         = d.maxMana;
            stats.glint           = d.glint ?? 0;
            stats.gold            = d.gold  ?? 50;
            stats.skillPoints     = d.skillPoints;
            stats.attributePoints = d.attributePoints ?? 0;
            stats.satchelTier     = d.satchelTier ?? 1;
            stats.inventory       = d.inventory ?? [];
            if (d.equipment) Object.assign(stats.equipment, d.equipment);
            Object.assign(stats.attributes, d.attributes);
            Object.entries(d.skills ?? {}).forEach(([k, v]) => {
                if (stats.skills[k]) stats.skills[k].level = v.level;
            });
            if (d.spells)         Object.assign(stats.spells, d.spells);
            if (d.resonance)      Object.assign(stats.resonance, d.resonance);
            if (d.spellCooldowns) Object.assign(stats.spellCooldowns, d.spellCooldowns);
            if (d.skillSlots)     stats.skillSlots  = [...d.skillSlots];
            if (d.attunedGates)    stats.attunedGates    = [...d.attunedGates];
            if (d.exploredChunks)  stats.exploredChunks  = [...d.exploredChunks];
            if (d.questLog)            stats.questLog          = JSON.parse(JSON.stringify(d.questLog));
            if (d.recoveredMemories)   stats.recoveredMemories = JSON.parse(JSON.stringify(d.recoveredMemories));
            if (d.resonanceInsights != null) stats.resonanceInsights = d.resonanceInsights;
            if (d.masteries)           Object.assign(stats.masteries, d.masteries);
            if (d.codexEchoes)      stats.codexEchoes      = JSON.parse(JSON.stringify(d.codexEchoes));
            if (d.killedEnemyTypes) stats.killedEnemyTypes = [...d.killedEnemyTypes];
            return true;
        } catch { return false; }
    }

    static hasSave(storyId, characterId) {
        return !!localStorage.getItem(saveKey(storyId, characterId));
    }

    static deleteSave(storyId, characterId) {
        localStorage.removeItem(saveKey(storyId, characterId));
    }

    static getSaveInfo(storyId, characterId) {
        const raw = localStorage.getItem(saveKey(storyId, characterId));
        if (!raw) return null;
        try {
            const d = JSON.parse(raw);
            const date = new Date(d.timestamp);
            const timeStr = `${date.getMonth()+1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2,'0')}`;
            return { level: d.level, time: timeStr };
        } catch { return null; }
    }
}
