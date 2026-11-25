// Spell targeting: hold a hand's button with a spell on it and a ring appears on the ground — the spell's own size,
// in its element's colour, inside a faint circle of its range. Let go and the spell goes there: an area spell lands
// on the ring, a bolt flies at it. A quick tap still casts at once, as before (aimed by the camera, or the nearest
// enemy ahead). A bolt shows its path as glowing dots along the ground; the mark snaps onto a creature close to where
// you aim (within the spell's size, at least 1.6 m), and burns brighter when it holds one.
//   touch      — drag the button (or anywhere, once held) toward where it should land: up is ahead
//   mouse      — point at the ground while the button is held
//   gamepad    — the right stick moves the ring while the trigger is held (the camera waits)
//   keys F / R — the mouse, if it is over the game; otherwise straight ahead
import * as THREE from 'three';
import { spells as SP } from '@rules';
import { aimTexture, reachTexture, createGroundDecal } from './aimDecal.js';

const HOLD_MS = 200;
const COLOURS = { fire: 0xff8a30, water: 0x4ab0ff, ice: 0xa8e4ff, earth: 0xc8a070, nature: 0x7ad84a, wind: 0xd8f4e8, lightning: 0xf4e070, shadow: 0xb07aff, arcane: 0xd8b8ff };

export function createAiming({ camera, cam, input, getPlayer, getMap, PX = 32, tuning = { rangeMult: 1, radiusMult: 1 } }) {
    const group = new THREE.Group(); group.visible = false;
    // the marker and the range: decals lying on the ground (aimDecal.js) — a rune in a soft glow, a faint dotted halo
    const mark = createGroundDecal(null, 18), reach = createGroundDecal(reachTexture(), 28, true);
    reach.mat.opacity = 0.35;
    group.add(mark.mesh, reach.mesh);
    // a bolt's flight: a dotted line along the ground from you to the mark (2026-11-25)
    // (glowing dots on the ground, one every ~0.7 m: a 1-pixel line was too faint to read)
    const LN = 40, lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    const line = new THREE.InstancedMesh(new THREE.CircleGeometry(0.11, 8).rotateX(-Math.PI / 2), lineMat, LN); line.frustumCulled = false; line.renderOrder = 3; group.add(line);
    const dotM = new THREE.Matrix4();
    // the mark snaps onto a creature close to where you aim (it eases there; a snapped mark burns brighter)
    const snapTo = new THREE.Vector3();
    function nearestFoe(v, within) {
        let best = null, bd = within;
        for (const h of getMap()?.hittables ?? []) {
            if (h.alive === false || !h.pos || h.friendly) continue;
            const d = Math.hypot(h.pos.x - v.x, h.pos.z - v.z); if (d < bd) { bd = d; best = h; }
        }
        return best;
    }
    let scene = null;
    const setScene = s => { if (scene) scene.remove(group); scene = s; s.add(group); };

    let st = null;   // { side, spell, level, how, t0, active, pos, start: {x, y}, ptr: {x, y} }
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();
    const groundY = (x, z, y) => { const m = getMap(); const g = m?.groundAt ? m.groundAt(x, z, y + 3) : (m?.heightAt?.(x, z) ?? y); const w = m?.waterAt ? m.waterAt(x, z) : (m?.mapInfo?.water ?? -Infinity); return Math.max(g, w); };   // (over water: on its surface)
    const rangeOf = () => ((st.spell.range?.[st.level - 1] ?? 200) / PX) * tuning.rangeMult;
    const radiusOf = () => (st.spell.targetingType === 'targeted_aoe' ? Math.max(0.9, ((st.spell.radius?.[st.level - 1] ?? 40) / PX) * tuning.radiusMult) : 0.8);   // (a bolt: a small rune where it will strike)
    function clampToRange(v) {
        const p = getPlayer().pos, dx = v.x - p.x, dz = v.z - p.z, d = Math.hypot(dx, dz), r = rangeOf();
        if (d > r) { v.x = p.x + dx / d * r; v.z = p.z + dz / d * r; }
        v.y = groundY(v.x, v.z, p.y);
        return v;
    }
    // where a ray from the camera meets the ground itself (marching, then halving the step) — not a flat plane at your feet
    function groundHit(r, out) {
        let t = 0.5, prev = null; const pt = new THREE.Vector3();
        for (let i = 0; i < 160 && t < 120; i++, t += 0.25 + t * 0.04) { r.at(t, pt); const g = groundY(pt.x, pt.z, pt.y); if (pt.y < g) { let a = prev ?? 0, b = t; for (let k = 0; k < 12; k++) { const m = (a + b) / 2; r.at(m, pt); if (pt.y < groundY(pt.x, pt.z, pt.y)) b = m; else a = m; } r.at(b, out); return true; } prev = t; }
        return false;
    }
    const camAxes = () => { const f = cam.forward(); return { f, r: new THREE.Vector3(-f.z, 0, f.x) }; };

    // A spell that can be aimed: bolts and area spells (not self spells).
    const aimable = spell => spell && spell.targetingType !== 'self' && !spell.passive;

    // The button went down. Returns true if this press is being held for aiming (the caller waits for up()).
    function down(side, spellId, level, how, x = 0, y = 0) {
        const spell = SP.SPELLS[spellId];
        if (!aimable(spell)) return false;
        st = { side, spell, level: Math.max(1, level), how, t0: performance.now(), active: false, pos: new THREE.Vector3(), start: { x, y }, ptr: { x, y } };
        return true;
    }
    function begin() {
        st.active = true;
        const p = getPlayer().pos, { f } = camAxes(), r = rangeOf();
        st.pos.set(p.x + f.x * r * 0.6, p.y, p.z + f.z * r * 0.6);
        clampToRange(st.pos);
        const col = COLOURS[st.spell.element] ?? 0xffffff;
        mark.mat.map = aimTexture(st.spell.element ?? 'arcane', col); mark.mat.needsUpdate = true;
        reach.mat.color.setHex(col);
        group.visible = true;
        input.fan.open = true; input.fan.x = input.fan.y = 0;   // the right stick steers the ring, not the camera
    }
    // The finger / mouse moved (screen pixels).
    function move(x, y) { if (st) { st.ptr.x = x; st.ptr.y = y; st.moved = true; } }
    // The button came up: null for a quick tap (cast as usual), else the point to cast at.
    function up(side) {
        if (!st || st.side !== side) return null;
        const s = st; st = null;
        group.visible = false; input.fan.open = false; input.fan.x = input.fan.y = 0;
        return s.active ? s.pos.clone() : null;
    }
    const cancel = () => { st = null; group.visible = false; input.fan.open = false; };
    function update(dt) {
        if (!st) return;
        if (!st.active) { if (performance.now() - st.t0 > HOLD_MS) begin(); else return; }
        const p = getPlayer().pos, r = rangeOf();
        if (st.how === 'touch') {   // a drag from where the finger went down: up = ahead, a long drag reaches full range
            const { f, r: right } = camAxes(), dx = st.ptr.x - st.start.x, dy = st.ptr.y - st.start.y, k = r / 120;
            const fwd = Math.max(0.6, r * 0.6 - dy * k), side = dx * k;
            st.pos.set(p.x + f.x * fwd + right.x * side, p.y, p.z + f.z * fwd + right.z * side);
        } else if (st.how === 'pad') {
            const { f, r: right } = camAxes(), sx = input.fan.x, sy = input.fan.y, sp = Math.max(6, r * 1.2) * dt;
            if (Math.hypot(sx, sy) > 0.15) { st.pos.x += (right.x * sx - f.x * sy) * sp; st.pos.z += (right.z * sx - f.z * sy) * sp; }
        } else if (st.how === 'mouse' || (st.how === 'key' && st.moved)) {   // where the pointer meets the ground
            ndc.set((st.ptr.x / innerWidth) * 2 - 1, -(st.ptr.y / innerHeight) * 2 + 1);
            ray.setFromCamera(ndc, camera);
            if (groundHit(ray.ray, hit)) st.pos.set(hit.x, hit.y, hit.z);
            else { plane.constant = -p.y; if (ray.ray.intersectPlane(plane, hit)) st.pos.set(hit.x, p.y, hit.z); }
        }
        clampToRange(st.pos);
        // snap: the ring onto a creature near the aim point (within its own size, at least 1.6 m), eased there
        const foe = nearestFoe(st.pos, Math.max(1.6, radiusOf() * 1.1));
        st.snapped = !!foe;
        if (foe && Math.hypot(foe.pos.x - p.x, foe.pos.z - p.z) <= r) { snapTo.set(foe.pos.x, foe.pos.y, foe.pos.z); st.pos.lerp(snapTo, Math.min(1, dt * 14)); clampToRange(st.pos); }
        const gy = (x, z) => groundY(x, z, p.y), pulse = 1 + Math.sin(performance.now() / 220) * 0.03;
        const bolt = st.spell.targetingType !== 'targeted_aoe';
        line.visible = bolt;
        if (bolt) {
            const L = Math.hypot(st.pos.x - p.x, st.pos.z - p.z), n = Math.min(LN, Math.max(2, Math.floor(L / 0.7))), drift = (performance.now() / 600) % 1;
            for (let i = 0; i < LN; i++) {
                if (i >= n) { dotM.makeScale(0, 0, 0); line.setMatrixAt(i, dotM); continue; }
                const t = Math.min(1, (i + drift) / n), x = p.x + (st.pos.x - p.x) * t, z = p.z + (st.pos.z - p.z) * t, k = 0.7 + 0.5 * Math.sin(t * Math.PI);
                dotM.makeScale(k, 1, k).setPosition(x, gy(x, z) + 0.06, z); line.setMatrixAt(i, dotM);
            }
            line.instanceMatrix.needsUpdate = true;
            lineMat.color.setHex(COLOURS[st.spell.element] ?? 0xffffff); lineMat.opacity = st.snapped ? 0.95 : 0.6;
        }
        mark.place(st.pos.x, st.pos.z, radiusOf() * pulse, gy);   // lies on the ground under it, whatever its slope
        mark.mesh.rotation.y = 0; mark.mat.opacity = st.snapped ? 1 : 0.85 + Math.sin(performance.now() / 300) * 0.15;
        reach.place(p.x, p.z, r, gy, 0.05);
    }
    return { setScene, down, move, up, update, cancel, get aiming() { return !!st?.active; }, get pending() { return !!st; }, get side() { return st?.side ?? null; } };
}
