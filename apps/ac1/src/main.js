import Phaser from 'phaser';
import BootScene from './scenes/BootScene';
import MenuScene from './scenes/MenuScene';
import GameScene from './scenes/GameScene';
import SkillTreeScene from './scenes/SkillTreeScene';

const config = {
    type: Phaser.AUTO,
    width: 480,
    height: 320,
    parent: 'app',
    pixelArt: true,
    zoom: 2,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: [BootScene, MenuScene, GameScene, SkillTreeScene]
};

const game = new Phaser.Game(config);