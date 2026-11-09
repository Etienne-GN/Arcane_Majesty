// Combat C5: what an arrow or bolt does when it lands. Phaser glue — the rules
// (kinds, what comes back) are in systems/ammo.js.
import Phaser from 'phaser';
import { AMMO, recordHit } from './ammo.js';
import { statusManager } from './StatusManager.js';

// The arrow's own effect on the first enemy it hit, and the count for getting arrows back.
export function ammoImpact(scene, e, kind, dmg) {
    const a = AMMO[kind];
    if (!a) return;
    const killed = !e.active || e.health <= 0;
    recordHit(e, kind, killed);
    if (a.status && !killed) statusManager.apply(e, a.status);
    if (a.burst) burst(scene, e, kind, a.burst, dmg);
}

// An explosive arrow: a ring of fire hurts every other enemy close by.
function burst(scene, first, kind, b, dmg) {
    const x = first.x, y = first.y;
    scene.add.particles(x, y, 'particle', {
        speed: { min: 40, max: 130 }, angle: { min: 0, max: 360 }, scale: { start: 1.1, end: 0 },
        lifespan: { min: 200, max: 420 }, tint: [0xff6622, 0xffcc44, 0xffffff], quantity: 22, explode: true,
    }).setDepth(63);
    scene.cameras.main.shake(90, 0.004);
    for (const o of scene._liveEnemies()) {
        if (o === first || Phaser.Math.Distance.Between(x, y, o.x, o.y) > b.radius) continue;
        const d = Math.max(1, Math.floor(dmg * b.mult * (o === scene.boss ? 0.65 : 1)));
        o.takeDamage(d);
        recordHit(o, kind, !o.active || o.health <= 0);
        scene.combatManager._spawnNumber(o.x, o.y - 20, `${d}`, '#ffaa44', false);
    }
}
