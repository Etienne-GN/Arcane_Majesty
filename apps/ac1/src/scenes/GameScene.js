import Phaser from 'phaser';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
        this.player = null;
        this.cursors = null;
        this.wasd = null;
    }

    create() {
        // Create Player Sprite
        // We use physics.add.sprite so it has a body for collisions/movement
        // Starting at 100, 100 with frame 0
        this.player = this.physics.add.sprite(100, 100, 'eldrin', 0); 
        this.player.setCollideWorldBounds(true);

        // Simple placeholder animation (just frame 0 for now)
        // We will add real animations once we verify the frame alignment

        // Camera follows player
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.cameras.main.setZoom(2); // Zoom in to see pixel art better

        // Controls
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D
        });

        // UI Text (ScrollFactor 0 makes it stick to the screen)
        this.add.text(10, 10, 'Game World (Placeholder)', { font: '16px monospace', fill: '#ffffff' }).setScrollFactor(0);
        this.add.text(10, 30, 'Press "K" for Skills/Stats', { font: '12px monospace', fill: '#aaaaaa' }).setScrollFactor(0);
        this.add.text(10, 50, 'Press "ESC" for Menu', { font: '12px monospace', fill: '#aaaaaa' }).setScrollFactor(0);

        // Input handling for UI
        this.input.keyboard.on('keydown-K', () => { 
            // Pause game and open UI overlay
            this.scene.pause();
            this.scene.launch('SkillTreeScene');
        });

        this.input.keyboard.on('keydown-ESC', () => {
            this.scene.start('MenuScene');
        });
    }

    update() {
        if (!this.player) return;

        const speed = 100;
        const player = this.player;

        // Reset velocity
        player.setVelocity(0);

        // Horizontal movement
        if (this.cursors.left.isDown || this.wasd.left.isDown) {
            player.setVelocityX(-speed);
            player.setFlipX(true); // Flip sprite if moving left
        } else if (this.cursors.right.isDown || this.wasd.right.isDown) {
            player.setVelocityX(speed);
            player.setFlipX(false);
        }

        // Vertical movement
        if (this.cursors.up.isDown || this.wasd.up.isDown) {
            player.setVelocityY(-speed);
        } else if (this.cursors.down.isDown || this.wasd.down.isDown) {
            player.setVelocityY(speed);
        }
    }
}