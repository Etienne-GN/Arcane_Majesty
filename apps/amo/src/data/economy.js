// Currency roles (gold = mundane, glint = arcane), shop prices and the
// buy-back list. Pure — tools/test_phase3_economy.mjs.
// items.js must never import this file (economy.js imports items.js).
import { ITEMS, POTION_RECIPES } from './items.js';

const POTIONS = new Set(['health_potion', 'mana_potion', ...POTION_RECIPES.map(r => r.output)]);
const ARCANE_WEAPONS = new Set(['staff', 'spell_blade', 'umbral_dagger']);
const ARCANE_RARITY = new Set(['rare', 'epic', 'legendary']);
const ARCANE_ITEMS = new Set(['ancient_scroll', 'eldritch_tome']);

export function itemCurrency(itemId) {
    const def = ITEMS[itemId];
    if (!def) return 'gold';
    if (POTIONS.has(itemId) || ARCANE_ITEMS.has(itemId) || itemId.startsWith('recipe_')) return 'glint';
    if (def.slot === 'weapon' && ARCANE_WEAPONS.has(def.weaponType)) return 'glint';
    if (def.enchant || ARCANE_RARITY.has(def.rarity)) return 'glint';
    return 'gold';
}

// 20% off when the map favours the item's currency (rural → gold, outskirt → glint).
export function shopPrice(entry, bias) {
    const favoured = (bias === 'rural' && entry.currency === 'gold') || (bias === 'outskirt' && entry.currency === 'glint');
    return favoured ? Math.round(entry.price * 0.8) : entry.price;
}

export const BUYBACK_MAX = 10;
export function recordSale(list, sale) {
    list.unshift(sale);
    if (list.length > BUYBACK_MAX) list.length = BUYBACK_MAX;
    return list;
}
