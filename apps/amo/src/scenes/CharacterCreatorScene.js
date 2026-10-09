import Phaser from 'phaser';
import { CharacterRenderer, DEFAULT_ANIMS, DEFAULT_ZPOS, texKey, layerKey, registerSheetFrames, resolveAnim } from '../systems/CharacterRenderer.js';
import { GamepadNav } from '../systems/GamepadNav.js';
import CATALOGUE from '../data/character_catalogue.json';

// ── Render-type map: UI slot → actual URL type used by CharacterRenderer ──────
// torso_* → 'torso'; wound_*/tail/wings → 'body'; ears/horns/fins/nose → 'head'
import { renderType as rType, SLOTS as ALL_TYPES } from '../systems/lpcLayout.js';

// ── Tab definitions ────────────────────────────────────────────────────────────
const TABS = ['body', 'clothes', 'marks', 'equip'];
const TAB_NAMES = { body: 'BODY', clothes: 'CLOTHES', marks: 'MARKS', equip: 'EQUIP' };

// 2-column layout per tab: [leftCol, rightCol]
const TAB_COLS = {
    body:    [['head','eyes','nose','ears','horns','fins'],               ['hair','beards','facial','body','tail','wings']],
    clothes: [['torso_clothes','torso_jacket','torso_mail','torso_armour','torso_waist'],
              ['legs','dress','feet','arms','shoulders']],
    marks:   [['wound_brain','wound_eye_left','wound_eye_right'],         ['wound_mouth','wound_ribs','wound_arm']],
    equip:   [['hat','neck','cape','staff_accessory'],                    ['backpack','shield','weapon']],
};


const OPTIONAL_TYPES = new Set(ALL_TYPES);

const TYPE_LABEL = {
    body:'BODY',   tail:'TAIL',  wings:'WINGS',
    head:'HEAD',   ears:'EARS',  horns:'HORNS', fins:'FINS', nose:'NOSE',
    hair:'HAIR',  eyes:'EYES',  beards:'BEARD', facial:'FACE',
    torso_clothes:'SHIRT', torso_jacket:'JCKT', torso_mail:'MAIL',
    torso_armour:'ARMR',   torso_waist:'WAIST',
    legs:'LEGS',   dress:'DRESS', feet:'FEET', arms:'ARMS',  shoulders:'SHLDR',
    hat:'HAT',     neck:'NECK',   cape:'CAPE',
    backpack:'BPACK', shield:'SHILD', weapon:'WEAPN', staff_accessory:'STAFF',
    wound_brain:'HEAD', wound_eye_left:'EYE L', wound_eye_right:'EYE R',
    wound_mouth:'MOUTH', wound_ribs:'RIBS', wound_arm:'ARM',
};

const GROUP_COLOR = {
    body:'#7799ff',   tail:'#7799ff',   wings:'#7799ff',
    head:'#7799ff',   ears:'#7799ff',   horns:'#ddbb44', fins:'#7799ff', nose:'#7799ff',
    hair:'#7799ff',   eyes:'#7799ff',
    beards:'#9988dd', facial:'#9988dd',
    torso_clothes:'#ff8833', torso_jacket:'#66dd99', torso_mail:'#88bbcc',
    torso_armour:'#ddbb44',  torso_waist:'#cc9944',
    legs:'#ff8833',   dress:'#ff8866',  feet:'#ff8833',
    arms:'#88bbcc',   shoulders:'#ddbb44',
    hat:'#ddbb44',    neck:'#aa7733',   cape:'#ff8866',
    backpack:'#ff8866', shield:'#ddbb44', weapon:'#ff5555', staff_accessory:'#aa66ff',
    wound_brain:'#cc3333', wound_eye_left:'#cc3333', wound_eye_right:'#cc3333',
    wound_mouth:'#cc3333', wound_ribs:'#cc3333',     wound_arm:'#cc3333',
};

import {
    PALETTE_SOURCE, TINT_PALETTE, FORCE_TINT_TYPES, FORCE_TINT_BASE,
    SOURCE_MATERIAL, TINT_MATERIAL, COLOR_SWATCH_HEX, swapColors, remapPixels,
} from '../systems/lpcPalettes.js';

function trunc(s, n = 13) { return s.length > n ? s.slice(0, n - 1) + '…' : s; }

function findIdx(type, id) {
    const i = CATALOGUE[type]?.findIndex(e => e.id === id) ?? -1;
    return i >= 0 ? i : 0;
}

const DEFAULT_SEL = {};
for (const _t of ALL_TYPES) DEFAULT_SEL[_t] = 0;
DEFAULT_SEL['staff_accessory'] = -1;  // not equipped by default

const DIRS  = ['up', 'left', 'down', 'right'];
// Logical animations the user can preview. Weapon-specific realisations
// (attack_slash / attack_thrust / attack_slash_reverse …) are resolved per layer
// by the renderer, so they are NOT listed separately here.
const ANIMS = [
    'walk','idle','hurt','slash','backslash','halfslash','thrust','shoot','spellcast',
    'run','sit','jump','climb','combat_idle','emote',
];

// ─────────────────────────────────────────────────────────────────────────────

export default class CharacterCreatorScene extends Phaser.Scene {
    constructor() { super('CharacterCreatorScene'); }

    init(data) {
        this._onlineMode  = data?.mode === 'online';
        this._onlineSlot  = data?.slot ?? null;
        this._presetSlots = data?.presetSlots ?? null;
    }

    preload() {
        this._renderer = new CharacterRenderer(this);

        // Build the set of layers to preload: preset slots (if restarting from preset) or defaults
        const slotMap = {};
        if (this._presetSlots) {
            for (const s of this._presetSlots) slotMap[s.uiType] = s;
        }

        for (const type of ALL_TYPES) {
            const s   = slotMap[type];
            const idx = s ? s.catalogueIdx : DEFAULT_SEL[type];
            const opt = CATALOGUE[type]?.[idx];
            if (!opt?.id) continue;
            const rt    = rType(type);
            const color = FORCE_TINT_TYPES.has(type) ? FORCE_TINT_BASE
                        : opt.colors                ? opt.colors[s?.colorIdx ?? 0]
                        : opt.color;
            const layers = [
                { type: rt, id: opt.id, zPos: opt.zPos, color, itemName: opt.itemName, anims: opt.anims },
                ...(opt.companions ?? []).map(c => ({
                    type: rt, id: c.id, zPos: c.zPos,
                    color: c.color ?? ((opt.colors || FORCE_TINT_TYPES.has(type)) ? color : undefined),
                    itemName: c.itemName, anims: c.anims,
                })),
            ];
            this._renderer.preload({ layers, animations: DEFAULT_ANIMS });
        }
    }

    create() {
        const w = this.scale.width, h = this.scale.height;
        const S = Phaser.Math.Clamp(w / 480, 1.0, 1.8);
        const f = (n) => Math.round(n * S);

        // ── State ─────────────────────────────────────────────────────
        this._dirIdx       = DIRS.indexOf('down');
        this._animIdx      = ANIMS.indexOf('walk');
        this._playing      = true;
        this._speed        = 8;
        this._frameIdx     = 0;
        this._sel          = { ...DEFAULT_SEL };
        this._colorSel     = {};
        this._tintSel      = {};
        if (this._presetSlots) {
            for (const s of this._presetSlots) {
                this._sel[s.uiType]      = s.catalogueIdx ?? 0;
                this._colorSel[s.uiType] = s.colorIdx     ?? 0;
                this._tintSel[s.uiType]  = s.tintIdx      ?? 0;
            }
        }
        this._activeTab    = 'body';
        this._pickerLabels = {};
        this._catLabels    = {};
        this._bars         = {};
        this._colorRows    = {};
        this._tintRows     = {};
        this._tabObjects   = { body: [], clothes: [], marks: [], equip: [] };
        this._loadingTypes = new Set();

        // ── Split layout ──────────────────────────────────────────────
        const SPLIT = Math.round(w * 0.62);
        const RP_W  = w - SPLIT;
        const RP_CX = SPLIT + Math.round(RP_W / 2);
        const RP_CY = Math.round(h / 2);
        this._SPLIT = SPLIT; this._RP_W = RP_W; this._RP_CX = RP_CX; this._h = h; this._f = f;
        this._zoom  = Phaser.Math.Clamp(Math.floor(Math.min(RP_W, h * 0.7) / 70), 2, 6);

        // ── Background ────────────────────────────────────────────────
        this.add.rectangle(0, 0, w, h, 0x0d0d0d).setOrigin(0);
        for (let i = 0; i < 60; i++) {
            this.add.rectangle(
                Phaser.Math.Between(0, w), Phaser.Math.Between(0, h),
                1, 1, 0xffffff, Math.random() * 0.22 + 0.04,
            );
        }
        this.add.rectangle(0, 0, SPLIT, h, 0x131313).setOrigin(0, 0);
        const gfxBase = this.add.graphics();
        gfxBase.lineStyle(1, 0x282828);
        gfxBase.strokeRect(0, 0, SPLIT, h);
        this.add.rectangle(SPLIT, 0, RP_W, h, 0x0a0a0a).setOrigin(0, 0);
        gfxBase.lineStyle(1, 0x1e1e1e);
        gfxBase.lineBetween(SPLIT, 0, SPLIT, h);

        // ── Left panel geometry ───────────────────────────────────────
        const PM      = f(8);
        const LP_W    = SPLIT;
        const TITLE_H = f(20);
        const TAB_H   = f(18);
        const BACK_H  = f(16);
        const CTRL_H  = f(78);
        const CTRL_Y0 = h - BACK_H - f(6) - CTRL_H;
        const GRID_Y0 = f(5) + TITLE_H + f(4) + TAB_H + f(4);
        const GRID_H  = CTRL_Y0 - GRID_Y0 - f(4);
        const GAP     = f(4);
        const COL_W   = Math.floor((LP_W - PM * 2 - GAP) / 2);
        const LX      = PM;
        const RX      = PM + COL_W + GAP;

        // ── Title ─────────────────────────────────────────────────────
        this.add.text(LP_W / 2, f(4), 'CHARACTER CREATOR', {
            font: `bold ${f(14)}px monospace`, fill: '#ff8833',
            stroke: '#1a1a1a', strokeThickness: Math.max(1, f(2)),
        }).setOrigin(0.5, 0);

        // ── Tab buttons ───────────────────────────────────────────────
        const TAB_Y   = f(5) + TITLE_H + f(4);
        const TAB_BTW = Math.floor(LP_W / TABS.length);
        this._tabBtns = {};
        TABS.forEach((tab, i) => {
            const tx = i * TAB_BTW;
            const bg = this.add.rectangle(tx + TAB_BTW / 2, TAB_Y + TAB_H / 2, TAB_BTW - 2, TAB_H, 0x1a1a1a)
                .setOrigin(0.5).setInteractive({ useHandCursor: true });
            const lbl = this.add.text(tx + TAB_BTW / 2, TAB_Y + TAB_H / 2, TAB_NAMES[tab], {
                font: `bold ${f(9)}px monospace`, fill: '#666655',
            }).setOrigin(0.5);
            bg.on('pointerdown', () => this._switchTab(tab));
            bg.on('pointerover', () => { if (this._activeTab !== tab) bg.setFillStyle(0x1e1e1e); });
            bg.on('pointerout',  () => this._updateTabBtns());
            this._tabBtns[tab] = { bg, lbl };
        });
        // Tab separator lines
        gfxBase.lineStyle(1, 0x2e2e2e);
        gfxBase.lineBetween(0, TAB_Y + TAB_H + 1, LP_W, TAB_Y + TAB_H + 1);

        // ── Build tab grids ───────────────────────────────────────────
        for (const tabName of TABS) {
            const cols = TAB_COLS[tabName];
            const objs = this._tabObjects[tabName];

            if (!cols) {
                // Marks placeholder
                const msg = this.add.text(LP_W / 2, GRID_Y0 + GRID_H * 0.4,
                    'INJURIES & MARKS\ncoming soon', {
                        font: `bold ${f(12)}px monospace`, fill: '#444444',
                        align: 'center',
                    }).setOrigin(0.5);
                objs.push(msg);
                continue;
            }

            const nRows  = Math.max(cols[0].length, cols[1].length);
            const tROW_H = Math.floor(GRID_H / nRows);

            const tabGfx = this.add.graphics();
            objs.push(tabGfx);

            // Column gap divider
            tabGfx.lineStyle(1, 0x1a1a1a);
            tabGfx.lineBetween(RX - f(2), GRID_Y0 + f(4), RX - f(2), CTRL_Y0 - f(4));

            // Rows
            for (let col = 0; col < 2; col++) {
                const baseX  = col === 0 ? LX : RX;
                const colLen = cols[col].length;
                cols[col].forEach((type, i) => {
                    const ry     = GRID_Y0 + i * tROW_H + tROW_H / 2;
                    const isLast = i === colLen - 1;
                    this._mkCell(tabGfx, baseX, ry, COL_W, tROW_H, type, i, f, S, objs, isLast);
                });
            }
        }

        // ── Hide all tab objects, then show active ────────────────────
        for (const objs of Object.values(this._tabObjects)) {
            for (const obj of objs) obj.setVisible(false);
        }
        this._switchTab('body');

        // Divider above controls
        gfxBase.lineStyle(1, 0x242424);
        gfxBase.lineBetween(f(4), CTRL_Y0, SPLIT - f(4), CTRL_Y0);

        // ── Controls ──────────────────────────────────────────────────
        const DPAD_CX  = PM + f(30);
        const DPAD_CY  = CTRL_Y0 + Math.round(CTRL_H * 0.58);
        const ANIM_CX  = PM + f(112);
        const ANIM_CY  = DPAD_CY;
        const SLDR_LX  = PM + f(178);
        const SLDR_TW  = LP_W - SLDR_LX - PM - f(20);
        const SLDR_Y1  = CTRL_Y0 + Math.round(CTRL_H * 0.18);
        const SLDR_Y2  = CTRL_Y0 + Math.round(CTRL_H * 0.50);
        const SLDR_Y3  = CTRL_Y0 + Math.round(CTRL_H * 0.82);

        this.add.text(DPAD_CX,        CTRL_Y0 + f(3), 'DIR',  { font: `${f(8)}px monospace`, fill: '#444444' }).setOrigin(0.5, 0);
        this.add.text(ANIM_CX,        CTRL_Y0 + f(3), 'ANIM', { font: `${f(8)}px monospace`, fill: '#444444' }).setOrigin(0.5, 0);
        this.add.text(SLDR_LX - f(2), CTRL_Y0 + f(3), 'CTRL', { font: `${f(8)}px monospace`, fill: '#444444' }).setOrigin(0, 0);

        const STEP = f(20), CELL = f(16);
        const dpadCfg = {
            up:    { x: DPAD_CX,        y: DPAD_CY - STEP, lbl: '▲' },
            down:  { x: DPAD_CX,        y: DPAD_CY + STEP, lbl: '▼' },
            left:  { x: DPAD_CX - STEP, y: DPAD_CY,        lbl: '◄' },
            right: { x: DPAD_CX + STEP, y: DPAD_CY,        lbl: '►' },
        };
        this._dpadBtns = {};
        for (const [dir, cfg] of Object.entries(dpadCfg)) {
            const bg  = this.add.rectangle(cfg.x, cfg.y, CELL, CELL, 0x1c1c1c).setOrigin(0.5).setInteractive({ useHandCursor: true });
            const lbl = this.add.text(cfg.x, cfg.y, cfg.lbl, { font: `bold ${f(11)}px monospace`, fill: '#776655' }).setOrigin(0.5);
            bg.on('pointerdown', () => this._setDir(dir));
            bg.on('pointerover', () => { bg.setFillStyle(0x2a1800); lbl.setStyle({ fill: '#ffffff' }); });
            bg.on('pointerout',  () => this._refreshDpad());
            this._dpadBtns[dir] = { bg, lbl };
        }
        const ppBg  = this.add.rectangle(DPAD_CX, DPAD_CY, CELL, CELL, 0x1e1e1e).setOrigin(0.5).setInteractive({ useHandCursor: true });
        const ppLbl = this.add.text(DPAD_CX, DPAD_CY, '▐▐', { font: `bold ${f(8)}px monospace`, fill: '#ffcc44' }).setOrigin(0.5);
        this._ppBg = ppBg; this._ppLbl = ppLbl;
        ppBg.on('pointerover', () => ppBg.setFillStyle(0x4a2060));
        ppBg.on('pointerout',  () => ppBg.setFillStyle(0x1e1e1e));
        ppBg.on('pointerdown', () => this._togglePlay());
        this._refreshDpad();

        this._animLabel = this.add.text(ANIM_CX, ANIM_CY, this._animName(), {
            font: `bold ${f(10)}px monospace`, fill: '#ff8833',
        }).setOrigin(0.5);
        this._mkBtn(ANIM_CX - f(38), ANIM_CY, '◄', () => this._cycleAnim(-1), f(13));
        this._mkBtn(ANIM_CX + f(38), ANIM_CY, '►', () => this._cycleAnim(+1), f(13));

        this._zoomSlider  = this._mkSlider(SLDR_LX, SLDR_Y1, SLDR_TW, 'Z', f, 1,  6, this._zoom,  (v) => { this._zoom = v; this._char.setScale(v); });
        this._speedSlider = this._mkSlider(SLDR_LX, SLDR_Y2, SLDR_TW, 'S', f, 1, 24, this._speed, (v) => this._setSpeed(v));
        this._frameSlider = this._mkSlider(SLDR_LX, SLDR_Y3, SLDR_TW, 'F', f, 0,  8, 0,           (v) => this._onFrameSlider(v));

        // ── Preview ───────────────────────────────────────────────────
        this.add.text(RP_CX, f(6), 'PREVIEW', {
            font: `${f(8)}px monospace`, fill: '#1a0830',
        }).setOrigin(0.5, 0);
        this._char = this._renderer.create(RP_CX, RP_CY, this._buildConfig());
        this._char.setScale(this._zoom);
        if (this._presetSlots) this.time.delayedCall(100, () => this._reapplyPaletteSwaps(true));

        // ── Back / Reset / Randomize ──────────────────────────────────
        const mkLpBtn = (x, label, fill, cb) => {
            const btn = this.add.text(x, h - f(4), label, {
                font: `${f(9)}px monospace`, fill,
            }).setOrigin(0.5, 1);
            const px = f(10), py = f(7);
            btn.setInteractive({
                useHandCursor: true,
                hitArea: new Phaser.Geom.Rectangle(-px, -btn.height - py, btn.width + px * 2, btn.height + py * 2),
                hitAreaCallback: Phaser.Geom.Rectangle.Contains,
            });
            btn.on('pointerover', () => btn.setStyle({ fill: '#ffffff' }));
            btn.on('pointerout',  () => btn.setStyle({ fill }));
            btn.on('pointerdown', cb);
        };
        mkLpBtn(LP_W * 0.15, '← BACK',   '#776655', () => this._back());
        mkLpBtn(LP_W * 0.50, 'RESET',     '#aa5533', () => this._resetCharacter());
        mkLpBtn(LP_W * 0.82, 'RANDOMIZE', '#33aa77', () => this._randomizeCharacter());

        // ── Export buttons (right panel) ──────────────────────────────
        const mkExport = (x, label, cb) => {
            const btn = this.add.text(x, h - f(4), label, {
                font: `${f(9)}px monospace`, fill: '#ff8833',
            }).setOrigin(0.5, 1);
            const px = f(10), py = f(7);
            btn.setInteractive({
                useHandCursor: true,
                hitArea: new Phaser.Geom.Rectangle(-px, -btn.height - py, btn.width + px * 2, btn.height + py * 2),
                hitAreaCallback: Phaser.Geom.Rectangle.Contains,
            });
            btn.on('pointerover', () => btn.setStyle({ fill: '#ffffff' }));
            btn.on('pointerout',  () => btn.setStyle({ fill: '#ff8833' }));
            btn.on('pointerdown', cb);
        };
        mkExport(RP_CX - f(60), 'PRESETS',  () => this._openPresetPanel());
        mkExport(RP_CX - f(20), 'SAVE',     () => this._exportCharacter());
        mkExport(RP_CX + f(18), 'SHEET',    () => this._exportSpritesheet());
        mkExport(RP_CX + f(54), 'LICENSES', () => this._exportLicenses());

        // Defensive: with the manifest we only request files that exist, but a
        // legacy preset/save lacking `anims` could still ask for a missing sheet.
        // Swallow those quietly so they don't drown out real load errors.
        this.load.on('loaderror', (file) => {
            if (file?.key?.startsWith?.('lpc__')) return;
        });

        this.input.keyboard.on('keydown-ESC',   () => this._back());
        this.input.keyboard.on('keydown-SPACE', () => this._togglePlay());
        this._gpNav = new GamepadNav(this);
        this.cameras.main.fadeIn(200);
    }

    // ── Tab control ──────────────────────────────────────────────────

    _switchTab(newTab) {
        this._closeSwatchPicker();
        this._activeTab = newTab;
        for (const [tab, objs] of Object.entries(this._tabObjects)) {
            const show = tab === newTab;
            for (const obj of objs) {
                obj.setVisible(show);
                if (obj.input) obj.input.enabled = show;
            }
        }
        this._updateTabBtns();
        // Re-evaluate conditional row visibility after the bulk setVisible pass
        if (TAB_COLS[newTab]) {
            for (const col of TAB_COLS[newTab]) {
                for (const type of col) {
                    this._updateColorRow(type);
                    this._updateTintRow(type);
                }
            }
        }
        this._gpRefreshRows();
    }

    // ── Gamepad navigation ───────────────────────────────────────────────
    // dpad ↑/↓ moves the focused part row, ←/→ cycles that part (reaches every
    // option without popups), A/X = next/prev colour-or-tint, Y = remove,
    // LB/RB = switch tab, B = back (or close picker), Start = save.

    _gpRefreshRows() {
        const cols = TAB_COLS[this._activeTab];
        this._gpRows = cols ? [...cols[0], ...cols[1]] : [];
        this._gpRowIdx = Math.min(this._gpRowIdx ?? 0, Math.max(0, this._gpRows.length - 1));
        this._gpDrawHighlight();
    }

    _gpDrawHighlight() {
        if (!this._gpHL) this._gpHL = this.add.graphics().setDepth(120);
        this._gpHL.clear();
        if (!this.input.gamepad?.total) return;   // only show the focus box with a controller
        const type = this._gpRows?.[this._gpRowIdx];
        const r = type && this._gpRowRects[type];
        if (!r) return;
        this._gpHL.lineStyle(Math.max(1, this._f(2)), 0xffcc44, 1).strokeRect(r.x, r.y, r.w, r.h);
    }

    _gpCycleColorTint(type, dir) {
        const opt = CATALOGUE[type]?.[this._sel[type]];
        if (!opt?.id) return;
        if (opt.colors?.length > 1 && !FORCE_TINT_TYPES.has(type)) this._cycleColor(type, dir);
        else if (TINT_MATERIAL[type]) this._cycleTint(type, dir);
    }

    update(time, delta) {
        const gp = this._gpNav.poll(delta);
        if (!gp) return;

        // A picker popup is open → B closes it; ignore row nav underneath.
        if (this._swatchPicker || this._presetPanel) {
            if (gp.B) { this._closeSwatchPicker(); this._closePresetPanel?.(); }
            return;
        }

        if (gp.B)     { this._back(); return; }
        if (gp.start) { this._exportCharacter(); return; }
        if (gp.LB)    { this._switchTab(TABS[(TABS.indexOf(this._activeTab) - 1 + TABS.length) % TABS.length]); return; }
        if (gp.RB)    { this._switchTab(TABS[(TABS.indexOf(this._activeTab) + 1) % TABS.length]); return; }

        this._gpDrawHighlight();   // keep the focus box visible/tracking while a pad is connected
        if (!this._gpRows?.length) return;
        if (gp.up)   this._gpRowIdx = (this._gpRowIdx - 1 + this._gpRows.length) % this._gpRows.length;
        if (gp.down) this._gpRowIdx = (this._gpRowIdx + 1) % this._gpRows.length;
        if (gp.up || gp.down) this._gpDrawHighlight();

        const type = this._gpRows[this._gpRowIdx];
        if (gp.left)  this._cycleLayer(type, -1);
        if (gp.right) this._cycleLayer(type, +1);
        if (gp.A)     this._gpCycleColorTint(type, +1);
        if (gp.X)     this._gpCycleColorTint(type, -1);
        if (gp.Y)     this._removeLayer(type);
    }

    _updateTabBtns() {
        for (const [tab, { bg, lbl }] of Object.entries(this._tabBtns)) {
            const active = tab === this._activeTab;
            bg.setFillStyle(active ? 0x552200 : 0x1a1a1a);
            lbl.setStyle({ fill: active ? '#ffcc88' : '#666655' });
        }
    }

    // ── Cell builder ──────────────────────────────────────────────────

    _mkCell(gfx, baseX, cy, colW, rowH, type, rowIdx, f, S, tabObjs, isLast = false) {
        const push = (obj) => { tabObjs.push(obj); return obj; };

        // Remember the row's screen rect for gamepad focus highlighting.
        (this._gpRowRects ??= {})[type] = { x: baseX, y: cy - rowH / 2, w: colW, h: rowH };

        const color      = GROUP_COLOR[type];
        const colorNum   = Phaser.Display.Color.HexStringToColor(color).color;
        const opt        = CATALOGUE[type]?.[this._sel[type]] ?? { id: null, label: 'None' };
        const active     = !!opt.id;
        const isColorT   = !FORCE_TINT_TYPES.has(type) && (CATALOGUE[type]?.some(e => e.colors?.length > 0) ?? false);
        const isTintT    = !!TINT_MATERIAL[type];
        const isOptional = OPTIONAL_TYPES.has(type);

        const itemY  = (isColorT || isTintT) ? cy - Math.round(rowH * 0.20) : cy;
        const colorY = cy + Math.round(rowH * 0.28);

        if (rowIdx % 2 === 0) {
            push(this.add.rectangle(baseX + colW / 2, cy, colW, rowH - 1, 0x161616, 0.5).setOrigin(0.5));
        }

        const bar = push(this.add.rectangle(baseX + 1, cy, f(2), rowH - f(2), active ? colorNum : 0x181818).setOrigin(0, 0.5));
        this._bars[type] = bar;

        const CAT_W  = f(36);
        const catLbl = push(this.add.text(baseX + f(5), itemY, TYPE_LABEL[type], {
            font: `bold ${f(8)}px monospace`, fill: active ? color : '#444433',
        }).setOrigin(0, 0.5));
        this._catLabels[type] = catLbl;

        // ✕ remove button
        const xBtnW = isOptional ? f(13) : 0;
        if (isOptional) {
            const xBtn = push(this.add.text(baseX + colW - f(3), itemY, '×', {
                font: `bold ${f(11)}px monospace`, fill: active ? '#664422' : '#443322',
            }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true }));
            xBtn.on('pointerover', () => xBtn.setStyle({ fill: '#ff4466' }));
            xBtn.on('pointerout',  () => xBtn.setStyle({ fill: this._sel[type] ? '#664422' : '#443322' }));
            xBtn.on('pointerdown', () => this._removeLayer(type));
            this._bars[`${type}_xbtn`] = xBtn;
        }

        const ARW    = f(15);
        const prevX  = baseX + f(4) + CAT_W + ARW / 2;
        const nextX  = baseX + colW - ARW / 2 - f(3) - xBtnW;
        const nameCX = (prevX + ARW / 2 + nextX - ARW / 2) / 2;
        const maxCh  = Math.max(5, Math.floor((nextX - ARW / 2 - prevX - ARW / 2) / f(7)));

        const nameLbl = push(this.add.text(nameCX, itemY, trunc(opt.label.toUpperCase(), maxCh), {
            font: `bold ${f(9)}px monospace`, fill: active ? '#ff8833' : '#333333',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true }));
        nameLbl.on('pointerover', () => nameLbl.setStyle({ fill: active ? '#ffffff' : '#5533aa' }));
        nameLbl.on('pointerout',  () => nameLbl.setStyle({ fill: this._sel[type] ? '#ff8833' : '#333333' }));
        nameLbl.on('pointerdown', () => this._openPartPicker(type));
        this._pickerLabels[type] = nameLbl;

        const mkArrow = (x, lbl, dir) => {
            const btn = push(this.add.text(x, itemY, lbl, {
                font: `bold ${f(11)}px monospace`, fill: color,
            }).setOrigin(0.5).setInteractive({ useHandCursor: true }));
            btn.on('pointerover', () => btn.setStyle({ fill: '#ffffff' }));
            btn.on('pointerout',  () => btn.setStyle({ fill: color }));
            btn.on('pointerdown', () => this._cycleLayer(type, dir));
        };
        mkArrow(prevX, '◄', -1);
        mkArrow(nextX, '►', +1);

        // Color sub-row
        if (isColorT) {
            const colors    = opt.colors ?? [];
            const hasColors = active && colors.length > 1;
            const colorStr  = colors[this._colorSel[type] ?? 0] ?? '';
            const swatchHex = COLOR_SWATCH_HEX[colorStr] ?? 0x554477;
            const cpPrevX   = baseX + f(6) + CAT_W;
            const cpNextX   = baseX + colW - f(6) - xBtnW;
            const swatchW   = f(12);
            const textCX    = (cpPrevX + cpNextX) / 2 + swatchW / 2 + f(2);

            const cpPrev   = push(this.add.text(cpPrevX, colorY, '◄', { font: `${f(10)}px monospace`, fill: '#666655' }).setOrigin(0.5).setVisible(hasColors));
            const cpNext   = push(this.add.text(cpNextX, colorY, '►', { font: `${f(10)}px monospace`, fill: '#666655' }).setOrigin(0.5).setVisible(hasColors));
            const cpSwatch = push(this.add.rectangle(textCX - swatchW / 2 - f(2), colorY, swatchW, f(7), swatchHex).setOrigin(0.5).setVisible(hasColors));
            const cpLabel  = push(this.add.text(textCX, colorY, colorStr.toUpperCase().replace(/_/g, ' '), { font: `${f(7)}px monospace`, fill: '#aa7733' }).setOrigin(0, 0.5).setVisible(hasColors));

            cpPrev.on('pointerover', () => cpPrev.setStyle({ fill: '#ffffff' }));
            cpPrev.on('pointerout',  () => cpPrev.setStyle({ fill: '#666655' }));
            cpNext.on('pointerover', () => cpNext.setStyle({ fill: '#ffffff' }));
            cpNext.on('pointerout',  () => cpNext.setStyle({ fill: '#666655' }));
            cpPrev.on('pointerdown', () => this._cycleColor(type, -1));
            cpNext.on('pointerdown', () => this._cycleColor(type, +1));
            cpSwatch.on('pointerdown', () => this._openSwatchPicker(type, false));
            cpLabel.on('pointerdown',  () => this._openSwatchPicker(type, false));
            if (hasColors) {
                cpPrev.setInteractive({ useHandCursor: true });
                cpNext.setInteractive({ useHandCursor: true });
                cpSwatch.setInteractive({ useHandCursor: true });
                cpLabel.setInteractive({ useHandCursor: true });
            }
            this._colorRows[type] = { prev: cpPrev, next: cpNext, label: cpLabel, swatch: cpSwatch };
        }

        // Tint sub-row — palette-based tinting for types with no colour-variant files
        if (isTintT) {
            const palette  = TINT_PALETTE[this._itemTintMaterial(type)];
            const tintIdx  = this._tintSel[type] ?? 0;
            const tint     = palette[tintIdx];
            const show     = active && (!opt.colors?.length || FORCE_TINT_TYPES.has(type));
            const cpPrevX  = baseX + f(6) + CAT_W;
            const cpNextX  = baseX + colW - f(6) - xBtnW;
            const cpCX     = (cpPrevX + cpNextX) / 2;

            const cpPrev   = push(this.add.text(cpPrevX, colorY, '◄', { font: `${f(10)}px monospace`, fill: '#666655' }).setOrigin(0.5).setVisible(show));
            const cpNext   = push(this.add.text(cpNextX, colorY, '►', { font: `${f(10)}px monospace`, fill: '#666655' }).setOrigin(0.5).setVisible(show));
            const swatchW  = f(12);
            const cpSwatch = push(this.add.rectangle(cpCX - swatchW / 2 - f(2), colorY, swatchW, f(7), tint.hex).setOrigin(0.5).setVisible(show));
            const cpLabel  = push(this.add.text(cpCX + f(4), colorY, tint.name.toUpperCase(), { font: `${f(7)}px monospace`, fill: '#aa7733' }).setOrigin(0, 0.5).setVisible(show));

            cpPrev.on('pointerover', () => cpPrev.setStyle({ fill: '#ffffff' }));
            cpPrev.on('pointerout',  () => cpPrev.setStyle({ fill: '#666655' }));
            cpNext.on('pointerover', () => cpNext.setStyle({ fill: '#ffffff' }));
            cpNext.on('pointerout',  () => cpNext.setStyle({ fill: '#666655' }));
            cpPrev.on('pointerdown', () => this._cycleTint(type, -1));
            cpNext.on('pointerdown', () => this._cycleTint(type, +1));
            cpSwatch.on('pointerdown', () => this._openSwatchPicker(type, true));
            cpLabel.on('pointerdown',  () => this._openSwatchPicker(type, true));
            if (show) {
                cpPrev.setInteractive({ useHandCursor: true });
                cpNext.setInteractive({ useHandCursor: true });
                cpSwatch.setInteractive({ useHandCursor: true });
                cpLabel.setInteractive({ useHandCursor: true });
            }
            this._tintRows[type] = { prev: cpPrev, next: cpNext, swatch: cpSwatch, label: cpLabel };
        }

        if (!isLast) {
            gfx.lineStyle(1, 0x1e1e1e);
            gfx.lineBetween(baseX + f(2), cy + rowH / 2, baseX + colW - f(2), cy + rowH / 2);
        }
    }

    // ── Layer helpers ─────────────────────────────────────────────────

    _getColor(type) {
        const opt = CATALOGUE[type]?.[this._sel[type]];
        if (!opt?.colors?.length) return opt?.color;
        if (FORCE_TINT_TYPES.has(type)) return FORCE_TINT_BASE;
        return opt.colors[this._colorSel[type] ?? 0];
    }

    _currentLayers(type) {
        const opt = CATALOGUE[type]?.[this._sel[type]];
        if (!opt?.id) return [];
        const rt    = opt.renderType ?? rType(type);
        const color = this._getColor(type);
        const layers = [{ type: rt, id: opt.id, zPos: opt.zPos ?? DEFAULT_ZPOS[rt] ?? 0, color, itemName: opt.itemName, anims: opt.anims }];
        for (const c of opt.companions ?? []) {
            layers.push({ type: rt, id: c.id, zPos: c.zPos ?? DEFAULT_ZPOS[rt] ?? 0,
                color: c.color ?? (opt.colors ? color : undefined),
                itemName: c.itemName, anims: c.anims });
        }
        return layers;
    }

    _buildConfig() {
        const layers = [];
        for (const type of ALL_TYPES) {
            for (const l of this._currentLayers(type)) layers.push(l);
        }
        return { layers, animations: DEFAULT_ANIMS, defaultAnim: 'walk', defaultDir: 'down' };
    }

    // ── Layer cycling ───────────────────────────────────────────────────

    _cycleLayer(type, delta) {
        const list   = CATALOGUE[type] ?? [];
        const newIdx = (this._sel[type] + delta + list.length) % list.length;
        this._selectPart(type, newIdx);
    }

    _selectPart(type, newIdx) {
        if (this._loadingTypes.has(type)) return;
        const list   = CATALOGUE[type] ?? [];
        const oldOpt = list[this._sel[type]];
        const newOpt = list[newIdx];
        if (!newOpt) return;

        this._sel[type] = newIdx;
        // Keep current color index if the new item has at least that many colors; otherwise clamp
        const prevColorIdx   = this._colorSel[type] ?? 0;
        const newColorCount  = newOpt?.colors?.length ?? 0;
        this._colorSel[type] = newColorCount > 0 ? Math.min(prevColorIdx, newColorCount - 1) : 0;

        if (!newOpt.id) {
            this._updateCell(type, null);
            this._removeTypeFromChar(type, oldOpt);
            return;
        }

        const layers    = this._currentLayers(type);
        const allLoaded = layers.every(l => this._renderer.isLayerLoaded(l, DEFAULT_ANIMS));

        const applyChange = () => {
            this._loadingTypes.delete(type);
            this._updateCell(type, newOpt);
            this._applyLayerChange(type, oldOpt, layers);
        };

        if (!allLoaded) {
            this._loadingTypes.add(type);
            this._updateCell(type, '...');
            this._renderer.loadLayers(layers, DEFAULT_ANIMS, applyChange);
        } else {
            applyChange();
        }
    }

    _removeLayer(type) {
        if (this._loadingTypes.has(type)) return;
        const oldOpt = CATALOGUE[type]?.[this._sel[type]];
        if (!oldOpt?.id) return;
        this._sel[type]      = 0;
        this._colorSel[type] = 0;
        this._updateCell(type, null);
        this._removeTypeFromChar(type, oldOpt);
    }

    _cycleColor(type, delta) {
        if (this._loadingTypes.has(type)) return;
        const opt    = CATALOGUE[type]?.[this._sel[type]];
        const colors = opt?.colors;
        if (!colors?.length || !opt.id) return;
        const n = colors.length;
        this._applyColorIdx(type, ((this._colorSel[type] ?? 0) + delta + n) % n);
    }

    _applyColorIdx(type, idx) {
        if (this._loadingTypes.has(type)) return;
        this._colorSel[type] = idx;

        const layers    = this._currentLayers(type);
        const allLoaded = layers.every(l => this._renderer.isLayerLoaded(l, DEFAULT_ANIMS));

        const applyColor = () => {
            this._loadingTypes.delete(type);
            for (const l of layers) {
                const key = layerKey(l);
                if (this._char._lpcLayers[key]) this._renderer.replaceLayer(this._char, key, l);
            }
            this._updateColorRow(type);
            if (this._playing) { this._renderer.play(this._char, ANIMS[this._animIdx], DIRS[this._dirIdx]); this._applySpeed(); this._reapplyPaletteSwaps(); }
            else this._renderer.freezeFrame(this._char, this._frameIdx);
        };

        if (!allLoaded) {
            this._loadingTypes.add(type);
            const row = this._colorRows[type];
            if (row) row.label.setText('...');
            this._renderer.loadLayers(layers, DEFAULT_ANIMS, applyColor);
        } else {
            applyColor();
        }
    }

    _updateCell(type, optOrStr) {
        const color    = GROUP_COLOR[type];
        const loading  = typeof optOrStr === 'string';
        const active   = !loading && optOrStr !== null;
        const colorNum = Phaser.Display.Color.HexStringToColor(color).color;

        const nameLbl = this._pickerLabels[type];
        const catLbl  = this._catLabels[type];
        const bar     = this._bars[type];
        const xBtn    = this._bars[`${type}_xbtn`];

        if (loading) {
            nameLbl?.setText('...');
            nameLbl?.setStyle({ fill: '#443322' });
        } else if (active) {
            nameLbl?.setText(trunc(optOrStr.label.toUpperCase()));
            nameLbl?.setStyle({ fill: '#ff8833' });
            catLbl?.setStyle({ fill: color });
            bar?.setFillStyle(colorNum);
            xBtn?.setStyle({ fill: '#664422' });
        } else {
            nameLbl?.setText('NONE');
            nameLbl?.setStyle({ fill: '#333333' });
            catLbl?.setStyle({ fill: '#444433' });
            bar?.setFillStyle(0x181818);
            xBtn?.setStyle({ fill: '#443322' });
        }

        this._updateColorRow(type);
        this._updateTintRow(type);
    }

    _isTypeTabActive(type) {
        const cols = TAB_COLS[this._activeTab];
        return !!cols && cols.some(col => col.includes(type));
    }

    _updateColorRow(type) {
        const row = this._colorRows[type];
        if (!row) return;
        const opt    = CATALOGUE[type]?.[this._sel[type]];
        const colors = opt?.colors;
        const show   = !!(opt?.id && colors?.length > 1 && !FORCE_TINT_TYPES.has(type));
        row.prev.setVisible(show);
        row.next.setVisible(show);
        row.label.setVisible(show);
        if (row.swatch) row.swatch.setVisible(show);
        if (show && this._isTypeTabActive(type)) {
            row.prev.setInteractive({ useHandCursor: true });
            row.next.setInteractive({ useHandCursor: true });
            row.label.setInteractive({ useHandCursor: true });
            if (row.swatch) row.swatch.setInteractive({ useHandCursor: true });
            const colorStr = colors[this._colorSel[type] ?? 0] ?? '';
            row.label.setText(colorStr.toUpperCase().replace(/_/g, ' '));
            if (row.swatch) row.swatch.setFillStyle(COLOR_SWATCH_HEX[colorStr] ?? 0x554477);
        } else {
            row.prev.disableInteractive();
            row.next.disableInteractive();
            row.label.disableInteractive();
            if (row.swatch) row.swatch.disableInteractive();
        }
    }

    /** Returns the display palette key ('body' for almost everything, or per-entry override key) */
    _itemTintMaterial(type) {
        const opt = CATALOGUE[type]?.[this._sel[type]];
        return opt?.tintMaterial ?? TINT_MATERIAL[type] ?? null;
    }

    _cycleTint(type, delta) {
        const palette = TINT_PALETTE[this._itemTintMaterial(type)];
        if (!palette) return;
        const n = palette.length;
        this._tintSel[type] = ((this._tintSel[type] ?? 0) + delta + n) % n;
        this._applyTintForType(type);
        this._updateTintRow(type);
        // Keep head skin in sync with body skin automatically
        if (type === 'body') this._syncHeadSkin();
    }

    // ── Swatch picker popup ───────────────────────────────────────────────

    _openSwatchPicker(type, isTint) {
        this._closeSwatchPicker();

        const f  = this._f;
        const LP = this._SPLIT;

        // Build swatch list
        let swatches, current;
        if (isTint) {
            const mat = this._itemTintMaterial(type);
            const pal = TINT_PALETTE[mat];
            if (!pal) return;
            swatches = pal.map((e, i) => ({ idx: i, hex: e.hex, name: e.name }));
            current  = this._tintSel[type] ?? 0;
        } else {
            const opt    = CATALOGUE[type]?.[this._sel[type]];
            const colors = opt?.colors ?? [];
            if (!colors.length) return;
            swatches = colors.map((c, i) => ({ idx: i, hex: COLOR_SWATCH_HEX[c] ?? 0x554477, name: c.replace(/_/g, ' ') }));
            current  = this._colorSel[type] ?? 0;
        }

        // Anchor to the row's swatch Y
        const row      = isTint ? this._tintRows[type] : this._colorRows[type];
        const anchorY  = row?.swatch?.y ?? 100;

        const COLS  = 5;
        const SW    = f(22), SH = f(14), GAP = f(2);
        const PM    = f(6);
        const PW    = LP - PM * 2;
        const rows  = Math.ceil(swatches.length / COLS);
        const PH    = f(14) + rows * (SH + GAP) + PM;
        let   py    = anchorY + f(10);
        if (py + PH > this._h - f(22)) py = anchorY - PH - f(4);

        // Full-panel transparent overlay catches outside clicks
        const overlay = this.add.rectangle(0, 0, LP, this._h, 0x000000, 0.55)
            .setOrigin(0).setDepth(300).setInteractive();
        overlay.on('pointerdown', () => this._closeSwatchPicker());

        const panel = this.add.container(0, 0).setDepth(301);

        // Background + border
        const bg = this.add.graphics();
        bg.fillStyle(0x111111, 0.97);
        bg.fillRect(PM, py, PW, PH);
        bg.lineStyle(1, 0x442211);
        bg.strokeRect(PM, py, PW, PH);
        panel.add(bg);

        panel.add(this.add.text(LP / 2, py + f(4), isTint ? 'PALETTE' : 'COLOR', {
            font: `bold ${f(7)}px monospace`, fill: '#885522',
        }).setOrigin(0.5, 0));

        const colW = Math.floor((PW - GAP) / COLS);

        swatches.forEach(({ idx, hex, name }) => {
            const col = idx % COLS;
            const row = Math.floor(idx / COLS);
            const sx  = PM + col * (colW + GAP);
            const sy  = py + f(13) + row * (SH + GAP);
            const sel = idx === current;

            const cell = this.add.rectangle(sx + colW / 2, sy + SH / 2, colW, SH, sel ? 0x662200 : 0x141414)
                .setOrigin(0.5).setInteractive({ useHandCursor: true });
            const dot = this.add.rectangle(sx + f(3), sy + SH / 2, SH - f(2), SH - f(4), hex).setOrigin(0, 0.5);
            const lbl = this.add.text(sx + SH + f(2), sy + SH / 2, name.toUpperCase(), {
                font: `${f(6)}px monospace`, fill: sel ? '#ffffff' : '#887766',
            }).setOrigin(0, 0.5);

            cell.on('pointerover', () => { if (!sel) { cell.setFillStyle(0x221100); lbl.setStyle({ fill: '#ddbb88' }); } });
            cell.on('pointerout',  () => { if (!sel) { cell.setFillStyle(0x141414); lbl.setStyle({ fill: '#887766' }); } });
            cell.on('pointerdown', () => {
                this._closeSwatchPicker();
                if (isTint) {
                    this._tintSel[type] = idx;
                    this._applyTintForType(type);
                    this._updateTintRow(type);
                    if (type === 'body') this._syncHeadSkin();
                } else {
                    this._applyColorIdx(type, idx);
                }
            });
            panel.add([cell, dot, lbl]);
        });

        this.children.add(overlay);
        this.children.add(panel);
        this._swatchPicker = { panel, overlay };
    }

    _closeSwatchPicker() {
        if (!this._swatchPicker) return;
        const { panel, overlay } = this._swatchPicker;
        if (panel._wheelHandler) this.input.off('wheel',        panel._wheelHandler);
        if (panel._moveHandler)  this.input.off('pointermove',  panel._moveHandler);
        if (panel._upHandler)    this.input.off('pointerup',    panel._upHandler);
        if (panel._scrollMask)   panel._scrollMask.destroy();
        panel.destroy(true);
        overlay.destroy();
        this._swatchPicker = null;
    }

    _openPartPicker(type) {
        this._closeSwatchPicker();

        const f       = this._f;
        const LP      = this._SPLIT;
        const h       = this._h;
        const entries = CATALOGUE[type] ?? [];
        const current = this._sel[type] ?? 0;

        const anchorY = this._pickerLabels[type]?.y ?? 100;

        const COLS     = 2;
        const SH       = f(14);
        const GAP      = f(2);
        const PM       = f(6);
        const SBW      = f(5);
        const SB_GAP   = f(2);
        const HEADER_H = f(14);

        const PW          = LP - PM * 2;
        const nRows       = Math.ceil(entries.length / COLS);
        const fullContentH = nRows * (SH + GAP);
        const MAX_VIS_H   = h - f(50);
        const needsScroll = fullContentH > MAX_VIS_H;
        const visibleH    = needsScroll ? MAX_VIS_H : fullContentH;
        const colW        = Math.floor((PW - GAP - (needsScroll ? SBW + SB_GAP : 0)) / COLS);
        const PH          = HEADER_H + visibleH + PM;

        let py = anchorY + f(10);
        if (py + PH > h - f(22)) py = anchorY - PH - f(4);
        if (py < f(4)) py = f(4);

        const contentX = PM;
        const contentY = py + HEADER_H;

        const overlay = this.add.rectangle(0, 0, LP, h, 0x000000, 0.55)
            .setOrigin(0).setDepth(300).setInteractive();
        overlay.on('pointerdown', () => this._closeSwatchPicker());

        const panel = this.add.container(0, 0).setDepth(301);

        const bg = this.add.graphics();
        bg.fillStyle(0x111111, 0.97);
        bg.fillRect(PM, py, PW, PH);
        bg.lineStyle(1, 0x442211);
        bg.strokeRect(PM, py, PW, PH);
        panel.add(bg);

        panel.add(this.add.text(LP / 2, py + f(4), TYPE_LABEL[type], {
            font: `bold ${f(7)}px monospace`, fill: GROUP_COLOR[type] ?? '#885522',
        }).setOrigin(0.5, 0));

        // Scrollable items container — shifted vertically to scroll
        const itemsCont = this.add.container(0, 0);

        entries.forEach((opt, idx) => {
            const col  = idx % COLS;
            const row  = Math.floor(idx / COLS);
            const sx   = contentX + col * (colW + GAP);
            const sy   = contentY + row * (SH + GAP);
            const sel  = idx === current;
            const none = !opt.id;

            const cell = this.add.rectangle(sx + colW / 2, sy + SH / 2, colW, SH,
                sel ? 0x662200 : 0x141414).setOrigin(0.5).setInteractive({ useHandCursor: true });
            const lbl  = this.add.text(sx + f(4), sy + SH / 2,
                opt.label.toUpperCase(), {
                    font: `${f(7)}px monospace`,
                    fill: sel ? '#ffffff' : none ? '#3a2255' : '#887766',
                }).setOrigin(0, 0.5);

            cell.on('pointerover', () => { if (!sel) { cell.setFillStyle(0x221100); lbl.setStyle({ fill: '#ddbb88' }); } });
            cell.on('pointerout',  () => { if (!sel) { cell.setFillStyle(0x141414); lbl.setStyle({ fill: none ? '#3a2255' : '#887766' }); } });
            cell.on('pointerdown', () => {
                this._closeSwatchPicker();
                this._selectPart(type, idx);
            });
            itemsCont.add([cell, lbl]);
        });

        panel.add(itemsCont);

        if (needsScroll) {
            // Geometry mask clips items to the visible viewport
            const maskGfx = this.make.graphics({ add: false });
            maskGfx.fillRect(contentX, contentY, PW - SBW - SB_GAP, visibleH);
            itemsCont.setMask(maskGfx.createGeometryMask());
            panel._scrollMask = maskGfx;

            // Invisible blockers absorb clicks on items that have scrolled out of view
            // (Phaser masks don't clip hit boxes)
            const topBlock = this.add.rectangle(
                contentX + (PW - SBW) / 2, py + HEADER_H / 2,
                PW - SBW, HEADER_H, 0x000000, 0,
            ).setOrigin(0.5).setInteractive();
            const botBlock = this.add.rectangle(
                contentX + (PW - SBW) / 2, contentY + visibleH + PM / 2,
                PW - SBW, PM + f(4), 0x000000, 0,
            ).setOrigin(0.5).setInteractive();
            panel.add([topBlock, botBlock]);

            // Scrollbar track
            const SBX = PM + PW - SBW;
            const sbTrack = this.add.graphics();
            sbTrack.fillStyle(0x120828, 1);
            sbTrack.fillRect(SBX, contentY, SBW, visibleH);
            sbTrack.lineStyle(1, 0x2e2e2e);
            sbTrack.strokeRect(SBX, contentY, SBW, visibleH);
            panel.add(sbTrack);

            const maxScroll = fullContentH - visibleH;
            const thumbH    = Math.max(f(8), Math.floor(visibleH * visibleH / fullContentH));
            const thumbTravelH = visibleH - thumbH;

            // Auto-scroll to show current selection
            const selRow = Math.floor(current / COLS);
            const selItemY = selRow * (SH + GAP);
            let scrollOffset = selItemY + SH > visibleH
                ? Phaser.Math.Clamp(selItemY - Math.floor(visibleH / 2), 0, maxScroll)
                : 0;

            const thumb = this.add.rectangle(SBX + SBW / 2, contentY, SBW - f(1), thumbH, 0x6633aa)
                .setOrigin(0.5, 0);
            panel.add(thumb);

            const applyScroll = (offset) => {
                scrollOffset = Phaser.Math.Clamp(offset, 0, maxScroll);
                itemsCont.y  = -scrollOffset;
                thumb.y      = contentY + (maxScroll > 0 ? (scrollOffset / maxScroll) * thumbTravelH : 0);
            };
            applyScroll(scrollOffset);

            // Mouse wheel
            const wheelHandler = (_ptr, _obs, _dx, deltaY) => applyScroll(scrollOffset + deltaY * 0.5);
            this.input.on('wheel', wheelHandler);
            panel._wheelHandler = wheelHandler;

            // Thumb drag via pointer events
            let dragging = false, dragStartY = 0, dragStartOffset = 0;
            thumb.setInteractive({ useHandCursor: true });
            thumb.on('pointerdown', (ptr) => {
                dragging = true;
                dragStartY = ptr.y;
                dragStartOffset = scrollOffset;
            });
            const moveHandler = (ptr) => {
                if (!dragging) return;
                applyScroll(dragStartOffset + ((ptr.y - dragStartY) / thumbTravelH) * maxScroll);
            };
            const upHandler = () => { dragging = false; };
            this.input.on('pointermove', moveHandler);
            this.input.on('pointerup',   upHandler);
            panel._moveHandler = moveHandler;
            panel._upHandler   = upHandler;
        }

        this.children.add(overlay);
        this.children.add(panel);
        this._swatchPicker = { panel, overlay };
    }

    _syncHeadSkin() {
        // Only sync types that use the body skin palette (not fur/green/etc.)
        for (const t of ['head', 'ears']) {
            if (this._itemTintMaterial(t) !== 'body') continue;
            this._tintSel[t] = this._tintSel['body'] ?? 0;
            this._applyTintForType(t);
            this._updateTintRow(t);
        }
    }

    _applyPaletteSwap(type) {
        const opt = CATALOGUE[type]?.[this._sel[type]];
        if (!opt?.id) return;
        if (opt?.colors?.length && !FORCE_TINT_TYPES.has(type)) return;
        const matKey  = this._itemTintMaterial(type);
        const palette = TINT_PALETTE[matKey];
        if (!palette) return;
        const entry   = palette[this._tintSel[type] ?? 0];
        const dir     = DIRS[this._dirIdx];
        const anim    = ANIMS[this._animIdx];

        const swap = entry.shades ? swapColors(type, opt, entry) : null;

        // Match only the exact layers that belong to this UI slot, not the whole render-type bucket.
        // This prevents body and tail (both render-type 'body') from overwriting each other's colours.
        const ownKeys = new Set(this._currentLayers(type).map(l => layerKey(l)));

        for (const [key, lpcEntry] of Object.entries(this._char._lpcLayers)) {
            if (!ownKeys.has(key)) continue;
            const sprite  = lpcEntry.sprite;
            const curAnim = lpcEntry.anim ?? anim;

            if (!entry.shades) {
                // Natural: restore original animation
                const origKey    = texKey(lpcEntry.layer, curAnim);
                const origAnim   = `${origKey}_${dir}`;
                if (this.anims.exists(origAnim)) sprite.play(origAnim, true);
                sprite.clearTint();
            } else {
                this._swapSpriteTexture(sprite, lpcEntry.layer, curAnim, dir, swap, entry);
            }
        }
    }

    _swapSpriteTexture(sprite, layer, animName, dir, swap, paletteEntry) {
        const scene   = this;  // CharacterCreatorScene IS the Phaser scene
        const origKey = texKey(layer, animName);
        const safe    = paletteEntry.name.replace(/\s+/g, '_');
        const rcKey   = `${origKey}__rc_${swap.sourceKey}_${safe}`;

        if (!scene.textures.exists(rcKey)) {
            const tex = scene.textures.get(origKey);
            if (!tex || tex.key === '__MISSING') return;

            const w = tex.source[0].width, h = tex.source[0].height;
            const canvas = document.createElement('canvas');
            canvas.width = w; canvas.height = h;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(tex.source[0].image, 0, 0);

            const imgData = ctx.getImageData(0, 0, w, h);
            remapPixels(imgData.data, swap.sourceColors, swap.targetShades);

            ctx.putImageData(imgData, 0, 0);
            scene.textures.addCanvas(rcKey, canvas);

            // Register frames at the source sheet's real frame size (oversize-safe),
            // not a hardcoded 64px grid. ensureTextureAnims patches the orig first.
            this._renderer.ensureTextureAnims(origKey, animName);
            registerSheetFrames(scene.textures.get(rcKey),
                tex.customData?.frameW ?? 64, tex.customData?.frameH ?? 64);
        }

        this._renderer.ensureTextureAnims(rcKey, animName);
        const rcAnim = `${rcKey}_${dir}`;
        if (scene.anims.exists(rcAnim)) {
            sprite.play(rcAnim, true);
            // Register so CharacterRenderer.play() uses the swapped key automatically
            const lpcEntry = Object.values(this._char._lpcLayers).find(e => e.sprite === sprite);
            if (lpcEntry) {
                lpcEntry.swappedKeys        = lpcEntry.swappedKeys ?? {};
                lpcEntry.swappedKeys[animName] = rcKey;
            }
        }
    }

    _reapplyPaletteSwaps(syncHeadToBody = false) {
        if (!this._playing) return;
        // Only sync head/ears to body during preset loading — not on every interactive call.
        // Running this unconditionally resets deliberately-chosen Natural head tints.
        if (syncHeadToBody) {
            for (const t of ['head', 'ears']) {
                if ((this._tintSel[t] ?? 0) === 0 && (this._tintSel['body'] ?? 0) > 0) {
                    this._tintSel[t] = this._tintSel['body'];
                }
            }
            this._updateTintRow('head');
        }
        for (const type of Object.keys(TINT_MATERIAL)) {
            if ((this._tintSel[type] ?? 0) > 0) this._applyPaletteSwap(type);
        }
    }

    // kept as alias so existing call-sites still work
    _applyTintForType(type) { this._applyPaletteSwap(type); }

    _updateTintRow(type) {
        const row = this._tintRows[type];
        if (!row) return;
        const opt  = CATALOGUE[type]?.[this._sel[type]];
        const show = !!(opt?.id && (!opt.colors?.length || FORCE_TINT_TYPES.has(type)));
        row.prev.setVisible(show);
        row.next.setVisible(show);
        row.swatch.setVisible(show);
        row.label.setVisible(show);
        if (show && this._isTypeTabActive(type)) {
            row.prev.setInteractive({ useHandCursor: true });
            row.next.setInteractive({ useHandCursor: true });
            row.swatch.setInteractive({ useHandCursor: true });
            row.label.setInteractive({ useHandCursor: true });
            const tint = TINT_PALETTE[this._itemTintMaterial(type)][this._tintSel[type] ?? 0];
            row.swatch.setFillStyle(tint.hex);
            row.label.setText(tint.name.toUpperCase());
        } else {
            row.prev.disableInteractive();
            row.next.disableInteractive();
            row.swatch.disableInteractive();
            row.label.disableInteractive();
        }
    }

    _applyLayerChange(type, oldOpt, newLayers) {
        // Remove every layer that belonged to the old selection (main + companions).
        // Using remove+add instead of replaceLayer avoids silent failures when the
        // container's current animation texture doesn't exist for the new item.
        const oldRt = oldOpt?.renderType ?? rType(type);
        if (oldOpt?.id) {
            const oldKey = layerKey({ type: oldRt, id: oldOpt.id, itemName: oldOpt.itemName });
            if (this._char._lpcLayers[oldKey]) this._renderer.removeLayer(this._char, oldKey);
        }
        for (const c of oldOpt?.companions ?? []) {
            const cKey = layerKey({ type: oldRt, id: c.id, itemName: c.itemName });
            if (this._char._lpcLayers[cKey]) this._renderer.removeLayer(this._char, cKey);
        }
        for (const l of newLayers) this._renderer.addLayer(this._char, l);

        if (this._playing) { this._renderer.play(this._char, ANIMS[this._animIdx], DIRS[this._dirIdx]); this._applySpeed(); }
        else this._renderer.freezeFrame(this._char, this._frameIdx);

        this._reapplyPaletteSwaps();
    }

    _removeTypeFromChar(type, oldOpt) {
        if (!oldOpt?.id) return;
        const rt      = oldOpt.renderType ?? rType(type);
        const mainKey = layerKey({ type: rt, id: oldOpt.id, itemName: oldOpt.itemName });
        if (this._char._lpcLayers[mainKey]) this._renderer.removeLayer(this._char, mainKey);
        for (const c of oldOpt.companions ?? []) {
            const cKey = layerKey({ type: rt, id: c.id, itemName: c.itemName });
            if (this._char._lpcLayers[cKey]) this._renderer.removeLayer(this._char, cKey);
        }
    }

    // ── Playback ─────────────────────────────────────────────────────

    _togglePlay() {
        this._playing = !this._playing;
        this._ppLbl.setText(this._playing ? '▐▐' : '▶');
        if (this._playing) { this._renderer.play(this._char, ANIMS[this._animIdx], DIRS[this._dirIdx]); this._applySpeed(); this._reapplyPaletteSwaps(); }
        else this._renderer.freezeFrame(this._char, this._frameIdx);
    }

    _setSpeed(v) {
        this._speed = v;
        for (const { sprite } of Object.values(this._char._lpcLayers)) {
            if (sprite.anims.isPlaying) {
                if (sprite.anims.currentAnim) { sprite.anims.currentAnim.frameRate = v; sprite.anims.currentAnim.msPerFrame = 1000 / v; }
                sprite.anims.msPerFrame = 1000 / v;
            }
        }
    }

    _applySpeed() {
        if (!this._playing) return;
        for (const { sprite } of Object.values(this._char._lpcLayers)) {
            if (sprite.anims.isPlaying) {
                if (sprite.anims.currentAnim) { sprite.anims.currentAnim.frameRate = this._speed; sprite.anims.currentAnim.msPerFrame = 1000 / this._speed; }
                sprite.anims.msPerFrame = 1000 / this._speed;
            }
        }
    }

    _setDir(dir) {
        this._dirIdx = DIRS.indexOf(dir);
        if (this._playing) { this._renderer.play(this._char, null, dir); this._applySpeed(); this._reapplyPaletteSwaps(); }
        else this._renderer.freezeFrame(this._char, this._frameIdx);
        this._refreshDpad();
    }

    _refreshDpad() {
        const active = DIRS[this._dirIdx];
        for (const [dir, { bg, lbl }] of Object.entries(this._dpadBtns)) {
            const on = dir === active;
            bg.setFillStyle(on ? 0x662200 : 0x1c1c1c);
            lbl.setStyle({ fill: on ? '#ffffff' : '#776655' });
        }
    }

    _cycleAnim(delta) {
        this._animIdx = (this._animIdx + delta + ANIMS.length) % ANIMS.length;
        this._animLabel.setText(this._animName());
        this._frameIdx = 0;
        const count = this._renderer.frameCount(this._char);
        this._frameSlider.setMax(Math.max(count - 1, 1));
        this._frameSlider.setValue(0);
        if (this._playing) { this._renderer.play(this._char, ANIMS[this._animIdx], DIRS[this._dirIdx]); this._applySpeed(); this._reapplyPaletteSwaps(); }
        else this._renderer.freezeFrame(this._char, 0);
    }

    _animName() { return ANIMS[this._animIdx].toUpperCase().replace(/_/g, ' '); }

    _onFrameSlider(v) {
        this._frameIdx = v;
        if (this._playing) { this._playing = false; this._ppLbl.setText('▶'); }
        this._renderer.freezeFrame(this._char, v);
    }

    // ── Slider ──────────────────────────────────────────────────────────

    _mkSlider(lx, y, trackW, label, f, min, max, initial, onChange) {
        const HDL_R = f(7);
        this.add.text(lx - f(5), y, label, { font: `${f(10)}px monospace`, fill: '#666655' }).setOrigin(1, 0.5);
        const valText = this.add.text(lx + trackW + HDL_R + f(4), y, String(initial), {
            font: `bold ${f(10)}px monospace`, fill: '#ff8833',
        }).setOrigin(0, 0.5);
        this.add.rectangle(lx + trackW / 2, y, trackW, f(4), 0x181818).setOrigin(0.5);
        const fill = this.add.rectangle(lx, y, 0, f(4), 0x6644aa).setOrigin(0, 0.5);
        let curMin = min, curMax = max;
        const t0     = (initial - min) / Math.max(max - min, 1);
        const handle = this.add.circle(lx + t0 * trackW, y, HDL_R, 0xff9922).setInteractive({ draggable: true, useHandCursor: true });
        this.input.setDraggable(handle);
        const ring = this.add.circle(lx + t0 * trackW, y, HDL_R - f(3), 0xffcc66);
        fill.width = t0 * trackW;
        const applyX = (rawX) => {
            const clX   = Phaser.Math.Clamp(rawX, lx, lx + trackW);
            const t     = (clX - lx) / trackW;
            const value = Math.round(curMin + t * (curMax - curMin));
            handle.x = clX; ring.x = clX; fill.width = clX - lx;
            valText.setText(String(value)); onChange(value);
        };
        handle.on('drag', (ptr, dragX) => applyX(dragX));
        this.add.rectangle(lx + trackW / 2, y, trackW, f(18), 0, 0).setInteractive({ useHandCursor: true }).on('pointerdown', (ptr) => applyX(ptr.x));
        return {
            setMax(m) { curMax = m; handle.x = lx; ring.x = lx; fill.width = 0; valText.setText('0'); },
            setValue(v) { const t = (v - curMin) / Math.max(curMax - curMin, 1); const x = lx + t * trackW; handle.x = x; ring.x = x; fill.width = t * trackW; valText.setText(String(v)); },
        };
    }

    _mkBtn(x, y, label, cb, size = 18) {
        const btn = this.add.text(x, y, label, { font: `bold ${size}px monospace`, fill: '#776655' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        btn.on('pointerover', () => btn.setStyle({ fill: '#ffffff' }));
        btn.on('pointerout',  () => btn.setStyle({ fill: '#776655' }));
        btn.on('pointerdown', cb);
        return btn;
    }

    _resetCharacter() {
        this._closeSwatchPicker();
        this.cameras.main.fadeOut(150);
        this.time.delayedCall(150, () => this.scene.restart({
            mode: this._onlineMode ? 'online' : undefined,
            slot: this._onlineSlot,
        }));
    }

    _randomizeCharacter() {
        this._closeSwatchPicker();
        const slots = [];
        for (const uiType of ALL_TYPES) {
            const entries = CATALOGUE[uiType] ?? [];
            if (!entries.length) continue;
            // Body always gets a real entry; others can land on None
            const pool = uiType === 'body' ? entries.filter(e => e.id) : entries;
            if (!pool.length) continue;
            const opt = pool[Math.floor(Math.random() * pool.length)];
            if (!opt?.id) continue;
            const catalogueIdx = entries.indexOf(opt);
            const entry = { uiType, catalogueIdx, id: opt.id };
            if (opt.colors?.length) entry.colorIdx = Math.floor(Math.random() * opt.colors.length);
            const matKey = TINT_MATERIAL[uiType];
            if (matKey) {
                const pal = TINT_PALETTE[matKey];
                if (pal?.length) entry.tintIdx = Math.floor(Math.random() * pal.length);
            }
            slots.push(entry);
        }
        this.cameras.main.fadeOut(150);
        this.time.delayedCall(150, () => this.scene.restart({
            mode:        this._onlineMode ? 'online' : undefined,
            slot:        this._onlineSlot,
            presetSlots: slots,
        }));
    }

    _back() {
        this._closeSwatchPicker();
        this.cameras.main.fadeOut(200);
        this.time.delayedCall(200, () => this.scene.start(this._onlineMode ? 'OnlineCharacterScene' : 'MenuScene'));
    }

    // ── Presets ─────────────────────────────────────────────────────────

    _presetKey() { return 'amo_creator_presets'; }

    _getPresets() {
        try { return JSON.parse(localStorage.getItem(this._presetKey())) ?? {}; } catch { return {}; }
    }

    _setPresets(obj) {
        localStorage.setItem(this._presetKey(), JSON.stringify(obj));
    }

    _buildSlots() {
        const slots = [];
        for (const uiType of ALL_TYPES) {
            const idx = this._sel[uiType] ?? 0;
            const opt = CATALOGUE[uiType]?.[idx];
            if (!opt?.id) continue;
            const colorIdx = this._colorSel[uiType] ?? 0;
            const tintIdx  = this._tintSel[uiType]  ?? 0;
            const matKey   = this._itemTintMaterial(uiType);
            const palette  = matKey ? TINT_PALETTE[matKey] : null;
            const entry = { uiType, catalogueIdx: idx, id: opt.id };
            if (opt.colors) entry.colorIdx = colorIdx;
            if (matKey)     entry.tintIdx  = tintIdx;
            if (palette)    entry.tintName = palette[tintIdx]?.name ?? 'Natural';
            slots.push(entry);
        }
        return slots;
    }

    _generateThumb() {
        // Composite a 64×64 walk-down frame from all current layers. Oversize
        // (192/128px) weapon frames are centre-cropped into the 64 cell so the
        // body stays at native size and everything stays anchored.
        const CELL = 64;
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = CELL;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const sorted = Object.values(this._char._lpcLayers)
            .sort((a, b) => (a.layer.zPos ?? DEFAULT_ZPOS[a.layer.type] ?? 0) - (b.layer.zPos ?? DEFAULT_ZPOS[b.layer.type] ?? 0));
        for (const entry of sorted) {
            const layer    = entry.layer;
            const concrete = resolveAnim(layer, 'walk');
            if (!concrete) continue;
            const swp = entry.swappedKeys?.[concrete];
            const key = (swp && this.textures.exists(swp)) ? swp : texKey(layer, concrete);
            if (!this.textures.exists(key)) continue;
            this._renderer.ensureTextureAnims(key, concrete);
            const tex  = this.textures.get(key);
            const fw   = tex.customData?.frameW ?? 64;
            const fh   = tex.customData?.frameH ?? 64;
            const rows = Math.floor(tex.source[0].height / fh);
            const rowIdx = rows === 4 ? 2 : 0; // down row
            ctx.drawImage(tex.source[0].image, 0, rowIdx * fh, fw, fh,
                (CELL - fw) / 2, (CELL - fh) / 2, fw, fh);
        }
        return canvas.toDataURL('image/png');
    }

    _openPresetPanel() {
        if (this._presetPanel) { this._closePresetPanel(); return; }
        const f = this._f, h = this._h, SPLIT = this._SPLIT, RP_W = this._RP_W, RP_CX = this._RP_CX;

        const panel = this.add.container(SPLIT, 0);
        this._presetPanel = panel;

        // Background
        panel.add(this.add.rectangle(RP_W / 2, h / 2, RP_W, h, 0x0e0e0e, 0.97).setOrigin(0.5));
        panel.add(this.add.text(RP_W / 2, f(6), 'PRESETS', {
            font: `bold ${f(13)}px monospace`, fill: '#ff8833',
        }).setOrigin(0.5, 0));

        // Save current button
        const saveBtn = this.add.text(RP_W / 2, f(22), '[ SAVE CURRENT ]', {
            font: `${f(9)}px monospace`, fill: '#ff8833',
        }).setOrigin(0.5, 0);
        const sbPx = f(12), sbPy = f(6);
        saveBtn.setInteractive({
            useHandCursor: true,
            hitArea: new Phaser.Geom.Rectangle(-sbPx, -sbPy, saveBtn.width + sbPx * 2, saveBtn.height + sbPy * 2),
            hitAreaCallback: Phaser.Geom.Rectangle.Contains,
        });
        saveBtn.on('pointerover', () => saveBtn.setStyle({ fill: '#ffffff' }));
        saveBtn.on('pointerout',  () => saveBtn.setStyle({ fill: '#ff8833' }));
        saveBtn.on('pointerdown', () => { this._savePreset(); this._closePresetPanel(); this._openPresetPanel(); });
        panel.add(saveBtn);

        // Close button
        const closeBtn = this.add.text(RP_W - f(4), f(4), '✕', {
            font: `${f(11)}px monospace`, fill: '#553322',
        }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
        closeBtn.on('pointerover', () => closeBtn.setStyle({ fill: '#ff4466' }));
        closeBtn.on('pointerout',  () => closeBtn.setStyle({ fill: '#553322' }));
        closeBtn.on('pointerdown', () => this._closePresetPanel());
        panel.add(closeBtn);

        // Preset list
        const presets = this._getPresets();
        const names   = Object.keys(presets);
        const listY0  = f(36);
        const rowH    = f(18);

        if (!names.length) {
            panel.add(this.add.text(RP_W / 2, listY0 + f(12), 'No presets saved yet.', {
                font: `${f(8)}px monospace`, fill: '#555544',
            }).setOrigin(0.5));
        }

        names.forEach((name, i) => {
            const ry = listY0 + i * rowH;
            const bg = this.add.rectangle(RP_W / 2, ry + rowH / 2, RP_W - f(8), rowH - f(2), 0x131313)
                .setOrigin(0.5, 0.5);
            panel.add(bg);

            // Thumbnail — register the texture only AFTER the image decodes, else
            // Phaser uploads a 0-size source and WebGL warns "texImage2D: no image".
            const preset = presets[name];
            if (preset.preview) {
                const thumbTex = `__preset_thumb_${name}`;
                const place = () => {
                    if (!this._presetPanel || !this.textures.exists(thumbTex)) return;
                    panel.add(this.add.image(f(10), ry + rowH / 2, thumbTex).setOrigin(0, 0.5).setDisplaySize(f(14), f(14)));
                };
                if (this.textures.exists(thumbTex)) {
                    place();
                } else {
                    const img = new Image();
                    img.onload = () => {
                        if (!this.textures.exists(thumbTex)) this.textures.addImage(thumbTex, img);
                        place();
                    };
                    img.onerror = () => { console.warn('[CharacterCreator] failed to load preset thumbnail:', preset.preview); };
                    img.src = preset.preview;
                }
            }

            panel.add(this.add.text(f(26), ry + rowH / 2, name, {
                font: `${f(8)}px monospace`, fill: '#ccaa88',
            }).setOrigin(0, 0.5));

            // Delete
            const del = this.add.text(RP_W - f(4), ry + rowH / 2, '✕', {
                font: `${f(9)}px monospace`, fill: '#553322',
            }).setOrigin(1, 0.5);
            del.setInteractive({
                useHandCursor: true,
                hitArea: new Phaser.Geom.Rectangle(-del.width - f(6), -f(8), del.width + f(12), del.height + f(16)),
                hitAreaCallback: Phaser.Geom.Rectangle.Contains,
            });
            del.on('pointerover', () => del.setStyle({ fill: '#ff4466' }));
            del.on('pointerout',  () => del.setStyle({ fill: '#553322' }));
            del.on('pointerdown', () => { this._deletePreset(name); this._closePresetPanel(); this._openPresetPanel(); });
            panel.add(del);

            // Load
            const load = this.add.text(RP_W - f(24), ry + rowH / 2, 'LOAD', {
                font: `${f(8)}px monospace`, fill: '#7799ff',
            }).setOrigin(1, 0.5);
            load.setInteractive({
                useHandCursor: true,
                hitArea: new Phaser.Geom.Rectangle(-load.width - f(6), -f(8), load.width + f(12), load.height + f(16)),
                hitAreaCallback: Phaser.Geom.Rectangle.Contains,
            });
            load.on('pointerover', () => load.setStyle({ fill: '#ffffff' }));
            load.on('pointerout',  () => load.setStyle({ fill: '#7799ff' }));
            load.on('pointerdown', () => this._loadPreset(preset.slots));
            panel.add(load);

            // Row hover
            bg.setInteractive();
            bg.on('pointerover', () => bg.setFillStyle(0x1a1100));
            bg.on('pointerout',  () => bg.setFillStyle(0x131313));
        });

        // Bring panel to top
        this.children.bringToTop(panel);
    }

    _closePresetPanel() {
        if (!this._presetPanel) return;
        this._presetPanel.destroy(true);
        this._presetPanel = null;
    }

    _savePreset() {
        const name = window.prompt('Preset name:', '');
        if (!name?.trim()) return;
        const presets = this._getPresets();
        if (presets[name] && !window.confirm(`"${name}" already exists — overwrite?`)) return;
        presets[name] = {
            name,
            slots:   this._buildSlots(),
            preview: this._generateThumb(),
            created: new Date().toISOString(),
        };
        this._setPresets(presets);
    }

    _deletePreset(name) {
        const presets = this._getPresets();
        delete presets[name];
        this._setPresets(presets);
    }

    _loadPreset(slots) {
        this.cameras.main.fadeOut(150);
        this.time.delayedCall(150, () => {
            this.scene.restart({
                mode:        this._onlineMode ? 'online' : undefined,
                slot:        this._onlineSlot,
                presetSlots: slots,
            });
        });
    }

    // ── Export ──────────────────────────────────────────────────────────

    _exportCharacter() {
        // rendererLayers — exact format CharacterRenderer expects, including companions
        const rendererLayers = [];
        for (const uiType of ALL_TYPES) {
            const layers = this._currentLayers(uiType);
            if (!layers.length) continue;

            const opt          = CATALOGUE[uiType]?.[this._sel[uiType]];
            const hasColorOnly = opt?.colors?.length && !FORCE_TINT_TYPES.has(uiType);
            const tintIdx      = this._tintSel[uiType] ?? 0;

            let swapParams = null;
            if (opt?.id && !hasColorOnly && tintIdx > 0) {
                const matKey  = this._itemTintMaterial(uiType);
                const palette = matKey ? TINT_PALETTE[matKey] : null;
                const entry   = palette?.[tintIdx];
                if (entry?.shades) swapParams = { ...swapColors(uiType, opt, entry), tintName: entry.name };
            }

            for (const l of layers) {
                rendererLayers.push(swapParams ? { ...l, swapParams } : l);
            }
        }

        // slots — creator state needed for future re-editing
        const slots = [];
        for (const uiType of ALL_TYPES) {
            const idx = this._sel[uiType] ?? 0;
            const opt = CATALOGUE[uiType]?.[idx];
            if (!opt?.id) continue;
            const colorIdx = this._colorSel[uiType] ?? 0;
            const tintIdx  = this._tintSel[uiType]  ?? 0;
            const matKey   = this._itemTintMaterial(uiType);
            const palette  = matKey ? TINT_PALETTE[matKey] : null;
            const tintName = palette ? (palette[tintIdx]?.name ?? 'Natural') : undefined;
            const entry = { uiType, catalogueIdx: idx, id: opt.id, label: opt.label, zPos: opt.zPos };
            if (opt.itemName)   entry.itemName  = opt.itemName;
            if (opt.colors)     { entry.colorIdx = colorIdx; entry.color = opt.colors[colorIdx] ?? null; }
            if (matKey)         { entry.tintMaterial = matKey; entry.tintIdx = tintIdx; entry.tintName = tintName; }
            slots.push(entry);
        }

        const charName = localStorage.getItem('amo_name') || 'Hero';
        const payload  = { version: 2, created: new Date().toISOString(), charName, rendererLayers, slots };

        if (this._onlineMode && this._onlineSlot !== null) {
            localStorage.setItem(`amo_char_slot_${this._onlineSlot}`, JSON.stringify(payload));
            this.cameras.main.fadeOut(200);
            this.time.delayedCall(200, () => this.scene.start('OnlineCharacterScene'));
        } else {
            this._downloadText('character.json', JSON.stringify(payload, null, 2), 'application/json');
        }
    }

    _exportSpritesheet() {
        const swapCache = new Map(); // memoize palette-swapped canvases within this export

        // Build z-sorted layer list from current UI selections, carrying tint info
        const expLayers = [];
        for (const uiType of ALL_TYPES) {
            const idx = this._sel[uiType] ?? 0;
            const opt = CATALOGUE[uiType]?.[idx];
            if (!opt?.id) continue;
            const rt       = opt.renderType ?? rType(uiType);
            const color    = this._getColor(uiType);
            const tintIdx  = this._tintSel[uiType] ?? 0;
            const matKey   = this._itemTintMaterial(uiType);
            const palette  = matKey ? TINT_PALETTE[matKey] : null;
            const palEntry = (palette && tintIdx > 0) ? palette[tintIdx] : null;
            const swap     = palEntry?.shades ? swapColors(uiType, opt, palEntry) : null;
            const main     = { type: rt, id: opt.id, zPos: opt.zPos ?? DEFAULT_ZPOS[rt] ?? 0, color, itemName: opt.itemName, anims: opt.anims };
            expLayers.push({ layer: main, swap });
            for (const c of opt.companions ?? []) {
                expLayers.push({
                    layer: { type: rt, id: c.id, zPos: c.zPos ?? DEFAULT_ZPOS[rt] ?? 0,
                        color: c.color ?? (opt.colors ? color : undefined), itemName: c.itemName, anims: c.anims },
                    swap,
                });
            }
        }
        expLayers.sort((a, b) => (a.layer.zPos ?? 0) - (b.layer.zPos ?? 0));

        // Each logical anim becomes one block of 64px cells. Per layer we resolve
        // the concrete file it ships (so a Vitruvius weapon's attack_slash lands on
        // the 'slash' block) and normalise every frame — including oversize 192/128px
        // weapon frames — into the 64px universal grid, centred on the body anchor.
        const CELL = 64, MAX_COLS = 13;
        const blocks = [];
        let totalH = 0, sheetCols = 1;
        for (const logical of DEFAULT_ANIMS) {
            const draws = [];
            let rows = 0, cols = 0;
            for (const { layer, swap } of expLayers) {
                const concrete = resolveAnim(layer, logical);
                if (!concrete) continue;
                const key = texKey(layer, concrete);
                if (!this.textures.exists(key)) continue;
                const tex = this.textures.get(key);
                if (!tex || tex.key === '__MISSING') continue;
                this._renderer.ensureTextureAnims(key, concrete);
                const fw = tex.customData?.frameW ?? 64;
                const fh = tex.customData?.frameH ?? 64;
                const lcols = Math.floor(tex.source[0].width  / fw);
                const lrows = Math.floor(tex.source[0].height / fh);
                const img = swap
                    ? this._paletteSwapImage(tex.source[0].image, swap, swapCache)
                    : tex.source[0].image;
                draws.push({ img, fw, fh, lcols, lrows });
                rows = Math.max(rows, lrows);
                cols = Math.max(cols, lcols);
            }
            if (!draws.length) continue;
            cols = Math.min(cols, MAX_COLS);
            blocks.push({ draws, rows, cols, dstY: totalH });
            totalH   += rows * CELL;
            sheetCols = Math.max(sheetCols, cols);
        }

        if (!totalH) return;

        const canvas = document.createElement('canvas');
        canvas.width  = sheetCols * CELL;
        canvas.height = totalH;
        const ctx = canvas.getContext('2d');

        for (const { draws, rows, cols, dstY } of blocks) {
            for (const { img, fw, fh, lcols, lrows } of draws) {
                for (let r = 0; r < Math.min(rows, lrows); r++) {
                    for (let c = 0; c < Math.min(cols, lcols); c++) {
                        // native frame → 64px cell (scales oversize down, centred)
                        ctx.drawImage(img, c * fw, r * fh, fw, fh,
                            c * CELL, dstY + r * CELL, CELL, CELL);
                    }
                }
            }
        }

        canvas.toBlob(blob => {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'spritesheet.png';
            a.click();
            URL.revokeObjectURL(a.href);
        }, 'image/png');
    }

    /** Returns a new canvas with the palette swap applied — used by spritesheet export */
    _paletteSwapImage(image, swap, cache) {
        const cacheKey = `${image.src || ''}|${swap.sourceKey}|${swap.targetShades.join(',')}`;
        if (cache?.has(cacheKey)) return cache.get(cacheKey);

        const w  = image.naturalWidth  || image.width;
        const h  = image.naturalHeight || image.height;
        const c  = document.createElement('canvas');
        c.width  = w; c.height = h;
        const cx = c.getContext('2d', { willReadFrequently: true });
        cx.drawImage(image, 0, 0);
        const id   = cx.getImageData(0, 0, w, h);
        remapPixels(id.data, swap.sourceColors, swap.targetShades);
        cx.putImageData(id, 0, 0);
        cache?.set(cacheKey, c);
        return c;
    }

    async _exportLicenses() {
        try {
            const res = await fetch('./CREDITS.csv');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const text = await res.text();
            this._downloadText('lpc-credits.csv', text, 'text/csv');
        } catch (e) {
            console.warn('[CharacterCreator] failed to load CREDITS.csv:', e);
            this.scene.get('UIScene')?.showNotification?.('Could not load credits file.', 2500);
        }
    }

    _downloadText(filename, text, mimeType = 'text/plain') {
        const a = document.createElement('a');
        a.href  = URL.createObjectURL(new Blob([text], { type: mimeType }));
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
    }
}
