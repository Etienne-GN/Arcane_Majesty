import Phaser from 'phaser';
import { playerStats } from '../systems/PlayerStats.js';
import { soundManager } from '../systems/SoundManager.js';
import { ITEMS } from '../data/items.js';
import { statusManager } from '../systems/StatusManager.js';
import { SPELLS } from '../data/spells.js';
import { buildEntityAnims } from '../utils/buildEntityAnims.js';
import { CHARACTERS } from '../data/characters.js';

export default class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, stats = playerStats, characterId = 'eldrin') {
        const charDef = CHARACTERS.find(c => c.id === characterId) ?? CHARACTERS[0];
        super(scene, x, y, charDef.spriteKey, charDef.idleFrame);
        this._charDef = charDef;
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setCollideWorldBounds(true);
        this.body.setSize(24, 28);
        this.body.setOffset(20, 32);
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

        this.stats = stats;
        this._setupAnimations(scene);

        this.shadow = scene.add.ellipse(x, y + 27, 28, 8, 0x000000, 0.30);

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
        buildEntityAnims(scene.anims, this._charDef.animPrefix, this._charDef.animProfile);
    }

    update(cursors, wasd, attackKey, powerKey, delta, joyVec = null) {
        if (!this.active) return;

        this.attackCooldown = Math.max(0, this.attackCooldown - delta);
        this.powerCooldown  = Math.max(0, this.powerCooldown  - delta);
        this.stats.tickSpellCooldowns(delta);
        this.stats.tickMana(delta);
        statusManager.tick(this, delta);

        // ── Mana Exhaustion / Collapse ───────────────────────────────────────
        if (this.stats.manaCollapsed) {
            // Stage 3: collapsed — immobile, flicker grey, slowly recover
            this.setVelocity(0);
            if (!this._collapseNotified) {
                this._collapseNotified = true;
                this.scene.scene.get('UIScene')?.showNotification?.('Mana Exhaustion — Eldrin collapses...', 3500);
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
        this.shadow.setPosition(this.x, this.y + 27);
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
            this._applyMovementVelocity(cursors, wasd, joyVec);
            this._updateAuxBoxes();
            return;
        }

        // Let the attack animation finish before switching to walk/idle
        const atkKey = `${this._charDef.animPrefix}_attack_${this.facing}`;
        if (this.anims.currentAnim?.key === atkKey && this.anims.isPlaying) {
            this._applyMovementVelocity(cursors, wasd, joyVec);
            this._updateAuxBoxes();
            return;
        }

        // Stunned statuses lock movement
        if (statusManager.isStunned(this)) {
            this.setVelocity(0);
            this._updateAuxBoxes();
            return;
        }

        // Speed: full AGI-based speed, reduced by fatigue and status debuffs
        const baseSpeed  = 100 + this.stats.attributes.agility * 4;
        const statusMult = statusManager.speedMult(this);
        const speed = Math.floor(baseSpeed * (1 - this.stats.fatigueFraction * 0.75) * statusMult);
        let vx = 0, vy = 0;

        const jx = joyVec?.x ?? 0;
        const jy = joyVec?.y ?? 0;
        if (jx !== 0 || jy !== 0) {
            vx = jx * speed;
            vy = jy * speed;
            if (Math.abs(jx) >= Math.abs(jy)) this.facing = jx < 0 ? 'left' : 'right';
            else                               this.facing = jy < 0 ? 'up'   : 'down';
        } else {
            if (cursors.left.isDown || wasd.left.isDown)        { vx = -speed; this.facing = 'left'; }
            else if (cursors.right.isDown || wasd.right.isDown) { vx =  speed; this.facing = 'right'; }
            if (cursors.up.isDown || wasd.up.isDown)            { vy = -speed; this.facing = 'up'; }
            else if (cursors.down.isDown || wasd.down.isDown)   { vy =  speed; this.facing = 'down'; }
            if (vx !== 0 && vy !== 0) { vx *= 0.707; vy *= 0.707; }
        }

        this.setVelocity(vx, vy);

        if (vx !== 0 || vy !== 0) {
            const key = `${this._charDef.animPrefix}_walk_${this.facing}`;
            if (this.anims.currentAnim?.key !== key) this.play(key);

            this._stepTimer -= delta;
            if (this._stepTimer <= 0) {
                this._stepTimer = 320;
            }
        } else {
            const idleKey = `${this._charDef.animPrefix}_idle_${this.facing}`;
            if (this.anims.currentAnim?.key !== idleKey) this.play(idleKey);
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

    triggerAttack() {
        if (this.attackCooldown > 0) return;
        if (statusManager.isStunned(this)) return;
        this._attack();
    }

    _attack() {
        this.isAttacking   = true;
        this.isPowerAttack = false;
        const wt = this.stats.activeWeaponType;
        this.attackCooldown = this._weaponCooldown();
        this.setVelocity(0);
        this.play(`${this._charDef.animPrefix}_attack_${this.facing}`);

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
            } else if (this.stats.manaExhausted) {
                // Magic Burn — augmented strike attempted while the vessel is frayed
                this._magicBurn(manaCost);
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
        this._spawnAttackArc(wt, this.facing);
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
        this.play(`${this._charDef.animPrefix}_attack_${this.facing}`);

        const wt = this.stats.activeWeaponType;

        // Temporarily enlarge the hitbox for Power Slash
        this.attackHitbox.body.setSize(60, 60);
        this.attackHitbox.setActive(true);
        soundManager.attack();

        this._spawnAttackArc(wt, this.facing, true);

        this.scene.time.delayedCall(this.ATTACK_COOLDOWN * 0.5, () => {
            this.isAttacking = false;
            this.isPowerAttack = false;
            this.attackHitbox.setActive(false);
            this.attackHitbox.body.setSize(40, 40);  // restore normal size
        });
    }

    _applyMovementVelocity(cursors, wasd, joyVec) {
        const baseSpeed  = 100 + this.stats.attributes.agility * 4;
        const statusMult = statusManager.speedMult(this);
        const speed = Math.floor(baseSpeed * (1 - this.stats.fatigueFraction * 0.75) * statusMult);
        let vx = 0, vy = 0;
        const jx = joyVec?.x ?? 0;
        const jy = joyVec?.y ?? 0;
        if (jx !== 0 || jy !== 0) {
            vx = jx * speed;
            vy = jy * speed;
        } else {
            if (cursors.left.isDown || wasd.left.isDown)        vx = -speed;
            else if (cursors.right.isDown || wasd.right.isDown) vx =  speed;
            if (cursors.up.isDown || wasd.up.isDown)            vy = -speed;
            else if (cursors.down.isDown || wasd.down.isDown)   vy =  speed;
            if (vx !== 0 && vy !== 0) { vx *= 0.707; vy *= 0.707; }
        }
        this.setVelocity(vx, vy);
    }

    _updateAuxBoxes() {
        const reach = 30;
        const offsets = { down: [0, reach], up: [0, -reach], left: [-reach, 0], right: [reach, 0] };
        const [ox, oy] = offsets[this.facing];
        this.interactBox.setPosition(this.x + ox, this.y + oy);
        this.attackHitbox.setPosition(this.x + ox, this.y + oy);
    }

    _spawnAttackArc(wt, facing, isPower = false) {
        const offsets = { down: [0, 22], up: [0, -22], left: [-22, 0], right: [22, 0] };
        const [ox, oy] = offsets[facing] ?? [0, 22];
        const cx = this.x + ox, cy = this.y + oy;
        const cam = this.scene.cameras.main;

        if (wt === 'staff') {
            // Arcane pulse rings with a cardinal cross rune
            const r  = isPower ? 34 : 24;
            const g  = this.scene.add.graphics().setDepth(55);
            g.fillStyle(0x2255cc, 0.35);
            g.fillCircle(cx, cy, r);
            g.lineStyle(2, 0x88ccff, 0.85);
            g.strokeCircle(cx, cy, r);
            g.lineStyle(1, 0x4477ff, 0.55);
            g.strokeCircle(cx, cy, Math.floor(r * 0.60));
            g.lineStyle(1, 0x6699ff, 0.50);
            g.lineBetween(cx - r + 4, cy, cx + r - 4, cy);
            g.lineBetween(cx, cy - r + 4, cx, cy + r - 4);
            this.scene.tweens.add({
                targets: g, alpha: 0, scaleX: isPower ? 1.45 : 1.25, scaleY: isPower ? 1.45 : 1.25,
                duration: isPower ? 300 : 220, ease: 'Power2', onComplete: () => g.destroy(),
            });
            if (isPower) {
                // Outer shockwave ring
                const g2 = this.scene.add.graphics().setDepth(54);
                g2.lineStyle(3, 0x4488ff, 0.45);
                g2.strokeCircle(cx, cy, r * 0.5);
                this.scene.tweens.add({
                    targets: g2, alpha: 0, scaleX: 2.6, scaleY: 2.6,
                    duration: 420, ease: 'Power1', onComplete: () => g2.destroy(),
                });
                cam.flash(70, 50, 100, 220, true);
            }

        } else if (wt === 'spell_blade') {
            // Perpendicular cleave — slash sweeps across the attack plane
            const isVertical = facing === 'up' || facing === 'down';
            const len = isPower ? 36 : 24;
            const [px, py] = isVertical ? [1, 0] : [0, 1];
            const g = this.scene.add.graphics().setDepth(55);
            // Main cleave line
            g.lineStyle(isPower ? 4 : 3, 0x33ddff, 0.95);
            g.lineBetween(cx - px * len, cy - py * len, cx + px * len, cy + py * len);
            // Arcane shadow slash (offset toward target)
            g.lineStyle(isPower ? 3 : 2, 0xaa44ff, 0.70);
            g.lineBetween(cx - px * len * 0.7 + ox * 0.25, cy - py * len * 0.7 + oy * 0.25,
                          cx + px * len * 0.7 + ox * 0.25, cy + py * len * 0.7 + oy * 0.25);
            // Thrust forward pip
            g.lineStyle(2, 0x66ffff, 0.55);
            g.lineBetween(cx - ox * 0.4, cy - oy * 0.4, cx + ox * 0.5, cy + oy * 0.5);
            if (isPower) {
                // Impact bloom at strike centre
                g.fillStyle(0x22eeff, 0.30);
                g.fillCircle(cx, cy, 12);
                cam.flash(60, 0, 200, 220, true);
                cam.shake(80, 0.006);
            }
            this.scene.tweens.add({
                targets: g, alpha: 0, duration: isPower ? 220 : 160,
                ease: 'Power2', onComplete: () => g.destroy(),
            });

        } else if (wt === 'umbral_dagger') {
            // Two quick slash marks angled toward facing direction
            const g = this.scene.add.graphics().setDepth(55);
            const sz = isPower ? 16 : 10;
            // Primary slash (diagonal toward facing)
            g.lineStyle(isPower ? 3 : 2, 0xdd44ff, 0.95);
            g.lineBetween(cx - sz + ox * 0.2, cy - sz + oy * 0.2,
                          cx + sz + ox * 0.2, cy + sz + oy * 0.2);
            // Secondary offset slash
            g.lineStyle(isPower ? 2 : 1, 0xff88ff, 0.65);
            g.lineBetween(cx - sz + 5 + ox * 0.35, cy - sz - 5 + oy * 0.35,
                          cx + sz + 5 + ox * 0.35, cy + sz - 5 + oy * 0.35);
            // Shadow impact pip
            g.fillStyle(0xaa22ee, isPower ? 0.85 : 0.65);
            g.fillCircle(cx + ox * 0.45, cy + oy * 0.45, isPower ? 6 : 4);
            if (isPower) {
                // Third slash on power — radiates outward
                g.lineStyle(2, 0xcc88ff, 0.50);
                g.lineBetween(cx - sz - 6 + ox * 0.5, cy + sz - 6 + oy * 0.5,
                              cx + sz - 6 + ox * 0.5, cy - sz - 6 + oy * 0.5);
                cam.flash(50, 100, 0, 140, true);
            }
            this.scene.tweens.add({
                targets: g, alpha: 0, duration: isPower ? 180 : 120,
                ease: 'Power3', onComplete: () => g.destroy(),
            });

        } else if (wt === 'resonance_bow') {
            // Draw-nock release flash at player position
            const g = this.scene.add.graphics().setDepth(55);
            g.fillStyle(0x88ffaa, isPower ? 0.70 : 0.55);
            g.fillCircle(this.x, this.y, isPower ? 9 : 6);
            g.lineStyle(isPower ? 2 : 1, 0xaaffcc, 0.80);
            g.lineBetween(this.x - ox * 0.5, this.y - oy * 0.5,
                          this.x + ox * 0.5, this.y + oy * 0.5);
            if (isPower) cam.flash(40, 0, 180, 80, true);
            this.scene.tweens.add({
                targets: g, alpha: 0, duration: 110,
                ease: 'Power3', onComplete: () => g.destroy(),
            });
        }
    }

    // ── Spell casting ────────────────────────────────────────────────────────

    _spellCheck(id) {
        if (!this.stats.getSpellLevel(id)) {
            this.scene.scene.get('UIScene')?.showNotification?.(`${id.replace(/_/g,' ')} not yet comprehended.`, 1400);
            this.setTint(0x4455bb);
            this.scene.time.delayedCall(130, () => { if (this.active && !this.invincible) this.clearTint(); });
            return false;
        }
        if (statusManager.isSilenced(this) || statusManager.has(this, 'hushed')) {
            this.scene.scene.get('UIScene')?.showNotification?.('Silenced — spells refuse to form.', 1400);
            this.scene.cameras.main.shake(50, 0.003);
            return false;
        }
        // Exhaustion: vessel frays — take Magic Burn damage proportional to the cost
        if (this.stats.manaExhausted) {
            this._magicBurn(this.stats.getSpellManaCost(id));
            return false;
        }
        if (!this.stats.canCastSpell(id)) return false;
        const cost = this.stats.getSpellManaCost(id);
        if (this.stats.mana < cost) {
            this.scene.scene.get('UIScene')?.showNotification?.('Not enough mana!', 1200);
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
        const level      = this.stats.getSpellLevel('shadow_veil');
        const shadowStep = this.stats.skills['shadow_step']?.level ?? 0;
        const duration   = [1600, 2400, 3500][level - 1] + shadowStep * 1000;
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

    // Generic cast — used for all spells that don't need special player-side logic
    castGeneric(id) {
        if (!this._spellCheck(id)) return false;
        const ELEMENT_TINTS = {
            fire: 0xff6600, arcane: 0xcc88ff, lightning: 0xffee44,
            shadow: 0x9900cc, earth: 0x88aa44, ice: 0x88ddff,
            nature: 0x44cc44, wind: 0xccffaa,
        };
        const tint = ELEMENT_TINTS[SPELLS[id]?.element] ?? 0xccccff;
        this.setTint(tint);
        this.scene.time.delayedCall(180, () => { if (this.active && !this.invincible) this.clearTint(); });
        soundManager.spell();
        return true;
    }

    castCleanse() {
        if (!this._spellCheck('cleanse')) return false;
        const negativeStatuses = ['burning','cold','frozen','shocked','poison','dirty','silenced','entangled','cursed','void_tainted','marked','hushed'];
        for (const s of negativeStatuses) statusManager.remove(this, s);
        this.setTint(0xaaddff);
        this.scene.time.delayedCall(300, () => { if (this.active && !this.invincible) this.clearTint(); });
        this.scene.cameras.main.flash(60, 100, 180, 255, true);
        soundManager.spell();
        return true;
    }

    castWarmthAura() {
        if (!this._spellCheck('warmth_aura')) return false;
        statusManager.remove(this, 'cold');
        statusManager.remove(this, 'frozen');
        statusManager.apply(this, 'regen', { duration: 10000 });
        this.setTint(0xff8844);
        this.scene.time.delayedCall(220, () => { if (this.active && !this.invincible) this.clearTint(); });
        soundManager.spell();
        return true;
    }

    castBenediction() {
        if (!this._spellCheck('benediction')) return false;
        statusManager.apply(this, 'blessed', { duration: 20000 });
        this.setTint(0xffee66);
        this.scene.cameras.main.flash(50, 255, 220, 80, true);
        this.scene.time.delayedCall(250, () => { if (this.active && !this.invincible) this.clearTint(); });
        soundManager.spell();
        return true;
    }

    castVesselMend() {
        if (!this._spellCheck('vessel_mend')) return false;
        statusManager.apply(this, 'regen', { duration: 20000 });
        this.setTint(0x44ff88);
        this.scene.time.delayedCall(200, () => { if (this.active && !this.invincible) this.clearTint(); });
        soundManager.spell();
        return true;
    }

    castAethericWard() {
        if (!this._spellCheck('aetheric_ward')) return false;
        statusManager.apply(this, 'warded', { duration: Infinity });
        this.setTint(0x4444ff);
        this.scene.cameras.main.flash(80, 40, 40, 255, true);
        this.scene.time.delayedCall(300, () => { if (this.active && !this.invincible) this.clearTint(); });
        soundManager.spell();
        return true;
    }

    castTempestStep() {
        if (!this._spellCheck('tempest_step')) return false;
        const level = this.stats.getSpellLevel('tempest_step');
        const dist  = [80, 110, 145][level - 1] ?? 80;
        const offsets = { down: [0, dist], up: [0, -dist], left: [-dist, 0], right: [dist, 0] };
        const [ox, oy] = offsets[this.facing];
        this.setPosition(this.x + ox, this.y + oy);
        this.setTint(0xccffaa);
        this.scene.cameras.main.flash(30, 180, 255, 120, true);
        this.scene.time.delayedCall(100, () => { if (this.active && !this.invincible) this.clearTint(); });
        soundManager.spell();
        return true;
    }

    castArcaneCircle() {
        if (!this._spellCheck('arcane_circle')) return false;
        this.setTint(0xcc88ff);
        this.scene.time.delayedCall(300, () => { if (this.active && !this.invincible) this.clearTint(); });
        soundManager.spell();
        this.stats.gainResonance('arcane', 3);
        return true;
    }

    // ── Aether-Augmentation skills ────────────────────────────────────────────

    blinkStep() {
        const level = this.stats.skills['blink_step']?.level ?? 0;
        if (!level) {
            this.scene.scene.get('UIScene')?.showNotification?.('Blink-Step not yet learned.', 1200);
            return false;
        }
        if (this.stats.manaExhausted) {
            this.scene.scene.get('UIScene')?.showNotification?.('Too exhausted to Blink-Step.', 1000);
            return false;
        }
        const cost = 8;
        if (this.stats.mana < cost) {
            this.scene.scene.get('UIScene')?.showNotification?.('Not enough mana!', 900);
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
            this.scene.scene.get('UIScene')?.showNotification?.('Aetheric Sight not yet learned.', 1200);
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

    /**
     * Magic Burn — casting or augmenting a strike while the mana vessel is
     * exhausted/collapsed frays the soul: direct HP damage proportional to the
     * mana cost, with red-flash feedback. Returns the damage dealt.
     */
    _magicBurn(cost) {
        const burnDmg = Math.max(1, Math.floor(cost * 0.5));
        this.stats.health = Math.max(0, this.stats.health - burnDmg);
        this.scene.scene.get('UIScene')?.showNotification?.(`Magic Burn — the vessel frays! −${burnDmg} HP`, 1800);
        this.setTint(0xff0000);
        this.scene.cameras.main.shake(80, 0.008);
        this.scene.cameras.main.flash(60, 255, 0, 0, true);
        this.scene.time.delayedCall(180, () => { if (this.active && !this.invincible) this.clearTint(); });
        if (this.stats.health <= 0) this.emit('died');
        return burnDmg;
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
        const inMult   = statusManager.incomingDmgMult(this, 'physical');
        let reduced    = totalRed > 0 ? Math.max(1, Math.round(amount * (1 - totalRed) * inMult)) : Math.round(amount * inMult);

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

        // Cancel Aetheric Tear channel if hit while casting
        this.scene._cancelTearCast?.();
    }

    destroy(fromScene) {
        this.shadow?.destroy();
        this.interactBox?.destroy();
        this.attackHitbox?.destroy();
        super.destroy(fromScene);
    }
}
