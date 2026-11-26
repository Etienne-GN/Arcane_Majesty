// The gamepad's buttons, remappable (Options → Controls → Gamepad buttons; TODO §1, asked 2026-11-26).
// A binding is { b: button index (standard mapping), hold: false | true } — a held binding fires when the button is
// held half a second; on a button that also has a held binding, the tap fires on release. An action can have more
// than one binding (the right hand on RT and X). Two maps, one per control mode: two-hand actions (Options →
// Controls) and the classic FIRE / HIT. Saved per device in settings.padmap; the defaults are the layout the game
// always had.
import { settings, setSetting } from './settings.js';

export const BUTTONS = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'Back', 'Start', 'L3', 'R3', 'D-pad up', 'D-pad down', 'D-pad left', 'D-pad right', 'Home'];
export const HOLD_MS = 450;

// kind: 'tap' (an action that fires once), 'state' (true while held: sprint), 'hand' (press and release: the hands —
// held, the right stick aims), 'cycle' (press and release: a hand's favourites — held, the fan)
const A = (id, label, token, kind = 'tap') => ({ id, label, token, kind });
export const ACTIONS = {
    hands: [
        A('hop', 'Hop / dodge', 'hop'), A('handR', 'Right hand (hold: aim)', 'handR', 'hand'), A('handL', 'Left hand (hold: aim)', 'handL', 'hand'),
        A('cycleR', 'Right hand: next favourite (hold: fan)', 'cycleR', 'cycle'), A('cycleL', 'Left hand: next favourite (hold: fan)', 'cycleL', 'cycle'),
        A('sprint', 'Sprint (held)', 'sprint', 'state'), A('blink', 'Blink-Step', 'blink'), A('sight', 'Aether Sight', 'sight'),
        A('inventory', 'Satchel', 'inventory'), A('sheet', 'Character', 'sheet'), A('camcycle', 'Camera distance', 'camcycle'), A('shift', "A werewolf's change", 'shift'),
        A('hotbar0', 'Hotbar 1', 'hotbar:0'), A('hotbar1', 'Hotbar 2', 'hotbar:1'), A('hotbar2', 'Hotbar 3', 'hotbar:2'), A('hotbar3', 'Hotbar 4', 'hotbar:3'),
    ],
    classic: [
        A('hop', 'Hop / dodge', 'hop'), A('cast', 'Cast (FIRE)', 'cast'), A('strike', 'Strike (HIT)', 'strike'), A('sprint', 'Sprint (held)', 'sprint', 'state'),
        A('skill0', 'Style skill 1', 'skill:0'), A('skill1', 'Style skill 2', 'skill:1'), A('skill2', 'Style skill 3', 'skill:2'),
        A('blink', 'Blink-Step', 'blink'), A('sight', 'Aether Sight', 'sight'), A('inventory', 'Satchel', 'inventory'), A('sheet', 'Character', 'sheet'), A('camcycle', 'Camera distance', 'camcycle'),
        A('hotbar0', 'Hotbar 1', 'hotbar:0'), A('hotbar1', 'Hotbar 2', 'hotbar:1'), A('hotbar2', 'Hotbar 3', 'hotbar:2'), A('hotbar3', 'Hotbar 4', 'hotbar:3'),
    ],
};
const t = (b, hold = false) => ({ b, hold });
export const DEFAULTS = {
    hands: { hop: [t(0)], handR: [t(7), t(2)], handL: [t(6)], cycleR: [t(5)], cycleL: [t(4)], sprint: [t(10)], blink: [t(1), t(8)], sight: [t(3)],
        inventory: [t(3, true)], sheet: [t(9)], camcycle: [t(11)], shift: [t(11, true)], hotbar0: [t(12)], hotbar1: [t(15)], hotbar2: [t(13)], hotbar3: [t(14)] },
    classic: { hop: [t(0)], cast: [t(2), t(7)], strike: [t(1)], sprint: [t(4), t(10)], skill0: [t(5)], skill1: [t(6)], skill2: [t(11, true)], blink: [t(8)], sight: [t(3)],
        inventory: [t(3, true)], sheet: [t(9)], camcycle: [t(11)], hotbar0: [t(12)], hotbar1: [t(15)], hotbar2: [t(13)], hotbar3: [t(14)] },
};

const clone = o => JSON.parse(JSON.stringify(o));
export const modeOf = two => (two ? 'hands' : 'classic');
// The map in use for a mode: the saved one over the defaults (an action added later keeps its default)
export function mapFor(mode) { return { ...clone(DEFAULTS[mode]), ...(settings.padmap?.[mode] ?? {}) }; }
function save(mode, map) { setSetting('padmap', { ...(settings.padmap ?? {}), [mode]: map }); }
export const label = ({ b, hold }) => `${hold ? 'Hold ' : ''}${BUTTONS[b] ?? `Button ${b}`}`;
const same = (x, y) => x.b === y.b && !!x.hold === !!y.hold;
// Who else uses this binding (an action id), if anyone. A press-and-release action (the hands, a hand's fan,
// sprint) owns its whole button: nothing else can tap or hold it, and it cannot share a button.
const whole = (mode, id) => ['hand', 'cycle', 'state'].includes(ACTIONS[mode].find(a => a.id === id)?.kind);
export function holderOf(mode, binding, except = null) {
    const m = mapFor(mode);
    return Object.keys(m).find(id => id !== except && m[id].some(x => same(x, binding) || (x.b === binding.b && (whole(mode, id) || whole(mode, except))))) ?? null;
}
// Bind an action to one binding. If another action had it, the two swap (it takes this action's first binding).
export function bind(mode, id, binding) {
    const m = mapFor(mode), other = holderOf(mode, binding, id), mine = m[id]?.[0] ?? null;
    if (whole(mode, id)) binding = { b: binding.b, hold: false };   // (a press-and-release action has no held form)
    if (other) { m[other] = m[other].filter(x => x.b !== binding.b || (!same(x, binding) && !whole(mode, other) && !whole(mode, id))); const give = mine && (whole(mode, other) ? { b: mine.b, hold: false } : mine);
        // (it takes this action's old button only if nothing else would then clash with it on that button)
        const clash = give && Object.keys(m).some(k => k !== id && k !== other && m[k].some(x => same(x, give) || (x.b === give.b && (whole(mode, k) || whole(mode, other)))));
        if (give && !clash && !m[other].some(x => same(x, give))) m[other].unshift(give); }
    m[id] = [binding];
    save(mode, m);
    return other;
}
export function resetMap(mode) { save(mode, clone(DEFAULTS[mode])); }

// While the mapping screen waits for a button, gameplay and menu navigation leave the gamepad alone
export const padCapture = { on: false };
