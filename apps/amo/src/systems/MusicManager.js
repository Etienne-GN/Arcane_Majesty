// Procedural music engine — all synthesis via WebAudio API, no audio files required.
// 8 calm patterns + 8 intense patterns + 1 boss pattern.
// Mood transitions happen at the start of the next loop cycle (no clicks/pops).
// Intense mood triggers when Mana Scent >= 50 (tension mounting, hunt approaching).

const CALM = [
    // Basic 4 — sine/triangle, gentle ascent-descent
    { notes: [196, 233, 261, 311, 392, 311, 261, 233], tempo: 320, type: 'sine' },
    { notes: [147, 175, 220, 261, 294, 261, 220, 175], tempo: 360, type: 'triangle' },
    { notes: [220, 261, 330, 392, 440, 392, 330, 261], tempo: 300, type: 'sine' },
    { notes: [165, 196, 247, 294, 330, 294, 247, 196], tempo: 340, type: 'triangle' },
    // Expanded 4 — lower octave meditations and modal wandering
    { notes: [131, 156, 175, 196, 233, 196, 175, 156], tempo: 380, type: 'sine' },
    { notes: [174, 196, 220, 261, 311, 261, 220, 196], tempo: 310, type: 'triangle' },
    { notes: [110, 131, 165, 196, 220, 196, 165, 131], tempo: 400, type: 'sine' },
    { notes: [196, 220, 247, 294, 370, 294, 247, 220], tempo: 330, type: 'triangle' },
];

const INTENSE = [
    // Basic 4 — square/sawtooth, urgent drive
    { notes: [196, 233, 261, 294, 349, 294, 261, 220], tempo: 170, type: 'square' },
    { notes: [147, 185, 220, 277, 330, 277, 220, 165], tempo: 160, type: 'sawtooth' },
    { notes: [220, 277, 330, 415, 330, 277, 208, 220], tempo: 180, type: 'square' },
    { notes: [165, 208, 247, 311, 370, 311, 247, 185], tempo: 165, type: 'sawtooth' },
    // Expanded 4 — syncopated patterns and dissonant tension
    { notes: [185, 220, 277, 330, 277, 233, 185, 220], tempo: 155, type: 'square' },
    { notes: [156, 196, 233, 311, 277, 233, 185, 156], tempo: 175, type: 'sawtooth' },
    { notes: [208, 247, 294, 370, 330, 277, 220, 247], tempo: 162, type: 'square' },
    { notes: [139, 175, 220, 262, 330, 262, 196, 175], tempo: 168, type: 'sawtooth' },
];

const BOSS = { notes: [110, 131, 156, 139, 117, 131, 98, 110], tempo: 150, type: 'sawtooth' };

class MusicManager {
    constructor() {
        this.ctx         = null;
        this._masterGain = null;
        this.mood        = 'calm';
        this._loopTimer  = null;
        this._patIdx     = 0;
        this.enabled     = true;
        this._volume     = 0.09;
        this._running    = false;
    }

    _ctx() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this._masterGain = this.ctx.createGain();
            this._masterGain.gain.value = this._volume;
            this._masterGain.connect(this.ctx.destination);
        }
        if (this.ctx.state === 'suspended') this.ctx.resume();
        return this.ctx;
    }

    start() {
        if (this._running) return;
        this._running = true;
        this._scheduleLoop();
    }

    stop() {
        this._running = false;
        clearTimeout(this._loopTimer);
        this._loopTimer = null;
        if (this._masterGain) {
            this._masterGain.gain.setValueAtTime(this._masterGain.gain.value, this._ctx().currentTime);
            this._masterGain.gain.exponentialRampToValueAtTime(0.001, this._ctx().currentTime + 0.4);
        }
    }

    // Call from GameScene update (throttled to ~500ms). Mood transitions at next loop.
    updateMood(manaScent, inBossFight) {
        const newMood = inBossFight ? 'boss' : manaScent >= 50 ? 'intense' : 'calm';
        if (newMood !== this.mood) {
            this.mood = newMood;
            this._patIdx++;
        }
    }

    _getPattern() {
        if (this.mood === 'boss')    return BOSS;
        if (this.mood === 'intense') return INTENSE[this._patIdx % INTENSE.length];
        return CALM[this._patIdx % CALM.length];
    }

    _scheduleLoop() {
        if (!this._running || !this.enabled) return;

        const ctx      = this._ctx();
        const pattern  = this._getPattern();
        const { notes, tempo, type } = pattern;
        const startAt  = ctx.currentTime + 0.05;

        notes.forEach((freq, i) => {
            if (freq === 0) return;
            const t   = startAt + i * (tempo / 1000);
            const dur = (tempo / 1000) * 0.72;

            const osc  = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(this._masterGain);

            osc.type = type;
            osc.frequency.setValueAtTime(freq, t);
            gain.gain.setValueAtTime(0.9, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

            osc.start(t);
            osc.stop(t + dur + 0.02);
        });

        // Add sub-bass pulse on beat 1 for boss/intense
        if (this.mood !== 'calm') {
            const root = notes[0] / 2;
            const t    = startAt;
            const dur  = (tempo / 1000) * 1.5;
            const osc  = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(this._masterGain);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(root, t);
            gain.gain.setValueAtTime(0.6, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
            osc.start(t);
            osc.stop(t + dur + 0.02);
        }

        const loopMs = notes.length * tempo;
        this._loopTimer = setTimeout(() => this._scheduleLoop(), loopMs - 60);
    }
}

export const musicManager = new MusicManager();
