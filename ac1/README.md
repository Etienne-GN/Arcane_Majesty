# Top-Down ARPG Project

## 1. Project Goal

A 2D top-down Action RPG (ARPG) inspired by classic 16-bit console games like "The Legend of Zelda: A Link to the Past". The initial goal is to create a functional prototype with a movable character, a tile-based map with collision, and the core systems that can be expanded upon later.

## 2. Technology Stack

*   **Game Engine:** [Phaser 3](https://phaser.io/phaser3)
    *   A fast, free, and open-source HTML5 game framework. Chosen for its flexibility, large community, and robust feature set for 2D games.
*   **Primary Language:** JavaScript (ES6+)
    *   The native language of web browsers and Phaser, ensuring wide compatibility.
*   **Level Design:** [Tiled Map Editor](https://www.mapeditor.org/)
    *   The industry-standard external editor for creating tile-based maps. Maps will be exported as JSON files and loaded into Phaser.
*   **Platform:** HTML5 Canvas
    *   The game will run in any modern web browser.
*   **Mobile Export:**
    *   The web-based game will be packaged into a native Android application using a wrapper like [Apache Cordova](https://cordova.apache.org/) or [Capacitor](https://capacitorjs.com/).

## 3. Asset & Development Workflow

This project separates design and logic into distinct steps:

1.  **Asset Creation:** All visual assets (tilesets for maps, character sprite sheets) are created or sourced externally as `.png` image files.
2.  **Map Design (in Tiled):**
    *   Tilesets are imported into Tiled.
    *   Individual tiles are given **Custom Properties** to define their behavior (e.g., a wall tile gets a `collides: true` property).
    *   Objects like NPCs and chests are placed on object layers with properties to define their identity and behavior.
    *   The final map is exported as a `.json` file into the `/maps` directory.
3.  **Programming (in Phaser):**
    *   The JavaScript code in the `/js` directory loads the map's `.json` file.
    *   The code reads the properties of tiles and objects to bring the world to life (e.g., preventing movement into tiles where `collides` is `true`).
    *   Game logic, UI, and character control are all handled in JavaScript.

## 4. Project Structure

The project will follow this directory structure:

```
/
├── assets/         # Static game assets (tileset images, sprite sheets, sounds).
├── js/             # All JavaScript source code.
│   └── main.js     # The main entry point and core game logic file.
├── maps/           # Map data exported from Tiled in JSON format.
├── index.html      # The single HTML file that contains the game canvas and loads the scripts.
└── README.md       # This technical description file.
```
