import Phaser from 'phaser';
import { QUESTS } from '../data/quests.js';
import { playerStats } from '../systems/PlayerStats.js';

export default class QuestJournalScene extends Phaser.Scene {
    constructor() { super('QuestJournalScene'); }

    create() {
        const w = this.scale.width, h = this.scale.height;

        this.add.rectangle(0, 0, w, h, 0x000000, 0.90).setOrigin(0);

        // Tab headers
        this._tab = 'quests'; // 'quests' | 'archive'
        this._tabQuestLabel   = this.add.text(w / 2 - 50, 6, '[ QUESTS ]', {
            font: 'bold 9px monospace', fill: '#ffd700', stroke: '#000', strokeThickness: 2
        }).setOrigin(0.5, 0);
        this._tabArchiveLabel = this.add.text(w / 2 + 50, 6, '[ ARCHIVE ]', {
            font: 'bold 9px monospace', fill: '#334455', stroke: '#000', strokeThickness: 2
        }).setOrigin(0.5, 0);

        const divX = 162;
        this._divLine = this.add.rectangle(divX, 20, 1, h - 28, 0x334455, 0.8).setOrigin(0, 0);

        this._selectedIndex = 0;
        this._archiveIndex  = 0;
        this._listGfx   = [];
        this._detailGfx = [];

        this._buildQuestList();
        this._render();

        this.input.keyboard.on('keydown-N',    () => this._close());
        this.input.keyboard.on('keydown-ESC',  () => this._close());
        this.add.text(w - 6, 4, '✕', { font: 'bold 14px monospace', fill: '#aa4444', stroke: '#000000', strokeThickness: 2 }).setOrigin(1, 0).setInteractive().setDepth(50).on('pointerdown', () => this._close());
        this.input.keyboard.on('keydown-UP',   () => this._navigate(-1));
        this.input.keyboard.on('keydown-DOWN', () => this._navigate(1));
        this.input.keyboard.on('keydown-A',    () => this._toggleTab());

        let _touchY = null, _touchAcc = 0;
        this.input.on('pointerdown', ptr => { _touchY = ptr.y; _touchAcc = 0; });
        this.input.on('pointermove', ptr => {
            if (_touchY === null || !ptr.isDown) return;
            _touchAcc += _touchY - ptr.y;
            _touchY = ptr.y;
            while (Math.abs(_touchAcc) >= 28) {
                this._navigate(_touchAcc > 0 ? 1 : -1);
                _touchAcc += _touchAcc > 0 ? -28 : 28;
            }
        });
        this.input.on('pointerup', () => { _touchY = null; _touchAcc = 0; });

        this._hintText = this.add.text(w / 2, h - 8, '[N]/[ESC] Close   [↑↓] Navigate   [A] Archive', {
            font: '7px monospace', fill: '#334455'
        }).setOrigin(0.5, 1);
    }

    _toggleTab() {
        this._tab = this._tab === 'quests' ? 'archive' : 'quests';
        const activeColor  = '#ffd700';
        const inactiveColor = '#334455';
        this._tabQuestLabel.setStyle({ fill: this._tab === 'quests' ? activeColor : inactiveColor });
        this._tabArchiveLabel.setStyle({ fill: this._tab === 'archive' ? activeColor : inactiveColor });
        this._divLine.setVisible(this._tab === 'quests');
        this._render();
    }

    _render() {
        if (this._tab === 'quests') {
            this._drawList();
            this._drawDetail();
        } else {
            this._drawArchive();
        }
    }

    _buildQuestList() {
        const logKeys = Object.keys(playerStats.questLog);
        this._questIds = [
            ...logKeys.filter(id => QUESTS[id]?.type === 'main'),
            ...logKeys.filter(id => QUESTS[id]?.type === 'side'),
            ...logKeys.filter(id => QUESTS[id]?.type === 'hidden'),
        ];
    }

    _drawList() {
        this._listGfx.forEach(o => o.destroy());
        this._listGfx = [];

        const pad = 6, startY = 24;

        if (!this._questIds.length) {
            const t = this.add.text(pad, startY, 'No quests discovered yet.', { font: '8px monospace', fill: '#334455' });
            this._listGfx.push(t);
            return;
        }

        const TYPE_COLORS = { main: 0xffd700, side: 0x88ddaa, hidden: 0xcc88ff };

        this._questIds.forEach((id, i) => {
            const quest = QUESTS[id];
            const log   = playerStats.questLog[id];
            const done  = log?.status === 'completed';
            const sel   = i === this._selectedIndex;
            const col   = TYPE_COLORS[quest?.type] ?? 0xffffff;

            const bg = this.add.rectangle(pad - 2, startY + i * 18, 156, 17, sel ? 0x1a2a3a : 0x000000, sel ? 0.9 : 0).setOrigin(0);
            bg.setInteractive();
            bg.on('pointerdown', () => { this._selectedIndex = i; this._drawList(); this._drawDetail(); });

            const dot  = this.add.circle(pad + 3, startY + i * 18 + 9, 3, col);
            const text = this.add.text(pad + 10, startY + i * 18 + 3, quest?.title ?? id, {
                font: `${sel ? 'bold ' : ''}7px monospace`,
                fill: done ? '#444455' : (sel ? '#ffffff' : '#778899'),
            });
            this._listGfx.push(bg, dot, text);
        });
    }

    _drawDetail() {
        this._detailGfx.forEach(o => o.destroy());
        this._detailGfx = [];

        const x = 170, w = this.scale.width;

        if (!this._questIds.length || !this._questIds[this._selectedIndex]) {
            this._detailGfx.push(this.add.text(x, 28, 'Select a quest to view details.', { font: '8px monospace', fill: '#334455' }));
            return;
        }

        const id    = this._questIds[this._selectedIndex];
        const quest = QUESTS[id];
        const log   = playerStats.questLog[id];
        if (!quest || !log) return;

        const TYPE_LABELS = { main: 'Main Quest', side: 'Side Quest', hidden: 'Hidden Quest' };
        const TYPE_COLORS = { main: '#ffd700', side: '#88ddaa', hidden: '#cc88ff' };
        const done  = log.status === 'completed';

        let y = 26;
        const push = (obj) => { this._detailGfx.push(obj); return obj; };

        push(this.add.text(x, y, quest.title, { font: 'bold 9px monospace', fill: done ? '#555566' : '#ffffff' }));
        y += 14;
        push(this.add.text(x, y, TYPE_LABELS[quest.type] ?? '', { font: '7px monospace', fill: TYPE_COLORS[quest.type] ?? '#ffffff' }));
        y += 13;

        // Description — word-wrap at ~38 chars
        const words = quest.description.split(' ');
        let line = '';
        words.forEach(word => {
            const test = line ? `${line} ${word}` : word;
            if (test.length > 38) { push(this.add.text(x, y, line, { font: '7px monospace', fill: '#667788' })); y += 10; line = word; }
            else line = test;
        });
        if (line) { push(this.add.text(x, y, line, { font: '7px monospace', fill: '#667788' })); y += 10; }
        y += 5;

        push(this.add.text(x, y, 'OBJECTIVES:', { font: 'bold 7px monospace', fill: '#aabbcc' }));
        y += 11;

        quest.steps.forEach(step => {
            const prog  = log.progress[step.id] ?? 0;
            const stepDone = prog >= step.required;
            const check = stepDone ? '✓' : '○';
            const col   = stepDone ? '#44aa44' : '#aabbcc';
            let label   = step.label;
            if (step.required > 1) label = label.replace(/\(0\/\d+\)/, `(${prog}/${step.required})`);
            push(this.add.text(x, y, `${check} ${label}`, { font: '7px monospace', fill: col }));
            y += 10;
        });

        y += 6;
        if (done) {
            push(this.add.text(x, y, '— Completed —', { font: '7px monospace', fill: '#444455' }));
        } else {
            const r = quest.reward;
            const parts = [];
            if (r.glint) parts.push(`${r.glint} Glint`);
            if (r.xp)    parts.push(`${r.xp} XP`);
            if (r.items?.length) parts.push(`${r.items.length} Item${r.items.length > 1 ? 's' : ''}`);
            if (parts.length) push(this.add.text(x, y, `Reward: ${parts.join(', ')}`, { font: '7px monospace', fill: '#ccaa44' }));
        }
    }

    _drawArchive() {
        this._listGfx.forEach(o => o.destroy());
        this._detailGfx.forEach(o => o.destroy());
        this._listGfx = [];
        this._detailGfx = [];

        const w = this.scale.width, h = this.scale.height;
        const memories = playerStats.recoveredMemories;

        if (!memories.length) {
            this._listGfx.push(this.add.text(8, 26, 'No recovered memories yet.\nComplete quests to unlock\nfragments of lost history.', {
                font: '8px monospace', fill: '#334455'
            }));
            return;
        }

        // Left: memory list
        const pad = 6, startY = 26;
        memories.forEach((mem, i) => {
            const sel = i === this._archiveIndex;
            const bg  = this.add.rectangle(pad - 2, startY + i * 18, 470, 17, sel ? 0x1a2a3a : 0x000000, sel ? 0.9 : 0).setOrigin(0);
            bg.setInteractive();
            bg.on('pointerdown', () => { this._archiveIndex = i; this._drawArchive(); });

            const dot  = this.add.circle(pad + 3, startY + i * 18 + 9, 3, 0x9966cc);
            const text = this.add.text(pad + 10, startY + i * 18 + 3, mem.title, {
                font: `${sel ? 'bold ' : ''}7px monospace`,
                fill: sel ? '#cc99ff' : '#556677'
            });
            this._listGfx.push(bg, dot, text);
        });

        // Detail panel for selected memory
        const mem = memories[this._archiveIndex];
        if (!mem) return;

        const detX = 8, detY = startY + memories.length * 18 + 10;
        this._detailGfx.push(this.add.graphics().lineStyle(1, 0x334455, 0.6).lineBetween(0, detY - 4, w, detY - 4));
        this._detailGfx.push(this.add.text(detX, detY, mem.title, { font: 'bold 8px monospace', fill: '#cc99ff' }));

        let ty = detY + 13;
        const words = mem.text.split(' ');
        let line = '';
        const maxChars = Math.floor((w - 16) / 5.5);
        words.forEach(word => {
            const test = line ? `${line} ${word}` : word;
            if (test.length > maxChars) {
                this._detailGfx.push(this.add.text(detX, ty, line, { font: '7px monospace', fill: '#667788' }));
                ty += 10;
                line = word;
            } else line = test;
        });
        if (line) this._detailGfx.push(this.add.text(detX, ty, line, { font: '7px monospace', fill: '#667788' }));

        // Timestamp
        const date = new Date(mem.timestamp);
        const ts = `${date.getMonth()+1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2,'0')}`;
        this._detailGfx.push(this.add.text(w - 6, detY, ts, { font: '6px monospace', fill: '#223333' }).setOrigin(1, 0));
    }

    _navigate(dir) {
        if (this._tab === 'archive') {
            const len = playerStats.recoveredMemories.length;
            if (!len) return;
            this._archiveIndex = (this._archiveIndex + dir + len) % len;
            this._drawArchive();
            return;
        }
        if (!this._questIds.length) return;
        this._selectedIndex = (this._selectedIndex + dir + this._questIds.length) % this._questIds.length;
        this._drawList();
        this._drawDetail();
    }

    _close() {
        this.scene.stop();
        this.scene.resume('GameScene');
    }
}
