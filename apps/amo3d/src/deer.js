// A procedural deer (stag or doe) with a small brain: graze, wander, look up, flee, get hit.
import * as THREE from 'three';
import { flat, shadows } from './lib.js';

function limb(len, r0, r1, m) {
    const j = new THREE.Group();
    const g = new THREE.CylinderGeometry(r0, r1, len, 6);
    g.translate(0, -len / 2, 0);
    j.add(new THREE.Mesh(g, m));
    return j;
}
const part = (geo, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); return o; };

function buildDeer(stag) {
    const M = { fur: flat(stag ? 0x7d4f2c : 0x9a6a3e), belly: flat(0xd9c3a0), dark: flat(0x2a1d14), antler: flat(0xd8c9a8) };
    const root = new THREE.Group();
    const body = new THREE.Group();
    body.position.y = 0.95;
    root.add(body);

    const torso = part(new THREE.CylinderGeometry(0.27, 0.24, 1.05, 8).rotateX(Math.PI / 2), M.fur);
    torso.scale.set(0.85, 1, 1);
    body.add(torso);
    body.add(part(new THREE.SphereGeometry(0.29, 8, 6), M.fur, 0, 0.02, 0.45));   // chest
    body.add(part(new THREE.SphereGeometry(0.26, 8, 6), M.fur, 0, 0.03, -0.45));  // rump
    body.add(part(new THREE.BoxGeometry(0.3, 0.1, 0.8), M.belly, 0, -0.2, 0));
    const tail = part(new THREE.ConeGeometry(0.06, 0.18, 5), M.belly, 0, 0.12, -0.7);
    tail.rotation.x = -2.4;
    body.add(tail);

    const legs = [];
    for (const [x, z, front] of [[0.15, 0.42, 1], [-0.15, 0.42, 1], [0.15, -0.42, 0], [-0.15, -0.42, 0]]) {
        const upper = limb(0.45, 0.075, 0.05, M.fur);
        upper.position.set(x, -0.1, z);
        const lower = limb(0.45, 0.04, 0.03, M.fur);
        lower.position.y = -0.45;
        lower.add(part(new THREE.BoxGeometry(0.06, 0.07, 0.08), M.dark, 0, -0.45, 0.01));
        upper.add(lower);
        body.add(upper);
        legs.push({ upper, lower, front });
    }

    const neck = new THREE.Group();
    neck.position.set(0, 0.12, 0.55);
    body.add(neck);
    neck.add(part(new THREE.CylinderGeometry(0.1, 0.15, 0.6, 7).translate(0, 0.3, 0), M.fur));
    const head = new THREE.Group();
    head.position.y = 0.6;
    neck.add(head);
    head.add(part(new THREE.BoxGeometry(0.2, 0.2, 0.26), M.fur, 0, 0.02, 0.04));
    const snout = part(new THREE.CylinderGeometry(0.06, 0.09, 0.24, 6).rotateX(Math.PI / 2), M.fur, 0, -0.02, 0.26);
    head.add(snout);
    head.add(part(new THREE.SphereGeometry(0.035, 5, 4), M.dark, 0, -0.01, 0.38));
    for (const s of [1, -1]) {
        head.add(part(new THREE.SphereGeometry(0.025, 5, 4), M.dark, s * 0.1, 0.05, 0.1));
        const ear = part(new THREE.ConeGeometry(0.05, 0.18, 4), M.fur, s * 0.12, 0.14, -0.04);
        ear.rotation.z = -s * 0.9;
        head.add(ear);
        if (stag) {
            const a = new THREE.Group();
            a.position.set(s * 0.06, 0.12, -0.02);
            a.rotation.set(-0.35, 0, -s * 0.45);
            head.add(a);
            const beam = part(new THREE.CylinderGeometry(0.018, 0.028, 0.55, 5).translate(0, 0.27, 0), M.antler);
            a.add(beam);
            for (const [y, rz, rx, len] of [[0.14, -s * 0.9, 0.5, 0.2], [0.3, s * 0.5, 0.6, 0.22], [0.44, -s * 0.6, 0.2, 0.18], [0.52, s * 0.4, -0.3, 0.16]]) {
                const tine = part(new THREE.CylinderGeometry(0.01, 0.018, len, 4).translate(0, len / 2, 0), M.antler, 0, y, 0);
                tine.rotation.set(rx, 0, rz);
                a.add(tine);
            }
        }
    }
    shadows(root, true, false);
    return { root, body, legs, neck, head, tail, mats: [M.fur, M.belly] };
}

export function createDeer({ home, stag = false, rng, map }) {
    const d = buildDeer(stag);
    const pos = new THREE.Vector3(home.x, map.heightAt(home.x, home.z), home.z);
    const s = {
        state: 'graze', timer: 2 + rng() * 4, target: null, heading: rng() * Math.PI * 2, speed: 0,
        phase: 0, hp: 50, flash: 0, burning: 0, deadT: 0, look: 0, graze: 0,
    };
    const dir = new THREE.Vector3();
    const prev = new THREE.Vector3();

    function pickTarget() {
        for (let i = 0; i < 12; i++) {
            const a = rng() * Math.PI * 2, r = 4 + rng() * 14;
            const x = home.x + Math.cos(a) * r, z = home.z + Math.sin(a) * r;
            if (!map.blockedAt(x, z, 0.6, map.heightAt(x, z))) return new THREE.Vector3(x, 0, z);
        }
        return new THREE.Vector3(home.x, 0, home.z);
    }

    function flee(from, time = 4) {
        if (s.state === 'dead') return;
        s.state = 'flee';
        s.timer = time;
        s.heading = Math.atan2(pos.x - from.x, pos.z - from.z) + (rng() - 0.5) * 0.6;
    }

    function hit(dmg, from, burnMs) {
        if (s.state === 'dead') return false;
        s.hp -= dmg;
        s.flash = 0.25;
        if (burnMs) s.burning = Math.max(s.burning, burnMs / 1000);
        if (s.hp <= 0) { s.state = 'dead'; s.deadT = 0; s.burning = Math.min(s.burning, 1.5); return true; }
        flee(from, 5);
        return false;
    }

    function update(dt, { player, fx }) {
        const toPlayer = Math.hypot(player.pos.x - pos.x, player.pos.z - pos.z);
        s.timer -= dt;
        let want = 0, lookAtPlayer = false, grazing = false;

        if (s.state === 'dead') {
            s.deadT += dt;
            const k = Math.min(1, s.deadT / 0.6);
            d.root.rotation.z = (Math.PI / 2) * k * k;
            d.root.position.y = pos.y + 0.25 * k - (s.deadT > 10 ? (s.deadT - 10) * 0.25 : 0);
            if (s.deadT > 16) { // a new deer wanders in at home
                Object.assign(s, { state: 'graze', hp: 50, timer: 3, burning: 0 });
                pos.set(home.x, map.heightAt(home.x, home.z), home.z);
                d.root.rotation.z = 0;
            }
        } else {
            const spook = player.sprinting ? 12 : 6.5;
            if (s.state !== 'flee' && toPlayer < spook) flee(player.pos);
            else if ((s.state === 'graze' || s.state === 'walk') && toPlayer < 14 && s.look <= 0) {
                s.state = 'alert'; s.timer = 1.5 + rng() * 1.5; s.look = 6;
            }
            s.look -= dt;

            if (s.state === 'graze') {
                grazing = true;
                if (s.timer <= 0) { s.state = 'walk'; s.target = pickTarget(); }
            } else if (s.state === 'alert') {
                lookAtPlayer = true;
                if (s.timer <= 0) { s.state = 'graze'; s.timer = 2 + rng() * 3; }
            } else if (s.state === 'walk') {
                const dx = s.target.x - pos.x, dz = s.target.z - pos.z;
                if (Math.hypot(dx, dz) < 0.8) { s.state = 'graze'; s.timer = 3 + rng() * 5; }
                else { s.heading = turn(s.heading, Math.atan2(dx, dz), dt * 3); want = 1.3; }
            } else if (s.state === 'flee') {
                want = 8.5;
                if (s.timer <= 0) { s.state = 'walk'; s.target = pickTarget(); }
            }
            if (lookAtPlayer) s.heading = turn(s.heading, Math.atan2(player.pos.x - pos.x, player.pos.z - pos.z), dt * 4);
        }

        s.speed += (want - s.speed) * (1 - Math.exp(-dt * (want > s.speed ? 5 : 3)));
        if (s.state !== 'dead' && s.speed > 0.05) {
            prev.copy(pos);
            dir.set(Math.sin(s.heading), 0, Math.cos(s.heading));
            pos.addScaledVector(dir, s.speed * dt);
            pos.y = map.heightAt(pos.x, pos.z);
            map.resolve(pos, 0.55);
            if (map.blockedAt(pos.x, pos.z, 0.5, pos.y) === 'wall' || Math.hypot(pos.x, pos.z) > 90) {
                pos.copy(prev);
                s.heading += (rng() < 0.5 ? 1 : -1) * (0.8 + rng());
                if (s.state === 'walk') s.target = pickTarget();
            } else if (s.state === 'flee' && prev.distanceTo(pos) < s.speed * dt * 0.4) {
                s.heading += (rng() - 0.5) * 2.5;
            }
            pos.y = map.heightAt(pos.x, pos.z);
        }

        // ---- animation ----
        if (s.state !== 'dead') {
            d.root.position.copy(pos);
            d.root.rotation.y = s.heading;
            const gallop = Math.min(1, Math.max(0, (s.speed - 2) / 4));
            s.phase += dt * (s.speed * (gallop > 0.5 ? 1.6 : 4.2));
            const amp = Math.min(1, s.speed / 1.2);
            for (const L of d.legs) {
                const off = gallop > 0.5 ? (L.front ? 0 : Math.PI * 0.7) + (L.upper.position.x > 0 ? 0.25 : 0)
                    : (L.front === (L.upper.position.x > 0) ? 0 : Math.PI);
                const sw = Math.sin(s.phase + off);
                L.upper.rotation.x = sw * (0.45 + gallop * 0.45) * amp;
                L.lower.rotation.x = (L.front ? 1 : -1) * Math.max(0, Math.cos(s.phase + off)) * 0.8 * amp;
            }
            d.body.rotation.x = gallop * Math.sin(s.phase) * 0.12;
            d.body.position.y = 0.95 + gallop * Math.abs(Math.sin(s.phase)) * 0.15;
            s.graze += ((grazing ? 1 : 0) - s.graze) * (1 - Math.exp(-dt * 2));
            d.neck.rotation.x = 0.35 + s.graze * 1.75 - (lookAtPlayer ? 0.15 : 0) + gallop * 0.3;
            d.head.rotation.x = -0.2 - s.graze * 0.5 + (lookAtPlayer ? -0.1 : 0);
            d.head.rotation.y = grazing ? Math.sin(performance.now() / 700) * 0.2 : 0;
            d.tail.rotation.x = -2.4 + (s.state === 'flee' ? -0.6 : 0);
        }

        s.flash = Math.max(0, s.flash - dt);
        for (const m of d.mats) m.emissive.setRGB(s.flash * 4, s.flash * 1.2, 0);
        if (s.burning > 0) {
            s.burning -= dt;
            if (fx && rng() < dt * 40) {
                fx.fire.emit({
                    x: pos.x + (rng() - 0.5) * 0.4, y: pos.y + 1.1 + rng() * 0.2, z: pos.z + (rng() - 0.5) * 0.4,
                    vx: (rng() - 0.5) * 0.3, vy: 1.4 + rng(), vz: (rng() - 0.5) * 0.3, life: 0.45,
                    size: [0.35, 0.05], c0: [1, 0.6, 0.15, 0.9], c1: [0.8, 0.15, 0.02, 0],
                });
            }
        }
    }

    return { root: d.root, pos, update, hit, get alive() { return s.state !== 'dead'; } };
}

function turn(a, b, k) {
    const diff = ((((b - a) + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
    return a + diff * Math.min(1, k);
}
