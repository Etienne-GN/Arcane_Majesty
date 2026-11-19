// Style skills — the three skills of the style being practised with the weapon in hand (amo C3):
// Z / X / V, gamepad RB / LT / right-stick click, three touch buttons. Each needs the style learned
// and the weapon's mastery (2 / 5 / 8) — styles.js skillState — and has its own cooldown (k.cd).
// Kinds: strike (in front), spin (all around), buff (a stance on you, amo STATUS_DEFS), dash (lunge ahead through a
// line), leap (jump ahead, land among them), line (a thrust through a whole row), flurry (fast blows in front),
// shadowstep (behind the nearest enemy), taunt (draw them in, take less), shot (a bow / crossbow skill shot),
// volley (quick magic bolts), chain (a bolt that jumps), release (all your mana in a blast around you).
import { styles as styleRules, styleData, weapons as weaponRules, mastery as M, items as itemRules, statuses } from '@rules';

const { STYLE_SKILLS, STYLES } = styleData;
const { skillState, practising } = styleRules;
const { WEAPON_TYPES, typeOf } = weaponRules;
const { STATUS_DEFS } = statuses;
const PLAYABLE = new Set(['strike', 'spin', 'buff', 'dash', 'leap', 'line', 'flurry', 'shadowstep', 'taunt', 'shot', 'volley', 'chain', 'release']);
import * as THREE from 'three';
const toM = px => (px / 32) * 2;   // amo pixels → metres, with the 3D reach tuning

const CSS = `
#skills { position: fixed; left: 50%; bottom: 92px; transform: translateX(-50%); display: flex; gap: 8px; z-index: 4; }
#skills .sk { position: relative; width: 92px; padding: 5px 6px; border-radius: 8px; border: 1px solid #c9b6ff66; background: #0009;
    font: calc(14px * var(--ui, 1)) Georgia, serif; color: #eee6d2; text-align: center; pointer-events: auto; cursor: pointer; overflow: hidden; }
#skills .sk.off { opacity: .35; }
#skills .sk .key { position: absolute; left: 4px; top: 1px; font-size: calc(13px * var(--ui, 1)); opacity: .7; }
#skills .sk .cd { position: absolute; left: 0; right: 0; bottom: 0; background: #000b; }
`;

export function createSkills({ stats, player, hud, cam, world, archery = () => null }) {
    const moves = [], bolts = [], timers = [];   // a lunge or leap in progress; magic bolts in flight; blows to come
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
            if (h.kind === 'deer') hud.floater(h.pos.clone().setY(h.pos.y + 1.9), `${dmg}`, '#ffe0a0');
            stats.gainWeaponPoints(weapon, M.hitGain(!h.alive));
            n++;
        }
        if (n) cam.kick(0.12);
        return n;
    }

    // Everyone in a line ahead (a lunge, a run-through): within `width` of the line, up to `length` metres.
    function hitLine(k, weapon, length, width = 1.1, from = null, dir = null) {
        const p = player.state, m = world.current, ctx = player.lastCtx, W = WEAPON_TYPES[weapon];
        const o = from ?? p.pos, fx = dir?.x ?? Math.sin(p.facing), fz = dir?.z ?? Math.cos(p.facing);
        let n = 0;
        for (const h of m.hittables ?? []) {
            if (!h.alive) continue;
            const dx = h.pos.x - o.x, dz = h.pos.z - o.z, along = dx * fx + dz * fz, side = Math.abs(dx * fz - dz * fx);
            if (along < -0.3 || along > length || side > width || Math.abs(h.pos.y - p.pos.y) > 1.5) continue;
            const base = 8 + stats.attributes.strength * 2 + Math.floor(Math.random() * 6) - 2;
            h.hit(Math.max(1, Math.floor(base * W.dmgMult * M.levelDamageMult(stats.weaponLevel(weapon)) * (k.mult ?? 1) * player.statsMult())), p.pos, 0, ctx, k.status ? { id: k.status, ms: k.statusMs } : null);
            stats.gainWeaponPoints(weapon, M.hitGain(!h.alive)); n++;
        }
        if (n) cam.kick(0.14);
        return n;
    }
    // Move the hero over `dur` seconds (a lunge or a leap), sliding off walls; invulnerable meanwhile.
    function travel(dist, dur, then, { arc = 0 } = {}) {
        const p = player.state;
        moves.push({ t: 0, dur, dx: Math.sin(p.facing) * dist / dur, dz: Math.cos(p.facing) * dist / dur, then, arc, y0: p.pos.y });
        p.invuln = Math.max(p.invuln ?? 0, dur + 0.1);
    }
    // The nearest living enemy, optionally only in front of you, within r metres.
    function nearest(r, front = true, from = player.state.pos, except = null) {
        const p = player.state, fx = Math.sin(p.facing), fz = Math.cos(p.facing);
        let best = null, bd = r;
        for (const h of world.current.hittables ?? []) {
            if (!h.alive || except?.has(h) || ['deer'].includes(h.kind)) continue;
            const dx = h.pos.x - from.x, dz = h.pos.z - from.z, d = Math.hypot(dx, dz);
            if (d > bd || (front && d > 0.5 && (dx * fx + dz * fz) / d < 0.3)) continue;
            best = h; bd = d;
        }
        return best;
    }
    // A magic bolt (wands): flies to its target and strikes; onHit can send it on (a chain).
    function bolt(target, dmg, from, onHit = null, color = 0xb89aff) {
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), new THREE.MeshBasicMaterial({ color, toneMapped: false }));
        const light = new THREE.PointLight(color, 4, 5, 1.6); m.add(light);
        m.position.copy(from); world.current.scene.add(m);
        bolts.push({ m, target, dmg, onHit, scene: world.current.scene });
    }
    const magicDmg = (k, weapon) => { const W = WEAPON_TYPES[weapon]; return Math.max(1, Math.floor((8 + stats.attributes.intelligence * 2 + Math.floor(Math.random() * 6) - 2) * W.dmgMult * M.levelDamageMult(stats.weaponLevel(weapon)) * (k.mult ?? 1) * player.statsMult())); };
    function ring(radius, color = 0xffd090) {   // a flash on the ground (a landing, a release)
        const r = new THREE.Mesh(new THREE.RingGeometry(0.7, 1, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, toneMapped: false, depthWrite: false }));
        r.position.copy(player.state.pos).setY(player.state.pos.y + 0.06); world.current.scene.add(r);
        timers.push({ t: 0, dur: 0.45, fn: k => { r.scale.setScalar(0.3 + k * radius); r.material.opacity = 0.8 * (1 - k); if (k >= 1) r.parent?.remove(r); } });
    }

    function use(i) {
        const { weapon, skills } = bar();
        return useId(skills[i], weapon);
    }
    function useId(id, weapon) {
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
        } else if (k.kind === 'dash') {   // Piercing Lunge: forward fast, piercing everything along the way
            const from = player.state.pos.clone(), dir = new THREE.Vector3(Math.sin(player.state.facing), 0, Math.cos(player.state.facing));
            player.playStrike(); travel(toM(k.dist ?? 48), 0.22, () => hitLine(k, weapon, toM(k.length ?? 96) * 0.6 + 1, 1.1, from, dir));
        } else if (k.kind === 'leap') {   // Leaping Strike: jump ahead, land in the middle of them
            travel(toM(k.dist ?? 90) * 0.7, 0.5, () => { player.playSpin(); ring(toM(k.radius ?? 44) + 0.5); hitAround(k, weapon, { arc: null, reach: toM(k.radius ?? 44) + 0.5 }); cam.kick(0.3); }, { arc: 1.6 });
        } else if (k.kind === 'line') {   // Run Through: one thrust through the whole row
            player.playStrike(); hitLine(k, weapon, toM(k.length ?? 120) * 0.6 + 1.2, 0.9);
        } else if (k.kind === 'flurry') {   // Flurry of Blows: fast blows, one after another
            for (let n = 0; n < (k.hits ?? 4); n++) timers.push({ t: -n * (k.gap ?? 90) / 1000, dur: 0.01, fn: q => { if (q >= 1) { player.playStrike(); hitAround(k, weapon, { arc: 0.2, reach: toM(k.reach ?? 40) + toM(k.radius ?? 30) * 0.5 + 0.6, max: 3 }); } } });
        } else if (k.kind === 'shadowstep') {   // behind the nearest enemy, facing its back
            const h = nearest(toM(k.range ?? 140) * 1.5, false);
            if (!h) return hud.message('No one near enough to step behind'), false;
            const p = player.state, dx = h.pos.x - p.pos.x, dz = h.pos.z - p.pos.z, d = Math.hypot(dx, dz) || 1;
            const nx = h.pos.x + dx / d * 1.2, nz = h.pos.z + dz / d * 1.2;
            if (world.current.blockedAt?.(nx, nz, 0.4) === 'wall') return hud.message('No room behind it'), false;
            p.pos.x = nx; p.pos.z = nz; p.facing = Math.atan2(-dx, -dz); p.invuln = 0.4;
            player.addBuff('vanished', 1500); hud.message(k.name);
        } else if (k.kind === 'taunt') {   // Taunt: you take less, and they come to you
            player.addBuff(k.buff ?? 'taunting', k.buffMs ?? 4000);
            for (const h of world.current.hittables ?? []) if (h.alive && h.kind !== 'deer' && Math.hypot(h.pos.x - player.state.pos.x, h.pos.z - player.state.pos.z) < 12) h.provoke?.();
            ring(6, 0xffaa66); hud.message(k.name);
        } else if (k.kind === 'shot') {   // a bow / crossbow skill: a special shot
            const a = archery();
            if (!a?.armed()) return hud.message('Draw the bow first'), false;
            if (!a.shoot({ mult: k.mult ?? 1, rangeMult: k.rangeMult, status: k.status ? { id: k.status, ms: k.statusMs } : null, pierce: !!k.pierce })) return false;
            hud.message(k.name);
        } else if (k.kind === 'volley') {   // Snap Cast: quick bolts, one after another, at whoever is in front
            const h = nearest(14);
            if (!h) return hud.message('No target in front'), false;
            for (let n = 0; n < (k.hits ?? 3); n++) timers.push({ t: -n * (k.gap ?? 110) / 1000, dur: 0.01, fn: q => { if (q >= 1) { player.playShot(); bolt(h, magicDmg(k, weapon), player.state.pos.clone().setY(player.state.pos.y + 1.5)); } } });
        } else if (k.kind === 'chain') {   // Chain: a bolt that jumps from enemy to enemy
            const first = nearest(14);
            if (!first) return hud.message('No target in front'), false;
            const struck = new Set(); let left = k.jumps ?? 3, dmg = magicDmg(k, weapon);
            const jump = (h, from) => bolt(h, dmg, from, hit => { struck.add(hit); if (left-- <= 0) return; dmg = Math.max(1, Math.round(dmg * (k.jumpMult ?? 0.75))); const next = nearest(toM(k.radius ?? 90) * 1.4, false, hit.pos, struck); if (next) jump(next, hit.pos.clone().setY(hit.pos.y + 1.2)); }, 0x9ad8ff);
            player.playShot(); jump(first, player.state.pos.clone().setY(player.state.pos.y + 1.5));
        } else if (k.kind === 'release') {   // Release: all your mana in a blast around you — more mana, bigger blast
            const mana = stats.mana;
            if (mana < (k.manaPer ?? 40)) return hud.message('Not enough mana to release'), false;
            stats.mana = 0;
            const r = toM(k.radius ?? 80) * (0.7 + Math.min(1.5, mana / ((k.manaPer ?? 40) * 4)));
            player.playSpin(); ring(r, 0xb89aff); cam.kick(0.4);
            hitAround({ ...k, mult: (k.mult ?? 1.2) * (1 + mana / ((k.manaPer ?? 40) * 3)) }, weapon, { arc: null, reach: r });
        }
        cds[id] = (k.cd ?? 3000) / 1000;
        return true;
    }

    function update(dt) {
        for (const id of Object.keys(cds)) cds[id] = Math.max(0, cds[id] - dt);
        const p = player.state, m = world.current;
        for (let i = moves.length - 1; i >= 0; i--) {   // a lunge or a leap: step by step, sliding off walls
            const mv = moves[i]; mv.t += dt;
            const nx = p.pos.x + mv.dx * dt, nz = p.pos.z + mv.dz * dt;
            if (m.blockedAt?.(nx, nz, 0.4, p.pos.y) !== 'wall') { p.pos.x = nx; p.pos.z = nz; }
            m.resolve?.(p.pos, 0.4);
            if (mv.arc) { const k = Math.min(1, mv.t / mv.dur); p.pos.y = Math.max(p.pos.y, (m.heightAt?.(p.pos.x, p.pos.z) ?? p.pos.y) + Math.sin(k * Math.PI) * mv.arc); }
            if (mv.t >= mv.dur) { moves.splice(i, 1); mv.then?.(); }
        }
        for (let i = timers.length - 1; i >= 0; i--) { const tm = timers[i]; tm.t += dt; if (tm.t >= 0) { const k = Math.min(1, tm.t / tm.dur); tm.fn(k); if (k >= 1) timers.splice(i, 1); } }
        for (let i = bolts.length - 1; i >= 0; i--) {   // magic bolts home on their target
            const b = bolts[i], tg = b.target;
            if (b.scene !== m.scene || !tg.alive) { b.m.parent?.remove(b.m); bolts.splice(i, 1); continue; }
            const to = new THREE.Vector3(tg.pos.x, tg.pos.y + 1.1, tg.pos.z).sub(b.m.position), d = to.length();
            if (d < 0.5) { tg.hit(b.dmg, p.pos, 0, player.lastCtx, null, 'arcane'); stats.gainWeaponPoints(weaponType(), M.hitGain(!tg.alive)); b.m.parent?.remove(b.m); bolts.splice(i, 1); b.onHit?.(tg); continue; }
            b.m.position.addScaledVector(to, Math.min(1, 22 * dt / d));
        }
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

    return { use, useId, update };
}
