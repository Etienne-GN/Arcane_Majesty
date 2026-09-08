#!/usr/bin/env node
/**
 * The Eldoria's Prophecy campaign definition, checked against everything it
 * claims to reference — the map registry, the quest table, and the bible's
 * own twelve-song structure. This is what keeps the game aligned with
 * data/lore/campaigns/Eldorias_Prophecy_campaign.md as content lands; it
 * has nothing to do with CampaignManager's own logic (see
 * test_campaign_manager.mjs for that, tested entirely against fixtures).
 * Run: node tools/test_campaign_definition.mjs (or: npm run test:campaign-definition)
 */
import { ELDORIAS_PROPHECY } from '../src/data/campaigns/eldorias_prophecy.js';
import { getCampaign, listCampaigns } from '../src/data/campaigns/index.js';
import { getMap, listMaps } from '../src/data/maps/index.js';
import { QUESTS } from '../src/data/quests.js';

let passed = 0;
const fails = [];
function check(name, got, want) {
    const eq = JSON.stringify(got) === JSON.stringify(want);
    if (eq) passed++;
    else fails.push(`${name}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
}
function ok(name, cond) {
    if (cond) passed++;
    else fails.push(name);
}

const KNOWN_UNLOCK_TYPES = new Set(['item', 'weapon', 'spell', 'ability']);
const registeredMapIds = new Set(listMaps().map(m => m.id));

// ── Registry ──────────────────────────────────────────────────────────────
check('getCampaign resolves the real campaign', getCampaign('eldorias_prophecy').id, 'eldorias_prophecy');
check('getCampaign returns null for an unknown id', getCampaign('not_a_real_campaign'), null);
ok('listCampaigns includes eldorias_prophecy', listCampaigns().some(c => c.id === 'eldorias_prophecy'));

// ── Structure: 12 chapters, songs 1-12 each exactly once, in order ─────────
const chapters = ELDORIAS_PROPHECY.chapters;
check('twelve chapters', chapters.length, 12);
check('songs are 1..12 in order', chapters.map(c => c.song), Array.from({ length: 12 }, (_, i) => i + 1));
check('acts are non-decreasing', chapters.every((c, i) => i === 0 || c.act >= chapters[i - 1].act), true);
ok('every chapter id is unique', new Set(chapters.map(c => c.id)).size === chapters.length);

// ── Every referenced map is registered ──────────────────────────────────────
for (const chapter of chapters) {
    ok(`${chapter.id}: has at least one map`, Array.isArray(chapter.maps) && chapter.maps.length > 0);
    for (const mapId of chapter.maps) {
        ok(`${chapter.id}: map "${mapId}" is registered`, registeredMapIds.has(mapId));
    }
}

// ── Every referenced quest exists ───────────────────────────────────────────
for (const chapter of chapters) {
    ok(`${chapter.id}: has at least one quest`, Array.isArray(chapter.quests) && chapter.quests.length > 0);
    for (const qid of chapter.quests) {
        ok(`${chapter.id}: quest "${qid}" exists in QUESTS`, !!QUESTS[qid]);
    }
}

// ── Every unlock type is known ───────────────────────────────────────────────
for (const chapter of chapters) {
    for (const unlock of chapter.unlocks ?? []) {
        ok(`${chapter.id}: unlock type "${unlock.type}" is known`, KNOWN_UNLOCK_TYPES.has(unlock.type));
        ok(`${chapter.id}: unlock "${unlock.type}:${unlock.id}" has an id`, typeof unlock.id === 'string' && unlock.id.length > 0);
    }
}

// ── Chapters 1 and 4 are real content, not scaffolding ──────────────────────
check('chapter 1 uses the real quest', chapters[0].quests, ['main_read_the_erasure']);
check('chapter 4 uses the real quest', chapters.find(c => c.song === 4).quests, ['main_whisperer_of_doubt']);
ok('chapter 1\'s maps exist as real map defs (not scaffolding)',
    chapters[0].maps.every(id => !!getMap(id).chapterTitle || id === 'eldrin_tower'));

// ── Every stub map's own portal chain lands on a map that exists ──────────
for (const mapId of registeredMapIds) {
    const def = getMap(mapId);
    for (const portal of def.portals ?? []) {
        ok(`${mapId}'s portal "${portal.id}" targets a registered map ("${portal.targetMap}")`,
            registeredMapIds.has(portal.targetMap));
    }
}

if (fails.length) {
    console.error(`✗ campaign-definition tests FAILED — ${fails.length}/${passed + fails.length}:`);
    for (const f of fails) console.error('  ' + f);
    process.exit(1);
}
console.log(`✓ campaign-definition tests passed (${passed}).`);
