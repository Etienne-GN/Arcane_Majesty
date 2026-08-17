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