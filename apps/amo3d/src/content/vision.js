// The Vision (chapter 2, "Dreamweaver's Call" — book ch. 2, The Vision): what Eldrin is shown when the storm calls his
// name. A violet sky "the colour of a bruise and a wound at once"; a city out of true, its towers grown over in the
// sky's colour; ground that is "memory, not substance"; at the far edge a man holding a door without a frame, who
// breaks; a woman who kneels and holds him and never looks up; and the sky's eye — Vorgos — that speaks.
// The scene's timing and lines are run by content/prologue.js; this file builds the place and its pieces.
import * as THREE from 'three';
import { createCharacter } from './models/character.js';
import { normalizeLook } from './models/look.js';
import { radialTexture } from '../engine/lib.js';

export function createVision() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x2a0f3a);
    scene.fog = new THREE.Fog(0x3a1650, 20, 140);
    const sky = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), new THREE.ShaderMaterial({
        side: THREE.BackSide, depthWrite: false, fog: false,
        uniforms: { t: { value: 0 } },
        vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: `uniform float t; varying vec3 vP;
            float h(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5); }
            float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
            void main(){
                float y = clamp(vP.y, -0.2, 1.0);
                vec2 q = vP.xz / (0.35 + abs(vP.y)) * 3.0 + vec2(t * 0.03, -t * 0.02);
                float c = n(q) * 0.6 + n(q * 2.3) * 0.3 + n(q * 5.1) * 0.1;
                vec3 bruise = mix(vec3(0.42, 0.12, 0.55), vec3(0.12, 0.03, 0.2), y);
                vec3 wound = vec3(0.55, 0.1, 0.25);
                vec3 col = mix(bruise, wound, smoothstep(0.55, 0.9, c) * (1.0 - y) * 0.7) + vec3(0.25, 0.1, 0.35) * pow(c, 3.0);
                gl_FragColor = vec4(col, 1.0);
                #include <tonemapping_fragment>
                #include <colorspace_fragment>
            }`,
    }));
    scene.add(sky);
    scene.add(new THREE.HemisphereLight(0xc8a0ff, 0x1a0820, 1.1));
    const key = new THREE.DirectionalLight(0xe0b0ff, 1.2); key.position.set(-20, 40, -30); scene.add(key);

    // Ground: memory stretched thin over something that breathes — dark glass, faint lines of light that pulse.
    const gtex = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); g.fillStyle = '#120818'; g.fillRect(0, 0, 256, 256); g.strokeStyle = 'rgba(190,130,255,0.35)'; g.lineWidth = 1.5; for (let i = 0; i < 40; i++) { g.beginPath(); let x = Math.random() * 256, y = Math.random() * 256; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (Math.random() - 0.5) * 70; y += (Math.random() - 0.5) * 70; g.lineTo(x, y); } g.stroke(); } const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(30, 30); return t; })();
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: gtex, color: 0xffffff, emissive: 0x2a0a40, emissiveMap: gtex, emissiveIntensity: 1.2, roughness: 0.25, metalness: 0.4 }));
    scene.add(ground);

    // The city out of true: spires he almost recognises, set a finger's width wrong, grown over in the sky's colour.
    const stone = new THREE.MeshStandardMaterial({ color: 0x2a1f34, flatShading: true, roughness: 0.8 });
    const grown = new THREE.MeshStandardMaterial({ color: 0x9a5ae0, emissive: 0x7a3ad0, emissiveIntensity: 1.1, flatShading: true });
    let seed = 7; const R = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 26; i++) {
        const a = -Math.PI * 0.85 + (i / 25) * Math.PI * 1.7, d = 45 + R() * 45, h = 10 + R() * 26;
        const g = new THREE.Group(); g.position.set(Math.sin(a) * d, 0, -Math.cos(a) * d);
        const w = 2 + R() * 3;
        const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), stone); b.position.y = h / 2; g.add(b);
        const cap = new THREE.Mesh(new THREE.ConeGeometry(w * 0.75, h * 0.35, 4), stone); cap.position.y = h + h * 0.17; cap.rotation.y = Math.PI / 4; g.add(cap);
        for (let k = 0; k < 4; k++) { const v = new THREE.Mesh(new THREE.BoxGeometry(w * 1.02, 0.4 + R() * 1.2, 0.3), grown); v.position.set(0, R() * h, w / 2); v.rotation.z = (R() - 0.5) * 0.6; g.add(v); }
        g.rotation.z = (R() - 0.5) * 0.08; g.rotation.x = (R() - 0.5) * 0.06;   // out of true
        scene.add(g);
    }

    // The man who holds the door: arms spread against the sky, light pooling under and through him.
    const HOLD = new THREE.Vector3(0, 0, -11);
    const man = createCharacter(normalizeLook({ body: { preset: 'adult_male', skin: '#c8b8d8' }, hair: { style: 'short', color: '#2a2030' },
        parts: { torso: { id: 'tunic', colors: { primary: '#3a3448', collar: '#2a2434', trim: '#c8b0f0' } }, legs: { id: 'trousers', colors: { primary: '#2a2434' } }, feet: { id: 'boots' }, cape: { id: 'none' }, back: { id: 'none' }, right: { id: 'none' }, left: { id: 'none' }, headgear: { id: 'none' } } }));
    man.root.position.copy(HOLD); man.root.rotation.y = Math.PI; scene.add(man.root);
    const glowTex = radialTexture([[0, 'rgba(255,255,255,1)'], [0.3, 'rgba(230,200,255,0.7)'], [1, 'rgba(170,110,255,0)']], 128);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xe8d8ff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    halo.scale.setScalar(6); halo.position.copy(HOLD).setY(1.4); scene.add(halo);
    const frame = new THREE.Mesh(new THREE.RingGeometry(2.4, 2.55, 4, 1, Math.PI / 4), new THREE.MeshBasicMaterial({ color: 0xf0e0ff, transparent: true, opacity: 0.35, side: THREE.DoubleSide, toneMapped: false }));
    frame.position.copy(HOLD).setY(2.2); frame.scale.set(0.9, 1.3, 1); scene.add(frame);   // the door without a frame: only light where its edges would be

    // The woman who kneels and keeps vigil — so still the eye crosses over her until she moves.
    const woman = createCharacter(normalizeLook({ body: { preset: 'adult_female', skin: '#e0d0e8' }, hair: { style: 'long', color: '#d8d0e8' },
        parts: { torso: { id: 'robe', colors: { primary: '#d8d0f0', collar: '#a898c8', trim: '#f0e8ff' } }, cape: { id: 'none' }, back: { id: 'none' }, right: { id: 'none' }, left: { id: 'none' }, headgear: { id: 'none' } } }));
    const WOMAN0 = new THREE.Vector3(-2.6, 0, -8.8);
    woman.root.position.copy(WOMAN0); woman.root.rotation.y = Math.PI * 0.8; scene.add(woman.root);

    // The eye in the sky: a storm's centre — a violet-veined pupil of almost-black ringed in old blood, cloud turning round it.
    const EYE = new THREE.Vector3(0, 38, -120);
    const eyeTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d'); const cx = 256;
        let gr = g.createRadialGradient(cx, cx, 0, cx, cx, 256); gr.addColorStop(0, 'rgba(10,2,14,1)'); gr.addColorStop(0.33, 'rgba(25,6,30,1)'); gr.addColorStop(0.4, 'rgba(110,20,30,1)'); gr.addColorStop(0.52, 'rgba(70,12,40,0.9)'); gr.addColorStop(0.75, 'rgba(60,20,80,0.4)'); gr.addColorStop(1, 'rgba(40,10,60,0)');
        g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
        g.strokeStyle = 'rgba(170,90,255,0.55)'; g.lineWidth = 2;
        for (let i = 0; i < 60; i++) { const a = Math.random() * Math.PI * 2; g.beginPath(); let r = 30, x = cx + Math.cos(a) * r, y = cx + Math.sin(a) * r; g.moveTo(x, y); for (let k = 0; k < 5; k++) { r += 12 + Math.random() * 14; const b = a + (Math.random() - 0.5) * 0.4; x = cx + Math.cos(b) * r; y = cx + Math.sin(b) * r; g.lineTo(x, y); } g.stroke(); }
        return new THREE.CanvasTexture(c); })();
    const eye = new THREE.Sprite(new THREE.SpriteMaterial({ map: eyeTex, transparent: true, opacity: 0, depthWrite: false, fog: false }));
    eye.scale.setScalar(90); eye.position.copy(EYE); scene.add(eye);
    const storm = [];
    for (let i = 0; i < 18; i++) {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0x6a3a8a, transparent: true, opacity: 0, depthWrite: false, fog: false }));
        s.scale.setScalar(40 + Math.random() * 40); scene.add(s); storm.push({ s, a: i / 18 * Math.PI * 2, r: 60 + Math.random() * 30 });
    }

    // Shards of light, for when the man breaks.
    const shardMat = new THREE.MeshBasicMaterial({ color: 0xf4eaff, toneMapped: false, transparent: true });
    const shards = [];
    const map = {
        id: 'vision', name: 'The Vision', scene, colliders: [], terrain: false,
        camera: { maxDist: 14, pitch: 0.12, dist: 7 },
        groundAt: () => 0, heightAt: () => 0, passable: () => true,
        blockedAt: (x, z) => (Math.hypot(x, z + 8) > 24 ? 'wall' : null),
        stepBlocked: () => false,
        resolve(pos) { const d = Math.hypot(pos.x, pos.z + 8); if (d > 24) { pos.x *= 24 / d; pos.z = -8 + (pos.z + 8) * 24 / d; } },
        projectileHit: p => (p.y < 0.03 ? 'ground' : null),
        groundNormal: () => new THREE.Vector3(0, 1, 0),
        triggers: [], spawns: { start: { x: 0, z: 2, facing: Math.PI } }, hittables: [], gatherSpots: [], gates: [], stations: [],
        // pieces the prologue moves
        man, woman, halo, frame, eye, storm, HOLD, WOMAN0,
        shatter() {   // the man breaks: shards of light thrown out, each striking its own small note, then lying where they fall
            man.root.visible = false; frame.visible = false;
            for (let i = 0; i < 70; i++) {
                const m = new THREE.Mesh(new THREE.TetrahedronGeometry(0.08 + Math.random() * 0.14, 0), shardMat.clone());
                m.position.copy(HOLD).setY(1.2 + Math.random() * 0.8); scene.add(m);
                const a = Math.random() * Math.PI * 2, v = 2 + Math.random() * 6;
                shards.push({ m, vx: Math.cos(a) * v, vy: 2 + Math.random() * 5, vz: Math.sin(a) * v, rest: false });
            }
        },
        eyeK: 0, holdK: 1,
        update(t, dt) {
            sky.material.uniforms.t.value = t;
            halo.material.opacity = 0.6 * map.holdK + Math.sin(t * 3) * 0.05 * map.holdK;
            frame.material.opacity = 0.35 * map.holdK;
            if (man.root.visible) man.update(dt, { speed: 0, sprinting: false, hopK: null, move: { id: 'roar', k: 0.5, hand: 'R' } });   // arms spread, holding
            woman.update(dt, { speed: map.womanSpeed ?? 0, sprinting: false, hopK: null, move: map.womanPose ? { id: map.womanPose, k: 0.5, hand: 'R' } : null });
            for (const s of shards) {
                if (s.rest) { s.m.material.opacity = 0.55 + Math.sin(t * 4 + s.vx) * 0.25; continue; }
                s.vy -= 9 * dt; s.m.position.x += s.vx * dt; s.m.position.y += s.vy * dt; s.m.position.z += s.vz * dt; s.m.rotation.x += dt * 6;
                if (s.m.position.y < 0.05) { s.m.position.y = 0.05; s.rest = true; }
            }
            eye.material.opacity = map.eyeK;
            eye.material.rotation = Math.sin(t * 0.2) * 0.05;
            for (const st of storm) { st.a += dt * 0.08; st.s.position.set(EYE.x + Math.cos(st.a) * st.r, EYE.y + Math.sin(st.a) * st.r * 0.6, EYE.z - 5); st.s.material.opacity = 0.5 * map.eyeK; }
        },
    };
    return map;
}
