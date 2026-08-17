// Server list for the online flow. Offline-first: the app works with no server.
// A saved URL (Options > Server Address) appears as "My Server".
// Inside a native launcher the same-origin row is meaningless (capacitor://localhost)
// so it is skipped; the saved server is the only online option there.
import { isNative } from '../utils/platform.js';

const SAVED_KEY = 'amo_server_url';

// Rebuilt on every read so a saved URL applies in-session after Options
// restarts the scene (module evaluation runs only once at load time).
export function getServers() {
    const list = [];
    const saved = localStorage.getItem(SAVED_KEY);
    if (saved) list.push({ name: 'My Server', url: saved });
    if (!isNative) list.push({ name: 'Arcane Majesty Online', url: window.location.origin });
    return list;
}