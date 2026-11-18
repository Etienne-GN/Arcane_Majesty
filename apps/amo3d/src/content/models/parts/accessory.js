// Small face accessories.
import * as THREE from 'three';

export const ACCESSORY = [
    {
        id: 'eyepatch', label: 'Eyepatch',
        colors: { primary: '#15110e', trim: '#3a2a1a' },
        build(ctx) {
            const patch = ctx.mat(ctx.colors.primary, { roughness: 0.9 });
            const strap = ctx.mat(ctx.colors.trim, { roughness: 0.9 });
            const p = ctx.add(ctx.head, new THREE.BoxGeometry(0.058, 0.046, 0.012), patch, -0.042, 0.15, 0.112);
            p.rotation.z = -0.08;
            const band = ctx.add(ctx.head, new THREE.TorusGeometry(0.124, 0.008, 4, 16).rotateX(Math.PI / 2), strap, 0, 0.158, 0);
            band.scale.z = 0.86;
        },
    },
    {
        id: 'earrings', label: 'Earrings',
        colors: { primary: '#d4a84a', trim: '#7ff5e6' },
        build(ctx) {
            const gold = ctx.mat(ctx.colors.primary, { metalness: 0.8, roughness: 0.3 });
            const gem = new THREE.MeshStandardMaterial({ color: ctx.colors.trim, emissive: ctx.colors.trim, emissiveIntensity: 0.4, roughness: 0.3 });
            for (const s of [1, -1]) {
                ctx.add(ctx.head, new THREE.TorusGeometry(0.012, 0.004, 4, 8), gold, s * 0.112, 0.105, -0.005);
                ctx.add(ctx.head, new THREE.OctahedronGeometry(0.012), gem, s * 0.112, 0.08, -0.005);
            }
        },
    },
    { id: 'none', label: 'None', build() {} },
];
