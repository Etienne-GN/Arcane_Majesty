# Sprite Ledger: spec of v1 and design of v2

v1 is the current app (`src/`, UI on :5178). v2 is the redesign (`v2/`, UI on
:5180). Both talk to the same API server (:3003) and the same data, so they can
be run side by side and compared on real work.

## Running both

```
npm run dev       # API server :3003 + v1 UI :5178 (as before)
npm run dev:v2    # v2 UI :5180 (needs the API server from `npm run dev`)
```
Open http://192.168.0.206:5178 (v1) and http://192.168.0.206:5180 (v2) side by side: same data, changes in one show in the other after a reload.

---

## Part 1: what v1 does (feature inventory = v2 parity checklist)

### Data it works on
- **Catalogues** (`apps/amo/public/assets/catalogued/tilesets/*/*.catalogue.json`, ~950 sheets, ~7500 sprites).
  Each sprite is a `tile` (row/col in a grid) or an `object` (x,y,w,h). Optional:
  `frames` + `frameDurationMs` (animation), `tags`, `hitbox` (box or null), `layer` (under/sorted/over).
- **sprite_meta.json**: per `sheet::name`: `collection`, `license` (ok/unlicensed), `physics` (proposed/approved).
- **flags.json**: `{id, sheet, name, reason, comment, status, claudeNote, createdAt, resolvedAt}`.
  Status: `open` (for Claude), `needs_review` (Claude fixed, for the human), `question` (Claude asks), `resolved`.
  The `comment` is a running thread: the human's text plus `[Claude] …`, `[Rework] …`, `[Answer to Claude's question] …` paragraphs.
- **collections.json**: `{id, name, parentId}` tree. New sprites are seeded into a collection by folder.

### API (server.js, :3003)
`GET /api/sheets`, `GET /api/image/:png`, `GET/POST /api/collections`, `GET /api/meta`, `POST /api/meta` (collection),
`POST /api/license`, `GET/POST /api/flags`, `PATCH /api/flags/:id` (status, note, comment), `POST /api/physics` (hitbox, layer, review).

### Screens and features
**Home**
- H1 total sprites and collection count
- H2 callouts with counts: Claude's questions / open flags / awaiting review, each opening Browse pre-filtered
- H3 Reviewer Mode button; H4 "hitboxes to review" button (opens the hitbox queue)
- H5 Browse all sprites; H6 collection cards (tree, counts) opening Browse on that collection
- H7 unlicensed count
- H8 orphan flags (flags on sprites that no longer exist): collapsed list, dismiss all, approve / rework / answer each

**Browse** (sidebar + grid + detail panel)
- B1 search by name; B2 sheet filter; B3 flag filter (any / flagged / open / needs review / question)
- B4 animated only; B5 license filter (any / ok / unlicensed / unmarked); B6 hitbox filter (any / not set / proposed / approved / no hitbox)
- B7 sort by name or by sheet position
- B8 collection tree with counts ("matched of total" when filtered), "Showing N"
- B9 add a collection (name + optional parent)
- B10 grid: 64px thumbnails (frame 1 for animations), name, badges (open, review, question, license ok/unlicensed, animated), selection outline
- B11 Home button

**Detail panel** (selected sprite)
- D1 preview x4, animation play/pause/step, frame counter and duration
- D2 name, sheet, tags
- D3 "Open in Reviewer Mode" (on the queue of its pending flag)
- D4 collision and layer editor (see E) + "Review hitboxes in Reviewer Mode"
- D5 collection picker; D6 license ok / unlicensed toggles
- D7 pending flags: reason, comment thread, Claude's question; approve / rework (needs review), answer / resolve (question), resolve (open)
- D8 flag form: 8 reasons (misaligned, should be animation, wrong colors, wrong name, duplicate, wrong collection, broken image, other) + comment
- D9 after approving, selection moves to the next sprite in the grid

**Reviewer Mode**
- R1 queues: awaiting review / questions / open / hitboxes; sheet filter with counts; queue is a snapshot
- R2 big preview (animated), context view of the sprite in its sheet, zoom close / wide / wider / whole sheet (−/+)
- R3 flag thread; approve & next; rework with note & next; answer & next
- R4 hitbox queue: hitbox editor, save & next
- R5 previous / next, progress (n / total, approved, sent back), done banners
- R6 keys: A/Enter approve, R rework note, ←/→ navigate, −/+ zoom, Esc exit
- R7 can start on a given sprite; exit returns where you came from

**Hitbox editor**
- E1 drag to draw a box on the sprite; presets no hitbox / full / base; undo changes
- E2 layer: under / sorted / over, with hints
- E3 state: not set / Claude's guess / edited / approved; save = approved

### Pain points seen in use
- Status is spread over 4 places (Home callouts, sidebar selects, Reviewer queue picker, detail panel), each with its own words.
- Home is a dead end: you must pick a filter to see anything, and the numbers don't tell you what to do next.
- Filters are 6 stacked dropdowns; what is active is hard to see, and nothing can be undone.
- The flag "thread" is one long text blob; who said what is hard to read.
- One sprite at a time: no multi-select, no bulk actions (4000 hitboxes to review!).
- The grid draws one canvas per sprite (slow with thousands), fixed thumbnail size, no grouping by sheet.
- The whole spritesheet is only visible inside Reviewer Mode, tiny.
- No URL state: reload loses where you were; the browser Back button does nothing useful.
- Actions can't be undone; errors appear as small red text.

---

## Part 2: v2 design ("a professional tool")

Guiding idea: **one workspace, one status language, everything reachable by keyboard, bulk by default.**

### Layout (app shell)
```
┌───────────────────────────────────────────────────────────────────────┐
│ ▣ Sprite Ledger   [ Search sprites, sheets, commands…  Ctrl K ]  ?    │  top bar
├──────────┬─────────────────────────────────────────┬──────────────────┤
│ INBOX    │  toolbar: filter chips · view · size    │  INSPECTOR       │
│ ● Review │                                         │  preview + play  │
│ ● Quest. │   grid (grouped by sheet, virtualized)  │  tabs:           │
│ ● Hitbox │   or sheet view (whole PNG + boxes)     │  Info · Flags ·  │
│ ● Open   │                                         │  Collision       │
│ ● Stale  │                                         │                  │
│ LIBRARY  │                                         │  (bulk panel     │
│ All      │                                         │   when several   │
│ ▸ Collec.│                                         │   are selected)  │
│ SHEETS   │                                         │                  │
└──────────┴─────────────────────────────────────────┴──────────────────┘
```
- **Left navigator**: *Inbox* (Review, Questions, Hitboxes, Open for Claude, Stale flags, each with a live count),
  *Library* (All + the collection tree + "New collection"), *Sheets* (searchable list with counts).
  Picking an entry sets the scope of the workspace. This replaces Home callouts, the flag dropdown and the Reviewer queue picker.
- **Workspace**: the sprites in scope. Toolbar with filter **chips** (Status, Hitbox, License, Animated, search text), each removable with ×,
  "Clear all", sort, thumbnail size slider, and a view switch **Grid | Sheet**.
  - *Grid*: grouped by sheet with sticky sheet headers (count, collapse). Thumbnails are CSS background crops of one cached PNG per sheet,
    so thousands of cells cost little; rows are virtualized (only what's on screen is mounted).
  - *Sheet view*: the whole PNG, zoomable, every sprite outlined and colour-coded by status, with optional hitbox overlay. Click a box to select it.
- **Inspector**: the selected sprite. Big preview with play/step, then tabs:
  - *Info*: name, sheet, kind/box, tags, collection, license.
  - *Flags*: each flag as a conversation (you / Claude / rework / answer bubbles, parsed from the comment), with its actions,
    and "Flag this sprite" (reason chips + note).
  - *Collision*: the hitbox editor with an in-context preview.
  With several sprites selected it becomes a **bulk panel**: approve their review flags, approve/set hitboxes (none / full / base, layer),
  set license, move to collection.
- **Focus mode** (the old Reviewer Mode, from any scope: "Review these N ▶"): full screen, big preview + sheet context,
  the same inspector tabs, approve / rework / answer / save and move to the next.

### Interaction
- Selection: click, Ctrl/Cmd-click toggle, Shift-click range, Ctrl+A all in scope, Esc clear.
- Keys everywhere: ↑↓←→ move in grid, J/K next/prev, A approve, R rework, F flag, 1/2/3 inspector tab, G/S grid/sheet view,
  Space play/pause, Enter focus mode, Ctrl+K command palette, ? shortcut sheet. Shown in tooltips and the help overlay.
- Command palette (Ctrl+K): jump to a sprite, sheet or collection by name, or run a command (go to inbox X, toggle filter, focus mode…).
- Every write shows a toast; approve/rework/license/collection/hitbox writes offer **Undo** (restores the previous value).
- State lives in the URL hash (scope, filters, view, selection), so reload and Back/Forward work and a view can be bookmarked.
- One status language and colour everywhere: Review (blue), Question (violet), Open for Claude (red), Hitbox to check (amber), Approved (green).

### Server additions (backwards compatible, v1 unaffected)
- `POST /api/flags/batch` `{ids, status, appendComment?}`, `POST /api/physics/batch` `{items:[{sheet,name,hitbox?,layer?,review?}]}`,
  `POST /api/license/batch`, `POST /api/meta/batch` so bulk actions are one write instead of hundreds.

### Parity map (v1 → v2)
| v1 | v2 |
|---|---|
| H1, H7 | top bar summary / Library "All" count, License chip |
| H2, H4, R1 queues | Inbox entries (Review, Questions, Open, Hitboxes) |
| H3 Reviewer Mode, R2–R7 | Focus mode (same actions + keys, context zoom, snapshot queue, start on a sprite, exit back) |
| H5, H6, B8, B11 | Library: All + collection tree with counts, "Showing N" |
| H8 orphans | Inbox → Stale flags (dismiss all, approve / rework / answer each) |
| B1–B7 | search box + filter chips + sort |
| B9 | Library → New collection |
| B10 | Grid thumbnails + badges (+ size slider, grouping) |
| D1–D2 | Inspector preview + Info tab |
| D3 | "Focus" button in the inspector |
| D4, E1–E3 | Collision tab |
| D5–D6 | Info tab (collection, license) + bulk panel |
| D7–D8 | Flags tab (conversation + actions + flag form) |
| D9 | after an action the selection moves to the next sprite in scope |
