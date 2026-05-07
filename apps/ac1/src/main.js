import Phaser from 'phaser';
import BootScene       from './scenes/BootScene.js';
import MenuScene       from './scenes/MenuScene.js';
import GameScene       from './scenes/GameScene.js';
import UIScene         from './scenes/UIScene.js';
import SkillTreeScene  from './scenes/SkillTreeScene.js';
import InventoryScene  from './scenes/InventoryScene.js';
import DialogueScene   from './scenes/DialogueScene.js';
import GameOverScene   from './scenes/GameOverScene.js';
import SpellbookScene  from './scenes/SpellbookScene.js';
import ShopScene       from './scenes/ShopScene.js';
import FastTravelScene    from './scenes/FastTravelScene.js';
import WorldMapScene      from './scenes/WorldMapScene.js';
import QuestJournalScene  from './scenes/QuestJournalScene.js';

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
        GameOverScene,
        SpellbookScene,
        ShopScene,
        FastTravelScene,
        WorldMapScene,
        QuestJournalScene,
    ]
};

new Phaser.Game(config);
