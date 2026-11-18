// The release notes: what changed between the previous amo3d release tag and this one, from the commit
// subjects (feat → New, fix → Fixed, the rest → Other), in plain words.
// usage: node tools/changelog.mjs <tag> [previousTag]   (prints Markdown)
import { execFileSync } from 'node:child_process';

const git = (...a) => execFileSync('git', a, { encoding: 'utf8' }).trim();
const tag = process.argv[2] ?? 'HEAD';
const tags = git('tag', '--list', 'amo3d-v*', '--sort=-v:refname').split('\n').filter(Boolean);
const prev = process.argv[3] ?? tags[tags.indexOf(tag) + 1];   // the next older release tag
const range = prev ? `${prev}..${tag}` : tag;
const subjects = git('log', '--no-merges', '--format=%s', range).split('\n').filter(Boolean);
const groups = { New: [], Fixed: [], Other: [] };
for (const s of subjects) {
    const m = s.match(/^(\w+)(?:\([^)]*\))?:\s*(.*)$/);
    const kind = m?.[1], text = (m?.[2] ?? s).replace(/^./, c => c.toUpperCase());
    if (kind === 'docs' || kind === 'wip' || /^build/.test(kind ?? '')) { if (kind !== 'wip') groups.Other.push(text); continue; }
    (kind === 'feat' ? groups.New : kind === 'fix' ? groups.Fixed : groups.Other).push(text);
}
const ver = tag.replace('amo3d-v', '');
let out = `## Arcane Majesty 3D ${ver}\n\n`;
if (prev) out += `Changes since ${prev.replace('amo3d-v', '')}.\n\n`;
for (const [k, list] of Object.entries(groups)) if (list.length) out += `### ${k}\n${list.map(l => `- ${l}`).join('\n')}\n\n`;
out += `---\nInstall: download the APK on the phone and open it — it installs over the previous version and keeps your saves (the game also offers it: title screen, and Options → Version).\n`;
process.stdout.write(out);
