#!/usr/bin/env node
/** Unit tests for Forge flags (model). Run: node v2/tests/test_flags.mjs */
import { flagErrors, flagTarget, describeFlag, newFlag, applyStatus, FLAG_STATUSES } from '../src/model/gapFlags.js';

let passed = 0; const fails = [];
function check(name, got, want) {
    if (JSON.stringify(got) === JSON.stringify(want)) passed++;
    else fails.push(`${name}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
}
const base = { id: 'f1', reason: 'looks_broken', status: 'open', comment: 'x', createdAt: '2026-10-10T00:00:00Z' };

// targets
check('legacy gap flag = motion target', flagTarget({ ...base, key: 'cape|solid/female|', motion: 'run' }), 'motion');
check('item', flagErrors([{ ...base, target: 'item', key: 'cape|solid/female|' }]), []);
check('motion', flagErrors([{ ...base, target: 'motion', key: 'cape|solid/female|', motion: 'run' }]), []);
check('frame', flagErrors([{ ...base, target: 'frame', key: 'cape|solid/female|', motion: 'run', dir: 'left', frame: 3 }]), []);
check('frame of the whole character', flagErrors([{ ...base, target: 'frame', cast: 'eldrin', motion: 'run', dir: 'left', frame: 3 }]), []);
check('character', flagErrors([{ ...base, target: 'character', cast: 'eldrin' }]), []);
check('frame needs dir', flagErrors([{ ...base, target: 'frame', key: 'cape|solid/female|', motion: 'run', frame: 3 }]).some(e => e.includes('dir')), true);
check('frame needs a number', flagErrors([{ ...base, target: 'frame', key: 'cape|solid/female|', motion: 'run', dir: 'up', frame: 'x' }]).some(e => e.includes('frame')), true);
check('item needs a key', flagErrors([{ ...base, target: 'item' }]).some(e => e.includes('key')), true);
check('character needs a cast id or a key', flagErrors([{ ...base, target: 'character' }]).some(e => e.includes('character')), true);
check('unknown target', flagErrors([{ ...base, target: 'galaxy', key: 'a|b|' }]).some(e => e.includes('target')), true);
check('snapshot must be a png data URL', flagErrors([{ ...base, target: 'item', key: 'a|b|', snapshot: 'javascript:1' }]).some(e => e.includes('snapshot')), true);
check('snapshot size capped', flagErrors([{ ...base, target: 'item', key: 'a|b|', snapshot: 'data:image/png;base64,' + 'A'.repeat(300000) }]).some(e => e.includes('snapshot')), true);

// description shown in the inbox
check('describe frame', describeFlag({ target: 'frame', key: 'cape|solid/female|', motion: 'run', dir: 'left', frame: 3 }, 'Solid Cape'),
      'Solid Cape — run, facing left, frame 4');
check('describe character', describeFlag({ target: 'character', cast: 'eldrin' }), 'character eldrin');

// newFlag + status moves append to the thread
const f = newFlag({ target: 'item', key: 'a|b|', reason: 'wrong_colour', comment: '  too pink  ' }, () => 'abc', () => '2026-10-10T01:00:00Z');
check('new flag', [f.id, f.status, f.comment, f.createdAt], ['abc', 'open', 'too pink', '2026-10-10T01:00:00Z']);
check('valid new flag', flagErrors([f]), []);
const g = applyStatus(f, 'needs_review', 'fixed the pink', 'Claude', () => '2026-10-10T02:00:00Z');
check('status + thread', [g.status, g.comment], ['needs_review', 'too pink\n[Claude] fixed the pink']);
check('resolved stamps time', applyStatus(g, 'resolved', '', 'You', () => 'T').resolvedAt, 'T');
check('reply without status change', applyStatus(f, f.status, 'more info', 'You', () => 'T').comment, 'too pink\n[You] more info');
check('bad status rejected', (() => { try { applyStatus(f, 'done', '', 'You'); return false } catch { return true } })(), true);
check('statuses', FLAG_STATUSES, ['open', 'needs_review', 'question', 'resolved']);

if (fails.length) { console.error(`✗ flags: ${fails.length} failed\n  ` + fails.join('\n  ')); process.exit(1); }
console.log(`✓ flags: ${passed} passed`);
