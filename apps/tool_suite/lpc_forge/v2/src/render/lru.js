/**
 * Least-recently-used map with a fixed capacity (Map keeps insertion order, so
 * re-inserting on read moves a key to the "recent" end). Bounds the sheet
 * cache: every tint of every sheet is a full-size canvas.
 */
export class Lru {
    constructor(capacity) {
        this.capacity = capacity;
        this.map = new Map();
    }
    get size() { return this.map.size; }
    has(k) { return this.map.has(k); }
    get(k) {
        if (!this.map.has(k)) return undefined;
        const v = this.map.get(k);
        this.map.delete(k);
        this.map.set(k, v);
        return v;
    }
    set(k, v) {
        this.map.delete(k);
        this.map.set(k, v);
        while (this.map.size > this.capacity) this.map.delete(this.map.keys().next().value);
        return this;
    }
    delete(k) { return this.map.delete(k); }
}
