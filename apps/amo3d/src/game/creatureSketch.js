// Ink sketches of creatures for the codex, drawn here as SVG (no art files). A creature's kind picks a body plan
// (four-legged beast, bird, spider, tree-folk, brute, spirit, humanoid, crawler) and a few features from its name
// (antlers, horns, tusks, long ears, a mane, a heavy build, wings, a hood…); a hand-drawn wobble and a little
// cross-hatching under it. Not yet written up: the same sketch in faint pencil, dashed.

const has = (k, ...w) => w.some(x => k.includes(x));
function planOf(k) {
    if (has(k, 'void_general')) return 'general';
    if (has(k, 'spider', 'crab')) return 'spider';
    if (has(k, 'crow', 'hawk', 'eagle', 'beak', 'vulture', 'heron', 'bird', 'turkey', 'chicken', 'bat', 'moth')) return 'bird';
    if (has(k, 'ent', 'treant', 'vine', 'mushroom', 'amanita')) return 'tree';
    if (has(k, 'golem', 'sentinel', 'fiend', 'turret', 'elemental', 'daemon', 'wendigo')) return 'brute';
    if (has(k, 'wisp', 'shade', 'wraith', 'sprite', 'revenant', 'soul', 'spawn', 'horror')) return 'spirit';
    if (has(k, 'scout', 'druid', 'archer', 'knight', 'shaman', 'walker', 'imp')) return 'humanoid';
    if (has(k, 'frog', 'toad', 'lizard', 'fish', 'shark', 'crawler', 'lurker')) return 'crawler';
    return 'quad';
}
const S = (w = 1.6) => `fill="none" stroke="#2e2014" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;
const F = op => `fill="#2e2014" fill-opacity="${op}" stroke="none"`;
const hatch = (x0, x1, y) => { let o = ''; for (let x = x0; x < x1; x += 6) o += `M${x} ${y} l6 -6 `; return `<path d="${o}" ${S(0.7)} opacity=".45"/>`; };

function quad(k) {
    const big = has(k, 'bear', 'cow', 'elk', 'llama', 'lion', 'boar', 'stalker') ? 1.2 : has(k, 'rabbit', 'rat', 'mouse', 'cat', 'fox', 'shiba') ? 0.75 : 1;
    const neck = has(k, 'deer', 'elk', 'llama', 'goat', 'sheep', 'cow') ? -10 : 0;
    let o = `<g transform="translate(100 104) scale(${big}) translate(-100 -104)">`;
    o += `<path d="M58 66 Q60 50 86 50 L122 52 Q140 52 142 64 Q144 78 132 82 L72 82 Q58 80 58 66Z" ${S(2)}/>`;   // body
    o += `<path d="M64 80 L60 104 M76 82 L78 104 M120 82 L118 104 M134 80 L140 104" ${S(2.2)}/>`;                   // legs
    o += `<path d="M138 58 Q150 ${48 + neck} 156 ${42 + neck} L172 ${46 + neck} Q176 ${52 + neck} 168 ${56 + neck} L150 66" ${S(2)}/>`;   // neck and head
    o += `<circle cx="162" cy="${47 + neck}" r="1.6" ${F(1)}/>`;
    if (has(k, 'wolf', 'fox', 'stalker', 'cat', 'dog', 'shiba')) o += `<path d="M156 ${42 + neck} L158 ${33 + neck} L163 ${42 + neck}" ${S(1.6)}/>`;   // pointed ears
    if (has(k, 'rabbit')) o += `<path d="M158 ${42 + neck} Q156 ${22 + neck} 160 ${20 + neck} Q164 ${24 + neck} 162 ${42 + neck}" ${S(1.6)}/>`;
    if (has(k, 'deer', 'elk')) o += `<path d="M158 ${40 + neck} L152 ${22 + neck} M154 ${30 + neck} L146 ${26 + neck} M162 ${40 + neck} L170 ${22 + neck} M168 ${30 + neck} L176 ${26 + neck}" ${S(1.6)}/>`;
    if (has(k, 'goat', 'sheep', 'llama')) o += `<path d="M158 ${42 + neck} Q150 ${34 + neck} 156 ${30 + neck} Q162 ${32 + neck} 160 ${38 + neck}" ${S(1.8)}/>`;
    if (has(k, 'boar', 'pig')) o += `<path d="M170 ${54 + neck} q6 -2 6 -8" ${S(1.6)}/>`;
    if (has(k, 'lion')) o += `<path d="M150 ${38 + neck} Q140 ${50 + neck} 146 ${64 + neck} M154 ${36 + neck} Q146 ${52 + neck} 152 ${66 + neck}" ${S(1.2)}/>`;
    if (has(k, 'bear')) o += `<circle cx="157" cy="${40 + neck}" r="3" ${S(1.4)}/>`;
    o += `<path d="M58 64 Q${has(k, 'fox', 'wolf', 'cat', 'lion', 'stalker') ? '38 60 34 74' : '50 64 48 72'}" ${S(1.8)}/>`;   // tail
    if (has(k, 'void', 'corrupt', 'blight', 'stalker', 'dark')) o += `<path d="M80 50 l2 -8 M96 50 l1 -10 M110 51 l2 -8" ${S(1.4)}/>`;   // corruption spines
    return o + hatch(66, 132, 82) + '</g>';
}
const bird = k => `<path d="M70 70 Q90 50 120 60 Q140 66 132 78 Q110 88 84 80Z" ${S(2)}/><path d="M118 60 Q130 46 140 48 Q146 52 140 58 L132 64" ${S(2)}/><path d="M146 52 L156 54 L146 57" ${S(1.6)}/><circle cx="140" cy="52" r="1.5" ${F(1)}/>`
    + `<path d="M88 60 Q70 26 40 22 Q62 40 64 56 Q48 46 34 46 Q54 58 82 66" ${S(1.8)}/><path d="M72 76 L52 84 M74 80 L56 92" ${S(1.6)}/><path d="M100 84 L98 100 M110 84 L112 100 M94 100 H102 M108 100 H116" ${S(1.6)}/>`
    + (has(k, 'beak', 'gloom') ? `<path d="M146 52 Q162 56 168 64" ${S(1.8)}/>` : '') + hatch(84, 126, 84);
const spider = () => `<ellipse cx="100" cy="70" rx="24" ry="16" ${S(2)}/><circle cx="130" cy="72" r="10" ${S(2)}/><circle cx="134" cy="69" r="1.4" ${F(1)}/><circle cx="138" cy="72" r="1.2" ${F(1)}/>`
    + [[-1, 0], [-1, 1], [1, 0], [1, 1]].map(([s, i]) => `<path d="M${112 + i * 10} ${78} Q${118 + i * 14 + s * 6} ${60 + s * 0} ${140 + i * 18} ${98 - i * 4}" ${S(1.6)}/><path d="M${108 - i * 10} 78 Q${94 - i * 14} 56 ${66 - i * 16} ${98 - i * 4}" ${S(1.6)}/>`).join('') + hatch(80, 122, 86);
function tree(k) {
    if (has(k, 'mushroom', 'amanita')) return `<path d="M70 58 Q70 26 104 26 Q138 26 138 58Z" ${S(2)}/><path d="M92 58 V96 Q104 104 116 96 V58" ${S(2)}/><circle cx="96" cy="40" r="4" ${S(1.2)}/><circle cx="116" cy="36" r="5" ${S(1.2)}/><circle cx="100" cy="74" r="1.6" ${F(1)}/><circle cx="110" cy="74" r="1.6" ${F(1)}/><path d="M92 82 L80 92 M116 82 L128 92" ${S(1.8)}/>` + hatch(92, 116, 100);
    return `<path d="M88 104 Q86 70 92 50 Q96 40 104 40 Q114 40 116 52 Q122 72 118 104" ${S(2.2)}/><path d="M92 54 Q70 46 58 26 M64 36 L52 34 M114 52 Q138 40 146 20 M138 32 L152 30 M94 70 Q76 76 66 92 M116 72 Q132 80 142 96" ${S(1.8)}/>`
        + `<path d="M98 56 l3 0 M108 56 l3 0" ${S(2.2)}/><path d="M98 66 Q104 70 110 66" ${S(1.4)}/><path d="M84 104 L78 110 M120 104 L128 110" ${S(1.6)}/>`
        + `<path d="M58 26 Q50 18 56 10 Q64 14 62 24 M146 20 Q156 12 150 6 Q142 10 146 18" ${S(1.2)}/>` + hatch(90, 118, 104);
}
const brute = k => `<path d="M76 52 Q80 30 104 30 Q128 30 132 52 L136 84 Q104 92 72 84Z" ${S(2.2)}/><path d="M92 28 Q94 16 104 16 Q114 16 116 28" ${S(2)}/><path d="M98 22 h3 M108 22 h3" ${S(2.4)}/>`
    + `<path d="M76 52 Q58 58 54 78 Q52 88 60 92 M132 52 Q150 58 154 78 Q156 88 148 92" ${S(2.4)}/><path d="M84 86 L82 106 M124 86 L126 106 M76 106 H90 M118 106 H132" ${S(2.4)}/>`
    + (has(k, 'crag', 'golem', 'crystal') ? `<path d="M88 42 L96 50 L90 58 M116 40 L110 52 L120 60" ${S(1.2)}/>` : '') + (has(k, 'sentinel', 'turret') ? `<circle cx="104" cy="56" r="7" ${S(1.6)}/><circle cx="104" cy="56" r="2.4" ${F(0.8)}/>` : '') + hatch(76, 134, 88);
const spirit = k => `<path d="M80 96 Q76 70 84 50 Q90 30 104 30 Q118 30 124 50 Q132 70 128 96 Q122 88 116 98 Q110 88 104 98 Q98 88 92 98 Q86 88 80 96Z" ${S(2)}/>`
    + `<path d="M96 52 q3 -3 6 0 M108 52 q3 -3 6 0" ${S(1.8)}/><path d="M86 58 Q66 62 58 50 M122 58 Q142 64 150 52" ${S(1.6)}/>`
    + (has(k, 'wisp', 'sprite') ? `<circle cx="104" cy="44" r="22" ${S(0.8)} stroke-dasharray="3 4"/>` : '') + `<path d="M70 32 l-4 -4 M140 30 l4 -4 M64 78 l-6 2 M146 78 l6 2" ${S(1)} opacity=".6"/>`;
const humanoid = k => `<circle cx="104" cy="28" r="9" ${S(2)}/><path d="M92 40 Q104 36 116 40 L120 74 L88 74Z" ${S(2)}/><path d="M92 74 L88 106 M116 74 L120 106" ${S(2.2)}/>`
    + `<path d="M92 44 L76 66 M116 44 L132 64" ${S(2)}/>` + (has(k, 'archer') ? `<path d="M134 40 Q146 64 134 88 M134 40 V88" ${S(1.4)}/>` : has(k, 'knight') ? `<path d="M132 64 L146 26" ${S(2)}/><path d="M74 58 h-10 v20 q5 6 10 0Z" ${S(1.6)}/>` : has(k, 'druid', 'shaman') ? `<path d="M132 64 L140 20 M136 24 q6 -6 10 0" ${S(1.8)}/>` : `<path d="M132 64 L144 56" ${S(2)}/>`)
    + (has(k, 'scout', 'druid', 'shaman') ? `<path d="M94 26 Q104 10 114 26" ${S(1.6)}/>` : '') + hatch(88, 120, 74);
const crawler = k => `<path d="M60 84 Q70 62 104 62 Q138 62 148 80 Q130 92 104 92 Q76 92 60 84Z" ${S(2)}/><circle cx="138" cy="70" r="2" ${F(1)}/>`
    + (has(k, 'fish', 'shark') ? `<path d="M60 84 L44 70 L46 96Z M100 62 L108 48 L116 64" ${S(1.8)}/>` : `<path d="M76 88 L68 102 M92 92 L90 104 M120 92 L124 104 M134 88 L144 100" ${S(1.8)}/><path d="M60 82 Q44 86 36 80" ${S(1.6)}/>`) + hatch(70, 140, 92);
const general = () => `<path d="M74 108 Q70 70 82 46 Q90 30 104 28 Q118 30 126 46 Q138 70 134 108Z" ${S(2.2)}/><path d="M92 30 Q84 14 74 10 M116 30 Q124 14 134 10" ${S(2)}/>`
    + `<path d="M96 42 l4 2 M108 44 l4 -2" ${S(2.4)}/><path d="M82 60 Q60 66 50 54 M126 60 Q150 62 158 48" ${S(2)}/><path d="M158 48 L170 20" ${S(2.2)}/>`
    + `<path d="M40 30 l6 4 M44 50 l8 0 M160 80 l8 2 M150 96 l8 4" ${S(1)} opacity=".6"/>` + hatch(78, 132, 108);
const PLANS = { quad, bird, spider, tree, brute, spirit, humanoid, crawler, general };

let uid = 0;
export function sketchSVG(kind, { faint = false } = {}) {
    const k = String(kind ?? ''), id = `sk${uid++}`, plan = PLANS[planOf(k)] ?? quad;
    const body = plan(k);
    return `<svg viewBox="0 0 200 120" class="sketch" aria-hidden="true"><defs><filter id="${id}"><feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="2" seed="${k.length}"/><feDisplacementMap in="SourceGraphic" scale="${faint ? 3.5 : 2.4}"/></filter></defs>`
        + `<path d="M20 110 Q70 106 110 110 T190 108" ${S(1)} opacity=".5"/>`
        + `<g filter="url(#${id})" ${faint ? 'opacity=".32" stroke-dasharray="4 3"' : ''}>${body}</g></svg>`;
}
