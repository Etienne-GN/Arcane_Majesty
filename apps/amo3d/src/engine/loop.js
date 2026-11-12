// The frame loop: one variable-step tick (clamped to 0..50 ms) and one render per frame.
// `advance(seconds)` runs the same tick in fixed 1/30 s steps without drawing — for headless
// tests, where software rendering is far too slow to play in real time.
import * as THREE from 'three';

export function startLoop({ renderer, tick, render }) {
    const timer = new THREE.Timer();
    renderer.setAnimationLoop(now => {
        timer.update(now);
        tick(Math.max(0, Math.min(timer.getDelta(), 0.05)));   // the first delta can be negative
        render();
    });
    return {
        advance(seconds) {
            for (let i = 0; i < Math.round(seconds * 30); i++) tick(1 / 30);
            return true;
        },
    };
}
