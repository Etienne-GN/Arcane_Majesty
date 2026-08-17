// Server list for the online flow. Offline-first: the app works with no server.
// A saved URL (Options > Server Address) appears as "My Server".
// The same-origin row is skipped only inside the Capacitor local server
// (https://localhost / capacitor://localhost), where it is meaningless.
// When the game is served from a real server — browser or native launcher —
// the same origin IS the game server, so the row is offered.
const SAVED_KEY = 'amo_server_url';

function isCapacitorLocal() {
    if (typeof window === 'undefined') return false;
    if (window.location.origin.startsWith('capacitor://')) return true;
    return !!window.Capacitor?.isNativePlatform?.()
        && ['localhost', '127.0.0.1'].includes(window.location.hostname);
}

// Rebuilt on every read so a saved URL applies in-session after Options
// restarts the scene (module evaluation runs only once at load time).
export function getServers() {
    const list = [];
    const saved = localStorage.getItem(SAVED_KEY);
    if (saved) list.push({ name: 'My Server', url: saved });
    if (!isCapacitorLocal()) list.push({ name: 'Arcane Majesty Online', url: window.location.origin });
    return list;
}