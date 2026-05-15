import Phaser from 'phaser';
import { playerStats } from '../systems/PlayerStats.js';
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

const ROW_H   = 52;
const RES_W   = 200;   // resonance panel width
const DIV_GAP = 10;    // gap between left and right column

export default class SpellbookScene extends Phaser.Scene {
    constructor() { super('SpellbookScene'); }

    create() {
        const w = this.scale.width, h = this.scale.height;

        this.add.rectangle(0, 0, w, h, 0x000000, 0.88).setOrigin(0);

        const px = 8, py = 8, pw = w - 16, ph = h - 16;
        this.add.rectangle(px, py, pw, ph, 0x06061a).setOrigin(0);
        const bdr = this.add.graphics();
        bdr.lineStyle(2, 0x6633aa);
        bdr.strokeRect(px, py, pw, ph);

        // ── Header ───────────────────────────────────────────────────────────
        const HEADER_H = 46;

        this.add.text(w / 2, py + 8, "ELDRIN'S SPELLBOOK", {
            font: 'bold 13px monospace', fill: '#cc88ff'
        }).setOrigin(0.5, 0);

        this.add.text(px + pw - 6, py + 8, '[ESC / J] Close', {
            font: '7px monospace', fill: '#443355'
        }).setOrigin(1, 0);

        this.add.text(px + 10, py + 26, `Slots: ${SLOT_KEYS.map(k => `[${k}]`).join('  ')} — click a button on a spell to assign`, {
            font: '7px monospace', fill: '#554466'
        });

        // Separator under header
        const sepG = this.add.graphics();
        sepG.lineStyle(1, 0x2a1a44);
        sepG.lineBetween(px + 4, py + HEADER_H, px + pw - 4, py + HEADER_H);

        // ── Layout constants ─────────────────────────────────────────────────
        const FOOTER_H  = 18;
        const contentY  = py + HEADER_H + 4;
        const contentH  = ph - HEADER_H - FOOTER_H - 4;
        const resX      = px + pw - RES_W - 4;
        const listW     = pw - RES_W - DIV_GAP - 10;
        const listX     = px + 4;

        // Vertical divider between spell list and resonance panel
        const divG = this.add.graphics();
        divG.lineStyle(1, 0x1e1030);
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
        this.add.text(w / 2, py + ph - 4, '[↑ ↓] Scroll  · Mouse Wheel', {
            font: '7px monospace', fill: '#2a1a44'
        }).setOrigin(0.5, 1);

        // ── Input ─────────────────────────────────────────────────────────────
        this.input.keyboard.on('keydown-ESC', () => this._close());
        this.input.keyboard.on('keydown-J',   () => this._close());
        this.add.text(w - 6, 4, '✕', { font: 'bold 14px monospace', fill: '#aa4444', stroke: '#000000', strokeThickness: 2 }).setOrigin(1, 0).setInteractive().setDepth(50).on('pointerdown', () => this._close());
        this.input.keyboard.on('keydown-UP',   () => this._scrollBy(-1));
        this.input.keyboard.on('keydown-DOWN', () => this._scrollBy(1));
        this.input.on('wheel', (ptr, objs, dx, dy) => this._scrollBy(dy > 0 ? 1 : -1));

        let _touchY = null, _touchAcc = 0;
        this.input.on('pointerdown', ptr => { _touchY = ptr.y; _touchAcc = 0; });
        this.input.on('pointermove', ptr => {
            if (_touchY === null || !ptr.isDown) return;
            _touchAcc += _touchY - ptr.y;
            _touchY = ptr.y;
            while (Math.abs(_touchAcc) >= 24) {
                this._scrollBy(_touchAcc > 0 ? 1 : -1);
                _touchAcc += _touchAcc > 0 ? -24 : 24;
            }
        });
        this.input.on('pointerup', () => { _touchY = null; _touchAcc = 0; });
    }

    // ── Resonance bars ────────────────────────────────────────────────────────
    _drawResonanceBars(x, y, panelW) {
        this.add.text(x + panelW / 2, y + 2, 'RESONANCE', {
            font: 'bold 8px monospace', fill: '#886699'
        }).setOrigin(0.5, 0);

        let oy = y + 18;
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
            const barW = panelW - 28;

            this.add.text(x + 4, oy, label, { font: '7px monospace', fill: hexC });
            this.add.text(x + panelW - 4, oy, `${val}`, { font: '7px monospace', fill: '#555566' }).setOrigin(1, 0);

            this.add.rectangle(x + 4, oy + 10, barW, 5, 0x1a1a2a).setOrigin(0);
            if (pct > 0) {
                this.add.rectangle(x + 4, oy + 10, Math.floor(barW * pct), 5, color).setOrigin(0);
            }

            oy += 24;
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
            track(this.add.rectangle(x, oy, maxW, rowH - 3, known ? 0x0a0a22 : 0x080812).setOrigin(0));
            const rg = track(this.add.graphics());
            rg.lineStyle(1, known ? color : 0x1e1e33);
            rg.strokeRect(x, oy, maxW, rowH - 3);

            // Element side pip
            track(this.add.rectangle(x + 2, oy + 3, 4, rowH - 9, known ? color : 0x1e1e33).setOrigin(0));

            if (known) {
                const tierName  = TIER_NAMES[level - 1] ?? `Tier ${level}`;
                const isPassive = spell.targetingType === null;
                const slotIdx   = playerStats.getSpellSlotIndex(spell.id);
                const slotHint  = isPassive ? '[passive]' : (slotIdx >= 0 ? `[${SLOT_KEYS[slotIdx]}]` : '[ – ]');
                const costStr   = isPassive ? '' : `  MP:${playerStats.getSpellManaCost(spell.id)}`;

                track(this.add.text(x + 10, oy + 4, spell.name, {
                    font: 'bold 10px monospace', fill: hexC
                }));
                track(this.add.text(x + 10, oy + 16, `${tierName}  ${slotHint}${costStr}`, {
                    font: '7px monospace', fill: '#776688'
                }));
                track(this.add.text(x + 10, oy + 27, spell.lore ?? '', {
                    font: '7px monospace', fill: '#555566',
                    wordWrap: { width: maxW - 90 }
                }));

                // Tier pips
                for (let t = 0; t < 3; t++) {
                    track(this.add.rectangle(
                        x + maxW - 8 - (2 - t) * 11, oy + 5, 8, 8,
                        t < level ? color : 0x1e1e33
                    ).setOrigin(0));
                }

                // Slot buttons — active spells only
                if (!isPassive) {
                    const btnW = 14, btnH = 10, btnGap = 2;
                    const btnStartX = x + maxW - (4 * btnW + 3 * btnGap) - 6;
                    const btnY = oy + 36;

                    SLOT_KEYS.forEach((key, si) => {
                        const bx       = btnStartX + si * (btnW + btnGap);
                        const assigned = playerStats.skillSlots[si] === spell.id;
                        const fillCol  = assigned ? color : 0x141428;
                        const txtCol   = assigned ? '#000000' : '#445566';

                        const btnBg = track(
                            this.add.rectangle(bx, btnY, btnW, btnH, fillCol).setOrigin(0).setInteractive()
                        );
                        track(this.add.text(bx + btnW / 2, btnY + btnH / 2, key, {
                            font: '7px monospace', fill: txtCol
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

                track(this.add.text(x + 10, oy + 7, '??? — Undiscovered', {
                    font: 'bold 9px monospace', fill: '#2e2e44'
                }));

                if (need === null) {
                    track(this.add.text(x + 10, oy + 21, 'Learned from: NPC · Scroll · Tome', {
                        font: '7px monospace', fill: '#3a3a55'
                    }));
                } else {
                    track(this.add.text(x + 10, oy + 21, `${ELEMENT_LABELS[spell.element]} resonance: ${res} / ${need}`, {
                        font: '7px monospace', fill: '#3a3a55'
                    }));
                    const barW = maxW - 24;
                    track(this.add.rectangle(x + 10, oy + 33, barW, 4, 0x111122).setOrigin(0));
                    if (res > 0) {
                        const pct = Math.min(1, res / need);
                        track(this.add.rectangle(x + 10, oy + 33, Math.floor(barW * pct), 4, (color & 0x7f7f7f)).setOrigin(0));
                    }
                }
            }
        }
    }

    _drawScrollBar() {
        const g = this._scrollBar;
        g.clear();

        const total   = this._spells.length;
        const visible = this._visible;
        if (total <= visible) return;

        const trackX = this._listX + this._listW + 3;
        const trackY = this._listY;
        const trackH = this._listH;
        const barH   = Math.max(16, Math.floor((visible / total) * trackH));
        const barY   = trackY + Math.floor((this._scroll / (total - visible)) * (trackH - barH));

        g.fillStyle(0x1a1a33);
        g.fillRect(trackX, trackY, 4, trackH);
        g.fillStyle(0x6633aa);
        g.fillRect(trackX, barY, 4, barH);
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
