// Game configuration
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    scene: {
        preload: preload,
        create: create,
        update: update
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    // Improves rendering of pixel art
    render: {
        pixelArt: true
    }
};

// Game variables
let game = new Phaser.Game(config);
let player;
let cursors;

/**
 * Preloads game assets.
 */
function preload() {
    // Load the spritesheet
    this.load.spritesheet('player', 'assets/player_spritesheet.png', {
        frameWidth: 16,
        frameHeight: 16
    });
}

/**
 * Creates game objects and initializes the scene.
 */
function create() {
    // Add the player sprite with physics
    player = this.physics.add.sprite(400, 300, 'player');
    player.setCollideWorldBounds(true); // Don't let the player walk off-screen

    // --- Player Animations ---
    // Based on the Mystic Woods asset pack, the player animations are on specific rows.
    // These frame numbers are based on a 20-tile wide spritesheet.
    const anims = this.anims;

    // Walking animations
    anims.create({
        key: 'walk-down',
        frames: anims.generateFrameNumbers('player', { start: 120, end: 125 }),
        frameRate: 10,
        repeat: -1
    });
    anims.create({
        key: 'walk-up',
        frames: anims.generateFrameNumbers('player', { start: 140, end: 145 }),
        frameRate: 10,
        repeat: -1
    });
    anims.create({
        key: 'walk-left',
        frames: anims.generateFrameNumbers('player', { start: 160, end: 165 }),
        frameRate: 10,
        repeat: -1
    });
    anims.create({
        key: 'walk-right',
        frames: anims.generateFrameNumbers('player', { start: 180, end: 185 }),
        frameRate: 10,
        repeat: -1
    });

    // Idle animations (using the first frame of each walking animation)
    anims.create({
        key: 'idle-down',
        frames: [{ key: 'player', frame: 120 }],
        frameRate: 20
    });
    anims.create({
        key: 'idle-up',
        frames: [{ key: 'player', frame: 140 }],
        frameRate: 20
    });
    anims.create({
        key: 'idle-left',
        frames: [{ key: 'player', frame: 160 }],
        frameRate: 20
    });
    anims.create({
        key: 'idle-right',
        frames: [{ key: 'player', frame: 180 }],
        frameRate: 20
    });


    // Initialize keyboard controls
    cursors = this.input.keyboard.createCursorKeys();
}

/**
 * Game loop, runs on every frame.
 */
function update() {
    const speed = 100;
    player.setVelocity(0);

    // Horizontal movement
    if (cursors.left.isDown) {
        player.setVelocityX(-speed);
        player.anims.play('walk-left', true);
    } else if (cursors.right.isDown) {
        player.setVelocityX(speed);
        player.anims.play('walk-right', true);
    }
    // Vertical movement
    else if (cursors.up.isDown) {
        player.setVelocityY(-speed);
        player.anims.play('walk-up', true);
    } else if (cursors.down.isDown) {
        player.setVelocityY(speed);
        player.anims.play('walk-down', true);
    } else {
        // If no keys are pressed, play the idle animation corresponding to the last direction.
        // This requires storing the last direction, for now we'll just default to idle-down.
        const currentAnim = player.anims.currentAnim;
        if (currentAnim) {
            const animName = currentAnim.key;
            if (animName.startsWith('walk-')) {
                const direction = animName.split('-')[1];
                player.anims.play(`idle-${direction}`);
            }
        } else {
            player.anims.play('idle-down');
        }
    }
}