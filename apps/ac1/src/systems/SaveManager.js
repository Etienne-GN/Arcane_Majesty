const SAVE_KEY = 'arcane_majesty_v1';

export class SaveManager {
    static save(stats) {
        const data = {
            level:         stats.level,
            xp:            stats.xp,
            xpToNextLevel: stats.xpToNextLevel,
            health:        stats.health,
            maxHealth:     stats.maxHealth,
            mana:          stats.mana,
            maxMana:       stats.maxMana,
            gold:          stats.gold ?? 0,
            skillPoints:   stats.skillPoints,
            attributes:    { ...stats.attributes },
            skills:        Object.fromEntries(
                               Object.entries(stats.skills).map(([k, v]) => [k, { level: v.level }])
                           ),
            inventory:     stats.inventory.map(i => ({ ...i })),
            timestamp:     Date.now()
        };
        try {
            localStorage.setItem(SAVE_KEY, JSON.stringify(data));
            return true;
        } catch { return false; }
    }

    static load(stats) {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return false;
        try {
            const d = JSON.parse(raw);
            stats.level         = d.level;
            stats.xp            = d.xp;
            stats.xpToNextLevel = d.xpToNextLevel;
            stats.health        = d.health;
            stats.maxHealth     = d.maxHealth;
            stats.mana          = d.mana;
            stats.maxMana       = d.maxMana;
            stats.gold          = d.gold ?? 0;
            stats.skillPoints   = d.skillPoints;
            stats.inventory     = d.inventory ?? [];
            Object.assign(stats.attributes, d.attributes);
            Object.entries(d.skills ?? {}).forEach(([k, v]) => {
                if (stats.skills[k]) stats.skills[k].level = v.level;
            });
            return true;
        } catch { return false; }
    }

    static hasSave() {
        return !!localStorage.getItem(SAVE_KEY);
    }

    static deleteSave() {
        localStorage.removeItem(SAVE_KEY);
    }

    static getSaveInfo() {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return null;
        try {
            const d = JSON.parse(raw);
            const date = new Date(d.timestamp);
            const timeStr = `${date.getMonth()+1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2,'0')}`;
            return { level: d.level, time: timeStr };
        } catch { return null; }
    }
}
