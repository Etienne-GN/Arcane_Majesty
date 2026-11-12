// Eldrin, built in code: a joint hierarchy of simple meshes, animated in code —
// idle, walk, sprint, hop, cast. Long red coat with a high collar and gold trim, dark
// vest with gold filigree, crossed leather straps, wide belt with a gold buckle, a
// satchel, gold-worked bracers, tousled dark hair, stubble, blue eyes — and his staff.
import * as THREE from 'three';

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

export function createCharacter() {
    const M = {
        skin: mat(0xe2b48f),
        stubble: mat(0xa07a62),
        hair: mat(0x3a2418),
        eye: new THREE.MeshStandardMaterial({ color: 0x5ab8f0, emissive: 0x2a8fd0, emissiveIntensity: 0.6 }),
        brow: mat(0x2a1a12),
        coat: mat(0xa3141f, { side: THREE.DoubleSide, roughness: 0.75 }),
        coatDark: mat(0x7a0f17, { side: THREE.DoubleSide }),
        gold: mat(0xd4a84a, { metalness: 0.7, roughness: 0.35 }),
        vest: mat(0x1c1714, { roughness: 0.6 }),
        shirt: mat(0x16120f),
        leather: mat(0x5a3520),
        leatherDark: mat(0x3e2416),
        pants: mat(0x221c18),
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
    hips.add(mesh(new THREE.CylinderGeometry(0.17, 0.16, 0.18, 8), M.pants));

    // Legs: dark trousers, tall brown boots.
    const legs = {};
    for (const [side, x] of [['L', 0.1], ['R', -0.1]]) {
        const thigh = limb(0.45, 0.085, 0.07, M.pants);
        thigh.position.set(x, -0.02, 0);
        const shin = limb(0.45, 0.07, 0.055, M.pants);
        shin.position.y = -0.45;
        thigh.add(shin);
        shin.add(mesh(new THREE.CylinderGeometry(0.08, 0.072, 0.3, 7), M.leather, 0, -0.27, 0));       // boot shaft
        shin.add(mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.04, 7), M.leatherDark, 0, -0.12, 0)); // boot cuff
        shin.add(mesh(new THREE.BoxGeometry(0.13, 0.1, 0.26), M.leatherDark, 0, -0.45, 0.04));
        hips.add(thigh);
        legs[side] = { thigh, shin };
    }

    // Coat skirt: two front flaps that follow the legs, and a back panel that flares.
    const flapL = coatPanel(Math.PI * 0.11, Math.PI * 0.5, 0.78, M.coat);
    const flapR = coatPanel(Math.PI * 1.39, Math.PI * 0.5, 0.78, M.coat);
    const back = coatPanel(Math.PI * 0.61, Math.PI * 0.78, 0.8, M.coat);
    for (const p of [flapL, flapR, back]) { p.joint.position.y = 0.04; hips.add(p.joint); }
    // Gold hem along the front edges of the flaps.
    for (const [p, th] of [[flapL, Math.PI * 0.11], [flapR, Math.PI * 1.89]]) {
        const edge = mesh(new THREE.BoxGeometry(0.025, 0.78, 0.025), M.gold);
        edge.position.set(Math.sin(th) * 0.26, -0.39, Math.cos(th) * 0.26);
        edge.rotation.x = -0.14 * Math.sign(Math.cos(th));
        p.joint.add(edge);
    }

    // ---- torso ----
    const spine = new THREE.Group();
    spine.position.y = 0.06;
    hips.add(spine);
    const chestGeo = new THREE.CylinderGeometry(0.215, 0.18, 0.56, 10);
    chestGeo.translate(0, 0.28, 0);
    chestGeo.scale(1, 1, 0.74);
    spine.add(new THREE.Mesh(chestGeo, M.coat));
    // Open front: dark vest with gold filigree, a dark shirt and a V of skin at the throat.
    const vest = mesh(new THREE.BoxGeometry(0.17, 0.46, 0.06), M.vest, 0, 0.27, 0.125);
    spine.add(vest);
    for (const [y, w] of [[0.16, 0.12], [0.26, 0.1], [0.36, 0.12], [0.44, 0.08]]) {
        spine.add(mesh(new THREE.BoxGeometry(w, 0.012, 0.01), M.gold, 0, y, 0.158));
    }
    spine.add(mesh(new THREE.BoxGeometry(0.012, 0.36, 0.01), M.gold, 0, 0.28, 0.158));
    const throat = mesh(new THREE.ConeGeometry(0.06, 0.13, 3), M.skin, 0, 0.5, 0.135);
    throat.rotation.x = Math.PI;
    spine.add(throat);
    // Lapels: red wedges along the V, edged in gold.
    for (const s of [1, -1]) {
        const lapel = mesh(new THREE.BoxGeometry(0.07, 0.36, 0.03), M.coat, s * 0.1, 0.33, 0.135);
        lapel.rotation.z = s * 0.28;
        spine.add(lapel);
        const trim = mesh(new THREE.BoxGeometry(0.012, 0.37, 0.012), M.gold, s * 0.073, 0.33, 0.152);
        trim.rotation.z = s * 0.28;
        spine.add(trim);
    }
    // High popped collar: two flared wedges behind the neck.
    for (const s of [1, -1]) {
        const collar = mesh(new THREE.BoxGeometry(0.15, 0.17, 0.03), M.coatDark, s * 0.09, 0.62, -0.02);
        collar.rotation.set(-0.25, s * 0.9, s * -0.25);
        spine.add(collar);
        const ce = mesh(new THREE.BoxGeometry(0.15, 0.012, 0.035), M.gold, s * 0.095, 0.705, -0.04);
        ce.rotation.set(-0.25, s * 0.9, s * -0.25);
        spine.add(ce);
    }
    const collarBack = mesh(new THREE.BoxGeometry(0.2, 0.18, 0.03), M.coatDark, 0, 0.63, -0.1);
    collarBack.rotation.x = -0.3;
    spine.add(collarBack);
    // Crossed leather straps with small gold buckles.
    for (const s of [1, -1]) {
        const strap = mesh(new THREE.BoxGeometry(0.035, 0.6, 0.02), M.leather, s * 0.02, 0.29, 0.16);
        strap.rotation.z = s * 0.55;
        spine.add(strap);
        spine.add(mesh(new THREE.BoxGeometry(0.035, 0.03, 0.025), M.gold, s * 0.07, 0.36, 0.172));
    }
    // Wide belt, big gold buckle, satchel with a gold clasp on the left hip.
    spine.add(mesh(new THREE.CylinderGeometry(0.192, 0.19, 0.08, 10), M.leather, 0, 0.02, 0));
    spine.add(mesh(new THREE.BoxGeometry(0.075, 0.075, 0.02), M.gold, 0, 0.02, 0.148));
    spine.add(mesh(new THREE.BoxGeometry(0.045, 0.045, 0.022), M.leather, 0, 0.02, 0.15));
    const satchel = new THREE.Group();
    satchel.position.set(0.13, -0.07, 0.13);
    satchel.rotation.y = 0.5;
    satchel.add(mesh(new THREE.BoxGeometry(0.17, 0.15, 0.07), M.leather));
    satchel.add(mesh(new THREE.BoxGeometry(0.175, 0.08, 0.075), M.leatherDark, 0, 0.04, 0.005));
    satchel.add(mesh(new THREE.BoxGeometry(0.03, 0.05, 0.02), M.gold, 0, 0.01, 0.045));
    spine.add(satchel);
    // Left shoulder: leather and gold ornament.
    const pauldron = mesh(new THREE.SphereGeometry(0.1, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), M.leatherDark, 0.24, 0.53, 0);
    pauldron.scale.set(1, 0.7, 1.1);
    spine.add(pauldron);
    spine.add(mesh(new THREE.TorusGeometry(0.06, 0.012, 4, 10), M.gold, 0.25, 0.55, 0.05));

    // ---- head ----
    const head = new THREE.Group();
    head.position.y = 0.6;
    spine.add(head);
    head.add(mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.08, 7), M.skin, 0, 0.02, 0));      // neck
    const skull = mesh(new THREE.SphereGeometry(0.12, 12, 10), M.skin, 0, 0.13, 0);
    skull.scale.set(0.92, 1.08, 1);
    head.add(skull);
    // Stubble: a darker shell over the jaw.
    const jaw = mesh(new THREE.SphereGeometry(0.123, 12, 8, Math.PI * 0.2, Math.PI * 0.6, Math.PI * 0.6, Math.PI * 0.25), M.stubble, 0, 0.13, 0.003);
    jaw.scale.set(0.93, 1.08, 1.01);
    head.add(jaw);
    head.add(mesh(new THREE.BoxGeometry(0.022, 0.05, 0.03), M.skin, 0, 0.12, 0.118));            // nose
    for (const s of [1, -1]) {
        head.add(mesh(new THREE.SphereGeometry(0.016, 6, 5), M.eye, s * 0.042, 0.15, 0.103));
        const brow = mesh(new THREE.BoxGeometry(0.045, 0.011, 0.012), M.brow, s * 0.043, 0.178, 0.108);
        brow.rotation.z = s * -0.18;
        head.add(brow);
        head.add(mesh(new THREE.SphereGeometry(0.025, 5, 4), M.skin, s * 0.112, 0.13, -0.005));   // ears
    }
    // Tousled dark hair: a cap open at the face, a swept fringe, and soft clumps falling over the ears.
    const cap = mesh(new THREE.SphereGeometry(0.13, 12, 8, Math.PI * 0.78, Math.PI * 1.44, 0, Math.PI * 0.62), M.hair, 0, 0.14, -0.008);
    cap.scale.set(0.97, 1.08, 1.04);
    head.add(cap);
    const crown = mesh(new THREE.SphereGeometry(0.128, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.3), M.hair, 0, 0.15, 0);
    crown.scale.set(1.0, 1.15, 1.05);
    head.add(crown);
    const clumps = [
        // x, y, z, sx, sy, sz, rx, rz — flattened blobs read as locks of hair
        [0.03, 0.245, 0.085, 0.065, 0.03, 0.05, 0.5, -0.5],     // fringe swept to his left
        [-0.04, 0.238, 0.09, 0.055, 0.028, 0.045, 0.7, 0.4],
        [0.075, 0.215, 0.085, 0.04, 0.025, 0.04, 1.0, -0.9],   // a lock over the brow
        [0.0, 0.272, 0.02, 0.075, 0.035, 0.07, 0.2, 0.2],
        [-0.05, 0.265, -0.04, 0.06, 0.035, 0.06, -0.4, 0.5],
        [0.06, 0.26, -0.05, 0.06, 0.035, 0.06, -0.4, -0.5],
        [0.112, 0.16, 0.0, 0.03, 0.06, 0.05, 0.0, -0.2],        // over the ears
        [-0.112, 0.16, 0.0, 0.03, 0.06, 0.05, 0.0, 0.2],
        [0.0, 0.16, -0.12, 0.08, 0.06, 0.03, -0.2, 0.0],        // nape
    ];
    for (const [x, y, z, sx, sy, sz, rx, rz] of clumps) {
        const c = mesh(new THREE.IcosahedronGeometry(1, 0), M.hair, x, y, z);
        c.scale.set(sx, sy, sz);
        c.rotation.set(rx, 0, rz);
        head.add(c);
    }

    // ---- arms: red sleeves, gold-worked leather bracers ----
    const arms = {};
    for (const [side, x] of [['L', 0.25], ['R', -0.25]]) {
        const upper = limb(0.31, 0.068, 0.058, M.coat);
        upper.position.set(x, 0.5, 0);
        const fore = limb(0.29, 0.058, 0.05, M.coat);
        fore.position.y = -0.31;
        upper.add(fore);
        fore.add(mesh(new THREE.CylinderGeometry(0.064, 0.058, 0.17, 8), M.leather, 0, -0.18, 0));
        for (const y of [-0.1, -0.18, -0.26]) fore.add(mesh(new THREE.CylinderGeometry(0.066, 0.066, 0.014, 8), M.gold, 0, y, 0));
        fore.add(mesh(new THREE.SphereGeometry(0.048, 7, 5), M.skin, 0, -0.32, 0));
        upper.add(mesh(new THREE.SphereGeometry(0.083, 8, 6), M.coat));
        spine.add(upper);
        arms[side] = { upper, fore };
    }

    // ---- the staff, right hand, crystal on top ----
    const staff = new THREE.Group();
    staff.position.y = -0.31;
    staff.rotation.x = 0.75;
    arms.R.fore.add(staff);
    staff.add(mesh(new THREE.CylinderGeometry(0.022, 0.03, 1.75, 6), M.wood, 0, 0.2, 0));
    staff.add(mesh(new THREE.TorusGeometry(0.06, 0.012, 4, 8), M.gold, 0, 1.06, 0));
    const crystal = mesh(new THREE.OctahedronGeometry(0.075), M.crystal, 0, 1.18, 0);
    crystal.scale.y = 1.6;
    staff.add(crystal);

    root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

    let phase = 0, amp = 0, run = 0, air = 0, t = 0;
    const calm = new THREE.Color(0x3ce0d0), blaze = new THREE.Color(0xff7a20);

    function ripple(panel, k) {
        const pos = panel.geo.attributes.position.array, b = panel.base;
        for (let i = 0; i < pos.length; i += 3) {
            const depth = -b[i + 1] / 0.8;
            const w = Math.sin(t * (4 + 5 * amp) + b[i] * 9 + depth * 4) * 0.035 * depth * k;
            pos[i] = b[i] * (1 + w); pos[i + 2] = b[i + 2] * (1 + w);
        }
        panel.geo.attributes.position.needsUpdate = true;
        panel.geo.computeVertexNormals();
    }

    // speed in m/s, sprinting bool, hopK 0..1 progress (null when grounded), castK 0..1 (null when not casting)
    function update(dt, { speed, sprinting, hopK, castK = null }) {
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
        spine.rotation.x = 0.06 * amp + 0.16 * run + air * 0.15 + breathe * 0.015;
        spine.rotation.y = g * s * 0.08 * amp;
        head.rotation.x = -spine.rotation.x * 0.6;

        // Cast: the staff arm thrusts forward, the body leans in, the crystal flares orange.
        if (castK != null) {
            const w = Math.sin(Math.min(1, castK) * Math.PI);
            arms.R.upper.rotation.x = arms.R.upper.rotation.x * (1 - w) - 1.5 * w;
            arms.R.upper.rotation.z = -0.12 - 0.15 * w;
            arms.R.fore.rotation.x = -0.75 * (1 - w) - 0.15 * w;
            arms.L.upper.rotation.x = arms.L.upper.rotation.x * (1 - w) - 0.6 * w;
            spine.rotation.x += 0.12 * w;
            spine.rotation.y += -0.25 * w;
        }
        M.crystal.emissive.copy(calm).lerp(blaze, castK != null ? Math.sin(Math.min(1, castK) * Math.PI) : 0);

        // Coat: front flaps follow the thighs, the back panel flares with speed.
        flapL.joint.rotation.x = Math.min(0.2, legs.L.thigh.rotation.x * 0.8) - air * 0.3;
        flapR.joint.rotation.x = Math.min(0.2, legs.R.thigh.rotation.x * 0.8) - air * 0.3;
        back.joint.rotation.x = 0.04 + amp * 0.22 + run * 0.35 + air * 0.35 + Math.sin(t * 3.1) * 0.02;
        ripple(back, 0.4 + amp);

        crystal.rotation.y += dt * 1.5;
        M.crystal.emissiveIntensity = 1.8 + Math.sin(t * 3) * 0.6;
    }

    return { root, update, crystalWorld: v => crystal.getWorldPosition(v) };
}
