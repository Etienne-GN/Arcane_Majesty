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
        this._d75 = false;
        this._d50 = false;
        this._d25 = false;

        this._setupAnims(scene.anims);
        this.play('boss_idle');

        this.healthBar = scene.add.graphics().setDepth(22);
        this._nameText = scene.add.text(x, y - 70, 'VOID WRAITH', {
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

        this.attackCooldown = Math.max(0, this.attackCooldown - delta);
        this.burstCooldown  = Math.max(0, this.burstCooldown  - delta);

        this._drawHealthBar();
        this._aura.setPosition(this.x, this.y - 10);

        const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

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
        this.health -= amount;
        soundManager.hit();

        this.setTint(0xffffff);
        this.scene.time.delayedCall(80, () => {
            if (!this.active) return;
            this.enraged ? this.setTint(0xff3300) : this.clearTint();
        });

        const pct = this.health / this.maxHealth;
        const ui  = this.scene.scene.get('UIScene');
        if (!this._d75 && pct <= 0.75) { this._d75 = true; ui?.showNotification?.('Void Wraith: "You carry the scent of failure, scholar."', 3200); }
        if (!this._d50 && pct <= 0.50) { this._d50 = true; ui?.showNotification?.('Void Wraith: "The Void does not yield. Neither do I."', 3200); }
        if (!this._d25 && pct <= 0.25) { this._d25 = true; ui?.showNotification?.('Void Wraith: "ENOUGH! I will consume your soul!"', 3200); }

        if (!this.enraged && this.health <= this.maxHealth * 0.5) this._enrage();
        if (this.health <= 0) this._die();
    }

    _enrage() {
        this.enraged = true;
        this.speed = Math.floor(this.speed * 1.6);
        this.damage = Math.floor(this.damage * 1.5);
        this.ATTACK_COOLDOWN *= 0.65;
        this.BURST_COOLDOWN  *= 0.6;
        this.setTint(0xff3300);

        this.scene.cameras.main.flash(500, 255, 30, 0);
        this.scene.get('UIScene')?.showNotification?.('The Void Wraith ENRAGES!', 2500);

        // Intensify aura colour
        this._aura.setParticleColor([0xff4400, 0xff2200, 0xcc1100]);
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
