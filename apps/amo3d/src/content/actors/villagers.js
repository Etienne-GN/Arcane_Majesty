// Villagers for region maps (the Crossroads, Port Silver, Iron Hollow, Duskmeet, Graywatch…): people built from the
// Forge's archetypes who stand at their post or stroll a little round it, and talk when you press G.
//   role 'merchant'  — opens the shop (npc.catalog: a CATALOGS key, e.g. 'armourer'; none = the general wares)
//   role 'innkeeper' — a room for the night (gold): health, mana and vigor restored, the clock to the next morning
//   anyone else      — one of their own lines (people[].lines), a different one each time
// Region JSON: "people": [{ "name", "role", "x", "z", "facing", "archetype", "colors", "wander", "lines", "catalog", "price" }]
import * as THREE from 'three';
import { createCharacter } from '../models/character.js';
import { ARCHETYPES } from '../models/archetypes.js';
import { gameClock as clockRules } from '@rules';

const ROLE_ARCH = { merchant: 'trader', innkeeper: 'civilian', guard: 'guard', soldier: 'soldier', miner: 'peasant', fisher: 'peasant', farmer: 'peasant', noble: 'noble', child: 'child', mage: 'mage' };

function lookFor(p, i) {
    const A = ARCHETYPES[p.archetype ?? ROLE_ARCH[p.role] ?? 'civilian'] ?? ARCHETYPES.civilian;
    const base = JSON.parse(JSON.stringify(A.look ?? A));
    base.body = { ...(base.body ?? {}), ...(p.body ?? {}) };
    const skins = ['#e2b48f', '#c89a74', '#a8785a', '#f0c8a8', '#8a5e44'];
    if (!p.body?.skin) base.body.skin = skins[i % skins.length];
    for (const [slot, c] of Object.entries(p.colors ?? {})) if (base.parts?.[slot]) base.parts[slot].colors = { ...(base.parts[slot].colors ?? {}), ...c };
    if (p.hair) base.hair = { ...(base.hair ?? {}), ...p.hair };
    return base;
}

export function createVillagers({ scene, map, people: defs, rng = Math.random }) {
    const people = defs.map((d, i) => {
        const model = createCharacter(lookFor(d, i));
        const y = map.heightAt(d.x, d.z);
        model.root.position.set(d.x, y, d.z);
        model.root.rotation.y = d.facing ?? 0;
        scene.add(model.root);
        const id = `${map.id}_${d.name.toLowerCase().replace(/[^a-z]+/g, '_')}`;
        const npc = { id, name: d.name, isShop: d.role === 'merchant', catalog: d.catalog, dialogue: [{ speaker: d.name, text: d.greeting ?? (d.lines?.[0] ?? 'Welcome.') }] };
        const person = {
            model, pos: model.root.position, height: 2.2, shown: true, activity: 'work',
            home: { x: d.x, z: d.z, facing: d.facing ?? 0 }, wander: d.wander ?? 0, target: null, wait: rng() * 4, line: 0,
            r: { id, role: d.role ?? 'villager', npc },
        };
        if (d.role === 'innkeeper') person.r.onTalk = api => innTalk(api, d);
        else if (d.role !== 'merchant') person.r.onTalk = api => { const L = d.lines?.length ? d.lines : ['Good day.']; api.start([{ speaker: d.name, text: L[person.line++ % L.length] }]); };
        return person;
    });

    function innTalk(api, d) {
        const price = d.price ?? 8, s = api.stats;
        api.start([{ speaker: d.name, text: d.greeting ?? `A bed and a hot meal for the night — ${price} gold.`, choices: [
            { text: `Take a room (${price} gold)`, onPick: () => {
                if ((s.gold ?? 0) < price) { api.hud.message(`You need ${price} gold for a room.`); return; }
                s.gold -= price;
                const now = s.gameMinutes ?? 0, h = clockRules.gameHour(now), toMorning = ((7 - h + 24) % 24 || 24) * 60;
                clockRules.advanceClock(s, toMorning * 60 * 1000 / clockRules.MINUTES_PER_REAL_SECOND / 60);
                s.health = s.maxHealth; s.mana = s.maxMana; if (s.maxVigor) s.vigor = s.maxVigor;
                api.hud.banner('You sleep through to the morning — rested');
                api.save?.();
            } },
            { text: 'Not tonight' },
        ] }]);
    }

    return {
        people,
        update(dt) {
            for (const p of people) {
                let speed = 0;
                if (p.wander > 0) {
                    if (!p.target && (p.wait -= dt) <= 0) { const a = rng() * 6.28, r = rng() * p.wander; p.target = { x: p.home.x + Math.cos(a) * r, z: p.home.z + Math.sin(a) * r }; }
                    if (p.target) {
                        const dx = p.target.x - p.pos.x, dz = p.target.z - p.pos.z, d = Math.hypot(dx, dz);
                        if (d < 0.3 || map.blockedAt(p.pos.x + dx / d * 0.4, p.pos.z + dz / d * 0.4, 0.3) === 'wall') { p.target = null; p.wait = 3 + rng() * 6; }
                        else { speed = 1.1; p.pos.x += dx / d * speed * dt; p.pos.z += dz / d * speed * dt; p.model.root.rotation.y = Math.atan2(dx, dz); p.pos.y = map.heightAt(p.pos.x, p.pos.z); }
                    }
                }
                p.model.update(dt, { speed, sprinting: false, hopK: null });
            }
        },
        setVisible(v) { for (const p of people) p.model.root.visible = v; },
        nearestPerson(pos, within = 2.6) { let best = null, bd = within; for (const p of people) { const d = Math.hypot(p.pos.x - pos.x, p.pos.z - pos.z); if (d < bd) { bd = d; best = p; } } return best; },
    };
}
