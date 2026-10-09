# LPC Forge v2 — Motion Rules & Gap Review (Plan C) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Decide, per item and motion, what a layer does when it has no art for a motion — fall back to walk (today's game default), hide, or borrow another motion's frames retimed to stay in sync — with identical behaviour in the game and the Forge, and a Forge screen to review every gap.

**Architecture:** One pure module in the game, `motionRules.js`, resolves `(layer, logical motion, rules)` to `{ mode, concrete, frames }`. The game's `CharacterRenderer._layerTarget` and the Forge's canvas both call it. Rules live in `apps/amo/src/data/motion_rules.json` (per item) with optional per-cast overrides in cast files; the Forge API edits them. The gap review screen is a catalogue items × motions matrix with ledger-style flags.

**Tech Stack:** as Plans A/B.

**Spec:** `docs/superpowers/specs/2026-10-08-lpc-forge-v2-design.md` §3 Gap review, §4 Motion rules.

## Finding that reshapes §4
The game already has an implicit rule: `_layerTarget` falls back to a layer's **walk** frames when it lacks the requested motion (unsynced: walk frame count and fps). Forge v2 (Plan A) wrongly drew those layers as vanished. The default rule is therefore `fallback` (= today's game behaviour, kept), and the spec's rules become explicit choices on top: `hide`, `borrow <motion>` (retimed), `custom` (Plan D).

## Global Constraints
- Rule file: `apps/amo/src/data/motion_rules.json` = `{ "<slot>|<id>|<itemName or ''>": { "<motion>": { "rule": "hide" } | { "rule": "borrow", "from": "<motion>" } } }`. Absent = `fallback`.
- Cast override: optional `cast.motionRules` with the same shape; wins over the global file for that character.
- Frame counts per motion (body sheets, after the walk standing-frame skip): walk 8, idle 2, hurt 6, slash 6, backslash 13, halfslash 6, thrust 8, shoot 13, spellcast 7, run 8, sit 3, jump 5, climb 6, combat_idle 2, emote 3 (`MOTION_FRAMES`).
- `borrow` retimes: target frame i shows source frame `floor(i * srcCount / dstCount)`, played at the target motion's fps.
- `fallback` stays exactly today's behaviour (walk anim at walk cadence) so nothing in the game changes unless a rule is set.
- Game behaviour unchanged when `motion_rules.json` is `{}`: `npm test` + build green, existing tests untouched.
- Commit on `main`; trailer as before. Forge API stays localhost-only.

## Review Focus
1. A borrow rule naming a motion the layer also lacks (`borrow from run` on a cape with no run) → falls back to `fallback`, never a missing texture. Test in Task 1.
2. A rule on an item with companions (sword bg + fg) → applies to each layer by its own key (`itemName` part), so bg and fg can differ. Test in Task 1.
3. Retiming when source has more or fewer frames than target (walk 8 → jump 5, sit 3 → walk 8) → every target frame maps to a valid source frame. Test in Task 1.
4. Malformed rules file (unknown motion, rule "explode", from = itself) → API rejects 400; game ignores the bad entry instead of crashing. Tests in Tasks 1 and 4.
5. A cast override "hide" on an item the global file borrows → hide wins for that character only. Test in Task 1.

---

### Task 1: `motionRules.js` (pure, game)
**Files:** Create `apps/amo/src/systems/motionRules.js`, `apps/amo/src/data/motion_rules.json` (`{}`), `apps/amo/tools/test_motion_rules.mjs`; add `MOTION_FRAMES` to `lpcLayout.js`; add test to `npm test`.
**Produces:**
- `ruleKey(layer) → "<slot>|<id>|<itemName ?? ''>"` (layers without `slot` use `type`)
- `ruleFor(layer, motion, rules, overrides?) → { rule: 'own'|'fallback'|'hide'|'borrow', from? }` — `own` when the layer ships the motion (rules never override real art)
- `resolveMotion(layer, motion, rules, overrides?) → { mode: 'own'|'fallback'|'hide'|'borrow', concrete: string|null, frames: number[]|null }` — `fallback` → concrete = layer's walk, frames null (play as is); `borrow` → concrete = resolveAnim(layer, from), frames = `frameMap(MOTION_FRAMES[from], MOTION_FRAMES[motion])`; borrow source missing → `fallback`; `hide` → concrete null
- `frameMap(src, dst) → number[]` length dst
- `ruleErrors(rules) → string[]` — validates shape (known motions, rule names, borrow.from ≠ motion and known)
- `MOTION_FRAMES` in lpcLayout.js
Tests cover Review Focus 1–3 and 5, plus `ruleErrors` cases, plus `ruleFor` ignoring malformed entries (Focus 4, game side).

### Task 2: Game renderer honours rules
**Files:** Modify `CharacterRenderer.js` (`_layerTarget`, loading of borrowed sources via `concreteAnimsFor`), `animResolve.js` (`concreteAnimsFor(layer, anims, rules)` adds borrow sources), `castLoader.js` (`castConfig` returns `motionRules` overrides), container config accepts `motionRules`.
- `_layerTarget(entry, useAnim, useDir)`: `resolveMotion(layer, useAnim, MOTION_RULES, container._lpcRuleOverrides)`; `hide` → null; `own`/`fallback` → as today; `borrow` → texture of the source motion, animation key `${key}_${dir}~${useAnim}` created with the retimed frame list at `frameRateFor(useAnim)`.
- Test: extend `tools/test_motion_rules.mjs` with `concreteAnimsFor` loading borrow sources; game build; manual check in the creator documented (screenshot via CDP if the game dev server runs).

### Task 3: Forge parity
**Files:** Modify `v2/src/render/sheets.js` (`drawLayer` takes an optional frame list), `CharacterCanvas.vue`, `store.ts` (missing → per-motion `{ fallback, hidden, borrowed }` keys), `LayerList.vue`, `MotionStage.vue`, `composition.js` (`missingIn` → `gapsIn(layers, motion, rules, hasFile)` returning mode per layer).
- Canvas draws own/fallback/borrow layers like the game (fallback = walk frames at walk cadence; borrow = retimed). Overlay: amber dashed = fallback present, red = hidden, blue = borrowed.
- LayerList: "walk frames in run (fallback)", "hidden in sit (rule)", "borrows walk in jump".
- Stage row badge counts fallbacks + hidden.
- Tests: composition test for `gapsIn`; Plan A `missingIn` semantics kept for coverage (art present or not).

### Task 4: Rules API
**Files:** `server.js` (`GET /api/motion-rules`, `PUT /api/motion-rules` whole file, validated with `ruleErrors`, atomic write), `castStore.js` helper `writeJsonAtomic`, smoke tests (bad rule 400, round trip, temp dir).

### Task 5: Gap review screen
**Files:** `v2/src/components/GapReview.vue`, `v2/src/gapState.ts`, `server.js` (`GET/PUT /api/gap-flags` → `apps/tool_suite/lpc_forge/gap_flags.json`), header nav (Cast · Forge · Gaps).
- Matrix: rows = catalogue items (slot filter, search, "used by cast" filter, "only items with gaps"), columns = 15 motions; cell states: own ✓ / fallback (amber) / hidden (red) / borrowed (blue); counts per column.
- Select a cell → side panel: live preview (current composition wearing that item, that motion, 4 directions), rule radio (fallback / hide / borrow from ▾), Save rule (PUT), flag form (reason + comment, statuses open / needs_review / question / resolved with thread like the ledger).
- Inbox strip: gaps on items worn by published cast members first.

### Task 6: Cast overrides
**Files:** `castSession.js`/CastBar (per-character rule overrides edited from the stage's layer list: "for this character: hide/borrow/fallback"), `cast.js` (`castShapeErrors` accepts `motionRules` validated by `ruleErrors`), `castLoader.js`.

## Self-review
- Spec §4 rules (hide/borrow/custom) → Tasks 1–3 (+ custom in Plan D), §3 gap review → Task 5, per-cast overrides → Task 6. Retiming → Task 1 `frameMap`.
