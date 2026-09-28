import type { Sheet, SpriteEntry, HitBox, Layer } from './api';

/**
 * The box a hitbox is relative to: the sprite's own size, or for an
 * animation its largest frame (each frame drawn bottom-centred in it, the
 * same way the game places it). Mirrors spriteSize in server/physicsStore.js.
 */
export function spriteSize(sheet: Sheet, entry: SpriteEntry): { w: number; h: number } {
    if ((entry.frames?.length ?? 0) > 1) {
        return { w: Math.max(...entry.frames!.map(f => f.w)), h: Math.max(...entry.frames!.map(f => f.h)) };
    }
    if (entry.kind === 'tile') return { w: sheet.gridTileWidth!, h: sheet.gridTileHeight! };
    return { w: entry.w!, h: entry.h! };
}

/** Pixel box of the still image to draw (first frame for animations). */
export function stillBox(sheet: Sheet, entry: SpriteEntry) {
    if ((entry.frames?.length ?? 0) > 1) return entry.frames![0];
    if (entry.kind === 'tile') {
        return { x: entry.col! * sheet.gridTileWidth!, y: entry.row! * sheet.gridTileHeight!, w: sheet.gridTileWidth!, h: sheet.gridTileHeight! };
    }
    return { x: entry.x!, y: entry.y!, w: entry.w!, h: entry.h! };
}

// Quick presets for the editor.
export function fullBox(size: { w: number; h: number }): HitBox {
    return { x: 0, y: 0, w: size.w, h: size.h };
}
/** Bottom third, middle 60% of the width: the footprint of a tree trunk, pillar or barrel. */
export function baseBox(size: { w: number; h: number }): HitBox {
    const h = Math.max(1, Math.round(size.h / 3));
    const w = Math.max(1, Math.round(size.w * 0.6));
    return { x: Math.floor((size.w - w) / 2), y: size.h - h, w, h };
}

export const LAYER_LABELS: Record<Layer, { icon: string; label: string; hint: string }> = {
    under: { icon: '⬇', label: 'Under characters', hint: 'floors, rugs, puddles, bridges — always drawn below' },
    sorted: { icon: '↕', label: 'Sorted', hint: 'trees, barrels, walls — behind or in front depending on who is lower on screen' },
    over: { icon: '⬆', label: 'Over characters', hint: 'canopies, roof edges, arch tops — always drawn above' },
};
