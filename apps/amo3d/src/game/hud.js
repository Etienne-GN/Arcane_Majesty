import { sfx } from '../engine/sfx.js';
// HUD: bars, the spell slot, banners, messages, the door prompt, damage floaters, hurt vignette.
import * as THREE from 'three';
import { statuses } from '@rules';

const { STATUS_DEFS } = statuses;
const PERF = new URLSearchParams(location.search).has('perf');

// H toggles the controls card; the little hint fades after a while.
addEventListener('keydown', e => { if (e.code === 'KeyH' && !e.repeat && !/INPUT|TEXTAREA/.test(document.activeElement?.tagName)) document.body.classList.toggle('help-on'); });
setTimeout(() => { const h = document.getElementById('help-hint'); if (h) h.style.opacity = 0; }, 25000);

export function createHud() {
    const $ = id => document.getElementById(id);
    const ui = {
        vFill: $('vigor-fill'), vBar: $('vigor'), vNum: $('vigor-num'),
        mFill: $('mana-fill'), mNum: $('mana-num'), hFill: $('hp-fill'), hNum: $('hp-num'), lvl: $('lvl'), hurt: $('hurt'),
        speed: $('speed'), slotName: $('slot-name'), slotCd: $('slot-cd'), slot: $('slot'), slotCost: $('slot-cost'),
        banner: $('banner'), prompt: $('prompt'), msg: $('msg'), fade: $('fade'), fadeText: $('fade-text'), floaters: $('floaters'),
    };
    let bannerT = 0, msgT = 0, hurtK = 0;
    // Status icons (buffs and debuffs on Eldrin): amo label, tint and time left.
    const icons = document.createElement('div');
    icons.id = 'statusfx';
    icons.style.cssText = 'position:fixed;left:18px;bottom:236px;display:flex;flex-wrap:wrap;gap:6px;max-width:300px;pointer-events:none;z-index:4';
    document.body.append(icons);
    let iconKey = '';
    const floaters = [];
    const tmp = new THREE.Vector3();

    // Game Over (amo GameOverScene): a dark veil, a line, and where you will wake.
    const over = document.createElement('div');
    over.style.cssText = 'position:fixed;inset:0;z-index:7;pointer-events:none;display:grid;place-items:center;background:radial-gradient(ellipse at center,#1a0606c0,#000e);opacity:0;transition:opacity 1.2s;font-family:Georgia,serif;text-align:center;color:#e8d6c0';
    over.innerHTML = '<div><div class="t" style="font-size:calc(40px * var(--ui,1));letter-spacing:.3em;color:#c8443a">FALLEN</div><div class="s" style="margin-top:10px;font-size:calc(17px * var(--ui,1));opacity:.85"></div></div>';
    document.body.append(over);
    let overT = 0;
    return {
        ui,
        gameOver(name, where) { sfx.death(); over.querySelector('.s').textContent = `${name} falls… and wakes ${where ? `at ${where}` : 'at the last place of rest'}.`; over.style.opacity = 1; overT = 3.4; },
        banner(text) { ui.banner.textContent = text; ui.banner.style.opacity = 1; bannerT = 2.5; },
        message(text) { ui.msg.textContent = text; ui.msg.style.opacity = 1; msgT = 1.4; },
        hurt() { hurtK = 0.75; sfx.hurt(); },
        prompt(label) {
            ui.prompt.textContent = label ? `⟶ ${label}` : '';
            ui.prompt.style.opacity = label ? 1 : 0;
        },
        floater(pos, text, color) {
            const el = document.createElement('div');
            el.className = 'floater';
            el.textContent = text;
            el.style.color = color;
            ui.floaters.append(el);
            floaters.push({ el, pos, t: 0 });
        },

        update(dt, { stats: s, player, camera, spell }) {
            if (overT > 0 && (overT -= dt) <= 0) over.style.opacity = 0;
            ui.vFill.style.width = `${(s.vigor / s.maxVigor) * 100}%`;
            ui.vBar.classList.toggle('winded', s.vigorWinded);
            ui.vNum.textContent = `${Math.round(s.vigor)} / ${s.maxVigor}${s.vigorWinded ? ' · winded' : ''}`;
            ui.hFill.style.width = `${(s.health / s.maxHealth) * 100}%`;
            ui.hNum.textContent = `${Math.ceil(s.health)} / ${s.maxHealth}`;
            ui.lvl.textContent = `Level ${s.level} · ${s.xp} / ${s.xpToNextLevel} XP`;
            ui.mFill.style.width = `${(s.mana / s.maxMana) * 100}%`;
            ui.mNum.textContent = `${Math.round(s.mana)} / ${s.maxMana}${s.fatigueFraction > 0 ? ` · fatigue ${Math.round(s.fatigueFraction * 100)}%` : ''}`;
            ui.speed.textContent = PERF ? `${player.speed.toFixed(1)} m/s${player.hop ? ' · hop' : ''}${player.sprinting ? ' · sprint' : ''}` : '';   // a debug readout: ?perf=1
            const cd = s.spellCooldowns[spell.id] ?? 0;
            ui.slotCd.style.height = `${Math.min(1, cd / spell.cooldown[0]) * 100}%`;
            ui.slot.classList.toggle('dry', s.mana < s.getSpellManaCost(spell.id));
            ui.slotCost.textContent = s.getSpellManaCost(spell.id);
            if (ui.slotName.textContent !== spell.name) {   // the chosen spell's name, colour by element
                ui.slotName.textContent = spell.name;
                const tb = document.querySelector('#touch .fire'); if (tb) tb.textContent = spell.name.split(' ')[0].toUpperCase().slice(0, 7);
                // The fiery slot, turned to the spell's element.
                const HUE = { fire: 0, arcane: 230, lightning: 40, shadow: 260, void: 270, earth: 15, water: 180, ice: 170, air: 110, light: 45, nature: 90 };
                const f = `hue-rotate(${HUE[spell.element] ?? 230}deg)${spell.element === 'light' || spell.element === 'lightning' ? ' saturate(.6) brightness(1.3)' : ''}`;
                ui.slot.style.filter = f; if (tb) tb.style.filter = f;
            }

            const list = Object.entries(player.buffs ?? {});
            const key = list.map(([id, b]) => `${id}:${Math.ceil(b.left)}`).join('|');
            if (key !== iconKey) {
                iconKey = key;
                icons.textContent = '';
                for (const [id, b] of list) {
                    const d = STATUS_DEFS[id];
                    const tag = document.createElement('div');
                    const tint = `#${(d?.tint ?? 0xcccccc).toString(16).padStart(6, '0')}`;
                    tag.style.cssText = `font:calc(14px * var(--ui, 1)) Georgia,serif;color:#eee6d2;padding:3px 8px;border-radius:7px;background:#000a;border:1px solid ${tint};text-shadow:0 1px 2px #000`;
                    tag.textContent = `${d?.label ?? id} ${Math.ceil(b.left)}s`;
                    icons.append(tag);
                }
            }
            if ((bannerT -= dt) <= 0) ui.banner.style.opacity = 0;
            if ((msgT -= dt) <= 0) ui.msg.style.opacity = 0;
            hurtK = Math.max(0, hurtK - dt * 1.5);
            ui.hurt.style.opacity = hurtK;

            for (let i = floaters.length - 1; i >= 0; i--) {
                const f = floaters[i];
                f.t += dt;
                tmp.copy(f.pos).setY(f.pos.y + f.t * 0.8).project(camera);
                f.el.style.transform = `translate(${(tmp.x * 0.5 + 0.5) * innerWidth}px, ${(-tmp.y * 0.5 + 0.5) * innerHeight}px) translate(-50%, -50%) scale(${1 + Math.max(0, 0.3 - f.t)})`;
                f.el.style.opacity = Math.max(0, 1 - Math.max(0, f.t - 0.7) / 0.6);
                if (f.t > 1.3 || tmp.z > 1) { f.el.remove(); floaters.splice(i, 1); }
            }
        },
    };
}
