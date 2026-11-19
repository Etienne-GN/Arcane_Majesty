// Headgear: hoods, hats, helmets.
import * as THREE from 'three';

export const HEADGEAR = [
    {
        id: 'hood', label: 'Hood',
        colors: { primary: '#241c4a' },
        build(ctx) {
            const m = ctx.mat(ctx.colors.primary, { side: THREE.DoubleSide });
            ctx.add(ctx.head, new THREE.SphereGeometry(0.165, 12, 8, Math.PI * 0.78, Math.PI * 1.44, 0, Math.PI * 0.66), m, 0, 0.13, -0.01);
            const tip = ctx.add(ctx.head, new THREE.ConeGeometry(0.08, 0.18, 6), m, 0, 0.2, -0.14);
            tip.rotation.x = -1.1;
        },
    },
    {
        id: 'wide_hat', label: 'Wide-brim hat',
        colors: { primary: '#3a2a1a', trim: '#d4a84a' },
        build(ctx) {
            const m = ctx.mat(ctx.colors.primary, { roughness: 0.7 });
            ctx.add(ctx.head, new THREE.CylinderGeometry(0.27, 0.27, 0.02, 18), m, 0, 0.235, 0);
            ctx.add(ctx.head, new THREE.CylinderGeometry(0.11, 0.13, 0.13, 12), m, 0, 0.3, 0);
            ctx.add(ctx.head, new THREE.CylinderGeometry(0.132, 0.132, 0.025, 12), ctx.mat(ctx.colors.trim, { metalness: 0.4 }), 0, 0.255, 0);
        },
    },
    {
        id: 'wizard_hat', label: 'Wizard hat',
        colors: { primary: '#2a2350', trim: '#ffcf6a' },
        build(ctx) {
            const felt = ctx.mat(ctx.colors.primary, { roughness: 0.5 });
            const band = ctx.mat(ctx.darker(ctx.colors.primary, 0.55), { roughness: 0.6 });
            const star = new THREE.MeshStandardMaterial({ color: 0xffe6a0, emissive: ctx.colors.trim, emissiveIntensity: 1.8, roughness: 0.4 });
            ctx.add(ctx.head, new THREE.CylinderGeometry(0.17, 0.3, 0.026, 20), felt, 0, 0.225, 0);
            const crown = new THREE.Group();
            crown.position.set(0, 0.2, 0);
            crown.rotation.set(-0.18, 0, 0);
            ctx.head.add(crown);
            ctx.add(crown, new THREE.ConeGeometry(0.175, 0.39, 16), felt, 0, 0.195, 0);
            ctx.add(crown, new THREE.CylinderGeometry(0.177, 0.179, 0.045, 16), band, 0, 0.022, 0);
            for (const [ang, h] of [[0.4, 0.1], [2.1, 0.19], [3.9, 0.14], [5.2, 0.24], [1.2, 0.28]]) {
                const r = 0.175 * (1 - h / 0.39) + 0.005;
                ctx.add(crown, new THREE.SphereGeometry(0.011, 5, 4), star, Math.sin(ang) * r, h, Math.cos(ang) * r);
            }
        },
    },
    {
        id: 'helmet', label: 'Helmet',
        colors: { primary: '#9aa0a8', trim: '#6a7078' },
        build(ctx) {
            const steel = ctx.mat(ctx.colors.primary, { metalness: 0.55, roughness: 0.45 });
            const trim = ctx.mat(ctx.colors.trim, { metalness: 0.5, roughness: 0.5 });
            const cap = ctx.add(ctx.head, new THREE.SphereGeometry(0.15, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), steel, 0, 0.14, 0);
            cap.scale.set(1, 1.08, 1.05);
            ctx.add(ctx.head, new THREE.TorusGeometry(0.148, 0.014, 4, 16).rotateX(Math.PI / 2), trim, 0, 0.165, 0);
            ctx.add(ctx.head, new THREE.BoxGeometry(0.025, 0.09, 0.02), steel, 0, 0.13, 0.15);
        },
    },
    {
        id: 'circlet', label: 'Circlet',
        colors: { primary: '#e8c878', trim: '#7ff5e6' },
        build(ctx) {   // a thin gold band round the brow with a gem at the front
            ctx.add(ctx.head, new THREE.TorusGeometry(0.128, 0.008, 4, 20).rotateX(Math.PI / 2), ctx.mat(ctx.colors.primary, { metalness: 0.8, roughness: 0.25 }), 0, 0.19, 0.005);
            const g = ctx.add(ctx.head, new THREE.OctahedronGeometry(0.016, 0), new THREE.MeshStandardMaterial({ color: ctx.colors.trim, emissive: ctx.colors.trim, emissiveIntensity: 0.9 }), 0, 0.19, 0.13); g.scale.y = 1.4;
        },
    },
    {
        id: 'crown', label: 'Crown',
        colors: { primary: '#e8c050', trim: '#c8203a' },
        build(ctx) {   // a gold crown: a band, points, gems
            const gold = ctx.mat(ctx.colors.primary, { metalness: 0.85, roughness: 0.25 }), gem = new THREE.MeshStandardMaterial({ color: ctx.colors.trim, emissive: ctx.colors.trim, emissiveIntensity: 0.5, metalness: 0.3 });
            ctx.add(ctx.head, new THREE.CylinderGeometry(0.135, 0.13, 0.05, 16, 1, true), gold, 0, 0.23, 0);
            for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; ctx.add(ctx.head, new THREE.ConeGeometry(0.02, 0.06, 4), gold, Math.sin(a) * 0.13, 0.28, Math.cos(a) * 0.13); if (i % 2 === 0) ctx.add(ctx.head, new THREE.SphereGeometry(0.012, 5, 4), gem, Math.sin(a) * 0.136, 0.23, Math.cos(a) * 0.136); }
        },
    },
    {
        id: 'coif', label: 'Mail coif',
        colors: { primary: '#8a8e96' },
        build(ctx) {   // a hood of mail framing the face, falling over the shoulders
            const mail = ctx.mat(ctx.colors.primary, { side: THREE.DoubleSide, metalness: 0.7, roughness: 0.55 });
            ctx.add(ctx.head, new THREE.SphereGeometry(0.155, 12, 8, Math.PI * 0.72, Math.PI * 1.56, 0, Math.PI * 0.62), mail, 0, 0.13, -0.005);
            ctx.add(ctx.head, new THREE.CylinderGeometry(0.15, 0.2, 0.12, 12, 1, true), mail, 0, -0.01, -0.01);
        },
    },
    {
        id: 'great_helm', label: 'Great helm',
        colors: { primary: '#a8acb4', trim: '#d4a84a' },
        build(ctx) {   // a flat-topped barrel helm with an eye slit and a gold cross on the face
            const steel = ctx.mat(ctx.colors.primary, { metalness: 0.8, roughness: 0.3 }), gold = ctx.mat(ctx.colors.trim, { metalness: 0.75, roughness: 0.3 });
            ctx.add(ctx.head, new THREE.CylinderGeometry(0.15, 0.155, 0.3, 12), steel, 0, 0.12, 0.005);
            ctx.add(ctx.head, new THREE.CylinderGeometry(0.15, 0.15, 0.02, 12), steel, 0, 0.275, 0.005);
            ctx.add(ctx.head, new THREE.BoxGeometry(0.2, 0.018, 0.02), new THREE.MeshBasicMaterial({ color: 0x0a0a0a }), 0, 0.16, 0.15);
            ctx.add(ctx.head, new THREE.BoxGeometry(0.02, 0.2, 0.012), gold, 0, 0.09, 0.158); ctx.add(ctx.head, new THREE.BoxGeometry(0.12, 0.02, 0.012), gold, 0, 0.06, 0.158);
        },
    },
    {
        id: 'feathered_cap', label: 'Feathered cap',
        colors: { primary: '#2a5a3a', trim: '#e8e0d0' },
        build(ctx) {   // a soft brimmed cap tilted to one side, with a long feather
            const felt = ctx.mat(ctx.colors.primary, { roughness: 0.85 });
            const cap = ctx.add(ctx.head, new THREE.CylinderGeometry(0.12, 0.15, 0.08, 14), felt, 0.02, 0.25, 0); cap.rotation.z = -0.15;
            const brim = ctx.add(ctx.head, new THREE.CylinderGeometry(0.19, 0.19, 0.015, 16), felt, 0.02, 0.215, 0.02); brim.rotation.set(0.1, 0, -0.15);
            const f = ctx.add(ctx.head, new THREE.ConeGeometry(0.02, 0.3, 4), ctx.mat(ctx.colors.trim, { roughness: 0.9 }), -0.1, 0.36, -0.06); f.rotation.set(-0.5, 0, 0.6); f.scale.z = 0.3;
        },
    },
    { id: 'none', label: 'None', build() {} },
];
