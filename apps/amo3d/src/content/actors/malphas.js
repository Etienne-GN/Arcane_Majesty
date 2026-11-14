// Malphas, the Whisperer of Doubt — Void General, waiting on the Summit Pass (lore DB: "a feeding thing;
// carries the winter like an instrument"; Eldrin breaks his illusion-hold and he retreats alive — the only
// surviving General). The fight is amo's BossEnemy, numbers unchanged (350 HP, 20 damage, strike every
// 1.4 s, shadow burst every 4.2 s up close; 50%: enrage ×1.6 speed ×1.5 damage; 25%: void rain every 5.5 s
// and a teleport every 7 s) plus his own: at 75% he splits into illusions — only the real one casts a
// shadow (Aether Sight) — whose blows drain Vigor instead of health; the winter closes in as he weakens.
// At 0 he does not die: he tears free and flees into the storm (amo's kill event 'void_general', so the
// quest "Whisperer of Doubt" completes). Once he has fled he never returns (flag malphas_retreated).
import * as THREE from 'three';
import { createEnemyCore, PX } from './enemyCore.js';
import { flat } from '../../engine/lib.js';

const DEF = { name: 'Malphas', health: 350, damage: 20, speed: 42, sightRange: 260, attackRange: 52, xpReward: 280, lootTable: [] };
const SPEED = (DEF.speed / PX) * 1.6, REACH = 2.2, BURST_R = 4.6, ARENA = 10, LEASH = 24;

function body(illusion) {
    const root = new THREE.Group(), parts = {};
    const cast = !illusion;   // Aether Sight: an illusion casts no shadow
    const add = (geo, m, x = 0, y = 0, z = 0, parent = root) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = cast; parent.add(o); return o; };
    const robe = flat(0x1a1c26), rag = flat(0x262a38, { side: THREE.DoubleSide }), mask = flat(0xdfe6ee), ice = new THREE.MeshStandardMaterial({ color: 0xcfeaff, emissive: 0x5aa8e8, emissiveIntensity: 0.9, flatShading: true });
    add(new THREE.ConeGeometry(0.75, 2.3, 9, 1, true).translate(0, 1.15, 0), rag);
    add(new THREE.CylinderGeometry(0.28, 0.42, 1.0, 8), robe, 0, 2.0, 0);
    parts.hood = add(new THREE.ConeGeometry(0.36, 0.7, 8), robe, 0, 2.75, -0.02);
    add(new THREE.SphereGeometry(0.22, 8, 6), mask, 0, 2.55, 0.1).scale.set(0.9, 1.15, 0.6);
    parts.eyes = add(new THREE.BoxGeometry(0.24, 0.04, 0.03), new THREE.MeshBasicMaterial({ color: 0x9ae8ff, toneMapped: false }), 0, 2.6, 0.24);
    for (let k = 0; k < 5; k++) { const a = (k / 4 - 0.5) * 1.6, c = add(new THREE.ConeGeometry(0.05, 0.5 + (k % 2) * 0.25, 4), ice, Math.sin(a) * 0.26, 3.0, Math.cos(a) * 0.05 - 0.05); c.rotation.z = -a * 0.6; }
    // The winter he carries: a long ice instrument held across the body.
    parts.arm = new THREE.Group(); parts.arm.position.set(0.3, 2.1, 0.2); root.add(parts.arm);
    add(new THREE.CylinderGeometry(0.05, 0.08, 0.9, 5).rotateZ(1.2), robe, 0.25, -0.1, 0, parts.arm);
    parts.staff = add(new THREE.CylinderGeometry(0.035, 0.05, 2.4, 5), ice, 0.5, -0.2, 0.15, parts.arm);
    parts.staff.rotation.x = 0.35;
    for (let k = 0; k < 6; k++) { const r = add(new THREE.PlaneGeometry(0.22, 0.9), rag, Math.cos(k) * 0.6, 0.35, Math.sin(k) * 0.6); r.rotation.y = k; parts['rag' + k] = r; }
    if (!illusion) { parts.light = new THREE.PointLight(0x8fd0ff, 6, 10, 1.6); parts.light.position.y = 2.4; root.add(parts.light); }
    return { root, parts };
}

export function createMalphas({ scene, map, at, rng = Math.random }) {
    const home = new THREE.Vector3(at.x, at.y, at.z);
    const pos = home.clone();
    const real = body(false);
    scene.add(real.root);
    real.root.visible = false;
    const core = createEnemyCore({ type: 'void_general', name: 'Malphas · Whisperer of Doubt', pos, rng, respawnS: Infinity, def: DEF });
    const s = core.s;
    const st = { mode: 'dormant', t: 0, heading: 0, cd: 1.5, burstCd: 3, rainCd: 0, tpCd: 0, phase: 1, enraged: false, said: {}, swing: null, burst: null, rains: [], illusions: [], whiteout: 0, fled: false };
    st.pos = pos;
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.45, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x9ad8ff, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
    scene.add(ring);
    const rainGeo = new THREE.RingGeometry(1.0, 1.2, 28).rotateX(-Math.PI / 2);
    const say = (key, text, ctx) => { if (!st.said[key]) { st.said[key] = true; ctx.message?.(text); } };
    const ground = (x, z) => map.heightAt(x, z);
    const dmg = () => Math.round(DEF.damage * (st.enraged ? 1.5 : 1));

    // Illusions: copies that move and strike like him; a blow from one drains Vigor; one hit shatters it.
    function spawnIllusions(n, ctx) {
        for (let k = 0; k < n; k++) {
            const b = body(true), a = rng() * 6.28, r = 3 + rng() * 3;
            const ip = new THREE.Vector3(home.x + Math.cos(a) * r, 0, home.z + Math.sin(a) * r);
            ip.y = ground(ip.x, ip.z);
            scene.add(b.root);
            const il = { b, pos: ip, heading: 0, cd: 1 + rng(), swing: null, gone: false, kind: 'void_general', alive: true, engaged: true, t: rng() * 5 };
            il.hit = (_d, _from, _burn, c = ctx) => {
                if (il.gone) return 'handled';
                il.gone = true; il.alive = false; scene.remove(b.root);
                c?.floater?.(ip.clone().setY(ip.y + 2.2), 'an illusion', '#bfe4ff');
                c?.message?.(['Malphas: "Wrong. As always."', 'Malphas: "Again you strike at nothing."', 'Malphas: "How many of me do you see? How many of you?"'][Math.floor(rng() * 3)]);
                return 'handled';
            };
            il.update = () => {};
            st.illusions.push(il);
            map.hittables.push(il);
        }
        // He swaps places with one of them.
        const sw = st.illusions[Math.floor(rng() * st.illusions.length)];
        if (sw && !sw.gone) { const tmp = pos.clone(); pos.copy(sw.pos); sw.pos.copy(tmp); }
    }
    function clearIllusions() {
        for (const il of st.illusions) { if (!il.gone) scene.remove(il.b.root); il.gone = true; il.alive = false; const i = map.hittables.indexOf(il); if (i >= 0) map.hittables.splice(i, 1); }
        st.illusions = [];
    }

    function wake(ctx) {
        st.mode = 'intro'; st.t = 0;
        real.root.visible = true;
        pos.copy(home); pos.y = ground(pos.x, pos.z) - 3;
        ctx.message?.('The wind falls silent. Something rises from the snow…');
    }
    function reset() {   // you left the pass: he sinks back into the snow, whole again
        clearIllusions();
        core.revive();
        Object.assign(st, { mode: 'dormant', phase: 1, enraged: false, said: {}, swing: null, burst: null, rains: [], whiteout: 0, cd: 1.5, burstCd: 3 });
        st.rains.forEach(r => scene.remove(r.mesh));
        real.root.visible = false;
        ring.material.opacity = 0;
    }

    function strikeUpdate(who, P, dt, ctx, isReal) {
        const toP = Math.hypot(P.x - who.pos.x, P.z - who.pos.z);
        if (who.swing) {
            who.swing.t += dt;
            if (!who.swing.hit && who.swing.t > 0.6) {
                who.swing.hit = true;
                if (toP < REACH + 0.5 && !ctx.player.dead) {
                    if (isReal) ctx.hurtPlayer(dmg(), who.pos);
                    else { ctx.drainVigor?.(18); ctx.floater?.(P.clone().setY(P.y + 2), 'doubt −18 vigor', '#bfe4ff'); }
                }
            }
            if (who.swing.t > 1.0) who.swing = null;
            return 0;
        }
        who.cd -= dt;
        if (toP < REACH && who.cd <= 0) { who.swing = { t: 0, hit: false }; who.cd = 1.4 * (st.enraged ? 0.65 : 1); return 0; }
        return toP > REACH * 0.8 ? SPEED * (st.enraged ? 1.6 : 1) * (st.phase >= 3 ? 1.25 : 1) : 0;
    }
    function moveToward(who, P, speed, dt) {
        const want = Math.atan2(P.x - who.pos.x, P.z - who.pos.z);
        const d = ((((want - who.heading) + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
        who.heading += d * Math.min(1, dt * 6);
        const nx = who.pos.x + Math.sin(who.heading) * speed * dt, nz = who.pos.z + Math.cos(who.heading) * speed * dt;
        if (Math.hypot(nx - home.x, nz - home.z) < ARENA) { who.pos.x = nx; who.pos.z = nz; }
        who.pos.y = ground(who.pos.x, who.pos.z);
    }
    function pose(b, who, t, tell) {
        b.root.position.set(who.pos.x, who.pos.y + 0.3 + Math.sin(t * 1.7) * 0.12, who.pos.z);
        b.root.rotation.y = who.heading;
        const sw = who.swing ? Math.min(1, who.swing.t / 0.6) : 0;
        b.parts.arm.rotation.x = who.swing ? (who.swing.t < 0.6 ? -1.6 * sw : 0.8) : Math.sin(t) * 0.1;
        for (let k = 0; k < 6; k++) b.parts['rag' + k].rotation.x = Math.sin(t * 3 + k) * 0.25;
        b.parts.eyes.material.color.setRGB(tell ? 2.4 : 0.6, tell ? 2.4 : 0.9, tell ? 2.6 : 1);
    }

    function update(dt, ctx) {
        st.t += dt;
        const P = ctx.player.pos, fromHome = Math.hypot(P.x - home.x, P.z - home.z);
        if (st.fled || ctx.flags?.malphas_retreated) { real.root.visible = st.mode === 'fleeing' && st.t < 3.2; if (st.mode === 'fleeing') flee(dt, ctx); return; }
        if (st.mode === 'dormant') { if (fromHome < ARENA - 1 && !ctx.player.dead) wake(ctx); core.updatePlate(ctx.camera, 3.4); return; }
        if ((fromHome > LEASH || ctx.player.dead) && st.mode !== 'fleeing') { reset(); return; }
        if (!core.tick(dt, ctx)) { begin_flee(ctx); return; }
        s.engaged = true;
        if (st.mode === 'intro') {
            pos.y = ground(pos.x, pos.z) - 3 + Math.min(1, st.t / 2.2) * 3;
            pose(real, st, st.t, false);
            real.root.position.y = pos.y;
            if (st.t > 0.4) say('intro', 'Malphas: "So small, and so far from home. Who told you that you could carry this?"', ctx);
            if (st.t > 2.6) { st.mode = 'fight'; st.t = 0; }
            core.updatePlate(ctx.camera, 3.4);
            return;
        }
        if (fromHome > ARENA + 0.5 && Math.abs(P.y - home.y) < 4) {   // a wall of wind: no leaving the pass while he stands
            P.x = home.x + (P.x - home.x) / fromHome * (ARENA + 0.5); P.z = home.z + (P.z - home.z) / fromHome * (ARENA + 0.5);
            ctx.player.knock.set(home.x - P.x, 0, home.z - P.z).normalize().multiplyScalar(3);
            say('wall', 'The wind howls round the pass and throws you back. There is no leaving while he stands.', ctx);
        }
        const pct = s.hp / DEF.health;
        // A hero of their own cannot break him yet: near the end he laughs, the storm takes him, and he is whole again.
        if (ctx.customHero && pct <= 0.15) {
            ctx.message?.('Malphas: "Not you. Not yet. You are not the one this winter is waiting for." — the storm swallows him, and when it clears he is gone.');
            reset();
            return;
        }
        if (pct <= 0.75 && !st.said.p75) { say('p75', 'Malphas: "Look closer, scholar. Which of us is real? Which of you is?"  (Aether Sight: an illusion casts no shadow.)', ctx); spawnIllusions(2, ctx); }
        if (pct <= 0.5 && !st.enraged) { st.enraged = true; say('p50', 'Malphas: "The cold remembers everyone who turned back. It will remember you." — the winter closes in.', ctx); ctx.shake?.(0.4); if (st.illusions.every(i => i.gone)) spawnIllusions(2, ctx); }
        if (pct <= 0.25 && st.phase < 3) { st.phase = 3; st.rainCd = 1.2; st.tpCd = 3.8; say('p25', 'Malphas: "Every step you climbed, I was the voice that said: stop."', ctx); }
        st.whiteout = Math.min(1, (1 - pct) * 1.1);

        // Phase 3: void rain (six telegraphed circles around you) and the teleport behind you.
        if (st.phase >= 3) {
            st.rainCd -= dt; st.tpCd -= dt;
            if (st.rainCd <= 0) {
                st.rainCd = 5.5;
                for (let k = 0; k < 6; k++) {
                    const a = (k / 6) * Math.PI * 2 + rng() * 0.9, r = 1.1 + rng() * 2.1, x = P.x + Math.cos(a) * r, z = P.z + Math.sin(a) * r;
                    const mesh = new THREE.Mesh(rainGeo, new THREE.MeshBasicMaterial({ color: 0xb04aff, transparent: true, opacity: 0.8, depthWrite: false, toneMapped: false }));
                    mesh.position.set(x, ground(x, z) + 0.06, z); scene.add(mesh);
                    st.rains.push({ x, z, t: 0, mesh, done: false });
                }
            }
            if (st.tpCd <= 0 && !st.swing) {
                st.tpCd = 7;
                const back = Math.atan2(P.x - pos.x, P.z - pos.z);
                pos.x = P.x + Math.sin(back) * 2; pos.z = P.z + Math.cos(back) * 2;
                if (Math.hypot(pos.x - home.x, pos.z - home.z) > ARENA - 1) { pos.x = home.x; pos.z = home.z; }
                pos.y = ground(pos.x, pos.z); st.heading = back + Math.PI;
                ctx.message?.('He is behind you.');
            }
        }
        for (const r of st.rains) {
            r.t += dt;
            r.mesh.scale.setScalar(r.t < 0.52 ? 0.6 + r.t : 1.2);
            r.mesh.material.opacity = r.t < 0.52 ? 0.5 + Math.sin(r.t * 30) * 0.3 : Math.max(0, 1 - (r.t - 0.52) * 3);
            if (!r.done && r.t >= 0.52) { r.done = true; if (Math.hypot(P.x - r.x, P.z - r.z) < 1.25) ctx.hurtPlayer(Math.round(dmg() * 0.75), { x: r.x, z: r.z, y: P.y }); }
        }
        st.rains = st.rains.filter(r => { if (r.t > 0.9) { scene.remove(r.mesh); r.mesh.material.dispose(); return false; } return true; });

        // Shadow burst (amo: up close, every 4.2 s): a ring gathers, then blasts you back.
        st.burstCd -= dt;
        const toP = Math.hypot(P.x - pos.x, P.z - pos.z);
        if (!st.burst && !st.swing && st.burstCd <= 0 && toP < BURST_R) st.burst = { t: 0 };
        let speed = 0;
        if (st.burst) {
            st.burst.t += dt;
            const k = Math.min(1, st.burst.t / 0.8);
            ring.position.set(pos.x, ground(pos.x, pos.z) + 0.08, pos.z);
            ring.scale.setScalar(st.burst.t < 0.8 ? 1 + k * (BURST_R / 0.45 - 1) * 0.15 : BURST_R / 0.45);
            ring.material.opacity = st.burst.t < 0.8 ? 0.4 + 0.4 * Math.sin(st.burst.t * 25) : Math.max(0, 1 - (st.burst.t - 0.8) * 4);
            if (st.burst.t >= 0.8 && !st.burst.hit) {
                st.burst.hit = true;
                if (toP < BURST_R && ctx.hurtPlayer(Math.round(dmg() * 0.75), pos)) ctx.player.knock.set(P.x - pos.x, 0, P.z - pos.z).normalize().multiplyScalar(7);
            }
            if (st.burst.t > 1.1) { st.burst = null; st.burstCd = 4.2 * (st.enraged ? 0.6 : 1) * (st.phase >= 3 ? 0.65 : 1); ring.material.opacity = 0; }
        } else speed = strikeUpdate(st, P, dt, ctx, true);
        moveToward(st, P, speed, dt);
        pose(real, st, st.t, !!st.burst || (st.swing && st.swing.t < 0.6));
        if (s.flash > 0) real.parts.eyes.material.color.setRGB(3, 3, 3);

        for (const il of st.illusions) {
            if (il.gone) continue;
            il.t += dt;
            const sp = strikeUpdate(il, P, dt, ctx, false);
            moveToward(il, P, sp, dt);
            pose(il.b, il, il.t, il.swing && il.swing.t < 0.6);
        }
        core.updatePlate(ctx.camera, 3.4, st.illusions.some(i => !i.gone));   // no name over the real one while illusions stand
    }

    function begin_flee(ctx) {
        if (st.mode === 'fleeing') return;
        clearIllusions();
        st.rains.forEach(r => scene.remove(r.mesh)); st.rains = [];
        ring.material.opacity = 0;
        st.mode = 'fleeing'; st.t = 0; st.fled = true;
        ctx.message?.('Malphas: "This is not the end of doubt, Nightshade. Only of this winter." — he tears free and is gone into the storm. Malphas retreats: wounded, alive.');
        ctx.onRetreat?.();
    }
    function flee(dt) {
        const k = Math.min(1, st.t / 3);
        real.root.position.set(pos.x, pos.y + 0.3 + k * k * 18, pos.z);
        real.root.rotation.y += dt * (2 + k * 8);
        real.root.scale.setScalar(1 - k * 0.7);
        st.whiteout = Math.max(0, 1 - k);
    }

    return {
        pos, kind: 'void_general', root: real.root,
        get alive() { return !s.dead && st.mode === 'fight'; },
        get engaged() { return st.mode === 'fight' || st.mode === 'intro'; },
        get whiteout() { return st.whiteout; },
        get debug() { return { mode: st.mode, hp: s.hp, phase: st.phase, enraged: st.enraged, illusions: st.illusions.filter(i => !i.gone).length }; },
        update,
        hit: (...a) => (st.mode === 'fight' ? core.hit(...a) : 'handled'),
        reset: () => { if (st.mode !== 'fleeing' && !st.fled) reset(); },
    };
}
