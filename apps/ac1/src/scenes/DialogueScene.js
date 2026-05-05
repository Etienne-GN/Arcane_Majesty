import Phaser from 'phaser';

export default class DialogueScene extends Phaser.Scene {
    constructor() {
        super('DialogueScene');
    }

    init(data) {
        this.lines = data.lines ?? [];
        this.index = 0;
        this.onComplete = data.onComplete ?? null;
        this.typing = false;
        this.fullText = '';
        this.displayedText = '';
        this.typeTimer = null;
    }

    create() {
        const w = this.scale.width;
        const h = this.scale.height;
        const boxH = 78;
        const boxY = h - boxH - 6;
        const margin = 8;

        // Box background + border
        this.add.rectangle(margin, boxY, w - margin * 2, boxH, 0x0a0a1a, 0.94).setOrigin(0, 0);
        const border = this.add.graphics();
        border.lineStyle(1, 0x5555bb);
        border.strokeRect(margin, boxY, w - margin * 2, boxH);

        this.speakerBg   = this.add.rectangle(margin + 6, boxY - 12, 80, 14, 0x222255, 0.95).setOrigin(0, 0);
        this.speakerText = this.add.text(margin + 10, boxY - 11, '', {
            font: 'bold 9px monospace', fill: '#ffd700'
        });

        this.bodyText = this.add.text(margin + 8, boxY + 10, '', {
            font: '10px monospace',
            fill: '#e8e8e8',
            wordWrap: { width: w - margin * 2 - 20 },
            lineSpacing: 3
        });

        this.prompt = this.add.text(w - margin - 6, boxY + boxH - 10, '▼', {
            font: '9px monospace', fill: '#8888ff'
        }).setOrigin(1, 1).setAlpha(0);

        this.tweens.add({ targets: this.prompt, alpha: 1, yoyo: true, repeat: -1, duration: 450 });

        // Input
        this.input.keyboard.on('keydown-SPACE', () => this._advance());
        this.input.keyboard.on('keydown-E',     () => this._advance());
        this.input.on('pointerdown',            () => this._advance());

        this._showLine();
    }

    _showLine() {
        if (this.index >= this.lines.length) { this._end(); return; }

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
                if (i >= this.fullText.length) {
                    this.typing = false;
                    this.tweens.add({ targets: this.prompt, alpha: 1, yoyo: true, repeat: -1, duration: 450 });
                }
            }
        });
    }

    _advance() {
        if (this.typing) {
            // Skip typewriter, show full text immediately
            if (this.typeTimer) this.typeTimer.remove();
            this.typing = false;
            this.bodyText.setText(this.fullText);
            this.tweens.add({ targets: this.prompt, alpha: 1, yoyo: true, repeat: -1, duration: 450 });
            return;
        }
        this.index++;
        this._showLine();
    }

    _end() {
        const cb = this.onComplete;
        this.scene.stop();
        this.scene.resume('GameScene');
        if (cb) cb();
    }
}
