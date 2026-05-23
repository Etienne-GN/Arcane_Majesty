import Phaser from 'phaser';
import { soundManager } from '../systems/SoundManager.js';
import { playerStats } from '../systems/PlayerStats.js';
import { statusManager } from '../systems/StatusManager.js';
import { buildEntityAnims } from '../utils/buildEntityAnims.js';

const STATE = { PATROL: 'patrol', CHASE: 'chase', ATTACK: 'attack', FLEE: 'flee', STUNNED: 'stunned', DEAD: 'dead' };

export default class Enemy extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, typeDef = {}) {
        const spriteKey = typeDef.spriteKey ?? 'spr_scout';
        super(scene, x, y, spriteKey, 1);
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.spriteKey    = spriteKey;
        this._bodyUD      = typeDef.bodyConfig   ?? null;  // portrait config (up/down)
        this._bodyLR      = typeDef.bodyConfigLR ?? null;  // landscape config (left/right)
        this.setCollideWorldBounds(true);
        if (typeDef.bodyConfig) {
            const { w, h, ox, oy } = typeDef.bodyConfig;
            this.body.setSize(w, h);
            this.body.setOffset(ox, oy);
        } else {
            this.body.setSize(20, 20);
            this.body.setOffset(6, 12);
        }
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
        this.passive      = typeDef.passive      ?? false;
        this.grazes       = typeDef.grazes       ?? false;
        this.fleeRadius   = typeDef.fleeRadius  ?? 80;
        this.stationary   = typeDef.stationary  ?? false;
        this.keepDistance = typeDef.keepDistance ?? false;
        this.minRange     = typeDef.minRange     ?? 70;
        this.splitOnDeath = typeDef.splitOnDeath ?? null;
        this.aoeOnDeath   = typeDef.aoeOnDeath   ?? null;

        // Network sync: set by GameScene when this is a follower client
        this.netId       = -1;
        this.isNetworked = false; // true = skip AI, lerp to authority position
        this._netTargetX = null;
        this._netTargetY = null;

        this.state = STATE.PATROL;
        this.prevState = STATE.PATROL;
        this.facing = 'down';
        this.origin = new Phaser.Math.Vector2(x, y);
        this.patrolTarget = new Phaser.Math.Vector2(x, y);
        this.patrolTimer = 0;
        this.attackCooldown = 0;
        this.ATTACK_COOLDOWN = 1100;
        this.stunTimer = 0;

        buildEntityAnims(scene.anims, spriteKey, typeDef.animProfile ?? 'rpgmaker_32');
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
        // Swap physics body when the entity uses different-sized frames per axis
        if (direction === 'left' || direction === 'right') {
            if (this._bodyLR) this.body.setSize(this._bodyLR.w, this._bodyLR.h).setOffset(this._bodyLR.ox, this._bodyLR.oy);
        } else {
            if (this._bodyUD) this.body.setSize(this._bodyUD.w, this._bodyUD.h).setOffset(this._bodyUD.ox, this._bodyUD.oy);
        }
    }

    // Called on follower clients — smoothly interpolates to authority position
    applyNetState(x, y, health, facing) {
        this._netTargetX = x;
        this._netTargetY = y;
        this.health  = health;
        this.facing  = facing;
    }

    update(player, delta) {
        if (this.state === STATE.DEAD || !this.active) return;

        // Networked mode: server drives position; client still handles local combat
        if (this.isNetworked) {
            if (this._netTargetX !== null) {
                this.x = Phaser.Math.Linear(this.x, this._netTargetX, 0.20);
                this.y = Phaser.Math.Linear(this.y, this._netTargetY, 0.20);
            }
            this._drawHealthBar();
            if (!this.passive) {
                this.attackCooldown = Math.max(0, this.attackCooldown - delta);
                statusManager.tick(this, delta);
                const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
                if (dist <= this.attackRange) this._doAttack(player);
            }
            return;
        }

        this.attackCooldown = Math.max(0, this.attackCooldown - delta);
        if (this._eclipseMarkTimer > 0) this._eclipseMarkTimer = Math.max(0, this._eclipseMarkTimer - delta);
        statusManager.tick(this, delta);
        this._drawHealthBar();

        // Status stuns take priority over AI state
        if (statusManager.isStunned(this)) {
            this.setVelocity(0);
            return;
        }

        if (this.state === STATE.STUNNED) {
            this.stunTimer -= delta;
            if (this.stunTimer <= 0) this.state = STATE.PATROL;
            this.setVelocity(0);
            return;
        }

        this.prevState = this.state;
        const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

        // Aetheric Sight: GameScene flags _aethericSightActive to slow enemies
        const sightSlow  = this.scene._aethericSightActive ? 0.25 : 1;
        const statusSlow = statusManager.speedMult(this);
        const speedMult  = sightSlow * statusSlow;

        if (this.passive) {
            if (dist <= this.fleeRadius) {
                if (this.prevState !== STATE.FLEE) this._showAlert('!', '#ffcc44');
                this.state = STATE.FLEE;
            } else if (this.state === STATE.FLEE) {
                this.state = STATE.PATROL;
            }
            switch (this.state) {
                case STATE.PATROL: this._patrol(delta, speedMult); break;
                case STATE.FLEE:   this._flee(player, speedMult);  break;
            }
        } else if (this.stationary) {
            // Stationary: never moves, attacks anything in range
            this.setVelocity(0);
            if (dist <= this.attackRange) this._doAttack(player);
        } else {
            const scentMult      = 1 + (playerStats.manaScent / 100) * 2;
            const effectiveSight = this.sightRange * scentMult;

            if (this.keepDistance) {
                // Ranged: back away if too close, attack from distance
                if (dist <= this.attackRange)          this.state = STATE.ATTACK;
                else if (dist <= effectiveSight)       this.state = STATE.CHASE;
                else if (this.state === STATE.CHASE)   this.state = STATE.PATROL;

                if (this.prevState === STATE.PATROL && this.state === STATE.CHASE) {
                    this._showAlert('!', '#ff4444');
                }

                switch (this.state) {
                    case STATE.PATROL: this._patrol(delta, speedMult); break;
                    case STATE.CHASE:
                        if (dist < this.minRange) this._flee(player, speedMult * 0.8);
                        else this.setVelocity(0); // hold position at ideal range
                        break;
                    case STATE.ATTACK: this._doAttack(player); break;
                }
            } else {
                if (dist <= this.attackRange)           this.state = STATE.ATTACK;
                else if (dist <= effectiveSight)        this.state = STATE.CHASE;
                else if (this.state === STATE.CHASE)    this.state = STATE.PATROL;

                if (this.prevState === STATE.PATROL && this.state === STATE.CHASE) {
                    this._showAlert(dist > this.sightRange ? '?!' : '!', '#ff4444');
                }

                switch (this.state) {
                    case STATE.PATROL: this._patrol(delta, speedMult); break;
                    case STATE.CHASE:  this._chase(player, speedMult); break;
                    case STATE.ATTACK: this._doAttack(player); break;
                }
            }
        }

        // Play movement animation based on velocity
        const vx = this.body.velocity.x, vy = this.body.velocity.y;
        if (this.state === STATE.ATTACK || (Math.abs(vx) < 4 && Math.abs(vy) < 4)) {
            const grazeKey = `${this.spriteKey}_graze_${this.facing}`;
            const idleKey  = `${this.spriteKey}_idle`;
            const target = (this.grazes && this.scene.anims.exists(grazeKey)) ? grazeKey : idleKey;
            if (this.anims.currentAnim?.key !== target) this.play(target, true);
        } else if (Math.abs(vx) > Math.abs(vy)) {
            this._playAnim(vx > 0 ? 'right' : 'left');
        } else {
            this._playAnim(vy > 0 ? 'down' : 'up');
        }
    }

    _patrol(delta, speedMult = 1) {
        this.patrolTimer -= delta;
        const dist = Phaser.Math.Distance.Between(this.x, this.y, this.patrolTarget.x, this.patrolTarget.y);
        if (dist < 8 || this.patrolTimer <= 0) {
            this.patrolTimer = Phaser.Math.Between(1500, 3500);
            const angle = Math.random() * Math.PI * 2;
            const r = Math.random() * this.patrolRadius;
            this.patrolTarget.set(this.origin.x + Math.cos(angle) * r, this.origin.y + Math.sin(angle) * r);
        }
        this.scene.physics.moveTo(this, this.patrolTarget.x, this.patrolTarget.y, this.speed * 0.4 * speedMult);
    }

    _chase(player, speedMult = 1) {
        this.scene.physics.moveTo(this, player.x, player.y, this.speed * speedMult);
    }

    _flee(player, speedMult = 1) {
        const angle = Phaser.Math.Angle.Between(player.x, player.y, this.x, this.y);
        const spd = this.speed * speedMult * (this._panicFlee ? 1.4 : 1);
        this.setVelocity(Math.cos(angle) * spd, Math.sin(angle) * spd);
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
            statusManager._updateTint(this);
        });

        if (this.passive) {
            // Wildlife panics when hit — no stun, just faster flee
            this.state = STATE.FLEE;
            this._panicFlee = true;
            this.scene.time.delayedCall(2000, () => { this._panicFlee = false; });
        } else {
            this.state = STATE.STUNNED;
            this.stunTimer = 180;
            this.setVelocity(0);
        }

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

        if (this.aoeOnDeath)   this.emit('aoeDeath', this.x, this.y, this.aoeOnDeath.radius, this.aoeOnDeath.damage);
        if (this.splitOnDeath) {
            const offsets = [{ x: -14, y: 0 }, { x: 14, y: 0 }, { x: 0, y: -14 }];
            for (let i = 0; i < this.splitOnDeath.count; i++) {
                const off = offsets[i % offsets.length];
                this.emit('split', this.splitOnDeath.type, this.x + off.x, this.y + off.y);
            }
        }

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
