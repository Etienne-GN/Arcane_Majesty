// Waist wear: belts, sashes, nothing.
import * as THREE from 'three';

export const WAIST = [
    {
        id: 'belt', label: 'Belt',
        colors: { primary: '#5a3520', trim: '#d4a84a', dark: '#3e2416' },
        build(ctx) {
            const leather = ctx.mat(ctx.colors.primary, { roughness: 0.8 });
            const gold = ctx.mat(ctx.colors.trim, { metalness: 0.7, roughness: 0.35 });
            const dark = ctx.mat(ctx.colors.dark, { roughness: 0.8 });
            ctx.add(ctx.spine, new THREE.CylinderGeometry(0.192, 0.19, 0.08, 10), leather, 0, 0.02, 0);
            ctx.add(ctx.spine, new THREE.BoxGeometry(0.075, 0.075, 0.02), gold, 0, 0.02, 0.148);
            ctx.add(ctx.spine, new THREE.BoxGeometry(0.045, 0.045, 0.022), dark, 0, 0.02, 0.15);
        },
    },
    {
        id: 'sash', label: 'Sash',
        colors: { primary: '#241a3a', trim: '#d4a84a' },
        build(ctx) {
            const cloth = ctx.mat(ctx.colors.primary, { roughness: 0.9 });
            ctx.add(ctx.spine, new THREE.CylinderGeometry(0.192, 0.19, 0.11, 10), cloth, 0, 0.02, 0);
            const tail = ctx.add(ctx.spine, new THREE.BoxGeometry(0.06, 0.3, 0.015), cloth, 0.08, -0.12, 0.17);
            tail.rotation.z = 0.08;
        },
    },
    { id: 'none', label: 'None', build() {} },
];
