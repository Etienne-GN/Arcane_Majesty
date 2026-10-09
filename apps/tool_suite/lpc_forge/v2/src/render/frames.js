/**
 * Pure frame geometry for LPC sheets — mirrors the game's CharacterRenderer
 * rules (4-row sheets, oversize 128/192/256 px frames, 1-row hurt/climb,
 * walk standing-frame skip). Vitruvius "extended" interleaved sheets are not
 * in the curated catalogue and are out of scope here.
 */
import { walkSkip } from '../../../../../amo/src/systems/lpcLayout.js';

export const DIRS = ['up', 'left', 'down', 'right'];
const CELL = 64;

/** Frame edge in px: a 4-row sheet of 64/128/192/256 px frames, else a 1-row sheet. */
export function frameSizeOf(w, h) {
    for (const fs of [64, 128, 192, 256]) if (h === fs * 4 && w % fs === 0) return fs;
    return h;
}

/**
 * Which row and columns hold `anim` facing `dir` on a w×h sheet. Oversize sheets
 * can carry trailing empty columns; like the game, they stop at `activeCols`
 * (index of the first fully empty column) when given.
 */
export function frameGeometry(anim, dir, w, h, activeCols) {
    const fs = frameSizeOf(w, h);
    const rows = Math.round(h / fs);
    const all = Math.floor(w / fs);
    const cols = fs > CELL && activeCols != null ? Math.min(all, activeCols) : all;
    const row = rows === 4 ? DIRS.indexOf(dir) : 0;
    const colStart = walkSkip(anim, cols);
    return { fs, rows, cols, row, colStart, count: cols - colStart };
}

/** Source rect of frame i (wrapping) and the offset that centres it on a 64 px cell. */
export function frameRect(geom, i) {
    const col = geom.colStart + (((i % geom.count) + geom.count) % geom.count);
    const off = -(geom.fs - CELL) / 2;
    return { sx: col * geom.fs, sy: geom.row * geom.fs, sw: geom.fs, sh: geom.fs, dx: off, dy: off };
}
