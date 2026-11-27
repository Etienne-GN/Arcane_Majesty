// A character built in code: a joint hierarchy of simple meshes, animated in code — idle, walk,
// sprint, hop, cast, strike. The body is a bare skin rig; clothing and gear are independent parts
// (content/models/parts) mounted on its sockets. Both hands accept any handheld item.
import * as THREE from 'three';
import { bakeRig } from '../../engine/batch.js';
import { buildWeapon } from './weapons.js';
import { buildHair, buildFacialHair } from './parts/hair.js';
import { DEFAULT_LOOK, normalizeLook, BODY_PRESETS, RACES, handSpec } from './look.js';
import { PART_CATALOG, partDef, COVERING_HEADGEAR } from './parts/index.js';
import { settings } from '../../engine/settings.js';
import { V2_MODELS } from './v2/index.js';
import { buildBase } from './v2/base.js';
import { wardrobeOutfit, RIGID_SLOTS } from './v2/wardrobe.js';

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

// the top of a v2 body's left shoulder (its deltoid: the highest point on the upper arm's bone), in the spine's frame
function v2Shoulder(mesh) {
    const p = mesh.geometry.attributes.position, si = mesh.geometry.attributes.skinIndex, sw = mesh.geometry.attributes.skinWeight, spine = mesh.skeleton.bones[1], up = mesh.skeleton.bones[3];
    let best = null; const v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) { if (si.getX(i) !== 3 || sw.getX(i) < 0.5 || p.getX(i) <= 0) continue; if (!best || p.getY(i) > best.y) best = v.set(p.getX(i), p.getY(i), p.getZ(i)).clone(); }
    if (!best) return { x: 0.25, y: 0.52 };
    mesh.parent.updateMatrixWorld(true); const q = spine.worldToLocal(mesh.parent.localToWorld(best.clone()));
    return { x: q.x, y: q.y, up };
}
export function createCharacter(lookIn = DEFAULT_LOOK) {
    const L = normalizeLook(lookIn);
    const bodyDef = L.body;
    const P = BODY_PRESETS[bodyDef.preset] ?? BODY_PRESETS.adult_male;
    const eye = new THREE.Color(L.face.eyes);
    const M = {
        skin: (() => { const R = RACES[bodyDef.race] ?? RACES.human, m = mat(bodyDef.wolf ? (R.fur ?? '#6a5e54') : bodyDef.skin); if (R.glow) { m.emissive = new THREE.Color(R.glow.color); m.emissiveIntensity = R.glow.k; } return m; })(),   // a race's inner light
        hair: mat(L.hair.color),
        stubble: mat(L.facialHair.color),
        ear: null,   // (the elven ears: the skin's own material, set below — kept on a v2 head)
        eye: new THREE.MeshStandardMaterial({ color: eye, emissive: eye.clone().multiplyScalar(0.7), emissiveIntensity: 0.6 }),
        brow: mat(darker(L.hair.color, 0.75)),
        gold: mat('#d4a84a', { metalness: 0.7, roughness: 0.35 }),
        steel: mat('#9aa0a8', { metalness: 0.75, roughness: 0.35 }),
        wood: mat(0x6b4a2b),
        crystal: new THREE.MeshStandardMaterial({
            color: 0x7ff5e6, emissive: 0x3ce0d0, emissiveIntensity: 2.2, flatShading: true, roughness: 0.2,
        }),
    };
    M.ear = M.skin.clone();
    const elvenEars = [];

    // Local forward is +z; the character's left is +x.
    const root = new THREE.Group();
    root.userData.dynamic = true;   // a character moves: never merged into the scenery (the open world's static batching)
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
    if (!bodyDef.wolf) buildFacialHair(L.facialHair.style, head, M.stubble);
    head.add(mesh(new THREE.BoxGeometry(0.022, 0.05, 0.03), M.skin, 0, 0.12, 0.118));            // nose
    for (const s of [1, -1]) {
        head.add(mesh(new THREE.SphereGeometry(0.016, 6, 5), M.eye, s * 0.042, 0.15, 0.103));
        const brow = mesh(new THREE.BoxGeometry(0.045, 0.011, 0.012), M.brow, s * 0.043, 0.178, 0.108);
        brow.rotation.z = s * -0.18;
        head.add(brow);
        if (bodyDef.wolf) {   // the wolf form: tall pointed wolf ears on top of the head
            const ear = mesh(new THREE.ConeGeometry(0.04, 0.12, 4), M.skin, s * 0.07, 0.27, -0.03); ear.rotation.z = s * -0.25; head.add(ear);
        } else if ((RACES[bodyDef.race] ?? RACES.human).ears === 'elven') {   // long pointed ears, swept back and up
            const ear = mesh(new THREE.ConeGeometry(0.026, 0.13, 5), M.ear, s * 0.118, 0.15, -0.02);
            ear.rotation.set(-0.5, 0, s * -1.05); head.add(ear); elvenEars.push([ear, s]);
        } else head.add(mesh(new THREE.SphereGeometry(0.025, 5, 4), M.skin, s * 0.112, 0.13, -0.005));   // ears
    }
    if (RACES[bodyDef.race]?.veins) {   // the Fallen: Void-cracks glowing under the skin of the face
        const vein = new THREE.MeshBasicMaterial({ color: RACES[bodyDef.race].veins, toneMapped: false });
        for (const [x, y, r] of [[0.06, 0.1, 0.5], [-0.07, 0.08, -0.6], [0.03, 0.2, -0.3], [-0.04, 0.03, 0.4]]) { const v = mesh(new THREE.BoxGeometry(0.006, 0.05, 0.004), vein, x, y, 0.106); v.rotation.z = r; head.add(v); }
    }
    if (bodyDef.wolf) {   // the wolf form: a long muzzle and black nose, fangs, a mane down the neck, claws, a tail
        const dark = mat(darker((RACES[bodyDef.race] ?? RACES.werewolf).fur ?? '#6a5e54', 0.6));
        head.add(mesh(new THREE.BoxGeometry(0.1, 0.08, 0.17), M.skin, 0, 0.08, 0.17));
        head.add(mesh(new THREE.BoxGeometry(0.04, 0.035, 0.04), mat('#111111'), 0, 0.115, 0.255));
        head.add(mesh(new THREE.BoxGeometry(0.085, 0.03, 0.14), dark, 0, 0.035, 0.16));
        for (const s of [1, -1]) { const f = mesh(new THREE.ConeGeometry(0.008, 0.035, 3), mat('#f0e8d8'), s * 0.03, 0.03, 0.235); f.rotation.x = Math.PI; head.add(f); }
        const mane = mesh(new THREE.SphereGeometry(0.17, 8, 6), dark, 0, 0.02, -0.06); mane.scale.set(1.15, 0.9, 1.1); head.add(mane);
        const tail = mesh(new THREE.ConeGeometry(0.07, 0.55, 6), M.skin, 0, -0.05, -0.2); tail.rotation.x = -2.3; hips.add(tail);
    }
    const covered = COVERING_HEADGEAR.has(L.parts.headgear?.id);
    if (!bodyDef.wolf) buildHair(covered ? 'short' : L.hair.style, head, M.hair);

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
        if (bodyDef.wolf) for (const c of [-0.025, 0, 0.025]) { const k = mesh(new THREE.ConeGeometry(0.008, 0.06, 3), mat('#f0e8d8'), c, -0.38, 0.03); k.rotation.x = Math.PI * 0.9; fore.add(k); }   // claws
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
    // Character models v2 (Options › Display › Character models: New): a hand-shaped continuous model for this character
    // Any other look (the NPCs, the Forge's characters) is built on the base body of its sex and age, its clothes translated
    // (v2/wardrobe.js); its rigid pieces (hat, shoulders, belt…) stay the classic parts on the same joints — kept visible
    // below by their materials. Not for the wolf form (its own shape).
    const OWN = settings.charModels === 'new' && typeof lookIn?.v2 === 'string' && Object.hasOwn(V2_MODELS, lookIn.v2) ? V2_MODELS[lookIn.v2] : null;   // (own keys only: a look from the network can't reach the prototype)
    const F2 = /female/.test(bodyDef.preset);
    // the hair: the v2 hair for short and tousled; the classic styles (long, ponytail, braids, and the cap under a covering
    // hat) on a bald v2 head, as their meshes were built above on the same head joint; the classic beards likewise
    const ownHair = ['short', 'tousled'].includes(L.hair.style) && !covered;
    const V2 = OWN ?? (settings.charModels === 'new' && !bodyDef.wolf ? (c => buildBase(c, { sex: F2 ? 'female' : 'male', skin: bodyDef.skin, hair: L.hair.color, bald: !ownHair, outfit: wardrobeOutfit(L, F2) })) : null);
    let v2 = null;
    const keepMats = new Set([M.gold, M.steel, M.wood, M.crystal]);   // (the rigid classic parts worn on a v2 body: their materials stay visible)
    if (V2 && !OWN) {
        keepMats.add(M.stubble); if (!ownHair && L.hair.style !== 'bald') keepMats.add(M.hair);
        if (elvenEars.length) { keepMats.add(M.ear); for (const [ear, s] of elvenEars) ear.position.set(s * 0.088, 0.135, -0.03); }   // (the elven points, from the v2 head's own ear)
    }
    if (V2) { root.traverse(o => { if (o.isMesh) o.visible = false; }); v2 = V2(ctx); if (typeof v2?.update === 'function') hooks.push(v2.update); }
    if (V2 && !OWN) for (const slot of RIGID_SLOTS) {
        const entry = L.parts[slot];
        if (!entry?.id || entry.id === 'none') continue;
        const def = partDef(slot, entry.id); if (!def) continue;
        const colors = { ...(def.colors ?? {}), ...(entry.colors ?? {}) };
        const before = new Set(spine.children);
        const res = def.build({ ...ctx, colors, slot, entry, mat: (c, o) => { const m = ctx.mat(c, o); keepMats.add(m); return m; } });
        if (res?.update) hooks.push(res.update);
        if (slot === 'shoulders' && v2?.mesh) {   // (2026-11-26: seated on this body's own shoulders — the classic spot is a fixed 0.25 m out, 0.52 up)
            const sh = v2Shoulder(v2.mesh);
            for (const o of spine.children) if (!before.has(o)) {
                if (Math.abs(o.position.x) > 0.1) { o.position.x += Math.sign(o.position.x) * (sh.x - 0.25); o.position.y += sh.y - 0.03 - 0.52; o.scale.multiplyScalar(F2 ? 0.88 : 1); }   // (pauldrons: on the deltoid; smaller on a woman's shoulders)
                else { o.position.y += sh.y + 0.04 - 0.55; if (o.geometry?.type === 'TorusGeometry') o.scale.x = 0.92 * (sh.x / 0.25); }   // (a mantle: round the neck, on the trapezius, no wider than the shoulders)
            }
        }
    }
    for (const slot of V2 ? [] : Object.keys(PART_CATALOG)) {
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
    if (V2) root.traverse(o => { if (o.isMesh && !o.userData.v2) o.visible = keepMats.has(o.material); });   // (the classic body, merged by bakeRig, stays hidden)

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
            const m = v2?.weapon?.(type) ?? buildWeapon(type, { accent: main?.accent, crystalMat: type === 'staff' ? M.crystal : null });
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
    function update(dt, { speed, sprinting, hopK, castK = null, strikeK = null, thrust = false, incant = false, strikeHand = 'R', castHand = 'R', blockK = null, move = null, strikeCombo = 1, rollK = null, seated = false }) {
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
        // In the saddle: thighs forward and apart round the horse, shins hanging bent at the stirrups.
        for (const [k, sd] of [['L', 1], ['R', -1]]) { legs[k].thigh.rotation.z = seated ? sd * 0.42 : 0; if (seated) { legs[k].thigh.rotation.x = -1.3; legs[k].shin.rotation.x = 1.35; } }

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
            if ((strikeK != null && strikeHand === h) || (move && ((move.hand ?? 'R') === h || move.id === 'cross')) || (move && blockK == null && h === 'R' && move.id !== 'wall')) { sh.last = t; setSheathed(h, false); }   // a skill's move draws too
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
        if (blockK != null) {   // the shield up: the arm across the body, the shield in front of the chest
            const h = mainShield ? 'R' : 'L', A = arms[h], sz = h === 'R' ? 1 : -1;
            A.upper.rotation.x = -1.35 * blockK; A.upper.rotation.z = sz * 0.55 * blockK; A.fore.rotation.x = -1.1 * blockK;
        }
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
            if (bladeType === 'axe' || bladeType === 'mace') {
                // A chop: the arm lifts the head up and back behind the shoulder (the grip sliding to the end of the
                // handle), then brings it down in front in one vertical arc, edge first, the body leaning into it.
                const sm = (a, b) => { const x = Math.min(1, Math.max(0, (k - a) / (b - a))); return x * x * (3 - 2 * x); };
                const wind = sm(0, 0.3), cut = sm(0.32, 0.5), back = sm(0.62, 1), r0 = restOf(bladeType);
                const lerp = (a, b, c, d) => a + (b - a) * wind + (c - b) * cut + (d - c) * back;   // rest → raised → struck → rest
                const ux0 = A.upper.rotation.x;
                A.upper.rotation.x = lerp(ux0, -2.85, -1.2, ux0);
                A.upper.rotation.z = sz * lerp(r0.z, -0.28, 0.12, r0.z);
                A.fore.rotation.x = lerp(r0.fore, -1.55, -0.12, r0.fore);
                setMount(strikeHand, lerp(r0.mount, 1.9, 2.05, r0.mount));   // behind the head → over the top → stops level in front, at the target
                spine.rotation.x += lerp(0, -0.12, 0.32, 0);
                spine.rotation.y += sz * lerp(0, 0.22, -0.12, 0);
                head.rotation.x += lerp(0, -0.1, 0.18, 0);
            } else if (BLADE.has(bladeType) && !thrust) {
                // A slash in three beats: wind the blade back over the shoulder, cut down and across the body as the
                // torso turns into it, then come back to guard. sm = smoothstep between two moments.
                const sm = (a, b) => { const x = Math.min(1, Math.max(0, (k - a) / (b - a))); return x * x * (3 - 2 * x); };
                const wind = sm(0, 0.28), cut = sm(0.3, 0.55), back = sm(0.62, 1);
                const lerp = (a, b, c, d) => a + (b - a) * wind + (c - b) * cut + (d - c) * back;   // guard → wound → cut → guard
                const ux0 = A.upper.rotation.x;
                A.upper.rotation.x = lerp(ux0, -2.5, -1.0, ux0);
                const r0 = restOf(bladeType);
                const rev = strikeCombo === 2 ? -1 : 1;   // a combo's second blow: the backhand, across and back out
                A.upper.rotation.z = sz * (rev > 0 ? lerp(r0.z, -1.1, 0.85, r0.z) : lerp(r0.z, 0.85, -1.1, r0.z));   // out to the side, then right across the body (or back)
                A.fore.rotation.x = lerp(r0.fore, -1.3, -0.15, r0.fore);
                setMount(strikeHand, lerp(r0.mount, 3.3, 2.8, r0.mount));   // the blade rides the arm: up and back over the shoulder, then across (never dipping down)
                spine.rotation.y += sz * rev * lerp(0, 0.6, -0.7, 0);
                spine.rotation.x += lerp(0, -0.08, 0.2, 0);
                head.rotation.y = -spine.rotation.y * 0.5;
                if (bladeType === 'greatsword' || bladeType === 'claymore') {   // two hands on the hilt: the other arm follows
                    const B2 = arms[strikeHand === 'R' ? 'L' : 'R'];
                    B2.upper.rotation.x = A.upper.rotation.x * 0.92; B2.upper.rotation.z = A.upper.rotation.z * 0.8; B2.fore.rotation.x = A.fore.rotation.x;
                }
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
                m.rotation.x += (bladeType === 'spear' || bladeType === 'bo' || bladeType === 'halberd' ? 1.9 : 0.8) * w;   // a polearm levelled at the foe
                spine.rotation.x += 0.18 * w;
            } else {
                A.upper.rotation.x = A.upper.rotation.x * (1 - w) - 1.3 * w;
                A.upper.rotation.z = sz * (-0.12 - 0.9 * w + 1.5 * w * k);
                A.fore.rotation.x = fore0 * (1 - w) - 0.3 * w;
                spine.rotation.y += sz * (0.5 - 1.1 * k) * w;
                spine.rotation.x += 0.1 * w;
            }
        }
        // A style skill's own move (move = { id, k 0..1, hand }): each pose winds up, lands its moment, and comes back.
        if (move) {
            const { A, B, sz, mount: m } = side(move.hand ?? 'R'), k = Math.min(1, move.k);
            const sm = (a, b) => { const x = Math.min(1, Math.max(0, (k - a) / (b - a))); return x * x * (3 - 2 * x); };
            const hold = (a, b) => sm(0, a) * (1 - sm(b, 1));   // up by a, held, down from b
            const crouch = v => { body.position.y -= 0.1 * v; for (const L of [legs.L, legs.R]) { L.thigh.rotation.x -= 0.45 * v; L.shin.rotation.x += 0.85 * v; } spine.rotation.x += 0.12 * v; };
            const wmount = (h, a) => setMount(h, a);
            const id = move.id, H = move.hand ?? 'R', Bh = H === 'R' ? 'L' : 'R';
            if (id === 'parry') {   // the blade swept up across the face, flat, to catch the blow
                const v = hold(0.15, 0.85);
                A.upper.rotation.x += (-1.75 - A.upper.rotation.x) * v; A.upper.rotation.z += (sz * 0.55 - A.upper.rotation.z) * v;
                A.fore.rotation.x += (-1.25 - A.fore.rotation.x) * v; wmount(H, 2.75 + (2.0 - 2.75) * v);
                spine.rotation.y += sz * -0.2 * v; crouch(0.3 * v);
            } else if (id === 'riposte' || id === 'stab') {   // a coil back, then a lunge: the point driven in (a backstab low and upward)
                const back = sm(0, 0.3) * (1 - sm(0.32, 0.45)), go = sm(0.32, 0.45) * (1 - sm(0.7, 1)), low = id === 'stab';
                A.upper.rotation.x += (0.5 - A.upper.rotation.x) * back + ((low ? -1.0 : -1.5) - A.upper.rotation.x) * go;
                A.upper.rotation.z = sz * (-0.25 * back - 0.08 * go);
                A.fore.rotation.x += (-1.6 - A.fore.rotation.x) * back + ((low ? -0.6 : -0.1) - A.fore.rotation.x) * go;
                wmount(H, 2.75 + 0.35 * back + ((low ? 2.9 : 2.7) - 2.75) * go);   // the point ahead, level (a spear or a sword alike)
                spine.rotation.y += sz * (0.45 * back - 0.3 * go); spine.rotation.x += 0.25 * go - 0.08 * back;
                legs[Bh].thigh.rotation.x -= 0.7 * go; legs[Bh].shin.rotation.x += 0.4 * go; legs[H].thigh.rotation.x += 0.35 * go;
                if (low) crouch(0.5 * go + 0.3 * back);
            } else if (id === 'guard') {   // Steady Advance: knees bent, blade forward, the shoulder behind it
                const v = hold(0.2, 0.8);
                crouch(0.45 * v); A.upper.rotation.x += (-0.95 - A.upper.rotation.x) * v; A.fore.rotation.x += (-0.9 - A.fore.rotation.x) * v;
                wmount(H, 2.75 + (2.0 - 2.75) * v); B.upper.rotation.x += (-0.7 - B.upper.rotation.x) * v; B.fore.rotation.x += (-1.2 - B.fore.rotation.x) * v;
                spine.rotation.y += sz * 0.3 * v;
            } else if (id === 'cleave' || id === 'sweep') {   // both hands: the blade far back to one side, then one great flat sweep across
                const wind = sm(0, 0.35), cut = sm(0.37, 0.58), back = sm(0.7, 1);
                const lerp = (a, b, c, d) => a + (b - a) * wind + (c - b) * cut + (d - c) * back;
                for (const [Ar, zs] of [[A, sz], [B, -sz]]) { Ar.upper.rotation.x = lerp(Ar.upper.rotation.x, -1.45, -1.35, Ar.upper.rotation.x); Ar.fore.rotation.x = lerp(Ar.fore.rotation.x, -0.9, -0.3, Ar.fore.rotation.x); }
                A.upper.rotation.z = sz * lerp(-0.2, -1.2, 1.0, -0.2); B.upper.rotation.z = -sz * lerp(0.1, -0.2, 0.9, 0.1);
                wmount(H, lerp(2.75, 2.5, 2.5, 2.75));   // the blade flat
                spine.rotation.y += sz * lerp(0, 1.1, -1.15, 0); head.rotation.y = -spine.rotation.y * 0.4; crouch(0.35 * (wind + cut) * (1 - back));
            } else if (id === 'overhead') {   // both hands high over the head, then down in one crushing blow, knees giving with it
                const wind = sm(0, 0.38), cut = sm(0.4, 0.55), back = sm(0.72, 1);
                const lerp = (a, b, c, d) => a + (b - a) * wind + (c - b) * cut + (d - c) * back;
                for (const Ar of [A, B]) { const x0 = Ar.upper.rotation.x, f0 = Ar.fore.rotation.x; Ar.upper.rotation.x = lerp(x0, -3.0, -0.9, x0); Ar.fore.rotation.x = lerp(f0, -0.5, -0.2, f0); }
                A.upper.rotation.z = sz * lerp(-0.2, 0.25, 0.3, -0.2); B.upper.rotation.z = -sz * lerp(0.12, 0.3, 0.35, 0.12);
                wmount(H, lerp(1.15, 2.0, 2.1, 1.15));
                spine.rotation.x += lerp(0, -0.3, 0.45, 0); head.rotation.x += lerp(0, -0.2, 0.25, 0); crouch(cut * (1 - back) * 0.7);
            } else if (id === 'sidelong') {   // a flat blow at head height, from far out to the side
                const wind = sm(0, 0.3), cut = sm(0.32, 0.5), back = sm(0.65, 1);
                const lerp = (a, b, c, d) => a + (b - a) * wind + (c - b) * cut + (d - c) * back;
                const x0 = A.upper.rotation.x; A.upper.rotation.x = lerp(x0, -1.6, -1.55, x0); A.upper.rotation.z = sz * lerp(-0.2, -1.5, 0.9, -0.2);
                A.fore.rotation.x = lerp(A.fore.rotation.x, -1.4, -0.1, A.fore.rotation.x); wmount(H, lerp(1.15, 1.7, 1.8, 1.15));
                spine.rotation.y += sz * lerp(0, 0.8, -0.8, 0);
            } else if (id === 'chop') {   // diagonal: from high over the shoulder down across to the far hip
                const wind = sm(0, 0.3), cut = sm(0.32, 0.5), back = sm(0.65, 1);
                const lerp = (a, b, c, d) => a + (b - a) * wind + (c - b) * cut + (d - c) * back;
                const x0 = A.upper.rotation.x; A.upper.rotation.x = lerp(x0, -2.9, -0.7, x0); A.upper.rotation.z = sz * lerp(-0.2, -0.7, 0.75, -0.2);
                A.fore.rotation.x = lerp(A.fore.rotation.x, -1.5, -0.2, A.fore.rotation.x); wmount(H, lerp(1.15, 1.9, 2.2, 1.15));
                spine.rotation.y += sz * lerp(0, 0.4, -0.6, 0); spine.rotation.x += lerp(0, -0.1, 0.35, 0);
            } else if (id === 'haymaker') {   // the fist far back, the body wound away, then a great hook across
                const wind = sm(0, 0.4), cut = sm(0.42, 0.58), back = sm(0.72, 1);
                const lerp = (a, b, c, d) => a + (b - a) * wind + (c - b) * cut + (d - c) * back;
                const x0 = A.upper.rotation.x; A.upper.rotation.x = lerp(x0, 0.5, -1.55, x0); A.upper.rotation.z = sz * lerp(-0.12, -0.9, 0.7, -0.12);
                A.fore.rotation.x = lerp(A.fore.rotation.x, -1.7, -0.5, A.fore.rotation.x);
                B.upper.rotation.x += (-1.2 - B.upper.rotation.x) * (wind * (1 - back)); B.fore.rotation.x += (-1.8 - B.fore.rotation.x) * (wind * (1 - back));   // the other fist guards the chin
                spine.rotation.y += sz * lerp(0, 0.75, -0.75, 0); spine.rotation.x += lerp(0, -0.05, 0.25, 0);
                legs[H].thigh.rotation.x += 0.3 * cut * (1 - back); legs[Bh].thigh.rotation.x -= 0.5 * cut * (1 - back);
            } else if (id === 'grab') {   // both hands out to seize it, then heaved up and over to the side
                const reach = sm(0, 0.3), lift = sm(0.35, 0.6), back = sm(0.75, 1);
                for (const [Ar, zs] of [[A, sz], [B, -sz]]) {
                    const x0 = Ar.upper.rotation.x;
                    Ar.upper.rotation.x = x0 + (-1.45 - x0) * reach + (-2.6 + 1.45) * lift + (x0 + 2.6) * back;
                    Ar.upper.rotation.z = zs * (-0.1 + 0.25 * reach - 0.15 * lift) ; Ar.fore.rotation.x = -0.3 - 0.6 * lift * (1 - back);
                }
                spine.rotation.x += 0.3 * reach * (1 - lift) - 0.35 * lift * (1 - back); spine.rotation.y += sz * 1.0 * lift * (1 - back); crouch(0.5 * reach * (1 - lift));
            } else if (id === 'headbutt') {   // reared back — then the brow driven forward
                const rear = sm(0, 0.35) * (1 - sm(0.38, 0.5)), snap = sm(0.38, 0.5) * (1 - sm(0.65, 1));
                spine.rotation.x += -0.4 * rear + 0.6 * snap; head.rotation.x += -0.3 * rear + 0.45 * snap;
                for (const Ar of [A, B]) { Ar.upper.rotation.x += (0.35 - Ar.upper.rotation.x) * snap + (-0.8 - Ar.upper.rotation.x) * rear; Ar.fore.rotation.x += (-1.6 - Ar.fore.rotation.x) * rear; }
                legs[Bh].thigh.rotation.x -= 0.5 * snap;
            } else if (id === 'roar') {   // Rage, Rampage, Frenzy: arms flung wide, chest up, the head thrown back
                const v = hold(0.25, 0.75), shake = Math.sin(t * 40) * 0.05 * v;
                for (const [Ar, zs] of [[A, sz], [B, -sz]]) { Ar.upper.rotation.x += (-0.55 - Ar.upper.rotation.x) * v; Ar.upper.rotation.z += (zs * -1.25 - Ar.upper.rotation.z) * v + shake; Ar.fore.rotation.x += (-1.1 - Ar.fore.rotation.x) * v; }
                spine.rotation.x += -0.32 * v; head.rotation.x += -0.5 * v + shake; crouch(0.25 * v);
            } else if (id === 'wall') {   // Shield Wall, Perfect Block: braced low behind the shield
                const v = hold(0.15, 0.85), Sh = mainType === 'shield' ? 'R' : 'L', S = arms[Sh], ss = Sh === 'R' ? 1 : -1;
                S.upper.rotation.x = -1.4 * v + S.upper.rotation.x * (1 - v); S.upper.rotation.z = ss * 0.5 * v; S.fore.rotation.x = -1.15 * v + S.fore.rotation.x * (1 - v);
                crouch(0.6 * v); spine.rotation.x += 0.1 * v;
            } else if (id === 'twirl') {   // Deflect Arrows: the staff whirled overhead
                const v = hold(0.15, 0.85);
                A.upper.rotation.x += (-2.6 - A.upper.rotation.x) * v; A.upper.rotation.z = sz * -0.2 * v; A.fore.rotation.x += (-0.4 - A.fore.rotation.x) * v;
                m.rotation.y = v > 0.02 ? t * 22 : 0; wmount(H, 1.57 * v + 0.75 * (1 - v));
            } else if (id === 'channel') {   // Channel: both hands on the staff before you, head bowed
                const v = hold(0.2, 0.8);
                for (const Ar of [A, B]) { Ar.upper.rotation.x += (-0.85 - Ar.upper.rotation.x) * v; Ar.fore.rotation.x += (-0.9 - Ar.fore.rotation.x) * v; }
                A.upper.rotation.z = sz * 0.3 * v; B.upper.rotation.z = -sz * 0.3 * v; head.rotation.x += 0.4 * v; wmount(H, 0.75 - 0.6 * v);
            } else if (id === 'raise') {   // Overload, Echo, Steady Aim's cousin: the staff or wand thrust high to the sky
                const v = hold(0.2, 0.8);
                A.upper.rotation.x += (-2.9 - A.upper.rotation.x) * v; A.fore.rotation.x += (-0.15 - A.fore.rotation.x) * v; A.upper.rotation.z = sz * 0.1 * v;
                head.rotation.x += -0.45 * v; spine.rotation.x += -0.15 * v;
            } else if (id === 'flourish') {   // Echo: the wand traces a circle
                const v = hold(0.1, 0.9), a = k * Math.PI * 4;
                A.upper.rotation.x += (-1.3 + Math.sin(a) * 0.35 - A.upper.rotation.x) * v; A.upper.rotation.z += (sz * (-0.2 + Math.cos(a) * 0.35) - A.upper.rotation.z) * v; A.fore.rotation.x += (-0.4 - A.fore.rotation.x) * v;
            } else if (id === 'aim') {   // Steady Aim: the crossbow brought to the shoulder, the cheek on the stock
                const v = hold(0.2, 0.8);
                A.upper.rotation.x += (-1.45 - A.upper.rotation.x) * v; A.upper.rotation.z = sz * 0.25 * v; A.fore.rotation.x += (-0.5 - A.fore.rotation.x) * v; wmount(H, 2.45 + (1.6 - 2.45) * v);
                B.upper.rotation.x += (-1.3 - B.upper.rotation.x) * v; B.upper.rotation.z = -sz * -0.35 * v; B.fore.rotation.x += (-1.1 - B.fore.rotation.x) * v; head.rotation.y = sz * 0.25 * v; head.rotation.x += 0.15 * v;
            } else if (id === 'vanish') {   // dropped low, cloak drawn round
                const v = hold(0.15, 0.7);
                crouch(0.9 * v); for (const [Ar, zs] of [[A, sz], [B, -sz]]) { Ar.upper.rotation.x += (-1.1 - Ar.upper.rotation.x) * v; Ar.upper.rotation.z += (zs * 0.6 - Ar.upper.rotation.z) * v; Ar.fore.rotation.x += (-1.9 - Ar.fore.rotation.x) * v; }
                head.rotation.x += 0.35 * v;
            } else if (id === 'beckon') {   // Taunt: the weapon (or shield) beaten on, the other hand calling them in
                const v = hold(0.15, 0.85), beat = Math.max(0, Math.sin(k * Math.PI * 6));
                B.upper.rotation.x += (-1.4 - B.upper.rotation.x) * v; B.fore.rotation.x += (-0.4 - 1.2 * beat - B.fore.rotation.x) * v; B.upper.rotation.z = -sz * -0.2 * v;
                spine.rotation.x += -0.2 * v; head.rotation.x += -0.2 * v;
            } else if (id === 'spinhigh') {   // Windmill, Whirlwind: the weapon out wide (the body spins with player.playSpin)
                const v = hold(0.1, 0.9);
                A.upper.rotation.x += (-1.5 - A.upper.rotation.x) * v; A.upper.rotation.z = sz * -1.3 * v; A.fore.rotation.x += (-0.1 - A.fore.rotation.x) * v; wmount(H, 2.8);   // the blade straight out along the arm
                B.upper.rotation.z = -sz * -1.0 * v; crouch(0.3 * v);
            } else if (id === 'cross') {   // two blades: both raised out wide, then cut down across each other
                const wind = sm(0, 0.35), cut = sm(0.37, 0.56), back = sm(0.7, 1);
                const lerp = (a, b, c, d) => a + (b - a) * wind + (c - b) * cut + (d - c) * back;
                for (const [Ar, zs, h2] of [[arms.R, 1, 'R'], [arms.L, -1, 'L']]) {
                    const x0 = Ar.upper.rotation.x, f0 = Ar.fore.rotation.x;
                    Ar.upper.rotation.x = lerp(x0, -2.5, -1.1, x0); Ar.upper.rotation.z = zs * lerp(-0.2, -1.0, 0.75, -0.2); Ar.fore.rotation.x = lerp(f0, -1.2, -0.2, f0);
                    wmount(h2, lerp(2.75, 3.2, 2.7, 2.75));
                }
                spine.rotation.x += lerp(0, -0.15, 0.3, 0); crouch(0.4 * cut * (1 - back));
            } else if (id === 'loose') {   // the bow arm out, the string hand at the cheek — loosed, it flies back past the ear
                const v = 1 - sm(0.7, 1), rel = sm(0.05, 0.22);
                A.upper.rotation.x += (-1.55 - A.upper.rotation.x) * v; A.upper.rotation.z = sz * 0.05 * v; A.fore.rotation.x += (-0.05 - A.fore.rotation.x) * v;
                wmount(H, 1.0 + (1.6 - 1.0) * v);   // the bow upright before you
                B.upper.rotation.x += (-1.45 + 0.35 * rel - B.upper.rotation.x) * v; B.upper.rotation.z = -sz * (-0.25 - 0.5 * rel) * v; B.fore.rotation.x += (-2.1 + 0.6 * rel - B.fore.rotation.x) * v;
                spine.rotation.y += sz * 0.35 * v; head.rotation.y = -sz * 0.3 * v;
            } else if (id === 'xbow') {   // the kick of the shot, then the crossbow lowered and the crank wound
                const kick = sm(0, 0.06) * (1 - sm(0.06, 0.2)), low = sm(0.15, 0.3) * (1 - sm(0.85, 1)), crank = Math.sin(k * Math.PI * 10) * low;
                A.upper.rotation.x += (-1.2 + 0.3 * kick - A.upper.rotation.x) * (kick + low * 0) + (-0.55 - A.upper.rotation.x) * low;
                A.fore.rotation.x += (-0.9 - A.fore.rotation.x) * low; wmount(H, 2.45 + 0.5 * low);
                B.upper.rotation.x += (-0.85 + crank * 0.3 - B.upper.rotation.x) * low; B.upper.rotation.z = -sz * (0.1 + crank * 0.15) * low; B.fore.rotation.x += (-1.5 + crank * 0.4 - B.fore.rotation.x) * low;
                spine.rotation.x += 0.2 * low - 0.1 * kick; head.rotation.x += 0.35 * low;
            } else if (id === 'change') {   // the change taking hold: doubled over, arms clutched to the chest, shaking
                const v = sm(0, 0.35), sh = Math.sin(t * 55) * 0.07 * v;
                spine.rotation.x += 0.75 * v + sh; head.rotation.x += 0.4 * v - sh;
                for (const [Ar, zs] of [[A, sz], [B, -sz]]) { Ar.upper.rotation.x += (-0.9 - Ar.upper.rotation.x) * v; Ar.upper.rotation.z += (zs * 0.55 - Ar.upper.rotation.z) * v + sh; Ar.fore.rotation.x += (-2.0 - Ar.fore.rotation.x) * v; }
                crouch(0.6 * v);
            } else if (id === 'land') {   // Leaping Strike: arms swept up through the jump, crashing down on landing
                const up = sm(0, 0.35) * (1 - sm(0.6, 0.75)), down = sm(0.6, 0.75) * (1 - sm(0.85, 1));
                for (const Ar of [A, B]) { Ar.upper.rotation.x += (-2.8 - Ar.upper.rotation.x) * up + (-0.6 - Ar.upper.rotation.x) * down; }
                crouch(down * 0.9); spine.rotation.x += 0.4 * down - 0.2 * up;
            }
        }
        // A dodge: dropped low and pitched forward into a tucked dive along the ground, then up again (a full
        // somersault reads badly in a long coat).
        if (rollK != null) {
            const k = Math.min(1, rollK), w = Math.sin(k * Math.PI);
            hips.rotation.x = 0.75 * w;
            body.position.y -= 0.36 * w;
            legs.L.thigh.rotation.x = -1.3 * w; legs.L.shin.rotation.x = 1.9 * w;
            legs.R.thigh.rotation.x = 0.6 * w; legs.R.shin.rotation.x = 0.9 * w;
            for (const Ar of [arms.L, arms.R]) { Ar.upper.rotation.x = -1.0 * w; Ar.fore.rotation.x = -1.5 * w; }
            head.rotation.x = -0.4 * w;
        } else if (hips.rotation.x !== 0) hips.rotation.x = 0;
        M.crystal.emissive.copy(calm).lerp(blaze, blazeK);
        M.crystal.emissiveIntensity = 1.8 + Math.sin(t * 3) * 0.6;

        if (crystal) crystal.rotation.y += dt * 1.5;
    }

    return {
        root, update, setWeapons, setSheathed,
        rig: { hips, spine, head, arms, legs },   // (the joints: the Sculptor poses them)
        get mainType() { return mainType; },
        bladeWorld: (hand, base, tipV) => { const m = hand === 'L' ? offMount : mainMount, tp = hand === 'L' ? offTip : tip; if (!tp) return false; m.getWorldPosition(base); tp.getWorldPosition(tipV); return true; },
        crystalWorld: (v, hand = 'R') => (hand === 'L' ? (offTip ?? arms.L.fore) : (tip ?? arms.R.fore)).getWorldPosition(v),
    };
}
