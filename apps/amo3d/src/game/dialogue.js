// Dialogue — amo's DIALOGUES lines ({ speaker, text, ifFlag?, unlessFlag?, choices?: [{ text, setFlag?,
// startQuest?, next? }] }) shown at the bottom of the screen, letter by letter. G / E / Space / Enter /
// click: finish the line, then the next one; choices are buttons (or 1–4). The game pauses meanwhile.
// talk(person) follows amo's GameScene._talkToNpc: first the greeting, afterwards the after-dialogue;
// shops greet once, then open (onShop); teachers offer their style; anyone else answers with a bark.
import { dialogues as D, barks as B, styleData } from '@rules';

const { DIALOGUES } = D;

export function createDialogue({ stats, hud, onShop, onQuest, onTeach }) {
    const css = document.createElement('style');
    css.textContent = `
#dlg { position: fixed; left: 50%; bottom: 26px; transform: translateX(-50%); width: min(760px, 94vw); z-index: 9; display: none;
    padding: 16px 20px 14px; border: 1px solid #f3d88b66; border-radius: 10px; background: linear-gradient(180deg, #1a1620f2, #0e0b12f6);
    font: 17px/1.5 Georgia, serif; color: #eee6d2; box-shadow: 0 8px 30px #000b; cursor: pointer; }
#dlg.open { display: block; }
#dlg .who { color: #f3d88b; letter-spacing: .12em; font-size: 14px; text-transform: uppercase; margin-bottom: 6px; }
#dlg .more { position: absolute; right: 14px; bottom: 8px; font-size: 12px; opacity: .6; animation: blink 1.2s infinite; }
@keyframes blink { 50% { opacity: .15; } }
#dlg .choices { margin-top: 10px; display: grid; gap: 6px; }
#dlg .choices button { text-align: left; font: 15px Georgia, serif; color: #eee6d2; background: #2a1c10; border: 1px solid #f3d88b55; border-radius: 6px; padding: 7px 10px; cursor: pointer; }
#dlg .choices button:hover { border-color: #f3d88b; }
.bubble { position: fixed; left: 0; top: 0; z-index: 5; pointer-events: none; max-width: 240px; padding: 6px 10px; border-radius: 9px;
    background: #f6efe0; color: #2a2018; font: 14px Georgia, serif; box-shadow: 0 3px 10px #0008; transition: opacity .4s; }`;
    document.head.append(css);
    const root = document.createElement('div');
    root.id = 'dlg';
    const who = document.createElement('div'); who.className = 'who';
    const text = document.createElement('div');
    const choicesEl = document.createElement('div'); choicesEl.className = 'choices';
    const more = document.createElement('div'); more.className = 'more'; more.textContent = '▸ continue';
    root.append(who, text, choicesEl, more);
    document.body.append(root);

    let lines = [], i = 0, shown = 0, open = false, onDone = null, full = '';
    const flags = () => (stats.flags ??= {});
    const fits = l => (!l.ifFlag || flags()[l.ifFlag]) && (!l.unlessFlag || !flags()[l.unlessFlag]);

    function start(key, done = null) {
        lines = (Array.isArray(key) ? key : DIALOGUES[key] ?? []).filter(fits);
        if (!lines.length) { done?.(); return; }
        i = 0; onDone = done; open = true;
        root.classList.add('open');
        show();
    }
    function show() {
        const l = lines[i];
        who.textContent = l.speaker ?? '';
        full = l.text ?? ''; shown = 0; text.textContent = '';
        choicesEl.textContent = '';
        more.style.display = 'none';
    }
    function showChoices() {
        const l = lines[i];
        if (!l.choices) { more.style.display = ''; return; }
        l.choices.forEach((c, n) => {
            const b = document.createElement('button');
            b.textContent = `${n + 1}. ${c.text}`;
            b.onclick = e => { e.stopPropagation(); choose(c); };
            choicesEl.append(b);
        });
    }
    function choose(c) {
        if (c.setFlag) flags()[c.setFlag] = true;
        if (c.startQuest) onQuest?.(c.startQuest);
        if (c.next) { const done = onDone; close(false); start(c.next, done); return; }
        advance(true);
    }
    function advance(fromChoice = false) {
        if (!open) return;
        if (shown < full.length) { shown = full.length; text.textContent = full; showChoices(); return; }
        if (lines[i].choices && !fromChoice) return;   // pick one
        i++;
        if (i >= lines.length) close(true); else show();
    }
    function close(finished) {
        open = false;
        root.classList.remove('open');
        const done = onDone; onDone = null;
        if (finished) done?.();
    }
    root.addEventListener('pointerdown', () => advance());
    addEventListener('keydown', e => {
        if (!open) return;
        e.stopImmediatePropagation();   // the dialogue owns the keys while it is open
        if (['KeyG', 'KeyE', 'Space', 'Enter'].includes(e.code)) { e.preventDefault(); advance(); }
        const n = ['Digit1', 'Digit2', 'Digit3', 'Digit4'].indexOf(e.code);
        if (n >= 0 && lines[i]?.choices?.[n] && shown >= full.length) choose(lines[i].choices[n]);
        if (e.code === 'Escape') close(false);
    }, true);

    // Speech bubbles for barks.
    const bubbles = [];
    function say(person, line) {
        const el = document.createElement('div');
        el.className = 'bubble';
        el.textContent = line;
        document.body.append(el);
        bubbles.push({ el, person, t: 0 });
    }

    function talk(person, ctx) {
        const r = person.r, npc = r.npc;
        if (!npc) {
            const line = B.pickBark(r.role, { hour: ctx.hour ?? 12, weather: ctx.weather ?? 'clear', flags: flags() });
            say(person, line ?? '…');
            return;
        }
        const talkedKey = `talked_${npc.id}`;
        const name = npc.name.replace(/^./, c => c.toUpperCase());
        if (npc.teaches || npc.teachesElement) {
            const style = styleData.STYLES[npc.teaches];
            start([{ speaker: name, text: style ? `I teach the ${style.name} style — ${style.blurb.toLowerCase()} A lesson a day, if you have the coin.` : 'The old words still answer to those who listen. I can teach you, in time.' }],
                () => onTeach?.(npc));
            flags()[talkedKey] = true;
            return;
        }
        if (npc.isShop) {
            if (!flags()[talkedKey]) { flags()[talkedKey] = true; start(npc.dialogue, () => onShop?.(npc, person)); }
            else onShop?.(npc, person);
            return;
        }
        const key = flags()[talkedKey] ? npc.afterDialogue ?? npc.dialogue : npc.dialogue;
        flags()[talkedKey] = true;
        start(key ?? [{ speaker: name, text: '…' }]);
    }

    return {
        talk, start, say,
        get open() { return open; },
        update(dt, camera, project) {
            if (open && shown < full.length) {
                shown = Math.min(full.length, shown + dt * 55);
                text.textContent = full.slice(0, Math.floor(shown));
                if (shown >= full.length) showChoices();
            }
            for (let k = bubbles.length - 1; k >= 0; k--) {
                const b = bubbles[k];
                b.t += dt;
                const s = project(b.person.pos.x, (b.person.height ?? 2) + 0.4, b.person.pos.z);
                b.el.style.transform = `translate(${s.x}px, ${s.y}px) translate(-50%, -100%)`;
                b.el.style.opacity = s.visible && b.t < 3.6 ? 1 : 0;
                if (b.t > 4) { b.el.remove(); bubbles.splice(k, 1); }
            }
        },
    };
}
