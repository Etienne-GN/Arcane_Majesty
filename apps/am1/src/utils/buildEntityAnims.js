import { ANIM_PROFILES } from '../data/animProfiles.js';

// Registers all standard animations for an entity into Phaser's animation manager.
// animPrefix — the namespace for generated anim keys (e.g. "eldrin" → "eldrin_walk_down")
// textureKey — default texture to use for frames; profiles can override per-anim-type via 'textures'
// Safe to call multiple times — skips if already registered.
export function buildEntityAnims(anims, animPrefix, profileKey = 'rpgmaker_32', textureKey = null) {
    const p = typeof profileKey === 'string' ? ANIM_PROFILES[profileKey] : profileKey;
    if (!p) throw new Error(`buildEntityAnims: unknown profile "${profileKey}"`);

    // Default texture = animPrefix when not provided (backward compat with single-texture usage)
    const defaultTx = textureKey ?? animPrefix;
    const prefix = `${animPrefix}_`;
    if (anims.exists(`${prefix}walk_down`)) return;

    const fr    = p.frameRate;
    const txFor = (type) => p.textures?.[type] ?? defaultTx;

    const makeFrames = (tx, frames) =>
        frames.map(f => ({ key: tx, frame: f }));

    // Walk + idle per direction
    for (const dir of ['down', 'left', 'right', 'up']) {
        const walkTx = txFor('walk');
        if (p.walk[dir]) {
            anims.create({
                key: `${prefix}walk_${dir}`,
                frames: makeFrames(walkTx, p.walk[dir]),
                frameRate: fr.walk,
                repeat: -1,
            });
        }

        const idleTx    = txFor('idle');
        const idleFrame = p.idle[dir];
        if (idleFrame !== undefined) {
            anims.create({
                key: `${prefix}idle_${dir}`,
                frames: makeFrames(idleTx, [idleFrame]),
                frameRate: fr.idle,
                repeat: 0,
            });
        }
    }

    // Generic (non-directional) idle — used by Enemy / NPC
    const genericFrame = p.idle.down ?? Object.values(p.idle)[0];
    if (genericFrame !== undefined) {
        anims.create({
            key: `${prefix}idle`,
            frames: makeFrames(txFor('idle'), [genericFrame]),
            frameRate: fr.idle,
            repeat: 0,
        });
    }

    // Directional attack
    if (p.attack && !Array.isArray(p.attack)) {
        const atkTx = txFor('attack');
        for (const dir of ['down', 'left', 'right', 'up']) {
            if (p.attack[dir]) {
                anims.create({
                    key: `${prefix}attack_${dir}`,
                    frames: makeFrames(atkTx, p.attack[dir]),
                    frameRate: fr.attack,
                    repeat: 0,
                });
            }
        }
        // Generic fallback used by current play('player_attack') call
        if (p.attack.down) {
            anims.create({
                key: `${prefix}attack`,
                frames: makeFrames(atkTx, p.attack.down),
                frameRate: fr.attack,
                repeat: 0,
            });
        }
    } else if (Array.isArray(p.attack) && p.attack.length) {
        // Single-array attack (rpgmaker_32)
        anims.create({
            key: `${prefix}attack`,
            frames: makeFrames(txFor('attack'), p.attack),
            frameRate: fr.attack,
            repeat: 0,
        });
    }

    // Directional spellcast (optional)
    if (p.spellcast) {
        const spTx = txFor('spellcast');
        for (const dir of ['down', 'left', 'right', 'up']) {
            if (p.spellcast[dir]) {
                anims.create({
                    key: `${prefix}spellcast_${dir}`,
                    frames: makeFrames(spTx, p.spellcast[dir]),
                    frameRate: fr.spellcast ?? fr.attack,
                    repeat: 0,
                });
            }
        }
    }
}
