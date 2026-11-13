// The outdoor shell every open-air map shares: sky dome, sun (with shadows that follow the player),
// hemisphere light, fog and weather, driven by the hour and weather in ctx (amo clock + weather) and
// tinted by the map's mood { fog, fogNear, fogFar, fogMix, light, nightFloor }.
import * as THREE from 'three';
import { skyState, createWeather } from './sky.js';

export function createOutdoorShell(scene, { quality, mood = {} }) {
    const M = mood;
    const horizon = new THREE.Color(M.fog ?? '#c9d6d4');
    scene.background = horizon.clone();
    scene.fog = new THREE.Fog(horizon.clone(), M.fogNear ?? 50, (M.fogFar ?? 200) * quality.fogFar);
    const sky = new THREE.Mesh(new THREE.SphereGeometry(450, 24, 12), new THREE.ShaderMaterial({
        side: THREE.BackSide, depthWrite: false, fog: false,
        uniforms: { top: { value: new THREE.Color() }, bottom: { value: new THREE.Color() } },
        vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: `uniform vec3 top; uniform vec3 bottom; varying vec3 vP;
            void main(){ float t = clamp(vP.y * 1.8 + 0.05, 0.0, 1.0); gl_FragColor = vec4(mix(bottom, top, pow(t, 0.8)), 1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
            }`,
    }));
    sky.renderOrder = -1;
    sky.userData.dynamic = true;
    scene.add(sky);
    const hemi = new THREE.HemisphereLight(0xbfd8ff, 0x3a3020, 1);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff0d0, 2.5);
    const SR = quality.shadowRange ?? 48;
    sun.castShadow = quality.shadows;
    sun.shadow.mapSize.set(quality.shadowMap, quality.shadowMap);
    Object.assign(sun.shadow.camera, { left: -SR, right: SR, top: SR, bottom: -SR, near: 1, far: 320 });
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
    scene.add(sun, sun.target);
    const weatherFx = createWeather(scene, quality);
    const moodFog = new THREE.Color(M.fog ?? '#c9d6d4'), fogCol = new THREE.Color();

    return {
        sun, hemi,
        // Returns the sky state (for anything else that wants the hour: lamps, windows…).
        update(dt, ctx) {
            const S = skyState(ctx.hour ?? 9, ctx.weather ?? 'clear');
            const flash = weatherFx.update(dt, S, ctx.weather ?? 'clear', ctx.camera);
            const dim = M.light ?? 1;
            sun.color.copy(S.sun);
            sun.intensity = S.sunI * dim;
            hemi.intensity = Math.max(S.hemiI * (0.4 + 0.6 * dim), (M.nightFloor ?? 0) * S.night) + flash;   // never pitch black
            fogCol.copy(moodFog).multiplyScalar(0.25 + 0.75 * S.day);
            scene.fog.color.copy(S.bottom).lerp(fogCol, M.fogMix ?? 0.6);
            scene.background.copy(scene.fog.color);
            scene.fog.far = (M.fogFar ?? 200) * quality.fogFar * S.fogMul;
            scene.fog.near = (M.fogNear ?? 50) * S.fogMul;
            sky.material.uniforms.top.value.copy(S.top).lerp(fogCol, (M.fogMix ?? 0.6) * 0.5);
            sky.material.uniforms.bottom.value.copy(scene.fog.color);
            sky.position.copy(ctx.camera.position);
            const texel = (2 * SR) / quality.shadowMap;
            sun.target.position.set(Math.round(ctx.player.pos.x / texel) * texel, ctx.player.pos.y, Math.round(ctx.player.pos.z / texel) * texel);
            sun.position.copy(sun.target.position).addScaledVector(S.dir.clone().normalize(), 140);
            return S;
        },
    };
}
