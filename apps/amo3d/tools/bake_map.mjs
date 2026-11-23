// Pre-render the open world's map (src/game/mapbake.js) into public/map/eldoria/ — run after any change to the land,
// with the dev server up (npm run dev): node tools/bake_map.mjs   (~7 min; the tiles ship with the game)
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const here = fileURLToPath(new URL('.', import.meta.url));
const js = `(async()=>{const P=window.__poc;P.enterMap('eldoria','outdoor:start');const {bakeWorldMap}=await import('/src/game/mapbake.js');const m=await bakeWorldMap(P.map,'eldoria',s=>console.log('[bake] '+s));return 'baked '+JSON.stringify(m.levels)})()`;
const steps = [['nav', 'http://localhost:5190/?new=1'], ['wait', 3500], ['eval', 'window.__poc.title.start?.()'], ['wait', 4000], ['eval', js]];
const r = spawnSync('node', [here + 'headless.mjs', here + '.out/bake', JSON.stringify(steps)], { stdio: 'inherit' });
process.exit(r.status ?? 1);
