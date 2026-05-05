// Procedural audio — no audio files required. All sounds synthesized via WebAudio API.

class SoundManager {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        this.masterVolume = 0.5;
    }

    _ctx() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        // Resume if suspended (browser autoplay policy)
        if (this.ctx.state === 'suspended') this.ctx.resume();
        return this.ctx;
    }

    _tone(freq, duration, type = 'square', vol = 0.25, freqEnd = null) {
        if (!this.enabled) return;
        const ctx = this._ctx();
        const now = ctx.currentTime;
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = type;
        osc.frequency.setValueAtTime(freq, now);
        if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, now + duration);
        gain.gain.setValueAtTime(vol * this.masterVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        osc.start(now);
        osc.stop(now + duration + 0.01);
    }

    _noise(duration, vol = 0.25, filterFreq = 400) {
        if (!this.enabled) return;
        const ctx = this._ctx();
        const now = ctx.currentTime;
        const samples = Math.ceil(ctx.sampleRate * duration);
        const buf  = ctx.createBuffer(1, samples, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < samples; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / samples);

        const src    = ctx.createBufferSource();
        const filter = ctx.createBiquadFilter();
        const gain   = ctx.createGain();
        filter.type = 'bandpass';
        filter.frequency.value = filterFreq;
        src.buffer = buf;
        src.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
        gain.gain.setValueAtTime(vol * this.masterVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        src.start(); src.stop(now + duration + 0.01);
    }

    // --- Public sound events ---

    attack()    { this._noise(0.07, 0.3, 350); this._tone(180, 0.05, 'sawtooth', 0.1); }
    hit()       { this._tone(160, 0.08, 'square', 0.2, 80); }
    playerHit() { this._tone(100, 0.18, 'sawtooth', 0.3, 60); this._noise(0.12, 0.15, 200); }
    enemyDie()  { this._tone(240, 0.05, 'square', 0.2); this._tone(80, 0.2, 'sawtooth', 0.15, 40); }

    levelUp() {
        const notes = [261, 329, 392, 523, 659];
        notes.forEach((f, i) => setTimeout(() => this._tone(f, 0.18, 'square', 0.2), i * 90));
    }

    collect()      { this._tone(440, 0.07, 'square', 0.2); setTimeout(() => this._tone(660, 0.14, 'square', 0.18), 70); }
    openChest()    { this._tone(330, 0.1, 'square', 0.2); setTimeout(() => this._tone(550, 0.2, 'square', 0.2), 90); }
    interact()     { this._tone(380, 0.05, 'square', 0.12); }
    menuHover()    { this._tone(500, 0.04, 'square', 0.08); }
    menuSelect()   { this._tone(440, 0.07, 'square', 0.18); setTimeout(() => this._tone(880, 0.1, 'square', 0.15), 55); }
    gameOver()     { [220, 180, 140, 100].forEach((f, i) => setTimeout(() => this._tone(f, 0.3, 'sawtooth', 0.25), i * 200)); }
    save()         { this._tone(660, 0.06, 'square', 0.12); setTimeout(() => this._tone(880, 0.1, 'square', 0.1), 60); }
    critHit()      { this._noise(0.05, 0.3, 800); this._tone(320, 0.08, 'square', 0.25); }
}

export const soundManager = new SoundManager();
