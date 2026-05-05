import Phaser from 'phaser';
import { playerStats } from '../systems/PlayerStats.js';
import { soundManager } from '../systems/SoundManager.js';

export default class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'player', 1);
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setCollideWorldBounds(true);
        this.body.setSize(20, 20);
        this.body.setOffset(6, 12);
        this.setDepth(10);

        this.facing = 'down';
        this.isAttacking = false;
        this.attackCooldown = 0;
        this.ATTACK_COOLDOWN = 400;

        this.invincible = false;
        this.invincibleTimer = 0;
        this.INVINCIBLE_DURATION = 800;

        // Step sound throttle
        this._stepTimer = 0;

        // Interact zone — positioned in front of player
        this.interactBox = scene.add.zone(x, y, 48, 48);
        scene.physics.add.existing(this.interactBox, false);
        this.interactBox.body.setAllowGravity(false);

        // Attack hitbox — active only during attack frames
        this.attackHitbox = scene.add.zone(x, y, 40, 40);
        scene.physics.add.existing(this.attackHitbox, false);
        this.attackHitbox.body.setAllowGravity(false);
        this.attackHitbox.setActive(false);

        this.stats = playerStats;
        this._setupAnimations(scene);

        // Drop shadow beneath player (32×32 sprite, feet at ~y+14)
        this.shadow = scene.add.ellipse(x, y + 14, 18, 6, 0x000000, 0.30);

        // Power slash cooldown (separate from basic attack)
        this.powerCooldown = 0;
        this.POWER_COOLDOWN = 1200;
    }

    _setupAnimations(scene) {
        const anims = scene.anims;
        if (anims.exists('walk_down')) return;

        // RPG Maker 3×4 layout — same format as enemy sprites (frameWidth:32, frameHeight:32)
        // Row 0: Down (0-2), Row 1: Left (3-5), Row 2: Right (6-8), Row 3: Up (9-11)
        anims.create({ key: 'walk_down',  frames: anims.generateFrameNumbers('player', { frames: [1, 0, 1, 2] }), frameRate: 6, repeat: -1 });
        anims.create({ key: 'walk_left',  frames: anims.generateFrameNumbers('player', { frames: [4, 3, 4, 5] }), frameRate: 6, repeat: -1 });
        anims.create({ key: 'walk_right', frames: anims.generateFrameNumbers('player', { frames: [7, 6, 7, 8] }), frameRate: 6, repeat: -1 });
        anims.create({ key: 'walk_up',    frames: anims.generateFrameNumbers('player', { frames: [10, 9, 10, 11] }), frameRate: 6, repeat: -1 });
        anims.create({ key: 'idle',       frames: [{ key: 'player', frame: 1 }], frameRate: 1, repeat: 0 });
        anims.create({ key: 'attack',     frames: [{ key: 'player', frame: 1 }], frameRate: 12, repeat: 0 });
    }

    update(cursors, wasd, attackKey, powerKey, delta) {
        if (!this.active) return;

        this.attackCooldown = Math.max(0, this.attackCooldown - delta);
        this.powerCooldown  = Math.max(0, this.powerCooldown  - delta);

        // Shadow tracks player position, depth just below feet
        this.shadow.setPosition(this.x, this.y + 14);
        this.shadow.setDepth(this.y - 0.5);

        if (this.invincible) {
            this.invincibleTimer -= delta;
            this.setAlpha(Math.sin(this.invincibleTimer * 0.025) > 0 ? 1 : 0.35);
            if (this.invincibleTimer <= 0) {
                this.invincible = false;
                this.setAlpha(1);
                this.clearTint();
            }
        }

        if (this.isAttacking) {
            this.setVelocity(0);
            this._updateAuxBoxes();
            return;
        }

        const speed = 120;
        let vx = 0, vy = 0;

        if (cursors.left.isDown || wasd.left.isDown)        { vx = -speed; this.facing = 'left'; }
        else if (cursors.right.isDown || wasd.right.isDown) { vx =  speed; this.facing = 'right'; }
        if (cursors.up.isDown || wasd.up.isDown)            { vy = -speed; this.facing = 'up'; }
        else if (cursors.down.isDown || wasd.down.isDown)   { vy =  speed; this.facing = 'down'; }

        if (vx !== 0 && vy !== 0) { vx *= 0.707; vy *= 0.707; }

        this.setVelocity(vx, vy);

        if (vx !== 0 || vy !== 0) {
            const key = `walk_${this.facing}`;
            if (this.anims.currentAnim?.key !== key) this.play(key);

            // Footstep sound
            this._stepTimer -= delta;
            if (this._stepTimer <= 0) {
                this._stepTimer = 320;
                // Very subtle — commented out until audio feels right
                // soundManager._tone(80, 0.04, 'square', 0.05);
            }
        } else {
            if (this.anims.currentAnim?.key !== 'idle') this.play('idle');
        }

        if (Phaser.Input.Keyboard.JustDown(attackKey) && this.attackCooldown <= 0) {
            this._attack();
        }

        if (Phaser.Input.Keyboard.JustDown(powerKey) && this.powerCooldown <= 0) {
            this._powerSlash();
        }

        this._updateAuxBoxes();
    }

    _attack() {
        this.isAttacking = true;
        this.isPowerAttack = false;
        this.attackCooldown = this.ATTACK_COOLDOWN;
        this.setVelocity(0);
        this.play('attack');
        this.setTint(0xffee88);
        this.scene.time.delayedCall(100, () => { if (this.active && !this.invincible) this.clearTint(); });
        this.attackHitbox.setActive(true);
        soundManager.attack();

        this.scene.time.delayedCall(this.ATTACK_COOLDOWN * 0.5, () => {
            this.isAttacking = false;
            this.attackHitbox.setActive(false);
        });
    }

    _powerSlash() {
        // Only usable if power_slash skill is unlocked
        if ((this.stats.skills['power_slash']?.level ?? 0) === 0) {
            // Brief red flash on hitbox area to hint it's locked
            this.setTint(0xff8800);
            this.scene.time.delayedCall(120, () => { if (this.active) this.clearTint(); });
            return;
        }
        this.isAttacking = true;
        this.isPowerAttack = true;
        this.powerCooldown  = this.POWER_COOLDOWN;
        this.attackCooldown = this.ATTACK_COOLDOWN;
        this.setVelocity(0);
        this.play('attack');

        // Temporarily enlarge the hitbox for Power Slash
        this.attackHitbox.body.setSize(60, 60);
        this.attackHitbox.setActive(true);
        soundManager.attack();

        // Camera flash hint
        this.scene.cameras.main.flash(80, 255, 180, 0, true);

        this.scene.time.delayedCall(this.ATTACK_COOLDOWN * 0.5, () => {
            this.isAttacking = false;
            this.isPowerAttack = false;
            this.attackHitbox.setActive(false);
            this.attackHitbox.body.setSize(40, 40);  // restore normal size
        });
    }

    _updateAuxBoxes() {
        const reach = 30;
        const offsets = { down: [0, reach], up: [0, -reach], left: [-reach, 0], right: [reach, 0] };
        const [ox, oy] = offsets[this.facing];
        this.interactBox.setPosition(this.x + ox, this.y + oy);
        this.attackHitbox.setPosition(this.x + ox, this.y + oy);
    }

    takeDamage(amount) {
        if (this.invincible || !this.active) return;
        this.stats.health = Math.max(0, this.stats.health - amount);
        this.invincible = true;
        this.invincibleTimer = this.INVINCIBLE_DURATION;
        this.setTint(0xff4444);
        this.scene.cameras.main.shake(80, 0.006);
        soundManager.playerHit();

        if (this.stats.health <= 0) this.emit('died');
    }

    destroy(fromScene) {
        this.shadow?.destroy();
        this.interactBox?.destroy();
        this.attackHitbox?.destroy();
        super.destroy(fromScene);
    }
}
