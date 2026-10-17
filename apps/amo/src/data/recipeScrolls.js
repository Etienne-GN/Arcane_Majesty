// Recipe scrolls: rare recipes stay hidden until their scroll is read.
// Pure — tools/test_phase3_economy.mjs. items.js imports this file (never the reverse).

export const SCROLL_RECIPES = [
    'grand_feast', 'hearty_stew', 'anglers_platter', 'herb_mushroom_pie', 'spectral_broth',
    'clarity_elixir', 'deepwater_elixir', 'moonveil_tonic', 'double_down_elixir', 'wildfire_tonic', 'void_tonic', 'moonpetal_elixir',
];
const LOCKED = new Set(SCROLL_RECIPES);
export const ELITE_SCROLL_CHANCE = 0.12;

export const scrollId = output => `recipe_${output}`;
export const isLocked = output => LOCKED.has(output);

// Item defs for every scroll; `labels` maps recipe output → its recipe label.
export function scrollItems(labels) {
    return Object.fromEntries(SCROLL_RECIPES.map(out => {
        const id = scrollId(out), label = labels[out] ?? out;
        return [id, {
            id, name: `Recipe: ${label}`,
            description: `Teaches the recipe for ${label}. Read it to learn it for good.`,
            color: 0xd8c48a, icon: 'itm_scroll', stackable: false, rarity: 'rare', buyPrice: 0, sellPrice: 25,
            onUse: (stats) => stats.learnRecipe(out),
        }];
    }));
}

// An elite's chance at a scroll the player neither knows nor carries yet.
export function rollEliteScroll(rng, knownRecipes = [], carriedIds = []) {
    if (rng() >= ELITE_SCROLL_CHANCE) return null;
    const known = new Set(knownRecipes), carried = new Set(carriedIds);
    const left = SCROLL_RECIPES.filter(o => !known.has(o) && !carried.has(scrollId(o)));
    return left.length ? scrollId(left[Math.floor(rng() * left.length)]) : null;
}
