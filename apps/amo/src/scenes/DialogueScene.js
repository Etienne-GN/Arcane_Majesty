import Phaser from 'phaser';
import { GamepadNav } from '../systems/GamepadNav.js';
import { playerStats } from '../systems/PlayerStats.js';
import { questManager } from '../systems/QuestManager.js';
import { DIALOGUES } from '../data/dialogues.js';
import { visibleLines, applyChoice } from '../data/questRules.js';

export default class DialogueScene extends Phaser.Scene {
    constructor() {
        super('DialogueScene');
    }

    init(data) {
        this.lines = visibleLines(data.lines ?? [], playerStats.flags);
        this.index = 0;
        this.onComplete = data.onComplete ?? null;
        this.typing = false;
        this.fullText = '';
        this.displayedText = '';
        this.typeTimer = null;
        this._choiceTexts = [];   // shown once a line with `choices` has finished typing
        this._choiceIndex = 0;
    }

    create() {
        const w = this.scale.width;
        const h = this.scale.height;
        const boxH = 156;
        const boxY = h - boxH - 12;
        const margin = 16;

        // Box background + border
        this.add.rectangle(margin, boxY, w - margin * 2, boxH, 0x0a0a1a, 0.94).setOrigin(0, 0);
        const border = this.add.graphics();
        border.lineStyle(2, 0x5555bb);
        border.strokeRect(margin, boxY, w - margin * 2, boxH);

        this.speakerBg   = this.add.rectangle(margin + 12, boxY - 24, 160, 28, 0x222255, 0.95).setOrigin(0, 0);
        this.speakerText = this.add.text(margin + 20, boxY - 22, '', {
            font: 'bold 18px monospace', fill: '#ffd700'
        });

        this.bodyText = this.add.text(margin + 16, boxY + 20, '', {
            font: '20px monospace',
            fill: '#e8e8e8',
            wordWrap: { width: w - margin * 2 - 40 },
            lineSpacing: 6
        });

        this.prompt = this.add.text(w - margin - 12, boxY + boxH - 20, '▼', {
            font: '18px monospace', fill: '#8888ff'
        }).setOrigin(1, 1).setAlpha(0);

        this.tweens.add({ targets: this.prompt, alpha: 1, yoyo: true, repeat: -1, duration: 450 });

        // Input
        this._boxY = boxY;
        this.input.keyboard.on('keydown-SPACE', () => this._advance());
        this.input.keyboard.on('keydown-E',     () => this._advance());
        this.input.keyboard.on('keydown-ENTER', () => this._advance());
        this.input.keyboard.on('keydown-UP',    () => this._moveChoice(-1));
        this.input.keyboard.on('keydown-DOWN',  () => this._moveChoice(1));
        ['ONE', 'TWO', 'THREE', 'FOUR'].forEach((k, i) => this.input.keyboard.on(`keydown-${k}`, () => {
            if (i < this._choiceTexts.length) { this._choiceIndex = i; this._pick(); }
        }));
        // Clicks on a choice row pick it (the row's own handler); elsewhere they advance.
        this.input.on('pointerdown', (_p, over) => { if (!this._choiceTexts.length && !over.length) this._advance(); });

        this._gpNav = new GamepadNav(this);
        this._showLine();
    }

    update(time, delta) {
        const gp = this._gpNav.poll(delta);
        if (!gp) return;
        if (gp.up)   this._moveChoice(-1);
        if (gp.down) this._moveChoice(1);
        if (gp.A) this._advance();
    }

    _showLine() {
        if (this.index >= this.lines.length) { this._end(); return; }

        this._clearChoices();
        const line = this.lines[this.index];
        this.speakerText.setText(line.speaker ? `${line.speaker}` : '');
        this.speakerBg.setVisible(!!line.speaker);

        this.fullText = line.text;
        this.displayedText = '';
        this.typing = true;
        this.prompt.setAlpha(0);

        // Typewriter effect
        let i = 0;
        if (this.typeTimer) this.typeTimer.remove();
        this.typeTimer = this.time.addEvent({
            delay: 28,
            repeat: this.fullText.length - 1,
            callback: () => {
                this.displayedText += this.fullText[i++];
                this.bodyText.setText(this.displayedText);
                if (i >= this.fullText.length) this._lineShown();
            }
        });
    }

    _advance() {
        if (this.typing) {
            // Skip typewriter, show full text immediately
            if (this.typeTimer) this.typeTimer.remove();
            this.typing = false;
            this.bodyText.setText(this.fullText);
            this._lineShown();
            return;
        }
        if (this._choiceTexts.length) { this._pick(); return; }
        this.index++;
        this._showLine();
    }

    _lineShown() {
        this.typing = false;
        const choices = this.lines[this.index]?.choices;
        if (choices?.length) { this._showChoices(choices); return; }
        this.tweens.add({ targets: this.prompt, alpha: 1, yoyo: true, repeat: -1, duration: 450 });
    }

    // Numbered rows under the line's text; the line can't be skipped without picking one.
    _showChoices(choices) {
        this._clearChoices();
        this.tweens.killTweensOf(this.prompt);
        this.prompt.setAlpha(0);
        const x = 40, y0 = this._boxY + 20 + this.bodyText.height + 10;
        this._choiceTexts = choices.map((c, i) => this.add.text(x, y0 + i * 26, '', {
            font: '18px monospace', fill: '#e8e8e8',
        }).setInteractive({ useHandCursor: true })
            .on('pointerover', () => { this._choiceIndex = i; this._paintChoices(); })
            .on('pointerdown', () => { this._choiceIndex = i; this._pick(); }));
        this._choiceIndex = 0;
        this._choicesAt = this.time.now;   // a short grace so mashing E through the text doesn't pick for you
        this._paintChoices();
    }

    _paintChoices() {
        const choices = this.lines[this.index]?.choices ?? [];
        this._choiceTexts.forEach((t, i) => {
            const sel = i === this._choiceIndex;
            t.setText(`${sel ? '▶' : ' '} ${i + 1}. ${choices[i].text}`).setColor(sel ? '#ffd700' : '#9999bb');
        });
    }

    _moveChoice(d) {
        if (!this._choiceTexts.length) return;
        const n = this._choiceTexts.length;
        this._choiceIndex = (this._choiceIndex + d + n) % n;
        this._paintChoices();
    }

    _clearChoices() {
        this._choiceTexts.forEach(t => t.destroy());
        this._choiceTexts = [];
    }

    _pick() {
        const choice = this.lines[this.index]?.choices?.[this._choiceIndex];
        if (!choice || this.time.now - (this._choicesAt ?? 0) < 350) return;
        this._clearChoices();
        const next = applyChoice(choice, playerStats.flags, id => questManager.startQuest(id));
        if (next && DIALOGUES[next]) {
            this.lines = visibleLines(DIALOGUES[next], playerStats.flags);
            this.index = 0;
        } else {
            this.index++;
        }
        this._showLine();
    }

    _end() {
        const cb = this.onComplete;
        this.scene.stop();
        this.scene.resume('GameScene');
        if (cb) cb();
    }
}
