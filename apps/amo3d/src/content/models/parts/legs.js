// Legwear, added over the bare legs.
import * as THREE from 'three';

const hose = (rTop, rBot, len) => new THREE.CylinderGeometry(rTop, rBot, len, 7).translate(0, -len / 2, 0);

export const LEGS = [
    {
        id: 'trousers', label: 'Trousers',
        colors: { primary: '#221c18', dark: '#221c18' },
        build(ctx) {
            const m = ctx.mat(ctx.colors.primary, { roughness: 0.9 });
            const dark = ctx.mat(ctx.colors.dark, { roughness: 0.9 });
            for (const side of ['L', 'R']) {
                const { thigh, shin } = ctx.legs[side];
                ctx.add(thigh, hose(0.092, 0.076, 0.45), m);
                ctx.add(shin, hose(0.076, 0.062, 0.45), m, 0, -0.002, 0);
                ctx.add(shin, new THREE.CylinderGeometry(0.078, 0.078, 0.025, 7), dark, 0, -0.42, 0);
            }
        },
    },
    {
        id: 'linen_trousers', label: 'Linen trousers',
        colors: { primary: '#cfc2a4', dark: '#9a8e74' },
        build(ctx) {
            const m = ctx.mat(ctx.colors.primary, { roughness: 0.95 });
            const dark = ctx.mat(ctx.colors.dark, { roughness: 0.95 });
            for (const side of ['L', 'R']) {
                const { thigh, shin } = ctx.legs[side];
                ctx.add(thigh, hose(0.092, 0.076, 0.45), m);
                ctx.add(shin, new THREE.CylinderGeometry(0.082, 0.078, 0.16, 7), m, 0, -0.06, 0);
                ctx.add(shin, new THREE.CylinderGeometry(0.084, 0.084, 0.02, 7), dark, 0, -0.14, 0);
            }
        },
    },
    {
        id: 'skirt', label: 'Skirt',
        colors: { primary: '#6a4a7a', trim: '#b89a5a' },
        build(ctx) {
            const m = ctx.mat(ctx.colors.primary, { side: THREE.DoubleSide, roughness: 0.9 });
            const trim = ctx.mat(ctx.colors.trim, { roughness: 0.7 });
            const g = new THREE.CylinderGeometry(0.17, 0.29, 0.42, 12, 1, true).translate(0, -0.21, 0);
            ctx.add(ctx.hips, g, m, 0, 0.02, 0);
            const hem = ctx.add(ctx.hips, new THREE.TorusGeometry(0.286, 0.012, 4, 16).rotateX(Math.PI / 2), trim, 0, -0.39, 0);
            hem.scale.z = 0.9;
        },
    },
    { id: 'none', label: 'None', build() {} },
];
