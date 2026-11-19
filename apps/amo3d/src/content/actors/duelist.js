// A duelist: a story enemy with a body built like the people (models/character.js) — Oren with his shadow-blade,
// Xarathos the Pyre-Lord, Voraun the Silent Executioner, the Shadow Balrog (a giant of shadow). Built on the
// shared enemy core (health, nameplate, codex), with a small duel brain — close in, wind up, strike, step back —
// and the hooks each story fight needs:
//   onLow(frac)        — called once when health falls under `lowAt` (the fight ends in a scene, not a death);
//   takeMult(hit)      — what part of a blow gets through (Xarathos's fire, the Balrog's hunger);
//   onHit(hit)         — anything else a blow does (Voraun turns a spell back on you);
//   channel            — every `every` s it stops and channels for `dur` s (a tell on the ground): tick(dt, ctx)
//                        while it lasts, and a spell landing during it calls `broken` (Xarathos's drain, countered).
import * as THREE from 'three';
import { createCharacter } from '../models/character.js';
import { createEnemyCore } from './enemyCore.js';

export function createDuelist({ scene, map, at, look, name, def, scale = 1, body = null, plateY = null, reach = 1.8, speed = 3.2, windup = 0.45,
    lowAt = 0, onLow = null, takeMult = null, onHit = null, channel = null, aura = null, rng = Math.random }) {
    const model = body ?? createCharacter(look);   // body: a model of its own (the Balrog), same interface
    model.root.scale.setScalar(scale);
    scene.add(model.root);
    const pos = new THREE.Vector3(at.x, map.heightAt(at.x, at.z), at.z);
    const core = createEnemyCore({ type: def.id, name, pos, rng, respawnS: 1e9, def: { ...def }, elite: { boss: true, affixes: [] } });
    const s = core.s;
    const ai = { state: 'idle', timer: 0, heading: at.facing ?? 0, cd: 1.5, hit: false, t: 0, chT: (channel?.every ?? 99), lowDone: false, held: false };
    let ring = null;
    if (aura) { const l = new THREE.PointLight(aura, 10, 9, 1.6); l.position.y = 1.6 * scale; model.root.add(l); }
    const turn = (want, k) => { const d = ((((want - ai.heading) + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) - Math.PI; ai.heading += d * Math.min(1, k); };

    function update(dt, ctx) {
        ai.t += dt;
        if (!core.tick(dt, ctx)) {   // dead (only when the fight allows it): kneel and fade
            model.root.rotation.z = Math.min(Math.PI / 2, s.deadT * 2); model.root.visible = s.deadT < 4;
            return;
        }
        const P = ctx.player.pos, toP = Math.hypot(P.x - pos.x, P.z - pos.z), ang = Math.atan2(P.x - pos.x, P.z - pos.z);
        let move = 0, strikeK = null, castK = null;
        if (!ai.held && !ctx.player.dead) {
            ai.cd -= dt; ai.chT -= dt;
            if (ai.state === 'channel') {
                turn(ang, dt * 4); castK = 0.5;
                channel.tick?.(dt, ctx, api);
                if (ring) { ring.position.set(pos.x, pos.y + 0.05, pos.z); ring.rotation.z += dt * 3; }
                if ((ai.timer -= dt) <= 0) endChannel();
            } else if (channel && ai.chT <= 0 && ai.state !== 'windup' && ai.state !== 'strike') {
                ai.state = 'channel'; ai.timer = channel.dur; ai.chT = channel.every;
                ring ??= new THREE.Mesh(new THREE.RingGeometry(1.1, 1.4, 6).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: channel.color ?? 0xffb040, transparent: true, opacity: 0.7, toneMapped: false, depthWrite: false }));
                ring.visible = true; scene.add(ring); channel.begin?.(ctx, api);
            } else if (ai.state === 'windup') { turn(ang, dt * 8); strikeK = 0.05; if ((ai.timer -= dt) <= 0) { ai.state = 'strike'; ai.timer = 0.32; ai.hit = false; } }
            else if (ai.state === 'strike') {
                strikeK = 1 - ai.timer / 0.32; move = speed * 0.5;
                if (!ai.hit && toP < reach + 0.7) { ai.hit = true; if (ctx.hurtPlayer(def.damage, pos)) core.onDealt(def.damage); }
                if ((ai.timer -= dt) <= 0) { ai.state = 'recover'; ai.timer = 0.5; }
            } else if (ai.state === 'recover') { if ((ai.timer -= dt) <= 0) { ai.state = 'chase'; ai.cd = 0.7 + rng() * 0.8; } }
            else {   // close in
                ai.state = 'chase';
                const g = toP > reach + 1 && map.nav ? map.nav.aim(pos, P, {}, dt) : P;
                turn(Math.atan2(g.x - pos.x, g.z - pos.z), dt * 6);
                if (toP > reach) move = speed; else if (ai.cd <= 0) { ai.state = 'windup'; ai.timer = windup; }
            }
        } else turn(ang, dt * 3);
        const px = pos.x, pz = pos.z;
        pos.x += Math.sin(ai.heading) * move * dt; pos.z += Math.cos(ai.heading) * move * dt;
        map.resolve(pos, 0.5 * scale);
        if (map.blockedAt(pos.x, pos.z, 0.45, pos.y) === 'wall') { pos.x = px; pos.z = pz; }
        const d = Math.hypot(pos.x - P.x, pos.z - P.z), keep = 0.9 * scale;
        if (d < keep && d > 1e-4) { pos.x = P.x + (pos.x - P.x) / d * keep; pos.z = P.z + (pos.z - P.z) / d * keep; }
        pos.y = map.heightAt(pos.x, pos.z);
        model.root.position.copy(pos); model.root.rotation.y = ai.heading;
        model.update(dt, { speed: move, sprinting: move > 3, hopK: null, castK, strikeK, strikeHand: 'R' });
        core.tell(ai.state === 'windup', ai.heading, reach + 0.7);
        core.updatePlate(ctx.camera, plateY ?? 2.4 * scale);
    }
    function endChannel() { ai.state = 'recover'; ai.timer = 0.6; if (ring) ring.visible = false; channel?.end?.(api); }

    function hit(dmg, from, burnMs, ctx, status, element, attacker) {
        if (s.dead) return 'handled';
        const h = { dmg, from, element, ctx, channelling: ai.state === 'channel' };
        if (h.channelling && element && channel?.broken) { endChannel(); channel.broken(api, ctx); }
        onHit?.(h, api);
        const k = takeMult ? takeMult(h, api) : 1;
        if (k <= 0) { s.flash = 0.2; ctx?.floater?.(pos.clone().setY(pos.y + 2.2 * scale), h.label ?? 'absorbed', '#b8a8d8'); return 'handled'; }
        const r = core.hit(Math.max(1, Math.round(dmg * k)), from, burnMs, ctx, status, element, attacker);
        if (lowAt && !ai.lowDone && s.hp <= core.DEF.health * lowAt) { ai.lowDone = true; s.hp = Math.max(1, s.hp); onLow?.(api); }
        if (ai.state === 'idle') ai.state = 'chase';
        return r;
    }
    const api = {
        pos, kind: def.id, root: model.root, elite: { boss: true }, model, s,
        get maxHp() { return core.DEF.health; },
        get alive() { return !s.dead; },
        get engaged() { return !ai.held && ai.state !== 'idle'; },
        get debug() { return { state: ai.state, hp: s.hp }; },
        update, hit,
        heal() { s.hp = core.DEF.health; ai.lowDone = false; },
        hold(v = true) { ai.held = v; if (v && ai.state === 'channel') endChannel(); if (v) ai.state = 'idle'; },   // stop fighting (a scene)
        forceChannel() { ai.chT = 0; },   // tests
        stun(sec) { ai.state = 'recover'; ai.timer = sec; },
        kill(ctx) { s.hp = 0; core.die?.(ctx); s.dead = true; s.deadT = 0; },
        remove() { model.root.parent?.remove(model.root); ring?.parent?.remove(ring); s.dead = true; },
        provoke() { if (ai.state === 'idle') ai.state = 'chase'; },
        net: core.net, snapshot: () => null, applySnapshot: () => {}, credit: () => core.reward(core.lastCtx), reset: () => {},
    };
    return api;
}
