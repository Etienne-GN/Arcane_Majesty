### Project Overview

This project is a 2D top-down Action RPG (ARPG) inspired by classic 16-bit console games like "The Legend of Zelda". It is being built using the **Phaser 3** game engine, with **JavaScript** as the primary language. Levels are designed externally using the **Tiled Map Editor**.

The project is being developed iteratively through a phased approach. The current implementation is at the end of **Phase 2**, which features a player character that can be moved around an empty screen with keyboard controls and has walking/idle animations.

The next step is **Phase 3**, which involves creating a game map in Tiled and implementing world collision.

### Building and Running

This is a web-based project and needs to be served by a local web server. No build step is currently required.

1.  Navigate to the project's root directory (`/home/etienne/ac1`) in your terminal.
2.  Run the following command:
    ```sh
    python3 -m http.server
    ```
3.  Open a web browser and go to `http://localhost:8000` to run the game.

### Development Conventions

*   **File Structure:** All game logic is in the `/js` directory, image assets are in `/assets`, and map files from Tiled belong in `/maps`.
*   **Tiled Workflow:** A key convention is the "contract" between the Tiled editor and the Phaser code. To make an object solid, you must:
    1.  Select the tile in the tileset editor within Tiled.
    2.  Add a **Custom Property**.
    3.  Set the property **type** to `bool`, the **name** to `collides`, and the **value** to `true` (checked).
    The game code will read this property to create collisions.
*   **Asset Naming:** The main character spritesheet is expected to be at `assets/player_spritesheet.png`.
