// Torso garments. Each part adds its own cloth over the bare chest, so torso items can be
// swapped independently of legs, feet, arms, waist, back and shoulders.
import * as THREE from 'three';

const chest = () => {
    const g = new THREE.CylinderGeometry(0.215, 0.18, 0.56, 10);
    g.translate(0, 0.28, 0);
    g.scale(1, 1, 0.74);
    return g;
};

function throat(ctx) {
    const t = ctx.add(ctx.spine, new THREE.ConeGeometry(0.06, 0.13, 3), ctx.mats.skin, 0, 0.5, 0.135);
    t.rotation.x = Math.PI;
}

function skirt(ctx, { open, len, material, trim, hem = false }) {
    const fl = Math.PI * (0.5 + (0.11 - open));
    const flapL = ctx.makePanel(Math.PI * open, fl, len, material);
    const flapR = ctx.makePanel(Math.PI * 2 - Math.PI * open - fl, fl, len, material);
    const back = ctx.makePanel(Math.PI * 0.61, Math.PI * 0.78, len + 0.02, material);
    for (const p of [flapL, flapR, back]) { p.joint.position.y = 0.04; ctx.hips.add(p.joint); }
    if (hem && trim) {
        for (const [p, th] of [[flapL, Math.PI * 0.11], [flapR, Math.PI * 1.89]]) {
            const edge = ctx.add(p.joint, new THREE.BoxGeometry(0.025, len, 0.025), trim, 0, -len / 2, 0);
            edge.position.set(Math.sin(th) * 0.26, -len / 2, Math.cos(th) * 0.26);
            edge.rotation.x = -0.14 * Math.sign(Math.cos(th));
        }
    }
    ctx.onUpdate(({ t, amp, run, air, legs }) => {
        flapL.joint.rotation.x = Math.min(0.2, legs.L.thigh.rotation.x * 0.8) - air * 0.3;
        flapR.joint.rotation.x = Math.min(0.2, legs.R.thigh.rotation.x * 0.8) - air * 0.3;
        back.joint.rotation.x = 0.04 + amp * 0.22 + run * 0.35 + air * 0.35 + Math.sin(t * 3.1) * 0.02;
        ctx.ripple(back, 0.4 + amp, t, amp);
    });
}

function straps(ctx, leather, gold) {
    for (const s of [1, -1]) {
        const strap = ctx.add(ctx.spine, new THREE.BoxGeometry(0.035, 0.6, 0.02), leather, s * 0.02, 0.29, 0.16);
        strap.rotation.z = s * 0.55;
        ctx.add(ctx.spine, new THREE.BoxGeometry(0.035, 0.03, 0.025), gold, s * 0.07, 0.36, 0.172);
    }
}

export const TORSO = [
    {
        id: 'longcoat', label: 'Longcoat',
        colors: { primary: '#a3141f', collar: '#7a0f17', trim: '#d4a84a', vest: '#1c1714', shirt: '#16120f' },
        build(ctx) {
            const { colors } = ctx;
            const coat = ctx.mat(colors.primary, { side: THREE.DoubleSide, roughness: 0.75 });
            const dark = ctx.mat(colors.collar, { side: THREE.DoubleSide });
            const gold = ctx.mat(colors.trim, { metalness: 0.7, roughness: 0.35 });
            const vest = ctx.mat(colors.vest, { roughness: 0.6 });
            ctx.add(ctx.spine, chest(), coat);
            ctx.spine.add(ctx.mesh(new THREE.BoxGeometry(0.17, 0.46, 0.06), vest, 0, 0.27, 0.125));
            for (const [y, w] of [[0.16, 0.12], [0.26, 0.1], [0.36, 0.12], [0.44, 0.08]]) {
                ctx.add(ctx.spine, new THREE.BoxGeometry(w, 0.012, 0.01), gold, 0, y, 0.158);
            }
            ctx.add(ctx.spine, new THREE.BoxGeometry(0.012, 0.36, 0.01), gold, 0, 0.28, 0.158);
            throat(ctx);
            for (const s of [1, -1]) {
                const lapel = ctx.add(ctx.spine, new THREE.BoxGeometry(0.07, 0.36, 0.03), coat, s * 0.1, 0.33, 0.135);
                lapel.rotation.z = s * 0.28;
                const trim = ctx.add(ctx.spine, new THREE.BoxGeometry(0.012, 0.37, 0.012), gold, s * 0.073, 0.33, 0.152);
                trim.rotation.z = s * 0.28;
                const collar = ctx.add(ctx.spine, new THREE.BoxGeometry(0.15, 0.17, 0.03), dark, s * 0.09, 0.62, -0.02);
                collar.rotation.set(-0.25, s * 0.9, s * -0.25);
                const ce = ctx.add(ctx.spine, new THREE.BoxGeometry(0.15, 0.012, 0.035), gold, s * 0.095, 0.705, -0.04);
                ce.rotation.set(-0.25, s * 0.9, s * -0.25);
            }
            const back = ctx.add(ctx.spine, new THREE.BoxGeometry(0.2, 0.18, 0.03), dark, 0, 0.63, -0.1);
            back.rotation.x = -0.3;
            straps(ctx, ctx.mat(colors.leather, { roughness: 0.8 }), gold);
            skirt(ctx, { open: 0.11, len: 0.78, material: coat, trim: gold, hem: true });
        },
    },
    {
        id: 'robe', label: 'Robe',
        colors: { primary: '#3a2a5a', collar: '#241a3a', trim: '#d4a84a', vest: '#1c1714', shirt: '#16120f' },
        build(ctx) {
            const { colors } = ctx;
            const coat = ctx.mat(colors.primary, { side: THREE.DoubleSide, roughness: 0.85 });
            ctx.add(ctx.spine, chest(), coat);
            throat(ctx);
            skirt(ctx, { open: 0.0, len: 0.93, material: coat });
        },
    },
    {
        id: 'tunic', label: 'Tunic',
        colors: { primary: '#6a5a4a', collar: '#3a2a1a', trim: '#b89a5a', vest: '#2a2420', shirt: '#d8d0c0' },
        build(ctx) {
            const { colors } = ctx;
            const coat = ctx.mat(colors.primary, { side: THREE.DoubleSide, roughness: 0.85 });
            const leather = ctx.mat(colors.collar, { roughness: 0.8 });
            const gold = ctx.mat(colors.trim, { metalness: 0.55, roughness: 0.4 });
            ctx.add(ctx.spine, chest(), coat);
            throat(ctx);
            straps(ctx, leather, gold);
            skirt(ctx, { open: 0.02, len: 0.44, material: coat });
        },
    },
    {
        id: 'armour', label: 'Armour',
        colors: { primary: '#3a3f4a', collar: '#22262e', trim: '#d4a84a', steel: '#9aa0a8' },
        build(ctx) {
            const { colors } = ctx;
            const coat = ctx.mat(colors.primary, { side: THREE.DoubleSide, roughness: 0.8 });
            const steel = ctx.mat(colors.steel, { metalness: 0.75, roughness: 0.35 });
            const gold = ctx.mat(colors.trim, { metalness: 0.7, roughness: 0.35 });
            ctx.add(ctx.spine, chest(), coat);
            const plate = ctx.add(ctx.spine, new THREE.CylinderGeometry(0.225, 0.19, 0.42, 10, 1, false, -Math.PI * 0.45, Math.PI * 0.9), steel, 0, 0.32, 0.005);
            plate.scale.set(1, 1, 0.8);
            ctx.add(ctx.spine, new THREE.BoxGeometry(0.03, 0.4, 0.02), gold, 0, 0.32, 0.175);
            throat(ctx);
            skirt(ctx, { open: 0.02, len: 0.4, material: coat });
        },
    },
    {
        id: 'linen', label: 'Linen shirt',
        colors: { primary: '#d8ccb0', collar: '#c4b896', trim: '#c4b896', shirt: '#d8ccb0' },
        build(ctx) {
            const shirt = ctx.mat(ctx.colors.primary, { roughness: 0.9 });
            ctx.add(ctx.spine, chest(), shirt);
            ctx.add(ctx.spine, new THREE.BoxGeometry(0.008, 0.12, 0.008), ctx.mat(ctx.colors.collar), 0, 0.47, 0.142);
        },
    },
    {
        id: 'peasant_shirt', label: 'Peasant shirt',
        colors: { primary: '#b9a27a', collar: '#8a7654', trim: '#6a5a42', shirt: '#b9a27a' },
        build(ctx) {
            const { colors } = ctx;
            const shirt = ctx.mat(colors.primary, { side: THREE.DoubleSide, roughness: 0.95 });
            const dark = ctx.mat(colors.collar, { roughness: 0.9 });
            ctx.add(ctx.spine, chest(), shirt);
            ctx.add(ctx.spine, new THREE.BoxGeometry(0.03, 0.42, 0.02), dark, 0, 0.3, 0.145);
            ctx.add(ctx.spine, new THREE.BoxGeometry(0.12, 0.035, 0.02), dark, 0, 0.48, 0.145);
            skirt(ctx, { open: 0.0, len: 0.34, material: shirt });
        },
    },
];
