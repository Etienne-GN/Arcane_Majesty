// W5: the full map (M). Region tab: the explored map with exits, doors, rift-gates,
// landmarks and quest markers, pan (WASD / arrows / drag / left stick) and zoom (wheel,
// + / −, the on-screen buttons). World tab: the places you have been, on the lore map.
// TAB / LB / RB switches tabs; M, ESC, B or ✕ closes.
import Phaser from 'phaser';
import { playerStats } from '../systems/PlayerStats.js';
import { questManager } from '../systems/QuestManager.js';
import { getMap } from '../data/maps/index.js';
import { namedPeopleAt } from '../data/townsfolk/index.js';
import { TILE_SIZE } from '../data/worldMap.js';
import { MenuFocus } from '../systems/MenuFocus.js';
import { visibleFeatures, markersFor } from '../systems/mapMarkers.js';
import { layoutWorld } from '../systems/worldLayout.js';
import { fogFor, isExplored } from '../systems/fog.js';

const HEADER = 34, FOOTER = 24;
const ZOOM_MIN = 1, ZOOM_MAX = 24, ZOOM_STEP = 1.25;
const PAN_PX_PER_S = 420;

const questState = () => ({
    active: questManager.getActiveQuests().map(q => ({ quest: q, log: playerStats.questLog[q.id] })),
    countItem: id => playerStats.countItem(id),
    attunedGates: playerStats.attunedGates ?? [],
});

export default class MapScene extends Phaser.Scene {
    constructor() { super('MapScene'); }

    init(data) { this._tab = data?.tab === 'world' ? 'world' : 'region'; }

    create() {
        const w = this.scale.width, h = this.scale.height;
        this._vw = w;
        this._vh = h - HEADER - FOOTER;
        this.add.rectangle(0, 0, w, h, 0x05060a, 0.97).setOrigin(0).setDepth(0);

        const gs = this.scene.get('GameScene');
        this._gs = gs;
        this._mapId = gs._mapId;
        this._def = gs._mapDef ?? getMap(this._mapId);
        this._fog = gs._fog ?? null;
        this._mapImg = gs._mapImg ?? null;

        this._region = this.add.container(0, 0).setDepth(1);
        this._world = this.add.container(0, 0).setDepth(1);
        this._overlay = this.add.graphics().setDepth(2);
        this._labels = [];

        // Header and footer bars sit above the map image
        this.add.rectangle(0, 0, w, HEADER, 0x0b0d16, 1).setOrigin(0).setDepth(5);
        this.add.rectangle(0, h - FOOTER, w, FOOTER, 0x0b0d16, 1).setOrigin(0).setDepth(5);
        const tabStyle = { font: 'bold 12px monospace', fill: '#887755' };
        this._tabTexts = {
            region: this.add.text(12, 10, 'REGION', tabStyle).setDepth(6).setInteractive({ useHandCursor: true }).on('pointerdown', () => this._showTab('region')),
            world: this.add.text(84, 10, 'WORLD', tabStyle).setDepth(6).setInteractive({ useHandCursor: true }).on('pointerdown', () => this._showTab('world')),
        };
        this._title = this.add.text(w / 2, 9, '', { font: 'bold 13px monospace', fill: '#ffd700', stroke: '#000', strokeThickness: 2 }).setOrigin(0.5, 0).setDepth(6);
        this.add.text(w - 28, 12, '[TAB] tab  [WASD/drag] pan  [wheel/+ −] zoom  [M/ESC] close', { font: '9px monospace', fill: '#776655' }).setOrigin(1, 0).setDepth(6);
        this.add.text(w - 6, 4, '✕', { font: 'bold 14px monospace', fill: '#aa4444', stroke: '#000', strokeThickness: 2 })
            .setOrigin(1, 0).setDepth(7).setInteractive({ useHandCursor: true }).on('pointerdown', () => this._close());
        this._legend = this.add.text(12, h - FOOTER + 6, '', { font: '9px monospace', fill: '#aaaaaa' }).setDepth(6);
        this._zoomBtns = [
            this.add.text(w - 54, h - FOOTER + 2, ' + ', { font: 'bold 14px monospace', fill: '#ddccaa', backgroundColor: '#222233' }).setDepth(7).setInteractive().on('pointerdown', () => this._zoomBy(ZOOM_STEP)),
            this.add.text(w - 26, h - FOOTER + 2, ' − ', { font: 'bold 14px monospace', fill: '#ddccaa', backgroundColor: '#222233' }).setDepth(7).setInteractive().on('pointerdown', () => this._zoomBy(1 / ZOOM_STEP)),
        ];

        this._buildRegion();
        this._buildWorld();
        this._showTab(this._tab);

        // Input
        this._keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT');
        this.input.keyboard.addCapture('TAB');
        this.input.keyboard.on('keydown', e => {
            if (e.key === 'Escape' || e.key === 'm' || e.key === 'M') this._close();
            else if (e.key === 'Tab') this._showTab(this._tab === 'region' ? 'world' : 'region');
            else if (e.key === '+' || e.key === '=') this._zoomBy(ZOOM_STEP);
            else if (e.key === '-' || e.key === '_') this._zoomBy(1 / ZOOM_STEP);
        });
        this.input.on('wheel', (p, objs, dx, dy) => this._zoomBy(dy > 0 ? 1 / ZOOM_STEP : ZOOM_STEP));
        this.input.on('pointerdown', p => { this._drag = { x: p.x, y: p.y, cx: this._cx, cy: this._cy }; });
        this.input.on('pointerup', () => { this._drag = null; });
        this.input.on('pointermove', p => {
            if (!this._drag || !p.isDown || this._tab !== 'region' || !this._img) return;
            this._panTo(this._drag.cx - (p.x - this._drag.x) / this._zoom, this._drag.cy - (p.y - this._drag.y) / this._zoom);
        });
        this._focus = new MenuFocus(this, { onBack: () => this._close() });
    }

    update(time, delta) {
        const gp = this._focus.poll(delta);
        if (gp?.LB || gp?.RB) this._showTab(this._tab === 'region' ? 'world' : 'region');
        if (this._tab !== 'region' || !this._img) return;
        const k = this._keys;
        let dx = (k.D.isDown || k.RIGHT.isDown ? 1 : 0) - (k.A.isDown || k.LEFT.isDown ? 1 : 0);
        let dy = (k.S.isDown || k.DOWN.isDown ? 1 : 0) - (k.W.isDown || k.UP.isDown ? 1 : 0);
        if (gp && Math.hypot(gp.lx ?? 0, gp.ly ?? 0) > 0.2) { dx = gp.lx; dy = gp.ly; }
        if (dx || dy) {
            const step = PAN_PX_PER_S * delta / 1000 / this._zoom;
            this._panTo(this._cx + dx * step, this._cy + dy * step);
        }
    }

    // ── Region tab ────────────────────────────────────────────────────────────
    _buildRegion() {
        const def = this._def;
        this._mw = def.tiles?.[0]?.length ?? 0;
        this._mh = def.tiles?.length ?? 0;
        this._features = visibleFeatures(def, this._fog, playerStats, this._mapId);
        this._markers = markersFor(questState(), this._mapId, def, { getMap, people: namedPeopleAt(playerStats.gameMinutes) });
        if (!this._mapImg || !this._mw) {
            this._img = null;
            this._region.add(this.add.text(this._vw / 2, HEADER + this._vh / 2, 'No map of this place.', { font: '12px monospace', fill: '#887766' }).setOrigin(0.5));
            return;
        }
        this._img = this.add.image(0, 0, this._mapImg.key).setOrigin(0);
        this._region.add(this._img);
        const fit = Math.min(this._vw / this._mw, this._vh / this._mh);
        this._zoom = Phaser.Math.Clamp(Math.max(fit, 4), ZOOM_MIN, ZOOM_MAX);
        const p = this._gs.player;
        this._cx = p ? p.x / TILE_SIZE : this._mw / 2;
        this._cy = p ? p.y / TILE_SIZE : this._mh / 2;
        this._layoutRegion();
    }

    _toScreen(tx, ty) {
        return [this._vw / 2 + (tx - this._cx) * this._zoom, HEADER + this._vh / 2 + (ty - this._cy) * this._zoom];
    }

    _panTo(cx, cy) {
        this._cx = Phaser.Math.Clamp(cx, 0, this._mw);
        this._cy = Phaser.Math.Clamp(cy, 0, this._mh);
        this._layoutRegion();
    }

    _zoomBy(f) {
        if (this._tab !== 'region' || !this._img) return;
        this._zoom = Phaser.Math.Clamp(this._zoom * f, ZOOM_MIN, ZOOM_MAX);
        this._layoutRegion();
    }

    _layoutRegion() {
        if (!this._img) return;
        const [ox, oy] = this._toScreen(0, 0);
        this._img.setPosition(ox, oy).setScale(this._zoom);
        this._drawRegionOverlay();
    }

    _drawRegionOverlay() {
        const g = this._overlay;
        g.clear();
        this._labels.forEach(t => t.destroy());
        this._labels = [];
        if (this._tab !== 'region' || !this._img) return;
        const z = this._zoom;
        const c = (tx, ty) => this._toScreen(tx + 0.5, ty + 0.5);
        const onView = (x, y) => x >= -20 && x <= this._vw + 20 && y >= HEADER - 20 && y <= HEADER + this._vh + 20;
        const label = (x, y, text, fill) => this._labels.push(this.add.text(x, y, text, { font: '9px monospace', fill, stroke: '#000', strokeThickness: 2 }).setOrigin(0, 0.5).setDepth(3));
        const f = this._features;
        for (const e of f.exits) {
            const [x, y] = c(e.x, e.y);
            if (!onView(x, y)) continue;
            g.fillStyle(0x44ddff, 1).fillTriangle(x, y - 5, x - 4, y + 3, x + 4, y + 3);
            label(x + 7, y, e.targetMap === '__return' ? 'Exit' : (getMap(e.targetMap).displayName ?? e.label), '#88eeff');
        }
        for (const d of f.doors) {
            const [x, y] = c(d.x, d.y);
            if (!onView(x, y)) continue;
            g.fillStyle(d.locked ? 0xaa3333 : 0xc89a5a, 1).fillRect(x - 3, y - 3, 6, 6);
            if (z >= 6) label(x + 6, y, d.label ?? 'Door', d.locked ? '#cc6666' : '#ddbb88');
        }
        for (const gt of f.gates) {
            const [x, y] = c(gt.x, gt.y);
            if (!onView(x, y)) continue;
            g.lineStyle(2, gt.attuned ? 0xffd700 : 0x4477cc, 1).strokeCircle(x, y, 5);
            if (z >= 3) label(x + 8, y, gt.label ?? 'Rift-Gate', gt.attuned ? '#ffd700' : '#6688bb');
        }
        for (const l of f.landmarks) {
            const [x, y] = c(l.x, l.y);
            if (!onView(x, y)) continue;
            g.fillStyle(l.discovered ? 0xffe080 : 0x777777, 1).fillCircle(x, y, 4);
            label(x + 7, y, l.name, l.discovered ? '#ffe080' : '#999999');
        }
        for (const m of this._markers) {
            const [x, y] = c(m.x, m.y);
            if (!onView(x, y)) continue;
            g.fillStyle(m.main ? 0xffd700 : 0xc0c0d0, 1).fillPoints([{ x, y: y - 7 }, { x: x + 5, y }, { x, y: y + 7 }, { x: x - 5, y }], true);
            label(x + 8, y - 8, m.label, m.main ? '#ffd700' : '#d0d0e0');
        }
        const p = this._gs.player;
        if (p) {
            const [x, y] = this._toScreen(p.x / TILE_SIZE, p.y / TILE_SIZE);
            g.fillStyle(0xffffff, 1).fillCircle(x, y, 4);
            g.lineStyle(1, 0x000000, 1).strokeCircle(x, y, 4);
            label(x + 7, y + 9, 'You', '#ffffff');
        }
    }

    // ── World tab ─────────────────────────────────────────────────────────────
    _buildWorld() {
        const visited = new Set(Object.keys(playerStats.explored ?? {}));
        const here = this._def.interior ? (playerStats.interiorReturn?.[0]?.mapId ?? this._def.exitFallback?.map ?? this._mapId) : this._mapId;
        visited.add(here);
        const knownExit = (mapId, portal) => isExplored(fogFor(getMap(mapId), mapId, playerStats), portal.x, portal.y);
        const L = layoutWorld([...visited], getMap, { knownExit });
        this._worldNodes = { ...L, here };
        if (!L.nodes.length) {
            this._world.add(this.add.text(this._vw / 2, HEADER + this._vh / 2, 'Nowhere yet.', { font: '12px monospace', fill: '#887766' }).setOrigin(0.5));
            return;
        }
        const pts = [...L.nodes, ...L.stubs];
        const minX = Math.min(...pts.map(p => p.x)), maxX = Math.max(...pts.map(p => p.x));
        const minY = Math.min(...pts.map(p => p.y)), maxY = Math.max(...pts.map(p => p.y));
        const m = 70, s = Math.min((this._vw - 2 * m) / Math.max(1, maxX - minX), (this._vh - 2 * m) / Math.max(1, maxY - minY), 1.6);
        const P = (x, y) => [this._vw / 2 + (x - (minX + maxX) / 2) * s, HEADER + this._vh / 2 + (y - (minY + maxY) / 2) * s];
        const at = Object.fromEntries(L.nodes.map(n => [n.id, P(n.x, n.y)]));
        const g = this.add.graphics();
        this._world.add(g);
        for (const [a, b] of L.edges) g.lineStyle(2, 0x667788, 0.9).lineBetween(...at[a], ...at[b]);
        for (const st of L.stubs) {
            const [x0, y0] = at[st.from], [x1, y1] = P(st.x, st.y);
            g.lineStyle(1, 0x445566, 0.7).lineBetween(x0, y0, x1, y1);
            this._world.add(this.add.text(x1, y1, '?', { font: 'bold 10px monospace', fill: '#667788' }).setOrigin(0.5));
        }
        const qs = questState(), people = namedPeopleAt(playerStats.gameMinutes);
        for (const n of L.nodes) {
            const [x, y] = at[n.id];
            const isHere = n.id === here;
            g.fillStyle(isHere ? 0xffd700 : 0x88aacc, 1).fillCircle(x, y, isHere ? 7 : 5);
            if (isHere) g.lineStyle(2, 0xffffff, 0.8).strokeCircle(x, y, 10);
            this._world.add(this.add.text(x, y + 12, n.name, { font: '9px monospace', fill: isHere ? '#ffd700' : '#aabbcc', stroke: '#000', strokeThickness: 2 }).setOrigin(0.5, 0));
            if (markersFor(qs, n.id, getMap(n.id), { getMap, people }).length) {
                this._world.add(this.add.text(x + 9, y - 14, '!', { font: 'bold 13px monospace', fill: '#ffd700', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5));
            }
        }
    }

    _showTab(tab) {
        this._tab = tab;
        this._region.setVisible(tab === 'region');
        this._world.setVisible(tab === 'world');
        this._zoomBtns.forEach(b => b.setVisible(tab === 'region' && !!this._img));
        this._tabTexts.region.setStyle({ fill: tab === 'region' ? '#ffd700' : '#887755' });
        this._tabTexts.world.setStyle({ fill: tab === 'world' ? '#ffd700' : '#887755' });
        this._title.setText(tab === 'region' ? (this._def.displayName ?? this._mapId) : 'THE KNOWN WORLD');
        this._legend.setText(tab === 'region'
            ? '▲ exit   ■ door (red: locked)   ○ rift-gate (gold: attuned)   ● landmark   ◆ quest'
            : '● a place you have been   ! a quest leads there   ? an exit you have seen');
        this._drawRegionOverlay();
    }

    _close() {
        this.scene.stop();
        this.scene.resume('GameScene');
    }
}
