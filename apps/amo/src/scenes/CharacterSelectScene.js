import Phaser from 'phaser';
import { CHARACTERS } from '../data/characters.js';
import { SaveManager } from '../systems/SaveManager.js';
import { playerStats } from '../systems/PlayerStats.js';
import { soundManager } from '../systems/SoundManager.js';
import { buildEntityAnims } from '../utils/buildEntityAnims.js';
import { GamepadNav } from '../systems/GamepadNav.js';

export default class CharacterSelectScene extends Phaser.Scene {
    constructor() { super('CharacterSelectScene'); }

    init(data) {
        this._storyId    = data?.storyId    ?? 'eldorias_prophecy';
        this._storyTitle = data?.storyTitle ?? '';
        this._mapId      = data?.mapId      ?? 'prologue_forest';
        // Filter CHARACTERS to those listed for this story; fall back to all if not set
        const ids = data?.characters ?? CHARACTERS.map(c => c.id);
        this._chars = CHARACTERS.filter(c => ids.includes(c.id));
        if (!this._chars.length) this._chars = CHARACTERS;
    }

    create() {
        const w = this.scale.width, h = this.scale.height;
        this._idx = 0;

        const bg = this.add.image(w / 2, h / 2, 'menu_bg');
        bg.setScale(Math.min(w / bg.width, h / bg.height)).setAlpha(0.25);
        this.add.rectangle(0, 0, w, h, 0x000000, 0.70).setOrigin(0);

        // Titles
        this.add.text(w / 2, 26, this._storyTitle, {
            font: '11px monospace', fill: '#445566',
        }).setOrigin(0.5);
        this.add.text(w / 2, 44, 'CHOOSE YOUR CHARACTER', {
            font: 'bold 22px monospace', fill: '#aabbff',
            stroke: '#000000', strokeThickness: 4,
        }).setOrigin(0.5);

        this._chars.forEach(c => buildEntityAnims(this.anims, c.animPrefix, c.animProfile));

        // Preview panel
        const panelW = Math.min(w * 0.55, 300), panelH = 220;
        const panelY = h / 2 - 36;
        this.add.rectangle(w / 2, panelY, panelW, panelH, 0x0a0a1a, 0.88)
            .setStrokeStyle(1, 0x333366);

        this._preview = this.add.sprite(w / 2, panelY - panelH / 2 + 80, this._chars[0].spriteKey, this._chars[0].idleFrame ?? 0)
            .setScale(5);

        this._charName = this.add.text(w / 2, panelY - panelH / 2 + 138, '', {
            font: 'bold 18px monospace', fill: '#ffd700',
            stroke: '#000000', strokeThickness: 2,
        }).setOrigin(0.5);

        this._charClass = this.add.text(w / 2, panelY - panelH / 2 + 158, '', {
            font: '10px monospace', fill: '#8899bb',
        }).setOrigin(0.5);

        this._charDesc = this.add.text(w / 2, panelY - panelH / 2 + 176, '', {
            font: '9px monospace', fill: '#556677',
            wordWrap: { width: panelW - 20 }, align: 'center',
        }).setOrigin(0.5, 0);

        // Arrows
        if (this._chars.length > 1) {
            this._makeArrow(w / 2 - panelW / 2 - 26, panelY - panelH / 2 + 80, '<', () => this._prev());
            this._makeArrow(w / 2 + panelW / 2 + 26, panelY - panelH / 2 + 80, '>', () => this._next());
        }

        // Dots
        this._dots = [];
        if (this._chars.length > 1) {
            const sp = 14, total = (this._chars.length - 1) * sp;
            this._chars.forEach((_, i) => {
                this._dots.push(this.add.circle(w / 2 - total / 2 + i * sp, panelY + panelH / 2 - 14, 4, 0x334455));
            });
        }

        // Save info + action buttons (rebuilt per character in _refresh)
        const btnY = panelY + panelH / 2 + 28;
        this._saveInfoText = this.add.text(w / 2, btnY, '', {
            font: '10px monospace', fill: '#667788',
        }).setOrigin(0.5);

        const btnSpacing = 110;
        this._continueBtn = this._makeBtn(w / 2 - btnSpacing / 2, btnY + 30, '[ CONTINUE ]', '#ffd700', () => this._launch(true));
        this._newGameBtn  = this._makeBtn(w / 2 + btnSpacing / 2, btnY + 30, '[ NEW GAME ]',  '#88ccaa', () => this._launch(false));

        // Back
        this.add.text(32, h - 32, '< Back', {
            font: '15px monospace', fill: '#445566',
        }).setOrigin(0, 1).setInteractive({ useHandCursor: true })
          .on('pointerover', function () { this.setStyle({ fill: '#aabbff' }); })
          .on('pointerout',  function () { this.setStyle({ fill: '#445566' }); })
          .on('pointerdown', () => { soundManager.menuSelect(); this.scene.start('StorySelectScene'); });

        this.input.keyboard.on('keydown-LEFT',   () => this._prev());
        this.input.keyboard.on('keydown-RIGHT',  () => this._next());
        this.input.keyboard.on('keydown-ENTER',  () => this._launch(this._hasSave()));
        this.input.keyboard.on('keydown-ESCAPE', () => this.scene.start('StorySelectScene'));

        this._gpNav = new GamepadNav(this);
        this._refresh();
        this.cameras.main.fadeIn(400);
    }

    update(time, delta) {
        const gp = this._gpNav.poll(delta);
        if (!gp) return;
        if (gp.left)  this._prev();
        if (gp.right) this._next();
        if (gp.A)     this._launch(this._hasSave());
        if (gp.B)     { soundManager.menuSelect(); this.scene.start('StorySelectScene'); }
    }

    _makeArrow(x, y, label, cb) {
        this.add.text(x, y, label, {
            font: 'bold 28px monospace', fill: '#445566',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true })
          .on('pointerover', function () { this.setStyle({ fill: '#aabbff' }); })
          .on('pointerout',  function () { this.setStyle({ fill: '#445566' }); })
          .on('pointerdown', cb);
    }

    _makeBtn(x, y, label, color, cb) {
        const btn = this.add.text(x, y, label, {
            font: 'bold 13px monospace', fill: color,
            stroke: '#000000', strokeThickness: 2,
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        btn.on('pointerover',  () => btn.setStyle({ fill: '#ffffff' }));
        btn.on('pointerout',   () => btn.setStyle({ fill: btn._baseColor }));
        btn.on('pointerdown',  cb);
        btn._baseColor = color;
        return btn;
    }

    _prev() {
        this._idx = (this._idx - 1 + this._chars.length) % this._chars.length;
        soundManager.menuHover();
        this._refresh();
    }

    _next() {
        this._idx = (this._idx + 1) % this._chars.length;
        soundManager.menuHover();
        this._refresh();
    }

    _hasSave() {
        const c = this._chars[this._idx];
        return SaveManager.hasSave(this._storyId, c.id);
    }

    _refresh() {
        const c    = this._chars[this._idx];
        const info = SaveManager.getSaveInfo(this._storyId, c.id);

        this._charName.setText(c.name);
        this._charClass.setText(c.class);
        this._charDesc.setText(c.description);

        this._preview.setTexture(c.spriteKey, c.idleFrame ?? 0);
        const animKey = `${c.animPrefix}_idle_down`;
        if (this.anims.exists(animKey)) this._preview.play(animKey, true);
        if (c.tint) this._preview.setTint(c.tint); else this._preview.clearTint();

        this._dots.forEach((d, i) => d.setFillStyle(i === this._idx ? 0xaabbff : 0x334455));

        if (info) {
            this._saveInfoText.setText(`Saved — Level ${info.level}  ·  ${info.time}`).setAlpha(1);
            this._continueBtn.setAlpha(1).setInteractive({ useHandCursor: true });
        } else {
            this._saveInfoText.setText('No save file').setAlpha(0.4);
            this._continueBtn.setAlpha(0.3).disableInteractive();
        }
    }

    _launch(isContinue) {
        const c = this._chars[this._idx];
        soundManager.menuSelect();

        if (isContinue) {
            SaveManager.load(playerStats, this._storyId, c.id);
        } else {
            SaveManager.deleteSave(this._storyId, c.id);
            playerStats.reset();
            this.registry.remove('prologueSeen');
        }

        this.cameras.main.fadeOut(400);
        this.time.delayedCall(400, () => {
            this.scene.start('GameScene', {
                characterId: c.id,
                storyId:     this._storyId,
                mapId:       isContinue ? undefined : this._mapId,
            });
        });
    }
}
