// What the style skills look like beyond the hero's pose: impact bursts, shock-waves and ground cracks, the arc of a
// great sweep, auras while a stance lasts (Rage's embers, the Shield Wall's pane, Deflect's whirling ring, Channel's
// gathering motes…), and marks on the creatures they leave changed (dazed stars, blood, roots, the hunter's mark,
// cracked armour, a limp). No lights are added (a changing light count recompiles every material); all glow is
// additive sprites and particles.
import { drape } from '../engine/drape.js';
import * as THREE from 'three';
import { Particles } from '../engine/lib.js';
import { statuses } from '@rules';
import { coreOf } from '../content/actors/enemyCore.js';

const { STATUS_DEFS } = statuses;
const R = Math.random;
const rgb = hex => [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255];

function starTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d');
    g.translate(32, 32); g.fillStyle = '#fff'; g.beginPath();
    for (let i = 0; i < 10; i++) { const r = i % 2 ? 11 : 28, a = i * Math.PI / 5 - Math.PI / 2; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    g.closePath(); g.fill();
    return new THREE.CanvasTexture(c);
}
function reticleTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d');
    g.strokeStyle = '#fff'; g.lineWidth = 7; g.translate(64, 64);
    g.beginPath(); g.arc(0, 0, 44, 0, Math.PI * 2); g.stroke();
    g.lineWidth = 5; g.beginPath(); g.arc(0, 0, 22, 0, Math.PI * 2); g.stroke();
    for (let i = 0; i < 4; i++) { g.rotate(Math.PI / 2); g.beginPath(); g.moveTo(0, 30); g.lineTo(0, 60); g.stroke(); }
    return new THREE.CanvasTexture(c);
}

export function createSkillFx() {
    const group = new THREE.Group();
    const glow = new Particles(900);
    const dust = new Particles(400, { additive: false });
    group.add(dust.points, glow.points);
    const live = [];   // { t, dur, fn(k), obj }
    const starTex = starTexture(), retTex = reticleTexture();
    let scene = null;

    const add = (obj, dur, fn) => { group.add(obj); live.push({ t: 0, dur, fn, obj }); };

    function burst(pos, color = 0xffd090, n = 24, speed = 4, { up = 1.5, life = 0.5, size = 0.22, grav = 6 } = {}) {
        const c = rgb(color);
        for (let i = 0; i < n; i++) {
            const a = R() * Math.PI * 2, v = speed * (0.4 + R() * 0.6);
            glow.emit({ x: pos.x, y: pos.y, z: pos.z, vx: Math.cos(a) * v, vy: up * (0.3 + R()), vz: Math.sin(a) * v, grav, drag: 2, life: life * (0.6 + R() * 0.6), size: [size, size * 0.2], c0: [...c, 1], c1: [c[0] * 0.6, c[1] * 0.4, c[2] * 0.3, 0] });
        }
    }
    function puff(pos, n = 18, color = [0.45, 0.4, 0.36], r = 1) {   // dust or smoke
        for (let i = 0; i < n; i++) {
            const a = R() * Math.PI * 2, v = (0.8 + R() * 1.5) * r;
            dust.emit({ x: pos.x + Math.cos(a) * 0.3, y: pos.y + 0.1 + R() * 0.3, z: pos.z + Math.sin(a) * 0.3, vx: Math.cos(a) * v, vy: 0.3 + R() * 0.8, vz: Math.sin(a) * v, drag: 2.5, life: 0.8 + R() * 0.6, size: [0.5 * r, 1.2 * r], c0: [...color, 0.55], c1: [...color, 0] });
        }
    }
    function shock(pos, radius, color = 0xffd090, dur = 0.45) {
        const m = new THREE.Mesh(new THREE.RingGeometry(0.75, 1, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, toneMapped: false, depthWrite: false, blending: THREE.AdditiveBlending }));
        m.position.set(pos.x, pos.y, pos.z); drape(m, 0.07);
        add(m, dur, k => { m.scale.setScalar(0.3 + k * radius); m.material.opacity = 0.85 * (1 - k); });
    }
    // Cracks in the ground, radiating from where a heavy blow landed; they fade over two seconds.
    function crack(pos, glowColor = null) {
        const g = new THREE.Group(), mat = new THREE.MeshBasicMaterial({ color: glowColor ?? 0x120c08, transparent: true, opacity: 0.85, depthWrite: false, toneMapped: !glowColor, blending: glowColor ? THREE.AdditiveBlending : THREE.NormalBlending });
        for (let i = 0; i < 7; i++) {
            let a = (i / 7) * Math.PI * 2 + R() * 0.5, x = 0, z = 0;
            for (let j = 0; j < 3; j++) {
                const len = 0.35 + R() * 0.45, nx = x + Math.sin(a) * len, nz = z + Math.cos(a) * len;
                const seg = new THREE.Mesh(new THREE.PlaneGeometry(0.07 - j * 0.015, len).rotateX(-Math.PI / 2), mat);
                seg.position.set((x + nx) / 2, 0, (z + nz) / 2); seg.rotation.y = a; g.add(seg);
                x = nx; z = nz; a += (R() - 0.5) * 0.9;
            }
        }
        g.position.set(pos.x, pos.y + 0.05, pos.z);
        add(g, 2.2, k => { mat.opacity = 0.85 * Math.min(1, (1 - k) * 3); });
    }
    // The arc a great blow cuts through the air: a pale crescent at chest height, sweeping from one side to the other.
    function arc(pos, facing, radius, { color = 0xfff0d0, from = -1.2, to = 1.2, y = 1.1, dur = 0.28, width = 0.35 } = {}) {
        const n = 24, geo = new THREE.RingGeometry(radius - width, radius, n, 1, 0, Math.abs(to - from));
        geo.rotateX(-Math.PI / 2);
        const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, toneMapped: false, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
        m.position.set(pos.x, pos.y + y, pos.z);
        m.rotation.y = facing + Math.PI / 2 - Math.max(from, to);   // ring angle 0 = +x; centred ahead of the facing
        add(m, dur, k => { m.material.opacity = 0.75 * Math.sin(k * Math.PI); m.scale.setScalar(0.9 + 0.2 * k); });
    }
    // A pale flat pane before the hero (Shield Wall / Perfect Block), a whirling ring (Deflect Arrows).
    const pane = new THREE.Mesh(new THREE.CircleGeometry(0.85, 6), new THREE.MeshBasicMaterial({ color: 0x9ab8ff, transparent: true, opacity: 0, toneMapped: false, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
    const whirl = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.04, 6, 40), new THREE.MeshBasicMaterial({ color: 0xd8f0c0, transparent: true, opacity: 0, toneMapped: false, depthWrite: false, blending: THREE.AdditiveBlending }));
    whirl.rotation.x = Math.PI / 2;
    const tauntRing = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffaa66, transparent: true, opacity: 0, toneMapped: false, depthWrite: false, blending: THREE.AdditiveBlending }));
    group.add(pane, whirl, tauntRing);

    // ---- creature marks ----
    const marks = new Map();   // core → { stars:[], ret, roots }
    const heights = new WeakMap();
    const box = new THREE.Box3();
    function heightOf(h) {
        let v = heights.get(h);
        if (v == null && h.root) { box.setFromObject(h.root); v = Number.isFinite(box.max.y) ? Math.max(0.6, box.max.y - h.pos.y) : 1.8; heights.set(h, v); }
        return v ?? 1.8;
    }
    function marksFor(core) {
        let mk = marks.get(core);
        if (!mk) {
            const stars = [0, 1, 2].map(() => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex, color: 0xffe066, transparent: true, depthWrite: false, toneMapped: false })); sp.scale.setScalar(0.26); sp.visible = false; group.add(sp); return sp; });
            const ret = new THREE.Sprite(new THREE.SpriteMaterial({ map: retTex, color: 0xff4040, transparent: true, depthWrite: false, toneMapped: false, opacity: 0.9 }));
            ret.scale.setScalar(0.7); ret.visible = false; group.add(ret);
            const roots = new THREE.Group();
            const rmat = new THREE.MeshStandardMaterial({ color: 0x4e6a2c, roughness: 0.9 });
            for (let i = 0; i < 6; i++) { const v = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.7, 4), rmat); const a = i / 6 * Math.PI * 2; v.position.set(Math.cos(a) * 0.45, 0.25, Math.sin(a) * 0.45); v.rotation.z = Math.cos(a) * -0.5; v.rotation.x = Math.sin(a) * 0.5; roots.add(v); }
            roots.visible = false; group.add(roots);
            mk = { stars, ret, roots, seen: 0 };
            marks.set(core, mk);
        }
        return mk;
    }
    function hideMarks(mk) { for (const s of mk.stars) s.visible = false; mk.ret.visible = false; mk.roots.visible = false; }

    let t = 0, frame = 0;
    function update(dt, { player, hittables = [], hero = null } = {}) {
        t += dt; frame++;
        glow.update(dt); dust.update(dt);
        for (let i = live.length - 1; i >= 0; i--) {
            const L = live[i]; L.t += dt;
            const k = Math.min(1, L.t / L.dur); L.fn(k);
            if (k >= 1) { group.remove(L.obj); L.obj.traverse?.(o => { o.geometry?.dispose(); }); live.splice(i, 1); }
        }
        // Auras while a stance lasts.
        if (player && !player.dead) {
            const P = player.pos, b = player.buffs ?? {}, f = player.facing;
            const fx = Math.sin(f), fz = Math.cos(f);
            const motes = (color, rate, { r = 0.55, vy = 1.2, size = 0.12, inward = false, y0 = 0.2 } = {}) => {
                if (R() > rate * dt) return;
                const c = rgb(color), a = R() * Math.PI * 2, rr = inward ? 1.6 : r * (0.6 + R() * 0.5);
                const x = P.x + Math.cos(a) * rr, z = P.z + Math.sin(a) * rr, y = P.y + y0 + R() * 1.4;
                glow.emit({ x, y, z, vx: inward ? (P.x - x) * 1.8 : 0, vy: inward ? (P.y + 1.1 - y) * 1.8 : vy * (0.5 + R()), vz: inward ? (P.z - z) * 1.8 : 0, drag: 0.5, life: inward ? 0.55 : 0.7, size: [size, size * 0.3], c0: [...c, 0.95], c1: [...c, 0] });
            };
            if (b.raging) motes(0xff3a1a, 40, { size: 0.14 });
            if (b.rampage) motes(0xff7a2a, 40, { size: 0.16 });
            if (b.frenzy) motes(0xffb040, 30, { vy: 2.2 });
            if (b.steady) motes(0xc8c8d8, 10, { vy: 0.4, y0: 0 });
            if (b.channeling) motes(0x88ccff, 45, { inward: true });
            if (b.overloaded) motes(0xff88ff, 35, { r: 0.4, vy: 1.8, size: 0.1 });
            if (b.echoing) { const a = t * 5; for (const o of [0, Math.PI]) if (R() < 0.6) glow.emit({ x: P.x + Math.cos(a + o) * 0.8, y: P.y + 1.3 + Math.sin(t * 3) * 0.2, z: P.z + Math.sin(a + o) * 0.8, vx: 0, vy: 0.1, vz: 0, life: 0.5, size: [0.12, 0.02], c0: [0.8, 0.6, 1, 0.9], c1: [0.5, 0.3, 1, 0] }); }
            if (b.aiming) motes(0xeeeeaa, 6, { vy: 0.3 });
            const wall = b.shield_wall || b.perfect_block;
            pane.material.opacity += ((wall ? (b.perfect_block ? 0.45 : 0.28) : 0) - pane.material.opacity) * Math.min(1, dt * 12);
            pane.visible = pane.material.opacity > 0.01;
            if (pane.visible) { pane.position.set(P.x + fx * 0.75, P.y + 1.15, P.z + fz * 0.75); pane.rotation.set(0, f, Math.PI / 6); pane.material.color.setHex(b.perfect_block ? 0xffe2a0 : 0x9ab8ff); }
            whirl.material.opacity += ((b.deflecting ? 0.55 : 0) - whirl.material.opacity) * Math.min(1, dt * 10);
            whirl.visible = whirl.material.opacity > 0.01;
            if (whirl.visible) { whirl.position.set(P.x, P.y + 1.2 + Math.sin(t * 9) * 0.08, P.z); whirl.rotation.z = t * 14; whirl.scale.setScalar(1 + Math.sin(t * 20) * 0.04); if (R() < 0.5) glow.emit({ x: P.x + Math.cos(t * 14) * 1.1, y: P.y + 1.2, z: P.z + Math.sin(t * 14) * 1.1, vx: 0, vy: 0, vz: 0, life: 0.25, size: [0.1, 0.02], c0: [0.85, 0.95, 0.75, 0.9], c1: [0.6, 0.8, 0.5, 0] }); }
            tauntRing.visible = !!b.taunting;
            if (tauntRing.visible) { const k = (t * 1.5) % 1; tauntRing.position.set(P.x, P.y + 0.06, P.z); tauntRing.scale.setScalar(0.6 + k * 2.4); tauntRing.material.opacity = 0.6 * (1 - k); }
        } else { pane.visible = whirl.visible = tauntRing.visible = false; }

        // Marks on creatures.
        const seen = new Set();
        for (const h of hittables) {
            const core = coreOf(h.pos);
            if (!core || !h.alive) continue;
            const fxs = core.s.fx, mk = (fxs.dazed || fxs.hunted || fxs.snared || fxs.bleeding || fxs.sundered || fxs.crippled || marks.has(core)) ? marksFor(core) : null;
            if (!mk) continue;
            seen.add(core);
            const H = heightOf(h), p = h.pos;
            mk.stars.forEach((s, i) => { s.visible = !!fxs.dazed; if (s.visible) { const a = t * 4 + i * Math.PI * 2 / 3; s.position.set(p.x + Math.cos(a) * 0.4, p.y + H + 0.15 + Math.sin(t * 6 + i) * 0.05, p.z + Math.sin(a) * 0.4); s.material.rotation = t * 3; } });
            mk.ret.visible = !!fxs.hunted;
            if (mk.ret.visible) { mk.ret.position.set(p.x, p.y + H + 0.55, p.z); mk.ret.material.rotation = t * 1.2; mk.ret.material.opacity = 0.65 + Math.sin(t * 5) * 0.25; }
            mk.roots.visible = !!fxs.snared;
            if (mk.roots.visible) { mk.roots.position.set(p.x, p.y, p.z); mk.roots.scale.setScalar(Math.min(1, (core.s.fx.snared.left ?? 1) * 3)); }
            if (fxs.bleeding && R() < dt * 12) glow.emit({ x: p.x + (R() - 0.5) * 0.4, y: p.y + H * (0.4 + R() * 0.4), z: p.z + (R() - 0.5) * 0.4, vx: 0, vy: -0.5, vz: 0, grav: 9, life: 0.5, size: [0.09, 0.05], c0: [0.75, 0.05, 0.05, 1], c1: [0.4, 0, 0, 0.6] });
            if (fxs.sundered && R() < dt * 6) glow.emit({ x: p.x + (R() - 0.5) * 0.6, y: p.y + H * (0.3 + R() * 0.5), z: p.z + (R() - 0.5) * 0.6, vx: (R() - 0.5), vy: 0.6, vz: (R() - 0.5), grav: 4, life: 0.6, size: [0.08, 0.03], c0: [1, 0.55, 0.2, 1], c1: [0.6, 0.2, 0.05, 0] });
            if (fxs.crippled && R() < dt * 4) puff(p, 2, [0.4, 0.33, 0.25], 0.4);
        }
        for (const [core, mk] of marks) if (!seen.has(core) || core.s.dead) { hideMarks(mk); if (core.s.dead || frame - (mk.seen ?? 0) > 600) { for (const s of mk.stars) group.remove(s); group.remove(mk.ret, mk.roots); marks.delete(core); } } else mk.seen = frame;
    }

    return {
        setScene(s) { if (scene === s) return; scene = s; s.add(group); },
        burst, puff, shock, crack, arc, update,
    };
}
