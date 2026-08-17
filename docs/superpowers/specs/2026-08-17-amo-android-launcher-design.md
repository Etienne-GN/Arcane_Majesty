# AMO Android Launcher — Design

Date: 2026-08-17
Status: Approved for implementation

## Goal

Give the Arcane Majesty Online (AMO) Phaser 3 game a native Android launcher that
runs fullscreen, has no web-browser chrome, and feels like a real game. The entire
game frontend ships inside the APK and works fully offline. Online/multiplayer play
remains optional via a user-configured server address.

## Context

- The game is a Vite + Phaser 3 web app in `apps/amo`. `vite.config.js` already
  sets `base: './'`, which is what a native WebView wrapper needs.
- The Socket.io server (`apps/amo/server/index.js`) only powers online/multiplayer
  features. Offline single-player (`MenuScene._playOffline`) runs with no server.
- Substantial touch support already exists in `UIScene`: left-thumb virtual joystick,
  right-thumb Attack/Interact button + 4 skill-slot buttons, a 7-screen menu tray,
  pause button, gamepad support, and `isMobile` zoom/HUD scaling. This spec
  consolidates it into a single `LauncherControls` input layer (section 4).
- Build machine is a Debian box (`Naboo`) with Node 23. No JDK / Android SDK / Gradle
  installed yet. Disk: ~65 GB free.

## Approach

Wrap the existing Vite build in a native Android app via **Capacitor**
(`@capacitor/core` + `@capacitor/cli` + `@capacitor/android`). The web build output
(`dist/`) becomes the app's bundled web assets, loaded by a fullscreen WebView with
no browser chrome. The wrapper is additive; the only game-side change is consolidating
the existing touch HUD into a single `LauncherControls` input layer (section 4).

## Design

### 1. Capacitor integration (`apps/amo`)

- Add Capacitor packages as dev dependencies.
- `capacitor.config.json`:
  - `appId`: `com.arcanemajesty.amo`
  - `appName`: `Arcane Majesty`
  - `webDir`: `dist`
  - `backgroundColor`: `#000000`
  - `server.cleartext: true` — required so the WebView can reach the LAN game
    server (`http://192.168.0.159:3002`) over plain HTTP.
- `npx cap add android` generates a native Gradle project at `apps/amo/android/`.
  It is a standard Android project whose only responsibility is a WebView hosting
  the bundled game.
- New npm scripts in `apps/amo/package.json`:
  - `mobile:sync` — `vite build && cap sync android`
  - `mobile:apk` — run the Gradle wrapper `assembleDebug` against the synced project
  - `mobile:install` — `adb install -r <apk>` (device present)

### 2. Fullscreen / real-app feel

- Extend `MainActivity` (Kotlin, in `apps/amo/android/app/src/main/java/...`) to enable
  **immersive-sticky** system UI: hide both status and navigation bars, keep them
  hidden as long as the app is foregrounded.
- Edge-to-edge display-cutout handling (`windowLayoutInDisplayCutoutMode=shortEdges`)
  so the game renders into the full screen on notch devices.
- Black splash background (no flicker between launch and game boot).
- App icon generated from `apps/amo/public/assets/game_cover.png` at all required
  densities (mdpi→xxxhdpi) using Capacitor's icon asset tooling.
- App display name: "Arcane Majesty".

### 3. Online server (optional, offline-first)

- The app boots **offline-first**; online play is opt-in.
- Add a "Server Address" setting to `OptionsScene`: an input that persists the server
  URL to `localStorage` (key `amo_server_url`).
- `src/data/servers.js`: include the saved URL as a row named "My Server" when set.
- `ServerSelectScene`: when running under Capacitor (`window.Capacitor` present), the
  default same-origin row (`capacitor://localhost`) is meaningless — skip it so the
  online flow only offers the configured server. Offline play remains the main path.

### 4. Unified `LauncherControls` input layer

The old ad-hoc touch HUD becomes a single, unified input layer. One game-side module,
`src/controls/LauncherControls.js`, is the *only* place "user intent" becomes "game
input". It owns the on-screen control deck (floating joystick, action buttons, menu
pad, pause) and dispatches input via **two intentional mechanisms**:

**a) Direct action calls — gameplay hot-path.** Attack/Interact, Power, Blink, Sight,
and the 4 skill slots call guarded game methods directly (the pattern the touch HUD
already uses). This keeps cooldown/state-aware behavior and avoids keyboard-emulation
risk in the fast path:

- New `Player.triggerPower()` — mirrors the `JustDown(powerKey)` guard
  (`powerCooldown <= 0`, not mana-exhausted) and calls `_powerSlash()`.
- New `GameScene._tryPower()` → `player.triggerPower()`.
- New `GameScene._tryBlink()` → `player.blinkStep()`.
- New `GameScene._trySight()` → `player.activateAethericSight()`.
- Extract the two `JustDown` calls in `GameScene.update()` into `_tryBlink`/`_trySight`
  and reuse from both keyboard and touch paths to avoid drift.

**b) Keyboard-emulation — menu navigation + global hotkeys.** The deck's menu pad
(INV/SKLS/TOME/MAP/QUEST/CODEX/FORGE), pause, and any navigation controls dispatch
synthetic DOM `keydown`/`keyup` `KeyboardEvent`s (correct `keyCode`) on `window`, so
Phaser's keyboard manager receives them like physical keys. This covers the ~15 menu
scenes that each bind `keydown-UP`/`ENTER`/hotkeys with **zero per-scene changes**.
Used only for navigation/global keys, never the gameplay hot-path.

**c) Movement — `_joyVec`.** The deck joystick feeds the existing `_joyVec` vector the
same way gamepad already does. Unchanged.

**d) All sources converge.** Real keyboard (untouched), gamepad (existing `_joyVec` +
action calls), and the deck (direct calls + keyboard emulation) all land on the same
input state and code paths. One ownership point, no scattered logic.

**e) "No-controls version" / launcher mode.** A flag `AMO_CONTROLS` set to `launcher`
in the APK build (via `VITE_` env at build time) and `builtin` by default:
- `launcher`: the game's *built-in* touch HUD (`UIScene` joystick/buttons/menu tray)
  is **not rendered**; the `LauncherControls` deck is the sole on-screen controls. Game
  logic is unchanged — it just reads input as it always did.
- `builtin`: current desktop/browser behavior, untouched.
- This avoids duplicated/divorced controls: the deck is a first-class game input layer,
  and the APK build strips the redundant in-game duplicates.

The deck lives in the **game** (web layer), so it reacts to game state (cooldowns on
slots, interact prompts, notifications) — not in the native shell. It reuses the
existing touch-HUD aesthetic, `isMobile` scaling, and `_flashButton` feedback. The old
`UIScene` touch-HUD code evolves into `LauncherControls`; Power/Blink/Sight are added
there.

### 5. Android SDK setup (this machine)

Installable, reproducible, documented:

- **JDK 21** via apt (`openjdk-21-jdk`).
- **Android command-line tools** (`cmdline-tools` latest) under `/opt/android-sdk`.
- `sdkmanager` installs:
  - `platform-tools`
  - `platforms;android-35`
  - `build-tools;35.0.0`
- `ANDROID_HOME=/opt/android-sdk` exported (persisted for the session/shell).
- Gradle is downloaded automatically by the project's Gradle wrapper on first build.
- Provide `apps/amo/scripts/setup_android_sdk.sh` (idempotent) + a README "Android
  build" section under `apps/amo/README.md` documenting the one-time setup and the
  per-release `mobile:sync && mobile:apk` flow.

### 6. Verification

- Existing validation stays green: `npm test` (catalogue + anim resolution).
- `vite build` succeeds.
- `mobile:apk` produces `apps/amo/android/app/build/outputs/apk/debug/app-debug.apk`.
- If a device/emulator is connected via adb: `mobile:install`, then a runtime smoke
  test (boot to menu, start offline game, joystick moves player, attack + blink +
  sight buttons work). Otherwise the APK is side-loadable by the user and smoke
  testing is documented as a manual step.

## Out of scope

- Play Store distribution / signing (release builds). Debug APK only for now.
- Bundling the Socket.io server into the APK (online play requires the user's server).
- Overhauling existing touch UI — the touch HUD is consolidated into the
  `LauncherControls` input layer; no other scenes are restructured.
- Windows/macOS/iOS launchers.