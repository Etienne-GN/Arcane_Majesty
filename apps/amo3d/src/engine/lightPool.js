// The light pool (phones, 2026-11-22: 23 point lights in the glade, 38 in Thaloria — three.js lights every pixel of every
// lit material with every light in the scene, near or far, and that was the cost): the scene's point lights stay where
// they are and keep animating, but are hidden from rendering; a fixed pool of K real lights is moved to the K nearest of
// them (copying their colour, intensity, reach) a few times a second. The count never changes, so no shader recompiles.
// pool.update(dt, playerPos) — every frame (it notices new lights by itself every couple of seconds).
import * as THREE from 'three';

export function createLightPool(scene, K = 4) {
    const pool = [], sources = [], v = new THREE.Vector3();
    for (let i = 0; i < K; i++) { const l = new THREE.PointLight(0xffffff, 0, 10, 2); l.userData.pooled = true; l.userData.dynamic = true; scene.add(l); pool.push({ l, src: null }); }
    let scanT = 0, pickT = 0;
    function scan() {
        scene.traverse(o => { if (o.isPointLight && !o.userData.pooled && !o.userData.pooledSource) { o.userData.pooledSource = true; o.userData.wasVisible = o.visible; o.visible = false; sources.push(o); } });
    }
    function shown(o) { let p = o; while (p) { if (p !== o && p.visible === false) return false; p = p.parent; } return o.userData.wasVisible !== false && o.parent; }
    return {
        sources,
        update(dt, at) {
            if ((scanT -= dt) <= 0) { scanT = 2; scan(); }
            if ((pickT -= dt) <= 0) {   // the K nearest lights that are on and whose place is shown
                pickT = 0.25;
                const near = [];
                for (const o of sources) { if (!shown(o) || o.intensity <= 0) continue; o.getWorldPosition(v); const d = v.distanceToSquared(at); const reach = (o.distance || 60) + 25; if (d < reach * reach) near.push([d, o]); }
                near.sort((a, b) => a[0] - b[0]);
                pool.forEach((p, i) => { p.src = near[i]?.[1] ?? null; });
            }
            for (const p of pool) {   // copy the source's light every frame (it may flicker, dim at dawn…)
                if (!p.src) { p.l.intensity = 0; continue; }
                p.src.getWorldPosition(p.l.position); p.l.color.copy(p.src.color); p.l.intensity = p.src.intensity; p.l.distance = p.src.distance; p.l.decay = p.src.decay;
            }
        },
    };
}
