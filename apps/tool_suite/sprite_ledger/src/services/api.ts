/** One frame of an animated sprite: a pixel box on the sheet. */
export interface SpriteFrame { x: number; y: number; w: number; h: number; }

/** Collision box, in pixels, relative to the sprite's top-left (see spriteSize in physics.ts). */
export interface HitBox { x: number; y: number; w: number; h: number; }
/** Draw order against characters: always below, depth-sorted by the sprite's base, or always above. */
export type Layer = 'under' | 'sorted' | 'over';
/** 'proposed' = filled in by Claude, waiting for a human look; 'approved' = set or accepted by a human. */
export type PhysicsReview = 'proposed' | 'approved';

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
    // Absent = not decided yet. hitbox null = explicitly no collision.
    hitbox?: HitBox | null;
    layer?: Layer;
}

export interface Sheet {
    sheetPngFilename: string;
    source: string;
    sheetDirName?: string;
    sheetWidth?: number;
    sheetHeight?: number;
    entries: SpriteEntry[];
    gridTileWidth?: number;
    gridTileHeight?: number;
    gridCols?: number;
    gridRows?: number;
}

export interface Collection { id: string; name: string; parentId: string | null; }

// 'question' is distinct from 'needs_review': needs_review means "I made a
// fix, please check it"; question means "I'm stuck and need you to tell me
// what you actually want" — Claude's own claudeNote carries the question.
export type FlagStatus = 'open' | 'needs_review' | 'question' | 'resolved';

export interface Flag {
    id: string; sheet: string;
    // A sprite flag has a name; a zone flag has name null and a region (sheet
    // pixels) — an area of the sheet, e.g. an item the catalogue crops badly.
    name: string | null;
    region?: { x: number; y: number; w: number; h: number };
    reason: string; comment: string;
    status: FlagStatus;
    // Set only when status is (or was) 'question' — the question itself,
    // written by Claude. Left in place after the status moves on, so the
    // question stays visible alongside the answer that resolved it.
    claudeNote: string | null;
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

export interface SpriteMetaRecord { collection: string; license?: LicenseStatus; physics?: PhysicsReview; }

export async function fetchMeta(): Promise<{ collections: Collection[]; spriteMeta: Record<string, SpriteMetaRecord> }> {
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

export async function addFlag(
    sheet: string, name: string | null, reason: string, comment: string,
    region?: { x: number; y: number; w: number; h: number },
): Promise<Flag> {
    return (await postJson('/flags', { sheet, name, reason, comment, ...(region ? { region } : {}) })).json();
}

// `extra.note` sets claudeNote (Claude asking or updating its question);
// `extra.comment` overwrites the flag's comment (a human answering it —
// the answer is appended by the caller before this is called, so the
// full exchange stays in one field). Both are optional and independent
// of `status`.
export async function setFlagStatus(
    id: string, status: FlagStatus, extra?: { note?: string; comment?: string }
): Promise<void> {
    await req(`/flags/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, ...extra }),
    });
}

// Answering appends into `comment` rather than replacing it, so the
// original report and every answer stay in one readable trail instead of
// the question's context disappearing the moment it's addressed. Status
// goes back to 'open' — the same "send it back for more work" signal a
// human already uses elsewhere — so Claude knows to look again.
export async function answerQuestion(flag: Flag, answer: string): Promise<void> {
    const line = `[Answer to Claude's question] ${answer}`;
    const comment = flag.comment ? `${flag.comment}\n\n${line}` : line;
    await setFlagStatus(flag.id, 'open', { comment });
}

// Any field left undefined is kept as it is. Returns the updated entry
// when hitbox/layer were sent.
export async function savePhysics(
    sheet: string, name: string,
    body: { hitbox?: HitBox | null; layer?: Layer; review?: PhysicsReview | null },
): Promise<SpriteEntry | null> {
    return (await (await postJson('/physics', { sheet, name, ...body })).json()).entry;
}

export function imageUrl(sheetPngFilename: string): string {
    return `${BASE}/image/${encodeURIComponent(sheetPngFilename)}`;
}
