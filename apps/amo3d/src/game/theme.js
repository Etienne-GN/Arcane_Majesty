// One look for every menu and panel (asked 2026-11-22: "neat and shiny, harmonized, coherent, no weird fonts, all in the
// same style"). Loaded after the panels' own styles: the same frame for all — dark wood with the minimap's gold double
// ring —, the same title type (IM Fell English), body text in Georgia, the same close button (a red disc in a gold
// ring), the same buttons and chips, the same dimmed backdrop. Each panel keeps its own layout and contents.
import '@fontsource/im-fell-english/400.css';
import '@fontsource/im-fell-english/400-italic.css';

const FRAMES = ['#inv .bag', '#shop .counter', '#sheet .frame', '#journal .nb', '#codex .tome', '#book .tome', '#worldmap .frame',
    '#travel .panel', '#camp .panel', '#chest .panel', '#bounty .panel', '#options .panel', '#pause .panel', '#slots .panel', '#upd .p'];
const ROOTS = ['#inv', '#shop', '#sheet', '#journal', '#codex', '#book', '#worldmap', '#travel', '#camp', '#chest', '#bounty', '#options', '#pause', '#slots', '#upd'];
const DARK = ['#travel', '#camp', '#chest', '#bounty', '#options', '#pause', '#slots', '#upd'];   // the menus (dark pages); the others are parchment books
const css = `
:root { --th-gold: #c8963a; --th-gold-hi: #f3d88b; --th-wood: #2a1c10; --th-wood-2: #3e2a18; --th-ink: #3a2410; --th-text: #f1e4c4; --th-red: #8e2a1c; }
${ROOTS.map(r => `html body ${r}`).join(',')} { background: radial-gradient(ellipse at center, #0a0806aa, #050403dd) !important; backdrop-filter: blur(2px); }
${FRAMES.map(f => `html body ${f}`).join(',')} {
  border: 0 !important; border-radius: 14px !important;
  box-shadow: 0 0 0 3px #6a4a22, 0 0 0 5px var(--th-gold), 0 0 0 7px #2a1a0c, 0 18px 50px #000d !important; }
${DARK.map(r => `html body ${r} .panel, html body ${r} .p`).join(',')} {
  background: linear-gradient(180deg, var(--th-wood-2), var(--th-wood)) !important; color: var(--th-text) !important; font-family: Georgia, serif !important; }
${ROOTS.map(r => `html body ${r} h1, html body ${r} h2, html body ${r} h3, html body ${r} .title, html body ${r} .t`).join(',')} {
  font-family: 'IM Fell English', Georgia, serif !important; font-weight: 400 !important; letter-spacing: .03em; }
${DARK.map(r => `html body ${r} h1, html body ${r} h2, html body ${r} h3`).join(',')} { color: var(--th-gold-hi) !important; }
/* the close button: everywhere the same red disc in a gold ring */
${ROOTS.map(r => `html body ${r} .close`).join(',')} {
  width: 40px !important; height: 40px !important; padding: 0 !important; border-radius: 50% !important; float: none !important;
  position: absolute !important; right: 10px !important; top: 8px !important; z-index: 5 !important;
  background: radial-gradient(circle at 40% 35%, #c24a32, var(--th-red) 60%, #4a120a) !important; color: #fbe9c8 !important;
  border: 0 !important; box-shadow: 0 0 0 2px var(--th-gold), 0 0 0 4px #2a1a0c, 0 3px 8px #000a !important;
  font: bold 0px Georgia, serif !important; cursor: pointer; }
${ROOTS.map(r => `html body ${r} .close::after`).join(',')} { content: '✕'; font: bold 17px Georgia, serif; line-height: 40px; }
${ROOTS.map(r => `html body ${r} .close:hover`).join(',')} { box-shadow: 0 0 0 2px var(--th-gold-hi), 0 0 0 4px #2a1a0c, 0 0 14px #f3d88b88 !important; }
${DARK.map(r => `html body ${r} .panel, html body ${r} .p`).join(',')} { position: relative; padding-top: 54px !important; }
${DARK.map(r => `html body ${r} .panel`).join(',')} { max-height: calc(100vh - 36px) !important; overflow: auto !important; box-sizing: border-box; margin: auto; }
${DARK.map(r => `html body ${r}`).join(',')} { place-items: center; }
html body #codex .rib.on { box-shadow: 0 0 0 1px var(--th-gold-hi) inset; color: #fff4d8 !important; }
/* the books (codex, spellbook, journal): the close button on the frame's corner, clear of the pages; their edge in wood */
html body #codex .close, html body #book .close, html body #journal .close { top: -14px !important; right: -6px !important; }
html body #codex .tome, html body #book .tome { background: linear-gradient(180deg, var(--th-wood-2), var(--th-wood)) !important; }
/* buttons in the menus: one style */
${DARK.map(r => `html body ${r} button:not(.close)`).join(',')} {
  font-family: 'IM Fell English', Georgia, serif !important; font-size: calc(16px * var(--ui, 1)) !important; color: var(--th-text) !important;
  background: linear-gradient(180deg, #4a3220, #2e1e12) !important; border: 1px solid #c8963a88 !important; border-radius: 9px !important;
  box-shadow: inset 0 1px 0 #ffffff14, 0 2px 4px #0008 !important; transition: border-color .15s, box-shadow .15s; }
${DARK.map(r => `html body ${r} button:not(.close):hover, html body ${r} button:not(.close):focus-visible`).join(',')} {
  border-color: var(--th-gold-hi) !important; box-shadow: inset 0 1px 0 #ffffff1c, 0 0 10px #f3d88b55 !important; outline: none; }
${DARK.map(r => `html body ${r} button.on, html body ${r} button[aria-pressed="true"], html body ${r} .seg .on`).join(',')} {
  background: linear-gradient(180deg, #8a6a2a, #5a4018) !important; border-color: var(--th-gold-hi) !important; color: #fff4d8 !important; }
/* chips and tabs in the parchment books */
html body #inv .chip, html body #shop .chip { font-family: Georgia, serif !important; border: 1px solid #c8963a66 !important; }
`;
const el = document.createElement('style'); el.id = 'ui-theme'; el.textContent = css;
// after every panel's own <style> (they are added as the game starts): append at once and again once the page is up
document.head.append(el);
addEventListener('load', () => document.head.append(el));
setTimeout(() => document.head.append(el), 1500);
