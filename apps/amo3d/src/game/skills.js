// Style skills — the three skills of the style being practised with the weapon in hand (amo C3):
// Z / X / V, gamepad RB / LT / right-stick click, three touch buttons. Each needs the style learned
// and the weapon's mastery (2 / 5 / 8) — styles.js skillState — and has its own cooldown (k.cd).
// Kinds played in 3D so far: strike (in front), spin (all around), buff (a stance on you, amo
// STATUS_DEFS). Other kinds answer "not yet" until their slice.
import { styles as styleRules, styleData, weapons as weaponRules, mastery as M, items as itemRules, statuses } from '@rules';

const { STYLE_SKILLS, STYLES } = styleData;
const { skillState, practising } = styleRules;
const { WEAPON_TYPES, typeOf } = weaponRules;
const { STATUS_DEFS } = statuses;
const PLAYABLE = new Set(['strike', 'spin', 'buff']);
const toM = px => (px / 32) * 2;   // amo pixels → metres, with the 3D reach tuning

const CSS = `
#skills { position: fixed; left: 50%; bottom: 92px; transform: translateX(-50%); display: flex; gap: 8px; z-index: 4; }
#skills .sk { position: relative; width: 92px; padding: 5px 6px; border-radius: 8px; border: 1px solid #c9b6ff66; background: #0009;
    font: 11px Georgia, serif; color: #eee6d2; text-align: center; pointer-events: auto; cursor: pointer; overflow: hidden; }
#skills .sk.off { opacity: .35; }
#skills .sk .key { position: absolute; left: 4px; top: 1px; font-size: 10px; opacity: .7; }
#skills .sk .cd { position: absolute; left: 0; right: 0; bottom: 0; background: #000b; }
body.touch-mode #skills { bottom: auto; top: 14px; }`;

export function createSkills({ stats, player, hud, cam, world }) {
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.append(style);
    const root = document.createElement('div');
    root.id = 'skills';
    document.body.append(root);
    const cds = {};   // skillId → seconds left
    const tiles = [0, 1, 2].map(i => {
        const t = document.createElement('div');
        t.className = 'sk';
        const key = document.createElement('span'); key.className = 'key'; key.textContent = 'ZXV'[i];
        const name = document.createElement('div');
        const cd = document.createElement('span'); cd.className = 'cd';
        t.append(key, name, cd);
        t.addEventListener('pointerdown', e => { e.stopPropagation(); use(i); });
        root.append(t);
        return { t, name, cd };
    });

    const weaponType = () => {
        const id = stats.equipment.weapon;
        return id ? typeOf(itemRules.ITEMS[id]) : 'staff';
    };
    const bar = () => {
        const w = weaponType();
        const sid = practising(stats.styles, w);
        return { weapon: w, skills: sid ? STYLES[sid].skills : [] };
    };

    function hitAround(k, weapon, { arc, reach, max = Infinity }) {
        const p = player.state, m = world.current, ctx = player.lastCtx;
        const fx = Math.sin(p.facing), fz = Math.cos(p.facing);
        const W = WEAPON_TYPES[weapon];
        let n = 0;
        const targets = (m.hittables ?? []).filter(h => h.alive)
            .map(h => ({ h, d: Math.hypot(h.pos.x - p.pos.x, h.pos.z - p.pos.z) }))
            .filter(({ h, d }) => d <= reach && Math.abs(h.pos.y - p.pos.y) < 1.5 && (arc == null || d < 1e-4 || ((h.pos.x - p.pos.x) * fx + (h.pos.z - p.pos.z) * fz) / d >= arc))
            .sort((a, b) => a.d - b.d);
        for (const { h } of targets) {
            if (n >= max) break;
            const base = 8 + stats.attributes.strength * 2 + Math.floor(Math.random() * 6) - 2;
            const dmg = Math.max(1, Math.floor(base * W.dmgMult * M.levelDamageMult(stats.weaponLevel(weapon)) * (k.mult ?? 1) * player.statsMult()));
            h.hit(dmg, p.pos, 0, ctx, k.status ? { id: k.status, ms: k.statusMs } : null);
            if (h.kind !== 'shadow') hud.floater(h.pos.clone().setY(h.pos.y + 1.9), `${dmg}`, '#ffe0a0');
            stats.gainWeaponPoints(weapon, M.hitGain(!h.alive));
            n++;
        }
        if (n) cam.kick(0.12);
        return n;
    }

    function use(i) {
        const { weapon, skills } = bar();
        const id = skills[i];
        const k = STYLE_SKILLS[id];
        if (!k) return false;
        const state = skillState(stats.styles, id, stats.weaponLevel(weapon), true);
        if (state === 'style') return hud.message(`Learn the ${STYLES[k.style].name} style first (practise it)`), false;
        if (state === 'mastery') return hud.message(`${k.name} needs ${WEAPON_TYPES[weapon].label} mastery ${k.unlock}`), false;
        if ((cds[id] ?? 0) > 0) return hud.message(`${k.name} is not ready`), false;
        if (!PLAYABLE.has(k.kind)) return hud.message(`${k.name}: not in 3D yet`), false;
        if (player.state.dead || player.state.cast) return false;

        if (k.kind === 'buff') {
            player.addBuff(k.buff, k.buffMs ?? STATUS_DEFS[k.buff]?.duration ?? 3000);
            hud.message(k.name);
        } else if (k.kind === 'strike') {
            player.playStrike();
            hitAround(k, weapon, { arc: 0.2, reach: toM(k.reach ?? WEAPON_TYPES[weapon].reach) + toM(k.radius ?? 0) * 0.5 + 0.4, max: k.max ?? 1 });
        } else if (k.kind === 'spin') {
            player.playSpin();
            hitAround(k, weapon, { arc: null, reach: toM(k.radius ?? 48) + 0.5 });
        }
        cds[id] = (k.cd ?? 3000) / 1000;
        return true;
    }

    function update(dt) {
        for (const id of Object.keys(cds)) cds[id] = Math.max(0, cds[id] - dt);
        const { weapon, skills } = bar();
        tiles.forEach((tile, i) => {
            const k = STYLE_SKILLS[skills[i]];
            tile.t.style.display = k ? '' : 'none';
            if (!k) return;
            tile.name.textContent = k.name;
            const ready = skillState(stats.styles, k.id, stats.weaponLevel(weapon), true) === 'ready' && PLAYABLE.has(k.kind);
            tile.t.classList.toggle('off', !ready);
            tile.t.title = k.desc;
            tile.cd.style.height = `${Math.min(1, (cds[k.id] ?? 0) / ((k.cd ?? 3000) / 1000)) * 100}%`;
        });
    }

    return { use, update };
}
