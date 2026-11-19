// Shoulder wear.
import * as THREE from 'three';

export const SHOULDERS = [
    {
        id: 'pauldron', label: 'Leather pauldron',
        colors: { primary: '#3e2416', trim: '#d4a84a' },
        build(ctx) {
            const leather = ctx.mat(ctx.colors.primary, { roughness: 0.8 });
            const gold = ctx.mat(ctx.colors.trim, { metalness: 0.7, roughness: 0.35 });
            const pauldron = ctx.add(ctx.spine, new THREE.SphereGeometry(0.1, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), leather, 0.24, 0.53, 0);
            pauldron.scale.set(1, 0.7, 1.1);
            ctx.add(ctx.spine, new THREE.TorusGeometry(0.06, 0.012, 4, 10), gold, 0.25, 0.55, 0.05);
        },
    },
    {
        id: 'steel_pauldrons', label: 'Steel pauldrons',
        colors: { primary: '#9aa0a8', trim: '#d4a84a' },
        build(ctx) {
            const steel = ctx.mat(ctx.colors.primary, { metalness: 0.75, roughness: 0.35 });
            const gold = ctx.mat(ctx.colors.trim, { metalness: 0.7, roughness: 0.35 });
            for (const sg of [1, -1]) {
                const pd = ctx.add(ctx.spine, new THREE.SphereGeometry(0.12, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), steel, sg * 0.25, 0.52, 0);
                pd.scale.set(1.05, 0.75, 1.1);
                pd.rotation.z = -sg * 0.3;
                ctx.add(ctx.spine, new THREE.TorusGeometry(0.09, 0.01, 4, 12), gold, sg * 0.25, 0.57, 0.02);
            }
        },
    },
    {
        id: 'fur_mantle', label: 'Fur mantle',
        colors: { primary: '#6a5a48', trim: '#c8b48a' },
        build(ctx) {   // a thick fur collar across the shoulders, clasped at the front
            const fur = ctx.mat(ctx.colors.primary, { roughness: 1 });
            const m = ctx.add(ctx.spine, new THREE.TorusGeometry(0.2, 0.075, 6, 16), fur, 0, 0.55, -0.01); m.rotation.x = Math.PI / 2; m.scale.set(1.25, 1, 1);
            ctx.add(ctx.spine, new THREE.SphereGeometry(0.025, 6, 4), ctx.mat(ctx.colors.trim, { metalness: 0.7 }), 0, 0.53, 0.18);
        },
    },
    { id: 'none', label: 'None', build() {} },
];
