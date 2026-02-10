import Phaser from 'phaser';

export default class MenuScene extends Phaser.Scene {
    constructor() {
        super('MenuScene');
    }

    create() {
        // Background
        this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x000000).setOrigin(0);

        // Title
        this.add.text(this.scale.width / 2, 80, 'ARCANE MAJESTY', {
            font: '32px monospace',
            fill: '#ffd700',
            align: 'center'
        }).setOrigin(0.5);

        this.add.text(this.scale.width / 2, 120, 'Press START', {
            font: '16px monospace',
            fill: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);

        // Menu Options
        const startBtn = this.add.text(this.scale.width / 2, 200, 'Start Game', { font: '20px monospace', fill: '#ffffff' })
            .setOrigin(0.5)
            .setInteractive()
            .on('pointerdown', () => this.scene.start('GameScene'))
            .on('pointerover', () => startBtn.setStyle({ fill: '#ffff00' }))
            .on('pointerout', () => startBtn.setStyle({ fill: '#ffffff' }));

        const optionsBtn = this.add.text(this.scale.width / 2, 240, 'Options', { font: '20px monospace', fill: '#888888' }) // Disabled look
            .setOrigin(0.5);

        const creditsBtn = this.add.text(this.scale.width / 2, 280, 'Credits', { font: '20px monospace', fill: '#888888' })
            .setOrigin(0.5);

        // Input
        this.input.keyboard.on('keydown-SPACE', () => {
            this.scene.start('GameScene');
        });
    }
}
