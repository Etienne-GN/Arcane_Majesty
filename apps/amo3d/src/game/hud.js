// HUD: bars, the spell slot, banners, messages, the door prompt, damage floaters, hurt vignette.
import * as THREE from 'three';

export function createHud() {
    const $ = id => document.getElementById(id);
    const ui = {
        vFill: $('vigor-fill'), vBar: $('vigor'), vNum: $('vigor-num'),
        mFill: $('mana-fill'), mNum: $('mana-num'), hFill: $('hp-fill'), hNum: $('hp-num'), lvl: $('lvl'), hurt: $('hurt'),
        speed: $('speed'), slotCd: $('slot-cd'), slot: $('slot'), slotCost: $('slot-cost'),
        banner: $('banner'), prompt: $('prompt'), msg: $('msg'), fade: $('fade'), fadeText: $('fade-text'), floaters: $('floaters'),
    };
    let bannerT = 0, msgT = 0, hurtK = 0;
    const floaters = [];
    const tmp = new THREE.Vector3();

    return {
        ui,
        banner(text) { ui.banner.textContent = text; ui.banner.style.opacity = 1; bannerT = 2.5; },
        message(text) { ui.msg.textContent = text; ui.msg.style.opacity = 1; msgT = 1.4; },
        hurt() { hurtK = 0.75; },
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
            ui.vFill.style.width = `${(s.vigor / s.maxVigor) * 100}%`;
            ui.vBar.classList.toggle('winded', s.vigorWinded);
            ui.vNum.textContent = `${Math.round(s.vigor)} / ${s.maxVigor}${s.vigorWinded ? ' · winded' : ''}`;
            ui.hFill.style.width = `${(s.health / s.maxHealth) * 100}%`;
            ui.hNum.textContent = `${Math.ceil(s.health)} / ${s.maxHealth}`;
            ui.lvl.textContent = `Level ${s.level} · ${s.xp} / ${s.xpToNextLevel} XP`;
            ui.mFill.style.width = `${(s.mana / s.maxMana) * 100}%`;
            ui.mNum.textContent = `${Math.round(s.mana)} / ${s.maxMana}${s.fatigueFraction > 0 ? ` · fatigue ${Math.round(s.fatigueFraction * 100)}%` : ''}`;
            ui.speed.textContent = `${player.speed.toFixed(1)} m/s${player.hop ? ' · hop' : ''}${player.sprinting ? ' · sprint' : ''}`;
            const cd = s.spellCooldowns[spell.id] ?? 0;
            ui.slotCd.style.height = `${Math.min(1, cd / spell.cooldown[0]) * 100}%`;
            ui.slot.classList.toggle('dry', s.mana < s.getSpellManaCost(spell.id));
            ui.slotCost.textContent = s.getSpellManaCost(spell.id);

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
