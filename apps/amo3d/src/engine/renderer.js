// WebGL renderer + perspective camera, sized to the window and set up from a quality preset.
import * as THREE from 'three';

export function createRenderer(quality) {
    const renderer = new THREE.WebGLRenderer({ antialias: quality.antialias, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, quality.pixelRatio));
    renderer.setSize(innerWidth, innerHeight);
    renderer.localClippingEnabled = true;   // the open world clips a stamped place's ground to its footprint
    renderer.shadowMap.enabled = quality.shadows;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    document.body.prepend(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 1200);
    addEventListener('resize', () => {
        camera.aspect = innerWidth / innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(innerWidth, innerHeight);
    });
    return { renderer, camera };
}
