import { GamepadNav } from './GamepadNav.js';

/**
 * Lightweight gamepad focus-ring for menu/overlay scenes. Give it an ordered list
 * of focusable targets ({ obj, activate }); it draws a yellow highlight around the
 * focused object (via obj.getBounds()), cycles with the dpad/stick, fires `activate`
 * on A, and calls `onBack` on B/Start. Linear cycling works for both lists and
 * grids (pass `cols` so up/down jump a row).
 *
 * Keyboard/mouse and touch keep working independently — this only adds gamepad.
 * Returns the raw GamepadNav state from poll() so scenes can handle extra buttons
 * (LB/RB tab switches, etc.).
 */
export class MenuFocus {
    constructor(scene, { onBack } = {}) {
        this.scene  = scene;
        this.nav    = new GamepadNav(scene);
        this.onBack = onBack;
        this.items  = [];
        this.idx    = 0;
        this.cols   = 1;
        this._hl    = null;
    }

    setItems(items, { cols = 1, startIdx = 0 } = {}) {
        this.items = items ?? [];
        this.cols  = Math.max(1, cols);
        this.idx   = Math.min(Math.max(0, startIdx), Math.max(0, this.items.length - 1));
        if (!this._hl) this._hl = this.scene.add.graphics().setDepth(400);
        this._draw();
    }

    move(d) {
        if (!this.items.length) return;
        this.idx = (this.idx + d + this.items.length) % this.items.length;
        this._draw();
    }

    _draw() {
        if (!this._hl) return;
        this._hl.clear();
        const obj = this.items[this.idx]?.obj;
        if (!obj?.getBounds) return;
        const b = obj.getBounds();
        this._hl.lineStyle(2, 0xffcc44, 1).strokeRect(b.x - 2, b.y - 2, b.width + 4, b.height + 4);
    }

    /** Call from scene.update(). Returns the GamepadNav state (or null if no pad). */
    poll(delta) {
        const gp = this.nav.poll(delta);
        if (!gp) return null;
        if (this.items.length) {
            if (gp.down)  this.move(this.cols);
            if (gp.up)    this.move(-this.cols);
            if (gp.right) this.move(1);
            if (gp.left)  this.move(-1);
            if (gp.A)     this.items[this.idx]?.activate?.();
        }
        if ((gp.B || gp.start) && this.onBack) this.onBack();
        return gp;
    }

    destroy() { this._hl?.destroy(); this._hl = null; }
}
