# Eldoria's Prophecy Campaign Spine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Eldoria's Prophecy a real campaign in the engine — twelve chapters transcribed from the bible, gated map entry, a granted unlock ladder, and progress that survives a reload — walkable start to finish through two real chapters and ten placeholder ones.

**Architecture:** A campaign is a data file (`src/data/campaigns/eldorias_prophecy.js`) read by one new system, `CampaignManager`, which observes `QuestManager`'s existing event stream rather than driving it. Progress rides the existing `SaveManager` as one new field. Gating hooks the single in-world choke point every portal transition already goes through (`GameScene._enterPortal`); the developer-only "New Game" map picker in `CharacterSelectScene` is deliberately left ungated, since it exists to let a developer jump straight to any map under construction. Ten placeholder maps are built through one shared factory (`src/data/maps/_stubs.js`) rather than ten hand-typed tile grids.

**Tech Stack:** Plain ESM JS, matching the existing codebase exactly — no new dependencies. Tests are plain Node scripts under `apps/amo/tools/`, wired into `npm test`, matching every existing test in the repo (`check(name, got, want)` pattern, `process.exit(1)` on failure).

**Spec:** `docs/superpowers/specs/2026-09-08-eldorias-prophecy-campaign-spine-design.md`

## Global Constraints

- Tile legend is universal across every map in this engine (verified in `GameScene.js`'s `_buildWorld()`): `0` = floor, `1` = wall/tree (renders as an LPC tree regardless of theme — a known, accepted, pre-existing limitation), `2` = path. Every new map file uses this exactly; never redefine it.
- `TILE_SIZE = 32` (from `src/data/worldMap.js`). Every portal's `targetX`/`targetY` is a pixel coordinate: `tileCol * 32 + 16`, `tileRow * 32 + 16` — the existing convention in every map file in the repo.
- A portal's destination coordinates are **always the source portal's own explicit `targetX`/`targetY`** — a destination map's `playerStart` is never consulted during a portal transition (only `CharacterSelectScene`'s fresh-game spawn reads it). Every new portal in this plan sets real, concrete coordinates.
- Two real chapters already exist and are not rebuilt: chapter 1 (`main_read_the_erasure`, wired into `echoes_of_stone`'s existing sign) and chapter 4 (`main_whisperer_of_doubt`, wired into `summit_of_despair`'s existing boss). Both are completable today with zero new content.
- `CharacterSelectScene`'s New Game map picker (`src/scenes/CharacterSelectScene.js:22-24`, its own comment: *"lets a tester override which map New Game starts on"*) stays ungated in this plan — it is the tool this plan's own author needs to build and test the other nine chapters one at a time. `stories.js`'s default start map (`prologue_forest`) is not touched.
- Every unlock this plan actually grants must be safe and real — never a fabricated id, never a double-grant of something existing content already delivers (chapter 1's `scholars_staff` is already given by `echoes_of_stone`'s chest; the campaign layer must not grant it again, since it is `stackable: false` and a second grant would duplicate it in inventory). Where the bible names an unlock with no safe existing mechanic to map it to, the chapter's `unlocks` stays `[]` rather than inventing content — this is called out inline in Task 7, not left silent.
- Stub content is clearly labeled scaffolding everywhere it appears (map ids prefixed by chapter, quest ids prefixed `stub_`, NPC name `Placeholder`, dialogue text opens with `[SCAFFOLDING]`) so nothing is mistaken for real content later.

---

### Task 1: SaveManager — persist and restore campaign progress

**Files:**
- Modify: `apps/amo/src/systems/SaveManager.js:9-44` (the `save()` method's `data` object and its `localStorage.setItem` call)
- Modify: `apps/amo/src/systems/SaveManager.js:47-88` (the `load()` method)
- Create: `apps/amo/tools/test_campaign_manager.mjs` (this task writes its first section; Task 3 extends it)

**Interfaces:**
- Consumes: nothing new — `stats.campaign` is a plain object or `null`, added to `PlayerStats` in Task 2, but `SaveManager` only ever reads/writes whatever is on `stats.campaign` without knowing its shape, exactly like it already does for `stats.questLog`.
- Produces: `SaveManager.save(stats, storyId, characterId)` and `SaveManager.load(stats, storyId, characterId)` now round-trip a `campaign` field. Task 3's `CampaignManager` relies on this.

- [ ] **Step 1: Write the failing test**

Create `apps/amo/tools/test_campaign_manager.mjs`:

```javascript
#!/usr/bin/env node
/**
 * Unit tests for the campaign spine: SaveManager's campaign round-trip
 * (this file), and CampaignManager's gating/completion/unlock logic
 * (added by a later task in the same plan).
 * Run: node tools/test_campaign_manager.mjs (or: npm run test:campaign-manager)
 */

// SaveManager reads/writes localStorage directly — stub it the same way a
// browser would provide it, backed by an in-memory Map so tests don't touch
// the filesystem or a real browser.
const store = new Map();
globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
};

const { SaveManager } = await import('../src/systems/SaveManager.js');

let passed = 0;
const fails = [];
function check(name, got, want) {
    const eq = JSON.stringify(got) === JSON.stringify(want);
    if (eq) passed++;
    else fails.push(`${name}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
}

// ── SaveManager: campaign field round-trips ─────────────────────────────────
{
    const minimalStats = () => ({
        level: 1, xp: 0, xpToNextLevel: 100, health: 60, maxHealth: 60,
        mana: 10, maxMana: 10, glint: 0, gold: 50, skillPoints: 0,
        attributePoints: 0, satchelTier: 1,
        attributes: { strength: 5, intelligence: 5, stamina: 5, agility: 5 },
        equipment: { head: null, body: null, weapon: null, accessory1: null, accessory2: null },
        skills: { basic_strike: { level: 1 } },
        spells: {}, resonance: {}, spellCooldowns: {}, skillSlots: [null, null, null, null],
        attunedGates: [], exploredChunks: [], questLog: {}, recoveredMemories: [],
        inventory: [], resonanceInsights: 0, masteries: {}, codexEchoes: [],
        killedEnemyTypes: [], seenItems: new Set(),
        campaign: { id: 'eldorias_prophecy', chapter: 'ch04_summit_of_despair', completed: ['ch01_echoes_of_stone'] },
    });

    const stats = minimalStats();
    const ok = SaveManager.save(stats, 'test_story', 'test_char');
    check('save() returns true', ok, true);

    const loaded = minimalStats();
    loaded.campaign = null; // clear before load — proves load() actually restores it
    SaveManager.load(loaded, 'test_story', 'test_char');
    check('campaign round-trips through save/load', loaded.campaign, stats.campaign);
}
{
    // A save with no campaign progress at all (a save from before this
    // feature existed) must not throw and must leave campaign falsy.
    const stats = {
        level: 1, xp: 0, xpToNextLevel: 100, health: 60, maxHealth: 60,
        mana: 10, maxMana: 10, skillPoints: 0, attributes: { strength: 5, intelligence: 5, stamina: 5, agility: 5 },
        equipment: {}, skills: {}, inventory: [],
    };
    const ok = SaveManager.save(stats, 'test_story2', 'test_char2');
    check('save() with no campaign field still succeeds', ok, true);

    const loaded = { ...stats, campaign: 'not yet cleared' };
    let threw = false;
    try { SaveManager.load(loaded, 'test_story2', 'test_char2'); }
    catch { threw = true; }
    check('load() of a campaign-less save does not throw', threw, false);
    check('load() of a campaign-less save leaves campaign null', loaded.campaign, null);
}

if (fails.length) {
    console.error(`✗ campaign-manager tests FAILED — ${fails.length}/${passed + fails.length}:`);
    for (const f of fails) console.error('  ' + f);
    process.exit(1);
}
console.log(`✓ campaign-manager tests passed (${passed}).`);
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/amo && node tools/test_campaign_manager.mjs`
Expected: FAIL — `campaign round-trips through save/load` reports `got null, want {...}` (SaveManager doesn't touch `campaign` yet).

- [ ] **Step 3: Add `campaign` to `SaveManager.save()`**

In `apps/amo/src/systems/SaveManager.js`, inside the `data` object literal in `save()`, add one line after `killedEnemyTypes`:

```javascript
            killedEnemyTypes:  [...(stats.killedEnemyTypes ?? [])],
            seenItems:         [...(stats.seenItems ?? [])],
            campaign:          stats.campaign ? JSON.parse(JSON.stringify(stats.campaign)) : null,
            timestamp:     Date.now(),
```

- [ ] **Step 4: Add `campaign` to `SaveManager.load()`**

In the same file, inside `load()`, add after the `killedEnemyTypes` restore line:

```javascript
            if (d.killedEnemyTypes) stats.killedEnemyTypes = [...d.killedEnemyTypes];
            stats.campaign = d.campaign ? JSON.parse(JSON.stringify(d.campaign)) : null;
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd apps/amo && node tools/test_campaign_manager.mjs`
Expected: `✓ campaign-manager tests passed (4).`

- [ ] **Step 6: Wire the new test into `npm test`**

In `apps/amo/package.json`, add a new script and extend the `test` chain:

```json
    "test:campaign-manager": "node tools/test_campaign_manager.mjs",
```

Insert this line after `"test:ascii-to-tiles"`. Then extend the `"test"` script's value by appending ` && node tools/test_campaign_manager.mjs` right before the closing quote (after `node tools/maps/test_ascii_to_tiles.mjs`).

- [ ] **Step 7: Run full suite, then commit**

Run: `cd apps/amo && npm test`
Expected: every existing suite still passes, plus `✓ campaign-manager tests passed (4).`

```bash
cd apps/amo
git add src/systems/SaveManager.js tools/test_campaign_manager.mjs package.json
git commit -m "feat(campaign): persist and restore campaign progress in SaveManager

One new field, round-tripped exactly like questLog: stats.campaign is a
plain {id, chapter, completed[]} object or null. A save with no campaign
field (pre-existing saves) loads as null rather than throwing.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01XdXdN1GgBhWmdx4TWBe7Tb"
```

---

### Task 2: PlayerStats — campaign field and free unlock grants

**Files:**
- Modify: `apps/amo/src/systems/PlayerStats.js` (constructor, `reset()`, and two new methods)
- Modify: `apps/amo/tools/test_campaign_manager.mjs` (extend with a new section)

**Interfaces:**
- Consumes: nothing new.
- Produces: `playerStats.campaign` (initially `null`); `playerStats.forceUnlockSpell(id, tier = 1) → boolean`; `playerStats.forceUnlockSkill(id) → boolean`. Task 3's `CampaignManager._grantUnlock()` calls both.

**Why two new methods:** the campaign's unlock ladder needs to grant a spell or a skill outright, on chapter completion, with no cost. The existing spell system only grants spells through resonance thresholds (`_checkSpellProgress`), and the existing skill system only grants skill levels by spending `skillPoints` (`upgradeSkill`). Neither is "free, on command" — these two small methods are that, and nothing else; they don't touch resonance or spend points.

- [ ] **Step 1: Write the failing test**

Append to `apps/amo/tools/test_campaign_manager.mjs`, after the existing SaveManager section and before the `if (fails.length)` block at the end:

```javascript
// ── PlayerStats: free unlock grants ─────────────────────────────────────────
{
    const { PlayerStats } = await import('../src/systems/PlayerStats.js');
    const stats = new PlayerStats();

    check('campaign starts null', stats.campaign, null);

    const grantedSpell = stats.forceUnlockSpell('novice_fireball'); // any real spell id works
    // ^ replaced below once we know a real id; see Step 2 note.
}
```

Before finalizing this step, find one real spell id to test against:

Run: `cd apps/amo && node -e "import('./src/data/spells.js').then(m => console.log(Object.keys(m.SPELLS)[0]))"`

Use whatever id that prints (call it `<REAL_SPELL_ID>`) in the test below. Replace the placeholder block above with:

```javascript
// ── PlayerStats: free unlock grants ─────────────────────────────────────────
{
    const { PlayerStats } = await import('../src/systems/PlayerStats.js');
    const { SPELLS } = await import('../src/data/spells.js');
    const realSpellId = Object.keys(SPELLS)[0];
    const stats = new PlayerStats();

    check('campaign starts null', stats.campaign, null);

    check('forceUnlockSpell on a real id succeeds', stats.forceUnlockSpell(realSpellId), true);
    check('forceUnlockSpell sets the spell to tier 1', stats.spells[realSpellId], 1);
    check('forceUnlockSpell on an unknown id fails', stats.forceUnlockSpell('not_a_real_spell'), false);

    const higherTier = stats.forceUnlockSpell(realSpellId, 2);
    check('forceUnlockSpell can raise to a higher tier', [higherTier, stats.spells[realSpellId]], [true, 2]);
    stats.forceUnlockSpell(realSpellId, 1);
    check('forceUnlockSpell never lowers an existing tier', stats.spells[realSpellId], 2);

    check('forceUnlockSkill on a real id succeeds', stats.forceUnlockSkill('aetheric_sight'), true);
    check('forceUnlockSkill sets level to at least 1', stats.skills.aetheric_sight.level >= 1, true);
    check('forceUnlockSkill on an unknown id fails', stats.forceUnlockSkill('not_a_real_skill'), false);

    stats.skills.aetheric_sight.level = 3;
    stats.forceUnlockSkill('aetheric_sight');
    check('forceUnlockSkill never lowers an existing level', stats.skills.aetheric_sight.level, 3);
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/amo && node tools/test_campaign_manager.mjs`
Expected: FAIL on `campaign starts null` (`playerStats.campaign` doesn't exist — `got undefined, want null`) and on both `forceUnlock*` calls (not functions yet).

- [ ] **Step 3: Add the `campaign` field**

In `apps/amo/src/systems/PlayerStats.js`, in the constructor, add right after the `this.questLog = {};` line (in the "Quest log" block):

```javascript
        // Campaign progress: { id, chapter, completed: [] } or null — see
        // CampaignManager, which owns writing to this. One campaign at a
        // time; a second in-progress campaign would need its own field.
        this.campaign = null;
```

In `reset()`, add right after `this.questLog = {};`:

```javascript
        this.campaign          = null;
```

- [ ] **Step 4: Add `forceUnlockSpell` and `forceUnlockSkill`**

In the same file, add these two methods right after `getSpellLevel(id) { return this.spells[id] ?? 0; }`:

```javascript
    // Grants a spell outright, bypassing the resonance-threshold discovery
    // system — used only by CampaignManager to deliver the bible's unlock
    // ladder. Never lowers an existing (higher) tier.
    forceUnlockSpell(id, tier = 1) {
        if (!(id in this.spells)) return false;
        this.spells[id] = Math.max(this.spells[id], tier);
        return true;
    }

    // Grants a skill level outright, bypassing skillPoints — same purpose
    // as forceUnlockSpell, for the skill tree instead of the spellbook.
    forceUnlockSkill(id) {
        if (!this.skills[id]) return false;
        if (this.skills[id].level < 1) this.skills[id].level = 1;
        return true;
    }
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd apps/amo && node tools/test_campaign_manager.mjs`
Expected: `✓ campaign-manager tests passed (13).`

- [ ] **Step 6: Run full suite, then commit**

Run: `cd apps/amo && npm test`

```bash
cd apps/amo
git add src/systems/PlayerStats.js tools/test_campaign_manager.mjs
git commit -m "feat(campaign): PlayerStats.campaign field + free spell/skill grants

forceUnlockSpell/forceUnlockSkill grant outright, bypassing the resonance
and skillPoints systems — CampaignManager's only use for them. Neither
lowers an existing tier/level.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01XdXdN1GgBhWmdx4TWBe7Tb"
```

---

### Task 3: CampaignManager — gating, completion, unlocks

**Files:**
- Create: `apps/amo/src/systems/CampaignManager.js`
- Modify: `apps/amo/tools/test_campaign_manager.mjs` (main section — tested entirely against fixture data, not the real campaign)

**Interfaces:**
- Consumes: `questManager.onQuestEvent(fn)`, `questManager.isCompleted(questId)` (both existing, from `apps/amo/src/systems/QuestManager.js`); `playerStats.campaign`, `playerStats.addItem(id)`, `playerStats.forceUnlockSpell(id)`, `playerStats.forceUnlockSkill(id)` (from Task 2); `getCampaign(id)` (Task 7 — but this task tests `CampaignManager` as a plain class against constructor-injected fixture data, so it does not need Task 7 to exist yet; the module-level singleton export wires in the real campaign and is only exercised by Task 8's wiring and Task 9's walkthrough).
- Produces: `class CampaignManager` with `currentChapter()`, `chapterFor(mapId)`, `canEnter(mapId) → {allowed, reason}`, `isChapterComplete(chapterId) → boolean`; and `export const campaignManager` — a singleton constructed against the real `eldorias_prophecy` campaign, imported by Task 8.

**Design note carried over from the spec:** a quest completing does not tell `CampaignManager` *which* chapter to re-check — every quest event triggers a fresh poll of whatever chapter is currently active, in a loop that keeps advancing as long as the (now-)current chapter is already complete. This makes the order two different chapters' quests actually finish in irrelevant: a later chapter's quest that happens to complete early (reachable because it shares a real, later-built map with an earlier chapter) just sits inertly in the quest log until the campaign reaches it, at which point the fresh poll sees it done and advances immediately — no separate bookkeeping needed.

- [ ] **Step 1: Write the failing tests**

Replace the entire contents of `apps/amo/tools/test_campaign_manager.mjs` with the full file below (this supersedes the file from Tasks 1–2 by including their sections plus the new one):

```javascript
#!/usr/bin/env node
/**
 * Unit tests for the campaign spine: SaveManager's campaign round-trip,
 * PlayerStats's free unlock grants, and CampaignManager's gating,
 * completion and unlock-granting logic (tested against fixture data, not
 * the real Eldoria's Prophecy campaign — see test_campaign_definition.mjs
 * for the file that checks the real campaign against the bible).
 * Run: node tools/test_campaign_manager.mjs (or: npm run test:campaign-manager)
 */

// SaveManager reads/writes localStorage directly — stub it the same way a
// browser would provide it, backed by an in-memory Map so tests don't touch
// the filesystem or a real browser.
const store = new Map();
globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
};

const { SaveManager } = await import('../src/systems/SaveManager.js');
const { PlayerStats } = await import('../src/systems/PlayerStats.js');
const { SPELLS } = await import('../src/data/spells.js');
const { CampaignManager } = await import('../src/systems/CampaignManager.js');

let passed = 0;
const fails = [];
function check(name, got, want) {
    const eq = JSON.stringify(got) === JSON.stringify(want);
    if (eq) passed++;
    else fails.push(`${name}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
}

// ── SaveManager: campaign field round-trips ─────────────────────────────────
{
    const minimalStats = () => ({
        level: 1, xp: 0, xpToNextLevel: 100, health: 60, maxHealth: 60,
        mana: 10, maxMana: 10, glint: 0, gold: 50, skillPoints: 0,
        attributePoints: 0, satchelTier: 1,
        attributes: { strength: 5, intelligence: 5, stamina: 5, agility: 5 },
        equipment: { head: null, body: null, weapon: null, accessory1: null, accessory2: null },
        skills: { basic_strike: { level: 1 } },
        spells: {}, resonance: {}, spellCooldowns: {}, skillSlots: [null, null, null, null],
        attunedGates: [], exploredChunks: [], questLog: {}, recoveredMemories: [],
        inventory: [], resonanceInsights: 0, masteries: {}, codexEchoes: [],
        killedEnemyTypes: [], seenItems: new Set(),
        campaign: { id: 'eldorias_prophecy', chapter: 'ch04_summit_of_despair', completed: ['ch01_echoes_of_stone'] },
    });

    const stats = minimalStats();
    const ok = SaveManager.save(stats, 'test_story', 'test_char');
    check('save() returns true', ok, true);

    const loaded = minimalStats();
    loaded.campaign = null;
    SaveManager.load(loaded, 'test_story', 'test_char');
    check('campaign round-trips through save/load', loaded.campaign, stats.campaign);
}
{
    const stats = {
        level: 1, xp: 0, xpToNextLevel: 100, health: 60, maxHealth: 60,
        mana: 10, maxMana: 10, skillPoints: 0, attributes: { strength: 5, intelligence: 5, stamina: 5, agility: 5 },
        equipment: {}, skills: {}, inventory: [],
    };
    const ok = SaveManager.save(stats, 'test_story2', 'test_char2');
    check('save() with no campaign field still succeeds', ok, true);

    const loaded = { ...stats, campaign: 'not yet cleared' };
    let threw = false;
    try { SaveManager.load(loaded, 'test_story2', 'test_char2'); }
    catch { threw = true; }
    check('load() of a campaign-less save does not throw', threw, false);
    check('load() of a campaign-less save leaves campaign null', loaded.campaign, null);
}

// ── PlayerStats: free unlock grants ─────────────────────────────────────────
{
    const realSpellId = Object.keys(SPELLS)[0];
    const stats = new PlayerStats();

    check('campaign starts null', stats.campaign, null);

    check('forceUnlockSpell on a real id succeeds', stats.forceUnlockSpell(realSpellId), true);
    check('forceUnlockSpell sets the spell to tier 1', stats.spells[realSpellId], 1);
    check('forceUnlockSpell on an unknown id fails', stats.forceUnlockSpell('not_a_real_spell'), false);

    const higherTier = stats.forceUnlockSpell(realSpellId, 2);
    check('forceUnlockSpell can raise to a higher tier', [higherTier, stats.spells[realSpellId]], [true, 2]);
    stats.forceUnlockSpell(realSpellId, 1);
    check('forceUnlockSpell never lowers an existing tier', stats.spells[realSpellId], 2);

    check('forceUnlockSkill on a real id succeeds', stats.forceUnlockSkill('aetheric_sight'), true);
    check('forceUnlockSkill sets level to at least 1', stats.skills.aetheric_sight.level >= 1, true);
    check('forceUnlockSkill on an unknown id fails', stats.forceUnlockSkill('not_a_real_skill'), false);

    stats.skills.aetheric_sight.level = 3;
    stats.forceUnlockSkill('aetheric_sight');
    check('forceUnlockSkill never lowers an existing level', stats.skills.aetheric_sight.level, 3);
}

// ── CampaignManager: gating, completion, unlocks — all against fixtures ────
// A tiny fake QuestManager: complete(questId) marks it done and fires every
// registered callback, exactly like the real QuestManager's _notify does.
function makeFakeQuestManager() {
    const completed = new Set();
    const callbacks = [];
    return {
        isCompleted: (id) => completed.has(id),
        onQuestEvent: (fn) => callbacks.push(fn),
        complete(id) {
            completed.add(id);
            callbacks.forEach(fn => fn(id, null, -1));
        },
    };
}

function makeFakeCampaign() {
    return {
        id: 'fixture_campaign',
        chapters: [
            { id: 'f1', maps: ['map_a'], quests: ['q1'], unlocks: [{ type: 'item', id: 'health_potion' }], title: 'Fixture One' },
            { id: 'f2', maps: ['map_b'], quests: ['q2a', 'q2b'], unlocks: [], title: 'Fixture Two' },
            { id: 'f3', maps: ['map_b', 'map_c'], quests: ['q3'], unlocks: [{ type: 'ability', id: 'aetheric_sight' }], title: 'Fixture Three' },
        ],
    };
}

{
    const fakeQuests = makeFakeQuestManager();
    const stats = new PlayerStats();
    const cm = new CampaignManager({
        campaign: makeFakeCampaign(),
        questManager: fakeQuests,
        playerStats: stats,
    });

    check('a fresh campaign starts at the first chapter', cm.currentChapter().id, 'f1');
    check('unclaimed maps are always enterable', cm.canEnter('some_sandbox_map').allowed, true);
    check('the current chapter\'s own map is enterable', cm.canEnter('map_a').allowed, true);
    check('a later chapter\'s map is refused', cm.canEnter('map_b').allowed, false);
    check('a refusal carries a reason', typeof cm.canEnter('map_b').reason, 'string');

    check('chapterFor finds the right chapter', cm.chapterFor('map_a').id, 'f1');
    check('chapterFor returns null for an unclaimed map', cm.chapterFor('nope'), null);
    check('chapterFor returns the earliest chapter for a shared map', cm.chapterFor('map_b').id, 'f2');

    check('isChapterComplete is false with no quests done', cm.isChapterComplete('f1'), false);
    check('inventory has no potion yet', stats.inventory.some(i => i.id === 'health_potion'), false);

    fakeQuests.complete('q1');
    check('completing the only quest advances the chapter', cm.currentChapter().id, 'f2');
    check('the completed chapter is recorded', stats.campaign.completed, ['f1']);
    check('its unlock was granted', stats.inventory.some(i => i.id === 'health_potion'), true);
    check('map_b is now enterable', cm.canEnter('map_b').allowed, true);
    check('map_c (chapter 3) is still refused', cm.canEnter('map_c').allowed, false);

    fakeQuests.complete('q2a');
    check('one of two quests is not enough', cm.currentChapter().id, 'f2');

    // Sequence-break: q3 (chapter 3's own quest) completes while chapter 2
    // is still current, because it lives on map_c, and map_c happens to sit
    // right next to map_b's own content in this fixture. Nothing should
    // happen yet — chapter 2 isn't done.
    fakeQuests.complete('q3');
    check('an out-of-order future quest does not skip ahead', cm.currentChapter().id, 'f2');

    fakeQuests.complete('q2b');
    // Both chapter 2 AND chapter 3 should now be complete in one pass —
    // chapter 3's quest already finished above, so the moment chapter 2
    // completes, the fresh-poll loop must cascade straight through it.
    check('finishing chapter 2 cascades through the already-done chapter 3', cm.currentChapter(), null);
    check('both chapters are recorded complete', stats.campaign.completed, ['f1', 'f2', 'f3']);
    check('chapter 3\'s ability unlock was granted', stats.skills.aetheric_sight.level >= 1, true);
}

// ── CampaignManager: an unrecognised save chapter falls back, not throws ───
{
    const fakeQuests = makeFakeQuestManager();
    const stats = new PlayerStats();
    stats.campaign = { id: 'fixture_campaign', chapter: 'not_a_real_chapter_id', completed: ['f1'] };
    const cm = new CampaignManager({ campaign: makeFakeCampaign(), questManager: fakeQuests, playerStats: stats });

    check('an unknown chapter id falls back to the first not-completed chapter', cm.currentChapter().id, 'f2');
}

// ── CampaignManager: a campaign-less state never throws ─────────────────────
{
    const fakeQuests = makeFakeQuestManager();
    const stats = new PlayerStats();
    const cm = new CampaignManager({ campaign: null, questManager: fakeQuests, playerStats: stats });

    check('currentChapter is null with no campaign', cm.currentChapter(), null);
    check('canEnter allows everything with no campaign', cm.canEnter('anything').allowed, true);
}

if (fails.length) {
    console.error(`✗ campaign-manager tests FAILED — ${fails.length}/${passed + fails.length}:`);
    for (const f of fails) console.error('  ' + f);
    process.exit(1);
}
console.log(`✓ campaign-manager tests passed (${passed}).`);
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/amo && node tools/test_campaign_manager.mjs`
Expected: FAIL — `Cannot find module '../src/systems/CampaignManager.js'`.

- [ ] **Step 3: Write `CampaignManager`**

Create `apps/amo/src/systems/CampaignManager.js`:

```javascript
import { questManager as realQuestManager } from './QuestManager.js';
import { playerStats as realPlayerStats } from './PlayerStats.js';
import { getCampaign } from '../data/campaigns/index.js';

const DEFAULT_CAMPAIGN_ID = 'eldorias_prophecy';

/**
 * Reads a campaign definition and answers three questions the engine needs:
 * what chapter is the player on, can they enter a given map, and is a given
 * chapter done. It observes QuestManager's event stream — it never starts
 * or advances a quest itself, and QuestManager has no idea this class
 * exists.
 *
 * Constructor takes fixture-injectable dependencies so this class is fully
 * unit-testable against fake campaigns/quest managers, independent of the
 * real Eldoria's Prophecy content. The module-level `campaignManager`
 * export below is the one real callers use.
 */
export class CampaignManager {
    constructor({ campaign, questManager = realQuestManager, playerStats = realPlayerStats } = {}) {
        this._campaign = campaign ?? null;
        this._questManager = questManager;
        this._playerStats = playerStats;
        this._questManager.onQuestEvent(() => this._recheck());
    }

    /** Ensures playerStats.campaign is a valid progress record for this
     * campaign, creating or repairing it as needed. Never throws. */
    _ensureProgress() {
        if (!this._campaign) return null;
        const validIds = new Set(this._campaign.chapters.map(c => c.id));
        let p = this._playerStats.campaign;

        const sameCampaign = p && p.id === this._campaign.id;
        const completed = sameCampaign ? (p.completed ?? []) : [];
        const chapterIsValid = sameCampaign && validIds.has(p.chapter);

        if (!sameCampaign || !chapterIsValid) {
            // No progress yet, or a save referencing a chapter this
            // definition no longer has — fall back to the first chapter
            // not already recorded complete, rather than throwing.
            const next = this._campaign.chapters.find(c => !completed.includes(c.id));
            p = {
                id: this._campaign.id,
                chapter: next ? next.id : null,
                completed,
            };
            this._playerStats.campaign = p;
        }
        return p;
    }

    /** The chapter object the player is currently on, or null if the
     * campaign is finished or absent. */
    currentChapter() {
        if (!this._campaign) return null;
        const progress = this._ensureProgress();
        if (!progress || !progress.chapter) return null;
        return this._campaign.chapters.find(c => c.id === progress.chapter) ?? null;
    }

    /** The earliest chapter that claims mapId, or null if no chapter does
     * (an unclaimed map — a sandbox/dev map — is always enterable). */
    chapterFor(mapId) {
        if (!this._campaign) return null;
        return this._campaign.chapters.find(c => c.maps.includes(mapId)) ?? null;
    }

    /** True once every quest listed on the given chapter is complete. A
     * fresh poll every time, never cached — see the module header note on
     * why that matters for out-of-order quest completion. */
    isChapterComplete(chapterId) {
        if (!this._campaign) return false;
        const chapter = this._campaign.chapters.find(c => c.id === chapterId);
        if (!chapter) return false;
        return chapter.quests.every(qid => this._questManager.isCompleted(qid));
    }

    /** { allowed: boolean, reason: string|null } for entering mapId. */
    canEnter(mapId) {
        const chapter = this.chapterFor(mapId);
        if (!chapter) return { allowed: true, reason: null };

        const progress = this._ensureProgress();
        const idx = this._campaign.chapters.findIndex(c => c.id === chapter.id);
        const earlierChapters = this._campaign.chapters.slice(0, idx);
        const allEarlierDone = earlierChapters.every(
            c => (progress?.completed ?? []).includes(c.id) || this.isChapterComplete(c.id)
        );

        if (allEarlierDone) return { allowed: true, reason: null };
        return { allowed: false, reason: `The way to ${chapter.title} is not yet open.` };
    }

    /** Re-evaluates the current chapter on every quest event, granting
     * unlocks and advancing as far as already-satisfied chapters allow —
     * see the module header for why this is a poll-and-loop, not a
     * check-the-event's-own-questId. */
    _recheck() {
        if (!this._campaign) return;
        const progress = this._ensureProgress();
        if (!progress) return;

        for (;;) {
            const current = this._campaign.chapters.find(c => c.id === progress.chapter);
            if (!current) return;
            if (progress.completed.includes(current.id)) return; // already granted
            if (!this.isChapterComplete(current.id)) return;

            for (const unlock of current.unlocks ?? []) this._grantUnlock(unlock);
            progress.completed.push(current.id);

            const idx = this._campaign.chapters.findIndex(c => c.id === current.id);
            const next = this._campaign.chapters[idx + 1];
            progress.chapter = next ? next.id : null;
            if (!next) return; // campaign finished
        }
    }

    _grantUnlock({ type, id }) {
        if (type === 'item' || type === 'weapon') this._playerStats.addItem(id);
        else if (type === 'spell') this._playerStats.forceUnlockSpell(id);
        else if (type === 'ability') this._playerStats.forceUnlockSkill(id);
    }
}

export const campaignManager = new CampaignManager({ campaign: getCampaign(DEFAULT_CAMPAIGN_ID) });
```

- [ ] **Step 4: `getCampaign` doesn't exist yet — stub it so the module resolves**

Task 7 builds the real `src/data/campaigns/index.js` and `eldorias_prophecy.js`. This task's tests import `CampaignManager` directly and inject fixtures, but the module-level `export const campaignManager = ...` line at the bottom still runs on import and needs `getCampaign` to exist. Create a minimal placeholder now so the module loads; Task 7 replaces its contents entirely (not additively — the file below is fully superseded then).

Create `apps/amo/src/data/campaigns/index.js`:

```javascript
// Placeholder — replaced by Task 7 of the campaign spine plan with the real
// registry (getCampaign/listCampaigns backed by eldorias_prophecy.js).
export function getCampaign(id) {
    return null;
}

export function listCampaigns() {
    return [];
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd apps/amo && node tools/test_campaign_manager.mjs`
Expected: `✓ campaign-manager tests passed (28).`

- [ ] **Step 6: Run full suite, then commit**

Run: `cd apps/amo && npm test`

```bash
cd apps/amo
git add src/systems/CampaignManager.js src/data/campaigns/index.js tools/test_campaign_manager.mjs
git commit -m "feat(campaign): CampaignManager — gating, completion, unlocks

Observes QuestManager's event stream; never starts or advances a quest
itself. Gating and completion are both fresh polls against
questManager.isCompleted(), not cached against which quest fired the
event — a later chapter's quest completing early (reachable because it
shares a map with an earlier one) sits inertly until the campaign
actually reaches it, then the poll-and-loop in _recheck() cascades
through it immediately.

data/campaigns/index.js is a placeholder here (getCampaign returns null)
so the module resolves; a later task replaces it with the real registry.
Fully tested against fixture campaigns/quest managers, independent of
real content.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01XdXdN1GgBhWmdx4TWBe7Tb"
```

---

### Task 4: Fix the Tower ↔ Study traversal gap; open the road to Chapter 2

**Files:**
- Modify: `apps/amo/src/data/maps/eldrin_tower.js:107-124` (the `portals` array)
- Modify: `apps/amo/src/data/maps/echoes_of_stone.js:40-52` (the `portals` array)

**Interfaces:**
- Consumes: nothing new.
- Produces: a walkable path `eldrin_tower → echoes_of_stone → aetheric_vision`. Task 6 builds `aetheric_vision`; this portal will 404-equivalent (silently do nothing useful) until then, exactly like `summit_of_despair`'s existing portals to `east_road`/`sylvan_sanctuary` already do — a pre-existing, accepted pattern in this codebase (see that file's own `// NOT YET BUILT` comments), resolved once Task 6 lands.

**Why this is needed:** `echoes_of_stone` (chapter 1's actual content — `main_read_the_erasure`) currently has a portal *out* to `eldrin_tower`, but `eldrin_tower` has no portal *in*. A player spawned in `eldrin_tower` (the tower clearing) has no way to reach the Study at all through play — only by picking `echoes_of_stone` directly from the developer map picker. Without this fix, chapter 1 is not walkable, and the spec's "Done means" (walk chapter 1 through 12) is untestable.

- [ ] **Step 1: Confirm the exact door tile before editing**

Run: `cd apps/amo && python3 -c "
import re
lines = open('src/data/maps/eldrin_tower.js').read().split(chr(10))
rows = [l for l in lines if l.strip().startswith('[') and l.strip().endswith('],')]
for i in (26,27,28):
    vals = [int(x) for x in re.findall(r'-?\d+', rows[i])]
    print(i, vals[7:19])
"`

Expected output (confirms the door gap is exactly where this task assumes):
```
26 [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1]
27 [1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1]
28 [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
```
Row 27, columns 12–13 are the door gap (floor tile `0`) in the tower's south wall — confirmed walkable, matching the file's own header comment ("door at south wall cols 12-13").

- [ ] **Step 2: Add the portal into the Study**

In `apps/amo/src/data/maps/eldrin_tower.js`, inside the `portals` array, add a third entry after `to_northern_forest`'s closing `},` (before the array's closing `],`):

```javascript
        {
            id: 'to_echoes_of_stone',
            x: 12, y: 27,
            label: 'Descend to the Study',
            targetMap: 'echoes_of_stone',
            // One tile north of echoes_of_stone's own south door gap
            // (row 11, cols 5-6) — symmetric with how that map's own
            // study_exit portal lands one tile south of THIS door.
            targetX: 5 * 32 + 16,
            targetY: 10 * 32 + 16,
        },
```

- [ ] **Step 3: Add the forward portal to Chapter 2**

In `apps/amo/src/data/maps/echoes_of_stone.js`, inside the `portals` array, add a second entry after `study_exit`'s closing `},`:

```javascript
        {
            id: 'to_aetheric_vision',
            x: 5, y: 5,
            label: 'The vision strikes —',
            // NOT YET BUILT until Task 6 of the campaign spine plan
            // (docs/superpowers/plans/2026-09-08-eldorias-prophecy-campaign-spine.md)
            // — same pattern already used by summit_of_despair.js's own
            // portals to east_road/sylvan_sanctuary.
            targetMap: 'aetheric_vision',
            targetX: 7 * 32 + 16,
            targetY: 8 * 32 + 16, // Task 6's shared stub-map entry point
        },
```

Placing this portal at (5, 5) — the same tile as the Study's own training Resonance-Wisp spawn (`{ x: 5, y: 5, type: 'resonance_wisp' }`) — is deliberate: Song 2 opens with "the vision strikes mid-study," so the portal trigger sits exactly where the player is already drawn during the tutorial, not off in a corner.

- [ ] **Step 4: Verify both files still parse and export correctly**

Run: `cd apps/amo && node -e "
import('./src/data/maps/eldrin_tower.js').then(m => console.log('eldrin_tower portals:', m.ELDRIN_TOWER.portals.map(p => p.id)));
import('./src/data/maps/echoes_of_stone.js').then(m => console.log('echoes_of_stone portals:', m.ECHOES_OF_STONE.portals.map(p => p.id)));
"`
Expected:
```
eldrin_tower portals: [ 'to_prologue_forest', 'to_northern_forest', 'to_echoes_of_stone' ]
echoes_of_stone portals: [ 'study_exit', 'to_aetheric_vision' ]
```

- [ ] **Step 5: Run full suite, then commit**

Run: `cd apps/amo && npm test`

```bash
cd apps/amo
git add src/data/maps/eldrin_tower.js src/data/maps/echoes_of_stone.js
git commit -m "fix(maps): open the path from Eldrin's Tower into the Study

eldrin_tower had no portal into echoes_of_stone (only the reverse
existed) — a player spawned in the tower clearing had no way to reach
chapter 1's actual content (main_read_the_erasure) through play at all.
Adds the missing portal at the tower's own documented door gap (row 27,
cols 12-13).

Also opens the forward path to chapter 2 from echoes_of_stone, at the
same tile as the Study's training Resonance-Wisp — Song 2 opens with
the vision striking mid-study. Points at aetheric_vision, not yet
built (Task 6 of the campaign spine plan); same NOT-YET-BUILT pattern
summit_of_despair.js already uses for east_road/sylvan_sanctuary.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01XdXdN1GgBhWmdx4TWBe7Tb"
```

---

### Task 5: Stub quests and stub NPC dialogue for the ten placeholder chapters

**Files:**
- Modify: `apps/amo/src/data/quests.js` (append 10 quest entries)
- Modify: `apps/amo/src/data/dialogues.js` (append 10 dialogue entries)

**Interfaces:**
- Consumes: nothing new — matches the existing `QUESTS`/`DIALOGUES` object shapes exactly, and the existing `talk` step / NPC-talk-id convention (`GameScene.js:2769`: the talked-to id is `def.dialogue` with a trailing `_greeting` or `_prolog` stripped).
- Produces: 10 quest ids (`stub_ch02_dreamweavers_call` … `stub_ch12_dawns_embrace`, skipping chapters 1 and 4, which use real quests) and 10 matching dialogue keys. Task 6's stub maps reference these ids directly; Task 7's campaign definition lists them as each stub chapter's `quests`.

Each stub quest is a single `talk` step against that chapter's placeholder NPC — the same shape as the existing `main_forest_hunt`'s `talk_hermit` step, minimal and deterministic so a chapter can be completed on purpose in seconds.

- [ ] **Step 1: Append the ten stub quests**

In `apps/amo/src/data/quests.js`, insert before the final closing `};` of the `QUESTS` object (after `main_read_the_erasure`'s closing `},`):

```javascript

    // ── Campaign spine scaffolding ──────────────────────────────────────────
    // Placeholder main quests for the ten chapters that don't have real
    // content yet (chapters 1 and 4 already have real quests — see
    // main_read_the_erasure and main_whisperer_of_doubt above). Each is a
    // single talk step against that chapter's placeholder NPC. Replace by
    // id, one chapter at a time, as real content lands — see
    // docs/superpowers/plans/2026-09-08-eldorias-prophecy-campaign-spine.md.

    stub_ch02_dreamweavers_call: {
        id: 'stub_ch02_dreamweavers_call',
        title: "Dreamweaver's Call (placeholder)",
        type: 'main',
        description: 'SCAFFOLDING — Song 2 is not built yet. Speak with the placeholder to complete this chapter.',
        steps: [
            { id: 'talk_stub', type: 'talk', target: 'stub_ch02_dreamweavers_call', label: 'Speak with the placeholder', required: 1 },
        ],
        reward: { glint: 0, xp: 10, items: [] },
    },

    stub_ch03_odysseys_dawn: {
        id: 'stub_ch03_odysseys_dawn',
        title: "Odyssey's Dawn (placeholder)",
        type: 'main',
        description: 'SCAFFOLDING — Song 3 is not built yet. Speak with the placeholder to complete this chapter.',
        steps: [
            { id: 'talk_stub', type: 'talk', target: 'stub_ch03_odysseys_dawn', label: 'Speak with the placeholder', required: 1 },
        ],
        reward: { glint: 0, xp: 10, items: [] },
    },

    stub_ch05_sylvan_sanctuary: {
        id: 'stub_ch05_sylvan_sanctuary',
        title: 'Sylvan Sanctuary (placeholder)',
        type: 'main',
        description: 'SCAFFOLDING — Song 5 is not built yet. Speak with the placeholder to complete this chapter.',
        steps: [
            { id: 'talk_stub', type: 'talk', target: 'stub_ch05_sylvan_sanctuary', label: 'Speak with the placeholder', required: 1 },
        ],
        reward: { glint: 0, xp: 10, items: [] },
    },

    stub_ch06_treacherys_bite: {
        id: 'stub_ch06_treacherys_bite',
        title: "Treachery's Bite (placeholder)",
        type: 'main',
        description: 'SCAFFOLDING — Song 6 is not built yet. Speak with the placeholder to complete this chapter.',
        steps: [
            { id: 'talk_stub', type: 'talk', target: 'stub_ch06_treacherys_bite', label: 'Speak with the placeholder', required: 1 },
        ],
        reward: { glint: 0, xp: 10, items: [] },
    },

    stub_ch07_the_solitary_path: {
        id: 'stub_ch07_the_solitary_path',
        title: 'The Solitary Path (placeholder)',
        type: 'main',
        description: 'SCAFFOLDING — Song 7 is not built yet. Speak with the placeholder to complete this chapter.',
        steps: [
            { id: 'talk_stub', type: 'talk', target: 'stub_ch07_the_solitary_path', label: 'Speak with the placeholder', required: 1 },
        ],
        reward: { glint: 0, xp: 10, items: [] },
    },

    stub_ch08_infernos_trial: {
        id: 'stub_ch08_infernos_trial',
        title: "Inferno's Trial (placeholder)",
        type: 'main',
        description: 'SCAFFOLDING — Song 8 is not built yet. Speak with the placeholder to complete this chapter.',
        steps: [
            { id: 'talk_stub', type: 'talk', target: 'stub_ch08_infernos_trial', label: 'Speak with the placeholder', required: 1 },
        ],
        reward: { glint: 0, xp: 10, items: [] },
    },

    stub_ch09_eldorias_heartbeat: {
        id: 'stub_ch09_eldorias_heartbeat',
        title: "Eldoria's Heartbeat (placeholder)",
        type: 'main',
        description: 'SCAFFOLDING — Song 9 is not built yet. Speak with the placeholder to complete this chapter.',
        steps: [
            { id: 'talk_stub', type: 'talk', target: 'stub_ch09_eldorias_heartbeat', label: 'Speak with the placeholder', required: 1 },
        ],
        reward: { glint: 0, xp: 10, items: [] },
    },

    stub_ch10_heart_of_war: {
        id: 'stub_ch10_heart_of_war',
        title: 'Heart of War (placeholder)',
        type: 'main',
        description: 'SCAFFOLDING — Song 10 is not built yet. Speak with the placeholder to complete this chapter.',
        steps: [
            { id: 'talk_stub', type: 'talk', target: 'stub_ch10_heart_of_war', label: 'Speak with the placeholder', required: 1 },
        ],
        reward: { glint: 0, xp: 10, items: [] },
    },

    stub_ch11_the_weight_of_eternity: {
        id: 'stub_ch11_the_weight_of_eternity',
        title: 'The Weight of Eternity (placeholder)',
        type: 'main',
        description: 'SCAFFOLDING — Song 11 is not built yet. Speak with the placeholder to complete this chapter.',
        steps: [
            { id: 'talk_stub', type: 'talk', target: 'stub_ch11_the_weight_of_eternity', label: 'Speak with the placeholder', required: 1 },
        ],
        reward: { glint: 0, xp: 10, items: [] },
    },

    stub_ch12_dawns_embrace: {
        id: 'stub_ch12_dawns_embrace',
        title: "Dawn's Embrace (placeholder)",
        type: 'main',
        description: 'SCAFFOLDING — Song 12 is not built yet. Speak with the placeholder to complete this chapter.',
        steps: [
            { id: 'talk_stub', type: 'talk', target: 'stub_ch12_dawns_embrace', label: 'Speak with the placeholder', required: 1 },
        ],
        reward: { glint: 0, xp: 10, items: [] },
    },
```

- [ ] **Step 2: Append the ten stub dialogues**

In `apps/amo/src/data/dialogues.js`, add at the end of the exported object, before its closing `};`:

```javascript

    // ── Campaign spine scaffolding ──────────────────────────────────────────
    // One line each — these exist only so each stub chapter's placeholder
    // NPC has something to say. Replaced alongside their quest, chapter by
    // chapter, as real content lands.

    stub_ch02_dreamweavers_call_greeting: [
        { speaker: 'Placeholder', text: '[SCAFFOLDING] This will be Song 2 — Dreamweaver\'s Call. Speak to me again to complete this placeholder chapter.' },
    ],
    stub_ch03_odysseys_dawn_greeting: [
        { speaker: 'Placeholder', text: '[SCAFFOLDING] This will be Song 3 — Odyssey\'s Dawn. Speak to me again to complete this placeholder chapter.' },
    ],
    stub_ch05_sylvan_sanctuary_greeting: [
        { speaker: 'Placeholder', text: '[SCAFFOLDING] This will be Song 5 — Sylvan Sanctuary. Speak to me again to complete this placeholder chapter.' },
    ],
    stub_ch06_treacherys_bite_greeting: [
        { speaker: 'Placeholder', text: '[SCAFFOLDING] This will be Song 6 — Treachery\'s Bite. Speak to me again to complete this placeholder chapter.' },
    ],
    stub_ch07_the_solitary_path_greeting: [
        { speaker: 'Placeholder', text: '[SCAFFOLDING] This will be Song 7 — The Solitary Path. Speak to me again to complete this placeholder chapter.' },
    ],
    stub_ch08_infernos_trial_greeting: [
        { speaker: 'Placeholder', text: '[SCAFFOLDING] This will be Song 8 — Inferno\'s Trial. Speak to me again to complete this placeholder chapter.' },
    ],
    stub_ch09_eldorias_heartbeat_greeting: [
        { speaker: 'Placeholder', text: '[SCAFFOLDING] This will be Song 9 — Eldoria\'s Heartbeat. Speak to me again to complete this placeholder chapter.' },
    ],
    stub_ch10_heart_of_war_greeting: [
        { speaker: 'Placeholder', text: '[SCAFFOLDING] This will be Song 10 — Heart of War. Speak to me again to complete this placeholder chapter.' },
    ],
    stub_ch11_the_weight_of_eternity_greeting: [
        { speaker: 'Placeholder', text: '[SCAFFOLDING] This will be Song 11 — The Weight of Eternity. Speak to me again to complete this placeholder chapter.' },
    ],
    stub_ch12_dawns_embrace_greeting: [
        { speaker: 'Placeholder', text: '[SCAFFOLDING] This will be Song 12 — Dawn\'s Embrace, the campaign\'s end. Speak to me again to complete this placeholder chapter.' },
    ],
```

- [ ] **Step 2: Verify both files still parse and export the right keys**

Run: `cd apps/amo && node -e "
import('./src/data/quests.js').then(m => {
  const ids = Object.keys(m.QUESTS).filter(k => k.startsWith('stub_'));
  console.log(ids.length, 'stub quests:', ids);
});
import('./src/data/dialogues.js').then(m => {
  const ids = Object.keys(m.DIALOGUES).filter(k => k.startsWith('stub_'));
  console.log(ids.length, 'stub dialogues:', ids);
});
"`
Expected: `10 stub quests: [...]` and `10 stub dialogues: [...]`, one dialogue key per quest id (dialogue key = quest id + `_greeting`).

- [ ] **Step 3: Run full suite, then commit**

Run: `cd apps/amo && npm test`

```bash
cd apps/amo
git add src/data/quests.js src/data/dialogues.js
git commit -m "feat(campaign): stub quests and dialogue for the ten placeholder chapters

One talk-step quest and one dialogue line per chapter without real
content yet (chapters 1 and 4 already have real quests). Clearly
labeled SCAFFOLDING; replaced by id, chapter by chapter, as real
content lands.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01XdXdN1GgBhWmdx4TWBe7Tb"
```

---

### Task 6: Stub map factory and the ten placeholder chapter maps

**Files:**
- Create: `apps/amo/src/data/maps/_stubs.js`
- Create: `apps/amo/src/data/maps/aetheric_vision.js`
- Create: `apps/amo/src/data/maps/thaloria.js`
- Create: `apps/amo/src/data/maps/east_road.js`
- Create: `apps/amo/src/data/maps/sylvan_sanctuary.js`
- Create: `apps/amo/src/data/maps/fire_gate.js`
- Create: `apps/amo/src/data/maps/the_descent.js`
- Create: `apps/amo/src/data/maps/inferno_labyrinth.js`
- Create: `apps/amo/src/data/maps/ruins_of_eldoria.js`
- Create: `apps/amo/src/data/maps/heartstone_chamber.js`
- Create: `apps/amo/src/data/maps/ancient_door.js`
- Modify: `apps/amo/src/data/maps/index.js` (register the 10 new ids)

**Interfaces:**
- Consumes: `makeStubMap()`'s own contract (defined in this task); the stub quest/dialogue ids from Task 5; `getMap`/`listMaps` conventions already established by every existing map file.
- Produces: `STUB_ENTRY_X`, `STUB_ENTRY_Y` (exported from `_stubs.js` — every portal in this plan that targets a stub map uses these two constants, so cross-file coordinates can't drift); `makeStubMap(opts) → mapDef`; ten new registry entries in `getMap`/`listMaps`. Task 7's campaign definition references all ten map ids directly.

**Chapter → map wiring this task completes** (cross-referenced against Task 7's forthcoming campaign definition, so every portal below is real, not speculative):

| Map | Used by chapter(s) | Forward portal(s) |
|---|---|---|
| `aetheric_vision` | 2 | → `thaloria` |
| `thaloria` | 3 (entry), 11 (last map) | → `east_road`; → `eldrin_tower` |
| `east_road` | 3 (last map) | → `summit_of_despair` (real) |
| `sylvan_sanctuary` | 5 | → `fire_gate` |
| `fire_gate` | 6 | → `the_descent` |
| `the_descent` | 7 | → `inferno_labyrinth` |
| `inferno_labyrinth` | 8 | → `ruins_of_eldoria` |
| `ruins_of_eldoria` | 9 (entry, two NPCs), 11 (entry) | → `heartstone_chamber` |
| `heartstone_chamber` | 10 (entry) | → `ancient_door` |
| `ancient_door` | 10 (last map) | → `ruins_of_eldoria` (the return) |

- [ ] **Step 1: Write the stub map factory**

Create `apps/amo/src/data/maps/_stubs.js`:

```javascript
// Scaffolding for the Eldoria's Prophecy campaign spine
// (docs/superpowers/plans/2026-09-08-eldorias-prophecy-campaign-spine.md).
//
// Each stub is a single bordered room — real geometry comes later, one
// chapter at a time, from that location's own map spec under
// data/lore/campaigns/eldorias_prophecy/. This is only enough to prove the
// campaign machinery: walkable, one sign naming the chapter, one or more
// NPCs (talking to one completes that chapter's stub quest), and a portal
// onward.
//
// Tile legend matches every other map in the game (see
// tools/maps/ascii_to_tiles.js's DEFAULT_LEGEND, and GameScene._buildWorld,
// which is what actually enforces this): 0 floor, 1 wall/tree, 2 path.

const WIDTH = 14;
const HEIGHT = 10;
const DOOR_ROW = Math.floor(HEIGHT / 2);
const SPAWN_COL = Math.floor(WIDTH / 2);
const SPAWN_ROW = HEIGHT - 2;

// Every portal that leads INTO a stub map should target this point. Portal
// transitions always use the source portal's own explicit targetX/targetY
// (a destination map's playerStart is only read for a fresh
// CharacterSelectScene spawn, never for a portal) — every stub is the same
// shape, so this one pair of constants is correct for all of them, and
// removes any chance of a coordinate typo drifting between files.
export const STUB_ENTRY_X = SPAWN_COL * 32 + 16;
export const STUB_ENTRY_Y = SPAWN_ROW * 32 + 16;

/**
 * @param {object} opts
 * @param {string} opts.id
 * @param {string} opts.displayName
 * @param {string} opts.chapterTitle
 * @param {string} opts.signText
 * @param {{x:number,y:number,dialogue:string,name?:string}[]} [opts.npcs]
 *        Each npc's `dialogue` key must exist in DIALOGUES. The talk-id a
 *        quest's `talk` step should target is that key with a trailing
 *        "_greeting" stripped (GameScene's own convention).
 * @param {string[]} [opts.quests] - auto-started on first entry.
 * @param {{targetMap:string,targetX:number,targetY:number,label:string}} [opts.forwardPortal]
 *        Placed as a gap in the east wall, row DOOR_ROW.
 * @returns {object} a complete map definition, same shape as every other
 *          file in this directory (see hermit_hut.js for the smallest real
 *          example this factory is modeled on).
 */
export function makeStubMap({
    id, displayName, chapterTitle, signText,
    npcs = [], quests = [], forwardPortal = null,
}) {
    const tiles = [];
    for (let y = 0; y < HEIGHT; y++) {
        const row = [];
        for (let x = 0; x < WIDTH; x++) {
            const border = x === 0 || x === WIDTH - 1 || y === 0 || y === HEIGHT - 1;
            const isDoorGap = forwardPortal && x === WIDTH - 1 && y === DOOR_ROW;
            row.push(border && !isDoorGap ? 1 : 0);
        }
        tiles.push(row);
    }

    const portals = [];
    if (forwardPortal) {
        portals.push({
            id: `${id}_forward`,
            x: WIDTH - 1, y: DOOR_ROW,
            label: forwardPortal.label,
            targetMap: forwardPortal.targetMap,
            targetX: forwardPortal.targetX,
            targetY: forwardPortal.targetY,
        });
    }

    return {
        id,
        displayName,
        tiles,
        lightTint: null,
        playerStart: { x: SPAWN_COL, y: SPAWN_ROW },
        portals,
        decorations: [],
        spawns: {
            enemies: [],
            npcs: npcs.map(n => ({
                x: n.x, y: n.y,
                dialogue: n.dialogue,
                afterDialogue: n.dialogue, // same lines replay on a second visit — fine for scaffolding
                name: n.name ?? 'Placeholder',
                spriteKey: 'spr_old_dude',
                animProfile: 'lpc_universal',
            })),
            chests: [],
            campfires: [],
            signs: [{ x: SPAWN_COL, y: 1, text: signText }],
            gatheringNodes: [],
            crackedBoulders: [],
            riftGates: [],
            pillarGates: [],
            boss: null,
        },
        currencyBias: 'rural',
        music: null,
        quests,
        chapterTitle,
        introDialogue: null,
        introRegistryKey: null,
    };
}
```

- [ ] **Step 2: Create the ten stub map files**

Create `apps/amo/src/data/maps/aetheric_vision.js`:

```javascript
// Aetheric Vision — Song 2, "Dreamweaver's Call". SCAFFOLDING — real content
// per data/lore/campaigns/eldorias_prophecy's own future spec for this
// location; see docs/superpowers/plans/2026-09-08-eldorias-prophecy-campaign-spine.md.
import { makeStubMap, STUB_ENTRY_X, STUB_ENTRY_Y } from './_stubs.js';

export const AETHERIC_VISION = makeStubMap({
    id: 'aetheric_vision',
    displayName: 'Aetheric Vision',
    chapterTitle: "Act I: Dreamweaver's Call",
    signText: 'Aetheric Vision\n\n[SCAFFOLDING] Song 2 — Dreamweaver\'s Call. Vorgos pulls Eldrin out of time to witness the Violet Sky.',
    npcs: [{ x: 5, y: 4, dialogue: 'stub_ch02_dreamweavers_call_greeting' }],
    quests: ['stub_ch02_dreamweavers_call'],
    forwardPortal: {
        label: 'The vision fades —',
        targetMap: 'thaloria',
        targetX: STUB_ENTRY_X,
        targetY: STUB_ENTRY_Y,
    },
});
```

Create `apps/amo/src/data/maps/thaloria.js`:

```javascript
// Thaloria — Song 3, "Odyssey's Dawn" (city hub), reused as Song 11's
// "The Weight of Eternity" return-to-Thaloria beat. SCAFFOLDING.
import { makeStubMap, STUB_ENTRY_X, STUB_ENTRY_Y } from './_stubs.js';

export const THALORIA = makeStubMap({
    id: 'thaloria',
    displayName: 'Thaloria',
    chapterTitle: "Act I: Odyssey's Dawn",
    signText: 'Thaloria\n\n[SCAFFOLDING] Song 3 — Odyssey\'s Dawn. The city hub: forge, shop, inn. Also revisited at Song 11\'s return.',
    npcs: [{ x: 5, y: 4, dialogue: 'stub_ch03_odysseys_dawn_greeting' }],
    quests: ['stub_ch03_odysseys_dawn'],
    forwardPortal: {
        label: 'Out onto the East Road',
        targetMap: 'east_road',
        targetX: STUB_ENTRY_X,
        targetY: STUB_ENTRY_Y,
    },
});

// Chapter 11 ("The Weight of Eternity") reuses this same map as its own
// last stop before the finale — the factory only wires one forward portal
// per map, so this second one (thaloria -> eldrin_tower, chapter 11 -> 12)
// is added directly here, at a different door-wall tile than the factory's
// own east-wall gap (row 5) so the two don't collide.
THALORIA.tiles[6][13] = 0; // second gap in the east wall, one row below the first
THALORIA.portals.push({
    id: 'thaloria_to_eldrin_tower',
    x: 13, y: 6,
    label: "The road home, to Eldrin's Tower",
    targetMap: 'eldrin_tower',
    // Eldrin's Tower's own real playerStart — a full return, not a
    // scaffolding entry point, since chapter 12's own map is real.
    targetX: 24 * 32 + 16,
    targetY: 40 * 32 + 16,
});
```

Create `apps/amo/src/data/maps/east_road.js`:

```javascript
// East Road — Song 3, "Odyssey's Dawn" (wilderness half). SCAFFOLDING.
import { makeStubMap } from './_stubs.js';

export const EAST_ROAD = makeStubMap({
    id: 'east_road',
    displayName: 'East Road',
    chapterTitle: "Act I: Odyssey's Dawn",
    signText: 'The East Road\n\n[SCAFFOLDING] Song 3 — Odyssey\'s Dawn, wilderness half. The road climbs toward the Summit.',
    npcs: [],
    quests: [],
    forwardPortal: {
        label: 'The climb to the Summit of Despair',
        targetMap: 'summit_of_despair',
        // summit_of_despair's own real playerStart.
        targetX: 8 * 32 + 16,
        targetY: 18 * 32 + 16,
    },
});
```

Create `apps/amo/src/data/maps/sylvan_sanctuary.js`:

```javascript
// Sylvan Sanctuary — Song 5. Grants Aether Sight (formally completed here
// per data/lore/campaigns/eldorias_prophecy/sylvan_sanctuary.md). SCAFFOLDING.
import { makeStubMap, STUB_ENTRY_X, STUB_ENTRY_Y } from './_stubs.js';

export const SYLVAN_SANCTUARY = makeStubMap({
    id: 'sylvan_sanctuary',
    displayName: 'Sylvan Sanctuary',
    chapterTitle: 'Act II: Sylvan Sanctuary',
    signText: 'Sylvan Sanctuary\n\n[SCAFFOLDING] Song 5. The Elemental\'s trial of intent, not combat. The Hermit offers guidance here.',
    npcs: [{ x: 5, y: 4, dialogue: 'stub_ch05_sylvan_sanctuary_greeting' }],
    quests: ['stub_ch05_sylvan_sanctuary'],
    forwardPortal: {
        label: 'Down toward the Fire Gate',
        targetMap: 'fire_gate',
        targetX: STUB_ENTRY_X,
        targetY: STUB_ENTRY_Y,
    },
});
```

Create `apps/amo/src/data/maps/fire_gate.js`:

```javascript
// Fire Gate — Song 6, "Treachery's Bite". Oren's betrayal; he flees rather
// than falls. SCAFFOLDING.
import { makeStubMap, STUB_ENTRY_X, STUB_ENTRY_Y } from './_stubs.js';

export const FIRE_GATE = makeStubMap({
    id: 'fire_gate',
    displayName: 'Fire Gate',
    chapterTitle: "Act II: Treachery's Bite",
    signText: 'The Fire Gate\n\n[SCAFFOLDING] Song 6 — Treachery\'s Bite. The black-glass stair. Oren flees with the journal.',
    npcs: [{ x: 5, y: 4, dialogue: 'stub_ch06_treacherys_bite_greeting' }],
    quests: ['stub_ch06_treacherys_bite'],
    forwardPortal: {
        label: 'Down into the cold',
        targetMap: 'the_descent',
        targetX: STUB_ENTRY_X,
        targetY: STUB_ENTRY_Y,
    },
});
```

Create `apps/amo/src/data/maps/the_descent.js`:

```javascript
// The Descent — Song 7, "The Solitary Path". A survival gauntlet, cold to
// ash. SCAFFOLDING.
import { makeStubMap, STUB_ENTRY_X, STUB_ENTRY_Y } from './_stubs.js';

export const THE_DESCENT = makeStubMap({
    id: 'the_descent',
    displayName: 'The Descent',
    chapterTitle: 'Act II: The Solitary Path',
    signText: 'The Descent\n\n[SCAFFOLDING] Song 7 — The Solitary Path. The cold-to-ash transition into the upper Inferno Labyrinth.',
    npcs: [{ x: 5, y: 4, dialogue: 'stub_ch07_the_solitary_path_greeting' }],
    quests: ['stub_ch07_the_solitary_path'],
    forwardPortal: {
        label: 'Into the Inferno Labyrinth',
        targetMap: 'inferno_labyrinth',
        targetX: STUB_ENTRY_X,
        targetY: STUB_ENTRY_Y,
    },
});
```

Create `apps/amo/src/data/maps/inferno_labyrinth.js`:

```javascript
// Inferno Labyrinth — Song 8, "Inferno's Trial". Xarathos, the Pyre-Lord.
// SCAFFOLDING.
import { makeStubMap, STUB_ENTRY_X, STUB_ENTRY_Y } from './_stubs.js';

export const INFERNO_LABYRINTH = makeStubMap({
    id: 'inferno_labyrinth',
    displayName: 'Inferno Labyrinth',
    chapterTitle: "Act II: Inferno's Trial",
    signText: 'Inferno Labyrinth\n\n[SCAFFOLDING] Song 8 — Inferno\'s Trial. Xarathos, the Pyre-Lord — floor-is-lava, mana-steal Super-Nova.',
    npcs: [{ x: 5, y: 4, dialogue: 'stub_ch08_infernos_trial_greeting' }],
    quests: ['stub_ch08_infernos_trial'],
    forwardPortal: {
        label: 'Out to the Ruins of Eldoria',
        targetMap: 'ruins_of_eldoria',
        targetX: STUB_ENTRY_X,
        targetY: STUB_ENTRY_Y,
    },
});
```

Create `apps/amo/src/data/maps/ruins_of_eldoria.js`:

```javascript
// Ruins of Eldoria — Song 9, "Eldoria's Heartbeat" (first arrival, Voraun's
// rune-dead gate), reused as Song 11's "The Weight of Eternity" (the
// Vorgos scene, on the return from the Heart of War). SCAFFOLDING.
import { makeStubMap, STUB_ENTRY_X, STUB_ENTRY_Y } from './_stubs.js';

export const RUINS_OF_ELDORIA = makeStubMap({
    id: 'ruins_of_eldoria',
    displayName: 'Ruins of Eldoria',
    chapterTitle: "Act III: Eldoria's Heartbeat",
    signText: 'Ruins of Eldoria\n\n[SCAFFOLDING] Song 9 — Eldoria\'s Heartbeat. Black-stone ruins, moonlit. Voraun\'s rune-dead gate.',
    // Two NPCs: chapter 9's arrival, and chapter 11's return — both
    // physically in this one room, since the location is genuinely
    // revisited. Placed apart so neither's talk zone overlaps the other's.
    npcs: [
        { x: 4, y: 4, dialogue: 'stub_ch09_eldorias_heartbeat_greeting' },
        { x: 9, y: 4, dialogue: 'stub_ch11_the_weight_of_eternity_greeting' },
    ],
    quests: ['stub_ch09_eldorias_heartbeat', 'stub_ch11_the_weight_of_eternity'],
    forwardPortal: {
        label: 'Toward the Heartstone Chamber',
        targetMap: 'heartstone_chamber',
        targetX: STUB_ENTRY_X,
        targetY: STUB_ENTRY_Y,
    },
});
```

Create `apps/amo/src/data/maps/heartstone_chamber.js`:

```javascript
// Heartstone Chamber — Song 10, "Heart of War" (first of two maps). The
// Shadow Balrog encounter. SCAFFOLDING.
import { makeStubMap, STUB_ENTRY_X, STUB_ENTRY_Y } from './_stubs.js';

export const HEARTSTONE_CHAMBER = makeStubMap({
    id: 'heartstone_chamber',
    displayName: 'Heartstone Chamber',
    chapterTitle: 'Act III: Heart of War',
    signText: 'Heartstone Chamber\n\n[SCAFFOLDING] Song 10 — Heart of War. The Shadow Balrog: no HP bar, no kill — a survival/humility encounter.',
    npcs: [{ x: 5, y: 4, dialogue: 'stub_ch10_heart_of_war_greeting' }],
    quests: ['stub_ch10_heart_of_war'],
    forwardPortal: {
        label: 'Through to the Ancient Door',
        targetMap: 'ancient_door',
        targetX: STUB_ENTRY_X,
        targetY: STUB_ENTRY_Y,
    },
});
```

Create `apps/amo/src/data/maps/ancient_door.js`:

```javascript
// Ancient Door — Song 10, "Heart of War" (second of two maps). SCAFFOLDING.
import { makeStubMap, STUB_ENTRY_X, STUB_ENTRY_Y } from './_stubs.js';

export const ANCIENT_DOOR = makeStubMap({
    id: 'ancient_door',
    displayName: 'The Ancient Door',
    chapterTitle: 'Act III: Heart of War',
    signText: 'The Ancient Door\n\n[SCAFFOLDING] Song 10 — Heart of War, continued. The door opens; the Balrog\'s payoff — no death, no taming, no banner.',
    npcs: [],
    quests: [],
    forwardPortal: {
        label: 'Back through the ruins',
        targetMap: 'ruins_of_eldoria',
        targetX: STUB_ENTRY_X,
        targetY: STUB_ENTRY_Y,
    },
});
```

- [ ] **Step 3: Register all ten in the map registry**

In `apps/amo/src/data/maps/index.js`, add the ten new imports after the existing `ECHOES_OF_STONE` import:

```javascript
import { AETHERIC_VISION }   from './aetheric_vision.js';
import { THALORIA }          from './thaloria.js';
import { EAST_ROAD }         from './east_road.js';
import { SYLVAN_SANCTUARY }  from './sylvan_sanctuary.js';
import { FIRE_GATE }         from './fire_gate.js';
import { THE_DESCENT }       from './the_descent.js';
import { INFERNO_LABYRINTH } from './inferno_labyrinth.js';
import { RUINS_OF_ELDORIA }  from './ruins_of_eldoria.js';
import { HEARTSTONE_CHAMBER } from './heartstone_chamber.js';
import { ANCIENT_DOOR }      from './ancient_door.js';
```

And add the ten corresponding entries to the `REGISTRY` object, after `echoes_of_stone: ECHOES_OF_STONE,`:

```javascript
    aetheric_vision:    AETHERIC_VISION,
    thaloria:           THALORIA,
    east_road:          EAST_ROAD,
    sylvan_sanctuary:   SYLVAN_SANCTUARY,
    fire_gate:          FIRE_GATE,
    the_descent:        THE_DESCENT,
    inferno_labyrinth:  INFERNO_LABYRINTH,
    ruins_of_eldoria:   RUINS_OF_ELDORIA,
    heartstone_chamber: HEARTSTONE_CHAMBER,
    ancient_door:       ANCIENT_DOOR,
```

- [ ] **Step 4: Verify every stub map loads and every referenced quest/dialogue id resolves**

Run: `cd apps/amo && node -e "
import('./src/data/maps/index.js').then(async ({ listMaps, getMap }) => {
  const { QUESTS } = await import('./src/data/quests.js');
  const { DIALOGUES } = await import('./src/data/dialogues.js');
  const ids = ['aetheric_vision','thaloria','east_road','sylvan_sanctuary','fire_gate',
               'the_descent','inferno_labyrinth','ruins_of_eldoria','heartstone_chamber','ancient_door'];
  for (const id of ids) {
    const m = getMap(id);
    if (m.id !== id) throw new Error(id + ': registry mismatch, got ' + m.id);
    if (m.tiles.length === 0 || m.tiles.some(r => r.length !== m.tiles[0].length)) throw new Error(id + ': ragged tiles');
    for (const q of m.quests) if (!QUESTS[q]) throw new Error(id + ': missing quest ' + q);
    for (const n of m.spawns.npcs) if (!DIALOGUES[n.dialogue]) throw new Error(id + ': missing dialogue ' + n.dialogue);
    for (const p of m.portals) if (!p.targetMap) throw new Error(id + ': portal missing targetMap');
  }
  console.log('all', ids.length, 'stub maps check out —', listMaps().length, 'total maps registered');
});
"`
Expected: `all 10 stub maps check out — 18 total maps registered` (8 pre-existing + 10 new).

- [ ] **Step 5: Run full suite, then commit**

Run: `cd apps/amo && npm test`

```bash
cd apps/amo
git add src/data/maps/_stubs.js src/data/maps/aetheric_vision.js src/data/maps/thaloria.js \
        src/data/maps/east_road.js src/data/maps/sylvan_sanctuary.js src/data/maps/fire_gate.js \
        src/data/maps/the_descent.js src/data/maps/inferno_labyrinth.js src/data/maps/ruins_of_eldoria.js \
        src/data/maps/heartstone_chamber.js src/data/maps/ancient_door.js src/data/maps/index.js
git commit -m "feat(campaign): ten placeholder chapter maps via a shared stub factory

makeStubMap() produces one bordered room, one sign, an optional NPC set
and an optional forward portal — the same shape every real map file
already has (modeled on hermit_hut.js, the smallest real example). Every
portal that leads into a stub targets the factory's own STUB_ENTRY_X/Y,
so cross-file landing coordinates can't drift.

Chains: aetheric_vision -> thaloria -> east_road -> summit_of_despair
(real) for chapters 2-3; sylvan_sanctuary -> fire_gate -> the_descent ->
inferno_labyrinth -> ruins_of_eldoria -> heartstone_chamber ->
ancient_door -> ruins_of_eldoria (the return) for chapters 5-11.
ruins_of_eldoria and thaloria are each reused by a later chapter,
authored with both roles' NPCs/portals from the start.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01XdXdN1GgBhWmdx4TWBe7Tb"
```

---

### Task 7: The real campaign definition, registry, and the bible-honesty test

**Files:**
- Create: `apps/amo/src/data/campaigns/eldorias_prophecy.js`
- Modify: `apps/amo/src/data/campaigns/index.js` (replace Task 3's placeholder with the real registry)
- Create: `apps/amo/tools/test_campaign_definition.mjs`

**Interfaces:**
- Consumes: every map id from Tasks 4 and 6, every quest id from Task 5 plus the two real ones (`main_read_the_erasure`, `main_whisperer_of_doubt`), `getMap`/`listMaps` from `../maps/index.js`, `QUESTS` from `../quests.js`.
- Produces: `getCampaign(id) → campaign|null`, `listCampaigns() → {id,title}[]`; `export const ELDORIAS_PROPHECY`. Task 3's `campaignManager` singleton (already written, currently resolving `getCampaign` to the Task-3 placeholder) picks up the real campaign automatically once this task's `index.js` replaces that placeholder — no change needed to `CampaignManager.js` itself.

Two chapters (1 and 4) declare no `unlocks` — not an oversight. Chapter 1's Scholar's Staff is already delivered by `echoes_of_stone`'s own chest (`stackable: false`; a second grant would duplicate it). For every other chapter where the bible names an unlock, this task only grants it if there's a real, existing mechanic to map it to *and* granting it wouldn't double up on something existing content already delivers — that's true for exactly one: Aether Sight, which the bible's own Sylvan Sanctuary spec says is "granted... as a formal, permanent mastery... completed here," and which matches the existing `aetheric_sight` skill exactly. Every other bible-named unlock is left ungranted with an inline comment, rather than invented.

- [ ] **Step 1: Write the campaign definition**

Create `apps/amo/src/data/campaigns/eldorias_prophecy.js`:

```javascript
// Eldoria's Prophecy — the campaign spine.
// Transcribed from data/lore/campaigns/Eldorias_Prophecy_campaign.md's
// song-by-song breakdown; each chapter's `maps` is that song's own
// "Map/area" line. See docs/superpowers/specs/2026-09-08-eldorias-prophecy-campaign-spine-design.md
// for how this is read (chapters own maps, not the reverse — three
// chapters span two maps each, and chapters 11-12 revisit maps chapters
// 1-9 already opened).
//
// Ten of twelve chapters point at scaffolding maps/quests (src/data/maps/
// _stubs.js, quests.js's "Campaign spine scaffolding" section) — replaced
// one chapter at a time as real content lands. Chapters 1 and 4 are real
// today: main_read_the_erasure (echoes_of_stone) and
// main_whisperer_of_doubt (summit_of_despair) already exist and are
// already completable.

export const ELDORIAS_PROPHECY = {
    id: 'eldorias_prophecy',
    title: "Eldoria's Prophecy",
    protagonist: 'eldrin',
    chapters: [
        {
            id: 'ch01_echoes_of_stone', song: 1, act: 1,
            title: 'Echoes of Stone',
            maps: ['eldrin_tower', 'echoes_of_stone'],
            quests: ['main_read_the_erasure'],
            // Scholar's Staff is already delivered by echoes_of_stone's own
            // chest (spawns.chests) — granting it again here would add a
            // second, non-stackable copy to the inventory.
            unlocks: [],
            boss: null,
        },
        {
            id: 'ch02_dreamweavers_call', song: 2, act: 1,
            title: "Dreamweaver's Call",
            maps: ['aetheric_vision'],
            quests: ['stub_ch02_dreamweavers_call'],
            // Bible names "first spell" here — no safe existing mechanic to
            // grant a specific spell without inventing which one; left
            // ungranted rather than guessed.
            unlocks: [],
            boss: null,
        },
        {
            id: 'ch03_odysseys_dawn', song: 3, act: 1,
            title: "Odyssey's Dawn",
            maps: ['thaloria', 'east_road'],
            quests: ['stub_ch03_odysseys_dawn'],
            // Bible names "Spell-Blade + Rift-Gate tease" — same reasoning
            // as chapter 2; nothing safe to map it to yet.
            unlocks: [],
            boss: null, // early optional miniboss, not a real gate
        },
        {
            id: 'ch04_summit_of_despair', song: 4, act: 2,
            title: 'Summit of Despair',
            maps: ['summit_of_despair'],
            quests: ['main_whisperer_of_doubt'],
            // Bible's "Aether Sight (4-5)" begins here but is only formally
            // completed at Sylvan Sanctuary (song 5) per that location's
            // own spec — granted there, not here.
            unlocks: [],
            boss: 'malphas',
        },
        {
            id: 'ch05_sylvan_sanctuary', song: 5, act: 2,
            title: 'Sylvan Sanctuary',
            maps: ['sylvan_sanctuary'],
            quests: ['stub_ch05_sylvan_sanctuary'],
            unlocks: [{ type: 'ability', id: 'aetheric_sight' }],
            boss: 'the_elemental',
        },
        {
            id: 'ch06_treacherys_bite', song: 6, act: 2,
            title: "Treachery's Bite",
            maps: ['fire_gate'],
            quests: ['stub_ch06_treacherys_bite'],
            // Bible names "Umbral Dagger" — no such item exists yet.
            unlocks: [],
            boss: 'oren',
        },
        {
            id: 'ch07_the_solitary_path', song: 7, act: 2,
            title: 'The Solitary Path',
            maps: ['the_descent'],
            quests: ['stub_ch07_the_solitary_path'],
            // Bible names "Silent Guardian passive" — no such skill exists yet.
            unlocks: [],
            boss: null, // survival gauntlet, no boss
        },
        {
            id: 'ch08_infernos_trial', song: 8, act: 2,
            title: "Inferno's Trial",
            maps: ['inferno_labyrinth'],
            quests: ['stub_ch08_infernos_trial'],
            // Bible names "Runic Focus" — no such item/skill exists yet.
            unlocks: [],
            boss: 'xarathos',
        },
        {
            id: 'ch09_eldorias_heartbeat', song: 9, act: 3,
            title: "Eldoria's Heartbeat",
            maps: ['ruins_of_eldoria'],
            quests: ['stub_ch09_eldorias_heartbeat'],
            // Bible names "Aetheric Witness" — no such mechanic exists yet.
            unlocks: [],
            boss: 'voraun', // rune-dead gate puzzle, not yet a real fight
        },
        {
            id: 'ch10_heart_of_war', song: 10, act: 3,
            title: 'Heart of War',
            maps: ['heartstone_chamber', 'ancient_door'],
            quests: ['stub_ch10_heart_of_war'],
            // Bible names "Heartstone + ward" — no such item/mechanic exists yet.
            unlocks: [],
            boss: 'shadow_balrog',
        },
        {
            id: 'ch11_the_weight_of_eternity', song: 11, act: 3,
            title: 'The Weight of Eternity',
            maps: ['ruins_of_eldoria', 'thaloria'],
            quests: ['stub_ch11_the_weight_of_eternity'],
            unlocks: [],
            boss: null, // "the heaviest scene in the campaign" — no combat
        },
        {
            id: 'ch12_dawns_embrace', song: 12, act: 3,
            title: "Dawn's Embrace",
            maps: ['eldrin_tower'],
            quests: ['stub_ch12_dawns_embrace'],
            // Bible names "permanent ward + post-game Rift-Gates" — the
            // campaign's own finale reward; left ungranted until real.
            unlocks: [],
            boss: null,
        },
    ],
};
```

- [ ] **Step 2: Replace the placeholder registry with the real one**

Replace the full contents of `apps/amo/src/data/campaigns/index.js` (superseding Task 3's placeholder entirely):

```javascript
import { ELDORIAS_PROPHECY } from './eldorias_prophecy.js';

const REGISTRY = {
    eldorias_prophecy: ELDORIAS_PROPHECY,
};

export function getCampaign(id) {
    return REGISTRY[id] ?? null;
}

export function listCampaigns() {
    return Object.values(REGISTRY).map(c => ({ id: c.id, title: c.title }));
}
```

- [ ] **Step 3: Write the failing bible-honesty test**

Create `apps/amo/tools/test_campaign_definition.mjs`:

```javascript
#!/usr/bin/env node
/**
 * The Eldoria's Prophecy campaign definition, checked against everything it
 * claims to reference — the map registry, the quest table, and the bible's
 * own twelve-song structure. This is what keeps the game aligned with
 * data/lore/campaigns/Eldorias_Prophecy_campaign.md as content lands; it
 * has nothing to do with CampaignManager's own logic (see
 * test_campaign_manager.mjs for that, tested entirely against fixtures).
 * Run: node tools/test_campaign_definition.mjs (or: npm run test:campaign-definition)
 */
import { ELDORIAS_PROPHECY } from '../src/data/campaigns/eldorias_prophecy.js';
import { getCampaign, listCampaigns } from '../src/data/campaigns/index.js';
import { getMap, listMaps } from '../src/data/maps/index.js';
import { QUESTS } from '../src/data/quests.js';

let passed = 0;
const fails = [];
function check(name, got, want) {
    const eq = JSON.stringify(got) === JSON.stringify(want);
    if (eq) passed++;
    else fails.push(`${name}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
}
function ok(name, cond) {
    if (cond) passed++;
    else fails.push(name);
}

const KNOWN_UNLOCK_TYPES = new Set(['item', 'weapon', 'spell', 'ability']);
const registeredMapIds = new Set(listMaps().map(m => m.id));

// ── Registry ──────────────────────────────────────────────────────────────
check('getCampaign resolves the real campaign', getCampaign('eldorias_prophecy').id, 'eldorias_prophecy');
check('getCampaign returns null for an unknown id', getCampaign('not_a_real_campaign'), null);
ok('listCampaigns includes eldorias_prophecy', listCampaigns().some(c => c.id === 'eldorias_prophecy'));

// ── Structure: 12 chapters, songs 1-12 each exactly once, in order ─────────
const chapters = ELDORIAS_PROPHECY.chapters;
check('twelve chapters', chapters.length, 12);
check('songs are 1..12 in order', chapters.map(c => c.song), Array.from({ length: 12 }, (_, i) => i + 1));
check('acts are non-decreasing', chapters.every((c, i) => i === 0 || c.act >= chapters[i - 1].act), true);
ok('every chapter id is unique', new Set(chapters.map(c => c.id)).size === chapters.length);

// ── Every referenced map is registered ──────────────────────────────────────
for (const chapter of chapters) {
    ok(`${chapter.id}: has at least one map`, Array.isArray(chapter.maps) && chapter.maps.length > 0);
    for (const mapId of chapter.maps) {
        ok(`${chapter.id}: map "${mapId}" is registered`, registeredMapIds.has(mapId));
    }
}

// ── Every referenced quest exists ───────────────────────────────────────────
for (const chapter of chapters) {
    ok(`${chapter.id}: has at least one quest`, Array.isArray(chapter.quests) && chapter.quests.length > 0);
    for (const qid of chapter.quests) {
        ok(`${chapter.id}: quest "${qid}" exists in QUESTS`, !!QUESTS[qid]);
    }
}

// ── Every unlock type is known ───────────────────────────────────────────────
for (const chapter of chapters) {
    for (const unlock of chapter.unlocks ?? []) {
        ok(`${chapter.id}: unlock type "${unlock.type}" is known`, KNOWN_UNLOCK_TYPES.has(unlock.type));
        ok(`${chapter.id}: unlock "${unlock.type}:${unlock.id}" has an id`, typeof unlock.id === 'string' && unlock.id.length > 0);
    }
}

// ── Chapters 1 and 4 are real content, not scaffolding ──────────────────────
check('chapter 1 uses the real quest', chapters[0].quests, ['main_read_the_erasure']);
check('chapter 4 uses the real quest', chapters.find(c => c.song === 4).quests, ['main_whisperer_of_doubt']);
ok('chapter 1\'s maps exist as real map defs (not scaffolding)',
    chapters[0].maps.every(id => !!getMap(id).chapterTitle || id === 'eldrin_tower'));

// ── Every stub map's own portal chain lands on a map that exists ──────────
for (const mapId of registeredMapIds) {
    const def = getMap(mapId);
    for (const portal of def.portals ?? []) {
        ok(`${mapId}'s portal "${portal.id}" targets a registered map ("${portal.targetMap}")`,
            registeredMapIds.has(portal.targetMap));
    }
}

if (fails.length) {
    console.error(`✗ campaign-definition tests FAILED — ${fails.length}/${passed + fails.length}:`);
    for (const f of fails) console.error('  ' + f);
    process.exit(1);
}
console.log(`✓ campaign-definition tests passed (${passed}).`);
```

- [ ] **Step 4: Run the test to verify it fails, then passes**

Run: `cd apps/amo && node tools/test_campaign_definition.mjs`

If Steps 1–2 above weren't yet saved when this runs, expect an import failure. With Steps 1–2 in place, expected: `✓ campaign-definition tests passed (N).` on the first run — every id this test checks was built to match in Tasks 4–6, so there should be nothing left to fix. If any assertion fails, it means a map/quest id typo between this file and Task 5/6's files — fix the typo (not the test) and rerun.

- [ ] **Step 5: Confirm `CampaignManager`'s singleton now resolves the real campaign**

Run: `cd apps/amo && node -e "
import('./src/systems/CampaignManager.js').then(({ campaignManager }) => {
  console.log('current chapter:', campaignManager.currentChapter()?.id);
  console.log('can enter eldrin_tower:', campaignManager.canEnter('eldrin_tower'));
  console.log('can enter summit_of_despair (should be refused):', campaignManager.canEnter('summit_of_despair'));
  console.log('can enter samplemap (unclaimed, should be allowed):', campaignManager.canEnter('samplemap'));
});
"`
Expected:
```
current chapter: ch01_echoes_of_stone
can enter eldrin_tower: { allowed: true, reason: null }
can enter summit_of_despair (should be refused): { allowed: false, reason: 'The way to Summit of Despair is not yet open.' }
can enter samplemap (unclaimed, should be allowed): { allowed: true, reason: null }
```

This confirms Task 3's `CampaignManager` and this task's real campaign are correctly wired together with no further code changes to `CampaignManager.js`.

- [ ] **Step 6: Wire the new test into `npm test`**

In `apps/amo/package.json`, add after `"test:campaign-manager"`:

```json
    "test:campaign-definition": "node tools/test_campaign_definition.mjs",
```

Extend the `"test"` script by appending ` && node tools/test_campaign_definition.mjs` at the end (after the `test:campaign-manager` addition from Task 1).

- [ ] **Step 7: Run full suite, then commit**

Run: `cd apps/amo && npm test`
Expected: every suite passes, including both new campaign suites.

```bash
cd apps/amo
git add src/data/campaigns/eldorias_prophecy.js src/data/campaigns/index.js \
        tools/test_campaign_definition.mjs package.json
git commit -m "feat(campaign): the real Eldoria's Prophecy campaign definition

Twelve chapters transcribed from the bible's song-by-song breakdown.
Chapters 1 and 4 use the two quests that already exist and are already
completable; the other ten point at Task 5/6's scaffolding, replaced one
chapter at a time as real content lands.

Only one chapter grants a real unlock (Aether Sight, at Sylvan Sanctuary
— matches the bible's own note that it's 'formally completed' there).
Every other bible-named unlock with no safe existing mechanic to map it
to is left ungranted, with an inline comment naming what the bible calls
it — chosen over inventing fake content. Chapter 1's Scholar's Staff is
deliberately left ungranted too: it's already delivered by
echoes_of_stone's own chest, and granting it again would duplicate a
non-stackable item.

test_campaign_definition.mjs is the check that keeps this file honest
against the map registry, the quest table, and the bible's own 12-song
structure — everything it references already existed by the time this
test was written, so it passes clean on the first run.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01XdXdN1GgBhWmdx4TWBe7Tb"
```

---

### Task 8: Gate map entry through `_enterPortal`

**Files:**
- Modify: `apps/amo/src/scenes/GameScene.js:1603-1620` (`_enterPortal`)

**Interfaces:**
- Consumes: `campaignManager.canEnter(mapId) → {allowed, reason}` (Task 3, resolving the real campaign as of Task 7); `this.scene.get('UIScene')?.showNotification?.(text, ms)` — the existing notification pattern used everywhere else in this file (verified at 20 call sites, e.g. `GameScene.js:1657`, `:1667`, `:1828`).
- Produces: refused portal entries now show an in-world message and do not transition. Nothing else in `GameScene` changes shape.

This is the only change to player-facing traversal in the entire plan. `CharacterSelectScene`'s New Game map picker is untouched (see Global Constraints) — a developer can still jump straight to any map to build/test it, exactly as today.

- [ ] **Step 1: Add the import**

In `apps/amo/src/scenes/GameScene.js`, add to the import block (after the existing `import { questManager } from '../systems/QuestManager.js';` line):

```javascript
import { campaignManager } from '../systems/CampaignManager.js';
```

- [ ] **Step 2: Guard `_enterPortal`**

Replace the current `_enterPortal` method:

```javascript
    _enterPortal(portalDef) {
        if (this._transitioning) return;
        this._transitioning = true;
        SaveManager.save(playerStats, this._storyId, this._characterId);
        this.cameras.main.fadeOut(300);
        this.time.delayedCall(320, () => {
```

with:

```javascript
    _enterPortal(portalDef) {
        if (this._transitioning) return;
        const gate = campaignManager.canEnter(portalDef.targetMap);
        if (!gate.allowed) {
            this.scene.get('UIScene')?.showNotification?.(gate.reason, 2500);
            return; // player simply doesn't leave — no fade, no state change
        }
        this._transitioning = true;
        SaveManager.save(playerStats, this._storyId, this._characterId);
        this.cameras.main.fadeOut(300);
        this.time.delayedCall(320, () => {
```

The rest of the method (the `scene.stop`/`scene.start` block) is unchanged.

- [ ] **Step 3: Confirm the file still parses and the game's dev server boots**

Run: `cd apps/amo && node --check src/scenes/GameScene.js && echo "syntax OK"`
Expected: `syntax OK`.

Run: `cd apps/amo && timeout 10 npm run dev -- --port 5199 > /tmp/vite_check.log 2>&1; grep -q "ready in" /tmp/vite_check.log && echo "vite started clean" || cat /tmp/vite_check.log`
Expected: `vite started clean` (Vite's own startup does a transform pass over every imported module, which would surface a syntax/import error in `GameScene.js` immediately).

- [ ] **Step 4: Run full suite, then commit**

Run: `cd apps/amo && npm test`

```bash
cd apps/amo
git add src/scenes/GameScene.js
git commit -m "feat(campaign): gate in-world portal entry on campaign progress

The single choke point every map transition already goes through. A
refused entry shows the same in-world notification every other blocked
action in this file already uses (attunement, insufficient mana, etc.)
and simply doesn't transition — no fade, no scene change, no state
mutation.

CharacterSelectScene's New Game map picker stays ungated deliberately —
see that file's own comment ('lets a tester override which map New Game
starts on'). It's the tool the rest of this campaign gets built through,
one chapter at a time.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01XdXdN1GgBhWmdx4TWBe7Tb"
```

---

### Task 9: Manual browser walkthrough — verify the spine end to end

**Files:** none — verification only, no commit.

**Interfaces:** exercises the whole stack built by Tasks 1–8, through the real game UI.

This is the spec's own "Done means": walk chapter 1 through chapter 12 in the browser via stubs, watch a gate refuse an out-of-order entry, watch the one real unlock land, and confirm progress survives a reload. Per the decision made while brainstorming this plan, "New Game" is entered through the developer map picker at `eldrin_tower` — `stories.js`'s own default (`prologue_forest`) is intentionally untouched by this plan.

- [ ] **Step 1: Start the dev server**

Run: `cd apps/amo && npm run dev`
Open the printed local URL in a browser.

- [ ] **Step 2: Start a new game at chapter 1**

On the story select screen, choose Eldoria's Prophecy. On the character select screen, use the map picker (arrow keys / on-screen equivalent) to select **Eldrin's Tower**, then start a new game (not Continue).

Confirm: you spawn in the tower clearing.

- [ ] **Step 3: Walk chapter 1 for real**

Walk south to the tower door (around tile 12,27) — confirm you're carried into the Study (`echoes_of_stone`). Read the Strata Wall sign (confirm the `main_read_the_erasure` quest completes — a quest-complete notification should appear). Optionally open the chest for the Scholar's Staff (flavor, not required for completion).

Confirm: after reading the sign, walk to tile (5,5) (the vision portal) — you should be carried to `aetheric_vision` without any "not yet open" refusal, since chapter 1 just completed.

- [ ] **Step 4: Confirm gating actually refuses an out-of-order entry**

Before continuing forward, use the developer map picker again (return to `CharacterSelectScene`, or open a second browser tab with its own fresh character) to jump directly to `summit_of_despair` (chapter 4) on a **fresh character that has not completed chapters 1-3**.

Confirm: walking into `summit_of_despair`'s own portal back out (or being placed inside it, then walking into any portal INTO a later/different gated map) is not what's being tested here — instead, on your **original** chapter-1-complete character, walk forward normally through chapters 2 and 3 (talking to each placeholder NPC to complete their stub quest) until you reach `east_road`'s forward portal. Before completing chapter 3's quest, attempt to walk into that portal anyway.

Confirm: entry is refused with an on-screen message ("The way to Summit of Despair is not yet open."), and you remain in `east_road`.

- [ ] **Step 5: Complete chapter 3, confirm the gate opens, continue to chapter 4**

Talk to the placeholder NPC in `thaloria` to complete chapter 3. Walk into `east_road`'s forward portal again.

Confirm: entry now succeeds, landing you in `summit_of_despair` (the real map). Confirm `main_whisperer_of_doubt`'s objectives are visible in the quest log. You do not need to fully defeat the boss for this walkthrough — the plan's own real-content chapters (1 and 4) are already provably completable independent of this task.

- [ ] **Step 6: Fast-forward through chapters 5-11 via the placeholder NPCs**

For each of `sylvan_sanctuary`, `fire_gate`, `the_descent`, `inferno_labyrinth`, `ruins_of_eldoria` (chapter 9's NPC), `heartstone_chamber` → `ancient_door` → back to `ruins_of_eldoria` (chapter 11's second NPC, same room) → `thaloria` (its second portal, not the chapter-3 one): talk to the placeholder NPC, confirm the forward portal opens, walk through.

Confirm at `sylvan_sanctuary` specifically: after completing its stub quest, open the skill tree / character screen and confirm **Aetheric Sight now shows as unlocked** (level ≥ 1) without having spent a skill point on it — this is the one real unlock this plan grants, and the only step in this walkthrough that needs a specific, positive confirmation beyond "the door opened."

- [ ] **Step 7: Complete the campaign at chapter 12**

From `thaloria`'s second portal, confirm you arrive back in `eldrin_tower` (the real map, chapter 12's location). Talk to the new placeholder NPC there, completing `stub_ch12_dawns_embrace`.

Confirm: `campaignManager.currentChapter()` is now `null` (open the browser console and run `import('/src/systems/CampaignManager.js').then(m => console.log(m.campaignManager.currentChapter()))` if there's no in-game UI surface for this yet — there isn't one built by this plan, since the spec's scope is the spine, not a campaign-progress UI).

- [ ] **Step 8: Confirm progress survives a reload**

Partway back through the walkthrough (e.g., right after completing chapter 5), reload the browser tab and choose Continue instead of New Game.

Confirm: you resume with `aetheric_sight` still unlocked, and `campaignManager.currentChapter().id === 'ch06_treacherys_bite'` (checked via the same browser-console `import()` approach as Step 7, or by attempting to re-enter `sylvan_sanctuary`'s own map, which should now succeed since it's already been completed, and attempting `fire_gate`, which should also succeed as the current chapter).

- [ ] **Step 9: Report the result**

No commit for this task. If every confirmation in Steps 2–8 held, the spine is done per the spec's own "Done means." If anything didn't hold, note exactly which step and confirmation failed — that's a bug in one of Tasks 1–8, to be fixed and re-verified from Step 1, not worked around here.

---

## Plan Summary

| Task | Deliverable | New/Modified Files |
|---|---|---|
| 1 | Campaign progress persists | `SaveManager.js` |
| 2 | Free unlock grants exist | `PlayerStats.js` |
| 3 | Gating/completion/unlock logic, fixture-tested | `CampaignManager.js`, `campaigns/index.js` (placeholder) |
| 4 | Chapter 1 is actually walkable | `eldrin_tower.js`, `echoes_of_stone.js` |
| 5 | Ten placeholder chapters have something to complete | `quests.js`, `dialogues.js` |
| 6 | Ten placeholder chapters have somewhere to stand | `_stubs.js` + 10 map files, `maps/index.js` |
| 7 | The real 12-chapter campaign, checked against the bible | `campaigns/eldorias_prophecy.js`, `campaigns/index.js` (real) |
| 8 | The game actually enforces the campaign | `GameScene.js` |
| 9 | Proof, in the browser | — |
