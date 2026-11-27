// A human skeleton for the mobs that stand like men (2026-11-27, TODO §5 — the mobs on v2): the classic rig's joints
// (as the shadow soldier's), so a v2 body (models/v2/base.js, shaped in the Sculptor's Male / Female layers) can be
// built over it, and armour, weapons and eyes hung on its joints.
// humanRig({ scale }) → { root, body, hips, spine, head, arms: { L: { upper, fore }, R }, legs: { L: { thigh, shin }, R } }
// humanV2(opts) → that rig with a v2 body over it ({ ...rig, mesh }): opts as buildBase's (sex, skin, cloth, outfit, bald).
import * as THREE from 'three';
import { buildBase } from '../models/v2/base.js';

export function humanRig({ scale = 1 } = {}) {
    const root = new THREE.Group(), body = new THREE.Group(); root.add(body); body.scale.setScalar(scale);
    const hips = new THREE.Group(); hips.position.y = 0.97; body.add(hips);
    const legs = {};
    for (const [side, x] of [['L', 0.11], ['R', -0.11]]) {
        const thigh = new THREE.Group(); thigh.position.set(x, -0.03, 0); hips.add(thigh);
        const shin = new THREE.Group(); shin.position.y = -0.46; thigh.add(shin);
        legs[side] = { thigh, shin };
    }
    const spine = new THREE.Group(); spine.position.y = 0.07; hips.add(spine);
    const head = new THREE.Group(); head.position.y = 0.62; spine.add(head);
    const arms = {};
    for (const [side, x] of [['L', 0.27], ['R', -0.27]]) {
        const upper = new THREE.Group(); upper.position.set(x, 0.5, 0); spine.add(upper);
        const fore = new THREE.Group(); fore.position.y = -0.31; upper.add(fore);
        arms[side] = { upper, fore };
    }
    return { root, body, hips, spine, head, arms, legs };
}

export function humanV2({ scale = 1, sex = 'male', bald = true, tune = null, ...opts } = {}) {
    const rig = humanRig({ scale }); tune?.(rig);   // (tune: change the joints before the body is built — longer arms…)
    const out = buildBase({ ...rig, look: { hair: { style: bald ? 'bald' : 'short' } } }, { sex, bald, ...opts });
    if (out?.mesh) out.mesh.userData.keep = true;
    return { ...rig, mesh: out?.mesh ?? null };
}

// a walk for a rig's legs (and a little arm swing when the arms are free): k 0…1 how much it walks
export function walkLegs(rig, t, k) {
    const a = Math.sin(t * 7) * 0.5 * k;
    rig.legs.L.thigh.rotation.x = a; rig.legs.R.thigh.rotation.x = -a;
    rig.legs.L.shin.rotation.x = Math.max(0, -a) * 1.1; rig.legs.R.shin.rotation.x = Math.max(0, a) * 1.1;
}
