import Phaser from 'phaser';
import { playerStats } from '../systems/PlayerStats.js';
import { ENEMY_TYPES } from '../data/worldMap.js';
import { MenuFocus } from '../systems/MenuFocus.js';

const TABS = ['LORE', 'ECHOES', 'BESTIARY', 'WORLD'];

// Static world lore — always visible, no unlock required
const WORLD_LORE = [
    {
        id: 'gap_0gd',
        title: 'The Gap at 0 GD',
        text: 'The historical record goes dark at 0 GD — the year the Great Darkness reached its apex. Covenant archivists list it as a "record-keeping gap." The Hermit insists it was deliberate erasure. Someone did not want this period remembered.',
    },
    {
        id: 'heartstone',
        title: 'The Heartstone of Creation',
        text: 'Not a treasure. A Cosmic Insulator — a fragment of the original resonance matrix predating structured arcane theory. Its purpose is containment: it sits between the living world and the Void, preventing the Void from anchoring permanently. Without it, a Void Gate could hold indefinitely.',
    },
    {
        id: 'rift_gates',
        title: 'The Rift-Gate Network',
        text: 'Official Covenant doctrine: the network was engineered over 300 years by Guild surveyors. Pre-Covenant fragments suggest otherwise — the pathways exist in the resonance itself, already there. The Covenant merely learned to read the doors. One surveyor\'s full notes were never published. They referenced a thirteenth gate.',
    },
    {
        id: 'vorgos',
        title: 'Vorgos the Stormbringer',
        text: 'Officially a mythological figure. The stone markers in the Prologue Forest bear his seal. At 0 GD, Vorgos sealed the Void Gate at immeasurable personal cost. The records were purged within a generation. The Void General\'s crystallized shard hums at a frequency that predates the Covenant — a remnant of that event.',
    },
    {
        id: 'covenant_staff',
        title: 'The Staff of First Covenant',
        text: '"The Staff was not forged. It grew — from the first seed of structured arcane intention placed in Eldoria. The Covenant did not make it. It made the Covenant." — Arcane inscription, recovered from a buried survey cache near the Hermit\'s clearing.',
    },
    {
        id: 'void_nature',
        title: 'The Void: What It Is',
        text: 'Post-Collapse field notes describe the Void not as darkness but as absence. It does not fill a space — it unmakes the space. Resonance does not diminish in Void-touched zones; it ceases to exist. A scholar who survived three days in such a zone wrote: "silence that has forgotten the concept of sound."',
    },
];

// Bestiary lore — keyed to enemy type IDs
const BESTIARY_LORE = {
    wisp: {
        name: 'Forest Wisp',
        threat: 'LOW',
        desc: 'Resonance-charged fragments that coalesce in areas of high arcane density. They congregate near Rift-Gate sites and ancient survey markers. Dissipation releases trace arcane energy. Neither hostile nor benign — they react to intent.',
    },
    wolf: {
        name: 'Forest Wolf',
        threat: 'MODERATE',
        desc: 'Corrupted pack predators. Void-taint has overwritten their natural behavior — they move as shadows, driven not by hunger but by the Void General\'s will. The pack structure remains intact but serves a darker command.',
    },
    shadow_sprite: {
        name: 'Shadow Sprite',
        threat: 'MODERATE',
        desc: 'Void-born constructs that take the shape of forest creatures. Nothing natural underneath — formed entirely from structured void-matter. They cluster near ruins, feeding on residual resonance. Close contact causes resonance bleed.',
    },
    void_stalker: {
        name: 'Void Stalker',
        threat: 'HIGH',
        desc: 'A mature void construct — persistent, patient, resistant to physical force. The Stalkers near the boss arena are sentinels, not random encounters. They mark the boundary of the Void General\'s sphere of influence.',
    },
    scout: {
        name: 'Void Scout',
        threat: 'MODERATE',
        desc: 'Humanoid — possibly once a Covenant soldier or survey team member. Void-touched past recovery, but retaining enough tactical instinct to function as patrol units. They carry corrupted equipment and remember formation discipline.',
    },
    treant: {
        name: 'Corrupted Treant',
        threat: 'HIGH',
        desc: 'Ancient forest guardians whose resonance core has been inverted by void-taint. Originally protective entities — their corruption marks how deeply the Void\'s influence has spread into the forest\'s living substrate.',
    },
    void_general: {
        name: 'Void General [DEFEATED]',
        threat: 'APEX',
        desc: 'A field commander of the Void — one of many, per its dying words. Its purpose was to test the perimeter and determine whether the Heartstone could be reached before its defenders arrived. That it was defeated means only that this test failed. The Void will send another.',
    },
};

const THREAT_COLORS = {
    LOW: '#44aa44', MODERATE: '#aaaa00', HIGH: '#cc6600', APEX: '#cc2244',
};

const TAB_TITLE_COLORS  = ['#ddbb88', '#88ccdd', '#dd9966', '#99ccaa'];
const TAB_BORDER_COLORS = [0x1a1000, 0x001833, 0x1a0800, 0x001a08];
const TAB_EMPTY_MSGS    = [
    'No lore fragments recovered yet.\nComplete quests and read scrolls to unlock.',
    'No echoes recorded yet.\nThe Scholar\'s Eye reveals echoes near ancient ruins.',
    'No enemies studied yet.\nDefeat enemies to add entries to the Bestiary.',
    '',
];

export default class CodexScene extends Phaser.Scene {
    constructor() { super('CodexScene'); }

    init(data) {
        this._tab    = data?.tab    ?? 0;
        this._scroll = data?.scroll ?? 0;
    }

    create() {
        const w = this.scale.width, h = this.scale.height;
        const px = 14, py = 14, pw = w - 28, ph = h - 28;

        // Background + panel
        this.add.rectangle(0, 0, w, h, 0x000000, 0.87).setOrigin(0);
        this.add.rectangle(px, py, pw, ph, 0x04040e).setOrigin(0);
        const bdr = this.add.graphics();
        bdr.lineStyle(4, 0x332266);
        bdr.strokeRect(px, py, pw, ph);

        // Title
        this.add.text(w / 2, py + 14, 'CODEX — ARCHIVE OF ELDORIA', {
            font: 'bold 20px monospace', fill: '#9966cc',
        }).setOrigin(0.5, 0);

        // Tab bar
        const tabW = Math.floor((pw - 12) / TABS.length);
        TABS.forEach((label, i) => {
            const isActive = i === this._tab;
            const tx = px + 6 + i * tabW;
            const ty = py + 42;
            this.add.rectangle(tx, ty, tabW - 4, 26, isActive ? 0x1a0a2a : 0x080810).setOrigin(0);
            const bdrG = this.add.graphics();
            bdrG.lineStyle(2, isActive ? 0x7744aa : 0x1a1a33);
            bdrG.strokeRect(tx, ty, tabW - 4, 26);
            const btn = this.add.text(tx + (tabW - 4) / 2, ty + 12, label, {
                font: `${isActive ? 'bold ' : ''}16px monospace`,
                fill: isActive ? '#cc99ff' : '#444466',
            }).setOrigin(0.5).setInteractive();
            btn.on('pointerdown', () => { if (i !== this._tab) this.scene.start('CodexScene', { tab: i }); });
            btn.on('pointerover', () => { if (!isActive) btn.setStyle({ fill: '#9988bb' }); });
            btn.on('pointerout',  () => { if (!isActive) btn.setStyle({ fill: '#444466' }); });
        });

        // Entry count badge on active tab
        const count = this._getEntries().length;
        if (this._tab !== 3) {
            this.add.text(px + 6 + this._tab * tabW + tabW - 8, py + 48, `${count}`, {
                font: '14px monospace', fill: count > 0 ? '#cc99ff' : '#333355',
            }).setOrigin(1, 0);
        }

        // Content area
        const cx = px + 10;
        const cy = py + 76;
        const cw = pw - 20;
        const ch = ph - 100;

        this._renderContent(cx, cy, cw, ch);

        // Footer hints
        this.add.text(w / 2, py + ph - 12, '[↑/↓] Scroll   [ESC / L] Close', {
            font: '14px monospace', fill: '#2a2a44',
        }).setOrigin(0.5, 1);

        // Key bindings
        this.input.keyboard.on('keydown-ESC', () => this._close());
        this.input.keyboard.on('keydown-L',   () => this._close());
        this.add.text(w - 12, 8, '✕', {
            font: 'bold 28px monospace', fill: '#aa4444', stroke: '#000000', strokeThickness: 2
        }).setOrigin(1, 0).setInteractive().setDepth(50).on('pointerdown', () => this._close());
        this.input.keyboard.on('keydown-UP',   () => this._scrollBy(-1));
        this.input.keyboard.on('keydown-DOWN', () => this._scrollBy(1));

        let _touchY = null, _touchAcc = 0;
        this.input.on('pointerdown', ptr => { _touchY = ptr.y; _touchAcc = 0; });
        this.input.on('pointermove', ptr => {
            if (_touchY === null || !ptr.isDown) return;
            _touchAcc += _touchY - ptr.y;
            _touchY = ptr.y;
            while (Math.abs(_touchAcc) >= 64) {
                this._scrollBy(_touchAcc > 0 ? 1 : -1);
                _touchAcc += _touchAcc > 0 ? -64 : 64;
            }
        });
        this.input.on('pointerup', () => { _touchY = null; _touchAcc = 0; });

        // Tab hotkeys 1-4
        for (let i = 0; i < 4; i++) {
            const key = ['ONE', 'TWO', 'THREE', 'FOUR'][i];
            this.input.keyboard.on(`keydown-${key}`, () => {
                if (i !== this._tab) this.scene.start('CodexScene', { tab: i });
            });
        }

        // Gamepad: LB/RB switch tabs, dpad up/down scrolls, B closes.
        this._focus = new MenuFocus(this, { onBack: () => this._close() });
    }

    update(time, delta) {
        const gp = this._focus?.poll(delta);
        if (!gp) return;
        if (gp.up)   this._scrollBy(-1);
        if (gp.down) this._scrollBy(1);
        if (gp.RB)   this.scene.start('CodexScene', { tab: (this._tab + 1) % TABS.length });
        if (gp.LB)   this.scene.start('CodexScene', { tab: (this._tab - 1 + TABS.length) % TABS.length });
    }

    _renderContent(x, y, w, h) {
        const entries = this._getEntries();
        if (entries.length === 0) {
            this.add.text(x + 8, y + 32, TAB_EMPTY_MSGS[this._tab], {
                font: '18px monospace', fill: '#3a3350',
                wordWrap: { width: w - 16 },
            });
            return;
        }

        const ENTRY_H_EST = 112;
        const maxStart   = Math.max(0, entries.length - Math.floor(h / ENTRY_H_EST));
        const start      = Math.min(this._scroll, maxStart);

        let curY = y;
        for (let i = start; i < entries.length; i++) {
            const entry = entries[i];
            const usedH = this._renderEntry(x, curY, w, entry);
            curY += usedH + 14;
            if (curY > y + h - 8) break;
        }

        // Scroll indicators
        if (start > 0) {
            this.add.text(x + w, y, '▲', { font: '16px monospace', fill: '#554466' }).setOrigin(1, 0);
        }
        if (start < maxStart) {
            this.add.text(x + w, y + h, '▼', { font: '16px monospace', fill: '#554466' }).setOrigin(1, 1);
        }
    }

    _renderEntry(x, y, w, entry) {
        const titleColor = TAB_TITLE_COLORS[this._tab];
        const bodyColor  = '#556677';
        const bgColor    = TAB_BORDER_COLORS[this._tab];

        const bg = this.add.rectangle(x, y, w, 24, bgColor).setOrigin(0);

        // Title
        this.add.text(x + 10, y + 6, entry.title, {
            font: 'bold 18px monospace', fill: titleColor,
        });

        // Threat badge (bestiary only)
        if (entry.threat) {
            const tColor = THREAT_COLORS[entry.threat] ?? '#556677';
            this.add.text(x + w - 8, y + 6, `[${entry.threat}]`, {
                font: '14px monospace', fill: tColor,
            }).setOrigin(1, 0);
        }

        // Body text
        const bodyText = this.add.text(x + 10, y + 28, entry.text, {
            font: '16px monospace', fill: bodyColor,
            wordWrap: { width: w - 20 },
        });

        const totalH = 28 + bodyText.height + 8;
        bg.setSize(w, totalH);

        // Separator line
        const div = this.add.graphics();
        div.lineStyle(2, 0x111122);
        div.lineBetween(x, y + totalH + 6, x + w, y + totalH + 6);

        return totalH;
    }

    _getEntries() {
        switch (this._tab) {
            case 0:
                return (playerStats.recoveredMemories ?? []).map(m => ({ title: m.title, text: m.text }));
            case 1:
                return (playerStats.codexEchoes ?? []).map(e => ({ title: e.title, text: e.text }));
            case 2:
                return (playerStats.killedEnemyTypes ?? [])
                    .map(type => {
                        const lore = BESTIARY_LORE[type];
                        if (!lore) return null;
                        const hp   = ENEMY_TYPES[type]?.health ?? '?';
                        const dmg  = ENEMY_TYPES[type]?.damage ?? '?';
                        return {
                            title: lore.name,
                            text:  `${lore.desc}\n  HP ${hp}  DMG ${dmg}`,
                            threat: lore.threat,
                        };
                    })
                    .filter(Boolean);
            case 3:
                return WORLD_LORE.map(e => ({ title: e.title, text: e.text }));
            default:
                return [];
        }
    }

    _scrollBy(dir) {
        const next = Math.max(0, this._scroll + dir);
        this.scene.start('CodexScene', { tab: this._tab, scroll: next });
    }

    _close() {
        this.scene.stop();
        this.scene.resume('GameScene');
    }
}
