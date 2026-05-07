import Phaser from 'phaser';
import { playerStats } from '../systems/PlayerStats.js';
import { SPELLS, TIER_NAMES, RESONANCE_ELEMENTS } from '../data/spells.js';

const ELEMENT_COLORS = {
    fire:      0xff6600,
    arcane:    0xaa44ff,
    lightning: 0xffdd00,
    shadow:    0x8800cc,
    earth:     0x44aa22,
};

const ELEMENT_LABELS = {
    fire: 'Fire', arcane: 'Arcane', lightning: 'Lightning', shadow: 'Shadow', earth: 'Earth',
};

const SLOT_KEYS = ['Q', 'R', 'F', 'T'];

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

        this.add.text(w / 2, py + 9, "ELDRIN'S SPELLBOOK", {
            font: 'bold 13px monospace', fill: '#cc88ff'
        }).setOrigin(0.5, 0);

        // Slot legend header
        this.add.text(px + 10, py + 14, `Slots: ${SLOT_KEYS.map(k => `[${k}]`).join(' ')} — click to assign`, {
            font: '7px monospace', fill: '#443355'
        });

        // Resonance bars — right column
        this._drawResonanceBars(pw - 94, py + 24, 86);

        // Spell list — refreshable left column
        this._sx = px + 10;
        this._sy = py + 26;
        this._smaxW = pw - 110;
        this._drawSpells();

        this.add.text(w / 2, ph + py - 8, '[ESC] or [J] Close', {
            font: '8px monospace', fill: '#443355'
        }).setOrigin(0.5, 1);

        this.input.keyboard.on('keydown-ESC', () => this._close());
        this.input.keyboard.on('keydown-J',   () => this._close());
    }

    _drawResonanceBars(x, y, barW) {
        this.add.text(x + barW / 2, y, 'RESONANCE', {
            font: 'bold 8px monospace', fill: '#886699'
        }).setOrigin(0.5, 0);

        let oy = y + 14;
        for (const el of RESONANCE_ELEMENTS) {
            const val = playerStats.resonance[el];
            const color = ELEMENT_COLORS[el];
            const label = ELEMENT_LABELS[el];

            let maxThreshold = 1;
            for (const spell of Object.values(SPELLS)) {
                if (spell.element !== el) continue;
                const top = spell.masteryThresholds?.[spell.masteryThresholds.length - 1] ?? spell.discoverCondition.threshold;
                if (top > maxThreshold) maxThreshold = top;
            }
            const pct = Math.min(1, val / maxThreshold);

            this.add.text(x, oy, label, { font: '7px monospace', fill: `#${color.toString(16).padStart(6, '0')}` });
            const barH = 5;
            this.add.rectangle(x, oy + 9, barW, barH, 0x1a1a2a).setOrigin(0);
            if (pct > 0) this.add.rectangle(x, oy + 9, Math.floor(barW * pct), barH, color).setOrigin(0);
            this.add.text(x + barW, oy + 9, `${val}`, { font: '7px monospace', fill: '#555566' }).setOrigin(1, 0);

            oy += 22;
        }
    }

    // Destroy and recreate the spell list (called on slot assignment change)
    _drawSpells() {
        const x = this._sx, y = this._sy, maxW = this._smaxW;

        if (this._spellObjs) {
            this._spellObjs.forEach(o => o?.destroy?.());
        }
        this._spellObjs = [];
        const track = obj => { this._spellObjs.push(obj); return obj; };

        const spellList = Object.values(SPELLS);
        const rowH = 48;

        spellList.forEach((spell, i) => {
            const oy = y + i * rowH;
            const level = playerStats.getSpellLevel(spell.id);
            const known  = level > 0;
            const color  = ELEMENT_COLORS[spell.element];

            // Row background + border
            track(this.add.rectangle(x, oy, maxW, rowH - 3, known ? 0x0a0a22 : 0x080812).setOrigin(0));
            const bdrG = track(this.add.graphics());
            bdrG.lineStyle(1, known ? color : 0x222233);
            bdrG.strokeRect(x, oy, maxW, rowH - 3);

            // Element side pip
            track(this.add.rectangle(x + 3, oy + 3, 4, rowH - 9, known ? color : 0x222233).setOrigin(0));

            if (known) {
                const tierName  = TIER_NAMES[level - 1];
                const isPassive = spell.targetingType === null;
                const slotIdx   = playerStats.getSpellSlotIndex(spell.id);
                const slotHint  = isPassive ? '[passive]' : (slotIdx >= 0 ? `[${SLOT_KEYS[slotIdx]}]` : '[ – ]');
                const costStr   = isPassive ? '' : `  MP:${playerStats.getSpellManaCost(spell.id)}`;

                track(this.add.text(x + 11, oy + 4, spell.name, {
                    font: 'bold 10px monospace', fill: `#${color.toString(16).padStart(6, '0')}`
                }));
                track(this.add.text(x + 11, oy + 16, `${tierName}  ${slotHint}${costStr}`, {
                    font: '8px monospace', fill: '#887799'
                }));
                track(this.add.text(x + 11, oy + 27, spell.lore, {
                    font: '7px monospace', fill: '#666677',
                    wordWrap: { width: maxW - 76 }
                }));

                // Tier pips (top-right corner)
                for (let t = 0; t < 3; t++) {
                    track(this.add.rectangle(
                        x + maxW - 10 - (2 - t) * 12, oy + 6, 9, 9,
                        t < level ? color : 0x222233
                    ).setOrigin(0));
                }

                // Slot assignment buttons [Q][R][F][T] — active spells only
                if (!isPassive) {
                    const btnW = 13, btnH = 10, btnGap = 2;
                    const btnStartX = x + maxW - (4 * btnW + 3 * btnGap) - 4;
                    const btnY = oy + 33;

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
                            if (assigned) {
                                playerStats.assignSkillSlot(si, null);
                            } else {
                                playerStats.assignSkillSlot(si, spell.id);
                            }
                            this._drawSpells();
                        });
                        btnBg.on('pointerover', () => btnBg.setFillStyle(assigned ? 0xffffff : 0x2a2a55));
                        btnBg.on('pointerout',  () => btnBg.setFillStyle(fillCol));
                    });
                }

            } else {
                // Undiscovered
                const res = playerStats.resonance[spell.element];
                const need = spell.discoverCondition.threshold;
                const elLabel = ELEMENT_LABELS[spell.element];

                track(this.add.text(x + 11, oy + 8, '??? — Undiscovered', {
                    font: 'bold 9px monospace', fill: '#333344'
                }));
                track(this.add.text(x + 11, oy + 20, `${elLabel} resonance: ${res} / ${need}`, {
                    font: '8px monospace', fill: '#444455'
                }));

                const barW = maxW - 22;
                track(this.add.rectangle(x + 11, oy + 32, barW, 4, 0x111122).setOrigin(0));
                if (res > 0) {
                    const pct = Math.min(1, res / need);
                    track(this.add.rectangle(x + 11, oy + 32, Math.floor(barW * pct), 4, color * 0.4 + 0x111111).setOrigin(0));
                }
            }
        });
    }

    _close() {
        this.scene.stop();
        this.scene.resume('GameScene');
    }
}
