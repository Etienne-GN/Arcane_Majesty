# Arcane Majesty Tool Suite

Internal authoring tools, versioned alongside the game. Each tool is a
separate local app; see `docs/superpowers/specs/2026-08-31-arcane-majesty-tool-suite-design.md`
for the full design.

**Fixed ports** (every app's `vite.config` sets `strictPort: true` — a
stale process squatting on one of these fails the `npm run dev` loudly
instead of silently drifting to the next free port; kill the stale
process rather than letting a new one pick a different port):

| App | Frontend | API/backend |
|---|---|---|
| Game (`apps/amo`) | 5174 | 3002 (Socket.io) |
| lpc_forge v2 (character forge) | 5179 | 3001 |
| lpc_forge v1 (old UI, `npm run dev:v1`) | 5177 | 3001 |
| sprite_ledger | 5178 | 3003 |

## lpc_forge

Composes LPC/ULPC character (and horse companion) spritesheets — used to
create NPC and offline-campaign character skins. Moved into this repo via
`git subtree` (2026-08-31); its own history is preserved in this repo's log.

```bash
cd apps/tool_suite/lpc_forge
npm install   # first run only
npm run dev       # v2: http://localhost:5179  ·  API: http://localhost:3001
npm run dev:v1    # old v1 UI on http://localhost:5177
npm test          # API smoke + v2 model/geometry tests
```

**v2** (2026-10-08, `v2/`, see `v2/SPEC.md`) composes characters from the
game's own LPC library (`apps/amo/ressources/lpc_merged`, served at `/lpc`)
and renders them with the game's shared code (`@game` → `apps/amo/src`:
`lpcLayout.js`, `lpcPalettes.js`, `animResolve.js`), so what the Forge shows
is what the game shows. It plays a character in all 15 motions × 4
directions (walk … run, sit, jump, climb, combat idle, emote) and flags every
layer that has no art for a motion. A `#comp=<json>` link opens a given
composition; `node tools/screenshot.mjs <url> <out.png>` takes a headless
screenshot. Next (separate plans): cast files published to the game, gap
review, the motion workshop for drawing missing motions, export + credits.

## sprite_ledger

Browses every catalogued sprite in `apps/amo/public/assets/catalogued/tilesets/`
live, lets sprites be grouped into named collections, and lets bad sprites
be flagged (quick-choice reason or free-text comment) for Claude to pick up
and fix in a later session — see the design doc's "How Claude consumes
flags" section.

```bash
cd apps/tool_suite/sprite_ledger
npm install   # first run only
npm run dev
# frontend: http://localhost:5178  ·  API: http://localhost:3003
```

Once running, `data/flags.json` is where a later Claude session should
look for open sprite-quality reports to act on.
