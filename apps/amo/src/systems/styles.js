// Combat C3 (spec §4): learning a style — practice < manual < teacher — and what
// its skills need. Pure — tools/test_styles.mjs.
import { STYLES, STYLE_SKILLS, stylesFor } from '../data/styles.js';
import { typeOf } from './weapons.js';

export const STYLE_UNLOCKS = [2, 5, 8];
export const MANUAL_BONUS = 40, LESSON_BONUS = 35;
export const lessonPrice = n => 100 * (n + 1);

export const emptyStyles = () => ({ progress: {}, manuals: {}, lessons: {}, lessonDay: {}, practising: {} });
export const knowsStyle = (st, id) => (st.progress[id] ?? 0) >= 100;
export const practising = (st, weapon) => st.practising[weapon] ?? stylesFor(weapon)[0]?.id ?? null;

// Returns true when this gain finishes the style.
export function addProgress(st, id, pct) {
    const before = st.progress[id] ?? 0;
    st.progress[id] = Math.min(100, before + pct);
    return before < 100 && st.progress[id] >= 100;
}
// A kill teaches 1% at an even match (killGain = mastery.hitGain(true, …), 6 at par); a read manual doubles it.
export const practiceGain = (st, id, killGain) => addProgress(st, id, (killGain / 6) * (st.manuals[id] ? 2 : 1));

export function readManual(st, id) {
    if (!STYLES[id] || st.manuals[id] || knowsStyle(st, id)) return false;
    st.manuals[id] = true;
    addProgress(st, id, MANUAL_BONUS);
    return true;
}

// One lesson a day per style; each costs more than the last.
export function lessonCheck(st, id, day, gold) {
    if (knowsStyle(st, id)) return { ok: false, reason: 'known' };
    if (st.lessonDay[id] === day) return { ok: false, reason: 'today' };
    const price = lessonPrice(st.lessons[id] ?? 0);
    return gold < price ? { ok: false, reason: 'gold', price } : { ok: true, price };
}
// Returns the price paid.
export function takeLesson(st, id, day) {
    const price = lessonPrice(st.lessons[id] ?? 0);
    st.lessons[id] = (st.lessons[id] ?? 0) + 1;
    st.lessonDay[id] = day;
    addProgress(st, id, LESSON_BONUS);
    return price;
}

// 'style' (not learned) · 'mastery' (weapon level too low) · 'weapon' (not in hand) · 'ready'
export function skillState(st, skillId, weaponLevel, inHand) {
    const k = STYLE_SKILLS[skillId];
    if (!k || !knowsStyle(st, k.style)) return 'style';
    if (weaponLevel < k.unlock) return 'mastery';
    return inHand ? 'ready' : 'weapon';
}

// Weapon types in either hand; an empty hand is a fist.
export function handTypes(equipment, items) {
    return new Set([typeOf(items[equipment.weapon]), typeOf(items[equipment.offHand])]);
}

// Which of `list` ({x, y}) a skill's shape reaches from origin o, nearest first.
//   front: a circle `radius` centred `reach` px ahead · around: a circle on you
//   line: a strip `length` long and 2 x `width` wide straight ahead
const DIR = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
export function targetsIn(shape, o, facing, list) {
    const [fx, fy] = DIR[facing] ?? [0, 1];
    const hit = list.filter(e => {
        const dx = e.x - o.x, dy = e.y - o.y;
        if (shape.kind === 'around') return Math.hypot(dx, dy) <= shape.radius;
        if (shape.kind === 'line') {
            const along = dx * fx + dy * fy, side = Math.abs(dx * fy - dy * fx);
            return along >= 0 && along <= shape.length && side <= (shape.width ?? 20);
        }
        return Math.hypot(e.x - (o.x + fx * shape.reach), e.y - (o.y + fy * shape.reach)) <= shape.radius;
    });
    hit.sort((a, b) => Math.hypot(a.x - o.x, a.y - o.y) - Math.hypot(b.x - o.x, b.y - o.y));
    return shape.max ? hit.slice(0, shape.max) : hit;
}

// A skill's multiplier on the weapon's normal hit.
export function skillMult(k, { behind = false, parried = false, vanished = false } = {}) {
    let m = k.mult ?? 1;
    if (behind && k.behindMult) m *= k.behindMult;
    if (parried && k.parryMult) m *= k.parryMult;
    if (vanished) m *= 2;
    return Math.round(m * 100) / 100;
}
