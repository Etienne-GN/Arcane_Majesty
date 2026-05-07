import Phaser from 'phaser';
import { playerStats } from '../systems/PlayerStats.js';
import { soundManager } from '../systems/SoundManager.js';
import { ITEMS } from '../data/items.js';

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

        this.NOVA_RANGE = 80;

        // Shadow Veil state
        this._shadowVeilActive = false;
        this._shadowVeilTimer  = 0;

        // Consecutive bow shot counter (for triple_shot legendary passive)
        this._bowShotCount = 0;

        // Aetheric Tear cooldown (ms remaining)
        this._tearCooldown = 0;
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
        this.stats.tickSpellCooldowns(delta);
        this.stats.tickMana(delta);

        // ── Mana Exhaustion / Collapse ───────────────────────────────────────
        if (this.stats.manaCollapsed) {
            // Stage 3: collapsed — immobile, flicker grey, slowly recover
            this.setVelocity(0);
            if (!this._collapseNotified) {
                this._collapseNotified = true;
                this.scene.get('UIScene')?.showNotification?.('Mana Exhaustion — Eldrin collapses...', 3500);
                this.scene.cameras.main.shake(200, 0.010);
            }
            this.setTint(0xaaaaaa);
            this.setAlpha(Math.sin(Date.now() * 0.003) * 0.2 + 0.7);
            this._updateAuxBoxes();
            return;
        }
        if (!this.stats.manaCollapsed) this._collapseNotified = false;

        // Shadow Veil tick
        if (this._shadowVeilActive) {
            this._shadowVeilTimer -= delta;
            if (this._shadowVeilTimer <= 0) {
                this._shadowVeilActive = false;
                this.setAlpha(1);
                if (!this.invincible) this.clearTint();
            }
        }

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

        // Mana Exhaustion: grey tint, no tint override while active
        if (this.stats.manaExhausted && !this.invincible && !this._shadowVeilActive) {
            this.setTint(0xbbbbbb);
        } else if (!this.stats.manaExhausted && !this.invincible && !this._shadowVeilActive && !this.isAttacking) {
            this.clearTint();
        }

        if (this.isAttacking) {
            this.setVelocity(0);
            this._updateAuxBoxes();
            return;
        }

        // Speed: full AGI-based speed, reduced by fatigue
        const baseSpeed = 100 + this.stats.attributes.agility * 4;
        const speed = Math.floor(baseSpeed * (1 - this.stats.fatigueFraction * 0.75));
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

            this._stepTimer -= delta;
            if (this._stepTimer <= 0) {
                this._stepTimer = 320;
            }
        } else {
            if (this.anims.currentAnim?.key !== 'idle') this.play('idle');
        }

        // Attacks blocked while exhausted
        if (!this.stats.manaExhausted) {
            if (Phaser.Input.Keyboard.JustDown(attackKey) && this.attackCooldown <= 0) {
                this._attack();
            }
            if (Phaser.Input.Keyboard.JustDown(powerKey) && this.powerCooldown <= 0) {
                this._powerSlash();
            }
        }

        this._updateAuxBoxes();
    }

    _weaponCooldown() {
        const t     = this.stats.activeWeaponType;
        const base  = { staff: 400, spell_blade: 480, umbral_dagger: 260, resonance_bow: 650 }[t] ?? 400;
        const swift = ITEMS[this.stats.equipment.weapon]?.enchant === 'swiftness' ? 0.85 : 1;
        return Math.floor(base * swift);
    }

    _attack() {
        this.isAttacking   = true;
        this.isPowerAttack = false;
        const wt = this.stats.activeWeaponType;
        this.attackCooldown = this._weaponCooldown();
        this.setVelocity(0);
        this.play('attack');

        // Mana augmentation for non-staff weapons
        const costMap    = { spell_blade: 2, umbral_dagger: 1, resonance_bow: 3 };
        const manaCost   = costMap[wt] ?? 0;
        const isVoidRend = ITEMS[this.stats.equipment.weapon]?.passive === 'void_rend';
        this._augmentedStrike = false;
        if (manaCost > 0) {
            if (isVoidRend) {
                // void_rend: augmentation is free (no mana cost, no scent spike)
                this._augmentedStrike = true;
            } else if (!this.stats.manaExhausted && this.stats.mana >= manaCost) {
                this.stats.mana -= manaCost;
                this.stats.addManaScent(Math.round(manaCost * 0.3));
                this._augmentedStrike = true;
            }
        }

        // Track consecutive bow shots for triple_shot passive
        if (wt === 'resonance_bow') {
            this._bowShotCount++;
        } else {
            this._bowShotCount = 0;
        }

        // Weapon-specific tint
        const tintMap = { staff: 0xffee88, spell_blade: 0x44eeff, umbral_dagger: 0xcc44ff, resonance_bow: 0x88ffaa };
        this.setTint(tintMap[wt] ?? 0xffee88);
        this.scene.time.delayedCall(100, () => { if (this.active && !this.invincible) this.clearTint(); });
        soundManager.attack();

        if (wt === 'resonance_bow') {
            // Ranged: scene handles damage via _bowStrike after travel delay
            this.scene.time.delayedCall(120, () => {
                if (this.active) this.scene._bowStrike?.(this.x, this.y, this.facing, this._augmentedStrike);
            });
        } else {
            if (wt === 'umbral_dagger') this.attackHitbox.body.setSize(32, 32);
            this.attackHitbox.setActive(true);
        }

        const half = this.attackCooldown * 0.5;
        this.scene.time.delayedCall(half, () => {
            this.isAttacking = false;
            this.attackHitbox.setActive(false);
            this.attackHitbox.body.setSize(40, 40);

            // Umbral Dagger second hit (augmented only)
            if (wt === 'umbral_dagger' && this._augmentedStrike) {
                this.scene.time.delayedCall(70, () => {
                    if (!this.active) return;
                    this.attackHitbox.body.setSize(32, 32);
                    this.attackHitbox.setActive(true);
                    this.setTint(0xcc44ff);
                    this.scene.time.delayedCall(55, () => { if (this.active && !this.invincible) this.clearTint(); });
                    this.scene.time.delayedCall(90, () => {
                        this.attackHitbox.setActive(false);
                        this.attackHitbox.body.setSize(40, 40);
                    });
                });
            }
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

    // ── Spell casting ────────────────────────────────────────────────────────

    _spellCheck(id) {
        if (!this.stats.getSpellLevel(id)) {
            this.scene.get('UIScene')?.showNotification?.(`${id.replace(/_/g,' ')} not yet comprehended.`, 1400);
            this.setTint(0x4455bb);
            this.scene.time.delayedCall(130, () => { if (this.active && !this.invincible) this.clearTint(); });
            return false;
        }
        // Exhaustion: body refuses to cast
        if (this.stats.manaExhausted) {
            this.scene.get('UIScene')?.showNotification?.('Too exhausted to cast — rest and recover.', 1600);
            this.scene.cameras.main.shake(60, 0.004);
            return false;
        }
        if (!this.stats.canCastSpell(id)) return false;
        const cost = this.stats.getSpellManaCost(id);
        if (this.stats.mana < cost) {
            this.scene.get('UIScene')?.showNotification?.('Not enough mana!', 1200);
            return false;
        }
        this.stats.mana -= cost;
        this.stats.startSpellCooldown(id);
        // ManaScent spike proportional to cost
        this.stats.addManaScent(Math.round(cost * 0.55));
        return true;
    }

    // ── Cast methods — validation + player-side effects only ─────────────────
    // World VFX and damage are handled by GameScene._spellVFX / _applySpellEffects

    castFireNova() {
        if (!this._spellCheck('fire_nova')) return false;
        this.setTint(0xff8800);
        this.scene.time.delayedCall(220, () => { if (this.active && !this.invincible) this.clearTint(); });
        soundManager.spell();
        this.stats.gainResonance('fire', 2);
        return true;
    }

    castManaDart() {
        if (!this._spellCheck('mana_dart')) return false;
        this.setTint(0xcc88ff);
        this.scene.time.delayedCall(130, () => { if (this.active && !this.invincible) this.clearTint(); });
        soundManager.spell();
        return true;
    }

    castArcBolt() {
        if (!this._spellCheck('arc_bolt')) return false;
        this.setTint(0xffee44);
        this.scene.time.delayedCall(180, () => { if (this.active && !this.invincible) this.clearTint(); });
        soundManager.spell();
        return true;
    }

    castShadowVeil() {
        if (!this._spellCheck('shadow_veil')) return false;
        const level = this.stats.getSpellLevel('shadow_veil');
        const duration = [1600, 2400, 3500][level - 1];
        this.setAlpha(0.35);
        this.setTint(0x9900cc);
        this._shadowVeilActive = true;
        this._shadowVeilTimer = duration;
        soundManager.spell();
        return true;
    }

    castEarthPillar() {
        if (!this._spellCheck('earth_pillar')) return false;
        this.setTint(0x88aa44);
        this.scene.time.delayedCall(200, () => { if (this.active && !this.invincible) this.clearTint(); });
        soundManager.spell();
        this.stats.gainResonance('earth', 2);
        return true;
    }

    castQuagmire() {
        if (!this._spellCheck('quagmire')) return false;
        this.setTint(0x556622);
        this.scene.time.delayedCall(250, () => { if (this.active && !this.invincible) this.clearTint(); });
        soundManager.spell();
        this.stats.gainResonance('earth', 1);
        return true;
    }

    // ── Aether-Augmentation skills ────────────────────────────────────────────

    blinkStep() {
        const level = this.stats.skills['blink_step']?.level ?? 0;
        if (!level) {
            this.scene.get('UIScene')?.showNotification?.('Blink-Step not yet learned.', 1200);
            return false;
        }
        if (this.stats.manaExhausted) {
            this.scene.get('UIScene')?.showNotification?.('Too exhausted to Blink-Step.', 1000);
            return false;
        }
        const cost = 8;
        if (this.stats.mana < cost) {
            this.scene.get('UIScene')?.showNotification?.('Not enough mana!', 900);
            return false;
        }
        const dist = [60, 80, 105][level - 1];
        this.stats.mana -= cost;
        this.stats.addManaScent(5);

        const offsets = { down: [0, dist], up: [0, -dist], left: [-dist, 0], right: [dist, 0] };
        const [ox, oy] = offsets[this.facing];
        this.setPosition(this.x + ox, this.y + oy);

        this.setAlpha(0.25);
        this.setTint(0x88aaff);
        this.scene.time.delayedCall(90, () => {
            if (this.active) { this.setAlpha(1); if (!this.invincible) this.clearTint(); }
        });
        this.scene.cameras.main.flash(35, 80, 120, 255, true);
        soundManager.spell();
        return true;
    }

    activateAethericSight() {
        const level = this.stats.skills['aetheric_sight']?.level ?? 0;
        if (!level) {
            this.scene.get('UIScene')?.showNotification?.('Aetheric Sight not yet learned.', 1200);
            return false;
        }
        if (this.stats.manaExhausted) return false;
        const cost = 18;
        if (this.stats.mana < cost) return false;
        const duration = [2000, 3000, 4000][level - 1];
        this.stats.mana -= cost;
        this.stats.addManaScent(10);
        this.scene._activateAethericSight(duration);
        soundManager.spell();
        return true;
    }

    takeDamage(amount) {
        if (!this.active) return;

        // Shadow Veil: immune while active
        if (this._shadowVeilActive) return;

        if (this.invincible) return;

        const ward     = (this.stats.skills['arcane_ward']?.level ?? 0) * 0.10;
        const skin     = this.stats.getSpellLevel('stone_skin') > 0
            ? [0.08, 0.14, 0.20][this.stats.getSpellLevel('stone_skin') - 1]
            : 0;
        const totalRed = Math.min(0.75, ward + skin);
        let reduced    = totalRed > 0 ? Math.max(1, Math.round(amount * (1 - totalRed))) : amount;

        // Mana-Shield: absorb a portion with mana instead of HP
        const shieldLevel = this.stats.skills['mana_shield']?.level ?? 0;
        if (shieldLevel > 0 && this.stats.mana > 0) {
            const shieldFrac   = [0.30, 0.50, 0.70][shieldLevel - 1];
            const wantShield   = Math.floor(reduced * shieldFrac);
            const maxShield    = Math.floor(this.stats.mana / 2); // 2 mana per 1 HP shielded
            const actualShield = Math.min(wantShield, maxShield);
            this.stats.mana    = Math.max(0, this.stats.mana - actualShield * 2);
            reduced -= actualShield;
        }

        this.stats.health = Math.max(0, this.stats.health - reduced);
        this.stats.gainResonance('shadow', 1);
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
