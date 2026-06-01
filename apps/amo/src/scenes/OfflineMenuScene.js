import Phaser from 'phaser';

// Kept as a redirect so any stale scene.start('OfflineMenuScene') calls don't crash.
export default class OfflineMenuScene extends Phaser.Scene {
    constructor() { super('OfflineMenuScene'); }
    create() { this.scene.start('StorySelectScene'); }
}
