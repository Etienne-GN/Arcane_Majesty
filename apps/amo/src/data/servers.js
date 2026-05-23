// Server URL is always the same origin as the game client.
// In dev: Vite proxies /socket.io and /api to localhost:3002.
// In production: the same host serves both client and socket server.
export const SERVERS = [
    { name: 'Arcane Majesty Online', url: window.location.origin },
];
