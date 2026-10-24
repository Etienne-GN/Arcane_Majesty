// W4: the townsfolk look sheet — walk, idle and sit only, baked from the LPC Forge
// (v2/bake.html), 64 px cells, 9 columns. Each motion takes 4 rows: up, left, down,
// right. Walk keeps the standing pose in column 0 (frames 1–8 animate). Used by the
// bake page and TownsfolkManager.
export const LOOK_CELL = 64;
export const LOOK_COLS = 9;
export const LOOK_DIRS = ['up', 'left', 'down', 'right'];
export const LOOK_MOTIONS = {
    walk: { row: 0, frames: 8, first: 1 },
    idle: { row: 4, frames: 2, first: 0 },
    sit:  { row: 8, frames: 3, first: 0 },
};
export const LOOK_SIZE = { w: LOOK_COLS * LOOK_CELL, h: 12 * LOOK_CELL };
// Of the three sit poses, the one held while seated (checked on a baked sheet, Task 4).
export const SIT_FRAME = 2;

export function lookFrames(motion, dir) {
    const m = LOOK_MOTIONS[motion], row = m.row + LOOK_DIRS.indexOf(dir);
    return Array.from({ length: m.frames }, (_, i) => row * LOOK_COLS + m.first + i);
}
export const lookKey = id => `tf_${id}`;
