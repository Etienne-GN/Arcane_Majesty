// Teleportation (2026-11-27, the user: "for the teleportation in game, the casting time and a small teleportation
// animation like in BOTW, but not that elaborate, should act as a time buffer … with a fading to black and back to the
// game when ready"): leaving — a column of pale light rises round the hero, motes stream upward and the body draws up
// into the light (~1.3 s, the hero held still); then the fade to black, where the destination is built and warmed
// (engine/maps.js holds the black until it is ready); arriving — the light comes down, the body forms back out of it.
// createTeleport({ hero, player, sfx }) → { out(scene, done), arrive(scene), update(dt), active, leaving }
import * as THREE from 'three';
import { Particles } from '../engine/lib.js';

const OUT_S = 1.3, IN_S = 0.9;
export function createTeleport({ hero, player, sfx }) {
    const motes = new Particles(600);
    const colMat = new THREE.MeshBasicMaterial({ color: 0x9ad8ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const column = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.75, 7, 18, 1, true).translate(0, 3.5, 0), colMat);
    column.frustumCulled = false; column.renderOrder = 6; column.visible = false;
    let scene = null, run = null;
    function setScene(s) { if (scene === s) return; scene?.remove(motes.points, column); scene = s; s?.add(motes.points, column); }
    const shape = (xz, y) => { const r = hero.root; if (r) r.scale.set(xz, y, xz); };
    function emit(P, up, n) {
        for (let i = 0; i < n; i++) {
            const a = Math.random() * Math.PI * 2, rr = 0.2 + Math.random() * 0.5, y = up ? Math.random() * 1.8 : 1.2 + Math.random() * 2.5;
            motes.emit({ x: P.x + Math.cos(a) * rr, y: P.y + y, z: P.z + Math.sin(a) * rr, vx: -Math.cos(a) * 0.15, vy: up ? 1.6 + Math.random() * 1.8 : -(1.2 + Math.random() * 1.2), vz: -Math.sin(a) * 0.15,
                life: 0.8 + Math.random() * 0.5, size: [0.12, 0.02], c0: [0.7, 0.9, 1, 0.9], c1: [0.4, 0.7, 1, 0], drag: 0.4 });
        }
    }
    return {
        get active() { return !!run; },
        get leaving() { return run?.kind === 'out'; },
        // leave: the light rises, the body draws up into it; `done` (the map's fade) when it is gone
        out(s, done) { setScene(s); run = { kind: 'out', t: 0, done }; sfx.cast?.(); },
        // arrive: the light comes down, the body forms back
        arrive(s) { setScene(s); run = { kind: 'in', t: 0 }; if (hero.root) hero.root.visible = true; shape(0.05, 1.6); sfx.whoosh?.(); },
        update(dt) {
            motes.update(dt);
            if (!run) return;
            run.t += dt;
            const P = player.state.pos; column.position.set(P.x, P.y, P.z); column.visible = true;
            if (run.kind === 'out') {
                const k = Math.min(1, run.t / OUT_S), e = k * k;
                colMat.opacity = 0.55 * Math.min(1, k * 2.2);
                column.scale.set(1 - k * 0.5, 0.4 + k * 0.6, 1 - k * 0.5);
                emit(P, true, Math.round(10 * dt * 60));
                shape(Math.max(0.04, 1 - e), 1 + e * 0.7);   // drawn up into the light
                if (k >= 1) { if (hero.root) hero.root.visible = false; const d = run.done; run = null; d?.(); }
            } else {
                const k = Math.min(1, run.t / IN_S), e = 1 - (1 - k) * (1 - k);
                colMat.opacity = 0.55 * (1 - k);
                column.scale.set(0.5 + k * 0.5, 1, 0.5 + k * 0.5);
                if (k < 0.7) emit(P, false, Math.round(8 * dt * 60));
                shape(Math.max(0.05, e), 1.6 - 0.6 * e);
                if (k >= 1) { shape(1, 1); colMat.opacity = 0; column.visible = false; run = null; }
            }
        },
    };
}
