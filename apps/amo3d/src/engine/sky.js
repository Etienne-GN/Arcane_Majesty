// Time of day and weather for an outdoor scene. The hour comes from amo's gameClock (a 24-minute
// day), the weather from amo's weatherAt. skyState(hour, weatherId) gives every colour and light;
// createWeather draws stars, the moon, rain streaks and lightning.
import * as THREE from 'three';

const C = h => new THREE.Color(h);
// Keyframes over the day: sky top, sky bottom (= horizon and fog), sun colour, sun and ambient strength.
const KEYS = [
    { h: 0,    top: C(0x070a1a), bottom: C(0x1a2238), sun: C(0x8aa0d0), sunI: 0.5, hemiI: 0.42 },
    { h: 4.6,  top: C(0x0a0d22), bottom: C(0x23263f), sun: C(0x8aa0d0), sunI: 0.5, hemiI: 0.42 },
    { h: 5.6,  top: C(0x2a2a52), bottom: C(0x8a6a7a), sun: C(0xff9a70), sunI: 0.7,  hemiI: 0.5 },
    { h: 6.6,  top: C(0x4a6aa8), bottom: C(0xf0b88a), sun: C(0xffb880), sunI: 1.7,  hemiI: 0.85 },
    { h: 9,    top: C(0x3d6ca8), bottom: C(0xc9d6d4), sun: C(0xfff0d0), sunI: 2.8,  hemiI: 1.1 },
    { h: 17,   top: C(0x3d6ca8), bottom: C(0xc9d6d4), sun: C(0xfff0d0), sunI: 2.8,  hemiI: 1.1 },
    { h: 19,   top: C(0x52589a), bottom: C(0xf0a066), sun: C(0xff9a50), sunI: 1.9,  hemiI: 0.85 },
    { h: 20.4, top: C(0x2a2050), bottom: C(0x8a4a5a), sun: C(0xb070a0), sunI: 0.7,  hemiI: 0.5 },
    { h: 21.6, top: C(0x0b0e24), bottom: C(0x262a44), sun: C(0x8aa0d0), sunI: 0.5, hemiI: 0.42 },
    { h: 24,   top: C(0x070a1a), bottom: C(0x1a2238), sun: C(0x8aa0d0), sunI: 0.5, hemiI: 0.42 },
];
const GREY = C(0x7d848c);

// The Umbral Plane (Nythoria — DB: "the Umbral Plane of shadow and silence"): no true day, a sun forever eclipsed — a
// black disc in a silver corona — high in a grey sky; the light breathes a little over the hours, never warm.
// Nythoria (2026-11-22: "its own day/night cycle with weather; the day a bit lighter to contrast with the night, keep the
// mood; the moon eclipsed too"): by day the eclipsed sun crosses the sky — a cold grey light, never bright; at night the
// eclipsed moon, ringed in dull red, and a much darker land. Its weather: ash storms (black rain, violet lightning).
function umbralState(hour, weather = 'clear') {
    const arc = Math.PI * (hour - 6) / 12, el = Math.sin(arc), d = Math.max(0, Math.min(1, (el + 0.2) / 0.4));
    const s = {
        top: C(0x08080c).lerp(C(0x2a2c38), d), bottom: C(0x1c1820).lerp(C(0x62646f), d),
        sun: C(0x9a7080).lerp(C(0xc8d0e8), d), sunI: 0.3 + 1.7 * d, hemiI: 0.3 + 0.85 * d, fogMul: 1,
        day: 0.12 + 0.6 * d, night: 1 - d,
        dir: el > -0.05 ? new THREE.Vector3(Math.cos(arc) * 50, Math.max(0.25, el) * 48 + 12, -42) : new THREE.Vector3(36, 46, -34),   // the eclipsed sun by day, the eclipsed moon by night
    };
    const wet = weather === 'rain' ? 0.5 : weather === 'storm' ? 0.8 : weather === 'snow' ? 0.6 : 0;
    if (wet) { s.top.lerp(C(0x101014), wet * 0.6); s.bottom.multiplyScalar(1 - 0.35 * wet); s.sunI *= 1 - 0.5 * wet; s.hemiI *= 1 - 0.2 * wet; s.fogMul = 1 - 0.45 * wet; }
    return s;
}

export function skyState(hour, weather = 'clear', plane = null) {
    if (plane === 'nythoria') return umbralState(hour, weather);
    let i = 0;
    while (i < KEYS.length - 2 && hour >= KEYS[i + 1].h) i++;
    const a = KEYS[i], b = KEYS[i + 1], k = (hour - a.h) / (b.h - a.h);
    const s = {
        top: a.top.clone().lerp(b.top, k), bottom: a.bottom.clone().lerp(b.bottom, k), sun: a.sun.clone().lerp(b.sun, k),
        sunI: a.sunI + (b.sunI - a.sunI) * k, hemiI: a.hemiI + (b.hemiI - a.hemiI) * k, fogMul: 1,
    };
    // The sun climbs from 6:00 to 18:00; at night the light comes from a high, fixed moon.
    const arc = Math.PI * (hour - 6) / 12, el = Math.sin(arc);
    s.day = Math.max(0, Math.min(1, (el + 0.15) / 0.35));
    s.dir = el > 0.05
        ? new THREE.Vector3(Math.cos(arc) * 55, el * 60 + 6, 25)
        : new THREE.Vector3(-30, 55, -35);
    s.night = 1 - s.day;
    const wet = weather === 'rain' ? 0.6 : weather === 'storm' ? 0.85 : weather === 'snow' ? 0.5 : 0;
    if (wet) {
        const lum = (s.bottom.r + s.bottom.g + s.bottom.b) / 3;
        s.top.lerp(GREY.clone().multiplyScalar(lum * 1.1), wet);
        s.bottom.lerp(GREY.clone().multiplyScalar(lum * 1.2), wet);
        s.sunI *= 1 - 0.6 * wet;
        s.hemiI *= 1 - 0.25 * wet;
        s.fogMul = 1 - 0.5 * wet;
    }
    return s;
}

export function createWeather(scene, quality = { particles: 1 }) {
    const group = new THREE.Group();
    group.userData.dynamic = true;
    group.userData.shell = true; scene.add(group);

    // Stars on a dome, fading in at night; a pale moon.
    const N = 700, sp = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
        const a = Math.random() * Math.PI * 2, e = Math.acos(1 - Math.random() * 0.95);
        sp.set([Math.sin(e) * Math.cos(a) * 400, Math.cos(e) * 400, Math.sin(e) * Math.sin(a) * 400], i * 3);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xdfe8ff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
    stars.renderOrder = -1;
    group.add(stars);
    const moon = new THREE.Mesh(new THREE.SphereGeometry(9, 16, 12), new THREE.MeshBasicMaterial({ color: 0xe8ecff, fog: false, transparent: true, opacity: 0 }));
    group.add(moon);

    // Rain: streaks in a box that follows the camera.
    const R = Math.round(1800 * (quality.particles ?? 1)), BOX = 36;
    const rp = new Float32Array(R * 6), seed = new Float32Array(R * 3);
    for (let i = 0; i < R; i++) seed.set([Math.random() * BOX - BOX / 2, Math.random() * 24, Math.random() * BOX - BOX / 2], i * 3);
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rp, 3));
    const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: 0xaab8c8, transparent: true, opacity: 0 }));
    rain.frustumCulled = false;
    group.add(rain);

    let flash = 0, nextFlash = 6, t = 0;
    return {
        // Returns extra ambient light from lightning (0 most of the time).
        update(dt, s, weather, camera, umbral = false) {   // umbral: Nythoria — black rain, ash for snow, no plain moon
            t += dt;
            stars.position.copy(camera.position);
            stars.material.opacity = Math.max(0, s.night - (weather === 'clear' ? 0 : 0.8)) * 0.9;
            moon.position.copy(camera.position).add(new THREE.Vector3(-150, 260, -170));
            moon.material.opacity = umbral ? 0 : stars.material.opacity;
            const snow = weather === 'snow';
            const wet = weather === 'rain' ? 0.55 : weather === 'storm' ? 0.8 : snow ? 0.9 : 0;
            rain.material.color.setHex(umbral ? (snow ? 0x7a7880 : 0x4a4856) : snow ? 0xffffff : 0xaab8c8);
            rain.material.opacity += (wet - rain.material.opacity) * Math.min(1, dt * 0.8);
            rain.visible = rain.material.opacity > 0.01;
            if (rain.visible) {
                const fall = (snow ? 2.6 : weather === 'storm' ? 26 : 19) * t, slant = snow ? 0.05 : weather === 'storm' ? 0.35 : 0.12, len = snow ? 0.07 : 0.7;
                for (let i = 0; i < R; i++) {
                    const drift = snow ? Math.sin(t * 0.8 + i) * 0.6 + t * 0.9 : 0;
                    const x = seed[i * 3] + camera.position.x + drift, z = seed[i * 3 + 2] + camera.position.z;
                    const y = camera.position.y + 14 - ((seed[i * 3 + 1] + fall) % 24);
                    rp.set([x, y, z, x + slant, y - len, z], i * 6);
                }
                rainGeo.attributes.position.needsUpdate = true;
            }
            if (weather === 'storm') {
                nextFlash -= dt;
                if (nextFlash <= 0) { flash = 1; nextFlash = 4 + Math.random() * 9; }
            }
            flash = Math.max(0, flash - dt * 3.5);
            return flash > 0 ? (flash > 0.6 || flash < 0.3 ? flash * 2.5 : 0) : 0;
        },
    };
}
