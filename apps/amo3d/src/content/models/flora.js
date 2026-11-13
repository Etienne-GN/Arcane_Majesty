// Tree models shared by every outdoor region: pine, broadleaf (oak / maple by colour), birch, and a
// dead tree for dark woods. Each kind is a trunk + a crown geometry, drawn instanced.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

let cache = null;
export function treeKinds() {
    if (cache) return cache;
    cache = {
        pine: {
            trunk: new THREE.CylinderGeometry(0.16, 0.26, 2.0, 6).translate(0, 1.0, 0), trunkColor: 0x5a3d26, r: 0.3,
            crown: mergeGeometries([
                new THREE.ConeGeometry(1.5, 2.4, 7).translate(0, 2.4, 0),
                new THREE.ConeGeometry(1.15, 2.0, 7).translate(0, 3.5, 0),
                new THREE.ConeGeometry(0.75, 1.7, 7).translate(0, 4.5, 0),
            ]),
        },
        broad: {
            trunk: mergeGeometries([
                new THREE.CylinderGeometry(0.2, 0.34, 2.8, 7).translate(0, 1.4, 0),
                new THREE.CylinderGeometry(0.07, 0.13, 1.5, 5).rotateZ(-0.9).translate(0.55, 2.5, 0),
                new THREE.CylinderGeometry(0.06, 0.11, 1.2, 5).rotateX(0.85).translate(0, 2.6, 0.45),
            ]), trunkColor: 0x5e4630, r: 0.38,
            crown: mergeGeometries([
                new THREE.IcosahedronGeometry(1.75, 1).translate(0, 3.7, 0),
                new THREE.IcosahedronGeometry(1.25, 1).translate(1.3, 3.2, 0.2),
                new THREE.IcosahedronGeometry(1.2, 1).translate(-1.1, 3.3, 0.6),
                new THREE.IcosahedronGeometry(1.0, 1).translate(0.1, 4.7, 0.2),
            ]),
        },
        birch: {
            trunk: new THREE.CylinderGeometry(0.09, 0.15, 4.4, 6).translate(0, 2.2, 0), trunkColor: 0xe8e4da, r: 0.2,
            crown: mergeGeometries([
                new THREE.IcosahedronGeometry(0.95, 0).scale(0.85, 1.35, 0.85).translate(0, 3.7, 0),
                new THREE.IcosahedronGeometry(0.75, 0).scale(0.9, 1.3, 0.9).translate(0.45, 4.5, 0.2),
                new THREE.IcosahedronGeometry(0.6, 0).translate(-0.2, 4.9, -0.1),
            ]),
        },
        dead: {
            trunk: mergeGeometries([
                new THREE.CylinderGeometry(0.12, 0.3, 4.2, 6).translate(0, 2.1, 0),
                new THREE.CylinderGeometry(0.04, 0.09, 1.6, 4).rotateZ(-1.0).translate(0.6, 3.0, 0),
                new THREE.CylinderGeometry(0.04, 0.08, 1.3, 4).rotateZ(0.9).translate(-0.5, 3.4, 0.1),
                new THREE.CylinderGeometry(0.03, 0.07, 1.1, 4).rotateX(0.9).translate(0, 3.7, 0.4),
            ]), trunkColor: 0x3a3430, r: 0.3,
            crown: new THREE.BufferGeometry(),
        },
    };
    return cache;
}
