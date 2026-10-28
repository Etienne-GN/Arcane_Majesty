// Combat C3: the STYLES screen (Y, or STYLE on the touch tray). One card per
// close-combat weapon: its mastery, its style's learning bar, and the style's three
// skills — which can be put on Q/R/F/T next to spells. Rules: systems/styles.js.
import Phaser from 'phaser';
import { playerStats } from '../systems/PlayerStats.js';
import { GamepadNav } from '../systems/GamepadNav.js';
import { STYLES, STYLE_IDS, STYLE_SKILLS } from '../data/styles.js';
import { WEAPON_TYPES } from '../systems/weapons.js';
import { practising } from '../systems/styles.js';
import { SLOT_PAD } from '../controls/launcherDefs.js';

const SLOT_KEYS = ['Q', 'R', 'F', 'T'];
const PAD_SLOTS = SLOT_PAD.map(b => b.name);   // the same buttons that fire Q / R / F / T in play
const STATE_COLOR = { ready: '#ffffff', weapon: '#aaccff', mastery: '#777788', style: '#4a4a5e' };

export default class StylesScene extends Phaser.Scene {
    constructor() { super('StylesScene'); }

    init(data) { this._sel = data?.sel ?? 0; }   // 0..26: card * 3 + row

    create() {
        const w = this.scale.width, h = this.scale.height;
        const px = 20, py = 20, pw = w - 40, ph = h - 40;
        this.add.rectangle(0, 0, w, h, 0x000000, 0.82).setOrigin(0);
        this.add.rectangle(px, py, pw, ph, 0x0a0a1e).setOrigin(0);
        this.add.graphics().lineStyle(4, 0x4444aa).strokeRect(px, py, pw, ph);
        this.add.text(w / 2, py + 12, 'FIGHTING STYLES', { font: 'bold 26px monospace', fill: '#ffd700' }).setOrigin(0.5, 0);
        this.add.text(w - 28, py + 8, '✕', { font: 'bold 26px monospace', fill: '#aa4444' }).setOrigin(1, 0)
            .setInteractive({ useHandCursor: true }).on('pointerdown', () => this._close());

        // 3 × 3 cards between the title and the footer
        const top = py + 52, footH = 86, gap = 10;
        const cardW = Math.floor((pw - 4 * gap) / 3), cardH = Math.floor((ph - 52 - footH - 3 * gap) / 3);
        const f = cardH < 150 ? 12 : 14, line = f + 5;
        STYLE_IDS.forEach((id, i) => this._card(STYLES[id], i, px + gap + (i % 3) * (cardW + gap), top + Math.floor(i / 3) * (cardH + gap), cardW, cardH, f, line));

        // Footer: the selected skill, and how to learn
        const fy = py + ph - footH;
        const k = this._selSkill();
        const state = playerStats.styleSkillState(k.id);
        const how = state === 'ready' || state === 'weapon'
            ? `Press ${SLOT_KEYS.join(', ')} (pad: ${PAD_SLOTS.join(', ')}) to put it on a slot — again to take it off. Close: Esc, Y (pad: Start).`
            : state === 'mastery' ? `Needs ${WEAPON_TYPES[k.weapon].label.toLowerCase()} mastery ${k.unlock} (yours: ${playerStats.weaponLevel(k.weapon)}).`
            : `Learn the ${STYLES[k.style].name} style first.`;
        this.add.text(px + 16, fy, `${k.name} — ${k.desc}  (every ${k.cd / 1000} s)`, { font: '14px monospace', fill: '#ffeebb', wordWrap: { width: pw - 32 } });
        this.add.text(px + 16, fy + 38, how, { font: '13px monospace', fill: '#aaccff' });
        this.add.text(px + 16, fy + 60, 'Learn a style: win fights with its weapon (slow) · read its manual (faster) · lessons from a teacher (fastest)', { font: '12px monospace', fill: '#8888aa' });

        // Input
        const kb = this.input.keyboard;
        kb.on('keydown-ESC', () => this._close());
        kb.on('keydown-Y', () => this._close());
        kb.on('keydown-LEFT', () => this._move(-3));
        kb.on('keydown-RIGHT', () => this._move(3));
        kb.on('keydown-UP', () => this._move(-1));
        kb.on('keydown-DOWN', () => this._move(1));
        SLOT_KEYS.forEach((key, i) => kb.on(`keydown-${key}`, () => this._assign(i)));
        this._gpNav = new GamepadNav(this);
    }

    _card(st, i, x, y, cw, ch, f, line) {
        const weapon = WEAPON_TYPES[st.weapon];
        const lv = playerStats.weaponLevel(st.weapon), cap = playerStats.ceilingFor(st.weapon);
        const pct = Math.floor(playerStats.styles.progress[st.id] ?? 0), known = pct >= 100;
        const g = this.add.graphics();
        g.fillStyle(0x12122a).fillRect(x, y, cw, ch);
        g.lineStyle(2, known ? 0x8888dd : 0x333355).strokeRect(x, y, cw, ch);
        this.add.text(x + 8, y + 6, `${weapon.label}  ·  lv ${lv} / ${cap}`, { font: `bold ${f}px monospace`, fill: cap >= 10 ? '#ffd700' : '#ddddff' });
        let ty = y + 6 + line + 2;
        this.add.text(x + 8, ty, `${st.name} — ${known ? 'Known' : `Learning ${pct}%`}`, { font: `${f}px monospace`, fill: known ? '#88ffaa' : '#ccccdd' });
        ty += line;
        const barW = cw - 16;
        g.fillStyle(0x222244).fillRect(x + 8, ty, barW, 6);
        g.fillStyle(known ? 0x44cc77 : 0x6677dd).fillRect(x + 8, ty, Math.floor(barW * pct / 100), 6);
        ty += 10;
        const notes = [];
        if (!known && practising(playerStats.styles, st.weapon) === st.id) notes.push('● practising');
        if (playerStats.styles.manuals[st.id]) notes.push('manual read');
        if (playerStats.styles.lessons[st.id]) notes.push(`lessons: ${playerStats.styles.lessons[st.id]}`);
        this.add.text(x + 8, ty, notes.join('  ·  ') || ' ', { font: `${f - 1}px monospace`, fill: '#9999bb' });
        ty += line;
        st.skills.forEach((sid, j) => {
            const k = STYLE_SKILLS[sid], state = playerStats.styleSkillState(sid);
            const slot = playerStats.skillSlots.indexOf(sid);
            const sel = this._sel === i * 3 + j;
            const tag = slot >= 0 ? `[${SLOT_KEYS[slot]}] ` : '    ';
            const need = state === 'mastery' ? `  needs ${k.unlock}` : state === 'style' ? '' : state === 'weapon' ? '  (not in hand)' : '';
            const t = this.add.text(x + 8, ty + j * (line + 1), `${sel ? '▶' : ' '}${tag}${k.name} · mastery ${k.unlock}${need}`, {
                font: `${f}px monospace`, fill: sel ? '#ffd700' : STATE_COLOR[state],
            }).setInteractive({ useHandCursor: true });
            t.on('pointerdown', () => this._select(i * 3 + j));
        });
    }

    _selSkill() { return STYLE_SKILLS[STYLES[STYLE_IDS[Math.floor(this._sel / 3)]].skills[this._sel % 3]]; }
    _select(n) { this.scene.restart({ sel: Phaser.Math.Clamp(n, 0, STYLE_IDS.length * 3 - 1) }); }
    // ±1: the next skill (into the next card); ±3: the same skill one card along
    _move(d) {
        const n = this._sel + d;
        if (n >= 0 && n < STYLE_IDS.length * 3) this._select(n);
    }
    _assign(slot) {
        const id = this._selSkill().id;
        playerStats.assignSkillSlot(slot, playerStats.skillSlots[slot] === id ? null : id);
        this._select(this._sel);
    }

    update(time, delta) {
        const gp = this._gpNav?.poll(delta);
        if (!gp) return;
        if (gp.up) this._move(-1);
        if (gp.down) this._move(1);
        if (gp.left) this._move(-3);
        if (gp.right) this._move(3);
        PAD_SLOTS.forEach((b, i) => { if (gp[b]) this._assign(i); });
        if (gp.start) this._close();   // B puts a skill on Q, as it fires Q in play
    }

    _close() {
        this.scene.stop();
        this.scene.resume('GameScene');
    }
}
