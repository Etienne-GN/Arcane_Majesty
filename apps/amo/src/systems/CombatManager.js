import Phaser from 'phaser';
import { soundManager } from './SoundManager.js';
import { ITEMS } from '../data/items.js';

export default class CombatManager {
    constructor(scene, player, enemyGroup) {
        this.scene = scene;
        this.player = player;
        this.hitEnemiesThisSwing = new Set();

        scene.physics.add.overlap(player.attackHitbox, enemyGroup, (hitbox, enemy) => {
            if (!player.isAttacking || !hitbox.active) return;
            this.hitTarget(enemy);
        });
    }

    hitTarget(enemy) {
        if (this.hitEnemiesThisSwing.has(enemy)) return;
        this.hitEnemiesThisSwing.add(enemy);

        const isPower   = this.player.isPowerAttack ?? false;
        const stats     = this.player.stats;
        const weaponId  = stats.equipment.weapon;
        const weaponDef = weaponId ? ITEMS[weaponId] : null;
        const enchant   = weaponDef?.enchant ?? null;
        const passive   = weaponDef?.passive ?? null;

        let { dmg, isCrit } = this._calcDamage(isPower);

        // Lore: eclipse_mark — 2× damage on marked enemy, then clear mark
        if (enemy._eclipseMarkTimer > 0) {
            dmg = Math.floor(dmg * 2);
            enemy._eclipseMarkTimer = 0;
            this._spawnNumber(enemy.x, enemy.y - 26, '◈×2', '#cc00cc', true);
        }

        // Passive: execute_strike — 3× damage vs enemies below 30% HP
        if (passive === 'execute_strike' && enemy.health / enemy.maxHealth < 0.30) {
            dmg = Math.floor(dmg * 3);
        }

        // Enchant: void_touched — +40% damage vs shadow/void enemy types
        if (enchant === 'void_touched' && /shadow|void/i.test(enemy.enemyType ?? '')) {
            dmg = Math.floor(dmg * 1.40);
        }

        // Mark for shadow_harvest before death (checked in GameScene gold handler)
        if (passive === 'shadow_harvest' && this.player._shadowVeilActive) {
            enemy._killedInVeil = true;
        }

        enemy.takeDamage(dmg);

        // Post-hit enchant effects
        if (enchant === 'resonant') {
            for (const id of Object.keys(stats.spellCooldowns)) {
                if (stats.spellCooldowns[id] > 0)
                    stats.spellCooldowns[id] = Math.max(0, stats.spellCooldowns[id] - 300);
            }
        }
        if (enchant === 'arcane_surge' && Math.random() < 0.10) {
            stats.mana = Math.min(stats.maxMana, stats.mana + 3);
        }
        if (enchant === 'flame_kissed') {
            const fireDmg = Math.floor(stats.attributes.strength * 0.6);
            if (fireDmg > 0 && enemy.active) enemy.takeDamage(fireDmg);
        }
        if (enchant === 'vampiric') {
            stats.health = Math.min(stats.maxHealth, stats.health + Math.floor(dmg * 0.15));
        }

        // Passive: mana_on_hit — blade strikes grant 2 MP if INT > 12
        if (passive === 'mana_on_hit' && stats.attributes.intelligence > 12) {
            stats.mana = Math.min(stats.maxMana, stats.mana + 2);
        }

        // Lore ability proc
        const loreAbil = weaponDef?.loreAbility;
        if (loreAbil) this._triggerLoreAbility(enemy, dmg, loreAbil);

        const angle   = Phaser.Math.Angle.Between(this.player.x, this.player.y, enemy.x, enemy.y);
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

        this.scene.time.delayedCall(this.player.ATTACK_COOLDOWN, () => {
            this.hitEnemiesThisSwing.delete(enemy);
        });
    }

    _calcDamage(isPower = false) {
        const stats      = this.player.stats;
        const wt         = stats.activeWeaponType;
        const base       = 8 + stats.attributes.strength * 2;
        const strikeBonus = (stats.skills['basic_strike']?.level ?? 0) * 3;
        const slashBonus  = isPower ? (stats.skills['power_slash']?.level ?? 0) * 6 : 0;
        const critChance  = 0.08 + stats.attributes.agility * 0.012 + (stats.skills['keen_eye']?.level ?? 0) * 0.05;
        const isCrit      = !isPower && Math.random() < critChance;
        let dmg = base + strikeBonus + slashBonus + Phaser.Math.Between(-2, 3);

        if (this.player._augmentedStrike) {
            if (wt === 'spell_blade')   dmg = Math.floor(dmg * 1.35 + stats.attributes.intelligence * 1.4);
            if (wt === 'umbral_dagger') dmg = Math.floor(dmg * 0.78);
        }

        if (isPower) dmg = Math.floor(dmg * 1.8);
        if (isCrit)  dmg = Math.floor(dmg * 1.6);
        return { dmg, isCrit };
    }

    _triggerLoreAbility(enemy, dmg, loreAbil) {
        const scene = this.scene;

        if (loreAbil === 'chain_void' && Math.random() < 0.20) {
            // Void pulse — damages all enemies within 50px
            const pulseDmg = Math.floor(dmg * 0.55);
            scene.add.particles(enemy.x, enemy.y, 'particle', {
                speed: { min: 50, max: 140 }, angle: { min: 0, max: 360 },
                scale: { start: 1.1, end: 0 }, lifespan: { min: 200, max: 500 },
                tint: [0x6600cc, 0xcc00ff, 0x220044], quantity: 20, explode: true,
            }).setDepth(65);
            scene.enemies?.getChildren().forEach(e => {
                if (e !== enemy && e.active && Phaser.Math.Distance.Between(enemy.x, enemy.y, e.x, e.y) <= 50)
                    e.takeDamage(pulseDmg);
            });
        }

        if (loreAbil === 'chain_lightning' && Math.random() < 0.25) {
            // Arc to nearest second enemy
            const others = (scene.enemies?.getChildren() ?? [])
                .filter(e => e !== enemy && e.active)
                .sort((a, b) => Phaser.Math.Distance.Between(enemy.x, enemy.y, a.x, a.y) -
                                Phaser.Math.Distance.Between(enemy.x, enemy.y, b.x, b.y));
            const target2 = others[0];
            if (target2) {
                scene.time.delayedCall(100, () => {
                    if (!target2.active) return;
                    target2.takeDamage(Math.floor(dmg * 0.75));
                    scene.add.particles(target2.x, target2.y, 'particle', {
                        speed: { min: 60, max: 160 }, angle: { min: 0, max: 360 },
                        scale: { start: 0.9, end: 0 }, lifespan: { min: 120, max: 300 },
                        tint: [0xffee00, 0xffffff, 0xaaddff], quantity: 14, explode: true,
                    }).setDepth(65);
                    this._spawnNumber(target2.x, target2.y - 18, `⚡${Math.floor(dmg * 0.75)}`, '#ffee44', false);
                });
            }
        }

        if (loreAbil === 'arcane_burst' && Math.random() < 0.20) {
            // Arcane burst hits 2 additional nearby enemies at 60% damage
            const nearby = (scene.enemies?.getChildren() ?? [])
                .filter(e => e !== enemy && e.active && Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y) <= 80)
                .sort((a, b) => Phaser.Math.Distance.Between(this.player.x, this.player.y, a.x, a.y) -
                                Phaser.Math.Distance.Between(this.player.x, this.player.y, b.x, b.y))
                .slice(0, 2);
            nearby.forEach((e, i) => {
                scene.time.delayedCall(60 + i * 50, () => {
                    if (!e.active) return;
                    const burstDmg = Math.floor(dmg * 0.60);
                    e.takeDamage(burstDmg);
                    scene.add.particles(e.x, e.y, 'particle', {
                        speed: { min: 40, max: 100 }, angle: { min: 0, max: 360 },
                        scale: { start: 0.7, end: 0 }, lifespan: { min: 150, max: 320 },
                        tint: [0xcc66ff, 0xffffff], quantity: 10, explode: true,
                    }).setDepth(65);
                });
            });
        }

        if (loreAbil === 'void_stun' && Math.random() < 0.20 && enemy.active) {
            // Momentary void stun (extend stunTimer)
            enemy.stunTimer = Math.max(enemy.stunTimer ?? 0, 550);
            scene.add.particles(enemy.x, enemy.y, 'particle', {
                speed: { min: 20, max: 60 }, angle: { min: 0, max: 360 },
                scale: { start: 0.8, end: 0 }, lifespan: { min: 300, max: 600 },
                tint: [0x6600cc, 0x220044], quantity: 12, explode: true,
            }).setDepth(65);
            this._spawnNumber(enemy.x, enemy.y - 22, 'VOID', '#9900cc', false);
        }

        if (loreAbil === 'shadow_clone' && Math.random() < 0.25) {
            // Phantom second strike at 50% damage — brief delay
            const cloneDmg = Math.floor(dmg * 0.50);
            scene.time.delayedCall(140, () => {
                if (!enemy.active) return;
                enemy.takeDamage(cloneDmg);
                scene.add.particles(enemy.x, enemy.y, 'particle', {
                    speed: { min: 30, max: 80 }, angle: { min: 0, max: 360 },
                    scale: { start: 0.7, end: 0 }, lifespan: { min: 200, max: 450 },
                    tint: [0x440088, 0xcc44ff, 0x220044], quantity: 10, explode: true,
                }).setDepth(65);
                this._spawnNumber(enemy.x + 10, enemy.y - 16, `${cloneDmg}`, '#cc44ff', false);
            });
        }

        if (loreAbil === 'eclipse_mark' && Math.random() < 0.20 && enemy.active) {
            // Mark enemy — next hit within 1.5s deals 2×
            enemy._eclipseMarkTimer = 1500;
            scene.add.particles(enemy.x, enemy.y, 'particle', {
                speed: { min: 10, max: 40 }, angle: { min: 0, max: 360 },
                scale: { start: 0.6, end: 0 }, lifespan: { min: 400, max: 800 },
                tint: [0xcc00cc, 0xffaaff], quantity: 8, explode: true,
            }).setDepth(65);
            this._spawnNumber(enemy.x, enemy.y - 22, '◈', '#cc00cc', false);
        }
    }

    _spawnSparks(x, y, tint, count) {
        const emitter = this.scene.add.particles(x, y, 'particle', {
            speed: { min: 30, max: 90 }, angle: { min: 0, max: 360 },
            scale: { start: 0.9, end: 0 }, lifespan: { min: 150, max: 320 },
            tint, quantity: count, emitting: false,
        }).setDepth(110);
        emitter.explode(count);
        this.scene.time.delayedCall(600, () => { if (emitter.active) emitter.destroy(); });
    }

    _spawnNumber(x, y, msg, color, big) {
        const text = this.scene.add.text(x, y, msg, {
            font: `${big ? 'bold ' : ''}${big ? 14 : 11}px monospace`,
            fill: color, stroke: '#000000', strokeThickness: 2
        }).setDepth(100).setOrigin(0.5);

        this.scene.tweens.add({
            targets: text, y: y - 30, alpha: 0,
            duration: big ? 900 : 700, ease: 'Power1',
            onComplete: () => text.destroy()
        });
    }
}
