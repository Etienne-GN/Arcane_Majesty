import { io } from 'socket.io-client';

// Default: same origin as the game — Vite/nginx proxy routes /socket.io to the game server.
// Override with VITE_SERVER_URL env var to point at a separate host.
const DEFAULT_URL = import.meta.env.VITE_SERVER_URL ?? window.location.origin;
const SEND_INTERVAL = 66; // ~15 Hz

class NetworkManager {
    constructor() {
        this.socket      = null;
        this.connected   = false;
        this._callbacks  = {};
        this._sendTimer  = 0;
        this._lastX      = null;
        this._lastY      = null;
        this._lastFacing = null;
        this._joinPayload = null; // queued join data sent as soon as socket connects
    }

    connect(serverUrl = DEFAULT_URL) {
        if (this.socket) { this.socket.disconnect(); this.socket = null; this.connected = false; }
        this._joinPayload = null;

        this.socket = io(serverUrl, {
            autoConnect:     true,
            reconnection:    true,
            reconnectionDelay: 1000,
        });

        this.socket.on('connect', () => {
            this.connected = true;
            console.log(`net: connected  id=${this.socket.id}`);
            // Send queued join immediately on (re)connect
            if (this._joinPayload) {
                this.socket.emit('player:join', this._joinPayload);
            }
        });

        this.socket.on('disconnect', (reason) => {
            this.connected = false;
            console.log(`net: disconnected  reason=${reason}`);
        });

        this.socket.on('connect_error', (err) => {
            console.warn(`net: connect_error  ${err.message}`);
        });

        this.socket.on('players:init',  (list)    => this._fire('init',       list));
        this.socket.on('player:joined', (state)   => this._fire('joined',     state));
        this.socket.on('player:moved',  (data)    => this._fire('moved',      data));
        this.socket.on('player:left',   (data)    => this._fire('left',       data));
        this.socket.on('you:authority', ()        => this._fire('authority',  null));
        this.socket.on('you:follower',  ()        => this._fire('follower',   null));
        this.socket.on('enemy:sync',    (enemies) => this._fire('enemySync',  enemies));
        this.socket.on('enemy:died',    (data)    => this._fire('enemyDied',  data));
    }

    // Store join payload; fires immediately if already connected, else waits for 'connect' event
    join(name, characterId, x, y, facing, mapId) {
        this._joinPayload = { name, characterId, x, y, facing, mapId };
        if (this.connected && this.socket) {
            this.socket.emit('player:join', this._joinPayload);
        }
        // If not yet connected, the 'connect' handler above will send it
    }

    // Called every frame from GameScene; throttles to SEND_INTERVAL
    tickMove(delta, x, y, facing, mapId) {
        if (!this.connected) return;
        this._sendTimer += delta;
        if (this._sendTimer < SEND_INTERVAL) return;
        this._sendTimer = 0;

        if (x === this._lastX && y === this._lastY && facing === this._lastFacing) return;
        this._lastX = x; this._lastY = y; this._lastFacing = facing;

        this.socket.emit('player:move', { x, y, facing, mapId });
    }

    sendEnemySync(enemies, mapId) {
        if (!this.connected) return;
        this.socket.emit('enemy:sync', { enemies, mapId });
    }

    sendEnemyDied(id, mapId) {
        if (!this.connected) return;
        this.socket.emit('enemy:died', { id, mapId });
    }

    on(event, cb)      { this._callbacks[event] = cb; }
    off(event)         { delete this._callbacks[event]; }
    _fire(event, data) { this._callbacks[event]?.(data); }
}

export const networkManager = new NetworkManager();
