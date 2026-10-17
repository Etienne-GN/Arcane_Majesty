import Phaser from 'phaser';
import { playerStats } from '../systems/PlayerStats.js';
import { questManager } from '../systems/QuestManager.js';
import { SaveManager } from '../systems/SaveManager.js';
import { GamepadNav } from '../systems/GamepadNav.js';
import { ITEMS } from '../data/items.js';
import { boardView, acceptBounty } from '../data/bounties.js';
import { questDetail, rewardParts } from '../data/questRules.js';

const KIND = {
    hunt:   { tag: 'HUNT',   color: '#ff9955' },
    elite:  { tag: 'ELITE',  color: '#ffcc33' },
    gather: { tag: 'GATHER', color: '#88dd88' },
};

// The town bounty board (data/bounties.js): today's three offers, the active
// bounty's progress, and accepting one. Turning in happens in GameScene on E,
// before this opens.
export default class BountyBoardScene extends Phaser.Scene {
    constructor() { super('BountyBoardScene'); }

    init(data) {
        this._ctx = data;           // { boardId, day, pools, band, where }
        this._sel = 0;
        this._msg = '';
    }

    create() {
        const w = this.scale.width, h = this.scale.height;
        this.add.rectangle(0, 0, w, h, 0x000000, 0.86).setOrigin(0);
        this._pw = Math.min(900, w - 40);
        this._px = (w - this._pw) / 2;
        this._gfx = [];

        this.add.text(w - 12, 8, '✕', { font: 'bold 28px monospace', fill: '#aa4444', stroke: '#000000', strokeThickness: 2 })
            .setOrigin(1, 0).setInteractive().setDepth(50).on('pointerdown', () => this._close());
        this.add.text(w / 2, h - 14, '[↑↓] Choose   [E]/[Enter] Accept   [Esc] Close', {
            font: '14px monospace', fill: '#556677',
        }).setOrigin(0.5, 1);

        const kb = this.input.keyboard;
        kb.on('keydown-ESC',   () => this._close());
        kb.on('keydown-UP',    () => this._move(-1));
        kb.on('keydown-DOWN',  () => this._move(1));
        kb.on('keydown-E',     () => this._accept());
        kb.on('keydown-ENTER', () => this._accept());
        kb.on('keydown-SPACE', () => this._accept());
        this._gpNav = new GamepadNav(this);

        this._render();
    }

    update(_t, delta) {
        const gp = this._gpNav.poll(delta);
        if (!gp) return;
        if (gp.up)   this._move(-1);
        if (gp.down) this._move(1);
        if (gp.A)    this._accept();
        if (gp.B || gp.start) this._close();
    }

    _view() {
        const { boardId, day, pools, band, where } = this._ctx;
        return boardView(playerStats, boardId, day, pools, band, where);
    }

    _move(d) {
        const n = this._view().offers.length;
        this._sel = (this._sel + d + n) % n;
        this._render();
    }

    _accept(index = this._sel) {
        this._sel = index;
        const res = acceptBounty(playerStats, this._ctx.boardId, index);
        if (res.ok) {
            questManager.startQuest(res.questId);
            SaveManager.save(playerStats);
            this._msg = 'Bounty accepted — it is in your quest journal.';
        } else {
            this._msg = { busy: 'Finish your current bounty first.', taken: 'You already took that one today.' }[res.reason] ?? '';
        }
        this._render();
    }

    _render() {
        this._gfx.forEach(o => o.destroy());
        this._gfx = [];
        const push = o => { this._gfx.push(o); return o; };
        const view = this._view();
        const { where, band } = this._ctx;
        const x = this._px, pw = this._pw;
        let y = 24;

        push(this.add.text(x, y, `BOUNTY BOARD — ${where.place}`, { font: 'bold 22px monospace', fill: '#ffd700' }));
        y += 30;
        push(this.add.text(x, y, `Hunting grounds: ${where.region} (Lv ${band.min}–${band.max}) · three new bounties each day · one at a time`, {
            font: '13px monospace', fill: '#778899', wordWrap: { width: pw },
        }));
        y += 34;

        const names = { itemName: id => ITEMS[id]?.name ?? id };
        view.offers.forEach((offer, i) => {
            const def = offer.def, k = KIND[def.kind] ?? KIND.hunt, sel = i === this._sel;
            const active = view.active === def.id;
            const rowH = 84;
            const bg = push(this.add.rectangle(x - 8, y - 6, pw + 16, rowH, sel ? 0x1a2a3a : 0x0d1520, 0.95).setOrigin(0)
                .setStrokeStyle(1, sel ? 0x5577aa : 0x223344).setInteractive({ useHandCursor: true }));
            // Re-rendering destroys this row, so not inside its own input event
            bg.on('pointerdown', () => this.time.delayedCall(0, () => this._accept(i)));

            push(this.add.text(x, y, `[${k.tag}]`, { font: 'bold 14px monospace', fill: k.color }));
            push(this.add.text(x + 86, y, def.title, { font: 'bold 16px monospace', fill: offer.taken && !active ? '#556677' : '#ffffff' }));
            push(this.add.text(x + 86, y + 22, def.description, { font: '13px monospace', fill: '#8899aa', wordWrap: { width: pw - 220 } }));
            push(this.add.text(x + 86, y + 54, `Reward: ${rewardParts(def.reward, names).join(', ')}`, { font: '13px monospace', fill: '#ccaa44' }));

            const status = active ? 'ACTIVE' : offer.taken ? 'TAKEN' : view.active ? '—' : 'ACCEPT';
            const color  = active ? '#44cc66' : status === 'ACCEPT' ? '#ffd700' : '#556677';
            push(this.add.text(x + pw, y + 26, status === 'ACCEPT' && sel ? '[ACCEPT]' : status, { font: 'bold 15px monospace', fill: color }).setOrigin(1, 0));
            y += rowH + 8;
        });

        y += 6;
        const activeDef = view.active ? questManager.questDef(view.active) : null;
        if (activeDef) {
            const detail = questDetail(activeDef, playerStats.questLog[view.active], {
                countItem: id => playerStats.countItem(id), isCompleted: () => true, titleOf: id => id,
            });
            push(this.add.text(x, y, `Current bounty: ${activeDef.title}`, { font: 'bold 15px monospace', fill: '#44cc66' }));
            y += 22;
            detail.steps.forEach(st => {
                push(this.add.text(x + 12, y, `${st.done ? '✓' : '○'} ${st.text}`, { font: '14px monospace', fill: st.done ? '#44aa44' : '#aabbcc' }));
                y += 20;
            });
            push(this.add.text(x + 12, y, 'Come back to this board to turn it in.', { font: 'italic 13px monospace', fill: '#667788' }));
            y += 22;
        }
        if (this._msg) push(this.add.text(x, y + 4, this._msg, { font: '14px monospace', fill: '#ffcc88' }));
    }

    _close() {
        SaveManager.save(playerStats);
        this.scene.stop();
        this.scene.resume('GameScene');
    }
}
