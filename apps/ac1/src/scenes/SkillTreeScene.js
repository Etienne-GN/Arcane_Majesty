import Phaser from 'phaser';
import { playerStats } from '../systems/PlayerStats';

export default class SkillTreeScene extends Phaser.Scene {
    constructor() {
        super('SkillTreeScene');
    }

    create() {
        // Semi-transparent background
        this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0.8).setOrigin(0);

        // Header
        this.add.text(20, 20, 'SKILL TREE & STATS', { font: '24px monospace', fill: '#ffd700' });
        
        // Stats Display
        this.add.text(20, 60, `Level: ${playerStats.level}`, { font: '16px monospace', fill: '#fff' });
        this.add.text(20, 80, `XP: ${playerStats.xp} / ${playerStats.xpToNextLevel}`, { font: '16px monospace', fill: '#fff' });
        this.add.text(20, 100, `Skill Points: ${playerStats.skillPoints}`, { font: '16px monospace', fill: '#00ff00' });

        this.add.text(200, 60, `STR: ${playerStats.attributes.strength}`, { font: '14px monospace', fill: '#aaa' });
        this.add.text(200, 80, `AGI: ${playerStats.attributes.agility}`, { font: '14px monospace', fill: '#aaa' });
        this.add.text(200, 100, `WIS: ${playerStats.attributes.wisdom}`, { font: '14px monospace', fill: '#aaa' });

        // Render Skills
        this.renderSkillNodes();

        // Close Instructions
        this.add.text(this.scale.width - 20, 20, '[ESC] Close', { font: '16px monospace', fill: '#fff' }).setOrigin(1, 0);

        // Input to close
        this.input.keyboard.on('keydown-ESC', () => {
            this.scene.stop();
            this.scene.resume('GameScene');
        });
        
        // Input to close (S key toggle)
        this.input.keyboard.on('keydown-S', () => {
            this.scene.stop();
            this.scene.resume('GameScene');
        });
    }

    renderSkillNodes() {
        const startX = 50;
        const startY = 160;
        const gapY = 50;
        
        let index = 0;
        for (const [key, skill] of Object.entries(playerStats.skills)) {
            const y = startY + (index * gapY);
            
            // Determine Color
            let color = 0x555555; // Locked
            let textColor = '#888';
            if (skill.level > 0) {
                color = 0x00aa00; // Learned
                textColor = '#fff';
            } else if (playerStats.canUnlock(key)) {
                color = 0xaaaa00; // Available
                textColor = '#ff0';
            }

            // Draw Box
            const bg = this.add.rectangle(startX, y, 380, 40, color).setOrigin(0, 0.5).setInteractive();
            
            // Draw Text
            const text = this.add.text(startX + 10, y, `${skill.name} (Lv ${skill.level}/${skill.maxLevel})`, { 
                font: '16px monospace', 
                fill: textColor 
            }).setOrigin(0, 0.5);

            // Interaction
            bg.on('pointerdown', () => {
                if (playerStats.upgradeSkill(key)) {
                    // Refresh scene to show update
                    this.scene.restart();
                } else {
                    // Feedback for fail
                    this.cameras.main.shake(100, 0.01);
                }
            });

            // Hover tooltip (simple console log for now, can be UI text later)
            bg.on('pointerover', () => {
                this.add.text(startX + 250, y, 'Click to Upgrade', { font: '10px monospace', fill: '#fff' }).setName('tooltip');
            });
            bg.on('pointerout', () => {
                this.children.getByName('tooltip')?.destroy();
            });

            index++;
        }
    }
}
