// Batch endpoints added for v2 (server.js). Everything else comes from v1's
// shared client (@shared/api).
import type { HitBox, Layer, PhysicsReview, LicenseStatus, FlagStatus, SpriteEntry } from '@shared/api';

async function post(path: string, body: unknown) {
    const res = await fetch(`/api${path}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`${path}: ${res.status} ${(await res.text().catch(() => '')).slice(0, 200)}`);
    return res.json();
}

export interface FlagUpdate { id: string; status: FlagStatus; comment?: string; note?: string | null }
export function flagsBatch(updates: FlagUpdate[]) {
    return post('/flags/batch', { updates });
}

export interface MetaUpdate { sheet: string; name: string; collection?: string; license?: LicenseStatus | null; physics?: PhysicsReview | null }
export function metaBatch(items: MetaUpdate[]) {
    return post('/meta/batch', { items });
}

export interface PhysicsUpdate { sheet: string; name: string; hitbox?: HitBox | null; layer?: Layer; review?: PhysicsReview | null }
export async function physicsBatch(items: PhysicsUpdate[]): Promise<SpriteEntry[]> {
    return (await post('/physics/batch', { items })).entries;
}
