// Saving goes through amo's own SaveManager: the whole PlayerStats sheet, plus where the hero stands in 3D
// (stats.location = { map, x, y, z, facing }). Three slots (Phase 7): slot 1 keeps the original key, so older
// saves load as slot 1. The active slot is remembered per device (or ?slot=1|2|3).
import { SaveManager as SM } from '@rules';

const { SaveManager } = SM;
const STORY = '3d';
export const SLOTS = ['eldrin', 'slot2', 'slot3'];
const SLOT_KEY = 'amo3d.slot';

export function activeSlot() {
    const fromUrl = +new URLSearchParams(location.search).get('slot');
    if (fromUrl >= 1 && fromUrl <= SLOTS.length) return fromUrl - 1;
    try { const s = +localStorage.getItem(SLOT_KEY); return s >= 0 && s < SLOTS.length ? s : 0; } catch { return 0; }
}
export function setActiveSlot(i) { try { localStorage.setItem(SLOT_KEY, String(i)); } catch { /* storage blocked */ } }
const CHARACTER = () => SLOTS[activeSlot()];

export function hasSave(i = activeSlot()) {
    try { return SaveManager.hasSave(STORY, SLOTS[i]); } catch { return false; }
}

// Fills `stats` from the save; returns the saved location (or null).
export function loadGame(stats) {
    try { return SaveManager.load(stats, STORY, CHARACTER()) ? stats.location ?? null : null; }
    catch { return null; }
}

export function saveGame(stats, location) {
    stats.location = location;
    try { return SaveManager.save(stats, STORY, CHARACTER()); } catch { return false; }
}

export function deleteSave(i = activeSlot()) {
    try { SaveManager.deleteSave(STORY, SLOTS[i]); } catch { /* storage blocked */ }
}

// A slot's summary for the slots screen: who, how far, where, when.
const PLACES = { outdoor: 'Thaloria Glade', tower: "Eldrin's Tower", thaloria: 'Thaloria', east_road: 'The Thalorian Wilds', east_road_cave: 'The Hollow',
    summit_of_despair: 'Summit of Despair — the Approach', the_summit: 'Summit of Despair', sylvan_sanctuary: 'The Sylvan Sanctuary', whisper_wood: 'Whisper-Wood' };
export function slotInfo(i) {
    try {
        const raw = localStorage.getItem(`amo_save_${STORY}_${SLOTS[i]}`);
        if (!raw) return null;
        const d = JSON.parse(raw), map = d.location?.map;
        const place = PLACES[map] ?? (map ? map.replace(/^thaloria_/, 'Thaloria — ').replace(/_/g, ' ') : 'the beginning');
        const date = d.timestamp ? new Date(d.timestamp) : null;
        return { name: d.flags?.hero?.name ?? 'Eldrin', level: d.level ?? 1, place, when: date ? date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '' };
    } catch { return null; }
}
export const firstEmptySlot = () => SLOTS.findIndex((_, i) => !hasSave(i));
