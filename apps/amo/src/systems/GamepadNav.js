// Shared gamepad navigation helper for menu/overlay scenes.
// Usage: create in scene.create(), call poll(delta) each update().
// Returns null when no pad is connected; otherwise a nav-state object.

export class GamepadNav {
    constructor(scene) {
        this._scene = scene;
        this._prev  = {};
        this._repeatDir   = null;
        this._repeatTimer = 0;
    }

    poll(delta = 16) {
        const gp = this._scene.input?.gamepad;
        if (!gp?.total) return null;
        const pad = gp.getPad(0);
        if (!pad) return null;

        const DEAD = 0.15;
        const lx = Math.abs(pad.leftStick?.x ?? 0) > DEAD ? pad.leftStick.x : 0;
        const ly = Math.abs(pad.leftStick?.y ?? 0) > DEAD ? pad.leftStick.y : 0;

        const dpL = pad.left  > 0 || lx < -0.5;
        const dpR = pad.right > 0 || lx >  0.5;
        const dpU = pad.up    > 0 || ly < -0.5;
        const dpD = pad.down  > 0 || ly >  0.5;

        // Capture prev before computing edge state
        const prev    = this._prev;
        const justBtn = (i) => (pad.buttons[i]?.value > 0.5) && !prev[i];

        // Directional repeat: 300 ms initial delay, 120 ms repeat rate
        const stickDir = dpU ? 'up' : dpD ? 'down' : dpL ? 'left' : dpR ? 'right' : null;
        let up = false, down = false, left = false, right = false;
        if (stickDir) {
            if (stickDir !== this._repeatDir) {
                this._repeatDir   = stickDir;
                this._repeatTimer = 300;
                up    = stickDir === 'up';
                down  = stickDir === 'down';
                left  = stickDir === 'left';
                right = stickDir === 'right';
            } else {
                this._repeatTimer -= delta;
                if (this._repeatTimer <= 0) {
                    this._repeatTimer = 120;
                    up    = stickDir === 'up';
                    down  = stickDir === 'down';
                    left  = stickDir === 'left';
                    right = stickDir === 'right';
                }
            }
        } else {
            this._repeatDir   = null;
            this._repeatTimer = 0;
        }

        const next = {};
        pad.buttons.forEach((b, i) => { next[i] = b.value > 0.5; });
        this._prev = next;

        return {
            up, down, left, right,
            A:     justBtn(0),   // confirm / action
            B:     justBtn(1),   // cancel / back
            X:     justBtn(2),
            Y:     justBtn(3),
            LB:    justBtn(4),
            RB:    justBtn(5),
            start: justBtn(9),
            just:  justBtn,
            lx, ly,
        };
    }
}
