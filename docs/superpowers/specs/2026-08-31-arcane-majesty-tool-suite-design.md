# Arcane Majesty Tool Suite — Design

## Context

Two internal authoring tools exist today, in two different states:

- **lpc-forge** ("Vitruvian LPC Studio") — a standalone Vue 3 + Pinia + Express +
  SQLite app living outside this repo, at `/home/etienne/projects/lpc-forge`. It
  composes LPC/ULPC character (and horse companion) spritesheets from layered
  parts, with palette swaps, presets, credits tracking, and a SQLite-backed
  save browser. It already has real saved compositions for Arcane Majesty's
  cast (Eldrin, Kael, Anya, Seraphina, and others). Its own `npm run dev` is
  currently broken (`node_modules/.bin/run-p` is a 0-byte file) — worked
  around this session by starting `server.js` and `vite` directly.
- **Sprite Ledger** — a one-off static claude.ai Artifact built earlier this
  session: a searchable, read-only catalogue browser rendering every entry
  from every `*.catalogue.json` sheet under
  `apps/amo/public/assets/catalogued/tilesets/`. It has no persistence, no
  way to flag a bad sprite, and no notion of grouping sheets into named
  collections (e.g. "Pipoya" vs the Cainos "Pixel Art Top Down" pack vs
  one-off finds like `addwork.png` or `SnowyAssetPack`).

The sprite-cataloguing work this session (fences, water autotiles, the full
Pixel Art Top Down pack, `addwork.png`, the snow pack) produced real,
committed `.catalogue.json` files serving real game content — but review of
that work has been entirely manual: Claude builds a grid overlay, eyeballs
it, and the user spot-checks by reading chat. There is no lightweight way for
the user to say "this one specific sprite renders wrong" and have that
survive into a later session as something Claude can act on.

Separately, `lpc-forge` is proven valuable (this session's Eldrin (Forge)
variant came directly from it) but sits outside the game repo, disconnected
from the sprite-cataloguing tooling that lives inside it.

## Goal

Establish an **Arcane Majesty Tool Suite** living inside this repo, starting
with two members:

1. **lpc-forge**, moved in with its git history preserved, for composing NPC
   and offline-campaign character skins (the in-game Character Creator is a
   separate, already-shipping system — explicitly out of scope here, to be
   revisited later).
2. **Sprite Ledger**, rebuilt as a real local tool (not a static Artifact):
   browses every catalogued sprite live from the real `.catalogue.json`
   files, lets sprites be organized into named **collections** (Pipoya, the
   Cainos pack, Buildings, Interior, Cave, Nature/dirt-grass-trees, etc.,
   plus an "Uncollected" catch-all), and lets the user **flag** a
   badly-rendered sprite with either a quick preset reason or a free-text
   comment — durably, so Claude can read the flags in a later session and
   fix the underlying catalogue/sprite issue.

The suite is explicitly extensible: future tools (e.g. dedicated browsers,
if ever warranted) slot in as new sibling directories under
`apps/tool_suite/`. Collections are data inside the Sprite Ledger, not
separate tools — confirmed during design: "buildings", "interior", "cave",
"dirt/grass/trees" are collection tags, not standalone apps.

## Non-goals

- The in-game `CharacterCreatorScene.js` is not touched by this work.
- No new standalone apps beyond lpc-forge + Sprite Ledger are built now;
  the collection *categories* mentioned (buildings/interior/cave/nature)
  are realized purely as `collections.json` entries in the Sprite Ledger,
  not new tools.
- The Sprite Ledger never writes to `apps/amo/public/assets/catalogued/**`
  — it treats those `.catalogue.json`/PNG files as read-only source data.
  All curation state (collections, flags) lives in its own sidecar JSON.
- lpc-forge's internal architecture (Vue/Pinia/SQLite, its own save format)
  is not redesigned — only relocated, and its broken `run-p` dev script is
  fixed as part of the move (it blocks `npm run dev` entirely today).

## Architecture

```
apps/tool_suite/
  README.md                 — what the suite is, how to run each tool
  lpc_forge/                — moved via `git subtree add`, history preserved
    (unchanged internals; run-p fix applied)
  sprite_ledger/
    package.json
    server.js                — Express API + static file serving
    vite.config.ts
    index.html
    src/                     — Vue 3 frontend
      App.vue
      components/
        SpriteGrid.vue       — filterable thumbnail grid
        SpriteDetail.vue     — detail panel: collection reassignment, flag form
        CollectionSidebar.vue
        FlagForm.vue
    data/
      collections.json       — registry of collections
      sprite_meta.json        — per-sprite collection assignment (sheet::name keyed)
      flags.json              — flag records
```

Ports: lpc-forge keeps its existing 5177 (vite) / 3001 (express). Sprite
Ledger uses 5178 (vite) / 3002 (express) — no collision.

### lpc-forge migration

- `git subtree add --prefix=apps/tool_suite/lpc_forge <path-to-lpc-forge-repo> main`
  (run from a local `file://` remote or a direct path add, since lpc-forge
  is a local-only repo with no shared remote) — preserves its full commit
  history inside this repo.
- Fix `node_modules/.bin/run-p`: it's a 0-byte file post-move (already
  broken pre-move, confirmed this session); regenerate it via a clean
  `npm install` inside the moved directory, or hand-write the two direct
  invocations (`node server.js` + `node node_modules/vite/bin/vite.js`)
  into `package.json`'s `dev` script instead of relying on `run-p`, removing
  the dependency on a binary that's demonstrated as fragile.
- No functional changes to lpc-forge's own code beyond that dev-script fix.

### Sprite Ledger backend (Express)

Reads live from `apps/amo/public/assets/catalogued/tilesets/` (relative path
`../../amo/public/assets/catalogued/tilesets/` from
`apps/tool_suite/sprite_ledger/`) — never copies or duplicates sheet data.

Endpoints:
- `GET /api/sheets` — walks the catalogued tilesets directory, parses every
  `*.catalogue.json`, returns `[{ sheetPngFilename, source, entries }]` (one
  entry per sheet folder; `sheetPngFilename` is the key used throughout
  `sprite_meta.json`/`flags.json`).
- `GET /api/image/:sheetPngFilename` — static-serves the real PNG (looked
  up by scanning the catalogued directory for a matching filename) so the
  frontend can crop sprites into canvases client-side (same technique the
  original static Artifact used).
- `GET /api/meta` — returns `collections.json` + `sprite_meta.json` merged.
- `POST /api/meta` — body `{ sheet, name, collection }`; upserts one
  sprite's collection assignment in `sprite_meta.json`.
- `GET /api/collections` — list collections.
- `POST /api/collections` — body `{ id, name }`; adds a new collection.
- `GET /api/flags` — list all flags (optionally `?status=open`).
- `POST /api/flags` — body `{ sheet, name, reason, comment }`; appends a
  flag record with `status: "open"`, `createdAt: <ISO timestamp>`.
- `PATCH /api/flags/:id` — body `{ status }`; marks a flag resolved (or
  reopens it).

### Data model

`collections.json` — seeded on first run:
```json
[
  { "id": "pipoya", "name": "Pipoya" },
  { "id": "patd", "name": "Pixel Art Top Down" },
  { "id": "buildings", "name": "Buildings" },
  { "id": "interior", "name": "Interior" },
  { "id": "cave", "name": "Cave" },
  { "id": "nature", "name": "Dirt / Grass / Trees" },
  { "id": "uncollected", "name": "Uncollected" }
]
```
The user can add more from the UI (`POST /api/collections`) at any time.

`sprite_meta.json` — keyed by `` `${sheetPngFilename}::${entryName}` `` (every
catalogued sheet's folder name already matches its PNG's basename, so the
PNG filename alone is an unambiguous key — matches what was shown and
approved in chat, rather than the longer folder+catalogue-file form):
```json
{
  "PATD_Props.png::chest_wood_small": { "collection": "buildings" }
}
```
Default-collection seeding logic (run once, on first scan of a sheet not
yet present in `sprite_meta.json`): sheets living under the `SampleMap/`
directory → `pipoya`; sheets whose folder name starts with `PATD_` →
`patd`; everything else → `uncollected`. This is a one-time seed per sheet,
not enforced afterward — the user can freely reassign any sprite.

`flags.json` — array of records:
```json
{
  "id": "f_<uuid>",
  "sheet": "PATD_Props.png",
  "name": "stone_disc_dial",
  "reason": "misaligned",
  "comment": "",
  "status": "open",
  "createdAt": "2026-08-31T22:00:00.000Z",
  "resolvedAt": null
}
```
`reason` is one of: `misaligned`, `wrong_colors`, `wrong_name`, `duplicate`,
`wrong_collection`, `broken_image`, `other`. `comment` is always editable
regardless of `reason` (not gated behind picking "other").

### Frontend UX

- **Sidebar**: collection list (click to filter; counts per collection),
  an "All" view, an "Uncollected" view, a sheet filter, a name-search box,
  and a "Flagged only" toggle.
- **Grid**: thumbnails cropped client-side from each sheet's real PNG
  (loaded once per sheet, cached), sprite name below each, a small red dot
  on any sprite with an open flag.
- **Detail panel** (click a thumbnail): larger crop, sheet + tags, a
  **collection dropdown** (reassign to any existing collection), and a
  **"Flag this sprite"** control: one-click quick-choice reason buttons
  (submits immediately) plus an always-available comment box (can be filled
  in with or without picking a quick-choice reason).

### How Claude consumes flags

In a later session, Claude `Read`s `apps/tool_suite/sprite_ledger/data/flags.json`
directly — no query tooling needed. For each `status: "open"` record,
Claude investigates the named sprite in its real sheet/catalogue entry
(grid overlay, alpha-channel checks — the same verification discipline used
throughout this session), fixes the underlying issue, and marks the flag
resolved via a `PATCH /api/flags/:id` call (or a direct, careful edit of
`flags.json` if the servers aren't running at the time) once done.

## Testing

Matching `apps/amo/tools/`'s existing pattern of small Node test scripts
(no framework):
- A schema test for `collections.json`/`sprite_meta.json`/`flags.json` —
  valid shape, referenced collection ids actually exist, no duplicate flag
  ids.
- A smoke test hitting each Express endpoint (`GET /api/sheets` returns a
  non-empty array given the real catalogued directory; `POST`/`PATCH`
  round-trip on a temp copy of the data files, not the real ones).

This is an internal dev tool, not shipped game code — test rigor is
lighter than `apps/amo`'s own suite, but real tests still exist; this
isn't left untested.
