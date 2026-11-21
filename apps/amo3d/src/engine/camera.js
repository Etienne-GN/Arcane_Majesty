// Third-person orbit camera: follows a focus point, orbits by yaw/pitch, zooms, shakes,
// and never dips under the ground. Zoomed all the way in it becomes first person (cam.firstPerson: the eye at the
// head, pitch turns into looking up and down); zoomed out it swings further up and down than before.
import * as THREE from 'three';
import { settings } from './settings.js';

export function createOrbitCamera(camera) {
    const tmp = new THREE.Vector3();
    const cam = {
        yaw: Math.PI, pitch: 0.38, dist: 8, maxDist: 22, shake: 0, target: new THREE.Vector3(),

        orbit(dYaw, dPitch) {   // every turn input (mouse, keys, stick, touch) comes through here: the player's turn speed and invert apply
            dYaw *= settings.camSens; dPitch *= settings.camSens * (settings.invertY ? -1 : 1);
            cam.yaw += dYaw;
            cam.pitch = THREE.MathUtils.clamp(cam.pitch + dPitch, cam.firstPerson ? -1.25 : -0.3, cam.firstPerson ? 1.35 : 1.5);
        },
        zoom(factor) {
            if (cam.firstPerson) {   // out of the eyes, back over the shoulder (a deliberate zoom out — a pinch's jitter is not enough)
                cam.fpOut = Math.max(1, (cam.fpOut ?? 1) * factor);
                if (cam.fpOut > 1.18) { cam.firstPerson = false; cam.fpOut = 1; cam.dist = 2.4; cam.pitch = Math.max(cam.pitch, 0.2); }
                return;
            }
            const d = cam.dist * factor;
            if (factor < 1 && d < 2.2) { cam.firstPerson = true; cam.fpOut = 1; cam.pitch = 0.1; return; }   // in past the shoulder: first person
            cam.dist = THREE.MathUtils.clamp(d, 2.2, cam.maxDist);
        },
        firstPerson: false,
        kick(amount) { cam.shake = Math.max(cam.shake, amount); },
        // The right stick's click: first person → near → middle → far → first person.
        cycle() {
            if (cam.firstPerson) { cam.firstPerson = false; cam.dist = 3.5; cam.pitch = Math.max(cam.pitch, 0.25); return; }
            if (cam.dist < 5.5) cam.dist = Math.min(cam.maxDist, 9);
            else if (cam.dist < 14) cam.dist = Math.min(cam.maxDist, 20);
            else { cam.firstPerson = true; cam.fpOut = 1; cam.pitch = 0.1; }
        },

        // Ground-relative directions for movement input.
        forward: () => tmp.set(-Math.sin(cam.yaw), 0, -Math.cos(cam.yaw)).clone(),

        snapTo(focus) { cam.target.copy(focus).setY(focus.y + 1.4); },

        // blockedAt(x, z, r, y) (the map's): a wall between the player and the camera pulls the camera in front of it.
        update(dt, focus, lift = 0, groundAt = null, blockedAt = null) {
            const k = 1 - Math.exp(-dt * 10);
            if (cam.firstPerson) {   // the eye at the head, looking where the camera faces
                cam.target.set(focus.x, focus.y + 1.62 + lift * 0.5, focus.z);
                camera.position.copy(cam.target);
                const cp = Math.cos(cam.pitch);
                camera.lookAt(cam.target.x - Math.sin(cam.yaw) * cp, cam.target.y - Math.sin(cam.pitch), cam.target.z - Math.cos(cam.yaw) * cp);
                if (cam.shake > 0.001) { camera.position.y += (Math.random() - 0.5) * cam.shake * 0.4; cam.shake *= Math.exp(-dt * 9); }
                return;
            }
            cam.target.lerp(tmp.set(focus.x, focus.y + 1.4 + lift * 0.5, focus.z), k);
            let dist = cam.dist;
            if (blockedAt) {   // the nearest wall along the line out to the camera (sampled every ~0.5 m)
                const n = Math.ceil(cam.dist / 0.5), cx = Math.sin(cam.yaw) * Math.cos(cam.pitch), cy = Math.sin(cam.pitch), cz = Math.cos(cam.yaw) * Math.cos(cam.pitch);
                for (let i = 2; i <= n; i++) { const d = i / n * cam.dist; if (blockedAt(cam.target.x + cx * d, cam.target.z + cz * d, 0.2, cam.target.y + cy * d)) { dist = Math.max(1.2, d - 0.6); break; } }
            }
            if (groundAt) {   // the land along the line out to the camera: a hillside between pulls the camera in front of it
                const n = Math.ceil(dist / 0.5), cx = Math.sin(cam.yaw) * Math.cos(cam.pitch), cy = Math.sin(cam.pitch), cz = Math.cos(cam.yaw) * Math.cos(cam.pitch);
                for (let i = 3; i <= n; i++) { const d = i / n * dist, x = cam.target.x + cx * d, z = cam.target.z + cz * d; if (cam.target.y + cy * d < groundAt(x, z) + 0.5) { dist = Math.max(1.2, d - 0.8); break; } }
            }
            cam.shown = cam.shown === undefined ? dist : cam.shown + (dist - cam.shown) * Math.min(1, dt * (dist < cam.shown ? 18 : 3));   // in fast, back out slowly
            dist = Math.min(dist, cam.shown);
            const cp = Math.cos(cam.pitch) * dist;
            camera.position.set(
                cam.target.x + Math.sin(cam.yaw) * cp,
                cam.target.y + Math.sin(cam.pitch) * dist,
                cam.target.z + Math.cos(cam.yaw) * cp,
            );
            if (groundAt) {   // clear of the ground under it and round it (a slope beside the lens would be cut by the near plane)
                const { x, z } = camera.position; let g = groundAt(x, z);
                for (let a2 = 0; a2 < 6.28; a2 += 1.05) g = Math.max(g, groundAt(x + Math.cos(a2) * 1.2, z + Math.sin(a2) * 1.2) - 0.25);
                camera.position.y = Math.max(camera.position.y, g + 0.7);
            }
            camera.lookAt(cam.target);
            if (cam.shake > 0.001) {
                camera.position.x += (Math.random() - 0.5) * cam.shake;
                camera.position.y += (Math.random() - 0.5) * cam.shake;
                cam.shake *= Math.exp(-dt * 9);
            }
        },
    };
    return cam;
}
