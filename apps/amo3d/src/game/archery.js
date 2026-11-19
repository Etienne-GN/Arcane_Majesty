// Archery — amo C5 rules: with a bow or crossbow in hand, the strike button shoots. Each shot takes
// one arrow/bolt off the quiver (PlayerStats.takeAmmo), flies with a little drop, and deals amo's
// ranged damage: (8 + 1.5×STR + INT ± a little) × weapon dmgMult × mastery bonus × the ammo's mult.
// Arrows that hit are counted on the enemy (recordHit); about a third come back when it dies
// (ammoBack). Out of a fight for 3 s, the quiver refills from the satchel (refillQuiver).
import * as THREE from 'three';
import { ammo as A, weapons as weaponRules, mastery as M, items as itemRules, statuses } from '@rules';

const { AMMO, REFILL_MS, recordHit, ammoBack } = A;
const { WEAPON_TYPES, typeOf } = weaponRules;
const { STATUS_DEFS } = statuses;
const SPEED = 34, GRAVITY = 6;

export function createArchery({ stats, player, hud, cam, world, loot }) {
    const group = new THREE.Group();
    const shafts = [];
    const shaftGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.75, 4).rotateX(Math.PI / 2);
    const headGeo = new THREE.ConeGeometry(0.025, 0.08, 4).rotateX(Math.PI / 2).translate(0, 0, 0.41);
    const fletchGeo = new THREE.BoxGeometry(0.06, 0.002, 0.1).translate(0, 0, -0.33);
    const wood = new THREE.MeshStandardMaterial({ color: 0x8a6a44, flatShading: true });
    const steel = new THREE.MeshStandardMaterial({ color: 0xbfc4cc, metalness: 0.7, roughness: 0.3, flatShading: true });
    const feather = new THREE.MeshStandardMaterial({ color: 0xeeeeee, side: THREE.DoubleSide });
    let cd = 0, calm = 0;

    const weaponType = () => typeOf(itemRules.ITEMS[stats.equipment.weapon]);
    const armed = () => !!WEAPON_TYPES[weaponType()]?.ammo;
    const rangedMult = () => Object.keys(player.state.buffs).reduce((m, id) => m * (STATUS_DEFS[id]?.rangedMult ?? 1), 1);

    function makeArrow(kind) {
        const g = new THREE.Group();
        g.add(new THREE.Mesh(shaftGeo, wood), new THREE.Mesh(headGeo, steel));
        const f = new THREE.Mesh(fletchGeo, feather);
        g.add(f, f.clone().rotateZ(Math.PI / 2));
        return g;
    }

    // opts (style skills): mult, rangeMult, status { id, ms }, pierce — a skill shot ignores the bow's own cooldown
    function shoot(opts = null) {
        const p = player.state;
        if (!armed() || (cd > 0 && !opts) || p.dead || p.cast) return false;
        const type = weaponType(), W = WEAPON_TYPES[type];
        let id = stats.takeAmmo(W.ammo);
        if (!id && stats.refillQuiver(W.ammo)) id = stats.takeAmmo(W.ammo);
        if (!id) { hud.message(W.ammo === 'bolt' ? 'Out of bolts' : 'Out of arrows'); return false; }
        cd = (W.cooldown / 1000) * M.levelCooldownMult(stats.weaponLevel(type));
        const aim = cam.forward();
        p.facing = Math.atan2(aim.x, aim.z);
        player.playShot();
        const from = p.pos.clone().setY(p.pos.y + 1.45).addScaledVector(aim, 0.5);
        const mesh = makeArrow(AMMO[id]?.type);
        mesh.position.copy(from);
        group.add(mesh);
        const range = (W.range / 32) * 3 * (opts?.rangeMult ?? 1);   // 3D tuning, as for the fireball
        if (opts) mesh.scale.setScalar(1.25);
        shafts.push({ id, type, mesh, pos: from, vel: aim.clone().multiplyScalar(SPEED * (opts?.rangeMult ? 1.2 : 1)).setY(1.2), travelled: 0, range, stuck: 0, opts, struck: new Set() });
        return true;
    }

    function damage(id, type) {
        const W = WEAPON_TYPES[type];
        const base = 8 + stats.attributes.strength * 1.5 + stats.attributes.intelligence * 1.0 + Math.floor(Math.random() * 6) - 2;
        return Math.max(1, Math.floor(base * W.dmgMult * M.levelDamageMult(stats.weaponLevel(type)) * (AMMO[id]?.mult ?? 1) * rangedMult()));
    }

    const tmp = new THREE.Vector3();
    function update(dt) {
        cd = Math.max(0, cd - dt);
        const m = world.current;
        // Quiver refills after a while out of the fight.
        calm = (m.hittables ?? []).some(h => h.engaged) ? 0 : calm + dt * 1000;
        if (calm > REFILL_MS && armed()) { stats.refillQuiver(WEAPON_TYPES[weaponType()].ammo); calm = 0; }

        for (let i = shafts.length - 1; i >= 0; i--) {
            const s = shafts[i];
            if (s.stuck) {   // sticking in the ground for a moment
                s.stuck -= dt;
                if (s.stuck <= 0) { group.remove(s.mesh); shafts.splice(i, 1); }
                continue;
            }
            const steps = 4;
            let done = false;
            for (let k = 0; k < steps && !done; k++) {
                s.vel.y -= GRAVITY * dt / steps;
                tmp.copy(s.vel).multiplyScalar(dt / steps);
                s.pos.add(tmp);
                s.travelled += tmp.length();
                for (const h of m.hittables ?? []) {
                    if (!h.alive || s.struck.has(h) || Math.hypot(h.pos.x - s.pos.x, h.pos.z - s.pos.z) > 0.5 || s.pos.y < h.pos.y || s.pos.y > h.pos.y + 2.1) continue;
                    const dmg = Math.max(1, Math.round(damage(s.id, s.type) * (s.opts?.mult ?? 1)));
                    h.hit(dmg, player.state.pos, 0, player.lastCtx, s.opts?.status ?? (AMMO[s.id]?.status ? { id: AMMO[s.id].status } : null));
                    s.struck.add(h);
                    if (h.kind === 'deer') hud.floater(h.pos.clone().setY(h.pos.y + 1.9), `${dmg}`, '#ffe0a0');
                    const killed = !h.alive;
                    recordHit(h, s.id, killed);
                    stats.gainWeaponPoints(s.type, M.hitGain(killed));
                    if (killed) for (const back of ammoBack(h._ammoIn, h._blownUp)) {
                        for (let n = 0; n < back.qty; n++) loot.drop([{ id: back.id, chance: 1 }], h.pos);
                        h._ammoIn = null;
                    }
                    if (s.opts?.pierce) continue;   // through, to the next in the row
                    group.remove(s.mesh); shafts.splice(i, 1);
                    done = true;
                    break;
                }
                if (done) break;
                if (m.projectileHit(s.pos) || s.travelled > s.range) { s.stuck = 6; done = true; }
            }
            if (shafts[i] === s) {
                s.mesh.position.copy(s.pos);
                if (!s.stuck) s.mesh.lookAt(tmp.copy(s.pos).add(s.vel));
            }
        }
    }

    return {
        armed, shoot, update,
        setScene(scene) { scene.add(group); },
        ready: () => (armed() ? stats.readyAmmo(WEAPON_TYPES[weaponType()].ammo) : null),
        spare: () => (armed() ? stats.spareAmmo(WEAPON_TYPES[weaponType()].ammo) : null),
    };
}
