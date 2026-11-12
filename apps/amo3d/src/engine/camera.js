// Third-person orbit camera: follows a focus point, orbits by yaw/pitch, zooms, shakes,
// and never dips under the ground.
import * as THREE from 'three';

export function createOrbitCamera(camera) {
    const tmp = new THREE.Vector3();
    const cam = {
        yaw: Math.PI, pitch: 0.38, dist: 8, maxDist: 22, shake: 0, target: new THREE.Vector3(),

        orbit(dYaw, dPitch) {
            cam.yaw += dYaw;
            cam.pitch = THREE.MathUtils.clamp(cam.pitch + dPitch, 0.05, 1.35);
        },
        zoom(factor) { cam.dist = THREE.MathUtils.clamp(cam.dist * factor, 3.5, cam.maxDist); },
        kick(amount) { cam.shake = Math.max(cam.shake, amount); },

        // Ground-relative directions for movement input.
        forward: () => tmp.set(-Math.sin(cam.yaw), 0, -Math.cos(cam.yaw)).clone(),

        snapTo(focus) { cam.target.copy(focus).setY(focus.y + 1.4); },

        update(dt, focus, lift = 0, groundAt = null) {
            const k = 1 - Math.exp(-dt * 10);
            cam.target.lerp(tmp.set(focus.x, focus.y + 1.4 + lift * 0.5, focus.z), k);
            const cp = Math.cos(cam.pitch) * cam.dist;
            camera.position.set(
                cam.target.x + Math.sin(cam.yaw) * cp,
                cam.target.y + Math.sin(cam.pitch) * cam.dist,
                cam.target.z + Math.cos(cam.yaw) * cp,
            );
            if (groundAt) camera.position.y = Math.max(camera.position.y, groundAt(camera.position.x, camera.position.z) + 0.6);
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
