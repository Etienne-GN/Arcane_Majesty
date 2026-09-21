/** One frame of an animated sprite: a pixel box on the sheet. */
export interface SpriteFrame { x: number; y: number; w: number; h: number; }

export interface SpriteEntry {
    kind: 'object' | 'tile';
    name: string;
    tags?: string[];
    x?: number; y?: number; w?: number; h?: number;
    row?: number; col?: number; frameIndex?: number;
    // Present only on animated sprites. `frames` are played in order; a
    // sprite without it is a still and renders from its own box.
    frames?: SpriteFrame[];
    frameDurationMs?: number;
}

export interface Sheet {
    sheetPngFilename: string;
    source: string;
    entries: SpriteEntry[];
    gridTileWidth?: number;
    gridTileHeight?: number;
    gridCols?: number;
    gridRows?: number;
}

export interface Collection { id: string; name: string; parentId: string | null; }

export type FlagStatus = 'open' | 'needs_review' | 'resolved';

export interface Flag {
    id: string; sheet: string; name: string;
    reason: string; comment: string;
    status: FlagStatus;
    createdAt: string; resolvedAt: string | null;
}

const BASE = '/api';

// Every call goes through this so a non-2xx response throws instead of
// silently returning an HTML error page's body as if it were JSON, or
// (for the fire-and-forget POST/PATCH calls) failing completely silently.
async function req(path: string, init?: RequestInit): Promise<Response> {
    const res = await fetch(`${BASE}${path}`, init);
    if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`${init?.method ?? 'GET'} ${path} failed: ${res.status} ${res.statusText}${body ? ` — ${body.slice(0, 200)}` : ''}`);
    }
    return res;
}

function postJson(path: string, body: unknown): Promise<Response> {
    return req(path, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
}

export async function fetchSheets(): Promise<Sheet[]> {
    return (await req('/sheets')).json();
}

export type LicenseStatus = 'ok' | 'unlicensed';

export async function fetchMeta(): Promise<{ collections: Collection[]; spriteMeta: Record<string, { collection: string; license?: LicenseStatus }> }> {
    return (await req('/meta')).json();
}

export async function assignCollection(sheet: string, name: string, collection: string): Promise<void> {
    await postJson('/meta', { sheet, name, collection });
}

export async function setLicenseStatus(sheet: string, name: string, status: LicenseStatus | null): Promise<void> {
    await postJson('/license', { sheet, name, status });
}

export async function addCollection(id: string, name: string, parentId: string | null = null): Promise<void> {
    await postJson('/collections', { id, name, parentId });
}

export async function fetchFlags(status?: string): Promise<Flag[]> {
    const qs = status ? `?status=${status}` : '';
    return (await req(`/flags${qs}`)).json();
}

export async function addFlag(sheet: string, name: string, reason: string, comment: string): Promise<Flag> {
    return (await postJson('/flags', { sheet, name, reason, comment })).json();
}

export async function setFlagStatus(id: string, status: FlagStatus): Promise<void> {
    await req(`/flags/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
    });
}

export function imageUrl(sheetPngFilename: string): string {
    return `${BASE}/image/${encodeURIComponent(sheetPngFilename)}`;
}
