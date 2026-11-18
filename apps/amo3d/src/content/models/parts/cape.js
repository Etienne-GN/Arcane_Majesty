// Cloaks and capes.
import * as THREE from 'three';

export const CAPE = [
    {
        id: 'travelling_cloak', label: 'Travelling cloak',
        colors: { primary: '#2a1a2a', trim: '#d4a84a' },
        build(ctx) {
            const cloth = ctx.mat(ctx.colors.primary, { side: THREE.DoubleSide, roughness: 0.9 });
            const gold = ctx.mat(ctx.colors.trim, { metalness: 0.7, roughness: 0.35 });
            const cape = new THREE.Group();
            cape.position.set(0, 0.56, -0.17);
            ctx.spine.add(cape);
            const g = new THREE.PlaneGeometry(0.52, 1.15, 2, 6).translate(0, -0.575, 0);
            ctx.add(cape, g, cloth);
            ctx.add(cape, new THREE.BoxGeometry(0.5, 0.04, 0.03), gold, 0, 0, 0.01);
            ctx.onUpdate(({ t, amp, run, air }) => {
                cape.rotation.x = 0.06 + amp * 0.3 + run * 0.45 + air * 0.4 + Math.sin(t * 2.7) * 0.03;
            });
        },
    },
    { id: 'none', label: 'None', build() {} },
];
