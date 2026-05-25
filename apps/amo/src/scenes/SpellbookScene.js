import Phaser from 'phaser';
import { playerStats } from '../systems/PlayerStats.js';
import { GamepadNav } from '../systems/GamepadNav.js';
import { SPELLS, TIER_NAMES, RESONANCE_ELEMENTS } from '../data/spells.js';

const ELEMENT_COLORS = {
    fire: 0xff6600, arcane: 0xaa44ff, lightning: 0xffdd00,
    shadow: 0x8800cc, earth: 0x44aa22, ice: 0x88ddff,
    nature: 0x44cc44, wind: 0xccffaa,
};
const ELEMENT_LABELS = {
    fire: 'Fire', arcane: 'Arcane', lightning: 'Lightning', shadow: 'Shadow',
    earth: 'Earth', ice: 'Ice', nature: 'Nature', wind: 'Wind',
};
const SLOT_KEYS = ['Q', 'R', 'F', 'T'];

const ROW_H   = 104;
const RES_W   = 400;   // resonance panel width
const DIV_GAP = 20;    // gap between left and right column

export default class SpellbookScene extends Phaser.Scene {
    constructor() { super('SpellbookScene'); }

    create() {
        const w = this.scale.width, h = this.scale.height;

        this.add.rectangle(0, 0, w, h, 0x000000, 0.88).setOrigin(0);

        const px = 16, py = 16, pw = w - 32, ph = h - 32;
        this.add.rectangle(px, py, pw, ph, 0x06061a).setOrigin(0);
        const bdr = this.add.graphics();
        bdr.lineStyle(4, 0x6633aa);
        bdr.strokeRect(px, py, pw, ph);

        // ── Header ───────────────────────────────────────────────────────────
        const HEADER_H = 92;

        this.add.text(w / 2, py + 16, "ELDRIN'S SPELLBOOK", {
            font: 'bold 26px monospace', fill: '#cc88ff'
        }).setOrigin(0.5, 0);

        this.add.text(px + pw - 12, py + 16, '[ESC / J] Close', {
            font: '14px monospace', fill: '#443355'
        }).setOrigin(1, 0);

        this.add.text(px + 20, py + 52, `Slots: ${SLOT_KEYS.map(k => `[${k}]`).join('  ')} — click a button on a spell to assign`, {
            font: '14px monospace', fill: '#554466'
        });

        // Separator under header
        const sepG = this.add.graphics();
        sepG.lineStyle(2, 0x2a1a44);
        sepG.lineBetween(px + 8, py + HEADER_H, px + pw - 8, py + HEADER_H);

        // ── Layout constants ─────────────────────────────────────────────────
        const FOOTER_H  = 36;
        const contentY  = py + HEADER_H + 8;
        const contentH  = ph - HEADER_H - FOOTER_H - 8;
        const resX      = px + pw - RES_W - 8;
        const listW     = pw - RES_W - DIV_GAP - 20;
        const listX     = px + 8;

        // Vertical divider between spell list and resonance panel
        const divG = this.add.graphics();
        divG.lineStyle(2, 0x1e1030);
        divG.lineBetween(listX + listW + DIV_GAP / 2, contentY, listX + listW + DIV_GAP / 2, contentY + contentH);

        // ── Resonance panel (right, static) ──────────────────────────────────
        this._drawResonanceBars(resX, contentY, RES_W);

        // ── Spell list (left, scrollable) ────────────────────────────────────
        this._listX   = listX;
        this._listY   = contentY;
        this._listW   = listW;
        this._listH   = contentH;
        this._rowH    = ROW_H;
        this._spells  = Object.values(SPELLS);
        this._scroll  = 0;
        this._visible = Math.floor(contentH / ROW_H);

        // Clip mask for scroll region
        const mask = this.make.graphics({ x: 0, y: 0, add: false });
        mask.fillRect(listX, contentY, listW, contentH);
        this._listMask = mask.createGeometryMask();

        // Container for scrollable spell rows
        this._listContainer = this.add.container(0, 0);
        this._listContainer.setMask(this._listMask);

        this._spellObjs = [];
        this._drawSpells();

        // Scroll indicator
        this._scrollBar = this.add.graphics().setDepth(30);
        this._drawScrollBar();

        // Footer scroll hint
        this.add.text(w / 2, py + ph - 8, '[↑ ↓] Scroll  · Mouse Wheel', {
            font: '14px monospace', fill: '#2a1a44'
        }).setOrigin(0.5, 1);

        // ── Input ─────────────────────────────────────────────────────────────
        this.input.keyboard.on('keydown-ESC', () => this._close());
        this.input.keyboard.on('keydown-J',   () => this._close());
        this.add.text(w - 12, 8, '✕', { font: 'bold 28px monospace', fill: '#aa4444', stroke: '#000000', strokeThickness: 2 }).setOrigin(1, 0).setInteractive().setDepth(50).on('pointerdown', () => this._close());
        this.input.keyboard.on('keydown-UP',   () => this._scrollBy(-1));
        this.input.keyboard.on('keydown-DOWN', () => this._scrollBy(1));
        this._gpNav = new GamepadNav(this);
        this.input.on('wheel', (ptr, objs, dx, dy) => this._scrollBy(dy > 0 ? 1 : -1));

        let _touchY = null, _touchAcc = 0;
        this.input.on('pointerdown', ptr => { _touchY = ptr.y; _touchAcc = 0; });
        this.input.on('pointermove', ptr => {
            if (_touchY === null || !ptr.isDown) return;
            _touchAcc += _touchY - ptr.y;
            _touchY = ptr.y;
            while (Math.abs(_touchAcc) >= 48) {
                this._scrollBy(_touchAcc > 0 ? 1 : -1);
                _touchAcc += _touchAcc > 0 ? -48 : 48;
            }
        });
        this.input.on('pointerup', () => { _touchY = null; _touchAcc = 0; });
    }

    // ── Resonance bars ────────────────────────────────────────────────────────
    _drawResonanceBars(x, y, panelW) {
        this.add.text(x + panelW / 2, y + 4, 'RESONANCE', {
            font: 'bold 16px monospace', fill: '#886699'
        }).setOrigin(0.5, 0);

        let oy = y + 36;
        for (const el of RESONANCE_ELEMENTS) {
            const val   = playerStats.resonance[el];
            const color = ELEMENT_COLORS[el];
            const label = ELEMENT_LABELS[el];
            const hexC  = `#${color.toString(16).padStart(6, '0')}`;

            let maxThreshold = 1;
            for (const spell of Object.values(SPELLS)) {
                if (spell.element !== el) continue;
                const top = spell.masteryThresholds?.[spell.masteryThresholds.length - 1]
                    ?? spell.discoverCondition?.threshold ?? 0;
                if (top > maxThreshold) maxThreshold = top;
            }
            const pct  = Math.min(1, val / maxThreshold);
            const barW = panelW - 56;

            this.add.text(x + 8, oy, label, { font: '14px monospace', fill: hexC });
            this.add.text(x + panelW - 8, oy, `${val}`, { font: '14px monospace', fill: '#555566' }).setOrigin(1, 0);

            this.add.rectangle(x + 8, oy + 20, barW, 10, 0x1a1a2a).setOrigin(0);
            if (pct > 0) {
                this.add.rectangle(x + 8, oy + 20, Math.floor(barW * pct), 10, color).setOrigin(0);
            }

            oy += 48;
        }
    }

    // ── Spell list ────────────────────────────────────────────────────────────
    _drawSpells() {
        this._spellObjs.forEach(o => o?.destroy?.());
        this._spellObjs = [];

        const { _listX: x, _listY: y, _listW: maxW, _rowH: rowH, _scroll: scroll } = this;
        const spells = this._spells;
        const count  = Math.min(this._visible + 1, spells.length - scroll);

        for (let i = 0; i < count; i++) {
            const spell = spells[scroll + i];
            if (!spell) break;
            const oy    = y + i * rowH;
            const level = playerStats.getSpellLevel(spell.id);
            const known = level > 0;
            const color = ELEMENT_COLORS[spell.element];
            const hexC  = `#${color.toString(16).padStart(6, '0')}`;

            const track = obj => {
                this._spellObjs.push(obj);
                this._listContainer.add(obj);
                return obj;
            };

            // Row bg + border
            track(this.add.rectangle(x, oy, maxW, rowH - 6, known ? 0x0a0a22 : 0x080812).setOrigin(0));
            const rg = track(this.add.graphics());
            rg.lineStyle(2, known ? color : 0x1e1e33);
            rg.strokeRect(x, oy, maxW, rowH - 6);

            // Element side pip
            track(this.add.rectangle(x + 4, oy + 6, 8, rowH - 18, known ? color : 0x1e1e33).setOrigin(0));

            if (known) {
                const tierName  = TIER_NAMES[level - 1] ?? `Tier ${level}`;
                const isPassive = spell.targetingType === null;
                const slotIdx   = playerStats.getSpellSlotIndex(spell.id);
                const slotHint  = isPassive ? '[passive]' : (slotIdx >= 0 ? `[${SLOT_KEYS[slotIdx]}]` : '[ – ]');
                const costStr   = isPassive ? '' : `  MP:${playerStats.getSpellManaCost(spell.id)}`;

                track(this.add.text(x + 20, oy + 8, spell.name, {
                    font: 'bold 20px monospace', fill: hexC
                }));
                track(this.add.text(x + 20, oy + 32, `${tierName}  ${slotHint}${costStr}`, {
                    font: '14px monospace', fill: '#776688'
                }));
                track(this.add.text(x + 20, oy + 54, spell.lore ?? '', {
                    font: '14px monospace', fill: '#555566',
                    wordWrap: { width: maxW - 180 }
                }));

                // Tier pips
                for (let t = 0; t < 3; t++) {
                    track(this.add.rectangle(
                        x + maxW - 16 - (2 - t) * 22, oy + 10, 16, 16,
                        t < level ? color : 0x1e1e33
                    ).setOrigin(0));
                }

                // Slot buttons — active spells only
                if (!isPassive) {
                    const btnW = 28, btnH = 20, btnGap = 4;
                    const btnStartX = x + maxW - (4 * btnW + 3 * btnGap) - 12;
                    const btnY = oy + 72;

                    SLOT_KEYS.forEach((key, si) => {
                        const bx       = btnStartX + si * (btnW + btnGap);
                        const assigned = playerStats.skillSlots[si] === spell.id;
                        const fillCol  = assigned ? color : 0x141428;
                        const txtCol   = assigned ? '#000000' : '#445566';

                        const btnBg = track(
                            this.add.rectangle(bx, btnY, btnW, btnH, fillCol).setOrigin(0).setInteractive()
                        );
                        track(this.add.text(bx + btnW / 2, btnY + btnH / 2, key, {
                            font: '14px monospace', fill: txtCol
                        }).setOrigin(0.5));

                        btnBg.on('pointerdown', () => {
                            playerStats.assignSkillSlot(si, assigned ? null : spell.id);
                            this._drawSpells();
                        });
                        btnBg.on('pointerover', () => btnBg.setFillStyle(assigned ? 0xffffff : 0x2a2a55));
                        btnBg.on('pointerout',  () => btnBg.setFillStyle(fillCol));
                    });
                }
            } else {
                // Unknown spell
                const res  = playerStats.resonance[spell.element];
                const need = spell.discoverCondition?.threshold ?? null;

                track(this.add.text(x + 20, oy + 14, '??? — Undiscovered', {
                    font: 'bold 18px monospace', fill: '#2e2e44'
                }));

                if (need === null) {
                    track(this.add.text(x + 20, oy + 42, 'Learned from: NPC · Scroll · Tome', {
                        font: '14px monospace', fill: '#3a3a55'
                    }));
                } else {
                    track(this.add.text(x + 20, oy + 42, `${ELEMENT_LABELS[spell.element]} resonance: ${res} / ${need}`, {
                        font: '14px monospace', fill: '#3a3a55'
                    }));
                    const barW = maxW - 48;
                    track(this.add.rectangle(x + 20, oy + 66, barW, 8, 0x111122).setOrigin(0));
                    if (res > 0) {
                        const pct = Math.min(1, res / need);
                        track(this.add.rectangle(x + 20, oy + 66, Math.floor(barW * pct), 8, (color & 0x7f7f7f)).setOrigin(0));
                    }
                }
            }
        }
    }

    update(time, delta) {
        const gp = this._gpNav.poll(delta);
        if (!gp) return;
        if (gp.up)              this._scrollBy(-1);
        if (gp.down)            this._scrollBy(1);
        if (gp.B || gp.start)  this._close();
    }

    _drawScrollBar() {
        const g = this._scrollBar;
        g.clear();

        const total   = this._spells.length;
        const visible = this._visible;
        if (total <= visible) return;

        const trackX = this._listX + this._listW + 6;
        const trackY = this._listY;
        const trackH = this._listH;
        const barH   = Math.max(32, Math.floor((visible / total) * trackH));
        const barY   = trackY + Math.floor((this._scroll / (total - visible)) * (trackH - barH));

        g.fillStyle(0x1a1a33);
        g.fillRect(trackX, trackY, 8, trackH);
        g.fillStyle(0x6633aa);
        g.fillRect(trackX, barY, 8, barH);
    }

    _scrollBy(delta) {
        const max = Math.max(0, this._spells.length - this._visible);
        this._scroll = Phaser.Math.Clamp(this._scroll + delta, 0, max);
        this._drawSpells();
        this._drawScrollBar();
    }

    _close() {
        this.scene.stop();
        this.scene.resume('GameScene');
    }
}
