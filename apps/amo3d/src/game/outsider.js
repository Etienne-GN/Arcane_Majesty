// The outsider (docs/3d/WORLD_PLAN.md, "Outsider start"): a hero of your own whose people belong to the other world.
// A Nythorian (or a Fallen Aurorian) is at home under the eclipse; a Human, an Aurorian or a Werewolf in Eldoria.
// On the other world they are an Outlander:
//   distrust      — traders there charge them +25%
//   the world     — health comes back 25% slower (Eldorians under the eclipse; Nythorians in Eldoria's harsh sun)
//   rewards       — +10% experience from what they defeat there, and the title "Outlander" the first time they arrive
// (Eldrin, the campaign's own hero, is at home in Eldoria.) Numbers proposed 2026-11-25, to tune with the user.
const HOME = { nythorian: 'nythoria', fallen_aurorian: 'nythoria' };
export const OUTSIDER = { price: 1.25, regen: 0.75, xp: 1.1 };

let worldId = null, home = 'eldoria';
export function setHero(heroDef) { home = HOME[heroDef?.look?.body?.race] ?? 'eldoria'; }
export function setWorld(id) { worldId = id; }
export const homeWorld = () => home;
// Only the two worlds count (interiors, dungeons and story maps keep you as you are)
export const isOutsider = () => (worldId === 'eldoria' || worldId === 'nythoria') && worldId !== home;
export const priceK = () => (isOutsider() ? OUTSIDER.price : 1);
export const regenK = () => (isOutsider() ? OUTSIDER.regen : 1);
export const xpK = () => (isOutsider() ? OUTSIDER.xp : 1);
