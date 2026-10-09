#!/usr/bin/env node
/**
 * CharacterRenderer._layerTarget against a minimal fake Phaser scene: what a
 * layer plays for own art, walk fallback, hide, retimed borrow, a borrow whose
 * source isn't loaded, and a palette-swapped (tinted) borrowed layer.
 * Run: node tools/test_renderer_rules.mjs
 */
import { CharacterRenderer, texKey } from '../src/systems/CharacterRenderer.js';

let passed = 0; const fails = [];
function check(name, got, want) {
    if (JSON.stringify(got) === JSON.stringify(want)) passed++;
    else fails.push(`${name}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
}

// ── fake scene: textures (4-row 64 px sheets) and an animation registry ──
function fakeTexture(key, cols) {
    const frames = {};
    for (let i = 0; i < cols * 4; i++) frames[i] = {};
    return { key, source: [{ width: cols * 64, height: 256, image: null }], frames,
        customData: { framesPatched: true, frameW: 64, frameH: 64, contentRows: new Set([0, 1, 2, 3]) } };
}
const textures = new Map();
const anims = new Map();
const scene = {
    textures: {
        exists: k => textures.has(k),
        get: k => textures.get(k) ?? { key: '__MISSING' },
    },
    anims: {
        exists: k => anims.has(k),
        get: k => anims.get(k),
        remove: k => anims.delete(k),
        create: cfg => anims.set(cfg.key, { key: cfg.key, frameRate: cfg.frameRate,
            frames: cfg.frames.map(f => ({ textureKey: f.key, textureFrame: f.frame })) }),
    },
};

const cape = { slot: 'cape', type: 'cape', id: 'solid/female', color: 'red', anims: ['walk', 'hurt', 'slash', 'spellcast'] };
const walkKey = texKey(cape, 'walk');
textures.set(walkKey, fakeTexture(walkKey, 9));            // walk: 9 cols (standing frame + 8)
textures.set(texKey(cape, 'slash'), fakeTexture(texKey(cape, 'slash'), 6));
// spellcast is in the manifest but NOT loaded

const r = new CharacterRenderer(scene);
const KEY = 'cape|solid/female|';
const target = (motion, overrides, extra = {}) => r._layerTarget({ layer: cape, ruleOverrides: overrides, ...extra }, motion, 'down');

check('own art', target('slash')?.animKey, `${texKey(cape, 'slash')}_down`);
check('walk fallback', target('run')?.animKey, `${walkKey}_down`);
check('hide', target('sit', { [KEY]: { sit: { rule: 'hide' } } }), null);

const b = target('jump', { [KEY]: { jump: { rule: 'borrow', from: 'walk' } } });
check('borrow key is retimed', b?.animKey, `${walkKey}_down~jump`);
const ra = anims.get(b?.animKey);
check('retimed to jump length', ra?.frames.length, 5);
check('retimed at jump rate', ra?.frameRate, 8);
const walkFrames = anims.get(`${walkKey}_down`).frames.map(f => f.textureFrame);
check('retimed frames come from walk', ra?.frames.map(f => f.textureFrame), [0, 1, 3, 4, 6].map(i => walkFrames[i]));

check('borrow source not loaded → walk fallback, not retimed',
      target('emote', { [KEY]: { emote: { rule: 'borrow', from: 'spellcast' } } })?.animKey, `${walkKey}_down`);

// tinted: the creator registers swappedKeys[concrete] → the retimed anim is built from the tinted sheet
const rcKey = `${walkKey}__rc_cloth_Blue`;
textures.set(rcKey, fakeTexture(rcKey, 9));
const tinted = target('jump', { [KEY]: { jump: { rule: 'borrow', from: 'walk' } } }, { swappedKeys: { walk: rcKey } });
check('tinted borrowed layer stays retimed', tinted?.animKey, `${rcKey}_down~jump`);
check('tinted retimed frames use the tinted texture', anims.get(tinted?.animKey)?.frames[0].textureKey, rcKey);

if (fails.length) { console.error(`✗ renderer rules: ${fails.length} failed\n  ` + fails.join('\n  ')); process.exit(1); }
console.log(`✓ renderer rules: ${passed} passed`);
