// Spell targeting: hold a hand's button with a spell on it and a ring appears on the ground — the spell's own size,
// in its element's colour, inside a faint circle of its range. Let go and the spell goes there: an area spell lands
// on the ring, a bolt flies at it. A quick tap still casts at once, as before (aimed by the camera, or the nearest
// enemy ahead).
//   touch      — drag the button (or anywhere, once held) toward where it should land: up is ahead
//   mouse      — point at the ground while the button is held
//   gamepad    — the right stick moves the ring while the trigger is held (the camera waits)
//   keys F / R — the mouse, if it is over the game; otherwise straight ahead
import * as THREE from 'three';
import { spells as SP } from '@rules';

const HOLD_MS = 200;
const COLOURS = { fire: 0xff8a30, water: 0x4ab0ff, ice: 0xa8e4ff, earth: 0xc8a070, nature: 0x7ad84a, wind: 0xd8f4e8, lightning: 0xf4e070, shadow: 0xb07aff, arcane: 0xd8b8ff };

export function createAiming({ camera, cam, input, getPlayer, getMap, PX = 32, tuning = { rangeMult: 1, radiusMult: 1 } }) {
    const group = new THREE.Group(); group.visible = false;
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.86, 1, 48), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
    const fill = new THREE.Mesh(new THREE.CircleGeometry(0.86, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
    const dot = new THREE.Mesh(new THREE.CircleGeometry(0.12, 16), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, depthWrite: false, toneMapped: false }));
    const reach = new THREE.Mesh(new THREE.RingGeometry(0.985, 1, 96), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
    for (const m of [ring, fill, dot, reach]) { m.rotation.x = -Math.PI / 2; m.renderOrder = 50; m.material.depthTest = false; }   // always on top of grass and slopes
    const marker = new THREE.Group(); marker.add(fill, ring, dot);
    group.add(marker, reach);
    let scene = null;
    const setScene = s => { if (scene) scene.remove(group); scene = s; s.add(group); };

    let st = null;   // { side, spell, level, how, t0, active, pos, start: {x, y}, ptr: {x, y} }
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();
    const groundY = (x, z, y) => { const m = getMap(); return m?.groundAt ? m.groundAt(x, z, y + 3) : (m?.heightAt?.(x, z) ?? y); };
    const rangeOf = () => ((st.spell.range?.[st.level - 1] ?? 200) / PX) * tuning.rangeMult;
    const radiusOf = () => (st.spell.targetingType === 'targeted_aoe' ? Math.max(0.6, ((st.spell.radius?.[st.level - 1] ?? 40) / PX) * tuning.radiusMult) : 0.45);
    function clampToRange(v) {
        const p = getPlayer().pos, dx = v.x - p.x, dz = v.z - p.z, d = Math.hypot(dx, dz), r = rangeOf();
        if (d > r) { v.x = p.x + dx / d * r; v.z = p.z + dz / d * r; }
        v.y = groundY(v.x, v.z, p.y);
        return v;
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
        for (const m of [ring, fill, dot, reach]) m.material.color.setHex(col);
        marker.scale.setScalar(radiusOf());
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
            plane.constant = -p.y;
            if (ray.ray.intersectPlane(plane, hit)) st.pos.set(hit.x, p.y, hit.z);
        }
        clampToRange(st.pos);
        marker.position.set(st.pos.x, st.pos.y + 0.06, st.pos.z);
        reach.position.set(p.x, groundY(p.x, p.z, p.y) + 0.05, p.z); reach.scale.setScalar(r);
        const pulse = 1 + Math.sin(performance.now() / 160) * 0.04;
        ring.scale.setScalar(pulse);
    }
    return { setScene, down, move, up, update, cancel, get aiming() { return !!st?.active; }, get pending() { return !!st; }, get side() { return st?.side ?? null; } };
}
