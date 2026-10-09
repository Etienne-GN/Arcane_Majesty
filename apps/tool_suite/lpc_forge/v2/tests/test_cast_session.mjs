#!/usr/bin/env node
/** Unit tests for the Forge v2 cast editing session (pure). Run: node v2/tests/test_cast_session.mjs */
import { readFileSync } from 'node:fs';
import { buildCast } from '../src/model/cast.js';
import * as S from '../src/model/castSession.js';

const CAT = JSON.parse(readFileSync(new URL('../../../../amo/src/data/character_catalogue.json', import.meta.url)));
let passed = 0; const fails = [];
function check(name, got, want) {
    if (JSON.stringify(got) === JSON.stringify(want)) passed++;
    else fails.push(`${name}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
}

const base = { body: { id: 'bodies/male' }, head: { id: 'heads/human/male' } };
const eldrin = buildCast(CAT, { name: 'Eldrin', role: 'story', sel: base, variants: { hooded: { ...base, hat: { id: 'cloth/hood/adult' } } } });
const scratch = { name: 'My scratch', sel: { body: { id: 'bodies/female' } } };

// opening keeps the scratch composition aside and restores it on close
const st = { meta: null, comp: JSON.parse(JSON.stringify(scratch)), scratch: null };
S.open(st, eldrin, CAT);
check('opened name', st.comp.name, 'Eldrin');
check('clean after open', S.isDirty(st, CAT), false);
st.comp.sel.hair = { id: 'afro/adult' };
check('dirty after edit', S.isDirty(st, CAT), true);

// variants keep edits across switches
S.switchVariant(st, 'hooded');
check('variant sel', st.comp.sel.hat.id, 'cloth/hood/adult');
S.switchVariant(st, null);
check('base edit survived switch', st.comp.sel.hair.id, 'afro/adult');
check('duplicate variant refused', S.addVariant(st, 'Hooded'), false);
check('new variant accepted', S.addVariant(st, 'traveling'), true);
check('new variant is current', st.meta.variant, 'traveling');
S.removeVariant(st, 'traveling');
check('removed variant → back to base', [st.meta.variant, 'traveling' in st.meta.variants], [null, false]);

// current() is pure and saving marks clean
const before = JSON.stringify(st);
const c = S.current(st, CAT);
check('current is pure', JSON.stringify(st), before);
check('current carries the base edit', c.sel.hair.id, 'afro/adult');
S.markSaved(st, c);
check('clean after save', S.isDirty(st, CAT), false);
check('saved means on disk', st.meta.onDisk, true);

// closing restores scratch, untouched
S.close(st);
check('meta cleared', st.meta, null);
check('scratch restored', st.comp, scratch);

// creating a new member also keeps scratch aside
const st2 = { meta: null, comp: JSON.parse(JSON.stringify(scratch)), scratch: null };
S.create(st2, CAT);
check('new member', [st2.meta.onDisk, st2.comp.name], [false, 'New character']);
check('new member starts dirty (never saved)', S.isDirty(st2, CAT), true);
S.close(st2);
check('scratch back after new', st2.comp.name, 'My scratch');

// opening another member while one is open keeps the original scratch
const st3 = { meta: null, comp: JSON.parse(JSON.stringify(scratch)), scratch: null };
S.open(st3, eldrin, CAT);
S.open(st3, buildCast(CAT, { name: 'Kael', role: 'story', sel: base }), CAT);
S.close(st3);
check('scratch survives member→member', st3.comp.name, 'My scratch');

// a hand-edited variant without sel doesn't crash open
const odd = { ...eldrin, variants: { broken: { layers: [] } } };
const st4 = { meta: null, comp: JSON.parse(JSON.stringify(scratch)), scratch: null };
S.open(st4, odd, CAT);
check('variant without sel opens empty', st4.meta.variants.broken, {});

if (fails.length) { console.error(`✗ castSession: ${fails.length} failed\n  ` + fails.join('\n  ')); process.exit(1); }
console.log(`✓ castSession: ${passed} passed`);
