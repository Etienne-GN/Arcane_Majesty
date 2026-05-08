import Phaser from 'phaser';
import { playerStats, MASTERY_DEFS } from '../systems/PlayerStats.js';

export default class SkillTreeScene extends Phaser.Scene {
    constructor() { super('SkillTreeScene'); }

    init(data) {
        this._scroll = data?.scroll ?? 0;
    }

    create() {
        const w = this.scale.width, h = this.scale.height;
        const px = 10, py = 10, pw = w - 20, ph = h - 20;

        // ── Fixed background ──────────────────────────────────────
        this.add.rectangle(0, 0, w, h, 0x000000, 0.82).setOrigin(0);
        this.add.rectangle(px, py, pw, ph, 0x0a0a1e).setOrigin(0);
        const bdr = this.add.graphics();
        bdr.lineStyle(2, 0x4444aa);
        bdr.strokeRect(px, py, pw, ph);

        this.add.text(w / 2, py + 8, 'SKILLS & STATS', {
            font: 'bold 14px monospace', fill: '#ffd700',
        }).setOrigin(0.5, 0);

        // ── Fixed stats header ────────────────────────────────────
        const sx = px + 14, sy = py + 28;
        const a  = playerStats.attributes;

        this.add.text(sx,       sy,      `Level:  ${playerStats.level}`, { font: '11px monospace', fill: '#ffffff' });
        this.add.text(sx + 110, sy,      `HP ${playerStats.health}/${playerStats.maxHealth}`, { font: '10px monospace', fill: '#66dd66' });
        this.add.text(sx,       sy + 14, `XP: ${playerStats.xp} / ${playerStats.xpToNextLevel}`, { font: '10px monospace', fill: '#aaaaff' });
        this.add.text(sx + 110, sy + 14, `MP ${playerStats.mana}/${playerStats.maxMana}`, { font: '10px monospace', fill: '#6688ff' });
        this.add.text(sx,       sy + 28, `Skill Points:  ${playerStats.skillPoints}`, { font: '10px monospace', fill: '#00ff88' });
        this.add.text(sx,       sy + 41, `Attr Points:   ${playerStats.attributePoints}`, { font: '10px monospace', fill: '#ffcc44' });
        this.add.text(sx,       sy + 54, `Insights:      ${playerStats.resonanceInsights ?? 0}`, { font: '10px monospace', fill: '#cc99ff' });

        // 4-stat block with [+] distribution buttons
        const stats4 = [
            { key: 'strength',     label: 'STR', color: '#ff8866' },
            { key: 'intelligence', label: 'INT', color: '#8888ff' },
            { key: 'stamina',      label: 'STA', color: '#66dd66' },
            { key: 'agility',      label: 'AGI', color: '#ffdd44' },
        ];
        stats4.forEach(({ key, label, color }, i) => {
            const row = sy + 72 + Math.floor(i / 2) * 18;
            const col = sx + (i % 2) * 110;
            this.add.text(col, row, `${label} ${a[key]}`, { font: '10px monospace', fill: color });
            if (playerStats.attributePoints > 0) {
                const btn = this.add.text(col + 46, row, '[+]', { font: 'bold 10px monospace', fill: '#ffff00' }).setInteractive();
                btn.on('pointerdown', () => { if (playerStats.distributePoint(key)) this._restart(); });
                btn.on('pointerover', () => btn.setStyle({ fill: '#ffffff' }));
                btn.on('pointerout',  () => btn.setStyle({ fill: '#ffff00' }));
            }
        });

        // ── Scrollable content area ───────────────────────────────
        const HEADER_H = 116;
        const FOOTER_H = 22;
        const contentTop = py + HEADER_H;
        const contentH   = ph - HEADER_H - FOOTER_H;

        const colW       = Math.floor((pw - 28) * 0.56);
        const skillsX    = px + 14;
        const masteriesX = skillsX + colW + 8;
        const masteriesW = pw - 28 - colW - 8;

        const container = this.add.container(0, 0);

        const skillsH    = this._addSkills(container, skillsX, contentTop, colW);
        const masteriesH = this._addMasteries(container, masteriesX, contentTop, masteriesW);
        const totalH     = Math.max(skillsH, masteriesH);
        const maxScroll  = Math.max(0, totalH - contentH);

        this._scroll = Phaser.Math.Clamp(this._scroll, 0, maxScroll);
        container.y  = -this._scroll;

        // Clip mask — hides content outside the content area
        const maskGfx = this.make.graphics({ x: 0, y: 0, add: false });
        maskGfx.fillStyle(0xffffff);
        maskGfx.fillRect(px, contentTop, pw, contentH);
        container.setMask(maskGfx.createGeometryMask());

        // Divider above scrollable area
        const divG = this.add.graphics();
        divG.lineStyle(1, 0x222255);
        divG.lineBetween(px + 4, contentTop - 2, px + pw - 4, contentTop - 2);

        // Scroll indicators (live-updated)
        this._arrowUp   = this.add.text(w - px - 4, contentTop + 4,     '▲', { font: '8px monospace', fill: '#554466' }).setOrigin(1, 0);
        this._arrowDown = this.add.text(w - px - 4, contentTop + contentH - 4, '▼', { font: '8px monospace', fill: '#554466' }).setOrigin(1, 1);
        this._updateArrows(maxScroll);

        // ── Footer hint ───────────────────────────────────────────
        this.add.text(w / 2, py + ph - 8, '[↑/↓  Wheel] Scroll   [ESC/K] Close   [J] Spellbook', {
            font: '7px monospace', fill: '#333355',
        }).setOrigin(0.5, 1);

        // ── Input ─────────────────────────────────────────────────
        const scrollBy = (delta) => {
            this._scroll = Phaser.Math.Clamp(this._scroll + delta, 0, maxScroll);
            container.y  = -this._scroll;
            this._updateArrows(maxScroll);
        };

        this.input.on('wheel', (_p, _o, _dx, dy) => scrollBy(Math.sign(dy) * 22));
        this.input.keyboard.on('keydown-UP',   () => scrollBy(-24));
        this.input.keyboard.on('keydown-DOWN', () => scrollBy(24));
        this.input.keyboard.on('keydown-ESC',  () => this._close());
        this.input.keyboard.on('keydown-K',    () => this._close());
        this.input.keyboard.on('keydown-J',    () => { this.scene.stop(); this.scene.launch('SpellbookScene'); });
    }

    _updateArrows(maxScroll) {
        this._arrowUp.setAlpha(this._scroll > 0 ? 1 : 0);
        this._arrowDown.setAlpha(this._scroll < maxScroll ? 1 : 0);
    }

    // Returns total content height rendered (for maxScroll calculation)
    _addSkills(container, startX, startY, width) {
        const ROW_H = 40;

        this._addToContainer(container,
            this.add.text(startX, startY + 4, '— SKILLS —', { font: 'bold 8px monospace', fill: '#5566aa' })
        );

        let i = 0;
        for (const [key, skill] of Object.entries(playerStats.skills)) {
            const y      = startY + 18 + i * ROW_H;
            const canUp  = playerStats.canUnlock(key);
            const learned = skill.level > 0;
            const bgColor  = learned ? 0x0a2a0a : (canUp ? 0x1a1a00 : 0x111122);
            const border   = learned ? 0x00aa44 : (canUp ? 0xaaaa00 : 0x333366);
            const textCol  = learned ? '#88ff88' : (canUp ? '#ffff44' : '#555577');

            const bg = this.add.rectangle(startX, y, width, ROW_H - 4, bgColor).setOrigin(0).setInteractive();
            const bdrG = this.add.graphics();
            bdrG.lineStyle(1, border);
            bdrG.strokeRect(startX, y, width, ROW_H - 4);

            const cat = skill.category === 'passive' ? '[P]' : '[A]';
            const nameT = this.add.text(startX + 6, y + 4, `${cat} ${skill.name}`, { font: 'bold 10px monospace', fill: textCol });
            const descT = this.add.text(startX + 6, y + 17, skill.description, { font: '7px monospace', fill: '#888888' });

            // Resonance requirements
            const resObjs = [];
            if (skill.requirements?.resonance) {
                const RES_COLORS = { arcane: '#aa44ff', shadow: '#8800cc', fire: '#ff6600', earth: '#44aa22', lightning: '#ffdd00' };
                let rx = startX + width - 4;
                const parts = Object.entries(skill.requirements.resonance);
                for (let ri = parts.length - 1; ri >= 0; ri--) {
                    const [el, val] = parts[ri];
                    const met = (playerStats.resonance[el] ?? 0) >= val;
                    const t = this.add.text(rx, y + 17, `${el[0].toUpperCase()}${el.slice(1)}≥${val}${met ? '✓' : ''}`, {
                        font: '7px monospace', fill: met ? '#446633' : (RES_COLORS[el] ?? '#888888'),
                    }).setOrigin(1, 0);
                    rx -= t.width + 4;
                    resObjs.push(t);
                }
            }

            // Level pips
            const pipObjs = [];
            for (let lv = 0; lv < skill.maxLevel; lv++) {
                pipObjs.push(this.add.rectangle(
                    startX + width - 10 - (skill.maxLevel - lv - 1) * 13, y + ROW_H - 10,
                    11, 8, lv < skill.level ? 0x44cc44 : 0x333333
                ).setOrigin(0));
            }

            // Upgrade button
            let btnObj = null;
            if (canUp && playerStats.skillPoints > 0) {
                btnObj = this.add.text(startX + width - 4, y + 4, '[+]', { font: 'bold 10px monospace', fill: '#ffff00' }).setOrigin(1, 0).setInteractive();
                btnObj.on('pointerdown', () => {
                    if (playerStats.upgradeSkill(key)) this._restart();
                    else this.cameras.main.shake(100, 0.008);
                });
                btnObj.on('pointerover', () => btnObj.setStyle({ fill: '#ffffff' }));
                btnObj.on('pointerout',  () => btnObj.setStyle({ fill: '#ffff00' }));
            }

            bg.on('pointerover', () => bg.setFillStyle(bgColor === 0x111122 ? 0x181830 : bgColor + 0x050505));
            bg.on('pointerout',  () => bg.setFillStyle(bgColor));

            this._addToContainer(container, bg, bdrG, nameT, descT, ...resObjs, ...pipObjs);
            if (btnObj) this._addToContainer(container, btnObj);

            i++;
        }
        return 18 + i * ROW_H + 4;
    }

    _addMasteries(container, startX, startY, width) {
        const ROW_H   = 54;
        const insights = playerStats.resonanceInsights ?? 0;

        this._addToContainer(container,
            this.add.text(startX, startY + 4, '— MASTERY —', { font: 'bold 8px monospace', fill: '#886699' })
        );

        let i = 0;
        for (const [key, def] of Object.entries(MASTERY_DEFS)) {
            const y        = startY + 18 + i * ROW_H;
            const unlocked = playerStats.masteries?.[key] ?? false;
            const canAfford = !unlocked && insights >= def.cost;
            const bgCol    = unlocked ? 0x0a1a2a : (canAfford ? 0x1a1a00 : 0x0f0f1a);
            const border   = unlocked ? 0x7744cc : (canAfford ? 0xaaaa00 : 0x2a2a44);

            const bg = this.add.rectangle(startX, y, width, ROW_H - 4, bgCol).setOrigin(0);
            if (!unlocked) bg.setInteractive();
            const bdrG = this.add.graphics();
            bdrG.lineStyle(1, border);
            bdrG.strokeRect(startX, y, width, ROW_H - 4);

            const costT = this.add.text(startX + 4, y + 4, unlocked ? '✓' : `${def.cost}✦`, {
                font: 'bold 8px monospace',
                fill: unlocked ? '#7744cc' : (canAfford ? '#ffcc44' : '#444455'),
            });
            const nameT = this.add.text(startX + 20, y + 4, def.name, {
                font: `${unlocked ? 'bold ' : ''}8px monospace`,
                fill: unlocked ? '#aa77ff' : (canAfford ? '#ccccaa' : '#555566'),
            });
            const descT = this.add.text(startX + 4, y + 17, def.description, {
                font: '7px monospace',
                fill: unlocked ? '#667788' : (canAfford ? '#888877' : '#333344'),
                wordWrap: { width: width - 8 },
            });

            let btnObj = null;
            if (canAfford) {
                btnObj = this.add.text(startX + width - 4, y + 4, '[UNLOCK]', {
                    font: 'bold 7px monospace', fill: '#ffff44',
                }).setOrigin(1, 0).setInteractive();
                btnObj.on('pointerdown', () => {
                    if (playerStats.unlockMastery(key)) this._restart();
                    else this.cameras.main.shake(80, 0.006);
                });
                btnObj.on('pointerover', () => btnObj.setStyle({ fill: '#ffffff' }));
                btnObj.on('pointerout',  () => btnObj.setStyle({ fill: '#ffff44' }));
            }

            if (!unlocked) {
                bg.on('pointerover', () => bg.setFillStyle(bgCol + 0x080800));
                bg.on('pointerout',  () => bg.setFillStyle(bgCol));
            }

            this._addToContainer(container, bg, bdrG, costT, nameT, descT);
            if (btnObj) this._addToContainer(container, btnObj);

            i++;
        }
        return 18 + i * ROW_H + 4;
    }

    _addToContainer(container, ...objs) {
        objs.forEach(o => { if (o) container.add(o); });
    }

    _restart() {
        this.scene.start('SkillTreeScene', { scroll: this._scroll });
    }

    _close() {
        this.scene.stop();
        this.scene.resume('GameScene');
    }
}
