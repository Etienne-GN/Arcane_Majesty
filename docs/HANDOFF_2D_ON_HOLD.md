# Handoff — 2D (amo) on hold, 2026-11-12

**Decision pending:** after the weekend's 3D work and a review with Thomas, ONE version continues: either 2D `apps/amo` or 3D `amo3d` (branch `3d`, worktree `../Arcane_Majesty-3d`). The user currently prefers 3D: it feels more their own than the 2D built on LPC sprites.

## 2D state (main, all pushed, latest 12b1685d)
- Combat C0–C5 done: weapons in two hands, mastery and talent, 8 classes, the first style for each of the 13 weapons, arrows, bolts and quivers. `npm test` is green.
- Spec: `docs/superpowers/specs/2026-10-26-combat-weapons-design.md`. The C5 plan is in `docs/superpowers/plans/2026-11-09-combat-c5-arrows-bolts-quivers.md`.
- Next, if 2D continues: C6+, the 27 remaining styles. Suggested order:
  - C6: Hex, Warder, Resonance arrows, Skirmisher, Twin Focus;
  - C7: swords;
  - C8: dagger and spear;
  - C9: heavy weapons and shield;
  - C10: the rest.
- Leftovers: `docs/polish_backlog.md`, which includes the 6 deferred C5 minors.
- Housekeeping: delete `.superpowers/sdd/2026-11-09-combat-c5-arrows-bolts-quivers/` by hand.

## 3D state (branch `3d`)
- Roadmap: `docs/3d/ROADMAP.md`; Phase 1 notes: `docs/3d/PHASE1.md`.
- Shared rules are in `packages/rules` and reuse amo's systems. If 2D stops, keep amo's pure systems (`src/systems/*`, `src/data/*`) as the rules source.
- In progress: the Phase 3 Forge (hair and beard done; the Forge page and outfits are not built yet).
- Not done yet: installing the latest build on the phone (adb at 192.168.0.17, wireless debugging needs re-pairing).

## If 3D wins
Freeze `apps/amo` (don't delete it; it's the rules reference). Port the C3–C5 systems (styles, ammo) into 3D through `packages/rules`.
