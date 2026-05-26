/**
 * CharacterRenderer — LPC layer compositor for Phaser 3
 *
 * Loads per-animation PNG layers from lpc_merged/spritesheets/ and stacks
 * them in z-order into a Phaser Container.  All sprites in the container
 * stay frame-synced so every layer moves together.
 *
 * Layer config shape:
 *   { type: 'body',   id: 'bodies/male',       zPos: 10 }
 *   { type: 'hair',   id: 'afro/adult',         zPos: 50 }
 *   { type: 'weapon', id: 'sword/longsword',    zPos: 140 }  ← weapon path format
 *
 * Character config shape:
 *   {
 *     layers:      LayerConfig[],
 *     animations:  string[],          // subset to preload, default: DEFAULT_ANIMS
 *     defaultAnim: 'walk',
 *     defaultDir:  'down',
 *   }
 */

const FRAME_W = 64;
const FRAME_H = 64;

// Directions and their row indices in a 4-row spritesheet
const DIR_ROW = { up: 0, left: 1, down: 2, right: 3 };

// These types use  type/id/anim/{itemname}.png  (item name = last segment of id)
const WEAPON_TYPES = new Set(['weapon']);

// These types use  type/id/anim/{color}.png  (color stored in layer.color)
export const COLOR_TYPES = new Set(['cape', 'backpack']);

// Animations to preload by default
export const DEFAULT_ANIMS = [
    'walk', 'idle', 'hurt', 'slash', 'thrust', 'spellcast',
    'run', 'sit', 'jump', 'climb', 'combat_idle', 'emote',
];

// Canonical z-order for layer types (used when zPos is not specified)
export const DEFAULT_ZPOS = {
    shadow:  -2,
    body:    10,
    head:    20,
    eyes:    25,
    hair:    50,
    torso:   30,
    legs:    40,
    feet:    50,
    arms:    45,
    shoulders: 70,
    hat:     100,
    weapon:  140,
    shield:  190,
    cape:    170,
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function normId(str) {
    return str.replace(/[^a-z0-9]/gi, '_');
}

/** Unique Phaser texture key for a (layer, animation) pair */
export function texKey(layer, anim) {
    const colorPart = layer.color ? `_${normId(layer.color)}` : '';
    return `lpc__${normId(layer.type)}_${normId(layer.id)}__${anim}${colorPart}`;
}

/** URL path for a layer's animation PNG */
function animUrl(layer, anim) {
    if (layer.itemName) {
        // bodies using per-animation subdirs: body/bodies/skeleton/walk/skeleton.png
        return `lpc/${layer.type}/${layer.id}/${anim}/${layer.itemName}.png`;
    }
    if (layer.color != null) {
        // Any colored layer: cape, backpack, tail, wings, etc.
        return `lpc/${layer.type}/${layer.id}/${anim}/${layer.color}.png`;
    }
    if (WEAPON_TYPES.has(layer.type)) {
        // weapon/sword/longsword/walk/longsword.png
        const parts    = layer.id.split('/');
        const itemName = parts[parts.length - 1];
        return `lpc/${layer.type}/${layer.id}/${anim}/${itemName}.png`;
    }
    if (COLOR_TYPES.has(layer.type)) {
        // Fallback for cape/backpack when no color specified
        return `lpc/${layer.type}/${layer.id}/${anim}/red.png`;
    }
    // body/bodies/male/walk.png
    return `lpc/${layer.type}/${layer.id}/${anim}.png`;
}

/**
 * Register Phaser animations for a texture.
 * Detects row count from image height: 4 rows → 4 directional anims,
 * 1 row → single "down" anim.
 */
function ensureAnims(scene, key, animName) {
    const tex = scene.textures.get(key);
    if (!tex || tex.key === '__MISSING') return;

    const cols = Math.floor(tex.source[0].width  / FRAME_W);
    const rows = Math.floor(tex.source[0].height / FRAME_H);
    const dirs = rows === 4 ? Object.keys(DIR_ROW) : ['down'];

    dirs.forEach((dir) => {
        const animKey = `${key}_${dir}`;
        if (scene.anims.exists(animKey)) return;

        const rowIdx     = rows === 4 ? DIR_ROW[dir] : 0;
        const frameStart = rowIdx * cols;
        const frames     = Array.from({ length: cols }, (_, i) => ({
            key, frame: frameStart + i,
        }));

        scene.anims.create({
            key:       animKey,
            frames,
            frameRate: animName === 'idle' ? 4 : 8,
            repeat:    -1,
        });
    });
}

// ─── CharacterRenderer ────────────────────────────────────────────────────────

export class CharacterRenderer {
    constructor(scene) {
        this._scene = scene;
    }

    /**
     * Call inside scene preload() to queue texture loads for a character config.
     */
    preload(config) {
        const scene = this._scene;
        const anims = config.animations ?? DEFAULT_ANIMS;

        for (const layer of config.layers) {
            for (const anim of anims) {
                const key = texKey(layer, anim);
                if (scene.textures.exists(key)) continue;
                const url = animUrl(layer, anim);
                scene.load.spritesheet(key, url, { frameWidth: FRAME_W, frameHeight: FRAME_H });
            }
        }
    }

    /**
     * Call inside scene create() after preload completes.
     * Returns a Phaser Container with one Sprite per layer.
     */
    create(x, y, config) {
        const scene     = this._scene;
        const startAnim = config.defaultAnim ?? 'walk';
        const startDir  = config.defaultDir  ?? 'down';

        const container        = scene.add.container(x, y);
        container._lpcLayers   = {};
        container._lpcAnim     = startAnim;
        container._lpcDir      = startDir;
        container._renderer    = this;

        const sorted = [...config.layers].sort(
            (a, b) => (a.zPos ?? DEFAULT_ZPOS[a.type] ?? 0) - (b.zPos ?? DEFAULT_ZPOS[b.type] ?? 0)
        );

        for (const layer of sorted) {
            const key = texKey(layer, startAnim);
            if (!scene.textures.exists(key)) {
                console.warn(`[CharacterRenderer] texture not loaded: ${key} (${animUrl(layer, startAnim)})`);
                continue;
            }

            ensureAnims(scene, key, startAnim);

            const sprite = scene.add.sprite(0, 0, key, 0);
            const animKey = `${key}_${startDir}`;
            if (scene.anims.exists(animKey)) sprite.play(animKey);

            container.add(sprite);
            container._lpcLayers[`${layer.type}:${layer.id}`] = { sprite, layer, anim: startAnim };
        }

        return container;
    }

    /**
     * Play an animation on all layers of a container.
     * @param {string} [anim]  animation name, e.g. 'walk', 'slash'
     * @param {string} [dir]   direction: 'up' | 'left' | 'down' | 'right'
     */
    play(container, anim, dir) {
        const scene   = this._scene;
        const useAnim = anim ?? container._lpcAnim ?? 'walk';
        const useDir  = dir  ?? container._lpcDir  ?? 'down';

        for (const entry of Object.values(container._lpcLayers)) {
            const { sprite, layer } = entry;
            const key     = texKey(layer, useAnim);

            if (!scene.textures.exists(key)) continue;
            ensureAnims(scene, key, useAnim);

            const animKey = `${key}_${useDir}`;
            if (!scene.anims.exists(animKey)) continue;
            if (sprite.anims.currentAnim?.key !== animKey || !sprite.anims.isPlaying) {
                sprite.play(animKey, true);
            }
            entry.anim = useAnim;
        }

        container._lpcAnim = useAnim;
        container._lpcDir  = useDir;
    }

    /** Number of frames per direction row for the current anim on a container */
    frameCount(container) {
        const entry = Object.values(container._lpcLayers)[0];
        if (!entry) return 1;
        const key = texKey(entry.layer, container._lpcAnim ?? 'walk');
        const tex = this._scene.textures.get(key);
        if (!tex || tex.key === '__MISSING') return 1;
        return Math.floor(tex.source[0].width / FRAME_W);
    }

    /** Pause all layer sprites and show a specific frame index within current dir row */
    freezeFrame(container, frameIdx) {
        const scene = this._scene;
        const dir   = container._lpcDir ?? 'down';

        for (const entry of Object.values(container._lpcLayers)) {
            const { sprite, layer } = entry;
            const key  = texKey(layer, container._lpcAnim ?? 'walk');
            const tex  = scene.textures.get(key);
            if (!tex || tex.key === '__MISSING') continue;

            const cols    = Math.floor(tex.source[0].width  / FRAME_W);
            const rows    = Math.floor(tex.source[0].height / FRAME_H);
            const rowIdx  = rows === 4 ? DIR_ROW[dir] : 0;
            const clamped = Phaser.Math.Clamp(frameIdx, 0, cols - 1);

            sprite.anims.stop();
            sprite.setFrame(rowIdx * cols + clamped);
        }
    }

    /** Register Phaser animations for an already-loaded texture (used after palette swap) */
    ensureTextureAnims(key, animName) {
        ensureAnims(this._scene, key, animName);
    }

    /** Returns true if every requested animation is already loaded for this layer */
    isLayerLoaded(layer, anims = DEFAULT_ANIMS) {
        return anims.every(a => this._scene.textures.exists(texKey(layer, a)));
    }

    /**
     * Load multiple layers in one batch — fires onDone() once when all textures are ready.
     * Safe to call at any time after preload; skips already-loaded textures.
     */
    loadLayers(layers, anims = DEFAULT_ANIMS, onDone = () => {}) {
        const scene = this._scene;
        let queued  = false;
        for (const layer of layers) {
            for (const anim of anims) {
                const key = texKey(layer, anim);
                if (!scene.textures.exists(key)) {
                    scene.load.spritesheet(key, animUrl(layer, anim), { frameWidth: FRAME_W, frameHeight: FRAME_H });
                    queued = true;
                }
            }
        }
        if (!queued) { onDone(); return; }
        scene.load.once('complete', onDone);
        scene.load.start();
    }

    /**
     * Dynamically load all animations for a layer (safe to call at any time after preload).
     * Calls onDone() immediately if all textures already exist.
     */
    loadLayer(layer, anims = DEFAULT_ANIMS, onDone = () => {}) {
        const scene   = this._scene;
        const needed  = anims.filter(a => !scene.textures.exists(texKey(layer, a)));
        if (needed.length === 0) { onDone(); return; }

        for (const anim of needed) {
            const key = texKey(layer, anim);
            scene.load.spritesheet(key, animUrl(layer, anim), { frameWidth: FRAME_W, frameHeight: FRAME_H });
        }
        scene.load.once('complete', onDone);
        scene.load.start();
    }

    /** Add a new layer sprite to a container, inserted at the correct z-order position */
    addLayer(container, layer) {
        const scene   = this._scene;
        const useAnim = container._lpcAnim ?? 'walk';
        const useDir  = container._lpcDir  ?? 'down';
        const key     = texKey(layer, useAnim);

        if (!scene.textures.exists(key)) {
            console.warn(`[CharacterRenderer] addLayer: texture not loaded: ${key}`);
            return;
        }

        ensureAnims(scene, key, useAnim);
        const sprite  = scene.add.sprite(0, 0, key, 0);

        // Insert at the right z position
        const zNew   = layer.zPos ?? DEFAULT_ZPOS[layer.type] ?? 0;
        const list   = container.list;
        const layers = container._lpcLayers;
        let insertIdx = list.length;
        for (let i = 0; i < list.length; i++) {
            const entry = Object.values(layers).find(e => e.sprite === list[i]);
            if (entry) {
                const z = entry.layer.zPos ?? DEFAULT_ZPOS[entry.layer.type] ?? 0;
                if (z > zNew) { insertIdx = i; break; }
            }
        }
        container.addAt(sprite, insertIdx);
        container._lpcLayers[`${layer.type}:${layer.id}`] = { sprite, layer, anim: useAnim };

        // Restart all layers together so the new sprite is in sync from frame 0
        this._resyncAll(container);
    }

    /** Restart all layer animations from frame 0 simultaneously (keeps them in sync) */
    _resyncAll(container) {
        const scene   = this._scene;
        const useAnim = container._lpcAnim ?? 'walk';
        const useDir  = container._lpcDir  ?? 'down';
        for (const entry of Object.values(container._lpcLayers)) {
            const key     = texKey(entry.layer, useAnim);
            const animKey = `${key}_${useDir}`;
            if (scene.anims.exists(animKey)) {
                entry.sprite.play(animKey);
                entry.anim = useAnim;
            }
        }
    }

    /** Remove a layer from a container and destroy its sprite */
    removeLayer(container, layerKey) {
        const entry = container._lpcLayers[layerKey];
        if (!entry) return;
        container.remove(entry.sprite, true);
        delete container._lpcLayers[layerKey];
    }

    /**
     * Hot-swap one layer (e.g. equip new armor).
     * The new layer must already be preloaded.
     */
    replaceLayer(container, oldLayerKey, newLayer) {
        const scene = this._scene;
        const entry = container._lpcLayers[oldLayerKey];
        if (!entry) return;

        const { sprite } = entry;
        const useAnim = container._lpcAnim ?? 'walk';
        const useDir  = container._lpcDir  ?? 'down';
        const key     = texKey(newLayer, useAnim);

        if (!scene.textures.exists(key)) {
            console.warn(`[CharacterRenderer] replaceLayer: texture not loaded: ${key}`);
            return;
        }

        ensureAnims(scene, key, useAnim);
        sprite.setTexture(key, 0);

        delete container._lpcLayers[oldLayerKey];
        container._lpcLayers[`${newLayer.type}:${newLayer.id}`] = { sprite, layer: newLayer, anim: useAnim };

        // Restart all layers together so the swapped sprite is in sync from frame 0
        this._resyncAll(container);
    }
}
