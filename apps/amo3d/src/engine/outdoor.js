// The outdoor shell every open-air map shares: sky dome, sun (with shadows that follow the player),
// hemisphere light, fog and weather, driven by the hour and weather in ctx (amo clock + weather) and
// tinted by the map's mood { fog, fogNear, fogFar, fogMix, light, nightFloor }.
import * as THREE from 'three';
import { skyState, createWeather } from './sky.js';
import { radialTexture } from './lib.js';

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

    // The Umbral Plane's sky (mood.plane 'nythoria'): the eclipsed sun — a black disc in a silver corona — falling ash,
    // and crows wheeling overhead (mood.crows: how many, round mood.crowsAt).
    const umbral = M.plane === 'nythoria';
    let eclipse = null, ash = null, crows = null;
    if (umbral) {
        eclipse = new THREE.Group(); eclipse.userData.dynamic = true;
        const corona = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTexture([[0, 'rgba(255,255,255,1)'], [0.32, 'rgba(235,240,255,0.95)'], [0.4, 'rgba(200,210,240,0.45)'], [0.6, 'rgba(170,180,220,0.12)'], [1, 'rgba(150,160,210,0)']], 128), color: 0xe8ecff, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
        corona.scale.setScalar(120);
        const disc = new THREE.Mesh(new THREE.CircleGeometry(20, 48), new THREE.MeshBasicMaterial({ color: 0x050508, fog: false, depthWrite: false, transparent: true, opacity: 1 }));
        disc.renderOrder = 1; corona.renderOrder = 0;
        eclipse.add(corona, disc); eclipse.renderOrder = -1;
        scene.add(eclipse);
        const N = Math.round(700 * (quality.particles ?? 1)), BOX = 40, ap = new Float32Array(N * 3), seed = Float32Array.from({ length: N * 4 }, () => Math.random());
        const ag = new THREE.BufferGeometry(); ag.setAttribute('position', new THREE.BufferAttribute(ap, 3));
        ash = { pts: new THREE.Points(ag, new THREE.PointsMaterial({ map: radialTexture([[0, 'rgba(255,255,255,1)'], [0.5, 'rgba(255,255,255,0.6)'], [1, 'rgba(255,255,255,0)']], 32), color: 0xb0b0bc, size: 0.06, transparent: true, opacity: 0.8, depthWrite: false, alphaTest: 0.02 })), ap, seed, N, BOX };   // round flakes
        ash.pts.frustumCulled = false; ash.pts.userData.dynamic = true; scene.add(ash.pts);
        const C = M.crows ?? 14;
        crows = { group: new THREE.Group(), list: [], at: M.crowsAt ?? { x: 0, z: 0 } };
        const wing = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0.12), new THREE.Vector3(0.55, 0.08, -0.05), new THREE.Vector3(0, 0, -0.12), new THREE.Vector3(0, 0, 0.12), new THREE.Vector3(0, 0, -0.12), new THREE.Vector3(-0.55, 0.08, -0.05)]);
        wing.computeVertexNormals();
        const cm = new THREE.MeshBasicMaterial({ color: 0x0a0a0e, side: THREE.DoubleSide });
        for (let i = 0; i < C; i++) { const b = new THREE.Mesh(wing, cm); b.scale.setScalar(1.2 + Math.random() * 0.8); crows.group.add(b); crows.list.push({ b, r: 18 + Math.random() * 30, h: 22 + Math.random() * 18, a: Math.random() * 6.28, w: (0.15 + Math.random() * 0.2) * (Math.random() < 0.5 ? 1 : -1), ph: Math.random() * 6 }); }
        crows.group.userData.dynamic = true; scene.add(crows.group);
    }
    if (umbral) { hemi.color.setHex(0xb8bed4); hemi.groundColor.setHex(0x2a2830); }   // a cold, colourless light
    let tt = 0;

    return {
        sun, hemi, sky,   // sky: the dome, for maps that tint it (the mountain's clouds)
        // Returns the sky state (for anything else that wants the hour: lamps, windows…).
        update(dt, ctx) {
            const S = skyState(ctx.hour ?? 9, umbral ? 'clear' : (ctx.weather ?? 'clear'), M.plane ?? null);
            tt += dt;
            const flash = weatherFx.update(dt, S, umbral ? 'clear' : (ctx.weather ?? 'clear'), ctx.camera);   // the Umbral Plane: ash, not rain
            const dim = M.light ?? 1;
            sun.color.copy(S.sun);
            sun.intensity = S.sunI * dim;
            hemi.intensity = Math.max(S.hemiI * (0.4 + 0.6 * dim), (M.nightFloor ?? 0) * S.night) + flash;   // never pitch black
            fogCol.copy(moodFog).multiplyScalar(umbral ? 0.95 : 0.25 + 0.75 * S.day);   // the Umbral Plane: a grey that never goes black
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
            if (umbral) {
                eclipse.position.copy(ctx.camera.position).addScaledVector(S.dir.clone().normalize(), 380);
                eclipse.lookAt(ctx.camera.position);
                eclipse.children[0].material.opacity = 0.85 + Math.sin(tt * 0.7) * 0.08;
                const c = ctx.camera.position;
                for (let i = 0; i < ash.N; i++) {   // ash drifting down and sideways, round the camera
                    const sx = ash.seed[i * 4], sy = ash.seed[i * 4 + 1], sz = ash.seed[i * 4 + 2], sp = 0.25 + ash.seed[i * 4 + 3] * 0.5;
                    const y = ((sy * 24 - tt * sp) % 24 + 24) % 24;
                    ash.ap[i * 3] = c.x + (sx - 0.5) * ash.BOX + Math.sin(tt * 0.4 + i) * 0.8 + tt * 0.3 % ash.BOX * 0;
                    ash.ap[i * 3 + 1] = c.y - 6 + y;
                    ash.ap[i * 3 + 2] = c.z + (sz - 0.5) * ash.BOX + Math.cos(tt * 0.3 + i * 1.7) * 0.8;
                }
                ash.pts.geometry.attributes.position.needsUpdate = true;
                const base = ctx.player?.pos?.y ?? 0;
                for (const k of crows.list) {
                    k.a += k.w * dt;
                    const x = crows.at.x + Math.cos(k.a) * k.r, z = crows.at.z + Math.sin(k.a) * k.r;
                    k.b.position.set(x, base + k.h + Math.sin(tt * 0.5 + k.ph) * 2, z);
                    k.b.rotation.set(0, -k.a + (k.w > 0 ? 0 : Math.PI), 0);
                    k.b.scale.y = 1 + Math.sin(tt * 9 + k.ph) * 0.9;   // the wing-beat (the wings flex up and down)
                }
            }
            return S;
        },
    };
}
