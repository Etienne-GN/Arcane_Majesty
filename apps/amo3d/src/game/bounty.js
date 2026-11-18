// The bounty board (amo data/bounties.js, unchanged): three seeded bounties a game day — hunt N of a regional
// creature, bring down an elite, or bring N of a gathered item — paid by the region's level band; one active
// at a time; given and turned in at the board. Thaloria's board posts bounties for the East Road (amo's
// spawns.bountyBoards region). Using the board turns in a finished bounty first (questManager.onTalk).
import { bounties as B, questRules as QR, QuestManager as QM, gameClock, levelBands, enemies, items as itemRules } from '@rules';

const { questManager } = QM;
const KIND = { hunt: ['HUNT', '#ff9955'], elite: ['ELITE', '#ffcc33'], gather: ['GATHER', '#88dd88'] };

export function createBountyBoard({ stats, hud, save }) {
    const css = document.createElement('style');
    css.textContent = `
#bounty { position: fixed; inset: 0; z-index: 9; display: none; place-items: center; background: #05060acc; font-family: Georgia, serif; color: #eee6d2; }
#bounty.open { display: grid; }
#bounty .panel { width: min(720px, 94vw); max-height: 88vh; overflow: auto; padding: 18px 22px; border: 1px solid #c9a46a88; border-radius: 14px;
    background: linear-gradient(160deg, #2a2016f0, #120d08f6); }
#bounty h2 { margin: 0 0 4px; font-weight: normal; letter-spacing: .16em; color: #f3d88b; font-size: calc(24px * var(--ui, 1)); }
#bounty .sub { font-size: calc(15px * var(--ui, 1)); opacity: .75; margin-bottom: 10px; }
#bounty h3 { margin: 14px 0 6px; font-weight: normal; font-size: calc(14px * var(--ui, 1)); letter-spacing: .12em; text-transform: uppercase; opacity: .7; }
#bounty .o { display: flex; gap: 12px; align-items: flex-start; padding: 12px; margin-bottom: 8px; border-radius: 8px; background: #f3e2b00d; border: 1px solid #f3e2b022; }
#bounty .o.taken { opacity: .5; }
#bounty .tag { min-width: 66px; text-align: center; padding: 3px 0; border-radius: 4px; border: 1px solid; font-size: calc(13px * var(--ui, 1)); letter-spacing: .1em; }
#bounty .body { flex: 1; }
#bounty .t { font-size: calc(18px * var(--ui, 1)); color: #f3e2b0; }
#bounty .d { font-size: calc(15px * var(--ui, 1)); opacity: .8; margin: 3px 0; }
#bounty .r { font-size: calc(14px * var(--ui, 1)); color: #d8b45a; }
#bounty button.take { font: calc(15px * var(--ui, 1)) Georgia, serif; padding: 8px 14px; border-radius: 8px; border: 1px solid #f3d88b; background: #3a2a14; color: #fff3d0; cursor: pointer; }
#bounty button.take[disabled] { border-color: #6a5a40; background: transparent; color: #a89878; cursor: default; }
#bounty .s { font-size: calc(15px * var(--ui, 1)); } #bounty .s.done { opacity: .5; text-decoration: line-through; }
#bounty .msg { margin-top: 8px; color: #9fe0a0; font-size: calc(15px * var(--ui, 1)); min-height: 1.2em; }
#bounty .close { float: right; font: calc(15px * var(--ui, 1)) Georgia, serif; color: #eee6d2; background: transparent; border: 1px solid #eee6d255; border-radius: 7px; padding: 6px 12px; cursor: pointer; }`;
    document.head.append(css);
    const root = document.createElement('div');
    root.id = 'bounty';
    document.body.append(root);
    const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
    let ctx = null, msg = '';
    const names = { itemName: id => itemRules.ITEMS[id]?.name ?? id };

    function view() { return B.boardView(stats, ctx.boardId, ctx.day, ctx.pools, ctx.band, ctx.where); }

    function render() {
        root.textContent = '';
        const st = view(), p = el('div', 'panel');
        const close = el('button', 'close', 'Close ✕'); close.onclick = () => toggle(false);
        p.append(close, el('h2', null, 'Bounty Board'), el('div', 'sub', `${ctx.where.place} — bounties for ${ctx.where.region} · levels ${ctx.band.min}–${ctx.band.max} · new ones every day`));
        p.append(el('h3', null, "Today's bounties"));
        st.offers.forEach((offer, i) => {
            const d = offer.def, active = st.active === d.id;
            const row = el('div', `o${offer.taken && !active ? ' taken' : ''}`);
            const [tag, color] = KIND[d.kind] ?? ['?', '#ccc'];
            const t = el('div', 'tag', tag); t.style.color = color; t.style.borderColor = color;
            const body = el('div', 'body');
            body.append(el('div', 't', d.title), el('div', 'd', d.description), el('div', 'r', `Reward: ${QR.rewardParts(d.reward, names).join(', ')}`));
            const label = active ? 'Active' : offer.taken ? 'Taken' : st.active ? '—' : 'Accept';
            const b = el('button', 'take', label);
            b.disabled = label !== 'Accept';
            b.onclick = () => accept(i);
            row.append(t, body, b);
            p.append(row);
        });
        const activeDef = st.active ? questManager.questDef(st.active) : null;
        if (activeDef) {
            p.append(el('h3', null, 'Under way'));
            const det = QR.questDetail(activeDef, stats.questLog[st.active], { countItem: id => stats.countItem?.(id) ?? 0, isCompleted: id => questManager.isCompleted(id), titleOf: id => id, ...names });
            const box = el('div', 'o');
            const body = el('div', 'body');
            body.append(el('div', 't', activeDef.title));
            for (const s of det.steps) body.append(el('div', `s${s.done ? ' done' : ''}`, `• ${s.text}`));
            body.append(el('div', 'd', 'Come back to the board when it is done.'));
            box.append(body);
            p.append(box);
        }
        p.append(el('div', 'msg', msg));
        root.append(p);
    }

    function accept(i) {
        const res = B.acceptBounty(stats, ctx.boardId, i);
        if (res.ok) { questManager.startQuest(res.questId); msg = 'Bounty accepted — it is in your journal.'; save?.(); }
        else msg = { busy: 'Finish your current bounty first.', taken: 'You already took that one today.' }[res.reason] ?? '';
        render();
    }

    function toggle(on = !root.classList.contains('open')) {
        root.classList.toggle('open', on);
        if (on) render(); else msg = '';
    }
    addEventListener('keydown', e => { if (root.classList.contains('open') && e.code === 'Escape') toggle(false); });

    return {
        get open() { return root.classList.contains('open'); },
        toggle,
        // station: { key: boardId, regionDef, place }
        use(station) {
            const st = stats.bounties?.[station.key], before = st?.active;
            questManager.onTalk(station.key);   // turns in a finished bounty (and hands over gathered items)
            const turnedIn = !!before && questManager.isCompleted(before);
            if (turnedIn) { hud.banner('Bounty complete'); save?.(); }
            const region = station.regionDef;
            ctx = {
                boardId: station.key,
                day: gameClock.gameDay(stats.gameMinutes ?? 0),
                pools: B.regionPools(region, enemies.ENEMY_TYPES),
                band: levelBands.mapLevelBand(region),
                where: { region: region.displayName ?? region.id, place: station.place, regionId: region.id },
            };
            msg = turnedIn ? 'Bounty turned in — well done.' : '';
            toggle(true);
        },
    };
}
