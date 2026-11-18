// Cooking hearths and alchemy tables: which recipes need a station (and what
// rank), craft ranks from craft counts, the double-output roll.
// Pure — tools/test_phase3_economy.mjs.

export const STATION_LABELS = { hearth: 'Cooking Hearth', alchemy: 'Alchemy Table' };
export const CRAFT_KIND = { cook: 'cooking', brew: 'alchemy' };
const KIND_STATION = { cooking: 'hearth', alchemy: 'alchemy' };

// Feasts and three-plus-ingredient dishes need a hearth; greater potions and
// elixirs an alchemy table. Everything else stays at the campfire.
export const STATION_RECIPES = {
    hunters_feast:         { station: 'hearth', rank: 1 },
    herb_crusted_rabbit:   { station: 'hearth', rank: 1 },
    herb_mushroom_pie:     { station: 'hearth', rank: 1 },
    lucky_rabbit_stew:     { station: 'hearth', rank: 1 },
    boar_mushroom_stew:    { station: 'hearth', rank: 1 },
    tidewater_chowder:     { station: 'hearth', rank: 1 },
    mushroom_risotto:      { station: 'hearth', rank: 1 },
    hearty_stew:           { station: 'hearth', rank: 2 },
    anglers_platter:       { station: 'hearth', rank: 2 },
    grand_feast:           { station: 'hearth', rank: 2 },
    greater_health_potion: { station: 'alchemy', rank: 1 },
    greater_mana_potion:   { station: 'alchemy', rank: 1 },
    regen_potion:          { station: 'alchemy', rank: 1 },
    double_down_elixir:    { station: 'alchemy', rank: 2 },
    moonpetal_elixir:      { station: 'alchemy', rank: 2 },
    moonveil_tonic:        { station: 'alchemy', rank: 2 },
    deepwater_elixir:      { station: 'alchemy', rank: 3 },
    clarity_elixir:        { station: 'alchemy', rank: 3 },
};

export function recipeStation(recipe) {
    return STATION_RECIPES[recipe.output] ?? null;
}

export function craftRank(count) {
    return count >= 75 ? 3 : count >= 25 ? 2 : 1;
}

export function extraOutput(rank, rng = Math.random) {
    const chance = rank >= 3 ? 0.30 : rank === 2 ? 0.15 : 0;
    return rng() < chance;
}

// Recipes a fire (where.station null) or a station of where.rank can make from
// `list` (COOKING_RECIPES with kind 'cooking', POTION_RECIPES with 'alchemy').
// Scroll-locked recipes (isLocked, data/recipeScrolls.js) are dropped unless known.
export function availableRecipes(list, kind, where, knownRecipes = [], isLocked = () => false) {
    const known = new Set(knownRecipes);
    return list.filter(r => {
        if (isLocked(r.output) && !known.has(r.output)) return false;
        const st = recipeStation(r);
        if (!where.station) return !st;
        if (where.station !== KIND_STATION[kind]) return false;
        return !st || (st.station === where.station && st.rank <= where.rank);
    });
}
