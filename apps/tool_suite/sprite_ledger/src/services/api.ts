export interface SpriteEntry {
    kind: 'object' | 'tile';
    name: string;
    tags?: string[];
    x?: number; y?: number; w?: number; h?: number;
    row?: number; col?: number; frameIndex?: number;
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

export interface Collection { id: string; name: string; }

export interface Flag {
    id: string; sheet: string; name: string;
    reason: string; comment: string;
    status: 'open' | 'resolved';
    createdAt: string; resolvedAt: string | null;
}

const BASE = '/api';

export async function fetchSheets(): Promise<Sheet[]> {
    return (await fetch(`${BASE}/sheets`)).json();
}

export async function fetchMeta(): Promise<{ collections: Collection[]; spriteMeta: Record<string, { collection: string }> }> {
    return (await fetch(`${BASE}/meta`)).json();
}

export async function assignCollection(sheet: string, name: string, collection: string): Promise<void> {
    await fetch(`${BASE}/meta`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheet, name, collection }),
    });
}

export async function addCollection(id: string, name: string): Promise<void> {
    await fetch(`${BASE}/collections`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name }),
    });
}

export async function fetchFlags(status?: string): Promise<Flag[]> {
    const qs = status ? `?status=${status}` : '';
    return (await fetch(`${BASE}/flags${qs}`)).json();
}

export async function addFlag(sheet: string, name: string, reason: string, comment: string): Promise<Flag> {
    return (await fetch(`${BASE}/flags`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheet, name, reason, comment }),
    })).json();
}

export async function resolveFlag(id: string): Promise<void> {
    await fetch(`${BASE}/flags/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'resolved' }),
    });
}

export function imageUrl(sheetPngFilename: string): string {
    return `${BASE}/image/${encodeURIComponent(sheetPngFilename)}`;
}
