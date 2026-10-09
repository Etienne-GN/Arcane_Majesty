/**
 * Gap flags: notes on an item × motion gap, in the sprite ledger's language —
 * open (for Claude) → needs_review (Claude acted, your turn) / question
 * (Claude asks) → resolved. Stored in lpc_forge/gap_flags.json (tool data,
 * not shipped with the game).
 */
import { DEFAULT_ANIMS } from '../../../../../amo/src/systems/animResolve.js';

export const FLAG_STATUSES = ['open', 'needs_review', 'question', 'resolved'];
export const FLAG_REASONS = ['needs_art', 'looks_broken', 'should_hide', 'should_borrow', 'other'];
const MOTIONS = new Set(DEFAULT_ANIMS);

export function flagErrors(list) {
    if (!Array.isArray(list)) return ['flags must be a list'];
    const errs = [];
    list.forEach((f, i) => {
        if (!f || typeof f !== 'object') { errs.push(`[${i}] must be an object`); return; }
        if (typeof f.id !== 'string' || !f.id) errs.push(`[${i}] needs an id`);
        if (typeof f.key !== 'string' || f.key.split('|').length !== 3) errs.push(`[${i}] key must be "type|id|itemName"`);
        if (!MOTIONS.has(f.motion)) errs.push(`[${i}] unknown motion "${f.motion}"`);
        if (!FLAG_REASONS.includes(f.reason)) errs.push(`[${i}] unknown reason "${f.reason}"`);
        if (!FLAG_STATUSES.includes(f.status)) errs.push(`[${i}] unknown status "${f.status}"`);
        if (typeof f.comment !== 'string') errs.push(`[${i}] comment must be text`);
    });
    return errs;
}
