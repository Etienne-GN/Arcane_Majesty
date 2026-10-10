/**
 * Forge flags: your notes for Claude on a component, a component in one
 * motion, a single frame, or a whole character — in the sprite ledger's
 * language: open (for Claude) → needs_review (Claude acted, your turn) /
 * question (Claude asks) → resolved. Each can carry a snapshot of what you
 * saw. Stored in lpc_forge/gap_flags.json (tool data, not shipped).
 *
 *   target 'item'      key                       (a catalogue layer, all motions)
 *          'motion'    key, motion               (the Gaps-tab cell flags)
 *          'frame'     key or cast, motion, dir, frame (0-based)
 *          'character' cast (or key)
 */
import { DEFAULT_ANIMS } from '../../../../../amo/src/systems/animResolve.js';

export const FLAG_STATUSES = ['open', 'needs_review', 'question', 'resolved'];
export const FLAG_REASONS = ['looks_broken', 'misaligned', 'wrong_frame', 'wrong_colour', 'needs_art',
                             'should_hide', 'should_borrow', 'other'];
export const FLAG_TARGETS = ['item', 'motion', 'frame', 'character'];
const MOTIONS = new Set(DEFAULT_ANIMS);
const DIRS = new Set(['up', 'left', 'down', 'right']);
const MAX_SNAPSHOT = 200000;   // chars of data URL (~150 KB image)

/** Older Gaps-tab flags have no target field: key + motion. */
export function flagTarget(f) {
    return f.target ?? 'motion';
}

const isKey = k => typeof k === 'string' && k.split('|').length === 3;

export function flagErrors(list) {
    if (!Array.isArray(list)) return ['flags must be a list'];
    const errs = [];
    list.forEach((f, i) => {
        if (!f || typeof f !== 'object') { errs.push(`[${i}] must be an object`); return; }
        const t = flagTarget(f);
        if (typeof f.id !== 'string' || !f.id) errs.push(`[${i}] needs an id`);
        if (!FLAG_TARGETS.includes(t)) errs.push(`[${i}] unknown target "${t}"`);
        if ((t === 'item' || t === 'motion') && !isKey(f.key)) errs.push(`[${i}] key must be "type|id|itemName"`);
        if (t === 'frame' && !isKey(f.key) && typeof f.cast !== 'string') errs.push(`[${i}] a frame flag needs a key or a cast id`);
        if (t === 'character' && typeof f.cast !== 'string' && !isKey(f.key)) errs.push(`[${i}] a character flag needs a cast id`);
        if ((t === 'motion' || t === 'frame') && !MOTIONS.has(f.motion)) errs.push(`[${i}] unknown motion "${f.motion}"`);
        if (t === 'frame' && !DIRS.has(f.dir)) errs.push(`[${i}] a frame flag needs dir up/left/down/right`);
        if (t === 'frame' && !(Number.isInteger(f.frame) && f.frame >= 0)) errs.push(`[${i}] frame must be a whole number ≥ 0`);
        if (!FLAG_REASONS.includes(f.reason)) errs.push(`[${i}] unknown reason "${f.reason}"`);
        if (!FLAG_STATUSES.includes(f.status)) errs.push(`[${i}] unknown status "${f.status}"`);
        if (typeof f.comment !== 'string') errs.push(`[${i}] comment must be text`);
        if (f.snapshot !== undefined && !(typeof f.snapshot === 'string' && f.snapshot.startsWith('data:image/png;base64,') && f.snapshot.length <= MAX_SNAPSHOT)) {
            errs.push(`[${i}] snapshot must be a PNG data URL under ${MAX_SNAPSHOT} chars`);
        }
    });
    return errs;
}

/** Human description, e.g. "Solid Cape — run, facing left, frame 4". */
export function describeFlag(f, label) {
    const who = label ?? (f.cast ? `character ${f.cast}` : f.key);
    const t = flagTarget(f);
    if (t === 'item' || t === 'character') return who;
    if (t === 'motion') return `${who} — ${f.motion}`;
    return `${who} — ${f.motion}, facing ${f.dir}, frame ${f.frame + 1}`;
}

/** A new open flag from the form fields. */
export function newFlag(fields, makeId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
                        now = () => new Date().toISOString()) {
    return { ...fields, id: makeId(), status: 'open', comment: String(fields.comment ?? '').trim(), createdAt: now() };
}

/** The flag after a status move (or a plain reply: same status), with the note appended to its thread. */
export function applyStatus(f, status, note = '', who = 'You', now = () => new Date().toISOString()) {
    if (!FLAG_STATUSES.includes(status)) throw new Error(`unknown status "${status}"`);
    const n = String(note ?? '').trim();
    const out = { ...f, status, comment: n ? `${f.comment}\n[${who}] ${n}` : f.comment };
    if (status === 'resolved') out.resolvedAt = now(); else delete out.resolvedAt;
    return out;
}
