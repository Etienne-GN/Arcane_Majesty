// Spell icons and the Book's ink drawings, all drawn here as SVG (no art files).
//   iconSVG(spell)    — a small coin: the element's colour and motif behind (every water spell shares the waves,
//                       every fire spell the embers…), and the spell's own glyph on top, different for each spell.
//   drawingSVG(spell) — a hand-inked sketch of what the spell does (a bolt flying at a creature, a wall rising,
//                       a tornado walking…), with a wash of the element's colour, for the Book's right-hand page.

export const ELEMENTS = {
    fire:      { name: 'Fire',      c: '#f07a32', d: '#5a1606', motif: c => `<path d="M3 24 Q5 17 7 21 Q9 14 12 20 Q15 13 17 21 Q19 16 21 24Z" fill="${c}" opacity=".45"/>` },
    water:     { name: 'Water',     c: '#3a9ae0', d: '#0a2848', motif: c => `<path d="M0 17 Q3 15 6 17 T12 17 T18 17 T24 17 M0 21 Q3 19 6 21 T12 21 T18 21 T24 21" stroke="${c}" stroke-width="1.3" fill="none" opacity=".55"/>` },
    ice:       { name: 'Ice',       c: '#a8e4ff', d: '#14324e', motif: c => `<path d="M2 2 L8 8 M8 2 L2 8 M5 1 V9 M1 5 H9 M16 22 L22 16 M19 15 V23" stroke="${c}" stroke-width=".9" opacity=".4"/>` },
    earth:     { name: 'Earth',     c: '#b88a50', d: '#352410', motif: c => `<path d="M0 18 H24 M0 21.5 H24 M7 18 L9 21.5 M15 21.5 L17 24 M3 14 L6 18" stroke="${c}" stroke-width="1" fill="none" opacity=".5"/>` },
    nature:    { name: 'Nature',    c: '#66b844', d: '#142e0a', motif: c => `<path d="M1 23 C6 17 4 12 9 9 M3 18 Q1 15 2 13 Q5 15 3 18 M22 1 C18 6 20 9 16 12" stroke="${c}" stroke-width="1" fill="none" opacity=".5"/>` },
    wind:      { name: 'Wind',      c: '#c8eedc', d: '#24443e', motif: c => `<path d="M1 6 H14 Q18 6 17 3 M2 20 H17 Q21 20 20 23 M5 13 H9" stroke="${c}" stroke-width="1" fill="none" opacity=".45"/>` },
    lightning: { name: 'Lightning', c: '#f4d848', d: '#3a2e08', motif: c => `<path d="M3 1 L1 6 L4 6 L2 11 M22 13 L20 18 L23 18 L21 23" stroke="${c}" stroke-width="1" fill="none" opacity=".45"/>` },
    shadow:    { name: 'Shadow',    c: '#a070e0', d: '#0e0818', motif: c => `<path d="M18 2 A8 8 0 1 0 22 14 A6 6 0 1 1 18 2Z" fill="${c}" opacity=".25"/>` },
    arcane:    { name: 'Arcane',    c: '#cdb2ff', d: '#221640', motif: c => `<circle cx="12" cy="12" r="10" stroke="${c}" stroke-width=".7" stroke-dasharray="1.5 2" fill="none" opacity=".5"/>` },
};

// Glyphs on a 24-unit grid, drawn with colour k. Stroke-based so they read small.
const S = (k, w = 1.6) => `fill="none" stroke="${k}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;
const G = {
    dart:      k => `<path d="M5 19 L18 6 M18 6 L12.5 7 M18 6 L17 11.5 M5 19 L4 16 M5 19 L8 20" ${S(k)}/>`,
    darts3:    k => `<path d="M4 12 L14 7 M14 7 L10 6.5 M14 7 L12 10 M6 18 L16 13 M16 13 L12 12.5 M16 13 L14 16 M8 7 L18 2 M18 2 L14 1.5 M18 2 L16 5" ${S(k, 1.3)}/>`,
    seeker:    k => `<path d="M3 19 C7 5 13 21 19 7 M19 7 L15 8.5 M19 7 L20 11" ${S(k)}/><circle cx="19" cy="7" r="3.2" ${S(k, 0.8)}/>`,
    needles:   k => `<path d="M3 14 L19 6 M4 18 L20 10 M5 22 L21 14 M5 10 L15 5" ${S(k, 1.1)}/>`,
    phantom:   k => `<path d="M4 20 L18 6 M18 6 L12.5 7 M18 6 L17 11.5" ${S(k)} stroke-dasharray="2.5 2"/><circle cx="7" cy="7" r="2" fill="${k}" opacity=".5"/>`,
    sun:       k => `<circle cx="12" cy="12" r="4.2" ${S(k)}/><path d="M12 2 V5 M12 19 V22 M2 12 H5 M19 12 H22 M5 5 L7 7 M17 17 L19 19 M19 5 L17 7 M5 19 L7 17" ${S(k, 1.3)}/>`,
    script:    k => `<path d="M6 4 H18 V20 H6Z M4 4 Q6 2 6 4 M18 20 Q18 22 20 20 M9 8 H15 M9 11 H15 M9 14 H13" ${S(k, 1.3)}/>`,
    blessing:  k => `<path d="M4 9 Q12 1 20 9 M8 12 V20 M12 10 V22 M16 12 V20" ${S(k)}/>`,
    sparkle:   k => `<path d="M10 3 Q11 10 18 11 Q11 12 10 19 Q9 12 2 11 Q9 10 10 3Z M18 15 Q18.5 18 21 18.5 Q18.5 19 18 22 Q17.5 19 15 18.5 Q17.5 18 18 15Z" fill="${k}"/>`,
    shield:    k => `<path d="M12 3 L19 6 V12 Q19 18 12 21 Q5 18 5 12 V6Z" ${S(k)}/><path d="M12 8 L13.2 11 L16 11.3 L13.8 13.2 L14.5 16 L12 14.5 L9.5 16 L10.2 13.2 L8 11.3 L10.8 11Z" fill="${k}"/>`,
    rune:      k => `<path d="M12 2 L20 12 L12 22 L4 12Z M12 7 V17 M8 12 H16 M9.5 9 L14.5 15" ${S(k, 1.3)}/>`,
    counter:   k => `<circle cx="12" cy="12" r="8" ${S(k)}/><path d="M6.5 6.5 L17.5 17.5 M12 7 L13 10 L10 10 Z" ${S(k)}/>`,
    unravel:   k => `<path d="M12 12 m0 -1 a1 1 0 1 1 -1 1 a3 3 0 0 1 3 -3 a5 5 0 0 1 5 5 M16 18 a7 7 0 0 1 -11 -3 M4 10 L2 8 M20 6 L22 4" ${S(k, 1.4)}/>`,
    burst:     k => `<path d="M12 2 L13.8 9 L21 6 L15.5 11.5 L22 15 L14.5 15 L15 22 L12 16 L8 22 L9 15 L2 15 L8.5 11 L3 6 L10 9Z" ${S(k, 1.3)}/><circle cx="12" cy="12.5" r="2" fill="${k}"/>`,
    runeRing:  k => `<circle cx="12" cy="12" r="8.5" ${S(k, 1.3)}/><circle cx="12" cy="12" r="4.5" ${S(k, 1)}/><path d="M12 2 V5.5 M12 18.5 V22 M2 12 H5.5 M18.5 12 H22 M5 5 L7.5 7.5 M16.5 16.5 L19 19 M19 5 L16.5 7.5 M5 19 L7.5 16.5" ${S(k, 1)}/>`,
    flameBall: k => `<circle cx="15" cy="15" r="5" fill="${k}"/><path d="M11 12 Q6 9 3 3 Q9 6 12 7 Q9 4 9 1 Q13 6 18 10" ${S(k, 1.3)}/>`,
    nova:      k => `<circle cx="12" cy="12" r="3.5" fill="${k}"/><path d="M12 1 L13.5 5 L10.5 5Z M12 23 L13.5 19 L10.5 19Z M1 12 L5 13.5 L5 10.5Z M23 12 L19 13.5 L19 10.5Z M4 4 L7.5 6 L6 7.5Z M20 20 L16.5 18 L18 16.5Z M20 4 L18 7.5 L16.5 6Z M4 20 L6 16.5 L7.5 18Z" fill="${k}"/>`,
    bloom:     k => `<path d="M12 12 Q8 4 12 2 Q16 4 12 12 Q20 8 22 12 Q20 16 12 12 Q16 20 12 22 Q8 20 12 12 Q4 16 2 12 Q4 8 12 12Z" ${S(k, 1.2)}/><circle cx="12" cy="12" r="2" fill="${k}"/>`,
    flameLance:k => `<path d="M3 21 L17 7 M17 7 L21 3 L19.5 8.5 L15.5 4.5Z M6 21 Q4 18 7 17 M9 18 Q7 15 10 14" ${S(k, 1.4)}/>`,
    heartFlame:k => `<path d="M12 21 C3 15 3 8 7.5 7 C10 6.5 11.5 8.5 12 10 C12.5 8.5 14 6.5 16.5 7 C21 8 21 15 12 21Z" ${S(k)}/><path d="M12 17 Q10 14 12 11.5 Q14 14 12 17Z" fill="${k}"/>`,
    flameWall: k => `<path d="M3 21 Q2 14 5 9 Q6 14 8 12 Q8 16 9 21 M9 21 Q8 12 12 4 Q13 11 15 9 Q15 15 15 21 M15 21 Q15 15 18 10 Q19 14 21 13 Q22 17 21 21 M2 21 H22" ${S(k, 1.4)}/>`,
    meteor:    k => `<circle cx="16" cy="16" r="4" fill="${k}"/><path d="M13 13 L3 3 M15 11.5 L8 4.5 M11.5 15 L4.5 8 M8 20 L6 22 M19 21 L21 22" ${S(k, 1.3)}/>`,
    bolt:      k => `<path d="M14 2 L6 13 H11 L9 22 L18 10 H13Z" ${S(k, 1.5)}/>`,
    thunder:   k => `<path d="M6 11 Q2 11 3 7.5 Q4 5 7 6 Q8 2 12.5 3 Q16 3.5 16 6.5 Q20 5.5 21 9 Q21 11 18 11Z M12 11 L9 16 H13 L11 22" ${S(k, 1.4)}/>`,
    zapLance:  k => `<path d="M2 20 L6 16 L5 13 L9 12 L10 8 L14 8 L16 4 L22 2" ${S(k, 1.6)}/><path d="M18 2 L22 2 L21 6" ${S(k, 1.4)}/>`,
    chain:     k => `<circle cx="4" cy="18" r="2" fill="${k}"/><circle cx="12" cy="8" r="2" fill="${k}"/><circle cx="20" cy="17" r="2" fill="${k}"/><path d="M5.5 16 L7 14 L6 12.5 L10.5 9.5 M13.5 9.5 L15 12 L14 13 L18.5 15.5" ${S(k, 1.3)}/>`,
    staticF:   k => `<path d="M3 20 H21" ${S(k, 1.2)}/><path d="M6 19 L7 14 L5 14 L6 9 M12 19 L13 12 L11 12 L12.5 5 M18 19 L19 15 L17 15 L18 10" ${S(k, 1.2)}/>`,
    veil:      k => `<path d="M3 12 Q12 4 21 12 Q12 20 3 12Z M3 12 Q12 15 21 12" ${S(k, 1.3)}/><path d="M6 17 L4.5 20 M10 18.5 L9.5 22 M14 18.5 L14.5 22 M18 17 L19.5 20" ${S(k, 1.1)}/>`,
    voidRings: k => `<circle cx="12" cy="12" r="3.5" fill="${k}"/><circle cx="12" cy="12" r="6.5" ${S(k, 1.1)}/><circle cx="12" cy="12" r="9.5" ${S(k, 1)} stroke-dasharray="2 2"/>`,
    hush:      k => `<path d="M15 3 A9 9 0 1 0 21 15 A7 7 0 1 1 15 3Z" ${S(k, 1.3)}/><path d="M17 8 H21 L17 12 H21" ${S(k, 1.1)}/>`,
    eclipse:   k => `<circle cx="12" cy="12" r="8" fill="${k}" opacity=".35"/><circle cx="14" cy="10.5" r="7" ${S(k, 1.4)}/><path d="M3 21 L7 17" ${S(k, 1.2)}/>`,
    shadowBolt:k => `<circle cx="16" cy="9" r="4.5" fill="${k}"/><path d="M12.5 11.5 Q8 15 3 21 M13 13.5 Q10 17 7 21.5 M11 10 Q7 12 2 16" ${S(k, 1.2)}/>`,
    drain:     k => `<path d="M8 3 Q13 10 13 13 A5 5 0 0 1 3 13 Q3 10 8 3Z" ${S(k, 1.4)}/><path d="M14 19 Q20 19 20 12 M20 12 L17.5 14.5 M20 12 L22 15" ${S(k, 1.3)}/>`,
    stoneSkin: k => `<path d="M12 3 L19 7 V15 L12 21 L5 15 V7Z M12 3 V10 L19 7 M12 10 L5 7 M12 10 L12 21 M5 15 L12 14 L19 15" ${S(k, 1.2)}/>`,
    pillar:    k => `<path d="M8 21 V7 L10 4 H14 L16 7 V21 M3 21 H21 M10 9 L12 12 L11 15 M14 13 L13 17" ${S(k, 1.4)}/>`,
    quagmire:  k => `<path d="M2 15 Q5 12 8 15 T14 15 T20 15 T23 15 M3 19 Q6 17 9 19 T15 19 T21 19" ${S(k, 1.3)}/><circle cx="8" cy="9" r="1.5" ${S(k, 1)}/><circle cx="15" cy="7" r="2.2" ${S(k, 1)}/>`,
    rubble:    k => `<path d="M3 17 L6 13 L10 15 L9 19Z M12 10 L16 8 L18 12 L14 14Z M15 18 L19 16 L21 20 L17 21Z M6 6 L9 5 L9 8Z" ${S(k, 1.2)}/>`,
    brickWall: k => `<path d="M3 20 H21 V8 H3Z M3 12 H21 M3 16 H21 M9 8 V12 M15 8 V12 M6 12 V16 M12 12 V16 M18 12 V16 M9 16 V20 M15 16 V20" ${S(k, 1.1)}/><path d="M5 8 Q6 5 8 6 M14 8 Q16 4 18 7" ${S(k, 1)}/>`,
    mudTrap:   k => `<ellipse cx="12" cy="16" rx="9" ry="4" ${S(k, 1.3)}/><path d="M7 16 L8 11 L9 16 M11 15 L12 9 L13 15 M15 16 L16 11 L17 16" ${S(k, 1.1)}/>`,
    boulder:   k => `<path d="M14 6 L20 9 L21 15 L16 20 L10 19 L8 13 L10 8Z" fill="${k}"/><path d="M6 9 H2 M6 13 H1 M7 17 H3" ${S(k, 1.3)}/>`,
    tremor:    k => `<path d="M2 14 H22 M12 14 L10 17 L13 19 L11 22 M6 10 Q4 8 6 6 M18 10 Q20 8 18 6 M9 9 Q8 8 9 7 M15 9 Q16 8 15 7" ${S(k, 1.4)}/>`,
    rockBullet:k => `<path d="M15 9 L19 10 L19 14 L15 15 L13 12Z" fill="${k}"/><path d="M11 10 H3 M11 12 H1 M11 14 H4" ${S(k, 1.2)}/>`,
    spikes:    k => `<path d="M2 21 H22 M4 21 L7 9 L10 21 M9 21 L12 3 L15 21 M14 21 L17 11 L20 21" ${S(k, 1.4)}/>`,
    drop:      k => `<path d="M12 2 Q19 11 19 15 A7 7 0 0 1 5 15 Q5 11 12 2Z" ${S(k, 1.5)}/><path d="M9 15 A3 3 0 0 0 12 18" ${S(k, 1.1)}/>`,
    waterBlade:k => `<path d="M4 20 Q6 7 20 3 Q12 9 10 20Z" ${S(k, 1.4)}/><path d="M2 22 Q4 21 5 22 M12 22 Q14 21 15 22" ${S(k, 1)}/>`,
    wave:      k => `<path d="M2 18 Q6 18 8 13 Q10 5 17 6 Q22 7 21 12 Q20 15 17 14 Q15 13 16 11 M2 21 H22" ${S(k, 1.5)}/>`,
    healDrop:  k => `<path d="M12 2 Q19 11 19 15 A7 7 0 0 1 5 15 Q5 11 12 2Z" ${S(k, 1.4)}/><path d="M12 11 V18 M8.5 14.5 H15.5" ${S(k, 1.6)}/>`,
    riptide:   k => `<path d="M5 9 A8 8 0 0 1 19 9 M19 9 L19 4.5 M19 9 L14.5 9 M19 15 A8 8 0 0 1 5 15 M5 15 L5 19.5 M5 15 L9.5 15" ${S(k, 1.4)}/>`,
    tideStep:  k => `<path d="M8 3 Q11 3 11 7 Q11 11 8 11 Q5 11 5 7 Q5 3 8 3Z M8 13 Q10 13 10 15 Q10 17 8 17 Q6 17 6 15 Q6 13 8 13Z" ${S(k, 1.2)}/><path d="M13 19 Q16 17 18 19 T22 19 M14 13 H21 M15 9 H22" ${S(k, 1.2)}/>`,
    geyser:    k => `<path d="M10 21 V9 M14 21 V9 M10 9 Q6 5 4 7 M14 9 Q18 5 20 7 M12 9 V3 M3 21 H21" ${S(k, 1.4)}/><circle cx="7" cy="3" r="1" fill="${k}"/><circle cx="17" cy="2.5" r="1" fill="${k}"/>`,
    torrent:   k => `<path d="M2 15 L20 6 M3 19 L21 10 M20 6 L22 5 M21 10 L23 9.5" ${S(k, 1.6)}/><circle cx="7" cy="8" r="1.1" fill="${k}"/><circle cx="12" cy="20" r="1.1" fill="${k}"/>`,
    mistward:  k => `<path d="M12 3 L19 6 V12 Q19 18 12 21 Q5 18 5 12 V6Z" ${S(k, 1.4)}/><path d="M8 10 Q10 9 12 10 T16 10 M8 14 Q10 13 12 14 T16 14" ${S(k, 1.1)}/>`,
    spiral:    k => `<path d="M12 12 m-1 0 a1 1 0 0 1 2 0 a3 3 0 0 1 -5 2 a5 5 0 0 1 8 -6 a7 7 0 0 1 -2 12 a9 9 0 0 1 -11 -9" ${S(k, 1.4)}/>`,
    crystal:   k => `<path d="M12 2 L17 9 L12 22 L7 9Z M7 9 H17 M12 2 V22" ${S(k, 1.3)}/>`,
    snowflake: k => `<path d="M12 2 V22 M3.3 7 L20.7 17 M3.3 17 L20.7 7 M12 5 L9.5 3 M12 5 L14.5 3 M12 19 L9.5 21 M12 19 L14.5 21" ${S(k, 1.4)}/>`,
    shards3:   k => `<path d="M6 21 L4 12 L7 7 L9 12Z M12 21 L10 9 L13 2 L15 9Z M18 21 L16 13 L19 9 L21 13Z" ${S(k, 1.2)}/>`,
    glacial:   k => `<path d="M3 21 L12 2 L15 10 L21 21Z M12 2 L11 14 L15 10 M8 13 L11 14" ${S(k, 1.3)}/>`,
    icePrison: k => `<path d="M5 8 L12 4 L19 8 V18 L12 22 L5 18Z M5 8 L12 12 L19 8 M12 12 V22 M8.5 10 V20 M15.5 10 V20" ${S(k, 1.1)}/>`,
    vine:      k => `<path d="M4 21 C4 13 12 15 12 9 C12 5 8 5 8 8 M12 9 C14 4 20 6 19 10" ${S(k, 1.5)}/><path d="M7 15 Q3 13 4 10 Q8 11 7 15Z M15 13 Q19 11 20 14 Q16 16 15 13Z" fill="${k}"/>`,
    petals:    k => `<path d="M6 6 Q9 3 10 7 Q7 9 6 6Z M16 4 Q20 4 18 8 Q15 7 16 4Z M18 14 Q22 16 19 19 Q16 17 18 14Z M7 15 Q8 19 4 19 Q4 15 7 15Z M12 11 Q14 9 15 12 Q13 14 12 11Z" fill="${k}"/><path d="M3 11 Q10 2 21 9" ${S(k, 1)} stroke-dasharray="1.5 2"/>`,
    acid:      k => `<path d="M10 2 Q15 9 15 12 A5 5 0 0 1 5 12 Q5 9 10 2Z" fill="${k}"/><path d="M3 21 Q8 17 13 21 Q17 18 21 21" ${S(k, 1.3)}/><circle cx="18" cy="13" r="1.5" ${S(k, 1)}/><circle cx="20" cy="8" r="1" ${S(k, 1)}/>`,
    mendLeaf:  k => `<path d="M4 20 Q4 6 20 4 Q18 20 4 20Z M4 20 L14 10" ${S(k, 1.3)}/><path d="M17 15 V21 M14 18 H20" ${S(k, 1.6)}/>`,
    spore:     k => `<path d="M5 12 Q5 5 12 5 Q19 5 19 12Z M10 12 V19 Q12 21 14 19 V12" ${S(k, 1.3)}/><circle cx="4" cy="4" r="1" fill="${k}"/><circle cx="20" cy="3" r="1" fill="${k}"/><circle cx="21" cy="17" r="1" fill="${k}"/><circle cx="3" cy="17" r="1" fill="${k}"/>`,
    bark:      k => `<path d="M12 3 L19 6 V12 Q19 18 12 21 Q5 18 5 12 V6Z" ${S(k, 1.4)}/><path d="M9 7 Q10 12 8.5 18 M12 6 Q13 12 12 20 M15 7 Q14 12 15.5 18" ${S(k, 1)}/>`,
    sweep:     k => `<path d="M3 17 Q12 3 21 17" ${S(k, 1.6)}/><path d="M6 8 L6.8 10 L9 10.6 L6.8 11.2 L6 13 L5.2 11.2 L3 10.6 L5.2 10Z M17 4 L17.6 5.6 L19.4 6 L17.6 6.6 L17 8 L16.4 6.6 L14.6 6 L16.4 5.6Z" fill="${k}"/>`,
    thorns:    k => `<path d="M2 18 C6 10 10 20 14 12 C17 6 20 10 22 6" ${S(k, 1.5)}/><path d="M5 13 L3 11 M8 15 L9 12 M12 15 L14 17 M15 10 L13 8 M19 8 L20 11" ${S(k, 1.2)}/>`,
    windKnife: k => `<path d="M6 18 L18 6 L20 4 L19 8 Z M8 20 L6 18 L4 20" ${S(k, 1.4)}/><path d="M3 10 H10 M2 14 H7" ${S(k, 1.1)}/>`,
    dryWind:   k => `<circle cx="17" cy="7" r="3.2" ${S(k, 1.3)}/><path d="M2 12 H14 Q18 12 17 15 Q16 17 14 16 M3 17 H10 M4 8 H10" ${S(k, 1.3)}/>`,
    gale:      k => `<path d="M3 20 Q8 6 21 3 M3 14 Q7 8 15 5" ${S(k, 1.6)}/><path d="M18 3 L21 3 L20 6" ${S(k, 1.3)}/>`,
    tempest:   k => `<path d="M14 4 L20 10 L14 16 M20 10 H8" ${S(k, 1.6)}/><path d="M3 7 H8 M2 13 H6 M4 19 H10" ${S(k, 1.1)}/>`,
    cyclone:   k => `<path d="M3 4 H21 M5 8 H18 M7 12 H15 M9 16 H13 M11 20 H12" ${S(k, 1.5)}/><path d="M21 4 Q18 10 12 20" ${S(k, 1)}/>`,
    windWall:  k => `<circle cx="12" cy="12" r="8.5" ${S(k, 1.3)} stroke-dasharray="7 3"/><path d="M8 10 H14 Q17 10 16 8 M8 14 H16 Q18 14 17 16" ${S(k, 1.2)}/>`,
    star:      k => `<path d="M12 3 L14.2 9.5 L21 9.6 L15.6 13.6 L17.6 20.4 L12 16.3 L6.4 20.4 L8.4 13.6 L3 9.6 L9.8 9.5Z" ${S(k, 1.3)}/>`,
};
const GLYPH = {
    mana_dart: 'dart', triple_dart: 'darts3', seeker_dart: 'seeker', needle_volley: 'needles', phantom_dart: 'phantom', luminance: 'sun', phantom_script: 'script',
    benediction: 'blessing', cleanse: 'sparkle', aetheric_ward: 'shield', aetheric_inscription: 'rune', counterspell: 'counter', unravel: 'unravel', arcane_burst: 'burst', arcane_circle: 'runeRing',
    fireball: 'flameBall', fire_nova: 'nova', ember_bloom: 'bloom', flame_lance: 'flameLance', warmth_aura: 'heartFlame', flame_wall: 'flameWall', fire_rain: 'meteor',
    arc_bolt: 'bolt', thunder_clap: 'thunder', lightning_lance: 'zapLance', chain_lightning: 'chain', static_field: 'staticF',
    shadow_veil: 'veil', void_pulse: 'voidRings', hush: 'hush', eclipse_mark: 'eclipse', shadow_bolt: 'shadowBolt', life_drain: 'drain',
    stone_skin: 'stoneSkin', earth_pillar: 'pillar', quagmire: 'quagmire', rubble_spray: 'rubble', mud_wall: 'brickWall', mud_trap: 'mudTrap', stone_cannon: 'boulder', tremor: 'tremor', rock_bullet: 'rockBullet', spike_field: 'spikes',
    water_conjure: 'drop', water_blade: 'waterBlade', tidal_bolt: 'wave', healing_spring: 'healDrop', riptide: 'riptide', tide_step: 'tideStep', geyser: 'geyser', torrent_lance: 'torrent', mistward: 'mistward', maelstrom: 'spiral',
    frost_shard: 'crystal', frostbite: 'snowflake', blizzard_shard: 'shards3', glacial_spike: 'glacial', ice_prison: 'icePrison',
    vine_grasp: 'vine', petal_storm: 'petals', acid_splash: 'acid', vessel_mend: 'mendLeaf', spore_cloud: 'spore', barkskin: 'bark', purifying_sweep: 'sweep', thornwall: 'thorns',
    wind_knife: 'windKnife', drying_wind: 'dryWind', gale_slash: 'gale', tempest_step: 'tempest', cyclone: 'cyclone', wind_barrier: 'windWall',
};
export const elementOf = spell => ELEMENTS[spell?.element] ?? ELEMENTS.arcane;
const glyph = (spell, k) => (G[GLYPH[spell.id]] ?? G.star)(k);

let uid = 0;
export function iconSVG(spell, { locked = false } = {}) {
    const e = elementOf(spell), id = `ic${uid++}`;
    const c = locked ? '#8a8070' : e.c, d = locked ? '#2a2620' : e.d;
    return `<svg viewBox="0 0 24 24" class="sicon" aria-hidden="true"><defs><radialGradient id="${id}" cx=".38" cy=".32" r=".8"><stop offset="0" stop-color="${c}" stop-opacity=".55"/><stop offset=".55" stop-color="${d}"/><stop offset="1" stop-color="${d}"/></radialGradient>`
        + `<clipPath id="${id}c"><circle cx="12" cy="12" r="11"/></clipPath></defs>`
        + `<circle cx="12" cy="12" r="11.3" fill="url(#${id})"/><g clip-path="url(#${id}c)">${e.motif(c)}</g>`
        + `<g transform="translate(3.6 3.6) scale(.7)">${glyph(spell, locked ? '#b8ae98' : '#fff8ea')}</g>`
        + `<circle cx="12" cy="12" r="11.3" fill="none" stroke="${locked ? '#6a6050' : '#e8c878'}" stroke-width="1"/></svg>`;
}

// ---- the drawings: little ink scenes on a 160×100 page ----
const SCENE = {
    fire_rain: 'rain', flame_wall: 'wall', mud_wall: 'wall', thornwall: 'wall', earth_pillar: 'pillar', geyser: 'pillar', cyclone: 'tornado', drying_wind: 'tornado',
    blizzard_shard: 'pikes', frostbite: 'pikes', spike_field: 'spikes', thunder_clap: 'sky', static_field: 'sky', fire_nova: 'shock', ember_bloom: 'shock', tremor: 'shock',
    void_pulse: 'shock', hush: 'shock', riptide: 'shock', maelstrom: 'whirl', mud_trap: 'spikes',
};
const sceneOf = spell => SCENE[spell.id] ?? (spell.targetingType === 'targeted_directional' ? 'bolt' : spell.targetingType === 'self' || spell.passive ? 'self' : 'area');
const wizard = (x, s = 1, k) => `<g transform="translate(${x} 82) scale(${s})" ${S(k, 1.4 / s)}><path d="M-7 0 L-3 -24 Q0 -27 3 -24 L7 0Z"/><circle cx="0" cy="-29" r="4"/><path d="M-4 -33 L0 -42 L4 -33"/><path d="M5 -20 L12 -38 M12 -38 l-1.5 -3 l3 0z"/></g>`;
const beast = (x, k) => `<g transform="translate(${x} 82)" ${S(k, 1.3)}><path d="M-10 0 Q-12 -14 0 -16 Q12 -16 12 -6 L14 0 M-6 0 V-6 M6 0 V-6 M10 -14 L14 -20 L12 -12"/><circle cx="8" cy="-11" r="1" fill="${k}"/></g>`;
const ground = k => `<path d="M4 82 Q40 80 80 82 T156 82" ${S(k, 1.2)}/><path d="M10 86 L16 84 M30 87 L36 85 M60 86 L66 84 M100 87 L106 85 M130 86 L136 84" ${S(k, 0.8)} opacity=".6"/>`;
const big = (spell, k, x, y, s) => `<g transform="translate(${x - 12 * s} ${y - 12 * s}) scale(${s})">${glyph(spell, k)}</g>`;
function sceneBody(spell, k) {
    switch (sceneOf(spell)) {
        case 'bolt': return wizard(24, 1, k) + beast(136, k) + `<path d="M44 52 H70 M48 58 H66 M46 46 H62" ${S(k, 1)} stroke-dasharray="3 3"/>` + big(spell, k, 92, 50, 1.6);
        case 'self': return wizard(80, 1.5, k) + `<ellipse cx="80" cy="50" rx="30" ry="38" ${S(k, 1.1)} stroke-dasharray="4 3"/>` + big(spell, k, 80, 14, 0.9) + `<path d="M44 30 l-4 -3 M116 30 l4 -3 M42 60 l-5 0 M118 60 l5 0" ${S(k, 1)}/>`;
        case 'wall': { let o = ''; for (let i = 0; i < 5; i++) o += big(spell, k, 70 + i * 18, 70 - i * 3, 0.9 - i * 0.04); return wizard(22, 1, k) + o + beast(150, k); }
        case 'pillar': return wizard(22, 0.9, k) + big(spell, k, 100, 46, 2.6) + `<path d="M76 84 l-6 2 M124 84 l6 2 M84 30 l-5 -4 M118 30 l5 -4" ${S(k, 1)}/>`;
        case 'tornado': return wizard(22, 0.9, k) + big(spell, k, 104, 44, 2.6) + `<path d="M70 70 Q66 66 70 62 M140 66 Q144 62 140 58" ${S(k, 1)}/>` + `<path d="M76 46 H60 M74 54 H64" ${S(k, 1)}/>`;
        case 'rain': { let o = ''; for (let i = 0; i < 5; i++) { const x = 70 + i * 17, y = 26 + (i % 2) * 14; o += `<circle cx="${x}" cy="${y}" r="4" fill="${k}"/><path d="M${x - 3} ${y - 3} l-14 -16" ${S(k, 1)}/>`; } return wizard(22, 0.9, k) + o + `<ellipse cx="104" cy="82" rx="40" ry="6" ${S(k, 1)}/>`; }
        case 'pikes': { let o = ''; for (let i = 0; i < 6; i++) { const x = 44 + i * 18, h = 10 + i * 6; o += `<path d="M${x - 5} 82 L${x} ${82 - h} L${x + 5} 82" ${S(k, 1.3)}/>`; } return wizard(22, 1, k) + o + big(spell, k, 140, 30, 1); }
        case 'spikes': { let o = ''; for (let i = 0; i < 9; i++) { const x = 60 + i * 10, h = 14 + ((i * 7) % 5) * 5; o += `<path d="M${x - 4} 82 L${x} ${82 - h} L${x + 4} 82" ${S(k, 1.2)}/>`; } return wizard(22, 0.9, k) + o + big(spell, k, 104, 24, 1); }
        case 'sky': return wizard(22, 0.9, k) + `<path d="M70 18 Q80 6 96 12 Q110 4 124 14 Q138 12 136 22 Z" ${S(k, 1.2)}/><path d="M100 20 L94 44 L104 44 L96 80" ${S(k, 1.8)}/><ellipse cx="96" cy="82" rx="26" ry="5" ${S(k, 1)}/>` + beast(132, k);
        case 'shock': return wizard(80, 1, k) + `<ellipse cx="80" cy="82" rx="26" ry="5" ${S(k, 1.1)}/><ellipse cx="80" cy="82" rx="46" ry="9" ${S(k, 1)}/><ellipse cx="80" cy="82" rx="68" ry="13" ${S(k, 0.9)} stroke-dasharray="4 3"/>` + big(spell, k, 124, 30, 1.1);
        case 'whirl': return wizard(22, 0.9, k) + `<ellipse cx="104" cy="80" rx="40" ry="8" ${S(k, 1.1)}/><ellipse cx="104" cy="80" rx="26" ry="5" ${S(k, 1)}/>` + big(spell, k, 104, 44, 1.8);
        default: return wizard(22, 0.9, k) + `<ellipse cx="104" cy="80" rx="38" ry="7" ${S(k, 1)}/><path d="M66 58 l-8 -4 M142 58 l8 -4 M104 18 v-8 M78 28 l-5 -5 M130 28 l5 -5" ${S(k, 1)}/>` + big(spell, k, 104, 50, 2.1) + beast(150, k);
    }
}
export function drawingSVG(spell, { locked = false } = {}) {
    const e = elementOf(spell), id = `dw${uid++}`, ink = locked ? '#7a6e5c' : '#3a2814';
    return `<svg viewBox="0 0 160 100" class="sdraw" aria-hidden="true"><defs>`
        + `<filter id="${id}" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".04" numOctaves="2" seed="${uid % 9}"/><feDisplacementMap in="SourceGraphic" scale="2.2"/></filter>`
        + `<filter id="${id}w"><feTurbulence type="fractalNoise" baseFrequency=".02" numOctaves="3"/><feDisplacementMap in="SourceGraphic" scale="14"/><feGaussianBlur stdDeviation="2"/></filter></defs>`
        + (locked ? '' : `<ellipse cx="100" cy="52" rx="56" ry="36" fill="${e.c}" opacity=".28" filter="url(#${id}w)"/>`)
        + `<g filter="url(#${id})">${ground(ink)}${sceneBody(spell, ink)}</g></svg>`;
}
