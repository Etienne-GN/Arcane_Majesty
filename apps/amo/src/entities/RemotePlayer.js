import Phaser from 'phaser';
import { buildEntityAnims } from '../utils/buildEntityAnims.js';
import { CHARACTERS } from '../data/characters.js';

export default class RemotePlayer extends Phaser.GameObjects.Sprite {
    constructor(scene, state) {
        const charDef = CHARACTERS.find(c => c.id === (state.characterId ?? 'eldrin')) ?? CHARACTERS[0];
        super(scene, state.x, state.y, charDef.spriteKey, charDef.idleFrame);
        scene.add.existing(this);
        this.setDepth(10);
        // Golden tint to distinguish remote players from the local player
        this.setTint(0xffcc44);

        this._charDef = charDef;
        this.targetX  = state.x;
        this.targetY  = state.y;
        this.facing   = state.facing ?? 'down';
        this.playerId = state.id;

        this.nameLabel = scene.add.text(state.x, state.y - 36, state.name ?? '?', {
            font: '7px monospace', fill: '#ffd700',
            stroke: '#000', strokeThickness: 2
        }).setOrigin(0.5, 1).setDepth(30).setResolution(3);

        buildEntityAnims(scene.anims, charDef.animPrefix, charDef.animProfile);
        this.play(`${charDef.animPrefix}_idle_down`);
    }

    applyState(x, y, facing) {
        this.targetX = x;
        this.targetY = y;
        this.facing  = facing;
    }

    update() {
        this.x = Phaser.Math.Linear(this.x, this.targetX, 0.25);
        this.y = Phaser.Math.Linear(this.y, this.targetY, 0.25);
        this.setDepth(this.y + 1);
        this.nameLabel.setPosition(this.x, this.y - 36).setDepth(this.y + 25);

        const pfx = this._charDef.animPrefix;
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        if (Math.abs(dx) > 1.5 || Math.abs(dy) > 1.5) {
            const dir = Math.abs(dx) > Math.abs(dy)
                ? (dx > 0 ? 'right' : 'left')
                : (dy > 0 ? 'down'  : 'up');
            const key = `${pfx}_walk_${dir}`;
            if (this.anims.currentAnim?.key !== key) this.play(key, true);
        } else {
            const key = `${pfx}_idle_${this.facing}`;
            if (this.anims.currentAnim?.key !== key) this.play(key, true);
        }
    }

    destroy(fromScene) {
        if (this.nameLabel?.active) this.nameLabel.destroy();
        super.destroy(fromScene);
    }
}
