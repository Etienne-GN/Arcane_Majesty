# Mechanics Phase 4 — Quests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Quests get givers, turn-ins, prerequisites, flags, item hand-ins, dialogue choices and richer rewards (D1), and towns get a daily bounty board built on those quests (D2).

**Architecture:** The rules live in two new Phaser-free modules — `src/data/questRules.js` (steps with the auto turn-in, live `have` progress, start conditions, rewards, dialogue choices) and `src/data/bounties.js` (seeded daily offers, board state, accepting). `QuestManager` keeps its event API and gains a lookup that also finds generated (bounty) quests stored in the save. Scenes only call into these.

**Tech Stack:** Phaser 3.90, plain ES modules, `node tools/test_*.mjs` tests.

**Spec:** `docs/superpowers/specs/2026-09-30-mechanics-expansion-design.md` §Phase 4 (D1, D2).

## Global Constraints

- Commit directly on `main`, small commits, trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- No new npm dependencies.
- Pure logic in Phaser-free modules, tested by `node tools/test_*.mjs`; every new test file is added to `npm test`.
- Old saves must keep loading: every new save field has a default.
- New lore-facing names (places, NPCs, items) are checked against the Neo4j lore DB; game-only content is `origin: "game"`. (This plan adds no new places, NPCs or items — only quest titles and the "Bounty Board" object.)
- Extend `tools/gen_game_inventory.mjs` and commit the regenerated `docs/manual/index.html` + `docs/game_inventory.md`.
- English in code, data and UI. Existing quests keep working unchanged (all new fields optional).

## Review Focus

1. Talking to a giver to accept (or before the objectives are done) must not tick the "Return to …" step.
2. Handing in: if the player sells/uses the `have` items after the count was met but before turning in, the turn-in is refused (counts are live).
3. An old save — no `flags`, `generatedQuests`, `bounties`; a quest log that names a quest id no longer defined — loads, and the journal and manager skip the unknown id instead of crashing.
4. Day rollover with an active bounty: the active one stays tracked and turn-in-able; new offers appear; a second bounty from that board can't be accepted until the first is done.
5. A repeatable quest started again after completion begins with fresh progress.

---

### Task 1: Quest rules + QuestManager engine (D1 core)

**Files:**
- Create: `src/data/questRules.js`, `src/data/npcs.js`, `tools/test_phase4_quests.mjs`
- Modify: `src/systems/QuestManager.js`, `src/systems/PlayerStats.js` (fields `flags`, `generatedQuests`, `bounties` + reset), `src/systems/SaveManager.js` (save/load with defaults), `package.json` (test chain)

**Interfaces — Produces:**
- `npcs.js`: `NPCS = { hermit: { name: 'the Hermit', place: "Hermit's Hut" }, silvara: { name: 'Silvara', place: 'Prologue Forest' } }`, `npcName(id)` (unknown → id with `_`→space).
- `questRules.js`:
  - `TURN_IN_STEP = '__turn_in'`
  - `turnInOf(q)` → `q.turnIn ?? q.giver ?? null`
  - `questSteps(q)` → `q.steps` plus, when `turnInOf(q)` is set and no step is already `talk` to that id, `{ id: TURN_IN_STEP, type: 'talk', target: turnInOf(q), label: 'Return to ' + (q.turnInName ?? npcName(turnIn)), required: 1, turnIn: true }`. Same array identity for the same quest object (memo in a WeakMap).
  - `stepProgress(step, log, countItem)` → `have` ⇒ `min(required, countItem(target))`; else `log.progress[step.id] ?? 0`.
  - `objectivesDone(q, log, countItem)` → every non-turn-in step at `required`.
  - `isQuestDone(q, log, countItem)` → every step at `required`.
  - `canStart(q, { log, isCompleted, flags, chapterReached })` → false when `log` exists unless `log.status === 'completed' && q.repeatable`; all `q.requires` completed; all `q.requiresFlags` truthy in `flags`; `q.chapter` → `chapterReached(q.chapter)`.
  - `consumeOnTurnIn(q)` → `[{ id, qty }]` for `have` steps with `consume: true`.
  - `rewardParts(r, { itemName, recipeName, spellName })` → display strings: `"N XP"`, `"N Glint"`, `"N Gold"`, item names, `"Recipe: X"`, `"Spell: X"`, `"N Insight"`.
  - `visibleLines(lines, flags)` → drops lines whose `ifFlag` is unset or whose `unlessFlag` is set.
  - `applyChoice(choice, flags, startQuest)` → sets `flags[choice.setFlag] = true`, calls `startQuest(choice.startQuest)`, returns `choice.next ?? null`.
- `QuestManager` additions: `questDef(id)` (QUESTS, then `playerStats.generatedQuests`), `startQuest` honours `repeatable`, `canOffer(id, ctx)`, `offerFor(npcId, chapterReached?)`, `recheck()`, `onKill(type, { …, isElite })` with step type `kill_elite`, turn-in step only advances when `objectivesDone`, completion consumes `consume` items and pays `xp, glint, gold, items, recipe, spell, insight` (`insight` overrides the type default; type `bounty` default 0).

- [ ] Step 1: write `tools/test_phase4_quests.mjs` covering every function above against a stub quest set plus the real manager (localStorage stub as in `test_phase3_economy.mjs`), including Review Focus 1, 2, 3 (`questDef` of an unknown id → undefined; `getActiveQuests` skips it), 5. Run → FAIL (modules missing).
- [ ] Step 2: implement `npcs.js`, `questRules.js`, the manager changes and the save fields. Run → PASS. Run `npm test` → PASS.
- [ ] Step 3: commit `feat(amo): quest engine — givers, turn-ins, prerequisites, flags, item hand-ins and richer rewards`.

### Task 2: Dialogue choices, NPC wiring and the Hermit's two new quests

**Files:** Modify `src/scenes/DialogueScene.js`, `src/scenes/GameScene.js`, `src/data/maps/hermit_hut.js`, `src/data/worldMap.js` (Silvara `id`), `src/data/dialogues.js`, `src/data/quests.js`; test in `tools/test_phase4_quests.mjs`.

- DialogueScene: lines filtered by `visibleLines(lines, playerStats.flags)`. A line with `choices` shows them as numbered rows under the text once typed; UP/DOWN/1–4/click/gamepad pick, E/SPACE/ENTER/A confirm; advancing is blocked until a choice is made. Picking calls `applyChoice(choice, playerStats.flags, id => questManager.startQuest(id))`; a returned `next` key replaces the remaining lines with `DIALOGUES[next]`.
- GameScene NPC talk: `npcId = def.id ?? (derived as today)`; `questManager.onTalk(npcId)` on **every** talk (not only the first); shop NPCs fire it too, before the shop opens; after a non-shop talk, `questManager.offerFor(npcId)` → a second DialogueScene with one line `{ speaker, text: quest.offer ?? quest.description, choices: [{ text: 'Accept — ' + title, startQuest: id }, { text: 'Not now' }] }`. `onKill` passes `isElite: enemy.elite`. GameScene `resume` → `questManager.recheck()`. The completion toast shows the quest title.
- Data: hut hermit `id: 'hermit'`, Silvara `id: 'silvara'` (this also makes the existing "Speak with the Hermit"/"Return to the Hermit"/"Return to Silvara" steps completable — they never were). `hermit_hut_after` gains a last line `{ speaker: 'Hermit', text: …, unlessFlag: 'offered_hermit_help', choices: [{ text: 'Offer to help', setFlag: 'offered_hermit_help', startQuest: 'side_hermits_remedy' }, { text: 'Not now' }] }`.
- New quests: `side_hermits_remedy` (giver hermit, `requiresFlags: ['offered_hermit_help']`, steps `have moonpetal 3` + `have glowcap 2`, both `consume: true`; reward xp 120, gold 40, recipe `moonveil_tonic`, insight 1) and `side_shadows_at_the_threshold` (giver hermit, `requires: ['side_hermits_remedy']`, step kill shadow_sprite 6; reward xp 200, glint 60, spell `cleanse`).
- [ ] Step 1: tests — the remedy is not offerable before the flag, is after; the threshold quest is offered only after the remedy; data checks (giver ids exist in `NPCS`, every `have` target is an item, reward recipe/spell exist). Run → FAIL. Step 2: implement. Run → PASS; `npm test` PASS; `vite build` PASS; headless: talk to the hut Hermit twice → choice appears, picking "Offer to help" starts the remedy; with 3 moonpetal + 2 glowcap a talk completes it and removes them.
- [ ] Step 3: commit `feat(amo): dialogue choices and quest offers — the Hermit asks for a remedy, then for help at the threshold`.

### Task 3: Journal shows giver, turn-in, requirements and full rewards

**Files:** Modify `src/scenes/QuestJournalScene.js`.
- Quest ids from the log resolved with `questManager.questDef` (unknown ids skipped); bounty quests listed after hidden ones with their own colour.
- Detail: "Given by: X", "Turn in: X — place", "Requires: titles / flags met", steps from `questSteps` with live `have` counts, `Reward:` from `rewardParts`.
- [ ] Headless screenshot of the journal with the remedy active; `npm test` PASS. Commit `feat(amo): quest journal shows who gave a quest, where to turn it in, what it required and every reward`.

### Task 4: Bounty generation (D2 core)

**Files:** Create `src/data/bounties.js`; tests in `tools/test_phase4_quests.mjs`.

**Produces:** `BOUNTIES_PER_DAY = 3`, `realDay(now)` (local calendar day number), `seededRng(seed)` (mulberry32), `boardId(mapId)` → `board_<mapId>`, `regionPools(mapDef, enemyTypes)` → `{ creatures, items }` (non-passive, non-boss enemy types in spawns; weighted (non-`chance`) yield ids of gathering nodes), `bountyReward(kind, band, n)`, `generateBounties(boardId, day, pools, band, regionName)` → 3 quest defs `{ id: bounty_<board>_<day>_<i>, type: 'bounty', kind, title, description, giver/turnIn: boardId, turnInName: 'the Bounty Board', repeatable: true, steps, reward }` — one hunt (kill N 4–8), one elite (`kill_elite` 1), one gather (`have` N 3–6, consume); fallbacks when a pool is empty. `boardView(stats, boardId, day, pools, band, regionName)` refreshes `stats.bounties[boardId]` on a new day (keeps the active one, prunes the board's other generated quests and their logs). `acceptBounty(stats, boardId, index, isActive)` → `{ ok, reason: 'busy'|'taken'|'none', questId }`, registers the def in `stats.generatedQuests` and marks the offer taken.
- Rewards: L = band.max; hunt xp 15L+5n, gold 5L+2n; elite xp 40L, gold 10L, glint 5L; gather xp 10L+3n, gold 8L+3n.
- [ ] Tests: same board+day → same offers; another day → different; three kinds; rewards grow with band; Review Focus 4; old save without `bounties`. RED then GREEN, `npm test`. Commit `feat(amo): bounty generation — three seeded bounties a day per board, scaled to the region`.

### Task 5: The board in the world

**Files:** Create `src/scenes/BountyBoardScene.js`; modify `src/scenes/GameScene.js` (`_buildBountyBoards`, prompt, interaction), `src/main.js` (scene list), maps `thaloria.js` (board, region `summit_of_despair`) and `prologue_forest.js` (board near Silvara, own region).
- Interaction: `questManager.onTalk(boardId)` (turns in a finished bounty), then launch `BountyBoardScene` with `{ boardId, day: realDay(), pools, band: mapLevelBand(regionMap), regionName }`.
- Scene: three rows (kind, title, objective, reward, ACCEPT / TAKEN / ACTIVE), active bounty progress with "Return here to turn it in", keys UP/DOWN, E/ENTER/SPACE accept, ESC close, click/touch, gamepad; save on accept and close.
- [ ] Headless: open the board, accept the hunt, journal lists it; `npm test`, `vite build`. Commit `feat(amo): bounty boards in Thaloria and at Silvara's camp`.

### Task 6: Manual

- [ ] `gen_game_inventory.mjs`: quest fields + bounty board rows in the mechanics table, quest table gains Giver/Requires columns and full rewards, save row lists flags and bounties. Regenerate, `npm test`, commit `docs(amo): manual covers quest givers, turn-ins, choices and bounty boards`.
