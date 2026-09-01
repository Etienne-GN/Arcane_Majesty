# Arcane Majesty Tool Suite

Internal authoring tools, versioned alongside the game. Each tool is a
separate local app; see `docs/superpowers/specs/2026-08-31-arcane-majesty-tool-suite-design.md`
for the full design.

## lpc_forge

Composes LPC/ULPC character (and horse companion) spritesheets — used to
create NPC and offline-campaign character skins. Moved into this repo via
`git subtree` (2026-08-31); its own history is preserved in this repo's log.

```bash
cd apps/tool_suite/lpc_forge
npm run dev
# frontend: http://localhost:5177  ·  API: http://localhost:3001
```

## sprite_ledger

Browses every catalogued sprite in `apps/amo/public/assets/catalogued/tilesets/`
live, lets sprites be grouped into named collections, and lets bad sprites
be flagged (quick-choice reason or free-text comment) for Claude to pick up
and fix in a later session — see the design doc's "How Claude consumes
flags" section.

```bash
cd apps/tool_suite/sprite_ledger
npm run dev
# frontend: http://localhost:5178  ·  API: http://localhost:3002
```
