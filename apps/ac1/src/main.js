import Phaser from 'phaser';
import BootScene      from './scenes/BootScene.js';
import MenuScene      from './scenes/MenuScene.js';
import GameScene      from './scenes/GameScene.js';
import UIScene        from './scenes/UIScene.js';
import SkillTreeScene from './scenes/SkillTreeScene.js';
import InventoryScene from './scenes/InventoryScene.js';
import DialogueScene  from './scenes/DialogueScene.js';
import GameOverScene  from './scenes/GameOverScene.js';

const config = {
    type: Phaser.AUTO,
    width: 480,
    height: 320,
    parent: 'app',
    pixelArt: true,
    zoom: 2,
    backgroundColor: '#000000',
    physics: {
        default: 'arcade',
        arcade: { gravity: { y: 0 }, debug: false }
    },
    scene: [
        BootScene,
        MenuScene,
        GameScene,
        UIScene,
        SkillTreeScene,
        InventoryScene,
        DialogueScene,
        GameOverScene
    ]
};

new Phaser.Game(config);
