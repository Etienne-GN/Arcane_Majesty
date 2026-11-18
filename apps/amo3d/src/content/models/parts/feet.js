// Footwear. The bare body has no foot mesh, so every option (including bare) adds one.
import * as THREE from 'three';

export const FEET = [
    {
        id: 'bare', label: 'Bare',
        build(ctx) {
            for (const side of ['L', 'R']) ctx.add(ctx.legs[side].shin, new THREE.BoxGeometry(0.1, 0.06, 0.22), ctx.mats.skin, 0, -0.46, 0.04);
        },
    },
    {
        id: 'boots', label: 'Boots',
        colors: { primary: '#5a3520', dark: '#3e2416' },
        build(ctx) {
            const m = ctx.mat(ctx.colors.primary, { roughness: 0.8 });
            const dark = ctx.mat(ctx.colors.dark, { roughness: 0.8 });
            for (const side of ['L', 'R']) {
                const shin = ctx.legs[side].shin;
                ctx.add(shin, new THREE.CylinderGeometry(0.08, 0.072, 0.3, 7), m, 0, -0.27, 0);
                ctx.add(shin, new THREE.CylinderGeometry(0.085, 0.085, 0.04, 7), dark, 0, -0.12, 0);
                ctx.add(shin, new THREE.BoxGeometry(0.13, 0.1, 0.26), dark, 0, -0.45, 0.04);
            }
        },
    },
    {
        id: 'shoes', label: 'Shoes',
        colors: { primary: '#4a3020', dark: '#2a1a10' },
        build(ctx) {
            const m = ctx.mat(ctx.colors.primary, { roughness: 0.7 });
            const dark = ctx.mat(ctx.colors.dark, { roughness: 0.7 });
            for (const side of ['L', 'R']) {
                const shin = ctx.legs[side].shin;
                ctx.add(shin, new THREE.CylinderGeometry(0.082, 0.078, 0.07, 7), m, 0, -0.4, 0);
                ctx.add(shin, new THREE.BoxGeometry(0.115, 0.075, 0.24), m, 0, -0.455, 0.04);
                ctx.add(shin, new THREE.BoxGeometry(0.118, 0.018, 0.245), dark, 0, -0.495, 0.04);
            }
        },
    },
    { id: 'none', label: 'None', build() {} },
];
