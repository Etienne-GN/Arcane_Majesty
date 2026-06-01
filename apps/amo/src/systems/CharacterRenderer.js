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
    eyes:    210,
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

/** Unique container layer key — includes itemName to allow two layers with the same id but different item (e.g. bg/fg on the same base path) */
export function layerKey(layer) {
    return `${layer.type}:${layer.id}${layer.itemName ? '#' + layer.itemName : ''}`;
}

/** Unique Phaser texture key for a (layer, animation) pair */
export function texKey(layer, anim) {
    const colorPart    = layer.color    ? `_${normId(layer.color)}`    : '';
    const itemNamePart = layer.itemName ? `_${normId(layer.itemName)}` : '';
    return `lpc__${normId(layer.type)}_${normId(layer.id)}__${anim}${colorPart}${itemNamePart}`;
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
 * For non-4-row sheets, find the first row with actual pixel content by sampling
 * the first frame of each row. Returns a dirMap: either DIR_ROW for 4-dir layouts
 * or { up/left/down/right: r } for non-directional sprites packed in a single row.
 */
function detectDirMap(tex, rows) {
    const src = tex.source[0];
    const img = src.image || src.canvas;
    if (!img) return { up: 0, left: 0, down: 0, right: 0 };

    const tmp = document.createElement('canvas');
    tmp.width  = FRAME_W;
    tmp.height = FRAME_H;
    const ctx  = tmp.getContext('2d', { willReadFrequently: true });

    for (let r = 0; r < rows; r++) {
        ctx.clearRect(0, 0, FRAME_W, FRAME_H);
        ctx.drawImage(img, 0, r * FRAME_H, FRAME_W, FRAME_H, 0, 0, FRAME_W, FRAME_H);
        const data = ctx.getImageData(0, 0, FRAME_W, FRAME_H).data;
        let found = false;
        for (let i = 3; i < data.length; i += 4) { if (data[i] > 8) { found = true; break; } }
        if (found) return r < 4 ? DIR_ROW : { up: r, left: r, down: r, right: r };
    }
    return { up: 0, left: 0, down: 0, right: 0 };
}

/**
 * For a row in an extended (non-4-row) sheet, determine whether frames are
 * interleaved (even cols = arm-in-front, odd cols = arm-behind) or consecutive.
 *
 * Interleaved sheets pack two variants side-by-side; we pick only the dominant
 * parity (whichever has >5× more total opaque pixels than the other).
 *
 * Returns { step, colStart, frameCount } where:
 *   step=2 + colStart=0  →  even cols only
 *   step=2 + colStart=1  →  odd cols only
 *   step=1 + colStart=0  →  all consecutive cols, capped at 9
 */
function detectRowLayout(tex, rowIdx, cols) {
    const src = tex.source[0];
    const img = src.image || src.canvas;
    if (!img) return { step: 1, colStart: 0, frameCount: Math.min(cols, 9) };

    const tmp = document.createElement('canvas');
    tmp.width  = FRAME_W;
    tmp.height = FRAME_H;
    const ctx  = tmp.getContext('2d', { willReadFrequently: true });

    const maxScan = Math.min(cols, 18);
    let evenTotal = 0, evenActive = 0;
    let oddTotal  = 0, oddActive  = 0;

    for (let c = 0; c < maxScan; c++) {
        ctx.clearRect(0, 0, FRAME_W, FRAME_H);
        ctx.drawImage(img, c * FRAME_W, rowIdx * FRAME_H, FRAME_W, FRAME_H, 0, 0, FRAME_W, FRAME_H);
        const data = ctx.getImageData(0, 0, FRAME_W, FRAME_H).data;
        let n = 0;
        for (let i = 3; i < data.length; i += 4) if (data[i] > 8) n++;
        if (c % 2 === 0) { evenTotal += n; if (n > 0) evenActive++; }
        else             { oddTotal  += n; if (n > 0) oddActive++;  }
    }

    // Even-dominant: odd cols carry < 20% of even pixels → step-2 even
    if (evenTotal > 0 && oddTotal < evenTotal * 0.2) {
        const skip = (evenActive === 9) ? 1 : 0;
        return { step: 2, colStart: skip * 2, frameCount: evenActive - skip };
    }
    // Odd-dominant: even cols carry < 20% of odd pixels → step-2 odd
    if (oddTotal > 0 && evenTotal < oddTotal * 0.2) {
        const skip = (oddActive === 9) ? 1 : 0;
        return { step: 2, colStart: 1 + skip * 2, frameCount: oddActive - skip };
    }
    // Mixed: consecutive, capped at standard LPC 9 cols
    const eff = Math.min(cols, 9);
    return { step: 1, colStart: 0, frameCount: eff };
}

/**
 * Count how many columns (from col 0) have any opaque pixel across all 4 rows.
 * Oversize weapon sheets are often padded to a fixed canvas width with empty cols at the end.
 */
function countActiveCols(tex, totalCols, fw, fh) {
    const src = tex.source[0];
    const img = src.image || src.canvas;
    if (!img) return totalCols;

    const tmp = document.createElement('canvas');
    tmp.width  = fw;
    tmp.height = fh * 4;
    const ctx  = tmp.getContext('2d', { willReadFrequently: true });

    for (let c = 0; c < totalCols; c++) {
        ctx.clearRect(0, 0, fw, fh * 4);
        ctx.drawImage(img, c * fw, 0, fw, fh * 4, 0, 0, fw, fh * 4);
        const data = ctx.getImageData(0, 0, fw, fh * 4).data;
        let hasPixel = false;
        for (let i = 3; i < data.length; i += 4) {
            if (data[i] > 8) { hasPixel = true; break; }
        }
        if (!hasPixel) return c;
    }
    return totalCols;
}

/**
 * Some weapon sheets are exported at 2× or 3× the standard 64px frame size
 * (e.g. 192×192 frames → 1152×768 sheet).  Detect the real frame size by
 * finding the largest multiple of FRAME_W that divides both dimensions and
 * yields exactly 4 rows.  Then patch the Phaser texture's frame UV data so
 * subsequent animation creation uses correct coordinates.
 */
function ensureCorrectFrameSize(tex) {
    const w = tex.source[0].width;
    const h = tex.source[0].height;
    if (tex.customData?.framesPatched) return;

    // Already standard — nothing to do
    if (h % FRAME_H === 0 && Math.round(h / FRAME_H) === 4) {
        if (!tex.customData) tex.customData = {};
        tex.customData.framesPatched = true;
        tex.customData.frameW = FRAME_W;
        tex.customData.frameH = FRAME_H;
        return;
    }

    // Find the smallest frame height ≥ FRAME_H that gives exactly 4 rows
    for (const fh of [128, 192, 256]) {
        if (h % fh !== 0 || Math.round(h / fh) !== 4) continue;
        if (w % fh !== 0) continue;
        const fw   = fh;
        const cols = w / fw;
        const rows = 4;
        // tex.add() silently returns null when a frame already exists —
        // use frame.setSize() directly to overwrite the UV data in-place.
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const idx   = r * cols + c;
                const frame = tex.frames[idx];
                if (frame) {
                    frame.setSize(fw, fh, c * fw, r * fh);
                } else {
                    tex.add(String(idx), 0, c * fw, r * fh, fw, fh);
                }
            }
        }
        if (!tex.customData) tex.customData = {};
        tex.customData.framesPatched = true;
        tex.customData.frameW = fw;
        tex.customData.frameH = fh;
        return;
    }
}


function ensureAnims(scene, key, animName) {
    const tex = scene.textures.get(key);
    if (!tex || tex.key === '__MISSING') return;

    ensureCorrectFrameSize(tex);

    const fw        = tex.customData?.frameW ?? FRAME_W;
    const fh        = tex.customData?.frameH ?? FRAME_H;
    const cols      = Math.floor(tex.source[0].width  / fw);
    const rows      = Math.floor(tex.source[0].height / fh);
    const dirMap    = rows === 4 ? DIR_ROW : detectDirMap(tex, rows);
    const dirs      = Object.keys(dirMap);
    const isExtended = rows !== 4;

    dirs.forEach((dir) => {
        const animKey = `${key}_${dir}`;
        const rowIdx  = dirMap[dir];

        let step, colStart, frameCount;
        if (isExtended) {
            const layout = detectRowLayout(tex, rowIdx, cols);
            step       = layout.step;
            colStart   = layout.colStart;
            frameCount = layout.frameCount;
            // Apply standard walk skip if consecutive and 9-col equivalent
            if (step === 1 && layout.frameCount === 9 && animName === 'walk') {
                colStart   = 1;
                frameCount = 8;
            }
        } else {
            step = 1;
            if (fw > FRAME_W) {
                // Oversize sheets may have empty trailing columns — scan to find actual count
                const effectiveCols = countActiveCols(tex, cols, fw, fh);
                colStart   = (animName === 'walk' && effectiveCols === 9) ? 1 : 0;
                frameCount = effectiveCols - colStart;
            } else {
                colStart   = (animName === 'walk' && cols === 9) ? 1 : 0;
                frameCount = cols - colStart;
            }
        }

        if (frameCount <= 0) return;

        // Rebuild stale cached animations (e.g. from before a code change)
        if (scene.anims.exists(animKey)) {
            if (scene.anims.get(animKey).frames.length === frameCount) return;
            scene.anims.remove(animKey);
        }

        const frameStart = rowIdx * cols + colStart;
        const frames = Array.from({ length: frameCount }, (_, i) => ({
            key, frame: frameStart + i * step,
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
            container._lpcLayers[layerKey(layer)] = { sprite, layer, anim: startAnim };
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
            const baseKey = texKey(layer, useAnim);
            const swpKey  = entry.swappedKeys?.[useAnim];
            const key     = (swpKey && scene.textures.exists(swpKey)) ? swpKey : baseKey;

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
        const fw = tex.customData?.frameW ?? FRAME_W;
        return Math.floor(tex.source[0].width / fw);
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

            const fw      = tex.customData?.frameW ?? FRAME_W;
            const fh      = tex.customData?.frameH ?? FRAME_H;
            const cols    = Math.floor(tex.source[0].width  / fw);
            const rows    = Math.floor(tex.source[0].height / fh);
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

    /** Apply a palette swap to all loaded animations of one layer in a container. */
    applyLayerSwap(container, lKey, swapParams) {
        const scene = this._scene;
        const entry = container._lpcLayers[lKey];
        if (!entry) return;
        entry.swappedKeys = entry.swappedKeys ?? {};

        const { layer } = entry;
        const safe = swapParams.tintName.replace(/\s+/g, '_');

        for (const animName of DEFAULT_ANIMS) {
            const origKey = texKey(layer, animName);
            if (!scene.textures.exists(origKey)) continue;
            const rcKey = `${origKey}__rc_${swapParams.sourceKey}_${safe}`;
            if (!scene.textures.exists(rcKey)) {
                if (!this._buildSwappedTexture(scene, origKey, rcKey, swapParams)) continue;
            }
            ensureAnims(scene, rcKey, animName);
            entry.swappedKeys[animName] = rcKey;
        }

        // Refresh sprite if it's currently showing this layer's animation
        const useAnim    = container._lpcAnim ?? 'walk';
        const useDir     = container._lpcDir  ?? 'down';
        const swappedKey = entry.swappedKeys[useAnim];
        if (swappedKey) {
            const animKey = `${swappedKey}_${useDir}`;
            if (scene.anims.exists(animKey)) entry.sprite.play(animKey, true);
        }
    }

    /** Canvas pixel remap — builds a recoloured copy of origKey as rcKey. */
    _buildSwappedTexture(scene, origKey, rcKey, swapParams) {
        const tex = scene.textures.get(origKey);
        if (!tex || tex.key === '__MISSING') return false;

        const src  = swapParams.sourceColors;
        const tgt  = swapParams.targetShades;
        const n    = src.length;
        const srcR = src.map(v => (v >> 16) & 0xff);
        const srcG = src.map(v => (v >>  8) & 0xff);
        const srcB = src.map(v =>  v        & 0xff);
        const tgtR = tgt.map(v => (v >> 16) & 0xff);
        const tgtG = tgt.map(v => (v >>  8) & 0xff);
        const tgtB = tgt.map(v =>  v        & 0xff);

        const w = tex.source[0].width, h = tex.source[0].height;
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(tex.source[0].image, 0, 0);

        const imgData = ctx.getImageData(0, 0, w, h);
        const data    = imgData.data;
        const THRESH  = 3 * 3 * 3;

        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] < 8) continue;
            const pr = data[i], pg = data[i + 1], pb = data[i + 2];
            let bestIdx = -1, bestDist = Infinity;
            for (let j = 0; j < n; j++) {
                const dr = pr - srcR[j], dg = pg - srcG[j], db = pb - srcB[j];
                const d  = dr * dr + dg * dg + db * db;
                if (d < bestDist) { bestDist = d; bestIdx = j; }
            }
            if (bestIdx >= 0 && bestDist <= THRESH) {
                data[i]     = tgtR[bestIdx];
                data[i + 1] = tgtG[bestIdx];
                data[i + 2] = tgtB[bestIdx];
            }
        }
        ctx.putImageData(imgData, 0, 0);
        scene.textures.addCanvas(rcKey, canvas);

        const newTex = scene.textures.get(rcKey);
        const cols   = Math.floor(w / 64);
        const rows   = Math.floor(h / 64);
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                newTex.add(r * cols + c, 0, c * 64, r * 64, 64, 64);
            }
        }
        return true;
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
        const useDir  = container._lpcDir  ?? 'down';
        // Try the container's current anim first, then walk as fallback
        let useAnim = container._lpcAnim ?? 'walk';
        let key     = texKey(layer, useAnim);
        if (!scene.textures.exists(key)) {
            useAnim = 'walk';
            key     = texKey(layer, 'walk');
        }
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
        container._lpcLayers[layerKey(layer)] = { sprite, layer, anim: useAnim };

        // Restart all layers together so the new sprite is in sync from frame 0
        this._resyncAll(container);
    }

    /** Restart all layer animations from frame 0 simultaneously (keeps them in sync) */
    _resyncAll(container) {
        const scene   = this._scene;
        const useAnim = container._lpcAnim ?? 'walk';
        const useDir  = container._lpcDir  ?? 'down';
        for (const entry of Object.values(container._lpcLayers)) {
            const baseKey = texKey(entry.layer, useAnim);
            const swpKey  = entry.swappedKeys?.[useAnim];
            const key     = (swpKey && scene.textures.exists(swpKey)) ? swpKey : baseKey;
            if (!scene.textures.exists(key)) continue;
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
        container._lpcLayers[layerKey(newLayer)] = { sprite, layer: newLayer, anim: useAnim };

        // Restart all layers together so the swapped sprite is in sync from frame 0
        this._resyncAll(container);
    }
}
