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
    {
        id: 'sandals', label: 'Sandals',
        colors: { primary: '#8a6a44' },
        build(ctx) {   // bare feet on a leather sole, straps across
            const lea = ctx.mat(ctx.colors.primary, { roughness: 0.8 });
            for (const side of ['L', 'R']) { const shin = ctx.legs[side].shin;
                ctx.add(shin, new THREE.BoxGeometry(0.1, 0.05, 0.22), ctx.mats.skin, 0, -0.455, 0.04);
                ctx.add(shin, new THREE.BoxGeometry(0.11, 0.02, 0.24), lea, 0, -0.49, 0.04);
                for (const z of [-0.02, 0.08]) ctx.add(shin, new THREE.BoxGeometry(0.112, 0.012, 0.02), lea, 0, -0.44, z);
                ctx.add(shin, new THREE.CylinderGeometry(0.06, 0.06, 0.012, 7), lea, 0, -0.38, 0); }
        },
    },
    {
        id: 'riding_boots', label: 'Riding boots',
        colors: { primary: '#2a1e16', dark: '#1a120c' },
        build(ctx) {   // tall glossy boots to the knee with a turned-down cuff
            const m = ctx.mat(ctx.colors.primary, { roughness: 0.4 }), dark = ctx.mat(ctx.colors.dark, { roughness: 0.4 });
            for (const side of ['L', 'R']) { const shin = ctx.legs[side].shin;
                ctx.add(shin, new THREE.CylinderGeometry(0.082, 0.07, 0.44, 8), m, 0, -0.2, 0);
                ctx.add(shin, new THREE.CylinderGeometry(0.09, 0.088, 0.06, 8), dark, 0, 0.02, 0);
                ctx.add(shin, new THREE.BoxGeometry(0.12, 0.09, 0.27), m, 0, -0.45, 0.05);
                ctx.add(shin, new THREE.BoxGeometry(0.12, 0.03, 0.08), dark, 0, -0.485, -0.06); }
        },
    },
    {
        id: 'sabatons', label: 'Sabatons',
        colors: { primary: '#a8acb4' },
        build(ctx) {   // steel foot armour in overlapping lames, greaves up the shin
            const steel = ctx.mat(ctx.colors.primary, { metalness: 0.8, roughness: 0.3 });
            for (const side of ['L', 'R']) { const shin = ctx.legs[side].shin;
                ctx.add(shin, new THREE.CylinderGeometry(0.08, 0.072, 0.4, 8), steel, 0, -0.22, 0);
                for (let i = 0; i < 4; i++) ctx.add(shin, new THREE.BoxGeometry(0.13 - i * 0.008, 0.06, 0.07), steel, 0, -0.46 + i * 0.006, 0.12 - i * 0.055); }
        },
    },
    { id: 'none', label: 'None', build() {} },
];
