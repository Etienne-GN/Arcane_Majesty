// Saving goes through amo's own SaveManager: the whole PlayerStats sheet, plus where Eldrin
// stands in 3D (stats.location = { map, x, y, z, facing }). One slot for now.
import { SaveManager as SM } from '@rules';

const { SaveManager } = SM;
const STORY = '3d', CHARACTER = 'eldrin';

export function hasSave() {
    try { return SaveManager.hasSave(STORY, CHARACTER); } catch { return false; }
}

// Fills `stats` from the save; returns the saved location (or null).
export function loadGame(stats) {
    try { return SaveManager.load(stats, STORY, CHARACTER) ? stats.location ?? null : null; }
    catch { return null; }
}

export function saveGame(stats, location) {
    stats.location = location;
    try { return SaveManager.save(stats, STORY, CHARACTER); } catch { return false; }
}

export function deleteSave() {
    try { SaveManager.deleteSave(STORY, CHARACTER); } catch { /* storage blocked */ }
}
