# Build the Real Eldoria's Prophecy Maps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the ASCII-to-tiles authoring tool, the documented map-assembly procedure, and a structurally-complete Summit of Despair map (placeholders standing in for the sprites/neighbor-maps that don't exist yet) — proving the whole pipeline works end-to-end.

**Architecture:** One small pure, TDD'd tool (`ascii_to_tiles.js`) that replaces hand-typed tile grids. One documentation deliverable (the assembly procedure). Four content additions applied in dependency order — items (referenced by quest rewards) → enemy types (referenced by the map's enemy spawns and their kill-quest tracking) → quests (referenced by the map's `quests` list) → the map itself (uses the ASCII tool for `tiles`, placeholder catalogue refs for `decorations`/`tileset`, real enemy-type/quest ids everywhere else).

**Tech Stack:** Pure Node (ESM, no deps) for the ASCII tool, matching the conventions established across the other three sub-project plans. Plain JS data-file edits for the game content (`items.js`, `quests.js`, `maps/index.js`).

**Spec:** `docs/superpowers/specs/2026-08-26-build-eldorias-prophecy-maps-design.md`

## Global Constraints

- `DEFAULT_LEGEND = { '.': 0, '#': 1, '=': 2 }` — matches the existing tile-value meanings (floor/wall/path) exactly; the ASCII tool never redefines what a tile value means.
- Summit of Despair's `decorations`/`tileset` catalogue refs use the literal placeholder `sheet: "PLACEHOLDER/<intended sheet>"`, `name: "PLACEHOLDER"` — clearly greppable, never a real-looking but fake value.
- Its portals point at `east_road` and `sylvan_sanctuary` map ids that don't exist yet (commented as such) — not built in this plan.
- Quest data and new items are real, not placeholders — they only reference id strings, no sprites or built maps required, so nothing blocks building them for real now.
- New items reuse existing `icon` keys (no new icon art required): `legion_lore_fragment` → `itm_scroll`, `soul_gem_mana` → `itm_ring_02`, `aether_shard` → `itm_glowing_dust`.
- New enemy types reuse existing `spriteKey`s the same way (no new sprite art required): `gloom_beak` → `spr_bird_eagle`, `frost_shade` → `spr_shadow_sprite`, `crag_fiend` → `spr_void_stalker` (re-tinted).
- The boss encounter's `enemyType`/drops/kill-target are currently hardcoded engine-wide to the generic `'void_general'` (`GameScene.js:324-351`) — a known, pre-existing limitation this plan does not fix. Malphas's specific identity is narrative/quest-text only here; the "Whisperer of Doubt" quest's kill step targets `'void_general'` (the engine's real event) so it actually completes in play.

---

### Task 1: ASCII-to-tiles converter

**Files:**
- Create: `apps/amo/tools/maps/ascii_to_tiles.js`
- Create: `apps/amo/tools/maps/test_ascii_to_tiles.mjs`

**Interfaces:**
- Produces: `DEFAULT_LEGEND: {'.': 0, '#': 1, '=': 2}` and `asciiToTiles(asciiText: string, legend?: object) → number[][]`, both named exports. Task 6 calls `asciiToTiles` to build Summit of Despair's `tiles` array.

- [ ] **Step 1: Write the failing test**

Create `apps/amo/tools/maps/test_ascii_to_tiles.mjs`:

```javascript
#!/usr/bin/env node
/**
 * Unit tests for ascii_to_tiles.js's asciiToTiles().
 * Run: node tools/maps/test_ascii_to_tiles.mjs
 */
import { asciiToTiles, DEFAULT_LEGEND } from './ascii_to_tiles.js';

let passed = 0;
const fails = [];
function check(name, cond) {
    if (cond) passed++;
    else fails.push(name);
}
function throws(fn) {
    try { fn(); return false; } catch { return true; }
}

// ── basic conversion, default legend ────────────────────────────────────────
{
    const ascii = '#.#\n...\n#=#';
    const tiles = asciiToTiles(ascii);
    check(
        'basic conversion with default legend',
        JSON.stringify(tiles) === JSON.stringify([[1, 0, 1], [0, 0, 0], [1, 2, 1]])
    );
}

// ── trailing/blank lines are dropped ────────────────────────────────────────
{
    const ascii = '##\n..\n\n';
    const tiles = asciiToTiles(ascii);
    check('trailing blank lines dropped', tiles.length === 2);
}

// ── ragged rows throw ────────────────────────────────────────────────────────
check('ragged row throws', throws(() => asciiToTiles('###\n##')));

// ── unrecognized character throws ───────────────────────────────────────────
check('unrecognized character throws', throws(() => asciiToTiles('#.?\n...')));

// ── custom legend ────────────────────────────────────────────────────────────
{
    const tiles = asciiToTiles('AB\nBA', { A: 5, B: 9 });
    check('custom legend used', JSON.stringify(tiles) === JSON.stringify([[5, 9], [9, 5]]));
}

// ── DEFAULT_LEGEND matches existing tile-value meanings ─────────────────────
check(
    'DEFAULT_LEGEND matches floor=0/wall=1/path=2',
    DEFAULT_LEGEND['.'] === 0 && DEFAULT_LEGEND['#'] === 1 && DEFAULT_LEGEND['='] === 2
);

if (fails.length) {
    console.error(`✗ ascii_to_tiles tests FAILED — ${fails.length}/${passed + fails.length}:`);
    for (const f of fails) console.error('  ' + f);
    process.exit(1);
}
console.log(`✓ ascii_to_tiles tests passed (${passed} assertions).`);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/amo && node tools/maps/test_ascii_to_tiles.mjs`
Expected: FAIL — `Cannot find module './ascii_to_tiles.js'`.

- [ ] **Step 3: Write the implementation**

Create `apps/amo/tools/maps/ascii_to_tiles.js`:

```javascript
/**
 * Converts a hand-written ASCII-art layout into the tiles 2D array the map
 * engine expects, replacing hand-typed rows of comma-separated ints.
 * Default legend matches the existing tile-value meanings exactly.
 */
export const DEFAULT_LEGEND = { '.': 0, '#': 1, '=': 2 };

export function asciiToTiles(asciiText, legend = DEFAULT_LEGEND) {
    const lines = asciiText.split('\n').filter(l => l.length > 0);
    const width = lines[0]?.length ?? 0;
    return lines.map((line, r) => {
        if (line.length !== width) {
            throw new Error(`row ${r} has length ${line.length}, expected ${width} (all rows must be the same width)`);
        }
        return [...line].map(ch => {
            if (!(ch in legend)) {
                throw new Error(`row ${r}: unrecognized character "${ch}" (legend keys: ${Object.keys(legend).join(', ')})`);
            }
            return legend[ch];
        });
    });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/amo && node tools/maps/test_ascii_to_tiles.mjs`
Expected: `✓ ascii_to_tiles tests passed (6 assertions).`

- [ ] **Step 5: Wire the npm scripts**

In `apps/amo/package.json`, add a script and append it to the `test` chain (append whatever the current end of the chain is — earlier sub-project plans, if executed, will have extended it further; add this as the new final link regardless):

```diff
+    "test:ascii-to-tiles": "node tools/maps/test_ascii_to_tiles.mjs",
```

```diff
- ... <whatever the current last test command is>",
+ ... <whatever the current last test command is> && node tools/maps/test_ascii_to_tiles.mjs",
```

- [ ] **Step 6: Run the full test chain**

Run: `cd apps/amo && npm test`
Expected: all suites pass, ending with `✓ ascii_to_tiles tests passed (6 assertions).`

- [ ] **Step 7: Commit**

```bash
cd apps/amo
git add tools/maps/ascii_to_tiles.js tools/maps/test_ascii_to_tiles.mjs package.json
git commit -m "feat(maps): ASCII-art shorthand converter for the tiles walkability grid

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: Map assembly procedure document

**Files:**
- Create: `data/lore/campaigns/map_assembly_procedure.md`

**Interfaces:**
- Produces: the procedure document Task 6 follows to build Summit of Despair's map file.

- [ ] **Step 1: Write the procedure document**

Create `data/lore/campaigns/map_assembly_procedure.md`:

```markdown
# Map Assembly Procedure

This document defines the repeatable procedure for turning one finished
map spec (`data/lore/campaigns/<campaign>/<location>.md`, produced by
`data/lore/campaigns/map_spec_process.md`) into a real, wired-in map —
the last step of the map-authoring pipeline, after sprites are catalogued
(sprite-catalogue-system sub-project) and the engine can place them
(map-format-renderer-upgrade sub-project).

## Procedure

Given one finished map spec:

1. **Author the `tiles` grid.** Read the spec's Geography & Connectivity
   section for dimensions and terrain description. Write the layout as
   ASCII art (`.` floor, `#` wall, `=` path — `apps/amo/tools/maps/ascii_to_tiles.js`'s
   `DEFAULT_LEGEND`), then convert with `asciiToTiles()`.
2. **Populate `decorations`.** For each Point of Interest / notable prop
   the spec describes, add a `{ sheet, name, x, y, blocking?, depthOffset? }`
   entry (per the map-format-renderer-upgrade schema) — `sheet`/`name` come
   from the sprite catalogue once it's been run against the relevant
   sheets.
3. **Populate `tileset`.** Set `floor`/`path`/`decor` catalogue refs (or
   fall back to the legacy raw-int fields if no relevant sheet is
   catalogued yet) to match the spec's terrain description.
4. **Populate `spawns`.** Enemies/wildlife/gathering-nodes/chests from the
   spec's Spawns/Treasure tables, using the existing `spawns` schema
   (`enemies`, `npcs`, `chests`, `campfires`, `signs`, `gatheringNodes`,
   `crackedBoulders`, `riftGates`, `pillarGates`, `boss`).
5. **Register the map** in `apps/amo/src/data/maps/index.js`.
6. **Wire portals** bidirectionally to neighboring maps, per the spec's
   Geography & Connectivity section and the Campaign Bible's "Campaign
   Progression" order.
7. **Add/align quest data** in `apps/amo/src/data/quests.js`: new entries
   for this location's main/side quests (from the spec's Quests section),
   using real canon target ids (e.g. `malphas`, not a generic
   `void_general`) — per the Campaign Bible's own note that generic
   placeholder targets should be renamed to canon entities.
8. **Add any new reward items** referenced by new quests to
   `apps/amo/src/data/items.js`, reusing an existing `icon` key where
   thematically reasonable rather than requiring new icon art.
9. **Manually verify** via `npm run dev` — walk the map, confirm no
   console errors, confirm portals/quests trigger correctly.

## When sprites/neighboring maps aren't ready yet

Steps 2-3 and 6 can still be done with clearly-marked placeholders
(`sheet: "PLACEHOLDER/<intended sheet>"`, a `targetMap` id that doesn't
exist yet, commented as such) — this proves the data *shape* and the
registration/portal mechanism are correct without blocking on content that
isn't ready. Steps 4, 7, and 8 (spawns, quests, items) have no such
dependency and should always be done for real, since they only reference
id strings, not sprites or built maps.
```

- [ ] **Step 2: Self-review the document**

Confirm every numbered step corresponds to a real file/schema from an
earlier sub-project (`ascii_to_tiles.js` from Task 1; the `decorations`/
`tileset`/`spawns` schema from the map-format-renderer-upgrade plan; the
Campaign Bible's Campaign Progression section) and that nothing references
a file or function that doesn't actually exist. Fix anything that doesn't
hold up.

- [ ] **Step 3: Commit**

```bash
git add data/lore/campaigns/map_assembly_procedure.md
git commit -m "docs(maps): map assembly procedure

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 3: New quest-reward items

**Files:**
- Modify: `apps/amo/src/data/items.js:1126` (insert before the closing `};` of the `ITEMS` object)

**Interfaces:**
- Produces: `ITEMS.legion_lore_fragment`, `ITEMS.soul_gem_mana`, `ITEMS.aether_shard` — item ids Task 5's quest rewards reference.

- [ ] **Step 1: Add the three items**

In `apps/amo/src/data/items.js`, immediately before the final `};` that
closes the `ITEMS` object (currently the last line, `1127: };`, right
after the `void_piercer` entry), insert:

```diff
         onUse: (stats) => stats.equipItem('void_piercer'),
     },
+
+    // ── Eldoria's Prophecy: Summit of Despair quest items ───────────────────
+    legion_lore_fragment: {
+        id: 'legion_lore_fragment', name: 'Legion Lore Fragment',
+        description: "A page from the frozen scout's journal, describing the Legion's movements before the cold took them. Grants 60 XP.",
+        color: 0xaa8844, icon: 'itm_scroll', stackable: false, sellPrice: 15,
+        onUse: (stats) => { stats.gainXp(60); return true; },
+    },
+    soul_gem_mana: {
+        id: 'soul_gem_mana', name: 'Soul-Gem of Still Waters',
+        description: "A relic gem recovered from the Widow's Overlook shrine. Permanently increases Max Mana by 15.",
+        color: 0x4488ff, icon: 'itm_ring_02', stackable: false, sellPrice: 60,
+        onUse: (stats) => { stats.maxMana += 15; stats.mana = Math.min(stats.mana + 15, stats.maxMana); return true; },
+    },
+    aether_shard: {
+        id: 'aether_shard', name: 'Aether-Shard',
+        description: 'A crystallized fragment of raw Aether. Used at the Foundry of the Ancients to upgrade Tier II gear to Tier III.',
+        color: 0x9955ff, icon: 'itm_glowing_dust', stackable: true, sellPrice: 25, onUse: () => false,
+    },
 };
```

- [ ] **Step 2: Verify the file still parses**

Run: `cd apps/amo && node --check src/data/items.js`
Expected: no output (a clean exit means valid syntax — `node --check` prints nothing on success).

- [ ] **Step 3: Commit**

```bash
cd apps/amo
git add src/data/items.js
git commit -m "feat(maps): Summit of Despair quest-reward items

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 4: Summit of Despair enemy type definitions

**Files:**
- Modify: `apps/amo/src/data/worldMap.js` (append to the `ENEMY_TYPES` object)

**Interfaces:**
- Produces: `ENEMY_TYPES.gloom_beak`, `ENEMY_TYPES.frost_shade`, `ENEMY_TYPES.crag_fiend` — the exact strings Task 6's map lists in `spawns.enemies[].type`. Regular (non-boss) enemy kills fire `questManager.onKill(type, ...)` using this same string (`GameScene.js:2758-2774`), so these type keys must exist for Task 5's `clear_frost_shades` quest step to track correctly.

`ENEMY_TYPES` is pure data (stats + an existing `spriteKey`), not new code per
type — no new sprite art is required; each new entry reuses an existing,
already-loaded `spriteKey` as a stand-in, the same reuse principle Task 3
applied to item icons.

- [ ] **Step 1: Find the insertion point**

Run: `cd apps/amo && grep -n "^};" src/data/worldMap.js`

Find the `};` that closes the `export const ENEMY_TYPES = { ... }` object
(confirm by checking the lines just above it look like enemy-type entries,
e.g. the `bird_white` entry shown earlier in this session).

- [ ] **Step 2: Add the three enemy types**

Immediately before that closing `};`, insert:

```diff
+
+    // ── Eldoria's Prophecy: Summit of Despair biome (bestiary.md §2.B) ──────
+    gloom_beak: {
+        spriteKey: 'spr_bird_eagle', animProfile: 'lpc_bird',
+        bodyConfig: { w: 18, h: 12, ox: 7, oy: 16 },
+        health: 20, damage: 10, speed: 135, sightRange: 170, attackRange: 30,
+        xpReward: 22, patrolRadius: 100, tint: 0x557799,
+        lootTable: [{ id: 'mana_potion', chance: 0.15 }],
+    },
+    frost_shade: {
+        spriteKey: 'spr_shadow_sprite',
+        health: 26, damage: 14, speed: 70, sightRange: 130, attackRange: 26,
+        xpReward: 28, patrolRadius: 60, tint: 0x88ccff,
+        lootTable: [{ id: 'mana_potion', chance: 0.30 }],
+    },
+    crag_fiend: {
+        spriteKey: 'spr_void_stalker',
+        health: 70, damage: 20, speed: 40, sightRange: 140, attackRange: 32,
+        xpReward: 45, patrolRadius: 50, tint: 0x556655,
+        lootTable: [{ id: 'mineral_ore', chance: 0.40 }],
+    },
 };
```

`spriteKey`s reused: `spr_bird_eagle` (Gloom-Beak — closest existing
hostile-bird analog), `spr_shadow_sprite` (Frost-Shade — closest existing
drain-attacker analog, re-tinted icy blue instead of purple),
`spr_void_stalker` (Crag-Fiend — closest existing tanky/high-HP analog,
re-tinted grey-green). All three are confirmed already loaded in
`BootScene.js`. `lootTable` entries reuse `mana_potion`/`mineral_ore` —
both confirmed existing `ITEMS` keys.

- [ ] **Step 3: Verify the file still parses**

Run: `cd apps/amo && node --check src/data/worldMap.js`
Expected: no output.

- [ ] **Step 4: Commit**

```bash
cd apps/amo
git add src/data/worldMap.js
git commit -m "feat(maps): Summit of Despair enemy type definitions (Gloom-Beak, Frost-Shade, Crag-Fiend)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 5: Summit of Despair quest data

**Files:**
- Modify: `apps/amo/src/data/quests.js` (append a new section to the `QUESTS` object)

**Interfaces:**
- Consumes: `legion_lore_fragment`, `soul_gem_mana`, `aether_shard` item ids from Task 3.
- Produces: `QUESTS.main_whisperer_of_doubt`, `QUESTS.side_frozen_camp`, `QUESTS.side_widows_watch`, `QUESTS.side_echoes_in_the_rime` — quest ids Task 6's map def lists in its `quests` array.

- [ ] **Step 1: Find the insertion point**

Run: `cd apps/amo && grep -n "^};" src/data/quests.js`

This shows where the `QUESTS` object closes (the first match is the one
that matters if `quests.js` only exports one top-level object — confirm
by opening the file and checking there's exactly one `export const QUESTS = {`).

- [ ] **Step 2: Add the four quest entries**

Immediately before that closing `};`, insert:

```javascript

    // ── Eldoria's Prophecy: Summit of Despair ───────────────────────────────

    main_whisperer_of_doubt: {
        id: 'main_whisperer_of_doubt',
        title: 'Whisperer of Doubt',
        type: 'main',
        description: 'Malphas, the Whisperer of Doubt, haunts the pass ahead. Survive his illusions and force him to retreat.',
        steps: [
            { id: 'reach_summit', type: 'reach', target: 'summit_of_despair', label: 'Reach the summit', required: 1 },
            // NOTE: BossEnemy's death event is currently hardcoded engine-wide
            // to fire questManager.onKill('void_general', ...) regardless of
            // map/boss (GameScene.js:328,336) — there is no per-map boss
            // identity, and no "forced to retreat, not killed" outcome yet.
            // This step targets the engine's real (generic) event so the
            // quest actually completes in play; Malphas's true "retreats
            // alive" outcome (per the Campaign Bible) is narrative/quest-text
            // framing only, until the boss system is generalized — a known
            // limitation, not fixed by this plan.
            { id: 'defeat_malphas', type: 'kill', target: 'void_general', label: 'Force Malphas to retreat', required: 1 },
        ],
        reward: { glint: 200, xp: 400, items: [] },
    },

    side_frozen_camp: {
        id: 'side_frozen_camp',
        title: 'The Frozen Camp',
        type: 'side',
        description: "Investigate the frozen camp of fourteen dead and recover the scout's journal.",
        steps: [
            { id: 'read_journal', type: 'interact', target: 'scouts_journal', label: "Read the scout's journal", required: 1 },
        ],
        reward: { glint: 40, xp: 60, items: ['legion_lore_fragment'] },
    },

    side_widows_watch: {
        id: 'side_widows_watch',
        title: "The Widow's Watch",
        type: 'side',
        description: "Relight the shrine brazier at Widow's Overlook to claim what it guards.",
        steps: [
            { id: 'gather_flint',        type: 'gather',   target: 'flint',          label: 'Gather Flint (0/1)',        required: 1 },
            { id: 'gather_wood_shrine',  type: 'gather',   target: 'wood',           label: 'Gather Wood (0/1)',         required: 1 },
            { id: 'light_brazier',       type: 'interact', target: 'shrine_brazier', label: 'Relight the shrine brazier', required: 1 },
        ],
        reward: { glint: 0, xp: 80, items: ['soul_gem_mana'] },
    },

    side_echoes_in_the_rime: {
        id: 'side_echoes_in_the_rime',
        title: 'Echoes in the Rime',
        type: 'side',
        description: 'Clear the Frost-Shades guarding the Rime Hollow and solve its rune-puzzle door.',
        steps: [
            { id: 'clear_frost_shades', type: 'kill',      target: 'frost_shade',           label: 'Clear the Frost-Shades (0/2)',  required: 2 },
            { id: 'solve_rune_door',    type: 'interact',  target: 'rime_hollow_rune_door', label: 'Solve the rune-puzzle door',    required: 1 },
        ],
        reward: { glint: 0, xp: 100, items: ['aether_shard', 'aether_shard'] },
    },
```

- [ ] **Step 3: Verify the file still parses**

Run: `cd apps/amo && node --check src/data/quests.js`
Expected: no output.

- [ ] **Step 4: Commit**

```bash
cd apps/amo
git add src/data/quests.js
git commit -m "feat(maps): Summit of Despair quest data (main + 3 side quests)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 6: Summit of Despair map (proof application, placeholders for sprites/neighbors)

**Files:**
- Create: `apps/amo/src/data/maps/summit_of_despair.js`
- Modify: `apps/amo/src/data/maps/index.js`

**Interfaces:**
- Consumes: `asciiToTiles`/`DEFAULT_LEGEND` from Task 1; `gloom_beak`/`frost_shade`/`crag_fiend` enemy type keys from Task 4; quest ids from Task 5 (`main_whisperer_of_doubt`, `side_frozen_camp`, `side_widows_watch`, `side_echoes_in_the_rime`).
- Produces: `SUMMIT_OF_DESPAIR`, registered under map id `summit_of_despair` in `maps/index.js`.

- [ ] **Step 1: Write the map file**

Create `apps/amo/src/data/maps/summit_of_despair.js`:

```javascript
// Summit of Despair — blizzard high pass, Act II (Song 4)
// Source: data/lore/campaigns/eldorias_prophecy/summit_of_despair.md
//
// PROOF-APPLICATION NOTE: this map is a structural proof of the map-
// assembly procedure (data/lore/campaigns/map_assembly_procedure.md),
// built before real catalogued sprites or neighboring maps exist:
//   - `decorations`/`tileset` entries use PLACEHOLDER sheet/name refs —
//     replace with real sprite-catalogue lookups once lpc/trunk,
//     lpc/treetop, and a snow/rock terrain sheet are actually catalogued.
//   - Portals point at `east_road`/`sylvan_sanctuary`, which don't exist
//     yet — wire for real once those maps are built.
// This is a scaled-down proof grid (18x20), not the spec's full ~45x65
// production size — the mechanism is what's being proven here, not the
// final scale.
import { asciiToTiles } from '../../../tools/maps/ascii_to_tiles.js';

const SUMMIT_ASCII = [
    '#######===########',
    '#######...########',
    '#######...###....#',
    '#######..........#',
    '#######...###....#',
    '########...#######',
    '#....###...#######',
    '#..........#######',
    '#....###...#######',
    '########...#######',
    '#########...######',
    '#########...######',
    '#####........#####',
    '#####........#####',
    '#####........#####',
    '########...#######',
    '########...#######',
    '########...#######',
    '########...#######',
    '########===#######',
].join('\n');

const SUMMIT_TILES = asciiToTiles(SUMMIT_ASCII);

export const SUMMIT_OF_DESPAIR = {
    id: 'summit_of_despair',
    displayName: 'Summit of Despair',
    tiles: SUMMIT_TILES,
    lightTint: 0x0a1830, // blizzard blue-grey, low visibility
    playerStart: { x: 8, y: 18 },
    tileset: {
        key: 'tileset_base',
        // PLACEHOLDER: replace with a real catalogued snow/rock terrain
        // sheet's { sheet, name } refs once one has been catalogued.
        floor: { sheet: 'PLACEHOLDER/snow_terrain', name: 'PLACEHOLDER' },
        path:  { sheet: 'PLACEHOLDER/snow_terrain', name: 'PLACEHOLDER' },
        decor: [],
        decorRate: 0,
    },
    decorations: [
        // Widow's Overlook shrine (Points of Interest — new content)
        { sheet: 'PLACEHOLDER/lpc/props', name: 'PLACEHOLDER', x: 2, y: 7, blocking: true },
        // The Rime Hollow entrance marker
        { sheet: 'PLACEHOLDER/lpc/props', name: 'PLACEHOLDER', x: 14, y: 3, blocking: true },
    ],
    portals: [
        {
            id: 'to_east_road',
            x: 8, y: 19,
            label: 'Back down to the East Road',
            targetMap: 'east_road', // NOT YET BUILT — wire for real once it exists
            targetX: 8 * 32 + 16,
            targetY: 2 * 32 + 16,
        },
        {
            id: 'to_sylvan_sanctuary',
            x: 8, y: 0,
            label: 'Over the pass to the Sylvan Sanctuary',
            targetMap: 'sylvan_sanctuary', // NOT YET BUILT — wire for real once it exists
            targetX: 8 * 32 + 16,
            targetY: 18 * 32 + 16,
        },
    ],
    spawns: {
        enemies: [
            { x: 9, y: 2,  type: 'gloom_beak' },
            { x: 8, y: 6,  type: 'gloom_beak' },
            { x: 9, y: 10, type: 'gloom_beak' },
            { x: 8, y: 16, type: 'gloom_beak' },
            { x: 9, y: 9,  type: 'frost_shade' },
            { x: 8, y: 15, type: 'frost_shade' },
            { x: 10, y: 13, type: 'frost_shade' },
            { x: 15, y: 3, type: 'frost_shade' }, // Rime Hollow guard
            { x: 13, y: 3, type: 'frost_shade' }, // Rime Hollow guard
            { x: 9, y: 11, type: 'crag_fiend' },
            { x: 8, y: 17, type: 'crag_fiend' },
        ],
        npcs: [],
        chests: [
            { x: 9, y: 13, items: ['legion_lore_fragment'] },  // Frozen Camp — scout's journal
            { x: 2, y: 7,  items: ['soul_gem_mana'] },          // Widow's Overlook shrine cache
            { x: 14, y: 3, items: ['aether_shard'] },           // The Rime Hollow rune-door reward
        ],
        campfires: [],
        signs: [
            {
                x: 9, y: 13,
                text: "A scout's journal, half-frozen: \"...the whispering thing arrived before the cold got the rest of us. Tell the Archivists — it feeds on doubt, not blood...\"",
            },
        ],
        gatheringNodes: [],
        crackedBoulders: [],
        riftGates: [],
        pillarGates: [],
        // NOTE: enemyType/drops/kill-target for this boss are currently
        // hardcoded engine-wide to the generic 'void_general' (see
        // GameScene.js:324-351) — Malphas's specific identity here is
        // narrative/quest-text only, a known limitation out of scope for
        // this plan (see the quest step comment above).
        boss: { spawn: { x: 8, y: 1 } },
    },
    currencyBias: 'rural',
    music: 'forest',
    quests: [
        'main_whisperer_of_doubt', 'side_frozen_camp',
        'side_widows_watch', 'side_echoes_in_the_rime',
    ],
    chapterTitle: 'Act II: Summit of Despair',
    introDialogue: null,
    introRegistryKey: null,
};
```

- [ ] **Step 2: Register the map**

In `apps/amo/src/data/maps/index.js`:

```diff
 import { PROLOGUE_FOREST } from './prologue_forest.js';
 import { HERMIT_HUT }      from './hermit_hut.js';
 import { ELDRIN_TOWER }    from './eldrin_tower.js';
 import { NORTHERN_FOREST } from './northern_forest.js';
+import { SUMMIT_OF_DESPAIR } from './summit_of_despair.js';

 const REGISTRY = {
     prologue_forest:  PROLOGUE_FOREST,
     hermit_hut:       HERMIT_HUT,
     eldrin_tower:     ELDRIN_TOWER,
     northern_forest:  NORTHERN_FOREST,
+    summit_of_despair: SUMMIT_OF_DESPAIR,
 };
```

- [ ] **Step 3: Verify the map file parses and builds a valid tiles grid**

Run: `cd apps/amo && node --check src/data/maps/summit_of_despair.js`
Expected: no output.

Run:
```bash
cd apps/amo && node -e "
import('./src/data/maps/summit_of_despair.js').then(m => {
  const t = m.SUMMIT_OF_DESPAIR.tiles;
  console.log('rows:', t.length, 'cols:', t[0].length);
  console.log('all rows same width:', t.every(r => r.length === t[0].length));
});
"
```
Expected: `rows: 20 cols: 18` and `all rows same width: true`.

- [ ] **Step 4: Manually verify in the dev server**

Run: `cd apps/amo && npm run dev`

In the browser, use the browser console (or a temporary debug link) to
navigate to the `summit_of_despair` map — e.g. by temporarily changing
`GameScene.init`'s default `data?.mapId` fallback, or via any existing
map-select debug path the game already has. Expected: the map loads with
no console errors; the wall/path layout matches the ASCII grid (walkable
where `.`/`=`, blocked where `#`); decorations render as broken/missing
textures (expected — they're `PLACEHOLDER` refs, not real catalogue
lookups yet, so `resolveCatalogueRef` will throw/log rather than silently
succeed once the map-format-renderer-upgrade sub-project's resolver is in
place); the four new quests appear correctly in the quest log. Revert any
temporary debug navigation change before committing. Stop the dev server
once confirmed.

- [ ] **Step 5: Commit**

```bash
cd apps/amo
git add src/data/maps/summit_of_despair.js src/data/maps/index.js
git commit -m "feat(maps): Summit of Despair map (proof application — placeholder sprites/neighbors)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Follow-up (explicitly not part of this plan)

- Swap Summit of Despair's `PLACEHOLDER` catalogue refs for real `{sheet, name}` values once `lpc/trunk`, `lpc/treetop`, and a snow/rock terrain sheet are actually catalogued (sprite-catalogue-system sub-project execution).
- Build `east_road` and `sylvan_sanctuary`, then wire Summit of Despair's two portals for real.
- Run the lore-driven map spec process for the other 11 Eldoria's Prophecy locations, then run this same assembly procedure for each.

## Plan Self-Review Notes

- **Spec coverage:** ASCII tool → Task 1. Assembly procedure → Task 2. Proof application → Tasks 3-6 (items → enemy types → quests → map, in dependency order). Placeholder marking for sprites/portals, and real (non-placeholder) quest/item/enemy-type data, both match the spec's explicit split exactly. Task 4 (enemy types) and the boss hardcoding note weren't in the original spec's component list — they surfaced during planning as necessary for the quest/spawn data to actually function, and are called out explicitly rather than silently patched over.
- **Placeholder scan:** No `TBD`/vague steps. The literal string `PLACEHOLDER` appearing in Task 6's map data is the spec's own deliberate, documented device — not a plan-quality violation — and Task 6 explains why in an inline code comment, matching the spec's "clearly-marked placeholder" requirement.
- **Type/interface consistency:** `asciiToTiles`'s signature in Task 6's import matches Task 1's export exactly. The three enemy type keys in Task 6's `spawns.enemies` match Task 4's `ENEMY_TYPES` keys verbatim. The four quest ids in Task 6's `quests` array match Task 5's `QUESTS` keys verbatim. The three item ids in Task 6's `chests`/quest rewards match Task 3's `ITEMS` keys verbatim (`legion_lore_fragment`, `soul_gem_mana`, `aether_shard`).
