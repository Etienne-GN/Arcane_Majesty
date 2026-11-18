// Armwear, added over the bare arms.
import * as THREE from 'three';

const hose = (rTop, rBot, len) => new THREE.CylinderGeometry(rTop, rBot, len, 8).translate(0, -len / 2, 0);

function sleeves(ctx, m) {
    for (const side of ['L', 'R']) {
        const { upper, fore } = ctx.arms[side];
        ctx.add(upper, hose(0.075, 0.062, 0.31), m);
        ctx.add(fore, hose(0.062, 0.052, 0.29), m);
        const shoulder = ctx.add(upper, new THREE.SphereGeometry(0.084, 8, 6), m);
        shoulder.scale.set(1, 0.9, 1);
    }
}

export const ARMS = [
    {
        id: 'sleeves', label: 'Sleeves',
        build(ctx) {
            sleeves(ctx, ctx.mat(ctx.colors.primary ?? ctx.torsoPrimary, { side: THREE.DoubleSide, roughness: 0.85 }));
        },
    },
    {
        id: 'bracers', label: 'Bracers',
        colors: { primary: '#5a3520', trim: '#d4a84a', sleeve: '#a3141f' },
        build(ctx) {
            sleeves(ctx, ctx.mat(ctx.colors.sleeve ?? ctx.torsoPrimary, { side: THREE.DoubleSide, roughness: 0.85 }));
            const leather = ctx.mat(ctx.colors.primary, { roughness: 0.8 });
            const gold = ctx.mat(ctx.colors.trim, { metalness: 0.7, roughness: 0.35 });
            for (const side of ['L', 'R']) {
                const fore = ctx.arms[side].fore;
                ctx.add(fore, new THREE.CylinderGeometry(0.064, 0.058, 0.17, 8), leather, 0, -0.18, 0);
                for (const y of [-0.1, -0.18, -0.26]) {
                    ctx.add(fore, new THREE.CylinderGeometry(0.066, 0.066, 0.014, 8), gold, 0, y, 0);
                }
            }
        },
    },
    { id: 'bare', label: 'Bare', build() {} },
    { id: 'none', label: 'None', build() {} },
];
