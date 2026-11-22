// Ground effects that follow the relief (asked 2026-11-22: "magic casts and effects should follow relief like the
// targeting system"): a blast ring, a scorch mark, a rune circle, a shockwave — flat discs and rings laid at the impact's
// height floated over a slope on one side and sank into it on the other. drape(mesh) turns one into a fine polar grid
// lying in the ground plane; drapeAll(ground) re-lays every live one on the ground each frame (while it grows, spins,
// moves), and forgets those taken out of the scene. ground(x, z) → the surface height (land or water).
import * as THREE from 'three';

const live = new Set(), v = new THREE.Vector3(), o = new THREE.Vector3(), s = new THREE.Vector3(), q = new THREE.Quaternion();

export function drape(mesh, lift = 0.06) {
    let g = mesh.geometry, p = g.parameters ?? {};
    // a disc or ring: rebuilt with rings of vertices across it (a slope bends it inside, not only at the rim)
    if (g.type === 'RingGeometry') g = new THREE.RingGeometry(p.innerRadius, p.outerRadius, p.thetaSegments ?? 32, Math.max(3, Math.round((p.outerRadius - p.innerRadius) / p.outerRadius * 8)));
    else if (g.type === 'CircleGeometry') g = new THREE.RingGeometry(0.0001, p.radius, p.segments ?? 32, 8);
    else g = g.clone();
    // into the ground plane (x, z), whichever way it was turned: a rotation of −90° about x is baked in
    const flat = Math.abs(mesh.rotation.x + Math.PI / 2) < 0.01 || Math.abs(mesh.rotation.x - Math.PI / 2) < 0.01;
    if (flat && (g.type === 'RingGeometry')) { g.rotateX(-Math.PI / 2); mesh.rotation.x = 0; }
    else if (g.type === 'RingGeometry' && !g.userData?.horizontal) { let maxY = 0; const a = g.attributes.position; for (let i = 0; i < a.count; i++) maxY = Math.max(maxY, Math.abs(a.getY(i))); if (maxY > 1e-3) { g.rotateX(-Math.PI / 2); mesh.rotation.x = 0; } }
    mesh.geometry = g;
    mesh.userData.drape = { base: Float32Array.from(g.attributes.position.array), lift };
    mesh.frustumCulled = false;
    live.add(mesh);
    return mesh;
}

export function drapeAll(ground) {
    for (const m of live) {
        if (!m.parent) { live.delete(m); continue; }
        if (!m.visible) continue;
        const d = m.userData.drape, a = m.geometry.attributes.position, b = d.base;
        m.updateWorldMatrix(true, false); m.matrixWorld.decompose(o, q, s);
        const sy = s.y || 1;
        for (let i = 0; i < a.count; i++) {
            v.set(b[i * 3], 0, b[i * 3 + 2]).applyMatrix4(m.matrixWorld);
            a.setY(i, (ground(v.x, v.z) + d.lift - o.y) / sy);
        }
        a.needsUpdate = true;
    }
}
export const drapedCount = () => live.size;
