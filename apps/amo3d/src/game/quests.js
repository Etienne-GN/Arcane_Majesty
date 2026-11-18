import { sfx } from '../engine/sfx.js';
// Quests — amo's questManager unchanged (it works on amo's shared playerStats, which the 3D game uses):
// givers offer their quest after talking (QUESTS[...].offer), progress comes from the game's events
// (kills, gathering, attuning, pickups, cooking, talking), rewards are amo's. The journal (J / touch QST)
// is a pocket notebook: handwritten notes on ruled paper, steps ticked and crossed out as they are done,
// finished quests struck through (questRules.questSteps for each step's progress).
import '@fontsource/caveat/500.css';
import '@fontsource/caveat/700.css';
import { QuestManager as QM, questRules as QR, quests as Q } from '@rules';

const { questManager } = QM;
const { QUESTS } = Q;

export function createQuests({ stats, hud }) {
    const css = document.createElement('style');
    // A pocket notebook: ruled paper, a red margin, a pencil hand; steps get ticked and crossed out, finished
    // quests are struck through with a heavier stroke.
    css.textContent = `
#journal { position: fixed; inset: 0; z-index: 9; display: none; place-items: center; background: #05060acc; color: #2a2014; font-family: Caveat, 'Segoe Script', cursive; }
#journal.open { display: grid; }
#journal .nb { position: relative; width: min(460px, 92vw); height: min(620px, calc(100vh - 40px)); margin-top: 14px; border-radius: 6px 12px 12px 6px; padding: 10px 10px 10px 18px; box-sizing: border-box;
  background: linear-gradient(90deg, #2a1a10, #4a2e1a 8%, #3a2414); box-shadow: 0 12px 34px #000c, inset 0 0 0 2px #1a0e06; transform: rotate(-.6deg); }
#journal .band { position: absolute; top: -6px; bottom: -6px; right: 34px; width: 12px; background: linear-gradient(90deg, #5a1a14, #8a2a20, #5a1a14); border-radius: 3px; box-shadow: 0 0 4px #0008; z-index: 2; }
#journal .paper { position: relative; height: 100%; overflow: auto; touch-action: pan-y; border-radius: 2px 8px 8px 2px; padding: 8px 54px 22px 50px; box-sizing: border-box;
  background-color: #f4ecd6; background-image: linear-gradient(90deg, transparent 38px, #d0645a99 38px, #d0645a99 40px, transparent 40px), repeating-linear-gradient(transparent 0, transparent calc(30px * var(--ui, 1) - 1px), #8aa4c855 calc(30px * var(--ui, 1) - 1px), #8aa4c855 calc(30px * var(--ui, 1)));
  background-attachment: local; box-shadow: inset 10px 0 14px -10px #0006; line-height: calc(30px * var(--ui, 1)); font-size: calc(22px * var(--ui, 1)); scrollbar-width: thin; scrollbar-color: #8a6a3a transparent; }
#journal h2 { margin: 0; font: 700 calc(30px * var(--ui, 1)) Caveat, cursive; line-height: calc(60px * var(--ui, 1)); color: #3a2410; }
#journal h3 { margin: 0; font: 700 calc(20px * var(--ui, 1)) Caveat, cursive; line-height: calc(30px * var(--ui, 1)); color: #8a3a1a; text-transform: lowercase; letter-spacing: .04em; }
#journal .q { margin: 0 0 calc(30px * var(--ui, 1)); }
#journal .t { position: relative; font-weight: 700; font-size: calc(24px * var(--ui, 1)); color: #1e1a3a; }
#journal .t small { font-weight: 500; font-size: calc(16px * var(--ui, 1)); color: #6a5a4a; margin-left: 8px; }
#journal .d { color: #4a3a2a; }
#journal .s { position: relative; color: #1e1a3a; }
#journal .s::before { content: '☐'; position: absolute; left: -26px; color: #5a4a3a; }
#journal .s.done { color: #6a5a4a; text-decoration: line-through; text-decoration-thickness: 2px; text-decoration-color: #2a2014cc; }
#journal .s.done::before { content: '☑'; color: #3a6a2a; }
#journal .q.finished .t { text-decoration: line-through; text-decoration-thickness: 3px; text-decoration-color: #8a2a1acc; color: #6a5a4a; }
#journal .q.finished .t::before { content: '✓'; position: absolute; left: -34px; color: #8a2a1a; font-size: 1.2em; transform: rotate(-8deg); }
#journal .q.finished .d { color: #8a7a6a; }
#journal .close { position: absolute; right: -10px; top: -10px; z-index: 3; width: 40px; height: 40px; border-radius: 50%; border: 0; cursor: pointer; color: #f4d8b0; font: bold 16px Georgia, serif;
  background: radial-gradient(circle at 40% 35%, #8a3a2a, #4a1a10); box-shadow: 0 2px 6px #000a; }
#journal .empty { color: #6a5a4a; }`;
    document.head.append(css);
    const root = document.createElement('div');
    root.id = 'journal';
    document.body.append(root);
    let open = false;
    const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };

    questManager.onQuestEvent((id, step, progress) => {
        const q = questManager.questDef(id);
        if (!q) return;
        if (progress === -1) { hud.banner(`Quest complete — ${q.title}`); sfx.quest(); }
        else if (step === null) hud.banner(`New quest — ${q.title}`);
        else hud.message(`${q.title}: ${QR.questSteps(q).find(s => s.id === step)?.label ?? step} (${progress})`);
        if (open) render();
    });

    function render() {
        root.textContent = '';
        const nb = el('div', 'nb'), paper = el('div', 'paper');
        const close = el('button', 'close', '✕'); close.title = 'Close'; close.onclick = () => toggle();
        paper.append(el('h2', null, 'My notes'));
        const log = stats.questLog ?? {};
        const ids = Object.keys(log);
        for (const [title, status] of [['to do', 'active'], ['done', 'completed']]) {
            const list = ids.filter(id => log[id].status === status).map(id => questManager.questDef(id)).filter(Boolean);
            if (!list.length) continue;
            paper.append(el('h3', null, title));
            for (const q of list) {
                const box = el('div', `q${status === 'completed' ? ' finished' : ''}`);
                const t = el('div', 't', q.title);
                if (q.type === 'main') t.append(el('small', null, '(the main road)'));
                box.append(t, el('div', 'd', q.description ?? ''));
                if (status === 'active') for (const s of QR.questSteps(q)) {
                    const n = s.type === 'have' ? Math.min(s.required, stats.countItem(s.target)) : log[q.id]?.progress?.[s.id] ?? 0;
                    box.append(el('div', `s${n >= s.required ? ' done' : ''}`, `${s.label.replace(/\(\d+\/\d+\)/, '').trim()}${s.required > 1 ? ` — ${n}/${s.required}` : ''}`));
                }
                paper.append(box);
            }
        }
        if (!ids.length) paper.append(el('div', 'empty', 'Nothing yet. People in Thaloria may have work for a scholar.'));
        nb.append(el('div', 'band'), paper, close);
        root.append(nb);
    }
    root.addEventListener('click', e => { if (e.target === root) toggle(); });
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
        onKill: (type, ctx = {}) => questManager.onKill(type, ctx),
        onGather: (id, n) => questManager.onGather(id, n),
        onAttune: id => questManager.onAttune(id),
        onPickup: id => { questManager.onPickup(id); questManager.recheck(); },
        onCook: id => questManager.onCook(id),
        start: id => questManager.startQuest(id),
        all: QUESTS,
    };
}
