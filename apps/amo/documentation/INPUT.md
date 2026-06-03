# Input & Control Parity (amo)

Goal: the whole game is playable with **keyboard+mouse**, **touch**, or **gamepad**.

## Systems
- **Keyboard/mouse:** Phaser keyboard keys + `setInteractive()` pointer handlers on every button.
- **Touch:** every button uses `setInteractive`/`pointerdown` (so taps work). Gameplay has an on-screen HUD in `UIScene`: virtual joystick (`_joyVec`), main-action button, skill-slot buttons, pause, and the screen tray.
- **Gamepad:** `src/systems/GamepadNav.js` — a per-scene polling helper. `poll(delta)` returns `{up,down,left,right, A,B,X,Y,LB,RB,start, lx,ly}` with edge-detection + dpad/stick repeat. Each scene wires it in `update()`. `UIScene._updateGamepad()` drives gameplay (move + A=action + B/X/Y/RB=slots + LB=tray + Start=menu).

## Gameplay (GameScene + UIScene) — all three ✅
- Move: arrows/WASD · joystick · stick/dpad.
- Main action (attack, or interact when near an NPC/chest/campfire/sign/node/gate): `Z`/click · attack button · `A`.
- Skill slots 0–3: `Q/R/F/T` · slot buttons · `B/X/Y/RB`.
- Menu/pause: `Esc`/`☰` · `Start`. Tray: tab button · `LB`.
- Minor keyboard-only extras not on pad/touch: power-attack `X`, blink `Space`, sight `V` (reachable via skill slots when assigned).

## Menus / overlays — gamepad coverage
18 scenes already use `GamepadNav`. The following overlays (reached during play) were
**missing gamepad support entirely** — a controller couldn't even close them:

| Scene | Was | Fix |
|---|---|---|
| FastTravelScene | kbd+touch | gamepad: cycle gate list, A=travel, B=cancel |
| CampfireScene | kbd+touch | gamepad: switch tabs (LB/RB), navigate options, A=use, B=close |
| CodexScene | kbd+touch | gamepad: LB/RB tabs, scroll, B=close |
| ChestScene | touch | gamepad: cycle slots, A=take/store, B=close |
| WorldMapScene | kbd+touch | gamepad: B=close (view-only) |
| AethericTearScene | kbd+touch | gamepad: gate list nav + A=select, B=cancel |
| OfflineMenuScene | — | redirect stub, no input needed |

> Note: gamepad menu navigation is interactive/visual; it follows the established
> `GamepadNav` pattern but should be play-tested on a real controller.

## Character Creator — gamepad
Mouse/touch use the on-screen arrows, pickers, sliders, and swatches. Controller:
- **dpad ↑/↓** — move the focused part row (yellow box; shown only when a pad is connected)
- **dpad ←/→** — cycle that part (reaches every option, no popup needed)
- **A / X** — next / previous colour-or-tint for the focused row
- **Y** — remove the part (the row's ✕)
- **LB / RB** — switch tab (Body / Clothes / Marks / Equip)
- **B** — back (or close an open picker/preset popup)
- **Start** — save / export the character

Picker/swatch *popups* are still tap/mouse only, but every option is reachable by
dpad ←/→ cycling, so a character can be built start-to-finish on a controller.
