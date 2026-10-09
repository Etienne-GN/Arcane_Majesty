/**
 * What a layer shows when the character plays a motion — shared by the game
 * (CharacterRenderer) and LPC Forge v2, Phaser-free.
 *
 *   own       the layer ships art for the motion
 *   fallback  no art and no rule: it plays its walk frames (the game's
 *             long-standing default, kept as is)
 *   hide      a rule hides it in that motion (e.g. a sword while sitting)
 *   borrow    a rule plays another motion's frames, retimed to this
 *             motion's frame count so it stays in step with the body
 *
 * Rules: { "<type>|<id>|<itemName>": { "<motion>": { rule: 'hide' } |
 * { rule: 'borrow', from: '<motion>' } } } (src/data/motion_rules.json),
 * optionally overridden per character (cast.motionRules). Rules never
 * override real art, and malformed entries are ignored (ruleErrors reports them).
 */
import { resolveAnim, concreteAnimsFor, DEFAULT_ANIMS } from './animResolve.js';
import { MOTION_FRAMES } from './lpcLayout.js';

const MOTIONS = new Set(DEFAULT_ANIMS);

/** Rule key: render type (game layers carry no slot), id and item name — unique per catalogue layer. */
export function ruleKey(layer) {
    return `${layer.type}|${layer.id}|${layer.itemName ?? ''}`;
}

function validRule(r, motion) {
    if (!r || typeof r !== 'object') return false;
    if (r.rule === 'hide') return true;
    return r.rule === 'borrow' && MOTIONS.has(r.from) && r.from !== motion;
}

/** The rule in force for a layer in a motion: own art first, then override, then global, else fallback. */
export function ruleFor(layer, motion, rules = {}, overrides) {
    if (resolveAnim(layer, motion)) return { rule: 'own' };
    const key = ruleKey(layer);
    for (const src of [overrides, rules]) {
        const r = src?.[key]?.[motion];
        if (validRule(r, motion)) return r.rule === 'hide' ? { rule: 'hide' } : { rule: 'borrow', from: r.from };
    }
    return { rule: 'fallback' };
}

/** Index of the source frame shown at each of `dst` target frames. */
export function frameMap(src, dst) {
    return Array.from({ length: dst }, (_, i) => Math.floor(i * src / dst));
}

/** { mode, concrete (file to play, null = hidden), frames (retimed source indices, null = as is) } */
export function resolveMotion(layer, motion, rules, overrides) {
    const r = ruleFor(layer, motion, rules, overrides);
    if (r.rule === 'own') return { mode: 'own', concrete: resolveAnim(layer, motion), frames: null };
    if (r.rule === 'hide') return { mode: 'hide', concrete: null, frames: null };
    if (r.rule === 'borrow') {
        const concrete = resolveAnim(layer, r.from);
        if (concrete) return { mode: 'borrow', concrete, frames: frameMap(MOTION_FRAMES[r.from], MOTION_FRAMES[motion]) };
    }
    return { mode: 'fallback', concrete: resolveAnim(layer, 'walk') ?? 'walk', frames: null };
}

/** Concrete files a layer needs loaded for these motions: own art, walk (fallback) and borrow sources. */
export function neededAnims(layer, logicalAnims, rules, overrides) {
    const out = concreteAnimsFor(layer, logicalAnims);
    for (const m of logicalAnims) {
        const r = ruleFor(layer, m, rules, overrides);
        if (r.rule === 'borrow') {
            const c = resolveAnim(layer, r.from);
            if (c) out.add(c);
        }
    }
    return out;
}

/** Problems in a rules object (empty = valid) — for the API and validators. */
export function ruleErrors(rules) {
    if (!rules || typeof rules !== 'object' || Array.isArray(rules)) return ['rules must be an object'];
    const errs = [];
    for (const [key, byMotion] of Object.entries(rules)) {
        if (key.split('|').length !== 3) errs.push(`${key}: key must be "type|id|itemName"`);
        if (!byMotion || typeof byMotion !== 'object' || Array.isArray(byMotion)) { errs.push(`${key}: must map motions to rules`); continue; }
        for (const [motion, r] of Object.entries(byMotion)) {
            if (!MOTIONS.has(motion)) { errs.push(`${key}: unknown motion "${motion}"`); continue; }
            if (r?.rule !== 'hide' && r?.rule !== 'borrow') errs.push(`${key}.${motion}: unknown rule "${r?.rule}"`);
            else if (r.rule === 'borrow') {
                if (r.from === motion) errs.push(`${key}.${motion}: cannot borrow from itself`);
                else if (!MOTIONS.has(r.from)) errs.push(`${key}.${motion}: unknown source motion "${r.from}"`);
            }
        }
    }
    return errs;
}
