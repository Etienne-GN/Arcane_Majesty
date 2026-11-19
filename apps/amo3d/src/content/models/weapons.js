// Weapon models, built in code — one per amo weapon type. Each is a group whose grip sits at the
// origin and whose length runs along +y (the hand mounts tilt it). `tip` marks where spells leave.
import * as THREE from 'three';

const mat = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.6, ...opts });
const STEEL = () => mat(0xc9ccd2, { metalness: 0.75, roughness: 0.3 });
const DARK = () => mat(0x2a2422, { metalness: 0.3 });
const LEATHER = () => mat(0x5a3520);
const WOOD = () => mat(0x6b4a2b);
const GOLD = () => mat(0xd4a84a, { metalness: 0.7, roughness: 0.35 });

function part(group, geo, m, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
    const o = new THREE.Mesh(geo, m);
    o.position.set(x, y, z);
    o.rotation.set(rx, ry, rz);
    o.castShadow = true;
    group.add(o);
    return o;
}

// accent: the item's colour (amo item.color), used for gems, wraps and trims.
export function buildWeapon(type, { accent = 0x8855ff, crystalMat = null } = {}) {
    const g = new THREE.Group();
    const tip = new THREE.Object3D();
    g.add(tip);
    const glow = crystalMat ?? new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 1.6, flatShading: true });
    let crystal = null;

    switch (type) {
        case 'staff': {
            part(g, new THREE.CylinderGeometry(0.022, 0.03, 1.75, 6), WOOD(), 0, 0.2, 0);
            part(g, new THREE.TorusGeometry(0.06, 0.012, 4, 8), GOLD(), 0, 1.06, 0);
            crystal = part(g, new THREE.OctahedronGeometry(0.075), glow, 0, 1.18, 0);
            crystal.scale.y = 1.6;
            tip.position.set(0, 1.18, 0);
            break;
        }
        case 'wand': {
            part(g, new THREE.CylinderGeometry(0.012, 0.02, 0.42, 6), WOOD(), 0, 0.14, 0);
            part(g, new THREE.CylinderGeometry(0.024, 0.024, 0.06, 6), GOLD(), 0, 0.02, 0);
            crystal = part(g, new THREE.OctahedronGeometry(0.035), glow, 0, 0.38, 0);
            tip.position.set(0, 0.38, 0);
            break;
        }
        case 'bo': {
            part(g, new THREE.CylinderGeometry(0.024, 0.024, 1.9, 6), WOOD(), 0, 0.15, 0);
            for (const y of [-0.75, 1.05]) part(g, new THREE.CylinderGeometry(0.03, 0.03, 0.12, 6), mat(accent), 0, y, 0);
            tip.position.set(0, 1.1, 0);
            break;
        }
        case 'spear': {
            part(g, new THREE.CylinderGeometry(0.02, 0.024, 2.0, 6), WOOD(), 0, 0.3, 0);
            part(g, new THREE.ConeGeometry(0.05, 0.28, 4), STEEL(), 0, 1.44, 0).scale.z = 0.35;
            part(g, new THREE.CylinderGeometry(0.03, 0.03, 0.08, 6), mat(accent), 0, 1.27, 0);
            tip.position.set(0, 1.55, 0);
            break;
        }
        case 'dagger': {
            part(g, new THREE.CylinderGeometry(0.016, 0.016, 0.11, 6), LEATHER(), 0, 0, 0);
            part(g, new THREE.BoxGeometry(0.11, 0.022, 0.03), GOLD(), 0, 0.065, 0);
            part(g, new THREE.BoxGeometry(0.035, 0.24, 0.01), STEEL(), 0, 0.19, 0);
            part(g, new THREE.ConeGeometry(0.025, 0.07, 4), STEEL(), 0, 0.34, 0).scale.z = 0.3;
            part(g, new THREE.SphereGeometry(0.02, 6, 4), mat(accent), 0, -0.06, 0);
            tip.position.set(0, 0.34, 0);
            break;
        }
        case 'sword': case 'greatsword': {
            const big = type === 'greatsword' ? 1.45 : 1;
            part(g, new THREE.CylinderGeometry(0.018, 0.018, 0.16 * big, 6), LEATHER(), 0, 0, 0);
            part(g, new THREE.SphereGeometry(0.028, 6, 4), mat(accent), 0, -0.09 * big, 0);
            part(g, new THREE.BoxGeometry(0.22 * big, 0.03, 0.045), GOLD(), 0, 0.09 * big, 0);
            part(g, new THREE.BoxGeometry(0.055 * big, 0.78 * big, 0.012), STEEL(), 0, 0.5 * big, 0);
            part(g, new THREE.ConeGeometry(0.04 * big, 0.12 * big, 4), STEEL(), 0, 0.95 * big, 0).scale.z = 0.3;
            part(g, new THREE.BoxGeometry(0.012, 0.6 * big, 0.014), mat(accent, { emissive: accent, emissiveIntensity: 0.4 }), 0, 0.45 * big, 0);
            tip.position.set(0, 0.95 * big, 0);
            break;
        }
        case 'mace': {
            part(g, new THREE.CylinderGeometry(0.02, 0.022, 0.6, 6), WOOD(), 0, 0.2, 0);
            part(g, new THREE.DodecahedronGeometry(0.09, 0), DARK(), 0, 0.56, 0);
            for (let i = 0; i < 6; i++) {
                const a = (i / 6) * Math.PI * 2;
                part(g, new THREE.ConeGeometry(0.025, 0.08, 4), STEEL(), Math.cos(a) * 0.09, 0.56, Math.sin(a) * 0.09, 0, 0, -Math.cos(a) * Math.PI / 2).rotation.x = Math.sin(a) * Math.PI / 2;
            }
            tip.position.set(0, 0.6, 0);
            break;
        }
        case 'halberd': {
            // A two-metre polearm, gripped a third of the way up like the spear: ash shaft and iron butt-cap; at the
            // top a broad crescent axe blade, a back hook and a long top spike, bound on with iron langets.
            part(g, new THREE.CylinderGeometry(0.021, 0.025, 2.1, 7), WOOD(), 0, 0.3, 0);
            part(g, new THREE.CylinderGeometry(0.03, 0.026, 0.07, 7), DARK(), 0, -0.73, 0);                       // butt-cap
            for (const sx of [1, -1]) part(g, new THREE.BoxGeometry(0.008, 0.3, 0.03), STEEL(), sx * 0.024, 1.22, 0);   // langets
            const blade = new THREE.Shape();
            blade.moveTo(0.02, 1.25); blade.lineTo(0.12, 1.17); blade.quadraticCurveTo(0.24, 1.2, 0.25, 1.33);
            blade.quadraticCurveTo(0.26, 1.46, 0.17, 1.55); blade.lineTo(0.02, 1.47); blade.closePath();
            const axeGeo = new THREE.ExtrudeGeometry(blade, { depth: 0.012, bevelEnabled: false }); axeGeo.translate(0, 0, -0.006);
            part(g, axeGeo, STEEL());
            const hook = new THREE.Shape();
            hook.moveTo(-0.02, 1.33); hook.lineTo(-0.15, 1.36); hook.lineTo(-0.19, 1.46); hook.lineTo(-0.11, 1.41); hook.lineTo(-0.02, 1.42); hook.closePath();
            const hookGeo = new THREE.ExtrudeGeometry(hook, { depth: 0.012, bevelEnabled: false }); hookGeo.translate(0, 0, -0.006);
            part(g, hookGeo, STEEL());
            const spike = part(g, new THREE.ConeGeometry(0.035, 0.36, 4), STEEL(), 0, 1.66, 0); spike.scale.z = 0.4;
            part(g, new THREE.CylinderGeometry(0.03, 0.03, 0.05, 7), mat(accent), 0, 1.06, 0);                   // a coloured binding below the head
            tip.position.set(0, 1.84, 0);
            break;
        }
        case 'claymore': {
            // A great two-handed sword: a long leather grip for both hands, a pommel, a crossguard whose arms slope up
            // toward the blade and end in four-ball clusters, and a long tapering blade with a fuller.
            part(g, new THREE.CylinderGeometry(0.019, 0.021, 0.3, 7), LEATHER(), 0, 0.03, 0);
            part(g, new THREE.SphereGeometry(0.034, 7, 5), mat(accent), 0, -0.14, 0);                             // pommel
            part(g, new THREE.BoxGeometry(0.07, 0.04, 0.045), GOLD(), 0, 0.2, 0);                                // guard block
            for (const sx of [1, -1]) {
                const arm = part(g, new THREE.BoxGeometry(0.17, 0.026, 0.03), GOLD(), sx * 0.11, 0.24, 0, 0, 0, sx * 0.55);
                arm.castShadow = true;
                for (const [dx, dy] of [[0, 0], [0.025, 0.012], [-0.012, 0.028], [0.012, -0.022]]) part(g, new THREE.SphereGeometry(0.013, 6, 4), GOLD(), sx * (0.185 + dx), 0.3 + dy, 0);
            }
            const bl = new THREE.Shape();
            bl.moveTo(-0.032, 0.22); bl.lineTo(0.032, 0.22); bl.lineTo(0.026, 1.28); bl.lineTo(0, 1.4); bl.lineTo(-0.026, 1.28); bl.closePath();
            const blGeo = new THREE.ExtrudeGeometry(bl, { depth: 0.012, bevelEnabled: false }); blGeo.translate(0, 0, -0.006);
            part(g, blGeo, STEEL());
            part(g, new THREE.BoxGeometry(0.012, 0.8, 0.014), DARK(), 0, 0.68, 0);                                // fuller
            tip.position.set(0, 1.4, 0);
            break;
        }
        case 'axe': {
            // A bearded war axe: an ash haft flaring to a knob at the butt; at the top an iron socket round the haft,
            // a flat poll behind it, and the blade — narrow at the cheek, flaring to a straight cutting edge with a
            // toe up and a beard sweeping down — with a bright honed strip along the edge.
            part(g, new THREE.CylinderGeometry(0.019, 0.023, 0.74, 7), WOOD(), 0, 0.27, 0);
            part(g, new THREE.CylinderGeometry(0.027, 0.02, 0.05, 7), WOOD(), 0, -0.11, 0);                     // butt knob
            part(g, new THREE.CylinderGeometry(0.024, 0.024, 0.14, 7), LEATHER(), 0, 0.02, 0);                  // grip wrap
            part(g, new THREE.BoxGeometry(0.055, 0.1, 0.05), DARK(), 0, 0.6, 0);                                // socket
            part(g, new THREE.BoxGeometry(0.035, 0.06, 0.042), DARK(), -0.04, 0.6, 0);                          // poll
            const bit = new THREE.Shape();
            bit.moveTo(0.026, 0.635); bit.lineTo(0.09, 0.645); bit.lineTo(0.17, 0.69);                         // top of the cheek up to the toe
            bit.quadraticCurveTo(0.185, 0.6, 0.165, 0.5);                                                       // the cutting edge
            bit.quadraticCurveTo(0.12, 0.52, 0.08, 0.575); bit.lineTo(0.026, 0.57); bit.closePath();             // the beard back to the socket
            const bitGeo = new THREE.ExtrudeGeometry(bit, { depth: 0.016, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.004, bevelSegments: 1 }); bitGeo.translate(0, 0, -0.008);
            bitGeo.translate(-0.026, -0.6, 0); bitGeo.scale(1.25, 1.25, 1); bitGeo.translate(0.026, 0.6, 0);   // a proper war axe head, not a hatchet
            part(g, bitGeo, STEEL());
            const sc = (x, y) => new THREE.Vector3(0.026 + (x - 0.026) * 1.25, 0.6 + (y - 0.6) * 1.25, 0);
            const hone = new THREE.CatmullRomCurve3([sc(0.17, 0.69), sc(0.181, 0.6), sc(0.165, 0.5)]);
            part(g, new THREE.TubeGeometry(hone, 8, 0.005, 4), mat(0xf2f4f8, { metalness: 0.9, roughness: 0.15 }));
            part(g, new THREE.CylinderGeometry(0.025, 0.025, 0.02, 7), mat(accent), 0, 0.53, 0);               // a coloured band under the head
            tip.position.set(0.22, 0.6, 0);
            break;
        }
        case 'shield': {
            const kite = new THREE.Shape();
            kite.moveTo(0, 0.3); kite.quadraticCurveTo(0.22, 0.28, 0.22, 0.1); kite.quadraticCurveTo(0.18, -0.2, 0, -0.38);
            kite.quadraticCurveTo(-0.18, -0.2, -0.22, 0.1); kite.quadraticCurveTo(-0.22, 0.28, 0, 0.3);
            const face = part(g, new THREE.ExtrudeGeometry(kite, { depth: 0.035, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 1 }), mat(accent), 0, 0, 0, 0, Math.PI / 2, 0);
            face.position.x = -0.02;
            const boss = part(g, new THREE.SphereGeometry(0.05, 8, 5), GOLD(), 0.04, 0.02, 0);
            boss.scale.x = 0.6;
            tip.position.set(0.05, 0, 0);
            break;
        }
        case 'bow': {
            // A recurve bow gripped at the middle: the wrapped grip in the hand, the limbs sweeping back toward the
            // archer and flicking forward at the tips, the string behind the grip at brace height.
            const limb = sy => new THREE.CatmullRomCurve3([new THREE.Vector3(0, sy * 0.07, 0.0), new THREE.Vector3(0, sy * 0.32, -0.06),
                new THREE.Vector3(0, sy * 0.58, -0.15), new THREE.Vector3(0, sy * 0.7, -0.15), new THREE.Vector3(0, sy * 0.76, -0.1)]);
            for (const sy of [1, -1]) part(g, new THREE.TubeGeometry(limb(sy), 16, 0.016, 6), WOOD());
            part(g, new THREE.CylinderGeometry(0.024, 0.024, 0.16, 7), LEATHER(), 0, 0, 0.0);                          // grip
            part(g, new THREE.CylinderGeometry(0.026, 0.026, 0.02, 7), mat(accent), 0, 0.09, 0);
            part(g, new THREE.CylinderGeometry(0.026, 0.026, 0.02, 7), mat(accent), 0, -0.09, 0);
            const string = part(g, new THREE.CylinderGeometry(0.0025, 0.0025, 1.36, 3), mat(0xece4d0), 0, 0, -0.135);   // from tip to tip
            string.scale.y = 1;
            tip.position.set(0, 0.05, 0.05);
            break;
        }
        case 'crossbow': {
            // A crossbow carried by its grip: the wooden stock running forward, a steel prod across the front with its
            // string drawn back to the nut, the trigger under the stock and a stirrup at the nose.
            part(g, new THREE.BoxGeometry(0.05, 0.06, 0.66), WOOD(), 0, 0.03, 0.2);                                   // stock
            part(g, new THREE.BoxGeometry(0.055, 0.1, 0.16), WOOD(), 0, -0.01, -0.17);                                // butt
            part(g, new THREE.BoxGeometry(0.012, 0.05, 0.02), DARK(), 0, -0.03, 0.02);                                // trigger
            const prod = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.3, 0.07, 0.42), new THREE.Vector3(-0.14, 0.07, 0.5), new THREE.Vector3(0, 0.07, 0.53),
                new THREE.Vector3(0.14, 0.07, 0.5), new THREE.Vector3(0.3, 0.07, 0.42)]);
            part(g, new THREE.TubeGeometry(prod, 14, 0.013, 5), STEEL());
            for (const sx of [1, -1]) {   // the string, from each prod tip back to the nut
                const a = new THREE.Vector3(sx * 0.3, 0.07, 0.42), b = new THREE.Vector3(0, 0.07, 0.24), m = a.clone().add(b).multiplyScalar(0.5);
                const str = part(g, new THREE.CylinderGeometry(0.0025, 0.0025, a.distanceTo(b), 3), mat(0xece4d0), m.x, m.y, m.z);
                str.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
            }
            part(g, new THREE.TorusGeometry(0.04, 0.008, 4, 10, Math.PI), STEEL(), 0, 0.03, 0.56, 0, 0, Math.PI);      // stirrup
            part(g, new THREE.BoxGeometry(0.03, 0.03, 0.03), mat(accent), 0, 0.075, 0.24);                            // nut
            tip.position.set(0, 0.08, 0.55);
            break;
        }
        // Tools (gathering, game/gathering.js) and the torch.
        case 'pickaxe': {   // an ash haft with a two-pointed iron head
            part(g, new THREE.CylinderGeometry(0.018, 0.022, 0.7, 7), WOOD(), 0, 0.25, 0);
            part(g, new THREE.CylinderGeometry(0.023, 0.023, 0.13, 7), LEATHER(), 0, 0.0, 0);
            part(g, new THREE.BoxGeometry(0.05, 0.07, 0.05), DARK(), 0, 0.6, 0);
            const pick = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.24, 0.52, 0), new THREE.Vector3(-0.1, 0.61, 0), new THREE.Vector3(0.1, 0.61, 0), new THREE.Vector3(0.24, 0.52, 0)]);
            part(g, new THREE.TubeGeometry(pick, 10, 0.016, 5), STEEL());
            part(g, new THREE.ConeGeometry(0.017, 0.06, 5), STEEL(), 0.26, 0.5, 0, 0, 0, Math.PI * 0.75);
            part(g, new THREE.ConeGeometry(0.017, 0.06, 5), STEEL(), -0.26, 0.5, 0, 0, 0, -Math.PI * 0.75);
            tip.position.set(0.25, 0.5, 0);
            break;
        }
        case 'sickle': {   // a short wooden grip and a crescent blade
            part(g, new THREE.CylinderGeometry(0.018, 0.02, 0.2, 6), WOOD(), 0, 0.05, 0);
            const arc = new THREE.TorusGeometry(0.14, 0.012, 4, 14, Math.PI * 1.15);
            part(g, arc, STEEL(), 0.12, 0.2, 0, 0, 0, -0.3);
            tip.position.set(0.24, 0.3, 0);
            break;
        }
        case 'rod': {   // a long, thin rod, a reel near the grip, a line from the tip
            part(g, new THREE.CylinderGeometry(0.006, 0.016, 1.7, 5), WOOD(), 0, 0.75, 0);
            part(g, new THREE.CylinderGeometry(0.03, 0.03, 0.02, 8), DARK(), 0.03, 0.1, 0, 0, 0, Math.PI / 2);
            part(g, new THREE.CylinderGeometry(0.0015, 0.0015, 0.9, 3), mat(0xeeeeee), 0, 1.15, 0.05, 0.4, 0, 0);
            tip.position.set(0, 1.6, 0);
            break;
        }
        case 'torch': {   // a stick, pitch-soaked rags at its head, a flame
            part(g, new THREE.CylinderGeometry(0.018, 0.022, 0.5, 6), WOOD(), 0, 0.15, 0);
            part(g, new THREE.CylinderGeometry(0.035, 0.028, 0.1, 7), mat(0x3a2a1a), 0, 0.42, 0);
            const flame = new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0.9, toneMapped: false, blending: THREE.AdditiveBlending, depthWrite: false });
            const f1 = part(g, new THREE.ConeGeometry(0.05, 0.16, 7), flame, 0, 0.54, 0); f1.castShadow = false;
            const f2 = part(g, new THREE.ConeGeometry(0.03, 0.11, 6), new THREE.MeshBasicMaterial({ color: 0xfff0a0, toneMapped: false, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }), 0, 0.53, 0); f2.castShadow = false;
            g.userData.flame = [f1, f2];
            tip.position.set(0, 0.56, 0);
            break;
        }
        default: // fists: nothing in hand
            break;
    }
    return { group: g, tip, crystal };
}
