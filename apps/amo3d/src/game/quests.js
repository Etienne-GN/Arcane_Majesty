// Quests — amo's questManager unchanged (it works on amo's shared playerStats, which the 3D game uses):
// givers offer their quest after talking (QUESTS[...].offer), progress comes from the game's events
// (kills, gathering, attuning, pickups, cooking, talking), rewards are amo's. The journal (J / touch QST)
// lists active and finished quests with each step's progress (questRules.questSteps).
import { QuestManager as QM, questRules as QR, quests as Q } from '@rules';

const { questManager } = QM;
const { QUESTS } = Q;

export function createQuests({ stats, hud }) {
    const css = document.createElement('style');
    css.textContent = `
#journal { position: fixed; inset: 0; z-index: 9; display: none; place-items: center; background: #05060acc; font-family: Georgia, serif; color: #eee6d2; }
#journal.open { display: grid; }
#journal .panel { width: min(680px, 94vw); max-height: 88vh; overflow: auto; padding: 18px 22px; border: 1px solid #f3d88b66; border-radius: 14px; background: linear-gradient(160deg, #201a14ee, #0e0b08f4); }
#journal h2 { margin: 0 0 10px; font-weight: normal; letter-spacing: .16em; color: #f3d88b; font-size: calc(24px * var(--ui, 1)); }
#journal h3 { margin: 14px 0 6px; font-weight: normal; font-size: calc(14px * var(--ui, 1)); letter-spacing: .12em; text-transform: uppercase; opacity: .7; }
#journal .q { padding: 10px 12px; margin-bottom: 8px; border-radius: 8px; background: #ffffff0a; border: 1px solid #ffffff14; }
#journal .t { font-size: calc(18px * var(--ui, 1)); } #journal .t small { font-size: calc(14px * var(--ui, 1)); opacity: .6; letter-spacing: .1em; text-transform: uppercase; margin-left: 6px; }
#journal .d { font-size: calc(15px * var(--ui, 1)); opacity: .75; margin: 4px 0 6px; }
#journal .s { font-size: calc(15px * var(--ui, 1)); } #journal .s.done { opacity: .5; text-decoration: line-through; }
#journal .close { float: right; font: calc(15px * var(--ui, 1)) Georgia, serif; color: #eee6d2; background: transparent; border: 1px solid #eee6d255; border-radius: 7px; padding: 6px 12px; cursor: pointer; }`;
    document.head.append(css);
    const root = document.createElement('div');
    root.id = 'journal';
    document.body.append(root);
    let open = false;
    const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };

    questManager.onQuestEvent((id, step, progress) => {
        const q = questManager.questDef(id);
        if (!q) return;
        if (progress === -1) hud.banner(`Quest complete — ${q.title}`);
        else if (step === null) hud.banner(`New quest — ${q.title}`);
        else hud.message(`${q.title}: ${QR.questSteps(q).find(s => s.id === step)?.label ?? step} (${progress})`);
        if (open) render();
    });

    function render() {
        root.textContent = '';
        const p = el('div', 'panel');
        const close = el('button', 'close', 'Close ✕'); close.onclick = () => toggle();
        p.append(close, el('h2', null, 'Journal'));
        const log = stats.questLog ?? {};
        const ids = Object.keys(log);
        for (const [title, status] of [['Under way', 'active'], ['Done', 'completed']]) {
            const list = ids.filter(id => log[id].status === status).map(id => questManager.questDef(id)).filter(Boolean);
            if (!list.length) continue;
            p.append(el('h3', null, title));
            for (const q of list) {
                const box = el('div', 'q');
                const t = el('div', 't', q.title);
                t.append(el('small', null, q.type ?? ''));
                box.append(t, el('div', 'd', q.description ?? ''));
                if (status === 'active') for (const s of QR.questSteps(q)) {
                    const n = s.type === 'have' ? Math.min(s.required, stats.countItem(s.target)) : log[q.id]?.progress?.[s.id] ?? 0;
                    box.append(el('div', `s${n >= s.required ? ' done' : ''}`, `• ${s.label.replace(/\(\d+\/\d+\)/, '')}${s.required > 1 ? ` (${n}/${s.required})` : ''}`));
                }
                p.append(box);
            }
        }
        if (!ids.length) p.append(el('div', 'd', 'No quests yet. People in Thaloria may have work for a scholar.'));
        root.append(p);
    }
    function toggle() { open = !open; root.classList.toggle('open', open); if (open) render(); }
    addEventListener('keydown', e => { if (e.code === 'KeyJ') toggle(); else if (open && e.code === 'Escape') toggle(); });

    return {
        toggle, get open() { return open; },
        manager: questManager,
        // After talking to a named person: count the talk, then offer their quest if one can start.
        afterTalk(npcId, name, startDialogue) {
            questManager.onTalk(npcId);
            const q = questManager.offerFor(npcId, () => true);
            if (!q || !startDialogue) return;
            startDialogue([{ speaker: name, text: q.offer ?? q.description, choices: [
                { text: `Accept — ${q.title}`, startQuest: q.id },
                { text: 'Not now.' },
            ] }]);
        },
        onKill: type => questManager.onKill(type),
        onGather: (id, n) => questManager.onGather(id, n),
        onAttune: id => questManager.onAttune(id),
        onPickup: id => { questManager.onPickup(id); questManager.recheck(); },
        onCook: id => questManager.onCook(id),
        start: id => questManager.startQuest(id),
        all: QUESTS,
    };
}
