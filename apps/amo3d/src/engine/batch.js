// Draw-call batching. Phones choke on hundreds of draw calls far sooner than on triangles, and
// a code-built world is made of many small meshes. Two passes:
//   bakeStatic(root) — merges every static mesh under `root` into one mesh per material (in world
//                      space). Mark anything that moves with userData.dynamic = true first.
//   bakeRig(root)    — for characters: merges the meshes that hang directly off the same joint
//                      (same material), so joints still animate but each joint draws once.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

function normalised(geo, matrix, material) {
    let g = geo.index ? geo.toNonIndexed() : geo.clone();
    if (matrix) g.applyMatrix4(matrix);
    const keep = ['position', 'normal'];
    if (material.vertexColors) keep.push('color');
    if (material.map || material.isShaderMaterial) keep.push('uv');
    for (const name of Object.keys(g.attributes)) if (!keep.includes(name)) g.deleteAttribute(name);
    if (!g.attributes.normal) g.computeVertexNormals();
    if (keep.includes('uv') && !g.attributes.uv) return null;
    if (keep.includes('color') && !g.attributes.color) return null;
    g.morphAttributes = {};
    g.clearGroups();
    return g;
}

const movable = o => {
    for (let p = o; p; p = p.parent) if (p.userData.dynamic) return true;
    return false;
};

export function bakeStatic(root) {
    root.updateMatrixWorld(true);
    const buckets = new Map();
    root.traverse(o => {
        if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || Array.isArray(o.material) || !o.visible) return;
        if (movable(o)) return;
        const key = `${o.material.uuid}|${o.castShadow}|${o.receiveShadow}|${o.renderOrder}`;
        if (!buckets.has(key)) buckets.set(key, { material: o.material, cast: o.castShadow, receive: o.receiveShadow, order: o.renderOrder, items: [] });
        buckets.get(key).items.push(o);
    });
    let before = 0, after = 0;
    for (const b of buckets.values()) {
        before += b.items.length;
        if (b.items.length < 2) { after += b.items.length; continue; }
        const geos = [];
        const taken = [];
        for (const o of b.items) {
            const g = normalised(o.geometry, o.matrixWorld, b.material);
            if (g) { geos.push(g); taken.push(o); }
        }
        if (geos.length < 2) { after += b.items.length; continue; }
        const merged = mergeGeometries(geos, false);
        if (!merged) { after += b.items.length; continue; }
        const mesh = new THREE.Mesh(merged, b.material);
        mesh.castShadow = b.cast;
        mesh.receiveShadow = b.receive;
        mesh.renderOrder = b.order;
        mesh.name = 'baked';
        for (const o of taken) o.parent.remove(o);
        root.add(mesh);
        after += 1 + (b.items.length - taken.length);
    }
    return { before, after };
}

export function bakeRig(root) {
    let before = 0, after = 0;
    const joints = [];
    root.traverse(o => { if (!o.isMesh) joints.push(o); });
    for (const joint of joints) {
        const buckets = new Map();
        for (const c of joint.children) {
            if (!c.isMesh || c.isInstancedMesh || c.children.length || c.userData.keep || Array.isArray(c.material)) continue;
            const key = `${c.material.uuid}|${c.castShadow}|${c.receiveShadow}`;
            if (!buckets.has(key)) buckets.set(key, []);
            buckets.get(key).push(c);
        }
        for (const list of buckets.values()) {
            before += list.length;
            if (list.length < 2) { after += list.length; continue; }
            const geos = [];
            for (const c of list) {
                c.updateMatrix();
                const g = normalised(c.geometry, c.matrix, c.material);
                if (g) geos.push(g);
            }
            if (geos.length !== list.length) { after += list.length; continue; }
            const mesh = new THREE.Mesh(mergeGeometries(geos, false), list[0].material);
            mesh.castShadow = list[0].castShadow;
            mesh.receiveShadow = list[0].receiveShadow;
            for (const c of list) joint.remove(c);
            joint.add(mesh);
            after += 1;
        }
    }
    return { before, after };
}
