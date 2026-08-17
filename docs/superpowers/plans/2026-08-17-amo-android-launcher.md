# AMO Android Launcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wrap the AMO Phaser game in a fullscreen native Android app (Capacitor) that ships the whole game offline, with a unified `LauncherControls` on-screen input layer that drives every existing keyboard/controller handler.

**Architecture:** A game-side `LauncherControls` deck (joystick + action buttons + menu pad + pause) is the single input owner. Gameplay actions (attack/interact/power/blink/sight/slots) dispatch directly to guarded game methods; menu pad + pause dispatch synthetic DOM keyboard events so all ~15 keydown-bound scenes work untouched; movement feeds the existing `_joyVec`. The deck ships inside a Capacitor 8 Android project whose `MainActivity` forces immersive fullscreen. The APK embeds the Vite `dist/` build and runs offline; online play is opt-in via a saved server URL in Options.

**Tech Stack:** Phaser 3 (existing), Vite 6 (existing), Capacitor 8 (`@capacitor/core`, `@capacitor/cli`, `@capacitor/android`, `@capacitor/assets`), Android SDK 36 + JDK 21 + Gradle (wrapper), Node 23.

## Global Constraints

- App id: `com.arcanemajesty.amo`. App display name: `Arcane Majesty`.
- Capacitor **8.x** (targets Android SDK 36; requires Node 22+, Java 21 recommended).
- Android SDK: `platforms;android-36` + `build-tools;36.0.0` under `ANDROID_HOME=/opt/android-sdk`.
- Build the APK build with `VITE_AMO_CONTROLS=launcher` (env → `import.meta.env`), browser build defaults to `builtin`.
- localStorage keys: `amo_server_url` (new), `hud_alpha`, `show_joystick` (existing, keep).
- The game's keyboard keydown handlers MUST stay intact — keyboard-emulation depends on them. Never strip keyboard handling.
- Do not edit album/song XMLs or any `data/lore`/`archives` content.
- Follow the existing test convention: self-contained node scripts in `apps/amo/tools/*.mjs` run by `npm test`, no deps, pure assertions.
- Commit messages follow repo style (`feat(amo): ...`, `docs(amo): ...`).

---

### Task 1: Key maps + InputBus (keyboard-emulation primitive)

**Files:**
- Create: `apps/amo/src/controls/keys.js`
- Create: `apps/amo/src/controls/InputBus.js`
- Create: `apps/amo/tools/test_input_bus.mjs`

**Interfaces:**
- Produces:
  - `KEY_CODES` — object mapping canonical action name → `{ keyCode: number, code: string, key: string }`. Actions: `attack, interact, power, blink, sight, slot0..slot3, esc, enter, up, down, left, right, inventory, skillTree, spellbook, worldMap, questJournal, codex, crafting, stats`.
  - `buildKeyEvent(keyDef, type)` → `KeyboardEvent` (uses global `KeyboardEvent` at call time).
  - `dispatchKey(win, keyDef, type)` → dispatches on `win`, returns `win`.
  - `tapKey(win, keyDef)` → dispatches `keydown` then `keyup`.
- Consumes: nothing.

- [ ] **Step 1: Write the failing test**

`apps/amo/tools/test_input_bus.mjs`:

```js
#!/usr/bin/env node
/**
 * Unit tests for the keyboard-emulation primitive (keys.js + InputBus.js).
 * Pure assertions, no deps. Run: node tools/test_input_bus.mjs (or npm test).
 * Node has no global KeyboardEvent — stub it for the dispatch tests.
 */
import { KEY_CODES } from '../src/controls/keys.js';
import { buildKeyEvent, dispatchKey, tapKey } from '../src/controls/InputBus.js';

let passed = 0;
const fails = [];
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function check(name, got, want) {
    if (eq(got, want)) passed++;
    else fails.push(`${name}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
}

class FakeKeyboardEvent {
    constructor(type, init) {
        this.type = type;
        this.keyCode = init.keyCode;
        this.code = init.code;
        this.key = init.key;
        this.bubbles = init.bubbles;
        this.cancelable = init.cancelable;
        this.defaultPrevented = init.defaultPrevented ?? false;
    }
}
globalThis.KeyboardEvent = FakeKeyboardEvent;

// Every KEY_CODES entry is well-formed (23 actions).
check('KEY_CODES has 23 entries', Object.keys(KEY_CODES).length, 23);
for (const [name, def] of Object.entries(KEY_CODES)) {
    check(`key ${name}.keyCode numeric`, typeof def.keyCode, 'number');
    check(`key ${name}.code string`, typeof def.code, 'string');
    check(`key ${name}.key string`, typeof def.key, 'string');
}

// buildKeyEvent produces a correct, cancelleable, bubbling keydown.
{
    const ev = buildKeyEvent(KEY_CODES.inventory, 'keydown');
    check('keydown type', ev.type, 'keydown');
    check('keydown keyCode I', ev.keyCode, 73);
    check('keydown code KeyI', ev.code, 'KeyI');
    check('keydown bubbles', ev.bubbles, true);
    check('keydown cancelable', ev.cancelable, true);
}

// dispatchKey routes one event to the given target.
{
    const win = { events: [], dispatchEvent(ev) { this.events.push(ev); } };
    dispatchKey(win, KEY_CODES.inventory, 'keydown');
    check('dispatch delivered 1', win.events.length, 1);
    check('dispatch keyCode', win.events[0].keyCode, 73);
}

// tapKey emits keydown then keyup, in that order.
{
    const win = { events: [], dispatchEvent(ev) { this.events.push(ev); } };
    tapKey(win, KEY_CODES.inventory);
    check('tap emits 2', win.events.length, 2);
    check('tap order', `${win.events[0].type},${win.events[1].type}`, 'keydown,keyup');
}

// Every tray/pause key the deck will tap dispatches cleanly.
{
    const win = { events: [], dispatchEvent(ev) { this.events.push(ev); } };
    for (const name of ['inventory', 'skillTree', 'spellbook', 'worldMap',
                        'questJournal', 'codex', 'crafting', 'esc']) {
        tapKey(win, KEY_CODES[name]);
    }
    check('tray+esc taps = 16 events', win.events.length, 16);
}

if (fails.length) {
    console.error(`✗ input-bus tests FAILED — ${fails.length}/${passed + fails.length}:`);
    for (const f of fails) console.error('  ' + f);
    process.exit(1);
}
console.log(`✓ input-bus tests passed (${passed})`);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node apps/amo/tools/test_input_bus.mjs`
Expected: FAIL — `Error [ERR_MODULE_NOT_FOUND]` (module doesn't exist yet).

- [ ] **Step 3: Write minimal implementation**

`apps/amo/src/controls/keys.js`:

```js
// Canonical input actions → the keyboard event a physical press would produce.
// Single source of truth for the LauncherControls deck's keyboard-emulation path.
export const KEY_CODES = {
    attack:       { keyCode: 90, code: 'KeyZ',      key: 'z' },
    interact:     { keyCode: 69, code: 'KeyE',      key: 'e' },
    power:        { keyCode: 88, code: 'KeyX',      key: 'x' },
    blink:        { keyCode: 32, code: 'Space',     key: ' ' },
    sight:        { keyCode: 86, code: 'KeyV',      key: 'v' },
    slot0:        { keyCode: 81, code: 'KeyQ',      key: 'q' },
    slot1:        { keyCode: 82, code: 'KeyR',      key: 'r' },
    slot2:        { keyCode: 70, code: 'KeyF',      key: 'f' },
    slot3:        { keyCode: 84, code: 'KeyT',      key: 't' },
    esc:          { keyCode: 27, code: 'Escape',    key: 'Escape' },
    enter:        { keyCode: 13, code: 'Enter',     key: 'Enter' },
    up:           { keyCode: 38, code: 'ArrowUp',   key: 'ArrowUp' },
    down:         { keyCode: 40, code: 'ArrowDown', key: 'ArrowDown' },
    left:         { keyCode: 37, code: 'ArrowLeft', key: 'ArrowLeft' },
    right:        { keyCode: 39, code: 'ArrowRight',key: 'ArrowRight' },
    inventory:    { keyCode: 73, code: 'KeyI',      key: 'i' },
    skillTree:    { keyCode: 75, code: 'KeyK',      key: 'k' },
    spellbook:    { keyCode: 74, code: 'KeyJ',      key: 'j' },
    worldMap:     { keyCode: 77, code: 'KeyM',      key: 'm' },
    questJournal: { keyCode: 78, code: 'KeyN',      key: 'n' },
    codex:        { keyCode: 76, code: 'KeyL',      key: 'l' },
    crafting:     { keyCode: 67, code: 'KeyC',      key: 'c' },
    stats:        { keyCode: 80, code: 'KeyP',      key: 'p' },
};
```

`apps/amo/src/controls/InputBus.js`:

```js
// Keyboard-emulation primitive. Synthesizes real DOM KeyboardEvents so Phaser's
// keyboard manager receives deck presses exactly like physical keys.
// buildKeyEvent references the global KeyboardEvent at CALL time — the node
// tests stub it before calling.
export function buildKeyEvent(keyDef, type) {
    const { keyCode, code, key } = keyDef;
    return new KeyboardEvent(type, {
        key, code, keyCode, which: keyCode,
        bubbles: true, cancelable: true,
    });
}

export function dispatchKey(win, keyDef, type) {
    win.dispatchEvent(buildKeyEvent(keyDef, type));
    return win;
}

export function tapKey(win, keyDef) {
    dispatchKey(win, keyDef, 'keydown');
    dispatchKey(win, keyDef, 'keyup');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node apps/amo/tools/test_input_bus.mjs`
Expected: `✓ input-bus tests passed (...)`

- [ ] **Step 5: Wire into `npm test` and commit**

Modify `apps/amo/package.json` `test` script:
```json
"test": "node tools/test_anim_resolve.mjs && node tools/validate_catalogue.mjs && node tools/test_input_bus.mjs"
```

Run: `cd apps/amo && npm test`
Expected: all three suites pass.

```bash
git add apps/amo/src/controls/keys.js apps/amo/src/controls/InputBus.js apps/amo/tools/test_input_bus.mjs apps/amo/package.json apps/amo/package-lock.json
git commit -m "feat(amo): keyboard-emulation input bus for the launcher control deck"
```

---

### Task 2: Platform + controls-mode utils

**Files:**
- Modify: `apps/amo/src/utils/platform.js`
- Create: `apps/amo/src/controls/mode.js`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `isNative` — `boolean`, true inside a Capacitor WebView.
  - `controlsMode` — `'launcher' | 'builtin'` from `import.meta.env.VITE_AMO_CONTROLS`.
  - `isLauncherMode` — `boolean`.

- [ ] **Step 1: Write the code (no unit test harness exists for env/browser globals; verified at runtime in Task 5/9)**

`apps/amo/src/utils/platform.js`:

```js
// True on phones/tablets; false on mouse-driven desktops.
// maxTouchPoints is the most reliable signal — pointer:coarse can miss inside WebGL.
export const isMobile = navigator.maxTouchPoints > 0 || ('ontouchstart' in window);

// True inside a Capacitor native WebView (Android/iOS shell).
export const isNative = typeof window !== 'undefined' && !!window.Capacitor?.isNativePlatform?.();
```

`apps/amo/src/controls/mode.js`:

```js
// Controls delivery mode.
//   launcher: the LauncherControls deck is the sole on-screen controls (APK build,
//             set via VITE_AMO_CONTROLS=launcher). The deck always renders.
//   builtin:  default browser mode; the deck renders only on touch devices and the
//             game's own keyboard/mouse/gamepad remain the primary inputs.
const MODE = import.meta.env.VITE_AMO_CONTROLS ?? 'builtin';
export const controlsMode = MODE === 'launcher' ? 'launcher' : 'builtin';
export const isLauncherMode = controlsMode === 'launcher';
```

- [ ] **Step 2: Commit**

```bash
git add apps/amo/src/utils/platform.js apps/amo/src/controls/mode.js
git commit -m "feat(amo): native-detection + controls-mode utils"
```

---

### Task 3: Power / Blink / Sight action methods

**Files:**
- Modify: `apps/amo/src/entities/Player.js` (add `triggerPower()`, refactor `update()` power path)
- Modify: `apps/amo/src/scenes/GameScene.js:2504-2513` (extract blink/sight JustDown into guarded methods)

**Interfaces:**
- Consumes: existing `Player.powerCooldown`, `Player._powerSlash()`, `Player.blinkStep()`, `Player.activateAethericSight()`, `Player.stats.manaExhausted`.
- Produces:
  - `Player.triggerPower()` → `boolean` (false when blocked by cooldown/exhaustion).
  - `GameScene._tryPower()`, `GameScene._tryBlink()`, `GameScene._trySight()`.
- Notes: Phaser-coupled, verified at runtime (no unit harness). Behavior must be identical to the key paths.

- [ ] **Step 1: Add `triggerPower()` to `Player.js`**

Insert after `update()` (end of the `update` method body, before `_weaponCooldown`):

```js
    triggerPower() {
        if (!this.active) return false;
        if (this.powerCooldown > 0) return false;
        if (this.stats.manaExhausted) return false;
        this._powerSlash();
        return true;
    }
```

- [ ] **Step 2: Refactor the keyboard power path in `Player.js` to use it**

Replace (inside `update()`, around line 190):

```js
            if (Phaser.Input.Keyboard.JustDown(powerKey) && this.powerCooldown <= 0) {
                this._powerSlash();
            }
```

with:

```js
            if (Phaser.Input.Keyboard.JustDown(powerKey)) this.triggerPower();
```

- [ ] **Step 3: Add guarded action methods to `GameScene.js`**

Add after `_tryActivateSlot` (line ~622):

```js
    _tryPower() {
        if (!this.player?.active) return;
        this.player.triggerPower();
    }

    _tryBlink() {
        if (!this.player?.active) return;
        this.player.blinkStep();
    }

    _trySight() {
        if (!this.player?.active) return;
        this.player.activateAethericSight();
    }
```

- [ ] **Step 4: Route keyboard blink/sight through the new methods**

Replace (line 2505-2506):

```js
        if (Phaser.Input.Keyboard.JustDown(this.blinkKey)) this.player.blinkStep();
        if (Phaser.Input.Keyboard.JustDown(this.sightKey)) this.player.activateAethericSight();
```

with:

```js
        if (Phaser.Input.Keyboard.JustDown(this.blinkKey)) this._tryBlink();
        if (Phaser.Input.Keyboard.JustDown(this.sightKey)) this._trySight();
```

- [ ] **Step 5: Verify + commit**

Run: `cd apps/amo && npm test` → passes.
Run: `cd apps/amo && npm run dev` and in the browser confirm Z (attack), X (power slash with its cooldown), SPACE (blink), V (aetheric sight) all behave as before.

```bash
git add apps/amo/src/entities/Player.js apps/amo/src/scenes/GameScene.js
git commit -m "feat(amo): guarded power/blink/sight actions shared by keyboard and touch"
```

---

### Task 4: Options server-address setting + offline-first server list

**Files:**
- Modify: `apps/amo/src/scenes/OptionsScene.js` (add Server Address row)
- Modify: `apps/amo/src/data/servers.js` (saved-server row; skip same-origin row when native)
- Modify: `apps/amo/src/scenes/ServerSelectScene.js` (graceful empty list)

**Interfaces:**
- Consumes: `isNative` from `../utils/platform.js`; localStorage key `amo_server_url`.
- Produces: `SERVERS` array reflecting the saved URL; empty-list UX in ServerSelectScene.
- Notes: online flow is unchanged downstream — `ServerSelectScene._connect` already passes `serverUrl` → `OnlineCharacterScene` → `GameScene._connectNetwork`.

- [ ] **Step 1: Add Server Address row to `OptionsScene.js`**

In `_buildRows`, after the Auto Fullscreen block (`rowY4 + 78` → `this._contentH`), add:

```js
        // ── Server Address (offline-first; optional online) ───────────
        const rowY5 = rowY4 + 82;
        const serverUrl = localStorage.getItem('amo_server_url');

        add(this.add.text(cx - 80, rowY5, 'Server Address', {
            font: '12px monospace', fill: '#aaaacc',
        }).setOrigin(0, 0.5));

        add(this.add.text(cx + 60, rowY5, serverUrl ? '[SET]' : '[OFFLINE]', {
            font: 'bold 11px monospace',
            fill: serverUrl ? '#44cc88' : '#556655',
        }).setOrigin(0.5));

        mkBtn('Set', cx, rowY5 + 18, () => {
            const val = window.prompt('Server URL (e.g. http://192.168.0.159:3002)', serverUrl ?? '');
            if (val === null) return;
            const trimmed = val.trim().replace(/\/+$/, '');
            if (trimmed) localStorage.setItem('amo_server_url', trimmed);
            else         localStorage.removeItem('amo_server_url');
            soundManager.menuSelect();
            this.scene.restart();
        });

        add(this.add.text(cx, rowY5 + 34, 'Online multiplayer is optional. Enter your\ngame-server URL here; leave empty for\noffline-only play.', {
            font: '7px monospace', fill: '#443355', align: 'center',
        }).setOrigin(0.5, 0));

        this._contentH = rowY5 + 78;
```

- [ ] **Step 2: Rewrite `servers.js`**

```js
// Server list for the online flow. Offline-first: the app works with no server.
// A saved URL (Options > Server Address) appears as "My Server".
// Inside a native launcher the same-origin row is meaningless (capacitor://localhost)
// so it is skipped; the saved server is the only online option there.
import { isNative } from '../utils/platform.js';

const SAVED_KEY = 'amo_server_url';

function buildServers() {
    const list = [];
    const saved = localStorage.getItem(SAVED_KEY);
    if (saved) list.push({ name: 'My Server', url: saved });
    if (!isNative) list.push({ name: 'Arcane Majesty Online', url: window.location.origin });
    return list;
}

export const SERVERS = buildServers();
```

- [ ] **Step 3: Graceful empty list in `ServerSelectScene.js`**

In `create()`, after `SERVERS.forEach(...)` (line 27), add an empty-state message:

```js
        if (SERVERS.length === 0) {
            this.add.text(w / 2, 150,
                'No server configured.\nSet one in OPTIONS > Server Address,\nor play offline from the main menu.',
                { font: '13px monospace', fill: '#556655', align: 'center',
                  stroke: '#000000', strokeThickness: 3,
                }).setOrigin(0.5);
            this._connectBtn.setAlpha(0.35);
        }
```

Guard `_connect()` — insert at the top of the method body:

```js
        if (SERVERS.length === 0) return;
```

Guard `_pingAll()` — insert at the top:

```js
        if (SERVERS.length === 0) return;
```

- [ ] **Step 4: Verify + commit**

Run: `cd apps/amo && npm test` → passes. Run dev server; in OPTIONS set a server URL, restart, and confirm ServerSelect lists "My Server"; clear it and confirm the offline hint appears. (Native-empty case is verified in Task 9.)

```bash
git add apps/amo/src/scenes/OptionsScene.js apps/amo/src/data/servers.js apps/amo/src/scenes/ServerSelectScene.js
git commit -m "feat(amo): offline-first server list with saved URL from options"
```

---

### Task 5: LauncherControls deck + UIScene integration

The big one — the deck. This moves the existing UIScene touch HUD (joystick, action cluster, menu tray, pause, gamepad) into `src/controls/LauncherControls.js`, adds Power/Blink/Sight buttons, routes menu pad + pause through keyboard emulation, and keeps the rest of the HUD (bars, minimap, notifications) in UIScene.

**Files:**
- Create: `apps/amo/src/controls/LauncherControls.js`
- Modify: `apps/amo/src/scenes/UIScene.js`

**Interfaces:**
- Consumes: `KEY_CODES`+`tapKey` (Task 1), `isMobile`+`isNative` (Task 2), `isLauncherMode` (Task 2), `GameScene._tryMainAction/_tryActivateSlot/_tryPower/_tryBlink/_trySight` (Task 3), `playerStats`, `SPELLS`.
- Produces:
  - `LauncherControls` class: `constructor(uiScene)`, `create(w, h)`, `update()`, `joyVec` (shared object), `game()` helper.
  - `UIScene._joyVec` keeps pointing at the deck's `joyVec` (GameScene reads it unchanged at `UIScene.js` consumer line `GameScene.js:2395`).

- [ ] **Step 1: Write the failing smoke check (deck class exists and exposes the contract)**

`apps/amo/tools/test_launcher_controls.mjs`:

```js
#!/usr/bin/env node
/**
 * Contract smoke-check for LauncherControls: the deck module imports cleanly in
 * node (no Phaser executed at import time) and exposes the API UIScene relies on.
 * Run: node tools/test_launcher_controls.mjs
 * NOTE: LauncherControls.js imports Phaser for constants only (ELEMENT_COLORS
 * via SPELLS is loaded lazily). If importing Phaser in node fails, keep the deck
 * file free of top-level Phaser execution and let this test import it.
 */
import LauncherControls from '../src/controls/LauncherControls.js';

let passed = 0;
const fails = [];
function check(name, got, want) {
    if (JSON.stringify(got) === JSON.stringify(want)) passed++;
    else fails.push(`${name}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
}
function failIf(cond, msg) { if (cond) fails.push(msg); else passed++; }

check('exports a class', typeof LauncherControls, 'function');
const proto = LauncherControls.prototype;
for (const m of ['create', 'update']) check(`has method ${m}`, typeof proto[m], 'function');
const stubScene = { scene: { get: () => null } };
const c = new LauncherControls(stubScene);
check('joyVec defaults 0,0', c.joyVec, { x: 0, y: 0 });
failIf(!c.sc, 'hudScale sc is set');
failIf(!c.scene, 'scene ref is kept');

if (fails.length) {
    console.error(`✗ launcher-controls tests FAILED — ${fails.length}/${passed + fails.length}:`);
    for (const f of fails) console.error('  ' + f);
    process.exit(1);
}
console.log(`✓ launcher-controls tests passed (${passed})`);
```

- [ ] **Step 2: Run to verify it fails**

Run: `node apps/amo/tools/test_launcher_controls.mjs`
Expected: FAIL — `Error [ERR_MODULE_NOT_FOUND]`.

- [ ] **Step 3: Create `LauncherControls.js`**

```js
import Phaser from 'phaser';
import { playerStats } from '../systems/PlayerStats.js';
import { SPELLS } from '../data/spells.js';
import { isMobile } from '../utils/platform.js';
import { tapKey } from './InputBus.js';
import { KEY_CODES } from './keys.js';
import { isLauncherMode } from './mode.js';

const ELEMENT_COLORS = {
    fire: 0xff6600, arcane: 0xaa44ff, lightning: 0xffdd00,
    shadow: 0x8800cc, earth: 0x44aa22, ice: 0x88ddff,
    nature: 0x44cc44, wind: 0xccffaa,
};
const SLOT_KEYS = ['Q', 'R', 'F', 'T'];

// Menu pad buttons — each dispatches the same hotkey a physical keyboard sends,
// so GameScene's keydown handlers drive the whole flow (pause GameScene + launch).
const TRAY = [
    { label: 'INV',   name: 'inventory' },
    { label: 'SKLS',  name: 'skillTree' },
    { label: 'TOME',  name: 'spellbook' },
    { label: 'MAP',   name: 'worldMap' },
    { label: 'QUEST', name: 'questJournal' },
    { label: 'CODEX', name: 'codex' },
    { label: 'FORGE', name: 'crafting' },
];

// Secondary action buttons — interleaved between the skill-slot ring and the
// attack button (upper-left arc of the attack cluster), dispatched DIRECTLY.
const SECONDARY = [
    { label: 'PWR', action: '_tryPower',  angle: 95,  color: 0xddaa55 },
    { label: 'BLK', action: '_tryBlink',  angle: 125, color: 0x55ccff },
    { label: 'SGT', action: '_trySight',  angle: 155, color: 0xcc99ff },
];

export default class LauncherControls {
    constructor(uiScene) {
        this.scene = uiScene;
        this.isMobile = isMobile;
        this.sc = isMobile ? 0.72 : 1.0;
        this.joyVec = { x: 0, y: 0 };       // shared with GameScene via UIScene._joyVec
        this._trayOpen = false;
        this._trayOpenY = 0;
        this._trayClosedY = 0;
        this._padPrev = {};
    }

    create(w, h) {
        this.w = w; this.h = h;
        this._initJoystick(w, h);
        this._initActionCluster(w, h);
        this._initMenuTray(w, h);
        this._initPause(w, h);
        this._initGamepad();
    }

    update() {
        this._updateGamepad();
        if (!this._deckVisible()) return;
        this._updateActionCluster();
        this._drawJoystick();
        this._drawTrayTab();
    }

    // Launcher mode: deck is the sole on-screen controls (always drawn).
    // Builtin mode: touch devices only; desktop uses keyboard/mouse/gamepad.
    _deckVisible() {
        return isLauncherMode || this.isMobile;
    }

    game() { return this.scene.scene.get('GameScene'); }

    _hudAlpha() { return parseFloat(localStorage.getItem('hud_alpha') ?? '0.55'); }

    // ── Joystick (movement → joyVec) ────────────────────────────────────

    _initJoystick(w, h) {
        const sc     = this.sc;
        const R_BASE = Math.round(88 * sc);
        const R_KNOB = Math.round(36 * sc);
        const PAD    = Math.round(24 * sc);
        const cx = PAD + R_BASE;
        const cy = h - PAD - R_BASE;

        this._joyActive = false;
        this._joyCx = cx;
        this._joyCy = cy;
        this._joyR  = R_BASE;
        this._joyRKnob = R_KNOB;
        this._joyKnobX = cx;
        this._joyKnobY = cy;

        this._joyBaseG = this.scene.add.graphics().setDepth(17);
        this._joyKnobG = this.scene.add.graphics().setDepth(18);

        const zoneSize = (R_BASE + 40) * 2;
        const zone = this.scene.add.rectangle(
            cx - R_BASE - 40, cy - R_BASE - 40, zoneSize, zoneSize, 0, 0
        ).setOrigin(0).setInteractive().setDepth(16);

        zone.on('pointerdown', (ptr) => {
            this._joyActive = true;
            this._joyUpdate(ptr.x, ptr.y);
        });
        this.scene.input.on('pointermove', (ptr) => {
            if (this._joyActive) this._joyUpdate(ptr.x, ptr.y);
        });
        this.scene.input.on('pointerup', () => {
            if (!this._joyActive) return;
            this._joyActive = false;
            this.joyVec.x = 0;
            this.joyVec.y = 0;
            this._joyKnobX = this._joyCx;
            this._joyKnobY = this._joyCy;
        });
    }

    _joyUpdate(px, py) {
        const dx = px - this._joyCx;
        const dy = py - this._joyCy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const cap  = Math.min(dist, this._joyR);
        const nx = dist > 0 ? dx / dist : 0;
        const ny = dist > 0 ? dy / dist : 0;
        this._joyKnobX = this._joyCx + nx * cap;
        this._joyKnobY = this._joyCy + ny * cap;
        const DEAD = 0.12;
        this.joyVec.x = Math.abs(nx) > DEAD ? nx : 0;
        this.joyVec.y = Math.abs(ny) > DEAD ? ny : 0;
    }

    _drawJoystick() {
        if (localStorage.getItem('show_joystick') === '0') {
            this._joyBaseG.clear();
            this._joyKnobG.clear();
            return;
        }
        const alpha = this._hudAlpha();
        const { _joyCx: cx, _joyCy: cy, _joyR: R, _joyRKnob: RK,
                _joyKnobX: kx, _joyKnobY: ky, _joyActive: active } = this;

        this._joyBaseG.clear();
        this._joyBaseG.fillStyle(0x0a0814, alpha * 0.70);
        this._joyBaseG.fillCircle(cx, cy, R);
        this._joyBaseG.lineStyle(2, 0x3344bb, alpha * 0.80);
        this._joyBaseG.strokeCircle(cx, cy, R);
        this._joyBaseG.lineStyle(1, 0x3344bb, alpha * 0.25);
        this._joyBaseG.strokeCircle(cx, cy, R * 0.5);

        this._joyKnobG.clear();
        this._joyKnobG.fillStyle(0x1a2a88, alpha * (active ? 0.95 : 0.60));
        this._joyKnobG.fillCircle(kx, ky, RK);
        this._joyKnobG.lineStyle(2, 0x5566ff, alpha * (active ? 1.0 : 0.70));
        this._joyKnobG.strokeCircle(kx, ky, RK);
    }

    // ── Action cluster (attack + slots + power/blink/sight) ─────────────

    _initActionCluster(w, h) {
        const sc    = this.sc;
        const R_ATK = Math.round(68 * sc);
        const R_SK  = Math.round(36 * sc);
        const R_ARM = Math.round(172 * sc);
        const R_SEC = Math.round(24 * sc);

        const atkX = w - 16 - R_ATK;
        const atkY = h - 16 - R_ATK;

        this._atkData = { atkX, atkY, R_ATK, R_SK, R_ARM, R_SEC };
        this._atkG    = this.scene.add.graphics().setDepth(19);
        this._secG    = this.scene.add.graphics().setDepth(25);

        const atkHit = this.scene.add.rectangle(atkX - R_ATK, atkY - R_ATK, R_ATK * 2, R_ATK * 2, 0, 0)
            .setOrigin(0).setInteractive().setDepth(24);
        atkHit.on('pointerdown', () => {
            if (this.scene.scene.isPaused('GameScene')) return;
            this.game()?._tryMainAction();
            this._flashButton(atkX, atkY, R_ATK, 0xee8833);
        });

        const ANGLES_DEG = [175, 145, 115, 85];
        this._slotData = [];
        for (let i = 0; i < 4; i++) {
            const rad = Phaser.Math.DegToRad(ANGLES_DEG[i]);
            const sx  = Math.round(atkX + Math.cos(rad) * R_ARM);
            const sy  = Math.round(atkY - Math.sin(rad) * R_ARM);

            const slotG = this.scene.add.graphics().setDepth(20);
            const cdG   = this.scene.add.graphics().setDepth(21);

            this.scene.add.text(sx - R_SK + 4, sy - R_SK + 4, SLOT_KEYS[i], {
                font: '12px monospace', fill: '#22224a'
            }).setDepth(22);

            const nameLabel = this.scene.add.text(sx, sy + 2, '—', {
                font: 'bold 18px monospace', fill: '#2a2a50', align: 'center'
            }).setOrigin(0.5).setDepth(22);

            const costLabel = this.scene.add.text(sx, sy + R_SK - 10, '', {
                font: '12px monospace', fill: '#334466', align: 'center'
            }).setOrigin(0.5, 1).setDepth(22);

            const hit = this.scene.add.rectangle(sx - R_SK, sy - R_SK, R_SK * 2, R_SK * 2, 0, 0)
                .setOrigin(0).setInteractive().setDepth(24);
            hit.on('pointerdown', () => {
                if (this.scene.scene.isPaused('GameScene')) return;
                this.game()?._tryActivateSlot(i);
                this._flashButton(sx, sy, R_SK, 0xffffff);
            });

            this._slotData.push({ slotG, cdG, nameLabel, costLabel, sx, sy });
        }

        // Secondary action buttons (Power / Blink / Sight) — direct dispatch.
        this._secData = [];
        for (const sec of SECONDARY) {
            const rad = Phaser.Math.DegToRad(sec.angle);
            const sx  = Math.round(atkX + Math.cos(rad) * R_ARM * 0.60);
            const sy  = Math.round(atkY - Math.sin(rad) * R_ARM * 0.60);
            const hit = this.scene.add.rectangle(sx - R_SEC, sy - R_SEC, R_SEC * 2, R_SEC * 2, 0, 0)
                .setOrigin(0).setInteractive().setDepth(27);
            hit.on('pointerdown', () => {
                if (this.scene.scene.isPaused('GameScene')) return;
                this.game()?.[sec.action]?.();
                this._flashButton(sx, sy, R_SEC, sec.color);
            });
            this._secData.push({ ...sec, sx, sy });
        }
    }

    _flashButton(cx, cy, radius, color) {
        const g = this.scene.add.graphics().setDepth(26);
        g.fillStyle(color, 0.35);
        g.fillCircle(cx, cy, radius);
        this.scene.tweens.add({ targets: g, alpha: 0, duration: 180, onComplete: () => g.destroy() });
    }

    _updateActionCluster() {
        const alpha = this._hudAlpha();
        const { atkX, atkY, R_ATK, R_SK, R_ARM, R_SEC } = this._atkData;
        const g = this._atkG;

        g.clear();
        g.lineStyle(1, 0x1a1a33, alpha * 0.30);
        g.beginPath();
        g.arc(atkX, atkY, R_ARM, Phaser.Math.DegToRad(-85), Phaser.Math.DegToRad(-175), true);
        g.strokePath();

        g.fillStyle(0x0a0814, alpha * 0.92);
        g.fillCircle(atkX, atkY, R_ATK);
        const nearInteract = this.game()?._nearInteract ?? false;
        const atkRingColor = nearInteract ? 0x44aaff : 0xee8833;
        g.lineStyle(2, atkRingColor, alpha);
        g.strokeCircle(atkX, atkY, R_ATK);
        g.lineStyle(1, atkRingColor, alpha * 0.20);
        g.strokeCircle(atkX, atkY, R_ATK - 14);
        g.lineStyle(2, 0xddaa55, alpha * 0.88);
        g.lineBetween(atkX, atkY - 28, atkX, atkY + 22);
        g.lineStyle(2, 0xddaa55, alpha * 0.72);
        g.lineBetween(atkX - 18, atkY - 4, atkX + 18, atkY - 4);
        g.fillStyle(0xddaa55, alpha * 0.68);
        g.fillCircle(atkX, atkY + 28, 5);

        for (let i = 0; i < 4; i++) {
            const { slotG, cdG, nameLabel, costLabel, sx, sy } = this._slotData[i];
            const spellId = playerStats.skillSlots[i];

            slotG.clear();
            cdG.clear();

            if (!spellId) {
                slotG.fillStyle(0x080818, alpha * 0.80);
                slotG.fillCircle(sx, sy, R_SK);
                slotG.lineStyle(1, 0x1a1a3a, alpha * 0.70);
                slotG.strokeCircle(sx, sy, R_SK);
                nameLabel.setText('—').setStyle({ fill: '#252545' });
                costLabel.setText('');
                continue;
            }

            const spell = SPELLS[spellId];
            const level = playerStats.getSpellLevel(spellId);
            if (!spell || !level) continue;

            const col    = ELEMENT_COLORS[spell.element] ?? 0x555566;
            const hexCol = `#${col.toString(16).padStart(6, '0')}`;

            slotG.fillStyle(0x080818, alpha * 0.92);
            slotG.fillCircle(sx, sy, R_SK);
            slotG.lineStyle(2, col, alpha * 0.90);
            slotG.strokeCircle(sx, sy, R_SK);

            const cd = playerStats.spellCooldowns[spellId] ?? 0;
            if (cd > 0) {
                cdG.fillStyle(0x000000, 0.62);
                cdG.fillCircle(sx, sy, R_SK);
                const secs = Math.ceil(cd / 1000);
                nameLabel.setText(`${secs}s`).setStyle({ fill: '#777788' });
                costLabel.setText('');
            } else {
                const abbr = spell.name.split(' ').map(ww => ww[0]).join('').toUpperCase().substring(0, 4);
                nameLabel.setText(abbr).setStyle({ fill: hexCol });
                const mp = playerStats.getSpellManaCost?.(spellId) ?? 0;
                costLabel.setText(mp > 0 ? `${mp}` : '').setStyle({ fill: '#334466' });
            }
        }

        // Secondary buttons — simple stateless rings + labels.
        const sG = this._secG;
        sG.clear();
        for (const sec of this._secData) {
            sG.fillStyle(0x0a0814, alpha * 0.85);
            sG.fillCircle(sec.sx, sec.sy, R_SEC);
            sG.lineStyle(2, sec.color, alpha);
            sG.strokeCircle(sec.sx, sec.sy, R_SEC);
        }
    }

    // ── Menu tray (keyboard-emulated hotkeys) ───────────────────────────

    _initMenuTray(w, h) {
        const sc     = this.sc;
        const N      = TRAY.length;
        const BTN_R  = Math.round(26 * sc);
        const TRAY_H = Math.round(192 * sc);

        const BTN_GAP  = Math.round(12 * sc);
        const SLOT_W   = BTN_R * 2 + BTN_GAP;
        const groupW   = N * BTN_R * 2 + (N - 1) * BTN_GAP;
        const startX   = w / 2 - groupW / 2 + BTN_R;

        this._trayOpen    = false;
        this._trayOpenY   = h - TRAY_H;
        this._trayClosedY = h + 10;

        this._trayCont = this.scene.add.container(0, this._trayClosedY).setDepth(14);

        const btnsG = this.scene.make.graphics({ add: false });
        this._trayBtnData = TRAY.map((item, i) => {
            const bx = startX + i * SLOT_W;
            const by = TRAY_H / 2;
            btnsG.fillStyle(0x0a1030);
            btnsG.fillCircle(bx, by, BTN_R);
            btnsG.lineStyle(2, 0x334499);
            btnsG.strokeCircle(bx, by, BTN_R);
            return { bx, by, item };
        });
        this._trayCont.add(btnsG);

        TRAY.forEach((item, i) => {
            const { bx, by } = this._trayBtnData[i];
            const lbl = this.scene.make.text({
                x: bx, y: by, text: item.label, add: false,
                style: { font: '10px monospace', fill: '#7799cc', align: 'center' },
            }).setOrigin(0.5);
            this._trayCont.add(lbl);
        });

        this.scene.input.on('pointerdown', (ptr) => {
            if (!this._trayOpen) return;
            for (const { bx, by, item } of this._trayBtnData) {
                const worldY = this._trayCont.y + by;
                const dx = ptr.x - bx, dy = ptr.y - worldY;
                if (dx * dx + dy * dy <= BTN_R * BTN_R) {
                    this._closeTray();
                    if (this.scene.scene.isPaused('GameScene')) return;
                    // Drive the game through the SAME key it would get from a
                    // physical keyboard — GameScene's keydown handler launches it.
                    tapKey(window, KEY_CODES[item.name]);
                    return;
                }
            }
        });

        const TAB_W = 96, TAB_H = 28;
        this._trayTabG  = this.scene.add.graphics().setDepth(29);
        this._trayTabCx = w / 2;
        this._trayTabCy = h - 14;

        const tabHit = this.scene.add.rectangle(w / 2 - TAB_W / 2, h - TAB_H, TAB_W, TAB_H, 0, 0)
            .setOrigin(0).setInteractive().setDepth(32);
        tabHit.on('pointerdown', () => this._toggleTray());
    }

    _drawTrayTab() {
        const alpha = this._hudAlpha();
        const { _trayTabCx: cx, _trayTabCy: cy, _trayOpen: open } = this;
        const g = this._trayTabG;
        g.clear();
        g.fillStyle(0x0a0814, alpha * 0.85);
        g.fillRoundedRect(cx - 48, cy - 12, 96, 24, 10);
        g.lineStyle(2, 0x3344aa, alpha * 0.90);
        g.strokeRoundedRect(cx - 48, cy - 12, 96, 24, 10);
        const dir = open ? 1 : -1;
        g.lineStyle(3, 0x5566dd, alpha);
        g.beginPath();
        g.moveTo(cx - 14, cy + dir * 5);
        g.lineTo(cx,      cy - dir * 5);
        g.lineTo(cx + 14, cy + dir * 5);
        g.strokePath();
    }

    _toggleTray() { this._trayOpen ? this._closeTray() : this._openTray(); }

    _openTray() {
        this._trayOpen = true;
        this.scene.tweens.add({ targets: this._trayCont, y: this._trayOpenY, duration: 180, ease: 'Cubic.easeOut' });
    }

    _closeTray() {
        this._trayOpen = false;
        this.scene.tweens.add({ targets: this._trayCont, y: this._trayClosedY, duration: 140, ease: 'Cubic.easeIn' });
    }

    // ── Pause (keyboard-emulated ESC) ───────────────────────────────────

    _initPause(w, h) {
        const pauseBtn = this.scene.add.text(w / 2, 10, '☰', {
            font: 'bold 18px monospace', fill: '#445566', stroke: '#000000', strokeThickness: 2,
        }).setOrigin(0.5, 0).setInteractive().setDepth(50);
        pauseBtn.on('pointerdown', () => {
            // Same key a physical ESC sends: in-game → save & exit to menu;
            // in a sub-menu → close it. Unified with the keyboard path.
            tapKey(window, KEY_CODES.esc);
        });
    }

    // ── Gamepad (always active; feeds joyVec + actions) ─────────────────

    _initGamepad() {
        this._padPrev = {};
        this.scene.input.gamepad.on('connected',    () => this.scene.showNotification('Controller connected', 2000));
        this.scene.input.gamepad.on('disconnected', () => this.scene.showNotification('Controller disconnected', 2000));
    }

    _updateGamepad() {
        if (!this.scene.input.gamepad?.total) return;
        const pad = this.scene.input.gamepad.getPad(0);
        if (!pad) return;

        if (!this._joyActive) {
            const DEAD = 0.15;
            const lx = Math.abs(pad.leftStick?.x ?? 0) > DEAD ? pad.leftStick.x : 0;
            const ly = Math.abs(pad.leftStick?.y ?? 0) > DEAD ? pad.leftStick.y : 0;
            if (lx !== 0 || ly !== 0) {
                this.joyVec.x = lx;
                this.joyVec.y = ly;
            } else {
                const dpx = (pad.right > 0 ? 1 : 0) - (pad.left > 0 ? 1 : 0);
                const dpy = (pad.down  > 0 ? 1 : 0) - (pad.up   > 0 ? 1 : 0);
                const dpLen = Math.hypot(dpx, dpy) || 1;
                this.joyVec.x = dpx !== 0 || dpy !== 0 ? dpx / dpLen : 0;
                this.joyVec.y = dpx !== 0 || dpy !== 0 ? dpy / dpLen : 0;
            }
        }

        const just = (i) => (pad.buttons[i]?.value > 0.5) && !this._padPrev[i];
        const gs   = this.game();
        const paused = this.scene.scene.isPaused('GameScene');

        if (gs && !paused) {
            if (just(0)) {
                gs._tryMainAction?.();
                this._flashButton(this._atkData.atkX, this._atkData.atkY, this._atkData.R_ATK, 0xee8833);
            }
            [1, 2, 3, 5].forEach((btnIdx, slotIdx) => {
                if (just(btnIdx)) {
                    gs._tryActivateSlot?.(slotIdx);
                    const s = this._slotData[slotIdx];
                    if (s) this._flashButton(s.sx, s.sy, this._atkData.R_SK, 0xffffff);
                }
            });
            if (just(4)) this._toggleTray();
            if (just(9)) tapKey(window, KEY_CODES.esc);
        }

        const next = {};
        pad.buttons.forEach((b, i) => { next[i] = b.value > 0.5; });
        this._padPrev = next;
    }
}
```

- [ ] **Step 4: Run the smoke test**

Run: `node apps/amo/tools/test_launcher_controls.mjs`
If importing Phaser at module load fails in node, split `ELEMENT_COLORS`/`SLOT_KEYS`/`TRAY`/`SECONDARY` into `src/controls/launcherDefs.js` (pure), import those into the class, and have the test import the defs module instead. Keep the class file itself Phaser-import-free at top level if needed.

- [ ] **Step 5: Rewrite `UIScene.js` to use the deck**

Keep: HP/MP/ping bars, status labels, exhaustion overlay, XP bar, level/gold/insight text, minimap, notification text. Remove: joystick, touch HUD, menu tray, pause button, `_hudAlpha`, `_flashButton`, `_goToMenu`, gamepad handlers. Replace `create()` internals and `update()`:

Replace the import block with:

```js
import Phaser from 'phaser';
import { playerStats } from '../systems/PlayerStats.js';
import { TILE_SIZE } from '../data/worldMap.js';
import { getMap } from '../data/maps/index.js';
import { statusManager } from '../systems/StatusManager.js';
import { STATUS_DEFS } from '../data/statuses.js';
import { isMobile } from '../utils/platform.js';
import LauncherControls from '../controls/LauncherControls.js';
```

In `create()`:
- Remove the calls `this._initVirtualJoystick(w, h); this._initTouchHUD(w, h); this._initMenuTray(w, h); this._initGamepad();` and the `pauseBtn` block.
- Keep everything else (bars, minimap, notifications, gold, insight).
- After `this._initMenuTray` removal point, add:

```js
        this._controls = new LauncherControls(this);
        this._joyVec   = this._controls.joyVec;
        this._controls.create(w, h);
```

- Remove `_initVirtualJoystick`, `_joyUpdate`, `_drawJoystick`, `_initTouchHUD`, `_updateTouchHUD`, `_hudAlpha`, `_flashButton`, `_initMenuTray`, `_drawTrayTab`, `_toggleTray`, `_openTray`, `_closeTray`, `_goToMenu`, `_initGamepad`, `_updateGamepad` (all moved to LauncherControls).

In `update()`, replace the tail:

```js
        this._updateTouchHUD();
        this._drawJoystick();
        this._drawTrayTab();
        this._updateGamepad();
        this._updateMinimap();
```

with:

```js
        this._controls.update();
        this._updateMinimap();
```

Keep `showNotification` and `_updateMinimap` and the `_drawMinimapStatic` helper unchanged.

- [ ] **Step 6: Verify + commit**

Run: `cd apps/amo && npm test` (includes new smoke test) → passes.
Run dev server. In a touch-emulating browser (DevTools device mode) confirm: joystick moves the player, attack/interact button works, 4 slots cast, PWR/BLK/SGT buttons trigger power/blink/sight, the menu tray opens INV/SKLS/TOME/MAP/QUEST/CODEX/FORGE, ☰ saves & exits to menu (or closes an open sub-menu). Confirm desktop (non-touch) shows no deck but keyboard/gamepad still work.

```bash
git add apps/amo/src/controls/LauncherControls.js apps/amo/tools/test_launcher_controls.mjs apps/amo/src/scenes/UIScene.js
git commit -m "feat(amo): unified LauncherControls deck driving all input paths"
```

---

### Task 6: Capacitor integration (deps, config, Android project, scripts)

**Files:**
- Modify: `apps/amo/package.json` (deps + scripts)
- Create: `apps/amo/capacitor.config.json`
- Create (generated): `apps/amo/android/`
- Modify: `apps/amo/.gitignore` (stop ignoring `/android/`)

**Interfaces:**
- Consumes: the `dist/` build (Vite, gitignored) + `index.html` at `apps/amo/index.html`.
- Produces: `android/` Gradle project, `mobile:sync` / `mobile:apk` / `mobile:install` npm scripts.

- [ ] **Step 1: Install Capacitor 8**

```bash
cd apps/amo && npm i -D @capacitor/cli@8 @capacitor/core@8 @capacitor/android@8
```

- [ ] **Step 2: Create `capacitor.config.json`**

```json
{
  "appId": "com.arcanemajesty.amo",
  "appName": "Arcane Majesty",
  "webDir": "dist",
  "backgroundColor": "#000000",
  "server": {
    "cleartext": true
  },
  "android": {
    "backgroundColor": "#000000"
  }
}
```

`server.cleartext: true` lets the WebView reach `http://192.168.0.159:3002` for optional online play (Android blocks cleartext by default).

- [ ] **Step 3: Generate the Android project**

```bash
cd apps/amo && npx cap add android
```

- [ ] **Step 4: Stop ignoring `android/`, keep ignoring its build outputs**

Remove the line `/android/` from `apps/amo/.gitignore`. The generated `android/.gitignore` already ignores `.gradle/`, `local.properties`, `build/`, `capacitor.build.gradle`, `capacitor.settings.gradle`. Verify:

```bash
cd apps/amo && git check-ignore android/app/build/outputs/apk/debug/app-debug.apk android/local.properties
```
Expected: both print ignored paths.

- [ ] **Step 5: Add npm scripts to `package.json`**

```json
"mobile:sync": "vite build && cap sync android",
"mobile:apk": "cd android && ./gradlew assembleDebug",
"mobile:install": "adb install -r android/app/build/outputs/apk/debug/app-debug.apk"
```

- [ ] **Step 6: Verify + commit**

Run: `cd apps/amo && npm run build` → passes; then `npx cap sync android` → confirms `android/app/src/main/assets/public/index.html` exists.

```bash
git add apps/amo/package.json apps/amo/package-lock.json apps/amo/capacitor.config.json apps/amo/.gitignore apps/amo/android
git commit -m "feat(amo): Capacitor 8 Android shell wrapping the game build"
```

---

### Task 7: Fullscreen immersive MainActivity + icon

**Files:**
- Modify: `apps/amo/android/app/src/main/java/com/arcanemajesty/amo/MainActivity.kt`
- Create: `apps/amo/android/app/src/main/res/values-v27/styles.xml`
- Create: `apps/amo/resources/icon.png` (1024×1024) + generated mipmaps
- Modify: `apps/amo/package.json` (`@capacitor/assets` dev dep)

**Interfaces:**
- Consumes: the Android project from Task 6.
- Produces: immersive fullscreen (both system bars hidden, sticky), notch cutout rendering, app icon.

- [ ] **Step 1: Make `MainActivity.kt` immersive**

Replace the generated file body (keep the `package` line) with:

```kotlin
package com.arcanemajesty.amo

import android.os.Bundle
import android.view.View
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        hideSystemBars()
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) hideSystemBars()
    }

    private fun hideSystemBars() {
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY or
            View.SYSTEM_UI_FLAG_FULLSCREEN or
            View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE or
            View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION or
            View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
        )
    }
}
```

- [ ] **Step 2: Notch cutout + black window background**

`apps/amo/android/app/src/main/res/values-v27/styles.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="AppTheme.NoActionBar" parent="Theme.AppCompat.NoActionBar">
        <item name="android:windowLayoutInDisplayCutoutMode">shortEdges</item>
        <item name="android:windowFullscreen">true</item>
        <item name="android:windowBackground">#000000</item>
    </style>
</resources>
```

(If the generated project names its base style differently — check `values/styles.xml` — override that same style name here.)

- [ ] **Step 3: Generate the app icon**

Create `apps/amo/resources/icon.png` (1024×1024) from the cover art with ffmpeg:

```bash
mkdir -p apps/amo/resources
ffmpeg -y -i apps/amo/public/assets/game_cover.png \
  -vf "crop=919:919:(in_w-in_h)/2:0,scale=1024:1024" \
  -compression_level 0 apps/amo/resources/icon.png
```

Install + run the icon generator:

```bash
cd apps/amo && npm i -D @capacitor/assets@3
npx capacitor-assets generate --android --iconPath resources/icon.png
```

- [ ] **Step 4: Verify + commit**

Run: `cd apps/amo && npx cap sync android` (re-sync after asset changes). Confirm `android/app/src/main/res/mipmap-*/ic_launcher.png` exist and are not empty.

```bash
git add apps/amo/android/app/src/main/java/com/arcanemajesty/amo/MainActivity.kt apps/amo/android/app/src/main/res apps/amo/resources apps/amo/package.json apps/amo/package-lock.json
git commit -m "feat(amo): immersive fullscreen shell + launcher icon"
```

---

### Task 8: Android SDK setup script + README

**Files:**
- Create: `apps/amo/scripts/setup_android_sdk.sh`
- Modify: `apps/amo/README.md` (Android build section)

**Interfaces:**
- Consumes: Debian host with `apt` + curl.
- Produces: reproducible one-time SDK install under `/opt/android-sdk`.

- [ ] **Step 1: Write the setup script**

`apps/amo/scripts/setup_android_sdk.sh`:

```bash
#!/usr/bin/env bash
# One-time Android build environment for the Arcane Majesty launcher (Debian).
# Installs JDK 21 + Android command-line tools under /opt/android-sdk.
# Idempotent — safe to re-run. Requires sudo + network.
set -euo pipefail

SDK_ROOT="${ANDROID_HOME:-/opt/android-sdk}"
CMDLINE_ZIP_URL="https://dl.google.com/android/repository/commandlinetools-linux-13114758_latest.zip"
CMDLINE_ZIP="/tmp/commandlinetools.zip"

echo "==> [1/4] JDK 21"
if ! java -version 2>&1 | grep -q 'version "21'; then
  sudo apt-get update
  sudo apt-get install -y openjdk-21-jdk-headless
fi

echo "==> [2/4] Android command-line tools (${SDK_ROOT})"
if [ ! -d "${SDK_ROOT}/cmdline-tools/latest" ]; then
  sudo mkdir -p "${SDK_ROOT}/cmdline-tools"
  curl -fsSL -o "${CMDLINE_ZIP}" "${CMDLINE_ZIP_URL}"
  sudo unzip -q -o "${CMDLINE_ZIP}" -d "${SDK_ROOT}/cmdline-tools"
  sudo mv "${SDK_ROOT}/cmdline-tools/cmdline-tools" "${SDK_ROOT}/cmdline-tools/latest"
  rm -f "${CMDLINE_ZIP}"
fi

echo "==> [3/4] SDK packages"
sudo "${SDK_ROOT}/cmdline-tools/latest/bin/sdkmanager" \
  --sdk_root="${SDK_ROOT}" --install \
  "platform-tools" \
  "platforms;android-36" \
  "build-tools;36.0.0"
yes | sudo "${SDK_ROOT}/cmdline-tools/latest/bin/sdkmanager" --sdk_root="${SDK_ROOT}" --licenses > /dev/null

echo "==> [4/4] Environment"
echo "export ANDROID_HOME=${SDK_ROOT}"
echo "export PATH=${SDK_ROOT}/platform-tools:${SDK_ROOT}/cmdline-tools/latest/bin:\$PATH"
echo "Done. Source the exports above (or add them to ~/.bashrc)."
```

Make it executable: `chmod +x apps/amo/scripts/setup_android_sdk.sh`

- [ ] **Step 2: Add the README "Android build" section**

Append to `apps/amo/README.md`:

```markdown
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
```

- [ ] **Step 3: Commit**

```bash
chmod +x apps/amo/scripts/setup_android_sdk.sh
git add apps/amo/scripts/setup_android_sdk.sh apps/amo/README.md
git commit -m "docs(amo): Android SDK setup script + launcher build docs"
```

---

### Task 9: Build, install, and verify the APK

**Files:** none (verification + any small fixes surfaced by the build).

**Interfaces:**
- Consumes: everything above.
- Produces: `apps/amo/android/app/build/outputs/apk/debug/app-debug.apk`.

- [ ] **Step 1: Run the SDK setup**

Run: `bash apps/amo/scripts/setup_android_sdk.sh` and export `ANDROID_HOME` + PATH per its output.

- [ ] **Step 2: Build the launcher-mode web bundle + sync**

```bash
cd apps/amo
VITE_AMO_CONTROLS=launcher npm run build
npx cap sync android
```

- [ ] **Step 3: Assemble the debug APK**

```bash
cd apps/amo/android && ./gradlew assembleDebug
```
Expected: `app/build/outputs/apk/debug/app-debug.apk` is produced. If Gradle fails on Java version, set `JAVA_HOME` to the JDK 21 install and retry.

- [ ] **Step 4: Install + smoke test on a device**

With a phone connected (USB debugging on) or an emulator running:

```bash
cd apps/amo && npm run mobile:install
```

Smoke test checklist (document result):
- App launches fullscreen — no status bar, no navigation bar, black boot.
- Main menu → New Game → offline play works with no network.
- Joystick moves the player; Attack/Interact, PWR, BLK, SGT, and the 4 skill slots respond.
- Menu tray opens INV/SKLS/TOME/MAP/QUEST/CODEX/FORGE; each closes back to the game.
- ☰ exits to the main menu and the save is retained.
- OPTIONS > Server Address accepts `http://192.168.0.159:3002`; Server Select shows "My Server" and connects when the server is reachable; with it empty, the offline hint shows.
- Screen rotation / notch device: game fills the whole display edge-to-edge.

If no device is available, document the APK path for side-loading and mark the device steps as manual verification.

- [ ] **Step 5: Final full check + commit any build fixes**

```bash
cd apps/amo && npm test && npm run build
```
If the build surfaced fixes (e.g., asset path, WebView quirk), commit them in a `fix(amo): ...` commit before finishing.

---

## Self-review (run after writing)

1. **Spec coverage** — Capacitor wrapper (T6), fullscreen (T7), app icon (T7), online server setting (T4), LauncherControls unified layer + Power/Blink/Sight (T3+T5), keyboard-emulation for menus/pause (T5), direct calls for gameplay (T3+T5), `_joyVec` movement (T5), AMO_CONTROLS flag (T2+T5+T9), SDK setup (T8), build/verify (T9), README (T8).
2. **Placeholders** — none; every step has concrete code or a concrete command.
3. **Type consistency** — `KEY_CODES` keys referenced by `TRAY`/`SECONDARY` match the Task 1 map; `UIScene._joyVec` contract preserved; `_tryPower/_tryBlink/_trySight` defined in T3 and consumed in T5; `_deckVisible` gates only drawing, `_updateGamepad` always runs.
