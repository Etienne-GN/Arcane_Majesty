// The Library's clones (2026-11-27, LIBRARY_PLAN phase 2): src/content/library/<id>.json — { id, base, cls, name, scale,
// stats?, created } — a copy of a built-in entry (base: its Library id) with what was changed. The game reads them where
// it reads their base kind: a cloned monster is a beast kind of its own (a region's { type: 'beasts', kind: '<clone id>' }).
const FILES = import.meta.glob('./library/*.json', { eager: true, import: 'default' });
export const CLONES = Object.fromEntries(Object.values(FILES).filter(c => c?.id && c.base).map(c => [c.id, c]));
// an original's own colours (the Library's palette saved on a built-in entry): recolor_<id>.json — { id, of, colors }
export const RECOLORS = Object.fromEntries(Object.values(FILES).filter(c => c?.of && c.colors).map(c => [c.of, c.colors]));
// a clone of a monster: its base beast kind (the Library id of a monster is its kind)
export function beastClone(kind) { const c = CLONES[kind]; return c && c.cls?.[0] === 'Creatures' ? c : null; }
