// W4: the townsfolk you can see — live sprites for the residents whose clock
// position is on this map and in a built chunk (W2), at most LIVE_CAP, nearest
// first. Each follows whereAt() and gives way to the player (crowd.js). Phaser
// glue; the rules are in schedules.js and crowd.js.
import { whereAt } from './schedules.js';
import { chooseLive, inTheWay, steer } from './crowd.js';
import { LOOK_DIRS, lookFrames, lookKey, SIT_FRAME } from './townsfolkLooks.js';
import { isNight } from './gameClock.js';
import { LOOKS } from '../data/townsfolk/looks.js';

const RESELECT_MS = 250;
const FEET_LIFT = 16;   // sprite centre above the clock position (the feet sit near the tile centre)
const LOOK_FILE = new Map(LOOKS.map(l => [l.id, l.file]));
const textStyle = fill => ({ font: '7px monospace', fill, stroke: '#000', strokeThickness: 1 });

export class TownsfolkManager {
    static preload(scene, town) {
        for (const id of new Set(town.residents.map(r => r.look))) {
            const key = lookKey(id);
            if (LOOK_FILE.has(id) && !scene.textures.exists(key)) scene.load.spritesheet(key, LOOK_FILE.get(id), { frameWidth: 64, frameHeight: 64 });
        }
    }

    constructor(scene, town, mapId) {
        Object.assign(this, { scene, town, mapId });
        this.group = scene.physics.add.group({ allowGravity: false, immovable: true });
        this.live = new Map();
        this._byId = new Map(town.residents.map(r => [r.id, r]));
        this._reselect = 0;
    }

    update(delta, minutes, player, isPxActive) {
        this._reselect -= delta;
        if (this._reselect <= 0) { this._reselect = RESELECT_MS; this._select(minutes, player, isPxActive); }
        for (const spr of [...this.live.values()]) this._move(spr, delta, minutes, player);
    }

    _select(minutes, player, isPxActive) {
        const cands = [];
        for (const r of this.town.residents) {
            const p = whereAt(r, minutes - (this.live.get(r.id)?.steer.lagMin ?? 0), this.town);
            if (p?.visible && p.mapId === this.mapId && isPxActive(p.x, p.y) && this.scene.textures.exists(lookKey(r.look))) cands.push({ id: r.id, x: p.x, y: p.y });
        }
        const keep = new Set(chooseLive(cands, player.x, player.y));
        for (const [id, spr] of this.live) if (!keep.has(id)) this._despawn(id, spr);
        for (const c of cands) if (keep.has(c.id) && !this.live.has(c.id)) this._spawn(this._byId.get(c.id), c);
    }

    _ensureAnims(key) {
        const anims = this.scene.anims;
        for (const dir of LOOK_DIRS) {
            const mk = (k, frames, frameRate) => { if (!anims.exists(k)) anims.create({ key: k, frames: frames.map(frame => ({ key, frame })), frameRate, repeat: -1 }); };
            mk(`${key}_walk_${dir}`, lookFrames('walk', dir), 10);
            mk(`${key}_idle_${dir}`, lookFrames('idle', dir), 2);
            mk(`${key}_sit_${dir}`, [lookFrames('sit', dir)[SIT_FRAME]], 1);
        }
    }

    _spawn(r, at) {
        const key = lookKey(r.look);
        this._ensureAnims(key);
        const spr = this.group.create(at.x, at.y - FEET_LIFT, key, lookFrames('idle', 'down')[0]);
        spr.body.setSize(20, 14).setOffset(22, 46);
        spr.body.immovable = true;
        spr.body.pushable = false;
        Object.assign(spr, { resident: r, steer: {}, holdUntil: 0, activity: null });
        if (r.npc) {
            spr.npcDef = r.npc;
            spr.talked = !!this.scene._talkedNpcs?.has(r.npc.id);
            spr.nameLabel = this.scene.add.text(spr.x, spr.y - 30, r.npc.name, textStyle(r.npc.isShop ? '#ffdd88' : '#aaffaa')).setOrigin(0.5, 1).setDepth(25).setResolution(3);
        }
        spr.ePrompt = this.scene.add.text(spr.x, spr.y - 40, r.npc?.isShop ? '[E] Shop' : '[E]', { font: '7px monospace', fill: '#ffff88' })
            .setOrigin(0.5, 1).setDepth(25).setResolution(3).setAlpha(0);
        this.live.set(r.id, spr);
    }

    _despawn(id, spr) {
        spr.nameLabel?.destroy(); spr.ePrompt?.destroy(); spr.bubble?.destroy();
        spr.destroy();
        this.live.delete(id);
    }

    _move(spr, delta, minutes, player) {
        const r = spr.resident, hold = this.scene.time.now < spr.holdUntil;
        const t = minutes - (spr.steer.lagMin ?? 0);
        const p = whereAt(r, t, this.town);
        if (!p || !p.visible || p.mapId !== this.mapId) { this._despawn(r.id, spr); return; }
        const ahead = p.moving ? whereAt(r, t + 0.05, this.town) : null;
        const next = ahead && ahead.mapId === p.mapId ? ahead : p;
        const feet = { x: player.x, y: player.y + 16 };
        const blocked = !hold && p.moving && inTheWay(p, next, feet);
        const dx = next.x - p.x, dy = next.y - p.y, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
        const free = this.town.nav.isWalkable(this.mapId, Math.floor((p.x + nx * 32) / 32), Math.floor((p.y + ny * 32) / 32));
        spr.steer = steer(spr.steer, { blocked, hold, dtMs: delta, moving: p.moving, sideFree: free ? 1 : -1 });
        const off = spr.steer.side * spr.steer.offset;
        spr.body.reset(p.x + nx * off, p.y + ny * off - FEET_LIFT);
        spr.setDepth(spr.y);
        spr.activity = p.activity;
        const facing = hold
            ? (Math.abs(player.x - spr.x) > Math.abs(player.y - spr.y) ? (player.x > spr.x ? 'right' : 'left') : (player.y > spr.y ? 'down' : 'up'))
            : p.facing;
        const pose = hold || (blocked && !spr.steer.side) ? 'idle' : p.pose;
        const anim = `${spr.texture.key}_${pose}_${facing}`;
        if (spr.anims.currentAnim?.key !== anim) spr.play(anim);
        spr.nameLabel?.setPosition(spr.x, spr.y - 30);
        spr.ePrompt?.setPosition(spr.x, spr.y - 40);
        spr.bubble?.setPosition(spr.x, spr.y - (spr.nameLabel ? 40 : 30));
    }

    lanterns(minutes) {
        if (!isNight(minutes)) return [];
        return [...this.live.values()].filter(s => s.resident.role === 'guard').map(s => ({ x: s.x, y: s.y }));
    }

    updatePrompts(near) { for (const s of this.live.values()) s.ePrompt?.setAlpha(near(s) && !s.bubble ? 1 : 0); }
    anyNear(near) { for (const s of this.live.values()) if (near(s)) return true; return false; }
    holdFor(spr, ms) { spr.holdUntil = this.scene.time.now + ms; }

    say(spr, text) {
        spr.bubble?.destroy();
        spr.bubble = this.scene.add.text(spr.x, spr.y - 30, text, {
            font: '7px monospace', fill: '#ffffff', backgroundColor: '#000000aa', padding: { x: 3, y: 2 },
            wordWrap: { width: 140 }, align: 'center',
        }).setOrigin(0.5, 1).setDepth(26).setResolution(3);
        const b = spr.bubble;
        this.scene.time.delayedCall(2600, () => { if (spr.bubble === b) { b.destroy(); spr.bubble = null; } });
    }

    destroy() {
        for (const [id, spr] of [...this.live]) this._despawn(id, spr);
        this.group.destroy(true);
    }
}
