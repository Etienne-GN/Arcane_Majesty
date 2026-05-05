import Phaser from 'phaser';
import { soundManager } from '../systems/SoundManager.js';

const STATE = { PATROL: 'patrol', CHASE: 'chase', ATTACK: 'attack', STUNNED: 'stunned', DEAD: 'dead' };

// RPG Maker-style 3×4 walk layout (frameWidth:32, frameHeight:32 from a 96×128 sheet)
// Row 0: Down (frames 0-2), Row 1: Left (3-5), Row 2: Right (6-8), Row 3: Up (9-11)
function ensureEnemyAnims(anims, key) {
    const id = `${key}_`;
    if (anims.exists(`${id}walk_down`)) return;
    anims.create({ key: `${id}walk_down`,  frames: anims.generateFrameNumbers(key, { frames: [1, 0, 1, 2] }), frameRate: 6, repeat: -1 });
    anims.create({ key: `${id}walk_left`,  frames: anims.generateFrameNumbers(key, { frames: [4, 3, 4, 5] }), frameRate: 6, repeat: -1 });
    anims.create({ key: `${id}walk_right`, frames: anims.generateFrameNumbers(key, { frames: [7, 6, 7, 8] }), frameRate: 6, repeat: -1 });
    anims.create({ key: `${id}walk_up`,    frames: anims.generateFrameNumbers(key, { frames: [10, 9, 10, 11] }), frameRate: 6, repeat: -1 });
    anims.create({ key: `${id}idle`,       frames: [{ key, frame: 1 }], frameRate: 1, repeat: 0 });
}

export default class Enemy extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, typeDef = {}) {
        const spriteKey = typeDef.spriteKey ?? 'spr_scout';
        super(scene, x, y, spriteKey, 1);
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.spriteKey = spriteKey;
        this.setCollideWorldBounds(true);
        this.body.setSize(20, 20);
        this.body.setOffset(6, 12);
        this.setDepth(9);

        if (typeDef.tint) this.setTint(typeDef.tint);
        this._baseTint = typeDef.tint ?? null;

        this.maxHealth   = typeDef.health       ?? 30;
        this.health      = this.maxHealth;
        this.damage      = typeDef.damage       ?? 8;
        this.speed       = typeDef.speed        ?? 55;
        this.sightRange  = typeDef.sightRange   ?? 110;
        this.attackRange = typeDef.attackRange  ?? 28;
        this.xpReward    = typeDef.xpReward     ?? 20;
        this.patrolRadius = typeDef.patrolRadius ?? 64;
        this.lootTable   = typeDef.lootTable    ?? [];
        this.goldDrop    = typeDef.goldDrop     ?? Phaser.Math.Between(1, 4);

        this.state = STATE.PATROL;
        this.prevState = STATE.PATROL;
        this.facing = 'down';
        this.origin = new Phaser.Math.Vector2(x, y);
        this.patrolTarget = new Phaser.Math.Vector2(x, y);
        this.patrolTimer = 0;
        this.attackCooldown = 0;
        this.ATTACK_COOLDOWN = 1100;
        this.stunTimer = 0;

        ensureEnemyAnims(scene.anims, spriteKey);
        this.play(`${spriteKey}_idle`);

        this.healthBar = scene.add.graphics().setDepth(20);
        this._drawHealthBar();
    }

    _drawHealthBar() {
        const g = this.healthBar;
        g.clear();
        const w = 22, h = 3;
        const bx = this.x - w / 2, by = this.y - 20;
        g.fillStyle(0x222222);
        g.fillRect(bx, by, w, h);
        g.fillStyle(this.health > this.maxHealth * 0.5 ? 0xcc2222 : 0xff6600);
        g.fillRect(bx, by, w * Math.max(0, this.health / this.maxHealth), h);
    }

    _playAnim(direction) {
        if (this.facing === direction && this.anims.isPlaying) return;
        this.facing = direction;
        this.play(`${this.spriteKey}_walk_${direction}`, true);
    }

    update(player, delta) {
        if (this.state === STATE.DEAD || !this.active) return;

        this.attackCooldown = Math.max(0, this.attackCooldown - delta);
        this._drawHealthBar();

        if (this.state === STATE.STUNNED) {
            this.stunTimer -= delta;
            if (this.stunTimer <= 0) this.state = STATE.PATROL;
            this.setVelocity(0);
            return;
        }

        this.prevState = this.state;
        const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

        if (dist <= this.attackRange)        this.state = STATE.ATTACK;
        else if (dist <= this.sightRange)    this.state = STATE.CHASE;
        else if (this.state === STATE.CHASE) this.state = STATE.PATROL;

        if (this.prevState === STATE.PATROL && this.state === STATE.CHASE) {
            this._showAlert('!', '#ff4444');
        }

        switch (this.state) {
            case STATE.PATROL: this._patrol(delta); break;
            case STATE.CHASE:  this._chase(player); break;
            case STATE.ATTACK: this._doAttack(player); break;
        }

        // Play movement animation based on velocity
        const vx = this.body.velocity.x, vy = this.body.velocity.y;
        if (this.state === STATE.ATTACK || (Math.abs(vx) < 4 && Math.abs(vy) < 4)) {
            const idleKey = `${this.spriteKey}_idle`;
            if (this.anims.currentAnim?.key !== idleKey) this.play(idleKey, true);
        } else if (Math.abs(vx) > Math.abs(vy)) {
            this._playAnim(vx > 0 ? 'right' : 'left');
        } else {
            this._playAnim(vy > 0 ? 'down' : 'up');
        }
    }

    _patrol(delta) {
        this.patrolTimer -= delta;
        const dist = Phaser.Math.Distance.Between(this.x, this.y, this.patrolTarget.x, this.patrolTarget.y);
        if (dist < 8 || this.patrolTimer <= 0) {
            this.patrolTimer = Phaser.Math.Between(1500, 3500);
            const angle = Math.random() * Math.PI * 2;
            const r = Math.random() * this.patrolRadius;
            this.patrolTarget.set(this.origin.x + Math.cos(angle) * r, this.origin.y + Math.sin(angle) * r);
        }
        this.scene.physics.moveTo(this, this.patrolTarget.x, this.patrolTarget.y, this.speed * 0.4);
    }

    _chase(player) {
        this.scene.physics.moveTo(this, player.x, player.y, this.speed);
    }

    _doAttack(player) {
        this.setVelocity(0);
        if (this.attackCooldown <= 0) {
            this.attackCooldown = this.ATTACK_COOLDOWN;
            player.takeDamage(this.damage);
            soundManager.hit();
            this.setTint(0xff8800);
            this.scene.time.delayedCall(150, () => {
                if (!this.active) return;
                if (this._baseTint) this.setTint(this._baseTint); else this.clearTint();
            });
        }
    }

    takeDamage(amount) {
        if (this.state === STATE.DEAD) return;
        this.health -= amount;
        soundManager.hit();

        this.setTint(0xffffff);
        this.scene.time.delayedCall(80, () => {
            if (!this.active) return;
            if (this._baseTint) this.setTint(this._baseTint); else this.clearTint();
        });

        this.state = STATE.STUNNED;
        this.stunTimer = 180;
        this.setVelocity(0);

        if (this.health <= 0) this._die();
    }

    _showAlert(symbol, color) {
        const txt = this.scene.add.text(this.x, this.y - 28, symbol, {
            font: 'bold 14px monospace', fill: color,
            stroke: '#000', strokeThickness: 2
        }).setDepth(500).setOrigin(0.5);

        this.scene.tweens.add({
            targets: txt, y: txt.y - 14, alpha: 0,
            duration: 700, ease: 'Power1',
            onComplete: () => txt.destroy()
        });
    }

    _die() {
        this.state = STATE.DEAD;
        this.setVelocity(0);
        this.healthBar.destroy();
        this.disableBody(true, false);
        soundManager.enemyDie();

        if (this.goldDrop > 0) this.emit('gold', this.goldDrop);

        const drops = [];
        this.lootTable.forEach(entry => {
            if (Math.random() < entry.chance) drops.push(entry.id);
        });
        if (drops.length) this.emit('dropped', this.x, this.y, drops);

        this.scene.tweens.add({
            targets: this,
            alpha: 0, scaleX: 1.5, scaleY: 0.1,
            duration: 320,
            onComplete: () => {
                this.emit('died', this.xpReward);
                this.destroy();
            }
        });
    }

    destroy(fromScene) {
        if (this.healthBar?.active) this.healthBar.destroy();
        super.destroy(fromScene);
    }
}
