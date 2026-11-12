// A procedural low-poly hero: a hierarchy of joints (groups) with simple meshes,
// animated in code — walk, sprint, hop and idle. Stands in for a rigged glTF model.
import * as THREE from 'three';

const mat = (color, opts = {}) =>
    new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.85, ...opts });

// A joint whose mesh hangs down -y from the pivot.
function limb(len, rTop, rBot, material) {
    const joint = new THREE.Group();
    const geo = new THREE.CylinderGeometry(rTop, rBot, len, 7);
    geo.translate(0, -len / 2, 0);
    joint.add(new THREE.Mesh(geo, material));
    return joint;
}

const mesh = (geo, material, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(geo, material);
    m.position.set(x, y, z);
    return m;
};

export function createCharacter() {
    const M = {
        skin: mat(0xd9a77f),
        tunic: mat(0x2f4f7a),
        trim: mat(0xc9a44c, { metalness: 0.5, roughness: 0.45 }),
        cloak: mat(0x5c2335, { side: THREE.DoubleSide }),
        pants: mat(0x3a332d),
        leather: mat(0x5b3a22),
        dark: mat(0x15100e),
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
    hips.add(mesh(new THREE.CylinderGeometry(0.17, 0.16, 0.18, 8), M.tunic));
    hips.add(mesh(new THREE.CylinderGeometry(0.19, 0.27, 0.36, 8), M.tunic, 0, -0.16, 0)); // robe skirt

    const legs = {};
    for (const [side, x] of [['L', 0.1], ['R', -0.1]]) {
        const thigh = limb(0.45, 0.085, 0.07, M.pants);
        thigh.position.set(x, -0.02, 0);
        const shin = limb(0.45, 0.07, 0.055, M.pants);
        shin.position.y = -0.45;
        thigh.add(shin);
        const boot = mesh(new THREE.BoxGeometry(0.13, 0.12, 0.25), M.leather, 0, -0.44, 0.04);
        shin.add(boot);
        shin.add(mesh(new THREE.CylinderGeometry(0.075, 0.07, 0.16, 7), M.leather, 0, -0.33, 0));
        hips.add(thigh);
        legs[side] = { thigh, shin };
    }

    const spine = new THREE.Group();
    spine.position.y = 0.06;
    hips.add(spine);
    const chestGeo = new THREE.CylinderGeometry(0.21, 0.17, 0.56, 8);
    chestGeo.translate(0, 0.28, 0);
    chestGeo.scale(1, 1, 0.72);
    spine.add(new THREE.Mesh(chestGeo, M.tunic));
    spine.add(mesh(new THREE.CylinderGeometry(0.185, 0.185, 0.07, 8), M.leather, 0, 0.04, 0)); // belt
    spine.add(mesh(new THREE.BoxGeometry(0.07, 0.06, 0.03), M.trim, 0, 0.04, 0.135));           // buckle
    spine.add(mesh(new THREE.BoxGeometry(0.11, 0.12, 0.06), M.leather, 0.15, -0.02, 0.07));     // pouch
    spine.add(mesh(new THREE.TorusGeometry(0.15, 0.025, 5, 10), M.trim, 0, 0.53, 0));           // collar
    spine.children.at(-1).rotation.x = Math.PI / 2;

    const head = new THREE.Group();
    head.position.y = 0.6;
    spine.add(head);
    head.add(mesh(new THREE.SphereGeometry(0.13, 10, 8), M.skin, 0, 0.12, 0));
    head.add(mesh(new THREE.BoxGeometry(0.03, 0.03, 0.02), M.dark, 0.045, 0.13, 0.12));
    head.add(mesh(new THREE.BoxGeometry(0.03, 0.03, 0.02), M.dark, -0.045, 0.13, 0.12));
    // Hood: a sphere shell with the front quarter cut away.
    const hood = mesh(
        new THREE.SphereGeometry(0.16, 12, 8, Math.PI * 0.78, Math.PI * 1.44, 0, Math.PI * 0.64),
        M.cloak, 0, 0.13, -0.01,
    );
    head.add(hood);
    const hoodTip = mesh(new THREE.ConeGeometry(0.07, 0.16, 6), M.cloak, 0, 0.2, -0.13);
    hoodTip.rotation.x = -1.1;
    head.add(hoodTip);

    const arms = {};
    for (const [side, x] of [['L', 0.25], ['R', -0.25]]) {
        const upper = limb(0.31, 0.065, 0.055, M.tunic);
        upper.position.set(x, 0.5, 0);
        const fore = limb(0.29, 0.055, 0.045, M.skin);
        fore.position.y = -0.31;
        upper.add(fore);
        fore.add(mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.1, 7), M.trim, 0, -0.05, 0)); // bracer
        fore.add(mesh(new THREE.SphereGeometry(0.05, 7, 5), M.skin, 0, -0.31, 0));
        upper.add(mesh(new THREE.SphereGeometry(0.085, 8, 6), M.tunic));                     // shoulder
        spine.add(upper);
        arms[side] = { upper, fore };
    }

    // Staff in the right hand, crystal on top.
    const staff = new THREE.Group();
    staff.position.y = -0.31;
    staff.rotation.x = 0.75;
    arms.R.fore.add(staff);
    staff.add(mesh(new THREE.CylinderGeometry(0.022, 0.03, 1.75, 6), M.wood, 0, 0.2, 0));
    staff.add(mesh(new THREE.TorusGeometry(0.06, 0.012, 4, 8), M.trim, 0, 1.06, 0));
    const crystal = mesh(new THREE.OctahedronGeometry(0.075), M.crystal, 0, 1.18, 0);
    crystal.scale.y = 1.6;
    staff.add(crystal);

    // Cloak hangs from the shoulders and flares back with speed.
    const cloak = new THREE.Group();
    cloak.position.set(0, 0.53, -0.15);
    spine.add(cloak);
    const cloakGeo = new THREE.PlaneGeometry(0.5, 1.0, 2, 6);
    cloakGeo.translate(0, -0.5, 0);
    const cloakMesh = new THREE.Mesh(cloakGeo, M.cloak);
    cloak.add(cloakMesh);
    const cloakBase = cloakGeo.attributes.position.array.slice();

    root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

    let phase = 0, amp = 0, run = 0, air = 0, t = 0;
    const calm = new THREE.Color(0x3ce0d0), blaze = new THREE.Color(0xff7a20);

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
        arms.L.upper.rotation.z = 0.1 + air * 0.5;
        arms.R.upper.rotation.z = -0.1 - air * 0.3;
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
            arms.R.upper.rotation.z = -0.1 - 0.15 * w;
            arms.R.fore.rotation.x = -0.75 * (1 - w) - 0.15 * w;
            arms.L.upper.rotation.x = arms.L.upper.rotation.x * (1 - w) - 0.6 * w;
            spine.rotation.x += 0.12 * w;
            spine.rotation.y += -0.25 * w;
        }
        M.crystal.emissive.copy(calm).lerp(blaze, castK != null ? Math.sin(Math.min(1, castK) * Math.PI) : 0);

        cloak.rotation.x = 0.12 + amp * 0.35 + run * 0.35 + air * 0.4 + Math.sin(t * 3.1) * 0.03;
        // Ripple the cloak's lower rows.
        const pos = cloakGeo.attributes.position.array;
        for (let i = 0; i < pos.length; i += 3) {
            const depth = -cloakBase[i + 1]; // 0 at shoulders → 1 at hem
            pos[i + 2] = cloakBase[i + 2]
                + Math.sin(t * (4 + 5 * amp) + cloakBase[i] * 6 + depth * 4) * 0.05 * depth * (0.4 + amp);
        }
        cloakGeo.attributes.position.needsUpdate = true;
        cloakGeo.computeVertexNormals();

        crystal.rotation.y += dt * 1.5;
        M.crystal.emissiveIntensity = 1.8 + Math.sin(t * 3) * 0.6;
    }

    return { root, update, crystalWorld: v => crystal.getWorldPosition(v) };
}
