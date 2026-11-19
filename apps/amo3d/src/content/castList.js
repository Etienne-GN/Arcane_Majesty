// Every person in the game, as the game dresses them — for the Forge's cast list ("Open a cast member…"), where each
// can be opened on the turntable and given notes (saved to src/content/npc_notes/<id>.json through the dev API
// /api/npcnotes; Claude reads them: "process the NPC notes"). Thaloria's residents (townsfolk.js lookFor, by role),
// the villagers of every region (villagers.js lookFor, by archetype), and the story's people (storyLooks.js).
import { townsfolk as TF } from '@rules';
import { lookFor as townLook } from './actors/townsfolk.js';
import { lookFor as villagerLook } from './actors/villagers.js';
import { LOOKS, OREN_ROAD, HERMIT } from './storyLooks.js';

const REGIONS = Object.values(import.meta.glob('./regions/*.json', { eager: true, import: 'default' }));
const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40);
const title = s => String(s).replace(/(^|_)([a-z])/g, (m, a, b) => `${a ? ' ' : ''}${b.toUpperCase()}`);

export function npcCast() {
    const out = [];
    const story = [['oren', 'Oren (the betrayal)', LOOKS.oren], ['oren_road', 'Oren (the East Road)', OREN_ROAD], ['xarathos', 'Xarathos, the Pyre-Lord', LOOKS.xarathos],
        ['voraun', 'Voraun, the Silent Executioner', LOOKS.voraun], ['vorgos', 'Vorgos', LOOKS.vorgos], ['hermit', 'The Hermit', HERMIT]];
    for (const [id, name, look] of story) if (look) out.push({ id: `story_${id}`, name, group: 'Story', look });
    for (const r of TF.getTown('thaloria')?.residents ?? []) out.push({ id: slug(`thaloria_${r.id}`), name: `${r.npc?.name ?? r.name ?? title(r.id)} — ${r.role ?? 'resident'}`, group: 'Thaloria', look: townLook(r) });
    for (const reg of REGIONS) (reg.people ?? []).forEach((p, i) => out.push({ id: slug(`${reg.id}_${p.name}`), name: `${p.name}${p.role ? ` — ${p.role}` : ''}`, group: reg.name ?? title(reg.id), look: villagerLook(p, i) }));
    return out;
}
