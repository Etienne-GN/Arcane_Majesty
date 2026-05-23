import { STATUS_DEFS, STATUS_TINT_PRIORITY } from '../data/statuses.js';

// Entities carry `_statuses`: { id: { remaining, stacks, dotTimer, regenTimer } }

const sm = {
    apply(entity, id, opts = {}) {
        const def = STATUS_DEFS[id];
        if (!def) return;
        if (!entity._statuses) entity._statuses = {};

        // ── Interaction matrix ────────────────────────────────────────────────
        if (id === 'burning') {
            if (this.has(entity, 'wet'))    { this._steam(entity); return; }
            if (this.has(entity, 'frozen')) { this.remove(entity, 'frozen'); }
            if (this.has(entity, 'cold'))   { this.remove(entity, 'cold'); }
        }
        if (id === 'wet') {
            if (this.has(entity, 'burning')) { this._steam(entity); return; }
            if (this.has(entity, 'dried'))   { this.remove(entity, 'dried'); }
        }
        if (id === 'dried') {
            if (this.has(entity, 'wet')) { this.remove(entity, 'wet'); }
        }
        if (id === 'cold' && this.has(entity, 'burning')) return;
        if (id === 'frozen' && this.has(entity, 'burning')) return;

        const duration = opts.duration ?? def.duration;
        const existing = entity._statuses[id];
        const stacks   = def.maxStacks
            ? Math.min((existing?.stacks ?? 0) + 1, def.maxStacks)
            : 1;

        entity._statuses[id] = {
            remaining:  duration < 0 ? Infinity : duration,
            stacks,
            dotTimer:   def.dotInterval  ?? 0,
            regenTimer: def.regenInterval ?? 0,
        };

        this._updateTint(entity);
    },

    remove(entity, id) {
        if (!entity._statuses?.[id]) return;
        delete entity._statuses[id];
        this._updateTint(entity);
    },

    clear(entity) {
        entity._statuses = {};
        this._updateTint(entity);
    },

    has(entity, id) {
        return !!(entity._statuses?.[id]);
    },

    stacks(entity, id) {
        return entity._statuses?.[id]?.stacks ?? 0;
    },

    tick(entity, delta) {
        if (!entity._statuses) return;

        for (const [id, state] of Object.entries(entity._statuses)) {
            const def = STATUS_DEFS[id];
            if (!def) { delete entity._statuses[id]; continue; }

            // Count down duration
            if (state.remaining !== Infinity) {
                state.remaining -= delta;
                if (state.remaining <= 0) { delete entity._statuses[id]; continue; }
            }

            // DoT damage
            if (def.dotDmg) {
                state.dotTimer -= delta;
                if (state.dotTimer <= 0) {
                    state.dotTimer += def.dotInterval;
                    entity.takeDamage?.(def.dotDmg * (state.stacks ?? 1));
                }
            }

            // HP regen (player only — entity must have .stats)
            if (def.regenAmt && entity.stats) {
                state.regenTimer -= delta;
                if (state.regenTimer <= 0) {
                    state.regenTimer += def.regenInterval;
                    entity.stats.health = Math.min(entity.stats.maxHealth, entity.stats.health + def.regenAmt);
                }
            }
        }
    },

    // Speed multiplier for enemy movement
    speedMult(entity) {
        let m = 1;
        for (const id of Object.keys(entity._statuses ?? {})) {
            const v = STATUS_DEFS[id]?.speedMult;
            if (v !== undefined) m = Math.min(m, v);
        }
        return m;
    },

    // Stats multiplier (player buffs/debuffs)
    statsMult(entity) {
        let m = 1;
        for (const id of Object.keys(entity._statuses ?? {})) {
            const v = STATUS_DEFS[id]?.statsMult;
            if (v !== undefined) m *= v;
        }
        return m;
    },

    isStunned(entity) {
        return ['frozen', 'shocked', 'entangled'].some(id => this.has(entity, id));
    },

    isSilenced(entity) {
        return this.has(entity, 'silenced');
    },

    // Incoming damage modifiers based on target statuses
    incomingDmgMult(entity, element) {
        let m = 1;
        if (element === 'fire')      { if (this.has(entity, 'wet'))   m *= STATUS_DEFS.wet.fireDmgMult;   }
        if (element === 'fire')      { if (this.has(entity, 'dried'))  m *= STATUS_DEFS.dried.fireDmgMult; }
        if (element === 'lightning') { if (this.has(entity, 'wet'))    m *= STATUS_DEFS.wet.lightningDmgMult; }
        // Shattering frozen target with physical hit
        if (element === 'physical' && this.has(entity, 'frozen')) { m *= 1.5; this.remove(entity, 'frozen'); }
        return m;
    },

    // Active status labels for UIScene display
    activeLabels(entity) {
        return Object.keys(entity._statuses ?? {})
            .map(id => STATUS_DEFS[id]?.label)
            .filter(Boolean);
    },

    _steam(entity) {
        this.remove(entity, 'wet');
        this.remove(entity, 'burning');
        entity._steamEvent = true; // read by GameScene to spawn VFX
    },

    _updateTint(entity) {
        for (const id of STATUS_TINT_PRIORITY) {
            if (this.has(entity, id) && STATUS_DEFS[id]?.tint) {
                entity.setTint?.(STATUS_DEFS[id].tint);
                return;
            }
        }
        // Restore base tint or clear
        if (entity._baseTint) entity.setTint?.(entity._baseTint);
        else entity.clearTint?.();
    },
};

export const statusManager = sm;
