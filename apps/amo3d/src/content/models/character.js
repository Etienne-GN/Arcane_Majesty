// A character built in code: a joint hierarchy of simple meshes, animated in code — idle, walk,
// sprint, hop, cast, strike. The body is a bare skin rig; clothing and gear are independent parts
// (content/models/parts) mounted on its sockets. Both hands accept any handheld item.
import * as THREE from 'three';
import { bakeRig } from '../../engine/batch.js';
import { buildWeapon } from './weapons.js';
import { buildHair, buildFacialHair } from './parts/hair.js';
import { DEFAULT_LOOK, normalizeLook, BODY_PRESETS, handSpec } from './look.js';
import { PART_CATALOG, partDef, COVERING_HEADGEAR } from './parts/index.js';

const mat = (color, opts = {}) =>
    new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.85, ...opts });

// A joint whose mesh hangs down -y from the pivot.
function limb(len, rTop, rBot, material, seg = 7) {
    const joint = new THREE.Group();
    const geo = new THREE.CylinderGeometry(rTop, rBot, len, seg);
    geo.translate(0, -len / 2, 0);
    joint.add(new THREE.Mesh(geo, material));
    return joint;
}

const mesh = (geo, material, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(geo, material);
    m.position.set(x, y, z);
    return m;
};

// A curved coat panel: part of an open cylinder, pivoting at its top edge.
function coatPanel(thetaStart, thetaLength, len, material) {
    const joint = new THREE.Group();
    const geo = new THREE.CylinderGeometry(0.205, 0.31, len, 8, 5, true, thetaStart, thetaLength);
    geo.translate(0, -len / 2, 0);
    const m = new THREE.Mesh(geo, material);
    joint.add(m);
    return { joint, geo, base: geo.attributes.position.array.slice() };
}

const darker = (hex, k) => new THREE.Color(hex).multiplyScalar(k);

function ripple(panel, k, time, amp) {
    const pos = panel.geo.attributes.position.array, b = panel.base;
    for (let i = 0; i < pos.length; i += 3) {
        const depth = -b[i + 1] / 0.8;
        const w = Math.sin(time * (4 + 5 * amp) + b[i] * 9 + depth * 4) * 0.035 * depth * k;
        pos[i] = b[i] * (1 + w); pos[i + 2] = b[i + 2] * (1 + w);
    }
    panel.geo.attributes.position.needsUpdate = true;
    panel.geo.computeVertexNormals();
}

export function createCharacter(lookIn = DEFAULT_LOOK) {
    const L = normalizeLook(lookIn);
    const bodyDef = L.body;
    const P = BODY_PRESETS[bodyDef.preset] ?? BODY_PRESETS.adult_male;
    const eye = new THREE.Color(L.face.eyes);
    const M = {
        skin: mat(bodyDef.skin),
        hair: mat(L.hair.color),
        stubble: mat(L.facialHair.color),
        eye: new THREE.MeshStandardMaterial({ color: eye, emissive: eye.clone().multiplyScalar(0.7), emissiveIntensity: 0.6 }),
        brow: mat(darker(L.hair.color, 0.75)),
        gold: mat('#d4a84a', { metalness: 0.7, roughness: 0.35 }),
        steel: mat('#9aa0a8', { metalness: 0.75, roughness: 0.35 }),
        wood: mat(0x6b4a2b),
        crystal: new THREE.MeshStandardMaterial({
            color: 0x7ff5e6, emissive: 0x3ce0d0, emissiveIntensity: 2.2, flatShading: true, roughness: 0.2,
        }),
    };

    // Local forward is +z; the character's left is +x.
    const root = new THREE.Group();
    const body = new THREE.Group();
    root.add(body);

    const hips = new THREE.Group();
    hips.position.y = 0.95;
    body.add(hips);
    const legEntry = L.parts.legs;
    let hipMat = M.skin;
    if (legEntry?.id && legEntry.id !== 'none') {
        const legDef = partDef('legs', legEntry.id);
        if (legDef) {
            const legColors = { ...(legDef.colors ?? {}), ...(legEntry.colors ?? {}) };
            if (legColors.primary) {
                hipMat = mat(legColors.primary, { roughness: 0.9 });
            }
        }
    }
    const hipMesh = mesh(new THREE.CylinderGeometry(0.17, 0.16, 0.18, 8), hipMat);
    hips.add(hipMesh);

    // Bare legs. Feet are added by the feet slot.
    const legs = {};
    for (const [side, x] of [['L', 0.1], ['R', -0.1]]) {
        const thigh = limb(0.45, 0.085, 0.07, M.skin);
        thigh.position.set(x, -0.02, 0);
        const shin = limb(0.45, 0.07, 0.055, M.skin);
        shin.position.y = -0.45;
        thigh.add(shin);
        hips.add(thigh);
        legs[side] = { thigh, shin };
    }

    // ---- torso ----
    const spine = new THREE.Group();
    spine.position.y = 0.06;
    hips.add(spine);
    const chestGeo = new THREE.CylinderGeometry(0.21, 0.175, 0.56, 10);
    chestGeo.translate(0, 0.28, 0);
    chestGeo.scale(1, 1, 0.74);
    spine.add(new THREE.Mesh(chestGeo, M.skin));

    // ---- head ----
    const head = new THREE.Group();
    head.position.y = 0.6;
    spine.add(head);
    head.add(mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.08, 7), M.skin, 0, 0.02, 0));      // neck
    const skull = mesh(new THREE.SphereGeometry(0.12, 12, 10), M.skin, 0, 0.13, 0);
    skull.scale.set(0.92, 1.08, 1);
    head.add(skull);
    buildFacialHair(L.facialHair.style, head, M.stubble);
    head.add(mesh(new THREE.BoxGeometry(0.022, 0.05, 0.03), M.skin, 0, 0.12, 0.118));            // nose
    for (const s of [1, -1]) {
        head.add(mesh(new THREE.SphereGeometry(0.016, 6, 5), M.eye, s * 0.042, 0.15, 0.103));
        const brow = mesh(new THREE.BoxGeometry(0.045, 0.011, 0.012), M.brow, s * 0.043, 0.178, 0.108);
        brow.rotation.z = s * -0.18;
        head.add(brow);
        head.add(mesh(new THREE.SphereGeometry(0.025, 5, 4), M.skin, s * 0.112, 0.13, -0.005));   // ears
    }
    const covered = COVERING_HEADGEAR.has(L.parts.headgear?.id);
    buildHair(covered ? 'short' : L.hair.style, head, M.hair);

    // ---- arms: bare skin; sleeves/bracers are parts ----
    const arms = {};
    for (const [side, x] of [['L', 0.25], ['R', -0.25]]) {
        const upper = limb(0.31, 0.068, 0.058, M.skin);
        upper.position.set(x, 0.5, 0);
        const fore = limb(0.29, 0.058, 0.05, M.skin);
        fore.position.y = -0.31;
        upper.add(fore);
        upper.add(mesh(new THREE.SphereGeometry(0.08, 8, 6), M.skin, 0, 0, 0));
        fore.add(mesh(new THREE.SphereGeometry(0.048, 7, 5), M.skin, 0, -0.32, 0));
        spine.add(upper);
        arms[side] = { upper, fore };
    }

    // Body presets: proportions, not just a uniform scale.
    const H = bodyDef.height * P.height, W = bodyDef.width * P.width;
    for (const side of ['L', 'R']) {
        arms[side].upper.position.x = (side === 'L' ? 1 : -1) * 0.25 * P.shoulders;
        arms[side].upper.scale.y = P.limb;
        legs[side].thigh.position.x = (side === 'L' ? 1 : -1) * 0.1 * P.hips;
        legs[side].thigh.scale.y = P.limb;
    }
    hipMesh.scale.x = P.hips;
    head.scale.setScalar(P.head);
    body.scale.set(W, H, W);

    // ---- parts ----
    const hooks = [];
    const ctx = {
        look: L, preset: P, mats: M, mat, mesh, darker, root, body, hips, spine, head, arms, legs,
        torsoPrimary: L.parts.torso?.colors?.primary ?? '#a3141f',
        add: (parent, geo, material, x = 0, y = 0, z = 0) => { const m = mesh(geo, material, x, y, z); parent.add(m); return m; },
        makePanel: coatPanel,
        ripple,
        onUpdate: fn => hooks.push(fn),
    };
    for (const slot of Object.keys(PART_CATALOG)) {
        const entry = L.parts[slot];
        if (!entry?.id || entry.id === 'none') continue;
        const def = partDef(slot, entry.id);
        if (!def) continue;   // unknown slot content from an old look: skip it
        const colors = { ...(def.colors ?? {}), ...(entry.colors ?? {}) };
        const res = def.build({ ...ctx, colors, slot, entry });
        if (res?.update) hooks.push(res.update);
    }

    // ---- weapon mounts: each hand has a grip and a forearm mount ----
    const mainMount = new THREE.Group();
    const offMount = new THREE.Group();
    arms.R.fore.add(mainMount);
    arms.L.fore.add(offMount);
    let crystal = null, tip = null, offTip = null, mainType = 'fists', offType = null;

    root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    bakeRig(root);

    // main / off: { type, accent } (amo weapon type + the item's colour), false for an empty main
    // hand, or null for an empty off hand. Shields can go in either hand.
    const SHEATHE_AFTER = 5;
    const EDGED = new Set(['sword', 'greatsword', 'claymore', 'dagger', 'axe']);   // turned in the hand so they cut edge-first
    // An axe has one edge (its blade is modelled on +x): turn it so that edge faces ahead, away from the wielder.
    const edgeTurn = type => (type === 'axe' ? -Math.PI / 2 : Math.PI / 2);
    const sheath = { R: null, L: null };
    function buildScabbard(h) {
        const holder = new THREE.Group();
        const sx = h === 'R' ? 1 : -1;   // a right-hand sword hangs on the left hip
        holder.position.set(0.2 * sx, 0.03, -0.03);
        holder.rotation.set(Math.PI + 0.55, 0, -0.18 * sx);   // pointing down and back
        const leather = new THREE.MeshStandardMaterial({ color: 0x3a2214, flatShading: true, roughness: 0.8 });
        const sc = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.82, 0.03), leather);
        sc.position.y = 0.52; holder.add(sc);
        const chape = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.08, 4), M.gold); chape.position.y = 0.97; chape.scale.z = 0.4; holder.add(chape);
        const throat = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.04, 0.04), M.gold); throat.position.y = 0.12; holder.add(throat);
        hips.add(holder);
        return holder;
    }
    function setSheathed(h, on) {
        const sh = sheath[h]; if (!sh || sh.on === on) return;
        sh.on = on;
        if (on) { sh.holder.add(sh.group); sh.group.position.set(0, 0.04, 0); sh.group.rotation.set(0, Math.PI / 2, 0); }
        else { (h === 'R' ? mainMount : offMount).add(sh.group); sh.group.position.set(0, 0, 0); sh.group.rotation.copy(sh.home); }
    }
    function setWeapons(main, off) {
        for (const h of ['R', 'L']) if (sheath[h]) { sheath[h].group.removeFromParent(); hips.remove(sheath[h].holder); sheath[h] = null; }
        mainMount.clear();
        offMount.clear();
        // Each hand: grip mount for weapons, forearm mount for shields.
        const mount = (grp, type, isMain) => {
            if (type === 'shield') {
                grp.position.set(0.06, -0.2, 0.05);
                grp.rotation.set(0, 0, 0);
            } else {
                grp.position.set(0, -0.31, 0);
                grp.rotation.set(isMain ? (type === 'bow' || type === 'crossbow' ? 0.1 : 0.75) : 0, 0, 0);
            }
        };
        if (!main) { crystal = null; tip = null; mainType = 'fists'; mount(mainMount, 'fists', true); }
        else {
            const type = main?.type ?? 'staff';
            const m = buildWeapon(type, { accent: main?.accent, crystalMat: type === 'staff' ? M.crystal : null });
            mainMount.add(m.group);
            crystal = m.crystal; tip = m.tip; mainType = type;
            mount(mainMount, type, true);
            if (EDGED.has(type)) m.group.rotation.y = edgeTurn(type);   // the edge leads the cut, not the flat
            if (type === 'sword') { sheath.R = { holder: buildScabbard('R'), group: m.group, home: m.group.rotation.clone(), on: false, last: -99 }; }
        }
        offType = off?.type ?? null; offTip = null;
        if (off) {
            const o = buildWeapon(off.type, { accent: off.accent, crystalMat: off.type === 'staff' ? M.crystal : null });
            offMount.add(o.group);
            mount(offMount, off.type, false);
            if (off.type !== 'shield') o.group.rotation.x = 0.75;
            offTip = o.tip ?? null;
            if (EDGED.has(off.type)) o.group.rotation.y = (o.group.rotation.y || 0) + edgeTurn(off.type);
            if (off.type === 'sword') { sheath.L = { holder: buildScabbard('L'), group: o.group, home: o.group.rotation.clone(), on: false, last: -99 }; }
        } else mount(offMount, 'fists', false);
        for (const g of [mainMount, offMount]) g.traverse(o => { if (o.isMesh) o.castShadow = true; });
        for (const h of ['R', 'L']) if (sheath[h]) setSheathed(h, true);   // a sword starts in its scabbard
    }
    setWeapons(handSpec(L.parts.right) ?? false, handSpec(L.parts.left));

    let phase = 0, amp = 0, run = 0, air = 0, t = 0;
    const GUARD_MOUNT = 2.75;   // a blade at rest: pointing ahead and a little down
    const calm = new THREE.Color(0x3ce0d0), blaze = new THREE.Color(0xff7a20);

    // speed in m/s, sprinting bool, hopK 0..1 progress (null when grounded), castK 0..1 (null when not casting)
    function update(dt, { speed, sprinting, hopK, castK = null, strikeK = null, thrust = false, incant = false, strikeHand = 'R', castHand = 'R' }) {
        t += dt;
        const ease = k => 1 - Math.exp(-dt * k);
        amp += (Math.min(1, speed / 4) - amp) * ease(10);
        run += ((sprinting && speed > 0 ? 1 : 0) - run) * ease(6);
        air += ((hopK != null ? 1 : 0) - air) * ease(18);
        phase += dt * speed * 2.3;

        const s = Math.sin(phase), c = Math.cos(phase);
        const stride = 0.55 + 0.25 * run;
        const g = 1 - air; // ground weight

        // Legs: positive x swings a hanging limb backward; the knee bends on the forward swing.
        legs.L.thigh.rotation.x = g * s * stride * amp + air * -1.0;
        legs.R.thigh.rotation.x = g * -s * stride * amp + air * -0.35;
        legs.L.shin.rotation.x = g * amp * (0.12 + (1.0 + 0.5 * run) * Math.max(0, -c)) + air * 1.5;
        legs.R.shin.rotation.x = g * amp * (0.12 + (1.0 + 0.5 * run) * Math.max(0, c)) + air * 0.8;

        // Arms counter-swing; the staff arm moves less.
        const breathe = Math.sin(t * 2.1) * (1 - amp);
        arms.L.upper.rotation.x = g * -s * (0.45 + 0.4 * run) * amp + air * -1.2 + breathe * 0.03;
        arms.R.upper.rotation.x = g * s * 0.28 * amp + air * -0.5 + breathe * 0.02;
        arms.L.upper.rotation.z = 0.12 + air * 0.5;
        arms.R.upper.rotation.z = -0.12 - air * 0.3;
        arms.L.fore.rotation.x = -(0.2 + 0.5 * amp + 0.5 * run);
        arms.R.fore.rotation.x = -0.75;

        body.position.y = g * (Math.abs(c) * 0.06 - 0.03) * amp - air * 0.06;
        spine.rotation.x = 0.06 * amp + 0.16 * run + air * 0.15 + breathe * 0.015 + P.stoop;
        spine.rotation.y = g * s * 0.08 * amp;
        head.rotation.x = -spine.rotation.x * 0.6;
        head.rotation.y = 0;

        for (const fn of hooks) fn({ t, dt, amp, run, air, legs, arms, spine, head });

        // A weapon carried in the left hand is held like the right one (forearm up), not swinging free.
        const offArmed = !!offType && offType !== 'shield' && offType !== 'fists';
        if (offArmed) arms.L.fore.rotation.x = -0.75;
        const mainShield = mainType === 'shield';
        mainMount.rotation.x = mainShield ? 0 : mainType === 'bow' || mainType === 'crossbow' ? 0.1 : 0.75;
        offMount.rotation.x = 0;
        // Which arm does the work: the casting / striking hand (A), the other (B); sz mirrors left and right.
        // Blades (swords, daggers, axes, maces) rest in a low guard: arm a little forward, blade angled ahead and down.
        const BLADE = new Set(['sword', 'greatsword', 'claymore', 'dagger', 'axe', 'mace']);   // polearms (spear, halberd) stand upright instead
        const setMount = (h, a) => { if (h === 'R') mainMount.rotation.x = a; else offMount.rotation.x = a - 0.75; };
        // (choke: carried short — the hand just under the head, the handle hanging below; a swing slides the grip back
        // to the end of the handle.)
        // How each kind is carried at rest (k = how much of the walking arm-swing stays; x / z the arm, fore the
        // elbow, mount the wrist): swords in a low guard; a dagger in a reverse grip, blade down from the fist; axes
        // and maces hanging at the side, head down by the knee; a bow upright beside the leg; a crossbow pointing down
        // and ahead. The slash starts from and returns to this.
        const REST = {
            sword: { k: 0.5, x: -0.3, z: -0.22, fore: -0.6, mount: GUARD_MOUNT }, greatsword: { k: 0.5, x: -0.3, z: -0.22, fore: -0.6, mount: GUARD_MOUNT },
            claymore: { k: 0.5, x: -0.3, z: -0.22, fore: -0.6, mount: GUARD_MOUNT },
            dagger: { k: 0.6, x: -0.12, z: -0.2, fore: -0.55, mount: 3.8 },
            axe: { k: 0.7, x: 0.0, z: -0.2, fore: -0.38, mount: 1.15, choke: 0.44 }, mace: { k: 0.7, x: 0.0, z: -0.2, fore: -0.38, mount: 1.15, choke: 0.42 },
            bow: { k: 0.6, x: -0.08, z: -0.3, fore: -0.42, mount: 1.0 }, crossbow: { k: 0.5, x: -0.1, z: -0.15, fore: -0.45, mount: 2.45 },
        };
        const restOf = type => REST[type] ?? REST.sword;
        const guard = (h, type) => {
            const A = arms[h], sz = h === 'R' ? 1 : -1, r = restOf(type);
            A.upper.rotation.x = A.upper.rotation.x * r.k + r.x;
            A.upper.rotation.z = sz * r.z;
            A.fore.rotation.x = r.fore;
            setMount(h, r.mount);
        };
        // Swords: a swing draws (at once); five seconds without one, back in the scabbard.
        for (const h of ['R', 'L']) {
            const sh = sheath[h]; if (!sh) continue;
            if (strikeK != null && strikeHand === h) { sh.last = t; setSheathed(h, false); }
            else if (!sh.on && t - sh.last > SHEATHE_AFTER) setSheathed(h, true);
        }
        for (const [h, type, m] of [['R', mainType, mainMount], ['L', offType, offMount]]) {   // choked grip: slide along the handle
            const ch = REST[type]?.choke, g = ch && m.children.find(c => c.isGroup || c.isMesh);
            if (!g) continue;
            const k = strikeK != null && strikeHand === h ? Math.min(1, strikeK) : -1;
            const swing = k < 0 ? 0 : Math.min(1, k / 0.18) * Math.min(1, (1 - k) / 0.2);
            g.position.set(0, 1, 0).applyQuaternion(g.quaternion).multiplyScalar(-ch * (1 - swing));   // along the handle (the left hand's mount is tilted)
        }
        if ((BLADE.has(mainType) || REST[mainType]) && !sheath.R?.on) guard('R', mainType);
        if ((BLADE.has(offType) || REST[offType]) && !sheath.L?.on) guard('L', offType);
        const side = h => ({ A: arms[h], B: arms[h === 'R' ? 'L' : 'R'], sz: h === 'R' ? 1 : -1, mount: h === 'R' ? mainMount : offMount, fore0: h === 'R' || offArmed ? -0.75 : arms.L.fore.rotation.x });

        // Cast: the staff arm thrusts forward, the body leans in, the crystal flares orange.
        let blazeK = castK != null ? Math.sin(Math.min(1, castK) * Math.PI) : 0;
        if (castK != null && incant) {
            // The incantation: both hands lift the staff high, the head tips back to the sky, the staff sways as
            // the words go on; then it comes down and points, and the spell is loosed.
            const { A, B, sz, mount: m, fore0 } = side(castHand);
            const k = Math.min(1, castK), sm = (a, b) => { const x = Math.min(1, Math.max(0, (k - a) / (b - a))); return x * x * (3 - 2 * x); };
            const up = sm(0, 0.2) * (1 - sm(0.7, 0.8)), fwd = sm(0.7, 0.8) * (1 - sm(0.86, 1)), rest = 1 - up - fwd;
            const sway = Math.sin(t * 6) * 0.07 * up;
            A.upper.rotation.x = A.upper.rotation.x * rest - 2.75 * up - 1.55 * fwd;
            B.upper.rotation.x = B.upper.rotation.x * rest - 2.65 * up - 1.1 * fwd;
            A.upper.rotation.z = sz * (-0.12 + 0.32 * up) + sway;
            B.upper.rotation.z = sz * (0.12 - 0.32 * up) + sway;
            A.fore.rotation.x = fore0 * (1 - up) - 0.3 * up - 0.1 * fwd;
            B.fore.rotation.x = B.fore.rotation.x * (1 - up) - 0.35 * up;
            spine.rotation.x += -0.22 * up + 0.2 * fwd;
            head.rotation.x += -0.6 * up;
            m.rotation.x += 2.4 * up + 0.7 * fwd;   // the staff stands up to the sky, then points
            blazeK = Math.min(1, k * 1.4);
        } else if (castK != null) {
            const { A, B, sz, fore0 } = side(castHand);
            const w = Math.sin(Math.min(1, castK) * Math.PI);
            A.upper.rotation.x = A.upper.rotation.x * (1 - w) - 1.5 * w;
            A.upper.rotation.z = sz * (-0.12 - 0.15 * w);
            A.fore.rotation.x = fore0 * (1 - w) - 0.15 * w;
            B.upper.rotation.x = B.upper.rotation.x * (1 - w) - 0.6 * w;
            spine.rotation.x += 0.12 * w;
            spine.rotation.y += sz * -0.25 * w;
        }
        // Strike: with a weapon, a sweeping blow (or a stab for thrusting weapons) from that hand, the body
        // twisting into it; an empty left hand jabs.
        if (strikeK != null) {
            const { A, sz, mount: m, fore0 } = side(strikeHand);
            const k = Math.min(1, strikeK), w = Math.sin(k * Math.PI);
            const bladeType = strikeHand === 'R' ? mainType : offType;
            if (BLADE.has(bladeType) && !thrust) {
                // A slash in three beats: wind the blade back over the shoulder, cut down and across the body as the
                // torso turns into it, then come back to guard. sm = smoothstep between two moments.
                const sm = (a, b) => { const x = Math.min(1, Math.max(0, (k - a) / (b - a))); return x * x * (3 - 2 * x); };
                const wind = sm(0, 0.28), cut = sm(0.3, 0.55), back = sm(0.62, 1);
                const lerp = (a, b, c, d) => a + (b - a) * wind + (c - b) * cut + (d - c) * back;   // guard → wound → cut → guard
                const ux0 = A.upper.rotation.x;
                A.upper.rotation.x = lerp(ux0, -2.5, -1.0, ux0);
                const r0 = restOf(bladeType);
                A.upper.rotation.z = sz * lerp(r0.z, -1.1, 0.85, r0.z);   // out to the side, then right across the body
                A.fore.rotation.x = lerp(r0.fore, -1.3, -0.15, r0.fore);
                setMount(strikeHand, lerp(r0.mount, 3.3, 2.8, r0.mount));   // the blade rides the arm: up and back over the shoulder, then across (never dipping down)
                spine.rotation.y += sz * lerp(0, 0.6, -0.7, 0);
                spine.rotation.x += lerp(0, -0.08, 0.2, 0);
                head.rotation.y = -spine.rotation.y * 0.5;
            } else if (strikeHand === 'L' && !offArmed) {
                A.upper.rotation.x = A.upper.rotation.x * (1 - w) - 1.5 * w;
                A.upper.rotation.z = 0.12 - 0.1 * w;
                A.fore.rotation.x = A.fore.rotation.x * (1 - w) - 0.05 * w;
                spine.rotation.y += 0.3 * w;
                spine.rotation.x += 0.12 * w;
            } else if (thrust) {
                A.upper.rotation.x = A.upper.rotation.x * (1 - w) - 1.45 * w;
                A.upper.rotation.z = sz * -0.12;
                A.fore.rotation.x = fore0 * (1 - w) - 0.05 * w;
                m.rotation.x += 0.8 * w;
                spine.rotation.x += 0.18 * w;
            } else {
                A.upper.rotation.x = A.upper.rotation.x * (1 - w) - 1.3 * w;
                A.upper.rotation.z = sz * (-0.12 - 0.9 * w + 1.5 * w * k);
                A.fore.rotation.x = fore0 * (1 - w) - 0.3 * w;
                spine.rotation.y += sz * (0.5 - 1.1 * k) * w;
                spine.rotation.x += 0.1 * w;
            }
        }
        M.crystal.emissive.copy(calm).lerp(blaze, blazeK);
        M.crystal.emissiveIntensity = 1.8 + Math.sin(t * 3) * 0.6;

        if (crystal) crystal.rotation.y += dt * 1.5;
    }

    return {
        root, update, setWeapons, setSheathed,
        get mainType() { return mainType; },
        bladeWorld: (hand, base, tipV) => { const m = hand === 'L' ? offMount : mainMount, tp = hand === 'L' ? offTip : tip; if (!tp) return false; m.getWorldPosition(base); tp.getWorldPosition(tipV); return true; },
        crystalWorld: (v, hand = 'R') => (hand === 'L' ? (offTip ?? arms.L.fore) : (tip ?? arms.R.fore)).getWorldPosition(v),
    };
}
