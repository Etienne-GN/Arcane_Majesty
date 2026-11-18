// Saving goes through amo's own SaveManager: the whole PlayerStats sheet, plus where the hero stands in 3D
// (stats.location = { map, x, y, z, facing }). Saves are a free list (amo3d.saves: [{ id, label }], in the
// player's order): add, copy, label, reorder, delete. A save with no label shows its id. The first save keeps
// the original key 'eldrin', and the old fixed slots ('slot2', 'slot3') join the list if they hold a save.
import { SaveManager as SM } from '@rules';

const { SaveManager } = SM;
const STORY = '3d', LIST_KEY = 'amo3d.saves', ACTIVE_KEY = 'amo3d.slot';
const keyOf = id => `amo_save_${STORY}_${id}`;
const store = {
    get: k => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* storage blocked */ } },
    del: k => { try { localStorage.removeItem(k); } catch { /* storage blocked */ } },
};

export function listSaves() {
    let list = null;
    try { list = JSON.parse(store.get(LIST_KEY) ?? 'null'); } catch { list = null; }
    if (!Array.isArray(list) || !list.length) {   // first run of the list: one save, plus any old slot that holds a game
        list = [{ id: 'eldrin', label: '' }];
        for (const id of ['slot2', 'slot3']) if (store.get(keyOf(id))) list.push({ id, label: '' });
        writeList(list);
    }
    return list;
}
const writeList = list => store.set(LIST_KEY, JSON.stringify(list));
const newId = () => Math.random().toString(36).slice(2, 7);

export function activeSlot() {
    const list = listSaves(), fromUrl = new URLSearchParams(location.search).get('save');
    if (fromUrl && list.some(s => s.id === fromUrl)) return fromUrl;
    const id = store.get(ACTIVE_KEY);
    return list.some(s => s.id === id) ? id : list[0].id;
}
export function setActiveSlot(id) { store.set(ACTIVE_KEY, id); }

export function hasSave(id = activeSlot()) { return !!store.get(keyOf(id)); }
export function loadGame(stats) {
    try { return SaveManager.load(stats, STORY, activeSlot()) ? stats.location ?? null : null; } catch { return null; }
}
export function saveGame(stats, location) {
    stats.location = location;
    try { return SaveManager.save(stats, STORY, activeSlot()); } catch { return false; }
}

// ---- managing the list ----
export function addSave(label = '') {
    const list = listSaves(), entry = { id: newId(), label };
    list.push(entry); writeList(list);
    return entry.id;
}
export function copySave(id) {
    const list = listSaves(), i = list.findIndex(s => s.id === id);
    if (i < 0) return null;
    const entry = { id: newId(), label: list[i].label ? `${list[i].label} (copy)` : `${id} (copy)` };
    const raw = store.get(keyOf(id));
    if (raw) store.set(keyOf(entry.id), raw.replace(/"characterId":"[^"]*"/, `"characterId":"${entry.id}"`));
    list.splice(i + 1, 0, entry); writeList(list);
    return entry.id;
}
export function labelSave(id, label) {
    const list = listSaves(), s = list.find(x => x.id === id);
    if (s) { s.label = String(label ?? '').trim().slice(0, 40); writeList(list); }
}
export function moveSave(id, dir) {
    const list = listSaves(), i = list.findIndex(s => s.id === id), j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]]; writeList(list);
}
export function deleteSave(id = activeSlot(), { keepEntry = false } = {}) {
    store.del(keyOf(id));
    if (keepEntry) return;
    let list = listSaves().filter(s => s.id !== id);
    if (!list.length) list = [{ id: newId(), label: '' }];   // there is always one save in the list
    writeList(list);
    if (store.get(ACTIVE_KEY) === id) setActiveSlot(list[0].id);
}
export const firstEmptySlot = () => listSaves().find(s => !hasSave(s.id))?.id ?? null;

// A save's summary for the list: its name (label or id), who, how far, where, when.
const PLACES = { outdoor: 'Thaloria Glade', tower: "Eldrin's Tower", thaloria: 'Thaloria', east_road: 'The Thalorian Wilds', east_road_cave: 'The Hollow',
    summit_of_despair: 'Summit of Despair — the Approach', the_summit: 'Summit of Despair', sylvan_sanctuary: 'The Sylvan Sanctuary', whisper_wood: 'Whisper-Wood',
    thaloria_inn: 'Thaloria — the Inn', thaloria_house_noble_c: 'Your house' };
export function slotInfo(id) {
    const entry = listSaves().find(s => s.id === id), name = entry?.label || id;
    try {
        const raw = store.get(keyOf(id));
        if (!raw) return { name, empty: true };
        const d = JSON.parse(raw), map = d.location?.map;
        const place = PLACES[map] ?? (map ? map.replace(/^thaloria_/, 'Thaloria — ').replace(/_/g, ' ') : 'the beginning');
        const date = d.timestamp ? new Date(d.timestamp) : null;
        return { name, hero: d.flags?.hero?.name ?? 'Eldrin', level: d.level ?? 1, place, when: date ? date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '' };
    } catch { return { name, empty: true }; }
}
