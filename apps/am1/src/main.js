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
import CampfireScene   from './scenes/CampfireScene.js';
import CraftingScene   from './scenes/CraftingScene.js';
import ShopScene       from './scenes/ShopScene.js';
import FastTravelScene    from './scenes/FastTravelScene.js';
import AethericTearScene  from './scenes/AethericTearScene.js';
import WorldMapScene      from './scenes/WorldMapScene.js';
import QuestJournalScene  from './scenes/QuestJournalScene.js';
import CodexScene         from './scenes/CodexScene.js';
import OptionsScene       from './scenes/OptionsScene.js';
import CreditsScene       from './scenes/CreditsScene.js';

const ZOOM = 2; // base renderer zoom (pixel art sharpness on hi-DPI); game world zoom is set via camera in GameScene
const config = {
    type: Phaser.AUTO,
    parent: 'app',
    pixelArt: true,
    zoom: ZOOM,
    backgroundColor: '#000000',
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.NO_CENTER,
    },
    input: { gamepad: true },
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
        CampfireScene,
        CraftingScene,
        ShopScene,
        FastTravelScene,
        AethericTearScene,
        WorldMapScene,
        QuestJournalScene,
        CodexScene,
        OptionsScene,
        CreditsScene,
    ]
};

new Phaser.Game(config);
