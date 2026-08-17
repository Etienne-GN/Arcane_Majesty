# Top-Down ARPG Project

## 1. Project Goal

A 2D top-down Action RPG (ARPG) inspired by classics like "The Legend of Zelda" and heavily influenced by the modern example of "Heartwood Online". The goal is to blend the timeless adventure feel of Zelda with the clean mechanics and art style of Heartwood Online to create a functional and engaging prototype.

## 2. Technology Stack

*   **Game Engine:** [Phaser 3](https://phaser.io/phaser3)
    *   A fast, free, and open-source HTML5 game framework. Chosen for its flexibility, large community, and robust feature set for 2D games.
*   **Primary Language:** JavaScript (ES6+)
    *   The native language of web browsers and Phaser, ensuring wide compatibility.
*   **Level Design:** [Tiled Map Editor](https://www.mapeditor.org/)
    *   The industry-standard external editor for creating tile-based maps. Maps will be exported as JSON files and loaded into Phaser.
*   **Platform:** HTML5 Canvas
    *   The game will run in any modern web browser.

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

## 5. Development

This is the **online** game (`amo`). It is a Vite + Phaser 3 project with a
Socket.io server.

```bash
npm install
npm run dev        # Vite dev server (port 5174)
npm run server     # game server (Socket.io, port 3002)
npm run build      # production build (runs catalogue validation first)
```

Catalogue / character-animation tooling:

```bash
npm run gen:anims       # annotate the character catalogue with its anim manifest
npm run test:catalogue  # validate the catalogue (0 phantom sheet references)
npm run audit:weapons   # per-direction weapon coverage report
npm run audit:oversize  # oversize sprite-sheet frame-size sanity
```

The layered LPC character system (renderer, animation manifest, palette swap,
weapon resolution, tooling) is documented in
[`documentation/CHARACTER_SYSTEM.md`](documentation/CHARACTER_SYSTEM.md).

> Note: the structure below predates the current `src/`-based layout and is kept
> for historical context. Source lives in `src/` (scenes, systems, entities,
> data); maps and assets under `public/`.

## 6. Game Story: Arcane Majesty

This story is divided into a musical album and game chapters.

### Eldoria's Prophecy (Album Story)

#### Act I: The Call

*   **Echoes of Stone:** Eldrin Nightshade, a solitary wizard, lives in a secluded tower. He feels a premonition of impending doom.
*   **Dreamweaver's Call:** Nightmares plague Eldrin with visions of a dying world. A voice calls him to save it.
*   **Odyssey's Dawn:** Eldrin embarks on a perilous journey, leaving his tower behind.

#### Act II: Trials and Tribulations

*   **Summit of Despair:** Eldrin climbs a treacherous mountain and doubts his ability to succeed.
*   **Sylvan Sanctuary:** Lost and weary, Eldrin finds a hidden forest and a hermit who offers guidance.
*   **Treachery's Bite:** A trusted companion betrays Eldrin.
*   **Inferno's Trial:** Eldrin faces a fiery trial to test his courage.

#### Act III: The Heartstone’s Legacy

*   **Eldoria's Heartbeat:** Eldrin reaches the ancient realm of Eldoria to find the Heartstone of Creation.
*   **Heart of War:** A powerful adversary confronts Eldrin in a final battle for the Heartstone.
*   **Dawn's Embrace:** Eldrin is victorious and brings peace to the world.

### Game Chapters

#### Prologue: The Forest Hunt (Tutorial Level)

*   **Setting:** A dense, ancient forest surrounding Eldrin’s secluded tower.
*   **Gameplay Introduction:** Basic movement, interaction, combat, magic, and gathering are introduced.

#### Act I: The Call

*   **Chapter 1: Echoes of Stone (Eldrin’s Tower):** Explore the tower and discover foreshadowing of the events to come.
*   **Chapter 2: Dreamweaver’s Call (Vision Sequence):** A dream sequence reveals the threat to Eldoria and the importance of the Heartstone.
*   **Chapter 3: Odyssey’s Dawn (The Journey Begins):** Eldrin begins his journey, facing corrupted creatures and discovering the extent of the world's peril.

#### Act II: Trials and Tribulations

*   **Chapter 4: Summit of Despair (Mountain Pass):** A survival-focused chapter where Eldrin must endure the harsh environment.
*   **Chapter 5: Sylvan Sanctuary (The Hidden Forest):** Meet a hermit, learn new skills, and uncover secrets in a magical forest.
*   **Chapter 6: Treachery’s Bite (Betrayal):** A companion betrays Eldrin, leading to a temporary debuff.
*   **Chapter 7: Inferno’s Trial (The Fire Labyrinth):** Eldrin recovers his strength and confronts his betrayer.

#### Act III: The Heartstone’s Legacy

*   **Chapter 8: Eldoria’s Heartbeat (The Ruins of Eldoria):** Navigate a dungeon to find the Heartstone's resting place.
*   **Chapter 9: Heart of War (Final Battle):** The final confrontation against the main adversary.
*   **Chapter 10: Dawn’s Embrace (Epilogue):** The story concludes with Eldrin returning home and the world at peace.

#### Possible Alternate Endings

*   **Sacrificial Victory:** Eldrin perishes, but the world is saved.
*   **Corruption Ending:** Eldrin takes the Heartstone for himself.
*   **Restored Balance (True Ending):** Eldrin purifies the Heartstone and shares his wisdom.

#### Gameplay Mechanics Summary

*   ARPG combat with magic and swordplay.
*   Upgradeable magic system.
*   Exploration-heavy gameplay with puzzles and lore.
*   Dynamic choices affecting the story.
*   Pixel-art aesthetic inspired by Zelda and Crystalis.
## Android Launcher

The game ships as a native Android app via Capacitor. The whole frontend is packed
inside the APK and runs fully offline; online play is optional.

### One-time setup (build machine)

```bash
./scripts/setup_android_sdk.sh        # JDK 21 + Android SDK 36 under /opt/android-sdk
export ANDROID_HOME=/opt/android-sdk   # add to ~/.bashrc
```

### Per-release build

```bash
npm run mobile:sync    # vite build + cap sync android (game assets into the APK)
npm run mobile:apk     # produce android/app/build/outputs/apk/debug/app-debug.apk
npm run mobile:install # install on a connected device via adb
```

Build the launcher-mode APK with `VITE_AMO_CONTROLS=launcher` so the on-screen
`LauncherControls` deck is the sole controls provider:

```bash
VITE_AMO_CONTROLS=launcher npm run mobile:sync
npm run mobile:apk
```

Notes:
- The app is offline-first. Set a server URL in-game (OPTIONS > Server Address) for
  online play; leave it empty for offline-only.
- The launcher runs immersive fullscreen (status + navigation bars hidden).
- Debug APKs are unsigned/side-loadable; Play Store release signing is out of scope.
