// Eldrin, built in code: a joint hierarchy of simple meshes, animated in code —
// idle, walk, sprint, hop, cast. Long red coat with a high collar and gold trim, dark
// vest with gold filigree, crossed leather straps, wide belt with a gold buckle, a
// satchel, gold-worked bracers, tousled dark hair, stubble, blue eyes — and his staff.
import * as THREE from 'three';
import { bakeRig } from '../../engine/batch.js';
import { buildWeapon } from './weapons.js';
import { buildHair, buildFacialHair } from './parts/hair.js';

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

// A look definition (content/cast/*.json, the Forge): build, skin, eyes, hair, facial hair, outfit colours.
// Anything left out falls back to Eldrin's look.
export const DEFAULT_LOOK = {
    build: { height: 1, width: 1 },
    skin: '#e2b48f', eyes: '#5ab8f0',
    hair: { style: 'tousled', color: '#3a2418' },
    facialHair: { style: 'stubble', color: '#a07a62' },
    hood: false, cape: false,
    outfit: { style: 'longcoat', coat: '#a3141f', collar: '#7a0f17', trim: '#d4a84a', vest: '#1c1714', shirt: '#16120f',
        pants: '#221c18', leather: '#5a3520', leatherDark: '#3e2416' },
};
const merge = look => ({
    ...DEFAULT_LOOK, ...look,
    build: { ...DEFAULT_LOOK.build, ...look?.build },
    hair: { ...DEFAULT_LOOK.hair, ...look?.hair },
    facialHair: { ...DEFAULT_LOOK.facialHair, ...look?.facialHair },
    outfit: { ...DEFAULT_LOOK.outfit, ...look?.outfit },
});
const darker = (hex, k) => new THREE.Color(hex).multiplyScalar(k);

export function createCharacter(lookIn = DEFAULT_LOOK) {
    const L = merge(lookIn), O = L.outfit;
    const eye = new THREE.Color(L.eyes);
    const M = {
        skin: mat(L.skin),
        stubble: mat(L.facialHair.color),
        hair: mat(L.hair.color),
        eye: new THREE.MeshStandardMaterial({ color: eye, emissive: eye.clone().multiplyScalar(0.7), emissiveIntensity: 0.6 }),
        brow: mat(darker(L.hair.color, 0.75)),
        coat: mat(O.coat, { side: THREE.DoubleSide, roughness: 0.75 }),
        coatDark: mat(O.collar, { side: THREE.DoubleSide }),
        gold: mat(O.trim, { metalness: 0.7, roughness: 0.35 }),
        vest: mat(O.vest, { roughness: 0.6 }),
        shirt: mat(O.shirt),
        leather: mat(O.leather),
        leatherDark: mat(O.leatherDark),
        pants: mat(O.pants), pantsDark: mat(O.pantsDark ?? O.pants),
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
        const linen = O.style === 'linen';   // under-things: three-quarter linen trousers, bare feet
        const shin = limb(0.45, 0.07, 0.055, linen ? M.skin : M.pants);
        shin.position.y = -0.45;
        thigh.add(shin);
        if (linen) {
            shin.add(mesh(new THREE.CylinderGeometry(0.082, 0.078, 0.16, 7), M.pants, 0, -0.06, 0));   // the trouser leg ends below the knee
            shin.add(mesh(new THREE.CylinderGeometry(0.084, 0.084, 0.02, 7), M.pantsDark, 0, -0.14, 0));
            shin.add(mesh(new THREE.BoxGeometry(0.1, 0.06, 0.22), M.skin, 0, -0.46, 0.04));               // bare foot
        } else {
            shin.add(mesh(new THREE.CylinderGeometry(0.08, 0.072, 0.3, 7), M.leather, 0, -0.27, 0));       // boot shaft
            shin.add(mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.04, 7), M.leatherDark, 0, -0.12, 0)); // boot cuff
            shin.add(mesh(new THREE.BoxGeometry(0.13, 0.1, 0.26), M.leatherDark, 0, -0.45, 0.04));
        }
        hips.add(thigh);
        legs[side] = { thigh, shin };
    }

    // Outfit cut (parts library): how open the front is, how long the skirt, what shows on the chest.
    const CUTS = {
        longcoat: { open: 0.11, len: 0.78, lapels: true, vest: true, collar: true, straps: true, hem: true },
        robe:     { open: 0.0, len: 0.93, sash: true },
        tunic:    { open: 0.02, len: 0.44, straps: true },
        armour:   { open: 0.02, len: 0.4, plate: true },
        linen:    { open: 0.0, len: 0, bare: true },   // nothing worn over the linen shirt
    };
    const cut = CUTS[O.style] ?? CUTS.longcoat;
    M.steel = mat('#9aa0a8', { metalness: 0.75, roughness: 0.35 });
    // Coat skirt: two front flaps that follow the legs, and a back panel that flares.
    const fl = Math.PI * (0.5 + (0.11 - cut.open));   // closed cuts overlap at the front
    const skirtLen = cut.bare ? 0.12 : cut.len;   // the linen shirt just covers the hips
    const flapL = coatPanel(Math.PI * cut.open, fl, skirtLen, M.coat);
    const flapR = coatPanel(Math.PI * 2 - Math.PI * cut.open - fl, fl, skirtLen, M.coat);
    const back = coatPanel(Math.PI * 0.61, Math.PI * 0.78, skirtLen + 0.02, M.coat);
    for (const p of [flapL, flapR, back]) { p.joint.position.y = 0.04; hips.add(p.joint); }
    // Gold hem along the front edges of the flaps.
    for (const [p, th] of cut.hem ? [[flapL, Math.PI * 0.11], [flapR, Math.PI * 1.89]] : []) {
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
    if (cut.vest) {
        spine.add(mesh(new THREE.BoxGeometry(0.17, 0.46, 0.06), M.vest, 0, 0.27, 0.125));
        for (const [y, w] of [[0.16, 0.12], [0.26, 0.1], [0.36, 0.12], [0.44, 0.08]]) {
            spine.add(mesh(new THREE.BoxGeometry(w, 0.012, 0.01), M.gold, 0, y, 0.158));
        }
        spine.add(mesh(new THREE.BoxGeometry(0.012, 0.36, 0.01), M.gold, 0, 0.28, 0.158));
    }
    if (cut.plate) {   // breastplate with a trim ridge, steel pauldrons on both shoulders
        const plate = mesh(new THREE.CylinderGeometry(0.225, 0.19, 0.42, 10, 1, false, -Math.PI * 0.45, Math.PI * 0.9), M.steel, 0, 0.32, 0.005);
        plate.scale.set(1, 1, 0.8);
        spine.add(plate);
        spine.add(mesh(new THREE.BoxGeometry(0.03, 0.4, 0.02), M.gold, 0, 0.32, 0.175));
        for (const sg of [1, -1]) {
            const pd = mesh(new THREE.SphereGeometry(0.12, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), M.steel, sg * 0.25, 0.52, 0);
            pd.scale.set(1.05, 0.75, 1.1);
            pd.rotation.z = -sg * 0.3;
            spine.add(pd);
        }
    }
    const throat = mesh(new THREE.ConeGeometry(0.06, 0.13, 3), M.skin, 0, 0.5, 0.135);
    throat.rotation.x = Math.PI;
    spine.add(throat);
    // Lapels: red wedges along the V, edged in gold.
    for (const s of cut.lapels ? [1, -1] : []) {
        const lapel = mesh(new THREE.BoxGeometry(0.07, 0.36, 0.03), M.coat, s * 0.1, 0.33, 0.135);
        lapel.rotation.z = s * 0.28;
        spine.add(lapel);
        const trim = mesh(new THREE.BoxGeometry(0.012, 0.37, 0.012), M.gold, s * 0.073, 0.33, 0.152);
        trim.rotation.z = s * 0.28;
        spine.add(trim);
    }
    // High popped collar: two flared wedges behind the neck.
    for (const s of cut.collar ? [1, -1] : []) {
        const collar = mesh(new THREE.BoxGeometry(0.15, 0.17, 0.03), M.coatDark, s * 0.09, 0.62, -0.02);
        collar.rotation.set(-0.25, s * 0.9, s * -0.25);
        spine.add(collar);
        const ce = mesh(new THREE.BoxGeometry(0.15, 0.012, 0.035), M.gold, s * 0.095, 0.705, -0.04);
        ce.rotation.set(-0.25, s * 0.9, s * -0.25);
        spine.add(ce);
    }
    if (cut.collar) {
        const collarBack = mesh(new THREE.BoxGeometry(0.2, 0.18, 0.03), M.coatDark, 0, 0.63, -0.1);
        collarBack.rotation.x = -0.3;
        spine.add(collarBack);
    }
    // Crossed leather straps with small gold buckles.
    for (const s of cut.straps ? [1, -1] : []) {
        const strap = mesh(new THREE.BoxGeometry(0.035, 0.6, 0.02), M.leather, s * 0.02, 0.29, 0.16);
        strap.rotation.z = s * 0.55;
        spine.add(strap);
        spine.add(mesh(new THREE.BoxGeometry(0.035, 0.03, 0.025), M.gold, s * 0.07, 0.36, 0.172));
    }
    // Wide belt, big gold buckle, satchel with a gold clasp on the left hip (the linen shirt: a drawstring only).
    if (cut.bare) {
        spine.add(mesh(new THREE.CylinderGeometry(0.19, 0.188, 0.025, 10), M.pantsDark, 0, 0.0, 0));
        const laces = mesh(new THREE.BoxGeometry(0.008, 0.12, 0.008), M.pantsDark, 0, 0.47, 0.142);
        spine.add(laces);   // the shirt's open neck lacing
    }
    if (!cut.bare) spine.add(mesh(new THREE.CylinderGeometry(0.192, 0.19, cut.sash ? 0.11 : 0.08, 10), cut.sash ? M.coatDark : M.leather, 0, 0.02, 0));
    if (cut.sash) spine.add(mesh(new THREE.BoxGeometry(0.06, 0.3, 0.015), M.coatDark, 0.08, -0.12, 0.17));   // sash tail
    if (!cut.bare) {
        spine.add(mesh(new THREE.BoxGeometry(0.075, 0.075, 0.02), M.gold, 0, 0.02, 0.148));
        spine.add(mesh(new THREE.BoxGeometry(0.045, 0.045, 0.022), M.leather, 0, 0.02, 0.15));
    }
    const satchel = new THREE.Group();
    satchel.visible = !cut.bare;
    satchel.position.set(0.13, -0.07, 0.13);
    satchel.rotation.y = 0.5;
    satchel.add(mesh(new THREE.BoxGeometry(0.17, 0.15, 0.07), M.leather));
    satchel.add(mesh(new THREE.BoxGeometry(0.175, 0.08, 0.075), M.leatherDark, 0, 0.04, 0.005));
    satchel.add(mesh(new THREE.BoxGeometry(0.03, 0.05, 0.02), M.gold, 0, 0.01, 0.045));
    spine.add(satchel);
    // Left shoulder: leather and gold ornament.
    if (O.style === 'longcoat' || !O.style) {
        const pauldron = mesh(new THREE.SphereGeometry(0.1, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), M.leatherDark, 0.24, 0.53, 0);
        pauldron.scale.set(1, 0.7, 1.1);
        spine.add(pauldron);
        spine.add(mesh(new THREE.TorusGeometry(0.06, 0.012, 4, 10), M.gold, 0.25, 0.55, 0.05));
    }
    // Cape: hangs from the shoulders and flares with speed (animated with the coat's back panel).
    let cape = null;
    if (L.cape) {
        cape = new THREE.Group();
        cape.position.set(0, 0.56, -0.17);
        spine.add(cape);
        const cg = new THREE.PlaneGeometry(0.52, 1.15, 2, 6).translate(0, -0.575, 0);
        cape.add(new THREE.Mesh(cg, M.coatDark));
        cape.add(mesh(new THREE.BoxGeometry(0.5, 0.04, 0.03), M.gold, 0, 0, 0.01));
    }

    // ---- head ----
    const head = new THREE.Group();
    head.position.y = 0.6;
    spine.add(head);
    head.add(mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.08, 7), M.skin, 0, 0.02, 0));      // neck
    const skull = mesh(new THREE.SphereGeometry(0.12, 12, 10), M.skin, 0, 0.13, 0);
    skull.scale.set(0.92, 1.08, 1);
    head.add(skull);
    buildFacialHair(L.facialHair.style, head, M.stubble);   // parts library
    head.add(mesh(new THREE.BoxGeometry(0.022, 0.05, 0.03), M.skin, 0, 0.12, 0.118));            // nose
    for (const s of [1, -1]) {
        head.add(mesh(new THREE.SphereGeometry(0.016, 6, 5), M.eye, s * 0.042, 0.15, 0.103));
        const brow = mesh(new THREE.BoxGeometry(0.045, 0.011, 0.012), M.brow, s * 0.043, 0.178, 0.108);
        brow.rotation.z = s * -0.18;
        head.add(brow);
        head.add(mesh(new THREE.SphereGeometry(0.025, 5, 4), M.skin, s * 0.112, 0.13, -0.005));   // ears
    }
    const covered = L.hood || L.headgear?.type === 'helmet';
    buildHair(covered ? 'short' : L.hair.style, head, M.hair);   // parts library (a hood or helmet keeps the hair close)
    const hoodM = L.hoodColor ? mat(L.hoodColor, { side: THREE.DoubleSide }) : M.coatDark;
    if (L.hood) {   // a sphere shell with the face cut away, and a pointed back
        head.add(mesh(new THREE.SphereGeometry(0.165, 12, 8, Math.PI * 0.78, Math.PI * 1.44, 0, Math.PI * 0.66), hoodM, 0, 0.13, -0.01));
        const tip = mesh(new THREE.ConeGeometry(0.08, 0.18, 6), hoodM, 0, 0.2, -0.14);
        tip.rotation.x = -1.1;
        head.add(tip);
    }

    // Headgear from equipment: a helmet (cap, rim, nose guard) or a wide-brimmed hat.
    if (L.headgear) {
        const gm = mat(L.headgear.color ?? '#9aa0a8', { metalness: L.headgear.type === 'helmet' ? 0.5 : 0, roughness: 0.5 });
        if (L.headgear.type === 'helmet') {
            const capM = mesh(new THREE.SphereGeometry(0.15, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), gm, 0, 0.14, 0);
            capM.scale.set(1, 1.08, 1.05);
            head.add(capM);
            head.add(mesh(new THREE.TorusGeometry(0.148, 0.014, 4, 16).rotateX(Math.PI / 2), gm, 0, 0.165, 0));
            head.add(mesh(new THREE.BoxGeometry(0.025, 0.09, 0.02), gm, 0, 0.13, 0.15));
        } else {
            head.add(mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.02, 18), gm, 0, 0.235, 0));
            head.add(mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.13, 12), gm, 0, 0.3, 0));
        }
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

    // ---- weapon mounts: right hand (main) and left forearm (off hand) ----
    // Empty hands still carry Eldrin's own staff.
    const mainMount = new THREE.Group();
    mainMount.position.y = -0.31;
    mainMount.rotation.x = 0.75;
    arms.R.fore.add(mainMount);
    const offMount = new THREE.Group();
    offMount.position.set(0.06, -0.2, 0.05);
    arms.L.fore.add(offMount);
    let crystal = null, tip = null, mainType = 'staff', offType = null;

    root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    bakeRig(root);
    body.scale.set(L.build.width, L.build.height, L.build.width);   // build: taller / broader

    // main / off: { type, accent } (amo weapon type + the item's colour) or null.
    function setWeapons(main, off) {
        mainMount.clear();
        offMount.clear();
        if (main === false) { crystal = null; tip = null; mainType = 'fists'; }   // nothing in hand (spells leave from the hand)
        else {
            const m = buildWeapon(main?.type ?? 'staff', { accent: main?.accent, crystalMat: (main?.type ?? 'staff') === 'staff' ? M.crystal : null });
            mainMount.add(m.group);
            crystal = m.crystal; tip = m.tip; mainType = main?.type ?? 'staff';
        }
        offType = off?.type ?? null;
        if (off) {
            const o = buildWeapon(off.type, { accent: off.accent });
            if (off.type === 'shield') o.group.rotation.set(0, 0, 0);
            else o.group.rotation.x = 0.75;
            offMount.add(o.group);
        }
        mainMount.rotation.x = mainType === 'bow' || mainType === 'crossbow' ? 0.1 : 0.75;
        for (const g of [mainMount, offMount]) g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    }
    setWeapons(null, null);

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
    function update(dt, { speed, sprinting, hopK, castK = null, strikeK = null, thrust = false, incant = false }) {
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
        let blazeK = castK != null ? Math.sin(Math.min(1, castK) * Math.PI) : 0;
        if (castK != null && incant) {
            // The incantation: both hands lift the staff high, the head tips back to the sky, the staff sways as
            // the words go on; then it comes down and points, and the spell is loosed.
            const k = Math.min(1, castK), sm = (a, b) => { const x = Math.min(1, Math.max(0, (k - a) / (b - a))); return x * x * (3 - 2 * x); };
            const up = sm(0, 0.2) * (1 - sm(0.7, 0.8)), fwd = sm(0.7, 0.8) * (1 - sm(0.86, 1)), rest = 1 - up - fwd;
            const sway = Math.sin(t * 6) * 0.07 * up;
            arms.R.upper.rotation.x = arms.R.upper.rotation.x * rest - 2.75 * up - 1.55 * fwd;
            arms.L.upper.rotation.x = arms.L.upper.rotation.x * rest - 2.65 * up - 1.1 * fwd;
            arms.R.upper.rotation.z = -0.12 + 0.32 * up + sway;
            arms.L.upper.rotation.z = 0.12 - 0.32 * up + sway;
            arms.R.fore.rotation.x = -0.75 * (1 - up) - 0.3 * up - 0.1 * fwd;
            arms.L.fore.rotation.x = arms.L.fore.rotation.x * (1 - up) - 0.35 * up;
            spine.rotation.x += -0.22 * up + 0.2 * fwd;
            head.rotation.x += -0.6 * up;
            mainMount.rotation.x = 0.75 + 2.4 * up + 0.7 * fwd;   // the staff stands up to the sky, then points
            blazeK = Math.min(1, k * 1.4);
        } else if (castK != null) {
            const w = Math.sin(Math.min(1, castK) * Math.PI);
            arms.R.upper.rotation.x = arms.R.upper.rotation.x * (1 - w) - 1.5 * w;
            arms.R.upper.rotation.z = -0.12 - 0.15 * w;
            arms.R.fore.rotation.x = -0.75 * (1 - w) - 0.15 * w;
            arms.L.upper.rotation.x = arms.L.upper.rotation.x * (1 - w) - 0.6 * w;
            spine.rotation.x += 0.12 * w;
            spine.rotation.y += -0.25 * w;
        }
        // Strike: a short sweeping blow with the staff, right to left, the body twisting into it.
        if (strikeK != null && thrust) {   // spears, daggers, bo: a straight stab forward
            const k = Math.min(1, strikeK), w = Math.sin(k * Math.PI);
            arms.R.upper.rotation.x = arms.R.upper.rotation.x * (1 - w) - 1.45 * w;
            arms.R.upper.rotation.z = -0.12;
            arms.R.fore.rotation.x = -0.75 * (1 - w) - 0.05 * w;
            mainMount.rotation.x = 0.75 + 0.8 * w;
            spine.rotation.x += 0.18 * w;
        } else if (strikeK != null) {
            const k = Math.min(1, strikeK), w = Math.sin(k * Math.PI);
            arms.R.upper.rotation.x = arms.R.upper.rotation.x * (1 - w) - 1.3 * w;
            arms.R.upper.rotation.z = -0.12 - 0.9 * w + 1.5 * w * k;
            arms.R.fore.rotation.x = -0.75 * (1 - w) - 0.3 * w;
            spine.rotation.y += (0.5 - 1.1 * k) * w;
            spine.rotation.x += 0.1 * w;
        }
        M.crystal.emissive.copy(calm).lerp(blaze, blazeK);

        // Coat: front flaps follow the thighs, the back panel flares with speed.
        flapL.joint.rotation.x = Math.min(0.2, legs.L.thigh.rotation.x * 0.8) - air * 0.3;
        flapR.joint.rotation.x = Math.min(0.2, legs.R.thigh.rotation.x * 0.8) - air * 0.3;
        back.joint.rotation.x = 0.04 + amp * 0.22 + run * 0.35 + air * 0.35 + Math.sin(t * 3.1) * 0.02;
        if (cape) cape.rotation.x = 0.06 + amp * 0.3 + run * 0.45 + air * 0.4 + Math.sin(t * 2.7) * 0.03;
        ripple(back, 0.4 + amp);

        if (crystal) crystal.rotation.y += dt * 1.5;
        M.crystal.emissiveIntensity = 1.8 + Math.sin(t * 3) * 0.6;
    }

    return { root, update, setWeapons, get mainType() { return mainType; }, crystalWorld: v => (tip ?? arms.R.fore).getWorldPosition(v) };
}
