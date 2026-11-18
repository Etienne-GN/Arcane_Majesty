// Things worn on the back.
import * as THREE from 'three';

export const BACK = [
    {
        id: 'satchel', label: 'Satchel',
        colors: { primary: '#5a3520', dark: '#3e2416', trim: '#d4a84a' },
        build(ctx) {
            const leather = ctx.mat(ctx.colors.primary, { roughness: 0.8 });
            const dark = ctx.mat(ctx.colors.dark, { roughness: 0.8 });
            const gold = ctx.mat(ctx.colors.trim, { metalness: 0.7, roughness: 0.35 });
            const satchel = new THREE.Group();
            satchel.position.set(0.13, -0.07, 0.13);
            satchel.rotation.y = 0.5;
            ctx.spine.add(satchel);
            ctx.add(satchel, new THREE.BoxGeometry(0.17, 0.15, 0.07), leather);
            ctx.add(satchel, new THREE.BoxGeometry(0.175, 0.08, 0.075), dark, 0, 0.04, 0.005);
            ctx.add(satchel, new THREE.BoxGeometry(0.03, 0.05, 0.02), gold, 0, 0.01, 0.045);
        },
    },
    {
        id: 'backpack', label: 'Backpack',
        colors: { primary: '#5a4a32', dark: '#3a2e1e', trim: '#b89a5a' },
        build(ctx) {
            const cloth = ctx.mat(ctx.colors.primary, { roughness: 0.95 });
            const dark = ctx.mat(ctx.colors.dark, { roughness: 0.9 });
            const leather = ctx.mat(ctx.colors.trim, { roughness: 0.8 });
            const pack = new THREE.Group();
            pack.position.set(0, 0.06, -0.2);
            ctx.spine.add(pack);
            ctx.add(pack, new THREE.BoxGeometry(0.3, 0.36, 0.16), cloth);
            ctx.add(pack, new THREE.BoxGeometry(0.31, 0.1, 0.17), dark, 0, 0.16, 0);
            const roll = ctx.add(pack, new THREE.CylinderGeometry(0.07, 0.07, 0.32, 8), leather, 0, 0.23, 0);
            roll.rotation.z = Math.PI / 2;
            for (const s of [1, -1]) {
                ctx.add(ctx.spine, new THREE.BoxGeometry(0.025, 0.42, 0.015), leather, s * 0.12, 0.33, 0.145);
            }
        },
    },
    { id: 'none', label: 'None', build() {} },
];
