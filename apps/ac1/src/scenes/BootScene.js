import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        console.log('BootScene: Loading eldrin with 64x64 frames');
        // Preload assets
        this.add.text(20, 20, 'Loading...', { font: '16px monospace', fill: '#ffffff' });

        // Load the main character spritesheet
        // Standard LPC-style sprites are often 64x64
        this.load.spritesheet('eldrin', 'assets/Eldrin.png', { frameWidth: 64, frameHeight: 64 });
        
        // Simulate asset loading time for effect (remove in production)
        this.time.delayedCall(1000, () => {
            this.scene.start('MenuScene');
        });
    }

    create() {
        // Init global registries if needed
    }
}
