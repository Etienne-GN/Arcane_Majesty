// Thaloria's people — amo's townsfolk (data/townsfolk: 41 residents, roles, homes, work, evenings,
// patrols, the named NPCs) with amo's schedules (systems/schedules.js whereAt: where each person is
// at any game minute, walking amo's routes). Positions are amo pixels on the city grid → metres here
// (1 tile = 32 px = 1 m). Looks come from the role (+ a stable hash of the resident). People near the
// player get the full character model; farther ones a cheap two-piece figure in their colours.
import * as THREE from 'three';
import { townsfolk as TF, schedules as SCH } from '@rules';
import { createCharacter } from '../models/character.js';
import { flat } from '../../engine/lib.js';

const NEAR = 24;
const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const pick = (arr, h, salt = 0) => arr[(h >>> salt) % arr.length];
const SKIN = ['#f1c9a5', '#e2b48f', '#c98f6a', '#a8704a', '#7a4e32'];
const HAIR = ['#1a1410', '#3a2418', '#5a3a22', '#8a5a2a', '#d9b25a', '#a8452a', '#8a8a8a'];

function lookFor(r) {
    const h = hash(r.id), hair = pick(HAIR, h, 3);
    const base = {
        skin: pick(SKIN, h), eyes: pick(['#5a7ab0', '#6a5a3a', '#4a8a5a', '#3a3a4a'], h, 7),
        hair: { style: pick(['short', 'tousled', 'long', 'ponytail', 'braids', 'bald'], h, 5), color: hair },
        facialHair: { style: r.role === 'child' ? 'none' : pick(['none', 'none', 'stubble', 'beard', 'moustache'], h, 9), color: hair },
        build: { height: 0.94 + ((h >>> 11) % 10) * 0.012, width: 0.92 + ((h >>> 13) % 10) * 0.02 },
    };
    const o = (style, coat, collar, extra = {}) => ({ ...base, outfit: { style, coat, collar, trim: '#b89a5a', vest: '#2a2420', shirt: '#d8d0c0', pants: '#3a3430', leather: '#5a3a22', leatherDark: '#3a2618' }, ...extra });
    switch (r.role) {
        case 'guard': return o('armour', '#2f4a7a', '#1f3050', { headgear: { type: 'helmet', color: '#9aa0a8' }, cape: true });
        case 'priest': return o('robe', '#e8e0d0', '#c8a050', { hood: (h & 1) === 1, hoodColor: '#e8e0d0' });
        case 'noble': return o('longcoat', pick(['#5a2a6a', '#2a4a3a', '#6a1a2a', '#2a3a6a'], h, 2), '#2a1a2a', { cape: (h & 2) === 2 });
        case 'child': return { ...o('tunic', pick(['#c86a3a', '#3a8ac8', '#6aa83a', '#c8a83a'], h, 2), '#5a3a22'), build: { height: 0.68, width: 0.82 } };
        case 'beggar': return o('robe', '#5a4a3a', '#3a2a1a', { hood: true, hoodColor: '#4a3a2a' });
        case 'drunk': return o('tunic', '#7a5a3a', '#4a3a22');
        case 'merchant': return o('tunic', pick(['#8a5a2a', '#2a6a5a', '#6a2a2a', '#4a4a6a'], h, 2), '#3a2a1a');
        default: return o('tunic', pick(['#6a5a4a', '#5a5a52', '#4a5a3a'], h, 2), '#3a2a1a');
    }
}

export function createTownsfolk({ scene, W, H, resolve = null, mapId = 'thaloria' }) {
    const town = TF.getTown('thaloria');
    const toX = px => px / 32 - W / 2, toZ = py => py / 32 - H / 2;
    const FACING = { down: 0, up: Math.PI, right: Math.PI / 2, left: -Math.PI / 2 };
    const labels = document.createElement('div');
    labels.style.cssText = 'position:fixed;inset:0;pointer-events:none;overflow:hidden';
    document.body.append(labels);

    const people = town.residents.map(r => {
        const look = lookFor(r);
        // The far figure: a body and a head in the person's colours (two meshes).
        const far = new THREE.Group();
        const bodyH = 1.5 * look.build.height;
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.18 * look.build.width, 0.26 * look.build.width, bodyH, 6).translate(0, bodyH / 2, 0), flat(look.outfit.coat));
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 6, 5).translate(0, bodyH + 0.12, 0), flat(look.hood ? (look.hoodColor ?? look.outfit.collar) : look.skin));
        body.castShadow = true;
        far.add(body, head);
        far.visible = false;
        scene.add(far);
        let label = null;
        if (r.npc) {
            label = document.createElement('div');
            label.textContent = r.npc.name.replace(/^./, c => c.toUpperCase());
            label.style.cssText = 'position:absolute;left:0;top:0;font:calc(15px * var(--ui, 1)) Georgia,serif;color:#f3e2b0;text-shadow:0 1px 3px #000;opacity:0;transition:opacity .3s;white-space:nowrap';
            labels.append(label);
        }
        return { r, look, far, model: null, pos: new THREE.Vector3(), facing: 0, speed: 0, shown: false, label, height: bodyH + 0.5 };
    });

    function ensureModel(p) {
        if (p.model) return p.model;
        p.model = createCharacter(p.look);
        p.model.setWeapons(p.r.role === 'guard' ? { type: 'spear', accent: 0x2f4a7a } : { type: 'fists' }, null);
        p.model.root.rotation.order = 'YXZ';
        scene.add(p.model.root);
        return p.model;
    }

    const tmp = new THREE.Vector3();
    return {
        people,
        update(dt, ctx) {
            const minutes = ctx.minutes ?? 600, P = ctx.player.pos;
            for (const p of people) {
                const w = SCH.whereAt(p.r, minutes, town);
                const out = !w || w.mapId !== mapId || !w.visible;
                if (out) {
                    p.shown = false; p.far.visible = false;
                    if (p.model) p.model.root.visible = false;
                    if (p.label) p.label.style.opacity = 0;
                    continue;
                }
                const tx = toX(w.x), tz = toZ(w.y);
                if (!p.shown || Math.hypot(tx - p.pos.x, tz - p.pos.z) > 4) p.pos.set(tx, 0, tz);   // appear / out of a door: no sliding
                // amo's spots sit on 2D tiles; a few fall inside our 3D houses' walls — step out of them.
                if (resolve) { resolve(p.pos, 0.3); }
                const dx = tx - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz);
                const k = Math.min(1, dt * 6);
                p.pos.x += dx * k; p.pos.z += dz * k;
                p.speed += ((w.moving ? Math.min(3, d / Math.max(dt, 1e-3) * 0.3 + 1.6) : 0) - p.speed) * Math.min(1, dt * 5);
                const want = w.moving && d > 0.01 ? Math.atan2(dx, dz) : typeof w.facing === 'number' ? w.facing : FACING[w.facing] ?? p.facing;
                const diff = ((((want - p.facing) + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
                p.facing += diff * Math.min(1, dt * 8);
                // Keep a body's width from the player (nobody walks through you).
                const px = p.pos.x - P.x, pz = p.pos.z - P.z, pd = Math.hypot(px, pz);
                if (pd < 0.75 && pd > 1e-3) { p.pos.x = P.x + (px / pd) * 0.75; p.pos.z = P.z + (pz / pd) * 0.75; }
                p.shown = true;
                p.activity = w.activity;
                const near = Math.hypot(p.pos.x - P.x, p.pos.z - P.z) < NEAR;
                p.far.visible = !near;
                if (!near) { p.far.position.copy(p.pos); p.far.rotation.y = p.facing; if (p.model) p.model.root.visible = false; }
                else {
                    const m = ensureModel(p);
                    m.root.visible = true;
                    m.root.position.copy(p.pos);
                    m.root.rotation.y = p.facing;
                    m.update(dt, { speed: p.speed, sprinting: false, hopK: null });
                }
                if (p.label) {
                    tmp.set(p.pos.x, p.height, p.pos.z).project(ctx.camera);
                    const close = Math.hypot(p.pos.x - P.x, p.pos.z - P.z) < 9 && tmp.z < 1;
                    p.label.style.opacity = close ? 1 : 0;
                    p.label.style.transform = `translate(${(tmp.x * 0.5 + 0.5) * innerWidth}px, ${(-tmp.y * 0.5 + 0.5) * innerHeight}px) translate(-50%, -100%)`;
                }
            }
        },
        setVisible(v) { labels.style.display = v ? '' : 'none'; },
        // Anyone close enough to talk to (named people first).
        nearestPerson(pos, within = 2.2) {
            let best = null, bd = within;
            for (const p of people) if (p.shown) { const d = Math.hypot(p.pos.x - pos.x, p.pos.z - pos.z) - (p.r.npc ? 0.4 : 0); if (d < bd) { bd = d; best = p; } }
            return best;
        },
        nearestNamed(pos, within = 2.4) {
            let best = null, bd = within;
            for (const p of people) if (p.shown && p.r.npc) { const d = Math.hypot(p.pos.x - pos.x, p.pos.z - pos.z); if (d < bd) { bd = d; best = p; } }
            return best;
        },
    };
}
