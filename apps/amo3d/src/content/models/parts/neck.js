// Neck wear.
import * as THREE from 'three';

export const NECK = [
    {
        id: 'scarf', label: 'Scarf',
        colors: { primary: '#7a2a2a', trim: '#c8a050' },
        build(ctx) {
            const cloth = ctx.mat(ctx.colors.primary, { roughness: 0.95 });
            const trim = ctx.mat(ctx.colors.trim, { roughness: 0.8 });
            const ring = ctx.add(ctx.spine, new THREE.TorusGeometry(0.075, 0.022, 5, 12).rotateX(Math.PI / 2), cloth, 0, 0.58, 0);
            ring.scale.z = 0.9;
            const tail = ctx.add(ctx.spine, new THREE.BoxGeometry(0.055, 0.2, 0.018), cloth, 0.055, 0.47, 0.12);
            tail.rotation.z = -0.12;
            ctx.add(ctx.spine, new THREE.BoxGeometry(0.058, 0.02, 0.022), trim, 0.055, 0.38, 0.12);
        },
    },
    {
        id: 'necklace', label: 'Necklace',
        colors: { primary: '#d4a84a', trim: '#7ff5e6' },
        build(ctx) {
            const gold = ctx.mat(ctx.colors.primary, { metalness: 0.8, roughness: 0.3 });
            const gem = new THREE.MeshStandardMaterial({ color: ctx.colors.trim, emissive: ctx.colors.trim, emissiveIntensity: 0.6, roughness: 0.25 });
            const chain = ctx.add(ctx.spine, new THREE.TorusGeometry(0.065, 0.005, 4, 14).rotateX(Math.PI / 2), gold, 0, 0.55, 0.025);
            chain.scale.z = 0.75;
            ctx.add(ctx.spine, new THREE.OctahedronGeometry(0.022), gem, 0, 0.49, 0.085);
        },
    },
    { id: 'none', label: 'None', build() {} },
];
