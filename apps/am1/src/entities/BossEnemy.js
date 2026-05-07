import Phaser from 'phaser';
import { soundManager } from '../systems/SoundManager.js';

const S = { IDLE: 'idle', CHASE: 'chase', ATTACK: 'attack', DEAD: 'dead' };

export default class BossEnemy extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'spr_boss', 4); // dark phantom, center idle frame
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setCollideWorldBounds(true);
        this.body.setSize(64, 80);
        this.body.setOffset(16, 14);
        this.setDepth(10);

        this.maxHealth   = 350;
        this.health      = this.maxHealth;
        this.damage      = 20;
        this.speed       = 42;
        this.sightRange  = 260;
        this.attackRange = 52;
        this.xpReward    = 280;

        this.state = S.IDLE;
        this.attackCooldown = 0;
        this.ATTACK_COOLDOWN = 1400;
        this.burstCooldown = 0;
        this.BURST_COOLDOWN = 4200;
        this.enraged = false;
        this._phase = 1;
        this._d75 = false;
        this._d50 = false;
        this._d25 = false;

        // Phase 3 attack timers
        this.voidRainCooldown = 0;
        this.VOID_RAIN_COOLDOWN = 5500;
        this.teleportCooldown = 0;
        this.TELEPORT_COOLDOWN = 7000;
        this._teleporting = false;

        this._setupAnims(scene.anims);
        this.play('boss_idle');

        this.healthBar = scene.add.graphics().setDepth(22);
        this._nameText = scene.add.text(x, y - 70, 'VOID GENERAL', {
            font: 'bold 9px monospace', fill: '#cc88ff', stroke: '#000', strokeThickness: 2
        }).setOrigin(0.5).setDepth(22);

        this._drawHealthBar();

        // Ambient dark aura
        this._aura = scene.add.particles(x, y, 'particle', {
            speed: { min: 12, max: 35 },
            angle: { min: 0, max: 360 },
            scale: { start: 1.2, end: 0 },
            lifespan: { min: 500, max: 900 },
            tint: [0x6600cc, 0x440088, 0x220044],
            quantity: 2,
            frequency: 80,
            alpha: { start: 0.9, end: 0 },
        }).setDepth(8);
    }

    _setupAnims(anims) {
        if (anims.exists('boss_idle')) return;
        // Boss 01.png row 1 (dark phantom) = frames 3-5
        anims.create({ key: 'boss_idle', frames: anims.generateFrameNumbers('spr_boss', { frames: [4, 3, 4, 5] }), frameRate: 3, repeat: -1 });
        anims.create({ key: 'boss_move', frames: anims.generateFrameNumbers('spr_boss', { frames: [3, 4, 5, 4] }), frameRate: 5, repeat: -1 });
    }

    _drawHealthBar() {
        const g = this.healthBar;
        g.clear();
        const w = 90, h = 7;
        const bx = this.x - w / 2, by = this.y - 62;
        g.fillStyle(0x111111, 0.85);
        g.fillRect(bx - 1, by - 1, w + 2, h + 2);
        g.fillStyle(0x333333);
        g.fillRect(bx, by, w, h);
        const pct = Math.max(0, this.health / this.maxHealth);
        g.fillStyle(pct > 0.5 ? 0x9900ee : pct > 0.25 ? 0xff4400 : 0xff0000);
        g.fillRect(bx, by, w * pct, h);
        this._nameText?.setPosition(this.x, this.y - 72);
    }

    update(player, delta) {
        if (this.state === S.DEAD || !this.active) return;
        if (this._teleporting) return;

        this.attackCooldown = Math.max(0, this.attackCooldown - delta);
        this.burstCooldown  = Math.max(0, this.burstCooldown  - delta);

        this._drawHealthBar();
        this._aura.setPosition(this.x, this.y - 10);

        const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

        // Phase 3 special attacks — highest priority
        if (this._phase >= 3) {
            this.voidRainCooldown  = Math.max(0, this.voidRainCooldown  - delta);
            this.teleportCooldown  = Math.max(0, this.teleportCooldown  - delta);
            if (this.voidRainCooldown <= 0) {
                this._voidRain(player);
                this.voidRainCooldown = this.VOID_RAIN_COOLDOWN;
                return;
            }
            if (this.teleportCooldown <= 0) {
                this._voidTeleport(player);
                this.teleportCooldown = this.TELEPORT_COOLDOWN;
                return;
            }
        }

        // Shadow burst overrides normal state
        if (dist <= 130 && this.burstCooldown <= 0) {
            this._shadowBurst(player);
            return;
        }

        if (dist <= this.attackRange)     this.state = S.ATTACK;
        else if (dist <= this.sightRange) this.state = S.CHASE;
        else                              this.state = S.IDLE;

        switch (this.state) {
            case S.IDLE:   this.setVelocity(0); this.play('boss_idle', true); break;
            case S.CHASE:  this._chase(player); break;
            case S.ATTACK: this._doAttack(player); break;
        }

        this.setDepth(this.y + 1);
    }

    _chase(player) {
        this.scene.physics.moveTo(this, player.x, player.y, this.speed);
        this.play('boss_move', true);
    }

    _doAttack(player) {
        this.setVelocity(0);
        this.play('boss_idle', true);
        if (this.attackCooldown <= 0) {
            this.attackCooldown = this.ATTACK_COOLDOWN;
            player.takeDamage(this.damage);
            soundManager.hit();
            this.setTint(0xdd44ff);
            this.scene.time.delayedCall(180, () => {
                if (!this.active) return;
                this.enraged ? this.setTint(0xff3300) : this.clearTint();
            });
        }
    }

    _shadowBurst(player) {
        this.burstCooldown = this.BURST_COOLDOWN;
        this.setVelocity(0);
        this.play('boss_idle', true);

        // Burst particle explosion
        this.scene.add.particles(this.x, this.y - 20, 'particle', {
            speed: { min: 70, max: 160 },
            angle: { min: 0, max: 360 },
            scale: { start: 1.8, end: 0 },
            lifespan: { min: 250, max: 550 },
            tint: [0xaa00ff, 0x6600cc, 0xff00cc, 0x330066],
            quantity: 28,
            explode: true,
        }).setDepth(26);

        this.scene.cameras.main.shake(250, 0.012);

        const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
        if (dist <= 110) player.takeDamage(Math.floor(this.damage * 0.75));

        soundManager.hit();
    }

    takeDamage(amount) {
        if (this.state === S.DEAD) return;
        if (this._teleporting) return;
        this.health -= amount;
        soundManager.hit();

        this.setTint(0xffffff);
        this.scene.time.delayedCall(80, () => {
            if (!this.active) return;
            if (this._phase >= 3)  this.setTint(0xff00aa);
            else if (this.enraged) this.setTint(0xff3300);
            else                   this.clearTint();
        });

        const pct = this.health / this.maxHealth;
        const ui  = this.scene.scene.get('UIScene');
        if (!this._d75 && pct <= 0.75) { this._d75 = true; ui?.showNotification?.('Void General: "You carry the scent of failure, scholar."', 3200); }
        if (!this._d50 && pct <= 0.50) { this._d50 = true; ui?.showNotification?.('Void General: "The Void does not yield. Neither do I."', 3200); this._enrage(); }
        if (!this._d25 && pct <= 0.25) { this._d25 = true; ui?.showNotification?.('Void General: "ENOUGH! The Collapse begins — your soul is MINE!"', 3500); this._enterPhase3(); }

        if (this.health <= 0) this._die();
    }

    _enrage() {
        if (this.enraged) return;
        this.enraged = true;
        this.speed = Math.floor(this.speed * 1.6);
        this.damage = Math.floor(this.damage * 1.5);
        this.ATTACK_COOLDOWN *= 0.65;
        this.BURST_COOLDOWN  *= 0.6;
        this.setTint(0xff3300);

        this.scene.cameras.main.flash(500, 255, 30, 0);
        this.scene.cameras.main.shake(280, 0.014);
        this.scene.scene.get('UIScene')?.showNotification?.('The Void General ENRAGES!', 2500);
        this._aura.setParticleColor([0xff4400, 0xff2200, 0xcc1100]);
    }

    _enterPhase3() {
        this._phase = 3;
        this.speed = Math.floor(this.speed * 1.25);
        this.BURST_COOLDOWN  *= 0.65;
        this.voidRainCooldown  = 1200;
        this.teleportCooldown  = 3800;

        this.scene.cameras.main.flash(900, 80, 0, 200);
        this.scene.cameras.main.shake(500, 0.022);
        this.scene.add.particles(this.x, this.y - 20, 'particle', {
            speed: { min: 80, max: 260 }, angle: { min: 0, max: 360 },
            scale: { start: 2.2, end: 0 }, lifespan: { min: 400, max: 1000 },
            tint: [0x8800ff, 0xcc00ff, 0xff0088, 0x000022], quantity: 60, explode: true,
        }).setDepth(26);

        this.setTint(0xff00aa);
        this._nameText?.setText('VOID GENERAL [COLLAPSE]');
        this._aura.setParticleColor([0xff0088, 0xcc0044, 0x880022]);
    }

    _voidRain(player) {
        const COUNT = 6;
        const WARNING_MS = 520;

        this.scene.cameras.main.shake(100, 0.007);

        const positions = [];
        for (let i = 0; i < COUNT; i++) {
            const angle  = (i / COUNT) * Math.PI * 2 + Math.random() * 0.9;
            const radius = 36 + Math.random() * 68;
            positions.push({ x: player.x + Math.cos(angle) * radius, y: player.y + Math.sin(angle) * radius });
        }

        // Telegraphed warning circles
        const warns = positions.map(pos => {
            const g = this.scene.add.graphics().setDepth(30);
            g.fillStyle(0x440000, 0.55);
            g.fillCircle(pos.x, pos.y, 22);
            g.lineStyle(1, 0xff2200, 0.9);
            g.strokeCircle(pos.x, pos.y, 22);
            return g;
        });

        this.scene.time.delayedCall(WARNING_MS, () => {
            warns.forEach(g => g.destroy());
            positions.forEach(pos => {
                this.scene.add.particles(pos.x, pos.y, 'particle', {
                    speed: { min: 30, max: 100 }, angle: { min: 0, max: 360 },
                    scale: { start: 1.3, end: 0 }, lifespan: { min: 200, max: 500 },
                    tint: [0x6600cc, 0x220044, 0xff00cc], quantity: 18, explode: true,
                }).setDepth(28);
                if (player.active && Phaser.Math.Distance.Between(player.x, player.y, pos.x, pos.y) <= 28)
                    player.takeDamage(Math.floor(this.damage * 0.60));
            });
        });
    }

    _voidTeleport(player) {
        if (this._teleporting) return;
        this._teleporting = true;

        // Dissolve at current position
        this.scene.add.particles(this.x, this.y - 20, 'particle', {
            speed: { min: 60, max: 160 }, angle: { min: 0, max: 360 },
            scale: { start: 1.5, end: 0 }, lifespan: { min: 300, max: 700 },
            tint: [0x220044, 0x6600cc, 0x000011], quantity: 26, explode: true,
        }).setDepth(26);
        this.setAlpha(0);
        this.setVelocity(0);

        const offsetX = Phaser.Math.Between(-40, 40);
        const offsetY = Phaser.Math.Between(-40, 40);
        const tx = player.x + offsetX;
        const ty = player.y + offsetY;

        this.scene.time.delayedCall(300, () => {
            if (!this.active) return;
            this.setPosition(tx, ty);
            this.setAlpha(1);
            this._teleporting = false;

            // Materialize VFX
            this.scene.add.particles(tx, ty - 20, 'particle', {
                speed: { min: 80, max: 220 }, angle: { min: 0, max: 360 },
                scale: { start: 2.0, end: 0 }, lifespan: { min: 300, max: 700 },
                tint: [0xff00cc, 0x9900ff, 0x440088], quantity: 36, explode: true,
            }).setDepth(26);
            this.scene.cameras.main.shake(220, 0.016);

            // Immediate burst after landing
            this._shadowBurst(player);
        });
    }

    _die() {
        this.state = S.DEAD;
        this.setVelocity(0);
        this.healthBar.destroy();
        this._nameText?.destroy();
        this._aura.destroy();
        this.disableBody(true, false);
        soundManager.enemyDie();

        // Light pillar VFX at boss position
        if (this.scene.anims.exists('vfx_pillar')) {
            const pillar = this.scene.add.sprite(this.x, this.y - 50, 'vfx_pillar')
                .setDepth(100).setScale(1.2).setAlpha(0.9);
            pillar.play('vfx_pillar');
            pillar.on('animationcomplete', () => pillar.destroy());
        }

        this.scene.cameras.main.flash(700, 160, 0, 255);

        this.scene.tweens.add({
            targets: this,
            alpha: 0, scaleX: 2.2, scaleY: 0.05,
            duration: 600,
            onComplete: () => {
                this.emit('died', this.xpReward);
                this.destroy();
            }
        });
    }

    destroy(fromScene) {
        if (this.healthBar?.active)  this.healthBar.destroy();
        if (this._nameText?.active)  this._nameText.destroy();
        if (this._aura?.active)      this._aura.destroy();
        super.destroy(fromScene);
    }
}
