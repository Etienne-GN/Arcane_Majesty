// Consumable hotbar: four slots on keys 1–4. A slot remembers its item even
// when you have none left (it greys out); one shared cooldown stops double use.
// Pure — tools/test_phase3_economy.mjs.
import { ITEMS } from '../data/items.js';

export const HOTBAR_SIZE = 4;
export const HOTBAR_COOLDOWN_MS = 1000;
// Items whose use opens a lore dialogue are read from the Inventory only.
const READ_ONLY = new Set(['ancient_scroll', 'eldritch_tome']);

export function canHotbar(itemId) {
    const def = ITEMS[itemId];
    return !!def && !def.slot && !def.manualOf && typeof def.onUse === 'function' && !READ_ONLY.has(itemId);   // manuals: read from the Inventory
}

export function assignHotbar(stats, i, itemId) {
    if (!Number.isInteger(i) || i < 0 || i >= HOTBAR_SIZE) return false;
    if (itemId !== null && !canHotbar(itemId)) return false;
    stats.hotbar ??= Array(HOTBAR_SIZE).fill(null);
    if (itemId !== null) stats.hotbar = stats.hotbar.map(id => (id === itemId ? null : id));
    stats.hotbar[i] = itemId;
    return true;
}

export function hotbarView(stats) {
    return (stats.hotbar ?? []).map(id => {
        if (!id) return null;
        const def = ITEMS[id] ?? {};
        const count = stats.countItem(id);
        return { id, name: def.name ?? id, icon: def.icon ?? null, color: def.color ?? 0x8855ff, count, ready: count > 0 };
    });
}

// `now` in ms (scene time). The cooldown lives on stats but is never saved.
export function useHotbar(stats, i, now) {
    const id = stats.hotbar?.[i];
    if (!id) return { ok: false, reason: 'empty' };
    if (stats.countItem(id) <= 0) return { ok: false, reason: 'none' };
    if (now < (stats._hotbarReadyAt ?? 0)) return { ok: false, reason: 'cooldown' };
    if (!stats.useItem(id)) return { ok: false, reason: 'refused' };
    stats._hotbarReadyAt = now + HOTBAR_COOLDOWN_MS;
    return { ok: true, id };
}
