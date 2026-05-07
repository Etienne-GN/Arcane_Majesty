import Phaser from 'phaser';
import { playerStats } from '../systems/PlayerStats.js';

export default class SkillTreeScene extends Phaser.Scene {
    constructor() { super('SkillTreeScene'); }

    create() {
        const w = this.scale.width, h = this.scale.height;

        // Dimmer
        this.add.rectangle(0, 0, w, h, 0x000000, 0.82).setOrigin(0);

        // Panel
        const px = 10, py = 10, pw = w - 20, ph = h - 20;
        this.add.rectangle(px, py, pw, ph, 0x0a0a1e).setOrigin(0);
        const bdr = this.add.graphics();
        bdr.lineStyle(2, 0x4444aa);
        bdr.strokeRect(px, py, pw, ph);

        this.add.text(w / 2, py + 10, 'SKILLS & STATS', { font: 'bold 14px monospace', fill: '#ffd700' }).setOrigin(0.5, 0);

        // Stats column
        const sx = px + 14, sy = py + 32;
        const a = playerStats.attributes;

        this.add.text(sx, sy,      `Level:  ${playerStats.level}`,                              { font: '11px monospace', fill: '#ffffff' });
        this.add.text(sx, sy + 14, `XP:     ${playerStats.xp} / ${playerStats.xpToNextLevel}`, { font: '11px monospace', fill: '#aaaaff' });
        this.add.text(sx, sy + 28, `Skill Points:  ${playerStats.skillPoints}`,                 { font: '10px monospace', fill: '#00ff88' });
        this.add.text(sx, sy + 41, `Attr Points:   ${playerStats.attributePoints}`,             { font: '10px monospace', fill: '#ffcc44' });
        this.add.text(sx, sy + 58, `HP ${playerStats.health}/${playerStats.maxHealth}   MP ${playerStats.mana}/${playerStats.maxMana}`, { font: '10px monospace', fill: '#888888' });

        // 4-stat block with [+] distribution buttons
        const stats4 = [
            { key: 'strength',     label: 'STR', color: '#ff8866' },
            { key: 'intelligence', label: 'INT', color: '#8888ff' },
            { key: 'stamina',      label: 'STA', color: '#66dd66' },
            { key: 'agility',      label: 'AGI', color: '#ffdd44' },
        ];
        stats4.forEach(({ key, label, color }, i) => {
            const row = sy + 74 + Math.floor(i / 2) * 18;
            const col = sx + (i % 2) * 110;
            this.add.text(col, row, `${label} ${a[key]}`, { font: '10px monospace', fill: color });
            if (playerStats.attributePoints > 0) {
                const btn = this.add.text(col + 46, row, '[+]', { font: 'bold 10px monospace', fill: '#ffff00' }).setInteractive();
                btn.on('pointerdown', () => { if (playerStats.distributePoint(key)) this.scene.restart(); });
                btn.on('pointerover', () => btn.setStyle({ fill: '#ffffff' }));
                btn.on('pointerout',  () => btn.setStyle({ fill: '#ffff00' }));
            }
        });

        // Skill list
        this._renderSkills(px + 14, py + 134, pw - 28);

        // Close hint
        this.add.text(w / 2, ph + py - 10, '[ESC/K] Close   [J] Spellbook', {
            font: '9px monospace', fill: '#555555'
        }).setOrigin(0.5, 1);

        this.input.keyboard.on('keydown-ESC', () => this._close());
        this.input.keyboard.on('keydown-K',   () => this._close());
        this.input.keyboard.on('keydown-J',   () => { this.scene.stop(); this.scene.launch('SpellbookScene'); });
    }

    _renderSkills(startX, startY, width) {
        const rowH = 38;
        let i = 0;
        for (const [key, skill] of Object.entries(playerStats.skills)) {
            const y = startY + i * rowH;

            const canUp = playerStats.canUnlock(key);
            const learned = skill.level > 0;
            const bgColor = learned ? 0x0a2a0a : (canUp ? 0x1a1a00 : 0x111122);
            const border   = learned ? 0x00aa44 : (canUp ? 0xaaaa00 : 0x333366);
            const textColor = learned ? '#88ff88' : (canUp ? '#ffff44' : '#555577');

            const bg = this.add.rectangle(startX, y, width, rowH - 4, bgColor).setOrigin(0).setInteractive();
            const bdrG = this.add.graphics();
            bdrG.lineStyle(1, border);
            bdrG.strokeRect(startX, y, width, rowH - 4);

            const cat = skill.category === 'passive' ? '[P]' : '[A]';
            this.add.text(startX + 6, y + 4, `${cat} ${skill.name}`, {
                font: 'bold 11px monospace', fill: textColor
            });
            this.add.text(startX + 6, y + 18, skill.description, {
                font: '8px monospace', fill: '#888888'
            });

            // Resonance requirements
            if (skill.requirements?.resonance) {
                const RES_COLORS = { arcane: '#aa44ff', shadow: '#8800cc', fire: '#ff6600', earth: '#44aa22', lightning: '#ffdd00' };
                const reqParts = Object.entries(skill.requirements.resonance).map(([el, val]) => {
                    const cur  = playerStats.resonance[el] ?? 0;
                    const met  = cur >= val;
                    const col  = met ? '#446633' : (RES_COLORS[el] ?? '#888888');
                    return { text: `${el[0].toUpperCase()}${el.slice(1)} ≥${val}${met ? '✓' : ''}`, col };
                });
                let rx = startX + width - 8;
                for (let ri = reqParts.length - 1; ri >= 0; ri--) {
                    const t = this.add.text(rx, y + 18, reqParts[ri].text, { font: '7px monospace', fill: reqParts[ri].col }).setOrigin(1, 0);
                    rx -= t.width + 6;
                }
            }

            // Level pips
            for (let lv = 0; lv < skill.maxLevel; lv++) {
                const filled = lv < skill.level;
                this.add.rectangle(
                    startX + width - 10 - (skill.maxLevel - lv) * 12, y + rowH / 2 - 5,
                    10, 10,
                    filled ? 0x44cc44 : 0x333333
                ).setOrigin(0);
            }

            if (canUp && playerStats.skillPoints > 0) {
                const btn = this.add.text(startX + width - 28, y + 4, '[+]', {
                    font: 'bold 10px monospace', fill: '#ffff00'
                }).setInteractive();
                btn.on('pointerdown', () => {
                    if (playerStats.upgradeSkill(key)) this.scene.restart();
                    else this.cameras.main.shake(100, 0.008);
                });
                btn.on('pointerover', () => btn.setStyle({ fill: '#ffffff' }));
                btn.on('pointerout',  () => btn.setStyle({ fill: '#ffff00' }));
            }

            bg.on('pointerover', () => bg.setFillStyle(bgColor + 0x050505));
            bg.on('pointerout',  () => bg.setFillStyle(bgColor));

            i++;
        }
    }

    _close() {
        this.scene.stop();
        this.scene.resume('GameScene');
    }
}
