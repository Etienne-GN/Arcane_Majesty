import { ITEMS } from '../data/items.js';
import { xpForLevel } from './PlayerStats.js';
import { prunedWorldState } from './WorldState.js';
function saveKey(storyId, characterId) {
    return `amo_save_${storyId}_${characterId}`;
}

// The slot the current game saves to. GameScene.init and load() set it, so a
// save() that omits the ids (Crafting, Campfire, rift-gates…) still lands in
// the right place instead of "amo_save_undefined_undefined".
let _slot = { storyId: null, characterId: null };

export class SaveManager {
    // Combat C1: before two hands an empty weapon slot attacked like a staff. Such a
    // save (no offHand in its equipment) is given a Novice Staff in the main hand.
    static migrateCombatC1(stats, d) {
        if (stats?.equipment && d?.equipment && !('offHand' in d.equipment)) {
            stats.equipment.offHand = null;   // the save had none: never keep one from memory
            if (!stats.equipment.weapon && ITEMS.novice_staff) {
                stats.equipment.weapon = 'novice_staff';
                stats._applyEquipStats?.('novice_staff');   // as a normal equip would
            }
        }
    }

    static setSlot(storyId, characterId) {
        _slot = { storyId: storyId ?? null, characterId: characterId ?? null };
    }

    static slot() { return { ..._slot }; }

    static save(stats, storyId = _slot.storyId, characterId = _slot.characterId) {
        const data = {
            storyId,
            characterId,
            level:         stats.level,
            xp:            stats.xp,
            xpToNextLevel: stats.xpToNextLevel,
            // the temporary food/tonic max-HP bonus is not saved
            health:        Math.min(stats.health, stats.maxHealth - (stats._tempMaxHp ?? 0)),
            maxHealth:     stats.maxHealth - (stats._tempMaxHp ?? 0),
            mana:          stats.mana,
            maxMana:       stats.maxMana,
            glint:         stats.glint ?? 0,
            gold:          stats.gold  ?? 50,
            skillPoints:   stats.skillPoints,
            attributePoints: stats.attributePoints ?? 0,
            satchelTier:   stats.satchelTier ?? 1,
            attributes:    { ...stats.attributes },
            equipment:     { ...stats.equipment },
            moveSlots:     { ...stats.moveSlots },
            skills:        Object.fromEntries(
                               Object.entries(stats.skills).map(([k, v]) => [k, { level: v.level }])
                           ),
            spells:        { ...stats.spells },
            resonance:     { ...stats.resonance },
            spellCooldowns: { ...stats.spellCooldowns },
            skillSlots:    [...(stats.skillSlots ?? [])],
            hotbar:        [...(stats.hotbar ?? [null, null, null, null])],
            attunedGates:   [...(stats.attunedGates   ?? [])],
            exploredChunks: [...(stats.exploredChunks ?? [])],
            questLog:          JSON.parse(JSON.stringify(stats.questLog ?? {})),
            recoveredMemories: JSON.parse(JSON.stringify(stats.recoveredMemories ?? [])),
            inventory:         stats.inventory.map(i => ({ ...i })),
            resonanceInsights: stats.resonanceInsights ?? 0,
            masteries:         { ...(stats.masteries ?? {}) },
            codexEchoes:       JSON.parse(JSON.stringify(stats.codexEchoes ?? [])),
            killedEnemyTypes:  [...(stats.killedEnemyTypes ?? [])],
            seenItems:         [...(stats.seenItems ?? [])],
            campaign:          stats.campaign ? JSON.parse(JSON.stringify(stats.campaign)) : null,
            chestContents:     JSON.parse(JSON.stringify(stats.chestContents ?? {})),
            weaponEnchants:    { ...(stats.weaponEnchants ?? {}) },
            craftCounts:       { cooking: 0, alchemy: 0, ...(stats.craftCounts ?? {}) },
            knownRecipes:      [...(stats.knownRecipes ?? [])],
            gearUpgrades:      { ...(stats.gearUpgrades ?? {}) },
            flags:             { ...(stats.flags ?? {}) },
            generatedQuests:   JSON.parse(JSON.stringify(stats.generatedQuests ?? {})),
            bounties:          JSON.parse(JSON.stringify(stats.bounties ?? {})),
            gameMinutes:       stats.gameMinutes ?? 480,
            interiorReturn:    (stats.interiorReturn ?? []).map(e => ({ mapId: e.mapId, x: e.x, y: e.y })),
            explored:          { ...(stats.explored ?? {}) },
            charted:           { ...(stats.charted ?? {}) },
            discovered:        { ...(stats.discovered ?? {}) },
            location:          stats.location ? { ...stats.location } : null,
            respawnPoint:      stats.respawnPoint ? { ...stats.respawnPoint } : null,
            worldState:        prunedWorldState(stats, Date.now()),
            seenEnemyTypes:    [...(stats.seenEnemyTypes ?? [])],
            killCounts:        { ...(stats.killCounts ?? {}) },
            timestamp:     Date.now(),
        };
        try {
            localStorage.setItem(saveKey(storyId, characterId), JSON.stringify(data));
            return true;
        } catch { return false; }
    }

    static load(stats, storyId, characterId) {
        SaveManager.setSlot(storyId, characterId);
        const raw = localStorage.getItem(saveKey(storyId, characterId));
        if (!raw) return false;
        try {
            const d = JSON.parse(raw);
            stats.level           = d.level;
            stats.xp              = d.xp;
            // Always from the current curve: saves made under the old ×1.5
            // curve would otherwise keep their huge next-level requirement.
            stats.xpToNextLevel   = xpForLevel(d.level ?? 1);
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
            stats.moveSlots = { attack: null, second: null, ...d.moveSlots };
            SaveManager.migrateCombatC1(stats, d);
            Object.assign(stats.attributes, d.attributes);
            Object.entries(d.skills ?? {}).forEach(([k, v]) => {
                if (stats.skills[k]) stats.skills[k].level = v.level;
            });
            if (d.spells)         stats.spells         = { ...(stats.spells ?? {}), ...d.spells };
            if (d.resonance)      stats.resonance       = { ...(stats.resonance ?? {}), ...d.resonance };
            if (d.spellCooldowns) stats.spellCooldowns  = { ...(stats.spellCooldowns ?? {}), ...d.spellCooldowns };
            if (d.skillSlots)     stats.skillSlots  = [...d.skillSlots];
            stats.hotbar = Array.isArray(d.hotbar) ? [...d.hotbar, null, null, null, null].slice(0, 4) : [null, null, null, null];
            if (d.attunedGates)    stats.attunedGates    = [...d.attunedGates];
            if (d.exploredChunks)  stats.exploredChunks  = [...d.exploredChunks];
            if (d.questLog)            stats.questLog          = JSON.parse(JSON.stringify(d.questLog));
            if (d.recoveredMemories)   stats.recoveredMemories = JSON.parse(JSON.stringify(d.recoveredMemories));
            if (d.resonanceInsights != null) stats.resonanceInsights = d.resonanceInsights;
            if (d.masteries)           stats.masteries         = { ...(stats.masteries ?? {}), ...d.masteries };
            if (d.codexEchoes)      stats.codexEchoes      = JSON.parse(JSON.stringify(d.codexEchoes));
            if (d.killedEnemyTypes) stats.killedEnemyTypes = [...d.killedEnemyTypes];
            stats.campaign = d.campaign ? JSON.parse(JSON.stringify(d.campaign)) : null;
            stats.chestContents = d.chestContents ? JSON.parse(JSON.stringify(d.chestContents)) : {};
            stats.weaponEnchants = { ...(d.weaponEnchants ?? {}) };
            stats.craftCounts = { cooking: 0, alchemy: 0, ...(d.craftCounts ?? {}) };
            stats.knownRecipes = [...(d.knownRecipes ?? [])];
            stats.gearUpgrades = { ...(d.gearUpgrades ?? {}) };
            stats.flags           = { ...(d.flags ?? {}) };
            stats.generatedQuests = d.generatedQuests ? JSON.parse(JSON.stringify(d.generatedQuests)) : {};
            stats.bounties        = d.bounties ? JSON.parse(JSON.stringify(d.bounties)) : {};
            stats.gameMinutes     = Number.isFinite(d.gameMinutes) ? d.gameMinutes : 480;
            stats.interiorReturn  = Array.isArray(d.interiorReturn) ? d.interiorReturn.map(e => ({ mapId: e.mapId, x: e.x, y: e.y })) : [];
            const keep = (o, valid) => Object.fromEntries(Object.entries(o && typeof o === 'object' ? o : {}).filter(([, v]) => valid(v)));
            stats.explored   = keep(d.explored, v => typeof v === 'string');
            stats.charted    = keep(d.charted, v => v === true);
            stats.discovered = keep(d.discovered, v => v === true);
            stats.vigor        = stats.maxVigor;   // Vigor is not saved: a load starts full
            stats.vigorWinded  = false;
            stats._vigorIdleMs = 0;
            stats.location     = d.location ? { ...d.location } : null;
            stats.respawnPoint = d.respawnPoint ? { ...d.respawnPoint } : null;
            stats.worldState   = d.worldState ? JSON.parse(JSON.stringify(d.worldState)) : {};
            stats.seenEnemyTypes = [...(d.seenEnemyTypes ?? [])];
            stats.killCounts     = { ...(d.killCounts ?? {}) };
            // Seed seenItems from save; fall back to current inventory for old saves
            stats.seenItems = d.seenItems
                ? new Set(d.seenItems)
                : new Set(stats.inventory.map(i => i.id));
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
