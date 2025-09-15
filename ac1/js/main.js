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
        frameWidth: 48,
        frameHeight: 48
    });

    // Load the tilemap
    // this.load.tilemapTiledXML('map', 'maps/level1.tmx');
    // Load the tileset image
    // this.load.image('grass', 'mystic_woods_free_2.2/sprites/tilesets/grass.png');
}

/**
 * Creates game objects and initializes the scene.
 */
function create() {
    // Create the map
    // const map = this.make.tilemap({ key: 'map' });
    // const tileset = map.addTilesetImage('grass', 'grass');
    // const layer = map.createLayer('Tile Layer 1', tileset, 0, 0);

    // Set collision based on the 'collides' property
    // layer.setCollisionByProperty({ collides: true });

    // Add the player sprite with physics
    player = this.physics.add.sprite(100, 100, 'player');
    player.setCollideWorldBounds(true); // Don't let the player walk off-screen

    // Add collision between the player and the map layer
    // this.physics.add.collider(player, layer);

    // --- Player Animations ---
    const anims = this.anims;

    // Walking animations (6 frames each, 6 frames wide spritesheet)
    anims.create({
        key: 'walk-down',
        frames: anims.generateFrameNumbers('player', { start: 0, end: 5 }),
        frameRate: 10,
        repeat: -1
    });
    anims.create({
        key: 'walk-right',
        frames: anims.generateFrameNumbers('player', { start: 6, end: 11 }),
        frameRate: 10,
        repeat: -1
    });
    anims.create({
        key: 'walk-up',
        frames: anims.generateFrameNumbers('player', { start: 12, end: 17 }),
        frameRate: 10,
        repeat: -1
    });

    // Idle animations (single frame)
    anims.create({
        key: 'idle-down',
        frames: [{ key: 'player', frame: 0 }],
        frameRate: 20
    });
    anims.create({
        key: 'idle-right',
        frames: [{ key: 'player', frame: 6 }],
        frameRate: 20
    });
    anims.create({
        key: 'idle-up',
        frames: [{ key: 'player', frame: 12 }],
        frameRate: 20
    });


    // Initialize keyboard controls
    cursors = this.input.keyboard.createCursorKeys();

    // Make the camera follow the player
    // // this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.cameras.main.startFollow(player);
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
        player.flipX = true;
        player.anims.play('walk-right', true);
    } else if (cursors.right.isDown) {
        player.setVelocityX(speed);
        player.flipX = false;
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
        const currentAnim = player.anims.currentAnim;
        if (currentAnim) {
            const animName = currentAnim.key;
            if (animName.startsWith('walk-')) {
                const direction = animName.split('-')[1];
                if (direction === 'right') {
                    player.anims.play(player.flipX ? 'idle-right' : 'idle-right', true);
                } else {
                    player.anims.play(`idle-${direction}`, true);
                }
            }
        } else {
            player.anims.play('idle-down', true);
        }
    }
}