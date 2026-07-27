import Phaser from 'phaser';
import { networkManager } from '../systems/NetworkManager.js';

const MAX_MESSAGES  = 30;
const VISIBLE_LINES = 8;
const MSG_FADE_MS   = 8000; // messages fade after 8s of inactivity
const LINE_H        = 18;
const PAD           = 8;
const CHAT_W        = 320;
const CHAT_X        = 12;

export default class ChatScene extends Phaser.Scene {
    constructor() { super({ key: 'ChatScene', active: false }); }

    create() {
        const h = this.scale.height;
        this._messages  = []; // { name, text, ts }
        this._inputOpen = false;
        this._scroll    = 0;  // lines scrolled from bottom (0 = newest at bottom)

        // Log background (only visible when messages are fresh or input open)
        const logH = VISIBLE_LINES * LINE_H + PAD * 2;
        this._logY  = h - logH - 40; // above input area
        this._logBg = this.add.rectangle(CHAT_X, this._logY, CHAT_W, logH, 0x000000, 0.55).setOrigin(0).setDepth(60);
        this._logBg.setAlpha(0);

        // Message text objects (pool of VISIBLE_LINES)
        this._lineTexts = [];
        for (let i = 0; i < VISIBLE_LINES; i++) {
            const t = this.add.text(CHAT_X + PAD, this._logY + PAD + i * LINE_H, '', {
                font: '14px monospace',
                fill: '#ffffff',
                stroke: '#000000',
                strokeThickness: 2,
                wordWrap: { width: CHAT_W - PAD * 2 },
            }).setDepth(61).setAlpha(0);
            this._lineTexts.push(t);
        }

        // Input area (DOM element — absorbs keyboard events naturally)
        this._inputEl = document.createElement('input');
        Object.assign(this._inputEl.style, {
            position:   'absolute',
            left:       `${CHAT_X}px`,
            top:        `${h - 36}px`,
            width:      `${CHAT_W}px`,
            height:     '28px',
            background: 'rgba(0,0,0,0.75)',
            color:      '#ffdd88',
            border:     '1px solid #665533',
            font:       '14px monospace',
            padding:    '2px 6px',
            outline:    'none',
            display:    'none',
            zIndex:     '100',
            boxSizing:  'border-box',
        });
        this._inputEl.maxLength = 200;
        this._inputEl.placeholder = 'Say something…';
        document.body.appendChild(this._inputEl);

        this._inputEl.addEventListener('keydown', (e) => {
            e.stopPropagation(); // keep Phaser from seeing these keys
            if (e.key === 'Enter') { this._submit(); }
            if (e.key === 'Escape') { this._closeInput(); }
        });

        // Open chat on Enter key (only when input is not already open)
        this.input.keyboard.on('keydown-ENTER', () => { if (!this._inputOpen) this._openInput(); });

        // Scroll with PageUp/PageDown when input is closed
        this.input.keyboard.on('keydown-UP',   () => { if (!this._inputOpen) this._scrollBy(1); });
        this.input.keyboard.on('keydown-DOWN', () => { if (!this._inputOpen) this._scrollBy(-1); });

        // Network listener
        this._onChat = ({ name, text }) => this._receive(name, text);
        networkManager.on('chat', this._onChat);
        this.events.once('shutdown', () => networkManager.off('chat'));

        this._lastActivityTs = 0;
    }

    _openInput() {
        this._inputOpen = true;
        this._inputEl.style.display = 'block';
        this._inputEl.value = '';
        this._inputEl.focus();
        this._showLog(true);
    }

    _closeInput() {
        this._inputOpen = false;
        this._inputEl.style.display = 'none';
        this._inputEl.blur();
        this._lastActivityTs = Date.now();
    }

    _submit() {
        const text = this._inputEl.value.trim();
        if (text) networkManager.sendChat(text);
        this._closeInput();
    }

    _receive(name, text) {
        this._messages.push({ name, text, ts: Date.now() });
        if (this._messages.length > MAX_MESSAGES) this._messages.shift();
        this._scroll = 0; // jump to bottom on new message
        this._lastActivityTs = Date.now();
        this._redrawLog();
        this._showLog(true);
    }

    _scrollBy(d) {
        const max = Math.max(0, this._messages.length - VISIBLE_LINES);
        this._scroll = Phaser.Math.Clamp(this._scroll + d, 0, max);
        this._redrawLog();
    }

    _redrawLog() {
        const total   = this._messages.length;
        const start   = Math.max(0, total - VISIBLE_LINES - this._scroll);
        const visible = this._messages.slice(start, start + VISIBLE_LINES);
        this._lineTexts.forEach((t, i) => {
            const msg = visible[i];
            if (msg) {
                t.setText(`[${msg.name}] ${msg.text}`);
                t.setAlpha(1);
            } else {
                t.setText('').setAlpha(0);
            }
        });
    }

    _showLog(immediate = false) {
        if (immediate) {
            this._logBg.setAlpha(0.55);
            this._lineTexts.forEach(t => { if (t.text) t.setAlpha(1); });
        }
    }

    update() {
        if (this._inputOpen) return; // no fade while typing
        const age = Date.now() - this._lastActivityTs;
        if (age > MSG_FADE_MS) {
            const fade = Phaser.Math.Clamp(1 - (age - MSG_FADE_MS) / 2000, 0, 1);
            this._logBg.setAlpha(fade * 0.55);
            this._lineTexts.forEach(t => { if (t.text) t.setAlpha(fade); });
        }
    }

    shutdown() {
        this._inputEl?.remove();
    }
}
