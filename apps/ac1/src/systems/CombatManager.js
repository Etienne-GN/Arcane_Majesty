import Phaser from 'phaser';
import { soundManager } from './SoundManager.js';

export default class CombatManager {
    constructor(scene, player, enemyGroup) {
        this.scene = scene;
        this.player = player;
        this.hitEnemiesThisSwing = new Set();

        scene.physics.add.overlap(player.attackHitbox, enemyGroup, (hitbox, enemy) => {
            if (!player.isAttacking || !hitbox.active) return;
            if (this.hitEnemiesThisSwing.has(enemy)) return;
            this.hitEnemiesThisSwing.add(enemy);

            const isPower = player.isPowerAttack ?? false;
            const { dmg, isCrit } = this._calcDamage(isPower);
            enemy.takeDamage(dmg);

            // Knockback: push enemy away from player
            const angle = Phaser.Math.Angle.Between(player.x, player.y, enemy.x, enemy.y);
            const kbForce = isPower ? 220 : 130;
            if (enemy.body) {
                enemy.body.velocity.x += Math.cos(angle) * kbForce;
                enemy.body.velocity.y += Math.sin(angle) * kbForce;
            }

            if (isCrit) {
                soundManager.critHit();
                this._spawnNumber(enemy.x, enemy.y - 24, `${dmg}!`, '#ffdd00', true);
                this._spawnSparks(enemy.x, enemy.y, 0xffdd00, 8);
            } else if (isPower) {
                this._spawnNumber(enemy.x, enemy.y - 22, `${dmg}`, '#ff8800', true);
                this._spawnSparks(enemy.x, enemy.y, 0xff8800, 6);
            } else {
                this._spawnNumber(enemy.x, enemy.y - 20, `${dmg}`, '#ff5555', false);
                this._spawnSparks(enemy.x, enemy.y, 0xff4422, 4);
            }

            scene.time.delayedCall(player.ATTACK_COOLDOWN, () => {
                this.hitEnemiesThisSwing.delete(enemy);
            });
        });
    }

    _calcDamage(isPower = false) {
        const stats = this.player.stats;
        const base = 8 + stats.attributes.strength * 2;
        const strikeBonus = (stats.skills['basic_strike']?.level ?? 0) * 3;
        const slashBonus  = isPower ? (stats.skills['power_slash']?.level ?? 0) * 6 : 0;
        const critChance  = 0.08 + stats.attributes.agility * 0.012;
        const isCrit      = !isPower && Math.random() < critChance;
        let dmg = base + strikeBonus + slashBonus + Phaser.Math.Between(-2, 3);
        if (isPower) dmg = Math.floor(dmg * 1.8);
        if (isCrit)  dmg = Math.floor(dmg * 1.6);
        return { dmg, isCrit };
    }

    _spawnSparks(x, y, tint, count) {
        const emitter = this.scene.add.particles(x, y, 'particle', {
            speed: { min: 30, max: 90 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.9, end: 0 },
            lifespan: { min: 150, max: 320 },
            tint,
            quantity: count,
            emitting: false,
        }).setDepth(110);
        emitter.explode(count);
        this.scene.time.delayedCall(600, () => { if (emitter.active) emitter.destroy(); });
    }

    _spawnNumber(x, y, msg, color, big) {
        const text = this.scene.add.text(x, y, msg, {
            font: `${big ? 'bold ' : ''}${big ? 14 : 11}px monospace`,
            fill: color,
            stroke: '#000000',
            strokeThickness: 2
        }).setDepth(100).setOrigin(0.5);

        this.scene.tweens.add({
            targets: text,
            y: y - 30,
            alpha: 0,
            duration: big ? 900 : 700,
            ease: 'Power1',
            onComplete: () => text.destroy()
        });
    }
}
