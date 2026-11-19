// 2/3 — Extract the game's content (rules data + 3D regions) to /tmp/lore_review/game.json.
// Run from packages/rules: node ../../data/scripts/lore_review/ex.mjs
import fs from 'fs';
const R = new URL('../../../packages/rules/src/data/', import.meta.url).pathname;
const A = new URL('../../../apps/amo3d/src/content/', import.meta.url).pathname;
const imp = p => import(p);
const out = {};
const B = await imp(R + 'bestiary.js'), W = await imp(R + 'worldMap.js');
out.creatures = Object.entries(W.ENEMY_TYPES).map(([id, d]) => ({ id, name: d.name ?? null, lore: B.BESTIARY_LORE?.[id] ?? null }));
const N = await imp(R + 'npcs.js'); out.npcs = Object.entries(N.NPCS).map(([id, d]) => ({ id, name: d.name, place: N.npcPlace?.(id) ?? d.map ?? null, role: d.role ?? null, desc: d.description ?? d.desc ?? null }));
const C = await imp(R + 'characters.js'); out.characters = Object.entries(C.CHARACTERS).map(([id, d]) => ({ id, name: d.name, desc: (d.description ?? d.bio ?? d.lore ?? '').slice(0, 300) }));
const Q = await imp(R + 'quests.js'); out.quests = Object.entries(Q.QUESTS).map(([id, d]) => ({ id, title: d.title, type: d.type, desc: (d.description ?? '').slice(0, 300), giver: d.giver ?? null }));
const S = await imp(R + 'stories.js'); out.stories = Object.entries(S.STORIES).map(([id, d]) => ({ id, title: d.title ?? d.name ?? id, keys: Object.keys(d) }));
const I = await imp(R + 'items.js'); out.items = Object.entries(I.ITEMS).map(([id, d]) => ({ id, name: d.name, rarity: d.rarity ?? null, slot: d.slot ?? null, desc: (d.description ?? '').slice(0, 300), lore: d.lore ?? null }));
const SP = await imp(R + 'spells.js'); out.spells = Object.entries(SP.SPELLS).map(([id, d]) => ({ id, name: d.name, element: d.element, lore: d.lore ?? null }));
const ST = await imp(R + 'styles.js'); out.styles = Object.entries(ST.STYLES).map(([id, d]) => ({ id, name: d.name, desc: d.desc ?? d.description ?? null, teacher: d.teacher ?? null }));
const TF = await imp(R + 'townsfolk/index.js'); out.residents = (TF.getTown('thaloria')?.residents ?? []).map(r => ({ id: r.id, role: r.role, name: r.npc?.name ?? null }));
out.regions = fs.readdirSync(A + 'regions').filter(f => f.endsWith('.json')).map(f => { const d = JSON.parse(fs.readFileSync(A + 'regions/' + f)); return { id: d.id, name: d.name, lore: d.lore ?? null, landmarks: (d.landmarks ?? []).map(l => l.name ?? l.label ?? l.id), gates: (d.gates ?? []).map(g => g.name ?? g.label), signs: (d.signs ?? []).map(s => s.text ?? s.title), people: (d.people ?? []).map(p => ({ name: p.name, role: p.role, lines: p.lines ?? [], greeting: p.greeting ?? null })), links: (d.links ?? []).map(l => l.label ?? l.to), doors: (d.doors ?? []).map(l => l.label ?? l.to), beasts: (d.actors ?? []).filter(a => a.type === 'beasts').map(a => a.kind) }; });
fs.writeFileSync('/tmp/lore_review/game.json', JSON.stringify(out, null, 1));
for (const [k, v] of Object.entries(out)) console.log(k, v.length);
