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

// Flip to true to surface "texture not loaded" diagnostics. Off by default so the
// expected misses (a layer simply not shipping an animation) don't flood the console.
const DEBUG = false;
function warn(...args) { if (DEBUG) console.warn(...args); }

// Directions and their row indices in a 4-row spritesheet
const DIR_ROW = { up: 0, left: 1, down: 2, right: 3 };

// These types use  type/id/anim/{itemname}.png  (item name = last segment of id)
const WEAPON_TYPES = new Set(['weapon']);

// These types use  type/id/anim/{color}.png  (color stored in layer.color)
export const COLOR_TYPES = new Set(['cape', 'backpack']);

// Logical animations the creator/preview works in. Per layer these are resolved
// to the concrete file a layer actually ships (see ANIM_ALIASES / resolveAnim) —
// e.g. a Vitruvius weapon realises the logical 'slash' as its 'attack_slash' file.
export const DEFAULT_ANIMS = [
    'walk', 'idle', 'hurt', 'slash', 'backslash', 'halfslash', 'thrust', 'shoot', 'spellcast',
    'run', 'sit', 'jump', 'climb', 'combat_idle', 'emote',
];

// Logical anim → ordered list of concrete file names that satisfy it. Universal
// LPC names come first; Vitruvius "attack_*" exports are the fallbacks. A layer
// resolves to the first candidate present in its manifest (layer.anims).
export const ANIM_ALIASES = {
    slash:     ['slash', 'attack_slash'],
    backslash: ['backslash', 'attack_backslash', 'attack_slash_reverse'],
    halfslash: ['halfslash', 'attack_halfslash'],
    thrust:    ['thrust', 'attack_thrust'],
};

/**
 * Resolve a logical animation to the concrete file name a layer actually has.
 * Returns null when the layer ships no file for that motion. Layers without a
 * manifest (`layer.anims`) fall back to the literal name (legacy behaviour).
 */
export function resolveAnim(layer, logical) {
    const candidates = ANIM_ALIASES[logical] ?? [logical];
    if (!layer.anims) return candidates[0];
    for (const c of candidates) if (layer.anims.includes(c)) return c;
    return null;
}

/** Concrete anim names a layer needs loaded to cover a logical anim set (deduped). */
function concreteAnimsFor(layer, logicalAnims) {
    const out = new Set();
    for (const logical of logicalAnims) {
        const c = resolveAnim(layer, logical);
        if (c) out.add(c);
    }
    // Walk is the universal fallback for layers that lack a requested motion.
    const walk = resolveAnim(layer, 'walk');
    if (walk) out.add(walk);
    return out;
}

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
        if (found) {
            if (rows < 4) return { up: r, left: r, down: r, right: r };
            return r < 4 ? DIR_ROW : { up: r, left: r, down: r, right: r };
        }
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
 * Scan each row and return a Set of row indices that contain at least one opaque pixel.
 * Result is cached on tex.customData.contentRows so we only scan once per texture.
 */
function getContentRows(tex, fw, fh) {
    if (tex.customData?.contentRows) return tex.customData.contentRows;

    const src  = tex.source[0];
    const img  = src.image || src.canvas;
    const rows = Math.floor(src.height / fh);
    const w    = src.width;
    const set  = new Set();

    if (!img) {
        for (let r = 0; r < rows; r++) set.add(r);
    } else {
        const tmp = document.createElement('canvas');
        tmp.width  = w;
        tmp.height = fh;
        const ctx  = tmp.getContext('2d', { willReadFrequently: true });
        for (let r = 0; r < rows; r++) {
            ctx.clearRect(0, 0, w, fh);
            ctx.drawImage(img, 0, r * fh, w, fh, 0, 0, w, fh);
            const data = ctx.getImageData(0, 0, w, fh).data;
            for (let i = 3; i < data.length; i += 4) {
                if (data[i] > 8) { set.add(r); break; }
            }
        }
    }

    if (!tex.customData) tex.customData = {};
    tex.customData.contentRows = set;
    return set;
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


/**
 * Register (or resize) every spritesheet frame on a texture at a given frame
 * size. `addCanvas` only creates frame 0, so recoloured/oversize canvases need
 * their frames laid out explicitly. Also stamps customData so ensureAnims and
 * ensureCorrectFrameSize treat the texture as already-correct.
 */
export function registerSheetFrames(tex, fw, fh) {
    if (!tex || tex.key === '__MISSING') return;
    const w = tex.source[0].width, h = tex.source[0].height;
    const cols = Math.floor(w / fw), rows = Math.floor(h / fh);
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const idx = r * cols + c;
            if (tex.frames[idx]) tex.frames[idx].setSize(fw, fh, c * fw, r * fh);
            else                 tex.add(idx, 0, c * fw, r * fh, fw, fh);
        }
    }
    if (!tex.customData) tex.customData = {};
    tex.customData.framesPatched = true;
    tex.customData.frameW = fw;
    tex.customData.frameH = fh;
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

        const frameStart   = rowIdx * cols + colStart;
        const contentRows  = getContentRows(tex, fw, fh);

        // Skip directions whose row either doesn't exist in the texture or is
        // entirely transparent (e.g. longsword behind-layer has no DOWN content).
        // Phaser silently falls back to frame 0 for missing indices, which always
        // shows the UP row — creating these animations causes the sticking bug.
        if (!tex.frames[frameStart] || !contentRows.has(rowIdx)) {
            if (scene.anims.exists(animKey)) scene.anims.remove(animKey);
            return;
        }

        // Rebuild stale cached animations (frame count, start-frame, AND frameRate must match)
        const expectedRate = animName === 'idle' ? 2 : animName === 'slash' ? 11 : 8;
        if (scene.anims.exists(animKey)) {
            const ex = scene.anims.get(animKey);
            if (ex.frames.length === frameCount &&
                Number(ex.frames[0]?.textureFrame) === frameStart &&
                ex.frameRate === expectedRate) return;
            scene.anims.remove(animKey);
        }
        const frames = Array.from({ length: frameCount }, (_, i) => ({
            key, frame: frameStart + i * step,
        }));

        scene.anims.create({
            key:       animKey,
            frames,
            frameRate: expectedRate,
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
            for (const anim of concreteAnimsFor(layer, anims)) {
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
            // Pick any loaded texture to seed the sprite; _layerTarget then drives
            // the correct concrete anim/direction (and visibility) below.
            const startConcrete = resolveAnim(layer, startAnim);
            let initKey = startConcrete ? texKey(layer, startConcrete) : null;
            if (!initKey || !scene.textures.exists(initKey)) {
                const walk = resolveAnim(layer, 'walk');
                initKey = walk ? texKey(layer, walk) : null;
            }
            if (!initKey || !scene.textures.exists(initKey)) {
                warn(`[CharacterRenderer] texture not loaded: ${layerKey(layer)} @ ${startAnim}`);
                continue;
            }

            const sprite = scene.add.sprite(0, 0, initKey, 0);
            container.add(sprite);
            const entry = { sprite, layer, anim: startAnim };
            container._lpcLayers[layerKey(layer)] = entry;

            const t = this._layerTarget(entry, startAnim, startDir);
            if (t) { sprite.play(t.animKey); entry.anim = t.effAnim; }
            else   { sprite.setVisible(false); }
        }

        return container;
    }

    /**
     * Resolve what a single layer should display for a (logical anim, direction).
     * Returns { key, animKey, effAnim } to play, or null when the layer should be
     * hidden — e.g. it ships no file for the motion AND none for walk, or its
     * resolved animation simply has no frames for this direction (a real asset
     * gap such as a weapon with no up-facing slash). We deliberately do NOT fall
     * back to a walk pose mid-action: a sword frozen in a walk stance during a
     * slash reads as broken, so hiding is the honest choice.
     */
    _layerTarget(entry, useAnim, useDir) {
        const scene = this._scene;
        const { layer } = entry;
        const texOk = (k) => k && scene.textures.exists(k) && scene.textures.get(k)?.key !== '__MISSING';

        // 1. Resolve the requested motion to a concrete file this layer ships.
        let effAnim  = resolveAnim(layer, useAnim);
        let isAction = !!(effAnim && texOk(texKey(layer, effAnim)));
        if (!isAction) {
            // Layer has no file for this motion — track movement via walk instead
            // (keeps clothing/body-parts present during idle, spellcast, etc.).
            effAnim = resolveAnim(layer, 'walk') ?? 'walk';
            if (!texOk(texKey(layer, effAnim))) return null;
        }

        // 2. Prefer a palette-swapped texture when one exists for this anim.
        const swp = entry.swappedKeys?.[effAnim];
        const key = (swp && texOk(swp)) ? swp : texKey(layer, effAnim);

        ensureAnims(scene, key, effAnim);
        const animKey = `${key}_${useDir}`;
        if (!scene.anims.exists(animKey)) return null; // direction row empty → hide
        return { key, animKey, effAnim };
    }

    /**
     * Play an animation on all layers of a container.
     * @param {string} [anim]  logical animation name, e.g. 'walk', 'slash'
     * @param {string} [dir]   direction: 'up' | 'left' | 'down' | 'right'
     */
    play(container, anim, dir) {
        const useAnim = anim ?? container._lpcAnim ?? 'walk';
        const useDir  = dir  ?? container._lpcDir  ?? 'down';

        for (const entry of Object.values(container._lpcLayers)) {
            const t = this._layerTarget(entry, useAnim, useDir);
            if (!t) { entry.sprite.setVisible(false); entry.anim = useAnim; continue; }
            entry.sprite.setVisible(true);
            if (entry.sprite.anims.currentAnim?.key !== t.animKey || !entry.sprite.anims.isPlaying) {
                entry.sprite.play(t.animKey, true);
            }
            entry.anim = t.effAnim;
        }

        container._lpcAnim = useAnim;
        container._lpcDir  = useDir;
    }

    /** Max frame count (per direction row) across layers for the current anim */
    frameCount(container) {
        const useAnim = container._lpcAnim ?? 'walk';
        let max = 1;
        for (const entry of Object.values(container._lpcLayers)) {
            const concrete = resolveAnim(entry.layer, useAnim) ?? resolveAnim(entry.layer, 'walk');
            if (!concrete) continue;
            const tex = this._scene.textures.get(texKey(entry.layer, concrete));
            if (!tex || tex.key === '__MISSING') continue;
            ensureCorrectFrameSize(tex);
            const fw   = tex.customData?.frameW ?? FRAME_W;
            const cols = Math.floor(tex.source[0].width / fw);
            if (cols > max) max = cols;
        }
        return max;
    }

    /** Pause all layer sprites and show a specific frame index within current dir row */
    freezeFrame(container, frameIdx) {
        const scene   = this._scene;
        const useAnim = container._lpcAnim ?? 'walk';
        const dir     = container._lpcDir  ?? 'down';

        for (const entry of Object.values(container._lpcLayers)) {
            const { sprite } = entry;
            sprite.anims.stop();

            // Resolve the same concrete anim / swapped texture / visibility the
            // playing path would use — so a paused oversize weapon shows the right
            // 192px frame (not a 64px mis-slice) and a tinted layer keeps its colour.
            const t = this._layerTarget(entry, useAnim, dir);
            if (!t) { sprite.setVisible(false); continue; }

            const tex = scene.textures.get(t.key);
            if (!tex || tex.key === '__MISSING') { sprite.setVisible(false); continue; }
            ensureCorrectFrameSize(tex);

            const fw      = tex.customData?.frameW ?? FRAME_W;
            const fh      = tex.customData?.frameH ?? FRAME_H;
            const cols    = Math.floor(tex.source[0].width  / fw);
            const rows    = Math.floor(tex.source[0].height / fh);
            const rowIdx  = rows === 4 ? DIR_ROW[dir] : 0;
            const clamped = Phaser.Math.Clamp(frameIdx, 0, cols - 1);

            sprite.setVisible(true);
            if (sprite.texture.key !== t.key) sprite.setTexture(t.key);
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

        // Key swappedKeys by the CONCRETE anim name (what texKey/_layerTarget use),
        // resolving each logical anim to the file this layer actually ships.
        for (const logical of DEFAULT_ANIMS) {
            const concrete = resolveAnim(layer, logical);
            if (!concrete) continue;
            const origKey = texKey(layer, concrete);
            if (!scene.textures.exists(origKey)) continue;
            const rcKey = `${origKey}__rc_${swapParams.sourceKey}_${safe}`;
            if (!scene.textures.exists(rcKey)) {
                if (!this._buildSwappedTexture(scene, origKey, rcKey, swapParams)) continue;
            }
            ensureAnims(scene, rcKey, concrete);
            entry.swappedKeys[concrete] = rcKey;
        }

        // Refresh sprite if it's currently showing this layer's animation
        const useAnim    = container._lpcAnim ?? 'walk';
        const useDir     = container._lpcDir  ?? 'down';
        const concreteUse = resolveAnim(layer, useAnim);
        const swappedKey = concreteUse ? entry.swappedKeys[concreteUse] : null;
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

        // Register frames at the SAME geometry as the source (handles oversize
        // 128/192px weapon sheets, not just 64px) so the recolour stays aligned.
        ensureCorrectFrameSize(tex);
        registerSheetFrames(scene.textures.get(rcKey),
            tex.customData?.frameW ?? FRAME_W, tex.customData?.frameH ?? FRAME_H);
        return true;
    }

    /** Returns true if every concrete animation this layer needs is already loaded */
    isLayerLoaded(layer, anims = DEFAULT_ANIMS) {
        for (const a of concreteAnimsFor(layer, anims)) {
            if (!this._scene.textures.exists(texKey(layer, a))) return false;
        }
        return true;
    }

    /**
     * Load multiple layers in one batch — fires onDone() once when all textures are ready.
     * Safe to call at any time after preload; skips already-loaded textures.
     */
    loadLayers(layers, anims = DEFAULT_ANIMS, onDone = () => {}) {
        const scene = this._scene;
        let queued  = false;
        for (const layer of layers) {
            for (const anim of concreteAnimsFor(layer, anims)) {
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
        const concrete = [...concreteAnimsFor(layer, anims)];
        const needed  = concrete.filter(a => !scene.textures.exists(texKey(layer, a)));
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
        // Destroy any sprite already registered at this key first. Without this an
        // overlapping/async add (e.g. rapid weapon equips) would overwrite the
        // _lpcLayers entry and leave the old sprite orphaned in the container —
        // never updated by play(), so it stays frozen on its last frame/direction.
        const lkey = layerKey(layer);
        if (container._lpcLayers[lkey]) this.removeLayer(container, lkey);
        // Seed the sprite with any loaded texture for this layer; _resyncAll then
        // drives the correct concrete anim/direction/visibility.
        const concrete = resolveAnim(layer, useAnim);
        let initKey = concrete ? texKey(layer, concrete) : null;
        if (!initKey || !scene.textures.exists(initKey)) {
            const walk = resolveAnim(layer, 'walk');
            initKey = walk ? texKey(layer, walk) : null;
        }
        if (!initKey || !scene.textures.exists(initKey)) {
            warn(`[CharacterRenderer] addLayer: texture not loaded: ${layerKey(layer)}`);
            return;
        }

        const sprite = scene.add.sprite(0, 0, initKey, 0);

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
        container._lpcLayers[lkey] = { sprite, layer, anim: useAnim };

        // Restart all layers together so the new sprite is in sync from frame 0
        this._resyncAll(container);
    }

    /** Restart all layer animations from frame 0 simultaneously (keeps them in sync) */
    _resyncAll(container) {
        const useAnim = container._lpcAnim ?? 'walk';
        const useDir  = container._lpcDir  ?? 'down';

        for (const entry of Object.values(container._lpcLayers)) {
            const t = this._layerTarget(entry, useAnim, useDir);
            if (!t) { entry.sprite.setVisible(false); continue; }
            entry.sprite.setVisible(true);
            entry.sprite.play(t.animKey);   // no `true` → always restart from frame 0
            entry.anim = t.effAnim;
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
        const concrete = resolveAnim(newLayer, useAnim);
        let key = concrete ? texKey(newLayer, concrete) : null;
        if (!key || !scene.textures.exists(key)) {
            const walk = resolveAnim(newLayer, 'walk');
            key = walk ? texKey(newLayer, walk) : null;
        }

        if (!key || !scene.textures.exists(key)) {
            warn(`[CharacterRenderer] replaceLayer: texture not loaded: ${layerKey(newLayer)}`);
            return;
        }

        sprite.setTexture(key, 0);

        delete container._lpcLayers[oldLayerKey];
        container._lpcLayers[layerKey(newLayer)] = { sprite, layer: newLayer, anim: useAnim };

        // Restart all layers together so the swapped sprite is in sync from frame 0
        this._resyncAll(container);
    }
}
