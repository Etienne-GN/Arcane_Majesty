// Pure config for the LauncherControls deck — no Phaser, no DOM, no node deps.
// Split out of LauncherControls.js so node smoke tests can import it directly
// (LauncherControls.js imports Phaser, which executes browser code at load time).

export const ELEMENT_COLORS = {
    fire: 0xff6600, arcane: 0xaa44ff, lightning: 0xffdd00,
    shadow: 0x8800cc, earth: 0x44aa22, ice: 0x88ddff,
    nature: 0x44cc44, wind: 0xccffaa,
};

export const SLOT_KEYS = ['Q', 'R', 'F', 'T'];

// Menu pad buttons — each dispatches the same hotkey a physical keyboard sends,
// so GameScene's keydown handlers drive the whole flow (pause GameScene + launch).
export const TRAY = [
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
export const SECONDARY = [
    { label: 'PWR', action: '_tryPower',  angle: 95,  color: 0xddaa55 },
    { label: 'BLK', action: '_tryBlink',  angle: 125, color: 0x55ccff },
    { label: 'SGT', action: '_trySight',  angle: 155, color: 0xcc99ff },
];
